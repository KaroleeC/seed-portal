/**
 * Background job to automatically retry failed email sends
 * Runs periodically to check for emails that need retry based on nextRetryAt timestamp
 */

import { db } from "../../db";
import { emailSendStatus, emailDrafts, emailAccounts } from "../../../shared/email-schema";
import { eq, and, lt, lte } from "drizzle-orm";
import { createEmailSendService } from "../../services/email-send.service";
import { decryptEmailTokens } from "../../services/email-tokens";
import { determineBounceType, calculateNextRetry } from "../../services/email-tracking";
import type { Task } from "graphile-worker";

interface EmailAutoRetryPayload {
  // Empty payload - scans all eligible retries
}

/**
 * Auto-retry task
 * Finds emails that are ready for retry and attempts to resend them
 */
export const emailAutoRetry: Task = async (payload, helpers) => {
  const { logger } = helpers;

  logger.info("Starting email auto-retry scan...");

  try {
    // Find failed sends that are ready for retry
    const failedSends = await db
      .select()
      .from(emailSendStatus)
      .where(
        and(
          eq(emailSendStatus.status, "failed"),
          lt(emailSendStatus.retryCount, emailSendStatus.maxRetries),
          lte(emailSendStatus.nextRetryAt, new Date())
        )
      )
      .limit(50); // Process max 50 at a time

    if (failedSends.length === 0) {
      logger.info("No emails ready for retry");
      return;
    }

    logger.info(`Found ${failedSends.length} emails ready for retry`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const sendStatus of failedSends) {
      try {
        // Check if draft still exists
        if (!sendStatus.draftId) {
          logger.warn(`Send status ${sendStatus.id} has no draft, skipping`);
          skipCount++;
          continue;
        }

        // Get draft and account
        const [draftData] = await db
          .select()
          .from(emailDrafts)
          .innerJoin(emailAccounts, eq(emailDrafts.accountId, emailAccounts.id))
          .where(eq(emailDrafts.id, sendStatus.draftId))
          .limit(1);

        if (!draftData) {
          logger.warn(`Draft ${sendStatus.draftId} not found, skipping`);
          skipCount++;
          continue;
        }

        const draft = draftData.email_drafts;
        const account = draftData.email_accounts;

        // Update retry count and status
        await db
          .update(emailSendStatus)
          .set({
            status: "sending",
            retryCount: sendStatus.retryCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(emailSendStatus.id, sendStatus.id));

        logger.info(
          `Retrying send ${sendStatus.id} (attempt ${sendStatus.retryCount + 1}/${sendStatus.maxRetries})`
        );

        // Decrypt tokens and create send service
        const { accessToken, refreshToken } = decryptEmailTokens(account as any);
        const emailSendService = createEmailSendService(accessToken, refreshToken);

        // Attempt to send
        const toRecipients = draft.to || [];
        const ccRecipients = draft.cc || [];
        const bccRecipients = draft.bcc || [];

        const result = await emailSendService.sendEmail({
          accountEmail: account.email,
          to: toRecipients.map((r: any) => r.email),
          cc: ccRecipients.length > 0 ? ccRecipients.map((r: any) => r.email) : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients.map((r: any) => r.email) : undefined,
          subject: draft.subject,
          html: draft.bodyHtml,
          text: draft.bodyText || undefined,
          inReplyTo: draft.inReplyToMessageId || undefined,
          attachments: draft.attachments || undefined,
        });

        // Update status to sent
        await db
          .update(emailSendStatus)
          .set({
            status: "sent",
            gmailMessageId: result.id,
            gmailThreadId: result.threadId,
            messageId: result.messageId,
            sentAt: new Date(),
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(emailSendStatus.id, sendStatus.id));

        logger.info(`Successfully retried send ${sendStatus.id}`);
        successCount++;
      } catch (error: any) {
        logger.error(`Failed to retry send ${sendStatus.id}:`, error);

        // Analyze error and update status
        const { type: bounceType, reason } = determineBounceType(error.message || String(error));

        await db
          .update(emailSendStatus)
          .set({
            status: bounceType || "failed",
            errorMessage: error.message || String(error),
            bounceType: bounceType || undefined,
            bounceReason: reason,
            failedAt: new Date(),
            nextRetryAt: calculateNextRetry(sendStatus.retryCount + 1),
            updatedAt: new Date(),
          })
          .where(eq(emailSendStatus.id, sendStatus.id));

        failCount++;
      }
    }

    logger.info(
      `Email auto-retry complete: ${successCount} succeeded, ${failCount} failed, ${skipCount} skipped`
    );
  } catch (error) {
    logger.error("Email auto-retry scan failed:", error);
    throw error;
  }
};
