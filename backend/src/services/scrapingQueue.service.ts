// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - SCRAPING QUEUE SERVICE
// ============================================================================
// BullMQ-based queue service for processing large lead scraping requests
// in batches to prevent VPS crashes and provide progress tracking
// ============================================================================

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redisClient } from '../config/redis';
import { puppeteerClusterScraper, GoogleMapsSearchParams } from './puppeteerClusterScraper.service';
import { leadService } from './supabase.service';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ScrapingJobData {
  tenantId: string;
  location: string;
  query?: string;
  radius?: number;
  minRating?: number;
  maxResults?: number;
  extractEmails?: boolean;
  batchSize?: number;
  userId?: string;
}

export interface ScrapingJobResult {
  success: boolean;
  totalProcessed: number;
  totalImported: number;
  totalDuplicates: number;
  totalErrors: number;
  batches: Array<{
    batchNumber: number;
    processed: number;
    imported: number;
    duplicates: number;
    errors: number;
    scrapingTime: number;
  }>;
  leads: any[];
  errors: Array<{
    batchNumber: number;
    error: string;
    timestamp: Date;
  }>;
}

export interface BatchProcessorConfig {
  batchSize: number;           // Number of results per batch (default: 20)
  maxConcurrentBatches: number; // Max batches processing at once (default: 2)
  retryAttempts: number;        // Number of retries for failed batches (default: 3)
  retryDelay: number;           // Delay between retries in ms (default: 5000)
  batchDelay: number;           // Delay between batches in ms (default: 2000)
}

export interface QueueProgress {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;             // 0-100
  currentBatch: number;
  totalBatches: number;
  processedLeads: number;
  totalLeads: number;
  importedLeads: number;
  duplicateLeads: number;
  errorCount: number;
  currentBatchStatus: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// ============================================================================
// SCRAPING QUEUE SERVICE
// ============================================================================

class ScrapingQueueService extends EventEmitter {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private queueEvents: QueueEvents | null = null;
  private jobProgress: Map<string, QueueProgress> = new Map();
  private config: BatchProcessorConfig;

  constructor(config?: Partial<BatchProcessorConfig>) {
    super();
    this.config = {
      batchSize: config?.batchSize || 20,
      maxConcurrentBatches: config?.maxConcurrentBatches || 2,
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 5000,
      batchDelay: config?.batchDelay || 2000,
    };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async initialize(): Promise<void> {
    try {
      // Create queue
      this.queue = new Queue('scraping-queue', {
        connection: redisClient,
        defaultJobOptions: {
          attempts: this.config.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: this.config.retryDelay,
          },
          removeOnComplete: false, // Keep completed jobs for progress tracking
          removeOnFail: false,     // Keep failed jobs for debugging
        },
      });

      // Create queue events listener
      this.queueEvents = new QueueEvents('scraping-queue', {
        connection: redisClient,
      });

      this.setupQueueEvents();

      // Create worker
      this.worker = new Worker(
        'scraping-queue',
        this.processJob.bind(this),
        {
          connection: redisClient,
          concurrency: this.config.maxConcurrentBatches,
          limiter: {
            max: 1, // 1 job per batchDelay interval
            duration: this.config.batchDelay,
          },
        }
      );

      this.setupWorkerEvents();

      logger.info('Scraping queue service initialized', {
        config: this.config,
      });
    } catch (error) {
      logger.error('Failed to initialize scraping queue service:', error);
      throw error;
    }
  }

  // ==========================================================================
  // QUEUE EVENTS
  // ==========================================================================

  private setupQueueEvents(): void {
    if (!this.queueEvents) return;

    this.queueEvents.on('waiting', ({ jobId }) => {
      this.updateJobProgress(jobId, { status: 'waiting' });
    });

    this.queueEvents.on('active', ({ jobId }) => {
      this.updateJobProgress(jobId, { status: 'active' });
    });

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      this.updateJobProgress(jobId, {
        status: 'completed',
        completedAt: new Date(),
      });
      this.emit('job-completed', { jobId, result: returnvalue });
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.updateJobProgress(jobId, {
        status: 'failed',
        error: failedReason,
        completedAt: new Date(),
      });
      this.emit('job-failed', { jobId, error: failedReason });
    });

    this.queueEvents.on('delayed', ({ jobId, delay }) => {
      this.updateJobProgress(jobId, { status: 'delayed' });
    });
  }

  private setupWorkerEvents(): void {
    if (!this.worker) return;

    this.worker.on('completed', (job: Job, result: ScrapingJobResult) => {
      logger.info('Job completed', {
        jobId: job.id,
        result: {
          totalProcessed: result.totalProcessed,
          totalImported: result.totalImported,
          totalErrors: result.totalErrors,
        },
      });
    });

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      logger.error('Job failed', {
        jobId: job?.id,
        error: error.message,
      });
    });

    this.worker.on('progress', (job: Job, progress: number) => {
      logger.debug('Job progress', {
        jobId: job.id,
        progress,
      });
    });
  }

  // ==========================================================================
  // JOB MANAGEMENT
  // ==========================================================================

  /**
   * Add a new scraping job to the queue
   */
  async addScrapingJob(data: ScrapingJobData): Promise<string> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const job = await this.queue.add('scrape-leads', data, {
      jobId: `scraping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    // Initialize progress tracking
    this.jobProgress.set(job.id!, {
      jobId: job.id!,
      status: 'waiting',
      progress: 0,
      currentBatch: 0,
      totalBatches: Math.ceil((data.maxResults || 20) / (data.batchSize || this.config.batchSize)),
      processedLeads: 0,
      totalLeads: data.maxResults || 20,
      importedLeads: 0,
      duplicateLeads: 0,
      errorCount: 0,
      currentBatchStatus: 'Queued',
      startedAt: new Date(),
    });

    logger.info('Scraping job added to queue', {
      jobId: job.id,
      location: data.location,
      maxResults: data.maxResults,
    });

    return job.id!;
  }

  /**
   * Process a single scraping job (called by worker)
   */
  private async processJob(job: Job<ScrapingJobData>): Promise<ScrapingJobResult> {
    const data = job.data;
    const result: ScrapingJobResult = {
      success: false,
      totalProcessed: 0,
      totalImported: 0,
      totalDuplicates: 0,
      totalErrors: 0,
      batches: [],
      leads: [],
      errors: [],
    };

    try {
      logger.info('Processing scraping job', {
        jobId: job.id,
        location: data.location,
        maxResults: data.maxResults,
      });

      // Calculate number of batches
      const batchSize = data.batchSize || this.config.batchSize;
      const totalBatches = Math.ceil((data.maxResults || 20) / batchSize);

      // Initialize cluster if not already initialized
      await puppeteerClusterScraper.initializeCluster();

      // Process each batch
      for (let batchNumber = 1; batchNumber <= totalBatches; batchNumber++) {
        const batchStart = (batchNumber - 1) * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, data.maxResults || 20);

        logger.info('Processing batch', {
          jobId: job.id,
          batchNumber,
          totalBatches,
          batchStart,
          batchEnd,
        });

        // Update progress
        this.updateJobProgress(job.id!, {
          currentBatch: batchNumber,
          currentBatchStatus: 'Scraping Google Maps...',
          progress: Math.round(((batchNumber - 1) / totalBatches) * 100),
        });

        try {
          // Scrape this batch
          const searchParams: GoogleMapsSearchParams = {
            location: data.location,
            query: data.query,
            radius: data.radius,
            minRating: data.minRating,
            maxResults: batchSize,
            useStealth: true,
          };

          const scrapingResult = await puppeteerClusterScraper.searchBusinesses(
            searchParams,
            {
              useCache: true,
              cacheTTL: 3600,
              timeout: 60000,
              headless: true,
              maxRetries: 2,
            }
          );

          // Update progress
          this.updateJobProgress(job.id!, {
            currentBatchStatus: 'Importing to database...',
            processedLeads: result.totalProcessed + scrapingResult.totalFound,
          });

          // Transform and import to database
          const leadsToImport = scrapingResult.businesses.map((business) => ({
            name: business.name,
            phone: business.phone,
            email: business.email,
            website: business.website,
            address: business.address,
            category: business.category,
            google_maps_id: business.placeId,
            google_maps_url: `https://www.google.com/maps/place/?q=place_id:${business.placeId}`,
            google_rating: business.rating,
            google_reviews_count: business.reviewsCount,
            raw_data: {
              location: {
                latitude: business.latitude,
                longitude: business.longitude,
              },
              opening_hours: business.openingHours,
              price_level: business.priceLevel,
              description: business.description,
              verified: business.verified,
            },
          }));

          // Extract emails if requested
          if (data.extractEmails) {
            this.updateJobProgress(job.id!, {
              currentBatchStatus: 'Extracting emails...',
            });

            for (let i = 0; i < leadsToImport.length; i++) {
              const lead = leadsToImport[i];
              if (lead.website && !lead.email) {
                try {
                  const email = await puppeteerClusterScraper.extractEmailFromWebsite(lead.website);
                  if (email) {
                    leadsToImport[i].email = email;
                  }
                } catch (error) {
                  logger.warn(`Failed to extract email from ${lead.website}:`, error);
                }
              }
            }
          }

          // Import to database
          const importResult = await leadService.bulkImport(data.tenantId, leadsToImport);

          // Update result
          result.totalProcessed += scrapingResult.totalFound;
          result.totalImported += importResult.imported;
          result.totalDuplicates += importResult.duplicates;
          result.totalErrors += importResult.errors;
          result.leads.push(...leadsToImport);

          result.batches.push({
            batchNumber,
            processed: scrapingResult.totalFound,
            imported: importResult.imported,
            duplicates: importResult.duplicates,
            errors: importResult.errors,
            scrapingTime: scrapingResult.scrapingTime,
          });

          // Update progress
          this.updateJobProgress(job.id!, {
            importedLeads: result.totalImported,
            duplicateLeads: result.totalDuplicates,
            errorCount: result.totalErrors,
            currentBatchStatus: `Batch ${batchNumber}/${totalBatches} completed`,
            progress: Math.round((batchNumber / totalBatches) * 100),
          });

          // Delay between batches to prevent overwhelming the system
          if (batchNumber < totalBatches) {
            await this.delay(this.config.batchDelay);
          }

        } catch (batchError) {
          logger.error('Batch processing failed', {
            jobId: job.id,
            batchNumber,
            error: (batchError as Error).message,
          });

          result.errors.push({
            batchNumber,
            error: (batchError as Error).message,
            timestamp: new Date(),
          });
          result.totalErrors++;

          this.updateJobProgress(job.id!, {
            errorCount: result.totalErrors,
            currentBatchStatus: `Batch ${batchNumber} failed`,
          });
        }
      }

      result.success = result.totalErrors === 0;

      // Final progress update
      this.updateJobProgress(job.id!, {
        progress: 100,
        currentBatchStatus: 'Completed',
      });

      logger.info('Job processing completed', {
        jobId: job.id,
        result: {
          totalProcessed: result.totalProcessed,
          totalImported: result.totalImported,
          totalErrors: result.totalErrors,
        },
      });

      return result;

    } catch (error) {
      logger.error('Job processing failed', {
        jobId: job.id,
        error: (error as Error).message,
      });

      result.success = false;
      result.errors.push({
        batchNumber: 0,
        error: (error as Error).message,
        timestamp: new Date(),
      });

      this.updateJobProgress(job.id!, {
        status: 'failed',
        error: (error as Error).message,
        currentBatchStatus: 'Failed',
      });

      throw error;
    }
  }

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  private updateJobProgress(jobId: string, updates: Partial<QueueProgress>): void {
    const current = this.jobProgress.get(jobId);
    if (current) {
      const updated = { ...current, ...updates };
      this.jobProgress.set(jobId, updated);
      this.emit('progress-update', { jobId, progress: updated });
    }
  }

  getJobProgress(jobId: string): QueueProgress | undefined {
    return this.jobProgress.get(jobId);
  }

  getAllJobsProgress(): Map<string, QueueProgress> {
    return this.jobProgress;
  }

  // ==========================================================================
  // QUEUE MANAGEMENT
  // ==========================================================================

  async getJobState(jobId: string): Promise<any> {
    if (!this.queue) throw new Error('Queue not initialized');
    return await this.queue.getJobState(jobId);
  }

  async getJob(jobId: string): Promise<Job<ScrapingJobData> | undefined> {
    if (!this.queue) throw new Error('Queue not initialized');
    return await this.queue.getJob(jobId);
  }

  async removeJob(jobId: string): Promise<void> {
    if (!this.queue) throw new Error('Queue not initialized');
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.jobProgress.delete(jobId);
    }
  }

  async getQueueStats(): Promise<any> {
    if (!this.queue) throw new Error('Queue not initialized');

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async pauseQueue(): Promise<void> {
    if (!this.queue) throw new Error('Queue not initialized');
    await this.queue.pause();
    logger.info('Queue paused');
  }

  async resumeQueue(): Promise<void> {
    if (!this.queue) throw new Error('Queue not initialized');
    await this.queue.resume();
    logger.info('Queue resumed');
  }

  async cleanQueue(): Promise<void> {
    if (!this.queue) throw new Error('Queue not initialized');
    await this.queue.clean(24 * 3600 * 1000, 100); // Clean jobs older than 24 hours
    logger.info('Queue cleaned');
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  async close(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.close();
        this.worker = null;
      }

      if (this.queueEvents) {
        await this.queueEvents.close();
        this.queueEvents = null;
      }

      if (this.queue) {
        await this.queue.close();
        this.queue = null;
      }

      this.jobProgress.clear();

      logger.info('Scraping queue service closed');
    } catch (error) {
      logger.error('Error closing scraping queue service:', error);
      throw error;
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const scrapingQueueService = new ScrapingQueueService({
  batchSize: 20,              // 20 leads per batch
  maxConcurrentBatches: 2,    // 2 batches at a time
  retryAttempts: 3,           // 3 retries for failed batches
  retryDelay: 5000,           // 5 seconds between retries
  batchDelay: 2000,           // 2 seconds between batches
});

// Auto-initialize on import (but don't start worker yet)
// Worker should be started when server starts
