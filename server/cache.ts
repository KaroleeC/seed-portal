import { createHash } from "crypto";
import { logger } from "./logger";

const cacheLogger = logger.child({ module: "cache" });

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
  skipCache?: boolean; // Skip cache for this request
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
  totalOperations: number;
  lastReset: string;
}

export class CacheService {
  private memoryCache: Map<string, { value: unknown; expiresAt: number }> = new Map();

  /**
   * List keys matching a pattern (advanced use only)
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const regexPattern = pattern.replace(/\*/g, ".*");
      const regex = new RegExp(`^${regexPattern}$`);
      const matchingKeys: string[] = [];
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) matchingKeys.push(key);
      }
      return matchingKeys;
    } catch (error) {
      cacheLogger.error({ error, pattern }, "Cache keys error");
      return [];
    }
  }
  private defaultTTL = 300; // 5 minutes default

  // Cache metrics tracking
  private stats = {
    hits: 0,
    misses: 0,
    totalOperations: 0,
    lastReset: new Date().toISOString(),
  };

  /**
   * Generate a cache key from function name and arguments
   */
  generateKey(prefix: string, identifier: string | object): string {
    const hash = createHash("md5")
      .update(typeof identifier === "string" ? identifier : JSON.stringify(identifier))
      .digest("hex");
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.memoryCache.get(key);
      if (entry && Date.now() < entry.expiresAt) {
        this.stats.hits++;
        this.stats.totalOperations++;
        cacheLogger.debug({ key }, "Cache hit");
        return entry.value as T;
      }
      if (entry) this.memoryCache.delete(key);
      this.stats.misses++;
      this.stats.totalOperations++;
      cacheLogger.debug({ key }, "Cache miss");
      return null;
    } catch (error) {
      this.stats.misses++;
      this.stats.totalOperations++;
      cacheLogger.error({ error, key }, "Cache get error");
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const expiryTime = ttl || this.defaultTTL;
      const expiresAt = Date.now() + expiryTime * 1000;
      this.memoryCache.set(key, { value, expiresAt });
      cacheLogger.debug({ key, ttl: expiryTime }, "Cache set");
    } catch (error) {
      cacheLogger.error({ error, key }, "Cache set error");
    }
  }

  /**
   * Delete value from cache
   */
  async del(pattern: string): Promise<void> {
    try {
      const regexPattern = `cache:${pattern}*`.replace(/\*/g, ".*");
      const regex = new RegExp(`^${regexPattern}$`);
      let deletedCount = 0;
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }
      if (deletedCount > 0) {
        cacheLogger.debug({ pattern, count: deletedCount }, "Cache invalidated");
      }
    } catch (error) {
      cacheLogger.error({ error, pattern }, "Cache delete error");
    }
  }

  /**
   * Wrap a function with caching
   */
  async wrap<T>(key: string, fn: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    if (options.skipCache) {
      return await fn();
    }

    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, options.ttl);

    return result;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const totalKeys = this.memoryCache.size;
    const memoryUsage = `~${Math.round(totalKeys * 0.001)}KB`;

    const hitRate =
      this.stats.totalOperations > 0 ? (this.stats.hits / this.stats.totalOperations) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalKeys,
      memoryUsage,
      totalOperations: this.stats.totalOperations,
      lastReset: this.stats.lastReset,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalOperations: 0,
      lastReset: new Date().toISOString(),
    };
    cacheLogger.info("Cache statistics reset");
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    try {
      const count = this.memoryCache.size;
      this.memoryCache.clear();
      if (count > 0) {
        cacheLogger.info({ count }, "Cache cleared");
      }
    } catch (error) {
      cacheLogger.error({ error }, "Failed to clear cache");
    }
  }
}

// Export singleton instance
export const cache = new CacheService();

// Cache TTL configurations for different services
export const CacheTTL = {
  // HubSpot cache times
  HUBSPOT_DEALS: 300, // 5 minutes
  HUBSPOT_METRICS: 300, // 5 minutes
  HUBSPOT_CONTACT: 900, // 15 minutes
  HUBSPOT_COMPANY: 900, // 15 minutes

  // OpenAI cache times
  OPENAI_ANALYSIS: 3600, // 1 hour
  OPENAI_ENRICHMENT: 3600, // 1 hour

  // General cache times
  USER_PROFILE: 600, // 10 minutes
  WEATHER_DATA: 1800, // 30 minutes
  GEOCODING: 86400, // 24 hours

  // Generic TTLs for convenience
  TEN_MINUTES: 600,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
};

// Cache key prefixes
export const CachePrefix = {
  HUBSPOT_DEAL: "hs:deal",
  HUBSPOT_DEALS_LIST: "hs:deals",
  HUBSPOT_METRICS: "hs:metrics",
  HUBSPOT_CONTACT: "hs:contact",
  HUBSPOT_COMPANY: "hs:company",
  OPENAI_ANALYSIS: "ai:analysis",
  OPENAI_ENRICHMENT: "ai:enrich",
  USER_PROFILE: "user:profile",
  WEATHER: "weather",
  GEOCODING: "geo",
  // AI/Box helpers
  AI_BOX_CHECK: "ai:boxcheck",
  AI_BOX_LIST: "ai:boxlist",
  AI_BOX_TEXT: "ai:boxtext",
  AI_BOX_FILE_INFO: "ai:boxfileinfo",
};
