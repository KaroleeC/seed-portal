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
  // Service tier
  serviceTier?: string;
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
  breakdown?: any; // Optional breakdown for UI display
}

export interface CombinedFeeResult {
  bookkeeping: FeeResult;
  taas: FeeResult;
  combined: FeeResult;
  includesBookkeeping: boolean;
  includesTaas: boolean;
  includesAP: boolean;
  includesAR: boolean;
  includesAgentOfService: boolean;
  serviceTierFee: number;
  cleanupProjectFee: number;
  priorYearFilingsFee: number;
  cfoAdvisoryFee: number;
  cfoAdvisoryHubspotProductId: string | null;
  payrollFee: number;
  payrollBreakdown?: any;
  apFee: number;
  apBreakdown?: any;
  arFee: number;
  arBreakdown?: any;
  agentOfServiceFee: number;
  agentOfServiceBreakdown?: any;
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
  if (!data.monthlyRevenueRange || !data.monthlyTransactions || !data.industry) {
    return { monthlyFee: 0, setupFee: 0 };
  }

  const revenueMultiplier = PRICING_CONSTANTS.revenueMultipliers[data.monthlyRevenueRange as keyof typeof PRICING_CONSTANTS.revenueMultipliers] || 1.0;
  const txFee = PRICING_CONSTANTS.txSurcharge[data.monthlyTransactions as keyof typeof PRICING_CONSTANTS.txSurcharge] || 0;
  const industryData = PRICING_CONSTANTS.industryMultipliers[data.industry as keyof typeof PRICING_CONSTANTS.industryMultipliers] || { monthly: 1, cleanup: 1 };
  
  // Intermediate calculations for breakdown
  const baseMonthlyFee = PRICING_CONSTANTS.baseMonthlyFee;
  const afterRevenue = Math.round(baseMonthlyFee * revenueMultiplier);
  const afterTransactions = afterRevenue + txFee;
  const cleanupBeforeIndustry = Math.round(afterTransactions * industryData.monthly);
  
  // Dynamic calculation: base fee * revenue multiplier + transaction surcharge, then apply industry multiplier
  const monthlyFeeBeforeQBO = cleanupBeforeIndustry;
  
  // Add QBO Subscription fee if selected
  let monthlyFee = monthlyFeeBeforeQBO;
  if (data.qboSubscription) {
    monthlyFee += 60;
  }
  
  // Calculate setup fee using new formula: monthly fee before discount * current month * 0.25
  const currentMonth = new Date().getMonth() + 1; // Get current month (1-12)
  const setupFee = Math.round(monthlyFeeBeforeQBO * currentMonth * 0.25);
  
  // Create breakdown object for UI display
  const breakdown = {
    baseMonthlyFee,
    revenueMultiplier,
    afterRevenue,
    txFee,
    afterTransactions,
    industryMultiplier: industryData.monthly,
    cleanupBeforeIndustry,
    monthlyFeeBeforeQBO,
    qboFee: data.qboSubscription ? 60 : 0,
    currentMonth,
    setupFeeBeforeDiscount: setupFee
  };
  
  return { monthlyFee, setupFee, breakdown };
}

export function calculateTaaSFees(data: PricingData): FeeResult {
  // Check for TaaS service enablement (legacy or new fields)
  const hasTaasService = Boolean(
    data.includesTaas || 
    (data as any).serviceTaas || 
    (data as any).serviceTaasMonthly || 
    (data as any).servicePriorYearFilings
  );
  
  // Require core fields for calculation
  if (!hasTaasService || !data.monthlyRevenueRange || !data.industry || 
      !data.numEntities || !data.statesFiled || data.internationalFiling === undefined || 
      !data.numBusinessOwners || data.include1040s === undefined) {
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

  // Use the same comprehensive industry multipliers as bookkeeping (monthly values)
  const industryData = PRICING_CONSTANTS.industryMultipliers[data.industry as keyof typeof PRICING_CONSTANTS.industryMultipliers] || { monthly: 1.0, cleanup: 1.0 };
  const industryMult = industryData.monthly;

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

  // Intermediate calculations for breakdown
  const beforeMultipliers = base + entityUpcharge + stateUpcharge + intlUpcharge + ownerUpcharge + bookUpcharge + personal1040;
  const afterIndustryMult = beforeMultipliers * industryMult;
  const rawFee = afterIndustryMult * revenueMult;

  // No discount applied here - will be handled in calculateCombinedFees for bundle scenarios
  const monthlyFee = roundToNearest25(rawFee);

  // Setup fee: prior years unfiled * $2100 per year
  const setupFee = (data.priorYearsUnfiled || 0) * 2100;

  // Create breakdown object for UI display
  const breakdown = {
    base,
    entityUpcharge,
    stateUpcharge,
    intlUpcharge,
    ownerUpcharge,
    bookUpcharge,
    personal1040,
    beforeMultipliers,
    industryMult,
    afterIndustryMult: Math.round(afterIndustryMult),
    revenueMult,
    afterMultipliers: Math.round(rawFee),
    monthlyFee
  };

  return { monthlyFee, setupFee, breakdown };
}

// Calculate Bookkeeping Cleanup Project fees ($100 per month selected)
export function calculateCleanupProjectFees(data: PricingData): { cleanupProjectFee: number } {
  const cleanupPeriods = (data as any).cleanupPeriods || [];
  const cleanupProjectFee = cleanupPeriods.length * 100; // $100 per month
  return { cleanupProjectFee };
}

// Calculate CFO Advisory fees
export function calculateCfoAdvisoryFees(data: PricingData): { cfoAdvisoryFee: number; hubspotProductId: string | null } {
  const cfoAdvisoryType = (data as any).cfoAdvisoryType;
  const bundleHours = (data as any).cfoAdvisoryBundleHours;
  
  if (cfoAdvisoryType === 'pay_as_you_go') {
    // Pay-as-you-Go: 8-hour deposit at $300/hr = $2,400
    return { 
      cfoAdvisoryFee: 2400, // 8 hours × $300/hr
      hubspotProductId: '28945017957'
    };
  } else if (cfoAdvisoryType === 'bundled' && bundleHours) {
    // Bundled prepaid hours at discounted rates
    const bundleOptions = {
      8: { rate: 295, total: 2360, hubspotId: '28928008785' },  // $295/hr
      16: { rate: 290, total: 4640, hubspotId: '28945017959' }, // $290/hr
      32: { rate: 285, total: 9120, hubspotId: '28960863883' }, // $285/hr
      40: { rate: 280, total: 11200, hubspotId: '28960863884' } // $280/hr
    };
    
    const bundle = bundleOptions[bundleHours as keyof typeof bundleOptions];
    if (bundle) {
      return {
        cfoAdvisoryFee: bundle.total,
        hubspotProductId: bundle.hubspotId
      };
    }
  }
  
  return { cfoAdvisoryFee: 0, hubspotProductId: null };
}

export function calculatePayrollFees(data: PricingData): { 
  payrollFee: number;
  breakdown?: {
    baseFee: number;
    employeeCount: number;
    stateCount: number;
    additionalEmployeeFee: number;
    additionalStateFee: number;
  }
} {
  const employeeCount = (data as any).payrollEmployeeCount || 1;
  const stateCount = (data as any).payrollStateCount || 1;
  
  const baseFee = 100; // Base fee: $100/mo for up to 3 employees in 1 state
  let payrollFee = baseFee;
  
  // Additional employee fees: $12/mo per employee above 3
  const additionalEmployeeFee = employeeCount > 3 ? (employeeCount - 3) * 12 : 0;
  payrollFee += additionalEmployeeFee;
  
  // Additional state fees: $25/mo per state above 1
  const additionalStateFee = stateCount > 1 ? (stateCount - 1) * 25 : 0;
  payrollFee += additionalStateFee;
  
  return { 
    payrollFee,
    breakdown: {
      baseFee,
      employeeCount,
      stateCount,
      additionalEmployeeFee,
      additionalStateFee
    }
  };
}

export function calculateAPFees(data: PricingData): { 
  apFee: number;
  breakdown?: {
    apServiceTier: string;
    apVendorBillsBand: string;
    apVendorCount: number;
    baseFee: number;
    vendorSurcharge: number;
    beforeMultiplier: number;
    billsLabel: string;
  }
} {
  const apServiceTier = (data as any).apServiceTier;
  const apVendorBillsBand = (data as any).apVendorBillsBand || '0-25';
  const apVendorCount = (data as any).customApVendorCount || (data as any).apVendorCount || 1;
  
  if (!apServiceTier) {
    return { apFee: 0 };
  }
  
  // AP Lite baseline pricing based on vendor bills volume
  let apLiteFee = 0;
  let billsLabel = '';
  switch (apVendorBillsBand) {
    case '0-25':
      apLiteFee = 150;
      billsLabel = '0-25 bills';
      break;
    case '26-100':
      apLiteFee = 300;
      billsLabel = '26-100 bills';
      break;
    case '101-250':
      apLiteFee = 600;
      billsLabel = '101-250 bills';
      break;
    case '251+':
      apLiteFee = 1000;
      billsLabel = '251+ bills';
      break;
    default:
      apLiteFee = 150;
      billsLabel = '0-25 bills';
      break;
  }
  
  // Add vendor/payee count surcharge (first 5 are free, then $12/month per payee above 5)
  const vendorCountSurcharge = apVendorCount > 5 ? (apVendorCount - 5) * 12 : 0;
  
  const beforeMultiplier = apLiteFee + vendorCountSurcharge;
  
  // Apply 2.5x multiplier for AP Advanced tier
  const totalApFee = apServiceTier === 'advanced' ? beforeMultiplier * 2.5 : beforeMultiplier;
  
  return { 
    apFee: totalApFee,
    breakdown: {
      apServiceTier,
      apVendorBillsBand,
      apVendorCount,
      baseFee: apLiteFee,
      vendorSurcharge: vendorCountSurcharge,
      beforeMultiplier,
      billsLabel
    }
  };
}

export function calculateARFees(data: PricingData): { 
  arFee: number;
  breakdown?: {
    arServiceTier: string;
    arCustomerInvoicesBand: string;
    arCustomerCount: number;
    baseFee: number;
    customerSurcharge: number;
    beforeMultiplier: number;
    invoicesLabel: string;
  }
} {
  const arServiceTier = (data as any).arServiceTier;
  const arCustomerInvoicesBand = (data as any).arCustomerInvoicesBand || '0-25';
  const arCustomerCount = (data as any).customArCustomerCount || (data as any).arCustomerCount || 1;
  
  if (!arServiceTier) {
    return { arFee: 0 };
  }
  
  // AR Lite baseline pricing based on customer invoices volume
  let arLiteFee = 0;
  let invoicesLabel = '';
  switch (arCustomerInvoicesBand) {
    case '0-25':
      arLiteFee = 150;
      invoicesLabel = '0-25 invoices';
      break;
    case '26-100':
      arLiteFee = 300;
      invoicesLabel = '26-100 invoices';
      break;
    case '101-250':
      arLiteFee = 600;
      invoicesLabel = '101-250 invoices';
      break;
    case '251+':
      arLiteFee = 1000;
      invoicesLabel = '251+ invoices';
      break;
    default:
      arLiteFee = 150;
      invoicesLabel = '0-25 invoices';
      break;
  }
  
  // Add customer count surcharge (first 5 are free, then $12/month per customer above 5)
  const customerCountSurcharge = arCustomerCount > 5 ? (arCustomerCount - 5) * 12 : 0;
  
  const beforeMultiplier = arLiteFee + customerCountSurcharge;
  
  // Apply 2.5x multiplier for AR Advanced tier
  const totalArFee = arServiceTier === 'advanced' ? beforeMultiplier * 2.5 : beforeMultiplier;
  
  return { 
    arFee: totalArFee,
    breakdown: {
      arServiceTier,
      arCustomerInvoicesBand,
      arCustomerCount,
      baseFee: arLiteFee,
      customerSurcharge: customerCountSurcharge,
      beforeMultiplier,
      invoicesLabel
    }
  };
}

export function calculateAgentOfServiceFees(data: PricingData): { 
  agentOfServiceFee: number;
  breakdown?: {
    baseFee: number;
    additionalStates: number;
    additionalStatesFee: number;
    complexCase: boolean;
    complexCaseFee: number;
    totalFee: number;
  }
} {
  const agentOfServiceAdditionalStates = (data as any).agentOfServiceAdditionalStates || 0;
  const agentOfServiceComplexCase = Boolean((data as any).agentOfServiceComplexCase);
  
  // Base fee is $150
  const baseFee = 150;
  
  // Additional states: $150 per additional state/entity
  const additionalStatesFee = agentOfServiceAdditionalStates * 150;
  
  // Complex case upgrade: +$300
  const complexCaseFee = agentOfServiceComplexCase ? 300 : 0;
  
  const totalFee = baseFee + additionalStatesFee + complexCaseFee;
  
  return { 
    agentOfServiceFee: totalFee,
    breakdown: {
      baseFee,
      additionalStates: agentOfServiceAdditionalStates,
      additionalStatesFee,
      complexCase: agentOfServiceComplexCase,
      complexCaseFee,
      totalFee
    }
  };
}

export function calculateCombinedFees(data: PricingData): CombinedFeeResult {
  // Determine which services are included - separate monthly vs project-only services
  const includesMonthlyBookkeeping = Boolean(
    // Legacy fields (existing database)
    (data as any).serviceBookkeeping || 
    (data as any).includesBookkeeping ||
    // New monthly bookkeeping field
    (data as any).serviceMonthlyBookkeeping
  );
  
  const includesBookkeepingCleanupOnly = Boolean(
    (data as any).serviceCleanupProjects && !includesMonthlyBookkeeping
  );
  
  const includesBookkeeping = includesMonthlyBookkeeping || includesBookkeepingCleanupOnly;
  
  const includesTaas = Boolean(
    // Legacy fields (existing database)
    (data as any).serviceTaas ||
    data.includesTaas === true ||
    // New separated service fields (future database) 
    (data as any).serviceTaasMonthly || 
    (data as any).servicePriorYearFilings
  );

  // Calculate individual service fees - only generate monthly fees if monthly service is selected
  let bookkeepingFees = includesMonthlyBookkeeping ? calculateBookkeepingFees(data) : { monthlyFee: 0, setupFee: 0 };
  const taasFees = includesTaas ? calculateTaaSFees(data) : { monthlyFee: 0, setupFee: 0 };

  // Apply Seed Bookkeeping Package discount (50% off bookkeeping when both monthly services are selected)
  if (includesMonthlyBookkeeping && includesTaas && data.alreadyOnSeedBookkeeping) {
    bookkeepingFees = {
      monthlyFee: roundToNearest25(bookkeepingFees.monthlyFee * 0.50),
      setupFee: bookkeepingFees.setupFee // Setup fee is not discounted
    };
  }

  // Calculate service tier fees
  let serviceTierFee = 0;
  if (data.serviceTier === 'Guided') {
    serviceTierFee = 79;
  } else if (data.serviceTier === 'Concierge') {
    serviceTierFee = 249;
  } else if (data.serviceTier === 'Automated' || !data.serviceTier) {
    serviceTierFee = 0; // Automated tier is free
  }

  // Calculate additional project fees
  const { cleanupProjectFee } = calculateCleanupProjectFees(data);
  
  // Calculate prior year filings fee ($1,500 per year)
  const priorYearFilings = (data as any).priorYearFilings || [];
  const priorYearFilingsFee = priorYearFilings.length * 1500;

  // Calculate CFO Advisory fees
  const includesCfoAdvisory = Boolean((data as any).serviceCfoAdvisory);
  const { cfoAdvisoryFee, hubspotProductId } = includesCfoAdvisory ? calculateCfoAdvisoryFees(data) : { cfoAdvisoryFee: 0, hubspotProductId: null };

  // Calculate Payroll fees
  const includesPayroll = Boolean((data as any).servicePayrollService);
  const payrollResult = includesPayroll ? calculatePayrollFees(data) : { payrollFee: 0, breakdown: undefined };
  const { payrollFee, breakdown: payrollBreakdown } = payrollResult;

  // Calculate AP fees
  const includesAP = Boolean((data as any).serviceApArService);
  const apResult = includesAP ? calculateAPFees(data) : { apFee: 0, breakdown: undefined };
  const { apFee, breakdown: apBreakdown } = apResult;

  // Calculate AR fees
  const includesAR = Boolean((data as any).serviceArService);
  const arResult = includesAR ? calculateARFees(data) : { arFee: 0, breakdown: undefined };
  const { arFee, breakdown: arBreakdown } = arResult;

  // Calculate Agent of Service fees  
  const includesAgentOfService = Boolean((data as any).serviceAgentOfService);
  const agentOfServiceResult = includesAgentOfService ? calculateAgentOfServiceFees(data) : { agentOfServiceFee: 0, breakdown: undefined };
  const { agentOfServiceFee, breakdown: agentOfServiceBreakdown } = agentOfServiceResult;

  // Combined totals - AP/AR Advanced multipliers are already applied to individual fees, not to entire quote
  let combinedMonthlyFee = bookkeepingFees.monthlyFee + taasFees.monthlyFee + serviceTierFee + payrollFee + apFee + arFee;
  let combinedSetupFee = bookkeepingFees.setupFee + taasFees.setupFee + cleanupProjectFee + priorYearFilingsFee + cfoAdvisoryFee + agentOfServiceFee;

  return {
    bookkeeping: bookkeepingFees,
    taas: taasFees,
    combined: {
      monthlyFee: combinedMonthlyFee,
      setupFee: combinedSetupFee
    },
    includesBookkeeping,
    includesTaas,
    includesAP,
    includesAR,
    includesAgentOfService,
    serviceTierFee,
    cleanupProjectFee,
    priorYearFilingsFee,
    cfoAdvisoryFee,
    cfoAdvisoryHubspotProductId: hubspotProductId,
    payrollFee,
    payrollBreakdown,
    apFee,
    apBreakdown,
    arFee,
    arBreakdown,
    agentOfServiceFee,
    agentOfServiceBreakdown
  };
}