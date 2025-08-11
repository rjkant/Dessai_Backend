import Redis from 'ioredis';
import { config } from '@/config';

/**
 * Redis Service
 * Manages Redis connections and operations for caching and session storage
 */
class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
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
  public getClient(): Redis {
    return this.client;
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
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
    return this.isConnected && this.client.status === 'ready';
  }

  /**
   * Get Redis info
   */
  public async getInfo(): Promise<{ memory: string; clients: string; version: string }> {
    try {
      const info = await this.client.info();
      const lines = info.split('\r\n');
      
      const memory = lines.find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown';
      const clients = lines.find(line => line.startsWith('connected_clients:'))?.split(':')[1] || 'unknown';
      const version = lines.find(line => line.startsWith('redis_version:'))?.split(':')[1] || 'unknown';

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
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
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
      const value = await this.client.get(key);
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
      await this.client.del(key);
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
      const result = await this.client.exists(key);
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
      await this.client.expire(key, ttl);
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
    const key = `session:${sessionId}`;
    await this.set(key, data, ttl);
  }

  /**
   * Get session data
   */
  public async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`;
    return await this.get<T>(key);
  }

  /**
   * Delete session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.delete(key);
  }

  // === Rate Limiting Operations ===

  /**
   * Increment rate limit counter
   */
  public async incrementRateLimit(key: string, window: number): Promise<number> {
    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, window);
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
      const count = await this.client.get(key);
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
      await this.client.publish(channel, JSON.stringify(message));
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
      const subscriber = this.client.duplicate();
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
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error(`Failed to clear cache pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('🔌 Redis connecting...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
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
