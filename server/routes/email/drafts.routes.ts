import type { Response } from "express";
import { Router } from "express";
import type { Request } from "express";
import { nanoid } from "nanoid";
import { db } from "../../db";
import { requireAuth } from "../../middleware/supabase-auth";
import { eq, and, desc } from "drizzle-orm";
import { emailAccounts, emailDrafts, type InsertEmailDraft } from "../../../shared/email-schema";

const router = Router();

// ============================================================================
// Draft Management Routes
// ============================================================================

/**
 * GET /api/email/drafts
 * List all drafts for user's accounts
 */
router.get("/api/email/drafts", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.user?.id || req.principal?.userId || "");
    const { accountId } = req.query;

    // Build where conditions
    const conditions = [eq(emailAccounts.userId, userId)];
    if (accountId) {
      conditions.push(eq(emailDrafts.accountId, accountId as string));
    }

    // Build query
    const results = await db
      .select()
      .from(emailDrafts)
      .innerJoin(emailAccounts, eq(emailDrafts.accountId, emailAccounts.id))
      .where(and(...conditions))
      .orderBy(desc(emailDrafts.updatedAt));

    const drafts = results.map((r) => r.email_drafts);

    res.json(drafts);
  } catch (error) {
    console.error("[Email] Failed to fetch drafts:", error);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

/**
 * GET /api/email/drafts/:id
 * Get a specific draft by ID
 */
router.get("/api/email/drafts/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.user?.id || req.principal?.userId || "");
    const { id } = req.params;

    const results = await db
      .select()
      .from(emailDrafts)
      .innerJoin(emailAccounts, eq(emailDrafts.accountId, emailAccounts.id))
      .where(and(eq(emailDrafts.id, id), eq(emailAccounts.userId, userId)))
      .limit(1);

    if (results.length === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    res.json(results[0].email_drafts);
  } catch (error) {
    console.error("[Email] Failed to fetch draft:", error);
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

/**
 * POST /api/email/drafts
 * Create or update a draft (upsert by accountId + inReplyToMessageId)
 */
router.post("/api/email/drafts", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.user?.id || req.principal?.userId || "");
    const {
      id,
      accountId,
      to,
      cc,
      bcc,
      subject,
      bodyHtml,
      bodyText,
      inReplyToMessageId,
      attachments,
    } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }

    // Verify account ownership
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .where(eq(emailAccounts.userId, userId))
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: "Account not found or unauthorized" });
    }

    const draftData: InsertEmailDraft = {
      accountId,
      to: to || [],
      cc: cc || null,
      bcc: bcc || null,
      subject: subject || "",
      bodyHtml: bodyHtml || "",
      bodyText: bodyText || null,
      inReplyToMessageId: inReplyToMessageId || null,
      gmailDraftId: null,
      attachments: attachments || null,
    };

    // If ID provided, update existing draft
    if (id) {
      const [updated] = await db
        .update(emailDrafts)
        .set({ ...draftData, updatedAt: new Date() })
        .where(eq(emailDrafts.id, id))
        .returning();

      return res.json(updated);
    }

    // Otherwise create new draft
    const draftId = nanoid();
    const [created] = await db
      .insert(emailDrafts)
      .values({ id: draftId, ...draftData })
      .returning();

    res.json(created);
  } catch (error) {
    console.error("[Email] Failed to save draft:", error);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

/**
 * DELETE /api/email/drafts/:id
 * Delete a draft
 */
router.delete("/api/email/drafts/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.user?.id || req.principal?.userId || "");
    const { id } = req.params;

    // Verify ownership before deleting
    const results = await db
      .select()
      .from(emailDrafts)
      .innerJoin(emailAccounts, eq(emailDrafts.accountId, emailAccounts.id))
      .where(and(eq(emailDrafts.id, id), eq(emailAccounts.userId, userId)))
      .limit(1);

    if (results.length === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    await db.delete(emailDrafts).where(eq(emailDrafts.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("[Email] Failed to delete draft:", error);
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

export default router;
