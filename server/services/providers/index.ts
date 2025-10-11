/**
 * Quote Provider Factory (Server-Side)
 *
 * Central place to determine which quote provider to use.
 * Makes migration from HubSpot → SeedPay seamless.
 *
 * DRY Principle: Single source of truth for provider selection
 *
 * Usage:
 * ```typescript
 * const provider = getQuoteProvider();
 * await provider.syncQuote(quoteId);
 * ```
 *
 * Migration Example:
 * ```typescript
 * // Today: HubSpot
 * QUOTE_PROVIDER=hubspot
 *
 * // Tomorrow: SeedPay
 * QUOTE_PROVIDER=seedpay  // ← Change one env var
 * ```
 */

import type { IQuoteProvider } from "../quote-provider.interface";
import { hubspotProvider } from "./hubspot-provider";

/**
 * Get the configured quote provider
 *
 * Environment-based provider selection:
 * - QUOTE_PROVIDER=hubspot → HubSpotQuoteProvider (default)
 * - QUOTE_PROVIDER=seedpay → SeedPayQuoteProvider (future)
 *
 * @returns Active quote provider instance
 */
export function getQuoteProvider(): IQuoteProvider {
  const providerName = process.env.QUOTE_PROVIDER || "hubspot";

  switch (providerName.toLowerCase()) {
    case "hubspot":
      return hubspotProvider;

    // Future: SeedPay provider
    // case "seedpay":
    //   return seedpayProvider;

    default:
      console.warn(`Unknown provider "${providerName}", falling back to HubSpot`);
      return hubspotProvider;
  }
}

/**
 * Get provider by name (for testing/admin purposes)
 *
 * @param name - Provider name ("hubspot", "seedpay", etc.)
 * @returns Provider instance or null if not found
 */
export function getProviderByName(name: string): IQuoteProvider | null {
  switch (name.toLowerCase()) {
    case "hubspot":
      return hubspotProvider;

    // Future providers
    // case "seedpay":
    //   return seedpayProvider;

    default:
      return null;
  }
}

/**
 * List all available providers
 *
 * Useful for admin UI or diagnostics
 *
 * @returns Array of provider names
 */
export function listAvailableProviders(): string[] {
  return [
    "hubspot",
    // "seedpay", // Future
  ];
}

/**
 * Check if a provider is available
 *
 * @param name - Provider name
 * @returns True if provider exists
 */
export function isProviderAvailable(name: string): boolean {
  return getProviderByName(name) !== null;
}

// Re-export for convenience
export { hubspotProvider } from "./hubspot-provider";
export type {
  IQuoteProvider,
  QuoteSyncResult,
  QuoteSyncOptions,
} from "../quote-provider.interface";
