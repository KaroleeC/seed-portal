/**
 * App Namespace Aliases
 * 
 * Provides backward-compatible redirect routes for app-namespaced endpoints.
 * These allow clients to use /api/apps/{app-name}/* paths that redirect to
 * the canonical API paths.
 * 
 * Apps:
 * - SeedQC (Calculator): /api/apps/seedqc/* → /api/calculator/*
 * - SeedPay (Commission Tracker): /api/apps/seedpay/* → /api/commissions/*
 * 
 * Note: All redirects preserve query strings and use 307 (Temporary Redirect)
 * to maintain the HTTP method (GET).
 */

import { Router } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { createRedirect } from "../utils/routing";

const router = Router();

// =============================
// SeedQC (Calculator) Aliases
// =============================

/**
 * GET /api/apps/seedqc/content
 * Redirects to canonical calculator content endpoint
 */
router.get(
  "/api/apps/seedqc/content",
  requireAuth,
  createRedirect("/api/calculator/content")
);

/**
 * GET /api/apps/seedqc/pricing/config
 * Redirects to canonical pricing config endpoint
 */
router.get(
  "/api/apps/seedqc/pricing/config",
  requireAuth,
  createRedirect("/api/pricing/config")
);

// Admin calculator aliases
router.get(
  "/api/admin/apps/seedqc/content",
  requireAuth,
  createRedirect("/api/admin/calculator/content")
);

router.get(
  "/api/admin/apps/seedqc/content/:service",
  requireAuth,
  (req, res) => {
    const service = encodeURIComponent(req.params.service);
    createRedirect(`/api/admin/calculator/content/${service}`)(req, res, () => {});
  }
);

router.put(
  "/api/admin/apps/seedqc/content/:service",
  requireAuth,
  (req, res) => {
    const service = encodeURIComponent(req.params.service);
    createRedirect(`/api/admin/calculator/content/${service}`)(req, res, () => {});
  }
);

// =============================
// SeedPay (Commission Tracker) Aliases
// =============================

/**
 * GET /api/apps/seedpay/deals
 * Redirects to canonical deals endpoint
 */
router.get(
  "/api/apps/seedpay/deals",
  requireAuth,
  createRedirect("/api/deals")
);

/**
 * GET /api/apps/seedpay/deals/by-owner
 * Redirects to canonical deals by owner endpoint
 */
router.get(
  "/api/apps/seedpay/deals/by-owner",
  requireAuth,
  createRedirect("/api/deals/by-owner")
);

/**
 * GET /api/apps/seedpay/sales-reps/me
 * Redirects to canonical sales rep profile endpoint
 */
router.get(
  "/api/apps/seedpay/sales-reps/me",
  requireAuth,
  createRedirect("/api/sales-reps/me")
);

/**
 * GET /api/apps/seedpay/commissions
 * Redirects to canonical commissions endpoint
 */
router.get(
  "/api/apps/seedpay/commissions",
  requireAuth,
  createRedirect("/api/commissions")
);

/**
 * GET /api/apps/seedpay/commissions/current-period-summary
 * Redirects to canonical current period summary endpoint
 */
router.get(
  "/api/apps/seedpay/commissions/current-period-summary",
  requireAuth,
  createRedirect("/api/commissions/current-period-summary")
);

/**
 * GET /api/apps/seedpay/monthly-bonuses
 * Redirects to canonical monthly bonuses endpoint
 */
router.get(
  "/api/apps/seedpay/monthly-bonuses",
  requireAuth,
  createRedirect("/api/monthly-bonuses")
);

/**
 * GET /api/apps/seedpay/milestone-bonuses
 * Redirects to canonical milestone bonuses endpoint
 */
router.get(
  "/api/apps/seedpay/milestone-bonuses",
  requireAuth,
  createRedirect("/api/milestone-bonuses")
);

export default router;
