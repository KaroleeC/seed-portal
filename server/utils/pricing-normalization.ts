/**
 * Pricing Normalization Utilities
 *
 * Helper functions for normalizing pricing data from various sources.
 */

import type { PricingData } from "@shared/pricing";

/**
 * Normalizes arbitrary quote-like objects into PricingData
 *
 * Handles:
 * - Null/undefined → undefined
 * - String numbers → parsed numbers
 * - Invalid numbers → undefined
 *
 * @param input - Raw quote data (from DB, API, etc.)
 * @returns Normalized PricingData object
 *
 * @example
 * const raw = { monthlyRevenueRange: "10000-50000", cleanupMonths: "3" };
 * const normalized = toPricingData(raw);
 * // => { monthlyRevenueRange: "10000-50000", cleanupMonths: 3 }
 */
export function toPricingData(input: any): PricingData {
  const num = (v: any): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    monthlyRevenueRange: input?.monthlyRevenueRange || undefined,
    monthlyTransactions: input?.monthlyTransactions || undefined,
    industry: input?.industry || undefined,
    cleanupMonths: num(input?.cleanupMonths),
    cleanupComplexity: input?.cleanupComplexity || undefined,
    cleanupOverride: input?.cleanupOverride ?? undefined,
    overrideReason: input?.overrideReason ?? undefined,
    customSetupFee: input?.customSetupFee || undefined,
    serviceTier: input?.serviceTier || undefined,
    includesTaas: input?.includesTaas ?? undefined,
    includesQbo: input?.includesQbo ?? undefined,
    includesR2R: input?.includesR2R ?? undefined,
    includesPayroll: input?.includesPayroll ?? undefined,
    includesPOS: input?.includesPOS ?? undefined,
    includesCommerce: input?.includesCommerce ?? undefined,
    includesInventory: input?.includesInventory ?? undefined,
    customServiceSelection: input?.customServiceSelection || undefined,
    addons: input?.addons || undefined,
    discountPercent: num(input?.discountPercent),
    notes: input?.notes || undefined,
    version: input?.version || undefined,
  };
}
