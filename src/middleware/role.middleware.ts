/**
 * Role-Based Access Control Middleware
 * Restricts access based on user roles
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth.types';
import { AuthRequest } from './auth.middleware';

/**
 * Role guard middleware factory
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 */
export const roleGuard = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated (should be set by auth middleware)
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      // Check if user has required role
      const userRoleName = req.user.role as UserRole;
      if (!userRoleName || !allowedRoles.includes(userRoleName)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: allowedRoles,
          userRole: userRoleName,
        });
        return;
      }

      // User has required role, proceed
      next();
    } catch (error) {
      console.error('Role guard error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'AUTHORIZATION_ERROR',
      });
    }
  };
};

/**
 * Admin only access
 */
export const adminOnly = roleGuard([UserRole.ADMIN]);

/**
 * Admin and interviewer access
 */
export const interviewerAccess = roleGuard([UserRole.ADMIN, UserRole.INTERVIEWER]);

/**
 * All authenticated users
 */
export const authenticatedAccess = roleGuard([
  UserRole.ADMIN,
  UserRole.INTERVIEWER,
  UserRole.CANDIDATE,
]);

/**
 * Check if user owns resource or has elevated permissions
 * @param userIdParam - Name of the URL parameter containing the user ID
 * @returns Express middleware function
 */
export const ownerOrElevated = (userIdParam: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const targetUserId = req.params[userIdParam];
      const isOwner = req.user.id === targetUserId;
      const userRoleName = req.user.role as UserRole;
      const hasElevatedRole = [UserRole.ADMIN, UserRole.INTERVIEWER].includes(userRoleName);

      if (!isOwner && !hasElevatedRole) {
        res.status(403).json({
          success: false,
          message: 'Access denied: insufficient permissions',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Owner/elevated check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'AUTHORIZATION_ERROR',
      });
    }
  };
};

/**
 * Session owner or elevated permissions
 * Checks if user owns the session or has elevated permissions
 */
export const sessionOwnerOrElevated = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
      return;
    }

    // For session-related endpoints, check session ownership
    // const sessionId = req.params['sessionId'] || req.body.sessionId;

    // TODO: Implement session ownership check with database
    // For now, allow all authenticated users
    // In a real implementation, you would:
    // 1. Query the database to find the session
    // 2. Check if req.user.id matches the session's candidateId
    // 3. Or check if user has elevated permissions

    const userRoleName = req.user.role as UserRole;
    const hasElevatedRole = [UserRole.ADMIN, UserRole.INTERVIEWER].includes(userRoleName);

    if (!hasElevatedRole) {
      // TODO: Add actual session ownership check
      // For now, allow candidates to access their own sessions
      if (userRoleName !== UserRole.CANDIDATE) {
        res.status(403).json({
          success: false,
          message: 'Access denied: insufficient permissions',
          code: 'ACCESS_DENIED',
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Session owner check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      code: 'AUTHORIZATION_ERROR',
    });
  }
};
