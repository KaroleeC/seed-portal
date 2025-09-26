// Automatic Redis session application at startup
import { Express } from "express";
import Redis from "ioredis";
import RedisStore from "connect-redis";
import session from "express-session";

export async function applyRedisSessionsAtStartup(app: Express): Promise<void> {
  console.log(
    "[RedisStartup] ============= APPLYING REDIS SESSIONS AT STARTUP =============",
  );

  if (!process.env.REDIS_URL) {
    console.log("[RedisStartup] No REDIS_URL, skipping Redis session setup");
    return;
  }

  try {
    console.log("[RedisStartup] Creating Redis connection...");
    const redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      keepAlive: 30000,
      family: 4,
    });
    await redisClient.ping();
    console.log("[RedisStartup] ✅ Redis ping successful");

    // Create RedisStore
    const derivedPrefix =
      process.env.REDIS_KEY_PREFIX ??
      (process.env.NODE_ENV === "development" ? "oseed:dev:" : "");
    const redisStore = new RedisStore({
      client: redisClient,
      prefix: `${derivedPrefix}sess:`,
      ttl: 24 * 60 * 60, // 24 hours
    });

    console.log(
      "[RedisStartup] ✅ RedisStore created:",
      redisStore.constructor.name,
    );

    // Apply session middleware with Redis store
    app.use(
      session({
        secret: process.env.SESSION_SECRET || "dev-only-seed-financial-secret",
        resave: false,
        saveUninitialized: false,
        rolling: true, // Extend session on each request
        store: redisStore,
        cookie: {
          secure:
            process.env.NODE_ENV === "production" ||
            process.env.REPLIT_DEPLOYMENT === "1",
          httpOnly: true,
          sameSite:
            process.env.NODE_ENV === "production" ||
            process.env.REPLIT_DEPLOYMENT === "1"
              ? "lax"
              : "lax", // Use 'lax' for better compatibility
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
      }),
    );

    console.log(
      "[RedisStartup] ✅ Redis session middleware applied successfully",
    );
  } catch (error) {
    console.error("[RedisStartup] ❌ Redis session setup failed:", error);
    console.log("[RedisStartup] Continuing without Redis sessions");
  }
}
