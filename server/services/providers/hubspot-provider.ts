/**
 * HubSpot Quote Provider (Server-Side)
 * 
 * Current implementation of quote sync using HubSpot APIs.
 * Wraps existing syncQuoteToHubSpot function in IQuoteProvider interface.
 * 
 * Migration Strategy:
 * - This provider will be swapped with SeedPayProvider in future
 * - No changes to routes or business logic required when switching
 */

import type { IQuoteProvider, QuoteSyncResult, QuoteSyncOptions } from "../quote-provider.interface";
import { syncQuoteToHubSpot } from "../hubspot/sync";
import { queueJob } from "../../workers/graphile-worker";
import { storage } from "../../storage";

export class HubSpotQuoteProvider implements IQuoteProvider {
  readonly name = "hubspot";
  readonly supportsAsync = true;

  /**
   * Sync a quote to HubSpot
   * 
   * @param quoteId - Internal quote ID
   * @param options - Sync options
   * @returns Sync result with HubSpot IDs
   */
  async syncQuote(quoteId: number, options?: QuoteSyncOptions): Promise<QuoteSyncResult> {
    try {
      const result = await syncQuoteToHubSpot(
        quoteId,
        options?.action || "auto",
        options?.actorEmail,
        undefined, // svcOverride
        undefined, // storageOverride
        {
          dryRun: options?.dryRun,
          includeConnectivity: options?.includeConnectivity,
        }
      );

      return {
        success: result.success,
        quoteId: result.quoteId,
        externalQuoteId: result.hubspotQuoteId || undefined,
        externalDealId: result.hubspotDealId || undefined,
        message: result.message,
      };
    } catch (error: any) {
      return {
        success: false,
        quoteId,
        error: error?.message || "Failed to sync quote to HubSpot",
      };
    }
  }

  /**
   * Queue a sync operation for background processing
   * 
   * Uses Graphile Worker for async job processing.
   * Returns immediately with queued status.
   * 
   * @param quoteId - Internal quote ID
   * @param options - Sync options
   * @returns Job queuing result
   */
  async queueSync(
    quoteId: number,
    options?: QuoteSyncOptions
  ): Promise<{
    queued: boolean;
    jobId?: string;
    result?: QuoteSyncResult;
  }> {
    try {
      const actorEmail = options?.actorEmail || "system@seedfinancial.io";
      const action = options?.action || "auto";

      // Queue via Graphile Worker
      await queueJob("hubspot-quote-sync", { quoteId, action, actorEmail });

      // Note: Graphile Worker doesn't expose job ID via queueJob helper
      // For full job tracking, we'd need to use runner.addJob directly
      return {
        queued: true,
        jobId: undefined, // TODO: Expose job ID when needed
      };
    } catch (error: any) {
      // Fallback to synchronous sync if queue fails
      console.error("Failed to queue HubSpot sync, falling back to sync:", error);
      
      const result = await this.syncQuote(quoteId, options);
      
      return {
        queued: false,
        result,
      };
    }
  }

  /**
   * Check sync job status
   * 
   * Note: Current implementation doesn't store job status in DB.
   * For full status tracking, we'd need to add job_status table.
   * 
   * @param jobId - Job ID from queued sync
   * @returns Current job status
   */
  async checkSyncStatus(jobId: string): Promise<{
    status: "pending" | "running" | "completed" | "failed";
    result?: QuoteSyncResult;
    error?: string;
  }> {
    // TODO: Implement job status tracking
    // For now, check if quote has HubSpot IDs as proxy for completion
    
    try {
      // Extract quoteId from jobId if it's embedded
      // This is a placeholder - real implementation needs job_status table
      const quoteId = parseInt(jobId, 10);
      
      if (!Number.isNaN(quoteId)) {
        const quote = await storage.getQuote(quoteId);
        
        if (quote?.hubspotQuoteId && quote?.hubspotDealId) {
          return {
            status: "completed",
            result: {
              success: true,
              quoteId: quote.id,
              externalQuoteId: quote.hubspotQuoteId,
              externalDealId: quote.hubspotDealId,
            },
          };
        }
      }
      
      // Default: assume pending
      return {
        status: "pending",
      };
    } catch (error: any) {
      return {
        status: "failed",
        error: error?.message || "Failed to check sync status",
      };
    }
  }
}

/**
 * Singleton instance
 * DRY: Single instance used across the application
 */
export const hubspotProvider = new HubSpotQuoteProvider();
