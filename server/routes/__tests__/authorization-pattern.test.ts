/**
 * Authorization Pattern Tests
 *
 * Ensures routes use requirePermission middleware instead of inline auth checks
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

describe("Authorization Pattern Enforcement", () => {
  let app: Express;

  beforeAll(async () => {
    // Import the app
    const { app: testApp } = await import("../../index");
    app = testApp;
  });

  describe("KB Routes", () => {
    it("should reject unauthorized POST /api/kb/articles", async () => {
      const response = await request(app).post("/api/kb/articles").send({
        title: "Test",
        slug: "test",
        content: "Test content",
      });

      // Should get 401 (no auth) or 403 (no permission), not 500
      expect([401, 403]).toContain(response.status);
    });

    it("should reject unauthorized PATCH /api/kb/articles/:id", async () => {
      const response = await request(app).patch("/api/kb/articles/1").send({ title: "Updated" });

      expect([401, 403]).toContain(response.status);
    });

    it("should reject unauthorized DELETE /api/kb/articles/:id", async () => {
      const response = await request(app).delete("/api/kb/articles/1");

      expect([401, 403]).toContain(response.status);
    });
  });

  describe("Admin Routes", () => {
    it("should reject unauthorized GET /api/admin/users", async () => {
      const response = await request(app).get("/api/admin/users");

      expect([401, 403]).toContain(response.status);
    });

    it("should reject unauthorized POST /api/admin/users", async () => {
      const response = await request(app).post("/api/admin/users").send({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
      });

      expect([401, 403]).toContain(response.status);
    });

    it("should reject unauthorized DELETE /api/admin/users/:id", async () => {
      const response = await request(app).delete("/api/admin/users/1");

      expect([401, 403]).toContain(response.status);
    });
  });
});

describe("ESLint Rule Enforcement", () => {
  it("should not have inline req.user.role checks in kb.ts", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const filePath = path.join(__dirname, "../kb.ts");
    const content = await fs.readFile(filePath, "utf-8");

    // Should not have req.user.role or req.user?.role checks
    // (except in comments or eslint-disable lines)
    const lines = content.split("\n");
    const violations = lines.filter((line, index) => {
      const hasViolation = /req\.(user|principal)\??\.role/.test(line);
      const isComment = /^\s*(\/\/|\/\*)/.test(line);
      const isDisabled = /eslint-disable/.test(line);

      return hasViolation && !isComment && !isDisabled;
    });

    expect(violations).toEqual([]);
  });

  it("should not have ensureAdmin guard function in kb.ts", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const filePath = path.join(__dirname, "../kb.ts");
    const content = await fs.readFile(filePath, "utf-8");

    // Should not define ensureAdmin function
    expect(content).not.toContain("function ensureAdmin");
  });

  it("should use requirePermission middleware in kb.ts", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const filePath = path.join(__dirname, "../kb.ts");
    const content = await fs.readFile(filePath, "utf-8");

    // Should import requirePermission
    expect(content).toContain("requirePermission");

    // Should use requirePermission in routes
    expect(content).toMatch(/requirePermission\(["']kb\./);
  });

  it("should use standard authorization pattern in admin-routes.ts", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const filePath = path.join(__dirname, "../../admin-routes.ts");
    const content = await fs.readFile(filePath, "utf-8");

    // Should use requirePermission
    expect(content).toContain("requirePermission");

    // Should have migration comment
    expect(content).toContain("AUTHORIZATION_PATTERN.md");
  });
});
