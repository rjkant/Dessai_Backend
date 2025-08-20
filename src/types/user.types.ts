/**
 * User Profile Management Types
 * TASK-CG-004: User Profile Management System
 * Persona: Senior Software Engineer
 * 
 * Type definitions for user profile management, CRUD operations,
 * and profile-related functionality.
 */

import { Prisma } from '@prisma/client';

// ============================================================================
// USER PROFILE TYPES
// ============================================================================

/**
 * User profile data for public consumption (excluding sensitive fields)
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  timezone: string;
  preferences: Record<string, any>;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role: {
    id: string;
    name: string;
    description?: string | null;
  };
}

/**
 * User profile creation request
 */
export interface CreateUserProfileRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  organizationId: string;
  roleId: string;
  timezone?: string;
  profileImage?: string;
  preferences?: Record<string, any>;
}

/**
 * User profile update request
 */
export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  timezone?: string;
  profileImage?: string;
  preferences?: Record<string, any>;
}

/**
 * User preference types
 */
export interface UserPreferences {
  notifications: {
    email: boolean;
    inApp: boolean;
    assessmentReminders: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'organization' | 'private';
    allowAnalytics: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  assessment: {
    autoSave: boolean;
    confirmNavigation: boolean;
    showTimer: boolean;
  };
}

/**
 * Profile completion calculation
 */
export interface ProfileCompletion {
  percentage: number;
  missingFields: string[];
  recommendations: string[];
}

/**
 * User search and filtering options
 */
export interface UserSearchOptions {
  search?: string; // Search in name or email
  organizationId?: string;
  roleId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Extended user search query with additional filters
 */
export interface UserSearchQuery {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  skills?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * User status enumeration
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

/**
 * User role enumeration
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  INTERVIEWER = 'INTERVIEWER',
  CANDIDATE = 'CANDIDATE',
  VIEWER = 'VIEWER'
}

/**
 * Paginated user results
 */
export interface PaginatedUsers {
  users: UserProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * File upload result for profile images
 */
export interface ProfileImageUpload {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * User activity summary
 */
export interface UserActivitySummary {
  lastLoginAt?: Date | null;
  assessmentsCompleted: number;
  assessmentsInProgress: number;
  organizationRole: string;
  profileCompletion: ProfileCompletion;
  accountStatus: 'active' | 'inactive' | 'suspended';
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation result for user profile operations
 */
export interface UserValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
    code: string;
  }[];
}

/**
 * Password validation requirements
 */
export interface PasswordValidation {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength: number;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * User service interface for dependency injection
 */
export interface IUserService {
  // Profile CRUD operations
  createProfile(data: CreateUserProfileRequest): Promise<UserProfile>;
  getProfileById(id: string): Promise<UserProfile | null>;
  getProfileByEmail(email: string): Promise<UserProfile | null>;
  updateProfile(id: string, data: UpdateUserProfileRequest): Promise<UserProfile>;
  deleteProfile(id: string): Promise<void>;
  
  // Profile management
  updatePreferences(id: string, preferences: Partial<UserPreferences>): Promise<UserProfile>;
  updateProfileImage(id: string, imageData: ProfileImageUpload): Promise<UserProfile>;
  calculateProfileCompletion(id: string): Promise<ProfileCompletion>;
  
  // User search and listing
  searchUsers(options: UserSearchOptions): Promise<PaginatedUsers>;
  getUsersByOrganization(organizationId: string): Promise<UserProfile[]>;
  getUsersByRole(roleId: string): Promise<UserProfile[]>;
  
  // User status management
  activateUser(id: string): Promise<UserProfile>;
  deactivateUser(id: string): Promise<UserProfile>;
  verifyEmail(id: string): Promise<UserProfile>;
  
  // Activity and analytics
  getUserActivity(id: string): Promise<UserActivitySummary>;
  updateLastLogin(id: string): Promise<void>;
}

// ============================================================================
// PRISMA EXTENSION TYPES
// ============================================================================

/**
 * User with all relations loaded (making auditLogs optional for basic queries)
 */
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    organization: true;
    role: true;
  };
}>;

/**
 * User with full relations including audit logs
 */
export type UserWithFullRelations = Prisma.UserGetPayload<{
  include: {
    organization: true;
    role: true;
    auditLogs: true;
  };
}>;

/**
 * User creation data for Prisma
 */
export type UserCreateData = Prisma.UserCreateInput;

/**
 * User update data for Prisma
 */
export type UserUpdateData = Prisma.UserUpdateInput;

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * User-specific error types
 */
export enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  PROFILE_IMAGE_TOO_LARGE = 'PROFILE_IMAGE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  VALIDATION_FAILED = 'VALIDATION_FAILED'
}

/**
 * User operation error
 */
export class UserError extends Error {
  constructor(
    public code: UserErrorCode,
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'UserError';
  }
}
