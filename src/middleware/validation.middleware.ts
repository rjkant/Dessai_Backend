/**
 * Persona: Quality Assurance Engineer
 *
 * Validation middleware for request validation using express-validator
 * Provides reusable validation functions for API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export class ValidationMiddleware {
  /**
   * Handle validation errors from express-validator
   */
  static handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.type === 'field' ? error.path : 'unknown',
          message: error.msg,
          value: error.type === 'field' ? error.value : undefined,
        })),
      });
      return;
    }

    next();
  }

  /**
   * Create a validation chain with error handling
   */
  static validate(validations: ValidationChain[]) {
    return [...validations, ValidationMiddleware.handleValidationErrors];
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(req: Request, res: Response, next: NextFunction): void {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 10;

    if (page < 1) {
      res.status(400).json({
        success: false,
        message: 'Page must be a positive integer',
      });
      return;
    }

    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100',
      });
      return;
    }

    // Add validated pagination to request
    req.pagination = { page, limit };
    next();
  }

  /**
   * Validate UUID parameters
   */
  static validateUUID(paramName: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const uuid = req.params[paramName];
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(uuid)) {
        res.status(400).json({
          success: false,
          message: `Invalid ${paramName} format. Must be a valid UUID.`,
        });
        return;
      }

      next();
    };
  }

  /**
   * Validate JSON payload exists
   */
  static requireJSON(req: Request, res: Response, next: NextFunction): void {
    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Request body is required',
      });
      return;
    }

    next();
  }

  /**
   * Sanitize string inputs to prevent XSS
   */
  static sanitizeStrings(req: Request, _res: Response, next: NextFunction): void {
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      if (value && typeof value === 'object') {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };

    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    next();
  }

  /**
   * Rate limiting for sensitive operations
   */
  static rateLimitSensitive(_req: Request, _res: Response, next: NextFunction): void {
    // This would integrate with a rate limiting service (Redis)
    // For now, we'll just pass through
    // TODO: Implement actual rate limiting logic
    next();
  }

  /**
   * Validate content type
   */
  static requireContentType(contentType: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.is(contentType)) {
        res.status(415).json({
          success: false,
          message: `Content-Type must be ${contentType}`,
        });
        return;
      }
      next();
    };
  }

  /**
   * Validate required headers
   */
  static requireHeaders(headers: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const missingHeaders = headers.filter(header => !req.headers[header.toLowerCase()]);

      if (missingHeaders.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required headers: ${missingHeaders.join(', ')}`,
        });
        return;
      }

      next();
    };
  }
}

// Extend Express Request interface to include pagination
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
      };
    }
  }
}

// Convenience exports for easier importing
export const validateRequest = ValidationMiddleware.validate;
export const handleValidationErrors = ValidationMiddleware.handleValidationErrors;
export const validatePagination = ValidationMiddleware.validatePagination;
export const validateUUID = ValidationMiddleware.validateUUID;
export const requireJSON = ValidationMiddleware.requireJSON;
export const sanitizeStrings = ValidationMiddleware.sanitizeStrings;
