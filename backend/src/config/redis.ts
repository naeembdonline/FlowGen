// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - REDIS CONFIGURATION
// ============================================================================
// This file configures Redis, which is used for:
// 1. Job queues (Bull) for async message processing
// 2. Caching API responses
// 3. Session storage (optional)
// ============================================================================

import Redis from 'ioredis';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD;

// Parse Redis URL
// Format: redis://[password@]host:port
const parsedUrl = new URL(redisUrl);
const redisHost = parsedUrl.hostname;
const redisPort = parseInt(parsedUrl.port, 10);
const redisDb = parseInt(parsedUrl.pathname.slice(1) || '0', 10);

// ============================================================================
// REDIS CLIENT
// ============================================================================

// Create Redis client with connection configuration
export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  db: redisDb,
  password: redisPassword || undefined,
  retryStrategy: (times) => {
    // Retry connection with exponential backoff
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  // Connection timeout
  connectTimeout: 10000,
  // Command timeout
  lazyConnect: false,
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Log successful connection
redisClient.on('connect', () => {
  logger.debug('Redis connecting...');
});

// Log when connection is ready
redisClient.on('ready', () => {
  logger.debug('Redis connection ready');
});

// Log connection errors
redisClient.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

// Log reconnection attempts
redisClient.on('reconnecting', (delay) => {
  logger.warn(`Redis reconnecting in ${delay}ms`);
});

// Log when connection is closed
redisClient.on('close', () => {
  logger.debug('Redis connection closed');
});

// ============================================================================
// REDIS INITIALIZATION
// ============================================================================

/**
 * Initialize Redis connection and verify connectivity
 * This function tests the connection and logs the result
 */
export async function initializeRedis(): Promise<void> {
  try {
    // Test connection with PING command
    const response = await redisClient.ping();
    if (response === 'PONG') {
      logger.debug('Redis connection verified successfully');
    } else {
      throw new Error(`Unexpected PING response: ${response}`);
    }
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Set a value in Redis with expiration
 * @param key - The cache key
 * @param value - The value to store (will be JSON stringified)
 * @param ttlSeconds - Time to live in seconds
 */
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

/**
 * Get a value from Redis cache
 * @param key - The cache key
 * @returns The cached value or null if not found
 */
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

/**
 * Delete a value from Redis cache
 * @param key - The cache key to delete
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await redisClient.del(key);
    logger.debug(`Deleted cached key: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete cached key ${key}:`, error);
    throw error;
  }
}

/**
 * Clear all cache keys matching a pattern
 * Use with caution - can affect many keys
 * @param pattern - The key pattern to match (e.g., "user:*")
 */
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

// ============================================================================
// REDIS HEALTH CHECK
// ============================================================================

/**
 * Check if Redis connection is healthy
 * @returns True if Redis is accessible
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const response = await redisClient.ping();
    return response === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Get Redis connection statistics
 * @returns Object with connection info and stats
 */
export async function getRedisStats(): Promise<{
  connected: boolean;
  memoryUsage: string;
  keyCount: number;
  info: any;
}> {
  try {
    const connected = await isRedisHealthy();
    const info = await redisClient.info('memory');
    const keyCount = await redisClient.dbsize();

    return {
      connected,
      memoryUsage: info.split('\n').find((line) =>
        line.startsWith('used_memory_human:')
      )?.split(':')[1] || 'unknown',
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

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Close Redis connection gracefully
 * Call this when shutting down the application
 */
export async function closeRedis(): Promise<void> {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    // Force close if graceful shutdown fails
    redisClient.disconnect();
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
