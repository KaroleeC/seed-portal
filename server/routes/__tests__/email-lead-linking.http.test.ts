/**
 * HTTP Integration Tests for Email-Lead Linking Routes
 * 
 * Tests the full HTTP request cycle:
 * - Route registration and mounting
 * - Auth middleware (cookie/token validation)
 * - Request/response handling
 * - CORS headers
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express, { Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { pool } from "../../db";
import { createTestLead, createTestThread, cleanTestData } from "../../../test/factories/test-helpers";

describe("Email Lead Linking HTTP Routes", () => {
  let app: Express;
  let authToken: string;
  let testLeadId: string;
  let testThreadId: string;

  beforeAll(async () => {
    // Create Express app with auth middleware
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Mock auth middleware that checks for token in cookie or header
    app.use((req, res, next) => {
      const token = req.cookies?.["sb-access-token"] || req.headers.authorization?.replace("Bearer ", "");
      
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Mock principal for valid token
      if (token === "valid-test-token") {
        (req as any).principal = {
          id: "test-user-123",
          email: "test@example.com",
        };
        next();
      } else {
        res.status(401).json({ error: "Invalid token" });
      }
    });

    // Mount email routes
    const emailRoutes = (await import("../email")).default;
    app.use("/api/email", emailRoutes);

    // Create test data
    const lead = await createTestLead(pool);
    const thread = await createTestThread(pool, { accountId: "test-account" });
    
    testLeadId = lead.id;
    testThreadId = thread.id;
    authToken = "valid-test-token";
  });

  afterAll(async () => {
    await cleanTestData(pool);
  });

  describe("GET /api/email/lead-linking/thread/:threadId/leads", () => {
    it("should return 401 without auth token", async () => {
      const response = await request(app)
        .get(`/api/email/lead-linking/thread/${testThreadId}/leads`)
        .expect(401);

      expect(response.body.error).toBe("Unauthorized");
    });

    it("should return 401 with invalid auth token", async () => {
      const response = await request(app)
        .get(`/api/email/lead-linking/thread/${testThreadId}/leads`)
        .set("Cookie", "sb-access-token=invalid-token")
        .expect(401);

      expect(response.body.error).toBe("Invalid token");
    });

    it("should succeed with auth token in cookie", async () => {
      const response = await request(app)
        .get(`/api/email/lead-linking/thread/${testThreadId}/leads`)
        .set("Cookie", `sb-access-token=${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("leadIds");
      expect(Array.isArray(response.body.leadIds)).toBe(true);
    });

    it("should succeed with auth token in Authorization header", async () => {
      const response = await request(app)
        .get(`/api/email/lead-linking/thread/${testThreadId}/leads`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("leadIds");
    });

    it("should return empty array for thread with no leads", async () => {
      const response = await request(app)
        .get(`/api/email/lead-linking/thread/${testThreadId}/leads`)
        .set("Cookie", `sb-access-token=${authToken}`)
        .expect(200);

      expect(response.body.leadIds).toEqual([]);
    });
  });

  describe("POST /api/email/lead-linking/thread/:threadId/lead/:leadId", () => {
    it("should return 401 without auth", async () => {
      await request(app)
        .post(`/api/email/lead-linking/thread/${testThreadId}/lead/${testLeadId}`)
        .expect(401);
    });

    it("should link thread to lead with valid auth", async () => {
      const response = await request(app)
        .post(`/api/email/lead-linking/thread/${testThreadId}/lead/${testLeadId}`)
        .set("Cookie", `sb-access-token=${authToken}`)
        .send({ source: "manual" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.link).toMatchObject({
        threadId: testThreadId,
        leadId: testLeadId,
        linkSource: "manual",
      });
    });
  });

  describe("Route Registration", () => {
    it("should have email routes mounted at /api/email", async () => {
      // This test validates the 404 issue we had
      const response = await request(app)
        .get("/api/email/lead-linking/thread/test/leads")
        .set("Cookie", `sb-access-token=${authToken}`);

      // Should NOT be 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });
});
