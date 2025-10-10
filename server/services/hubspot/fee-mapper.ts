/**
 * Fee Mapping Layer for HubSpot Line Items
 *
 * This module provides explicit, type-safe mapping between pricing calculations
 * and HubSpot product line items. It prevents parameter order bugs and ensures
 * all fees are correctly mapped to their corresponding products.
 *
 * Fee Structure (as clarified):
 * - Monthly Services: Bookkeeping Monthly, TaaS Monthly
 * - One-Time Fees: Bookkeeping Setup, Cleanup Projects, Prior Year Filings
 * - Additional Services: Payroll, AP, AR, Agent of Service, CFO Advisory, QBO
 *
 * Note: TaaS has NO setup fee - it's monthly only
 */

import type { QuoteConfig } from "./quotes.js";
import * as PricingConstants from "../../../shared/pricing-constants.js";

/**
 * Represents a HubSpot line item with product ID and price
 */
export interface FeeLineItem {
  productId: string;
  price: number;
  name: string; // For debugging/logging
}

/**
 * Service configuration for line item generation
 */
export interface ServiceConfig {
  // Product IDs from HubSpot
  PRODUCT_IDS: {
    MONTHLY_BOOKKEEPING: string;
    MONTHLY_BOOKKEEPING_SETUP: string;
    CLEANUP_PROJECT: string;
    TAAS: string;
    MANAGED_QBO_SUBSCRIPTION: string;
    PRIOR_YEAR_FILINGS: string;
    PAYROLL_SERVICE: string;
    AP_LITE_SERVICE: string;
    AP_ADVANCED_SERVICE: string;
    AR_LITE_SERVICE: string;
    AR_ADVANCED_SERVICE: string;
    AGENT_OF_SERVICE: string;
    CFO_ADVISORY_DEPOSIT: string;
  };
}

/**
 * Maps quote configuration to HubSpot line items
 *
 * This function provides explicit, documented mapping between fees and products.
 * Each line item is only added if the fee is > 0 and the service is enabled.
 *
 * @param config - Quote configuration with all fees and service flags (QuoteConfig or UpdateQuoteConfig)
 * @param productIds - HubSpot product IDs
 * @returns Array of line items to create in HubSpot
 */
export function mapFeesToLineItems(
  config: Omit<QuoteConfig, "dealId"> & { dealId?: string },
  productIds: ServiceConfig["PRODUCT_IDS"]
): FeeLineItem[] {
  const lineItems: FeeLineItem[] = [];

  // ============================================================================
  // MONTHLY SERVICES
  // ============================================================================

  // Monthly Bookkeeping (recurring)
  if (
    config.includesBookkeeping &&
    config.bookkeepingMonthlyFee &&
    config.bookkeepingMonthlyFee > 0
  ) {
    lineItems.push({
      productId: productIds.MONTHLY_BOOKKEEPING,
      price: config.bookkeepingMonthlyFee,
      name: "Monthly Bookkeeping",
    });
  }

  // TaaS Monthly (recurring)
  if (config.includesTaas && config.taasMonthlyFee && config.taasMonthlyFee > 0) {
    lineItems.push({
      productId: productIds.TAAS,
      price: config.taasMonthlyFee,
      name: "TaaS Monthly",
    });
  }

  // ============================================================================
  // ONE-TIME / SETUP FEES
  // ============================================================================

  // Bookkeeping Setup Fee (one-time)
  // Calculated as: current month × base × 0.25
  if (config.includesBookkeeping && config.bookkeepingSetupFee && config.bookkeepingSetupFee > 0) {
    lineItems.push({
      productId: productIds.MONTHLY_BOOKKEEPING_SETUP,
      price: config.bookkeepingSetupFee,
      name: "Monthly Bookkeeping Setup Fee",
    });
  }

  // Cleanup Projects (one-time project)
  // Calculated as: months × $100/month
  if (config.cleanupProjectFee && config.cleanupProjectFee > 0) {
    lineItems.push({
      productId: productIds.CLEANUP_PROJECT,
      price: config.cleanupProjectFee,
      name: "Clean-Up / Catch-Up Project",
    });
  }

  // Prior Year Filings (one-time project)
  // Calculated as: selected years × $1500/year
  if (config.priorYearFilingsFee && config.priorYearFilingsFee > 0) {
    lineItems.push({
      productId: productIds.PRIOR_YEAR_FILINGS,
      price: config.priorYearFilingsFee,
      name: "Prior Year Filings",
    });
  }

  // ============================================================================
  // ADDITIONAL SERVICES
  // ============================================================================

  // Payroll Service
  if (config.includesPayroll && config.payrollFee && config.payrollFee > 0) {
    lineItems.push({
      productId: productIds.PAYROLL_SERVICE,
      price: config.payrollFee,
      name: "Payroll Service",
    });
  }

  // AP (Accounts Payable) - Lite or Advanced
  if (config.includesAP && config.apFee && config.apFee > 0) {
    const apProductId =
      config.quoteData?.apServiceTier === "advanced"
        ? productIds.AP_ADVANCED_SERVICE
        : productIds.AP_LITE_SERVICE;
    const apName =
      config.quoteData?.apServiceTier === "advanced" ? "AP Advanced Service" : "AP Lite Service";
    lineItems.push({
      productId: apProductId,
      price: config.apFee,
      name: apName,
    });
  }

  // AR (Accounts Receivable) - Lite or Advanced
  if (config.includesAR && config.arFee && config.arFee > 0) {
    const arProductId =
      config.quoteData?.arServiceTier === "advanced"
        ? productIds.AR_ADVANCED_SERVICE
        : productIds.AR_LITE_SERVICE;
    const arName =
      config.quoteData?.arServiceTier === "advanced" ? "AR Advanced Service" : "AR Lite Service";
    lineItems.push({
      productId: arProductId,
      price: config.arFee,
      name: arName,
    });
  }

  // Agent of Service
  if (config.includesAgentOfService && config.agentOfServiceFee && config.agentOfServiceFee > 0) {
    lineItems.push({
      productId: productIds.AGENT_OF_SERVICE,
      price: config.agentOfServiceFee,
      name: "Agent of Service",
    });
  }

  // CFO Advisory
  if (config.includesCfoAdvisory && config.cfoAdvisoryFee && config.cfoAdvisoryFee > 0) {
    lineItems.push({
      productId: productIds.CFO_ADVISORY_DEPOSIT,
      price: config.cfoAdvisoryFee,
      name: "CFO Advisory Deposit",
    });
  }

  // QBO Subscription
  if (config.quoteData?.qboSubscription) {
    const qboPrice = config.quoteData?.qboFee || PricingConstants.QBO_MONTHLY_FEE;
    lineItems.push({
      productId: productIds.MANAGED_QBO_SUBSCRIPTION,
      price: qboPrice,
      name: "Managed QBO Subscription",
    });
  }

  // Note: FPA Build service has no product ID in HubSpot
  // It's handled via terms/assumptions only

  return lineItems;
}

/**
 * Validates that all expected fees are present in the line items
 *
 * @param config - Quote configuration (QuoteConfig or UpdateQuoteConfig)
 * @param lineItems - Generated line items
 * @returns Validation result with any warnings
 */
export function validateLineItems(
  config: Omit<QuoteConfig, "dealId"> & { dealId?: string },
  lineItems: FeeLineItem[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check if bookkeeping monthly is missing when it should be present
  if (
    config.includesBookkeeping &&
    config.bookkeepingMonthlyFee &&
    config.bookkeepingMonthlyFee > 0 &&
    !lineItems.find((item) => item.name === "Monthly Bookkeeping")
  ) {
    warnings.push("Bookkeeping monthly fee is set but no line item was created");
  }

  // Check if TaaS monthly is missing when it should be present
  if (
    config.includesTaas &&
    config.taasMonthlyFee &&
    config.taasMonthlyFee > 0 &&
    !lineItems.find((item) => item.name === "TaaS Monthly")
  ) {
    warnings.push("TaaS monthly fee is set but no line item was created");
  }

  // Check for zero-price line items (shouldn't happen)
  const zeroPriceItems = lineItems.filter((item) => item.price <= 0);
  if (zeroPriceItems.length > 0) {
    warnings.push(
      `Found ${zeroPriceItems.length} line items with zero or negative price: ${zeroPriceItems.map((i) => i.name).join(", ")}`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
