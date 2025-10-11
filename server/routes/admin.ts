/**
 * Admin Router
 * 
 * Handles admin-only diagnostic, metrics, and management endpoints.
 * All routes require admin role.
 * 
 * Routes:
 * - GET /api/admin/metrics/hubspot - HubSpot metrics
 * - GET /api/admin/logs - Module logs viewer
 * - POST /api/admin/diagnostics/hubspot/smoke - Run smoke tests
 * - POST /api/admin/actions/hubspot/sync - Manual quote sync to HubSpot
 * - POST /api/admin/apps/seedpay/cache/clear - Clear SeedPay cache (redirect)
 */

import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { getErrorMessage } from "../utils/error-handling";
import { getQuoteProvider } from "../services/providers/index";
import { hubSpotService } from "../hubspot";
import { checkDatabaseHealth } from "../db";
import { getHubspotMetrics } from "../metrics";
import { getModuleLogs } from "../logs-feed";

const router = Router();

/**
 * Admin guard middleware
 */
const requireAdmin = (req: any, res: Response, next: Function) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/**
 * GET /api/admin/metrics/hubspot
 * Fetch HubSpot integration metrics
 */
router.get("/api/admin/metrics/hubspot", requireAuth, requireAdmin, async (req, res) => {
  try {
    const metrics = await getHubspotMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch metrics",
      error: getErrorMessage(error),
    });
  }
});

/**
 * GET /api/admin/logs
 * Fetch logs for a specific module
 * 
 * @query module - Module name (default: "hubspot")
 * @query limit - Max number of logs (default: 100)
 */
router.get("/api/admin/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const moduleName = typeof req.query.module === "string" ? req.query.module : "hubspot";
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 100;
    const logs = await getModuleLogs(moduleName, Number.isFinite(limit) ? limit : 100);
    res.json({ module: moduleName, logs });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch logs",
      error: getErrorMessage(error),
    });
  }
});

/**
 * POST /api/admin/diagnostics/hubspot/smoke
 * Run smoke tests for HubSpot integration
 * 
 * @body includeConnectivity - Whether to test actual HubSpot connectivity
 */
router.post("/api/admin/diagnostics/hubspot/smoke", requireAuth, requireAdmin, async (req, res) => {
  try {
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

    // Redis removed — using Postgres sessions and Graphile Worker
    checks.push({
      key: "redis",
      label: "Redis removed",
      ok: true,
      note: "Migrated to Postgres-backed sessions and Graphile Worker",
    });

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
    res.status(500).json({
      message: "Diagnostics failed",
      error: getErrorMessage(error),
    });
  }
});

/**
 * POST /api/admin/actions/hubspot/sync
 * Manually sync a quote to HubSpot
 * 
 * @body quoteId - Quote ID to sync
 * @body action - "auto" | "create" | "update" (default: "auto")
 * @body dryRun - If true, simulate without making changes
 * @body includeConnectivity - Include connectivity checks in response
 */
router.post("/api/admin/actions/hubspot/sync", requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { quoteId, action, dryRun, includeConnectivity } = req.body || {};
    if (!quoteId) {
      return res.status(400).json({ message: "quoteId is required" });
    }
    const idNum = typeof quoteId === "string" ? parseInt(quoteId, 10) : quoteId;
    if (!idNum || Number.isNaN(idNum)) {
      return res.status(400).json({ message: "Invalid quoteId" });
    }
    
    // Use provider pattern (DRY: consistent abstraction)
    const provider = getQuoteProvider();
    const result = await provider.syncQuote(idNum, {
      action: action || "auto",
      actorEmail: req.user!.email,
      dryRun: Boolean(dryRun),
      includeConnectivity: Boolean(includeConnectivity),
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Sync action failed", error: getErrorMessage(error) });
  }
});

/**
 * POST /api/admin/apps/seedpay/cache/clear
 * Clear SeedPay cache (redirects to deals cache invalidation)
 */
router.post("/api/admin/apps/seedpay/cache/clear", requireAuth, requireAdmin, (req, res) => {
  const q = req.originalUrl.includes("?")
    ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
    : "";
  res.redirect(307, `/api/deals/cache/invalidate${q}`);
});

export default router;
