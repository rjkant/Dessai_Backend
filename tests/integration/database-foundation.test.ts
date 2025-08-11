import { database } from '@/services/database.service';
import { redis } from '@/services/redis.service';
import { config } from '@/config';

describe('Database Foundation Tests', () => {
  beforeAll(async () => {
    // Initialize connections for testing
    await database.connect();
    await redis.connect();
  });

  afterAll(async () => {
    // Clean up connections after tests
    await database.disconnect();
    await redis.disconnect();
  });

  describe('Database Service', () => {
    it('should connect to database successfully', async () => {
      const health = await database.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThan(0);
    });

    it('should check database health', async () => {
      const health = await database.healthCheck();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('timestamp');
      expect(typeof health.latency).toBe('number');
    });

    it('should report connected status', () => {
      expect(database.isHealthy()).toBe(true);
    });

    it('should get database statistics', async () => {
      const stats = await database.getStats();
      expect(stats).toHaveProperty('connectionCount');
      expect(stats).toHaveProperty('activeTransactions');
      expect(stats).toHaveProperty('version');
      expect(typeof stats.connectionCount).toBe('number');
    });

    it('should execute raw SQL queries', async () => {
      const result = await database.executeRaw('SELECT 1 as test_value');
      expect(result).toBeDefined();
    });

    it('should handle database transactions', async () => {
      const result = await database.transaction(async (tx) => {
        // Simple transaction test
        const testResult = await tx.$queryRaw`SELECT 1 as transaction_test`;
        return testResult;
      });
      expect(result).toBeDefined();
    });

    it('should handle batch operations', async () => {
      const operations = [
        database.getClient().$queryRaw`SELECT 1 as batch_test_1`,
        database.getClient().$queryRaw`SELECT 2 as batch_test_2`,
      ];
      const results = await database.batchExecute(operations);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
    });
  });

  describe('Redis Service', () => {
    const testKey = 'test:key';
    const testValue = { message: 'Hello Redis', timestamp: Date.now() };

    afterEach(async () => {
      // Clean up test keys
      await redis.delete(testKey);
      await redis.clearPattern('test:*');
    });

    it('should connect to Redis successfully', async () => {
      const health = await redis.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThan(0);
    });

    it('should check Redis health', async () => {
      const health = await redis.healthCheck();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('timestamp');
      expect(typeof health.latency).toBe('number');
    });

    it('should report connected status', () => {
      expect(redis.isHealthy()).toBe(true);
    });

    it('should get Redis info', async () => {
      const info = await redis.getInfo();
      expect(info).toHaveProperty('memory');
      expect(info).toHaveProperty('clients');
      expect(info).toHaveProperty('version');
      expect(typeof info.memory).toBe('string');
    });

    it('should set and get cache values', async () => {
      await redis.set(testKey, testValue);
      const retrieved = await redis.get(testKey);
      expect(retrieved).toEqual(testValue);
    });

    it('should set cache with TTL', async () => {
      await redis.set(testKey, testValue, 1); // 1 second TTL
      const exists = await redis.exists(testKey);
      expect(exists).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      const existsAfterTTL = await redis.exists(testKey);
      expect(existsAfterTTL).toBe(false);
    });

    it('should delete cache keys', async () => {
      await redis.set(testKey, testValue);
      expect(await redis.exists(testKey)).toBe(true);
      
      await redis.delete(testKey);
      expect(await redis.exists(testKey)).toBe(false);
    });

    it('should handle session operations', async () => {
      const sessionId = 'test-session-123';
      const sessionData = { userId: '123', role: 'CANDIDATE' };
      
      await redis.setSession(sessionId, sessionData, 3600);
      const retrievedSession = await redis.getSession(sessionId);
      expect(retrievedSession).toEqual(sessionData);
      
      await redis.deleteSession(sessionId);
      const deletedSession = await redis.getSession(sessionId);
      expect(deletedSession).toBeNull();
    });

    it('should handle rate limiting operations', async () => {
      const rateLimitKey = 'rate:test:user123';
      
      // First request
      const count1 = await redis.incrementRateLimit(rateLimitKey, 60);
      expect(count1).toBe(1);
      
      // Second request
      const count2 = await redis.incrementRateLimit(rateLimitKey, 60);
      expect(count2).toBe(2);
      
      // Check current count
      const currentCount = await redis.getRateLimit(rateLimitKey);
      expect(currentCount).toBe(2);
      
      // Cleanup
      await redis.delete(rateLimitKey);
    });

    it('should handle pub/sub operations', async () => {
      const channel = 'test:channel';
      const message = { event: 'test', data: 'Hello PubSub' };
      let receivedMessage: any = null;

      // Subscribe to channel
      await redis.subscribe(channel, (msg) => {
        receivedMessage = msg;
      });

      // Give subscription time to establish
      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish message
      await redis.publish(channel, message);

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedMessage).toEqual(message);
    });

    it('should clear cache patterns', async () => {
      await redis.set('test:pattern:1', 'value1');
      await redis.set('test:pattern:2', 'value2');
      await redis.set('other:key', 'value3');
      
      await redis.clearPattern('test:pattern:*');
      
      expect(await redis.exists('test:pattern:1')).toBe(false);
      expect(await redis.exists('test:pattern:2')).toBe(false);
      expect(await redis.exists('other:key')).toBe(true);
      
      // Cleanup
      await redis.delete('other:key');
    });
  });

  describe('Health Check Integration', () => {
    it('should have consistent health status across services', async () => {
      const dbHealth = await database.healthCheck();
      const redisHealth = await redis.healthCheck();
      
      expect(dbHealth.status).toBe('healthy');
      expect(redisHealth.status).toBe('healthy');
      
      // Both should be connected
      expect(database.isHealthy()).toBe(true);
      expect(redis.isHealthy()).toBe(true);
    });

    it('should handle connection configuration properly', () => {
      // Verify configuration is loaded correctly
      expect(config.database.url).toBeDefined();
      expect(config.redis.url).toBeDefined();
      expect(config.database.timeout).toBeGreaterThan(0);
      expect(config.redis.timeout).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      try {
        await database.executeRaw('INVALID SQL QUERY');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle Redis errors gracefully', async () => {
      // Test with an invalid operation that should not crash
      const result = await redis.get('non:existent:key');
      expect(result).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle database operations within acceptable time limits', async () => {
      const startTime = Date.now();
      await database.healthCheck();
      const duration = Date.now() - startTime;
      
      // Health check should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle Redis operations within acceptable time limits', async () => {
      const startTime = Date.now();
      await redis.healthCheck();
      const duration = Date.now() - startTime;
      
      // Redis health check should be very fast
      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent database operations', async () => {
      const promises = Array.from({ length: 5 }, () => database.healthCheck());
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.status).toBe('healthy');
      });
    });

    it('should handle concurrent Redis operations', async () => {
      const testKeys = Array.from({ length: 5 }, (_, i) => `concurrent:test:${i}`);
      const testValue = { test: 'concurrent' };
      
      // Set multiple keys concurrently
      const setPromises = testKeys.map(key => redis.set(key, testValue));
      await Promise.all(setPromises);
      
      // Get multiple keys concurrently
      const getPromises = testKeys.map(key => redis.get(key));
      const results = await Promise.all(getPromises);
      
      results.forEach(result => {
        expect(result).toEqual(testValue);
      });
      
      // Cleanup
      const deletePromises = testKeys.map(key => redis.delete(key));
      await Promise.all(deletePromises);
    });
  });
});
