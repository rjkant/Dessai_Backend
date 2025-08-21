import {
  PrismaClient,
  Assessment,
  AssessmentStatus,
  AssessmentType,
  Question,
} from '@prisma/client';
import {
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentWithDetails,
  AssessmentSearchCriteria,
  AssessmentError,
  AssessmentErrorCode,
} from '../types/assessment.types';

// Simple utility functions
function generateSessionId(): string {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function log(level: 'info' | 'error', message: string, meta?: any): void {
  const timestamp = new Date().toISOString();
  const logObject = {
    timestamp,
    level,
    context: 'AssessmentService',
    message,
    ...(meta && { meta }),
  };
  if (level === 'error') {
    console.error(JSON.stringify(logObject));
  } else {
    console.log(JSON.stringify(logObject));
  }
}

export class AssessmentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new assessment
   */
  async createAssessment(
    data: CreateAssessmentRequest,
    organizationId: string
  ): Promise<Assessment> {
    try {
      log('info', 'Creating assessment', {
        title: data.title,
        type: data.type,
        organizationId,
      });

      // Create assessment with transaction
      const assessment = await this.prisma.$transaction(async tx => {
        // Create the assessment
        const newAssessment = await tx.assessment.create({
          data: {
            title: data.title,
            description: data.description || null,
            type: data.type,
            status: AssessmentStatus.DRAFT,
            timeLimit: data.timeLimit || null,
            scheduledAt: data.scheduledAt || null,
            startsAt: data.startsAt || null,
            endsAt: data.endsAt || null,
            settings: JSON.stringify(data.settings || {}),
            organizationId,
          },
        });

        // Add questions if provided
        if (data.questionIds && data.questionIds.length > 0) {
          await Promise.all(
            data.questionIds.map((questionId: string, index: number) =>
              tx.assessmentQuestion.create({
                data: {
                  assessmentId: newAssessment.id,
                  questionId,
                  order: index + 1,
                },
              })
            )
          );
        }

        return newAssessment;
      });

      log('info', 'Assessment created successfully', {
        assessmentId: assessment.id,
        title: assessment.title,
      });

      return assessment;
    } catch (error) {
      log('error', 'Failed to create assessment', error);
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to create assessment',
        error
      );
    }
  }

  /**
   * Get assessment by ID with optional details
   */
  async getAssessment(
    id: string,
    organizationId?: string,
    includeDetails = false
  ): Promise<AssessmentWithDetails | Assessment | null> {
    try {
      const includeOptions = includeDetails
        ? {
            organization: {
              select: { id: true, name: true, slug: true },
            },
            questions: {
              include: { question: true },
              orderBy: { order: 'asc' as const },
            },
            participations: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
            _count: {
              select: { participations: true, questions: true },
            },
          }
        : undefined;

      const query: any = {
        where: {
          id,
          ...(organizationId && { organizationId }),
        },
      };

      if (includeOptions) {
        query.include = includeOptions;
      }

      const assessment = await this.prisma.assessment.findFirst(query);

      if (!assessment) {
        return null;
      }

      return assessment as AssessmentWithDetails | Assessment;
    } catch (error) {
      log('error', 'Failed to get assessment', { id, error });
      throw new AssessmentError(
        AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
        'Assessment not found',
        error
      );
    }
  }

  /**
   * Update assessment
   */
  async updateAssessment(
    id: string,
    data: UpdateAssessmentRequest,
    organizationId: string
  ): Promise<Assessment> {
    try {
      const updateData: any = {};

      if (data.title !== undefined) {
        updateData.title = data.title;
      }
      if (data.description !== undefined) {
        updateData.description = data.description || null;
      }
      if (data.timeLimit !== undefined) {
        updateData.timeLimit = data.timeLimit || null;
      }
      if (data.scheduledAt !== undefined) {
        updateData.scheduledAt = data.scheduledAt || null;
      }
      if (data.startsAt !== undefined) {
        updateData.startsAt = data.startsAt || null;
      }
      if (data.endsAt !== undefined) {
        updateData.endsAt = data.endsAt || null;
      }
      if (data.settings !== undefined) {
        updateData.settings = JSON.stringify(data.settings || {});
      }

      const assessment = await this.prisma.assessment.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
      });

      log('info', 'Assessment updated successfully', {
        assessmentId: id,
        fieldsUpdated: Object.keys(updateData),
      });

      return assessment;
    } catch (error) {
      log('error', 'Failed to update assessment', { id, error });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to update assessment',
        error
      );
    }
  }

  /**
   * Delete assessment
   */
  async deleteAssessment(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async tx => {
        // Check if assessment exists and belongs to organization
        const assessment = await tx.assessment.findFirst({
          where: { id, organizationId },
        });

        if (!assessment) {
          throw new AssessmentError(
            AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
            'Assessment not found'
          );
        }

        // Delete assessment questions
        await tx.assessmentQuestion.deleteMany({
          where: { assessmentId: id },
        });

        // Delete participations
        await tx.assessmentParticipation.deleteMany({
          where: { assessmentId: id },
        });

        // Delete the assessment
        await tx.assessment.delete({
          where: { id },
        });
      });

      log('info', 'Assessment deleted successfully', { assessmentId: id });
    } catch (error) {
      log('error', 'Failed to delete assessment', { id, error });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to delete assessment',
        error
      );
    }
  }

  /**
   * Search assessments with criteria
   */
  async searchAssessments(
    criteria: AssessmentSearchCriteria,
    organizationId: string
  ): Promise<Assessment[]> {
    try {
      const where: any = { organizationId };

      if (criteria.query) {
        where.title = { contains: criteria.query, mode: 'insensitive' };
      }

      if (criteria.types && criteria.types.length > 0) {
        where.type = { in: criteria.types };
      }

      if (criteria.statuses && criteria.statuses.length > 0) {
        where.status = { in: criteria.statuses };
      }

      if (criteria.dateRange) {
        where.createdAt = {
          gte: criteria.dateRange.from,
          lte: criteria.dateRange.to,
        };
      }
      const assessments = await this.prisma.assessment.findMany({
        where,
        orderBy: criteria.sortBy
          ? {
              [criteria.sortBy]: criteria.sortOrder || 'desc',
            }
          : { createdAt: 'desc' },
        take: criteria.pagination?.pageSize || 50,
        skip: ((criteria.pagination?.page || 1) - 1) * (criteria.pagination?.pageSize || 50),
      });

      return assessments;
    } catch (error) {
      log('error', 'Failed to search assessments', { criteria, error });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to search assessments',
        error
      );
    }
  }

  /**
   * Add questions to assessment
   */
  async addQuestionsToAssessment(
    assessmentId: string,
    data: { questionIds: string[] },
    organizationId: string
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async tx => {
        // Verify assessment exists and belongs to organization
        const assessment = await tx.assessment.findFirst({
          where: { id: assessmentId, organizationId },
        });

        if (!assessment) {
          throw new AssessmentError(
            AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
            'Assessment not found'
          );
        }

        // Add questions
        await Promise.all(
          data.questionIds.map((questionId: string, index: number) =>
            tx.assessmentQuestion.create({
              data: {
                assessmentId,
                questionId,
                order: 1 + index,
              },
            })
          )
        );
      });

      log('info', 'Questions added to assessment', {
        assessmentId,
        questionCount: data.questionIds.length,
      });
    } catch (error) {
      log('error', 'Failed to add questions to assessment', { assessmentId, error });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to add questions to assessment',
        error
      );
    }
  }

  /**
   * Remove question from assessment
   */
  async removeQuestionFromAssessment(
    assessmentId: string,
    questionId: string,
    organizationId: string
  ): Promise<void> {
    try {
      await this.prisma.assessmentQuestion.deleteMany({
        where: {
          assessmentId,
          questionId,
          assessment: { organizationId },
        },
      });

      log('info', 'Question removed from assessment', { assessmentId, questionId });
    } catch (error) {
      log('error', 'Failed to remove question from assessment', {
        assessmentId,
        questionId,
        error,
      });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to remove question from assessment',
        error
      );
    }
  }

  /**
   * Publish assessment
   */
  async publishAssessment(id: string, organizationId: string): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.update({
        where: {
          id,
          organizationId,
          status: AssessmentStatus.DRAFT,
        },
        data: {
          status: AssessmentStatus.ACTIVE,
        },
      });

      log('info', 'Assessment published', {
        assessmentId: id,
      });

      return assessment;
    } catch (error) {
      log('error', 'Failed to publish assessment', { id, error });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to publish assessment',
        error
      );
    }
  }

  /**
   * Activate assessment
   */
  async activateAssessment(id: string, organizationId: string): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.update({
        where: {
          id,
          organizationId,
          status: AssessmentStatus.ACTIVE,
        },
        data: {
          status: AssessmentStatus.ACTIVE,
        },
      });

      log('info', 'Assessment activated', { assessmentId: id });

      return assessment;
    } catch (error) {
      log('error', 'Failed to activate assessment', { id, error });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to activate assessment',
        error
      );
    }
  }

  /**
   * Complete assessment
   */
  async completeAssessment(id: string, organizationId: string): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.update({
        where: {
          id,
          organizationId,
          status: AssessmentStatus.ACTIVE,
        },
        data: {
          status: AssessmentStatus.COMPLETED,
        },
      });

      log('info', 'Assessment completed', { assessmentId: id });

      return assessment;
    } catch (error) {
      log('error', 'Failed to complete assessment', { id, error });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Failed to complete assessment',
        error
      );
    }
  }

  // ============================================================================
  // ASSESSMENT PARTICIPATION
  // ============================================================================

  /**
   * Start assessment for a user
   */
  async startAssessment(data: {
    userId: string;
    assessmentId: string;
  }): Promise<{ participationId: string; sessionId: string }> {
    try {
      const { assessmentId, userId } = data;

      // Check if assessment is available for taking
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          status: AssessmentStatus.ACTIVE,
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        },
      });

      if (!assessment) {
        throw new AssessmentError(
          AssessmentErrorCode.ASSESSMENT_NOT_ACTIVE,
          'Assessment is not available for taking'
        );
      }

      // Check if user already has a participation
      const existingParticipation = await this.prisma.assessmentParticipation.findFirst({
        where: { assessmentId, userId },
      });

      if (existingParticipation) {
        throw new AssessmentError(
          AssessmentErrorCode.VALIDATION_ERROR,
          'User has already started this assessment'
        );
      }

      // Create participation
      const sessionId = generateSessionId();
      const participation = await this.prisma.assessmentParticipation.create({
        data: {
          assessmentId,
          userId,
          startedAt: new Date(),
          metadata: JSON.stringify({}),
          status: 'IN_PROGRESS',
        },
      });

      log('info', 'Assessment session started', {
        assessmentId,
        userId,
        participationId: participation.id,
        sessionId,
      });

      return {
        participationId: participation.id,
        sessionId,
      };
    } catch (error) {
      log('error', 'Failed to start assessment', { data, error });
      throw new AssessmentError(
        AssessmentErrorCode.ASSESSMENT_NOT_STARTED,
        'Failed to start assessment',
        error
      );
    }
  }

  /**
   * Get user's assessment participation
   */
  async getAssessmentParticipation(assessmentId: string, userId: string) {
    try {
      const participation = await this.prisma.assessmentParticipation.findFirst({
        where: { assessmentId, userId },
        include: {
          assessment: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return participation;
    } catch (error) {
      log('error', 'Failed to get assessment participation', { assessmentId, userId, error });
      throw new AssessmentError(
        AssessmentErrorCode.VALIDATION_ERROR,
        'Assessment participation not found',
        error
      );
    }
  }
}
