// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - HEALTH CHECK ROUTES
// ============================================================================
// These routes provide health check endpoints for monitoring.
// Used by load balancers, monitoring services, and CI/CD pipelines.
// ============================================================================

import { Router } from 'express';
import { getSystemHealth, getSimpleHealth } from '../config/health';
import { isDatabaseHealthy } from '../config/database';
import { isRedisHealthy, getRedisStats } from '../config/redis';

const router = Router();

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 */
router.get('/', async (req, res) => {
  const health = await getSimpleHealth();
  res.status(200).json(health);
});

/**
 * GET /health/detailed
 * Detailed health check - includes database and Redis status
 */
router.get('/detailed', async (req, res) => {
  try {
    const [dbHealthy, redisHealthy, redisStats] = await Promise.all([
      isDatabaseHealthy(),
      isRedisHealthy(),
      getRedisStats(),
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
          memoryUsage: redisStats.memoryUsage,
          keyCount: redisStats.keyCount,
        },
      },
    };

    // Return 200 if all services are healthy, 503 otherwise
    const statusCode = dbHealthy && redisHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe - checks if server is ready to accept traffic
 * Returns 200 if all critical dependencies are available
 */
router.get('/ready', async (req, res) => {
  try {
    const dbHealthy = await isDatabaseHealthy();

    if (dbHealthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

/**
 * GET /health/live
 * Liveness probe - checks if server is still running
 * Returns 200 if server process is alive
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// EXPORT
// ============================================================================

export default router;
