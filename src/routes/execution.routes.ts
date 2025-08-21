/**
 * Code Execution Routes
 * REST API routes for secure code execution
 */

import { Router } from 'express';
import { ExecutionController } from '../controllers/execution.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { UserRole } from '../types/auth.types';

const router = Router();
const executionController = new ExecutionController();

// Apply authentication to all execution routes
router.use(AuthMiddleware.authenticate as any);

// ============================================================================
// CODE EXECUTION ROUTES
// ============================================================================

/**
 * @route POST /api/execution/execute
 * @desc Execute code with optional test cases
 * @access Candidate, Interviewer, Admin
 */
router.post(
  '/execute',
  roleGuard([UserRole.CANDIDATE, UserRole.INTERVIEWER, UserRole.ADMIN]) as any,
  executionController.executeCode
);

/**
 * @route GET /api/execution/status/:executionId
 * @desc Get execution status and progress
 * @access Candidate, Interviewer, Admin
 */
router.get(
  '/status/:executionId',
  roleGuard([UserRole.CANDIDATE, UserRole.INTERVIEWER, UserRole.ADMIN]) as any,
  executionController.getExecutionStatus
);

/**
 * @route POST /api/execution/validate
 * @desc Validate code without execution
 * @access Candidate, Interviewer, Admin
 */
router.post(
  '/validate',
  roleGuard([UserRole.CANDIDATE, UserRole.INTERVIEWER, UserRole.ADMIN]) as any,
  executionController.validateCode
);

/**
 * @route POST /api/execution/bulk
 * @desc Execute multiple code submissions
 * @access Interviewer, Admin
 */
router.post(
  '/bulk',
  roleGuard([UserRole.INTERVIEWER, UserRole.ADMIN]) as any,
  executionController.executeBulk
);

// ============================================================================
// SYSTEM INFORMATION ROUTES
// ============================================================================

/**
 * @route GET /api/execution/languages
 * @desc Get list of supported programming languages
 * @access Candidate, Interviewer, Admin
 */
router.get(
  '/languages',
  roleGuard([UserRole.CANDIDATE, UserRole.INTERVIEWER, UserRole.ADMIN]) as any,
  executionController.getSupportedLanguages
);

/**
 * @route GET /api/execution/status
 * @desc Get system status and health
 * @access Admin
 */
router.get('/status', roleGuard([UserRole.ADMIN]) as any, executionController.getSystemStatus);

// ============================================================================
// EXECUTION HISTORY ROUTES
// ============================================================================

/**
 * @route GET /api/execution/history
 * @desc Get execution history with filtering
 * @access Interviewer, Admin
 */
router.get(
  '/history',
  roleGuard([UserRole.INTERVIEWER, UserRole.ADMIN]) as any,
  executionController.getExecutionHistory
);

export { router as executionRoutes };
