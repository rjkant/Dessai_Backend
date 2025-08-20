/**
 * User Profile Management Service
 * TASK-CG-004: User Profile Management System
 * Persona: Senior Software Engineer
 * 
 * Core service for user profile CRUD operations, preferences management,
 * and user-related business logic with comprehensive validation.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { 
  IUserService,
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  UserProfile,
  UserPreferences,
  ProfileCompletion,
  UserSearchOptions,
  PaginatedUsers,
  ProfileImageUpload,
  UserActivitySummary,
  UserErrorCode,
  UserError,
  UserWithRelations
} from '@/types/user.types';
import { 
  validateCreateUserProfile,
  validateUpdateUserProfile,
  normalizeEmail,
  stripSensitiveFields,
  sanitizeUserInput
} from '@/utils/validation.util';

// ============================================================================
// USER SERVICE IMPLEMENTATION
// ============================================================================

export class UserService implements IUserService {
  constructor(private prisma: PrismaClient) {}

  // ============================================================================
  // PROFILE CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new user profile
   */
  async createProfile(data: CreateUserProfileRequest): Promise<UserProfile> {
    // Validate input data
    const validation = validateCreateUserProfile(data);
    if (!validation.isValid) {
      throw new UserError(
        UserErrorCode.VALIDATION_FAILED,
        `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Normalize and sanitize data
    const normalizedEmail = normalizeEmail(data.email);
    const sanitizedData = sanitizeUserInput(data);

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      throw new UserError(
        UserErrorCode.EMAIL_ALREADY_EXISTS,
        'A user with this email address already exists'
      );
    }

    // Verify organization and role exist
    const [organization, role] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: data.organizationId } }),
      this.prisma.role.findUnique({ where: { id: data.roleId } })
    ]);

    if (!organization) {
      throw new UserError(UserErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found');
    }

    if (!role) {
      throw new UserError(UserErrorCode.ROLE_NOT_FOUND, 'Role not found');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(sanitizedData.password, 12);

    // Set default preferences if not provided
    const defaultPreferences: UserPreferences = {
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
        theme: 'auto',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      assessment: {
        autoSave: true,
        confirmNavigation: true,
        showTimer: true
      }
    };

    const preferences = { ...defaultPreferences, ...sanitizedData.preferences };

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        passwordHash,
        timezone: sanitizedData.timezone || 'UTC',
        profileImage: sanitizedData.profileImage,
        preferences,
        organizationId: data.organizationId,
        roleId: data.roleId
      },
      include: {
        organization: true,
        role: true
      }
    });

    return this.transformUserToProfile(user);
  }

  /**
   * Get user profile by ID
   */
  async getProfileById(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        role: true
      }
    });

    if (!user) {
      return null;
    }

    return this.transformUserToProfile(user);
  }

  /**
   * Get user profile by email
   */
  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    const normalizedEmail = normalizeEmail(email);
    
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        organization: true,
        role: true
      }
    });

    if (!user) {
      return null;
    }

    return this.transformUserToProfile(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, data: UpdateUserProfileRequest): Promise<UserProfile> {
    // Validate input data
    const validation = validateUpdateUserProfile(data);
    if (!validation.isValid) {
      throw new UserError(
        UserErrorCode.VALIDATION_FAILED,
        `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new UserError(UserErrorCode.USER_NOT_FOUND, 'User not found');
    }

    // Sanitize update data
    const sanitizedData = sanitizeUserInput(data);

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: sanitizedData,
      include: {
        organization: true,
        role: true
      }
    });

    return this.transformUserToProfile(updatedUser);
  }

  /**
   * Delete user profile
   */
  async deleteProfile(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new UserError(UserErrorCode.USER_NOT_FOUND, 'User not found');
    }

    await this.prisma.user.delete({ where: { id } });
  }

  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: Partial<UserPreferences>): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new UserError(UserErrorCode.USER_NOT_FOUND, 'User not found');
    }

    // Merge with existing preferences
    const currentPreferences = (user.preferences as any) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      notifications: { ...currentPreferences.notifications, ...preferences.notifications },
      privacy: { ...currentPreferences.privacy, ...preferences.privacy },
      ui: { ...currentPreferences.ui, ...preferences.ui },
      assessment: { ...currentPreferences.assessment, ...preferences.assessment }
    };

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { preferences: updatedPreferences },
      include: {
        organization: true,
        role: true
      }
    });

    return this.transformUserToProfile(updatedUser);
  }

  /**
   * Update user profile image
   */
  async updateProfileImage(id: string, imageData: ProfileImageUpload): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new UserError(UserErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { profileImage: imageData.url },
      include: {
        organization: true,
        role: true
      }
    });

    return this.transformUserToProfile(updatedUser);
  }

  /**
   * Calculate profile completion percentage
   */
  async calculateProfileCompletion(id: string): Promise<ProfileCompletion> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new UserError(UserErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const requiredFields = [
      'firstName',
      'lastName',
      'email',
      'timezone',
      'profileImage'
    ];

    const missingFields: string[] = [];
    const recommendations: string[] = [];

    requiredFields.forEach(field => {
      const value = (user as any)[field];
      if (!value || value === '') {
        missingFields.push(field);
        
        switch (field) {
          case 'profileImage':
            recommendations.push('Add a profile photo to help others recognize you');
            break;
          case 'timezone':
            recommendations.push('Set your timezone for accurate scheduling');
            break;
          default:
            recommendations.push(`Complete your ${field} information`);
        }
      }
    });

    // Check if email is verified
    if (!user.emailVerified) {
      missingFields.push('emailVerified');
      recommendations.push('Verify your email address to secure your account');
    }

    const completedFields = requiredFields.length + 1 - missingFields.length; // +1 for email verification
    const totalFields = requiredFields.length + 1;
    const percentage = Math.round((completedFields / totalFields) * 100);

    return {
      percentage,
      missingFields,
      recommendations
    };
  }

  // ============================================================================
  // USER SEARCH AND LISTING
  // ============================================================================

  /**
   * Search users with filtering and pagination
   */
  async searchUsers(options: UserSearchOptions): Promise<PaginatedUsers> {
    const {
      search,
      organizationId,
      roleId,
      isActive,
      emailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = options;

    const where: any = {};

    // Build search filters
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (roleId) {
      where.roleId = roleId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with count
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          organization: true,
          role: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      this.prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: users.map(user => this.transformUserToProfile(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get users by organization
   */
  async getUsersByOrganization(organizationId: string): Promise<UserProfile[]> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      include: {
        organization: true,
        role: true
      },
      orderBy: { firstName: 'asc' }
    });

    return users.map(user => this.transformUserToProfile(user));
  }

  /**
   * Get users by role
   */
  async getUsersByRole(roleId: string): Promise<UserProfile[]> {
    const users = await this.prisma.user.findMany({
      where: { roleId },
      include: {
        organization: true,
        role: true
      },
      orderBy: { firstName: 'asc' }
    });

    return users.map(user => this.transformUserToProfile(user));
  }

  // ============================================================================
  // USER STATUS MANAGEMENT
  // ============================================================================

  /**
   * Activate user account
   */
  async activateUser(id: string): Promise<UserProfile> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      include: {
        organization: true,
        role: true
      }
    });

    return this.transformUserToProfile(updatedUser);
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(id: string): Promise<UserProfile> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: {
        organization: true,
        role: true
      }
    });

    return this.transformUserToProfile(updatedUser);
  }

  /**
   * Verify user email
   */
  async verifyEmail(id: string): Promise<UserProfile> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true },
      include: {
        organization: true,
        role: true
      }
    });

    return this.transformUserToProfile(updatedUser);
  }

  // ============================================================================
  // ACTIVITY AND ANALYTICS
  // ============================================================================

  /**
   * Get user activity summary
   */
  async getUserActivity(id: string): Promise<UserActivitySummary> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        assessmentParticipations: true
      }
    });

    if (!user) {
      throw new UserError(UserErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const profileCompletion = await this.calculateProfileCompletion(id);

    const assessmentsCompleted = user.assessmentParticipations.filter(
      p => (p as any).status === 'completed'
    ).length;

    const assessmentsInProgress = user.assessmentParticipations.filter(
      p => (p as any).status === 'in_progress'
    ).length;

    let accountStatus: 'active' | 'inactive' | 'suspended' = 'active';
    if (!user.isActive) {
      accountStatus = 'inactive';
    }

    return {
      lastLoginAt: user.lastLoginAt,
      assessmentsCompleted,
      assessmentsInProgress,
      organizationRole: user.role.name,
      profileCompletion,
      accountStatus
    };
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() }
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Transform Prisma user object to UserProfile
   */
  private transformUserToProfile(user: UserWithRelations): UserProfile {
    const strippedUser = stripSensitiveFields(user);
    
    return {
      id: strippedUser.id,
      email: strippedUser.email,
      firstName: strippedUser.firstName,
      lastName: strippedUser.lastName,
      profileImage: strippedUser.profileImage,
      timezone: strippedUser.timezone,
      preferences: strippedUser.preferences,
      isActive: strippedUser.isActive,
      emailVerified: strippedUser.emailVerified,
      lastLoginAt: strippedUser.lastLoginAt,
      createdAt: strippedUser.createdAt,
      updatedAt: strippedUser.updatedAt,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug
      },
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description
      }
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Create singleton instance for dependency injection
let userServiceInstance: UserService | null = null;

export function createUserService(prisma: PrismaClient): UserService {
  if (!userServiceInstance) {
    userServiceInstance = new UserService(prisma);
  }
  return userServiceInstance;
}

export function getUserService(): UserService {
  if (!userServiceInstance) {
    throw new Error('User service not initialized. Call createUserService first.');
  }
  return userServiceInstance;
}
