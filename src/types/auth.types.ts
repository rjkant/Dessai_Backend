/**
 * Authentication Types and Interfaces
 * Dessai Backend - Authentication System
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  timezone?: string;
  preferences?: any;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  refreshTokens: string[];
  organizationId: string;
  roleId: string;
  role?: Role;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: any;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'OrgAdmin', 
  HR_MANAGER = 'HRManager',
  INTERVIEWER = 'Interviewer',
  CANDIDATE = 'Candidate'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash' | 'refreshTokens' | 'mfaSecret'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  requiresMfa: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string; // Role name from the Role model
  organizationId?: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface MfaSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface MfaVerifyRequest {
  token: string;
  secret?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessAt: Date;
  expiresAt: Date;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords
}

// For registration requests
export interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  organizationId: string;
}
