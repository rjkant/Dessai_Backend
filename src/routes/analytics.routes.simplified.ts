/**
 * Analytics Routes Integration
 * Epic 5: Analytics Engine Service - Integration between routes and simplified service
 * 
 * Creates analytics routes compatible with our simplified analytics service
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import RedisService from '../services/redis.service';
import AnalyticsService from '../services/analytics.service.simplified';
import { Logger } from '../utils/logger.util';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimit } from 'express-rate-limit';
import { EventType, EventCategory, EventSeverity, EventSource } from '../types/analytics.types';

/**
 * Create Analytics Routes with Simplified Service Integration
 */
export function createAnalyticsRoutes(
  prisma: PrismaClient,
  redis: RedisService
): Router {
  const router = Router();
  const logger = Logger.getInstance();

  // Initialize simplified analytics service
  const analyticsService = AnalyticsService.getInstance(prisma, redis, logger);

  // Apply authentication to all routes
  router.use(authMiddleware as any);

  // Rate limiting for analytics endpoints
  const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Allow many analytics events
    message: {
      success: false,
      message: 'Rate limit exceeded for analytics API',
      code: 'ANALYTICS_RATE_LIMIT'
    }
  });
  router.use(rateLimiter);

  // === Event Collection Routes ===

  /**
   * Collect single analytics event
   * POST /api/analytics/events
   */
  router.post('/events', async (req, res) => {
    try {
      const eventData = req.body;

      // Validate required fields
      if (!eventData.type) {
        return res.status(400).json({
          success: false,
          error: 'Event type is required'
        });
      }

      // Validate event type
      if (!Object.values(EventType).includes(eventData.type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid event type',
          validTypes: Object.values(EventType)
        });
      }

      // Create analytics event with user context
      const event = {
        id: eventData.id || require('crypto').randomUUID(),
        type: eventData.type,
        category: getEventTypeCategory(eventData.type),
        severity: eventData.severity || EventSeverity.LOW,
        timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
        userId: eventData.userId || (req as any).user?.id,
        sessionId: eventData.sessionId,
        assessmentId: eventData.assessmentId,
        organizationId: eventData.organizationId || (req as any).user?.organizationId,
        metadata: eventData.metadata || {},
        source: {
          service: 'analytics-api',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        } as EventSource
      };

      // Collect event using simplified analytics service
      await analyticsService.collectEvent(event);

      logger.info('Analytics event collected', {
        eventId: event.id,
        eventType: event.type,
        userId: event.userId
      });

      return res.status(201).json({
        success: true,
        eventId: event.id,
        message: 'Event collected successfully'
      });
    } catch (error) {
      logger.error('Failed to collect analytics event', error as Error);

      return res.status(500).json({
        success: false,
        error: 'Failed to collect event',
        details: (error as Error).message
      });
    }
  });

  /**
   * Collect multiple analytics events
   * POST /api/analytics/events/batch
   */
  router.post('/events/batch', async (req, res) => {
    try {
      const eventDataArray = req.body.events;

      if (!Array.isArray(eventDataArray) || eventDataArray.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Events must be a non-empty array'
        });
      }

      // Process events array
      const events = eventDataArray.map((eventData: any) => ({
        id: eventData.id || require('crypto').randomUUID(),
        type: eventData.type,
        category: getEventTypeCategory(eventData.type),
        severity: eventData.severity || EventSeverity.LOW,
        timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
        userId: eventData.userId || (req as any).user?.id,
        sessionId: eventData.sessionId,
        assessmentId: eventData.assessmentId,
        organizationId: eventData.organizationId || (req as any).user?.organizationId,
        metadata: eventData.metadata || {},
        source: {
          service: 'analytics-api',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        } as EventSource
      }));

      // Collect events
      const result = await analyticsService.collectEvents(events);

      logger.info('Batch analytics events collected', {
        total: events.length,
        processed: result.processed,
        errors: result.errors.length
      });

      return res.status(200).json({
        success: result.success,
        processed: result.processed,
        total: events.length,
        errors: result.errors
      });
    } catch (error) {
      logger.error('Failed to collect batch events', error as Error);

      return res.status(500).json({
        success: false,
        error: 'Failed to collect batch events',
        details: (error as Error).message
      });
    }
  });

  // === Performance Analytics Routes ===

  /**
   * Get performance metrics for user
   * GET /api/analytics/performance/:userId
   */
  router.get('/performance/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { start, stop } = req.query;

      // Check access permissions
      if ((req as any).user?.id !== userId && !(req as any).user?.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const timeRange = start && stop ? {
        start: start as string,
        stop: stop as string
      } : undefined;

      const metrics = await analyticsService.getPerformanceMetrics(userId, timeRange);

      return res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Failed to get performance metrics', error as Error);

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics',
        details: (error as Error).message
      });
    }
  });

  /**
   * Query time-series data
   * POST /api/analytics/query
   */
  router.post('/query', async (req, res) => {
    try {
      const queryData = req.body;

      if (!queryData.measurement) {
        return res.status(400).json({
          success: false,
          error: 'Measurement is required'
        });
      }

      if (!queryData.start || !queryData.stop) {
        return res.status(400).json({
          success: false,
          error: 'Time range with start and stop is required'
        });
      }

      const data = await analyticsService.queryTimeSeriesData(queryData);

      return res.status(200).json({
        success: true,
        data: data,
        count: data.length
      });

    } catch (error) {
      logger.error('Failed to query time series data', error as Error);

      return res.status(500).json({
        success: false,
        error: 'Failed to query data',
        details: (error as Error).message
      });
    }
  });

  // === Dashboard Routes ===

  /**
   * Get dashboard metrics
   * GET /api/analytics/dashboard
   */
  router.get('/dashboard', async (req, res) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const metrics = await analyticsService.getDashboardMetrics(organizationId);

      return res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Failed to get dashboard metrics', error as Error);

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard metrics',
        details: (error as Error).message
      });
    }
  });

  /**
   * Real-time metrics stream (Server-Sent Events)
   * GET /api/analytics/stream
   */
  router.get('/stream', (req, res) => {
    try {
      const organizationId = (req as any).user?.organizationId;

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial data and set up periodic updates
      (async () => {
        try {
          const initialMetrics = await analyticsService.getDashboardMetrics(organizationId);
          res.write(`data: ${JSON.stringify(initialMetrics)}\n\n`);

          // Set up periodic updates (every 10 seconds)
          const intervalId = setInterval(async () => {
            try {
              const metrics = await analyticsService.getDashboardMetrics(organizationId);
              res.write(`data: ${JSON.stringify(metrics)}\n\n`);
            } catch (streamError) {
              logger.error('Failed to send stream data', streamError as Error);
            }
          }, 10000);

          // Clean up on disconnect
          req.on('close', () => {
            clearInterval(intervalId);
            logger.info('Analytics stream disconnected', {
              userId: (req as any).user?.id
            });
          });
        } catch (streamError) {
          logger.error('Failed to initialize analytics stream', streamError as Error);
          res.write(`event: error\ndata: ${JSON.stringify({error: 'Stream initialization failed'})}\n\n`);
        }
      })();
      
      // This satisfies TypeScript's return requirement for SSE endpoints
      return;

    } catch (error) {
      logger.error('Failed to initialize analytics stream', error as Error);
      return res.status(500).json({
        success: false,
        error: 'Failed to initialize stream',
        details: (error as Error).message
      });
    }
  });

  // === Utility Routes ===

  /**
   * Get analytics health status
   * GET /api/analytics/health
   */
  router.get('/health', async (req, res) => {
    try {
      const health = { status: 'ok', timestamp: new Date() };

      return res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: health
      });
    } catch (error) {
      logger.error('Analytics health check failed', error as Error);

      return res.status(500).json({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
    }
  });

  /**
   * Get available event types
   * GET /api/analytics/event-types
   */
  router.get('/event-types', async (req, res) => {
    try {
      const eventTypes = Object.values(EventType).map(type => ({
        type,
        description: getEventTypeDescription(type),
        category: getEventTypeCategory(type)
      }));

      return res.status(200).json({
        success: true,
        data: eventTypes
      });
    } catch (error) {
      logger.error('Failed to get event types', error as Error);

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve event types',
        details: (error as Error).message
      });
    }
  });

  return router;
}

// === Helper Functions ===

/**
 * Get event type description
 */
function getEventTypeDescription(type: EventType): string {
  const descriptions: Record<EventType, string> = {
    [EventType.ASSESSMENT_STARTED]: 'User starts an assessment',
    [EventType.ASSESSMENT_COMPLETED]: 'User completes an assessment',
    [EventType.ASSESSMENT_ABANDONED]: 'User abandons an assessment',
    [EventType.ASSESSMENT_PAUSED]: 'User pauses an assessment',
    [EventType.ASSESSMENT_RESUMED]: 'User resumes an assessment',
    [EventType.QUESTION_VIEWED]: 'User views a question',
    [EventType.QUESTION_ANSWERED]: 'User answers a question',
    [EventType.QUESTION_SKIPPED]: 'User skips a question',
    [EventType.QUESTION_FLAGGED]: 'User flags a question for review',
    [EventType.QUESTION_UNFLAGGED]: 'User removes flag from a question',
    [EventType.CODE_EXECUTED]: 'User executes code',
    [EventType.CODE_COMPILED]: 'User compiles code',
    [EventType.CODE_ERROR]: 'Code execution results in error',
    [EventType.CODE_TEST_RUN]: 'User runs tests on code',
    [EventType.CODE_SUBMITTED]: 'User submits code solution',
    [EventType.VIOLATION_DETECTED]: 'Proctoring violation detected',
    [EventType.FACE_NOT_DETECTED]: 'Face not detected during proctoring',
    [EventType.MULTIPLE_FACES]: 'Multiple faces detected during proctoring',
    [EventType.TAB_SWITCH]: 'User switches browser tab',
    [EventType.SUSPICIOUS_ACTIVITY]: 'Suspicious activity detected',
    [EventType.PAGE_VIEW]: 'User views a page',
    [EventType.BUTTON_CLICK]: 'User clicks a button',
    [EventType.FORM_SUBMISSION]: 'User submits a form',
    [EventType.FILE_UPLOAD]: 'User uploads a file',
    [EventType.SEARCH_PERFORMED]: 'User performs a search',
    [EventType.SESSION_STARTED]: 'User session starts',
    [EventType.SESSION_ENDED]: 'User session ends',
    [EventType.CONNECTION_LOST]: 'Network connection lost',
    [EventType.CONNECTION_RESTORED]: 'Network connection restored',
    [EventType.ERROR_OCCURRED]: 'System error occurred'
  };

  return descriptions[type] || 'Unknown event type';
}

/**
 * Get event type category
 */
function getEventTypeCategory(type: EventType): EventCategory {
  if (type.toString().startsWith('ASSESSMENT_')) return EventCategory.ASSESSMENT;
  if (type.toString().startsWith('QUESTION_')) return EventCategory.QUESTION;
  if (type.toString().startsWith('CODE_')) return EventCategory.CODE_EXECUTION;
  if (type.toString().startsWith('VIOLATION_') || 
      type.toString().includes('FACE') || 
      type === EventType.SUSPICIOUS_ACTIVITY) return EventCategory.PROCTORING;
  if (type.toString().startsWith('SESSION_') || 
      type.toString().includes('CONNECTION')) return EventCategory.SYSTEM;
  return EventCategory.SYSTEM;
}

export default createAnalyticsRoutes;
