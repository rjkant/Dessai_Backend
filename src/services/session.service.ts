/**
 * Assessment Session Service
 * Production-ready service for managing assessment sessions using AssessmentParticipation
 */

import { PrismaClient } from '@prisma/client';
// Simple Redis mock for session service
const redisMock = {
  isRedisEnabled: () => false,
  setSession: async (_id: string, _data: any, _ttl?: number) => {},
  getSession: async <T>(_id: string): Promise<T | null> => null,
  updateSessionData: async (_id: string, _data: any) => {}
};

export interface CreateSessionData {
  assessmentId: string;
  candidateId: string;
  configuration?: SessionConfiguration;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface SessionConfiguration {
  timeLimit: number; // in seconds
  allowBackNavigation: boolean;
  showProgress: boolean;
  showTimer: boolean;
  autoSubmit: boolean;
  randomizeOptions: boolean;
  preventTabSwitch: boolean;
  maxTabSwitches: number;
}

export interface SessionProgress {
  sessionId: string;
  totalQuestions: number;
  currentQuestion: number;
  answered: number;
  skipped: number;
  flagged: number;
  timeSpent: number;
  timeRemaining: number;
  progressPercentage: number;
}

export interface NavigationRequest {
  direction: 'NEXT' | 'PREVIOUS' | 'JUMP' | 'FIRST' | 'LAST';
  targetIndex?: number;
}

export interface AnswerSubmissionRequest {
  questionId: string;
  answer: any;
  timeSpent: number;
  flagged?: boolean;
  confidence?: number;
}

export class SessionService {
  private prisma: PrismaClient;
  private redis: typeof redisMock;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.redis = redisMock;
  }

  // ============================================================================
  // SESSION LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Create a new assessment session
   */
  async createSession(data: CreateSessionData) {
    // Check if assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: data.assessmentId },
      include: { 
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Check for existing active participation
    const existingParticipation = await this.prisma.assessmentParticipation.findFirst({
      where: {
        assessmentId: data.assessmentId,
        userId: data.candidateId,
        status: { in: ['INVITED', 'IN_PROGRESS'] }
      }
    });

    if (existingParticipation) {
      throw new Error('Active session already exists');
    }

    // Default configuration
    const defaultConfig: SessionConfiguration = {
      timeLimit: assessment.timeLimit ? assessment.timeLimit * 60 : 3600, // Convert minutes to seconds
      allowBackNavigation: true,
      showProgress: true,
      showTimer: true,
      autoSubmit: true,
      randomizeOptions: false,
      preventTabSwitch: false,
      maxTabSwitches: 3
    };

    const sessionConfig = { ...defaultConfig, ...data.configuration };

    // Create session metadata
    const sessionMetadata = {
      ...data.metadata,
      configuration: sessionConfig,
      expiresAt: data.expiresAt || new Date(Date.now() + sessionConfig.timeLimit * 1000),
      totalQuestions: assessment.questions.length,
      currentQuestionIndex: 0,
      timeSpent: 0,
      answeredQuestions: 0,
      sessionToken: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Create assessment participation (our session)
    const participation = await this.prisma.assessmentParticipation.create({
      data: {
        assessmentId: data.assessmentId,
        userId: data.candidateId,
        status: 'INVITED',
        metadata: sessionMetadata
      },
      include: {
        assessment: { include: { questions: { include: { question: true } } } },
        user: true
      }
    });

    // Create collaboration session for real-time features
    const collaborationSession = await this.prisma.collaborationSession.create({
      data: {
        participationId: participation.id,
        sessionToken: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isActive: true,
        settings: {
          enableRealTimeSync: true,
          maxParticipants: 1,
          allowSpectators: true
        }
      }
    });

    // Store in Redis for fast access
    if (this.redis.isRedisEnabled()) {
      await this.redis.setSession(participation.id, {
        participationId: participation.id,
        collaborationSessionId: collaborationSession.id,
        status: participation.status,
        currentQuestionIndex: 0,
        timeSpent: 0,
        metadata: sessionMetadata
      }, sessionConfig.timeLimit);
    }

    return {
      sessionId: participation.id,
      collaborationToken: collaborationSession.sessionToken,
      status: participation.status,
      expiresAt: sessionMetadata.expiresAt,
      totalQuestions: assessment.questions.length,
      configuration: sessionConfig
    };
  }

  /**
   * Start an assessment session
   */
  async startSession(sessionId: string) {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: { 
        assessment: { include: { questions: { include: { question: true } } } },
        user: true
      }
    });

    if (!participation) {
      throw new Error('Session not found');
    }

    if (participation.status !== 'INVITED') {
      throw new Error('Session cannot be started');
    }

    const sessionMetadata = participation.metadata as any;
    const expiresAt = new Date(sessionMetadata.expiresAt);
    
    if (expiresAt < new Date()) {
      await this.updateSessionStatus(sessionId, 'EXPIRED');
      throw new Error('Session has expired');
    }

    const updatedParticipation = await this.prisma.assessmentParticipation.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date()
      },
      include: {
        assessment: { include: { questions: { include: { question: true } } } },
        user: true
      }
    });

    // Update Redis cache
    if (this.redis.isRedisEnabled()) {
      await this.redis.setSession(sessionId, {
        participationId: sessionId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        currentQuestionIndex: sessionMetadata.currentQuestionIndex || 0,
        timeSpent: sessionMetadata.timeSpent || 0,
        metadata: sessionMetadata
      });
    }

    return {
      sessionId: updatedParticipation.id,
      status: updatedParticipation.status,
      startedAt: updatedParticipation.startedAt,
      totalQuestions: updatedParticipation.assessment.questions.length,
      currentQuestionIndex: sessionMetadata.currentQuestionIndex || 0
    };
  }

  /**
   * Complete an assessment session
   */
  async completeSession(sessionId: string) {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: { 
        assessment: { include: { questions: { include: { question: true } } } },
        user: true,
        submissions: true
      }
    });

    if (!participation) {
      throw new Error('Session not found');
    }

    if (participation.status === 'COMPLETED') {
      throw new Error('Session already completed');
    }

    // Calculate final score
    const totalScore = participation.submissions.reduce((sum, submission) => {
      return sum + (submission.score || 0);
    }, 0);

    // Calculate time spent
    const sessionMetadata = participation.metadata as any;
    const timeSpent = participation.startedAt 
      ? Math.floor((Date.now() - participation.startedAt.getTime()) / 1000)
      : sessionMetadata.timeSpent || 0;

    const updatedParticipation = await this.prisma.assessmentParticipation.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score: totalScore,
        metadata: {
          ...sessionMetadata,
          timeSpent,
          finalScore: totalScore,
          completionPercentage: Math.round((participation.submissions.length / participation.assessment.questions.length) * 100)
        }
      }
    });

    // Deactivate collaboration session
    await this.prisma.collaborationSession.updateMany({
      where: { participationId: sessionId },
      data: { isActive: false }
    });

    // Update Redis cache
    if (this.redis.isRedisEnabled()) {
      await this.redis.setSession(sessionId, {
        participationId: sessionId,
        status: 'COMPLETED',
        completedAt: new Date(),
        score: totalScore,
        timeSpent,
        metadata: updatedParticipation.metadata
      });
    }

    return {
      sessionId: updatedParticipation.id,
      status: updatedParticipation.status,
      completedAt: updatedParticipation.completedAt,
      score: totalScore,
      timeSpent
    };
  }

  // ============================================================================
  // NAVIGATION & PROGRESS
  // ============================================================================

  /**
   * Navigate to a question
   */
  async navigateToQuestion(sessionId: string, request: NavigationRequest) {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: { 
        assessment: { include: { questions: { include: { question: true } } } }
      }
    });

    if (!participation) {
      throw new Error('Session not found');
    }

    if (participation.status !== 'IN_PROGRESS') {
      throw new Error('Navigation not allowed in current state');
    }

    const sessionMetadata = participation.metadata as any;
    const config = sessionMetadata.configuration as SessionConfiguration;
    const currentIndex = sessionMetadata.currentQuestionIndex || 0;
    const totalQuestions = participation.assessment.questions.length;

    let newIndex = currentIndex;

    switch (request.direction) {
      case 'NEXT':
        newIndex = currentIndex + 1;
        break;
      case 'PREVIOUS':
        newIndex = currentIndex - 1;
        break;
      case 'FIRST':
        newIndex = 0;
        break;
      case 'LAST':
        newIndex = totalQuestions - 1;
        break;
      case 'JUMP':
        newIndex = request.targetIndex || currentIndex;
        break;
    }

    if (newIndex < 0 || newIndex >= totalQuestions) {
      throw new Error('Invalid question index');
    }

    // Check navigation permissions
    if (!config.allowBackNavigation && newIndex < currentIndex) {
      throw new Error('Back navigation not allowed');
    }

    // Update session
    await this.prisma.assessmentParticipation.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...sessionMetadata,
          currentQuestionIndex: newIndex,
          lastActivity: new Date()
        }
      }
    });

    // Update Redis cache
    if (this.redis.isRedisEnabled()) {
      const cachedSession = await this.redis.getSession(sessionId);
      if (cachedSession && typeof cachedSession === 'object') {
        await this.redis.setSession(sessionId, {
          ...(cachedSession as any),
          currentQuestionIndex: newIndex,
          lastActivity: new Date()
        });
      }
    }

    return {
      currentIndex: newIndex,
      totalQuestions,
      canGoNext: newIndex < totalQuestions - 1,
      canGoPrevious: config.allowBackNavigation && newIndex > 0
    };
  }

  /**
   * Get session progress
   */
  async getSessionProgress(sessionId: string): Promise<SessionProgress> {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: {
        assessment: { include: { questions: true } },
        submissions: true
      }
    });

    if (!participation) {
      throw new Error('Session not found');
    }

    const sessionMetadata = participation.metadata as any;
    const config = sessionMetadata.configuration as SessionConfiguration;
    
    const totalQuestions = participation.assessment.questions.length;
    const currentIndex = sessionMetadata.currentQuestionIndex || 0;
    const answered = participation.submissions.length;
    const flagged = participation.submissions.filter(s => (s.metadata as any)?.flagged).length;
    
    const timeSpent = sessionMetadata.timeSpent || 0;
    const timeRemaining = Math.max(0, config.timeLimit - timeSpent);
    const progressPercentage = Math.round((currentIndex / totalQuestions) * 100);

    return {
      sessionId,
      totalQuestions,
      currentQuestion: currentIndex + 1,
      answered,
      skipped: Math.max(0, currentIndex - answered),
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
  async submitAnswer(sessionId: string, request: AnswerSubmissionRequest) {
    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: { 
        assessment: { include: { questions: { include: { question: true } } } }
      }
    });

    if (!participation) {
      throw new Error('Session not found');
    }

    if (participation.status !== 'IN_PROGRESS') {
      throw new Error('Session is not active');
    }

    // Check if answer already submitted
    const existingSubmission = await this.prisma.submission.findFirst({
      where: {
        participationId: sessionId,
        questionId: request.questionId
      }
    });

    const sessionMetadata = participation.metadata as any;
    const config = sessionMetadata.configuration as SessionConfiguration;

    if (existingSubmission && !config.allowBackNavigation) {
      throw new Error('Answer already submitted');
    }

    // Create or update submission
    const submission = existingSubmission
      ? await this.prisma.submission.update({
          where: { id: existingSubmission.id },
          data: {
            content: request.answer,
            executionTime: request.timeSpent,
            metadata: {
              flagged: request.flagged || false,
              confidence: request.confidence,
              attemptCount: ((existingSubmission.metadata as any)?.attemptCount || 0) + 1,
              submittedAt: new Date()
            }
          },
          include: { question: true }
        })
      : await this.prisma.submission.create({
          data: {
            participationId: sessionId,
            questionId: request.questionId,
            content: request.answer,
            executionTime: request.timeSpent,
            metadata: {
              flagged: request.flagged || false,
              confidence: request.confidence,
              attemptCount: 1,
              submittedAt: new Date()
            }
          },
          include: { question: true }
        });

    // Update session time and metadata
    const currentTimeSpent = sessionMetadata.timeSpent || 0;
    const newTimeSpent = currentTimeSpent + request.timeSpent;
    const answeredQuestions = sessionMetadata.answeredQuestions || 0;

    await this.prisma.assessmentParticipation.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...sessionMetadata,
          timeSpent: newTimeSpent,
          lastActivity: new Date(),
          answeredQuestions: existingSubmission ? answeredQuestions : answeredQuestions + 1
        }
      }
    });

    // Update Redis cache
    if (this.redis.isRedisEnabled()) {
      const cachedSession = await this.redis.getSession(sessionId);
      if (cachedSession && typeof cachedSession === 'object') {
        await this.redis.setSession(sessionId, {
          ...(cachedSession as any),
          timeSpent: newTimeSpent,
          lastActivity: new Date(),
          answeredQuestions: existingSubmission ? answeredQuestions : answeredQuestions + 1
        });
      }
    }

    return {
      submissionId: submission.id,
      questionId: request.questionId,
      submittedAt: new Date(),
      timeSpent: request.timeSpent,
      flagged: request.flagged || false
    };
  }

  // ============================================================================
  // SESSION RETRIEVAL
  // ============================================================================

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string) {
    // Try Redis first
    if (this.redis.isRedisEnabled()) {
      const cachedSession = await this.redis.getSession(sessionId);
      if (cachedSession) {
        return cachedSession;
      }
    }

    const participation = await this.prisma.assessmentParticipation.findUnique({
      where: { id: sessionId },
      include: {
        assessment: { include: { questions: { include: { question: true } } } },
        user: true,
        submissions: true
      }
    });

    if (!participation) {
      throw new Error('Session not found');
    }

    const sessionMetadata = participation.metadata as any;

    return {
      sessionId: participation.id,
      assessmentId: participation.assessmentId,
      candidateId: participation.userId,
      status: participation.status,
      startedAt: participation.startedAt,
      completedAt: participation.completedAt,
      score: participation.score,
      totalQuestions: participation.assessment.questions.length,
      currentQuestionIndex: sessionMetadata.currentQuestionIndex || 0,
      timeSpent: sessionMetadata.timeSpent || 0,
      answeredQuestions: sessionMetadata.answeredQuestions || 0,
      configuration: sessionMetadata.configuration,
      expiresAt: new Date(sessionMetadata.expiresAt)
    };
  }

  /**
   * List active sessions
   */
  async listActiveSessions(assessmentId?: string) {
    const where: any = {
      status: { in: ['INVITED', 'IN_PROGRESS'] }
    };

    if (assessmentId) {
      where.assessmentId = assessmentId;
    }

    const participations = await this.prisma.assessmentParticipation.findMany({
      where,
      include: {
        assessment: { select: { title: true } },
        user: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { invitedAt: 'desc' }
    });

    return participations.map(p => {
      const metadata = p.metadata as any;
      return {
        sessionId: p.id,
        assessmentId: p.assessmentId,
        assessmentTitle: p.assessment.title,
        candidateId: p.userId,
        candidateName: `${p.user.firstName} ${p.user.lastName}`,
        candidateEmail: p.user.email,
        status: p.status,
        startedAt: p.startedAt,
        expiresAt: new Date(metadata?.expiresAt),
        timeSpent: metadata?.timeSpent || 0,
        currentQuestionIndex: metadata?.currentQuestionIndex || 0
      };
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async updateSessionStatus(sessionId: string, status: string) {
    await this.prisma.assessmentParticipation.update({
      where: { id: sessionId },
      data: { status: status as any }
    });

    if (this.redis.isRedisEnabled()) {
      const cachedSession = await this.redis.getSession(sessionId);
      if (cachedSession && typeof cachedSession === 'object') {
        await this.redis.setSession(sessionId, {
          ...(cachedSession as any),
          status
        });
      }
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    const expiredParticipations = await this.prisma.assessmentParticipation.findMany({
      where: {
        status: { in: ['INVITED', 'IN_PROGRESS'] }
      }
    });

    const now = new Date();
    const expiredSessions = expiredParticipations.filter(p => {
      const metadata = p.metadata as any;
      const expiresAt = new Date(metadata?.expiresAt);
      return expiresAt < now;
    });

    for (const session of expiredSessions) {
      await this.updateSessionStatus(session.id, 'EXPIRED');
    }

    return expiredSessions.length;
  }
}
