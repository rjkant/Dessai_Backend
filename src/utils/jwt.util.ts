/**
 * JWT Utility Functions
 * Dessai Backend - Authentication System
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload } from '@/types/auth.types';

export class JWTUtil {
  private static readonly ACCESS_TOKEN_SECRET =
    process.env['JWT_SECRET'] || process.env['JWT_ACCESS_SECRET'] || 'your-access-secret-key';
  private static readonly REFRESH_TOKEN_SECRET =
    process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-key';
  private static readonly ACCESS_TOKEN_EXPIRY: string = process.env['JWT_ACCESS_EXPIRY'] || '15m';
  private static readonly REFRESH_TOKEN_EXPIRY: string = process.env['JWT_REFRESH_EXPIRY'] || '7d';

  /**
   * Generate access token
   */
  static generateAccessToken(
    payload: Omit<JWTPayload, 'iat' | 'exp'>, 
    customExpiry?: string
  ): string {
    try {
      // Validate JWT secret
      if (!this.ACCESS_TOKEN_SECRET || this.ACCESS_TOKEN_SECRET.length < 10) {
        throw new Error('JWT secret must be at least 10 characters long');
      }

      const options: SignOptions = {
        expiresIn: customExpiry || this.ACCESS_TOKEN_EXPIRY as any,
        algorithm: 'HS256',
        issuer: 'dessai-backend',
        audience: 'dessai-frontend',
      };

      return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, options);
    } catch (error) {
      throw new Error(
        `Failed to generate access token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string, sessionId: string): string {
    try {
      const payload = { userId, sessionId, type: 'refresh' };
      const options: SignOptions = {
        expiresIn: this.REFRESH_TOKEN_EXPIRY as any,
        algorithm: 'HS256',
        issuer: 'dessai-backend',
        audience: 'dessai-frontend',
      };

      return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, options);
    } catch (error) {
      throw new Error(
        `Failed to generate refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        algorithms: ['HS256'],
        issuer: 'dessai-backend',
        audience: 'dessai-frontend',
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw new Error(
        `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): { userId: string; sessionId: string; type: string } {
    try {
      return jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        algorithms: ['HS256'],
        issuer: 'dessai-backend',
        audience: 'dessai-frontend',
      }) as { userId: string; sessionId: string; type: string };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw new Error(
        `Refresh token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get token expiry time in seconds
   */
  static getAccessTokenExpiry(): number {
    const expiry = this.ACCESS_TOKEN_EXPIRY;
    if (expiry.endsWith('m')) {
      return parseInt(expiry.slice(0, -1)) * 60;
    }
    if (expiry.endsWith('h')) {
      return parseInt(expiry.slice(0, -1)) * 3600;
    }
    if (expiry.endsWith('d')) {
      return parseInt(expiry.slice(0, -1)) * 86400;
    }
    return 900; // 15 minutes default
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error('Failed to decode token');
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }
}
