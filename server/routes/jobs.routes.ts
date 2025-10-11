/**
 * Job Queue Routes
 *
 * API endpoints for managing background jobs using Graphile Worker
 */

import type { Request, Response } from "express";
import { Router } from "express";
import { queueJob, getWorkerRunner } from "../workers/graphile-worker";
import { logger } from "../logger";

const router = Router();

/**
 * POST /api/jobs/queue
 * Queue a background job
 */
router.post("/queue", async (req: Request, res: Response) => {
  try {
    const { taskName, payload, options } = req.body;

    if (!taskName) {
      return res.status(400).json({ error: "taskName is required" });
    }

    await queueJob(taskName, payload || {}, options);

    res.json({
      success: true,
      message: `Job '${taskName}' queued successfully`,
    });
  } catch (error) {
    logger.error({ error }, "Failed to queue job");
    res.status(500).json({ error: "Failed to queue job" });
  }
});

/**
 * GET /api/jobs/status
 * Get worker status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const runner = getWorkerRunner();

    if (!runner) {
      return res.json({
        status: "not_initialized",
        message: "Graphile Worker not initialized",
      });
    }

    res.json({
      status: "running",
      message: "Graphile Worker is running",
    });
  } catch (error) {
    logger.error({ error }, "Failed to get worker status");
    res.status(500).json({ error: "Failed to get worker status" });
  }
});

export default router;
