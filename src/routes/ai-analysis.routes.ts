/**
 * AI Analysis Routes
 * Express routing configuration for AI-powered proctoring analysis endpoints
 * Epic 4 Task 4.2: AI Analysis Engine API Routes Implementation
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { AIAnalysisController } from '../controllers/ai-analysis.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import RedisService from '../services/redis.service';
import { Logger } from '../utils/logger.util';
import {
  AIAnalysisServiceOptions,
  AIModelType,
  ProcessingPriority,
  LogLevel,
} from '../types/ai-analysis.types';

const logger = Logger.getInstance();
const router = express.Router();

// Rate limiting configurations
const frameAnalysisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute for real-time frame analysis
  message: {
    success: false,
    message: 'Frame analysis rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => `${req.ip}:${(req as any).user?.id || 'anonymous'}`,
});

const batchAnalysisLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 batch requests per 5 minutes
  message: {
    success: false,
    message: 'Batch analysis rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => `${req.ip}:${(req as any).user?.id || 'anonymous'}`,
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 report requests per 15 minutes
  message: {
    success: false,
    message: 'Report generation rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => `${req.ip}:${(req as any).user?.id || 'anonymous'}`,
});

// Validation schemas
const frameAnalysisSchema = {
  body: {
    type: 'object',
    required: ['sessionId', 'frameData'],
    properties: {
      sessionId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      assessmentId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      frameData: {
        type: 'object',
        required: ['buffer'],
        properties: {
          buffer: { type: 'string' }, // Base64 encoded
          timestamp: { type: 'number' },
          frameNumber: { type: 'number', minimum: 1 },
          width: { type: 'number', minimum: 1, maximum: 4096 },
          height: { type: 'number', minimum: 1, maximum: 4096 },
          format: { type: 'string', enum: ['jpeg', 'png', 'webp'] },
        },
      },
      audioData: {
        type: 'object',
        properties: {
          buffer: { type: 'string' }, // Base64 encoded
          timestamp: { type: 'number' },
          duration: { type: 'number', minimum: 1 },
          sampleRate: { type: 'number', minimum: 8000, maximum: 192000 },
          channels: { type: 'number', minimum: 1, maximum: 8 },
          format: { type: 'string', enum: ['pcm', 'wav', 'mp3'] },
        },
      },
      priority: {
        type: 'string',
        enum: Object.values(ProcessingPriority),
      },
      config: {
        type: 'object',
        properties: {
          models: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: Object.values(AIModelType) },
                enabled: { type: 'boolean' },
              },
            },
          },
          processing: {
            type: 'object',
            properties: {
              realTime: { type: 'boolean' },
              confidenceThreshold: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
        },
      },
    },
  },
};

const batchAnalysisSchema = {
  body: {
    type: 'object',
    required: ['sessionId', 'batchData'],
    properties: {
      sessionId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      assessmentId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      batchData: {
        type: 'array',
        minItems: 1,
        maxItems: 100, // Limit batch size
        items: {
          type: 'object',
          properties: {
            frameData: frameAnalysisSchema.body.properties.frameData,
            audioData: frameAnalysisSchema.body.properties.audioData,
          },
        },
      },
      priority: {
        type: 'string',
        enum: Object.values(ProcessingPriority),
      },
      config: frameAnalysisSchema.body.properties.config,
    },
  },
};

const reportGenerationSchema = {
  body: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['json', 'pdf', 'html'],
        default: 'json',
      },
      includeEvidence: {
        type: 'boolean',
        default: false,
      },
    },
  },
};

// Initialize AI Analysis Controller
export function createAIAnalysisRoutes(
  prisma: PrismaClient,
  redisService: RedisService,
  options: AIAnalysisServiceOptions
): express.Router {
  const aiAnalysisController = new AIAnalysisController(prisma, redisService, options);

  logger.info('Initializing AI Analysis routes', {
    modelsEnabled: options.models.filter(m => m.enabled).length,
    totalModels: options.models.length,
  });

  // Middleware applied to all AI analysis routes
  const authMiddleware = AuthMiddleware.authenticate;

  // Add request logging middleware
  router.use((req, _res, next) => {
    logger.info('AI Analysis API request', {
      method: req.method,
      requestPath: req.path,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  /**
   * Real-time frame analysis endpoint
   * POST /api/ai-analysis/frame
   *
   * Processes a single video frame and optional audio segment for real-time analysis
   * Returns immediate AI analysis results including face detection, gaze tracking,
   * audio analysis, and behavioral assessment
   */
  router.post(
    '/frame',
    frameAnalysisLimiter,
    authMiddleware as any,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await aiAnalysisController.processFrame(req as any, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Batch analysis endpoint
   * POST /api/ai-analysis/batch
   *
   * Processes multiple frames/audio segments in a single request
   * Optimized for non-real-time analysis with better throughput
   */
  router.post(
    '/batch',
    batchAnalysisLimiter,
    authMiddleware as any,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await aiAnalysisController.processBatch(req as any, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Get analysis history for a session
   * GET /api/ai-analysis/sessions/:sessionId/history
   *
   * Retrieves paginated analysis history with optional filtering
   * Query parameters: page, limit, type, severity
   */
  router.get(
    '/sessions/:sessionId/history',
    authMiddleware as any,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await aiAnalysisController.getAnalysisHistory(req as any, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Get session risk assessment
   * GET /api/ai-analysis/sessions/:sessionId/risk-assessment
   *
   * Calculates comprehensive risk assessment based on all analysis data
   * Returns overall risk score, trend analysis, and recommendations
   */
  router.get(
    '/sessions/:sessionId/risk-assessment',
    authMiddleware as any,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await aiAnalysisController.getSessionRiskAssessment(req as any, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Generate comprehensive analysis report
   * POST /api/ai-analysis/sessions/:sessionId/report
   *
   * Generates detailed analysis report in specified format
   * Supports JSON, PDF, and HTML formats with optional evidence inclusion
   */
  router.post(
    '/sessions/:sessionId/report',
    reportLimiter,
    authMiddleware as any,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await aiAnalysisController.generateAnalysisReport(req as any, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Get AI engine status and performance metrics
   * GET /api/ai-analysis/status
   *
   * Returns real-time status of AI engine including:
   * - Model loading status
   * - Processing queue statistics
   * - Performance metrics
   * - Resource utilization
   */
  router.get(
    '/status',
    authMiddleware as any,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await aiAnalysisController.getEngineStatus(req as any, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Get available AI models and their configuration
   * GET /api/ai-analysis/models
   *
   * Returns list of available AI models with their capabilities,
   * status, and performance characteristics
   */
  router.get(
    '/models',
    authMiddleware as any,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await aiAnalysisController.getAvailableModels(req as any, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // Error handling middleware for AI analysis routes
  router.use(
    (error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('AI Analysis route error', error as Error);

      // Handle specific error types
      if (error.name === 'ValidationError') {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.details,
        });
        return;
      }

      if (error.name === 'UnauthorizedError') {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      if (error.name === 'ForbiddenError') {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'FORBIDDEN',
        });
        return;
      }

      if (error.name === 'AIProcessingError') {
        res.status(503).json({
          success: false,
          message: 'AI processing temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE',
          retryAfter: 30,
        });
        return;
      }

      // Generic error response
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  );

  // Health check endpoint specific to AI analysis
  router.get('/health', async (_req, res) => {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          ai_engine: 'operational',
          models: 'loaded',
          redis: 'connected',
          database: 'connected',
        },
        metrics: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          activeConnections: 0, // This would be tracked by the controller
        },
      };

      res.status(200).json({
        success: true,
        data: healthStatus,
      });
    } catch (error) {
      logger.error('Health check failed', error as Error);

      res.status(503).json({
        success: false,
        message: 'Service unhealthy',
        code: 'HEALTH_CHECK_FAILED',
      });
    }
  });

  logger.info('AI Analysis routes initialized successfully');

  return router;
}

// Export route factory function
export default createAIAnalysisRoutes;

// Default AI Analysis Service Options for development
export const defaultAIAnalysisOptions: AIAnalysisServiceOptions = {
  models: [
    {
      id: 'face-detection-v1',
      name: 'Face Detection Model',
      type: AIModelType.FACE_DETECTION,
      version: '1.0.0',
      modelPath: './models/face-detection',
      enabled: true,
      confidence: {
        minimum: 0.5,
        target: 0.7,
      },
      performance: {
        maxLatency: 100,
        targetFps: 30,
      },
    },
    {
      id: 'gaze-tracking-v1',
      name: 'Gaze Tracking Model',
      type: AIModelType.GAZE_TRACKING,
      version: '1.0.0',
      modelPath: './models/gaze-tracking',
      enabled: true,
      confidence: {
        minimum: 0.4,
        target: 0.6,
      },
      performance: {
        maxLatency: 150,
        targetFps: 20,
      },
    },
    {
      id: 'audio-analysis-v1',
      name: 'Audio Analysis Model',
      type: AIModelType.AUDIO_ANALYSIS,
      version: '1.0.0',
      modelPath: './models/audio-analysis',
      enabled: true,
      confidence: {
        minimum: 0.6,
        target: 0.75,
      },
      performance: {
        maxLatency: 200,
        targetFps: 10,
      },
    },
    {
      id: 'behavior-analysis-v1',
      name: 'Behavior Analysis Model',
      type: AIModelType.BEHAVIOR_ANALYSIS,
      version: '1.0.0',
      modelPath: './models/behavior-analysis',
      enabled: true,
      confidence: {
        minimum: 0.5,
        target: 0.65,
      },
      performance: {
        maxLatency: 300,
        targetFps: 5,
      },
    },
  ],
  processing: {
    defaultPriority: ProcessingPriority.NORMAL,
    maxConcurrentRequests: 10,
    queueSettings: {
      maxSize: 1000,
      timeoutMs: 30000,
      priorityLevels: 3,
    },
    retryPolicy: {
      maxAttempts: 2,
      backoffMs: 1000,
      backoffMultiplier: 2,
    },
  },
  storage: {
    results: {
      enabled: true,
      retentionDays: 30,
      compressionEnabled: true,
    },
    evidence: {
      enabled: false,
      formats: ['json'],
      maxSizeMB: 100,
    },
    models: {
      cachePath: './models/cache',
      autoUpdate: false,
      updateIntervalHours: 24,
    },
  },
  monitoring: {
    performance: {
      enabled: true,
      metricsInterval: 60000,
      alertThresholds: {
        maxLatencyMs: 2000,
        minAccuracy: 0.8,
        maxErrorRate: 0.05,
        maxMemoryUsageMB: 512,
      },
    },
    accuracy: {
      enabled: true,
      samplingRate: 0.1,
    },
    logging: {
      level: LogLevel.INFO,
      includeRequestData: false,
      includeResponseData: false,
    },
  },
  security: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyRotationDays: 1,
    },
    access: {
      authentication: true,
      authorization: {
        roles: ['user', 'admin'],
        permissions: {
          'ai-analysis': ['read', 'write'],
          reports: ['read'],
        },
        sessionBased: true,
      },
      auditLogging: true,
    },
    privacy: {
      dataMinimization: true,
      anonymization: true,
      retentionPolicy: {
        personalData: 30,
        analysisResults: 90,
        evidence: 7,
        logs: 365,
      },
    },
  },
};

// Type export for external usage
export type { AIAnalysisServiceOptions };
