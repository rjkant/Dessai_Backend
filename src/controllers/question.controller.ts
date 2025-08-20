import { Request, Response } from 'express';
import { QuestionService } from '../services/question.service';
import {
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionSearchCriteria,
} from '../types/question.types';
import { body, param, query, validationResult } from 'express-validator';

export class QuestionController {
  private questionService: QuestionService;

  constructor(questionService: QuestionService) {
    this.questionService = questionService;
  }

  /**
   * Create a new question
   */
  async createQuestion(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;
      const data = req.body as CreateQuestionRequest;

      if (!organizationId || !userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication context required',
        });
        return;
      }

      const question = await this.questionService.createQuestion(data, organizationId, userId);

      this.log('info', 'Question created via API', {
        questionId: question.id,
        type: question.type,
        userId,
      });

      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      this.log('error', 'Failed to create question via API', { error });
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get a question by ID
   */
  async getQuestion(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required',
        });
        return;
      }

      const question = await this.questionService.getQuestionById(id, organizationId);

      if (!question) {
        res.status(404).json({
          success: false,
          message: 'Question not found',
        });
        return;
      }

      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      this.log('error', 'Failed to get question via API', { error });
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * Update a question
   */
  async updateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;
      const data = req.body as UpdateQuestionRequest;

      if (!organizationId || !userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication context required',
        });
        return;
      }

      const question = await this.questionService.updateQuestion(id, data, organizationId, userId);

      this.log('info', 'Question updated via API', {
        questionId: id,
        userId,
      });

      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      this.log('error', 'Failed to update question via API', { error });
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * Delete a question
   */
  async deleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required',
        });
        return;
      }

      await this.questionService.deleteQuestion(id, organizationId);

      this.log('info', 'Question deleted via API', {
        questionId: id,
        userId,
      });

      res.json({
        success: true,
        message: 'Question deleted successfully',
      });
    } catch (error) {
      this.log('error', 'Failed to delete question via API', { error });
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * Search questions
   */
  async searchQuestions(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const organizationId = (req as any).user?.organizationId;
      const criteria = this.buildSearchCriteria(req.query);

      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required',
        });
        return;
      }

      const questions = await this.questionService.searchQuestions(criteria, organizationId);

      res.json({
        success: true,
        data: questions.questions,
        pagination: {
          page: questions.pagination.page,
          pageSize: questions.pagination.limit,
          totalItems: questions.pagination.total,
          totalPages: questions.pagination.totalPages,
        },
      });
    } catch (error) {
      this.log('error', 'Failed to search questions via API', { error });
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required',
        });
        return;
      }

      // For now, return basic stats - implement getQuestionStats in service later
      const stats = {
        total: 0,
        published: 0,
        draft: 0,
        byType: {},
        byDifficulty: {},
        usage: { totalAttempts: 0, averageScore: 0 }
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      this.log('error', 'Failed to get question stats via API', { error });
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * Duplicate a question
   */
  async duplicateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;
      const modifications = req.body;

      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required',
        });
        return;
      }

      // Get the original question
      const originalQuestion = await this.questionService.getQuestionById(id, organizationId);
      if (!originalQuestion) {
        res.status(404).json({
          success: false,
          message: 'Question not found',
        });
        return;
      }

      // Create duplicate with modifications
      const duplicateData = {
        ...originalQuestion,
        title: `${originalQuestion.title} (Copy)`,
        ...modifications,
      };
      
      const duplicatedQuestion = await this.questionService.createQuestion(
        duplicateData,
        organizationId,
        userId!
      );

      this.log('info', 'Question duplicated via API', {
        originalId: id,
        duplicatedId: duplicatedQuestion.id,
        userId,
      });

      res.status(201).json({
        success: true,
        data: duplicatedQuestion,
      });
    } catch (error) {
      this.log('error', 'Failed to duplicate question via API', { error });
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get questions by IDs
   */
  async getQuestionsByIds(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { ids } = req.body;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required',
        });
        return;
      }

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Valid question IDs array required',
        });
        return;
      }

      // Get multiple questions by IDs
      const questions = await Promise.all(
        ids.map(id => this.questionService.getQuestionById(id, organizationId))
      );
      const validQuestions = questions.filter(q => q !== null);

      res.json({
        success: true,
        data: validQuestions,
      });
    } catch (error) {
      this.log('error', 'Failed to get questions by IDs via API', { error });
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * Build search criteria from query parameters
   */
  private buildSearchCriteria(query: any): QuestionSearchCriteria {
    const criteria: QuestionSearchCriteria = {};

    if (query.type) criteria.type = query.type;
    if (query.difficulty) criteria.difficulty = query.difficulty;
    if (query.query) criteria.query = query.query;
    if (query.tags) {
      criteria.tags = Array.isArray(query.tags) ? query.tags : [query.tags];
    }
    if (query.sortBy) criteria.sortBy = query.sortBy;
    if (query.sortOrder) criteria.sortOrder = query.sortOrder;
    if (query.limit) criteria.limit = parseInt(query.limit, 10);
    if (query.page) criteria.page = parseInt(query.page, 10);

    return criteria;
  }

  /**
   * Validation rules for create question
   */
  static createValidation() {
    return [
      body('title').notEmpty().withMessage('Title is required'),
      body('description').notEmpty().withMessage('Description is required'),
      body('type').isIn(['CODING', 'MULTIPLE_CHOICE', 'SYSTEM_DESIGN', 'DATABASE']).withMessage('Valid question type is required'),
      body('difficulty').isIn(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).withMessage('Valid difficulty is required'),
      body('content').notEmpty().withMessage('Question content is required'),
      body('tags').optional().isArray().withMessage('Tags must be an array'),
    ];
  }

  /**
   * Validation rules for update question
   */
  static updateValidation() {
    return [
      param('id').isUUID().withMessage('Valid question ID is required'),
      body('title').optional().notEmpty().withMessage('Title cannot be empty'),
      body('description').optional().notEmpty().withMessage('Description cannot be empty'),
      body('type').optional().isIn(['CODING', 'MULTIPLE_CHOICE', 'SYSTEM_DESIGN', 'DATABASE']).withMessage('Valid question type required'),
      body('difficulty').optional().isIn(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).withMessage('Valid difficulty required'),
      body('tags').optional().isArray().withMessage('Tags must be an array'),
    ];
  }

  /**
   * Validation rules for question ID parameter
   */
  static idValidation() {
    return [
      param('id').isUUID().withMessage('Valid question ID is required'),
    ];
  }

  /**
   * Validation rules for search
   */
  static searchValidation() {
    return [
      query('type').optional().isIn(['CODING', 'MULTIPLE_CHOICE', 'SYSTEM_DESIGN', 'DATABASE']).withMessage('Valid question type required'),
      query('difficulty').optional().isIn(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).withMessage('Valid difficulty required'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    ];
  }

  /**
   * Validation rules for bulk get by IDs
   */
  static bulkGetValidation() {
    return [
      body('ids').isArray({ min: 1, max: 100 }).withMessage('IDs array must contain 1-100 valid question IDs'),
      body('ids.*').isUUID().withMessage('Each ID must be a valid UUID'),
    ];
  }

  /**
   * Simple logging method
   */
  private log(level: string, message: string, meta?: any): void {
    console.log(`[${level.toUpperCase()}] ${message}`, meta ? JSON.stringify(meta) : '');
  }
}
