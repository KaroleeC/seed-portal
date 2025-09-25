export const BOOKKEEPING_SOFTWARE_OPTIONS = [
  "QuickBooks Online",
  "QuickBooks Desktop",
  "Xero",
  "NetSuite",
  "None",
  "Other",
] as const;

export const BANK_OPTIONS = [
  "Mercury",
  "Brex",
  "Chase",
  "Bank of America",
  "Wells Fargo",
  "Other",
] as const;

export const MERCHANT_PROVIDER_OPTIONS = [
  "Stripe",
  "Square",
  "Shopify",
  "PayPal",
  "WooCommerce",
  "Amazon",
  "Other",
] as const;

export const MONTHLY_TRANSACTION_BANDS = [
  "<100",
  "100-300",
  "300-600",
  "600-1000",
  "1000-2000",
  "2000+",
] as const;

export const ACCOUNTING_BASIS_OPTIONS = ["Cash", "Accrual"] as const;
