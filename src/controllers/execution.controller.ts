/**
 * Code Execution Controller
 * REST API endpoints for secure code execution
 */

import { Request, Response } from 'express';
import { CodeExecutionService } from '../services/execution.service';
import {
  ExecuteCodeRequest,
  ProgrammingLanguage,
  ExecutionPriority,
  ExecutionStage,
  ExecutionErrorCode
} from '../types/execution.types';

export class ExecutionController {
  private executionService: CodeExecutionService;

  constructor() {
    this.executionService = new CodeExecutionService();
  }

  // ============================================================================
  // EXECUTE CODE
  // ============================================================================

  public executeCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        sessionId,
        questionId,
        language,
        code,
        testCases,
        timeLimit,
        memoryLimit,
        runTests = true,
        analyzeCode = false,
        priority = ExecutionPriority.NORMAL
      } = req.body;

      // Validate required fields
      if (!sessionId || !questionId || !language || !code) {
        res.status(400).json({
          success: false,
          error: {
            code: ExecutionErrorCode.INVALID_CODE,
            message: 'Missing required fields: sessionId, questionId, language, or code',
            timestamp: new Date(),
            recoverable: true
          }
        });
        return;
      }

      // Validate language
      if (!Object.values(ProgrammingLanguage).includes(language)) {
        res.status(400).json({
          success: false,
          error: {
            code: ExecutionErrorCode.INVALID_LANGUAGE,
            message: `Unsupported programming language: ${language}`,
            timestamp: new Date(),
            recoverable: true
          }
        });
        return;
      }

      // Create execution request
      const executeRequest: ExecuteCodeRequest = {
        sessionId,
        questionId,
        language,
        code,
        testCases: runTests ? testCases : undefined,
        timeLimit,
        memoryLimit,
        runTests,
        analyzeCode,
        priority
      };

      // Execute code
      const result = await this.executionService.executeCode(executeRequest);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = this.getErrorStatusCode(result.error?.code);
        res.status(statusCode).json(result);
      }

    } catch (error) {
      console.error('Code execution error:', error);
      res.status(500).json({
        success: false,
        executionId: '',
        error: {
          code: ExecutionErrorCode.RUNTIME_ERROR,
          message: 'Internal server error during code execution',
          timestamp: new Date(),
          recoverable: true
        }
      });
    }
  };

  // ============================================================================
  // GET EXECUTION STATUS
  // ============================================================================

  public getExecutionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { executionId } = req.params;

      if (!executionId) {
        res.status(400).json({
          error: {
            code: ExecutionErrorCode.INVALID_CODE,
            message: 'Execution ID is required',
            timestamp: new Date(),
            recoverable: true
          }
        });
        return;
      }

      const status = this.executionService.getExecutionStatus(executionId);

      res.status(200).json({
        executionId,
        status: status.stage,
        progress: status.progress,
        isCompleted: status.stage === ExecutionStage.COMPLETED || status.stage === ExecutionStage.FAILED
      });

    } catch (error) {
      console.error('Get execution status error:', error);
      res.status(500).json({
        error: {
          code: ExecutionErrorCode.RUNTIME_ERROR,
          message: 'Failed to get execution status',
          timestamp: new Date(),
          recoverable: true
        }
      });
    }
  };

  // ============================================================================
  // LIST SUPPORTED LANGUAGES
  // ============================================================================

  public getSupportedLanguages = async (_req: Request, res: Response): Promise<void> => {
    try {
      const languages = Object.values(ProgrammingLanguage).map(lang => ({
        id: lang,
        name: this.getLanguageDisplayName(lang),
        fileExtension: this.getFileExtension(lang),
        supportsCompilation: this.supportsCompilation(lang),
        defaultTimeLimit: this.getDefaultTimeLimit(lang),
        defaultMemoryLimit: this.getDefaultMemoryLimit(lang)
      }));

      res.status(200).json({
        success: true,
        languages
      });

    } catch (error) {
      console.error('Get supported languages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ExecutionErrorCode.RUNTIME_ERROR,
          message: 'Failed to get supported languages',
          timestamp: new Date(),
          recoverable: true
        }
      });
    }
  };

  // ============================================================================
  // VALIDATE CODE
  // ============================================================================

  public validateCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { language, code } = req.body;

      if (!language || !code) {
        res.status(400).json({
          success: false,
          error: {
            code: ExecutionErrorCode.INVALID_CODE,
            message: 'Language and code are required',
            timestamp: new Date(),
            recoverable: true
          }
        });
        return;
      }

      // Basic validation
      const validation = this.performBasicValidation(language, code);

      res.status(200).json({
        success: true,
        validation
      });

    } catch (error) {
      console.error('Code validation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ExecutionErrorCode.RUNTIME_ERROR,
          message: 'Failed to validate code',
          timestamp: new Date(),
          recoverable: true
        }
      });
    }
  };

  // ============================================================================
  // EXECUTE BULK
  // ============================================================================

  public executeBulk = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requests, batchId, priority = ExecutionPriority.NORMAL } = req.body;

      if (!requests || !Array.isArray(requests) || requests.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: ExecutionErrorCode.INVALID_CODE,
            message: 'Requests array is required and cannot be empty',
            timestamp: new Date(),
            recoverable: true
          }
        });
        return;
      }

      if (requests.length > 10) {
        res.status(400).json({
          success: false,
          error: {
            code: ExecutionErrorCode.QUEUE_FULL,
            message: 'Maximum 10 requests allowed per batch',
            timestamp: new Date(),
            recoverable: true
          }
        });
        return;
      }

      const results = await Promise.allSettled(
        requests.map((request: ExecuteCodeRequest) => 
          this.executionService.executeCode({ ...request, priority })
        )
      );

      const executionIds: string[] = [];
      let successfulSubmissions = 0;
      let failedSubmissions = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          executionIds.push(result.value.executionId);
          successfulSubmissions++;
        } else {
          failedSubmissions++;
          console.error(`Bulk execution ${index} failed:`, 
            result.status === 'rejected' ? result.reason : result.value.error);
        }
      });

      const estimatedCompletionTime = new Date();
      estimatedCompletionTime.setSeconds(estimatedCompletionTime.getSeconds() + 30); // 30 seconds estimate

      res.status(200).json({
        batchId: batchId || `batch-${Date.now()}`,
        totalRequests: requests.length,
        successfulSubmissions,
        failedSubmissions,
        executionIds,
        estimatedCompletionTime
      });

    } catch (error) {
      console.error('Bulk execution error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ExecutionErrorCode.RUNTIME_ERROR,
          message: 'Failed to execute bulk requests',
          timestamp: new Date(),
          recoverable: true
        }
      });
    }
  };

  // ============================================================================
  // GET EXECUTION HISTORY
  // ============================================================================

  public getExecutionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        sessionId,
        questionId,
        language,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      // For now, return empty history since we don't have persistent storage
      // This would typically query the database
      
      res.status(200).json({
        data: [],
        total: 0,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: 0,
        filters: {
          sessionId: sessionId as string,
          questionId: questionId as string,
          language: language as string,
          startDate: startDate as string,
          endDate: endDate as string
        }
      });

    } catch (error) {
      console.error('Get execution history error:', error);
      res.status(500).json({
        error: {
          code: ExecutionErrorCode.RUNTIME_ERROR,
          message: 'Failed to get execution history',
          timestamp: new Date(),
          recoverable: true
        }
      });
    }
  };

  // ============================================================================
  // SYSTEM STATUS
  // ============================================================================

  public getSystemStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      // This would typically check system health, queue status, etc.
      res.status(200).json({
        success: true,
        status: 'healthy',
        queueSize: 0, // this.executionService.getQueueSize(),
        activeExecutions: 0, // this.executionService.getActiveExecutions(),
        systemLoad: 0.1,
        availableLanguages: Object.values(ProgrammingLanguage).length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Get system status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ExecutionErrorCode.RUNTIME_ERROR,
          message: 'Failed to get system status',
          timestamp: new Date(),
          recoverable: true
        }
      });
    }
  };

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getErrorStatusCode(errorCode?: ExecutionErrorCode): number {
    switch (errorCode) {
      case ExecutionErrorCode.INVALID_CODE:
      case ExecutionErrorCode.INVALID_LANGUAGE:
      case ExecutionErrorCode.INVALID_TEST_CASE:
        return 400;
      case ExecutionErrorCode.SECURITY_VIOLATION:
      case ExecutionErrorCode.UNAUTHORIZED_ACCESS:
      case ExecutionErrorCode.MALICIOUS_CODE:
        return 403;
      case ExecutionErrorCode.RESOURCE_UNAVAILABLE:
      case ExecutionErrorCode.CONTAINER_ERROR:
        return 503;
      case ExecutionErrorCode.QUEUE_FULL:
      case ExecutionErrorCode.SYSTEM_OVERLOAD:
        return 429;
      case ExecutionErrorCode.EXECUTION_TIMEOUT:
      case ExecutionErrorCode.TIME_LIMIT_EXCEEDED:
        return 408;
      default:
        return 500;
    }
  }

  private getLanguageDisplayName(language: ProgrammingLanguage): string {
    const displayNames = {
      [ProgrammingLanguage.PYTHON]: 'Python',
      [ProgrammingLanguage.JAVASCRIPT]: 'JavaScript',
      [ProgrammingLanguage.TYPESCRIPT]: 'TypeScript',
      [ProgrammingLanguage.JAVA]: 'Java',
      [ProgrammingLanguage.CPP]: 'C++',
      [ProgrammingLanguage.C]: 'C',
      [ProgrammingLanguage.CSHARP]: 'C#',
      [ProgrammingLanguage.GO]: 'Go',
      [ProgrammingLanguage.RUST]: 'Rust',
      [ProgrammingLanguage.RUBY]: 'Ruby',
      [ProgrammingLanguage.PHP]: 'PHP',
      [ProgrammingLanguage.KOTLIN]: 'Kotlin',
      [ProgrammingLanguage.SWIFT]: 'Swift',
      [ProgrammingLanguage.SCALA]: 'Scala',
      [ProgrammingLanguage.SQL]: 'SQL'
    };
    return displayNames[language] || language;
  }

  private getFileExtension(language: ProgrammingLanguage): string {
    const extensions = {
      [ProgrammingLanguage.PYTHON]: '.py',
      [ProgrammingLanguage.JAVASCRIPT]: '.js',
      [ProgrammingLanguage.TYPESCRIPT]: '.ts',
      [ProgrammingLanguage.JAVA]: '.java',
      [ProgrammingLanguage.CPP]: '.cpp',
      [ProgrammingLanguage.C]: '.c',
      [ProgrammingLanguage.CSHARP]: '.cs',
      [ProgrammingLanguage.GO]: '.go',
      [ProgrammingLanguage.RUST]: '.rs',
      [ProgrammingLanguage.RUBY]: '.rb',
      [ProgrammingLanguage.PHP]: '.php',
      [ProgrammingLanguage.KOTLIN]: '.kt',
      [ProgrammingLanguage.SWIFT]: '.swift',
      [ProgrammingLanguage.SCALA]: '.scala',
      [ProgrammingLanguage.SQL]: '.sql'
    };
    return extensions[language] || '.txt';
  }

  private supportsCompilation(language: ProgrammingLanguage): boolean {
    const compiled = [
      ProgrammingLanguage.JAVA,
      ProgrammingLanguage.CPP,
      ProgrammingLanguage.C,
      ProgrammingLanguage.CSHARP,
      ProgrammingLanguage.GO,
      ProgrammingLanguage.RUST,
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.KOTLIN,
      ProgrammingLanguage.SWIFT,
      ProgrammingLanguage.SCALA
    ];
    return compiled.includes(language);
  }

  private getDefaultTimeLimit(language: ProgrammingLanguage): number {
    const timeLimits = {
      [ProgrammingLanguage.PYTHON]: 10000,
      [ProgrammingLanguage.JAVASCRIPT]: 8000,
      [ProgrammingLanguage.TYPESCRIPT]: 12000,
      [ProgrammingLanguage.JAVA]: 15000,
      [ProgrammingLanguage.CPP]: 10000,
      [ProgrammingLanguage.C]: 10000,
      [ProgrammingLanguage.CSHARP]: 12000,
      [ProgrammingLanguage.GO]: 8000,
      [ProgrammingLanguage.RUST]: 12000,
      [ProgrammingLanguage.RUBY]: 10000,
      [ProgrammingLanguage.PHP]: 8000,
      [ProgrammingLanguage.KOTLIN]: 15000,
      [ProgrammingLanguage.SWIFT]: 12000,
      [ProgrammingLanguage.SCALA]: 15000,
      [ProgrammingLanguage.SQL]: 5000
    };
    return timeLimits[language] || 10000;
  }

  private getDefaultMemoryLimit(language: ProgrammingLanguage): number {
    const memoryLimits = {
      [ProgrammingLanguage.PYTHON]: 128,
      [ProgrammingLanguage.JAVASCRIPT]: 128,
      [ProgrammingLanguage.TYPESCRIPT]: 256,
      [ProgrammingLanguage.JAVA]: 512,
      [ProgrammingLanguage.CPP]: 256,
      [ProgrammingLanguage.C]: 256,
      [ProgrammingLanguage.CSHARP]: 512,
      [ProgrammingLanguage.GO]: 128,
      [ProgrammingLanguage.RUST]: 256,
      [ProgrammingLanguage.RUBY]: 128,
      [ProgrammingLanguage.PHP]: 128,
      [ProgrammingLanguage.KOTLIN]: 512,
      [ProgrammingLanguage.SWIFT]: 256,
      [ProgrammingLanguage.SCALA]: 512,
      [ProgrammingLanguage.SQL]: 64
    };
    return memoryLimits[language] || 128;
  }

  private performBasicValidation(language: ProgrammingLanguage, code: string): any {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Basic size check
    if (code.length > 100000) { // 100KB
      issues.push('Code size exceeds maximum limit');
    }

    // Basic security checks
    const suspiciousPatterns = [
      { pattern: /import\s+os/, message: 'OS module import detected' },
      { pattern: /import\s+subprocess/, message: 'Subprocess module import detected' },
      { pattern: /require\(['"]fs['"]\)/, message: 'File system access detected' },
      { pattern: /system\s*\(/, message: 'System call detected' },
      { pattern: /exec\s*\(/, message: 'Code execution function detected' }
    ];

    suspiciousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(code)) {
        warnings.push(message);
      }
    });

    // Language-specific checks
    switch (language) {
      case ProgrammingLanguage.PYTHON:
        if (!code.includes('def ') && !code.includes('print') && !code.includes('return')) {
          warnings.push('No function definition or output statement found');
        }
        break;
      case ProgrammingLanguage.JAVASCRIPT:
      case ProgrammingLanguage.TYPESCRIPT:
        if (!code.includes('function') && !code.includes('=>') && !code.includes('console.log')) {
          warnings.push('No function definition or output statement found');
        }
        break;
      case ProgrammingLanguage.JAVA:
        if (!code.includes('public static void main') && !code.includes('public class')) {
          warnings.push('No main method or class definition found');
        }
        break;
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      codeSize: code.length,
      estimatedComplexity: this.estimateComplexity(code),
      securityRisk: warnings.length > 0 ? 'medium' : 'low'
    };
  }

  private estimateComplexity(code: string): 'low' | 'medium' | 'high' {
    const lines = code.split('\n').length;
    const loops = (code.match(/for\s*\(|while\s*\(|for\s+\w+\s+in/g) || []).length;
    const conditions = (code.match(/if\s*\(|switch\s*\(/g) || []).length;
    
    const complexityScore = lines * 0.1 + loops * 2 + conditions * 1.5;
    
    if (complexityScore < 10) return 'low';
    if (complexityScore < 30) return 'medium';
    return 'high';
  }
}
