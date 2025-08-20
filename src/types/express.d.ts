/**
 * Express.js Type Augmentation
 * Persona: Senior Software Engineer
 * 
 * Extends Express Request interface to include user authentication data
 */

import { Request } from 'express';

declare namespace Express {
  interface Request {
    user?: {
      id: string;
      organizationId: string;
      email: string;
      role: string;
      isActive: boolean;
      firstName: string;
      lastName: string;
      roleId: string;
      mfaEnabled: boolean;
      emailVerified: boolean;
    };
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
    isActive: boolean;
    firstName: string;
    lastName: string;
    roleId: string;
    mfaEnabled: boolean;
    emailVerified: boolean;
  };
}
