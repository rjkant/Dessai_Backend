/**
 * Code Execution Service Types
 * Comprehensive type definitions for secure code execution and testing
 */

// ============================================================================
// CORE EXECUTION TYPES
// ============================================================================

export interface CodeExecutionRequest {
  id: string;
  sessionId: string;
  questionId: string;
  language: ProgrammingLanguage;
  code: string;
  testCases?: TestCase[] | undefined;
  timeLimit?: number | undefined; // in milliseconds
  memoryLimit?: number | undefined; // in MB
  stdin?: string | undefined;
  arguments?: string[] | undefined;
  environment?: ExecutionEnvironment | undefined;
  metadata?: ExecutionMetadata | undefined;
}

export interface CodeExecutionResult {
  id: string;
  success: boolean;
  executionTime: number; // in milliseconds
  memoryUsed: number; // in MB
  exitCode: number;
  stdout: string;
  stderr: string;
  testResults?: TestCaseResult[] | undefined;
  compilationOutput?: CompilationResult | undefined;
  securityViolations?: SecurityViolation[] | undefined;
  performance?: PerformanceMetrics | undefined;
  createdAt: Date;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description?: string;
  points: number;
  isHidden: boolean;
  timeLimit?: number;
  memoryLimit?: number;
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  executionTime: number;
  memoryUsed: number;
  error?: string;
  points: number;
  maxPoints: number;
}

// ============================================================================
// PROGRAMMING LANGUAGES
// ============================================================================

export enum ProgrammingLanguage {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  CSHARP = 'csharp',
  GO = 'go',
  RUST = 'rust',
  RUBY = 'ruby',
  PHP = 'php',
  KOTLIN = 'kotlin',
  SWIFT = 'swift',
  SCALA = 'scala',
  SQL = 'sql'
}

export interface LanguageConfig {
  language: ProgrammingLanguage;
  version: string;
  compileCommand?: string;
  runCommand: string;
  fileExtension: string;
  dockerImage: string;
  defaultTimeLimit: number; // milliseconds
  defaultMemoryLimit: number; // MB
  maxFileSize: number; // bytes
  supportedFeatures: LanguageFeature[];
  securityRestrictions: SecurityRestriction[];
}

export enum LanguageFeature {
  COMPILATION = 'compilation',
  INTERPRETATION = 'interpretation',
  PACKAGE_MANAGEMENT = 'package_management',
  TESTING_FRAMEWORK = 'testing_framework',
  DEBUGGING = 'debugging',
  PROFILING = 'profiling'
}

export interface SecurityRestriction {
  type: SecurityRestrictionType;
  description: string;
  enforced: boolean;
}

export enum SecurityRestrictionType {
  NETWORK_ACCESS = 'network_access',
  FILE_SYSTEM_ACCESS = 'file_system_access',
  PROCESS_CREATION = 'process_creation',
  SYSTEM_CALLS = 'system_calls',
  MEMORY_ALLOCATION = 'memory_allocation',
  EXECUTION_TIME = 'execution_time'
}

// ============================================================================
// EXECUTION ENVIRONMENT
// ============================================================================

export interface ExecutionEnvironment {
  containerId?: string;
  dockerImage: string;
  workingDirectory: string;
  environmentVariables: Record<string, string>;
  networkIsolation: boolean;
  readOnlyFileSystem: boolean;
  resourceLimits: ResourceLimits;
  securityProfile: SecurityProfile;
}

export interface ResourceLimits {
  cpu: number; // CPU cores
  memory: number; // MB
  disk: number; // MB
  processes: number;
  fileDescriptors: number;
  networkBandwidth?: number; // MB/s
}

export interface SecurityProfile {
  appArmor?: boolean;
  seccomp?: boolean;
  capabilities: string[];
  dropCapabilities: string[];
  noNewPrivileges: boolean;
  readOnlyRootFilesystem: boolean;
}

// ============================================================================
// COMPILATION & EXECUTION
// ============================================================================

export interface CompilationResult {
  success: boolean;
  output: string;
  errors: string;
  warnings: string;
  executionTime: number;
  compiledFile?: string;
  dependencies?: string[];
}

export interface ExecutionMetadata {
  submittedAt: Date;
  candidateId: string;
  ipAddress: string;
  userAgent: string;
  attempt: number;
  codeHash: string;
  previousAttempts?: string[];
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  compilationTime: number;
  testExecutionTime: number;
  averageTestTime: number;
  memoryPeak: number;
  memoryAverage: number;
  cpuUsage: number;
  diskUsage: number;
  networkUsage?: number;
}

// ============================================================================
// SECURITY & MONITORING
// ============================================================================

export interface SecurityViolation {
  type: SecurityViolationType;
  severity: ViolationSeverity;
  description: string;
  timestamp: Date;
  details: Record<string, any>;
  action: SecurityAction;
}

export enum SecurityViolationType {
  UNAUTHORIZED_SYSCALL = 'unauthorized_syscall',
  NETWORK_ATTEMPT = 'network_attempt',
  FILE_ACCESS_VIOLATION = 'file_access_violation',
  MEMORY_LIMIT_EXCEEDED = 'memory_limit_exceeded',
  TIME_LIMIT_EXCEEDED = 'time_limit_exceeded',
  PROCESS_LIMIT_EXCEEDED = 'process_limit_exceeded',
  MALICIOUS_CODE_DETECTED = 'malicious_code_detected',
  RESOURCE_EXHAUSTION = 'resource_exhaustion'
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum SecurityAction {
  LOG = 'log',
  WARN = 'warn',
  TERMINATE = 'terminate',
  BLOCK = 'block'
}

// ============================================================================
// CODE ANALYSIS
// ============================================================================

export interface CodeAnalysis {
  codeMetrics: CodeMetrics;
  qualityScore: number;
  suggestions: CodeSuggestion[];
  complexity: ComplexityAnalysis;
  style: StyleAnalysis;
  security: SecurityAnalysis;
  performance: PerformanceAnalysis;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number; // minutes
  testCoverage?: number; // percentage
  duplicatedLines: number;
  codeSmells: number;
}

export interface CodeSuggestion {
  type: SuggestionType;
  severity: SuggestionSeverity;
  line: number;
  column: number;
  message: string;
  suggestion: string;
  autoFixAvailable: boolean;
}

export enum SuggestionType {
  PERFORMANCE = 'performance',
  READABILITY = 'readability',
  MAINTAINABILITY = 'maintainability',
  BEST_PRACTICE = 'best_practice',
  BUG_RISK = 'bug_risk',
  SECURITY = 'security'
}

export enum SuggestionSeverity {
  INFO = 'info',
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical'
}

export interface ComplexityAnalysis {
  timeComplexity: string;
  spaceComplexity: string;
  worstCase: string;
  averageCase: string;
  bestCase: string;
  confidence: number; // 0-1
  explanation: string;
}

export interface StyleAnalysis {
  conformsToStandard: boolean;
  standard: string;
  violations: StyleViolation[];
  score: number; // 0-100
}

export interface StyleViolation {
  rule: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  riskScore: number; // 0-100
  recommendations: string[];
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  line?: number;
  cwe?: string; // Common Weakness Enumeration ID
  fix?: string;
}

export interface PerformanceAnalysis {
  bottlenecks: PerformanceBottleneck[];
  optimizationSuggestions: string[];
  estimatedImprovement: number; // percentage
}

export interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'io' | 'algorithm';
  location: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

// ============================================================================
// EXECUTION QUEUE & MANAGEMENT
// ============================================================================

export interface ExecutionQueue {
  id: string;
  requests: QueuedRequest[];
  processing: ProcessingRequest[];
  completed: CompletedRequest[];
  failed: FailedRequest[];
  statistics: QueueStatistics;
}

export interface QueuedRequest {
  id: string;
  request: CodeExecutionRequest;
  priority: ExecutionPriority;
  queuedAt: Date;
  estimatedWaitTime: number;
}

export interface ProcessingRequest {
  id: string;
  request: CodeExecutionRequest;
  startedAt: Date;
  estimatedCompletion: Date;
  progress: ExecutionProgress;
  containerId: string;
}

export interface CompletedRequest {
  id: string;
  result: CodeExecutionResult;
  completedAt: Date;
  processingTime: number;
}

export interface FailedRequest {
  id: string;
  request: CodeExecutionRequest;
  error: ExecutionError;
  failedAt: Date;
  retryCount: number;
}

export enum ExecutionPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ExecutionProgress {
  stage: ExecutionStage;
  percentage: number;
  currentStep: string;
  estimatedTimeRemaining: number;
}

export enum ExecutionStage {
  QUEUED = 'queued',
  INITIALIZING = 'initializing',
  COMPILING = 'compiling',
  EXECUTING = 'executing',
  TESTING = 'testing',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface QueueStatistics {
  totalRequests: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  successRate: number;
  currentLoad: number; // 0-1
  peakLoad: number;
  activeContainers: number;
  maxContainers: number;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface ExecutionError {
  code: ExecutionErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
  suggestion?: string;
}

export enum ExecutionErrorCode {
  // Compilation Errors
  COMPILATION_FAILED = 'compilation_failed',
  SYNTAX_ERROR = 'syntax_error',
  DEPENDENCY_ERROR = 'dependency_error',
  
  // Runtime Errors
  RUNTIME_ERROR = 'runtime_error',
  TIME_LIMIT_EXCEEDED = 'time_limit_exceeded',
  MEMORY_LIMIT_EXCEEDED = 'memory_limit_exceeded',
  OUTPUT_LIMIT_EXCEEDED = 'output_limit_exceeded',
  
  // Security Errors
  SECURITY_VIOLATION = 'security_violation',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALICIOUS_CODE = 'malicious_code',
  
  // System Errors
  CONTAINER_ERROR = 'container_error',
  NETWORK_ERROR = 'network_error',
  STORAGE_ERROR = 'storage_error',
  RESOURCE_UNAVAILABLE = 'resource_unavailable',
  
  // Validation Errors
  INVALID_CODE = 'invalid_code',
  INVALID_LANGUAGE = 'invalid_language',
  INVALID_TEST_CASE = 'invalid_test_case',
  
  // Queue Errors
  QUEUE_FULL = 'queue_full',
  EXECUTION_TIMEOUT = 'execution_timeout',
  SYSTEM_OVERLOAD = 'system_overload'
}

// ============================================================================
// API INTERFACES
// ============================================================================

export interface ExecuteCodeRequest {
  sessionId: string;
  questionId: string;
  language: ProgrammingLanguage;
  code: string;
  testCases?: TestCase[];
  timeLimit?: number;
  memoryLimit?: number;
  runTests?: boolean;
  analyzeCode?: boolean;
  priority?: ExecutionPriority;
}

export interface ExecuteCodeResponse {
  success: boolean;
  executionId: string;
  result?: CodeExecutionResult;
  analysis?: CodeAnalysis;
  error?: ExecutionError;
  queuePosition?: number;
  estimatedWaitTime?: number;
}

export interface GetExecutionStatusRequest {
  executionId: string;
}

export interface GetExecutionStatusResponse {
  executionId: string;
  status: ExecutionStage;
  progress: ExecutionProgress;
  result?: CodeExecutionResult;
  error?: ExecutionError;
}

export interface ListExecutionsRequest {
  sessionId?: string;
  questionId?: string;
  language?: ProgrammingLanguage;
  status?: ExecutionStage[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface PaginatedExecutionResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BulkExecutionRequest {
  requests: ExecuteCodeRequest[];
  batchId?: string;
  priority?: ExecutionPriority;
}

export interface BulkExecutionResponse {
  batchId: string;
  totalRequests: number;
  successfulSubmissions: number;
  failedSubmissions: number;
  executionIds: string[];
  estimatedCompletionTime: Date;
}
