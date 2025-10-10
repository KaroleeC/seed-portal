import { HubSpotService, hubSpotService as hsSingleton } from "../../hubspot";
import { hubspotLogger } from "../../logger";
import { appendModuleLog } from "../../logs-feed";
import { buildServiceConfig, type ServiceConfig } from "./compose.js";
import type { IStorage } from "../../storage";
import { recordHubspotSync } from "../../metrics";
import { createHash } from "crypto";

export interface SyncResult {
  success: boolean;
  mode: "create" | "update";
  quoteId: number;
  hubspotDealId?: string | null;
  hubspotQuoteId?: string | null;
  contactId?: string | null;
  ownerId?: string | null;
  totals?: { monthly: number; setup: number };
  message?: string;
}

export function normalizeQuoteId(input: string | number): number {
  const id = typeof input === "string" ? parseInt(input, 10) : input;
  if (!id || Number.isNaN(id)) {
    throw new Error("Invalid quoteId");
  }
  return id;
}

/**
 * Extract only HubSpot-relevant fields from quote
 * Reduces payload size by ~70% by removing UI-only and non-essential fields
 */
function extractHubSpotFields(quote: any): any {
  return {
    // Service flags (used for deal/quote naming)
    serviceBookkeeping: quote.serviceBookkeeping,
    serviceMonthlyBookkeeping: quote.serviceMonthlyBookkeeping,
    serviceTaas: quote.serviceTaas,
    serviceTaasMonthly: quote.serviceTaasMonthly,
    servicePayroll: quote.servicePayroll,
    servicePayrollService: quote.servicePayrollService,
    serviceApArLite: quote.serviceApArLite,
    serviceApArService: quote.serviceApArService,
    serviceApLite: quote.serviceApLite,
    serviceApAdvanced: quote.serviceApAdvanced,
    serviceArService: quote.serviceArService,
    serviceArLite: quote.serviceArLite,
    serviceArAdvanced: quote.serviceArAdvanced,
    serviceAgentOfService: quote.serviceAgentOfService,
    serviceCfoAdvisory: quote.serviceCfoAdvisory,
    serviceFpaLite: quote.serviceFpaLite,
    serviceFpaBuild: quote.serviceFpaBuild,
    serviceFpaSupport: quote.serviceFpaSupport,
    serviceCleanupProjects: quote.serviceCleanupProjects,
    servicePriorYearFilings: quote.servicePriorYearFilings,

    // Deal custom properties
    numEntities: quote.numEntities,
    statesFiled: quote.statesFiled,
    numBusinessOwners: quote.numBusinessOwners,
    cleanupMonths: quote.cleanupMonths,
    priorYearsUnfiled: quote.priorYearsUnfiled,
    include1040s: quote.include1040s,
    internationalFiling: quote.internationalFiling,
    businessLoans: quote.businessLoans,
    accountingBasis: quote.accountingBasis,
    currentBookkeepingSoftware: quote.currentBookkeepingSoftware,
    primaryBank: quote.primaryBank,

    // Quote line item details
    apServiceTier: quote.apServiceTier,
    arServiceTier: quote.arServiceTier,
    serviceTier: quote.serviceTier,
    qboSubscription: quote.qboSubscription,
    qboFee: quote.qboFee,

    // Scope assumptions generation
    monthlyRevenueRange: quote.monthlyRevenueRange,
    monthlyTransactions: quote.monthlyTransactions,
    industry: quote.industry,
    cleanupComplexity: quote.cleanupComplexity,
    bookkeepingQuality: quote.bookkeepingQuality,
    payrollEmployeeCount: quote.payrollEmployeeCount,
    payrollStateCount: quote.payrollStateCount,
    apVendorCount: quote.apVendorCount,
    arCustomerCount: quote.arCustomerCount,
  };
}

/**
 * Compute sync signature for idempotent updates
 * Returns a compact hash of material fields that affect HubSpot sync
 *
 * If signature matches last sync, we can skip the update (no-op)
 *
 * @param config - Service configuration with fees and includes
 * @param serviceTier - Service tier level
 * @returns 16-character hex hash
 */
function computeSyncSignature(config: ServiceConfig, serviceTier: string): string {
  const signatureData = {
    // Totals
    monthly: config.fees.combinedMonthly,
    setup: config.fees.combinedOneTimeFees,

    // Service includes (boolean flags)
    bookkeeping: config.includes.bookkeeping,
    taas: config.includes.taas,
    payroll: config.includes.payroll,
    ap: config.includes.ap,
    ar: config.includes.ar,
    agentOfService: config.includes.agentOfService,
    cfoAdvisory: config.includes.cfoAdvisory,
    fpaBuild: config.includes.fpaBuild,
    cleanup: config.includes.cleanup,
    priorYearFilings: config.includes.priorYearFilings,

    // Service tier
    serviceTier,

    // Individual fees (for line items)
    bookkeepingMonthly: config.fees.bookkeepingMonthly,
    taasMonthly: config.fees.taasMonthly,
    payrollFee: config.fees.payroll,
    apFee: config.fees.ap,
    arFee: config.fees.ar,
    agentOfServiceFee: config.fees.agentOfService,
    cfoAdvisoryFee: config.fees.cfoAdvisory,
    cleanupFee: config.fees.cleanupProject,
    priorYearFilingsFee: config.fees.priorYearFilings,
  };

  // Create deterministic JSON string (sorted keys)
  const jsonString = JSON.stringify(signatureData, Object.keys(signatureData).sort());

  // Compute SHA-256 hash, take first 16 chars (64 bits)
  const hash = createHash("sha256").update(jsonString).digest("hex").substring(0, 16);

  return hash;
}

export function determineMode(
  action: SyncAction,
  quote: { hubspotDealId?: string | null; hubspotQuoteId?: string | null }
): "create" | "update" {
  if (action === "create" || action === "update") return action;
  const hasHubSpotIds = Boolean(quote?.hubspotDealId && quote?.hubspotQuoteId);
  return hasHubSpotIds ? "update" : "create";
}
async function getStorage(): Promise<IStorage> {
  const mod = await import("../../storage.js");
  return mod.storage as IStorage;
}

/**
 * Step timing tracker for detailed telemetry
 */
interface StepTimings {
  fetchQuote?: number;
  parallelLookups?: number;
  contactVerify?: number;
  ownerLookup?: number;
  buildConfig?: number;
  signatureCheck?: number;
  dealOperation?: number;
  quoteOperation?: number;
  dbUpdate?: number;
  total?: number;
}

export async function syncQuoteToHubSpot(
  quoteIdInput: string | number,
  action: SyncAction = "auto",
  actorEmail?: string,
  svcOverride?: HubSpotService,
  storageOverride?: IStorage,
  options?: { dryRun?: boolean; includeConnectivity?: boolean }
): Promise<SyncResult> {
  const start = Date.now();
  const timings: StepTimings = {};
  const log = hubspotLogger.child({ op: "syncQuoteToHubSpot" });
  log.info(
    { quoteIdInput, action, actorEmail, dryRun: options?.dryRun },
    "🔄 HubSpot quote sync started"
  );
  appendModuleLog("hubspot", "info", "HubSpot sync started", {
    quoteIdInput,
    action,
    actorEmail,
    dryRun: options?.dryRun,
  });
  const quoteId = normalizeQuoteId(quoteIdInput);

  try {
    const svc = svcOverride ?? hsSingleton ?? new HubSpotService();
    const storage = storageOverride ?? (await getStorage());

    // Step 1: Fetch quote
    const fetchStart = Date.now();
    const quote = await storage.getQuote(quoteId);
    timings.fetchQuote = Date.now() - fetchStart;

    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }

    // Extract only HubSpot-relevant fields (reduces payload by ~70%)
    const trimmedQuoteData = extractHubSpotFields(quote);
    log.debug(
      {
        originalSize: JSON.stringify(quote).length,
        trimmedSize: JSON.stringify(trimmedQuoteData).length,
        reduction: Math.round(
          (1 - JSON.stringify(trimmedQuoteData).length / JSON.stringify(quote).length) * 100
        ),
      },
      "📦 Payload optimized"
    );

    // Step 2 & 3: Parallelize independent HubSpot calls for better performance
    const ownerEmail = actorEmail || (quote as any).ownerEmail || undefined;
    const parallelStart = Date.now();
    const contactStart = Date.now();
    const ownerStart = Date.now();

    const [contactResult, ownerId] = await Promise.all([
      // Verify contact (always required)
      svc.verifyContactByEmail(quote.contactEmail).then((result) => {
        timings.contactVerify = Date.now() - contactStart;
        return result;
      }),
      // Resolve owner (optional, only if email provided)
      ownerEmail
        ? svc
            .getOwnerByEmail(ownerEmail)
            .then((result) => {
              timings.ownerLookup = Date.now() - ownerStart;
              return result;
            })
            .catch((err) => {
              timings.ownerLookup = Date.now() - ownerStart;
              log.warn(
                { ownerEmail, error: err?.message },
                "Owner lookup failed, continuing without owner"
              );
              return null;
            })
        : Promise.resolve(null).then(() => {
            timings.ownerLookup = 0; // No lookup needed
            return null;
          }),
    ]);

    timings.parallelLookups = Date.now() - parallelStart;
    log.debug(
      {
        parallelDuration: timings.parallelLookups,
        contactDuration: timings.contactVerify,
        ownerDuration: timings.ownerLookup,
      },
      "⚡ Parallel lookups completed"
    );

    // Validate contact result
    if (!contactResult.verified || !contactResult.contact) {
      throw new Error(`Contact ${quote.contactEmail} not found in HubSpot`);
    }
    const contact = contactResult.contact;
    const firstName = contact.properties.firstname || "Contact";
    const lastName = contact.properties.lastname || "";
    const companyName = contact.properties.company || "Unknown Company";

    // Step 4: Build consistent service config from our pricing engine
    const configStart = Date.now();
    const config = buildServiceConfig(quote);
    const includes = config.includes;
    const fees = config.fees;
    timings.buildConfig = Date.now() - configStart;
    log.debug(
      {
        quoteId,
        includes,
        fees: {
          combinedMonthly: fees.combinedMonthly,
          combinedSetup: fees.combinedOneTimeFees,
        },
        configDuration: timings.buildConfig,
      },
      "🧮 Computed pricing and service flags"
    );

    // Determine mode
    const mode = determineMode(action, quote);
    log.info({ quoteId, mode }, "📦 Determined sync mode");

    // Step 5: Idempotent update check
    if (mode === "update") {
      const sigStart = Date.now();
      const currentSignature = computeSyncSignature(
        config,
        (quote as any).serviceTier || "Standard"
      );
      const lastSignature = (quote as any).hubspotSyncSig;
      timings.signatureCheck = Date.now() - sigStart;

      if (lastSignature && currentSignature === lastSignature) {
        log.info(
          { quoteId, signature: currentSignature },
          "⏭️  No-op sync: signature unchanged, skipping HubSpot update"
        );
        appendModuleLog("hubspot", "info", "No-op sync: nothing changed", {
          quoteId,
          signature: currentSignature,
        });

        // Return success immediately without any HubSpot API calls
        return {
          success: true,
          mode: "update",
          quoteId,
          hubspotDealId: quote.hubspotDealId,
          hubspotQuoteId: quote.hubspotQuoteId,
          contactId: contact.id,
          ownerId,
          totals: { monthly: fees.combinedMonthly, setup: fees.combinedOneTimeFees },
          message: "No changes detected, skipped sync",
        };
      }

      log.debug(
        { quoteId, currentSignature, lastSignature },
        "🔄 Signature changed, proceeding with update"
      );
    }

    // Dry run path: preview only; no mutations
    if (options?.dryRun) {
      appendModuleLog("hubspot", "info", "Dry run executed - no HubSpot or DB mutations", {
        quoteId,
        mode,
        totals: { monthly: fees.combinedMonthly, setup: fees.combinedOneTimeFees },
      });
      log.info({ quoteId, mode }, "🧪 Dry run: returning preview only");
      const durationMs = Date.now() - start;
      await recordHubspotSync(true, durationMs);
      return {
        success: true,
        mode,
        quoteId,
        hubspotDealId: quote.hubspotDealId || null,
        hubspotQuoteId: quote.hubspotQuoteId || null,
        contactId: contact.id,
        ownerId,
        totals: { monthly: fees.combinedMonthly, setup: fees.combinedOneTimeFees },
        message: "Dry run: no changes applied",
      };
    }

    // Step 6: Ensure deal
    let dealId: string | undefined;
    const dealStart = Date.now();
    if (mode === "update" && quote.hubspotDealId) {
      // Keep deal fresh with the new totals
      log.debug({ quoteId, dealId: quote.hubspotDealId }, "🔁 Updating HubSpot deal totals");
      const updated = await svc.updateDeal(
        quote.hubspotDealId,
        fees.combinedMonthly,
        fees.combinedOneTimeFees,
        ownerId || undefined,
        includes.bookkeeping,
        includes.taas,
        (quote as any).serviceTier || "Standard",
        trimmedQuoteData
      );
      dealId = updated?.id || quote.hubspotDealId;
      timings.dealOperation = Date.now() - dealStart;
      log.debug({ dealDuration: timings.dealOperation }, "⏱️ Deal update completed");
    } else {
      log.debug({ quoteId, contactId: contact.id }, "➕ Creating HubSpot deal");
      let newDeal;
      try {
        newDeal = await svc.createDeal(
          contact.id,
          companyName,
          fees.combinedMonthly,
          fees.combinedOneTimeFees,
          ownerId || undefined,
          includes.bookkeeping,
          includes.taas,
          (quote as any).serviceTier || "Standard",
          trimmedQuoteData
        );
        timings.dealOperation = Date.now() - dealStart;
        log.debug({ dealDuration: timings.dealOperation }, "⏱️ Deal creation completed");
      } catch (e: any) {
        // Surface underlying HubSpot error
        throw new Error(
          `Deal creation failed: ${e?.message || String(e)} | totals={monthly:${fees.combinedMonthly},setup:${fees.combinedOneTimeFees}} includes=${JSON.stringify(
            includes
          )}`
        );
      }
      dealId = newDeal?.id;
    }

    if (!dealId) {
      // Include pipeline details to help diagnose config mismatch
      let pipelineInfo: any = null;
      try {
        pipelineInfo = await svc.getSeedSalesPipelineStage();
      } catch {}
      throw new Error(
        `Failed to create or update HubSpot deal | pipeline=${JSON.stringify(
          pipelineInfo
        )} | totals={monthly:${fees.combinedMonthly},setup:${fees.combinedOneTimeFees}} includes=${JSON.stringify(
          includes
        )}`
      );
    }

    // Step 7: Create or Update Quote in HubSpot
    const quoteOpStart = Date.now();
    if (mode === "create") {
      log.debug({ quoteId, dealId }, "🧾 Creating HubSpot quote");
      const created = await svc.createQuote({
        dealId,
        companyName,
        monthlyFee: fees.combinedMonthly,
        oneTimeFees: fees.combinedOneTimeFees,
        userEmail: ownerEmail || "unknown@seedfinancial.io",
        firstName,
        lastName,
        includesBookkeeping: includes.bookkeeping,
        includesTaas: includes.taas,
        taasMonthlyFee: fees.taasMonthly,
        bookkeepingMonthlyFee: fees.bookkeepingMonthly,
        bookkeepingSetupFee: fees.bookkeepingSetup,
        quoteData: trimmedQuoteData,
        serviceTier: (quote as any).serviceTier || "Standard",
        includesPayroll: includes.payroll,
        payrollFee: fees.payroll,
        includesAP: includes.ap,
        apFee: fees.ap,
        includesAR: includes.ar,
        arFee: fees.ar,
        includesAgentOfService: includes.agentOfService,
        agentOfServiceFee: fees.agentOfService,
        includesCfoAdvisory: includes.cfoAdvisory,
        cfoAdvisoryFee: fees.cfoAdvisory,
        cleanupProjectFee: fees.cleanupProject,
        priorYearFilingsFee: fees.priorYearFilings,
        includesFpaBuild: (quote as any).serviceFpaBuild || false,
        fpaServiceFee: 0,
        calculatedBookkeepingMonthlyFee: fees.bookkeepingMonthly,
        calculatedTaasMonthlyFee: fees.taasMonthly,
        calculatedServiceTierFee: fees.serviceTier,
      });

      if (!created?.id) {
        throw new Error("HubSpot quote creation failed");
      }

      timings.quoteOperation = Date.now() - quoteOpStart;
      log.debug({ quoteOpDuration: timings.quoteOperation }, "⏱️ Quote creation completed");

      // Step 8: Persist IDs and sync signature
      const dbStart = Date.now();
      const syncSignature = computeSyncSignature(config, (quote as any).serviceTier || "Standard");
      await storage.updateQuote({
        id: quoteId,
        hubspotContactId: contact.id,
        hubspotDealId: dealId,
        hubspotQuoteId: created.id,
        hubspotContactVerified: true,
        companyName,
        hubspotSyncSig: syncSignature,
      } as any);
      timings.dbUpdate = Date.now() - dbStart;
      log.debug({ dbDuration: timings.dbUpdate, syncSignature }, "⏱️ DB update completed");

      log.info({ quoteId, dealId, hubspotQuoteId: created.id }, "✅ HubSpot create sync completed");
      appendModuleLog("hubspot", "info", "HubSpot create sync completed", {
        quoteId,
        dealId,
        hubspotQuoteId: created.id,
      });

      timings.total = Date.now() - start;
      log.info(
        {
          quoteId,
          totalDuration: timings.total,
          mode: "create",
          timings,
        },
        "📊 Sync performance metrics"
      );
      await recordHubspotSync(true, timings.total);
      return {
        success: true,
        mode,
        quoteId,
        hubspotDealId: dealId,
        hubspotQuoteId: created.id,
        contactId: contact.id,
        ownerId,
        totals: { monthly: fees.combinedMonthly, setup: fees.combinedOneTimeFees },
      };
    }

    // Update mode
    if (!quote.hubspotQuoteId) {
      throw new Error("Quote has no hubspotQuoteId; cannot update");
    }

    const updatedOk = await svc.updateQuote({
      quoteId: quote.hubspotQuoteId,
      dealId,
      companyName,
      monthlyFee: fees.combinedMonthly,
      oneTimeFees: fees.combinedOneTimeFees,
      userEmail: ownerEmail || "unknown@seedfinancial.io",
      firstName,
      lastName,
      includesBookkeeping: includes.bookkeeping,
      includesTaas: includes.taas,
      taasMonthlyFee: fees.taasMonthly,
      bookkeepingMonthlyFee: fees.bookkeepingMonthly,
      bookkeepingSetupFee: fees.bookkeepingSetup,
      quoteData: trimmedQuoteData,
      serviceTier: (quote as any).serviceTier || "Standard",
      includesPayroll: includes.payroll,
      payrollFee: fees.payroll,
      includesAP: includes.ap,
      apFee: fees.ap,
      includesAR: includes.ar,
      arFee: fees.ar,
      includesAgentOfService: includes.agentOfService,
      agentOfServiceFee: fees.agentOfService,
      includesCfoAdvisory: includes.cfoAdvisory,
      cfoAdvisoryFee: fees.cfoAdvisory,
      cleanupProjectFee: fees.cleanupProject,
      priorYearFilingsFee: fees.priorYearFilings,
      includesFpaBuild: (quote as any).serviceFpaBuild || false,
      fpaServiceFee: 0,
      calculatedBookkeepingMonthlyFee: fees.bookkeepingMonthly,
      calculatedTaasMonthlyFee: fees.taasMonthly,
      calculatedServiceTierFee: fees.serviceTier,
    });

    timings.quoteOperation = Date.now() - quoteOpStart;
    log.debug({ quoteOpDuration: timings.quoteOperation }, "⏱️ Quote update completed");

    // Persist updated sync signature
    if (updatedOk) {
      const dbStart = Date.now();
      const syncSignature = computeSyncSignature(config, (quote as any).serviceTier || "Standard");
      await storage.updateQuote({
        id: quoteId,
        hubspotSyncSig: syncSignature,
      } as any);
      timings.dbUpdate = Date.now() - dbStart;
      log.debug({ syncSignature, dbDuration: timings.dbUpdate }, "💾 Sync signature updated");
    }

    log.info(
      { quoteId, dealId, hubspotQuoteId: quote.hubspotQuoteId, updatedOk },
      "✅ HubSpot update sync completed"
    );
    appendModuleLog("hubspot", "info", "HubSpot update sync completed", {
      quoteId,
      dealId,
      hubspotQuoteId: quote.hubspotQuoteId,
      updatedOk,
    });
    timings.total = Date.now() - start;
    log.info(
      {
        quoteId,
        totalDuration: timings.total,
        mode: "update",
        timings,
      },
      "📊 Sync performance metrics"
    );
    await recordHubspotSync(
      Boolean(updatedOk),
      timings.total,
      updatedOk ? undefined : "updateQuote returned false"
    );

    return {
      success: Boolean(updatedOk),
      mode,
      quoteId,
      hubspotDealId: dealId,
      hubspotQuoteId: quote.hubspotQuoteId,
      contactId: contact.id,
      ownerId,
      totals: { monthly: fees.combinedMonthly, setup: fees.combinedOneTimeFees },
    };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    await recordHubspotSync(false, durationMs, err?.message || String(err));
    appendModuleLog("hubspot", "error", "HubSpot sync failed", {
      quoteId,
      action,
      error: err?.message,
    });
    throw err;
  }
}
