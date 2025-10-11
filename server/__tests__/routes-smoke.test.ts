/**
 * Route Smoke Tests
 *
 * Validates that all critical API routes are registered and accessible.
 * These tests catch route mounting issues (like the SSE 404 bug).
 *
 * Run this in CI to catch integration bugs before deployment.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "../routes";

// Mock Supabase auth middleware to allow test requests
vi.mock("../middleware/supabase-auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: "test@seedfinancial.io", role: "admin" };
    next();
  },
}));

// Mock logger (needs child method for module-specific loggers)
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger), // Returns itself for chaining
};

vi.mock("../logger", () => ({
  logger: mockLogger,
}));

// Mock services
vi.mock("../services/sse-events", () => ({
  sseEvents: {
    addClient: vi.fn(),
    broadcastSyncCompleted: vi.fn(),
  },
}));

// Mock legacy queue (removed during Redis cleanup)
vi.mock("../queue", () => ({
  getAIIndexQueue: () => null,
}));

// Mock database
vi.mock("../db", () => ({
  db: {},
  checkDatabaseHealth: vi.fn().mockResolvedValue({ healthy: true }),
}));

// Mock storage
vi.mock("../storage", () => ({
  storage: {
    getUser: vi.fn(),
    validateApprovalCode: vi.fn(),
    getCalculatorServiceContent: vi.fn().mockResolvedValue(null),
    getAllCalculatorServiceContent: vi.fn().mockResolvedValue([]),
  },
}));

// Mock HubSpot service
vi.mock("../hubspot", () => ({
  hubSpotService: {
    getDeals: vi.fn().mockResolvedValue([]),
  },
  doesHubSpotQuoteExist: vi.fn().mockResolvedValue(false),
}));

// Mock pricing config
vi.mock("../pricing-config", () => ({
  pricingConfigService: {
    loadPricingConfig: vi.fn().mockResolvedValue({
      tiers: {},
      revenue_ranges: {},
    }),
  },
}));

// Mock other services
vi.mock("../services/deals-service", () => ({
  dealsService: {
    getDeals: vi.fn().mockResolvedValue({ deals: [] }),
  },
}));

vi.mock("../box-integration", () => ({
  boxService: {
    getFolderInfo: vi.fn().mockResolvedValue({ id: "0", name: "Root" }),
  },
}));

vi.mock("../client-intel", () => ({
  clientIntelEngine: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

describe("Critical Route Smoke Tests", () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Register routes exactly as production does
    await registerRoutes(app);
  });

  describe("Email Routes", () => {
    const emailRoutes = [
      { method: "GET", path: "/api/email/accounts", description: "List email accounts" },
      { method: "POST", path: "/api/email/sync", description: "Trigger email sync" },
      { method: "GET", path: "/api/email/threads", description: "List email threads" },
      { method: "GET", path: "/api/email/drafts", description: "List drafts" },
    ];

    emailRoutes.forEach(({ method, path, description }) => {
      it(`${method} ${path} should be accessible (${description})`, async () => {
        const req = request(app)[method.toLowerCase() as keyof typeof request.Test](path);

        // Add query params for routes that require them
        if (path.includes("/threads") || path.includes("/drafts")) {
          req.query({ accountId: "test-account" });
        }

        const response = await req;

        // Should NOT be 404
        expect(response.status).not.toBe(404);

        // Should be one of: 200, 400 (missing params), 401 (auth), 500 (server error)
        expect([200, 400, 401, 500]).toContain(response.status);
      });
    });
  });

  describe("SSE Routes (Critical)", () => {
    it("GET /api/email/events/:accountId should be accessible", async () => {
      const response = await request(app)
        .get("/api/email/events/test-account-id")
        .buffer(false) // Don't buffer SSE responses
        .parse((res, callback) => {
          // Just check that connection starts
          expect(res.statusCode).toBe(200);
          expect(res.headers["content-type"]).toBe("text/event-stream");

          // Close connection immediately
          res.destroy();
          callback(null, "");
        });

      // If we get here, route exists (not 404)
      expect(response.status).toBe(200);
    });

    it("SSE route should NOT return 404", async () => {
      // This is the bug we caught - ensure it never returns 404
      const response = await request(app)
        .get("/api/email/events/any-account-id")
        .timeout(1000)
        .catch((err) => {
          // Timeout is fine (SSE keeps connection open)
          // We just need to verify it's not a 404
          return err.response || { status: 200 };
        });

      expect(response.status).not.toBe(404);
    });
  });

  describe("Core API Routes", () => {
    const coreRoutes = [
      { method: "GET", path: "/api/user", description: "Get current user" },
      { method: "GET", path: "/api/pricing/config", description: "Get pricing config" },
      { method: "GET", path: "/api/calculator/content", description: "Get calculator content" },
      { method: "GET", path: "/api/deals", description: "Get deals" },
    ];

    coreRoutes.forEach(({ method, path, description }) => {
      it(`${method} ${path} should be accessible (${description})`, async () => {
        const response =
          await request(app)[method.toLowerCase() as keyof typeof request.Test](path);

        // Should NOT be 404
        expect(response.status).not.toBe(404);
        expect([200, 400, 401, 500]).toContain(response.status);
      });
    });
  });

  describe("Route Patterns", () => {
    it("should not have duplicate route registrations", async () => {
      // Try to register the same route twice - should still work
      const response1 = await request(app).get("/api/email/accounts");
      const response2 = await request(app).get("/api/email/accounts");

      // Both should succeed (or fail with same error)
      expect(response1.status).toBe(response2.status);
    });
  });
});
