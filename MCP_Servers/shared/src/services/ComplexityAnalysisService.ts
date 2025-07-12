import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { ComplexityLevel } from '../types/common.js';

/**
 * Language-specific complexity patterns and weights
 */
interface LanguageConfig {
  multiplier: number;
  decisionKeywords: string[];
  complexityPatterns: RegExp[];
  functionPatterns: RegExp[];
  classPatterns: RegExp[];
  importPatterns: RegExp[];
  commentPatterns: RegExp[];
}

/**
 * Comprehensive complexity metrics
 */
export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  nesting: number;
  maintainability: number;
  testability: number;
  lines: number;
  functions: number;
  classes: number;
  dependencies: number;
  coupling: number;
  cohesion: number;
}

/**
 * Complexity estimation result
 */
export interface ComplexityEstimation {
  overall: number;
  level: ComplexityLevel;
  metrics: ComplexityMetrics;
  factors: ComplexityFactor[];
  recommendations: string[];
  estimatedDevelopmentTime: number;
  estimatedTestingTime: number;
  riskAssessment: RiskAssessment;
}

/**
 * Individual complexity factor
 */
export interface ComplexityFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  overall: number;
  categories: {
    technical: number;
    timeline: number;
    resource: number;
    integration: number;
  };
  mitigationStrategies: string[];
}

/**
 * Analysis target types
 */
export type AnalysisTarget = 'file' | 'directory' | 'project' | 'snippet';

/**
 * Analysis options
 */
export interface AnalysisOptions {
  includeTests?: boolean;
  includeDependencies?: boolean;
  language?: string;
  targetComplexity?: ComplexityLevel;
}

/**
 * Unified complexity analysis service
 * Consolidates complexity calculation logic from multiple servers
 */
export class ComplexityAnalysisService {
  private static readonly LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
    typescript: {
      multiplier: 1.0,
      decisionKeywords: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', '&&', '||', '?:'],
      complexityPatterns: [/if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/, /catch\s*\(/, /&&/, /\|\|/, /\?:/],
      functionPatterns: [/function\s+(\w+)/, /(\w+)\s*=\s*function/, /(\w+)\s*=>\s*/, /(\w+)\s*\([^)]*\)\s*:\s*\w+/],
      classPatterns: [/class\s+(\w+)/, /interface\s+(\w+)/],
      importPatterns: [/import\s+.*?from\s+['"]([^'"]+)['"]/, /import\s*\(\s*['"]([^'"]+)['"]\s*\)/, /require\s*\(\s*['"]([^'"]+)['"]\s*\)/],
      commentPatterns: [/\/\/.*/, /\/\*[\s\S]*?\*\//]
    },
    javascript: {
      multiplier: 0.9,
      decisionKeywords: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', '&&', '||', '?:'],
      complexityPatterns: [/if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/, /catch\s*\(/, /&&/, /\|\|/, /\?:/],
      functionPatterns: [/function\s+(\w+)/, /(\w+)\s*=\s*function/, /(\w+)\s*=>\s*/],
      classPatterns: [/class\s+(\w+)/],
      importPatterns: [/import\s+.*?from\s+['"]([^'"]+)['"]/, /require\s*\(\s*['"]([^'"]+)['"]\s*\)/],
      commentPatterns: [/\/\/.*/, /\/\*[\s\S]*?\*\//]
    },
    python: {
      multiplier: 0.8,
      decisionKeywords: ['if', 'elif', 'else', 'for', 'while', 'except', 'and', 'or'],
      complexityPatterns: [/if\s+/, /elif\s+/, /else:/, /while\s+/, /for\s+/, /except\s*:/, /and/, /or/],
      functionPatterns: [/def\s+(\w+)\s*\(/],
      classPatterns: [/class\s+(\w+)/],
      importPatterns: [/from\s+(\S+)\s+import/, /import\s+(\S+)/],
      commentPatterns: [/#.*/, /"""[\s\S]*?"""/, /'''[\s\S]*?'''/]
    },
    java: {
      multiplier: 1.2,
      decisionKeywords: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'],
      complexityPatterns: [/if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/, /catch\s*\(/],
      functionPatterns: [/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/],
      classPatterns: [/(?:public|private|protected)?\s*class\s+(\w+)/],
      importPatterns: [/import\s+([^;]+);/],
      commentPatterns: [/\/\/.*/, /\/\*[\s\S]*?\*\//]
    },
    cpp: {
      multiplier: 1.4,
      decisionKeywords: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'],
      complexityPatterns: [/if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/, /catch\s*\(/],
      functionPatterns: [/\w+\s+(\w+)\s*\([^)]*\)\s*\{/],
      classPatterns: [/class\s+(\w+)/, /struct\s+(\w+)/],
      importPatterns: [/#include\s*[<"]([^>"]+)[>"]/],
      commentPatterns: [/\/\/.*/, /\/\*[\s\S]*?\*\//]
    }
  };

  private static readonly COMPLEXITY_WEIGHTS = {
    cyclomatic: 0.25,
    cognitive: 0.25,
    nesting: 0.15,
    maintainability: 0.15,
    testability: 0.10,
    dependencies: 0.10
  };

  private readonly cache: Map<string, ComplexityMetrics> = new Map();
  private readonly estimationCache: Map<string, ComplexityEstimation> = new Map();

  /**
   * Analyze complexity for any target (file, directory, project, snippet)
   */
  async analyzeComplexity(
    target: string,
    type: AnalysisTarget,
    options: AnalysisOptions = {}
  ): Promise<ComplexityEstimation> {
    const cacheKey = this.getCacheKey(target, type, options);
    const cached = this.estimationCache.get(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached complexity estimation', { target, type });
      return cached;
    }

    let metrics: ComplexityMetrics;
    let context: any;

    switch (type) {
      case 'snippet':
        metrics = await this.analyzeSnippetComplexity(target, options.language || 'javascript');
        context = { type: 'snippet', snippetLength: target.length };
        break;
      case 'file':
        metrics = await this.analyzeFileComplexity(target, options);
        context = { type: 'file' };
        break;
      case 'directory':
        metrics = await this.analyzeDirectoryComplexity(target, options);
        context = { type: 'directory' };
        break;
      case 'project':
        metrics = await this.analyzeProjectComplexity(target, options);
        context = { type: 'project' };
        break;
      default:
        throw new Error(`Unsupported analysis type: ${type}`);
    }

    const estimation = this.buildComplexityEstimation(metrics, options.language || 'javascript', context);
    this.estimationCache.set(cacheKey, estimation);
    
    logger.info('Complexity analysis completed', {
      target,
      type,
      overall: estimation.overall,
      level: estimation.level
    });

    return estimation;
  }

  /**
   * Calculate complexity metrics for code content
   */
  async calculateMetrics(content: string, language: string): Promise<ComplexityMetrics> {
    const config = this.getLanguageConfig(language);
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const codeLines = nonEmptyLines.filter(line => !this.isComment(line, config));

    const linesOfCode = codeLines.length;
    const cyclomatic = this.calculateCyclomaticComplexity(content, config);
    const cognitive = this.calculateCognitiveComplexity(content, config);
    const nesting = this.calculateMaxNestingDepth(content, config);
    const functions = this.countFunctions(content, config);
    const classes = this.countClasses(content, config);
    const dependencies = this.countDependencies(content, config);
    const coupling = this.estimateCoupling(content, config);
    const cohesion = this.estimateCohesion(content, config);
    const maintainability = this.calculateMaintainabilityIndex(cyclomatic, linesOfCode, functions, coupling);
    const testability = this.calculateTestabilityScore(cyclomatic, coupling, functions, classes);

    return {
      cyclomatic,
      cognitive,
      nesting,
      maintainability,
      testability,
      lines: linesOfCode,
      functions,
      classes,
      dependencies,
      coupling,
      cohesion
    };
  }

  /**
   * Get complexity level from numeric score
   */
  getComplexityLevel(score: number): ComplexityLevel {
    if (score < 0.25) return 'simple';
    if (score < 0.5) return 'moderate';
    if (score < 0.75) return 'complex';
    return 'critical';
  }

  /**
   * Suggest breakdown strategies for complex code
   */
  suggestBreakdownStrategies(metrics: ComplexityMetrics, language: string): string[] {
    const strategies: string[] = [];

    if (metrics.cyclomatic > 15) {
      strategies.push('Break down complex functions using the Single Responsibility Principle');
    }

    if (metrics.cognitive > 15) {
      strategies.push('Simplify logic flow and reduce nesting levels');
    }

    if (metrics.nesting > 4) {
      strategies.push('Extract nested logic into separate functions or methods');
    }

    if (metrics.functions > 20) {
      strategies.push('Consider splitting into multiple modules or classes');
    }

    if (metrics.dependencies > 15) {
      strategies.push('Reduce coupling by implementing dependency injection');
    }

    if (metrics.maintainability < 60) {
      strategies.push('Focus on improving code readability and documentation');
    }

    return strategies.length > 0 ? strategies : ['Code complexity is within acceptable ranges'];
  }

  // ==================== PRIVATE IMPLEMENTATION ====================

  private async analyzeSnippetComplexity(content: string, language: string): Promise<ComplexityMetrics> {
    return this.calculateMetrics(content, language);
  }

  private async analyzeFileComplexity(filePath: string, options: AnalysisOptions): Promise<ComplexityMetrics> {
    // This would read the file and analyze it
    // For now, return mock data - implement file reading as needed
    throw new Error('File analysis not implemented - override in specific servers');
  }

  private async analyzeDirectoryComplexity(dirPath: string, options: AnalysisOptions): Promise<ComplexityMetrics> {
    // This would scan directory and aggregate metrics
    // For now, return mock data - implement directory scanning as needed
    throw new Error('Directory analysis not implemented - override in specific servers');
  }

  private async analyzeProjectComplexity(projectPath: string, options: AnalysisOptions): Promise<ComplexityMetrics> {
    // This would scan entire project and aggregate metrics
    // For now, return mock data - implement project scanning as needed
    throw new Error('Project analysis not implemented - override in specific servers');
  }

  private buildComplexityEstimation(
    metrics: ComplexityMetrics,
    language: string,
    context: any
  ): ComplexityEstimation {
    const factors = this.extractComplexityFactors(metrics, language, context);
    const overall = this.calculateOverallComplexity(factors);
    const level = this.getComplexityLevel(overall);
    const riskAssessment = this.assessRisks(metrics, overall, context);
    const recommendations = this.generateRecommendations(metrics, factors, riskAssessment);
    
    const config = this.getLanguageConfig(language);
    const estimatedDevelopmentTime = this.estimateDevelopmentTime(overall, metrics, config.multiplier, context);
    const estimatedTestingTime = this.estimateTestingTime(estimatedDevelopmentTime, metrics.testability);

    return {
      overall,
      level,
      metrics,
      factors,
      recommendations,
      estimatedDevelopmentTime,
      estimatedTestingTime,
      riskAssessment
    };
  }

  private extractComplexityFactors(metrics: ComplexityMetrics, language: string, context: any): ComplexityFactor[] {
    const factors: ComplexityFactor[] = [];

    factors.push({
      name: 'Cyclomatic Complexity',
      value: Math.min(metrics.cyclomatic / 20, 1),
      weight: ComplexityAnalysisService.COMPLEXITY_WEIGHTS.cyclomatic,
      impact: metrics.cyclomatic > 15 ? 'high' : metrics.cyclomatic > 10 ? 'medium' : 'low',
      description: `Measures linearly independent paths (${metrics.cyclomatic})`
    });

    factors.push({
      name: 'Cognitive Complexity',
      value: Math.min(metrics.cognitive / 25, 1),
      weight: ComplexityAnalysisService.COMPLEXITY_WEIGHTS.cognitive,
      impact: metrics.cognitive > 15 ? 'high' : metrics.cognitive > 10 ? 'medium' : 'low',
      description: `Measures understanding difficulty (${metrics.cognitive})`
    });

    factors.push({
      name: 'Nesting Depth',
      value: Math.min(metrics.nesting / 6, 1),
      weight: ComplexityAnalysisService.COMPLEXITY_WEIGHTS.nesting,
      impact: metrics.nesting > 4 ? 'high' : metrics.nesting > 3 ? 'medium' : 'low',
      description: `Maximum nesting level (${metrics.nesting})`
    });

    factors.push({
      name: 'Dependencies',
      value: Math.min(metrics.dependencies / 20, 1),
      weight: ComplexityAnalysisService.COMPLEXITY_WEIGHTS.dependencies,
      impact: metrics.dependencies > 15 ? 'high' : metrics.dependencies > 10 ? 'medium' : 'low',
      description: `External dependencies (${metrics.dependencies})`
    });

    return factors;
  }

  private calculateOverallComplexity(factors: ComplexityFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      weightedSum += factor.value * factor.weight;
      totalWeight += factor.weight;
    });

    return Math.min(weightedSum / totalWeight, 1);
  }

  private assessRisks(metrics: ComplexityMetrics, overall: number, context: any): RiskAssessment {
    const technical = Math.min(overall + (metrics.cyclomatic / 50), 1);
    const timeline = Math.min(overall + (context.fileCount || 1) / 100, 1);
    const resource = Math.min((metrics.coupling + metrics.dependencies) / 30, 1);
    const integration = Math.min(metrics.dependencies / 20, 1);

    const overallRisk = (technical + timeline + resource + integration) / 4;

    return {
      overall: overallRisk,
      categories: { technical, timeline, resource, integration },
      mitigationStrategies: this.generateMitigationStrategies(overallRisk, {
        technical,
        timeline,
        resource,
        integration
      })
    };
  }

  private generateMitigationStrategies(
    overallRisk: number,
    categories: { technical: number; timeline: number; resource: number; integration: number }
  ): string[] {
    const strategies: string[] = [];

    if (categories.technical > 0.7) {
      strategies.push('Implement comprehensive unit testing for complex logic');
      strategies.push('Consider breaking down complex functions into smaller units');
    }

    if (categories.timeline > 0.7) {
      strategies.push('Plan for iterative development with frequent checkpoints');
      strategies.push('Consider parallel development tracks where possible');
    }

    if (categories.resource > 0.7) {
      strategies.push('Reduce coupling through dependency injection');
      strategies.push('Evaluate necessity of all external dependencies');
    }

    if (categories.integration > 0.7) {
      strategies.push('Plan for extensive integration testing');
      strategies.push('Consider mocking strategies for external dependencies');
    }

    return strategies;
  }

  private generateRecommendations(
    metrics: ComplexityMetrics,
    factors: ComplexityFactor[],
    riskAssessment: RiskAssessment
  ): string[] {
    const recommendations: string[] = [];

    const highImpactFactors = factors.filter(f => f.impact === 'high');
    highImpactFactors.forEach(factor => {
      if (factor.name === 'Cyclomatic Complexity' && factor.value > 0.6) {
        recommendations.push('Refactor complex functions to reduce cyclomatic complexity');
      } else if (factor.name === 'Cognitive Complexity' && factor.value > 0.6) {
        recommendations.push('Simplify logic flow to improve code readability');
      } else if (factor.name === 'Nesting Depth' && factor.value > 0.6) {
        recommendations.push('Extract nested logic into separate functions');
      }
    });

    if (metrics.maintainability < 60) {
      recommendations.push('Focus on improving maintainability through refactoring');
    }

    if (metrics.testability < 60) {
      recommendations.push('Reduce coupling to improve testability');
    }

    if (riskAssessment.overall > 0.7) {
      recommendations.push('Consider architectural review before implementation');
    }

    return recommendations.length > 0 ? recommendations : ['Code complexity is within acceptable ranges'];
  }

  // ==================== CALCULATION METHODS ====================

  private calculateCyclomaticComplexity(content: string, config: LanguageConfig): number {
    let complexity = 1; // Base complexity

    config.decisionKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private calculateCognitiveComplexity(content: string, config: LanguageConfig): number {
    let complexity = 0;
    let nestingLevel = 0;
    
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Track nesting level
      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      nestingLevel += openBraces - closeBraces;
      
      // Check for cognitive complexity keywords
      config.decisionKeywords.forEach(keyword => {
        if (trimmed.includes(keyword)) {
          complexity += 1 + nestingLevel;
        }
      });
    });

    return complexity;
  }

  private calculateMaxNestingDepth(content: string, config: LanguageConfig): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      
      currentDepth += openBraces;
      maxDepth = Math.max(maxDepth, currentDepth);
      currentDepth -= closeBraces;
    });

    return maxDepth;
  }

  private countFunctions(content: string, config: LanguageConfig): number {
    let count = 0;
    
    config.functionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  private countClasses(content: string, config: LanguageConfig): number {
    let count = 0;
    
    config.classPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  private countDependencies(content: string, config: LanguageConfig): number {
    let count = 0;
    
    config.importPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  private estimateCoupling(content: string, config: LanguageConfig): number {
    const dependencies = this.countDependencies(content, config);
    const externalCalls = this.countExternalCalls(content);
    
    return Math.min((dependencies + externalCalls) / 10, 10);
  }

  private estimateCohesion(content: string, config: LanguageConfig): number {
    const functions = this.countFunctions(content, config);
    const classes = this.countClasses(content, config);
    const lines = content.split('\n').length;
    
    if (functions === 0 && classes === 0) return 5;
    
    const avgLinesPerUnit = lines / (functions + classes);
    return Math.min(10 - (avgLinesPerUnit / 50), 10);
  }

  private calculateMaintainabilityIndex(
    cyclomatic: number,
    linesOfCode: number,
    functions: number,
    coupling: number
  ): number {
    const halsteadVolume = Math.log2(linesOfCode) * 10; // Simplified
    const mi = 171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cyclomatic - 16.2 * Math.log(linesOfCode);
    return Math.max(0, Math.min(100, mi));
  }

  private calculateTestabilityScore(
    cyclomatic: number,
    coupling: number,
    functions: number,
    classes: number
  ): number {
    const complexityPenalty = cyclomatic / 20;
    const couplingPenalty = coupling / 10;
    const structurePenalty = (functions + classes) === 0 ? 0.5 : 0;
    
    return Math.max(0, Math.min(100, 100 - (complexityPenalty + couplingPenalty + structurePenalty) * 20));
  }

  private estimateDevelopmentTime(
    complexity: number,
    metrics: ComplexityMetrics,
    languageMultiplier: number,
    context: any
  ): number {
    let baseTime = 0;

    if (context.type === 'snippet') {
      baseTime = 1; // 1 hour for snippet
    } else {
      baseTime = (metrics.lines / 100) * 2; // 2 hours per 100 lines
    }

    const complexityMultiplier = 1 + (complexity * 2);
    const totalTime = baseTime * complexityMultiplier * languageMultiplier;

    return Math.round(totalTime * 100) / 100;
  }

  private estimateTestingTime(developmentTime: number, testability: number): number {
    const testingRatio = 0.7 - (testability / 100) * 0.4;
    return Math.round(developmentTime * testingRatio * 100) / 100;
  }

  private countExternalCalls(content: string): number {
    const patterns = [/\w+\.\w+\(/g, /\w+::\w+\(/g];
    let count = 0;

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  private isComment(line: string, config: LanguageConfig): boolean {
    const trimmed = line.trim();
    return config.commentPatterns.some(pattern => pattern.test(trimmed));
  }

  private getLanguageConfig(language: string): LanguageConfig {
    return ComplexityAnalysisService.LANGUAGE_CONFIGS[language] 
      || ComplexityAnalysisService.LANGUAGE_CONFIGS.javascript;
  }

  private getCacheKey(target: string, type: AnalysisTarget, options: AnalysisOptions): string {
    return `${type}:${target}:${JSON.stringify(options)}`;
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.cache.clear();
    this.estimationCache.clear();
    logger.info('ComplexityAnalysisService cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { metricsCache: number; estimationCache: number } {
    return {
      metricsCache: this.cache.size,
      estimationCache: this.estimationCache.size
    };
  }
}