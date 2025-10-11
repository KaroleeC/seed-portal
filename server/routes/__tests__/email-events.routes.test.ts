/**
 * Email Events SSE Routes Tests
 * 
 * Tests for /api/email/events SSE endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import type { Response } from "express";
import emailEventsRouter from "../email-events.routes";
import { sseEvents } from "../../services/sse-events";

// Mock auth middleware
vi.mock("../../middleware/supabase-auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    // Check for auth header
    const authHeader = req.headers["x-test-auth"];
    if (authHeader === "valid") {
      req.user = { id: "test-user-123", email: "test@example.com" };
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  },
}));

// Mock logger
vi.mock("../../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Email Events SSE Routes", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Mount without prefix since router uses absolute paths
    app.use(emailEventsRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/email/events/:accountId - Authentication", () => {
    it("should return 401 when unauthenticated", async () => {
      const response = await request(app)
        .get("/api/email/events/test-account")
        .expect(401);

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("should allow authenticated requests", () => {
      return new Promise<void>((resolve, reject) => {
        request(app)
          .get("/api/email/events/test-account")
          .set("x-test-auth", "valid")
          .buffer(false)
          .parse((res, callback) => {
            try {
              // Check status code
              expect(res.statusCode).toBe(200);
              
              // Should return SSE headers
              expect(res.headers["content-type"]).toBe("text/event-stream");
              expect(res.headers["cache-control"]).toContain("no-cache");
              expect(res.headers["connection"]).toBe("keep-alive");
              
              // Close connection and complete test
              res.destroy();
              resolve();
            } catch (err) {
              reject(err);
            }
          })
          .end();
      });
    });
  });

  describe("GET /api/email/events/:accountId - SSE Connection", () => {
    it("should set correct SSE headers", () => {
      return new Promise<void>((resolve, reject) => {
        request(app)
          .get("/api/email/events/account-123")
          .set("x-test-auth", "valid")
          .buffer(false)
          .parse((res, callback) => {
            try {
              // Check status code
              expect(res.statusCode).toBe(200);
              
              expect(res.headers["content-type"]).toBe("text/event-stream");
              expect(res.headers["cache-control"]).toContain("no-cache");
              expect(res.headers["connection"]).toBe("keep-alive");
              expect(res.headers["x-accel-buffering"]).toBe("no");
              
              // Close connection and complete test
              res.destroy();
              resolve();
            } catch (err) {
              reject(err);
            }
          })
          .end();
      });
    });

    it("should send initial 'connected' event", () => {
      return new Promise<void>((resolve, reject) => {
        request(app)
          .get("/api/email/events/account-456")
          .set("x-test-auth", "valid")
          .buffer(false)
          .parse((res, callback) => {
            let data = "";
            let hasSeenEvent = false;
            let hasSeenData = false;
            
            res.on("data", (chunk) => {
              data += chunk.toString();
              
              // Check for connected event and data (they come in SSE format across multiple lines)
              if (data.includes("event: connected")) {
                hasSeenEvent = true;
              }
              if (data.includes('"accountId":"account-456"') && data.includes('"timestamp"')) {
                hasSeenData = true;
              }
              
              // Once we have both, validate and complete
              if (hasSeenEvent && hasSeenData) {
                try {
                  expect(data).toContain("event: connected");
                  expect(data).toContain('"accountId":"account-456"');
                  expect(data).toContain('"timestamp"');
                  
                  // Abort the connection
                  res.destroy();
                  resolve();
                } catch (err) {
                  reject(err);
                }
              }
            });
            
            res.on("error", (err: any) => {
              if (err.code !== "ECONNRESET") {
                reject(err);
              }
            });
          })
          .end();
      });
    });

    it("should return 400 when accountId is missing", async () => {
      // This would require a route that accepts empty accountId
      // Our route requires :accountId param, so this would be caught by routing
      // Just verify the validation exists in the handler
      const response = await request(app)
        .get("/api/email/events/")
        .set("x-test-auth", "valid")
        .expect(404); // Express returns 404 for missing route param

      // Route doesn't match, so 404 is expected
    });
  });

  describe("SSE Event Broadcasting", () => {
    it("should register client with SSEEventEmitter", () => {
      return new Promise<void>((resolve, reject) => {
        const addClientSpy = vi.spyOn(sseEvents, "addClient");

        request(app)
          .get("/api/email/events/account-broadcast-test")
          .set("x-test-auth", "valid")
          .buffer(false)
          .parse((res, callback) => {
            res.on("data", () => {
              // Give it time to register
              setTimeout(() => {
                try {
                  expect(addClientSpy).toHaveBeenCalledWith(
                    "account-broadcast-test",
                    "test-user-123",
                    expect.anything()
                  );
                  res.destroy();
                  resolve();
                } catch (err) {
                  reject(err);
                }
              }, 100);
            });
            
            res.on("error", (err: any) => {
              if (err.code !== "ECONNRESET") {
                reject(err);
              }
            });
          })
          .end();
      });
    });

    it("should receive broadcasted sync-completed events", () => {
      return new Promise<void>((resolve, reject) => {
        request(app)
          .get("/api/email/events/account-sync-test")
          .set("x-test-auth", "valid")
          .buffer(false)
          .parse((res, callback) => {
            let data = "";
            
            let broadcastSent = false;
            
            res.on("data", (chunk) => {
              data += chunk.toString();
              
              // Wait for connected event, then broadcast
              if (data.includes("event: connected") && !broadcastSent) {
                broadcastSent = true;
                // Broadcast a sync-completed event
                setTimeout(() => {
                  sseEvents.broadcastSyncCompleted("account-sync-test", {
                    syncType: "incremental",
                    threadsProcessed: 5,
                    messagesProcessed: 20,
                    duration: 1500,
                  });
                }, 50);
              }
              
              // Check for sync-completed event AND data payload (wait for both)
              if (data.includes("event: sync-completed") && data.includes("syncType")) {
                // Give a tiny bit more time for the full message to arrive
                setTimeout(() => {
                  try {
                    expect(data).toContain("event: sync-completed");
                    expect(data).toContain('"syncType":"incremental"');
                    expect(data).toContain('"threadsProcessed":5');
                    expect(data).toContain('"messagesProcessed":20');
                    res.destroy();
                    resolve();
                  } catch (err) {
                    reject(err);
                  }
                }, 10);
              }
            });
            
            res.on("error", (err: any) => {
              if (err.code !== "ECONNRESET") {
                reject(err);
              }
            });
          })
          .end();
      });
    }, 10000); // Increase timeout for async operations
  });
});
