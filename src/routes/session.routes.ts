/**
 * Session Routes
 * Express routes for assessment session management
 */

import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Simple role guard middleware
const roleGuard = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!(req as any).user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes((req as any).user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

// Apply authentication middleware to all session routes
router.use(AuthMiddleware.authenticate as any);

// ============================================================================
// SESSION LIFECYCLE ROUTES
// ============================================================================

/**
 * POST /api/sessions
 * Create a new assessment session
 * Access: Recruiter, Admin
 */
router.post('/', roleGuard(['RECRUITER', 'ADMIN']) as any, sessionController.createSession);

/**
 * POST /api/sessions/:sessionId/start
 * Start an assessment session
 * Access: Candidate (own session), Recruiter, Admin
 */
router.post('/:sessionId/start', sessionController.startSession);

/**
 * POST /api/sessions/:sessionId/complete
 * Complete an assessment session
 * Access: Candidate (own session), Recruiter, Admin
 */
router.post('/:sessionId/complete', sessionController.completeSession);

// ============================================================================
// SESSION STATE ROUTES
// ============================================================================

/**
 * GET /api/sessions/:sessionId
 * Get session details
 * Access: Candidate (own session), Recruiter, Admin
 */
router.get('/:sessionId', sessionController.getSession);

/**
 * GET /api/sessions/:sessionId/progress
 * Get session progress
 * Access: Candidate (own session), Recruiter, Admin
 */
router.get('/:sessionId/progress', sessionController.getSessionProgress);

/**
 * GET /api/sessions
 * List sessions with filtering and pagination
 * Access: Recruiter, Admin
 */
router.get('/', roleGuard(['RECRUITER', 'ADMIN']) as any, sessionController.listActiveSessions);

// ============================================================================
// ANSWER SUBMISSION ROUTES
// ============================================================================

/**
 * POST /api/sessions/:sessionId/answers
 * Submit an answer for a question
 * Access: Candidate (own session)
 */
router.post('/:sessionId/answers', sessionController.submitAnswer);

export { router as sessionRoutes };
