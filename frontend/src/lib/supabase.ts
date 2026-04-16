// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - SUPABASE CLIENT
// ============================================================================
// This file creates a Supabase client for use in the Next.js frontend.
// It handles authentication state, real-time subscriptions, and database access.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// ============================================================================
// CREATE SUPABASE CLIENT
// ============================================================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Persist session in localStorage
    autoRefreshToken: true, // Automatically refresh expired tokens
    detectSessionInUrl: true, // Detect session from URL (for OAuth callbacks)
    flowType: 'pkce', // Use PKCE flow for better security
  },
});

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Failed to get current session:', error);
    return null;
  }
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string, metadata?: Record<string, any>) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to sign up:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to sign in:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to sign out:', error);
    throw error;
  }
}

/**
 * Subscribe to authentication state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(_event, session);
  });
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Query a table with tenant isolation
 * Automatically filters by tenant_id for the current user
 */
export async function tenantQuery<T = any>(
  table: string,
  options: {
    column?: string;
    value?: any;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  } = {}
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's tenant_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      throw new Error('User tenant not found');
    }

    let query = supabase
      .from(table)
      .select('*')
      .eq('tenant_id', userData.tenant_id);

    // Apply additional filters
    if (options.column && options.value !== undefined) {
      query = query.eq(options.column, options.value);
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as T[], error: null };
  } catch (error) {
    console.error('Failed to execute tenant query:', error);
    return { data: null, error };
  }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to changes in a table
 */
export function subscribeToTable(
  table: string,
  filter: { column: string; value: any },
  callback: (payload: any) => void
) {
  return supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table,
        filter: `${filter.column}=eq.${filter.value}`,
      },
      callback
    )
    .subscribe();
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: {
    upsert?: boolean;
    cacheControl?: string;
  }
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Failed to upload file:', error);
    return { data: null, error };
  }
}

/**
 * Get a public URL for a file
 */
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  supabase,
  getCurrentUser,
  getCurrentSession,
  signUp,
  signIn,
  signOut,
  onAuthStateChange,
  tenantQuery,
  subscribeToTable,
  uploadFile,
  getPublicUrl,
};
