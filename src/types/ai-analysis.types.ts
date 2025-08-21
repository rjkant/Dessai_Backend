/**
 * AI Analysis Engine Types
 * Comprehensive type definitions for AI-powered proctoring analysis
 * Epic 4 Task 4.2: AI Analysis Engine Implementation
 */

import { StreamQuality } from './proctoring.types';

// AI Model Configuration Types
export interface AIModelConfig {
  id: string;
  name: string;
  version: string;
  type: AIModelType;
  modelPath?: string;
  tfModelUrl?: string;
  confidence: {
    minimum: number;
    target: number;
  };
  performance: {
    maxLatency: number; // milliseconds
    targetFps: number;
  };
  enabled: boolean;
}

export enum AIModelType {
  FACE_DETECTION = 'face_detection',
  FACE_RECOGNITION = 'face_recognition',
  GAZE_TRACKING = 'gaze_tracking',
  AUDIO_ANALYSIS = 'audio_analysis',
  BEHAVIOR_ANALYSIS = 'behavior_analysis',
  OBJECT_DETECTION = 'object_detection',
  POSE_ESTIMATION = 'pose_estimation',
}

// Face Detection and Recognition
export interface FaceDetectionResult {
  id: string;
  timestamp: Date;
  sessionId: string;
  detections: FaceDetection[];
  confidence: number;
  processingTime: number;
  metadata: {
    imageWidth: number;
    imageHeight: number;
    frameNumber: number;
  };
}

export interface FaceDetection {
  id: string;
  boundingBox: BoundingBox;
  confidence: number;
  landmarks?: FaceLandmark[];
  features?: FaceFeatures;
  recognition?: FaceRecognitionResult;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmark {
  type: FaceLandmarkType;
  coordinates: Point2D;
  confidence: number;
}

export enum FaceLandmarkType {
  LEFT_EYE = 'left_eye',
  RIGHT_EYE = 'right_eye',
  NOSE = 'nose',
  MOUTH = 'mouth',
  LEFT_EAR = 'left_ear',
  RIGHT_EAR = 'right_ear',
  CHIN = 'chin',
}

export interface Point2D {
  x: number;
  y: number;
}

export interface FaceFeatures {
  age?: number;
  gender?: 'male' | 'female' | 'unknown';
  emotion?: EmotionDetection;
  expressions?: FacialExpression[];
}

export interface EmotionDetection {
  dominant: EmotionType;
  scores: Record<EmotionType, number>;
  confidence: number;
}

export enum EmotionType {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  FEARFUL = 'fearful',
  DISGUSTED = 'disgusted',
  SURPRISED = 'surprised',
  CONFUSED = 'confused',
  FOCUSED = 'focused',
  STRESSED = 'stressed',
}

export interface FacialExpression {
  type: ExpressionType;
  intensity: number;
  confidence: number;
}

export enum ExpressionType {
  SMILE = 'smile',
  FROWN = 'frown',
  EYEBROW_RAISE = 'eyebrow_raise',
  SQUINT = 'squint',
  MOUTH_OPEN = 'mouth_open',
  HEAD_TILT = 'head_tilt',
}

export interface FaceRecognitionResult {
  candidateId?: string;
  similarity: number;
  isAuthorized: boolean;
  confidence: number;
  verificationStatus: VerificationStatus;
}

export enum VerificationStatus {
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
  MULTIPLE_FACES = 'multiple_faces',
  NO_FACE = 'no_face',
  POOR_QUALITY = 'poor_quality',
  SUSPICIOUS = 'suspicious',
}

// Gaze Tracking
export interface GazeTrackingResult {
  id: string;
  timestamp: Date;
  sessionId: string;
  gazePoint: GazePoint;
  eyeMovements: EyeMovement[];
  attentionMetrics: AttentionMetrics;
  violations: GazeViolation[];
}

export interface GazePoint {
  x: number; // Screen coordinates
  y: number;
  confidence: number;
  onScreen: boolean;
  screenRegion?: ScreenRegion;
}

export enum ScreenRegion {
  ASSESSMENT_AREA = 'assessment_area',
  BROWSER_TAB = 'browser_tab',
  OUTSIDE_BROWSER = 'outside_browser',
  SECONDARY_MONITOR = 'secondary_monitor',
  UNKNOWN = 'unknown',
}

export interface EyeMovement {
  type: EyeMovementType;
  duration: number; // milliseconds
  velocity: number;
  amplitude: number;
  startPoint: Point2D;
  endPoint: Point2D;
}

export enum EyeMovementType {
  FIXATION = 'fixation',
  SACCADE = 'saccade',
  SMOOTH_PURSUIT = 'smooth_pursuit',
  MICROSACCADE = 'microsaccade',
  BLINK = 'blink',
}

export interface AttentionMetrics {
  focusScore: number; // 0-100
  distractionEvents: number;
  averageFixationDuration: number;
  scanPattern: ScanPattern;
  cognitiveLoad: CognitiveLoadLevel;
}

export enum ScanPattern {
  SYSTEMATIC = 'systematic',
  RANDOM = 'random',
  FOCUSED = 'focused',
  SCATTERED = 'scattered',
  REPETITIVE = 'repetitive',
}

export enum CognitiveLoadLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  OVERLOADED = 'overloaded',
}

export interface GazeViolation {
  type: GazeViolationType;
  severity: ViolationSeverity;
  duration: number;
  timestamp: Date;
  description: string;
  evidence?: string; // Base64 encoded screenshot
}

export enum GazeViolationType {
  LOOKING_AWAY = 'looking_away',
  MULTIPLE_SCREENS = 'multiple_screens',
  READING_ASSISTANCE = 'reading_assistance',
  SUSPICIOUS_BEHAVIOR = 'suspicious_behavior',
  PROLONGED_ABSENCE = 'prolonged_absence',
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Audio Analysis
export interface AudioAnalysisResult {
  id: string;
  timestamp: Date;
  sessionId: string;
  audioFeatures: AudioFeatures;
  speechAnalysis?: SpeechAnalysis;
  environmentalAnalysis: EnvironmentalAudioAnalysis;
  violations: AudioViolation[];
}

export interface AudioFeatures {
  volume: AudioVolumeMetrics;
  frequency: FrequencyAnalysis;
  quality: AudioQualityMetrics;
  patterns: AudioPattern[];
}

export interface AudioVolumeMetrics {
  rms: number; // Root Mean Square
  peak: number;
  average: number;
  silenceRatio: number;
  dynamicRange: number;
}

export interface FrequencyAnalysis {
  fundamentalFrequency: number;
  harmonics: number[];
  spectralCentroid: number;
  spectralRolloff: number;
  mfcc: number[]; // Mel-Frequency Cepstral Coefficients
}

export interface AudioQualityMetrics {
  snr: number; // Signal-to-noise ratio
  clarity: number;
  distortion: number;
  backgroundNoise: number;
}

export interface AudioPattern {
  type: AudioPatternType;
  confidence: number;
  duration: number;
  intensity: number;
}

export enum AudioPatternType {
  HUMAN_SPEECH = 'human_speech',
  MULTIPLE_VOICES = 'multiple_voices',
  KEYBOARD_TYPING = 'keyboard_typing',
  PHONE_RING = 'phone_ring',
  BACKGROUND_MUSIC = 'background_music',
  ENVIRONMENTAL_NOISE = 'environmental_noise',
  ELECTRONIC_DEVICE = 'electronic_device',
  PAPER_RUSTLING = 'paper_rustling',
}

export interface SpeechAnalysis {
  hasDirectSpeech: boolean;
  speakerCount: number;
  language?: string;
  confidence: number;
  transcription?: string;
  sentiment?: SentimentAnalysis;
}

export interface SentimentAnalysis {
  overall: SentimentType;
  confidence: number;
  emotions: Record<EmotionType, number>;
}

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed',
}

export interface EnvironmentalAudioAnalysis {
  roomSize: RoomSizeEstimate;
  acousticProperties: AcousticProperties;
  backgroundActivity: BackgroundActivity[];
  locationIndicators: LocationIndicator[];
}

export enum RoomSizeEstimate {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  OPEN_SPACE = 'open_space',
  UNKNOWN = 'unknown',
}

export interface AcousticProperties {
  reverberation: number;
  echo: number;
  dampening: number;
  resonance: number;
}

export interface BackgroundActivity {
  type: BackgroundActivityType;
  intensity: number;
  confidence: number;
  duration: number;
}

export enum BackgroundActivityType {
  CONVERSATION = 'conversation',
  TELEVISION = 'television',
  TRAFFIC = 'traffic',
  CONSTRUCTION = 'construction',
  PETS = 'pets',
  APPLIANCES = 'appliances',
  CHILDREN = 'children',
  OFFICE_ENVIRONMENT = 'office_environment',
}

export interface LocationIndicator {
  type: LocationType;
  confidence: number;
  evidence: string[];
}

export enum LocationType {
  HOME = 'home',
  OFFICE = 'office',
  LIBRARY = 'library',
  CAFE = 'cafe',
  PUBLIC_SPACE = 'public_space',
  EDUCATIONAL_INSTITUTION = 'educational_institution',
  UNKNOWN = 'unknown',
}

export interface AudioViolation {
  type: AudioViolationType;
  severity: ViolationSeverity;
  duration: number;
  timestamp: Date;
  description: string;
  confidence: number;
  evidence?: AudioEvidence;
}

export enum AudioViolationType {
  MULTIPLE_SPEAKERS = 'multiple_speakers',
  BACKGROUND_CONVERSATION = 'background_conversation',
  EXTERNAL_ASSISTANCE = 'external_assistance',
  PHONE_CALL = 'phone_call',
  SUSPICIOUS_SOUNDS = 'suspicious_sounds',
  AUDIO_TAMPERING = 'audio_tampering',
  DICTATION_SOFTWARE = 'dictation_software',
}

export interface AudioEvidence {
  audioClip?: string; // Base64 encoded audio segment
  spectralAnalysis?: string; // Base64 encoded spectrogram
  transcription?: string;
  metadata: {
    sampleRate: number;
    duration: number;
    format: string;
  };
}

// Behavioral Analysis
export interface BehaviorAnalysisResult {
  id: string;
  timestamp: Date;
  sessionId: string;
  behaviorPatterns: BehaviorPattern[];
  anomalies: BehaviorAnomaly[];
  riskScore: RiskAssessment;
  recommendedActions: RecommendedAction[];
}

export interface BehaviorPattern {
  type: BehaviorType;
  frequency: number;
  duration: number;
  intensity: number;
  normalcy: number; // 0-1, 1 being most normal
  trend: TrendDirection;
}

export enum BehaviorType {
  TYPING_RHYTHM = 'typing_rhythm',
  MOUSE_MOVEMENT = 'mouse_movement',
  HEAD_MOVEMENT = 'head_movement',
  POSTURE_CHANGE = 'posture_change',
  BREAK_TAKING = 'break_taking',
  QUESTION_NAVIGATION = 'question_navigation',
  ANSWER_MODIFICATION = 'answer_modification',
  TIME_MANAGEMENT = 'time_management',
}

export enum TrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile',
}

export interface BehaviorAnomaly {
  type: AnomalyType;
  severity: ViolationSeverity;
  confidence: number;
  description: string;
  timestamp: Date;
  duration: number;
  context: AnomalyContext;
  suggestions: string[];
}

export enum AnomalyType {
  UNUSUAL_SPEED = 'unusual_speed',
  ERRATIC_BEHAVIOR = 'erratic_behavior',
  SUSPICIOUS_PATTERNS = 'suspicious_patterns',
  EXTERNAL_INFLUENCE = 'external_influence',
  TECHNOLOGY_ASSISTANCE = 'technology_assistance',
  KNOWLEDGE_INCONSISTENCY = 'knowledge_inconsistency',
  COLLABORATION_INDICATORS = 'collaboration_indicators',
}

export interface AnomalyContext {
  timeInAssessment: number;
  questionType: string;
  difficultyLevel: string;
  previousBehaviour: BehaviorSummary;
  environmentalFactors: string[];
}

export interface BehaviorSummary {
  averageResponseTime: number;
  consistencyScore: number;
  confidenceLevel: number;
  stressIndicators: number;
}

export interface RiskAssessment {
  overall: number; // 0-100
  categories: Record<RiskCategory, number>;
  factors: RiskFactor[];
  recommendation: RiskRecommendation;
}

export enum RiskCategory {
  IDENTITY_VERIFICATION = 'identity_verification',
  EXTERNAL_ASSISTANCE = 'external_assistance',
  UNAUTHORIZED_RESOURCES = 'unauthorized_resources',
  TECHNICAL_VIOLATIONS = 'technical_violations',
  BEHAVIORAL_ANOMALIES = 'behavioral_anomalies',
}

export interface RiskFactor {
  category: RiskCategory;
  factor: string;
  impact: number; // 0-10
  confidence: number;
  evidence: string[];
}

export enum RiskRecommendation {
  ACCEPT = 'accept',
  REVIEW = 'review',
  FLAG = 'flag',
  REJECT = 'reject',
  INVESTIGATE = 'investigate',
}

export interface RecommendedAction {
  type: ActionType;
  priority: ActionPriority;
  description: string;
  automated: boolean;
  deadline?: Date;
}

export enum ActionType {
  NOTIFY_PROCTOR = 'notify_proctor',
  RECORD_EVIDENCE = 'record_evidence',
  PAUSE_ASSESSMENT = 'pause_assessment',
  REQUEST_VERIFICATION = 'request_verification',
  ESCALATE_REVIEW = 'escalate_review',
  LOG_INCIDENT = 'log_incident',
  GENERATE_REPORT = 'generate_report',
}

export enum ActionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// AI Processing Pipeline
export interface AIProcessingRequest {
  id: string;
  sessionId: string;
  userId: string;
  assessmentId: string;
  inputData: ProcessingInputData;
  configuration: AIProcessingConfig;
  priority: ProcessingPriority;
  timestamp: Date;
}

export interface ProcessingInputData {
  video?: VideoFrameData;
  audio?: AudioSegmentData;
  metadata?: ProcessingMetadata;
}

export interface VideoFrameData {
  frameBuffer: ArrayBuffer | string; // Base64 for JSON transport
  timestamp: number;
  frameNumber: number;
  width: number;
  height: number;
  format: VideoFormat;
}

export enum VideoFormat {
  RGB = 'rgb',
  RGBA = 'rgba',
  YUV = 'yuv',
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
}

export interface AudioSegmentData {
  audioBuffer: ArrayBuffer | string; // Base64 for JSON transport
  timestamp: number;
  duration: number;
  sampleRate: number;
  channels: number;
  format: AudioFormat;
}

export enum AudioFormat {
  PCM = 'pcm',
  WAV = 'wav',
  MP3 = 'mp3',
  AAC = 'aac',
  OGG = 'ogg',
}

export interface ProcessingMetadata {
  sessionContext: SessionContext;
  deviceInfo: DeviceInfo;
  environmentalContext: EnvironmentalContext;
}

export interface SessionContext {
  assessmentType: string;
  questionIndex: number;
  timeRemaining: number;
  previousViolations: number;
  candidateProfile: CandidateProfile;
}

export interface CandidateProfile {
  id: string;
  historicalBehavior?: BehaviorSummary;
  accommodations?: AssessmentAccommodation[];
  riskLevel: string;
}

export interface AssessmentAccommodation {
  type: AccommodationType;
  description: string;
  parameters: Record<string, any>;
}

export enum AccommodationType {
  EXTRA_TIME = 'extra_time',
  BREAKS_ALLOWED = 'breaks_allowed',
  ASSISTIVE_TECHNOLOGY = 'assistive_technology',
  MODIFIED_INTERFACE = 'modified_interface',
  ALTERNATIVE_FORMAT = 'alternative_format',
}

export interface DeviceInfo {
  camera: CameraInfo;
  microphone: MicrophoneInfo;
  screen: ScreenInfo;
  browser: BrowserInfo;
}

export interface CameraInfo {
  resolution: string;
  frameRate: number;
  quality: StreamQuality;
  lighting: LightingCondition;
}

export enum LightingCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  TOO_DARK = 'too_dark',
  TOO_BRIGHT = 'too_bright',
}

export interface MicrophoneInfo {
  sensitivity: number;
  noiseLevel: number;
  quality: AudioQualityLevel;
}

export enum AudioQualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export interface ScreenInfo {
  resolution: string;
  multipleScreens: boolean;
  screenCount: number;
}

export interface BrowserInfo {
  userAgent: string;
  version: string;
  extensions: string[];
  permissions: BrowserPermission[];
}

export interface BrowserPermission {
  name: string;
  granted: boolean;
  required: boolean;
}

export interface EnvironmentalContext {
  location: LocationEstimate;
  timeOfDay: string;
  networkQuality: NetworkQuality;
  externalFactors: ExternalFactor[];
}

export interface LocationEstimate {
  type: LocationType;
  confidence: number;
  timezone: string;
  indicators: string[];
}

export interface NetworkQuality {
  bandwidth: number;
  latency: number;
  stability: NetworkStability;
  vpnDetected: boolean;
}

export enum NetworkStability {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  UNSTABLE = 'unstable',
}

export interface ExternalFactor {
  type: ExternalFactorType;
  impact: number;
  description: string;
}

export enum ExternalFactorType {
  WEATHER = 'weather',
  CONSTRUCTION = 'construction',
  EVENTS = 'events',
  TECHNICAL_ISSUES = 'technical_issues',
  POWER_OUTAGE = 'power_outage',
}

export interface AIProcessingConfig {
  models: AIModelConfig[];
  processing: ProcessingSettings;
  output: OutputSettings;
  performance: PerformanceSettings;
}

export interface ProcessingSettings {
  realTime: boolean;
  batchSize: number;
  intervalMs: number;
  confidenceThreshold: number;
  enablePreprocessing: boolean;
  preprocessingOptions: PreprocessingOptions;
}

export interface PreprocessingOptions {
  imageEnhancement: boolean;
  noiseReduction: boolean;
  normalization: boolean;
  augmentation: boolean;
}

export interface OutputSettings {
  includeRawResults: boolean;
  includeProbabilities: boolean;
  includeEvidence: boolean;
  compressionLevel: number;
  formatVersion: string;
}

export interface PerformanceSettings {
  maxLatency: number;
  targetThroughput: number;
  resourceLimits: ResourceLimits;
  fallbackStrategy: FallbackStrategy;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxGpuPercent: number;
  maxDiskMB: number;
}

export enum FallbackStrategy {
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  SKIP_PROCESSING = 'skip_processing',
  USE_CACHED_RESULTS = 'use_cached_results',
  REDUCE_QUALITY = 'reduce_quality',
}

export enum ProcessingPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  REALTIME = 'realtime',
}

// AI Processing Response
export interface AIProcessingResponse {
  id: string;
  requestId: string;
  sessionId: string;
  timestamp: Date;
  processingTime: number;
  results: AIAnalysisResults;
  performance: ProcessingPerformance;
  errors?: ProcessingError[];
}

export interface AIAnalysisResults {
  faceDetection?: FaceDetectionResult;
  gazeTracking?: GazeTrackingResult;
  audioAnalysis?: AudioAnalysisResult;
  behaviorAnalysis?: BehaviorAnalysisResult;
  aggregated: AggregatedAnalysis;
}

export interface AggregatedAnalysis {
  overallRiskScore: number;
  violationsSummary: ViolationsSummary;
  recommendedActions: RecommendedAction[];
  confidenceMetrics: ConfidenceMetrics;
}

export interface ViolationsSummary {
  total: number;
  bySeverity: Record<ViolationSeverity, number>;
  byType: Record<string, number>;
  timeline: ViolationTimelineEntry[];
}

export interface ViolationTimelineEntry {
  timestamp: Date;
  type: string;
  severity: ViolationSeverity;
  description: string;
}

export interface ConfidenceMetrics {
  overall: number;
  byModel: Record<AIModelType, number>;
  reliability: ReliabilityScore;
}

export interface ReliabilityScore {
  dataQuality: number;
  modelPerformance: number;
  consistency: number;
  coverage: number;
}

export interface ProcessingPerformance {
  totalTime: number;
  breakdown: ProcessingTimeBreakdown;
  resourceUsage: ResourceUsage;
  throughput: ThroughputMetrics;
}

export interface ProcessingTimeBreakdown {
  preprocessing: number;
  inference: number;
  postprocessing: number;
  networking: number;
}

export interface ResourceUsage {
  memory: MemoryUsage;
  cpu: CpuUsage;
  gpu?: GpuUsage;
  disk: DiskUsage;
}

export interface MemoryUsage {
  peak: number;
  average: number;
  allocated: number;
  freed: number;
}

export interface CpuUsage {
  average: number;
  peak: number;
  cores: number;
}

export interface GpuUsage {
  utilization: number;
  memoryUsed: number;
  temperature: number;
}

export interface DiskUsage {
  read: number;
  write: number;
  iops: number;
}

export interface ThroughputMetrics {
  framesPerSecond: number;
  samplesPerSecond: number;
  requestsPerSecond: number;
}

export interface ProcessingError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  model?: AIModelType;
  timestamp: Date;
  context?: any;
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Service Configuration
export interface AIAnalysisServiceOptions {
  models: AIModelConfig[];
  processing: GlobalProcessingSettings;
  storage: AIStorageOptions;
  monitoring: AIMonitoringOptions;
  security: AISecurityOptions;
}

export interface GlobalProcessingSettings {
  defaultPriority: ProcessingPriority;
  maxConcurrentRequests: number;
  queueSettings: QueueSettings;
  retryPolicy: RetryPolicy;
}

export interface QueueSettings {
  maxSize: number;
  timeoutMs: number;
  priorityLevels: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface AIStorageOptions {
  results: {
    enabled: boolean;
    retentionDays: number;
    compressionEnabled: boolean;
  };
  evidence: {
    enabled: boolean;
    formats: string[];
    maxSizeMB: number;
  };
  models: {
    cachePath: string;
    autoUpdate: boolean;
    updateIntervalHours: number;
  };
}

export interface AIMonitoringOptions {
  performance: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: AlertThresholds;
  };
  accuracy: {
    enabled: boolean;
    samplingRate: number;
    benchmarkDataset?: string;
  };
  logging: {
    level: LogLevel;
    includeRequestData: boolean;
    includeResponseData: boolean;
  };
}

export interface AlertThresholds {
  maxLatencyMs: number;
  minAccuracy: number;
  maxErrorRate: number;
  maxMemoryUsageMB: number;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface AISecurityOptions {
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotationDays: number;
  };
  privacy: {
    dataMinimization: boolean;
    anonymization: boolean;
    retentionPolicy: RetentionPolicy;
  };
  access: {
    authentication: boolean;
    authorization: AuthorizationSettings;
    auditLogging: boolean;
  };
}

export interface RetentionPolicy {
  personalData: number; // days
  analysisResults: number; // days
  evidence: number; // days
  logs: number; // days
}

export interface AuthorizationSettings {
  roles: string[];
  permissions: Record<string, string[]>;
  sessionBased: boolean;
}
