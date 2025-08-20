/**
 * Question Service
 * TASK-CG-006: Question Management System
 * Persona: Senior Software Engineer
 * 
 * Core business logic for question management operations,
 * supporting CRUD operations, search, and basic analytics.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  QuestionType,
  QuestionDifficulty,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionResponse,
  QuestionListResponse,
  QuestionSearchCriteria,
  QuestionAnalytics,
  BulkQuestionOperation,
  BulkOperationResult,
  QuestionError,
  QuestionErrorCode,
} from '../types/question.types';

// ============================================================================
// QUESTION SERVICE CLASS
// ============================================================================

export class QuestionService {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================================================
  // CORE CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new question with basic validation
   */
  async createQuestion(
    data: CreateQuestionRequest,
    organizationId: string,
    userId: string
  ): Promise<QuestionResponse> {
    try {
      // Basic validation
      if (!data.title || data.title.trim().length < 3) {
        throw new Error('Title must be at least 3 characters long');
      }
      
      if (!data.type || !Object.values(QuestionType).includes(data.type)) {
        throw new Error('Valid question type is required');
      }
      
      if (!data.difficulty || !Object.values(QuestionDifficulty).includes(data.difficulty)) {
        throw new Error('Valid difficulty level is required');
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Create the question
        const question = await tx.question.create({
          data: {
            title: data.title.trim(),
            description: data.description?.trim() || '',
            type: data.type,
            difficulty: data.difficulty,
            tags: data.tags || [],
            content: data.content as any,
            metadata: JSON.stringify({
              createdBy: userId,
              organizationId,
              version: 1,
              createdAt: new Date().toISOString(),
            }),
            isActive: true,
          },
        });

        return question;
      });

      return this.formatQuestionResponse(result);
    } catch (error) {
      throw this.handleError('Failed to create question', error as Error, QuestionErrorCode.UNKNOWN_ERROR);
    }
  }

  /**
   * Get question by ID with access control
   */
  async getQuestionById(
    questionId: string,
    organizationId: string,
    includeTestCases: boolean = false
  ): Promise<QuestionResponse> {
    try {
      const question = await this.prisma.question.findFirst({
        where: {
          id: questionId,
        },
        include: {
          assessments: {
            select: {
              assessmentId: true,
              assessment: {
                select: {
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check access permissions
      const metadata = question.metadata ? JSON.parse(question.metadata as string) : {};
      if (metadata.organizationId !== organizationId && !metadata.isPublic) {
        throw new Error('Question not found or access denied');
      }

      const formattedQuestion = this.formatQuestionResponse(question);

      // Remove sensitive test case data if not requested
      if (!includeTestCases && question.type === QuestionType.CODING) {
        const content = formattedQuestion.content as any;
        if (content?.testCases) {
          content.testCases = content.testCases.filter((tc: any) => !tc.isHidden);
        }
      }

      return formattedQuestion;
    } catch (error) {
      throw this.handleError('Failed to get question', error as Error, QuestionErrorCode.UNKNOWN_ERROR);
    }
  }

  /**
   * Update question with basic validation
   */
  async updateQuestion(
    questionId: string,
    data: UpdateQuestionRequest,
    organizationId: string,
    userId: string
  ): Promise<QuestionResponse> {
    try {
      // Verify question ownership
      const existingQuestion = await this.prisma.question.findFirst({
        where: { id: questionId },
      });

      if (!existingQuestion) {
        throw new Error('Question not found');
      }

      // Check access permissions
      const metadata = existingQuestion.metadata ? JSON.parse(existingQuestion.metadata as string) : {};
      if (metadata.organizationId !== organizationId) {
        throw new Error('Question not found or access denied');
      }

      // Basic validation for updates
      if (data.title && data.title.trim().length < 3) {
        throw new Error('Title must be at least 3 characters long');
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const updateData: any = {};
        
        if (data.title) updateData.title = data.title.trim();
        if (data.description !== undefined) updateData.description = data.description.trim();
        if (data.type) updateData.type = data.type;
        if (data.difficulty) updateData.difficulty = data.difficulty;
        if (data.tags) updateData.tags = data.tags;
        if (data.content) updateData.content = data.content;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        // Update metadata
        const currentMetadata = existingQuestion.metadata ? JSON.parse(existingQuestion.metadata as string) : {};
        updateData.metadata = JSON.stringify({
          ...currentMetadata,
          ...data.metadata,
          lastModifiedBy: userId,
          lastModifiedAt: new Date().toISOString(),
          version: (currentMetadata.version || 1) + 1,
        });

        const updatedQuestion = await tx.question.update({
          where: { id: questionId },
          data: updateData,
        });

        return updatedQuestion;
      });

      return this.formatQuestionResponse(result);
    } catch (error) {
      throw this.handleError('Failed to update question', error as Error, QuestionErrorCode.UNKNOWN_ERROR);
    }
  }

  /**
   * Delete question with dependency checking
   */
  async deleteQuestion(
    questionId: string,
    organizationId: string,
    force: boolean = false
  ): Promise<void> {
    try {
      // Verify question ownership and check dependencies
      const question = await this.prisma.question.findFirst({
        where: { id: questionId },
        include: {
          assessments: {
            include: {
              assessment: {
                select: { id: true, title: true, status: true },
              },
            },
          },
        },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check access permissions
      const metadata = question.metadata ? JSON.parse(question.metadata as string) : {};
      if (metadata.organizationId !== organizationId) {
        throw new Error('Question not found or access denied');
      }

      // Check for active assessments using this question
      const activeAssessments = question.assessments.filter(
        a => a.assessment.status === 'ACTIVE' || a.assessment.status === 'DRAFT'
      );
      
      if (activeAssessments.length > 0 && !force) {
        throw new Error(
          `Cannot delete question: used in ${activeAssessments.length} active assessments. Use force=true to override.`
        );
      }

      await this.prisma.$transaction(async (tx) => {
        // Remove from assessments first
        await tx.assessmentQuestion.deleteMany({
          where: { questionId },
        });

        // Delete the question
        await tx.question.delete({
          where: { id: questionId },
        });
      });
    } catch (error) {
      throw this.handleError('Failed to delete question', error as Error, QuestionErrorCode.UNKNOWN_ERROR);
    }
  }

  /**
   * Search questions with filtering and pagination
   */
  async searchQuestions(
    criteria: QuestionSearchCriteria,
    organizationId: string
  ): Promise<QuestionListResponse> {
    try {
      const {
        query,
        type,
        difficulty,
        tags,
        isActive = true,
        createdBy,
        createdAfter,
        createdBefore,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = criteria;

      // Build where clause - Note: Organization filtering moved to post-query filtering
      const where: Prisma.QuestionWhereInput = {
        AND: [
          // Active status
          { isActive },
          // Text search
          ...(query ? [{
            OR: [
              { title: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
              { description: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
              { tags: { hasSome: [query] } },
            ],
          }] : []),
          // Type filter
          ...(type ? [{ type: Array.isArray(type) ? { in: type } : type }] : []),
          // Difficulty filter
          ...(difficulty ? [{ difficulty: Array.isArray(difficulty) ? { in: difficulty } : difficulty }] : []),
          // Tags filter
          ...(tags?.length ? [{ tags: { hasSome: tags } }] : []),
          // Date filters
          ...(createdAfter ? [{ createdAt: { gte: createdAfter } }] : []),
          ...(createdBefore ? [{ createdAt: { lte: createdBefore } }] : []),
        ],
      };

      // Get all questions matching basic criteria
      const allQuestions = await this.prisma.question.findMany({
        where,
        include: {
          assessments: {
            select: {
              assessmentId: true,
            },
          },
        },
        orderBy: this.buildOrderBy(sortBy, sortOrder),
      });

      // Filter by organization access and created by
      const accessibleQuestions = allQuestions.filter(q => {
        const metadata = q.metadata ? JSON.parse(q.metadata as string) : {};
        const hasOrgAccess = metadata.organizationId === organizationId || metadata.isPublic;
        const matchesCreator = !createdBy || metadata.createdBy === createdBy;
        return hasOrgAccess && matchesCreator;
      });

      // Apply pagination
      const total = accessibleQuestions.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedQuestions = accessibleQuestions.slice(startIndex, endIndex);

      // Format results
      const formattedQuestions = paginatedQuestions.map(q => this.formatQuestionResponse(q));

      return {
        questions: formattedQuestions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        filters: {
          query: query || '',
          type: type as any,
          difficulty: difficulty as any,
          tags: tags || [],
          isActive,
          createdBy: createdBy || '',
          createdAfter: createdAfter as any,
          createdBefore: createdBefore as any,
        },
      };
    } catch (error) {
      throw this.handleError('Failed to search questions', error as Error, QuestionErrorCode.UNKNOWN_ERROR);
    }
  }

  /**
   * Perform bulk operations on multiple questions
   */
  async bulkOperation(
    operation: BulkQuestionOperation,
    organizationId: string,
    _userId: string // Prefixed with underscore to indicate intentionally unused
  ): Promise<BulkOperationResult> {
    try {
      const { action, questionIds, data } = operation;
      const results: BulkOperationResult = {
        success: true,
        processedCount: 0,
        failedCount: 0,
        errors: [],
      };

      // Verify question ownership
      const allQuestions = await this.prisma.question.findMany({
        where: { id: { in: questionIds } },
      });

      const ownedQuestions = allQuestions.filter(q => {
        const metadata = q.metadata ? JSON.parse(q.metadata as string) : {};
        return metadata.organizationId === organizationId;
      });

      const ownedQuestionIds = ownedQuestions.map(q => q.id);
      const unownedIds = questionIds.filter(id => !ownedQuestionIds.includes(id));

      // Record errors for unowned questions
      unownedIds.forEach(id => {
        results.errors.push({
          questionId: id,
          error: 'Question not found or access denied',
        });
        results.failedCount++;
      });

      // Process owned questions
      for (const questionId of ownedQuestionIds) {
        try {
          await this.processBulkAction(action, questionId, data);
          results.processedCount++;
        } catch (error) {
          results.errors.push({
            questionId,
            error: (error as Error).message,
          });
          results.failedCount++;
        }
      }

      results.success = results.failedCount === 0;
      return results;
    } catch (error) {
      throw this.handleError('Failed to perform bulk operation', error as Error, QuestionErrorCode.UNKNOWN_ERROR);
    }
  }

  /**
   * Generate basic analytics for a question
   */
  async getQuestionAnalytics(
    questionId: string,
    organizationId: string
  ): Promise<QuestionAnalytics> {
    try {
      const question = await this.prisma.question.findFirst({
        where: { id: questionId },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check access permissions
      const metadata = question.metadata ? JSON.parse(question.metadata as string) : {};
      if (metadata.organizationId !== organizationId) {
        throw new Error('Question not found or access denied');
      }

      // Basic analytics - would be expanded with actual submission data
      return {
        questionId: question.id,
        title: question.title,
        type: question.type as QuestionType,
        difficulty: question.difficulty as QuestionDifficulty,
        totalAttempts: 0, // Would come from submissions
        successfulAttempts: 0,
        averageScore: 0,
        averageTimeSpent: 0,
        commonMistakes: [],
        difficultyFeedback: [],
        tagUsage: [],
        performanceByDemographic: [],
      };
    } catch (error) {
      throw this.handleError('Failed to get question analytics', error as Error, QuestionErrorCode.UNKNOWN_ERROR);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format question data for API response
   */
  private formatQuestionResponse(question: any): QuestionResponse {
    const usageCount = question.assessments?.length || 0;
    const metadata = question.metadata as any || {};

    const response: QuestionResponse = {
      id: question.id,
      title: question.title,
      description: question.description,
      type: question.type,
      difficulty: question.difficulty,
      tags: question.tags || [],
      content: question.content,
      metadata: question.metadata || {},
      isActive: question.isActive,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      usageCount,
    };

    // Add optional fields conditionally
    if (metadata.createdBy) {
      response.createdBy = {
        id: metadata.createdBy,
        name: metadata.createdByName || 'Unknown',
        email: metadata.createdByEmail || '',
      };
    }

    // averageScore would be calculated from submissions
    // response.averageScore = calculatedValue;

    return response;
  }

  /**
   * Build order by clause for queries
   */
  private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): Prisma.QuestionOrderByWithRelationInput {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder;
    return orderBy;
  }

  /**
   * Handle errors with consistent formatting
   */
  private handleError(message: string, error: Error, code: QuestionErrorCode): never {
    const questionError: QuestionError = {
      code,
      message: `${message}: ${error.message}`,
      details: { originalError: error.message },
      timestamp: new Date(),
    };
    throw questionError;
  }

  /**
   * Process individual bulk action
   */
  private async processBulkAction(
    action: string,
    questionId: string,
    data: any
  ): Promise<void> {
    switch (action) {
      case 'DELETE':
        await this.prisma.question.delete({ where: { id: questionId } });
        break;
      case 'ARCHIVE':
        await this.prisma.question.update({
          where: { id: questionId },
          data: { isActive: false },
        });
        break;
      case 'ACTIVATE':
        await this.prisma.question.update({
          where: { id: questionId },
          data: { isActive: true },
        });
        break;
      case 'UPDATE_TAGS':
        if (data?.tags) {
          await this.prisma.question.update({
            where: { id: questionId },
            data: { tags: data.tags },
          });
        }
        break;
      case 'UPDATE_DIFFICULTY':
        if (data?.difficulty) {
          await this.prisma.question.update({
            where: { id: questionId },
            data: { difficulty: data.difficulty },
          });
        }
        break;
      default:
        throw new Error(`Unknown bulk action: ${action}`);
    }
  }
}
