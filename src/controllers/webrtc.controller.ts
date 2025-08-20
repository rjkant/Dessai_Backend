/**
 * WebRTC Proctoring Controller
 * Handles HTTP API endpoints for WebRTC media streaming and proctoring
 * Epic 4 Task 4.1: WebRTC Media Streaming API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import RedisService from '../services/redis.service';
import { WebRTCMediaService } from '../services/webrtc-media.service';
import { Logger } from '../utils/logger.utils';

const logger = new Logger('WebRTCController');
import { AuthRequest } from '../middleware/auth.middleware';
import { WebRTCError } from '../utils/webrtc-error.utils';
import {
  CreateWebRTCSessionRequest,
  MediaStreamConfig,
  StreamQuality,
  MonitoringLevel,
  WebRTCErrorCode,
  SessionStatus,
  ProctoringServiceOptions
} from '../types/proctoring.types';

export class WebRTCController {
  private webrtcService: WebRTCMediaService;

  constructor(
    private prisma: PrismaClient,
    private redisService: RedisService,
    options: ProctoringServiceOptions
  ) {
    this.webrtcService = new WebRTCMediaService(prisma, redisService, options);
    this.setupEventListeners();
  }

  /**
   * Create a new WebRTC proctoring session
   * POST /api/proctoring/sessions
   */
  async createSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, assessmentId, settings } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Validate request
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Session ID is required'
          }
        });
        return;
      }

      // Validate session exists and user has access
      const assessmentSession = await this.prisma.assessmentSession.findFirst({
        where: {
          sessionToken: sessionId,
          userId: userId
        },
        include: {
          assessment: true
        }
      });

      if (!assessmentSession) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Assessment session not found or access denied'
          }
        });
        return;
      }

      // Check if proctoring is enabled for this assessment
      const assessmentSettings = assessmentSession.assessment?.settings as any;
      if (!assessmentSettings?.proctoring?.enabled) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PROCTORING_DISABLED',
            message: 'Proctoring is not enabled for this assessment'
          }
        });
        return;
      }

      // Build session request
      const sessionRequest: CreateWebRTCSessionRequest = {
        sessionId,
        userId,
        assessmentId: assessmentId || assessmentSession.assessmentId,
        config: this.buildStreamConfig(settings),
        settings: {
          enableVideo: settings?.enableVideo ?? true,
          enableAudio: settings?.enableAudio ?? true,
          enableScreenShare: settings?.enableScreenShare ?? false,
          enableRecording: settings?.enableRecording ?? true,
          enableMonitoring: settings?.enableMonitoring ?? true,
          quality: this.parseStreamQuality(settings?.quality),
          monitoringLevel: this.parseMonitoringLevel(settings?.monitoringLevel)
        }
      };

      // Create WebRTC session
      const webrtcSession = await this.webrtcService.createSession(sessionRequest);

      logger.info('WebRTC session created via API', {
        sessionId: webrtcSession.session.id,
        userId,
        assessmentId: sessionRequest.assessmentId
      });

      res.status(201).json({
        success: true,
        data: {
          session: {
            id: webrtcSession.session.id,
            sessionId: webrtcSession.session.sessionId,
            status: webrtcSession.session.status,
            mediaStreams: webrtcSession.session.mediaStreams,
            createdAt: webrtcSession.session.createdAt
          },
          connection: {
            iceServers: webrtcSession.iceServers,
            signalingServer: webrtcSession.signalingServer,
            token: webrtcSession.token
          },
          offer: webrtcSession.offer
        }
      });

    } catch (error) {
      logger.error('Failed to create WebRTC session via API', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        sessionId: req.body.sessionId
      });

      if (error instanceof WebRTCError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Get WebRTC session details
   * GET /api/proctoring/sessions/:sessionId
   */
  async getSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const session = await this.webrtcService.getSession(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'WebRTC session not found'
          }
        });
        return;
      }

      // Check user access
      if (session.userId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied to this session'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            sessionId: session.sessionId,
            status: session.status,
            mediaStreams: session.mediaStreams,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get WebRTC session via API', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        sessionId: req.params.sessionId
      });

      next(error);
    }
  }

  /**
   * Initialize media streams for a session
   * POST /api/proctoring/sessions/:sessionId/streams
   */
  async initializeStreams(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { streamConfigs } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Validate session access
      const session = await this.webrtcService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'WebRTC session not found or access denied'
          }
        });
        return;
      }

      // Initialize media streams
      const mediaStreams = await this.webrtcService.initializeMediaStreams(
        sessionId,
        streamConfigs || this.getDefaultStreamConfigs(sessionId, userId)
      );

      logger.info('Media streams initialized via API', {
        sessionId,
        userId,
        streamCount: mediaStreams.length
      });

      res.json({
        success: true,
        data: {
          streams: mediaStreams.map(stream => ({
            id: stream.id,
            type: stream.type,
            status: stream.status,
            quality: stream.quality,
            startTime: stream.startTime,
            metadata: stream.metadata
          }))
        }
      });

    } catch (error) {
      logger.error('Failed to initialize streams via API', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        sessionId: req.params.sessionId
      });

      if (error instanceof WebRTCError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Start recording for a stream
   * POST /api/proctoring/sessions/:sessionId/streams/:streamId/recording/start
   */
  async startRecording(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, streamId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Validate session access
      const session = await this.webrtcService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'WebRTC session not found or access denied'
          }
        });
        return;
      }

      await this.webrtcService.startRecording(sessionId, streamId);

      logger.info('Recording started via API', {
        sessionId,
        streamId,
        userId
      });

      res.json({
        success: true,
        message: 'Recording started successfully'
      });

    } catch (error) {
      logger.error('Failed to start recording via API', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        sessionId: req.params.sessionId,
        streamId: req.params.streamId
      });

      if (error instanceof WebRTCError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Stop recording for a stream
   * POST /api/proctoring/sessions/:sessionId/streams/:streamId/recording/stop
   */
  async stopRecording(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, streamId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Validate session access
      const session = await this.webrtcService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'WebRTC session not found or access denied'
          }
        });
        return;
      }

      const recordingPath = await this.webrtcService.stopRecording(sessionId, streamId);

      logger.info('Recording stopped via API', {
        sessionId,
        streamId,
        userId,
        recordingPath
      });

      res.json({
        success: true,
        data: {
          recordingPath
        },
        message: 'Recording stopped successfully'
      });

    } catch (error) {
      logger.error('Failed to stop recording via API', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        sessionId: req.params.sessionId,
        streamId: req.params.streamId
      });

      if (error instanceof WebRTCError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Get session quality metrics
   * GET /api/proctoring/sessions/:sessionId/metrics
   */
  async getSessionMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Validate session access
      const session = await this.webrtcService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'WebRTC session not found or access denied'
          }
        });
        return;
      }

      const metrics = await this.webrtcService.getSessionMetrics(sessionId);

      res.json({
        success: true,
        data: {
          metrics
        }
      });

    } catch (error) {
      logger.error('Failed to get session metrics via API', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        sessionId: req.params.sessionId
      });

      if (error instanceof WebRTCError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * End a WebRTC session
   * POST /api/proctoring/sessions/:sessionId/end
   */
  async endSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Validate session access
      const session = await this.webrtcService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'WebRTC session not found or access denied'
          }
        });
        return;
      }

      await this.webrtcService.endSession(sessionId, reason);

      logger.info('WebRTC session ended via API', {
        sessionId,
        userId,
        reason
      });

      res.json({
        success: true,
        message: 'Session ended successfully'
      });

    } catch (error) {
      logger.error('Failed to end session via API', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        sessionId: req.params.sessionId
      });

      if (error instanceof WebRTCError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Get user's active sessions
   * GET /api/proctoring/users/sessions
   */
  async getUserSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const sessions = await this.webrtcService.getUserSessions(userId);

      res.json({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            id: session.id,
            sessionId: session.sessionId,
            status: session.status,
            mediaStreams: session.mediaStreams,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          }))
        }
      });

    } catch (error) {
      logger.error('Failed to get user sessions via API', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id
      });

      next(error);
    }
  }

  /**
   * Health check endpoint
   * GET /api/proctoring/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check service dependencies
      const redisHealth = await this.checkRedisHealth();
      const dbHealth = await this.checkDatabaseHealth();

      const health = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          webrtc: 'healthy',
          redis: redisHealth ? 'healthy' : 'unhealthy',
          database: dbHealth ? 'healthy' : 'unhealthy'
        },
        version: '1.0.0'
      };

      const overallHealthy = redisHealth && dbHealth;
      
      res.status(overallHealthy ? 200 : 503).json({
        success: overallHealthy,
        data: health
      });

    } catch (error) {
      logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });

      res.status(503).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Service health check failed'
        }
      });
    }
  }

  /**
   * Private helper methods
   */

  private setupEventListeners(): void {
    this.webrtcService.on('webrtc-event', (event) => {
      logger.info('WebRTC event received', {
        type: event.type,
        sessionId: event.sessionId,
        severity: event.severity
      });

      // Handle specific events if needed
      if (event.type === 'SESSION_ENDED') {
        this.handleSessionEnded(event);
      }
    });
  }

  private async handleSessionEnded(event: any): Promise<void> {
    try {
      // Update assessment session status
      await this.prisma.assessmentSession.updateMany({
        where: {
          sessionToken: event.sessionId,
          userId: event.userId
        },
        data: {
          status: SessionStatus.COMPLETED,
          endedAt: new Date()
        }
      });

      logger.info('Assessment session updated after WebRTC session end', {
        sessionId: event.sessionId,
        userId: event.userId
      });

    } catch (error) {
      logger.error('Failed to handle session ended event', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: event.sessionId,
        userId: event.userId
      });
    }
  }

  private buildStreamConfig(settings: any): Partial<MediaStreamConfig> {
    return {
      type: settings?.streamType || 'combined',
      constraints: {
        video: settings?.videoConstraints || {
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 30 },
          facingMode: 'user'
        },
        audio: settings?.audioConstraints || {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      },
      recording: {
        enabled: settings?.enableRecording ?? true,
        format: 'webm',
        codecs: {
          video: 'vp8',
          audio: 'opus'
        },
        bitRate: {
          video: settings?.videoBitRate || 1000,
          audio: settings?.audioBitRate || 128
        }
      }
    } as Partial<MediaStreamConfig>;
  }

  private parseStreamQuality(quality?: string): StreamQuality {
    switch (quality?.toLowerCase()) {
      case 'low': return StreamQuality.LOW;
      case 'medium': return StreamQuality.MEDIUM;
      case 'high': return StreamQuality.HIGH;
      case 'hd': return StreamQuality.HD;
      default: return StreamQuality.MEDIUM;
    }
  }

  private parseMonitoringLevel(level?: string): MonitoringLevel {
    switch (level?.toLowerCase()) {
      case 'none': return MonitoringLevel.NONE;
      case 'basic': return MonitoringLevel.BASIC;
      case 'standard': return MonitoringLevel.STANDARD;
      case 'advanced': return MonitoringLevel.ADVANCED;
      case 'strict': return MonitoringLevel.STRICT;
      default: return MonitoringLevel.STANDARD;
    }
  }

  private getDefaultStreamConfigs(sessionId: string, userId: string): MediaStreamConfig[] {
    return [{
      id: `default_${Date.now()}`,
      sessionId,
      userId,
      type: 'combined' as any,
      constraints: {
        video: {
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      },
      quality: StreamQuality.MEDIUM,
      recording: {
        enabled: true,
        format: 'webm',
        codecs: {
          video: 'vp8',
          audio: 'opus'
        },
        bitRate: {
          video: 1000,
          audio: 128
        },
        storage: {
          provider: 'local',
          path: 'recordings',
          encryption: false,
          compression: true
        },
        retention: {
          duration: 30,
          autoDelete: true
        }
      },
      monitoring: {
        faceDetection: true,
        gazeTracking: false,
        audioAnalysis: false,
        behaviorAnalysis: false,
        integrityChecks: true,
        alertThresholds: {
          multipleFaces: 2,
          noFaceDetected: 10,
          lookAwayDuration: 30,
          audioAnomalies: 5,
          suspiciousActivity: 3
        }
      }
    }];
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      await this.redisService.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up WebRTC Controller');
    await this.webrtcService.cleanup();
    logger.info('WebRTC Controller cleanup completed');
  }
}
