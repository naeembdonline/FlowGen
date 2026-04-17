// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - MESSAGES ROUTES
// ============================================================================
// These routes handle message tracking and status updates
// Phase 4 will implement message delivery and tracking
// ============================================================================

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// ============================================================================
// APPLY AUTHENTICATION TO ALL ROUTES (except webhooks which need public access)
// ============================================================================

/**
 * GET /api/v1/messages
 * List all messages for current tenant
 * Query params: page, limit, status, campaignId
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  // TODO: Implement in Phase 4
  res.status(200).json({
    messages: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  });
}));

/**
 * GET /api/v1/messages/:id
 * Get a single message by ID
 */
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  // TODO: Implement in Phase 4
  res.status(200).json({
    message: null,
  });
}));

/**
 * POST /api/v1/messages/webhook
 * Webhook endpoint for receiving message status updates
 * Used by Evolution API (WhatsApp) and Brevo (Email)
 * NOTE: Webhooks are publicly accessible but should verify request signatures in production
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  // TODO: Implement in Phase 4
  res.status(200).json({
    message: 'Webhook received',
  });
}));

export default router;
