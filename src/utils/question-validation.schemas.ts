/**
 * Question Validation Schemas
 * TASK-CG-006: Question Management System
 * Persona: Quality Assurance Engineer
 *
 * Express-validator schemas for question-related API endpoints.
 * Provides reusable validation chains for request validation.
 */

import { body, query, param } from 'express-validator';
import { QuestionType, QuestionDifficulty } from '../types/question.types';

// ============================================================================
// HELPER VALIDATORS
// ============================================================================

/**
 * Validates question type enum
 */
const questionTypeValidator = () =>
  body('type')
    .isIn(Object.values(QuestionType))
    .withMessage(`Question type must be one of: ${Object.values(QuestionType).join(', ')}`);

/**
 * Validates question difficulty enum
 */
const questionDifficultyValidator = () =>
  body('difficulty')
    .isIn(Object.values(QuestionDifficulty))
    .withMessage(`Difficulty must be one of: ${Object.values(QuestionDifficulty).join(', ')}`);

/**
 * Validates tags array
 */
const tagsValidator = () =>
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom(tags => {
      if (tags && tags.length > 0) {
        return tags.every((tag: any) => typeof tag === 'string' && tag.trim().length > 0);
      }
      return true;
    })
    .withMessage('All tags must be non-empty strings');

/**
 * Validates estimated time
 */
const estimatedTimeValidator = () =>
  body('estimatedTimeMinutes')
    .isInt({ min: 1, max: 480 })
    .withMessage('Estimated time must be between 1 and 480 minutes');

/**
 * Validates basic question content
 */
const basicContentValidator = () => [
  body('title')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .trim(),

  body('description')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters')
    .trim(),
];

// ============================================================================
// CONTENT TYPE SPECIFIC VALIDATORS (Future Use)
// ============================================================================

/*
 * These validators will be integrated with conditional validation
 * based on question type in future iterations.
 */

/*
const codingContentValidator = () => [
  body('content.language')
    .isIn(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust'])
    .withMessage('Invalid programming language'),
  
  body('content.starterCode')
    .optional()
    .isString()
    .withMessage('Starter code must be a string'),
  
  body('content.testCases')
    .isArray({ min: 1 })
    .withMessage('At least one test case is required'),
  
  body('content.testCases.*.input')
    .isString()
    .withMessage('Test case input must be a string'),
  
  body('content.testCases.*.expectedOutput')
    .isString()
    .withMessage('Test case expected output must be a string'),
  
  body('content.testCases.*.isHidden')
    .optional()
    .isBoolean()
    .withMessage('Test case isHidden must be a boolean'),
  
  body('content.constraints')
    .optional()
    .isArray()
    .withMessage('Constraints must be an array'),
  
  body('content.examples')
    .optional()
    .isArray()
    .withMessage('Examples must be an array'),
];

const multipleChoiceContentValidator = () => [
  body('content.options')
    .isArray({ min: 2, max: 6 })
    .withMessage('Multiple choice questions must have 2-6 options'),
  
  body('content.options.*.text')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Option text must be 1-500 characters'),
  
  body('content.options.*.isCorrect')
    .isBoolean()
    .withMessage('Option isCorrect must be a boolean'),
  
  body('content.allowMultipleSelection')
    .optional()
    .isBoolean()
    .withMessage('allowMultipleSelection must be a boolean'),
  
  body('content.explanation')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Explanation must be at most 1000 characters'),
];

const systemDesignContentValidator = () => [
  body('content.scenario')
    .isString()
    .isLength({ min: 50, max: 2000 })
    .withMessage('Scenario must be 50-2000 characters'),
  
  body('content.requirements')
    .isArray({ min: 1 })
    .withMessage('At least one requirement is needed'),
  
  body('content.requirements.*')
    .isString()
    .isLength({ min: 10, max: 300 })
    .withMessage('Each requirement must be 10-300 characters'),
  
  body('content.constraints')
    .optional()
    .isArray()
    .withMessage('Constraints must be an array'),
  
  body('content.evaluationCriteria')
    .isArray({ min: 1 })
    .withMessage('At least one evaluation criterion is needed'),
  
  body('content.evaluationCriteria.*')
    .isString()
    .isLength({ min: 5, max: 200 })
    .withMessage('Each evaluation criterion must be 5-200 characters'),
];
*/

// ============================================================================
// MAIN VALIDATION SCHEMAS
// ============================================================================

/**
 * Create question validation schema
 */
export const createQuestionSchema = [
  ...basicContentValidator(),
  questionTypeValidator(),
  questionDifficultyValidator(),
  tagsValidator(),
  estimatedTimeValidator(),

  // Conditional content validation based on question type
  body('content').custom(content => {
    if (!content || typeof content !== 'object') {
      throw new Error('Content is required and must be an object');
    }

    // Additional content validation would be implemented here
    // based on the question type
    return true;
  }),
];

/**
 * Update question validation schema
 */
export const updateQuestionSchema = [
  param('id').isUUID().withMessage('Question ID must be a valid UUID'),

  body('title')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters')
    .trim(),

  body('difficulty')
    .optional()
    .isIn(Object.values(QuestionDifficulty))
    .withMessage(`Difficulty must be one of: ${Object.values(QuestionDifficulty).join(', ')}`),

  tagsValidator(),

  body('estimatedTimeMinutes')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Estimated time must be between 1 and 480 minutes'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

/**
 * Search questions validation schema
 */
export const searchQuestionsSchema = [
  query('query')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),

  query('type')
    .optional()
    .custom(value => {
      if (Array.isArray(value)) {
        return value.every(type => Object.values(QuestionType).includes(type));
      }
      return Object.values(QuestionType).includes(value);
    })
    .withMessage(`Type must be one of: ${Object.values(QuestionType).join(', ')}`),

  query('difficulty')
    .optional()
    .custom(value => {
      if (Array.isArray(value)) {
        return value.every(diff => Object.values(QuestionDifficulty).includes(diff));
      }
      return Object.values(QuestionDifficulty).includes(value);
    })
    .withMessage(`Difficulty must be one of: ${Object.values(QuestionDifficulty).join(', ')}`),

  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['title', 'difficulty', 'type', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),

  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
];

/**
 * Bulk operation validation schema
 */
export const bulkQuestionOperationSchema = [
  body('operation')
    .isIn(['delete', 'activate', 'deactivate', 'updateTags'])
    .withMessage('Operation must be one of: delete, activate, deactivate, updateTags'),

  body('questionIds').isArray({ min: 1, max: 100 }).withMessage('Must specify 1-100 question IDs'),

  body('questionIds.*').isUUID().withMessage('All question IDs must be valid UUIDs'),

  body('data').optional().isObject().withMessage('Data must be an object'),
];

/**
 * Question ID parameter validation
 */
export const questionIdSchema = [
  param('id').isUUID().withMessage('Question ID must be a valid UUID'),
];

// ============================================================================
// EXPORT VALIDATION MIDDLEWARE FUNCTION
// ============================================================================

/**
 * Creates a validation middleware function that can be used in routes
 */
export const validateRequest = (schema: any[]) => {
  return [...schema];
};
