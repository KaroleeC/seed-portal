/**
 * HubSpot Quote Provider
 * 
 * Current implementation of quote sync using HubSpot APIs.
 * Will be replaced by SeedPayProvider in future.
 */

import { apiRequest } from "@/lib/queryClient";
import type { IQuoteProvider, QuoteSyncResult, QuoteSyncOptions } from "./quote-provider.interface";

export class HubSpotQuoteProvider implements IQuoteProvider {
  readonly name = "hubspot";
  readonly supportsAsync = true;

  async syncQuote(quoteId: number, options?: QuoteSyncOptions): Promise<QuoteSyncResult> {
    try {
      const result = await apiRequest("/api/hubspot/queue-sync", {
        method: "POST",
        body: JSON.stringify({ 
          quoteId, 
          action: options?.action || "auto" 
        }),
      });

      return {
        success: true,
        quoteId,
        externalQuoteId: result.hubspotQuoteId,
        externalDealId: result.hubspotDealId,
        jobId: result.jobId,
        queued: result.queued,
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

  async checkSyncStatus(jobId: string) {
    try {
      const result = await apiRequest(`/api/hubspot/sync-jobs/${jobId}`, {
        method: "GET",
      });

      return {
        status: result.status,
        result: result.result
          ? {
              success: true,
              quoteId: result.result.quoteId,
              externalQuoteId: result.result.hubspotQuoteId,
              externalDealId: result.result.hubspotDealId,
            }
          : undefined,
        error: result.error,
      };
    } catch (error: any) {
      return {
        status: "failed" as const,
        error: error?.message || "Failed to check sync status",
      };
    }
  }
}

/**
 * Singleton instance
 */
export const hubspotProvider = new HubSpotQuoteProvider();
