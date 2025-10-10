/**
 * Graphile Worker Integration Tests
 *
 * Real database integration tests for the job queue.
 * Uses a test database to verify actual job processing.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { queueJob, initializeWorker, shutdownWorker } from "../graphile-worker";

// Test database connection
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe("Graphile Worker Integration Tests", () => {
  let pool: Pool;

  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      console.warn("Skipping integration tests: No TEST_DATABASE_URL or DATABASE_URL");
      return;
    }

    // Set up test database connection
    pool = new Pool({ connectionString: TEST_DATABASE_URL });

    // Ensure graphile_worker schema exists
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS graphile_worker;
    `);

    // Initialize worker
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    await initializeWorker();
  });

  afterAll(async () => {
    if (!TEST_DATABASE_URL) return;

    // Cleanup
    await shutdownWorker();

    // Clean up test jobs
    await pool.query(`
      DELETE FROM graphile_worker.jobs 
      WHERE task_identifier IN (
        'test-job',
        'cache-prewarming',
        'ai-insights',
        'workspace-sync'
      );
    `);

    await pool.end();
  });

  describe("Job Processing", () => {
    it("should insert job into database", async () => {
      if (!TEST_DATABASE_URL) {
        console.warn("Skipping: No test database");
        return;
      }

      // Queue a test job
      await queueJob("cache-prewarming", { test: true });

      // Verify job was inserted
      const result = await pool.query(`
        SELECT * FROM graphile_worker.jobs
        WHERE task_identifier = 'cache-prewarming'
        ORDER BY created_at DESC
        LIMIT 1;
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].task_identifier).toBe("cache-prewarming");
      expect(result.rows[0].payload).toEqual({ test: true });
    });

    it("should respect job options", async () => {
      if (!TEST_DATABASE_URL) {
        console.warn("Skipping: No test database");
        return;
      }

      const runAt = new Date(Date.now() + 60000); // 1 minute from now

      await queueJob(
        "ai-insights",
        { userId: 1 },
        {
          runAt,
          maxAttempts: 5,
          priority: 1,
        }
      );

      const result = await pool.query(`
        SELECT * FROM graphile_worker.jobs
        WHERE task_identifier = 'ai-insights'
        ORDER BY created_at DESC
        LIMIT 1;
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].max_attempts).toBe(5);
      expect(result.rows[0].priority).toBe(1);

      // runAt should be approximately 1 minute from now
      const jobRunAt = new Date(result.rows[0].run_at);
      const diff = Math.abs(jobRunAt.getTime() - runAt.getTime());
      expect(diff).toBeLessThan(5000); // Within 5 seconds
    });

    it("should use jobKey for deduplication", async () => {
      if (!TEST_DATABASE_URL) {
        console.warn("Skipping: No test database");
        return;
      }

      const jobKey = `test-dedupe-${Date.now()}`;

      // Queue same job twice with same jobKey
      await queueJob("workspace-sync", { triggeredBy: "test" }, { jobKey });

      await queueJob("workspace-sync", { triggeredBy: "test" }, { jobKey });

      // Should only have one job with this key
      const result = await pool.query(
        `
        SELECT * FROM graphile_worker.jobs
        WHERE key = $1;
      `,
        [jobKey]
      );

      expect(result.rows.length).toBe(1);
    });
  });

  describe("Worker State", () => {
    it("should have worker runner initialized", () => {
      if (!TEST_DATABASE_URL) {
        console.warn("Skipping: No test database");
        return;
      }

      const { getWorkerRunner } = require("../graphile-worker");
      const runner = getWorkerRunner();

      expect(runner).toBeDefined();
      expect(runner).not.toBeNull();
    });
  });

  describe("Job History", () => {
    it("should track job attempts", async () => {
      if (!TEST_DATABASE_URL) {
        console.warn("Skipping: No test database");
        return;
      }

      // Queue a job
      await queueJob("test-job", { timestamp: Date.now() });

      // Check initial state
      const result = await pool.query(`
        SELECT attempts FROM graphile_worker.jobs
        WHERE task_identifier = 'test-job'
        ORDER BY created_at DESC
        LIMIT 1;
      `);

      expect(result.rows[0].attempts).toBe(0);
    });
  });
});
