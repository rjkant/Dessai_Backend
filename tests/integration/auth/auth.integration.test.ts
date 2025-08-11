/**
 * Authentication Integration Tests
 * Dessai Backend - TASK-CG-003 Testing
 * @testing persona validation
 */

import request from 'supertest';
import { Express } from 'express';
import { setupTestApp } from '../../setup/test-app';
import { setupTestDatabase } from '../../setup/test-database';
import { JWTUtil } from '../../../src/utils/jwt.util';

describe('Authentication Integration Tests', () => {
  let app: Express;
  let testUserId: string;
  let testAccessToken: string;
  let testRefreshToken: string;

  const testUser = {
    email: 'integration.test@example.com',
    password: 'TestPassword123!',
    firstName: 'Integration',
    lastName: 'Test',
    roleId: 'test-role-id',
    organizationId: 'test-org-id'
  };

  beforeAll(async () => {
    // Setup test environment
    app = await setupTestApp();
    await setupTestDatabase();
  });

  afterAll(async () => {
    // Cleanup test environment
    // This would typically clean up test database connections
  });

  beforeEach(async () => {
    // Reset test state before each test
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            isActive: true,
            emailVerified: false,
            mfaEnabled: false
          }
        }
      });

      // Store user ID for cleanup
      testUserId = response.body.data.user.id;
      
      // Verify sensitive data is not exposed
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(response.body.data.user.mfaSecret).toBeUndefined();
    });

    test('should reject registration with duplicate email', async () => {
      // First registration (should succeed)
      await request(app)
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'duplicate.test@example.com'
        })
        .expect(201);

      // Second registration with same email (should fail)
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'duplicate.test@example.com'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('already exists')
      });
    });

    test('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'weak.password@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Password validation failed')
      });
    });

    test('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: testUser.email,
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('required')
      });
    });

    test('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email-format'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid email format')
      });
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Ensure test user exists for login tests
      if (!testUserId) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            ...testUser,
            email: 'login.test@example.com'
          })
          .expect(201);
        testUserId = response.body.data.user.id;
      }
    });

    test('should login user successfully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login.test@example.com',
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number),
          requiresMfa: false,
          user: {
            email: 'login.test@example.com',
            firstName: testUser.firstName,
            lastName: testUser.lastName
          }
        }
      });

      // Store tokens for subsequent tests
      testAccessToken = response.body.data.accessToken;
      testRefreshToken = response.body.data.refreshToken;

      // Verify JWT token structure
      const payload = JWTUtil.verifyAccessToken(testAccessToken);
      expect(payload).toMatchObject({
        userId: expect.any(String),
        email: 'login.test@example.com',
        role: expect.any(String)
      });
    });

    test('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('credentials')
      });
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('credentials')
      });
    });

    test('should handle MFA requirement', async () => {
      // This test would require setting up MFA for a user first
      // For now, we test the basic flow
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login.test@example.com',
          password: testUser.password
        })
        .expect(200);

      expect(response.body.data.requiresMfa).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      // Ensure we have valid tokens
      if (!testRefreshToken) {
        const loginResponse = await request(app)
          .post('/auth/login')
          .send({
            email: 'login.test@example.com',
            password: testUser.password
          })
          .expect(200);
        
        testRefreshToken = loginResponse.body.data.refreshToken;
      }
    });

    test('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: testRefreshToken
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: expect.any(String),
          expiresIn: expect.any(Number)
        }
      });

      // Verify new token is different from old one
      expect(response.body.data.accessToken).not.toBe(testAccessToken);
    });

    test('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('refresh')
      });
    });

    test('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('required')
      });
    });
  });

  describe('Protected Route Access', () => {
    beforeEach(async () => {
      // Ensure we have a valid access token
      if (!testAccessToken) {
        const loginResponse = await request(app)
          .post('/auth/login')
          .send({
            email: 'login.test@example.com',
            password: testUser.password
          })
          .expect(200);
        
        testAccessToken = loginResponse.body.data.accessToken;
      }
    });

    test('should access protected route with valid token', async () => {
      // This assumes there's a protected endpoint like GET /auth/me
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: expect.any(String),
            firstName: expect.any(String),
            lastName: expect.any(String)
          }
        }
      });
    });

    test('should reject protected route without token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Authorization')
      });
    });

    test('should reject protected route with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid')
      });
    });

    test('should reject protected route with malformed authorization header', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid authorization header')
      });
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      // Ensure we have valid tokens
      if (!testAccessToken || !testRefreshToken) {
        const loginResponse = await request(app)
          .post('/auth/login')
          .send({
            email: 'login.test@example.com',
            password: testUser.password
          })
          .expect(200);
        
        testAccessToken = loginResponse.body.data.accessToken;
        testRefreshToken = loginResponse.body.data.refreshToken;
      }
    });

    test('should logout user successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          refreshToken: testRefreshToken
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logout successful'
      });

      // Verify token is no longer valid
      await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(401);
    });

    test('should handle logout without authentication', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({
          refreshToken: testRefreshToken
        })
        .expect(200); // Logout should succeed even without auth

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logout successful'
      });
    });
  });

  describe('MFA Endpoints', () => {
    test('should setup MFA successfully', async () => {
      const response = await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'MFA setup successful',
        data: {
          qrCode: expect.any(String),
          secret: expect.any(String),
          backupCodes: expect.any(Array)
        }
      });

      expect(response.body.data.backupCodes).toHaveLength(10);
      expect(response.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    test('should verify MFA successfully', async () => {
      // First setup MFA
      await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      // Then verify (this would need a valid TOTP token in real implementation)
      const response = await request(app)
        .post('/auth/mfa/verify')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          token: '123456' // Mock token for testing
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'MFA verified successfully'
      });
    });
  });

  describe('Password Change', () => {
    test('should change password successfully', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password changed successfully'
      });

      // Verify old password no longer works
      await request(app)
        .post('/auth/login')
        .send({
          email: 'login.test@example.com',
          password: testUser.password
        })
        .expect(400);

      // Verify new password works
      await request(app)
        .post('/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'NewPassword123!'
        })
        .expect(200);
    });

    test('should reject password change with incorrect current password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Current password is incorrect')
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent login requests', async () => {
      const loginPromises = Array(10).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send({
            email: 'login.test@example.com',
            password: testUser.password
          })
      );

      const responses = await Promise.all(loginPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    }, 10000); // 10 second timeout for performance test

    test('should handle token refresh under load', async () => {
      // First get a refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'login.test@example.com',
          password: testUser.password
        })
        .expect(200);

      const refreshToken = loginResponse.body.data.refreshToken;

      const refreshPromises = Array(5).fill(null).map(() =>
        request(app)
          .post('/auth/refresh')
          .send({ refreshToken })
      );

      const responses = await Promise.all(refreshPromises);
      
      // At least one should succeed (depending on implementation)
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Security Tests', () => {
    test('should prevent JWT token manipulation', async () => {
      // Try to access with a manipulated token
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid')
      });
    });

    test('should enforce rate limiting on login attempts', async () => {
      const loginAttempts = Array(10).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send({
            email: 'login.test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(loginAttempts);
      
      // Should have some rate limiting responses (429 status)
      // Note: This depends on rate limiting implementation
      expect(responses.some(r => r.status === 429)).toBeTruthy();
    });

    test('should sanitize user data in responses', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      // Verify sensitive fields are not exposed
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(response.body.data.user.mfaSecret).toBeUndefined();
      expect(response.body.data.user.refreshTokens).toBeUndefined();
    });
  });
});
