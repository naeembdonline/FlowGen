// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - REQUEST LOGGER MIDDLEWARE
// ============================================================================
// This middleware logs all incoming HTTP requests with timing information.
// It adds a unique request ID for tracking through the logs.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, logHttp } from '../utils/logger';

// ============================================================================
// EXTENDED REQUEST INTERFACE
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

// ============================================================================
// REQUEST LOGGER MIDDLEWARE
// ============================================================================

/**
 * Request logger middleware
 * Adds request ID, tracks timing, and logs when request completes
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Add unique request ID
  req.id = uuidv4();

  // Record start time
  req.startTime = Date.now();

  // Log incoming request
  logger.debug('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture the original res.json to intercept responses
  const originalJson = res.json.bind(res);

  // Override res.json to log response
  res.json = function (body: any) {
    // Calculate response time
    const responseTime = Date.now() - (req.startTime || Date.now());

    // Log the response
    logHttp(
      req.method,
      req.path,
      res.statusCode,
      responseTime
    );

    // Log details in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Response sent', {
        requestId: req.id,
        statusCode: res.statusCode,
        responseTime,
        body: res.statusCode >= 400 ? body : undefined, // Only log error bodies
      });
    }

    // Call original json method
    return originalJson(body);
  };

  // Continue to next middleware
  next();
}

// ============================================================================
// REQUEST ID HEADER MIDDLEWARE
// ============================================================================

/**
 * Add request ID to response header
 * Useful for tracking requests through distributed systems
 */
export function requestIdHeader(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use existing request ID or create new one
  const requestId = req.id || uuidv4();
  req.id = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  requestLogger,
  requestIdHeader,
};
