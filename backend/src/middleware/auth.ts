// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - AUTHENTICATION MIDDLEWARE
// ============================================================================
// Robust authentication middleware using Supabase Auth
// Ensures strict tenant isolation for multi-tenant SaaS security
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthRequest } from '../routes/auth.routes';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenant_id: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    full_name?: string;
  };
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Main authentication middleware
 * Verifies JWT token and extracts user/tenant information
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    // Check for authorization header
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing authorization header', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        code: 'MISSING_AUTH_HEADER'
      });
      return;
    }

    // Extract token from header
    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (tokenError) {
      logger.warn('Authentication failed: Invalid token', {
        path: req.path,
        method: req.method,
        tokenError: tokenError.message,
        ip: req.ip,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Validate decoded token has required fields
    if (!decoded.userId || !decoded.tenantId) {
      logger.error('Authentication failed: Token missing required fields', {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        path: req.path,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token is missing required user information',
        code: 'INCOMPLETE_TOKEN'
      });
      return;
    }

    // Attach user information to request
    req.user = {
      id: decoded.userId,
      tenant_id: decoded.tenantId,
      email: decoded.email || '',
      role: decoded.role || 'user',
      full_name: decoded.fullName,
    };

    // Log successful authentication
    logger.debug('User authenticated successfully', {
      userId: req.user.id,
      tenantId: req.user.tenant_id,
      email: req.user.email,
      role: req.user.role,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed due to server error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Require authentication - shorter alias
 */
export const requireAuth = authenticateToken;

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    // Token present, verify it
    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);

      if (decoded.userId && decoded.tenantId) {
        req.user = {
          id: decoded.userId,
          tenant_id: decoded.tenantId,
          email: decoded.email || '',
          role: decoded.role || 'user',
          full_name: decoded.fullName,
        };
      }
    } catch (tokenError) {
      // Invalid token, but we continue without auth
      logger.debug('Optional auth failed, continuing without authentication');
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue anyway for optional auth
  }
}

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // First ensure user is authenticated
    if (!req.user?.id) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: User lacks required role', {
        userId: req.user.id,
        tenantId: req.user.tenant_id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `You don't have permission. Required role: ${allowedRoles.join(' or ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    logger.debug('Role-based authorization passed', {
      userId: req.user.id,
      tenantId: req.user.tenant_id,
      role: req.user.role,
      allowedRoles,
      path: req.path,
    });

    next();
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Admin or user middleware
 */
export const requireAdminOrUser = requireRole('admin', 'user');

/**
 * Extract tenant_id from authenticated request
 * Throws error if tenant_id is not available
 */
export function requireTenantId(req: AuthenticatedRequest): string {
  if (!req.user?.tenant_id) {
    throw new Error('Tenant ID not found in request. User may not be authenticated.');
  }

  return req.user.tenant_id;
}

/**
 * Extract user_id from authenticated request
 * Throws error if user_id is not available
 */
export function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user?.id) {
    throw new Error('User ID not found in request. User may not be authenticated.');
  }

  return req.user.id;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  authenticateToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireAdminOrUser,
  requireTenantId,
  requireUserId
};
