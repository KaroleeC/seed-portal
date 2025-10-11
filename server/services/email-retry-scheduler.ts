/**
 * Email Retry Scheduler
 * Schedules automatic retries for failed email sends
 * Runs every 5 minutes to process emails ready for retry
 */

import cron from "node-cron";
import { logger } from "../logger";
import type { ScheduledTask } from "node-cron";

let retryScheduler: ScheduledTask | null = null;

/**
 * Start the email auto-retry scheduler
 * Runs every 5 minutes
 */
export function startEmailRetryScheduler(): void {
  // Skip in test/development environments to avoid conflicts
  if (process.env.NODE_ENV === "test" || process.env.SKIP_EMAIL_RETRY_SCHEDULER === "true") {
    logger.info("Email retry scheduler disabled (test environment)");
    return;
  }

  if (retryScheduler) {
    logger.warn("Email retry scheduler already running");
    return;
  }

  logger.info("Starting email auto-retry scheduler (every 5 minutes)...");

  // Schedule to run every 5 minutes
  retryScheduler = cron.schedule("*/5 * * * *", async () => {
    logger.info("[EmailRetryScheduler] Running scheduled auto-retry job");

    try {
      const { queueJob } = await import("../workers/graphile-worker");
      
      await queueJob(
        "email-auto-retry",
        {},
        {
          jobKey: `email-auto-retry-${Date.now()}`,
          maxAttempts: 1, // Don't retry the retry job itself
        }
      );

      logger.info("[EmailRetryScheduler] Auto-retry job queued successfully");
    } catch (error) {
      logger.error({ error }, "[EmailRetryScheduler] Failed to queue auto-retry job");
    }
  });

  logger.info("✅ Email retry scheduler started - running every 5 minutes");
}

/**
 * Stop the email auto-retry scheduler
 */
export function stopEmailRetryScheduler(): void {
  if (retryScheduler) {
    retryScheduler.stop();
    retryScheduler = null;
    logger.info("Email retry scheduler stopped");
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  schedule: string;
} {
  return {
    running: retryScheduler !== null,
    schedule: "*/5 * * * *", // Every 5 minutes
  };
}
