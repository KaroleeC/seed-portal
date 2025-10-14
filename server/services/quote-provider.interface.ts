/**
 * Quote Provider Interface (Server-Side)
 *
 * Abstract interface for quote management operations.
 * Phase 1: Replaces HubSpot sync with full CRUD operations.
 *
 * Migration Strategy:
 * - Phase 0: HubSpotQuoteProvider (sync only)
 * - Phase 1: SeedPayQuoteProvider (full CRUD)
 * - Routes switch to CRUD operations via provider factory
 */

import type { Quote, CreateQuoteInput, UpdateQuoteInput, QuoteFilters } from "@shared/types/quote";

/**
 * Abstract Quote Provider Interface (Server-Side)
 *
 * All quote management implementations must implement this interface.
 * This ensures consistent behavior across different providers.
 *
 * Phase 1 Focus: CRUD operations for SEEDPAY provider
 */
export interface IQuoteProvider {
  // === CRUD Operations ===

  /**
   * Create a new quote
   *
   * @param data - Quote data including line items
   * @returns Created quote with generated ID
   *
   * @example
   * ```typescript
   * const quote = await provider.createQuote({
   *   companyName: 'Acme Corp',
   *   contactEmail: 'john@acme.com',
   *   lineItems: [
   *     { productName: 'Monthly Bookkeeping', quantity: 1, unitPrice: 7500 }
   *   ],
   *   ownerId: 1
   * });
   * ```
   */
  createQuote(data: CreateQuoteInput): Promise<Quote>;

  /**
   * Get a quote by ID
   *
   * @param quoteId - Quote ID (string UUID or number)
   * @returns Quote with line items, or null if not found
   */
  getQuote(quoteId: string | number): Promise<Quote | null>;

  /**
   * Update an existing quote
   *
   * @param quoteId - Quote ID
   * @param updates - Fields to update (partial)
   * @returns Updated quote
   * @throws Error if quote not found
   */
  updateQuote(quoteId: string | number, updates: UpdateQuoteInput): Promise<Quote>;

  /**
   * Delete a quote
   *
   * Soft delete (archives) or hard delete depending on provider.
   * SEEDPAY: Sets status to 'archived'
   *
   * @param quoteId - Quote ID
   * @returns void
   */
  deleteQuote(quoteId: string | number): Promise<void>;

  /**
   * List quotes with optional filters
   *
   * @param filters - Query filters (status, owner, dates, etc.)
   * @returns Array of quotes matching filters
   *
   * @example
   * ```typescript
   * const quotes = await provider.listQuotes({
   *   status: ['draft', 'pending'],
   *   ownerId: 1,
   *   sortBy: 'createdAt',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  listQuotes(filters?: QuoteFilters): Promise<Quote[]>;

  // === Provider Metadata ===

  /**
   * Provider name (e.g., "seedpay", "hubspot")
   */
  readonly name: string;

  /**
   * Whether this provider supports full CRUD operations
   *
   * - SEEDPAY: true (system of record)
   * - HubSpot: false (sync only, legacy)
   */
  readonly supportsCRUD: boolean;
}

/**
 * Quote Provider Factory Type
 * Returns the configured provider based on environment
 */
export type QuoteProviderFactory = () => IQuoteProvider;

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: string;
  enabled: boolean;
  supportsAsync: boolean;
}
