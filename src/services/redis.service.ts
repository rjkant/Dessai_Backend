import Redis from 'ioredis';
import { config } from '../config';

/**
 * Redis Service
 * Manages Redis connections and operations for caching and session storage
 */
class RedisService {
  private static instance: RedisService;
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private isEnabled: boolean = false;

  constructor() {
    // Only initialize Redis if URL is provided
    if (config.redis.url && config.redis.url.trim() !== '') {
      this.isEnabled = true;
      const options: any = {
        db: config.redis.db,
        connectTimeout: config.redis.timeout,
        commandTimeout: config.redis.timeout,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      // Add password only if it exists
      if (config.redis.password) {
        options.password = config.redis.password;
      }

      this.client = new Redis(config.redis.url, options);
      this.setupEventHandlers();
    } else {
      console.log('⚠️ Redis disabled - no REDIS_URL provided');
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Get Redis client instance
   */
  public getClient(): Redis | null {
    return this.client;
  }

  /**
   * Check if Redis is enabled
   */
  public isRedisEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    if (!this.isEnabled || !this.client) {
      console.log('⚠️ Redis disabled - skipping connection');
      return;
    }

    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Redis connection established');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('📴 Redis connection closed');
    } catch (error) {
      console.error('❌ Redis disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Check Redis health
   */
  public async healthCheck(): Promise<{ status: string; latency: number; timestamp: string }> {
    try {
      if (!this.client) {
        return {
          status: 'unhealthy',
          latency: -1,
          timestamp: new Date().toISOString(),
        };
      }
      const startTime = Date.now();
      await this.client.ping();
      const endTime = Date.now();
      const latency = endTime - startTime;

      return {
        status: 'healthy',
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        latency: -1,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if Redis is connected
   */
  public isHealthy(): boolean {
    return this.isConnected && this.client !== null && this.client.status === 'ready';
  }

  /**
   * Ensure client is available, throw error if not
   */
  private ensureClient(): NonNullable<typeof this.client> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  /**
   * Get Redis info
   */
  public async getInfo(): Promise<{ memory: string; clients: string; version: string }> {
    try {
      const client = this.ensureClient();
      const info = await client.info();
      const lines = info.split('\r\n');

      const memory =
        lines.find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown';
      const clients =
        lines.find(line => line.startsWith('connected_clients:'))?.split(':')[1] || 'unknown';
      const version =
        lines.find(line => line.startsWith('redis_version:'))?.split(':')[1] || 'unknown';

      return { memory, clients, version };
    } catch (error) {
      console.error('Failed to get Redis info:', error);
      return { memory: 'unknown', clients: 'unknown', version: 'unknown' };
    }
  }

  // === Cache Operations ===

  /**
   * Set cache with TTL
   */
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const client = this.ensureClient();
      const serialized = JSON.stringify(value);
      if (ttl) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get cache value
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.ensureClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  public async delete(key: string): Promise<void> {
    try {
      const client = this.ensureClient();
      await client.del(key);
    } catch (error) {
      console.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const client = this.ensureClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  public async expire(key: string, ttl: number): Promise<void> {
    try {
      const client = this.ensureClient();
      await client.expire(key, ttl);
    } catch (error) {
      console.error(`Failed to set TTL for key ${key}:`, error);
      throw error;
    }
  }

  // === Session Operations ===

  /**
   * Store session data
   */
  public async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }
    const key = `session:${sessionId}`;
    await this.set(key, data, ttl);
  }

  /**
   * Get session data
   */
  public async getSession<T>(sessionId: string): Promise<T | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }
    const key = `session:${sessionId}`;
    return await this.get<T>(key);
  }

  /**
   * Delete session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }
    const key = `session:${sessionId}`;
    await this.delete(key);
  }

  /**
   * Store session data with key
   */
  public async setSessionData(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    return this.setSession(sessionId, data, ttl);
  }

  /**
   * Get session data with key
   */
  public async getSessionData<T>(sessionId: string): Promise<T | null> {
    return this.getSession<T>(sessionId);
  }

  /**
   * Update session data
   */
  public async updateSessionData(sessionId: string, data: any): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }
    const key = `session:${sessionId}`;
    const existing = await this.get(key);
    if (existing) {
      await this.set(key, { ...existing, ...data });
    }
  }

  // === Rate Limiting Operations ===

  /**
   * Increment rate limit counter
   */
  public async incrementRateLimit(key: string, window: number): Promise<number> {
    try {
      const client = this.ensureClient();
      const current = await client.incr(key);
      if (current === 1) {
        await client.expire(key, window);
      }
      return current;
    } catch (error) {
      console.error(`Failed to increment rate limit for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get rate limit count
   */
  public async getRateLimit(key: string): Promise<number> {
    try {
      const client = this.ensureClient();
      const count = await client.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error(`Failed to get rate limit for key ${key}:`, error);
      return 0;
    }
  }

  // === Pub/Sub Operations ===

  /**
   * Publish message to channel
   */
  public async publish(channel: string, message: any): Promise<void> {
    try {
      const client = this.ensureClient();
      await client.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const client = this.ensureClient();
      const subscriber = client.duplicate();
      await subscriber.subscribe(channel);
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch (error) {
            console.error(`Failed to parse message from channel ${channel}:`, error);
          }
        }
      });
    } catch (error) {
      console.error(`Failed to subscribe to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Clear all cache with pattern
   */
  public async clearPattern(pattern: string): Promise<void> {
    try {
      const client = this.ensureClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      console.error(`Failed to clear cache pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Get list elements in range
   */
  public async listRange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    if (!client) {
      return [];
    }

    try {
      return await client.lrange(key, start, stop);
    } catch (error) {
      console.error(`Failed to get list range ${key}:`, error);
      return [];
    }
  }

  /**
   * Push to list
   */
  public async listPush(key: string, value: string): Promise<number> {
    const client = this.getClient();
    if (!client) {
      return 0;
    }

    try {
      return await client.lpush(key, value);
    } catch (error) {
      console.error(`Failed to push to list ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set with expiry (alias for set method with TTL)
   */
  public async setWithExpiry(key: string, value: any, ttl: number): Promise<void> {
    return this.set(key, value, ttl);
  }

  /**
   * Delete key (alias for delete method)
   */
  public async del(key: string): Promise<void> {
    return this.delete(key);
  }

  /**
   * Get pipeline for batch operations
   */
  public pipeline(): any {
    const client = this.getClient();
    if (!client) {
      return null;
    }
    return client.pipeline();
  }

  /**
   * Ping Redis server
   */
  public async ping(): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      return false;
    }

    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) {
      return;
    }

    this.client.on('connect', () => {
      console.log('🔌 Redis connecting...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready');
      this.isConnected = true;
    });

    this.client.on('error', error => {
      console.error('❌ Redis error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('📴 Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (time: any) => {
      console.log(`🔄 Redis reconnecting (attempt ${time})`);
    });

    this.client.on('end', () => {
      console.log('🔚 Redis connection ended');
      this.isConnected = false;
    });
  }
}

// Export singleton instance
export const redis = RedisService.getInstance();
export default RedisService;
