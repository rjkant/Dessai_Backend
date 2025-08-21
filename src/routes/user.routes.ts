/**
 * User Profile Management Routes
 * TASK-CG-004: User Profile Management System
 * Persona: Senior Software Engineer
 *
 * RESTful API routes for user profile management operations
 * with authentication, validation, and authorization middleware.
 */

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { PrismaClient } from '@prisma/client';
import { AuthMiddleware } from '../middleware/auth.middleware';

// ============================================================================
// DEPENDENCY INJECTION SETUP
// ============================================================================

const prisma = new PrismaClient();
const userService = new UserService(prisma);
const userController = new UserController(userService);

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * POST /api/users
 * Create a new user profile
 * Public endpoint for user registration
 */
router.post('/', userController.createUser.bind(userController));

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

/**
 * GET /api/users/me
 * Get current authenticated user's profile
 */
router.get(
  '/me',
  AuthMiddleware.authenticate as any,
  userController.getCurrentUser.bind(userController)
);

/**
 * PUT /api/users/me
 * Update current authenticated user's profile
 */
router.put(
  '/me',
  AuthMiddleware.authenticate as any,
  userController.updateCurrentUser.bind(userController)
);

/**
 * GET /api/users/me/preferences
 * Get current user's preferences
 */
router.get(
  '/me/preferences',
  AuthMiddleware.authenticate as any,
  userController.getUserPreferences.bind(userController)
);

/**
 * PUT /api/users/me/preferences
 * Update current user's preferences
 */
router.put(
  '/me/preferences',
  AuthMiddleware.authenticate as any,
  userController.updateUserPreferences.bind(userController)
);

/**
 * GET /api/users/me/activity
 * Get current user's activity log
 */
router.get(
  '/me/activity',
  AuthMiddleware.authenticate as any,
  userController.getUserActivity.bind(userController)
);

// ============================================================================
// ADMIN/MANAGER ROUTES (Role-based access control)
// ============================================================================

/**
 * GET /api/users
 * Search and list users with filters
 * Requires authentication and appropriate permissions
 */
router.get(
  '/',
  AuthMiddleware.authenticate as any,
  userController.searchUsers.bind(userController)
);

/**
 * GET /api/users/:id
 * Get user profile by ID
 * Requires authentication and appropriate permissions
 */
router.get(
  '/:id',
  AuthMiddleware.authenticate as any,
  userController.getUserById.bind(userController)
);

/**
 * GET /api/users/email/:email
 * Get user profile by email
 * Requires authentication and appropriate permissions
 */
router.get(
  '/email/:email',
  AuthMiddleware.authenticate as any,
  userController.getUserByEmail.bind(userController)
);

/**
 * PUT /api/users/:id
 * Update user profile by ID
 * Requires authentication and appropriate permissions
 */
router.put(
  '/:id',
  AuthMiddleware.authenticate as any,
  userController.updateUser.bind(userController)
);

/**
 * DELETE /api/users/:id
 * Delete user profile (soft delete)
 * Requires authentication and appropriate permissions
 */
router.delete(
  '/:id',
  AuthMiddleware.authenticate as any,
  userController.deleteUser.bind(userController)
);

/**
 * GET /api/users/:id/preferences
 * Get user preferences by ID
 * Requires authentication and appropriate permissions
 */
router.get(
  '/:id/preferences',
  AuthMiddleware.authenticate as any,
  userController.getUserPreferences.bind(userController)
);

/**
 * PUT /api/users/:id/preferences
 * Update user preferences by ID
 * Requires authentication and appropriate permissions
 */
router.put(
  '/:id/preferences',
  AuthMiddleware.authenticate as any,
  userController.updateUserPreferences.bind(userController)
);

/**
 * POST /api/users/:id/verify-email
 * Verify user email
 * Requires authentication and appropriate permissions
 */
router.post(
  '/:id/verify-email',
  AuthMiddleware.authenticate as any,
  userController.verifyEmail.bind(userController)
);

/**
 * GET /api/users/:id/activity
 * Get user activity log by ID
 * Requires authentication and appropriate permissions
 */
router.get(
  '/:id/activity',
  AuthMiddleware.authenticate as any,
  userController.getUserActivity.bind(userController)
);

// ============================================================================
// MIDDLEWARE ERROR HANDLING
// ============================================================================

/**
 * Error handling middleware specific to user routes
 */
router.use((error: any, _req: any, res: any, next: any) => {
  // User-specific error handling
  if (error.name === 'UserError') {
    return res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
      },
    });
  }

  // Pass to global error handler
  next(error);
});

export { router as userRoutes };
