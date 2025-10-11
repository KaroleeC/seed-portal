/**
 * Email Sync Service
 * 
 * Handles background synchronization of Gmail messages with local database.
 * Supports both full sync (initial) and incremental sync (using Gmail historyId).
 * 
 * Features:
 * - Incremental sync via Gmail History API
 * - Efficient batching and deduplication
 * - Comprehensive error handling
 * - Sync progress tracking
 */

import { nanoid } from "nanoid";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import type { GmailService } from "./gmail-service";
import { createGmailService } from "./gmail-service";
import { decryptEmailTokens } from "./email-tokens";
import {
  emailAccounts,
  emailThreads,
  emailMessages,
  emailSyncState,
  type EmailAccount,
} from "../../shared/email-schema";
import { logger } from "../logger";

export interface SyncResult {
  success: boolean;
  accountId: string;
  threadsProcessed: number;
  messagesProcessed: number;
  syncType: "full" | "incremental";
  duration: number;
  error?: string;
}

export interface SyncOptions {
  /** Force full sync even if historyId exists */
  forceFullSync?: boolean;
  /** Maximum number of messages to fetch */
  maxResults?: number;
  /** Specific label to sync (default: all) */
  labelIds?: string[];
}

/**
 * Email Sync Service
 * Orchestrates email synchronization between Gmail and local database
 */
export class EmailSyncService {
  private gmail: GmailService;
  private accountId: string;
  private accountEmail: string;

  constructor(
    gmail: GmailService,
    accountId: string,
    accountEmail: string
  ) {
    this.gmail = gmail;
    this.accountId = accountId;
    this.accountEmail = accountEmail;
  }

  /**
   * Main sync entry point
   * Automatically chooses between full and incremental sync
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    
    logger.info({ accountId: this.accountId, accountEmail: this.accountEmail }, "Starting email sync");

    try {
      // Get current sync state
      const [syncState] = await db
        .select()
        .from(emailSyncState)
        .where(eq(emailSyncState.accountId, this.accountId))
        .limit(1);

      // Mark as syncing
      await this.updateSyncStatus("syncing");

      let result: SyncResult;

      // Determine sync type
      if (options.forceFullSync || !syncState?.historyId) {
        logger.info({ accountId: this.accountId }, "Performing FULL sync");
        result = await this.performFullSync(options);
      } else {
        logger.info({ accountId: this.accountId, historyId: syncState.historyId }, "Performing INCREMENTAL sync");
        try {
          result = await this.performIncrementalSync(syncState.historyId, options);
        } catch (error) {
          // Fallback to full sync if incremental fails
          logger.warn(
            { accountId: this.accountId, error },
            "Incremental sync failed, falling back to full sync"
          );
          result = await this.performFullSync(options);
        }
      }

      // Update sync state on success
      await this.updateSyncStatus("idle", {
        lastSyncedAt: new Date(),
        messagesSync: result.messagesProcessed,
      });

      // Update account last synced
      await db
        .update(emailAccounts)
        .set({ lastSyncedAt: new Date() })
        .where(eq(emailAccounts.id, this.accountId));

      const duration = Date.now() - startTime;
      logger.info(
        {
          accountId: this.accountId,
          syncType: result.syncType,
          threadsProcessed: result.threadsProcessed,
          messagesProcessed: result.messagesProcessed,
          duration,
        },
        "Email sync completed successfully"
      );

      return { ...result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      logger.error(
        { accountId: this.accountId, error: errorMessage, duration },
        "Email sync failed"
      );

      // Mark as failed
      await this.updateSyncStatus("error", {
        syncError: errorMessage,
      });

      return {
        success: false,
        accountId: this.accountId,
        threadsProcessed: 0,
        messagesProcessed: 0,
        syncType: "full",
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Perform full sync (fetch all recent messages)
   */
  private async performFullSync(options: SyncOptions): Promise<SyncResult> {
    const maxResults = options.maxResults || 50;
    const messages = await this.gmail.listMessages({
      maxResults,
      labelIds: options.labelIds,
    });

    const { threadsProcessed, messagesProcessed } = await this.processMessages(messages);

    // Get profile to update historyId
    const profile = await this.gmail.getProfile();
    
    // Note: Gmail profile doesn't return historyId, we need to get it from a message
    // We'll store the latest message's historyId if available
    if (messages.length > 0) {
      // Get full message to extract historyId (Gmail adds this in the response)
      const latestMsg = await this.gmail.getMessage(messages[0].id);
      // Store historyId for future incremental syncs
      // (This would need to be extracted from Gmail API response metadata)
    }

    return {
      success: true,
      accountId: this.accountId,
      threadsProcessed,
      messagesProcessed,
      syncType: "full",
      duration: 0, // Will be set by caller
    };
  }

  /**
   * Perform incremental sync using Gmail History API
   */
  private async performIncrementalSync(
    startHistoryId: string,
    options: SyncOptions
  ): Promise<SyncResult> {
    const historyResponse = await this.gmail.getHistory(startHistoryId, options.maxResults || 100);
    
    logger.info(
      { accountId: this.accountId, historyItems: historyResponse.history.length },
      "Fetched history changes"
    );

    // Extract changed message IDs from history
    const changedMessageIds = new Set<string>();
    
    for (const historyItem of historyResponse.history) {
      // messagesAdded - new messages
      if (historyItem.messagesAdded) {
        for (const added of historyItem.messagesAdded) {
          if (added.message?.id) {
            changedMessageIds.add(added.message.id);
          }
        }
      }

      // messagesDeleted - deleted messages (we'll handle separately)
      if (historyItem.messagesDeleted) {
        for (const deleted of historyItem.messagesDeleted) {
          if (deleted.message?.id) {
            // Mark as deleted in our DB
            await this.handleDeletedMessage(deleted.message.id);
          }
        }
      }

      // labelsAdded/labelsRemoved - label changes
      if (historyItem.labelsAdded) {
        for (const labeled of historyItem.labelsAdded) {
          if (labeled.message?.id) {
            changedMessageIds.add(labeled.message.id);
          }
        }
      }
      if (historyItem.labelsRemoved) {
        for (const unlabeled of historyItem.labelsRemoved) {
          if (unlabeled.message?.id) {
            changedMessageIds.add(unlabeled.message.id);
          }
        }
      }
    }

    // Fetch full details for changed messages
    const messages = await Promise.all(
      Array.from(changedMessageIds).map((id) => this.gmail.getMessage(id))
    );

    const { threadsProcessed, messagesProcessed } = await this.processMessages(messages);

    // Update historyId for next sync
    await db
      .update(emailSyncState)
      .set({ historyId: historyResponse.historyId })
      .where(eq(emailSyncState.accountId, this.accountId));

    return {
      success: true,
      accountId: this.accountId,
      threadsProcessed,
      messagesProcessed,
      syncType: "incremental",
      duration: 0, // Will be set by caller
    };
  }

  /**
   * Process messages and insert/update in database
   */
  private async processMessages(
    messages: Awaited<ReturnType<GmailService['listMessages']>>
  ): Promise<{ threadsProcessed: number; messagesProcessed: number }> {
    // Group by thread
    type Message = typeof messages[number];
    const threadMap = new Map<string, Message[]>();
    
    for (const msg of messages) {
      if (!threadMap.has(msg.threadId)) {
        threadMap.set(msg.threadId, []);
      }
      threadMap.get(msg.threadId)!.push(msg);
    }

    let threadsProcessed = 0;
    let messagesProcessed = 0;

    for (const [gmailThreadId, threadMessages] of threadMap) {
      const latestMessage = threadMessages[0]; // Most recent

      // Check if thread exists
      const [existingThread] = await db
        .select()
        .from(emailThreads)
        .where(eq(emailThreads.gmailThreadId, gmailThreadId))
        .limit(1);

      let dbThreadId: string;

      if (!existingThread) {
        // Create new thread
        dbThreadId = nanoid();
        await db.insert(emailThreads).values({
          id: dbThreadId,
          accountId: this.accountId,
          gmailThreadId,
          subject: latestMessage.subject || "(No Subject)",
          snippet: latestMessage.snippet || "",
          participants: [latestMessage.from],
          lastMessageAt: latestMessage.receivedAt,
          messageCount: threadMessages.length,
          unreadCount: threadMessages.filter((m) => !m.isRead).length,
          isStarred: latestMessage.isStarred,
          labels: latestMessage.labels,
        });
        threadsProcessed++;
      } else {
        // Update existing thread
        dbThreadId = existingThread.id;
        await db
          .update(emailThreads)
          .set({
            subject: latestMessage.subject || "(No Subject)",
            snippet: latestMessage.snippet || "",
            lastMessageAt: latestMessage.receivedAt,
            messageCount: threadMessages.length,
            unreadCount: threadMessages.filter((m) => !m.isRead).length,
            isStarred: latestMessage.isStarred,
            labels: latestMessage.labels,
            updatedAt: new Date(),
          })
          .where(eq(emailThreads.id, dbThreadId));
      }

      // Insert/update messages
      for (const msg of threadMessages) {
        const [existingMsg] = await db
          .select()
          .from(emailMessages)
          .where(eq(emailMessages.gmailMessageId, msg.id))
          .limit(1);

        if (!existingMsg) {
          const newId = nanoid();
          const [created] = await db
            .insert(emailMessages)
            .values({
              id: newId,
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
              inReplyTo: msg.inReplyTo,
              messageReferences: msg.messageReferences,
            })
            .returning({ id: emailMessages.id, threadId: emailMessages.threadId });
          messagesProcessed++;

          // Broadcast SSE 'email-received' (Phase 3.1)
          try {
            const { sseEvents } = await import("./sse-events");
            sseEvents.broadcastEmailReceived(this.accountId, {
              messageId: (created?.id as string) || newId,
              threadId: (created?.threadId as string) || dbThreadId,
              from: msg.from,
              subject: msg.subject || "",
            });
          } catch {
            // Non-fatal if SSE unavailable
          }
        } else {
          // Update existing message (labels may have changed)
          await db
            .update(emailMessages)
            .set({
              isRead: msg.isRead,
              isStarred: msg.isStarred,
              labels: msg.labels,
            })
            .where(eq(emailMessages.id, existingMsg.id));
        }
      }
    }

    return { threadsProcessed, messagesProcessed };
  }

  /**
   * Handle deleted message
   */
  private async handleDeletedMessage(gmailMessageId: string): Promise<void> {
    // Option 1: Soft delete (add TRASH label)
    await db
      .update(emailMessages)
      .set({ labels: ["TRASH"] })
      .where(eq(emailMessages.gmailMessageId, gmailMessageId));

    // Option 2: Hard delete (uncomment if preferred)
    // await db.delete(emailMessages).where(eq(emailMessages.gmailMessageId, gmailMessageId));
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(
    status: "idle" | "syncing" | "error",
    updates: Partial<{
      lastSyncedAt: Date;
      messagesSync: number;
      syncError: string;
    }> = {}
  ): Promise<void> {
    await db
      .update(emailSyncState)
      .set({
        syncStatus: status,
        updatedAt: new Date(),
        ...updates,
      })
      .where(eq(emailSyncState.accountId, this.accountId));
  }
}

/**
 * Factory function to create EmailSyncService with credentials
 */
export async function createEmailSyncService(
  accountId: string
): Promise<EmailSyncService> {
  // Get account with credentials
  const [account] = await db
    .select()
    .from(emailAccounts)
    .where(eq(emailAccounts.id, accountId))
    .limit(1);

  if (!account) {
    throw new Error(`Email account not found: ${accountId}`);
  }

  if (!account.accessToken || !account.refreshToken) {
    throw new Error(`Email account credentials missing: ${accountId}`);
  }

  // Decrypt tokens and create Gmail service
  const { accessToken, refreshToken } = decryptEmailTokens(account);
  const gmail = createGmailService();
  gmail.setCredentials(accessToken, refreshToken);

  return new EmailSyncService(gmail, accountId, account.email);
}

/**
 * Convenience function to sync a single account
 */
export async function syncEmailAccount(
  accountId: string,
  options?: SyncOptions
): Promise<SyncResult> {
  const syncService = await createEmailSyncService(accountId);
  return syncService.sync(options);
}
