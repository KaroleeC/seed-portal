-- Backfill email_signature_html for existing users with JSON signatures
-- This is a one-time migration to generate HTML from existing JSON configs
-- Note: Complex signatures may need manual regeneration via the UI

-- This migration is intentionally empty because we'll handle backfill programmatically
-- Users can re-save their signatures in the UI to generate HTML
-- Or we can run a Node script to batch convert

COMMENT ON COLUMN users.email_signature_html IS 
  'Users with existing signatures should re-save them in the UI to generate HTML';
