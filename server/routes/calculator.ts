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

export default router;
