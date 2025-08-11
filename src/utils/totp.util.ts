/**
 * TOTP (Time-based One-Time Password) Utility Functions
 * Dessai Backend - Authentication System MFA
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export class TOTPUtil {
  private static readonly APP_NAME = 'Dessai';
  private static readonly ISSUER = 'Dessai Technical Hiring Platform';

  /**
   * Generate TOTP secret for a user
   */
  static generateSecret(userEmail: string): {
    secret: string;
    otpauthUrl: string;
  } {
    try {
      const secret = speakeasy.generateSecret({
        name: `${this.APP_NAME} (${userEmail})`,
        issuer: this.ISSUER,
        length: 32
      });

      if (!secret.otpauth_url) {
        throw new Error('Failed to generate OTP auth URL');
      }

      return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url
      };
    } catch (error) {
      throw new Error(`Failed to generate TOTP secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate QR code for TOTP setup
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify TOTP token
   */
  static verifyToken(token: string, secret: string, window: number = 1): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window // Allow 1 step before and after current time
      });
    } catch (error) {
      throw new Error(`Failed to verify TOTP token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate current TOTP token (for testing)
   */
  static generateToken(secret: string): string {
    try {
      return speakeasy.totp({
        secret,
        encoding: 'base32'
      });
    } catch (error) {
      throw new Error(`Failed to generate TOTP token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate backup codes for account recovery
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Hash backup codes for storage
   */
  static async hashBackupCodes(codes: string[]): Promise<string[]> {
    const bcrypt = await import('bcryptjs');
    const hashedCodes: string[] = [];
    
    for (const code of codes) {
      const hash = await bcrypt.hash(code, 10);
      hashedCodes.push(hash);
    }
    
    return hashedCodes;
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(code: string, hashedCodes: string[]): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    
    for (const hashedCode of hashedCodes) {
      if (await bcrypt.compare(code, hashedCode)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate complete MFA setup
   */
  static async generateMFASetup(userEmail: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
    hashedBackupCodes: string[];
  }> {
    try {
      // Generate TOTP secret
      const { secret, otpauthUrl } = this.generateSecret(userEmail);
      
      // Generate QR code
      const qrCode = await this.generateQRCode(otpauthUrl);
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);
      
      return {
        secret,
        qrCode,
        backupCodes,
        hashedBackupCodes
      };
    } catch (error) {
      throw new Error(`Failed to generate MFA setup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate MFA token (TOTP or backup code)
   */
  static async validateMFAToken(
    token: string, 
    secret: string, 
    hashedBackupCodes: string[] = []
  ): Promise<{ 
    isValid: boolean; 
    usedBackupCode: boolean; 
  }> {
    try {
      // First try TOTP verification
      if (this.verifyToken(token, secret)) {
        return { isValid: true, usedBackupCode: false };
      }

      // If TOTP fails, try backup codes
      if (await this.verifyBackupCode(token, hashedBackupCodes)) {
        return { isValid: true, usedBackupCode: true };
      }

      return { isValid: false, usedBackupCode: false };
    } catch (error) {
      throw new Error(`Failed to validate MFA token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
