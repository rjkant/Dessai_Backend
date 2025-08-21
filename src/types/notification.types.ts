/**
 * Notification Service Type Definitions
 * AI-native technical hiring platform - Epic 6: Notification Service
 *
 * Comprehensive notification system supporting multiple channels:
 * - Email notifications (SendGrid)
 * - SMS notifications (Twilio)
 * - Push notifications (Web Push API)
 * - Webhook delivery system
 * - Template management
 * - User preferences
 * - Delivery tracking
 * - Consent management
 * - Frequency limiting
 * - A/B testing support
 * - Analytics and reporting
 */

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
  IN_APP = 'IN_APP',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
  DISCORD = 'DISCORD',
}

export enum NotificationType {
  // Assessment notifications
  ASSESSMENT_INVITATION = 'ASSESSMENT_INVITATION',
  ASSESSMENT_SCHEDULED = 'ASSESSMENT_SCHEDULED',
  ASSESSMENT_REMINDER = 'ASSESSMENT_REMINDER',
  ASSESSMENT_STARTED = 'ASSESSMENT_STARTED',
  ASSESSMENT_COMPLETED = 'ASSESSMENT_COMPLETED',
  ASSESSMENT_EXPIRED = 'ASSESSMENT_EXPIRED',
  ASSESSMENT_GRADED = 'ASSESSMENT_GRADED',
  ASSESSMENT_RESULTS = 'ASSESSMENT_RESULTS',

  // Collaboration notifications
  COLLABORATION_INVITE = 'COLLABORATION_INVITE',
  COLLABORATION_STARTED = 'COLLABORATION_STARTED',
  COLLABORATION_ENDED = 'COLLABORATION_ENDED',
  CODE_SHARED = 'CODE_SHARED',

  // System notifications
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SECURITY_ALERT = 'SECURITY_ALERT',

  // Account notifications
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  LOGIN_ALERT = 'LOGIN_ALERT',

  // Proctoring notifications
  PROCTORING_VIOLATION = 'PROCTORING_VIOLATION',
  PROCTORING_WARNING = 'PROCTORING_WARNING',
  PROCTORING_REPORT = 'PROCTORING_REPORT',

  // Analytics notifications
  BIAS_ALERT = 'BIAS_ALERT',
  PERFORMANCE_REPORT = 'PERFORMANCE_REPORT',
  ANALYTICS_DIGEST = 'ANALYTICS_DIGEST',

  // Integration notifications
  ATS_SYNC_SUCCESS = 'ATS_SYNC_SUCCESS',
  ATS_SYNC_FAILURE = 'ATS_SYNC_FAILURE',
  CALENDAR_CONFLICT = 'CALENDAR_CONFLICT',

  // Marketing notifications
  MARKETING = 'MARKETING',

  // Custom notifications
  CUSTOM_ALERT = 'CUSTOM_ALERT',
  CUSTOM_REMINDER = 'CUSTOM_REMINDER',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  SPAM = 'SPAM',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  BLOCKED = 'BLOCKED',
  EXPIRED = 'EXPIRED',
}

export enum TemplateFormat {
  HTML = 'HTML',
  TEXT = 'TEXT',
  MARKDOWN = 'MARKDOWN',
  JSON = 'JSON',
}

export enum ConsentType {
  MARKETING = 'MARKETING',
  TRANSACTIONAL = 'TRANSACTIONAL',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  ANALYTICS = 'ANALYTICS',
}

export enum FrequencyLimit {
  IMMEDIATE = 'IMMEDIATE',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  NEVER = 'NEVER',
}

export enum ChannelSelectionStrategy {
  SINGLE_BEST = 'SINGLE_BEST',
  MULTI_CHANNEL = 'MULTI_CHANNEL',
  SCORE_BASED = 'SCORE_BASED',
  COST_OPTIMIZED = 'COST_OPTIMIZED',
  RELIABILITY_FIRST = 'RELIABILITY_FIRST',
  SPEED_FIRST = 'SPEED_FIRST',
}

export enum FallbackStrategy {
  NONE = 'NONE',
  SINGLE_BEST = 'SINGLE_BEST',
  ALL_AVAILABLE = 'ALL_AVAILABLE',
  DIFFERENT_TYPE = 'DIFFERENT_TYPE',
}

// Core notification interfaces
export interface NotificationRecipient {
  id: string;
  type: 'USER' | 'ROLE' | 'GROUP' | 'ORGANIZATION';
  email?: string;
  phoneNumber?: string;
  pushEndpoint?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channels: NotificationChannel[];
  format: TemplateFormat;
  subject?: string;
  content: string;
  variables: string[];
  locales: string[];
  version: number;
  isActive: boolean;
  abTestVariant?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface NotificationContent {
  subject?: string;
  title?: string;
  body: string;
  html?: string;
  markdown?: string;
  attachments?: NotificationAttachment[];
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export interface NotificationAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  size: number;
  url?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  url: string;
  style?: 'primary' | 'secondary' | 'danger';
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  channels: Record<
    NotificationChannel,
    {
      enabled: boolean;
      priority: number;
    }
  >;
  types: Record<
    NotificationType,
    {
      enabled: boolean;
      frequency: string;
    }
  >;
  frequency: Record<NotificationType, FrequencyLimit>;
  quietHours?: QuietHours;
  consent: Record<
    ConsentType,
    {
      granted: boolean;
      timestamp: Date;
      source: string;
    }
  >;
  locale: string;
  metadata?: Record<string, any>;
  updatedAt: Date;
}

export interface QuietHours {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface ChannelPerformanceMetrics {
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  averageDeliveryTime: number;
  costPerMessage: number;
}

export interface ChannelCostMetrics {
  baseCost: number;
  perRecipientCost: number;
  currency: string;
}

export interface OrchestrationRule {
  id: string;
  name: string;
  conditions: NotificationCondition[];
  channelStrategy: ChannelSelectionStrategy;
  fallbackStrategy: FallbackStrategy;
  priority: number;
  isActive: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  type: NotificationType;
  conditions: NotificationCondition[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  template: string;
  isActive: boolean;
  schedule?: NotificationSchedule;
  rateLimiting?: NotificationRateLimit;
  abTest?: NotificationABTest;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'less_than'
    | 'in'
    | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface NotificationSchedule {
  type: 'immediate' | 'delayed' | 'scheduled' | 'recurring';
  delay?: number; // minutes
  scheduledAt?: Date;
  recurring?: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

export interface NotificationRateLimit {
  maxPerMinute?: number;
  maxPerHour?: number;
  maxPerDay?: number;
  maxPerWeek?: number;
  maxPerMonth?: number;
}

export interface NotificationABTest {
  id: string;
  name: string;
  variants: NotificationVariant[];
  distribution: Record<string, number>; // variant -> percentage
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface NotificationVariant {
  id: string;
  name: string;
  template: string;
  weight: number;
}

// Core notification request/response interfaces
export interface CreateNotificationRequest {
  type: NotificationType;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  content?: NotificationContent;
  templateId?: string;
  variables?: Record<string, any>;
  schedule?: NotificationSchedule;
  metadata?: Record<string, any>;
  organizationId: string;
  createdBy: string;
}

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  status: DeliveryStatus;
  recipients: NotificationRecipient[];
  content: NotificationContent;
  templateId?: string;
  variables?: Record<string, any>;
  schedule?: NotificationSchedule;
  deliveries: NotificationDelivery[];
  metrics: NotificationMetrics;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  recipient: NotificationRecipient;
  channel: NotificationChannel;
  status: DeliveryStatus;
  attempts: number;
  lastAttempt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  providerResponse?: any;
  cost?: number;
  metadata?: Record<string, any>;
}

export interface NotificationMetrics {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  bouncedCount: number;
  openedCount?: number;
  clickedCount?: number;
  unsubscribedCount?: number;
  spamCount?: number;
  deliveryRate: number;
  openRate?: number;
  clickRate?: number;
  bounceRate: number;
  cost: number;
  avgDeliveryTime?: number;
}

// Provider interfaces
export interface EmailProvider {
  name: string;
  send(request: EmailSendRequest): Promise<EmailSendResponse>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  handleWebhook(payload: any): Promise<void>;
}

export interface EmailSendRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: NotificationAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailSendResponse {
  messageId: string;
  status: DeliveryStatus;
  providerResponse: any;
  cost?: number;
}

export interface SMSProvider {
  name: string;
  send(request: SMSSendRequest): Promise<SMSSendResponse>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  handleWebhook(payload: any): Promise<void>;
}

export interface SMSSendRequest {
  to: string;
  from: string;
  body: string;
  mediaUrls?: string[];
  metadata?: Record<string, any>;
}

export interface SMSSendResponse {
  messageId: string;
  status: DeliveryStatus;
  providerResponse: any;
  cost?: number;
}

export interface PushProvider {
  name: string;
  send(request: PushSendRequest): Promise<PushSendResponse>;
  subscribe(endpoint: string, keys: any): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
}

export interface PushSendRequest {
  endpoint: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: NotificationAction[];
  ttl?: number;
}

export interface PushSendResponse {
  messageId: string;
  status: DeliveryStatus;
  providerResponse: any;
}

export interface WebhookProvider {
  name: string;
  send(request: WebhookSendRequest): Promise<WebhookSendResponse>;
  verifySignature(payload: string, signature: string, secret: string): boolean;
}

export interface WebhookSendRequest {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body: any;
  timeout?: number;
  retries?: number;
  metadata?: Record<string, any>;
}

export interface WebhookSendResponse {
  messageId: string;
  status: DeliveryStatus;
  statusCode: number;
  responseBody?: any;
  responseTime: number;
}

// Analytics and reporting interfaces
export interface NotificationAnalytics {
  organizationId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  overview: {
    totalNotifications: number;
    totalRecipients: number;
    totalDeliveries: number;
    totalCost: number;
    averageDeliveryTime: number;
    successRate: number;
  };
  byChannel: Record<
    NotificationChannel,
    {
      sent: number;
      delivered: number;
      failed: number;
      cost: number;
      deliveryRate: number;
    }
  >;
  byType: Record<
    NotificationType,
    {
      sent: number;
      delivered: number;
      failed: number;
      avgDeliveryTime: number;
    }
  >;
  byPriority: Record<
    NotificationPriority,
    {
      sent: number;
      delivered: number;
      avgDeliveryTime: number;
    }
  >;
  trends: {
    daily: Array<{
      date: string;
      sent: number;
      delivered: number;
      failed: number;
      cost: number;
    }>;
    hourly: Array<{
      hour: number;
      sent: number;
      delivered: number;
      failed: number;
    }>;
  };
  topFailureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  deliveryPerformance: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description?: string;
  type: NotificationType;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  targetAudience: {
    criteria: NotificationCondition[];
    estimatedSize: number;
    actualSize?: number;
  };
  content: NotificationContent;
  channels: NotificationChannel[];
  schedule: NotificationSchedule;
  abTest?: NotificationABTest;
  metrics: NotificationMetrics;
  budget?: {
    maxCost: number;
    currentCost: number;
  };
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

// API request/response interfaces
export interface GetNotificationsRequest {
  organizationId: string;
  types?: NotificationType[];
  channels?: NotificationChannel[];
  status?: DeliveryStatus[];
  priority?: NotificationPriority[];
  startDate?: Date;
  endDate?: Date;
  recipientId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'sentAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface GetNotificationsResponse {
  items: NotificationRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    applied: any;
    available: any;
  };
}

export interface UpdatePreferencesRequest {
  userId: string;
  channels?: Record<NotificationChannel, { enabled: boolean; priority: number }>;
  types?: Record<NotificationType, { enabled: boolean; frequency: string }>;
  frequency?: Record<NotificationType, FrequencyLimit>;
  quietHours?: QuietHours;
  locale?: string;
}

export interface UnsubscribeRequest {
  token: string;
  userId?: string;
  email?: string;
  types?: NotificationType[];
  channels?: NotificationChannel[];
  reason?: string;
}

export interface NotificationServiceConfig {
  providers: {
    email: {
      primary: string;
      fallback?: string;
      sendgrid?: {
        apiKey: string;
        fromEmail: string;
        fromName: string;
        templateIds?: Record<NotificationType, string>;
      };
      ses?: {
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
        fromEmail: string;
        fromName: string;
      };
    };
    sms: {
      primary: string;
      fallback?: string;
      twilio?: {
        accountSid: string;
        authToken: string;
        fromNumber: string;
      };
      aws?: {
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
      };
    };
    push: {
      webPush?: {
        vapidPublicKey: string;
        vapidPrivateKey: string;
        subject: string;
      };
      firebase?: {
        serviceAccountKey: string;
        projectId: string;
      };
    };
  };
  queues: {
    immediate: {
      maxRetries: number;
      retryDelay: number;
    };
    batch: {
      batchSize: number;
      processingInterval: number;
      maxRetries: number;
    };
  };
  rateLimits: {
    global: {
      maxPerMinute: number;
      maxPerHour: number;
    };
    perChannel: Record<
      NotificationChannel,
      {
        maxPerMinute: number;
        maxPerHour: number;
      }
    >;
  };
  costs: Record<
    NotificationChannel,
    {
      baseCost: number;
      perRecipientCost: number;
      currency: string;
    }
  >;
  compliance: {
    unsubscribeUrl: string;
    privacyPolicyUrl: string;
    termsOfServiceUrl: string;
    dataRetentionDays: number;
    gdprCompliant: boolean;
    canSpamCompliant: boolean;
  };
  analytics: {
    enableTracking: boolean;
    enableOpenTracking: boolean;
    enableClickTracking: boolean;
    retentionDays: number;
  };
}

// Utility types
export type NotificationEventHandler = (notification: NotificationRecord) => Promise<void>;
export type TemplateRenderer = (template: string, variables: Record<string, any>) => string;
export type PreferenceValidator = (preferences: NotificationPreferences) => boolean;
export type CampaignTargeting = (
  criteria: NotificationCondition[]
) => Promise<NotificationRecipient[]>;

// Error types
export class NotificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class TemplateError extends NotificationError {
  constructor(message: string, templateId: string, metadata?: Record<string, any>) {
    super(message, 'TEMPLATE_ERROR', 400, { templateId, ...metadata });
    this.name = 'TemplateError';
  }
}

export class DeliveryError extends NotificationError {
  constructor(
    message: string,
    channel: NotificationChannel,
    provider: string,
    metadata?: Record<string, any>
  ) {
    super(message, 'DELIVERY_ERROR', 500, { channel, provider, ...metadata });
    this.name = 'DeliveryError';
  }
}

export class PreferencesError extends NotificationError {
  constructor(message: string, userId: string, metadata?: Record<string, any>) {
    super(message, 'PREFERENCES_ERROR', 400, { userId, ...metadata });
    this.name = 'PreferencesError';
  }
}

export class RateLimitError extends NotificationError {
  constructor(
    message: string,
    channel: NotificationChannel,
    limit: string,
    metadata?: Record<string, any>
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, { channel, limit, ...metadata });
    this.name = 'RateLimitError';
  }
}

export class ConsentError extends NotificationError {
  constructor(
    message: string,
    userId: string,
    consentType: ConsentType,
    metadata?: Record<string, any>
  ) {
    super(message, 'CONSENT_ERROR', 403, { userId, consentType, ...metadata });
    this.name = 'ConsentError';
  }
}
