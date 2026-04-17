// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - LEAD GENERATION SERVICE
// ============================================================================
// Complete lead generation pipeline:
// 1. Google Maps scraping with Puppeteer Cluster
// 2. Supabase storage with deduplication
// 3. Real-time progress tracking
// ============================================================================

import { puppeteerClusterScraper } from './puppeteerClusterScraper.service';
import { supabaseAdmin } from '../config/database';
import { logger } from '../utils/logger';
import { GoogleMapsBusiness, GoogleMapsSearchParams } from './puppeteerClusterScraper.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LeadGenerationRequest {
  keyword: string;
  location: string;
  maxResults?: number;
  minRating?: number;
  radius?: number;
  extractEmails?: boolean;
  tenantId?: string;
  userId?: string;
}

export interface LeadGenerationProgress {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalFound: number;
  totalImported: number;
  totalDuplicates: number;
  totalErrors: number;
  currentBatch: number;
  totalBatches: number;
  leads: GoogleMapsBusiness[];
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

export interface GeneratedLead {
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
  rating?: number;
  google_maps_id?: string;
  raw_data?: any;
  status: 'new' | 'contacted' | 'responded' | 'converted' | 'unqualified';
  imported_at: string;
}

// ============================================================================
// LEAD GENERATION SERVICE
// ============================================================================

class LeadGenerationService {
  private activeJobs: Map<string, LeadGenerationProgress> = new Map();
  private jobCounter: number = 0;

  /**
   * Start a new lead generation job
   */
  async startLeadGeneration(request: LeadGenerationRequest): Promise<string> {
    const jobId = `job-${Date.now()}-${this.jobCounter++}`;

    const progress: LeadGenerationProgress = {
      jobId,
      status: 'queued',
      progress: 0,
      totalFound: 0,
      totalImported: 0,
      totalDuplicates: 0,
      totalErrors: 0,
      currentBatch: 0,
      totalBatches: 0,
      leads: [],
      errors: [],
      startedAt: new Date().toISOString(),
    };

    this.activeJobs.set(jobId, progress);

    // Process asynchronously
    this.processLeadGeneration(jobId, request).catch(error => {
      logger.error(`Lead generation job ${jobId} failed:`, error);
      progress.status = 'failed';
      progress.completedAt = new Date().toISOString();
      progress.errors.push(error.message);
    });

    return jobId;
  }

  /**
   * Get progress of a lead generation job
   */
  getJobProgress(jobId: string): LeadGenerationProgress | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get all active jobs
   */
  getAllJobs(): Map<string, LeadGenerationProgress> {
    return this.activeJobs;
  }

  /**
   * Process lead generation (main pipeline)
   */
  private async processLeadGeneration(
    jobId: string,
    request: LeadGenerationRequest
  ): Promise<void> {
    const progress = this.activeJobs.get(jobId);
    if (!progress) throw new Error(`Job ${jobId} not found`);

    try {
      progress.status = 'processing';
      this.updateJobProgress(jobId);

      // Step 1: Scrape Google Maps
      logger.info(`Starting Google Maps scraping for job ${jobId}`, {
        keyword: request.keyword,
        location: request.location,
      });

      const scrapeParams: GoogleMapsSearchParams = {
        location: request.location,
        query: request.keyword,
        maxResults: request.maxResults || 100,
        minRating: request.minRating || 0,
        radius: request.radius || 5000,
        extractEmails: request.extractEmails || false,
      };

      const scrapeResult = await puppeteerClusterScraper.searchBusinesses(scrapeParams);

      progress.totalFound = scrapeResult.businesses.length;
      progress.totalBatches = Math.ceil(scrapeResult.businesses.length / 20);
      this.updateJobProgress(jobId);

      logger.info(`Scraped ${scrapeResult.businesses.length} businesses for job ${jobId}`);

      // Step 2: Process and save leads to Supabase
      const processedLeads: GeneratedLead[] = [];
      const batchSize = 20;

      for (let i = 0; i < scrapeResult.businesses.length; i += batchSize) {
        progress.currentBatch = Math.floor(i / batchSize) + 1;
        const batch = scrapeResult.businesses.slice(i, i + batchSize);

        for (const business of batch) {
          try {
            const lead = await this.saveLeadToDatabase(business, request);
            processedLeads.push(lead);
            progress.totalImported++;
            progress.leads.push(business);
          } catch (error) {
            if (error.message.includes('duplicate')) {
              progress.totalDuplicates++;
            } else {
              progress.totalErrors++;
              progress.errors.push(`${business.name}: ${error.message}`);
            }
          }
        }

        // Update progress after each batch
        progress.progress = Math.round(((i + batch.length) / scrapeResult.businesses.length) * 100);
        this.updateJobProgress(jobId);

        // Small delay between batches to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();

      logger.info(`Lead generation job ${jobId} completed`, {
        totalFound: progress.totalFound,
        totalImported: progress.totalImported,
        totalDuplicates: progress.totalDuplicates,
        totalErrors: progress.totalErrors,
      });

    } catch (error) {
      progress.status = 'failed';
      progress.completedAt = new Date().toISOString();
      progress.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Save lead to Supabase database with deduplication
   */
  private async saveLeadToDatabase(
    business: GoogleMapsBusiness,
    request: LeadGenerationRequest
  ): Promise<GeneratedLead> {
    // SECURITY: tenant_id is required, no fallback
    if (!request.tenantId) {
      throw new Error('tenant_id is required for lead generation');
    }

    try {
      // Extract address components
      const addressParts = this.parseAddress(business.address || '');

      const leadData = {
        tenant_id: request.tenantId, // REQUIRED - no fallback
        name: business.name,
        phone: business.phone,
        email: business.email,
        website: business.website,
        address: business.address,
        city: addressParts.city,
        state: addressParts.state,
        category: business.category,
        rating: business.rating,
        google_maps_id: business.placeId,
        raw_data: business,
        status: 'new' as const,
        imported_at: new Date().toISOString(),
      };

      // Check for duplicates using google_maps_id
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('google_maps_id', business.placeId)
        .eq('tenant_id', leadData.tenant_id)
        .single();

      if (existingLead) {
        throw new Error('duplicate');
      }

      // Insert new lead
      const { data, error } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data as GeneratedLead;

    } catch (error) {
      if (error.message === 'duplicate') {
        throw error;
      }
      throw new Error(`Failed to save lead: ${error.message}`);
    }
  }

  /**
   * Parse address into components
   */
  private parseAddress(address: string): { city?: string; state?: string } {
    const parts = address.split(',').map(p => p.trim());

    let city: string | undefined;
    let state: string | undefined;

    if (parts.length >= 2) {
      // Second to last part is usually the city
      city = parts[parts.length - 2];

      // Last part is usually the state and zip
      const statePart = parts[parts.length - 1];
      const stateMatch = statePart.match(/^([A-Z]{2})/);
      if (stateMatch) {
        state = stateMatch[1];
      }
    }

    return { city, state };
  }

  /**
   * Update job progress (could emit WebSocket event in production)
   */
  private updateJobProgress(jobId: string): void {
    const progress = this.activeJobs.get(jobId);
    if (progress) {
      this.activeJobs.set(jobId, { ...progress });
      // In production, emit WebSocket event here
      // io.emit('job-progress', progress);
    }
  }

  /**
   * Clean up old jobs (call periodically)
   */
  cleanupOldJobs(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [jobId, progress] of this.activeJobs.entries()) {
      const jobAge = now - new Date(progress.startedAt).getTime();
      if (jobAge > maxAge && (progress.status === 'completed' || progress.status === 'failed')) {
        this.activeJobs.delete(jobId);
      }
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const leadGenerationService = new LeadGenerationService();

// ============================================================================
// CLEANUP SCHEDULED TASK
// ============================================================================

// Clean up jobs older than 1 hour every 30 minutes
setInterval(() => {
  leadGenerationService.cleanupOldJobs();
}, 30 * 60 * 1000);

export default leadGenerationService;
