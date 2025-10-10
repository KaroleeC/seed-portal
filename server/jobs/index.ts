import type { Job } from "bullmq";
import { Queue, Worker } from "bullmq";
import { getRedisAsync } from "../redis";
import { workspaceSyncJob, type WorkspaceSyncJobData } from "./workspace-sync";

let workspaceQueue: Queue | null = null;
let workspaceWorker: Worker | null = null;

// Initialize job system asynchronously
async function initializeJobSystem() {
  try {
    // Wait for Redis to be available
    const redis = await getRedisAsync();
    if (!redis) {
      console.log("[Jobs] Redis not available, skipping job system initialization");
      return;
    }

    console.log("[Jobs] Initializing workspace sync job system...");

    // Create dedicated Redis connection for BullMQ jobs using queueRedis
    const jobRedis = redis.queueRedis.duplicate();
    await jobRedis.ping(); // Test connection

    // Job queues
    workspaceQueue = new Queue("workspace-sync", {
      connection: jobRedis,
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 20, // Keep last 20 failed jobs
        delay: 0,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    // Job processors
    workspaceWorker = new Worker(
      "workspace-sync",
      async (job: Job<WorkspaceSyncJobData>) => {
        return await workspaceSyncJob(job);
      },
      {
        connection: jobRedis.duplicate(), // Each worker needs its own connection
        concurrency: 1, // Process one sync job at a time
      }
    );

    console.log("[Jobs] Workspace sync job system initialized");

    return { workspaceQueue, workspaceWorker };
  } catch (error) {
    console.error("[Jobs] Failed to initialize job system:", error);
    return null;
  }
}

// Utility functions for scheduling jobs
export async function scheduleWorkspaceSync(
  triggeredBy: "cron" | "manual" = "manual",
  userId?: number
) {
  try {
    if (!workspaceQueue) {
      throw new Error("Workspace sync job system not initialized");
    }

    const job = await workspaceQueue.add(
      "sync-workspace-users",
      {
        triggeredBy,
        userId,
      },
      {
        priority: triggeredBy === "manual" ? 1 : 10, // Higher priority for manual triggers
      }
    );

    console.log(`[Jobs] Scheduled workspace sync job ${job.id} (${triggeredBy})`);
    return job;
  } catch (error) {
    console.error("[Jobs] Failed to schedule workspace sync:", error);
    throw error;
  }
}

// Set up daily cron job at 2 AM
export async function setupCronJobs() {
  try {
    if (!workspaceQueue) {
      console.log("[Jobs] Workspace queue not available, skipping cron job setup");
      return;
    }

    // Remove existing repeatable jobs
    const repeatableJobs = await workspaceQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await workspaceQueue.removeRepeatableByKey(job.key);
    }

    // Schedule nightly sync at 2 AM UTC
    await workspaceQueue.add(
      "sync-workspace-users",
      {
        triggeredBy: "cron",
      },
      {
        repeat: {
          pattern: "0 2 * * *", // Every day at 2 AM UTC
        },
        jobId: "nightly-workspace-sync", // Unique ID to prevent duplicates
      }
    );

    console.log("[Jobs] Nightly workspace sync scheduled for 2 AM UTC");
  } catch (error) {
    console.error("[Jobs] Failed to setup cron jobs:", error);
  }
}

// Clean shutdown
export async function shutdownJobs() {
  try {
    if (workspaceWorker) {
      await workspaceWorker.close();
    }
    if (workspaceQueue) {
      await workspaceQueue.close();
    }
    console.log("[Jobs] Job workers and queues closed");
  } catch (error) {
    console.error("[Jobs] Error during job shutdown:", error);
  }
}

// Initialize job system when module loads
initializeJobSystem()
  .then((result) => {
    if (result) {
      const { workspaceWorker: worker } = result;

      // Set up error handling
      if (worker) {
        worker.on("completed", (job) => {
          console.log(`[Jobs] Workspace sync job ${job.id} completed successfully`);
        });

        worker.on("failed", (job, err) => {
          console.error(`[Jobs] Workspace sync job ${job?.id} failed:`, err);
        });

        worker.on("error", (err) => {
          console.error("[Jobs] Workspace worker error:", err);
        });
      }

      // Set up cron jobs
      setupCronJobs().catch(console.error);
    }
  })
  .catch(console.error);
