/* eslint-disable no-param-reassign */
// Express route handlers intentionally mutate req/res objects
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import type { User } from "@shared/schema";
import type { Principal } from "./services/authz/authorize";

// Extend Express Request type with auth properties
interface AuthenticatedRequest extends Request {
  user?: User;
  principal?: Principal;
}
import { storage } from "./storage";
import { insertQuoteSchema, updateQuoteSchema } from "@shared/schema";
import { z } from "zod";
import { hubSpotService } from "./hubspot";
import { requireAuth } from "./middleware/supabase-auth";
import { registerAdminRoutes } from "./admin-routes";
import { registerHubspotRoutes } from "./hubspot-routes";
import quoteRoutes from "./quote-routes";
import { calculateCombinedFees } from "@shared/pricing";
import { mountRouters } from "./routes/index";
import { apiRateLimit } from "./middleware/rate-limiter";
import { conditionalCsrf, provideCsrfToken } from "./middleware/csrf";
import express from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { hubspotSync } from "./hubspot-sync";
import { requirePermission, authorize } from "./services/authz/authorize";
import { getErrorMessage } from "./utils/error-handling";
import { toPricingData } from "./utils/pricing-normalization";
import { sanitizeQuoteFields, prepareQuoteForValidation } from "./utils/quote-sanitization";
import { quoteLogger, logger } from "./logger";
import type { PricingCalculation } from "./types/quote";
import { verifyHubSpotQuotes } from "./utils/hubspot-helpers";
import { buildServiceConfig } from "./services/hubspot/compose";
import path from "path";

// Type for quotes with potential legacy field names
type QuoteWithLegacyFields = Record<string, unknown> & {
  serviceBookkeeping?: boolean;
  serviceTaas?: boolean;
  servicePayroll?: boolean;
  serviceApLite?: boolean;
  serviceArLite?: boolean;
  serviceAgentOfService?: boolean;
  serviceCfoAdvisory?: boolean;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail?: string;
  monthlyFee: string;
  setupFee: string;
  hubspotQuoteId?: string | number | null;
  serviceTier?: string | null;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session-based auth removed; all routes use Supabase Auth via requireAuth

  // Apply CSRF protection after sessions are initialized - simplified
  app.use(conditionalCsrf);
  app.use(provideCsrfToken);

  // Note: Admin authorization handled by requirePermission middleware
  // See docs/AUTHORIZATION_PATTERN.md for details

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

  /**
   * POST /api/quotes
   * Action: quotes.create
   * Create a new quote with pricing calculation and approval flow
   */
  app.post(
    "/api/quotes",
    requireAuth,
    requirePermission("quotes.create", "department"),
    async (req: AuthenticatedRequest, res) => {
      const requestId = req.headers["x-request-id"] || "unknown";

      try {
        quoteLogger.info(
          {
            requestId,
            userId: req.user?.id,
            userEmail: req.user?.email,
            contactEmail: req.body?.contactEmail,
          },
          "Quote creation request received"
        );

        // Note: req.user is guaranteed to exist due to requireAuth middleware

        // Sanitize numeric fields using shared utility
        const sanitizedBody = sanitizeQuoteFields(req.body);
        const validationData = prepareQuoteForValidation(sanitizedBody);

        // Check for existing quotes - use approval system if needed
        const { contactEmail, approvalCode } = req.body;
        quoteLogger.debug(
          {
            requestId,
            contactEmail,
            hasApprovalCode: !!approvalCode,
          },
          "Checking approval requirements"
        );

        if (contactEmail) {
          const existingQuotes = await storage.getQuotesByEmail(contactEmail);
          quoteLogger.debug(
            {
              requestId,
              contactEmail,
              count: existingQuotes.length,
            },
            "Existing quotes found"
          );

          // Only block if there are quotes that still exist in HubSpot
          // Quotes that no longer exist in HubSpot should NOT require approval
          let liveInHubSpotCount = 0;
          try {
            const verifications = await verifyHubSpotQuotes(
              existingQuotes.map((q: { id: number; hubspotQuoteId?: string | number | null }) => ({
                id: q.id,
                hubspotQuoteId: q.hubspotQuoteId ?? null,
              }))
            );
            liveInHubSpotCount = verifications.filter((v) => v.existsInHubSpot).length;
          } catch (e) {
            // In case of verification failure, be conservative: treat as zero to avoid blocking valid flows
            quoteLogger.warn(
              {
                requestId,
                contactEmail,
                error: getErrorMessage(e),
              },
              "HubSpot existence verification failed, allowing creation"
            );
            liveInHubSpotCount = 0;
          }

          if (liveInHubSpotCount > 0) {
            // There are active HubSpot quotes; require approval code
            if (!approvalCode) {
              quoteLogger.warn(
                {
                  requestId,
                  contactEmail,
                  liveQuotesCount: liveInHubSpotCount,
                },
                "Approval code required but not provided"
              );
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
        quoteLogger.debug(
          {
            requestId,
            contactEmail: validationData.contactEmail,
            industry: validationData.industry,
            monthlyRevenueRange: validationData.monthlyRevenueRange,
          },
          "Validating quote data"
        );
        const validationResult = insertQuoteSchema.safeParse(validationData);

        if (!validationResult.success) {
          quoteLogger.error(
            {
              requestId,
              contactEmail: req.body.contactEmail,
              errors: validationResult.error.errors,
            },
            "Quote validation failed"
          );

          throw validationResult.error;
        }

        const validatedQuoteData = validationResult.data;
        quoteLogger.debug({ requestId }, "Quote validation passed");

        // Compute canonical pricing totals on the server
        // Do NOT trust client-provided totals; derive from validated inputs
        let quote;
        try {
          const calc: PricingCalculation = calculateCombinedFees(toPricingData(validatedQuoteData));
          quoteLogger.debug(
            {
              requestId,
              monthlyFee: calc.combined.monthlyFee,
              setupFee: calc.combined.setupFee,
            },
            "Pricing calculated"
          );

          // Add ownerId and override totals from server calc
          const quoteData = {
            ...validatedQuoteData,
            ownerId: req.user.id,
            monthlyFee: calc.combined.monthlyFee.toFixed(2),
            setupFee: calc.combined.setupFee.toFixed(2),
            taasMonthlyFee: calc.taas.monthlyFee.toFixed(2),
            taasPriorYearsFee: calc.priorYearFilingsFee.toFixed(2),
          };

          quoteLogger.debug({ requestId }, "Creating quote in database");
          quote = await storage.createQuote(quoteData);
        } catch (calcError) {
          quoteLogger.error(
            {
              requestId,
              error: getErrorMessage(calcError),
            },
            "Pricing calculation failed"
          );
          return res.status(400).json({
            message: "Pricing calculation failed",
            reason: calcError instanceof Error ? calcError.message : String(calcError),
          });
        }

        if (!quote) {
          quoteLogger.error({ requestId }, "Quote creation returned null");
          return res.status(500).json({ message: "Quote creation failed - no data returned" });
        }

        quoteLogger.info(
          {
            requestId,
            quoteId: quote.id,
            contactEmail: quote.contactEmail,
            monthlyFee: quote.monthlyFee,
            setupFee: quote.setupFee,
          },
          "Quote created successfully"
        );
        res.json(quote);
      } catch (error: unknown) {
        quoteLogger.error(
          {
            requestId,
            error: getErrorMessage(error),
            userId: req.user?.id,
          },
          "Quote creation failed"
        );
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

  /**
   * GET /api/quotes
   * Action: quotes.read
   * Get all quotes with optional search and sort
   */
  app.get(
    "/api/quotes",
    requireAuth,
    requirePermission("quotes.read", "department"),
    async (req: AuthenticatedRequest, res) => {
      const requestId = req.headers["x-request-id"] || "unknown";

      try {
        const email = req.query.email as string;
        const search = req.query.search as string;
        const sortField = req.query.sortField as string;
        const sortOrder = req.query.sortOrder as "asc" | "desc";

        quoteLogger.debug(
          {
            requestId,
            userId: req.user?.id,
            email,
            search,
            sortField,
            sortOrder,
          },
          "Fetching quotes"
        );

        // Note: req.user is guaranteed to exist due to requireAuth middleware

        if (email) {
          const quotes = await storage.getQuotesByEmail(email);
          const userQuotes = quotes.filter((quote) => quote.ownerId === req.user!.id);
          quoteLogger.debug(
            {
              requestId,
              email,
              count: userQuotes.length,
            },
            "Quotes fetched by email"
          );
          res.json(userQuotes);
        } else if (search) {
          const quotes = await storage.getAllQuotes(req.user.id, search, sortField, sortOrder);
          quoteLogger.debug(
            {
              requestId,
              search,
              count: quotes.length,
            },
            "Quotes fetched by search"
          );
          res.json(quotes);
        } else {
          const quotes = await storage.getAllQuotes(req.user.id, undefined, sortField, sortOrder);
          quoteLogger.debug(
            {
              requestId,
              count: quotes.length,
            },
            "All quotes fetched"
          );
          res.json(quotes);
        }
      } catch (error: unknown) {
        quoteLogger.error(
          {
            requestId,
            userId: req.user?.id,
            error: getErrorMessage(error),
          },
          "Failed to fetch quotes"
        );
        res.status(500).json({
          message: "Failed to fetch quotes",
          error: getErrorMessage(error),
        });
      }
    }
  );

  /**
   * PUT /api/quotes/:id
   * Action: quotes.update
   * Update an existing quote with recalculated pricing
   */
  app.put(
    "/api/quotes/:id",
    requireAuth,
    requirePermission("quotes.update", "department"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = parseInt(req.params.id || "");
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
          };
          quote = await storage.updateQuote(quoteData);
        } catch (calcErr) {
          quoteLogger.error(
            { quoteId: id, error: getErrorMessage(calcErr) },
            "Pricing calculation failed on update"
          );
          return res.status(400).json({
            message: "Pricing calculation failed on update",
            reason: calcErr instanceof Error ? calcErr.message : String(calcErr),
          });
        }

        // Update HubSpot when quote is updated
        if (quote.hubspotQuoteId && hubSpotService) {
          quoteLogger.debug(
            {
              requestId: req.headers["x-request-id"] || "unknown",
              quoteId: id,
              hubspotQuoteId: quote.hubspotQuoteId,
            },
            "Syncing quote to HubSpot"
          );
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
              Boolean(
                quote.serviceBookkeeping ||
                  (quote as QuoteWithLegacyFields).serviceMonthlyBookkeeping
              ),
              Boolean(quote.serviceTaas || (quote as QuoteWithLegacyFields).serviceTaasMonthly),
              Number(feeCalculation.taas.monthlyFee || 0),
              Number(feeCalculation.priorYearFilingsFee || 0),
              Number(feeCalculation.bookkeeping.monthlyFee || 0),
              Number(feeCalculation.bookkeeping.setupFee || 0),
              quote as QuoteWithLegacyFields,
              quote.serviceTier || undefined,
              Boolean(
                quote.servicePayroll || (quote as QuoteWithLegacyFields).servicePayrollService
              ),
              Number(feeCalculation.payrollFee || 0),
              Boolean(
                quote.serviceApLite ||
                  (quote as QuoteWithLegacyFields).serviceApAdvanced ||
                  (quote as QuoteWithLegacyFields).serviceApArService
              ),
              Number(feeCalculation.apFee || 0),
              Boolean(
                quote.serviceArLite ||
                  (quote as QuoteWithLegacyFields).serviceArAdvanced ||
                  (quote as QuoteWithLegacyFields).serviceArService
              ),
              Number(feeCalculation.arFee || 0),
              Boolean(quote.serviceAgentOfService),
              Number(feeCalculation.agentOfServiceFee || 0),
              Boolean(quote.serviceCfoAdvisory),
              Number(feeCalculation.cfoAdvisoryFee || 0),
              Number(feeCalculation.cleanupProjectFee || 0),
              Number(feeCalculation.priorYearFilingsFee || 0),
              Boolean((quote as QuoteWithLegacyFields).serviceFpaBuild),
              0,
              Number(feeCalculation.bookkeeping.monthlyFee || 0),
              Number(feeCalculation.taas.monthlyFee || 0),
              Number(feeCalculation.serviceTierFee || 0)
            );
            quoteLogger.info(
              {
                quoteId: id,
                hubspotQuoteId: quote.hubspotQuoteId,
              },
              "Quote synced to HubSpot"
            );
          } catch (hubspotError) {
            quoteLogger.warn(
              {
                quoteId: id,
                hubspotQuoteId: quote.hubspotQuoteId,
                error: getErrorMessage(hubspotError),
              },
              "Failed to sync quote to HubSpot"
            );
            // Don't fail the entire request - quote was updated in database
          }
        }

        res.json(quote);
      } catch (error: unknown) {
        quoteLogger.error(
          {
            quoteId: parseInt(req.params.id || ""),
            error: getErrorMessage(error),
          },
          "Quote update failed"
        );
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid quote data", errors: error.errors });
        } else {
          res.status(500).json({
            message: "Failed to update quote",
            error: getErrorMessage(error),
          });
        }
      }
    }
  );

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

  /**
   * GET /api/sales-inbox/leads
   * Action: sales.read
   * Get active leads for sales inbox from HubSpot
   */
  app.get(
    "/api/sales-inbox/leads",
    requireAuth,
    requirePermission("sales.read", "department"),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!hubSpotService) {
          res.status(400).json({ message: "HubSpot integration not configured" });
          return;
        }

        const { limit = "8", showAll = "false" } = req.query;

        // For debugging, allow showing all leads regardless of owner
        const userEmail = showAll === "true" ? undefined : req.user?.email;

        const leads = await hubSpotService.getSalesInboxLeads(
          userEmail,
          parseInt(limit.toString())
        );

        res.json({ leads });
      } catch (error) {
        logger.error({ error }, "Error fetching sales inbox leads");
        res.status(500).json({ message: "Failed to fetch sales inbox leads" });
      }
    }
  );

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

  /**
   * GET /api/debug-sales-reps-test
   * Action: diagnostics.view
   * Debug endpoint to test sales reps query
   */
  app.get(
    "/api/debug-sales-reps-test",
    requireAuth,
    requirePermission("diagnostics.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      logger.info("DEBUG SALES REPS TEST API CALLED");

      try {
        const testResult = await db.execute(
          sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`
        );
        logger.debug({ count: testResult.rows }, "Sales reps count");

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

        logger.debug({ count: result.rows.length }, "Raw sales reps from DB");
        res.json({
          debug: true,
          count: testResult.rows[0],
          salesReps: result.rows,
        });
      } catch (error) {
        logger.error({ error }, "ERROR in debug sales reps API");
        res.status(500).json({ error: getErrorMessage(error) });
      }
    }
  );

  /**
   * GET /api/debug-sales-reps
   * Action: diagnostics.view
   * Debug endpoint for sales reps data
   */
  app.get(
    "/api/debug-sales-reps",
    requireAuth,
    requirePermission("diagnostics.view", "system"),
    async (req: AuthenticatedRequest, res) => {
      logger.info("DEBUG SALES REPS API CALLED");

      try {
        const testResult = await db.execute(
          sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`
        );
        logger.debug({ count: testResult.rows }, "Sales reps count");

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

        logger.debug({ count: result.rows.length }, "Raw sales reps from DB");
        res.json({
          debug: true,
          count: testResult.rows[0],
          salesReps: result.rows,
        });
      } catch (error) {
        logger.error({ error: getErrorMessage(error) }, "ERROR in debug sales reps API");
        res.status(500).json({ error: getErrorMessage(error) });
      }
    }
  );

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

  /**
   * POST /api/commissions/sync-hubspot
   * Action: commissions.sync
   * Admin-triggered HubSpot commissions full sync
   */
  app.post(
    "/api/commissions/sync-hubspot",
    requireAuth,
    requirePermission("commissions.sync", "commission"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const results = await hubspotSync.performFullSync();
        res.json({
          message: "HubSpot commissions full sync completed",
          results,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error({ error }, "HubSpot commissions full sync failed");
        res.status(500).json({
          message: "HubSpot commissions full sync failed",
          error: getErrorMessage(error),
        });
      }
    }
  );

  /**
   * GET /api/_version
   * Action: diagnostics.view
   * Version and build information
   */
  app.get(
    "/api/_version",
    requireAuth,
    requirePermission("diagnostics.view", "system"),
    async (req: AuthenticatedRequest, res) => {
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
        logger.error({ error }, "Version endpoint error");
        res.status(500).json({
          message: "Failed to retrieve version information",
          error: getErrorMessage(error),
        });
      }
    }
  );

  /**
   * GET /api/_schema-health
   * Action: diagnostics.view
   * Schema health check for critical tables
   */
  app.get(
    "/api/_schema-health",
    requireAuth,
    requirePermission("diagnostics.view", "system"),
    async (req: AuthenticatedRequest, res) => {
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

          const authColumns = authColumnsResult.rows.map(
            (row: { column_name: string }) => row.column_name
          );
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
        logger.error({ error }, "Schema health check error");
        res.status(500).json({
          status: "error",
          message: "Failed to perform schema health check",
          error: getErrorMessage(error),
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * GET /api/_authz-check
   * Action: admin.debug
   * Authorization diagnostics endpoint (admin-only)
   */
  app.get(
    "/api/_authz-check",
    requireAuth,
    requirePermission("admin.debug", "system"),
    async (req: AuthenticatedRequest, res) => {
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
            legacyRole: (principal as Record<string, unknown>).role,
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
        logger.error({ error }, "Authorization check error");
        res.status(500).json({
          message: "Authorization check failed",
          error: getErrorMessage(error),
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * GET /api/_cerbos-explain
   * Action: admin.debug
   * Cerbos decision explanation endpoint (admin-only)
   */
  app.get(
    "/api/_cerbos-explain",
    requireAuth,
    requirePermission("admin.debug", "system"),
    async (req: AuthenticatedRequest, res) => {
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
        logger.error({ error }, "Cerbos explanation error");
        res.status(500).json({
          message: "Failed to get Cerbos decision explanation",
          error: getErrorMessage(error),
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Migration endpoint (development only)
  if (process.env.NODE_ENV === "development") {
    app.post("/api/_apply-migration", async (req: AuthenticatedRequest, res) => {
      try {
        logger.info("[Migration] Applying user table column migrations...");

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
          logger.info("[Migration] auth_user_id column migration completed");
        } catch (error) {
          results.push({
            migration: "add-auth-user-id-column",
            status: "error",
            error: (error as Error).message,
          });
          logger.info("[Migration] auth_user_id column migration skipped (likely already exists)");
        }

        // Apply last_login_at column migration
        try {
          const lastLoginSQL = fs.readFileSync(
            "server/db/migrations/add-last-login-column.sql",
            "utf8"
          );
          await db.execute(sql.raw(lastLoginSQL));
          results.push({ migration: "add-last-login-column", status: "success" });
          logger.info("[Migration] last_login_at column migration completed");
        } catch (error) {
          results.push({
            migration: "add-last-login-column",
            status: "error",
            error: (error as Error).message,
          });
          logger.info("[Migration] last_login_at column migration skipped (likely already exists)");
        }

        logger.info("[Migration] All user table migrations processed");

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          migrations: results,
          result: "User table migrations completed",
        });
      } catch (error) {
        logger.error({ error }, "[Migration] Migration failed");
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
    app.post("/api/_assign-role", async (req: AuthenticatedRequest, res) => {
      try {
        const { email, roleName } = req.body;

        if (!email || !roleName) {
          return res.status(400).json({ error: "Email and roleName are required" });
        }

        logger.info({ email, roleName }, "[Role Assignment] Assigning role to user");

        // Get user by email
        const user = await storage.getUserByEmail(email);
        // eslint-disable-next-line rbac/no-inline-auth-checks -- False positive: checking database user lookup, not req.user auth
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

        logger.info({ email, roleName }, "[Role Assignment] Successfully assigned role to user");

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          user: { id: user.id, email: user.email },
          role: { id: role.id, name: role.name },
          message: `Role "${roleName}" assigned to user "${email}"`,
        });
      } catch (error) {
        logger.error({ error }, "[Role Assignment] Assignment failed");
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
    app.post("/api/_rbac-seed", async (req: AuthenticatedRequest, res) => {
      try {
        logger.info("[RBAC Seed] Starting RBAC data seeding...");

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
        logger.error({ error }, "[RBAC Seed] Seeding failed");
        res.status(500).json({
          error: "RBAC seeding failed",
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  /**
   * GET /api/admin/rbac/users
   * Action: admin.rbac.read
   * Get all users with their roles
   */
  app.get(
    "/api/admin/rbac/users",
    requireAuth,
    requirePermission("admin.rbac.read", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const users = await storage.getAllUsers();
        const result = await Promise.all(
          users.map(async (u) => {
            const roles = await storage.getUserRoles(u.id);
            return {
              id: u.id,
              email: u.email,
              firstName: (u as Record<string, unknown>).firstName as string | undefined,
              lastName: (u as Record<string, unknown>).lastName as string | undefined,
              roles: roles.map((r) => ({ id: r.id, name: r.name })),
            };
          })
        );
        res.json({ users: result });
      } catch (error) {
        logger.error({ error }, "Error fetching users with roles");
        res.status(500).json({ error: "Failed to fetch users" });
      }
    }
  );

  /**
   * GET /api/admin/rbac/roles
   * Action: admin.rbac.read
   * Get all roles with their permissions
   */
  app.get(
    "/api/admin/rbac/roles",
    requireAuth,
    requirePermission("admin.rbac.read", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const roles = await storage.getAllRoles();
        const result = await Promise.all(
          roles.map(async (r) => {
            const perms = await storage.getRolePermissions(r.id);
            return {
              id: r.id,
              name: r.name,
              description: (r as Record<string, unknown>).description as string | undefined,
              permissions: perms.map((p) => ({
                id: p.id,
                key: p.key,
                category: (p as Record<string, unknown>).category as string | undefined,
              })),
            };
          })
        );
        res.json({ roles: result });
      } catch (error) {
        logger.error({ error }, "Error fetching roles");
        res.status(500).json({ error: "Failed to fetch roles" });
      }
    }
  );

  /**
   * GET /api/admin/rbac/permissions
   * Action: admin.rbac.read
   * Get all available permissions
   */
  app.get(
    "/api/admin/rbac/permissions",
    requireAuth,
    requirePermission("admin.rbac.read", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const permissions = await storage.getAllPermissions();
        res.json({ permissions });
      } catch (error) {
        logger.error({ error }, "Error fetching permissions");
        res.status(500).json({ error: "Failed to fetch permissions" });
      }
    }
  );

  /**
   * POST /api/admin/rbac/assign-role
   * Action: admin.rbac.write
   * Assign a role to a user
   */
  app.post(
    "/api/admin/rbac/assign-role",
    requireAuth,
    requirePermission("admin.rbac.write", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId, roleId } = req.body;
        await storage.assignRoleToUser(userId, roleId);
        res.json({ success: true, message: "Role assigned successfully" });
      } catch (error) {
        logger.error({ error }, "Error assigning role");
        res.status(500).json({ error: "Failed to assign role" });
      }
    }
  );

  /**
   * DELETE /api/admin/rbac/user/:userId/role/:roleId
   * Action: admin.rbac.write
   * Remove a role from a user
   */
  app.delete(
    "/api/admin/rbac/user/:userId/role/:roleId",
    requireAuth,
    requirePermission("admin.rbac.write", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId, roleId } = req.params;
        await storage.removeRoleFromUser(parseInt(userId || ""), parseInt(roleId || ""));
        res.json({ success: true, message: "Role removed successfully" });
      } catch (error) {
        logger.error({ error }, "Error removing role");
        res.status(500).json({ error: "Failed to remove role" });
      }
    }
  );

  /**
   * POST /api/admin/rbac/test-authz
   * Action: admin.debug
   * Test authorization for a user
   */
  app.post(
    "/api/admin/rbac/test-authz",
    requireAuth,
    requirePermission("admin.debug", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userEmail, action, resourceType, resourceId } = req.body;

        // Get user by email
        const user = await storage.getUserByEmail(userEmail);
        // eslint-disable-next-line rbac/no-inline-auth-checks -- False positive: checking database user lookup, not req.user auth
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Get user roles
        const userRoles = await storage.getUserRoles(user.id);

        // Create test principal
        const testPrincipal = {
          userId: user.id,
          email: user.email,
          // eslint-disable-next-line rbac/no-direct-role-checks -- Reading role from database to construct test principal, not for authorization
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
        logger.error({ error }, "Error testing authorization");
        res.status(500).json({ error: "Failed to test authorization" });
      }
    }
  );

  /**
   * GET /api/admin/cerbos/policy/:policyName
   * Action: admin.policy.read
   * Get a Cerbos policy file content
   */
  app.get(
    "/api/admin/cerbos/policy/:policyName",
    requireAuth,
    requirePermission("admin.policy.read", "system"),
    async (req: AuthenticatedRequest, res) => {
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
        logger.error({ error }, "Error reading policy");
        res.status(500).json({ error: "Failed to read policy" });
      }
    }
  );

  /**
   * GET /api/admin/cerbos/policies
   * Action: admin.policy.read
   * List all Cerbos policy files
   */
  app.get(
    "/api/admin/cerbos/policies",
    requireAuth,
    requirePermission("admin.policy.read", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const fs = await import("fs");
        const path = await import("path");

        const policiesPath = path.join(process.cwd(), "cerbos", "policies");
        const policyFiles = fs.readdirSync(policiesPath);

        const policies = policyFiles
          .filter((file) => file.endsWith(".yaml"))
          .map((file) => file.replace(".yaml", ""));

        res.json({ policies });
      } catch (error) {
        logger.error({ error }, "Error listing policies");
        res.status(500).json({ error: "Failed to list policies" });
      }
    }
  );

  /**
   * PUT /api/admin/cerbos/policy/:policyName
   * Action: admin.policy.write
   * Update a Cerbos policy file
   */
  app.put(
    "/api/admin/cerbos/policy/:policyName",
    requireAuth,
    requirePermission("admin.policy.write", "system"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { policyName } = req.params;
        const { content } = req.body;
        const fs = await import("fs");
        const path = await import("path");

        const policyPath = path.join(process.cwd(), "cerbos", "policies", `${policyName}.yaml`);

        // Write the policy file
        fs.writeFileSync(policyPath, content, "utf8");

        // TODO: Trigger Railway deployment or Cerbos reload
        logger.info({ policyName }, "[Policy] Updated policy");

        res.json({ success: true, message: "Policy updated successfully" });
      } catch (error) {
        logger.error({ error }, "Error updating policy");
        res.status(500).json({ error: "Failed to update policy" });
      }
    }
  );

  // RBAC Test endpoint (development only)
  if (process.env.NODE_ENV === "development") {
    app.get("/api/_rbac-test", async (req: AuthenticatedRequest, res) => {
      try {
        logger.info("[RBAC Test] Starting RBAC system test...");

        // Test 1: Check if RBAC tables exist
        const tableCheck = await db.execute(sql`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles')
          ORDER BY table_name;
        `);

        const existingTables = tableCheck.rows.map((row: { table_name: string }) => row.table_name);

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
        logger.error({ error }, "[RBAC Test] Test failed");
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
