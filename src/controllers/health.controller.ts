import { Request, Response } from 'express';
import { database } from '@/services/database.service';
import { redis } from '@/services/redis.service';

/**
 * Health Check Controller
 * Provides health status for application dependencies
 */

/**
 * Get overall health status
 */
export const getHealthStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();

    // Check all services
    const [dbHealth, redisHealth] = await Promise.allSettled([
      database.healthCheck(),
      redis.healthCheck(),
    ]);

    const totalTime = Date.now() - startTime;

    // Determine overall status
    const dbStatus = dbHealth.status === 'fulfilled' ? dbHealth.value.status : 'unhealthy';
    const redisStatus = redisHealth.status === 'fulfilled' ? redisHealth.value.status : 'unhealthy';
    
    const overallStatus = dbStatus === 'healthy' && redisStatus === 'healthy' ? 'healthy' : 'unhealthy';

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbHealth.status === 'fulfilled' ? dbHealth.value : { 
          status: 'unhealthy', 
          latency: -1, 
          timestamp: new Date().toISOString() 
        },
        redis: redisHealth.status === 'fulfilled' ? redisHealth.value : { 
          status: 'unhealthy', 
          latency: -1, 
          timestamp: new Date().toISOString() 
        },
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        },
        cpu: {
          usage: process.cpuUsage(),
        },
      },
      responseTime: totalTime,
    };

    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
};

/**
 * Get database health status
 */
export const getDatabaseHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const health = await database.healthCheck();
    const stats = await database.getStats();

    const healthData = {
      ...health,
      stats,
      connected: database.isHealthy(),
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database health check failed',
    });
  }
};

/**
 * Get Redis health status
 */
export const getRedisHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const health = await redis.healthCheck();
    const info = await redis.getInfo();

    const healthData = {
      ...health,
      info,
      connected: redis.isHealthy(),
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('Redis health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Redis health check failed',
    });
  }
};

/**
 * Simple readiness probe
 */
export const getReadiness = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Quick connectivity checks
    const dbConnected = database.isHealthy();
    const redisConnected = redis.isHealthy();

    if (dbConnected && redisConnected) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ 
        status: 'not ready',
        database: dbConnected,
        redis: redisConnected,
      });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: 'Readiness check failed' });
  }
};

/**
 * Simple liveness probe
 */
export const getLiveness = (_req: Request, res: Response): void => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
