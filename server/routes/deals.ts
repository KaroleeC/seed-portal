/**
 * Deals Router
 *
 * Handles HubSpot deal and quote sync operations
 */

import { Router } from "express";
import { z } from "zod";
import { syncQuoteToHubSpot } from "../services/hubspot/sync.js";
import { HubSpotService } from "../hubspot.js";
import { storage } from "../storage.js";
import { requireAuth, asyncHandler, handleError, validateBody, getErrorMessage } from "./_shared";
import { enqueueHubSpotSync, getJob } from "../jobs/in-memory-queue.js";

const router = Router();

// ============================================================================
// SCHEMAS
// ============================================================================

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

    // Enqueue and return immediately
    const jobId = enqueueHubSpotSync(quoteId, action, actorEmail);

    res.status(202).json({
      queued: true,
      jobId,
      message: "Quote sync queued for processing",
      quoteId,
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

    const result = await syncQuoteToHubSpot(quoteId, "create", actorEmail);

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
      const result = await syncQuoteToHubSpot(quoteId, "update", actorEmail);

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
      return res.status(400).json({ message: "Job ID is required" });
    }

    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      quoteId: (job.data as any)?.quoteId,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result,
      error: job.error,
      progress: job.progress,
    });
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

export default router;
