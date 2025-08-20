/**
 * Assessment Type Definitions
 * TASK-CG-005: Assessment Management Core
 * Persona: Senior Software Engineer
 * 
 * Comprehensive type definitions for assessment management,
 * question handling, and assessment configuration.
 */

import { 
  Assessment,
  Question, 
  AssessmentQuestion,
  AssessmentParticipation,
  Submission,
  AssessmentType,
  AssessmentStatus,
  QuestionType,
  Difficulty,
  ParticipationStatus
} from '@prisma/client';

// ============================================================================
// ASSESSMENT CORE TYPES
// ============================================================================

export interface CreateAssessmentRequest {
  title: string;
  description?: string;
  type: AssessmentType;
  timeLimit?: number; // in minutes
  scheduledAt?: Date;
  startsAt?: Date;
  endsAt?: Date;
  settings: AssessmentSettings;
  questionIds?: string[];
}

export interface UpdateAssessmentRequest {
  title?: string;
  description?: string;
  type?: AssessmentType;
  timeLimit?: number;
  scheduledAt?: Date;
  startsAt?: Date;
  endsAt?: Date;
  settings?: Partial<AssessmentSettings>;
  status?: AssessmentStatus;
}

export interface AssessmentSettings {
  // General settings
  allowRetakes: boolean;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  
  // Timing settings
  timeWarningAt: number; // minutes before time expires
  autoSubmit: boolean;
  
  // Proctoring settings
  proctoring: {
    enabled: boolean;
    videoRequired: boolean;
    audioRequired: boolean;
    screenRecording: boolean;
    tabSwitchDetection: boolean;
    faceDetection: boolean;
  };
  
  // Collaboration settings
  collaboration: {
    enabled: boolean;
    maxParticipants: number;
    allowChat: boolean;
    allowScreenShare: boolean;
  };
  
  // Access control
  accessControl: {
    ipWhitelist: string[];
    requireSecureBrowser: boolean;
    blockCopyPaste: boolean;
  };
}

export interface AssessmentWithDetails extends Assessment {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  questions: (AssessmentQuestion & {
    question: Question;
  })[];
  participations: AssessmentParticipation[];
  _count: {
    participations: number;
    questions: number;
  };
}

// ============================================================================
// QUESTION TYPES
// ============================================================================

export interface CreateQuestionRequest {
  title: string;
  description: string;
  type: QuestionType;
  difficulty: Difficulty;
  tags: string[];
  content: QuestionContent;
  metadata?: QuestionMetadata;
}

export interface UpdateQuestionRequest {
  title?: string;
  description?: string;
  type?: QuestionType;
  difficulty?: Difficulty;
  tags?: string[];
  content?: Partial<QuestionContent>;
  metadata?: Partial<QuestionMetadata>;
  isActive?: boolean;
}

export interface QuestionContent {
  // Common fields
  prompt: string;
  hints?: string[];
  explanation?: string;
  
  // Question-type specific content
  coding?: CodingQuestionContent;
  multipleChoice?: MultipleChoiceQuestionContent;
  systemDesign?: SystemDesignQuestionContent;
  database?: DatabaseQuestionContent;
}

export interface CodingQuestionContent {
  starterCode: Record<string, string>; // language -> starter code
  solutionCode: Record<string, string>; // language -> solution code
  testCases: TestCase[];
  constraints: string[];
  examples: CodeExample[];
  allowedLanguages: string[];
  timeLimit: number; // in seconds
  memoryLimit: number; // in MB
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
  isHidden: boolean;
  points: number;
}

export interface CodeExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface MultipleChoiceQuestionContent {
  options: MCQOption[];
  correctAnswers: string[]; // option IDs
  allowMultipleSelection: boolean;
  randomizeOptions: boolean;
}

export interface MCQOption {
  id: string;
  text: string;
  explanation?: string;
}

export interface SystemDesignQuestionContent {
  requirements: string[];
  constraints: string[];
  evaluationCriteria: string[];
  timeLimit: number; // in minutes
  allowDiagrams: boolean;
  referenceResources: string[];
}

export interface DatabaseQuestionContent {
  schema: DatabaseSchema;
  sampleData?: Record<string, any[]>;
  expectedResult?: any[];
  allowedOperations: DatabaseOperation[];
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
  relationships: DatabaseRelationship[];
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface DatabaseRelationship {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
}

export type DatabaseOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER';

export interface QuestionMetadata {
  difficulty_score: number; // 0-1000
  estimated_time: number; // in minutes
  success_rate: number; // 0-1
  tags_confidence: Record<string, number>;
  created_by: string;
  reviewed_by?: string;
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  version: number;
}

// ============================================================================
// ASSESSMENT PARTICIPATION TYPES
// ============================================================================

export interface StartAssessmentRequest {
  assessmentId: string;
  candidateId: string;
  settings?: Partial<ParticipationSettings>;
}

export interface ParticipationSettings {
  allowPause: boolean;
  showTimer: boolean;
  showProgress: boolean;
  enableAutosave: boolean;
  autosaveInterval: number; // in seconds
}

export interface AssessmentSession {
  id: string;
  assessmentId: string;
  candidateId: string;
  status: ParticipationStatus;
  startedAt: Date;
  expiresAt: Date;
  timeRemaining: number; // in seconds
  currentQuestionIndex: number;
  progress: SessionProgress;
  settings: ParticipationSettings;
}

export interface SessionProgress {
  totalQuestions: number;
  answeredQuestions: number;
  currentQuestion: number;
  timeSpent: number; // in seconds
  questionsStatus: QuestionStatus[];
}

export interface QuestionStatus {
  questionId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ANSWERED' | 'FLAGGED';
  timeSpent: number;
  attempts: number;
  lastAnsweredAt?: Date;
}

// ============================================================================
// SUBMISSION TYPES
// ============================================================================

export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  answer: AnswerSubmission;
  isFinal: boolean;
}

export interface AnswerSubmission {
  type: QuestionType;
  content: AnswerContent;
  timeSpent: number; // in seconds
  metadata?: SubmissionMetadata;
}

export interface AnswerContent {
  // Common fields
  timestamp: Date;
  
  // Type-specific content
  coding?: CodingAnswer;
  multipleChoice?: MultipleChoiceAnswer;
  systemDesign?: SystemDesignAnswer;
  database?: DatabaseAnswer;
}

export interface CodingAnswer {
  code: Record<string, string>; // language -> code
  language: string;
  testResults?: TestResult[];
  executionLog?: ExecutionLog[];
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  output: string;
  expectedOutput: string;
  executionTime: number;
  memoryUsage: number;
  error?: string;
}

export interface ExecutionLog {
  timestamp: Date;
  type: 'COMPILE' | 'EXECUTE' | 'TEST';
  message: string;
  success: boolean;
}

export interface MultipleChoiceAnswer {
  selectedOptions: string[];
  confidence?: number; // 0-1
}

export interface SystemDesignAnswer {
  textAnswer: string;
  diagrams?: SystemDesignDiagram[];
  components?: SystemComponent[];
}

export interface SystemDesignDiagram {
  id: string;
  type: 'ARCHITECTURE' | 'DATABASE' | 'FLOW' | 'SEQUENCE';
  content: string; // JSON or base64 image
  description?: string;
}

export interface SystemComponent {
  id: string;
  name: string;
  type: string;
  description: string;
  properties: Record<string, any>;
}

export interface DatabaseAnswer {
  query: string;
  explanation?: string;
  results?: any[];
}

export interface SubmissionMetadata {
  browser: string;
  os: string;
  screenSize: { width: number; height: number };
  keypressCount: number;
  mouseClickCount: number;
  focusLostCount: number;
  pasteAttempts: number;
  codeEditHistory?: CodeEdit[];
}

export interface CodeEdit {
  timestamp: Date;
  action: 'INSERT' | 'DELETE' | 'REPLACE';
  position: { line: number; column: number };
  text: string;
}

// ============================================================================
// ASSESSMENT RESULTS TYPES
// ============================================================================

export interface AssessmentResult {
  participationId: string;
  assessmentId: string;
  candidateId: string;
  overallScore: number; // 0-100
  status: ParticipationStatus;
  startedAt: Date;
  completedAt: Date;
  totalTimeSpent: number; // in seconds
  questionResults: QuestionResult[];
  analytics: ResultAnalytics;
  integrity: IntegrityReport;
}

export interface QuestionResult {
  questionId: string;
  questionType: QuestionType;
  score: number; // 0-100
  maxScore: number;
  timeSpent: number;
  attempts: number;
  status: 'CORRECT' | 'PARTIAL' | 'INCORRECT' | 'NOT_ATTEMPTED';
  feedback?: string;
  details: QuestionResultDetails;
}

export interface QuestionResultDetails {
  coding?: CodingResultDetails;
  multipleChoice?: MCQResultDetails;
  systemDesign?: SystemDesignResultDetails;
  database?: DatabaseResultDetails;
}

export interface CodingResultDetails {
  testCasesPassed: number;
  totalTestCases: number;
  executionTime: number;
  memoryUsage: number;
  codeQuality: CodeQualityMetrics;
  approach: string;
}

export interface CodeQualityMetrics {
  complexity: number;
  maintainability: number;
  readability: number;
  efficiency: number;
}

export interface MCQResultDetails {
  correctSelections: number;
  totalCorrect: number;
  incorrectSelections: number;
  confidence: number;
}

export interface SystemDesignResultDetails {
  criteriaScores: Record<string, number>;
  completeness: number;
  feasibility: number;
  scalability: number;
  reviewerNotes?: string[];
}

export interface DatabaseResultDetails {
  queryCorrectness: number;
  efficiency: number;
  resultAccuracy: number;
  queryComplexity: number;
}

export interface ResultAnalytics {
  timeDistribution: TimeDistribution;
  difficultyAnalysis: DifficultyAnalysis;
  skillAssessment: SkillAssessment;
  behaviorMetrics: BehaviorMetrics;
}

export interface TimeDistribution {
  questionTimes: Record<string, number>;
  averageTimePerQuestion: number;
  timeVariance: number;
  rushingIndicators: string[];
}

export interface DifficultyAnalysis {
  easyQuestions: { attempted: number; correct: number };
  mediumQuestions: { attempted: number; correct: number };
  hardQuestions: { attempted: number; correct: number };
  expertQuestions: { attempted: number; correct: number };
}

export interface SkillAssessment {
  technicalSkills: Record<string, number>; // skill -> score (0-100)
  problemSolving: number;
  codeQuality: number;
  systemThinking: number;
  communicationSkills?: number;
}

export interface BehaviorMetrics {
  focusScore: number; // 0-100
  consistencyScore: number; // 0-100
  persistenceScore: number; // 0-100
  suspiciousActivities: SuspiciousActivity[];
}

export interface SuspiciousActivity {
  type: 'TAB_SWITCH' | 'COPY_PASTE' | 'UNUSUAL_TIMING' | 'EXTERNAL_HELP';
  timestamp: Date;
  confidence: number; // 0-1
  description: string;
}

export interface IntegrityReport {
  overallScore: number; // 0-100
  violations: IntegrityViolation[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

export interface IntegrityViolation {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  timestamp: Date;
  description: string;
  evidence?: any;
}

// ============================================================================
// SEARCH AND FILTERING TYPES
// ============================================================================

export interface QuestionSearchCriteria {
  query?: string;
  types?: QuestionType[];
  difficulties?: Difficulty[];
  tags?: string[];
  createdBy?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  isActive?: boolean;
  pagination: PaginationParams;
  sortBy?: QuestionSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AssessmentSearchCriteria {
  query?: string;
  types?: AssessmentType[];
  statuses?: AssessmentStatus[];
  organizationId?: string;
  createdBy?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  pagination: PaginationParams;
  sortBy?: AssessmentSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export type QuestionSortField = 'createdAt' | 'updatedAt' | 'title' | 'difficulty' | 'type';
export type AssessmentSortField = 'createdAt' | 'updatedAt' | 'title' | 'type' | 'status';

export interface SearchResult<T> {
  items: T[];
  pagination: PaginationInfo;
  facets?: SearchFacets;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SearchFacets {
  types?: FacetCount[];
  difficulties?: FacetCount[];
  tags?: FacetCount[];
  statuses?: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum AssessmentErrorCode {
  ASSESSMENT_NOT_FOUND = 'ASSESSMENT_NOT_FOUND',
  ASSESSMENT_NOT_ACTIVE = 'ASSESSMENT_NOT_ACTIVE',
  ASSESSMENT_EXPIRED = 'ASSESSMENT_EXPIRED',
  ASSESSMENT_NOT_STARTED = 'ASSESSMENT_NOT_STARTED',
  ASSESSMENT_ALREADY_COMPLETED = 'ASSESSMENT_ALREADY_COMPLETED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  QUESTION_NOT_FOUND = 'QUESTION_NOT_FOUND',
  INVALID_ANSWER_FORMAT = 'INVALID_ANSWER_FORMAT',
  SUBMISSION_DEADLINE_PASSED = 'SUBMISSION_DEADLINE_PASSED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  MAXIMUM_ATTEMPTS_EXCEEDED = 'MAXIMUM_ATTEMPTS_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export class AssessmentError extends Error {
  constructor(
    public readonly code: AssessmentErrorCode,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AssessmentError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface AssessmentTemplate {
  id: string;
  name: string;
  description: string;
  type: AssessmentType;
  defaultSettings: AssessmentSettings;
  questionTemplates: QuestionTemplate[];
  organizationId?: string;
  isPublic: boolean;
}

export interface QuestionTemplate {
  questionId: string;
  order: number;
  points: number;
  isRequired: boolean;
  settings: Record<string, any>;
}

// Re-export Prisma types for convenience
export {
  Assessment,
  Question,
  AssessmentQuestion,
  AssessmentParticipation,
  Submission,
  AssessmentType,
  AssessmentStatus,
  QuestionType,
  Difficulty,
  ParticipationStatus
};
