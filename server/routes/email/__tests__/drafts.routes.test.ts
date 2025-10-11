/**
 * Email Drafts Routes Tests
 *
 * Tests for draft creation/update and SSE event broadcasting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import draftsRouter from "../drafts.routes";

// Mock database
vi.mock("../../../db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: "draft-123",
        accountId: "account-456",
        subject: "Test Draft",
        to: [{ email: "recipient@example.com", name: "Recipient" }],
        bodyHtml: "<p>Draft body</p>",
        bodyText: "Draft body",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
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

// Mock SSE events
const mockBroadcastDraftSaved = vi.fn();
vi.mock("../../../services/sse-events", () => ({
  sseEvents: {
    broadcastDraftSaved: mockBroadcastDraftSaved,
  },
}));

describe("Email Drafts Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(draftsRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/email/drafts - Create Draft", () => {
    it("should create draft and broadcast SSE event", async () => {
      const { db } = await import("../../../db");

      // Mock account verification
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: "account-456", userId: "test-user-123" }]),
      } as any);

      // Mock draft insertion
      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([
          {
            id: "draft-new-123",
            accountId: "account-456",
            subject: "New Draft Subject",
            to: [{ email: "test@example.com", name: "Test" }],
            bodyHtml: "<p>Draft content</p>",
            bodyText: "Draft content",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      } as any);

      const response = await request(app)
        .post("/api/email/drafts")
        .set("x-test-auth", "valid")
        .send({
          accountId: "account-456",
          to: [{ email: "test@example.com", name: "Test" }],
          subject: "New Draft Subject",
          bodyHtml: "<p>Draft content</p>",
          bodyText: "Draft content",
        })
        .expect(200);

      expect(response.body.id).toBe("draft-new-123");
      expect(response.body.subject).toBe("New Draft Subject");

      // Verify SSE broadcast was called
      expect(mockBroadcastDraftSaved).toHaveBeenCalledWith("account-456", {
        draftId: "draft-new-123",
        subject: "New Draft Subject",
      });
    });

    it("should update existing draft and broadcast SSE event", async () => {
      const { db } = await import("../../../db");

      // Mock account verification
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: "account-456", userId: "test-user-123" }]),
      } as any);

      // Mock draft update
      vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([
          {
            id: "draft-existing-456",
            accountId: "account-456",
            subject: "Updated Draft Subject",
            to: [{ email: "test@example.com", name: "Test" }],
            bodyHtml: "<p>Updated content</p>",
            bodyText: "Updated content",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      } as any);

      const response = await request(app)
        .post("/api/email/drafts")
        .set("x-test-auth", "valid")
        .send({
          id: "draft-existing-456",
          accountId: "account-456",
          to: [{ email: "test@example.com", name: "Test" }],
          subject: "Updated Draft Subject",
          bodyHtml: "<p>Updated content</p>",
        })
        .expect(200);

      expect(response.body.id).toBe("draft-existing-456");
      expect(response.body.subject).toBe("Updated Draft Subject");

      // Verify SSE broadcast was called with updated data
      expect(mockBroadcastDraftSaved).toHaveBeenCalledWith("account-456", {
        draftId: "draft-existing-456",
        subject: "Updated Draft Subject",
      });
    });

    it("should return 401 when unauthenticated", async () => {
      const response = await request(app)
        .post("/api/email/drafts")
        .send({
          accountId: "account-456",
          subject: "Test",
          bodyHtml: "<p>Test</p>",
        })
        .expect(401);

      expect(response.body).toEqual({ error: "Unauthorized" });
      expect(mockBroadcastDraftSaved).not.toHaveBeenCalled();
    });

    it("should return 400 when accountId is missing", async () => {
      const response = await request(app)
        .post("/api/email/drafts")
        .set("x-test-auth", "valid")
        .send({
          subject: "Test",
          bodyHtml: "<p>Test</p>",
        })
        .expect(400);

      expect(response.body).toEqual({ error: "accountId is required" });
      expect(mockBroadcastDraftSaved).not.toHaveBeenCalled();
    });

    it("should not crash if SSE broadcast fails", async () => {
      const { db } = await import("../../../db");

      // Mock account verification
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: "account-456", userId: "test-user-123" }]),
      } as any);

      // Mock draft insertion
      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([
          {
            id: "draft-789",
            accountId: "account-456",
            subject: "Test",
            to: [],
            bodyHtml: "",
            bodyText: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      } as any);

      // Make SSE broadcast throw
      mockBroadcastDraftSaved.mockImplementationOnce(() => {
        throw new Error("SSE unavailable");
      });

      // Should still succeed
      const response = await request(app)
        .post("/api/email/drafts")
        .set("x-test-auth", "valid")
        .send({
          accountId: "account-456",
          subject: "Test",
          bodyHtml: "<p>Test</p>",
        })
        .expect(200);

      expect(response.body.id).toBe("draft-789");
    });
  });
});
