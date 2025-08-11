/**
 * Test Application Setup
 * Dessai Backend - Testing Infrastructure
 * @testing persona validation
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from '../../src/routes/auth.routes';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { errorHandler } from '../../src/middleware/error.middleware';

/**
 * Setup test Express application
 * Configures middleware, routes, and error handling for testing
 */
export async function setupTestApp(): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env['NODE_ENV'] === 'test' ? true : process.env['FRONTEND_URL'],
    credentials: true,
    optionsSuccessStatus: 200
  }));

  // Rate limiting for testing (more permissive)
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // More requests for testing
    message: {
      success: false,
      message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Test application is healthy',
      timestamp: new Date().toISOString()
    });
  });

  // Authentication routes
  app.use('/auth', authRoutes);

  // Protected test endpoint
  app.get('/auth/me', AuthMiddleware.authenticate, (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user?.id,
          email: req.user?.email,
          firstName: req.user?.firstName,
          lastName: req.user?.lastName,
          role: req.user?.role,
          isActive: req.user?.isActive,
          emailVerified: req.user?.emailVerified,
          mfaEnabled: req.user?.mfaEnabled
        }
      }
    });
  });

  // Error handling middleware
  app.use(errorHandler);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
      path: req.originalUrl
    });
  });

  return app;
}

/**
 * Setup test middleware configurations
 */
export function setupTestMiddleware() {
  return {
    // Test-specific middleware configurations
    rateLimiter: rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 1000, // Very high limit for testing
      skip: () => process.env['NODE_ENV'] === 'test'
    }),
    
    cors: cors({
      origin: true, // Allow all origins in test
      credentials: true
    })
  };
}

/**
 * Cleanup test application resources
 */
export async function cleanupTestApp(): Promise<void> {
  // Cleanup any application-level resources
  // Close database connections, clear caches, etc.
  console.log('Test application cleanup completed');
}
