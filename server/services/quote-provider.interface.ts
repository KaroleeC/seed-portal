/**
 * Quote Provider Interface (Server-Side)
 *
 * Abstract interface for quote sync operations on the backend.
 * Mirrors the client-side IQuoteProvider for consistency.
 *
 * Migration Strategy:
 * - Current: HubSpotQuoteProvider
 * - Future: SeedPayQuoteProvider
 * - No changes to routes or business logic required
 */

import type { Quote } from "@shared/schema";

export interface QuoteSyncResult {
  success: boolean;
  quoteId: number;
  externalQuoteId?: string;
  externalDealId?: string;
  message?: string;
  error?: string;
  jobId?: string;
  queued?: boolean;
}

export interface QuoteSyncOptions {
  action?: "auto" | "create" | "update";
  actorEmail?: string;
  dryRun?: boolean;
  includeConnectivity?: boolean;
}

/**
 * Abstract Quote Provider Interface (Server-Side)
 *
 * All CRM integrations (HubSpot, SeedPay, etc.) must implement this interface.
 * This ensures consistent behavior across different providers.
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
   * Queue a sync operation for background processing
   * @param quoteId - Internal quote ID
   * @param options - Sync options
   * @returns Job ID for status tracking
   */
  queueSync(
    quoteId: number,
    options?: QuoteSyncOptions
  ): Promise<{
    queued: boolean;
    jobId?: string;
    result?: QuoteSyncResult;
  }>;

  /**
   * Check sync job status (for queued operations)
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
   * Whether this provider supports async/queued operations
   */
  readonly supportsAsync: boolean;
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
