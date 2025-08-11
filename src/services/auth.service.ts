/**
 * Authentication Service
 * Dessai Backend - Authentication System with Schema Integration
 */

import { PrismaClient } from '@prisma/client';
import RedisService from './redis.service';
import { JWTUtil } from '../utils/jwt.util';
import { PasswordUtil } from '../utils/password.util';
import { TOTPUtil } from '../utils/totp.util';
import {
  User,
  UserRole,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  MfaSetupResponse,
  MfaVerifyRequest,
  PasswordChangeRequest,
  AuthSession,
  JWTPayload
} from '../types/auth.types';

export class AuthService {
  private static instance: AuthService;
  private redisService: RedisService;
  private prisma: PrismaClient;

  constructor() {
    this.redisService = new RedisService();
    this.prisma = new PrismaClient();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * User registration with current schema
   */
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: string;
    organizationId: string;
  }): Promise<User> {
    try {
      // Validate password
      const passwordValidation = PasswordUtil.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const passwordHash = await PasswordUtil.hashPassword(userData.password);

      // Create user with current schema structure
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          passwordHash,
          mfaEnabled: false,
          isActive: true,
          emailVerified: false,
          organizationId: userData.organizationId,
          roleId: userData.roleId,
          refreshTokens: []
        },
        include: {
          role: true,
          organization: true
        }
      });

      return this.mapPrismaUserToAuthUser(user);
    } catch (error) {
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * User login with schema alignment
   */
  async login(loginData: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    try {
      // Find user with role information
      const user = await this.prisma.user.findUnique({
        where: { email: loginData.email },
        include: { 
          role: true,
          organization: true 
        }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active (using isActive boolean from current schema)
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await PasswordUtil.verifyPassword(loginData.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Check if MFA is enabled
      if (user.mfaEnabled && user.mfaSecret) {
        if (!loginData.mfaToken) {
          return {
            user: this.sanitizeUser(this.mapPrismaUserToAuthUser(user)),
            accessToken: '',
            refreshToken: '',
            expiresIn: 0,
            requiresMfa: true
          };
        }

        // Verify MFA token
        const mfaValid = TOTPUtil.verifyToken(loginData.mfaToken, user.mfaSecret);
        if (!mfaValid) {
          throw new Error('Invalid MFA token');
        }
      }

      // Generate session ID for Redis
      const sessionId = JWTUtil.generateSessionId();
      
      // Create session in Redis
      await this.createSession(user.id, sessionId, ipAddress, userAgent);

      // Generate tokens with proper role mapping
      const jwtPayload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role.name as UserRole,
        organizationId: user.organizationId,
        sessionId
      };

      const accessToken = JWTUtil.generateAccessToken(jwtPayload);
      const refreshToken = JWTUtil.generateRefreshToken(user.id, sessionId);

      // Update refresh tokens array in database
      const updatedTokens = [...(user.refreshTokens || []), refreshToken];
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          refreshTokens: updatedTokens,
          lastLoginAt: new Date()
        }
      });

      return {
        user: this.sanitizeUser(this.mapPrismaUserToAuthUser(user)),
        accessToken,
        refreshToken,
        expiresIn: JWTUtil.getAccessTokenExpiry(),
        requiresMfa: false
      };
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshData: RefreshTokenRequest): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // Verify refresh token
      const tokenPayload = JWTUtil.verifyRefreshToken(refreshData.refreshToken);

      // Check if session exists and is active
      const session = await this.redisService.getSession<AuthSession>(tokenPayload.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.isActive || new Date() > session.expiresAt) {
        throw new Error('Session expired');
      }

      // Get user data with role
      const user = await this.prisma.user.findUnique({
        where: { id: tokenPayload.userId },
        include: { role: true }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Check if refresh token is still valid in user's tokens
      if (!user.refreshTokens?.includes(refreshData.refreshToken)) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const newJwtPayload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role.name as UserRole,
        organizationId: user.organizationId,
        sessionId: tokenPayload.sessionId
      };

      const accessToken = JWTUtil.generateAccessToken(newJwtPayload);

      return {
        accessToken,
        expiresIn: JWTUtil.getAccessTokenExpiry()
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup MFA for user
   */
  async setupMfa(userId: string): Promise<MfaSetupResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.mfaEnabled) {
        throw new Error('MFA is already enabled for this user');
      }

      // Generate TOTP secret
      const secretData = TOTPUtil.generateSecret(user.email);
      const qrCode = await TOTPUtil.generateQRCode(secretData.otpauthUrl);
      const backupCodes = TOTPUtil.generateBackupCodes();

      // Store secret temporarily (user needs to verify before enabling)
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: secretData.secret }
      });

      return {
        secret: secretData.secret,
        qrCode,
        backupCodes
      };
    } catch (error) {
      throw new Error(`MFA setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify and enable MFA
   */
  async verifyMfa(userId: string, mfaData: MfaVerifyRequest): Promise<{ success: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.mfaSecret) {
        throw new Error('MFA setup not found');
      }

      // Verify the token
      const isValid = TOTPUtil.verifyToken(mfaData.token, user.mfaSecret);
      if (!isValid) {
        throw new Error('Invalid MFA token');
      }

      // Enable MFA
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true }
      });

      return { success: true };
    } catch (error) {
      throw new Error(`MFA verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, passwordData: PasswordChangeRequest): Promise<{ success: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtil.verifyPassword(
        passwordData.currentPassword, 
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = PasswordUtil.validatePassword(passwordData.newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash new password
      const newPasswordHash = await PasswordUtil.hashPassword(passwordData.newPassword);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Password change failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(userId: string, refreshToken: string): Promise<{ success: boolean }> {
    try {
      // Remove refresh token from user's tokens
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (user && user.refreshTokens) {
        const updatedTokens = (user.refreshTokens as string[]).filter(
          (token: string) => token !== refreshToken
        );
        await this.prisma.user.update({
          where: { id: userId },
          data: { refreshTokens: updatedTokens }
        });
      }

      // Try to get session ID from refresh token and invalidate
      try {
        const tokenPayload = JWTUtil.verifyRefreshToken(refreshToken);
        await this.redisService.deleteSession(tokenPayload.sessionId);
      } catch (error) {
        // Token might be invalid, but we still want to clean up
        console.log('Could not invalidate session from token:', error);
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create session in Redis
   */
  private async createSession(
    userId: string, 
    sessionId: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    const session: AuthSession = {
      id: sessionId,
      userId,
      isActive: true,
      createdAt: new Date(),
      lastAccessAt: new Date(),
      expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown'
    };

    await this.redisService.setSession(sessionId, session);
  }

  /**
   * Map Prisma User to Auth User type
   */
  private mapPrismaUserToAuthUser(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      passwordHash: prismaUser.passwordHash,
      role: prismaUser.role ? {
        id: prismaUser.role.id,
        name: prismaUser.role.name,
        description: prismaUser.role.description,
        permissions: prismaUser.role.permissions || [],
        createdAt: prismaUser.role.createdAt,
        updatedAt: prismaUser.role.updatedAt
      } : undefined,
      roleId: prismaUser.roleId,
      organizationId: prismaUser.organizationId,
      isActive: prismaUser.isActive,
      emailVerified: prismaUser.emailVerified,
      mfaEnabled: prismaUser.mfaEnabled,
      mfaSecret: prismaUser.mfaSecret,
      refreshTokens: prismaUser.refreshTokens || [],
      timezone: prismaUser.timezone,
      preferences: prismaUser.preferences || {},
      lastLoginAt: prismaUser.lastLoginAt,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt
    } as User;
  }

  /**
   * Sanitize user data (remove sensitive information)
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash' | 'mfaSecret'> {
    const { passwordHash, mfaSecret, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Validate JWT payload and return user
   */
  async validateJWTPayload(payload: JWTPayload): Promise<User | null> {
    try {
      // Get user with role information
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: { 
          role: true,
          organization: true 
        }
      });

      if (!user || !user.isActive) {
        return null;
      }

      // Check if session exists and is active
      if (payload.sessionId) {
        const session = await this.redisService.getSession<AuthSession>(payload.sessionId);
        if (!session || !session.isActive || new Date() > session.expiresAt) {
          return null;
        }
      }

      return this.mapPrismaUserToAuthUser(user);
    } catch (error) {
      console.error('JWT payload validation failed:', error);
      return null;
    }
  }

  /**
   * Revoke user session
   */
  async revokeSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    try {
      await this.redisService.deleteSession(sessionId);
      
      // Also remove corresponding refresh tokens
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (user && user.refreshTokens) {
        // Filter out tokens that belong to this session
        const updatedTokens = (user.refreshTokens as string[]).filter((token: string) => {
          try {
            const payload = JWTUtil.verifyRefreshToken(token);
            return payload.sessionId !== sessionId;
          } catch {
            // Invalid token, remove it
            return false;
          }
        });

        await this.prisma.user.update({
          where: { id: userId },
          data: { refreshTokens: updatedTokens }
        });
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to revoke session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default AuthService;
