/**
 * Quote Validation
 * 
 * Provider-agnostic validation rules for quotes.
 * Extracted from useHubSpotSync for reusability and testability.
 */

import type { QuoteFormFields } from "@/features/quote-calculator/schema";
import type { FeeCalculation } from "@/components/seedqc/types";

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

/**
 * Get missing required fields for TaaS service
 * 
 * DRY: Single source of truth for TaaS validation rules
 */
export function getMissingTaasFields(values: QuoteFormFields): string[] {
  const missing: string[] = [];

  if (!values.monthlyRevenueRange) missing.push("monthlyRevenueRange");
  if (!values.industry) missing.push("industry");
  if (!values.numEntities || Number(values.numEntities) <= 0) missing.push("numEntities");
  if (!values.statesFiled || Number(values.statesFiled) <= 0) missing.push("statesFiled");
  if (values.internationalFiling === undefined || values.internationalFiling === null)
    missing.push("internationalFiling");
  if (!values.numBusinessOwners || Number(values.numBusinessOwners) <= 0)
    missing.push("numBusinessOwners");
  if (values.include1040s === undefined || values.include1040s === null)
    missing.push("include1040s");

  return missing;
}

/**
 * Get all missing required fields based on selected services
 * 
 * @param values - Form values
 * @param feeCalculation - Current fee calculation
 * @returns Array of missing field names
 */
export function getMissingFields(
  values: QuoteFormFields,
  feeCalculation: FeeCalculation
): string[] {
  const missing: string[] = [];

  // TaaS-specific validation
  const includesTaas = Boolean(feeCalculation?.includesTaas) || Boolean((values as any).includesTaas);
  if (includesTaas) {
    missing.push(...getMissingTaasFields(values));
  }

  // TODO: Add validation for other services as needed
  // - Bookkeeping
  // - Payroll
  // - AP/AR
  // - CFO Advisory

  return missing;
}

/**
 * Validate quote before sync
 * 
 * @param values - Form values
 * @param feeCalculation - Current fee calculation
 * @returns Validation result
 */
export function validateQuoteForSync(
  values: QuoteFormFields,
  feeCalculation: FeeCalculation
): ValidationResult {
  const missingFields = getMissingFields(values, feeCalculation);
  const errors: string[] = [];

  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(", ")}`);
  }

  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
  };
}

/**
 * User-friendly field names for error messages
 */
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  monthlyRevenueRange: "Monthly Revenue Range",
  industry: "Industry",
  numEntities: "Number of Entities",
  statesFiled: "States Filed",
  internationalFiling: "International Filing",
  numBusinessOwners: "Number of Business Owners",
  include1040s: "Include 1040s",
};

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) return "";
  
  const fieldNames = result.missingFields
    .map((field) => FIELD_DISPLAY_NAMES[field] || field)
    .join(", ");

  return `Please complete the following fields: ${fieldNames}`;
}
