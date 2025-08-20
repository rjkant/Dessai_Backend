/**
 * Session Controller Integration Tests
 * Testing API endpoints for assessment session management
 */

import request from 'supertest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Create test app with session routes
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req: any, _res: any, next: any) => {
  req.user = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'CANDIDATE',
    organizationId: 'test-org-123'
  };
  next();
};

// Mock session routes for testing
app.use('/api/sessions', mockAuth, (req, res) => {
  // This is a simplified mock for testing structure
  // In real implementation, this would use the actual session controller
  res.status(200).json({
    success: true,
    data: { message: 'Session endpoint reached' }
  });
});

describe('Session Controller Integration Tests', () => {
  const testAssessmentId = 'test-assessment-123';
  let authToken: string;

  beforeAll(async () => {
    // Generate test JWT token
    authToken = jwt.sign(
      { 
        userId: 'test-user-123', 
        email: 'test@example.com',
        role: 'CANDIDATE',
        organizationId: 'test-org-123'
      },
      process.env['JWT_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );

    // Cleanup any existing test data
    await prisma.submission.deleteMany({
      where: { participationId: { contains: 'test-' } }
    });
    await prisma.collaborationSession.deleteMany({
      where: { participationId: { contains: 'test-' } }
    });
    await prisma.assessmentParticipation.deleteMany({
      where: { id: { contains: 'test-' } }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.submission.deleteMany({
      where: { participationId: { contains: 'test-' } }
    });
    await prisma.collaborationSession.deleteMany({
      where: { participationId: { contains: 'test-' } }
    });
    await prisma.assessmentParticipation.deleteMany({
      where: { id: { contains: 'test-' } }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/sessions', () => {
    beforeEach(async () => {
      // Create test assessment if needed
      await prisma.assessment.upsert({
        where: { id: testAssessmentId },
        update: {},
        create: {
          id: testAssessmentId,
          title: 'Test Assessment',
          description: 'Integration test assessment',
          type: 'CODING',
          difficultyLevel: 'INTERMEDIATE',
          timeLimit: 60,
          organizationId: 'test-org-123',
          createdBy: 'test-user-123'
        }
      });

      // Add questions to assessment
      await prisma.assessmentQuestion.upsert({
        where: { 
          assessmentId_questionId: {
            assessmentId: testAssessmentId,
            questionId: 'q1'
          }
        },
        update: {},
        create: {
          assessmentId: testAssessmentId,
          questionId: 'q1',
          order: 1
        }
      });
    });

    it('should create a new session successfully', async () => {
      const sessionData = {
        assessmentId: testAssessmentId,
        candidateId: 'test-user-123',
        configuration: {
          timeLimit: 3600,
          allowBackNavigation: true,
          showProgress: true
        }
      };

      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('collaborationToken');
      expect(response.body.data).toHaveProperty('status', 'INVITED');
      expect(response.body.data).toHaveProperty('totalQuestions');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assessmentId: testAssessmentId
          // Missing candidateId
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent assessment', async () => {
      const sessionData = {
        assessmentId: 'non-existent-assessment',
        candidateId: 'test-user-123'
      };

      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Assessment not found');
    });
  });

  describe('POST /api/sessions/:sessionId/start', () => {
    let createdSessionId: string;

    beforeEach(async () => {
      // Create a test session
      const participation = await prisma.assessmentParticipation.create({
        data: {
          id: `test-session-start-${Date.now()}`,
          assessmentId: testAssessmentId,
          userId: 'test-user-123',
          status: 'INVITED',
          metadata: {
            configuration: { timeLimit: 3600 },
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          }
        }
      });
      createdSessionId = participation.id;
    });

    it('should start a session successfully', async () => {
      const response = await request(app)
        .post(`/api/sessions/${createdSessionId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'IN_PROGRESS');
      expect(response.body.data).toHaveProperty('sessionId', createdSessionId);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .post('/api/sessions/non-existent-session/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Session not found');
    });
  });

  describe('POST /api/sessions/:sessionId/complete', () => {
    let activeSessionId: string;

    beforeEach(async () => {
      // Create an active session
      const participation = await prisma.assessmentParticipation.create({
        data: {
          id: `test-session-complete-${Date.now()}`,
          assessmentId: testAssessmentId,
          userId: 'test-user-123',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          metadata: {
            configuration: { timeLimit: 3600 },
            currentQuestionIndex: 0,
            timeSpent: 300
          }
        }
      });
      activeSessionId = participation.id;
    });

    it('should complete a session successfully', async () => {
      const response = await request(app)
        .post(`/api/sessions/${activeSessionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'COMPLETED');
      expect(response.body.data).toHaveProperty('sessionId', activeSessionId);
    });
  });

  describe('POST /api/sessions/:sessionId/navigate', () => {
    let navigationSessionId: string;

    beforeEach(async () => {
      // Create an active session with navigation state
      const participation = await prisma.assessmentParticipation.create({
        data: {
          id: `test-session-nav-${Date.now()}`,
          assessmentId: testAssessmentId,
          userId: 'test-user-123',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          metadata: {
            configuration: { 
              timeLimit: 3600,
              allowBackNavigation: true 
            },
            currentQuestionIndex: 0
          }
        }
      });
      navigationSessionId = participation.id;

      // Add multiple questions to assessment for navigation
      await prisma.assessmentQuestion.upsert({
        where: { 
          assessmentId_questionId: {
            assessmentId: testAssessmentId,
            questionId: 'q2'
          }
        },
        update: {},
        create: {
          assessmentId: testAssessmentId,
          questionId: 'q2',
          order: 2
        }
      });
    });

    it('should navigate to next question successfully', async () => {
      const navigationData = {
        direction: 'NEXT'
      };

      const response = await request(app)
        .post(`/api/sessions/${navigationSessionId}/navigate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(navigationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('currentIndex');
      expect(response.body.data).toHaveProperty('canGoNext');
      expect(response.body.data).toHaveProperty('canGoPrevious');
    });

    it('should return 400 for invalid direction', async () => {
      const navigationData = {
        direction: 'INVALID_DIRECTION'
      };

      const response = await request(app)
        .post(`/api/sessions/${navigationSessionId}/navigate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(navigationData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/sessions/:sessionId/submit', () => {
    let submissionSessionId: string;

    beforeEach(async () => {
      // Create an active session for answer submission
      const participation = await prisma.assessmentParticipation.create({
        data: {
          id: `test-session-submit-${Date.now()}`,
          assessmentId: testAssessmentId,
          userId: 'test-user-123',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          metadata: {
            configuration: { timeLimit: 3600 },
            currentQuestionIndex: 0,
            timeSpent: 200
          }
        }
      });
      submissionSessionId = participation.id;
    });

    it('should submit an answer successfully', async () => {
      const answerData = {
        questionId: 'q1',
        answer: { code: 'console.log("Hello World");' },
        timeSpent: 120,
        flagged: false,
        confidence: 8
      };

      const response = await request(app)
        .post(`/api/sessions/${submissionSessionId}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(answerData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('submissionId');
      expect(response.body.data).toHaveProperty('questionId', 'q1');
    });

    it('should return 400 for missing required fields', async () => {
      const answerData = {
        questionId: 'q1'
        // Missing answer
      };

      const response = await request(app)
        .post(`/api/sessions/${submissionSessionId}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(answerData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/sessions/:sessionId', () => {
    let getSessionId: string;

    beforeEach(async () => {
      // Create a session for retrieval testing
      const participation = await prisma.assessmentParticipation.create({
        data: {
          id: `test-session-get-${Date.now()}`,
          assessmentId: testAssessmentId,
          userId: 'test-user-123',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          metadata: {
            configuration: { timeLimit: 3600 },
            currentQuestionIndex: 1,
            timeSpent: 500
          }
        }
      });
      getSessionId = participation.id;
    });

    it('should retrieve session details successfully', async () => {
      const response = await request(app)
        .get(`/api/sessions/${getSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sessionId', getSessionId);
      expect(response.body.data).toHaveProperty('assessmentId', testAssessmentId);
      expect(response.body.data).toHaveProperty('status', 'IN_PROGRESS');
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/sessions/non-existent-session')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Session not found');
    });
  });

  describe('GET /api/sessions/:sessionId/progress', () => {
    let progressSessionId: string;

    beforeEach(async () => {
      // Create a session with progress data
      const participation = await prisma.assessmentParticipation.create({
        data: {
          id: `test-session-progress-${Date.now()}`,
          assessmentId: testAssessmentId,
          userId: 'test-user-123',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          metadata: {
            configuration: { timeLimit: 3600 },
            currentQuestionIndex: 1,
            timeSpent: 800,
            answeredQuestions: 1
          }
        }
      });
      progressSessionId = participation.id;
    });

    it('should return session progress successfully', async () => {
      const response = await request(app)
        .get(`/api/sessions/${progressSessionId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sessionId', progressSessionId);
      expect(response.body.data).toHaveProperty('totalQuestions');
      expect(response.body.data).toHaveProperty('currentQuestion');
      expect(response.body.data).toHaveProperty('answered');
      expect(response.body.data).toHaveProperty('timeSpent');
      expect(response.body.data).toHaveProperty('progressPercentage');
    });
  });

  describe('GET /api/sessions/active', () => {
    beforeEach(async () => {
      // Create multiple active sessions
      await prisma.assessmentParticipation.create({
        data: {
          id: `test-session-active-1-${Date.now()}`,
          assessmentId: testAssessmentId,
          userId: 'test-user-123',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          metadata: { configuration: { timeLimit: 3600 } }
        }
      });

      await prisma.assessmentParticipation.create({
        data: {
          id: `test-session-active-2-${Date.now()}`,
          assessmentId: testAssessmentId,
          userId: 'test-user-456',
          status: 'INVITED',
          metadata: { 
            configuration: { timeLimit: 3600 },
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          }
        }
      });
    });

    it('should list active sessions successfully', async () => {
      const response = await request(app)
        .get('/api/sessions/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check structure of first session
      if (response.body.data.length > 0) {
        const firstSession = response.body.data[0];
        expect(firstSession).toHaveProperty('sessionId');
        expect(firstSession).toHaveProperty('status');
        expect(['IN_PROGRESS', 'INVITED']).toContain(firstSession.status);
      }
    });

    it('should filter by assessment ID when provided', async () => {
      const response = await request(app)
        .get(`/api/sessions/active?assessmentId=${testAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Authentication', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app)
        .get('/api/sessions/active')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 403 for invalid token', async () => {
      const response = await request(app)
        .get('/api/sessions/active')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
