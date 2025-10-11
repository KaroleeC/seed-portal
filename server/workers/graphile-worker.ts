/**
 * Graphile Worker Setup
 *
 * Postgres-backed job queue using graphile-worker.
 * Replaces BullMQ/Redis for simpler infrastructure.
 */

import { run } from "graphile-worker";
import type { Runner, TaskList } from "graphile-worker";
import { logger } from "../logger";

let workerRunner: Runner | null = null;

/**
 * Job Task Definitions
 * Each task is a function that processes a specific job type
 */
const tasks: TaskList = {
  /**
   * AI Insights Job
   * Generates AI insights for HubSpot data
   */
  "ai-insights": async (payload: unknown) => {
    const { hubspotOwnerId, userId } = payload as {
      hubspotOwnerId?: string;
      userId?: number;
    };

    logger.info({ hubspotOwnerId, userId }, "Processing AI insights job");

    try {
      // Import worker logic (if exists)
      // TODO: Implement AI insights worker
      logger.warn("ai-insights-worker not implemented yet - job queued but not processed");

      logger.info({ hubspotOwnerId }, "AI insights job completed (stub)");
    } catch (error: unknown) {
      logger.error({ error, hubspotOwnerId }, "AI insights job failed");
      throw error; // Rethrow to trigger retry
    }
  },

  /**
   * HubSpot Quote Sync Job
   * Queues a quote sync to HubSpot (create/update/auto)
   */
  "hubspot-quote-sync": async (payload: unknown) => {
    const { quoteId, action, actorEmail } = payload as {
      quoteId: number;
      action?: "auto" | "create" | "update";
      actorEmail?: string;
    };

    logger.info({ quoteId, action, actorEmail }, "Processing HubSpot quote sync job");

    try {
      const { syncQuoteToHubSpot } = await import("../services/hubspot/sync.js");
      const result = await syncQuoteToHubSpot(
        quoteId,
        action || "auto",
        actorEmail || "system@seedfinancial.io"
      );

      if (!result?.success) {
        throw new Error(result?.error || "HubSpot quote sync failed");
      }

      logger.info({ quoteId, action }, "HubSpot quote sync job completed");
    } catch (error: unknown) {
      logger.error({ error, quoteId, action }, "HubSpot quote sync job failed");
      throw error;
    }
  },

  /**
   * AI Index Job
   * Indexes documents for AI search
   */
  "ai-index": async (payload: unknown) => {
    const { documentId, userId } = payload as {
      documentId: string;
      userId: number;
    };

    logger.info({ documentId, userId }, "Processing AI index job");

    try {
      // Import worker logic (if exists)
      // TODO: Implement AI index worker
      logger.warn("ai-index-worker not implemented yet - job queued but not processed");

      logger.info({ documentId }, "AI index job completed (stub)");
    } catch (error: unknown) {
      logger.error({ error, documentId }, "AI index job failed");
      throw error;
    }
  },

  /**
   * Workspace Sync Job
   * Syncs workspace users and data
   */
  "workspace-sync": async (payload: unknown) => {
    const { triggeredBy, userId } = payload as {
      triggeredBy: "cron" | "manual";
      userId?: number;
    };

    logger.info({ triggeredBy, userId }, "Processing workspace sync job");

    try {
      // TODO: Implement workspace sync job
      logger.warn("workspace-sync not implemented yet - job queued but not processed");

      logger.info({ triggeredBy }, "Workspace sync job completed (stub)");
    } catch (error: unknown) {
      logger.error({ error, triggeredBy }, "Workspace sync job failed");
      throw error;
    }
  },

  /**
   * HubSpot Sync Job
   * Syncs data with HubSpot
   */
  "hubspot-sync": async (payload: unknown) => {
    const { dealId, userId } = payload as {
      dealId?: string;
      userId?: number;
    };

    logger.info({ dealId, userId }, "Processing HubSpot sync job");

    try {
      // Import worker logic (if exists)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const worker = (await import("./hubspot-sync-worker")) as any;
        if (typeof worker.processHubSpotSync === "function") {
          await worker.processHubSpotSync({ dealId, userId });
        } else {
          logger.warn("processHubSpotSync not implemented yet");
        }
      } catch {
        logger.warn("hubspot-sync-worker not found - skipping");
      }

      logger.info({ dealId }, "HubSpot sync job completed");
    } catch (error: unknown) {
      logger.error({ error, dealId }, "HubSpot sync job failed");
      throw error;
    }
  },

  /**
   * Cache Prewarming Job
   * Prewarms caches for better performance
   */
  "cache-prewarming": async () => {
    logger.info("Processing cache prewarming job");

    try {
      // Import worker logic (if exists)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const worker = (await import("./cache-prewarming-worker")) as any;
        if (typeof worker.prewarmCaches === "function") {
          await worker.prewarmCaches();
        } else {
          logger.warn("prewarmCaches not implemented yet");
        }
      } catch {
        logger.warn("cache-prewarming-worker not found - skipping");
      }

      logger.info("Cache prewarming job completed");
    } catch (error: unknown) {
      logger.error({ error }, "Cache prewarming job failed");
      throw error;
    }
  },

  /**
   * Email Sync Job
   * Syncs Gmail messages to local database
   * Supports both full and incremental sync
   */
  "email-sync": async (payload: unknown) => {
    const { accountId, forceFullSync } = payload as {
      accountId: string;
      forceFullSync?: boolean;
    };

    logger.info({ accountId, forceFullSync }, "Processing email sync job");

    try {
      const { syncEmailAccount } = await import("../services/email-sync.service");
      const result = await syncEmailAccount(accountId, { forceFullSync });

      if (!result.success) {
        throw new Error(result.error || "Email sync failed");
      }

      logger.info(
        {
          accountId,
          syncType: result.syncType,
          threadsProcessed: result.threadsProcessed,
          messagesProcessed: result.messagesProcessed,
          duration: result.duration,
        },
        "Email sync job completed"
      );

      // Broadcast SSE event to connected clients
      try {
        const { sseEvents } = await import("../services/sse-events");
        sseEvents.broadcastSyncCompleted(accountId, {
          syncType: result.syncType,
          threadsProcessed: result.threadsProcessed,
          messagesProcessed: result.messagesProcessed,
          duration: result.duration,
        });
      } catch (sseError) {
        // Non-fatal - SSE broadcast failure shouldn't fail the job
        logger.warn({ error: sseError, accountId }, "Failed to broadcast SSE event");
      }
    } catch (error: unknown) {
      logger.error({ error, accountId }, "Email sync job failed");
      throw error;
    }
  },

  /**
   * Email Auto-Retry Job
   * Automatically retries failed email sends based on nextRetryAt timestamp
   * Runs periodically to process failed sends ready for retry
   */
  "email-auto-retry": async (payload: unknown, helpers) => {
    logger.info("Processing email auto-retry job");

    try {
      const { emailAutoRetry } = await import("./tasks/email-auto-retry");
      await emailAutoRetry(payload, helpers);

      logger.info("Email auto-retry job completed");
    } catch (error: unknown) {
      logger.error({ error }, "Email auto-retry job failed");
      throw error;
    }
  },

  /**
   * Email-Lead Auto-Link Job
   * Automatically links email threads to leads based on participant emails
   * Runs after email sync to link new threads
   */
  "email-lead-auto-link": async (payload: unknown) => {
    logger.info("Processing email-lead auto-link job");

    try {
      const { emailLeadAutoLinkTask } = await import("./tasks/email-lead-auto-link");
      await emailLeadAutoLinkTask(payload as any);

      logger.info("Email-lead auto-link job completed");
    } catch (error: unknown) {
      logger.error({ error }, "Email-lead auto-link job failed");
      throw error;
    }
  },
};

/**
 * Initialize Graphile Worker
 */
export async function initializeWorker(): Promise<Runner | null> {
  try {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      logger.warn("No DATABASE_URL found, skipping worker initialization");
      return null;
    }

    logger.info("Initializing Graphile Worker...");

    workerRunner = await run({
      connectionString,
      concurrency: 5, // Process up to 5 jobs concurrently
      pollInterval: 1000, // Check for new jobs every second
      taskList: tasks,

      // Error handling
      noHandleSignals: false, // Let graphile-worker handle SIGTERM/SIGINT

      // Job settings
      schema: "graphile_worker", // Default schema name
    });

    logger.info("✅ Graphile Worker initialized");

    // Set up scheduled jobs
    await setupScheduledJobs();

    // Schedule email syncs for all active accounts
    await scheduleAllEmailSyncs();

    return workerRunner;
  } catch (error: unknown) {
    logger.error({ error }, "❌ Failed to initialize Graphile Worker");
    return null;
  }
}

/**
 * Set up scheduled/cron jobs
 */
async function setupScheduledJobs() {
  if (!workerRunner) return;

  try {
    // Nightly workspace sync at 2 AM UTC
    await workerRunner.addJob(
      "workspace-sync",
      { triggeredBy: "cron" },
      {
        jobKey: "nightly-workspace-sync",
        runAt: getNextRunAt(2, 0), // 2 AM UTC
        maxAttempts: 3,
      }
    );

    // Daily cache prewarming at 1 AM UTC
    await workerRunner.addJob(
      "cache-prewarming",
      {},
      {
        jobKey: "nightly-cache-prewarming",
        runAt: getNextRunAt(1, 0), // 1 AM UTC
        maxAttempts: 2,
      }
    );

    logger.info("✅ Scheduled jobs configured");
  } catch (error: unknown) {
    logger.error({ error }, "Failed to setup scheduled jobs");
  }
}

/**
 * Helper to calculate next run time
 */
function getNextRunAt(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(hour, minute, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

/**
 * Queue a job
 */
export async function queueJob<T = unknown>(
  taskName: string,
  payload: T,
  options?: {
    runAt?: Date;
    maxAttempts?: number;
    priority?: number;
    jobKey?: string;
  }
): Promise<void> {
  if (!workerRunner) {
    logger.warn({ taskName }, "Worker not initialized, job not queued");
    return;
  }

  try {
    await workerRunner.addJob(taskName, payload, options);
    logger.info({ taskName, payload }, "Job queued successfully");
  } catch (error: unknown) {
    logger.error({ error, taskName }, "Failed to queue job");
    throw error;
  }
}

/**
 * Shutdown worker gracefully
 */
export async function shutdownWorker(): Promise<void> {
  if (workerRunner) {
    logger.info("Shutting down Graphile Worker...");
    await workerRunner.stop();
    workerRunner = null;
    logger.info("✅ Graphile Worker shut down");
  }
}

/**
 * Get worker runner (for advanced usage)
 */
export function getWorkerRunner(): Runner | null {
  return workerRunner;
}

/**
 * Schedule periodic email sync for an account
 * Intelligently schedules based on account activity
 */
export async function scheduleEmailSync(
  accountId: string,
  options: {
    /** Interval in minutes (default: 5 for active, 15 for inactive) */
    intervalMinutes?: number;
    /** Force full sync instead of incremental */
    forceFullSync?: boolean;
  } = {}
): Promise<void> {
  if (!workerRunner) {
    logger.warn({ accountId }, "Worker not initialized, email sync not scheduled");
    return;
  }

  const intervalMinutes = options.intervalMinutes || 5;
  const runAt = new Date(Date.now() + intervalMinutes * 60 * 1000);

  try {
    await workerRunner.addJob(
      "email-sync",
      { accountId, forceFullSync: options.forceFullSync },
      {
        jobKey: `email-sync-${accountId}`,
        runAt,
        maxAttempts: 3,
      }
    );

    logger.info({ accountId, runAt: runAt.toISOString(), intervalMinutes }, "Email sync scheduled");
  } catch (error: unknown) {
    logger.error({ error, accountId }, "Failed to schedule email sync");
    throw error;
  }
}

/**
 * Schedule periodic email sync for all active accounts
 * Called on worker startup
 */
export async function scheduleAllEmailSyncs(): Promise<void> {
  if (!workerRunner) {
    logger.warn("Worker not initialized, skipping email sync scheduling");
    return;
  }

  try {
    const { db } = await import("../db");
    const { emailAccounts } = await import("../../shared/email-schema");

    // Get all active accounts
    const accounts = await db
      .select({ id: emailAccounts.id, email: emailAccounts.email })
      .from(emailAccounts)
      .where(emailAccounts.syncEnabled);

    logger.info({ accountCount: accounts.length }, "Scheduling email syncs for active accounts");

    for (const account of accounts) {
      // Stagger initial syncs to avoid API rate limits
      const staggerMinutes = Math.floor(Math.random() * 5);
      await scheduleEmailSync(account.id, { intervalMinutes: staggerMinutes || 1 });
    }

    logger.info({ accountCount: accounts.length }, "✅ Email syncs scheduled for all accounts");
  } catch (error: unknown) {
    logger.error({ error }, "Failed to schedule email syncs");
  }
}
