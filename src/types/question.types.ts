/**
 * Question Types and Interfaces
 * TASK-CG-006: Question Management System
 * Persona: Senior Software Engineer
 * 
 * Comprehensive type definitions for question management operations,
 * supporting multiple question types and content structures.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum QuestionType {
  CODING = 'CODING',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', 
  SYSTEM_DESIGN = 'SYSTEM_DESIGN',
  DATABASE = 'DATABASE',
  ALGORITHM = 'ALGORITHM',
}

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXPERT = 'EXPERT',
}

export enum QuestionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

// ============================================================================
// QUESTION CONTENT TYPES
// ============================================================================

export interface CodingQuestionContent {
  problemStatement: string;
  constraints: string[];
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  starterCode: Record<string, string>; // language -> code
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    points: number;
  }>;
  timeLimit: number; // in seconds
  memoryLimit: number; // in MB
  allowedLanguages: string[];
  hints?: string[];
}

export interface MultipleChoiceQuestionContent {
  question: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  allowMultipleAnswers: boolean;
  shuffleOptions: boolean;
  explanation?: string;
}

export interface SystemDesignQuestionContent {
  scenario: string;
  requirements: Array<{
    type: 'functional' | 'non-functional';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  constraints: string[];
  evaluationCriteria: Array<{
    criterion: string;
    weight: number;
    description: string;
  }>;
  timeLimit: number;
  resourcesAllowed: boolean;
  submissionFormat: 'document' | 'diagram' | 'both';
}

export interface DatabaseQuestionContent {
  scenario: string;
  schema: Array<{
    tableName: string;
    columns: Array<{
      name: string;
      type: string;
      constraints: string[];
    }>;
  }>;
  sampleData?: Record<string, any[]>;
  tasks: Array<{
    description: string;
    expectedQuery?: string;
    points: number;
  }>;
  allowedCommands: string[];
  timeLimit: number;
}

export interface AlgorithmQuestionContent {
  problemStatement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  timeComplexityExpected?: string;
  spaceComplexityExpected?: string;
  algorithmsExpected?: string[];
  timeLimit: number;
}

export type QuestionContent = 
  | CodingQuestionContent
  | MultipleChoiceQuestionContent
  | SystemDesignQuestionContent
  | DatabaseQuestionContent
  | AlgorithmQuestionContent;

// ============================================================================
// QUESTION CRUD TYPES
// ============================================================================

export interface CreateQuestionRequest {
  title: string;
  description: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  tags: string[];
  content: QuestionContent;
  metadata?: Record<string, any>;
  organizationId?: string;
}

export interface UpdateQuestionRequest {
  title?: string;
  description?: string;
  type?: QuestionType;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  content?: QuestionContent;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface QuestionResponse {
  id: string;
  title: string;
  description: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  tags: string[];
  content: QuestionContent;
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  usageCount: number;
  averageScore?: number;
}

export interface QuestionListResponse {
  questions: QuestionResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: QuestionSearchFilters;
}

// ============================================================================
// SEARCH AND FILTERING
// ============================================================================

export interface QuestionSearchFilters {
  query?: string;
  type?: QuestionType | QuestionType[];
  difficulty?: QuestionDifficulty | QuestionDifficulty[];
  tags?: string[];
  isActive?: boolean;
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  usageCountMin?: number;
  usageCountMax?: number;
  averageScoreMin?: number;
  averageScoreMax?: number;
}

export interface QuestionSearchCriteria extends QuestionSearchFilters {
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'difficulty' | 'usageCount' | 'averageScore';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// QUESTION BANK MANAGEMENT
// ============================================================================

export interface QuestionBankRequest {
  name: string;
  description?: string;
  questionIds: string[];
  tags?: string[];
  isPublic?: boolean;
  organizationId?: string;
}

export interface QuestionBankResponse {
  id: string;
  name: string;
  description?: string;
  questions: QuestionResponse[];
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  organizationId: string;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkQuestionOperation {
  action: 'DELETE' | 'ARCHIVE' | 'ACTIVATE' | 'UPDATE_TAGS' | 'UPDATE_DIFFICULTY';
  questionIds: string[];
  data?: {
    tags?: string[];
    difficulty?: QuestionDifficulty;
    metadata?: Record<string, any>;
  };
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{
    questionId: string;
    error: string;
  }>;
}

// ============================================================================
// QUESTION ANALYTICS
// ============================================================================

export interface QuestionAnalytics {
  questionId: string;
  title: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  totalAttempts: number;
  successfulAttempts: number;
  averageScore: number;
  averageTimeSpent: number; // in minutes
  commonMistakes: Array<{
    mistake: string;
    frequency: number;
    examples: string[];
  }>;
  difficultyFeedback: Array<{
    rating: 'too_easy' | 'appropriate' | 'too_hard';
    count: number;
  }>;
  tagUsage: Array<{
    tag: string;
    relevanceScore: number;
  }>;
  performanceByDemographic: Array<{
    demographic: string;
    averageScore: number;
    attemptCount: number;
  }>;
}

// ============================================================================
// QUESTION VALIDATION
// ============================================================================

export interface QuestionValidationResult {
  isValid: boolean;
  errors: QuestionValidationError[];
  warnings: QuestionValidationWarning[];
  suggestions: string[];
}

export interface QuestionValidationError {
  field: string;
  message: string;
  code: QuestionErrorCode;
  details?: Record<string, any>;
}

export interface QuestionValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export enum QuestionErrorCode {
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_CONTENT_FORMAT = 'INVALID_CONTENT_FORMAT',
  INVALID_TEST_CASES = 'INVALID_TEST_CASES',
  INVALID_TIME_LIMIT = 'INVALID_TIME_LIMIT',
  INVALID_DIFFICULTY_CONTENT_MISMATCH = 'INVALID_DIFFICULTY_CONTENT_MISMATCH',
  DUPLICATE_OPTIONS = 'DUPLICATE_OPTIONS',
  NO_CORRECT_ANSWER = 'NO_CORRECT_ANSWER',
  INVALID_EVALUATION_CRITERIA = 'INVALID_EVALUATION_CRITERIA',
  INVALID_SCHEMA_FORMAT = 'INVALID_SCHEMA_FORMAT',
  MISSING_SAMPLE_DATA = 'MISSING_SAMPLE_DATA',
  INVALID_COMPLEXITY_SPECIFICATION = 'INVALID_COMPLEXITY_SPECIFICATION',
  // Additional validation error codes
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_VALUE = 'INVALID_VALUE',
  COMPLEXITY_MISMATCH = 'COMPLEXITY_MISMATCH',
  // HTTP and business logic errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// QUESTION IMPORT/EXPORT
// ============================================================================

export interface QuestionImportRequest {
  format: 'json' | 'csv' | 'xml';
  data: string | Record<string, any>[];
  validateOnly?: boolean;
  organizationId?: string;
  defaultTags?: string[];
}

export interface QuestionImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  validationErrors: Array<{
    row: number;
    errors: QuestionValidationError[];
  }>;
  importedQuestions: string[]; // Question IDs
}

export interface QuestionExportRequest {
  questionIds?: string[];
  filters?: QuestionSearchFilters;
  format: 'json' | 'csv' | 'pdf';
  includeAnalytics?: boolean;
  includeTestCases?: boolean;
}

export interface QuestionExportResult {
  success: boolean;
  downloadUrl: string;
  expiresAt: Date;
  fileSize: number;
  questionCount: number;
}

// ============================================================================
// QUESTION TEMPLATES
// ============================================================================

export interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  contentTemplate: Partial<QuestionContent>;
  placeholders: Array<{
    field: string;
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface CreateQuestionFromTemplateRequest {
  templateId: string;
  title: string;
  description: string;
  placeholderValues: Record<string, any>;
  tags?: string[];
  organizationId?: string;
}

// ============================================================================
// QUESTION COLLABORATION
// ============================================================================

export interface QuestionReview {
  id: string;
  questionId: string;
  reviewerId: string;
  reviewerName: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
  feedback: string;
  suggestedChanges?: Array<{
    field: string;
    currentValue: any;
    suggestedValue: any;
    reason: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionComment {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  content: string;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  replies: QuestionComment[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface QuestionError {
  code: QuestionErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

export interface QuestionApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: QuestionError;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface QuestionApiListResponse<T = any> extends QuestionApiResponse<T[]> {
  filters?: QuestionSearchFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
