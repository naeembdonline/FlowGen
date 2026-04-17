// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - LEADS ROUTES (PUPPETEER VERSION)
// ============================================================================
// These routes handle lead management: import, list, update, delete
// Uses self-hosted Puppeteer scraper (100% free, no paid APIs)
// ============================================================================

import { Router, Request, Response } from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { scrapingRateLimiter } from '../middleware/rateLimiter';
import { leadService } from '../services/supabase.service';
import { puppeteerClusterScraper, GoogleMapsSearchParams } from '../services/puppeteerClusterScraper.service';
import { authenticateToken, AuthenticatedRequest, requireTenantId } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================================================
router.use(authenticateToken);

// ============================================================================
// GET /api/v1/leads - List all leads for current tenant
// ============================================================================

/**
 * GET /api/v1/leads
 * List all leads for current tenant with pagination and filtering
 * Query params: page, limit, status, category, search
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // SECURITY: Extract tenant_id from authenticated user - NO FALLBACK
  const tenantId = requireTenantId(req);

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const category = req.query.category as string;
  const search = req.query.search as string;

  logger.info('Fetching leads', { tenantId, page, limit, status, category, search });

  const { leads, total } = await leadService.getByTenant(tenantId, {
    page,
    limit,
    status,
    category,
    search,
  });

  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}));

// ============================================================================
// GET /api/v1/leads/:id - Get a single lead
// ============================================================================

/**
 * GET /api/v1/leads/:id
 * Get a single lead by ID
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const lead = await leadService.getById(id);

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  res.status(200).json({
    lead,
  });
}));

// ============================================================================
// POST /api/v1/leads/import - Import leads from Google Maps (Puppeteer)
// ============================================================================

/**
 * POST /api/v1/leads/import
 * Import leads from Google Maps using Puppeteer (self-hosted scraper)
 * Body: { location, query?, radius?, minRating?, maxResults? }
 */
router.post('/import', scrapingRateLimiter.middleware(), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // SECURITY: Extract tenant_id from authenticated user - NO FALLBACK
  const tenantId = requireTenantId(req);

  // Validate request body
  const { location, query, radius, minRating, maxResults, extractEmails } = req.body;

  if (!location) {
    throw new ValidationError('Location is required');
  }

  if (typeof location !== 'string' || location.trim().length === 0) {
    throw new ValidationError('Location must be a non-empty string');
  }

  logger.info('Starting lead import with Puppeteer', {
    tenantId,
    location,
    query,
    radius,
    minRating,
    maxResults,
    extractEmails
  });

  // Build search parameters
  const searchParams: GoogleMapsSearchParams = {
    location: location.trim(),
    query: query?.trim(),
    radius: radius || 5000,
    minRating: minRating || undefined,
    maxResults: maxResults || 20,
    useStealth: true, // Enable stealth mode to avoid detection
  };

  try {
    // Scrape Google Maps using Puppeteer Cluster
    const scrapingResult = await puppeteerClusterScraper.searchBusinesses(searchParams, {
      useCache: true,
      cacheTTL: 3600, // Cache for 1 hour
      timeout: 60000, // 60 second timeout
      headless: true, // Run in headless mode
      maxRetries: 3,
    });

    logger.info(`Puppeteer scraping completed`, {
      totalFound: scrapingResult.totalFound,
      location,
      query,
      scrapingTime: scrapingResult.scrapingTime,
      cached: scrapingResult.cached,
    });

    // Transform businesses to lead format
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

    // Extract emails from websites if requested
    if (extractEmails && leadsToImport.length > 0) {
      logger.info(`Extracting emails from ${leadsToImport.length} websites`);

      for (let i = 0; i < leadsToImport.length; i++) {
        const lead = leadsToImport[i];
        if (lead.website && !lead.email) {
          try {
            const email = await puppeteerClusterScraper.extractEmailFromWebsite(lead.website);
            if (email) {
              leadsToImport[i].email = email;
              logger.debug(`Extracted email for ${lead.name}: ${email}`);
            }
          } catch (error) {
            logger.warn(`Failed to extract email from ${lead.website}:`, error);
          }
        }
      }
    }

    // Import leads to database
    const importResult = await leadService.bulkImport(tenantId, leadsToImport);

    logger.info('Lead import completed', {
      tenantId,
      imported: importResult.imported,
      duplicates: importResult.duplicates,
      errors: importResult.errors,
    });

    res.status(201).json({
      message: 'Lead import completed',
      imported: importResult.imported,
      duplicates: importResult.duplicates,
      errors: importResult.errors,
      total: scrapingResult.totalFound,
      leads: leadsToImport.slice(0, importResult.imported), // Return imported leads
      cached: scrapingResult.cached,
      scrapingTime: scrapingResult.scrapingTime,
    });
  } catch (error) {
    logger.error('Lead import failed', {
      tenantId,
      location,
      query,
      error: (error as Error).message,
    });
    throw error;
  }
}));

// ============================================================================
// POST /api/v1/leads/import/search - Search only (don't import)
// ============================================================================

/**
 * POST /api/v1/leads/import/search
 * Search for businesses without importing (preview results)
 * Body: { location, query?, radius?, minRating?, maxResults? }
 */
router.post('/import/search', scrapingRateLimiter.middleware(), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { location, query, radius, minRating, maxResults } = req.body;

  if (!location) {
    throw new ValidationError('Location is required');
  }

  const searchParams: GoogleMapsSearchParams = {
    location: location.trim(),
    query: query?.trim(),
    radius: radius || 5000,
    minRating: minRating || undefined,
    maxResults: maxResults || 10, // Lower limit for preview
    useStealth: true,
  };

  logger.info('Puppeteer Cluster search (preview)', { location, query });

  const scrapingResult = await puppeteerClusterScraper.searchBusinesses(searchParams, {
    useCache: true,
    cacheTTL: 1800, // 30 minutes for preview
    timeout: 45000,
  });

  logger.info(`Puppeteer search completed`, {
    totalFound: scrapingResult.totalFound,
    location,
    query,
    cached: scrapingResult.cached,
    scrapingTime: scrapingResult.scrapingTime,
  });

  res.status(200).json({
    businesses: scrapingResult.businesses,
    totalFound: scrapingResult.totalFound,
    hasMore: scrapingResult.hasMore,
    cached: scrapingResult.cached,
    scrapingTime: scrapingResult.scrapingTime,
  });
}));

// ============================================================================
// PATCH /api/v1/leads/:id - Update a lead
// ============================================================================

/**
 * PATCH /api/v1/leads/:id
 * Update a lead
 */
router.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  // Validate updates
  const allowedUpdates = ['name', 'description', 'phone', 'email', 'website', 'status', 'category', 'tags'];
  const invalidUpdates = Object.keys(updates).filter(key => !allowedUpdates.includes(key));

  if (invalidUpdates.length > 0) {
    throw new ValidationError(`Invalid fields: ${invalidUpdates.join(', ')}`);
  }

  logger.info('Updating lead', { leadId: id, updates });

  const success = await leadService.update(id, updates);

  if (!success) {
    throw new NotFoundError('Lead not found');
  }

  res.status(200).json({
    message: 'Lead updated successfully',
  });
}));

// ============================================================================
// DELETE /api/v1/leads/:id - Delete a lead
// ============================================================================

/**
 * DELETE /api/v1/leads/:id
 * Delete a lead
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  logger.info('Deleting lead', { leadId: id });

  const success = await leadService.delete(id);

  if (!success) {
    throw new NotFoundError('Lead not found');
  }

  res.status(200).json({
    message: 'Lead deleted successfully',
  });
}));

// ============================================================================
// POST /api/v1/leads/bulk-delete - Bulk delete leads
// ============================================================================

/**
 * POST /api/v1/leads/bulk-delete
 * Delete multiple leads at once
 * Body: { leadIds: string[] }
 */
router.post('/bulk-delete', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { leadIds } = req.body;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new ValidationError('leadIds must be a non-empty array');
  }

  if (leadIds.length > 100) {
    throw new ValidationError('Cannot delete more than 100 leads at once');
  }

  logger.info('Bulk deleting leads', { count: leadIds.length });

  let deletedCount = 0;
  let failedCount = 0;

  for (const leadId of leadIds) {
    const success = await leadService.delete(leadId);
    if (success) {
      deletedCount++;
    } else {
      failedCount++;
    }
  }

  logger.info('Bulk delete completed', { deletedCount, failedCount });

  res.status(200).json({
    message: 'Bulk delete completed',
    deleted: deletedCount,
    failed: failedCount,
  });
}));

// ============================================================================
// GET /api/v1/leads/export - Export leads to CSV
// ============================================================================

/**
 * GET /api/v1/leads/export
 * Export leads to CSV file
 * Query params: status, category
 */
router.get('/export', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // SECURITY: Extract tenant_id from authenticated user - NO FALLBACK
  const tenantId = requireTenantId(req);
  const status = req.query.status as string;
  const category = req.query.category as string;

  logger.info('Exporting leads to CSV', { tenantId, status, category });

  const { leads } = await leadService.getByTenant(tenantId, {
    status,
    category,
    limit: 10000, // Export limit
  });

  // Convert to CSV
  const csv = convertLeadsToCSV(leads);

  // Set headers for CSV download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=leads-${Date.now()}.csv`);

  res.send(csv);
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert leads array to CSV format
 */
function convertLeadsToCSV(leads: any[]): string {
  if (leads.length === 0) {
    return 'Name,Phone,Email,Website,Address,Category,Status,Created At\n';
  }

  const headers = ['Name', 'Phone', 'Email', 'Website', 'Address', 'Category', 'Status', 'Created At'];
  const csvRows = [headers.join(',')];

  for (const lead of leads) {
    const row = [
      lead.name || '',
      lead.phone || '',
      lead.email || '',
      lead.website || '',
      lead.address || '',
      lead.category || '',
      lead.status || '',
      lead.created_at || '',
    ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`); // Escape quotes

    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

// ============================================================================
// EXPORT
// ============================================================================

export default router;
