// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - BULL QUEUE CONFIGURATION
// ============================================================================
// Bull is a Redis-backed queue for Node.js
// Used for async message processing with rate limiting and retries
// ============================================================================

import { Queue, Worker, QueueEvents } from 'bull';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

export interface MessageJobData {
  tenantId: string;
  campaignId: string;
  leadId: string;
  channelId: 'whatsapp' | 'email';
  message: string;
  subject?: string; // For email
  recipient: {
    phone?: string; // For WhatsApp
    email?: string; // For email
  };
  retries?: number;
}

/**
 * Message queue for sending WhatsApp and Email messages
 */
export const messageQueue = new Queue<MessageJobData>('messages', {
  connection: redisClient as any, // Redis connection
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
    timeout: 30000, // Job timeout after 30 seconds
  },
});

// ============================================================================
// QUEUE EVENTS
// ============================================================================

/**
 * Listen to queue events for monitoring and logging
 */
const queueEvents = new QueueEvents('messages', {
  connection: redisClient as any,
});

// Log when a job is waiting (added to queue)
queueEvents.on('waiting', (jobId) => {
  logger.debug(`Job ${jobId} is waiting in queue`);
});

// Log when a job becomes active (being processed)
queueEvents.on('active', (jobId) => {
  logger.debug(`Job ${jobId} is now being processed`);
});

// Log when a job completes successfully
queueEvents.on('completed', (jobId, result) => {
  logger.info(`Job ${jobId} completed successfully`, { result });
});

// Log when a job fails
queueEvents.on('failed', (jobId, error) => {
  logger.error(`Job ${jobId} failed`, { error: error.message });
});

// Log when a job is stalled (processing took too long)
queueEvents.on('stalled', (jobId) => {
  logger.warn(`Job ${jobId} has stalled`);
});

// ============================================================================
// QUEUE INITIALIZATION
// ============================================================================

/**
 * Initialize the message queue
 * Creates the queue if it doesn't exist and sets up error handlers
 */
export async function initializeQueue(): Promise<typeof messageQueue> {
  try {
    // Verify queue is ready
    await messageQueue.isReady();
    logger.debug('Message queue initialized successfully');

    // Handle queue errors
    messageQueue.on('error', (error) => {
      logger.error('Queue error:', error);
    });

    // Return the queue instance
    return messageQueue;
  } catch (error) {
    logger.error('Failed to initialize message queue:', error);
    throw error;
  }
}

/**
 * Add a message job to the queue
 * @param jobData - The message job data
 * @param options - Bull job options (priority, delay, etc.)
 */
export async function addMessageJob(
  jobData: MessageJobData,
  options?: { priority?: number; delay?: number }
): Promise<void> {
  try {
    await messageQueue.add('send-message', jobData, {
      priority: options?.priority || 1,
      delay: options?.delay || 0,
    });

    logger.info('Message job added to queue', {
      leadId: jobData.leadId,
      channel: jobData.channelId,
    });
  } catch (error) {
    logger.error('Failed to add message job to queue:', error);
    throw error;
  }
}

/**
 * Get queue statistics
 * @returns Queue stats (waiting, active, completed, failed)
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      messageQueue.getWaitingCount(),
      messageQueue.getActiveCount(),
      messageQueue.getCompletedCount(),
      messageQueue.getFailedCount(),
      messageQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }
}

/**
 * Clean up old jobs from the queue
 * @param grace - Grace period in milliseconds (keep jobs newer than this)
 * @param limit - Maximum number of jobs to clean
 */
export async function cleanQueue(
  grace: number = 24 * 3600 * 1000, // 24 hours
  limit: number = 1000
): Promise<void> {
  try {
    await messageQueue.clean(grace, limit, 'completed');
    await messageQueue.clean(grace, limit, 'failed');
    logger.info('Queue cleaned successfully');
  } catch (error) {
    logger.error('Failed to clean queue:', error);
  }
}

/**
 * Pause the queue (stop processing new jobs)
 */
export async function pauseQueue(): Promise<void> {
  try {
    await messageQueue.pause();
    logger.info('Queue paused');
  } catch (error) {
    logger.error('Failed to pause queue:', error);
    throw error;
  }
}

/**
 * Resume the queue (start processing jobs again)
 */
export async function resumeQueue(): Promise<void> {
  try {
    await messageQueue.resume();
    logger.info('Queue resumed');
  } catch (error) {
    logger.error('Failed to resume queue:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  messageQueue,
  initializeQueue,
  addMessageJob,
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
};
