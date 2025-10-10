/**
 * Centralized Pricing Constants
 *
 * Single source of truth for all pricing rates, multipliers, and magic numbers.
 * Update these values to change pricing across the entire application.
 *
 * Last Updated: 2025-09-30
 */

// ============================================================================
// PROJECT FEES (One-Time)
// ============================================================================

/**
 * Cleanup/Catch-Up Project Fee
 * Charged per month of cleanup work required
 */
export const CLEANUP_FEE_PER_MONTH = 100;

/**
 * Prior Year Filings Fee
 * Charged per year of unfiled tax returns
 */
export const PRIOR_YEAR_FILING_FEE_PER_YEAR = 1500;

// ============================================================================
// BOOKKEEPING SETUP FEE
// ============================================================================

/**
 * Bookkeeping Setup Fee Calculation
 * Formula: (monthly bookkeeping fee) × (current month) × (setup multiplier)
 *
 * Example: If monthly fee is $400 and current month is March (3):
 * Setup fee = $400 × 3 × 0.25 = $300
 */
export const BOOKKEEPING_SETUP_MULTIPLIER = 0.25;

// ============================================================================
// TAAS (TAX AS A SERVICE)
// ============================================================================

/**
 * TaaS Base Fee
 * Starting monthly fee before upcharges and multipliers
 */
export const TAAS_BASE_FEE = 150;

/**
 * TaaS Entity Upcharge
 * Additional monthly fee per entity above the threshold
 */
export const TAAS_ENTITY_UPCHARGE_PER_ENTITY = 75;
export const TAAS_ENTITY_THRESHOLD = 5; // Free entities included

/**
 * TaaS State Upcharge
 * Additional monthly fee per state filed above 1
 */
export const TAAS_STATE_UPCHARGE_PER_STATE = 50;
export const TAAS_MAX_STATES = 50; // Cap at 50 states

/**
 * TaaS International Filing Upcharge
 * Additional monthly fee if international filing is required
 */
export const TAAS_INTERNATIONAL_UPCHARGE = 200;

/**
 * TaaS Owner Upcharge
 * Additional monthly fee per business owner above the threshold
 */
export const TAAS_OWNER_UPCHARGE_PER_OWNER = 25;
export const TAAS_OWNER_THRESHOLD = 5; // Free owners included

/**
 * TaaS Bookkeeping Quality Upcharge
 * Additional monthly fee if bookkeeping quality is "Messy"
 */
export const TAAS_MESSY_BOOKKEEPING_UPCHARGE = 25;

/**
 * TaaS Personal 1040 Upcharge
 * Additional monthly fee per business owner if 1040s are included
 */
export const TAAS_PERSONAL_1040_PER_OWNER = 25;

/**
 * TaaS Setup Fee
 * TaaS has NO setup fee - it's a monthly recurring service only
 * Note: "Prior years unfiled" is a TaaS input field but doesn't create a setup fee
 */
export const TAAS_SETUP_FEE = 0;

// ============================================================================
// QUICKBOOKS ONLINE (QBO)
// ============================================================================

/**
 * Managed QBO Subscription Fee
 * Monthly fee for managed QuickBooks Online subscription
 */
export const QBO_MONTHLY_FEE = 60;

// ============================================================================
// ROUNDING RULES
// ============================================================================

/**
 * Rounding increments for different fee types
 */
export const ROUNDING = {
  /** Round to nearest $5 (used for most fees) */
  NEAREST_5: 5,

  /** Round to nearest $25 (used for TaaS and some bookkeeping) */
  NEAREST_25: 25,

  /** Round to nearest $50 (used for high-value services) */
  NEAREST_50: 50,
} as const;

// ============================================================================
// PACKAGE DISCOUNTS
// ============================================================================

/**
 * Bundle Discount
 * Percentage discount when both Bookkeeping and TaaS are selected
 */
export const BUNDLE_DISCOUNT_PERCENTAGE = 0.1; // 10% off

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Round a number to the nearest step value
 * @param value - Value to round
 * @param step - Step size (5, 25, 50, etc.)
 * @returns Rounded value
 */
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Round to nearest $5
 */
export function roundToNearest5(value: number): number {
  return roundToStep(value, ROUNDING.NEAREST_5);
}

/**
 * Round to nearest $25
 */
export function roundToNearest25(value: number): number {
  return roundToStep(value, ROUNDING.NEAREST_25);
}

/**
 * Round to nearest $50
 */
export function roundToNearest50(value: number): number {
  return roundToStep(value, ROUNDING.NEAREST_50);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that all constants are positive numbers
 * This runs at module load time to catch configuration errors
 */
function validateConstants() {
  const constants = {
    CLEANUP_FEE_PER_MONTH,
    PRIOR_YEAR_FILING_FEE_PER_YEAR,
    BOOKKEEPING_SETUP_MULTIPLIER,
    TAAS_BASE_FEE,
    TAAS_ENTITY_UPCHARGE_PER_ENTITY,
    TAAS_ENTITY_THRESHOLD,
    TAAS_STATE_UPCHARGE_PER_STATE,
    TAAS_MAX_STATES,
    TAAS_INTERNATIONAL_UPCHARGE,
    TAAS_OWNER_UPCHARGE_PER_OWNER,
    TAAS_OWNER_THRESHOLD,
    TAAS_MESSY_BOOKKEEPING_UPCHARGE,
    TAAS_PERSONAL_1040_PER_OWNER,
    QBO_MONTHLY_FEE,
  };

  for (const [name, value] of Object.entries(constants)) {
    if (typeof value !== "number" || value < 0) {
      throw new Error(`Invalid pricing constant: ${name} = ${value}`);
    }
  }
}

// Run validation on module load
validateConstants();
