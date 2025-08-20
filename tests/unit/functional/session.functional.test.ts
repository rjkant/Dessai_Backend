/**
 * Session System Functional Tests
 * End-to-end testing for complete session workflows
 */

import { SessionService } from '../../../src/services/session.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Session System Functional Tests', () => {
  let sessionService: SessionService;
  const testAssessmentId = 'func-test-assessment-123';
  const testCandidateId = 'func-test-candidate-123';
  
  beforeAll(async () => {
    sessionService = new SessionService(prisma);
    
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function setupTestData() {
    // Create test organization
    await prisma.organization.upsert({
      where: { id: 'func-test-org-123' },
      update: {},
      create: {
        id: 'func-test-org-123',
        name: 'Functional Test Org',
        domain: 'functest.com',
        settings: {}
      }
    });

    // Create test user
    await prisma.user.upsert({
      where: { id: testCandidateId },
      update: {},
      create: {
        id: testCandidateId,
        email: 'functest@example.com',
        firstName: 'Functional',
        lastName: 'Tester',
        role: 'CANDIDATE',
        organizationId: 'func-test-org-123',
        passwordHash: 'hashed-password'
      }
    });

    // Create test questions
    const questions = [
      {
        id: 'func-q1',
        title: 'JavaScript Basics',
        content: 'Write a function to reverse a string',
        type: 'CODING',
        difficulty: 'EASY',
        tags: ['javascript', 'strings'],
        organizationId: 'func-test-org-123',
        createdBy: testCandidateId
      },
      {
        id: 'func-q2',
        title: 'Array Manipulation',
        content: 'Find the maximum element in an array',
        type: 'CODING',
        difficulty: 'MEDIUM',
        tags: ['javascript', 'arrays'],
        organizationId: 'func-test-org-123',
        createdBy: testCandidateId
      },
      {
        id: 'func-q3',
        title: 'API Design',
        content: 'Design a REST API for user management',
        type: 'SYSTEM_DESIGN',
        difficulty: 'HARD',
        tags: ['api', 'design'],
        organizationId: 'func-test-org-123',
        createdBy: testCandidateId
      }
    ];

    for (const question of questions) {
      await prisma.question.upsert({
        where: { id: question.id },
        update: {},
        create: question as any
      });
    }

    // Create test assessment
    await prisma.assessment.upsert({
      where: { id: testAssessmentId },
      update: {},
      create: {
        id: testAssessmentId,
        title: 'Functional Test Assessment',
        description: 'Comprehensive functional testing assessment',
        type: 'CODING',
        difficultyLevel: 'INTERMEDIATE',
        timeLimit: 120, // 2 hours
        organizationId: 'func-test-org-123',
        createdBy: testCandidateId
      }
    });

    // Link questions to assessment
    for (let i = 0; i < questions.length; i++) {
      await prisma.assessmentQuestion.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: testAssessmentId,
            questionId: questions[i].id
          }
        },
        update: {},
        create: {
          assessmentId: testAssessmentId,
          questionId: questions[i].id,
          order: i + 1
        }
      });
    }
  }

  async function cleanupTestData() {
    // Cleanup in reverse order due to foreign key constraints
    await prisma.submission.deleteMany({
      where: { participationId: { contains: 'func-test-' } }
    });
    await prisma.collaborationSession.deleteMany({
      where: { participationId: { contains: 'func-test-' } }
    });
    await prisma.assessmentParticipation.deleteMany({
      where: { assessmentId: testAssessmentId }
    });
    await prisma.assessmentQuestion.deleteMany({
      where: { assessmentId: testAssessmentId }
    });
    await prisma.assessment.deleteMany({
      where: { id: testAssessmentId }
    });
    await prisma.question.deleteMany({
      where: { id: { in: ['func-q1', 'func-q2', 'func-q3'] } }
    });
    await prisma.user.deleteMany({
      where: { id: testCandidateId }
    });
    await prisma.organization.deleteMany({
      where: { id: 'func-test-org-123' }
    });
  }

  describe('Complete Session Workflow', () => {
    let sessionId: string;

    it('should complete full assessment session workflow', async () => {
      // Step 1: Create Session
      console.log('Step 1: Creating session...');
      const sessionData = {
        assessmentId: testAssessmentId,
        candidateId: testCandidateId,
        configuration: {
          timeLimit: 7200, // 2 hours
          allowBackNavigation: true,
          showProgress: true,
          showTimer: true,
          randomizeOptions: false
        },
        metadata: {
          browserInfo: 'Chrome/98.0',
          userAgent: 'Test User Agent'
        }
      };

      const createResult = await sessionService.createSession(sessionData);
      sessionId = createResult.sessionId;

      expect(createResult).toHaveProperty('sessionId');
      expect(createResult).toHaveProperty('collaborationToken');
      expect(createResult.status).toBe('INVITED');
      expect(createResult.totalQuestions).toBe(3);
      console.log(`✓ Session created: ${sessionId}`);

      // Step 2: Start Session
      console.log('Step 2: Starting session...');
      const startResult = await sessionService.startSession(sessionId);
      
      expect(startResult.status).toBe('IN_PROGRESS');
      expect(startResult.sessionId).toBe(sessionId);
      expect(startResult).toHaveProperty('currentQuestionIndex', 0);
      console.log('✓ Session started successfully');

      // Step 3: Get Initial Progress
      console.log('Step 3: Checking initial progress...');
      const initialProgress = await sessionService.getSessionProgress(sessionId);
      
      expect(initialProgress.totalQuestions).toBe(3);
      expect(initialProgress.currentQuestion).toBe(1);
      expect(initialProgress.answered).toBe(0);
      expect(initialProgress.progressPercentage).toBe(0);
      console.log('✓ Initial progress verified');

      // Step 4: Answer First Question
      console.log('Step 4: Answering first question...');
      const answer1 = {
        questionId: 'func-q1',
        answer: {
          code: 'function reverseString(str) { return str.split("").reverse().join(""); }'
        },
        timeSpent: 300, // 5 minutes
        flagged: false,
        confidence: 9
      };

      const submission1 = await sessionService.submitAnswer(sessionId, answer1);
      
      expect(submission1).toHaveProperty('submissionId');
      expect(submission1.questionId).toBe('func-q1');
      expect(submission1.timeSpent).toBe(300);
      console.log('✓ First answer submitted');

      // Step 5: Navigate to Next Question
      console.log('Step 5: Navigating to next question...');
      const navigation1 = await sessionService.navigateToQuestion(sessionId, { direction: 'NEXT' });
      
      expect(navigation1.currentIndex).toBe(1);
      expect(navigation1.canGoNext).toBe(true);
      expect(navigation1.canGoPrevious).toBe(true);
      console.log('✓ Navigation to question 2 successful');

      // Step 6: Answer Second Question
      console.log('Step 6: Answering second question...');
      const answer2 = {
        questionId: 'func-q2',
        answer: {
          code: 'function findMax(arr) { return Math.max(...arr); }'
        },
        timeSpent: 420, // 7 minutes
        flagged: true, // Flag this one for review
        confidence: 7
      };

      const submission2 = await sessionService.submitAnswer(sessionId, answer2);
      
      expect(submission2).toHaveProperty('submissionId');
      expect(submission2.questionId).toBe('func-q2');
      console.log('✓ Second answer submitted (flagged for review)');

      // Step 7: Check Progress After Two Answers
      console.log('Step 7: Checking progress after two answers...');
      const midProgress = await sessionService.getSessionProgress(sessionId);
      
      expect(midProgress.answered).toBe(2);
      expect(midProgress.flagged).toBe(1);
      expect(midProgress.progressPercentage).toBeCloseTo(66.67, 1); // 2/3 * 100
      console.log('✓ Mid-progress verified');

      // Step 8: Navigate to Last Question
      console.log('Step 8: Navigating to final question...');
      const navigation2 = await sessionService.navigateToQuestion(sessionId, { direction: 'NEXT' });
      
      expect(navigation2.currentIndex).toBe(2);
      expect(navigation2.canGoNext).toBe(false); // Last question
      expect(navigation2.canGoPrevious).toBe(true);
      console.log('✓ Navigation to final question successful');

      // Step 9: Answer Final Question
      console.log('Step 9: Answering final question...');
      const answer3 = {
        questionId: 'func-q3',
        answer: {
          text: `REST API Design for User Management:
          
          GET /api/users - List all users
          GET /api/users/{id} - Get specific user
          POST /api/users - Create new user
          PUT /api/users/{id} - Update user
          DELETE /api/users/{id} - Delete user
          
          Authentication: JWT tokens
          Error handling: Standard HTTP status codes
          Pagination: Query parameters for large datasets`
        },
        timeSpent: 900, // 15 minutes
        flagged: false,
        confidence: 8
      };

      const submission3 = await sessionService.submitAnswer(sessionId, answer3);
      
      expect(submission3).toHaveProperty('submissionId');
      expect(submission3.questionId).toBe('func-q3');
      console.log('✓ Final answer submitted');

      // Step 10: Test Back Navigation
      console.log('Step 10: Testing back navigation...');
      const backNavigation = await sessionService.navigateToQuestion(sessionId, { direction: 'PREVIOUS' });
      
      expect(backNavigation.currentIndex).toBe(1);
      console.log('✓ Back navigation successful');

      // Step 11: Update Previous Answer (Test Re-submission)
      console.log('Step 11: Testing answer update...');
      const updatedAnswer2 = {
        questionId: 'func-q2',
        answer: {
          code: 'function findMax(arr) { return arr.reduce((max, curr) => curr > max ? curr : max, arr[0]); }'
        },
        timeSpent: 180, // Additional 3 minutes
        flagged: false, // Un-flag after review
        confidence: 9
      };

      const updatedSubmission = await sessionService.submitAnswer(sessionId, updatedAnswer2);
      
      expect(updatedSubmission.questionId).toBe('func-q2');
      console.log('✓ Answer update successful');

      // Step 12: Final Progress Check
      console.log('Step 12: Final progress verification...');
      const finalProgress = await sessionService.getSessionProgress(sessionId);
      
      expect(finalProgress.answered).toBe(3);
      expect(finalProgress.flagged).toBe(0); // Unflagged the second question
      expect(finalProgress.progressPercentage).toBe(100);
      console.log('✓ Final progress verified');

      // Step 13: Complete Session
      console.log('Step 13: Completing session...');
      const completionResult = await sessionService.completeSession(sessionId);
      
      expect(completionResult.status).toBe('COMPLETED');
      expect(completionResult).toHaveProperty('score');
      expect(completionResult).toHaveProperty('timeSpent');
      expect(completionResult.timeSpent).toBeGreaterThan(0);
      console.log('✓ Session completed successfully');

      // Step 14: Verify Session Cannot Be Modified After Completion
      console.log('Step 14: Verifying session immutability after completion...');
      
      await expect(
        sessionService.startSession(sessionId)
      ).rejects.toThrow('Session cannot be started');

      await expect(
        sessionService.navigateToQuestion(sessionId, { direction: 'NEXT' })
      ).rejects.toThrow('Session not active');

      await expect(
        sessionService.submitAnswer(sessionId, answer1)
      ).rejects.toThrow('Session not active');

      console.log('✓ Session immutability verified');

      // Step 15: Retrieve Final Session Details
      console.log('Step 15: Retrieving final session details...');
      const finalSession = await sessionService.getSessionById(sessionId);
      
      expect(finalSession.status).toBe('COMPLETED');
      expect(finalSession).toHaveProperty('completedAt');
      expect(finalSession.score).toBeGreaterThan(0);
      console.log('✓ Final session retrieval successful');

      console.log('\n🎉 Complete session workflow test passed successfully!');
    }, 30000); // 30 second timeout for comprehensive test
  });

  describe('Session Edge Cases and Error Handling', () => {
    it('should handle session expiration correctly', async () => {
      // Create session with short expiration
      const shortSessionData = {
        assessmentId: testAssessmentId,
        candidateId: testCandidateId,
        configuration: {
          timeLimit: 1 // 1 second for quick expiration
        }
      };

      const createResult = await sessionService.createSession(shortSessionData);
      const shortSessionId = createResult.sessionId;

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to start expired session
      await expect(
        sessionService.startSession(shortSessionId)
      ).rejects.toThrow('Session has expired');
    });

    it('should prevent duplicate session creation', async () => {
      const sessionData = {
        assessmentId: testAssessmentId,
        candidateId: testCandidateId
      };

      // Create first session
      const firstSession = await sessionService.createSession(sessionData);
      expect(firstSession).toHaveProperty('sessionId');

      // Try to create duplicate session
      await expect(
        sessionService.createSession(sessionData)
      ).rejects.toThrow('Active session already exists');

      // Cleanup
      await sessionService.completeSession(firstSession.sessionId);
    });

    it('should handle navigation boundary conditions', async () => {
      const sessionData = {
        assessmentId: testAssessmentId,
        candidateId: testCandidateId,
        configuration: { allowBackNavigation: false }
      };

      const session = await sessionService.createSession(sessionData);
      await sessionService.startSession(session.sessionId);

      // Try to go back from first question (should fail)
      await expect(
        sessionService.navigateToQuestion(session.sessionId, { direction: 'PREVIOUS' })
      ).rejects.toThrow('Back navigation not allowed');

      // Navigate to end
      await sessionService.navigateToQuestion(session.sessionId, { direction: 'NEXT' });
      await sessionService.navigateToQuestion(session.sessionId, { direction: 'NEXT' });

      // Try to go beyond last question
      await expect(
        sessionService.navigateToQuestion(session.sessionId, { direction: 'NEXT' })
      ).rejects.toThrow('Invalid question index');

      // Cleanup
      await sessionService.completeSession(session.sessionId);
    });
  });

  describe('Session Performance and Scalability', () => {
    it('should handle multiple concurrent sessions', async () => {
      const sessionPromises = [];

      // Create 5 concurrent sessions
      for (let i = 0; i < 5; i++) {
        const sessionData = {
          assessmentId: testAssessmentId,
          candidateId: `concurrent-candidate-${i}`,
          configuration: { timeLimit: 3600 }
        };

        // Create concurrent user for testing
        await prisma.user.upsert({
          where: { id: `concurrent-candidate-${i}` },
          update: {},
          create: {
            id: `concurrent-candidate-${i}`,
            email: `concurrent${i}@example.com`,
            firstName: 'Concurrent',
            lastName: `User${i}`,
            role: 'CANDIDATE',
            organizationId: 'func-test-org-123',
            passwordHash: 'hashed-password'
          }
        });

        sessionPromises.push(sessionService.createSession(sessionData));
      }

      // Wait for all sessions to be created
      const sessions = await Promise.all(sessionPromises);

      expect(sessions).toHaveLength(5);
      sessions.forEach(session => {
        expect(session).toHaveProperty('sessionId');
        expect(session.status).toBe('INVITED');
      });

      // Cleanup concurrent sessions
      for (const session of sessions) {
        await sessionService.completeSession(session.sessionId);
      }

      // Cleanup concurrent users
      await prisma.user.deleteMany({
        where: { id: { contains: 'concurrent-candidate-' } }
      });
    });

    it('should efficiently handle large answer submissions', async () => {
      const sessionData = {
        assessmentId: testAssessmentId,
        candidateId: testCandidateId
      };

      const session = await sessionService.createSession(sessionData);
      await sessionService.startSession(session.sessionId);

      // Submit large answer content
      const largeAnswer = {
        questionId: 'func-q1',
        answer: {
          code: 'function largeFunction() {\n' + '  console.log("test");\n'.repeat(1000) + '}'
        },
        timeSpent: 600
      };

      const startTime = Date.now();
      const submission = await sessionService.submitAnswer(session.sessionId, largeAnswer);
      const endTime = Date.now();

      expect(submission).toHaveProperty('submissionId');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      // Cleanup
      await sessionService.completeSession(session.sessionId);
    });
  });
});
