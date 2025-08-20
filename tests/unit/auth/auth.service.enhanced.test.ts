// @ts-nocheck - Jest mock compatibility with Prisma types
/**
 * Enhanced Authentication Service Unit Tests
 * Dessai Backend - TASK-TEST-002 Implementation
 * @testing persona validation - Phase 1: Service Integration
 */

import { AuthService } from '../../../src/services/auth.service';
import { PasswordUtil } from '../../../src/utils/password.util';
import { JWTUtil } from '../../../src/utils/jwt.util';
import { TOTPUtil } from '../../../src/utils/totp.util';
import { PrismaClient } from '@prisma/client';
import RedisService from '../../../src/services/redis.service';

// Mock the dependencies
jest.mock('@prisma/client');
jest.mock('../../../src/services/redis.service');
jest.mock('../../../src/utils/password.util');
jest.mock('../../../src/utils/jwt.util');
jest.mock('../../../src/utils/totp.util');

describe('Authentication Service Unit Tests - Enhanced', () => {
  let authService: AuthService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRedisService: jest.Mocked<RedisService>;

  // Complete mock user with all required fields
  const createMockUser = (overrides: any = {}) => ({
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed-password',
    isActive: true,
    emailVerified: true,
    mfaEnabled: false,
    mfaSecret: null,
    refreshTokens: [],
    organizationId: 'org-123',
    roleId: 'role-123',
    timezone: 'UTC',
    preferences: {},
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 'role-123',
      name: 'Candidate',
      description: 'Candidate role',
      permissions: ['read:assessments'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
      domain: 'testorg.com',
      settings: {}
    },
    ...overrides
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset singleton instance
    AuthService.resetInstance();

    // Create comprehensive Prisma mock
    mockPrisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
      role: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      organization: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    // Create Redis mock
    mockRedisService = {
      setSession: jest.fn(),
      getSession: jest.fn(),
      deleteSession: jest.fn(),
      getInstance: jest.fn(),
    } as any;

    // Create service instance with mocked dependencies
    authService = AuthService.getInstance(mockPrisma, mockRedisService);

    // Setup default utility mocks
    (PasswordUtil.validatePassword as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
    (PasswordUtil.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
    (PasswordUtil.verifyPassword as jest.Mock).mockResolvedValue(true);
    (JWTUtil.generateAccessToken as jest.Mock).mockReturnValue('access-token');
    (JWTUtil.generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');
    (JWTUtil.generateSessionId as jest.Mock).mockReturnValue('session-123');
    (JWTUtil.verifyAccessToken as jest.Mock).mockReturnValue({ userId: 'user-123', role: 'Candidate' });
    (JWTUtil.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-123', sessionId: 'session-123' });
    (TOTPUtil.generateSecret as jest.Mock).mockReturnValue({ secret: 'secret-123', otpauthUrl: 'otpauth://...' });
    (TOTPUtil.generateQRCode as jest.Mock).mockResolvedValue('data:image/png;base64,...');
    (TOTPUtil.generateBackupCodes as jest.Mock).mockReturnValue(['code1', 'code2']);
    (TOTPUtil.verifyToken as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    AuthService.resetInstance();
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-123',
        organizationId: 'org-123'
      };

      const mockUser = createMockUser();
      
      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      mockPrisma.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await authService.register(registrationData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(PasswordUtil.validatePassword).toHaveBeenCalledWith('Password123!');
      expect(PasswordUtil.hashPassword).toHaveBeenCalledWith('Password123!');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });

    test('should reject registration for existing user', async () => {
      // Arrange
      const registrationData = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-123',
        organizationId: 'org-123'
      };

      const existingUser = createMockUser({ email: 'existing@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(authService.register(registrationData))
        .rejects.toThrow('User already exists with this email');
    });

    test('should reject registration with weak password', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-123',
        organizationId: 'org-123'
      };

      (PasswordUtil.validatePassword as jest.Mock).mockReturnValue({ 
        isValid: false, 
        errors: ['Password too short'] 
      });

      // Act & Assert
      await expect(authService.register(registrationData))
        .rejects.toThrow('Password validation failed');
    });
  });

  describe('User Login', () => {
    test('should login user successfully without MFA', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (PasswordUtil.verifyPassword as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.requiresMfa).toBe(false);
    });

    test('should require MFA when enabled', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const mockUser = createMockUser({ mfaEnabled: true, mfaSecret: 'secret-123' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (PasswordUtil.verifyPassword as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result).toBeDefined();
      expect(result.requiresMfa).toBe(true);
      expect(result.accessToken).toBe(''); // Empty when MFA required
      expect(result.refreshToken).toBe(''); // Empty when MFA required
      expect(result.expiresIn).toBe(0);
    });

    test('should reject login with invalid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (PasswordUtil.verifyPassword as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid credentials');
    });

    test('should reject login for non-existent user', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid credentials');
    });

    test('should reject login for inactive user', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const mockUser = createMockUser({ isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (PasswordUtil.verifyPassword as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects.toThrow('Account is deactivated');
    });
  });

  describe('MFA Setup', () => {
    test('should setup MFA successfully', async () => {
      // Arrange
      const mockUser = createMockUser({ mfaEnabled: false });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'secret-123'
      });

      // Act
      const result = await authService.setupMfa('user-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.secret).toBe('secret-123');
      expect(result.qrCode).toBe('data:image/png;base64,...');
      expect(result.backupCodes).toEqual(['code1', 'code2']);
    });

    test('should reject MFA setup for non-existent user', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.setupMfa('nonexistent-user'))
        .rejects.toThrow('User not found');
    });

    test('should reject MFA setup if already enabled', async () => {
      // Arrange
      const mockUser = createMockUser({ mfaEnabled: true });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.setupMfa('user-123'))
        .rejects.toThrow('MFA is already enabled for this user');
    });
  });

  describe('JWT Payload Validation', () => {
    test('should validate JWT payload successfully', async () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Candidate'
      };

      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateJWTPayload(payload);

      // Assert
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(result?.id).toBe('user-123');
    });

    test('should reject validation for inactive user', async () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Candidate'
      };

      const mockUser = createMockUser({ isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateJWTPayload(payload);

      // Assert
      expect(result).toBeNull();
    });
  });
});
