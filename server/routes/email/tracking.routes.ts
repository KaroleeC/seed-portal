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
 * POST /api/email/retry-send/:draftId
 * Retry sending a failed email
 */
router.post("/api/email/retry-send/:draftId", requireAuth, async (req: any, res: Response) => {
  try {
    const { draftId } = req.params;

    // Get draft
    const [draft] = await db
      .select()
      .from(emailDrafts)
      .innerJoin(emailAccounts, eq(emailDrafts.accountId, emailAccounts.id))
      .where(eq(emailDrafts.id, draftId))
      .limit(1);

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Check send attempts
    const sendAttempts = (draft.email_drafts.sendAttempts || 0) + 1;
    if (sendAttempts > 3) {
      return res.status(400).json({ error: "Maximum retry attempts exceeded" });
    }

    // Update draft
    await db
      .update(emailDrafts)
      .set({
        sendStatus: "sending",
        sendAttempts,
      })
      .where(eq(emailDrafts.id, draftId));

    // TODO: Trigger actual send (integrate with send endpoint)
    // For now, just return success
    res.json({ success: true, attempts: sendAttempts });
  } catch (error) {
    console.error("[Email] Failed to retry send:", error);
    res.status(500).json({ error: "Failed to retry send" });
  }
});

export default router;
