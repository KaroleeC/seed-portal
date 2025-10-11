/**
 * SeedMail API Routes
 * Gmail integration, email syncing, and sending
 */

import type { Request, Response } from "express";
import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db";
import { createGmailService } from "../services/gmail-service";
import { createEmailSendService } from "../services/email-send.service";
import { requireAuth } from "../middleware/supabase-auth";
import { eq } from "drizzle-orm";
import {
  emailAccounts,
  emailThreads,
  emailMessages,
  emailSyncState,
} from "../../shared/email-schema";
import { users } from "../../shared/schema";
import trackingRoutes from "./email/tracking.routes.js";
import threadsRoutes from "./email/threads.routes.js";
import messagesRoutes from "./email/messages.routes.js";
import draftsRoutes from "./email/drafts.routes.js";
import leadLinkingRoutes from "./email/lead-linking.routes.js";

const router = Router();

// In-memory storage for OAuth states
const oauthStates = new Map<string, { userId: string; createdAt: number }>();

// Clean up expired states every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    for (const [state, data] of oauthStates.entries()) {
      if (now - data.createdAt > tenMinutes) {
        oauthStates.delete(state);
      }
    }
  },
  10 * 60 * 1000
);

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * GET /api/email/oauth/start
 * Initiate Gmail OAuth flow
 */
router.get("/api/email/oauth/start", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.user?.id || req.principal?.userId || "");
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const gmail = createGmailService();
    const state = nanoid(); // CSRF protection
    // Store state for verification
    oauthStates.set(state, { userId, createdAt: Date.now() });
    const authUrl = gmail.getAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error("[Email OAuth] Failed to start OAuth:", error);
    res.status(500).json({ error: "Failed to initiate OAuth" });
  }
});

/**
 * GET /api/email/oauth/callback
 * Handle Gmail OAuth callback
 */
router.get("/api/email/oauth/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).send("Missing authorization code");
    }

    if (!state || typeof state !== "string") {
      return res.status(400).send("Missing state parameter");
    }

    // Verify state (CSRF protection)
    const stateData = oauthStates.get(state);
    if (!stateData) {
      return res.status(400).send("Invalid or expired state parameter");
    }

    // Clean up used state
    oauthStates.delete(state);

    const gmail = createGmailService();
    const tokens = await gmail.getTokensFromCode(code);

    // Set credentials and get profile
    gmail.setCredentials(tokens.access_token, tokens.refresh_token);
    const profile = await gmail.getProfile();

    // Store account in database
    const accountId = nanoid();
    const userId = stateData.userId;

    // Import encryption utilities
    const { encryptToken } = await import("@shared/encryption");

    const account: InsertEmailAccount = {
      userId,
      email: profile.emailAddress,
      provider: "google",
      accessToken: encryptToken(tokens.access_token), // ✅ ENCRYPTED
      refreshToken: encryptToken(tokens.refresh_token), // ✅ ENCRYPTED
      tokenExpiresAt: new Date(tokens.expiry_date),
      syncEnabled: true,
      lastSyncedAt: null,
      meta: { messagesTotal: profile.messagesTotal, threadsTotal: profile.threadsTotal },
    };

    await db.insert(emailAccounts).values({ id: accountId, ...account });

    // Initialize sync state
    await db.insert(emailSyncState).values({
      id: nanoid(),
      accountId,
      syncStatus: "idle",
      messagesSync: 0,
      totalMessages: profile.messagesTotal,
    });

    // Queue initial sync job
    try {
      const { scheduleEmailSync } = await import("../workers/graphile-worker");
      const { logger } = await import("../logger");
      await scheduleEmailSync(accountId, { forceFullSync: true, intervalMinutes: 0 });
      logger.info({ accountId }, "Initial sync job queued for new account");
    } catch (error) {
      const { logger } = await import("../logger");
      logger.error({ error, accountId }, "Failed to queue initial sync");
      // Non-fatal - user can manually sync
    }

    // Redirect to SeedMail
    res.redirect("/apps/seedmail");
  } catch (error) {
    console.error("[Email OAuth] Callback error:", error);
    res.status(500).send("OAuth failed");
  }
});

// ============================================================================
// Account Management
// ============================================================================

/**
 * GET /api/email/accounts
 * List connected email accounts
 */
router.get("/api/email/accounts", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.user?.id || req.principal?.userId || "");
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const accounts = await db
      .select({
        id: emailAccounts.id,
        email: emailAccounts.email,
        provider: emailAccounts.provider,
        lastSyncedAt: emailAccounts.lastSyncedAt,
        syncEnabled: emailAccounts.syncEnabled,
        createdAt: emailAccounts.createdAt,
      })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId));

    res.json(accounts);
  } catch (error) {
    console.error("[Email] Failed to fetch accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// ============================================================================
// Email Sending
// ============================================================================

/**
 * POST /api/email/send
 * Send email via Mailgun
 */
router.post("/api/email/send", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      accountId,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      inReplyToMessageId,
      attachments,
      sendAt,
      trackingEnabled,
      draftId,
    } = req.body as {
      accountId: string;
      to: string[] | string;
      cc?: string[];
      bcc?: string[];
      subject: string;
      html?: string;
      text?: string;
      inReplyToMessageId?: string;
      attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }>;
      sendAt?: string;
      trackingEnabled?: boolean;
      draftId?: string;
    };

    if (!accountId || !to || !subject) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get account
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Get user's email signature if enabled
    const userId = String(req.user?.id || req.principal?.userId || "");
    const [user] = await db
      .select({
        emailSignatureHtml: users.emailSignatureHtml,
        emailSignatureEnabled: users.emailSignatureEnabled,
      })
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    // Append signature to HTML body if enabled
    let finalHtml = html || "";

    if (user?.emailSignatureEnabled && user?.emailSignatureHtml && finalHtml) {
      finalHtml += `<br/><br/>${user.emailSignatureHtml}`;
      console.log("[Email] Pre-rendered signature appended");
    }

    // Get reply context if replying
    let inReplyTo: string | undefined;
    let references: string[] | undefined;

    if (inReplyToMessageId) {
      const [replyToMessage] = await db
        .select()
        .from(emailMessages)
        .where(eq(emailMessages.id, inReplyToMessageId))
        .limit(1);

      if (replyToMessage) {
        inReplyTo = replyToMessage.headers?.["message-id"] as string;
        references = replyToMessage.messageReferences || [];
        if (inReplyTo) references!.push(inReplyTo);
      }
    }

    // Get threadId if replying to a message
    let threadId: string | undefined;
    if (inReplyToMessageId) {
      const [replyToMessage] = await db
        .select({ gmailThreadId: emailMessages.gmailMessageId, threadId: emailMessages.threadId })
        .from(emailMessages)
        .where(eq(emailMessages.id, inReplyToMessageId))
        .limit(1);

      if (replyToMessage) {
        // Try to get the Gmail thread ID from the thread record
        const [threadRecord] = await db
          .select({ gmailThreadId: emailThreads.gmailThreadId })
          .from(emailThreads)
          .where(eq(emailThreads.id, replyToMessage.threadId))
          .limit(1);

        if (threadRecord?.gmailThreadId) {
          threadId = threadRecord.gmailThreadId;
        }
      }
    }

    // Create email send service with decrypted credentials
    const { decryptEmailTokens } = await import("../services/email-tokens");
    const { accessToken, refreshToken } = decryptEmailTokens(account as any);
    const emailSendService = createEmailSendService(accessToken, refreshToken);

    // Optional scheduling (in-memory best-effort)
    const when = sendAt ? new Date(sendAt) : undefined;
    if (when && !isNaN(when.getTime()) && when.getTime() > Date.now() + 2000) {
      const scheduledResult = await emailSendService.scheduleEmail(
        {
          accountEmail: account.email,
          to: Array.isArray(to) ? to : [to],
          cc,
          bcc,
          subject,
          html: finalHtml,
          text,
          inReplyTo,
          references,
          threadId,
          attachments,
          trackingEnabled,
          draftId, // Link to draft for retry support
        },
        when
      );
      return res.json({ success: true, ...scheduledResult });
    }

    // Send immediately
    const result = await emailSendService.sendEmail({
      accountEmail: account.email,
      to: Array.isArray(to) ? to : [to],
      cc,
      bcc,
      subject,
      html: finalHtml,
      text,
      inReplyTo,
      references,
      threadId,
      attachments,
      trackingEnabled,
      draftId, // Link to draft for retry support
    });

    res.json({ success: true, messageId: result.id, statusId: result.statusId });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("[Email] Failed to send email:", error);
    // eslint-disable-next-line no-console
    console.error("[Email] Error details:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
    });
    res.status(500).json({ error: "Failed to send email", details: error?.message });
  }
});

// ============================================================================
// Sync
// ============================================================================

/**
 * POST /api/email/sync
 * Trigger manual sync for an account
 * Now delegates to the email sync service
 */
router.post("/api/email/sync", requireAuth, async (req: Request, res: Response) => {
  try {
    const { accountId, forceFullSync } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: "accountId required" });
    }

    // Verify account exists
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Option 1: Queue via worker (preferred for background processing)
    try {
      const { queueJob } = await import("../workers/graphile-worker");
      await queueJob("email-sync", { accountId, forceFullSync });

      return res.json({
        success: true,
        message: "Sync queued",
        queued: true,
      });
    } catch (queueError) {
      // Fallback: Run sync directly if worker not available
      const { logger } = await import("../logger");
      logger.warn({ error: queueError, accountId }, "Worker not available, running sync directly");
    }

    // Option 2: Direct execution (fallback)
    const { syncEmailAccount } = await import("../services/email-sync.service");

    // Run in background (non-blocking)
    res.json({ success: true, message: "Sync started", queued: false });

    // Execute sync asynchronously
    syncEmailAccount(accountId, { forceFullSync }).catch(async (error) => {
      const { logger } = await import("../logger");
      logger.error({ error, accountId }, "Manual sync failed");
    });
  } catch (error) {
    const { logger } = await import("../logger");
    logger.error({ error }, "Failed to start sync");
    res.status(500).json({ error: "Failed to start sync" });
  }
});

// ============================================================================
// Mount Sub-Routers
// ============================================================================

// Thread operations (list, get, archive, delete, star, restore)
router.use(threadsRoutes);

// Message operations (read/unread, star)
router.use(messagesRoutes);

// Draft operations (create, update, delete)
router.use(draftsRoutes);

// Lead linking operations (link/unlink threads to CRM leads)
router.use("/api/email/lead-linking", leadLinkingRoutes);

// Tracking operations (open, link clicks)
router.use(trackingRoutes);

/**
 * GET /api/email/debug/signature
 * Debug endpoint to check user's signature
 */
router.get("/api/email/debug/signature", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = String(req.user?.id || req.principal?.userId || "");
    const [user] = await db
      .select({
        emailSignature: users.emailSignature,
        emailSignatureEnabled: users.emailSignatureEnabled,
      })
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    res.json({
      userId,
      signatureEnabled: user?.emailSignatureEnabled,
      signatureExists: !!user?.emailSignature,
      signatureLength: user?.emailSignature?.length || 0,
      signaturePreview: user?.emailSignature?.substring(0, 200),
      signatureFull: user?.emailSignature,
    });
  } catch (error) {
    console.error("[Email Debug] Failed to get signature:", error);
    res.status(500).json({ error: "Failed to get signature" });
  }
});

export default router;
