/**
 * Performance Analytics Types
 *
 * Comprehensive type definitions for candidate performance analytics,
 * assessment metrics, comparative analysis, trend analysis, and performance
 * prediction models in the analytics engine service.
 *
 * @author Senior Software Engineer
 * @version Epic 5 Task 5.2: Performance Analytics
 */

// ===== PERFORMANCE METRICS =====

/**
 * Core performance metric categories
 */
export enum PerformanceMetricType {
  // Code Quality Metrics
  CODE_QUALITY = 'CODE_QUALITY',
  TEST_COVERAGE = 'TEST_COVERAGE',
  CODE_COMPLEXITY = 'CODE_COMPLEXITY',
  SOLUTION_ELEGANCE = 'SOLUTION_ELEGANCE',

  // Execution Metrics
  EXECUTION_TIME = 'EXECUTION_TIME',
  MEMORY_USAGE = 'MEMORY_USAGE',
  ALGORITHM_EFFICIENCY = 'ALGORITHM_EFFICIENCY',
  RUNTIME_PERFORMANCE = 'RUNTIME_PERFORMANCE',

  // Problem Solving Metrics
  PROBLEM_UNDERSTANDING = 'PROBLEM_UNDERSTANDING',
  SOLUTION_APPROACH = 'SOLUTION_APPROACH',
  DEBUGGING_SKILLS = 'DEBUGGING_SKILLS',
  EDGE_CASE_HANDLING = 'EDGE_CASE_HANDLING',

  // Time Management Metrics
  TIME_TO_FIRST_SOLUTION = 'TIME_TO_FIRST_SOLUTION',
  COMPLETION_RATE = 'COMPLETION_RATE',
  TIME_EFFICIENCY = 'TIME_EFFICIENCY',
  PACING_CONSISTENCY = 'PACING_CONSISTENCY',

  // Behavioral Metrics
  COLLABORATION_SKILLS = 'COLLABORATION_SKILLS',
  COMMUNICATION_CLARITY = 'COMMUNICATION_CLARITY',
  STRESS_HANDLING = 'STRESS_HANDLING',
  ADAPTABILITY = 'ADAPTABILITY',

  // Assessment Specific
  OVERALL_SCORE = 'OVERALL_SCORE',
  DIFFICULTY_PROGRESSION = 'DIFFICULTY_PROGRESSION',
  CONSISTENCY = 'CONSISTENCY',
  IMPROVEMENT_RATE = 'IMPROVEMENT_RATE',
}

/**
 * Performance metric aggregation types
 */
export enum MetricAggregationType {
  AVERAGE = 'AVERAGE',
  MEDIAN = 'MEDIAN',
  MIN = 'MIN',
  MAX = 'MAX',
  SUM = 'SUM',
  COUNT = 'COUNT',
  PERCENTILE_25 = 'PERCENTILE_25',
  PERCENTILE_75 = 'PERCENTILE_75',
  PERCENTILE_90 = 'PERCENTILE_90',
  PERCENTILE_95 = 'PERCENTILE_95',
  STANDARD_DEVIATION = 'STANDARD_DEVIATION',
  VARIANCE = 'VARIANCE',
}

/**
 * Performance analysis time periods
 */
export enum AnalysisPeriod {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

/**
 * Individual performance metric data point
 */
export interface PerformanceMetric {
  id: string;
  type: PerformanceMetricType;
  value: number;
  normalizedValue: number; // 0-1 scale
  percentile: number; // Compared to peer group
  timestamp: Date;

  // Context
  candidateId: string;
  assessmentId: string;
  questionId?: string;
  sessionId?: string;

  // Metadata
  metadata: Record<string, any>;
  tags: string[];
  confidence: number; // Metric reliability score

  // Benchmarking
  benchmarkGroup: string; // e.g., 'mid-level-js', 'senior-python'
  industryPercentile: number;
  companyPercentile: number;
}

/**
 * Aggregated performance metrics
 */
export interface AggregatedMetrics {
  metricType: PerformanceMetricType;
  aggregationType: MetricAggregationType;
  value: number;
  count: number;
  period: AnalysisPeriod;
  startDate: Date;
  endDate: Date;

  // Statistical measures
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;

  // Percentiles
  percentile25: number;
  percentile75: number;
  percentile90: number;
  percentile95: number;

  // Trend indicators
  trend: TrendDirection;
  trendStrength: number; // 0-1
  changeFromPrevious: number;
  changeFromPreviousPercent: number;
}

// ===== CANDIDATE PERFORMANCE =====

/**
 * Comprehensive candidate performance profile
 */
export interface CandidatePerformanceProfile {
  candidateId: string;
  organizationId: string;

  // Core metrics
  overallScore: number;
  overallPercentile: number;
  skillLevel: SkillLevel;

  // Category scores
  technicalSkills: number;
  problemSolving: number;
  codeQuality: number;
  timeManagement: number;
  communication: number;

  // Performance trends
  performanceTrend: TrendDirection;
  improvementRate: number;
  consistencyScore: number;

  // Comparative analysis
  peerComparison: PeerComparison;
  industryComparison: IndustryComparison;
  historicalComparison: HistoricalComparison;

  // Detailed metrics
  metrics: PerformanceMetric[];
  aggregatedMetrics: AggregatedMetrics[];

  // Strengths and weaknesses
  strengths: SkillStrength[];
  weaknesses: SkillWeakness[];
  recommendations: PerformanceRecommendation[];

  // Assessment history
  assessmentHistory: AssessmentPerformanceSummary[];

  // Metadata
  lastUpdated: Date;
  dataQuality: number; // 0-1 based on sample size and consistency
  confidenceLevel: number; // Statistical confidence in profile accuracy
}

/**
 * Skill proficiency levels
 */
export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  JUNIOR = 'JUNIOR',
  MID_LEVEL = 'MID_LEVEL',
  SENIOR = 'SENIOR',
  EXPERT = 'EXPERT',
  MASTER = 'MASTER',
}

/**
 * Trend direction indicators
 */
export enum TrendDirection {
  STRONGLY_DECLINING = 'STRONGLY_DECLINING',
  DECLINING = 'DECLINING',
  STABLE = 'STABLE',
  IMPROVING = 'IMPROVING',
  STRONGLY_IMPROVING = 'STRONGLY_IMPROVING',
}

/**
 * Identified skill strengths
 */
export interface SkillStrength {
  skill: string;
  category: PerformanceMetricType;
  score: number;
  percentile: number;
  evidence: string[];
  confidence: number;
}

/**
 * Identified skill weaknesses
 */
export interface SkillWeakness {
  skill: string;
  category: PerformanceMetricType;
  score: number;
  percentile: number;
  impact: WeaknessImpact;
  recommendations: string[];
}

/**
 * Impact level of weaknesses
 */
export enum WeaknessImpact {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Performance improvement recommendations
 */
export interface PerformanceRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: number; // 0-1
  estimatedTimeframe: string;
  resources: RecommendationResource[];
}

/**
 * Recommendation types
 */
export enum RecommendationType {
  SKILL_DEVELOPMENT = 'SKILL_DEVELOPMENT',
  PRACTICE_FOCUS = 'PRACTICE_FOCUS',
  LEARNING_PATH = 'LEARNING_PATH',
  ASSESSMENT_STRATEGY = 'ASSESSMENT_STRATEGY',
  TIME_MANAGEMENT = 'TIME_MANAGEMENT',
  TECHNICAL_IMPROVEMENT = 'TECHNICAL_IMPROVEMENT',
}

/**
 * Recommendation priority levels
 */
export enum RecommendationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Learning resources
 */
export interface RecommendationResource {
  type: ResourceType;
  title: string;
  url?: string;
  description: string;
  estimatedTime: string;
}

/**
 * Resource types
 */
export enum ResourceType {
  TUTORIAL = 'TUTORIAL',
  DOCUMENTATION = 'DOCUMENTATION',
  PRACTICE_PROBLEM = 'PRACTICE_PROBLEM',
  COURSE = 'COURSE',
  BOOK = 'BOOK',
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
}

// ===== COMPARATIVE ANALYSIS =====

/**
 * Peer group comparison analysis
 */
export interface PeerComparison {
  peerGroupId: string;
  peerGroupName: string;
  peerGroupSize: number;

  // Ranking within peer group
  overallRank: number;
  overallPercentile: number;

  // Category rankings
  categoryRankings: CategoryRanking[];

  // Performance gaps
  strengthGaps: PerformanceGap[];
  weaknessGaps: PerformanceGap[];

  // Comparative insights
  insights: ComparisonInsight[];
}

/**
 * Industry benchmark comparison
 */
export interface IndustryComparison {
  industryId: string;
  industryName: string;
  sampleSize: number;

  // Industry percentiles
  overallIndustryPercentile: number;
  categoryPercentiles: CategoryPercentile[];

  // Market positioning
  marketPosition: MarketPosition;
  competitiveAdvantages: string[];
  improvementOpportunities: string[];
}

/**
 * Historical performance comparison
 */
export interface HistoricalComparison {
  comparisonPeriod: AnalysisPeriod;

  // Performance changes
  overallChange: PerformanceChange;
  categoryChanges: CategoryChange[];

  // Trend analysis
  performanceTrends: TrendAnalysis[];
  milestones: PerformanceMilestone[];

  // Predictions
  projectedPerformance: PerformanceProjection;
}

/**
 * Category performance ranking
 */
export interface CategoryRanking {
  category: PerformanceMetricType;
  rank: number;
  percentile: number;
  score: number;
  peerGroupAverage: number;
  topPerformerScore: number;
}

/**
 * Performance gap analysis
 */
export interface PerformanceGap {
  category: PerformanceMetricType;
  gapSize: number;
  gapPercentage: number;
  significance: GapSignificance;
  recommendations: string[];
}

/**
 * Gap significance levels
 */
export enum GapSignificance {
  NEGLIGIBLE = 'NEGLIGIBLE',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SIGNIFICANT = 'SIGNIFICANT',
  CRITICAL = 'CRITICAL',
}

/**
 * Comparative insights
 */
export interface ComparisonInsight {
  type: InsightType;
  category: PerformanceMetricType;
  description: string;
  significance: number; // 0-1
  evidence: string[];
  actionable: boolean;
}

/**
 * Insight types
 */
export enum InsightType {
  STRENGTH_IDENTIFICATION = 'STRENGTH_IDENTIFICATION',
  WEAKNESS_IDENTIFICATION = 'WEAKNESS_IDENTIFICATION',
  OPPORTUNITY_DETECTION = 'OPPORTUNITY_DETECTION',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  PATTERN_RECOGNITION = 'PATTERN_RECOGNITION',
  ANOMALY_DETECTION = 'ANOMALY_DETECTION',
}

// ===== TREND ANALYSIS =====

/**
 * Comprehensive trend analysis
 */
export interface TrendAnalysis {
  metricType: PerformanceMetricType;
  period: AnalysisPeriod;
  dataPoints: TrendDataPoint[];

  // Trend characteristics
  direction: TrendDirection;
  strength: number; // 0-1
  consistency: number; // 0-1
  volatility: number; // 0-1

  // Statistical measures
  correlation: number; // with time
  rSquared: number; // trend line fit
  slope: number;
  interceptValue: number;

  // Trend predictions
  shortTermPrediction: TrendPrediction;
  longTermPrediction: TrendPrediction;

  // Seasonal patterns
  seasonalityDetected: boolean;
  seasonalPatterns: SeasonalPattern[];

  // Anomalies
  anomalies: TrendAnomaly[];
  outliers: TrendOutlier[];

  // Insights
  trendInsights: TrendInsight[];
  recommendations: TrendRecommendation[];
}

/**
 * Individual trend data point
 */
export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  movingAverage: number;
  expectedValue: number;
  deviation: number;
  confidence: number;
}

/**
 * Trend prediction
 */
export interface TrendPrediction {
  timeframe: string;
  predictedValue: number;
  confidenceInterval: ConfidenceInterval;
  factors: PredictionFactor[];
  reliability: number; // 0-1
}

/**
 * Confidence interval for predictions
 */
export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidenceLevel: number; // e.g., 0.95 for 95%
}

/**
 * Factors influencing predictions
 */
export interface PredictionFactor {
  factor: string;
  influence: number; // -1 to 1
  confidence: number; // 0-1
}

/**
 * Seasonal performance patterns
 */
export interface SeasonalPattern {
  patternType: SeasonalityType;
  cycle: string; // e.g., "weekly", "monthly"
  amplitude: number;
  phase: number;
  confidence: number;
  description: string;
}

/**
 * Types of seasonality
 */
export enum SeasonalityType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Trend anomalies
 */
export interface TrendAnomaly {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: AnomalySeverity;
  possibleCauses: string[];
  impact: string;
}

/**
 * Anomaly severity levels
 */
export enum AnomalySeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

// ===== ASSESSMENT ANALYTICS =====

/**
 * Assessment performance summary
 */
export interface AssessmentPerformanceSummary {
  assessmentId: string;
  assessmentTitle: string;
  completedAt: Date;

  // Scores
  overallScore: number;
  overallPercentile: number;
  categoryScores: CategoryScore[];

  // Time metrics
  totalTime: number;
  averageTimePerQuestion: number;
  timeEfficiency: number;

  // Completion metrics
  completionRate: number;
  questionsAttempted: number;
  questionsCompleted: number;

  // Quality metrics
  codeQualityScore: number;
  solutionElegance: number;
  testCoverageAchieved: number;

  // Behavioral insights
  stressIndicators: StressIndicator[];
  engagementLevel: number;
  focusMetrics: FocusMetrics;

  // Comparative context
  cohortPerformance: CohortPerformance;
  difficultyRating: number;
  industryBenchmark: number;
}

/**
 * Category-specific scores
 */
export interface CategoryScore {
  category: PerformanceMetricType;
  score: number;
  percentile: number;
  weight: number;
  contributionToOverall: number;
}

/**
 * Stress indicators during assessment
 */
export interface StressIndicator {
  type: StressIndicatorType;
  level: number; // 0-1
  timestamp: Date;
  duration: number;
  context: string;
}

/**
 * Types of stress indicators
 */
export enum StressIndicatorType {
  RAPID_TYPING = 'RAPID_TYPING',
  LONG_PAUSES = 'LONG_PAUSES',
  FREQUENT_DELETIONS = 'FREQUENT_DELETIONS',
  TAB_SWITCHING = 'TAB_SWITCHING',
  CAMERA_MOVEMENT = 'CAMERA_MOVEMENT',
  AUDIO_STRESS_MARKERS = 'AUDIO_STRESS_MARKERS',
}

/**
 * Focus and attention metrics
 */
export interface FocusMetrics {
  overallFocusScore: number;
  attentionSpanDuration: number;
  distractionCount: number;
  distractionDuration: number;
  focusIntervals: FocusInterval[];
  concentrationTrend: TrendDirection;
}

/**
 * Individual focus intervals
 */
export interface FocusInterval {
  startTime: Date;
  endTime: Date;
  duration: number;
  focusLevel: number; // 0-1
  qualityScore: number;
}

/**
 * Cohort performance context
 */
export interface CohortPerformance {
  cohortSize: number;
  averageScore: number;
  medianScore: number;
  topScore: number;
  bottomScore: number;
  candidateRank: number;
  candidatePercentile: number;
}

// ===== DASHBOARD & REPORTING =====

/**
 * Analytics dashboard configuration
 */
export interface DashboardConfig {
  dashboardId: string;
  name: string;
  description: string;
  organizationId: string;

  // Layout and widgets
  layout: DashboardLayout;
  widgets: DashboardWidget[];

  // Filters and settings
  defaultFilters: DashboardFilter[];
  refreshInterval: number;
  autoRefresh: boolean;

  // Access control
  visibility: DashboardVisibility;
  allowedRoles: string[];

  // Metadata
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  version: number;
}

/**
 * Dashboard layout structure
 */
export interface DashboardLayout {
  rows: number;
  columns: number;
  widgets: WidgetPosition[];
}

/**
 * Widget positioning
 */
export interface WidgetPosition {
  widgetId: string;
  row: number;
  column: number;
  width: number;
  height: number;
}

/**
 * Dashboard widget definition
 */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  dataSource: DataSourceConfig;
  refreshRate: number;
  interactivity: WidgetInteractivity;
}

/**
 * Widget types
 */
export enum WidgetType {
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  SCATTER_PLOT = 'SCATTER_PLOT',
  HEATMAP = 'HEATMAP',
  TABLE = 'TABLE',
  KPI_CARD = 'KPI_CARD',
  GAUGE = 'GAUGE',
  TREEMAP = 'TREEMAP',
  RADAR_CHART = 'RADAR_CHART',
  FUNNEL_CHART = 'FUNNEL_CHART',
  WATERFALL_CHART = 'WATERFALL_CHART',
}

/**
 * Widget configuration
 */
export interface WidgetConfig {
  chartOptions: Record<string, any>;
  styling: WidgetStyling;
  interactions: WidgetInteraction[];
  annotations: WidgetAnnotation[];
}

/**
 * Widget styling options
 */
export interface WidgetStyling {
  colorScheme: string;
  backgroundColor: string;
  borderColor: string;
  fontSize: number;
  fontFamily: string;
  customCSS: string;
}

// ===== PERFORMANCE PREDICTION =====

/**
 * Performance prediction models
 */
export interface PerformancePredictionModel {
  modelId: string;
  modelName: string;
  modelType: PredictionModelType;
  version: string;

  // Model parameters
  algorithm: MLAlgorithm;
  features: ModelFeature[];
  hyperparameters: Record<string, any>;

  // Training data
  trainingDataSize: number;
  trainingPeriod: DateRange;

  // Model performance
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rmse: number;
  mae: number;

  // Validation metrics
  crossValidationScore: number;
  validationDataSize: number;

  // Deployment info
  deployedAt: Date;
  lastRetrained: Date;
  nextRetrainingScheduled: Date;

  // Usage stats
  predictionCount: number;
  averageLatency: number;

  // Model monitoring
  driftDetected: boolean;
  performanceDegradation: number;
  retrainingRequired: boolean;
}

/**
 * Prediction model types
 */
export enum PredictionModelType {
  PERFORMANCE_FORECASTING = 'PERFORMANCE_FORECASTING',
  SKILL_LEVEL_PREDICTION = 'SKILL_LEVEL_PREDICTION',
  SUCCESS_PROBABILITY = 'SUCCESS_PROBABILITY',
  IMPROVEMENT_RATE = 'IMPROVEMENT_RATE',
  HIRING_RECOMMENDATION = 'HIRING_RECOMMENDATION',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
}

/**
 * Machine learning algorithms
 */
export enum MLAlgorithm {
  LINEAR_REGRESSION = 'LINEAR_REGRESSION',
  RANDOM_FOREST = 'RANDOM_FOREST',
  GRADIENT_BOOSTING = 'GRADIENT_BOOSTING',
  NEURAL_NETWORK = 'NEURAL_NETWORK',
  SVM = 'SVM',
  LSTM = 'LSTM',
  TRANSFORMER = 'TRANSFORMER',
  ENSEMBLE = 'ENSEMBLE',
}

/**
 * Model feature definition
 */
export interface ModelFeature {
  name: string;
  type: FeatureType;
  importance: number; // 0-1
  correlation: number; // -1 to 1
  description: string;
  transformations: FeatureTransformation[];
}

/**
 * Feature data types
 */
export enum FeatureType {
  NUMERICAL = 'NUMERICAL',
  CATEGORICAL = 'CATEGORICAL',
  BINARY = 'BINARY',
  TEMPORAL = 'TEMPORAL',
  TEXT = 'TEXT',
  DERIVED = 'DERIVED',
}

/**
 * Feature transformations
 */
export interface FeatureTransformation {
  type: TransformationType;
  parameters: Record<string, any>;
}

/**
 * Transformation types
 */
export enum TransformationType {
  NORMALIZATION = 'NORMALIZATION',
  STANDARDIZATION = 'STANDARDIZATION',
  LOG_TRANSFORM = 'LOG_TRANSFORM',
  POLYNOMIAL = 'POLYNOMIAL',
  BINNING = 'BINNING',
  ENCODING = 'ENCODING',
}

/**
 * Performance prediction result
 */
export interface PerformancePrediction {
  predictionId: string;
  candidateId: string;
  modelId: string;
  timestamp: Date;

  // Predictions
  predictedScore: number;
  confidenceInterval: ConfidenceInterval;
  probability: number;

  // Feature contributions
  featureContributions: FeatureContribution[];

  // Explanations
  explanation: PredictionExplanation;

  // Validation
  actualOutcome?: number;
  predictionAccuracy?: number;
  validated: boolean;
  validatedAt?: Date;
}

/**
 * Feature contribution to prediction
 */
export interface FeatureContribution {
  featureName: string;
  value: any;
  contribution: number; // -1 to 1
  importance: number; // 0-1
}

/**
 * Human-readable prediction explanation
 */
export interface PredictionExplanation {
  summary: string;
  keyFactors: string[];
  reasoning: string;
  limitations: string[];
  recommendations: string[];
}

// ===== UTILITY TYPES =====

/**
 * Date range specification
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Performance change description
 */
export interface PerformanceChange {
  metric: PerformanceMetricType;
  previousValue: number;
  currentValue: number;
  absoluteChange: number;
  percentageChange: number;
  significance: ChangeSignificance;
}

/**
 * Change significance levels
 */
export enum ChangeSignificance {
  NEGLIGIBLE = 'NEGLIGIBLE',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SIGNIFICANT = 'SIGNIFICANT',
  MAJOR = 'MAJOR',
}

/**
 * Category performance change
 */
export interface CategoryChange extends PerformanceChange {
  category: PerformanceMetricType;
  trendDirection: TrendDirection;
}

/**
 * Category percentile
 */
export interface CategoryPercentile {
  category: PerformanceMetricType;
  percentile: number;
  score: number;
  industryAverage: number;
  industryStandardDeviation: number;
}

/**
 * Market positioning
 */
export enum MarketPosition {
  BOTTOM_QUARTILE = 'BOTTOM_QUARTILE',
  SECOND_QUARTILE = 'SECOND_QUARTILE',
  THIRD_QUARTILE = 'THIRD_QUARTILE',
  TOP_QUARTILE = 'TOP_QUARTILE',
  TOP_DECILE = 'TOP_DECILE',
  TOP_PERCENTILE = 'TOP_PERCENTILE',
}

/**
 * Performance milestone
 */
export interface PerformanceMilestone {
  id: string;
  type: MilestoneType;
  date: Date;
  description: string;
  metric: PerformanceMetricType;
  value: number;
  significance: number; // 0-1
}

/**
 * Milestone types
 */
export enum MilestoneType {
  BREAKTHROUGH = 'BREAKTHROUGH',
  PLATEAU = 'PLATEAU',
  DECLINE = 'DECLINE',
  RECOVERY = 'RECOVERY',
  GOAL_ACHIEVEMENT = 'GOAL_ACHIEVEMENT',
  REGRESSION = 'REGRESSION',
}

/**
 * Performance projection
 */
export interface PerformanceProjection {
  timeframe: string;
  projectedMetrics: ProjectedMetric[];
  scenarios: ProjectionScenario[];
  assumptions: string[];
  confidence: number; // 0-1
}

/**
 * Projected metric value
 */
export interface ProjectedMetric {
  metric: PerformanceMetricType;
  projectedValue: number;
  confidenceInterval: ConfidenceInterval;
  factors: ProjectionFactor[];
}

/**
 * Projection scenario
 */
export interface ProjectionScenario {
  name: string;
  description: string;
  probability: number; // 0-1
  projectedOutcomes: ProjectedMetric[];
  assumptions: string[];
}

/**
 * Factors affecting projections
 */
export interface ProjectionFactor {
  factor: string;
  impact: number; // -1 to 1
  likelihood: number; // 0-1
}

/**
 * Trend insight
 */
export interface TrendInsight {
  type: InsightType;
  description: string;
  significance: number; // 0-1
  actionable: boolean;
  recommendations: string[];
}

/**
 * Trend recommendation
 */
export interface TrendRecommendation {
  priority: RecommendationPriority;
  action: string;
  expectedImpact: number; // 0-1
  timeframe: string;
  resources: string[];
}

/**
 * Trend outlier
 */
export interface TrendOutlier {
  timestamp: Date;
  value: number;
  expectedValue: number;
  zScore: number;
  possibleCauses: string[];
}

/**
 * Dashboard visibility settings
 */
export enum DashboardVisibility {
  PUBLIC = 'PUBLIC',
  ORGANIZATION = 'ORGANIZATION',
  TEAM = 'TEAM',
  PRIVATE = 'PRIVATE',
}

/**
 * Dashboard filter
 */
export interface DashboardFilter {
  field: string;
  operator: FilterOperator;
  value: any;
  label: string;
}

/**
 * Filter operators
 */
export enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  LESS_EQUAL = 'LESS_EQUAL',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  BETWEEN = 'BETWEEN',
}

/**
 * Widget interactivity settings
 */
export interface WidgetInteractivity {
  clickable: boolean;
  hoverable: boolean;
  zoomable: boolean;
  filterable: boolean;
  exportable: boolean;
  drillDownEnabled: boolean;
}

/**
 * Widget interaction
 */
export interface WidgetInteraction {
  trigger: InteractionTrigger;
  action: InteractionAction;
  parameters: Record<string, any>;
}

/**
 * Interaction triggers
 */
export enum InteractionTrigger {
  CLICK = 'CLICK',
  DOUBLE_CLICK = 'DOUBLE_CLICK',
  HOVER = 'HOVER',
  SELECTION = 'SELECTION',
  DRILL_DOWN = 'DRILL_DOWN',
}

/**
 * Interaction actions
 */
export enum InteractionAction {
  FILTER = 'FILTER',
  NAVIGATE = 'NAVIGATE',
  ZOOM = 'ZOOM',
  HIGHLIGHT = 'HIGHLIGHT',
  TOOLTIP = 'TOOLTIP',
  MODAL = 'MODAL',
}

/**
 * Widget annotation
 */
export interface WidgetAnnotation {
  id: string;
  type: AnnotationType;
  position: AnnotationPosition;
  content: string;
  styling: AnnotationStyling;
}

/**
 * Annotation types
 */
export enum AnnotationType {
  TEXT_LABEL = 'TEXT_LABEL',
  TREND_LINE = 'TREND_LINE',
  THRESHOLD_LINE = 'THRESHOLD_LINE',
  REGION_HIGHLIGHT = 'REGION_HIGHLIGHT',
  CALLOUT = 'CALLOUT',
}

/**
 * Annotation positioning
 */
export interface AnnotationPosition {
  x: number;
  y: number;
  anchor: AnchorPoint;
}

/**
 * Anchor points for annotations
 */
export enum AnchorPoint {
  TOP_LEFT = 'TOP_LEFT',
  TOP_CENTER = 'TOP_CENTER',
  TOP_RIGHT = 'TOP_RIGHT',
  CENTER_LEFT = 'CENTER_LEFT',
  CENTER = 'CENTER',
  CENTER_RIGHT = 'CENTER_RIGHT',
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_CENTER = 'BOTTOM_CENTER',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
}

/**
 * Annotation styling
 */
export interface AnnotationStyling {
  color: string;
  backgroundColor: string;
  fontSize: number;
  fontWeight: string;
  borderColor: string;
  borderWidth: number;
}

/**
 * Data source configuration for widgets
 */
export interface DataSourceConfig {
  type: DataSourceType;
  query: string;
  parameters: Record<string, any>;
  cacheEnabled: boolean;
  cacheDuration: number;
}

/**
 * Data source types
 */
export enum DataSourceType {
  DATABASE_QUERY = 'DATABASE_QUERY',
  API_ENDPOINT = 'API_ENDPOINT',
  COMPUTED_METRIC = 'COMPUTED_METRIC',
  REAL_TIME_STREAM = 'REAL_TIME_STREAM',
  CACHED_RESULT = 'CACHED_RESULT',
}

// ===== SERVICE CONFIGURATION =====

/**
 * Performance analytics service configuration
 */
export interface PerformanceAnalyticsConfig {
  // Calculation settings
  metricCalculationInterval: number; // minutes
  batchProcessingSize: number;
  enableRealTimeCalculation: boolean;

  // Benchmarking
  benchmarkUpdateInterval: number; // hours
  minimumSampleSizeForBenchmark: number;
  industryBenchmarkSources: string[];

  // Prediction models
  enablePredictionModels: boolean;
  modelRetrainingInterval: number; // days
  minimumDataPointsForPrediction: number;

  // Caching
  enableMetricCaching: boolean;
  cacheExpirationTime: number; // minutes

  // Data retention
  rawDataRetentionDays: number;
  aggregatedDataRetentionDays: number;

  // Thresholds
  anomalyDetectionThreshold: number; // z-score
  significanceTestThreshold: number; // p-value
  minimumTrendDataPoints: number;

  // Performance
  maxConcurrentCalculations: number;
  calculationTimeoutSeconds: number;
}

export default {
  PerformanceMetricType,
  MetricAggregationType,
  AnalysisPeriod,
  SkillLevel,
  TrendDirection,
  WeaknessImpact,
  RecommendationType,
  RecommendationPriority,
  ResourceType,
  GapSignificance,
  InsightType,
  SeasonalityType,
  AnomalySeverity,
  StressIndicatorType,
  WidgetType,
  PredictionModelType,
  MLAlgorithm,
  FeatureType,
  TransformationType,
  ChangeSignificance,
  MarketPosition,
  MilestoneType,
  DashboardVisibility,
  FilterOperator,
  InteractionTrigger,
  InteractionAction,
  AnnotationType,
  AnchorPoint,
  DataSourceType,
};
