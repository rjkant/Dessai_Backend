import { build } from '@/server';

// Mock the database and redis services to prevent actual connections
jest.mock('@/services/database.service', () => ({
  database: {
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
  },
}));

jest.mock('@/services/redis.service', () => ({
  redis: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue({
      status: 'healthy',
      latency: 2,
      timestamp: new Date().toISOString(),
    }),
    isHealthy: jest.fn().mockReturnValue(true),
    getInfo: jest.fn().mockResolvedValue({
      memory: '1.5M',
      clients: '2',
      version: '7.0.0',
    }),
  },
}));

describe('Database Foundation Server Integration', () => {
  let app: any;

  beforeAll(async () => {
    // Build the app without starting external connections
    app = build();
  });

  describe('Health Endpoints', () => {
    it('should have health endpoints configured', () => {
      // Verify the app is built correctly
      expect(app).toBeDefined();
    });

    it('should respond to basic health check', async () => {
      const request = require('supertest');
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should respond to readiness check', async () => {
      const request = require('supertest');
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should respond to database health check', async () => {
      const request = require('supertest');
      const response = await request(app)
        .get('/health/database')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('latency');
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('connectionCount');
      expect(response.body.stats).toHaveProperty('version');
    });

    it('should respond to Redis health check', async () => {
      const request = require('supertest');
      const response = await request(app)
        .get('/health/redis')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('latency');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('memory');
      expect(response.body.info).toHaveProperty('version');
    });

    it('should respond to overall health check', async () => {
      const request = require('supertest');
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('checks');
      
      const { checks } = response.body;
      expect(checks).toHaveProperty('database');
      expect(checks).toHaveProperty('redis');
      expect(checks).toHaveProperty('memory');
      expect(checks).toHaveProperty('cpu');
      
      expect(checks.database.status).toBe('healthy');
      expect(checks.redis.status).toBe('healthy');
    });

    it('should handle 404 for invalid routes', async () => {
      const request = require('supertest');
      await request(app)
        .get('/invalid/route')
        .expect(404);
    });

    it('should return JSON content type', async () => {
      const request = require('supertest');
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('API Routes', () => {
    it('should respond to API base route', async () => {
      const request = require('supertest');
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Dessai Backend API');
      expect(response.body).toHaveProperty('version', '1.0.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const request = require('supertest');
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('path', '/nonexistent');
      expect(response.body).toHaveProperty('method', 'GET');
    });
  });

  describe('Performance', () => {
    it('should respond quickly to health checks', async () => {
      const request = require('supertest');
      const startTime = Date.now();
      
      await request(app)
        .get('/health/live')
        .expect(200);
        
      const duration = Date.now() - startTime;
      
      // Should be very fast since it's mocked
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const request = require('supertest');
      const promises = Array.from({ length: 5 }, () =>
        request(app).get('/health/live').expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('alive');
      });
    });
  });
});
