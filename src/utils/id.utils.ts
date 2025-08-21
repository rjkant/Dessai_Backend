/**
 * ID Generation Utilities
 * TASK-CG-005: Assessment Management Core
 * Persona: Senior Software Engineer
 *
 * Utilities for generating unique IDs and codes for assessments and sessions.
 */

import { randomBytes, randomUUID } from 'crypto';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return randomUUID();
}

/**
 * Generate a unique assessment code (shorter, user-friendly)
 */
export function generateAssessmentCode(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `${timestamp}-${randomPart}`;
}

/**
 * Generate a random string of specified length
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return randomUUID();
}
