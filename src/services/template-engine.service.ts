/**
 * Epic 6 Task 6.2: Enhanced Template Management
 * 
 * Dynamic template engine with variable substitution, brand customization,
 * multi-language support, and rich content capabilities.
 * 
 * Features:
 * - Dynamic template engine with variable substitution
 * - Brand customization for enterprise customers
 * - Multi-language support with localization
 * - Rich content support (HTML emails, embedded charts)
 * - Template versioning and A/B testing capabilities
 * - Performance optimization with caching
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.util';

export enum TemplateType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK'
}

export enum ContentFormat {
  PLAIN_TEXT = 'PLAIN_TEXT',
  HTML = 'HTML',
  MARKDOWN = 'MARKDOWN',
  JSON = 'JSON',
  RICH_TEXT = 'RICH_TEXT'
}

export enum TemplateStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DEPRECATED = 'DEPRECATED'
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface LocalizedContent {
  language: string;
  country?: string;
  subject?: string;
  body: string;
  preheader?: string; // For email templates
  metadata?: Record<string, any>;
}

export interface BrandConfiguration {
  id: string;
  name: string;
  organizationId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    sizes: Record<string, string>;
  };
  logo: {
    url: string;
    width?: number;
    height?: number;
    altText?: string;
  };
  footer: {
    companyName: string;
    address?: string;
    socialLinks?: Array<{
      platform: string;
      url: string;
    }>;
    unsubscribeText?: string;
  };
  customCSS?: string;
  customVariables?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: string;
  status: TemplateStatus;
  
  // Content structure
  content: {
    format: ContentFormat;
    localizedContent: LocalizedContent[];
    defaultLanguage: string;
  };
  
  // Variable definitions
  variables: TemplateVariable[];
  
  // Brand and styling
  brandId?: string;
  customStyling?: {
    css?: string;
    inlineStyles?: Record<string, string>;
    layoutTemplate?: string;
  };
  
  // A/B testing
  abTesting?: {
    enabled: boolean;
    variants: Array<{
      id: string;
      name: string;
      weight: number; // 0-100
      content: LocalizedContent[];
    }>;
    metrics: string[];
  };
  
  // Metadata
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    tags: string[];
    usage: {
      totalSent: number;
      lastUsed?: Date;
    };
  };
  
  // Validation and settings
  settings: {
    allowVariableInheritance: boolean;
    validateVariables: boolean;
    cacheTTL: number; // seconds
    maxRenderTime: number; // milliseconds
  };
}

export interface TemplateRenderContext {
  variables: Record<string, any>;
  language?: string;
  country?: string;
  brandId?: string;
  userId?: string;
  organizationId?: string;
  abTestVariant?: string;
  renderOptions?: {
    includeTracking: boolean;
    generatePreview: boolean;
    optimizeForMobile: boolean;
  };
}

export interface RenderedTemplate {
  subject?: string;
  body: string;
  preheader?: string;
  metadata: {
    templateId: string;
    templateVersion: number;
    language: string;
    brandId?: string;
    abTestVariant?: string;
    renderedAt: Date;
    renderTime: number; // milliseconds
    variables: Record<string, any>;
  };
  tracking?: {
    trackingPixel?: string;
    clickTrackingEnabled: boolean;
    unsubscribeLink?: string;
  };
}

export class EnhancedTemplateService {
  private prisma: PrismaClient;
  private templateCache: Map<string, NotificationTemplate> = new Map();
  private brandCache: Map<string, BrandConfiguration> = new Map();
  private renderCache: Map<string, RenderedTemplate> = new Map();
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      logger.info('Initializing Enhanced Template Service');
      
      // Load default templates
      await this.loadDefaultTemplates();
      
      // Setup cache cleanup
      this.setupCacheCleanup();
      
      logger.info('Enhanced Template Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Enhanced Template Service', error as Error);
      throw error;
    }
  }

  /**
   * Create a new notification template
   */
  async createTemplate(templateData: Omit<NotificationTemplate, 'id' | 'metadata'>): Promise<NotificationTemplate> {
    try {
      const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const template: NotificationTemplate = {
        ...templateData,
        id: templateId,
        metadata: {
          createdBy: 'system', // Should come from auth context
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: [],
          usage: {
            totalSent: 0
          }
        }
      };

      // Validate template
      this.validateTemplate(template);

      // Store in cache
      this.templateCache.set(templateId, template);

      logger.info(`Created notification template: ${templateId}`, {
        name: template.name,
        type: template.type,
        languages: template.content.localizedContent.length
      });

      return template;
    } catch (error) {
      logger.error('Failed to create notification template', error as Error);
      throw error;
    }
  }

  /**
   * Render template with given context
   */
  async renderTemplate(templateId: string, context: TemplateRenderContext): Promise<RenderedTemplate> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(templateId, context);
      const cached = this.renderCache.get(cacheKey);
      if (cached && this.isCacheValid(cached, context)) {
        return cached;
      }

      // Get template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Get brand configuration if specified
      let brand: BrandConfiguration | undefined;
      if (context.brandId) {
        brand = await this.getBrandConfiguration(context.brandId) || undefined;
      }

      // Determine content variant (A/B testing)
      const variant = this.selectABTestVariant(template, context.abTestVariant);
      
      // Get localized content
      const localizedContent = this.getLocalizedContent(
        template, 
        context.language || template.content.defaultLanguage,
        context.country,
        variant
      );

      // Process variables
      const processedVariables = await this.processVariables(template, context.variables);

      // Render content
      const renderedContent = await this.renderContent(
        localizedContent,
        processedVariables,
        template,
        brand,
        context
      );

      const renderTime = Date.now() - startTime;

      const result: RenderedTemplate = {
        subject: renderedContent.subject,
        body: renderedContent.body,
        preheader: renderedContent.preheader,
        metadata: {
          templateId: template.id,
          templateVersion: template.metadata.version,
          language: context.language || template.content.defaultLanguage,
          brandId: context.brandId,
          abTestVariant: variant?.id,
          renderedAt: new Date(),
          renderTime,
          variables: processedVariables
        }
      };

      // Add tracking if enabled
      if (context.renderOptions?.includeTracking) {
        result.tracking = this.generateTrackingInfo(template, context);
      }

      // Cache the result
      this.renderCache.set(cacheKey, result);

      // Update usage statistics
      template.metadata.usage.totalSent++;
      template.metadata.usage.lastUsed = new Date();

      logger.info(`Rendered template: ${templateId}`, {
        language: result.metadata.language,
        renderTime,
        brandId: context.brandId
      });

      return result;

    } catch (error) {
      logger.error('Failed to render template', error as Error, {
        templateId,
        language: context.language
      });
      throw error;
    }
  }

  /**
   * Create brand configuration
   */
  async createBrandConfiguration(brandData: Omit<BrandConfiguration, 'id'>): Promise<BrandConfiguration> {
    try {
      const brandId = `brand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const brand: BrandConfiguration = {
        ...brandData,
        id: brandId
      };

      this.brandCache.set(brandId, brand);

      logger.info(`Created brand configuration: ${brandId}`, {
        name: brand.name,
        organizationId: brand.organizationId
      });

      return brand;
    } catch (error) {
      logger.error('Failed to create brand configuration', error as Error);
      throw error;
    }
  }

  /**
   * Get template with caching
   */
  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    // Check cache first
    let template = this.templateCache.get(templateId);
    if (template) {
      return template;
    }

    // Load from database (simplified for now)
    template = await this.loadTemplateFromStorage(templateId) || undefined;
    if (template) {
      this.templateCache.set(templateId, template);
    }

    return template || null;
  }

  /**
   * Get brand configuration with caching
   */
  async getBrandConfiguration(brandId: string): Promise<BrandConfiguration | null> {
    // Check cache first
    let brand = this.brandCache.get(brandId);
    if (brand) {
      return brand;
    }

    // Load from database (simplified for now)
    brand = await this.loadBrandFromStorage(brandId) || undefined;
    if (brand) {
      this.brandCache.set(brandId, brand);
    }

    return brand || null;
  }

  /**
   * Process template variables
   */
  private async processVariables(
    template: NotificationTemplate, 
    inputVariables: Record<string, any>
  ): Promise<Record<string, any>> {
    const processed: Record<string, any> = {};

    for (const variable of template.variables) {
      let value = inputVariables[variable.name];

      // Use default value if not provided
      if (value === undefined && variable.defaultValue !== undefined) {
        value = variable.defaultValue;
      }

      // Validate required variables
      if (variable.required && value === undefined) {
        throw new Error(`Required variable missing: ${variable.name}`);
      }

      // Type conversion and validation
      if (value !== undefined) {
        value = this.convertVariableType(value, variable.type);
        this.validateVariable(value, variable);
      }

      processed[variable.name] = value;
    }

    return processed;
  }

  /**
   * Render content with variables and styling
   */
  private async renderContent(
    localizedContent: LocalizedContent,
    variables: Record<string, any>,
    template: NotificationTemplate,
    brand?: BrandConfiguration,
    context?: TemplateRenderContext
  ): Promise<{ subject?: string; body: string; preheader?: string }> {
    
    // Create rendering context
    const renderContext = {
      ...variables,
      ...(brand && { brand }),
      ...(context && { context }),
      // Add utility functions
      formatDate: (date: Date, format?: string) => this.formatDate(date, format),
      formatCurrency: (amount: number, currency?: string) => this.formatCurrency(amount, currency),
      formatNumber: (num: number, decimals?: number) => this.formatNumber(num, decimals)
    };

    // Render each field
    const result = {
      subject: localizedContent.subject ? this.renderString(localizedContent.subject, renderContext) : undefined,
      body: this.renderString(localizedContent.body, renderContext),
      preheader: localizedContent.preheader ? this.renderString(localizedContent.preheader, renderContext) : undefined
    };

    // Apply brand styling if applicable
    if (brand && template.type === TemplateType.EMAIL && template.content.format === ContentFormat.HTML) {
      result.body = this.applyBrandStyling(result.body, brand);
    }

    return result;
  }

  /**
   * Render string with variable substitution
   */
  private renderString(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      try {
        // Simple variable substitution
        const value = this.evaluateExpression(expression.trim(), context);
        return value !== undefined ? String(value) : match;
      } catch (error) {
        logger.warn(`Failed to evaluate expression: ${expression}`, error as Error);
        return match;
      }
    });
  }

  /**
   * Evaluate template expression
   */
  private evaluateExpression(expression: string, context: Record<string, any>): any {
    // Handle simple variable access
    if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(expression)) {
      return this.getNestedValue(context, expression);
    }

    // Handle function calls (basic implementation)
    const functionMatch = expression.match(/^(\w+)\((.*)\)$/);
    if (functionMatch) {
      const [, funcName, args] = functionMatch;
      if (context[funcName] && typeof context[funcName] === 'function') {
        try {
          const argValues = args ? args.split(',').map(arg => this.evaluateExpression(arg.trim(), context)) : [];
          return context[funcName](...argValues);
        } catch (error) {
          logger.warn(`Failed to execute function: ${funcName}`, error as Error);
        }
      }
    }

    return undefined;
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Apply brand styling to HTML content
   */
  private applyBrandStyling(html: string, brand: BrandConfiguration): string {
    let styled = html;

    // Replace brand variables
    styled = styled.replace(/\{\{brand\.(\w+)\}\}/g, (match, property) => {
      const value = this.getNestedValue(brand, property);
      return value !== undefined ? String(value) : match;
    });

    // Add brand CSS if not already present
    if (brand.customCSS && !styled.includes('<style>')) {
      const cssTag = `<style>${brand.customCSS}</style>`;
      styled = styled.replace('</head>', `${cssTag}</head>`);
    }

    return styled;
  }

  /**
   * Utility methods
   */
  private validateTemplate(template: NotificationTemplate): void {
    if (!template.name || template.name.trim().length === 0) {
      throw new Error('Template name is required');
    }
    if (!template.content.localizedContent || template.content.localizedContent.length === 0) {
      throw new Error('Template must have at least one localized content version');
    }
  }

  private convertVariableType(value: any, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      default:
        return value;
    }
  }

  private validateVariable(value: any, variable: TemplateVariable): void {
    if (!variable.validation) return;

    const validation = variable.validation;
    
    if (typeof value === 'string') {
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        throw new Error(`Variable ${variable.name} does not match pattern: ${validation.pattern}`);
      }
      if (validation.minLength && value.length < validation.minLength) {
        throw new Error(`Variable ${variable.name} is too short (min: ${validation.minLength})`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        throw new Error(`Variable ${variable.name} is too long (max: ${validation.maxLength})`);
      }
    }
    
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Variable ${variable.name} is too small (min: ${validation.min})`);
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Variable ${variable.name} is too large (max: ${validation.max})`);
      }
    }
  }

  private getLocalizedContent(
    template: NotificationTemplate, 
    language: string, 
    country?: string, 
    variant?: any
  ): LocalizedContent {
    let content = variant?.content || template.content.localizedContent;
    
    // Try exact match (language + country)
    if (country) {
      const exact = content.find((c: LocalizedContent) => 
        c.language === language && c.country === country
      );
      if (exact) return exact;
    }
    
    // Try language match
    const langMatch = content.find((c: LocalizedContent) => c.language === language);
    if (langMatch) return langMatch;
    
    // Fallback to default language
    const defaultMatch = content.find((c: LocalizedContent) => 
      c.language === template.content.defaultLanguage
    );
    if (defaultMatch) return defaultMatch;
    
    // Last resort - first available
    return content[0];
  }

  private selectABTestVariant(template: NotificationTemplate, variantId?: string): any {
    if (!template.abTesting?.enabled || !template.abTesting.variants.length) {
      return null;
    }

    if (variantId) {
      return template.abTesting.variants.find(v => v.id === variantId);
    }

    // Random selection based on weights
    const totalWeight = template.abTesting.variants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const variant of template.abTesting.variants) {
      currentWeight += variant.weight;
      if (random <= currentWeight) {
        return variant;
      }
    }

    return template.abTesting.variants[0]; // Fallback
  }

  private generateTrackingInfo(template: NotificationTemplate, context: TemplateRenderContext): any {
    return {
      trackingPixel: `https://track.example.com/pixel/${template.id}/${context.userId}`,
      clickTrackingEnabled: true,
      unsubscribeLink: `https://unsubscribe.example.com/${context.userId}`
    };
  }

  private generateCacheKey(templateId: string, context: TemplateRenderContext): string {
    const keyParts = [
      templateId,
      context.language || 'default',
      context.brandId || 'default',
      context.abTestVariant || 'default',
      JSON.stringify(context.variables)
    ];
    return keyParts.join('|');
  }

  private isCacheValid(cached: RenderedTemplate, context: TemplateRenderContext): boolean {
    // Check if cache is still valid (simplified TTL check)
    const cacheAge = Date.now() - cached.metadata.renderedAt.getTime();
    return cacheAge < 5 * 60 * 1000; // 5 minutes TTL
  }

  private async loadTemplateFromStorage(templateId: string): Promise<NotificationTemplate | null> {
    // Simplified - would normally fetch from database
    if (templateId === 'tpl_bias_detection_alert') {
      return this.getDefaultBiasDetectionTemplate();
    }
    return null;
  }

  private async loadBrandFromStorage(brandId: string): Promise<BrandConfiguration | null> {
    // Simplified - would normally fetch from database
    return null;
  }

  private async loadDefaultTemplates(): Promise<void> {
    // Load bias detection template
    const biasTemplate = this.getDefaultBiasDetectionTemplate();
    this.templateCache.set(biasTemplate.id, biasTemplate);
    
    logger.info('Loaded default notification templates');
  }

  private getDefaultBiasDetectionTemplate(): NotificationTemplate {
    return {
      id: 'tpl_bias_detection_alert',
      name: 'Bias Detection Alert',
      description: 'Template for bias detection notifications',
      type: TemplateType.EMAIL,
      category: 'compliance',
      status: TemplateStatus.ACTIVE,
      content: {
        format: ContentFormat.HTML,
        defaultLanguage: 'en',
        localizedContent: [
          {
            language: 'en',
            subject: 'URGENT: Bias Detected in Assessment {{assessmentId}}',
            body: `
              <html>
                <body>
                  <h2>Bias Detection Alert</h2>
                  <p>Dear {{recipientName}},</p>
                  <p>Our bias detection system has identified potential bias in assessment <strong>{{assessmentId}}</strong>.</p>
                  
                  <h3>Details:</h3>
                  <ul>
                    <li><strong>Assessment:</strong> {{assessmentTitle}}</li>
                    <li><strong>Bias Type:</strong> {{biasType}}</li>
                    <li><strong>Severity:</strong> {{biasSeverity}}</li>
                    <li><strong>Detected At:</strong> {{formatDate detectedAt}}</li>
                  </ul>
                  
                  <p><strong>Immediate action required.</strong> Please review the assessment and implement necessary corrections.</p>
                  
                  <p>Best regards,<br>Dessai Compliance Team</p>
                </body>
              </html>
            `,
            preheader: 'Bias detected in assessment - immediate review required'
          }
        ]
      },
      variables: [
        {
          name: 'recipientName',
          type: 'string',
          required: true,
          description: 'Name of the notification recipient'
        },
        {
          name: 'assessmentId',
          type: 'string',
          required: true,
          description: 'Unique identifier for the assessment'
        },
        {
          name: 'assessmentTitle',
          type: 'string',
          required: true,
          description: 'Title of the assessment'
        },
        {
          name: 'biasType',
          type: 'string',
          required: true,
          description: 'Type of bias detected'
        },
        {
          name: 'biasSeverity',
          type: 'string',
          required: true,
          description: 'Severity level of the bias'
        },
        {
          name: 'detectedAt',
          type: 'date',
          required: true,
          description: 'Timestamp when bias was detected'
        }
      ],
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        tags: ['bias-detection', 'compliance', 'alert'],
        usage: {
          totalSent: 0
        }
      },
      settings: {
        allowVariableInheritance: true,
        validateVariables: true,
        cacheTTL: 300, // 5 minutes
        maxRenderTime: 5000 // 5 seconds
      }
    };
  }

  private setupCacheCleanup(): void {
    // Clean cache every 30 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 30 * 60 * 1000);
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean render cache
    for (const [key, cached] of this.renderCache.entries()) {
      const age = now - cached.metadata.renderedAt.getTime();
      if (age > 30 * 60 * 1000) { // 30 minutes
        this.renderCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  private formatDate(date: Date, format?: string): string {
    // Simplified date formatting
    return date.toISOString();
  }

  private formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  private formatNumber(num: number, decimals = 2): string {
    return num.toFixed(decimals);
  }
}

export const enhancedTemplateService = new EnhancedTemplateService(new PrismaClient());
