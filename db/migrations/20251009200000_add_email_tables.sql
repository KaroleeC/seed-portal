-- Migration: Add SeedMail Email Tables
-- Date: 2025-10-09
-- Description: Creates all email-related tables for SeedMail feature
-- Tables: 9 (email_accounts, email_threads, email_messages, email_attachments, 
--            email_labels, email_drafts, email_sync_state, email_opens, email_send_status)
-- Risk: Low (additive only, no data migration)
-- Estimated time: <5 seconds

BEGIN;

-- ============================================================================
-- Email Accounts - Google Workspace email accounts connected to SeedMail
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT, -- Encrypted OAuth token
  refresh_token TEXT, -- Encrypted OAuth refresh token
  token_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Email Threads - Conversation grouping
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_threads (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  gmail_thread_id TEXT,
  subject TEXT NOT NULL,
  participants JSONB NOT NULL, -- [{name, email}]
  snippet TEXT,
  message_count INTEGER NOT NULL DEFAULT 1,
  unread_count INTEGER NOT NULL DEFAULT 0,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  labels TEXT[],
  is_starred BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_threads_account_idx ON email_threads(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS email_threads_gmail_thread_idx ON email_threads(gmail_thread_id);
CREATE INDEX IF NOT EXISTS email_threads_last_message_idx ON email_threads(last_message_at);

-- ============================================================================
-- Email Messages - Individual emails in threads
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  gmail_message_id TEXT UNIQUE,
  "from" JSONB NOT NULL, -- {name, email}
  "to" JSONB NOT NULL, -- [{name, email}]
  cc JSONB,
  bcc JSONB,
  reply_to JSONB,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  snippet TEXT,
  labels TEXT[],
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  in_reply_to TEXT,
  message_references TEXT[],
  headers JSONB,
  sent_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Tracking fields
  tracking_enabled BOOLEAN DEFAULT false,
  tracking_pixel_id TEXT,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS email_messages_thread_idx ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS email_messages_gmail_message_idx ON email_messages(gmail_message_id);
CREATE INDEX IF NOT EXISTS email_messages_sent_at_idx ON email_messages(sent_at);

-- ============================================================================
-- Email Attachments - File attachments
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  gmail_attachment_id TEXT,
  storage_url TEXT,
  is_inline BOOLEAN NOT NULL DEFAULT false,
  content_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_attachments_message_idx ON email_attachments(message_id);

-- ============================================================================
-- Email Labels - Custom labels/folders
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_labels (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'user',
  color TEXT,
  gmail_label_id TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_labels_account_idx ON email_labels(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS email_labels_gmail_label_idx ON email_labels(gmail_label_id);

-- ============================================================================
-- Email Drafts - Draft messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_drafts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  "to" JSONB NOT NULL,
  cc JSONB,
  bcc JSONB,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT,
  in_reply_to_message_id TEXT,
  gmail_draft_id TEXT,
  attachments JSONB,
  attachment_storage_paths JSONB,
  send_status TEXT,
  send_error TEXT,
  send_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_drafts_account_idx ON email_drafts(account_id);
CREATE INDEX IF NOT EXISTS email_drafts_updated_at_idx ON email_drafts(updated_at);

-- ============================================================================
-- Email Sync State - Track sync progress per account
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_sync_state (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES email_accounts(id) ON DELETE CASCADE,
  history_id TEXT,
  last_full_sync_at TIMESTAMPTZ,
  last_incremental_sync_at TIMESTAMPTZ,
  next_page_token TEXT,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  sync_error TEXT,
  messages_synced INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Email Opens - Track when emails are opened via tracking pixels
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_opens (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_opens_message_idx ON email_opens(message_id);
CREATE INDEX IF NOT EXISTS email_opens_opened_at_idx ON email_opens(opened_at);

-- ============================================================================
-- Email Send Status - Track delivery status and failures
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_send_status (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  draft_id TEXT,
  status TEXT NOT NULL,
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  error_message TEXT,
  bounce_type TEXT,
  bounce_reason TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_send_status_message_idx ON email_send_status(message_id);
CREATE INDEX IF NOT EXISTS email_send_status_draft_idx ON email_send_status(draft_id);
CREATE INDEX IF NOT EXISTS email_send_status_status_idx ON email_send_status(status);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Run these to verify migration succeeded:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'email_%' ORDER BY table_name;
-- SELECT COUNT(*) FROM email_accounts; -- Should return 0 (empty table)

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- Uncomment and run if you need to rollback:
-- BEGIN;
-- DROP TABLE IF EXISTS email_send_status CASCADE;
-- DROP TABLE IF EXISTS email_opens CASCADE;
-- DROP TABLE IF EXISTS email_sync_state CASCADE;
-- DROP TABLE IF EXISTS email_drafts CASCADE;
-- DROP TABLE IF EXISTS email_labels CASCADE;
-- DROP TABLE IF EXISTS email_attachments CASCADE;
-- DROP TABLE IF EXISTS email_messages CASCADE;
-- DROP TABLE IF EXISTS email_threads CASCADE;
-- DROP TABLE IF EXISTS email_accounts CASCADE;
-- COMMIT;
