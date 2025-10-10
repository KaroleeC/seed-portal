import type { Response } from "express";
import { Router } from "express";
import { db } from "../../db";
import { createGmailService } from "../../services/gmail-service";
import { requireAuth } from "../../middleware/supabase-auth";
import { eq } from "drizzle-orm";
import { emailAccounts, emailThreads, emailMessages } from "../../../shared/email-schema";

const router = Router();

// ============================================================================
// Message Operations Routes
// ============================================================================

/**
 * POST /api/email/messages/:messageId/read
 * Mark message as read/unread
 */
router.post("/api/email/messages/:messageId/read", requireAuth, async (req: any, res: Response) => {
  try {
    const { messageId } = req.params;
    const { isRead } = req.body;

    // Update in database
    await db.update(emailMessages).set({ isRead }).where(eq(emailMessages.id, messageId));

    // Update in Gmail
    const [message] = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (message?.gmailMessageId) {
      const [thread] = await db
        .select()
        .from(emailThreads)
        .where(eq(emailThreads.id, message.threadId))
        .limit(1);

      if (thread) {
        const [account] = await db
          .select()
          .from(emailAccounts)
          .where(eq(emailAccounts.id, thread.accountId))
          .limit(1);

        if (account?.accessToken && account?.refreshToken) {
          const { decryptEmailTokens } = await import("../../services/email-tokens");
          const { accessToken, refreshToken } = decryptEmailTokens(account);
          const gmail = createGmailService();
          gmail.setCredentials(accessToken, refreshToken);
          await gmail.markAsRead(message.gmailMessageId, isRead);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Email] Failed to mark as read:", error);
    res.status(500).json({ error: "Failed to update message" });
  }
});

/**
 * POST /api/email/messages/:messageId/star
 * Star or unstar a message in Gmail and update DB
 */
router.post("/api/email/messages/:messageId/star", requireAuth, async (req: any, res: Response) => {
  try {
    const { messageId } = req.params;
    const { starred } = req.body as { starred: boolean };

    const [message] = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const [thread] = await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.id, message.threadId))
      .limit(1);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, thread.accountId))
      .limit(1);
    if (!account?.accessToken || !account?.refreshToken) {
      return res.status(400).json({ error: "Account credentials missing" });
    }

    if (!message.gmailMessageId) return res.status(400).json({ error: "No Gmail message id" });
    const { decryptEmailTokens } = await import("../../services/email-tokens");
    const { accessToken, refreshToken } = decryptEmailTokens(account);
    const gmail = createGmailService();
    gmail.setCredentials(accessToken, refreshToken);
    await gmail.starMessage(message.gmailMessageId, !!starred);

    await db
      .update(emailMessages)
      .set({ isStarred: !!starred })
      .where(eq(emailMessages.id, messageId));

    res.json({ success: true });
  } catch (err) {
    console.error("[Email] Star message failed:", err);
    res.status(500).json({ error: "Failed to update star" });
  }
});

export default router;
