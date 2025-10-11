/* eslint-disable no-param-reassign */
// Express route handlers intentionally mutate req/res objects
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createClient } from "@supabase/supabase-js";
import {
  insertQuoteSchema,
  updateQuoteSchema,
  updateProfileSchema,
  changePasswordSchema,
  insertKbCategorySchema,
  insertKbArticleSchema,
  insertKbBookmarkSchema,
  insertKbSearchHistorySchema,
  insertCommissionAdjustmentSchema,
  users,
} from "@shared/schema";
import { z } from "zod";
import { sendSystemAlert } from "./slack";
import { hubSpotService } from "./hubspot";
import { doesHubSpotQuoteExist } from "./hubspot";
import { requireAuth } from "./middleware/supabase-auth";
import { registerAdminRoutes } from "./admin-routes";
import { getHubspotMetrics } from "./metrics";
import { getModuleLogs } from "./logs-feed";
import { checkDatabaseHealth } from "./db";
// HubSpotService class is no longer instantiated directly in routes; use singleton hubSpotService
import { registerHubspotRoutes } from "./hubspot-routes";
import quoteRoutes from "./quote-routes";
import { calculateCombinedFees, calculateQuotePricing } from "@shared/pricing";
import { buildServiceConfig } from "./services/hubspot/compose";
// Domain routers (Chunk 8)
import { mountRouters } from "./routes/index";
import { pricingConfigService } from "./pricing-config";
import type { PricingData } from "@shared/pricing";
import { clientIntelEngine } from "./client-intel";
import { apiRateLimit, searchRateLimit, enhancementRateLimit } from "./middleware/rate-limiter";
import { conditionalCsrf, provideCsrfToken } from "./middleware/csrf";
import multer from "multer";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { promisify } from "util";
import path from "path";
import { promises as fs } from "fs";
import express from "express";
import { cache, CacheTTL, CachePrefix } from "./cache";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import { aiConversations, aiMessages, userPreferences } from "@shared/schema";
import { hubspotSync } from "./hubspot-sync";
import { syncQuoteToHubSpot } from "./services/hubspot/sync";
import { Client } from "@hubspot/api-client";
import { dealsService } from "./services/deals-service";
import { calculateProjectedCommission } from "@shared/commission-calculator";
import { DealsResultSchema } from "@shared/deals";
import {
  CommissionSummarySchema,
  PricingConfigSchema,
  CalculatorContentResponseSchema,
} from "@shared/contracts";
import { boxService } from "./box-integration";
import { AIService } from "./services/ai-service";
import { extractTextFromBoxAttachments } from "./doc-extract";
import { Limits, type ClientKind } from "./ai/config";
import { resolveBoxAttachmentsForClient, extractTextForClient } from "./ai/pipeline";
import { requirePermission, authorize } from "./services/authz/authorize";
import { generateApprovalCode } from "./utils/approval";
import { getErrorMessage } from "./utils/error-handling";
import { toPricingData } from "./utils/pricing-normalization";
import { sanitizeQuoteFields, prepareQuoteForValidation } from "./utils/quote-sanitization";
import { quoteLogger } from "./logger";
import type { QuoteCreationData, QuoteUpdateData, PricingCalculation } from "./types/quote";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), "uploads", "profiles");
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        cb(null, uploadsDir);
      } catch (error) {
        cb(error as Error, uploadsDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Password utilities
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const bcrypt = await import("bcryptjs");
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if this is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    // Use bcrypt for comparison
    const bcrypt = await import("bcryptjs");
    return await bcrypt.compare(supplied, stored);
  }

  // Legacy scrypt hash format (hash.salt)
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    throw new Error("Invalid password hash format");
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session-based auth removed; all routes use Supabase Auth via requireAuth

  // Apply CSRF protection after sessions are initialized - simplified
  app.use(conditionalCsrf);
  app.use(provideCsrfToken);

  // Minimal admin guard for routes defined in this module (mirrors admin-routes behavior)
  const requireAdminGuard = (req: any, res: any, next: any) => {
    // Optional allowlist for break-glass admin (comma-separated emails)
    const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const email = String(req.user?.email || "").toLowerCase();
    if ((email && allowlist.includes(email)) || req.user?.role === "admin") {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
  };

  // Apply rate limiting to all API routes
  app.use("/api", apiRateLimit);

  // Mount HubSpot domain routes (paths unchanged)
  registerHubspotRoutes(app);

  // Mount domain routers (Chunk 8: deals, calculator, approval, ai)
  // These routers handle: HubSpot sync, pricing calculations, approvals, AI features
  mountRouters(app);
  quoteLogger.info("Domain routers mounted successfully");

  // =============================
  // Webhook Routes (Extracted)
  // =============================
  // Moved to server/routes/webhooks.ts
  // - POST /api/webhooks/stripe

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // CSRF token endpoint for SPAs
  // Moved to server/routes/auth.ts

  // =============================
  // User Routes (Extracted)
  // =============================
  // Moved to server/routes/user.ts
  // - GET /api/user
  // - GET/PUT /api/user/preferences/:scope
  // - GET/PUT /api/user/signature
  // - POST /api/upload/signature-image

  // =============================
  // Approval Codes (Extracted)
  // =============================
  // Moved to server/routes/approval-codes.ts
  // - POST /api/approval/request
  // - POST /api/approval-request (legacy)
  // - POST /api/approval/validate

  // =============================
  // Calculator Routes (Extracted)
  // =============================
  // Moved to server/routes/calculator.ts
  // - GET /api/calculator/content
  // - GET /api/pricing/config

  // =============================
  // App Namespace Aliases (Extracted)
  // =============================
  // Moved to server/routes/app-aliases.ts
  // - SeedQC: /api/apps/seedqc/* → /api/calculator/*
  // - SeedPay: /api/apps/seedpay/* → /api/commissions/*

  // =============================
  // Deals Routes (Extracted)
  // =============================
  // Moved to server/routes/deals.ts
  // - GET /api/deals
  // - GET /api/deals/by-owner


  // =============================
  // AI Assistant Endpoints (Option B)
  // =============================
  // Moved to server/routes/ai.ts

  // (helpers moved to server/ai/pipeline and server/ai/relevance)

  // Moved to server/routes/ai.ts

  // Moved to server/routes/ai.ts

  // Moved to server/routes/ai.ts

  // Moved to server/routes/ai.ts

  // Moved to server/routes/ai.ts

  // =============================
  // Admin Routes (Extracted)
  // =============================
  // Moved to server/routes/admin.ts
  // - GET /api/admin/metrics/hubspot
  // - GET /api/admin/logs
  // - POST /api/admin/diagnostics/hubspot/smoke
  // - POST /api/admin/actions/hubspot/sync
  // - POST /api/admin/apps/seedpay/cache/clear

  // Moved to hubspot-routes.ts: /api/hubspot/diagnostics/create (GET)

  // Login endpoint
  // Moved to server/routes/auth.ts

  // Legacy /api/logout is no longer needed with Supabase Auth; keep a no-op for backward compatibility
  // Moved to server/routes/auth.ts

  // Dev-only endpoint to reset a user's password (useful to fix historical double-hash records)
  // Moved to server/routes/auth.ts

  // Simple user creation endpoint for initial setup - CSRF exempt for testing
  // Moved to server/routes/auth.ts

  // =============================
  // Deals Cache Invalidation (Extracted)
  // =============================
  // Moved to server/routes/debug.ts

  // Moved to server/routes/debug.ts

  // Moved to server/routes/debug.ts

  // Moved to server/routes/auth.ts

  // Removed duplicate logout endpoint - using /api/logout from auth.ts instead

  // Quote routes with structured logging
  app.post(
    "/api/quotes",
    requireAuth,
    async (req, res) => {
      const requestId = req.headers['x-request-id'] || 'unknown';
      
      try {
        quoteLogger.info({
          requestId,
          userId: req.user?.id,
          userEmail: req.user?.email,
          contactEmail: req.body?.contactEmail,
        }, "Quote creation request received");

        if (!req.user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Extract service flags with defaults
        const includesBookkeeping = req.body.includesBookkeeping !== false; // Default to true
        const includesTaas = req.body.includesTaas === true;

        // Sanitize numeric fields using shared utility
        const sanitizedBody = sanitizeQuoteFields(req.body);
        const validationData = prepareQuoteForValidation(sanitizedBody);

        // Check for existing quotes - use approval system if needed
        const { contactEmail, approvalCode } = req.body;
        quoteLogger.debug({
          requestId,
          contactEmail,
          hasApprovalCode: !!approvalCode,
        }, "Checking approval requirements");

        if (contactEmail) {
          const existingQuotes = await storage.getQuotesByEmail(contactEmail);
          quoteLogger.debug({
            requestId,
            contactEmail,
            count: existingQuotes.length,
          }, "Existing quotes found");

          // Only block if there are quotes that still exist in HubSpot
          // Quotes that no longer exist in HubSpot should NOT require approval
          let liveInHubSpotCount = 0;
          try {
            const verifications = await Promise.all(
              existingQuotes.map(async (q: any) => {
                const hq = q?.hubspotQuoteId ? String(q.hubspotQuoteId) : null;
                if (!hq) return false;
                try {
                  return await doesHubSpotQuoteExist(hq);
                } catch {
                  return false;
                }
              })
            );
            liveInHubSpotCount = verifications.filter(Boolean).length;
          } catch (e) {
            // In case of verification failure, be conservative: treat as zero to avoid blocking valid flows
            quoteLogger.warn({
              requestId,
              contactEmail,
              error: getErrorMessage(e),
            }, "HubSpot existence verification failed, allowing creation");
            liveInHubSpotCount = 0;
          }

          if (liveInHubSpotCount > 0) {
            // There are active HubSpot quotes; require approval code
            if (!approvalCode) {
              quoteLogger.warn({
                requestId,
                contactEmail,
                liveQuotesCount: liveInHubSpotCount,
              }, "Approval code required but not provided");
              res.status(400).json({
                message: "Approval code required for creating additional quotes",
                requiresApproval: true,
                existingQuotesCount: liveInHubSpotCount,
              });
              return;
            }

            quoteLogger.debug({ requestId, contactEmail }, "Validating approval code");
            const isValidCode = await storage.validateApprovalCode(approvalCode, contactEmail);
            
            if (!isValidCode) {
              quoteLogger.warn({ requestId, contactEmail }, "Invalid approval code provided");
              res.status(400).json({
                message: "Invalid or expired approval code",
                requiresApproval: true,
              });
              return;
            }

            await storage.markApprovalCodeUsed(approvalCode, contactEmail);
            quoteLogger.info({ requestId, contactEmail }, "Approval code validated and used");
          } else {
            quoteLogger.debug({ requestId, contactEmail }, "No approval required");
          }
        }

        // Validate the data first (without ownerId)
        quoteLogger.debug({
          requestId,
          contactEmail: validationData.contactEmail,
          industry: validationData.industry,
          monthlyRevenueRange: validationData.monthlyRevenueRange,
        }, "Validating quote data");
        const validationResult = insertQuoteSchema.safeParse(validationData);

        if (!validationResult.success) {
          quoteLogger.error({
            requestId,
            contactEmail: req.body.contactEmail,
            errors: validationResult.error.errors,
          }, "Quote validation failed");

          throw validationResult.error;
        }

        const validatedQuoteData = validationResult.data;
        quoteLogger.debug({ requestId }, "Quote validation passed");

        // Compute canonical pricing totals on the server
        // Do NOT trust client-provided totals; derive from validated inputs
        let quote;
        try {
          const calc: PricingCalculation = calculateCombinedFees(validatedQuoteData as any);
          quoteLogger.debug({
            requestId,
            monthlyFee: calc.combined.monthlyFee,
            setupFee: calc.combined.setupFee,
          }, "Pricing calculated");

          // Add ownerId and override totals from server calc
          const quoteData = {
            ...validatedQuoteData,
            ownerId: req.user.id,
            monthlyFee: calc.combined.monthlyFee.toFixed(2),
            setupFee: calc.combined.setupFee.toFixed(2),
            taasMonthlyFee: calc.taas.monthlyFee.toFixed(2),
            taasPriorYearsFee: calc.priorYearFilingsFee.toFixed(2),
          } as QuoteCreationData;

          quoteLogger.debug({ requestId }, "Creating quote in database");
          quote = await storage.createQuote(quoteData);
        } catch (calcError) {
          quoteLogger.error({
            requestId,
            error: getErrorMessage(calcError),
          }, "Pricing calculation failed");
          return res.status(400).json({
            message: "Pricing calculation failed",
            reason: (calcError as any)?.message,
          });
        }
        
        if (!quote) {
          quoteLogger.error({ requestId }, "Quote creation returned null");
          return res.status(500).json({ message: "Quote creation failed - no data returned" });
        }

        quoteLogger.info({
          requestId,
          quoteId: quote.id,
          contactEmail: quote.contactEmail,
          monthlyFee: quote.monthlyFee,
          setupFee: quote.setupFee,
        }, "Quote created successfully");
        res.json(quote);
      } catch (error: unknown) {
        quoteLogger.error({
          requestId,
          error: getErrorMessage(error),
          userId: req.user?.id,
        }, "Quote creation failed");
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid quote data", errors: error.errors });
        }
        return res.status(500).json({
          message: "Failed to create quote",
          debug: getErrorMessage(error),
        });
      }
    }
  );

  // Get all quotes with optional search and sort (protected)
  app.get(
    "/api/quotes",
    requireAuth,
    async (req, res) => {
      const requestId = req.headers['x-request-id'] || 'unknown';
      
      try {
        const email = req.query.email as string;
        const search = req.query.search as string;
        const sortField = req.query.sortField as string;
        const sortOrder = req.query.sortOrder as "asc" | "desc";

        quoteLogger.debug({
          requestId,
          userId: req.user?.id,
          email,
          search,
          sortField,
          sortOrder,
        }, "Fetching quotes");

        if (!req.user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        if (email) {
          const quotes = await storage.getQuotesByEmail(email);
          const userQuotes = quotes.filter((quote) => quote.ownerId === req.user!.id);
          quoteLogger.debug({
            requestId,
            email,
            count: userQuotes.length,
          }, "Quotes fetched by email");
          res.json(userQuotes);
        } else if (search) {
          const quotes = await storage.getAllQuotes(req.user.id, search, sortField, sortOrder);
          quoteLogger.debug({
            requestId,
            search,
            count: quotes.length,
          }, "Quotes fetched by search");
          res.json(quotes);
        } else {
          const quotes = await storage.getAllQuotes(req.user.id, undefined, sortField, sortOrder);
          quoteLogger.debug({
            requestId,
            count: quotes.length,
          }, "All quotes fetched");
          res.json(quotes);
        }
      } catch (error: any) {
        quoteLogger.error({
          requestId,
          userId: req.user?.id,
          error: getErrorMessage(error),
        }, "Failed to fetch quotes");
        res.status(500).json({
          message: "Failed to fetch quotes",
          error: getErrorMessage(error),
        });
      }
    }
  );

  // Update a quote (protected)
  app.put("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid quote ID" });
        return;
      }

      // Sanitize numeric fields using shared utility
      const sanitizedBody = sanitizeQuoteFields(req.body);

      // Parse incoming update, read existing, merge, then recompute totals on the server
      const parsedUpdate = updateQuoteSchema.parse({ ...sanitizedBody, id });
      let quote;
      try {
        const existing = await storage.getQuote(id);
        if (!existing) {
          return res.status(404).json({ message: "Quote not found" });
        }
        const calcInput = { ...existing, ...parsedUpdate };
        const cfg = buildServiceConfig(calcInput);
        const quoteData = {
          ...parsedUpdate,
          monthlyFee: cfg.fees.combinedMonthly.toFixed(2),
          setupFee: cfg.fees.combinedOneTimeFees.toFixed(2),
          taasMonthlyFee: cfg.fees.taasMonthly.toFixed(2),
          taasPriorYearsFee: cfg.fees.priorYearFilings.toFixed(2),
        } as any;
        quote = await storage.updateQuote(quoteData);
      } catch (calcErr) {
        quoteLogger.error({ quoteId: id, error: getErrorMessage(calcErr) }, "Pricing calculation failed on update");
        return res.status(400).json({
          message: "Pricing calculation failed on update",
          reason: (calcErr as any)?.message,
        });
      }

      // Update HubSpot when quote is updated
      if (quote.hubspotQuoteId && hubSpotService) {
        quoteLogger.debug({
          requestId: req.headers['x-request-id'] || 'unknown',
          quoteId: id,
          hubspotQuoteId: quote.hubspotQuoteId,
        }, "Syncing quote to HubSpot");
        try {
          const feeCalculation = calculateCombinedFees(toPricingData(quote));
          await hubSpotService.updateQuote(
            quote.hubspotQuoteId,
            quote.hubspotDealId || undefined,
            quote.companyName || "Unknown Company",
            parseFloat(quote.monthlyFee),
            parseFloat(quote.setupFee),
            (req.user?.email as string) || quote.contactEmail,
            quote.contactFirstName || "Contact",
            quote.contactLastName || "",
            Boolean(quote.serviceBookkeeping || (quote as any).serviceMonthlyBookkeeping),
            Boolean(quote.serviceTaas || (quote as any).serviceTaasMonthly),
            Number(feeCalculation.taas.monthlyFee || 0),
            Number(feeCalculation.priorYearFilingsFee || 0),
            Number(feeCalculation.bookkeeping.monthlyFee || 0),
            Number(feeCalculation.bookkeeping.setupFee || 0),
            quote as any,
            quote.serviceTier || undefined,
            Boolean(quote.servicePayroll || (quote as any).servicePayrollService),
            Number(feeCalculation.payrollFee || 0),
            Boolean(
              quote.serviceApLite ||
                (quote as any).serviceApAdvanced ||
                (quote as any).serviceApArService
            ),
            Number(feeCalculation.apFee || 0),
            Boolean(
              quote.serviceArLite ||
                (quote as any).serviceArAdvanced ||
                (quote as any).serviceArService
            ),
            Number(feeCalculation.arFee || 0),
            Boolean(quote.serviceAgentOfService),
            Number(feeCalculation.agentOfServiceFee || 0),
            Boolean(quote.serviceCfoAdvisory),
            Number(feeCalculation.cfoAdvisoryFee || 0),
            Number(feeCalculation.cleanupProjectFee || 0),
            Number(feeCalculation.priorYearFilingsFee || 0),
            Boolean((quote as any).serviceFpaBuild),
            0,
            Number(feeCalculation.bookkeeping.monthlyFee || 0),
            Number(feeCalculation.taas.monthlyFee || 0),
            Number(feeCalculation.serviceTierFee || 0)
          );
          quoteLogger.info({
            quoteId: id,
            hubspotQuoteId: quote.hubspotQuoteId,
          }, "Quote synced to HubSpot");
        } catch (hubspotError) {
          quoteLogger.warn({
            quoteId: id,
            hubspotQuoteId: quote.hubspotQuoteId,
            error: getErrorMessage(hubspotError),
          }, "Failed to sync quote to HubSpot");
          // Don't fail the entire request - quote was updated in database
        }
      }

      res.json(quote);
    } catch (error: unknown) {
      quoteLogger.error({
        quoteId: parseInt(req.params.id),
        error: getErrorMessage(error),
      }, "Quote update failed");
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res.status(500).json({
          message: "Failed to update quote",
          error: getErrorMessage(error),
        });
      }
    }
  });

  // Moved to hubspot-routes.ts: /api/hubspot/push-quote

  // Moved to hubspot-routes.ts: /api/hubspot/oauth/callback

  // Moved to hubspot-routes.ts: /api/hubspot/queue-metrics

  // Moved to hubspot-routes.ts: /api/hubspot/schedule-sync

  // Moved to hubspot-routes.ts: /api/hubspot/health

  // Moved to hubspot-routes.ts: /api/hubspot/cleanup-queue

  // Moved to hubspot-routes.ts: /api/hubspot/queue-status

  // Moved to hubspot-routes.ts: /api/hubspot/retry-job

  // HubSpot integration endpoints

  // Verify contact email in HubSpot
  // Moved to hubspot-routes.ts: /api/hubspot/verify-contact

  // Debug endpoint: Verify HubSpot product IDs
  // Moved to hubspot-routes.ts: /api/hubspot/debug/products

  // HubSpot diagnostics (dry-run) - Create path
  // Moved to hubspot-routes.ts: /api/hubspot/diagnostics/create (POST)

  // HubSpot diagnostics (dry-run) - Update path
  // Moved to hubspot-routes.ts: /api/hubspot/diagnostics/update (POST)

  // HubSpot diagnostics (dry-run) - Update path (GET variant for convenience)
  // Moved to hubspot-routes.ts: /api/hubspot/diagnostics/update (GET)

  // Moved to hubspot-routes.ts: /api/hubspot/queue-sync

  // Moved to hubspot-routes.ts: /api/hubspot/queue-status

  // Retry failed job (admin only)
  // Moved to hubspot-routes.ts: /api/hubspot/retry-job

  // Moved to hubspot-routes.ts: /api/hubspot/push-quote

  // Moved to hubspot-routes.ts: /api/hubspot/update-quote

  // Moved to hubspot-routes.ts: /api/hubspot/oauth/callback

  // Sales Inbox API endpoints

  // Get active leads for sales inbox
  app.get("/api/sales-inbox/leads", requireAuth, async (req, res) => {
    try {
      if (!hubSpotService) {
        res.status(400).json({ message: "HubSpot integration not configured" });
        return;
      }

      const { limit = "8", showAll = "false" } = req.query;

      // For debugging, allow showing all leads regardless of owner
      const userEmail = showAll === "true" ? undefined : req.user?.email;

      const leads = await hubSpotService.getSalesInboxLeads(userEmail, parseInt(limit.toString()));

      res.json({ leads });
    } catch (error) {
      console.error("Error fetching sales inbox leads:", error);
      res.status(500).json({ message: "Failed to fetch sales inbox leads" });
    }
  });

  // Client Intel API endpoints
  // Moved to server/routes/client-intel.ts

  // Moved to server/routes/client-intel.ts

  // Job status endpoint for polling AI insights progress
  // Moved to server/routes/infra.ts

  // Moved to server/routes/infra.ts

  // Moved to server/routes/infra.ts

  // Moved to server/routes/stripe.ts

  // Moved to server/routes/stripe.ts

  // Moved to server/routes/cdn.ts

  // HubSpot Background Jobs endpoints

  // Get HubSpot queue metrics
  // Moved to hubspot-routes.ts: /api/hubspot/queue-metrics

  // Schedule HubSpot sync jobs
  // Moved to hubspot-routes.ts: /api/hubspot/schedule-sync

  // Check HubSpot API health
  // Moved to hubspot-routes.ts: /api/hubspot/health

  // Moved to hubspot-routes.ts: /api/hubspot/search-contacts

  // Clean up HubSpot queue
  // Moved to hubspot-routes.ts: /api/hubspot/cleanup-queue

  // Commission tracking routes

  // TEST: Debug sales reps endpoint
  app.get("/api/debug-sales-reps-test", requireAuth, async (req, res) => {
    console.log("🚨🚨🚨 DEBUG SALES REPS TEST API CALLED 🚨🚨🚨");

    try {
      const testResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`
      );
      console.log("📊 Sales reps count:", testResult.rows);

      const result = await db.execute(sql`
        SELECT 
          sr.id,
          sr.first_name,
          sr.last_name,
          sr.email,
          sr.is_active
        FROM sales_reps sr
        WHERE sr.is_active = true
        ORDER BY sr.id ASC
      `);

      console.log("📊 Raw sales reps from DB:", result.rows);
      res.json({
        debug: true,
        count: testResult.rows[0],
        salesReps: result.rows,
      });
    } catch (error) {
      console.error("🚨 ERROR in debug sales reps API:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // TEST: Debug sales reps endpoint
  app.get("/api/debug-sales-reps", requireAuth, async (req, res) => {
    console.log("🚨🚨🚨 DEBUG SALES REPS API CALLED 🚨🚨🚨");

    try {
      const testResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`
      );
      console.log("📊 Sales reps count:", testResult.rows);

      const result = await db.execute(sql`
        SELECT 
          sr.id,
          sr.first_name,
          sr.last_name,
          sr.email,
          sr.is_active
        FROM sales_reps sr
        WHERE sr.is_active = true
        ORDER BY sr.id ASC
      `);

      console.log("📊 Raw sales reps from DB:", result.rows);
      res.json({
        debug: true,
        count: testResult.rows[0],
        salesReps: result.rows,
      });
    } catch (error) {
      console.error("🚨 ERROR in debug sales reps API:", getErrorMessage(error));
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // =============================
  // Sales Reps Routes (Extracted)
  // =============================
  // Moved to server/routes/sales-reps.ts
  // - GET /api/sales-reps
  // - GET /api/sales-reps/me

  // =============================
  // Commissions Routes (Extracted)
  // =============================
  // Moved to server/routes/commissions.ts
  // - GET /api/commissions
  // - PATCH /api/commissions/:id
  // - POST /api/commissions/:id/approve
  // - POST /api/commissions/:id/reject
  // - POST /api/commissions/:id/unreject
  // - GET /api/commission-adjustments
  // - GET /api/pipeline-projections
  // - GET /api/commissions/current-period-summary
  // Note: HubSpot sync routes remain in Diagnostics section below


  // =============================
  // Diagnostics Routes (Admin Only)
  // =============================

  // Admin-triggered HubSpot commissions full sync
  app.post(
    "/api/commissions/sync-hubspot",
    requireAuth,
    requireAdminGuard,
    requirePermission("commissions.sync", "commission"),
    async (req, res) => {
      try {
        const results = await hubspotSync.performFullSync();
        res.json({
          message: "HubSpot commissions full sync completed",
          results,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ HubSpot commissions full sync failed:", error);
        res.status(500).json({
          message: "HubSpot commissions full sync failed",
          error: getErrorMessage(error),
        });
      }
    }
  );

  // Version and build information
  app.get(
    "/api/_version",
    requireAuth,
    requireAdminGuard,
    requirePermission("diagnostics.view", "system"),
    (req, res) => {
      try {
        const version = {
          commitSha:
            process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || "unknown",
          buildTime: process.env.BUILD_TIME || new Date().toISOString(),
          environment: process.env.NODE_ENV || "development",
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: new Date().toISOString(),
        };

        res.json(version);
      } catch (error) {
        console.error("Version endpoint error:", error);
        res.status(500).json({
          message: "Failed to retrieve version information",
          error: getErrorMessage(error),
        });
      }
    }
  );

  // Schema health check
  app.get(
    "/api/_schema-health",
    requireAuth,
    requireAdminGuard,
    requirePermission("diagnostics.view", "system"),
    async (req, res) => {
      try {
        const healthChecks = [];

        // Check critical tables exist
        const criticalTables = ["users", "quotes", "deals", "commissions"];

        for (const tableName of criticalTables) {
          try {
            const result = await db.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = ${tableName}
            );
          `);

            healthChecks.push({
              table: tableName,
              exists: result.rows[0]?.exists || false,
              status: result.rows[0]?.exists ? "ok" : "missing",
            });
          } catch (error) {
            healthChecks.push({
              table: tableName,
              exists: false,
              status: "error",
              error: getErrorMessage(error),
            });
          }
        }

        // Check Supabase Auth columns exist
        try {
          const authColumnsResult = await db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name IN ('auth_user_id', 'last_login_at');
        `);

          const authColumns = authColumnsResult.rows.map((row: any) => row.column_name);
          healthChecks.push({
            check: "supabase_auth_columns",
            auth_user_id: authColumns.includes("auth_user_id"),
            last_login_at: authColumns.includes("last_login_at"),
            status: authColumns.length === 2 ? "ok" : "partial",
          });
        } catch (error) {
          healthChecks.push({
            check: "supabase_auth_columns",
            status: "error",
            error: getErrorMessage(error),
          });
        }

        const overallStatus = healthChecks.every(
          (check) => check.status === "ok" || check.status === "partial"
        )
          ? "healthy"
          : "unhealthy";

        res.json({
          status: overallStatus,
          timestamp: new Date().toISOString(),
          checks: healthChecks,
        });
      } catch (error) {
        console.error("Schema health check error:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to perform schema health check",
          error: getErrorMessage(error),
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Authorization diagnostics endpoint (admin-only)
  app.get("/api/_authz-check", requireAuth, requireAdminGuard, async (req, res) => {
    try {
      const { authorize, getUserAuthzInfo } = await import("./services/authz/authorize");

      const action = req.query.action as string;
      const resourceType = req.query.resource as string;
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : req.user?.id;

      if (!action) {
        return res.status(400).json({
          message: "action parameter is required",
        });
      }

      if (!userId) {
        return res.status(400).json({
          message: "userId parameter is required or user not authenticated",
        });
      }

      // Get user's authorization info
      const authzInfo = await getUserAuthzInfo(userId);

      // Create principal for authorization check
      const principal = {
        userId,
        email: req.user?.email || "unknown",
        role: req.user?.role,
        roles: authzInfo.roles,
        permissions: authzInfo.permissions,
      };

      // Perform authorization check
      const resource = resourceType ? { type: resourceType } : undefined;
      const authzResult = await authorize(principal, action, resource);

      res.json({
        userId,
        action,
        resource: resourceType || null,
        result: authzResult,
        userInfo: {
          email: principal.email,
          legacyRole: principal.role,
          roles: authzInfo.roles.map((r) => ({ id: r.id, name: r.name })),
          permissions: authzInfo.permissions.map((p) => ({
            id: p.id,
            key: p.key,
            category: p.category,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Authorization check error:", error);
      res.status(500).json({
        message: "Authorization check failed",
        error: getErrorMessage(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Cerbos decision explanation endpoint (admin-only)
  app.get("/api/_cerbos-explain", requireAuth, requireAdminGuard, async (req, res) => {
    try {
      const { explainDecision } = await import("./services/authz/cerbos-client");
      const { loadPrincipalAttributes, loadResourceAttributes } = await import(
        "./services/authz/attribute-loader"
      );
      const { toCerbosPrincipal, toCerbosResource } = await import(
        "./services/authz/cerbos-client"
      );

      const action = req.query.action as string;
      const resourceType = req.query.resourceType as string;
      const resourceId = req.query.resourceId as string;
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : req.user?.id;

      if (!action || !resourceType) {
        return res.status(400).json({
          message: "action and resourceType parameters are required",
        });
      }

      if (!userId) {
        return res.status(400).json({
          message: "userId parameter is required or user not authenticated",
        });
      }

      // Create principal
      const principal = {
        userId,
        email: req.user?.email || "unknown",
        role: req.user?.role,
      };

      // Load enriched attributes
      const principalAttributes = await loadPrincipalAttributes(principal);
      const cerbosPrincipal = toCerbosPrincipal(principal, principalAttributes);

      // Create resource
      const resource = { type: resourceType, id: resourceId, attrs: {} };
      const resourceAttributes = await loadResourceAttributes(resource);
      const cerbosResource = toCerbosResource(resource, resourceAttributes);

      // Get decision explanation
      const explanation = await explainDecision(cerbosPrincipal, cerbosResource, action);

      res.json({
        userId,
        action,
        resource: {
          type: resourceType,
          id: resourceId,
          attributes: resourceAttributes,
        },
        principal: {
          id: cerbosPrincipal.id,
          roles: cerbosPrincipal.roles,
          departments: cerbosPrincipal.departments,
          isManager: cerbosPrincipal.isManager,
        },
        explanation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Cerbos explanation error:", error);
      res.status(500).json({
        message: "Failed to get Cerbos decision explanation",
        error: getErrorMessage(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Migration endpoint (development only)
  if (process.env.NODE_ENV === "development") {
    app.post("/api/_apply-migration", async (req, res) => {
      try {
        console.log("🔧 [Migration] Applying user table column migrations...");

        const fs = await import("fs");
        const results = [];

        // Apply auth_user_id column migration
        try {
          const authUserIdSQL = fs.readFileSync(
            "server/db/migrations/add-auth-user-id-column.sql",
            "utf8"
          );
          await db.execute(sql.raw(authUserIdSQL));
          results.push({ migration: "add-auth-user-id-column", status: "success" });
          console.log("✅ [Migration] auth_user_id column migration completed");
        } catch (error) {
          results.push({
            migration: "add-auth-user-id-column",
            status: "error",
            error: (error as Error).message,
          });
          console.log(
            "ℹ️ [Migration] auth_user_id column migration skipped (likely already exists)"
          );
        }

        // Apply last_login_at column migration
        try {
          const lastLoginSQL = fs.readFileSync(
            "server/db/migrations/add-last-login-column.sql",
            "utf8"
          );
          await db.execute(sql.raw(lastLoginSQL));
          results.push({ migration: "add-last-login-column", status: "success" });
          console.log("✅ [Migration] last_login_at column migration completed");
        } catch (error) {
          results.push({
            migration: "add-last-login-column",
            status: "error",
            error: (error as Error).message,
          });
          console.log(
            "ℹ️ [Migration] last_login_at column migration skipped (likely already exists)"
          );
        }

        console.log("✅ [Migration] All user table migrations processed");

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          migrations: results,
          result: "User table migrations completed",
        });
      } catch (error) {
        console.error("❌ [Migration] Migration failed:", error);
        res.status(500).json({
          error: "Migration failed",
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // Assign Role endpoint (development only)
  if (process.env.NODE_ENV === "development") {
    app.post("/api/_assign-role", async (req, res) => {
      try {
        const { email, roleName } = req.body;

        if (!email || !roleName) {
          return res.status(400).json({ error: "Email and roleName are required" });
        }

        console.log(`🎭 [Role Assignment] Assigning role "${roleName}" to user "${email}"`);

        // Get user by email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Get role by name
        const role = await storage.getRoleByName(roleName);
        if (!role) {
          return res.status(404).json({ error: "Role not found" });
        }

        // Assign role to user
        await storage.assignRoleToUser(user.id, role.id);

        console.log(
          `✅ [Role Assignment] Successfully assigned role "${roleName}" to user "${email}"`
        );

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          user: { id: user.id, email: user.email },
          role: { id: role.id, name: role.name },
          message: `Role "${roleName}" assigned to user "${email}"`,
        });
      } catch (error) {
        console.error("❌ [Role Assignment] Assignment failed:", error);
        res.status(500).json({
          error: "Role assignment failed",
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // RBAC Seed endpoint (development only)
  if (process.env.NODE_ENV === "development") {
    app.post("/api/_rbac-seed", async (req, res) => {
      try {
        console.log("🌱 [RBAC Seed] Starting RBAC data seeding...");

        // Seed roles
        const rolesToCreate = [
          { name: "admin", description: "System administrator with full access" },
          { name: "sales_manager", description: "Sales team manager with team oversight" },
          { name: "sales_rep", description: "Sales representative with individual access" },
          { name: "finance", description: "Finance team member with financial data access" },
          { name: "viewer", description: "Read-only access to basic information" },
        ];

        const createdRoles = [];
        for (const roleData of rolesToCreate) {
          try {
            const role = await storage.createRole(roleData);
            createdRoles.push(role);
          } catch (error) {
            // Role might already exist, try to get it
            const existingRole = await storage.getRoleByName(roleData.name);
            if (existingRole) {
              createdRoles.push(existingRole);
            }
          }
        }

        // Seed permissions
        const permissionsToCreate = [
          { key: "admin.*", description: "Full administrative access", category: "admin" },
          { key: "commissions.view", description: "View commission data", category: "commissions" },
          {
            key: "commissions.sync",
            description: "Sync commission data with HubSpot",
            category: "commissions",
          },
          {
            key: "commissions.approve",
            description: "Approve commission adjustments",
            category: "commissions",
          },
          { key: "quotes.view", description: "View quotes", category: "quotes" },
          { key: "quotes.create", description: "Create new quotes", category: "quotes" },
          { key: "quotes.update", description: "Update existing quotes", category: "quotes" },
          { key: "diagnostics.view", description: "View system diagnostics", category: "admin" },
        ];

        const createdPermissions = [];
        for (const permData of permissionsToCreate) {
          try {
            const permission = await storage.createPermission(permData);
            createdPermissions.push(permission);
          } catch (error) {
            // Permission might already exist
            const existingPerm = await storage.getPermissionByKey(permData.key);
            if (existingPerm) {
              createdPermissions.push(existingPerm);
            }
          }
        }

        // Assign permissions to roles
        const adminRole = createdRoles.find((r) => r.name === "admin");
        const salesManagerRole = createdRoles.find((r) => r.name === "sales_manager");

        if (adminRole) {
          // Admin gets all permissions
          for (const permission of createdPermissions) {
            try {
              await storage.assignPermissionToRole(adminRole.id, permission.id);
            } catch (error) {
              // Might already be assigned
            }
          }
        }

        if (salesManagerRole) {
          // Sales manager gets specific permissions
          const managerPermissions = createdPermissions.filter((p) =>
            [
              "commissions.view",
              "commissions.sync",
              "quotes.view",
              "quotes.create",
              "quotes.update",
            ].includes(p.key)
          );
          for (const permission of managerPermissions) {
            try {
              await storage.assignPermissionToRole(salesManagerRole.id, permission.id);
            } catch (error) {
              // Might already be assigned
            }
          }
        }

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          seeded: {
            roles: createdRoles.length,
            permissions: createdPermissions.length,
            role_permissions: "assigned",
          },
          data: {
            roles: createdRoles.map((r) => ({ id: r.id, name: r.name })),
            permissions: createdPermissions.map((p) => ({ id: p.id, key: p.key })),
          },
        });
      } catch (error) {
        console.error("❌ [RBAC Seed] Seeding failed:", error);
        res.status(500).json({
          error: "RBAC seeding failed",
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // RBAC Management API endpoints
  app.get("/api/admin/rbac/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const result = await Promise.all(
        users.map(async (u) => {
          const roles = await storage.getUserRoles(u.id);
          return {
            id: u.id,
            email: u.email,
            firstName: (u as any).firstName,
            lastName: (u as any).lastName,
            roles: roles.map((r) => ({ id: r.id, name: r.name })),
          };
        })
      );
      res.json({ users: result });
    } catch (error) {
      console.error("Error fetching users with roles:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/rbac/roles", requireAuth, async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      const result = await Promise.all(
        roles.map(async (r) => {
          const perms = await storage.getRolePermissions(r.id);
          return {
            id: r.id,
            name: r.name,
            description: (r as any).description,
            permissions: perms.map((p) => ({
              id: p.id,
              key: p.key,
              category: (p as any).category,
            })),
          };
        })
      );
      res.json({ roles: result });
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/admin/rbac/permissions", requireAuth, async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json({ permissions });
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.post("/api/admin/rbac/assign-role", requireAuth, async (req, res) => {
    try {
      const { userId, roleId } = req.body;
      await storage.assignRoleToUser(userId, roleId);
      res.json({ success: true, message: "Role assigned successfully" });
    } catch (error) {
      console.error("Error assigning role:", error);
      res.status(500).json({ error: "Failed to assign role" });
    }
  });

  app.delete("/api/admin/rbac/user/:userId/role/:roleId", requireAuth, async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      await storage.removeRoleFromUser(parseInt(userId), parseInt(roleId));
      res.json({ success: true, message: "Role removed successfully" });
    } catch (error) {
      console.error("Error removing role:", error);
      res.status(500).json({ error: "Failed to remove role" });
    }
  });

  app.post("/api/admin/rbac/test-authz", requireAuth, async (req, res) => {
    try {
      const { userEmail, action, resourceType, resourceId } = req.body;

      // Get user by email
      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user roles
      const userRoles = await storage.getUserRoles(user.id);

      // Create test principal
      const testPrincipal = {
        userId: user.id,
        email: user.email,
        role: user.role, // Legacy role
        roles: userRoles,
        authUserId: user.authUserId,
      };

      // Create test resource
      const testResource = {
        type: resourceType,
        id: resourceId,
        attrs: {},
      };

      // Test authorization
      const result = await authorize(testPrincipal, action, testResource);

      res.json({
        action,
        resource: resourceType,
        allowed: result.allowed,
        reason: result.reason,
        timestamp: new Date().toISOString(),
        principal: {
          userId: user.id,
          email: user.email,
          roles: userRoles.map((r) => r.name),
        },
      });
    } catch (error) {
      console.error("Error testing authorization:", error);
      res.status(500).json({ error: "Failed to test authorization" });
    }
  });

  app.get("/api/admin/cerbos/policy/:policyName", requireAuth, async (req, res) => {
    try {
      const { policyName } = req.params;
      const fs = await import("fs");
      const path = await import("path");

      const policyPath = path.join(process.cwd(), "cerbos", "policies", `${policyName}.yaml`);

      if (!fs.existsSync(policyPath)) {
        return res.status(404).json({ error: "Policy not found" });
      }

      const content = fs.readFileSync(policyPath, "utf8");
      res.json({ content });
    } catch (error) {
      console.error("Error reading policy:", error);
      res.status(500).json({ error: "Failed to read policy" });
    }
  });

  app.put("/api/admin/cerbos/policy/:policyName", requireAuth, async (req, res) => {
    try {
      const { policyName } = req.params;
      const { content } = req.body;
      const fs = await import("fs");
      const path = await import("path");

      const policyPath = path.join(process.cwd(), "cerbos", "policies", `${policyName}.yaml`);

      // Write the policy file
      fs.writeFileSync(policyPath, content, "utf8");

      // TODO: Trigger Railway deployment or Cerbos reload
      console.log(`📝 [Policy] Updated ${policyName}.yaml policy`);

      res.json({ success: true, message: "Policy updated successfully" });
    } catch (error) {
      console.error("Error updating policy:", error);
      res.status(500).json({ error: "Failed to update policy" });
    }
  });

  // RBAC Test endpoint (development only)
  if (process.env.NODE_ENV === "development") {
    app.get("/api/_rbac-test", async (req, res) => {
      try {
        console.log("🧪 [RBAC Test] Starting RBAC system test...");

        // Test 1: Check if RBAC tables exist
        const tableCheck = await db.execute(sql`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles')
          ORDER BY table_name;
        `);

        const existingTables = tableCheck.rows.map((row: any) => row.table_name);

        // Test 2: Try to create RBAC tables if they don't exist
        let migrationResult = "skipped";
        if (existingTables.length < 4) {
          try {
            // Run the RBAC migration
            const fs = await import("fs");
            const migrationSQL = fs.readFileSync(
              "server/db/migrations/rbac-tables-only.sql",
              "utf8"
            );
            await db.execute(sql.raw(migrationSQL));
            migrationResult = "success";
          } catch (error) {
            migrationResult = `error: ${(error as Error).message}`;
          }
        }

        // Test 3: Check storage methods
        const storageMethods = [
          "getAllRoles",
          "getAllPermissions",
          "getUserRoles",
          "getUserByAuthUserId",
          "updateUserLastLogin",
        ];

        res.json({
          success: true,
          tables: existingTables,
          migration: migrationResult,
          storageMethods,
        });
      } catch (error) {
        console.error("❌ [RBAC Test] Test failed:", error);
        res.status(500).json({
          error: "RBAC test failed",
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // Register admin routes
  await registerAdminRoutes(app);

  // Register quote routes with enhanced HubSpot sync
  app.use("/api", quoteRoutes);

  // Register health check routes for service monitoring
  const { healthRoutes } = await import("./routes/health.js");
  app.use("/api", healthRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
