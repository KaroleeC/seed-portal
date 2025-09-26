import session from "express-session";
import Redis from "ioredis";
import RedisStore from "connect-redis";
import MemoryStore from "memorystore";
import { Express } from "express";

// Direct session setup that bypasses the auth.ts complexity
export async function setupDirectSessions(app: Express): Promise<void> {
  console.log("[DirectSession] Setting up Redis sessions directly...");

  let sessionStore: any;
  let storeType: string;

  if (process.env.REDIS_URL) {
    try {
      console.log("[DirectSession] Creating Redis connection...");
      const redisClient = new Redis(process.env.REDIS_URL);
      await redisClient.ping();
      console.log("[DirectSession] ✅ Redis ping successful");

      const derivedPrefix =
        process.env.REDIS_KEY_PREFIX ??
        (process.env.NODE_ENV === "development" ? "oseed:dev:" : "");
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: `${derivedPrefix}sess:`,
        ttl: 24 * 60 * 60, // 24 hours
      });
      storeType = "RedisStore";
      console.log(
        "[DirectSession] ✅ Redis session store created:",
        sessionStore.constructor.name,
      );
    } catch (error: any) {
      console.warn(
        "[DirectSession] ❌ Redis failed, using MemoryStore:",
        (error as any)?.message,
      );
      const MemoryStoreClass = MemoryStore(session);
      sessionStore = new MemoryStoreClass({ checkPeriod: 86400000 });
      storeType = "MemoryStore";
    }
  } else {
    console.log("[DirectSession] No REDIS_URL, using MemoryStore");
    const MemoryStoreClass = MemoryStore(session);
    sessionStore = new MemoryStoreClass({ checkPeriod: 86400000 });
    storeType = "MemoryStore";
  }

  console.log("[DirectSession] Final store type:", storeType);

  // Apply session middleware directly
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-only-seed-financial-secret",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  console.log("[DirectSession] Session middleware applied successfully");
}
