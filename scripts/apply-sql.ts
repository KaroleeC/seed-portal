import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg as any;

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/apply-sql.ts <path-to-sql>");
    process.exit(1);
  }
  const abs = path.resolve(file);
  const sqlRaw = fs.readFileSync(abs, "utf8");

  const statements = sqlRaw
    .split(/^-->\s*statement-breakpoint.*$/m)
    .map((s) => s.trim())
    .filter((s) => {
      // Drop purely comment statements
      const noComments = s.replace(/(^|\n)\s*--.*(?=\n|$)/g, "");
      return noComments.trim().length > 0;
    });

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  console.log(`Applying ${statements.length} statements from ${abs}`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      // Skip comment-only chunks (extra guard)
      const noComments = stmt.replace(/(^|\n)\s*--.*(?=\n|$)/g, "");
      if (noComments.trim().length === 0) {
        console.warn(`[${i + 1}/${statements.length}] SKIP (comments only)`);
        continue;
      }
      await client.query(stmt);
      console.log(`[${i + 1}/${statements.length}] OK`);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const lower = msg.toLowerCase();
      const ignorable =
        lower.includes("already exists") ||
        lower.includes("duplicate key value") ||
        lower.includes("duplicate object") ||
        lower.includes("already defined");
      if (ignorable) {
        console.warn(`[${i + 1}/${statements.length}] SKIP (idempotent): ${msg}`);
        continue;
      }
      console.error(`[${i + 1}/${statements.length}] ERROR:`, msg);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("✓ Migration applied successfully");
}

main().catch((err) => {
  console.error("apply-sql-error", { message: err?.message });
  process.exit(1);
});
