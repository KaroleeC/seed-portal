/**
 * Email-Lead Auto-Link Background Worker
 *
 * Automatically links email threads to leads based on participant email addresses
 * Runs after email sync completes
 *
 * Job Payload:
 * - threadIds: string[] - Array of thread IDs to process
 */

import { autoLinkThreadToLeads } from "../../services/email-lead-linking.service";
import { logger } from "../../logger";

const workerLogger = logger.child({ module: "email-lead-auto-link-worker" });

export interface EmailLeadAutoLinkPayload {
  threadIds: string[];
}

/**
 * Process email threads for auto-linking to leads
 * Links threads to leads based on participant email addresses
 */
export async function emailLeadAutoLinkTask(payload: EmailLeadAutoLinkPayload): Promise<void> {
  const { threadIds } = payload;

  if (!threadIds || threadIds.length === 0) {
    workerLogger.warn("No thread IDs provided for auto-linking");
    return;
  }

  workerLogger.info({ threadCount: threadIds.length }, "Starting email-lead auto-link");

  let successCount = 0;
  let failCount = 0;
  let totalLinksCreated = 0;

  for (const threadId of threadIds) {
    try {
      const links = await autoLinkThreadToLeads(threadId);

      if (links.length > 0) {
        successCount++;
        totalLinksCreated += links.length;
        workerLogger.debug({ threadId, linkCount: links.length }, "Auto-linked thread to leads");
      }
    } catch (error) {
      failCount++;
      workerLogger.error({ error, threadId }, "Failed to auto-link thread");
      // Continue processing other threads even if one fails
    }
  }

  workerLogger.info(
    {
      total: threadIds.length,
      successCount,
      failCount,
      totalLinksCreated,
    },
    "Email-lead auto-link complete"
  );
}
