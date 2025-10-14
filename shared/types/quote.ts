/**
 * SEEDPAY Quote Types
 *
 * Shared types for quote management across client and server.
 * Based on Phase 1 requirements - replaces HubSpot quote structure.
 */

/**
 * Billing frequency for products/services
 */
export type BillingFrequency = "one-time" | "recurring";

/**
 * Quote status workflow
 */
export type QuoteStatus =
  | "draft" // Being created/edited
  | "pending" // Sent to client, awaiting response
  | "approved" // Client approved
  | "rejected" // Client rejected
  | "expired" // Expired without action
  | "archived"; // Manually archived

/**
 * Product from product library
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  billingFrequency: BillingFrequency;
  basePrice: number; // In cents (e.g., $150.00 = 15000)
}

/**
 * Quote line item (product + quantity)
 */
export interface QuoteLineItem {
  id?: string;
  quoteId?: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number; // In cents
  lineTotal: number; // quantity * unitPrice (in cents)
  billingFrequency: BillingFrequency;
  sortOrder?: number;
}

/**
 * Complete quote entity
 */
export interface Quote {
  // === Identity ===
  id: string;
  quoteNumber?: string; // Human-readable quote number (e.g., "Q-2024-001")

  // === Client Information ===
  companyName: string;
  contactEmail: string;
  contactName?: string;
  contactPhone?: string;

  // === Status & Workflow ===
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  approvedAt?: Date;

  // === Commercial Terms ===
  scopeOfWork?: string;
  deliverables?: string;
  durationMonths?: number;

  // === Line Items ===
  lineItems: QuoteLineItem[];

  // === Pricing ===
  subtotal: number; // Sum of all line totals (in cents)
  discount?: number; // Discount amount (in cents)
  discountPercent?: number; // Discount percentage (0-100)
  total: number; // subtotal - discount (in cents)

  // === Payment Terms ===
  paymentTerms?: string;
  paymentSchedule?: string;

  // === Ownership & Attribution ===
  ownerId: number; // User who created the quote
  ownerEmail?: string;

  // === Metadata ===
  notes?: string;
  internalNotes?: string; // Not visible to client
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a new quote
 */
export interface CreateQuoteInput {
  // Client info
  companyName: string;
  contactEmail: string;
  contactName?: string;
  contactPhone?: string;

  // Commercial terms
  scopeOfWork?: string;
  deliverables?: string;
  durationMonths?: number;

  // Line items
  lineItems: Omit<QuoteLineItem, "id" | "quoteId">[];

  // Pricing (can be calculated or provided)
  discount?: number;
  discountPercent?: number;

  // Payment terms
  paymentTerms?: string;
  paymentSchedule?: string;

  // Owner (usually from auth context)
  ownerId: number;
  ownerEmail?: string;

  // Optional
  notes?: string;
  internalNotes?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating an existing quote
 */
export interface UpdateQuoteInput {
  // Client info
  companyName?: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;

  // Status
  status?: QuoteStatus;

  // Commercial terms
  scopeOfWork?: string;
  deliverables?: string;
  durationMonths?: number;

  // Line items (full replacement or null to keep existing)
  lineItems?: Omit<QuoteLineItem, "id" | "quoteId">[];

  // Pricing
  discount?: number;
  discountPercent?: number;

  // Payment terms
  paymentTerms?: string;
  paymentSchedule?: string;

  // Optional
  notes?: string;
  internalNotes?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Filters for listing quotes
 */
export interface QuoteFilters {
  // Status filters
  status?: QuoteStatus | QuoteStatus[];

  // Owner filters
  ownerId?: number;
  ownerEmail?: string;

  // Client filters
  companyName?: string;
  contactEmail?: string;

  // Date filters
  createdAfter?: Date;
  createdBefore?: Date;
  expiresAfter?: Date;
  expiresBefore?: Date;

  // Amount filters
  minTotal?: number;
  maxTotal?: number;

  // Search
  search?: string; // Search across company name, contact, notes

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: "createdAt" | "updatedAt" | "total" | "companyName" | "status";
  sortOrder?: "asc" | "desc";
}

/**
 * Result from quote operations
 */
export interface QuoteOperationResult {
  success: boolean;
  quote?: Quote;
  error?: string;
  message?: string;
}

/**
 * Helper to calculate quote totals
 */
export function calculateQuoteTotals(
  lineItems: QuoteLineItem[],
  discount?: number,
  discountPercent?: number
): {
  subtotal: number;
  discount: number;
  total: number;
} {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

  let finalDiscount = 0;
  if (discountPercent) {
    finalDiscount = Math.round(subtotal * (discountPercent / 100));
  } else if (discount) {
    finalDiscount = discount;
  }

  const total = subtotal - finalDiscount;

  return {
    subtotal,
    discount: finalDiscount,
    total,
  };
}

/**
 * Helper to format price (cents to dollars)
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Helper to format recurring price
 */
export function formatRecurringPrice(cents: number, frequency: BillingFrequency): string {
  const price = formatPrice(cents);
  return frequency === "recurring" ? `${price}/month` : price;
}
