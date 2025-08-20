/**
 * Simple test to verify mocking works
 */

jest.mock('@/utils/validation.util', () => ({
  validateCreateUserProfile: jest.fn(() => ({ isValid: true, errors: [] })),
  validateUpdateUserProfile: jest.fn(() => ({ isValid: true, errors: [] })),
  normalizeEmail: jest.fn((email: string) => email.toLowerCase()),
  stripSensitiveFields: jest.fn((user: any) => {
    if (!user) return null;
    const { passwordHash, mfaSecret, ...safe } = user;
    return safe;
  }),
  sanitizeUserInput: jest.fn((input: any) => input)
}));

// Test the mock works
import { validateCreateUserProfile } from '@/utils/validation.util';

describe('Mock Test', () => {
  it('should return valid result', () => {
    const result = validateCreateUserProfile({} as any);
    expect(result.isValid).toBe(true);
  });
});
