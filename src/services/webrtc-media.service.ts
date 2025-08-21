/**
 * WebRTC Media Streaming Service
 * Handles video/audio capture, screen sharing, and media stream management
 * Epic 4 Task 4.1: WebRTC Media Streaming Implementation
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import RedisService from './redis.service';
import { Logger } from '../utils/logger.utils';

const logger = new Logger('WebRTCMediaService');
import {
  WebRTCError,
  WebRTCSessionError,
  WebRTCMediaError,
  WebRTCRecordingError,
} from '../utils/webrtc-error.utils';
import {
  WebRTCSession,
  MediaStreamConfig,
  CreateWebRTCSessionRequest,
  CreateWebRTCSessionResponse,
  WebRTCEvent,
  WebRTCEventType,
  EventSeverity,
  SessionStatus,
  MediaStreamInfo,
  StreamStatus,
  MediaStreamType,
  StreamQuality,
  WebRTCErrorCode,
  StreamQualityMetrics,
  QualityMetrics,
  ProctoringServiceOptions,
} from '../types/proctoring.types';

interface WebRTCPeerConnection {
  id: string;
  sessionId: string;
  userId: string;
  connection: any; // RTCPeerConnection would be used in browser
  dataChannel?: any;
  streams: Map<string, MediaStreamInfo>;
  status: SessionStatus;
  createdAt: Date;
  lastActivity: Date;
}

export class WebRTCMediaService extends EventEmitter {
  private sessions = new Map<string, WebRTCSession>();
  private connections = new Map<string, WebRTCPeerConnection>();
  private streamRecorders = new Map<string, any>(); // MediaRecorder instances
  private qualityMonitor: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaClient,
    private redisService: RedisService,
    private options: ProctoringServiceOptions
  ) {
    super();
    this.setupCleanupInterval();
    this.setupQualityMonitoring();
  }

  /**
   * Create a new WebRTC session for proctoring
   */
  async createSession(request: CreateWebRTCSessionRequest): Promise<CreateWebRTCSessionResponse> {
    try {
      logger.info('Creating WebRTC session', {
        sessionId: request.sessionId,
        userId: request.userId,
      });

      // Validate prerequisites
      await this.validateSessionRequest(request);

      // Create session configuration
      const sessionConfig = this.buildSessionConfig(request);

      // Initialize WebRTC session
      const session: WebRTCSession = {
        id: `webrtc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: request.sessionId,
        userId: request.userId,
        organizationId: await this.getOrganizationId(request.userId),
        status: SessionStatus.INITIALIZING,
        mediaStreams: [],
        peerConnection: {
          iceServers: this.options.iceServers || this.getDefaultIceServers(),
          iceTransportPolicy: 'all',
          bundlePolicy: 'balanced',
          rtcpMuxPolicy: 'require',
        },
        signaling: {
          server: this.options.signalingServer,
          protocol: 'websocket',
          authentication: true,
          encryption: true,
          heartbeat: 30,
        },
        metadata: {
          ...(request.assessmentId && { assessmentId: request.assessmentId }),
          deviceInfo: await this.collectDeviceInfo(request),
          networkInfo: await this.collectNetworkInfo(request),
          browserInfo: await this.collectBrowserInfo(request),
          permissions: {
            camera: 'unknown',
            microphone: 'unknown',
            screen: 'unknown',
            notifications: 'unknown',
            geolocation: 'unknown',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store session
      this.sessions.set(session.id, session);
      await this.persistSession(session);

      // Generate session token
      const sessionToken = await this.generateSessionToken(session);

      // Emit session created event
      this.emitEvent({
        type: WebRTCEventType.SESSION_STARTED,
        sessionId: session.sessionId,
        userId: session.userId,
        timestamp: new Date(),
        data: { sessionConfig },
        severity: EventSeverity.INFO,
      });

      const response: CreateWebRTCSessionResponse = {
        session,
        iceServers: session.peerConnection.iceServers,
        signalingServer: session.signaling.server,
        token: sessionToken,
      };

      logger.info('WebRTC session created successfully', {
        sessionId: session.id,
        userId: request.userId,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create WebRTC session', {
        error: errorMessage,
        sessionId: request.sessionId,
        userId: request.userId,
      });

      throw new WebRTCError(
        `Failed to create WebRTC session: ${errorMessage}`,
        WebRTCErrorCode.INTERNAL_ERROR,
        500,
        { sessionId: request.sessionId, userId: request.userId, error }
      );
    }
  }

  /**
   * Initialize media streams for a session
   */
  async initializeMediaStreams(
    sessionId: string,
    streamConfigs: MediaStreamConfig[]
  ): Promise<MediaStreamInfo[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      logger.info('Initializing media streams', {
        sessionId,
        streamCount: streamConfigs.length,
      });

      const mediaStreams: MediaStreamInfo[] = [];

      for (const config of streamConfigs) {
        const streamInfo = await this.createMediaStream(session, config);
        mediaStreams.push(streamInfo);
        session.mediaStreams.push(streamInfo);
      }

      // Update session status
      session.status = SessionStatus.CONNECTING;
      session.updatedAt = new Date();

      await this.persistSession(session);

      logger.info('Media streams initialized', {
        sessionId,
        streamCount: mediaStreams.length,
      });

      return mediaStreams;
    } catch (error) {
      logger.error('Failed to initialize media streams', {
        error: (error as Error).message,
        sessionId,
      });

      throw new WebRTCError(
        `Failed to initialize media streams: ${(error as any).message}`,
        WebRTCErrorCode.STREAM_ERROR,
        500,
        { sessionId, error }
      );
    }
  }

  /**
   * Start recording for a media stream
   */
  async startRecording(sessionId: string, streamId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const stream = session.mediaStreams.find(s => s.id === streamId);
      if (!stream) {
        throw new Error(`Stream not found: ${streamId}`);
      }

      logger.info('Starting stream recording', { sessionId, streamId });

      // Create recording configuration
      const recordingConfig = this.buildRecordingConfig(session, stream);

      // Start recording (placeholder for actual MediaRecorder implementation)
      const recorder = await this.createMediaRecorder(stream, recordingConfig);
      this.streamRecorders.set(streamId, recorder);

      // Update stream metadata
      stream.metadata = {
        ...stream.metadata,
        codec: recordingConfig.codecs.video,
        bitRate: recordingConfig.bitRate.video,
      };

      // Emit recording started event
      this.emitEvent({
        type: WebRTCEventType.RECORDING_STARTED,
        sessionId: session.sessionId,
        userId: session.userId,
        timestamp: new Date(),
        data: { streamId, recordingConfig },
        severity: EventSeverity.INFO,
      });

      logger.info('Stream recording started', { sessionId, streamId });
    } catch (error) {
      logger.error('Failed to start recording', {
        error: (error as Error).message,
        sessionId,
        streamId,
      });

      throw new WebRTCError(
        `Failed to start recording: ${(error as any).message}`,
        WebRTCErrorCode.RECORDING_ERROR,
        500,
        { sessionId, error }
      );
    }
  }

  /**
   * Stop recording for a media stream
   */
  async stopRecording(sessionId: string, streamId: string): Promise<string> {
    try {
      const recorder = this.streamRecorders.get(streamId);
      if (!recorder) {
        throw new Error(`No active recording found for stream: ${streamId}`);
      }

      logger.info('Stopping stream recording', { sessionId, streamId });

      // Stop recording and get file path
      const recordingPath = await this.stopMediaRecorder(streamId, recorder);
      this.streamRecorders.delete(streamId);

      // Update stream info
      const session = this.sessions.get(sessionId);
      if (session) {
        const stream = session.mediaStreams.find(s => s.id === streamId);
        if (stream) {
          stream.recordingPath = recordingPath;
          stream.endTime = new Date();
          stream.duration = Math.floor(
            (stream.endTime.getTime() - stream.startTime.getTime()) / 1000
          );
        }
      }

      // Emit recording stopped event
      this.emitEvent({
        type: WebRTCEventType.RECORDING_STOPPED,
        sessionId: sessionId,
        userId: session?.userId || 'unknown',
        timestamp: new Date(),
        data: { streamId, recordingPath },
        severity: EventSeverity.INFO,
      });

      logger.info('Stream recording stopped', { sessionId, streamId, recordingPath });

      return recordingPath;
    } catch (error) {
      logger.error('Failed to stop recording', {
        error: (error as Error).message,
        sessionId,
        streamId,
      });

      throw new WebRTCError(
        `Failed to stop recording: ${(error as any).message}`,
        WebRTCErrorCode.RECORDING_ERROR,
        500,
        { sessionId, error }
      );
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<WebRTCSession | null> {
    const session = this.sessions.get(sessionId);
    return session || null;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<WebRTCSession[]> {
    const userSessions: WebRTCSession[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.status !== SessionStatus.COMPLETED) {
        userSessions.push(session);
      }
    }

    return userSessions;
  }

  /**
   * End a WebRTC session
   */
  async endSession(sessionId: string, reason?: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      logger.info('Ending WebRTC session', { sessionId, reason });

      // Stop all recordings
      for (const stream of session.mediaStreams) {
        if (this.streamRecorders.has(stream.id)) {
          await this.stopRecording(sessionId, stream.id);
        }
      }

      // Update session status
      session.status = SessionStatus.COMPLETED;
      session.updatedAt = new Date();

      // Clean up connections
      const connection = this.connections.get(sessionId);
      if (connection) {
        // Close peer connection (placeholder)
        this.connections.delete(sessionId);
      }

      // Persist final session state
      await this.persistSession(session);

      // Emit session ended event
      this.emitEvent({
        type: WebRTCEventType.SESSION_ENDED,
        sessionId: session.sessionId,
        userId: session.userId,
        timestamp: new Date(),
        data: { reason },
        severity: EventSeverity.INFO,
      });

      // Remove from active sessions
      this.sessions.delete(sessionId);

      logger.info('WebRTC session ended successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to end WebRTC session', {
        error: (error as Error).message,
        sessionId,
      });

      throw new WebRTCError(
        `Failed to end session: ${(error as any).message}`,
        WebRTCErrorCode.INTERNAL_ERROR,
        500,
        { sessionId, error }
      );
    }
  }

  /**
   * Get session quality metrics
   */
  async getSessionMetrics(sessionId: string): Promise<StreamQualityMetrics[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const metrics: StreamQualityMetrics[] = [];

      for (const stream of session.mediaStreams) {
        const qualityMetrics = await this.collectStreamMetrics(sessionId, stream);
        metrics.push(qualityMetrics);
      }

      return metrics;
    } catch (error) {
      logger.error('Failed to get session metrics', {
        error: (error as Error).message,
        sessionId,
      });

      throw new WebRTCError(
        `Failed to get session metrics: ${(error as any).message}`,
        WebRTCErrorCode.INTERNAL_ERROR,
        500,
        { sessionId, error }
      );
    }
  }

  /**
   * Private helper methods
   */

  private async validateSessionRequest(request: CreateWebRTCSessionRequest): Promise<void> {
    if (!request.sessionId) {
      throw new Error('Session ID is required');
    }

    if (!request.userId) {
      throw new Error('User ID is required');
    }

    // Check if user exists and has permissions
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid or inactive user');
    }

    // Check for existing active session
    const existingSession = Array.from(this.sessions.values()).find(
      s => s.userId === request.userId && s.status !== SessionStatus.COMPLETED
    );

    if (existingSession) {
      throw new Error('User already has an active WebRTC session');
    }
  }

  private buildSessionConfig(request: CreateWebRTCSessionRequest): MediaStreamConfig {
    const defaultConfig: MediaStreamConfig = {
      id: `config_${Date.now()}`,
      sessionId: request.sessionId,
      userId: request.userId,
      type: MediaStreamType.COMBINED,
      constraints: {
        video: {
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      },
      quality: request.settings?.quality || StreamQuality.MEDIUM,
      recording: {
        enabled: request.settings?.enableRecording || false,
        format: 'webm',
        codecs: {
          video: 'vp8',
          audio: 'opus',
        },
        bitRate: {
          video: 1000,
          audio: 128,
        },
        storage: this.options.storageConfig,
        retention: {
          duration: 30,
          autoDelete: true,
        },
      },
      monitoring: {
        faceDetection: request.settings?.enableMonitoring || false,
        gazeTracking: false,
        audioAnalysis: false,
        behaviorAnalysis: false,
        integrityChecks: false,
        alertThresholds: {
          multipleFaces: 2,
          noFaceDetected: 10,
          lookAwayDuration: 30,
          audioAnomalies: 5,
          suspiciousActivity: 3,
        },
      },
    };

    return { ...defaultConfig, ...request.config };
  }

  private async createMediaStream(
    session: WebRTCSession,
    config: MediaStreamConfig
  ): Promise<MediaStreamInfo> {
    const streamInfo: MediaStreamInfo = {
      id: `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: config.type,
      status: StreamStatus.STARTING,
      quality: config.quality,
      startTime: new Date(),
      metadata: {
        resolution: this.getResolutionString(config.constraints.video),
        frameRate: this.getFrameRate(config.constraints.video),
        bitRate: config.recording.bitRate.video,
        codec: config.recording.codecs.video,
      },
    };

    // Simulate stream creation (in real implementation, this would interact with WebRTC APIs)
    await this.delay(500); // Simulate stream initialization time

    streamInfo.status = StreamStatus.ACTIVE;

    this.emitEvent({
      type: WebRTCEventType.STREAM_STARTED,
      sessionId: session.sessionId,
      userId: session.userId,
      timestamp: new Date(),
      data: { streamId: streamInfo.id, config },
      severity: EventSeverity.INFO,
    });

    return streamInfo;
  }

  private buildRecordingConfig(session: WebRTCSession, stream: MediaStreamInfo) {
    return {
      codecs: {
        video: 'vp8' as const,
        audio: 'opus' as const,
      },
      bitRate: {
        video: 1000,
        audio: 128,
      },
      format: 'webm' as const,
      storage: this.options.storageConfig,
    };
  }

  private async createMediaRecorder(stream: MediaStreamInfo, config: any): Promise<any> {
    // Placeholder for MediaRecorder implementation
    // In real implementation, this would create a MediaRecorder instance
    logger.info('Creating media recorder', {
      streamId: stream.id,
      codec: config.codecs.video,
    });

    return {
      streamId: stream.id,
      config,
      isRecording: true,
      startTime: new Date(),
    };
  }

  private async stopMediaRecorder(streamId: string, recorder: any): Promise<string> {
    // Placeholder for stopping MediaRecorder and saving file
    // In real implementation, this would stop recording and return file path
    const recordingPath = `recordings/${streamId}_${Date.now()}.webm`;

    logger.info('Media recorder stopped', {
      streamId,
      recordingPath,
    });

    return recordingPath;
  }

  private async collectStreamMetrics(
    sessionId: string,
    stream: MediaStreamInfo
  ): Promise<StreamQualityMetrics> {
    // Placeholder for collecting real-time stream metrics
    // In real implementation, this would collect actual WebRTC statistics
    const metrics: QualityMetrics = {
      video: {
        resolution: stream.metadata.resolution || '1280x720',
        frameRate: stream.metadata.frameRate || 30,
        bitRate: stream.metadata.bitRate || 1000,
        framesDropped: Math.floor(Math.random() * 5),
        framesCorrupted: 0,
        jitter: Math.random() * 10,
        latency: 50 + Math.random() * 100,
      },
      network: {
        bandwidth: 5000 + Math.random() * 5000,
        packetLoss: Math.random() * 2,
        rtt: 20 + Math.random() * 80,
        jitter: Math.random() * 20,
        connectionType: 'wifi',
      },
    };

    return {
      sessionId,
      streamId: stream.id,
      timestamp: new Date(),
      metrics,
    };
  }

  private async persistSession(session: WebRTCSession): Promise<void> {
    try {
      // Store session data in Redis for quick access
      await this.redisService.set(
        `webrtc:session:${session.id}`,
        JSON.stringify(session),
        3600 // 1 hour TTL
      );

      // Store session summary in database
      await this.prisma.assessmentSession.upsert({
        where: {
          sessionToken: session.id,
        },
        create: {
          sessionToken: session.id,
          assessmentId: session.metadata.assessmentId || '',
          userId: session.userId,
          status: session.status,
          metadata: session.metadata as any,
          startedAt: session.createdAt,
        },
        update: {
          status: session.status,
          metadata: session.metadata as any,
          updatedAt: session.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Failed to persist session', {
        error: (error as Error).message,
        sessionId: session.id,
      });
    }
  }

  private async generateSessionToken(session: WebRTCSession): Promise<string> {
    // Generate a secure session token
    const tokenData = {
      sessionId: session.id,
      userId: session.userId,
      organizationId: session.organizationId,
      timestamp: Date.now(),
    };

    // In real implementation, this would use JWT or similar
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  private async getOrganizationId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    return user?.organizationId || '';
  }

  private async collectDeviceInfo(request: CreateWebRTCSessionRequest): Promise<any> {
    // Placeholder for device info collection
    return {
      platform: 'web',
      userAgent: 'Mozilla/5.0...',
      screenResolution: '1920x1080',
      availableResolution: '1920x1080',
      colorDepth: 24,
      pixelRatio: 1,
      timezone: 'UTC',
      language: 'en-US',
    };
  }

  private async collectNetworkInfo(request: CreateWebRTCSessionRequest): Promise<any> {
    // Placeholder for network info collection
    return {
      connection: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
      },
      bandwidth: {
        download: 100,
        upload: 20,
        ping: 30,
      },
    };
  }

  private async collectBrowserInfo(request: CreateWebRTCSessionRequest): Promise<any> {
    // Placeholder for browser info collection
    return {
      name: 'Chrome',
      version: '120.0.0.0',
      engine: 'Blink',
      webrtcSupport: {
        peerConnection: true,
        getUserMedia: true,
        getDisplayMedia: true,
        mediaRecorder: true,
        dataChannel: true,
      },
      mediaDevices: {
        videoInputs: [],
        audioInputs: [],
        audioOutputs: [],
      },
    };
  }

  private getDefaultIceServers(): any[] {
    return [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  }

  private getResolutionString(videoConstraints: any): string {
    if (typeof videoConstraints === 'object' && videoConstraints.width && videoConstraints.height) {
      return `${videoConstraints.width.ideal}x${videoConstraints.height.ideal}`;
    }
    return '1280x720';
  }

  private getFrameRate(videoConstraints: any): number {
    if (typeof videoConstraints === 'object' && videoConstraints.frameRate) {
      return videoConstraints.frameRate.ideal || 30;
    }
    return 30;
  }

  private setupCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 300000); // 5 minutes
  }

  private setupQualityMonitoring(): void {
    this.qualityMonitor = setInterval(() => {
      this.monitorSessionQuality();
    }, 10000); // 10 seconds
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.updatedAt.getTime() > inactivityThreshold) {
        logger.info('Cleaning up inactive session', { sessionId });
        await this.endSession(sessionId, 'Inactive session cleanup');
      }
    }
  }

  private async monitorSessionQuality(): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.status === SessionStatus.CONNECTED) {
        try {
          const metrics = await this.getSessionMetrics(session.id);
          // Process quality metrics and emit warnings if needed
          this.processQualityMetrics(session, metrics);
        } catch (error) {
          logger.error('Failed to monitor session quality', {
            error: (error as Error).message,
            sessionId: session.id,
          });
        }
      }
    }
  }

  private processQualityMetrics(session: WebRTCSession, metrics: StreamQualityMetrics[]): void {
    for (const metric of metrics) {
      if (metric.metrics.network && metric.metrics.network.packetLoss > 5) {
        this.emitEvent({
          type: WebRTCEventType.QUALITY_CHANGED,
          sessionId: session.sessionId,
          userId: session.userId,
          timestamp: new Date(),
          data: {
            streamId: metric.streamId,
            issue: 'high_packet_loss',
            value: metric.metrics.network.packetLoss,
          },
          severity: EventSeverity.WARNING,
        });
      }
    }
  }

  private emitEvent(event: WebRTCEvent): void {
    this.emit('webrtc-event', event);
    logger.info('WebRTC event emitted', {
      type: event.type,
      sessionId: event.sessionId,
      severity: event.severity,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up WebRTC Media Service');

    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.qualityMonitor) {
      clearInterval(this.qualityMonitor);
    }

    // End all active sessions
    const endPromises = Array.from(this.sessions.keys()).map(sessionId =>
      this.endSession(sessionId, 'Service shutdown')
    );

    await Promise.allSettled(endPromises);

    logger.info('WebRTC Media Service cleanup completed');
  }
}
