import { calculateCombinedFees, type PricingData, type CombinedFeeResult } from "@shared/pricing";

export type ServiceTier = "Automated" | "Guided" | "Concierge" | string | undefined;

export interface ServiceFlags {
  bookkeeping: boolean;
  taas: boolean;
  payroll: boolean;
  ap: boolean;
  ar: boolean;
  agentOfService: boolean;
  cfoAdvisory: boolean;
  qbo: boolean;
  fpaBuild: boolean;
  cleanup: boolean;
  priorYearFilings: boolean;
}

export interface ServiceFees {
  bookkeepingMonthly: number;
  bookkeepingSetup: number;
  taasMonthly: number;
  // Note: TaaS has no setup fee - it's monthly only
  // taasSetup is always $0, removed from interface
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
  combinedOneTimeFees: number; // Renamed from combinedSetup for clarity
}

export interface ServiceConfig {
  includes: ServiceFlags;
  fees: ServiceFees;
  tier: ServiceTier;
}

// Normalize a quote (DB row) into PricingData consumed by @shared/pricing
export function toPricingDataFromQuote(input: Record<string, unknown>): PricingData {
  const num = (v: unknown): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = Number(v as number | string);
    return Number.isFinite(n) ? n : undefined;
  };

  const ri = input as Record<string, unknown>;
  const str = (k: string): string | undefined =>
    typeof ri[k] === "string" ? (ri[k] as string) : undefined;

  return {
    monthlyRevenueRange: input?.monthlyRevenueRange || input?.revenueBand || undefined,
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
    numBusinessOwners: num(input?.numBusinessOwners ?? input?.customNumBusinessOwners),
    customNumBusinessOwners: num(input?.customNumBusinessOwners) ?? null,
    include1040s: input?.include1040s ?? undefined,
    priorYearsUnfiled: num(input?.priorYearsUnfiled),
    // subscriptions
    qboSubscription: input?.qboSubscription ?? null,
    // misc
    entityType: str("entityType"),
    bookkeepingQuality: str("bookkeepingQuality"),
    // Monthly service toggles used by pricing engine (use legacy and new names)
    // Note: pricing engine checks these as any, but keeping here for clarity
    // serviceMonthlyBookkeeping, serviceTaasMonthly, serviceApArService, serviceArService, servicePayrollService, serviceAgentOfService, serviceCfoAdvisory
    // These pass through via the "any" widening in calculateCombinedFees
  } as PricingData;
}

type PricingInputExtended = PricingData & {
  serviceMonthlyBookkeeping?: boolean;
  serviceTaasMonthly?: boolean;
  servicePayrollService?: boolean;
  serviceApArService?: boolean;
  serviceArService?: boolean;
  serviceAgentOfService?: boolean;
  serviceCfoAdvisory?: boolean;
};

export function buildServiceConfig(quote: Record<string, unknown>): ServiceConfig {
  const base = toPricingDataFromQuote(quote);
  const ext: PricingInputExtended = { ...base };
  const rq = quote as Record<string, unknown>;
  const flag = (k: string) => Boolean(rq[k]);
  // Also pass through service toggles for backward-compat with the pricing engine
  ext.serviceMonthlyBookkeeping =
    flag("serviceMonthlyBookkeeping") || flag("serviceBookkeeping") || flag("includesBookkeeping");
  ext.serviceTaasMonthly =
    flag("serviceTaasMonthly") || flag("serviceTaas") || flag("includesTaas");
  ext.servicePayrollService = flag("servicePayrollService") || flag("servicePayroll");
  ext.serviceApArService =
    flag("serviceApArService") || flag("serviceApLite") || flag("serviceApAdvanced");
  ext.serviceArService =
    flag("serviceArService") || flag("serviceArLite") || flag("serviceArAdvanced");
  ext.serviceAgentOfService = flag("serviceAgentOfService");
  ext.serviceCfoAdvisory = flag("serviceCfoAdvisory");

  const calc: CombinedFeeResult = calculateCombinedFees(ext);

  // Derive includes
  const includes: ServiceFlags = {
    bookkeeping:
      calc.includesBookkeeping || calc.bookkeeping.monthlyFee > 0 || calc.bookkeeping.setupFee > 0,
    taas: calc.includesTaas || calc.taas.monthlyFee > 0 || (calc.priorYearFilingsFee ?? 0) > 0,
    payroll: (calc.payrollFee ?? 0) > 0 || Boolean(ext.servicePayrollService),
    ap: (calc.apFee ?? 0) > 0 || Boolean(ext.serviceApArService),
    ar: (calc.arFee ?? 0) > 0 || Boolean(ext.serviceArService),
    agentOfService: (calc.agentOfServiceFee ?? 0) > 0 || Boolean(ext.serviceAgentOfService),
    cfoAdvisory: (calc.cfoAdvisoryFee ?? 0) > 0 || Boolean(ext.serviceCfoAdvisory),
    qbo:
      (calc.qboFee ?? 0) > 0 ||
      Boolean((base as unknown as { qboSubscription?: boolean | null }).qboSubscription),
    fpaBuild: flag("serviceFpaBuild"),
    cleanup: (calc.cleanupProjectFee ?? 0) > 0,
    priorYearFilings: (calc.priorYearFilingsFee ?? 0) > 0,
  };

  const fees: ServiceFees = {
    bookkeepingMonthly: calc.bookkeeping.monthlyFee,
    bookkeepingSetup: calc.bookkeeping.setupFee,
    taasMonthly: calc.taas.monthlyFee,
    // TaaS has no setup fee - removed taasSetup (always $0)
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
    combinedOneTimeFees: calc.combined.setupFee, // Renamed for clarity
  };

  return {
    includes,
    fees,
    tier: base.serviceTier as ServiceTier,
  };
}
