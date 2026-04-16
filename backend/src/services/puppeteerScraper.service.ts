# ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - SELF-HOSTED GOOGLE MAPS SCRAPER
// ============================================================================
// 100% Free and open-source Google Maps scraper using Puppeteer
// No third-party APIs required - runs entirely on your own infrastructure
// ============================================================================

import puppeteer, { Browser, Page, BrowserLaunchArgumentOptions } from 'puppeteer';
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
  useStealth?: boolean;       // enable stealth mode (default: true)
}

export interface GoogleMapsBusiness {
  placeId: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  category?: string;
  subcategory?: string;
  rating?: number;
  reviewsCount?: number;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  priceLevel?: number;
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
  cached: boolean;
  scrapingTime: number; // in milliseconds
}

export interface ScrapingOptions {
  useCache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  headless?: boolean;
  maxRetries?: number;
}

// ============================================================================
// PUPPETEER SCRAPER SERVICE
// ============================================================================

export class PuppeteerGoogleMapsScraper {
  private browser: Browser | null = null;
  private defaultOptions: ScrapingOptions;
  private isInitialized: boolean = false;

  constructor() {
    this.defaultOptions = {
      useCache: true,
      cacheTTL: 3600, // 1 hour
      timeout: 30000, // 30 seconds
      headless: true,
      maxRetries: 3,
    };
  }

  /**
   * Initialize Puppeteer browser with stealth mode
   */
  private async initializeBrowser(): Promise<void> {
    if (this.isInitialized && this.browser) {
      return;
    }

    try {
      logger.info('Initializing Puppeteer browser with stealth mode');

      // Puppeteer launch options
      const launchOptions: BrowserLaunchArgumentOptions = {
        headless: this.defaultOptions.headless ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ],
        timeout: this.defaultOptions.timeout,
      };

      this.browser = await puppeteer.launch(launchOptions);

      this.isInitialized = true;
      logger.info('Puppeteer browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Puppeteer browser:', error);
      throw new Error('Failed to initialize browser. Ensure Chrome/Chromium is installed.');
    }
  }

  /**
   * Close browser connection
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
      logger.info('Browser closed');
    }
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
    const startTime = Date.now();

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await cacheGet<ScrapingResult>(cacheKey);
        if (cached) {
          logger.info('Returning cached results for search', { params });
          return { ...cached, cached: true, scrapingTime: 0 };
        }
      }

      logger.info('Starting Google Maps scraping', { params, options: opts });

      // Initialize browser
      await this.initializeBrowser();

      if (!this.browser) {
        throw new Error('Browser initialization failed');
      }

      // Create new page
      const page = await this.browser.newPage();

      try {
        // Apply stealth techniques
        await this.applyStealthMode(page);

        // Navigate to Google Maps
        const searchUrl = this.buildSearchUrl(params);
        logger.debug('Navigating to Google Maps', { url: searchUrl });

        await page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: opts.timeout,
        });

        // Wait for results to load
        await this.waitForResults(page);

        // Extract business listings
        const businesses = await this.extractBusinesses(page, params);

        // Scroll and load more if needed
        if (params.maxResults && businesses.length < params.maxResults) {
          const moreBusinesses = await this.scrollAndLoadMore(page, params, businesses.length);
          businesses.push(...moreBusinesses);
        }

        // Trim to maxResults
        const finalBusinesses = params.maxResults
          ? businesses.slice(0, params.maxResults)
          : businesses;

        const scrapingTime = Date.now() - startTime;

        const result: ScrapingResult = {
          businesses: finalBusinesses,
          totalFound: finalBusinesses.length,
          searchLocation: params.location,
          searchQuery: params.query || 'all',
          hasMore: businesses.length > finalBusinesses.length,
          cached: false,
          scrapingTime,
        };

        // Cache the results
        if (opts.useCache && finalBusinesses.length > 0) {
          await cacheSet(cacheKey, result, opts.cacheTTL);
        }

        logger.info('Scraping completed successfully', {
          totalFound: result.totalFound,
          scrapingTime: `${scrapingTime}ms`,
          location: params.location,
          query: params.query,
        });

        return result;
      } finally {
        // Close page to free resources
        await page.close();
      }
    } catch (error) {
      logger.error('Google Maps scraping failed:', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Apply stealth mode techniques to avoid detection
   */
  private async applyStealthMode(page: Page): Promise<void> {
    // Hide webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    // Override plugins
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });

    // Override languages
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    // Add random delays to mimic human behavior
    await this.randomDelay(500, 1500);

    logger.debug('Stealth mode applied');
  }

  /**
   * Build Google Maps search URL
   */
  private buildSearchUrl(params: GoogleMapsSearchParams): string {
    const baseUrl = 'https://www.google.com/maps/search/';

    let query = params.query ? `${params.query} in ${params.location}` : params.location;

    // Add radius filter
    if (params.radius) {
      query += ` within ${Math.round(params.radius / 1609.34)} miles`; // Convert to miles
    }

    return `${baseUrl}${encodeURIComponent(query)}`;
  }

  /**
   * Wait for search results to load
   */
  private async waitForResults(page: Page): Promise<void> {
    try {
      // Wait for business listings to appear
      await page.waitForSelector('div[role="article"], a[href*="/maps/place/"]', {
        timeout: 10000,
      });

      // Additional wait for dynamic content
      await this.randomDelay(1000, 2000);

      logger.debug('Results loaded');
    } catch (error) {
      logger.error('Timeout waiting for results:', error);
      throw new Error('No results found. The location may be invalid.');
    }
  }

  /**
   * Extract business listings from the page
   */
  private async extractBusinesses(page: Page, params: GoogleMapsSearchParams): Promise<GoogleMapsBusiness[]> {
    try {
      const businesses = await page.evaluate((searchParams) => {
        const results: any[] = [];
        const minRating = searchParams.minRating || 0;

        // Find all business listings
        const listings = document.querySelectorAll('div[role="article"], div[aria-label*="Google Maps result"]');

        for (const listing of listings) {
          try {
            // Extract business name
            const nameEl = listing.querySelector('h3, a[aria-label], div[role="heading"] span');
            const name = nameEl?.textContent?.trim() ||
                        listing.querySelector('a[aria-label]')?.getAttribute('aria-label')?.trim();

            if (!name) continue;

            // Extract rating
            const ratingEl = listing.querySelector('span[aria-label*="stars"], span[aria-label*="rating"]');
            const ratingText = ratingEl?.getAttribute('aria-label') || '';
            const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

            // Skip if below minimum rating
            if (rating && minRating > 0 && rating < minRating) {
              continue;
            }

            // Extract address
            const addressEl = listing.querySelector('button[data-tooltip*="address"], div[role="heading"] ~ div');
            const address = addressEl?.textContent?.trim() || undefined;

            // Extract phone
            const phoneEl = listing.querySelector('button[data-tooltip*="phone"], a[href*="tel:"]');
            const phone = phoneEl?.getAttribute('href')?.replace('tel:', '') ||
                          phoneEl?.textContent?.trim() || undefined;

            // Extract website
            const websiteEl = listing.querySelector('a[data-tooltip*="website"], a[href*="http"]');
            const website = websiteEl?.getAttribute('href') || undefined;

            // Extract category
            const categoryEl = listing.querySelector('span[aria-label*=""], div[role="heading"] ~ span');
            const category = categoryEl?.textContent?.trim() || undefined;

            // Extract reviews count
            const reviewsEl = listing.querySelector('span[aria-label*="review"], span[role="button"]');
            const reviewsText = reviewsEl?.textContent?.trim() || '';
            const reviewsMatch = reviewsText.match(/(\d+)/);
            const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : undefined;

            // Extract place ID from link
            const linkEl = listing.querySelector('a[href*="/maps/place/"]');
            const href = linkEl?.getAttribute('href') || '';
            const placeIdMatch = href.match(/!1s(.+?)!/);
            const placeId = placeIdMatch ? placeIdMatch[1] : undefined;

            if (!placeId) continue;

            results.push({
              placeId,
              name,
              address,
              phone,
              website,
              category,
              rating,
              reviewsCount,
            });
          } catch (error) {
            console.error('Error extracting business:', error);
            continue;
          }
        }

        return results;
      }, params);

      logger.debug(`Extracted ${businesses.length} businesses from page`);
      return businesses;
    } catch (error) {
      logger.error('Failed to extract businesses:', error);
      return [];
    }
  }

  /**
   * Scroll and load more results
   */
  private async scrollAndLoadMore(
    page: Page,
    params: GoogleMapsSearchParams,
    currentCount: number
  ): Promise<GoogleMapsBusiness[]> {
    const moreBusinesses: GoogleMapsBusiness[] = [];
    const targetCount = params.maxResults || 20;
    const maxScrolls = 10; // Prevent infinite loops

    for (let i = 0; i < maxScrolls && moreBusinesses.length + currentCount < targetCount; i++) {
      try {
        // Scroll to bottom
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new content
        await this.randomDelay(1500, 2500);

        // Extract newly loaded businesses
        const newBusinesses = await this.extractBusinesses(page, params);

        // Add only new businesses
        for (const business of newBusinesses) {
          if (!moreBusinesses.find(b => b.placeId === business.placeId)) {
            moreBusinesses.push(business);
          }
        }

        // Check if there are more results
        const hasMore = await page.evaluate(() => {
          const loadMoreButton = document.querySelector('button[aria-label*="more"], button[aria-label*="next"]');
          return loadMoreButton !== null;
        });

        if (!hasMore) break;

        logger.debug(`Scroll ${i + 1}: Found ${newBusinesses.length} more businesses`);
      } catch (error) {
        logger.error('Error during scroll:', error);
        break;
      }
    }

    return moreBusinesses;
  }

  /**
   * Get detailed information for a specific business
   */
  async getBusinessDetails(placeId: string, options: ScrapingOptions = {}): Promise<GoogleMapsBusiness> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = `googlemaps:place:${placeId}`;

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await cacheGet<GoogleMapsBusiness>(cacheKey);
        if (cached) {
          logger.debug('Returning cached business details', { placeId });
          return cached;
        }
      }

      await this.initializeBrowser();
      if (!this.browser) throw new Error('Browser initialization failed');

      const page = await this.browser.newPage();

      try {
        await this.applyStealthMode(page);

        // Navigate to place page
        const placeUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
        await page.goto(placeUrl, {
          waitUntil: 'networkidle2',
          timeout: opts.timeout,
        });

        // Wait for details to load
        await this.randomDelay(1000, 2000);

        // Extract detailed information
        const business = await page.evaluate(() => {
          // Extract name
          const nameEl = document.querySelector('h1[role="heading"]');
          const name = nameEl?.textContent?.trim() || '';

          // Extract address
          const addressEl = document.querySelector('button[data-tooltip*="address"]');
          const address = addressEl?.getAttribute('aria-label')?.replace('Address: ', '') || undefined;

          // Extract phone
          const phoneEl = document.querySelector('button[data-tooltip*="phone"]');
          const phone = phoneEl?.getAttribute('aria-label')?.replace('Phone: ', '') || undefined;

          // Extract website
          const websiteEl = document.querySelector('a[data-tooltip*="website"]');
          const website = websiteEl?.getAttribute('href') || undefined;

          // Extract rating and reviews
          const ratingEl = document.querySelector('span[aria-label*="stars"]');
          const ratingText = ratingEl?.getAttribute('aria-label') || '';
          const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

          const reviewsEl = document.querySelector('span[role="button"]');
          const reviewsText = reviewsEl?.textContent?.trim() || '';
          const reviewsMatch = reviewsText.match(/(\d+)/);
          const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : undefined;

          // Extract opening hours
          const hoursSection = document.querySelector('section[aria-label*="hours"]');
          const hours: string[] = [];
          if (hoursSection) {
            const hourEls = hoursSection.querySelectorAll('tr');
            hourEls.forEach(el => {
              const day = el.querySelector('td:nth-child(1)')?.textContent?.trim();
              const time = el.querySelector('td:nth-child(2)')?.textContent?.trim();
              if (day && time) {
                hours.push(`${day}: ${time}`);
              }
            });
          }

          // Extract price level
          const priceEls = document.querySelectorAll('span[aria-label*="Price"], span[aria-label*="$$$"]');
          const priceLevel = priceEls.length;

          // Extract description
          const descEl = document.querySelector('div[role="feed"] > div > div');
          const description = descEl?.textContent?.trim() || undefined;

          return {
            placeId,
            name,
            address,
            phone,
            website,
            rating,
            reviewsCount,
            openingHours: hours,
            priceLevel,
            description,
          };
        });

        // Cache the results
        if (opts.useCache) {
          await cacheSet(cacheKey, business, opts.cacheTTL);
        }

        return business;
      } finally {
        await page.close();
      }
    } catch (error) {
      logger.error('Failed to get business details:', { placeId, error });
      throw error;
    }
  }

  /**
   * Extract email from website (if available)
   */
  async extractEmailFromWebsite(websiteUrl: string): Promise<string | undefined> {
    try {
      await this.initializeBrowser();
      if (!this.browser) throw new Error('Browser initialization failed');

      const page = await this.browser.newPage();

      try {
        await this.applyStealthMode(page);
        await page.goto(websiteUrl, { waitUntil: 'networkidle2', timeout: 15000 });

        const email = await page.evaluate(() => {
          // Common email patterns
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const bodyText = document.body.innerText;
          const matches = bodyText.match(emailRegex) || [];

          // Filter out common non-business emails
          const validEmails = matches.filter(email =>
            !email.includes('@example.') &&
            !email.includes('@test.') &&
            !email.includes('@wixpress.') &&
            !email.includes('@sentry.') &&
            !email.includes('.jpg') &&
            !email.includes('.png') &&
            !email.includes('.svg')
          );

          return validEmails[0];
        });

        await page.close();

        return email;
      } catch (error) {
        logger.error('Failed to extract email:', { websiteUrl, error });
        return undefined;
      }
    } catch (error) {
      logger.error('Failed to navigate to website:', { websiteUrl, error });
      return undefined;
    }
  }

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(params: GoogleMapsSearchParams): string {
    const parts = [
      'googlemaps',
      'search',
      params.location.toLowerCase().replace(/\s+/g, '-'),
      params.query?.toLowerCase().replace(/\s+/g, '-') || 'all',
      params.radius || 5000,
      params.minRating || 0,
    ];
    return parts.join(':');
  }

  /**
   * Random delay to mimic human behavior
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Health check for the scraper
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.initializeBrowser();
      return this.isInitialized;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.closeBrowser();
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const puppeteerScraper = new PuppeteerGoogleMapsScraper();

export default puppeteerScraper;
