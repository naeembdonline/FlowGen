// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - PUPPETEER CLUSTER SCRAPER
// ============================================================================
// Production-ready scraper using puppeteer-cluster for:
// - Better memory management
// - Browser instance pooling
// - Concurrent scraping
// - Automatic resource cleanup
// - Improved stability and reliability
// ============================================================================

import { Cluster } from 'puppeteer-cluster';
import { Browser, Page, BrowserLaunchArgumentOptions } from 'puppeteer';
import { logger } from '../utils/logger';
import { cacheGet, cacheSet } from '../config/redis';
import { RateLimitError } from '../middleware/errorHandler';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GoogleMapsSearchParams {
  location: string;
  query?: string;
  radius?: number;
  minRating?: number;
  maxResults?: number;
  useStealth?: boolean;
  extractEmails?: boolean;
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
  scrapingTime: number;
  clusterInfo?: {
    workersAvailable: number;
    tasksPending: number;
    browsersLaunched: number;
  };
}

export interface ScrapingOptions {
  useCache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  maxConcurrency?: number;
  retries?: number;
}

// ============================================================================
// CLUSTER CONFIGURATION
// ============================================================================

interface ClusterConfig {
  maxConcurrency: number;           // Max concurrent browser instances
  minConcurrency: number;           // Min browser instances to keep alive
  workerCreationDelay: number;      // Delay between creating workers
  idleTimeout: number;              // Shutdown idle workers after this (ms)
  puppeteerOptions?: BrowserLaunchArgumentOptions;
  taskRetryDelay: number;          // Delay before retrying failed tasks
}

const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  maxConcurrency: 3,                // Max 3 concurrent browsers (adjust based on VPS)
  minConcurrency: 1,                // Keep 1 browser alive
  workerCreationDelay: 1000,        // 1 second delay between creating workers
  idleTimeout: 60000,               // Shutdown idle workers after 1 minute
  puppeteerOptions: {
    headless: 'new',                // Use new headless mode
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
  },
  taskRetryDelay: 2000,             // 2 second delay before retry
};

// ============================================================================
// PUPPETEER CLUSTER SCRAPER SERVICE
// ============================================================================

export class PuppeteerClusterScraper {
  private cluster: Cluster | null = null;
  private config: ClusterConfig;
  private isInitialized: boolean = false;
  private currentTasks: Map<string, Promise<ScrapingResult>> = new Map();

  constructor(config?: Partial<ClusterConfig>) {
    this.config = {
      ...DEFAULT_CLUSTER_CONFIG,
      ...config,
    };
  }

  /**
   * Initialize the Puppeteer cluster
   */
  private async initializeCluster(): Promise<void> {
    if (this.isInitialized && this.cluster) {
      return;
    }

    try {
      logger.info('Initializing Puppeteer cluster', {
        maxConcurrency: this.config.maxConcurrency,
        minConcurrency: this.config.minConcurrency,
      });

      this.cluster = await Cluster.launch({
        puppeteer: this.config.puppeteerOptions,
        maxConcurrency: this.config.maxConcurrency,
        minConcurrency: this.config.minConcurrency,
        workerCreationDelay: this.config.workerCreationDelay,
        idleTimeout: this.config.idleTimeout,
        puppeteerOptions: {
          ...this.config.puppeteerOptions,
          timeout: this.config.idleTimeout,
        },
      });

      // Set up cluster event listeners
      this.setupClusterEvents();

      this.isInitialized = true;

      logger.info('Puppeteer cluster initialized successfully', {
        workersAvailable: this.cluster.workers().length,
      });
    } catch (error) {
      logger.error('Failed to initialize Puppeteer cluster:', error);
      throw new Error('Failed to initialize scraper cluster. Ensure Puppeteer is installed.');
    }
  }

  /**
   * Set up cluster event listeners for monitoring
   */
  private setupClusterEvents(): void {
    if (!this.cluster) return;

    // Task created event
    this.cluster.on('taskcreated', (job) => {
      logger.debug('Scraping task created', {
        taskId: job.jobId,
        targetUrl: job.targetUrl,
      });
    });

    // Task failed event
    this.cluster.on('taskfailed', (job, error) => {
      logger.error('Scraping task failed', {
        taskId: job.jobId,
        targetUrl: job.targetUrl,
        error: error.message,
      });
    });

    // Task completed event
    this.cluster.on('taskcompleted', (job) => {
      logger.debug('Scraping task completed', {
        taskId: job.jobId,
        targetUrl: job.targetUrl,
      });
    });

    // Worker event
    this.cluster.on('workererror', (worker, error) => {
      logger.error('Worker error', {
        workerId: worker.id,
        error: error.message,
      });
    });
  }

  /**
   * Search for businesses on Google Maps using cluster
   */
  async searchBusinesses(
    params: GoogleMapsSearchParams,
    options: ScrapingOptions = {}
  ): Promise<ScrapingResult> {
    const opts = {
      useCache: true,
      cacheTTL: 3600, // 1 hour
      timeout: 60000, // 60 seconds
      maxConcurrency: this.config.maxConcurrency,
      retries: 2,
      ...options,
    };

    const cacheKey = this.generateCacheKey(params);
    const startTime = Date.now();

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await cacheGet<ScrapingResult>(cacheKey);
        if (cached) {
          logger.info('Returning cached cluster results', { params });
          return { ...cached, cached: true, scrapingTime: 0 };
        }
      }

      // Ensure cluster is initialized
      await this.initializeCluster();

      if (!this.cluster) {
        throw new Error('Cluster initialization failed');
      }

      logger.info('Starting cluster-based Google Maps scraping', {
        params,
        options: opts,
      });

      // Create scraping task
      const taskData = {
        ...params,
        extractEmails: params.extractEmails || false,
        maxResults: params.maxResults || 20,
        options: opts,
      };

      // Add task to cluster
      const jobId = await this.cluster.executeTask(async (page) => {
        return await this.executeScraping(page, taskData);
      });

      // Wait for task to complete
      const scrapingResult = await jobId;

      const scrapingTime = Date.now() - startTime;

      const result: ScrapingResult = {
        ...scrapingResult,
        scrapingTime,
        cached: false,
        clusterInfo: {
          workersAvailable: this.cluster.workers().length,
          tasksPending: 0,
          browsersLaunched: 0,
        },
      };

      // Cache the results
      if (opts.useCache && result.businesses.length > 0) {
        await cacheSet(cacheKey, result, opts.cacheTTL);
      }

      logger.info('Cluster scraping completed successfully', {
        totalFound: result.totalFound,
        scrapingTime: `${scrapingTime}ms`,
        clusterInfo: result.clusterInfo,
      });

      return result;
    } catch (error) {
      logger.error('Cluster scraping failed:', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Execute scraping on a specific page
   */
  private async executeScraping(
    page: Page,
    taskData: any
  ): Promise<ScrapingResult> {
    const { params, extractEmails, maxResults, options } = taskData;
    const startTime = Date.now();

    try {
      // Apply stealth techniques
      await this.applyStealthMode(page);

      // Navigate to Google Maps
      const searchUrl = this.buildSearchUrl(params);
      logger.debug('Navigating to Google Maps (cluster worker)', { url: searchUrl });

      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: options?.timeout || 60000,
      });

      // Wait for results to load
      await this.waitForResults(page);

      // Extract business listings
      let businesses = await this.extractBusinesses(page, params);

      // Scroll and load more if needed
      if (maxResults && businesses.length < maxResults) {
        const moreBusinesses = await this.scrollAndLoadMore(page, params, businesses.length);
        businesses.push(...moreBusinesses);
      }

      // Trim to maxResults
      businesses = maxResults ? businesses.slice(0, maxResults) : businesses;

      // Extract emails if requested
      if (extractEmails && businesses.length > 0) {
        logger.debug('Extracting emails from websites', { count: businesses.length });

        for (const business of businesses) {
          if (business.website && !business.email) {
            try {
              const email = await this.extractEmailFromPage(page, business.website);
              if (email) {
                business.email = email;
                logger.debug(`Extracted email for ${business.name}: ${email}`);
              }
            } catch (error) {
              logger.warn(`Failed to extract email from ${business.website}:`, error);
            }
          }
        }
      }

      const scrapingTime = Date.now() - startTime;

      return {
        businesses,
        totalFound: businesses.length,
        searchLocation: params.location,
        searchQuery: params.query || 'all',
        hasMore: businesses.length < (params.maxResults || 20),
        cached: false,
        scrapingTime,
      };
    } catch (error) {
      logger.error('Page scraping failed:', {
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

    // Add random delay to mimic human behavior
    await this.randomDelay(500, 1500);

    logger.debug('Stealth mode applied (cluster worker)');
  }

  /**
   * Build Google Maps search URL
   */
  private buildSearchUrl(params: GoogleMapsSearchParams): string {
    const baseUrl = 'https://www.google.com/maps/search/';
    let query = params.query ? `${params.query} in ${params.location}` : params.location;

    if (params.radius) {
      query += ` within ${Math.round(params.radius / 1609.34)} miles`;
    }

    return `${baseUrl}${encodeURIComponent(query)}`;
  }

  /**
   * Wait for search results to load
   */
  private async waitForResults(page: Page): Promise<void> {
    try {
      await page.waitForSelector('div[role="article"], a[href*="/maps/place/"]', {
        timeout: 10000,
      });
      await this.randomDelay(1000, 2000);
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

        const listings = document.querySelectorAll('div[role="article"], div[aria-label*="Google Maps result"]');

        for (const listing of listings) {
          try {
            const nameEl = listing.querySelector('h3, a[aria-label], div[role="heading"] span');
            const name = nameEl?.textContent?.trim() ||
                        listing.querySelector('a[aria-label]')?.getAttribute('aria-label')?.trim();

            if (!name) continue;

            const ratingEl = listing.querySelector('span[aria-label*="stars"], span[aria-label*="rating"]');
            const ratingText = ratingEl?.getAttribute('aria-label') || '';
            const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

            if (rating && minRating > 0 && rating < minRating) {
              continue;
            }

            const addressEl = listing.querySelector('button[data-tooltip*="address"], div[role="heading"] ~ div');
            const address = addressEl?.textContent?.trim() || undefined;

            const phoneEl = listing.querySelector('button[data-tooltip*="phone"], a[href*="tel:"]');
            const phone = phoneEl?.getAttribute('href')?.replace('tel:', '') ||
                          phoneEl?.textContent?.trim() || undefined;

            const websiteEl = listing.querySelector('a[data-tooltip*="website"], a[href*="http"]');
            const website = websiteEl?.getAttribute('href') || undefined;

            const categoryEl = listing.querySelector('span[aria-label*=""], div[role="heading"] ~ span');
            const category = categoryEl?.textContent?.trim() || undefined;

            const reviewsEl = listing.querySelector('span[aria-label*="review"], span[role="button"]');
            const reviewsText = reviewsEl?.textContent?.trim() || '';
            const reviewsMatch = reviewsText.match(/(\d+)/);
            const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : undefined;

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

      logger.debug(`Extracted ${businesses.length} businesses from page (cluster worker)`);
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
    const maxScrolls = 10;

    for (let i = 0; i < maxScrolls && moreBusinesses.length + currentCount < targetCount; i++) {
      try {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.randomDelay(1500, 2500);

        const newBusinesses = await this.extractBusinesses(page, params);

        for (const business of newBusinesses) {
          if (!moreBusinesses.find(b => b.placeId === business.placeId)) {
            moreBusinesses.push(business);
          }
        }

        const hasMore = await page.evaluate(() => {
          const loadMoreButton = document.querySelector('button[aria-label*="more"], button[aria-label*="next"]');
          return loadMoreButton !== null;
        });

        if (!hasMore) break;

        logger.debug(`Scroll ${i + 1}: Found ${newBusinesses.length} more businesses (cluster worker)`);
      } catch (error) {
        logger.error('Error during scroll:', error);
        break;
      }
    }

    return moreBusinesses;
  }

  /**
   * Extract email from website (cluster version)
   */
  private async extractEmailFromPage(page: Page, websiteUrl: string): Promise<string | undefined> {
    try {
      await page.goto(websiteUrl, { waitUntil: 'networkidle2', timeout: 15000 });

      const email = await page.evaluate(() => {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const bodyText = document.body.innerText;
        const matches = bodyText.match(emailRegex) || [];

        const validEmails = matches.filter(email =>
          !email.includes('@example.') &&
          !email.includes('@test.') &&
          !email.includes('@wixpress.') &&
          !email.includes('@sentry.') &&
          !email.includes('.jpg') &&
          !email.includes('.png')
        );

        return validEmails[0];
      });

      return email;
    } catch (error) {
      logger.error('Failed to extract email:', { websiteUrl, error });
      return undefined;
    }
  }

  /**
   * Get detailed information for a specific business
   */
  async getBusinessDetails(placeId: string, options: ScrapingOptions = {}): Promise<GoogleMapsBusiness> {
    const opts = { useCache: true, cacheTTL: 3600, timeout: 45000, ...options };
    const cacheKey = `googlemaps:place:${placeId}`;

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await cacheGet<GoogleMapsBusiness>(cacheKey);
        if (cached) {
          logger.debug('Returning cached business details (cluster)', { placeId });
          return cached;
        }
      }

      await this.initializeCluster();
      if (!this.cluster) throw new Error('Cluster initialization failed');

      // Create task for getting business details
      const jobId = await this.cluster.executeTask(async (page) => {
        await this.applyStealthMode(page);

        const placeUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
        await page.goto(placeUrl, {
          waitUntil: 'networkidle2',
          timeout: opts.timeout || 45000,
        });

        await this.randomDelay(1000, 2000);

        // Extract detailed information
        const business = await page.evaluate(() => {
          const nameEl = document.querySelector('h1[role="heading"]');
          const name = nameEl?.textContent?.trim() || '';

          const addressEl = document.querySelector('button[data-tooltip*="address"]');
          const address = addressEl?.getAttribute('aria-label')?.replace('Address: ', '') || undefined;

          const phoneEl = document.querySelector('button[data-tooltip*="phone"]');
          const phone = phoneEl?.getAttribute('aria-label')?.replace('Phone: ', '') || undefined;

          const websiteEl = document.querySelector('a[data-tooltip*="website"]');
          const website = websiteEl?.getAttribute('href') || undefined;

          const ratingEl = document.querySelector('span[aria-label*="stars"]');
          const ratingText = ratingEl?.getAttribute('aria-label') || '';
          const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

          const reviewsEl = document.querySelector('span[role="button"]');
          const reviewsText = reviewsEl?.textContent?.trim() || '';
          const reviewsMatch = reviewsText.match(/(\d+)/);
          const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : undefined;

          return {
            placeId,
            name,
            address,
            phone,
            website,
            rating,
            reviewsCount,
          };
        });

        return { ...business, placeId };
      });

      const result = await jobId;

      // Cache the results
      if (opts.useCache) {
        await cacheSet(cacheKey, result, opts.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Failed to get business details (cluster):', { placeId, error });
      throw error;
    }
  }

  /**
   * Extract email from website
   */
  async extractEmailFromWebsite(websiteUrl: string): Promise<string | undefined> {
    try {
      await this.initializeCluster();
      if (!this.cluster) throw new Error('Cluster initialization failed');

      const jobId = await this.cluster.executeTask(async (page) => {
        return await this.extractEmailFromPage(page, websiteUrl);
      });

      const result = await jobId;
      return result.email;
    } catch (error) {
      logger.error('Failed to extract email from website:', { websiteUrl, error });
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
   * Get cluster statistics
   */
  getClusterStats(): {
    workersAvailable: number;
    tasksPending: number;
    browsersLaunched: number;
  } {
    if (!this.cluster) {
      return {
        workersAvailable: 0,
        tasksPending: 0,
        browsersLaunched: 0,
      };
    }

    const workers = this.cluster.workers();
    const tasks = this.cluster.tasks().filter(t => t.pending());

    return {
      workersAvailable: workers.length,
      tasksPending: tasks.length,
      browsersLaunched: workers.length,
    };
  }

  /**
   * Health check for the scraper
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    clusterStats: ReturnType<typeof this.getClusterStats>;
  }> {
    try {
      await this.initializeCluster();

      const clusterStats = this.getClusterStats();

      return {
        healthy: this.isInitialized,
        clusterStats,
      };
    } catch {
      return {
        healthy: false,
        clusterStats: {
          workersAvailable: 0,
          tasksPending: 0,
          browsersLaunched: 0,
        },
      };
    }
  }

  /**
   * Cleanup cluster resources
   */
  async cleanup(): Promise<void> {
    if (this.cluster) {
      try {
        await this.cluster.idle();
        logger.info('Cluster idled successfully');
      } catch (error) {
        logger.error('Error idling cluster:', error);
      }

      try {
        await this.cluster.close();
        logger.info('Cluster closed successfully');
      } catch (error) {
        logger.error('Error closing cluster:', error);
      }

      this.cluster = null;
      this.isInitialized = false;
    }
  }

  /**
   * Restart cluster (useful for recovery)
   */
  async restart(): Promise<void> {
    logger.info('Restarting Puppeteer cluster...');

    await this.cleanup();
    await this.initializeCluster();

    logger.info('Cluster restarted successfully');
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

const clusterConfig: ClusterConfig = {
  maxConcurrency: parseInt(process.env.PUPPETEER_MAX_CONCURRENCY || '3'),
  minConcurrency: parseInt(process.env.PUPEER_MIN_CONCURRENCY || '1'),
  workerCreationDelay: parseInt(process.env.PUPPETEER_WORKER_DELAY || '1000'),
  idleTimeout: parseInt(process.env.PUPPETEER_IDLE_TIMEOUT || '60000'),
  puppeteerOptions: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
  },
  taskRetryDelay: 2000,
};

export const puppeteerClusterScraper = new PuppeteerClusterScraper(clusterConfig);

export default puppeteerClusterScraper;
