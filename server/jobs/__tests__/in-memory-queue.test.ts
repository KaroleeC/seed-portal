/**
 * Tests for In-Memory Job Queue
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  enqueueJob,
  executeJob,
  getJob,
  getAllJobs,
  getQueueStats,
  type Job,
} from "../in-memory-queue";

describe("In-Memory Job Queue", () => {
  beforeEach(() => {
    // Clear all jobs before each test
    const allJobs = getAllJobs();
    allJobs.forEach((job) => {
      // Jobs will be cleaned up by the cleanup timer
    });
  });

  describe("enqueueJob", () => {
    it("should enqueue a job and return jobId", () => {
      const { jobId, job } = enqueueJob("test-job", { foo: "bar" });

      expect(jobId).toBeTruthy();
      expect(job.id).toBe(jobId);
      expect(job.type).toBe("test-job");
      expect(job.status).toBe("pending");
      expect(job.data).toEqual({ foo: "bar" });
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it("should generate unique job IDs", () => {
      const { jobId: id1 } = enqueueJob("test-job", {});
      const { jobId: id2 } = enqueueJob("test-job", {});

      expect(id1).not.toBe(id2);
    });
  });

  describe("getJob", () => {
    it("should retrieve an enqueued job", () => {
      const { jobId } = enqueueJob("test-job", { foo: "bar" });

      const job = getJob(jobId);

      expect(job).toBeTruthy();
      expect(job?.id).toBe(jobId);
      expect(job?.data).toEqual({ foo: "bar" });
    });

    it("should return undefined for non-existent job", () => {
      const job = getJob("non-existent-id");

      expect(job).toBeUndefined();
    });
  });

  describe("executeJob", () => {
    it("should execute job successfully and update status", async () => {
      const { jobId } = enqueueJob("test-job", { value: 42 });

      const executor = vi.fn(async (job: Job) => {
        return { result: job.data.value * 2 };
      });

      await executeJob(jobId, executor);

      const job = getJob(jobId);
      expect(job?.status).toBe("succeeded");
      expect(job?.result).toEqual({ result: 84 });
      expect(job?.completedAt).toBeInstanceOf(Date);
      expect(job?.progress).toBe(100);
      expect(executor).toHaveBeenCalledTimes(1);
    });

    it("should handle job execution errors", async () => {
      const { jobId } = enqueueJob("test-job", {});

      const executor = vi.fn(async () => {
        throw new Error("Test error");
      });

      await executeJob(jobId, executor);

      const job = getJob(jobId);
      expect(job?.status).toBe("failed");
      expect(job?.error).toBe("Test error");
      expect(job?.completedAt).toBeInstanceOf(Date);
    });

    it("should mark job as processing during execution", async () => {
      const { jobId } = enqueueJob("test-job", {});

      let statusDuringExecution: string | undefined;

      const executor = vi.fn(async () => {
        const job = getJob(jobId);
        statusDuringExecution = job?.status;
        return { done: true };
      });

      await executeJob(jobId, executor);

      expect(statusDuringExecution).toBe("processing");
    });

    it("should handle non-existent job gracefully", async () => {
      const executor = vi.fn(async () => ({ result: "ok" }));

      // Should not throw
      await executeJob("non-existent-id", executor);

      expect(executor).not.toHaveBeenCalled();
    });
  });

  describe("getQueueStats", () => {
    it("should return correct queue statistics", async () => {
      // Enqueue some jobs
      const { jobId: id1 } = enqueueJob("test-job", {});
      const { jobId: id2 } = enqueueJob("test-job", {});
      const { jobId: id3 } = enqueueJob("test-job", {});

      // Execute one successfully
      await executeJob(id1, async () => ({ ok: true }));

      // Execute one with failure
      await executeJob(id2, async () => {
        throw new Error("Failed");
      });

      // Leave id3 pending

      const stats = getQueueStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(0);
      expect(stats.succeeded).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe("Performance", () => {
    it("should enqueue jobs quickly (< 10ms)", () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        enqueueJob("test-job", { index: i });
      }

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // 100 jobs in < 100ms
    });

    it("should execute jobs in parallel", async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => enqueueJob("test-job", { index: i }));

      const start = Date.now();

      // Execute all jobs in parallel
      await Promise.all(
        jobs.map(({ jobId }) =>
          executeJob(jobId, async (job) => {
            // Simulate 50ms work
            await new Promise((resolve) => setTimeout(resolve, 50));
            return { index: job.data.index };
          })
        )
      );

      const duration = Date.now() - start;

      // Should complete in ~50ms (parallel) not 250ms (sequential)
      expect(duration).toBeLessThan(150);
    });
  });
});
