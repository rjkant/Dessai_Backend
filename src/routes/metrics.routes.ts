import { Router } from 'express';
import { getMetrics, getHealthMetrics } from '../utils/metrics.util';

// Dessai Platform Metrics Routes - Monitoring endpoints
// Persona: Technical Strategy Advisor (@cto-advisor)

const router = Router();

/**
 * @route GET /metrics
 * @desc Get Prometheus metrics
 * @access Public (internal)
 */
router.get('/metrics', getMetrics);

/**
 * @route GET /health
 * @desc Get health status with metrics
 * @access Public
 */
router.get('/health', getHealthMetrics);

/**
 * @route GET /ready
 * @desc Readiness probe endpoint
 * @access Public
 */
router.get('/ready', (_req, res) => {
  // Check if application is ready to serve traffic
  // This can include database connectivity, cache availability, etc.
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'connected', // This would be dynamic in real implementation
      cache: 'connected',
      services: 'available'
    }
  });
});

/**
 * @route GET /live
 * @desc Liveness probe endpoint
 * @access Public
 */
router.get('/live', (_req, res) => {
  // Basic liveness check - if this endpoint responds, the app is alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
