/**
 * Notification Orchestrator Service
 * AI-native technical hiring platform - Epic 6: Advanced Notification System
 *
 * Multi-channel orchestration service:
 * - Intelligent channel selection based on urgency and user preferences
 * - Unified preference management across email, SMS, push, in-app
 * - Fallback mechanisms for failed delivery attempts
 * - Do-not-disturb and quiet hours enforcement
 * - Cross-channel message consistency
 * - Performance optimization and cost management
 */

import { PrismaClient } from '@prisma/client';
import RedisService from './redis.service';
import { Logger } from '@/utils/logger.utils';
import {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  DeliveryStatus,
  NotificationRecipient,
  NotificationContent,
  NotificationPreferences,
  ChannelSelectionStrategy,
  OrchestrationRule,
  FallbackStrategy,
  ChannelPerformanceMetrics,
  ChannelCostMetrics,
  QuietHours,
  NotificationDelivery,
  FrequencyLimit,
  ConsentType,
} from '@/types/notification.types';

export interface ChannelSelectionConfig {
  strategy: ChannelSelectionStrategy;
  fallbackEnabled: boolean;
  fallbackDelay: number; // milliseconds
  maxAttempts: number;
  respectQuietHours: boolean;
  costOptimization: boolean;
  performanceThreshold: number; // 0-1 (minimum success rate)
}

export interface OrchestrationOptions {
  priority: NotificationPriority;
  urgent: boolean;
  costSensitive: boolean;
  trackingRequired: boolean;
  deliveryConfirmation: boolean;
  maxDeliveryTime: number; // milliseconds
  fallbackStrategy: FallbackStrategy;
}

export interface ChannelScore {
  channel: NotificationChannel;
  score: number;
  reasoning: string[];
  cost: number;
  expectedDeliveryTime: number;
  successProbability: number;
}

export interface OrchestrationResult {
  selectedChannels: NotificationChannel[];
  fallbackChannels: NotificationChannel[];
  scheduling: {
    immediate: NotificationChannel[];
    delayed: Array<{
      channel: NotificationChannel;
      delay: number;
      reason: string;
    }>;
  };
  costEstimate: number;
  expectedDeliveryTime: number;
  confidence: number;
}

export class NotificationOrchestratorService {
  private prisma: PrismaClient;
  private redis: RedisService;
  private logger: Logger;

  // Default channel performance metrics
  private defaultMetrics: Record<NotificationChannel, ChannelPerformanceMetrics> = {
    [NotificationChannel.EMAIL]: {
      deliveryRate: 0.98,
      openRate: 0.22,
      clickRate: 0.03,
      averageDeliveryTime: 30000, // 30 seconds
      costPerMessage: 0.001,
    },
    [NotificationChannel.SMS]: {
      deliveryRate: 0.99,
      openRate: 0.95,
      clickRate: 0.08,
      averageDeliveryTime: 5000, // 5 seconds
      costPerMessage: 0.04,
    },
    [NotificationChannel.PUSH]: {
      deliveryRate: 0.92,
      openRate: 0.4,
      clickRate: 0.12,
      averageDeliveryTime: 2000, // 2 seconds
      costPerMessage: 0.0001,
    },
    [NotificationChannel.IN_APP]: {
      deliveryRate: 1.0,
      openRate: 0.85,
      clickRate: 0.25,
      averageDeliveryTime: 100, // 100ms
      costPerMessage: 0.0,
    },
    [NotificationChannel.WEBHOOK]: {
      deliveryRate: 0.95,
      openRate: 1.0,
      clickRate: 1.0,
      averageDeliveryTime: 1000, // 1 second
      costPerMessage: 0.001,
    },
    [NotificationChannel.SLACK]: {
      deliveryRate: 0.96,
      openRate: 0.75,
      clickRate: 0.15,
      averageDeliveryTime: 3000, // 3 seconds
      costPerMessage: 0.002,
    },
    [NotificationChannel.TEAMS]: {
      deliveryRate: 0.94,
      openRate: 0.7,
      clickRate: 0.12,
      averageDeliveryTime: 4000, // 4 seconds
      costPerMessage: 0.002,
    },
    [NotificationChannel.DISCORD]: {
      deliveryRate: 0.93,
      openRate: 0.65,
      clickRate: 0.1,
      averageDeliveryTime: 2500, // 2.5 seconds
      costPerMessage: 0.001,
    },
  };

  constructor(prisma: PrismaClient, redis: RedisService, logger: Logger) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * Orchestrate notification delivery across multiple channels
   */
  async orchestrateDelivery(
    recipients: NotificationRecipient[],
    content: NotificationContent,
    type: NotificationType,
    options: OrchestrationOptions,
    config?: ChannelSelectionConfig
  ): Promise<Map<string, OrchestrationResult>> {
    const results = new Map<string, OrchestrationResult>();

    for (const recipient of recipients) {
      try {
        const result = await this.orchestrateForRecipient(
          recipient,
          content,
          type,
          options,
          config
        );
        results.set(recipient.id, result);
      } catch (error) {
        this.logger.error('Failed to orchestrate for recipient', {
          error,
          recipientId: recipient.id,
          type,
          options,
        });

        // Fallback to default strategy
        results.set(recipient.id, {
          selectedChannels: [NotificationChannel.EMAIL],
          fallbackChannels: [],
          scheduling: {
            immediate: [NotificationChannel.EMAIL],
            delayed: [],
          },
          costEstimate: 0.001,
          expectedDeliveryTime: 30000,
          confidence: 0.5,
        });
      }
    }

    return results;
  }

  /**
   * Orchestrate delivery for a single recipient
   */
  private async orchestrateForRecipient(
    recipient: NotificationRecipient,
    content: NotificationContent,
    type: NotificationType,
    options: OrchestrationOptions,
    config?: ChannelSelectionConfig
  ): Promise<OrchestrationResult> {
    // Get user preferences
    const preferences = await this.getUserPreferences(recipient.id);

    // Get available channels for recipient
    const availableChannels = await this.getAvailableChannels(recipient);

    // Score channels based on multiple factors
    const channelScores = await this.scoreChannels(
      availableChannels,
      recipient,
      type,
      options,
      preferences,
      config
    );

    // Apply quiet hours filter
    const filteredScores = await this.applyQuietHoursFilter(
      channelScores,
      preferences,
      config?.respectQuietHours ?? true
    );

    // Select optimal channels
    const selectedChannels = this.selectOptimalChannels(filteredScores, options, config);

    // Determine fallback strategy
    const fallbackChannels = this.determineFallbackChannels(
      channelScores,
      selectedChannels,
      options.fallbackStrategy
    );

    // Create scheduling plan
    const scheduling = await this.createSchedulingPlan(
      selectedChannels,
      fallbackChannels,
      preferences,
      options
    );

    // Calculate cost and delivery estimates
    const costEstimate = this.calculateCostEstimate(selectedChannels, fallbackChannels);
    const expectedDeliveryTime = this.calculateExpectedDeliveryTime(selectedChannels);
    const confidence = this.calculateConfidence(channelScores, selectedChannels);

    return {
      selectedChannels,
      fallbackChannels,
      scheduling,
      costEstimate,
      expectedDeliveryTime,
      confidence,
    };
  }

  /**
   * Score channels based on multiple factors
   */
  private async scoreChannels(
    availableChannels: NotificationChannel[],
    recipient: NotificationRecipient,
    type: NotificationType,
    options: OrchestrationOptions,
    preferences: NotificationPreferences,
    config?: ChannelSelectionConfig
  ): Promise<ChannelScore[]> {
    const scores: ChannelScore[] = [];

    for (const channel of availableChannels) {
      const metrics = await this.getChannelMetrics(channel, recipient.id);
      const score = await this.calculateChannelScore(
        channel,
        recipient,
        type,
        options,
        preferences,
        metrics,
        config
      );
      scores.push(score);
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate score for a specific channel
   */
  private async calculateChannelScore(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    type: NotificationType,
    options: OrchestrationOptions,
    preferences: NotificationPreferences,
    metrics: ChannelPerformanceMetrics,
    config?: ChannelSelectionConfig
  ): Promise<ChannelScore> {
    let score = 0;
    const reasoning: string[] = [];

    // User preference score (40% weight)
    const preferenceScore = this.calculatePreferenceScore(channel, type, preferences);
    score += preferenceScore * 0.4;
    if (preferenceScore > 0.7) {
      reasoning.push(`High user preference (${(preferenceScore * 100).toFixed(0)}%)`);
    }

    // Performance score (30% weight)
    const performanceScore = this.calculatePerformanceScore(channel, metrics, options);
    score += performanceScore * 0.3;
    if (performanceScore > 0.8) {
      reasoning.push(`Excellent performance (${(performanceScore * 100).toFixed(0)}%)`);
    }

    // Cost efficiency score (15% weight)
    const costScore = this.calculateCostScore(channel, metrics, options.costSensitive);
    score += costScore * 0.15;
    if (costScore > 0.8) {
      reasoning.push('Cost efficient');
    }

    // Urgency compatibility (10% weight)
    const urgencyScore = this.calculateUrgencyScore(channel, options.priority, options.urgent);
    score += urgencyScore * 0.1;
    if (urgencyScore > 0.9) {
      reasoning.push('Excellent for urgent delivery');
    }

    // Availability score (5% weight)
    const availabilityScore = this.calculateAvailabilityScore(channel, recipient);
    score += availabilityScore * 0.05;

    return {
      channel,
      score: Math.max(0, Math.min(1, score)),
      reasoning,
      cost: metrics.costPerMessage,
      expectedDeliveryTime: metrics.averageDeliveryTime,
      successProbability: metrics.deliveryRate,
    };
  }

  /**
   * Calculate preference score based on user settings
   */
  private calculatePreferenceScore(
    channel: NotificationChannel,
    type: NotificationType,
    preferences: NotificationPreferences
  ): number {
    // Check if channel is enabled for this notification type
    const channelPrefs = preferences.channels?.[channel];
    if (!channelPrefs?.enabled) {
      return 0;
    }

    const typePrefs = preferences.types?.[type];
    if (!typePrefs?.enabled) {
      return 0;
    }

    // Consider frequency preferences
    const frequency = typePrefs.frequency || 'normal';
    const frequencyMultiplier =
      {
        immediate: 1.0,
        normal: 0.8,
        digest: 0.6,
        weekly: 0.4,
        disabled: 0,
      }[frequency] || 0.8;

    // Consider channel-specific preferences
    const channelPriority = channelPrefs.priority || 0.5;

    return frequencyMultiplier * channelPriority;
  }

  /**
   * Calculate performance score based on historical metrics
   */
  private calculatePerformanceScore(
    channel: NotificationChannel,
    metrics: ChannelPerformanceMetrics,
    options: OrchestrationOptions
  ): number {
    let score = 0;

    // Delivery rate (50% of performance score)
    score += metrics.deliveryRate * 0.5;

    // Engagement rate (30% of performance score)
    const engagementRate = (metrics.openRate + metrics.clickRate) / 2;
    score += engagementRate * 0.3;

    // Speed (20% of performance score)
    const speedScore = options.urgent
      ? Math.max(0, 1 - metrics.averageDeliveryTime / 60000) // Urgent: prefer under 1 minute
      : Math.max(0, 1 - metrics.averageDeliveryTime / 300000); // Normal: prefer under 5 minutes
    score += speedScore * 0.2;

    return score;
  }

  /**
   * Calculate cost efficiency score
   */
  private calculateCostScore(
    channel: NotificationChannel,
    metrics: ChannelPerformanceMetrics,
    costSensitive: boolean
  ): number {
    if (!costSensitive) {
      return 1.0; // Cost doesn't matter
    }

    // Normalize cost (lower cost = higher score)
    const maxCost = 0.05; // SMS is typically the most expensive
    const normalizedCost = 1 - Math.min(metrics.costPerMessage / maxCost, 1);

    // Factor in value per dollar (delivery rate / cost)
    const valueScore = metrics.deliveryRate / (metrics.costPerMessage + 0.0001);
    const normalizedValue = Math.min(valueScore / 1000, 1); // Normalize to 0-1

    return (normalizedCost + normalizedValue) / 2;
  }

  /**
   * Calculate urgency compatibility score
   */
  private calculateUrgencyScore(
    channel: NotificationChannel,
    priority: NotificationPriority,
    urgent: boolean
  ): number {
    const channelUrgencyRatings: Record<NotificationChannel, number> = {
      [NotificationChannel.PUSH]: 1.0,
      [NotificationChannel.SMS]: 0.95,
      [NotificationChannel.IN_APP]: 0.9,
      [NotificationChannel.WEBHOOK]: 0.85,
      [NotificationChannel.EMAIL]: 0.7,
      [NotificationChannel.SLACK]: 0.88,
      [NotificationChannel.TEAMS]: 0.86,
      [NotificationChannel.DISCORD]: 0.84,
    };

    const baseScore = channelUrgencyRatings[channel] || 0.5;

    if (urgent || priority === NotificationPriority.URGENT) {
      return baseScore;
    }

    // For non-urgent notifications, all channels are equally suitable
    return 0.8;
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(
    channel: NotificationChannel,
    recipient: NotificationRecipient
  ): number {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return recipient.email ? 1.0 : 0.0;
      case NotificationChannel.SMS:
        return recipient.phoneNumber ? 1.0 : 0.0;
      case NotificationChannel.PUSH:
        return recipient.pushEndpoint ? 1.0 : 0.0;
      case NotificationChannel.WEBHOOK:
        return recipient.webhookUrl ? 1.0 : 0.0;
      case NotificationChannel.IN_APP:
        return 1.0; // Always available if user has an account
      default:
        return 0.5;
    }
  }

  /**
   * Apply quiet hours filtering
   */
  private async applyQuietHoursFilter(
    channelScores: ChannelScore[],
    preferences: NotificationPreferences,
    respectQuietHours: boolean
  ): Promise<ChannelScore[]> {
    if (!respectQuietHours || !preferences.quietHours?.enabled) {
      return channelScores;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const quietHours = preferences.quietHours;

    const isQuietTime = this.isQuietTime(currentHour, quietHours);

    if (!isQuietTime) {
      return channelScores;
    }

    // During quiet hours, filter out intrusive channels
    const intrusiveChannels = [NotificationChannel.SMS, NotificationChannel.PUSH];

    return channelScores.map(score => {
      if (intrusiveChannels.includes(score.channel)) {
        return {
          ...score,
          score: score.score * 0.1, // Heavily penalize intrusive channels
          reasoning: [...score.reasoning, 'Reduced due to quiet hours'],
        };
      }
      return score;
    });
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietTime(currentHour: number, quietHours: QuietHours): boolean {
    const { startHour, endHour, timezone } = quietHours;

    // TODO: Handle timezone conversion properly
    // For now, assume local time

    if (startHour <= endHour) {
      // Same day quiet hours (e.g., 22:00 - 08:00)
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 08:00)
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  /**
   * Select optimal channels based on scores and constraints
   */
  private selectOptimalChannels(
    channelScores: ChannelScore[],
    options: OrchestrationOptions,
    config?: ChannelSelectionConfig
  ): NotificationChannel[] {
    const strategy = config?.strategy || ChannelSelectionStrategy.SCORE_BASED;
    const maxChannels = this.getMaxChannels(options.priority, strategy);

    switch (strategy) {
      case ChannelSelectionStrategy.SINGLE_BEST:
        return channelScores.length > 0 ? [channelScores[0].channel] : [];

      case ChannelSelectionStrategy.MULTI_CHANNEL:
        return channelScores
          .slice(0, maxChannels)
          .filter(score => score.score > 0.3)
          .map(score => score.channel);

      case ChannelSelectionStrategy.COST_OPTIMIZED:
        return this.selectCostOptimizedChannels(channelScores, maxChannels);

      case ChannelSelectionStrategy.RELIABILITY_FIRST:
        return this.selectReliabilityFirstChannels(channelScores, maxChannels);

      case ChannelSelectionStrategy.SPEED_FIRST:
        return this.selectSpeedFirstChannels(channelScores, maxChannels);

      default: // SCORE_BASED
        return channelScores
          .slice(0, maxChannels)
          .filter(score => score.score > 0.4)
          .map(score => score.channel);
    }
  }

  /**
   * Determine fallback channels
   */
  private determineFallbackChannels(
    channelScores: ChannelScore[],
    selectedChannels: NotificationChannel[],
    fallbackStrategy: FallbackStrategy
  ): NotificationChannel[] {
    if (fallbackStrategy === FallbackStrategy.NONE) {
      return [];
    }

    const availableForFallback = channelScores
      .filter(score => !selectedChannels.includes(score.channel))
      .filter(score => score.score > 0.2);

    switch (fallbackStrategy) {
      case FallbackStrategy.SINGLE_BEST:
        return availableForFallback.length > 0 ? [availableForFallback[0].channel] : [];

      case FallbackStrategy.ALL_AVAILABLE:
        return availableForFallback.map(score => score.channel);

      case FallbackStrategy.DIFFERENT_TYPE:
        return this.selectDifferentTypeChannels(availableForFallback, selectedChannels);

      default:
        return [];
    }
  }

  /**
   * Create scheduling plan for selected channels
   */
  private async createSchedulingPlan(
    selectedChannels: NotificationChannel[],
    fallbackChannels: NotificationChannel[],
    preferences: NotificationPreferences,
    options: OrchestrationOptions
  ): Promise<OrchestrationResult['scheduling']> {
    const immediate: NotificationChannel[] = [];
    const delayed: Array<{ channel: NotificationChannel; delay: number; reason: string }> = [];

    // Schedule primary channels
    for (const channel of selectedChannels) {
      if (this.shouldSendImmediately(channel, options, preferences)) {
        immediate.push(channel);
      } else {
        const delay = this.calculateDelay(channel, options, preferences);
        delayed.push({
          channel,
          delay,
          reason: this.getDelayReason(channel, options, preferences),
        });
      }
    }

    return { immediate, delayed };
  }

  /**
   * Get available channels for recipient
   */
  private async getAvailableChannels(
    recipient: NotificationRecipient
  ): Promise<NotificationChannel[]> {
    const channels: NotificationChannel[] = [];

    if (recipient.email) {
      channels.push(NotificationChannel.EMAIL);
    }
    if (recipient.phoneNumber) {
      channels.push(NotificationChannel.SMS);
    }
    if (recipient.pushEndpoint) {
      channels.push(NotificationChannel.PUSH);
    }
    if (recipient.webhookUrl) {
      channels.push(NotificationChannel.WEBHOOK);
    }

    // In-app is always available for users
    channels.push(NotificationChannel.IN_APP);

    return channels;
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const cacheKey = `user_preferences:${userId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }

      // TODO: Implement database query for user preferences
      // For now, return default preferences
      const defaultPreferences: NotificationPreferences = {
        userId,
        channels: {
          [NotificationChannel.EMAIL]: { enabled: true, priority: 0.8 },
          [NotificationChannel.SMS]: { enabled: true, priority: 0.9 },
          [NotificationChannel.PUSH]: { enabled: true, priority: 0.7 },
          [NotificationChannel.IN_APP]: { enabled: true, priority: 0.6 },
          [NotificationChannel.WEBHOOK]: { enabled: false, priority: 0.5 },
          [NotificationChannel.SLACK]: { enabled: false, priority: 0.6 },
          [NotificationChannel.TEAMS]: { enabled: false, priority: 0.6 },
          [NotificationChannel.DISCORD]: { enabled: false, priority: 0.5 },
        },
        types: Object.fromEntries(
          Object.values(NotificationType).map(type => [
            type,
            {
              enabled: true,
              frequency: type === NotificationType.MARKETING ? 'weekly' : 'immediate',
            },
          ])
        ) as Record<NotificationType, { enabled: boolean; frequency: string }>,
        frequency: Object.fromEntries(
          Object.values(NotificationType).map(type => [
            type,
            type === NotificationType.MARKETING ? FrequencyLimit.WEEKLY : FrequencyLimit.IMMEDIATE,
          ])
        ) as Record<NotificationType, FrequencyLimit>,
        quietHours: {
          enabled: true,
          startHour: 22,
          endHour: 8,
          timezone: 'UTC',
        },
        consent: {
          [ConsentType.MARKETING]: { granted: false, timestamp: new Date(), source: 'default' },
          [ConsentType.TRANSACTIONAL]: { granted: true, timestamp: new Date(), source: 'default' },
          [ConsentType.SYSTEM]: { granted: true, timestamp: new Date(), source: 'default' },
          [ConsentType.SECURITY]: { granted: true, timestamp: new Date(), source: 'default' },
          [ConsentType.ANALYTICS]: { granted: true, timestamp: new Date(), source: 'default' },
        },
        locale: 'en',
        metadata: {},
        updatedAt: new Date(),
      };

      await this.redis.set(cacheKey, JSON.stringify(defaultPreferences), 300); // 5 minutes cache
      return defaultPreferences;
    } catch (error) {
      this.logger.error('Failed to get user preferences', { error, userId });
      throw error;
    }
  }

  /**
   * Get channel performance metrics
   */
  private async getChannelMetrics(
    channel: NotificationChannel,
    userId?: string
  ): Promise<ChannelPerformanceMetrics> {
    try {
      const cacheKey = `channel_metrics:${channel}:${userId || 'global'}`;
      const cached = await this.redis.get(cacheKey);

      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }

      // TODO: Implement database query for actual metrics
      // For now, return default metrics with some variation
      const baseMetrics = this.defaultMetrics[channel];
      const metrics = {
        ...baseMetrics,
        deliveryRate: Math.min(1, baseMetrics.deliveryRate + (Math.random() - 0.5) * 0.1),
        openRate: Math.max(0, baseMetrics.openRate + (Math.random() - 0.5) * 0.2),
        clickRate: Math.max(0, baseMetrics.clickRate + (Math.random() - 0.5) * 0.1),
        averageDeliveryTime: baseMetrics.averageDeliveryTime * (0.8 + Math.random() * 0.4),
      };

      await this.redis.set(cacheKey, JSON.stringify(metrics), 3600); // 1 hour cache
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get channel metrics', { error, channel, userId });
      return this.defaultMetrics[channel];
    }
  }

  // Helper methods for channel selection strategies
  private selectCostOptimizedChannels(
    scores: ChannelScore[],
    maxChannels: number
  ): NotificationChannel[] {
    return scores
      .sort((a, b) => a.cost - b.cost)
      .slice(0, maxChannels)
      .filter(score => score.score > 0.3)
      .map(score => score.channel);
  }

  private selectReliabilityFirstChannels(
    scores: ChannelScore[],
    maxChannels: number
  ): NotificationChannel[] {
    return scores
      .sort((a, b) => b.successProbability - a.successProbability)
      .slice(0, maxChannels)
      .filter(score => score.successProbability > 0.8)
      .map(score => score.channel);
  }

  private selectSpeedFirstChannels(
    scores: ChannelScore[],
    maxChannels: number
  ): NotificationChannel[] {
    return scores
      .sort((a, b) => a.expectedDeliveryTime - b.expectedDeliveryTime)
      .slice(0, maxChannels)
      .filter(score => score.score > 0.3)
      .map(score => score.channel);
  }

  private selectDifferentTypeChannels(
    availableScores: ChannelScore[],
    selectedChannels: NotificationChannel[]
  ): NotificationChannel[] {
    const channelTypes = new Set(selectedChannels.map(this.getChannelType));

    return availableScores
      .filter(score => !channelTypes.has(this.getChannelType(score.channel)))
      .slice(0, 2)
      .map(score => score.channel);
  }

  private getChannelType(channel: NotificationChannel): string {
    const typeMap: Record<NotificationChannel, string> = {
      [NotificationChannel.EMAIL]: 'async',
      [NotificationChannel.SMS]: 'sync',
      [NotificationChannel.PUSH]: 'sync',
      [NotificationChannel.IN_APP]: 'sync',
      [NotificationChannel.WEBHOOK]: 'api',
      [NotificationChannel.SLACK]: 'sync',
      [NotificationChannel.TEAMS]: 'sync',
      [NotificationChannel.DISCORD]: 'sync',
    };
    return typeMap[channel] || 'unknown';
  }

  private getMaxChannels(
    priority: NotificationPriority,
    strategy: ChannelSelectionStrategy
  ): number {
    if (strategy === ChannelSelectionStrategy.SINGLE_BEST) {
      return 1;
    }

    switch (priority) {
      case NotificationPriority.URGENT:
        return 3;
      case NotificationPriority.HIGH:
        return 2;
      case NotificationPriority.NORMAL:
        return 2;
      case NotificationPriority.LOW:
        return 1;
      default:
        return 2;
    }
  }

  private shouldSendImmediately(
    channel: NotificationChannel,
    options: OrchestrationOptions,
    preferences: NotificationPreferences
  ): boolean {
    if (options.urgent || options.priority === NotificationPriority.URGENT) {
      return true;
    }

    // Check if quiet hours would delay this channel
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const isQuiet = this.isQuietTime(now.getHours(), preferences.quietHours);
      if (isQuiet && [NotificationChannel.SMS, NotificationChannel.PUSH].includes(channel)) {
        return false;
      }
    }

    return true;
  }

  private calculateDelay(
    channel: NotificationChannel,
    options: OrchestrationOptions,
    preferences: NotificationPreferences
  ): number {
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const isQuiet = this.isQuietTime(now.getHours(), preferences.quietHours);

      if (isQuiet && [NotificationChannel.SMS, NotificationChannel.PUSH].includes(channel)) {
        // Calculate delay until quiet hours end
        const endHour = preferences.quietHours.endHour;
        const currentHour = now.getHours();

        let hoursUntilEnd = endHour - currentHour;
        if (hoursUntilEnd <= 0) {
          hoursUntilEnd += 24;
        }

        return hoursUntilEnd * 60 * 60 * 1000; // Convert to milliseconds
      }
    }

    return 0;
  }

  private getDelayReason(
    channel: NotificationChannel,
    options: OrchestrationOptions,
    preferences: NotificationPreferences
  ): string {
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const isQuiet = this.isQuietTime(now.getHours(), preferences.quietHours);

      if (isQuiet && [NotificationChannel.SMS, NotificationChannel.PUSH].includes(channel)) {
        return `Delayed due to quiet hours (${preferences.quietHours.startHour}:00 - ${preferences.quietHours.endHour}:00)`;
      }
    }

    return 'Immediate delivery';
  }

  private calculateCostEstimate(
    selectedChannels: NotificationChannel[],
    fallbackChannels: NotificationChannel[]
  ): number {
    const allChannels = [...selectedChannels, ...fallbackChannels];
    return allChannels.reduce((total, channel) => {
      return total + this.defaultMetrics[channel].costPerMessage;
    }, 0);
  }

  private calculateExpectedDeliveryTime(selectedChannels: NotificationChannel[]): number {
    if (selectedChannels.length === 0) {
      return 0;
    }

    // Return the fastest expected delivery time
    return Math.min(
      ...selectedChannels.map(channel => this.defaultMetrics[channel].averageDeliveryTime)
    );
  }

  private calculateConfidence(
    channelScores: ChannelScore[],
    selectedChannels: NotificationChannel[]
  ): number {
    if (selectedChannels.length === 0) {
      return 0;
    }

    const selectedScores = channelScores.filter(score => selectedChannels.includes(score.channel));

    if (selectedScores.length === 0) {
      return 0.5;
    }

    const averageScore =
      selectedScores.reduce((sum, score) => sum + score.score, 0) / selectedScores.length;
    return Math.max(0, Math.min(1, averageScore));
  }
}
