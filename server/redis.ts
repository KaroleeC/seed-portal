import Redis from "ioredis";
import { log } from "./vite";

console.log("[Redis] Module loading...");

// Redis configuration for different use cases
export interface RedisConfig {
  sessionRedis: any;
  cacheRedis: any;
  queueRedis: any;
}

// Create Redis connections with appropriate configurations
async function createRedisConnections(): Promise<RedisConfig | null> {
  console.log("[createRedisConnections] Starting...");
  const redisUrl = process.env.REDIS_URL;
  console.log("[createRedisConnections] REDIS_URL:", redisUrl ? "Found" : "Missing");

  // If no Redis URL provided, return null
  if (!redisUrl) {
    console.log("Redis URL not provided, skipping Redis connections");
    return null;
  }

  try {
    console.log("[createRedisConnections] Creating Redis clients...");

    // Determine key prefix
    const derivedPrefix =
      process.env.REDIS_KEY_PREFIX ?? (process.env.NODE_ENV === "development" ? "oseed:dev:" : "");

    // Create ioredis instances with more aggressive connection settings for production
    const baseOptions = {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 30000, // Increased from 10s to 30s
      commandTimeout: 20000, // Added command timeout
      lazyConnect: false, // Connect immediately instead of lazy
      keepAlive: 30000,
      family: 4, // Force IPv4
      retryStrategy: (times: number) => {
        console.log(`[Redis] Retry attempt ${times}`);
        if (times > 8) {
          // Increased retries
          console.log("[Redis] Max retries reached, giving up");
          return null;
        }
        const delay = Math.min(times * 200, 3000); // Increased delay
        console.log(`[Redis] Retrying in ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        console.log("[Redis] Reconnect on error:", err.message);
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    };

    // BullMQ-specific options (no maxRetriesPerRequest)
    const queueOptions = {
      enableReadyCheck: true,
      maxRetriesPerRequest: null, // Required for BullMQ
      connectTimeout: 30000, // Match session Redis timeout
      commandTimeout: 20000, // Add command timeout
      lazyConnect: false, // Connect immediately like others
      keepAlive: 30000,
      family: 4, // Force IPv4
      retryStrategy: baseOptions.retryStrategy,
      reconnectOnError: baseOptions.reconnectOnError,
    };

    // Session Redis - optional key prefix for clarity
    const sessionRedis = new Redis(redisUrl, {
      ...baseOptions,
      keyPrefix: derivedPrefix,
    });

    // Cache Redis - using key prefix for isolation
    const cacheRedis = new Redis(redisUrl, {
      ...baseOptions,
      keyPrefix: `${derivedPrefix}cache:`,
    });

    // Queue Redis - NO keyPrefix for BullMQ compatibility
    const queueRedis = new Redis(redisUrl, {
      ...queueOptions,
      keyPrefix: "", // BullMQ doesn't support keyPrefix in ioredis instances
    });

    console.log("[createRedisConnections] Waiting for Redis connections to be ready...");

    // Wait for all connections to be ready
    await Promise.all([
      new Promise((resolve, reject) => {
        sessionRedis.once("ready", resolve);
        sessionRedis.once("error", reject);
      }),
      new Promise((resolve, reject) => {
        cacheRedis.once("ready", resolve);
        cacheRedis.once("error", reject);
      }),
      new Promise((resolve, reject) => {
        queueRedis.once("ready", resolve);
        queueRedis.once("error", reject);
      }),
    ]);

    console.log("[createRedisConnections] All Redis connections ready");

    // Attach convenience promise helpers with relaxed typing
    (cacheRedis as any).getAsync = cacheRedis.get.bind(cacheRedis);
    (cacheRedis as any).setAsync = cacheRedis.set.bind(cacheRedis);
    (cacheRedis as any).delAsync = cacheRedis.del.bind(cacheRedis);
    (cacheRedis as any).existsAsync = cacheRedis.exists.bind(cacheRedis);

    // Monitor Redis memory usage
    const checkMemoryUsage = async () => {
      try {
        // ioredis info method returns a promise directly
        const info = await sessionRedis.info("memory");
        const usedMemoryMatch = info.match(/used_memory_human:(.+)/);
        const maxMemoryMatch = info.match(/maxmemory_human:(.+)/);

        const usedGroup = usedMemoryMatch?.[1];
        const maxGroup = maxMemoryMatch?.[1];

        if (usedGroup && maxGroup) {
          const used = parseMemoryString(usedGroup);
          const max = parseMemoryString(maxGroup);

          if (max > 0) {
            const usagePercent = (used / max) * 100;
            if (usagePercent > 60) {
              console.warn(
                `⚠️ Redis memory usage at ${usagePercent.toFixed(1)}% - consider increasing memory or evicting keys`
              );
            }
          }
        }
      } catch (error) {
        console.error("Failed to check Redis memory:", error);
      }
    };

    // Check memory usage every 5 minutes
    setInterval(checkMemoryUsage, 5 * 60 * 1000);

    // Set up event handlers
    sessionRedis.on("error", (err) => {
      console.error("Session Redis error:", err);
    });

    cacheRedis.on("error", (err) => {
      console.error("Cache Redis error:", err);
    });

    queueRedis.on("error", (err) => {
      console.error("Queue Redis error:", err);
    });

    sessionRedis.on("connect", () => {
      log("Session Redis connected");
    });

    cacheRedis.on("connect", () => {
      log("Cache Redis connected");
    });

    queueRedis.on("connect", () => {
      log("Queue Redis connected");
    });

    console.log("[createRedisConnections] All Redis clients created");
    return { sessionRedis, cacheRedis, queueRedis };
  } catch (error: any) {
    console.error("[createRedisConnections] Failed to create Redis connections:", error);
    console.error("[createRedisConnections] Error details:", error.message, error.stack);
    return null;
  }
}

// Helper function to parse memory strings
function parseMemoryString(str: string): number {
  const trimmed = str.trim();
  const match = trimmed.match(/^([\d.]+)([KMGT]?)$/);
  if (!match) return 0;

  const numGroup = match[1] ?? "0";
  const unitGroup = match[2] ?? "";
  const value = parseFloat(numGroup);
  const unit = unitGroup;

  switch (unit) {
    case "K":
      return value * 1024;
    case "M":
      return value * 1024 * 1024;
    case "G":
      return value * 1024 * 1024 * 1024;
    case "T":
      return value * 1024 * 1024 * 1024 * 1024;
    default:
      return value;
  }
}

// Initialize Redis connections
let redisConnections: RedisConfig | null = null;
let initPromise: Promise<void> | null = null;

// Initialize Redis on first access
async function initializeRedis() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log("[Redis] About to create connections...");
    redisConnections = await createRedisConnections();
    console.log("[Redis] Connections created:", redisConnections ? "Success" : "Failed");
  })();

  return initPromise;
}

// Don't initialize immediately - wait for explicit call

// Export getter for Redis connections
export function getRedis(): RedisConfig | null {
  return redisConnections;
}

// Export getter for Redis connections (alias)
export function getRedisConnections(): RedisConfig | null {
  return redisConnections;
}

// Export async getter that waits for initialization
export async function getRedisAsync(): Promise<RedisConfig | null> {
  await initializeRedis();
  return redisConnections;
}

// Export function to manually initialize Redis
export async function initRedis(): Promise<RedisConfig | null> {
  await initializeRedis();
  return redisConnections;
}

// Also export as 'redis' for compatibility (will be null until initialized)
export const redis = redisConnections;

// Graceful shutdown
process.on("SIGINT", () => {
  if (redisConnections) {
    console.log("Closing Redis connections...");
    redisConnections.sessionRedis.quit();
    redisConnections.cacheRedis.quit();
    redisConnections.queueRedis.quit();
  }
});
