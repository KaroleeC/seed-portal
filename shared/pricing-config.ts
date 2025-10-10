import { z } from "zod";

// Canonical, consolidated pricing config shape used by server and client
// Matches server/pricing-config.ts output and admin-routes inputs
export const PricingTierEntrySchema = z.object({
  baseFee: z.number(),
  multiplier: z.number(),
});

export const PricingConfigSchema = z.object({
  baseFees: z.record(z.number()),
  revenueMultipliers: z.record(z.number()),
  transactionSurcharges: z.record(z.number()),
  industryMultipliers: z.record(z.object({ monthly: z.number(), cleanup: z.number() })),
  serviceSettings: z.record(z.record(z.number())),
  pricingTiers: z.record(z.record(z.record(PricingTierEntrySchema))),
});

export type PricingConfig = z.infer<typeof PricingConfigSchema>;
