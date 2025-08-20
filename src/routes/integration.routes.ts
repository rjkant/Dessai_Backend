/**
 * Integration Services Routes
 * Persona: Senior Software Engineer
 * 
 * Express routing configuration for integration management endpoints:
 * - ATS provider configuration and operations
 * - Calendar provider configuration and operations  
 * - Data synchronization endpoints
 * - Webhook handling
 * - Health monitoring and testing
 */

import { Router, Request, Response } from 'express';
import { IntegrationController } from '../controllers/integration.controller.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { roleGuard } from '../middleware/role.middleware.js';
import { UserRole } from '../types/auth.types.js';

/**
 * Create integration routes
 */
export function createIntegrationRoutes(integrationController: IntegrationController): Router {
  const router = Router();

  // ============================================================================
  // ATS INTEGRATION ROUTES
  // ============================================================================

  /**
   * Configure ATS provider for organization
   * POST /api/integrations/ats/configure
   * Requires: admin role
   */
  router.post('/ats/configure',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    (req: Request, res: Response) => integrationController.configureATS(req as any, res)
  );

  /**
   * Get candidates from ATS
   * GET /api/integrations/ats/:provider/candidates
   */
  router.get('/ats/:provider/candidates',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    (req: Request, res: Response) => integrationController.getCandidates(req as any, res)
  );

  /**
   * Create candidate in ATS
   * POST /api/integrations/ats/:provider/candidates
   */
  router.post('/ats/:provider/candidates',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    (req: Request, res: Response) => integrationController.createCandidate(req as any, res)
  );

  /**
   * Get jobs from ATS
   * GET /api/integrations/ats/:provider/jobs
   */
  router.get('/ats/:provider/jobs',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    (req: Request, res: Response) => integrationController.getJobs(req as any, res)
  );

  /**
   * Create job in ATS
   * POST /api/integrations/ats/:provider/jobs
   */
  router.post('/ats/:provider/jobs',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    (req: Request, res: Response) => integrationController.createJob(req as any, res)
  );

  /**
   * Get applications from ATS
   * GET /api/integrations/ats/:provider/applications
   */
  router.get('/ats/:provider/applications',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    (req: Request, res: Response) => integrationController.getApplications(req as any, res)
  );

  // ============================================================================
  // DATA SYNCHRONIZATION ROUTES
  // ============================================================================

  /**
   * Start data synchronization with ATS
   * POST /api/integrations/sync/start
   */
  router.post('/sync/start',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    (req: Request, res: Response) => integrationController.startDataSync(req as any, res)
  );

  /**
   * Get synchronization status
   * GET /api/integrations/sync/status/:syncId
   */
  router.get('/sync/status/:syncId',
    AuthMiddleware.authenticate as any,
    (req: Request, res: Response) => integrationController.getSyncStatus(req as any, res)
  );

  // ============================================================================
  // CALENDAR INTEGRATION ROUTES
  // ============================================================================

  /**
   * Configure calendar provider for organization
   * POST /api/integrations/calendar/configure
   */
  router.post('/calendar/configure',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    (req: Request, res: Response) => integrationController.configureCalendar(req as any, res)
  );

  /**
   * Get OAuth authorization URL for calendar provider
   * GET /api/integrations/calendar/:provider/auth-url
   */
  router.get('/calendar/:provider/auth-url',
    AuthMiddleware.authenticate as any,
    (req: Request, res: Response) => integrationController.getCalendarAuthUrl(req as any, res)
  );

  /**
   * Exchange authorization code for access token
   * POST /api/integrations/calendar/:provider/exchange-code
   */
  router.post('/calendar/:provider/exchange-code',
    AuthMiddleware.authenticate as any,
    (req: Request, res: Response) => integrationController.exchangeCalendarCode(req as any, res)
  );

  /**
   * Get user calendars
   * GET /api/integrations/calendar/:provider/calendars
   */
  router.get('/calendar/:provider/calendars',
    AuthMiddleware.authenticate as any,
    (req: Request, res: Response) => integrationController.getCalendars(req as any, res)
  );

  /**
   * Create calendar event
   * POST /api/integrations/calendar/:provider/events
   */
  router.post('/calendar/:provider/events',
    AuthMiddleware.authenticate as any,
    (req: Request, res: Response) => integrationController.createCalendarEvent(req as any, res)
  );

  /**
   * Schedule interview meeting
   * POST /api/integrations/calendar/:provider/meetings
   */
  router.post('/calendar/:provider/meetings',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    (req: Request, res: Response) => integrationController.scheduleMeeting(req as any, res)
  );

  /**
   * Find available time slots
   * POST /api/integrations/calendar/:provider/available-slots
   */
  router.post('/calendar/:provider/available-slots',
    AuthMiddleware.authenticate as any,
    (req: Request, res: Response) => integrationController.findAvailableSlots(req as any, res)
  );

  // ============================================================================
  // WEBHOOK ROUTES
  // ============================================================================

  /**
   * Handle webhook from external providers
   * POST /api/integrations/webhooks/:provider
   */
  router.post('/webhooks/:provider',
    (req: Request, res: Response) => integrationController.handleWebhook(req as any, res)
  );

  // ============================================================================
  // HEALTH AND TESTING ROUTES
  // ============================================================================

  /**
   * Get integration health status
   * GET /api/integrations/health
   */
  router.get('/health',
    AuthMiddleware.authenticate as any,
    (req: Request, res: Response) => integrationController.getHealthStatus(req as any, res)
  );

  /**
   * Test integration connectivity
   * POST /api/integrations/test/:provider
   */
  router.post('/test/:provider',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN]) as any,
    (req: Request, res: Response) => integrationController.testIntegration(req as any, res)
  );

  return router;
}
