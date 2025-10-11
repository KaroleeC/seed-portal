/**
 * API Test Utilities
 *
 * Helper functions for API integration tests
 */

import { setupTestDatabase, cleanupTestDatabase, getTestDb } from "./setup-test-db";

/**
 * Run a test with database setup and cleanup
 *
 * Example:
 * ```ts
 * await withTestDb(async (db) => {
 *   await db.insert(leads).values(createTestLead());
 *   // ... test code
 * });
 * ```
 */
export async function withTestDb<T>(testFn: (db: any) => Promise<T>): Promise<T> {
  const db = await setupTestDatabase();
  try {
    return await testFn(db);
  } finally {
    await cleanupTestDatabase();
  }
}

/**
 * Create a test user for authentication tests
 */
export function createTestUser(overrides: any = {}) {
  return {
    id: overrides.id || 1,
    email: overrides.email || "test@example.com",
    name: overrides.name || "Test User",
    role: overrides.role || "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock authentication for API tests
 */
export function mockAuth(userId = 1) {
  return {
    headers: {
      // Add your auth header format here
      Authorization: `Bearer test-token-${userId}`,
    },
  };
}

// Re-export factories for convenience
export { createTestLead, createTestLeads } from "./factories/lead-factory";
export {
  createTestThread,
  createTestThreads,
  createTestEmailAccount,
} from "./factories/thread-factory";
export { getTestDb } from "./setup-test-db";
