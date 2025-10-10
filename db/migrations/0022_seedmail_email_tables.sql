-- SeedMail Email Client Tables
-- Migration: 0022_seedmail_email_tables
-- Description: Create tables for Gmail-integrated email client

-- Email Accounts
CREATE TABLE IF NOT EXISTS email_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  last_synced_at TIMESTAMP,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email);

-- Email Threads
CREATE TABLE IF NOT EXISTS email_threads (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  gmail_thread_id TEXT,
  subject TEXT NOT NULL,
  participants JSONB NOT NULL,
  snippet TEXT,
  message_count INTEGER NOT NULL DEFAULT 1,
  unread_count INTEGER NOT NULL DEFAULT 0,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  labels TEXT[],
  is_starred BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_threads_account_id ON email_threads(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_threads_gmail_thread_id ON email_threads(gmail_thread_id) WHERE gmail_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message_at ON email_threads(last_message_at DESC);

-- Email Messages
CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  gmail_message_id TEXT UNIQUE,
  "from" JSONB NOT NULL,
  "to" JSONB NOT NULL,
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
  sent_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_gmail_message_id ON email_messages(gmail_message_id) WHERE gmail_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_messages_sent_at ON email_messages(sent_at DESC);

-- Email Attachments
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
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_message_id ON email_attachments(message_id);

-- Email Labels
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
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_labels_account_id ON email_labels(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_labels_gmail_label_id ON email_labels(gmail_label_id) WHERE gmail_label_id IS NOT NULL;

-- Email Drafts
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
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_account_id ON email_drafts(account_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_updated_at ON email_drafts(updated_at DESC);

-- Email Sync State
CREATE TABLE IF NOT EXISTS email_sync_state (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES email_accounts(id) ON DELETE CASCADE,
  history_id TEXT,
  last_full_sync_at TIMESTAMP,
  last_incremental_sync_at TIMESTAMP,
  next_page_token TEXT,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  sync_error TEXT,
  messages_synced INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sync_state_account_id ON email_sync_state(account_id);

-- Comments
COMMENT ON TABLE email_accounts IS 'Google Workspace email accounts connected to SeedMail';
COMMENT ON TABLE email_threads IS 'Email conversation threads';
COMMENT ON TABLE email_messages IS 'Individual email messages';
COMMENT ON TABLE email_attachments IS 'Email file attachments';
COMMENT ON TABLE email_labels IS 'Gmail labels and folders';
COMMENT ON TABLE email_drafts IS 'Draft email messages';
COMMENT ON TABLE email_sync_state IS 'Gmail sync status tracking';
