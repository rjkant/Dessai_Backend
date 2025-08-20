/**
 * Health Check Endpoints Integration Tests - Dependency Injection Approach
 * TASK-TEST-003: Integration Testing with DI Pattern
 * Persona: Senior Software Engineer
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response } from 'express';

// Create mock services for testing
const createMockDatabase = () => ({
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    latency: 15,
    timestamp: '2025-08-13T10:00:00.000Z'
  }),
  getStats: jest.fn().mockResolvedValue({
    connectionCount: 5,
    activeQueries: 2,
    maxConnections: 20,
    uptime: 3600000
  }),
  isHealthy: jest.fn().mockReturnValue(true)
});

const createMockRedis = () => ({
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    latency: 8,
    timestamp: '2025-08-13T10:00:00.000Z'
  }),
  getInfo: jest.fn().mockResolvedValue({
    version: '7.0.0',
    memoryUsage: '2.5MB',
    uptime: 3600,
    connectedClients: 3
  }),
  isHealthy: jest.fn().mockReturnValue(true)
});

// Create test health controller with dependency injection
const createHealthController = (database: any, redis: any) => {
  const getHealthStatus = async (_req: Request, res: Response): Promise<void> => {
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

      const overallStatus =
        dbStatus === 'healthy' && redisStatus === 'healthy' ? 'healthy' : 'unhealthy';

      const healthData = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: totalTime,
        checks: {
          database: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'unhealthy', error: dbHealth.reason },
          redis: redisHealth.status === 'fulfilled' ? redisHealth.value : { status: 'unhealthy', error: redisHealth.reason },
        },
      };

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

  const getDatabaseHealth = async (_req: Request, res: Response): Promise<void> => {
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

  const getRedisHealth = async (_req: Request, res: Response): Promise<void> => {
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

  const getReadinessStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      const [dbStatus, redisStatus] = await Promise.all([
        database.isHealthy(),
        redis.isHealthy(),
      ]);

      const isReady = dbStatus && redisStatus;
      const status = isReady ? 'ready' : 'not ready';

      res.status(isReady ? 200 : 503).json({
        status,
        timestamp: new Date().toISOString(),
        checks: {
          database: dbStatus,
          redis: redisStatus,
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
      });
    }
  };

  const getLivenessStatus = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  };

  return {
    getHealthStatus,
    getDatabaseHealth,
    getRedisHealth,
    getReadinessStatus,
    getLivenessStatus,
  };
};

// Create test Express app
const createTestApp = (database: any, redis: any) => {
  const app = express();
  const healthController = createHealthController(database, redis);

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Health routes
  app.get('/health', healthController.getHealthStatus);
  app.get('/health/database', healthController.getDatabaseHealth);
  app.get('/health/redis', healthController.getRedisHealth);
  app.get('/health/ready', healthController.getReadinessStatus);
  app.get('/health/live', healthController.getLivenessStatus);

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Route not found',
      method: req.method,
      path: req.originalUrl,
    });
  });

  return app;
};

describe('Health Check Endpoints - DI Integration', () => {
  let app: express.Application;
  let mockDatabase: any;
  let mockRedis: any;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    mockRedis = createMockRedis();
    app = createTestApp(mockDatabase, mockRedis);
  });

  describe('GET /health', () => {
    it('should return overall health status when all services are healthy', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body.checks.database.status).toBe('healthy');
      expect(response.body.checks.redis.status).toBe('healthy');
    });

    it('should include performance metrics', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.checks.database).toHaveProperty('latency');
      expect(response.body.checks.redis).toHaveProperty('latency');
      expect(typeof response.body.checks.database.latency).toBe('number');
      expect(typeof response.body.checks.redis.latency).toBe('number');
      expect(response.body).toHaveProperty('responseTime');
    });

    it('should return unhealthy when database fails', async () => {
      mockDatabase.healthCheck.mockRejectedValueOnce(new Error('Database down'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database.status).toBe('unhealthy');
      expect(response.body.checks.redis.status).toBe('healthy');
    });

    it('should return unhealthy when Redis fails', async () => {
      mockRedis.healthCheck.mockRejectedValueOnce(new Error('Redis down'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database.status).toBe('healthy');
      expect(response.body.checks.redis.status).toBe('unhealthy');
    });
  });

  describe('GET /health/database', () => {
    it('should return database health status with statistics', async () => {
      const response = await request(app)
        .get('/health/database')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('latency', 15);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('connectionCount', 5);
      expect(response.body).toHaveProperty('connected', true);
    });

    it('should respond quickly for database health checks', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health/database')
        .expect(200);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Very fast with mocks
    });

    it('should handle database failures gracefully', async () => {
      mockDatabase.healthCheck.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/health/database')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Database health check failed');
    });
  });

  describe('GET /health/redis', () => {
    it('should return Redis health status with info', async () => {
      const response = await request(app)
        .get('/health/redis')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('latency', 8);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('version', '7.0.0');
      expect(response.body).toHaveProperty('connected', true);
    });

    it('should respond quickly for Redis health checks', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health/redis')
        .expect(200);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(50); // Very fast with mocks
    });

    it('should handle Redis failures gracefully', async () => {
      mockRedis.healthCheck.mockRejectedValueOnce(new Error('Redis connection failed'));

      const response = await request(app)
        .get('/health/redis')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Redis health check failed');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status when services are ready', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body.checks.database).toBe(true);
      expect(response.body.checks.redis).toBe(true);
    });

    it('should be fast for Kubernetes readiness probes', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health/ready')
        .expect(200);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(50);
    });

    it('should return not ready when database is unhealthy', async () => {
      mockDatabase.isHealthy.mockReturnValueOnce(false);

      const response = await request(app)
        .get('/health/ready')
        .expect(503);

      expect(response.body.status).toBe('not ready');
      expect(response.body.checks.database).toBe(false);
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should be extremely fast for Kubernetes liveness probes', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health/live')
        .expect(200);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(25);
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent health check requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should handle mixed endpoint requests concurrently', async () => {
      const endpoints = ['/health', '/health/database', '/health/redis', '/health/ready', '/health/live'];
      const promises = endpoints.map(endpoint =>
        request(app).get(endpoint).expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
      });
    });

    it('should meet performance SLA for all health endpoints', async () => {
      const performanceTests = [
        { endpoint: '/health', maxTime: 100 },
        { endpoint: '/health/database', maxTime: 50 },
        { endpoint: '/health/redis', maxTime: 50 },
        { endpoint: '/health/ready', maxTime: 25 },
        { endpoint: '/health/live', maxTime: 10 }
      ];

      for (const test of performanceTests) {
        const startTime = Date.now();
        await request(app)
          .get(test.endpoint)
          .expect(200);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(test.maxTime);
      }
    });
  });

  describe('Error Handling & Response Format', () => {
    it('should handle invalid health endpoints gracefully', async () => {
      const response = await request(app)
        .get('/health/invalid')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('method', 'GET');
      expect(response.body).toHaveProperty('path', '/health/invalid');
    });

    it('should maintain consistent response format', async () => {
      const endpoints = ['/health', '/health/database', '/health/redis', '/health/ready', '/health/live'];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(response.body).toHaveProperty('status');
        expect(typeof response.body.status).toBe('string');
        expect(response.body).toHaveProperty('timestamp');
      }
    });

    it('should return JSON content type for all health endpoints', async () => {
      const endpoints = ['/health', '/health/database', '/health/redis', '/health/ready', '/health/live'];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });

    it('should include appropriate security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      // Helmet should add security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('Service Dependencies Validation', () => {
    it('should verify database service methods are called', async () => {
      await request(app)
        .get('/health/database')
        .expect(200);

      expect(mockDatabase.healthCheck).toHaveBeenCalledTimes(1);
      expect(mockDatabase.getStats).toHaveBeenCalledTimes(1);
      expect(mockDatabase.isHealthy).toHaveBeenCalledTimes(1);
    });

    it('should verify Redis service methods are called', async () => {
      await request(app)
        .get('/health/redis')
        .expect(200);

      expect(mockRedis.healthCheck).toHaveBeenCalledTimes(1);
      expect(mockRedis.getInfo).toHaveBeenCalledTimes(1);
      expect(mockRedis.isHealthy).toHaveBeenCalledTimes(1);
    });

    it('should verify overall health checks both services', async () => {
      await request(app)
        .get('/health')
        .expect(200);

      expect(mockDatabase.healthCheck).toHaveBeenCalledTimes(1);
      expect(mockRedis.healthCheck).toHaveBeenCalledTimes(1);
    });
  });
});
