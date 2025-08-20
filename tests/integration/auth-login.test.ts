/**
 * Authentication Login Integration Tests  
 * TASK-TEST-003: Phase 2 - Authentication API Integration Testing
 * Persona: Senior Software Engineer
 * 
 * This test file implements authentication login workflow testing
 * using the proven dependency injection pattern from Phase 1.
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response } from 'express';

// Create mock services for authentication login testing
const createMockDatabase = () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  session: {
    create: jest.fn(),
    findMany: jest.fn(),
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
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
  isHealthy: jest.fn().mockReturnValue(true)
});

const createMockAuthService = () => ({
  validateCredentials: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyPassword: jest.fn(),
  generateMFACode: jest.fn(),
  sendMFACode: jest.fn(),
  verifyMFACode: jest.fn(),
  rateLimitCheck: jest.fn().mockResolvedValue({ allowed: true, remaining: 4 })
});

// Create authentication login controller with dependency injection
const createAuthLoginController = (authService: any, database: any, redis: any) => {
  const login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
        return;
      }

      // Rate limiting check
      const rateLimit = await authService.rateLimitCheck(email);
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMITED',
          retryAfter: rateLimit.retryAfter
        });
        return;
      }

      // Find user
      const user = await database.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          verified: true,
          mfaEnabled: true,
          mfaSecret: true,
          lastLoginAt: true,
          createdAt: true
        }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Check if user is verified
      if (!user.verified) {
        res.status(401).json({
          success: false,
          error: 'Please verify your email before logging in',
          code: 'EMAIL_NOT_VERIFIED'
        });
        return;
      }

      // Verify password
      const passwordValid = await authService.verifyPassword(password, user.password);
      if (!passwordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Generate and send MFA code
        const mfaCode = authService.generateMFACode();
        await redis.setex(`mfa:${user.id}`, 300, mfaCode); // 5 minutes expiry
        
        await authService.sendMFACode(user.email, mfaCode);

        res.status(200).json({
          success: true,
          message: 'MFA code sent',
          requiresMFA: true,
          userId: user.id
        });
        return;
      }

      // Generate tokens
      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Store session
      const session = await database.session.create({
        data: {
          userId: user.id,
          refreshToken,
          expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)), // 30 days or 1 day
          createdAt: new Date()
        }
      });

      // Update last login
      await database.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            verified: user.verified,
            lastLoginAt: new Date()
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: rememberMe ? '30d' : '1d'
          },
          session: {
            id: session.id,
            expiresAt: session.expiresAt
          }
        }
      });

    } catch (error) {
      console.error('Login failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  const verifyMFA = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, mfaCode } = req.body;

      if (!userId || !mfaCode) {
        res.status(400).json({
          success: false,
          error: 'User ID and MFA code are required',
          code: 'MISSING_MFA_DATA'
        });
        return;
      }

      // Get stored MFA code
      const storedCode = await redis.get(`mfa:${userId}`);
      if (!storedCode) {
        res.status(400).json({
          success: false,
          error: 'MFA code expired or invalid',
          code: 'MFA_CODE_EXPIRED'
        });
        return;
      }

      // Verify MFA code
      const isValid = authService.verifyMFACode(mfaCode, storedCode);
      if (!isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid MFA code',
          code: 'INVALID_MFA_CODE'
        });
        return;
      }

      // Get user details
      const user = await database.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          verified: true
        }
      });

      // Generate tokens
      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Store session
      const session = await database.session.create({
        data: {
          userId: user.id,
          refreshToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          createdAt: new Date()
        }
      });

      // Update last login
      await database.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Remove MFA code
      await redis.del(`mfa:${userId}`);

      res.status(200).json({
        success: true,
        message: 'MFA verification successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            verified: user.verified,
            lastLoginAt: new Date()
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '1d'
          },
          session: {
            id: session.id,
            expiresAt: session.expiresAt
          }
        }
      });

    } catch (error) {
      console.error('MFA verification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  const logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          code: 'MISSING_TOKEN'
        });
        return;
      }

      // Delete session
      await database.session.delete({
        where: { refreshToken }
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  return { login, verifyMFA, logout };
};

// Create test Express app
const createAuthLoginTestApp = (authService: any, database: any, redis: any) => {
  const app = express();
  const authController = createAuthLoginController(authService, database, redis);

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Routes
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/verify-mfa', authController.verifyMFA);
  app.post('/api/auth/logout', authController.logout);

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

describe('Authentication Login - Integration', () => {
  let app: express.Application;
  let mockDatabase: any;
  let mockRedis: any;
  let mockAuthService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    verified: true,
    mfaEnabled: false,
    mfaSecret: null,
    lastLoginAt: new Date('2025-08-12T10:00:00.000Z'),
    createdAt: new Date('2025-08-01T10:00:00.000Z')
  };

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    mockRedis = createMockRedis();
    mockAuthService = createMockAuthService();
    app = createAuthLoginTestApp(mockAuthService, mockDatabase, mockRedis);

    // Setup default mock behaviors
    mockAuthService.verifyPassword.mockResolvedValue(true);
    mockAuthService.generateAccessToken.mockReturnValue('access-token-123');
    mockAuthService.generateRefreshToken.mockReturnValue('refresh-token-123');
    mockAuthService.generateMFACode.mockReturnValue('123456');
    mockAuthService.sendMFACode.mockResolvedValue(true);
    mockAuthService.verifyMFACode.mockReturnValue(true);

    mockDatabase.user.findUnique.mockResolvedValue(mockUser);
    mockDatabase.session.create.mockResolvedValue({
      id: 'session-123',
      userId: 'user-123',
      refreshToken: 'refresh-token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date()
    });
    mockDatabase.user.update.mockResolvedValue(mockUser);
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    };

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should validate required credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' }) // Missing password
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Email and password are required');
      expect(response.body).toHaveProperty('code', 'MISSING_CREDENTIALS');
    });

    it('should handle non-existent user', async () => {
      mockDatabase.user.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
      expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should reject unverified users', async () => {
      mockDatabase.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        verified: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Please verify your email before logging in');
      expect(response.body).toHaveProperty('code', 'EMAIL_NOT_VERIFIED');
    });

    it('should reject invalid password', async () => {
      mockAuthService.verifyPassword.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
      expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should handle MFA-enabled users', async () => {
      mockDatabase.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'secret123'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'MFA code sent');
      expect(response.body).toHaveProperty('requiresMFA', true);
      expect(response.body).toHaveProperty('userId', 'user-123');
      expect(response.body).not.toHaveProperty('tokens');
    });

    it('should handle rate limiting', async () => {
      mockAuthService.rateLimitCheck.mockResolvedValueOnce({
        allowed: false,
        retryAfter: 300
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(429);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Too many login attempts. Please try again later.');
      expect(response.body).toHaveProperty('code', 'RATE_LIMITED');
      expect(response.body).toHaveProperty('retryAfter', 300);
    });

    it('should support remember me functionality', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ ...validLoginData, rememberMe: true })
        .expect(200);

      expect(response.body.data.tokens).toHaveProperty('expiresIn', '30d');
    });

    it('should update user last login time', async () => {
      await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(mockDatabase.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: expect.any(Date) }
      });
    });

    it('should respond quickly for login requests', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
    });
  });

  describe('POST /api/auth/verify-mfa', () => {
    it('should verify MFA successfully', async () => {
      mockRedis.get.mockResolvedValueOnce('123456');

      const response = await request(app)
        .post('/api/auth/verify-mfa')
        .send({
          userId: 'user-123',
          mfaCode: '123456'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'MFA verification successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data).toHaveProperty('session');
    });

    it('should validate required MFA data', async () => {
      const response = await request(app)
        .post('/api/auth/verify-mfa')
        .send({ userId: 'user-123' }) // Missing MFA code
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'User ID and MFA code are required');
      expect(response.body).toHaveProperty('code', 'MISSING_MFA_DATA');
    });

    it('should reject expired MFA codes', async () => {
      mockRedis.get.mockResolvedValueOnce(null); // Code expired

      const response = await request(app)
        .post('/api/auth/verify-mfa')
        .send({
          userId: 'user-123',
          mfaCode: '123456'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'MFA code expired or invalid');
      expect(response.body).toHaveProperty('code', 'MFA_CODE_EXPIRED');
    });

    it('should reject invalid MFA codes', async () => {
      mockRedis.get.mockResolvedValueOnce('123456');
      mockAuthService.verifyMFACode.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/auth/verify-mfa')
        .send({
          userId: 'user-123',
          mfaCode: '654321'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid MFA code');
      expect(response.body).toHaveProperty('code', 'INVALID_MFA_CODE');
    });

    it('should remove MFA code after successful verification', async () => {
      mockRedis.get.mockResolvedValueOnce('123456');

      await request(app)
        .post('/api/auth/verify-mfa')
        .send({
          userId: 'user-123',
          mfaCode: '123456'
        })
        .expect(200);

      expect(mockRedis.del).toHaveBeenCalledWith('mfa:user-123');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      mockDatabase.session.delete.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'refresh-token-123' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    it('should validate refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({}) // Missing refresh token
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Refresh token is required');
      expect(response.body).toHaveProperty('code', 'MISSING_TOKEN');
    });

    it('should delete session on logout', async () => {
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'refresh-token-123' })
        .expect(200);

      expect(mockDatabase.session.delete).toHaveBeenCalledWith({
        where: { refreshToken: 'refresh-token-123' }
      });
    });
  });

  describe('Service Dependencies Validation', () => {
    it('should call authentication service methods correctly for login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(mockAuthService.rateLimitCheck).toHaveBeenCalledWith('test@example.com');
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith('SecurePass123!', 'hashedPassword123');
      expect(mockAuthService.generateAccessToken).toHaveBeenCalledWith(mockUser);
      expect(mockAuthService.generateRefreshToken).toHaveBeenCalledWith(mockUser);
    });

    it('should call database methods correctly for login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(mockDatabase.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.objectContaining({
          id: true,
          email: true,
          password: true,
          verified: true,
          mfaEnabled: true
        })
      });
      
      expect(mockDatabase.session.create).toHaveBeenCalled();
      expect(mockDatabase.user.update).toHaveBeenCalled();
    });
  });
});
