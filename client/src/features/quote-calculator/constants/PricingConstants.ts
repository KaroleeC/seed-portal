/**
 * 🎯 PRICING CONSTANTS - NO MORE HARDCODED MAGIC NUMBERS!
 * Single source of truth for all pricing configuration
 */

// Service tier pricing
export const SERVICE_TIERS = {
  AUTOMATED: {
    name: 'Automated',
    fee: 0,
    description: 'Self-service with basic support'
  },
  GUIDED: {
    name: 'Guided', 
    fee: 79,
    description: 'Enhanced support & guidance'
  },
  CONCIERGE: {
    name: 'Concierge',
    fee: 249, 
    description: 'White-glove premium service'
  }
} as const;

// Prior year filing fees
export const PRIOR_YEAR_FILING_FEE = 1500; // Per year

// CFO Advisory pricing
export const CFO_ADVISORY = {
  PAY_AS_YOU_GO: {
    depositHours: 8,
    hourlyRate: 275,
    depositFee: 8 * 275 // 2,200
  },
  PREPAID_BUNDLES: {
    10: { hours: 10, fee: 2500, savings: 250 },
    20: { hours: 20, fee: 4500, savings: 1000 },
    40: { hours: 40, fee: 8000, savings: 3000 }
  }
} as const;

// Payroll service pricing
export const PAYROLL_PRICING = {
  BASE_FEE: 50,
  PER_EMPLOYEE_FEE: 15,
  FREQUENCY_MULTIPLIERS: {
    weekly: 4,
    biweekly: 2, 
    monthly: 1
  }
} as const;

// AP/AR service pricing
export const AP_AR_PRICING = {
  AP: {
    LITE: { baseFee: 150, multiplier: 1 },
    ADVANCED: { baseFee: 500, multiplier: 2.5 } // Affects entire quote
  },
  AR: {
    LITE: { baseFee: 150, multiplier: 1 },
    ADVANCED: { baseFee: 500, multiplier: 2.5 } // Affects entire quote
  }
} as const;

// Agent of Service pricing
export const AGENT_OF_SERVICE_PRICING = {
  REGISTERED_AGENT: {
    baseFee: 150,
    perStateFee: 150
  },
  CT_CORPORATION: {
    baseFee: 300,
    perStateFee: 200
  }
} as const;

// Bookkeeping discount percentages
export const DISCOUNTS = {
  SEED_BOOKKEEPING_PACKAGE: 0.50, // 50% off bookkeeping when both monthly services selected
} as const;

// Form validation constants
export const VALIDATION = {
  DEBOUNCE_DELAY: 300, // milliseconds
  MIN_CLEANUP_MONTHS: 0,
  APPROVAL_CODE_LENGTH: 4
} as const;

// UI display constants
export const UI = {
  MAX_COMPONENT_LINES: 200,
  ANIMATION_DURATION: 200, // milliseconds
  TOAST_DURATION: 5000 // milliseconds
} as const;

// Performance constants
export const PERFORMANCE = {
  CALCULATION_CACHE_TTL: 5000, // 5 seconds
  API_RETRY_COUNT: 3,
  API_TIMEOUT: 10000 // 10 seconds
} as const;