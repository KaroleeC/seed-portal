/**
 * In-Memory Job Queue
 *
 * Simple in-process job queue for HubSpot sync operations.
 * Provides immediate feedback to users while processing in background.
 *
 * Features:
 * - Immediate job enqueue with unique ID
 * - Background execution with error handling
 * - Job status tracking (pending, processing, succeeded, failed)
 * - Automatic cleanup of old jobs (24h retention)
 * - Graceful error handling and logging
 *
 * Upgradeable to Redis/BullMQ for production workloads.
 */

import { randomUUID } from "crypto";
import { hubspotLogger } from "../logger";
import { appendModuleLog } from "../logs-feed";

export type JobStatus = "pending" | "processing" | "succeeded" | "failed";

export interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  progress?: number;
}

export interface HubSpotSyncJobData {
  quoteId: number;
  action: "create" | "update" | "auto";
  actorEmail: string;
}

/**
 * In-memory job store
 * Maps jobId -> Job
 */
const jobs = new Map<string, Job>();

/**
 * Job retention period (24 hours)
 */
const JOB_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Cleanup interval (every hour)
 */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Start periodic cleanup of old jobs
 */
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, job] of jobs.entries()) {
      const age = now - job.createdAt.getTime();
      if (age > JOB_RETENTION_MS) {
        jobs.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      hubspotLogger.info({ cleaned }, "🧹 Cleaned up old jobs");
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow process to exit even if timer is active
  cleanupTimer.unref();
}

// Start cleanup on module load
startCleanup();

/**
 * Enqueue a new job
 * Returns immediately with jobId
 */
export function enqueueJob<T = any>(type: string, data: T): { jobId: string; job: Job<T> } {
  const jobId = randomUUID();

  const job: Job<T> = {
    id: jobId,
    type,
    data,
    status: "pending",
    createdAt: new Date(),
  };

  jobs.set(jobId, job);

  hubspotLogger.info({ jobId, type, data }, "📥 Job enqueued");

  appendModuleLog("hubspot-queue", "info", "Job enqueued", {
    jobId,
    type,
  });

  return { jobId, job };
}

/**
 * Get job status
 */
export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

/**
 * Get all jobs (for debugging)
 */
export function getAllJobs(): Job[] {
  return Array.from(jobs.values());
}

/**
 * Update job status
 */
function updateJobStatus(jobId: string, status: JobStatus, updates: Partial<Job> = {}): void {
  const job = jobs.get(jobId);
  if (!job) return;

  Object.assign(job, { status, ...updates });
  jobs.set(jobId, job);
}

/**
 * Execute a job in the background
 * Catches errors and updates job status
 */
export async function executeJob<T = any, R = any>(
  jobId: string,
  executor: (job: Job<T>) => Promise<R>
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    hubspotLogger.error({ jobId }, "❌ Job not found for execution");
    return;
  }

  // Mark as processing
  updateJobStatus(jobId, "processing", {
    startedAt: new Date(),
  });

  hubspotLogger.info({ jobId, type: job.type }, "⚙️ Job processing started");

  appendModuleLog("hubspot-queue", "info", "Job processing started", {
    jobId,
    type: job.type,
  });

  try {
    const result = await executor(job as Job<T>);

    updateJobStatus(jobId, "succeeded", {
      completedAt: new Date(),
      result,
      progress: 100,
    });

    const duration = Date.now() - job.createdAt.getTime();

    hubspotLogger.info({ jobId, type: job.type, duration }, "✅ Job succeeded");

    appendModuleLog("hubspot-queue", "info", "Job succeeded", {
      jobId,
      type: job.type,
      duration,
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);

    updateJobStatus(jobId, "failed", {
      completedAt: new Date(),
      error: errorMessage,
    });

    const duration = Date.now() - job.createdAt.getTime();

    hubspotLogger.error(
      { jobId, type: job.type, error: errorMessage, duration, stack: error?.stack },
      "❌ Job failed"
    );

    appendModuleLog("hubspot-queue", "error", "Job failed", {
      jobId,
      type: job.type,
      error: errorMessage,
      duration,
    });
  }
}

/**
 * Enqueue and execute a HubSpot sync job
 * Returns jobId immediately, processes in background
 */
export function enqueueHubSpotSync(
  quoteId: number,
  action: "create" | "update" | "auto",
  actorEmail: string
): string {
  const { jobId } = enqueueJob<HubSpotSyncJobData>("hubspot-sync", {
    quoteId,
    action,
    actorEmail,
  });

  // Execute in background (don't await)
  executeJob(jobId, async (job) => {
    const { syncQuoteToHubSpot } = await import("../services/hubspot/sync");
    const result = await syncQuoteToHubSpot(job.data.quoteId, job.data.action, job.data.actorEmail);
    return result;
  }).catch((err) => {
    // Already handled in executeJob, but catch to prevent unhandled rejection
    hubspotLogger.error({ jobId, error: err?.message }, "Unhandled job execution error");
  });

  return jobId;
}

/**
 * Shutdown cleanup
 */
export function shutdown(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  const allJobs = Array.from(jobs.values());

  return {
    total: allJobs.length,
    pending: allJobs.filter((j) => j.status === "pending").length,
    processing: allJobs.filter((j) => j.status === "processing").length,
    succeeded: allJobs.filter((j) => j.status === "succeeded").length,
    failed: allJobs.filter((j) => j.status === "failed").length,
  };
}
