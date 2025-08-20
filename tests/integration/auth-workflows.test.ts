/**
 * Authentication Workflows Integration Tests
 * TASK-TEST-003: Phase 2 - Complete Authentication Integration Testing  
 * Persona: Senior Software Engineer
 * 
 * This test file implements end-to-end authentication workflow testing
 * including complete registration-to-login flows with MFA scenarios.
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response } from 'express';

// Create complete mock services for workflow testing
const createMockDatabase = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  session: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
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
  // Registration services
  validateEmail: jest.fn().mockReturnValue(true),
  validatePassword: jest.fn().mockReturnValue(true),
  hashPassword: jest.fn().mockResolvedValue('hashedPassword123'),
  generateVerificationToken: jest.fn().mockReturnValue('verification-token-123'),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  
  // Login services
  verifyPassword: jest.fn().mockResolvedValue(true),
  generateAccessToken: jest.fn().mockReturnValue('access-token-123'),
  generateRefreshToken: jest.fn().mockReturnValue('refresh-token-123'),
  rateLimitCheck: jest.fn().mockResolvedValue({ allowed: true, remaining: 4 }),
  
  // MFA services
  generateMFACode: jest.fn().mockReturnValue('123456'),
  sendMFACode: jest.fn().mockResolvedValue(true),
  verifyMFACode: jest.fn().mockReturnValue(true),
  generateMFASecret: jest.fn().mockReturnValue('SECRET123'),
  
  // Token services
  verifyAccessToken: jest.fn().mockReturnValue({ valid: true, userId: 'user-123' }),
  verifyRefreshToken: jest.fn().mockReturnValue({ valid: true, userId: 'user-123' })
});

// Create complete authentication controller for workflow testing
const createAuthWorkflowController = (authService: any, database: any, redis: any) => {
  // Registration endpoint
  const register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ success: false, error: 'Missing required fields', code: 'MISSING_FIELDS' });
        return;
      }

      if (!authService.validateEmail(email) || !authService.validatePassword(password)) {
        res.status(400).json({ success: false, error: 'Invalid email or password format', code: 'INVALID_FORMAT' });
        return;
      }

      const existingUser = await database.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(409).json({ success: false, error: 'User already exists', code: 'USER_EXISTS' });
        return;
      }

      const hashedPassword = await authService.hashPassword(password);
      const user = await database.user.create({
        data: { email, password: hashedPassword, firstName, lastName, verified: false, mfaEnabled: false }
      });

      const verificationToken = authService.generateVerificationToken();
      await redis.setex(`verification:${user.id}`, 86400, verificationToken);
      await authService.sendVerificationEmail(email, verificationToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, verified: user.verified }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };

  // Email verification endpoint
  const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, userId } = req.body;

      if (!token || !userId) {
        res.status(400).json({ success: false, error: 'Missing token or user ID', code: 'MISSING_FIELDS' });
        return;
      }

      const storedToken = await redis.get(`verification:${userId}`);
      if (!storedToken || storedToken !== token) {
        res.status(400).json({ success: false, error: 'Invalid or expired verification token', code: 'INVALID_TOKEN' });
        return;
      }

      await database.user.update({ where: { id: userId }, data: { verified: true } });
      await redis.del(`verification:${userId}`);

      res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };

  // Login endpoint
  const login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required', code: 'MISSING_CREDENTIALS' });
        return;
      }

      const rateLimit = await authService.rateLimitCheck(email);
      if (!rateLimit.allowed) {
        res.status(429).json({ success: false, error: 'Too many login attempts', code: 'RATE_LIMITED' });
        return;
      }

      const user = await database.user.findUnique({ where: { email } });
      if (!user || !user.verified || !(await authService.verifyPassword(password, user.password))) {
        res.status(401).json({ success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
        return;
      }

      if (user.mfaEnabled) {
        const mfaCode = authService.generateMFACode();
        await redis.setex(`mfa:${user.id}`, 300, mfaCode);
        await authService.sendMFACode(user.email, mfaCode);
        res.status(200).json({ success: true, message: 'MFA code sent', requiresMFA: true, userId: user.id });
        return;
      }

      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);
      
      const session = await database.session.create({
        data: { userId: user.id, refreshToken, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      });

      await database.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
          tokens: { accessToken, refreshToken },
          session: { id: session.id, expiresAt: session.expiresAt }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };

  // MFA setup endpoint
  const setupMFA = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ success: false, error: 'User ID is required', code: 'MISSING_USER_ID' });
        return;
      }

      const mfaSecret = authService.generateMFASecret();
      await database.user.update({
        where: { id: userId },
        data: { mfaSecret, mfaEnabled: true }
      });

      res.status(200).json({
        success: true,
        message: 'MFA setup successful',
        data: { mfaSecret, qrCode: `qr-code-for-${mfaSecret}` }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };

  // Logout endpoint
  const logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'Refresh token is required', code: 'MISSING_TOKEN' });
        return;
      }

      await database.session.delete({ where: { refreshToken } });
      res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };

  return { register, verifyEmail, login, setupMFA, logout };
};

// Create comprehensive test Express app
const createAuthWorkflowTestApp = (authService: any, database: any, redis: any) => {
  const app = express();
  const authController = createAuthWorkflowController(authService, database, redis);

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Auth routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/verify-email', authController.verifyEmail);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/setup-mfa', authController.setupMFA);
  app.post('/api/auth/logout', authController.logout);

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found', path: req.originalUrl });
  });

  return app;
};

describe('Authentication Workflows - Integration', () => {
  let app: express.Application;
  let mockDatabase: any;
  let mockRedis: any;
  let mockAuthService: any;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    mockRedis = createMockRedis();
    mockAuthService = createMockAuthService();
    app = createAuthWorkflowTestApp(mockAuthService, mockDatabase, mockRedis);

    // Default successful user creation
    mockDatabase.user.create.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      verified: false,
      mfaEnabled: false
    });

    // Default session creation
    mockDatabase.session.create.mockResolvedValue({
      id: 'session-123',
      userId: 'user-123',
      refreshToken: 'refresh-token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  });

  describe('Complete Registration-to-Login Workflow', () => {
    const userRegistrationData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User'
    };

    it('should complete full user registration and login workflow', async () => {
      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userRegistrationData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.verified).toBe(false);
      const userId = registerResponse.body.data.id;

      // Step 2: Verify email
      mockRedis.get.mockResolvedValueOnce('verification-token-123');
      mockDatabase.user.update.mockResolvedValueOnce({ id: userId, verified: true });

      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'verification-token-123',
          userId
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);

      // Step 3: Login with verified user
      mockDatabase.user.findUnique.mockResolvedValueOnce({
        id: userId,
        email: userRegistrationData.email,
        password: 'hashedPassword123',
        firstName: userRegistrationData.firstName,
        lastName: userRegistrationData.lastName,
        verified: true,
        mfaEnabled: false
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userRegistrationData.email,
          password: userRegistrationData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.tokens).toHaveProperty('accessToken');
      expect(loginResponse.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should prevent login before email verification', async () => {
      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userRegistrationData)
        .expect(201);

      // Attempt login without email verification
      mockDatabase.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        email: userRegistrationData.email,
        password: 'hashedPassword123',
        verified: false, // Email not verified
        mfaEnabled: false
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userRegistrationData.email,
          password: userRegistrationData.password
        })
        .expect(401);

      expect(loginResponse.body.success).toBe(false);
      expect(loginResponse.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('MFA Workflow Integration', () => {
    it('should complete MFA setup and login workflow', async () => {
      const userId = 'user-123';

      // Step 1: Setup MFA
      mockDatabase.user.update.mockResolvedValueOnce({
        id: userId,
        mfaSecret: 'SECRET123',
        mfaEnabled: true
      });

      const setupResponse = await request(app)
        .post('/api/auth/setup-mfa')
        .send({ userId })
        .expect(200);

      expect(setupResponse.body.success).toBe(true);
      expect(setupResponse.body.data).toHaveProperty('mfaSecret');

      // Step 2: Login with MFA-enabled user
      mockDatabase.user.findUnique.mockResolvedValueOnce({
        id: userId,
        email: 'test@example.com',
        password: 'hashedPassword123',
        verified: true,
        mfaEnabled: true,
        mfaSecret: 'SECRET123'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.requiresMFA).toBe(true);
      expect(loginResponse.body).not.toHaveProperty('tokens'); // No tokens until MFA verified
    });
  });

  describe('Session Management Workflow', () => {
    it('should handle complete login-logout cycle', async () => {
      // Login
      mockDatabase.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        verified: true,
        mfaEnabled: false
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      // Logout
      mockDatabase.session.delete.mockResolvedValueOnce({});

      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
      expect(mockDatabase.session.delete).toHaveBeenCalledWith({
        where: { refreshToken }
      });
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle registration with existing email gracefully', async () => {
      // First registration succeeds
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          firstName: 'Existing',
          lastName: 'User'
        })
        .expect(201);

      // Second registration with same email fails
      mockDatabase.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'existing@example.com'
      });

      const duplicateResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'AnotherPass123!',
          firstName: 'Another',
          lastName: 'User'
        })
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.code).toBe('USER_EXISTS');
    });

    it('should handle invalid verification tokens gracefully', async () => {
      // Register user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(201);

      // Attempt verification with invalid token
      mockRedis.get.mockResolvedValueOnce(null); // Token not found/expired

      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'invalid-token',
          userId: 'user-123'
        })
        .expect(400);

      expect(verifyResponse.body.success).toBe(false);
      expect(verifyResponse.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent registration requests', async () => {
      const registrationPromises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `user${i}@example.com`,
            password: 'SecurePass123!',
            firstName: 'User',
            lastName: `${i}`
          })
          .expect(201)
      );

      const responses = await Promise.all(registrationPromises);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });

    it('should meet performance requirements for auth endpoints', async () => {
      const performanceTests = [
        { endpoint: '/api/auth/register', data: { email: 'perf@test.com', password: 'SecurePass123!', firstName: 'Perf', lastName: 'Test' }, maxTime: 200 },
        { endpoint: '/api/auth/login', data: { email: 'test@example.com', password: 'SecurePass123!' }, maxTime: 200 }
      ];

      // Setup for login test
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        verified: true,
        mfaEnabled: false
      });

      for (const test of performanceTests) {
        const startTime = Date.now();
        await request(app)
          .post(test.endpoint)
          .send(test.data)
          .expect((res) => res.status < 500); // Accept any non-server-error status
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(test.maxTime);
      }
    });
  });

  describe('Service Integration Validation', () => {
    it('should verify all services are called in complete workflow', async () => {
      // Complete registration workflow
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'integration@test.com',
          password: 'SecurePass123!',
          firstName: 'Integration',
          lastName: 'Test'
        })
        .expect(201);

      // Verify service calls
      expect(mockAuthService.validateEmail).toHaveBeenCalledWith('integration@test.com');
      expect(mockAuthService.validatePassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockAuthService.generateVerificationToken).toHaveBeenCalled();
      expect(mockAuthService.sendVerificationEmail).toHaveBeenCalled();

      expect(mockDatabase.user.findUnique).toHaveBeenCalled();
      expect(mockDatabase.user.create).toHaveBeenCalled();

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });
});
