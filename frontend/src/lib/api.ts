// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - API CLIENT
// ============================================================================
// This is a centralized API client for communicating with the backend.
// It handles authentication, error handling, and request/response transformation.
// ============================================================================

// API base URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
  details?: any;
  stack?: string; // Only in development
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  status: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get the authentication token from localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Set the authentication token in localStorage
   */
  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  }

  /**
   * Remove the authentication token from localStorage
   */
  private removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
  }

  /**
   * Make an API request with proper error handling and token management
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const status = response.status;

      // Handle 401 Unauthorized - token expired or invalid
      if (status === 401) {
        this.removeToken();
        // Redirect to login (only on client side)
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return {
          error: {
            error: 'AuthenticationError',
            message: 'Authentication failed. Please log in again.',
          },
          status,
        };
      }

      // Handle 204 No Content (successful response with no body)
      if (status === 204) {
        return { status, data: undefined as T };
      }

      // Parse JSON response
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        return {
          error: data,
          status,
        };
      }

      // Successful response
      return {
        data: data as T,
        status,
      };
    } catch (error) {
      // Network errors or other exceptions
      console.error('API request failed:', error);
      return {
        error: {
          error: 'NetworkError',
          message: 'Failed to connect to the server. Please check your connection.',
        },
        status: 0,
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params
      ? `?${new URLSearchParams(params as any).toString()}`
      : '';
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Set authentication token (call after login)
   */
  setAuthToken(token: string): void {
    this.setToken(token);
  }

  /**
   * Clear authentication token (call after logout)
   */
  clearAuthToken(): void {
    this.removeToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// ============================================================================
// CREATE API CLIENT INSTANCE
// ============================================================================

export const api = new ApiClient(API_URL);

// ============================================================================
// API METHODS (organized by feature)
// ============================================================================

// Authentication API
export const authApi = {
  signup: (data: { email: string; password: string; fullName: string; tenantName?: string }) =>
    api.post('/api/v1/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    api.post('/api/v1/auth/login', data),

  logout: () =>
    api.post('/api/v1/auth/logout'),

  refreshToken: (token: string) =>
    api.post('/api/v1/auth/refresh', { token }),

  getMe: () =>
    api.get('/api/v1/auth/me'),
};

// Leads API
export const leadsApi = {
  list: (params: PaginationParams & { status?: string; category?: string; search?: string }) =>
    api.get('/api/v1/leads', params),

  get: (id: string) =>
    api.get(`/api/v1/leads/${id}`),

  import: (data: { location: string; category: string; keywords?: string }) =>
    api.post('/api/v1/leads/import', data),

  update: (id: string, data: any) =>
    api.patch(`/api/v1/leads/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/v1/leads/${id}`),
};

// Campaigns API
export const campaignsApi = {
  list: (params: PaginationParams & { status?: string; type?: string }) =>
    api.get('/api/v1/campaigns', params),

  get: (id: string) =>
    api.get(`/api/v1/campaigns/${id}`),

  create: (data: any) =>
    api.post('/api/v1/campaigns', data),

  launch: (id: string) =>
    api.post(`/api/v1/campaigns/${id}/launch`),

  update: (id: string, data: any) =>
    api.patch(`/api/v1/campaigns/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/v1/campaigns/${id}`),
};

// Messages API
export const messagesApi = {
  list: (params: PaginationParams & { campaignId?: string; status?: string }) =>
    api.get('/api/v1/messages', params),

  get: (id: string) =>
    api.get(`/api/v1/messages/${id}`),

  webhook: (data: any) =>
    api.post('/api/v1/messages/webhook', data),
};

// Analytics API
export const analyticsApi = {
  overview: () =>
    api.get('/api/v1/analytics/overview'),

  campaignStats: (id: string) =>
    api.get(`/api/v1/analytics/campaigns/${id}`),

  performance: (params: { startDate?: string; endDate?: string; groupBy?: string }) =>
    api.get('/api/v1/analytics/performance', params),
};

// Health API
export const healthApi = {
  check: () =>
    api.get('/health'),

  detailed: () =>
    api.get('/health/detailed'),

  ready: () =>
    api.get('/health/ready'),

  live: () =>
    api.get('/health/live'),
};

// ============================================================================
// EXPORTS
// ============================================================================

export default api;
