/**
 * AI Analysis Engine Service
 * Core service for AI-powered proctoring analysis
 * Epic 4 Task 4.2: AI Analysis Engine Implementation
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import RedisService from './redis.service';
import { Logger } from '../utils/logger.utils';
import { WebRTCError } from '../utils/webrtc-error.utils';
import {
  AIProcessingRequest,
  AIProcessingResponse,
  AIAnalysisServiceOptions,
  AIModelConfig,
  AIModelType,
  FaceDetectionResult,
  GazeTrackingResult,
  AudioAnalysisResult,
  BehaviorAnalysisResult,
  ProcessingPriority,
  AIAnalysisResults,
  AggregatedAnalysis,
  ProcessingPerformance,
  ProcessingError,
  ErrorSeverity,
  ViolationSeverity,
  RecommendedAction,
  ActionType,
  ActionPriority,
  RiskAssessment,
  VerificationStatus,
} from '../types/ai-analysis.types';

const logger = new Logger('AIAnalysisEngine');

export class AIAnalysisEngine extends EventEmitter {
  private models: Map<AIModelType, AIModelConfig> = new Map();
  private processingQueue: AIProcessingRequest[] = [];
  private activeProcessing: Map<string, Promise<AIProcessingResponse>> = new Map();
  private isInitialized = false;
  private processingStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    queueSize: 0,
  };

  constructor(
    private prisma: PrismaClient,
    private redisService: RedisService,
    private options: AIAnalysisServiceOptions
  ) {
    super();
    this.initializeService();
  }

  /**
   * Initialize AI Analysis Engine
   */
  private async initializeService(): Promise<void> {
    try {
      logger.info('Initializing AI Analysis Engine', {
        modelCount: this.options.models.length,
        enabledModels: this.options.models.filter(m => m.enabled).length,
      });

      // Load and validate AI models
      await this.loadAIModels();

      // Initialize processing pipeline
      await this.initializeProcessingPipeline();

      // Start background processing
      this.startBackgroundProcessing();

      // Initialize monitoring
      this.initializeMonitoring();

      this.isInitialized = true;
      logger.info('AI Analysis Engine initialized successfully');

      this.emit('initialized', {
        timestamp: new Date(),
        modelsLoaded: this.models.size,
        status: 'ready',
      });
    } catch (error) {
      logger.error('Failed to initialize AI Analysis Engine', error);
      throw new WebRTCError(
        `AI Analysis Engine initialization failed: ${(error as any).message}`,
        'AI_INIT_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Load and configure AI models
   */
  private async loadAIModels(): Promise<void> {
    logger.info('Loading AI models', { count: this.options.models.length });

    for (const modelConfig of this.options.models) {
      if (!modelConfig.enabled) {
        logger.info(`Skipping disabled model: ${modelConfig.name}`);
        continue;
      }

      try {
        await this.loadModel(modelConfig);
        this.models.set(modelConfig.type, modelConfig);

        logger.info('AI model loaded successfully', {
          type: modelConfig.type,
          name: modelConfig.name,
          version: modelConfig.version,
        });
      } catch (error) {
        logger.error(`Failed to load AI model: ${modelConfig.name}`, error);

        // Continue loading other models if one fails
        if (modelConfig.type === AIModelType.FACE_DETECTION) {
          // Face detection is critical - fail initialization
          throw error;
        }
      }
    }

    if (this.models.size === 0) {
      throw new Error('No AI models loaded successfully');
    }
  }

  /**
   * Load individual AI model
   */
  private async loadModel(config: AIModelConfig): Promise<void> {
    // In a real implementation, this would load TensorFlow.js models
    // For now, we'll simulate model loading with validation

    logger.info(`Loading model: ${config.name} (${config.type})`);

    // Validate model configuration
    if (!config.tfModelUrl && !config.modelPath) {
      throw new Error(`Model ${config.name} missing tfModelUrl or modelPath`);
    }

    // Simulate model loading delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Cache model metadata in Redis
    await this.redisService.set(
      `ai:model:${config.type}`,
      JSON.stringify({
        config,
        loadedAt: new Date(),
        status: 'ready',
      }),
      3600
    ); // 1 hour cache
  }

  /**
   * Initialize processing pipeline
   */
  private async initializeProcessingPipeline(): Promise<void> {
    logger.info('Initializing AI processing pipeline');

    // Set up processing queue configurations
    const queueConfig = this.options.processing.queueSettings;

    // Initialize processing workers (simulated)
    // In a real implementation, this would set up worker threads or processes

    logger.info('Processing pipeline initialized', {
      maxConcurrentRequests: this.options.processing.maxConcurrentRequests,
      queueMaxSize: queueConfig.maxSize,
      queueTimeout: queueConfig.timeoutMs,
    });
  }

  /**
   * Start background processing loop
   */
  private startBackgroundProcessing(): void {
    setInterval(() => {
      this.processQueue();
      this.updateStats();
    }, 100); // Process every 100ms

    logger.info('Background processing started');
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    if (!this.options.monitoring.performance.enabled) {
      return;
    }

    const interval = this.options.monitoring.performance.metricsInterval;

    setInterval(() => {
      this.emitPerformanceMetrics();
    }, interval);

    logger.info('Performance monitoring initialized', { interval });
  }

  /**
   * Process AI analysis request
   */
  async processAnalysis(request: AIProcessingRequest): Promise<AIProcessingResponse> {
    try {
      logger.info('Processing AI analysis request', {
        requestId: request.id,
        sessionId: request.sessionId,
        priority: request.priority,
      });

      // Validate request
      this.validateProcessingRequest(request);

      // Check if already processing
      if (this.activeProcessing.has(request.id)) {
        return await this.activeProcessing.get(request.id)!;
      }

      // Add to processing queue or process immediately
      const processingPromise = this.executeAnalysis(request);
      this.activeProcessing.set(request.id, processingPromise);

      // Wait for processing to complete
      const response = await processingPromise;

      // Clean up
      this.activeProcessing.delete(request.id);

      return response;
    } catch (error) {
      logger.error('Failed to process AI analysis request', {
        requestId: request.id,
        error: (error as any).message,
      });

      throw new WebRTCError(
        `AI analysis processing failed: ${(error as any).message}`,
        'AI_PROCESSING_ERROR',
        500,
        { requestId: request.id, error }
      );
    }
  }

  /**
   * Execute AI analysis
   */
  private async executeAnalysis(request: AIProcessingRequest): Promise<AIProcessingResponse> {
    const startTime = Date.now();
    const results: AIAnalysisResults = { aggregated: this.getEmptyAggregatedAnalysis() };
    const errors: ProcessingError[] = [];

    try {
      // Process different types of analysis based on available data and models
      if (request.inputData.video && this.models.has(AIModelType.FACE_DETECTION)) {
        results.faceDetection = await this.processFaceDetection(request);
      }

      if (request.inputData.video && this.models.has(AIModelType.GAZE_TRACKING)) {
        results.gazeTracking = await this.processGazeTracking(request);
      }

      if (request.inputData.audio && this.models.has(AIModelType.AUDIO_ANALYSIS)) {
        results.audioAnalysis = await this.processAudioAnalysis(request);
      }

      if (this.models.has(AIModelType.BEHAVIOR_ANALYSIS)) {
        results.behaviorAnalysis = await this.processBehaviorAnalysis(request);
      }

      // Generate aggregated analysis
      results.aggregated = await this.generateAggregatedAnalysis(results);

      // Store results if enabled
      if (this.options.storage.results.enabled) {
        await this.storeAnalysisResults(request.sessionId, results);
      }

      const processingTime = Date.now() - startTime;

      const response: AIProcessingResponse = {
        id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestId: request.id,
        sessionId: request.sessionId,
        timestamp: new Date(),
        processingTime,
        results,
        performance: this.calculatePerformanceMetrics(processingTime),
        errors: errors.length > 0 ? errors : undefined,
      };

      // Update statistics
      this.processingStats.totalRequests++;
      this.processingStats.successfulRequests++;
      this.processingStats.averageLatency =
        (this.processingStats.averageLatency + processingTime) / 2;

      // Emit processing event
      this.emit('analysis-completed', {
        sessionId: request.sessionId,
        response,
        performance: response.performance,
      });

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.processingStats.totalRequests++;
      this.processingStats.failedRequests++;

      const processingError: ProcessingError = {
        code: 'ANALYSIS_EXECUTION_FAILED',
        message: (error as any).message,
        severity: ErrorSeverity.ERROR,
        timestamp: new Date(),
      };

      return {
        id: `resp_error_${Date.now()}`,
        requestId: request.id,
        sessionId: request.sessionId,
        timestamp: new Date(),
        processingTime,
        results,
        performance: this.calculatePerformanceMetrics(processingTime),
        errors: [processingError],
      };
    }
  }

  /**
   * Process face detection analysis
   */
  private async processFaceDetection(request: AIProcessingRequest): Promise<FaceDetectionResult> {
    logger.info('Processing face detection', { requestId: request.id });

    // Simulate face detection processing
    // In a real implementation, this would use TensorFlow.js models

    const result: FaceDetectionResult = {
      id: `face_${Date.now()}`,
      timestamp: new Date(),
      sessionId: request.sessionId,
      detections: [
        {
          id: `detection_${Date.now()}`,
          boundingBox: { x: 100, y: 50, width: 200, height: 250 },
          confidence: 0.95,
          landmarks: [
            { type: 'left_eye' as any, coordinates: { x: 150, y: 120 }, confidence: 0.92 },
            { type: 'right_eye' as any, coordinates: { x: 200, y: 120 }, confidence: 0.94 },
            { type: 'nose' as any, coordinates: { x: 175, y: 160 }, confidence: 0.89 },
            { type: 'mouth' as any, coordinates: { x: 175, y: 210 }, confidence: 0.91 },
          ],
          features: {
            age: 25,
            gender: 'unknown',
            emotion: {
              dominant: 'focused' as any,
              scores: {
                neutral: 0.7,
                focused: 0.8,
                happy: 0.1,
                sad: 0.05,
                angry: 0.05,
                fearful: 0.05,
                disgusted: 0.05,
                surprised: 0.05,
                confused: 0.05,
                stressed: 0.05,
              } as any,
              confidence: 0.85,
            },
          },
          recognition: {
            candidateId: request.userId,
            similarity: 0.92,
            isAuthorized: true,
            confidence: 0.9,
            verificationStatus: VerificationStatus.VERIFIED,
          },
        },
      ],
      confidence: 0.95,
      processingTime: 150,
      metadata: {
        imageWidth: 640,
        imageHeight: 480,
        frameNumber: 1,
      },
    };

    return result;
  }

  /**
   * Process gaze tracking analysis
   */
  private async processGazeTracking(request: AIProcessingRequest): Promise<GazeTrackingResult> {
    logger.info('Processing gaze tracking', { requestId: request.id });

    // Simulate gaze tracking analysis
    const result: GazeTrackingResult = {
      id: `gaze_${Date.now()}`,
      timestamp: new Date(),
      sessionId: request.sessionId,
      gazePoint: {
        x: 320,
        y: 240,
        confidence: 0.88,
        onScreen: true,
        screenRegion: 'assessment_area' as any,
      },
      eyeMovements: [
        {
          type: 'fixation' as any,
          duration: 250,
          velocity: 0,
          amplitude: 0,
          startPoint: { x: 320, y: 240 },
          endPoint: { x: 320, y: 240 },
        },
      ],
      attentionMetrics: {
        focusScore: 85,
        distractionEvents: 0,
        averageFixationDuration: 250,
        scanPattern: 'focused' as any,
        cognitiveLoad: 'moderate' as any,
      },
      violations: [],
    };

    return result;
  }

  /**
   * Process audio analysis
   */
  private async processAudioAnalysis(request: AIProcessingRequest): Promise<AudioAnalysisResult> {
    logger.info('Processing audio analysis', { requestId: request.id });

    // Simulate audio analysis
    const result: AudioAnalysisResult = {
      id: `audio_${Date.now()}`,
      timestamp: new Date(),
      sessionId: request.sessionId,
      audioFeatures: {
        volume: {
          rms: 0.15,
          peak: 0.8,
          average: 0.12,
          silenceRatio: 0.7,
          dynamicRange: 0.65,
        },
        frequency: {
          fundamentalFrequency: 150,
          harmonics: [300, 450, 600],
          spectralCentroid: 2000,
          spectralRolloff: 8000,
          mfcc: [1.2, 0.8, -0.5, 0.3, -0.1, 0.7, -0.2, 0.4, -0.3, 0.1, 0.2, -0.4, 0.6],
        },
        quality: {
          snr: 25,
          clarity: 0.85,
          distortion: 0.05,
          backgroundNoise: 0.1,
        },
        patterns: [
          {
            type: 'keyboard_typing' as any,
            confidence: 0.7,
            duration: 500,
            intensity: 0.3,
          },
        ],
      },
      environmentalAnalysis: {
        roomSize: 'medium' as any,
        acousticProperties: {
          reverberation: 0.3,
          echo: 0.1,
          dampening: 0.6,
          resonance: 0.2,
        },
        backgroundActivity: [
          {
            type: 'office_environment' as any,
            intensity: 0.2,
            confidence: 0.8,
            duration: 1000,
          },
        ],
        locationIndicators: [
          {
            type: 'home' as any,
            confidence: 0.75,
            evidence: ['quiet_environment', 'minimal_background_noise'],
          },
        ],
      },
      violations: [],
    };

    return result;
  }

  /**
   * Process behavior analysis
   */
  private async processBehaviorAnalysis(
    request: AIProcessingRequest
  ): Promise<BehaviorAnalysisResult> {
    logger.info('Processing behavior analysis', { requestId: request.id });

    // Simulate behavior analysis
    const result: BehaviorAnalysisResult = {
      id: `behavior_${Date.now()}`,
      timestamp: new Date(),
      sessionId: request.sessionId,
      behaviorPatterns: [
        {
          type: 'typing_rhythm' as any,
          frequency: 2.5,
          duration: 5000,
          intensity: 0.7,
          normalcy: 0.9,
          trend: 'stable' as any,
        },
        {
          type: 'question_navigation' as any,
          frequency: 1.2,
          duration: 10000,
          intensity: 0.5,
          normalcy: 0.85,
          trend: 'stable' as any,
        },
      ],
      anomalies: [],
      riskScore: {
        overall: 15,
        categories: {
          identity_verification: 5,
          external_assistance: 3,
          unauthorized_resources: 2,
          technical_violations: 3,
          behavioral_anomalies: 2,
        } as any,
        factors: [
          {
            category: 'identity_verification' as any,
            factor: 'Face verification successful',
            impact: 5,
            confidence: 0.92,
            evidence: ['face_detection_confidence_95%'],
          },
        ],
        recommendation: 'accept' as any,
      },
      recommendedActions: [],
    };

    return result;
  }

  /**
   * Generate aggregated analysis from individual results
   */
  private async generateAggregatedAnalysis(
    results: AIAnalysisResults
  ): Promise<AggregatedAnalysis> {
    const riskFactors: number[] = [];
    const violations: any[] = [];
    const actions: RecommendedAction[] = [];

    // Collect risk factors from different analyses
    if (results.faceDetection?.detections.length === 0) {
      riskFactors.push(30); // No face detected - high risk
      actions.push({
        type: ActionType.REQUEST_VERIFICATION,
        priority: ActionPriority.HIGH,
        description: 'No face detected - verify candidate identity',
        automated: false,
      });
    }

    if (results.gazeTracking?.violations) {
      violations.push(...results.gazeTracking.violations);
      riskFactors.push(results.gazeTracking.violations.length * 5);
    }

    if (results.audioAnalysis?.violations) {
      violations.push(...results.audioAnalysis.violations);
      riskFactors.push(results.audioAnalysis.violations.length * 5);
    }

    if (results.behaviorAnalysis?.anomalies) {
      violations.push(...results.behaviorAnalysis.anomalies);
      riskFactors.push(results.behaviorAnalysis.anomalies.length * 10);
    }

    // Calculate overall risk score
    const overallRiskScore = Math.min(
      100,
      riskFactors.reduce((sum, factor) => sum + factor, 0) || 0
    );

    // Generate risk-based recommendations
    if (overallRiskScore > 70) {
      actions.push({
        type: ActionType.PAUSE_ASSESSMENT,
        priority: ActionPriority.URGENT,
        description: 'High risk score - pause assessment for review',
        automated: true,
      });
    } else if (overallRiskScore > 40) {
      actions.push({
        type: ActionType.NOTIFY_PROCTOR,
        priority: ActionPriority.MEDIUM,
        description: 'Moderate risk - notify proctor for monitoring',
        automated: true,
      });
    }

    return {
      overallRiskScore,
      violationsSummary: {
        total: violations.length,
        bySeverity: {
          low: violations.filter(v => v.severity === ViolationSeverity.LOW).length,
          medium: violations.filter(v => v.severity === ViolationSeverity.MEDIUM).length,
          high: violations.filter(v => v.severity === ViolationSeverity.HIGH).length,
          critical: violations.filter(v => v.severity === ViolationSeverity.CRITICAL).length,
        },
        byType: violations.reduce(
          (acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        timeline: violations.map(v => ({
          timestamp: v.timestamp || new Date(),
          type: v.type,
          severity: v.severity,
          description: v.description,
        })),
      },
      recommendedActions: actions,
      confidenceMetrics: {
        overall: this.calculateOverallConfidence(results),
        byModel: this.calculateModelConfidences(results),
        reliability: {
          dataQuality: 0.9,
          modelPerformance: 0.85,
          consistency: 0.8,
          coverage: 0.9,
        },
      },
    };
  }

  /**
   * Validate processing request
   */
  private validateProcessingRequest(request: AIProcessingRequest): void {
    if (!request.id || !request.sessionId || !request.userId) {
      throw new Error('Invalid processing request - missing required fields');
    }

    if (!request.inputData.video && !request.inputData.audio) {
      throw new Error('Invalid processing request - no input data provided');
    }

    if (this.processingQueue.length >= this.options.processing.queueSettings.maxSize) {
      throw new Error('Processing queue full - try again later');
    }
  }

  /**
   * Store analysis results
   */
  private async storeAnalysisResults(sessionId: string, results: AIAnalysisResults): Promise<void> {
    try {
      const key = `ai:results:${sessionId}:${Date.now()}`;
      const retentionDays = this.options.storage.results.retentionDays;

      await this.redisService.set(
        key,
        JSON.stringify(results),
        retentionDays * 24 * 3600 // Convert days to seconds
      );

      logger.info('Analysis results stored', { sessionId, key });
    } catch (error) {
      logger.error('Failed to store analysis results', { sessionId, error });
      // Don't throw - storage failure shouldn't fail the analysis
    }
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(processingTime: number): ProcessingPerformance {
    return {
      totalTime: processingTime,
      breakdown: {
        preprocessing: processingTime * 0.1,
        inference: processingTime * 0.7,
        postprocessing: processingTime * 0.15,
        networking: processingTime * 0.05,
      },
      resourceUsage: {
        memory: {
          peak: 256,
          average: 128,
          allocated: 512,
          freed: 384,
        },
        cpu: {
          average: 45,
          peak: 80,
          cores: 4,
        },
        disk: {
          read: 1024,
          write: 512,
          iops: 100,
        },
      },
      throughput: {
        framesPerSecond: processingTime > 0 ? 1000 / processingTime : 0,
        samplesPerSecond: 1000,
        requestsPerSecond: 1,
      },
    };
  }

  /**
   * Calculate overall confidence from results
   */
  private calculateOverallConfidence(results: AIAnalysisResults): number {
    const confidences: number[] = [];

    if (results.faceDetection?.confidence) {
      confidences.push(results.faceDetection.confidence);
    }

    if (results.gazeTracking?.gazePoint.confidence) {
      confidences.push(results.gazeTracking.gazePoint.confidence);
    }

    if (results.audioAnalysis?.audioFeatures.quality.clarity) {
      confidences.push(results.audioAnalysis.audioFeatures.quality.clarity);
    }

    return confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;
  }

  /**
   * Calculate confidence by model
   */
  private calculateModelConfidences(results: AIAnalysisResults): Record<AIModelType, number> {
    return {
      [AIModelType.FACE_DETECTION]: results.faceDetection?.confidence || 0,
      [AIModelType.GAZE_TRACKING]: results.gazeTracking?.gazePoint.confidence || 0,
      [AIModelType.AUDIO_ANALYSIS]: results.audioAnalysis?.audioFeatures.quality.clarity || 0,
      [AIModelType.BEHAVIOR_ANALYSIS]: 0.8, // Simulated
      [AIModelType.FACE_RECOGNITION]:
        results.faceDetection?.detections[0]?.recognition?.confidence || 0,
      [AIModelType.OBJECT_DETECTION]: 0,
      [AIModelType.POSE_ESTIMATION]: 0,
    };
  }

  /**
   * Get empty aggregated analysis
   */
  private getEmptyAggregatedAnalysis(): AggregatedAnalysis {
    return {
      overallRiskScore: 0,
      violationsSummary: {
        total: 0,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        byType: {},
        timeline: [],
      },
      recommendedActions: [],
      confidenceMetrics: {
        overall: 0,
        byModel: {} as Record<AIModelType, number>,
        reliability: {
          dataQuality: 0,
          modelPerformance: 0,
          consistency: 0,
          coverage: 0,
        },
      },
    };
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0) {
      return;
    }

    const maxConcurrent = this.options.processing.maxConcurrentRequests;
    const currentActive = this.activeProcessing.size;

    if (currentActive >= maxConcurrent) {
      return;
    }

    // Process high priority requests first
    this.processingQueue.sort((a, b) => {
      const priorityOrder = {
        [ProcessingPriority.REALTIME]: 4,
        [ProcessingPriority.HIGH]: 3,
        [ProcessingPriority.NORMAL]: 2,
        [ProcessingPriority.LOW]: 1,
      };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Take requests to process
    const toProcess = this.processingQueue.splice(0, maxConcurrent - currentActive);

    for (const request of toProcess) {
      this.executeAnalysis(request)
        .then(response => {
          this.emit('analysis-completed', { request, response });
        })
        .catch(error => {
          logger.error('Queue processing failed', { requestId: request.id, error });
          this.emit('analysis-failed', { request, error });
        });
    }
  }

  /**
   * Update processing statistics
   */
  private updateStats(): void {
    this.processingStats.queueSize = this.processingQueue.length;
  }

  /**
   * Emit performance metrics
   */
  private emitPerformanceMetrics(): void {
    this.emit('performance-metrics', {
      timestamp: new Date(),
      stats: { ...this.processingStats },
      activeProcessing: this.activeProcessing.size,
      modelsLoaded: this.models.size,
    });
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<any> {
    return {
      ...this.processingStats,
      activeProcessing: this.activeProcessing.size,
      modelsLoaded: this.models.size,
      queueSize: this.processingQueue.length,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    const details = {
      initialized: this.isInitialized,
      modelsLoaded: this.models.size,
      queueSize: this.processingQueue.length,
      activeProcessing: this.activeProcessing.size,
      stats: this.processingStats,
    };

    const status = this.isInitialized && this.models.size > 0 ? 'healthy' : 'unhealthy';

    return { status, details };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up AI Analysis Engine');

    // Clear processing queue
    this.processingQueue.length = 0;

    // Wait for active processing to complete
    if (this.activeProcessing.size > 0) {
      logger.info('Waiting for active processing to complete', {
        count: this.activeProcessing.size,
      });

      await Promise.allSettled(Array.from(this.activeProcessing.values()));
    }

    // Clear models
    this.models.clear();

    // Remove event listeners
    this.removeAllListeners();

    logger.info('AI Analysis Engine cleanup completed');
  }
}
