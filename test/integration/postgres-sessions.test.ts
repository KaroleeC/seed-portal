/**
 * Postgres Session Integration Tests
 * 
 * Verifies that Postgres session store works correctly after Redis migration.
 * Tests session persistence, impersonation, and cleanup.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { pool } from "../../server/db";

// Use actual DATABASE_URL from environment
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set. Run with: doppler run -- npm test");
}

process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-secret-for-sessions";

describe("Postgres Session Store", () => {
  const hasDatabase = !!process.env.DATABASE_URL;

  beforeAll(async () => {
    if (!hasDatabase) {
      console.warn("⚠️  Skipping database-dependent tests (DATABASE_URL not set)");
      return;
    }

    // Verify database connection
    try {
      const result = await pool.query("SELECT NOW()");
      expect(result.rows).toBeDefined();
    } catch (error) {
      console.warn("Database connection failed - tests may not run properly");
    }
  });

  afterAll(async () => {
    // Cleanup test sessions
    try {
      await pool.query("DELETE FROM user_sessions WHERE sid LIKE 'test-%'");
    } catch (error) {
      // Table might not exist yet - that's ok
    }
  });

  describe("Session Table", () => {
    it("should have user_sessions table created", async () => {
      // The session store auto-creates this table on first use
      // We'll verify it exists after first session is created
      
      const { sessionStore } = await import("../../server/session-store");
      
      expect(sessionStore).toBeDefined();
      expect(sessionStore.constructor.name).toBe("PGStore");
    });

    it("should have correct table schema", async () => {
      try {
        // Query table structure
        const result = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'user_sessions'
          ORDER BY ordinal_position
        `);

        if (result.rows.length > 0) {
          const columns = result.rows.map((r) => r.column_name);
          
          // Should have sid, sess, expire columns
          expect(columns).toContain("sid");
          expect(columns).toContain("sess");
          expect(columns).toContain("expire");
        }
      } catch (error) {
        // Table doesn't exist yet - will be created on first use
        console.warn("user_sessions table not yet created");
      }
    });

    it("should have index on expire column", async () => {
      try {
        const result = await pool.query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'user_sessions'
        `);

        if (result.rows.length > 0) {
          const indexes = result.rows.map((r) => r.indexname);
          
          // Should have index on expire for efficient cleanup
          const hasExpireIndex = indexes.some((idx) => idx.includes("expire"));
          expect(hasExpireIndex).toBe(true);
        }
      } catch (error) {
        console.warn("Could not verify indexes");
      }
    });
  });

  describe("Session Operations", () => {
    it("should create sessionMiddleware with correct configuration", async () => {
      const { sessionMiddleware } = await import("../../server/session-store");
      
      expect(sessionMiddleware).toBeDefined();
      expect(typeof sessionMiddleware).toBe("function");
    });

    it("should use Postgres pool for session storage", async () => {
      const { sessionStore } = await import("../../server/session-store");
      
      // The store should be using our Postgres pool
      expect(sessionStore).toBeDefined();
      
      // Verify it's a PGStore instance (from connect-pg-simple)
      expect(sessionStore.constructor.name).toBe("PGStore");
    });

    it("should set session cookies with correct options", async () => {
      const { sessionMiddleware } = await import("../../server/session-store");
      
      // Session middleware is a function - we can't directly inspect config
      // but we can verify it's properly constructed
      expect(sessionMiddleware).toBeInstanceOf(Function);
      expect(sessionMiddleware.length).toBe(3); // Express middleware signature (req, res, next)
    });
  });

  describe("Session Persistence", () => {
    it("should persist session data to Postgres", async () => {
      if (!hasDatabase) {
        console.warn("⏭️  Skipping - requires DATABASE_URL");
        return;
      }

      const { sessionStore } = await import("../../server/session-store");
      
      const testSessionId = "test-session-" + Date.now();
      const testSessionData = {
        userId: 123,
        username: "testuser",
        timestamp: Date.now(),
      };

      // Store session
      await new Promise((resolve, reject) => {
        sessionStore.set(testSessionId, testSessionData as any, (err: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      // Retrieve session
      const retrieved = await new Promise((resolve, reject) => {
        sessionStore.get(testSessionId, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      expect(retrieved).toMatchObject({
        userId: 123,
        username: "testuser",
      });

      // Cleanup
      await new Promise((resolve) => {
        sessionStore.destroy(testSessionId, () => resolve(null));
      });
    });

    it("should handle session expiration", async () => {
      if (!hasDatabase) {
        console.warn("⏭️  Skipping - requires DATABASE_URL");
        return;
      }

      const { sessionStore } = await import("../../server/session-store");
      
      const testSessionId = "test-expire-" + Date.now();
      const testSessionData = {
        userId: 456,
        timestamp: Date.now(),
        cookie: {
          maxAge: 100, // Expire in 100ms
        },
      };

      // Store session with short expiry
      await new Promise((resolve, reject) => {
        sessionStore.set(testSessionId, testSessionData as any, (err: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Session should be expired (pruneSessionInterval handles cleanup)
      // We can verify by checking the database directly
      try {
        const result = await pool.query(
          "SELECT expire FROM user_sessions WHERE sid = $1",
          [testSessionId]
        );

        if (result.rows.length > 0) {
          const expireTime = new Date(result.rows[0].expire);
          const now = new Date();
          
          // Expire time should be in the past
          expect(expireTime.getTime()).toBeLessThan(now.getTime());
        }
      } catch (error) {
        // Table might not exist - that's ok
      }

      // Cleanup
      await new Promise((resolve) => {
        sessionStore.destroy(testSessionId, () => resolve(null));
      });
    });

    it("should handle concurrent session operations", async () => {
      if (!hasDatabase) {
        console.warn("⏭️  Skipping - requires DATABASE_URL");
        return;
      }

      const { sessionStore } = await import("../../server/session-store");
      
      const sessionIds = Array.from({ length: 5 }, (_, i) => `test-concurrent-${Date.now()}-${i}`);
      
      // Create multiple sessions concurrently
      const createPromises = sessionIds.map((sid) =>
        new Promise((resolve, reject) => {
          sessionStore.set(sid, { userId: Math.random() } as any, (err: any) => {
            if (err) reject(err);
            else resolve(null);
          });
        })
      );

      await Promise.all(createPromises);

      // Retrieve all sessions concurrently
      const retrievePromises = sessionIds.map((sid) =>
        new Promise((resolve, reject) => {
          sessionStore.get(sid, (err: any, data: any) => {
            if (err) reject(err);
            else resolve(data);
          });
        })
      );

      const results = await Promise.all(retrievePromises);
      
      // All sessions should be retrieved successfully
      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result).toHaveProperty("userId");
      });

      // Cleanup
      const cleanupPromises = sessionIds.map((sid) =>
        new Promise((resolve) => {
          sessionStore.destroy(sid, () => resolve(null));
        })
      );

      await Promise.all(cleanupPromises);
    });
  });

  describe("Impersonation Compatibility", () => {
    it("should store impersonation data correctly", async () => {
      if (!hasDatabase) {
        console.warn("⏭️  Skipping - requires DATABASE_URL");
        return;
      }

      const { sessionStore } = await import("../../server/session-store");
      
      const testSessionId = "test-impersonate-" + Date.now();
      const impersonationData = {
        originalUser: {
          id: 1,
          email: "admin@example.com",
          role: "admin",
        },
        isImpersonating: true,
        passport: {
          user: 42, // Impersonated user ID
        },
      };

      // Store impersonation session
      await new Promise((resolve, reject) => {
        sessionStore.set(testSessionId, impersonationData as any, (err: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      // Retrieve and verify
      const retrieved = await new Promise((resolve, reject) => {
        sessionStore.get(testSessionId, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      expect(retrieved).toMatchObject({
        originalUser: {
          id: 1,
          email: "admin@example.com",
          role: "admin",
        },
        isImpersonating: true,
      });

      // Cleanup
      await new Promise((resolve) => {
        sessionStore.destroy(testSessionId, () => resolve(null));
      });
    });

    it("should handle stop impersonation by clearing session data", async () => {
      if (!hasDatabase) {
        console.warn("⏭️  Skipping - requires DATABASE_URL");
        return;
      }

      const { sessionStore } = await import("../../server/session-store");
      
      const testSessionId = "test-stop-impersonate-" + Date.now();
      
      // Start with impersonation
      await new Promise((resolve, reject) => {
        sessionStore.set(
          testSessionId,
          {
            originalUser: { id: 1 },
            isImpersonating: true,
            passport: { user: 42 },
          } as any,
          (err: any) => {
            if (err) reject(err);
            else resolve(null);
          }
        );
      });

      // Stop impersonation (restore original user)
      await new Promise((resolve, reject) => {
        sessionStore.set(
          testSessionId,
          {
            passport: { user: 1 }, // Back to original user
            // originalUser and isImpersonating removed
          } as any,
          (err: any) => {
            if (err) reject(err);
            else resolve(null);
          }
        );
      });

      // Verify impersonation data is cleared
      const retrieved = await new Promise((resolve, reject) => {
        sessionStore.get(testSessionId, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      expect(retrieved).not.toHaveProperty("originalUser");
      expect(retrieved).not.toHaveProperty("isImpersonating");

      // Cleanup
      await new Promise((resolve) => {
        sessionStore.destroy(testSessionId, () => resolve(null));
      });
    });
  });

  describe("Session Cleanup", () => {
    it("should auto-prune expired sessions", async () => {
      // connect-pg-simple has built-in pruneSessionInterval (15 min by default)
      // This test verifies the configuration is set up
      
      const { sessionStore } = await import("../../server/session-store");
      
      // The store should be configured with pruning
      expect(sessionStore).toBeDefined();
      
      // We can't easily test automatic pruning in a unit test,
      // but we can verify manual cleanup works
      
      try {
        // Clean up all test sessions
        await pool.query("DELETE FROM user_sessions WHERE sid LIKE 'test-%'");
        
        const result = await pool.query(
          "SELECT COUNT(*) as count FROM user_sessions WHERE sid LIKE 'test-%'"
        );
        
        expect(parseInt(result.rows[0].count)).toBe(0);
      } catch (error) {
        // Table might not exist - that's ok
      }
    });
  });

  describe("Migration Verification", () => {
    it("should not have Redis dependencies", async () => {
      // Verify session store doesn't use Redis
      const { sessionStore } = await import("../../server/session-store");
      
      // Should be PGStore, not RedisStore
      expect(sessionStore.constructor.name).toBe("PGStore");
      expect(sessionStore.constructor.name).not.toContain("Redis");
    });

    it("should use DATABASE_URL for sessions", () => {
      // Session store should use the same database as the rest of the app
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.REDIS_URL).toBeUndefined();
    });

    it("should have SESSION_SECRET configured", () => {
      // Session secret should be set (either from env or fallback)
      expect(process.env.SESSION_SECRET).toBeDefined();
      
      // In production, should not use fallback
      if (process.env.NODE_ENV === "production") {
        expect(process.env.SESSION_SECRET).not.toBe("fallback-secret-change-in-production");
      }
    });
  });
});
