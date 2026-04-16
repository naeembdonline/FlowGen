// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - SUPABASE DATABASE SERVICE
// ============================================================================
// This service provides a clean abstraction layer for database operations.
// It encapsulates common queries and business logic.
// ============================================================================

import { supabase, supabaseAdmin } from '../config/database';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  plan_limits: any;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  role: 'admin' | 'user' | 'viewer';
  full_name: string;
  email?: string;
  avatar_url?: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  category?: string;
  status: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  type: 'whatsapp' | 'email';
  status: string;
  message_template?: string;
  ai_prompt?: string;
  stats: any;
  created_at: string;
}

// ============================================================================
// TENANT SERVICE
// ============================================================================

export const tenantService = {
  /**
   * Get tenant by ID
   */
  async getById(tenantId: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get tenant:', error);
      return null;
    }
  },

  /**
   * Get tenant by slug
   */
  async getBySlug(slug: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get tenant by slug:', error);
      return null;
    }
  },

  /**
   * Update tenant
   */
  async update(tenantId: string, updates: Partial<Tenant>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to update tenant:', error);
      return false;
    }
  },
};

// ============================================================================
// USER SERVICE
// ============================================================================

export const userService = {
  /**
   * Get user by ID with tenant info
   */
  async getById(userId: string): Promise<(User & { tenant: Tenant }) | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          tenant:tenants(*)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get user:', error);
      return null;
    }
  },

  /**
   * Get all users in a tenant
   */
  async getByTenant(tenantId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get tenant users:', error);
      return [];
    }
  },

  /**
   * Update user
   */
  async update(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to update user:', error);
      return false;
    }
  },
};

// ============================================================================
// LEAD SERVICE
// ============================================================================

export const leadService = {
  /**
   * Get leads for a tenant with pagination
   */
  async getByTenant(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      category?: string;
      search?: string;
    } = {}
  ): Promise<{ leads: Lead[]; total: number }> {
    try {
      const { page = 1, limit = 20, status, category, search } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Apply filters
      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        leads: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Failed to get leads:', error);
      return { leads: [], total: 0 };
    }
  },

  /**
   * Get lead by ID
   */
  async getById(leadId: string): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get lead:', error);
      return null;
    }
  },

  /**
   * Create new lead
   */
  async create(tenantId: string, lead: Omit<Lead, 'id' | 'tenant_id' | 'created_at'>): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...lead,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create lead:', error);
      return null;
    }
  },

  /**
   * Update lead
   */
  async update(leadId: string, updates: Partial<Lead>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to update lead:', error);
      return false;
    }
  },

  /**
   * Delete lead
   */
  async delete(leadId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to delete lead:', error);
      return false;
    }
  },

  /**
   * Bulk import leads with improved error handling and duplicate detection
   */
  async bulkImport(tenantId: string, leads: Omit<Lead, 'id' | 'tenant_id' | 'created_at'>[]): Promise<{
    imported: number;
    duplicates: number;
    errors: number;
  }> {
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    // Process in batches for better performance
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < leads.length; i += batchSize) {
      batches.push(leads.slice(i, i + batchSize));
    }

    logger.info(`Starting bulk import of ${leads.length} leads in ${batches.length} batches`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`, { batchSize: batch.length });

      for (const lead of batch) {
        try {
          // Check for duplicates (same google_maps_id)
          if (lead.google_maps_id) {
            const { data: existing, error: checkError } = await supabase
              .from('leads')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('google_maps_id', lead.google_maps_id)
              .maybeSingle(); // Use maybeSingle to avoid error if not found

            if (checkError && checkError.code !== 'PGRST116') {
              // PGRST116 is "not found" which is expected
              throw checkError;
            }

            if (existing) {
              duplicates++;
              continue;
            }
          }

          // Insert lead with additional metadata
          const { error: insertError } = await supabase
            .from('leads')
            .insert({
              ...lead,
              tenant_id: tenantId,
              // Add additional metadata
              imported_at: new Date().toISOString(),
              // Ensure required fields have defaults
              status: lead.status || 'new',
              source: lead.source || 'google_maps',
            });

          if (insertError) {
            // Check if it's a unique constraint violation
            if (insertError.code === '23505') {
              duplicates++;
            } else {
              logger.error('Failed to import lead:', {
                error: insertError.message,
                code: insertError.code,
                leadName: lead.name,
              });
              errors++;
            }
          } else {
            imported++;
          }
        } catch (error: any) {
          logger.error('Failed to import lead:', {
            error: error.message,
            leadName: lead.name,
          });
          errors++;
        }
      }

      // Add delay between batches to avoid overwhelming the database
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Bulk import completed', {
      total: leads.length,
      imported,
      duplicates,
      errors,
    });

    return { imported, duplicates, errors };
  },
};

// ============================================================================
// CAMPAIGN SERVICE
// ============================================================================

export const campaignService = {
  /**
   * Get campaigns for a tenant
   */
  async getByTenant(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      type?: string;
    } = {}
  ): Promise<{ campaigns: Campaign[]; total: number }> {
    try {
      const { page = 1, limit = 20, status, type } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('campaigns')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);

      if (status) query = query.eq('status', status);
      if (type) query = query.eq('type', type);

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        campaigns: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Failed to get campaigns:', error);
      return { campaigns: [], total: 0 };
    }
  },

  /**
   * Get campaign by ID
   */
  async getById(campaignId: string): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get campaign:', error);
      return null;
    }
  },

  /**
   * Create campaign
   */
  async create(tenantId: string, userId: string, campaign: Omit<Campaign, 'id' | 'tenant_id' | 'created_by' | 'created_at' | 'stats'>): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaign,
          tenant_id: tenantId,
          created_by: userId,
          stats: {
            total_leads: 0,
            messages_sent: 0,
            messages_delivered: 0,
            messages_read: 0,
            responses_received: 0,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create campaign:', error);
      return null;
    }
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  tenant: tenantService,
  user: userService,
  lead: leadService,
  campaign: campaignService,
};
