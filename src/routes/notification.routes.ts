/**
 * Enhanced Notification Routes - Epic 6: Advanced Notification & Communication
 *
 * Comprehensive notification system with workflows, templates, and multi-channel support:
 * - Advanced notification workflows with conditional logic
 * - Dynamic template engine with variable substitution
 * - Multi-channel orchestration (email, SMS, push, in-app)
 * - Brand customization and localization
 * - A/B testing and analytics
 * - Escalation workflows for critical alerts
 * - Integration with bias detection system
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { NotificationController } from '@/controllers/notification.controller';
import { AuthMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { Logger } from '../utils/logger.util';
import { advancedNotificationWorkflowService } from '../services/notification-workflow.service';
import { enhancedTemplateService } from '../services/template-engine.service';

export function createNotificationRoutes(
  notificationController: NotificationController,
  logger: Logger
): Router {
  const router = Router();

  // Enhanced authentication middleware
  const authenticateToken = AuthMiddleware.authenticate;

  // Middleware for request logging
  router.use((req, _res, next) => {
    logger.info('Advanced Notification API request', {
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
    next();
  });

  /**
   * Send notification
   * POST /api/notifications
   * Requires authentication
   */
  router.post(
    '/',
    AuthMiddleware.authenticate as any,
    notificationController.sendNotification.bind(notificationController)
  );

  /**
   * Get notifications
   * GET /api/notifications
   * Requires authentication
   */
  router.get(
    '/',
    AuthMiddleware.authenticate as any,
    notificationController.getNotifications.bind(notificationController)
  );

  /**
   * Get notification by ID
   * GET /api/notifications/:id
   * Requires authentication
   */
  router.get(
    '/:id',
    AuthMiddleware.authenticate as any,
    notificationController.getNotificationById.bind(notificationController)
  );

  /**
   * Get user preferences
   * GET /api/notifications/preferences
   * Requires authentication
   */
  router.get(
    '/preferences',
    AuthMiddleware.authenticate as any,
    notificationController.getUserPreferences.bind(notificationController)
  );

  /**
   * Update user preferences
   * PUT /api/notifications/preferences
   * Requires authentication
   */
  router.put(
    '/preferences',
    AuthMiddleware.authenticate as any,
    notificationController.updateUserPreferences.bind(notificationController)
  );

  /**
   * Handle unsubscribe (POST for form submission)
   * POST /api/notifications/unsubscribe
   * Public endpoint - no authentication required
   */
  router.post(
    '/unsubscribe',
    notificationController.handleUnsubscribe.bind(notificationController)
  );

  /**
   * Get unsubscribe page (GET for email links)
   * GET /api/notifications/unsubscribe
   * Public endpoint - no authentication required
   */
  router.get(
    '/unsubscribe',
    notificationController.getUnsubscribePage.bind(notificationController)
  );

  /**
   * Get notification analytics
   * GET /api/notifications/analytics
   * Requires authentication and admin role
   */
  router.get(
    '/analytics',
    AuthMiddleware.authenticate as any,
    notificationController.getAnalytics.bind(notificationController)
  );

  /**
   * Test notification delivery
   * POST /api/notifications/test
   * Requires authentication and admin role
   */
  router.post(
    '/test',
    AuthMiddleware.authenticate as any,
    notificationController.testNotification.bind(notificationController)
  );

  /**
   * Handle provider webhooks
   * POST /api/notifications/webhooks/:provider
   * Public endpoint - no authentication required (webhook verification handled internally)
   */
  router.post(
    '/webhooks/:provider',
    notificationController.handleWebhook.bind(notificationController)
  );

  /**
   * Get notification templates
   * GET /api/notifications/templates
   * Requires authentication and admin role
   */
  router.get(
    '/templates',
    AuthMiddleware.authenticate as any,
    notificationController.getTemplates.bind(notificationController)
  );

  /**
   * Create notification template
   * POST /api/notifications/templates
   * Requires authentication and admin role
   */
  router.post(
    '/templates',
    AuthMiddleware.authenticate as any,
    notificationController.createTemplate.bind(notificationController)
  );

  // Error handling middleware
  router.use((err: any, req: any, res: any, next: any) => {
    logger.error('Notification API error', err as Error, {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
    });

    // Handle specific notification errors
    if (err.name === 'NotificationError') {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          metadata: err.metadata,
        },
      });
    }

    if (err.name === 'TemplateError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: err.message,
          metadata: err.metadata,
        },
      });
    }

    if (err.name === 'DeliveryError') {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELIVERY_ERROR',
          message: err.message,
          metadata: err.metadata,
        },
      });
    }

    if (err.name === 'RateLimitError') {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: err.message,
          metadata: err.metadata,
        },
      });
    }

    if (err.name === 'ConsentError') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: err.message,
          metadata: err.metadata,
        },
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: err.details,
        },
      });
    }

    // Handle authentication errors
    if (err.name === 'UnauthorizedError' || err.status === 401) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Handle authorization errors
    if (err.name === 'ForbiddenError' || err.status === 403) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    // Generic error handler
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  return router;
}

export default createNotificationRoutes;
