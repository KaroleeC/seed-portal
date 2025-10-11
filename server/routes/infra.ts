import { Router } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { cache } from "../cache";
import { getErrorMessage } from "../utils/error-handling";

const router = Router();

// Queue metrics
router.get("/api/queue/metrics", requireAuth, async (req, res) => {
  try {
    const mod: any = await import("../queue.js");
    const metrics =
      typeof mod.getQueueMetrics === "function" ? mod.getQueueMetrics() : { enabled: false };
    res.json(metrics);
  } catch (error) {
    console.error("Queue metrics error:", getErrorMessage(error));
    res.status(500).json({ message: "Failed to get queue metrics" });
  }
});

// Cache stats
router.get("/api/cache/stats", requireAuth, async (req, res) => {
  try {
    const stats = await cache.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Cache stats error:", getErrorMessage(error));
    res.status(500).json({ message: "Failed to get cache stats" });
  }
});

// AI job status polling
router.get("/api/jobs/:jobId/status", requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const mod: any = await import("../queue.js");
    const getAIInsightsQueue = mod.getAIInsightsQueue as any;
    const aiInsightsQueue = typeof getAIInsightsQueue === "function" ? getAIInsightsQueue() : null;

    if (!aiInsightsQueue) {
      return res.status(503).json({ message: "Queue service unavailable" });
    }

    const job = await aiInsightsQueue.getJob(String(jobId));
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const state = await job.getState();
    const progress = job.progress || 0;

    if (state === "completed") {
      const result = job.returnvalue;
      const { contactId } = job.data;
      const { CacheTTL, CachePrefix } = await import("../cache");
      const cacheKey = (cache as any).generateKey(CachePrefix.OPENAI_ANALYSIS, contactId);
      await cache.set(cacheKey, result, (CacheTTL as any).OPENAI_ANALYSIS || 300);
      return res.json({ status: "completed", result });
    }

    if (state === "failed") {
      return res.status(500).json({ status: "failed", error: job.failedReason });
    }

    res.json({
      status: state,
      progress,
      message: state === "active" ? "Processing AI insights..." : "Job in queue",
    });
  } catch (error) {
    console.error("Job status error:", error);
    res.status(500).json({ message: "Failed to get job status" });
  }
});

export default router;
