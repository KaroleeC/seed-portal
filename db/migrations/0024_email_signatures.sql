-- Email Signatures
-- Migration: 0024_email_signatures
-- Description: Add email signature fields to users table

-- Add signature fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_signature TEXT,
ADD COLUMN IF NOT EXISTS email_signature_enabled BOOLEAN DEFAULT true;

-- Add index for quick signature lookups
CREATE INDEX IF NOT EXISTS idx_users_signature_enabled ON users(email_signature_enabled) WHERE email_signature_enabled = true;

-- Add comment
COMMENT ON COLUMN users.email_signature IS 'HTML email signature for the user';
COMMENT ON COLUMN users.email_signature_enabled IS 'Whether to automatically append signature to outgoing emails';
