/**
 * Analytics Data Types
 * Type definitions for analytics and data collection system
 * Epic 5 Task 5.1: Data Collection Pipeline Types
 */

// Core Analytics Event Types
export enum EventType {
  // Assessment Events
  ASSESSMENT_STARTED = 'assessment_started',
  ASSESSMENT_COMPLETED = 'assessment_completed',
  ASSESSMENT_ABANDONED = 'assessment_abandoned',
  ASSESSMENT_PAUSED = 'assessment_paused',
  ASSESSMENT_RESUMED = 'assessment_resumed',

  // Question Events
  QUESTION_VIEWED = 'question_viewed',
  QUESTION_ANSWERED = 'question_answered',
  QUESTION_SKIPPED = 'question_skipped',
  QUESTION_FLAGGED = 'question_flagged',
  QUESTION_UNFLAGGED = 'question_unflagged',

  // Code Execution Events
  CODE_EXECUTED = 'code_executed',
  CODE_COMPILED = 'code_compiled',
  CODE_ERROR = 'code_error',
  CODE_TEST_RUN = 'code_test_run',
  CODE_SUBMITTED = 'code_submitted',

  // Proctoring Events
  VIOLATION_DETECTED = 'violation_detected',
  FACE_NOT_DETECTED = 'face_not_detected',
  MULTIPLE_FACES = 'multiple_faces',
  TAB_SWITCH = 'tab_switch',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // User Interaction Events
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  FORM_SUBMISSION = 'form_submission',
  FILE_UPLOAD = 'file_upload',
  SEARCH_PERFORMED = 'search_performed',

  // System Events
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  CONNECTION_LOST = 'connection_lost',
  CONNECTION_RESTORED = 'connection_restored',
  ERROR_OCCURRED = 'error_occurred',
}

// Event Severity Levels
export enum EventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Event Categories for Analytics
export enum EventCategory {
  ASSESSMENT = 'assessment',
  QUESTION = 'question',
  CODE_EXECUTION = 'code_execution',
  PROCTORING = 'proctoring',
  USER_INTERACTION = 'user_interaction',
  SYSTEM = 'system',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
}

// Base Analytics Event Interface
export interface AnalyticsEvent {
  id: string;
  type: EventType;
  category: EventCategory;
  severity: EventSeverity;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  assessmentId?: string;
  questionId?: string;
  organizationId?: string;
  metadata: Record<string, any>;
  source: EventSource;
  duration?: number; // milliseconds
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

// Event Source Information
export interface EventSource {
  service: string;
  version: string;
  environment: string;
  instance?: string;
  userAgent?: string;
  ipAddress?: string;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

// Specific Event Types

export interface AssessmentEvent extends AnalyticsEvent {
  category: EventCategory.ASSESSMENT;
  assessmentId: string;
  metadata: {
    assessmentTitle?: string;
    assessmentType?: string;
    timeLimit?: number;
    questionsCount?: number;
    currentProgress?: number;
    score?: number;
    completionTime?: number;
    [key: string]: any;
  };
}

export interface QuestionEvent extends AnalyticsEvent {
  category: EventCategory.QUESTION;
  questionId: string;
  assessmentId: string;
  metadata: {
    questionType?: string;
    difficultyLevel?: string;
    timeSpent?: number;
    attempts?: number;
    isCorrect?: boolean;
    selectedAnswer?: string;
    providedCode?: string;
    [key: string]: any;
  };
}

export interface CodeExecutionEvent extends AnalyticsEvent {
  category: EventCategory.CODE_EXECUTION;
  questionId: string;
  assessmentId: string;
  metadata: {
    language: string;
    codeLength: number;
    executionTime: number;
    memoryUsage?: number;
    testsPassed?: number;
    testsTotal?: number;
    compilationErrors?: string[];
    runtimeErrors?: string[];
    [key: string]: any;
  };
}

export interface ProctoringEvent extends AnalyticsEvent {
  category: EventCategory.PROCTORING;
  sessionId: string;
  assessmentId: string;
  metadata: {
    violationType?: string;
    confidence?: number;
    riskScore?: number;
    evidenceId?: string;
    aiModelUsed?: string;
    alertGenerated?: boolean;
    [key: string]: any;
  };
}

export interface UserInteractionEvent extends AnalyticsEvent {
  category: EventCategory.USER_INTERACTION;
  metadata: {
    elementId?: string;
    elementType?: string;
    pageUrl?: string;
    referrer?: string;
    clickPosition?: { x: number; y: number };
    scrollPosition?: number;
    viewportSize?: { width: number; height: number };
    [key: string]: any;
  };
}

export interface SystemEvent extends AnalyticsEvent {
  category: EventCategory.SYSTEM;
  metadata: {
    component?: string;
    operation?: string;
    responseTime?: number;
    statusCode?: number;
    resourceUsage?: {
      cpu?: number;
      memory?: number;
      disk?: number;
      network?: number;
    };
    [key: string]: any;
  };
}

// Data Collection Configuration
export interface DataCollectionConfig {
  enabled: boolean;
  bufferSize: number;
  flushInterval: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  eventTypes: EventType[];
  samplingRate: number; // 0.0 to 1.0
  maxEventSize: number; // bytes
  storage: StorageConfig;
  processing: ProcessingConfig;
  retention: RetentionConfig;
}

// Storage Configuration
export interface StorageConfig {
  primary: {
    type: 'influxdb' | 'postgresql' | 'mongodb';
    connectionString: string;
    database: string;
    retentionPolicy?: string;
  };
  backup?: {
    type: 'filesystem' | 's3' | 'gcs' | 'azure';
    path: string;
    credentials?: Record<string, any>;
  };
  cache: {
    enabled: boolean;
    type: 'redis' | 'memory';
    ttl: number; // seconds
  };
}

// Processing Configuration
export interface ProcessingConfig {
  realTime: {
    enabled: boolean;
    kafka: {
      brokers: string[];
      topics: string[];
      consumerGroup: string;
    };
  };
  batch: {
    enabled: boolean;
    interval: number; // minutes
    batchSize: number;
  };
  aggregation: {
    enabled: boolean;
    intervals: ('1m' | '5m' | '15m' | '1h' | '1d')[];
    metrics: AggregationMetric[];
  };
}

// Retention Configuration
export interface RetentionConfig {
  rawData: {
    duration: number; // days
    compressionAfter: number; // days
  };
  aggregatedData: {
    minutely: number; // days
    hourly: number; // days
    daily: number; // days
  };
  policies: RetentionPolicy[];
}

export interface RetentionPolicy {
  name: string;
  eventTypes: EventType[];
  duration: number; // days
  conditions?: {
    severity?: EventSeverity[];
    categories?: EventCategory[];
    metadata?: Record<string, any>;
  };
}

// Aggregation Metrics
export interface AggregationMetric {
  name: string;
  field: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percentile';
  percentile?: number; // for percentile operation
  filters?: {
    eventTypes?: EventType[];
    categories?: EventCategory[];
    conditions?: Record<string, any>;
  };
}

// Data Pipeline Status
export interface PipelineStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'maintenance';
  uptime: number; // seconds
  lastProcessed: Date;
  eventsProcessed: number;
  errorCount: number;
  performance: {
    throughput: number; // events/second
    latency: number; // milliseconds
    errorRate: number; // percentage
  };
  health: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

// Batch Processing Job
export interface BatchJob {
  id: string;
  type: 'aggregation' | 'cleanup' | 'export' | 'migration';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: number; // 0-100
  parameters: Record<string, any>;
  result?: {
    recordsProcessed: number;
    recordsSuccess: number;
    recordsError: number;
    duration: number;
    outputPath?: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// Real-time Stream Processing
export interface StreamProcessor {
  id: string;
  name: string;
  inputTopic: string;
  outputTopic?: string;
  processor: StreamProcessorFunction;
  config: {
    parallelism: number;
    checkpointsEnabled: boolean;
    checkpointInterval: number;
    watermarkDelay: number;
  };
}

export type StreamProcessorFunction = (
  event: AnalyticsEvent
) => AnalyticsEvent | AnalyticsEvent[] | null;

// Analytics Query Types
export interface AnalyticsQuery {
  id?: string;
  name?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  filters: {
    eventTypes?: EventType[];
    categories?: EventCategory[];
    userIds?: string[];
    sessionIds?: string[];
    assessmentIds?: string[];
    organizationIds?: string[];
    metadata?: Record<string, any>;
  };
  groupBy?: string[];
  aggregations?: {
    field: string;
    operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  }[];
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  limit?: number;
  offset?: number;
}

export interface AnalyticsQueryResult {
  query: AnalyticsQuery;
  results: any[];
  metadata: {
    totalRecords: number;
    executionTime: number;
    dataSource: string;
    cached: boolean;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Event Collection Statistics
export interface CollectionStatistics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  eventsByCategory: Record<EventCategory, number>;
  eventsBySeverity: Record<EventSeverity, number>;
  averageEventSize: number;
  peakThroughput: number;
  errorRate: number;
  storageUsage: {
    raw: number; // bytes
    compressed: number; // bytes
    indexed: number; // bytes
  };
}

// Export configuration
export interface DataExportConfig {
  format: 'json' | 'csv' | 'parquet' | 'avro';
  compression: 'none' | 'gzip' | 'lz4' | 'snappy';
  destination: {
    type: 'filesystem' | 's3' | 'gcs' | 'azure' | 'sftp';
    path: string;
    credentials?: Record<string, any>;
  };
  filters: {
    timeRange: {
      start: Date;
      end: Date;
    };
    eventTypes?: EventType[];
    categories?: EventCategory[];
  };
  options: {
    includeMetadata: boolean;
    anonymizeUsers: boolean;
    splitByDate: boolean;
    maxFileSize?: number; // bytes
  };
}

// Data Import configuration
export interface DataImportConfig {
  source: {
    type: 'filesystem' | 's3' | 'gcs' | 'azure' | 'http' | 'kafka';
    path: string;
    credentials?: Record<string, any>;
  };
  format: 'json' | 'csv' | 'parquet' | 'avro';
  mapping: {
    [sourceField: string]: string; // maps to AnalyticsEvent fields
  };
  validation: {
    strictMode: boolean;
    requiredFields: string[];
    allowedEventTypes: EventType[];
  };
  processing: {
    batchSize: number;
    parallelism: number;
    duplicateHandling: 'skip' | 'overwrite' | 'error';
  };
}
