/**
 * Assessment Validation Utilities
 * TASK-CG-005: Assessment Management Core
 * Persona: Senior Software Engineer
 *
 * Comprehensive validation utilities for assessment data,
 * settings validation, and input sanitization.
 */

import validator from 'validator';
import {
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentSettings,
} from '../types/assessment.types';
import { AssessmentType, AssessmentStatus } from '@prisma/client';

// ============================================================================
// VALIDATION RESULT INTERFACE
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// ASSESSMENT VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate create assessment request
 */
export function validateCreateAssessment(data: CreateAssessmentRequest): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Assessment title is required',
      code: 'TITLE_REQUIRED',
    });
  } else if (data.title.length > 200) {
    errors.push({
      field: 'title',
      message: 'Assessment title must be less than 200 characters',
      code: 'TITLE_TOO_LONG',
    });
  }

  // Description validation (optional)
  if (data.description && data.description.length > 2000) {
    errors.push({
      field: 'description',
      message: 'Assessment description must be less than 2000 characters',
      code: 'DESCRIPTION_TOO_LONG',
    });
  }

  // Type validation
  if (!data.type || !Object.values(AssessmentType).includes(data.type)) {
    errors.push({
      field: 'type',
      message: 'Valid assessment type is required',
      code: 'INVALID_TYPE',
    });
  }

  // Time limit validation
  if (data.timeLimit !== undefined) {
    if (data.timeLimit <= 0) {
      errors.push({
        field: 'timeLimit',
        message: 'Time limit must be positive',
        code: 'INVALID_TIME_LIMIT',
      });
    } else if (data.timeLimit > 480) {
      // 8 hours max
      errors.push({
        field: 'timeLimit',
        message: 'Time limit cannot exceed 480 minutes (8 hours)',
        code: 'TIME_LIMIT_TOO_LONG',
      });
    }
  }

  // Date validation
  if (data.startsAt && data.endsAt) {
    if (data.startsAt >= data.endsAt) {
      errors.push({
        field: 'startsAt',
        message: 'Start date must be before end date',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  if (data.scheduledAt && data.scheduledAt <= new Date()) {
    errors.push({
      field: 'scheduledAt',
      message: 'Scheduled date must be in the future',
      code: 'INVALID_SCHEDULED_DATE',
    });
  }

  // Settings validation
  if (data.settings) {
    const settingsValidation = validateAssessmentSettings(data.settings);
    errors.push(...settingsValidation.errors);
  }

  // Question IDs validation
  if (data.questionIds) {
    if (!Array.isArray(data.questionIds)) {
      errors.push({
        field: 'questionIds',
        message: 'Question IDs must be an array',
        code: 'INVALID_QUESTION_IDS_FORMAT',
      });
    } else if (data.questionIds.length > 100) {
      errors.push({
        field: 'questionIds',
        message: 'Assessment cannot have more than 100 questions',
        code: 'TOO_MANY_QUESTIONS',
      });
    } else {
      // Validate each question ID format
      data.questionIds.forEach((id, index) => {
        if (!id || typeof id !== 'string' || id.length < 20) {
          errors.push({
            field: `questionIds[${index}]`,
            message: 'Invalid question ID format',
            code: 'INVALID_QUESTION_ID',
          });
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate update assessment request
 */
export function validateUpdateAssessment(data: UpdateAssessmentRequest): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation (if provided)
  if (data.title !== undefined) {
    if (!data.title || data.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Assessment title cannot be empty',
        code: 'TITLE_REQUIRED',
      });
    } else if (data.title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Assessment title must be less than 200 characters',
        code: 'TITLE_TOO_LONG',
      });
    }
  }

  // Description validation (if provided)
  if (data.description !== undefined && data.description.length > 2000) {
    errors.push({
      field: 'description',
      message: 'Assessment description must be less than 2000 characters',
      code: 'DESCRIPTION_TOO_LONG',
    });
  }

  // Type validation (if provided)
  if (data.type && !Object.values(AssessmentType).includes(data.type)) {
    errors.push({
      field: 'type',
      message: 'Invalid assessment type',
      code: 'INVALID_TYPE',
    });
  }

  // Status validation (if provided)
  if (data.status && !Object.values(AssessmentStatus).includes(data.status)) {
    errors.push({
      field: 'status',
      message: 'Invalid assessment status',
      code: 'INVALID_STATUS',
    });
  }

  // Time limit validation (if provided)
  if (data.timeLimit !== undefined) {
    if (data.timeLimit <= 0) {
      errors.push({
        field: 'timeLimit',
        message: 'Time limit must be positive',
        code: 'INVALID_TIME_LIMIT',
      });
    } else if (data.timeLimit > 480) {
      errors.push({
        field: 'timeLimit',
        message: 'Time limit cannot exceed 480 minutes (8 hours)',
        code: 'TIME_LIMIT_TOO_LONG',
      });
    }
  }

  // Date validation (if provided)
  if (data.startsAt && data.endsAt) {
    if (data.startsAt >= data.endsAt) {
      errors.push({
        field: 'startsAt',
        message: 'Start date must be before end date',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  // Settings validation (if provided)
  if (data.settings) {
    const settingsValidation = validateAssessmentSettingsPartial(data.settings);
    errors.push(...settingsValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete assessment settings
 */
export function validateAssessmentSettings(settings: AssessmentSettings): ValidationResult {
  const errors: ValidationError[] = [];

  // General settings validation
  if (typeof settings.allowRetakes !== 'boolean') {
    errors.push({
      field: 'settings.allowRetakes',
      message: 'allowRetakes must be a boolean',
      code: 'INVALID_ALLOW_RETAKES',
    });
  }

  if (
    typeof settings.maxAttempts !== 'number' ||
    settings.maxAttempts < 1 ||
    settings.maxAttempts > 10
  ) {
    errors.push({
      field: 'settings.maxAttempts',
      message: 'maxAttempts must be a number between 1 and 10',
      code: 'INVALID_MAX_ATTEMPTS',
    });
  }

  if (typeof settings.shuffleQuestions !== 'boolean') {
    errors.push({
      field: 'settings.shuffleQuestions',
      message: 'shuffleQuestions must be a boolean',
      code: 'INVALID_SHUFFLE_QUESTIONS',
    });
  }

  if (typeof settings.showResults !== 'boolean') {
    errors.push({
      field: 'settings.showResults',
      message: 'showResults must be a boolean',
      code: 'INVALID_SHOW_RESULTS',
    });
  }

  // Timing settings validation
  if (
    typeof settings.timeWarningAt !== 'number' ||
    settings.timeWarningAt < 0 ||
    settings.timeWarningAt > 60
  ) {
    errors.push({
      field: 'settings.timeWarningAt',
      message: 'timeWarningAt must be a number between 0 and 60 minutes',
      code: 'INVALID_TIME_WARNING',
    });
  }

  if (typeof settings.autoSubmit !== 'boolean') {
    errors.push({
      field: 'settings.autoSubmit',
      message: 'autoSubmit must be a boolean',
      code: 'INVALID_AUTO_SUBMIT',
    });
  }

  // Proctoring settings validation
  const proctoring = settings.proctoring;
  if (typeof proctoring.enabled !== 'boolean') {
    errors.push({
      field: 'settings.proctoring.enabled',
      message: 'proctoring.enabled must be a boolean',
      code: 'INVALID_PROCTORING_ENABLED',
    });
  }

  if (typeof proctoring.videoRequired !== 'boolean') {
    errors.push({
      field: 'settings.proctoring.videoRequired',
      message: 'proctoring.videoRequired must be a boolean',
      code: 'INVALID_VIDEO_REQUIRED',
    });
  }

  if (typeof proctoring.audioRequired !== 'boolean') {
    errors.push({
      field: 'settings.proctoring.audioRequired',
      message: 'proctoring.audioRequired must be a boolean',
      code: 'INVALID_AUDIO_REQUIRED',
    });
  }

  // Collaboration settings validation
  const collaboration = settings.collaboration;
  if (typeof collaboration.enabled !== 'boolean') {
    errors.push({
      field: 'settings.collaboration.enabled',
      message: 'collaboration.enabled must be a boolean',
      code: 'INVALID_COLLABORATION_ENABLED',
    });
  }

  if (
    typeof collaboration.maxParticipants !== 'number' ||
    collaboration.maxParticipants < 1 ||
    collaboration.maxParticipants > 10
  ) {
    errors.push({
      field: 'settings.collaboration.maxParticipants',
      message: 'collaboration.maxParticipants must be a number between 1 and 10',
      code: 'INVALID_MAX_PARTICIPANTS',
    });
  }

  // Access control validation
  const accessControl = settings.accessControl;
  if (!Array.isArray(accessControl.ipWhitelist)) {
    errors.push({
      field: 'settings.accessControl.ipWhitelist',
      message: 'accessControl.ipWhitelist must be an array',
      code: 'INVALID_IP_WHITELIST',
    });
  } else {
    accessControl.ipWhitelist.forEach((ip, index) => {
      if (!validator.isIP(ip)) {
        errors.push({
          field: `settings.accessControl.ipWhitelist[${index}]`,
          message: 'Invalid IP address format',
          code: 'INVALID_IP_ADDRESS',
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate partial assessment settings (for updates)
 */
export function validateAssessmentSettingsPartial(
  settings: Partial<AssessmentSettings>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Only validate provided fields
  if (settings.allowRetakes !== undefined && typeof settings.allowRetakes !== 'boolean') {
    errors.push({
      field: 'settings.allowRetakes',
      message: 'allowRetakes must be a boolean',
      code: 'INVALID_ALLOW_RETAKES',
    });
  }

  if (settings.maxAttempts !== undefined) {
    if (
      typeof settings.maxAttempts !== 'number' ||
      settings.maxAttempts < 1 ||
      settings.maxAttempts > 10
    ) {
      errors.push({
        field: 'settings.maxAttempts',
        message: 'maxAttempts must be a number between 1 and 10',
        code: 'INVALID_MAX_ATTEMPTS',
      });
    }
  }

  if (settings.timeWarningAt !== undefined) {
    if (
      typeof settings.timeWarningAt !== 'number' ||
      settings.timeWarningAt < 0 ||
      settings.timeWarningAt > 60
    ) {
      errors.push({
        field: 'settings.timeWarningAt',
        message: 'timeWarningAt must be a number between 0 and 60 minutes',
        code: 'INVALID_TIME_WARNING',
      });
    }
  }

  // Validate proctoring settings if provided
  if (settings.proctoring) {
    const proctoring = settings.proctoring;
    if (proctoring.enabled !== undefined && typeof proctoring.enabled !== 'boolean') {
      errors.push({
        field: 'settings.proctoring.enabled',
        message: 'proctoring.enabled must be a boolean',
        code: 'INVALID_PROCTORING_ENABLED',
      });
    }
  }

  // Validate collaboration settings if provided
  if (settings.collaboration) {
    const collaboration = settings.collaboration;
    if (collaboration.maxParticipants !== undefined) {
      if (
        typeof collaboration.maxParticipants !== 'number' ||
        collaboration.maxParticipants < 1 ||
        collaboration.maxParticipants > 10
      ) {
        errors.push({
          field: 'settings.collaboration.maxParticipants',
          message: 'collaboration.maxParticipants must be a number between 1 and 10',
          code: 'INVALID_MAX_PARTICIPANTS',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// DATA NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalize assessment data for consistent storage
 */
export function normalizeAssessmentData(data: CreateAssessmentRequest): CreateAssessmentRequest {
  const normalized: CreateAssessmentRequest = {
    ...data,
    title: data.title.trim(),
    settings: normalizeAssessmentSettings(data.settings),
  };

  if (data.description !== undefined) {
    normalized.description = data.description.trim();
  }

  return normalized;
}

/**
 * Normalize assessment settings
 */
export function normalizeAssessmentSettings(settings: AssessmentSettings): AssessmentSettings {
  return {
    ...settings,
    proctoring: {
      ...settings.proctoring,
      // Ensure video is required if proctoring is enabled
      videoRequired: settings.proctoring.enabled ? settings.proctoring.videoRequired : false,
    },
    collaboration: {
      ...settings.collaboration,
      // Ensure reasonable defaults
      maxParticipants: Math.min(Math.max(settings.collaboration.maxParticipants, 1), 10),
    },
    accessControl: {
      ...settings.accessControl,
      // Filter out invalid IPs
      ipWhitelist: settings.accessControl.ipWhitelist.filter(ip => validator.isIP(ip)),
    },
  };
}

// ============================================================================
// INPUT SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize assessment input to prevent XSS and injection attacks
 */
export function sanitizeAssessmentInput(data: CreateAssessmentRequest): CreateAssessmentRequest {
  const sanitized: CreateAssessmentRequest = {
    ...data,
    title: validator.escape(data.title),
    // Settings are JSON, so they should be properly typed and validated
    // but we might want to sanitize string values within them
    settings: sanitizeAssessmentSettings(data.settings),
  };

  if (data.description !== undefined) {
    sanitized.description = validator.escape(data.description);
  }

  return sanitized;
}

/**
 * Sanitize assessment settings
 */
export function sanitizeAssessmentSettings(settings: AssessmentSettings): AssessmentSettings {
  return {
    ...settings,
    // Most settings are primitives, but we might need to sanitize arrays or objects
    accessControl: {
      ...settings.accessControl,
      // IP addresses should be validated, not escaped
      ipWhitelist: settings.accessControl.ipWhitelist.filter(ip => validator.isIP(ip)),
    },
  };
}

// ============================================================================
// BUSINESS RULE VALIDATION
// ============================================================================

/**
 * Validate assessment business rules
 */
export function validateAssessmentBusinessRules(
  data: CreateAssessmentRequest,
  existingAssessments?: any[]
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check for duplicate titles in the same organization
  if (existingAssessments) {
    const duplicateTitle = existingAssessments.find(
      assessment => assessment.title.toLowerCase() === data.title.toLowerCase()
    );

    if (duplicateTitle) {
      errors.push({
        field: 'title',
        message: 'Assessment with this title already exists',
        code: 'DUPLICATE_TITLE',
      });
    }
  }

  // Validate proctoring requirements
  if (data.settings.proctoring.enabled) {
    if (!data.settings.proctoring.videoRequired && !data.settings.proctoring.audioRequired) {
      errors.push({
        field: 'settings.proctoring',
        message: 'Proctoring requires at least video or audio monitoring',
        code: 'INVALID_PROCTORING_CONFIG',
      });
    }
  }

  // Validate collaboration constraints
  if (data.settings.collaboration.enabled && data.settings.proctoring.enabled) {
    // This might be a business rule - some organizations might not allow both
    // For now, we'll allow it but could add warnings
  }

  // Validate time limits with question count
  if (data.timeLimit && data.questionIds) {
    const avgTimePerQuestion = data.timeLimit / data.questionIds.length;
    if (avgTimePerQuestion < 1) {
      errors.push({
        field: 'timeLimit',
        message:
          'Time limit is too short for the number of questions (minimum 1 minute per question)',
        code: 'INSUFFICIENT_TIME_LIMIT',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if CUID format is valid (used by Prisma)
 */
export function isValidCUID(value: string): boolean {
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(value);
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date, endDate: Date): ValidationResult {
  const errors: ValidationError[] = [];

  if (startDate >= endDate) {
    errors.push({
      field: 'dateRange',
      message: 'Start date must be before end date',
      code: 'INVALID_DATE_RANGE',
    });
  }

  if (startDate <= new Date()) {
    errors.push({
      field: 'startDate',
      message: 'Start date must be in the future',
      code: 'INVALID_START_DATE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create default assessment settings
 */
export function createDefaultAssessmentSettings(): AssessmentSettings {
  return {
    allowRetakes: false,
    maxAttempts: 1,
    shuffleQuestions: false,
    showResults: true,
    timeWarningAt: 5,
    autoSubmit: true,
    proctoring: {
      enabled: false,
      videoRequired: false,
      audioRequired: false,
      screenRecording: false,
      tabSwitchDetection: false,
      faceDetection: false,
    },
    collaboration: {
      enabled: false,
      maxParticipants: 1,
      allowChat: false,
      allowScreenShare: false,
    },
    accessControl: {
      ipWhitelist: [],
      requireSecureBrowser: false,
      blockCopyPaste: false,
    },
  };
}
