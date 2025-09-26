import { z } from "zod";
import { DealsResultSchema } from "../deals";

// Re-export existing shared contracts
export { DealSchema, DealsResultSchema } from "../deals";
export type { Deal } from "../deals";
export type DealsResult = z.infer<typeof DealsResultSchema>;

export { PricingConfigSchema } from "../pricing-config";
export type { PricingConfig } from "../pricing-config";

// Commission Summary for current period (SeedPay)
export const CommissionSummarySchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  total_commissions: z.number(),
  setup_commissions: z.number(),
  monthly_commissions: z.number(),
  invoice_count: z.number(),
  subscription_count: z.number(),
  last_processed: z.string(),
  data_source: z.string(),
});
export type CommissionSummary = z.infer<typeof CommissionSummarySchema>;

// Calculator Manager content (SeedQC)
export const CalculatorServiceContentItemSchema = z.object({
  id: z.number().optional(),
  service: z.string(),
  sowTitle: z.string().nullable().optional(),
  sowTemplate: z.string().nullable().optional(),
  agreementLink: z.string().nullable().optional(),
  includedFieldsJson: z.string().nullable().optional(),
  updatedBy: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type CalculatorServiceContentItem = z.infer<
  typeof CalculatorServiceContentItemSchema
>;

export const CalculatorContentResponseSchema = z.object({
  items: z.array(CalculatorServiceContentItemSchema),
  msaLink: z.string().optional(),
});
export type CalculatorContentResponse = z.infer<
  typeof CalculatorContentResponseSchema
>;

export const CalculatorContentItemResponseSchema = z.object({
  item: CalculatorServiceContentItemSchema,
  msaLink: z.string().optional(),
});
export type CalculatorContentItemResponse = z.infer<
  typeof CalculatorContentItemResponseSchema
>;

// Standard error envelope for consistency on failure paths
export const ErrorEnvelopeSchema = z.object({
  status: z.literal("error"),
  message: z.string(),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
