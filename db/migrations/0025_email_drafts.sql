-- Create email_drafts table for auto-saving draft emails
CREATE TABLE IF NOT EXISTS email_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, -- Email account ID
  recipients JSONB NOT NULL DEFAULT '{"to":[],"cc":[],"bcc":[]}', -- {to: [], cc: [], bcc: []}
  subject TEXT DEFAULT '',
  body_html TEXT DEFAULT '',
  attachments JSONB DEFAULT '[]', -- [{filename, contentBase64, contentType}]
  in_reply_to TEXT, -- Message ID if replying
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_draft_per_reply UNIQUE NULLS NOT DISTINCT (user_id, in_reply_to)
);

-- Index for fast draft lookups by user
CREATE INDEX idx_email_drafts_user_id ON email_drafts(user_id);
CREATE INDEX idx_email_drafts_updated_at ON email_drafts(updated_at DESC);

-- Enable RLS
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own drafts
CREATE POLICY "Users can view own drafts"
  ON email_drafts
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::integer);

CREATE POLICY "Users can create own drafts"
  ON email_drafts
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true)::integer);

CREATE POLICY "Users can update own drafts"
  ON email_drafts
  FOR UPDATE
  USING (user_id = current_setting('app.user_id', true)::integer);

CREATE POLICY "Users can delete own drafts"
  ON email_drafts
  FOR DELETE
  USING (user_id = current_setting('app.user_id', true)::integer);

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION update_email_draft_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_drafts_updated_at
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_email_draft_timestamp();
