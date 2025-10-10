-- Migration: Fix email_send_status message_id to be nullable
-- Date: 2025-10-09
-- Reason: message_id should be NULL initially when creating send status, only populated after email is sent

ALTER TABLE email_send_status 
ALTER COLUMN message_id DROP NOT NULL;

COMMENT ON COLUMN email_send_status.message_id IS 'The email message ID (NULL if send failed before creating message)';
