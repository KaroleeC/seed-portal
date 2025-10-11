/**
 * Quote Provider Factory
 *
 * Central place to determine which quote provider to use.
 * Makes migration from HubSpot → SeedPay seamless.
 *
 * Usage:
 * ```typescript
 * const provider = getQuoteProvider();
 * await provider.syncQuote(quoteId);
 * ```
 */

import type { IQuoteProvider } from "./quote-provider.interface";
import { hubspotProvider } from "./hubspot-provider";

/**
 * Environment-based provider selection
 *
 * Future: Add VITE_QUOTE_PROVIDER env var
 * - "hubspot" → HubSpotQuoteProvider
 * - "seedpay" → SeedPayQuoteProvider
 */
export function getQuoteProvider(): IQuoteProvider {
  // TODO: Read from environment when SeedPay is ready
  // const providerName = import.meta.env.VITE_QUOTE_PROVIDER || "hubspot";

  // For now, always use HubSpot
  return hubspotProvider;
}

// Re-export types and providers
export { hubspotProvider } from "./hubspot-provider";
export type { IQuoteProvider, QuoteSyncResult, QuoteSyncOptions } from "./quote-provider.interface";
