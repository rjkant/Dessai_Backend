/**
 * Health Check Endpoints Integration Tests - Mock-Based
 * TASK-TEST-003: Integration Testing with Proper Mocking
 * @testing persona validation
 */

import request from 'supertest';
import DessaiServer from '@/server';

// Mock the services before importing the health controller
jest.mock('@/services/database.service', () => ({
  database: {
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
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('@/services/redis.service', () => ({
  redis: {
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
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockReturnValue(true)
  }
}));

describe('Health Check Endpoints - Mock Integration', () => {
  let app: any;

  beforeAll(async () => {
    // Use the build function for testing
    app = DessaiServer.build();
  });

  afterAll(async () => {
    // Clean up (no real connections to close with mocks)
    // Test cleanup is handled by Jest
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
    });

    it('should include performance metrics', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.checks.database).toHaveProperty('latency');
      expect(response.body.checks.redis).toHaveProperty('latency');
      expect(typeof response.body.checks.database.latency).toBe('number');
      expect(typeof response.body.checks.redis.latency).toBe('number');
    });
  });

  describe('GET /health/database', () => {
    it('should return database health status with statistics', async () => {
      const response = await request(app)
        .get('/health/database')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('latency');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should respond quickly for database health checks', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health/database')
        .expect(200);
      const duration = Date.now() - startTime;
      
      // Should respond within 1 second (with mocks it should be much faster)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('GET /health/redis', () => {
    it('should return Redis health status with info', async () => {
      const response = await request(app)
        .get('/health/redis')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('latency');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should respond quickly for Redis health checks', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health/redis')
        .expect(200);
      const duration = Date.now() - startTime;
      
      // Should respond within 500ms (with mocks it should be much faster)
      expect(duration).toBeLessThan(500);
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status when services are ready', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should be fast for Kubernetes readiness probes', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health/ready')
        .expect(200);
      const duration = Date.now() - startTime;
      
      // Readiness probe should be very fast
      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should be extremely fast for Kubernetes liveness probes', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health/live')
        .expect(200);
      const duration = Date.now() - startTime;
      
      // Liveness probe should be instant
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Health Check Performance', () => {
    it('should handle concurrent health check requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
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
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid health endpoints gracefully', async () => {
      const response = await request(app)
        .get('/health/invalid')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
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
  });

  describe('Response Times', () => {
    it('should meet performance SLA for all health endpoints', async () => {
      const performanceTests = [
        { endpoint: '/health', maxTime: 200 },
        { endpoint: '/health/database', maxTime: 100 },
        { endpoint: '/health/redis', maxTime: 100 },
        { endpoint: '/health/ready', maxTime: 50 },
        { endpoint: '/health/live', maxTime: 25 }
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

  describe('Content Type and Headers', () => {
    it('should return JSON content type for all health endpoints', async () => {
      const endpoints = ['/health', '/health/database', '/health/redis', '/health/ready', '/health/live'];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      // Health endpoints should not be cached
      expect(response.headers['cache-control']).toBeTruthy();
    });
  });

  describe('Service Failure Scenarios', () => {
    it('should handle database service failures gracefully', async () => {
      // Mock database failure
      const { database } = require('@/services/database.service');
      const originalHealthCheck = database.healthCheck;
      database.healthCheck.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/health/database')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Database health check failed');

      // Restore original mock
      database.healthCheck = originalHealthCheck;
    });

    it('should handle Redis service failures gracefully', async () => {
      // Mock Redis failure
      const { redis } = require('@/services/redis.service');
      const originalHealthCheck = redis.healthCheck;
      redis.healthCheck.mockRejectedValueOnce(new Error('Redis connection failed'));

      const response = await request(app)
        .get('/health/redis')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Redis health check failed');

      // Restore original mock
      redis.healthCheck = originalHealthCheck;
    });
  });
});
