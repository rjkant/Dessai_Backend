/**
 * Assessment Service Tests
 * TASK-CG-005: Assessment Management Core
 * Persona: Quality Assurance Engineer
 * 
 * Comprehensive test suite for Assessment Management Core functionality
 * including CRUD operations, lifecycle management, and error handling.
 */

import { describe, beforeAll, beforeEach, it, expect, jest } from '@jest/globals';
import { PrismaClient, AssessmentStatus, AssessmentType } from '@prisma/client';
import { AssessmentService } from '../../src/services/assessment.service';
import {
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentError
} from '../../src/types/assessment.types';

// Mock PrismaClient
const mockPrisma = {
  assessment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  assessmentQuestion: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  assessmentParticipation: {
    count: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  organizationMembership: {
    findFirst: jest.fn(),
  },
  question: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

describe('AssessmentService', () => {
  let assessmentService: AssessmentService;
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-123';
  const mockAssessmentId = 'assessment-123';

  beforeAll(() => {
    assessmentService = new AssessmentService(mockPrisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // ASSESSMENT CREATION TESTS
  // ============================================================================

  describe('createAssessment', () => {
    const mockCreateRequest: CreateAssessmentRequest = {
      title: 'Test Assessment',
      description: 'Test Description',
      type: AssessmentType.CODING,
      timeLimit: 120,
      settings: {
        allowRetakes: false,
        maxAttempts: 1,
        shuffleQuestions: true,
        showResults: false,
        timeWarningAt: 10,
        autoSubmit: true,
        proctoring: {
          enabled: false,
          videoRequired: false,
          audioRequired: false,
          screenRecording: false,
          tabSwitchDetection: false,
          faceDetection: false,
        },
        collaboration: {
          enabled: false,
          maxParticipants: 1,
          allowChat: false,
          allowScreenShare: false,
        },
        accessControl: {
          ipWhitelist: [],
          requireSecureBrowser: false,
          blockCopyPaste: false,
        },
      },
    };

    it('should create assessment successfully', async () => {
      // Arrange
      const mockAssessment = {
        id: mockAssessmentId,
        title: 'Test Assessment',
        organizationId: mockOrganizationId,
        createdBy: mockUserId,
        status: AssessmentStatus.DRAFT,
        ...mockCreateRequest,
      };

      (mockPrisma.organizationMembership.findFirst as jest.Mock).mockResolvedValue({
        id: 'membership-123',
        organizationId: mockOrganizationId,
        userId: mockUserId,
        isActive: true,
      });

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });

      (mockPrisma.assessment.create as jest.Mock).mockResolvedValue(mockAssessment);

      // Act
      const result = await assessmentService.createAssessment(
        mockCreateRequest,
        mockOrganizationId
      );

      // Assert
      expect(result).toEqual(mockAssessment);
      expect(mockPrisma.organizationMembership.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          userId: mockUserId,
          isActive: true,
        },
      });
      expect(mockPrisma.assessment.create).toHaveBeenCalled();
    });

    it('should throw error if user does not have organization access', async () => {
      // Arrange
      (mockPrisma.organizationMembership.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        assessmentService.createAssessment(mockCreateRequest, mockOrganizationId)
      ).rejects.toThrow(AssessmentError);
    });

    it('should add questions if provided', async () => {
      // Arrange
      const requestWithQuestions = {
        ...mockCreateRequest,
        questionIds: ['question-1', 'question-2'],
      };

      const mockAssessment = {
        id: mockAssessmentId,
        title: 'Test Assessment',
        ...requestWithQuestions,
      };

      (mockPrisma.organizationMembership.findFirst as jest.Mock).mockResolvedValue({
        id: 'membership-123',
      });

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });

      (mockPrisma.assessment.create as jest.Mock).mockResolvedValue(mockAssessment);
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue([
        { id: 'question-1', organizationId: mockOrganizationId, isActive: true },
        { id: 'question-2', organizationId: mockOrganizationId, isActive: true },
      ]);
      (mockPrisma.assessmentQuestion.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.assessmentQuestion.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      // Act
      const result = await assessmentService.createAssessment(
        requestWithQuestions,
        mockOrganizationId,
        mockUserId
      );

      // Assert
      expect(result).toEqual(mockAssessment);
      expect(mockPrisma.assessmentQuestion.createMany).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ASSESSMENT RETRIEVAL TESTS
  // ============================================================================

  describe('getAssessment', () => {
    it('should return assessment without details', async () => {
      // Arrange
      const mockAssessment = {
        id: mockAssessmentId,
        title: 'Test Assessment',
        organizationId: mockOrganizationId,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(mockAssessment);

      // Act
      const result = await assessmentService.getAssessment(mockAssessmentId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockAssessment);
      expect(mockPrisma.assessment.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAssessmentId,
          organizationId: mockOrganizationId,
        },
        include: undefined,
      });
    });

    it('should return assessment with details', async () => {
      // Arrange
      const mockAssessmentWithDetails = {
        id: mockAssessmentId,
        title: 'Test Assessment',
        organizationId: mockOrganizationId,
        organization: { id: mockOrganizationId, name: 'Test Org', slug: 'test-org' },
        questions: [],
        participations: [],
        _count: { participations: 0, questions: 0 },
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(mockAssessmentWithDetails);

      // Act
      const result = await assessmentService.getAssessmentById(mockAssessmentId, true, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockAssessmentWithDetails);
      expect(mockPrisma.assessment.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAssessmentId,
          organizationId: mockOrganizationId,
        },
        include: expect.objectContaining({
          organization: expect.any(Object),
          questions: expect.any(Object),
          participations: expect.any(Object),
          _count: expect.any(Object),
        }),
      });
    });

    it('should return null if assessment not found', async () => {
      // Arrange
      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await assessmentService.getAssessmentById(mockAssessmentId, false, mockOrganizationId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // ASSESSMENT UPDATE TESTS
  // ============================================================================

  describe('updateAssessment', () => {
    const mockUpdateRequest: UpdateAssessmentRequest = {
      title: 'Updated Assessment',
      description: 'Updated Description',
    };

    it('should update assessment successfully', async () => {
      // Arrange
      const existingAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.DRAFT,
        settings: {},
        startsAt: null,
        endsAt: null,
        scheduledAt: null,
      };

      const updatedAssessment = {
        ...existingAssessment,
        ...mockUpdateRequest,
        updatedAt: new Date(),
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(existingAssessment);
      (mockPrisma.assessment.update as jest.Mock).mockResolvedValue(updatedAssessment);

      // Act
      const result = await assessmentService.updateAssessment(
        mockAssessmentId,
        mockUpdateRequest,
        mockOrganizationId,
        mockUserId
      );

      // Assert
      expect(result).toEqual(updatedAssessment);
      expect(mockPrisma.assessment.update).toHaveBeenCalledWith({
        where: { id: mockAssessmentId },
        data: expect.objectContaining({
          ...mockUpdateRequest,
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error if assessment not found', async () => {
      // Arrange
      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        assessmentService.updateAssessment(
          mockAssessmentId,
          mockUpdateRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow(AssessmentError);
    });

    it('should throw error if assessment is not modifiable', async () => {
      // Arrange
      const existingAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.ACTIVE,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(existingAssessment);

      // Act & Assert
      await expect(
        assessmentService.updateAssessment(
          mockAssessmentId,
          mockUpdateRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow(AssessmentError);
    });
  });

  // ============================================================================
  // ASSESSMENT DELETION TESTS
  // ============================================================================

  describe('deleteAssessment', () => {
    it('should delete assessment successfully', async () => {
      // Arrange
      const existingAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.DRAFT,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(existingAssessment);
      (mockPrisma.assessmentParticipation.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      (mockPrisma.assessmentQuestion.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.assessment.delete as jest.Mock).mockResolvedValue(existingAssessment);

      // Act
      await assessmentService.deleteAssessment(mockAssessmentId, mockOrganizationId, mockUserId);

      // Assert
      expect(mockPrisma.assessment.delete).toHaveBeenCalledWith({
        where: { id: mockAssessmentId },
      });
    });

    it('should throw error if assessment is active', async () => {
      // Arrange
      const existingAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.ACTIVE,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(existingAssessment);

      // Act & Assert
      await expect(
        assessmentService.deleteAssessment(mockAssessmentId, mockOrganizationId, mockUserId)
      ).rejects.toThrow(AssessmentError);
    });

    it('should throw error if assessment has participations', async () => {
      // Arrange
      const existingAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.DRAFT,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(existingAssessment);
      (mockPrisma.assessmentParticipation.count as jest.Mock).mockResolvedValue(1);

      // Act & Assert
      await expect(
        assessmentService.deleteAssessment(mockAssessmentId, mockOrganizationId, mockUserId)
      ).rejects.toThrow(AssessmentError);
    });
  });

  // ============================================================================
  // ASSESSMENT SEARCH TESTS
  // ============================================================================

  describe('searchAssessments', () => {
    it('should search assessments with pagination', async () => {
      // Arrange
      const searchCriteria = {
        query: 'Test',
        pagination: { page: 1, pageSize: 10 },
      };

      const mockAssessments = [
        { id: 'assessment-1', title: 'Test Assessment 1' },
        { id: 'assessment-2', title: 'Test Assessment 2' },
      ];

      (mockPrisma.assessment.findMany as jest.Mock).mockResolvedValue(mockAssessments);
      (mockPrisma.assessment.count as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await assessmentService.searchAssessments(searchCriteria, mockOrganizationId);

      // Assert
      expect(result.items).toEqual(mockAssessments);
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
    });
  });

  // ============================================================================
  // QUESTION MANAGEMENT TESTS
  // ============================================================================

  describe('addQuestionsToAssessment', () => {
    const questionIds = ['question-1', 'question-2'];

    it('should add questions to assessment successfully', async () => {
      // Arrange
      const existingAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.DRAFT,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(existingAssessment);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      (mockPrisma.question.findMany as jest.Mock).mockResolvedValue([
        { id: 'question-1', organizationId: mockOrganizationId, isActive: true },
        { id: 'question-2', organizationId: mockOrganizationId, isActive: true },
      ]);
      (mockPrisma.assessmentQuestion.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.assessmentQuestion.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      // Act
      await assessmentService.addQuestionsToAssessment(
        mockAssessmentId,
        questionIds,
        mockOrganizationId,
        mockUserId
      );

      // Assert
      expect(mockPrisma.assessmentQuestion.createMany).toHaveBeenCalled();
    });

    it('should throw error if assessment is not modifiable', async () => {
      // Arrange
      const existingAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.ACTIVE,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(existingAssessment);

      // Act & Assert
      await expect(
        assessmentService.addQuestionsToAssessment(
          mockAssessmentId,
          questionIds,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow(AssessmentError);
    });
  });

  // ============================================================================
  // ASSESSMENT LIFECYCLE TESTS
  // ============================================================================

  describe('publishAssessment', () => {
    it('should publish assessment successfully', async () => {
      // Arrange
      const draftAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.DRAFT,
        questions: [{ id: 'q1' }],
        title: 'Test Assessment',
        scheduledAt: null,
      };

      const publishedAssessment = {
        ...draftAssessment,
        status: AssessmentStatus.ACTIVE,
        publishedAt: new Date(),
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(draftAssessment);
      (mockPrisma.assessment.update as jest.Mock).mockResolvedValue(publishedAssessment);

      // Act
      const result = await assessmentService.publishAssessment(
        mockAssessmentId,
        mockOrganizationId,
        mockUserId
      );

      // Assert
      expect(result.status).toBe(AssessmentStatus.ACTIVE);
      expect(mockPrisma.assessment.update).toHaveBeenCalledWith({
        where: { id: mockAssessmentId },
        data: expect.objectContaining({
          status: AssessmentStatus.ACTIVE,
          publishedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error if assessment is not in draft status', async () => {
      // Arrange
      const existingAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.ACTIVE,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(existingAssessment);

      // Act & Assert
      await expect(
        assessmentService.publishAssessment(mockAssessmentId, mockOrganizationId, mockUserId)
      ).rejects.toThrow(AssessmentError);
    });
  });

  // ============================================================================
  // ASSESSMENT PARTICIPATION TESTS
  // ============================================================================

  describe('startAssessment', () => {
    const startRequest = {
      assessmentId: mockAssessmentId,
      candidateId: 'candidate-123',
    };

    it('should start assessment successfully', async () => {
      // Arrange
      const activeAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.ACTIVE,
        timeLimit: 120,
        questions: [
          { questionId: 'q1' },
          { questionId: 'q2' },
        ],
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(activeAssessment);
      (mockPrisma.assessmentParticipation.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assessmentParticipation.upsert as jest.Mock).mockResolvedValue({
        id: 'participation-123',
        startedAt: new Date(),
        status: 'IN_PROGRESS',
      });

      // Act
      const result = await assessmentService.startAssessment(startRequest, mockOrganizationId);

      // Assert
      expect(result.assessmentId).toBe(mockAssessmentId);
      expect(result.candidateId).toBe('candidate-123');
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.progress.totalQuestions).toBe(2);
    });

    it('should throw error if assessment is not active', async () => {
      // Arrange
      const draftAssessment = {
        id: mockAssessmentId,
        status: AssessmentStatus.DRAFT,
      };

      (mockPrisma.assessment.findFirst as jest.Mock).mockResolvedValue(draftAssessment);

      // Act & Assert
      await expect(
        assessmentService.startAssessment(startRequest, mockOrganizationId)
      ).rejects.toThrow(AssessmentError);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      (mockPrisma.assessment.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        assessmentService.getAssessmentById(mockAssessmentId, false, mockOrganizationId)
      ).rejects.toThrow(AssessmentError);
    });

    it('should validate time constraints', async () => {
      // Arrange
      const invalidRequest: CreateAssessmentRequest = {
        title: 'Test Assessment',
        type: AssessmentType.CODING,
        startsAt: new Date('2023-01-01'),
        endsAt: new Date('2022-12-31'), // End before start
        settings: {
          allowRetakes: false,
          maxAttempts: 1,
          shuffleQuestions: false,
          showResults: false,
          timeWarningAt: 10,
          autoSubmit: true,
          proctoring: {
            enabled: false,
            videoRequired: false,
            audioRequired: false,
            screenRecording: false,
            tabSwitchDetection: false,
            faceDetection: false,
          },
          collaboration: {
            enabled: false,
            maxParticipants: 1,
            allowChat: false,
            allowScreenShare: false,
          },
          accessControl: {
            ipWhitelist: [],
            requireSecureBrowser: false,
            blockCopyPaste: false,
          },
        },
      };

      (mockPrisma.organizationMembership.findFirst as jest.Mock).mockResolvedValue({
        id: 'membership-123',
      });

      // Act & Assert
      await expect(
        assessmentService.createAssessment(invalidRequest, mockOrganizationId)
      ).rejects.toThrow(AssessmentError);
    });
  });
});

export { AssessmentService };
