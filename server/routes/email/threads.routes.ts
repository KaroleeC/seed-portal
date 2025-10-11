import type { Response } from "express";
import { Router } from "express";
import { db } from "../../db";
import { createGmailService } from "../../services/gmail-service";
import { requireAuth } from "../../middleware/supabase-auth";
import { eq, desc } from "drizzle-orm";
import { emailAccounts, emailThreads, emailMessages } from "../../../shared/email-schema";
import { withETag } from "../../middleware/etag.js";

const router = Router();

// ============================================================================
// Thread Operations Routes
// ============================================================================

/**
 * GET /api/email/threads
 * List email threads for an account
 *
 * Cacheable: ETag enabled with 1-minute cache
 */
router.get(
  "/api/email/threads",
  requireAuth,
  withETag({ maxAge: 60 }),
  async (req: any, res: Response) => {
    try {
      const accountId = req.query.accountId as string;
      const label = req.query.label as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!accountId) {
        return res.status(400).json({ error: "accountId required" });
      }

      // Base query
      const query = db
        .select()
        .from(emailThreads)
        .where(eq(emailThreads.accountId, accountId))
        .orderBy(desc(emailThreads.lastMessageAt))
        .limit(limit);

      // Filter threads based on label
      const threads = await query;

      // Apply label filtering (Gmail labels are stored in the labels array)
      let filteredThreads = threads;

      if (label) {
        switch (label) {
          case "INBOX":
            // Threads that have INBOX label and are not in trash
            filteredThreads = threads.filter(
              (t) => t.labels?.includes("INBOX") && !t.labels?.includes("TRASH")
            );
            break;

          case "SENT":
            // Threads with SENT label
            filteredThreads = threads.filter((t) => t.labels?.includes("SENT"));
            break;

          case "STARRED":
            // Starred threads (any folder)
            filteredThreads = threads.filter((t) => t.isStarred === true);
            break;

          case "TRASH":
            // Threads in trash
            filteredThreads = threads.filter((t) => t.labels?.includes("TRASH"));
            break;

          case "ARCHIVE":
            // Threads that don't have INBOX but aren't in TRASH or SENT
            filteredThreads = threads.filter(
              (t) =>
                !t.labels?.includes("INBOX") &&
                !t.labels?.includes("TRASH") &&
                !t.labels?.includes("SENT") &&
                !t.labels?.includes("DRAFT")
            );
            break;

          case "LEADS": {
            // Threads linked to leads in LEADIQ
            // Query email_thread_leads to get linked thread IDs
            const linkedThreadsQuery = await db.query(
              `
            SELECT DISTINCT thread_id
            FROM email_thread_leads
            WHERE thread_id = ANY($1)
          `,
              [threads.map((t) => t.id)]
            );

            const linkedThreadIds = new Set(linkedThreadsQuery.rows.map((r) => r.thread_id));
            filteredThreads = threads.filter((t) => linkedThreadIds.has(t.id));
            break;
          }

          case "INBOX_LEADS":
            // Custom filter for leads (example: emails with certain labels/tags)
            filteredThreads = threads.filter(
              (t) =>
                t.labels?.includes("INBOX") &&
                !t.labels?.includes("TRASH") &&
                t.labels?.includes("CATEGORY_PROMOTIONS") // Customize based on your needs
            );
            break;

          case "INBOX_CLIENTS":
            // Custom filter for clients
            filteredThreads = threads.filter(
              (t) =>
                t.labels?.includes("INBOX") &&
                !t.labels?.includes("TRASH") &&
                t.labels?.includes("IMPORTANT") // Customize based on your needs
            );
            break;

          default:
            // Custom label filtering
            filteredThreads = threads.filter((t) => t.labels?.includes(label));
        }
      }

      res.json(filteredThreads);
    } catch (error) {
      console.error("[Email] Failed to fetch threads:", error);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  }
);

/**
 * GET /api/email/threads/:threadId
 * Get thread with all messages
 */
router.get("/api/email/threads/:threadId", requireAuth, async (req: any, res: Response) => {
  try {
    const { threadId } = req.params;

    // Get thread
    const [thread] = await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.id, threadId))
      .limit(1);

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    // Get all messages in thread
    const messages = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.threadId, threadId))
      .orderBy(emailMessages.sentAt);

    res.json({ thread, messages });
  } catch (error) {
    console.error("[Email] Failed to fetch thread:", error);
    res.status(500).json({ error: "Failed to fetch thread" });
  }
});

/**
 * POST /api/email/threads/:threadId/archive
 * Remove INBOX label from all messages in the thread
 */
router.post(
  "/api/email/threads/:threadId/archive",
  requireAuth,
  async (req: any, res: Response) => {
    try {
      const { threadId } = req.params;

      const [thread] = await db
        .select()
        .from(emailThreads)
        .where(eq(emailThreads.id, threadId))
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

      const { decryptEmailTokens } = await import("../../services/email-tokens");
      const { accessToken, refreshToken } = decryptEmailTokens(account);
      const gmail = createGmailService();
      gmail.setCredentials(accessToken, refreshToken);

      const msgs = await db
        .select()
        .from(emailMessages)
        .where(eq(emailMessages.threadId, threadId));

      await Promise.all(
        msgs
          .filter((m: any) => !!m.gmailMessageId)
          .map((m: any) => gmail.modifyMessageLabels(m.gmailMessageId as string, [], ["INBOX"]))
      );

      res.json({ success: true });
    } catch (err) {
      console.error("[Email] Archive thread failed:", err);
      res.status(500).json({ error: "Failed to archive thread" });
    }
  }
);

/**
 * DELETE /api/email/threads/:threadId
 * Move all messages in the thread to Trash in Gmail
 */
router.delete("/api/email/threads/:threadId", requireAuth, async (req: any, res: Response) => {
  try {
    const { threadId } = req.params;

    const [thread] = await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.id, threadId))
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

    const { decryptEmailTokens } = await import("../../services/email-tokens");
    const { accessToken, refreshToken } = decryptEmailTokens(account);
    const gmail = createGmailService();
    gmail.setCredentials(accessToken, refreshToken);

    const msgs = await db.select().from(emailMessages).where(eq(emailMessages.threadId, threadId));

    await Promise.all(
      msgs
        .filter((m: any) => !!m.gmailMessageId)
        .map((m: any) => gmail.trashMessage(m.gmailMessageId as string))
    );

    res.json({ success: true });
  } catch (err) {
    console.error("[Email] Delete thread failed:", err);
    res.status(500).json({ error: "Failed to delete thread" });
  }
});

/**
 * POST /api/email/threads/:threadId/star
 * Toggle starred status for a thread
 */
router.post("/api/email/threads/:threadId/star", requireAuth, async (req: any, res: Response) => {
  try {
    const { threadId } = req.params;
    const { starred } = req.body;

    const [thread] = await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.id, threadId))
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

    const { decryptEmailTokens } = await import("../../services/email-tokens");
    const { accessToken, refreshToken } = decryptEmailTokens(account);
    const gmail = createGmailService();
    gmail.setCredentials(accessToken, refreshToken);

    const msgs = await db.select().from(emailMessages).where(eq(emailMessages.threadId, threadId));

    // Star/unstar all messages in thread
    await Promise.all(
      msgs
        .filter((m: any) => !!m.gmailMessageId)
        .map((m: any) => gmail.starMessage(m.gmailMessageId as string, starred))
    );

    // Update local database
    await db.update(emailThreads).set({ isStarred: starred }).where(eq(emailThreads.id, threadId));

    res.json({ success: true, starred });
  } catch (err) {
    console.error("[Email] Star thread failed:", err);
    res.status(500).json({ error: "Failed to star thread" });
  }
});

/**
 * POST /api/email/threads/:threadId/restore
 * Restore email from trash (remove TRASH label, add INBOX label)
 */
router.post(
  "/api/email/threads/:threadId/restore",
  requireAuth,
  async (req: any, res: Response) => {
    try {
      const { threadId } = req.params;

      const [thread] = await db
        .select()
        .from(emailThreads)
        .where(eq(emailThreads.id, threadId))
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

      const { decryptEmailTokens } = await import("../../services/email-tokens");
      const { accessToken, refreshToken } = decryptEmailTokens(account);
      const gmail = createGmailService();
      gmail.setCredentials(accessToken, refreshToken);

      const msgs = await db
        .select()
        .from(emailMessages)
        .where(eq(emailMessages.threadId, threadId));

      // Remove TRASH label and add INBOX label
      await Promise.all(
        msgs
          .filter((m: any) => !!m.gmailMessageId)
          .map((m: any) =>
            gmail.modifyMessageLabels(m.gmailMessageId as string, ["INBOX"], ["TRASH"])
          )
      );

      res.json({ success: true });
    } catch (err) {
      console.error("[Email] Restore thread failed:", err);
      res.status(500).json({ error: "Failed to restore thread" });
    }
  }
);

export default router;
