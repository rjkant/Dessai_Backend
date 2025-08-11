/**
 * Authentication Middleware Unit Tests
 * Dessai Backend - TASK-CG-003 Testing
 * @testing persona validation
 */

import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../../../src/middleware/auth.middleware';
import { JWTUtil } from '../../../src/utils/jwt.util';
import { AuthService } from '../../../src/services/auth.service';
import { UserRole } from '../../../src/types/auth.types';

// Mock dependencies
jest.mock('../../../src/utils/jwt.util');
jest.mock('../../../src/services/auth.service');

describe('Authentication Middleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockAuthService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    emailVerified: true,
    mfaEnabled: false,
    refreshTokens: [],
    organizationId: 'org-123',
    roleId: 'role-123',
    timezone: 'UTC',
    preferences: {},
    lastLoginAt: new Date(),
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
    mockRequest = {
      headers: {},
      params: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();

    // Setup AuthService mock
    mockAuthService = {
      validateJWTPayload: jest.fn(),
    } as any;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    test('should authenticate user with valid token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      };

      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Candidate',
        sessionId: 'session-123'
      };

      (JWTUtil.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      mockAuthService.validateJWTPayload.mockResolvedValue(mockUser);

      // Act
      await AuthMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(JWTUtil.verifyAccessToken).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockAuthService.validateJWTPayload).toHaveBeenCalledWith(mockPayload);
      expect(mockRequest.user).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com'
      }));
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should reject request without authorization header', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await AuthMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authorization header required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should reject request with malformed authorization header', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat token'
      };

      // Act
      await AuthMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid authorization header format'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should reject request with invalid JWT token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-jwt-token'
      };

      (JWTUtil.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      await AuthMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should reject request when user validation fails', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      };

      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Candidate',
        sessionId: 'session-123'
      };

      (JWTUtil.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      mockAuthService.validateJWTPayload.mockResolvedValue(null); // User validation fails

      // Act
      await AuthMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    test('should authorize user with correct role', () => {
      // Arrange
      mockRequest.user = mockUser;
      const authorizeMiddleware = AuthMiddleware.authorize([UserRole.CANDIDATE]);

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should reject user without required role', () => {
      // Arrange
      mockRequest.user = mockUser;
      const authorizeMiddleware = AuthMiddleware.authorize([UserRole.ADMIN]);

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated user', () => {
      // Arrange
      delete (mockRequest as any).user;
      const authorizeMiddleware = AuthMiddleware.authorize([UserRole.CANDIDATE]);

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should authorize user with multiple valid roles', () => {
      // Arrange
      const adminUser = {
        ...mockUser,
        role: {
          id: 'admin-role',
          name: 'OrgAdmin',
          description: 'Organization Admin',
          permissions: ['manage:users'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      mockRequest.user = adminUser;
      const authorizeMiddleware = AuthMiddleware.authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin middleware', () => {
    test('should allow admin user', () => {
      // Arrange
      const adminUser = {
        ...mockUser,
        role: {
          id: 'admin-role',
          name: 'OrgAdmin',
          description: 'Organization Admin',
          permissions: ['manage:users'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      mockRequest.user = adminUser;

      // Act
      AuthMiddleware.requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should reject non-admin user', () => {
      // Arrange
      mockRequest.user = mockUser; // Candidate role

      // Act
      AuthMiddleware.requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    test('should proceed with valid token and set user', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      };

      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Candidate',
        sessionId: 'session-123'
      };

      (JWTUtil.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      mockAuthService.validateJWTPayload.mockResolvedValue(mockUser);

      // Act
      await AuthMiddleware.optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockRequest.user).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should proceed without token and not set user', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await AuthMiddleware.optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should proceed with invalid token and not set user', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      (JWTUtil.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      await AuthMiddleware.optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireOwnership middleware', () => {
    test('should allow user to access their own data', () => {
      // Arrange
      mockRequest.user = mockUser;
      mockRequest.params = { userId: 'user-123' };
      const ownershipMiddleware = AuthMiddleware.requireOwnership('userId');

      // Act
      ownershipMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should allow admin to access any user data', () => {
      // Arrange
      const adminUser = {
        ...mockUser,
        role: {
          id: 'admin-role',
          name: 'OrgAdmin',
          description: 'Organization Admin',
          permissions: ['manage:users'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      mockRequest.user = adminUser;
      mockRequest.params = { userId: 'other-user-123' };
      const ownershipMiddleware = AuthMiddleware.requireOwnership('userId');

      // Act
      ownershipMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should reject user accessing other user data', () => {
      // Arrange
      mockRequest.user = mockUser;
      mockRequest.params = { userId: 'other-user-123' };
      const ownershipMiddleware = AuthMiddleware.requireOwnership('userId');

      // Act
      ownershipMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated request', () => {
      // Arrange
      delete (mockRequest as any).user;
      mockRequest.params = { userId: 'user-123' };
      const ownershipMiddleware = AuthMiddleware.requireOwnership('userId');

      // Act
      ownershipMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
