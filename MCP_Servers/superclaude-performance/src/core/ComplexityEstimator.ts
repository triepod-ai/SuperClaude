import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { logger } from '@superclaude/shared';
import {
  ComplexityEstimation,
  ComplexityMetrics,
  ComplexityFactor,
  RiskAssessment,
  ComplexityEstimationError
} from '../types/index.js';

/**
 * Advanced complexity estimation engine for code analysis and project planning
 */
export class ComplexityEstimator {
  private static readonly LANGUAGE_MULTIPLIERS = {
    'typescript': 1.0,
    'javascript': 0.9,
    'python': 0.8,
    'java': 1.2,
    'cpp': 1.4,
    'csharp': 1.1,
    'rust': 1.3,
    'go': 0.9,
    'php': 0.8,
    'ruby': 0.8
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
   * Estimate complexity for a file, directory, or code snippet
   */
  async estimateComplexity(
    target: string,
    type: 'file' | 'directory' | 'project' | 'snippet',
    options: {
      includeTests?: boolean;
      includeDependencies?: boolean;
      language?: string;
    } = {}
  ): Promise<ComplexityEstimation> {
    try {
      const cacheKey = this.getCacheKey(target, type, options);
      const cached = this.estimationCache.get(cacheKey);
      if (cached) {
        logger.debug('Returning cached complexity estimation', { target, type });
        return cached;
      }

      let estimation: ComplexityEstimation;

      switch (type) {
        case 'file':
          estimation = await this.estimateFileComplexity(target, options);
          break;
        case 'directory':
          estimation = await this.estimateDirectoryComplexity(target, options);
          break;
        case 'project':
          estimation = await this.estimateProjectComplexity(target, options);
          break;
        case 'snippet':
          estimation = await this.estimateSnippetComplexity(target, options);
          break;
        default:
          throw new ComplexityEstimationError(`Unsupported estimation type: ${type}`);
      }

      this.estimationCache.set(cacheKey, estimation);
      logger.info('Complexity estimation completed', { 
        target, 
        type, 
        overall: estimation.overall,
        estimatedDevelopmentTime: estimation.estimatedDevelopmentTime
      });

      return estimation;
    } catch (error) {
      logger.error('Complexity estimation failed', { target, type, error });
      throw new ComplexityEstimationError(
        `Failed to estimate complexity: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze complexity metrics for a single file
   */
  async analyzeFileComplexity(filePath: string, content?: string): Promise<ComplexityMetrics> {
    try {
      const cached = this.cache.get(filePath);
      if (cached) {
        return cached;
      }

      const fileContent = content || await fs.readFile(filePath, 'utf-8');
      const language = this.detectLanguage(filePath);
      const metrics = await this.calculateComplexityMetrics(fileContent, language);

      this.cache.set(filePath, metrics);
      return metrics;
    } catch (error) {
      logger.error('File complexity analysis failed', { filePath, error });
      throw new ComplexityEstimationError(
        `Failed to analyze file complexity: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate detailed complexity metrics for code content
   */
  private async calculateComplexityMetrics(content: string, language: string): Promise<ComplexityMetrics> {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const codeLines = nonEmptyLines.filter(line => !this.isComment(line, language));

    // Basic metrics
    const linesOfCode = codeLines.length;
    const totalLines = lines.length;

    // Cyclomatic complexity (simplified)
    const cyclomatic = this.calculateCyclomaticComplexity(content, language);
    
    // Cognitive complexity
    const cognitive = this.calculateCognitiveComplexity(content, language);
    
    // Nesting depth
    const nesting = this.calculateMaxNestingDepth(content, language);
    
    // Function and class counts
    const functions = this.countFunctions(content, language);
    const classes = this.countClasses(content, language);
    
    // Dependencies
    const dependencies = this.countDependencies(content, language);
    
    // Coupling and cohesion (estimated)
    const coupling = this.estimateCoupling(content, language);
    const cohesion = this.estimateCohesion(content, language);
    
    // Maintainability index
    const maintainability = this.calculateMaintainabilityIndex(
      cyclomatic, linesOfCode, functions, coupling
    );
    
    // Testability score
    const testability = this.calculateTestabilityScore(
      cyclomatic, coupling, functions, classes
    );

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
   * Estimate complexity for a single file
   */
  private async estimateFileComplexity(
    filePath: string,
    options: { includeTests?: boolean; includeDependencies?: boolean; language?: string }
  ): Promise<ComplexityEstimation> {
    const metrics = await this.analyzeFileComplexity(filePath);
    const language = options.language || this.detectLanguage(filePath);
    
    return this.buildComplexityEstimation(metrics, language, {
      type: 'file',
      target: filePath,
      includeTests: options.includeTests,
      includeDependencies: options.includeDependencies
    });
  }

  /**
   * Estimate complexity for a directory
   */
  private async estimateDirectoryComplexity(
    dirPath: string,
    options: { includeTests?: boolean; includeDependencies?: boolean; language?: string }
  ): Promise<ComplexityEstimation> {
    const files = await this.getCodeFiles(dirPath, options.includeTests);
    const fileMetrics = await Promise.all(
      files.map(file => this.analyzeFileComplexity(file))
    );

    const aggregatedMetrics = this.aggregateMetrics(fileMetrics);
    const primaryLanguage = options.language || this.detectPrimaryLanguage(files);

    return this.buildComplexityEstimation(aggregatedMetrics, primaryLanguage, {
      type: 'directory',
      target: dirPath,
      fileCount: files.length,
      includeTests: options.includeTests,
      includeDependencies: options.includeDependencies
    });
  }

  /**
   * Estimate complexity for an entire project
   */
  private async estimateProjectComplexity(
    projectPath: string,
    options: { includeTests?: boolean; includeDependencies?: boolean; language?: string }
  ): Promise<ComplexityEstimation> {
    const files = await this.getProjectFiles(projectPath, options.includeTests);
    const fileMetrics = await Promise.all(
      files.map(file => this.analyzeFileComplexity(file))
    );

    const aggregatedMetrics = this.aggregateMetrics(fileMetrics);
    const primaryLanguage = options.language || this.detectPrimaryLanguage(files);

    // Project-specific adjustments
    const projectSize = files.length;
    const complexityAdjustment = this.calculateProjectComplexityAdjustment(projectSize);

    return this.buildComplexityEstimation(aggregatedMetrics, primaryLanguage, {
      type: 'project',
      target: projectPath,
      fileCount: files.length,
      complexityAdjustment,
      includeTests: options.includeTests,
      includeDependencies: options.includeDependencies
    });
  }

  /**
   * Estimate complexity for a code snippet
   */
  private async estimateSnippetComplexity(
    snippet: string,
    options: { language?: string }
  ): Promise<ComplexityEstimation> {
    const language = options.language || 'javascript';
    const metrics = await this.calculateComplexityMetrics(snippet, language);

    return this.buildComplexityEstimation(metrics, language, {
      type: 'snippet',
      target: 'code snippet',
      snippetLength: snippet.length
    });
  }

  /**
   * Build a comprehensive complexity estimation
   */
  private buildComplexityEstimation(
    metrics: ComplexityMetrics,
    language: string,
    context: any
  ): ComplexityEstimation {
    const factors = this.extractComplexityFactors(metrics, language, context);
    const categories = this.calculateCategoryScores(metrics, factors);
    const overall = this.calculateOverallComplexity(categories, factors);
    const riskAssessment = this.assessRisks(metrics, overall, context);
    const recommendations = this.generateRecommendations(metrics, factors, riskAssessment);
    
    const languageMultiplier = ComplexityEstimator.LANGUAGE_MULTIPLIERS[language] || 1.0;
    const estimatedDevelopmentTime = this.estimateDevelopmentTime(overall, metrics, languageMultiplier, context);
    const estimatedTestingTime = this.estimateTestingTime(estimatedDevelopmentTime, metrics.testability);

    return {
      overall,
      categories,
      factors,
      recommendations,
      estimatedDevelopmentTime,
      estimatedTestingTime,
      riskAssessment
    };
  }

  /**
   * Extract complexity factors from metrics
   */
  private extractComplexityFactors(metrics: ComplexityMetrics, language: string, context: any): ComplexityFactor[] {
    const factors: ComplexityFactor[] = [];

    // Cyclomatic complexity factor
    factors.push({
      name: 'Cyclomatic Complexity',
      value: Math.min(metrics.cyclomatic / 20, 1),
      weight: ComplexityEstimator.COMPLEXITY_WEIGHTS.cyclomatic,
      impact: metrics.cyclomatic > 15 ? 'high' : metrics.cyclomatic > 10 ? 'medium' : 'low',
      description: `Measures the number of linearly independent paths through code (${metrics.cyclomatic})`
    });

    // Cognitive complexity factor
    factors.push({
      name: 'Cognitive Complexity',
      value: Math.min(metrics.cognitive / 25, 1),
      weight: ComplexityEstimator.COMPLEXITY_WEIGHTS.cognitive,
      impact: metrics.cognitive > 15 ? 'high' : metrics.cognitive > 10 ? 'medium' : 'low',
      description: `Measures how difficult code is to understand (${metrics.cognitive})`
    });

    // Nesting depth factor
    factors.push({
      name: 'Nesting Depth',
      value: Math.min(metrics.nesting / 6, 1),
      weight: ComplexityEstimator.COMPLEXITY_WEIGHTS.nesting,
      impact: metrics.nesting > 4 ? 'high' : metrics.nesting > 3 ? 'medium' : 'low',
      description: `Maximum level of nested control structures (${metrics.nesting})`
    });

    // Size factor
    factors.push({
      name: 'Code Size',
      value: Math.min(metrics.lines / 1000, 1),
      weight: 0.10,
      impact: metrics.lines > 500 ? 'high' : metrics.lines > 200 ? 'medium' : 'low',
      description: `Lines of code (${metrics.lines})`
    });

    // Dependencies factor
    factors.push({
      name: 'Dependencies',
      value: Math.min(metrics.dependencies / 20, 1),
      weight: ComplexityEstimator.COMPLEXITY_WEIGHTS.dependencies,
      impact: metrics.dependencies > 15 ? 'high' : metrics.dependencies > 10 ? 'medium' : 'low',
      description: `Number of external dependencies (${metrics.dependencies})`
    });

    // Language-specific factor
    const languageMultiplier = ComplexityEstimator.LANGUAGE_MULTIPLIERS[language] || 1.0;
    factors.push({
      name: 'Language Complexity',
      value: (languageMultiplier - 0.5) / 1.0, // Normalize to 0-1
      weight: 0.05,
      impact: languageMultiplier > 1.2 ? 'high' : languageMultiplier > 1.0 ? 'medium' : 'low',
      description: `Language-specific complexity multiplier (${languageMultiplier.toFixed(1)}x)`
    });

    return factors;
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(metrics: ComplexityMetrics, factors: ComplexityFactor[]): {
    algorithmic: number;
    structural: number;
    cognitive: number;
    maintenance: number;
  } {
    return {
      algorithmic: (metrics.cyclomatic / 20 + metrics.cognitive / 25) / 2,
      structural: (metrics.nesting / 6 + metrics.coupling / 10) / 2,
      cognitive: metrics.cognitive / 25,
      maintenance: 1 - (metrics.maintainability / 100)
    };
  }

  /**
   * Calculate overall complexity score
   */
  private calculateOverallComplexity(
    categories: { algorithmic: number; structural: number; cognitive: number; maintenance: number },
    factors: ComplexityFactor[]
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      weightedSum += factor.value * factor.weight;
      totalWeight += factor.weight;
    });

    // Normalize to 0-1 scale
    const baseComplexity = weightedSum / totalWeight;
    
    // Apply category influences
    const categoryAverage = (categories.algorithmic + categories.structural + categories.cognitive + categories.maintenance) / 4;
    
    return Math.min((baseComplexity + categoryAverage) / 2, 1);
  }

  // ======================= CALCULATION METHODS =======================

  private calculateCyclomaticComplexity(content: string, language: string): number {
    // Simplified cyclomatic complexity calculation
    const decisionKeywords = this.getDecisionKeywords(language);
    let complexity = 1; // Base complexity

    decisionKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private calculateCognitiveComplexity(content: string, language: string): number {
    // Simplified cognitive complexity calculation
    let complexity = 0;
    let nestingLevel = 0;
    
    const lines = content.split('\n');
    const cognitiveKeywords = this.getCognitiveKeywords(language);
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Track nesting level
      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      nestingLevel += openBraces - closeBraces;
      
      // Check for cognitive complexity keywords
      cognitiveKeywords.forEach(keyword => {
        if (trimmed.includes(keyword)) {
          complexity += 1 + nestingLevel;
        }
      });
    });

    return complexity;
  }

  private calculateMaxNestingDepth(content: string, language: string): number {
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

  private countFunctions(content: string, language: string): number {
    const functionPatterns = this.getFunctionPatterns(language);
    let count = 0;
    
    functionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  private countClasses(content: string, language: string): number {
    const classPatterns = this.getClassPatterns(language);
    let count = 0;
    
    classPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  private countDependencies(content: string, language: string): number {
    const importPatterns = this.getImportPatterns(language);
    let count = 0;
    
    importPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  private estimateCoupling(content: string, language: string): number {
    // Simplified coupling estimation based on imports and external references
    const dependencies = this.countDependencies(content, language);
    const externalCalls = this.countExternalCalls(content, language);
    
    return Math.min((dependencies + externalCalls) / 10, 10);
  }

  private estimateCohesion(content: string, language: string): number {
    // Simplified cohesion estimation
    const functions = this.countFunctions(content, language);
    const classes = this.countClasses(content, language);
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
    // Simplified maintainability index
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
    // Simplified testability score
    const complexityPenalty = cyclomatic / 20;
    const couplingPenalty = coupling / 10;
    const structurePenalty = (functions + classes) === 0 ? 0.5 : 0;
    
    return Math.max(0, Math.min(100, 100 - (complexityPenalty + couplingPenalty + structurePenalty) * 20));
  }

  private calculateProjectComplexityAdjustment(fileCount: number): number {
    // Additional complexity for large projects
    if (fileCount > 100) return 1.3;
    if (fileCount > 50) return 1.2;
    if (fileCount > 20) return 1.1;
    return 1.0;
  }

  private estimateDevelopmentTime(
    complexity: number,
    metrics: ComplexityMetrics,
    languageMultiplier: number,
    context: any
  ): number {
    // Base time estimation in hours
    let baseTime = 0;

    if (context.type === 'file') {
      baseTime = (metrics.lines / 100) * 2; // 2 hours per 100 lines
    } else if (context.type === 'directory') {
      baseTime = (context.fileCount || 1) * 4; // 4 hours per file
    } else if (context.type === 'project') {
      baseTime = (context.fileCount || 1) * 6; // 6 hours per file for project
    } else {
      baseTime = 1; // 1 hour for snippet
    }

    // Apply complexity multiplier
    const complexityMultiplier = 1 + (complexity * 2); // 1x to 3x based on complexity
    
    // Apply language multiplier
    const totalTime = baseTime * complexityMultiplier * languageMultiplier;

    return Math.round(totalTime * 100) / 100; // Round to 2 decimal places
  }

  private estimateTestingTime(developmentTime: number, testability: number): number {
    // Testing time is typically 30-70% of development time based on testability
    const testingRatio = 0.7 - (testability / 100) * 0.4; // 70% for low testability, 30% for high
    return Math.round(developmentTime * testingRatio * 100) / 100;
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
      strategies.push('Consider breaking down complex functions into smaller units');
      strategies.push('Implement comprehensive unit testing for complex logic');
    }

    if (categories.timeline > 0.7) {
      strategies.push('Plan for iterative development with frequent checkpoints');
      strategies.push('Consider parallel development tracks where possible');
    }

    if (categories.resource > 0.7) {
      strategies.push('Reduce coupling through dependency injection or interfaces');
      strategies.push('Evaluate necessity of all external dependencies');
    }

    if (categories.integration > 0.7) {
      strategies.push('Plan for extensive integration testing');
      strategies.push('Consider mocking strategies for external dependencies');
    }

    if (overallRisk > 0.8) {
      strategies.push('Consider proof-of-concept development for high-risk components');
      strategies.push('Plan for additional code review and architectural oversight');
    }

    return strategies;
  }

  private generateRecommendations(
    metrics: ComplexityMetrics,
    factors: ComplexityFactor[],
    riskAssessment: RiskAssessment
  ): string[] {
    const recommendations: string[] = [];

    // High-impact factors
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

    // Maintainability recommendations
    if (metrics.maintainability < 60) {
      recommendations.push('Focus on improving maintainability through refactoring');
    }

    // Testability recommendations
    if (metrics.testability < 60) {
      recommendations.push('Reduce coupling to improve testability');
      recommendations.push('Consider dependency injection for better test isolation');
    }

    // Risk-based recommendations
    if (riskAssessment.overall > 0.7) {
      recommendations.push('Consider architectural review before implementation');
      recommendations.push('Plan for additional quality assurance measures');
    }

    return recommendations.length > 0 ? recommendations : ['Code complexity is within acceptable ranges'];
  }

  // ======================= UTILITY METHODS =======================

  private detectLanguage(filePath: string): string {
    const extension = extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.cxx': 'cpp',
      '.cc': 'cpp',
      '.c': 'cpp',
      '.cs': 'csharp',
      '.rs': 'rust',
      '.go': 'go',
      '.php': 'php',
      '.rb': 'ruby'
    };

    return languageMap[extension] || 'javascript';
  }

  private detectPrimaryLanguage(files: string[]): string {
    const languageCounts: Record<string, number> = {};

    files.forEach(file => {
      const language = this.detectLanguage(file);
      languageCounts[language] = (languageCounts[language] || 0) + 1;
    });

    return Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'javascript';
  }

  private async getCodeFiles(dirPath: string, includeTests: boolean = true): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (!this.shouldSkipDirectory(entry.name)) {
          const subFiles = await this.getCodeFiles(fullPath, includeTests);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        if (this.isCodeFile(entry.name) && (includeTests || !this.isTestFile(entry.name))) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private async getProjectFiles(projectPath: string, includeTests: boolean = true): Promise<string[]> {
    return this.getCodeFiles(projectPath, includeTests);
  }

  private isCodeFile(fileName: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.rs', '.go', '.php', '.rb'];
    return codeExtensions.some(ext => fileName.endsWith(ext));
  }

  private isTestFile(fileName: string): boolean {
    const testPatterns = ['.test.', '.spec.', '__test__', '__tests__'];
    return testPatterns.some(pattern => fileName.includes(pattern));
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '.pytest_cache'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  private isComment(line: string, language: string): boolean {
    const trimmed = line.trim();
    
    const commentPrefixes: Record<string, string[]> = {
      'javascript': ['//', '/*', '*'],
      'typescript': ['//', '/*', '*'],
      'python': ['#'],
      'java': ['//', '/*', '*'],
      'cpp': ['//', '/*', '*'],
      'csharp': ['//', '/*', '*'],
      'rust': ['//', '/*', '*'],
      'go': ['//', '/*', '*'],
      'php': ['//', '/*', '*', '#'],
      'ruby': ['#']
    };

    const prefixes = commentPrefixes[language] || ['//'];
    return prefixes.some(prefix => trimmed.startsWith(prefix));
  }

  private getDecisionKeywords(language: string): string[] {
    const baseKeywords = ['if', 'for', 'while', 'switch', 'case', 'catch', 'throw'];
    
    const languageSpecific: Record<string, string[]> = {
      'javascript': [...baseKeywords, 'try'],
      'typescript': [...baseKeywords, 'try'],
      'python': [...baseKeywords, 'except', 'finally', 'with', 'elif'],
      'java': [...baseKeywords, 'try', 'finally'],
      'cpp': [...baseKeywords, 'try'],
      'csharp': [...baseKeywords, 'try', 'finally', 'using'],
      'rust': [...baseKeywords, 'match', 'loop'],
      'go': [...baseKeywords, 'select', 'defer'],
      'php': [...baseKeywords, 'try', 'finally'],
      'ruby': [...baseKeywords, 'rescue', 'ensure', 'unless', 'elsif']
    };

    return languageSpecific[language] || baseKeywords;
  }

  private getCognitiveKeywords(language: string): string[] {
    return ['if', 'else', 'switch', 'for', 'while', 'try', 'catch', 'break', 'continue'];
  }

  private getFunctionPatterns(language: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      'javascript': [/function\s+\w+/g, /\w+\s*=\s*function/g, /\w+\s*=>\s*/g],
      'typescript': [/function\s+\w+/g, /\w+\s*=\s*function/g, /\w+\s*=>\s*/g, /\w+\s*\([^)]*\)\s*:\s*\w+/g],
      'python': [/def\s+\w+/g],
      'java': [/(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\(/g],
      'cpp': [/\w+\s+\w+\s*\([^)]*\)\s*\{/g],
      'csharp': [/(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\(/g],
      'rust': [/fn\s+\w+/g],
      'go': [/func\s+\w+/g],
      'php': [/function\s+\w+/g],
      'ruby': [/def\s+\w+/g]
    };

    return patterns[language] || patterns['javascript'];
  }

  private getClassPatterns(language: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      'javascript': [/class\s+\w+/g],
      'typescript': [/class\s+\w+/g, /interface\s+\w+/g],
      'python': [/class\s+\w+/g],
      'java': [/(public|private|protected)?\s*class\s+\w+/g],
      'cpp': [/class\s+\w+/g, /struct\s+\w+/g],
      'csharp': [/(public|private|protected)?\s*class\s+\w+/g],
      'rust': [/struct\s+\w+/g, /impl\s+\w+/g],
      'go': [/type\s+\w+\s+struct/g],
      'php': [/class\s+\w+/g],
      'ruby': [/class\s+\w+/g]
    };

    return patterns[language] || patterns['javascript'];
  }

  private getImportPatterns(language: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      'javascript': [/import\s+.*from\s+['"].*['"]/g, /require\s*\(\s*['"].*['"]\s*\)/g],
      'typescript': [/import\s+.*from\s+['"].*['"]/g, /require\s*\(\s*['"].*['"]\s*\)/g],
      'python': [/import\s+\w+/g, /from\s+\w+\s+import/g],
      'java': [/import\s+[\w.]+/g],
      'cpp': [/#include\s*[<"].*[>"]/g],
      'csharp': [/using\s+[\w.]+/g],
      'rust': [/use\s+[\w:]+/g],
      'go': [/import\s+["']\w+["']/g],
      'php': [/use\s+[\w\\]+/g, /require\s+['"].*['"]/g, /include\s+['"].*['"]/g],
      'ruby': [/require\s+['"].*['"]/g, /load\s+['"].*['"]/g]
    };

    return patterns[language] || patterns['javascript'];
  }

  private countExternalCalls(content: string, language: string): number {
    // Simplified external call counting
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

  private aggregateMetrics(metricsArray: ComplexityMetrics[]): ComplexityMetrics {
    if (metricsArray.length === 0) {
      return {
        cyclomatic: 0,
        cognitive: 0,
        nesting: 0,
        maintainability: 100,
        testability: 100,
        lines: 0,
        functions: 0,
        classes: 0,
        dependencies: 0,
        coupling: 0,
        cohesion: 10
      };
    }

    return {
      cyclomatic: metricsArray.reduce((sum, m) => sum + m.cyclomatic, 0),
      cognitive: metricsArray.reduce((sum, m) => sum + m.cognitive, 0),
      nesting: Math.max(...metricsArray.map(m => m.nesting)),
      maintainability: metricsArray.reduce((sum, m) => sum + m.maintainability, 0) / metricsArray.length,
      testability: metricsArray.reduce((sum, m) => sum + m.testability, 0) / metricsArray.length,
      lines: metricsArray.reduce((sum, m) => sum + m.lines, 0),
      functions: metricsArray.reduce((sum, m) => sum + m.functions, 0),
      classes: metricsArray.reduce((sum, m) => sum + m.classes, 0),
      dependencies: metricsArray.reduce((sum, m) => sum + m.dependencies, 0),
      coupling: metricsArray.reduce((sum, m) => sum + m.coupling, 0) / metricsArray.length,
      cohesion: metricsArray.reduce((sum, m) => sum + m.cohesion, 0) / metricsArray.length
    };
  }

  private getCacheKey(target: string, type: string, options: any): string {
    return `${type}:${target}:${JSON.stringify(options)}`;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.estimationCache.clear();
    logger.info('ComplexityEstimator cache cleared');
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