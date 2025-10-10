/**
 * Schema Drift Audit Script
 *
 * Compares dev and production database schemas to identify missing tables/columns
 *
 * Run: doppler run --project seed-portal-api --config dev -- tsx db/migrations/audit-schema-drift.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function getSchema(connectionString: string): Promise<Map<string, TableInfo[]>> {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const result = await pool.query<TableInfo>(`
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const schema = new Map<string, TableInfo[]>();

  for (const row of result.rows) {
    if (!schema.has(row.table_name)) {
      schema.set(row.table_name, []);
    }
    schema.get(row.table_name)!.push(row);
  }

  await pool.end();
  return schema;
}

async function auditSchemaDrift() {
  console.log("🔍 Schema Drift Audit\n");
  console.log("=".repeat(80));

  // Get connection strings from environment
  const devDb = process.env.DATABASE_URL;
  const prodDb = process.env.PRODUCTION_DATABASE_URL;

  if (!devDb) {
    console.error("❌ DATABASE_URL not set (development)");
    process.exit(1);
  }

  if (!prodDb) {
    console.warn("⚠️  PRODUCTION_DATABASE_URL not set");
    console.log("\nTo compare with production, set:");
    console.log("  PRODUCTION_DATABASE_URL=<prod_connection_string>");
    console.log("\nOr run with Doppler:");
    console.log(
      "  doppler run --project seed-portal-api --config prd -- tsx db/migrations/audit-schema-drift.ts"
    );
    process.exit(0);
  }

  console.log("📊 Fetching schemas...\n");

  const devSchema = await getSchema(devDb);
  const prodSchema = await getSchema(prodDb);

  console.log(`Dev tables: ${devSchema.size}`);
  console.log(`Prod tables: ${prodSchema.size}\n`);
  console.log("=".repeat(80));

  // Find tables in dev but not in prod
  const missingTables: string[] = [];
  for (const table of devSchema.keys()) {
    if (!prodSchema.has(table)) {
      missingTables.push(table);
    }
  }

  // Find tables with different columns
  const columnDrift: Array<{ table: string; devOnly: string[]; prodOnly: string[] }> = [];
  for (const [table, devColumns] of devSchema.entries()) {
    const prodColumns = prodSchema.get(table);
    if (!prodColumns) continue; // Already in missingTables

    const devColNames = new Set(devColumns.map((c) => c.column_name));
    const prodColNames = new Set(prodColumns.map((c) => c.column_name));

    const devOnly = Array.from(devColNames).filter((c) => !prodColNames.has(c));
    const prodOnly = Array.from(prodColNames).filter((c) => !devColNames.has(c));

    if (devOnly.length > 0 || prodOnly.length > 0) {
      columnDrift.push({ table, devOnly, prodOnly });
    }
  }

  // Find tables in prod but not in dev (unusual but possible)
  const extraTables: string[] = [];
  for (const table of prodSchema.keys()) {
    if (!devSchema.has(table)) {
      extraTables.push(table);
    }
  }

  // Report
  console.log("\n📋 AUDIT RESULTS\n");
  console.log("=".repeat(80));

  if (missingTables.length === 0 && columnDrift.length === 0 && extraTables.length === 0) {
    console.log("✅ Schemas are in sync! No drift detected.\n");
    return;
  }

  // Missing tables
  if (missingTables.length > 0) {
    console.log("\n🔴 TABLES IN DEV BUT NOT IN PROD:\n");
    for (const table of missingTables) {
      const columns = devSchema.get(table)!;
      console.log(`  ❌ ${table} (${columns.length} columns)`);
    }
  }

  // Column drift
  if (columnDrift.length > 0) {
    console.log("\n🟡 TABLES WITH COLUMN DIFFERENCES:\n");
    for (const { table, devOnly, prodOnly } of columnDrift) {
      console.log(`  ⚠️  ${table}`);
      if (devOnly.length > 0) {
        console.log(`     Dev has: ${devOnly.join(", ")}`);
      }
      if (prodOnly.length > 0) {
        console.log(`     Prod has: ${prodOnly.join(", ")}`);
      }
    }
  }

  // Extra tables in prod
  if (extraTables.length > 0) {
    console.log("\n🟠 TABLES IN PROD BUT NOT IN DEV:\n");
    for (const table of extraTables) {
      console.log(`  ⚠️  ${table} (consider adding to dev or removing from prod)`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 RECOMMENDATIONS:\n");
  console.log("1. Create migration SQL files for missing tables/columns");
  console.log("2. Test migrations on staging environment first");
  console.log("3. Schedule prod migration during low-traffic period");
  console.log("4. Run this audit weekly to catch drift early");
  console.log("\n📁 Next: See db/migrations/MIGRATION_STRATEGY.md\n");
}

auditSchemaDrift()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Audit failed:", error);
    process.exit(1);
  });
