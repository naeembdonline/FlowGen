// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - HEALTH CHECK SERVICE
// ============================================================================
// Provides comprehensive health status for all system components
// ============================================================================

import { logger } from '../utils/logger';
import { isSupabaseConfigured } from './database';
import { isRedisHealthy, getRedisStats } from './redis';

/**
 * Get comprehensive system health status
 */
export async function getSystemHealth() {
  const health = {
    status: 'ok' as 'ok' | 'degraded' | 'down',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    components: {
      backend: {
        status: 'healthy' as 'healthy' | 'unhealthy',
        message: 'Backend API is running',
      },
      database: {
        status: 'unhealthy' as 'healthy' | 'unhealthy' | 'unknown',
        message: 'Not configured',
        type: 'supabase',
      },
      cache: {
        status: 'healthy' as 'healthy' | 'unhealthy',
        message: 'In-Memory Cache',
        type: 'in-memory' as 'in-memory' | 'redis',
      },
      aiServices: {
        status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown',
        message: 'Not checked',
      },
    },
  };

  // Check database status
  if (isSupabaseConfigured) {
    health.components.database = {
      status: 'healthy',
      message: 'Supabase configured',
      type: 'supabase',
    };
  } else {
    health.components.database = {
      status: 'unhealthy',
      message: 'Supabase not configured - check .env file',
      type: 'supabase',
    };
    health.status = 'degraded';
  }

  // Check cache status (in-memory is always healthy)
  try {
    const cacheHealthy = await isRedisHealthy();
    if (cacheHealthy) {
      const cacheStats = await getRedisStats();
      health.components.cache = {
        status: 'healthy',
        message: cacheStats.type === 'in-memory'
          ? 'In-Memory Cache'
          : 'Redis Connected',
        type: cacheStats.type,
      };
    } else {
      health.components.cache = {
        status: 'unhealthy',
        message: 'Cache unavailable',
        type: 'unknown',
      };
      health.status = 'degraded';
    }
  } catch (error) {
    logger.warn('Cache health check failed:', error);
    health.components.cache = {
      status: 'unhealthy',
      message: 'Cache check failed',
      type: 'unknown',
    };
  }

  // Check AI services
  const zAiKey = process.env.Z_AI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (zAiKey && openAiKey) {
    health.components.aiServices = {
      status: 'healthy',
      message: 'AI services configured (Z.ai + OpenAI)',
    };
  } else if (zAiKey || openAiKey) {
    health.components.aiServices = {
      status: 'degraded',
      message: zAiKey ? 'Only Z.ai configured' : 'Only OpenAI configured',
    };
  } else {
    health.components.aiServices = {
      status: 'unhealthy',
      message: 'AI services not configured - add API keys to .env',
    };
    health.status = 'degraded';
  }

  return health;
}

/**
 * Simple health check endpoint response
 */
export async function getSimpleHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: isSupabaseConfigured ? 'configured' : 'not configured',
    cache: 'in-memory',
    aiServices: (process.env.Z_AI_API_KEY || process.env.OPENAI_API_KEY) ? 'configured' : 'not configured',
  };
}
