/**
 * Integrity Monitoring Controller
 * HTTP API endpoints for integrity monitoring and violation management
 * Epic 4 Task 4.3: Integrity Monitoring API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import RedisService from '../services/redis.service';
import IntegrityMonitoringService from '../services/integrity-monitoring.service';
import { AIAnalysisEngine } from '../services/ai-analysis.service';
import { Logger } from '../utils/logger.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  IntegrityMonitoringConfig,
  IntegrityMonitoringOptions,
  MonitoringMode,
  SensitivityLevel,
  IntegrityEvent,
  MonitoringStatistics,
  ViolationType,
} from '../types/integrity-monitoring.types';
import { ViolationSeverity } from '../types/ai-analysis.types';

const logger = new Logger('IntegrityMonitoringController');

export class IntegrityMonitoringController {
  private integrityService: IntegrityMonitoringService;

  constructor(
    private prisma: PrismaClient,
    private redisService: RedisService,
    private aiAnalysisEngine: AIAnalysisEngine,
    private options: IntegrityMonitoringOptions
  ) {
    this.integrityService = new IntegrityMonitoringService(
      prisma,
      redisService,
      aiAnalysisEngine,
      options
    );
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for integrity service
   */
  private setupEventListeners(): void {
    this.integrityService.on('violation-detected', event => {
      logger.info('Violation detected', {
        eventId: event.id,
        sessionId: event.sessionId,
        type: event.type,
        severity: event.severity,
      });
    });

    this.integrityService.on('alert-generated', data => {
      logger.info('Alert generated', {
        eventId: data.event.id,
        channelsSent: data.channelsSent,
      });
    });

    this.integrityService.on('session-monitoring-started', data => {
      logger.info('Session monitoring started', {
        sessionId: data.sessionId,
        userId: data.userId,
      });
    });

    this.integrityService.on('session-monitoring-stopped', data => {
      logger.info('Session monitoring stopped', {
        sessionId: data.sessionId,
      });
    });
  }

  /**
   * Start monitoring a session
   * POST /api/integrity-monitoring/sessions/:sessionId/start
   */
  async startSessionMonitoring(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { assessmentId, customConfig } = req.body;

      logger.info('Starting session monitoring request', {
        sessionId,
        userId: req.user.id,
        assessmentId,
      });

      // Validate session access
      const hasAccess = await this.validateSessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      // Start monitoring
      await this.integrityService.startSessionMonitoring(
        sessionId,
        req.user.id,
        assessmentId,
        customConfig
      );

      logger.info('Session monitoring started successfully', {
        sessionId,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          userId: req.user.id,
          assessmentId,
          status: 'monitoring_started',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to start session monitoring', {
        sessionId: req.params.sessionId,
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to start session monitoring',
        code: 'MONITORING_START_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Stop monitoring a session
   * POST /api/integrity-monitoring/sessions/:sessionId/stop
   */
  async stopSessionMonitoring(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      logger.info('Stopping session monitoring request', {
        sessionId,
        userId: req.user.id,
      });

      // Validate session access
      const hasAccess = await this.validateSessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      // Stop monitoring
      await this.integrityService.stopSessionMonitoring(sessionId);

      logger.info('Session monitoring stopped successfully', {
        sessionId,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          status: 'monitoring_stopped',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to stop session monitoring', {
        sessionId: req.params.sessionId,
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to stop session monitoring',
        code: 'MONITORING_STOP_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Get session monitoring statistics
   * GET /api/integrity-monitoring/sessions/:sessionId/statistics
   */
  async getSessionStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      logger.info('Getting session statistics', {
        sessionId,
        userId: req.user.id,
      });

      // Validate session access
      const hasAccess = await this.validateSessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      // Get statistics
      const statistics = await this.integrityService.getSessionStatistics(sessionId);

      if (!statistics) {
        res.status(404).json({
          success: false,
          message: 'Session statistics not found',
          code: 'STATISTICS_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          statistics,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get session statistics', {
        sessionId: req.params.sessionId,
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get session statistics',
        code: 'STATISTICS_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Get session violation events
   * GET /api/integrity-monitoring/sessions/:sessionId/events
   */
  async getSessionEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { page = 1, limit = 50, type, severity, resolved, startDate, endDate } = req.query;

      logger.info('Getting session events', {
        sessionId,
        userId: req.user.id,
        filters: { type, severity, resolved },
      });

      // Validate session access
      const hasAccess = await this.validateSessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      // Get events with filters
      const events = await this.getSessionEventsWithFilters(sessionId, {
        page: Number(page),
        limit: Number(limit),
        type: type as ViolationType,
        severity: severity as ViolationSeverity,
        resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          events: events.items,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: events.total,
            pages: Math.ceil(events.total / Number(limit)),
          },
          filters: { type, severity, resolved, startDate, endDate },
        },
      });
    } catch (error) {
      logger.error('Failed to get session events', {
        sessionId: req.params.sessionId,
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get session events',
        code: 'EVENTS_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Resolve a violation event
   * POST /api/integrity-monitoring/events/:eventId/resolve
   */
  async resolveViolationEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const { resolution, notes } = req.body;

      logger.info('Resolving violation event', {
        eventId,
        userId: req.user.id,
        resolution,
      });

      // Get event
      const event = await this.getEventById(eventId);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
          code: 'EVENT_NOT_FOUND',
        });
        return;
      }

      // Validate session access
      const hasAccess = await this.validateSessionAccess(event.sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to event',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      // Resolve event
      const resolvedEvent = await this.resolveEvent(event, req.user.id, resolution, notes);

      logger.info('Violation event resolved', {
        eventId,
        resolvedBy: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: {
          eventId,
          sessionId: event.sessionId,
          resolvedBy: req.user.id,
          resolution,
          notes,
          resolvedAt: resolvedEvent.resolvedAt,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to resolve violation event', {
        eventId: req.params.eventId,
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to resolve violation event',
        code: 'RESOLUTION_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Update monitoring configuration
   * PUT /api/integrity-monitoring/configuration
   */
  async updateConfiguration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { config } = req.body;

      logger.info('Updating monitoring configuration', {
        userId: req.user.id,
        configKeys: Object.keys(config || {}),
      });

      // Validate configuration
      const validationResult = this.validateConfiguration(config);
      if (!validationResult.valid) {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration',
          code: 'INVALID_CONFIGURATION',
          errors: validationResult.errors,
        });
        return;
      }

      // Update configuration
      await this.integrityService.updateConfiguration(config);

      logger.info('Monitoring configuration updated successfully', {
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Configuration updated successfully',
          updatedBy: req.user.id,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update monitoring configuration', {
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update configuration',
        code: 'CONFIGURATION_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Get monitoring service status
   * GET /api/integrity-monitoring/status
   */
  async getServiceStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Getting service status', { userId: req.user.id });

      const status = await this.integrityService.getHealthStatus();

      res.status(200).json({
        success: true,
        data: {
          service: 'integrity-monitoring',
          ...status,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get service status', {
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get service status',
        code: 'STATUS_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Generate integrity monitoring report
   * POST /api/integrity-monitoring/reports/generate
   */
  async generateReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        sessionIds,
        dateRange,
        format = 'json',
        includeEvents = false,
        includeStatistics = true,
      } = req.body;

      logger.info('Generating integrity monitoring report', {
        userId: req.user.id,
        sessionCount: sessionIds?.length || 0,
        format,
        dateRange,
      });

      // Validate session access for all sessions
      const validSessions = [];
      for (const sessionId of sessionIds || []) {
        const hasAccess = await this.validateSessionAccess(sessionId, req.user.id);
        if (hasAccess) {
          validSessions.push(sessionId);
        }
      }

      if (validSessions.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid sessions provided',
          code: 'NO_VALID_SESSIONS',
        });
        return;
      }

      // Generate report
      const report = await this.generateIntegrityReport({
        sessionIds: validSessions,
        dateRange,
        format,
        includeEvents,
        includeStatistics,
      });

      logger.info('Integrity monitoring report generated', {
        userId: req.user.id,
        sessionCount: validSessions.length,
        format,
      });

      res.status(200).json({
        success: true,
        data: {
          report,
          metadata: {
            generatedBy: req.user.id,
            generatedAt: new Date(),
            sessionCount: validSessions.length,
            format,
            includeEvents,
            includeStatistics,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to generate integrity monitoring report', {
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate report',
        code: 'REPORT_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Get real-time monitoring dashboard data
   * GET /api/integrity-monitoring/dashboard
   */
  async getDashboardData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { timeRange = '1h' } = req.query;

      logger.info('Getting dashboard data', {
        userId: req.user.id,
        timeRange,
      });

      const dashboardData = await this.generateDashboardData(timeRange as string);

      res.status(200).json({
        success: true,
        data: {
          dashboard: dashboardData,
          timeRange,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get dashboard data', {
        userId: req.user.id,
        error: (error as any).message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard data',
        code: 'DASHBOARD_ERROR',
        error: (error as any).message,
      });
    }
  }

  // Private helper methods

  private async validateSessionAccess(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Check if session exists and user has access
      const session = await this.redisService.get(`webrtc:session:${sessionId}`);
      if (!session) {
        return false;
      }

      const sessionData = JSON.parse(session as string);
      return sessionData.userId === userId;
    } catch (error) {
      logger.error('Session access validation failed', { sessionId, userId, error });
      return false;
    }
  }

  private async getSessionEventsWithFilters(
    sessionId: string,
    filters: {
      page: number;
      limit: number;
      type?: ViolationType;
      severity?: ViolationSeverity;
      resolved?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ items: IntegrityEvent[]; total: number }> {
    try {
      // Get event IDs from Redis list
      const eventIds = await this.redisService.listRange(
        `integrity:session:${sessionId}:events`,
        0,
        -1
      );

      const events: IntegrityEvent[] = [];

      // Get event details
      for (const eventId of eventIds) {
        const eventData = await this.redisService.get(`integrity:event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData as string);

          // Apply filters
          if (filters.type && event.type !== filters.type) {
            continue;
          }
          if (filters.severity && event.severity !== filters.severity) {
            continue;
          }
          if (filters.resolved !== undefined && event.resolved !== filters.resolved) {
            continue;
          }
          if (filters.startDate && new Date(event.timestamp) < filters.startDate) {
            continue;
          }
          if (filters.endDate && new Date(event.timestamp) > filters.endDate) {
            continue;
          }

          events.push(event);
        }
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Paginate
      const total = events.length;
      const startIndex = (filters.page - 1) * filters.limit;
      const endIndex = startIndex + filters.limit;
      const paginatedEvents = events.slice(startIndex, endIndex);

      return { items: paginatedEvents, total };
    } catch (error) {
      logger.error('Failed to get session events with filters', { sessionId, error });
      return { items: [], total: 0 };
    }
  }

  private async getEventById(eventId: string): Promise<IntegrityEvent | null> {
    try {
      const eventData = await this.redisService.get(`integrity:event:${eventId}`);
      if (!eventData) {
        return null;
      }

      return JSON.parse(eventData as string);
    } catch (error) {
      logger.error('Failed to get event by ID', { eventId, error });
      return null;
    }
  }

  private async resolveEvent(
    event: IntegrityEvent,
    resolvedBy: string,
    resolution: string,
    notes?: string
  ): Promise<IntegrityEvent> {
    try {
      const resolvedEvent = {
        ...event,
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        metadata: {
          ...event.metadata,
          resolution,
          resolutionNotes: notes,
        },
      };

      // Update event in Redis
      await this.redisService.set(`integrity:event:${event.id}`, JSON.stringify(resolvedEvent));

      return resolvedEvent;
    } catch (error) {
      logger.error('Failed to resolve event', { eventId: event.id, error });
      throw error;
    }
  }

  private validateConfiguration(config: Partial<IntegrityMonitoringConfig>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate basic structure
    if (config.mode && !Object.values(MonitoringMode).includes(config.mode)) {
      errors.push('Invalid monitoring mode');
    }

    if (config.sensitivity && !Object.values(SensitivityLevel).includes(config.sensitivity)) {
      errors.push('Invalid sensitivity level');
    }

    // Validate thresholds
    if (config.thresholds) {
      if (config.thresholds.face?.noFaceDetected?.confidence) {
        const confidence = config.thresholds.face.noFaceDetected.confidence;
        if (confidence < 0 || confidence > 1) {
          errors.push('Face detection confidence must be between 0 and 1');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async generateIntegrityReport(options: {
    sessionIds: string[];
    dateRange?: { start: Date; end: Date };
    format: string;
    includeEvents: boolean;
    includeStatistics: boolean;
  }): Promise<any> {
    const report: any = {
      summary: {
        sessionCount: options.sessionIds.length,
        generatedAt: new Date(),
        dateRange: options.dateRange,
      },
      sessions: [],
    };

    // Generate report for each session
    for (const sessionId of options.sessionIds) {
      const sessionReport: any = {
        sessionId,
        statistics: null,
        events: [],
      };

      if (options.includeStatistics) {
        sessionReport.statistics = await this.integrityService.getSessionStatistics(sessionId);
      }

      if (options.includeEvents) {
        const events = await this.getSessionEventsWithFilters(sessionId, {
          page: 1,
          limit: 1000, // Get all events for report
          startDate: options.dateRange?.start,
          endDate: options.dateRange?.end,
        });
        sessionReport.events = events.items;
      }

      report.sessions.push(sessionReport);
    }

    return report;
  }

  private async generateDashboardData(timeRange: string): Promise<any> {
    // Generate real-time dashboard data
    return {
      overview: {
        activeSessions: 0,
        totalViolations: 0,
        criticalAlerts: 0,
        averageRiskScore: 0,
      },
      recentEvents: [],
      violationTrends: [],
      topViolationTypes: [],
      systemHealth: {
        status: 'healthy',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        performance: {
          averageResponseTime: 0,
          throughput: 0,
        },
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up Integrity Monitoring Controller');

    if (this.integrityService) {
      await this.integrityService.cleanup();
    }

    logger.info('Integrity Monitoring Controller cleanup completed');
  }
}
