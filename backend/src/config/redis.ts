// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - CACHE CONFIGURATION (IN-MEMORY MODE)
// ============================================================================
// This configuration uses in-memory cache instead of Redis
// Perfect for local Windows development without Redis installation
// ============================================================================

import { logger } from '../utils/logger';
import cacheService from '../services/cache.service';

// ============================================================================
// CACHE CLIENT INTERFACE (matches Redis API for compatibility)
// ============================================================================

export const redisClient = {
  // Basic operations (compatible with Redis API)
  set: async (key: string, value: string): Promise<'OK'> => {
    await cacheService.set(key, value);
    return 'OK';
  },

  setex: async (key: string, seconds: number, value: string): Promise<'OK'> => {
    await cacheService.set(key, value, seconds);
    return 'OK';
  },

  get: async (key: string): Promise<string | null> => {
    return await cacheService.get<string>(key);
  },

  del: async (...keys: string[]): Promise<number> => {
    let count = 0;
    for (const key of keys) {
      const deleted = await cacheService.delete(key);
      if (deleted) count++;
    }
    return count;
  },

  keys: async (pattern: string): Promise<string[]> => {
    return await cacheService.keys(pattern);
  },

  dbsize: async (): Promise<number> => {
    return await cacheService.size();
  },

  ping: async (): Promise<'PONG'> => {
    return 'PONG';
  },

  flushdb: async (): Promise<'OK'> => {
    await cacheService.clear();
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
connected_clients:1
used_memory_human:1MB`;
  },

  // Event handlers (mock - for compatibility)
  on: (event: string, handler: Function) => {
    // Mock event handlers
    logger.debug(`Cache event handler registered: ${event}`);
  },

  // Connection methods (mock)
  connect: async () => {
    logger.debug('Cache: connect called');
  },

  disconnect: async () => {
    logger.debug('Cache: disconnect called');
  },

  quit: async () => {
    await cacheService.close();
    return 'OK';
  }
};

// ============================================================================
// CACHE INITIALIZATION (Always uses in-memory)
// ============================================================================

export async function initializeRedis(): Promise<void> {
  try {
    // Check if in-memory mode is forced
    const forceInMemory = process.env.USE_IN_MEMORY_CACHE === 'true' ||
                          process.env.SKIP_REDIS === 'true';

    if (forceInMemory) {
      logger.info('✅ USE_IN_MEMORY_CACHE=true - Forcing in-memory cache mode');
    } else {
      logger.info('✅ Using in-memory cache (perfect for Windows development)');
    }

    await cacheService.initialize();
    logger.info('✅ Cache service ready (In-Memory Mode)');
  } catch (error) {
    logger.error('Failed to initialize cache service:', error);
    // Don't throw - allow server to continue
    logger.warn('⚠️  Continuing without cache - some features may be limited');
  }
}

// ============================================================================
// CACHE HELPER FUNCTIONS (same interface as before)
// ============================================================================

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await cacheService.set(key, serialized, ttlSeconds);
    logger.debug(`Cached key: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    logger.error(`Failed to cache key ${key}:`, error);
    throw error;
  }
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const data = await cacheService.get<string>(key);
    if (!data) return null;

    return JSON.parse(data) as T;
  } catch (error) {
    logger.error(`Failed to get cached key ${key}:`, error);
    return null;
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await cacheService.delete(key);
    logger.debug(`Deleted cached key: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete cached key ${key}:`, error);
    throw error;
  }
}

export async function cacheClearPattern(pattern: string): Promise<void> {
  try {
    const keys = await cacheService.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) {
        await cacheService.delete(key);
      }
      logger.debug(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Failed to clear cache pattern ${pattern}:`, error);
    throw error;
  }
}

// ============================================================================
// CACHE HEALTH CHECK
// ============================================================================

export async function isRedisHealthy(): Promise<boolean> {
  try {
    return await cacheService.isHealthy();
  } catch {
    return false;
  }
}

export async function getRedisStats(): Promise<{
  connected: boolean;
  memoryUsage: string;
  keyCount: number;
  info: string | null;
  type: 'in-memory';
  stats: any;
}> {
  try {
    const connected = await cacheService.isHealthy();
    const stats = await cacheService.getStats();
    const keyCount = await cacheService.size();
    const info = await redisClient.info('memory');

    return {
      connected,
      memoryUsage: '1MB (in-memory)',
      keyCount,
      info,
      type: 'in-memory',
      stats,
    };
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    return {
      connected: false,
      memoryUsage: 'unknown',
      keyCount: 0,
      info: null,
      type: 'in-memory',
      stats: null,
    };
  }
}

// ============================================================================
// CACHE GRACEFUL SHUTDOWN
// ============================================================================

export async function closeRedis(): Promise<void> {
  try {
    await cacheService.close();
    logger.info('Cache service closed gracefully');
  } catch (error) {
    logger.error('Error closing cache service:', error);
  }
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
