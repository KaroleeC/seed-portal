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

const router = Router();

// Temporary in-memory storage for OAuth states (TODO: move to Redis in production)
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
    });

    res.json({ success: true, messageId: result.id });
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
 * Trigger sync for an account
 */
router.post("/api/email/sync", requireAuth, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: "accountId required" });
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

    // Mark as syncing
    await db
      .update(emailSyncState)
      .set({ syncStatus: "syncing", updatedAt: new Date() })
      .where(eq(emailSyncState.accountId, accountId));

    // Return immediately - sync in background
    res.json({ success: true, message: "Sync started" });

    // Sync in background (non-blocking)
    (async () => {
      try {
        const { decryptEmailTokens } = await import("../services/email-tokens");
        const { accessToken, refreshToken } = decryptEmailTokens(account);
        const gmail = createGmailService();
        gmail.setCredentials(accessToken, refreshToken);

        // Fetch recent messages (last 50)
        const messages = await gmail.listMessages({ maxResults: 50 });

        // eslint-disable-next-line no-console
        console.log(`[Email Sync] Fetched ${messages.length} messages for ${account.email}`);

        // Group by thread and insert
        type Message = Awaited<ReturnType<typeof gmail.listMessages>>[number];
        const threadMap = new Map<string, Message[]>();
        for (const msg of messages) {
          if (!threadMap.has(msg.threadId)) {
            threadMap.set(msg.threadId, []);
          }
          threadMap.get(msg.threadId)!.push(msg);
        }

        let threadsInserted = 0;
        let messagesInserted = 0;

        for (const [threadId, threadMessages] of threadMap) {
          const latestMessage = threadMessages[0]; // Most recent

          // Check if thread exists
          const existingThread = await db
            .select()
            .from(emailThreads)
            .where(eq(emailThreads.gmailThreadId, threadId))
            .limit(1);

          let dbThreadId: string;

          if (existingThread.length === 0) {
            // Create thread
            dbThreadId = nanoid();
            await db.insert(emailThreads).values({
              id: dbThreadId,
              accountId: account.id,
              gmailThreadId: threadId,
              subject: latestMessage.subject || "(No Subject)",
              snippet: latestMessage.snippet || "",
              participants: [latestMessage.from],
              lastMessageAt: latestMessage.receivedAt,
              messageCount: threadMessages.length,
              unreadCount: threadMessages.filter((m) => !m.isRead).length,
              isStarred: latestMessage.isStarred,
              labels: latestMessage.labels,
            });
            threadsInserted++;
          } else {
            dbThreadId = existingThread[0].id;
          }

          // Insert messages
          for (const msg of threadMessages) {
            // Check if message exists
            const existingMsg = await db
              .select()
              .from(emailMessages)
              .where(eq(emailMessages.gmailMessageId, msg.id))
              .limit(1);

            if (existingMsg.length === 0) {
              await db.insert(emailMessages).values({
                id: nanoid(),
                threadId: dbThreadId,
                gmailMessageId: msg.id,
                from: msg.from,
                to: msg.to,
                cc: msg.cc,
                subject: msg.subject || "",
                bodyHtml: msg.bodyHtml,
                bodyText: msg.bodyText,
                snippet: msg.snippet,
                isRead: msg.isRead,
                isStarred: msg.isStarred,
                labels: msg.labels,
                sentAt: msg.sentAt,
                receivedAt: msg.receivedAt,
                headers: msg.headers,
              });
              messagesInserted++;
            }
          }
        }

        // Update sync state
        await db
          .update(emailSyncState)
          .set({
            syncStatus: "idle",
            lastSyncedAt: new Date(),
            messagesSync: messagesInserted,
            updatedAt: new Date(),
          })
          .where(eq(emailSyncState.accountId, accountId));

        // Update account last synced
        await db
          .update(emailAccounts)
          .set({ lastSyncedAt: new Date() })
          .where(eq(emailAccounts.id, accountId));

        // eslint-disable-next-line no-console
        console.log(
          `[Email Sync] Complete: ${threadsInserted} threads, ${messagesInserted} messages`
        );
      } catch (syncError) {
        // eslint-disable-next-line no-console
        console.error("[Email Sync] Background sync failed:", syncError);

        // Mark as failed
        await db
          .update(emailSyncState)
          .set({
            syncStatus: "error",
            lastError: syncError instanceof Error ? syncError.message : "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(emailSyncState.accountId, accountId));
      }
    })();
  } catch (error) {
    console.error("[Email] Failed to start sync:", error);
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

// Draft management (list, get, create, update, delete)
router.use(draftsRoutes);

// Email tracking routes (pixels, opens, send status)
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
