/**
 * Assessment Session Controller
 * Production-ready HTTP API endpoints for session management
 */

import { Request, Response } from 'express';
import {
  SessionService,
  CreateSessionData,
  NavigationRequest,
  AnswerSubmissionRequest,
} from '../services/session.service';
import { database } from '../services/database.service';

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService(database.getClient());
  }

  // ============================================================================
  // SESSION LIFECYCLE ENDPOINTS
  // ============================================================================

  /**
   * POST /api/sessions
   * Create a new assessment session
   */
  createSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { assessmentId, candidateId, configuration, expiresAt, metadata } = req.body;

      if (!assessmentId || !candidateId) {
        res.status(400).json({
          success: false,
          error: 'Assessment ID and candidate ID are required',
        });
        return;
      }

      const sessionData: CreateSessionData = {
        assessmentId,
        candidateId,
        configuration,
        metadata,
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      };

      const session = await this.sessionService.createSession(sessionData);

      res.status(201).json({
        success: true,
        data: session,
        message: 'Session created successfully',
      });
    } catch (error: any) {
      console.error('Create session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create session',
      });
    }
  };

  /**
   * POST /api/sessions/:sessionId/start
   * Start an assessment session
   */
  startSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await this.sessionService.startSession(sessionId);

      res.status(200).json({
        success: true,
        data: session,
        message: 'Session started successfully',
      });
    } catch (error: any) {
      console.error('Start session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start session',
      });
    }
  };

  /**
   * POST /api/sessions/:sessionId/complete
   * Complete an assessment session
   */
  completeSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await this.sessionService.completeSession(sessionId);

      res.status(200).json({
        success: true,
        data: session,
        message: 'Session completed successfully',
      });
    } catch (error: any) {
      console.error('Complete session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete session',
      });
    }
  };

  /**
   * GET /api/sessions/:sessionId
   * Get session details
   */
  getSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await this.sessionService.getSessionById(sessionId);

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      console.error('Get session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session',
      });
    }
  };

  /**
   * GET /api/sessions/:sessionId/progress
   * Get session progress
   */
  getSessionProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const progress = await this.sessionService.getSessionProgress(sessionId);

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      console.error('Get session progress error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session progress',
      });
    }
  };

  /**
   * GET /api/sessions
   * List active sessions
   */
  listActiveSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { assessmentId } = req.query;
      const sessions = await this.sessionService.listActiveSessions(assessmentId as string);

      res.status(200).json({
        success: true,
        data: sessions,
        total: sessions.length,
      });
    } catch (error: any) {
      console.error('List sessions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list sessions',
      });
    }
  };

  // ============================================================================
  // NAVIGATION ENDPOINTS
  // ============================================================================

  /**
   * POST /api/sessions/:sessionId/navigate
   * Navigate to a question
   */
  navigateToQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { direction, targetIndex } = req.body;

      if (!direction) {
        res.status(400).json({
          success: false,
          error: 'Navigation direction is required',
        });
        return;
      }

      const navigationRequest: NavigationRequest = {
        direction,
        targetIndex,
      };

      const navigationState = await this.sessionService.navigateToQuestion(
        sessionId,
        navigationRequest
      );

      res.status(200).json({
        success: true,
        data: navigationState,
        message: 'Navigation successful',
      });
    } catch (error: any) {
      console.error('Navigate question error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to navigate',
      });
    }
  };

  // ============================================================================
  // ANSWER SUBMISSION ENDPOINTS
  // ============================================================================

  /**
   * POST /api/sessions/:sessionId/submit
   * Submit an answer
   */
  submitAnswer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { questionId, answer, timeSpent, flagged, confidence } = req.body;

      if (!questionId) {
        res.status(400).json({
          success: false,
          error: 'Question ID is required',
        });
        return;
      }

      if (answer === undefined || answer === null) {
        res.status(400).json({
          success: false,
          error: 'Answer is required',
        });
        return;
      }

      const submissionRequest: AnswerSubmissionRequest = {
        questionId,
        answer,
        timeSpent: timeSpent || 0,
        flagged,
        confidence,
      };

      const submission = await this.sessionService.submitAnswer(sessionId, submissionRequest);

      res.status(200).json({
        success: true,
        data: submission,
        message: 'Answer submitted successfully',
      });
    } catch (error: any) {
      console.error('Submit answer error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit answer',
      });
    }
  };

  // ============================================================================
  // UTILITY ENDPOINTS
  // ============================================================================

  /**
   * POST /api/sessions/cleanup
   * Cleanup expired sessions
   */
  cleanupExpiredSessions = async (_req: Request, res: Response): Promise<void> => {
    try {
      const count = await this.sessionService.cleanupExpiredSessions();

      res.status(200).json({
        success: true,
        data: { expiredCount: count },
        message: `Cleaned up ${count} expired sessions`,
      });
    } catch (error: any) {
      console.error('Cleanup sessions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cleanup expired sessions',
      });
    }
  };
}

export const sessionController = new SessionController();
