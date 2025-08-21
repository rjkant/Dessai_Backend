/**
 * Integration Routes
 * Dessai Backend - External System Integrations
 */

import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/integrations/health
 * @desc    Health check for integration service
 * @access  Public
 */
router.get('/health', IntegrationController.healthCheck);

/**
 * @route   POST /api/integrations/ats/configure
 * @desc    Configure ATS provider for organization
 * @access  Private
 */
router.post('/ats/configure', AuthMiddleware.authenticate, IntegrationController.configureATS);

/**
 * @route   POST /api/integrations/ats/:provider/test
 * @desc    Test connection to ATS provider
 * @access  Private
 */
router.post(
  '/ats/:provider/test',
  AuthMiddleware.authenticate,
  IntegrationController.testConnection
);

/**
 * @route   GET /api/integrations/ats/:provider/candidates
 * @desc    Get candidates from ATS provider
 * @access  Private
 */
router.get(
  '/ats/:provider/candidates',
  AuthMiddleware.authenticate,
  IntegrationController.getCandidates
);

/**
 * @route   GET /api/integrations/ats/:provider/jobs
 * @desc    Get job positions from ATS provider
 * @access  Private
 */
router.get(
  '/ats/:provider/jobs',
  AuthMiddleware.authenticate,
  IntegrationController.getJobPositions
);

/**
 * @route   POST /api/integrations/ats/:provider/candidates
 * @desc    Create candidate in ATS provider
 * @access  Private
 */
router.post(
  '/ats/:provider/candidates',
  AuthMiddleware.authenticate,
  IntegrationController.createCandidate
);

/**
 * @route   PUT /api/integrations/ats/:provider/candidates/:candidateId
 * @desc    Update candidate in ATS provider
 * @access  Private
 */
router.put(
  '/ats/:provider/candidates/:candidateId',
  AuthMiddleware.authenticate,
  IntegrationController.updateCandidate
);

/**
 * @route   POST /api/integrations/ats/:provider/sync
 * @desc    Synchronize data from ATS provider
 * @access  Private
 */
router.post('/ats/:provider/sync', AuthMiddleware.authenticate, IntegrationController.syncData);

/**
 * @route   POST /api/integrations/ats/:provider/webhook
 * @desc    Handle webhook from ATS provider
 * @access  Public (webhook endpoint)
 */
router.post('/ats/:provider/webhook', IntegrationController.handleWebhook);

/**
 * @route   GET /api/integrations/metrics
 * @desc    Get integration metrics
 * @access  Private
 */
router.get('/metrics', AuthMiddleware.authenticate, IntegrationController.getMetrics);

/**
 * @route   GET /api/integrations/providers
 * @desc    Get available ATS providers
 * @access  Private
 */
router.get('/providers', AuthMiddleware.authenticate, IntegrationController.getProviders);

export default router;
