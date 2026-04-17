// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - SYSTEM HEALTH TEST PAGE
// ============================================================================
// This component tests the connectivity between frontend, backend, and Redis.
// It provides comprehensive health checks and connection diagnostics.
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, AlertCircle, Network, Database, Server } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface HealthCheckResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
  responseTime?: number;
}

interface SystemHealthState {
  frontend: HealthCheckResult;
  backend: HealthCheckResult;
  backendDetailed: HealthCheckResult;
  redis: HealthCheckResult;
  overall: 'pending' | 'healthy' | 'unhealthy';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SystemHealthPage() {
  const [healthState, setHealthState] = useState<SystemHealthState>({
    frontend: {
      name: 'Frontend',
      status: 'pending',
      message: 'Checking frontend health...',
    },
    backend: {
      name: 'Backend API',
      status: 'pending',
      message: 'Connecting to backend...',
    },
    backendDetailed: {
      name: 'Backend Services',
      status: 'pending',
      message: 'Checking backend services...',
    },
    redis: {
      name: 'Redis Cache',
      status: 'pending',
      message: 'Checking Redis connection...',
    },
    overall: 'pending',
  });

  const [isRunning, setIsRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // ==========================================================================
  // HEALTH CHECK FUNCTIONS
  // ==========================================================================

  /**
   * Test frontend health (client-side)
   */
  const testFrontend = async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();

    try {
      // Test browser APIs and basic functionality
      const localStorageAvailable = typeof localStorage !== 'undefined';
      const fetchAvailable = typeof fetch !== 'undefined';

      if (!localStorageAvailable || !fetchAvailable) {
        return {
          name: 'Frontend',
          status: 'error',
          message: 'Browser APIs not available',
          responseTime: Date.now() - startTime,
        };
      }

      // Test localStorage write/read
      localStorage.setItem('health-test', 'test');
      localStorage.removeItem('health-test');

      return {
        name: 'Frontend',
        status: 'success',
        message: 'Frontend is healthy',
        details: {
          localStorage: 'OK',
          fetch: 'OK',
          userAgent: navigator.userAgent,
        },
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Frontend',
        status: 'error',
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
      };
    }
  };

  /**
   * Test backend basic health endpoint
   */
  const testBackend = async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: 'Backend API',
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
          },
          responseTime,
        };
      }

      const data = await response.json();

      return {
        name: 'Backend API',
        status: 'success',
        message: `Backend is healthy (${data.version || 'unknown'})`,
        details: data,
        responseTime,
      };
    } catch (error) {
      return {
        name: 'Backend API',
        status: 'error',
        message: (error as Error).message,
        details: {
          error: 'Connection refused or network error',
          suggestion: 'Make sure backend is running on port 3001',
        },
        responseTime: Date.now() - startTime,
      };
    }
  };

  /**
   * Test backend detailed health endpoint
   */
  const testBackendDetailed = async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:3001/api/v1/health/detailed', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: 'Backend Services',
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
          },
          responseTime,
        };
      }

      const data = await response.json();

      // Check if all services are healthy
      const allHealthy =
        data.services?.database?.status === 'healthy' &&
        data.services?.redis?.status === 'healthy';

      return {
        name: 'Backend Services',
        status: allHealthy ? 'success' : 'error',
        message: allHealthy ? 'All backend services healthy' : 'Some services are unhealthy',
        details: data,
        responseTime,
      };
    } catch (error) {
      return {
        name: 'Backend Services',
        status: 'error',
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
      };
    }
  };

  /**
   * Test Redis connection via backend
   */
  const testRedis = async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:3001/api/v1/health/detailed', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: 'Redis Cache',
          status: 'error',
          message: 'Cannot check Redis status - backend unavailable',
          responseTime,
        };
      }

      const data = await response.json();
      const redisStatus = data.services?.redis?.status;

      return {
        name: 'Redis Cache',
        status: redisStatus === 'healthy' ? 'success' : 'error',
        message: redisStatus === 'healthy'
          ? 'Redis is connected and responsive'
          : 'Redis is not connected',
        details: {
          status: redisStatus,
          memoryUsage: data.services?.redis?.memoryUsage,
          keyCount: data.services?.redis?.keyCount,
        },
        responseTime,
      };
    } catch (error) {
      return {
        name: 'Redis Cache',
        status: 'error',
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
      };
    }
  };

  // ==========================================================================
  // RUN ALL HEALTH CHECKS
  // ==========================================================================

  const runAllHealthChecks = async () => {
    setIsRunning(true);
    setHealthState(prev => ({
      ...prev,
      overall: 'pending',
      frontend: { ...prev.frontend, status: 'pending', message: 'Checking...' },
      backend: { ...prev.backend, status: 'pending', message: 'Connecting...' },
      backendDetailed: { ...prev.backendDetailed, status: 'pending', message: 'Checking...' },
      redis: { ...prev.redis, status: 'pending', message: 'Checking...' },
    }));

    // Run all health checks in parallel
    const [frontend, backend, backendDetailed, redis] = await Promise.all([
      testFrontend(),
      testBackend(),
      testBackendDetailed(),
      testRedis(),
    ]);

    // Determine overall health
    const allHealthy = [frontend, backend, backendDetailed, redis].every(
      check => check.status === 'success'
    );

    setHealthState({
      frontend,
      backend,
      backendDetailed,
      redis,
      overall: allHealthy ? 'healthy' : 'unhealthy',
    });

    setIsRunning(false);
  };

  // ==========================================================================
  // AUTO-REFRESH EFFECT
  // ==========================================================================

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(runAllHealthChecks, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // ==========================================================================
  // INITIAL CHECK
  // ==========================================================================

  useEffect(() => {
    runAllHealthChecks();
  }, []);

  // ==========================================================================
  // RENDER FUNCTIONS
  // ==========================================================================

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'success':
        return <Badge className="bg-green-500 text-white">Healthy</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const HealthCard = ({ result, icon }: { result: HealthCheckResult; icon: React.ReactNode }) => (
    <Card className={`${result.status === 'error' ? 'border-red-200' : result.status === 'success' ? 'border-green-200' : 'border-yellow-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{result.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(result.status)}
            {getStatusBadge(result.status)}
          </div>
        </div>
        <CardDescription className="text-sm">{result.message}</CardDescription>
      </CardHeader>

      {result.details && (
        <CardContent>
          <div className="space-y-2">
            {result.responseTime && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Response Time:</span> {result.responseTime}ms
              </div>
            )}
            <div className="text-xs bg-gray-50 p-3 rounded font-mono">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">FlowGen System Health</h1>
          <p className="text-gray-600">
            Monitor the connectivity and health of all FlowGen services
          </p>
        </div>

        {/* Overall Status */}
        <Alert className={healthState.overall === 'healthy' ? 'bg-green-50 border-green-200' : healthState.overall === 'unhealthy' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}>
          {healthState.overall === 'healthy' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : healthState.overall === 'unhealthy' ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : (
            <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
          )}
          <AlertDescription className={healthState.overall === 'healthy' ? 'text-green-800' : healthState.overall === 'unhealthy' ? 'text-red-800' : 'text-yellow-800'}>
            <span className="font-medium">
              System Status: {healthState.overall === 'healthy' ? 'All Systems Operational' : healthState.overall === 'unhealthy' ? 'System Issues Detected' : 'Checking System...'}
            </span>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={runAllHealthChecks}
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Checks...
              </>
            ) : (
              <>
                <Network className="mr-2 h-4 w-4" />
                Run Health Checks
              </>
            )}
          </Button>

          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="lg"
          >
            {autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}
          </Button>
        </div>

        {/* Health Check Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HealthCard result={healthState.frontend} icon={<Server className="h-5 w-5 text-blue-500" />} />
          <HealthCard result={healthState.backend} icon={<Server className="h-5 w-5 text-green-500" />} />
          <HealthCard result={healthState.backendDetailed} icon={<Database className="h-5 w-5 text-purple-500" />} />
          <HealthCard result={healthState.redis} icon={<Database className="h-5 w-5 text-red-500" />} />
        </div>

        {/* Connection Info */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Information</CardTitle>
            <CardDescription>Service endpoints and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Frontend URL:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3000</code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Backend URL:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3001</code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Backend Health:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3001/health</code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Redis:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">localhost:6379</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Docker Information */}
        <Card>
          <CardHeader>
            <CardTitle>Docker Service Communication</CardTitle>
            <CardDescription>How services communicate within Docker network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <div className="font-medium text-blue-900">Frontend → Backend</div>
                <code className="text-blue-700">http://backend:3001</code> (internal Docker network)
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="font-medium text-green-900">Backend → Redis</div>
                <code className="text-green-700">redis://redis:6379</code> (internal Docker network)
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="font-medium text-purple-900">Network Name</div>
                <code className="text-purple-700">flowgen-network</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
