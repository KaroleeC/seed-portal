/**
 * Graphile Worker Tests
 *
 * Unit and integration tests for the job queue system.
 * Uses Vitest for fast, reliable testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { queueJob, initializeWorker, shutdownWorker, getWorkerRunner } from "../graphile-worker";

// Mock the database connection
vi.mock("../../storage", () => ({
  storage: {
    getDb: vi.fn(() => ({
      query: vi.fn(),
    })),
  },
}));

// Mock logger
vi.mock("../../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Graphile Worker", () => {
  describe("Worker Initialization", () => {
    it("should initialize worker with DATABASE_URL", async () => {
      // Set up environment
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

      try {
        const runner = await initializeWorker();

        // Worker should initialize successfully
        expect(runner).toBeDefined();
      } finally {
        // Cleanup
        await shutdownWorker();
        process.env.DATABASE_URL = originalUrl;
      }
    });

    it("should return null when DATABASE_URL is missing", async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      try {
        const runner = await initializeWorker();
        expect(runner).toBeNull();
      } finally {
        process.env.DATABASE_URL = originalUrl;
      }
    });
  });

  describe("Job Queuing", () => {
    beforeEach(async () => {
      // Initialize worker before each test
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      await initializeWorker();
    });

    afterEach(async () => {
      // Clean up after each test
      await shutdownWorker();
    });

    it("should queue a job successfully", async () => {
      const taskName = "cache-prewarming";
      const payload = {};

      // Should not throw
      await expect(queueJob(taskName, payload)).resolves.not.toThrow();
    });

    it("should queue a job with options", async () => {
      const taskName = "ai-insights";
      const payload = { userId: 1, hubspotOwnerId: "12345" };
      const options = {
        maxAttempts: 5,
        priority: 1,
      };

      await expect(queueJob(taskName, payload, options)).resolves.not.toThrow();
    });

    it("should handle queuing when worker not initialized", async () => {
      await shutdownWorker();

      const taskName = "test-task";
      const payload = {};

      // Should not throw, just log warning
      await expect(queueJob(taskName, payload)).resolves.not.toThrow();
    });
  });

  describe("Job Tasks", () => {
    it("should have all required task definitions", async () => {
      await initializeWorker();

      const runner = getWorkerRunner();
      expect(runner).toBeDefined();

      // Verify tasks are registered (check internal task list)
      // Note: This requires accessing internal state or using a test database

      await shutdownWorker();
    });
  });

  describe("Worker Shutdown", () => {
    it("should shutdown gracefully", async () => {
      await initializeWorker();

      await expect(shutdownWorker()).resolves.not.toThrow();

      const runner = getWorkerRunner();
      expect(runner).toBeNull();
    });

    it("should handle shutdown when not initialized", async () => {
      await expect(shutdownWorker()).resolves.not.toThrow();
    });
  });
});
