import { Worker } from "bullmq";
import Redis from "ioredis";
import type { AIIndexJobData } from "../queue";
import { indexFiles } from "../ai/retrieval/indexer";
import { logger } from "../logger";

let worker: Worker | null = null;

export async function startAIIndexWorker(): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log("[AIIndexWorker] No REDIS_URL, skipping worker");
    return;
  }

  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  worker = new Worker<AIIndexJobData>(
    "ai-index",
    async (job) => {
      const { fileIds, userId } = job.data;
      logger.info(`[AIIndexWorker] Indexing ${fileIds.length} files for user ${userId}`);

      const startTime = Date.now();
      const docIds = await indexFiles(fileIds);
      const duration = Date.now() - startTime;

      logger.info(
        `[AIIndexWorker] Indexed ${docIds.length}/${fileIds.length} files in ${duration}ms`
      );

      return { docIds, duration };
    },
    {
      connection,
      concurrency: 2, // Process 2 indexing jobs in parallel
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 60000, // per minute (rate limit to avoid OpenAI quota issues)
      },
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[AIIndexWorker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[AIIndexWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log("[AIIndexWorker] ✅ Worker started");
}

export async function stopAIIndexWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log("[AIIndexWorker] Worker stopped");
  }
}
