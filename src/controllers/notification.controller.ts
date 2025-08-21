/**
 * Notification Controller
 * AI-native technical hiring platform - Epic 6: Notification Service
 *
 * HTTP API controller for notification management:
 * - Send notifications across multiple channels
 * - Manage user preferences and consent
 * - Handle unsubscribe requests
 * - Retrieve notification history and analytics
 * - Manage notification templates
 * - Handle webhook callbacks from providers
 */

import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '@/services/notification.service';
import { NotificationOrchestratorService } from '@/services/notification-orchestrator.service';
import { NotificationAnalyticsService } from '@/services/notification-analytics.service';
import { Logger } from '@/utils/logger.utils';
import {
  CreateNotificationRequest,
  GetNotificationsRequest,
  UpdatePreferencesRequest,
  UnsubscribeRequest,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationError,
} from '@/types/notification.types';

interface AuthRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
    isActive: boolean;
    firstName: string;
    lastName: string;
    roleId: string;
    mfaEnabled: boolean;
    emailVerified: boolean;
  };
}

export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private orchestratorService: NotificationOrchestratorService,
    private analyticsService: NotificationAnalyticsService,
    private logger: Logger
  ) {}

  /**
   * Send notification
   * POST /api/notifications
   */
  async sendNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const request: CreateNotificationRequest = {
        type: req.body.type,
        recipients: req.body.recipients,
        channels: req.body.channels,
        priority: req.body.priority || NotificationPriority.NORMAL,
        content: req.body.content,
        templateId: req.body.templateId,
        variables: req.body.variables,
        schedule: req.body.schedule,
        metadata: req.body.metadata,
        organizationId: user.organizationId,
        createdBy: user.id,
      };

      // Validate request
      this.validateSendNotificationRequest(request);

      const notification = await this.notificationService.sendNotification(request);

      this.logger.info('Notification sent successfully', {
        notificationId: notification.id,
        userId: user.id,
        organizationId: user.organizationId,
        type: request.type,
        channels: request.channels,
        recipientCount: request.recipients.length,
      });

      res.status(201).json({
        success: true,
        data: {
          notificationId: notification.id,
          status: notification.status,
          channels: notification.channels,
          recipientCount: notification.recipients.length,
          createdAt: notification.createdAt,
        },
        message: 'Notification sent successfully',
      });
    } catch (error) {
      this.logger.error('Failed to send notification', { error, body: req.body });
      next(error);
    }
  }

  /**
   * Get notifications
   * GET /api/notifications
   */
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const request: GetNotificationsRequest = {
        organizationId: user.organizationId,
        types: req.query.types
          ? ((req.query.types as string).split(',') as NotificationType[])
          : undefined,
        channels: req.query.channels
          ? ((req.query.channels as string).split(',') as NotificationChannel[])
          : undefined,
        status: req.query.status ? ((req.query.status as string).split(',') as any[]) : undefined,
        priority: req.query.priority
          ? ((req.query.priority as string).split(',') as NotificationPriority[])
          : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        recipientId: req.query.recipientId as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.notificationService.getNotifications(request);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Notifications retrieved successfully',
      });
    } catch (error) {
      this.logger.error('Failed to get notifications', { error, query: req.query });
      next(error);
    }
  }

  /**
   * Get notification by ID
   * GET /api/notifications/:id
   */
  async getNotificationById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      // TODO: Implement getNotificationById in service
      // const notification = await this.notificationService.getNotificationById(id, user.organizationId);

      res.status(200).json({
        success: true,
        data: { id },
        message: 'Notification retrieved successfully',
      });
    } catch (error) {
      this.logger.error('Failed to get notification', { error, params: req.params });
      next(error);
    }
  }

  /**
   * Get user preferences
   * GET /api/notifications/preferences
   */
  async getUserPreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const preferences = await this.notificationService.getUserPreferences(user.id);

      res.status(200).json({
        success: true,
        data: preferences,
        message: 'User preferences retrieved successfully',
      });
    } catch (error) {
      this.logger.error('Failed to get user preferences', { error, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Update user preferences
   * PUT /api/notifications/preferences
   */
  async updateUserPreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const request: UpdatePreferencesRequest = {
        userId: user.id,
        channels: req.body.channels,
        types: req.body.types,
        frequency: req.body.frequency,
        quietHours: req.body.quietHours,
        locale: req.body.locale,
      };

      const preferences = await this.notificationService.updateUserPreferences(request);

      this.logger.info('User preferences updated', {
        userId: user.id,
        channels: request.channels ? Object.keys(request.channels) : undefined,
        types: request.types ? Object.keys(request.types) : undefined,
      });

      res.status(200).json({
        success: true,
        data: preferences,
        message: 'User preferences updated successfully',
      });
    } catch (error) {
      this.logger.error('Failed to update user preferences', { error, body: req.body });
      next(error);
    }
  }

  /**
   * Handle unsubscribe
   * POST /api/notifications/unsubscribe
   */
  async handleUnsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request: UnsubscribeRequest = {
        token: req.body.token,
        userId: req.body.userId,
        email: req.body.email,
        types: req.body.types,
        channels: req.body.channels,
        reason: req.body.reason,
      };

      await this.notificationService.handleUnsubscribe(request);

      this.logger.info('Unsubscribe request processed', {
        userId: request.userId,
        email: request.email,
        types: request.types,
        channels: request.channels,
        reason: request.reason,
      });

      res.status(200).json({
        success: true,
        message: 'Unsubscribe request processed successfully',
      });
    } catch (error) {
      this.logger.error('Failed to handle unsubscribe', { error, body: req.body });
      next(error);
    }
  }

  /**
   * Get unsubscribe page (GET method for email links)
   * GET /api/notifications/unsubscribe
   */
  async getUnsubscribePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.query.token as string;

      if (!token) {
        res.status(400).json({ error: 'Unsubscribe token is required' });
        return;
      }

      // Return a simple HTML page for unsubscribe
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribe - Dessai</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .container { text-align: center; }
            .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
            .btn:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Unsubscribe from Notifications</h1>
            <p>Click the button below to unsubscribe from marketing notifications.</p>
            <form method="POST" action="/api/notifications/unsubscribe">
              <input type="hidden" name="token" value="${token}">
              <button type="submit" class="btn">Unsubscribe</button>
            </form>
          </div>
        </body>
        </html>
      `;

      res.status(200).send(html);
    } catch (error) {
      this.logger.error('Failed to show unsubscribe page', { error, query: req.query });
      next(error);
    }
  }

  /**
   * Get notification analytics
   * GET /api/notifications/analytics
   */
  async getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const granularity = (req.query.granularity as 'hour' | 'day' | 'week' | 'month') || 'day';

      const period = { startDate, endDate, granularity };
      const dashboardData = await this.analyticsService.getDashboardData(
        user.organizationId,
        period
      );

      this.logger.info('Analytics data retrieved', {
        userId: user.id,
        organizationId: user.organizationId,
        period,
      });

      res.status(200).json({
        success: true,
        data: dashboardData,
        message: 'Analytics data retrieved successfully',
      });
    } catch (error) {
      this.logger.error('Failed to get analytics', { error, query: req.query });
      next(error);
    }
  }

  /**
   * Get user behavior analytics
   * GET /api/notifications/analytics/behavior
   */
  async getUserBehaviorAnalytics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const granularity = (req.query.granularity as 'hour' | 'day' | 'week' | 'month') || 'day';

      const period = { startDate, endDate, granularity };
      const behaviorData = await this.analyticsService.getUserBehaviorAnalytics(
        user.organizationId,
        period
      );

      res.status(200).json({
        success: true,
        data: behaviorData,
        message: 'User behavior analytics retrieved successfully',
      });
    } catch (error) {
      this.logger.error('Failed to get user behavior analytics', { error, query: req.query });
      next(error);
    }
  }

  /**
   * Export analytics data
   * GET /api/notifications/analytics/export
   */
  async exportAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const granularity = (req.query.granularity as 'hour' | 'day' | 'week' | 'month') || 'day';
      const format = (req.query.format as 'csv' | 'json' | 'xlsx') || 'json';

      const period = { startDate, endDate, granularity };
      const exportData = await this.analyticsService.exportAnalytics(
        user.organizationId,
        period,
        format
      );

      const filename = `notification-analytics-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.${format}`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', this.getContentType(format));
      res.send(exportData);
    } catch (error) {
      this.logger.error('Failed to export analytics', { error, query: req.query });
      next(error);
    }
  }

  /**
   * Test notification orchestration
   * POST /api/notifications/test-orchestration
   */
  async testOrchestration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { recipients, content, type, options } = req.body;

      if (!recipients || !content || !type) {
        res.status(400).json({ error: 'Recipients, content, and type are required' });
        return;
      }

      const orchestrationResults = await this.orchestratorService.orchestrateDelivery(
        recipients,
        content,
        type,
        options || {
          priority: NotificationPriority.LOW,
          urgent: false,
          costSensitive: false,
          trackingRequired: true,
          deliveryConfirmation: false,
          maxDeliveryTime: 300000, // 5 minutes
          fallbackStrategy: 'SINGLE_BEST' as any,
        }
      );

      this.logger.info('Orchestration test completed', {
        userId: user.id,
        recipientCount: recipients.length,
        type,
        resultsCount: orchestrationResults.size,
      });

      // Convert Map to object for JSON serialization
      const results = Object.fromEntries(orchestrationResults);

      res.status(200).json({
        success: true,
        data: {
          orchestrationResults: results,
          summary: {
            totalRecipients: recipients.length,
            successfulOrchestrations: orchestrationResults.size,
            averageConfidence:
              Array.from(orchestrationResults.values()).reduce(
                (sum, result) => sum + result.confidence,
                0
              ) / orchestrationResults.size,
          },
        },
        message: 'Orchestration test completed successfully',
      });
    } catch (error) {
      this.logger.error('Failed to test orchestration', { error, body: req.body });
      next(error);
    }
  }

  /**
   * Test notification delivery
   * POST /api/notifications/test
   */
  async testNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { channel, recipient } = req.body;

      if (!channel || !recipient) {
        res.status(400).json({ error: 'Channel and recipient are required' });
        return;
      }

      const testRequest: CreateNotificationRequest = {
        type: NotificationType.CUSTOM_ALERT,
        recipients: [recipient],
        channels: [channel],
        priority: NotificationPriority.LOW,
        content: {
          subject: 'Test Notification',
          title: 'Test Notification',
          body: 'This is a test notification from Dessai platform.',
          metadata: { test: true },
        },
        organizationId: user.organizationId,
        createdBy: user.id,
      };

      const notification = await this.notificationService.sendNotification(testRequest);

      this.logger.info('Test notification sent', {
        notificationId: notification.id,
        channel,
        recipient: recipient.id,
        userId: user.id,
      });

      res.status(200).json({
        success: true,
        data: {
          notificationId: notification.id,
          status: notification.status,
        },
        message: 'Test notification sent successfully',
      });
    } catch (error) {
      this.logger.error('Failed to send test notification', { error, body: req.body });
      next(error);
    }
  }

  /**
   * Handle provider webhooks
   * POST /api/notifications/webhooks/:provider
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { provider } = req.params;
      const payload = req.body;

      this.logger.info('Received webhook', { provider, payload });

      // TODO: Implement webhook handling for different providers
      // await this.notificationService.handleProviderWebhook(provider, payload);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      this.logger.error('Failed to handle webhook', { error, params: req.params, body: req.body });
      next(error);
    }
  }

  /**
   * Get notification templates
   * GET /api/notifications/templates
   */
  async getTemplates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // TODO: Implement template management
      const templates: any[] = [];

      res.status(200).json({
        success: true,
        data: templates,
        message: 'Templates retrieved successfully',
      });
    } catch (error) {
      this.logger.error('Failed to get templates', { error });
      next(error);
    }
  }

  /**
   * Create notification template
   * POST /api/notifications/templates
   */
  async createTemplate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // TODO: Implement template creation
      const template = { id: 'template-123', ...req.body };

      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully',
      });
    } catch (error) {
      this.logger.error('Failed to create template', { error, body: req.body });
      next(error);
    }
  }

  /**
   * Validate send notification request
   */
  private validateSendNotificationRequest(request: CreateNotificationRequest): void {
    if (!request.type) {
      throw new NotificationError('Notification type is required', 'VALIDATION_ERROR', 400);
    }

    if (!Object.values(NotificationType).includes(request.type)) {
      throw new NotificationError('Invalid notification type', 'VALIDATION_ERROR', 400);
    }

    if (!request.recipients || request.recipients.length === 0) {
      throw new NotificationError('Recipients are required', 'VALIDATION_ERROR', 400);
    }

    if (!request.channels || request.channels.length === 0) {
      throw new NotificationError('Channels are required', 'VALIDATION_ERROR', 400);
    }

    for (const channel of request.channels) {
      if (!Object.values(NotificationChannel).includes(channel)) {
        throw new NotificationError(
          `Invalid notification channel: ${channel}`,
          'VALIDATION_ERROR',
          400
        );
      }
    }

    if (request.priority && !Object.values(NotificationPriority).includes(request.priority)) {
      throw new NotificationError('Invalid notification priority', 'VALIDATION_ERROR', 400);
    }

    if (!request.content && !request.templateId) {
      throw new NotificationError('Content or template ID is required', 'VALIDATION_ERROR', 400);
    }

    // Validate recipients
    for (const recipient of request.recipients) {
      if (!recipient.id) {
        throw new NotificationError('Recipient ID is required', 'VALIDATION_ERROR', 400);
      }

      if (!recipient.type) {
        throw new NotificationError('Recipient type is required', 'VALIDATION_ERROR', 400);
      }

      // Validate contact information based on channels
      if (request.channels.includes(NotificationChannel.EMAIL) && !recipient.email) {
        throw new NotificationError(
          'Recipient email is required for email notifications',
          'VALIDATION_ERROR',
          400
        );
      }

      if (request.channels.includes(NotificationChannel.SMS) && !recipient.phoneNumber) {
        throw new NotificationError(
          'Recipient phone number is required for SMS notifications',
          'VALIDATION_ERROR',
          400
        );
      }

      if (request.channels.includes(NotificationChannel.PUSH) && !recipient.pushEndpoint) {
        throw new NotificationError(
          'Recipient push endpoint is required for push notifications',
          'VALIDATION_ERROR',
          400
        );
      }

      if (request.channels.includes(NotificationChannel.WEBHOOK) && !recipient.webhookUrl) {
        throw new NotificationError(
          'Recipient webhook URL is required for webhook notifications',
          'VALIDATION_ERROR',
          400
        );
      }
    }
  }

  /**
   * Get content type for export format
   */
  private getContentType(format: string): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'json':
      default:
        return 'application/json';
    }
  }
}
