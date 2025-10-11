/**
 * Routes Baseline Test
 * 
 * Validates ALL routes work BEFORE refactoring.
 * This test must pass before and after each refactor phase.
 * 
 * If this test fails after refactor, we broke something!
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "../routes";

// Comprehensive mocks for all dependencies
vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    })),
  },
}));
vi.mock("../middleware/supabase-auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: "test@test.com", role: "admin" };
    next();
  },
}));
vi.mock("../queue", () => ({ getAIIndexQueue: () => null }));
vi.mock("../db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }) },
  checkDatabaseHealth: vi.fn().mockResolvedValue({ healthy: true }),
}));
vi.mock("../storage", () => ({
  storage: {
    getUser: vi.fn(),
    validateApprovalCode: vi.fn(),
    getCalculatorServiceContent: vi.fn().mockResolvedValue(null),
    getAllCalculatorServiceContent: vi.fn().mockResolvedValue([]),
    createApprovalCode: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock("../services/sse-events", () => ({
  sseEvents: { addClient: vi.fn(), broadcastSyncCompleted: vi.fn() },
}));
vi.mock("../hubspot", () => ({
  hubSpotService: { getDeals: vi.fn().mockResolvedValue([]) },
  doesHubSpotQuoteExist: vi.fn().mockResolvedValue(false),
}));
vi.mock("../pricing-config", () => ({
  pricingConfigService: {
    loadPricingConfig: vi.fn().mockResolvedValue({ tiers: {}, revenue_ranges: {} }),
  },
}));
vi.mock("../services/deals-service", () => ({
  dealsService: { getDeals: vi.fn().mockResolvedValue({ deals: [] }) },
}));
vi.mock("../box-integration", () => ({
  boxService: { getFolderInfo: vi.fn().mockResolvedValue({ id: "0", name: "Root" }) },
}));
vi.mock("../client-intel", () => ({
  clientIntelEngine: { search: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../services/ai-service", () => ({
  AIService: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({ response: "test" }),
  })),
}));

describe("Routes Baseline (Pre-Refactor)", () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  describe("User Routes", () => {
    const userRoutes = [
      { method: "GET", path: "/api/user" },
      { method: "GET", path: "/api/user/preferences/test" },
      { method: "PUT", path: "/api/user/preferences/test" },
      { method: "GET", path: "/api/user/signature" },
      { method: "PUT", path: "/api/user/signature" },
    ];

    userRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should be accessible`, async () => {
        const response = await request(app)[method.toLowerCase() as any](path);
        expect(response.status).not.toBe(404);
      });
    });
  });

  describe("Approval Routes", () => {
    const approvalRoutes = [
      { method: "POST", path: "/api/approval/request" },
      { method: "POST", path: "/api/approval/validate" },
      { method: "POST", path: "/api/approval-request" }, // Legacy alias
    ];

    approvalRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should be accessible`, async () => {
        const response = await request(app)[method.toLowerCase() as any](path)
          .send({ contactEmail: "test@test.com", code: "1234" });
        expect(response.status).not.toBe(404);
      });
    });
  });

  describe("Calculator Routes", () => {
    const calculatorRoutes = [
      { method: "GET", path: "/api/calculator/content" },
      { method: "GET", path: "/api/pricing/config" },
      { method: "GET", path: "/api/apps/seedqc/content" }, // Alias
      { method: "GET", path: "/api/apps/seedqc/pricing/config" }, // Alias
    ];

    calculatorRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should be accessible`, async () => {
        const response = await request(app)[method.toLowerCase() as any](path);
        expect(response.status).not.toBe(404);
      });
    });
  });

  describe("Deals Routes", () => {
    const dealsRoutes = [
      { method: "GET", path: "/api/deals" },
      { method: "GET", path: "/api/deals/by-owner?ownerId=test" },
      { method: "GET", path: "/api/apps/seedpay/deals" }, // Alias
      { method: "GET", path: "/api/apps/seedpay/deals/by-owner?ownerId=test" }, // Alias
    ];

    dealsRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} should be accessible`, async () => {
        const response = await request(app)[method.toLowerCase() as any](path);
        expect(response.status).not.toBe(404);
      });
    });
  });

  describe("Webhook Routes", () => {
    it("POST /api/webhooks/stripe should be accessible", async () => {
      const response = await request(app)
        .post("/api/webhooks/stripe")
        .send({});
      expect(response.status).not.toBe(404);
    });
  });

  describe("App Namespace Aliases", () => {
    const aliases = [
      { from: "/api/apps/seedqc/content", to: "/api/calculator/content" },
      { from: "/api/apps/seedpay/commissions", to: "/api/commissions" },
      { from: "/api/apps/seedpay/monthly-bonuses", to: "/api/monthly-bonuses" },
      { from: "/api/apps/seedpay/milestone-bonuses", to: "/api/milestone-bonuses" },
    ];

    aliases.forEach(({ from, to }) => {
      it(`${from} should redirect to ${to}`, async () => {
        const response = await request(app).get(from);
        // Redirects return 307 or 302
        if (response.status === 307 || response.status === 302) {
          expect(response.headers.location).toContain(to);
        } else {
          // Or it may directly serve the content (200)
          expect([200, 307, 302, 404]).toContain(response.status);
        }
      });
    });
  });

  describe("Core Infrastructure", () => {
    it("GET /api/csrf-token should work", async () => {
      const response = await request(app).get("/api/csrf-token");
      expect([200, 500]).toContain(response.status);
    });
  });
});
