/**
 * Question Routes
 * TASK-CG-006: Question Management System
 * Persona: Senior Software Engineer
 *
 * Express routes for question management endpoints.
 * Handles routing, middleware application, and request delegation.
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { QuestionController } from '../controllers/question.controller';
import { QuestionService } from '../services/question.service';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';

// ============================================================================
// ROUTER SETUP
// ============================================================================

export function createQuestionRoutes(): Router {
  const router = Router();
  const prismaClient = new PrismaClient();
  const questionService = new QuestionService(prismaClient);
  const questionController = new QuestionController(questionService);

  // ============================================================================
  // MIDDLEWARE APPLICATION
  // ============================================================================

  // Apply authentication to all question routes
  router.use(AuthMiddleware.authenticate as any);

  // ============================================================================
  // QUESTION CRUD ROUTES
  // ============================================================================

  /**
   * @route   POST /api/questions
   * @desc    Create a new question
   * @access  Private (Authenticated users)
   * @body    CreateQuestionRequest
   */
  router.post('/', ValidationMiddleware.requireJSON, questionController.createQuestion);

  /**
   * @route   GET /api/questions/:id
   * @desc    Get question by ID
   * @access  Private (Authenticated users)
   * @params  id - Question ID
   * @query   includeTestCases - Include hidden test cases (boolean)
   */
  router.get('/:id', ValidationMiddleware.validateUUID('id'), questionController.getQuestion);

  /**
   * @route   PUT /api/questions/:id
   * @desc    Update question
   * @access  Private (Authenticated users)
   * @params  id - Question ID
   * @body    UpdateQuestionRequest
   */
  router.put(
    '/:id',
    ValidationMiddleware.validateUUID('id'),
    ValidationMiddleware.requireJSON,
    questionController.updateQuestion
  );

  /**
   * @route   DELETE /api/questions/:id
   * @desc    Delete question
   * @access  Private (Authenticated users)
   * @params  id - Question ID
   * @query   force - Force delete even if used in assessments (boolean)
   */
  router.delete('/:id', ValidationMiddleware.validateUUID('id'), questionController.deleteQuestion);

  // ============================================================================
  // QUESTION SEARCH AND LISTING ROUTES
  // ============================================================================

  /**
   * @route   GET /api/questions
   * @desc    Search questions with filters and pagination
   * @access  Private (Authenticated users)
   * @query   query - Text search query (string)
   * @query   type - Question type filter (string or array)
   * @query   difficulty - Difficulty filter (string or array)
   * @query   tags - Tags filter (string or array)
   * @query   isActive - Active status filter (boolean, default: true)
   * @query   createdBy - Creator filter (string)
   * @query   createdAfter - Created after date (ISO string)
   * @query   createdBefore - Created before date (ISO string)
   * @query   page - Page number (number, default: 1)
   * @query   limit - Items per page (number, default: 20, max: 100)
   * @query   sortBy - Sort field (string, default: 'createdAt')
   * @query   sortOrder - Sort order ('asc' | 'desc', default: 'desc')
   */
  router.get('/', questionController.searchQuestions);

  // ============================================================================
  // BULK OPERATIONS ROUTES
  // ============================================================================

  /**
   * @route   POST /api/questions/bulk
   * @desc    Perform bulk operations on questions
   * @access  Private (Authenticated users)
   * @body    BulkQuestionOperation
   */
  // Bulk operations endpoint (not yet implemented)
  // router.post(
  //   '/bulk',
  //   ValidationMiddleware.requireJSON,
  //   questionController.bulkOperation
  // );

  // ============================================================================
  // ANALYTICS ROUTES
  // ============================================================================

  /**
   * @route   GET /api/questions/:id/analytics
   * @desc    Get question analytics and performance data
   * @access  Private (Authenticated users)
   * @params  id - Question ID
   */
  router.get(
    '/:id/analytics',
    ValidationMiddleware.validateUUID('id'),
    questionController.getQuestionStats.bind(questionController)
  );

  // ============================================================================
  // ADVANCED FEATURES (Future Implementation)
  // ============================================================================

  /**
   * Future routes to be implemented:
   *
   * @route   POST /api/questions/import
   * @desc    Import questions from file or external source
   *
   * @route   POST /api/questions/export
   * @desc    Export questions to various formats
   *
   * @route   GET /api/questions/templates
   * @desc    Get question templates by type
   *
   * @route   POST /api/questions/from-template
   * @desc    Create question from template
   *
   * @route   POST /api/questions/:id/duplicate
   * @desc    Duplicate an existing question
   *
   * @route   POST /api/questions/:id/validate
   * @desc    Validate question content and test cases
   *
   * @route   GET /api/questions/:id/versions
   * @desc    Get question version history
   *
   * @route   POST /api/questions/:id/versions/:version/restore
   * @desc    Restore question to specific version
   */

  return router;
}
