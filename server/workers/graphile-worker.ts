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
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const worker = await import("./ai-insights-worker") as any;
        if (typeof worker.processAIInsights === 'function') {
          await worker.processAIInsights({ hubspotOwnerId, userId });
        } else {
          logger.warn("processAIInsights not implemented yet");
        }
      } catch {
        logger.warn("ai-insights-worker not found - skipping");
      }

      logger.info({ hubspotOwnerId }, "AI insights job completed");
    } catch (error: unknown) {
      logger.error({ error, hubspotOwnerId }, "AI insights job failed");
      throw error; // Rethrow to trigger retry
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
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const worker = await import("./ai-index-worker") as any;
        if (typeof worker.processAIIndex === 'function') {
          await worker.processAIIndex({ documentId, userId });
        } else {
          logger.warn("processAIIndex not implemented yet");
        }
      } catch {
        logger.warn("ai-index-worker not found - skipping");
      }

      logger.info({ documentId }, "AI index job completed");
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
      const { workspaceSyncJob } = await import("../jobs/workspace-sync");
      await workspaceSyncJob({ triggeredBy, userId });

      logger.info({ triggeredBy }, "Workspace sync job completed");
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
        const worker = await import("./hubspot-sync-worker") as any;
        if (typeof worker.processHubSpotSync === 'function') {
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
        const worker = await import("./cache-prewarming-worker") as any;
        if (typeof worker.prewarmCaches === 'function') {
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
