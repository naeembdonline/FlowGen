// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - CONNECTION TEST UTILITY
// ============================================================================
// Simple utility functions to test backend and service connections
// ============================================================================

/**
 * Test backend connectivity
 */
export async function testBackendConnection() {
  try {
    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Test backend detailed health (includes database and Redis)
 */
export async function testBackendServices() {
  try {
    const response = await fetch('http://localhost:3001/api/v1/health/detailed', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Test Redis connection via backend
 */
export async function testRedisConnection() {
  try {
    const response = await fetch('http://localhost:3001/api/v1/health/detailed', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Cannot check Redis - backend unavailable',
      };
    }

    const data = await response.json();
    const redisStatus = data.services?.redis?.status;

    return {
      success: redisStatus === 'healthy',
      data: {
        status: redisStatus,
        memoryUsage: data.services?.redis?.memoryUsage,
        keyCount: data.services?.redis?.keyCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Run all connection tests
 */
export async function runAllConnectionTests() {
  const results = {
    backend: await testBackendConnection(),
    services: await testBackendServices(),
    redis: await testRedisConnection(),
  };

  const allHealthy =
    results.backend.success &&
    results.services.success &&
    results.redis.success;

  return {
    allHealthy,
    results,
  };
}
