// Shared pricing calculation logic
// This ensures consistency between frontend and backend calculations

export interface PricingData {
  monthlyRevenueRange?: string;
  monthlyTransactions?: string;
  industry?: string;
  cleanupMonths?: number;
  cleanupComplexity?: string;
  cleanupOverride?: boolean;
  overrideReason?: string | null;
  customSetupFee?: string;
  // TaaS specific fields
  includesTaas?: boolean;
  numEntities?: number;
  customNumEntities?: number | null;
  statesFiled?: number;
  customStatesFiled?: number | null;
  internationalFiling?: boolean;
  numBusinessOwners?: number;
  customNumBusinessOwners?: number | null;
  include1040s?: boolean;
  priorYearsUnfiled?: number;
  alreadyOnSeedBookkeeping?: boolean;
  qboSubscription?: boolean | null;
  entityType?: string;
  bookkeepingQuality?: string;
}

export interface FeeResult {
  monthlyFee: number;
  setupFee: number;
}

export interface CombinedFeeResult {
  bookkeeping: FeeResult;
  taas: FeeResult;
  combined: FeeResult;
  includesBookkeeping: boolean;
  includesTaas: boolean;
}

// Constants
export const PRICING_CONSTANTS = {
  baseMonthlyFee: 150,
  revenueMultipliers: {
    '<$10K': 1.0,
    '10K-25K': 1.0,
    '25K-75K': 2.2,
    '75K-250K': 3.5,
    '250K-1M': 5.0,
    '1M+': 7.0
  },
  txSurcharge: {
    '<100': 0,
    '100-300': 100,
    '300-600': 500,
    '600-1000': 800,
    '1000-2000': 1200,
    '2000+': 1600
  },
  industryMultipliers: {
    'Software/SaaS': { monthly: 1.0, cleanup: 1.0 },
    'Professional Services': { monthly: 1.0, cleanup: 1.1 },
    'Consulting': { monthly: 1.0, cleanup: 1.05 },
    'Healthcare/Medical': { monthly: 1.4, cleanup: 1.3 },
    'Real Estate': { monthly: 1.25, cleanup: 1.05 },
    'Property Management': { monthly: 1.3, cleanup: 1.2 },
    'E-commerce/Retail': { monthly: 1.35, cleanup: 1.15 },
    'Restaurant/Food Service': { monthly: 1.6, cleanup: 1.4 },
    'Hospitality': { monthly: 1.6, cleanup: 1.4 },
    'Construction/Trades': { monthly: 1.5, cleanup: 1.08 },
    'Manufacturing': { monthly: 1.45, cleanup: 1.25 },
    'Transportation/Logistics': { monthly: 1.4, cleanup: 1.2 },
    'Nonprofit': { monthly: 1.2, cleanup: 1.15 },
    'Law Firm': { monthly: 1.3, cleanup: 1.35 },
    'Accounting/Finance': { monthly: 1.1, cleanup: 1.1 },
    'Marketing/Advertising': { monthly: 1.15, cleanup: 1.1 },
    'Insurance': { monthly: 1.35, cleanup: 1.25 },
    'Automotive': { monthly: 1.4, cleanup: 1.2 },
    'Education': { monthly: 1.25, cleanup: 1.2 },
    'Fitness/Wellness': { monthly: 1.3, cleanup: 1.15 },
    'Entertainment/Events': { monthly: 1.5, cleanup: 1.3 },
    'Agriculture': { monthly: 1.45, cleanup: 1.2 },
    'Technology/IT Services': { monthly: 1.1, cleanup: 1.05 },
    'Multi-entity/Holding Companies': { monthly: 1.35, cleanup: 1.25 },
    'Other': { monthly: 1.2, cleanup: 1.15 }
  }
} as const;

export function roundToNearest25(num: number): number {
  return Math.ceil(num / 25) * 25;
}

export function calculateBookkeepingFees(data: PricingData): FeeResult {
  if (!data.monthlyRevenueRange || !data.monthlyTransactions || !data.industry || data.cleanupMonths === undefined) {
    return { monthlyFee: 0, setupFee: 0 };
  }
  
  // If initial cleanup months is 0, initial cleanup complexity is not required
  if (data.cleanupMonths > 0 && !data.cleanupComplexity) {
    return { monthlyFee: 0, setupFee: 0 };
  }

  const revenueMultiplier = PRICING_CONSTANTS.revenueMultipliers[data.monthlyRevenueRange as keyof typeof PRICING_CONSTANTS.revenueMultipliers] || 1.0;
  const txFee = PRICING_CONSTANTS.txSurcharge[data.monthlyTransactions as keyof typeof PRICING_CONSTANTS.txSurcharge] || 0;
  const industryData = PRICING_CONSTANTS.industryMultipliers[data.industry as keyof typeof PRICING_CONSTANTS.industryMultipliers] || { monthly: 1, cleanup: 1 };
  
  // Dynamic calculation: base fee * revenue multiplier + transaction surcharge, then apply industry multiplier
  let monthlyFee = Math.round((PRICING_CONSTANTS.baseMonthlyFee * revenueMultiplier + txFee) * industryData.monthly);
  
  // Add QBO Subscription fee if selected
  if (data.qboSubscription) {
    monthlyFee += 60;
  }
  
  // Add service tier upgrade fees
  if ((data as any).serviceTier === "Guided") {
    monthlyFee += 79;
  } else if ((data as any).serviceTier === "Concierge") {
    monthlyFee += 249;
  }
  
  // Use the actual cleanup months value (override just allows values below normal minimum)
  const effectiveCleanupMonths = data.cleanupMonths;
  
  // Calculate setup fee with custom override logic
  let setupFee = 0;
  
  // Check for custom setup fee override first (always takes precedence)
  const customSetupFee = (data as any).customSetupFee;
  if (data.cleanupOverride && (data as any).overrideReason === "Other" && customSetupFee && parseFloat(customSetupFee) > 0) {
    setupFee = parseFloat(customSetupFee);
  } else if (effectiveCleanupMonths > 0) {
    // Standard cleanup calculation only if no custom override
    const cleanupMultiplier = parseFloat(data.cleanupComplexity || "0.75") * industryData.cleanup;
    setupFee = roundToNearest25(Math.max(monthlyFee, monthlyFee * cleanupMultiplier * effectiveCleanupMonths));
  }
  // If cleanup months is 0 and no custom override, setup fee remains 0
  
  return { monthlyFee, setupFee };
}

export function calculateTaaSFees(data: PricingData): FeeResult {
  if (!data.includesTaas || !data.monthlyRevenueRange || !data.industry || !data.entityType || 
      !data.numEntities || !data.statesFiled || data.internationalFiling === undefined || 
      !data.numBusinessOwners || !data.bookkeepingQuality || data.include1040s === undefined || 
      data.priorYearsUnfiled === undefined || data.alreadyOnSeedBookkeeping === undefined) {
    return { monthlyFee: 0, setupFee: 0 };
  }

  const base = 150;

  // Get effective numbers (use custom values if "more" is selected)
  const effectiveNumEntities = data.customNumEntities || data.numEntities;
  const effectiveStatesFiled = data.customStatesFiled || data.statesFiled;
  const effectiveNumBusinessOwners = data.customNumBusinessOwners || data.numBusinessOwners;

  // Entity upcharge: Every entity above 5 adds $75/mo
  let entityUpcharge = 0;
  if (effectiveNumEntities > 5) {
    entityUpcharge = (effectiveNumEntities - 5) * 75;
  }
  
  // State upcharge: $50 per state above 1, up to 50 states
  let stateUpcharge = 0;
  if (effectiveStatesFiled > 1) {
    const additionalStates = Math.min(effectiveStatesFiled - 1, 49); // Cap at 49 additional states (50 total)
    stateUpcharge = additionalStates * 50;
  }
  
  // International filing upcharge
  const intlUpcharge = data.internationalFiling ? 200 : 0;
  
  // Owner upcharge: Every owner above 5 is $25/mo per owner
  let ownerUpcharge = 0;
  if (effectiveNumBusinessOwners > 5) {
    ownerUpcharge = (effectiveNumBusinessOwners - 5) * 25;
  }
  
  // Bookkeeping quality upcharge
  const bookUpcharge = data.bookkeepingQuality === 'Clean (Seed)' ? 0 : 
                       data.bookkeepingQuality === 'Clean / New' ? 0 : 25;
  
  // Personal 1040s
  const personal1040 = data.include1040s ? effectiveNumBusinessOwners * 25 : 0;

  // Industry multiplier (simplified mapping from TaaS logic to our existing industries)
  const taasIndustryMult: Record<string, number> = {
    'Software/SaaS': 1.0,
    'Professional Services': 1.1,
    'Consulting': 1.1,
    'Real Estate': 1.2,
    'E-commerce/Retail': 1.3,
    'Construction/Trades': 1.4,
    'Multi-entity/Holding Companies': 1.5,
  };
  
  const industryMult = taasIndustryMult[data.industry] || 1.0;

  // Revenue multiplier (map our revenue bands to average monthly revenue)
  const avgMonthlyRevenue = data.monthlyRevenueRange === '<$10K' ? 5000 :
                           data.monthlyRevenueRange === '10K-25K' ? 17500 :
                           data.monthlyRevenueRange === '25K-75K' ? 50000 :
                           data.monthlyRevenueRange === '75K-250K' ? 162500 :
                           data.monthlyRevenueRange === '250K-1M' ? 625000 :
                           data.monthlyRevenueRange === '1M+' ? 1000000 : 5000;

  const revenueMult = avgMonthlyRevenue <= 10000 ? 1.0 :
                     avgMonthlyRevenue <= 25000 ? 1.2 :
                     avgMonthlyRevenue <= 75000 ? 1.4 :
                     avgMonthlyRevenue <= 250000 ? 1.6 :
                     avgMonthlyRevenue <= 1000000 ? 1.8 : 2.0;

  // Calculate raw fee
  const rawFee = (base + entityUpcharge + stateUpcharge + intlUpcharge + ownerUpcharge + bookUpcharge + personal1040) * industryMult * revenueMult;

  // No discount applied here - will be handled in calculateCombinedFees for bundle scenarios
  const monthlyFee = roundToNearest25(rawFee);

  // Setup fee: prior years unfiled * $2100 per year
  const setupFee = (data.priorYearsUnfiled || 0) * 2100;

  return { monthlyFee, setupFee };
}

export function calculateCombinedFees(data: PricingData): CombinedFeeResult {
  // Determine which services are included
  const includesBookkeeping = data.includesTaas !== undefined ? 
    // For combined quotes, check both flags
    (data.includesTaas ? (data as any).includesBookkeeping !== false : true) :
    // For single service quotes, assume bookkeeping if not explicitly TaaS
    true;
  
  const includesTaas = data.includesTaas === true;

  // Calculate individual service fees
  let bookkeepingFees = includesBookkeeping ? calculateBookkeepingFees(data) : { monthlyFee: 0, setupFee: 0 };
  const taasFees = includesTaas ? calculateTaaSFees(data) : { monthlyFee: 0, setupFee: 0 };

  // Apply Seed Bookkeeping Package discount (50% off bookkeeping when both services are selected)
  if (includesBookkeeping && includesTaas && data.alreadyOnSeedBookkeeping) {
    bookkeepingFees = {
      monthlyFee: roundToNearest25(bookkeepingFees.monthlyFee * 0.50),
      setupFee: bookkeepingFees.setupFee // Setup fee is not discounted
    };
  }

  // Combined totals
  const combinedMonthlyFee = bookkeepingFees.monthlyFee + taasFees.monthlyFee;
  const combinedSetupFee = bookkeepingFees.setupFee + taasFees.setupFee;

  return {
    bookkeeping: bookkeepingFees,
    taas: taasFees,
    combined: {
      monthlyFee: combinedMonthlyFee,
      setupFee: combinedSetupFee
    },
    includesBookkeeping,
    includesTaas
  };
}