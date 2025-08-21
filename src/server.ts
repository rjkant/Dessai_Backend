import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { config } from '@/config';
import { database } from '@/services/database.service';
import { redis } from '@/services/redis.service';
import { CollaborationWebSocketServer } from '@/services/collaboration-websocket.service';
import { AIAnalysisEngine } from '@/services/ai-analysis.service';
import healthRoutes from '@/routes/health.routes';
import { userRoutes } from '@/routes/user.routes';
import { executionRoutes } from '@/routes/execution.routes';
import { sessionRoutes } from '@/routes/session.routes';
import collaborationRoutes from '@/routes/collaboration.routes';
import createIntegrityMonitoringRoutes from '@/routes/integrity-monitoring.routes';
// Analytics routes will be dynamically imported
import { createPerformanceAnalyticsRoutes } from '@/routes/performance-analytics.routes';
import { PerformanceAnalyticsService } from '@/services/performance-analytics.service';
import { PerformanceAnalyticsController } from '@/controllers/performance-analytics.controller';
import { DataCollectionService } from '@/services/data-collection.service';
import { Logger } from '@/utils/logger.utils';
import { metricsMiddleware } from '@/utils/metrics.util';
import { createRequestLogger } from '@/utils/logger.util';
import metricsRoutes from '@/routes/metrics.routes';

/**
 * Dessai Backend Server
 * AI-native technical hiring platform
 */
class DessaiServer {
  private app: express.Application;
  private server?: import('http').Server;
  private wsServer?: CollaborationWebSocketServer;
  private aiAnalysisEngine?: AIAnalysisEngine;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes().catch(console.error);
    this.setupErrorHandling();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // Metrics middleware for HTTP requests
    this.app.use(metricsMiddleware);

    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(
      cors({
        origin: config.security.corsOrigin,
        credentials: true,
      })
    );

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Request logging middleware
    this.app.use((req, _res, next) => {
      const requestLogger = createRequestLogger(req);
      requestLogger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      next();
    });

    // Morgan logging in development
    if (config.server.isDevelopment) {
      this.app.use(morgan('dev'));
    }

    // Trust proxy if configured
    if (config.security.trustProxy) {
      this.app.set('trust proxy', 1);
    }
  }

  /**
   * Setup application routes
   */
  private async setupRoutes(): Promise<void> {
    // Test route for debugging
    this.app.get('/test', (_req, res) => {
      res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
    });

    // Metrics and monitoring routes
    this.app.use('/', metricsRoutes);

    // Health check routes
    this.app.use('/health', healthRoutes);

    // User management routes
    this.app.use('/api/users', userRoutes);

    // Code execution routes
    this.app.use('/api/execution', executionRoutes);

    // Session management routes
    this.app.use('/api/sessions', sessionRoutes);

    // Collaboration routes
    this.app.use('/api/collaboration', collaborationRoutes);

    // Integrity monitoring routes - temporarily disabled due to AI engine issues
    // TODO: Fix AI Analysis Engine initialization issues
    console.log(
      '⚠️ Integrity monitoring routes temporarily disabled - AI engine initialization issues'
    );

    // Analytics routes - Epic 5: Analytics Engine Service (Simplified)
    try {
      const { default: createSimplifiedAnalyticsRoutes } = await import(
        './routes/analytics.routes.simplified'
      );
      const analyticsRoutes = createSimplifiedAnalyticsRoutes(database.getClient(), redis);
      this.app.use('/api/analytics', analyticsRoutes);
      console.log('✅ Simplified Analytics routes initialized successfully');

      // Advanced Performance Analytics Dashboard - Epic 5 Task 5.2
      const { createPerformanceAnalyticsDashboardRoutes } = await import(
        './routes/performance-analytics-dashboard.routes'
      );
      const dashboardRoutes = createPerformanceAnalyticsDashboardRoutes();
      this.app.use('/api/analytics/advanced', dashboardRoutes);
      console.log('✅ Advanced Performance Analytics Dashboard routes initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize analytics routes:', error);
    }

    // Performance Analytics routes
    try {
      const logger = new Logger('PerformanceAnalytics');
      const dataCollectionService = new DataCollectionService(database.getClient(), redis);
      const performanceAnalyticsConfig = {
        metricCalculationInterval: 60, // minutes
        batchProcessingSize: 100,
        enableRealTimeCalculation: true,
        benchmarkUpdateInterval: 24, // hours
        minimumSampleSizeForBenchmark: 10,
        industryBenchmarkSources: [],
        enablePredictionModels: false, // Disabled for now
        modelRetrainingInterval: 7, // days
        minimumDataPointsForPrediction: 20,
        enableMetricCaching: true,
        cacheExpirationTime: 30, // minutes
        rawDataRetentionDays: 90,
        aggregatedDataRetentionDays: 365,
        anomalyDetectionThreshold: 2.5, // z-score
        significanceTestThreshold: 0.05, // p-value
        minimumTrendDataPoints: 5,
        maxConcurrentCalculations: 5,
        calculationTimeoutSeconds: 30,
      };
      const performanceAnalyticsService = new PerformanceAnalyticsService(
        database.getClient(),
        redis,
        dataCollectionService,
        performanceAnalyticsConfig,
        logger
      );
      const performanceAnalyticsController = new PerformanceAnalyticsController(
        performanceAnalyticsService,
        logger
      );
      const performanceAnalyticsRoutes = createPerformanceAnalyticsRoutes(
        performanceAnalyticsController
      );
      this.app.use('/api/analytics/performance', performanceAnalyticsRoutes);
      console.log('✅ Performance Analytics routes initialized successfully');

      // Epic 5 Task 5.3: Bias Detection System Integration
      // Initialize Bias Detection Service with all dependencies
      const { BiasDetectionService } = await import('./services/bias-detection.service');
      const biasDetectionService = new BiasDetectionService(
        database.getClient(),
        redis,
        dataCollectionService,
        performanceAnalyticsService,
        logger
      );

      // Initialize Bias Detection Controller
      const { BiasDetectionController } = await import('./controllers/bias-detection.controller');
      const biasDetectionController = new BiasDetectionController(biasDetectionService, logger);

      // Create and mount bias detection routes
      const { createBiasDetectionRoutes } = await import('./routes/bias-detection.routes');
      const biasDetectionRoutes = createBiasDetectionRoutes(biasDetectionController, logger as any);
      this.app.use('/api/bias-detection', biasDetectionRoutes);
      console.log('✅ Bias Detection System initialized successfully');

      // Epic 6: Notification Service Integration
      const { NotificationService } = await import('./services/notification.service');
      const { NotificationController } = await import('./controllers/notification.controller');
      const { createNotificationRoutes } = await import('./routes/notification.routes');

      // Notification service configuration
      const notificationConfig = {
        providers: {
          email: {
            primary: 'sendgrid',
            sendgrid: {
              apiKey: process.env.SENDGRID_API_KEY || 'mock_key',
              fromEmail: process.env.FROM_EMAIL || 'noreply@dessai.com',
              fromName: process.env.FROM_NAME || 'Dessai Platform',
            },
          },
          sms: {
            primary: 'twilio',
            twilio: {
              accountSid: process.env.TWILIO_ACCOUNT_SID || 'mock_sid',
              authToken: process.env.TWILIO_AUTH_TOKEN || 'mock_token',
              fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890',
            },
          },
          push: {
            webPush: {
              vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'mock_public_key',
              vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || 'mock_private_key',
              subject: 'mailto:support@dessai.com',
            },
          },
        },
        queues: {
          immediate: {
            maxRetries: 3,
            retryDelay: 1000,
          },
          batch: {
            batchSize: 100,
            processingInterval: 60000,
            maxRetries: 5,
          },
        },
        rateLimits: {
          global: {
            maxPerMinute: 1000,
            maxPerHour: 10000,
          },
          perChannel: {
            EMAIL: { maxPerMinute: 100, maxPerHour: 1000 },
            SMS: { maxPerMinute: 50, maxPerHour: 500 },
            PUSH: { maxPerMinute: 200, maxPerHour: 2000 },
            WEBHOOK: { maxPerMinute: 100, maxPerHour: 1000 },
            IN_APP: { maxPerMinute: 500, maxPerHour: 5000 },
            SLACK: { maxPerMinute: 50, maxPerHour: 500 },
            TEAMS: { maxPerMinute: 50, maxPerHour: 500 },
            DISCORD: { maxPerMinute: 50, maxPerHour: 500 },
          },
        },
        costs: {
          EMAIL: { baseCost: 0, perRecipientCost: 0.001, currency: 'USD' },
          SMS: { baseCost: 0, perRecipientCost: 0.05, currency: 'USD' },
          PUSH: { baseCost: 0, perRecipientCost: 0, currency: 'USD' },
          WEBHOOK: { baseCost: 0, perRecipientCost: 0, currency: 'USD' },
          IN_APP: { baseCost: 0, perRecipientCost: 0, currency: 'USD' },
          SLACK: { baseCost: 0, perRecipientCost: 0, currency: 'USD' },
          TEAMS: { baseCost: 0, perRecipientCost: 0, currency: 'USD' },
          DISCORD: { baseCost: 0, perRecipientCost: 0, currency: 'USD' },
        },
        compliance: {
          unsubscribeUrl: process.env.UNSUBSCRIBE_URL || 'https://dessai.com/unsubscribe',
          privacyPolicyUrl: process.env.PRIVACY_POLICY_URL || 'https://dessai.com/privacy',
          termsOfServiceUrl: process.env.TERMS_URL || 'https://dessai.com/terms',
          dataRetentionDays: 365,
          gdprCompliant: true,
          canSpamCompliant: true,
        },
        analytics: {
          enableTracking: true,
          enableOpenTracking: true,
          enableClickTracking: true,
          retentionDays: 90,
        },
      };

      const notificationService = new NotificationService(
        database.getClient(),
        redis,
        notificationConfig,
        logger
      );

      // Initialize orchestrator and analytics services
      const { NotificationOrchestratorService } = await import(
        '@/services/notification-orchestrator.service'
      );
      const { NotificationAnalyticsService } = await import(
        '@/services/notification-analytics.service'
      );

      const orchestratorService = new NotificationOrchestratorService(
        database.getClient(),
        redis,
        logger
      );

      const analyticsService = new NotificationAnalyticsService(
        database.getClient(),
        redis,
        logger
      );

      const notificationController = new NotificationController(
        notificationService,
        orchestratorService,
        analyticsService,
        logger
      );

      const notificationRoutes = createNotificationRoutes(notificationController, logger as any);
      this.app.use('/api/notifications', notificationRoutes);
      console.log('✅ Notification Service initialized successfully');
    } catch (error) {
      console.warn(
        '⚠️ Failed to initialize performance analytics, bias detection, and notification services - some features may not be available'
      );
    }

    // API routes placeholder
    this.app.use('/api', (req, res) => {
      res.status(200).json({
        message: 'Dessai Backend API',
        version: '1.0.0',
        documentation: config.development.enableApiDocs
          ? `${req.protocol}://${req.get('host')}/api/docs`
          : undefined,
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(
      (err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('Global error handler:', err);

        const statusCode = (err as any).statusCode || 500;
        const message = config.server.isProduction ? 'Internal server error' : err.message;

        res.status(statusCode).json({
          error: message,
          ...(config.server.isDevelopment && { stack: err.stack }),
        });

        next();
      }
    );
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Try to initialize database connection
      console.log('🔌 Connecting to database...');
      try {
        await database.connect();
      } catch (error) {
        console.warn(
          '⚠️ Database connection failed - running in development mode without database'
        );
        console.warn('💡 To enable database features, set up PostgreSQL and update DATABASE_URL');
      }

      // Try to initialize Redis connection
      console.log('🔌 Connecting to Redis...');
      try {
        await redis.connect();
      } catch (error) {
        console.warn('⚠️ Redis connection failed - caching will be disabled');
        console.warn('💡 To enable caching, set up Redis and update REDIS_URL');
      }

      console.log(`🔧 Attempting to start server on port ${config.server.port}...`);

      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize WebSocket server
      this.wsServer = new CollaborationWebSocketServer(this.server);

      this.server.listen(config.server.port, '0.0.0.0', () => {
        console.log(`🚀 Dessai Backend Server started successfully!`);
        console.log(`📡 Server running at http://localhost:${config.server.port}`);
        console.log(`🌍 Environment: ${config.server.env}`);
        console.log(`💾 Database: ${config.database.url.split('@')[1] || 'configured'}`);
        console.log(`🔄 Redis: ${config.redis.url}`);

        if (config.development.enableApiDocs) {
          console.log(`📚 API Documentation: http://localhost:${config.server.port}/api/docs`);
        }

        console.log('🎯 Health endpoints:');
        console.log(`   - Overall health: http://localhost:${config.server.port}/health`);
        console.log(`   - Database health: http://localhost:${config.server.port}/health/database`);
        console.log(`   - Redis health: http://localhost:${config.server.port}/health/redis`);
        console.log(`   - Readiness probe: http://localhost:${config.server.port}/health/ready`);
        console.log(`   - Liveness probe: http://localhost:${config.server.port}/health/live`);

        // Verify server is actually listening
        console.log('🔍 Verifying server is listening...');
        const address = this.server!.address();
        console.log('📍 Server address info:', address);
        console.log('🔌 WebSocket server initialized for collaboration');
      });

      this.server.on('error', (error: any) => {
        console.error('❌ Server failed to start:', error);
        throw error;
      });

      this.server.on('listening', () => {
        console.log('🎯 Server is now listening for connections!');
      });

      // Add process exit handlers to see if something is killing the process
      process.on('exit', code => {
        console.log(`🚪 Process exiting with code: ${code}`);
      });

      process.on('uncaughtException', err => {
        console.error('💥 Uncaught Exception:', err);
        process.exit(1);
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
      });

      // Graceful shutdown handlers
      const shutdown = async (signal: string) => {
        console.log(`${signal} received, shutting down gracefully...`);

        this.server!.close(async () => {
          console.log('📴 HTTP server closed');

          // Close WebSocket server
          if (this.wsServer) {
            this.wsServer.shutdown();
            console.log('🔌 WebSocket server closed');
          }

          try {
            // Close database connection
            await database.disconnect();
            console.log('💾 Database connection closed');

            // Close Redis connection
            await redis.disconnect();
            console.log('🔄 Redis connection closed');

            console.log('✅ Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
          console.error('⚠️ Forcing shutdown after timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (error) {
      console.error('❌ Failed to start server:', error);

      // Cleanup on startup failure
      try {
        await database.disconnect();
        await redis.disconnect();
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
      }

      process.exit(1);
    }
  }

  /**
   * Get Express application instance
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Build the Express application without starting it (for testing)
   */
  public static build(): express.Application {
    const server = new DessaiServer();
    return server.getApp();
  }
}

// Export the build function for testing
export const build = DessaiServer.build;

// Start server if this file is executed directly
if (require.main === module) {
  const server = new DessaiServer();
  server.start().catch(console.error);
}

export default DessaiServer;
