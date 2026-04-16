// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - RATE LIMITER MIDDLEWARE
// ============================================================================
// Rate limiting middleware to prevent abuse and manage API quotas.
// Uses Redis for distributed rate limiting across multiple server instances.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { RateLimitError } from './errorHandler';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RateLimitOptions {
  windowMs: number;          // Time window in milliseconds
  maxRequests: number;       // Max requests per window
  keyPrefix?: string;        // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

declare global {
  namespace Express {
    interface Request {
      rateLimit?: RateLimitInfo;
    }
  }
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

export class RateLimiter {
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      keyPrefix: options.keyPrefix || 'rate_limit',
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
    };
  }

  /**
   * Middleware function to check rate limit
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.getKey(req);
        const result = await this.checkLimit(key);

        // Attach rate limit info to request
        req.rateLimit = result;

        // Add rate limit headers to response
        this.addHeaders(res, result);

        if (result.remaining < 0) {
          // Rate limit exceeded
          logger.warn('Rate limit exceeded', {
            key,
            limit: result.limit,
            current: result.current,
          });

          throw new RateLimitError(
            `Too many requests. Please try again later.`
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Generate unique key for rate limiting
   * Uses user ID if authenticated, otherwise IP address
   */
  private getKey(req: Request): string {
    // Try to get user ID from JWT (set by auth middleware)
    const userId = (req as any).user?.id;

    if (userId) {
      return `${this.options.keyPrefix}:user:${userId}`;
    }

    // Fall back to IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${this.options.keyPrefix}:ip:${ip}`;
  }

  /**
   * Check if request is within rate limit
   */
  private async checkLimit(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    try {
      // Use Redis sorted set for sliding window
      const pipeline = redisClient.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}:${Math.random()}`);

      // Set expiry on the key
      pipeline.expire(key, Math.ceil(this.options.windowMs / 1000) + 1);

      // Execute pipeline
      const results = await pipeline.exec();

      if (!results || results[1][1] === null) {
        throw new Error('Redis pipeline failed');
      }

      const current = results[1][1] as number;
      const limit = this.options.maxRequests;
      const remaining = limit - current;
      const resetTime = new Date(now + this.options.windowMs);

      return {
        limit,
        current,
        remaining,
        resetTime,
      };
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // On error, allow request (fail open)
      return {
        limit: this.options.maxRequests,
        current: 0,
        remaining: this.options.maxRequests,
        resetTime: new Date(Date.now() + this.options.windowMs),
      };
    }
  }

  /**
   * Add rate limit headers to response
   */
  private addHeaders(res: Response, info: RateLimitInfo): void {
    res.setHeader('X-RateLimit-Limit', info.limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining).toString());
    res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(req: Request): Promise<void> {
    const key = this.getKey(req);
    await redisClient.del(key);
    logger.info('Rate limit reset', { key });
  }
}

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================================================

// General API rate limit: 100 requests per 15 minutes
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyPrefix: 'api_rate_limit',
});

// Lead scraping rate limit: 10 requests per minute
// Prevents abuse of the omkarcloud API
export const scrapingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  keyPrefix: 'scraping_rate_limit',
});

// Message sending rate limit: 60 requests per minute
export const messageRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  keyPrefix: 'message_rate_limit',
});

// Authentication rate limit: 5 requests per minute
export const authRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  keyPrefix: 'auth_rate_limit',
});

// ============================================================================
// EXPORTS
// ============================================================================

export default RateLimiter;
