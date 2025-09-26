// BullMQ Queue and Worker setup
import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { sendJobFailureAlert } from "./slack";

// Redis connection for queues
let queueRedis: Redis | null = null;
let aiInsightsQueue: Queue | null = null;
let aiInsightsQueueEvents: QueueEvents | null = null;

export async function initializeQueue(): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log("[Queue] No REDIS_URL found, skipping queue initialization");
    return;
  }

  try {
    queueRedis = new Redis(
      process.env.REDIS_URL as string,
      {
        maxRetriesPerRequest: null as any, // Required for BullMQ
        enableReadyCheck: true,
        lazyConnect: false,
        connectTimeout: 15000,
      } as any,
    );

    await queueRedis.ping();
    console.log("[Queue] ✅ Redis connection established for queues");

    // Only create queues after Redis connection is established
    aiInsightsQueue = new Queue("ai-insights", {
      connection: queueRedis,
      defaultJobOptions: {
        removeOnComplete: { count: 10 }, // Keep last 10 completed jobs
        removeOnFail: { count: 25 }, // Keep last 25 failed jobs
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    // Queue Events for monitoring
    aiInsightsQueueEvents = new QueueEvents("ai-insights", {
      connection: queueRedis,
    });

    // Set up failure monitoring
    setupFailureMonitoring();

    console.log("[Queue] ✅ BullMQ queues initialized");
  } catch (error) {
    console.error("[Queue] ❌ Failed to connect to Redis:", error);
    queueRedis = null;
    aiInsightsQueue = null;
    aiInsightsQueueEvents = null;
  }
}

// Export function to get queue (only when ready)
export function getAIInsightsQueue(): Queue | null {
  return aiInsightsQueue;
}

export function getAIInsightsQueueEvents(): QueueEvents | null {
  return aiInsightsQueueEvents;
}

// Failure tracking for alerts
const failureTracking = {
  recentFailures: [] as Array<{
    timestamp: number;
    error: string;
    jobId: string;
  }>,
  lastAlertSent: 0,
};

// Job Types
export interface AIInsightsJobData {
  contactId: string;
  clientData: any;
  userId: number;
  timestamp: number;
}

export interface JobResult {
  painPoints: any[];
  upsellOpportunities: string[];
  riskScore: number;
  lastAnalyzed: string;
  signals: any[];
}

// Queue metrics
let queueMetrics = {
  jobsProcessed: 0,
  jobsFailed: 0,
  averageProcessingTime: 0,
  lastProcessedAt: null as Date | null,
};

export function getQueueMetrics() {
  return { ...queueMetrics };
}

export function updateQueueMetrics(processingTime?: number, failed = false) {
  if (failed) {
    queueMetrics.jobsFailed++;
  } else {
    queueMetrics.jobsProcessed++;
    if (processingTime) {
      queueMetrics.averageProcessingTime =
        (queueMetrics.averageProcessingTime * (queueMetrics.jobsProcessed - 1) +
          processingTime) /
        queueMetrics.jobsProcessed;
    }
  }
  queueMetrics.lastProcessedAt = new Date();
}

// Setup failure monitoring with Slack alerts
function setupFailureMonitoring(): void {
  if (!aiInsightsQueueEvents) return;

  aiInsightsQueueEvents.on("failed", async ({ jobId, failedReason, prev }) => {
    const now = Date.now();

    // Track this failure
    failureTracking.recentFailures.push({
      timestamp: now,
      error: failedReason || "Unknown error",
      jobId: jobId,
    });

    // Remove failures older than 5 minutes
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    failureTracking.recentFailures = failureTracking.recentFailures.filter(
      (f) => f.timestamp > fiveMinutesAgo,
    );

    // Check if we should send an alert (>3 failures in 5 minutes, max 1 alert per 10 minutes)
    const failureCount = failureTracking.recentFailures.length;
    const tenMinutesAgo = now - 10 * 60 * 1000;

    if (failureCount >= 3 && failureTracking.lastAlertSent < tenMinutesAgo) {
      try {
        const errors = failureTracking.recentFailures.map(
          (f) =>
            `${f.error.substring(0, 100)}${f.error.length > 100 ? "..." : ""}`,
        );

        await sendJobFailureAlert(
          "ai-insights",
          failureCount,
          "last 5 minutes",
          errors,
        );

        failureTracking.lastAlertSent = now;
        console.log(
          `[Queue] 🚨 Sent failure alert: ${failureCount} failures in 5 minutes`,
        );
      } catch (error) {
        console.error("[Queue] Failed to send failure alert:", error);
      }
    }

    // Update metrics
    updateQueueMetrics(undefined, true);
  });

  // Monitor job completion for metrics
  aiInsightsQueueEvents.on("completed", async ({ jobId }) => {
    updateQueueMetrics();
  });

  aiInsightsQueueEvents.on("active", async ({ jobId }) => {
    updateQueueMetrics();
  });
}

// Don't initialize automatically on import - wait for explicit call
