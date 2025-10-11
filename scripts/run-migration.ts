#!/usr/bin/env tsx
/**
 * Run SQL migrations
 * Usage: tsx scripts/run-migration.ts <migration-file>
 * Example: tsx scripts/run-migration.ts db/migrations/0028_email_lead_linking.sql
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { pool } from "../server/db";

async function runMigration(migrationPath: string) {
  try {
    console.log(`📝 Reading migration: ${migrationPath}`);
    const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8");

    console.log(`🚀 Executing migration...`);
    await pool.query(sql);

    console.log(`✅ Migration completed successfully!`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Migration failed:`, error);
    process.exit(1);
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: tsx scripts/run-migration.ts <migration-file>");
  console.error("Example: tsx scripts/run-migration.ts db/migrations/0028_email_lead_linking.sql");
  process.exit(1);
}

runMigration(migrationFile);
