// AI Insights Worker for processing expensive AI operations
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { AIInsightsJobData, JobResult, updateQueueMetrics } from "../queue.js";
import { clientIntelEngine } from "../client-intel";

let workerRedis: Redis | null = null;

async function initializeWorkerRedis(): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log("[Worker] No REDIS_URL found, worker will not start");
    return;
  }

  try {
    workerRedis = new Redis(
      process.env.REDIS_URL as string,
      {
        maxRetriesPerRequest: null as any, // Required for BullMQ
        lazyConnect: false,
        connectTimeout: 15000, // Match session Redis timeout
        keepAlive: 30000, // milliseconds
        family: 4,
        enableReadyCheck: true,
      } as any
    );

    await workerRedis.ping();
    console.log("[Worker] ✅ Redis connection established for worker");
  } catch (error) {
    console.error("[Worker] ❌ Failed to connect to Redis:", error);
    workerRedis = null;
  }
}

// Process AI Insights Job
async function processAIInsights(job: Job<AIInsightsJobData>): Promise<JobResult> {
  const startTime = Date.now();
  console.log(`[Worker] 🔄 Processing AI insights job ${job.id} for contact ${job.data.contactId}`);

  try {
    const { clientData } = job.data;

    // Client intelligence engine is imported statically

    // Update job progress
    await job.updateProgress(25);

    // Generate AI insights using the intelligence engine (expensive operations)
    console.log(`[Worker] Starting pain points analysis for ${clientData.companyName}:`, {
      companyName: clientData.companyName,
      industry: clientData.industry,
      services: clientData.services,
    });
    const painPointsPromise = clientIntelEngine.extractPainPoints(clientData);
    await job.updateProgress(50);

    console.log(`[Worker] Starting service gaps analysis for ${clientData.companyName}`);
    const serviceGapsPromise = clientIntelEngine.detectServiceGaps(clientData);
    await job.updateProgress(75);

    console.log(`[Worker] Starting risk score calculation for ${clientData.companyName}`);
    const riskScorePromise = clientIntelEngine.calculateRiskScore(clientData);

    // Wait for all AI operations to complete
    console.log(`[Worker] Waiting for all AI operations to complete...`);
    const [painPoints, serviceGaps, riskScore] = await Promise.all([
      painPointsPromise,
      serviceGapsPromise,
      riskScorePromise,
    ]);

    console.log(`[Worker] AI operations completed:`, {
      painPointsCount: painPoints?.length || 0,
      painPoints: painPoints,
      serviceGapsCount: serviceGaps?.length || 0,
      serviceGaps: serviceGaps,
      riskScore: riskScore,
    });

    await job.updateProgress(100);

    const result: JobResult = {
      painPoints,
      upsellOpportunities: serviceGaps.map(
        (signal: any) => `${signal.title} - ${signal.estimatedValue || "Pricing TBD"}`
      ),
      riskScore,
      lastAnalyzed: new Date().toISOString(),
      signals: serviceGaps,
    };

    const processingTime = Date.now() - startTime;
    updateQueueMetrics(processingTime, false);

    console.log(
      `[Worker] ✅ AI insights completed for contact ${job.data.contactId} in ${processingTime}ms`
    );
    return result;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    updateQueueMetrics(processingTime, true);

    console.error(`[Worker] ❌ AI insights failed for contact ${job.data.contactId}:`, error);
    console.error(`[Worker] ❌ Error details:`, {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      clientData: {
        companyName: job.data.clientData?.companyName,
        industry: job.data.clientData?.industry,
      },
    });
    throw error;
  }
}

// Create and start the worker
export async function startAIInsightsWorker(): Promise<Worker | null> {
  await initializeWorkerRedis();

  if (!workerRedis) {
    console.log("[Worker] No Redis connection, worker not started");
    return null;
  }

  const worker = new Worker("ai-insights", processAIInsights, {
    connection: workerRedis!,
    concurrency: 2, // Process up to 2 jobs concurrently
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  worker.on("completed", (job) => {
    console.log(`[Worker] ✅ Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} failed:`, err);
    console.error(`[Worker] ❌ Failure details:`, {
      jobData: job?.data,
      errorMessage: err.message,
      errorStack: err.stack,
    });
  });

  worker.on("error", (err) => {
    console.error("[Worker] Worker error:", err);
  });

  console.log("[Worker] 🚀 AI Insights worker started successfully");
  return worker;
}

// Graceful shutdown
export async function stopAIInsightsWorker(worker: Worker): Promise<void> {
  if (worker) {
    await worker.close();
    console.log("[Worker] AI Insights worker stopped");
  }
}
