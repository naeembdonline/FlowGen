// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - IN-MEMORY REDIS FALLBACK
// ============================================================================
// This provides an in-memory cache that mimics Redis functionality
// Use this for local development when Redis is not installed
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

  /**
   * Set a value in cache with optional expiration
   */
  set(key: string, value: any, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;

    // Clear existing timer if any
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set value in cache
    this.cache.set(key, { value, expiresAt });

    // Set expiration timer if TTL provided
    if (ttlSeconds) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttlSeconds * 1000);

      this.timers.set(key, timer);
    }

    logger.debug(`In-memory cache set: ${key} ${ttlSeconds ? `(TTL: ${ttlSeconds}s)` : '(no expiration)'}`);
  }

  /**
   * Get a value from cache
   */
  get(key: string): any | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    this.cache.delete(key);
    logger.debug(`In-memory cache deleted: ${key}`);
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
    logger.debug('In-memory cache cleared');
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
}

// ============================================================================
// IN-MEMORY REDIS CLIENT
// ============================================================================

const inMemoryCache = new InMemoryCache();

// Mock Redis client interface
export const redisClient = {
  // Basic operations
  set: async (key: string, value: string): Promise<'OK'> => {
    inMemoryCache.set(key, value);
    return 'OK';
  },

  setex: async (key: string, seconds: number, value: string): Promise<'OK'> => {
    inMemoryCache.set(key, value, seconds);
    return 'OK';
  },

  get: async (key: string): Promise<string | null> => {
    return inMemoryCache.get(key);
  },

  del: async (...keys: string[]): Promise<number> => {
    let count = 0;
    for (const key of keys) {
      if (inMemoryCache.get(key) !== null) {
        inMemoryCache.delete(key);
        count++;
      }
    }
    return count;
  },

  keys: async (pattern: string): Promise<string[]> => {
    return inMemoryCache.keys(pattern);
  },

  dbsize: async (): Promise<number> => {
    return inMemoryCache.size;
  },

  ping: async (): Promise<'PONG'> => {
    return 'PONG';
  },

  flushdb: async (): Promise<'OK'> => {
    inMemoryCache.clear();
    return 'OK';
  },

  // Event handlers (mock)
  on: (event: string, handler: Function) => {
    // Mock event handlers - do nothing
    logger.debug(`Redis event handler registered: ${event}`);
  },

  // Connection methods (mock)
  connect: async () => {
    logger.debug('In-memory Redis: connect called');
  },

  disconnect: async () => {
    logger.debug('In-memory Redis: disconnect called');
  },

  quit: async () => {
    logger.debug('In-memory Redis: quit called');
    inMemoryCache.clear();
    return 'OK';
  },

  // Info command (mock)
  info: async (section?: string): Promise<string> => {
    if (section === 'memory') {
      return `# Memory
used_memory_human:1MB
used_memory:1000000`;
    }
    return `# Server
redis_version:7.0.0 (in-memory)
uptime_in_days:1
connected_clients:1`;
  }
};

// ============================================================================
// CACHE HELPER FUNCTIONS (same interface as real Redis)
// ============================================================================

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await redisClient.setex(key, ttlSeconds, serialized);
    logger.debug(`Cached key: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    logger.error(`Failed to cache key ${key}:`, error);
    throw error;
  }
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const data = await redisClient.get(key);
    if (!data) return null;

    return JSON.parse(data) as T;
  } catch (error) {
    logger.error(`Failed to get cached key ${key}:`, error);
    return null;
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redisClient.del(key);
    logger.debug(`Deleted cached key: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete cached key ${key}:`, error);
    throw error;
  }
}

export async function cacheClearPattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.debug(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Failed to clear cache pattern ${pattern}:`, error);
    throw error;
  }
}

export async function isRedisHealthy(): Promise<boolean> {
  try {
    const response = await redisClient.ping();
    return response === 'PONG';
  } catch {
    return false;
  }
}

export async function getRedisStats(): Promise<{
  connected: boolean;
  memoryUsage: string;
  keyCount: number;
  info: any;
}> {
  try {
    const connected = await isRedisHealthy();
    const keyCount = await redisClient.dbsize();
    const info = await redisClient.info('memory');

    return {
      connected,
      memoryUsage: '1MB (in-memory)',
      keyCount,
      info,
    };
  } catch (error) {
    logger.error('Failed to get Redis stats:', error);
    return {
      connected: false,
      memoryUsage: 'unknown',
      keyCount: 0,
      info: null,
    };
  }
}

export async function initializeRedis(): Promise<void> {
  logger.info('✅ Using in-memory cache (Redis not required for development)');
  logger.info('✓ In-memory cache initialized successfully');
  logger.info('Note: Install Redis for production job queues and persistent caching');
}

export async function closeRedis(): Promise<void> {
  await redisClient.quit();
  logger.info('In-memory cache closed');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  redisClient,
  initializeRedis,
  cacheSet,
  cacheGet,
  cacheDelete,
  cacheClearPattern,
  isRedisHealthy,
  getRedisStats,
  closeRedis,
};
