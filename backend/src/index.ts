// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - MAIN EXPRESS SERVER
// ============================================================================
// This is the main entry point for the backend API server.
// It sets up Express middleware, routes, error handling, and starts the server.
// ============================================================================

// Import required modules for environment loading
import dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// ============================================================================
// DEBUG: Print current directory and search paths
// ============================================================================

console.log('🔍 ENVIRONMENT VARIABLE LOADING DEBUG');
console.log('='.repeat(60));
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('Looking for .env at:', resolve(process.cwd(), '.env'));

// ============================================================================
// ROBUST .env FILE LOADING WITH ABSOLUTE PATHS
// ============================================================================

// Define multiple possible .env file locations to try
const possibleEnvPaths = [
  resolve(process.cwd(), '.env'),                    // Current working directory
  resolve(__dirname, '.env'),                       // backend/src/.env
  resolve(__dirname, '../.env'),                     // backend/.env
  resolve(__dirname, '..', '.env'),                  // backend/.env (alternative)
  resolve(__dirname, '..', 'backend', '.env'),       // F:\Parsa\Lead Saas\backend\.env
  resolve(__dirname, '..', '..', 'backend', '.env'),  // Go up two levels
];

console.log('\n🔍 Searching for .env file in these locations:');
possibleEnvPaths.forEach((path, index) => {
  const exists = existsSync(path);
  console.log(`  ${index + 1}. ${path} - ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
});

// Try to load .env from each location until one works
let envLoaded = false;
let loadedFromPath = null;

for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    console.log(`\n✅ Found .env file at: ${envPath}`);
    console.log(`📖 Loading environment variables from: ${envPath}`);

    try {
      const result = dotenv.config({ path: envPath });

      if (result.error) {
        console.error(`❌ Error loading .env from ${envPath}:`, result.error.message);
      } else {
        // Successfully loaded - verify some keys were loaded
        const keysBefore = Object.keys(process.env).length;
        // Parse the file directly to see what variables are available
        const fs = require('fs');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => line.split('=')[0].trim());

        console.log(`📊 Found ${envLines.length} environment variables in .env file`);
        console.log(`🔑 Variables found: ${envLines.slice(0, 5).join(', ')}${envLines.length > 5 ? '...' : ''}`);

        loadedFromPath = envPath;
        envLoaded = true;
        console.log(`✅ Successfully loaded .env from: ${envPath}`);
        break;
      }
    } catch (error) {
      console.error(`❌ Exception loading .env from ${envPath}:`, error.message);
    }
  }
}

if (!envLoaded) {
  console.error('\n❌ NO .env FILE FOUND IN ANY LOCATION!');
  console.error('Please ensure .env file exists in one of these locations:');
  possibleEnvPaths.forEach(path => console.log(`   - ${path}`));
  console.error('\n🔧 CREATE .env FILE with these minimum contents:');
  console.error(`
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=3001
NODE_ENV=development
USE_IN_MEMORY_CACHE=true
  `);
}

// ============================================================================
// CLEAN ENVIRONMENT VARIABLES - Remove newlines and spaces
// ============================================================================

const cleanEnvVar = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.replace(/[\n\r\s]+/g, '').trim();
};

// Clean critical JWT tokens that might have line breaks or extra spaces
if (process.env.SUPABASE_URL) {
  const originalLength = process.env.SUPABASE_URL.length;
  process.env.SUPABASE_URL = cleanEnvVar(process.env.SUPABASE_URL);
  console.log(`🧹 Cleaned SUPABASE_URL (${originalLength} -> ${process.env.SUPABASE_URL.length} chars)`);
}

if (process.env.SUPABASE_ANON_KEY) {
  const originalLength = process.env.SUPABASE_ANON_KEY.length;
  process.env.SUPABASE_ANON_KEY = cleanEnvVar(process.env.SUPABASE_ANON_KEY);
  console.log(`🧹 Cleaned SUPABASE_ANON_KEY (${originalLength} -> ${process.env.SUPABASE_ANON_KEY.length} chars)`);
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const originalLength = process.env.SUPABASE_SERVICE_ROLE_KEY.length;
  process.env.SUPABASE_SERVICE_ROLE_KEY = cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`🧹 Cleaned SUPABASE_SERVICE_ROLE_KEY (${originalLength} -> ${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)`);
}

if (process.env.Z_AI_API_KEY) {
  process.env.Z_AI_API_KEY = cleanEnvVar(process.env.Z_AI_API_KEY);
  console.log(`🧹 Cleaned Z_AI_API_KEY`);
}

if (process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = cleanEnvVar(process.env.OPENAI_API_KEY);
  console.log(`🧹 Cleaned OPENAI_API_KEY`);
}

if (process.env.JWT_SECRET) {
  process.env.JWT_SECRET = cleanEnvVar(process.env.JWT_SECRET);
  console.log(`🧹 Cleaned JWT_SECRET`);
}

// ============================================================================
// FINAL VERIFICATION
// ============================================================================

console.log('\n🔍 FINAL ENVIRONMENT CHECK:');
console.log(`SUPABASE_URL exists: ${!!process.env.SUPABASE_URL}`);
console.log(`SUPABASE_ANON_KEY exists: ${!!process.env.SUPABASE_ANON_KEY}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY exists: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
console.log('='.repeat(60) + '\n');

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
