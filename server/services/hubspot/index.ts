/**
 * HubSpot Services Index
 *
 * Clean exports for all HubSpot service modules.
 * Use these imports instead of reaching into individual files.
 *
 * @example
 * ```typescript
 * import { syncQuoteToHubSpot, buildServiceConfig } from './services/hubspot';
 * ```
 */

// ============================================================================
// UNIFIED SYNC (Primary Entry Point)
// ============================================================================

export {
  syncQuoteToHubSpot,
  normalizeQuoteId,
  determineMode,
  type SyncAction,
  type SyncResult,
} from "./sync.js";

// ============================================================================
// FEE COMPOSITION & MAPPING
// ============================================================================

export {
  buildServiceConfig,
  toPricingDataFromQuote,
  type ServiceConfig,
  type ServiceFees,
} from "./compose.js";

export { mapFeesToLineItems, validateLineItems, type FeeLineItem } from "./fee-mapper.js";

// ============================================================================
// SERVICE FACTORIES
// ============================================================================

export { createQuotesService, type QuoteConfig, type UpdateQuoteConfig } from "./quotes.js";
export { createDealsService } from "./deals.js";
export { createContactsService } from "./contacts.js";
export { createProductsService } from "./products.js";
export { createBillingService } from "./billing.js";

// ============================================================================
// HTTP CLIENT
// ============================================================================

export type { HubSpotRequestFn } from "./http.js";

// ============================================================================
// LEGACY FACADE (Deprecated - use syncQuoteToHubSpot instead)
// ============================================================================

/**
 * @deprecated Use hubSpotService.getPaidInvoicesInPeriod() directly
 */
export async function getPaidInvoicesInPeriod(
  startDate: string,
  endDate: string,
  salesRepHubspotId?: string
): Promise<any[]> {
  const { hubSpotService } = await import("../../hubspot.js");
  if (!hubSpotService) return [];
  return hubSpotService.getPaidInvoicesInPeriod(startDate, endDate, salesRepHubspotId);
}

/**
 * @deprecated Use hubSpotService.getInvoiceLineItems() directly
 */
export async function getInvoiceLineItems(invoiceId: string): Promise<any[]> {
  const { hubSpotService } = await import("../../hubspot.js");
  if (!hubSpotService) return [];
  return hubSpotService.getInvoiceLineItems(invoiceId);
}
