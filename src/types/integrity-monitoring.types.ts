/**
 * Integrity Monitoring Types
 * TypeScript type definitions for integrity monitoring and violation detection
 * Epic 4 Task 4.3: Integrity Monitoring System
 */

import {
  ViolationSeverity,
  GazeViolationType,
  AudioViolationType,
  RetryPolicy,
} from './ai-analysis.types';

// General violation type union
export type ViolationType =
  | 'face_not_detected'
  | 'multiple_faces'
  | 'face_obscured'
  | GazeViolationType
  | AudioViolationType
  | 'suspicious_behavior'
  | 'environment_change'
  | 'technical_violation'
  | 'identity_violation'
  | 'attention_violation';

// Core integrity monitoring interfaces
export interface IntegrityMonitoringConfig {
  enabled: boolean;
  mode: MonitoringMode;
  sensitivity: SensitivityLevel;
  thresholds: ViolationThresholds;
  alerts: AlertConfiguration;
  reporting: ReportConfiguration;
  rules: IntegrityRule[];
}

export enum MonitoringMode {
  STRICT = 'strict', // Zero tolerance
  STANDARD = 'standard', // Normal monitoring
  LENIENT = 'lenient', // Relaxed monitoring
  CUSTOM = 'custom', // Custom rule configuration
}

export enum SensitivityLevel {
  VERY_HIGH = 'very_high', // Detects subtle violations
  HIGH = 'high', // Standard detection
  MEDIUM = 'medium', // Moderate detection
  LOW = 'low', // Only obvious violations
  VERY_LOW = 'very_low', // Minimal detection
}

// Violation detection and scoring
export interface ViolationThresholds {
  face: FaceViolationThresholds;
  gaze: GazeViolationThresholds;
  audio: AudioViolationThresholds;
  behavior: BehaviorViolationThresholds;
  environment: EnvironmentViolationThresholds;
  technical: TechnicalViolationThresholds;
}

export interface FaceViolationThresholds {
  noFaceDetected: {
    durationMs: number; // How long before violation
    confidence: number; // Detection confidence threshold
    severity: ViolationSeverity;
  };
  multipleFaces: {
    count: number; // Max allowed faces
    durationMs: number; // Duration threshold
    confidence: number;
    severity: ViolationSeverity;
  };
  faceObscured: {
    obscurationPercent: number; // Percentage of face obscured
    durationMs: number;
    severity: ViolationSeverity;
  };
  lookAway: {
    angleThreshold: number; // Degrees away from center
    durationMs: number;
    frequency: number; // Max instances per minute
    severity: ViolationSeverity;
  };
}

export interface GazeViolationThresholds {
  gazeDeviation: {
    horizontalDegrees: number; // Max horizontal deviation
    verticalDegrees: number; // Max vertical deviation
    durationMs: number;
    severity: ViolationSeverity;
  };
  gazePatterns: {
    suspiciousMovement: number; // Pattern detection threshold
    readingBehavior: number; // Reading pattern threshold
    searchingBehavior: number; // Searching pattern threshold
    severity: ViolationSeverity;
  };
  eyeClosure: {
    durationMs: number; // Max eye closure duration
    frequency: number; // Max instances per minute
    severity: ViolationSeverity;
  };
}

export interface AudioViolationThresholds {
  voiceDetection: {
    otherVoices: number; // Max additional voices
    volumeThreshold: number; // dB threshold
    durationMs: number;
    severity: ViolationSeverity;
  };
  backgroundNoise: {
    volumeThreshold: number; // dB threshold
    durationMs: number;
    patterns: string[]; // Suspicious patterns
    severity: ViolationSeverity;
  };
  silence: {
    unexpectedSilence: number; // ms of unexpected silence
    severity: ViolationSeverity;
  };
  keywordDetection: {
    suspiciousKeywords: string[];
    contextAnalysis: boolean;
    severity: ViolationSeverity;
  };
}

export interface BehaviorViolationThresholds {
  typingPatterns: {
    unusualSpeed: number; // WPM threshold
    pauseAnalysis: boolean;
    copyPasteDetection: boolean;
    severity: ViolationSeverity;
  };
  navigationPatterns: {
    tabSwitching: number; // Max tab switches
    windowChanges: number; // Max window changes
    browserActions: string[]; // Prohibited actions
    severity: ViolationSeverity;
  };
  timeAnalysis: {
    unexpectedSpeed: number; // Completion time threshold
    inconsistentTiming: boolean;
    severity: ViolationSeverity;
  };
}

export interface EnvironmentViolationThresholds {
  lighting: {
    minLux: number; // Minimum lighting
    maxLux: number; // Maximum lighting
    consistency: number; // Lighting consistency
    severity: ViolationSeverity;
  };
  background: {
    changeDetection: boolean; // Detect background changes
    personDetection: boolean; // Detect other people
    objectDetection: string[]; // Prohibited objects
    severity: ViolationSeverity;
  };
  location: {
    gpsVariance: number; // Max location variance (meters)
    ipConsistency: boolean; // Check IP consistency
    timezoneConsistency: boolean;
    severity: ViolationSeverity;
  };
}

export interface TechnicalViolationThresholds {
  screenCapture: {
    detection: boolean; // Detect screen capture attempts
    prevention: boolean; // Prevent screen capture
    severity: ViolationSeverity;
  };
  devTools: {
    detection: boolean; // Detect dev tools usage
    prevention: boolean; // Prevent dev tools
    severity: ViolationSeverity;
  };
  automation: {
    botDetection: boolean; // Detect automation tools
    scriptDetection: boolean; // Detect running scripts
    severity: ViolationSeverity;
  };
  virtualMachine: {
    detection: boolean; // Detect VM usage
    prevention: boolean; // Prevent VM usage
    severity: ViolationSeverity;
  };
}

// Integrity rules and policies
export interface IntegrityRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  type: ViolationType;
  enabled: boolean;
  priority: RulePriority;
  conditions: RuleCondition[];
  actions: RuleAction[];
  escalation: EscalationPolicy;
  metadata: RuleMetadata;
}

export enum RuleCategory {
  IDENTITY_VERIFICATION = 'identity_verification',
  ATTENTION_MONITORING = 'attention_monitoring',
  ENVIRONMENT_CONTROL = 'environment_control',
  TECHNICAL_SECURITY = 'technical_security',
  BEHAVIORAL_ANALYSIS = 'behavioral_analysis',
  AUDIO_MONITORING = 'audio_monitoring',
}

export enum RulePriority {
  CRITICAL = 1, // Immediate action required
  HIGH = 2, // High priority
  MEDIUM = 3, // Standard priority
  LOW = 4, // Low priority
  INFO = 5, // Informational only
}

export interface RuleCondition {
  field: string; // Field to evaluate
  operator: ComparisonOperator;
  value: any; // Comparison value
  logicalOperator?: LogicalOperator; // AND/OR with next condition
}

export enum ComparisonOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  REGEX = 'regex',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not',
}

export interface RuleAction {
  type: ActionType;
  parameters: ActionParameters;
  delay?: number; // Delay before action (ms)
  conditions?: string[]; // Additional conditions for action
}

export enum ActionType {
  ALERT = 'alert', // Generate alert
  WARNING = 'warning', // Show warning to candidate
  PAUSE_ASSESSMENT = 'pause_assessment',
  END_ASSESSMENT = 'end_assessment',
  FLAG_FOR_REVIEW = 'flag_for_review',
  NOTIFY_PROCTOR = 'notify_proctor',
  INCREASE_MONITORING = 'increase_monitoring',
  CAPTURE_EVIDENCE = 'capture_evidence',
  LOG_INCIDENT = 'log_incident',
  CUSTOM_ACTION = 'custom_action',
}

export interface ActionParameters {
  message?: string; // Alert/warning message
  severity?: ViolationSeverity;
  recipients?: string[]; // Notification recipients
  evidence?: EvidenceCapture;
  customData?: Record<string, any>;
}

export interface EvidenceCapture {
  screenshot: boolean;
  videoClip: boolean;
  audioClip: boolean;
  logSnapshot: boolean;
  duration?: number; // Evidence duration (ms)
  quality?: string; // Evidence quality
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
  maxLevel: number;
  resetTimeMs: number; // Time to reset escalation
}

export interface EscalationLevel {
  level: number;
  threshold: number; // Violation count threshold
  timeWindowMs: number; // Time window for threshold
  actions: RuleAction[];
  notificationDelay: number; // Delay between notifications
}

export interface RuleMetadata {
  version: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category: string;
  effectiveness: number; // Rule effectiveness score
  falsePositiveRate: number;
}

// Alert and notification system
export interface AlertConfiguration {
  enabled: boolean;
  channels: AlertChannel[];
  templates: AlertTemplate[];
  escalation: AlertEscalation;
  delivery: DeliverySettings;
}

export interface AlertChannel {
  id: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  configuration: ChannelConfiguration;
  priority: number;
  rateLimiting: RateLimitingConfig;
}

export enum ChannelType {
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  TEAMS = 'teams',
  PUSH_NOTIFICATION = 'push_notification',
  IN_APP = 'in_app',
  DASHBOARD = 'dashboard',
}

export interface ChannelConfiguration {
  endpoint?: string; // Webhook/API endpoint
  credentials?: Record<string, string>;
  headers?: Record<string, string>;
  retryPolicy?: RetryPolicy;
  timeout?: number;
}

export interface RateLimitingConfig {
  enabled: boolean;
  maxPerMinute: number;
  maxPerHour: number;
  burstSize: number;
  backoffStrategy: BackoffStrategy;
}

export enum BackoffStrategy {
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  FIXED = 'fixed',
}

export interface AlertTemplate {
  id: string;
  name: string;
  type: AlertType;
  severity: ViolationSeverity;
  subject: string;
  body: string;
  format: TemplateFormat;
  variables: TemplateVariable[];
}

export enum AlertType {
  VIOLATION_DETECTED = 'violation_detected',
  THRESHOLD_EXCEEDED = 'threshold_exceeded',
  SYSTEM_ALERT = 'system_alert',
  ASSESSMENT_ANOMALY = 'assessment_anomaly',
  TECHNICAL_ISSUE = 'technical_issue',
}

export enum TemplateFormat {
  PLAIN_TEXT = 'plain_text',
  HTML = 'html',
  MARKDOWN = 'markdown',
  JSON = 'json',
}

export interface TemplateVariable {
  name: string;
  type: VariableType;
  required: boolean;
  defaultValue?: any;
  description: string;
}

export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  OBJECT = 'object',
  ARRAY = 'array',
}

export interface AlertEscalation {
  enabled: boolean;
  timeouts: EscalationTimeout[];
  recipients: EscalationRecipient[];
}

export interface EscalationTimeout {
  level: number;
  timeoutMs: number;
  action: EscalationAction;
}

export enum EscalationAction {
  NOTIFY_NEXT_LEVEL = 'notify_next_level',
  REPEAT_CURRENT_LEVEL = 'repeat_current_level',
  SKIP_TO_FINAL_LEVEL = 'skip_to_final_level',
  CUSTOM_ACTION = 'custom_action',
}

export interface EscalationRecipient {
  level: number;
  recipients: string[];
  channels: string[];
  priority: number;
}

export interface DeliverySettings {
  retryAttempts: number;
  retryDelayMs: number;
  deliveryTimeout: number;
  batchingEnabled: boolean;
  batchSize: number;
  batchDelayMs: number;
}

// Reporting and analytics
export interface ReportConfiguration {
  enabled: boolean;
  types: ReportType[];
  schedule: ReportSchedule;
  delivery: ReportDelivery;
  retention: ReportRetention;
}

export enum ReportType {
  VIOLATION_SUMMARY = 'violation_summary',
  DETAILED_ANALYSIS = 'detailed_analysis',
  TREND_ANALYSIS = 'trend_analysis',
  EFFECTIVENESS_REPORT = 'effectiveness_report',
  COMPLIANCE_REPORT = 'compliance_report',
  CUSTOM_REPORT = 'custom_report',
}

export interface ReportSchedule {
  frequency: ReportFrequency;
  time: string; // Time of day (HH:MM)
  timezone: string;
  daysOfWeek?: number[]; // For weekly reports
  dayOfMonth?: number; // For monthly reports
}

export enum ReportFrequency {
  REAL_TIME = 'real_time',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ON_DEMAND = 'on_demand',
}

export interface ReportDelivery {
  channels: string[]; // Delivery channels
  recipients: string[]; // Report recipients
  format: ReportFormat[]; // Report formats
  compression: boolean;
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
}

export interface ReportRetention {
  keepDays: number;
  archiveAfterDays: number;
  compressionEnabled: boolean;
  secureDelete: boolean;
}

// Real-time monitoring and events
export interface IntegrityEvent {
  id: string;
  sessionId: string;
  userId: string;
  assessmentId: string;
  timestamp: Date;
  type: ViolationType;
  severity: ViolationSeverity;
  category: RuleCategory;
  description: string;
  details: EventDetails;
  evidence: Evidence[];
  ruleId?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata: EventMetadata;
}

export interface EventDetails {
  confidence: number;
  duration?: number;
  location?: EventLocation;
  context: Record<string, any>;
  relatedEvents: string[]; // Related event IDs
  parentEventId?: string; // Parent event for grouped events
}

export interface EventLocation {
  component: string; // Which component detected the event
  coordinates?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  timestamp: number;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  format: string;
  size: number;
  path: string;
  hash: string; // Evidence integrity hash
  encrypted: boolean;
  retentionDate: Date;
  metadata: EvidenceMetadata;
}

export enum EvidenceType {
  SCREENSHOT = 'screenshot',
  VIDEO_CLIP = 'video_clip',
  AUDIO_CLIP = 'audio_clip',
  LOG_SNAPSHOT = 'log_snapshot',
  SYSTEM_INFO = 'system_info',
  NETWORK_DATA = 'network_data',
  BIOMETRIC_DATA = 'biometric_data',
}

export interface EvidenceMetadata {
  captureMethod: string;
  quality: string;
  compression: string;
  originalSize: number;
  capturedAt: Date;
  processingTime: number;
}

export interface EventMetadata {
  processingTime: number;
  algorithmVersion: string;
  modelVersion?: string;
  confidence: number;
  reviewRequired: boolean;
  automaticActions: string[];
  manualActions: string[];
}

// Monitoring statistics and metrics
export interface MonitoringStatistics {
  sessionId: string;
  timeRange: TimeRange;
  totalEvents: number;
  eventsByType: Record<ViolationType, number>;
  eventsBySeverity: Record<ViolationSeverity, number>;
  riskScore: RiskScore;
  compliance: ComplianceMetrics;
  performance: PerformanceMetrics;
  recommendations: string[];
}

export interface TimeRange {
  start: Date;
  end: Date;
  duration: number; // Duration in milliseconds
}

export interface RiskScore {
  overall: number; // 0-100 risk score
  categories: Record<RuleCategory, number>;
  trend: RiskTrend;
  factors: RiskFactor[];
}

export enum RiskTrend {
  DECREASING = 'decreasing',
  STABLE = 'stable',
  INCREASING = 'increasing',
  VOLATILE = 'volatile',
}

export interface RiskFactor {
  category: RuleCategory;
  weight: number;
  contribution: number;
  description: string;
}

export interface ComplianceMetrics {
  overallScore: number; // 0-100 compliance score
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  category: string;
  status: ComplianceStatus;
  score: number;
  details: string;
}

export enum ComplianceStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  NOT_APPLICABLE = 'not_applicable',
  PENDING = 'pending',
}

export interface PerformanceMetrics {
  detectionLatency: number; // Average detection latency (ms)
  processingTime: number; // Average processing time (ms)
  alertLatency: number; // Average alert latency (ms)
  accuracy: AccuracyMetrics;
  resourceUsage: ResourceUsage;
}

export interface AccuracyMetrics {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface ResourceUsage {
  cpuUsage: number; // CPU usage percentage
  memoryUsage: number; // Memory usage in MB
  networkUsage: number; // Network usage in KB/s
  storageUsage: number; // Storage usage in MB
}

// Integrity monitoring service options
export interface IntegrityMonitoringOptions {
  config: IntegrityMonitoringConfig;
  storage: StorageOptions;
  processing: ProcessingOptions;
  security: SecurityOptions;
}

export interface StorageOptions {
  events: {
    enabled: boolean;
    retentionDays: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
  evidence: {
    enabled: boolean;
    retentionDays: number;
    maxSizeMB: number;
    compressionLevel: number;
    encryptionEnabled: boolean;
  };
  reports: {
    enabled: boolean;
    retentionDays: number;
    archiveAfterDays: number;
    compressionEnabled: boolean;
  };
}

export interface ProcessingOptions {
  realTimeEnabled: boolean;
  batchProcessingEnabled: boolean;
  maxConcurrentSessions: number;
  processingTimeoutMs: number;
  retryPolicy: ProcessingRetryPolicy;
}

export interface ProcessingRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

export interface SecurityOptions {
  encryptionEnabled: boolean;
  hashingAlgorithm: string;
  keyRotationDays: number;
  auditLoggingEnabled: boolean;
  accessControlEnabled: boolean;
}
