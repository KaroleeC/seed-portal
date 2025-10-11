/**
 * Calculator Router
 *
 * Handles pricing calculations and quote management
 */

import { Router } from "express";
import { z } from "zod";
import { calculateQuotePricing } from "../../shared/pricing.js";
import { buildServiceConfig } from "../services/hubspot/compose.js";
import { storage } from "../storage.js";
import { requireAuth, asyncHandler, handleError, validateBody } from "./_shared";
import { pricingConfigService } from "../pricing-config.js";
import { CalculatorContentResponseSchema, PricingConfigSchema } from "@shared/contracts";
import { withETag } from "../middleware/etag.js";

const router = Router();

// ============================================================================
// SCHEMAS
// ============================================================================

const calculatePricingSchema = z.object({
  // Allow any pricing data - validation happens in pricing.ts
  data: z.record(z.any()),
});

const saveQuoteSchema = z.object({
  // Quote data fields
  email: z.string().email().optional(),
  companyName: z.string().optional(),
  // ... other fields validated by storage layer
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/calculator/pricing
 * Calculate pricing for given inputs
 */
router.post(
  "/api/calculator/pricing",
  asyncHandler(async (req, res) => {
    try {
      const result = calculateQuotePricing(req.body);
      res.json(result);
    } catch (error) {
      console.error("🚨 Pricing calculation failed:", error);
      handleError(error, res, "Pricing Calculation");
    }
  })
);

/**
 * POST /api/quotes
 * Create a new quote
 */
router.post(
  "/api/quotes",
  asyncHandler(async (req, res) => {
    try {
      // Calculate pricing
      const calc = calculateQuotePricing(req.body);

      // Prepare quote data with calculated fees
      const quoteData = {
        ...req.body,
        monthlyFee: String(calc.combined.monthlyFee),
        setupFee: String(calc.combined.setupFee),
        taasMonthlyFee: String(calc.taas.monthlyFee),
        status: "draft",
      };

      // Save to database
      const quote = await storage.createQuote(quoteData);

      res.status(201).json({
        success: true,
        quote,
        pricing: calc,
      });
    } catch (error) {
      console.error("🚨 Quote creation failed:", error);
      handleError(error, res, "Quote Creation");
    }
  })
);

/**
 * GET /api/quotes/:id
 * Get a quote by ID
 */
router.get(
  "/api/quotes/:id",
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id!, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid quote ID" });
    }

    const quote = await storage.getQuote(id);

    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    res.json(quote);
  })
);

/**
 * PUT /api/quotes/:id
 * Update a quote
 */
router.put(
  "/api/quotes/:id",
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id!, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid quote ID" });
    }

    try {
      // Get existing quote
      const existing = await storage.getQuote(id);
      if (!existing) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Recalculate pricing with updated data
      const calcInput = { ...existing, ...req.body };
      const cfg = buildServiceConfig(calcInput);

      // Prepare updated quote data
      const quoteData = {
        ...req.body,
        id,
        monthlyFee: cfg.fees.combinedMonthly.toFixed(2),
        setupFee: cfg.fees.combinedOneTimeFees.toFixed(2),
        taasMonthlyFee: cfg.fees.taasMonthly.toFixed(2),
        taasPriorYearsFee: cfg.fees.priorYearFilings.toFixed(2),
      };

      // Update in database
      const quote = await storage.updateQuote(quoteData);

      res.json({
        success: true,
        quote,
      });
    } catch (error) {
      console.error("🚨 Quote update failed:", error);
      handleError(error, res, "Quote Update");
    }
  })
);

/**
 * GET /api/quotes
 * List all quotes (with optional filtering)
 */
router.get(
  "/api/quotes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, email, limit = "50", offset = "0" } = req.query;

    // TODO: Implement listQuotes method in storage
    // For now, return empty array
    const quotes: any[] = [];

    res.json({
      quotes,
      pagination: {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  })
);

/**
 * DELETE /api/quotes/:id
 * Delete a quote
 */
router.delete(
  "/api/quotes/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id!, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid quote ID" });
    }

    // TODO: Implement deleteQuote method in storage
    // For now, just return success
    res.json({
      success: true,
      message: "Quote deletion not yet implemented",
      quoteId: id,
    });
  })
);

/**
 * GET /api/calculator/content
 * Get calculator content (SOW templates, agreement links)
 * Can optionally filter by service via ?service=bookkeeping
 * 
 * Cacheable: ETag enabled with 5-minute cache
 */
router.get("/api/calculator/content", requireAuth, withETag({ maxAge: 300 }), async (req, res) => {
  try {
    const {
      DEFAULT_INCLUDED_FIELDS,
      DEFAULT_AGREEMENT_LINKS,
      DEFAULT_MSA_LINK,
      SERVICE_KEYS_DB,
      getDefaultSowTitle,
      getDefaultSowTemplate,
    } = await import("../calculator-defaults");

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
    const norm = (v: any) => (v === undefined || v === null || isBlank(v) ? undefined : v);
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
        deepMerge(DEFAULT_INCLUDED_FIELDS, safeParse(existing?.includedFieldsJson))
      );
      if (existing) {
        return {
          ...existing,
          sowTitle: norm(existing.sowTitle) ?? getDefaultSowTitle(service as any),
          sowTemplate: norm(existing.sowTemplate) ?? getDefaultSowTemplate(service as any),
          agreementLink:
            norm(existing.agreementLink) ?? DEFAULT_AGREEMENT_LINKS[asDbKey(service)] ?? null,
          includedFieldsJson: included,
          createdAt: existing.createdAt ? new Date(existing.createdAt).toISOString() : undefined,
          updatedAt: existing.updatedAt ? new Date(existing.updatedAt).toISOString() : undefined,
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

    const service = typeof req.query.service === "string" ? req.query.service : undefined;
    if (service) {
      const item = await storage.getCalculatorServiceContent(service);
      const payload = {
        items: [withDefaults(item, service)],
        msaLink: DEFAULT_MSA_LINK,
      };
      const parsed = CalculatorContentResponseSchema.safeParse(payload);
      if (!parsed.success) {
        console.error("[CalculatorContent] invalid payload", parsed.error.issues);
        return res.status(500).json({
          status: "error",
          message: "Invalid calculator content payload",
        });
      }
      return res.json(parsed.data);
    } else {
      const items = await storage.getAllCalculatorServiceContent();
      const map = new Map<string, any>((items || []).map((i) => [i.service, i]));
      const merged = SERVICE_KEYS_DB.map((svc) => withDefaults(map.get(svc), svc));
      const payload = { items: merged, msaLink: DEFAULT_MSA_LINK };
      const parsed = CalculatorContentResponseSchema.safeParse(payload);
      if (!parsed.success) {
        console.error("[CalculatorContent] invalid payload", parsed.error.issues);
        return res.status(500).json({
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

/**
 * GET /api/pricing/config
 * Get pricing configuration for Calculator and other UIs
 * 
 * Cacheable: ETag enabled with 5-minute cache
 */
router.get("/api/pricing/config", requireAuth, withETag({ maxAge: 300 }), async (req, res) => {
  try {
    const config = await pricingConfigService.loadPricingConfig();
    const parsed = PricingConfigSchema.safeParse(config);
    if (!parsed.success) {
      console.error("[PricingConfig] validation failed", parsed.error.issues);
      return res.status(500).json({ status: "error", message: "Invalid pricing configuration" });
    }
    return res.json(parsed.data);
  } catch (error) {
    console.error("[PricingConfig] load failed", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to load pricing configuration",
    });
  }
});

export default router;
