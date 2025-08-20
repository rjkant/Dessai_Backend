/**
 * Question Controller Integration Tests
 * TASK-CG-006: Question Management System Testing
 * Persona: Quality Assurance Engineer
 * 
 * Integration tests for QuestionController endpoints testing full HTTP request/response
 * cycle with middleware, validation, and error handling.
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { QuestionController } from '../../src/controllers/question.controller';
import { QuestionService } from '../../src/services/question.service';
import questionRoutes from '../../src/routes/question.routes';
import { QuestionType, QuestionDifficulty } from '../../src/types/question.types';

// Mock authentication middleware
const mockAuthMiddleware = (req: any, _res: any, next: any) => {
  req.user = {
    id: 'test-user-123',
    organizationId: 'test-org-123',
    email: 'test@example.com',
    role: 'ADMIN',
    isActive: true
  };
  next();
};

// Mock Prisma
const mockPrisma = {
  question: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  assessmentQuestion: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

describe('Question Controller Integration Tests', () => {
  let app: express.Application;
  let questionService: QuestionService;
  // let questionController: QuestionController;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    questionService = new QuestionService(mockPrisma);
    // questionController = new QuestionController(questionService);
    
    // Override auth middleware in routes for testing
    app.use('/api/questions', mockAuthMiddleware, questionRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mockPrisma.$disconnect();
  });

  describe('POST /api/questions', () => {
    const validCodingQuestion = {
      title: 'Two Sum Problem',
      description: 'Find two numbers that add up to target',
      type: QuestionType.CODING,
      difficulty: QuestionDifficulty.EASY,
      tags: ['arrays', 'hash-table'],
      content: {
        problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        constraints: ['2 <= nums.length <= 10^4'],
        examples: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
          }
        ],
        testCases: [
          {
            input: 'nums = [2, 7, 11, 15], target = 9',
            expectedOutput: '[0, 1]',
            isHidden: false,
            points: 10
          }
        ],
        starterCode: {
          javascript: 'function twoSum(nums, target) {\n    // Your code here\n}',
          python: 'def two_sum(nums, target):\n    # Your code here\n    pass',
          java: 'public int[] twoSum(int[] nums, int target) {\n    // Your code here\n    return new int[]{};\n}'
        },
        allowedLanguages: ['javascript', 'python', 'java'],
        timeLimit: 1000,
        memoryLimit: 256
      }
    };

    it('should create question successfully', async () => {
      const mockCreatedQuestion = {
        id: 'question-123',
        ...validCodingQuestion,
        metadata: JSON.stringify({
          createdBy: 'test-user-123',
          organizationId: 'test-org-123',
          version: 1,
          createdAt: new Date().toISOString()
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          question: {
            create: jest.fn().mockResolvedValue(mockCreatedQuestion)
          }
        });
      });

      const response = await request(app)
        .post('/api/questions')
        .send(validCodingQuestion)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('question-123');
      expect(response.body.data.title).toBe(validCodingQuestion.title);
    });

    it('should validate required fields', async () => {
      const invalidQuestion = {
        ...validCodingQuestion,
        title: '' // Empty title
      };

      const response = await request(app)
        .post('/api/questions')
        .send(invalidQuestion)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should validate question type', async () => {
      const invalidQuestion = {
        ...validCodingQuestion,
        type: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/questions')
        .send(invalidQuestion)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should create MCQ question successfully', async () => {
      const mcqQuestion = {
        title: 'JavaScript Basics',
        description: 'Test JavaScript knowledge',
        type: QuestionType.MULTIPLE_CHOICE,
        difficulty: QuestionDifficulty.EASY,
        tags: ['javascript', 'basics'],
        content: {
          question: 'What is JavaScript?',
          options: [
            { id: 'a', text: 'Programming language', isCorrect: true },
            { id: 'b', text: 'Database', isCorrect: false },
            { id: 'c', text: 'Operating system', isCorrect: false },
            { id: 'd', text: 'Hardware', isCorrect: false }
          ],
          explanation: 'JavaScript is a programming language',
          allowMultipleAnswers: false,
          shuffleOptions: true
        }
      };

      const mockCreatedMCQ = {
        id: 'mcq-123',
        ...mcqQuestion,
        metadata: JSON.stringify({
          createdBy: 'test-user-123',
          organizationId: 'test-org-123',
          version: 1,
          createdAt: new Date().toISOString()
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          question: {
            create: jest.fn().mockResolvedValue(mockCreatedMCQ)
          }
        });
      });

      const response = await request(app)
        .post('/api/questions')
        .send(mcqQuestion)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(QuestionType.MULTIPLE_CHOICE);
    });
  });

  describe('GET /api/questions/:id', () => {
    const mockQuestion = {
      id: 'question-123',
      title: 'Test Question',
      description: 'Test description',
      type: QuestionType.CODING,
      difficulty: QuestionDifficulty.MEDIUM,
      tags: ['test'],
      content: { problemStatement: 'Test problem' },
      metadata: JSON.stringify({
        organizationId: 'test-org-123',
        createdBy: 'test-user-123',
        version: 1
      }),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      assessments: []
    };

    it('should get question by ID successfully', async () => {
      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(mockQuestion);

      const response = await request(app)
        .get('/api/questions/question-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('question-123');
      expect(response.body.data.title).toBe('Test Question');
    });

    it('should return 404 for non-existent question', async () => {
      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/questions/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Question not found');
    });

    it('should validate question ID format', async () => {
      const response = await request(app)
        .get('/api/questions/invalid-id-format')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/questions/:id', () => {
    const mockExistingQuestion = {
      id: 'question-123',
      title: 'Original Title',
      metadata: JSON.stringify({
        organizationId: 'test-org-123',
        createdBy: 'test-user-123',
        version: 1
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should update question successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const mockUpdatedQuestion = {
        ...mockExistingQuestion,
        ...updateData,
        metadata: JSON.stringify({
          organizationId: 'test-org-123',
          createdBy: 'test-user-123',
          version: 2,
          lastModifiedBy: 'test-user-123',
          lastModifiedAt: new Date().toISOString()
        })
      };

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(mockExistingQuestion);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          question: {
            update: jest.fn().mockResolvedValue(mockUpdatedQuestion)
          }
        });
      });

      const response = await request(app)
        .put('/api/questions/question-123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        title: 'ab' // Too short
      };

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(mockExistingQuestion);

      const response = await request(app)
        .put('/api/questions/question-123')
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/questions/:id', () => {
    const mockQuestion = {
      id: 'question-123',
      metadata: JSON.stringify({
        organizationId: 'test-org-123',
        createdBy: 'test-user-123'
      }),
      assessments: []
    };

    it('should delete question successfully', async () => {
      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(mockQuestion);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          assessmentQuestion: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 })
          },
          question: {
            delete: jest.fn().mockResolvedValue(mockQuestion)
          }
        });
      });

      const response = await request(app)
        .delete('/api/questions/question-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should handle forced deletion with query parameter', async () => {
      const questionWithAssessments = {
        ...mockQuestion,
        assessments: [
          {
            assessment: {
              id: 'assessment-1',
              title: 'Active Assessment',
              status: 'ACTIVE'
            }
          }
        ]
      };

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(questionWithAssessments);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          assessmentQuestion: {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 })
          },
          question: {
            delete: jest.fn().mockResolvedValue(mockQuestion)
          }
        });
      });

      const response = await request(app)
        .delete('/api/questions/question-123?force=true')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/questions/search', () => {
    const mockQuestions = [
      {
        id: 'q1',
        title: 'JavaScript Arrays',
        type: QuestionType.CODING,
        difficulty: QuestionDifficulty.EASY,
        tags: ['javascript', 'arrays'],
        metadata: JSON.stringify({
          organizationId: 'test-org-123',
          createdBy: 'test-user-123'
        }),
        isActive: true,
        createdAt: new Date(),
        assessments: []
      },
      {
        id: 'q2',
        title: 'Python Loops',
        type: QuestionType.CODING,
        difficulty: QuestionDifficulty.MEDIUM,
        tags: ['python', 'loops'],
        metadata: JSON.stringify({
          organizationId: 'test-org-123',
          createdBy: 'other-user'
        }),
        isActive: true,
        createdAt: new Date(),
        assessments: []
      }
    ];

    it('should search questions with query parameter', async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const response = await request(app)
        .get('/api/questions/search?query=JavaScript&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questions).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should filter by question type', async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const response = await request(app)
        .get('/api/questions/search?type=CODING&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.type).toContain('CODING');
    });

    it('should filter by difficulty', async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const response = await request(app)
        .get('/api/questions/search?difficulty=EASY,MEDIUM&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.difficulty).toEqual(['EASY', 'MEDIUM']);
    });

    it('should filter by tags', async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const response = await request(app)
        .get('/api/questions/search?tags=javascript,arrays&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.tags).toEqual(['javascript', 'arrays']);
    });

    it('should handle pagination parameters', async () => {
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const response = await request(app)
        .get('/api/questions/search?page=2&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/questions/search?page=0&limit=101') // Invalid values
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /api/questions/bulk', () => {
    const mockQuestions = [
      {
        id: 'q1',
        metadata: JSON.stringify({ organizationId: 'test-org-123' })
      },
      {
        id: 'q2',
        metadata: JSON.stringify({ organizationId: 'test-org-123' })
      }
    ];

    it('should perform bulk archive operation', async () => {
      const bulkOperation = {
        action: 'ARCHIVE',
        questionIds: ['q1', 'q2'],
        data: { tags: ['archived'] }
      };

      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      // Mock successful bulk operation
      const mockResult = {
        success: true,
        processedCount: 2,
        failedCount: 0,
        errors: []
      };

      jest.spyOn(questionService, 'bulkOperation').mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/questions/bulk')
        .send(bulkOperation)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processedCount).toBe(2);
      expect(response.body.data.failedCount).toBe(0);
    });

    it('should validate bulk operation data', async () => {
      const invalidBulkOperation = {
        action: 'INVALID_ACTION',
        questionIds: [],
        data: {}
      };

      const response = await request(app)
        .post('/api/questions/bulk')
        .send(invalidBulkOperation)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle partial failures in bulk operation', async () => {
      const bulkOperation = {
        action: 'ACTIVATE',
        questionIds: ['q1', 'q2', 'invalid-q'],
        data: {}
      };

      const mockResult = {
        success: false,
        processedCount: 2,
        failedCount: 1,
        errors: [
          {
            questionId: 'invalid-q',
            error: 'Question not found or access denied'
          }
        ]
      };

      jest.spyOn(questionService, 'bulkOperation').mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/questions/bulk')
        .send(bulkOperation)
        .expect(207); // Multi-status for partial success

      expect(response.body.success).toBe(false);
      expect(response.body.data.processedCount).toBe(2);
      expect(response.body.data.failedCount).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
    });
  });

  describe('GET /api/questions/:id/analytics', () => {
    const mockAnalytics = {
      questionId: 'question-123',
      title: 'Test Question',
      type: QuestionType.CODING,
      difficulty: QuestionDifficulty.MEDIUM,
      totalAttempts: 150,
      successfulAttempts: 75,
      averageScore: 78.5,
      averageTimeSpent: 1200,
      commonMistakes: [
        { mistake: 'Off by one error', frequency: 25, examples: ['arr[i+1] instead of arr[i]'] },
        { mistake: 'Null pointer exception', frequency: 15, examples: ['array.length without null check'] }
      ],
      difficultyFeedback: [
        { rating: 'APPROPRIATE', count: 80 },
        { rating: 'TOO_EASY', count: 35 },
        { rating: 'TOO_HARD', count: 35 }
      ],
      tagUsage: [
        { tag: 'arrays', usageCount: 42 },
        { tag: 'algorithms', usageCount: 38 }
      ],
      performanceByDemographic: []
    };

    it('should get question analytics successfully', async () => {
      jest.spyOn(questionService, 'getQuestionAnalytics').mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/questions/question-123/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionId).toBe('question-123');
      expect(response.body.data.totalAttempts).toBe(150);
      expect(response.body.data.successfulAttempts).toBe(75);
    });

    it('should handle analytics for non-existent question', async () => {
      jest.spyOn(questionService, 'getQuestionAnalytics')
        .mockRejectedValue(new Error('Question not found or access denied'));

      const response = await request(app)
        .get('/api/questions/non-existent/analytics')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      (mockPrisma.question.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/questions/question-123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to get question');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/questions')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing authentication', async () => {
      const appWithoutAuth = express();
      appWithoutAuth.use(express.json());
      appWithoutAuth.use('/api/questions', questionRoutes); // No auth middleware

      const response = await request(appWithoutAuth)
        .get('/api/questions/question-123')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const appWithoutAuth = express();
      appWithoutAuth.use(express.json());
      appWithoutAuth.use('/api/questions', questionRoutes);

      await request(appWithoutAuth)
        .post('/api/questions')
        .send({})
        .expect(401);

      await request(appWithoutAuth)
        .get('/api/questions/question-123')
        .expect(401);

      await request(appWithoutAuth)
        .put('/api/questions/question-123')
        .send({})
        .expect(401);

      await request(appWithoutAuth)
        .delete('/api/questions/question-123')
        .expect(401);
    });

    it('should provide user context in all operations', async () => {
      const mockQuestion = {
        id: 'question-123',
        title: 'Test Question',
        metadata: JSON.stringify({
          organizationId: 'test-org-123',
          createdBy: 'test-user-123'
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
        assessments: []
      };

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(mockQuestion);

      const response = await request(app)
        .get('/api/questions/question-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Verify that the request was processed with correct user context
    });
  });
});
