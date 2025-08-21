/**
 * Collaboration Routes
 * HTTP endpoints for real-time collaborative features
 */

import { Router } from 'express';
import { CollaborationController } from '../controllers/collaboration.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';

const router = Router();
const collaborationController = new CollaborationController();

// ============================================================================
// VALIDATION RULES
// ============================================================================

const validateSessionId = [
  param('sessionId')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Valid session ID required'),
];

const validateJoinSession = [
  ...validateSessionId,
  body('role')
    .optional()
    .isIn(['candidate', 'interviewer', 'observer'])
    .withMessage('Invalid role'),
  body('userName')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Username must be 1-100 characters'),
];

const validateCodeChange = [
  ...validateSessionId,
  body('operation')
    .isIn(['insert', 'delete', 'replace'])
    .withMessage('Operation must be insert, delete, or replace'),
  body('position').isInt({ min: 0 }).withMessage('Position must be a non-negative integer'),
  body('content').isString().withMessage('Content must be a string'),
  body('length').optional().isInt({ min: 0 }).withMessage('Length must be a non-negative integer'),
];

const validateCursorUpdate = [
  ...validateSessionId,
  body('line').isInt({ min: 0 }).withMessage('Line must be a non-negative integer'),
  body('column').isInt({ min: 0 }).withMessage('Column must be a non-negative integer'),
  body('selection').optional().isObject().withMessage('Selection must be an object'),
  body('selection.startLine').optional().isInt({ min: 0 }),
  body('selection.startColumn').optional().isInt({ min: 0 }),
  body('selection.endLine').optional().isInt({ min: 0 }),
  body('selection.endColumn').optional().isInt({ min: 0 }),
];

// ============================================================================
// COLLABORATION SESSION MANAGEMENT
// ============================================================================

/**
 * POST /api/collaboration/sessions/:sessionId/join
 * Join a collaboration session
 */
router.post(
  '/sessions/:sessionId/join',
  AuthMiddleware.authenticate as any,
  ValidationMiddleware.validate(validateJoinSession),
  collaborationController.joinSession
);

/**
 * POST /api/collaboration/sessions/:sessionId/leave
 * Leave a collaboration session
 */
router.post(
  '/sessions/:sessionId/leave',
  AuthMiddleware.authenticate as any,
  ValidationMiddleware.validate(validateSessionId),
  collaborationController.leaveSession
);

/**
 * GET /api/collaboration/sessions/:sessionId/state
 * Get current collaboration session state
 */
router.get(
  '/sessions/:sessionId/state',
  AuthMiddleware.authenticate as any,
  ValidationMiddleware.validate(validateSessionId),
  collaborationController.getSessionState
);

// ============================================================================
// REAL-TIME OPERATIONS (HTTP FALLBACKS)
// ============================================================================

/**
 * POST /api/collaboration/sessions/:sessionId/code-change
 * Apply code change (fallback for when WebSocket is not available)
 */
router.post(
  '/sessions/:sessionId/code-change',
  AuthMiddleware.authenticate as any,
  ValidationMiddleware.validate(validateCodeChange),
  collaborationController.applyCodeChange
);

/**
 * POST /api/collaboration/sessions/:sessionId/cursor
 * Update cursor position (fallback for when WebSocket is not available)
 */
router.post(
  '/sessions/:sessionId/cursor',
  AuthMiddleware.authenticate as any,
  ValidationMiddleware.validate(validateCursorUpdate),
  collaborationController.updateCursor
);

// ============================================================================
// ANALYTICS & MONITORING
// ============================================================================

/**
 * GET /api/collaboration/sessions/:sessionId/stats
 * Get collaboration statistics
 */
router.get(
  '/sessions/:sessionId/stats',
  AuthMiddleware.authenticate as any,
  ValidationMiddleware.validate(validateSessionId),
  collaborationController.getCollaborationStats
);

/**
 * GET /api/collaboration/admin/active-sessions
 * Get active collaboration sessions (admin endpoint)
 */
router.get(
  '/admin/active-sessions',
  AuthMiddleware.authenticate as any,
  // TODO: Add admin role validation middleware
  collaborationController.getActiveSessions
);

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/collaboration/health
 * Health check endpoint for collaboration service
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'collaboration',
    status: 'healthy',
    timestamp: new Date(),
    version: '1.0.0',
  });
});

export default router;
