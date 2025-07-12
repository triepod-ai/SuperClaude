import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { QualityGateResult, QualityGateStatus } from '../types/common.js';

/**
 * Validation step types
 */
export enum ValidationStep {
  SYNTAX = 'syntax',
  TYPE_CHECK = 'type_check',
  LINT = 'lint',
  SECURITY = 'security',
  TEST = 'test',
  PERFORMANCE = 'performance',
  DOCUMENTATION = 'documentation',
  INTEGRATION = 'integration'
}

/**
 * Quality issue severity levels
 */
export enum QualityLevel {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Quality issue
 */
export interface QualityIssue {
  id: string;
  level: QualityLevel;
  step: ValidationStep;
  title: string;
  description: string;
  filePath?: string;
  line?: number;
  column?: number;
  fixable: boolean;
  metadata: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  step: ValidationStep;
  passed: boolean;
  score: number;
  issues: QualityIssue[];
  executionTime: number;
  metadata: Record<string, any>;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  steps: Record<ValidationStep, {
    enabled: boolean;
    weight: number;
    timeout: number;
  }>;
  thresholds: {
    minScore: number;
    maxCriticalIssues: number;
    maxHighIssues: number;
  };
  parallel: boolean;
  maxConcurrency: number;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  steps: {
    [ValidationStep.SYNTAX]: { enabled: true, weight: 1.0, timeout: 30000 },
    [ValidationStep.TYPE_CHECK]: { enabled: true, weight: 0.8, timeout: 60000 },
    [ValidationStep.LINT]: { enabled: true, weight: 0.6, timeout: 45000 },
    [ValidationStep.SECURITY]: { enabled: true, weight: 1.0, timeout: 60000 },
    [ValidationStep.TEST]: { enabled: true, weight: 0.8, timeout: 120000 },
    [ValidationStep.PERFORMANCE]: { enabled: true, weight: 0.7, timeout: 90000 },
    [ValidationStep.DOCUMENTATION]: { enabled: true, weight: 0.4, timeout: 30000 },
    [ValidationStep.INTEGRATION]: { enabled: true, weight: 0.9, timeout: 180000 }
  },
  thresholds: {
    minScore: 70,
    maxCriticalIssues: 0,
    maxHighIssues: 3
  },
  parallel: true,
  maxConcurrency: 5
};

/**
 * Validation input
 */
export interface ValidateInput {
  filePath: string;
  content?: string;
  language?: string;
  enabledSteps?: ValidationStep[];
  config?: Partial<ValidationConfig>;
}

/**
 * Step executor function type
 */
export type StepExecutor = (filePath: string, content: string, language: string) => Promise<ValidationResult>;

/**
 * Unified validation service
 * Consolidates validation logic from multiple servers into a single framework
 */
export class UnifiedValidationService {
  private config: ValidationConfig;
  private stepExecutors: Map<ValidationStep, StepExecutor> = new Map();

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.initializeDefaultExecutors();
  }

  /**
   * Register a custom step executor
   */
  registerStepExecutor(step: ValidationStep, executor: StepExecutor): void {
    this.stepExecutors.set(step, executor);
    logger.info('Registered custom step executor', { step });
  }

  /**
   * Execute validation for a single file
   */
  async validateFile(input: ValidateInput): Promise<ValidationResult[]> {
    const enabledSteps = input.enabledSteps || Object.values(ValidationStep);
    const content = input.content || await this.readFileContent(input.filePath);
    const language = input.language || this.detectLanguage(input.filePath);

    logger.info('Starting file validation', {
      filePath: input.filePath,
      language,
      steps: enabledSteps.length
    });

    const results: ValidationResult[] = [];
    
    if (this.config.parallel) {
      // Execute steps in parallel
      const stepPromises = enabledSteps
        .filter(step => this.config.steps[step].enabled)
        .map(async step => {
          try {
            const startTime = Date.now();
            const executor = this.stepExecutors.get(step);
            
            if (!executor) {
              throw new Error(`No executor found for step: ${step}`);
            }

            const result = await this.executeWithTimeout(
              executor(input.filePath, content, language),
              this.config.steps[step].timeout
            );

            result.executionTime = Date.now() - startTime;
            return result;
          } catch (error) {
            return this.createErrorResult(step, error, Date.now());
          }
        });

      const stepResults = await Promise.all(stepPromises);
      results.push(...stepResults);
    } else {
      // Execute steps sequentially
      for (const step of enabledSteps) {
        if (!this.config.steps[step].enabled) continue;
        
        try {
          const startTime = Date.now();
          const executor = this.stepExecutors.get(step);
          
          if (!executor) {
            throw new Error(`No executor found for step: ${step}`);
          }

          const result = await this.executeWithTimeout(
            executor(input.filePath, content, language),
            this.config.steps[step].timeout
          );

          result.executionTime = Date.now() - startTime;
          results.push(result);
        } catch (error) {
          results.push(this.createErrorResult(step, error, Date.now()));
        }
      }
    }

    logger.info('File validation completed', {
      filePath: input.filePath,
      resultsCount: results.length,
      passed: results.filter(r => r.passed).length
    });

    return results;
  }

  /**
   * Execute validation for multiple files
   */
  async validateProject(
    projectPath: string,
    options: {
      includePaths?: string[];
      excludePaths?: string[];
      enabledSteps?: ValidationStep[];
      parallel?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<Map<string, ValidationResult[]>> {
    const files = await this.findValidationTargets(projectPath, options);
    const results = new Map<string, ValidationResult[]>();

    logger.info('Starting project validation', {
      projectPath,
      fileCount: files.length,
      parallel: options.parallel
    });

    if (options.parallel !== false) {
      // Parallel execution with concurrency control
      const concurrency = options.maxConcurrency || this.config.maxConcurrency;
      const chunks = this.chunkArray(files, concurrency);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async filePath => {
          try {
            const fileResults = await this.validateFile({
              filePath,
              enabledSteps: options.enabledSteps
            });
            results.set(filePath, fileResults);
          } catch (error) {
            logger.error(`Validation failed for ${filePath}`, { error });
            results.set(filePath, []);
          }
        });

        await Promise.all(chunkPromises);
      }
    } else {
      // Sequential execution
      for (const filePath of files) {
        try {
          const fileResults = await this.validateFile({
            filePath,
            enabledSteps: options.enabledSteps
          });
          results.set(filePath, fileResults);
        } catch (error) {
          logger.error(`Validation failed for ${filePath}`, { error });
          results.set(filePath, []);
        }
      }
    }

    logger.info('Project validation completed', {
      projectPath,
      filesProcessed: results.size
    });

    return results;
  }

  /**
   * Generate quality gate results from validation results
   */
  generateQualityGates(results: ValidationResult[]): QualityGateResult[] {
    const gates: QualityGateResult[] = [];

    // Overall quality gate
    const overallScore = this.calculateOverallScore(results);
    const criticalIssues = this.countIssuesByLevel(results, QualityLevel.CRITICAL);
    const highIssues = this.countIssuesByLevel(results, QualityLevel.HIGH);

    const overallPassed = overallScore >= this.config.thresholds.minScore &&
                         criticalIssues <= this.config.thresholds.maxCriticalIssues &&
                         highIssues <= this.config.thresholds.maxHighIssues;

    gates.push({
      gate: 'overall_quality',
      status: overallPassed ? 'passed' : 'failed',
      score: overallScore / 100,
      message: `Overall quality score: ${overallScore.toFixed(1)}/100`,
      details: {
        criticalIssues,
        highIssues,
        score: overallScore
      },
      timestamp: new Date()
    });

    // Step-specific gates
    for (const result of results) {
      const stepCriticalIssues = result.issues.filter(i => i.level === QualityLevel.CRITICAL).length;
      const stepPassed = result.passed && stepCriticalIssues === 0;

      gates.push({
        gate: `step_${result.step}`,
        status: stepPassed ? 'passed' : 'failed',
        score: result.score / 100,
        message: `${result.step} validation: ${result.issues.length} issues found`,
        details: {
          step: result.step,
          issues: result.issues.length,
          criticalIssues: stepCriticalIssues,
          executionTime: result.executionTime
        },
        timestamp: new Date()
      });
    }

    return gates;
  }

  /**
   * Get validation summary
   */
  getSummary(results: ValidationResult[]): {
    overallScore: number;
    totalIssues: number;
    criticalIssues: number;
    stepsPassed: number;
    stepsTotal: number;
    executionTime: number;
  } {
    const overallScore = this.calculateOverallScore(results);
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = this.countIssuesByLevel(results, QualityLevel.CRITICAL);
    const stepsPassed = results.filter(r => r.passed).length;
    const stepsTotal = results.length;
    const executionTime = results.reduce((sum, r) => sum + r.executionTime, 0);

    return {
      overallScore,
      totalIssues,
      criticalIssues,
      stepsPassed,
      stepsTotal,
      executionTime
    };
  }

  // ==================== PRIVATE IMPLEMENTATION ====================

  private initializeDefaultExecutors(): void {
    // Initialize with basic implementations
    // Servers can override these with more sophisticated implementations
    
    this.stepExecutors.set(ValidationStep.SYNTAX, async (filePath, content, language) => {
      const issues: QualityIssue[] = [];
      
      // Basic syntax validation
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Check for basic syntax issues
        const openBrackets = (line.match(/[({\[]/g) || []).length;
        const closeBrackets = (line.match(/[)}\]]/g) || []).length;
        
        if (openBrackets !== closeBrackets && !line.trim().endsWith('\\')) {
          issues.push({
            id: `syntax-bracket-${index}`,
            level: QualityLevel.HIGH,
            step: ValidationStep.SYNTAX,
            title: 'Potential Bracket Mismatch',
            description: 'Unmatched brackets detected',
            filePath,
            line: index + 1,
            fixable: false,
            metadata: { pattern: 'bracket-mismatch' }
          });
        }
      });
      
      return {
        step: ValidationStep.SYNTAX,
        passed: issues.filter(i => i.level === QualityLevel.CRITICAL || i.level === QualityLevel.HIGH).length === 0,
        score: this.calculateStepScore(issues),
        issues,
        executionTime: 0,
        metadata: { language, checksPerformed: ['bracket-matching'] }
      };
    });

    this.stepExecutors.set(ValidationStep.SECURITY, async (filePath, content, language) => {
      const issues: QualityIssue[] = [];
      
      // Basic security pattern detection
      const securityPatterns = [
        { pattern: /eval\s*\(/, level: QualityLevel.CRITICAL, title: 'Code Injection Risk', description: 'Use of eval() detected' },
        { pattern: /innerHTML\s*=/, level: QualityLevel.HIGH, title: 'XSS Risk', description: 'Direct innerHTML assignment detected' },
        { pattern: /password\s*=\s*['"]/, level: QualityLevel.CRITICAL, title: 'Hardcoded Password', description: 'Hardcoded password detected' },
        { pattern: /api[_-]?key\s*=\s*['"]/, level: QualityLevel.CRITICAL, title: 'Hardcoded API Key', description: 'Hardcoded API key detected' }
      ];

      const lines = content.split('\n');
      lines.forEach((line, index) => {
        securityPatterns.forEach(({ pattern, level, title, description }) => {
          if (pattern.test(line)) {
            issues.push({
              id: `security-${Date.now()}-${index}`,
              level,
              step: ValidationStep.SECURITY,
              title,
              description,
              filePath,
              line: index + 1,
              fixable: false,
              metadata: { securityCategory: 'pattern-detection' }
            });
          }
        });
      });
      
      return {
        step: ValidationStep.SECURITY,
        passed: issues.filter(i => i.level === QualityLevel.CRITICAL).length === 0,
        score: this.calculateStepScore(issues),
        issues,
        executionTime: 0,
        metadata: { language, securityChecks: securityPatterns.length }
      };
    });

    // Add other basic step executors...
    this.initializeOtherDefaultExecutors();
  }

  private initializeOtherDefaultExecutors(): void {
    // Placeholder implementations for other steps
    const basicSteps = [
      ValidationStep.TYPE_CHECK,
      ValidationStep.LINT,
      ValidationStep.TEST,
      ValidationStep.PERFORMANCE,
      ValidationStep.DOCUMENTATION,
      ValidationStep.INTEGRATION
    ];

    basicSteps.forEach(step => {
      this.stepExecutors.set(step, async (filePath, content, language) => {
        // Basic implementation - servers should override with specific logic
        return {
          step,
          passed: true,
          score: 100,
          issues: [],
          executionTime: 0,
          metadata: { language, note: 'Basic implementation - override for specific functionality' }
        };
      });
    });
  }

  private async readFileContent(filePath: string): Promise<string> {
    // This would read file content in production
    // For now, throw error to indicate servers should override this
    throw new Error('File reading not implemented - override in specific servers');
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust'
    };
    return languageMap[ext || ''] || 'unknown';
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private createErrorResult(step: ValidationStep, error: any, startTime: number): ValidationResult {
    return {
      step,
      passed: false,
      score: 0,
      issues: [{
        id: `error-${Date.now()}`,
        level: QualityLevel.CRITICAL,
        step,
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        filePath: '',
        fixable: false,
        metadata: { error: true }
      }],
      executionTime: Date.now() - startTime,
      metadata: { error: true }
    };
  }

  private calculateStepScore(issues: QualityIssue[]): number {
    let deductions = 0;
    
    issues.forEach(issue => {
      switch (issue.level) {
        case QualityLevel.CRITICAL:
          deductions += 20;
          break;
        case QualityLevel.HIGH:
          deductions += 10;
          break;
        case QualityLevel.MEDIUM:
          deductions += 5;
          break;
        case QualityLevel.LOW:
          deductions += 2;
          break;
        case QualityLevel.INFO:
          deductions += 1;
          break;
      }
    });

    return Math.max(0, 100 - deductions);
  }

  private calculateOverallScore(results: ValidationResult[]): number {
    if (results.length === 0) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    results.forEach(result => {
      const weight = this.config.steps[result.step].weight;
      weightedSum += result.score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private countIssuesByLevel(results: ValidationResult[], level: QualityLevel): number {
    return results.reduce((count, result) => {
      return count + result.issues.filter(issue => issue.level === level).length;
    }, 0);
  }

  private async findValidationTargets(
    projectPath: string,
    options: { includePaths?: string[]; excludePaths?: string[] }
  ): Promise<string[]> {
    // This would scan project for validation targets in production
    // For now, throw error to indicate servers should override this
    throw new Error('Project scanning not implemented - override in specific servers');
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Validation configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}