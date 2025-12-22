import { HubSpotService, hubSpotService as hsSingleton } from "../../hubspot";
import { buildServiceConfig } from "./compose";
import { hubspotLogger } from "../../logger";
import { recordHubspotSync } from "../../metrics";
import { appendModuleLog } from "../../logs-feed";

export type SyncAction = "auto" | "create" | "update";

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

export function determineMode(
  action: SyncAction,
  quote: any,
): "create" | "update" {
  if (action === "create" || action === "update") return action;
  const hasHubSpotIds = Boolean(quote?.hubspotDealId && quote?.hubspotQuoteId);
  return hasHubSpotIds ? "update" : "create";
}

async function getStorage() {
  const mod = await import("../../storage.js");
  return mod.storage as any;
}

export async function syncQuoteToHubSpot(
  quoteIdInput: string | number,
  action: SyncAction = "auto",
  actorEmail?: string,
  svcOverride?: InstanceType<typeof HubSpotService>,
  storageOverride?: {
    getQuote: (id: number) => Promise<any | undefined>;
    updateQuote: (q: any) => Promise<any>;
  },
  options?: { dryRun?: boolean; includeConnectivity?: boolean },
): Promise<SyncResult> {
  const start = Date.now();
  const log = hubspotLogger.child({ op: "syncQuoteToHubSpot" });
  log.info(
    { quoteIdInput, action, actorEmail, dryRun: options?.dryRun },
    "🔄 HubSpot quote sync started",
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
    const quote = await storage.getQuote(quoteId);
    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }

    // Verify contact (requested for Dry Run, safe)
    const contactResult = await svc.verifyContactByEmail(quote.contactEmail);
    if (!contactResult.verified || !contactResult.contact) {
      throw new Error(`Contact ${quote.contactEmail} not found in HubSpot`);
    }
    const contact = contactResult.contact;
    const firstName = contact.properties.firstname || "Contact";
    const lastName = contact.properties.lastname || "";
    const companyName = contact.properties.company || "Unknown Company";

    // Resolve owner
    const ownerEmail = actorEmail || (quote as any).ownerEmail || undefined;
    const ownerId = ownerEmail ? await svc.getOwnerByEmail(ownerEmail) : null;

    // Build consistent service config from our pricing engine
    const config = buildServiceConfig(quote);
    const includes = config.includes;
    const fees = config.fees;
    log.debug(
      {
        quoteId,
        includes,
        fees: {
          combinedMonthly: fees.combinedMonthly,
          combinedSetup: fees.combinedSetup,
        },
      },
      "🧮 Computed pricing and service flags",
    );

    // Determine mode
    const mode = determineMode(action, quote);
    log.info({ quoteId, mode }, "📦 Determined sync mode");

    // Dry run path: preview only; no mutations
    if (options?.dryRun) {
      appendModuleLog(
        "hubspot",
        "info",
        "Dry run executed - no HubSpot or DB mutations",
        {
          quoteId,
          mode,
          totals: { monthly: fees.combinedMonthly, setup: fees.combinedSetup },
        },
      );
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
        totals: { monthly: fees.combinedMonthly, setup: fees.combinedSetup },
        message: "Dry run: no changes applied",
      };
    }

    // Ensure deal
    let dealId: string | undefined;
    if (mode === "update" && quote.hubspotDealId) {
      // Keep deal fresh with the new totals
      log.debug(
        { quoteId, dealId: quote.hubspotDealId },
        "🔁 Updating HubSpot deal totals",
      );
      const updated = await svc.updateDeal(
        quote.hubspotDealId,
        fees.combinedMonthly,
        fees.combinedSetup,
        ownerId || undefined,
        includes.bookkeeping,
        includes.taas,
        (quote as any).serviceTier || "Standard",
        quote,
      );
      dealId = updated?.id || quote.hubspotDealId;
    } else {
      log.debug({ quoteId, contactId: contact.id }, "➕ Creating HubSpot deal");
      let newDeal;
      try {
        newDeal = await svc.createDeal(
          contact.id,
          companyName,
          fees.combinedMonthly,
          fees.combinedSetup,
          ownerId || undefined,
          includes.bookkeeping,
          includes.taas,
          (quote as any).serviceTier || "Standard",
          quote,
        );
      } catch (e: any) {
        // Surface underlying HubSpot error
        throw new Error(
          `Deal creation failed: ${e?.message || String(e)} | totals={monthly:${fees.combinedMonthly},setup:${fees.combinedSetup}} includes=${JSON.stringify(
            includes,
          )}`,
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
          pipelineInfo,
        )} | totals={monthly:${fees.combinedMonthly},setup:${fees.combinedSetup}} includes=${JSON.stringify(
          includes,
        )}`,
      );
    }

    // Create or Update Quote in HubSpot
    if (mode === "create") {
      log.debug({ quoteId, dealId }, "🧾 Creating HubSpot quote");
      const created = await svc.createQuote(
        dealId,
        companyName,
        fees.combinedMonthly,
        fees.combinedSetup,
        ownerEmail || "unknown@seedfinancial.io",
        firstName,
        lastName,
        includes.bookkeeping,
        includes.taas,
        /* taas */ fees.taasMonthly,
        /* prior years */ fees.priorYearFilings,
        /* bk monthly */ fees.bookkeepingMonthly,
        /* bk setup */ fees.bookkeepingSetup,
        quote,
        (quote as any).serviceTier || "Standard",
        /* payroll */ includes.payroll,
        fees.payroll,
        /* ap */ includes.ap,
        fees.ap,
        /* ar */ includes.ar,
        fees.ar,
        /* agent */ includes.agentOfService,
        fees.agentOfService,
        /* cfo */ includes.cfoAdvisory,
        fees.cfoAdvisory,
        /* cleanup */ fees.cleanupProject,
        /* prior years */ fees.priorYearFilings,
        /* fpa */ (quote as any).serviceFpaBuild || false,
        0,
        /* calculated */ fees.bookkeepingMonthly,
        fees.taasMonthly,
        fees.serviceTier,
      );

      if (!created?.id) {
        throw new Error("HubSpot quote creation failed");
      }

      // Persist IDs
      await storage.updateQuote({
        id: quoteId,
        hubspotContactId: contact.id,
        hubspotDealId: dealId,
        hubspotQuoteId: created.id,
        hubspotContactVerified: true,
        companyName,
      } as any);
      log.info(
        { quoteId, dealId, hubspotQuoteId: created.id },
        "✅ HubSpot create sync completed",
      );
      appendModuleLog("hubspot", "info", "HubSpot create sync completed", {
        quoteId,
        dealId,
        hubspotQuoteId: created.id,
      });

      const durationMs = Date.now() - start;
      await recordHubspotSync(true, durationMs);
      return {
        success: true,
        mode,
        quoteId,
        hubspotDealId: dealId,
        hubspotQuoteId: created.id,
        contactId: contact.id,
        ownerId,
        totals: { monthly: fees.combinedMonthly, setup: fees.combinedSetup },
      };
    }

    // Update mode
    if (!quote.hubspotQuoteId) {
      throw new Error("Quote has no hubspotQuoteId; cannot update");
    }

    const updatedOk = await svc.updateQuote(
      quote.hubspotQuoteId,
      dealId,
      companyName,
      fees.combinedMonthly,
      fees.combinedSetup,
      ownerEmail || "unknown@seedfinancial.io",
      firstName,
      lastName,
      includes.bookkeeping,
      includes.taas,
      /* taas */ fees.taasMonthly,
      /* prior years */ fees.priorYearFilings,
      /* bk monthly */ fees.bookkeepingMonthly,
      /* bk setup */ fees.bookkeepingSetup,
      quote,
      (quote as any).serviceTier || "Standard",
      /* payroll */ includes.payroll,
      fees.payroll,
      /* ap */ includes.ap,
      fees.ap,
      /* ar */ includes.ar,
      fees.ar,
      /* agent */ includes.agentOfService,
      fees.agentOfService,
      /* cfo */ includes.cfoAdvisory,
      fees.cfoAdvisory,
      /* cleanup */ fees.cleanupProject,
      /* prior years */ fees.priorYearFilings,
      /* fpa */ (quote as any).serviceFpaBuild || false,
      0,
      /* calculated */ fees.bookkeepingMonthly,
      fees.taasMonthly,
      fees.serviceTier,
    );

    log.info(
      { quoteId, dealId, hubspotQuoteId: quote.hubspotQuoteId, updatedOk },
      "✅ HubSpot update sync completed",
    );
    appendModuleLog("hubspot", "info", "HubSpot update sync completed", {
      quoteId,
      dealId,
      hubspotQuoteId: quote.hubspotQuoteId,
      updatedOk,
    });
    const durationMs = Date.now() - start;
    await recordHubspotSync(
      Boolean(updatedOk),
      durationMs,
      updatedOk ? undefined : "updateQuote returned false",
    );

    return {
      success: Boolean(updatedOk),
      mode,
      quoteId,
      hubspotDealId: dealId,
      hubspotQuoteId: quote.hubspotQuoteId,
      contactId: contact.id,
      ownerId,
      totals: { monthly: fees.combinedMonthly, setup: fees.combinedSetup },
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
