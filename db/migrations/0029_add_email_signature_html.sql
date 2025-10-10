-- Add email_signature_html column to store pre-rendered HTML signature
-- This separates the JSON config (for editing) from the HTML (for sending)

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_signature_html TEXT;

COMMENT ON COLUMN users.email_signature_html IS 'Pre-rendered HTML signature generated from email_signature JSON config';
