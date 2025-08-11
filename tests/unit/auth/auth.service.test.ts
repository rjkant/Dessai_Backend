// @ts-nocheck - Jest mock compatibility with Prisma types
/**
 * Authentication Service Unit Tests
 * Dessai Backend - TASK-CG-003 Testing
 * @testing persona validation
 */

import { AuthService } from '../../../src/services/auth.service';
import { PasswordUtil } from '../../../src/utils/password.util';
import { JWTUtil } from '../../../src/utils/jwt.util';
import { TOTPUtil } from '../../../src/utils/totp.util';
import { PrismaClient } from '@prisma/client';
import RedisService from '../../../src/services/redis.service';
import { mockPrismaClient } from '../../setup/database-mocks';

// Mock the dependencies
jest.mock('@prisma/client');
jest.mock('../../../src/services/redis.service');
jest.mock('../../../src/utils/password.util');
jest.mock('../../../src/utils/jwt.util');
jest.mock('../../../src/utils/totp.util');

describe('Authentication Service Unit Tests', () => {
  let authService: AuthService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRedisService: jest.Mocked<RedisService>;

  const mockUser = {
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
    }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh service instance
    authService = AuthService.getInstance();

    // Use the global mock from database-mocks.ts
    mockPrisma = mockPrismaClient;

    // Setup Redis mock
    mockRedisService = {
      setSession: jest.fn(),
      getSession: jest.fn(),
      deleteSession: jest.fn(),
    } as any;

    // Mock static utility methods
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

      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      mockPrisma.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await authService.register(registrationData);

      // Assert
      expect(PasswordUtil.validatePassword).toHaveBeenCalledWith('Password123!');
      expect(PasswordUtil.hashPassword).toHaveBeenCalledWith('Password123!');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          passwordHash: 'hashed-password',
          mfaEnabled: false,
          isActive: true,
          emailVerified: false,
          organizationId: 'org-123',
          roleId: 'role-123',
          refreshTokens: []
        },
        include: {
          role: true,
          organization: true
        }
      });
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    test('should reject registration for existing user', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-123',
        organizationId: 'org-123'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // User already exists

      // Act & Assert
      await expect(authService.register(registrationData)).rejects.toThrow('User already exists with this email');
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
        errors: ['Password must be at least 8 characters long'] 
      });

      // Act & Assert
      await expect(authService.register(registrationData)).rejects.toThrow('Password validation failed');
    });
  });

  describe('User Login', () => {
    test('should login user successfully without MFA', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockRedisService.setSession.mockResolvedValue();

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { 
          role: true,
          organization: true 
        }
      });
      expect(PasswordUtil.verifyPassword).toHaveBeenCalledWith('Password123!', 'hashed-password');
      expect(JWTUtil.generateAccessToken).toHaveBeenCalled();
      expect(JWTUtil.generateRefreshToken).toHaveBeenCalled();
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.requiresMfa).toBe(false);
      expect(result.user.email).toBe('test@example.com');
    });

    test('should require MFA when enabled', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const mfaUser = { ...mockUser, mfaEnabled: true, mfaSecret: 'secret-123' };
      mockPrisma.user.findUnique.mockResolvedValue(mfaUser);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result.requiresMfa).toBe(true);
      expect(result.accessToken).toBe('');
      expect(result.refreshToken).toBe('');
    });

    test('should complete MFA login successfully', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!',
        mfaToken: '123456'
      };

      const mfaUser = { ...mockUser, mfaEnabled: true, mfaSecret: 'secret-123' };
      mockPrisma.user.findUnique.mockResolvedValue(mfaUser);
      mockPrisma.user.update.mockResolvedValue(mfaUser);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(TOTPUtil.verifyToken).toHaveBeenCalledWith('123456', 'secret-123');
      expect(result.requiresMfa).toBe(false);
      expect(result.accessToken).toBe('access-token');
    });

    test('should reject login for inactive user', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Account is deactivated');
    });

    test('should reject login with invalid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (PasswordUtil.verifyPassword as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    test('should reject login for non-existent user', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Token Refresh', () => {
    test('should refresh token successfully', async () => {
      // Arrange
      const refreshData = { refreshToken: 'refresh-token' };
      
      mockRedisService.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        isActive: true,
        createdAt: new Date(),
        lastAccessAt: new Date(),
        expiresAt: new Date(Date.now() + 1000000), // Future date
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await authService.refreshToken(refreshData);

      // Assert
      expect(JWTUtil.verifyRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(result.accessToken).toBe('access-token');
      expect(result.expiresIn).toBeDefined();
    });

    test('should reject refresh with expired session', async () => {
      // Arrange
      const refreshData = { refreshToken: 'refresh-token' };
      
      mockRedisService.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        isActive: true,
        createdAt: new Date(),
        lastAccessAt: new Date(),
        expiresAt: new Date(Date.now() - 1000000), // Past date
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });

      // Act & Assert
      await expect(authService.refreshToken(refreshData)).rejects.toThrow('Session expired');
    });
  });

  describe('MFA Setup', () => {
    test('should setup MFA successfully', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      // Act
      const result = await authService.setupMfa('user-123');

      // Assert
      expect(TOTPUtil.generateSecret).toHaveBeenCalledWith('test@example.com');
      expect(TOTPUtil.generateQRCode).toHaveBeenCalled();
      expect(TOTPUtil.generateBackupCodes).toHaveBeenCalled();
      expect(result.secret).toBe('secret-123');
      expect(result.qrCode).toBe('data:image/png;base64,...');
      expect(result.backupCodes).toEqual(['code1', 'code2']);
    });

    test('should reject MFA setup for non-existent user', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.setupMfa('nonexistent-user')).rejects.toThrow('User not found');
    });

    test('should reject MFA setup if already enabled', async () => {
      // Arrange
      const mfaUser = { ...mockUser, mfaEnabled: true };
      mockPrisma.user.findUnique.mockResolvedValue(mfaUser);

      // Act & Assert
      await expect(authService.setupMfa('user-123')).rejects.toThrow('MFA is already enabled for this user');
    });
  });

  describe('MFA Verification', () => {
    test('should verify MFA successfully', async () => {
      // Arrange
      const mfaData = { token: '123456' };
      const userWithSecret = { ...mockUser, mfaSecret: 'secret-123' };
      
      mockPrisma.user.findUnique.mockResolvedValue(userWithSecret);
      mockPrisma.user.update.mockResolvedValue(userWithSecret);

      // Act
      const result = await authService.verifyMfa('user-123', mfaData);

      // Assert
      expect(TOTPUtil.verifyToken).toHaveBeenCalledWith('123456', 'secret-123');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { mfaEnabled: true }
      });
      expect(result.success).toBe(true);
    });

    test('should reject invalid MFA token', async () => {
      // Arrange
      const mfaData = { token: '000000' };
      const userWithSecret = { ...mockUser, mfaSecret: 'secret-123' };
      
      mockPrisma.user.findUnique.mockResolvedValue(userWithSecret);
      (TOTPUtil.verifyToken as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(authService.verifyMfa('user-123', mfaData)).rejects.toThrow('Invalid MFA token');
    });
  });

  describe('Password Change', () => {
    test('should change password successfully', async () => {
      // Arrange
      const passwordData = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword123!'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      (PasswordUtil.hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');

      // Act
      const result = await authService.changePassword('user-123', passwordData);

      // Assert
      expect(PasswordUtil.verifyPassword).toHaveBeenCalledWith('oldPassword123!', 'hashed-password');
      expect(PasswordUtil.validatePassword).toHaveBeenCalledWith('newPassword123!');
      expect(PasswordUtil.hashPassword).toHaveBeenCalledWith('newPassword123!');
      expect(result.success).toBe(true);
    });

    test('should reject password change with incorrect current password', async () => {
      // Arrange
      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123!'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (PasswordUtil.verifyPassword as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.changePassword('user-123', passwordData)).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('Logout', () => {
    test('should logout successfully', async () => {
      // Arrange
      const userWithTokens = { ...mockUser, refreshTokens: ['token1', 'token2'] };
      mockPrisma.user.findUnique.mockResolvedValue(userWithTokens);
      mockPrisma.user.update.mockResolvedValue(userWithTokens);
      mockRedisService.deleteSession.mockResolvedValue();

      // Act
      const result = await authService.logout('user-123', 'token1');

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { refreshTokens: ['token2'] }
      });
      expect(result.success).toBe(true);
    });
  });

  describe('JWT Payload Validation', () => {
    test('should validate JWT payload successfully', async () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Candidate',
        sessionId: 'session-123'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockRedisService.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        isActive: true,
        createdAt: new Date(),
        lastAccessAt: new Date(),
        expiresAt: new Date(Date.now() + 1000000), // Future date
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });

      // Act
      const result = await authService.validateJWTPayload(payload);

      // Assert
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    test('should reject validation for inactive user', async () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Candidate'
      };

      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      // Act
      const result = await authService.validateJWTPayload(payload);

      // Assert
      expect(result).toBeNull();
    });
  });
});
