/**
 * Quote Data Sanitization Utilities
 * 
 * Shared sanitization logic for quote creation and updates.
 * Ensures consistent handling of empty strings and undefined values.
 */

export interface SanitizedQuoteData {
  [key: string]: any;
}

/**
 * Sanitize quote numeric fields
 * 
 * Converts empty strings to appropriate default values:
 * - Fee fields → "0" (schema expects strings)
 * - Integer fields → null
 * 
 * @param body - Raw request body
 * @returns Sanitized body with proper defaults
 */
export function sanitizeQuoteFields(body: any): SanitizedQuoteData {
  const sanitized = { ...body };

  // Fee fields that should be "0" when empty (schema expects strings)
  const feeFields = [
    "monthlyFee",
    "setupFee",
    "taasMonthlyFee",
    "taasPriorYearsFee",
    "cleanupComplexity",
  ] as const;

  feeFields.forEach((field) => {
    if (sanitized[field] === "" || sanitized[field] === undefined) {
      sanitized[field] = "0";
    }
  });

  // Integer fields that should be null when empty
  const integerFields = [
    "cleanupMonths",
    "numEntities",
    "customNumEntities",
    "statesFiled",
    "customStatesFiled",
    "numBusinessOwners",
    "customNumBusinessOwners",
    "priorYearsUnfiled",
  ] as const;

  integerFields.forEach((field) => {
    if (sanitized[field] === "" || sanitized[field] === undefined) {
      sanitized[field] = null;
    }
  });

  return sanitized;
}

/**
 * Prepare quote data for validation
 * 
 * Adds required fallback values for validation schema.
 * Used primarily for TaaS-only quotes that don't have bookkeeping fields.
 * 
 * @param sanitized - Already sanitized body
 * @returns Data ready for Zod validation
 */
export function prepareQuoteForValidation(sanitized: SanitizedQuoteData): SanitizedQuoteData {
  return {
    ...sanitized,
    // Ensure required fee fields have values
    monthlyFee: sanitized.monthlyFee || "0",
    setupFee: sanitized.setupFee || "0",
    taasMonthlyFee: sanitized.taasMonthlyFee || "0",
    taasPriorYearsFee: sanitized.taasPriorYearsFee || "0",
    // For TaaS-only quotes, provide defaults for bookkeeping-required fields
    monthlyTransactions: sanitized.monthlyTransactions || "N/A",
    cleanupComplexity: sanitized.cleanupComplexity || "0",
    cleanupMonths: sanitized.cleanupMonths || 0,
    // Required string fields
    monthlyRevenueRange: sanitized.monthlyRevenueRange || "Not specified",
    industry: sanitized.industry || "Not specified",
  };
}
