/**
 * Bias Detection Validation Schemas
 * Epic 5 Task 5.3: Bias Detection Implementation
 * 
 * Comprehensive validation schemas for bias detection API endpoints.
 * Ensures data integrity and security for bias analysis operations.
 */

import Joi from 'joi';

/**
 * Validation schema for bias analysis request
 */
export const biasAnalysisValidation = Joi.object({
  organizationId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .description('Organization identifier'),
    
  assessmentIds: Joi.array()
    .items(Joi.string().uuid({ version: 'uuidv4' }))
    .optional()
    .description('Specific assessment IDs to analyze (optional)'),
    
  startDate: Joi.date()
    .iso()
    .required()
    .description('Start date for analysis period'),
    
  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate'))
    .required()
    .description('End date for analysis period'),
    
  demographicFactors: Joi.array()
    .items(Joi.string().valid(
      'gender', 'ethnicity', 'age', 'disability', 
      'veteranStatus', 'educationLevel', 'location'
    ))
    .min(1)
    .max(5)
    .unique()
    .required()
    .description('Demographic factors to analyze for bias'),
    
  minimumSampleSize: Joi.number()
    .integer()
    .min(10)
    .max(1000)
    .default(30)
    .description('Minimum sample size per group for analysis'),
    
  confidenceLevel: Joi.number()
    .min(0.80)
    .max(0.999)
    .default(0.95)
    .description('Statistical confidence level'),
    
  analysisType: Joi.string()
    .valid('disparate-impact', 'statistical-significance', 'effect-size', 'comprehensive')
    .default('comprehensive')
    .description('Type of bias analysis to perform'),
    
  includeIntersectionalAnalysis: Joi.boolean()
    .default(true)
    .description('Whether to include intersectional bias analysis'),
    
  includeQuestionLevelAnalysis: Joi.boolean()
    .default(true)
    .description('Whether to include question-level bias analysis'),
    
  alertThresholds: Joi.object({
    disparateImpactRatio: Joi.number().min(0.1).max(1.0).default(0.8),
    statisticalSignificanceLevel: Joi.number().min(0.001).max(0.1).default(0.05),
    effectSizeThreshold: Joi.number().min(0.1).max(2.0).default(0.5)
  }).optional()
});

/**
 * Validation schema for compliance report generation
 */
export const complianceReportValidation = Joi.object({
  analysisId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .description('Bias analysis result identifier'),
    
  framework: Joi.string()
    .valid('EEOC', 'GDPR', 'EU_AI_ACT', 'ISO_27001', 'SOC_2')
    .required()
    .description('Compliance framework to validate against'),
    
  includeRecommendations: Joi.boolean()
    .default(true)
    .description('Whether to include remediation recommendations'),
    
  includeAuditTrail: Joi.boolean()
    .default(true)
    .description('Whether to include detailed audit trail'),
    
  reportFormat: Joi.string()
    .valid('detailed', 'summary', 'executive')
    .default('detailed')
    .description('Level of detail for compliance report')
});

/**
 * Validation schema for recommendation status updates
 */
export const recommendationUpdateValidation = Joi.object({
  status: Joi.string()
    .valid('PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')
    .required()
    .description('New status for the recommendation'),
    
  notes: Joi.string()
    .max(1000)
    .optional()
    .description('Optional notes about the status change'),
    
  userId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .description('User making the status change'),
    
  estimatedCompletionDate: Joi.date()
    .iso()
    .greater('now')
    .optional()
    .description('Estimated completion date (for IN_PROGRESS status)'),
    
  actualCompletionDate: Joi.date()
    .iso()
    .optional()
    .description('Actual completion date (for COMPLETED status)'),
    
  implementationCost: Joi.number()
    .positive()
    .optional()
    .description('Actual implementation cost'),
    
  effectivenessRating: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .description('Effectiveness rating (1-10) for completed recommendations')
});

/**
 * Validation schema for statistical analysis requests
 */
export const statisticalAnalysisValidation = Joi.object({
  analysisType: Joi.string()
    .valid('descriptive', 't-test', 'chi-square', 'anova', 'correlation', 'mann-whitney', 'fishers-exact')
    .required()
    .description('Type of statistical analysis to perform'),
    
  data: Joi.array()
    .items(Joi.number())
    .when('analysisType', {
      is: 'descriptive',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Data array for descriptive statistics'),
    
  group1: Joi.array()
    .items(Joi.number())
    .when('analysisType', {
      is: Joi.valid('t-test', 'mann-whitney'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('First group data for comparison tests'),
    
  group2: Joi.array()
    .items(Joi.number())
    .when('analysisType', {
      is: Joi.valid('t-test', 'mann-whitney'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Second group data for comparison tests'),
    
  groups: Joi.array()
    .items(Joi.object({
      groupName: Joi.string().required(),
      values: Joi.array().items(Joi.number()).required()
    }))
    .when('analysisType', {
      is: 'anova',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Multiple groups for ANOVA'),
    
  observedFrequencies: Joi.array()
    .items(Joi.array().items(Joi.number().integer().min(0)))
    .when('analysisType', {
      is: 'chi-square',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Observed frequency matrix for chi-square test'),
    
  x: Joi.array()
    .items(Joi.number())
    .when('analysisType', {
      is: 'correlation',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('X values for correlation analysis'),
    
  y: Joi.array()
    .items(Joi.number())
    .when('analysisType', {
      is: 'correlation',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Y values for correlation analysis'),
    
  confidenceLevel: Joi.number()
    .min(0.80)
    .max(0.999)
    .default(0.95)
    .description('Statistical confidence level'),
    
  equalVariances: Joi.boolean()
    .default(false)
    .when('analysisType', {
      is: 't-test',
      otherwise: Joi.forbidden()
    })
    .description('Assume equal variances for t-test'),
    
  alternative: Joi.string()
    .valid('two-sided', 'less', 'greater')
    .default('two-sided')
    .description('Alternative hypothesis for statistical tests')
});

/**
 * Validation schema for bias alert acknowledgment
 */
export const biasAlertAcknowledgmentValidation = Joi.object({
  userId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .description('User acknowledging the alert'),
    
  notes: Joi.string()
    .max(500)
    .optional()
    .description('Optional notes about the acknowledgment'),
    
  actionTaken: Joi.string()
    .max(200)
    .optional()
    .description('Brief description of action taken'),
    
  escalate: Joi.boolean()
    .default(false)
    .description('Whether to escalate this alert to higher authority'),
    
  escalationReason: Joi.string()
    .max(300)
    .when('escalate', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Reason for escalation')
});

/**
 * Validation schema for dashboard filters
 */
export const dashboardFiltersValidation = Joi.object({
  timeRange: Joi.string()
    .valid('7d', '30d', '90d', '6m', '1y', 'custom')
    .default('30d')
    .description('Time range for dashboard data'),
    
  customStartDate: Joi.date()
    .iso()
    .when('timeRange', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Custom start date when timeRange is custom'),
    
  customEndDate: Joi.date()
    .iso()
    .greater(Joi.ref('customStartDate'))
    .when('timeRange', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Custom end date when timeRange is custom'),
    
  assessmentTypes: Joi.array()
    .items(Joi.string())
    .optional()
    .description('Filter by specific assessment types'),
    
  demographicFactors: Joi.array()
    .items(Joi.string().valid(
      'gender', 'ethnicity', 'age', 'disability', 
      'veteranStatus', 'educationLevel', 'location'
    ))
    .optional()
    .description('Filter by specific demographic factors'),
    
  riskLevels: Joi.array()
    .items(Joi.string().valid('low', 'medium', 'high', 'critical'))
    .optional()
    .description('Filter by risk levels'),
    
  includeResolved: Joi.boolean()
    .default(false)
    .description('Whether to include resolved bias issues')
});

/**
 * Validation schema for export requests
 */
export const exportValidation = Joi.object({
  format: Joi.string()
    .valid('pdf', 'csv', 'xlsx', 'json')
    .default('pdf')
    .description('Export format'),
    
  includeCharts: Joi.boolean()
    .default(true)
    .when('format', {
      is: Joi.valid('pdf'),
      otherwise: Joi.forbidden()
    })
    .description('Include charts in PDF export'),
    
  includeRawData: Joi.boolean()
    .default(false)
    .description('Include raw data in export'),
    
  sections: Joi.array()
    .items(Joi.string().valid(
      'executive-summary', 'bias-analysis', 'statistical-tests',
      'compliance-status', 'recommendations', 'raw-data'
    ))
    .optional()
    .description('Specific sections to include in export'),
    
  compression: Joi.string()
    .valid('none', 'zip', 'gzip')
    .default('none')
    .description('Compression type for large exports')
});

/**
 * Common pagination validation
 */
export const paginationValidation = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .description('Number of items per page'),
    
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .description('Number of items to skip'),
    
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'priority', 'status', 'name')
    .default('createdAt')
    .description('Field to sort by'),
    
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .description('Sort order')
});

/**
 * Common UUID parameter validation
 */
export const uuidParamValidation = Joi.object({
  id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .description('UUID identifier')
});

/**
 * Organization ID parameter validation
 */
export const organizationParamValidation = Joi.object({
  organizationId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .description('Organization UUID identifier')
});

// Composite validations for common use cases
export const biasAnalysisWithPaginationValidation = biasAnalysisValidation.concat(paginationValidation);
export const dashboardWithFiltersValidation = dashboardFiltersValidation.concat(paginationValidation);

// Export all validation schemas
export const validationSchemas = {
  biasAnalysis: biasAnalysisValidation,
  complianceReport: complianceReportValidation,
  recommendationUpdate: recommendationUpdateValidation,
  statisticalAnalysis: statisticalAnalysisValidation,
  biasAlertAcknowledgment: biasAlertAcknowledgmentValidation,
  dashboardFilters: dashboardFiltersValidation,
  export: exportValidation,
  pagination: paginationValidation,
  uuidParam: uuidParamValidation,
  organizationParam: organizationParamValidation
};
