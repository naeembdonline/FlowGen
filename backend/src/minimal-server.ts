// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - MINIMAL SERVER FOR TESTING
// ============================================================================
// This is a minimal Express server that starts without dependencies
// Used for testing connectivity when Redis/DB are not available
// ============================================================================

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * Basic health check
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    message: 'Minimal FlowGen backend is running',
  });
});

/**
 * Detailed health check
 */
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: {
        status: 'not configured',
        message: 'Set up Supabase credentials for full functionality'
      },
      redis: {
        status: 'not configured',
        message: 'Redis not available - running in minimal mode'
      }
    }
  });
});

/**
 * Detailed health check with services
 */
app.get('/api/v1/health/detailed', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: {
        status: 'not configured',
        message: 'Set up Supabase credentials for full functionality'
      },
      redis: {
        status: 'unavailable',
        message: 'Redis not configured - running in minimal mode',
        memoryUsage: 'N/A',
        keyCount: 0
      }
    },
    message: 'Minimal server - Configure Redis and Supabase for full functionality'
  });
});

/**
 * Readiness probe
 */
app.get('/api/v1/health/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    message: 'Minimal server is ready to accept requests'
  });
});

/**
 * Liveness probe
 */
app.get('/api/v1/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
    hint: 'This is a minimal server. Configure Redis and Supabase for full API functionality.'
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║         FLOWGEN LEAD GENERATION SAAS - MINIMAL API        ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server:       http://localhost:${PORT}`);
  console.log(`Health:       http://localhost:${PORT}/health`);
  console.log(`API Base:     http://localhost:${PORT}/api/v1`);
  console.log('');
  console.log('✓ Minimal server is ready to accept requests');
  console.log('✓ CORS enabled for localhost:3000');
  console.log('✓ Health check endpoints are available');
  console.log('');
  console.log('NOTE: This is a minimal server for testing connectivity.');
  console.log('      Configure Redis and Supabase for full functionality.');
  console.log('');
});

export default app;
