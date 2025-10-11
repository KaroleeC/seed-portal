/**
 * Deals Router
 *
 * Handles HubSpot deal and quote sync operations
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { requireAuth, requirePermission, asyncHandler, handleError, validateBody } from "./_shared";
import { getQuoteProvider } from "../services/providers/index.js";
import { dealsService } from "../services/deals-service.js";
import { DealsResultSchema } from "@shared/contracts";
import { getErrorMessage } from "../utils/error-handling";
import { cache, CachePrefix } from "../cache.js";
import { withETag } from "../middleware/etag.js";

const router = Router();

// ============================================================================
// SCHEMAS

const queueSyncSchema = z.object({
  quoteId: z.number().int().positive(),
  action: z.enum(["auto", "create", "update"]).optional(),
});

const pushQuoteSchema = z.object({
  quoteId: z.number().int().positive(),
});

const updateQuoteSchema = z.object({
  quoteId: z.number().int().positive(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/hubspot/queue-sync
 * Queue a quote for HubSpot sync (preferred method)
 * Returns immediately with jobId, processes in background
 */
router.post(
  "/api/hubspot/queue-sync",
  requireAuth,
  validateBody(queueSyncSchema),
  asyncHandler(async (req, res) => {
    const { quoteId, action = "auto" } = req.body;
    const actorEmail = (req.user as any)?.email || "unknown@seedfinancial.io";

    // Use provider pattern for queue (DRY: single point of abstraction)
    const provider = getQuoteProvider();
    const result = await provider.queueSync(quoteId, { action, actorEmail });

    res.status(202).json({
      queued: result.queued,
      jobId: result.jobId,
      message: "Quote sync queued for processing",
      quoteId,
      result: result.result,
    });
  })
);

/**
 * POST /api/hubspot/push-quote
 * Legacy endpoint - creates a new quote in HubSpot
 */
router.post(
  "/api/hubspot/push-quote",
  requireAuth,
  validateBody(pushQuoteSchema),
  asyncHandler(async (req, res) => {
    const { quoteId } = req.body;
    const actorEmail = (req.user as any)?.email || "unknown@seedfinancial.io";

    // Use provider pattern (DRY: consistent abstraction)
    const provider = getQuoteProvider();
    const result = await provider.syncQuote(quoteId, { action: "create", actorEmail });

    res.json({
      message: result.success ? "Quote created in HubSpot" : "Failed to create quote in HubSpot",
      ...result,
    });
  })
);

/**
 * POST /api/hubspot/update-quote
 * Legacy endpoint - updates an existing quote in HubSpot
 */
router.post(
  "/api/hubspot/update-quote",
  requireAuth,
  validateBody(updateQuoteSchema),
  asyncHandler(async (req, res) => {
    const { quoteId } = req.body;
    const actorEmail = (req.user as any)?.email || "unknown@seedfinancial.io";

    try {
      // Use provider pattern (DRY: consistent abstraction)
      const provider = getQuoteProvider();
      const result = await provider.syncQuote(quoteId, { action: "update", actorEmail });

      res.json({
        message: result.success ? "Quote updated in HubSpot" : "Failed to update quote in HubSpot",
        ...result,
      });
    } catch (error) {
      // Surface underlying HubSpot error
      handleError(error, res, "HubSpot Update");
    }
  })
);

/**
 * GET /api/hubspot/products
 * Get all HubSpot products
 */
router.get(
  "/api/hubspot/products",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { hubSpotService } = await import("../hubspot.js");
    if (!hubSpotService) {
      return res.status(503).json({ message: "HubSpot service unavailable" });
    }
    const products = await hubSpotService.getProducts();
    res.json({ products });
  })
);

/**
 * GET /api/hubspot/products/cached
 * Get cached HubSpot products
 */
router.get(
  "/api/hubspot/products/cached",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { hubSpotService } = await import("../hubspot.js");
    if (!hubSpotService) {
      return res.status(503).json({ message: "HubSpot service unavailable" });
    }
    const products = await hubSpotService.getProductsCached();
    res.json({ products });
  })
);

/**
 * GET /api/hubspot/sync-jobs/:jobId
 * Get status of a queued sync job
 */
router.get(
  "/api/hubspot/sync-jobs/:jobId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const jobId = req.params.jobId;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    // Use provider pattern for status checking
    const provider = getQuoteProvider();
    const status = await provider.checkSyncStatus(jobId);

    res.json(status);
  })
);

/**
 * GET /api/hubspot/diagnostics/:quoteId
 * Get diagnostic information for a quote
 */
router.get(
  "/api/hubspot/diagnostics/:quoteId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const quoteId = parseInt(req.params.quoteId!, 10);

    if (isNaN(quoteId)) {
      return res.status(400).json({ message: "Invalid quote ID" });
    }

    const quote = await storage.getQuote(quoteId);

    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    res.json({
      quoteId,
      hubspotContactId: quote.hubspotContactId,
      hubspotDealId: quote.hubspotDealId,
      hubspotQuoteId: quote.hubspotQuoteId,
      contactEmail: quote.contactEmail,
      companyName: quote.companyName,
      // status field may not exist in schema - use type assertion if needed
      status: (quote as any).status || "draft",
    });
  })
);

/**
 * GET /api/deals
 * Get all deals or filter by deal IDs
 * @query ids - Comma-separated deal IDs (optional)
 * @query ownerId - Filter by owner ID
 * @query limit - Max number of deals to return
 *
 * Cacheable: ETag enabled with 2-minute cache
 */
router.get("/api/deals", requireAuth, withETag({ maxAge: 120 }), async (req, res) => {
  try {
    const ids =
      typeof req.query.ids === "string" && req.query.ids.trim().length
        ? req.query.ids
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;

    const deals = await dealsService.getDeals({ ids, ownerId, limit });
    const parsed = DealsResultSchema.safeParse(deals);
    if (!parsed.success) {
      console.error("Invalid DealsResult payload:", parsed.error.issues);
      return res.status(500).json({ status: "error", message: "Invalid deals payload" });
    }
    return res.json(parsed.data);
  } catch (error) {
    console.error("Failed to fetch deals:", error);
    return res.status(500).json({
      status: "error",
      message: getErrorMessage(error) || "Failed to fetch deals",
    });
  }
});

/**
 * GET /api/deals/by-owner
 * Fetch deals filtered by owner ID
 * @query ownerId - HubSpot owner ID (required)
 * @query limit - Max number of deals to return
 */
router.get("/api/deals/by-owner", requireAuth, async (req, res) => {
  try {
    const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
    if (!ownerId) {
      return res.status(400).json({ status: "error", message: "ownerId is required" });
    }
    const deals = await dealsService.getDeals({ ownerId, limit });
    const parsed = DealsResultSchema.safeParse(deals);
    if (!parsed.success) {
      console.error("Invalid DealsResult payload:", parsed.error.issues);
      return res.status(500).json({ status: "error", message: "Invalid deals payload" });
    }
    return res.json(parsed.data);
  } catch (error) {
    console.error("Failed to fetch deals by owner:", error);
    return res.status(500).json({
      status: "error",
      message: getErrorMessage(error) || "Failed to fetch deals by owner",
    });
  }
});

/**
 * POST /api/deals/cache/invalidate
 * Action: admin.cache
 * Admin-only endpoint to invalidate deals cache
 *
 * Useful for forcing a refresh during development or after HubSpot changes
 */
router.post(
  "/api/deals/cache/invalidate",
  requireAuth,
  requirePermission("admin.cache", "system"),
  async (req: any, res) => {
    try {
      // Clear in-memory cache (Redis removed)
      const pattern = `${CachePrefix.HUBSPOT_DEALS_LIST}*`;
      const keys = await cache.keys(pattern);

      for (const key of keys) {
        await cache.del(key);
      }

      res.json({ success: true, deleted: keys.length, pattern });
    } catch (error) {
      console.error("Failed to invalidate deals cache:", error);
      res.status(500).json({
        message: "Failed to invalidate deals cache",
        error: getErrorMessage(error),
      });
    }
  }
);

export default router;
