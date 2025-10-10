#!/usr/bin/env tsx
/**
 * Verify that cadence tables were created by migration 0003
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function verifyCadenceTables() {
  console.log("🔍 Verifying cadence tables...\n");

  try {
    // Check for cadence tables
    const cadenceTables = [
      "crm_cadences",
      "crm_cadence_days",
      "crm_cadence_actions",
      "crm_cadence_runs",
      "crm_cadence_scheduled_actions",
      "crm_cadence_events",
    ];

    for (const tableName of cadenceTables) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `);

      const exists = (result.rows[0] as any).exists;
      console.log(`  ${exists ? "✅" : "❌"} ${tableName}: ${exists ? "EXISTS" : "NOT FOUND"}`);
    }

    console.log("\n🔍 Verifying crm_messages columns...\n");

    // Check for new crm_messages columns
    const newColumns = ["channel", "provider", "provider_message_id", "thread_key", "raw"];

    for (const columnName of newColumns) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_messages'
          AND column_name = ${columnName}
        ) as exists
      `);

      const exists = (result.rows[0] as any).exists;
      console.log(
        `  ${exists ? "✅" : "❌"} crm_messages.${columnName}: ${exists ? "EXISTS" : "NOT FOUND"}`
      );
    }

    // Check that legacy 'type' column is gone
    const typeResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_messages'
        AND column_name = 'type'
      ) as exists
    `);

    const typeExists = (typeResult.rows[0] as any).exists;
    console.log(
      `  ${!typeExists ? "✅" : "❌"} crm_messages.type removed: ${!typeExists ? "YES" : "NO (STILL EXISTS)"}`
    );

    console.log("\n✅ Verification complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

verifyCadenceTables();
