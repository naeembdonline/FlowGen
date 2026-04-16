// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - ERROR HANDLER MIDDLEWARE
// ============================================================================
// This middleware catches all errors thrown in the application and formats
// them into consistent API responses for the client.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger, logError } from '../utils/logger';

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Custom API error class with status code
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for request validation failures
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed') {
    super(400, message);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error for failed auth attempts
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(401, message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error for duplicate resources
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource already exists') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

/**
 * Global error handler middleware
 * MUST be registered after all routes but before any other error middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError('Error caught by error handler', {
    path: req.path,
    method: req.method,
    query: req.query,
    params: req.params,
    statusCode: (err as any).statusCode,
  }, err);

  // Handle known API errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Request validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'AuthenticationError',
      message: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'AuthenticationError',
      message: 'Token expired',
    });
    return;
  }

  // Handle Supabase errors
  if (err.name === 'SupabaseError') {
    const supabaseError = err as any;
    res.status(400).json({
      error: 'DatabaseError',
      message: supabaseError.message || 'Database operation failed',
      ...(process.env.NODE_ENV === 'development' && {
        details: supabaseError,
      }),
    });
    return;
  }

  // Handle unknown errors (don't leak details in production)
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message || 'Internal server error';

  res.status(statusCode).json({
    error: 'InternalServerError',
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
}

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wrapper for async route handlers to catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// NOT FOUND HANDLER
// ============================================================================

/**
 * 404 Not Found handler
 * Register this after all routes to catch unmatched paths
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};
