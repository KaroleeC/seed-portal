/**
 * Email SSE Event Types
 *
 * Centralized event definitions for Server-Sent Events.
 * Shared between server (emitter) and client (consumer).
 *
 * DRY Principle: Single source of truth for all SSE event shapes.
 */

/**
 * Base SSE event structure
 */
export interface BaseSSEEvent {
  accountId: string;
  timestamp: string;
}

/**
 * Sync completion event (legacy - kept for compatibility)
 */
export interface SyncCompletedEvent extends BaseSSEEvent {
  syncType: "full" | "incremental";
  threadsProcessed: number;
  messagesProcessed: number;
  duration: number;
}

/**
 * Thread created event (granular)
 */
export interface ThreadCreatedEvent extends BaseSSEEvent {
  thread: {
    id: string;
    gmailThreadId: string;
    subject: string;
    from: string;
    to: string;
    snippet: string;
    lastMessageDate: string;
    unread: boolean;
    labels: string[];
  };
}

/**
 * Thread updated event (granular)
 */
export interface ThreadUpdatedEvent extends BaseSSEEvent {
  threadId: string;
  changes: {
    subject?: string;
    snippet?: string;
    lastMessageDate?: string;
    unread?: boolean;
    labels?: string[];
  };
}

/**
 * Thread deleted event (granular)
 */
export interface ThreadDeletedEvent extends BaseSSEEvent {
  threadId: string;
  gmailThreadId: string;
}

/**
 * Unread count updated event (granular)
 */
export interface UnreadCountUpdatedEvent extends BaseSSEEvent {
  unreadCount: number;
  previousCount: number;
  delta: number;
}

/**
 * Message created event (granular)
 */
export interface MessageCreatedEvent extends BaseSSEEvent {
  message: {
    id: string;
    gmailMessageId: string;
    threadId: string;
    from: string;
    to: string;
    subject: string;
    snippet: string;
    date: string;
    unread: boolean;
  };
}

/**
 * Draft saved event
 */
export interface DraftSavedEvent extends BaseSSEEvent {
  draft: {
    id: string;
    subject: string;
    to: string;
    snippet: string;
  };
}

/**
 * Draft deleted event
 */
export interface DraftDeletedEvent extends BaseSSEEvent {
  draftId: string;
}

/**
 * Email sent event
 */
export interface EmailSentEvent extends BaseSSEEvent {
  messageId: string;
  threadId: string;
  to: string;
  subject: string;
}

/**
 * All SSE event types
 */
export type SSEEvent =
  | SyncCompletedEvent
  | ThreadCreatedEvent
  | ThreadUpdatedEvent
  | ThreadDeletedEvent
  | UnreadCountUpdatedEvent
  | MessageCreatedEvent
  | DraftSavedEvent
  | DraftDeletedEvent
  | EmailSentEvent;

/**
 * SSE event type discriminator
 */
export enum SSEEventType {
  SYNC_COMPLETED = "sync-completed",
  THREAD_CREATED = "thread-created",
  THREAD_UPDATED = "thread-updated",
  THREAD_DELETED = "thread-deleted",
  UNREAD_COUNT_UPDATED = "unread-count-updated",
  MESSAGE_CREATED = "message-created",
  DRAFT_SAVED = "draft-saved",
  DRAFT_DELETED = "draft-deleted",
  EMAIL_SENT = "email-sent",
  CONNECTED = "connected",
}

/**
 * Type guard for SSE events
 */
export function isSSEEvent(event: any): event is SSEEvent {
  return event && typeof event === "object" && "accountId" in event && "timestamp" in event;
}

/**
 * Create a typed SSE event
 */
export function createSSEEvent<T extends SSEEvent>(
  type: SSEEventType,
  accountId: string,
  data: Omit<T, "accountId" | "timestamp">
): T {
  return {
    accountId,
    timestamp: new Date().toISOString(),
    ...data,
  } as T;
}
