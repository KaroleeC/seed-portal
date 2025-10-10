import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// Allow development to boot without a database (degraded mode)
const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
if (!process.env.DATABASE_URL && isProd) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Enhanced pool configuration with better error handling
const connectionString = process.env.DATABASE_URL;
const sslRequired = connectionString
  ? /sslmode=require|ssl=true/i.test(connectionString) || process.env.PGSSLMODE === "require"
  : false;

export let pool: Pool | undefined;
if (connectionString) {
  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: false,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
  });

  // Add error handling for pool events
  pool.on("error", (err) => {
    console.error("Database pool error:", err);
    // Don't throw here - let individual queries handle errors
  });

  pool.on("connect", () => {
    console.log("Database connection established");
  });

  pool.on("remove", () => {
    console.log("Database connection removed from pool");
  });
} else {
  console.warn(
    "DATABASE_URL not set - starting without a database (degraded mode). Some features will be unavailable."
  );
}

// Create database instance only if pool exists
export const db = pool ? drizzle(pool, { schema }) : (null as any);

// Database health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Graceful shutdown handler
export async function closeDatabaseConnections(): Promise<void> {
  if (!pool) return;
  try {
    await pool.end();
    console.log("Database connections closed gracefully");
  } catch (error) {
    console.error("Error closing database connections:", error);
  }
}
