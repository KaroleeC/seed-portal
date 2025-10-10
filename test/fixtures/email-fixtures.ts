/**
 * Test fixtures for email-related tests
 * Reusable mock data to keep tests DRY
 */

export const mockEmailThread = {
  id: "thread-1",
  accountId: "account-1",
  gmailThreadId: "gmail-thread-1",
  subject: "Test Email Thread",
  participants: [
    { email: "sender@example.com", name: "John Doe" },
    { email: "recipient@example.com", name: "Jane Smith" },
  ],
  snippet: "This is a test email...",
  messageCount: 3,
  unreadCount: 1,
  hasAttachments: false,
  labels: ["INBOX"],
  isStarred: false,
  lastMessageAt: new Date("2024-01-15T10:30:00Z"),
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T10:30:00Z"),
};

export const mockEmailMessage = {
  id: "msg-1",
  threadId: "thread-1",
  gmailMessageId: "gmail-msg-1",
  from: { email: "sender@example.com", name: "John Doe" },
  to: [{ email: "recipient@example.com", name: "Jane Smith" }],
  cc: [],
  bcc: [],
  subject: "Test Email Message",
  bodyHtml: "<p>Hello, this is a test email.</p>",
  bodyText: "Hello, this is a test email.",
  snippet: "Hello, this is a test email...",
  labels: ["INBOX"],
  isRead: false,
  isStarred: false,
  isDraft: false,
  headers: {},
  sentAt: new Date("2024-01-15T10:30:00Z"),
  receivedAt: new Date("2024-01-15T10:30:00Z"),
  createdAt: new Date("2024-01-15T10:30:00Z"),
  trackingEnabled: false,
  trackingPixelId: null,
  firstOpenedAt: null,
  lastOpenedAt: null,
  openCount: 0,
};

export const mockEmailAccount = {
  id: "account-1",
  userId: "user-1",
  email: "test@example.com",
  provider: "gmail" as const,
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  tokenExpiresAt: new Date(Date.now() + 3600000),
  isActive: true,
  lastSyncedAt: new Date("2024-01-15T10:00:00Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-15T10:00:00Z"),
};

export const mockEmailDraft = {
  id: "draft-1",
  accountId: "account-1",
  to: [{ email: "recipient@example.com", name: "Jane Smith" }],
  cc: [],
  bcc: [],
  subject: "Draft Email",
  bodyHtml: "<p>This is a draft.</p>",
  bodyText: "This is a draft.",
  attachments: [],
  createdAt: new Date("2024-01-15T09:00:00Z"),
  updatedAt: new Date("2024-01-15T09:30:00Z"),
};

export const mockEmailAttachment = {
  id: "attachment-1",
  messageId: "msg-1",
  filename: "document.pdf",
  contentType: "application/pdf",
  size: 102400, // 100KB
  gmailAttachmentId: "gmail-attachment-1",
  storageUrl: null,
  isInline: false,
  contentId: null,
  createdAt: new Date("2024-01-15T10:30:00Z"),
};

// Factory functions for creating test data with overrides
export function createMockThread(overrides: Partial<typeof mockEmailThread> = {}) {
  return { ...mockEmailThread, ...overrides };
}

export function createMockMessage(overrides: Partial<typeof mockEmailMessage> = {}) {
  return { ...mockEmailMessage, ...overrides };
}

export function createMockAccount(overrides: Partial<typeof mockEmailAccount> = {}) {
  return { ...mockEmailAccount, ...overrides };
}

export function createMockDraft(overrides: Partial<typeof mockEmailDraft> = {}) {
  return { ...mockEmailDraft, ...overrides };
}

// Common test scenarios
export const emailTestScenarios = {
  unreadThread: createMockThread({
    unreadCount: 2,
    messageCount: 2,
  }),

  starredThread: createMockThread({
    isStarred: true,
    labels: ["INBOX", "STARRED"],
  }),

  threadWithAttachments: createMockThread({
    hasAttachments: true,
    snippet: "See attached document...",
  }),

  sentMessage: createMockMessage({
    labels: ["SENT"],
    isRead: true,
    from: { email: "me@example.com", name: "Me" },
  }),

  trackedMessage: createMockMessage({
    trackingEnabled: true,
    trackingPixelId: "pixel-123",
    openCount: 3,
    firstOpenedAt: new Date("2024-01-15T11:00:00Z"),
    lastOpenedAt: new Date("2024-01-15T14:00:00Z"),
  }),
};
