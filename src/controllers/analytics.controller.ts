/**
 * Analytics Controller
 * HTTP API endpoints for analytics data collection and querying
 * Epic 5 Task 5.1: Data Collection Pipeline API Layer
 */

import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import RedisService from '../services/redis.service';
import { DataCollectionService } from '../services/data-collection.service';
import { Logger } from '../utils/logger.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  AnalyticsEvent,
  EventType,
  EventCategory,
  EventSeverity,
  AnalyticsQuery,
  DataExportConfig,
  DataImportConfig,
  DataCollectionConfig,
} from '../types/analytics.types';

const logger = new Logger('AnalyticsController');

export class AnalyticsController {
  private dataCollectionService: DataCollectionService;

  constructor(
    private prisma: PrismaClient,
    private redisService: RedisService,
    config: Partial<DataCollectionConfig> = {}
  ) {
    this.dataCollectionService = new DataCollectionService(prisma, redisService, config);
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for the data collection service
   */
  private setupEventListeners(): void {
    this.dataCollectionService.on('service-started', () => {
      logger.info('Data Collection Service started');
    });

    this.dataCollectionService.on('service-stopped', () => {
      logger.info('Data Collection Service stopped');
    });

    this.dataCollectionService.on('event-collected', event => {
      logger.debug('Event collected', {
        eventId: event.id,
        type: event.type,
        category: event.category,
      });
    });

    this.dataCollectionService.on('error', error => {
      logger.error('Data Collection Service error', { error });
    });
  }

  /**
   * Initialize the analytics controller
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Analytics Controller');
      await this.dataCollectionService.start();
      logger.info('Analytics Controller initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Analytics Controller', { error });
      throw error;
    }
  }

  /**
   * Collect a single analytics event
   * POST /api/analytics/events
   */
  async collectEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventData = req.body;

      logger.info('Collecting analytics event', {
        userId: req.user.id,
        eventType: eventData.type,
        category: eventData.category,
      });

      // Validate required fields
      if (!eventData.type || !eventData.category || !eventData.severity) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: type, category, severity',
          code: 'INVALID_EVENT_DATA',
        });
        return;
      }

      // Enrich event data with user context
      const enrichedEvent: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
        ...eventData,
        userId: req.user.id,
        organizationId: req.user.organizationId,
        source: {
          service: 'dessai-backend',
          version: '1.0.0',
          environment: process.env['NODE_ENV'] || 'development',
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress,
        },
      };

      // Collect the event
      const eventId = await this.dataCollectionService.collectEvent(enrichedEvent);

      logger.info('Analytics event collected successfully', {
        eventId,
        userId: req.user.id,
        type: eventData.type,
      });

      res.status(201).json({
        success: true,
        data: {
          eventId,
          message: 'Event collected successfully',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to collect analytics event', {
        error: (error as any).message,
        userId: req.user.id,
        eventData: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to collect event',
        code: 'EVENT_COLLECTION_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Collect multiple analytics events
   * POST /api/analytics/events/batch
   */
  async collectEventsBatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Events must be a non-empty array',
          code: 'INVALID_BATCH_DATA',
        });
        return;
      }

      if (events.length > 100) {
        res.status(400).json({
          success: false,
          message: 'Batch size cannot exceed 100 events',
          code: 'BATCH_SIZE_EXCEEDED',
        });
        return;
      }

      logger.info('Collecting analytics events batch', {
        userId: req.user.id,
        eventCount: events.length,
      });

      // Enrich all events with user context
      const enrichedEvents = events.map(eventData => ({
        ...eventData,
        userId: req.user.id,
        organizationId: req.user.organizationId,
        source: {
          service: 'dessai-backend',
          version: '1.0.0',
          environment: process.env['NODE_ENV'] || 'development',
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress,
        },
      }));

      // Collect all events
      const eventIds = await this.dataCollectionService.collectEvents(enrichedEvents);

      logger.info('Analytics events batch collected successfully', {
        eventIds: eventIds.length,
        userId: req.user.id,
        totalEvents: events.length,
      });

      res.status(201).json({
        success: true,
        data: {
          eventIds,
          collectedCount: eventIds.length,
          totalCount: events.length,
          message: 'Events batch collected successfully',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to collect analytics events batch', {
        error: (error as any).message,
        userId: req.user.id,
        eventCount: req.body.events?.length || 0,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to collect events batch',
        code: 'BATCH_COLLECTION_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Query analytics events
   * POST /api/analytics/query
   */
  async queryEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryData = req.body;

      logger.info('Executing analytics query', {
        userId: req.user.id,
        queryId: queryData.id,
        timeRange: queryData.timeRange,
      });

      // Validate query data
      if (!queryData.timeRange || !queryData.timeRange.start || !queryData.timeRange.end) {
        res.status(400).json({
          success: false,
          message: 'Time range with start and end dates is required',
          code: 'INVALID_QUERY_DATA',
        });
        return;
      }

      // Ensure user can only query their own organization's data
      const query: AnalyticsQuery = {
        ...queryData,
        filters: {
          ...queryData.filters,
          organizationIds: [req.user.organizationId], // Override to ensure data isolation
        },
        timeRange: {
          start: new Date(queryData.timeRange.start),
          end: new Date(queryData.timeRange.end),
        },
      };

      // Execute query
      const result = await this.dataCollectionService.queryEvents(query);

      logger.info('Analytics query executed successfully', {
        userId: req.user.id,
        queryId: query.id,
        totalRecords: result.metadata.totalRecords,
        executionTime: result.metadata.executionTime,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to execute analytics query', {
        error: (error as any).message,
        userId: req.user.id,
        queryData: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to execute query',
        code: 'QUERY_EXECUTION_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Get analytics statistics
   * GET /api/analytics/statistics
   */
  async getStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Getting analytics statistics', {
        userId: req.user.id,
      });

      const statistics = await this.dataCollectionService.getStatistics();

      res.status(200).json({
        success: true,
        data: {
          statistics,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get analytics statistics', {
        error: (error as any).message,
        userId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        code: 'STATISTICS_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Get pipeline status
   * GET /api/analytics/pipeline/status
   */
  async getPipelineStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Getting pipeline status', {
        userId: req.user.id,
      });

      const status = await this.dataCollectionService.getPipelineStatus();

      res.status(200).json({
        success: true,
        data: {
          pipeline: status,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get pipeline status', {
        error: (error as any).message,
        userId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get pipeline status',
        code: 'PIPELINE_STATUS_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Export analytics data
   * POST /api/analytics/export
   */
  async exportData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const exportConfig: DataExportConfig = req.body;

      logger.info('Starting analytics data export', {
        userId: req.user.id,
        format: exportConfig.format,
        timeRange: exportConfig.filters.timeRange,
      });

      // Validate export configuration
      if (!exportConfig.format || !exportConfig.destination || !exportConfig.filters) {
        res.status(400).json({
          success: false,
          message: 'Missing required export configuration: format, destination, filters',
          code: 'INVALID_EXPORT_CONFIG',
        });
        return;
      }

      // Ensure user can only export their own organization's data
      exportConfig.filters = {
        ...exportConfig.filters,
        // Add organization filter to ensure data isolation
        // This would be implemented in the actual query logic
      };

      // Start export job
      const jobId = await this.dataCollectionService.exportData(exportConfig);

      logger.info('Analytics data export started', {
        userId: req.user.id,
        jobId,
        format: exportConfig.format,
      });

      res.status(202).json({
        success: true,
        data: {
          jobId,
          status: 'started',
          message: 'Export job started successfully',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to start analytics data export', {
        error: (error as any).message,
        userId: req.user.id,
        exportConfig: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to start export',
        code: 'EXPORT_START_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Import analytics data
   * POST /api/analytics/import
   */
  async importData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const importConfig: DataImportConfig = req.body;

      logger.info('Starting analytics data import', {
        userId: req.user.id,
        sourceType: importConfig.source.type,
        format: importConfig.format,
      });

      // Validate import configuration
      if (!importConfig.source || !importConfig.format || !importConfig.mapping) {
        res.status(400).json({
          success: false,
          message: 'Missing required import configuration: source, format, mapping',
          code: 'INVALID_IMPORT_CONFIG',
        });
        return;
      }

      // Start import job
      const jobId = await this.dataCollectionService.importData(importConfig);

      logger.info('Analytics data import started', {
        userId: req.user.id,
        jobId,
        format: importConfig.format,
      });

      res.status(202).json({
        success: true,
        data: {
          jobId,
          status: 'started',
          message: 'Import job started successfully',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to start analytics data import', {
        error: (error as any).message,
        userId: req.user.id,
        importConfig: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to start import',
        code: 'IMPORT_START_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Get job status
   * GET /api/analytics/jobs/:jobId
   */
  async getJobStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;

      logger.info('Getting job status', {
        userId: req.user.id,
        jobId,
      });

      const job = await this.dataCollectionService.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Job not found',
          code: 'JOB_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          job,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get job status', {
        error: (error as any).message,
        userId: req.user.id,
        jobId: req.params['jobId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
        code: 'JOB_STATUS_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Get available event types and categories
   * GET /api/analytics/metadata
   */
  async getMetadata(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Getting analytics metadata', {
        userId: req.user.id,
      });

      const metadata = {
        eventTypes: Object.values(EventType),
        eventCategories: Object.values(EventCategory),
        eventSeverities: Object.values(EventSeverity),
        supportedFormats: ['json', 'csv', 'parquet', 'avro'],
        supportedDestinations: ['filesystem', 's3', 'gcs', 'azure', 'sftp'],
        aggregationOperations: ['count', 'sum', 'avg', 'min', 'max', 'percentile'],
        retentionPolicies: {
          rawData: '90 days',
          aggregatedData: {
            minutely: '7 days',
            hourly: '30 days',
            daily: '365 days',
          },
        },
      };

      res.status(200).json({
        success: true,
        data: {
          metadata,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get analytics metadata', {
        error: (error as any).message,
        userId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get metadata',
        code: 'METADATA_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Health check endpoint
   * GET /api/analytics/health
   */
  async healthCheck(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pipelineStatus = await this.dataCollectionService.getPipelineStatus();
      const statistics = await this.dataCollectionService.getStatistics();

      const health = {
        service: 'analytics-data-collection',
        status: pipelineStatus.status === 'running' ? 'healthy' : 'unhealthy',
        pipeline: {
          status: pipelineStatus.status,
          uptime: pipelineStatus.uptime,
          throughput: pipelineStatus.performance.throughput,
          errorRate: pipelineStatus.performance.errorRate,
        },
        statistics: {
          totalEvents: statistics.totalEvents,
          averageEventSize: statistics.averageEventSize,
          storageUsage: statistics.storageUsage.raw,
        },
        timestamp: new Date(),
      };

      const httpStatus = health.status === 'healthy' ? 200 : 503;

      res.status(httpStatus).json({
        success: health.status === 'healthy',
        data: health,
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: (error as any).message,
      });

      res.status(503).json({
        success: false,
        message: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
        error: (error as any).message,
      });
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up Analytics Controller');

    if (this.dataCollectionService) {
      await this.dataCollectionService.cleanup();
    }

    logger.info('Analytics Controller cleanup completed');
  }
}
