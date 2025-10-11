/**
 * Run Email-Lead Linking Migration
 *
 * This script runs the database migration for email-lead linking functionality
 * Run with: NODE_ENV=development tsx scripts/run-email-lead-migration.ts
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../server/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log("🚀 Running email-lead linking migration...");

  if (!pool) {
    console.error("❌ Database pool not available. Make sure DATABASE_URL is set.");
    process.exit(1);
  }

  try {
    // Read migration SQL
    const migrationPath = join(__dirname, "../db/migrations/0028_email_lead_linking.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    console.log("📄 Migration file loaded");
    console.log("📊 Executing SQL...\n");

    // Execute migration
    await pool.query(migrationSQL);

    console.log("✅ Migration completed successfully!\n");

    // Verify tables were created
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('email_thread_leads');
    `);

    console.log("📋 Verification:");
    console.log(
      `  - email_thread_leads table: ${tablesCheck.rows.length > 0 ? "✓ Created" : "✗ Not found"}`
    );

    // Check indexes
    const indexCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'email_thread_leads';
    `);

    console.log(`  - Indexes created: ${indexCheck.rows.length}`);

    // Check columns on crm_leads
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'crm_leads' 
      AND column_name IN ('primary_email', 'secondary_emails');
    `);

    console.log(`  - crm_leads email columns: ${columnsCheck.rows.length}/2 added`);

    console.log("\n🎉 Migration complete! Ready to sync lead emails.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
