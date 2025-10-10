-- Migration: Add Supabase Storage support for email attachments
-- Date: 2025-10-09

-- Add storage-related columns to email_drafts
-- Support both base64 (legacy/small files) and storage URLs (large files)
ALTER TABLE email_drafts
ADD COLUMN IF NOT EXISTS attachment_storage_paths jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN email_drafts.attachment_storage_paths IS 'Array of storage paths for Supabase Storage attachments. Format: [{"filename": "file.pdf", "storagePath": "userId/draftId/file.pdf", "contentType": "application/pdf", "size": 12345}]';

-- Attachments column remains for backward compatibility with base64
-- New logic: 
--   - Small files (<1MB): Store as base64 in attachments column
--   - Large files (>=1MB): Upload to Supabase Storage, store path in attachment_storage_paths
--   - On send: Generate signed URLs from storage paths

-- Partial index for faster draft queries with attachments
CREATE INDEX IF NOT EXISTS idx_email_drafts_has_attachments ON email_drafts (id)
WHERE (attachments IS NOT NULL AND jsonb_array_length(attachments) > 0)
   OR (attachment_storage_paths IS NOT NULL AND jsonb_array_length(attachment_storage_paths) > 0);
