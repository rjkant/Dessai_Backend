/**
 * Performance Analytics Routes
 * 
 * Simplified Express routing configuration for performance analytics API endpoints.
 * 
 * @author Senior Software Engineer
 * @version Epic 5 Task 5.2: Performance Analytics
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, query, param } from 'express-validator';
import { PerformanceAnalyticsController } from '../controllers/performance-analytics.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { UserRole } from '../types/auth.types';
import { 
  PerformanceMetricType, 
  MetricAggregationType, 
  AnalysisPeriod 
} from '../types/performance-analytics.types';

/**
 * Create Performance Analytics Routes
 */
export function createPerformanceAnalyticsRoutes(
  analyticsController: PerformanceAnalyticsController
): Router {
  const router = Router();

  // Rate limiting
  const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { success: false, error: 'Rate limit exceeded' }
  });

  const heavyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: { success: false, error: 'Rate limit exceeded' }
  });

  // ===== PERFORMANCE METRICS ROUTES =====

  /**
   * Calculate candidate performance metrics
   */
  router.post(
    '/metrics/calculate',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [
      body('candidateId').isUUID().withMessage('Invalid candidate ID'),
      body('assessmentId').optional().isUUID().withMessage('Invalid assessment ID')
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.calculateMetrics.bind(analyticsController)
  );

  /**
   * Get aggregated metrics
   */
  router.get(
    '/metrics/aggregated',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [
      query('metricType').isIn(Object.values(PerformanceMetricType)),
      query('aggregationType').isIn(Object.values(MetricAggregationType)),
      query('period').isIn(Object.values(AnalysisPeriod))
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.getAggregatedMetrics.bind(analyticsController)
  );

  // ===== CANDIDATE PERFORMANCE PROFILING =====

  /**
   * Generate candidate profile
   */
  router.post(
    '/profile/:candidateId',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [param('candidateId').isUUID().withMessage('Invalid candidate ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.generateProfile.bind(analyticsController)
  );

  /**
   * Get candidate profile
   */
  router.get(
    '/profile/:candidateId',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER, UserRole.CANDIDATE]) as any,
    [param('candidateId').isUUID().withMessage('Invalid candidate ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.getProfile.bind(analyticsController)
  );

  /**
   * Compare candidates
   */
  router.post(
    '/compare',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [
      body('candidateIds').isArray({ min: 2, max: 10 }).withMessage('Must provide 2-10 candidate IDs'),
      body('candidateIds.*').isUUID().withMessage('All candidate IDs must be valid UUIDs')
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.compareCandidates.bind(analyticsController)
  );

  // ===== TREND ANALYSIS =====

  /**
   * Analyze trends
   */
  router.post(
    '/trends',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [
      body('candidateId').isUUID().withMessage('Invalid candidate ID'),
      body('metricType').isIn(Object.values(PerformanceMetricType)),
      body('period').isIn(Object.values(AnalysisPeriod))
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.analyzeTrends.bind(analyticsController)
  );

  /**
   * Get organization trends
   */
  router.get(
    '/trends/organization',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    [
      query('organizationId').isUUID().withMessage('Invalid organization ID'),
      query('period').optional().isIn(Object.values(AnalysisPeriod))
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.getOrganizationTrends.bind(analyticsController)
  );

  // ===== ASSESSMENT ANALYTICS =====

  /**
   * Get assessment summary
   */
  router.get(
    '/assessment/:assessmentId/candidate/:candidateId',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [
      param('assessmentId').isUUID().withMessage('Invalid assessment ID'),
      param('candidateId').isUUID().withMessage('Invalid candidate ID')
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.getAssessmentSummary.bind(analyticsController)
  );

  /**
   * Get assessment analytics
   */
  router.get(
    '/assessments/organization/:organizationId',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    [param('organizationId').isUUID().withMessage('Invalid organization ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.getAssessmentAnalytics.bind(analyticsController)
  );

  // ===== PREDICTIONS =====

  /**
   * Generate prediction
   */
  router.post(
    '/predictions',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [
      body('candidateId').isUUID().withMessage('Invalid candidate ID'),
      body('modelType').isIn(['PERFORMANCE_FORECASTING', 'SKILL_LEVEL_PREDICTION', 'SUCCESS_PROBABILITY', 'IMPROVEMENT_RATE', 'HIRING_RECOMMENDATION', 'RISK_ASSESSMENT'])
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.generatePrediction.bind(analyticsController)
  );

  /**
   * Get prediction accuracy
   */
  router.get(
    '/predictions/accuracy',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    ValidationMiddleware.handleValidationErrors,
    analyticsController.getPredictionAccuracy.bind(analyticsController)
  );

  // ===== DASHBOARDS =====

  /**
   * Create dashboard
   */
  router.post(
    '/dashboards',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    [
      body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Dashboard name must be 1-100 characters'),
      body('organizationId').isUUID().withMessage('Invalid organization ID')
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.createDashboard.bind(analyticsController)
  );

  /**
   * Get dashboard
   */
  router.get(
    '/dashboards/:dashboardId',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [param('dashboardId').isUUID().withMessage('Invalid dashboard ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.getDashboard.bind(analyticsController)
  );

  /**
   * Update dashboard
   */
  router.put(
    '/dashboards/:dashboardId',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    [param('dashboardId').isUUID().withMessage('Invalid dashboard ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.updateDashboard.bind(analyticsController)
  );

  /**
   * Delete dashboard
   */
  router.delete(
    '/dashboards/:dashboardId',
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    [param('dashboardId').isUUID().withMessage('Invalid dashboard ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.deleteDashboard.bind(analyticsController)
  );

  // ===== REPORTS =====

  /**
   * Generate report
   */
  router.post(
    '/reports/generate',
    heavyLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    [
      body('reportType').isIn(['CANDIDATE_SUMMARY', 'ORGANIZATION_OVERVIEW', 'TREND_ANALYSIS', 'COMPARATIVE_ANALYSIS', 'PREDICTION_SUMMARY']),
      body('organizationId').isUUID().withMessage('Invalid organization ID')
    ],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.generateReport.bind(analyticsController)
  );

  /**
   * Export analytics
   */
  router.get(
    '/export',
    heavyLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER]) as any,
    [query('organizationId').isUUID().withMessage('Invalid organization ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.exportAnalytics.bind(analyticsController)
  );

  // ===== BENCHMARKING =====

  /**
   * Get benchmarks
   */
  router.get(
    '/benchmarks',
    standardLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER]) as any,
    [query('organizationId').isUUID().withMessage('Invalid organization ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.getBenchmarks.bind(analyticsController)
  );

  /**
   * Update benchmarks
   */
  router.post(
    '/benchmarks/update',
    heavyLimiter,
    AuthMiddleware.authenticate as any,
    roleGuard([UserRole.ADMIN]) as any,
    [body('organizationId').isUUID().withMessage('Invalid organization ID')],
    ValidationMiddleware.handleValidationErrors,
    analyticsController.updateBenchmarks.bind(analyticsController)
  );

  // ===== HEALTH =====

  /**
   * Get health status
   */
  router.get(
    '/health',
    analyticsController.getHealth.bind(analyticsController)
  );

  return router;
}
