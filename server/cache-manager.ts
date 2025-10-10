/**
 * Enhanced Cache Manager with Namespacing and TTL
 * Implements cache-bust hooks on data writes
 */

import { getRedisAsync } from "./redis";
import { logger } from "./logger";

interface CacheOptions {
  ttl?: number;
  namespace?: string;
}

class CacheManager {
  private redis: any = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      this.redis = await getRedisAsync();
      this.initialized = true;
      logger.info("[Cache] Cache manager initialized with Redis");
    } catch (error) {
      logger.warn("[Cache] Redis not available, cache operations will be no-ops");
    }
  }

  private getKey(key: string, namespace: string = "cache"): string {
    return `${namespace}:${key}`;
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    await this.initialize();

    if (!this.redis) return null;

    try {
      const cacheKey = this.getKey(key, options.namespace);
      const value = await this.redis.get(cacheKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error("[Cache] Error getting cache value:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    await this.initialize();

    if (!this.redis) return;

    try {
      const cacheKey = this.getKey(key, options.namespace);
      const ttl = options.ttl || 300; // Default 5 minutes

      await this.redis.setex(cacheKey, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error("[Cache] Error setting cache value:", error);
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<void> {
    await this.initialize();

    if (!this.redis) return;

    try {
      const cacheKey = this.getKey(key, options.namespace);
      await this.redis.del(cacheKey);
    } catch (error) {
      logger.error("[Cache] Error deleting cache value:", error);
    }
  }

  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<void> {
    await this.initialize();

    if (!this.redis) return;

    try {
      const searchPattern = this.getKey(pattern, options.namespace);
      const keys = await this.redis.keys(searchPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(
          `[Cache] Invalidated ${keys.length} cache entries matching pattern: ${searchPattern}`
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
