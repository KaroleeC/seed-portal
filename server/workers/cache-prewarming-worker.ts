// Cache Pre-warming Worker
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import {
  preWarmHighPriorityContacts,
  preWarmDashboardMetrics,
} from "../cache-prewarming";
import { logger } from "../logger";

const workerLogger = logger.child({ module: "cache-prewarming-worker" });

let workerRedis: Redis | null = null;
let preWarmWorker: Worker | null = null;

async function initializeWorkerRedis(): Promise<void> {
  if (!process.env.REDIS_URL) {
    workerLogger.info(
      "No REDIS_URL found, skipping pre-warm worker initialization",
    );
    return;
  }

  try {
    workerRedis = new Redis(
      process.env.REDIS_URL as string,
      {
        maxRetriesPerRequest: null as any,
        enableReadyCheck: true,
        lazyConnect: false,
        connectTimeout: 15000,
      } as any,
    );

    await workerRedis.ping();
    workerLogger.info(
      "✅ Worker Redis connection established for cache pre-warming",
    );
  } catch (error) {
    workerLogger.error(
      { error },
      "❌ Failed to connect worker Redis for cache pre-warming",
    );
    workerRedis = null;
  }
}

export async function initializePreWarmWorker(): Promise<void> {
  await initializeWorkerRedis();

  if (!workerRedis) {
    workerLogger.warn("Redis not available for cache pre-warming worker");
    return;
  }

  try {
    preWarmWorker = new Worker(
      "cache-prewarming",
      async (job: Job) => {
        const startTime = Date.now();

        try {
          workerLogger.info(
            { jobId: job.id, jobName: job.name },
            "Starting cache pre-warming job",
          );

          await job.updateProgress(10);

          if (job.name === "nightly-prewarm") {
            // Pre-warm dashboard metrics first (quick)
            await preWarmDashboardMetrics();
            await job.updateProgress(30);

            // Pre-warm high-priority contacts (takes longer)
            await preWarmHighPriorityContacts();
            await job.updateProgress(100);
          }

          const processingTime = Date.now() - startTime;
          workerLogger.info(
            {
              jobId: job.id,
              processingTime: `${processingTime}ms`,
            },
            "✅ Cache pre-warming job completed",
          );

          return {
            success: true,
            processingTime,
            completedAt: new Date().toISOString(),
          };
        } catch (error) {
          const processingTime = Date.now() - startTime;
          workerLogger.error(
            {
              error,
              jobId: job.id,
              processingTime: `${processingTime}ms`,
            },
            "❌ Cache pre-warming job failed",
          );

          throw error;
        }
      },
      {
        connection: workerRedis,
        concurrency: 1, // Only one pre-warming job at a time
      },
    );

    workerLogger.info("✅ Cache pre-warming worker initialized");
  } catch (error) {
    workerLogger.error(
      { error },
      "❌ Failed to initialize cache pre-warming worker",
    );
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  workerLogger.info("SIGTERM received, closing cache pre-warming worker...");
  if (preWarmWorker) {
    await preWarmWorker.close();
  }
  if (workerRedis) {
    await workerRedis.quit();
  }
});

process.on("SIGINT", async () => {
  workerLogger.info("SIGINT received, closing cache pre-warming worker...");
  if (preWarmWorker) {
    await preWarmWorker.close();
  }
  if (workerRedis) {
    await workerRedis.quit();
  }
  process.exit(0);
});
