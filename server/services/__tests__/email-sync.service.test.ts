/**
 * Email Sync Service Unit Tests
 * Tests the email synchronization logic with mocked Gmail API
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { EmailSyncService, syncEmailAccount } from "../email-sync.service";
import type { GmailService } from "../gmail-service";

// Mock dependencies
vi.mock("../../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../gmail-service", () => ({
  createGmailService: vi.fn(),
}));

vi.mock("../email-tokens", () => ({
  decryptEmailTokens: vi.fn(() => ({
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  })),
}));

vi.mock("../../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EmailSyncService", () => {
  let mockGmail: Partial<GmailService>;
  let syncService: EmailSyncService;

  beforeEach(() => {
    // Create mock Gmail service
    mockGmail = {
      listMessages: vi.fn(),
      getMessage: vi.fn(),
      getProfile: vi.fn(),
      getHistory: vi.fn(),
    };

    syncService = new EmailSyncService(
      mockGmail as GmailService,
      "test-account-id",
      "test@example.com"
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Full Sync", () => {
    it("should perform full sync and insert new threads and messages", async () => {
      // Mock Gmail API responses
      const mockMessages = [
        {
          id: "msg-001",
          threadId: "thread-001",
          from: { email: "sender@example.com", name: "Sender" },
          to: [{ email: "recipient@example.com", name: "Recipient" }],
          subject: "Test Email",
          snippet: "This is a test",
          labels: ["INBOX"],
          isRead: false,
          isStarred: false,
          sentAt: new Date("2024-01-01"),
          receivedAt: new Date("2024-01-01"),
          headers: {},
          bodyHtml: "<p>Test</p>",
          bodyText: "Test",
          attachments: [],
        },
      ];

      vi.mocked(mockGmail.listMessages!).mockResolvedValue(mockMessages);

      // Mock database to return no existing threads/messages
      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing data
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test-id', threadId: 'test-thread-id' }]),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Execute sync
      const result = await syncService.sync({ forceFullSync: true });

      // Assertions
      expect(result.success).toBe(true);
      expect(result.syncType).toBe("full");
      expect(result.messagesProcessed).toBeGreaterThan(0);
      expect(mockGmail.listMessages).toHaveBeenCalledWith({
        maxResults: 50,
        labelIds: undefined,
      });
    });

    it("should handle errors gracefully during full sync", async () => {
      // Mock Gmail API to throw error
      vi.mocked(mockGmail.listMessages!).mockRejectedValue(new Error("Gmail API Error"));

      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Execute sync
      const result = await syncService.sync({ forceFullSync: true });

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toContain("Gmail API Error");
      expect(result.messagesProcessed).toBe(0);
    });

    it("should respect maxResults option", async () => {
      vi.mocked(mockGmail.listMessages!).mockResolvedValue([]);

      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await syncService.sync({ forceFullSync: true, maxResults: 10 });

      expect(mockGmail.listMessages).toHaveBeenCalledWith({
        maxResults: 10,
        labelIds: undefined,
      });
    });
  });

  describe("Incremental Sync", () => {
    it("should perform incremental sync using history API", async () => {
      const mockHistory = {
        history: [
          {
            messagesAdded: [
              {
                message: {
                  id: "msg-002",
                  threadId: "thread-001",
                  labelIds: ["INBOX"],
                },
              },
            ],
          },
        ],
        historyId: "12346",
      };

      const mockMessage = {
        id: "msg-002",
        threadId: "thread-001",
        from: { email: "sender@example.com" },
        to: [{ email: "recipient@example.com" }],
        subject: "New Email",
        snippet: "New message",
        labels: ["INBOX"],
        isRead: false,
        isStarred: false,
        sentAt: new Date("2024-01-02"),
        receivedAt: new Date("2024-01-02"),
        headers: {},
        attachments: [],
      };

      vi.mocked(mockGmail.getHistory!).mockResolvedValue(mockHistory);
      vi.mocked(mockGmail.getMessage!).mockResolvedValue(mockMessage);

      const { db } = await import("../../db");
      
      // Mock sync state with historyId
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                historyId: "12345",
                accountId: "test-account-id",
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await syncService.sync();

      expect(result.success).toBe(true);
      expect(result.syncType).toBe("incremental");
      expect(mockGmail.getHistory).toHaveBeenCalledWith("12345", 100);
    });

    it("should fallback to full sync if incremental fails", async () => {
      vi.mocked(mockGmail.getHistory!).mockRejectedValue(new Error("Invalid historyId"));
      vi.mocked(mockGmail.listMessages!).mockResolvedValue([]);

      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { historyId: "invalid-id", accountId: "test-account-id" },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await syncService.sync();

      expect(result.success).toBe(true);
      expect(result.syncType).toBe("full");
      expect(mockGmail.listMessages).toHaveBeenCalled();
    });

    it("should handle deleted messages in history", async () => {
      const mockHistory = {
        history: [
          {
            messagesDeleted: [
              {
                message: {
                  id: "msg-deleted",
                  threadId: "thread-001",
                },
              },
            ],
          },
        ],
        historyId: "12347",
      };

      vi.mocked(mockGmail.getHistory!).mockResolvedValue(mockHistory);

      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ historyId: "12345" }]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await syncService.sync();

      expect(result.success).toBe(true);
      // Should update deleted message with TRASH label
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe("Message Processing", () => {
    it("should deduplicate existing messages", async () => {
      const mockMessages = [
        {
          id: "existing-msg",
          threadId: "thread-001",
          from: { email: "sender@example.com" },
          to: [{ email: "recipient@example.com" }],
          subject: "Existing",
          snippet: "Already in DB",
          labels: ["INBOX"],
          isRead: true,
          isStarred: false,
          sentAt: new Date("2024-01-01"),
          receivedAt: new Date("2024-01-01"),
          headers: {},
          attachments: [],
        },
      ];

      vi.mocked(mockGmail.listMessages!).mockResolvedValue(mockMessages);

      const { db } = await import("../../db");
      
      // Mock that thread and message already exist
      let callCount = 0;
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(async () => {
              callCount++;
              if (callCount === 1) return []; // Sync state check
              if (callCount === 2) return [{ id: "thread-db-id" }]; // Thread exists
              return [{ id: "msg-db-id" }]; // Message exists
            }),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const insertMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: insertMock,
      } as any);

      await syncService.sync({ forceFullSync: true });

      // Should not insert duplicate message
      expect(insertMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ gmailMessageId: "existing-msg" })
      );
    });

    it("should group messages by thread correctly", async () => {
      const mockMessages = [
        {
          id: "msg-001",
          threadId: "thread-001",
          from: { email: "sender@example.com" },
          to: [{ email: "recipient@example.com" }],
          subject: "Thread 1 Message 1",
          snippet: "First message",
          labels: ["INBOX"],
          isRead: false,
          isStarred: false,
          sentAt: new Date("2024-01-01"),
          receivedAt: new Date("2024-01-01"),
          headers: {},
          attachments: [],
        },
        {
          id: "msg-002",
          threadId: "thread-001",
          from: { email: "recipient@example.com" },
          to: [{ email: "sender@example.com" }],
          subject: "Re: Thread 1 Message 1",
          snippet: "Reply",
          labels: ["INBOX"],
          isRead: false,
          isStarred: false,
          sentAt: new Date("2024-01-02"),
          receivedAt: new Date("2024-01-02"),
          headers: {},
          attachments: [],
        },
        {
          id: "msg-003",
          threadId: "thread-002",
          from: { email: "other@example.com" },
          to: [{ email: "recipient@example.com" }],
          subject: "Different Thread",
          snippet: "Separate conversation",
          labels: ["INBOX"],
          isRead: false,
          isStarred: false,
          sentAt: new Date("2024-01-03"),
          receivedAt: new Date("2024-01-03"),
          headers: {},
          attachments: [],
        },
      ];

      vi.mocked(mockGmail.listMessages!).mockResolvedValue(mockMessages);

      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-id', threadId: 'test-thread-id' }]),
      });
      
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await syncService.sync({ forceFullSync: true });

      // Should create 2 threads - check values() calls for gmailThreadId
      const threadInserts = valuesMock.mock.calls.filter((call) =>
        call[0].hasOwnProperty("gmailThreadId")
      );
      expect(threadInserts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Sync State Management", () => {
    it("should update sync status to 'syncing' at start", async () => {
      vi.mocked(mockGmail.listMessages!).mockResolvedValue([]);

      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const updateMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({
        set: updateMock,
      } as any);

      await syncService.sync({ forceFullSync: true });

      // Should call update with syncStatus: 'syncing'
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ syncStatus: "syncing" })
      );
    });

    it("should update sync status to 'idle' on success", async () => {
      vi.mocked(mockGmail.listMessages!).mockResolvedValue([]);

      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const updateMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({
        set: updateMock,
      } as any);

      await syncService.sync({ forceFullSync: true });

      // Should eventually call update with syncStatus: 'idle'
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ syncStatus: "idle" })
      );
    });

    it("should update sync status to 'error' on failure", async () => {
      vi.mocked(mockGmail.listMessages!).mockRejectedValue(new Error("Sync failed"));

      const { db } = await import("../../db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const updateMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({
        set: updateMock,
      } as any);

      const result = await syncService.sync({ forceFullSync: true });

      expect(result.success).toBe(false);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ syncStatus: "error" })
      );
    });
  });
});
