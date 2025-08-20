/**
 * Performance Analytics Dashboard Controller
 * Epic 5 Task 5.2: Advanced Performance Analytics API
 * 
 * Provides REST API endpoints for advanced analytics, predictive insights,
 * and enhanced dashboard capabilities
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import RedisService from '../services/redis.service';
import PerformanceAnalyticsDashboardService from '../services/performance-analytics-dashboard.service';
import { Logger } from '../utils/logger.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export interface DashboardRequest extends AuthRequest {
  query: {
    timeRange?: string;
    organizationId?: string;
    userId?: string;
    configId?: string;
    metric?: string;
    forecastPeriod?: string;
    industry?: string;
  };
}

/**
 * Performance Analytics Dashboard Controller
 * Handles advanced analytics and dashboard API requests
 */
export class PerformanceAnalyticsDashboardController {
  private dashboardService: PerformanceAnalyticsDashboardService;

  constructor(
    private prisma: PrismaClient,
    private redis: RedisService,
    private logger: any
  ) {
    this.dashboardService = PerformanceAnalyticsDashboardService.getInstance(
      prisma,
      redis,
      logger
    );
  }

  /**
   * Get advanced performance metrics for a user
   * GET /api/analytics/advanced/performance/:userId
   */
  public getAdvancedPerformanceMetrics = async (req: DashboardRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { timeRange, organizationId } = req.query;

      // Validate access permissions
      if (req.user?.id !== userId && req.user?.role !== 'OrgAdmin') {
        res.status(403).json({
          success: false,
          error: 'Access denied: Insufficient permissions'
        });
        return;
      }

      // Parse time range if provided
      let parsedTimeRange;
      if (timeRange) {
        try {
          parsedTimeRange = JSON.parse(timeRange);
        } catch (error) {
          res.status(400).json({
            success: false,
            error: 'Invalid time range format'
          });
          return;
        }
      }

      const metrics = await this.dashboardService.getAdvancedPerformanceMetrics(
        userId,
        parsedTimeRange,
        organizationId || req.user?.organizationId
      );

      res.status(200).json({
        success: true,
        data: metrics,
        metadata: {
          userId,
          timeRange: parsedTimeRange,
          organizationId: organizationId || req.user?.organizationId,
          generatedAt: new Date().toISOString()
        }
      });

      this.logger.info('Advanced performance metrics retrieved', {
        userId,
        requestedBy: req.user?.id,
        hasTimeRange: !!parsedTimeRange
      });
    } catch (error) {
      this.logger.error('Failed to get advanced performance metrics', {
        error: (error as Error).message,
        userId: req.params.userId,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve advanced performance metrics',
        details: (error as Error).message
      });
    }
  };

  /**
   * Get enhanced dashboard analytics
   * GET /api/analytics/advanced/dashboard
   */
  public getDashboardAnalytics = async (req: DashboardRequest, res: Response): Promise<void> => {
    try {
      const { organizationId, configId } = req.query;
      const targetOrgId = organizationId || req.user?.organizationId;

      // Validate organization access
      if (req.user?.role !== 'OrgAdmin' && req.user?.organizationId !== targetOrgId) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Organization mismatch'
        });
        return;
      }

      // Get dashboard configuration if specified
      let config;
      if (configId) {
        // In production, fetch from database
        // config = await this.prisma.dashboardConfig.findUnique({ where: { id: configId } });
      }

      const analytics = await this.dashboardService.getDashboardAnalytics(
        targetOrgId,
        config
      );

      res.status(200).json({
        success: true,
        data: analytics,
        metadata: {
          organizationId: targetOrgId,
          configId,
          widgetsCount: analytics.widgets.length,
          insightsCount: analytics.insights.length,
          recommendationsCount: analytics.recommendations.length,
          alertsCount: analytics.alerts.length,
          trendsCount: analytics.trends.length,
          generatedAt: new Date().toISOString()
        }
      });

      this.logger.info('Dashboard analytics retrieved', {
        organizationId: targetOrgId,
        configId,
        requestedBy: req.user?.id,
        componentsCount: {
          widgets: analytics.widgets.length,
          insights: analytics.insights.length,
          recommendations: analytics.recommendations.length,
          alerts: analytics.alerts.length,
          trends: analytics.trends.length
        }
      });
    } catch (error) {
      this.logger.error('Failed to get dashboard analytics', {
        error: (error as Error).message,
        organizationId: req.query.organizationId,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard analytics',
        details: (error as Error).message
      });
    }
  };

  /**
   * Generate predictive forecast
   * POST /api/analytics/advanced/forecast
   */
  public generateForecast = async (req: DashboardRequest, res: Response): Promise<void> => {
    try {
      const { metric, entityId, forecastPeriod } = req.body;

      // Validate required parameters
      if (!metric || !entityId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: metric and entityId'
        });
        return;
      }

      // Validate forecast period
      const period = forecastPeriod ? parseInt(forecastPeriod) : 30;
      if (period < 1 || period > 365) {
        res.status(400).json({
          success: false,
          error: 'Forecast period must be between 1 and 365 days'
        });
        return;
      }

      const forecast = await this.dashboardService.generateForecast(
        metric,
        entityId,
        period
      );

      res.status(200).json({
        success: true,
        data: forecast,
        metadata: {
          metric,
          entityId,
          forecastPeriod: period,
          dataPoints: forecast.length,
          generatedAt: new Date().toISOString(),
          confidence: forecast.length > 0 ? forecast[0].confidence : 0
        }
      });

      this.logger.info('Forecast generated', {
        metric,
        entityId,
        forecastPeriod: period,
        dataPoints: forecast.length,
        requestedBy: req.user?.id
      });
    } catch (error) {
      this.logger.error('Failed to generate forecast', {
        error: (error as Error).message,
        requestBody: req.body,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate forecast',
        details: (error as Error).message
      });
    }
  };

  /**
   * Create custom dashboard configuration
   * POST /api/analytics/advanced/dashboard/config
   */
  public createDashboardConfig = async (req: DashboardRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID required'
        });
        return;
      }

      // Validate required fields
      const { name, widgets } = req.body;
      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Dashboard name is required'
        });
        return;
      }

      const config = await this.dashboardService.createDashboardConfig(
        req.body,
        organizationId
      );

      res.status(201).json({
        success: true,
        data: config,
        message: 'Dashboard configuration created successfully'
      });

      this.logger.info('Dashboard configuration created', {
        configId: config.dashboardId,
        organizationId,
        name: config.name,
        widgetsCount: config.widgets?.length || 0,
        createdBy: req.user?.id
      });
    } catch (error) {
      this.logger.error('Failed to create dashboard configuration', {
        error: (error as Error).message,
        requestBody: req.body,
        organizationId: req.user?.organizationId,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create dashboard configuration',
        details: (error as Error).message
      });
    }
  };

  /**
   * Get industry benchmarks
   * GET /api/analytics/advanced/benchmarks
   */
  public getIndustryBenchmarks = async (req: DashboardRequest, res: Response): Promise<void> => {
    try {
      const { industry } = req.query;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID required'
        });
        return;
      }

      const benchmarks = await this.dashboardService.getIndustryBenchmarks(
        organizationId,
        industry
      );

      res.status(200).json({
        success: true,
        data: benchmarks,
        metadata: {
          organizationId,
          industry: industry || 'default',
          generatedAt: new Date().toISOString()
        }
      });

      this.logger.info('Industry benchmarks retrieved', {
        organizationId,
        industry: industry || 'default',
        requestedBy: req.user?.id
      });
    } catch (error) {
      this.logger.error('Failed to get industry benchmarks', {
        error: (error as Error).message,
        organizationId: req.user?.organizationId,
        industry: req.query.industry,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve industry benchmarks',
        details: (error as Error).message
      });
    }
  };

  /**
   * Get predictive insights for organization
   * GET /api/analytics/advanced/insights
   */
  public getPredictiveInsights = async (req: DashboardRequest, res: Response): Promise<void> => {
    try {
      const { organizationId, timeRange, userId } = req.query;
      const targetOrgId = organizationId || req.user?.organizationId;

      // Validate organization access
      if (req.user?.role !== 'OrgAdmin' && req.user?.organizationId !== targetOrgId) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Organization mismatch'
        });
        return;
      }

      // Parse time range if provided
      let parsedTimeRange;
      if (timeRange) {
        try {
          parsedTimeRange = JSON.parse(timeRange);
        } catch (error) {
          res.status(400).json({
            success: false,
            error: 'Invalid time range format'
          });
          return;
        }
      }

      // Get dashboard analytics for insights
      const analytics = await this.dashboardService.getDashboardAnalytics(targetOrgId);

      // Filter insights based on user if specified
      let insights = analytics.insights;
      if (userId) {
        // In production, filter insights by user
        insights = insights.filter(insight => 
          !insight.dataPoints.length || insight.dataPoints.some((dp: any) => dp.userId === userId)
        );
      }

      res.status(200).json({
        success: true,
        data: {
          insights,
          recommendations: analytics.recommendations,
          alerts: analytics.alerts,
          trends: analytics.trends
        },
        metadata: {
          organizationId: targetOrgId,
          userId,
          timeRange: parsedTimeRange,
          totalInsights: insights.length,
          totalRecommendations: analytics.recommendations.length,
          totalAlerts: analytics.alerts.length,
          totalTrends: analytics.trends.length,
          generatedAt: new Date().toISOString()
        }
      });

      this.logger.info('Predictive insights retrieved', {
        organizationId: targetOrgId,
        userId,
        insightsCount: insights.length,
        requestedBy: req.user?.id
      });
    } catch (error) {
      this.logger.error('Failed to get predictive insights', {
        error: (error as Error).message,
        organizationId: req.query.organizationId,
        userId: req.query.userId,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve predictive insights',
        details: (error as Error).message
      });
    }
  };

  /**
   * Get real-time analytics stream
   * GET /api/analytics/advanced/stream
   */
  public getAnalyticsStream = async (req: DashboardRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID required'
        });
        return;
      }

      // Set up Server-Sent Events headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial connection message
      res.write(`data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        organizationId,
        message: 'Advanced analytics stream connected'
      })}\n\n`);

      // Set up periodic advanced analytics updates
      const interval = setInterval(async () => {
        try {
          const analytics = await this.dashboardService.getDashboardAnalytics(organizationId);
          
          res.write(`data: ${JSON.stringify({
            type: 'advanced_analytics_update',
            data: {
              widgets: analytics.widgets,
              insights: analytics.insights.slice(0, 5), // Send top 5 insights
              alerts: analytics.alerts.filter(alert => !alert.resolved), // Only unresolved alerts
              trends: analytics.trends.slice(0, 3) // Top 3 trends
            },
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (error) {
          this.logger.error('Failed to send advanced analytics stream data', {
            error: (error as Error).message,
            organizationId,
            userId: req.user?.id
          });
          
          res.write(`data: ${JSON.stringify({
            type: 'error',
            message: 'Failed to retrieve analytics data',
            timestamp: new Date().toISOString()
          })}\n\n`);
        }
      }, 10000); // Send updates every 10 seconds for advanced analytics

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
        this.logger.info('Advanced analytics stream disconnected', {
          userId: req.user?.id,
          organizationId
        });
      });

      this.logger.info('Advanced analytics stream connected', {
        userId: req.user?.id,
        organizationId
      });
    } catch (error) {
      this.logger.error('Failed to establish advanced analytics stream', {
        error: (error as Error).message,
        userId: req.user?.id,
        organizationId: req.user?.organizationId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to establish analytics stream',
        details: (error as Error).message
      });
    }
  };

  /**
   * Get performance comparison between users/groups
   * POST /api/analytics/advanced/compare
   */
  public getPerformanceComparison = async (req: DashboardRequest, res: Response): Promise<void> => {
    try {
      const { userIds, groupIds, metrics, timeRange } = req.body;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID required'
        });
        return;
      }

      // Validate input
      if ((!userIds || !Array.isArray(userIds)) && (!groupIds || !Array.isArray(groupIds))) {
        res.status(400).json({
          success: false,
          error: 'Either userIds or groupIds array is required'
        });
        return;
      }

      // Parse time range if provided
      let parsedTimeRange;
      if (timeRange) {
        try {
          parsedTimeRange = typeof timeRange === 'string' ? JSON.parse(timeRange) : timeRange;
        } catch (error) {
          res.status(400).json({
            success: false,
            error: 'Invalid time range format'
          });
          return;
        }
      }

      // Get comparison data
      const comparisons = [];
      
      // Compare users
      if (userIds && userIds.length > 0) {
        for (const userId of userIds) {
          try {
            const userMetrics = await this.dashboardService.getAdvancedPerformanceMetrics(
              userId,
              parsedTimeRange,
              organizationId
            );
            comparisons.push({
              type: 'user',
              id: userId,
              metrics: userMetrics
            });
          } catch (error) {
            this.logger.warn('Failed to get metrics for user', {
              userId,
              error: (error as Error).message
            });
          }
        }
      }

      // TODO: Implement group comparison logic
      if (groupIds && groupIds.length > 0) {
        // Group comparison would be implemented here
        this.logger.info('Group comparison requested but not implemented yet', {
          groupIds
        });
      }

      res.status(200).json({
        success: true,
        data: {
          comparisons,
          summary: {
            totalEntities: comparisons.length,
            averageScore: comparisons.length > 0 
              ? comparisons.reduce((sum, comp) => {
                  const firstMetric = comp.metrics.metrics?.[0];
                  return sum + (firstMetric?.value || 0);
                }, 0) / comparisons.length 
              : 0,
            topPerformer: comparisons.length > 0 
              ? comparisons.reduce((top, current) => {
                  const currentScore = current.metrics.metrics?.[0]?.value || 0;
                  const topScore = top.metrics.metrics?.[0]?.value || 0;
                  return currentScore > topScore ? current : top;
                }).id 
              : null
          }
        },
        metadata: {
          organizationId,
          timeRange: parsedTimeRange,
          metricsRequested: metrics || 'all',
          comparisonCount: comparisons.length,
          generatedAt: new Date().toISOString()
        }
      });

      this.logger.info('Performance comparison generated', {
        organizationId,
        userIds: userIds?.length || 0,
        groupIds: groupIds?.length || 0,
        comparisonsGenerated: comparisons.length,
        requestedBy: req.user?.id
      });
    } catch (error) {
      this.logger.error('Failed to generate performance comparison', {
        error: (error as Error).message,
        requestBody: req.body,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate performance comparison',
        details: (error as Error).message
      });
    }
  };
}

export default PerformanceAnalyticsDashboardController;
