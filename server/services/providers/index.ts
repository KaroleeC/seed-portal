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
 * - QUOTE_PROVIDER=seedpay → SeedPayQuoteProvider (default, Phase 0+)
 * - QUOTE_PROVIDER=hubspot → HubSpotQuoteProvider (legacy, rollback only)
 *
 * @returns Active quote provider instance
 */
export function getQuoteProvider(): IQuoteProvider {
  const providerName = process.env.QUOTE_PROVIDER || "seedpay";

  switch (providerName.toLowerCase()) {
    case "hubspot":
      console.warn(
        "[PROVIDER] Using legacy HubSpot provider. This should only be used for rollback scenarios."
      );
      return hubspotProvider;

    case "seedpay":
      // Phase 1: Will return seedpayProvider
      // For Phase 0, fall back to HubSpot with warning
      console.warn(
        "[PROVIDER] QUOTE_PROVIDER=seedpay is configured but SeedPay provider not yet implemented. Using HubSpot as temporary fallback. This will be implemented in Phase 1."
      );
      return hubspotProvider;

    default:
      console.warn(
        `[PROVIDER] Unknown provider "${providerName}", falling back to HubSpot. Valid options: "seedpay" (default), "hubspot" (legacy)`
      );
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
