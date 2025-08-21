/**
 * Assessment Controller
 * TASK-CG-005: Assessment Management Core
 * Persona: Senior Software Engineer
 *
 * REST API controller for assessment management operations
 * with comprehensive validation, error handling, and security.
 */

import { Request, Response, NextFunction } from 'express';
import { AssessmentService } from '../services/assessment.service';
import {
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentSearchCriteria,
  StartAssessmentRequest,
  AssessmentError,
  AssessmentErrorCode,
  AssessmentType,
  AssessmentStatus,
  PaginationParams,
} from '../types/assessment.types';
import { body, param, query, validationResult } from 'express-validator';

export class AssessmentController {
  private assessmentService: AssessmentService;

  constructor(assessmentService: AssessmentService) {
    this.assessmentService = assessmentService;
  }

  private log(level: 'info' | 'error', message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logObject = {
      timestamp,
      level,
      context: 'AssessmentController',
      message,
      ...(meta && { meta }),
    };
    if (level === 'error') {
      console.error(JSON.stringify(logObject));
    } else {
      console.log(JSON.stringify(logObject));
    }
  }

  // ============================================================================
  // VALIDATION RULES
  // ============================================================================

  static createAssessmentValidation = [
    body('title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be max 1000 characters'),
    body('type').isIn(Object.values(AssessmentType)).withMessage('Invalid assessment type'),
    body('timeLimit')
      .optional()
      .isInt({ min: 1, max: 600 })
      .withMessage('Time limit must be 1-600 minutes'),
    body('scheduledAt').optional().isISO8601().withMessage('Invalid scheduled date format'),
    body('startsAt').optional().isISO8601().withMessage('Invalid start date format'),
    body('endsAt').optional().isISO8601().withMessage('Invalid end date format'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    body('questionIds').optional().isArray().withMessage('Question IDs must be an array'),
    body('questionIds.*').optional().isUUID().withMessage('Each question ID must be a valid UUID'),
  ];

  static updateAssessmentValidation = [
    param('id').isUUID().withMessage('Invalid assessment ID'),
    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be max 1000 characters'),
    body('type')
      .optional()
      .isIn(Object.values(AssessmentType))
      .withMessage('Invalid assessment type'),
    body('timeLimit')
      .optional()
      .isInt({ min: 1, max: 600 })
      .withMessage('Time limit must be 1-600 minutes'),
    body('status')
      .optional()
      .isIn(Object.values(AssessmentStatus))
      .withMessage('Invalid assessment status'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
  ];

  static assessmentIdValidation = [param('id').isUUID().withMessage('Invalid assessment ID')];

  static searchValidation = [
    query('query')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Search query must be max 100 characters'),
    query('types')
      .optional()
      .custom(value => {
        if (typeof value === 'string') {
          return Object.values(AssessmentType).includes(value as AssessmentType);
        }
        if (Array.isArray(value)) {
          return value.every(type => Object.values(AssessmentType).includes(type));
        }
        return false;
      })
      .withMessage('Invalid assessment types'),
    query('statuses')
      .optional()
      .custom(value => {
        if (typeof value === 'string') {
          return Object.values(AssessmentStatus).includes(value as AssessmentStatus);
        }
        if (Array.isArray(value)) {
          return value.every(status => Object.values(AssessmentStatus).includes(status));
        }
        return false;
      })
      .withMessage('Invalid assessment statuses'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be 1-100'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'title', 'type', 'status'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('Sort order must be ASC or DESC'),
  ];

  static addQuestionsValidation = [
    param('id').isUUID().withMessage('Invalid assessment ID'),
    body('questionIds').isArray({ min: 1 }).withMessage('Question IDs array is required'),
    body('questionIds.*').isUUID().withMessage('Each question ID must be a valid UUID'),
  ];

  static startAssessmentValidation = [
    body('assessmentId').isUUID().withMessage('Invalid assessment ID'),
    body('candidateId').isUUID().withMessage('Invalid candidate ID'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
  ];

  // ============================================================================
  // ASSESSMENT CRUD ENDPOINTS
  // ============================================================================

  /**
   * POST /api/assessments
   * Create a new assessment
   */
  createAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const data: CreateAssessmentRequest = req.body;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const assessment = await this.assessmentService.createAssessment(data, organizationId);

      this.log('info', 'Assessment created via API', {
        assessmentId: assessment.id,
        userId,
        organizationId,
      });

      res.status(201).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/assessments/:id
   * Get assessment by ID
   */
  getAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const includeDetails = req.query['details'] === 'true';
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const assessment = await this.assessmentService.getAssessment(
        id,
        organizationId,
        includeDetails
      );

      if (!assessment) {
        res.status(404).json({ error: 'Assessment not found' });
        return;
      }

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/assessments/:id
   * Update assessment
   */
  updateAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const data: UpdateAssessmentRequest = req.body;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const assessment = await this.assessmentService.updateAssessment(id, data, organizationId);

      this.log('info', 'Assessment updated via API', {
        assessmentId: id,
        userId,
        organizationId,
      });

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/assessments/:id
   * Delete assessment
   */
  deleteAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      await this.assessmentService.deleteAssessment(id, organizationId);

      this.log('info', 'Assessment deleted via API', {
        assessmentId: id,
        userId,
        organizationId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/assessments
   * Search assessments with filtering and pagination
   */
  searchAssessments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const query = req.query['query'] as string;
      const types = req.query['types'];
      const statuses = req.query['statuses'];
      const createdBy = req.query['createdBy'] as string;
      const from = req.query['from'] as string;
      const to = req.query['to'] as string;
      const page = parseInt(req.query['page'] as string) || 1;
      const pageSize = parseInt(req.query['pageSize'] as string) || 20;
      const sortBy = (req.query['sortBy'] as any) || 'createdAt';
      const sortOrder = (req.query['sortOrder'] as 'ASC' | 'DESC') || 'DESC';

      const criteria: AssessmentSearchCriteria = {
        query,
        ...(types && {
          types: Array.isArray(types) ? (types as AssessmentType[]) : ([types] as AssessmentType[]),
        }),
        ...(statuses && {
          statuses: Array.isArray(statuses)
            ? (statuses as AssessmentStatus[])
            : ([statuses] as AssessmentStatus[]),
        }),
        createdBy,
        ...(from &&
          to && {
            dateRange: {
              from: new Date(from),
              to: new Date(to),
            },
          }),
        pagination: { page, pageSize } as PaginationParams,
        sortBy,
        sortOrder,
      };

      const result = await this.assessmentService.searchAssessments(criteria, organizationId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // QUESTION MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * POST /api/assessments/:id/questions
   * Add questions to assessment
   */
  addQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const { questionIds } = req.body;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      await this.assessmentService.addQuestionsToAssessment(id, questionIds, organizationId);

      this.log('info', 'Questions added to assessment via API', {
        assessmentId: id,
        questionCount: questionIds.length,
        userId,
      });

      res.json({
        success: true,
        message: 'Questions added successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/assessments/:id/questions/:questionId
   * Remove question from assessment
   */
  removeQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, questionId } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      await this.assessmentService.removeQuestionFromAssessment(id, questionId, organizationId);

      this.log('info', 'Question removed from assessment via API', {
        assessmentId: id,
        questionId,
        userId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // ASSESSMENT LIFECYCLE ENDPOINTS
  // ============================================================================

  /**
   * POST /api/assessments/:id/publish
   * Publish assessment
   */
  publishAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const assessment = await this.assessmentService.publishAssessment(id, organizationId, userId);

      this.log('info', 'Assessment published via API', {
        assessmentId: id,
        userId,
        newStatus: assessment.status,
      });

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/assessments/:id/activate
   * Activate assessment
   */
  activateAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const assessment = await this.assessmentService.activateAssessment(id, organizationId);

      this.log('info', 'Assessment activated via API', {
        assessmentId: id,
        userId,
      });

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/assessments/:id/complete
   * Complete assessment
   */
  completeAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const assessment = await this.assessmentService.completeAssessment(id, organizationId);

      this.log('info', 'Assessment completed via API', {
        assessmentId: id,
        userId,
      });

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // ASSESSMENT PARTICIPATION ENDPOINTS
  // ============================================================================

  /**
   * POST /api/assessments/start
   * Start assessment for candidate
   */
  startAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const data: StartAssessmentRequest = req.body;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const session = await this.assessmentService.startAssessment(
        { assessmentId: data.assessmentId, candidateId: data.candidateId },
        organizationId
      );

      this.log('info', 'Assessment started via API', {
        assessmentId: data.assessmentId,
        candidateId: data.candidateId,
        sessionId: session.sessionId,
      });

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // ERROR HANDLER
  // ============================================================================

  handleError = (error: any, req: Request, res: Response, _next: NextFunction): void => {
    this.log('error', 'Assessment API error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      user: (req as any).user?.id,
    });

    if (error instanceof AssessmentError) {
      const statusCode = this.getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        details: error.details,
      });
      return;
    }

    // Default error response
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  };

  private getStatusCodeForError(code: AssessmentErrorCode): number {
    const statusMap: Record<AssessmentErrorCode, number> = {
      [AssessmentErrorCode.ASSESSMENT_NOT_FOUND]: 404,
      [AssessmentErrorCode.ASSESSMENT_NOT_ACTIVE]: 400,
      [AssessmentErrorCode.ASSESSMENT_EXPIRED]: 400,
      [AssessmentErrorCode.ASSESSMENT_NOT_STARTED]: 400,
      [AssessmentErrorCode.ASSESSMENT_ALREADY_COMPLETED]: 400,
      [AssessmentErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
      [AssessmentErrorCode.INVALID_CONFIGURATION]: 400,
      [AssessmentErrorCode.QUESTION_NOT_FOUND]: 404,
      [AssessmentErrorCode.INVALID_ANSWER_FORMAT]: 400,
      [AssessmentErrorCode.SUBMISSION_DEADLINE_PASSED]: 400,
      [AssessmentErrorCode.SESSION_EXPIRED]: 400,
      [AssessmentErrorCode.MAXIMUM_ATTEMPTS_EXCEEDED]: 400,
      [AssessmentErrorCode.VALIDATION_ERROR]: 400,
    };

    return statusMap[code] || 500;
  }
}

export default AssessmentController;
