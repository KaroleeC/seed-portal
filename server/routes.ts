import type { Express } from "express";
import { createServer, type Server } from "http";
import type Redis from "ioredis";
import { storage } from "./storage";
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
} from "@shared/schema";
import { z } from "zod";
import { sendSystemAlert } from "./slack";
import { hubSpotService } from "./hubspot";
import { doesHubSpotQuoteExist } from "./hubspot";
import { setupAuth, requireAuth } from "./auth";
import passport from "passport";
import { registerAdminRoutes } from "./admin-routes";
import { getHubspotMetrics } from "./metrics";
import { getModuleLogs } from "./logs-feed";
import { checkDatabaseHealth } from "./db";
import { initRedis, getRedis } from "./redis";
// HubSpotService class is no longer instantiated directly in routes; use singleton hubSpotService
import { registerHubspotRoutes } from "./hubspot-routes";
import quoteRoutes from "./quote-routes";
import { calculateCombinedFees, calculateQuotePricing } from "@shared/pricing";
import { buildServiceConfig } from "./services/hubspot/compose";
import { pricingConfigService } from "./pricing-config";
import type { PricingData } from "@shared/pricing";
import { clientIntelEngine } from "./client-intel";
import {
  apiRateLimit,
  searchRateLimit,
  enhancementRateLimit,
} from "./middleware/rate-limiter";
import { conditionalCsrf, provideCsrfToken } from "./middleware/csrf";
import multer from "multer";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import path from "path";
import { promises as fs } from "fs";
import express from "express";
import { cache, CacheTTL, CachePrefix } from "./cache";
import { db } from "./db";
import { sql } from "drizzle-orm";
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

// Helper function to generate 4-digit approval codes
function generateApprovalCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Centralized error message extractor for unknown errors
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Normalize arbitrary quote-like objects into PricingData (null -> undefined, coerce numbers)
function toPricingData(input: any): PricingData {
  const num = (v: any): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    monthlyRevenueRange: input?.monthlyRevenueRange || undefined,
    monthlyTransactions: input?.monthlyTransactions || undefined,
    industry: input?.industry || undefined,
    cleanupMonths: num(input?.cleanupMonths),
    cleanupComplexity: input?.cleanupComplexity || undefined,
    cleanupOverride: input?.cleanupOverride ?? undefined,
    overrideReason: input?.overrideReason ?? undefined,
    customSetupFee: input?.customSetupFee || undefined,
    serviceTier: input?.serviceTier || undefined,
    includesTaas: input?.includesTaas ?? undefined,
    numEntities: num(input?.numEntities ?? input?.customNumEntities),
    customNumEntities: num(input?.customNumEntities) ?? null,
    statesFiled: num(input?.statesFiled ?? input?.customStatesFiled),
    customStatesFiled: num(input?.customStatesFiled) ?? null,
    internationalFiling: input?.internationalFiling ?? undefined,
    numBusinessOwners: num(
      input?.numBusinessOwners ?? input?.customNumBusinessOwners,
    ),
    customNumBusinessOwners: num(input?.customNumBusinessOwners) ?? null,
    include1040s: input?.include1040s ?? undefined,
    priorYearsUnfiled: num(input?.priorYearsUnfiled),
    qboSubscription: input?.qboSubscription ?? null,
    entityType: input?.entityType || undefined,
    bookkeepingQuality: input?.bookkeepingQuality || undefined,
  };
}

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
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
      );
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
  if (
    stored.startsWith("$2a$") ||
    stored.startsWith("$2b$") ||
    stored.startsWith("$2y$")
  ) {
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

export async function registerRoutes(
  app: Express,
  sessionRedis?: Redis | null,
): Promise<Server> {
  // Session setup is now centralized and handled elsewhere

  // Setup authentication after sessions
  await setupAuth(app, null);

  // Apply CSRF protection after sessions are initialized - simplified
  app.use(conditionalCsrf);
  app.use(provideCsrfToken);

  // Minimal admin guard for routes defined in this module (mirrors admin-routes behavior)
  const requireAdminGuard = (req: any, res: any, next: any) => {
    // Hardcode primary admin email allowance, then role check
    if (
      req.user?.email === "jon@seedfinancial.io" ||
      req.user?.role === "admin"
    )
      return next();
    return res.status(403).json({ message: "Admin access required" });
  };

  // Apply rate limiting to all API routes
  app.use("/api", apiRateLimit);

  // Mount HubSpot domain routes (paths unchanged)
  registerHubspotRoutes(app);

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // CSRF token endpoint for SPAs
  app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
  });

  // =============================
  // Approval Request + Validation
  // =============================

  /**
   * POST /api/approval/request
   * Create an approval code for this contact email (used for cleanup override or duplicate quotes)
   * Body: { contactEmail: string, quoteData?: any }
   */
  app.post("/api/approval/request", requireAuth, async (req, res) => {
    try {
      const contactEmail = (req.body?.contactEmail || req.body?.email || "")
        .toString()
        .trim();
      if (!contactEmail) {
        return res
          .status(400)
          .json({ success: false, message: "contactEmail is required" });
      }

      // Generate and persist a 4‑digit approval code (expires in 30 minutes)
      const code = generateApprovalCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await storage.createApprovalCode({
        code,
        contactEmail,
        expiresAt,
      } as any);

      // Optional: notify admins in Slack
      try {
        await sendSystemAlert(
          "Approval code requested",
          `Contact: ${contactEmail}\nRequested by: ${req.user?.email}\nCode: ${code} (expires in 30m)`,
          "medium",
        );
      } catch (e) {
        console.warn(
          "[Approval] Slack notification failed:",
          (e as any)?.message,
        );
      }

      return res.json({ success: true, code });
    } catch (error) {
      console.error("[Approval] request error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to create approval code" });
    }
  });

  /**
   * Legacy alias used by client for duplicate quote flow
   * POST /api/approval-request
   */
  app.post("/api/approval-request", requireAuth, async (req, res) => {
    // Delegate to the canonical endpoint
    (req as any).body = {
      ...req.body,
      contactEmail: req.body?.email || req.body?.contactEmail,
    };
    // Call next handler directly by reusing the logic
    try {
      const contactEmail = (req.body?.contactEmail || "").toString().trim();
      if (!contactEmail) {
        return res
          .status(400)
          .json({ success: false, message: "contactEmail is required" });
      }
      const code = generateApprovalCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await storage.createApprovalCode({
        code,
        contactEmail,
        expiresAt,
      } as any);
      try {
        await sendSystemAlert(
          "Approval code requested (legacy)",
          `Contact: ${contactEmail}\nRequested by: ${req.user?.email}\nCode: ${code} (expires in 30m)`,
          "medium",
        );
      } catch {}
      return res.json({ success: true, code });
    } catch (error) {
      console.error("[Approval] legacy request error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to create approval code" });
    }
  });

  /**
   * POST /api/approval/validate
   * Validate a code without consuming it. Body: { code: string, contactEmail: string }
   */
  app.post("/api/approval/validate", requireAuth, async (req, res) => {
    try {
      const code = (req.body?.code || "").toString().trim();
      const contactEmail = (req.body?.contactEmail || req.body?.email || "")
        .toString()
        .trim();
      if (!code || !contactEmail) {
        return res
          .status(400)
          .json({
            valid: false,
            message: "code and contactEmail are required",
          });
      }

      const valid = await storage.validateApprovalCode(code, contactEmail);
      return res.json({
        valid,
        message: valid ? "OK" : "Invalid or expired approval code",
      });
    } catch (error) {
      console.error("[Approval] validate error:", error);
      return res
        .status(500)
        .json({ valid: false, message: "Validation failed" });
    }
  });

  // Public (authenticated) Calculator content endpoint for SOW templates and agreement links
  app.get("/api/calculator/content", requireAuth, async (req, res) => {
    try {
      const {
        DEFAULT_INCLUDED_FIELDS,
        DEFAULT_AGREEMENT_LINKS,
        DEFAULT_MSA_LINK,
        SERVICE_KEYS_DB,
        getDefaultSowTitle,
        getDefaultSowTemplate,
      } = await import("./calculator-defaults");

      const safeParse = (s?: string | null): any => {
        if (!s) return {};
        try {
          return JSON.parse(s);
        } catch {
          return {};
        }
      };
      const deepMerge = (base: any, override: any): any => {
        if (!override || typeof override !== "object") return base;
        const result: any = Array.isArray(base) ? [...base] : { ...base };
        for (const key of Object.keys(override)) {
          const o = override[key];
          if (o && typeof o === "object" && !Array.isArray(o)) {
            result[key] = deepMerge(base?.[key] || {}, o);
          } else {
            result[key] = o;
          }
        }
        return result;
      };
      const isBlank = (v: any) => typeof v === "string" && v.trim() === "";
      const norm = (v: any) =>
        v === undefined || v === null || isBlank(v) ? undefined : v;
      const asDbKey = (svc: string) =>
        svc as
          | "bookkeeping"
          | "taas"
          | "payroll"
          | "ap"
          | "ar"
          | "agent_of_service"
          | "cfo_advisory";

      const withDefaults = (existing: any | undefined, service: string) => {
        const included = JSON.stringify(
          deepMerge(
            DEFAULT_INCLUDED_FIELDS,
            safeParse(existing?.includedFieldsJson),
          ),
        );
        if (existing) {
          return {
            ...existing,
            sowTitle:
              norm(existing.sowTitle) ?? getDefaultSowTitle(service as any),
            sowTemplate:
              norm(existing.sowTemplate) ??
              getDefaultSowTemplate(service as any),
            agreementLink:
              norm(existing.agreementLink) ??
              DEFAULT_AGREEMENT_LINKS[asDbKey(service)] ??
              null,
            includedFieldsJson: included,
            createdAt: existing.createdAt
              ? new Date(existing.createdAt).toISOString()
              : undefined,
            updatedAt: existing.updatedAt
              ? new Date(existing.updatedAt).toISOString()
              : undefined,
          };
        }
        return {
          id: 0,
          service,
          sowTitle: getDefaultSowTitle(service as any),
          sowTemplate: getDefaultSowTemplate(service as any),
          agreementLink: DEFAULT_AGREEMENT_LINKS[asDbKey(service)] ?? null,
          includedFieldsJson: included,
          updatedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      };

      const service =
        typeof req.query.service === "string" ? req.query.service : undefined;
      if (service) {
        const item = await storage.getCalculatorServiceContent(service);
        const payload = {
          items: [withDefaults(item, service)],
          msaLink: DEFAULT_MSA_LINK,
        };
        const parsed = CalculatorContentResponseSchema.safeParse(payload);
        if (!parsed.success) {
          console.error(
            "[CalculatorContent] invalid payload",
            parsed.error.issues,
          );
          return res
            .status(500)
            .json({
              status: "error",
              message: "Invalid calculator content payload",
            });
        }
        return res.json(parsed.data);
      } else {
        const items = await storage.getAllCalculatorServiceContent();
        const map = new Map<string, any>(
          (items || []).map((i) => [i.service, i]),
        );
        const merged = SERVICE_KEYS_DB.map((svc) =>
          withDefaults(map.get(svc), svc),
        );
        const payload = { items: merged, msaLink: DEFAULT_MSA_LINK };
        const parsed = CalculatorContentResponseSchema.safeParse(payload);
        if (!parsed.success) {
          console.error(
            "[CalculatorContent] invalid payload",
            parsed.error.issues,
          );
          return res
            .status(500)
            .json({
              status: "error",
              message: "Invalid calculator content payload",
            });
        }
        res.json(parsed.data);
      }
    } catch (error) {
      console.error("[CalculatorContent] load failed", error);
      res.status(500).json({ message: "Failed to load calculator content" });
    }
  });

  // Public (authenticated) pricing configuration endpoint for Calculator and other UIs
  app.get("/api/pricing/config", requireAuth, async (req, res) => {
    try {
      const config = await pricingConfigService.loadPricingConfig();
      const parsed = PricingConfigSchema.safeParse(config);
      if (!parsed.success) {
        console.error("[PricingConfig] validation failed", parsed.error.issues);
        return res
          .status(500)
          .json({ status: "error", message: "Invalid pricing configuration" });
      }
      res.json(parsed.data);
    } catch (error) {
      console.error("[PricingConfig] load failed", error);
      // Provide fallback config to keep Calculator usable
      const fallback = await pricingConfigService.loadPricingConfig();
      const parsed = PricingConfigSchema.safeParse(fallback);
      if (!parsed.success) {
        return res
          .status(500)
          .json({
            status: "error",
            message: "Failed to load pricing configuration",
          });
      }
      res.json(parsed.data);
    }
  });

  // App namespace aliases for SeedQC (Calculator)
  app.get("/api/apps/seedqc/content", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/calculator/content${q}`);
  });

  app.get("/api/apps/seedqc/pricing/config", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/pricing/config${q}`);
  });

  // Admin aliases
  app.get(
    "/api/admin/apps/seedqc/content",
    requireAuth,
    requireAdminGuard,
    (req, res) => {
      res.redirect(307, "/api/admin/calculator/content");
    },
  );

  app.get(
    "/api/admin/apps/seedqc/content/:service",
    requireAuth,
    requireAdminGuard,
    (req, res) => {
      res.redirect(
        307,
        `/api/admin/calculator/content/${encodeURIComponent(req.params.service)}`,
      );
    },
  );

  // Support PUT updates via app namespace
  app.put(
    "/api/admin/apps/seedqc/content/:service",
    requireAuth,
    requireAdminGuard,
    (req, res) => {
      res.redirect(
        307,
        `/api/admin/calculator/content/${encodeURIComponent(req.params.service)}`,
      );
    },
  );

  // Deals API (canonical for SeedPay aliases) — validates response against shared contract
  app.get("/api/deals", requireAuth, async (req, res) => {
    try {
      const ids =
        typeof req.query.ids === "string" && req.query.ids.trim().length
          ? req.query.ids
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
      const ownerId =
        typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
      const limit =
        typeof req.query.limit === "string"
          ? parseInt(req.query.limit, 10)
          : undefined;

      const deals = await dealsService.getDeals({ ids, ownerId, limit });
      const parsed = DealsResultSchema.safeParse(deals);
      if (!parsed.success) {
        console.error("Invalid DealsResult payload:", parsed.error.issues);
        return res
          .status(500)
          .json({ status: "error", message: "Invalid deals payload" });
      }
      return res.json(parsed.data);
    } catch (error) {
      console.error("Failed to fetch deals:", error);
      return res
        .status(500)
        .json({
          status: "error",
          message: getErrorMessage(error) || "Failed to fetch deals",
        });
    }
  });

  app.get("/api/deals/by-owner", requireAuth, async (req, res) => {
    try {
      const ownerId =
        typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
      const limit =
        typeof req.query.limit === "string"
          ? parseInt(req.query.limit, 10)
          : undefined;
      if (!ownerId) {
        return res
          .status(400)
          .json({ status: "error", message: "ownerId is required" });
      }
      const deals = await dealsService.getDeals({ ownerId, limit });
      const parsed = DealsResultSchema.safeParse(deals);
      if (!parsed.success) {
        console.error("Invalid DealsResult payload:", parsed.error.issues);
        return res
          .status(500)
          .json({ status: "error", message: "Invalid deals payload" });
      }
      return res.json(parsed.data);
    } catch (error) {
      console.error("Failed to fetch deals by owner:", error);
      return res
        .status(500)
        .json({
          status: "error",
          message: getErrorMessage(error) || "Failed to fetch deals by owner",
        });
    }
  });

  // App namespace aliases for SeedPay (Commission Tracker)
  app.get("/api/apps/seedpay/deals", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/deals${q}`);
  });

  app.get("/api/apps/seedpay/deals/by-owner", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/deals/by-owner${q}`);
  });

  // Current user's sales rep profile (app namespace)
  app.get("/api/apps/seedpay/sales-reps/me", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/sales-reps/me${q}`);
  });

  app.get("/api/apps/seedpay/commissions", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/commissions${q}`);
  });

  app.get(
    "/api/apps/seedpay/commissions/current-period-summary",
    requireAuth,
    (req, res) => {
      const q = req.originalUrl.includes("?")
        ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
        : "";
      res.redirect(307, `/api/commissions/current-period-summary${q}`);
    },
  );

  app.get("/api/apps/seedpay/monthly-bonuses", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/monthly-bonuses${q}`);
  });

  app.get("/api/apps/seedpay/milestone-bonuses", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/milestone-bonuses${q}`);
  });

  // =============================
  // AI Assistant Endpoints (Option B)
  // =============================
  const aiService = new AIService();
  const getPersona = (user: any): "sales" | "service" | "admin" => {
    const pref = String(user?.defaultDashboard || "").toLowerCase();
    if (pref.includes("admin")) return "admin";
    if (pref.includes("service")) return "service";
    if (pref.includes("sales")) return "sales";
    // fallback by role
    return user?.role === "admin" ? "admin" : "sales";
  };

  // List Box items under CLIENTS subtree
  app.get("/api/ai/box/list", requireAuth, async (req, res) => {
    try {
      const rootId = process.env.BOX_CLIENT_FOLDERS_PARENT_ID || "0";
      const folderId =
        typeof req.query.folderId === "string" &&
        req.query.folderId.trim().length
          ? req.query.folderId
          : rootId;
      // Enforce subtree
      const ok =
        String(folderId) === String(rootId) ||
        (await boxService.isUnderClientsRoot(folderId, "folder"));
      if (!ok)
        return res
          .status(403)
          .json({ message: "Folder not within CLIENTS root" });
      const items = await boxService.listFolderItems(folderId);
      return res.json({ folderId, items });
    } catch (error) {
      console.error("[AI/Box] list failed", error);
      return res.status(500).json({ message: "Failed to list Box items" });
    }
  });

  // Resolve attachments (validate and expand folders to files)
  app.post("/api/ai/box/resolve", requireAuth, async (req, res) => {
    try {
      const persona = getPersona(req.user);
      if (persona === "sales")
        return res
          .status(403)
          .json({ message: "Box access not permitted for sales persona" });
      const rootId = process.env.BOX_CLIENT_FOLDERS_PARENT_ID || "0";
      const raw = Array.isArray(req.body?.attachments)
        ? req.body.attachments
        : [];
      const files: any[] = [];

      for (const a of raw) {
        const type = a?.type === "box_folder" ? "folder" : "file";
        const id = String(a?.id || "");
        if (!id) continue;
        const ok = await boxService.isUnderClientsRoot(id, type);
        if (!ok) continue;
        if (type === "file") {
          const info = await boxService.getFileInfo(id);
          if (info)
            files.push({
              id: info.id,
              name: info.name,
              size: info.size,
              type: "file",
            });
        } else {
          const items = await boxService.listFolderItems(id);
          for (const it of items) {
            if (it.type === "file")
              files.push({
                id: it.id,
                name: it.name,
                size: it.size,
                type: "file",
              });
          }
        }
      }
      return res.json({ files });
    } catch (error) {
      console.error("[AI/Box] resolve failed", error);
      return res.status(500).json({ message: "Failed to resolve attachments" });
    }
  });

  // Main AI query endpoint (non-streaming with document extraction)
  app.post("/api/ai/query", requireAuth, async (req, res) => {
    try {
      const persona = getPersona(req.user);
      const mode: "sell" | "support" =
        req.body?.mode === "support" ? "support" : "sell";
      const question = (req.body?.question || "").toString().trim();
      const attachments = Array.isArray(req.body?.attachments)
        ? req.body.attachments
        : [];
      if (!question)
        return res.status(400).json({ message: "question is required" });

      if (attachments.length > 0 && persona === "sales") {
        return res
          .status(403)
          .json({
            message: "Box attachments are not permitted for sales persona",
          });
      }

      // Validate and enforce subtree, then extract text from Box attachments
      let fileNames: string[] = [];
      let combinedText = "";
      if (
        attachments.length > 0 &&
        (persona === "service" || persona === "admin")
      ) {
        const valid: Array<{ type: "box_file" | "box_folder"; id: string }> =
          [];
        for (const a of attachments) {
          const type = a?.type === "box_folder" ? "folder" : "file";
          const id = String(a?.id || "");
          if (!id) continue;
          const ok = await boxService.isUnderClientsRoot(id, type as any);
          if (!ok) continue;
          valid.push({ type: type === "file" ? "box_file" : "box_folder", id });
        }
        if (valid.length) {
          const extracted = await extractTextFromBoxAttachments(valid);
          combinedText = extracted.combinedText || "";
          fileNames = extracted.citations || [];
        }
      }

      // Build prompt per mode
      const systemSell = `You are Seed Assistant (Sell Mode). Be concise, persuasive, and client-safe. Use bullets and a one-sentence summary. Never fabricate data and avoid quoting documents verbatim.`;
      const systemSupport = `You are Seed Assistant (Support Mode). Provide detailed, structured, and technically accurate guidance with assumptions, edge cases, and a final client-ready paragraph. Use citations when document sources are provided by name. Never quote documents verbatim.`;

      const sys = mode === "support" ? systemSupport : systemSell;
      const sourceNote = fileNames.length
        ? `\n\nCite sources by name when used:\n- ${fileNames.slice(0, 20).join("\n- ")}`
        : "";
      const kb = combinedText ? `\n\nKnowledge Base:\n${combinedText}` : "";
      const fullPrompt = `${sys}\n\nUser question:\n${question}${sourceNote}${kb}`;

      const model = mode === "support" ? "gpt-4o" : "gpt-4o-mini";
      const answer = await aiService.generateContent(fullPrompt, {
        model,
        maxTokens: 1200,
        temperature: 0.4,
      });
      return res.json({
        answer,
        citations: fileNames.map((n) => ({ name: n })),
      });
    } catch (error: any) {
      console.error("[AI] query failed", error);
      return res
        .status(500)
        .json({
          message: "AI query failed",
          error: error?.message || "unknown",
        });
    }
  });

  // Streaming AI query endpoint (SSE) with document extraction
  app.post("/api/ai/query/stream", requireAuth, async (req, res) => {
    try {
      const persona = getPersona(req.user);
      const mode: "sell" | "support" =
        req.body?.mode === "support" ? "support" : "sell";
      const question = (req.body?.question || "").toString().trim();
      const attachments = Array.isArray(req.body?.attachments)
        ? req.body.attachments
        : [];
      if (!question) {
        res.status(400);
        return res.end();
      }

      if (attachments.length > 0 && persona === "sales") {
        res.status(403);
        return res.end();
      }

      // Prepare extraction
      let fileNames: string[] = [];
      let combinedText = "";
      if (
        attachments.length > 0 &&
        (persona === "service" || persona === "admin")
      ) {
        const valid: Array<{ type: "box_file" | "box_folder"; id: string }> =
          [];
        for (const a of attachments) {
          const type = a?.type === "box_folder" ? "folder" : "file";
          const id = String(a?.id || "");
          if (!id) continue;
          const ok = await boxService.isUnderClientsRoot(id, type as any);
          if (!ok) continue;
          valid.push({ type: type === "file" ? "box_file" : "box_folder", id });
        }
        if (valid.length) {
          const extracted = await extractTextFromBoxAttachments(valid);
          combinedText = extracted.combinedText || "";
          fileNames = extracted.citations || [];
        }
      }

      // Build prompt
      const systemSell = `You are Seed Assistant (Sell Mode). Be concise, persuasive, and client-safe. Use bullets and a one-sentence summary. Never fabricate data and avoid quoting documents verbatim.`;
      const systemSupport = `You are Seed Assistant (Support Mode). Provide detailed, structured, and technically accurate guidance with assumptions, edge cases, and a final client-ready paragraph. Use citations when document sources are provided by name. Never quote documents verbatim.`;
      const sys = mode === "support" ? systemSupport : systemSell;
      const sourceNote = fileNames.length
        ? `\n\nCite sources by name when used:\n- ${fileNames.slice(0, 20).join("\n- ")}`
        : "";
      const kb = combinedText ? `\n\nKnowledge Base:\n${combinedText}` : "";
      const fullPrompt = `${sys}\n\nUser question:\n${question}${sourceNote}${kb}`;
      const model = mode === "support" ? "gpt-4o" : "gpt-4o-mini";

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      (res as any).flushHeaders?.();

      const write = (obj: any) => {
        try {
          res.write(`data: ${JSON.stringify(obj)}\n\n`);
        } catch {}
      };

      // Send metadata first (citations)
      const citationsPayload = fileNames.map((n) => ({ name: n }));
      write({ meta: { citations: citationsPayload } });

      await aiService.streamChat(fullPrompt, {
        model,
        maxTokens: 1200,
        temperature: 0.4,
        onDelta: (delta: string) => write({ delta }),
      });

      // Done
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      try {
        res.end();
      } catch {}
    }
  });

  // Admin cache clear for SeedPay (app namespace) -> clears deals cache
  app.post(
    "/api/admin/apps/seedpay/cache/clear",
    requireAuth,
    requireAdminGuard,
    (req, res) => {
      const q = req.originalUrl.includes("?")
        ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
        : "";
      res.redirect(307, `/api/deals/cache/invalidate${q}`);
    },
  );

  // =============================
  // Admin Diagnostics + Metrics + Logs
  // =============================
  app.get("/api/admin/metrics/hubspot", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const metrics = await getHubspotMetrics();
      res.json(metrics);
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Failed to fetch metrics",
          error: getErrorMessage(error),
        });
    }
  });

  app.get("/api/admin/logs", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const moduleName =
        typeof req.query.module === "string" ? req.query.module : "hubspot";
      const limit =
        typeof req.query.limit === "string"
          ? parseInt(req.query.limit, 10)
          : 100;
      const logs = await getModuleLogs(
        moduleName,
        Number.isFinite(limit) ? limit : 100,
      );
      res.json({ module: moduleName, logs });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Failed to fetch logs",
          error: getErrorMessage(error),
        });
    }
  });

  app.post(
    "/api/admin/diagnostics/hubspot/smoke",
    requireAuth,
    async (req, res) => {
      try {
        if (req.user?.role !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }
        const includeConnectivity = Boolean(req.body?.includeConnectivity);

        const checks: any[] = [];
        const failures: string[] = [];
        const detail: Record<string, any> = {};

        // DB check
        const dbOk = await checkDatabaseHealth();
        checks.push({
          key: "database",
          label: "Database connectivity",
          ok: dbOk,
        });
        if (!dbOk) failures.push("Database connectivity");

        // Redis check (optional if not configured)
        await initRedis();
        const redis = getRedis();
        if (redis) {
          try {
            await Promise.all([
              redis.sessionRedis.ping(),
              redis.cacheRedis.ping(),
            ]);
            checks.push({
              key: "redis",
              label: "Redis connectivity",
              ok: true,
            });
          } catch (e) {
            checks.push({
              key: "redis",
              label: "Redis connectivity",
              ok: false,
              error: (e as any)?.message,
            });
            failures.push("Redis connectivity");
          }
        } else {
          checks.push({
            key: "redis",
            label: "Redis configured",
            ok: false,
            note: "REDIS_URL not set",
          });
        }

        // HubSpot token present
        const tokenPresent = Boolean(process.env.HUBSPOT_ACCESS_TOKEN);
        checks.push({
          key: "hubspotToken",
          label: "HubSpot token present",
          ok: tokenPresent,
        });
        if (!tokenPresent) failures.push("HubSpot token");

        // HubSpot connectivity + product verification (optional)
        if (includeConnectivity && tokenPresent) {
          try {
            const svc = hubSpotService;
            if (!svc) throw new Error("HubSpot integration not configured");
            // Light endpoints to avoid side effects
            const pipelines = await svc.getPipelines();
            const products = await svc.getProductsCached();
            const verify = await (svc as any).verifyAndGetProductIds?.();
            detail.hubspot = {
              pipelinesOk: Boolean(pipelines),
              productsCount: Array.isArray(products) ? products.length : 0,
              productIdsValid: verify?.valid ?? undefined,
              productIdsChecked: verify ? ["bookkeeping", "cleanup"] : [],
            };
            checks.push({
              key: "hubspotConnectivity",
              label: "HubSpot connectivity",
              ok: true,
            });
            if (verify && verify.valid !== true) {
              checks.push({
                key: "hubspotProducts",
                label: "HubSpot products verified",
                ok: false,
              });
              failures.push("HubSpot product IDs");
            } else if (verify) {
              checks.push({
                key: "hubspotProducts",
                label: "HubSpot products verified",
                ok: true,
              });
            }
          } catch (e: any) {
            checks.push({
              key: "hubspotConnectivity",
              label: "HubSpot connectivity",
              ok: false,
              error: e?.message,
            });
            failures.push("HubSpot connectivity");
          }
        }

        const allOk = checks.every((c) => c.ok !== false);
        const disclaimer =
          "Smoke Test performs non-destructive checks. Connectivity option calls safe HubSpot read APIs only. No data is created or modified.";
        res.json({ success: allOk, checks, failures, detail, disclaimer });
      } catch (error) {
        res
          .status(500)
          .json({
            message: "Diagnostics failed",
            error: getErrorMessage(error),
          });
      }
    },
  );

  app.post("/api/admin/actions/hubspot/sync", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { quoteId, action, dryRun, includeConnectivity } = req.body || {};
      if (!quoteId) {
        return res.status(400).json({ message: "quoteId is required" });
      }
      const idNum =
        typeof quoteId === "string" ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum)) {
        return res.status(400).json({ message: "Invalid quoteId" });
      }
      const result = await syncQuoteToHubSpot(
        idNum,
        action || "auto",
        req.user!.email,
        undefined,
        undefined,
        {
          dryRun: Boolean(dryRun),
          includeConnectivity: Boolean(includeConnectivity),
        },
      );
      res.json(result);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Sync action failed", error: getErrorMessage(error) });
    }
  });

  // Moved to hubspot-routes.ts: /api/hubspot/diagnostics/create (GET)

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log("[Login] Request details:", {
      body: { email: req.body?.email, hasPassword: !!req.body?.password },
      headers: {
        origin: req.headers.origin,
        host: req.headers.host,
        userAgent: req.headers["user-agent"]?.substring(0, 50) + "...",
        cookies: !!req.headers.cookie,
        cookieCount: req.headers.cookie
          ? req.headers.cookie.split(";").length
          : 0,
      },
      session: {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        sessionKeys: req.session ? Object.keys(req.session) : [],
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        replitDeployment: process.env.REPLIT_DEPLOYMENT,
        isProduction:
          process.env.NODE_ENV === "production" ||
          process.env.REPLIT_DEPLOYMENT === "1",
      },
      database: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasRedisUrl: !!process.env.REDIS_URL,
        hasSessionSecret: !!process.env.SESSION_SECRET,
      },
    });

    // Use passport.authenticate() instead of manual authentication
    passport.authenticate("local", (err: any, user: any, info: any) => {
      console.log("[Login] 🔑 Passport authentication callback:", {
        hasError: !!err,
        errorMessage: err?.message,
        hasUser: !!user,
        userEmail: user?.email,
        userId: user?.id,
        userRole: user?.role,
        info: info,
        timestamp: new Date().toISOString(),
      });

      if (err) {
        console.error("[Login] ❌ Passport authentication error details:", {
          message: err.message,
          stack: err.stack?.split("\n").slice(0, 3),
          name: err.name,
        });
        return res.status(500).json({ message: "Authentication error" });
      }

      if (!user) {
        console.log("[Login] ❌ Authentication failed - no user returned:", {
          providedEmail: req.body?.email,
          hasPassword: !!req.body?.password,
          info: info,
        });
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // CRITICAL: Use req.login() to properly serialize user into session
      console.log("[Login] 🔑 Calling req.login() for user:", user.email);
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("[Login] ❌ req.login() failed:", loginErr);
          return res
            .status(500)
            .json({ message: "Login session creation failed" });
        }

        console.log(
          "[Login] 🔑 ✅ req.login() successful - user should be serialized now",
        );
        console.log("[Login] Session state after login:", {
          sessionId: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          passport: (req.session as any).passport,
          userInReq: req.user ? req.user.email : "NONE",
        });

        // Force session save and respond after save completes
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[Login] ❌ Session save error:", saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }

          console.log("[Login] 🔑 ✅ Session saved successfully");
          console.log("[Login] Post-save session verification:", {
            passport: (req.session as any).passport,
            user: req.user ? req.user.email : "NONE",
            sessionId: req.sessionID,
            isAuthenticated: req.isAuthenticated(),
          });

          console.log("[Login] Authentication successful for:", user.email);
          // Don't return the password hash
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("[Logout] Error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("[Logout] Session destroy error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }

        res.clearCookie("oseed.sid"); // Clear the custom session cookie
        res.clearCookie("connect.sid"); // Clear default session cookie as backup
        console.log("[Logout] User logged out successfully");
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // ENHANCED Get user endpoint with production debugging
  app.get("/api/user", (req, res) => {
    console.log("[GetUser] 👤 ===== USER ENDPOINT DEBUG START =====");
    console.log("[GetUser] 👤 Request context:", {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      isAuthenticated: req.isAuthenticated
        ? req.isAuthenticated()
        : "NO_METHOD",
      hasReqUser: !!req.user,
      reqUserEmail: req.user?.email,
      sessionPassport: (req.session as any)?.passport,
      manualSessionUser: !!(req.session as any)?.user,
      headers: {
        origin: req.headers.origin || "NO_ORIGIN",
        host: req.headers.host,
        cookies: !!req.headers.cookie,
        userAgent: req.headers["user-agent"]?.substring(0, 30) + "...",
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        replitDeployment: process.env.REPLIT_DEPLOYMENT,
        isProduction:
          process.env.NODE_ENV === "production" ||
          process.env.REPLIT_DEPLOYMENT === "1",
      },
    });

    // Check both passport and manual session
    const user = req.user || (req.session as any)?.user;
    console.log("[GetUser] 👤 User resolution:", {
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      userRole: user?.role,
      fromReqUser: !!req.user,
      fromManualSession: !!(req.session as any)?.user,
    });

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      // Add impersonation status from session
      const isImpersonating = !!(req.session as any)?.isImpersonating;
      const originalUser = (req.session as any)?.originalUser;
      const userData = {
        ...userWithoutPassword,
        isImpersonating,
        originalUser,
      };

      res.json(userData);
    } else {
      console.log("❌ User not authenticated, returning 401");
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Dev-only endpoint to reset a user's password (useful to fix historical double-hash records)
  app.post("/api/dev/reset-user-password", async (req, res) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { email, newPassword } = req.body || {};
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.default.hash(
        newPassword || "SeedAdmin1!",
        12,
      );
      await storage.updateUserPassword(user.id, hashed);
      res.json({ ok: true });
    } catch (error) {
      console.error("[DevResetPassword] Error:", getErrorMessage(error));
      res
        .status(500)
        .json({ message: "Reset failed", error: getErrorMessage(error) });
    }
  });

  // Simple user creation endpoint for initial setup - CSRF exempt for testing
  app.post(
    "/api/create-user",
    (req, res, next) => {
      req.csrfToken = () => "skip"; // Skip CSRF for this endpoint
      next();
    },
    async (req, res) => {
      try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password) {
          return res
            .status(400)
            .json({ message: "Email and password are required" });
        }

        if (!email.endsWith("@seedfinancial.io")) {
          return res
            .status(403)
            .json({ message: "Access restricted to @seedfinancial.io domain" });
        }

        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({ message: "User already exists" });
        }

        // Create user with hashed password
        const user = await storage.createUser({
          email,
          password,
          firstName: firstName || "",
          lastName: lastName || "",
          role: "employee",
        } as any);

        // Don't return the password hash
        const { password: _, ...userWithoutPassword } = user;

        console.log("[CreateUser] User created successfully:", user.email);
        res.json(userWithoutPassword);
      } catch (error: unknown) {
        console.error("[CreateUser] Error:", getErrorMessage(error));
        res.status(500).json({ message: "Failed to create user" });
      }
    },
  );

  // ... (rest of the code remains the same)

  // Admin-only cache invalidation for deals cache (speeds iteration)
  app.post("/api/deals/cache/invalidate", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const redisConns = getRedis();
      const cacheRedis = (redisConns as any)?.cacheRedis;
      if (!cacheRedis) {
        return res.status(503).json({ message: "Cache not available" });
      }

      // Find keys matching the deals cache prefix (respect keyPrefix semantics)
      const pattern = `${CachePrefix.HUBSPOT_DEALS_LIST}*`;
      const keys = await cache.keys(pattern);
      const keyPrefix: string = cacheRedis?.options?.keyPrefix || "";
      const dePrefixed = (keys || []).map((k: string) =>
        keyPrefix && k.startsWith(keyPrefix) ? k.slice(keyPrefix.length) : k,
      );

      let deleted = 0;
      if (dePrefixed.length > 0) {
        await cacheRedis.del(...dePrefixed); // Fix: Use del() instead of delAsync()
        deleted = dePrefixed.length;
      }

      res.json({ success: true, deleted, pattern });
    } catch (error) {
      console.error("Failed to invalidate deals cache:", error);
      res
        .status(500)
        .json({
          message: "Failed to invalidate deals cache",
          error: getErrorMessage(error),
        });
    }
  });

  // Test endpoint to check global variables
  app.get("/api/test/globals", (req, res) => {
    console.log("[GlobalTest] Checking global variables...");
    console.log(
      "[GlobalTest] sessionStoreType:",
      (global as any).sessionStoreType,
    );
    console.log(
      "[GlobalTest] sessionStore exists:",
      !!(global as any).sessionStore,
    );

    res.json({
      globalStoreType: (global as any).sessionStoreType || "NOT SET",
      globalStoreExists: !!(global as any).sessionStore,
      sessionStoreFromReq:
        (req.session as any)?.store?.constructor?.name || "NOT DETECTED",
      timestamp: new Date().toISOString(),
    });
  });

  // Cookie verification endpoint for Step 2 debugging
  app.get("/api/test/cookie-verification", (req, res) => {
    console.log("[CookieTest] Testing cookie transmission...");
    console.log("[CookieTest] Incoming cookies:", req.headers.cookie || "NONE");
    console.log("[CookieTest] Session ID:", req.sessionID);
    console.log("[CookieTest] Session exists:", !!req.session);

    // Set a test cookie explicitly
    res.cookie("test-cookie", "cookie-works", {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.REPLIT_DEPLOYMENT === "1",
      sameSite: "lax",
      maxAge: 60000, // 1 minute
    });

    // Set a test value in session
    if (req.session) {
      (req.session as any).testValue = "session-persistence-test";
    }

    const result = {
      message: "Cookie test performed",
      incomingCookies: req.headers.cookie || "NONE",
      sessionId: req.sessionID,
      hasSession: !!req.session,
      testCookieSet: true,
      sessionTestValue: (req.session as any)?.testValue || "NOT SET",
      isProduction:
        process.env.NODE_ENV === "production" ||
        process.env.REPLIT_DEPLOYMENT === "1",
      cookieSecure:
        process.env.NODE_ENV === "production" ||
        process.env.REPLIT_DEPLOYMENT === "1",
      timestamp: new Date().toISOString(),
    };

    console.log("[CookieTest] Response data:", result);
    res.json(result);
  });

  // PRODUCTION DEBUG ENDPOINT - Critical for debugging auth issues
  app.get("/api/production-debug", async (req, res) => {
    console.log("[ProductionDebug] 🔍 COMPREHENSIVE PRODUCTION DEBUG REQUEST");

    // Production detection logic
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.REPLIT_DEPLOYMENT === "1" ||
      (process.env.REPL_ID && !process.env.REPL_SLUG?.includes("workspace"));

    // Test database connectivity
    let dbHealth = "UNKNOWN";
    try {
      const testUser = await storage.getUserByEmail("test@test.com"); // Safe test that won't modify data
      dbHealth = "CONNECTED";
    } catch (error: unknown) {
      dbHealth = `ERROR: ${getErrorMessage(error)}`;
    }

    // Test Redis connectivity if available
    let redisHealth = "NOT CONFIGURED";
    if (process.env.REDIS_URL) {
      try {
        // Use import instead of require for bundled production
        const Redis = (await import("ioredis")).default;
        const testRedis = new Redis(process.env.REDIS_URL);
        await testRedis.ping();
        redisHealth = "CONNECTED";
        testRedis.disconnect();
      } catch (error: unknown) {
        redisHealth = `ERROR: ${getErrorMessage(error)}`;
      }
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      criticalEnvironment: {
        nodeEnv: process.env.NODE_ENV || "NOT_SET",
        replitDeployment: process.env.REPLIT_DEPLOYMENT || "NOT_SET",
        replId: process.env.REPL_ID ? "EXISTS" : "NOT_SET",
        replSlug: process.env.REPL_SLUG || "NOT_SET",
        isProduction,
        port: process.env.PORT || "NOT_SET",
      },
      authentication: {
        sessionSecret: !!process.env.SESSION_SECRET,
        sessionSecretLength: process.env.SESSION_SECRET
          ? process.env.SESSION_SECRET.length
          : 0,
        hasCurrentSession: !!req.session,
        sessionId: req.sessionID || "NO_SESSION",
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        currentUser: req.user?.email || "NOT_AUTHENTICATED",
        sessionKeys: req.session ? Object.keys(req.session) : [],
        passportInSession: !!(req.session as any)?.passport,
      },
      storage: {
        databaseUrl: !!process.env.DATABASE_URL,
        databaseHealth: dbHealth,
        redisUrl: !!process.env.REDIS_URL,
        redisHealth,
        sessionStore: req.sessionStore?.constructor?.name || "UNKNOWN",
      },
      cookieConfig: {
        secure: isProduction,
        sameSite: "lax",
        httpOnly: true,
        maxAge: "24h",
      },
      requestContext: {
        origin: req.headers.origin || "NO_ORIGIN",
        host: req.headers.host,
        userAgent: req.headers["user-agent"]?.substring(0, 50) + "...",
        cookies: !!req.headers.cookie,
        cookieCount: req.headers.cookie
          ? req.headers.cookie.split(";").length
          : 0,
      },
    };

    console.log(
      "[ProductionDebug] 🔍 Complete debug info:",
      JSON.stringify(debugInfo, null, 2),
    );
    res.json(debugInfo);
  });

  // Redis session status endpoint (using shared Redis connections)
  app.get("/api/admin/redis-session-status", async (req, res) => {
    console.log("[RedisStatus] Checking Redis session status...");

    if (!process.env.REDIS_URL) {
      return res.json({
        status: "no-redis-url",
        message: "REDIS_URL not configured - using fallback session store",
      });
    }

    try {
      // Use shared Redis connection with async initialization
      const { getRedisAsync } = await import("./redis");
      const connections = await getRedisAsync();

      if (!connections?.sessionRedis) {
        return res.json({
          status: "redis-not-initialized",
          message: "Redis connections failed to initialize",
        });
      }

      await connections.sessionRedis.ping();

      res.json({
        status: "redis-available",
        message: "Redis connection successful - sessions using Redis store",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[RedisStatus] Error:", getErrorMessage(error));
      res.json({
        status: "redis-failed",
        message: "Redis connection failed - using fallback session store",
        error: getErrorMessage(error),
      });
    }
  });

  // Test Redis sessions directly (using shared connections)
  app.get("/api/test/redis-session", async (req, res) => {
    try {
      console.log("[TestRedis] Testing direct Redis session...");

      if (!process.env.REDIS_URL) {
        return res.json({ error: "REDIS_URL not set" });
      }

      // Use shared Redis connection with async initialization
      const { getRedisAsync } = await import("./redis");
      const connections = await getRedisAsync();

      if (!connections?.sessionRedis) {
        return res.json({ error: "Redis connections failed to initialize" });
      }

      await connections.sessionRedis.ping();
      console.log("[TestRedis] Redis ping successful using shared connection");

      const RedisStore = (await import("connect-redis")).default;

      // Create a Redis session store using existing connection
      const derivedPrefix =
        process.env.REDIS_KEY_PREFIX ??
        (process.env.NODE_ENV === "development" ? "oseed:dev:" : "");
      const store = new RedisStore({
        client: connections.sessionRedis,
        prefix: `${derivedPrefix}sess:`, // Use derived prefix
        ttl: 24 * 60 * 60, // 24 hours like production
      });

      console.log("[TestRedis] RedisStore created:", store.constructor.name);

      // Test session store functionality
      console.log("[TestRedis] Testing Redis session store functionality...");

      // Test storing a session
      const sessionId = "test-session-123";
      const sessionData = {
        userId: 1,
        username: "test",
        timestamp: Date.now(),
      };

      await new Promise((resolve, reject) => {
        store.set(sessionId, sessionData as any, (err: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      console.log("[TestRedis] Session stored successfully");

      // Test retrieving the session
      const retrievedData = await new Promise((resolve, reject) => {
        store.get(sessionId, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      console.log("[TestRedis] Session retrieved:", retrievedData);

      // No need to quit() - using shared connection

      res.json({
        success: true,
        storeType: store.constructor.name,
        sessionData: retrievedData,
      });
    } catch (error) {
      console.error("[TestRedis] Error:", getErrorMessage(error));
      res.json({ error: getErrorMessage(error) });
    }
  });

  // Comprehensive session diagnostic endpoint
  app.get("/api/debug/session-comprehensive", async (req, res) => {
    console.log("[SessionDiag] Comprehensive session diagnostic running...");

    // Check if we can use shared Redis connections
    let manualRedisTest = "Not tested";
    if (process.env.REDIS_URL) {
      try {
        console.log("[SessionDiag] Testing shared Redis connection...");
        const { getRedisAsync } = await import("./redis");
        const connections = await getRedisAsync();

        if (!connections?.sessionRedis) {
          manualRedisTest = "FAILED: Redis connections failed to initialize";
        } else {
          const RedisStore = (await import("connect-redis")).default;

          await connections.sessionRedis.ping();

          const testStore = new RedisStore({
            client: connections.sessionRedis,
            prefix: `${process.env.REDIS_KEY_PREFIX ?? (process.env.NODE_ENV === "development" ? "oseed:dev:" : "")}test:diagnostic:`,
            ttl: 300, // 5 minutes
          });

          manualRedisTest = `SUCCESS: ${testStore.constructor.name}`;
          console.log(
            "[SessionDiag] Shared Redis connection test successful:",
            testStore.constructor.name,
          );
        }
      } catch (error) {
        const msg = getErrorMessage(error);
        manualRedisTest = `FAILED: ${msg}`;
        console.log("[SessionDiag] Shared Redis connection test failed:", msg);
      }
    }

    // Get session information
    const sessionStore = (req.session as any)?.store;
    const storeType = sessionStore?.constructor?.name || "Unknown";
    const sessionData = {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      storeConstructor: sessionStore?.constructor?.name,
      storeString: sessionStore?.toString(),
      storeKeys: sessionStore ? Object.keys(sessionStore) : [],
      sessionKeys: req.session ? Object.keys(req.session) : [],
    };

    console.log("[SessionDiag] Session store details:", sessionData);

    res.json({
      storeType,
      sessionData,
      manualRedisTest,
      redisUrl: !!process.env.REDIS_URL,
      timestamp: new Date().toISOString(),
    });
  });

  // Debug endpoint to check session store type
  app.get("/api/debug/session-store", async (req, res) => {
    // Get the actual session store from Express session middleware
    const sessionStore = (req.session as any)?.store;
    const storeType = sessionStore?.constructor?.name || "Unknown";
    const hasRedis = storeType.includes("Redis");

    console.log("[Debug] Session store type:", storeType);
    console.log(
      "[Debug] Session store constructor:",
      sessionStore?.constructor?.name,
    );
    console.log("[Debug] Has Redis:", hasRedis);

    // Test direct Redis connection
    let redisTestResult = "Not tested";
    if (process.env.REDIS_URL) {
      try {
        const Redis = (await import("ioredis")).default;
        const testClient = new Redis(process.env.REDIS_URL);

        // Test basic operations with ioredis
        await testClient.set("test:ping", "pong");
        const value = await testClient.get("test:ping");
        await testClient.del("test:ping");
        await testClient.quit();

        redisTestResult = "Connected and working";
      } catch (err: any) {
        redisTestResult = `Error: ${err.message}`;
      }
    }

    // Check redis module status
    const { redis: redisConfig } = (await import("./redis")) as any;

    res.json({
      storeType,
      isRedisStore: hasRedis,
      sessionId: req.sessionID,
      sessionExists: !!req.session,
      redisUrl: process.env.REDIS_URL ? "Set" : "Not set",
      redisDirectTest: redisTestResult,
      redisModuleStatus: {
        redisConfigExists: !!redisConfig,
        sessionRedis: !!redisConfig?.sessionRedis,
        cacheRedis: !!redisConfig?.cacheRedis,
        queueRedis: !!redisConfig?.queueRedis,
      },
    });
  });

  // OAuth sync endpoint removed - handled in auth.ts

  // Request portal access endpoint
  app.post("/api/auth/request-access", async (req, res) => {
    try {
      const { email, name } = req.body;

      if (!email || !name) {
        return res.status(400).json({ message: "Email and name are required" });
      }

      // Log the access request (Slack integration temporarily disabled)
      console.log(`🔐 Portal Access Request - User: ${name}, Email: ${email}`);
      console.log(
        "Access request logged. Admin should be notified via Slack (currently disabled due to channel config issues)",
      );

      // Always respond successfully - access request is "received" even if Slack fails
      res.json({ message: "Access request sent to admin" });
    } catch (error) {
      console.error("Error processing access request:", error);
      // Still respond successfully - the core function (logging the request) works
      res.json({ message: "Access request received" });
    }
  });

  // Removed duplicate logout endpoint - using /api/logout from auth.ts instead

  console.log("🔍 CHECKPOINT A: About to register /api/test/db-quote");

  // Test endpoint for database operations
  app.get("/api/test/db-quote", requireAuth, async (req, res) => {
    console.log("🔵 TEST DB ENDPOINT - Testing direct database operations");
    try {
      // Test direct database query
      const testQuote = {
        contactEmail: "test@example.com",
        companyName: "Test Company",
        monthlyFee: "100.00",
        setupFee: "200.00",
        taasMonthlyFee: "0.00",
        taasPriorYearsFee: "0.00",
        ownerId: req.user!.id,
        includesBookkeeping: true,
        includesTaas: false,
        archived: false,
        quoteType: "bookkeeping",
        entityType: "LLC",
        numEntities: 1,
        customNumEntities: null,
        statesFiled: 1,
        customStatesFiled: null,
        internationalFiling: false,
        numBusinessOwners: 1,
        customNumBusinessOwners: null,
        monthlyRevenueRange: "10K-25K",
        monthlyTransactions: "100-300",
        industry: "Professional Services",
        cleanupMonths: 8,
        cleanupComplexity: "0.25",
        cleanupOverride: false,
        overrideReason: "",
        customOverrideReason: "",
        customSetupFee: "",
        serviceBookkeeping: true,
        serviceTaas: false,
        servicePayroll: false,
        serviceApLite: false,
        serviceArLite: false,
        contactFirstName: "Test",
        contactLastName: "User",
        clientStreetAddress: "",
        clientCity: "",
        clientState: "CO",
        clientZipCode: "",
        accountingBasis: "Cash",
      };

      console.log("🔵 TESTING storage.createQuote directly...");
      const result = await storage.createQuote(testQuote);
      console.log("🟢 TEST RESULT:", {
        hasResult: !!result,
        resultType: typeof result,
        resultId: result?.id,
        resultStringified: JSON.stringify(result),
      });

      res.json({
        success: true,
        testResult: result,
        message: "Database test completed",
      });
    } catch (error) {
      console.error("🚨 TEST ERROR:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  console.log("🔍 REACHED QUOTE ROUTE REGISTRATION SECTION - Line 768");
  console.log("🔍 About to register POST /api/quotes route...");

  // Add comprehensive logging for debugging
  app.use("/api/quotes", (req, res, next) => {
    console.log("📊 QUOTE MIDDLEWARE - Request details:");
    console.log("Method:", req.method);
    console.log("Path:", req.path);
    console.log("URL:", req.url);
    console.log("Body keys:", Object.keys(req.body || {}));
    console.log("User:", req.user?.email || "Not authenticated");
    console.log("Session exists:", !!req.session);
    console.log("Is authenticated:", req.isAuthenticated?.() || false);
    next();
  });

  // Create a new quote (protected) - DEBUGGING ROUTE REGISTRATION
  console.log("📋 REGISTERING QUOTE ROUTE: /api/quotes POST");
  app.post(
    "/api/quotes",
    (req, res, next) => {
      console.log("🚨 QUOTE ROUTE HIT! Method:", req.method, "URL:", req.url);
      next();
    },
    requireAuth,
    async (req, res) => {
      console.log("🟢 POST /api/quotes - HANDLER EXECUTING");
      console.log("🔥 REQUEST BODY KEYS:", Object.keys(req.body || {}));
      console.log("🔥 REQUEST BODY CONTACT EMAIL:", req.body?.contactEmail);

      try {
        console.log("=== QUOTE CREATION DEBUG ===");
        console.log("User:", req.user?.email, "ID:", req.user?.id);

        if (!req.user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Extract service flags with defaults
        const includesBookkeeping = req.body.includesBookkeeping !== false; // Default to true
        const includesTaas = req.body.includesTaas === true;

        // Sanitize numeric fields - convert empty strings appropriately
        const sanitizedBody = { ...req.body };

        // Fee fields that should be "0" when empty (schema expects strings)
        const feeFields = [
          "monthlyFee",
          "setupFee",
          "taasMonthlyFee",
          "taasPriorYearsFee",
          "cleanupComplexity",
        ];
        feeFields.forEach((field) => {
          if (
            sanitizedBody[field] === "" ||
            sanitizedBody[field] === undefined
          ) {
            sanitizedBody[field] = "0";
          }
        });

        // Integer fields that should be null when empty
        const integerFields = [
          "cleanupMonths",
          "numEntities",
          "customNumEntities",
          "statesFiled",
          "customStatesFiled",
          "numBusinessOwners",
          "customNumBusinessOwners",
          "priorYearsUnfiled",
        ];
        integerFields.forEach((field) => {
          if (
            sanitizedBody[field] === "" ||
            sanitizedBody[field] === undefined
          ) {
            sanitizedBody[field] = null;
          }
        });

        // Prepare data for validation (without ownerId since schema omits it)
        const validationData = {
          ...sanitizedBody,
          // Use the frontend-calculated values directly (with fallbacks for required fields)
          monthlyFee: sanitizedBody.monthlyFee || "0",
          setupFee: sanitizedBody.setupFee || "0",
          taasMonthlyFee: sanitizedBody.taasMonthlyFee || "0",
          taasPriorYearsFee: sanitizedBody.taasPriorYearsFee || "0",
          // For TaaS-only quotes, provide defaults for bookkeeping-required fields
          monthlyTransactions: sanitizedBody.monthlyTransactions || "N/A",
          cleanupComplexity: sanitizedBody.cleanupComplexity || "0",
          cleanupMonths: sanitizedBody.cleanupMonths || 0,
          // Required fields with defaults for validation
          monthlyRevenueRange:
            sanitizedBody.monthlyRevenueRange || "Not specified",
          industry: sanitizedBody.industry || "Not specified",
        };

        // Check for existing quotes - use approval system if needed
        const { contactEmail, approvalCode } = req.body;
        console.log("🔍 APPROVAL CHECK - Contact Email:", contactEmail);
        console.log(
          "🔍 APPROVAL CHECK - Approval Code provided:",
          !!approvalCode,
          "Value:",
          approvalCode,
        );

        if (contactEmail) {
          const existingQuotes = await storage.getQuotesByEmail(contactEmail);
          console.log(
            "🔍 APPROVAL CHECK - Existing quotes found:",
            existingQuotes.length,
          );

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
              }),
            );
            liveInHubSpotCount = verifications.filter(Boolean).length;
          } catch (e) {
            // In case of verification failure, be conservative: treat as zero to avoid blocking valid flows
            console.warn(
              "[Approval] HubSpot existence verification failed; defaulting to allow create without approval",
              (e as any)?.message,
            );
            liveInHubSpotCount = 0;
          }

          if (liveInHubSpotCount > 0) {
            // There are active HubSpot quotes; require approval code
            if (!approvalCode) {
              console.log(
                "🚨 APPROVAL CHECK - Live HubSpot quotes present and no approval code provided, rejecting",
              );
              res.status(400).json({
                message:
                  "Approval code required for creating additional quotes",
                requiresApproval: true,
                existingQuotesCount: liveInHubSpotCount,
              });
              return;
            }

            console.log(
              "🔍 APPROVAL CHECK - Validating approval code:",
              approvalCode,
            );
            const isValidCode = await storage.validateApprovalCode(
              approvalCode,
              contactEmail,
            );
            console.log(
              "🔍 APPROVAL CHECK - Code validation result:",
              isValidCode,
            );

            if (!isValidCode) {
              console.log(
                "🚨 APPROVAL CHECK - Invalid approval code, rejecting",
              );
              res.status(400).json({
                message: "Invalid or expired approval code",
                requiresApproval: true,
              });
              return;
            }

            await storage.markApprovalCodeUsed(approvalCode, contactEmail);
            console.log(
              `✅ APPROVAL CHECK - Code validated and marked as used for: ${contactEmail}`,
            );
          } else {
            console.log(
              "✅ APPROVAL CHECK - No live HubSpot quotes; proceeding without approval",
            );
          }
        }

        console.log("Processing quote data for:", req.body.contactEmail);
        console.log("Validation data keys:", Object.keys(validationData));
        console.log("Required fields check:");
        console.log("- contactEmail:", validationData.contactEmail);
        console.log(
          "- monthlyRevenueRange:",
          validationData.monthlyRevenueRange,
        );
        console.log("- industry:", validationData.industry);
        console.log(
          "- monthlyTransactions:",
          validationData.monthlyTransactions,
        );
        console.log("- cleanupMonths:", validationData.cleanupMonths);
        console.log("- cleanupComplexity:", validationData.cleanupComplexity);
        console.log("- monthlyFee:", validationData.monthlyFee);
        console.log("- setupFee:", validationData.setupFee);

        // Validate the data first (without ownerId)
        console.log("🔍 STARTING ZOD VALIDATION...");
        const validationResult = insertQuoteSchema.safeParse(validationData);

        if (!validationResult.success) {
          console.error("🚨 ZOD VALIDATION FAILED:");
          console.error(
            "Validation errors:",
            JSON.stringify(validationResult.error.errors, null, 2),
          );

          // Log each error in detail
          validationResult.error.errors.forEach((ze, index) => {
            console.error(`Error ${index + 1}:`, {
              path: ze.path,
              message: ze.message,
            });
          });

          throw validationResult.error;
        }

        const validatedQuoteData = validationResult.data;
        console.log("🟢 ZOD VALIDATION PASSED");
        
        // Compute canonical pricing totals on the server
        // Do NOT trust client-provided totals; derive from validated inputs
        let quote;
        try {
          const calc = calculateCombinedFees(validatedQuoteData as any);
          console.log("🧮 Server pricing totals:", {
            combinedMonthly: calc.combined.monthlyFee,
            combinedSetup: calc.combined.setupFee,
            taasMonthly: calc.taas.monthlyFee,
            priorYearFilings: calc.priorYearFilingsFee,
            qboFee: calc.qboFee,
          });

          // Add ownerId and override totals from server calc
          const quoteData = {
            ...validatedQuoteData,
            ownerId: req.user.id,
            monthlyFee: calc.combined.monthlyFee.toFixed(2),
            setupFee: calc.combined.setupFee.toFixed(2),
            taasMonthlyFee: calc.taas.monthlyFee.toFixed(2),
            taasPriorYearsFee: calc.priorYearFilingsFee.toFixed(2),
          } as any;

          console.log("🔵 CALLING storage.createQuote with data (server totals)...");
          quote = await storage.createQuote(quoteData);
        } catch (calcError) {
          console.error("🚨 Server pricing calculation failed:", calcError);
          return res.status(400).json({
            message: "Pricing calculation failed",
            reason: (calcError as any)?.message,
          });
        }
        console.log("🟢 STORAGE RETURNED:", {
          hasQuote: !!quote,
          quoteType: typeof quote,
          quoteKeys: quote ? Object.keys(quote) : "N/A",
          quoteId: quote?.id,
          monthlyFee: quote?.monthlyFee,
          setupFee: quote?.setupFee,
          taasMonthlyFee: (quote as any)?.taasMonthlyFee,
          taasPriorYearsFee: (quote as any)?.taasPriorYearsFee,
        });

        if (!quote) {
          console.error("🚨 CRITICAL: Storage returned null/undefined quote");
          return res
            .status(500)
            .json({ message: "Quote creation failed - no data returned" });
        }

        console.log("🔵 PREPARING RESPONSE - Quote object details:");
        console.log("Quote ID:", quote.id);
        console.log("Quote contact email:", quote.contactEmail);
        console.log("Quote monthly fee:", quote.monthlyFee);
        console.log(
          "Quote object stringified:",
          JSON.stringify(quote).substring(0, 200) + "...",
        );

        console.log("🚀 SENDING RESPONSE via res.json()");
        res.json(quote);
      } catch (error: unknown) {
        console.error(
          "🚨 QUOTE CREATION ERROR CAUGHT:",
          getErrorMessage(error),
        );
        if (error instanceof z.ZodError) {
          console.error("🚨 ZOD VALIDATION ERROR - Details:", error.errors);
          console.error(
            "🚨 ZOD VALIDATION ERROR - Full:",
            JSON.stringify(error.errors, null, 2),
          );
          return res
            .status(400)
            .json({ message: "Invalid quote data", errors: error.errors });
        }
        console.error(
          "🚨 NON-ZOD ERROR - Database or other error:",
          getErrorMessage(error),
        );
        return res
          .status(500)
          .json({
            message: "Failed to create quote",
            debug: getErrorMessage(error),
          });
      }
    },
  );

  // Get all quotes with optional search and sort (protected)
  app.get(
    "/api/quotes",
    (req, res, next) => {
      console.log("====== QUOTES ENDPOINT HIT ======");
      console.log("Quotes API - Request received:", {
        method: req.method,
        url: req.url,
        query: req.query,
        user: req.user?.email || "no user",
      });
      console.log("====== QUOTES ENDPOINT PROCESSING ======");
      next();
    },
    requireAuth,
    async (req, res) => {
      try {
        const email = req.query.email as string;
        const search = req.query.search as string;
        const sortField = req.query.sortField as string;
        const sortOrder = req.query.sortOrder as "asc" | "desc";

        console.log("Quotes API - Query params:", {
          email,
          search,
          sortField,
          sortOrder,
        });
        console.log("Quotes API - User ID:", req.user?.id);

        if (!req.user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        if (email) {
          console.log("Quotes API - Getting quotes by email:", email);
          // Get quotes by specific email (filtered by owner)
          const quotes = await storage.getQuotesByEmail(email);
          // Filter by owner
          const userQuotes = quotes.filter(
            (quote) => quote.ownerId === req.user!.id,
          );
          console.log(
            "Quotes API - Found",
            userQuotes.length,
            "quotes for email",
          );
          res.json(userQuotes);
        } else if (search) {
          console.log("Quotes API - Searching quotes by email:", search);
          console.log("Quotes API - User ID for search:", req.user.id);
          try {
            // Search quotes by email (using search parameter for email filtering)
            const quotes = await storage.getAllQuotes(
              req.user.id,
              search,
              sortField,
              sortOrder,
            );
            console.log(
              "Quotes API - Found",
              quotes.length,
              "quotes matching search",
            );
            console.log("Quotes API - Sending response...");
            res.json(quotes);
            console.log("Quotes API - Response sent successfully");
          } catch (dbError: any) {
            console.error(
              "Quotes API - Database error during search:",
              dbError,
            );
            console.error("Quotes API - Error details:", {
              message: dbError.message,
              code: dbError.code,
              stack: dbError.stack?.split("\n")[0],
            });
            throw dbError; // Re-throw to be caught by outer catch
          }
        } else {
          console.log("Quotes API - Getting all quotes for user");
          // Get all quotes for the authenticated user
          const quotes = await storage.getAllQuotes(
            req.user.id,
            undefined,
            sortField,
            sortOrder,
          );
          console.log("Quotes API - Found", quotes.length, "total quotes");
          res.json(quotes);
        }
      } catch (error: any) {
        console.error("Error fetching quotes:", error);
        console.error("Error stack:", (error as any)?.stack);
        console.error("Error name:", (error as any)?.name);
        console.error("Error message:", getErrorMessage(error));
        res
          .status(500)
          .json({
            message: "Failed to fetch quotes",
            error: getErrorMessage(error),
          });
      }
    },
  );

  // Update a quote (protected)
  app.put("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid quote ID" });
        return;
      }

      // Sanitize numeric fields - convert empty strings appropriately
      const sanitizedBody = { ...req.body };

      // Fee fields that should be "0" when empty (schema expects strings)
      const feeFields = [
        "monthlyFee",
        "setupFee",
        "taasMonthlyFee",
        "taasPriorYearsFee",
        "cleanupComplexity",
      ];
      feeFields.forEach((field) => {
        if (sanitizedBody[field] === "" || sanitizedBody[field] === undefined) {
          sanitizedBody[field] = "0";
        }
      });

      // Integer fields that should be null when empty
      const integerFields = [
        "cleanupMonths",
        "numEntities",
        "customNumEntities",
        "statesFiled",
        "customStatesFiled",
        "numBusinessOwners",
        "customNumBusinessOwners",
        "priorYearsUnfiled",
      ];
      integerFields.forEach((field) => {
        if (sanitizedBody[field] === "" || sanitizedBody[field] === undefined) {
          sanitizedBody[field] = null;
        }
      });

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
          setupFee: cfg.fees.combinedSetup.toFixed(2),
          taasMonthlyFee: cfg.fees.taasMonthly.toFixed(2),
          taasPriorYearsFee: cfg.fees.priorYearFilings.toFixed(2),
        } as any;
        quote = await storage.updateQuote(quoteData);
      } catch (calcErr) {
        console.error("🚨 Server pricing calculation failed on update:", calcErr);
        return res.status(400).json({
          message: "Pricing calculation failed on update",
          reason: (calcErr as any)?.message,
        });
      }

      // 🔧 CRITICAL FIX: Update HubSpot when quote is updated
      console.log(
        `🔄 Quote ${id} updated in database, now syncing to HubSpot...`,
      );
      if (quote.hubspotQuoteId && hubSpotService) {
        try {
          console.log(
            `📤 Calling HubSpot updateQuote for quote ID ${quote.hubspotQuoteId}`,
          );
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
                (quote as any).serviceMonthlyBookkeeping,
            ),
            Boolean(quote.serviceTaas || (quote as any).serviceTaasMonthly),
            Number(feeCalculation.taas.monthlyFee || 0),
            Number(feeCalculation.priorYearFilingsFee || 0),
            Number(feeCalculation.bookkeeping.monthlyFee || 0),
            Number(feeCalculation.bookkeeping.setupFee || 0),
            quote as any,
            quote.serviceTier || undefined,
            Boolean(
              quote.servicePayroll || (quote as any).servicePayrollService,
            ),
            Number(feeCalculation.payrollFee || 0),
            Boolean(
              quote.serviceApLite ||
                (quote as any).serviceApAdvanced ||
                (quote as any).serviceApArService,
            ),
            Number(feeCalculation.apFee || 0),
            Boolean(
              quote.serviceArLite ||
                (quote as any).serviceArAdvanced ||
                (quote as any).serviceArService,
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
            Number(feeCalculation.serviceTierFee || 0),
          );
          console.log(
            `✅ HubSpot quote ${quote.hubspotQuoteId} updated successfully`,
          );
        } catch (hubspotError) {
          console.error(
            `❌ Failed to update HubSpot quote ${quote.hubspotQuoteId}:`,
            hubspotError,
          );
          // Don't fail the entire request - quote was updated in database
        }
      } else if (!quote.hubspotQuoteId) {
        console.log(
          `⚠️ Quote ${id} has no HubSpot quote ID - skipping HubSpot update`,
        );
      } else {
        console.log(
          `⚠️ HubSpot service not available - skipping HubSpot update`,
        );
      }

      res.json(quote);
    } catch (error: unknown) {
      console.error("❌ Quote update error:", getErrorMessage(error));
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res
          .status(500)
          .json({
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

      const leads = await hubSpotService.getSalesInboxLeads(
        userEmail,
        parseInt(limit.toString()),
      );

      res.json({ leads });
    } catch (error) {
      console.error("Error fetching sales inbox leads:", error);
      res.status(500).json({ message: "Failed to fetch sales inbox leads" });
    }
  });

  // Client Intel API endpoints

  // Search for clients/prospects using HubSpot with owner filtering
  app.get(
    "/api/client-intel/search",
    requireAuth,
    searchRateLimit,
    async (req, res) => {
      try {
        const query = req.query.q as string;
        if (!query || query.length < 3) {
          return res.json([]);
        }

        // Get the logged-in user's email for owner filtering
        const userEmail = (req as any).user?.email;

        console.log(`[Search] Searching for: "${query}" by user: ${userEmail}`);

        let results;
        try {
          // Try to use cache for HubSpot search results
          const cacheKey = cache.generateKey(CachePrefix.HUBSPOT_CONTACT, {
            query,
            userEmail,
          });
          results = await cache.wrap(
            cacheKey,
            () => clientIntelEngine.searchHubSpotContacts(query, userEmail),
            { ttl: CacheTTL.HUBSPOT_CONTACT },
          );
        } catch (cacheError) {
          console.log(
            "[Search] Cache unavailable, searching directly:",
            getErrorMessage(cacheError),
          );
          // Fallback to direct search without cache
          results = await clientIntelEngine.searchHubSpotContacts(
            query,
            userEmail,
          );
        }

        console.log(`[Search] Found ${results?.length || 0} results`);
        res.json(results || []);
      } catch (error) {
        console.error("Client search error:", error);
        res
          .status(500)
          .json({ message: "Search failed", error: getErrorMessage(error) });
      }
    },
  );

  // Enhance prospect data endpoint
  app.post(
    "/api/client-intel/enhance/:contactId",
    requireAuth,
    enhancementRateLimit,
    async (req, res) => {
      const { contactId } = req.params;

      if (!contactId) {
        return res.status(400).json({ error: "Contact ID required" });
      }

      try {
        if (!hubSpotService) {
          return res
            .status(500)
            .json({ error: "HubSpot service not available" });
        }

        // Fetch the full contact data from HubSpot
        const contact = await hubSpotService.getContactById(contactId);
        if (!contact) {
          return res.status(404).json({ error: "Contact not found" });
        }

        // Enhance the contact's company data using public method
        await clientIntelEngine.searchHubSpotContacts(
          contact.properties?.email || contact.properties?.company || "",
          req.user?.email,
        );

        // Return the enhanced data including Airtable fields
        const companyName = contact.properties?.company;
        const { airtableService } = await import("./airtable.js");
        const airtableData = companyName
          ? await airtableService.getEnrichedCompanyData(
              companyName,
              contact.properties?.email,
            )
          : null;

        res.json({
          success: true,
          message: "Contact data enhanced successfully",
          airtableData: airtableData,
        });
      } catch (error) {
        console.error("Data enhancement error:", error);
        res.status(500).json({ error: "Enhancement failed" });
      }
    },
  );

  // Generate AI insights for a client using async queue processing
  app.post(
    "/api/client-intel/generate-insights",
    requireAuth,
    async (req, res) => {
      try {
        const { clientId } = req.body;

        if (!clientId) {
          return res.status(400).json({ message: "Client ID is required" });
        }

        // Check cache first for immediate response
        const cacheKey = cache.generateKey(
          CachePrefix.OPENAI_ANALYSIS,
          clientId,
        );
        const cachedInsights = await cache.get(cacheKey);

        if (cachedInsights) {
          console.log(
            "Cache hit - returning cached insights for client:",
            clientId,
          );
          return res.json(cachedInsights);
        }

        // Check if job is already in progress
        const jobStatusKey = `job:insights:${clientId}`;
        const existingJobId = await cache.get<string>(jobStatusKey);

        if (existingJobId) {
          // Return job status if already processing
          const { getAIInsightsQueue } = await import("./queue.js");
          const aiInsightsQueue = getAIInsightsQueue?.();
          let job: any = null;
          if (aiInsightsQueue) {
            job = await aiInsightsQueue.getJob(existingJobId);
          }

          if (job && (await job.getState()) === "active") {
            return res.json({
              status: "processing",
              progress: job.progress,
              jobId: existingJobId,
              message: "AI insights are being generated. Check back shortly.",
            });
          }
        }

        // Get client data from HubSpot first
        let clientData: any = {};

        try {
          if (hubSpotService) {
            const contact = await hubSpotService.getContactById(clientId);
            if (contact) {
              clientData = {
                companyName: contact.properties.company || "Unknown Company",
                industry: contact.properties.industry || null,
                revenue: contact.properties.annualrevenue,
                employees:
                  parseInt(contact.properties.numemployees) || undefined,
                lifecycleStage: contact.properties.lifecyclestage || "lead",
                services: await clientIntelEngine.getContactServices(clientId),
                hubspotProperties: contact.properties,
                lastActivity: contact.properties.lastmodifieddate,
                recentActivities: [], // Would fetch from activities API
              };
            }
          }
        } catch (hubspotError) {
          console.error("HubSpot data fetch failed:", hubspotError);
          // Continue with limited data for analysis
        }

        // Queue the expensive AI analysis
        const { getAIInsightsQueue } = await import("./queue.js");
        const aiInsightsQueue = getAIInsightsQueue();

        if (!aiInsightsQueue) {
          return res.status(503).json({ message: "Queue service unavailable" });
        }

        const job = await aiInsightsQueue.add(
          "generate-insights",
          {
            contactId: clientId,
            clientData,
            userId: req.user?.id || 0,
            timestamp: Date.now(),
          },
          {
            priority: 1, // High priority
            delay: 0,
          },
        );

        // Store job ID temporarily for status checks
        await cache.set(jobStatusKey, job.id, 300); // 5 minutes

        console.log(
          `[Queue] 🔄 Queued AI insights job ${job.id} for client ${clientId}`,
        );

        // Return job status for polling
        res.json({
          status: "queued",
          jobId: job.id,
          progress: 0,
          message: "AI insights queued for processing. Check back shortly.",
        });
      } catch (error) {
        console.error("Insight generation error:", error);
        res.status(500).json({ message: "Failed to generate insights" });
      }
    },
  );

  // Job status endpoint for polling AI insights progress
  app.get("/api/jobs/:jobId/status", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const { getAIInsightsQueue } = await import("./queue.js");
      const aiInsightsQueue = getAIInsightsQueue();

      if (!aiInsightsQueue) {
        return res.status(503).json({ message: "Queue service unavailable" });
      }

      const job = await aiInsightsQueue.getJob(String(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const state = await job.getState();
      const progress = job.progress || 0;

      if (state === "completed") {
        const result = job.returnvalue;
        // Cache the result for future requests
        const { contactId } = job.data;
        const cacheKey = cache.generateKey(
          CachePrefix.OPENAI_ANALYSIS,
          contactId,
        );
        await cache.set(cacheKey, result, CacheTTL.OPENAI_ANALYSIS);

        res.json({
          status: "completed",
          progress: 100,
          result,
        });
      } else if (state === "failed") {
        res.json({
          status: "failed",
          progress: 100,
          error: job.failedReason,
        });
      } else {
        res.json({
          status: state,
          progress,
          message:
            state === "active" ? "Processing AI insights..." : "Job in queue",
        });
      }
    } catch (error) {
      console.error("Job status error:", error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  // Queue metrics endpoint
  app.get("/api/queue/metrics", requireAuth, async (req, res) => {
    try {
      const { getQueueMetrics } = await import("./queue.js");
      const metrics = getQueueMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Queue metrics error:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to get queue metrics" });
    }
  });

  // Cache statistics endpoint
  app.get("/api/cache/stats", requireAuth, async (req, res) => {
    try {
      const stats = await cache.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Cache stats error:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to get cache stats" });
    }
  });

  // Stripe routes for revenue data
  app.get("/api/stripe/revenue", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({
          status: "error",
          message: "Stripe not configured - missing STRIPE_SECRET_KEY",
        });
      }

      const Stripe = await import("stripe");
      const stripe = new Stripe.default(
        process.env.STRIPE_SECRET_KEY as string,
      );

      // Get current date and calculate time ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch all revenue data from Stripe with pagination to get all transactions
      const fetchAllCharges = async (params: any) => {
        let allCharges = [];
        let hasMore = true;
        let startingAfter = undefined;

        while (hasMore) {
          const response: any = await stripe.charges.list({
            ...params,
            limit: 100,
            starting_after: startingAfter,
          });

          allCharges.push(...response.data);
          hasMore = response.has_more;
          if (hasMore && response.data.length > 0) {
            startingAfter = response.data[response.data.length - 1].id;
          }
        }

        return { data: allCharges };
      };

      const [currentMonthCharges, yearToDateCharges, lastMonthCharges] =
        await Promise.all([
          fetchAllCharges({
            created: {
              gte: Math.floor(startOfMonth.getTime() / 1000),
            },
            expand: ["data.balance_transaction"],
          }),
          fetchAllCharges({
            created: {
              gte: Math.floor(startOfYear.getTime() / 1000),
            },
            expand: ["data.balance_transaction"],
          }),
          fetchAllCharges({
            created: {
              gte: Math.floor(lastMonth.getTime() / 1000),
              lt: Math.floor(endOfLastMonth.getTime() / 1000),
            },
            expand: ["data.balance_transaction"],
          }),
        ]);

      console.log("=== STRIPE REVENUE DEBUG ===");
      console.log(
        `Current Month: ${currentMonthCharges.data.length} total, ${currentMonthCharges.data.filter((c: any) => c.status === "succeeded").length} succeeded`,
      );
      console.log(
        `Year to Date: ${yearToDateCharges.data.length} total, ${yearToDateCharges.data.filter((c: any) => c.status === "succeeded").length} succeeded`,
      );
      console.log(
        `Last Month: ${lastMonthCharges.data.length} total, ${lastMonthCharges.data.filter((c: any) => c.status === "succeeded").length} succeeded`,
      );

      console.log("=== YEAR TO DATE BREAKDOWN ===");
      console.log(
        `Live mode: ${yearToDateCharges.data.filter((c: any) => c.livemode === true).length}`,
      );
      console.log(
        `Test mode: ${yearToDateCharges.data.filter((c: any) => c.livemode === false).length}`,
      );
      console.log(
        `Live + Succeeded: ${yearToDateCharges.data.filter((c: any) => c.status === "succeeded" && c.livemode === true).length}`,
      );
      console.log(
        `Failed: ${yearToDateCharges.data.filter((c: any) => c.status === "failed").length}`,
      );
      console.log(
        `Refunded: ${yearToDateCharges.data.filter((c: any) => c.refunded === true).length}`,
      );

      // Log ALL charges for year to date to see what we're getting
      console.log("=== ALL YTD CHARGES ===");
      const succeededCharges = yearToDateCharges.data
        .filter((c: any) => c.status === "succeeded" && c.livemode === true)
        .sort((a: any, b: any) => b.created - a.created); // Sort by most recent first

      console.log(`Found ${succeededCharges.length} successful live charges:`);
      succeededCharges.forEach((charge: any, index: number) => {
        const chargeType = charge.id.startsWith("ch_")
          ? "CHARGE"
          : charge.id.startsWith("py_")
            ? "PAYMENT"
            : charge.id.startsWith("pi_")
              ? "INTENT"
              : "OTHER";
        const originalAmount = charge.amount / 100;
        const currency = charge.currency.toLowerCase();

        // Use Stripe's balance_transaction for actual converted amounts
        const balanceTransaction = charge.balance_transaction;
        const convertedAmount = balanceTransaction
          ? balanceTransaction.amount / 100 // Use Stripe's converted amount
          : originalAmount; // Fallback to original if no balance transaction

        const displayAmount =
          currency === "usd"
            ? `$${originalAmount.toFixed(2)} USD`
            : `${originalAmount.toFixed(2)} ${currency.toUpperCase()} (Stripe converted: $${convertedAmount.toFixed(2)} USD)`;

        console.log(
          `${index + 1}. ${charge.id} (${chargeType}): ${displayAmount}, ${new Date(charge.created * 1000).toLocaleDateString()}, ${charge.description || "No description"}`,
        );
      });
      console.log("=== END CHARGES ===");

      // Calculate totals using Stripe's actual converted amounts from balance_transaction
      const calculateRevenue = (charges: any) => {
        return charges.data
          .filter(
            (charge: any) =>
              charge.status === "succeeded" && charge.livemode === true,
          )
          .reduce((sum: number, charge: any) => {
            // Use Stripe's balance_transaction for actual converted amount
            const balanceTransaction = charge.balance_transaction;
            if (balanceTransaction) {
              // Stripe's balance_transaction.amount is in your account's default currency (USD)
              return sum + balanceTransaction.amount / 100;
            } else {
              // Fallback: assume it's already in USD if no balance transaction
              return sum + charge.amount / 100;
            }
          }, 0);
      };

      const calculateTransactionCount = (charges: any) => {
        return charges.data.filter(
          (c: any) => c.status === "succeeded" && c.livemode === true,
        ).length;
      };

      const currentMonthRevenue = calculateRevenue(currentMonthCharges);
      const yearToDateRevenue = calculateRevenue(yearToDateCharges);
      const lastMonthRevenue = calculateRevenue(lastMonthCharges);

      // Calculate growth percentage
      const monthOverMonthGrowth =
        lastMonthRevenue > 0
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

      res.json({
        currentMonth: {
          revenue: currentMonthRevenue,
          transactions: calculateTransactionCount(currentMonthCharges),
        },
        lastMonth: {
          revenue: lastMonthRevenue,
          transactions: calculateTransactionCount(lastMonthCharges),
        },
        yearToDate: {
          revenue: yearToDateRevenue,
          transactions: calculateTransactionCount(yearToDateCharges),
        },
        growth: {
          monthOverMonth: monthOverMonthGrowth,
        },
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Stripe revenue fetch error:", getErrorMessage(error));
      res.status(500).json({
        status: "error",
        message: "Failed to fetch revenue data from Stripe",
        error: getErrorMessage(error),
      });
    }
  });

  app.get("/api/stripe/recent-transactions", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({
          status: "error",
          message: "Stripe not configured - missing STRIPE_SECRET_KEY",
        });
      }

      const Stripe = await import("stripe");
      const stripe = new Stripe.default(
        process.env.STRIPE_SECRET_KEY as string,
      );

      const charges: any = await stripe.charges.list({
        limit: 10,
      });

      const transactions = charges.data.map((charge: any) => ({
        id: charge.id,
        amount: charge.amount / 100, // Convert from cents
        currency: charge.currency.toUpperCase(),
        status: charge.status,
        description: charge.description || "No description",
        customer: charge.billing_details?.name || "Unknown",
        created: new Date(charge.created * 1000).toISOString(),
        receipt_url: charge.receipt_url,
      }));

      res.json({
        transactions,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Stripe transactions fetch error:", getErrorMessage(error));
      res.status(500).json({
        status: "error",
        message: "Failed to fetch recent transactions from Stripe",
        error: getErrorMessage(error),
      });
    }
  });

  // CDN and Asset Optimization endpoints

  // Get compression statistics
  app.get("/api/cdn/compression-stats", requireAuth, async (req, res) => {
    try {
      const { assetOptimization } = await import(
        "./middleware/asset-optimization.js"
      );
      const stats = assetOptimization.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Compression stats error:", error);
      res.status(500).json({ message: "Failed to get compression stats" });
    }
  });

  // Reset compression statistics
  app.post(
    "/api/cdn/reset-compression-stats",
    requireAuth,
    async (req, res) => {
      try {
        const { assetOptimization } = await import(
          "./middleware/asset-optimization.js"
        );
        assetOptimization.resetStats();
        res.json({ message: "Compression statistics reset successfully" });
      } catch (error) {
        console.error("Reset compression stats error:", error);
        res
          .status(500)
          .json({ message: "Failed to reset compression statistics" });
      }
    },
  );

  // Get CDN performance metrics
  app.get("/api/cdn/performance", requireAuth, async (req, res) => {
    try {
      const { cdnService } = await import("./cdn.js");
      const manifest = cdnService.getManifest();

      const totalAssets = Object.keys(manifest).length;
      const totalSize = Object.values(manifest).reduce(
        (sum, asset) => sum + asset.size,
        0,
      );
      const averageSize = totalAssets > 0 ? totalSize / totalAssets : 0;

      res.json({
        totalAssets,
        totalSize,
        averageSize,
        lastUpdated: new Date().toISOString(),
        cacheHeaders: "enabled",
        compression: "enabled",
      });
    } catch (error) {
      console.error("CDN performance error:", error);
      res
        .status(500)
        .json({ message: "Failed to get CDN performance metrics" });
    }
  });

  // Rebuild asset manifest
  app.post("/api/cdn/rebuild-manifest", requireAuth, async (req, res) => {
    try {
      const { cdnService } = await import("./cdn.js");
      await cdnService.initialize();
      res.json({ message: "Asset manifest rebuilt successfully" });
    } catch (error) {
      console.error("Rebuild manifest error:", error);
      res.status(500).json({ message: "Failed to rebuild asset manifest" });
    }
  });

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
        sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`,
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
        sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`,
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
      console.error(
        "🚨 ERROR in debug sales reps API:",
        getErrorMessage(error),
      );
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Get sales reps
  app.get("/api/sales-reps", requireAuth, async (req, res) => {
    console.log("🚨 SALES REPS API CALLED - Starting execution");

    try {
      console.log("📊 Sales reps API called by user:", req.user?.email);

      // Test database connection
      console.log("🔍 Testing database connection...");
      const testResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`,
      );
      console.log("📊 Sales reps count:", testResult.rows);

      // Join users to include name/email and HubSpot owner mapping
      const result = await db.execute(sql`
        SELECT 
          sr.id,
          sr.is_active,
          u.first_name,
          u.last_name,
          u.email,
          u.hubspot_user_id
        FROM sales_reps sr
        JOIN users u ON u.id = sr.user_id
        WHERE sr.is_active = true
        ORDER BY sr.id ASC
      `);

      console.log("📊 Raw sales reps from DB:", result.rows);

      // Transform to match expected frontend structure
      const salesReps = result.rows.map((rep: any) => ({
        id: rep.id,
        name: `${rep.first_name ?? ""} ${rep.last_name ?? ""}`.trim(),
        email: rep.email,
        isActive: rep.is_active,
        hubspotUserId: rep.hubspot_user_id || null,
      }));

      // TODO: Bonus tracking integration temporarily disabled until schema is updated
      // Check and award bonuses for eligible reps (run in background)
      // try {
      //   const { bonusTrackingService } = await import('./services/bonus-tracking.js');
      //   const currentMonth = new Date().toISOString().slice(0, 7);
      //
      //   // TODO: For now using placeholder values since client count columns need to be added to sales_reps table
      //   const repMetrics = result.rows.map((rep: any) => ({
      //     salesRepId: rep.id,
      //     salesRepName: `${rep.first_name} ${rep.last_name}`,
      //     clientsClosedThisMonth: 0, // TODO: Calculate from actual commission data
      //     totalClientsAllTime: 0, // TODO: Calculate from actual commission data
      //     currentMonth
      //   }));

      //   // Award bonuses in background (don't wait for completion)
      //   bonusTrackingService.checkAndAwardMonthlyBonuses(repMetrics).catch(error => {
      //     console.error('Background bonus tracking error:', error);
      //   });
      //
      //   bonusTrackingService.checkAndAwardMilestoneBonuses(repMetrics).catch(error => {
      //     console.error('Background milestone tracking error:', error);
      //   });
      // } catch (bonusError) {
      //   console.error('Bonus service error (non-blocking):', bonusError);
      // }

      console.log("📊 Transformed sales reps:", salesReps);
      console.log("🚨 RETURNING DATA:", JSON.stringify(salesReps));
      res.json(salesReps);
    } catch (error) {
      console.error("🚨 ERROR in sales reps API:", error);
      res
        .status(500)
        .json({
          message: "Failed to fetch sales reps",
          error: getErrorMessage(error),
        });
    }
  });

  // Get current user's sales rep profile
  app.get("/api/sales-reps/me", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return;
      }

      const salesRep = await storage.getSalesRepByUserId(req.user.id);
      res.json(salesRep || null);
    } catch (error) {
      console.error("Error fetching current sales rep:", error);
      res.status(500).json({ message: "Failed to fetch sales rep profile" });
    }
  });

  // Get commissions
  app.get("/api/commissions", requireAuth, async (req, res) => {
    try {
      const requestedSalesRepId =
        typeof req.query.salesRepId === "string"
          ? parseInt(req.query.salesRepId, 10)
          : undefined;

      let commissionsData: any[] = [];

      // Authorization and scoping rules for salesRepId
      if (requestedSalesRepId) {
        if (Number.isNaN(requestedSalesRepId)) {
          return res.status(400).json({ message: "Invalid salesRepId" });
        }
        // Non-admins can only request their own salesRepId
        if (req.user?.role !== "admin") {
          const myRep = await storage.getSalesRepByUserId(req.user!.id);
          if (!myRep || myRep.id !== requestedSalesRepId) {
            return res
              .status(403)
              .json({
                message: "Forbidden: cannot access other reps commissions",
              });
          }
        }

        // Normalized shape for specific sales rep
        const result = await db.execute(sql`
          SELECT 
            c.id,
            c.hubspot_invoice_id,
            c.sales_rep_id,
            c.type as commission_type,
            c.amount,
            c.status,
            c.month_number,
            c.service_type,
            c.date_earned,
            c.created_at,
            c.notes,
            COALESCE(hi.company_name, 'Unknown Company') as company_name,
            CONCAT(u.first_name, ' ', u.last_name) as sales_rep_name,
            string_agg(DISTINCT hil.name, ', ') as service_names
          FROM commissions c
          LEFT JOIN hubspot_invoices hi ON c.hubspot_invoice_id = hi.id
          LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
          LEFT JOIN users u ON sr.user_id = u.id
          LEFT JOIN hubspot_invoice_line_items hil ON hi.id = hil.invoice_id
          WHERE c.sales_rep_id = ${requestedSalesRepId}
          GROUP BY c.id, c.hubspot_invoice_id, c.sales_rep_id, c.type, c.amount, c.status, 
                   c.month_number, c.service_type, c.date_earned, c.created_at, c.notes,
                   hi.company_name, u.first_name, u.last_name
          ORDER BY c.created_at DESC
        `);
        commissionsData = result.rows;
      } else if (req.user && req.user.role === "admin") {
        // Admin users get all commissions with proper company/contact info
        const result = await db.execute(sql`
          SELECT 
            c.id,
            c.hubspot_invoice_id,
            c.sales_rep_id,
            c.type as commission_type,
            c.amount,
            c.status,
            c.month_number,
            c.service_type,
            c.date_earned,
            c.created_at,
            c.notes,
            COALESCE(hi.company_name, 'Unknown Company') as company_name,
            CONCAT(u.first_name, ' ', u.last_name) as sales_rep_name,
            string_agg(DISTINCT hil.name, ', ') as service_names
          FROM commissions c
          LEFT JOIN hubspot_invoices hi ON c.hubspot_invoice_id = hi.id
          LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
          LEFT JOIN users u ON sr.user_id = u.id
          LEFT JOIN hubspot_invoice_line_items hil ON hi.id = hil.invoice_id
          GROUP BY c.id, c.hubspot_invoice_id, c.sales_rep_id, c.type, c.amount, c.status, 
                   c.month_number, c.service_type, c.date_earned, c.created_at, c.notes,
                   hi.company_name, u.first_name, u.last_name
          ORDER BY c.created_at DESC
        `);
        commissionsData = result.rows;
      } else {
        // Regular users: scope to their own sales rep via users -> sales_reps
        const result = await db.execute(sql`
          SELECT 
            c.id,
            c.hubspot_invoice_id,
            c.sales_rep_id,
            c.type as commission_type,
            c.amount,
            c.status,
            c.month_number,
            c.service_type,
            c.date_earned,
            c.created_at,
            c.notes,
            COALESCE(hi.company_name, 'Unknown Company') as company_name,
            CONCAT(u.first_name, ' ', u.last_name) as sales_rep_name,
            string_agg(DISTINCT hil.name, ', ') as service_names
          FROM commissions c
          LEFT JOIN hubspot_invoices hi ON c.hubspot_invoice_id = hi.id
          LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
          LEFT JOIN users u ON sr.user_id = u.id
          LEFT JOIN hubspot_invoice_line_items hil ON hi.id = hil.invoice_id
          WHERE sr.user_id = ${req.user!.id}
          GROUP BY c.id, c.hubspot_invoice_id, c.sales_rep_id, c.type, c.amount, c.status, 
                   c.month_number, c.service_type, c.date_earned, c.created_at, c.notes,
                   hi.company_name, u.first_name, u.last_name
          ORDER BY c.created_at DESC
        `);
        commissionsData = result.rows;
      }

      // Group commissions by invoice and aggregate totals
      const invoiceGroups = new Map();

      commissionsData.forEach((comm: any) => {
        // Skip projection records from main commission tracking
        if (comm.commission_type === "projection") {
          return;
        }

        // Handle bonus records specially (they don't have invoice IDs)
        if (
          comm.commission_type === "monthly_bonus" ||
          comm.commission_type === "milestone_bonus"
        ) {
          const bonusKey = `bonus_${comm.id}`;
          invoiceGroups.set(bonusKey, {
            id: comm.id,
            dealId: null,
            dealName: comm.notes || "Bonus Commission",
            companyName: comm.notes || "Bonus Commission",
            salesRep: comm.sales_rep_name || "Unknown",
            serviceType: "bonus",
            type: "total",
            monthNumber: 1,
            amount: parseFloat(comm.amount || 0),
            status: comm.status || "pending",
            dateEarned: comm.date_earned
              ? new Date(comm.date_earned).toISOString().substring(0, 10)
              : null,
            datePaid: null,
            hubspotDealId: null,
            setupAmount: 0,
            month1Amount: parseFloat(comm.amount || 0),
            residualAmount: 0,
          });
          return;
        }

        const invoiceId = comm.hubspot_invoice_id;

        if (!invoiceGroups.has(invoiceId)) {
          // Determine service type based on line item names
          const serviceNames = (comm.service_names || "").toLowerCase();
          let serviceType = "bookkeeping"; // default

          const hasBookkeeping =
            serviceNames.includes("bookkeeping") ||
            serviceNames.includes("monthly") ||
            serviceNames.includes("clean") ||
            serviceNames.includes("catch");

          const hasTaas =
            serviceNames.includes("tax as a service") ||
            serviceNames.includes("prior year") ||
            serviceNames.includes("tax service");

          const hasPayroll = serviceNames.includes("payroll");
          const hasApAr =
            serviceNames.includes("ap/ar") ||
            serviceNames.includes("accounts payable") ||
            serviceNames.includes("accounts receivable");
          const hasFpa =
            serviceNames.includes("fp&a") ||
            serviceNames.includes("fpa") ||
            serviceNames.includes("financial planning");

          if (hasBookkeeping && hasTaas) {
            serviceType = "bookkeeping + taas";
          } else if (hasTaas) {
            serviceType = "taas";
          } else if (hasPayroll) {
            serviceType = "payroll";
          } else if (hasApAr) {
            serviceType = "ap/ar lite";
          } else if (hasFpa) {
            serviceType = "fp&a lite";
          } else if (hasBookkeeping) {
            serviceType = "bookkeeping";
          }

          invoiceGroups.set(invoiceId, {
            id: invoiceId,
            dealId: invoiceId,
            dealName: comm.service_names || `Invoice ${invoiceId}`,
            companyName: comm.company_name || "Unknown Company",
            salesRep: comm.sales_rep_name || "Unknown Rep",
            serviceType: serviceType,
            type: "total",
            monthNumber: 1,
            amount: 0,
            status: comm.status || "pending",
            dateEarned: comm.date_earned
              ? new Date(comm.date_earned).toISOString().substring(0, 10)
              : new Date(comm.created_at).toISOString().substring(0, 10),
            datePaid: comm.date_earned
              ? new Date(comm.date_earned).toISOString().substring(0, 10)
              : null,
            hubspotDealId: invoiceId,

            setupAmount: 0,
            month1Amount: 0,
            residualAmount: 0,
          });
        }

        const invoice = invoiceGroups.get(invoiceId);
        const amount = parseFloat((comm.amount || 0).toString());
        invoice.amount += amount;

        // Track breakdown by commission type
        if (comm.commission_type === "setup") {
          invoice.setupAmount += amount;
        } else if (comm.commission_type === "month_1") {
          invoice.month1Amount += amount;
        } else {
          invoice.residualAmount += amount;
        }
      });

      const commissionsWithDetails = Array.from(invoiceGroups.values());

      console.log(
        `📊 Returning ${commissionsWithDetails.length} commissions to frontend`,
      );
      console.log(
        "Commission sample:",
        JSON.stringify(commissionsWithDetails[0], null, 2),
      );
      res.set("Cache-Control", "no-cache");
      res.set("ETag", Date.now().toString());
      res.json(commissionsWithDetails);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      // Return empty array instead of 500 error to prevent console errors
      res.json([]);
    }
  });

  // Pipeline projections endpoint - optimized via BFF and Redis cache
  app.get("/api/pipeline-projections", requireAuth, async (req, res) => {
    try {
      const ownerId =
        typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
      const limit =
        typeof req.query.limit === "string"
          ? parseInt(req.query.limit, 10)
          : undefined;

      const key = cache.generateKey(CachePrefix.HUBSPOT_METRICS, {
        endpoint: "pipeline-projections",
        ownerId: ownerId || null,
        limit: limit ?? 200,
      });

      const data = await cache.wrap(
        key,
        () => dealsService.getDeals({ ownerId, limit: limit ?? 200 }),
        { ttl: CacheTTL.HUBSPOT_METRICS },
      );

      const mapped = data.deals.map((d: any) => {
        const amount = d.amount ? Number(d.amount) : 0;
        // Align to commission structure: treat pipeline amount as monthly fee; setup fee unknown (0)
        const proj = calculateProjectedCommission(0, amount, "bookkeeping");
        return {
          id: d.id,
          dealId: d.id,
          dealName: d.name || "Untitled Deal",
          companyName: d.companyName || "Unknown Company",
          salesRep: "Unknown Rep",
          dealValue: amount,
          dealStage: d.stage || "Unknown",
          projectedCommission: Math.round(proj.firstMonth * 100) / 100,
          setupCommission: 0,
          monthlyCommission: Math.round(proj.monthly * 100) / 100,
        };
      });

      res.json(mapped);
    } catch (error: any) {
      console.error("Pipeline projections error:", getErrorMessage(error));
      res
        .status(500)
        .json({
          status: "error",
          message:
            getErrorMessage(error) || "Failed to fetch pipeline projections",
        });
    }
  });

  // Commission approval endpoints
  app.post("/api/commissions/:id/approve", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const commissionId = req.params.id; // Keep as string since it's hubspot_invoice_id
      if (!commissionId) {
        return res.status(400).json({ message: "Invalid commission ID" });
      }

      console.log(
        `🔍 Attempting to approve commission with hubspot_invoice_id: ${commissionId}`,
      );

      // Update commission status to approved using hubspot_invoice_id
      const result = await db.execute(sql`
        UPDATE commissions 
        SET status = 'approved', 
            updated_at = NOW()
        WHERE hubspot_invoice_id = ${commissionId}
      `);

      console.log(
        `📊 Approve update result: rowCount = ${(result as any).rowCount}`,
      );

      if ((result as any).rowCount === 0) {
        return res.status(404).json({ message: "Commission not found" });
      }

      console.log(
        `✅ Commission ${commissionId} approved by ${req.user.email}`,
      );
      res.json({ success: true, message: "Commission approved successfully" });
    } catch (error) {
      console.error("Error approving commission:", error);
      res.status(500).json({ message: "Failed to approve commission" });
    }
  });

  app.post("/api/commissions/:id/reject", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const commissionId = req.params.id; // Keep as string since it's hubspot_invoice_id
      if (!commissionId) {
        return res.status(400).json({ message: "Invalid commission ID" });
      }

      console.log(
        `🔍 Attempting to reject commission with hubspot_invoice_id: ${commissionId}`,
      );

      // Update commission status to rejected and zero out the amount using hubspot_invoice_id
      const result = await db.execute(sql`
        UPDATE commissions 
        SET status = 'rejected', 
            amount = 0,
            updated_at = NOW()
        WHERE hubspot_invoice_id = ${commissionId}
      `);

      console.log(
        `📊 Reject update result: rowCount = ${(result as any).rowCount}`,
      );

      if ((result as any).rowCount === 0) {
        return res.status(404).json({ message: "Commission not found" });
      }

      console.log(
        `❌ Commission ${commissionId} rejected and zeroed out by ${req.user.email}`,
      );
      res.json({
        success: true,
        message: "Commission rejected and amount zeroed out",
      });
    } catch (error) {
      console.error("Error rejecting commission:", error);
      res.status(500).json({ message: "Failed to reject commission" });
    }
  });

  app.post("/api/commissions/:id/unreject", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const commissionId = req.params.id; // Keep as string since it's hubspot_invoice_id
      if (!commissionId) {
        return res.status(400).json({ message: "Invalid commission ID" });
      }

      console.log(
        `🔍 Attempting to unreject commission with hubspot_invoice_id: ${commissionId}`,
      );

      // First, get the original commission amount before it was rejected
      const originalResult = await db.execute(sql`
        SELECT c.id, c.amount, c.status, hi.total_amount
        FROM commissions c
        LEFT JOIN hubspot_invoices hi ON c.hubspot_invoice_id = hi.id
        WHERE c.hubspot_invoice_id = ${commissionId}
        LIMIT 1
      `);

      if (originalResult.rows.length === 0) {
        return res.status(404).json({ message: "Commission not found" });
      }

      const originalCommission = originalResult.rows[0] as any;

      // Calculate what the commission amount should be based on the invoice
      // For now, we'll need to recalculate or use the original invoice amount
      // This is a simplified approach - you might want to store the original amount separately
      let restoredAmount = originalCommission.total_amount
        ? parseFloat(originalCommission.total_amount) * 0.2
        : 100; // Default fallback

      // Update commission status back to pending and restore a reasonable amount
      const updateResult = await db.execute(sql`
        UPDATE commissions 
        SET status = 'pending', 
            amount = ${restoredAmount},
            updated_at = NOW()
        WHERE hubspot_invoice_id = ${commissionId}
      `);

      console.log(
        `📊 Unreject update result: rowCount = ${(updateResult as any).rowCount}`,
      );

      if ((updateResult as any).rowCount === 0) {
        return res.status(404).json({ message: "Commission not found" });
      }

      console.log(
        `🔄 Commission ${commissionId} unrejected and amount restored to $${restoredAmount} by ${req.user.email}`,
      );
      return res.json({
        success: true,
        message: "Commission successfully restored to pending status",
      });
    } catch (error) {
      console.error("Error unrejecting commission:", error);
      return res.status(500).json({ message: "Failed to unreject commission" });
    }
  });

  // Initialize HubSpot sync on server startup
  async function initializeHubSpotSync() {
    try {
      console.log("🚀 Starting initial HubSpot commission sync...");
      if (!db) {
        console.warn("DB not configured; skipping initial HubSpot sync");
        return;
      }

      // Check if we already have data
      const existingData = await db.execute(
        sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`,
      );
      const salesRepCount = (existingData.rows[0] as any).count;

      if (salesRepCount === 0) {
        console.log("📦 No existing data found. Performing full sync...");
        const results = await hubspotSync.performFullSync();
        console.log("✅ Initial HubSpot sync completed:", results);
      } else {
        console.log(
          `📊 Found ${salesRepCount} existing sales reps. Skipping initial sync.`,
        );
      }
    } catch (error) {
      console.error("❌ Initial HubSpot sync failed:", error);
      // Don't fail server startup if sync fails
    }
  }

  // Trigger initial sync after a short delay to ensure server is ready
  setTimeout(initializeHubSpotSync, 3000);

  // Debug endpoint to directly search HubSpot invoices
  app.get("/api/debug/hubspot-invoices", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Use singleton HubSpot service
      if (!hubSpotService)
        return res
          .status(500)
          .json({ message: "HubSpot integration not configured" });
      const hubspotService = hubSpotService;

      console.log("🔍 Searching for invoices via façade methods...");

      // Approach 1: List invoices via façade helper
      const invoices1 = await hubspotService.listInvoices(100);

      // Approach 2: Use the same helper (placeholder for alternate property sets)
      const invoices2 = await hubspotService.listInvoices(100);

      // Approach 3: Gather line items for a sample of invoices
      const sampleInvoices = (invoices1 || []).slice(0, 10);
      const lineItemsNested = await Promise.all(
        sampleInvoices.map((inv: any) =>
          hubspotService.getInvoiceLineItems(String(inv.id)),
        ),
      );
      const lineItems = ([] as any[]).concat(...lineItemsNested);

      // Approach 4: Products via products service cache
      const products = await hubspotService.getProductsCached();

      const foundData = {
        invoices_approach1: invoices1,
        invoices_approach2: invoices2,
        line_items: lineItems,
        products: products || [],
        summary: {
          invoices_count_approach1: invoices1?.length || 0,
          invoices_count_approach2: invoices2?.length || 0,
          line_items_count: lineItems.length,
          products_count: Array.isArray(products) ? products.length : 0,
          total_found:
            (invoices1?.length || 0) +
            (invoices2?.length || 0) +
            lineItems.length +
            (Array.isArray(products) ? products.length : 0),
        },
      } as const;

      console.log("📊 HubSpot Invoice Search Results:", foundData.summary);

      return res.json(foundData);
    } catch (error) {
      console.error("❌ Error searching HubSpot invoices:", error);
      return res
        .status(500)
        .json({
          message: "Failed to search HubSpot invoices",
          error: getErrorMessage(error),
        });
    }
  });

  // Sync real commission data from HubSpot invoices using our comprehensive sync system
  app.post("/api/commissions/sync-hubspot", requireAuth, async (req, res) => {
    try {
      // Only allow admin users to trigger sync
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log(
        "🔄 Starting comprehensive HubSpot sync with real invoice data...",
      );

      // Use our dedicated HubSpot sync class with detailed logging
      const results = await hubspotSync.performFullSync();

      console.log("✅ HubSpot sync completed with results:", results);

      return res.json({
        success: true,
        message: "Real HubSpot commission data synced successfully",
        results: {
          salesRepsProcessed: results.salesReps,
          invoicesProcessed: (results as any).invoices || 0,
          dealsProcessed: 0, // We're using invoices now, not deals
          commissionsCreated: results.commissions,
        },
      });
    } catch (error) {
      console.error("❌ HubSpot sync failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to sync HubSpot data",
        error: getErrorMessage(error),
      });
    }
  });

  // Get monthly bonuses
  app.get("/api/monthly-bonuses", requireAuth, async (req, res) => {
    try {
      const { salesRepId } = req.query;

      let bonuses: any[];
      if (salesRepId) {
        bonuses = await storage.getMonthlyBonusesBySalesRep(
          parseInt(salesRepId as string),
        );
      } else {
        // If no specific sales rep, try to get for current user
        const salesRep = await storage.getSalesRepByUserId(req.user!.id);
        if (salesRep) {
          bonuses = await storage.getMonthlyBonusesBySalesRep(salesRep.id);
        } else {
          bonuses = [];
        }
      }

      res.json(bonuses);
    } catch (error) {
      console.error("Error fetching monthly bonuses:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to fetch monthly bonuses" });
    }
  });

  // Get milestone bonuses
  app.get("/api/milestone-bonuses", requireAuth, async (req, res) => {
    try {
      const { salesRepId } = req.query;

      let bonuses: any[];
      if (salesRepId) {
        bonuses = await storage.getMilestoneBonusesBySalesRep(
          parseInt(salesRepId as string),
        );
      } else {
        // If no specific sales rep, try to get for current user
        const salesRep = await storage.getSalesRepByUserId(req.user!.id);
        if (salesRep) {
          bonuses = await storage.getMilestoneBonusesBySalesRep(salesRep.id);
        } else {
          bonuses = [];
        }
      }

      res.json(bonuses);
    } catch (error) {
      console.error(
        "Error fetching milestone bonuses:",
        getErrorMessage(error),
      );
      res.status(500).json({ message: "Failed to fetch milestone bonuses" });
    }
  });

  // Process HubSpot invoices endpoint (for admin button)
  app.post(
    "/api/commissions/process-hubspot",
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }

        // Calculate current period (14th to 13th cycle)
        const getCurrentPeriod = (): { periodStart: string; periodEnd: string } => {
          const today = new Date();
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          const currentDay = today.getDate();

          let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;

          if (currentDay >= 14) {
            periodStartMonth = currentMonth;
            periodStartYear = currentYear;
            periodEndMonth = currentMonth + 1;
            periodEndYear = currentYear;

            if (periodEndMonth > 11) {
              periodEndMonth = 0;
              periodEndYear = currentYear + 1;
            }
          } else {
            periodStartMonth = currentMonth - 1;
            periodStartYear = currentYear;
            periodEndMonth = currentMonth;
            periodEndYear = currentYear;

            if (periodStartMonth < 0) {
              periodStartMonth = 11;
              periodStartYear = currentYear - 1;
            }
          }

          const periodStart = new Date(periodStartYear, periodStartMonth, 14);
          const periodEnd = new Date(periodEndYear, periodEndMonth, 13);

          return {
            periodStart: periodStart.toISOString().substring(0, 10),
            periodEnd: periodEnd.toISOString().substring(0, 10),
          };
        };

        const currentPeriod = getCurrentPeriod();

        // Import commission calculator and HubSpot facade (P0 vertical slice)
        const { calculateCommissionFromInvoice } = await import(
          "../shared/commission-calculator.js"
        );
        const hubspotFacade = await import("./services/hubspot/index.js");

        // Get all paid invoices from HubSpot for the current period (all reps)
        const paidInvoices = await hubspotFacade.getPaidInvoicesInPeriod(
          currentPeriod.periodStart,
          currentPeriod.periodEnd,
        );

        console.log(
          `🧾 Admin processing: Found ${paidInvoices.length} total paid invoices for all reps`,
        );

        // Map HubSpot owner -> User -> SalesRep
        const [allUsers, allSalesReps] = await Promise.all([
          storage.getAllUsers(),
          storage.getAllSalesReps(),
        ]);
        const userByHsId = new Map(
          (allUsers || [])
            .filter((u) => u.hubspotUserId)
            .map((u) => [u.hubspotUserId as string, u]),
        );
        const repByUserId = new Map(
          (allSalesReps || []).map((rep) => [rep.userId, rep]),
        );

        // Process each invoice and store commission records
        let processedInvoices = 0;
        let totalCommissions = 0;

        for (const invoice of paidInvoices) {
          try {
            // Resolve sales rep from HubSpot owner
            const ownerHsId =
              invoice.owner_id ||
              invoice.hubspot_owner_id ||
              invoice.properties?.hubspot_owner_id;
            const user = ownerHsId
              ? userByHsId.get(String(ownerHsId))
              : undefined;
            const salesRep = user ? repByUserId.get(user.id) : undefined;
            if (!salesRep) {
              console.log(
                `⚠️ No sales rep found for HubSpot owner ID: ${ownerHsId}`,
              );
              continue;
            }

            // Calculate commission using shared function (synthetic line item)
            const lineItem = {
              description:
                invoice.description || invoice.name || "Invoice payment",
              quantity: 1,
              price: Number(
                invoice.amount ||
                  invoice.total_amount ||
                  invoice.properties?.hs_invoice_total_amount ||
                  0,
              ),
            };
            const totalAmount = Number(
              invoice.total_amount ||
                invoice.amount ||
                invoice.properties?.hs_invoice_total_amount ||
                0,
            );
            const commissionResult = calculateCommissionFromInvoice(
              lineItem,
              totalAmount,
            );

            // Store commission using InsertCommission shape
            await storage.createCommission({
              salesRepId: salesRep.id,
              type: commissionResult.type,
              amount: commissionResult.amount.toFixed(2),
              monthNumber: commissionResult.type === "monthly" ? 1 : 0,
              dateEarned: new Date(
                invoice.date_paid ||
                  invoice.properties?.hs_invoice_paid_date ||
                  Date.now(),
              ),
              serviceType: null,
              notes: `Processed from HubSpot invoice: ${invoice.id}`,
            });
            processedInvoices++;
            totalCommissions += commissionResult.amount;
            console.log(
              `✅ Processed invoice ${invoice.id}: $${commissionResult.amount} commission for SalesRep ${salesRep.id}`,
            );
          } catch (error) {
            console.error(
              `❌ Error processing invoice ${invoice.id}:`,
              getErrorMessage(error),
            );
          }
        }

        return res.json({
          success: true,
          processed_invoices: processedInvoices,
          total_invoices: paidInvoices.length,
          total_commissions: totalCommissions,
          period: currentPeriod,
        });
      } catch (error) {
        console.error(
          "🚨 Error processing HubSpot commissions:",
          getErrorMessage(error),
        );
        return res.status(500).json({
          message: "Failed to process HubSpot commissions",
          error: getErrorMessage(error),
        });
      }
    },
  );

  // Admin endpoint: Process all HubSpot commissions and store in database
  app.post(
    "/api/admin/commissions/process-hubspot",
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== "admin") {
          res.status(403).json({ message: "Admin access required" });
          return;
        }

        // Calculate current period (14th to 13th cycle)
        const getCurrentPeriod = (): { periodStart: string; periodEnd: string } => {
          const today = new Date();
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          const currentDay = today.getDate();

          let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;

          if (currentDay >= 14) {
            // We're in the current period (14th of this month to 13th of next month)
            periodStartMonth = currentMonth;
            periodStartYear = currentYear;
            periodEndMonth = currentMonth + 1;
            periodEndYear = currentYear;

            // Handle year rollover
            if (periodEndMonth > 11) {
              periodEndMonth = 0;
              periodEndYear = currentYear + 1;
            }
          } else {
            // We're in the previous period (14th of last month to 13th of this month)
            periodStartMonth = currentMonth - 1;
            periodStartYear = currentYear;
            periodEndMonth = currentMonth;
            periodEndYear = currentYear;

            // Handle year rollover
            if (periodStartMonth < 0) {
              periodStartMonth = 11;
              periodStartYear = currentYear - 1;
            }
          }

          const periodStart = new Date(periodStartYear, periodStartMonth, 14);
          const periodEnd = new Date(periodEndYear, periodEndMonth, 13);

          return {
            periodStart: periodStart.toISOString().substring(0, 10),
            periodEnd: periodEnd.toISOString().substring(0, 10),
          };
        };

        const currentPeriod = getCurrentPeriod();

        // Import HubSpot service and commission calculator
        // Use singleton HubSpot service and commission calculator
        const { calculateCommissionFromInvoice } = await import(
          "../shared/commission-calculator.js"
        );
        if (!hubSpotService)
          return res
            .status(500)
            .json({ message: "HubSpot integration not configured" });
        const hubspotService = hubSpotService;

        // Get all paid invoices from HubSpot for the current period (all reps)
        const paidInvoices = await hubspotService.getPaidInvoicesInPeriod(
          currentPeriod.periodStart,
          currentPeriod.periodEnd,
        );

        console.log(
          `🧾 Admin processing: Found ${paidInvoices.length} total paid invoices for all reps`,
        );

        // Map HubSpot owner -> User -> SalesRep
        const [allUsers, allSalesReps] = await Promise.all([
          storage.getAllUsers(),
          storage.getAllSalesReps(),
        ]);
        const userByHsId = new Map(
          (allUsers || [])
            .filter((u) => u.hubspotUserId)
            .map((u) => [u.hubspotUserId as string, u]),
        );
        const repByUserId = new Map(
          (allSalesReps || []).map((rep) => [rep.userId, rep]),
        );

        // Process each invoice and store commission records
        const processedCommissions = [];
        let totalProcessed = 0;

        for (const invoice of paidInvoices) {
          // Find the sales rep for this invoice
          const ownerHsId =
            invoice.properties?.hubspot_owner_id ||
            invoice.properties?.hs_owner_id ||
            invoice.properties?.owner_id;
          const user = ownerHsId
            ? userByHsId.get(String(ownerHsId))
            : undefined;
          const salesRep = user ? repByUserId.get(user.id) : undefined;
          if (!salesRep) {
            console.log(
              `⚠️ No sales rep found for HubSpot owner ID: ${ownerHsId}`,
            );
            continue;
          }

          // Fetch line items for this invoice via HubSpot service
          const lineItems = await hubspotService.getInvoiceLineItems(
            String(invoice.id),
          );
          for (const li of lineItems) {
            const lineItem = {
              description:
                li.properties?.description ||
                li.properties?.name ||
                "Line Item",
              quantity: li.properties?.quantity
                ? Number(li.properties.quantity)
                : 1,
              price: li.properties?.price
                ? Number(li.properties.price)
                : Number(li.properties?.amount || 0),
            };
            const totalAmount = Number(
              invoice.properties?.hs_invoice_total_amount ||
                invoice.properties?.amount ||
                0,
            );
            const commission = calculateCommissionFromInvoice(
              lineItem,
              totalAmount,
            );

            if (commission.amount > 0) {
              // Store commission in database using InsertCommission shape
              const storedCommission = await storage.createCommission({
                salesRepId: salesRep.id,
                type: commission.type,
                amount: commission.amount.toFixed(2),
                monthNumber: commission.type === "monthly" ? 1 : 0,
                dateEarned: new Date(
                  invoice.properties?.hs_invoice_paid_date || Date.now(),
                ),
                serviceType: null,
                notes: `Invoice ${invoice.properties?.hs_invoice_number || invoice.id}`,
              });
              processedCommissions.push(storedCommission);
              totalProcessed++;
            }
          }
        }

        console.log(
          `✅ Admin processing complete: ${totalProcessed} commission records stored`,
        );

        return res.json({
          success: true,
          period: currentPeriod,
          invoices_processed: paidInvoices.length,
          commissions_created: totalProcessed,
          total_commission_amount: processedCommissions.reduce(
            (sum, c) => sum + parseFloat((c as any).amount),
            0,
          ),
          processed_commissions: processedCommissions,
        });
      } catch (error) {
        console.error("🚨 Error processing HubSpot commissions:", error);
        return res.status(500).json({
          message: "Failed to process HubSpot commissions",
          error: getErrorMessage(error),
        });
      }
    },
  );

  // Get current period commission summary for individual rep (reads from stored data)
  app.get(
    "/api/commissions/current-period-summary",
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user) {
          res.status(401).json({ message: "User not authenticated" });
          return;
        }

        // Get the current user's sales rep profile
        const salesRep = await storage.getSalesRepByUserId(req.user.id);
        if (!salesRep) {
          res.status(404).json({ message: "Sales rep profile not found" });
          return;
        }

        // Calculate current period (14th to 13th cycle)
        const getCurrentPeriod = (): { periodStart: string; periodEnd: string } => {
          const today = new Date();
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          const currentDay = today.getDate();

          let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;

          if (currentDay >= 14) {
            periodStartMonth = currentMonth;
            periodStartYear = currentYear;
            periodEndMonth = currentMonth + 1;
            periodEndYear = currentYear;

            if (periodEndMonth > 11) {
              periodEndMonth = 0;
              periodEndYear = currentYear + 1;
            }
          } else {
            periodStartMonth = currentMonth - 1;
            periodStartYear = currentYear;
            periodEndMonth = currentMonth;
            periodEndYear = currentYear;

            if (periodStartMonth < 0) {
              periodStartMonth = 11;
              periodStartYear = currentYear - 1;
            }
          }

          const periodStart = new Date(periodStartYear, periodStartMonth, 14);
          const periodEnd = new Date(periodEndYear, periodEndMonth, 13);

          return {
            periodStart: periodStart.toISOString().substring(0, 10),
            periodEnd: periodEnd.toISOString().substring(0, 10),
          };
        };

        const currentPeriod = getCurrentPeriod();

        // Get stored commissions for this rep in the current period
        const storedCommissions = await storage.getCommissionsBySalesRep(
          salesRep.id,
        );
        const startStr: string = currentPeriod.periodStart;
        const endStr: string = currentPeriod.periodEnd;
        const periodStartDate = new Date(startStr);
        const periodEndDate = new Date(endStr);
        const currentPeriodCommissions = storedCommissions.filter(
          (comm: any) => {
            const earned = new Date(comm.dateEarned);
            return earned >= periodStartDate && earned <= periodEndDate;
          },
        );

        // Calculate summary metrics
        const totalCommissions = currentPeriodCommissions.reduce(
          (sum: number, comm: any) => sum + parseFloat(comm.amount),
          0,
        );
        const setupCommissions = currentPeriodCommissions
          .filter((comm) => comm.type === "setup")
          .reduce((sum: number, comm: any) => sum + parseFloat(comm.amount), 0);
        const monthlyCommissions = currentPeriodCommissions
          .filter((comm) => comm.type === "monthly")
          .reduce((sum: number, comm: any) => sum + parseFloat(comm.amount), 0);

        const result = {
          period_start: currentPeriod.periodStart,
          period_end: currentPeriod.periodEnd,
          total_commissions: totalCommissions,
          setup_commissions: setupCommissions,
          monthly_commissions: monthlyCommissions,
          invoice_count: currentPeriodCommissions.length,
          subscription_count: 0, // TODO: Get from HubSpot subscriptions
          last_processed: new Date().toISOString(),
          data_source: "stored_commissions",
        };

        const parsed = CommissionSummarySchema.safeParse(result);
        if (!parsed.success) {
          console.error(
            "Invalid CommissionSummary payload:",
            parsed.error.issues,
          );
          return res
            .status(500)
            .json({
              status: "error",
              message: "Invalid commission summary payload",
            });
        }
        return res.json(parsed.data);
      } catch (error) {
        console.error(
          "🚨 Error fetching current period commission summary:",
          error,
        );
        return res.status(500).json({
          message: "Failed to fetch commission summary",
          error: getErrorMessage(error),
        });
      }
    },
  );

  // Get HubSpot-based commissions for current period (for individual rep dashboard)
  app.get(
    "/api/commissions/hubspot/current-period",
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user) {
          res.status(401).json({ message: "User not authenticated" });
          return;
        }

        // Get the current user's sales rep profile
        const salesRep = await storage.getSalesRepByUserId(req.user.id);
        if (!salesRep) {
          res.status(404).json({ message: "Sales rep profile not found" });
          return;
        }

        // Calculate current period (14th to 13th cycle)
        const getCurrentPeriod = (): { periodStart: string; periodEnd: string } => {
          const today = new Date();
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          const currentDay = today.getDate();

          let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;

          if (currentDay >= 14) {
            // We're in the current period (14th of this month to 13th of next month)
            periodStartMonth = currentMonth;
            periodStartYear = currentYear;
            periodEndMonth = currentMonth + 1;
            periodEndYear = currentYear;

            // Handle year rollover
            if (periodEndMonth > 11) {
              periodEndMonth = 0;
              periodEndYear = currentYear + 1;
            }
          } else {
            // We're in the previous period (14th of last month to 13th of this month)
            periodStartMonth = currentMonth - 1;
            periodStartYear = currentYear;
            periodEndMonth = currentMonth;
            periodEndYear = currentYear;

            // Handle year rollover
            if (periodStartMonth < 0) {
              periodStartMonth = 11;
              periodStartYear = currentYear - 1;
            }
          }

          const periodStart = new Date(periodStartYear, periodStartMonth, 14);
          const periodEnd = new Date(periodEndYear, periodEndMonth, 13);

          return {
            periodStart: periodStart.toISOString().substring(0, 10),
            periodEnd: periodEnd.toISOString().substring(0, 10),
          };
        };

        const currentPeriod = getCurrentPeriod();

        // Use singleton HubSpot service
        if (!hubSpotService)
          return res
            .status(500)
            .json({ message: "HubSpot integration not configured" });
        const hubspotService = hubSpotService;

        // Get paid invoices from HubSpot for the current period
        // Filter by sales rep and date range
        const currentUser = await storage.getUserByEmail(req.user.email);
        const paidInvoices = await hubspotService.getPaidInvoicesInPeriod(
          currentPeriod.periodStart,
          currentPeriod.periodEnd,
          currentUser?.hubspotUserId || undefined,
        );

        console.log(
          `🧾 Found ${paidInvoices.length} paid invoices for commission calculation`,
        );

        // Calculate commissions based on invoice line items
        let totalCommissions = 0;
        const commissionBreakdown = [];

        for (const invoice of paidInvoices) {
          const lineItems = await hubspotService.getInvoiceLineItems(
            invoice.id,
          );
          console.log(
            `📋 Processing ${lineItems.length} line items for invoice ${invoice.properties?.hs_invoice_number}`,
          );

          for (const lineItem of lineItems) {
            const itemName = (lineItem.properties?.name || "").toLowerCase();
            const itemDescription = (
              lineItem.properties?.description || ""
            ).toLowerCase();
            const itemAmount = parseFloat(lineItem.properties?.amount || "0");

            // Apply commission calculations based on service type:
            // - Setup/Prior Years/Clean up = 20%
            // - 40% of MRR month 1
            // - 10% months 2-12 (residual)

            let commission = 0;
            let commissionType = "";
            let serviceType = "recurring"; // default

            // Determine service type from line item name/description
            if (
              itemName.includes("setup") ||
              itemName.includes("implementation") ||
              itemDescription.includes("setup")
            ) {
              serviceType = "setup";
              commission = itemAmount * 0.2;
              commissionType = "setup_commission";
            } else if (
              itemName.includes("cleanup") ||
              itemName.includes("clean up") ||
              itemDescription.includes("cleanup")
            ) {
              serviceType = "cleanup";
              commission = itemAmount * 0.2;
              commissionType = "cleanup_commission";
            } else if (
              itemName.includes("prior year") ||
              itemName.includes("catch up") ||
              itemDescription.includes("prior year")
            ) {
              serviceType = "prior_years";
              commission = itemAmount * 0.2;
              commissionType = "prior_years_commission";
            } else if (lineItem.properties?.hs_recurring_billing_period) {
              // This is a recurring item - check if it's month 1 or residual
              serviceType = "recurring";
              // For now, assume first payment is month 1 (40%), could enhance this logic
              commission = itemAmount * 0.4;
              commissionType = "month_1_commission";
            } else {
              // Default to month 1 recurring for unidentified items
              serviceType = "recurring";
              commission = itemAmount * 0.4;
              commissionType = "month_1_commission";
            }

            totalCommissions += commission;
            commissionBreakdown.push({
              invoice_id: invoice.id,
              invoice_number: invoice.properties?.hs_invoice_number,
              line_item_name: lineItem.properties?.name,
              line_item_amount: itemAmount,
              service_type: serviceType,
              commission_amount: commission,
              commission_type: commissionType,
              paid_date: invoice.properties?.hs_invoice_paid_date,
            });
          }
        }

        // Also fetch subscription payments for residual commissions (months 2-12)
        const activeSubscriptions = await hubspotService.getActiveSubscriptions(
          currentUser?.hubspotUserId || undefined,
        );
        console.log(
          `🔄 Found ${activeSubscriptions.length} active subscriptions for residual commission calculation`,
        );

        for (const subscription of activeSubscriptions) {
          const payments = await hubspotService.getSubscriptionPaymentsInPeriod(
            subscription.id,
            currentPeriod.periodStart,
            currentPeriod.periodEnd,
          );

          for (const payment of payments) {
            const paymentAmount = parseFloat(
              payment.properties?.hs_invoice_total_amount || "0",
            );
            // 10% commission for months 2-12
            const commission = paymentAmount * 0.1;

            totalCommissions += commission;
            commissionBreakdown.push({
              subscription_id: subscription.id,
              invoice_number: payment.properties?.hs_invoice_number,
              line_item_name: "Subscription Payment (Month 2-12)",
              line_item_amount: paymentAmount,
              service_type: "recurring_residual",
              commission_amount: commission,
              commission_type: "residual_commission",
              paid_date: payment.properties?.hs_invoice_paid_date,
            });
          }
        }

        return res.json({
          period_start: currentPeriod.periodStart,
          period_end: currentPeriod.periodEnd,
          sales_rep: {
            id: salesRep.id,
            name: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
            email: req.user.email,
          },
          total_commissions: totalCommissions,
          invoice_count: paidInvoices.length,
          subscription_count: activeSubscriptions.length,
          deal_count: paidInvoices.length + activeSubscriptions.length, // For backward compatibility
          commission_breakdown: commissionBreakdown,
          data_source: "hubspot_invoices_live",
        });
      } catch (error) {
        console.error("Error fetching HubSpot commission data:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch commission data from HubSpot" });
      }
    },
  );

  // Update commission status
  app.patch("/api/commissions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid commission ID" });
        return;
      }

      const updatedCommission = await storage.updateCommission(id, updateData);
      res.json(updatedCommission);
    } catch (error) {
      console.error("Error updating commission:", error);
      res.status(500).json({ message: "Failed to update commission" });
    }
  });

  // Commission Adjustments endpoints
  app.get("/api/commission-adjustments", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ message: "Admin access required" });
        return;
      }

      const adjustments = await storage.getAllCommissionAdjustments();
      res.json(adjustments);
    } catch (error) {
      console.error("Error fetching commission adjustments:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch commission adjustments" });
    }
  });

  app.post("/api/commission-adjustments", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const { commissionId, originalAmount, requestedAmount, reason } =
        req.body;

      if (!commissionId || !originalAmount || !requestedAmount || !reason) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      // Determine adjustment type based on user role
      const adjustmentType = req.user.role === "admin" ? "direct" : "request";
      const status = req.user.role === "admin" ? "approved" : "pending";

      const adjustmentData = {
        commissionId: parseInt(commissionId),
        requestedBy: req.user.id,
        originalAmount: String(parseFloat(originalAmount).toFixed(2)),
        requestedAmount: String(parseFloat(requestedAmount).toFixed(2)),
        reason,
        type: adjustmentType,
        status,
        ...(req.user.role === "admin" && {
          approvedBy: req.user.id,
          finalAmount: String(parseFloat(requestedAmount).toFixed(2)),
          reviewedDate: new Date(),
        }),
      };

      const adjustment =
        await storage.createCommissionAdjustment(adjustmentData);

      // If admin creates direct adjustment, also update the commission amount
      if (req.user.role === "admin") {
        await storage.updateCommission(parseInt(commissionId), {
          amount: String(parseFloat(requestedAmount).toFixed(2)),
        });
      }

      res.json(adjustment);
    } catch (error) {
      console.error(
        "Error creating commission adjustment:",
        getErrorMessage(error),
      );
      res
        .status(500)
        .json({ message: "Failed to create commission adjustment" });
    }
  });

  app.patch(
    "/api/commission-adjustments/:id",
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== "admin") {
          res.status(403).json({ message: "Admin access required" });
          return;
        }

        const id = parseInt(req.params.id);
        const { status, finalAmount, notes } = req.body;

        if (isNaN(id)) {
          res.status(400).json({ message: "Invalid adjustment ID" });
          return;
        }

        const adjustment = await storage.updateCommissionAdjustmentStatus(
          id,
          status,
          req.user.id,
          finalAmount ? parseFloat(finalAmount) : undefined,
          notes,
        );

        // If approved, update the actual commission amount
        if (status === "approved" && finalAmount) {
          await storage.updateCommission(adjustment.commissionId, {
            amount: String(parseFloat(finalAmount).toFixed(2)),
          });
        }

        res.json(adjustment);
      } catch (error) {
        console.error(
          "Error updating commission adjustment:",
          getErrorMessage(error),
        );
        res
          .status(500)
          .json({ message: "Failed to update commission adjustment" });
      }
    },
  );

  // App namespace aliases for SeedPay (Commission Tracker)
  app.get("/api/apps/seedpay/deals", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/deals${q}`);
  });

  app.get("/api/apps/seedpay/deals/by-owner", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/deals/by-owner${q}`);
  });

  app.get("/api/apps/seedpay/commissions", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/commissions${q}`);
  });

  app.get(
    "/api/apps/seedpay/commissions/current-period-summary",
    requireAuth,
    (req, res) => {
      const q = req.originalUrl.includes("?")
        ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
        : "";
      res.redirect(307, `/api/commissions/current-period-summary${q}`);
    },
  );

  app.get("/api/apps/seedpay/monthly-bonuses", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/monthly-bonuses${q}`);
  });

  app.get("/api/apps/seedpay/milestone-bonuses", requireAuth, (req, res) => {
    const q = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(307, `/api/milestone-bonuses${q}`);
  });

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
