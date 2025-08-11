/**
 * Application Error Utility
 * Dessai Backend - Custom Error Classes
 * @testing persona validation
 */

/**
 * Custom application error class
 * Extends Error with status code and additional details
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 * For input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

/**
 * Authentication Error
 * For authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(message, 401, details);
  }
}

/**
 * Authorization Error
 * For authorization failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', details?: any) {
    super(message, 403, details);
  }
}

/**
 * Not Found Error
 * For resource not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, details);
  }
}

/**
 * Conflict Error
 * For resource conflicts (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, details);
  }
}

/**
 * Rate Limit Error
 * For rate limiting violations
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 429, details);
  }
}

/**
 * Service Unavailable Error
 * For service outages or maintenance
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(message, 503, details);
  }
}

/**
 * Database Error
 * For database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, details);
  }
}

/**
 * External Service Error
 * For third-party service failures
 */
export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service error', details?: any) {
    super(message, 502, details);
  }
}

/**
 * Error factory functions
 */
export const createError = {
  validation: (message: string, details?: any) => new ValidationError(message, details),
  authentication: (message?: string, details?: any) => new AuthenticationError(message, details),
  authorization: (message?: string, details?: any) => new AuthorizationError(message, details),
  notFound: (message?: string, details?: any) => new NotFoundError(message, details),
  conflict: (message?: string, details?: any) => new ConflictError(message, details),
  rateLimit: (message?: string, details?: any) => new RateLimitError(message, details),
  serviceUnavailable: (message?: string, details?: any) => new ServiceUnavailableError(message, details),
  database: (message?: string, details?: any) => new DatabaseError(message, details),
  externalService: (message?: string, details?: any) => new ExternalServiceError(message, details),
  generic: (message: string, statusCode?: number, details?: any) => new AppError(message, statusCode, details)
};

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * HTTP status code constants
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;
