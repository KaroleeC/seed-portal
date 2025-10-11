/**
 * Commissions Router
 * 
 * Handles commission tracking, approval, and HubSpot sync.
 * 
 * Routes:
 * - GET /api/commissions - Get commissions (filtered by role)
 * - GET /api/commissions/:id - Get single commission
 * - PATCH /api/commissions/:id - Update commission
 * - POST /api/commissions/:id/approve - Approve commission
 * - POST /api/commissions/:id/reject - Reject commission
 * - POST /api/commissions/:id/unreject - Unreject commission
 * - POST /api/commissions/sync-hubspot - Sync from HubSpot
 * - POST /api/commissions/process-hubspot - Process HubSpot data
 * - GET /api/commissions/current-period-summary - Get summary
 * - GET /api/commissions/hubspot/current-period - Get HubSpot period
 * - GET /api/commission-adjustments - Get adjustments
 * - GET /api/pipeline-projections - Get projections
 * 
 * Authorization Pattern:
 * ✅ All routes use requirePermission middleware
 * ❌ No inline auth checks (ESLint enforced)
 */

import { Router } from "express";
import { requireAuth, requirePermission, asyncHandler } from "./_shared.js";
import * as commissionsService from "../services/commissions-service.js";
import { storage } from "../storage.js";
import { db } from "../db.js";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * GET /api/commissions
 * Action: commissions.view
 * Get commissions filtered by user role
 */
router.get(
  "/api/commissions",
  requireAuth,
  requirePermission("commissions.view", "commission"),
  asyncHandler(async (req, res) => {
    const requestedSalesRepId =
      typeof req.query.salesRepId === "string" ? parseInt(req.query.salesRepId, 10) : undefined;

    // Validate salesRepId if provided
    if (requestedSalesRepId && Number.isNaN(requestedSalesRepId)) {
      return res.status(400).json({ message: "Invalid salesRepId" });
    }

    // Determine which commissions to fetch based on filters
    let commissionsData: commissionsService.Commission[];

    if (requestedSalesRepId) {
      // Authorization check: Can this user access this sales rep's data?
      // This is handled by Cerbos/RBAC via requirePermission with resource attributes
      commissionsData = await commissionsService.getCommissions({ salesRepId: requestedSalesRepId });
    } else if (req.user) {
      // Check if user has admin-level access (Cerbos will determine this)
      // For now, use a simple role check as fallback until Cerbos is enabled
      const isAdmin = req.user.role === "admin";
      
      if (isAdmin) {
        commissionsData = await commissionsService.getCommissions({ includeAll: true });
      } else {
        commissionsData = await commissionsService.getCommissions({ userId: req.user.id });
      }
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Group by invoice
    const invoiceGroups = commissionsService.groupCommissionsByInvoice(commissionsData);
    const commissionsArray = Array.from(invoiceGroups.values());

    res.json({
      commissions: commissionsArray,
      totalCommission: commissionsArray.reduce((sum, g) => sum + g.commission, 0),
    });
  })
);

/**
 * PATCH /api/commissions/:id
 * Action: commissions.update
 * Update commission amount or notes
 */
router.patch(
  "/api/commissions/:id",
  requireAuth,
  requirePermission("commissions.update", "commission"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid commission ID" });
    }

    const { amount, notes } = req.body;

    if (amount === undefined && notes === undefined) {
      return res.status(400).json({ message: "No updates provided" });
    }

    const updated = await commissionsService.updateCommission(id, { amount, notes });

    if (!updated) {
      return res.status(404).json({ message: "Commission not found" });
    }

    res.json({ commission: updated });
  })
);

/**
 * POST /api/commissions/:id/approve
 * Action: commissions.approve
 * Approve a commission
 */
router.post(
  "/api/commissions/:id/approve",
  requireAuth,
  requirePermission("commissions.approve", "commission"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid commission ID" });
    }

    const updated = await commissionsService.updateCommissionStatus(id, "approved");

    if (!updated) {
      return res.status(404).json({ message: "Commission not found" });
    }

    res.json({ success: true, commission: updated });
  })
);

/**
 * POST /api/commissions/:id/reject
 * Action: commissions.reject
 * Reject a commission
 */
router.post(
  "/api/commissions/:id/reject",
  requireAuth,
  requirePermission("commissions.reject", "commission"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid commission ID" });
    }

    const updated = await commissionsService.updateCommissionStatus(id, "rejected");

    if (!updated) {
      return res.status(404).json({ message: "Commission not found" });
    }

    res.json({ success: true, commission: updated });
  })
);

/**
 * POST /api/commissions/:id/unreject
 * Action: commissions.unreject
 * Unreject a commission (reset to pending)
 */
router.post(
  "/api/commissions/:id/unreject",
  requireAuth,
  requirePermission("commissions.unreject", "commission"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid commission ID" });
    }

    const updated = await commissionsService.updateCommissionStatus(id, "pending");

    if (!updated) {
      return res.status(404).json({ message: "Commission not found" });
    }

    res.json({ success: true, commission: updated });
  })
);

/**
 * GET /api/commission-adjustments
 * Action: commissions.view_adjustments
 * Get commission adjustments
 */
router.get(
  "/api/commission-adjustments",
  requireAuth,
  requirePermission("commissions.view_adjustments", "commission"),
  asyncHandler(async (req, res) => {
    const salesRepId =
      typeof req.query.salesRepId === "string" ? parseInt(req.query.salesRepId, 10) : undefined;

    if (salesRepId && Number.isNaN(salesRepId)) {
      return res.status(400).json({ message: "Invalid salesRepId" });
    }

    const adjustments = await commissionsService.getCommissionAdjustments(salesRepId);

    res.json({ adjustments });
  })
);

/**
 * GET /api/pipeline-projections
 * Action: commissions.view_projections
 * Get pipeline projections
 * 
 * Note: This endpoint returns placeholder data. Real implementation
 * would calculate projections based on deals in pipeline.
 */
router.get(
  "/api/pipeline-projections",
  requireAuth,
  requirePermission("commissions.view_projections", "commission"),
  asyncHandler(async (req, res) => {
    // TODO: Implement actual projection logic
    // For now, return empty array
    res.json({
      projections: [],
      totalProjected: 0,
    });
  })
);

/**
 * POST /api/commissions/sync-hubspot
 * Action: commissions.sync
 * Sync commissions from HubSpot
 * 
 * Note: Implementation delegated to HubSpot sync service
 */
router.post(
  "/api/commissions/sync-hubspot",
  requireAuth,
  requirePermission("commissions.sync", "commission"),
  asyncHandler(async (req, res) => {
    // This route is a placeholder for the HubSpot sync logic
    // The actual implementation is in routes.ts and should be moved here
    // during full migration
    
    res.status(501).json({
      message: "HubSpot sync not yet implemented in extracted router",
      note: "Use legacy route in routes.ts for now",
    });
  })
);

/**
 * GET /api/commissions/current-period-summary
 * Action: commissions.view_summary
 * Get current period summary
 */
router.get(
  "/api/commissions/current-period-summary",
  requireAuth,
  requirePermission("commissions.view_summary", "commission"),
  asyncHandler(async (req, res) => {
    // Get user's sales rep
    const salesRep = await storage.getSalesRepByUserId(req.user!.id);
    
    if (!salesRep) {
      return res.json({
        totalCommissions: 0,
        approvedCommissions: 0,
        pendingCommissions: 0,
        commissionCount: 0,
      });
    }

    // Get commissions for this sales rep
    const commissions = await commissionsService.getCommissions({
      salesRepId: salesRep.id,
    });

    // Calculate summary
    const summary = {
      totalCommissions: commissions.reduce((sum, c) => sum + c.amount, 0),
      approvedCommissions: commissions
        .filter((c) => c.status === "approved")
        .reduce((sum, c) => sum + c.amount, 0),
      pendingCommissions: commissions
        .filter((c) => c.status === "pending")
        .reduce((sum, c) => sum + c.amount, 0),
      commissionCount: commissions.length,
    };

    res.json(summary);
  })
);

export default router;
