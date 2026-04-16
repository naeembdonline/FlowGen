// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - AUTHENTICATION ROUTES
// ============================================================================
// These routes handle user authentication: signup, login, logout, token refresh
// Uses Supabase Auth for user management and JWT for API tokens
// ============================================================================

import { Router, Request, Response } from 'express';
import { supabase, getUserTenantId } from '../config/database';
import { asyncHandler, AuthenticationError, ValidationError } from '../middleware/errorHandler';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================================================
// TYPES
// ============================================================================

interface AuthRequest extends Request {
  user?: {
    id: string;
    tenant_id: string;
    role: string;
    email: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate JWT token for user
 */
function generateToken(userId: string, tenantId: string, role: string): string {
  return jwt.sign(
    {
      userId,
      tenantId,
      role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

/**
 * Verify JWT token and return payload
 */
function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/v1/auth/signup
 * Register a new user
 * Body: { email, password, fullName, tenantName? }
 */
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, tenantName } = req.body;

  // Validate input
  if (!email || !password || !fullName) {
    throw new ValidationError('Email, password, and full name are required');
  }

  // Sign up user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError || !authData.user) {
    logger.error('Signup failed:', authError);
    throw new AuthenticationError('Failed to create user account');
  }

  const userId = authData.user.id;

  // Check if this is the first user (create tenant)
  // For now, we'll create a tenant for each signup
  // In production, you might want invitation codes
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: tenantName || `${fullName}'s Organization`,
      slug: `${email.split('@')[0].toLowerCase()}-${Date.now()}`,
      plan: 'free',
    })
    .select()
    .single();

  if (tenantError || !tenantData) {
    logger.error('Failed to create tenant:', tenantError);
    // Clean up auth user if tenant creation fails
    await supabase.auth.admin.deleteUser(userId);
    throw new Error('Failed to create organization');
  }

  // Create user record
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: userId,
      tenant_id: tenantData.id,
      role: 'admin', // First user is admin
      full_name: fullName,
    });

  if (userError) {
    logger.error('Failed to create user record:', userError);
    throw new Error('Failed to create user record');
  }

  // Generate JWT token
  const token = generateToken(userId, tenantData.id, 'admin');

  logger.info('New user registered', { userId, tenantId: tenantData.id, email });

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: userId,
      email: authData.user.email,
      fullName,
      role: 'admin',
      tenant: {
        id: tenantData.id,
        name: tenantData.name,
        plan: tenantData.plan,
      },
    },
  });
}));

/**
 * POST /api/v1/auth/login
 * Log in an existing user
 * Body: { email, password }
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  // Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    logger.warn('Login failed', { email, error: authError?.message });
    throw new AuthenticationError('Invalid email or password');
  }

  const userId = authData.user.id;

  // Get user details from database
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    logger.error('Failed to fetch user data:', userError);
    throw new AuthenticationError('Failed to retrieve user information');
  }

  // Generate JWT token
  const token = generateToken(userId, userData.tenant_id, userData.role);

  logger.info('User logged in', { userId, tenantId: userData.tenant_id, email });

  res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      id: userId,
      email: authData.user.email,
      fullName: userData.full_name,
      role: userData.role,
      tenant: {
        id: userData.tenant.id,
        name: userData.tenant.name,
        plan: userData.tenant.plan,
      },
    },
  });
}));

/**
 * POST /api/v1/auth/logout
 * Log out the current user (invalidate token)
 * Headers: Authorization: Bearer <token>
 */
router.post('/logout', asyncHandler(async (req: AuthRequest, res: Response) => {
  // In a stateless JWT setup, we don't need to do anything server-side
  // The client should discard the token
  // For additional security, you could implement a token blacklist in Redis

  logger.info('User logged out', { userId: req.user?.id });

  res.status(200).json({
    message: 'Logout successful',
  });
}));

/**
 * POST /api/v1/auth/refresh
 * Refresh an expired token
 * Body: { token }
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Token is required');
  }

  // Verify token (even if expired, we can extract the user info)
  try {
    const decoded = verifyToken(token);

    // Check if user still exists and is valid
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, tenant:tenants(*)')
      .eq('id', decoded.userId)
      .single();

    if (userError || !userData) {
      throw new AuthenticationError('User not found');
    }

    // Generate new token
    const newToken = generateToken(
      decoded.userId,
      decoded.tenantId,
      decoded.role
    );

    logger.info('Token refreshed', { userId: decoded.userId });

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: newToken,
    });
  } catch (error) {
    logger.warn('Token refresh failed', { error: (error as Error).message });
    throw new AuthenticationError('Invalid token');
  }
}));

/**
 * GET /api/v1/auth/me
 * Get current user information
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', asyncHandler(async (req: AuthRequest, res: Response) => {
  // User info is attached to request by auth middleware
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }

  res.status(200).json({
    user: req.user,
  });
}));

// ============================================================================
// EXPORT
// ============================================================================

export default router;
export { verifyToken, AuthRequest };
