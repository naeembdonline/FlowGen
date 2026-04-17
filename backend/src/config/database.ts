// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - DATABASE CONFIGURATION
// ============================================================================
// This file configures the Supabase (PostgreSQL) database connection.
// Supabase provides a managed PostgreSQL database with built-in authentication.
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION - WITH DEBUGGING
// ============================================================================

// DEBUG: Log environment loading status
logger.info('🔍 Checking environment variables...');
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`SUPABASE_URL exists: ${!!process.env.SUPABASE_URL}`);
logger.info(`SUPABASE_ANON_KEY exists: ${!!process.env.SUPABASE_ANON_KEY}`);
logger.info(`SUPABASE_SERVICE_ROLE_KEY exists: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Simplified validation - only check if values exist, not length
const validateSupabaseConfig = () => {
  const errors = [];

  if (!supabaseUrl) {
    errors.push('SUPABASE_URL is missing from .env file');
  } else if (!supabaseUrl.startsWith('https://')) {
    errors.push('SUPABASE_URL must start with https://');
  } else if (supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
    errors.push('SUPABASE_URL appears to be a placeholder. Replace with your actual Supabase project URL');
  }

  if (!supabaseAnonKey) {
    errors.push('SUPABASE_ANON_KEY is missing from .env file');
  }

  if (!supabaseServiceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is missing from .env file');
  }

  return errors;
};

// Validate and log helpful messages (don't throw - let server start)
const validationErrors = validateSupabaseConfig();
if (validationErrors.length > 0) {
  logger.error('❌ SUPABASE CONFIGURATION ERRORS:');
  validationErrors.forEach((error, index) => {
    logger.error(`   ${index + 1}. ${error}`);
  });

  logger.error('');
  logger.error('🔧 HOW TO FIX:');
  logger.error('1. Go to https://supabase.com/dashboard');
  logger.error('2. Select your project');
  logger.error('3. Go to Settings → API');
  logger.error('4. Copy these values to backend/.env:');
  logger.error('   SUPABASE_URL=https://your-project.supabase.co');
  logger.error('   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  logger.error('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

  logger.error('');
  logger.error('⚠️  SERVER WILL START IN MINIMAL MODE - AUTH ENDPOINTS WILL NOT WORK');
  logger.error('Please fix the above issues to enable full functionality');
} else {
  logger.info('✅ Supabase configuration validated successfully');
  logger.info(`📍 Supabase URL: ${supabaseUrl}`);
  logger.info(`🔑 Keys loaded (${supabaseAnonKey?.length || 0} and ${supabaseServiceRoleKey?.length || 0} chars)`);
}

// ============================================================================
// EXPORT CONFIGURATION STATUS
// ============================================================================

export const isSupabaseConfigured = validationErrors.length === 0;

// ============================================================================
// SUPABASE CLIENTS (with safe defaults)
// ============================================================================

let supabaseInstance: SupabaseClient;
let supabaseAdminInstance: SupabaseClient;

if (isSupabaseConfigured) {
  // Client for general queries (respects RLS policies)
  // Use this for most database operations
  supabaseInstance = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false, // Don't persist session on server
        autoRefreshToken: false, // Don't auto-refresh tokens on server
      },
    }
  );

  // Client with admin privileges (bypasses RLS policies)
  // Use carefully - only for operations that need to bypass tenant isolation
  supabaseAdminInstance = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
} else {
  // Create placeholder clients that will fail gracefully
  logger.warn('⚠️ Creating placeholder Supabase clients - will fail when used');

  // Create a minimal client that will throw helpful errors
  supabaseInstance = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  ) as any;

  supabaseAdminInstance = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  ) as any;
}

// Export the instances (will be placeholders if not configured)
export const supabase: SupabaseClient = supabaseInstance;
export const supabaseAdmin: SupabaseClient = supabaseAdminInstance;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize database connection and verify connectivity
 * This function tests the connection and logs the result
 * Note: Database connection is optional for development - health endpoints will work
 */
export async function initializeDatabase(): Promise<void> {
  if (!isSupabaseConfigured) {
    logger.warn('⚠️ Supabase not configured - skipping database initialization');
    logger.warn('❌ Auth endpoints will not work without Supabase configuration');
    return;
  }

  try {
    // Test connection with a simple query
    const { error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (error) {
      // If table doesn't exist yet, that's okay - we'll create it with migrations
      if (error.code === '42P01') { // Relation does not exist
        logger.warn('Database tables do not exist yet. Run migrations to create them.');
        return;
      }
      throw error;
    }

    logger.info('✓ Database connection verified successfully');
  } catch (error) {
    logger.warn('Database connection failed - some features may not work:', (error as Error).message);
    // Don't throw error - allow backend to start for development
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tenant_id for the current user
 * @param userId - The user's UUID from Supabase Auth
 * @returns The user's tenant_id
 */
export async function getUserTenantId(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data?.tenant_id) throw new Error('User not associated with a tenant');

    return data.tenant_id;
  } catch (error) {
    logger.error('Failed to get user tenant_id:', error);
    throw error;
  }
}

/**
 * Check if a user has a specific role
 * @param userId - The user's UUID
 * @param role - The role to check (admin, user, viewer)
 * @returns True if user has the role
 */
export async function getUserRole(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.role || 'user';
  } catch (error) {
    logger.error('Failed to get user role:', error);
    throw error;
  }
}

/**
 * Execute a database query with tenant isolation automatically applied
 * This is a convenience wrapper that adds tenant_id filtering automatically
 * @param table - The table name
 * @param tenantId - The tenant_id to filter by
 * @param query - The Supabase query builder
 * @returns The query result
 */
export async function tenantQuery<T = any>(
  table: string,
  tenantId: string,
  query?: (qb: any) => any
): Promise<{ data: T[] | null; error: any }> {
  try {
    let qb = supabase.from(table).select('*').eq('tenant_id', tenantId);

    if (query) {
      qb = query(qb);
    }

    return await qb;
  } catch (error) {
    logger.error(`Failed to execute tenant query on ${table}:`, error);
    return { data: null, error };
  }
}

// ============================================================================
// DATABASE HEALTH CHECK
// ============================================================================

/**
 * Check if database connection is healthy
 * @returns True if database is accessible
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  supabase,
  supabaseAdmin,
  initializeDatabase,
  getUserTenantId,
  getUserRole,
  tenantQuery,
  isDatabaseHealthy,
};
