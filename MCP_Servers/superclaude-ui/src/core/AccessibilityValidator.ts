import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@superclaude/shared';
import {
  GeneratedComponent,
  AccessibilityRequirements,
  AccessibilityValidation,
  AccessibilityValidationRequest,
  AccessibilityRequirementsSchema,
  AccessibilityValidationSchema
} from '../types';

export interface AccessibilityValidatorOptions {
  strictMode?: boolean;
  enableAutoFix?: boolean;
  defaultLevel?: 'A' | 'AA' | 'AAA';
  enableColorContrastCheck?: boolean;
  enableKeyboardNavigationCheck?: boolean;
}

export interface AccessibilityRule {
  id: string;
  name: string;
  description: string;
  level: 'A' | 'AA' | 'AAA';
  category: 'perceivable' | 'operable' | 'understandable' | 'robust';
  checker: (code: string, component?: GeneratedComponent) => AccessibilityIssue[];
  autoFix?: (code: string) => string;
}

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  element?: string;
  suggestion?: string;
  line?: number;
  column?: number;
}

export interface ColorContrastResult {
  ratio: number;
  passes: {
    AA: boolean;
    AAA: boolean;
  };
  foreground: string;
  background: string;
}

export class AccessibilityValidator extends EventEmitter {
  private readonly logger: Logger;
  private readonly options: Required<AccessibilityValidatorOptions>;
  private rules: Map<string, AccessibilityRule> = new Map();
  private validationHistory: Map<string, AccessibilityValidation> = new Map();
  private colorContrastCache: Map<string, ColorContrastResult> = new Map();
  private metrics: {
    validationsPerformed: number;
    issuesFound: number;
    issuesFixed: number;
    averageScore: number;
    complianceRate: number;
  };

  constructor(options: AccessibilityValidatorOptions = {}) {
    super();
    this.logger = new Logger('AccessibilityValidator');
    this.options = {
      strictMode: options.strictMode ?? false,
      enableAutoFix: options.enableAutoFix ?? true,
      defaultLevel: options.defaultLevel ?? 'AA',
      enableColorContrastCheck: options.enableColorContrastCheck ?? true,
      enableKeyboardNavigationCheck: options.enableKeyboardNavigationCheck ?? true
    };
    this.metrics = {
      validationsPerformed: 0,
      issuesFound: 0,
      issuesFixed: 0,
      averageScore: 0,
      complianceRate: 0
    };

    this.initializeAccessibilityRules();
  }

  /**
   * Validate component accessibility
   */
  async validateComponent(request: AccessibilityValidationRequest): Promise<AccessibilityValidation> {
    const { componentId, requirements, code } = request;

    try {
      // Validate requirements
      const validatedRequirements = requirements 
        ? AccessibilityRequirementsSchema.parse(requirements)
        : { level: this.options.defaultLevel, features: {} };

      // Get component or use provided code
      let component: GeneratedComponent | null = null;
      let componentCode = code;

      if (componentId && !code) {
        component = await this.getComponentById(componentId);
        if (!component) {
          throw new Error(`Component ${componentId} not found`);
        }
        componentCode = component.code.component;
      }

      if (!componentCode) {
        throw new Error('No component code provided for validation');
      }

      // Perform validation
      const validation = await this.performAccessibilityValidation(
        componentId || uuidv4(),
        componentCode,
        validatedRequirements,
        component
      );

      // Store validation result
      this.validationHistory.set(validation.componentId, validation);
      
      // Update metrics
      this.updateMetrics(validation);

      this.emit('validationCompleted', {
        componentId: validation.componentId,
        compliant: validation.results.compliant,
        score: validation.results.score,
        issueCount: validation.results.issues.length
      });

      this.logger.info(`Accessibility validation completed for component ${validation.componentId}: ${validation.results.score}/100`);

      return validation;
    } catch (error) {
      this.logger.error('Failed to validate component accessibility:', error);
      throw error;
    }
  }

  /**
   * Auto-fix accessibility issues
   */
  async autoFixIssues(
    componentCode: string,
    issues: AccessibilityIssue[]
  ): Promise<{ fixedCode: string; fixedIssues: AccessibilityIssue[]; unfixedIssues: AccessibilityIssue[] }> {
    if (!this.options.enableAutoFix) {
      return {
        fixedCode: componentCode,
        fixedIssues: [],
        unfixedIssues: issues
      };
    }

    try {
      let fixedCode = componentCode;
      const fixedIssues: AccessibilityIssue[] = [];
      const unfixedIssues: AccessibilityIssue[] = [];

      for (const issue of issues) {
        const rule = this.rules.get(issue.rule);
        if (rule && rule.autoFix) {
          try {
            fixedCode = rule.autoFix(fixedCode);
            fixedIssues.push(issue);
            this.metrics.issuesFixed++;
          } catch (error) {
            this.logger.warn(`Failed to auto-fix issue ${issue.rule}:`, error);
            unfixedIssues.push(issue);
          }
        } else {
          unfixedIssues.push(issue);
        }
      }

      this.emit('issuesAutoFixed', {
        fixedCount: fixedIssues.length,
        unfixedCount: unfixedIssues.length
      });

      return { fixedCode, fixedIssues, unfixedIssues };
    } catch (error) {
      this.logger.error('Failed to auto-fix accessibility issues:', error);
      throw error;
    }
  }

  /**
   * Check color contrast
   */
  async checkColorContrast(
    foregroundColor: string,
    backgroundColor: string,
    fontSize?: string
  ): Promise<ColorContrastResult> {
    const cacheKey = `${foregroundColor}-${backgroundColor}-${fontSize || 'normal'}`;
    
    if (this.colorContrastCache.has(cacheKey)) {
      return this.colorContrastCache.get(cacheKey)!;
    }

    try {
      const contrast = this.calculateColorContrast(foregroundColor, backgroundColor);
      const isLargeText = fontSize ? this.isLargeText(fontSize) : false;

      const result: ColorContrastResult = {
        ratio: contrast,
        passes: {
          AA: isLargeText ? contrast >= 3.0 : contrast >= 4.5,
          AAA: isLargeText ? contrast >= 4.5 : contrast >= 7.0
        },
        foreground: foregroundColor,
        background: backgroundColor
      };

      this.colorContrastCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to check color contrast:', error);
      throw error;
    }
  }

  /**
   * Generate accessibility report
   */
  async generateAccessibilityReport(componentId: string): Promise<{
    summary: {
      score: number;
      compliant: boolean;
      level: 'A' | 'AA' | 'AAA';
      issueCount: number;
    };
    categories: Record<string, {
      score: number;
      issues: AccessibilityIssue[];
    }>;
    recommendations: string[];
    improvements: Array<{
      priority: 'high' | 'medium' | 'low';
      description: string;
      implementation: string;
    }>;
  }> {
    const validation = this.validationHistory.get(componentId);
    if (!validation) {
      throw new Error(`No validation found for component ${componentId}`);
    }

    try {
      const { results } = validation;
      
      // Categorize issues
      const categories: Record<string, { score: number; issues: AccessibilityIssue[] }> = {
        perceivable: { score: 100, issues: [] },
        operable: { score: 100, issues: [] },
        understandable: { score: 100, issues: [] },
        robust: { score: 100, issues: [] }
      };

      for (const issue of results.issues) {
        const rule = this.rules.get(issue.rule);
        if (rule) {
          categories[rule.category].issues.push(issue);
          categories[rule.category].score -= this.getIssueScoreDeduction(issue.type);
        }
      }

      // Generate recommendations
      const recommendations: string[] = [];
      const improvements: Array<{
        priority: 'high' | 'medium' | 'low';
        description: string;
        implementation: string;
      }> = [];

      if (results.score < 80) {
        recommendations.push('Address critical accessibility issues to improve compliance');
      }

      // Add specific improvements based on issues
      for (const issue of results.issues) {
        if (issue.type === 'error') {
          improvements.push({
            priority: 'high',
            description: issue.description,
            implementation: issue.suggestion || 'Review accessibility documentation'
          });
        }
      }

      return {
        summary: {
          score: results.score,
          compliant: results.compliant,
          level: validation.level,
          issueCount: results.issues.length
        },
        categories,
        recommendations,
        improvements
      };
    } catch (error) {
      this.logger.error('Failed to generate accessibility report:', error);
      throw error;
    }
  }

  /**
   * Get validation history
   */
  getValidationHistory(componentId?: string): AccessibilityValidation[] {
    if (componentId) {
      const validation = this.validationHistory.get(componentId);
      return validation ? [validation] : [];
    }
    return Array.from(this.validationHistory.values());
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Private methods
   */
  private async performAccessibilityValidation(
    componentId: string,
    code: string,
    requirements: AccessibilityRequirements,
    component?: GeneratedComponent | null
  ): Promise<AccessibilityValidation> {
    const issues: AccessibilityIssue[] = [];
    const features: Record<string, boolean> = {};

    // Run all applicable rules
    for (const rule of this.rules.values()) {
      // Skip rules that don't apply to the requested level
      if (this.getRuleLevelNumber(rule.level) > this.getRuleLevelNumber(requirements.level)) {
        continue;
      }

      // Skip rules if features are disabled
      if (requirements.features) {
        if (rule.category === 'operable' && 
            rule.name.includes('keyboard') && 
            requirements.features.keyboardNavigation === false) {
          continue;
        }
        if (rule.name.includes('screen reader') && 
            requirements.features.screenReader === false) {
          continue;
        }
      }

      // Run rule checker
      try {
        const ruleIssues = rule.checker(code, component || undefined);
        issues.push(...ruleIssues);
      } catch (error) {
        this.logger.warn(`Failed to run accessibility rule ${rule.id}:`, error);
      }
    }

    // Check required features
    features.keyboardNavigation = this.checkKeyboardNavigation(code);
    features.screenReader = this.checkScreenReaderSupport(code);
    features.highContrast = this.checkHighContrastSupport(code);
    features.reducedMotion = this.checkReducedMotionSupport(code);
    features.focusManagement = this.checkFocusManagement(code);

    // Calculate score
    const score = this.calculateAccessibilityScore(issues, features, requirements.level);
    
    // Determine compliance
    const compliant = score >= 80 && 
                     issues.filter(i => i.type === 'error').length === 0;

    const validation: AccessibilityValidation = {
      componentId,
      level: requirements.level,
      results: {
        compliant,
        score,
        issues,
        features
      },
      timestamp: new Date()
    };

    return AccessibilityValidationSchema.parse(validation);
  }

  private initializeAccessibilityRules(): void {
    // WCAG 2.1 Rules Implementation

    // Perceivable Rules
    this.addRule({
      id: 'missing-alt-text',
      name: 'Images must have alt text',
      description: 'All images must have meaningful alternative text',
      level: 'A',
      category: 'perceivable',
      checker: (code) => {
        const issues: AccessibilityIssue[] = [];
        const imgRegex = /<img[^>]*>/g;
        let match;

        while ((match = imgRegex.exec(code)) !== null) {
          const imgTag = match[0];
          if (!imgTag.includes('alt=') && !imgTag.includes('aria-label=')) {
            issues.push({
              type: 'error',
              rule: 'missing-alt-text',
              description: 'Image element is missing alt attribute',
              element: imgTag,
              suggestion: 'Add alt attribute with descriptive text'
            });
          }
        }

        return issues;
      },
      autoFix: (code) => {
        return code.replace(/<img([^>]*?)(?:>|\/>)/g, (match, attributes) => {
          if (!attributes.includes('alt=')) {
            return `<img${attributes} alt="" />`;
          }
          return match;
        });
      }
    });

    this.addRule({
      id: 'missing-form-labels',
      name: 'Form inputs must have labels',
      description: 'All form inputs must have associated labels',
      level: 'A',
      category: 'perceivable',
      checker: (code) => {
        const issues: AccessibilityIssue[] = [];
        const inputRegex = /<input[^>]*>/g;
        let match;

        while ((match = inputRegex.exec(code)) !== null) {
          const inputTag = match[0];
          const hasId = /id=["']([^"']+)["']/.test(inputTag);
          const hasAriaLabel = /aria-label=/.test(inputTag);
          const hasAriaLabelledBy = /aria-labelledby=/.test(inputTag);

          if (!hasAriaLabel && !hasAriaLabelledBy) {
            if (hasId) {
              const idMatch = inputTag.match(/id=["']([^"']+)["']/);
              const id = idMatch ? idMatch[1] : '';
              const hasAssociatedLabel = code.includes(`for="${id}"`);
              
              if (!hasAssociatedLabel) {
                issues.push({
                  type: 'error',
                  rule: 'missing-form-labels',
                  description: 'Input element is missing associated label',
                  element: inputTag,
                  suggestion: 'Add a label element with for attribute or aria-label'
                });
              }
            } else {
              issues.push({
                type: 'error',
                rule: 'missing-form-labels',
                description: 'Input element is missing label and id',
                element: inputTag,
                suggestion: 'Add id attribute and associated label or use aria-label'
              });
            }
          }
        }

        return issues;
      },
      autoFix: (code) => {
        return code.replace(/<input([^>]*?)(?:>|\/>)/g, (match, attributes) => {
          if (!attributes.includes('aria-label=') && 
              !attributes.includes('aria-labelledby=')) {
            return `<input${attributes} aria-label="Input field" />`;
          }
          return match;
        });
      }
    });

    // Operable Rules
    this.addRule({
      id: 'missing-keyboard-support',
      name: 'Interactive elements must support keyboard navigation',
      description: 'All interactive elements must be keyboard accessible',
      level: 'A',
      category: 'operable',
      checker: (code) => {
        const issues: AccessibilityIssue[] = [];
        
        // Check for click handlers on non-interactive elements
        const clickHandlerRegex = /onClick|click=/g;
        const divButtonRegex = /<div[^>]*(?:onClick|click=)[^>]*>/g;
        
        let match;
        while ((match = divButtonRegex.exec(code)) !== null) {
          const element = match[0];
          if (!element.includes('tabIndex=') && !element.includes('role=')) {
            issues.push({
              type: 'warning',
              rule: 'missing-keyboard-support',
              description: 'Interactive div element may not be keyboard accessible',
              element,
              suggestion: 'Add tabIndex and role attributes, or use button element'
            });
          }
        }

        return issues;
      },
      autoFix: (code) => {
        return code.replace(
          /<div([^>]*?)(onClick|click=)[^>]*>/g,
          (match, attributes, clickHandler) => {
            if (!attributes.includes('tabIndex=')) {
              return match.replace('<div', '<div tabIndex="0" role="button"');
            }
            return match;
          }
        );
      }
    });

    // Understandable Rules
    this.addRule({
      id: 'missing-page-title',
      name: 'Page must have a title',
      description: 'Every page must have a descriptive title',
      level: 'A',
      category: 'understandable',
      checker: (code) => {
        const issues: AccessibilityIssue[] = [];
        
        if (!code.includes('<title>') && !code.includes('document.title')) {
          issues.push({
            type: 'warning',
            rule: 'missing-page-title',
            description: 'Page is missing a title element',
            suggestion: 'Add a descriptive title to the page'
          });
        }

        return issues;
      }
    });

    // Robust Rules
    this.addRule({
      id: 'invalid-html',
      name: 'HTML must be valid',
      description: 'HTML markup must be semantically correct and valid',
      level: 'A',
      category: 'robust',
      checker: (code) => {
        const issues: AccessibilityIssue[] = [];
        
        // Check for unclosed tags (simplified)
        const unclosedTags = ['<div(?![^>]*\/>)', '<span(?![^>]*\/>)', '<p(?![^>]*\/>)'];
        
        for (const tagPattern of unclosedTags) {
          const openTags = (code.match(new RegExp(tagPattern, 'g')) || []).length;
          const tagName = tagPattern.replace(/[^a-z]/g, '');
          const closeTags = (code.match(new RegExp(`</${tagName}>`, 'g')) || []).length;
          
          if (openTags > closeTags) {
            issues.push({
              type: 'error',
              rule: 'invalid-html',
              description: `Unclosed ${tagName} tag detected`,
              suggestion: `Ensure all ${tagName} tags are properly closed`
            });
          }
        }

        return issues;
      }
    });

    // Add more rules for comprehensive WCAG coverage...
  }

  private addRule(rule: AccessibilityRule): void {
    this.rules.set(rule.id, rule);
  }

  private calculateColorContrast(foreground: string, background: string): number {
    // Simplified color contrast calculation
    // In a real implementation, this would use proper color space conversion
    
    const getLuminance = (color: string): number => {
      // Convert hex to RGB and calculate relative luminance
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private isLargeText(fontSize: string): boolean {
    const size = parseInt(fontSize);
    return size >= 18 || (fontSize.includes('pt') && size >= 14);
  }

  private getRuleLevelNumber(level: 'A' | 'AA' | 'AAA'): number {
    return { A: 1, AA: 2, AAA: 3 }[level];
  }

  private checkKeyboardNavigation(code: string): boolean {
    return code.includes('tabIndex') || 
           code.includes('onKeyDown') || 
           code.includes('onKeyUp') ||
           code.includes('role=');
  }

  private checkScreenReaderSupport(code: string): boolean {
    return code.includes('aria-') || 
           code.includes('role=') || 
           code.includes('alt=') ||
           code.includes('aria-label');
  }

  private checkHighContrastSupport(code: string): boolean {
    return code.includes('prefers-contrast') || 
           code.includes('high-contrast') ||
           code.includes('forced-colors');
  }

  private checkReducedMotionSupport(code: string): boolean {
    return code.includes('prefers-reduced-motion') || 
           code.includes('reduced-motion');
  }

  private checkFocusManagement(code: string): boolean {
    return code.includes('focus') || 
           code.includes('tabIndex') ||
           code.includes('autofocus');
  }

  private calculateAccessibilityScore(
    issues: AccessibilityIssue[],
    features: Record<string, boolean>,
    level: 'A' | 'AA' | 'AAA'
  ): number {
    let score = 100;

    // Deduct points for issues
    for (const issue of issues) {
      score -= this.getIssueScoreDeduction(issue.type);
    }

    // Deduct points for missing features
    const requiredFeatures = this.getRequiredFeatures(level);
    for (const feature of requiredFeatures) {
      if (!features[feature]) {
        score -= 10;
      }
    }

    return Math.max(0, score);
  }

  private getIssueScoreDeduction(type: 'error' | 'warning' | 'info'): number {
    switch (type) {
      case 'error': return 15;
      case 'warning': return 8;
      case 'info': return 3;
      default: return 0;
    }
  }

  private getRequiredFeatures(level: 'A' | 'AA' | 'AAA'): string[] {
    const features = ['keyboardNavigation', 'screenReader'];
    
    if (level === 'AA' || level === 'AAA') {
      features.push('highContrast', 'focusManagement');
    }
    
    if (level === 'AAA') {
      features.push('reducedMotion');
    }
    
    return features;
  }

  private updateMetrics(validation: AccessibilityValidation): void {
    this.metrics.validationsPerformed++;
    this.metrics.issuesFound += validation.results.issues.length;
    
    // Update average score
    this.metrics.averageScore = (
      (this.metrics.averageScore * (this.metrics.validationsPerformed - 1) + validation.results.score) /
      this.metrics.validationsPerformed
    );
    
    // Update compliance rate
    if (validation.results.compliant) {
      this.metrics.complianceRate = (
        (this.metrics.complianceRate * (this.metrics.validationsPerformed - 1) + 100) /
        this.metrics.validationsPerformed
      );
    } else {
      this.metrics.complianceRate = (
        this.metrics.complianceRate * (this.metrics.validationsPerformed - 1) /
        this.metrics.validationsPerformed
      );
    }
  }

  private async getComponentById(componentId: string): Promise<GeneratedComponent | null> {
    // This would integrate with ComponentGenerator to get the component
    // For now, return null as this is a placeholder
    return null;
  }
}