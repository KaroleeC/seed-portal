import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// SeedMail Email Client Tables
// ============================================================================

// Email Accounts - Google Workspace email accounts connected to SeedMail
export const emailAccounts = pgTable("email_accounts", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull(), // references workspace_users or users
  email: text("email").notNull().unique(),
  provider: text("provider").notNull().default("google"), // 'google' | 'microsoft' (future)
  accessToken: text("access_token"), // Encrypted OAuth token
  refreshToken: text("refresh_token"), // Encrypted OAuth refresh token
  tokenExpiresAt: timestamp("token_expires_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  syncEnabled: boolean("sync_enabled").default(true).notNull(),
  meta: jsonb("meta"), // Provider-specific metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Email Threads - Conversation grouping
export const emailThreads = pgTable(
  "email_threads",
  {
    id: text("id").primaryKey(), // UUID
    accountId: text("account_id")
      .notNull()
      .references(() => emailAccounts.id, { onDelete: "cascade" }),
    gmailThreadId: text("gmail_thread_id"), // Gmail's thread ID
    subject: text("subject").notNull(),
    participants: jsonb("participants").$type<Array<{ name?: string; email: string }>>().notNull(), // [{name, email}]
    snippet: text("snippet"), // First ~100 chars of latest message
    messageCount: integer("message_count").default(1).notNull(),
    unreadCount: integer("unread_count").default(0).notNull(),
    hasAttachments: boolean("has_attachments").default(false).notNull(),
    labels: text("labels").array(), // ['INBOX', 'IMPORTANT', etc.]
    isStarred: boolean("is_starred").default(false).notNull(),
    lastMessageAt: timestamp("last_message_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index("email_threads_account_idx").on(table.accountId),
    gmailThreadIdx: uniqueIndex("email_threads_gmail_thread_idx").on(table.gmailThreadId),
    lastMessageIdx: index("email_threads_last_message_idx").on(table.lastMessageAt),
  })
);

// Email Messages - Individual emails in threads
export const emailMessages = pgTable(
  "email_messages",
  {
    id: text("id").primaryKey(), // UUID
    threadId: text("thread_id")
      .notNull()
      .references(() => emailThreads.id, { onDelete: "cascade" }),
    gmailMessageId: text("gmail_message_id").unique(), // Gmail's message ID
    from: jsonb("from").$type<{ name?: string; email: string }>().notNull(),
    to: jsonb("to").$type<Array<{ name?: string; email: string }>>().notNull(),
    cc: jsonb("cc").$type<Array<{ name?: string; email: string }>>(),
    bcc: jsonb("bcc").$type<Array<{ name?: string; email: string }>>(),
    replyTo: jsonb("reply_to").$type<{ name?: string; email: string }>(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    snippet: text("snippet"), // Short preview
    labels: text("labels").array(), // Gmail labels
    isRead: boolean("is_read").default(false).notNull(),
    isStarred: boolean("is_starred").default(false).notNull(),
    isDraft: boolean("is_draft").default(false).notNull(),
    inReplyTo: text("in_reply_to"), // Message-ID header
    messageReferences: text("message_references").array(), // Message-ID headers for threading
    headers: jsonb("headers"), // Full email headers
    sentAt: timestamp("sent_at").notNull(),
    receivedAt: timestamp("received_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // Tracking fields
    trackingEnabled: boolean("tracking_enabled").default(false),
    trackingPixelId: text("tracking_pixel_id"),
    firstOpenedAt: timestamp("first_opened_at"),
    lastOpenedAt: timestamp("last_opened_at"),
    openCount: integer("open_count").default(0),
  },
  (table) => ({
    threadIdx: index("email_messages_thread_idx").on(table.threadId),
    gmailMessageIdx: index("email_messages_gmail_message_idx").on(table.gmailMessageId),
    sentAtIdx: index("email_messages_sent_at_idx").on(table.sentAt),
  })
);

// Email Attachments - File attachments
export const emailAttachments = pgTable(
  "email_attachments",
  {
    id: text("id").primaryKey(), // UUID
    messageId: text("message_id")
      .notNull()
      .references(() => emailMessages.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(), // bytes
    gmailAttachmentId: text("gmail_attachment_id"), // Gmail's attachment ID
    storageUrl: text("storage_url"), // URL if we cache it
    isInline: boolean("is_inline").default(false).notNull(),
    contentId: text("content_id"), // For inline images
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    messageIdx: index("email_attachments_message_idx").on(table.messageId),
  })
);

// Email Labels - Custom labels/folders
export const emailLabels = pgTable(
  "email_labels",
  {
    id: text("id").primaryKey(), // UUID
    accountId: text("account_id")
      .notNull()
      .references(() => emailAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    type: text("type").notNull().default("user"), // 'system' | 'user'
    color: text("color"), // Hex color
    gmailLabelId: text("gmail_label_id"), // Gmail's label ID
    messageCount: integer("message_count").default(0).notNull(),
    unreadCount: integer("unread_count").default(0).notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index("email_labels_account_idx").on(table.accountId),
    gmailLabelIdx: uniqueIndex("email_labels_gmail_label_idx").on(table.gmailLabelId),
  })
);

// Email Drafts - Draft messages
export const emailDrafts = pgTable(
  "email_drafts",
  {
    id: text("id").primaryKey(), // UUID
    accountId: text("account_id")
      .notNull()
      .references(() => emailAccounts.id, { onDelete: "cascade" }),
    to: jsonb("to").$type<Array<{ name?: string; email: string }>>().notNull(),
    cc: jsonb("cc").$type<Array<{ name?: string; email: string }>>(),
    bcc: jsonb("bcc").$type<Array<{ name?: string; email: string }>>(),
    subject: text("subject").notNull().default(""),
    bodyHtml: text("body_html").notNull().default(""),
    bodyText: text("body_text"),
    inReplyToMessageId: text("in_reply_to_message_id"), // references email_messages.id
    gmailDraftId: text("gmail_draft_id"), // Gmail's draft ID if synced
    // Attachments: Supports both base64 (small files) and Supabase Storage (large files)
    attachments: jsonb("attachments").$type<
      Array<{
        filename: string;
        size?: number;
        contentType?: string;
        contentBase64?: string; // For small files (<1MB)
        storageUrl?: string; // For large files in Supabase Storage (>=1MB)
      }>
    >(),
    attachmentStoragePaths: jsonb("attachment_storage_paths").$type<
      Array<{
        filename: string;
        storagePath: string; // Path in Supabase Storage (e.g., "userId/draftId/file.pdf")
        contentType: string;
        size: number;
      }>
    >(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index("email_drafts_account_idx").on(table.accountId),
    updatedAtIdx: index("email_drafts_updated_at_idx").on(table.updatedAt),
  })
);

// Email Sync State - Track sync progress per account
export const emailSyncState = pgTable("email_sync_state", {
  id: text("id").primaryKey(), // UUID
  accountId: text("account_id")
    .notNull()
    .unique()
    .references(() => emailAccounts.id, { onDelete: "cascade" }),
  historyId: text("history_id"), // Gmail's history ID for incremental sync
  lastFullSyncAt: timestamp("last_full_sync_at"),
  lastIncrementalSyncAt: timestamp("last_incremental_sync_at"),
  nextPageToken: text("next_page_token"), // For paginated syncs
  syncStatus: text("sync_status").notNull().default("idle"), // 'idle' | 'syncing' | 'error'
  syncError: text("sync_error"),
  messagesSync: integer("messages_synced").default(0).notNull(),
  totalMessages: integer("total_messages").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Schemas
// ============================================================================

export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({
  id: true,
  createdAt: true,
});

export const insertEmailAttachmentSchema = createInsertSchema(emailAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertEmailLabelSchema = createInsertSchema(emailLabels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailDraftSchema = createInsertSchema(emailDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSyncStateSchema = createInsertSchema(emailSyncState).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// Types
// ============================================================================

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;

export type EmailThread = typeof emailThreads.$inferSelect;
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;

export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;

export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;

export type EmailLabel = typeof emailLabels.$inferSelect;
export type InsertEmailLabel = z.infer<typeof insertEmailLabelSchema>;

export type EmailDraft = typeof emailDrafts.$inferSelect;
export type InsertEmailDraft = z.infer<typeof insertEmailDraftSchema>;

export type EmailSyncState = typeof emailSyncState.$inferSelect;
export type InsertEmailSyncState = z.infer<typeof insertEmailSyncStateSchema>;

// ============================================================================
// Email Tracking Tables
// ============================================================================

// Email Opens - Track when emails are opened via tracking pixels
export const emailOpens = pgTable(
  "email_opens",
  {
    id: text("id").primaryKey(), // UUID
    messageId: text("message_id").notNull(), // references email_messages.id
    openedAt: timestamp("opened_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    location: text("location"), // City, Country from IP
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    messageIdx: index("email_opens_message_idx").on(table.messageId),
    openedAtIdx: index("email_opens_opened_at_idx").on(table.openedAt),
  })
);

// Email Send Status - Track delivery status and failures
export const emailSendStatus = pgTable(
  "email_send_status",
  {
    id: text("id").primaryKey(), // UUID
    messageId: text("message_id"), // references email_messages.id (NULL if send failed)
    draftId: text("draft_id"), // references email_drafts.id
    status: text("status").notNull(), // 'sending', 'sent', 'delivered', 'failed', 'bounced'
    gmailMessageId: text("gmail_message_id"),
    gmailThreadId: text("gmail_thread_id"),
    errorMessage: text("error_message"),
    bounceType: text("bounce_type"), // 'hard', 'soft', 'complaint'
    bounceReason: text("bounce_reason"),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    failedAt: timestamp("failed_at"),
    bouncedAt: timestamp("bounced_at"),
    retryCount: integer("retry_count").default(0).notNull(),
    maxRetries: integer("max_retries").default(3).notNull(),
    nextRetryAt: timestamp("next_retry_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    messageIdx: index("email_send_status_message_idx").on(table.messageId),
    draftIdx: index("email_send_status_draft_idx").on(table.draftId),
    statusIdx: index("email_send_status_status_idx").on(table.status),
  })
);

export const insertEmailOpensSchema = createInsertSchema(emailOpens).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSendStatusSchema = createInsertSchema(emailSendStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmailOpen = typeof emailOpens.$inferSelect;
export type InsertEmailOpen = z.infer<typeof insertEmailOpensSchema>;

export type EmailSendStatus = typeof emailSendStatus.$inferSelect;
export type InsertEmailSendStatus = z.infer<typeof insertEmailSendStatusSchema>;
