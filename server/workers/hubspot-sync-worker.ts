import { Worker, Job } from 'bullmq';
import { logger } from '../logger';
import { cache, CachePrefix, CacheTTL } from '../cache';
import { sendSlackMessage } from '../slack';
import { HubSpotSyncJob } from '../hubspot-background-jobs';

const hubspotWorkerLogger = logger.child({ module: 'hubspot-sync-worker' });

let hubspotWorker: Worker | null = null;

export async function startHubSpotSyncWorker(): Promise<Worker | null> {
  if (!process.env.REDIS_URL) {
    hubspotWorkerLogger.info('No REDIS_URL found, skipping HubSpot sync worker');
    return null;
  }

  try {
    const { getRedisAsync } = await import('../redis.js');
    const redisConfig = await getRedisAsync();
    
    if (!redisConfig?.queueRedis) {
      hubspotWorkerLogger.warn('Redis queue not available for HubSpot sync worker');
      return null;
    }

    hubspotWorker = new Worker('hubspot-sync', processHubSpotJob, {
      connection: redisConfig.queueRedis,
      concurrency: 2, // Process up to 2 HubSpot jobs simultaneously
      limiter: {
        max: 5, // Maximum 5 jobs per minute
        duration: 60 * 1000,
      },
    });

    // Worker event handlers
    hubspotWorker.on('completed', (job) => {
      hubspotWorkerLogger.info({ jobId: job.id, data: job.data }, '✅ HubSpot sync job completed');
    });

    hubspotWorker.on('failed', async (job, err) => {
      const jobId = job?.id ?? 'unknown';
      const attempts = job?.attemptsMade ?? 0;
      hubspotWorkerLogger.error({ 
        jobId,
        data: job?.data,
        error: err.message,
        attempts
      }, '❌ HubSpot sync job failed');

      // Send Slack alert for critical failures
      if (attempts >= 3) {
        try {
          await sendSlackMessage({
            channel: process.env.SLACK_CHANNEL_ID,
            text: `🚨 HubSpot Sync Critical Failure`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*HubSpot Sync Job Failed (Final Attempt)*\n\n` +
                        `• Job Type: ${job?.data?.type || 'Unknown'}\n` +
                        `• Job ID: ${jobId}\n` +
                        `• Error: ${err.message}\n` +
                        `• Attempts: ${attempts}/3\n` +
                        `• Time: ${new Date().toISOString()}`
                }
              }
            ]
          });
        } catch (slackError) {
          hubspotWorkerLogger.error({ error: slackError }, 'Failed to send Slack notification for HubSpot job failure');
        }
      }
    });

    hubspotWorker.on('stalled', (jobId) => {
      hubspotWorkerLogger.warn({ jobId }, '⚠️ HubSpot sync job stalled');
    });

    hubspotWorkerLogger.info('✅ HubSpot sync worker started successfully');
    return hubspotWorker;
  } catch (error) {
    hubspotWorkerLogger.error({ error }, '❌ Failed to start HubSpot sync worker');
    return null;
  }
}

async function processHubSpotJob(job: Job<HubSpotSyncJob>): Promise<any> {
  const { type, contactId, dealId, userId, lastSyncTime } = job.data;
  
  hubspotWorkerLogger.info({ 
    jobId: job.id, 
    type, 
    contactId, 
    dealId, 
    userId 
  }, `🔄 Processing HubSpot sync job: ${type}`);

  try {
    switch (type) {
      case 'full-sync':
        return await performFullSync(job);
      
      case 'incremental-sync':
        return await performIncrementalSync(job, lastSyncTime);
      
      case 'contact-enrichment':
        return await performContactEnrichment(job, contactId!);
      
      case 'deal-sync':
        return await performDealSync(job, dealId);
      
      default:
        throw new Error(`Unknown HubSpot sync job type: ${type}`);
    }
  } catch (error) {
    hubspotWorkerLogger.error({ 
      jobId: job.id, 
      type, 
      error: (error as any)?.message 
    }, 'HubSpot sync job processing failed');
    throw error;
  }
}

async function performFullSync(job: Job<HubSpotSyncJob>): Promise<{ synced: number; updated: number }> {
  const startTime = Date.now();
  let synced = 0;
  let updated = 0;

  try {
    // Update job progress
    await job.updateProgress(10);

    // Simulate full sync process
    // In reality, this would:
    // 1. Fetch all contacts from HubSpot
    // 2. Fetch all deals from HubSpot
    // 3. Update local database
    // 4. Cache frequently accessed data

    hubspotWorkerLogger.info({ jobId: job.id }, 'Starting full HubSpot synchronization');

    // Mock implementation - replace with actual HubSpot API calls
    await job.updateProgress(30);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API calls

    // Cache the sync timestamp
    const fullSyncKey = cache.generateKey(CachePrefix.HUBSPOT_METRICS, 'last-full-sync');
    await cache.set(fullSyncKey, new Date().toISOString(), CacheTTL.ONE_DAY);
    
    await job.updateProgress(70);
    
    // Simulate more processing
    synced = 150; // Mock data
    updated = 45;
    
    await job.updateProgress(100);
    
    const duration = Date.now() - startTime;
    hubspotWorkerLogger.info({ 
      jobId: job.id, 
      synced, 
      updated, 
      duration 
    }, '✅ Full HubSpot sync completed');

    return { synced, updated };
  } catch (error) {
    hubspotWorkerLogger.error({ jobId: job.id, error }, 'Full sync failed');
    throw error;
  }
}

async function performIncrementalSync(job: Job<HubSpotSyncJob>, lastSyncTime?: string): Promise<{ synced: number; updated: number }> {
  const startTime = Date.now();
  let synced = 0;
  let updated = 0;

  try {
    await job.updateProgress(20);

    const incKey = cache.generateKey(CachePrefix.HUBSPOT_METRICS, 'last-incremental-sync');
    const cachedInc = await cache.get<string>(incKey);
    const syncFrom = lastSyncTime || cachedInc || new Date(Date.now() - 60 * 60 * 1000).toISOString(); // Default: 1 hour ago

    hubspotWorkerLogger.info({ 
      jobId: job.id, 
      syncFrom 
    }, 'Starting incremental HubSpot synchronization');

    // Mock implementation - replace with actual HubSpot API calls
    await job.updateProgress(60);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API calls

    // Cache the sync timestamp
    await cache.set(incKey, new Date().toISOString(), CacheTTL.ONE_DAY);
    
    await job.updateProgress(100);
    
    synced = 25; // Mock data
    updated = 8;
    
    const duration = Date.now() - startTime;
    hubspotWorkerLogger.info({ 
      jobId: job.id, 
      synced, 
      updated, 
      duration 
    }, '✅ Incremental HubSpot sync completed');

    return { synced, updated };
  } catch (error) {
    hubspotWorkerLogger.error({ jobId: job.id, error }, 'Incremental sync failed');
    throw error;
  }
}

async function performContactEnrichment(job: Job<HubSpotSyncJob>, contactId: string): Promise<{ enriched: boolean; properties: number }> {
  const startTime = Date.now();

  try {
    await job.updateProgress(25);

    hubspotWorkerLogger.info({ 
      jobId: job.id, 
      contactId 
    }, 'Starting contact enrichment');

    // Mock implementation - replace with actual HubSpot API calls
    await job.updateProgress(50);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API calls

    // Cache enriched contact data
    const enrichedData = {
      contactId,
      enrichedAt: new Date().toISOString(),
      properties: ['industry', 'company_size', 'last_activity']
    };
    
    const contactKey = cache.generateKey(CachePrefix.HUBSPOT_CONTACT, `contact-${contactId}`);
    await cache.set(contactKey, enrichedData, CacheTTL.ONE_HOUR);
    
    await job.updateProgress(100);
    
    const duration = Date.now() - startTime;
    hubspotWorkerLogger.info({ 
      jobId: job.id, 
      contactId, 
      duration 
    }, '✅ Contact enrichment completed');

    return { enriched: true, properties: 3 };
  } catch (error) {
    hubspotWorkerLogger.error({ jobId: job.id, contactId, error }, 'Contact enrichment failed');
    throw error;
  }
}

async function performDealSync(job: Job<HubSpotSyncJob>, dealId?: string): Promise<{ synced: number }> {
  const startTime = Date.now();

  try {
    await job.updateProgress(30);

    hubspotWorkerLogger.info({ 
      jobId: job.id, 
      dealId 
    }, 'Starting deal synchronization');

    // Mock implementation - replace with actual HubSpot API calls
    await job.updateProgress(70);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API calls

    let synced = 1;
    if (!dealId) {
      // Sync all recent deals
      synced = 12; // Mock data
    }
    
    await job.updateProgress(100);
    
    const duration = Date.now() - startTime;
    hubspotWorkerLogger.info({ 
      jobId: job.id, 
      dealId, 
      synced, 
      duration 
    }, '✅ Deal sync completed');

    return { synced };
  } catch (error) {
    hubspotWorkerLogger.error({ jobId: job.id, dealId, error }, 'Deal sync failed');
    throw error;
  }
}

export async function stopHubSpotSyncWorker(): Promise<void> {
  if (hubspotWorker) {
    hubspotWorkerLogger.info('Stopping HubSpot sync worker...');
    await hubspotWorker.close();
    hubspotWorker = null;
    hubspotWorkerLogger.info('✅ HubSpot sync worker stopped');
  }
}

export function getHubSpotWorker(): Worker | null {
  return hubspotWorker;
}