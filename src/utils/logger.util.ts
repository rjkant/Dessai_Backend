/**
 * Logger Utility - Enhanced for Observability
 *
 * Centralized logging system for the Dessai Backend application
 * Provides structured logging with different levels, contexts, and output formats
 * Enhanced with observability features and specialized domain loggers
 * Persona: Technical Strategy Advisor (@cto-advisor)
 */

import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';
import { Request } from 'express';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

export interface LogContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
  resource?: string;
  duration?: number;
  category?:
    | 'security'
    | 'business'
    | 'technical'
    | 'compliance'
    | 'integration'
    | 'performance'
    | 'http'
    | 'user_activity';
  type?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
  meta?: any;
  service?: string;
}

export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;
  private defaultContext: LogContext = {};

  private constructor() {
    this.winston = this.createWinstonLogger();
  }

  /**
   * Get singleton instance of Logger
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Create winston logger instance with custom configuration
   */
  private createWinstonLogger(): winston.Logger {
    const isProduction = process.env['NODE_ENV'] === 'production';
    const logDir = process.env['LOG_DIR'] || 'logs';

    // Custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, error }) => {
        let log = `${timestamp} [${level}]: ${message}`;

        if (context && Object.keys(context).length > 0) {
          log += ` | Context: ${JSON.stringify(context)}`;
        }

        if (error && typeof error === 'object' && 'stack' in error) {
          log += `\n${(error as Error).stack}`;
        }

        return log;
      })
    );

    const transports: winston.transport[] = [];

    // Console transport for development
    if (!isProduction) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug',
        })
      );
    }

    // File transports for production
    if (isProduction) {
      transports.push(
        // Error logs
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: customFormat,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true,
        }),

        // Combined logs
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: customFormat,
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
          tailable: true,
        }),

        // HTTP access logs
        new winston.transports.File({
          filename: path.join(logDir, 'access.log'),
          level: 'http',
          format: customFormat,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5,
          tailable: true,
        })
      );
    }

    return winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: customFormat,
      transports,
      exitOnError: false,
      silent: process.env['NODE_ENV'] === 'test',
    });
  }

  /**
   * Set default context for all logs
   */
  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Clear default context
   */
  clearDefaultContext(): void {
    this.defaultContext = {};
  }

  /**
   * Create logger context from Express request
   */
  static createRequestContext(req: Request): LogContext {
    const context: LogContext = {
      method: req.method,
      url: req.originalUrl || req.url,
    };

    const requestId = req.headers['x-request-id'] as string;
    if (requestId) {
      context.requestId = requestId;
    }

    if ((req as any).user?.id) {
      context.userId = (req as any).user.id;
    }
    if ((req as any).user?.organizationId) {
      context.organizationId = (req as any).user.organizationId;
    }

    const ipAddress = req.ip || req.connection?.remoteAddress;
    if (ipAddress) {
      context.ipAddress = ipAddress;
    }

    const userAgent = req.headers['user-agent'];
    if (userAgent) {
      context.userAgent = userAgent;
    }

    if (Object.keys(req.query).length > 0) {
      context['query'] = req.query;
    }
    if (req.method !== 'GET' && req.body) {
      context['body'] = this.sanitizeRequestBody(req.body);
    }

    return context;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private static sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'authorization',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const options: { error?: Error; context?: LogContext } = {};
    if (error) {
      options.error = error;
    }
    if (context) {
      options.context = context;
    }
    this.log(LogLevel.ERROR, message, options);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const options: { context?: LogContext } = {};
    if (context) {
      options.context = context;
    }
    this.log(LogLevel.WARN, message, options);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    const options: { context?: LogContext } = {};
    if (context) {
      options.context = context;
    }
    this.log(LogLevel.INFO, message, options);
  }

  /**
   * Log HTTP request/response
   */
  http(message: string, context?: LogContext): void {
    const options: { context?: LogContext } = {};
    if (context) {
      options.context = context;
    }
    this.log(LogLevel.HTTP, message, options);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    const options: { context?: LogContext } = {};
    if (context) {
      options.context = context;
    }
    this.log(LogLevel.DEBUG, message, options);
  }

  /**
   * Log with specified level
   */
  private log(
    level: LogLevel,
    message: string,
    options: { error?: Error; context?: LogContext } = {}
  ): void {
    const { error, context } = options;
    const mergedContext = { ...this.defaultContext, ...context };

    const logEntry: any = {
      message,
      context: Object.keys(mergedContext).length > 0 ? mergedContext : undefined,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.winston.log(level, logEntry);
  }

  /**
   * Log performance metrics
   */
  performance(action: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${action} completed`, {
      ...context,
      action,
      duration,
      performanceMetric: true,
    });
  }

  /**
   * Log security events
   */
  security(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      securityEvent: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log audit events
   */
  audit(action: string, resource: string, context?: LogContext): void {
    this.info(`Audit: ${action} on ${resource}`, {
      ...context,
      action,
      resource,
      auditEvent: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log business events
   */
  business(event: string, data?: any, context?: LogContext): void {
    this.info(`Business Event: ${event}`, {
      ...context,
      businessEvent: true,
      eventData: data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.setDefaultContext({ ...this.defaultContext, ...context });
    return childLogger;
  }

  /**
   * Flush all log buffers
   */
  async flush(): Promise<void> {
    return new Promise(resolve => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.winston.level;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.winston.level = level;
  }

  /**
   * Check if level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this.winston.isLevelEnabled(level);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Enhanced specialized logging functions for observability
export const authLogger = {
  loginAttempt: (email: string, success: boolean, ip: string, userAgent?: string) => {
    logger.info('Authentication attempt', {
      type: 'auth',
      action: 'login',
      email,
      success,
      ipAddress: ip,
      ...(userAgent && { userAgent }),
      category: 'security',
    });
  },

  loginFailure: (email: string, reason: string, ip: string, userAgent?: string) => {
    logger.warn('Authentication failure', {
      type: 'auth',
      action: 'login_failure',
      email,
      reason,
      ipAddress: ip,
      ...(userAgent && { userAgent }),
      category: 'security',
    });
  },

  logout: (userId: string, sessionDuration: number) => {
    logger.info('User logout', {
      type: 'auth',
      action: 'logout',
      userId,
      sessionDuration,
      category: 'user_activity',
    });
  },
};

export const assessmentLogger = {
  created: (assessmentId: string, createdBy: string, type: string, difficulty: string) => {
    logger.info('Assessment created', {
      type: 'assessment',
      action: 'created',
      resource: assessmentId,
      userId: createdBy,
      assessmentType: type,
      difficulty,
      category: 'business',
    });
  },

  completed: (
    assessmentId: string,
    userId: string,
    duration: number,
    score: number,
    result: string
  ) => {
    logger.info('Assessment completed', {
      type: 'assessment',
      action: 'completed',
      resource: assessmentId,
      userId,
      duration,
      score,
      result,
      category: 'business',
    });
  },
};

export const codeExecutionLogger = {
  started: (executionId: string, language: string, userId: string) => {
    logger.info('Code execution started', {
      type: 'code_execution',
      action: 'started',
      resource: executionId,
      language,
      userId,
      category: 'technical',
    });
  },

  completed: (
    executionId: string,
    language: string,
    duration: number,
    memory: number,
    result: string
  ) => {
    logger.info('Code execution completed', {
      type: 'code_execution',
      action: 'completed',
      resource: executionId,
      language,
      duration,
      memory,
      result,
      category: 'technical',
    });
  },
};

export const securityLogger = {
  suspiciousActivity: (
    userId: string,
    activity: string,
    ip: string,
    details: Record<string, any>
  ) => {
    logger.warn('Suspicious activity detected', {
      type: 'security',
      action: 'suspicious_activity',
      userId,
      activity,
      ipAddress: ip,
      details,
      category: 'security',
    });
  },

  rateLimitExceeded: (ip: string, endpoint: string, attempts: number) => {
    logger.warn('Rate limit exceeded', {
      type: 'security',
      action: 'rate_limit_exceeded',
      ipAddress: ip,
      endpoint,
      attempts,
      category: 'security',
    });
  },
};

// Export utility functions
export const createRequestLogger = (req: Request): Logger => {
  const context = Logger.createRequestContext(req);
  return logger.child(context);
};

export const logPerformance = (action: string) => {
  const start = Date.now();
  return (context?: LogContext) => {
    const duration = Date.now() - start;
    logger.performance(action, duration, context);
  };
};

export const logError = (error: Error, context?: LogContext): void => {
  logger.error(error.message, error, context);
};

export const logInfo = (message: string, context?: LogContext): void => {
  logger.info(message, context);
};

export const logDebug = (message: string, context?: LogContext): void => {
  logger.debug(message, context);
};

export const logWarning = (message: string, context?: LogContext): void => {
  logger.warn(message, context);
};

export const logSecurity = (event: string, context?: LogContext): void => {
  logger.security(event, context);
};

export const logAudit = (action: string, resource: string, context?: LogContext): void => {
  logger.audit(action, resource, context);
};

export const logBusiness = (event: string, data?: any, context?: LogContext): void => {
  logger.business(event, data, context);
};
