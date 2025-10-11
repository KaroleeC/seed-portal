/**
 * Quote Domain Types
 * 
 * Properly typed interfaces for quote operations to replace `any` types.
 */

import type { Quote } from "@shared/schema";

/**
 * Quote data with owner information
 * Used when creating quotes (adds ownerId to insert schema)
 */
export interface QuoteWithOwner extends Omit<Quote, 'id' | 'createdAt' | 'updatedAt'> {
  ownerId: number;
}

/**
 * Quote creation data (from API request)
 * Before validation and price calculation
 */
export interface QuoteCreationData {
  contactEmail: string;
  companyName?: string;
  monthlyFee: string;
  setupFee: string;
  taasMonthlyFee: string;
  taasPriorYearsFee: string;
  ownerId: number;
  includesBookkeeping?: boolean;
  includesTaas?: boolean;
  archived?: boolean;
  quoteType?: string;
  entityType?: string;
  numEntities?: number | null;
  customNumEntities?: number | null;
  statesFiled?: number | null;
  customStatesFiled?: number | null;
  internationalFiling?: boolean;
  numBusinessOwners?: number | null;
  customNumBusinessOwners?: number | null;
  monthlyRevenueRange?: string;
  monthlyTransactions?: string;
  industry?: string;
  cleanupMonths?: number | null;
  cleanupComplexity?: string;
  cleanupOverride?: boolean;
  overrideReason?: string;
  customOverrideReason?: string;
  customSetupFee?: string;
  serviceBookkeeping?: boolean;
  serviceTaas?: boolean;
  servicePayroll?: boolean;
  serviceApLite?: boolean;
  serviceArLite?: boolean;
  contactFirstName?: string;
  contactLastName?: string;
  clientStreetAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZipCode?: string;
  accountingBasis?: string;
  serviceTier?: string;
  serviceAgentOfService?: boolean;
  serviceCfoAdvisory?: boolean;
  priorYearsUnfiled?: number | null;
  [key: string]: any; // Allow additional fields
}

/**
 * Approval check result
 */
export interface ApprovalCheckResult {
  required: boolean;
  liveQuotesCount: number;
  isValid?: boolean;
}

/**
 * Pricing calculation result
 * From calculateCombinedFees
 */
export interface PricingCalculation {
  combined: {
    monthlyFee: number;
    setupFee: number;
  };
  taas: {
    monthlyFee: number;
  };
  priorYearFilingsFee: number;
  qboFee: number;
  bookkeeping: {
    monthlyFee: number;
    setupFee: number;
  };
  payrollFee?: number;
  apFee?: number;
  arFee?: number;
  agentOfServiceFee?: number;
  cfoAdvisoryFee?: number;
  cleanupProjectFee?: number;
  serviceTierFee?: number;
}

/**
 * Quote update data (from API request)
 */
export interface QuoteUpdateData extends Partial<QuoteCreationData> {
  id: number;
}

/**
 * HubSpot quote sync options
 * For the refactored updateQuote call
 */
export interface HubSpotQuoteSyncOptions {
  hubspotQuoteId: string;
  hubspotDealId?: string;
  companyName: string;
  contact: {
    email: string;
    firstName: string;
    lastName: string;
  };
  fees: {
    monthly: number;
    setup: number;
    taasMonthly: number;
    taasPriorYears: number;
    bookkeepingMonthly: number;
    bookkeepingSetup: number;
    payroll?: number;
    ap?: number;
    ar?: number;
    agentOfService?: number;
    cfoAdvisory?: number;
    cleanupProject?: number;
    serviceTier?: number;
  };
  services: {
    bookkeeping: boolean;
    taas: boolean;
    payroll: boolean;
    apLite: boolean;
    arLite: boolean;
    agentOfService: boolean;
    cfoAdvisory: boolean;
    fpaBuild: boolean;
  };
  serviceTier?: string;
  quoteData: Quote; // Full quote for reference
}
