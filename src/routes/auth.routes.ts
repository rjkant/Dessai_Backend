/**
 * Authentication Routes
 * Dessai Backend - Authentication System
 */

import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post('/login', AuthMiddleware.authRateLimit, AuthController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', AuthController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout', AuthMiddleware.authenticate, AuthController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', AuthMiddleware.authenticate, AuthController.getProfile);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', 
  AuthMiddleware.authenticate,
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/mfa/setup
 * @desc    Setup MFA for user account
 * @access  Private
 */
router.post('/mfa/setup', 
  AuthMiddleware.authenticate,
  AuthController.setupMFA
);

/**
 * @route   POST /api/auth/mfa/verify
 * @desc    Verify and enable MFA
 * @access  Private
 */
router.post('/mfa/verify', 
  AuthMiddleware.authenticate,
  AuthController.verifyMFA
);

/**
 * @route   GET /api/auth/health
 * @desc    Authentication service health check
 * @access  Public
 */
router.get('/health', AuthController.healthCheck);

export default router;
