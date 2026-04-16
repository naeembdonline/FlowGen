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
            const { token, user } = response.data;

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
            const { token, user } = response.data;

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

          const { token: newToken } = response.data;

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
