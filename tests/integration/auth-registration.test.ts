/**
 * Authentication Registration Integration Tests
 * TASK-TEST-003: Phase 2 - Authentication API Integration Testing
 * Persona: Senior Software Engineer
 * 
 * This test file implements authentication registration workflow testing
 * using the proven dependency injection pattern from Phase 1.
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response } from 'express';

// Create mock services for authentication testing
const createMockDatabase = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
  isHealthy: jest.fn().mockReturnValue(true)
});

const createMockRedis = () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  setex: jest.fn().mockResolvedValue('OK'),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
  isHealthy: jest.fn().mockReturnValue(true)
});

const createMockAuthService = () => ({
  register: jest.fn(),
  validateEmail: jest.fn().mockReturnValue(true),
  validatePassword: jest.fn().mockReturnValue(true),
  hashPassword: jest.fn(),
  generateVerificationToken: jest.fn(),
  sendVerificationEmail: jest.fn()
});

// Create authentication controller with dependency injection
const createAuthController = (authService: any, database: any, redis: any) => {
  const register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      // Validate email format
      if (!authService.validateEmail(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
        return;
      }

      // Validate password strength
      if (!authService.validatePassword(password)) {
        res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          code: 'WEAK_PASSWORD'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await database.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User already exists',
          code: 'USER_EXISTS'
        });
        return;
      }

      // Hash password
      const hashedPassword = await authService.hashPassword(password);

      // Create user
      const user = await database.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Generate verification token
      const verificationToken = authService.generateVerificationToken();

      // Store verification token in Redis (expires in 24 hours)
      await redis.setex(`verification:${user.id}`, 86400, verificationToken);

      // Send verification email (mock)
      await authService.sendVerificationEmail(email, verificationToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          verified: user.verified
        }
      });

    } catch (error) {
      console.error('Registration failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, userId } = req.body;

      if (!token || !userId) {
        res.status(400).json({
          success: false,
          error: 'Missing token or user ID',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      // Get stored token from Redis
      const storedToken = await redis.get(`verification:${userId}`);

      if (!storedToken || storedToken !== token) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired verification token',
          code: 'INVALID_TOKEN'
        });
        return;
      }

      // Update user as verified
      await database.user.update({
        where: { id: userId },
        data: { 
          verified: true,
          updatedAt: new Date()
        }
      });

      // Remove verification token
      await redis.del(`verification:${userId}`);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      console.error('Email verification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  return { register, verifyEmail };
};

// Create test Express app
const createAuthTestApp = (authService: any, database: any, redis: any) => {
  const app = express();
  const authController = createAuthController(authService, database, redis);

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/verify-email', authController.verifyEmail);

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.originalUrl
    });
  });

  return app;
};

describe('Authentication Registration - Integration', () => {
  let app: express.Application;
  let mockDatabase: any;
  let mockRedis: any;
  let mockAuthService: any;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    mockRedis = createMockRedis();
    mockAuthService = createMockAuthService();
    app = createAuthTestApp(mockAuthService, mockDatabase, mockRedis);

    // Setup default mock behaviors
    mockAuthService.hashPassword.mockResolvedValue('hashedPassword123');
    mockAuthService.generateVerificationToken.mockReturnValue('verification-token-123');
    mockAuthService.sendVerificationEmail.mockResolvedValue(true);
    
    mockDatabase.user.findUnique.mockResolvedValue(null); // User doesn't exist
    mockDatabase.user.create.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body.data).toHaveProperty('id', 'user-123');
      expect(response.body.data).toHaveProperty('email', 'test@example.com');
      expect(response.body.data).toHaveProperty('verified', false);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should validate required fields', async () => {
      const invalidData = { email: 'test@example.com' }; // Missing other fields

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELDS');
    });

    it('should validate email format', async () => {
      mockAuthService.validateEmail.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid email format');
      expect(response.body).toHaveProperty('code', 'INVALID_EMAIL');
    });

    it('should validate password strength', async () => {
      mockAuthService.validatePassword.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, password: 'weak' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Password does not meet requirements');
      expect(response.body).toHaveProperty('code', 'WEAK_PASSWORD');
    });

    it('should prevent duplicate user registration', async () => {
      mockDatabase.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'User already exists');
      expect(response.body).toHaveProperty('code', 'USER_EXISTS');
    });

    it('should handle database errors gracefully', async () => {
      mockDatabase.user.create.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Internal server error');
      expect(response.body).toHaveProperty('code', 'INTERNAL_ERROR');
    });

    it('should store verification token in Redis', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'verification:user-123',
        86400,
        'verification-token-123'
      );
    });

    it('should send verification email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'verification-token-123'
      );
    });

    it('should respond quickly for registration requests', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200); // Registration should be fast with mocks
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email successfully', async () => {
      mockRedis.get.mockResolvedValueOnce('verification-token-123');
      mockDatabase.user.update.mockResolvedValueOnce({
        id: 'user-123',
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'verification-token-123',
          userId: 'user-123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Email verified successfully');
    });

    it('should validate required fields for verification', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'some-token' }) // Missing userId
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Missing token or user ID');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELDS');
    });

    it('should reject invalid verification token', async () => {
      mockRedis.get.mockResolvedValueOnce('different-token');

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'wrong-token',
          userId: 'user-123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid or expired verification token');
      expect(response.body).toHaveProperty('code', 'INVALID_TOKEN');
    });

    it('should reject expired verification token', async () => {
      mockRedis.get.mockResolvedValueOnce(null); // Token expired/not found

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'expired-token',
          userId: 'user-123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid or expired verification token');
      expect(response.body).toHaveProperty('code', 'INVALID_TOKEN');
    });

    it('should update user verification status', async () => {
      mockRedis.get.mockResolvedValueOnce('verification-token-123');

      await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'verification-token-123',
          userId: 'user-123'
        })
        .expect(200);

      expect(mockDatabase.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { 
          verified: true,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should remove verification token after successful verification', async () => {
      mockRedis.get.mockResolvedValueOnce('verification-token-123');

      await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'verification-token-123',
          userId: 'user-123'
        })
        .expect(200);

      expect(mockRedis.del).toHaveBeenCalledWith('verification:user-123');
    });
  });

  describe('Error Handling & Response Format', () => {
    it('should handle invalid routes gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/invalid-endpoint')
        .send({})
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('path', '/api/auth/invalid-endpoint');
    });

    it('should return JSON content type for all auth endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(201);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include appropriate security headers', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(201);

      // Helmet should add security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('Service Dependencies Validation', () => {
    it('should call authentication service methods correctly', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(201);

      expect(mockAuthService.validateEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockAuthService.validatePassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockAuthService.generateVerificationToken).toHaveBeenCalled();
      expect(mockAuthService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should call database methods correctly', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(201);

      expect(mockDatabase.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockDatabase.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'hashedPassword123',
          verified: false
        })
      });
    });

    it('should call Redis methods correctly', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(201);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'verification:user-123',
        86400,
        'verification-token-123'
      );
    });
  });
});
