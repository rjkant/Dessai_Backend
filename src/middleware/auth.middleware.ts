/**
 * Authentication Middleware
 * Dessai Backend - Authentication System
 */

import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '../utils/jwt.util';
import { AuthService } from '../services/auth.service'; 
import { UserRole, User } from '../types/auth.types';

export interface AuthRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
    isActive: boolean;
    firstName: string;
    lastName: string;
    roleId: string;
    mfaEnabled: boolean;
    emailVerified: boolean;
  };
}

export class AuthMiddleware {
  private static authService = AuthService.getInstance();

  /**
   * JWT Authentication Middleware
   */
  static authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Access token required',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const payload = JWTUtil.verifyAccessToken(token);

      // Validate session and get user
      const user = await this.authService.validateJWTPayload(payload);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
        return;
      }

      // Add user to request object (excluding sensitive fields)
      req.user = {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role?.name || 'CANDIDATE',
        isActive: user.isActive,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.emailVerified,
      };

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }

  /**
   * Role-based authorization middleware
   */
  static authorize(roles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const userRoleName = req.user.role as UserRole;
      if (!userRoleName || !roles.includes(userRoleName)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
        return;
      }

      next();
    };
  }

  /**
   * Optional authentication middleware (user can be authenticated or not)
   */
  static async optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
          const payload = JWTUtil.verifyAccessToken(token);
          const user = await this.authService.validateJWTPayload(payload);

          if (user) {
            req.user = {
              id: user.id,
              organizationId: user.organizationId,
              email: user.email,
              role: user.role?.name || 'CANDIDATE',
              isActive: user.isActive,
              firstName: user.firstName,
              lastName: user.lastName,
              roleId: user.roleId,
              mfaEnabled: user.mfaEnabled,
              emailVerified: user.emailVerified,
            };
          }
        } catch (error) {
          // Token invalid, but we continue without user
        }
      }

      next();
    } catch (error) {
      next();
    }
  }

  /**
   * Admin only middleware
   */
  static requireAdmin = AuthMiddleware.authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  /**
   * HR Manager or above middleware
   */
  static requireHRManager = AuthMiddleware.authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR_MANAGER,
  ]);

  /**
   * Interviewer or above middleware
   */
  static requireInterviewer = AuthMiddleware.authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR_MANAGER,
    UserRole.INTERVIEWER,
  ]);

  /**
   * Account ownership verification (user can only access their own data)
   */
  static requireOwnership(userIdParam: string = 'userId') {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const requestedUserId = req.params[userIdParam];
      const userRoleName = req.user.role as UserRole;

      // Super admins and admins can access any user's data
      if (userRoleName && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRoleName)) {
        next();
        return;
      }

      // Users can only access their own data
      if (req.user.id !== requestedUserId) {
        res.status(403).json({
          success: false,
          message: 'Access denied - can only access your own data',
        });
        return;
      }

      next();
    };
  }

  /**
   * Rate limiting for authentication endpoints
   */
  static async authRateLimit(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      // This would integrate with Redis rate limiting
      // For now, we'll just continue
      next();
    } catch (error) {
      next();
    }
  }

  /**
   * MFA verification middleware for sensitive operations
   */
  static requireMFA(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const mfaToken = req.headers['x-mfa-token'] as string;

    if (req.user.mfaEnabled && !mfaToken) {
      res.status(403).json({
        success: false,
        message: 'MFA token required for this operation',
      });
      return;
    }

    // MFA token validation would happen here
    // For now, we'll continue if MFA is not enabled or token is provided
    next();
  }
}

// Convenience exports for easier importing
export const authMiddleware = AuthMiddleware.authenticate;
export const optionalAuth = AuthMiddleware.optionalAuth;
export const requireAdmin = AuthMiddleware.requireAdmin;
export const requireHRManager = AuthMiddleware.requireHRManager;
export const requireInterviewer = AuthMiddleware.requireInterviewer;
export const requireOwnership = AuthMiddleware.requireOwnership;
export const requireMFA = AuthMiddleware.requireMFA;
