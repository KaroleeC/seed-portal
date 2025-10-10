-- SeedMail Row Level Security (RLS) Policies
-- Migration: 0023_seedmail_rls_policies
-- Description: Enable RLS and create security policies for email tables

-- Enable RLS on all email tables
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_state ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Email Accounts Policies
-- Users can only access their own email accounts
-- ============================================================================

-- Allow users to view their own accounts
CREATE POLICY "Users can view their own email accounts"
  ON email_accounts
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- Allow users to insert their own accounts (OAuth callback)
CREATE POLICY "Users can create their own email accounts"
  ON email_accounts
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Allow users to update their own accounts (token refresh, sync status)
CREATE POLICY "Users can update their own email accounts"
  ON email_accounts
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Allow users to delete their own accounts
CREATE POLICY "Users can delete their own email accounts"
  ON email_accounts
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================================================
-- Email Threads Policies
-- Users can only access threads from their own accounts
-- ============================================================================

-- Allow users to view threads from their accounts
CREATE POLICY "Users can view threads from their email accounts"
  ON email_threads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_threads.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to insert threads for their accounts
CREATE POLICY "Users can create threads for their email accounts"
  ON email_threads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_threads.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to update threads from their accounts
CREATE POLICY "Users can update threads from their email accounts"
  ON email_threads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_threads.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_threads.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to delete threads from their accounts
CREATE POLICY "Users can delete threads from their email accounts"
  ON email_threads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_threads.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- Email Messages Policies
-- Users can only access messages from threads in their accounts
-- ============================================================================

-- Allow users to view messages from their threads
CREATE POLICY "Users can view messages from their threads"
  ON email_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_threads
      JOIN email_accounts ON email_accounts.id = email_threads.account_id
      WHERE email_threads.id = email_messages.thread_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to insert messages for their threads
CREATE POLICY "Users can create messages for their threads"
  ON email_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_threads
      JOIN email_accounts ON email_accounts.id = email_threads.account_id
      WHERE email_threads.id = email_messages.thread_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to update messages from their threads
CREATE POLICY "Users can update messages from their threads"
  ON email_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_threads
      JOIN email_accounts ON email_accounts.id = email_threads.account_id
      WHERE email_threads.id = email_messages.thread_id
      AND email_accounts.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_threads
      JOIN email_accounts ON email_accounts.id = email_threads.account_id
      WHERE email_threads.id = email_messages.thread_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to delete messages from their threads
CREATE POLICY "Users can delete messages from their threads"
  ON email_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_threads
      JOIN email_accounts ON email_accounts.id = email_threads.account_id
      WHERE email_threads.id = email_messages.thread_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- Email Attachments Policies
-- Users can only access attachments from their messages
-- ============================================================================

-- Allow users to view attachments from their messages
CREATE POLICY "Users can view attachments from their messages"
  ON email_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_messages
      JOIN email_threads ON email_threads.id = email_messages.thread_id
      JOIN email_accounts ON email_accounts.id = email_threads.account_id
      WHERE email_messages.id = email_attachments.message_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to insert attachments for their messages
CREATE POLICY "Users can create attachments for their messages"
  ON email_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_messages
      JOIN email_threads ON email_threads.id = email_messages.thread_id
      JOIN email_accounts ON email_accounts.id = email_threads.account_id
      WHERE email_messages.id = email_attachments.message_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to delete attachments from their messages
CREATE POLICY "Users can delete attachments from their messages"
  ON email_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_messages
      JOIN email_threads ON email_threads.id = email_messages.thread_id
      JOIN email_accounts ON email_accounts.id = email_threads.account_id
      WHERE email_messages.id = email_attachments.message_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- Email Labels Policies
-- Users can only access labels from their accounts
-- ============================================================================

-- Allow users to view labels from their accounts
CREATE POLICY "Users can view labels from their email accounts"
  ON email_labels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_labels.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to insert labels for their accounts
CREATE POLICY "Users can create labels for their email accounts"
  ON email_labels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_labels.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to update labels from their accounts
CREATE POLICY "Users can update labels from their email accounts"
  ON email_labels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_labels.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_labels.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to delete labels from their accounts
CREATE POLICY "Users can delete labels from their email accounts"
  ON email_labels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_labels.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- Email Drafts Policies
-- Users can only access their own drafts
-- ============================================================================

-- Allow users to view drafts from their accounts
CREATE POLICY "Users can view drafts from their email accounts"
  ON email_drafts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_drafts.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to insert drafts for their accounts
CREATE POLICY "Users can create drafts for their email accounts"
  ON email_drafts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_drafts.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to update drafts from their accounts
CREATE POLICY "Users can update drafts from their email accounts"
  ON email_drafts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_drafts.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_drafts.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to delete drafts from their accounts
CREATE POLICY "Users can delete drafts from their email accounts"
  ON email_drafts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_drafts.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- Email Sync State Policies
-- Users can only access sync state for their accounts
-- ============================================================================

-- Allow users to view sync state for their accounts
CREATE POLICY "Users can view sync state for their email accounts"
  ON email_sync_state
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_sync_state.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to insert sync state for their accounts
CREATE POLICY "Users can create sync state for their email accounts"
  ON email_sync_state
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_sync_state.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to update sync state for their accounts
CREATE POLICY "Users can update sync state for their email accounts"
  ON email_sync_state
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_sync_state.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_sync_state.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Allow users to delete sync state for their accounts
CREATE POLICY "Users can delete sync state for their email accounts"
  ON email_sync_state
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = email_sync_state.account_id
      AND email_accounts.user_id = auth.uid()::text
    )
  );

-- Comments
COMMENT ON POLICY "Users can view their own email accounts" ON email_accounts IS 'Users can only view email accounts they own';
COMMENT ON POLICY "Users can view threads from their email accounts" ON email_threads IS 'Users can only view threads from their email accounts';
COMMENT ON POLICY "Users can view messages from their threads" ON email_messages IS 'Users can only view messages from threads in their accounts';
COMMENT ON POLICY "Users can view attachments from their messages" ON email_attachments IS 'Users can only view attachments from their messages';
COMMENT ON POLICY "Users can view labels from their email accounts" ON email_labels IS 'Users can only view labels from their accounts';
COMMENT ON POLICY "Users can view drafts from their email accounts" ON email_drafts IS 'Users can only view drafts from their accounts';
COMMENT ON POLICY "Users can view sync state for their email accounts" ON email_sync_state IS 'Users can only view sync state for their accounts';
