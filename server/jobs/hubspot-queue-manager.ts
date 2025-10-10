// HubSpot Queue Manager for reliable background syncing
import { Queue, Worker, Job } from "bullmq";
import { getRedisAsync } from "../redis";
import {
  processHubSpotQuoteSync,
  type HubSpotQuoteSyncJobData,
  type HubSpotQuoteSyncResult,
} from "./hubspot-quote-sync";
import { logger } from "../logger";
import { sendSlackMessage } from "../slack";

const queueLogger = logger.child({ module: "hubspot-queue" });

let hubspotQueue: Queue<HubSpotQuoteSyncJobData> | null = null;
let hubspotWorker: Worker<HubSpotQuoteSyncJobData, HubSpotQuoteSyncResult> | null = null;

// Initialize HubSpot sync queue and worker
export async function initializeHubSpotQueue() {
  try {
    // Wait for Redis to be available
    const redis = await getRedisAsync();
    if (!redis) {
      queueLogger.warn("Redis not available, HubSpot queue will use fallback direct sync");
      return null;
    }

    queueLogger.info("Initializing HubSpot quote sync queue...");

    // Create dedicated Redis connection for BullMQ jobs
    const jobRedis = redis.queueRedis || redis.sessionRedis;
    if (!jobRedis) {
      queueLogger.warn("No Redis connection available for BullMQ");
      return null;
    }

    // Create HubSpot sync queue
    hubspotQueue = new Queue<HubSpotQuoteSyncJobData>("hubspot-quote-sync", {
      connection: jobRedis,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs for auditing
        removeOnFail: 50, // Keep last 50 failed jobs for debugging
        delay: 0,
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: "exponential",
          delay: 5000, // Start with 5 second delay, then exponential backoff
        },
      },
    });

    // Create HubSpot sync worker
    hubspotWorker = new Worker<HubSpotQuoteSyncJobData, HubSpotQuoteSyncResult>(
      "hubspot-quote-sync",
      processHubSpotQuoteSync,
      {
        connection: jobRedis.duplicate(), // Each worker needs its own connection
        concurrency: 3, // Process up to 3 HubSpot sync jobs simultaneously
        limiter: {
          max: 10, // Maximum 10 jobs per minute to respect HubSpot rate limits
          duration: 60 * 1000,
        },
      }
    );

    // Worker event handlers
    hubspotWorker.on(
      "completed",
      (job: Job<HubSpotQuoteSyncJobData>, result: HubSpotQuoteSyncResult) => {
        queueLogger.info(
          {
            jobId: job.id,
            quoteId: result.quoteId,
            dealId: result.dealId,
            hubspotQuoteId: result.hubspotQuoteId,
          },
          "✅ HubSpot quote sync completed successfully"
        );
      }
    );

    hubspotWorker.on(
      "failed",
      async (job: Job<HubSpotQuoteSyncJobData> | undefined, err: Error) => {
        if (!job) return;

        queueLogger.error(
          {
            jobId: job.id,
            quoteId: job.data.quoteId,
            action: job.data.action,
            error: err.message,
            attempts: job.attemptsMade,
          },
          "❌ HubSpot quote sync failed"
        );

        // Send Slack alert for final failures
        if (job.attemptsMade >= 3) {
          try {
            await sendSlackMessage({
              channel: process.env.SLACK_CHANNEL_ID || "#dev-alerts",
              text: `🚨 HubSpot Quote Sync Failed (Final Attempt)`,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text:
                      `*HubSpot Quote Sync Failed*\n\n` +
                      `• Quote ID: ${job.data.quoteId}\n` +
                      `• Action: ${job.data.action}\n` +
                      `• Error: ${err.message}\n` +
                      `• Attempts: ${job.attemptsMade}/3\n` +
                      `• Time: ${new Date().toISOString()}\n\n` +
                      `_Quote is safely saved in database. Admin can retry sync manually._`,
                  },
                },
              ],
            });
          } catch (slackError) {
            queueLogger.error(
              { error: slackError },
              "Failed to send Slack notification for HubSpot sync failure"
            );
          }
        }
      }
    );

    hubspotWorker.on("stalled", (jobId: string) => {
      queueLogger.warn({ jobId }, "⚠️ HubSpot quote sync job stalled");
    });

    queueLogger.info("✅ HubSpot quote sync queue initialized successfully");
    return { hubspotQueue, hubspotWorker };
  } catch (error) {
    queueLogger.error({ error }, "❌ Failed to initialize HubSpot queue");
    return null;
  }
}

// Schedule a quote sync job
export async function scheduleQuoteSync(
  quoteId: number,
  action: "create" | "update",
  userId: number,
  priority: number = 1
) {
  try {
    if (!hubspotQueue) {
      throw new Error("HubSpot queue not initialized");
    }

    const job = await hubspotQueue.add(
      "sync-quote",
      {
        quoteId,
        action,
        userId,
      },
      {
        priority, // Higher priority numbers processed first
        delay: 1000, // 1 second delay to allow database transaction to complete
      }
    );

    queueLogger.info(
      {
        jobId: job.id,
        quoteId,
        action,
        userId,
        priority,
      },
      `📋 Scheduled HubSpot quote sync job`
    );

    return job;
  } catch (error) {
    queueLogger.error(
      { error, quoteId, action, userId },
      "❌ Failed to schedule HubSpot quote sync"
    );
    throw error;
  }
}

// Get queue status for admin dashboard
export async function getQueueStatus() {
  try {
    if (!hubspotQueue) {
      return {
        available: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      hubspotQueue.getWaiting(),
      hubspotQueue.getActive(),
      hubspotQueue.getCompleted(),
      hubspotQueue.getFailed(),
    ]);

    return {
      available: true,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  } catch (error) {
    queueLogger.error({ error }, "Failed to get queue status");
    return {
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Retry failed job manually (for admin interface)
export async function retryFailedJob(jobId: string) {
  try {
    if (!hubspotQueue) {
      throw new Error("HubSpot queue not initialized");
    }

    const job = await Job.fromId(hubspotQueue, jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.retry();
    queueLogger.info({ jobId }, "🔄 Manually retried failed HubSpot sync job");

    return { success: true };
  } catch (error) {
    queueLogger.error({ error, jobId }, "❌ Failed to retry job");
    throw error;
  }
}

export { hubspotQueue, hubspotWorker };
