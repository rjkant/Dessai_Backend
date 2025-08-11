import request from 'supertest';
import DessaiServer from '@/server';
import { database } from '@/services/database.service';
import { redis } from '@/services/redis.service';

describe('Health Check Endpoints', () => {
  let app: any;
  let server: DessaiServer;

  beforeAll(async () => {
    // Initialize server and services
    server = new DessaiServer();
    app = server.getApp();
    
    // Connect services
    await database.connect();
    await redis.connect();
  });

  afterAll(async () => {
    // Clean up connections
    await database.disconnect();
    await redis.disconnect();
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
      expect(response.body).toHaveProperty('responseTime');

      const { checks } = response.body;
      expect(checks).toHaveProperty('database');
      expect(checks).toHaveProperty('redis');
      expect(checks).toHaveProperty('memory');
      expect(checks).toHaveProperty('cpu');

      expect(checks.database.status).toBe('healthy');
      expect(checks.redis.status).toBe('healthy');
      expect(checks.memory).toHaveProperty('used');
      expect(checks.memory).toHaveProperty('total');
      expect(checks.memory).toHaveProperty('percentage');
    });

    it('should include performance metrics', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.checks.database).toHaveProperty('latency');
      expect(response.body.checks.redis).toHaveProperty('latency');
      expect(typeof response.body.checks.database.latency).toBe('number');
      expect(typeof response.body.checks.redis.latency).toBe('number');
      expect(response.body.checks.database.latency).toBeGreaterThan(0);
      expect(response.body.checks.redis.latency).toBeGreaterThan(0);
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
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('connected', true);

      const { stats } = response.body;
      expect(stats).toHaveProperty('connectionCount');
      expect(stats).toHaveProperty('activeTransactions');
      expect(stats).toHaveProperty('version');
      expect(typeof stats.connectionCount).toBe('number');
      expect(typeof stats.activeTransactions).toBe('number');
      expect(typeof stats.version).toBe('string');
    });

    it('should respond quickly for database health checks', async () => {
      const startTime = Date.now();
      await request(app)
        .get('/health/database')
        .expect(200);
      const duration = Date.now() - startTime;
      
      // Should respond within 1 second
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
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('connected', true);

      const { info } = response.body;
      expect(info).toHaveProperty('memory');
      expect(info).toHaveProperty('clients');
      expect(info).toHaveProperty('version');
      expect(typeof info.memory).toBe('string');
      expect(typeof info.clients).toBe('string');
      expect(typeof info.version).toBe('string');
    });

    it('should respond quickly for Redis health checks', async () => {
      const startTime = Date.now();
      await request(app)
        .get('/health/redis')
        .expect(200);
      const duration = Date.now() - startTime;
      
      // Should respond within 500ms
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
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
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
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should handle mixed endpoint requests concurrently', async () => {
      const endpoints = ['/health', '/health/database', '/health/redis', '/health/ready', '/health/live'];
      const promises = endpoints.map(endpoint =>
        request(app).get(endpoint).expect(200)
      );

      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid health endpoints gracefully', async () => {
      await request(app)
        .get('/health/invalid')
        .expect(404);
    });

    it('should maintain consistent response format', async () => {
      const endpoints = ['/health', '/health/database', '/health/redis', '/health/ready', '/health/live'];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);
        
        expect(response.body).toHaveProperty('status');
        expect(typeof response.body.status).toBe('string');
      }
    });
  });

  describe('Response Times', () => {
    it('should meet performance SLA for all health endpoints', async () => {
      const performanceTests = [
        { endpoint: '/health', maxTime: 1000 },
        { endpoint: '/health/database', maxTime: 1000 },
        { endpoint: '/health/redis', maxTime: 500 },
        { endpoint: '/health/ready', maxTime: 100 },
        { endpoint: '/health/live', maxTime: 50 },
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
});
