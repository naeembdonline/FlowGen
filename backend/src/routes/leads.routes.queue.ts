// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - LEADS ROUTES (QUEUE VERSION)
// ============================================================================
// These routes handle lead management with queue-based batch processing
// Uses BullMQ queue for processing large scraping requests
// ============================================================================

import { Router, Request, Response } from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { scrapingRateLimiter } from '../middleware/rateLimiter';
import { leadService } from '../services/supabase.service';
import { scrapingQueueService, ScrapingJobData } from '../services/scrapingQueue.service';
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
// POST /api/v1/leads/import - Import leads using queue-based batch processing
// ============================================================================

/**
 * POST /api/v1/leads/import
 * Import leads using queue-based batch processing (for large requests)
 * Body: { location, query?, radius?, minRating?, maxResults?, extractEmails?, batchSize? }
 */
router.post('/import', scrapingRateLimiter.middleware(), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // SECURITY: Extract tenant_id from authenticated user - NO FALLBACK
  const tenantId = requireTenantId(req);
  const userId = req.user?.id;

  // Validate request body
  const { location, query, radius, minRating, maxResults, extractEmails, batchSize } = req.body;

  if (!location) {
    throw new ValidationError('Location is required');
  }

  if (typeof location !== 'string' || location.trim().length === 0) {
    throw new ValidationError('Location must be a non-empty string');
  }

  // Validate maxResults
  const requestedResults = maxResults || 20;
  if (requestedResults > 500) {
    throw new ValidationError('Maximum 500 results per request');
  }

  if (requestedResults < 1) {
    throw new ValidationError('Minimum 1 result required');
  }

  // Validate batchSize
  const requestedBatchSize = batchSize || 20;
  if (requestedBatchSize > 50) {
    throw new ValidationError('Maximum batch size is 50');
  }

  if (requestedBatchSize < 5) {
    throw new ValidationError('Minimum batch size is 5');
  }

  logger.info('Starting queued lead import', {
    tenantId,
    userId,
    location,
    query,
    maxResults: requestedResults,
    batchSize: requestedBatchSize,
    extractEmails,
  });

  // Build job data
  const jobData: ScrapingJobData = {
    tenantId,
    userId,
    location: location.trim(),
    query: query?.trim(),
    radius: radius || 5000,
    minRating: minRating || undefined,
    maxResults: requestedResults,
    extractEmails: extractEmails || false,
    batchSize: requestedBatchSize,
  };

  try {
    // Add job to queue
    const jobId = await scrapingQueueService.addScrapingJob(jobData);

    logger.info('Job added to queue', {
      jobId,
      tenantId,
      location,
    });

    res.status(202).json({
      message: 'Lead import job queued successfully',
      jobId,
      location: jobData.location,
      maxResults: jobData.maxResults,
      batchSize: jobData.batchSize,
      estimatedBatches: Math.ceil(jobData.maxResults / jobData.batchSize),
      statusUrl: `/api/v1/leads/import/status/${jobId}`,
      progressUrl: `/api/v1/leads/import/progress/${jobId}`,
    });

  } catch (error) {
    logger.error('Failed to queue import job', {
      tenantId,
      location,
      error: (error as Error).message,
    });
    throw error;
  }
}));

// ============================================================================
// GET /api/v1/leads/import/status/:jobId - Get job status
// ============================================================================

/**
 * GET /api/v1/leads/import/status/:jobId
 * Get the status of a scraping job
 */
router.get('/import/status/:jobId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;

  logger.info('Fetching job status', { jobId });

  const job = await scrapingQueueService.getJob(jobId);

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const jobState = await scrapingQueueService.getJobState(jobId);
  const jobProgress = scrapingQueueService.getJobProgress(jobId);

  res.status(200).json({
    jobId,
    state: jobState,
    progress: jobProgress,
    data: job.data,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  });
}));

// ============================================================================
// GET /api/v1/leads/import/progress/:jobId - Get job progress
// ============================================================================

/**
 * GET /api/v1/leads/import/progress/:jobId
 * Get real-time progress of a scraping job
 */
router.get('/import/progress/:jobId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;

  const progress = scrapingQueueService.getJobProgress(jobId);

  if (!progress) {
    throw new NotFoundError('Job progress not found');
  }

  res.status(200).json({
    ...progress,
  });
}));

// ============================================================================
// GET /api/v1/leads/import/result/:jobId - Get job result
// ============================================================================

/**
 * GET /api/v1/leads/import/result/:jobId
 * Get the final result of a completed scraping job
 */
router.get('/import/result/:jobId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;

  const job = await scrapingQueueService.getJob(jobId);

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  if (job.failedReason) {
    res.status(200).json({
      success: false,
      error: job.failedReason,
      jobId,
    });
  } else if (job.returnvalue) {
    res.status(200).json({
      success: true,
      jobId,
      ...job.returnvalue,
    });
  } else {
    res.status(202).json({
      success: false,
      jobId,
      message: 'Job still processing',
    });
  }
}));

// ============================================================================
// DELETE /api/v1/leads/import/:jobId - Cancel/delete job
// ============================================================================

/**
 * DELETE /api/v1/leads/import/:jobId
 * Cancel or delete a scraping job
 */
router.delete('/import/:jobId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;

  logger.info('Deleting job', { jobId });

  await scrapingQueueService.removeJob(jobId);

  res.status(200).json({
    message: 'Job deleted successfully',
    jobId,
  });
}));

// ============================================================================
// GET /api/v1/leads/queue/stats - Get queue statistics
// ============================================================================

/**
 * GET /api/v1/leads/queue/stats
 * Get queue statistics (for admin dashboard)
 */
router.get('/queue/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await scrapingQueueService.getQueueStats();

  res.status(200).json({
    queue: stats,
    jobs: Array.from(scrapingQueueService.getAllJobsProgress().values()),
  });
}));

// ============================================================================
// POST /api/v1/leads/queue/pause - Pause queue processing
// ============================================================================

/**
 * POST /api/v1/leads/queue/pause
 * Pause the queue (admin only)
 */
router.post('/queue/pause', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await scrapingQueueService.pauseQueue();

  res.status(200).json({
    message: 'Queue paused successfully',
  });
}));

// ============================================================================
// POST /api/v1/leads/queue/resume - Resume queue processing
// ============================================================================

/**
 * POST /api/v1/leads/queue/resume
 * Resume the queue (admin only)
 */
router.post('/queue/resume', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await scrapingQueueService.resumeQueue();

  res.status(200).json({
    message: 'Queue resumed successfully',
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
