/**
 * Code Execution Service
 * Secure, scalable code execution with Docker containerization
 */

import Docker = require('dockerode');
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  CodeExecutionRequest,
  CodeExecutionResult,
  ExecuteCodeRequest,
  ExecuteCodeResponse,
  ProgrammingLanguage,
  LanguageConfig,
  ExecutionError,
  ExecutionErrorCode,
  ExecutionStage,
  TestCaseResult,
  CompilationResult,
  SecurityViolation,
  SecurityViolationType,
  ViolationSeverity,
  SecurityAction,
  QueuedRequest,
  ExecutionPriority,
  ExecutionProgress,
} from '../types/execution.types';

export class CodeExecutionService {
  private docker: Docker;
  private executionQueue: Map<string, QueuedRequest> = new Map();
  private processing: Map<string, any> = new Map();
  private languageConfigs: Map<ProgrammingLanguage, LanguageConfig> = new Map();
  private readonly tempDir = '/tmp/dessai-executions';

  constructor() {
    this.docker = new Docker();
    this.initializeLanguageConfigs();
    this.initializeTempDirectory();
  }

  // ============================================================================
  // LANGUAGE CONFIGURATIONS
  // ============================================================================

  private initializeLanguageConfigs(): void {
    // Simplified language configs for compilation
    const createConfig = (
      lang: ProgrammingLanguage,
      ext: string,
      image: string,
      cmd: string
    ): LanguageConfig => ({
      language: lang,
      version: '1.0',
      runCommand: cmd,
      fileExtension: ext,
      dockerImage: image,
      defaultTimeLimit: 10000,
      defaultMemoryLimit: 128,
      maxFileSize: 1024 * 1024,
      supportedFeatures: [] as any,
      securityRestrictions: [] as any,
    });

    this.languageConfigs = new Map([
      [
        ProgrammingLanguage.PYTHON,
        createConfig(ProgrammingLanguage.PYTHON, '.py', 'python:3.11-alpine', 'python main.py'),
      ],
      [
        ProgrammingLanguage.JAVASCRIPT,
        createConfig(ProgrammingLanguage.JAVASCRIPT, '.js', 'node:18-alpine', 'node main.js'),
      ],
      [
        ProgrammingLanguage.TYPESCRIPT,
        {
          ...createConfig(
            ProgrammingLanguage.TYPESCRIPT,
            '.ts',
            'node:18-alpine',
            'node dist/main.js'
          ),
          compileCommand: 'tsc main.ts --outDir ./dist',
        },
      ],
      [
        ProgrammingLanguage.JAVA,
        {
          ...createConfig(ProgrammingLanguage.JAVA, '.java', 'openjdk:17-alpine', 'java Main'),
          compileCommand: 'javac Main.java',
        },
      ],
      [
        ProgrammingLanguage.CPP,
        {
          ...createConfig(ProgrammingLanguage.CPP, '.cpp', 'gcc:latest', './main'),
          compileCommand: 'g++ -o main main.cpp',
        },
      ],
    ]);
  }

  // ============================================================================
  // MAIN EXECUTION METHODS
  // ============================================================================

  public async executeCode(request: ExecuteCodeRequest): Promise<ExecuteCodeResponse> {
    try {
      // Validate request
      this.validateExecutionRequest(request);

      // Create execution request
      const executionRequest = this.createExecutionRequest(request);

      // Check queue capacity
      if (this.executionQueue.size >= 100) {
        // Max queue size
        return {
          success: false,
          executionId: '',
          error: {
            code: ExecutionErrorCode.QUEUE_FULL,
            message: 'Execution queue is full. Please try again later.',
            timestamp: new Date(),
            recoverable: true,
            suggestion: 'Wait a few minutes and retry the request.',
          },
        };
      }

      // Add to queue or execute immediately
      if (this.processing.size < 5) {
        // Max concurrent executions
        return await this.executeImmediately(executionRequest);
      } else {
        return this.queueExecution(executionRequest, request.priority || ExecutionPriority.NORMAL);
      }
    } catch (error) {
      return {
        success: false,
        executionId: '',
        error: this.createExecutionError(error, ExecutionErrorCode.RUNTIME_ERROR),
      };
    }
  }

  private async executeImmediately(request: CodeExecutionRequest): Promise<ExecuteCodeResponse> {
    const executionId = request.id;

    try {
      // Mark as processing
      this.processing.set(executionId, {
        request,
        startedAt: new Date(),
        stage: ExecutionStage.INITIALIZING,
      });

      // Execute the code
      const result = await this.performExecution(request);

      // Remove from processing
      this.processing.delete(executionId);

      return {
        success: true,
        executionId,
        result,
      };
    } catch (error) {
      this.processing.delete(executionId);
      return {
        success: false,
        executionId,
        error: this.createExecutionError(error, ExecutionErrorCode.RUNTIME_ERROR),
      };
    }
  }

  private queueExecution(
    request: CodeExecutionRequest,
    priority: ExecutionPriority
  ): ExecuteCodeResponse {
    const queuedRequest: QueuedRequest = {
      id: request.id,
      request,
      priority,
      queuedAt: new Date(),
      estimatedWaitTime: this.calculateEstimatedWaitTime(),
    };

    this.executionQueue.set(request.id, queuedRequest);

    return {
      success: true,
      executionId: request.id,
      queuePosition: this.getQueuePosition(request.id),
      estimatedWaitTime: queuedRequest.estimatedWaitTime,
    };
  }

  // ============================================================================
  // CORE EXECUTION LOGIC
  // ============================================================================

  private async performExecution(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const languageConfig = this.languageConfigs.get(request.language);

    if (!languageConfig) {
      throw new Error(`Unsupported language: ${request.language}`);
    }

    // Create container and execution environment
    const containerId = await this.createContainer(request, languageConfig);
    const workDir = await this.setupWorkingDirectory(request);

    try {
      // Write code to file
      await this.writeCodeToFile(request.code, workDir, languageConfig);

      // Compile if necessary
      let compilationResult: CompilationResult | undefined;
      if (languageConfig.compileCommand) {
        compilationResult = await this.compileCode(containerId, languageConfig);
        if (!compilationResult.success) {
          return this.createFailedResult(request.id, compilationResult.errors, startTime);
        }
      }

      // Execute code
      const executionResult = await this.runCode(containerId, request, languageConfig);

      // Run tests if provided
      let testResults: TestCaseResult[] | undefined;
      if (request.testCases && request.testCases.length > 0) {
        testResults = await this.runTestCases(containerId, request, languageConfig);
      }

      // Check for security violations
      const securityViolations = await this.checkSecurityViolations(executionResult, request);

      const result: CodeExecutionResult = {
        id: request.id,
        success: executionResult.exitCode === 0,
        executionTime: Date.now() - startTime,
        memoryUsed: executionResult.memoryUsed || 0,
        exitCode: executionResult.exitCode,
        stdout: executionResult.stdout,
        stderr: executionResult.stderr,
        testResults: testResults || undefined,
        compilationOutput: compilationResult || undefined,
        securityViolations,
        createdAt: new Date(),
      };

      return result;
    } finally {
      // Cleanup
      await this.cleanup(containerId, workDir);
    }
  }

  // ============================================================================
  // CONTAINER MANAGEMENT
  // ============================================================================

  private async createContainer(
    request: CodeExecutionRequest,
    config: LanguageConfig
  ): Promise<string> {
    const containerConfig = {
      Image: config.dockerImage,
      WorkingDir: '/workspace',
      NetworkMode: 'none', // No network access
      HostConfig: {
        Memory: (request.memoryLimit || config.defaultMemoryLimit) * 1024 * 1024, // Convert MB to bytes
        CpuQuota: 50000, // 50% CPU
        CpuPeriod: 100000,
        PidsLimit: 50, // Limit number of processes
        ReadonlyRootfs: false,
        Tmpfs: {
          '/tmp': 'rw,noexec,nosuid,size=10m',
        },
        SecurityOpt: [
          'no-new-privileges:true',
          'apparmor:unconfined', // TODO: Create custom AppArmor profile
        ],
      },
      Env: ['HOME=/workspace', 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
    };

    const container = await this.docker.createContainer(containerConfig);
    await container.start();

    return container.id;
  }

  private async setupWorkingDirectory(request: CodeExecutionRequest): Promise<string> {
    const workDir = path.join(this.tempDir, request.id);
    await fs.mkdir(workDir, { recursive: true });
    return workDir;
  }

  private async writeCodeToFile(
    code: string,
    workDir: string,
    config: LanguageConfig
  ): Promise<void> {
    const fileName = this.getMainFileName(config);
    const filePath = path.join(workDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');
  }

  private getMainFileName(config: LanguageConfig): string {
    switch (config.language) {
      case ProgrammingLanguage.JAVA:
        return 'Main.java';
      default:
        return `main${config.fileExtension}`;
    }
  }

  // ============================================================================
  // COMPILATION & EXECUTION
  // ============================================================================

  private async compileCode(
    containerId: string,
    config: LanguageConfig
  ): Promise<CompilationResult> {
    if (!config.compileCommand) {
      return { success: true, output: '', errors: '', warnings: '', executionTime: 0 };
    }

    const startTime = Date.now();

    try {
      const container = this.docker.getContainer(containerId);

      const exec = await container.exec({
        Cmd: ['sh', '-c', config.compileCommand],
        WorkingDir: '/workspace',
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({});
      const output = await this.streamToString(stream);

      const inspect = await exec.inspect();
      const success = inspect.ExitCode === 0;

      return {
        success,
        output: success ? output : '',
        errors: success ? '' : output,
        warnings: '',
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: error instanceof Error ? error.message : 'Compilation failed',
        warnings: '',
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async runCode(
    containerId: string,
    request: CodeExecutionRequest,
    config: LanguageConfig
  ): Promise<any> {
    const container = this.docker.getContainer(containerId);
    const timeLimit = request.timeLimit || config.defaultTimeLimit;

    const exec = await container.exec({
      Cmd: ['sh', '-c', config.runCommand],
      WorkingDir: '/workspace',
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: !!request.stdin,
    });

    const stream = await exec.start({});

    // Set timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Time limit exceeded')), timeLimit);
    });

    try {
      const resultPromise = this.executeWithInput(stream, request.stdin);
      const output = await Promise.race([resultPromise, timeoutPromise]);

      const inspect = await exec.inspect();

      return {
        exitCode: inspect.ExitCode || 0,
        stdout: (output as { stdout: string; stderr: string }).stdout,
        stderr: (output as { stdout: string; stderr: string }).stderr,
        memoryUsed: 0, // TODO: Get actual memory usage from container stats
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Time limit exceeded') {
        // Kill the execution
        await container.kill();
        throw new Error('Execution time limit exceeded');
      }
      throw error;
    }
  }

  private async executeWithInput(
    stream: any,
    stdin?: string
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      stream.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        // Docker multiplexes stdout/stderr in the stream
        // First byte indicates the stream type
        if (chunk[0] === 1) {
          stdout += data.slice(8); // Remove header
        } else if (chunk[0] === 2) {
          stderr += data.slice(8); // Remove header
        }
      });

      stream.on('end', () => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      });

      stream.on('error', reject);

      // Send stdin if provided
      if (stdin) {
        stream.write(stdin);
      }
    });
  }

  // ============================================================================
  // TEST EXECUTION
  // ============================================================================

  private async runTestCases(
    containerId: string,
    request: CodeExecutionRequest,
    config: LanguageConfig
  ): Promise<TestCaseResult[]> {
    const results: TestCaseResult[] = [];

    for (const testCase of request.testCases || []) {
      try {
        const testResult = await this.runSingleTestCase(
          containerId,
          testCase,
          config,
          request.code
        );
        results.push(testResult);
      } catch (error) {
        results.push({
          testCaseId: testCase.id,
          passed: false,
          actualOutput: '',
          expectedOutput: testCase.expectedOutput,
          executionTime: 0,
          memoryUsed: 0,
          error: error instanceof Error ? error.message : 'Test execution failed',
          points: 0,
          maxPoints: testCase.points,
        });
      }
    }

    return results;
  }

  private async runSingleTestCase(
    containerId: string,
    testCase: any,
    config: LanguageConfig,
    code: string
  ): Promise<TestCaseResult> {
    const startTime = Date.now();

    // Create a modified request with test input
    const testRequest = {
      language: config.language,
      code,
      stdin: testCase.input,
      timeLimit: testCase.timeLimit || config.defaultTimeLimit,
    };

    const result = await this.runCode(containerId, testRequest as CodeExecutionRequest, config);
    const executionTime = Date.now() - startTime;

    const actualOutput = result.stdout.trim();
    const expectedOutput = testCase.expectedOutput.trim();
    const passed = actualOutput === expectedOutput;

    return {
      testCaseId: testCase.id,
      passed,
      actualOutput,
      expectedOutput,
      executionTime,
      memoryUsed: result.memoryUsed || 0,
      points: passed ? testCase.points : 0,
      maxPoints: testCase.points,
    };
  }

  // ============================================================================
  // SECURITY & MONITORING
  // ============================================================================

  private async checkSecurityViolations(
    executionResult: any,
    request: CodeExecutionRequest
  ): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    // Check for time limit violations
    if (executionResult.executionTime > (request.timeLimit || 30000)) {
      violations.push({
        type: SecurityViolationType.TIME_LIMIT_EXCEEDED,
        severity: ViolationSeverity.HIGH,
        description: 'Execution time exceeded the allowed limit',
        timestamp: new Date(),
        details: { timeLimit: request.timeLimit, actualTime: executionResult.executionTime },
        action: SecurityAction.TERMINATE,
      });
    }

    // Check for suspicious patterns in code
    const suspiciousPatterns = [
      /import\s+os/,
      /import\s+subprocess/,
      /import\s+socket/,
      /require\(['"]fs['"]\)/,
      /require\(['"]net['"]\)/,
      /require\(['"]child_process['"]\)/,
      /#include\s*<sys\//,
      /system\s*\(/,
      /exec\s*\(/,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(request.code)) {
        violations.push({
          type: SecurityViolationType.MALICIOUS_CODE_DETECTED,
          severity: ViolationSeverity.MEDIUM,
          description: `Suspicious pattern detected: ${pattern.source}`,
          timestamp: new Date(),
          details: { pattern: pattern.source },
          action: SecurityAction.LOG,
        });
      }
    }

    return violations;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private validateExecutionRequest(request: ExecuteCodeRequest): void {
    if (!request.code || request.code.trim().length === 0) {
      throw new Error('Code cannot be empty');
    }

    if (!Object.values(ProgrammingLanguage).includes(request.language)) {
      throw new Error(`Unsupported programming language: ${request.language}`);
    }

    const config = this.languageConfigs.get(request.language);
    if (!config) {
      throw new Error(`Configuration not found for language: ${request.language}`);
    }

    if (request.code.length > config.maxFileSize) {
      throw new Error(`Code size exceeds limit of ${config.maxFileSize} bytes`);
    }
  }

  private createExecutionRequest(request: ExecuteCodeRequest): CodeExecutionRequest {
    return {
      id: randomUUID(),
      sessionId: request.sessionId,
      questionId: request.questionId,
      language: request.language,
      code: request.code,
      testCases: request.testCases || [],
      timeLimit: request.timeLimit,
      memoryLimit: request.memoryLimit,
      metadata: {
        submittedAt: new Date(),
        candidateId: request.sessionId, // Assuming sessionId contains candidate info
        ipAddress: '', // TODO: Get from request context
        userAgent: '', // TODO: Get from request context
        attempt: 1,
        codeHash: createHash('sha256').update(request.code).digest('hex'),
      },
    };
  }

  private createExecutionError(error: any, code: ExecutionErrorCode): ExecutionError {
    return {
      code,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date(),
      recoverable: code !== ExecutionErrorCode.SECURITY_VIOLATION,
      suggestion: this.getErrorSuggestion(code),
    };
  }

  private getErrorSuggestion(code: ExecutionErrorCode): string {
    switch (code) {
      case ExecutionErrorCode.COMPILATION_FAILED:
        return 'Check your syntax and ensure all variables are declared';
      case ExecutionErrorCode.TIME_LIMIT_EXCEEDED:
        return 'Optimize your algorithm to reduce execution time';
      case ExecutionErrorCode.MEMORY_LIMIT_EXCEEDED:
        return 'Reduce memory usage by optimizing data structures';
      case ExecutionErrorCode.SECURITY_VIOLATION:
        return 'Remove any system calls or file access operations';
      default:
        return 'Please check your code and try again';
    }
  }

  private createFailedResult(id: string, details: string, startTime: number): CodeExecutionResult {
    return {
      id,
      success: false,
      executionTime: Date.now() - startTime,
      memoryUsed: 0,
      exitCode: 1,
      stdout: '',
      stderr: details,
      createdAt: new Date(),
    };
  }

  private calculateEstimatedWaitTime(): number {
    // Simple estimation based on queue size and average processing time
    const queueSize = this.executionQueue.size;
    const averageProcessingTime = 15000; // 15 seconds average
    return queueSize * averageProcessingTime;
  }

  private getQueuePosition(executionId: string): number {
    const entries = Array.from(this.executionQueue.entries());
    const index = entries.findIndex(([id]) => id === executionId);
    return index + 1;
  }

  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    });
  }

  private async initializeTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  private async cleanup(containerId: string, workDir: string): Promise<void> {
    try {
      // Stop and remove container
      const container = this.docker.getContainer(containerId);
      await container.stop();
      await container.remove();

      // Remove working directory
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  public async processQueue(): Promise<void> {
    // Process queued executions when capacity becomes available
    while (this.processing.size < 5 && this.executionQueue.size > 0) {
      const nextExecution = this.getNextQueuedExecution();
      if (nextExecution) {
        this.executionQueue.delete(nextExecution.id);
        await this.executeImmediately(nextExecution.request);
      }
    }
  }

  private getNextQueuedExecution(): QueuedRequest | null {
    // Priority-based queue processing
    const entries = Array.from(this.executionQueue.values());
    entries.sort((a, b) => {
      const priorityOrder = {
        [ExecutionPriority.URGENT]: 0,
        [ExecutionPriority.HIGH]: 1,
        [ExecutionPriority.NORMAL]: 2,
        [ExecutionPriority.LOW]: 3,
      };

      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // If same priority, use FIFO
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });

    return entries[0] || null;
  }

  // ============================================================================
  // STATUS & MONITORING
  // ============================================================================

  public getExecutionStatus(executionId: string): {
    stage: ExecutionStage;
    progress?: ExecutionProgress;
  } {
    if (this.processing.has(executionId)) {
      const processing = this.processing.get(executionId);
      return {
        stage: processing.stage,
        progress: {
          stage: processing.stage,
          percentage: this.getStageProgress(processing.stage),
          currentStep: this.getStageDescription(processing.stage),
          estimatedTimeRemaining: this.calculateRemainingTime(
            processing.startedAt,
            processing.stage
          ),
        },
      };
    }

    if (this.executionQueue.has(executionId)) {
      return { stage: ExecutionStage.QUEUED };
    }

    return { stage: ExecutionStage.COMPLETED };
  }

  private getStageProgress(stage: ExecutionStage): number {
    const progressMap = {
      [ExecutionStage.QUEUED]: 0,
      [ExecutionStage.INITIALIZING]: 10,
      [ExecutionStage.COMPILING]: 30,
      [ExecutionStage.EXECUTING]: 60,
      [ExecutionStage.TESTING]: 80,
      [ExecutionStage.ANALYZING]: 90,
      [ExecutionStage.COMPLETED]: 100,
      [ExecutionStage.FAILED]: 100,
    };
    return progressMap[stage] || 0;
  }

  private getStageDescription(stage: ExecutionStage): string {
    const descriptions = {
      [ExecutionStage.QUEUED]: 'Waiting in queue',
      [ExecutionStage.INITIALIZING]: 'Setting up execution environment',
      [ExecutionStage.COMPILING]: 'Compiling source code',
      [ExecutionStage.EXECUTING]: 'Running code',
      [ExecutionStage.TESTING]: 'Running test cases',
      [ExecutionStage.ANALYZING]: 'Analyzing results',
      [ExecutionStage.COMPLETED]: 'Execution completed',
      [ExecutionStage.FAILED]: 'Execution failed',
    };
    return descriptions[stage] || 'Unknown stage';
  }

  private calculateRemainingTime(startedAt: Date, currentStage: ExecutionStage): number {
    const elapsed = Date.now() - startedAt.getTime();
    const progress = this.getStageProgress(currentStage);

    if (progress === 0) {
      return 30000;
    } // Default 30 seconds

    const estimated = (elapsed / progress) * 100;
    return Math.max(0, estimated - elapsed);
  }
}
