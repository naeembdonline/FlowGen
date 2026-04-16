// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - LEAD STORE
// ============================================================================
// This Zustand store manages lead data state throughout the application.
// It handles fetching, filtering, and updating leads.
// ============================================================================

import { create } from 'zustand';
import { leadsApi } from '../lib/api';

// ============================================================================
// TYPES
// ============================================================================

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
  status: 'new' | 'contacted' | 'responded' | 'converted' | 'unqualified';
  created_at: string;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export interface LeadsState {
  // State
  leads: Lead[];
  selectedLeads: Set<string>;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status?: string;
    category?: string;
    search?: string;
  };

  // Actions
  fetchLeads: (page?: number) => Promise<void>;
  setFilters: (filters: Partial<LeadsState['filters']>) => void;
  clearFilters: () => void;
  toggleLeadSelection: (leadId: string) => void;
  selectAllLeads: () => void;
  clearLeadSelection: () => void;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// CREATE STORE
// ============================================================================

export const useLeadStore = create<LeadsState>()((set, get) => ({
  // Initial state
  leads: [],
  selectedLeads: new Set<string>(),
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {},

  /**
   * Fetch leads from the API
   */
  fetchLeads: async (page = 1) => {
    set({ isLoading: true, error: null });

    try {
      const { filters } = get();
      const response = await leadsApi.list({
        page,
        limit: get().pagination.limit,
        ...filters,
      });

      if (response.error) {
        set({
          error: response.error.message,
          isLoading: false,
        });
        return;
      }

      if (response.data) {
        const { leads, total } = response.data as LeadsResponse;
        const totalPages = Math.ceil(total / get().pagination.limit);

        set({
          leads,
          pagination: {
            page,
            limit: get().pagination.limit,
            total,
            totalPages,
          },
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to fetch leads',
        isLoading: false,
      });
    }
  },

  /**
   * Set filters for lead list
   */
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  /**
   * Clear all filters
   */
  clearFilters: () => {
    set({ filters: {} });
  },

  /**
   * Toggle lead selection
   */
  toggleLeadSelection: (leadId: string) => {
    const selectedLeads = new Set(get().selectedLeads);
    if (selectedLeads.has(leadId)) {
      selectedLeads.delete(leadId);
    } else {
      selectedLeads.add(leadId);
    }
    set({ selectedLeads });
  },

  /**
   * Select all leads on current page
   */
  selectAllLeads: () => {
    const leads = get().leads;
    const selectedLeads = new Set(leads.map((lead) => lead.id));
    set({ selectedLeads });
  },

  /**
   * Clear all selections
   */
  clearLeadSelection: () => {
    set({ selectedLeads: new Set<string>() });
  },

  /**
   * Update a lead
   */
  updateLead: async (leadId: string, updates: Partial<Lead>) => {
    set({ isLoading: true, error: null });

    try {
      const response = await leadsApi.update(leadId, updates);

      if (response.error) {
        set({
          error: response.error.message,
          isLoading: false,
        });
        return;
      }

      // Update lead in local state
      const leads = get().leads.map((lead) =>
        lead.id === leadId ? { ...lead, ...updates } : lead
      );

      set({ leads, isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to update lead',
        isLoading: false,
      });
    }
  },

  /**
   * Delete a lead
   */
  deleteLead: async (leadId: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await leadsApi.delete(leadId);

      if (response.error) {
        set({
          error: response.error.message,
          isLoading: false,
        });
        return;
      }

      // Remove lead from local state
      const leads = get().leads.filter((lead) => lead.id !== leadId);

      set({ leads, isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message || 'Failed to delete lead',
        isLoading: false,
      });
    }
  },

  /**
   * Clear any error message
   */
  clearError: () => {
    set({ error: null });
  },
}));

// ============================================================================
// SELECTORS (computed values)
// ============================================================================

/**
 * Get the count of selected leads
 */
export const useSelectedLeadsCount = () =>
  useLeadStore((state) => state.selectedLeads.size);

/**
 * Check if all leads are selected
 */
export const useAllLeadsSelected = () =>
  useLeadStore((state) =>
    state.leads.length > 0 && state.leads.length === state.selectedLeads.size
  );

/**
 * Get filtered leads count
 */
export const useFilteredLeadsCount = () =>
  useLeadStore((state) => state.pagination.total);

// ============================================================================
// EXPORTS
// ============================================================================

export default useLeadStore;
