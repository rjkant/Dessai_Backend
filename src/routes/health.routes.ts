import { Router } from 'express';
import {
  getHealthStatus,
  getDatabaseHealth,
  getRedisHealth,
  getReadiness,
  getLiveness,
} from '@/controllers/health.controller';

const router = Router();

/**
 * @route GET /health
 * @desc Get overall application health status
 * @access Public
 */
router.get('/', getHealthStatus);

/**
 * @route GET /health/database
 * @desc Get database health status
 * @access Public
 */
router.get('/database', getDatabaseHealth);

/**
 * @route GET /health/redis
 * @desc Get Redis health status
 * @access Public
 */
router.get('/redis', getRedisHealth);

/**
 * @route GET /health/ready
 * @desc Readiness probe for Kubernetes
 * @access Public
 */
router.get('/ready', getReadiness);

/**
 * @route GET /health/live
 * @desc Liveness probe for Kubernetes
 * @access Public
 */
router.get('/live', getLiveness);

export default router;
