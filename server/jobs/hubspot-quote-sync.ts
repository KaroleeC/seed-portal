// HubSpot Quote Sync Background Jobs
import { Job } from 'bullmq';
import { logger } from '../logger';
import { storage } from '../storage';

const hubspotLogger = logger.child({ module: 'hubspot-quote-sync' });

export interface HubSpotQuoteSyncJobData {
  quoteId: number;
  action: 'create' | 'update';
  userId: number;
  retryCount?: number;
}

export interface HubSpotQuoteSyncResult {
  success: boolean;
  quoteId: number;
  dealId?: string;
  hubspotQuoteId?: string;
  error?: string;
}

export async function processHubSpotQuoteSync(job: Job<HubSpotQuoteSyncJobData>): Promise<HubSpotQuoteSyncResult> {
  const { quoteId, action, userId } = job.data;
  
  hubspotLogger.info({ 
    jobId: job.id, 
    quoteId, 
    action, 
    userId,
    attempt: job.attemptsMade + 1 
  }, `🔄 Processing HubSpot quote sync`);

  try {
    // Get the quote from database
    const quote = await storage.getQuote(quoteId);
    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }

    // Get user for HubSpot owner assignment
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    await job.updateProgress(50);

    // Use unified sync function for both create/update
    const { syncQuoteToHubSpot } = await import('../services/hubspot/sync.js');
    const unified = await syncQuoteToHubSpot(quoteId, action as any, user.email);

    await job.updateProgress(100);

    return {
      success: unified.success,
      quoteId,
      dealId: unified.hubspotDealId || undefined,
      hubspotQuoteId: unified.hubspotQuoteId || undefined,
    };

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error occurred';
    
    hubspotLogger.error({ 
      jobId: job.id,
      quoteId, 
      action,
      error: errorMessage,
      attempt: job.attemptsMade + 1,
      stack: error.stack
    }, '❌ HubSpot quote sync failed');

    // Return failure result
    return {
      success: false,
      quoteId,
      error: errorMessage
    };
  }
}