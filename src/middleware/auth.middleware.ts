/**
 * Authentication Middleware
 * Dessai Backend - Authentication System
 */

import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '@/utils/jwt.util';
import { AuthService } from '@/services/auth.service';
import { UserRole, User } from '@/types/auth.types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'passwordHash' | 'mfaSecret'>;
    }
  }
}

export class AuthMiddleware {
  private static authService = AuthService.getInstance();

  /**
   * JWT Authentication Middleware
   */
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Access token required'
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
          message: 'Invalid or expired token'
        });
        return;
      }

      // Add user to request object (excluding sensitive fields)
      const { passwordHash, mfaSecret, ...sanitizedUser } = user;
      req.user = sanitizedUser;

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  }

  /**
   * Role-based authorization middleware
   */
  static authorize(roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userRoleName = req.user.role?.name as UserRole;
      if (!userRoleName || !roles.includes(userRoleName)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  }

  /**
   * Optional authentication middleware (user can be authenticated or not)
   */
  static async optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const payload = JWTUtil.verifyAccessToken(token);
          const user = await this.authService.validateJWTPayload(payload);
          
          if (user) {
            const { passwordHash, mfaSecret, ...sanitizedUser } = user;
            req.user = sanitizedUser;
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
    UserRole.HR_MANAGER
  ]);

  /**
   * Interviewer or above middleware
   */
  static requireInterviewer = AuthMiddleware.authorize([
    UserRole.SUPER_ADMIN, 
    UserRole.ADMIN, 
    UserRole.HR_MANAGER, 
    UserRole.INTERVIEWER
  ]);

  /**
   * Account ownership verification (user can only access their own data)
   */
  static requireOwnership(userIdParam: string = 'userId') {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const requestedUserId = req.params[userIdParam];
      const userRoleName = req.user.role?.name as UserRole;
      
      // Super admins and admins can access any user's data
      if (userRoleName && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRoleName)) {
        next();
        return;
      }

      // Users can only access their own data
      if (req.user.id !== requestedUserId) {
        res.status(403).json({
          success: false,
          message: 'Access denied - can only access your own data'
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
  static requireMFA(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const mfaToken = req.headers['x-mfa-token'] as string;
    
    if (req.user.mfaEnabled && !mfaToken) {
      res.status(403).json({
        success: false,
        message: 'MFA token required for this operation'
      });
      return;
    }

    // MFA token validation would happen here
    // For now, we'll continue if MFA is not enabled or token is provided
    next();
  }
}
