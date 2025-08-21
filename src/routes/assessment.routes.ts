/**
 * Assessment Routes
 * TASK-CG-005: Assessment Management Core
 * Persona: Senior Software Engineer
 *
 * Express routes for assessment management API endpoints
 * with authentication, validation, and role-based access control.
 */

import { Router } from 'express';
import { AssessmentController } from '../controllers/assessment.controller';
import { AssessmentService } from '../services/assessment.service';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

export function createAssessmentRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const assessmentService = new AssessmentService(prisma);
  const assessmentController = new AssessmentController(assessmentService);

  // Apply authentication middleware to all routes
  router.use(AuthMiddleware.authenticate as any);

  // ============================================================================
  // ASSESSMENT CRUD ROUTES
  // ============================================================================

  /**
   * POST /api/assessments
   * Create a new assessment
   */
  router.post(
    '/',
    AssessmentController.createAssessmentValidation,
    assessmentController.createAssessment
  );

  /**
   * GET /api/assessments
   * Search assessments with filtering and pagination
   */
  router.get('/', AssessmentController.searchValidation, assessmentController.searchAssessments);

  /**
   * GET /api/assessments/:id
   * Get assessment by ID
   */
  router.get(
    '/:id',
    AssessmentController.assessmentIdValidation,
    assessmentController.getAssessment
  );

  /**
   * PUT /api/assessments/:id
   * Update assessment
   */
  router.put(
    '/:id',
    AssessmentController.updateAssessmentValidation,
    assessmentController.updateAssessment
  );

  /**
   * DELETE /api/assessments/:id
   * Delete assessment
   */
  router.delete(
    '/:id',
    AssessmentController.assessmentIdValidation,
    assessmentController.deleteAssessment
  );

  // ============================================================================
  // QUESTION MANAGEMENT ROUTES
  // ============================================================================

  /**
   * POST /api/assessments/:id/questions
   * Add questions to assessment
   */
  router.post(
    '/:id/questions',
    AssessmentController.addQuestionsValidation,
    assessmentController.addQuestions
  );

  /**
   * DELETE /api/assessments/:id/questions/:questionId
   * Remove question from assessment
   */
  router.delete(
    '/:id/questions/:questionId',
    AssessmentController.assessmentIdValidation,
    assessmentController.removeQuestion
  );

  // ============================================================================
  // ASSESSMENT LIFECYCLE ROUTES
  // ============================================================================

  /**
   * POST /api/assessments/:id/publish
   * Publish assessment (move from DRAFT to SCHEDULED/ACTIVE)
   */
  router.post(
    '/:id/publish',
    AssessmentController.assessmentIdValidation,
    assessmentController.publishAssessment
  );

  /**
   * POST /api/assessments/:id/activate
   * Activate assessment (move from SCHEDULED to ACTIVE)
   */
  router.post(
    '/:id/activate',
    AssessmentController.assessmentIdValidation,
    assessmentController.activateAssessment
  );

  /**
   * POST /api/assessments/:id/complete
   * Complete assessment (move from ACTIVE to COMPLETED)
   */
  router.post(
    '/:id/complete',
    AssessmentController.assessmentIdValidation,
    assessmentController.completeAssessment
  );

  // ============================================================================
  // ASSESSMENT PARTICIPATION ROUTES
  // ============================================================================

  /**
   * POST /api/assessments/start
   * Start assessment for candidate
   */
  router.post(
    '/start',
    AssessmentController.startAssessmentValidation,
    assessmentController.startAssessment
  );

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  // Apply error handling middleware
  router.use(assessmentController.handleError);

  return router;
}

export default createAssessmentRoutes;
