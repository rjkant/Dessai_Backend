/**
 * User Controller Unit Tests
 * TASK-TEST-004: User Management System Testing
 * Persona: Quality Assurance Engineer
 * 
 * Comprehensive unit tests for user profile management controller
 * with mocked service dependencies and HTTP response validation.
 */

import { Request, Response, NextFunction } from 'express';
import { UserController } from '@/controllers/user.controller';
import { UserService } from '@/services/user.service';
import { AppError } from '@/utils/app-error.util';
import {
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  UserProfile,
  UserPreferences
} from '@/types/user.types';

// Mock the UserService
jest.mock('@/services/user.service');
jest.mock('@/utils/app-error.util');

const mockUserService = {
  createProfile: jest.fn(),
  getProfileById: jest.fn(),
  getProfileByEmail: jest.fn(),
  updateProfile: jest.fn(),
  deleteProfile: jest.fn(),
  searchUsers: jest.fn(),
  updatePreferences: jest.fn(),
  verifyEmail: jest.fn(),
  getUserActivity: jest.fn(),
  updateProfileImage: jest.fn(),
  calculateProfileCompletion: jest.fn(),
  getUsersByOrganization: jest.fn(),
  getUsersByRole: jest.fn(),
  activateUser: jest.fn(),
  deactivateUser: jest.fn(),
  updateLastLogin: jest.fn()
} as unknown as jest.Mocked<UserService>;

// Helper function to create valid UserProfile objects
const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  timezone: 'UTC',
  preferences: {},
  isActive: true,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  organization: {
    id: 'org-123',
    name: 'Test Org',
    slug: 'test-org'
  },
  role: {
    id: 'role-456',
    name: 'Test Role'
  },
  ...overrides
});

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    userController = new UserController(mockUserService);
    
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('createUser', () => {
    const validCreateRequest: CreateUserProfileRequest = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'SecurePassword123!',
      organizationId: 'org-123',
      roleId: 'role-456'
    };

    it('should create user successfully', async () => {
      // Arrange
      const mockUserResponse = createMockUserProfile({
        role: {
          id: 'role-456',
          name: 'Test Role',
          description: 'Test role description'
        }
      });
      mockRequest.body = validCreateRequest;
      mockUserService.createProfile.mockResolvedValue(mockUserResponse);

      // Act
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.createProfile).toHaveBeenCalledWith(validCreateRequest);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User profile created successfully',
        data: mockUserResponse
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockRequest.body = validCreateRequest;
      const serviceError = new Error('Email already exists');
      mockUserService.createProfile.mockRejectedValue(serviceError);

      // Act
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = createMockUserProfile({
        emailVerified: true,
        lastLoginAt: new Date()
      });
      mockRequest.params = { id: 'user-123' };
      mockUserService.getProfileById.mockResolvedValue(mockUser);

      // Act
      await userController.getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getProfileById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should throw 404 when user not found', async () => {
      // Arrange
      mockRequest.params = { id: 'nonexistent-id' };
      mockUserService.getProfileById.mockResolvedValue(null);

      // Act
      await userController.getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('updateUser', () => {
    const updateRequest: UpdateUserProfileRequest = {
      firstName: 'Jane',
      lastName: 'Smith',
      timezone: 'America/New_York'
    };

    it('should update user successfully', async () => {
      // Arrange
      const mockUpdatedUser = createMockUserProfile({
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'America/New_York',
        emailVerified: true
      });
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = updateRequest;
      mockUserService.updateProfile.mockResolvedValue(mockUpdatedUser);

      // Act
      await userController.updateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.updateProfile).toHaveBeenCalledWith('user-123', updateRequest);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User profile updated successfully',
        data: mockUpdatedUser
      });
    });

    it('should handle update errors', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = updateRequest;
      const serviceError = new Error('User not found');
      mockUserService.updateProfile.mockRejectedValue(serviceError);

      // Act
      await userController.updateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockUserService.deleteProfile.mockResolvedValue(undefined);

      // Act
      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.deleteProfile).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User profile deleted successfully'
      });
    });

    it('should handle deletion errors', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      const serviceError = new Error('User not found');
      mockUserService.deleteProfile.mockRejectedValue(serviceError);

      // Act
      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('searchUsers', () => {
    const mockSearchResult = {
      users: [
        createMockUserProfile({
          email: 'john@example.com',
          emailVerified: true
        })
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    it('should search users with query parameters', async () => {
      // Arrange
      mockRequest.query = {
        search: 'john',
        page: '1',
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      mockUserService.searchUsers.mockResolvedValue(mockSearchResult);

      // Act
      await userController.searchUsers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.searchUsers).toHaveBeenCalledWith({
        search: 'john',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSearchResult.users,
        pagination: mockSearchResult.pagination
      });
    });

    it('should use default values for missing query parameters', async () => {
      // Arrange
      mockRequest.query = {};
      mockUserService.searchUsers.mockResolvedValue(mockSearchResult);

      // Act
      await userController.searchUsers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.searchUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      // Arrange
      const mockUser = createMockUserProfile({
        emailVerified: true,
        preferences: {
          notifications: {
            email: true,
            inApp: true,
            assessmentReminders: true
          },
          privacy: {
            profileVisibility: 'organization',
            allowAnalytics: true
          },
          ui: {
            theme: 'light',
            language: 'en',
            dateFormat: 'YYYY-MM-DD',
            timeFormat: '24h'
          },
          assessment: {
            autoSave: true,
            confirmNavigation: true,
            showTimer: true
          }
        }
      });
      mockRequest.params = { id: 'user-123' };
      mockUserService.getProfileById.mockResolvedValue(mockUser);

      // Act
      await userController.getUserPreferences(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getProfileById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser.preferences
      });
    });

    it('should throw 404 when user not found for preferences', async () => {
      // Arrange
      mockRequest.params = { id: 'nonexistent-id' };
      mockUserService.getProfileById.mockResolvedValue(null);

      // Act
      await userController.getUserPreferences(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('updateUserPreferences', () => {
    const preferences: Partial<UserPreferences> = {
      notifications: {
        email: false,
        inApp: true,
        assessmentReminders: false
      }
    };

    it('should update user preferences successfully', async () => {
      // Arrange
      const mockUpdatedUser = createMockUserProfile({
        emailVerified: true,
        preferences: preferences
      });
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = preferences;
      mockUserService.updatePreferences.mockResolvedValue(mockUpdatedUser);

      // Act
      await userController.updateUserPreferences(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.updatePreferences).toHaveBeenCalledWith('user-123', preferences);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User preferences updated successfully',
        data: mockUpdatedUser.preferences
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      // Arrange
      const mockVerifiedUser = createMockUserProfile({
        emailVerified: true
      });
      mockRequest.params = { id: 'user-123' };
      mockUserService.verifyEmail.mockResolvedValue(mockVerifiedUser);

      // Act
      await userController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.verifyEmail).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully',
        data: mockVerifiedUser
      });
    });
  });

  describe('getUserActivity', () => {
    const mockActivity = {
      lastLoginAt: new Date(),
      assessmentsCompleted: 5,
      assessmentsInProgress: 2,
      organizationRole: 'Developer',
      profileCompletion: {
        percentage: 80,
        missingFields: ['profileImage'],
        recommendations: ['Add a profile image']
      },
      accountStatus: 'active' as const
    };

    it('should return user activity', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockUserService.getUserActivity.mockResolvedValue(mockActivity);

      // Act
      await userController.getUserActivity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getUserActivity).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockActivity
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      // Arrange
      const mockUser = createMockUserProfile({
        emailVerified: true
      });
      mockRequest = {
        ...mockRequest,
        user: { id: 'user-123' }
      } as any;
      mockUserService.getProfileById.mockResolvedValue(mockUser);

      // Act
      await userController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getProfileById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should throw 401 when user not authenticated', async () => {
      // Arrange - no user in request
      mockRequest = { ...mockRequest };

      // Act
      await userController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('updateCurrentUser', () => {
    const updateRequest: UpdateUserProfileRequest = {
      firstName: 'Jane',
      lastName: 'Smith'
    };

    it('should update current user profile', async () => {
      // Arrange
      const mockUpdatedUser = createMockUserProfile({
        firstName: 'Jane',
        lastName: 'Smith',
        emailVerified: true
      });
      mockRequest = {
        ...mockRequest,
        user: { id: 'user-123' },
        body: updateRequest
      } as any;
      mockUserService.updateProfile.mockResolvedValue(mockUpdatedUser);

      // Act
      await userController.updateCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.updateProfile).toHaveBeenCalledWith('user-123', updateRequest);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: mockUpdatedUser
      });
    });

    it('should throw 401 when user not authenticated for update', async () => {
      // Arrange - no user in request
      mockRequest = { ...mockRequest, body: updateRequest };

      // Act
      await userController.updateCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    userController = new UserController(mockUserService);
    
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('createUser', () => {
    const validCreateRequest: CreateUserProfileRequest = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'SecurePassword123!',
      organizationId: 'org-123',
      roleId: 'role-456'
    };

    const mockUserResponse: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',

      timezone: 'UTC',
      preferences: {},
      isActive: true,
      emailVerified: false,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: 'Test role description'
      }
    };

    it('should create user successfully', async () => {
      // Arrange
      mockRequest.body = validCreateRequest;
      mockUserService.createProfile.mockResolvedValue(mockUserResponse);

      // Act
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.createProfile).toHaveBeenCalledWith(validCreateRequest);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User profile created successfully',
        data: mockUserResponse
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockRequest.body = validCreateRequest;
      const serviceError = new Error('Email already exists');
      mockUserService.createProfile.mockRejectedValue(serviceError);

      // Act
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getUserById', () => {
    const mockUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',

      timezone: 'UTC',
      preferences: {},
      isActive: true,
      emailVerified: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: null
      }
    };

    it('should return user when found', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockUserService.getProfileById.mockResolvedValue(mockUser);

      // Act
      await userController.getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getProfileById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should throw 404 when user not found', async () => {
      // Arrange
      mockRequest.params = { id: 'nonexistent-id' };
      mockUserService.getProfileById.mockResolvedValue(null);

      // Act
      await userController.getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getUserByEmail', () => {
    const mockUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',

      timezone: 'UTC',
      preferences: {},
      isActive: true,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: null
      }
    };

    it('should return user when found by email', async () => {
      // Arrange
      mockRequest.params = { email: 'test@example.com' };
      mockUserService.getProfileByEmail.mockResolvedValue(mockUser);

      // Act
      await userController.getUserByEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getProfileByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should throw 404 when user not found by email', async () => {
      // Arrange
      mockRequest.params = { email: 'nonexistent@example.com' };
      mockUserService.getProfileByEmail.mockResolvedValue(null);

      // Act
      await userController.getUserByEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('updateUser', () => {
    const updateRequest: UpdateUserProfileRequest = {
      firstName: 'Jane',
      lastName: 'Smith',
      timezone: 'America/New_York'
    };

    const mockUpdatedUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Jane',
      lastName: 'Smith',

      timezone: 'America/New_York',
      preferences: {},
      isActive: true,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: null
      }
    };

    it('should update user successfully', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = updateRequest;
      mockUserService.updateProfile.mockResolvedValue(mockUpdatedUser);

      // Act
      await userController.updateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.updateProfile).toHaveBeenCalledWith('user-123', updateRequest);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User profile updated successfully',
        data: mockUpdatedUser
      });
    });

    it('should handle update errors', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = updateRequest;
      const serviceError = new Error('User not found');
      mockUserService.updateProfile.mockRejectedValue(serviceError);

      // Act
      await userController.updateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockUserService.deleteProfile.mockResolvedValue(undefined);

      // Act
      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.deleteProfile).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User profile deleted successfully'
      });
    });

    it('should handle deletion errors', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      const serviceError = new Error('User not found');
      mockUserService.deleteProfile.mockRejectedValue(serviceError);

      // Act
      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('searchUsers', () => {
    const mockSearchResult = {
      users: [
        {
          id: 'user-123',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
    
          timezone: 'UTC',
          preferences: {},
          isActive: true,
          emailVerified: true,

          createdAt: new Date(),
          updatedAt: new Date(),
          organization: {
            id: 'org-123',
            name: 'Test Org',
            slug: 'test-org'
          },
          role: {
            id: 'role-456',
            name: 'Test Role',
            description: null
          }
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    it('should search users with query parameters', async () => {
      // Arrange
      mockRequest.query = {
        search: 'john',
        page: '1',
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      mockUserService.searchUsers.mockResolvedValue(mockSearchResult);

      // Act
      await userController.searchUsers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.searchUsers).toHaveBeenCalledWith({
        search: 'john',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSearchResult.users,
        pagination: mockSearchResult.pagination
      });
    });

    it('should use default values for missing query parameters', async () => {
      // Arrange
      mockRequest.query = {};
      mockUserService.searchUsers.mockResolvedValue(mockSearchResult);

      // Act
      await userController.searchUsers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.searchUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });
  });

  describe('getUserPreferences', () => {
    const mockUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',

      timezone: 'UTC',
      preferences: {
        notifications: {
          email: true,
          inApp: true,
          assessmentReminders: true
        },
        privacy: {
          profileVisibility: 'organization',
          allowAnalytics: true
        },
        ui: {
          theme: 'light',
          language: 'en',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h'
        },
        assessment: {
          autoSave: true,
          confirmNavigation: true,
          showTimer: true
        }
      },
      isActive: true,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: null
      }
    };

    it('should return user preferences', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockUserService.getProfileById.mockResolvedValue(mockUser);

      // Act
      await userController.getUserPreferences(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getProfileById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser.preferences
      });
    });

    it('should throw 404 when user not found for preferences', async () => {
      // Arrange
      mockRequest.params = { id: 'nonexistent-id' };
      mockUserService.getProfileById.mockResolvedValue(null);

      // Act
      await userController.getUserPreferences(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('updateUserPreferences', () => {
    const preferences: Partial<UserPreferences> = {
      notifications: {
        email: false,
        inApp: true,
        assessmentReminders: false
      }
    };

    const mockUpdatedUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',

      timezone: 'UTC',
      preferences: preferences,
      isActive: true,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: null
      }
    };

    it('should update user preferences successfully', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = preferences;
      mockUserService.updatePreferences.mockResolvedValue(mockUpdatedUser);

      // Act
      await userController.updateUserPreferences(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.updatePreferences).toHaveBeenCalledWith('user-123', preferences);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User preferences updated successfully',
        data: mockUpdatedUser.preferences
      });
    });
  });

  describe('verifyEmail', () => {
    const mockVerifiedUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',

      timezone: 'UTC',
      preferences: {},
      isActive: true,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: null
      }
    };

    it('should verify email successfully', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockUserService.verifyEmail.mockResolvedValue(mockVerifiedUser);

      // Act
      await userController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.verifyEmail).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully',
        data: mockVerifiedUser
      });
    });
  });

  describe('getUserActivity', () => {
    const mockActivity = {
      lastLoginAt: new Date(),
      assessmentsCompleted: 5,
      assessmentsInProgress: 2,
      organizationRole: 'Developer',
      profileCompletion: {
        percentage: 80,
        missingFields: ['profileImage'],
        recommendations: ['Add a profile image']
      },
      accountStatus: 'active' as const
    };

    it('should return user activity', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };
      mockUserService.getUserActivity.mockResolvedValue(mockActivity);

      // Act
      await userController.getUserActivity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getUserActivity).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockActivity
      });
    });
  });

  describe('getCurrentUser', () => {
    const mockUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',

      timezone: 'UTC',
      preferences: {},
      isActive: true,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: null
      }
    };

    it('should return current authenticated user', async () => {
      // Arrange
      mockRequest = {
        ...mockRequest,
        user: { id: 'user-123' }
      } as any;
      mockUserService.getProfileById.mockResolvedValue(mockUser);

      // Act
      await userController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getProfileById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should throw 401 when user not authenticated', async () => {
      // Arrange - no user in request
      mockRequest = { ...mockRequest };

      // Act
      await userController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('updateCurrentUser', () => {
    const updateRequest: UpdateUserProfileRequest = {
      firstName: 'Jane',
      lastName: 'Smith'
    };

    const mockUpdatedUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Jane',
      lastName: 'Smith',

      timezone: 'UTC',
      preferences: {},
      isActive: true,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      },
      role: {
        id: 'role-456',
        name: 'Test Role',
        description: null
      }
    };

    it('should update current user profile', async () => {
      // Arrange
      mockRequest = {
        ...mockRequest,
        user: { id: 'user-123' },
        body: updateRequest
      } as any;
      mockUserService.updateProfile.mockResolvedValue(mockUpdatedUser);

      // Act
      await userController.updateCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.updateProfile).toHaveBeenCalledWith('user-123', updateRequest);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: mockUpdatedUser
      });
    });

    it('should throw 401 when user not authenticated for update', async () => {
      // Arrange - no user in request
      mockRequest = { ...mockRequest, body: updateRequest };

      // Act
      await userController.updateCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});
