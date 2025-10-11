/**
 * User Routes Tests
 *
 * Tests all user management endpoints:
 * - Profile retrieval
 * - Preferences CRUD
 * - Signature management
 * - Image uploads
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import userRoutes from "../user";

// Mock database (hoisted - can't reference external variables)
vi.mock("../../db", () => {
  const mockChain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(() => []),
    update: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(() => [{ prefs: { test: "value" } }]),
    insert: vi.fn(),
    values: vi.fn(),
  };

  // Make methods chainable
  mockChain.select.mockReturnValue(mockChain);
  mockChain.from.mockReturnValue(mockChain);
  mockChain.where.mockReturnValue(mockChain);
  mockChain.update.mockReturnValue(mockChain);
  mockChain.set.mockReturnValue(mockChain);
  mockChain.insert.mockReturnValue(mockChain);
  mockChain.values.mockReturnValue(mockChain);

  return { db: mockChain };
});

// Mock auth middleware
vi.mock("../../middleware/supabase-auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: "test@test.com", role: "admin" };
    next();
  },
}));

// Mock Supabase client
const mockStorage = {
  from: vi.fn(() => mockStorage),
  upload: vi.fn().mockResolvedValue({ data: { path: "test.jpg" }, error: null }),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/test.jpg" } })),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ storage: mockStorage })),
}));

// Mock signature generator
vi.mock("../../utils/signature-generator", () => ({
  generateSignatureHTML: vi.fn((config) => `<div>${config.name}</div>`),
}));

describe("User Routes", () => {
  let app: express.Application;
  let mockDb: any;

  beforeAll(async () => {
    // Import mocked db after mocks are set up
    const dbModule = await import("../../db");
    mockDb = dbModule.db;

    app = express();
    app.use(express.json());
    app.use(userRoutes);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user", () => {
    it("should return current user profile", async () => {
      const response = await request(app).get("/api/user").expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        email: "test@test.com",
        role: "admin",
      });
    });

    it("should include all user field keys (even if undefined)", async () => {
      const response = await request(app).get("/api/user");

      // Route returns all fields, even if user doesn't have them populated
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("email");
      expect(response.body).toHaveProperty("role");
      // Other fields will be undefined if not in mock, which is correct
      expect(response.body).toHaveProperty("isImpersonating");
    });
  });

  describe("GET /api/user/preferences/:scope", () => {
    it("should return preferences for scope", async () => {
      mockDb.limit.mockReturnValueOnce([{ prefs: { theme: "dark" } }]);

      const response = await request(app).get("/api/user/preferences/seedmail").expect(200);

      expect(response.body).toEqual({ theme: "dark" });
    });

    it("should return null if no preferences exist", async () => {
      mockDb.limit.mockReturnValueOnce([]);

      const response = await request(app).get("/api/user/preferences/nonexistent").expect(200);

      expect(response.body).toBeNull();
    });

    it("should require scope parameter", async () => {
      const response = await request(app).get("/api/user/preferences/").expect(404); // Empty param = not found

      // Note: Express treats this as 404, not our validation
    });
  });

  describe("PUT /api/user/preferences/:scope", () => {
    it("should create new preferences", async () => {
      mockDb.limit.mockReturnValueOnce([]); // No existing prefs
      mockDb.returning.mockReturnValueOnce([{ prefs: { test: "new" } }]);

      const response = await request(app)
        .put("/api/user/preferences/test-scope")
        .send({ prefs: { test: "new" } })
        .expect(200);

      expect(response.body).toEqual({ test: "new" });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should update existing preferences", async () => {
      mockDb.limit.mockReturnValueOnce([{ prefs: { old: "value" } }]); // Existing
      mockDb.returning.mockReturnValueOnce([{ prefs: { updated: "value" } }]);

      const response = await request(app)
        .put("/api/user/preferences/existing-scope")
        .send({ prefs: { updated: "value" } })
        .expect(200);

      expect(response.body).toEqual({ updated: "value" });
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("GET /api/user/signature", () => {
    it("should return signature config", async () => {
      mockDb.limit.mockReturnValueOnce([
        {
          emailSignature: JSON.stringify({ name: "John Doe" }),
          emailSignatureEnabled: true,
        },
      ]);

      const response = await request(app).get("/api/user/signature").expect(200);

      expect(response.body).toEqual({
        config: { name: "John Doe" },
        enabled: true,
      });
    });

    it("should handle missing signature", async () => {
      mockDb.limit.mockReturnValueOnce([
        {
          emailSignature: null,
          emailSignatureEnabled: true,
        },
      ]);

      const response = await request(app).get("/api/user/signature").expect(200);

      expect(response.body).toEqual({
        config: null,
        enabled: true,
      });
    });

    it("should handle invalid JSON gracefully", async () => {
      mockDb.limit.mockReturnValueOnce([
        {
          emailSignature: "invalid json{",
          emailSignatureEnabled: false,
        },
      ]);

      const response = await request(app).get("/api/user/signature").expect(200);

      expect(response.body.config).toBeNull();
    });
  });

  describe("PUT /api/user/signature", () => {
    it("should update signature with HTML generation", async () => {
      const response = await request(app)
        .put("/api/user/signature")
        .send({
          config: { name: "Jane Doe", title: "CEO" },
          enabled: true,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        config: { name: "Jane Doe", title: "CEO" },
        enabled: true,
        message: "Signature updated successfully",
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it("should handle null config", async () => {
      const response = await request(app)
        .put("/api/user/signature")
        .send({ config: null, enabled: false })
        .expect(200);

      expect(response.body.config).toBeNull();
      expect(response.body.enabled).toBe(false);
    });
  });

  describe("POST /api/upload/signature-image", () => {
    it("should upload image and return URL", async () => {
      // Mock Supabase env vars
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

      const response = await request(app)
        .post("/api/upload/signature-image")
        .attach("file", Buffer.from("fake image data"), "test.jpg")
        .expect(200);

      expect(response.body).toHaveProperty("url");
      expect(response.body.url).toContain("https://");

      // Cleanup
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it("should reject non-image files", async () => {
      const response = await request(app)
        .post("/api/upload/signature-image")
        .attach("file", Buffer.from("not an image"), "test.txt")
        .expect(500); // Multer rejects before our handler

      // Multer's error handling
    });

    it("should require file parameter", async () => {
      const response = await request(app)
        .post("/api/upload/signature-image")
        .send({}) // No file
        .expect(400);

      expect(response.body.error).toContain("No file uploaded");
    });
  });
});
