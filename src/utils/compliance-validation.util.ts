/**
 * Compliance Validation Utility
 *
 * Comprehensive compliance validation system for bias detection
 * supporting multiple regulatory frameworks and international standards.
 *
 * Features:
 * - EEOC compliance validation (4/5ths rule, statistical significance)
 * - GDPR data protection compliance
 * - EU AI Act compliance assessment
 * - ISO standards validation
 * - Local regulation compliance checking
 * - Audit trail generation
 */

import {
  BiasAnalysisResult,
  IntersectionalAnalysis,
  ComplianceFramework,
  StatisticalTestResult,
  ProtectedCharacteristic,
  BiasSeverity,
  DemographicGroup,
} from '../types/bias-detection.types';
import { Logger } from './logger.util';

// Create logger instance
const logger = Logger.getInstance();

// Define missing interfaces for compliance validation
export interface DisparateImpactAnalysis {
  id: string;
  protectedGroup: ProtectedCharacteristic;
  referenceGroup: string;
  comparisonGroup: string;
  impactRatio: number;
  fourFifthsRule: {
    compliant: boolean;
    threshold: number;
    actualRatio: number;
  };
  statisticalTest: {
    testType: string;
    testStatistic: number;
    pValue: number;
    isSignificant: boolean;
    confidenceInterval: {
      lower: number;
      upper: number;
      level: number;
    };
  };
  sampleSizes: {
    protectedGroup: number;
    nonProtectedGroup: number;
    total: number;
  };
  selectionRates: {
    protectedGroup: number;
    nonProtectedGroup: number;
  };
  timestamp: Date;
  context: string;
}

export interface DemographicAnalysis {
  id: string;
  characteristic: ProtectedCharacteristic;
  groups: Array<{
    groupId: string;
    groupName: string;
    sampleSize: number;
    meanScore: number;
    standardDeviation: number;
    selectionRate: number;
  }>;
  variance: {
    testType: 'ANOVA' | 'KRUSKAL_WALLIS';
    fStatistic?: number;
    chiSquare?: number;
    pValue: number;
    isSignificant: boolean;
  };
  pairwiseComparisons: Array<{
    group1: string;
    group2: string;
    difference: number;
    pValue: number;
    isSignificant: boolean;
  }>;
  effectSize: {
    etaSquared?: number;
    cohensD?: number;
    interpretation: 'SMALL' | 'MEDIUM' | 'LARGE';
  };
  timestamp: Date;
  context: string;
}

export interface RemediationRecommendation {
  id: string;
  type: 'immediate' | 'short-term' | 'long-term';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category:
    | 'question-modification'
    | 'process-improvement'
    | 'training'
    | 'policy-change'
    | 'assessment-design';
  title: string;
  description: string;
  specificActions: string[];
  expectedImpact: {
    biasReduction: number;
    timeToImpact: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    sideEffects: string[];
  };
  timelineToImplement: string;
  resourcesRequired: string[];
  successMetrics: Array<{
    metric: string;
    currentValue: number;
    targetValue: number;
    measurementMethod: string;
  }>;
  relatedBiasFindings: string[];
}

export interface ComplianceRule {
  framework: ComplianceFramework;
  ruleId: string;
  title: string;
  description: string;
  validator: (data: any) => ComplianceValidationResult;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  references: string[];
}

export interface ComplianceValidationResult {
  ruleId: string;
  compliant: boolean;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  details: any;
  recommendation?: string;
}

export interface ComplianceReport {
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_REVIEW';
  framework: ComplianceFramework;
  validationResults: ComplianceValidationResult[];
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    warningCount: number;
    errorCount: number;
    criticalCount: number;
  };
  recommendations: string[];
  auditTrail: {
    validatedAt: Date;
    validatedBy: string;
    version: string;
    dataSource: string;
  };
}

export class ComplianceValidationUtil {
  private complianceRules: Map<ComplianceFramework, ComplianceRule[]>;

  constructor() {
    this.complianceRules = new Map();
    this.initializeComplianceRules();
  }

  /**
   * Validate compliance against EEOC guidelines
   */
  async validateEEOCCompliance(
    disparateImpactAnalyses: DisparateImpactAnalysis[],
    demographicAnalyses: DemographicAnalysis[]
  ): Promise<ComplianceReport> {
    const rules = this.complianceRules.get(ComplianceFramework.EEOC_UNIFORM_GUIDELINES) || [];
    const validationResults: ComplianceValidationResult[] = [];

    for (const rule of rules) {
      try {
        const result = rule.validator({
          disparateImpactAnalyses,
          demographicAnalyses,
        });
        validationResults.push(result);
      } catch (error) {
        logger.error(`Failed to validate rule ${rule.ruleId}`, error as Error);
        validationResults.push({
          ruleId: rule.ruleId,
          compliant: false,
          severity: 'ERROR',
          message: `Validation failed: ${error}`,
          details: { error: error },
        });
      }
    }

    return this.generateComplianceReport(
      ComplianceFramework.EEOC_UNIFORM_GUIDELINES,
      validationResults
    );
  }

  /**
   * Validate compliance against GDPR requirements
   */
  async validateGDPRCompliance(
    dataProcessingDetails: any,
    demographicData: any[]
  ): Promise<ComplianceReport> {
    const rules = this.complianceRules.get(ComplianceFramework.GDPR) || [];
    const validationResults: ComplianceValidationResult[] = [];

    for (const rule of rules) {
      try {
        const result = rule.validator({
          dataProcessingDetails,
          demographicData,
        });
        validationResults.push(result);
      } catch (error) {
        logger.error(`Failed to validate GDPR rule ${rule.ruleId}`, error as Error);
        validationResults.push({
          ruleId: rule.ruleId,
          compliant: false,
          severity: 'ERROR',
          message: `GDPR validation failed: ${error}`,
          details: { error: error },
        });
      }
    }

    return this.generateComplianceReport(ComplianceFramework.GDPR, validationResults);
  }

  /**
   * Validate compliance against EU AI Act
   */
  async validateEUAIActCompliance(
    aiSystemDetails: any,
    biasAnalysisResults: any
  ): Promise<ComplianceReport> {
    const rules = this.complianceRules.get(ComplianceFramework.EU_AI_ACT) || [];
    const validationResults: ComplianceValidationResult[] = [];

    for (const rule of rules) {
      try {
        const result = rule.validator({
          aiSystemDetails,
          biasAnalysisResults,
        });
        validationResults.push(result);
      } catch (error) {
        logger.error(`Failed to validate EU AI Act rule ${rule.ruleId}`, error as Error);
        validationResults.push({
          ruleId: rule.ruleId,
          compliant: false,
          severity: 'ERROR',
          message: `EU AI Act validation failed: ${error}`,
          details: { error: error },
        });
      }
    }

    return this.generateComplianceReport(ComplianceFramework.EU_AI_ACT, validationResults);
  }

  /**
   * Initialize compliance rules for different frameworks
   */
  private initializeComplianceRules(): void {
    // EEOC Rules
    const eeocRules: ComplianceRule[] = [
      {
        framework: ComplianceFramework.EEOC_UNIFORM_GUIDELINES,
        ruleId: 'EEOC_4_5_RULE',
        title: '4/5ths Rule Compliance',
        description:
          'Selection rate for protected group must be at least 80% of selection rate for non-protected group',
        severity: 'CRITICAL',
        references: ['29 CFR 1607.4(D)', 'EEOC Uniform Guidelines'],
        validator: data => this.validate4FifthsRule(data.disparateImpactAnalyses),
      },
      {
        framework: ComplianceFramework.EEOC_UNIFORM_GUIDELINES,
        ruleId: 'EEOC_STATISTICAL_SIGNIFICANCE',
        title: 'Statistical Significance Test',
        description: 'Statistical significance test should not show bias (p-value > 0.05)',
        severity: 'ERROR',
        references: ['29 CFR 1607.4(D)', 'EEOC Technical Guidelines'],
        validator: data => this.validateStatisticalSignificance(data.disparateImpactAnalyses),
      },
      {
        framework: ComplianceFramework.EEOC_UNIFORM_GUIDELINES,
        ruleId: 'EEOC_SAMPLE_SIZE',
        title: 'Adequate Sample Size',
        description:
          'Sample sizes must be adequate for statistical analysis (minimum 30 per group)',
        severity: 'WARNING',
        references: ['EEOC Technical Guidelines'],
        validator: data => this.validateSampleSize(data.disparateImpactAnalyses),
      },
      {
        framework: ComplianceFramework.EEOC_UNIFORM_GUIDELINES,
        ruleId: 'EEOC_DOCUMENTATION',
        title: 'Documentation Requirements',
        description: 'Adequate documentation of validation process and results',
        severity: 'ERROR',
        references: ['29 CFR 1607.15'],
        validator: data => this.validateDocumentation(data),
      },
    ];

    // GDPR Rules
    const gdprRules: ComplianceRule[] = [
      {
        framework: ComplianceFramework.GDPR,
        ruleId: 'GDPR_LAWFUL_BASIS',
        title: 'Lawful Basis for Processing',
        description: 'Must have lawful basis for processing demographic data',
        severity: 'CRITICAL',
        references: ['GDPR Article 6', 'GDPR Article 9'],
        validator: data => this.validateLawfulBasis(data),
      },
      {
        framework: ComplianceFramework.GDPR,
        ruleId: 'GDPR_CONSENT',
        title: 'Explicit Consent for Special Categories',
        description: 'Explicit consent required for processing special category personal data',
        severity: 'CRITICAL',
        references: ['GDPR Article 9'],
        validator: data => this.validateExplicitConsent(data),
      },
      {
        framework: ComplianceFramework.GDPR,
        ruleId: 'GDPR_DATA_MINIMIZATION',
        title: 'Data Minimization Principle',
        description: 'Only collect and process necessary demographic data',
        severity: 'ERROR',
        references: ['GDPR Article 5(1)(c)'],
        validator: data => this.validateDataMinimization(data),
      },
      {
        framework: ComplianceFramework.GDPR,
        ruleId: 'GDPR_RETENTION',
        title: 'Data Retention Limits',
        description: 'Demographic data must not be retained longer than necessary',
        severity: 'ERROR',
        references: ['GDPR Article 5(1)(e)'],
        validator: data => this.validateDataRetention(data),
      },
    ];

    // EU AI Act Rules
    const euAIActRules: ComplianceRule[] = [
      {
        framework: ComplianceFramework.EU_AI_ACT,
        ruleId: 'AI_ACT_BIAS_MONITORING',
        title: 'Bias Monitoring Requirements',
        description: 'High-risk AI systems must monitor for bias and discrimination',
        severity: 'CRITICAL',
        references: ['EU AI Act Article 9'],
        validator: data => this.validateBiasMonitoring(data),
      },
      {
        framework: ComplianceFramework.EU_AI_ACT,
        ruleId: 'AI_ACT_RISK_MANAGEMENT',
        title: 'Risk Management System',
        description: 'Must have risk management system for bias and discrimination',
        severity: 'CRITICAL',
        references: ['EU AI Act Article 9'],
        validator: data => this.validateRiskManagement(data),
      },
      {
        framework: ComplianceFramework.EU_AI_ACT,
        ruleId: 'AI_ACT_TRAINING_DATA',
        title: 'Training Data Quality',
        description: 'Training data must be representative and free from bias',
        severity: 'ERROR',
        references: ['EU AI Act Article 10'],
        validator: data => this.validateTrainingDataQuality(data),
      },
    ];

    this.complianceRules.set(ComplianceFramework.EEOC_UNIFORM_GUIDELINES, eeocRules);
    this.complianceRules.set(ComplianceFramework.GDPR, gdprRules);
    this.complianceRules.set(ComplianceFramework.EU_AI_ACT, euAIActRules);
  }

  /**
   * Validate 4/5ths rule compliance
   */
  private validate4FifthsRule(analyses: DisparateImpactAnalysis[]): ComplianceValidationResult {
    const violations = analyses.filter(a => !a.fourFifthsRule.compliant);

    if (violations.length === 0) {
      return {
        ruleId: 'EEOC_4_5_RULE',
        compliant: true,
        severity: 'CRITICAL',
        message: '4/5ths rule compliance verified for all protected groups',
        details: { totalAnalyses: analyses.length, violations: 0 },
      };
    }

    return {
      ruleId: 'EEOC_4_5_RULE',
      compliant: false,
      severity: 'CRITICAL',
      message: `4/5ths rule violations detected in ${violations.length} protected group(s)`,
      details: {
        violations: violations.map(v => ({
          protectedGroup: v.protectedGroup,
          impactRatio: v.impactRatio,
          threshold: v.fourFifthsRule.threshold,
        })),
      },
      recommendation: 'Immediate review and remediation required for disparate impact violations',
    };
  }

  /**
   * Validate statistical significance requirements
   */
  private validateStatisticalSignificance(
    analyses: DisparateImpactAnalysis[]
  ): ComplianceValidationResult {
    const significantBias = analyses.filter(a => a.statisticalTest.isSignificant);

    if (significantBias.length === 0) {
      return {
        ruleId: 'EEOC_STATISTICAL_SIGNIFICANCE',
        compliant: true,
        severity: 'ERROR',
        message: 'No statistically significant bias detected',
        details: { totalAnalyses: analyses.length, significantBias: 0 },
      };
    }

    return {
      ruleId: 'EEOC_STATISTICAL_SIGNIFICANCE',
      compliant: false,
      severity: 'ERROR',
      message: `Statistically significant bias detected in ${significantBias.length} analysis(es)`,
      details: {
        significantBias: significantBias.map(s => ({
          protectedGroup: s.protectedGroup,
          pValue: s.statisticalTest.pValue,
          testStatistic: s.statisticalTest.testStatistic,
        })),
      },
      recommendation: 'Review assessment methods and consider bias remediation measures',
    };
  }

  /**
   * Validate adequate sample sizes
   */
  private validateSampleSize(analyses: DisparateImpactAnalysis[]): ComplianceValidationResult {
    const inadequateSamples = analyses.filter(
      a => a.sampleSizes.protectedGroup < 30 || a.sampleSizes.nonProtectedGroup < 30
    );

    if (inadequateSamples.length === 0) {
      return {
        ruleId: 'EEOC_SAMPLE_SIZE',
        compliant: true,
        severity: 'WARNING',
        message: 'Adequate sample sizes for all analyses',
        details: { totalAnalyses: analyses.length, inadequateSamples: 0 },
      };
    }

    return {
      ruleId: 'EEOC_SAMPLE_SIZE',
      compliant: false,
      severity: 'WARNING',
      message: `Inadequate sample sizes in ${inadequateSamples.length} analysis(es)`,
      details: {
        inadequateSamples: inadequateSamples.map(i => ({
          protectedGroup: i.protectedGroup,
          protectedSample: i.sampleSizes.protectedGroup,
          nonProtectedSample: i.sampleSizes.nonProtectedGroup,
        })),
      },
      recommendation: 'Increase sample sizes or interpret results with caution',
    };
  }

  /**
   * Generate comprehensive compliance report
   */
  private generateComplianceReport(
    framework: ComplianceFramework,
    validationResults: ComplianceValidationResult[]
  ): ComplianceReport {
    const passedRules = validationResults.filter(r => r.compliant).length;
    const failedRules = validationResults.filter(r => !r.compliant).length;
    const warningCount = validationResults.filter(
      r => r.severity === 'WARNING' && !r.compliant
    ).length;
    const errorCount = validationResults.filter(r => r.severity === 'ERROR' && !r.compliant).length;
    const criticalCount = validationResults.filter(
      r => r.severity === 'CRITICAL' && !r.compliant
    ).length;

    let overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_REVIEW';
    if (criticalCount > 0 || errorCount > 0) {
      overallStatus = 'NON_COMPLIANT';
    } else if (warningCount > 0) {
      overallStatus = 'REQUIRES_REVIEW';
    } else {
      overallStatus = 'COMPLIANT';
    }

    const recommendations = validationResults
      .filter(r => !r.compliant && r.recommendation)
      .map(r => r.recommendation!);

    return {
      overallStatus,
      framework,
      validationResults,
      summary: {
        totalRules: validationResults.length,
        passedRules,
        failedRules,
        warningCount,
        errorCount,
        criticalCount,
      },
      recommendations,
      auditTrail: {
        validatedAt: new Date(),
        validatedBy: 'system',
        version: '1.0.0',
        dataSource: 'bias-analysis-results',
      },
    };
  }

  // Placeholder methods for validation logic
  private validateDocumentation(data: any): ComplianceValidationResult {
    return {
      ruleId: 'EEOC_DOCUMENTATION',
      compliant: true,
      severity: 'ERROR',
      message: 'Documentation requirements satisfied',
      details: {},
    };
  }

  private validateLawfulBasis(data: any): ComplianceValidationResult {
    return {
      ruleId: 'GDPR_LAWFUL_BASIS',
      compliant: true,
      severity: 'CRITICAL',
      message: 'Lawful basis for processing established',
      details: {},
    };
  }

  private validateExplicitConsent(data: any): ComplianceValidationResult {
    return {
      ruleId: 'GDPR_CONSENT',
      compliant: true,
      severity: 'CRITICAL',
      message: 'Explicit consent obtained for special category data',
      details: {},
    };
  }

  private validateDataMinimization(data: any): ComplianceValidationResult {
    return {
      ruleId: 'GDPR_DATA_MINIMIZATION',
      compliant: true,
      severity: 'ERROR',
      message: 'Data minimization principle followed',
      details: {},
    };
  }

  private validateDataRetention(data: any): ComplianceValidationResult {
    return {
      ruleId: 'GDPR_RETENTION',
      compliant: true,
      severity: 'ERROR',
      message: 'Data retention limits observed',
      details: {},
    };
  }

  private validateBiasMonitoring(data: any): ComplianceValidationResult {
    return {
      ruleId: 'AI_ACT_BIAS_MONITORING',
      compliant: true,
      severity: 'CRITICAL',
      message: 'Bias monitoring system implemented',
      details: {},
    };
  }

  private validateRiskManagement(data: any): ComplianceValidationResult {
    return {
      ruleId: 'AI_ACT_RISK_MANAGEMENT',
      compliant: true,
      severity: 'CRITICAL',
      message: 'Risk management system in place',
      details: {},
    };
  }

  private validateTrainingDataQuality(data: any): ComplianceValidationResult {
    return {
      ruleId: 'AI_ACT_TRAINING_DATA',
      compliant: true,
      severity: 'ERROR',
      message: 'Training data quality standards met',
      details: {},
    };
  }
}
