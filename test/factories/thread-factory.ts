/**
 * Email Thread Test Factory
 *
 * Creates test email thread data for integration tests
 */

import { nanoid } from "nanoid";

export interface TestEmailThread {
  id: string;
  accountId: string;
  gmailThreadId: string | null;
  subject: string;
  participants: Array<{ name?: string; email: string }>;
  snippet: string | null;
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  labels: string[];
  isStarred: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a test email thread with randomized data
 */
export function createTestThread(overrides: Partial<TestEmailThread> = {}): TestEmailThread {
  const id = overrides.id || nanoid();
  const now = new Date();

  return {
    id,
    accountId: overrides.accountId || nanoid(),
    gmailThreadId: `gmail-${nanoid()}`,
    subject: `Test Email ${id}`,
    snippet: "This is a test email thread",
    participants: [
      { email: "sender@example.com", name: "Test Sender" },
      { email: "recipient@example.com", name: "Test Recipient" },
    ],
    labels: ["INBOX"],
    unreadCount: 0,
    messageCount: 1,
    hasAttachments: false,
    isStarred: false,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create multiple test threads
 */
export function createTestThreads(
  count: number,
  overrides: Partial<TestEmailThread> = {}
): TestEmailThread[] {
  return Array.from({ length: count }, () => createTestThread(overrides));
}

/**
 * Create a test email account
 */
export function createTestEmailAccount(overrides: any = {}) {
  const id = overrides.id || nanoid();
  const now = new Date();
  const expiresAt = new Date(Date.now() + 3600000);

  return {
    id,
    userId: overrides.userId || "1",
    email: `test-${id}@example.com`,
    provider: "google",
    accessToken: "test-token",
    refreshToken: "test-refresh-token",
    tokenExpiresAt: expiresAt,
    lastSyncedAt: null,
    syncEnabled: true,
    meta: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
