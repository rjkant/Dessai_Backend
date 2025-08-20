/**
 * Authentication Controller
 * Dessai Backend - Authentication System
 */

import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { LoginRequest, MfaVerifyRequest, PasswordChangeRequest } from '@/types/auth.types';
// Import Express type augmentation
import '../types/express';

export class AuthController {
  private static authService = AuthService.getInstance();

  /**
   * User registration
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, roleId, organizationId } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !roleId || !organizationId) {
        res.status(400).json({
          success: false,
          message:
            'All fields are required: email, password, firstName, lastName, roleId, organizationId',
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
        return;
      }

      const user = await this.authService.register({
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roleId,
        organizationId,
      });

      // Remove sensitive information
      const { passwordHash: _passwordHash, mfaSecret: _mfaSecret, ...sanitizedUser } = user;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user: sanitizedUser },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, mfaToken }: LoginRequest = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const loginRequest: LoginRequest = {
        email: email.toLowerCase().trim(),
        password,
      };

      if (mfaToken) {
        loginRequest.mfaToken = mfaToken;
      }

      const loginResponse = await this.authService.login(loginRequest, ipAddress, userAgent);

      if (loginResponse.requiresMfa) {
        res.status(200).json({
          success: true,
          message: 'MFA token required',
          data: { requiresMfa: true },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: loginResponse,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
        return;
      }

      const tokenResponse = await this.authService.refreshToken({ refreshToken });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokenResponse,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  }

  /**
   * Setup MFA for authenticated user
   */
  static async setupMFA(req: Request, res: Response): Promise<void> {
    try {
      if (!(req as any).user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const mfaSetup = await this.authService.setupMfa((req as any).user.id);

      res.status(200).json({
        success: true,
        message: 'MFA setup generated',
        data: mfaSetup,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'MFA setup failed',
      });
    }
  }

  /**
   * Verify and enable MFA
   */
  static async verifyMFA(req: Request, res: Response): Promise<void> {
    try {
      if (!(req as any).user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { token, secret }: MfaVerifyRequest = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'MFA token is required',
        });
        return;
      }

      const verifyRequest: MfaVerifyRequest = { token };
      if (secret) {
        verifyRequest.secret = secret;
      }

      const isVerified = await this.authService.verifyMfa((req as any).user.id, verifyRequest);

      if (isVerified) {
        res.status(200).json({
          success: true,
          message: 'MFA enabled successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid MFA token',
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'MFA verification failed',
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken =
        req.body.refreshToken || req.headers['authorization']?.replace('Bearer ', '');
      const userId = (req as any).user?.id;

      if (userId && refreshToken) {
        await this.authService.logout(userId, refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!(req as any).user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { currentPassword, newPassword }: PasswordChangeRequest = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
        });
        return;
      }

      const success = await this.authService.changePassword((req as any).user.id, {
        currentPassword,
        newPassword,
      });

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Password changed successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Password change failed',
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Password change failed',
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!(req as any).user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user: (req as any).user },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get profile',
      });
    }
  }

  /**
   * Health check for authentication service
   */
  static async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Authentication service is healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authentication service is unhealthy',
      });
    }
  }
}
