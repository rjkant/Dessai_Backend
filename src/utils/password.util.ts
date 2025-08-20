/**
 * Password Utility Functions
 * Dessai Backend - Authentication System
 */

import bcrypt from 'bcryptjs';
import { PasswordPolicy } from '@/types/auth.types';

export class PasswordUtil {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Default password policy
   */
  static readonly DEFAULT_POLICY: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // 90 days
    preventReuse: 5, // Last 5 passwords
  };

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      throw new Error(
        `Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(
        `Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate password against policy
   */
  static validatePassword(
    password: string,
    policy: PasswordPolicy = this.DEFAULT_POLICY
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    // Check uppercase requirement
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase requirement
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check numbers requirement
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check special characters requirement
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password is in history (for reuse prevention)
   */
  static async isPasswordInHistory(password: string, passwordHistory: string[]): Promise<boolean> {
    try {
      for (const historicalHash of passwordHistory) {
        if (await this.verifyPassword(password, historicalHash)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      throw new Error(
        `Failed to check password history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*(),.?":{}|<>';
    const allChars = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one character from each required category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Check if password needs to be changed based on age
   */
  static isPasswordExpired(
    passwordChangedAt: Date,
    policy: PasswordPolicy = this.DEFAULT_POLICY
  ): boolean {
    const daysSinceChange = (Date.now() - passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange > policy.maxAge;
  }

  /**
   * Update password history
   */
  static updatePasswordHistory(
    currentHistory: string[],
    newPasswordHash: string,
    policy: PasswordPolicy = this.DEFAULT_POLICY
  ): string[] {
    const updatedHistory = [newPasswordHash, ...currentHistory];
    return updatedHistory.slice(0, policy.preventReuse);
  }
}
