/**
 * Assessment Session Management Types
 * Comprehensive type definitions for managing assessment sessions, state tracking, and lifecycle
 */

// ============================================================================
// CORE SESSION TYPES
// ============================================================================

export interface AssessmentSession {
  id: string;
  assessmentId: string;
  candidateId: string;
  status: SessionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date;
  timeSpent: number; // in seconds
  currentQuestionIndex: number;
  totalQuestions: number;
  configuration: SessionConfiguration;
  proctoring?: ProctoringSession;
  metadata: SessionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionConfiguration {
  timeLimit: number; // in seconds
  questionOrder: QuestionOrderType;
  allowBackNavigation: boolean;
  showProgress: boolean;
  showTimer: boolean;
  autoSubmit: boolean;
  randomizeOptions: boolean;
  preventTabSwitch: boolean;
  enableProctoring: boolean;
  maxTabSwitches: number;
  warningThresholds: WarningThresholds;
}

export interface WarningThresholds {
  tabSwitches: number;
  timeRemaining: number; // seconds
  inactivity: number; // seconds
}

export interface SessionMetadata {
  browserInfo: BrowserInfo;
  deviceInfo: DeviceInfo;
  location?: LocationInfo;
  ipAddress: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
}

export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
}

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  os: string;
  osVersion: string;
}

export interface LocationInfo {
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// SESSION STATE MANAGEMENT
// ============================================================================

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  CANCELLED = 'CANCELLED'
}

export enum QuestionOrderType {
  SEQUENTIAL = 'SEQUENTIAL',
  RANDOM = 'RANDOM',
  ADAPTIVE = 'ADAPTIVE'
}

export interface SessionStateUpdate {
  sessionId: string;
  status?: SessionStatus;
  currentQuestionIndex?: number;
  timeSpent?: number;
  lastActivity?: Date;
  metadata?: Partial<SessionMetadata>;
}

export interface SessionProgress {
  sessionId: string;
  totalQuestions: number;
  currentQuestion: number;
  answered: number;
  skipped: number;
  flagged: number;
  timeSpent: number;
  timeRemaining: number;
  progressPercentage: number;
}

// ============================================================================
// QUESTION NAVIGATION
// ============================================================================

export interface QuestionNavigation {
  sessionId: string;
  questionId: string;
  questionIndex: number;
  direction: NavigationDirection;
  timestamp: Date;
  timeSpentOnPrevious?: number;
}

export enum NavigationDirection {
  NEXT = 'NEXT',
  PREVIOUS = 'PREVIOUS',
  JUMP = 'JUMP',
  FIRST = 'FIRST',
  LAST = 'LAST'
}

export interface NavigationState {
  canGoNext: boolean;
  canGoPrevious: boolean;
  canJumpTo: boolean;
  availableQuestions: number[];
  currentIndex: number;
  totalQuestions: number;
}

// ============================================================================
// ANSWER SUBMISSION
// ============================================================================

export interface AnswerSubmission {
  id: string;
  sessionId: string;
  questionId: string;
  questionType: QuestionType;
  answer: AnswerData;
  isCorrect?: boolean;
  score?: number;
  maxScore: number;
  timeSpent: number;
  submittedAt: Date;
  metadata: SubmissionMetadata;
}

export interface AnswerData {
  // Multiple Choice
  selectedOptions?: string[];
  
  // Coding Questions
  code?: string;
  language?: string;
  testResults?: TestResult[];
  
  // System Design
  diagram?: string;
  explanation?: string;
  components?: SystemComponent[];
  
  // Database
  query?: string;
  schema?: string;
  
  // Algorithm
  algorithm?: string;
  complexity?: ComplexityAnalysis;
  
  // Common fields
  confidence?: number; // 1-5 scale
  timeToFirstEdit?: number;
  editCount?: number;
  finalAnswer?: string;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  input: any;
  expectedOutput: any;
  actualOutput: any;
  executionTime: number;
  memoryUsed: number;
  error?: string;
}

export interface SystemComponent {
  id: string;
  name: string;
  type: 'service' | 'database' | 'cache' | 'queue' | 'api';
  description: string;
  connections: string[];
}

export interface ComplexityAnalysis {
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
}

export interface SubmissionMetadata {
  attemptCount: number;
  autoSaved: boolean;
  flagged: boolean;
  difficulty: DifficultyLevel;
  hints: HintUsage[];
  codingMetrics?: CodingMetrics;
}

export interface HintUsage {
  hintId: string;
  requestedAt: Date;
  timePenalty: number;
}

export interface CodingMetrics {
  keystrokeCount: number;
  pasteCount: number;
  undoCount: number;
  redoCount: number;
  linesOfCode: number;
  charactersTyped: number;
  averageWPM: number;
  codingPatterns: string[];
}

// ============================================================================
// PROCTORING INTEGRATION
// ============================================================================

export interface ProctoringSession {
  id: string;
  sessionId: string;
  status: ProctoringStatus;
  violations: ProctoringViolation[];
  recordings: ProctoringRecording[];
  settings: ProctoringSettings;
  startedAt: Date;
  endedAt?: Date;
}

export enum ProctoringStatus {
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface ProctoringViolation {
  id: string;
  type: ViolationType;
  severity: ViolationSeverity;
  description: string;
  timestamp: Date;
  evidence?: string; // Base64 image or video URL
  autoDetected: boolean;
  resolved: boolean;
}

export enum ViolationType {
  MULTIPLE_FACES = 'MULTIPLE_FACES',
  NO_FACE = 'NO_FACE',
  LOOKING_AWAY = 'LOOKING_AWAY',
  TAB_SWITCH = 'TAB_SWITCH',
  WINDOW_FOCUS_LOST = 'WINDOW_FOCUS_LOST',
  COPY_PASTE = 'COPY_PASTE',
  UNAUTHORIZED_APPLICATION = 'UNAUTHORIZED_APPLICATION',
  AUDIO_DETECTED = 'AUDIO_DETECTED',
  MOBILE_PHONE = 'MOBILE_PHONE',
  SUSPICIOUS_BEHAVIOR = 'SUSPICIOUS_BEHAVIOR'
}

export enum ViolationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ProctoringRecording {
  id: string;
  type: 'video' | 'audio' | 'screen';
  url: string;
  startTime: number;
  duration: number;
  fileSize: number;
}

export interface ProctoringSettings {
  enableVideo: boolean;
  enableAudio: boolean;
  enableScreen: boolean;
  faceDetection: boolean;
  eyeTracking: boolean;
  keystrokeAnalysis: boolean;
  environmentScan: boolean;
  recordingQuality: 'low' | 'medium' | 'high';
}

// ============================================================================
// SESSION ANALYTICS
// ============================================================================

export interface SessionAnalytics {
  sessionId: string;
  performanceMetrics: PerformanceMetrics;
  behaviorMetrics: BehaviorMetrics;
  timeMetrics: TimeMetrics;
  difficultyMetrics: DifficultyMetrics;
  proctoringMetrics?: ProctoringMetrics;
  generatedAt: Date;
}

export interface PerformanceMetrics {
  totalScore: number;
  maxPossibleScore: number;
  accuracy: number; // percentage
  questionsAttempted: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsSkipped: number;
  averageTimePerQuestion: number;
  consistencyScore: number;
}

export interface BehaviorMetrics {
  tabSwitches: number;
  windowFocusLost: number;
  copiesMade: number;
  pastesMade: number;
  hintsUsed: number;
  questionsRevisited: number;
  totalKeypresses: number;
  averageWPM: number;
  pauseFrequency: number;
  rushingIndicator: number; // 0-1 scale
}

export interface TimeMetrics {
  totalTimeSpent: number;
  timePerQuestionType: Record<QuestionType, number>;
  timeDistribution: TimeDistribution;
  submissionTiming: SubmissionTiming[];
}

export interface TimeDistribution {
  planning: number; // percentage
  implementation: number; // percentage
  review: number; // percentage
  idle: number; // percentage
}

export interface SubmissionTiming {
  questionId: string;
  timeToFirstEdit: number;
  timeToSubmission: number;
  editingTime: number;
  reviewTime: number;
}

export interface DifficultyMetrics {
  easy: QuestionPerformance;
  medium: QuestionPerformance;
  hard: QuestionPerformance;
  adaptiveProgression: number;
}

export interface QuestionPerformance {
  attempted: number;
  correct: number;
  averageTime: number;
  accuracy: number;
}

export interface ProctoringMetrics {
  violationCount: number;
  violationsByType: Record<ViolationType, number>;
  violationsBySeverity: Record<ViolationSeverity, number>;
  monitoringUptime: number; // percentage
  averageEngagement: number; // percentage
}

// ============================================================================
// API INTERFACES
// ============================================================================

export interface CreateSessionRequest {
  assessmentId: string;
  candidateId: string;
  configuration: Partial<SessionConfiguration>;
  scheduledFor?: Date;
  expiresAt?: Date;
  metadata?: Partial<SessionMetadata>;
}

export interface UpdateSessionRequest {
  status?: SessionStatus;
  configuration?: Partial<SessionConfiguration>;
  currentQuestionIndex?: number;
  metadata?: Partial<SessionMetadata>;
}

export interface SessionListQuery {
  assessmentId?: string;
  candidateId?: string;
  status?: SessionStatus[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'startedAt' | 'completedAt' | 'timeSpent' | 'score';
  sortOrder?: 'asc' | 'desc';
}

export interface SubmitAnswerRequest {
  questionId: string;
  answer: AnswerData;
  timeSpent: number;
  flagged?: boolean;
  confidence?: number;
}

export interface NavigateRequest {
  direction: NavigationDirection;
  targetIndex?: number;
  saveCurrentAnswer?: boolean;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export enum SessionErrorCode {
  // Session Management
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_ALREADY_COMPLETED = 'SESSION_ALREADY_COMPLETED',
  SESSION_NOT_STARTED = 'SESSION_NOT_STARTED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  
  // Navigation
  INVALID_NAVIGATION = 'INVALID_NAVIGATION',
  NAVIGATION_NOT_ALLOWED = 'NAVIGATION_NOT_ALLOWED',
  QUESTION_INDEX_OUT_OF_BOUNDS = 'QUESTION_INDEX_OUT_OF_BOUNDS',
  
  // Submission
  ANSWER_ALREADY_SUBMITTED = 'ANSWER_ALREADY_SUBMITTED',
  INVALID_ANSWER_FORMAT = 'INVALID_ANSWER_FORMAT',
  SUBMISSION_TIMEOUT = 'SUBMISSION_TIMEOUT',
  
  // Security
  PROCTORING_VIOLATION = 'PROCTORING_VIOLATION',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SESSION_INTEGRITY_COMPROMISED = 'SESSION_INTEGRITY_COMPROMISED',
  
  // System
  QUESTION_LOADING_FAILED = 'QUESTION_LOADING_FAILED',
  AUTO_SAVE_FAILED = 'AUTO_SAVE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Validation
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_VALUE = 'INVALID_VALUE',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION'
}

export interface SessionError {
  code: SessionErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  questionId?: string;
}

// ============================================================================
// REAL-TIME EVENTS
// ============================================================================

export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  timestamp: Date;
  data: any;
  source: 'client' | 'server' | 'proctor';
}

export enum SessionEventType {
  SESSION_STARTED = 'SESSION_STARTED',
  SESSION_PAUSED = 'SESSION_PAUSED',
  SESSION_RESUMED = 'SESSION_RESUMED',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  
  QUESTION_VIEWED = 'QUESTION_VIEWED',
  QUESTION_ANSWERED = 'QUESTION_ANSWERED',
  QUESTION_FLAGGED = 'QUESTION_FLAGGED',
  
  NAVIGATION_ATTEMPTED = 'NAVIGATION_ATTEMPTED',
  
  TIME_WARNING = 'TIME_WARNING',
  TIME_EXPIRED = 'TIME_EXPIRED',
  
  PROCTORING_VIOLATION = 'PROCTORING_VIOLATION',
  PROCTORING_WARNING = 'PROCTORING_WARNING',
  
  AUTO_SAVE = 'AUTO_SAVE',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type QuestionType = 'CODING' | 'MULTIPLE_CHOICE' | 'SYSTEM_DESIGN' | 'DATABASE' | 'ALGORITHM';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BulkSessionOperation {
  sessionIds: string[];
  operation: 'terminate' | 'extend' | 'reset' | 'export';
  parameters?: Record<string, any>;
}

export interface SessionExport {
  session: AssessmentSession;
  submissions: AnswerSubmission[];
  analytics: SessionAnalytics;
  proctoring?: ProctoringSession;
  exportedAt: Date;
  format: 'json' | 'pdf' | 'csv';
}
