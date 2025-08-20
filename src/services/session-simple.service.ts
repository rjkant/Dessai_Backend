/**
 * Assessment Session Service - Simplified Version
 * Business logic for managing assessment sessions using AssessmentParticipation model
 */

import { PrismaClient } from '@prisma/client';
import {
  AssessmentSession,
  SessionStatus,
  CreateSessionRequest,
  SessionListQuery,
  SubmitAnswerRequest,
  SessionProgress,
  SessionError,
  SessionErrorCode,
  PaginatedResponse
} from '../types/session.types';
import { sessionValidationUtils } from '../utils/session-validation.util';

export class SessionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // SESSION LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Create a new assessment session
   */
  async createSession(request: CreateSessionRequest): Promise<AssessmentSession> {
    try {
      // Validate request
      const validationResult = sessionValidationUtils.validateCreateRequest(request);
      if (!validationResult.isValid) {
        throw this.createError(SessionErrorCode.INVALID_VALUE, validationResult.errors.join(', '));
      }

      // Check if assessment exists
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: request.assessmentId },
        include: { questions: true }
      });

      if (!assessment) {
        throw this.createError(SessionErrorCode.SESSION_NOT_FOUND, 'Assessment not found');
      }

      // Check for existing active participation
      const existingParticipation = await this.prisma.assessmentParticipation.findFirst({
        where: {
          assessmentId: request.assessmentId,
          userId: request.candidateId,
          status: {
            in: ['INVITED', 'IN_PROGRESS']
          }
        }
      });

      if (existingParticipation) {
        throw this.createError(SessionErrorCode.SESSION_ALREADY_COMPLETED, 'Active session already exists');
      }

      // Create assessment participation (our "session")
      const participation = await this.prisma.assessmentParticipation.create({
        data: {
          assessmentId: request.assessmentId,
          userId: request.candidateId,
          status: request.scheduledFor ? 'INVITED' : 'IN_PROGRESS',
          metadata: {
            configuration: JSON.parse(JSON.stringify(request.configuration || {})),
            expiresAt: (request.expiresAt || new Date(Date.now() + 3600000)).toISOString(),
            totalQuestions: assessment.questions.length,
            currentQuestionIndex: 0,
            timeSpent: 0,
            ...JSON.parse(JSON.stringify(request.metadata || {}))
          } as any
        }
      });

      return this.mapToSessionModel(participation, assessment.questions.length);
    } catch (error) {
      if (error instanceof Error && error.message.includes('SessionErrorCode')) {
        throw error;
      }
      throw this.createError(SessionErrorCode.NETWORK_ERROR, 'Failed to create session');
    }
  }

  /**
   * Start an assessment session
   */
  async startSession(sessionId: string): Promise<AssessmentSession> {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: { assessment: { include: { questions: true } } }
    });

    if (!participation) {
      throw this.createError(SessionErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    if (participation.status !== 'INVITED') {
      throw this.createError(SessionErrorCode.INVALID_NAVIGATION, 'Session cannot be started');
    }

    const sessionMetadata = participation.metadata as any;
    const expiresAt = new Date(sessionMetadata.expiresAt);
    
    if (expiresAt < new Date()) {
      throw this.createError(SessionErrorCode.SESSION_EXPIRED, 'Session has expired');
    }

    const updatedParticipation = await this.prisma.assessmentParticipation.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        metadata: {
          ...sessionMetadata,
          actualStartTime: new Date()
        }
      }
    });

    return this.mapToSessionModel(updatedParticipation, participation.assessment.questions.length);
  }

  /**
   * Complete an assessment session
   */
  async completeSession(sessionId: string): Promise<AssessmentSession> {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: { assessment: { include: { questions: true } } }
    });

    if (!participation) {
      throw this.createError(SessionErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    if (participation.status === 'COMPLETED') {
      throw this.createError(SessionErrorCode.SESSION_ALREADY_COMPLETED, 'Session already completed');
    }

    // Calculate final time spent
    const sessionMetadata = participation.metadata as any;
    const timeSpent = participation.startedAt 
      ? Math.floor((Date.now() - participation.startedAt.getTime()) / 1000)
      : sessionMetadata.timeSpent || 0;

    const updatedParticipation = await this.prisma.assessmentParticipation.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: {
          ...sessionMetadata,
          timeSpent,
          completedAt: new Date()
        }
      }
    });

    return this.mapToSessionModel(updatedParticipation, participation.assessment.questions.length);
  }

  // ============================================================================
  // SESSION STATE MANAGEMENT
  // ============================================================================

  /**
   * Get session progress
   */
  async getSessionProgress(sessionId: string): Promise<SessionProgress> {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: { 
        submissions: true,
        assessment: { include: { questions: true } }
      }
    });

    if (!participation) {
      throw this.createError(SessionErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    const sessionMetadata = participation.metadata as any;
    const answered = participation.submissions.filter(s => s.content).length;
    const flagged = participation.submissions.filter(s => (s.metadata as any)?.flagged).length;
    const totalQuestions = participation.assessment.questions.length;
    const currentIndex = sessionMetadata.currentQuestionIndex || 0;
    const timeSpent = sessionMetadata.timeSpent || 0;
    const timeLimit = sessionMetadata.configuration?.timeLimit || 3600;
    const timeRemaining = Math.max(0, timeLimit - timeSpent);
    const progressPercentage = Math.round((currentIndex / totalQuestions) * 100);

    return {
      sessionId,
      totalQuestions,
      currentQuestion: currentIndex + 1,
      answered,
      skipped: currentIndex - answered,
      flagged,
      timeSpent,
      timeRemaining,
      progressPercentage
    };
  }

  // ============================================================================
  // ANSWER SUBMISSION
  // ============================================================================

  /**
   * Submit an answer for a question
   */
  async submitAnswer(sessionId: string, request: SubmitAnswerRequest): Promise<void> {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId }
    });

    if (!participation) {
      throw this.createError(SessionErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    if (participation.status !== 'IN_PROGRESS') {
      throw this.createError(SessionErrorCode.SUBMISSION_TIMEOUT, 'Session is not active');
    }

    // Validate answer format
    const validationResult = sessionValidationUtils.validateAnswerData(request.answer);
    if (!validationResult.isValid) {
      throw this.createError(SessionErrorCode.INVALID_ANSWER_FORMAT, validationResult.errors.join(', '));
    }

    // Check if answer already submitted
    const existingSubmission = await this.prisma.submission.findFirst({
      where: {
        participationId: sessionId,
        questionId: request.questionId
      }
    });

    if (existingSubmission) {
      // Update existing submission
      await this.prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          content: JSON.parse(JSON.stringify(request.answer)) as any,
          metadata: {
            flagged: request.flagged || false,
            confidence: request.confidence,
            timeSpent: request.timeSpent,
            submittedAt: new Date().toISOString()
          } as any
        }
      });
    } else {
      // Create new submission
      await this.prisma.submission.create({
        data: {
          participationId: sessionId,
          questionId: request.questionId,
          content: JSON.parse(JSON.stringify(request.answer)) as any,
          metadata: {
            flagged: request.flagged || false,
            confidence: request.confidence,
            timeSpent: request.timeSpent,
            submittedAt: new Date().toISOString()
          } as any
        }
      });
    }

    // Update session metadata with time spent
    const sessionMetadata = participation.metadata as any;
    await this.prisma.assessmentParticipation.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...sessionMetadata,
          timeSpent: (sessionMetadata.timeSpent || 0) + (request.timeSpent || 0),
          lastActivity: new Date()
        }
      }
    });
  }

  // ============================================================================
  // SESSION RETRIEVAL
  // ============================================================================

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<AssessmentSession> {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: {
        assessment: { include: { questions: true } },
        user: true,
        submissions: true
      }
    });

    if (!participation) {
      throw this.createError(SessionErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    return this.mapToSessionModel(participation, participation.assessment.questions.length);
  }

  /**
   * List sessions with filtering and pagination
   */
  async listSessions(query: SessionListQuery): Promise<PaginatedResponse<AssessmentSession>> {
    const where: any = {};

    if (query.assessmentId) where.assessmentId = query.assessmentId;
    if (query.candidateId) where.userId = query.candidateId;
    if (query.status) {
      // Map our session status to participation status
      const participationStatuses = query.status.map(status => {
        switch (status) {
          case SessionStatus.SCHEDULED: return 'INVITED';
          case SessionStatus.IN_PROGRESS: return 'IN_PROGRESS';
          case SessionStatus.COMPLETED: return 'COMPLETED';
          default: return 'INVITED';
        }
      });
      where.status = { in: participationStatuses };
    }

    if (query.startDate || query.endDate) {
      where.startedAt = {};
      if (query.startDate) where.startedAt.gte = query.startDate;
      if (query.endDate) where.startedAt.lte = query.endDate;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    if (query.sortBy) {
      // Map sort fields to participation fields
      const sortField = query.sortBy === 'startedAt' ? 'startedAt' : 'createdAt';
      orderBy[sortField] = query.sortOrder || 'desc';
    } else {
      orderBy.invitedAt = 'desc';
    }

    const [participations, total] = await Promise.all([
      this.prisma.assessmentParticipation.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          assessment: { include: { questions: true } },
          user: true
        }
      }),
      this.prisma.assessmentParticipation.count({ where })
    ]);

    return {
      data: participations.map(participation => 
        this.mapToSessionModel(participation, participation.assessment.questions.length)
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapToSessionModel(participation: any, totalQuestions: number): AssessmentSession {
    const metadata = participation.metadata as any;
    
    return {
      id: participation.id,
      assessmentId: participation.assessmentId,
      candidateId: participation.userId,
      status: this.mapParticipationStatusToSessionStatus(participation.status),
      startedAt: participation.startedAt,
      completedAt: participation.completedAt,
      expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : new Date(Date.now() + 3600000),
      timeSpent: metadata.timeSpent || 0,
      currentQuestionIndex: metadata.currentQuestionIndex || 0,
      totalQuestions,
      configuration: metadata.configuration || {},
      metadata: metadata,
      createdAt: participation.invitedAt,
      updatedAt: participation.invitedAt // Using invitedAt as we don't have updatedAt
    };
  }

  private mapParticipationStatusToSessionStatus(status: string): SessionStatus {
    switch (status) {
      case 'INVITED': return SessionStatus.SCHEDULED;
      case 'IN_PROGRESS': return SessionStatus.IN_PROGRESS;
      case 'COMPLETED': return SessionStatus.COMPLETED;
      default: return SessionStatus.READY;
    }
  }

  private createError(code: SessionErrorCode, message: string, details?: any): SessionError {
    return {
      code,
      message,
      details,
      timestamp: new Date()
    } as SessionError;
  }
}
