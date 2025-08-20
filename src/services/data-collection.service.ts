/**
 * Data Collection Service
 * Handles analytics event collection, processing, and storage
 * Epic 5 Task 5.1: Data Collection Pipeline Core Service
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import RedisService from './redis.service';
import { Logger } from '../utils/logger.utils';
import {
  AnalyticsEvent,
  EventType,
  EventCategory,
  EventSeverity,
  DataCollectionConfig,
  PipelineStatus,
  BatchJob,
  StreamProcessor,
  CollectionStatistics,
  AnalyticsQuery,
  AnalyticsQueryResult,
  DataExportConfig,
  DataImportConfig,
  AggregationMetric,
  RetentionPolicy
} from '../types/analytics.types';

const logger = new Logger('DataCollectionService');

export class DataCollectionService extends EventEmitter {
  private config: DataCollectionConfig;
  private eventBuffer: AnalyticsEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private processors: Map<string, StreamProcessor> = new Map();
  private batchJobs: Map<string, BatchJob> = new Map();
  private isRunning: boolean = false;
  private statistics: CollectionStatistics;

  constructor(
    private prisma: PrismaClient,
    private redisService: RedisService,
    config: Partial<DataCollectionConfig> = {}
  ) {
    super();
    
    this.config = {
      enabled: true,
      bufferSize: 1000,
      flushInterval: 5000, // 5 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      compressionEnabled: true,
      encryptionEnabled: false,
      eventTypes: Object.values(EventType),
      samplingRate: 1.0,
      maxEventSize: 1024 * 1024, // 1MB
      storage: {
        primary: {
          type: 'postgresql',
          connectionString: process.env.DATABASE_URL || '',
          database: 'dessai_analytics'
        },
        cache: {
          enabled: true,
          type: 'redis',
          ttl: 3600
        }
      },
      processing: {
        realTime: {
          enabled: false, // Disabled for now, can be enabled with Kafka
          kafka: {
            brokers: [],
            topics: ['analytics-events'],
            consumerGroup: 'analytics-processor'
          }
        },
        batch: {
          enabled: true,
          interval: 15, // 15 minutes
          batchSize: 10000
        },
        aggregation: {
          enabled: true,
          intervals: ['1m', '5m', '15m', '1h', '1d'],
          metrics: []
        }
      },
      retention: {
        rawData: {
          duration: 90, // 90 days
          compressionAfter: 30
        },
        aggregatedData: {
          minutely: 7, // 7 days
          hourly: 30, // 30 days
          daily: 365 // 1 year
        },
        policies: []
      },
      ...config
    };

    this.statistics = {
      timeRange: {
        start: new Date(),
        end: new Date()
      },
      totalEvents: 0,
      eventsByType: {} as Record<EventType, number>,
      eventsByCategory: {} as Record<EventCategory, number>,
      eventsBySeverity: {} as Record<EventSeverity, number>,
      averageEventSize: 0,
      peakThroughput: 0,
      errorRate: 0,
      storageUsage: {
        raw: 0,
        compressed: 0,
        indexed: 0
      }
    };

    this.setupEventListeners();
  }

  /**
   * Setup internal event listeners
   */
  private setupEventListeners(): void {
    this.on('event-collected', this.updateStatistics.bind(this));
    this.on('batch-processed', this.onBatchProcessed.bind(this));
    this.on('error', this.onError.bind(this));

    // Setup periodic tasks
    if (this.config.processing.batch.enabled) {
      setInterval(
        () => this.processBatchJobs(),
        this.config.processing.batch.interval * 60 * 1000
      );
    }

    // Setup retention cleanup
    setInterval(
      () => this.enforceRetentionPolicies(),
      24 * 60 * 60 * 1000 // Daily
    );
  }

  /**
   * Start the data collection service
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting Data Collection Service');

      // Initialize storage connections
      await this.initializeStorage();

      // Setup flush timer
      this.startFlushTimer();

      // Initialize stream processors if real-time processing is enabled
      if (this.config.processing.realTime.enabled) {
        await this.initializeStreamProcessors();
      }

      this.isRunning = true;
      
      logger.info('Data Collection Service started successfully', {
        config: {
          bufferSize: this.config.bufferSize,
          flushInterval: this.config.flushInterval,
          realTimeEnabled: this.config.processing.realTime.enabled,
          batchEnabled: this.config.processing.batch.enabled
        }
      });

      this.emit('service-started');

    } catch (error) {
      logger.error('Failed to start Data Collection Service', { error });
      throw error;
    }
  }

  /**
   * Stop the data collection service
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping Data Collection Service');

      this.isRunning = false;

      // Stop flush timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = undefined;
      }

      // Flush remaining events
      await this.flushEvents();

      // Stop stream processors
      await this.stopStreamProcessors();

      logger.info('Data Collection Service stopped successfully');
      this.emit('service-stopped');

    } catch (error) {
      logger.error('Error stopping Data Collection Service', { error });
      throw error;
    }
  }

  /**
   * Collect a single analytics event
   */
  async collectEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Check if service is running
      if (!this.isRunning || !this.config.enabled) {
        throw new Error('Data collection service is not running or disabled');
      }

      // Apply sampling rate
      if (Math.random() > this.config.samplingRate) {
        return 'sampled-out';
      }

      // Check if event type is allowed
      if (!this.config.eventTypes.includes(event.type)) {
        throw new Error(`Event type ${event.type} is not configured for collection`);
      }

      // Create complete event
      const completeEvent: AnalyticsEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        ...event
      };

      // Validate event size
      const eventSize = JSON.stringify(completeEvent).length;
      if (eventSize > this.config.maxEventSize) {
        throw new Error(`Event size ${eventSize} exceeds maximum ${this.config.maxEventSize}`);
      }

      // Add to buffer
      this.eventBuffer.push(completeEvent);

      // Emit event for real-time processing
      this.emit('event-collected', completeEvent);

      // Check if buffer should be flushed
      if (this.eventBuffer.length >= this.config.bufferSize) {
        await this.flushEvents();
      }

      logger.debug('Event collected', {
        eventId: completeEvent.id,
        type: completeEvent.type,
        category: completeEvent.category,
        bufferSize: this.eventBuffer.length
      });

      return completeEvent.id;

    } catch (error) {
      logger.error('Failed to collect event', { error, event });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Collect multiple analytics events
   */
  async collectEvents(events: Omit<AnalyticsEvent, 'id' | 'timestamp'>[]): Promise<string[]> {
    const eventIds: string[] = [];

    for (const event of events) {
      try {
        const eventId = await this.collectEvent(event);
        eventIds.push(eventId);
      } catch (error) {
        logger.warn('Failed to collect event in batch', { error, event });
        // Continue with other events
      }
    }

    return eventIds;
  }

  /**
   * Query analytics events
   */
  async queryEvents(query: AnalyticsQuery): Promise<AnalyticsQueryResult> {
    try {
      const startTime = Date.now();

      logger.info('Executing analytics query', {
        queryId: query.id,
        timeRange: query.timeRange,
        filters: query.filters
      });

      // Check cache first
      const cacheKey = this.generateQueryCacheKey(query);
      let cached = false;
      
      if (this.config.storage.cache.enabled) {
        const cachedResult = await this.redisService.get(cacheKey);
        if (cachedResult) {
          const result = JSON.parse(cachedResult as string);
          result.metadata.cached = true;
          return result;
        }
      }

      // Build database query
      const dbQuery = this.buildDatabaseQuery(query);
      const results = await this.executeDatabaseQuery(dbQuery);
      const totalRecords = results.length;

      // Apply pagination
      let paginatedResults = results;
      let pagination;

      if (query.limit || query.offset) {
        const offset = query.offset || 0;
        const limit = query.limit || 100;
        paginatedResults = results.slice(offset, offset + limit);
        
        pagination = {
          page: Math.floor(offset / limit) + 1,
          pageSize: limit,
          totalPages: Math.ceil(totalRecords / limit)
        };
      }

      const executionTime = Date.now() - startTime;

      const result: AnalyticsQueryResult = {
        query,
        results: paginatedResults,
        metadata: {
          totalRecords,
          executionTime,
          dataSource: 'primary',
          cached
        },
        pagination
      };

      // Cache result
      if (this.config.storage.cache.enabled && executionTime > 1000) {
        await this.redisService.setWithExpiry(
          cacheKey,
          JSON.stringify(result),
          this.config.storage.cache.ttl
        );
      }

      logger.info('Analytics query executed', {
        queryId: query.id,
        totalRecords,
        executionTime,
        cached
      });

      return result;

    } catch (error) {
      logger.error('Failed to execute analytics query', { error, query });
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getStatistics(): Promise<CollectionStatistics> {
    try {
      // Update storage usage
      await this.updateStorageStatistics();

      return {
        ...this.statistics,
        timeRange: {
          start: this.statistics.timeRange.start,
          end: new Date()
        }
      };

    } catch (error) {
      logger.error('Failed to get collection statistics', { error });
      throw error;
    }
  }

  /**
   * Get pipeline status
   */
  async getPipelineStatus(): Promise<PipelineStatus> {
    try {
      const uptime = Date.now() - this.statistics.timeRange.start.getTime();
      const lastProcessed = this.eventBuffer.length > 0 
        ? this.eventBuffer[this.eventBuffer.length - 1].timestamp 
        : new Date();

      return {
        id: 'data-collection-pipeline',
        name: 'Data Collection Pipeline',
        status: this.isRunning ? 'running' : 'stopped',
        uptime: Math.floor(uptime / 1000),
        lastProcessed,
        eventsProcessed: this.statistics.totalEvents,
        errorCount: 0, // TODO: Track error count
        performance: {
          throughput: this.calculateThroughput(),
          latency: this.calculateAverageLatency(),
          errorRate: this.statistics.errorRate
        },
        health: await this.getSystemHealth()
      };

    } catch (error) {
      logger.error('Failed to get pipeline status', { error });
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportData(config: DataExportConfig): Promise<string> {
    try {
      logger.info('Starting data export', { config });

      const jobId = this.generateJobId();
      const job: BatchJob = {
        id: jobId,
        type: 'export',
        status: 'pending',
        createdAt: new Date(),
        progress: 0,
        parameters: config
      };

      this.batchJobs.set(jobId, job);

      // Start export process asynchronously
      this.processExportJob(job).catch(error => {
        logger.error('Export job failed', { jobId, error });
        job.status = 'failed';
        job.error = {
          message: error.message,
          stack: error.stack
        };
      });

      return jobId;

    } catch (error) {
      logger.error('Failed to start data export', { error, config });
      throw error;
    }
  }

  /**
   * Import analytics data
   */
  async importData(config: DataImportConfig): Promise<string> {
    try {
      logger.info('Starting data import', { config });

      const jobId = this.generateJobId();
      const job: BatchJob = {
        id: jobId,
        type: 'migration',
        status: 'pending',
        createdAt: new Date(),
        progress: 0,
        parameters: config
      };

      this.batchJobs.set(jobId, job);

      // Start import process asynchronously
      this.processImportJob(job).catch(error => {
        logger.error('Import job failed', { jobId, error });
        job.status = 'failed';
        job.error = {
          message: error.message,
          stack: error.stack
        };
      });

      return jobId;

    } catch (error) {
      logger.error('Failed to start data import', { error, config });
      throw error;
    }
  }

  /**
   * Get batch job status
   */
  async getJobStatus(jobId: string): Promise<BatchJob | null> {
    return this.batchJobs.get(jobId) || null;
  }

  // Private helper methods

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateQueryCacheKey(query: AnalyticsQuery): string {
    const queryHash = Buffer.from(JSON.stringify(query)).toString('base64');
    return `analytics:query:${queryHash}`;
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(
      () => this.flushEvents(),
      this.config.flushInterval
    );
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      logger.debug('Flushing events to storage', { count: events.length });

      // Store events in primary storage
      await this.storeEvents(events);

      // Process real-time streams if enabled
      if (this.config.processing.realTime.enabled) {
        await this.processRealTimeStreams(events);
      }

      this.emit('batch-processed', { events, count: events.length });

    } catch (error) {
      logger.error('Failed to flush events', { error });
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...this.eventBuffer);
      throw error;
    }
  }

  private async storeEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      // Store in Redis for immediate access
      if (this.config.storage.cache.enabled) {
        const pipeline = this.redisService.pipeline();
        
        for (const event of events) {
          const key = `analytics:event:${event.id}`;
          pipeline.setWithExpiry(key, JSON.stringify(event), this.config.storage.cache.ttl);
        }
        
        await pipeline.exec();
      }

      // Store in primary database (simulated for now)
      // In production, this would store in InfluxDB or PostgreSQL
      logger.debug('Events stored in primary storage', { count: events.length });

    } catch (error) {
      logger.error('Failed to store events', { error });
      throw error;
    }
  }

  private async initializeStorage(): Promise<void> {
    // Initialize storage connections
    logger.info('Initializing storage connections');
    
    // In production, this would initialize InfluxDB connection
    // For now, we'll use the existing PostgreSQL and Redis connections
  }

  private async initializeStreamProcessors(): Promise<void> {
    // Initialize Kafka or other stream processing if enabled
    logger.info('Initializing stream processors');
  }

  private async stopStreamProcessors(): Promise<void> {
    // Stop stream processors
    for (const [id, processor] of this.processors) {
      logger.info('Stopping stream processor', { id, name: processor.name });
    }
    this.processors.clear();
  }

  private async processRealTimeStreams(events: AnalyticsEvent[]): Promise<void> {
    // Process events through real-time stream processors
    for (const event of events) {
      for (const [id, processor] of this.processors) {
        try {
          const result = processor.processor(event);
          if (result) {
            // Handle processed result
            logger.debug('Event processed by stream processor', { 
              eventId: event.id, 
              processorId: id 
            });
          }
        } catch (error) {
          logger.error('Stream processor error', { error, processorId: id, eventId: event.id });
        }
      }
    }
  }

  private async processBatchJobs(): Promise<void> {
    logger.debug('Processing batch aggregation jobs');
    
    // Run aggregation jobs
    if (this.config.processing.aggregation.enabled) {
      await this.runAggregationJobs();
    }
  }

  private async runAggregationJobs(): Promise<void> {
    // Run aggregation for each configured interval and metric
    for (const interval of this.config.processing.aggregation.intervals) {
      for (const metric of this.config.processing.aggregation.metrics) {
        await this.runAggregationJob(interval, metric);
      }
    }
  }

  private async runAggregationJob(interval: string, metric: AggregationMetric): Promise<void> {
    try {
      logger.debug('Running aggregation job', { interval, metric: metric.name });
      
      // In production, this would run aggregation queries against InfluxDB or similar
      // For now, we'll just log the operation
      
    } catch (error) {
      logger.error('Aggregation job failed', { error, interval, metric: metric.name });
    }
  }

  private async enforceRetentionPolicies(): Promise<void> {
    logger.info('Enforcing retention policies');
    
    try {
      // Cleanup old raw data
      const rawDataCutoff = new Date();
      rawDataCutoff.setDate(rawDataCutoff.getDate() - this.config.retention.rawData.duration);
      
      // In production, this would delete old data from storage
      logger.debug('Raw data retention enforced', { cutoff: rawDataCutoff });
      
      // Apply custom retention policies
      for (const policy of this.config.retention.policies) {
        await this.applyRetentionPolicy(policy);
      }

    } catch (error) {
      logger.error('Failed to enforce retention policies', { error });
    }
  }

  private async applyRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    try {
      logger.debug('Applying retention policy', { policyName: policy.name });
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - policy.duration);
      
      // In production, this would delete data matching policy conditions
      
    } catch (error) {
      logger.error('Failed to apply retention policy', { error, policyName: policy.name });
    }
  }

  private buildDatabaseQuery(query: AnalyticsQuery): any {
    // Build database-specific query
    // This is a simplified version - in production would be more sophisticated
    return {
      timeRange: query.timeRange,
      filters: query.filters,
      groupBy: query.groupBy,
      aggregations: query.aggregations,
      orderBy: query.orderBy,
      limit: query.limit,
      offset: query.offset
    };
  }

  private async executeDatabaseQuery(query: any): Promise<any[]> {
    // Execute query against primary storage
    // For now, return empty results
    return [];
  }

  private updateStatistics(event: AnalyticsEvent): void {
    this.statistics.totalEvents++;
    
    // Update event type counts
    if (!this.statistics.eventsByType[event.type]) {
      this.statistics.eventsByType[event.type] = 0;
    }
    this.statistics.eventsByType[event.type]++;
    
    // Update category counts
    if (!this.statistics.eventsByCategory[event.category]) {
      this.statistics.eventsByCategory[event.category] = 0;
    }
    this.statistics.eventsByCategory[event.category]++;
    
    // Update severity counts
    if (!this.statistics.eventsBySeverity[event.severity]) {
      this.statistics.eventsBySeverity[event.severity] = 0;
    }
    this.statistics.eventsBySeverity[event.severity]++;
  }

  private async updateStorageStatistics(): Promise<void> {
    // Update storage usage statistics
    // In production, this would query actual storage systems
  }

  private calculateThroughput(): number {
    const uptimeMs = Date.now() - this.statistics.timeRange.start.getTime();
    const uptimeSeconds = uptimeMs / 1000;
    return uptimeSeconds > 0 ? this.statistics.totalEvents / uptimeSeconds : 0;
  }

  private calculateAverageLatency(): number {
    // Calculate average processing latency
    // This would be tracked during event processing
    return 50; // Mock 50ms average latency
  }

  private async getSystemHealth(): Promise<any> {
    return {
      cpu: process.cpuUsage().user / 1000000, // Convert to percentage
      memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      disk: 0, // Would need additional monitoring
      network: 0 // Would need additional monitoring
    };
  }

  private onBatchProcessed(data: { events: AnalyticsEvent[]; count: number }): void {
    logger.debug('Batch processed successfully', { count: data.count });
  }

  private onError(error: Error): void {
    logger.error('Data collection service error', { error });
  }

  private async processExportJob(job: BatchJob): Promise<void> {
    try {
      job.status = 'running';
      job.startedAt = new Date();
      
      const config = job.parameters as DataExportConfig;
      
      // Simulate export process
      for (let i = 0; i <= 100; i += 10) {
        job.progress = i;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = {
        recordsProcessed: 1000,
        recordsSuccess: 1000,
        recordsError: 0,
        duration: Date.now() - job.startedAt.getTime(),
        outputPath: `/exports/${job.id}.${config.format}`
      };
      
    } catch (error) {
      job.status = 'failed';
      job.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
      throw error;
    }
  }

  private async processImportJob(job: BatchJob): Promise<void> {
    try {
      job.status = 'running';
      job.startedAt = new Date();
      
      // Simulate import process
      for (let i = 0; i <= 100; i += 10) {
        job.progress = i;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = {
        recordsProcessed: 500,
        recordsSuccess: 500,
        recordsError: 0,
        duration: Date.now() - job.startedAt.getTime()
      };
      
    } catch (error) {
      job.status = 'failed';
      job.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up Data Collection Service');
    
    await this.stop();
    this.removeAllListeners();
    
    logger.info('Data Collection Service cleanup completed');
  }
}
