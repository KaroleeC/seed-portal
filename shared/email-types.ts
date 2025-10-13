/**
 * Shared Email Types
 * Single source of truth for email-related TypeScript types
 * Used by both client and server
 */

import type React from "react";

// ============================================================================
// Core Email Types
// ============================================================================

export interface EmailParticipant {
  name?: string;
  email: string;
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  lastSyncedAt: string | null;
  syncEnabled: boolean;
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: EmailParticipant[];
  snippet: string;
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  labels: string[];
  isStarred: boolean;
  lastMessageAt: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: EmailParticipant;
  to: EmailParticipant[];
  cc?: EmailParticipant[];
  bcc?: EmailParticipant[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  snippet: string;
  sentAt: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  messageReferences?: string[];
  inReplyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  contentType?: string;
  contentBase64?: string;
  storageUrl?: string;
  size?: number;
}

export interface EmailDraft {
  id: string;
  accountId: string;
  to: EmailParticipant[];
  cc?: EmailParticipant[] | null;
  bcc?: EmailParticipant[] | null;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  inReplyToMessageId?: string | null;
  attachments?: EmailAttachment[] | null;
  updatedAt: string;
}

// ============================================================================
// Email Tracking Types
// ============================================================================

export interface EmailOpenEvent {
  id: string;
  messageId: string;
  openedAt: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export interface EmailSendStatus {
  id: string;
  messageId?: string;
  draftId?: string;
  status: "sending" | "sent" | "delivered" | "failed" | "bounced";
  gmailMessageId?: string;
  gmailThreadId?: string;
  errorMessage?: string;
  bounceType?: "hard" | "soft" | "complaint";
  bounceReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  bouncedAt?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SendEmailRequest {
  accountId: string;
  to: string[] | string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  inReplyToMessageId?: string;
  attachments?: EmailAttachment[];
  sendAt?: string;
  trackingEnabled?: boolean;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  scheduled?: boolean;
  sendAt?: string;
}

export interface SyncStatusResponse {
  accountId: string;
  status: "idle" | "syncing" | "failed";
  lastSyncedAt?: string;
  error?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export type EmailFolder = "INBOX" | "SENT" | "STARRED" | "DRAFT" | "TRASH" | "ARCHIVE" | "LEADS";

export interface FolderConfig {
  id: EmailFolder;
  label: string;
  icon: React.ComponentType<{ className?: string }>; // Lucide icon component
  color: string;
}

export interface EmailFilters {
  folder?: EmailFolder;
  search?: string;
  starred?: boolean;
  unread?: boolean;
}

// ============================================================================
// Compose/Draft State Types
// ============================================================================

export interface ComposeState {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  showCc: boolean;
  showBcc: boolean;
  sendAt?: Date;
  trackingEnabled: boolean;
  scheduleOpen: boolean;
}

// ============================================================================
// Email Signature Types
// ============================================================================

export interface EmailSignature {
  id: string;
  userId: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
