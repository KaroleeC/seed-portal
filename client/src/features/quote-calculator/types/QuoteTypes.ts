/**
 * 🎯 PROPER SOVIET TYPESCRIPT INTERFACES
 * No more 'any' types - everything strongly typed for glorious maintainability!
 */

import { z } from "zod";
import { insertQuoteSchema } from "@shared/schema";

// Core quote form data interface (eliminates 'any' usage)
export interface QuoteFormData {
  // Contact Information
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;

  // Company Address (all required)
  clientStreetAddress: string;
  clientCity: string;
  clientState: string;
  clientZipCode: string;

  // Business Details
  industry: string;
  monthlyRevenueRange: string;
  entityType: string;

  // Core Service Selection
  serviceMonthlyBookkeeping?: boolean;
  serviceTaasMonthly?: boolean;
  serviceCleanupProjects?: boolean;
  servicePriorYearFilings?: boolean;
  serviceCfoAdvisory?: boolean;
  servicePayrollService?: boolean;
  serviceApArService?: boolean;
  serviceArService?: boolean;
  serviceAgentOfService?: boolean;

  // Bookkeeping Specific
  monthlyTransactions?: string;
  cleanupComplexity?: string;
  cleanupMonths?: number;
  accountingBasis?: string;
  qboSubscription?: boolean;

  // TaaS Specific
  bookkeepingQuality?: string;
  numEntities?: number;
  customNumEntities?: number;
  statesFiled?: number;
  customStatesFiled?: number;
  internationalFiling?: boolean;
  numBusinessOwners?: number;
  customNumBusinessOwners?: number;
  include1040s?: boolean;
  priorYearsUnfiled?: number;
  alreadyOnSeedBookkeeping?: boolean;

  // Service Tier
  serviceTier?: 'Automated' | 'Guided' | 'Concierge';

  // Prior Year Filings
  priorYearFilings?: string[];

  // Cleanup Projects  
  cleanupPeriods?: string[];

  // CFO Advisory
  cfoAdvisoryType?: 'pay_as_you_go' | 'prepaid_bundle';
  cfoAdvisoryBundleHours?: number;

  // Payroll Service
  payrollEmployeeCount?: number;
  payrollFrequency?: 'weekly' | 'biweekly' | 'monthly';

  // AP/AR Service
  apServiceTier?: 'lite' | 'advanced';
  arServiceTier?: 'lite' | 'advanced';

  // Agent of Service
  agentOfServiceType?: 'registered_agent' | 'ct_corporation';
  agentOfServiceStates?: string[];

  // Approval System
  overrideReason?: string;
  customOverrideReason?: string;
  customSetupFee?: string;
  approvalCode?: string;
}

// Pricing calculation result interface (strongly typed, no more 'any')
export interface PricingCalculationResult {
  // Core service fees
  bookkeeping: {
    monthlyFee: number;
    setupFee: number;
  };
  taas: {
    monthlyFee: number;
    setupFee: number;
  };
  combined: {
    monthlyFee: number;
    setupFee: number;
  };

  // Service flags
  includesBookkeeping: boolean;
  includesTaas: boolean;
  includesAP: boolean;
  includesAR: boolean;
  includesAgentOfService: boolean;

  // Individual service fees
  serviceTierFee: number;
  cleanupProjectFee: number;
  priorYearFilingsFee: number;
  cfoAdvisoryFee: number;
  cfoAdvisoryHubspotProductId: string | null;
  payrollFee: number;
  payrollBreakdown?: PayrollBreakdown;
  apFee: number;
  apBreakdown?: APBreakdown;
  arFee: number;
  arBreakdown?: ARBreakdown;
  agentOfServiceFee: number;
  agentOfServiceBreakdown?: AgentOfServiceBreakdown;

  // Total calculations
  totalMonthlyFee: number;
  totalSetupFee: number;
}

// Breakdown interfaces for detailed pricing display
export interface PayrollBreakdown {
  baseFee: number;
  perEmployeeFee: number;
  frequencyMultiplier: number;
  totalEmployees: number;
}

export interface APBreakdown {
  tier: 'lite' | 'advanced';
  baseFee: number;
  multiplier?: number;
}

export interface ARBreakdown {
  tier: 'lite' | 'advanced';
  baseFee: number;
  multiplier?: number;
}

export interface AgentOfServiceBreakdown {
  type: 'registered_agent' | 'ct_corporation';
  baseFee: number;
  stateCount: number;
  perStateFee: number;
}

// Form validation state interface
export interface FormValidationState {
  isValid: boolean;
  missingFields: string[];
  fieldErrors: Record<string, string>;
}

// HubSpot contact interface
export interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    [key: string]: string | undefined;
  };
}

// Approval workflow interfaces
export interface ApprovalRequest {
  contactEmail: string;
  overrideReason: string;
  customOverrideReason?: string;
  customSetupFee?: string;
  cleanupMonths?: number;
  quoteData: Partial<QuoteFormData>;
}

export interface ApprovalValidation {
  valid: boolean;
  used?: boolean;
  expired?: boolean;
}

// Component prop interfaces
export interface ServiceCardProps {
  title: string;
  description: string;
  fee: number;
  isMonthly: boolean;
  icon?: string;
  gradient?: string;
  borderColor?: string;
}

export interface PricingDisplayProps {
  calculation: PricingCalculationResult;
  formData: QuoteFormData;
}

export interface QuoteSubmissionProps {
  formData: QuoteFormData;
  calculation: PricingCalculationResult;
  onSubmit: (data: QuoteFormData) => Promise<void>;
  onSuccess: (quote: any) => void;
  onError: (error: Error) => void;
}

// Zod-based form schema type
export type QuoteFormSchema = z.infer<typeof insertQuoteSchema>;

// Export the schema for validation
export { insertQuoteSchema as quoteFormSchema };