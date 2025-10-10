/**
 * Apply migration 0026 - Email Attachment Storage
 * Run with: doppler run --project seed-portal-api --config dev -- npx tsx scripts/apply-migration-0026.ts
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function applyMigration() {
  console.log("🔵 Applying migration 0026: Email Attachment Storage...");

  try {
    // Add attachment_storage_paths column
    await db.execute(sql`
      ALTER TABLE email_drafts
      ADD COLUMN IF NOT EXISTS attachment_storage_paths jsonb DEFAULT '[]'::jsonb;
    `);
    console.log("✅ Added attachment_storage_paths column");

    // Add comment
    await db.execute(sql`
      COMMENT ON COLUMN email_drafts.attachment_storage_paths IS 'Array of storage paths for Supabase Storage attachments. Format: [{"filename": "file.pdf", "storagePath": "userId/draftId/file.pdf", "contentType": "application/pdf", "size": 12345}]';
    `);
    console.log("✅ Added column comment");

    // Create partial index for drafts with attachments
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_drafts_has_attachments ON email_drafts (id)
      WHERE (attachments IS NOT NULL AND jsonb_array_length(attachments) > 0)
         OR (attachment_storage_paths IS NOT NULL AND jsonb_array_length(attachment_storage_paths) > 0);
    `);
    console.log("✅ Created index idx_email_drafts_has_attachments");

    console.log("🟢 Migration 0026 applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigration();
