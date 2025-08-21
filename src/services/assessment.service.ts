import { PrismaClient, Assessment, AssessmentStatus } from '@prisma/client';
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
        AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
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
      if (data.status !== undefined) {
        updateData.status = data.status;
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
        AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
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
        AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
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
  ): Promise<{
    items: Assessment[];
    pagination: { totalItems: number; page: number; pageSize: number; totalPages: number };
  }> {
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

      const [assessments, totalItems] = await Promise.all([
        this.prisma.assessment.findMany({
          where,
          orderBy: criteria.sortBy
            ? {
                [criteria.sortBy]: criteria.sortOrder || 'DESC',
              }
            : { createdAt: 'desc' },
          take: criteria.pagination.pageSize,
          skip: (criteria.pagination.page - 1) * criteria.pagination.pageSize,
        }),
        this.prisma.assessment.count({ where }),
      ]);

      return {
        items: assessments,
        pagination: {
          totalItems,
          page: criteria.pagination.page,
          pageSize: criteria.pagination.pageSize,
          totalPages: Math.ceil(totalItems / criteria.pagination.pageSize),
        },
      };
    } catch (error) {
      log('error', 'Failed to search assessments', { criteria, error });
      throw new AssessmentError(
        AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
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
    questionIds: string[],
    organizationId: string,
    startOrder = 1
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
          questionIds.map((questionId: string, index: number) =>
            tx.assessmentQuestion.create({
              data: {
                assessmentId,
                questionId,
                order: startOrder + index,
              },
            })
          )
        );
      });

      log('info', 'Questions added to assessment', {
        assessmentId,
        questionCount: questionIds.length,
      });
    } catch (error) {
      log('error', 'Failed to add questions to assessment', { assessmentId, error });
      throw new AssessmentError(
        AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
        'Failed to add questions to assessment',
        error
      );
    }
  }

  /**
   * Start assessment for a user
   */
  async startAssessment(
    request: { assessmentId: string; candidateId: string },
    organizationId: string
  ): Promise<{
    participationId: string;
    sessionId: string;
    assessmentId: string;
    candidateId: string;
    status: string;
    progress: { totalQuestions: number };
  }> {
    try {
      // Check if assessment is available for taking
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: request.assessmentId,
          organizationId,
          status: AssessmentStatus.ACTIVE,
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        },
        include: {
          questions: true,
        },
      });

      if (!assessment) {
        throw new AssessmentError(
          AssessmentErrorCode.ASSESSMENT_NOT_ACTIVE,
          'Assessment is not available for taking'
        );
      }

      // Create or update participation
      const sessionId = generateSessionId();
      const participation = await this.prisma.assessmentParticipation.upsert({
        where: {
          assessmentId_userId: {
            assessmentId: request.assessmentId,
            userId: request.candidateId,
          },
        },
        create: {
          assessmentId: request.assessmentId,
          userId: request.candidateId,
          startedAt: new Date(),
          metadata: JSON.stringify({}),
          status: 'IN_PROGRESS',
        },
        update: {
          startedAt: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      log('info', 'Assessment session started', {
        assessmentId: request.assessmentId,
        candidateId: request.candidateId,
        participationId: participation.id,
        sessionId,
      });

      return {
        participationId: participation.id,
        sessionId,
        assessmentId: request.assessmentId,
        candidateId: request.candidateId,
        status: 'IN_PROGRESS',
        progress: {
          totalQuestions: assessment.questions.length,
        },
      };
    } catch (error) {
      log('error', 'Failed to start assessment', { request, organizationId, error });
      throw new AssessmentError(
        AssessmentErrorCode.ASSESSMENT_NOT_FOUND,
        'Failed to start assessment',
        error
      );
    }
  }

  /**
   * Remove a question from an assessment
   */
  async removeQuestionFromAssessment(
    assessmentId: string,
    questionId: string,
    organizationId: string
  ): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          organizationId,
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (assessment.status !== AssessmentStatus.DRAFT) {
        throw new Error('Cannot remove questions from a published assessment');
      }

      await this.prisma.question.delete({
        where: {
          id: questionId,
        },
      });

      const updatedAssessment = await this.getAssessment(assessmentId, organizationId);
      if (!updatedAssessment) {
        throw new Error('Assessment not found after question removal');
      }
      return updatedAssessment;
    } catch (error) {
      throw new Error(`Failed to remove question from assessment: ${(error as Error).message}`);
    }
  }

  /**
   * Publish an assessment (sets status to SCHEDULED)
   */
  async publishAssessment(
    assessmentId: string,
    organizationId: string,
    userId: string
  ): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          organizationId,
        },
        include: {
          questions: {
            include: {
              question: true,
            },
          },
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (assessment.status !== AssessmentStatus.DRAFT) {
        throw new Error('Assessment is already published');
      }

      if (assessment.questions.length === 0) {
        throw new Error('Cannot publish assessment without questions');
      }

      await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: AssessmentStatus.SCHEDULED,
          updatedAt: new Date(),
        },
      });

      const updatedAssessment = await this.getAssessment(assessmentId, organizationId);
      if (!updatedAssessment) {
        throw new Error('Assessment not found after publishing');
      }
      return updatedAssessment;
    } catch (error) {
      throw new Error(`Failed to publish assessment: ${(error as Error).message}`);
    }
  }

  /**
   * Activate an assessment
   */
  async activateAssessment(assessmentId: string, organizationId: string): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          organizationId,
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (assessment.status !== AssessmentStatus.SCHEDULED) {
        throw new Error('Only scheduled assessments can be activated');
      }

      const now = new Date();
      await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: AssessmentStatus.ACTIVE,
          startsAt: now,
          updatedAt: now,
        },
      });

      const updatedAssessment = await this.getAssessment(assessmentId, organizationId);
      if (!updatedAssessment) {
        throw new Error('Assessment not found after activation');
      }
      return updatedAssessment;
    } catch (error) {
      throw new Error(`Failed to activate assessment: ${(error as Error).message}`);
    }
  }

  /**
   * Complete an assessment
   */
  async completeAssessment(assessmentId: string, organizationId: string): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          organizationId,
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (assessment.status !== AssessmentStatus.ACTIVE) {
        throw new Error('Only active assessments can be completed');
      }

      const now = new Date();
      await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: AssessmentStatus.COMPLETED,
          endsAt: now,
          updatedAt: now,
        },
      });

      const updatedAssessment = await this.getAssessment(assessmentId, organizationId);
      if (!updatedAssessment) {
        throw new Error('Assessment not found after completion');
      }
      return updatedAssessment;
    } catch (error) {
      throw new Error(`Failed to complete assessment: ${(error as Error).message}`);
    }
  }
}
