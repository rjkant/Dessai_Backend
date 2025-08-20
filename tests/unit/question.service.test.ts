/**
 * Question Service Unit Tests
 * TASK-CG-006: Question Management System Testing
 * Persona: Quality Assurance Engineer
 * 
 * Comprehensive unit test suite for QuestionService covering all methods,
 * error conditions, and edge cases with organization access control.
 */

import { PrismaClient } from '@prisma/client';
import { QuestionService } from '../../src/services/question.service';
import {
  QuestionType,
  QuestionDifficulty,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionSearchCriteria,
  BulkQuestionOperation,
} from '../../src/types/question.types';

// Mock Prisma Client
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

describe('QuestionService', () => {
  let questionService: QuestionService;
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-123';
  const mockQuestionId = 'question-123';

  beforeEach(() => {
    questionService = new QuestionService(mockPrisma);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await mockPrisma.$disconnect();
  });

  describe('createQuestion', () => {
    const mockCodingQuestionRequest: CreateQuestionRequest = {
      title: 'Test Coding Question',
      description: 'Test description',
      type: QuestionType.CODING,
      difficulty: QuestionDifficulty.MEDIUM,
      tags: ['javascript', 'algorithms'],
      content: {
        problemStatement: 'Solve this problem',
        constraints: ['1 <= n <= 1000'],
        examples: [
          {
            input: 'n = 5',
            output: '120',
            explanation: 'Factorial of 5'
          }
        ],
        testCases: [
          {
            input: 'n = 5',
            expectedOutput: '120',
            isHidden: false,
            points: 10
          }
        ],
        starterCode: {
          javascript: 'function solve(n) { }',
          python: 'def solve(n): pass',
          java: 'public int solve(int n) { }'
        },
        allowedLanguages: ['javascript', 'python', 'java'],
        timeLimit: 1000,
        memoryLimit: 256
      }
    };

    it('should create coding question successfully', async () => {
      const mockCreatedQuestion = {
        id: mockQuestionId,
        title: mockCodingQuestionRequest.title,
        description: mockCodingQuestionRequest.description,
        type: mockCodingQuestionRequest.type,
        difficulty: mockCodingQuestionRequest.difficulty,
        tags: mockCodingQuestionRequest.tags,
        content: mockCodingQuestionRequest.content,
        metadata: JSON.stringify({
          createdBy: mockUserId,
          organizationId: mockOrganizationId,
          version: 1,
          createdAt: expect.any(String)
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

      const result = await questionService.createQuestion(
        mockCodingQuestionRequest,
        mockOrganizationId,
        mockUserId
      );

      expect(result.id).toBe(mockQuestionId);
      expect(result.title).toBe(mockCodingQuestionRequest.title);
      expect(result.type).toBe(QuestionType.CODING);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        ...mockCodingQuestionRequest,
        title: '' // Empty title should fail
      };

      // The service should validate before reaching Prisma
      await expect(
        questionService.createQuestion(invalidRequest, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Title must be at least 3 characters long');
    });

    it('should create MCQ question successfully', async () => {
      const mcqRequest: CreateQuestionRequest = {
        title: 'Test MCQ Question',
        description: 'Test MCQ description',
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
        ...mcqRequest,
        metadata: JSON.stringify({
          createdBy: mockUserId,
          organizationId: mockOrganizationId,
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

      const result = await questionService.createQuestion(
        mcqRequest,
        mockOrganizationId,
        mockUserId
      );

      expect(result.id).toBe('mcq-123');
      expect(result.type).toBe(QuestionType.MULTIPLE_CHOICE);
    });
  });

  describe('getQuestionById', () => {
    const mockQuestion = {
      id: mockQuestionId,
      title: 'Test Question',
      description: 'Test description',
      type: QuestionType.CODING,
      difficulty: QuestionDifficulty.MEDIUM,
      tags: ['test'],
      content: { problemStatement: 'Test problem' },
      metadata: JSON.stringify({
        organizationId: mockOrganizationId,
        createdBy: mockUserId,
        version: 1
      }),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      assessments: []
    };

    it('should retrieve question successfully', async () => {
      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(mockQuestion);

      const result = await questionService.getQuestionById(
        mockQuestionId,
        mockOrganizationId,
        false
      );

      expect(result.id).toBe(mockQuestionId);
      expect(result.title).toBe('Test Question');
    });

    it('should throw error for non-existent question', async () => {
      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        questionService.getQuestionById(mockQuestionId, mockOrganizationId, false)
      ).rejects.toThrow('Question not found');
    });

    it('should throw error for unauthorized access', async () => {
      const unauthorizedQuestion = {
        ...mockQuestion,
        metadata: JSON.stringify({
          organizationId: 'different-org',
          createdBy: mockUserId,
          version: 1
        })
      };

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(unauthorizedQuestion);

      await expect(
        questionService.getQuestionById(mockQuestionId, mockOrganizationId, false)
      ).rejects.toThrow('Question not found or access denied');
    });

    it('should allow access to public questions', async () => {
      const publicQuestion = {
        ...mockQuestion,
        metadata: JSON.stringify({
          organizationId: 'different-org',
          createdBy: mockUserId,
          version: 1,
          isPublic: true
        })
      };

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(publicQuestion);

      const result = await questionService.getQuestionById(
        mockQuestionId,
        mockOrganizationId,
        false
      );

      expect(result.id).toBe(mockQuestionId);
    });
  });

  describe('updateQuestion', () => {
    const mockExistingQuestion = {
      id: mockQuestionId,
      title: 'Original Title',
      metadata: JSON.stringify({
        organizationId: mockOrganizationId,
        createdBy: mockUserId,
        version: 1
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should update question successfully', async () => {
      const updateRequest: UpdateQuestionRequest = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const mockUpdatedQuestion = {
        ...mockExistingQuestion,
        ...updateRequest,
        metadata: JSON.stringify({
          organizationId: mockOrganizationId,
          createdBy: mockUserId,
          version: 2,
          lastModifiedBy: mockUserId,
          lastModifiedAt: expect.any(String)
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

      const result = await questionService.updateQuestion(
        mockQuestionId,
        updateRequest,
        mockOrganizationId,
        mockUserId
      );

      expect(result.title).toBe('Updated Title');
    });

    it('should validate title length on update', async () => {
      const updateRequest: UpdateQuestionRequest = {
        title: 'ab' // Too short
      };

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(mockExistingQuestion);

      await expect(
        questionService.updateQuestion(
          mockQuestionId,
          updateRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Title must be at least 3 characters long');
    });
  });

  describe('deleteQuestion', () => {
    const mockQuestion = {
      id: mockQuestionId,
      metadata: JSON.stringify({
        organizationId: mockOrganizationId,
        createdBy: mockUserId
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

      await expect(
        questionService.deleteQuestion(mockQuestionId, mockOrganizationId, false)
      ).resolves.not.toThrow();
    });

    it('should prevent deletion of questions used in active assessments', async () => {
      const questionWithActiveAssessments = {
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

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(questionWithActiveAssessments);

      await expect(
        questionService.deleteQuestion(mockQuestionId, mockOrganizationId, false)
      ).rejects.toThrow('Cannot delete question: used in 1 active assessments');
    });

    it('should allow forced deletion', async () => {
      const questionWithActiveAssessments = {
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

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(questionWithActiveAssessments);
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

      await expect(
        questionService.deleteQuestion(mockQuestionId, mockOrganizationId, true)
      ).resolves.not.toThrow();
    });
  });

  describe('searchQuestions', () => {
    const mockQuestions = [
      {
        id: 'q1',
        title: 'JavaScript Arrays',
        type: QuestionType.CODING,
        difficulty: QuestionDifficulty.EASY,
        tags: ['javascript', 'arrays'],
        metadata: JSON.stringify({
          organizationId: mockOrganizationId,
          createdBy: mockUserId
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
          organizationId: mockOrganizationId,
          createdBy: 'other-user'
        }),
        isActive: true,
        createdAt: new Date(),
        assessments: []
      }
    ];

    it('should search questions with filters', async () => {
      const searchCriteria: QuestionSearchCriteria = {
        query: 'JavaScript',
        type: [QuestionType.CODING],
        difficulty: [QuestionDifficulty.EASY],
        tags: ['javascript'],
        page: 1,
        limit: 10
      };

      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const result = await questionService.searchQuestions(
        searchCriteria,
        mockOrganizationId
      );

      expect(result.questions).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by creator', async () => {
      const searchCriteria: QuestionSearchCriteria = {
        createdBy: mockUserId,
        page: 1,
        limit: 10
      };

      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const result = await questionService.searchQuestions(
        searchCriteria,
        mockOrganizationId
      );

      // Should only return questions created by mockUserId
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].id).toBe('q1');
    });

    it('should handle pagination correctly', async () => {
      const searchCriteria: QuestionSearchCriteria = {
        page: 2,
        limit: 1
      };

      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const result = await questionService.searchQuestions(
        searchCriteria,
        mockOrganizationId
      );

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.totalPages).toBe(2);
    });
  });

  describe('bulkOperation', () => {
    const mockQuestions = [
      {
        id: 'q1',
        metadata: JSON.stringify({ organizationId: mockOrganizationId })
      },
      {
        id: 'q2',
        metadata: JSON.stringify({ organizationId: mockOrganizationId })
      }
    ];

    it('should perform ARCHIVE operation successfully', async () => {
      const bulkOperation: BulkQuestionOperation = {
        action: 'ARCHIVE',
        questionIds: ['q1', 'q2'],
        data: { tags: ['archived'] }
      };

      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      // Mock the processBulkAction method calls
      jest.spyOn(questionService as any, 'processBulkAction').mockResolvedValue(undefined);

      const result = await questionService.bulkOperation(
        bulkOperation,
        mockOrganizationId,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should handle unauthorized questions in bulk operation', async () => {
      const bulkOperation: BulkQuestionOperation = {
        action: 'ARCHIVE',
        questionIds: ['q1', 'q2', 'unauthorized-q'],
        data: { tags: ['archived'] }
      };

      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      jest.spyOn(questionService as any, 'processBulkAction').mockResolvedValue(undefined);

      const result = await questionService.bulkOperation(
        bulkOperation,
        mockOrganizationId,
        mockUserId
      );

      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].questionId).toBe('unauthorized-q');
    });
  });

  describe('getQuestionAnalytics', () => {
    const mockQuestion = {
      id: mockQuestionId,
      title: 'Test Question',
      type: QuestionType.CODING,
      difficulty: QuestionDifficulty.MEDIUM,
      metadata: JSON.stringify({
        organizationId: mockOrganizationId,
        createdBy: mockUserId
      })
    };

    it('should generate basic analytics', async () => {
      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(mockQuestion);

      const result = await questionService.getQuestionAnalytics(
        mockQuestionId,
        mockOrganizationId
      );

      expect(result.questionId).toBe(mockQuestionId);
      expect(result.title).toBe('Test Question');
      expect(result.type).toBe(QuestionType.CODING);
      expect(result.difficulty).toBe(QuestionDifficulty.MEDIUM);
      expect(result.totalAttempts).toBe(0);
      expect(result.successfulAttempts).toBe(0);
    });

    it('should throw error for unauthorized analytics access', async () => {
      const unauthorizedQuestion = {
        ...mockQuestion,
        metadata: JSON.stringify({
          organizationId: 'different-org',
          createdBy: mockUserId
        })
      };

      (mockPrisma.question.findFirst as jest.Mock).mockResolvedValue(unauthorizedQuestion);

      await expect(
        questionService.getQuestionAnalytics(mockQuestionId, mockOrganizationId)
      ).rejects.toThrow('Question not found or access denied');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      (mockPrisma.question.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        questionService.getQuestionById(mockQuestionId, mockOrganizationId, false)
      ).rejects.toThrow('Failed to get question');
    });

    it('should handle transaction failures', async () => {
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(
        new Error('Transaction failed')
      );

      await expect(
        questionService.createQuestion(
          {} as CreateQuestionRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Failed to create question');
    });
  });
});
