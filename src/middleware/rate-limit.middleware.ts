/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting functionality for API endpoints using Redis as backend
 * Supports different rate limiting strategies:
 * - Fixed window rate limiting
 * - Sliding window rate limiting  
 * - Token bucket rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Rate limiting strategy */
  strategy?: 'fixed-window' | 'sliding-window' | 'token-bucket';
  /** Custom key generator function */
  keyGenerator?: (req: Request) => string;
  /** Skip successful requests from count */
  skipSuccessfulRequests?: boolean;
  /** Skip failed requests from count */
  skipFailedRequests?: boolean;
  /** Custom handler for rate limit exceeded */
  handler?: (req: Request, res: Response, next: NextFunction) => void;
  /** Headers to include in response */
  standardHeaders?: boolean;
  /** Legacy headers compatibility */
  legacyHeaders?: boolean;
  /** Skip requests based on condition */
  skip?: (req: Request, res: Response) => boolean;
}

export class RateLimitMiddleware {
  private static redis: Redis;
  
  /**
   * Initialize Redis connection for rate limiting
   */
  static initialize(redisUrl?: string): void {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Get Redis client instance
   */
  static getRedisClient(): Redis {
    if (!this.redis) {
      this.initialize();
    }
    return this.redis;
  }

  /**
   * Default key generator - uses IP address and route
   */
  private static defaultKeyGenerator(req: Request): string {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const route = req.route?.path || req.path || 'unknown';
    return `rate_limit:${ip}:${route}`;
  }

  /**
   * Default rate limit exceeded handler
   */
  private static defaultHandler(req: Request, res: Response, next: NextFunction): void {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(60), // Default 1 minute
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Fixed window rate limiting implementation
   */
  private static async fixedWindowRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; totalHits: number; remainingPoints: number }> {
    const redis = this.getRedisClient();
    const windowKey = `${key}:${Math.floor(Date.now() / config.windowMs)}`;
    
    const multi = redis.multi();
    multi.incr(windowKey);
    multi.expire(windowKey, Math.ceil(config.windowMs / 1000));
    
    const results = await multi.exec();
    const totalHits = results?.[0]?.[1] as number || 0;
    const remainingPoints = Math.max(0, config.max - totalHits);
    
    return {
      allowed: totalHits <= config.max,
      totalHits,
      remainingPoints
    };
  }

  /**
   * Sliding window rate limiting implementation
   */
  private static async slidingWindowRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; totalHits: number; remainingPoints: number }> {
    const redis = this.getRedisClient();
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, Math.ceil(config.windowMs / 1000));
    
    const results = await multi.exec();
    const totalHits = results?.[2]?.[1] as number || 0;
    const remainingPoints = Math.max(0, config.max - totalHits);
    
    return {
      allowed: totalHits <= config.max,
      totalHits,
      remainingPoints
    };
  }

  /**
   * Token bucket rate limiting implementation
   */
  private static async tokenBucketRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; totalHits: number; remainingPoints: number }> {
    const redis = this.getRedisClient();
    const now = Date.now();
    const refillRate = config.max / (config.windowMs / 1000); // tokens per second
    
    const lua = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local tokens = tonumber(ARGV[2])
      local interval = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      
      local bucket = redis.call('hmget', key, 'tokens', 'last_refill')
      local current_tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on time elapsed
      local elapsed = (now - last_refill) / 1000
      local tokens_to_add = math.floor(elapsed * ${refillRate})
      current_tokens = math.min(capacity, current_tokens + tokens_to_add)
      
      local allowed = current_tokens >= tokens
      if allowed then
        current_tokens = current_tokens - tokens
      end
      
      redis.call('hmset', key, 'tokens', current_tokens, 'last_refill', now)
      redis.call('expire', key, ${Math.ceil(config.windowMs / 1000)})
      
      return {allowed and 1 or 0, current_tokens, capacity - current_tokens}
    `;
    
    const result = await redis.eval(lua, 1, key, config.max, 1, config.windowMs, now) as number[];
    
    return {
      allowed: result[0] === 1,
      totalHits: config.max - result[1],
      remainingPoints: result[1]
    };
  }

  /**
   * Create rate limiting middleware
   */
  static create(config: RateLimitConfig) {
    const {
      max,
      windowMs,
      strategy = 'fixed-window',
      keyGenerator = this.defaultKeyGenerator,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      handler = this.defaultHandler,
      standardHeaders = true,
      legacyHeaders = false,
      skip
    } = config;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Skip if condition met
        if (skip && skip(req, res)) {
          return next();
        }

        const key = keyGenerator(req);
        let rateLimitResult: { allowed: boolean; totalHits: number; remainingPoints: number };

        // Apply rate limiting strategy
        switch (strategy) {
          case 'sliding-window':
            rateLimitResult = await this.slidingWindowRateLimit(key, config);
            break;
          case 'token-bucket':
            rateLimitResult = await this.tokenBucketRateLimit(key, config);
            break;
          case 'fixed-window':
          default:
            rateLimitResult = await this.fixedWindowRateLimit(key, config);
            break;
        }

        const { allowed, totalHits, remainingPoints } = rateLimitResult;

        // Set standard headers
        if (standardHeaders) {
          res.set({
            'RateLimit-Limit': max.toString(),
            'RateLimit-Remaining': remainingPoints.toString(),
            'RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
            'RateLimit-Policy': `${max};w=${Math.floor(windowMs / 1000)}`
          });
        }

        // Set legacy headers for compatibility
        if (legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': remainingPoints.toString(),
            'X-RateLimit-Reset': Math.ceil((Date.now() + windowMs) / 1000).toString()
          });
        }

        // Check if rate limit exceeded
        if (!allowed) {
          res.set('Retry-After', Math.ceil(windowMs / 1000).toString());
          return handler(req, res, next);
        }

        // Handle response counting
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Override send method to track response status
        res.send = function(body: any) {
          const statusCode = res.statusCode;
          const shouldSkip = (
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400)
          );
          
          if (shouldSkip) {
            // Decrement count if we should skip this request
            const redis = RateLimitMiddleware.getRedisClient();
            const windowKey = `${key}:${Math.floor(Date.now() / windowMs)}`;
            redis.decr(windowKey).catch(() => {}); // Ignore errors
          }
          
          return originalSend.call(this, body);
        };

        // Override json method to track response status
        res.json = function(body: any) {
          const statusCode = res.statusCode;
          const shouldSkip = (
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400)
          );
          
          if (shouldSkip) {
            // Decrement count if we should skip this request
            const redis = RateLimitMiddleware.getRedisClient();
            const windowKey = `${key}:${Math.floor(Date.now() / windowMs)}`;
            redis.decr(windowKey).catch(() => {}); // Ignore errors
          }
          
          return originalJson.call(this, body);
        };

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // On error, allow the request to proceed
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  static async reset(key: string): Promise<void> {
    const redis = this.getRedisClient();
    const keys = await redis.keys(`${key}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Get current rate limit status for a key
   */
  static async getStatus(key: string, config: RateLimitConfig): Promise<{
    totalHits: number;
    remainingPoints: number;
    resetTime: Date;
  }> {
    const redis = this.getRedisClient();
    const windowKey = `${key}:${Math.floor(Date.now() / config.windowMs)}`;
    const totalHits = await redis.get(windowKey);
    const remainingPoints = Math.max(0, config.max - (parseInt(totalHits || '0')));
    const resetTime = new Date(Math.ceil(Date.now() / config.windowMs) * config.windowMs);
    
    return {
      totalHits: parseInt(totalHits || '0'),
      remainingPoints,
      resetTime
    };
  }

  /**
   * Cleanup expired rate limit data
   */
  static async cleanup(): Promise<void> {
    const redis = this.getRedisClient();
    const keys = await redis.keys('rate_limit:*');
    
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) { // Key exists but has no expiration
        await redis.del(key);
      }
    }
  }
}

/**
 * Simple rate limit middleware factory function
 */
export const rateLimitMiddleware = (config: RateLimitConfig) => {
  return RateLimitMiddleware.create(config);
};

/**
 * Pre-configured rate limiters for common use cases
 */
export const CommonRateLimits = {
  /** Strict rate limit for authentication endpoints */
  auth: rateLimitMiddleware({
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    strategy: 'sliding-window'
  }),

  /** API rate limit for general endpoints */
  api: rateLimitMiddleware({
    max: 100,
    windowMs: 60 * 1000, // 1 minute
    strategy: 'fixed-window'
  }),

  /** Upload rate limit for file uploads */
  upload: rateLimitMiddleware({
    max: 10,
    windowMs: 60 * 1000, // 1 minute
    strategy: 'token-bucket'
  }),

  /** Webhook rate limit for incoming webhooks */
  webhook: rateLimitMiddleware({
    max: 1000,
    windowMs: 60 * 1000, // 1 minute
    strategy: 'fixed-window'
  }),

  /** Admin rate limit for administrative actions */
  admin: rateLimitMiddleware({
    max: 20,
    windowMs: 60 * 1000, // 1 minute
    strategy: 'sliding-window'
  })
};
