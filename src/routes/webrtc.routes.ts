/**
 * WebRTC Proctoring Routes
 * HTTP API routes for WebRTC media streaming and proctoring
 * Epic 4 Task 4.1: WebRTC Media Streaming Routes
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { WebRTCController } from '../controllers/webrtc.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { roleGuard } from '../middleware/role.middleware';
import RedisService from '../services/redis.service';
import { ProctoringServiceOptions } from '../types/proctoring.types';
import { UserRole } from '../types/auth.types';

// Router setup
export function createWebRTCRoutes(
  prisma: PrismaClient,
  redisService: RedisService,
  options: ProctoringServiceOptions
): Router {
  const router = Router();
  const webrtcController = new WebRTCController(prisma, redisService, options);

  // Apply authentication middleware to all routes
  router.use(AuthMiddleware.authenticate as any);

  /**
   * @route   POST /api/proctoring/sessions
   * @desc    Create a new WebRTC proctoring session
   * @access  Private (Authenticated users)
   */
  router.post(
    '/sessions',
    [
      // Validation middleware
      body('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),
      
      body('assessmentId')
        .optional()
        .isString()
        .withMessage('Assessment ID must be a string'),
      
      body('settings')
        .optional()
        .isObject()
        .withMessage('Settings must be an object'),
      
      body('settings.enableVideo')
        .optional()
        .isBoolean()
        .withMessage('enableVideo must be a boolean'),
      
      body('settings.enableAudio')
        .optional()
        .isBoolean()
        .withMessage('enableAudio must be a boolean'),
      
      body('settings.enableScreenShare')
        .optional()
        .isBoolean()
        .withMessage('enableScreenShare must be a boolean'),
      
      body('settings.enableRecording')
        .optional()
        .isBoolean()
        .withMessage('enableRecording must be a boolean'),
      
      body('settings.enableMonitoring')
        .optional()
        .isBoolean()
        .withMessage('enableMonitoring must be a boolean'),
      
      body('settings.quality')
        .optional()
        .isIn(['low', 'medium', 'high', 'hd'])
        .withMessage('Quality must be one of: low, medium, high, hd'),
      
      body('settings.monitoringLevel')
        .optional()
        .isIn(['none', 'basic', 'standard', 'advanced', 'strict'])
        .withMessage('Monitoring level must be one of: none, basic, standard, advanced, strict'),

      ValidationMiddleware.handleValidationErrors
    ],
    webrtcController.createSession.bind(webrtcController) as any
  );

  /**
   * @route   GET /api/proctoring/sessions/:sessionId
   * @desc    Get WebRTC session details
   * @access  Private (Session owner)
   */
  router.get(
    '/sessions/:sessionId',
    [
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),

      ValidationMiddleware.handleValidationErrors
    ],
    webrtcController.getSession.bind(webrtcController) as any
  );

  /**
   * @route   POST /api/proctoring/sessions/:sessionId/streams
   * @desc    Initialize media streams for a session
   * @access  Private (Session owner)
   */
  router.post(
    '/sessions/:sessionId/streams',
    [
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),
      
      body('streamConfigs')
        .optional()
        .isArray()
        .withMessage('Stream configs must be an array'),

      ValidationMiddleware.handleValidationErrors
    ],
    webrtcController.initializeStreams.bind(webrtcController) as any
  );

  /**
   * @route   POST /api/proctoring/sessions/:sessionId/streams/:streamId/recording/start
   * @desc    Start recording for a media stream
   * @access  Private (Session owner)
   */
  router.post(
    '/sessions/:sessionId/streams/:streamId/recording/start',
    [
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),
      
      param('streamId')
        .isString()
        .notEmpty()
        .withMessage('Stream ID is required'),

      ValidationMiddleware.handleValidationErrors
    ],
    webrtcController.startRecording.bind(webrtcController) as any
  );

  /**
   * @route   POST /api/proctoring/sessions/:sessionId/streams/:streamId/recording/stop
   * @desc    Stop recording for a media stream
   * @access  Private (Session owner)
   */
  router.post(
    '/sessions/:sessionId/streams/:streamId/recording/stop',
    [
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),
      
      param('streamId')
        .isString()
        .notEmpty()
        .withMessage('Stream ID is required'),

      ValidationMiddleware.handleValidationErrors
    ],
    webrtcController.stopRecording.bind(webrtcController) as any
  );

  /**
   * @route   GET /api/proctoring/sessions/:sessionId/metrics
   * @desc    Get session quality metrics
   * @access  Private (Session owner or Admin)
   */
  router.get(
    '/sessions/:sessionId/metrics',
    [
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),

      ValidationMiddleware.handleValidationErrors
    ],
    webrtcController.getSessionMetrics.bind(webrtcController) as any
  );

  /**
   * @route   POST /api/proctoring/sessions/:sessionId/end
   * @desc    End a WebRTC session
   * @access  Private (Session owner)
   */
  router.post(
    '/sessions/:sessionId/end',
    [
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),
      
      body('reason')
        .optional()
        .isString()
        .withMessage('Reason must be a string'),

      ValidationMiddleware.handleValidationErrors
    ],
    webrtcController.endSession.bind(webrtcController) as any
  );

  /**
   * @route   GET /api/proctoring/users/sessions
   * @desc    Get user's active WebRTC sessions
   * @access  Private (Authenticated user)
   */
  router.get(
    '/users/sessions',
    webrtcController.getUserSessions.bind(webrtcController) as any
  );

  /**
   * @route   GET /api/proctoring/health
   * @desc    Health check for WebRTC service
   * @access  Public
   */
  router.get('/health', webrtcController.healthCheck.bind(webrtcController) as any);

  /**
   * Admin routes - require admin role
   */

  /**
   * @route   GET /api/proctoring/admin/sessions
   * @desc    Get all WebRTC sessions (Admin only)
   * @access  Private (Admin)
   */
  router.get(
    '/admin/sessions',
    [
      roleGuard([UserRole.ADMIN]) as any,
      
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      
      query('status')
        .optional()
        .isIn(['initializing', 'connecting', 'connected', 'monitoring', 'paused', 'disconnected', 'completed', 'failed'])
        .withMessage('Invalid status value'),

      ValidationMiddleware.handleValidationErrors
    ],
    // TODO: Implement admin sessions endpoint
    (req: any, res: any) => {
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Admin sessions endpoint not yet implemented'
        }
      });
    }
  );

  /**
   * @route   GET /api/proctoring/admin/sessions/:sessionId/recordings
   * @desc    Get recordings for a session (Admin only)
   * @access  Private (Admin)
   */
  router.get(
    '/admin/sessions/:sessionId/recordings',
    [
      roleGuard as any,
      
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),

      ValidationMiddleware.handleValidationErrors
    ],
    // TODO: Implement admin recordings endpoint
    (req: any, res: any) => {
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Admin recordings endpoint not yet implemented'
        }
      });
    }
  );

  /**
   * @route   DELETE /api/proctoring/admin/sessions/:sessionId
   * @desc    Force delete a WebRTC session (Admin only)
   * @access  Private (Admin)
   */
  router.delete(
    '/admin/sessions/:sessionId',
    [
      roleGuard as any,
      
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),

      ValidationMiddleware.handleValidationErrors
    ],
    // TODO: Implement admin session deletion endpoint
    (req: any, res: any) => {
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Admin session deletion endpoint not yet implemented'
        }
      });
    }
  );

  return router;
}

export default createWebRTCRoutes;
