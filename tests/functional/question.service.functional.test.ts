/**
 * Question Service Functional Tests
 * TASK-CG-006: Question Management System Testing
 * Persona: Quality Assurance Engineer
 * 
 * Functional tests that verify the actual behavior of the QuestionService
 * with a real database to ensure end-to-end functionality.
 */

import { PrismaClient } from '@prisma/client';
import { QuestionService } from '../../src/services/question.service';
import {
  QuestionType,
  QuestionDifficulty,
  CreateQuestionRequest,
  UpdateQuestionRequest
} from '../../src/types/question.types';

describe('QuestionService Functional Tests', () => {
  let prisma: PrismaClient;
  let questionService: QuestionService;
  const testOrganizationId = 'test-org-func-123';
  const testUserId = 'test-user-func-123';
  const createdQuestionIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    questionService = new QuestionService(prisma);
  });

  afterAll(async () => {
    // Clean up created questions
    if (createdQuestionIds.length > 0) {
      await prisma.question.deleteMany({
        where: {
          id: { in: createdQuestionIds }
        }
      });
    }
    await prisma.$disconnect();
  });

  describe('Question Creation and Validation', () => {
    it('should validate title length', async () => {
      const invalidRequest: CreateQuestionRequest = {
        title: 'ab', // Too short
        description: 'Test description',
        type: QuestionType.CODING,
        difficulty: QuestionDifficulty.EASY,
        tags: ['test'],
        content: {
          problemStatement: 'Test problem',
          constraints: ['n >= 1'],
          examples: [],
          testCases: [],
          starterCode: { javascript: 'function test() {}' },
          allowedLanguages: ['javascript'],
          timeLimit: 1000,
          memoryLimit: 256
        }
      };

      await expect(
        questionService.createQuestion(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Title must be at least 3 characters long');
    });

    it('should validate question type', async () => {
      const invalidRequest = {
        title: 'Valid Title',
        description: 'Test description',
        type: 'INVALID_TYPE' as any,
        difficulty: QuestionDifficulty.EASY,
        tags: ['test'],
        content: {
          problemStatement: 'Test',
          constraints: [],
          examples: [],
          testCases: [],
          starterCode: { javascript: 'test' },
          allowedLanguages: ['javascript'],
          timeLimit: 1000,
          memoryLimit: 256
        }
      };

      await expect(
        questionService.createQuestion(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Valid question type is required');
    });

    it('should validate difficulty level', async () => {
      const invalidRequest = {
        title: 'Valid Title',
        description: 'Test description',
        type: QuestionType.CODING,
        difficulty: 'INVALID_DIFFICULTY' as any,
        tags: ['test'],
        content: {
          problemStatement: 'Test',
          constraints: [],
          examples: [],
          testCases: [],
          starterCode: { javascript: 'test' },
          allowedLanguages: ['javascript'],
          timeLimit: 1000,
          memoryLimit: 256
        }
      };

      await expect(
        questionService.createQuestion(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Valid difficulty level is required');
    });
  });

  describe('CRUD Operations', () => {
    let testQuestionId: string;

    it('should create a coding question successfully', async () => {
      const codingRequest: CreateQuestionRequest = {
        title: 'Functional Test Question',
        description: 'A test question for functional testing',
        type: QuestionType.CODING,
        difficulty: QuestionDifficulty.MEDIUM,
        tags: ['javascript', 'testing'],
        content: {
          problemStatement: 'Write a function that returns the sum of two numbers.',
          constraints: ['Both numbers are integers', '-1000 <= num <= 1000'],
          examples: [
            {
              input: 'a = 5, b = 3',
              output: '8',
              explanation: '5 + 3 = 8'
            }
          ],
          testCases: [
            {
              input: 'a = 5, b = 3',
              expectedOutput: '8',
              isHidden: false,
              points: 10
            },
            {
              input: 'a = -1, b = 1',
              expectedOutput: '0',
              isHidden: true,
              points: 5
            }
          ],
          starterCode: {
            javascript: 'function sum(a, b) {\n    // Your code here\n}',
            python: 'def sum(a, b):\n    # Your code here\n    pass'
          },
          allowedLanguages: ['javascript', 'python'],
          timeLimit: 1000,
          memoryLimit: 128
        }
      };

      const result = await questionService.createQuestion(
        codingRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(codingRequest.title);
      expect(result.type).toBe(QuestionType.CODING);
      expect(result.difficulty).toBe(QuestionDifficulty.MEDIUM);
      expect(result.isActive).toBe(true);

      testQuestionId = result.id;
      createdQuestionIds.push(result.id);
    });

    it('should retrieve the created question', async () => {
      const result = await questionService.getQuestionById(
        testQuestionId,
        testOrganizationId,
        true
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(testQuestionId);
      expect(result.title).toBe('Functional Test Question');
      expect(result.type).toBe(QuestionType.CODING);
    });

    it('should update the question', async () => {
      const updateRequest: UpdateQuestionRequest = {
        title: 'Updated Functional Test Question',
        description: 'Updated description for testing',
        tags: ['javascript', 'testing', 'updated']
      };

      const result = await questionService.updateQuestion(
        testQuestionId,
        updateRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Functional Test Question');
      expect(result.description).toBe('Updated description for testing');
      expect(result.tags).toContain('updated');
    });

    it('should prevent unauthorized access', async () => {
      const unauthorizedOrgId = 'unauthorized-org-123';

      await expect(
        questionService.getQuestionById(testQuestionId, unauthorizedOrgId, false)
      ).rejects.toThrow('Question not found or access denied');
    });

    it('should delete the question', async () => {
      await expect(
        questionService.deleteQuestion(testQuestionId, testOrganizationId, false)
      ).resolves.not.toThrow();

      // Verify deletion
      await expect(
        questionService.getQuestionById(testQuestionId, testOrganizationId, false)
      ).rejects.toThrow('Question not found');

      // Remove from cleanup list since it's already deleted
      const index = createdQuestionIds.indexOf(testQuestionId);
      if (index > -1) {
        createdQuestionIds.splice(index, 1);
      }
    });
  });

  describe('Search Functionality', () => {
    const searchTestQuestions: string[] = [];

    beforeAll(async () => {
      // Create test questions for search
      const questions = [
        {
          title: 'Array Manipulation',
          type: QuestionType.CODING,
          difficulty: QuestionDifficulty.EASY,
          tags: ['arrays', 'javascript']
        },
        {
          title: 'String Processing',
          type: QuestionType.CODING,
          difficulty: QuestionDifficulty.MEDIUM,
          tags: ['strings', 'python']
        },
        {
          title: 'JavaScript Basics Quiz',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: QuestionDifficulty.EASY,
          tags: ['javascript', 'basics']
        }
      ];

      for (const q of questions) {
        const request: CreateQuestionRequest = {
          title: q.title,
          description: `Search test question: ${q.title}`,
          type: q.type,
          difficulty: q.difficulty,
          tags: q.tags,
          content: q.type === QuestionType.CODING ? {
            problemStatement: 'Test problem',
            constraints: [],
            examples: [],
            testCases: [],
            starterCode: { javascript: 'function test() {}' },
            allowedLanguages: ['javascript'],
            timeLimit: 1000,
            memoryLimit: 256
          } : {
            question: 'Test question?',
            options: [
              { id: 'a', text: 'Option A', isCorrect: true },
              { id: 'b', text: 'Option B', isCorrect: false }
            ],
            explanation: 'Test explanation',
            allowMultipleAnswers: false,
            shuffleOptions: false
          }
        };

        const result = await questionService.createQuestion(
          request,
          testOrganizationId,
          testUserId
        );
        searchTestQuestions.push(result.id);
        createdQuestionIds.push(result.id);
      }
    });

    it('should search questions by query', async () => {
      const results = await questionService.searchQuestions(
        {
          query: 'Array',
          page: 1,
          limit: 10
        },
        testOrganizationId
      );

      expect(results).toBeDefined();
      expect(results.questions.length).toBeGreaterThan(0);
      expect(results.questions.some(q => q.title.includes('Array'))).toBe(true);
      expect(results.pagination.total).toBeGreaterThan(0);
    });

    it('should filter by question type', async () => {
      const results = await questionService.searchQuestions(
        {
          type: [QuestionType.MULTIPLE_CHOICE],
          page: 1,
          limit: 10
        },
        testOrganizationId
      );

      expect(results.questions.every(q => q.type === QuestionType.MULTIPLE_CHOICE)).toBe(true);
    });

    it('should filter by difficulty', async () => {
      const results = await questionService.searchQuestions(
        {
          difficulty: [QuestionDifficulty.EASY],
          page: 1,
          limit: 10
        },
        testOrganizationId
      );

      expect(results.questions.every(q => q.difficulty === QuestionDifficulty.EASY)).toBe(true);
    });

    it('should filter by tags', async () => {
      const results = await questionService.searchQuestions(
        {
          tags: ['javascript'],
          page: 1,
          limit: 10
        },
        testOrganizationId
      );

      expect(results.questions.every(q => q.tags.includes('javascript'))).toBe(true);
    });

    it('should handle pagination', async () => {
      const page1 = await questionService.searchQuestions(
        {
          page: 1,
          limit: 1
        },
        testOrganizationId
      );

      const page2 = await questionService.searchQuestions(
        {
          page: 2,
          limit: 1
        },
        testOrganizationId
      );

      expect(page1.questions.length).toBe(1);
      expect(page2.questions.length).toBeGreaterThanOrEqual(0);
      expect(page1.pagination.page).toBe(1);
      expect(page2.pagination.page).toBe(2);
      
      if (page1.questions.length > 0 && page2.questions.length > 0) {
        expect(page1.questions[0].id).not.toBe(page2.questions[0].id);
      }
    });
  });

  describe('Bulk Operations', () => {
    const bulkTestQuestions: string[] = [];

    beforeAll(async () => {
      // Create questions for bulk testing
      for (let i = 1; i <= 3; i++) {
        const request: CreateQuestionRequest = {
          title: `Bulk Test Question ${i}`,
          description: `Bulk test question ${i}`,
          type: QuestionType.CODING,
          difficulty: QuestionDifficulty.EASY,
          tags: ['bulk-test'],
          content: {
            problemStatement: `Test problem ${i}`,
            constraints: [],
            examples: [],
            testCases: [],
            starterCode: { javascript: 'function test() {}' },
            allowedLanguages: ['javascript'],
            timeLimit: 1000,
            memoryLimit: 256
          }
        };

        const result = await questionService.createQuestion(
          request,
          testOrganizationId,
          testUserId
        );
        bulkTestQuestions.push(result.id);
        createdQuestionIds.push(result.id);
      }
    });

    it('should perform bulk archive operation', async () => {
      const result = await questionService.bulkOperation(
        {
          action: 'ARCHIVE',
          questionIds: bulkTestQuestions.slice(0, 2),
          data: { tags: ['archived'] }
        },
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should handle unauthorized questions in bulk operation', async () => {
      const result = await questionService.bulkOperation(
        {
          action: 'ACTIVATE',
          questionIds: [...bulkTestQuestions, 'non-existent-id'],
          data: {}
        },
        testOrganizationId,
        testUserId
      );

      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].questionId).toBe('non-existent-id');
    });
  });

  describe('Analytics', () => {
    let analyticsTestQuestionId: string;

    beforeAll(async () => {
      const request: CreateQuestionRequest = {
        title: 'Analytics Test Question',
        description: 'Question for analytics testing',
        type: QuestionType.CODING,
        difficulty: QuestionDifficulty.HARD,
        tags: ['analytics', 'test'],
        content: {
          problemStatement: 'Analytics test problem',
          constraints: [],
          examples: [],
          testCases: [],
          starterCode: { javascript: 'function test() {}' },
          allowedLanguages: ['javascript'],
          timeLimit: 1000,
          memoryLimit: 256
        }
      };

      const result = await questionService.createQuestion(
        request,
        testOrganizationId,
        testUserId
      );
      analyticsTestQuestionId = result.id;
      createdQuestionIds.push(result.id);
    });

    it('should generate basic analytics', async () => {
      const analytics = await questionService.getQuestionAnalytics(
        analyticsTestQuestionId,
        testOrganizationId
      );

      expect(analytics).toBeDefined();
      expect(analytics.questionId).toBe(analyticsTestQuestionId);
      expect(analytics.title).toBe('Analytics Test Question');
      expect(analytics.type).toBe(QuestionType.CODING);
      expect(analytics.difficulty).toBe(QuestionDifficulty.HARD);
      expect(typeof analytics.totalAttempts).toBe('number');
      expect(typeof analytics.successfulAttempts).toBe('number');
      expect(typeof analytics.averageScore).toBe('number');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle non-existent question access', async () => {
      await expect(
        questionService.getQuestionById('non-existent-id', testOrganizationId, false)
      ).rejects.toThrow('Question not found');
    });

    it('should prevent deletion of non-existent question', async () => {
      await expect(
        questionService.deleteQuestion('non-existent-id', testOrganizationId, false)
      ).rejects.toThrow('Question not found');
    });

    it('should handle analytics for non-existent question', async () => {
      await expect(
        questionService.getQuestionAnalytics('non-existent-id', testOrganizationId)
      ).rejects.toThrow('Question not found');
    });
  });
});

export {};
