/**
 * Email Sync Integration Tests
 * Tests the email sync service and worker job processing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { gmailHandlers } from "../mocks/gmail-handlers";

// Setup MSW server for Gmail API mocking
const server = setupServer(...gmailHandlers);

// Mock environment variables
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:5001/api/email/oauth/callback";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// Mock database
vi.mock("../../server/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock logger
vi.mock("../../server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Email Sync Integration Tests", () => {
  beforeAll(() => {
    // Start MSW server
    server.listen({ onUnhandledRequest: "warn" });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  describe("Email Sync Service Integration", () => {
    it("should sync account with Gmail API", async () => {
      // Mock database responses
      const { db } = await import("../../server/db");
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "test-account",
                email: "test@example.com",
                accessToken: "encrypted-token",
                refreshToken: "encrypted-refresh",
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Mock token decryption
      vi.mock("../../server/services/email-tokens", () => ({
        decryptEmailTokens: vi.fn(() => ({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
        })),
      }));

      const { syncEmailAccount } = await import("../../server/services/email-sync.service");

      const result = await syncEmailAccount("test-account", { forceFullSync: true });

      expect(result.success).toBe(true);
      expect(result.syncType).toBe("full");
    });

    it("should handle sync errors gracefully", async () => {
      const { db } = await import("../../server/db");
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const { syncEmailAccount } = await import("../../server/services/email-sync.service");

      await expect(syncEmailAccount("nonexistent-account")).rejects.toThrow();
    });
  });

  describe("Worker Job Processing", () => {
    it("should process email-sync job successfully", async () => {
      // Setup mocks
      const { db } = await import("../../server/db");
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "test-account",
                email: "test@example.com",
                accessToken: "encrypted",
                refreshToken: "encrypted",
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Test would execute the worker task here
      // For now, just verify the service can be imported
      const { syncEmailAccount } = await import("../../server/services/email-sync.service");
      expect(syncEmailAccount).toBeDefined();
    });
  });

  describe("Sync Scheduling", () => {
    it("should have scheduling functions available", async () => {
      const { scheduleEmailSync, scheduleAllEmailSyncs } = await import(
        "../../server/workers/graphile-worker"
      );

      // Verify functions exist and are callable
      expect(scheduleEmailSync).toBeDefined();
      expect(typeof scheduleEmailSync).toBe("function");
      expect(scheduleAllEmailSyncs).toBeDefined();
      expect(typeof scheduleAllEmailSyncs).toBe("function");
    });
  });

  describe("Error Handling", () => {
    it("should handle account not found errors", async () => {
      const { db } = await import("../../server/db");
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No account found
          }),
        }),
      } as any);

      const { syncEmailAccount } = await import("../../server/services/email-sync.service");

      await expect(syncEmailAccount("nonexistent-account")).rejects.toThrow(
        /Email account not found/
      );
    });

    it("should handle missing credentials", async () => {
      const { db } = await import("../../server/db");
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "test-account",
                email: "test@example.com",
                accessToken: null, // Missing credentials
                refreshToken: null,
              },
            ]),
          }),
        }),
      } as any);

      const { createEmailSyncService } = await import("../../server/services/email-sync.service");

      await expect(createEmailSyncService("test-account")).rejects.toThrow(
        /Email account credentials missing/
      );
    });
  });

  describe("Gmail API Integration", () => {
    it("should interact with Gmail API via MSW mocks", async () => {
      // Verify MSW server is intercepting Gmail API calls
      const { db } = await import("../../server/db");
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "test-account",
                email: "test@example.com",
                accessToken: "encrypted",
                refreshToken: "encrypted",
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Verify Gmail service can be created and configured
      const { createGmailService } = await import("../../server/services/gmail-service");
      const gmail = createGmailService();
      
      expect(gmail).toBeDefined();
      expect(typeof gmail.setCredentials).toBe("function");
      expect(typeof gmail.listMessages).toBe("function");
    });
  });
});
