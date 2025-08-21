/**
 * Validation Utilities
 * TASK-CG-005: Assessment Management Core
 * Persona: Senior Software Engineer
 *
 * Common validation utilities for user input and business logic.
 */

import { validate as uuidValidate, version as uuidVersion } from 'uuid';

/**
 * Validate if a string is a valid UUID v4
 */
export function validateUserId(id: string): boolean {
  return uuidValidate(id) && uuidVersion(id) === 4;
}

/**
 * Validate if a string is a valid UUID
 */
export function validateUUID(id: string): boolean {
  return uuidValidate(id);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate if a date is in the future
 */
export function validateFutureDate(date: Date): boolean {
  return date > new Date();
}

/**
 * Validate if start date is before end date
 */
export function validateDateRange(startDate: Date, endDate: Date): boolean {
  return startDate < endDate;
}

/**
 * Validate string length
 */
export function validateStringLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

/**
 * Validate if a value is within a numeric range
 */
export function validateNumericRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

/**
 * Validate organization slug format
 */
export function validateSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}
