/**
 * Test Database Setup
 * 
 * Manages test database connection, migrations, and cleanup
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';
import * as emailSchema from '../shared/email-schema';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 
  'postgresql://test_user:test_password@localhost:5433/seed_portal_test';

let testDb: ReturnType<typeof drizzle> | null = null;
let testClient: ReturnType<typeof postgres> | null = null;

// Create a mock pool-like object for services that expect node-postgres Pool
let testPool: any = null;

/**
 * Setup test database connection and run migrations
 */
export async function setupTestDatabase() {
  if (testDb) return testDb;
  
  console.log('🔧 Setting up test database...');
  
  // Set DATABASE_URL for test so server/db.ts uses the test database
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  
  // Create connection with minimal pool size for tests
  testClient = postgres(TEST_DATABASE_URL, { 
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  testDb = drizzle(testClient, { 
    schema: { ...schema, ...emailSchema },
  });
  
  try {
    // Enable required extensions
    console.log('🔌 Enabling database extensions...');
    await testDb.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    
    // Run migrations (creates tables from schema.ts)
    console.log('🔄 Running migrations...');
    await migrate(testDb, { migrationsFolder: './migrations' });
    
    // Create email tables (from email-schema.ts) - these aren't in migrations yet
    console.log('📧 Creating email tables...');
    await testDb.execute(sql`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL DEFAULT 'google',
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        last_synced_at TIMESTAMP,
        sync_enabled BOOLEAN DEFAULT true NOT NULL,
        meta JSONB,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS email_threads (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
        gmail_thread_id TEXT,
        subject TEXT NOT NULL,
        participants JSONB NOT NULL,
        snippet TEXT,
        message_count INTEGER DEFAULT 1 NOT NULL,
        unread_count INTEGER DEFAULT 0 NOT NULL,
        has_attachments BOOLEAN DEFAULT false NOT NULL,
        labels TEXT[],
        is_starred BOOLEAN DEFAULT false NOT NULL,
        last_message_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS email_lead_links (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
        lead_id TEXT NOT NULL,
        link_type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        created_by TEXT,
        UNIQUE(thread_id, lead_id)
      );
      
      CREATE INDEX IF NOT EXISTS email_threads_account_idx ON email_threads(account_id);
      CREATE UNIQUE INDEX IF NOT EXISTS email_threads_gmail_thread_idx ON email_threads(gmail_thread_id);
      CREATE INDEX IF NOT EXISTS email_threads_last_message_idx ON email_threads(last_message_at);
      CREATE INDEX IF NOT EXISTS email_lead_links_thread_idx ON email_lead_links(thread_id);
      CREATE INDEX IF NOT EXISTS email_lead_links_lead_idx ON email_lead_links(lead_id);
    `);
    
    console.log('✅ Test database ready');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
  
  return testDb;
}

/**
 * Clean all test data from database
 * Truncates tables in correct order to avoid foreign key violations
 */
export async function cleanupTestDatabase() {
  if (!testDb) return;
  
  try {
    // Disable triggers temporarily for faster cleanup
    await testDb.execute(sql`SET session_replication_role = 'replica';`);
    
    // Truncate in order (children first, then parents)
    await testDb.execute(sql`
      TRUNCATE TABLE 
        email_lead_links,
        email_threads,
        email_accounts,
        crm_leads,
        users
      RESTART IDENTITY CASCADE;
    `);
    
    // Re-enable triggers
    await testDb.execute(sql`SET session_replication_role = 'origin';`);
    
    console.log('🧹 Test database cleaned');
  } catch (error) {
    console.error('⚠️  Failed to cleanup test database:', error);
    // Don't throw - let tests continue
  }
}

/**
 * Close test database connection
 */
export async function closeTestDatabase() {
  if (testClient) {
    console.log('👋 Closing test database connection');
    await testClient.end();
    testClient = null;
    testDb = null;
    testPool = null;
  }
}

/**
 * Get test database instance
 */
export function getTestDb() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

/**
 * Global test setup (runs once before all tests)
 */
export async function globalTestSetup() {
  await setupTestDatabase();
}

/**
 * Global test teardown (runs once after all tests)
 */
export async function globalTestTeardown() {
  await closeTestDatabase();
}
