import type { UseFormReturn } from "react-hook-form";
export type FeeBreakdown = {
  monthlyFee: number;
  setupFee: number;
  // Allow additional calculation-specific properties without strict typing
  [key: string]: any;
};

// Minimal subset of form fields that QuoteSummarySection reads via form.watch
export type QuoteFormWatchFields = {
  servicePriorYearFilings: boolean;
  serviceCfoAdvisory: boolean;
  serviceTaasMonthly: boolean;
  serviceMonthlyBookkeeping: boolean;
};

// Only require the watch API from react-hook-form; accept any form shape for compatibility
export type QuoteSummaryForm = Pick<UseFormReturn<any>, "watch">;

export type FeeCalculation = {
  // Core combined totals used widely in the UI
  combined: FeeBreakdown;
  // Service-specific breakdowns used for display
  bookkeeping: FeeBreakdown;
  taas: FeeBreakdown;

  // Project and add-on fees
  priorYearFilingsFee: number;
  cleanupProjectFee: number;
  cfoAdvisoryFee?: number;
  payrollFee?: number;
  apFee?: number;
  arFee?: number;
  agentOfServiceFee?: number;
  serviceTierFee?: number;
  qboFee?: number;

  // Flags indicating included services
  includesBookkeeping?: boolean;
  includesTaas?: boolean;

  // Allow calculation engines to add more properties
  [key: string]: any;
};
