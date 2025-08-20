/**
 * AI Analysis Controller
 * HTTP API endpoints for AI-powered proctoring analysis
 * Epic 4 Task 4.2: AI Analysis Engine API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import RedisService from '../services/redis.service';
import { AIAnalysisEngine } from '../services/ai-analysis.service';
import { Logger } from '../utils/logger.utils';
import { AuthRequest } from '../middleware/auth.middleware';
import { WebRTCError } from '../utils/webrtc-error.utils';
import {
  AIProcessingRequest,
  ProcessingPriority,
  AIAnalysisServiceOptions,
  AIModelType,
  VideoFrameData,
  AudioSegmentData,
  ProcessingInputData,
  AIProcessingConfig,
  ProcessingSettings,
  OutputSettings,
  PerformanceSettings
} from '../types/ai-analysis.types';

const logger = new Logger('AIAnalysisController');

export class AIAnalysisController {
  private aiEngine: AIAnalysisEngine;

  constructor(
    private prisma: PrismaClient,
    private redisService: RedisService,
    private options: AIAnalysisServiceOptions
  ) {
    this.aiEngine = new AIAnalysisEngine(prisma, redisService, options);
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for AI engine
   */
  private setupEventListeners(): void {
    this.aiEngine.on('analysis-completed', (data) => {
      logger.info('AI analysis completed', {
        sessionId: data.sessionId,
        processingTime: data.response.processingTime
      });
    });

    this.aiEngine.on('analysis-failed', (data) => {
      logger.error('AI analysis failed', {
        requestId: data.request.id,
        error: data.error.message
      });
    });

    this.aiEngine.on('performance-metrics', (metrics) => {
      logger.info('AI performance metrics', metrics);
    });
  }

  /**
   * Process frame analysis (real-time video frame analysis)
   * POST /api/ai-analysis/frame
   */
  async processFrame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Processing frame analysis request', {
        userId: req.user.id,
        sessionId: req.body.sessionId
      });

      const {
        sessionId,
        assessmentId,
        frameData,
        audioData,
        priority = ProcessingPriority.REALTIME,
        config
      } = req.body;

      // Validate request
      if (!sessionId || !frameData) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: sessionId, frameData',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      // Verify session ownership
      const hasAccess = await this.verifySessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Prepare processing request
      const processingRequest: AIProcessingRequest = {
        id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        userId: req.user.id,
        assessmentId,
        inputData: this.prepareInputData(frameData, audioData),
        configuration: this.prepareProcessingConfig(config),
        priority,
        timestamp: new Date()
      };

      // Process analysis
      const result = await this.aiEngine.processAnalysis(processingRequest);

      logger.info('Frame analysis completed', {
        sessionId,
        processingTime: result.processingTime,
        riskScore: result.results.aggregated.overallRiskScore
      });

      res.status(200).json({
        success: true,
        data: {
          analysisId: result.id,
          sessionId: result.sessionId,
          timestamp: result.timestamp,
          processingTime: result.processingTime,
          results: result.results,
          performance: result.performance
        }
      });

    } catch (error) {
      logger.error('Failed to process frame analysis', {
        userId: req.user.id,
        error: (error as any).message
      });

      res.status(500).json({
        success: false,
        message: 'Frame analysis failed',
        code: 'PROCESSING_ERROR',
        error: (error as any).message
      });
    }
  }

  /**
   * Process batch analysis (multiple frames/audio segments)
   * POST /api/ai-analysis/batch
   */
  async processBatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Processing batch analysis request', {
        userId: req.user.id,
        sessionId: req.body.sessionId
      });

      const {
        sessionId,
        assessmentId,
        batchData,
        priority = ProcessingPriority.NORMAL,
        config
      } = req.body;

      // Validate request
      if (!sessionId || !batchData || !Array.isArray(batchData)) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: sessionId, batchData (array)',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      // Verify session access
      const hasAccess = await this.verifySessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Process batch items
      const results = [];
      for (let i = 0; i < batchData.length; i++) {
        const item = batchData[i];
        
        const processingRequest: AIProcessingRequest = {
          id: `batch_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId,
          userId: req.user.id,
          assessmentId,
          inputData: this.prepareInputData(item.frameData, item.audioData),
          configuration: this.prepareProcessingConfig(config),
          priority,
          timestamp: new Date()
        };

        const result = await this.aiEngine.processAnalysis(processingRequest);
        results.push(result);
      }

      logger.info('Batch analysis completed', {
        sessionId,
        itemsProcessed: results.length,
        averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
      });

      res.status(200).json({
        success: true,
        data: {
          batchId: `batch_${Date.now()}`,
          sessionId,
          timestamp: new Date(),
          itemsProcessed: results.length,
          results: results
        }
      });

    } catch (error) {
      logger.error('Failed to process batch analysis', {
        userId: req.user.id,
        error: (error as any).message
      });

      res.status(500).json({
        success: false,
        message: 'Batch analysis failed',
        code: 'PROCESSING_ERROR',
        error: (error as any).message
      });
    }
  }

  /**
   * Get analysis history for a session
   * GET /api/ai-analysis/sessions/:sessionId/history
   */
  async getAnalysisHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { page = 1, limit = 50, type, severity } = req.query;

      logger.info('Getting analysis history', {
        sessionId,
        userId: req.user.id,
        page,
        limit
      });

      // Verify session access
      const hasAccess = await this.verifySessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Get analysis history from Redis
      const history = await this.getSessionAnalysisHistory(sessionId, {
        page: Number(page),
        limit: Number(limit),
        type: type as string,
        severity: severity as string
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          history: history.items,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: history.total,
            pages: Math.ceil(history.total / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get analysis history', {
        sessionId: req.params.sessionId,
        userId: req.user.id,
        error: (error as any).message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analysis history',
        code: 'RETRIEVAL_ERROR',
        error: (error as any).message
      });
    }
  }

  /**
   * Get session risk assessment
   * GET /api/ai-analysis/sessions/:sessionId/risk-assessment
   */
  async getSessionRiskAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      logger.info('Getting session risk assessment', {
        sessionId,
        userId: req.user.id
      });

      // Verify session access
      const hasAccess = await this.verifySessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Calculate risk assessment
      const riskAssessment = await this.calculateSessionRiskAssessment(sessionId);

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          riskAssessment,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('Failed to get risk assessment', {
        sessionId: req.params.sessionId,
        userId: req.user.id,
        error: (error as any).message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to calculate risk assessment',
        code: 'ASSESSMENT_ERROR',
        error: (error as any).message
      });
    }
  }

  /**
   * Get AI engine status and performance metrics
   * GET /api/ai-analysis/status
   */
  async getEngineStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Getting AI engine status', { userId: req.user.id });

      const status = await this.aiEngine.healthCheck();
      const stats = await this.aiEngine.getProcessingStats();

      res.status(200).json({
        success: true,
        data: {
          engine: {
            status: status.status,
            details: status.details
          },
          statistics: stats,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('Failed to get engine status', {
        userId: req.user.id,
        error: (error as any).message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get engine status',
        code: 'STATUS_ERROR',
        error: (error as any).message
      });
    }
  }

  /**
   * Get available AI models and their status
   * GET /api/ai-analysis/models
   */
  async getAvailableModels(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Getting available AI models', { userId: req.user.id });

      const models = this.options.models.map(model => ({
        id: model.id,
        name: model.name,
        type: model.type,
        version: model.version,
        enabled: model.enabled,
        confidence: model.confidence,
        performance: model.performance
      }));

      res.status(200).json({
        success: true,
        data: {
          models,
          totalModels: models.length,
          enabledModels: models.filter(m => m.enabled).length,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('Failed to get available models', {
        userId: req.user.id,
        error: (error as any).message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get available models',
        code: 'MODELS_ERROR',
        error: (error as any).message
      });
    }
  }

  /**
   * Generate session analysis report
   * POST /api/ai-analysis/sessions/:sessionId/report
   */
  async generateAnalysisReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { format = 'json', includeEvidence = false } = req.body;

      logger.info('Generating analysis report', {
        sessionId,
        userId: req.user.id,
        format
      });

      // Verify session access
      const hasAccess = await this.verifySessionAccess(sessionId, req.user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to session',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Generate comprehensive report
      const report = await this.generateComprehensiveReport(sessionId, {
        format,
        includeEvidence
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          report,
          generatedAt: new Date(),
          format
        }
      });

    } catch (error) {
      logger.error('Failed to generate analysis report', {
        sessionId: req.params.sessionId,
        userId: req.user.id,
        error: (error as any).message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate analysis report',
        code: 'REPORT_ERROR',
        error: (error as any).message
      });
    }
  }

  /**
   * Verify session access for user
   */
  private async verifySessionAccess(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Check if session exists and user has access
      const session = await this.redisService.get(`webrtc:session:${sessionId}`);
      if (!session) {
        return false;
      }

      const sessionData = JSON.parse(session as string);
      return sessionData.userId === userId;

    } catch (error) {
      logger.error('Session access verification failed', { sessionId, userId, error });
      return false;
    }
  }

  /**
   * Prepare input data for processing
   */
  private prepareInputData(frameData?: any, audioData?: any): ProcessingInputData {
    const inputData: ProcessingInputData = {};

    if (frameData) {
      inputData.video = {
        frameBuffer: frameData.buffer,
        timestamp: frameData.timestamp || Date.now(),
        frameNumber: frameData.frameNumber || 1,
        width: frameData.width || 640,
        height: frameData.height || 480,
        format: frameData.format || 'jpeg' as any
      };
    }

    if (audioData) {
      inputData.audio = {
        audioBuffer: audioData.buffer,
        timestamp: audioData.timestamp || Date.now(),
        duration: audioData.duration || 1000,
        sampleRate: audioData.sampleRate || 44100,
        channels: audioData.channels || 1,
        format: audioData.format || 'pcm' as any
      };
    }

    return inputData;
  }

  /**
   * Prepare processing configuration
   */
  private prepareProcessingConfig(config?: any): AIProcessingConfig {
    const defaultConfig: AIProcessingConfig = {
      models: this.options.models,
      processing: {
        realTime: true,
        batchSize: 1,
        intervalMs: 1000,
        confidenceThreshold: 0.7,
        enablePreprocessing: true,
        preprocessingOptions: {
          imageEnhancement: true,
          noiseReduction: true,
          normalization: true,
          augmentation: false
        }
      },
      output: {
        includeRawResults: false,
        includeProbabilities: true,
        includeEvidence: false,
        compressionLevel: 5,
        formatVersion: '1.0'
      },
      performance: {
        maxLatency: 2000,
        targetThroughput: 10,
        resourceLimits: {
          maxMemoryMB: 512,
          maxCpuPercent: 80,
          maxGpuPercent: 90,
          maxDiskMB: 100
        },
        fallbackStrategy: 'graceful_degradation' as any
      }
    };

    // Merge with provided config
    if (config) {
      return { ...defaultConfig, ...config };
    }

    return defaultConfig;
  }

  /**
   * Get session analysis history
   */
  private async getSessionAnalysisHistory(sessionId: string, options: {
    page: number;
    limit: number;
    type?: string;
    severity?: string;
  }): Promise<{ items: any[]; total: number }> {
    try {
      // Get all analysis results for session
      const keys = await (this.redisService as any).keys(`ai:results:${sessionId}:*`);
      
      let items = [];
      for (const key of keys) {
        const data = await this.redisService.get(key);
        if (data) {
          const analysisResult = JSON.parse(data as string);
          items.push({
            key,
            timestamp: new Date(key.split(':')[3]),
            ...analysisResult
          });
        }
      }

      // Filter by type and severity if specified
      if (options.type) {
        items = items.filter(item => 
          item.results.aggregated.violationsSummary.byType[options.type!] > 0
        );
      }

      if (options.severity) {
        items = items.filter(item =>
          item.results.aggregated.violationsSummary.bySeverity[options.severity!] > 0
        );
      }

      // Sort by timestamp (newest first)
      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Paginate
      const total = items.length;
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedItems = items.slice(startIndex, endIndex);

      return { items: paginatedItems, total };

    } catch (error) {
      logger.error('Failed to get analysis history', { sessionId, error });
      return { items: [], total: 0 };
    }
  }

  /**
   * Calculate session risk assessment
   */
  private async calculateSessionRiskAssessment(sessionId: string): Promise<any> {
    try {
      const history = await this.getSessionAnalysisHistory(sessionId, {
        page: 1,
        limit: 1000 // Get all data for assessment
      });

      if (history.items.length === 0) {
        return {
          overall: 0,
          factors: [],
          recommendation: 'accept',
          confidence: 0,
          dataPoints: 0
        };
      }

      // Aggregate risk scores
      const riskScores = history.items.map(item => 
        item.results.aggregated.overallRiskScore || 0
      );

      const averageRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
      const maxRisk = Math.max(...riskScores);
      const recentRisk = riskScores.slice(0, 10); // Last 10 analyses

      // Count violations by severity
      const violationCounts = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      history.items.forEach(item => {
        const summary = item.results.aggregated.violationsSummary;
        violationCounts.low += summary.bySeverity.low || 0;
        violationCounts.medium += summary.bySeverity.medium || 0;
        violationCounts.high += summary.bySeverity.high || 0;
        violationCounts.critical += summary.bySeverity.critical || 0;
      });

      // Calculate recommendation
      let recommendation = 'accept';
      if (violationCounts.critical > 0 || maxRisk > 80) {
        recommendation = 'reject';
      } else if (violationCounts.high > 2 || averageRisk > 60) {
        recommendation = 'investigate';
      } else if (violationCounts.medium > 5 || averageRisk > 40) {
        recommendation = 'review';
      }

      return {
        overall: Math.round(averageRisk),
        maximum: Math.round(maxRisk),
        recent: Math.round(recentRisk.reduce((sum, score) => sum + score, 0) / recentRisk.length),
        violations: violationCounts,
        recommendation,
        confidence: Math.min(1, history.items.length / 10), // Higher confidence with more data points
        dataPoints: history.items.length,
        trend: this.calculateRiskTrend(riskScores)
      };

    } catch (error) {
      logger.error('Failed to calculate risk assessment', { sessionId, error });
      throw error;
    }
  }

  /**
   * Calculate risk trend
   */
  private calculateRiskTrend(riskScores: number[]): string {
    if (riskScores.length < 2) return 'insufficient_data';

    const recent = riskScores.slice(0, Math.floor(riskScores.length / 3));
    const earlier = riskScores.slice(-Math.floor(riskScores.length / 3));

    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, score) => sum + score, 0) / earlier.length;

    const difference = recentAvg - earlierAvg;

    if (Math.abs(difference) < 5) return 'stable';
    return difference > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Generate comprehensive analysis report
   */
  private async generateComprehensiveReport(sessionId: string, options: {
    format: string;
    includeEvidence: boolean;
  }): Promise<any> {
    try {
      const history = await this.getSessionAnalysisHistory(sessionId, {
        page: 1,
        limit: 10000 // Get all data
      });

      const riskAssessment = await this.calculateSessionRiskAssessment(sessionId);

      // Generate executive summary
      const executiveSummary = {
        sessionId,
        analysisCount: history.total,
        overallRisk: riskAssessment.overall,
        recommendation: riskAssessment.recommendation,
        keyFindings: this.extractKeyFindings(history.items),
        timeline: this.generateTimeline(history.items)
      };

      // Generate detailed analysis
      const detailedAnalysis = {
        riskAssessment,
        violations: this.aggregateViolations(history.items),
        patterns: this.identifyPatterns(history.items),
        recommendations: this.generateRecommendations(riskAssessment, history.items)
      };

      const report = {
        executiveSummary,
        detailedAnalysis,
        metadata: {
          generatedAt: new Date(),
          format: options.format,
          includesEvidence: options.includeEvidence,
          dataRange: {
            from: history.items[history.items.length - 1]?.timestamp,
            to: history.items[0]?.timestamp
          }
        }
      };

      return report;

    } catch (error) {
      logger.error('Failed to generate comprehensive report', { sessionId, error });
      throw error;
    }
  }

  /**
   * Extract key findings from analysis history
   */
  private extractKeyFindings(items: any[]): string[] {
    const findings: string[] = [];

    if (items.length === 0) {
      findings.push('No analysis data available');
      return findings;
    }

    // Analyze face detection
    const faceDetectionResults = items.filter(item => item.results.faceDetection);
    if (faceDetectionResults.length > 0) {
      const avgConfidence = faceDetectionResults.reduce((sum, item) => 
        sum + item.results.faceDetection.confidence, 0) / faceDetectionResults.length;
      
      findings.push(`Face detection confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    }

    // Analyze violations
    const totalViolations = items.reduce((sum, item) => 
      sum + (item.results.aggregated.violationsSummary.total || 0), 0);
    
    if (totalViolations > 0) {
      findings.push(`Total violations detected: ${totalViolations}`);
    } else {
      findings.push('No violations detected');
    }

    return findings;
  }

  /**
   * Generate timeline from analysis items
   */
  private generateTimeline(items: any[]): any[] {
    return items.map(item => ({
      timestamp: item.timestamp,
      riskScore: item.results.aggregated.overallRiskScore,
      violations: item.results.aggregated.violationsSummary.total,
      actions: item.results.aggregated.recommendedActions.length
    })).slice(0, 100); // Limit timeline entries
  }

  /**
   * Aggregate violations across all analyses
   */
  private aggregateViolations(items: any[]): any {
    const aggregated = {
      total: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {} as Record<string, number>,
      timeline: [] as any[]
    };

    items.forEach(item => {
      const summary = item.results.aggregated.violationsSummary;
      aggregated.total += summary.total || 0;
      
      Object.keys(summary.bySeverity || {}).forEach(severity => {
        aggregated.bySeverity[severity as keyof typeof aggregated.bySeverity] += summary.bySeverity[severity] || 0;
      });

      Object.keys(summary.byType || {}).forEach(type => {
        aggregated.byType[type] = (aggregated.byType[type] || 0) + summary.byType[type];
      });

      if (summary.timeline) {
        aggregated.timeline.push(...summary.timeline);
      }
    });

    return aggregated;
  }

  /**
   * Identify patterns in analysis data
   */
  private identifyPatterns(items: any[]): string[] {
    const patterns: string[] = [];

    if (items.length < 5) {
      patterns.push('Insufficient data to identify patterns');
      return patterns;
    }

    // Analyze risk score patterns
    const riskScores = items.map(item => item.results.aggregated.overallRiskScore || 0);
    const variance = this.calculateVariance(riskScores);
    
    if (variance < 10) {
      patterns.push('Consistent risk levels throughout session');
    } else if (variance > 50) {
      patterns.push('Highly variable risk levels detected');
    }

    return patterns;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(riskAssessment: any, items: any[]): string[] {
    const recommendations: string[] = [];

    if (riskAssessment.overall > 70) {
      recommendations.push('Immediate review recommended due to high risk score');
    }

    if (riskAssessment.violations.critical > 0) {
      recommendations.push('Critical violations detected - manual intervention required');
    }

    if (riskAssessment.trend === 'increasing') {
      recommendations.push('Risk trend is increasing - monitor closely');
    }

    if (recommendations.length === 0) {
      recommendations.push('Assessment appears normal - standard processing recommended');
    }

    return recommendations;
  }

  /**
   * Calculate variance of a number array
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up AI Analysis Controller');
    
    if (this.aiEngine) {
      await this.aiEngine.cleanup();
    }

    logger.info('AI Analysis Controller cleanup completed');
  }
}
