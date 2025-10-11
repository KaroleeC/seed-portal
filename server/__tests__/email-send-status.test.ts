import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { nanoid } from "nanoid";

// Mock database
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("../db", () => ({
  db: mockDb,
}));

// Mock services
vi.mock("../services/email-send.service", () => ({
  createEmailSendService: vi.fn(() => ({
    sendEmail: vi.fn().mockResolvedValue({
      id: "gmail-msg-123",
      threadId: "gmail-thread-123",
      messageId: "db-msg-123",
    }),
  })),
}));

vi.mock("../services/email-tokens", () => ({
  decryptEmailTokens: vi.fn(() => ({
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  })),
}));

// Import after mocks
import trackingRoutes from "../routes/email/tracking.routes";

describe("Email Send Status & Retry API", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req: any, res, next) => {
      req.user = { id: "user-123" };
      req.principal = { userId: "user-123" };
      next();
    });
    
    app.use(trackingRoutes);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/email/send-status/:messageId", () => {
    it("should return send status for a message", async () => {
      const mockStatus = {
        id: "status-123",
        messageId: "msg-123",
        status: "sent",
        sentAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockStatus]),
      });

      const response = await request(app)
        .get("/api/email/send-status/msg-123")
        .expect(200);

      expect(response.body).toEqual(mockStatus);
    });

    it("should return null if no send status exists", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .get("/api/email/send-status/msg-999")
        .expect(200);

      expect(response.body).toBeNull();
    });
  });

  describe("POST /api/email/retry-send/:statusId", () => {
    it("should retry a failed send successfully", async () => {
      const mockSendStatus = {
        id: "status-123",
        draftId: "draft-123",
        status: "failed",
        retryCount: 0,
        maxRetries: 3,
        errorMessage: "Temporary failure",
      };

      const mockDraft = {
        email_drafts: {
          id: "draft-123",
          to: [{ email: "test@example.com" }],
          cc: [],
          bcc: [],
          subject: "Test Subject",
          bodyHtml: "<p>Test</p>",
          bodyText: "Test",
        },
        email_accounts: {
          id: "account-123",
          email: "sender@example.com",
          userId: "user-123",
        },
      };

      // Mock database calls
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSendStatus]),
      }).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDraft]),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      const response = await request(app)
        .post("/api/email/retry-send/status-123")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        retryCount: 1,
      });
    });

    it("should reject retry if max retries exceeded", async () => {
      const mockSendStatus = {
        id: "status-123",
        draftId: "draft-123",
        status: "failed",
        retryCount: 3,
        maxRetries: 3,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSendStatus]),
      });

      const response = await request(app)
        .post("/api/email/retry-send/status-123")
        .expect(400);

      expect(response.body).toMatchObject({
        error: "Maximum retry attempts exceeded",
        retryCount: 3,
        maxRetries: 3,
      });
    });

    it("should return 404 if send status not found", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post("/api/email/retry-send/invalid-status")
        .expect(404);

      expect(response.body).toMatchObject({
        error: "Send status not found",
      });
    });

    it("should return 400 if no draft associated", async () => {
      const mockSendStatus = {
        id: "status-123",
        draftId: null,
        status: "failed",
        retryCount: 0,
        maxRetries: 3,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSendStatus]),
      });

      const response = await request(app)
        .post("/api/email/retry-send/status-123")
        .expect(400);

      expect(response.body).toMatchObject({
        error: "No draft associated with this send status",
      });
    });

    it("should return 403 if user doesn't own the account", async () => {
      const mockSendStatus = {
        id: "status-123",
        draftId: "draft-123",
        status: "failed",
        retryCount: 0,
        maxRetries: 3,
      };

      const mockDraft = {
        email_drafts: {
          id: "draft-123",
        },
        email_accounts: {
          userId: "other-user", // Different user
        },
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSendStatus]),
      }).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDraft]),
      });

      const response = await request(app)
        .post("/api/email/retry-send/status-123")
        .expect(403);

      expect(response.body).toMatchObject({
        error: "Unauthorized",
      });
    });
  });
});
