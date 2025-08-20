/**
 * Session Service Unit Tests
 * Comprehensive testing for assessment session management
 */

import { SessionService, CreateSessionData, NavigationRequest, AnswerSubmissionRequest } from '../../../src/services/session.service';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';

// Mock database client
const mockPrisma = mockDeep<PrismaClient>();

describe('SessionService', () => {
  let sessionService: SessionService;

  const mockAssessmentId = 'assessment-123';
  const mockCandidateId = 'candidate-123';
  const mockSessionId = 'session-123';

  beforeEach(() => {
    mockReset(mockPrisma);
    sessionService = new SessionService(mockPrisma as any);
  });

  describe('createSession', () => {
    const mockCreateData: CreateSessionData = {
      assessmentId: mockAssessmentId,
      candidateId: mockCandidateId,
      configuration: {
        timeLimit: 3600,
        allowBackNavigation: true,
        showProgress: true,
        showTimer: true,
        autoSubmit: true,
        randomizeOptions: false,
        preventTabSwitch: false,
        maxTabSwitches: 3
      },
      metadata: { browserInfo: 'Chrome' }
    };

    it('should create a new session successfully', async () => {
      // Mock assessment with questions
      const mockAssessment = {
        id: mockAssessmentId,
        title: 'Test Assessment',
        timeLimit: 60,
        questions: [
          { id: 'q1', question: { id: 'q1', title: 'Question 1' } },
          { id: 'q2', question: { id: 'q2', title: 'Question 2' } }
        ]
      };

      const mockParticipation = {
        id: mockSessionId,
        assessmentId: mockAssessmentId,
        userId: mockCandidateId,
        status: 'INVITED',
        metadata: {},
        assessment: mockAssessment,
        user: { id: mockCandidateId, firstName: 'John', lastName: 'Doe' }
      };

      const mockCollaborationSession = {
        id: 'collab-123',
        sessionToken: 'collab_token_123',
        isActive: true
      };

      mockPrisma.assessment.findUnique.mockResolvedValue(mockAssessment as any);
      mockPrisma.assessmentParticipation.findFirst.mockResolvedValue(null);
      mockPrisma.assessmentParticipation.create.mockResolvedValue(mockParticipation as any);
      mockPrisma.collaborationSession.create.mockResolvedValue(mockCollaborationSession as any);

      const result = await sessionService.createSession(mockCreateData);

      expect(result).toHaveProperty('sessionId', mockSessionId);
      expect(result).toHaveProperty('collaborationToken', 'collab_token_123');
      expect(result).toHaveProperty('status', 'INVITED');
      expect(result).toHaveProperty('totalQuestions', 2);
      expect(mockPrisma.assessmentParticipation.create).toHaveBeenCalled();
      expect(mockPrisma.collaborationSession.create).toHaveBeenCalled();
    });

    it('should throw error if assessment not found', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue(null);

      await expect(sessionService.createSession(mockCreateData))
        .rejects.toThrow('Assessment not found');
    });

    it('should throw error if active session already exists', async () => {
      const mockAssessment = {
        id: mockAssessmentId,
        questions: []
      };

      const existingParticipation = {
        id: 'existing-123',
        status: 'IN_PROGRESS'
      };

      mockPrisma.assessment.findUnique.mockResolvedValue(mockAssessment as any);
      mockPrisma.assessmentParticipation.findFirst.mockResolvedValue(existingParticipation as any);

      await expect(sessionService.createSession(mockCreateData))
        .rejects.toThrow('Active session already exists');
    });

    it('should use default configuration when none provided', async () => {
      const mockAssessment = {
        id: mockAssessmentId,
        timeLimit: null,
        questions: []
      };

      const mockParticipation = {
        id: mockSessionId,
        metadata: {}
      };

      mockPrisma.assessment.findUnique.mockResolvedValue(mockAssessment as any);
      mockPrisma.assessmentParticipation.findFirst.mockResolvedValue(null);
      mockPrisma.assessmentParticipation.create.mockResolvedValue(mockParticipation as any);
      mockPrisma.collaborationSession.create.mockResolvedValue({ id: 'collab-123' } as any);

      const dataWithoutConfig = {
        assessmentId: mockAssessmentId,
        candidateId: mockCandidateId
      };

      await sessionService.createSession(dataWithoutConfig);

      const createCall = mockPrisma.assessmentParticipation.create.mock.calls[0][0];
      expect(createCall.data.metadata).toHaveProperty('configuration');
      expect(createCall.data.metadata.configuration.timeLimit).toBe(3600); // Default 1 hour
    });
  });

  describe('startSession', () => {
    it('should start a session successfully', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'INVITED',
        metadata: {
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        },
        assessment: {
          questions: [{ id: 'q1' }, { id: 'q2' }]
        },
        user: { id: mockCandidateId }
      };

      const updatedParticipation = {
        ...mockParticipation,
        status: 'IN_PROGRESS',
        startedAt: new Date()
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);
      mockPrisma.assessmentParticipation.update.mockResolvedValue(updatedParticipation as any);

      const result = await sessionService.startSession(mockSessionId);

      expect(result).toHaveProperty('status', 'IN_PROGRESS');
      expect(result).toHaveProperty('sessionId', mockSessionId);
      expect(result).toHaveProperty('totalQuestions', 2);
      expect(mockPrisma.assessmentParticipation.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: expect.any(Date)
        },
        include: expect.any(Object)
      });
    });

    it('should throw error if session not found', async () => {
      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(null);

      await expect(sessionService.startSession(mockSessionId))
        .rejects.toThrow('Session not found');
    });

    it('should throw error if session cannot be started', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'COMPLETED'
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);

      await expect(sessionService.startSession(mockSessionId))
        .rejects.toThrow('Session cannot be started');
    });

    it('should throw error if session has expired', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'INVITED',
        metadata: {
          expiresAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        }
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);
      mockPrisma.assessmentParticipation.update.mockResolvedValue({} as any); // For status update

      await expect(sessionService.startSession(mockSessionId))
        .rejects.toThrow('Session has expired');
    });
  });

  describe('completeSession', () => {
    it('should complete a session successfully', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 1800000), // 30 minutes ago
        assessment: {
          questions: [{ id: 'q1' }, { id: 'q2' }]
        },
        user: { id: mockCandidateId },
        submissions: [
          { id: 'sub1', score: 85 },
          { id: 'sub2', score: 92 }
        ]
      };

      const updatedParticipation = {
        ...mockParticipation,
        status: 'COMPLETED',
        completedAt: new Date(),
        score: 177
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);
      mockPrisma.assessmentParticipation.update.mockResolvedValue(updatedParticipation as any);
      mockPrisma.collaborationSession.updateMany.mockResolvedValue({ count: 1 } as any);

      const result = await sessionService.completeSession(mockSessionId);

      expect(result).toHaveProperty('status', 'COMPLETED');
      expect(result).toHaveProperty('score', 177);
      expect(result).toHaveProperty('timeSpent');
      expect(mockPrisma.collaborationSession.updateMany).toHaveBeenCalledWith({
        where: { participationId: mockSessionId },
        data: { isActive: false }
      });
    });

    it('should throw error if session already completed', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'COMPLETED'
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);

      await expect(sessionService.completeSession(mockSessionId))
        .rejects.toThrow('Session already completed');
    });
  });

  describe('navigateToQuestion', () => {
    const mockNavigationRequest: NavigationRequest = {
      direction: 'NEXT'
    };

    it('should navigate to next question successfully', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'IN_PROGRESS',
        metadata: {
          currentQuestionIndex: 0,
          configuration: {
            allowBackNavigation: true
          }
        },
        assessment: {
          questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }]
        }
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);
      mockPrisma.assessmentParticipation.update.mockResolvedValue({} as any);

      const result = await sessionService.navigateToQuestion(mockSessionId, mockNavigationRequest);

      expect(result).toHaveProperty('currentIndex', 1);
      expect(result).toHaveProperty('totalQuestions', 3);
      expect(result).toHaveProperty('canGoNext', true);
      expect(result).toHaveProperty('canGoPrevious', true);
    });

    it('should throw error for invalid question index', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'IN_PROGRESS',
        metadata: {
          currentQuestionIndex: 2,
          configuration: { allowBackNavigation: true }
        },
        assessment: {
          questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }]
        }
      };

      const nextRequest: NavigationRequest = { direction: 'NEXT' };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);

      await expect(sessionService.navigateToQuestion(mockSessionId, nextRequest))
        .rejects.toThrow('Invalid question index');
    });

    it('should throw error for back navigation when not allowed', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'IN_PROGRESS',
        metadata: {
          currentQuestionIndex: 1,
          configuration: { allowBackNavigation: false }
        },
        assessment: {
          questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }]
        }
      };

      const previousRequest: NavigationRequest = { direction: 'PREVIOUS' };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);

      await expect(sessionService.navigateToQuestion(mockSessionId, previousRequest))
        .rejects.toThrow('Back navigation not allowed');
    });

    it('should handle jump navigation correctly', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'IN_PROGRESS',
        metadata: {
          currentQuestionIndex: 0,
          configuration: { allowBackNavigation: true }
        },
        assessment: {
          questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }]
        }
      };

      const jumpRequest: NavigationRequest = { direction: 'JUMP', targetIndex: 2 };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);
      mockPrisma.assessmentParticipation.update.mockResolvedValue({} as any);

      const result = await sessionService.navigateToQuestion(mockSessionId, jumpRequest);

      expect(result).toHaveProperty('currentIndex', 2);
    });
  });

  describe('submitAnswer', () => {
    const mockSubmissionRequest: AnswerSubmissionRequest = {
      questionId: 'question-123',
      answer: { code: 'console.log("Hello World");' },
      timeSpent: 120,
      flagged: false,
      confidence: 8
    };

    it('should submit a new answer successfully', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'IN_PROGRESS',
        metadata: {
          configuration: { allowBackNavigation: true },
          timeSpent: 300,
          answeredQuestions: 0
        },
        assessment: {
          questions: [{ id: 'q1' }]
        }
      };

      const mockSubmission = {
        id: 'submission-123',
        participationId: mockSessionId,
        questionId: 'question-123',
        content: mockSubmissionRequest.answer,
        question: { id: 'question-123', type: 'CODING' }
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);
      mockPrisma.submission.findFirst.mockResolvedValue(null); // No existing submission
      mockPrisma.submission.create.mockResolvedValue(mockSubmission as any);
      mockPrisma.assessmentParticipation.update.mockResolvedValue({} as any);

      const result = await sessionService.submitAnswer(mockSessionId, mockSubmissionRequest);

      expect(result).toHaveProperty('submissionId', 'submission-123');
      expect(result).toHaveProperty('questionId', 'question-123');
      expect(result).toHaveProperty('timeSpent', 120);
      expect(mockPrisma.submission.create).toHaveBeenCalledWith({
        data: {
          participationId: mockSessionId,
          questionId: 'question-123',
          content: mockSubmissionRequest.answer,
          executionTime: 120,
          metadata: {
            flagged: false,
            confidence: 8,
            attemptCount: 1,
            submittedAt: expect.any(Date)
          }
        },
        include: { question: true }
      });
    });

    it('should update existing answer when allowed', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'IN_PROGRESS',
        metadata: {
          configuration: { allowBackNavigation: true },
          timeSpent: 300,
          answeredQuestions: 1
        }
      };

      const existingSubmission = {
        id: 'existing-submission-123',
        metadata: { attemptCount: 1 }
      };

      const updatedSubmission = {
        id: 'existing-submission-123',
        participationId: mockSessionId,
        questionId: 'question-123',
        question: { id: 'question-123', type: 'CODING' }
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);
      mockPrisma.submission.findFirst.mockResolvedValue(existingSubmission as any);
      mockPrisma.submission.update.mockResolvedValue(updatedSubmission as any);
      mockPrisma.assessmentParticipation.update.mockResolvedValue({} as any);

      const result = await sessionService.submitAnswer(mockSessionId, mockSubmissionRequest);

      expect(result).toHaveProperty('submissionId', 'existing-submission-123');
      expect(mockPrisma.submission.update).toHaveBeenCalledWith({
        where: { id: 'existing-submission-123' },
        data: {
          content: mockSubmissionRequest.answer,
          executionTime: 120,
          metadata: {
            flagged: false,
            confidence: 8,
            attemptCount: 2,
            submittedAt: expect.any(Date)
          }
        },
        include: { question: true }
      });
    });

    it('should throw error if answer already submitted and back navigation not allowed', async () => {
      const mockParticipation = {
        id: mockSessionId,
        status: 'IN_PROGRESS',
        metadata: {
          configuration: { allowBackNavigation: false }
        }
      };

      const existingSubmission = { id: 'existing-123' };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);
      mockPrisma.submission.findFirst.mockResolvedValue(existingSubmission as any);

      await expect(sessionService.submitAnswer(mockSessionId, mockSubmissionRequest))
        .rejects.toThrow('Answer already submitted');
    });
  });

  describe('getSessionProgress', () => {
    it('should return correct session progress', async () => {
      const mockParticipation = {
        id: mockSessionId,
        metadata: {
          currentQuestionIndex: 2,
          timeSpent: 1200,
          configuration: { timeLimit: 3600 }
        },
        assessment: {
          questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }]
        },
        submissions: [
          { id: 'sub1', metadata: { flagged: false } },
          { id: 'sub2', metadata: { flagged: true } }
        ]
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);

      const result = await sessionService.getSessionProgress(mockSessionId);

      expect(result).toEqual({
        sessionId: mockSessionId,
        totalQuestions: 5,
        currentQuestion: 3, // currentQuestionIndex + 1
        answered: 2,
        skipped: 0, // max(0, currentIndex - answered)
        flagged: 1,
        timeSpent: 1200,
        timeRemaining: 2400, // 3600 - 1200
        progressPercentage: 40 // (2/5) * 100
      });
    });
  });

  describe('getSessionById', () => {
    it('should return session details successfully', async () => {
      const mockParticipation = {
        id: mockSessionId,
        assessmentId: mockAssessmentId,
        userId: mockCandidateId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        completedAt: null,
        score: null,
        metadata: {
          currentQuestionIndex: 1,
          timeSpent: 600,
          answeredQuestions: 1,
          configuration: { timeLimit: 3600 },
          expiresAt: new Date(Date.now() + 3600000)
        },
        assessment: {
          questions: [{ id: 'q1' }, { id: 'q2' }]
        },
        user: { id: mockCandidateId },
        submissions: []
      };

      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(mockParticipation as any);

      const result = await sessionService.getSessionById(mockSessionId);

      expect(result).toHaveProperty('sessionId', mockSessionId);
      expect(result).toHaveProperty('assessmentId', mockAssessmentId);
      expect(result).toHaveProperty('candidateId', mockCandidateId);
      expect(result).toHaveProperty('status', 'IN_PROGRESS');
      expect(result).toHaveProperty('totalQuestions', 2);
      expect(result).toHaveProperty('currentQuestionIndex', 1);
      expect(result).toHaveProperty('timeSpent', 600);
    });

    it('should throw error if session not found', async () => {
      mockPrisma.assessmentParticipation.findUnique.mockResolvedValue(null);

      await expect(sessionService.getSessionById(mockSessionId))
        .rejects.toThrow('Session not found');
    });
  });

  describe('listActiveSessions', () => {
    it('should list active sessions successfully', async () => {
      const mockParticipations = [
        {
          id: 'session-1',
          assessmentId: 'assessment-1',
          userId: 'user-1',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          metadata: {
            expiresAt: new Date(Date.now() + 3600000),
            timeSpent: 300,
            currentQuestionIndex: 1
          },
          assessment: { title: 'Frontend Assessment' },
          user: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
        },
        {
          id: 'session-2',
          assessmentId: 'assessment-2',
          userId: 'user-2',
          status: 'INVITED',
          startedAt: null,
          metadata: {
            expiresAt: new Date(Date.now() + 7200000),
            timeSpent: 0,
            currentQuestionIndex: 0
          },
          assessment: { title: 'Backend Assessment' },
          user: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
        }
      ];

      mockPrisma.assessmentParticipation.findMany.mockResolvedValue(mockParticipations as any);

      const result = await sessionService.listActiveSessions();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('sessionId', 'session-1');
      expect(result[0]).toHaveProperty('assessmentTitle', 'Frontend Assessment');
      expect(result[0]).toHaveProperty('candidateName', 'John Doe');
      expect(result[0]).toHaveProperty('status', 'IN_PROGRESS');
      expect(result[1]).toHaveProperty('sessionId', 'session-2');
      expect(result[1]).toHaveProperty('status', 'INVITED');
    });

    it('should filter by assessment ID when provided', async () => {
      mockPrisma.assessmentParticipation.findMany.mockResolvedValue([]);

      await sessionService.listActiveSessions('specific-assessment-id');

      expect(mockPrisma.assessmentParticipation.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['INVITED', 'IN_PROGRESS'] },
          assessmentId: 'specific-assessment-id'
        },
        include: expect.any(Object),
        orderBy: { invitedAt: 'desc' }
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions successfully', async () => {
      const now = new Date();
      const expiredSession = {
        id: 'expired-session',
        status: 'IN_PROGRESS',
        metadata: {
          expiresAt: new Date(now.getTime() - 3600000) // 1 hour ago
        }
      };

      const activeSession = {
        id: 'active-session',
        status: 'IN_PROGRESS',
        metadata: {
          expiresAt: new Date(now.getTime() + 3600000) // 1 hour from now
        }
      };

      mockPrisma.assessmentParticipation.findMany.mockResolvedValue([expiredSession, activeSession] as any);
      mockPrisma.assessmentParticipation.update.mockResolvedValue({} as any);

      const result = await sessionService.cleanupExpiredSessions();

      expect(result).toBe(1); // Only one expired session
      expect(mockPrisma.assessmentParticipation.update).toHaveBeenCalledWith({
        where: { id: 'expired-session' },
        data: { status: 'EXPIRED' }
      });
    });
  });
});
