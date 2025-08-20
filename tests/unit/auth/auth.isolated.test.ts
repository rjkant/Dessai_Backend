/**
 * Isolated Authentication Tests
 * Dessai Backend - Tests without database dependency
 * @testing persona validation
 */    test('should generate and verify refresh tokens', () => {
      const { JWTUtil } = require('../../../src/utils/jwt.util');
      
      const userId = 'test-user-id';
      const sessionId = 'test-session-id';
      
      const refreshToken = JWTUtil.generateRefreshToken(userId, sessionId);
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.').length).toBe(3);
      
      const decoded = JWTUtil.verifyRefreshToken(refreshToken);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
      expect(decoded.sessionId).toBe(sessionId);
    });

// Mock Prisma client before importing anything else
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  user: {},
  organization: {},
  role: {}
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}));

// Mock Redis service
jest.mock('../../../src/services/redis.service', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn()
  }));
});

describe('Authentication Utilities - Isolated Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set test environment variables
    process.env['JWT_SECRET'] = 'test-jwt-secret-for-testing';
    process.env['JWT_REFRESH_SECRET'] = 'test-jwt-refresh-secret-for-testing';
  });

  describe('Password Utility Tests', () => {
    test('should validate password hashing and verification', async () => {
      const { PasswordUtil } = await import('../../../src/utils/password.util');
      
      const password = 'TestPassword123!';
      const hash = await PasswordUtil.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(50);
      
      const isValid = await PasswordUtil.verifyPassword(password, hash);
      const isInvalid = await PasswordUtil.verifyPassword('wrongpassword', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should validate password strength requirements', () => {
      const { PasswordUtil } = require('../../../src/utils/password.util');
      
      // Valid passwords
      expect(PasswordUtil.validatePassword('StrongPass123!').isValid).toBe(true);
      expect(PasswordUtil.validatePassword('AnotherGood1@').isValid).toBe(true);
      expect(PasswordUtil.validatePassword('Complex123$').isValid).toBe(true);
      
      // Invalid passwords - too short
      expect(PasswordUtil.validatePassword('weak').isValid).toBe(false);
      expect(PasswordUtil.validatePassword('12345').isValid).toBe(false);
      
      // Invalid passwords - missing requirements
      expect(PasswordUtil.validatePassword('nodigitsorspecial').isValid).toBe(false);
      expect(PasswordUtil.validatePassword('NoSpecialChars123').isValid).toBe(false);
      expect(PasswordUtil.validatePassword('nouppercase123!').isValid).toBe(false);
      expect(PasswordUtil.validatePassword('NOLOWERCASE123!').isValid).toBe(false);
    });

    test('should generate secure passwords', () => {
      const { PasswordUtil } = require('../../../src/utils/password.util');
      
      const password1 = PasswordUtil.generateSecurePassword();
      const password2 = PasswordUtil.generateSecurePassword();
      
      expect(password1).toBeDefined();
      expect(password2).toBeDefined();
      expect(password1).not.toBe(password2);
      expect(password1.length).toBeGreaterThanOrEqual(12);
      expect(password2.length).toBeGreaterThanOrEqual(12);
      
      // Generated passwords should be valid
      expect(PasswordUtil.validatePassword(password1).isValid).toBe(true);
      expect(PasswordUtil.validatePassword(password2).isValid).toBe(true);
    });
  });

  describe('JWT Utility Tests', () => {
    test('should generate and verify access tokens', () => {
      const { JWTUtil } = require('../../../src/utils/jwt.util');
      
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user'
      };
      
      const accessToken = JWTUtil.generateAccessToken(payload);
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.').length).toBe(3);
      
      const decoded = JWTUtil.verifyAccessToken(accessToken);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should generate and verify refresh tokens', () => {
      const { JWTUtil } = require('../../../src/utils/jwt.util');
      
      const userId = 'test-user-id';
      const sessionId = 'test-session-id';
      
      const refreshToken = JWTUtil.generateRefreshToken(userId, sessionId);
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.').length).toBe(3);
      
      const decoded = JWTUtil.verifyRefreshToken(refreshToken);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
      expect(decoded.sessionId).toBe(sessionId);
    });

    test('should reject invalid tokens', () => {
      const { JWTUtil } = require('../../../src/utils/jwt.util');
      
      expect(() => {
        JWTUtil.verifyAccessToken('invalid-token');
      }).toThrow();
      
      expect(() => {
        JWTUtil.verifyAccessToken('invalid.token.here');
      }).toThrow();
      
      expect(() => {
        JWTUtil.verifyRefreshToken('another.invalid.token');
      }).toThrow();
    });

    test('should handle token expiration', async () => {
      const { JWTUtil } = require('../../../src/utils/jwt.util');
      
      // Generate token with very short expiry
      const payload = { userId: 'test-user-id', email: 'test@example.com', role: 'user' };
      const shortLivedToken = JWTUtil.generateAccessToken(payload, '1ms');
      
      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(() => {
        JWTUtil.verifyAccessToken(shortLivedToken);
      }).toThrow();
    });
  });

  describe('TOTP Utility Tests', () => {
    test('should generate secret and QR code', async () => {
      const { TOTPUtil } = require('../../../src/utils/totp.util');
      
      const secretResult = TOTPUtil.generateSecret('test@example.com');
      expect(secretResult).toBeDefined();
      expect(typeof secretResult).toBe('object');
      expect(secretResult.secret).toBeDefined();
      expect(typeof secretResult.secret).toBe('string');
      expect(secretResult.secret.length).toBeGreaterThan(10);
      expect(secretResult.otpauthUrl).toBeDefined();
      
      const qrCode = await TOTPUtil.generateQRCode(secretResult.otpauthUrl);
      expect(qrCode).toBeDefined();
      expect(typeof qrCode).toBe('string');
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });

    test('should generate and verify TOTP tokens', () => {
      const { TOTPUtil } = require('../../../src/utils/totp.util');
      
      const secretResult = TOTPUtil.generateSecret();
      const secret = secretResult.secret;
      const token = TOTPUtil.generateToken(secret);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(6);
      expect(/^\d{6}$/.test(token)).toBe(true);
      
      const isValid = TOTPUtil.verifyToken(token, secret);
      expect(isValid).toBe(true);
      
      const isInvalid = TOTPUtil.verifyToken('123456', secret);
      expect(isInvalid).toBe(false);
    });

    test('should generate backup codes', () => {
      const { TOTPUtil } = require('../../../src/utils/totp.util');
      
      const backupCodes = TOTPUtil.generateBackupCodes();
      expect(backupCodes).toBeDefined();
      expect(Array.isArray(backupCodes)).toBe(true);
      expect(backupCodes.length).toBe(10);
      
      backupCodes.forEach((code: string) => {
        expect(typeof code).toBe('string');
        expect(code.length).toBe(8);
        expect(/^[A-Z0-9]{8}$/.test(code)).toBe(true);
      });
      
      // All codes should be unique
      const uniqueCodes = [...new Set(backupCodes)];
      expect(uniqueCodes.length).toBe(backupCodes.length);
    });
  });

  describe('AuthService Initialization', () => {
    test('should create AuthService instance without database connection', () => {
      const { AuthService } = require('../../../src/services/auth.service');
      
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(AuthService);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JWT secrets gracefully', () => {
      // Set invalid short JWT secret to test error handling
      const originalSecret = process.env['JWT_SECRET'];
      process.env['JWT_SECRET'] = 'short'; // Too short secret
      
      // Re-import to get new instance with invalid secret
      jest.resetModules();
      
      try {
        const { JWTUtil } = require('../../../src/utils/jwt.util');
        expect(() => {
          JWTUtil.generateAccessToken({ userId: 'test' });
        }).toThrow();
      } finally {
        // Restore original secret
        process.env['JWT_SECRET'] = originalSecret;
        jest.resetModules();
      }
    });

    test('should handle bcrypt errors gracefully', async () => {
      const { PasswordUtil } = await import('../../../src/utils/password.util');
      
      // Test with invalid input - bcrypt actually returns false for invalid hashes instead of throwing
      const result = await PasswordUtil.verifyPassword('test', 'invalid-hash');
      expect(result).toBe(false);
    });
  });

  describe('Security Validations', () => {
    test('should ensure tokens have proper structure', () => {
      const { JWTUtil } = require('../../../src/utils/jwt.util');
      
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user'
      };
      
      const token = JWTUtil.generateAccessToken(payload);
      const parts = token.split('.');
      
      expect(parts.length).toBe(3);
      
      // Decode header and payload to check structure
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
      expect(decodedPayload.userId).toBe(payload.userId);
      expect(decodedPayload.email).toBe(payload.email);
      expect(decodedPayload.role).toBe(payload.role);
      expect(decodedPayload.iat).toBeDefined();
      expect(decodedPayload.exp).toBeDefined();
    });

    test('should ensure password hashes are unique', async () => {
      const { PasswordUtil } = await import('../../../src/utils/password.util');
      
      const password = 'TestPassword123!';
      const hash1 = await PasswordUtil.hashPassword(password);
      const hash2 = await PasswordUtil.hashPassword(password);
      
      // Same password should produce different hashes (due to salt)
      expect(hash1).not.toBe(hash2);
      
      // Both hashes should verify correctly
      expect(await PasswordUtil.verifyPassword(password, hash1)).toBe(true);
      expect(await PasswordUtil.verifyPassword(password, hash2)).toBe(true);
    });
  });
});
