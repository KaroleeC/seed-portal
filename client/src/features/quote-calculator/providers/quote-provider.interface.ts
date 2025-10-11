/**
 * Quote Provider Interface
 * 
 * Abstract interface for quote sync operations.
 * Allows swapping between HubSpot, SeedPay, or other providers without changing business logic.
 * 
 * Migration Strategy:
 * - Current: HubSpotQuoteProvider
 * - Future: SeedPayQuoteProvider
 * - No changes to Calculator UI or business logic required
 */

import type { Quote } from "@shared/schema";

export interface QuoteSyncResult {
  success: boolean;
  quoteId?: number;
  externalQuoteId?: string;
  externalDealId?: string;
  message?: string;
  error?: string;
  jobId?: string; // For async operations
  queued?: boolean; // If operation was queued
}

export interface QuoteSyncOptions {
  action?: "auto" | "create" | "update";
  dryRun?: boolean;
}

/**
 * Abstract Quote Provider Interface
 * 
 * All CRM integrations (HubSpot, SeedPay, etc.) must implement this interface
 */
export interface IQuoteProvider {
  /**
   * Sync a quote to the external system
   * @param quoteId - Internal quote ID
   * @param options - Sync options
   * @returns Sync result with external IDs
   */
  syncQuote(quoteId: number, options?: QuoteSyncOptions): Promise<QuoteSyncResult>;

  /**
   * Check sync job status (for async operations)
   * @param jobId - Job ID from queued sync
   * @returns Current job status
   */
  checkSyncStatus(jobId: string): Promise<{
    status: "pending" | "running" | "completed" | "failed";
    result?: QuoteSyncResult;
    error?: string;
  }>;

  /**
   * Provider name (e.g., "hubspot", "seedpay")
   */
  readonly name: string;

  /**
   * Whether this provider supports async operations
   */
  readonly supportsAsync: boolean;
}

/**
 * Quote Provider Factory
 * Returns the configured provider based on environment
 */
export type QuoteProviderFactory = () => IQuoteProvider;
