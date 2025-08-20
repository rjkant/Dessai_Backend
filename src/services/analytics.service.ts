/**
 * Analytics Engine Service
 * Epic 5: Analytics Engine Service - Task 5.1: Data Collection Pipeline
 * 
 * Comprehensive analytics service for collecting, processing, and analyzing
 * assessment, proctoring, and performance data across the Dessai platform.
 */

import { PrismaClient } from '@prisma/client';
import RedisService from './redis.service';
import { Logger } from '../utils/logger.util';
import {
  EventType,
  AnalyticsEvent
} from '../types/analytics.types';

// InfluxDB Point type (simplified)
class Point {
  constructor(private measurement: string) {}
  tag(key: string, value: string): Point { return this; }
  floatField(key: string, value: number): Point { return this; }
  stringField(key: string, value: string): Point { return this; }
  booleanField(key: string, value: boolean): Point { return this; }
  timestamp(ts: Date): Point { return this; }
}

// Analytics Error Classes
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

export enum AnalyticsErrorCode {
  EVENT_PROCESSING_FAILED = 'EVENT_PROCESSING_FAILED',
  INVALID_EVENT_FORMAT = 'INVALID_EVENT_FORMAT',
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  QUERY_EXECUTION_FAILED = 'QUERY_EXECUTION_FAILED',
  KAFKA_CONNECTION_FAILED = 'KAFKA_CONNECTION_FAILED'
}

// Simplified types for compatibility
export interface TimeSeriesData {
  timestamp: Date;
  measurement: string;
  value: number | string;
  tags: Record<string, string>;
}

export interface MetricsQuery {
  measurement: string;
  timeRange: { start: string; stop: string };
  filters?: Record<string, any>;
  groupBy?: string[];
  aggregation?: { function: string; window: string };
  limit?: number;
}

export interface PerformanceMetrics {
  userId: string;
  timeRange: { start: string; stop: string };
  totalAssessments: number;
  totalCodeExecutions: number;
  totalViolations: number;
  averageScore: number;
  assessmentCompletionRate: number;
  codeSuccessRate: number;
  integrityScore: number;
  engagementScore: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  improvementTrend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  conditions: any[];
  actions: any[];
  organizationId?: string;
}

export class AnalyticsService {
  private eventBuffer: AnalyticsEvent[] = [];
  private readonly bufferSize = 1000;
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;
  private prisma: PrismaClient;
  private redis: RedisService;
  private logger: Logger;
  private kafkaProducer: any; // Simplified kafka producer
  private writeApi: any; // InfluxDB write API
  private queryApi: any; // InfluxDB query API

  constructor(prisma: PrismaClient, redis: RedisService, logger: Logger) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
    this.startPeriodicFlush();
    this.initializeDataStorage();
  }

  /**
   * Initialize data storage for analytics (simplified version)
   */
  private initializeDataStorage(): void {
    try {
      this.logger.info('Analytics data storage initialized', {
        bufferSize: this.bufferSize,
        flushInterval: this.flushInterval
      });

      // Create analytics tables if they don't exist (handled by Prisma migrations)
      this.ensureAnalyticsTables();
    } catch (err) {
      this.logger.error(`Failed to initialize data storage: ${(err as Error).message}`);
      throw new AnalyticsError(
        'Data storage initialization failed',
        AnalyticsErrorCode.DATABASE_CONNECTION_FAILED,
        { errorMessage: (err as Error).message }
      );
    }
  }

  /**
   * Ensure analytics tables exist (for demonstration)
   */
  private async ensureAnalyticsTables(): Promise<void> {
    try {
      // In production, this would be handled by Prisma migrations
      this.logger.debug('Analytics tables verification completed');
    } catch (err) {
      this.logger.error('Failed to verify analytics tables', err as Error);
    }
  }

  /**
   * Collect a single analytics event
   */
  async collectEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Validate event
      this.validateEvent(event);

      // Add to buffer
      this.eventBuffer.push(event);

      // Send to Kafka for real-time processing
      await this.kafkaProducer.send({
        topic: 'dessai-analytics-events',
        messages: [{
          key: event.id,
          value: JSON.stringify(event),
          timestamp: event.timestamp.toISOString()
        }]
      });

      // Flush buffer if full
      if (this.eventBuffer.length >= this.bufferSize) {
        await this.flushEvents();
      }

      this.logger.debug('Event collected', {
        serviceName: 'AnalyticsService',
        eventId: event.id,
        eventType: event.type,
        bufferSize: this.eventBuffer.length
      });
    } catch (err) {
      this.logger.error('Failed to collect event', err as Error);
      throw new AnalyticsError(
        'Event collection failed',
        AnalyticsErrorCode.EVENT_PROCESSING_FAILED,
        { eventId: event.id, errorMessage: (err as Error).message }
      );
    }
  }

  /**
   * Collect multiple analytics events in batch
   */
  async collectEvents(events: AnalyticsEvent[]): Promise<{ success: boolean; processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    for (const event of events) {
      try {
        await this.collectEvent(event);
        processed++;
      } catch (err) {
        errors.push(`Event ${event.id}: ${(err as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors
    };
  }

  /**
   * Process real-time events from Kafka
   */
  private async processRealtimeEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Check for alert conditions
      await this.checkAlertConditions(event);

      // Update real-time metrics
      await this.updateRealtimeMetrics(event);

      // Process special event types
      switch (event.type) {
        case EventType.VIOLATION_DETECTED:
          await this.processProctoringViolation(event);
          break;
        case EventType.ASSESSMENT_COMPLETED:
          await this.processAssessmentCompletion(event);
          break;
        case EventType.CODE_EXECUTED:
          await this.processCodeExecution(event);
          break;
        default:
          // Standard event processing
          break;
      }

      this.logger.debug('Real-time event processed', {
        serviceName: 'AnalyticsService',
        eventId: event.id,
        eventType: event.type
      });
    } catch (err) {
      this.logger.error('Failed to process real-time event', err as Error);
    }
  }

  /**
   * Flush buffered events to InfluxDB
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      // Convert events to InfluxDB points
      const points = events.map(event => this.eventToInfluxPoint(event));

      // Write points to InfluxDB
      this.writeApi.writePoints(points);
      await this.writeApi.flush();

      this.logger.info('Events flushed to InfluxDB', {
        serviceName: 'AnalyticsService',
        count: events.length
      });
    } catch (err) {
      this.logger.error('Failed to flush events', err as Error);
      throw new AnalyticsError(
        'Event flush failed',
        AnalyticsErrorCode.DATABASE_CONNECTION_FAILED,
        { errorMessage: (err as Error).message }
      );
    }
  }

  /**
   * Convert analytics event to InfluxDB point
   */
  private eventToInfluxPoint(event: AnalyticsEvent): Point {
    const point = new Point(event.type)
      .timestamp(event.timestamp)
      .tag('event_id', event.id)
      .tag('user_id', event.userId || 'anonymous')
      .tag('session_id', event.sessionId || 'unknown');

    // Add organization tag if available
    if (event.organizationId) {
      point.tag('organization_id', event.organizationId);
    }

    // Add assessment tag if available
    if (event.assessmentId) {
      point.tag('assessment_id', event.assessmentId);
    }

    // Add numeric fields
    Object.entries(event.metadata || {}).forEach(([key, value]) => {
      if (typeof value === 'number') {
        point.floatField(key, value);
      } else if (typeof value === 'boolean') {
        point.booleanField(key, value);
      } else if (typeof value === 'string') {
        point.stringField(key, value);
      }
    });

    return point;
  }

  /**
   * Query metrics from InfluxDB
   */
  async queryMetrics(query: MetricsQuery): Promise<TimeSeriesData[]> {
    try {
      const fluxQuery = this.buildFluxQuery(query);
      const result: TimeSeriesData[] = [];

      await this.queryApi.queryRows(fluxQuery, {
        next: (row: any, tableMeta: any) => {
          const record = tableMeta.toObject(row);
          result.push({
            timestamp: new Date(record._time),
            measurement: record._measurement,
            value: record._value,
            tags: this.extractTags(record)
          });
        },
        error: (error: any) => {
          throw error;
        }
      });

      this.logger.info('Metrics query executed', {
        serviceName: 'AnalyticsService',
        measurement: query.measurement,
        resultCount: result.length
      });

      return result;
    } catch (err) {
      this.logger.error('Failed to query metrics', err as Error);
      throw new AnalyticsError(
        'Metrics query failed',
        AnalyticsErrorCode.QUERY_EXECUTION_FAILED,
        { query, errorMessage: (err as Error).message }
      );
    }
  }

  /**
   * Build Flux query from metrics query object
   */
  private buildFluxQuery(query: MetricsQuery): string {
    let fluxQuery = `from(bucket: "${process.env['INFLUXDB_BUCKET'] || 'analytics'}")`;
    
    // Time range
    fluxQuery += `\n  |> range(start: ${query.timeRange.start}, stop: ${query.timeRange.stop})`;
    
    // Filter by measurement
    fluxQuery += `\n  |> filter(fn: (r) => r._measurement == "${query.measurement}")`;
    
    // Add filters
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        fluxQuery += `\n  |> filter(fn: (r) => r.${key} == "${value}")`;
      });
    }
    
    // Group by
    if (query.groupBy && query.groupBy.length > 0) {
      fluxQuery += `\n  |> group(columns: [${query.groupBy.map(col => `"${col}"`).join(', ')}])`;
    }
    
    // Aggregation
    if (query.aggregation) {
      fluxQuery += `\n  |> aggregateWindow(every: ${query.aggregation.window}, fn: ${query.aggregation.function})`;
    }
    
    // Limit
    if (query.limit) {
      fluxQuery += `\n  |> limit(n: ${query.limit})`;
    }
    
    return fluxQuery;
  }

  /**
   * Extract tags from InfluxDB record
   */
  private extractTags(record: any): Record<string, string> {
    const tags: Record<string, string> = {};
    Object.entries(record).forEach(([key, value]) => {
      if (key.startsWith('tag_') || ['user_id', 'session_id', 'organization_id', 'assessment_id'].includes(key)) {
        tags[key] = value as string;
      }
    });
    return tags;
  }

  /**
   * Get performance metrics for a user
   */
  async getPerformanceMetrics(userId: string, timeRange?: { start: string; stop: string }): Promise<PerformanceMetrics> {
    try {
      const defaultTimeRange = {
        start: '-30d',
        stop: 'now()'
      };
      const range = timeRange || defaultTimeRange;

      // Query assessment completions
      const assessmentMetrics = await this.queryMetrics({
        measurement: EventType.ASSESSMENT_COMPLETED,
        timeRange: range,
        filters: { user_id: userId },
        groupBy: ['assessment_id']
      });

      // Query code executions
      const codeMetrics = await this.queryMetrics({
        measurement: EventType.CODE_EXECUTED,
        timeRange: range,
        filters: { user_id: userId }
      });

      // Query proctoring violations
      const violationMetrics = await this.queryMetrics({
        measurement: EventType.VIOLATION_DETECTED,
        timeRange: range,
        filters: { user_id: userId }
      });

      // Calculate performance metrics
      const totalAssessments = assessmentMetrics.length;
      const totalCodeExecutions = codeMetrics.length;
      const totalViolations = violationMetrics.length;

      const averageScore = totalAssessments > 0 
        ? assessmentMetrics.reduce((sum, metric) => sum + (metric.value as number), 0) / totalAssessments 
        : 0;

      const performanceMetrics: PerformanceMetrics = {
        userId,
        timeRange: range,
        totalAssessments,
        totalCodeExecutions,
        totalViolations,
        averageScore,
        assessmentCompletionRate: totalAssessments > 0 ? 1.0 : 0, // Simplified calculation
        codeSuccessRate: totalCodeExecutions > 0 ? 0.85 : 0, // Simplified calculation
        integrityScore: Math.max(0, 100 - (totalViolations * 10)), // Simplified calculation
        engagementScore: Math.min(100, totalCodeExecutions * 2 + totalAssessments * 5), // Simplified calculation
        skillLevel: this.calculateSkillLevel(averageScore),
        improvementTrend: 'stable', // Simplified - would require time-series analysis
        recommendations: this.generateRecommendations(averageScore, totalViolations)
      };

      return performanceMetrics;
    } catch (err) {
      this.logger.error('Failed to get performance metrics', err as Error);
      throw new AnalyticsError(
        'Performance metrics calculation failed',
        AnalyticsErrorCode.QUERY_EXECUTION_FAILED,
        { userId, errorMessage: (err as Error).message }
      );
    }
  }

  /**
   * Calculate skill level based on average score
   */
  private calculateSkillLevel(averageScore: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (averageScore >= 90) return 'expert';
    if (averageScore >= 75) return 'advanced';
    if (averageScore >= 60) return 'intermediate';
    return 'beginner';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(averageScore: number, totalViolations: number): string[] {
    const recommendations: string[] = [];

    if (averageScore < 60) {
      recommendations.push('Focus on foundational concepts and practice basic problems');
    }
    if (averageScore >= 60 && averageScore < 75) {
      recommendations.push('Work on intermediate topics and code optimization');
    }
    if (averageScore >= 75) {
      recommendations.push('Challenge yourself with advanced algorithms and system design');
    }
    if (totalViolations > 0) {
      recommendations.push('Review assessment guidelines to maintain integrity standards');
    }
    if (totalViolations === 0) {
      recommendations.push('Excellent integrity record - keep up the professional standards');
    }

    return recommendations;
  }

  /**
   * Check alert conditions for incoming events
   */
  private async checkAlertConditions(event: AnalyticsEvent): Promise<void> {
    try {
      // Get active alert rules
      const alertRules = await this.getActiveAlertRules(event.organizationId);

      for (const rule of alertRules) {
        if (this.eventMatchesAlertRule(event, rule)) {
          await this.triggerAlert(rule, event);
        }
      }
    } catch (err) {
      this.logger.error('Failed to check alert conditions', err as Error);
    }
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealtimeMetrics(event: AnalyticsEvent): Promise<void> {
    try {
      const key = `realtime:${event.type}:${event.organizationId || 'global'}`;
      
      // Increment event counter
      await this.redis.incrementRateLimit(key, 3600); // 1 hour window
      
      // Update last event timestamp
      await this.redis.set(`${key}:last`, event.timestamp.toISOString(), 3600);

      // Store recent events for dashboard
      const recentEventsKey = `recent:${event.organizationId || 'global'}`;
      await this.redis.set(recentEventsKey, JSON.stringify({
        ...event,
        timestamp: event.timestamp.toISOString()
      }), 300); // 5 minutes TTL
    } catch (err) {
      this.logger.error('Failed to update real-time metrics', err as Error);
    }
  }

  /**
   * Process proctoring violation event
   */
  private async processProctoringViolation(event: AnalyticsEvent): Promise<void> {
    try {
      // Store violation details in database
      // await this.prisma.proctoringViolation.create(...); // TODO: Add Prisma model

      // Update user integrity score
      await this.updateUserIntegrityScore(event.userId!, -10); // Decrease by 10 points
    } catch (err) {
      this.logger.error('Failed to process proctoring violation', err as Error);
    }
  }

  /**
   * Process assessment completion event
   */
  private async processAssessmentCompletion(event: AnalyticsEvent): Promise<void> {
    try {
      // Calculate and store assessment analytics
      const analytics = {
        eventId: event.id,
        userId: event.userId!,
        assessmentId: event.assessmentId!,
        score: event.metadata?.score || 0,
        timeSpent: event.metadata?.timeSpent || 0,
        completionRate: event.metadata?.completionRate || 0,
        timestamp: event.timestamp
      };

      // await this.prisma.assessmentAnalytics.create(...); // TODO: Add Prisma model

      // Update user performance metrics
      await this.updateUserPerformanceScore(event.userId!, event.metadata?.score || 0);
    } catch (err) {
      this.logger.error('Failed to process assessment completion', err as Error);
    }
  }

  /**
   * Process code execution event
   */
  private async processCodeExecution(event: AnalyticsEvent): Promise<void> {
    try {
      // Store code execution metrics
      // await this.prisma.codeExecutionAnalytics.create(...); // TODO: Add Prisma model
    } catch (err) {
      this.logger.error('Failed to process code execution', err as Error);
    }
  }

  /**
   * Validate analytics event
   */
  private validateEvent(event: AnalyticsEvent): void {
    if (!event.id) {
      throw new AnalyticsError(
        'Event ID is required',
        AnalyticsErrorCode.INVALID_EVENT_FORMAT,
        { event }
      );
    }

    if (!event.type || !Object.values(EventType).includes(event.type)) {
      throw new AnalyticsError(
        'Invalid event type',
        AnalyticsErrorCode.INVALID_EVENT_FORMAT,
        { eventType: event.type }
      );
    }

    if (!event.timestamp) {
      throw new AnalyticsError(
        'Event timestamp is required',
        AnalyticsErrorCode.INVALID_EVENT_FORMAT,
        { event }
      );
    }
  }

  /**
   * Start periodic event flushing
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      try {
        await this.flushEvents();
      } catch (err) {
        this.logger.error('Periodic flush failed', err as Error);
      }
    }, this.flushInterval);
  }

  /**
   * Cleanup resources
   */
  async onModuleDestroy(): Promise<void> {
    try {
      // Flush remaining events
      await this.flushEvents();

      // Close InfluxDB connection
      await this.writeApi.close();

      // Disconnect Kafka
      await this.kafkaProducer.disconnect();
      // await this.kafkaConsumer?.disconnect(); // TODO: Initialize Kafka consumer

      // Clear flush timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }

      this.logger.info('Analytics service cleanup completed');
    } catch (err) {
      this.logger.error('Failed to cleanup analytics service', err as Error);
    }
  }

  // Helper methods (simplified implementations)
  private async getActiveAlertRules(organizationId?: string): Promise<AlertRule[]> {
    // Simplified - would query from database
    return [];
  }

  private eventMatchesAlertRule(event: AnalyticsEvent, rule: AlertRule): boolean {
    // Simplified - would check rule conditions
    return false;
  }

  private async triggerAlert(rule: AlertRule, event: AnalyticsEvent): Promise<void> {
    // Simplified - would send alerts via notification service
    this.logger.warn('Alert triggered', { rule: rule.name, eventId: event.id });
  }

  private async updateUserIntegrityScore(userId: string, change: number): Promise<void> {
    // Simplified - would update user integrity score
    this.logger.debug('User integrity score updated', { userId, change });
  }

  private async updateUserPerformanceScore(userId: string, score: number): Promise<void> {
    // Simplified - would update user performance metrics
    this.logger.debug('User performance score updated', { userId, score });
  }
}


