#!/usr/bin/env tsx
/**
 * Dedicated BullMQ Worker Process
 * Runs background jobs separate from the web server
 */

import { Worker, Job } from "bullmq";
import { getRedisAsync } from "./server/redis";
import {
  workspaceSyncJob,
  type WorkspaceSyncJobData,
} from "./server/jobs/workspace-sync";
import { logger } from "./server/logger";

// Workers registry
const workers: Worker[] = [];

async function initializeWorkers() {
  try {
    // Wait for Redis to be available
    const redis = await getRedisAsync();
    if (!redis) {
      logger.error("[Worker] Redis not available, cannot start workers");
      process.exit(1);
    }

    logger.info("[Worker] Initializing BullMQ workers...");

    // Clone Redis connection for workers
    const jobRedis = redis.duplicate();

    // Workspace Sync Worker
    const workspaceWorker = new Worker(
      "workspace-sync",
      async (job: Job<WorkspaceSyncJobData>) => {
        return await workspaceSyncJob(job);
      },
      {
        connection: jobRedis.duplicate(),
        concurrency: 1, // Process one sync job at a time
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );

    // Error handling
    workspaceWorker.on("completed", (job) => {
      logger.info(
        `[Worker] Workspace sync job ${job.id} completed successfully`,
      );
    });

    workspaceWorker.on("failed", (job, err) => {
      logger.error(`[Worker] Workspace sync job ${job?.id} failed:`, err);
    });

    workspaceWorker.on("error", (err) => {
      logger.error("[Worker] Workspace worker error:", err);
    });

    workers.push(workspaceWorker);

    logger.info("[Worker] All workers initialized successfully");

    // Graceful shutdown handling
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("[Worker] Failed to initialize workers:", error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.info("[Worker] Received shutdown signal, closing workers...");

  for (const worker of workers) {
    try {
      await worker.close();
      logger.info(`[Worker] Worker ${worker.name} closed successfully`);
    } catch (error) {
      logger.error(`[Worker] Error closing worker ${worker.name}:`, error);
    }
  }

  logger.info("[Worker] All workers closed, exiting process");
  process.exit(0);
}

// Start the worker process
initializeWorkers().catch((error) => {
  logger.error("[Worker] Fatal error during worker initialization:", error);
  process.exit(1);
});
