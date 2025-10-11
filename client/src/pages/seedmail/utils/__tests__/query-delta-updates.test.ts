import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  applyThreadCreated,
  applyThreadUpdated,
  applyThreadDeleted,
  applyUnreadCountUpdated,
  applyMessageCreated,
  applyDraftSaved,
  applyDraftDeleted,
  trackDeltaUpdate,
  getDeltaStats,
  resetDeltaStats,
  type EmailThread,
  type Draft,
  type UnreadCount,
} from "../query-delta-updates";
import type {
  ThreadCreatedEvent,
  ThreadUpdatedEvent,
  ThreadDeletedEvent,
  UnreadCountUpdatedEvent,
  MessageCreatedEvent,
  DraftSavedEvent,
  DraftDeletedEvent,
} from "../../../../../../shared/email-events";

describe("Query Delta Updates", () => {
  let queryClient: QueryClient;
  const accountId = "test-account-123";

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    resetDeltaStats();
  });

  describe("applyThreadCreated", () => {
    it("adds new thread to empty cache", () => {
      const event: ThreadCreatedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        thread: {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "Test Email",
          from: "sender@example.com",
          to: "recipient@example.com",
          snippet: "Test snippet",
          lastMessageDate: new Date().toISOString(),
          unread: true,
          labels: ["INBOX"],
        },
      };

      applyThreadCreated(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads).toHaveLength(1);
      expect(threads?.[0]).toMatchObject(event.thread);
    });

    it("adds new thread to beginning of existing list", () => {
      const existingThreads: EmailThread[] = [
        {
          id: "thread-2",
          gmailThreadId: "gmail-2",
          subject: "Old Email",
          from: "old@example.com",
          to: "recipient@example.com",
          snippet: "Old snippet",
          lastMessageDate: new Date().toISOString(),
          unread: false,
          labels: ["INBOX"],
        },
      ];

      queryClient.setQueryData(["/api/email/threads", accountId], existingThreads);

      const event: ThreadCreatedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        thread: {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "New Email",
          from: "new@example.com",
          to: "recipient@example.com",
          snippet: "New snippet",
          lastMessageDate: new Date().toISOString(),
          unread: true,
          labels: ["INBOX"],
        },
      };

      applyThreadCreated(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads).toHaveLength(2);
      expect(threads?.[0].id).toBe("thread-1"); // New thread first
      expect(threads?.[1].id).toBe("thread-2"); // Old thread second
    });

    it("prevents duplicate threads", () => {
      const existingThreads: EmailThread[] = [
        {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "Existing",
          from: "sender@example.com",
          to: "recipient@example.com",
          snippet: "Existing",
          lastMessageDate: new Date().toISOString(),
          unread: false,
          labels: ["INBOX"],
        },
      ];

      queryClient.setQueryData(["/api/email/threads", accountId], existingThreads);

      const event: ThreadCreatedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        thread: {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "Duplicate",
          from: "sender@example.com",
          to: "recipient@example.com",
          snippet: "Duplicate",
          lastMessageDate: new Date().toISOString(),
          unread: true,
          labels: ["INBOX"],
        },
      };

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      applyThreadCreated(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads).toHaveLength(1); // Still only 1 thread
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Thread already exists"),
        "thread-1"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("applyThreadUpdated", () => {
    it("updates existing thread", () => {
      const existingThreads: EmailThread[] = [
        {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "Old Subject",
          from: "sender@example.com",
          to: "recipient@example.com",
          snippet: "Old snippet",
          lastMessageDate: "2024-01-01T00:00:00Z",
          unread: false,
          labels: ["INBOX"],
        },
      ];

      queryClient.setQueryData(["/api/email/threads", accountId], existingThreads);

      const event: ThreadUpdatedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        threadId: "thread-1",
        changes: {
          subject: "Updated Subject",
          snippet: "Updated snippet",
          unread: true,
        },
      };

      applyThreadUpdated(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads?.[0]).toMatchObject({
        id: "thread-1",
        subject: "Updated Subject",
        snippet: "Updated snippet",
        unread: true,
        // Unchanged fields
        from: "sender@example.com",
        gmailThreadId: "gmail-1",
      });
    });

    it("does not modify other threads", () => {
      const existingThreads: EmailThread[] = [
        {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "Thread 1",
          from: "sender1@example.com",
          to: "recipient@example.com",
          snippet: "Snippet 1",
          lastMessageDate: new Date().toISOString(),
          unread: false,
          labels: ["INBOX"],
        },
        {
          id: "thread-2",
          gmailThreadId: "gmail-2",
          subject: "Thread 2",
          from: "sender2@example.com",
          to: "recipient@example.com",
          snippet: "Snippet 2",
          lastMessageDate: new Date().toISOString(),
          unread: false,
          labels: ["INBOX"],
        },
      ];

      queryClient.setQueryData(["/api/email/threads", accountId], existingThreads);

      const event: ThreadUpdatedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        threadId: "thread-1",
        changes: { subject: "Updated Thread 1" },
      };

      applyThreadUpdated(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads?.[0].subject).toBe("Updated Thread 1");
      expect(threads?.[1].subject).toBe("Thread 2"); // Unchanged
    });

    it("handles non-existent thread gracefully", () => {
      const existingThreads: EmailThread[] = [];
      queryClient.setQueryData(["/api/email/threads", accountId], existingThreads);

      const event: ThreadUpdatedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        threadId: "non-existent",
        changes: { subject: "Updated" },
      };

      applyThreadUpdated(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads).toHaveLength(0); // No error, just no change
    });
  });

  describe("applyThreadDeleted", () => {
    it("removes deleted thread", () => {
      const existingThreads: EmailThread[] = [
        {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "Thread 1",
          from: "sender@example.com",
          to: "recipient@example.com",
          snippet: "Snippet",
          lastMessageDate: new Date().toISOString(),
          unread: false,
          labels: ["INBOX"],
        },
        {
          id: "thread-2",
          gmailThreadId: "gmail-2",
          subject: "Thread 2",
          from: "sender@example.com",
          to: "recipient@example.com",
          snippet: "Snippet",
          lastMessageDate: new Date().toISOString(),
          unread: false,
          labels: ["INBOX"],
        },
      ];

      queryClient.setQueryData(["/api/email/threads", accountId], existingThreads);

      const event: ThreadDeletedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        threadId: "thread-1",
        gmailThreadId: "gmail-1",
      };

      applyThreadDeleted(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads).toHaveLength(1);
      expect(threads?.[0].id).toBe("thread-2");
    });

    it("matches by either id or gmailThreadId", () => {
      const existingThreads: EmailThread[] = [
        {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "Thread 1",
          from: "sender@example.com",
          to: "recipient@example.com",
          snippet: "Snippet",
          lastMessageDate: new Date().toISOString(),
          unread: false,
          labels: ["INBOX"],
        },
      ];

      queryClient.setQueryData(["/api/email/threads", accountId], existingThreads);

      const event: ThreadDeletedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        threadId: "different-id",
        gmailThreadId: "gmail-1", // Matches by Gmail ID
      };

      applyThreadDeleted(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads).toHaveLength(0); // Deleted
    });
  });

  describe("applyUnreadCountUpdated", () => {
    it("updates unread count", () => {
      const event: UnreadCountUpdatedEvent = {
        accountId,
        timestamp: "2024-01-01T12:00:00Z",
        unreadCount: 5,
        previousCount: 3,
        delta: 2,
      };

      applyUnreadCountUpdated(queryClient, accountId, event);

      const count = queryClient.getQueryData<UnreadCount>(["/api/email/unread-count", accountId]);
      expect(count).toEqual({
        count: 5,
        updatedAt: "2024-01-01T12:00:00Z",
      });
    });
  });

  describe("applyMessageCreated", () => {
    it("updates thread with new message info", () => {
      const existingThreads: EmailThread[] = [
        {
          id: "thread-1",
          gmailThreadId: "gmail-1",
          subject: "Thread",
          from: "sender@example.com",
          to: "recipient@example.com",
          snippet: "Old snippet",
          lastMessageDate: "2024-01-01T00:00:00Z",
          unread: false,
          labels: ["INBOX"],
          messageCount: 1,
        },
      ];

      queryClient.setQueryData(["/api/email/threads", accountId], existingThreads);

      const event: MessageCreatedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        message: {
          id: "msg-2",
          gmailMessageId: "gmail-msg-2",
          threadId: "thread-1",
          from: "sender@example.com",
          to: "recipient@example.com",
          subject: "Re: Thread",
          snippet: "New message snippet",
          date: "2024-01-02T00:00:00Z",
          unread: true,
        },
      };

      applyMessageCreated(queryClient, accountId, event);

      const threads = queryClient.getQueryData<EmailThread[]>(["/api/email/threads", accountId]);
      expect(threads?.[0]).toMatchObject({
        snippet: "New message snippet",
        lastMessageDate: "2024-01-02T00:00:00Z",
        unread: true,
        messageCount: 2,
      });
    });
  });

  describe("applyDraftSaved", () => {
    it("adds new draft", () => {
      const event: DraftSavedEvent = {
        accountId,
        timestamp: "2024-01-01T12:00:00Z",
        draft: {
          id: "draft-1",
          subject: "Draft Email",
          to: "recipient@example.com",
          snippet: "Draft content",
        },
      };

      applyDraftSaved(queryClient, accountId, event);

      const drafts = queryClient.getQueryData<Draft[]>(["/api/email/drafts", accountId]);
      expect(drafts).toHaveLength(1);
      expect(drafts?.[0].id).toBe("draft-1");
      expect(drafts?.[0].subject).toBe("Draft Email");
      expect(drafts?.[0].createdAt).toBe("2024-01-01T12:00:00Z");
    });

    it("updates existing draft", () => {
      const existingDrafts: Draft[] = [
        {
          id: "draft-1",
          subject: "Old Subject",
          to: "old@example.com",
          snippet: "Old content",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      queryClient.setQueryData(["/api/email/drafts", accountId], existingDrafts);

      const event: DraftSavedEvent = {
        accountId,
        timestamp: "2024-01-01T12:00:00Z",
        draft: {
          id: "draft-1",
          subject: "Updated Subject",
          to: "new@example.com",
          snippet: "Updated content",
        },
      };

      applyDraftSaved(queryClient, accountId, event);

      const drafts = queryClient.getQueryData<Draft[]>(["/api/email/drafts", accountId]);
      expect(drafts).toHaveLength(1);
      expect(drafts?.[0]).toMatchObject({
        id: "draft-1",
        subject: "Updated Subject",
        to: "new@example.com",
        updatedAt: "2024-01-01T12:00:00Z",
      });
    });
  });

  describe("applyDraftDeleted", () => {
    it("removes deleted draft", () => {
      const existingDrafts: Draft[] = [
        {
          id: "draft-1",
          subject: "Draft 1",
          to: "recipient@example.com",
          snippet: "Content 1",
        },
        {
          id: "draft-2",
          subject: "Draft 2",
          to: "recipient@example.com",
          snippet: "Content 2",
        },
      ];

      queryClient.setQueryData(["/api/email/drafts", accountId], existingDrafts);

      const event: DraftDeletedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        draftId: "draft-1",
      };

      applyDraftDeleted(queryClient, accountId, event);

      const drafts = queryClient.getQueryData<Draft[]>(["/api/email/drafts", accountId]);
      expect(drafts).toHaveLength(1);
      expect(drafts?.[0].id).toBe("draft-2");
    });
  });

  describe("Delta Update Stats", () => {
    it("tracks delta updates", () => {
      resetDeltaStats();

      trackDeltaUpdate();
      trackDeltaUpdate();
      trackDeltaUpdate();

      const stats = getDeltaStats();
      expect(stats.deltasApplied).toBe(3);
      expect(stats.invalidationsAvoided).toBe(3);
      expect(stats.savingsPercentage).toBe(100);
    });

    it("resets stats", () => {
      trackDeltaUpdate();
      trackDeltaUpdate();

      resetDeltaStats();

      const stats = getDeltaStats();
      expect(stats.deltasApplied).toBe(0);
      expect(stats.invalidationsAvoided).toBe(0);
      expect(stats.savingsPercentage).toBe(0);
    });
  });

  describe("Performance", () => {
    it("applies deltas quickly on large thread lists", () => {
      const threads: EmailThread[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `thread-${i}`,
        gmailThreadId: `gmail-${i}`,
        subject: `Email ${i}`,
        from: "sender@example.com",
        to: "recipient@example.com",
        snippet: `Snippet ${i}`,
        lastMessageDate: new Date().toISOString(),
        unread: false,
        labels: ["INBOX"],
      }));

      queryClient.setQueryData(["/api/email/threads", accountId], threads);

      const event: ThreadUpdatedEvent = {
        accountId,
        timestamp: new Date().toISOString(),
        threadId: "thread-500",
        changes: { unread: true },
      };

      const start = Date.now();
      applyThreadUpdated(queryClient, accountId, event);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Should be very fast
    });
  });
});
