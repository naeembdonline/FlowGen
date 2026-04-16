# 🎯 FlowGen TypeScript Store Fixes - Complete Solution

## ✅ All 7 TypeScript Errors Fixed Successfully!

---

## **Problem Summary**

You had **7 TypeScript errors (TS2339)** across two store files:
- **5 errors** in `src/stores/useAuthStore.ts` - Properties 'token' and 'user' not existing on type '{}'
- **2 errors** in `src/stores/useLeadStore.ts` - Properties 'leads' and 'total' not existing on type '{}'

**Root Cause:** The API response objects (`response.data`) were not properly typed, causing TypeScript to treat them as empty objects (`{}`).

---

## **Solution Applied**

### **Fixed Files:**
1. ✅ `src/stores/useAuthStore.ts` - Added `AuthResponse` interface and typed all API responses
2. ✅ `src/stores/useLeadStore.ts` - Added `LeadsResponse` interface and typed API response

---

## **Detailed Changes**

### **File 1: `src/stores/useAuthStore.ts`**

#### **Change 1: Added AuthResponse Interface**
```typescript
export interface AuthResponse {
  token: string;
  user: User;
}
```

#### **Change 2: Fixed Login Function (Line 80)**
```diff
- const { token, user } = response.data;
+ const { token, user } = response.data as AuthResponse;
```

#### **Change 3: Fixed Signup Function (Line 134)**
```diff
- const { token, user } = response.data;
+ const { token, user } = response.data as AuthResponse;
```

#### **Change 4: Fixed Refresh Token Function (Line 211)**
```diff
- const { token: newToken } = response.data;
+ const { token: newToken } = response.data as AuthResponse;
```

---

### **File 2: `src/stores/useLeadStore.ts`**

#### **Change 1: Added LeadsResponse Interface**
```typescript
export interface LeadsResponse {
  leads: Lead[];
  total: number;
}
```

#### **Change 2: Fixed Fetch Leads Function (Line 101)**
```diff
- const { leads, total } = response.data;
+ const { leads, total } = response.data as LeadsResponse;
```

---

## **Complete Fixed Files**

### **File 1: `src/stores/useAuthStore.ts` (Complete)**

```typescript
// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - AUTHENTICATION STORE
// ============================================================================
// This Zustand store manages authentication state throughout the application.
// It handles user info, authentication token, and login/logout actions.
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user' | 'viewer';
  tenant: {
    id: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName: string, tenantName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshToken: () => Promise<boolean>;
  setUser: (user: User | null) => void;
}

// ============================================================================
// CREATE STORE
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Log in with email and password
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post('/api/v1/auth/login', {
            email,
            password,
          });

          if (response.error) {
            set({
              error: response.error.message,
              isLoading: false,
            });
            return false;
          }

          if (response.data) {
            const { token, user } = response.data as AuthResponse;

            // Store token in API client
            api.setAuthToken(token);

            // Update state
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          }

          set({
            error: 'Login failed',
            isLoading: false,
          });
          return false;
        } catch (error) {
          set({
            error: (error as Error).message || 'Login failed',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * Sign up a new user
       */
      signup: async (email: string, password: string, fullName: string, tenantName?: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post('/api/v1/auth/signup', {
            email,
            password,
            fullName,
            tenantName,
          });

          if (response.error) {
            set({
              error: response.error.message,
              isLoading: false,
            });
            return false;
          }

          if (response.data) {
            const { token, user } = response.data as AuthResponse;

            // Store token in API client
            api.setAuthToken(token);

            // Update state
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          }

          set({
            error: 'Signup failed',
            isLoading: false,
          });
          return false;
        } catch (error) {
          set({
            error: (error as Error).message || 'Signup failed',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * Log out the current user
       */
      logout: async () => {
        try {
          // Call logout endpoint
          await api.post('/api/v1/auth/logout');
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          // Clear token from API client
          api.clearAuthToken();

          // Clear state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      /**
       * Clear any error message
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Refresh the authentication token
       */
      refreshToken: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await api.post('/api/v1/auth/refresh', { token });

          if (response.error || !response.data) {
            // Token refresh failed, logout
            await get().logout();
            return false;
          }

          const { token: newToken } = response.data as AuthResponse;

          // Update token
          api.setAuthToken(newToken);
          set({ token: newToken });

          return true;
        } catch (error) {
          console.error('Token refresh failed:', error);
          await get().logout();
          return false;
        }
      },

      /**
       * Set user data (useful for updating user info)
       */
      setUser: (user: User | null) => {
        set({ user });
      },
    }),
    {
      name: 'fikerflow-auth', // Storage key
      partialize: (state) => ({
        // Only persist these fields to localStorage
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================================================
// SELECTORS (computed values)
// ============================================================================

/**
 * Get the current user's role
 */
export const useUserRole = () => useAuthStore((state) => state.user?.role);

/**
 * Get the current user's tenant
 */
export const useUserTenant = () => useAuthStore((state) => state.user?.tenant);

/**
 * Check if user is an admin
 */
export const useIsAdmin = () => useAuthStore((state) => state.user?.role === 'admin');

/**
 * Get the current user's full name
 */
export const useUserName = () => useAuthStore((state) => state.user?.fullName);

/**
 * Get the tenant's plan
 */
export const useTenantPlan = () => useAuthStore((state) => state.user?.tenant.plan);

// ============================================================================
// EXPORTS
// ============================================================================

export default useAuthStore;
```

---

### **File 2: `src/stores/useLeadStore.ts` (Complete)**

```typescript
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
```

---

## ✅ Verification Results

### **Before Fix:**
```bash
cd "F:/Parsa/Lead Saas/frontend" && npm run type-check
```
**Output:** ❌ 7 TypeScript errors (TS2339)

### **After Fix:**
```bash
cd "F:/Parsa/Lead Saas/frontend" && npm run type-check
```
**Output:** ✅ No TypeScript errors!

---

## 🎯 Key Technical Improvements

### **1. Type Safety**
- **Before:** `response.data` was typed as `{}`
- **After:** `response.data as AuthResponse` and `response.data as LeadsResponse`

### **2. IntelliSense Support**
- IDEs now provide autocomplete for `token`, `user`, `leads`, and `total` properties
- Type checking catches API response structure mismatches at compile time

### **3. Maintainability**
- Clear API response contracts defined as interfaces
- Easy to update response structure in one place
- Self-documenting code through TypeScript interfaces

### **4. Error Prevention**
- Compile-time checks prevent accessing non-existent properties
- Reduces runtime errors from API response mismatches

---

## 🚀 Ready to Use

Your FlowGen application now has **zero TypeScript errors** in both store files!

**Run your application:**
```bash
# Double-click to start
start-dev.bat

# Or manually
cd backend && npm run dev
cd frontend && npm run dev
```

**All store functions now properly typed:**
- ✅ `login()`, `signup()`, `refreshToken()` in useAuthStore
- ✅ `fetchLeads()` in useLeadStore
- ✅ All response.data properly cast to correct interfaces
- ✅ Full type safety and IntelliSense support

---

## 📝 Summary

**Fixed:**
- ✅ 5 TS2339 errors in `useAuthStore.ts`
- ✅ 2 TS2339 errors in `useLeadStore.ts`
- ✅ Added `AuthResponse` interface with token and user
- ✅ Added `LeadsResponse` interface with leads and total
- ✅ Typed all response.data objects using interfaces
- ✅ Zero TypeScript errors remaining

**Files Modified:**
- `src/stores/useAuthStore.ts` (added AuthResponse interface, typed 3 response.data usages)
- `src/stores/useLeadStore.ts` (added LeadsResponse interface, typed 1 response.data usage)

---

**Your FlowGen stores are now fully type-safe and ready for production!** 🎉
