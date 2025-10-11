/**
 * Quote Loader Service
 *
 * Handles loading quotes into form state.
 * Extracted from QuoteCalculator.tsx for DRY and testability.
 *
 * Responsibilities:
 * - Map quote data to form format
 * - Handle numeric field conversions
 * - Set default values for missing fields
 * - Determine initial form view based on services
 */

import type { Quote } from "@shared/schema";
import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import { mapQuoteToFormServices, getAllServices } from "@shared/services";
import { currentMonth } from "@/features/quote-calculator/schema";

/**
 * Determine which form view to show based on selected services
 *
 * Priority:
 * 1. Bookkeeping services → "bookkeeping"
 * 2. TaaS services → "taas"
 * 3. Other services only → "bookkeeping" (default)
 *
 * DRY: Single source of truth for view selection logic
 */
export function determineFormView(quote: Quote): "bookkeeping" | "taas" | "placeholder" {
  const selectedServices = mapQuoteToFormServices(quote);
  const allServices = getAllServices();

  const hasBookkeepingServices =
    selectedServices.serviceMonthlyBookkeeping || selectedServices.serviceCleanupProjects;

  const hasTaasServices =
    selectedServices.serviceTaasMonthly || selectedServices.servicePriorYearFilings;

  const bookkeepingTaasKeys = [
    "serviceMonthlyBookkeeping",
    "serviceCleanupProjects",
    "serviceTaasMonthly",
    "servicePriorYearFilings",
  ];

  const otherServiceKeys = allServices
    .filter((s) => !bookkeepingTaasKeys.includes(s.key))
    .map((s) => s.key);

  const hasOtherServices = otherServiceKeys.some(
    (key) => selectedServices[key as keyof typeof selectedServices]
  );

  // Priority logic
  if (hasBookkeepingServices || (!hasTaasServices && !hasOtherServices)) {
    return "bookkeeping";
  } else if (hasTaasServices) {
    return "taas";
  } else {
    return "bookkeeping"; // Default fallback
  }
}

/**
 * Map quote data to form fields format
 *
 * Handles:
 * - Numeric conversions
 * - Default values
 * - Service mapping
 * - Type coercion
 *
 * DRY: Single mapping function used everywhere
 */
export function mapQuoteToFormFields(quote: Quote): Partial<QuoteFormFields> {
  return {
    contactEmail: quote.contactEmail || quote.email || "",
    companyName: quote.companyName || quote.company_name || "",
    contactName: quote.contactName || quote.contact_name || "",
    monthlyRevenueRange: quote.monthlyRevenueRange || "",
    monthlyTransactions: quote.monthlyTransactions || "",
    industry: quote.industry || "",
    entityType: quote.entityType || "",
    cleanupMonths: quote.cleanupMonths ? Number(quote.cleanupMonths) : currentMonth,
    cleanupComplexity: quote.cleanupComplexity || "",
    serviceTier: quote.serviceTier || "",
    overrideCleanupFee: quote.overrideCleanupFee ?? false,
    overrideSetupFee: quote.overrideSetupFee ?? false,
    overrideMonthlyFee: quote.overrideMonthlyFee ?? false,
    overrideReason: quote.overrideReason || "",
    customOverrideReason: quote.customOverrideReason || "",
    customSetupFee: quote.customSetupFee ? quote.customSetupFee.toString() : "",
    customMonthlyFee: quote.customMonthlyFee ? quote.customMonthlyFee.toString() : "",
    customCleanupFee: quote.customCleanupFee ? quote.customCleanupFee.toString() : "",
    priorYearsUnfiledTaas: quote.priorYearsUnfiledTaas ? Number(quote.priorYearsUnfiledTaas) : 0,
    quoteType: quote.quoteType || "bookkeeping",
    includesBookkeeping: quote.includesBookkeeping ?? true,
    includesTaas: quote.includesTaas ?? false,
    ...mapQuoteToFormServices(quote),
    cfoAdvisoryType: quote.cfoAdvisoryType || "",
    cfoAdvisoryBundleHours: quote.cfoAdvisoryBundleHours || 8,
    payrollEmployeeCount: quote.payrollEmployeeCount || 1,
    payrollStateCount: quote.payrollStateCount || 1,
    apVendorBillsBand: quote.apVendorBillsBand || "",
    apVendorCount: quote.apVendorCount || 5,
    customApVendorCount: quote.customApVendorCount || null,
    apServiceTier: quote.apServiceTier || "lite",
    arCustomerInvoicesBand: quote.arCustomerInvoicesBand || "",
    arCustomerCount: quote.arCustomerCount || 6,
    customArCustomerCount: quote.customArCustomerCount || null,
    arServiceTier: quote.arServiceTier || "advanced",
    agentOfServiceAdditionalStates: quote.agentOfServiceAdditionalStates || 0,
    agentOfServiceComplexCase: quote.agentOfServiceComplexCase ?? false,
    numEntities: quote.numEntities ? Number(quote.numEntities) : 1,
    statesFiled: quote.statesFiled ? Number(quote.statesFiled) : 1,
    internationalFiling: quote.internationalFiling ?? false,
    numBusinessOwners: quote.numBusinessOwners ? Number(quote.numBusinessOwners) : 1,
    bookkeepingQuality: quote.bookkeepingQuality || "Clean (Seed)",
    include1040s: quote.include1040s ?? false,
    priorYearsUnfiled: quote.priorYearsUnfiled ? Number(quote.priorYearsUnfiled) : 0,
    priorYearFilings: quote.priorYearFilings || [],
    qboSubscription: quote.qboSubscription ?? false,
    cleanupPeriods: quote.cleanupPeriods || [],
  } as Partial<QuoteFormFields>;
}

/**
 * Get critical numeric fields that need explicit type coercion
 *
 * These fields are set twice in the original code (once in reset, once in setTimeout)
 * to ensure React Hook Form properly recognizes them as numbers.
 *
 * DRY: Single list of fields needing special handling
 */
export function getCriticalNumericFields(quote: Quote): Partial<QuoteFormFields> {
  return {
    entityType: quote.entityType || undefined,
    numEntities:
      quote.numEntities !== undefined && quote.numEntities !== null
        ? Number(quote.numEntities)
        : undefined,
    statesFiled:
      quote.statesFiled !== undefined && quote.statesFiled !== null
        ? Number(quote.statesFiled)
        : undefined,
    numBusinessOwners:
      quote.numBusinessOwners !== undefined && quote.numBusinessOwners !== null
        ? Number(quote.numBusinessOwners)
        : undefined,
    priorYearsUnfiled:
      quote.priorYearsUnfiled !== undefined && quote.priorYearsUnfiled !== null
        ? Number(quote.priorYearsUnfiled)
        : undefined,
    bookkeepingQuality: quote.bookkeepingQuality || undefined,
  };
}
