import {
  calculateCombinedFees,
  type PricingData,
  type CombinedFeeResult,
} from "@shared/pricing";

export type ServiceTier =
  | "Automated"
  | "Guided"
  | "Concierge"
  | string
  | undefined;

export interface ServiceFlags {
  bookkeeping: boolean;
  taas: boolean;
  payroll: boolean;
  ap: boolean;
  ar: boolean;
  agentOfService: boolean;
  cfoAdvisory: boolean;
  qbo: boolean;
}

export interface ServiceFees {
  bookkeepingMonthly: number;
  bookkeepingSetup: number;
  taasMonthly: number;
  payroll: number;
  ap: number;
  ar: number;
  agentOfService: number;
  cfoAdvisory: number;
  cleanupProject: number;
  priorYearFilings: number;
  serviceTier: number;
  qbo: number;
  combinedMonthly: number;
  combinedSetup: number;
}

export interface ServiceConfig {
  includes: ServiceFlags;
  fees: ServiceFees;
  tier: ServiceTier;
}

// Normalize a quote (DB row) into PricingData consumed by @shared/pricing
export function toPricingDataFromQuote(input: any): PricingData {
  const num = (v: any): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    monthlyRevenueRange:
      input?.monthlyRevenueRange || input?.revenueBand || undefined,
    monthlyTransactions: input?.monthlyTransactions || undefined,
    industry: input?.industry || undefined,
    cleanupMonths: num(input?.cleanupMonths),
    cleanupComplexity: input?.cleanupComplexity || undefined,
    cleanupOverride: input?.cleanupOverride ?? undefined,
    overrideReason: input?.overrideReason ?? undefined,
    customSetupFee: input?.customSetupFee || undefined,
    // service tier + toggles
    serviceTier: input?.serviceTier || undefined,
    includesTaas: input?.includesTaas ?? undefined,
    numEntities: num(input?.numEntities ?? input?.customNumEntities),
    customNumEntities: num(input?.customNumEntities) ?? null,
    statesFiled: num(input?.statesFiled ?? input?.customStatesFiled),
    customStatesFiled: num(input?.customStatesFiled) ?? null,
    internationalFiling: input?.internationalFiling ?? undefined,
    numBusinessOwners: num(
      input?.numBusinessOwners ?? input?.customNumBusinessOwners,
    ),
    customNumBusinessOwners: num(input?.customNumBusinessOwners) ?? null,
    include1040s: input?.include1040s ?? undefined,
    priorYearsUnfiled: num(input?.priorYearsUnfiled),
    // subscriptions
    qboSubscription: input?.qboSubscription ?? null,
    // misc
    entityType: input?.entityType || undefined,
    bookkeepingQuality: input?.bookkeepingQuality || undefined,
    // Monthly service toggles used by pricing engine (use legacy and new names)
    // Note: pricing engine checks these as any, but keeping here for clarity
    // serviceMonthlyBookkeeping, serviceTaasMonthly, serviceApArService, serviceArService, servicePayrollService, serviceAgentOfService, serviceCfoAdvisory
    // These pass through via the "any" widening in calculateCombinedFees
  } as PricingData & Record<string, any>;
}

export function buildServiceConfig(quote: any): ServiceConfig {
  const pricingInput = toPricingDataFromQuote(quote);
  // Also pass through service toggles for backward-compat with the pricing engine
  (pricingInput as any).serviceMonthlyBookkeeping = Boolean(
    quote?.serviceMonthlyBookkeeping ||
      quote?.serviceBookkeeping ||
      quote?.includesBookkeeping,
  );
  (pricingInput as any).serviceTaasMonthly = Boolean(
    quote?.serviceTaasMonthly || quote?.serviceTaas || quote?.includesTaas,
  );
  (pricingInput as any).servicePayrollService = Boolean(
    quote?.servicePayrollService || quote?.servicePayroll,
  );
  (pricingInput as any).serviceApArService = Boolean(
    quote?.serviceApArService ||
      quote?.serviceApLite ||
      quote?.serviceApAdvanced,
  );
  (pricingInput as any).serviceArService = Boolean(
    quote?.serviceArService || quote?.serviceArLite || quote?.serviceArAdvanced,
  );
  (pricingInput as any).serviceAgentOfService = Boolean(
    quote?.serviceAgentOfService,
  );
  (pricingInput as any).serviceCfoAdvisory = Boolean(quote?.serviceCfoAdvisory);

  const calc: CombinedFeeResult = calculateCombinedFees(pricingInput);

  // Derive includes
  const includes: ServiceFlags = {
    bookkeeping:
      calc.includesBookkeeping ||
      calc.bookkeeping.monthlyFee > 0 ||
      calc.bookkeeping.setupFee > 0,
    taas:
      calc.includesTaas ||
      calc.taas.monthlyFee > 0 ||
      (calc.priorYearFilingsFee ?? 0) > 0,
    payroll:
      (calc.payrollFee ?? 0) > 0 ||
      Boolean((pricingInput as any).servicePayrollService),
    ap:
      (calc.apFee ?? 0) > 0 ||
      Boolean((pricingInput as any).serviceApArService),
    ar:
      (calc.arFee ?? 0) > 0 || Boolean((pricingInput as any).serviceArService),
    agentOfService:
      (calc.agentOfServiceFee ?? 0) > 0 ||
      Boolean((pricingInput as any).serviceAgentOfService),
    cfoAdvisory:
      (calc.cfoAdvisoryFee ?? 0) > 0 ||
      Boolean((pricingInput as any).serviceCfoAdvisory),
    qbo:
      (calc.qboFee ?? 0) > 0 || Boolean((pricingInput as any).qboSubscription),
  };

  const fees: ServiceFees = {
    bookkeepingMonthly: calc.bookkeeping.monthlyFee,
    bookkeepingSetup: calc.bookkeeping.setupFee,
    taasMonthly: calc.taas.monthlyFee,
    payroll: calc.payrollFee ?? 0,
    ap: calc.apFee ?? 0,
    ar: calc.arFee ?? 0,
    agentOfService: calc.agentOfServiceFee ?? 0,
    cfoAdvisory: calc.cfoAdvisoryFee ?? 0,
    cleanupProject: calc.cleanupProjectFee ?? 0,
    priorYearFilings: calc.priorYearFilingsFee ?? 0,
    serviceTier: calc.serviceTierFee ?? 0,
    qbo: calc.qboFee ?? 0,
    combinedMonthly: calc.combined.monthlyFee,
    combinedSetup: calc.combined.setupFee,
  };

  return {
    includes,
    fees,
    tier: (pricingInput as any).serviceTier,
  };
}
