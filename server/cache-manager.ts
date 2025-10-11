/**
 * Enhanced Cache Manager with Namespacing and TTL
 * In-memory implementation (Redis removed)
 */

import { logger } from "./logger";

interface CacheOptions {
  ttl?: number;
  namespace?: string;
}

class CacheManager {
  private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    logger.info("[Cache] Cache manager initialized (in-memory)");
  }

  private getKey(key: string, namespace: string = "cache"): string {
    return `${namespace}:${key}`;
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    await this.initialize();

    try {
      const cacheKey = this.getKey(key, options.namespace);
      const entry = this.memoryCache.get(cacheKey);

      if (!entry) return null;

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        this.memoryCache.delete(cacheKey);
        return null;
      }

      return entry.value;
    } catch (error) {
      logger.error("[Cache] Error getting cache value:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    await this.initialize();

    try {
      const cacheKey = this.getKey(key, options.namespace);
      const ttl = options.ttl || 300; // Default 5 minutes
      const expiresAt = Date.now() + ttl * 1000;

      this.memoryCache.set(cacheKey, { value, expiresAt });
    } catch (error) {
      logger.error("[Cache] Error setting cache value:", error);
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<void> {
    await this.initialize();

    try {
      const cacheKey = this.getKey(key, options.namespace);
      this.memoryCache.delete(cacheKey);
    } catch (error) {
      logger.error("[Cache] Error deleting cache value:", error);
    }
  }

  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<void> {
    await this.initialize();

    try {
      const searchPattern = this.getKey(pattern, options.namespace);
      let deletedCount = 0;

      // Convert glob pattern to regex (simple implementation)
      const regexPattern = searchPattern.replace(/\*/g, ".*");
      const regex = new RegExp(`^${regexPattern}$`);

      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(
          `[Cache] Invalidated ${deletedCount} cache entries matching pattern: ${searchPattern}`
        );
      }
    } catch (error) {
      logger.error("[Cache] Error invalidating cache pattern:", error);
    }
  }

  // Cache-bust hooks for data mutations
  async bustHubSpotCache(): Promise<void> {
    await this.invalidatePattern("hubspot:*");
    await this.invalidatePattern("dashboard:*");
  }

  async bustUserCache(userId?: number): Promise<void> {
    if (userId) {
      await this.invalidatePattern(`user:${userId}:*`);
    }
    await this.invalidatePattern("users:*");
    await this.invalidatePattern("workspace:*");
  }

  async bustDashboardCache(): Promise<void> {
    await this.invalidatePattern("dashboard:*");
    await this.invalidatePattern("metrics:*");
  }
}

export const cacheManager = new CacheManager();

// TTL Constants
export const CacheTTL = {
  VERY_SHORT: 60, // 1 minute
  SHORT: 300, // 5 minutes
  MEDIUM: 900, // 15 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Cache Namespaces
export const CacheNamespace = {
  SESSIONS: "sess",
  API_CACHE: "cache",
  JOBS: "queue",
  METRICS: "metrics",
  USERS: "users",
  HUBSPOT: "hubspot",
  DASHBOARD: "dashboard",
  WORKSPACE: "workspace",
} as const;
