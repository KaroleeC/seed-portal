import { Pool } from "pg";
import fs from "fs";
import path from "path";

function getenv(name: string, required = true): string | undefined {
  const v = process.env[name];
  if (!v && required) throw new Error(`${name} is required`);
  return v;
}

async function run() {
  const databaseUrl = getenv("DATABASE_URL")!;
  const sslRequired =
    /sslmode=require|ssl=true/i.test(databaseUrl) || process.env.PGSSLMODE === "require";

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
    max: 4,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    console.log("[db-align] Connected. SSL:", !!sslRequired);

    const ddl: string[] = [
      // Auth columns
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS auth_user_id uuid",
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_login_at timestamptz",
      // Unique index for auth_user_id (safe IF NOT EXISTS)
      "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_auth_user_id_unique') THEN CREATE UNIQUE INDEX users_auth_user_id_unique ON users(auth_user_id); END IF; END $$;",
      // RBAC tables (additive-only)
      `CREATE TABLE IF NOT EXISTS roles (
        id serial PRIMARY KEY,
        name text UNIQUE NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS permissions (
        id serial PRIMARY KEY,
        key text UNIQUE NOT NULL,
        description text,
        category text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS role_permissions (
        id serial PRIMARY KEY,
        role_id int NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id int NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_id)
      )`,
      `CREATE TABLE IF NOT EXISTS user_roles (
        id serial PRIMARY KEY,
        user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id int NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_by int,
        assigned_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, role_id)
      )`,
      `CREATE TABLE IF NOT EXISTS departments (
        id serial PRIMARY KEY,
        name text UNIQUE NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS user_departments (
        id serial PRIMARY KEY,
        user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        department_id int NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        UNIQUE(user_id, department_id)
      )`,
      `CREATE TABLE IF NOT EXISTS manager_edges (
        id serial PRIMARY KEY,
        manager_user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(manager_user_id, member_user_id)
      )`,
      // Audit log table for access/policy changes (additive-only)
      `CREATE TABLE IF NOT EXISTS auth_audit_log (
        id bigserial PRIMARY KEY,
        actor_user_id int REFERENCES users(id) ON DELETE SET NULL,
        action text NOT NULL,
        entity_type text NOT NULL,
        entity_id text,
        diff_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    ];

    for (const q of ddl) {
      console.log("[db-align] DDL:", q.split("\n")[0].slice(0, 80));
      await client.query(q);
    }

    // Seed RBAC
    const seedPath = path.resolve(process.cwd(), "server/db/seeds/rbac-seed.sql");
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    console.log("[db-align] Seeding RBAC...");
    await client.query(seedSql);

    // Backfill auth_user_id by email from Supabase auth.users
    const backfill = `
      UPDATE users u
      SET auth_user_id = au.id
      FROM auth.users au
      WHERE LOWER(au.email) = LOWER(u.email)
        AND u.auth_user_id IS NULL
        AND u.email LIKE '%@seedfinancial.io';
    `;
    console.log("[db-align] Backfilling auth_user_id from auth.users...");
    const res = await client.query(backfill);
    console.log("[db-align] Backfill updated:", res.rowCount);

    // Verify
    const checks = await client.query(
      `SELECT 
         (SELECT COUNT(*) FROM roles) as roles,
         (SELECT COUNT(*) FROM permissions) as permissions,
         (SELECT COUNT(*) FROM role_permissions) as role_permissions,
         (SELECT COUNT(*) FROM user_roles) as user_roles`
    );
    console.log("[db-align] Verification counts:", checks.rows[0]);

    console.log("[db-align] Completed successfully");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("[db-align] FAILED:", err.message);
  process.exit(1);
});
