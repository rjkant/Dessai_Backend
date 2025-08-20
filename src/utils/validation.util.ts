/**
 * User Profile Validation Utilities
 * TASK-CG-004: User Profile Management System
 * Persona: Senior Software Engineer
 * 
 * Comprehensive validation utilities for user profile data,
 * input sanitization, and security validation.
 */

import validator from 'validator';
import { 
  CreateUserProfileRequest, 
  UpdateUserProfileRequest, 
  UserValidationResult,
  UserErrorCode,
  PasswordValidation,
  UserPreferences 
} from '@/types/user.types';

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

const PASSWORD_CONFIG: PasswordValidation = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_NAME_LENGTH = 50;
const TIMEZONE_REGEX = /^[A-Za-z_]+\/[A-Za-z_]+$/;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates CUID format (used by Prisma)
 */
function isValidCUID(value: string): boolean {
  // CUID format: c + timestamp (8 chars) + machine (4 chars) + pid (4 chars) + fingerprint (8 chars)
  // Total length: 25 characters, starts with 'c'
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(value);
}

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates email format and domain restrictions
 */
export function validateEmail(email: string): UserValidationResult {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (!email || email.trim().length === 0) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: UserErrorCode.VALIDATION_FAILED
    });
  } else {
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!validator.isEmail(normalizedEmail)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: UserErrorCode.INVALID_EMAIL_FORMAT
      });
    }
    
    if (normalizedEmail.length > 254) {
      errors.push({
        field: 'email',
        message: 'Email address too long',
        code: UserErrorCode.VALIDATION_FAILED
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates password strength according to security requirements
 */
export function validatePassword(password: string): UserValidationResult {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (!password) {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: UserErrorCode.VALIDATION_FAILED
    });
    return { isValid: false, errors };
  }

  if (password.length < PASSWORD_CONFIG.minLength) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${PASSWORD_CONFIG.minLength} characters long`,
      code: UserErrorCode.INVALID_PASSWORD
    });
  }

  if (password.length > PASSWORD_CONFIG.maxLength) {
    errors.push({
      field: 'password',
      message: `Password cannot exceed ${PASSWORD_CONFIG.maxLength} characters`,
      code: UserErrorCode.INVALID_PASSWORD
    });
  }

  if (PASSWORD_CONFIG.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
      code: UserErrorCode.INVALID_PASSWORD
    });
  }

  if (PASSWORD_CONFIG.requireLowercase && !/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
      code: UserErrorCode.INVALID_PASSWORD
    });
  }

  if (PASSWORD_CONFIG.requireNumbers && !/[0-9]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number',
      code: UserErrorCode.INVALID_PASSWORD
    });
  }

  if (PASSWORD_CONFIG.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one special character',
      code: UserErrorCode.INVALID_PASSWORD
    });
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '123456789', '12345678'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push({
      field: 'password',
      message: 'Password is too common and easily guessable',
      code: UserErrorCode.INVALID_PASSWORD
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates user name fields (firstName, lastName)
 */
export function validateName(name: string, fieldName: string): UserValidationResult {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (!name || name.trim().length === 0) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      code: UserErrorCode.VALIDATION_FAILED
    });
  } else {
    const trimmedName = name.trim();
    
    if (trimmedName.length > MAX_NAME_LENGTH) {
      errors.push({
        field: fieldName,
        message: `${fieldName} cannot exceed ${MAX_NAME_LENGTH} characters`,
        code: UserErrorCode.VALIDATION_FAILED
      });
    }
    
    // Allow letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
        code: UserErrorCode.VALIDATION_FAILED
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates timezone format
 */
export function validateTimezone(timezone: string): UserValidationResult {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (timezone && !TIMEZONE_REGEX.test(timezone)) {
    // Also check against Intl.supportedValuesOf if available
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone });
    } catch {
      errors.push({
        field: 'timezone',
        message: 'Invalid timezone format',
        code: UserErrorCode.VALIDATION_FAILED
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates profile image file
 */
export function validateProfileImage(file: { 
  mimetype: string; 
  size: number; 
  originalname: string; 
}): UserValidationResult {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    errors.push({
      field: 'profileImage',
      message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      code: UserErrorCode.INVALID_FILE_TYPE
    });
  }

  if (file.size > MAX_IMAGE_SIZE) {
    errors.push({
      field: 'profileImage',
      message: `File too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
      code: UserErrorCode.PROFILE_IMAGE_TOO_LARGE
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates user preferences object
 */
export function validateUserPreferences(preferences: Partial<UserPreferences>): UserValidationResult {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  try {
    // Validate notification preferences
    if (preferences.notifications) {
      const { notifications } = preferences;
      if (typeof notifications.email !== 'boolean' ||
          typeof notifications.inApp !== 'boolean' ||
          typeof notifications.assessmentReminders !== 'boolean') {
        errors.push({
          field: 'preferences.notifications',
          message: 'Invalid notification preferences format',
          code: UserErrorCode.VALIDATION_FAILED
        });
      }
    }

    // Validate privacy preferences
    if (preferences.privacy) {
      const { privacy } = preferences;
      const validVisibilities = ['public', 'organization', 'private'];
      if (privacy.profileVisibility && !validVisibilities.includes(privacy.profileVisibility)) {
        errors.push({
          field: 'preferences.privacy.profileVisibility',
          message: 'Invalid profile visibility option',
          code: UserErrorCode.VALIDATION_FAILED
        });
      }
    }

    // Validate UI preferences
    if (preferences.ui) {
      const { ui } = preferences;
      const validThemes = ['light', 'dark', 'auto'];
      const validTimeFormats = ['12h', '24h'];
      
      if (ui.theme && !validThemes.includes(ui.theme)) {
        errors.push({
          field: 'preferences.ui.theme',
          message: 'Invalid theme option',
          code: UserErrorCode.VALIDATION_FAILED
        });
      }
      
      if (ui.timeFormat && !validTimeFormats.includes(ui.timeFormat)) {
        errors.push({
          field: 'preferences.ui.timeFormat',
          message: 'Invalid time format option',
          code: UserErrorCode.VALIDATION_FAILED
        });
      }
    }

  } catch (error) {
    errors.push({
      field: 'preferences',
      message: 'Invalid preferences format',
      code: UserErrorCode.VALIDATION_FAILED
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// COMPOSITE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates complete user profile creation request
 */
export function validateCreateUserProfile(data: CreateUserProfileRequest): UserValidationResult {
  const allErrors: Array<{ field: string; message: string; code: string }> = [];

  // Validate individual fields
  const emailValidation = validateEmail(data.email);
  const passwordValidation = validatePassword(data.password);
  const firstNameValidation = validateName(data.firstName, 'firstName');
  const lastNameValidation = validateName(data.lastName, 'lastName');

  allErrors.push(...emailValidation.errors);
  allErrors.push(...passwordValidation.errors);
  allErrors.push(...firstNameValidation.errors);
  allErrors.push(...lastNameValidation.errors);

  // Validate optional fields
  if (data.timezone) {
    const timezoneValidation = validateTimezone(data.timezone);
    allErrors.push(...timezoneValidation.errors);
  }

  if (data.preferences) {
    const preferencesValidation = validateUserPreferences(data.preferences);
    allErrors.push(...preferencesValidation.errors);
  }

  // Validate required IDs (CUID format validation)
  if (!data.organizationId || !isValidCUID(data.organizationId)) {
    allErrors.push({
      field: 'organizationId',
      message: 'Valid organization ID is required',
      code: UserErrorCode.ORGANIZATION_NOT_FOUND
    });
  }

  if (!data.roleId || !isValidCUID(data.roleId)) {
    allErrors.push({
      field: 'roleId',
      message: 'Valid role ID is required',
      code: UserErrorCode.ROLE_NOT_FOUND
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validates user profile update request
 */
export function validateUpdateUserProfile(data: UpdateUserProfileRequest): UserValidationResult {
  const allErrors: Array<{ field: string; message: string; code: string }> = [];

  // Validate only provided fields
  if (data.firstName !== undefined) {
    const firstNameValidation = validateName(data.firstName, 'firstName');
    allErrors.push(...firstNameValidation.errors);
  }

  if (data.lastName !== undefined) {
    const lastNameValidation = validateName(data.lastName, 'lastName');
    allErrors.push(...lastNameValidation.errors);
  }

  if (data.timezone !== undefined) {
    const timezoneValidation = validateTimezone(data.timezone);
    allErrors.push(...timezoneValidation.errors);
  }

  if (data.preferences !== undefined) {
    const preferencesValidation = validateUserPreferences(data.preferences);
    allErrors.push(...preferencesValidation.errors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitizes user input for safe database storage
 */
export function sanitizeUserInput(data: any): any {
  if (typeof data === 'string') {
    return validator.escape(data.trim());
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeUserInput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeUserInput(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Normalizes email address for consistent storage
 */
export function normalizeEmail(email: string): string {
  return validator.normalizeEmail(email) || email.toLowerCase().trim();
}

/**
 * Strips sensitive fields from user object for public responses
 */
export function stripSensitiveFields(user: any): any {
  const { passwordHash, mfaSecret, refreshTokens, ...publicUser } = user;
  return publicUser;
}
