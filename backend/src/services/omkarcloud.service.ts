// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - OMKARCLOUD SERVICE
// ============================================================================
// This service integrates with the omkarcloud Google Maps Scraper API.
// It handles business search, rate limiting, and data normalization.
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { cacheGet, cacheSet } from '../config/redis';
import { RateLimitError } from '../middleware/errorHandler';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GoogleMapsSearchParams {
  location: string;           // e.g., "San Francisco, CA"
  query?: string;             // e.g., "coffee shops", "restaurants"
  radius?: number;            // in meters, default 5000
  minRating?: number;         // minimum rating (1-5)
  maxResults?: number;        // max results to return, default 20
}

export interface GoogleMapsBusiness {
  placeId: string;            // Google Maps Place ID
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;             // scraped from website if available
  category?: string;
  subcategory?: string;
  rating?: number;
  reviewsCount?: number;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  priceLevel?: number;        // 1-4 ($ to $$$$)
  description?: string;
  photos?: string[];
  verified?: boolean;
}

export interface ScrapingResult {
  businesses: GoogleMapsBusiness[];
  totalFound: number;
  searchLocation: string;
  searchQuery: string;
  hasMore: boolean;
  nextPageToken?: string;
  cached: boolean;
}

export interface ScrapingOptions {
  useCache?: boolean;         // default: true
  cacheTTL?: number;          // cache time in seconds, default: 3600 (1 hour)
  delay?: number;             // delay between requests in ms, default: 1000
  maxRetries?: number;        // default: 3
  timeout?: number;           // request timeout in ms, default: 30000
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class OmkarCloudService {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey: string;
  private defaultOptions: ScrapingOptions;

  constructor() {
    this.baseURL = process.env.OMKARCLOUD_API_URL || 'https://omkarcloud.com/api';
    this.apiKey = process.env.OMKARCLOUD_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('OMKARCLOUD_API_KEY not set - scraping will not work');
    }

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'Fikerflow/1.0', // Identify your service
      },
    });

    this.defaultOptions = {
      useCache: true,
      cacheTTL: 3600, // 1 hour
      delay: 1000,    // 1 second between requests
      maxRetries: 3,
      timeout: 30000,
    };

    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for request/response logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Omkarcloud API request', {
          method: config.method,
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error('Omkarcloud request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Omkarcloud API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle rate limiting (429)
        if (error.response?.status === 429 && !originalRequest._retry) {
          logger.warn('Omkarcloud rate limit hit, implementing exponential backoff');

          const retryCount = originalRequest._retryCount || 0;
          if (retryCount < this.defaultOptions.maxRetries) {
            originalRequest._retry = true;
            originalRequest._retryCount = retryCount + 1;

            // Exponential backoff: 2^retryCount seconds
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);

            logger.info(`Retrying request after ${backoffDelay}ms (attempt ${retryCount + 1})`);

            await this.delay(backoffDelay);
            return this.client(originalRequest);
          }
        }

        logger.error('Omkarcloud API error:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Search for businesses on Google Maps
   */
  async searchBusinesses(
    params: GoogleMapsSearchParams,
    options: ScrapingOptions = {}
  ): Promise<ScrapingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.generateCacheKey(params);

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await cacheGet<ScrapingResult>(cacheKey);
        if (cached) {
          logger.info('Returning cached results for search', { params });
          return { ...cached, cached: true };
        }
      }

      logger.info('Starting Google Maps search', { params, options: opts });

      // Build API request parameters
      const apiParams = this.buildApiParams(params);

      // Make API request with retry logic
      const response = await this.makeRequest('/search', apiParams);

      // Transform response data
      const businesses = this.transformBusinesses(response.data.businesses || []);

      const result: ScrapingResult = {
        businesses,
        totalFound: response.data.totalFound || businesses.length,
        searchLocation: params.location,
        searchQuery: params.query || 'all',
        hasMore: response.data.hasMore || false,
        nextPageToken: response.data.nextPageToken,
        cached: false,
      };

      // Cache the results
      if (opts.useCache && businesses.length > 0) {
        await cacheSet(cacheKey, result, opts.cacheTTL);
      }

      logger.info('Search completed successfully', {
        totalFound: result.totalFound,
        location: params.location,
        query: params.query,
      });

      return result;
    } catch (error) {
      logger.error('Google Maps search failed:', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get detailed information for a specific business
   */
  async getBusinessDetails(placeId: string, options: ScrapingOptions = {}): Promise<GoogleMapsBusiness> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = `omkarcloud:place:${placeId}`;

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await cacheGet<GoogleMapsBusiness>(cacheKey);
        if (cached) {
          logger.debug('Returning cached business details', { placeId });
          return cached;
        }
      }

      logger.info('Fetching business details', { placeId });

      const response = await this.makeRequest('/place', { placeId });
      const business = this.transformBusiness(response.data);

      // Cache the results
      if (opts.useCache) {
        await cacheSet(cacheKey, business, opts.cacheTTL);
      }

      return business;
    } catch (error) {
      logger.error('Failed to fetch business details:', {
        placeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search with pagination (for getting more than maxResults)
   */
  async searchAllBusinesses(
    params: GoogleMapsSearchParams,
    options: ScrapingOptions = {}
  ): Promise<GoogleMapsBusiness[]> {
    const allBusinesses: GoogleMapsBusiness[] = [];
    let currentPage = 1;
    let hasMore = true;
    let nextPageToken: string | undefined;

    const maxPages = options.maxResults ? Math.ceil(options.maxResults / 20) : 5;
    const maxTotal = options.maxResults || 100;

    while (hasMore && currentPage <= maxPages && allBusinesses.length < maxTotal) {
      logger.info(`Fetching page ${currentPage} of results`);

      const result = await this.searchBusinesses(
        {
          ...params,
          page: currentPage,
          pageToken: nextPageToken,
        } as any,
        options
      );

      allBusinesses.push(...result.businesses);
      hasMore = result.hasMore;
      nextPageToken = result.nextPageToken;
      currentPage++;

      // Rate limiting delay between pages
      if (hasMore && allBusinesses.length < maxTotal) {
        await this.delay(options.delay || this.defaultOptions.delay);
      }
    }

    logger.info(`Completed paginated search`, {
      totalBusinesses: allBusinesses.length,
      pagesFetched: currentPage - 1,
    });

    return allBusinesses.slice(0, maxTotal);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Make API request with error handling
   */
  private async makeRequest(endpoint: string, params: any): Promise<any> {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // API returned an error response
        const { status, data } = error.response;

        switch (status) {
          case 401:
            throw new Error('Invalid omkarcloud API key');
          case 429:
            throw new RateLimitError('Rate limit exceeded. Please try again later.');
          case 500:
          case 502:
          case 503:
            throw new Error('omkarcloud service temporarily unavailable');
          default:
            throw new Error(data?.message || `API error: ${status}`);
        }
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('No response from omkarcloud API. Check your connection.');
      } else {
        // Something else happened
        throw error;
      }
    }
  }

  /**
   * Build API request parameters from search params
   */
  private buildApiParams(params: GoogleMapsSearchParams): any {
    const apiParams: any = {
      location: params.location,
      radius: params.radius || 5000,
      limit: params.maxResults || 20,
    };

    if (params.query) {
      apiParams.query = params.query;
    }

    if (params.minRating) {
      apiParams.minRating = params.minRating;
    }

    return apiParams;
  }

  /**
   * Transform raw API response to our format
   */
  private transformBusinesses(businesses: any[]): GoogleMapsBusiness[] {
    return businesses.map((business) => this.transformBusiness(business));
  }

  /**
   * Transform single business from API format to our format
   */
  private transformBusiness(business: any): GoogleMapsBusiness {
    return {
      placeId: business.place_id || business.placeId,
      name: business.name,
      address: business.address || business.formatted_address,
      phone: business.phone_number || business.phone,
      website: business.website,
      email: business.email, // If available
      category: business.types?.[0] || business.category,
      subcategory: business.types?.[1] || business.subcategory,
      rating: business.rating,
      reviewsCount: business.user_ratings_total || business.reviewsCount,
      latitude: business.geometry?.location?.lat || business.latitude,
      longitude: business.geometry?.location?.lng || business.longitude,
      openingHours: business.opening_hours?.weekday_text || business.openingHours,
      priceLevel: business.price_level,
      description: business.description,
      photos: business.photos?.map((p: any) => p.photo_reference) || [],
      verified: business.verified || false,
    };
  }

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(params: GoogleMapsSearchParams): string {
    const parts = [
      'omkarcloud',
      'search',
      params.location.toLowerCase().replace(/\s+/g, '-'),
      params.query?.toLowerCase().replace(/\s+/g, '-') || 'all',
      params.radius || 5000,
      params.minRating || 0,
    ];
    return parts.join(':');
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const omkarcloudService = new OmkarCloudService();

export default omkarcloudService;
