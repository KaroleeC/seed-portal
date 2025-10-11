/**
 * Email Threads Routes Tests
 *
 * Tests for thread deletion and SSE event broadcasting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import threadsRouter from "../threads.routes";

// Mock database
vi.mock("../../../db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

// Mock auth middleware
vi.mock("../../../middleware/supabase-auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const authHeader = req.headers["x-test-auth"];
    if (authHeader === "valid") {
      req.user = { id: "test-user-123", email: "test@example.com" };
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  },
}));

// Mock Gmail service
const mockTrashMessage = vi.fn().mockResolvedValue(undefined);
const mockModifyMessageLabels = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../services/gmail-service", () => ({
  createGmailService: vi.fn(() => ({
    setCredentials: vi.fn(),
    trashMessage: mockTrashMessage,
    modifyMessageLabels: mockModifyMessageLabels,
  })),
}));

// Mock email tokens
vi.mock("../../../services/email-tokens", () => ({
  decryptEmailTokens: vi.fn((account) => ({
    accessToken: "decrypted-access-token",
    refreshToken: "decrypted-refresh-token",
  })),
}));

// Mock SSE events
const mockBroadcastEmailDeleted = vi.fn();
vi.mock("../../../services/sse-events", () => ({
  sseEvents: {
    broadcastEmailDeleted: mockBroadcastEmailDeleted,
  },
}));

describe("Email Threads Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(threadsRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("DELETE /api/email/threads/:threadId", () => {
    it("should delete thread and broadcast email-deleted events for each message", async () => {
      const { db } = await import("../../../db");

      // Mock thread lookup
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "thread-123",
            accountId: "account-456",
            subject: "Test Thread",
          },
        ]),
      } as any);

      // Mock account lookup with credentials
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "account-456",
            accessToken: "encrypted-access",
            refreshToken: "encrypted-refresh",
          },
        ]),
      } as any);

      // Mock messages in thread
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([
          {
            id: "msg-1",
            gmailMessageId: "gmail-msg-1",
            threadId: "thread-123",
          },
          {
            id: "msg-2",
            gmailMessageId: "gmail-msg-2",
            threadId: "thread-123",
          },
          {
            id: "msg-3",
            gmailMessageId: "gmail-msg-3",
            threadId: "thread-123",
          },
        ]),
      } as any);

      const response = await request(app)
        .delete("/api/email/threads/thread-123")
        .set("x-test-auth", "valid")
        .expect(200);

      expect(response.body).toEqual({ success: true });

      // Verify Gmail API was called for each message
      expect(mockTrashMessage).toHaveBeenCalledTimes(3);
      expect(mockTrashMessage).toHaveBeenCalledWith("gmail-msg-1");
      expect(mockTrashMessage).toHaveBeenCalledWith("gmail-msg-2");
      expect(mockTrashMessage).toHaveBeenCalledWith("gmail-msg-3");

      // Verify SSE broadcast was called for each message
      expect(mockBroadcastEmailDeleted).toHaveBeenCalledTimes(3);
      expect(mockBroadcastEmailDeleted).toHaveBeenCalledWith("account-456", {
        messageId: "msg-1",
        threadId: "thread-123",
      });
      expect(mockBroadcastEmailDeleted).toHaveBeenCalledWith("account-456", {
        messageId: "msg-2",
        threadId: "thread-123",
      });
      expect(mockBroadcastEmailDeleted).toHaveBeenCalledWith("account-456", {
        messageId: "msg-3",
        threadId: "thread-123",
      });
    });

    it("should return 401 when unauthenticated", async () => {
      const response = await request(app).delete("/api/email/threads/thread-123").expect(401);

      expect(response.body).toEqual({ error: "Unauthorized" });
      expect(mockBroadcastEmailDeleted).not.toHaveBeenCalled();
      expect(mockTrashMessage).not.toHaveBeenCalled();
    });

    it("should return 404 when thread not found", async () => {
      const { db } = await import("../../../db");

      // Mock thread lookup returning empty
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([]),
      } as any);

      const response = await request(app)
        .delete("/api/email/threads/nonexistent")
        .set("x-test-auth", "valid")
        .expect(404);

      expect(response.body).toEqual({ error: "Thread not found" });
      expect(mockBroadcastEmailDeleted).not.toHaveBeenCalled();
    });

    it("should return 400 when account credentials are missing", async () => {
      const { db } = await import("../../../db");

      // Mock thread lookup
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "thread-123",
            accountId: "account-456",
          },
        ]),
      } as any);

      // Mock account lookup with no credentials
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "account-456",
            accessToken: null,
            refreshToken: null,
          },
        ]),
      } as any);

      const response = await request(app)
        .delete("/api/email/threads/thread-123")
        .set("x-test-auth", "valid")
        .expect(400);

      expect(response.body).toEqual({ error: "Account credentials missing" });
      expect(mockBroadcastEmailDeleted).not.toHaveBeenCalled();
    });

    it("should not crash if SSE broadcast fails", async () => {
      const { db } = await import("../../../db");

      // Mock thread lookup
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "thread-789",
            accountId: "account-999",
          },
        ]),
      } as any);

      // Mock account lookup
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "account-999",
            accessToken: "encrypted",
            refreshToken: "encrypted",
          },
        ]),
      } as any);

      // Mock messages
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([
          {
            id: "msg-x",
            gmailMessageId: "gmail-x",
            threadId: "thread-789",
          },
        ]),
      } as any);

      // Make SSE broadcast throw
      mockBroadcastEmailDeleted.mockImplementationOnce(() => {
        throw new Error("SSE unavailable");
      });

      // Should still succeed
      const response = await request(app)
        .delete("/api/email/threads/thread-789")
        .set("x-test-auth", "valid")
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockTrashMessage).toHaveBeenCalled();
    });

    it("should skip messages without gmailMessageId", async () => {
      const { db } = await import("../../../db");

      // Mock thread lookup
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "thread-mixed",
            accountId: "account-456",
          },
        ]),
      } as any);

      // Mock account lookup
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "account-456",
            accessToken: "encrypted",
            refreshToken: "encrypted",
          },
        ]),
      } as any);

      // Mock messages - some with, some without gmailMessageId
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([
          {
            id: "msg-with-gmail",
            gmailMessageId: "gmail-valid",
            threadId: "thread-mixed",
          },
          {
            id: "msg-no-gmail",
            gmailMessageId: null,
            threadId: "thread-mixed",
          },
        ]),
      } as any);

      const response = await request(app)
        .delete("/api/email/threads/thread-mixed")
        .set("x-test-auth", "valid")
        .expect(200);

      // Only one message should be trashed
      expect(mockTrashMessage).toHaveBeenCalledTimes(1);
      expect(mockTrashMessage).toHaveBeenCalledWith("gmail-valid");

      // But both should trigger SSE events
      expect(mockBroadcastEmailDeleted).toHaveBeenCalledTimes(2);
    });
  });
});
