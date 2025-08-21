/**
 * Epic 5 Task 5.3: Bias Detection - Comprehensive Type Definitions
 *
 * Enterprise-grade bias detection system with statistical analysis,
 * demographic monitoring, compliance reporting, and remediation recommendations.
 *
 * Features:
 * - Statistical bias detection algorithms with confidence intervals
 * - Protected characteristic analysis (age, gender, ethnicity, etc.)
 * - Adverse impact ratio calculations with EEOC compliance
 * - Intersectional bias analysis for multiple protected characteristics
 * - Temporal bias trend monitoring and alerts
 * - Machine learning fairness metrics (demographic parity, equalized odds)
 * - Bias remediation recommendations with implementation guidance
 * - Compliance reporting for regulatory requirements (EEOC, GDPR, etc.)
 * - Real-time bias monitoring with automatic alerts
 * - Historical bias pattern analysis and trend identification
 */

import { PerformanceMetric, TrendDirection } from './performance-analytics.types';

/**
 * Local type definitions for bias detection system
 * These complement the performance analytics types
 */

// Time range for analysis
export interface TimeRange {
  startDate: Date;
  endDate: Date;
  period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
  timezone?: string;
}

// Statistical significance levels
export enum StatisticalSignificance {
  NOT_SIGNIFICANT = 'NOT_SIGNIFICANT',
  MARGINALLY_SIGNIFICANT = 'MARGINALLY_SIGNIFICANT',
  SIGNIFICANT = 'SIGNIFICANT',
  HIGHLY_SIGNIFICANT = 'HIGHLY_SIGNIFICANT',
  EXTREMELY_SIGNIFICANT = 'EXTREMELY_SIGNIFICANT',
}

// Metric value with statistical properties
export interface MetricValue {
  value: number;
  standardError?: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number;
  };
  sampleSize?: number;
  unit?: string;
  timestamp?: Date;
}

// Report formats
export enum ReportFormat {
  PDF = 'PDF',
  HTML = 'HTML',
  CSV = 'CSV',
  JSON = 'JSON',
  XLSX = 'XLSX',
  DOCX = 'DOCX',
}

// Basic dashboard configuration
export interface DashboardConfiguration {
  id: string;
  name: string;
  description: string;
  widgets: {
    id: string;
    type: string;
    title: string;
    position: { x: number; y: number; width: number; height: number };
    config: Record<string, any>;
  }[];
  layout: 'GRID' | 'FLOW' | 'CUSTOM';
  refreshInterval: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics event base interface
export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  userId?: string;
  sessionId?: string;
  organizationId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Protected characteristics for bias analysis
 * Covers major demographic categories for comprehensive bias detection
 */
export enum ProtectedCharacteristic {
  AGE = 'AGE',
  GENDER = 'GENDER',
  ETHNICITY = 'ETHNICITY',
  RACE = 'RACE',
  RELIGION = 'RELIGION',
  SEXUAL_ORIENTATION = 'SEXUAL_ORIENTATION',
  DISABILITY_STATUS = 'DISABILITY_STATUS',
  VETERAN_STATUS = 'VETERAN_STATUS',
  NATIONALITY = 'NATIONALITY',
  EDUCATION_LEVEL = 'EDUCATION_LEVEL',
  SOCIOECONOMIC_STATUS = 'SOCIOECONOMIC_STATUS',
  GEOGRAPHIC_LOCATION = 'GEOGRAPHIC_LOCATION',
  LANGUAGE_PROFICIENCY = 'LANGUAGE_PROFICIENCY',
  PARENTAL_STATUS = 'PARENTAL_STATUS',
  MARITAL_STATUS = 'MARITAL_STATUS',
}

/**
 * Types of bias detection algorithms and statistical tests
 */
export enum BiasDetectionAlgorithm {
  // Basic statistical tests
  CHI_SQUARE_TEST = 'CHI_SQUARE_TEST',
  FISHERS_EXACT_TEST = 'FISHERS_EXACT_TEST',
  T_TEST = 'T_TEST',
  ANOVA = 'ANOVA',
  KOLMOGOROV_SMIRNOV = 'KOLMOGOROV_SMIRNOV',

  // Advanced bias detection methods
  ADVERSE_IMPACT_RATIO = 'ADVERSE_IMPACT_RATIO',
  DEMOGRAPHIC_PARITY = 'DEMOGRAPHIC_PARITY',
  EQUALIZED_ODDS = 'EQUALIZED_ODDS',
  EQUALIZED_OPPORTUNITY = 'EQUALIZED_OPPORTUNITY',
  CALIBRATION = 'CALIBRATION',

  // Machine learning fairness metrics
  INDIVIDUAL_FAIRNESS = 'INDIVIDUAL_FAIRNESS',
  COUNTERFACTUAL_FAIRNESS = 'COUNTERFACTUAL_FAIRNESS',
  CAUSAL_FAIRNESS = 'CAUSAL_FAIRNESS',

  // Intersectional analysis
  INTERSECTIONAL_ANALYSIS = 'INTERSECTIONAL_ANALYSIS',
  MULTI_DIMENSIONAL_FAIRNESS = 'MULTI_DIMENSIONAL_FAIRNESS',
}

/**
 * Severity levels for detected bias
 */
export enum BiasSeverity {
  NONE = 'NONE',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Bias detection contexts where analysis can be applied
 */
export enum BiasContext {
  ASSESSMENT_SCORING = 'ASSESSMENT_SCORING',
  QUESTION_SELECTION = 'QUESTION_SELECTION',
  TIME_ALLOCATION = 'TIME_ALLOCATION',
  INTERVIEW_SCHEDULING = 'INTERVIEW_SCHEDULING',
  CANDIDATE_RANKING = 'CANDIDATE_RANKING',
  FEEDBACK_GENERATION = 'FEEDBACK_GENERATION',
  PROCTORING_DECISIONS = 'PROCTORING_DECISIONS',
  SYSTEM_RECOMMENDATIONS = 'SYSTEM_RECOMMENDATIONS',
  OVERALL_HIRING_PROCESS = 'OVERALL_HIRING_PROCESS',
}

/**
 * Types of bias patterns that can be detected
 */
export enum BiasPattern {
  SYSTEMATIC_UNDERPERFORMANCE = 'SYSTEMATIC_UNDERPERFORMANCE',
  SYSTEMATIC_OVERPERFORMANCE = 'SYSTEMATIC_OVERPERFORMANCE',
  SELECTION_BIAS = 'SELECTION_BIAS',
  EVALUATION_BIAS = 'EVALUATION_BIAS',
  TEMPORAL_BIAS = 'TEMPORAL_BIAS',
  INTERSECTIONAL_BIAS = 'INTERSECTIONAL_BIAS',
  ALGORITHMIC_BIAS = 'ALGORITHMIC_BIAS',
  CULTURAL_BIAS = 'CULTURAL_BIAS',
  LINGUISTIC_BIAS = 'LINGUISTIC_BIAS',
  ACCESSIBILITY_BIAS = 'ACCESSIBILITY_BIAS',
}

/**
 * Remediation strategies for addressing detected bias
 */
export enum RemediationStrategy {
  // Data-based remediation
  DATA_AUGMENTATION = 'DATA_AUGMENTATION',
  RESAMPLING = 'RESAMPLING',
  BIAS_CORRECTION = 'BIAS_CORRECTION',

  // Algorithm-based remediation
  FAIRNESS_CONSTRAINTS = 'FAIRNESS_CONSTRAINTS',
  ADVERSARIAL_DEBIASING = 'ADVERSARIAL_DEBIASING',
  POST_PROCESSING = 'POST_PROCESSING',

  // Process-based remediation
  DIVERSE_REVIEW_PANELS = 'DIVERSE_REVIEW_PANELS',
  BLIND_EVALUATION = 'BLIND_EVALUATION',
  STRUCTURED_INTERVIEWS = 'STRUCTURED_INTERVIEWS',

  // Training and awareness
  BIAS_TRAINING = 'BIAS_TRAINING',
  CULTURAL_COMPETENCY = 'CULTURAL_COMPETENCY',
  INCLUSIVE_DESIGN = 'INCLUSIVE_DESIGN',

  // Monitoring and governance
  CONTINUOUS_MONITORING = 'CONTINUOUS_MONITORING',
  REGULAR_AUDITS = 'REGULAR_AUDITS',
  STAKEHOLDER_FEEDBACK = 'STAKEHOLDER_FEEDBACK',
}

/**
 * Compliance frameworks and standards
 */
export enum ComplianceFramework {
  EEOC_UNIFORM_GUIDELINES = 'EEOC_UNIFORM_GUIDELINES',
  GDPR = 'GDPR',
  CCPA = 'CCPA',
  SOX = 'SOX',
  ISO_27001 = 'ISO_27001',
  NIST_AI_RMF = 'NIST_AI_RMF',
  IEEE_2857 = 'IEEE_2857',
  EU_AI_ACT = 'EU_AI_ACT',
  UK_EQUALITY_ACT = 'UK_EQUALITY_ACT',
  CANADA_AIDA = 'CANADA_AIDA',
}

/**
 * Statistical test result for bias detection
 */
export interface StatisticalTestResult {
  algorithm: BiasDetectionAlgorithm;
  testStatistic: number;
  pValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number; // e.g., 0.95 for 95% confidence
  };
  effectSize: number;
  powerAnalysis: {
    observedPower: number;
    requiredSampleSize: number;
    actualSampleSize: number;
  };
  interpretation: {
    isSignificant: boolean;
    significance: StatisticalSignificance;
    description: string;
    recommendation: string;
  };
}

/**
 * Demographic group information
 */
export interface DemographicGroup {
  characteristic: ProtectedCharacteristic;
  value: string;
  label: string;
  sampleSize: number;
  representation: number; // Percentage of total population
  isMinorityGroup: boolean;
  intersectionalGroups?: string[]; // Other characteristics this group intersects with
}

/**
 * Bias analysis result for a specific demographic comparison
 */
export interface BiasAnalysisResult {
  id: string;
  timestamp: Date;
  context: BiasContext;

  // Groups being compared
  referenceGroup: DemographicGroup;
  comparisonGroup: DemographicGroup;

  // Metrics analyzed
  metric: PerformanceMetric;
  referenceValue: MetricValue;
  comparisonValue: MetricValue;

  // Statistical analysis
  statisticalTests: StatisticalTestResult[];
  adverseImpactRatio: number;

  // Bias assessment
  biasDetected: boolean;
  biasSeverity: BiasSeverity;
  biasPattern: BiasPattern;
  confidence: number; // 0-1 confidence in bias detection

  // Additional context
  sampleSizes: {
    reference: number;
    comparison: number;
    total: number;
  };
  timeRange: TimeRange;
  methodology: string[];
  limitations: string[];
}

/**
 * Intersectional bias analysis for multiple protected characteristics
 */
export interface IntersectionalAnalysis {
  id: string;
  timestamp: Date;
  context: BiasContext;

  // Multiple characteristics being analyzed
  characteristics: ProtectedCharacteristic[];
  intersectionalGroups: {
    groupId: string;
    characteristics: Record<ProtectedCharacteristic, string>;
    sampleSize: number;
    performanceMetrics: Record<string, MetricValue>;
  }[];

  // Analysis results
  overallBiasDetected: boolean;
  individualCharacteristicBias: Record<ProtectedCharacteristic, BiasAnalysisResult>;
  intersectionalBiasEffects: {
    combination: ProtectedCharacteristic[];
    additionalBiasEffect: number;
    compoundingFactor: number;
    explanation: string;
  }[];

  // Statistical modeling
  regressionAnalysis: {
    modelType: string;
    coefficients: Record<string, number>;
    significance: Record<string, number>;
    adjustedRSquared: number;
    multicollinearity: Record<string, number>;
  };

  recommendations: RemediationRecommendation[];
}

/**
 * Temporal bias trend analysis
 */
export interface TemporalBiasAnalysis {
  id: string;
  characteristic: ProtectedCharacteristic;
  context: BiasContext;
  timeRange: TimeRange;

  // Trend data
  trendData: {
    timestamp: Date;
    biasMetric: number;
    sampleSize: number;
    confidence: number;
  }[];

  // Trend analysis
  overallTrend: TrendDirection;
  trendSignificance: StatisticalSignificance;
  changePoints: {
    timestamp: Date;
    changeType: 'IMPROVEMENT' | 'DETERIORATION' | 'SHIFT';
    magnitude: number;
    explanation?: string;
  }[];

  // Seasonality and patterns
  seasonalPatterns: {
    period: string; // e.g., 'monthly', 'quarterly'
    strength: number;
    peakTimes: string[];
    explanation: string;
  }[];

  // Predictions
  forecast: {
    timestamp: Date;
    predictedBiasMetric: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }[];

  alerts: BiasAlert[];
}

/**
 * Machine learning fairness metrics
 */
export interface MLFairnessMetrics {
  id: string;
  modelId: string;
  timestamp: Date;

  // Demographic parity metrics
  demographicParity: {
    overallScore: number;
    groupScores: Record<string, number>;
    threshold: number;
    isPassing: boolean;
  };

  // Equal opportunity metrics
  equalizedOpportunity: {
    truePositiveRates: Record<string, number>;
    difference: number;
    threshold: number;
    isPassing: boolean;
  };

  // Equalized odds
  equalizedOdds: {
    truePositiveRates: Record<string, number>;
    falsePositiveRates: Record<string, number>;
    maxDifference: number;
    threshold: number;
    isPassing: boolean;
  };

  // Calibration metrics
  calibration: {
    groupCalibrationScores: Record<string, number>;
    overallCalibration: number;
    isPassing: boolean;
  };

  // Individual fairness
  individualFairness: {
    averageConsistency: number;
    worstCaseConsistency: number;
    threshold: number;
    isPassing: boolean;
  };

  // Overall fairness assessment
  overallFairness: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    passingMetrics: number;
    totalMetrics: number;
    recommendations: string[];
  };
}

/**
 * Bias alert configuration and instance
 */
export interface BiasAlert {
  id: string;
  timestamp: Date;
  severity: BiasSeverity;
  type: 'THRESHOLD_EXCEEDED' | 'TREND_DETECTED' | 'ANOMALY_FOUND' | 'COMPLIANCE_VIOLATION';

  // Alert details
  title: string;
  description: string;
  affectedGroups: DemographicGroup[];
  context: BiasContext;
  metric: PerformanceMetric;
  currentValue: number;
  thresholdValue: number;

  // Alert configuration
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;

  // Associated analysis
  analysisId: string;
  recommendations: RemediationRecommendation[];

  // Escalation
  escalationLevel: number;
  notifiedUsers: string[];
  nextEscalationAt?: Date;
}

/**
 * Bias remediation recommendation
 */
export interface RemediationRecommendation {
  id: string;
  timestamp: Date;
  analysisId: string;

  // Recommendation details
  strategy: RemediationStrategy;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  rationale: string;

  // Implementation guidance
  implementationSteps: {
    step: number;
    title: string;
    description: string;
    estimatedEffort: string;
    requiredResources: string[];
    timeline: string;
  }[];

  // Expected impact
  expectedImpact: {
    biasReduction: number; // Expected percentage reduction in bias
    timeToImpact: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    sideEffects: string[];
  };

  // Monitoring and validation
  successMetrics: {
    metric: string;
    currentValue: number;
    targetValue: number;
    measurementMethod: string;
  }[];

  // Implementation tracking
  status: 'PROPOSED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  assignedTo?: string;
  implementedAt?: Date;
  validatedAt?: Date;
  effectiveness?: number; // Actual bias reduction achieved
}

/**
 * Comprehensive bias detection configuration
 */
export interface BiasDetectionConfiguration {
  id: string;
  organizationId: string;
  name: string;
  description: string;

  // Detection scope
  enabledCharacteristics: ProtectedCharacteristic[];
  enabledContexts: BiasContext[];
  enabledAlgorithms: BiasDetectionAlgorithm[];

  // Analysis parameters
  statisticalThresholds: {
    significanceLevel: number; // e.g., 0.05
    effectSizeThreshold: number;
    adverseImpactThreshold: number; // e.g., 0.8 for 80% rule
    sampleSizeRequirement: number;
  };

  // Alert configuration
  alertThresholds: Record<BiasSeverity, number>;
  alertFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  notificationChannels: ('EMAIL' | 'SLACK' | 'SMS' | 'DASHBOARD')[];

  // Compliance requirements
  complianceFrameworks: ComplianceFramework[];
  reportingFrequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  auditTrailRetention: number; // Days

  // Advanced settings
  intersectionalAnalysis: boolean;
  temporalAnalysis: boolean;
  mlFairnessMetrics: boolean;
  automaticRemediation: boolean;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Bias detection dashboard widget configurations
 */
export interface BiasDetectionDashboard extends DashboardConfiguration {
  // Bias-specific widgets
  widgets: (DashboardConfiguration['widgets'][0] & {
    type:
      | 'BIAS_OVERVIEW'
      | 'PROTECTED_CHARACTERISTICS'
      | 'ADVERSE_IMPACT'
      | 'TEMPORAL_TRENDS'
      | 'INTERSECTIONAL_ANALYSIS'
      | 'ML_FAIRNESS'
      | 'ACTIVE_ALERTS'
      | 'REMEDIATION_PROGRESS'
      | 'COMPLIANCE_STATUS'
      | 'STATISTICAL_TESTS'
      | 'DEMOGRAPHIC_BREAKDOWN';

    biasSpecificConfig?: {
      characteristics?: ProtectedCharacteristic[];
      contexts?: BiasContext[];
      severityFilter?: BiasSeverity[];
      timeAggregation?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
      showConfidenceIntervals?: boolean;
      includeIntersectionalData?: boolean;
    };
  })[];

  // Dashboard-level bias settings
  defaultCharacteristics: ProtectedCharacteristic[];
  defaultTimeRange: TimeRange;
  autoRefreshInterval: number; // Seconds
  alertIntegration: boolean;
}

/**
 * Comprehensive bias detection report
 */
export interface BiasDetectionReport {
  id: string;
  organizationId: string;
  title: string;
  reportType:
    | 'COMPREHENSIVE'
    | 'EXECUTIVE_SUMMARY'
    | 'TECHNICAL_DETAIL'
    | 'COMPLIANCE'
    | 'REMEDIATION_PROGRESS';

  // Report metadata
  generatedAt: Date;
  generatedBy: string;
  timeRange: TimeRange;
  version: string;

  // Executive summary
  executiveSummary: {
    overallBiasStatus: 'COMPLIANT' | 'CONCERNING' | 'NON_COMPLIANT';
    keyFindings: string[];
    criticalIssues: number;
    highPriorityRecommendations: number;
    complianceScore: number; // 0-100
    trendDirection: TrendDirection;
  };

  // Detailed analysis
  characteristicAnalysis: Record<
    ProtectedCharacteristic,
    {
      overallStatus: BiasSeverity;
      keyMetrics: Record<string, MetricValue>;
      significantFindings: BiasAnalysisResult[];
      trendAnalysis: TemporalBiasAnalysis;
      recommendations: RemediationRecommendation[];
    }
  >;

  // Context-specific analysis
  contextAnalysis: Record<
    BiasContext,
    {
      biasDetected: boolean;
      affectedCharacteristics: ProtectedCharacteristic[];
      severity: BiasSeverity;
      keyFindings: string[];
    }
  >;

  // Intersectional analysis
  intersectionalFindings: IntersectionalAnalysis[];

  // ML fairness assessment
  mlFairnessAssessment?: MLFairnessMetrics[];

  // Compliance assessment
  complianceAssessment: Record<
    ComplianceFramework,
    {
      status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
      score: number;
      requirements: {
        requirement: string;
        status: boolean;
        evidence: string[];
        gaps: string[];
      }[];
      recommendations: string[];
    }
  >;

  // Remediation tracking
  remediationProgress: {
    totalRecommendations: number;
    implementedRecommendations: number;
    inProgressRecommendations: number;
    overallEffectiveness: number;
    estimatedCompletionDate?: Date;
  };

  // Statistical appendix
  statisticalAppendix: {
    methodologyNotes: string[];
    limitations: string[];
    dataQualityAssessment: {
      completeness: number;
      accuracy: number;
      consistency: number;
      timeliness: number;
    };
    sampleSizeAnalysis: Record<
      ProtectedCharacteristic,
      {
        actualSize: number;
        requiredSize: number;
        adequacy: 'ADEQUATE' | 'MARGINAL' | 'INADEQUATE';
      }
    >;
  };

  // Export options
  exportFormats: ReportFormat[];
  attachments: {
    filename: string;
    type: string;
    size: number;
    description: string;
  }[];
}

/**
 * Bias detection service events for real-time monitoring
 */
export interface BiasDetectionEvent extends AnalyticsEvent {
  eventType:
    | 'BIAS_DETECTED'
    | 'ALERT_TRIGGERED'
    | 'REMEDIATION_APPLIED'
    | 'COMPLIANCE_CHECK'
    | 'THRESHOLD_UPDATED'
    | 'AUDIT_COMPLETED';

  biasSpecificData: {
    characteristic?: ProtectedCharacteristic;
    context?: BiasContext;
    severity?: BiasSeverity;
    analysisId?: string;
    affectedUsers?: number;
    remediationId?: string;
    complianceFramework?: ComplianceFramework;
  };
}

/**
 * API request/response types for bias detection endpoints
 */
export interface CreateBiasAnalysisRequest {
  organizationId: string;
  context: BiasContext;
  characteristics: ProtectedCharacteristic[];
  algorithms: BiasDetectionAlgorithm[];
  timeRange: TimeRange;
  includeIntersectional?: boolean;
  configuration?: Partial<BiasDetectionConfiguration>;
}

export interface BiasAnalysisResponse {
  analysisId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  results?: BiasAnalysisResult[];
  intersectionalAnalysis?: IntersectionalAnalysis;
  temporalAnalysis?: TemporalBiasAnalysis;
  mlFairnessMetrics?: MLFairnessMetrics;
  alerts?: BiasAlert[];
  recommendations?: RemediationRecommendation[];
  estimatedCompletionTime?: Date;
  progress?: number; // 0-100
}

export interface BiasDashboardRequest {
  organizationId: string;
  characteristics?: ProtectedCharacteristic[];
  contexts?: BiasContext[];
  timeRange?: TimeRange;
  includeAlerts?: boolean;
  includeRemediation?: boolean;
  widgetTypes?: string[];
}

export interface BiasDashboardResponse {
  dashboard: BiasDetectionDashboard;
  data: Record<string, any>;
  alerts: BiasAlert[];
  lastUpdated: Date;
  nextUpdate: Date;
}

export interface BiasReportRequest {
  organizationId: string;
  reportType: BiasDetectionReport['reportType'];
  timeRange: TimeRange;
  characteristics?: ProtectedCharacteristic[];
  contexts?: BiasContext[];
  includeRemediation?: boolean;
  complianceFrameworks?: ComplianceFramework[];
  format: ReportFormat;
}

export interface BiasReportResponse {
  reportId: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  report?: BiasDetectionReport;
  downloadUrl?: string;
  expiresAt?: Date;
}

/**
 * Comprehensive bias detection system configuration
 * Integrates all bias detection capabilities into a unified system
 */
export interface BiasDetectionSystem {
  configuration: BiasDetectionConfiguration;
  activeAnalyses: BiasAnalysisResult[];
  intersectionalAnalyses: IntersectionalAnalysis[];
  temporalAnalyses: TemporalBiasAnalysis[];
  mlFairnessMetrics: MLFairnessMetrics[];
  activeAlerts: BiasAlert[];
  remediationRecommendations: RemediationRecommendation[];
  dashboards: BiasDetectionDashboard[];
  complianceStatus: Record<ComplianceFramework, 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT'>;

  // System health and performance
  systemHealth: {
    analysisBacklog: number;
    averageAnalysisTime: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    systemUptime: number;
    dataQualityScore: number;
  };

  // Audit trail
  auditTrail: {
    timestamp: Date;
    action: string;
    userId: string;
    details: Record<string, any>;
    ipAddress: string;
  }[];
}

export default {
  ProtectedCharacteristic,
  BiasDetectionAlgorithm,
  BiasSeverity,
  BiasContext,
  BiasPattern,
  RemediationStrategy,
  ComplianceFramework,
};
