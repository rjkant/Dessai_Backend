/**
 * Epic 4 Task 4.1: WebRTC Media Streaming - Testing Suite
 * Persona: Quality Assurance Engineer
 * 
 * Comprehensive test suite for WebRTC implementation validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebRTCMediaService } from '../../../src/services/webrtc-media.service';
import { WebRTCController } from '../../../src/controllers/webrtc.controller';
import RedisService from '../../../src/services/redis.service';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../../../src/utils/logger.utils';
import {
  CreateWebRTCSessionRequest,
  MediaStreamType,
  StreamQuality,
  MonitoringLevel,
  SessionStatus,
  ProctoringServiceOptions
} from '../../../src/types/proctoring.types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../src/services/redis.service');
jest.mock('../../../src/utils/logger.utils');

describe('Epic 4 Task 4.1: WebRTC Media Streaming', () => {
  let webrtcService: WebRTCMediaService;
  let webrtcController: WebRTCController;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockLogger: jest.Mocked<Logger>;

  const mockOptions: ProctoringServiceOptions = {
    enableRecording: true,
    enableAIAnalysis: true,
    quality: StreamQuality.HIGH,
    monitoring: MonitoringLevel.STRICT,
    storage: {
      provider: 'local',
      path: '/tmp/recordings'
    }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn()
    } as any;
    mockLogger = new Logger('Test') as jest.Mocked<Logger>;

    // Initialize services
    webrtcService = new WebRTCMediaService(mockPrisma, mockRedisService, mockOptions);
    webrtcController = new WebRTCController(mockPrisma, mockRedisService, mockOptions);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('WebRTC Service Core Functionality', () => {
    it('should create WebRTC session successfully', async () => {
      const sessionRequest: CreateWebRTCSessionRequest = {
        sessionId: 'test-session-123',
        userId: 'user-123',
        assessmentId: 'assessment-123',
        mediaConfig: {
          video: {
            enabled: true,
            quality: StreamQuality.HIGH
          },
          audio: {
            enabled: true,
            quality: StreamQuality.HIGH
          },
          screen: {
            enabled: true,
            quality: StreamQuality.MEDIUM
          }
        },
        monitoring: {
          level: MonitoringLevel.STRICT,
          features: ['face-detection', 'tab-switch', 'focus-loss']
        }
      };

      // Mock successful response
      const mockSession = {
        id: 'webrtc-session-123',
        status: SessionStatus.ACTIVE,
        createdAt: new Date(),
        mediaStreams: []
      };

      mockRedisService.set.mockResolvedValue('OK');
      
      const result = await webrtcService.createSession(sessionRequest);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionRequest.sessionId);
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should initialize media streams with proper configuration', async () => {
      const sessionId = 'test-session-123';
      const mediaConfig = {
        video: { enabled: true, quality: StreamQuality.HIGH },
        audio: { enabled: true, quality: StreamQuality.HIGH },
        screen: { enabled: false, quality: StreamQuality.MEDIUM }
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify({
        id: sessionId,
        status: SessionStatus.ACTIVE
      }));

      const result = await webrtcService.initializeStreams(sessionId, mediaConfig);

      expect(result).toBeDefined();
      expect(result.streams).toHaveLength(2); // video + audio
      expect(mockRedisService.get).toHaveBeenCalledWith(`webrtc:session:${sessionId}`);
    });

    it('should handle recording operations correctly', async () => {
      const sessionId = 'test-session-123';
      const streamId = 'stream-123';

      mockRedisService.get.mockResolvedValue(JSON.stringify({
        id: sessionId,
        status: SessionStatus.ACTIVE,
        streams: [{ id: streamId, type: MediaStreamType.VIDEO }]
      }));

      // Test start recording
      const startResult = await webrtcService.startRecording(sessionId, streamId);
      expect(startResult).toBeDefined();
      expect(startResult.recordingId).toBeDefined();

      // Test stop recording
      const stopResult = await webrtcService.stopRecording(sessionId, streamId);
      expect(stopResult).toBeDefined();
      expect(stopResult.recordingPath).toBeDefined();
    });

    it('should monitor session quality metrics', async () => {
      const sessionId = 'test-session-123';

      mockRedisService.get.mockResolvedValue(JSON.stringify({
        id: sessionId,
        status: SessionStatus.ACTIVE,
        metrics: {
          videoQuality: { resolution: '1920x1080', frameRate: 30 },
          audioQuality: { sampleRate: 48000, bitrate: 128 },
          networkQuality: { bandwidth: 1000, latency: 50, packetLoss: 0.1 }
        }
      }));

      const metrics = await webrtcService.getSessionMetrics(sessionId);

      expect(metrics).toBeDefined();
      expect(metrics.sessionId).toBe(sessionId);
      expect(metrics.videoQuality).toBeDefined();
      expect(metrics.audioQuality).toBeDefined();
      expect(metrics.networkQuality).toBeDefined();
    });

    it('should handle session cleanup properly', async () => {
      const sessionId = 'test-session-123';

      mockRedisService.get.mockResolvedValue(JSON.stringify({
        id: sessionId,
        status: SessionStatus.ACTIVE
      }));
      mockRedisService.del.mockResolvedValue(1);

      await webrtcService.endSession(sessionId, 'test completed');

      expect(mockRedisService.del).toHaveBeenCalledWith(`webrtc:session:${sessionId}`);
    });
  });

  describe('WebRTC Controller HTTP API', () => {
    it('should handle session creation API endpoint', async () => {
      const mockReq = {
        body: {
          sessionId: 'test-session-123',
          userId: 'user-123',
          assessmentId: 'assessment-123',
          mediaConfig: {
            video: { enabled: true, quality: StreamQuality.HIGH },
            audio: { enabled: true, quality: StreamQuality.HIGH }
          }
        },
        user: { id: 'user-123', organizationId: 'org-123' }
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      mockRedisService.set.mockResolvedValue('OK');

      await webrtcController.createSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    it('should handle session retrieval API endpoint', async () => {
      const mockReq = {
        params: { sessionId: 'test-session-123' },
        user: { id: 'user-123', organizationId: 'org-123' }
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      mockRedisService.get.mockResolvedValue(JSON.stringify({
        id: 'test-session-123',
        status: SessionStatus.ACTIVE
      }));

      await webrtcController.getSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    it('should handle health check endpoint', async () => {
      const mockReq = {} as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await webrtcController.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          service: 'WebRTC Proctoring Service'
        })
      );
    });
  });

  describe('WebRTC Error Handling', () => {
    it('should handle invalid session creation gracefully', async () => {
      const invalidRequest = {
        sessionId: '',
        userId: '',
        assessmentId: ''
      } as any;

      await expect(webrtcService.createSession(invalidRequest))
        .rejects.toThrow('Invalid session creation request');
    });

    it('should handle non-existent session operations', async () => {
      const nonExistentSessionId = 'non-existent-123';

      mockRedisService.get.mockResolvedValue(null);

      await expect(webrtcService.getSessionMetrics(nonExistentSessionId))
        .rejects.toThrow('Session not found');
    });

    it('should handle recording errors properly', async () => {
      const sessionId = 'test-session-123';
      const streamId = 'invalid-stream-123';

      mockRedisService.get.mockResolvedValue(JSON.stringify({
        id: sessionId,
        status: SessionStatus.ACTIVE,
        streams: []
      }));

      await expect(webrtcService.startRecording(sessionId, streamId))
        .rejects.toThrow('Stream not found');
    });
  });

  describe('WebRTC Performance and Load Testing', () => {
    it('should handle multiple concurrent sessions', async () => {
      const sessionCount = 10;
      const sessions = Array.from({ length: sessionCount }, (_, i) => ({
        sessionId: `concurrent-session-${i}`,
        userId: `user-${i}`,
        assessmentId: `assessment-${i}`,
        mediaConfig: {
          video: { enabled: true, quality: StreamQuality.MEDIUM },
          audio: { enabled: true, quality: StreamQuality.MEDIUM }
        }
      }));

      mockRedisService.set.mockResolvedValue('OK');

      const results = await Promise.all(
        sessions.map(session => webrtcService.createSession(session))
      );

      expect(results).toHaveLength(sessionCount);
      results.forEach((result, index) => {
        expect(result.sessionId).toBe(sessions[index].sessionId);
      });
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const sessionId = 'performance-test-123';

      mockRedisService.get.mockResolvedValue(JSON.stringify({
        id: sessionId,
        status: SessionStatus.ACTIVE
      }));

      // Simulate multiple rapid operations
      const operations = await Promise.all([
        webrtcService.getSessionMetrics(sessionId),
        webrtcService.getSessionMetrics(sessionId),
        webrtcService.getSessionMetrics(sessionId),
        webrtcService.getSessionMetrics(sessionId),
        webrtcService.getSessionMetrics(sessionId)
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(operations).toHaveLength(5);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('WebRTC Integration Points', () => {
    it('should integrate with assessment sessions properly', async () => {
      const sessionRequest: CreateWebRTCSessionRequest = {
        sessionId: 'integration-test-123',
        userId: 'user-123',
        assessmentId: 'assessment-123',
        mediaConfig: {
          video: { enabled: true, quality: StreamQuality.HIGH },
          audio: { enabled: true, quality: StreamQuality.HIGH }
        }
      };

      // Mock assessment session lookup
      (mockPrisma as any).assessmentSession = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'assessment-session-123',
          assessmentId: 'assessment-123',
          userId: 'user-123',
          status: 'IN_PROGRESS'
        })
      };

      mockRedisService.set.mockResolvedValue('OK');

      const result = await webrtcService.createSession(sessionRequest);

      expect(result).toBeDefined();
      expect(result.assessmentId).toBe(sessionRequest.assessmentId);
    });

    it('should handle Redis connection failures gracefully', async () => {
      const sessionId = 'redis-fail-test-123';

      mockRedisService.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(webrtcService.getSessionMetrics(sessionId))
        .rejects.toThrow('Redis connection failed');
    });
  });
});

// Export test configuration
export const testConfig = {
  testTimeout: 10000,
  setupTimeout: 5000,
  teardownTimeout: 5000
};
