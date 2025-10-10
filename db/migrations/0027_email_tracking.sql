-- Migration: Email Delivery & Read Tracking
-- Date: 2025-10-09

-- Email Opens Tracking (Read Receipts via Tracking Pixels)
CREATE TABLE IF NOT EXISTS email_opens (
  id TEXT PRIMARY KEY, -- UUID
  message_id TEXT NOT NULL, -- references email_messages.id
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  location TEXT, -- City, Country from IP
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_opens_message_id ON email_opens(message_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_opened_at ON email_opens(opened_at DESC);

COMMENT ON TABLE email_opens IS 'Tracks when emails are opened via tracking pixels';
COMMENT ON COLUMN email_opens.message_id IS 'The email message that was opened';
COMMENT ON COLUMN email_opens.ip_address IS 'IP address of the recipient';
COMMENT ON COLUMN email_opens.user_agent IS 'Browser/email client user agent';
COMMENT ON COLUMN email_opens.location IS 'Approximate location from IP geolocation';

-- Email Send Status Tracking
CREATE TABLE IF NOT EXISTS email_send_status (
  id TEXT PRIMARY KEY, -- UUID
  message_id TEXT NOT NULL, -- references email_messages.id (NULL if send failed before creating message)
  draft_id TEXT, -- references email_drafts.id if sent from draft
  status TEXT NOT NULL, -- 'sending', 'sent', 'delivered', 'failed', 'bounced'
  gmail_message_id TEXT, -- Gmail's message ID once sent
  gmail_thread_id TEXT, -- Gmail's thread ID
  error_message TEXT, -- Error details if failed
  bounce_type TEXT, -- 'hard', 'soft', 'complaint' if bounced
  bounce_reason TEXT, -- Detailed bounce reason
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  bounced_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_send_status_message_id ON email_send_status(message_id);
CREATE INDEX IF NOT EXISTS idx_email_send_status_draft_id ON email_send_status(draft_id);
CREATE INDEX IF NOT EXISTS idx_email_send_status_status ON email_send_status(status);
CREATE INDEX IF NOT EXISTS idx_email_send_status_next_retry ON email_send_status(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;

COMMENT ON TABLE email_send_status IS 'Tracks email delivery status and failures';
COMMENT ON COLUMN email_send_status.status IS 'Current status: sending, sent, delivered, failed, bounced';
COMMENT ON COLUMN email_send_status.bounce_type IS 'Type of bounce: hard (permanent), soft (temporary), complaint (spam report)';
COMMENT ON COLUMN email_send_status.retry_count IS 'Number of retry attempts';
COMMENT ON COLUMN email_send_status.next_retry_at IS 'When to retry sending if failed';

-- Add tracking columns to email_messages
ALTER TABLE email_messages 
ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tracking_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;

COMMENT ON COLUMN email_messages.tracking_enabled IS 'Whether tracking pixel was included';
COMMENT ON COLUMN email_messages.tracking_pixel_id IS 'Unique ID for the tracking pixel URL';
COMMENT ON COLUMN email_messages.first_opened_at IS 'First time email was opened';
COMMENT ON COLUMN email_messages.last_opened_at IS 'Most recent time email was opened';
COMMENT ON COLUMN email_messages.open_count IS 'Number of times email was opened';

-- Add send status to email_drafts for retry UI
ALTER TABLE email_drafts
ADD COLUMN IF NOT EXISTS send_status TEXT, -- 'sending', 'sent', 'failed'
ADD COLUMN IF NOT EXISTS send_error TEXT,
ADD COLUMN IF NOT EXISTS send_attempts INTEGER DEFAULT 0;

COMMENT ON COLUMN email_drafts.send_status IS 'Status if draft was attempted to be sent';
COMMENT ON COLUMN email_drafts.send_error IS 'Error message if send failed';
COMMENT ON COLUMN email_drafts.send_attempts IS 'Number of send attempts';
