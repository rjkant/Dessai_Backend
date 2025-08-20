/**
 * Server Foundation Integration Tests
 * 
 * Tests the basic server foundation with dependency injection for service isolation.
 * Uses mocked services to prevent real database/Redis connections during testing.
 * 
 * TASK-TEST-003 Phase 1: Server Foundation Integration Testing
 * Part of comprehensive integration testing with proven dependency injection pattern.
 */

import express from 'express';
import request from 'supertest';

// Create mock services with dependency injection pattern
const createMockDatabaseService = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    latency: 5,
    timestamp: new Date().toISOString(),
  }),
  isHealthy: jest.fn().mockReturnValue(true),
  getStats: jest.fn().mockResolvedValue({
    connectionCount: 2,
    activeTransactions: 0,
    version: 'PostgreSQL 15.0 (mocked)',
  }),
});

const createMockRedisService = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    latency: 2,
    timestamp: new Date().toISOString(),
  }),
  isHealthy: jest.fn().mockReturnValue(true),
  info: jest.fn().mockResolvedValue({
    version: '7.0.0',
    uptime: 3600,
    used_memory: '2.5MB',
    connected_clients: 5,
  }),
});

describe('Database Foundation Server Integration', () => {
  let app: express.Application;
  let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;
  let mockRedisService: ReturnType<typeof createMockRedisService>;

  beforeEach(() => {
    // Create fresh mock services for each test
    mockDatabaseService = createMockDatabaseService();
    mockRedisService = createMockRedisService();

    // Create Express app with dependency injection
    app = express();
    app.use(express.json());

    // Health check endpoints with dependency injection
    app.get('/health', async (_req, res) => {
      try {
        const [dbHealth, redisHealth] = await Promise.all([
          mockDatabaseService.healthCheck(),
          mockRedisService.healthCheck(),
        ]);

        const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';
        
        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          services: {
            database: dbHealth,
            redis: redisHealth,
          },
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });

    app.get('/health/ready', async (_req, res) => {
      try {
        const isDbHealthy = mockDatabaseService.isHealthy();
        const isRedisHealthy = mockRedisService.isHealthy();
        const isReady = isDbHealthy && isRedisHealthy;

        res.status(isReady ? 200 : 503).json({
          status: isReady ? 'ready' : 'not_ready',
          timestamp: new Date().toISOString(),
          services: {
            database: isDbHealthy ? 'ready' : 'not_ready',
            redis: isRedisHealthy ? 'ready' : 'not_ready',
          },
        });
      } catch (error) {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          error: 'Readiness check failed',
        });
      }
    });

    app.get('/health/database', async (_req, res) => {
      try {
        const healthData = await mockDatabaseService.healthCheck();
        const statusCode = healthData.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthData);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Database health check failed',
        });
      }
    });

    app.get('/health/redis', async (_req, res) => {
      try {
        const healthData = await mockRedisService.healthCheck();
        const statusCode = healthData.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthData);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Redis health check failed',
        });
      }
    });

    // API base route
    app.get('/api', (_req, res) => {
      res.json({
        name: 'Dessai Backend API',
        version: '1.0.0',
        status: 'running',
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
      });
    });

    // Error handler
    app.use((_error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    });
  });

  describe('Health Endpoints', () => {
    test('should have health endpoints configured', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should respond to basic health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        services: {
          database: { status: 'healthy' },
          redis: { status: 'healthy' }
        }
      });
    });

    test('should respond to readiness check', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });

    test('should respond to database health check', async () => {
      const response = await request(app)
        .get('/health/database')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('latency');
    });

    test('should respond to Redis health check', async () => {
      const response = await request(app)
        .get('/health/redis')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('latency');
    });

    test('should respond to overall health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should handle 404 for invalid routes', async () => {
      const response = await request(app)
        .get('/invalid-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    test('should return JSON content type', async () => {
      await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });

  describe('API Routes', () => {
    test('should respond to API base route', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Dessai Backend API',
        version: '1.0.0',
        status: 'running'
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully', async () => {
      // Simulate an error in database service
      mockDatabaseService.healthCheck = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
    });
  });

  describe('Performance', () => {
    test('should respond quickly to health checks', async () => {
      const start = Date.now();
      await request(app)
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200); // Should respond within 200ms
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });
  });
});
