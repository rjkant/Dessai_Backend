/**
 * User Service Unit Tests
 * TASK-TEST-004: User Management System Testing
 * Persona: Quality Assurance Engineer
 * 
 * Comprehensive unit tests for user profile management service
 * with mocked dependencies and edge case validation.
 */

// Mock dependencies first
jest.mock('@prisma/client');
jest.mock('bcrypt');

// Mock validation utilities with explicit functions
jest.mock('@/utils/validation.util', () => ({
  validateCreateUserProfile: jest.fn(),
  validateUpdateUserProfile: jest.fn(),
  normalizeEmail: jest.fn(),
  stripSensitiveFields: jest.fn(),
  sanitizeUserInput: jest.fn()
}));

import { UserService } from '@/services/user.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  UserPreferences,
  UserError
} from '@/types/user.types';

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Import mocked validation utilities
const mockValidationUtil = jest.mocked(require('@/utils/validation.util'));

// Create proper mock functions for Prisma client
const mockPrismaUser = {
  create: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn()
};

const mockPrismaOrganization = {
  findUnique: jest.fn()
};

const mockPrismaRole = {
  findUnique: jest.fn()
};

const mockPrisma = {
  user: mockPrismaUser,
  organization: mockPrismaOrganization,
  role: mockPrismaRole
} as unknown as PrismaClient;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up validation utility mocks with proper implementation
    mockValidationUtil.validateCreateUserProfile.mockReturnValue({ isValid: true, errors: [] });
    mockValidationUtil.validateUpdateUserProfile.mockReturnValue({ isValid: true, errors: [] });
    mockValidationUtil.normalizeEmail.mockImplementation((email: string) => email.toLowerCase());
    mockValidationUtil.stripSensitiveFields.mockImplementation((user: any) => {
      if (!user) return null;
      const { passwordHash, mfaSecret, ...safe } = user;
      return {
        ...safe,
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        timezone: user.timezone,
        preferences: user.preferences || {},
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        organization: user.organization,
        role: user.role
      };
    });
    mockValidationUtil.sanitizeUserInput.mockImplementation((input: any) => input);
    
    userService = new UserService(mockPrisma);
  });

  describe('createProfile', () => {
    const validCreateRequest: CreateUserProfileRequest = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'SecurePassword123!',
      organizationId: 'org-123',
      roleId: 'role-456',
      timezone: 'UTC',
      preferences: {}
    };

    it('should create a user profile successfully', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      };
      const mockRole = {
        id: 'role-456',
        name: 'Test Role',
        description: 'Test role description'
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: hashedPassword,
        organizationId: 'org-123',
        roleId: 'role-456',
        timezone: 'UTC',
        preferences: {},
        isActive: true,
        emailVerified: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileImage: null,
        organization: mockOrganization,
        role: mockRole
      };

      // Mock organization and role lookups
      mockPrismaOrganization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaRole.findUnique.mockResolvedValue(mockRole);
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockPrismaUser.create.mockResolvedValue(mockUser);

      // Act
      const result = await userService.createProfile(validCreateRequest);

      // Assert
      expect(mockPrismaOrganization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-123' }
      });
      expect(mockPrismaRole.findUnique).toHaveBeenCalledWith({
        where: { id: 'role-456' }
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 12);
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          passwordHash: hashedPassword,
          organizationId: 'org-123',
          roleId: 'role-456'
        }),
        include: {
          organization: true,
          role: true
        }
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }));
    });

    it('should throw error for duplicate email', async () => {
      // Arrange
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      mockPrismaUser.create.mockRejectedValue(prismaError);
      mockBcrypt.hash.mockResolvedValue('hashed-password' as never);

      // Act & Assert
      await expect(userService.createProfile(validCreateRequest))
        .rejects
        .toThrow(UserError);
    });

    it('should hash password with correct salt rounds', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org'
      };
      const mockRole = {
        id: 'role-456',
        name: 'Test Role',
        description: null
      };
      
      // Mock organization and role lookups
      mockPrismaOrganization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaRole.findUnique.mockResolvedValue(mockRole);
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockPrismaUser.create.mockResolvedValue({
        id: 'user-123',
        organization: mockOrganization,
        role: mockRole
      } as any);

      // Act
      await userService.createProfile(validCreateRequest);

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 12);
    });
  });

  describe('getProfileById', () => {
    it('should return user profile when found', async () => {
      // Arrange
      const mockUser = {
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
        profileImage: null,
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

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getProfileById('user-123');

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: {
          organization: true,
          role: true
        }
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com'
      }));
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockPrismaUser.findUnique.mockResolvedValue(null);

      // Act
      const result = await userService.getProfileById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should exclude sensitive fields from response', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'sensitive-password-hash',
        mfaSecret: 'sensitive-mfa-secret',
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

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getProfileById('user-123');

      // Assert
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('mfaSecret');
    });
  });

  describe('getProfileByEmail', () => {
    it('should return user profile when found by email', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
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

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getProfileByEmail('test@example.com');

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          organization: true,
          role: true
        }
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com'
      }));
    });

    it('should return null when user not found by email', async () => {
      // Arrange
      mockPrismaUser.findUnique.mockResolvedValue(null);

      // Act
      const result = await userService.getProfileByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateRequest: UpdateUserProfileRequest = {
      firstName: 'Jane',
      lastName: 'Smith',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          email: false,
          inApp: true,
          assessmentReminders: true
        },
        privacy: {
          profileVisibility: 'organization',
          allowAnalytics: true
        },
        ui: {
          theme: 'dark',
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
    };

    it('should update user profile successfully', async () => {
      // Arrange
      const existingUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const mockUpdatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'America/New_York',
        preferences: updateRequest.preferences,
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

      // Mock the user existence check first
      mockPrismaUser.findUnique.mockResolvedValue(existingUser);
      mockPrismaUser.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await userService.updateProfile('user-123', updateRequest);

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          timezone: 'America/New_York',
          preferences: updateRequest.preferences
        }),
        include: {
          organization: true,
          role: true
        }
      });
      expect(result).toEqual(expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Smith'
      }));
    });

    it('should throw error when user not found for update', async () => {
      // Arrange
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';
      mockPrismaUser.update.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(userService.updateProfile('nonexistent-id', updateRequest))
        .rejects
        .toThrow(UserError);
    });
  });

  describe('deleteProfile', () => {
    it('should soft delete user profile', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaUser.delete.mockResolvedValue(mockUser);

      // Act
      await userService.deleteProfile('user-123');

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });
      expect(mockPrismaUser.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });
    });

    it('should throw error when user not found for deletion', async () => {
      // Arrange
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';
      mockPrismaUser.update.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(userService.deleteProfile('nonexistent-id'))
        .rejects
        .toThrow(UserError);
    });
  });

  describe('searchUsers', () => {
    it('should search users with pagination', async () => {
      // Arrange
      const searchOptions = {
        search: 'john',
        page: 1,
        limit: 10,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const
      };

      const mockUsers = [
        {
          id: 'user-123',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          organization: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
          role: { id: 'role-456', name: 'Test Role', description: null }
        }
      ];

      mockPrismaUser.findMany.mockResolvedValue(mockUsers);
      mockPrismaUser.count.mockResolvedValue(1);

      // Act
      const result = await userService.searchUsers(searchOptions);

      // Assert
      expect(mockPrismaUser.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } }
          ])
        }),
        include: {
          organization: true,
          role: true
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });

      expect(result).toEqual({
        users: expect.arrayContaining([
          expect.objectContaining({
            id: 'user-123',
            email: 'john@example.com'
          })
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      });
    });

    it('should handle empty search results', async () => {
      // Arrange
      const searchOptions = {
        search: 'nonexistent',
        page: 1,
        limit: 10
      };

      mockPrismaUser.findMany.mockResolvedValue([]);
      mockPrismaUser.count.mockResolvedValue(0);

      // Act
      const result = await userService.searchUsers(searchOptions);

      // Assert
      expect(result.users).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('updatePreferences', () => {
    const preferences: Partial<UserPreferences> = {
      notifications: {
        email: false,
        inApp: true,
        assessmentReminders: false
      }
    };

    it('should update user preferences', async () => {
      // Arrange
      const existingUser = {
        id: 'user-123',
        preferences: {},
        organization: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
        role: { id: 'role-456', name: 'Test Role', description: null }
      };
      
      const mockUser = {
        id: 'user-123',
        preferences: preferences,
        organization: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
        role: { id: 'role-456', name: 'Test Role', description: null }
      };

      mockPrismaUser.findUnique.mockResolvedValue(existingUser);
      mockPrismaUser.update.mockResolvedValue(mockUser);

      // Act
      const result = await userService.updatePreferences('user-123', preferences);

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { preferences: expect.any(Object) },
        include: {
          organization: true,
          role: true
        }
      });
      expect(result.preferences).toEqual(expect.any(Object));
    });
  });

  describe('verifyEmail', () => {
    it('should mark email as verified', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        emailVerified: true,
        organization: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
        role: { id: 'role-456', name: 'Test Role', description: null }
      };

      mockPrismaUser.update.mockResolvedValue(mockUser);

      // Act
      const result = await userService.verifyEmail('user-123');

      // Assert
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          emailVerified: true
        },
        include: {
          organization: true,
          role: true
        }
      });
      expect(result.emailVerified).toBe(true);
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity summary', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        lastLoginAt: new Date(),
        createdAt: new Date(),
        isActive: true,
        organization: { name: 'Test Org' },
        role: { name: 'Test Role' },
        assessmentParticipations: [
          { status: 'completed' },
          { status: 'in_progress' },
          { status: 'completed' }
        ]
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      
      // Mock the calculateProfileCompletion method
      jest.spyOn(userService, 'calculateProfileCompletion' as any).mockResolvedValue({
        percentage: 85,
        missingFields: ['profileImage']
      });

      // Act
      const result = await userService.getUserActivity('user-123');

      // Assert
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: {
          role: true,
          assessmentParticipations: true
        }
      });
      expect(result).toEqual(expect.objectContaining({
        lastLoginAt: expect.any(Date),
        assessmentsCompleted: 2,
        assessmentsInProgress: 1,
        organizationRole: 'Test Role',
        accountStatus: 'active'
      }));
    });

    it('should throw error when user not found for activity', async () => {
      // Arrange
      mockPrismaUser.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserActivity('nonexistent-id'))
        .rejects
        .toThrow(UserError);
    });
  });
});
