import { Queue } from "bullmq";
import { logger } from "./logger";
import { cache, CachePrefix } from "./cache";

const hubspotLogger = logger.child({ module: "hubspot-background-jobs" });

let hubspotQueue: Queue | null = null;

export interface HubSpotSyncJob {
  type: "full-sync" | "incremental-sync" | "contact-enrichment" | "deal-sync";
  userId?: number;
  contactId?: string;
  dealId?: string;
  lastSyncTime?: string;
  priority?: number;
}

export async function initializeHubSpotQueue(): Promise<void> {
  if (!process.env.REDIS_URL) {
    hubspotLogger.info(
      "No REDIS_URL found, skipping HubSpot queue initialization",
    );
    return;
  }

  try {
    const { getRedisAsync } = await import("./redis.js");
    const redisConfig = await getRedisAsync();

    if (!redisConfig?.queueRedis) {
      hubspotLogger.warn("Redis queue not available for HubSpot queue");
      return;
    }

    hubspotQueue = new Queue("hubspot-sync", {
      connection: redisConfig.queueRedis,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 20,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 10000, // Start with 10 seconds
        },
        priority: 50, // Default priority
      },
    });

    hubspotLogger.info("✅ HubSpot background job queue initialized");
  } catch (error) {
    hubspotLogger.error({ error }, "❌ Failed to initialize HubSpot queue");
  }
}

export function getHubSpotQueue(): Queue | null {
  return hubspotQueue;
}

/**
 * Schedule a full HubSpot data synchronization
 */
export async function scheduleFullSync(
  userId?: number,
): Promise<string | null> {
  if (!hubspotQueue) {
    hubspotLogger.warn("HubSpot queue not available for full sync");
    return null;
  }

  try {
    const job = await hubspotQueue.add(
      "full-sync",
      {
        type: "full-sync",
        userId,
        timestamp: new Date().toISOString(),
      },
      {
        priority: 10, // High priority for full sync
        delay: 0,
      },
    );

    hubspotLogger.info(
      { jobId: job.id, userId },
      "Full HubSpot sync scheduled",
    );
    return job.id ? String(job.id) : null;
  } catch (error) {
    hubspotLogger.error({ error, userId }, "Failed to schedule full sync");
    return null;
  }
}

/**
 * Schedule incremental sync to catch up recent changes
 */
export async function scheduleIncrementalSync(
  lastSyncTime?: string,
): Promise<string | null> {
  if (!hubspotQueue) {
    hubspotLogger.warn("HubSpot queue not available for incremental sync");
    return null;
  }

  try {
    const job = await hubspotQueue.add(
      "incremental-sync",
      {
        type: "incremental-sync",
        lastSyncTime:
          lastSyncTime || new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Default: 1 hour ago
        timestamp: new Date().toISOString(),
      },
      {
        priority: 30, // Medium priority
        delay: 0,
      },
    );

    hubspotLogger.info(
      { jobId: job.id, lastSyncTime },
      "Incremental HubSpot sync scheduled",
    );
    return job.id ? String(job.id) : null;
  } catch (error) {
    hubspotLogger.error(
      { error, lastSyncTime },
      "Failed to schedule incremental sync",
    );
    return null;
  }
}

/**
 * Schedule contact enrichment for a specific contact
 */
export async function scheduleContactEnrichment(
  contactId: string,
  userId?: number,
): Promise<string | null> {
  if (!hubspotQueue) {
    hubspotLogger.warn("HubSpot queue not available for contact enrichment");
    return null;
  }

  try {
    const job = await hubspotQueue.add(
      "contact-enrichment",
      {
        type: "contact-enrichment",
        contactId,
        userId,
        timestamp: new Date().toISOString(),
      },
      {
        priority: 40, // Medium-low priority
        delay: 2000, // Small delay to batch similar requests
      },
    );

    hubspotLogger.info(
      { jobId: job.id, contactId, userId },
      "Contact enrichment scheduled",
    );
    return job.id ? String(job.id) : null;
  } catch (error) {
    hubspotLogger.error(
      { error, contactId, userId },
      "Failed to schedule contact enrichment",
    );
    return null;
  }
}

/**
 * Schedule deal synchronization
 */
export async function scheduleDealSync(
  dealId?: string,
): Promise<string | null> {
  if (!hubspotQueue) {
    hubspotLogger.warn("HubSpot queue not available for deal sync");
    return null;
  }

  try {
    const job = await hubspotQueue.add(
      "deal-sync",
      {
        type: "deal-sync",
        dealId,
        timestamp: new Date().toISOString(),
      },
      {
        priority: 20, // High-medium priority
        delay: 1000,
      },
    );

    hubspotLogger.info({ jobId: job.id, dealId }, "Deal sync scheduled");
    return job.id ? String(job.id) : null;
  } catch (error) {
    hubspotLogger.error({ error, dealId }, "Failed to schedule deal sync");
    return null;
  }
}

/**
 * Schedule recurring HubSpot sync jobs
 */
export async function scheduleRecurringSync(): Promise<void> {
  if (!hubspotQueue) {
    hubspotLogger.warn("HubSpot queue not available for recurring sync");
    return;
  }

  try {
    // Schedule incremental sync every hour
    await hubspotQueue.add(
      "incremental-sync",
      {
        type: "incremental-sync",
        recurring: true,
        timestamp: new Date().toISOString(),
      },
      {
        repeat: { pattern: "0 * * * *" }, // Every hour
        priority: 30,
        jobId: "recurring-incremental-sync", // Prevent duplicates
      },
    );

    // Schedule full sync daily at 2 AM
    await hubspotQueue.add(
      "full-sync",
      {
        type: "full-sync",
        recurring: true,
        timestamp: new Date().toISOString(),
      },
      {
        repeat: { pattern: "0 2 * * *" }, // Daily at 2 AM
        priority: 10,
        jobId: "recurring-full-sync", // Prevent duplicates
      },
    );

    hubspotLogger.info("✅ Recurring HubSpot sync jobs scheduled");
  } catch (error) {
    hubspotLogger.error({ error }, "Failed to schedule recurring sync jobs");
  }
}

/**
 * Get HubSpot queue metrics
 */
export async function getHubSpotQueueMetrics() {
  if (!hubspotQueue) {
    return {
      status: "unavailable",
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };
  }

  try {
    const waiting = await hubspotQueue.getWaiting();
    const active = await hubspotQueue.getActive();
    const completed = await hubspotQueue.getCompleted();
    const failed = await hubspotQueue.getFailed();
    const delayed = await hubspotQueue.getDelayed();
    const paused = await hubspotQueue.isPaused();

    return {
      status: "operational",
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: paused ? 1 : 0,
    };
  } catch (error) {
    hubspotLogger.error({ error }, "Failed to get HubSpot queue metrics");
    return {
      status: "error",
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      error: (error as any)?.message,
    };
  }
}

/**
 * Clear completed and failed jobs to prevent memory buildup
 */
export async function cleanupHubSpotQueue(): Promise<void> {
  if (!hubspotQueue) {
    hubspotLogger.warn("HubSpot queue not available for cleanup");
    return;
  }

  try {
    await hubspotQueue.clean(24 * 60 * 60 * 1000, 100, "completed"); // Clean completed jobs older than 24 hours
    await hubspotQueue.clean(7 * 24 * 60 * 60 * 1000, 50, "failed"); // Clean failed jobs older than 7 days

    hubspotLogger.info("✅ HubSpot queue cleanup completed");
  } catch (error) {
    hubspotLogger.error({ error }, "Failed to cleanup HubSpot queue");
  }
}

// Utility function to check if HubSpot API is available
export async function checkHubSpotApiHealth(): Promise<boolean> {
  try {
    // Check if we have HubSpot token in cache or environment
    const cachedToken = await cache.get<string>("hubspot:api-token");
    const hasToken = cachedToken || process.env.HUBSPOT_ACCESS_TOKEN;

    if (!hasToken) {
      hubspotLogger.warn("No HubSpot API token available");
      return false;
    }

    // TODO: Add actual HubSpot API health check
    // For now, just return true if we have a token
    return true;
  } catch (error) {
    hubspotLogger.error({ error }, "HubSpot API health check failed");
    return false;
  }
}
