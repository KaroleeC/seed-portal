import type { Response } from "express";
import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../../db";
import {
  emailMessages,
  emailThreads,
  emailAccounts,
  emailOpens,
  emailSendStatus,
  emailDrafts,
} from "../../../shared/email-schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../../middleware/supabase-auth";
import { generateTransparentGif, getLocationFromIp } from "../../services/email-tracking";

const router = Router();

// ============================================================================
// Email Tracking Routes
// ============================================================================

/**
 * GET /api/email/track/:trackingId/open.gif
 * Tracking pixel endpoint - records email opens
 * PUBLIC endpoint (no auth required - accessed from recipient's email client)
 */
router.get("/api/email/track/:trackingId/open.gif", async (req: any, res: Response) => {
  try {
    const { trackingId } = req.params;

    console.log("[Tracking] Pixel hit for trackingId:", trackingId);

    // Find message with this tracking pixel ID
    const [message] = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.trackingPixelId, trackingId))
      .limit(1);

    if (!message) {
      console.log("[Tracking] No message found with trackingPixelId:", trackingId);
    } else {
      console.log("[Tracking] Found message:", message.id, "Subject:", message.subject);
    }

    if (message) {
      // Get IP and user agent
      const ipAddress = ((req.headers["x-forwarded-for"] as string) || req.ip || "")
        .split(",")[0]
        .trim();
      const userAgent = (req.headers["user-agent"] as string) || "";

      // Get approximate location (async, don't wait)
      getLocationFromIp(ipAddress).then(async (location) => {
        try {
          // Record the open
          await db.insert(emailOpens).values({
            id: nanoid(),
            messageId: message.id,
            openedAt: new Date(),
            ipAddress,
            userAgent,
            location: location || undefined,
          });

          // Update message stats
          const openCount = (message.openCount || 0) + 1;
          await db
            .update(emailMessages)
            .set({
              firstOpenedAt: message.firstOpenedAt || new Date(),
              lastOpenedAt: new Date(),
              openCount,
            })
            .where(eq(emailMessages.id, message.id));
        } catch (error) {
          console.error("[Tracking] Failed to record open:", error);
        }
      });
    }

    // Always return the transparent GIF immediately (don't wait for DB)
    const gif = generateTransparentGif();
    res.set({
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    res.send(gif);
  } catch (error) {
    console.error("[Tracking] Tracking pixel error:", error);
    // Still return GIF even on error to avoid broken images
    const gif = generateTransparentGif();
    res.set("Content-Type", "image/gif");
    res.send(gif);
  }
});

/**
 * GET /api/email/messages/:messageId/opens
 * Get open tracking data for a message
 */
router.get("/api/email/messages/:messageId/opens", requireAuth, async (req: any, res: Response) => {
  try {
    const { messageId } = req.params;

    // Get message to verify ownership
    const [message] = await db
      .select()
      .from(emailMessages)
      .innerJoin(emailThreads, eq(emailMessages.threadId, emailThreads.id))
      .innerJoin(emailAccounts, eq(emailThreads.accountId, emailAccounts.id))
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Get all opens for this message
    const opens = await db
      .select()
      .from(emailOpens)
      .where(eq(emailOpens.messageId, messageId))
      .orderBy(desc(emailOpens.openedAt));

    res.json({
      message: {
        id: message.email_messages.id,
        trackingEnabled: message.email_messages.trackingEnabled,
        firstOpenedAt: message.email_messages.firstOpenedAt,
        lastOpenedAt: message.email_messages.lastOpenedAt,
        openCount: message.email_messages.openCount,
      },
      opens,
    });
  } catch (error) {
    console.error("[Email] Failed to fetch opens:", error);
    res.status(500).json({ error: "Failed to fetch tracking data" });
  }
});

/**
 * GET /api/email/send-status/:messageId
 * Get send status for a message
 */
router.get("/api/email/send-status/:messageId", requireAuth, async (req: any, res: Response) => {
  try {
    const { messageId } = req.params;

    const [status] = await db
      .select()
      .from(emailSendStatus)
      .where(eq(emailSendStatus.messageId, messageId))
      .orderBy(desc(emailSendStatus.createdAt))
      .limit(1);

    res.json(status || null);
  } catch (error) {
    console.error("[Email] Failed to fetch send status:", error);
    res.status(500).json({ error: "Failed to fetch send status" });
  }
});

/**
 * POST /api/email/retry-send/:statusId
 * Retry sending a failed email using send status ID
 */
router.post("/api/email/retry-send/:statusId", requireAuth, async (req: any, res: Response) => {
  try {
    const { statusId } = req.params;
    const userId = String(req.user?.id || req.principal?.userId || "");

    // Get send status
    const [sendStatus] = await db
      .select()
      .from(emailSendStatus)
      .where(eq(emailSendStatus.id, statusId))
      .limit(1);

    if (!sendStatus) {
      return res.status(404).json({ error: "Send status not found" });
    }

    // Check retry count
    if (sendStatus.retryCount >= sendStatus.maxRetries) {
      return res.status(400).json({ 
        error: "Maximum retry attempts exceeded",
        retryCount: sendStatus.retryCount,
        maxRetries: sendStatus.maxRetries,
      });
    }

    // Get draft if available
    if (!sendStatus.draftId) {
      return res.status(400).json({ error: "No draft associated with this send status" });
    }

    const [draftData] = await db
      .select()
      .from(emailDrafts)
      .innerJoin(emailAccounts, eq(emailDrafts.accountId, emailAccounts.id))
      .where(eq(emailDrafts.id, sendStatus.draftId))
      .limit(1);

    if (!draftData) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Verify user owns the account
    if (draftData.email_accounts.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const draft = draftData.email_drafts;
    const account = draftData.email_accounts;

    // Import send service
    const { createEmailSendService } = await import("../../services/email-send.service");
    const { decryptEmailTokens } = await import("../../services/email-tokens");

    // Decrypt tokens
    const { accessToken, refreshToken } = decryptEmailTokens(account as any);
    const emailSendService = createEmailSendService(accessToken, refreshToken);

    // Update retry count
    await db
      .update(emailSendStatus)
      .set({
        status: "sending",
        retryCount: sendStatus.retryCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(emailSendStatus.id, statusId));

    // Attempt to send
    try {
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

      // Update status to sent (sendEmail already does this, but we update our original record)
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
        .where(eq(emailSendStatus.id, statusId));

      res.json({ 
        success: true, 
        retryCount: sendStatus.retryCount + 1,
        messageId: result.messageId,
      });
    } catch (error: any) {
      // Update status to failed again
      const { determineBounceType, calculateNextRetry } = await import("../../services/email-tracking");
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
        .where(eq(emailSendStatus.id, statusId));

      res.status(500).json({ 
        success: false,
        error: "Retry failed",
        message: error.message,
        retryCount: sendStatus.retryCount + 1,
        canRetry: (sendStatus.retryCount + 1) < sendStatus.maxRetries,
      });
    }
  } catch (error) {
    console.error("[Email] Failed to retry send:", error);
    res.status(500).json({ error: "Failed to retry send" });
  }
});

export default router;
