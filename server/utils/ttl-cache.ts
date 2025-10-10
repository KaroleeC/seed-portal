/**
 * TTL Cache Utility
 *
 * Simple in-memory cache with time-to-live (TTL) expiration.
 * Used for caching HubSpot API responses to reduce duplicate lookups.
 *
 * Features:
 * - Automatic expiration after TTL
 * - Size limit with LRU eviction
 * - Cache statistics (hits, misses, evictions)
 * - Periodic cleanup of expired entries
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly ttlMs: number = 5 * 60 * 1000, // 5 minutes default
    private readonly maxSize: number = 500,
    private readonly cleanupIntervalMs: number = 60 * 1000 // 1 minute
  ) {
    this.startCleanup();
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(key: string, value: T): void {
    // Enforce size limit (LRU: delete oldest)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Get hit rate percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    // Allow process to exit even if timer is active
    this.cleanupTimer.unref();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Note: We don't count cleanup as evictions since they're expired
  }

  /**
   * Stop cleanup timer (for testing or shutdown)
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Create a cached version of an async function
 *
 * @example
 * ```typescript
 * const cache = new TTLCache<string>(5 * 60 * 1000);
 * const cachedFn = createCachedFunction(
 *   cache,
 *   async (email: string) => fetchOwnerFromAPI(email),
 *   (email) => `owner:${email}`
 * );
 *
 * const owner1 = await cachedFn('user@example.com'); // API call
 * const owner2 = await cachedFn('user@example.com'); // Cache hit!
 * ```
 */
export function createCachedFunction<TArgs extends any[], TResult>(
  cache: TTLCache<TResult>,
  fn: (...args: TArgs) => Promise<TResult>,
  keyFn: (...args: TArgs) => string
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyFn(...args);

    // Check cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Call function and cache result
    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
}
