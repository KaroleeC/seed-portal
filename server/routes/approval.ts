/**
 * Approval Router
 *
 * Handles quote approval workflows
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { requireAuth, asyncHandler, validateBody, handleError } from "./_shared";

const router = Router();

// ============================================================================
// SCHEMAS
// ============================================================================

const approveQuoteSchema = z.object({
  quoteId: z.number().int().positive(),
  approvedBy: z.string().optional(),
  notes: z.string().optional(),
});

const rejectQuoteSchema = z.object({
  quoteId: z.number().int().positive(),
  rejectedBy: z.string().optional(),
  reason: z.string().optional(),
});

const requestApprovalSchema = z.object({
  quoteId: z.number().int().positive(),
  requestedBy: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/approval/request
 * Request approval for a quote
 */
router.post(
  "/api/approval/request",
  requireAuth,
  validateBody(requestApprovalSchema),
  asyncHandler(async (req, res) => {
    const { quoteId, requestedBy, notes } = req.body;

    const quote = await storage.getQuote(quoteId);
    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    // Update quote status to pending approval
    await storage.updateQuote({
      id: quoteId,
      // Status and approval fields may not be in schema - use type assertion
      ...({
        status: "pending_approval",
        approvalRequestedAt: new Date().toISOString(),
        approvalRequestedBy: requestedBy || (req.user as any)?.email,
        approvalNotes: notes,
      } as any),
    });

    res.json({
      success: true,
      message: "Approval requested successfully",
      quoteId,
    });
  })
);

/**
 * POST /api/approval/approve
 * Approve a quote
 */
router.post(
  "/api/approval/approve",
  requireAuth,
  validateBody(approveQuoteSchema),
  asyncHandler(async (req, res) => {
    const { quoteId, approvedBy, notes } = req.body;

    const quote = await storage.getQuote(quoteId);
    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    // Update quote status to approved
    await storage.updateQuote({
      id: quoteId,
      // Status and approval fields may not be in schema - use type assertion
      ...({
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: approvedBy || (req.user as any)?.email,
        approvalNotes: notes,
      } as any),
    });

    res.json({
      success: true,
      message: "Quote approved successfully",
      quoteId,
    });
  })
);

/**
 * POST /api/approval/reject
 * Reject a quote
 */
router.post(
  "/api/approval/reject",
  requireAuth,
  validateBody(rejectQuoteSchema),
  asyncHandler(async (req, res) => {
    const { quoteId, rejectedBy, reason } = req.body;

    const quote = await storage.getQuote(quoteId);
    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    // Update quote status to rejected
    await storage.updateQuote({
      id: quoteId,
      // Status and approval fields may not be in schema - use type assertion
      ...({
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedBy: rejectedBy || (req.user as any)?.email,
        rejectionReason: reason,
      } as any),
    });

    res.json({
      success: true,
      message: "Quote rejected",
      quoteId,
    });
  })
);

/**
 * GET /api/approval/pending
 * Get all quotes pending approval
 */
router.get(
  "/api/approval/pending",
  requireAuth,
  asyncHandler(async (req, res) => {
    // TODO: Implement listQuotes method in storage
    // For now, return empty array
    const quotes: any[] = [];

    res.json({
      quotes,
      count: quotes.length,
    });
  })
);

/**
 * GET /api/approval/history/:quoteId
 * Get approval history for a quote
 */
router.get(
  "/api/approval/history/:quoteId",
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

    // Extract approval history from quote
    const history = {
      quoteId,
      status: (quote as any).status || "draft",
      requestedAt: (quote as any).approvalRequestedAt,
      requestedBy: (quote as any).approvalRequestedBy,
      approvedAt: (quote as any).approvedAt,
      approvedBy: (quote as any).approvedBy,
      rejectedAt: (quote as any).rejectedAt,
      rejectedBy: (quote as any).rejectedBy,
      rejectionReason: (quote as any).rejectionReason,
      notes: (quote as any).approvalNotes,
    };

    res.json(history);
  })
);

export default router;
