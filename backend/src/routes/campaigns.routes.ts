// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - CAMPAIGNS ROUTES
// ============================================================================
// Lead generation campaigns with real-time scraping and AI personalization
// ============================================================================

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { leadGenerationService } from '../services/leadGeneration.service';
import { aiPersonalizationService } from '../services/aiPersonalization.service';
import { authenticateToken, requireTenantId, requireAdminOrUser } from '../middleware/auth';

const router = Router();

// ============================================================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================================================
router.use(authenticateToken);

/**
 * POST /api/v1/campaigns/scrape
 * Start a new lead generation (scraping) job
 * Body: { keyword, location, maxResults, minRating, radius, extractEmails }
 */
router.post('/scrape', asyncHandler(async (req, res) => {
  // Extract tenant_id from authenticated user
  const tenantId = requireTenantId(req);
  const userId = req.user?.id;

  const { keyword, location, maxResults, minRating, radius, extractEmails } = req.body;

  // Validation
  if (!keyword || !location) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'keyword and location are required',
    });
  }

  try {
    // Start lead generation job with authenticated tenant_id
    const jobId = await leadGenerationService.startLeadGeneration({
      keyword,
      location,
      maxResults: maxResults || 100,
      minRating: minRating || 0,
      radius: radius || 5000,
      extractEmails: extractEmails || false,
      tenantId, // REQUIRED - from JWT
      userId,   // REQUIRED - from JWT
    });

    res.status(202).json({
      message: 'Lead generation job started',
      jobId,
      statusUrl: `/api/v1/campaigns/scrape/progress/${jobId}`,
      progressUrl: `/api/v1/campaigns/scrape/progress/${jobId}`,
      tenantId,
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to start lead generation',
      message: error.message,
    });
  }
}));

/**
 * GET /api/v1/campaigns/scrape/progress/:jobId
 * Get real-time progress of a lead generation job
 */
router.get('/scrape/progress/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const progress = leadGenerationService.getJobProgress(jobId);

  if (!progress) {
    return res.status(404).json({
      error: 'Job not found',
      message: `Job ${jobId} does not exist`,
    });
  }

  res.status(200).json(progress);
}));

/**
 * GET /api/v1/campaigns/scrape/jobs
 * Get all active lead generation jobs
 */
router.get('/scrape/jobs', asyncHandler(async (req, res) => {
  const jobs = leadGenerationService.getAllJobs();
  const jobsArray = Array.from(jobs.entries()).map(([jobId, progress]) => ({
    jobId,
    ...progress,
  }));

  res.status(200).json({
    jobs: jobsArray,
    total: jobsArray.length,
  });
}));

/**
 * POST /api/v1/campaigns/personalize
 * Generate personalized message for a lead
 * Body: { lead, campaignType, agencyName, agencyServices, tone, customInstructions }
 */
router.post('/personalize', asyncHandler(async (req, res) => {
  // Extract tenant_id from authenticated user
  const tenantId = requireTenantId(req);

  const { lead, campaignType, agencyName, agencyServices, tone, customInstructions } = req.body;

  if (!lead || !lead.id) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'lead with id is required',
    });
  }

  try {
    // Add tenant context to lead data
    const leadWithTenant = {
      ...lead,
      tenantId, // Ensure tenant isolation
    };

    const personalizedMessage = await aiPersonalizationService.generatePersonalizedMessage({
      lead: leadWithTenant,
      campaignType: campaignType || 'cold-outreach',
      agencyName: agencyName || 'Fikerflow',
      agencyServices: agencyServices,
      tone: tone || 'professional',
      customInstructions,
    });

    res.status(200).json({
      message: 'Personalized message generated successfully',
      data: {
        ...personalizedMessage,
        tenantId, // Include tenant_id in response
      },
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate personalized message',
      message: error.message,
    });
  }
}));

/**
 * POST /api/v1/campaigns/personalize/batch
 * Generate personalized messages for multiple leads
 * Body: { leads, options }
 */
router.post('/personalize/batch', asyncHandler(async (req, res) => {
  // Extract tenant_id from authenticated user
  const tenantId = requireTenantId(req);

  const { leads, options } = req.body;

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'leads array is required',
    });
  }

  try {
    // Add tenant_id to all leads for isolation
    const leadsWithTenant = leads.map(lead => ({
      ...lead,
      tenantId, // Ensure tenant isolation
    }));

    const personalizedMessages = await aiPersonalizationService.generateBatchMessages(
      leadsWithTenant,
      {
        ...options,
        tenantId, // Pass tenant context
      }
    );

    res.status(200).json({
      message: `Generated ${personalizedMessages.length} personalized messages`,
      data: personalizedMessages,
      total: personalizedMessages.length,
      tenantId, // Include tenant_id in response
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate personalized messages',
      message: error.message,
    });
  }
}));

/**
 * GET /api/v1/campaigns
 * List all campaigns (placeholder for future)
 */
router.get('/', asyncHandler(async (req, res) => {
  res.status(200).json({
    campaigns: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
    message: 'Campaign management coming in Phase 3',
  });
}));

/**
 * GET /api/v1/campaigns/:id
 * Get a single campaign by ID (placeholder for future)
 */
router.get('/:id', asyncHandler(async (req, res) => {
  res.status(200).json({
    campaign: null,
    message: 'Campaign details coming in Phase 3',
  });
}));

/**
 * POST /api/v1/campaigns
 * Create a new campaign (placeholder for future)
 */
router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({
    message: 'Campaign creation not yet implemented - coming in Phase 3',
    campaign: null,
  });
}));

/**
 * POST /api/v1/campaigns/:id/launch
 * Launch a campaign (placeholder for future)
 */
router.post('/:id/launch', asyncHandler(async (req, res) => {
  res.status(200).json({
    message: 'Campaign launch not yet implemented - coming in Phase 4',
  });
}));

/**
 * PATCH /api/v1/campaigns/:id
 * Update a campaign (placeholder for future)
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  res.status(200).json({
    message: 'Campaign update not yet implemented',
  });
}));

/**
 * DELETE /api/v1/campaigns/:id
 * Delete a campaign (placeholder for future)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  res.status(200).json({
    message: 'Campaign deletion not yet implemented',
  });
}));

export default router;
