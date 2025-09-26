import type { Express } from "express";
import { requireAuth } from "./auth";
import { cache, CachePrefix, CacheTTL } from "./cache";
import { hubSpotService } from "./hubspot";
import { syncQuoteToHubSpot } from "./services/hubspot/sync";
import { storage } from "./storage";
import { sendOk, sendError } from "./utils/responses";
import {
  buildServiceConfig,
  toPricingDataFromQuote,
} from "./services/hubspot/compose";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// (Diagnostics use toPricingDataFromQuote directly to match sync path)

export function registerHubspotRoutes(app: Express) {
  // POST /api/hubspot/verify-contact
  app.post("/api/hubspot/verify-contact", requireAuth, async (req, res) => {
    try {
      const { email } = (req.body || {}) as { email?: string };
      if (!email)
        return sendError(res, "INVALID_REQUEST", "Email is required", 400);
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
          { verified: false, data: { verified: false } },
        );
      const cacheKey = cache.generateKey(CachePrefix.HUBSPOT_CONTACT, email);
      const result = await cache.wrap(
        cacheKey,
        () =>
          (
            hubSpotService as NonNullable<typeof hubSpotService>
          ).verifyContactByEmail(email),
        { ttl: CacheTTL.HUBSPOT_CONTACT },
      );
      return sendOk(res, result, undefined, result);
    } catch (error) {
      console.error("Error verifying contact:", error);
      return sendError(
        res,
        "VERIFY_CONTACT_FAILED",
        "Failed to verify contact",
        500,
      );
    }
  });

  // POST /api/hubspot/search-contacts
  app.post("/api/hubspot/search-contacts", requireAuth, async (req, res) => {
    try {
      const { searchTerm } = (req.body || {}) as { searchTerm?: string };
      if (!searchTerm || searchTerm.length < 2)
        return sendOk(res, { contacts: [] }, undefined, { contacts: [] });
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
          { contacts: [] },
        );
      const contacts = await hubSpotService.searchContacts(searchTerm);
      return sendOk(res, { contacts }, undefined, { contacts });
    } catch (error) {
      console.error("HubSpot search contacts error:", error);
      return sendError(
        res,
        "HUBSPOT_SEARCH_FAILED",
        "Failed to search HubSpot contacts",
        500,
      );
    }
  });

  // POST /api/hubspot/queue-sync (queue-first, fallback to direct sync)
  app.post("/api/hubspot/queue-sync", requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number };
      const action = ((req.body || {}) as any).action || "create";
      if (!quoteId)
        return sendError(res, "INVALID_REQUEST", "Quote ID is required", 400);
      if (!req.user)
        return sendError(res, "UNAUTHENTICATED", "User not authenticated", 401);

      try {
        const { scheduleQuoteSync } = await import(
          "./jobs/hubspot-queue-manager"
        );
        const job = await scheduleQuoteSync(
          quoteId,
          action,
          (req.user as any).id,
          1,
        );
        return sendOk(
          res,
          { jobId: job.id, quoteId, action, method: "queued" },
          undefined,
          {
            jobId: job.id,
            message: "HubSpot sync queued successfully",
            quoteId,
            action,
            method: "queued",
          },
        );
      } catch (queueError) {
        console.log(
          "Queue unavailable, falling back to direct sync:",
          getErrorMessage(queueError),
        );
      }

      try {
        const unified = await syncQuoteToHubSpot(
          quoteId,
          action as any,
          (req.user as any).email,
        );
        return sendOk(
          res,
          {
            quoteId,
            action,
            method: "direct",
            hubspotDealId: unified.hubspotDealId,
            hubspotQuoteId: unified.hubspotQuoteId,
            totals: unified.totals,
          },
          undefined,
          {
            message: "HubSpot sync completed successfully",
            quoteId,
            action,
            method: "direct",
            hubspotDealId: unified.hubspotDealId,
            hubspotQuoteId: unified.hubspotQuoteId,
            totals: unified.totals,
          },
        );
      } catch (unifiedError) {
        console.error("Unified direct sync failed:", unifiedError);
        return sendError(
          res,
          "HUBSPOT_SYNC_FAILED",
          "HubSpot sync failed",
          500,
          { quoteId, action, method: "direct", reason: getErrorMessage(unifiedError) },
        );
      }
    } catch (error) {
      console.error("Failed to sync to HubSpot:", error);
      return sendError(
        res,
        "HUBSPOT_SYNC_FAILED",
        "Failed to sync to HubSpot",
        500,
      );
    }
  });

  // GET /api/hubspot/queue-status
  app.get("/api/hubspot/queue-status", requireAuth, async (_req, res) => {
    try {
      const { getQueueStatus } = await import("./jobs/hubspot-queue-manager");
      const status = await getQueueStatus();
      return sendOk(res, status, undefined, status as any);
    } catch (error) {
      console.error("Failed to get queue status:", error);
      return sendError(
        res,
        "QUEUE_STATUS_FAILED",
        "Failed to get queue status",
        500,
      );
    }
  });

  // GET /api/hubspot/debug/products
  app.get("/api/hubspot/debug/products", requireAuth, async (_req, res) => {
    try {
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
        );

      const productIds = await hubSpotService.verifyAndGetProductIds();
      const allProducts = await hubSpotService.getProducts();
      return sendOk(
        res,
        {
          productIds,
          totalProducts: allProducts.length,
          sampleProducts: allProducts
            .slice(0, 5)
            .map((p) => ({
              id: p.id,
              name: p.properties?.name,
              sku: p.properties?.hs_sku,
            })),
        },
        undefined,
        { productIds, totalProducts: allProducts.length },
      );
    } catch (error) {
      console.error("Error debugging products:", error);
      return sendError(
        res,
        "DEBUG_PRODUCTS_FAILED",
        "Failed to debug products",
        500,
      );
    }
  });

  // GET /api/hubspot/health
  app.get("/api/hubspot/health", requireAuth, async (_req, res) => {
    try {
      const { checkHubSpotApiHealth } = await import(
        "./hubspot-background-jobs.js"
      );
      const isHealthy = await checkHubSpotApiHealth();
      return sendOk(
        res,
        {
          status: isHealthy ? "healthy" : "unhealthy",
          hasApiAccess: isHealthy,
          timestamp: new Date().toISOString(),
        },
        undefined,
        {
          status: isHealthy ? "healthy" : "unhealthy",
          timestamp: new Date().toISOString(),
          hasApiAccess: isHealthy,
        },
      );
    } catch (error) {
      console.error("HubSpot health check error:", error);
      return sendError(
        res,
        "HEALTH_CHECK_FAILED",
        "Failed to check HubSpot health",
        500,
      );
    }
  });

  // POST /api/hubspot/cleanup-queue
  app.post("/api/hubspot/cleanup-queue", requireAuth, async (_req, res) => {
    try {
      const { cleanupHubSpotQueue } = await import(
        "./hubspot-background-jobs.js"
      );
      await cleanupHubSpotQueue();
      return sendOk(
        res,
        { message: "HubSpot queue cleanup completed successfully" },
        undefined,
        { message: "HubSpot queue cleanup completed successfully" },
      );
    } catch (error) {
      console.error("HubSpot queue cleanup error:", error);
      return sendError(
        res,
        "QUEUE_CLEANUP_FAILED",
        "Failed to cleanup HubSpot queue",
        500,
      );
    }
  });

  // POST /api/hubspot/diagnostics/create (dry-run preview)
  app.post("/api/hubspot/diagnostics/create", requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number | string };
      if (!quoteId)
        return sendError(res, "INVALID_REQUEST", "quoteId required", 400);
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
        );
      const idNum =
        typeof quoteId === "string" ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum))
        return sendError(res, "INVALID_REQUEST", "invalid quoteId", 400);
      const quote = await storage.getQuote(idNum);
      if (!quote)
        return sendError(res, "NOT_FOUND", `Quote ${quoteId} not found`, 404);

      const contactResult = await hubSpotService.verifyContactByEmail(
        quote.contactEmail,
      );
      const contact = contactResult.contact || null;
      const companyName = contact?.properties?.company || "Unknown Company";
      const ownerEmail = (req.user as any)?.email || null;
      const ownerId = ownerEmail
        ? await hubSpotService.getOwnerByEmail(ownerEmail)
        : null;

      const pricingInput = toPricingDataFromQuote(quote);
      const svcConfig = buildServiceConfig(quote);
      const fees = svcConfig.fees;
      const includes = svcConfig.includes;

      const includesBookkeeping = includes.bookkeeping;
      const includesTaas = includes.taas;
      const includesPayroll = includes.payroll;
      const includesAP = includes.ap;
      const includesAR = includes.ar;
      const includesAgentOfService = includes.agentOfService;
      const includesCfoAdvisory = includes.cfoAdvisory;
      const includesFpaBuild = Boolean((quote as any).serviceFpaBuild);
      // Identify missing required fields for TaaS when selected (for debugging)
      const taasMissing: string[] = [];
      if (includesTaas) {
        if (!pricingInput.monthlyRevenueRange)
          taasMissing.push("monthlyRevenueRange");
        if (!pricingInput.industry) taasMissing.push("industry");
        if (!pricingInput.numEntities) taasMissing.push("numEntities");
        if (!pricingInput.statesFiled) taasMissing.push("statesFiled");
        if (pricingInput.internationalFiling === undefined)
          taasMissing.push("internationalFiling");
        if (!pricingInput.numBusinessOwners)
          taasMissing.push("numBusinessOwners");
        if (pricingInput.include1040s === undefined)
          taasMissing.push("include1040s");
      }

      const productIds = await hubSpotService.verifyAndGetProductIds();

      const lineItemsPreview: Array<{
        productKey: string;
        productId: string | null;
        price: number;
        quantity: number;
        note?: string;
      }> = [];
      if (includesBookkeeping && fees.bookkeepingMonthly > 0)
        lineItemsPreview.push({
          productKey: "MONTHLY_BOOKKEEPING",
          productId: productIds.bookkeeping || null,
          price: fees.bookkeepingMonthly,
          quantity: 1,
        });
      if (includesBookkeeping && fees.bookkeepingSetup > 0)
        lineItemsPreview.push({
          productKey: "MONTHLY_BOOKKEEPING_SETUP",
          productId: null,
          price: fees.bookkeepingSetup,
          quantity: 1,
          note: "bookkeepingSetupFee (separate from combined setup)",
        });
      if (includesTaas && fees.taasMonthly > 0)
        lineItemsPreview.push({
          productKey: "TAAS",
          productId: null,
          price: fees.taasMonthly,
          quantity: 1,
        });
      if (fees.cleanupProject > 0)
        lineItemsPreview.push({
          productKey: "CLEANUP_PROJECT",
          productId: productIds.cleanup || null,
          price: fees.cleanupProject,
          quantity: 1,
        });
      if (fees.priorYearFilings > 0)
        lineItemsPreview.push({
          productKey: "PRIOR_YEAR_FILINGS",
          productId: null,
          price: fees.priorYearFilings,
          quantity: 1,
        });
      if (includesPayroll && fees.payroll > 0)
        lineItemsPreview.push({
          productKey: "PAYROLL_SERVICE",
          productId: null,
          price: fees.payroll,
          quantity: 1,
        });
      if (includesAP && fees.ap > 0)
        lineItemsPreview.push({
          productKey:
            (quote as any).apServiceTier === "advanced"
              ? "AP_ADVANCED_SERVICE"
              : "AP_LITE_SERVICE",
          productId: null,
          price: fees.ap,
          quantity: 1,
        });
      if (includesAR && fees.ar > 0)
        lineItemsPreview.push({
          productKey:
            (quote as any).arServiceTier === "advanced"
              ? "AR_ADVANCED_SERVICE"
              : "AR_LITE_SERVICE",
          productId: null,
          price: fees.ar,
          quantity: 1,
        });
      if (includesAgentOfService && fees.agentOfService > 0)
        lineItemsPreview.push({
          productKey: "AGENT_OF_SERVICE",
          productId: null,
          price: fees.agentOfService,
          quantity: 1,
        });
      if ((quote as any).serviceTier === "Concierge" && fees.serviceTier > 0)
        lineItemsPreview.push({
          productKey: "CONCIERGE_SERVICE_TIER",
          productId: null,
          price: fees.serviceTier,
          quantity: 1,
        });
      else if (
        (quote as any).serviceTier === "Guided" &&
        fees.serviceTier > 0
      )
        lineItemsPreview.push({
          productKey: "GUIDED_SERVICE_TIER",
          productId: null,
          price: fees.serviceTier,
          quantity: 1,
        });
      const qboFee = fees.qbo || (pricingInput.qboSubscription ? 60 : 0);
      if (pricingInput.qboSubscription)
        lineItemsPreview.push({
          productKey: "MANAGED_QBO_SUBSCRIPTION",
          productId: null,
          price: qboFee,
          quantity: 1,
        });

      const payload = {
        mode: "create",
        quoteId,
        contactVerified: contactResult.verified,
        contactId: contact?.id || null,
        companyName,
        ownerEmail,
        ownerId,
        includes: {
          bookkeeping: includesBookkeeping,
          taas: includesTaas,
          payroll: includesPayroll,
          ap: includesAP,
          ar: includesAR,
          agentOfService: includesAgentOfService,
          cfoAdvisory: includesCfoAdvisory,
          fpaBuild: includesFpaBuild,
        },
        totals: {
          monthly: fees.combinedMonthly,
          setup: fees.combinedSetup,
          bookkeepingSetupFee: fees.bookkeepingSetup,
        },
        productIds,
        lineItemsPreview,
        debug: {
          pricingInput,
          taasMissing,
        },
      };
      return sendOk(res, payload, undefined, payload as any);
    } catch (error) {
      console.error("Create diagnostics failed:", error);
      return sendError(
        res,
        "DIAGNOSTICS_CREATE_FAILED",
        "Create diagnostics failed",
        500,
      );
    }
  });

  // POST /api/hubspot/diagnostics/update (dry-run preview)
  app.post("/api/hubspot/diagnostics/update", requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number | string };
      if (!quoteId)
        return sendError(res, "INVALID_REQUEST", "quoteId required", 400);
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
        );
      const idNum =
        typeof quoteId === "string" ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum))
        return sendError(res, "INVALID_REQUEST", "invalid quoteId", 400);
      const quote = await storage.getQuote(idNum);
      if (!quote)
        return sendError(res, "NOT_FOUND", `Quote ${quoteId} not found`, 404);
      if (!(quote as any).hubspotDealId || !(quote as any).hubspotQuoteId)
        return sendError(
          res,
          "INVALID_STATE",
          "Quote missing hubspotDealId or hubspotQuoteId; cannot update",
          400,
        );

      const contactResult = await hubSpotService.verifyContactByEmail(
        quote.contactEmail,
      );
      const contact = contactResult.contact || null;
      const companyName = contact?.properties?.company || "Unknown Company";
      const ownerEmail = (req.user as any)?.email || null;
      const ownerId = ownerEmail
        ? await hubSpotService.getOwnerByEmail(ownerEmail)
        : null;

      const pricingInput = toPricingDataFromQuote(quote);
      const svcConfig2 = buildServiceConfig(quote);
      const fees2 = svcConfig2.fees;
      const includes2 = svcConfig2.includes;

      const includesBookkeeping = includes2.bookkeeping;
      const includesTaas = includes2.taas;
      const includesPayroll = includes2.payroll;
      const includesAP = includes2.ap;
      const includesAR = includes2.ar;
      const includesAgentOfService = includes2.agentOfService;
      const includesCfoAdvisory = includes2.cfoAdvisory;
      const includesFpaBuild = Boolean((quote as any).serviceFpaBuild);
      // Identify missing required fields for TaaS when selected
      const taasMissing: string[] = [];
      if (includesTaas) {
        if (!pricingInput.monthlyRevenueRange) taasMissing.push("monthlyRevenueRange");
        if (!pricingInput.industry) taasMissing.push("industry");
        if (!pricingInput.numEntities) taasMissing.push("numEntities");
        if (!pricingInput.statesFiled) taasMissing.push("statesFiled");
        if (pricingInput.internationalFiling === undefined) taasMissing.push("internationalFiling");
        if (!pricingInput.numBusinessOwners) taasMissing.push("numBusinessOwners");
        if (pricingInput.include1040s === undefined) taasMissing.push("include1040s");
      }

      const productIds = await hubSpotService.verifyAndGetProductIds();

      const lineItemsPreview: Array<{
        productKey: string;
        productId: string | null;
        price: number;
        quantity: number;
        note?: string;
      }> = [];
      if (includesBookkeeping && fees2.bookkeepingMonthly > 0)
        lineItemsPreview.push({
          productKey: "MONTHLY_BOOKKEEPING",
          productId: productIds.bookkeeping || null,
          price: fees2.bookkeepingMonthly,
          quantity: 1,
        });
      if (includesBookkeeping && fees2.bookkeepingSetup > 0)
        lineItemsPreview.push({
          productKey: "MONTHLY_BOOKKEEPING_SETUP",
          productId: null,
          price: fees2.bookkeepingSetup,
          quantity: 1,
        });
      if (includesTaas && fees2.taasMonthly > 0)
        lineItemsPreview.push({
          productKey: "TAAS",
          productId: null,
          price: fees2.taasMonthly,
          quantity: 1,
        });
      if (fees2.cleanupProject > 0)
        lineItemsPreview.push({
          productKey: "CLEANUP_PROJECT",
          productId: productIds.cleanup || null,
          price: fees2.cleanupProject,
          quantity: 1,
        });
      if (fees2.priorYearFilings > 0)
        lineItemsPreview.push({
          productKey: "PRIOR_YEAR_FILINGS",
          productId: null,
          price: fees2.priorYearFilings,
          quantity: 1,
        });
      if (includesPayroll && fees2.payroll > 0)
        lineItemsPreview.push({
          productKey: "PAYROLL_SERVICE",
          productId: null,
          price: fees2.payroll,
          quantity: 1,
        });
      if (includesAP && fees2.ap > 0)
        lineItemsPreview.push({
          productKey:
            (quote as any).apServiceTier === "advanced"
              ? "AP_ADVANCED_SERVICE"
              : "AP_LITE_SERVICE",
          productId: null,
          price: fees2.ap,
          quantity: 1,
        });
      if (includesAR && fees2.ar > 0)
        lineItemsPreview.push({
          productKey:
            (quote as any).arServiceTier === "advanced"
              ? "AR_ADVANCED_SERVICE"
              : "AR_LITE_SERVICE",
          productId: null,
          price: fees2.ar,
          quantity: 1,
        });
      if (includesAgentOfService && fees2.agentOfService > 0)
        lineItemsPreview.push({
          productKey: "AGENT_OF_SERVICE",
          productId: null,
          price: fees2.agentOfService,
          quantity: 1,
        });
      if ((quote as any).serviceTier === "Concierge" && fees2.serviceTier > 0)
        lineItemsPreview.push({
          productKey: "CONCIERGE_SERVICE_TIER",
          productId: null,
          price: fees2.serviceTier,
          quantity: 1,
        });
      else if (
        (quote as any).serviceTier === "Guided" &&
        fees2.serviceTier > 0
      )
        lineItemsPreview.push({
          productKey: "GUIDED_SERVICE_TIER",
          productId: null,
          price: fees2.serviceTier,
          quantity: 1,
        });
      const qboFee2 = fees2.qbo || (pricingInput.qboSubscription ? 60 : 0);
      if (pricingInput.qboSubscription)
        lineItemsPreview.push({
          productKey: "MANAGED_QBO_SUBSCRIPTION",
          productId: null,
          price: qboFee2,
          quantity: 1,
        });

      const updatePreview = {
        monthlyFeeDb: parseFloat(((quote as any).monthlyFee || "0") as string),
        setupFeeDb: parseFloat(((quote as any).setupFee || "0") as string),
        recalculated: {
          bookkeepingMonthlyFee: fees2.bookkeepingMonthly,
          bookkeepingSetupFee: fees2.bookkeepingSetup,
          taasMonthlyFee: fees2.taasMonthly,
          serviceTierFee: fees2.serviceTier,
          payrollFee: fees2.payroll,
          apFee: fees2.ap,
          arFee: fees2.ar,
          agentOfServiceFee: fees2.agentOfService,
          cfoAdvisoryFee: fees2.cfoAdvisory,
          cleanupProjectFee: fees2.cleanupProject,
          priorYearFilingsFee: fees2.priorYearFilings,
          qboFee: fees2.qbo || 0,
        },
      };

      const payload = {
        mode: "update",
        quoteId,
        existing: {
          hubspotDealId: (quote as any).hubspotDealId || null,
          hubspotQuoteId: (quote as any).hubspotQuoteId || null,
        },
        contactVerified: contactResult.verified,
        contactId: contact?.id || null,
        companyName,
        ownerEmail,
        ownerId,
        includes: {
          bookkeeping: includesBookkeeping,
          taas: includesTaas,
          payroll: includesPayroll,
          ap: includesAP,
          ar: includesAR,
          agentOfService: includesAgentOfService,
          cfoAdvisory: includesCfoAdvisory,
          fpaBuild: includesFpaBuild,
        },
        totals: {
          monthly: fees2.combinedMonthly,
          setup: fees2.combinedSetup,
          bookkeepingSetupFee: fees2.bookkeepingSetup,
        },
        productIds,
        lineItemsPreview,
        updatePreview,
      };
      return sendOk(res, payload, undefined, payload as any);
    } catch (error) {
      console.error("Update diagnostics failed:", error);
      return sendError(
        res,
        "DIAGNOSTICS_UPDATE_FAILED",
        "Update diagnostics failed",
        500,
      );
    }
  });

  // GET convenience variants for diagnostics
  app.get("/api/hubspot/diagnostics/create", requireAuth, async (req, res) => {
    try {
      const quoteId =
        typeof (req.query as any).quoteId === "string"
          ? (req.query as any).quoteId
          : undefined;
      if (!quoteId)
        return sendError(res, "INVALID_REQUEST", "quoteId required", 400);
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
        );
      const idNum = parseInt(String(quoteId), 10);
      if (Number.isNaN(idNum))
        return sendError(res, "INVALID_REQUEST", "invalid quoteId", 400);
      const quote = await storage.getQuote(idNum);
      if (!quote)
        return sendError(res, "NOT_FOUND", `Quote ${quoteId} not found`, 404);

      const contactResult = await hubSpotService.verifyContactByEmail(
        quote.contactEmail,
      );
      const contact = contactResult.contact || null;
      const companyName = contact?.properties?.company || "Unknown Company";
      const ownerEmail = (req.user as any)?.email || null;
      const ownerId = ownerEmail
        ? await hubSpotService.getOwnerByEmail(ownerEmail)
        : null;
      const pricingInput = toPricingDataFromQuote(quote);
      const svcConfig3 = buildServiceConfig(quote);
      const fees3 = svcConfig3.fees;
      const includes3 = svcConfig3.includes;

      const includesBookkeeping = includes3.bookkeeping;
      const includesTaas = includes3.taas;
      const includesPayroll = includes3.payroll;
      const includesAP = includes3.ap;
      const includesAR = includes3.ar;
      const includesAgentOfService = includes3.agentOfService;
      const includesCfoAdvisory = includes3.cfoAdvisory;
      const includesFpaBuild = Boolean((quote as any).serviceFpaBuild);
      // Identify missing required fields for TaaS when selected (for debugging)
      const taasMissing: string[] = [];
      if (includesTaas) {
        if (!pricingInput.monthlyRevenueRange)
          taasMissing.push("monthlyRevenueRange");
        if (!pricingInput.industry) taasMissing.push("industry");
        if (!pricingInput.numEntities) taasMissing.push("numEntities");
        if (!pricingInput.statesFiled) taasMissing.push("statesFiled");
        if (pricingInput.internationalFiling === undefined)
          taasMissing.push("internationalFiling");
        if (!pricingInput.numBusinessOwners)
          taasMissing.push("numBusinessOwners");
        if (pricingInput.include1040s === undefined)
          taasMissing.push("include1040s");
      }
      const productIds = await hubSpotService.verifyAndGetProductIds();
      const lineItemsPreview: Array<{
        productKey: string;
        productId: string | null;
        price: number;
        quantity: number;
        note?: string;
      }> = [];
      if (includesBookkeeping && fees3.bookkeepingMonthly > 0)
        lineItemsPreview.push({
          productKey: "MONTHLY_BOOKKEEPING",
          productId: productIds.bookkeeping || null,
          price: fees3.bookkeepingMonthly,
          quantity: 1,
        });
      if (includesBookkeeping && fees3.bookkeepingSetup > 0)
        lineItemsPreview.push({
          productKey: "MONTHLY_BOOKKEEPING_SETUP",
          productId: null,
          price: fees3.bookkeepingSetup,
          quantity: 1,
        });
      if (includesTaas && fees3.taasMonthly > 0)
        lineItemsPreview.push({
          productKey: "TAAS",
          productId: null,
          price: fees3.taasMonthly,
          quantity: 1,
        });
      if (fees3.cleanupProject > 0)
        lineItemsPreview.push({
          productKey: "CLEANUP_PROJECT",
          productId: productIds.cleanup || null,
          price: fees3.cleanupProject,
          quantity: 1,
        });
      if (fees3.priorYearFilings > 0)
        lineItemsPreview.push({
          productKey: "PRIOR_YEAR_FILINGS",
          productId: null,
          price: fees3.priorYearFilings,
          quantity: 1,
        });
      if (includesPayroll && fees3.payroll > 0)
        lineItemsPreview.push({
          productKey: "PAYROLL_SERVICE",
          productId: null,
          price: fees3.payroll,
          quantity: 1,
        });
      if (includesAP && fees3.ap > 0)
        lineItemsPreview.push({
          productKey:
            (quote as any).apServiceTier === "advanced"
              ? "AP_ADVANCED_SERVICE"
              : "AP_LITE_SERVICE",
          productId: null,
          price: fees3.ap,
          quantity: 1,
        });
      if (includesAR && fees3.ar > 0)
        lineItemsPreview.push({
          productKey:
            (quote as any).arServiceTier === "advanced"
              ? "AR_ADVANCED_SERVICE"
              : "AR_LITE_SERVICE",
          productId: null,
          price: fees3.ar,
          quantity: 1,
        });
      if (includesAgentOfService && fees3.agentOfService > 0)
        lineItemsPreview.push({
          productKey: "AGENT_OF_SERVICE",
          productId: null,
          price: fees3.agentOfService,
          quantity: 1,
        });
      if ((quote as any).serviceTier === "Concierge" && fees3.serviceTier > 0)
        lineItemsPreview.push({
          productKey: "CONCIERGE_SERVICE_TIER",
          productId: null,
          price: fees3.serviceTier,
          quantity: 1,
        });
      else if (
        (quote as any).serviceTier === "Guided" &&
        fees3.serviceTier > 0
      )
        lineItemsPreview.push({
          productKey: "GUIDED_SERVICE_TIER",
          productId: null,
          price: fees3.serviceTier,
          quantity: 1,
        });
      const qboFee = fees3.qbo || (pricingInput.qboSubscription ? 60 : 0);
      if (pricingInput.qboSubscription)
        lineItemsPreview.push({
          productKey: "MANAGED_QBO_SUBSCRIPTION",
          productId: null,
          price: qboFee,
          quantity: 1,
        });
      const payload = {
        mode: "create",
        quoteId,
        contactVerified: contactResult.verified,
        contactId: contact?.id || null,
        companyName,
        ownerEmail,
        ownerId,
        includes: {
          bookkeeping: includesBookkeeping,
          taas: includesTaas,
          payroll: includesPayroll,
          ap: includesAP,
          ar: includesAR,
          agentOfService: includesAgentOfService,
          cfoAdvisory: includesCfoAdvisory,
          fpaBuild: includesFpaBuild,
        },
        totals: {
          monthly: fees3.combinedMonthly,
          setup: fees3.combinedSetup,
          bookkeepingSetupFee: fees3.bookkeepingSetup,
        },
        productIds,
        lineItemsPreview,
        debug: {
          pricingInput,
          taasMissing,
        },
      };
      return sendOk(res, payload, undefined, payload as any);
    } catch (error) {
      console.error("Create diagnostics (GET) failed:", error);
      return sendError(
        res,
        "DIAGNOSTICS_CREATE_FAILED",
        "Create diagnostics failed",
        500,
      );
    }
  });

  app.get("/api/hubspot/diagnostics/update", requireAuth, async (req, res) => {
    try {
      const quoteId =
        typeof (req.query as any).quoteId === "string"
          ? (req.query as any).quoteId
          : undefined;
      if (!quoteId)
        return sendError(res, "INVALID_REQUEST", "quoteId required", 400);
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
        );
      const idNum = parseInt(String(quoteId), 10);
      if (Number.isNaN(idNum))
        return sendError(res, "INVALID_REQUEST", "invalid quoteId", 400);
      const quote = await storage.getQuote(idNum);
      if (!quote)
        return sendError(res, "NOT_FOUND", `Quote ${quoteId} not found`, 404);
      if (!(quote as any).hubspotDealId || !(quote as any).hubspotQuoteId)
        return sendError(
          res,
          "INVALID_STATE",
          "Quote missing hubspotDealId or hubspotQuoteId; cannot update",
          400,
        );

      const contactResult = await hubSpotService.verifyContactByEmail(
        quote.contactEmail,
      );
      const contact = contactResult.contact || null;
      const companyName = contact?.properties?.company || "Unknown Company";
      const ownerEmail = (req.user as any)?.email || null;
      const ownerId = ownerEmail
        ? await hubSpotService.getOwnerByEmail(ownerEmail)
        : null;
      const pricingInput = toPricingDataFromQuote(quote);
      const svcConfig4 = buildServiceConfig(quote);
      const fees4 = svcConfig4.fees;
      const includes4 = svcConfig4.includes;
      const includesBookkeeping = includes4.bookkeeping;
      const includesTaas = includes4.taas;
      const includesPayroll = includes4.payroll;
      const includesAP = includes4.ap;
      const includesAR = includes4.ar;
      const includesAgentOfService = includes4.agentOfService;
      const includesCfoAdvisory = includes4.cfoAdvisory;
      const includesFpaBuild = Boolean((quote as any).serviceFpaBuild);
      const productIds = await hubSpotService.verifyAndGetProductIds();
      const lineItemsPreview: Array<{
        productKey: string;
        productId: string | null;
        price: number;
        quantity: number;
        note?: string;
      }> = [];
      if (includesBookkeeping && fees4.bookkeepingMonthly > 0)
        lineItemsPreview.push({
          productKey: "MONTHLY_BOOKKEEPING",
          productId: productIds.bookkeeping || null,
          price: fees4.bookkeepingMonthly,
          quantity: 1,
        });
      if (includesBookkeeping && fees4.bookkeepingSetup > 0)
        lineItemsPreview.push({
          productKey: "MONTHLY_BOOKKEEPING_SETUP",
          productId: null,
          price: fees4.bookkeepingSetup,
          quantity: 1,
        });
      if (includesTaas && fees4.taasMonthly > 0)
        lineItemsPreview.push({
          productKey: "TAAS",
          productId: null,
          price: fees4.taasMonthly,
          quantity: 1,
        });
      if (fees4.cleanupProject > 0)
        lineItemsPreview.push({
          productKey: "CLEANUP_PROJECT",
          productId: productIds.cleanup || null,
          price: fees4.cleanupProject,
          quantity: 1,
        });
      if (fees4.priorYearFilings > 0)
        lineItemsPreview.push({
          productKey: "PRIOR_YEAR_FILINGS",
          productId: null,
          price: fees4.priorYearFilings,
          quantity: 1,
        });
      if (includesPayroll && fees4.payroll > 0)
        lineItemsPreview.push({
          productKey: "PAYROLL_SERVICE",
          productId: null,
          price: fees4.payroll,
          quantity: 1,
        });
      if (includesAP && fees4.ap > 0)
        lineItemsPreview.push({
          productKey:
            (quote as any).apServiceTier === "advanced"
              ? "AP_ADVANCED_SERVICE"
              : "AP_LITE_SERVICE",
          productId: null,
          price: fees4.ap,
          quantity: 1,
        });
      if (includesAR && fees4.ar > 0)
        lineItemsPreview.push({
          productKey:
            (quote as any).arServiceTier === "advanced"
              ? "AR_ADVANCED_SERVICE"
              : "AR_LITE_SERVICE",
          productId: null,
          price: fees4.ar,
          quantity: 1,
        });
      if (includesAgentOfService && fees4.agentOfService > 0)
        lineItemsPreview.push({
          productKey: "AGENT_OF_SERVICE",
          productId: null,
          price: fees4.agentOfService,
          quantity: 1,
        });
      if ((quote as any).serviceTier === "Concierge" && fees4.serviceTier > 0)
        lineItemsPreview.push({
          productKey: "CONCIERGE_SERVICE_TIER",
          productId: null,
          price: fees4.serviceTier,
          quantity: 1,
        });
      else if (
        (quote as any).serviceTier === "Guided" &&
        fees4.serviceTier > 0
      )
        lineItemsPreview.push({
          productKey: "GUIDED_SERVICE_TIER",
          productId: null,
          price: fees4.serviceTier,
          quantity: 1,
        });
      const qboFee2 = fees4.qbo || (pricingInput.qboSubscription ? 60 : 0);
      if (pricingInput.qboSubscription)
        lineItemsPreview.push({
          productKey: "MANAGED_QBO_SUBSCRIPTION",
          productId: null,
          price: qboFee2,
          quantity: 1,
        });
      const updatePreview = {
        monthlyFeeDb: parseFloat(((quote as any).monthlyFee || "0") as string),
        setupFeeDb: parseFloat(((quote as any).setupFee || "0") as string),
        recalculated: {
          bookkeepingMonthlyFee: fees4.bookkeepingMonthly,
          bookkeepingSetupFee: fees4.bookkeepingSetup,
          taasMonthlyFee: fees4.taasMonthly,
          serviceTierFee: fees4.serviceTier,
          payrollFee: fees4.payroll,
          apFee: fees4.ap,
          arFee: fees4.ar,
          agentOfServiceFee: fees4.agentOfService,
          cfoAdvisoryFee: fees4.cfoAdvisory,
          cleanupProjectFee: fees4.cleanupProject,
          priorYearFilingsFee: fees4.priorYearFilings,
          qboFee: fees4.qbo || 0,
        },
      };
      const payload = {
        mode: "update",
        quoteId,
        existing: {
          hubspotDealId: (quote as any).hubspotDealId || null,
          hubspotQuoteId: (quote as any).hubspotQuoteId || null,
        },
        contactVerified: contactResult.verified,
        contactId: contact?.id || null,
        companyName,
        ownerEmail,
        ownerId,
        includes: {
          bookkeeping: includesBookkeeping,
          taas: includesTaas,
          payroll: includesPayroll,
          ap: includesAP,
          ar: includesAR,
          agentOfService: includesAgentOfService,
          cfoAdvisory: includesCfoAdvisory,
          fpaBuild: includesFpaBuild,
        },
        totals: {
          monthly: fees4.combinedMonthly,
          setup: fees4.combinedSetup,
          bookkeepingSetupFee: fees4.bookkeepingSetup,
        },
        productIds,
        lineItemsPreview,
        updatePreview,
      };
      return sendOk(res, payload, undefined, payload as any);
    } catch (error) {
      console.error("Update diagnostics (GET) failed:", error);
      return sendError(
        res,
        "DIAGNOSTICS_UPDATE_FAILED",
        "Update diagnostics failed",
        500,
      );
    }
  });

  // POST /api/hubspot/retry-job (admin only)
  app.post("/api/hubspot/retry-job", requireAuth, async (req, res) => {
    try {
      if ((req.user as any)?.role !== "admin")
        return sendError(res, "FORBIDDEN", "Admin access required", 403);
      const { jobId } = (req.body || {}) as { jobId?: string };
      if (!jobId)
        return sendError(res, "INVALID_REQUEST", "Job ID is required", 400);
      const { retryFailedJob } = await import("./jobs/hubspot-queue-manager");
      await retryFailedJob(jobId);
      return sendOk(res, { jobId }, undefined, {
        jobId,
        message: "Job retry initiated",
      });
    } catch (error) {
      console.error("Failed to retry job:", error);
      return sendError(res, "RETRY_JOB_FAILED", "Failed to retry job", 500);
    }
  });

  // GET /api/hubspot/queue-metrics
  app.get("/api/hubspot/queue-metrics", requireAuth, async (_req, res) => {
    try {
      const { getHubSpotQueueMetrics } = await import(
        "./hubspot-background-jobs.js"
      );
      const metrics = await getHubSpotQueueMetrics();
      return sendOk(res, metrics, undefined, metrics as any);
    } catch (error) {
      console.error("HubSpot queue metrics error:", error);
      return sendError(
        res,
        "QUEUE_METRICS_FAILED",
        "Failed to get HubSpot queue metrics",
        500,
      );
    }
  });

  // POST /api/hubspot/schedule-sync
  app.post("/api/hubspot/schedule-sync", requireAuth, async (req, res) => {
    try {
      const { type, contactId, dealId } = (req.body || {}) as {
        type?: string;
        contactId?: string;
        dealId?: string;
      };
      const {
        scheduleFullSync,
        scheduleIncrementalSync,
        scheduleContactEnrichment,
        scheduleDealSync,
      } = await import("./hubspot-background-jobs.js");
      let jobId: string | null = null;
      switch (type) {
        case "full-sync":
          jobId = await scheduleFullSync((req.user as any)?.id);
          break;
        case "incremental-sync":
          jobId = await scheduleIncrementalSync();
          break;
        case "contact-enrichment":
          if (!contactId)
            return sendError(
              res,
              "INVALID_REQUEST",
              "Contact ID required for contact enrichment",
              400,
            );
          jobId = await scheduleContactEnrichment(
            contactId,
            (req.user as any)?.id,
          );
          break;
        case "deal-sync":
          jobId = await scheduleDealSync(dealId);
          break;
        default:
          return sendError(res, "INVALID_REQUEST", "Invalid sync type", 400);
      }
      if (jobId)
        return sendOk(
          res,
          { message: `${type} scheduled successfully`, jobId },
          undefined,
          { message: `${type} scheduled successfully`, jobId },
        );
      return sendError(
        res,
        "SCHEDULE_FAILED",
        `Failed to schedule ${type}`,
        500,
      );
    } catch (error) {
      console.error("Schedule HubSpot sync error:", error);
      return sendError(
        res,
        "SCHEDULE_FAILED",
        "Failed to schedule HubSpot sync",
        500,
      );
    }
  });

  // POST /api/hubspot/push-quote (legacy direct push via unified path)
  app.post("/api/hubspot/push-quote", requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number | string };
      if (!quoteId)
        return sendError(res, "INVALID_REQUEST", "Quote ID is required", 400);
      if (!req.user)
        return sendError(res, "UNAUTHENTICATED", "User not authenticated", 401);
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
        );
      const idNum =
        typeof quoteId === "string" ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum))
        return sendError(res, "INVALID_REQUEST", "Invalid quote ID", 400);
      const quote = await storage.getQuote(idNum);
      if (!quote) return sendError(res, "NOT_FOUND", "Quote not found", 404);
      const result = await syncQuoteToHubSpot(
        idNum,
        "create",
        (req.user as any)!.email,
      );
      return sendOk(
        res,
        {
          hubspotDealId: result.hubspotDealId,
          hubspotQuoteId: result.hubspotQuoteId,
        },
        undefined,
        {
          hubspotDealId: result.hubspotDealId,
          hubspotQuoteId: result.hubspotQuoteId,
          message: "Successfully pushed to HubSpot (unified)",
        },
      );
    } catch (error) {
      console.error("HUBSPOT PUSH ERROR:", error);
      return sendError(res, "HUBSPOT_PUSH_FAILED", getErrorMessage(error), 500);
    }
  });

  // POST /api/hubspot/update-quote (legacy direct update via unified path)
  app.post("/api/hubspot/update-quote", requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number | string };
      if (!quoteId)
        return sendError(res, "INVALID_REQUEST", "Quote ID is required", 400);
      if (!hubSpotService)
        return sendError(
          res,
          "HUBSPOT_NOT_CONFIGURED",
          "HubSpot integration not configured",
          400,
        );
      const idNum =
        typeof quoteId === "string" ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum))
        return sendError(res, "INVALID_REQUEST", "Invalid quote ID", 400);
      const quote = await storage.getQuote(idNum);
      if (!quote || !(quote as any).hubspotQuoteId)
        return sendError(
          res,
          "NOT_FOUND",
          "Quote not found or not linked to HubSpot",
          404,
        );
      const result = await syncQuoteToHubSpot(
        idNum,
        "update",
        (req.user as any)!.email,
      );
      return sendOk(
        res,
        {
          hubspotDealId: result.hubspotDealId,
          hubspotQuoteId: result.hubspotQuoteId,
        },
        undefined,
        {
          hubspotDealId: result.hubspotDealId,
          hubspotQuoteId: result.hubspotQuoteId,
          message: "HubSpot quote updated (unified)",
        },
      );
    } catch (error) {
      console.error("ERROR UPDATING HUBSPOT QUOTE:", error);
      return sendError(
        res,
        "HUBSPOT_UPDATE_FAILED",
        getErrorMessage(error),
        500,
      );
    }
  });

  // GET /api/hubspot/oauth/callback
  app.get("/api/hubspot/oauth/callback", async (req, res) => {
    try {
      const { code, state } = (req.query || {}) as any;
      console.log("HubSpot OAuth callback received:", {
        code: code ? "present" : "missing",
        state,
      });
      res.send(`
        <html>
          <body>
            <h1>HubSpot OAuth Callback</h1>
            <p>Authorization code received successfully.</p>
            <p>You can close this window and return to your app configuration.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send("OAuth callback failed");
    }
  });
}
