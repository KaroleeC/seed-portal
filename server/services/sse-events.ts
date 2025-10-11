/**
 * Server-Sent Events (SSE) Service
 * 
 * Manages SSE connections for real-time push notifications.
 * Emits granular events for delta updates (thread-created, thread-updated, etc.)
 * 
 * Performance: Enables client-side delta updates instead of full query invalidation.
 */

import type { Response } from "express";
import { logger } from "../logger";
import {
  SSEEventType,
  createSSEEvent,
  type ThreadCreatedEvent,
  type ThreadUpdatedEvent,
  type ThreadDeletedEvent,
  type UnreadCountUpdatedEvent,
  type MessageCreatedEvent,
  type DraftSavedEvent,
  type DraftDeletedEvent,
  type EmailSentEvent,
  type SyncCompletedEvent,
} from "../../shared/email-events";

interface SSEClient {
  accountId: string;
  userId: string;
  response: Response;
  connectedAt: Date;
}

class SSEEventEmitter {
  private clients: Map<string, Set<SSEClient>> = new Map();

  /**
   * Register a new SSE client connection
   */
  addClient(accountId: string, userId: string, response: Response): void {
    // Initialize set for this account if needed
    if (!this.clients.has(accountId)) {
      this.clients.set(accountId, new Set());
    }

    const client: SSEClient = {
      accountId,
      userId,
      response,
      connectedAt: new Date(),
    };

    this.clients.get(accountId)!.add(client);

    logger.info(
      { accountId, userId, totalClients: this.clients.get(accountId)!.size },
      "SSE client connected"
    );

    // Remove client on connection close
    response.on("close", () => {
      this.removeClient(accountId, client);
    });
  }

  /**
   * Remove a client connection
   */
  private removeClient(accountId: string, client: SSEClient): void {
    const accountClients = this.clients.get(accountId);
    if (accountClients) {
      accountClients.delete(client);
      
      // Clean up empty sets
      if (accountClients.size === 0) {
        this.clients.delete(accountId);
      }

      logger.info(
        { accountId, userId: client.userId, remainingClients: accountClients.size },
        "SSE client disconnected"
      );
    }
  }

  /**
   * Broadcast sync completion event to all clients for an account
   */
  broadcastSyncCompleted(accountId: string, data: {
    syncType: "full" | "incremental";
    threadsProcessed: number;
    messagesProcessed: number;
    duration: number;
  }): void {
    const accountClients = this.clients.get(accountId);
    
    if (!accountClients || accountClients.size === 0) {
      logger.debug({ accountId }, "No SSE clients to notify for sync completion");
      return;
    }

    const event = {
      type: "sync-completed",
      data,
      timestamp: new Date().toISOString(),
    };

    const deadClients: SSEClient[] = [];

    // Send to all connected clients for this account
    for (const client of accountClients) {
      try {
        client.response.write(`event: sync-completed\n`);
        client.response.write(`data: ${JSON.stringify(event.data)}\n\n`);
        
        logger.debug(
          { accountId, userId: client.userId },
          "SSE sync-completed event sent"
        );
      } catch (error) {
        logger.error(
          { error, accountId, userId: client.userId },
          "Failed to send SSE event, marking client as dead"
        );
        deadClients.push(client);
      }
    }

    // Clean up dead clients
    deadClients.forEach((client) => this.removeClient(accountId, client));

    logger.info(
      { accountId, clientCount: accountClients.size, ...data },
      "Broadcasted sync-completed event via SSE"
    );
  }

  /**
   * Broadcast email received event (Phase 3.1)
   */
  broadcastEmailReceived(accountId: string, data: {
    messageId: string;
    threadId: string;
    from: string;
    subject: string;
  }): void {
    this.broadcastEvent(accountId, "email-received", data);
  }

  /**
   * Broadcast draft saved event (Phase 3.1)
   */
  broadcastDraftSaved(accountId: string, data: {
    draftId: string;
    subject: string;
  }): void {
    this.broadcastEvent(accountId, "draft-saved", data);
  }

  /**
   * Broadcast email deleted event (Phase 3.1 - legacy)
   */
  broadcastEmailDeleted(accountId: string, data: {
    messageId: string;
    threadId: string;
  }): void {
    this.broadcastEvent(accountId, "email-deleted", data);
  }

  /**
   * Broadcast thread created event (granular delta update)
   */
  broadcastThreadCreated(accountId: string, thread: ThreadCreatedEvent["thread"]): void {
    const event = createSSEEvent<ThreadCreatedEvent>(
      SSEEventType.THREAD_CREATED,
      accountId,
      { thread }
    );
    this.broadcastEvent(accountId, SSEEventType.THREAD_CREATED, event);
  }

  /**
   * Broadcast thread updated event (granular delta update)
   */
  broadcastThreadUpdated(
    accountId: string,
    threadId: string,
    changes: ThreadUpdatedEvent["changes"]
  ): void {
    const event = createSSEEvent<ThreadUpdatedEvent>(
      SSEEventType.THREAD_UPDATED,
      accountId,
      { threadId, changes }
    );
    this.broadcastEvent(accountId, SSEEventType.THREAD_UPDATED, event);
  }

  /**
   * Broadcast thread deleted event (granular delta update)
   */
  broadcastThreadDeleted(accountId: string, threadId: string, gmailThreadId: string): void {
    const event = createSSEEvent<ThreadDeletedEvent>(
      SSEEventType.THREAD_DELETED,
      accountId,
      { threadId, gmailThreadId }
    );
    this.broadcastEvent(accountId, SSEEventType.THREAD_DELETED, event);
  }

  /**
   * Broadcast unread count updated event (granular delta update)
   */
  broadcastUnreadCountUpdated(
    accountId: string,
    unreadCount: number,
    previousCount: number
  ): void {
    const event = createSSEEvent<UnreadCountUpdatedEvent>(
      SSEEventType.UNREAD_COUNT_UPDATED,
      accountId,
      {
        unreadCount,
        previousCount,
        delta: unreadCount - previousCount,
      }
    );
    this.broadcastEvent(accountId, SSEEventType.UNREAD_COUNT_UPDATED, event);
  }

  /**
   * Broadcast message created event (granular delta update)
   */
  broadcastMessageCreated(accountId: string, message: MessageCreatedEvent["message"]): void {
    const event = createSSEEvent<MessageCreatedEvent>(
      SSEEventType.MESSAGE_CREATED,
      accountId,
      { message }
    );
    this.broadcastEvent(accountId, SSEEventType.MESSAGE_CREATED, event);
  }

  /**
   * Broadcast draft saved event (typed)
   */
  broadcastDraftSavedTyped(accountId: string, draft: DraftSavedEvent["draft"]): void {
    const event = createSSEEvent<DraftSavedEvent>(
      SSEEventType.DRAFT_SAVED,
      accountId,
      { draft }
    );
    this.broadcastEvent(accountId, SSEEventType.DRAFT_SAVED, event);
  }

  /**
   * Broadcast draft deleted event (typed)
   */
  broadcastDraftDeletedTyped(accountId: string, draftId: string): void {
    const event = createSSEEvent<DraftDeletedEvent>(
      SSEEventType.DRAFT_DELETED,
      accountId,
      { draftId }
    );
    this.broadcastEvent(accountId, SSEEventType.DRAFT_DELETED, event);
  }

  /**
   * Broadcast email sent event
   */
  broadcastEmailSent(
    accountId: string,
    messageId: string,
    threadId: string,
    to: string,
    subject: string
  ): void {
    const event = createSSEEvent<EmailSentEvent>(
      SSEEventType.EMAIL_SENT,
      accountId,
      { messageId, threadId, to, subject }
    );
    this.broadcastEvent(accountId, SSEEventType.EMAIL_SENT, event);
  }

  /**
   * Generic broadcast helper for all event types
   */
  private broadcastEvent(accountId: string, eventType: string, data: any): void {
    const accountClients = this.clients.get(accountId);
    
    if (!accountClients || accountClients.size === 0) {
      logger.debug({ accountId, eventType }, `No SSE clients to notify for ${eventType}`);
      return;
    }

    const deadClients: SSEClient[] = [];

    for (const client of accountClients) {
      try {
        client.response.write(`event: ${eventType}\n`);
        client.response.write(`data: ${JSON.stringify(data)}\n\n`);
        
        logger.debug(
          { accountId, userId: client.userId, eventType },
          `SSE ${eventType} event sent`
        );
      } catch (error) {
        logger.error(
          { error, accountId, userId: client.userId, eventType },
          `Failed to send SSE ${eventType} event`
        );
        deadClients.push(client);
      }
    }

    // Clean up dead clients
    deadClients.forEach((client) => this.removeClient(accountId, client));

    logger.info(
      { accountId, clientCount: accountClients.size, eventType },
      `Broadcasted ${eventType} event via SSE`
    );
  }

  /**
   * Send heartbeat to all connected clients
   * Keeps connections alive and detects dead connections
   */
  sendHeartbeat(): void {
    const deadClients: { accountId: string; client: SSEClient }[] = [];

    for (const [accountId, accountClients] of this.clients.entries()) {
      for (const client of accountClients) {
        try {
          // SSE comment (ignored by EventSource, keeps connection alive)
          client.response.write(`: heartbeat\n\n`);
        } catch (error) {
          deadClients.push({ accountId, client });
        }
      }
    }

    // Clean up dead clients
    deadClients.forEach(({ accountId, client }) => this.removeClient(accountId, client));

    if (this.getTotalClientCount() > 0) {
      logger.debug(
        { totalClients: this.getTotalClientCount() },
        "Heartbeat sent to all SSE clients"
      );
    }
  }

  /**
   * Get total number of connected clients across all accounts
   */
  getTotalClientCount(): number {
    let total = 0;
    for (const accountClients of this.clients.values()) {
      total += accountClients.size;
    }
    return total;
  }

  /**
   * Get number of connected clients for a specific account
   */
  getAccountClientCount(accountId: string): number {
    return this.clients.get(accountId)?.size || 0;
  }
}

// Singleton instance
export const sseEvents = new SSEEventEmitter();

// Start heartbeat interval (every 30 seconds)
setInterval(() => {
  sseEvents.sendHeartbeat();
}, 30000);

logger.info("SSE Event Emitter initialized with 30s heartbeat");
