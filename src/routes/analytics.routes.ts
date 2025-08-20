/**
 * Analytics Routes
 * Express routing configuration for analytics data collection endpoints
 * Epic 5 Task 5.1: Data Collection Pipeline API Routes
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import RedisService from '../services/redis.service';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AuthMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { rateLimit } from 'express-rate-limit';
import { Logger } from '../utils/logger.util';
import {
  EventType,
  EventCategory,
  EventSeverity
} from '../types/analytics.types';

const logger = Logger.getInstance();

// Rate limiting configurations
const eventCollectionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow more events for analytics collection
  message: {
    success: false,
    message: 'Too many analytics events from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const queryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit query requests
  message: {
    success: false,
    message: 'Too many analytics queries from this IP',
    code: 'QUERY_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Very limited export requests
  message: {
    success: false,
    message: 'Too many export requests from this IP',
    code: 'EXPORT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Create analytics routes
 */
export function createAnalyticsRoutes(
  prisma: PrismaClient,
  redisService: RedisService
): Router {
  const router = Router();

  // Initialize controller
  const controller = new AnalyticsController(prisma, redisService, {
    enabled: true,
    bufferSize: 500,
    flushInterval: 3000, // 3 seconds for faster testing
    samplingRate: 1.0, // Collect all events initially
    processing: {
      realTime: {
        enabled: false, // Disable Kafka for now
        kafka: {
          brokers: [],
          topics: ['analytics-events'],
          consumerGroup: 'analytics-processor'
        }
      },
      batch: {
        enabled: true,
        interval: 10, // 10 minutes
        batchSize: 5000
      },
      aggregation: {
        enabled: true,
        intervals: ['5m', '15m', '1h', '1d'],
        metrics: [
          {
            name: 'events_per_minute',
            field: 'id',
            operation: 'count'
          },
          {
            name: 'avg_session_duration',
            field: 'duration',
            operation: 'avg'
          }
        ]
      }
    }
  });

  // Initialize controller on first use
  let initialized = false;
  const ensureInitialized = async (req: AuthRequest, res: any, next: any) => {
    if (!initialized) {
      try {
        await controller.initialize();
        initialized = true;
      } catch (error) {
        logger.error("Error occurred", error as Error);
        return res.status(503).json({
          success: false,
          message: 'Analytics service unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      }
    }
    next();
  };

  // Validation middleware
  const handleValidationErrors = (req: AuthRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in analytics request', {
        errors: errors.array(),
        // userId: (req as any).user?.id || 'unknown',
        endpoint: req.originalUrl
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }
    next();
  };

  // Event Collection Routes

  /**
   * Collect a single analytics event
   * POST /api/analytics/events
   */
  router.post(
    '/events',
    eventCollectionRateLimit,
    AuthMiddleware.authenticate as any,
    ensureInitialized,
    [
      body('type')
        .isIn(Object.values(EventType))
        .withMessage('Invalid event type'),
      body('category')
        .isIn(Object.values(EventCategory))
        .withMessage('Invalid event category'),
      body('severity')
        .isIn(Object.values(EventSeverity))
        .withMessage('Invalid event severity'),
      body('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
      body('sessionId')
        .optional()
        .isUUID()
        .withMessage('Session ID must be a valid UUID'),
      body('assessmentId')
        .optional()
        .isUUID()
        .withMessage('Assessment ID must be a valid UUID'),
      body('questionId')
        .optional()
        .isUUID()
        .withMessage('Question ID must be a valid UUID'),
      body('duration')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Duration must be a non-negative integer'),
      body('success')
        .optional()
        .isBoolean()
        .withMessage('Success must be a boolean')
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.collectEvent(req, res, next);
      } catch (error) {
        logger.error('Error in collect event route', error as Error);
        next(error);
      }
    }
  );

  /**
   * Collect multiple analytics events
   * POST /api/analytics/events/batch
   */
  router.post(
    '/events/batch',
    eventCollectionRateLimit,
    AuthMiddleware.authenticate as any,
    ensureInitialized,
    [
      body('events')
        .isArray({ min: 1, max: 100 })
        .withMessage('Events must be an array with 1-100 items'),
      body('events.*.type')
        .isIn(Object.values(EventType))
        .withMessage('Invalid event type'),
      body('events.*.category')
        .isIn(Object.values(EventCategory))
        .withMessage('Invalid event category'),
      body('events.*.severity')
        .isIn(Object.values(EventSeverity))
        .withMessage('Invalid event severity'),
      body('events.*.metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
      body('events.*.sessionId')
        .optional()
        .isUUID()
        .withMessage('Session ID must be a valid UUID'),
      body('events.*.duration')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Duration must be a non-negative integer')
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.collectEventsBatch(req, res, next);
      } catch (error) {
        logger.error('Error in collect events batch route', error as Error);
        next(error);
      }
    }
  );

  // Query Routes

  /**
   * Query analytics events
   * POST /api/analytics/query
   */
  router.post(
    '/query',
    queryRateLimit,
    AuthMiddleware.authenticate as any,
    ensureInitialized,
    [
      body('timeRange')
        .isObject()
        .withMessage('Time range is required'),
      body('timeRange.start')
        .isISO8601()
        .withMessage('Start time must be a valid ISO8601 date'),
      body('timeRange.end')
        .isISO8601()
        .withMessage('End time must be a valid ISO8601 date'),
      body('filters')
        .optional()
        .isObject()
        .withMessage('Filters must be an object'),
      body('filters.eventTypes')
        .optional()
        .isArray()
        .withMessage('Event types must be an array'),
      body('filters.eventTypes.*')
        .optional()
        .isIn(Object.values(EventType))
        .withMessage('Invalid event type in filter'),
      body('filters.categories')
        .optional()
        .isArray()
        .withMessage('Categories must be an array'),
      body('filters.categories.*')
        .optional()
        .isIn(Object.values(EventCategory))
        .withMessage('Invalid category in filter'),
      body('groupBy')
        .optional()
        .isArray()
        .withMessage('Group by must be an array'),
      body('limit')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Limit must be between 1 and 10000'),
      body('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be non-negative')
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.queryEvents(req, res, next);
      } catch (error) {
        logger.error('Error in query events route', error as Error);
        next(error);
      }
    }
  );

  // Statistics and Status Routes

  /**
   * Get analytics statistics
   * GET /api/analytics/statistics
   */
  router.get(
    '/statistics',
    AuthMiddleware.authenticate as any,
    ensureInitialized,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.getStatistics(req, res, next);
      } catch (error) {
        logger.error('Error in get statistics route', error as Error);
        next(error);
      }
    }
  );

  /**
   * Get pipeline status
   * GET /api/analytics/pipeline/status
   */
  router.get(
    '/pipeline/status',
    AuthMiddleware.authenticate as any,
    ensureInitialized,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.getPipelineStatus(req, res, next);
      } catch (error) {
        logger.error('Error in get pipeline status route', error as Error);
        next(error);
      }
    }
  );

  // Data Export/Import Routes

  /**
   * Export analytics data
   * POST /api/analytics/export
   */
  router.post(
    '/export',
    exportRateLimit,
    AuthMiddleware.authenticate as any,
    ensureInitialized,
    [
      body('format')
        .isIn(['json', 'csv', 'parquet', 'avro'])
        .withMessage('Format must be one of: json, csv, parquet, avro'),
      body('destination')
        .isObject()
        .withMessage('Destination configuration is required'),
      body('destination.type')
        .isIn(['filesystem', 's3', 'gcs', 'azure', 'sftp'])
        .withMessage('Invalid destination type'),
      body('destination.path')
        .notEmpty()
        .withMessage('Destination path is required'),
      body('filters')
        .isObject()
        .withMessage('Filters are required'),
      body('filters.timeRange')
        .isObject()
        .withMessage('Time range filter is required'),
      body('filters.timeRange.start')
        .isISO8601()
        .withMessage('Start time must be a valid ISO8601 date'),
      body('filters.timeRange.end')
        .isISO8601()
        .withMessage('End time must be a valid ISO8601 date'),
      body('options')
        .optional()
        .isObject()
        .withMessage('Options must be an object'),
      body('options.includeMetadata')
        .optional()
        .isBoolean()
        .withMessage('Include metadata must be a boolean'),
      body('options.anonymizeUsers')
        .optional()
        .isBoolean()
        .withMessage('Anonymize users must be a boolean')
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.exportData(req, res, next);
      } catch (error) {
        logger.error('Error in export data route', error as Error);
        next(error);
      }
    }
  );

  /**
   * Import analytics data
   * POST /api/analytics/import
   */
  router.post(
    '/import',
    exportRateLimit, // Same rate limit as export
    AuthMiddleware.authenticate as any,
    ensureInitialized,
    [
      body('source')
        .isObject()
        .withMessage('Source configuration is required'),
      body('source.type')
        .isIn(['filesystem', 's3', 'gcs', 'azure', 'http', 'kafka'])
        .withMessage('Invalid source type'),
      body('source.path')
        .notEmpty()
        .withMessage('Source path is required'),
      body('format')
        .isIn(['json', 'csv', 'parquet', 'avro'])
        .withMessage('Format must be one of: json, csv, parquet, avro'),
      body('mapping')
        .isObject()
        .withMessage('Field mapping is required'),
      body('validation')
        .optional()
        .isObject()
        .withMessage('Validation must be an object'),
      body('processing')
        .optional()
        .isObject()
        .withMessage('Processing options must be an object')
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.importData(req, res, next);
      } catch (error) {
        logger.error('Error in import data route', error as Error);
        next(error);
      }
    }
  );

  // Job Management Routes

  /**
   * Get job status
   * GET /api/analytics/jobs/:jobId
   */
  router.get(
    '/jobs/:jobId',
    AuthMiddleware.authenticate as any,
    ensureInitialized,
    [
      param('jobId')
        .matches(/^job_\d+_[a-z0-9]+$/)
        .withMessage('Invalid job ID format')
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.getJobStatus(req, res, next);
      } catch (error) {
        logger.error('Error in get job status route', error as Error);
        next(error);
      }
    }
  );

  // Metadata Routes

  /**
   * Get analytics metadata
   * GET /api/analytics/metadata
   */
  router.get(
    '/metadata',
    AuthMiddleware.authenticate as any,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        await controller.getMetadata(req, res, next);
      } catch (error) {
        logger.error('Error in get metadata route', error as Error);
        next(error);
      }
    }
  );

  // Health Check Route (no auth required)

  /**
   * Health check
   * GET /api/analytics/health
   */
  router.get('/health', async (req, res) => {
    try {
      // Create a mock AuthRequest for health check
      const mockRequest = { ...req, user: { id: 'system', organizationId: 'system' } } as AuthRequest;
      
      if (!initialized) {
        return res.status(503).json({
          success: false,
          message: 'Analytics service not initialized',
          code: 'SERVICE_NOT_INITIALIZED'
        });
      }

      await controller.healthCheck(mockRequest, res, () => {});
    } catch (error) {
      logger.error("Error occurred", error as Error);
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR'
      });
    }
  });

  // Error handling middleware
  router.use((error: any, req: any, res: any, next: any) => {
    logger.error('Analytics route error', error as Error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.message
      });
    }

    if (error.name === 'UnauthorizedError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  });

  logger.info('Analytics routes initialized successfully');

  return router;
}

export default createAnalyticsRoutes;

