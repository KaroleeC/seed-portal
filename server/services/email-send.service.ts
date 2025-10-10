import { nanoid } from "nanoid";
import { db } from "../db";
import {
  emailSendStatus,
  emailMessages,
  emailThreads,
  emailAccounts,
} from "../../shared/email-schema";
import { eq } from "drizzle-orm";
import { createGmailService } from "./gmail-service";
import {
  generateTrackingPixelHtml,
  injectTrackingPixel,
  determineBounceType,
  calculateNextRetry,
} from "./email-tracking";

import type { GmailService } from "./gmail-service";

interface SendEmailParams {
  accountEmail: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
  attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }>;
  trackingEnabled?: boolean;
}

interface SendEmailResult {
  id: string;
  threadId?: string;
  trackingPixelId?: string | null;
  statusId: string;
  messageId: string; // Database message ID for tracking
}

/**
 * Send email service - handles email sending with tracking, status tracking, and error handling
 */
export class EmailSendService {
  constructor(private gmail: GmailService) {}

  /**
   * Send an email with optional tracking
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const {
      accountEmail,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      inReplyTo,
      references,
      threadId,
      attachments,
      trackingEnabled,
    } = params;

    // Generate tracking pixel if enabled
    const trackingPixelId = trackingEnabled ? nanoid() : null;
    let finalHtml = html || "";

    if (trackingEnabled && trackingPixelId && finalHtml) {
      const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
      const pixelHtml = generateTrackingPixelHtml(trackingPixelId, apiBaseUrl);
      finalHtml = injectTrackingPixel(finalHtml, pixelHtml);
    }

    // Create send status record
    const statusId = nanoid();
    await db.insert(emailSendStatus).values({
      id: statusId,
      status: "sending",
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      // Process attachments - support both base64 and storage URLs
      const processedAttachments = (attachments || [])
        .map((a) => ({
          filename: a.filename,
          contentBase64: a.contentBase64,
          content: a.contentBase64 ? Buffer.from(a.contentBase64, "base64") : undefined,
          contentType: a.contentType,
        }))
        .filter((a) => a.content || a.contentBase64);

      const result = await this.gmail.sendEmail({
        from: accountEmail,
        to,
        cc,
        bcc,
        subject,
        html: finalHtml,
        text,
        inReplyTo,
        references,
        threadId,
        attachments: processedAttachments as Array<{
          filename: string;
          content: Buffer;
          contentType?: string;
          contentBase64?: string;
        }>,
      });

      // Get account ID for saving the message
      const [account] = await db
        .select({ id: emailAccounts.id, userId: emailAccounts.userId })
        .from(emailAccounts)
        .where(eq(emailAccounts.email, accountEmail))
        .limit(1);

      if (!account) {
        throw new Error(`Account not found for email: ${accountEmail}`);
      }

      // Find or create thread
      let dbThreadId: string;
      if (result.threadId) {
        // Try to find existing thread
        const [existingThread] = await db
          .select({ id: emailThreads.id })
          .from(emailThreads)
          .where(eq(emailThreads.gmailThreadId, result.threadId))
          .limit(1);

        if (existingThread) {
          dbThreadId = existingThread.id;
          // Update thread's lastMessageAt
          const now = new Date();
          await db
            .update(emailThreads)
            .set({ lastMessageAt: now, updatedAt: now })
            .where(eq(emailThreads.id, dbThreadId));
        } else {
          // Create new thread
          dbThreadId = nanoid();
          const now = new Date();
          await db.insert(emailThreads).values({
            id: dbThreadId,
            accountId: account.id,
            gmailThreadId: result.threadId,
            subject,
            snippet: text || finalHtml.replace(/<[^>]*>/g, "").substring(0, 200),
            participants: to.map((email) => ({ email, name: email })),
            labels: ["SENT"],
            lastMessageAt: now,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else {
        // No thread ID, create a new thread
        dbThreadId = nanoid();
        const now = new Date();
        await db.insert(emailThreads).values({
          id: dbThreadId,
          accountId: account.id,
          subject,
          snippet: text || finalHtml.replace(/<[^>]*>/g, "").substring(0, 200),
          participants: to.map((email) => ({ email, name: email })),
          labels: ["SENT"],
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Save sent message to database immediately
      const messageId = nanoid();
      const now = new Date();
      await db.insert(emailMessages).values({
        id: messageId,
        threadId: dbThreadId,
        gmailMessageId: result.id,
        from: { email: accountEmail, name: accountEmail },
        to: to.map((email) => ({ email, name: email })),
        cc: cc?.map((email) => ({ email, name: email })),
        bcc: bcc?.map((email) => ({ email, name: email })),
        subject,
        bodyHtml: finalHtml,
        bodyText: text,
        snippet: text || finalHtml.replace(/<[^>]*>/g, "").substring(0, 200),
        headers: {},
        labels: ["SENT"],
        isRead: true, // Sent emails are always "read"
        sentAt: now, // Required field for sent messages
        createdAt: now,
        receivedAt: now,
        trackingEnabled: trackingEnabled || false,
        trackingPixelId: trackingPixelId || undefined,
      });

      // Update status to sent
      await db
        .update(emailSendStatus)
        .set({
          status: "sent",
          gmailMessageId: result.id,
          gmailThreadId: result.threadId,
          messageId, // Link to the saved message
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(emailSendStatus.id, statusId));

      return {
        id: result.id,
        threadId: result.threadId,
        trackingPixelId,
        statusId,
        messageId, // Return the DB message ID for tracking
      };
    } catch (error: any) {
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
          nextRetryAt: calculateNextRetry(0),
          updatedAt: new Date(),
        })
        .where(eq(emailSendStatus.id, statusId));

      throw error;
    }
  }

  /**
   * Schedule an email to be sent later (in-memory, best-effort)
   */
  async scheduleEmail(
    params: SendEmailParams,
    sendAt: Date
  ): Promise<{ scheduled: true; sendAt: string }> {
    const delay = Math.min(sendAt.getTime() - Date.now(), 30 * 24 * 60 * 60 * 1000); // cap 30d

    setTimeout(() => {
      this.sendEmail(params).catch((e) =>
        console.error("[EmailSendService] Scheduled send failed", e)
      );
    }, delay);

    return {
      scheduled: true,
      sendAt: sendAt.toISOString(),
    };
  }
}

/**
 * Create an email send service instance with Gmail credentials
 */
export function createEmailSendService(
  accessToken: string,
  refreshToken: string
): EmailSendService {
  const gmail = createGmailService();
  gmail.setCredentials(accessToken, refreshToken);
  return new EmailSendService(gmail);
}
