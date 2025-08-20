/**
 * Session Validation Utilities
 * Comprehensive validation utilities for assessment session management
 */

import {
  CreateSessionRequest,
  UpdateSessionRequest,
  AnswerData,
  SessionConfiguration,
  NavigateRequest,
  NavigationDirection,
  SubmitAnswerRequest,
  QuestionOrderType
} from '../types/session.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

class SessionValidationUtils {
  /**
   * Validate create session request
   */
  validateCreateRequest(request: CreateSessionRequest): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!request.assessmentId) {
      errors.push('Assessment ID is required');
    }

    if (!request.candidateId) {
      errors.push('Candidate ID is required');
    }

    // Validate UUID format
    if (request.assessmentId && !this.isValidUUID(request.assessmentId)) {
      errors.push('Invalid assessment ID format');
    }

    if (request.candidateId && !this.isValidUUID(request.candidateId)) {
      errors.push('Invalid candidate ID format');
    }

    // Validate configuration if provided
    if (request.configuration) {
      const configValidation = this.validateSessionConfiguration(request.configuration);
      if (!configValidation.isValid) {
        errors.push(...configValidation.errors);
      }
    }

    // Validate dates
    if (request.scheduledFor && request.scheduledFor < new Date()) {
      errors.push('Scheduled time cannot be in the past');
    }

    if (request.expiresAt && request.expiresAt < new Date()) {
      errors.push('Expiration time cannot be in the past');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate session configuration
   */
  validateSessionConfiguration(config: Partial<SessionConfiguration>): ValidationResult {
    const errors: string[] = [];

    // Time limit validation
    if (config.timeLimit !== undefined) {
      if (config.timeLimit <= 0) {
        errors.push('Time limit must be positive');
      }
      if (config.timeLimit > 86400) { // 24 hours max
        errors.push('Time limit cannot exceed 24 hours');
      }
    }

    // Tab switch validation
    if (config.maxTabSwitches !== undefined && config.maxTabSwitches < 0) {
      errors.push('Max tab switches cannot be negative');
    }

    // Warning thresholds validation
    if (config.warningThresholds) {
      const thresholds = config.warningThresholds;
      
      if (thresholds.tabSwitches !== undefined && thresholds.tabSwitches < 0) {
        errors.push('Tab switch warning threshold cannot be negative');
      }

      if (thresholds.timeRemaining !== undefined && thresholds.timeRemaining < 0) {
        errors.push('Time remaining warning threshold cannot be negative');
      }

      if (thresholds.inactivity !== undefined && thresholds.inactivity < 0) {
        errors.push('Inactivity warning threshold cannot be negative');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate answer data
   */
  validateAnswerData(answer: AnswerData): ValidationResult {
    const errors: string[] = [];

    if (!answer) {
      errors.push('Answer data is required');
      return { isValid: false, errors };
    }

    // Validate confidence if provided
    if (answer.confidence !== undefined) {
      if (answer.confidence < 1 || answer.confidence > 5) {
        errors.push('Confidence must be between 1 and 5');
      }
    }

    // Validate coding answers
    if (answer.code !== undefined) {
      if (typeof answer.code !== 'string') {
        errors.push('Code must be a string');
      }
      if (answer.code.length > 50000) { // 50KB limit
        errors.push('Code exceeds maximum length');
      }
    }

    // Validate multiple choice answers
    if (answer.selectedOptions !== undefined) {
      if (!Array.isArray(answer.selectedOptions)) {
        errors.push('Selected options must be an array');
      } else if (answer.selectedOptions.length === 0) {
        errors.push('At least one option must be selected');
      }
    }

    // Validate system design answers
    if (answer.components !== undefined) {
      if (!Array.isArray(answer.components)) {
        errors.push('Components must be an array');
      }
    }

    // Validate database answers
    if (answer.query !== undefined) {
      if (typeof answer.query !== 'string') {
        errors.push('Database query must be a string');
      }
      if (answer.query.length > 10000) { // 10KB limit
        errors.push('Database query exceeds maximum length');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate navigate request
   */
  validateNavigateRequest(request: NavigateRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.direction) {
      errors.push('Navigation direction is required');
    }

    if (!Object.values(NavigationDirection).includes(request.direction)) {
      errors.push('Invalid navigation direction');
    }

    if (request.direction === NavigationDirection.JUMP) {
      if (request.targetIndex === undefined) {
        errors.push('Target index is required for jump navigation');
      } else if (request.targetIndex < 0) {
        errors.push('Target index cannot be negative');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate submit answer request
   */
  validateSubmitAnswerRequest(request: SubmitAnswerRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.questionId) {
      errors.push('Question ID is required');
    }

    if (!this.isValidUUID(request.questionId)) {
      errors.push('Invalid question ID format');
    }

    if (!request.answer) {
      errors.push('Answer data is required');
    } else {
      const answerValidation = this.validateAnswerData(request.answer);
      if (!answerValidation.isValid) {
        errors.push(...answerValidation.errors);
      }
    }

    if (request.timeSpent !== undefined && request.timeSpent < 0) {
      errors.push('Time spent cannot be negative');
    }

    if (request.confidence !== undefined) {
      if (request.confidence < 1 || request.confidence > 5) {
        errors.push('Confidence must be between 1 and 5');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate update session request
   */
  validateUpdateSessionRequest(request: UpdateSessionRequest): ValidationResult {
    const errors: string[] = [];

    // At least one field should be provided
    const hasUpdates = request.status || 
                      request.configuration || 
                      request.currentQuestionIndex !== undefined || 
                      request.metadata;

    if (!hasUpdates) {
      errors.push('At least one field must be provided for update');
    }

    // Validate configuration if provided
    if (request.configuration) {
      const configValidation = this.validateSessionConfiguration(request.configuration);
      if (!configValidation.isValid) {
        errors.push(...configValidation.errors);
      }
    }

    // Validate current question index
    if (request.currentQuestionIndex !== undefined && request.currentQuestionIndex < 0) {
      errors.push('Current question index cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize answer data to remove potentially harmful content
   */
  sanitizeAnswerData(answer: AnswerData): AnswerData {
    const sanitized = { ...answer };

    // Sanitize string fields
    if (sanitized.code) {
      sanitized.code = this.sanitizeString(sanitized.code);
    }

    if (sanitized.explanation) {
      sanitized.explanation = this.sanitizeString(sanitized.explanation);
    }

    if (sanitized.query) {
      sanitized.query = this.sanitizeString(sanitized.query);
    }

    if (sanitized.algorithm) {
      sanitized.algorithm = this.sanitizeString(sanitized.algorithm);
    }

    if (sanitized.finalAnswer) {
      sanitized.finalAnswer = this.sanitizeString(sanitized.finalAnswer);
    }

    // Sanitize arrays
    if (sanitized.selectedOptions) {
      sanitized.selectedOptions = sanitized.selectedOptions.map(option => 
        this.sanitizeString(option)
      );
    }

    return sanitized;
  }

  /**
   * Normalize session configuration with defaults
   */
  normalizeSessionConfiguration(config: Partial<SessionConfiguration>): SessionConfiguration {
    return {
      timeLimit: config.timeLimit || 3600, // 1 hour default
      questionOrder: config.questionOrder || QuestionOrderType.SEQUENTIAL,
      allowBackNavigation: config.allowBackNavigation ?? true,
      showProgress: config.showProgress ?? true,
      showTimer: config.showTimer ?? true,
      autoSubmit: config.autoSubmit ?? true,
      randomizeOptions: config.randomizeOptions ?? false,
      preventTabSwitch: config.preventTabSwitch ?? false,
      enableProctoring: config.enableProctoring ?? false,
      maxTabSwitches: config.maxTabSwitches || 3,
      warningThresholds: {
        tabSwitches: config.warningThresholds?.tabSwitches || 2,
        timeRemaining: config.warningThresholds?.timeRemaining || 300, // 5 minutes
        inactivity: config.warningThresholds?.inactivity || 600 // 10 minutes
      }
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private sanitizeString(input: string): string {
    if (!input) return input;

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
}

export const sessionValidationUtils = new SessionValidationUtils();
