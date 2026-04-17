// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - IN-MEMORY CACHE SERVICE
// ============================================================================
// Simple in-memory cache using JavaScript Map - NO REDIS REQUIRED
// Perfect for local Windows development without Redis installation
// ============================================================================

import { logger } from '../utils/logger';

// ============================================================================
// IN-MEMORY CACHE STORAGE
// ============================================================================

interface CacheItem {
  value: any;
  expiresAt: number | null; // Unix timestamp, null = no expiration
}

class InMemoryCache {
  private cache: Map<string, CacheItem> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  /**
   * Set a value in cache with optional expiration
   */
  set(key: string, value: any, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;

    // Clear existing timer if any
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(key);
    }

    // Set value in cache
    this.cache.set(key, { value, expiresAt });
    this.stats.sets++;

    // Set expiration timer if TTL provided
    if (ttlSeconds) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttlSeconds * 1000);

      this.timers.set(key, timer);
    }

    logger.debug(`Cache set: ${key} ${ttlSeconds ? `(TTL: ${ttlSeconds}s)` : '(no expiration)'}`);
  }

  /**
   * Get a value from cache
   */
  get(key: string): any | null {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    const existed = this.cache.has(key);
    this.cache.delete(key);
    if (existed) {
      this.stats.deletes++;
      logger.debug(`Cache deleted: ${key}`);
    }
    return existed;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Clear all cache
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get all keys matching a pattern
   */
  keys(pattern: string): string[] {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Check if cache is healthy
   */
  isHealthy(): boolean {
    return true; // In-memory cache is always healthy
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}

// ============================================================================
// CACHE SERVICE INSTANCE
// ============================================================================

const cacheInstance = new InMemoryCache();

// ============================================================================
// CACHE SERVICE API
// ============================================================================

export const cacheService = {
  /**
   * Set a value in cache with optional expiration
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      cacheInstance.set(key, value, ttlSeconds);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  },

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      return cacheInstance.get(key) as T | null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      return cacheInstance.delete(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      cacheInstance.clear();
    } catch (error) {
      logger.error('Cache clear error:', error);
      throw error;
    }
  },

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return cacheInstance.keys(pattern);
    } catch (error) {
      logger.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  },

  /**
   * Get cache size
   */
  async size(): Promise<number> {
    return cacheInstance.size;
  },

  /**
   * Check if cache is healthy
   */
  async isHealthy(): Promise<boolean> {
    return cacheInstance.isHealthy();
  },

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    size: number;
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: string;
  }> {
    return cacheInstance.getStats();
  },

  /**
   * Initialize cache service
   */
  async initialize(): Promise<void> {
    logger.info('✅ In-memory cache service initialized successfully');
    logger.info('✅ Cache: Healthy (In-Memory Mode)');
  },

  /**
   * Close cache service
   */
  async close(): Promise<void> {
    cacheInstance.clear();
    logger.info('In-memory cache service closed');
  },
};

// ============================================================================
// HELPER FUNCTIONS FOR COMMON CACHE OPERATIONS
// ============================================================================

/**
 * Cache API response with default TTL
 */
export async function cacheApiResponse<T>(
  key: string,
  dataFetcher: () => Promise<T>,
  ttlSeconds: number = 300 // Default 5 minutes
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheService.get<T>(key);
  if (cached !== null) {
    logger.debug(`Cache hit: ${key}`);
    return cached;
  }

  // Cache miss - fetch data
  logger.debug(`Cache miss: ${key} - fetching from source`);
  const data = await dataFetcher();

  // Store in cache
  await cacheService.set(key, data, ttlSeconds);

  return data;
}

/**
 * Cache with custom TTL
 */
export async function cacheWithTTL<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await cacheService.set(key, value, ttlSeconds);
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const keys = await cacheService.keys(pattern);
  for (const key of keys) {
    await cacheService.delete(key);
  }
  logger.info(`Invalidated ${keys.length} cache entries matching: ${pattern}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default cacheService;

// Also export individual functions for convenience
export {
  cacheApiResponse,
  cacheWithTTL,
  invalidateCachePattern,
};
