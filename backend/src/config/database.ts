// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - DATABASE CONFIGURATION
// ============================================================================
// This file configures the Supabase (PostgreSQL) database connection.
// Supabase provides a managed PostgreSQL database with built-in authentication.
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  logger.warn('Missing Supabase credentials - using placeholder for development');
  logger.warn('Set SUPABASE_URL and SUPABASE_ANON_KEY in .env for full functionality');

  // Use placeholder values for development
  process.env.SUPABASE_URL = supabaseUrl || 'https://placeholder.supabase.co';
  process.env.SUPABASE_ANON_KEY = supabaseAnonKey || 'placeholder-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey || 'placeholder-service-role-key';
}

// ============================================================================
// SUPABASE CLIENTS
// ============================================================================

// Client for general queries (respects RLS policies)
// Use this for most database operations
export const supabase: SupabaseClient = createClient(
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
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize database connection and verify connectivity
 * This function tests the connection and logs the result
 * Note: Database connection is optional for development - health endpoints will work
 */
export async function initializeDatabase(): Promise<void> {
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
    logger.warn('Database connection failed - health endpoints will work with limited functionality:', (error as Error).message);
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
