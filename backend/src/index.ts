// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - MAIN EXPRESS SERVER
// ============================================================================
// This is the main entry point for the backend API server.
// It sets up Express middleware, routes, error handling, and starts the server.
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeQueue } from './jobs/queue';
import { messageWorker } from './jobs/workers/messageWorker';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import middleware
import authRoutes from './routes/auth.routes';
import leadRoutes from './routes/leads.routes.queue'; // Use Queue-based routes
import campaignRoutes from './routes/campaigns.routes';
import messageRoutes from './routes/messages.routes';
import analyticsRoutes from './routes/analytics.routes';
import healthRoutes from './routes/health.routes';

// Import scraping queue service
import { scrapingQueueService } from './services/scrapingQueue.service';

// Import rate limiters
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimiter';

// ============================================================================
// CONFIGURATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Security headers with Helmet
// Helmet helps protect your app by setting various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow DevTools to work properly
}));

// CORS configuration
// Controls which domains can access your API
const corsOptions = {
  origin: NODE_ENV === 'production'
    ? process.env.FRONTEND_URL // Only allow production frontend in production
    : ['http://localhost:3000', 'http://localhost:3001'], // Allow localhost in dev
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Request logging with Morgan
// Logs all incoming requests for debugging
if (NODE_ENV === 'development') {
  app.use(morgan('dev')); // Colorful console logs in dev
} else {
  app.use(morgan('combined')); // Standard Apache combined log format in prod
}

// Custom request logger middleware
// Adds additional logging with request ID and timing
app.use(requestLogger);

// Body parsing middleware
// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' })); // Limit body size to prevent abuse
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (needed for accurate IP addresses behind reverse proxy)
app.set('trust proxy', 1);

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
// This endpoint is used by monitoring tools to check if the server is running
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ============================================================================
// API ROUTES
// ============================================================================
// Apply general API rate limiting to all routes
app.use('/api/v1/', apiRateLimiter.middleware());

// Authentication routes (with stricter rate limiting)
app.use('/api/v1/auth', authRateLimiter.middleware(), authRoutes);

// Lead management routes (with scraping rate limiting on import endpoint)
app.use('/api/v1/leads', leadRoutes);

// Campaign routes
app.use('/api/v1/campaigns', campaignRoutes);

// Message routes
app.use('/api/v1/messages', messageRoutes);

// Analytics routes
app.use('/api/v1/analytics', analyticsRoutes);

// Health check routes (no rate limiting)
app.use('/api/v1/health', healthRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================
// Must be after all routes but before error handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================
// Must be last in the middleware chain
app.use(errorHandler);

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
  try {
    // Initialize database connection (optional for development)
    logger.info('Initializing database connection...');
    try {
      await initializeDatabase();
      logger.info('✓ Database connected successfully');
    } catch (dbError) {
      logger.warn('Database initialization failed - continuing with limited functionality');
    }

    // Initialize Redis connection (optional for development)
    logger.info('Initializing Redis connection...');
    try {
      await initializeRedis();
      logger.info('✓ Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis initialization failed - continuing without caching');
    }

    // Initialize Bull queue (only if Redis is available)
    logger.info('Initializing job queue...');
    let messageQueue: any = null;
    try {
      messageQueue = await initializeQueue();
      logger.info('✓ Job queue initialized successfully');
    } catch (queueError) {
      logger.warn('Job queue initialization failed - continuing without queue functionality');
    }

    // Start message queue worker (only if queue is available)
    if (messageQueue) {
      try {
        logger.info('Starting message queue worker...');
        messageWorker(messageQueue);
        logger.info('✓ Message queue worker started');
      } catch (workerError) {
        logger.warn('Message queue worker failed to start');
      }
    }

    // Initialize scraping queue service (optional)
    try {
      logger.info('Initializing scraping queue service...');
      await scrapingQueueService.initialize();
      logger.info('✓ Scraping queue service initialized');
    } catch (scrapingError) {
      logger.warn('Scraping queue service failed to initialize - continuing without scraping');
    }

    // Create HTTP server
    const httpServer = createServer(app);

    // Start listening for connections
    httpServer.listen(PORT, () => {
      logger.info('╔════════════════════════════════════════════════════════════╗');
      logger.info('║                                                            ║');
      logger.info('║            FLOWGEN LEAD GENERATION SAAS API               ║');
      logger.info('║                                                            ║');
      logger.info('╚════════════════════════════════════════════════════════════╝');
      logger.info('');
      logger.info(`Environment:  ${NODE_ENV}`);
      logger.info(`Server:       http://localhost:${PORT}`);
      logger.info(`Health:       http://localhost:${PORT}/health`);
      logger.info(`API Base:     http://localhost:${PORT}/api/v1`);
      logger.info('');
      logger.info('✓ Server is ready to accept requests');
      logger.info('');
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      httpServer.close(() => {
        logger.info('✓ HTTP server closed');
      });

      // Close queue worker
      logger.info('Closing queue worker...');
      await messageQueue.close();
      logger.info('✓ Queue worker closed');

      // Close scraping queue service
      logger.info('Closing scraping queue service...');
      await scrapingQueueService.close();
      logger.info('✓ Scraping queue service closed');

      // Close Redis connection
      logger.info('Closing Redis connection...');
      const { redisClient } = await import('./config/redis');
      await redisClient.quit();
      logger.info('✓ Redis connection closed');

      logger.info('✓ Graceful shutdown complete');
      process.exit(0);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================================================
// START SERVER
// ============================================================================
// Only start the server if this file is run directly (not imported)
if (require.main === module) {
  startServer();
}

// Export app for testing
export default app;
