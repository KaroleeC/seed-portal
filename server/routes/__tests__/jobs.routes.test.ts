/**
 * Job Queue API Endpoint Tests
 *
 * Tests for /api/jobs endpoints using Vitest and MSW.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import jobsRouter from "../jobs.routes";

// Mock the worker functions
vi.mock("../../workers/graphile-worker", () => ({
  queueJob: vi.fn().mockResolvedValue(undefined),
  getWorkerRunner: vi.fn().mockReturnValue({ status: "running" }),
}));

// Mock logger
vi.mock("../../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Jobs API Routes", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/jobs", jobsRouter);
  });

  describe("POST /api/jobs/queue", () => {
    it("should queue a job successfully", async () => {
      const response = await request(app)
        .post("/api/jobs/queue")
        .send({
          taskName: "cache-prewarming",
          payload: {},
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Job 'cache-prewarming' queued successfully",
      });
    });

    it("should queue a job with payload and options", async () => {
      const response = await request(app)
        .post("/api/jobs/queue")
        .send({
          taskName: "ai-insights",
          payload: { userId: 1, hubspotOwnerId: "12345" },
          options: { maxAttempts: 3 },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return 400 when taskName is missing", async () => {
      const response = await request(app)
        .post("/api/jobs/queue")
        .send({
          payload: {},
        })
        .expect(400);

      expect(response.body).toEqual({
        error: "taskName is required",
      });
    });

    it("should handle queuing errors gracefully", async () => {
      // Mock queue job to throw error
      const { queueJob } = await import("../../workers/graphile-worker");
      vi.mocked(queueJob).mockRejectedValueOnce(new Error("Queue error"));

      const response = await request(app)
        .post("/api/jobs/queue")
        .send({
          taskName: "test-task",
          payload: {},
        })
        .expect(500);

      expect(response.body).toEqual({
        error: "Failed to queue job",
      });
    });
  });

  describe("GET /api/jobs/status", () => {
    it("should return worker status when running", async () => {
      const response = await request(app).get("/api/jobs/status").expect(200);

      expect(response.body).toEqual({
        status: "running",
        message: "Graphile Worker is running",
      });
    });

    it("should return not_initialized when worker is not running", async () => {
      // Mock worker runner to return null
      const { getWorkerRunner } = await import("../../workers/graphile-worker");
      vi.mocked(getWorkerRunner).mockReturnValueOnce(null);

      const response = await request(app).get("/api/jobs/status").expect(200);

      expect(response.body).toEqual({
        status: "not_initialized",
        message: "Graphile Worker not initialized",
      });
    });
  });
});
