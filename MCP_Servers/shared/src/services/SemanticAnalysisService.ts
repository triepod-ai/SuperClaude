import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { ComplexityLevel } from '../types/common.js';

/**
 * Symbol information
 */
export interface SymbolInfo {
  id: string;
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'method' | 'property';
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  scope?: string;
  visibility?: 'public' | 'private' | 'protected';
  detail?: string;
  documentation?: string;
  references: any[];
  metadata: Record<string, any>;
}

/**
 * Language dependency information
 */
export interface DependencyInfo {
  name: string;
  type: 'internal' | 'external' | 'standard';
  path: string;
  version?: string;
}

/**
 * Semantic analysis result
 */
export interface SemanticAnalysis {
  filePath: string;
  language: string;
  complexity: {
    cyclomatic: number;
    cognitive: number;
    nestingDepth: number;
  };
  maintainability: {
    index: number;
    issues: string[];
    suggestions: string[];
  };
  dependencies: {
    internal: string[];
    external: string[];
    circular: string[];
  };
  symbols: SymbolInfo[];
  patterns: Array<{
    name: string;
    confidence: number;
    description: string;
  }>;
}

/**
 * Semantic analysis input
 */
export interface SemanticAnalysisInput {
  filePath: string;
  content?: string;
  language?: string;
  includePatterns?: boolean;
}

/**
 * Language-specific patterns for semantic analysis
 */
interface LanguageSemanticConfig {
  functionRegex: RegExp;
  classRegex: RegExp;
  variableRegex: RegExp;
  commentPattern: RegExp;
  importPattern: RegExp;
  complexityPatterns: RegExp[];
}

/**
 * Unified semantic analysis service
 * Consolidates semantic analysis logic from multiple servers
 */
export class SemanticAnalysisService {
  private static readonly LANGUAGE_CONFIGS: Record<string, LanguageSemanticConfig> = {
    typescript: {
      functionRegex: /(?:function\s+(\w+)|class\s+(\w+)|interface\s+(\w+)|type\s+(\w+)|const\s+(\w+)\s*=\s*\(.*\)\s*=>|function\s*\*?\s*(\w+)|async\s+function\s+(\w+))/g,
      classRegex: /(?:class|interface)\s+(\w+)/g,
      variableRegex: /(let|const|var)\s+(\w+)/g,
      commentPattern: /\/\/.*|\/\*[\s\S]*?\*\//g,
      importPattern: /import\s+.*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      complexityPatterns: [/if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/, /catch\s*\(/, /&&/, /\|\|/, /\?:/]
    },
    javascript: {
      functionRegex: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*\(.*\)\s*=>|function\s*\*?\s*(\w+)|async\s+function\s+(\w+))/g,
      classRegex: /class\s+(\w+)/g,
      variableRegex: /(let|const|var)\s+(\w+)/g,
      commentPattern: /\/\/.*|\/\*[\s\S]*?\*\//g,
      importPattern: /import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      complexityPatterns: [/if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/, /catch\s*\(/, /&&/, /\|\|/, /\?:/]
    },
    python: {
      functionRegex: /def\s+(\w+)\s*\(|class\s+(\w+)/g,
      classRegex: /class\s+(\w+)/g,
      variableRegex: /(\w+)\s*=/g,
      commentPattern: /#.*|"""[\s\S]*?"""|'''[\s\S]*?'''/g,
      importPattern: /from\s+(\S+)\s+import|import\s+(\S+)/g,
      complexityPatterns: [/if\s+/, /elif\s+/, /else:/, /while\s+/, /for\s+/, /except\s*:/, /and/, /or/]
    },
    java: {
      functionRegex: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(|(?:public|private|protected)?\s*class\s+(\w+)/g,
      classRegex: /(?:public|private|protected)?\s*class\s+(\w+)/g,
      variableRegex: /(int|String|boolean|double|float)\s+(\w+)/g,
      commentPattern: /\/\/.*|\/\*[\s\S]*?\*\//g,
      importPattern: /import\s+([^;]+);/g,
      complexityPatterns: [/if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/, /catch\s*\(/]
    }
  };

  private readonly complexityCache: Map<string, number> = new Map();
  private readonly analysisCache: Map<string, SemanticAnalysis> = new Map();

  /**
   * Perform comprehensive semantic analysis on code
   */
  async analyzeCode(input: SemanticAnalysisInput): Promise<SemanticAnalysis> {
    try {
      const cacheKey = this.getCacheKey(input);
      const cached = this.analysisCache.get(cacheKey);
      
      if (cached) {
        logger.debug('Returning cached semantic analysis', { filePath: input.filePath });
        return cached;
      }

      // Get or read content
      const content = input.content || await this.readFileContent(input.filePath);
      const language = input.language || this.detectLanguage(input.filePath);
      const config = this.getLanguageConfig(language);

      // Parallel analysis execution
      const [complexity, maintainability, dependencies, symbols, patterns] = await Promise.all([
        this.analyzeComplexity(content, config),
        this.analyzeMaintainability(content, config),
        this.analyzeDependencies(content, config),
        this.extractSymbols(content, config),
        input.includePatterns ? this.detectPatterns(content, language) : []
      ]);

      const analysis: SemanticAnalysis = {
        filePath: input.filePath,
        language,
        complexity,
        maintainability,
        dependencies,
        symbols,
        patterns
      };

      // Cache the result
      this.analysisCache.set(cacheKey, analysis);
      this.complexityCache.set(input.filePath, complexity.cyclomatic);

      logger.info('Semantic analysis completed', {
        filePath: input.filePath,
        language,
        symbolCount: symbols.length,
        complexity: complexity.cyclomatic
      });

      return analysis;
    } catch (error) {
      logger.error('Semantic analysis failed', {
        filePath: input.filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Extract symbols (functions, classes, variables) from code
   */
  async extractSymbols(content: string, config: LanguageSemanticConfig): Promise<SymbolInfo[]> {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');

    // Extract functions and methods
    let match;
    const functionRegex = new RegExp(config.functionRegex.source, 'g');
    
    while ((match = functionRegex.exec(content)) !== null) {
      const symbolName = match.find((group, index) => index > 0 && group) || 'anonymous';
      const startPos = this.getPositionFromIndex(content, match.index!);
      
      symbols.push({
        id: `${symbolName}-${match.index}`,
        name: symbolName,
        type: this.determineSymbolType(match[0]),
        range: {
          start: startPos,
          end: { line: startPos.line, character: startPos.character + match[0].length }
        },
        visibility: this.determineVisibility(match[0]),
        references: [],
        metadata: {
          content: match[0],
          complexity: this.calculateLocalComplexity(match[0])
        }
      });
    }

    return symbols;
  }

  /**
   * Analyze code dependencies and imports
   */
  async analyzeDependencies(content: string, config: LanguageSemanticConfig): Promise<{
    internal: string[];
    external: string[];
    circular: string[];
  }> {
    const imports = this.extractImports(content, config);
    
    const internal: string[] = [];
    const external: string[] = [];
    
    imports.forEach(importPath => {
      if (importPath.startsWith('.') || importPath.startsWith('/')) {
        internal.push(importPath);
      } else {
        external.push(importPath);
      }
    });

    // Simple circular dependency detection (would need project context for full implementation)
    const circular = await this.detectCircularDependencies(internal);

    return { internal, external, circular };
  }

  /**
   * Calculate complexity metrics
   */
  async analyzeComplexity(content: string, config: LanguageSemanticConfig): Promise<{
    cyclomatic: number;
    cognitive: number;
    nestingDepth: number;
  }> {
    const cyclomatic = this.calculateCyclomaticComplexity(content, config);
    const cognitive = this.calculateCognitiveComplexity(content, config);
    const nestingDepth = this.calculateNestingDepth(content);

    return { cyclomatic, cognitive, nestingDepth };
  }

  /**
   * Analyze code maintainability
   */
  async analyzeMaintainability(content: string, config: LanguageSemanticConfig): Promise<{
    index: number;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Function length analysis
    const functions = this.extractFunctions(content, config);
    functions.forEach(func => {
      if (func.lineCount > 50) {
        issues.push(`Function '${func.name}' is too long (${func.lineCount} lines)`);
        suggestions.push(`Consider breaking down '${func.name}' into smaller functions`);
      }
    });

    // Variable naming analysis
    const variables = this.extractVariables(content, config);
    variables.forEach(variable => {
      if (variable.name.length < 3 && !['i', 'j', 'k', 'x', 'y', 'z'].includes(variable.name)) {
        issues.push(`Variable '${variable.name}' has unclear naming`);
        suggestions.push(`Use more descriptive names than '${variable.name}'`);
      }
    });

    // Comment density analysis
    const commentDensity = this.calculateCommentDensity(content, config);
    if (commentDensity < 0.1) {
      issues.push('Low comment density (< 10%)');
      suggestions.push('Add more explanatory comments for complex logic');
    }

    // Calculate maintainability index
    const complexity = this.calculateCyclomaticComplexity(content, config);
    const linesOfCode = content.split('\n').length;
    const maintainabilityIndex = Math.max(0, 
      171 - 5.2 * Math.log(linesOfCode) - 0.23 * complexity - 16.2 * Math.log(linesOfCode)
    );

    return {
      index: Math.min(100, maintainabilityIndex),
      issues,
      suggestions
    };
  }

  /**
   * Detect code patterns and anti-patterns
   */
  async detectPatterns(content: string, language: string): Promise<Array<{
    name: string;
    confidence: number;
    description: string;
  }>> {
    const patterns: Array<{
      name: string;
      confidence: number;
      description: string;
    }> = [];

    // Singleton pattern detection
    if (this.detectSingletonPattern(content)) {
      patterns.push({
        name: 'Singleton',
        confidence: 0.8,
        description: 'Singleton pattern detected'
      });
    }

    // Factory pattern detection
    if (this.detectFactoryPattern(content)) {
      patterns.push({
        name: 'Factory',
        confidence: 0.7,
        description: 'Factory pattern detected'
      });
    }

    // Observer pattern detection
    if (this.detectObserverPattern(content)) {
      patterns.push({
        name: 'Observer',
        confidence: 0.75,
        description: 'Observer pattern detected'
      });
    }

    // Anti-pattern: God class
    if (this.detectGodClass(content)) {
      patterns.push({
        name: 'God Class',
        confidence: 0.9,
        description: 'Large class with too many responsibilities'
      });
    }

    // Anti-pattern: Magic numbers
    if (this.detectMagicNumbers(content)) {
      patterns.push({
        name: 'Magic Numbers',
        confidence: 0.6,
        description: 'Hardcoded numbers that should be constants'
      });
    }

    return patterns;
  }

  /**
   * Get language-specific processing recommendations
   */
  getLanguageRecommendations(language: string, analysis: SemanticAnalysis): string[] {
    const recommendations: string[] = [];

    // Language-specific recommendations
    switch (language) {
      case 'typescript':
        if (analysis.symbols.filter(s => s.type === 'type' || s.type === 'interface').length === 0) {
          recommendations.push('Consider adding type definitions for better type safety');
        }
        break;
      case 'javascript':
        if (analysis.dependencies.external.includes('lodash')) {
          recommendations.push('Consider replacing Lodash with native ES6+ methods where possible');
        }
        break;
      case 'python':
        if (analysis.complexity.cyclomatic > 10) {
          recommendations.push('Consider using list comprehensions to reduce complexity');
        }
        break;
    }

    return recommendations;
  }

  // ==================== PRIVATE IMPLEMENTATION ====================

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
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby'
    };
    return languageMap[ext || ''] || 'unknown';
  }

  private getLanguageConfig(language: string): LanguageSemanticConfig {
    return SemanticAnalysisService.LANGUAGE_CONFIGS[language] 
      || SemanticAnalysisService.LANGUAGE_CONFIGS.javascript;
  }

  private calculateCyclomaticComplexity(content: string, config: LanguageSemanticConfig): number {
    let complexity = 1; // Base complexity
    
    config.complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }

  private calculateCognitiveComplexity(content: string, config: LanguageSemanticConfig): number {
    const lines = content.split('\n');
    let complexity = 0;
    let nestingLevel = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Check for nesting increase
      if (this.isNestingIncrease(trimmed)) {
        nestingLevel++;
        complexity += nestingLevel;
      }
      
      // Check for nesting decrease
      if (this.isNestingDecrease(trimmed)) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      // Check for complexity keywords
      if (this.hasComplexityKeyword(trimmed, config)) {
        complexity += nestingLevel + 1;
      }
    });
    
    return complexity;
  }

  private calculateNestingDepth(content: string): number {
    const lines = content.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (this.isNestingIncrease(trimmed)) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      
      if (this.isNestingDecrease(trimmed)) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    });
    
    return maxDepth;
  }

  private extractFunctions(content: string, config: LanguageSemanticConfig): Array<{ name: string; lineCount: number }> {
    const functions: Array<{ name: string; lineCount: number }> = [];
    const lines = content.split('\n');
    
    let match;
    const functionRegex = new RegExp(config.functionRegex.source, 'g');
    
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match.find((group, index) => index > 0 && group) || 'anonymous';
      const startPos = this.getPositionFromIndex(content, match.index!);
      
      // Count lines until function ends (simplified)
      let lineCount = 1;
      let braceCount = 0;
      let started = false;
      
      for (let i = startPos.line; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('{')) {
          started = true;
          braceCount += (line.match(/\{/g) || []).length;
        }
        if (line.includes('}')) {
          braceCount -= (line.match(/\}/g) || []).length;
        }
        
        if (started) {
          lineCount++;
          if (braceCount === 0) break;
        }
      }
      
      functions.push({ name: functionName, lineCount });
    }
    
    return functions;
  }

  private extractVariables(content: string, config: LanguageSemanticConfig): Array<{ name: string; type: string }> {
    const variables: Array<{ name: string; type: string }> = [];
    const matches = content.matchAll(config.variableRegex);
    
    for (const match of matches) {
      if (match.length >= 2) {
        variables.push({
          name: match[2] || match[1],
          type: match[1] || 'unknown'
        });
      }
    }
    
    return variables;
  }

  private calculateCommentDensity(content: string, config: LanguageSemanticConfig): number {
    const totalLines = content.split('\n').length;
    const commentMatches = content.match(config.commentPattern);
    const commentLines = commentMatches ? commentMatches.length : 0;
    
    return totalLines > 0 ? commentLines / totalLines : 0;
  }

  private extractImports(content: string, config: LanguageSemanticConfig): string[] {
    const imports: string[] = [];
    const matches = content.matchAll(config.importPattern);
    
    for (const match of matches) {
      const importPath = match.find((group, index) => index > 0 && group);
      if (importPath) {
        imports.push(importPath);
      }
    }
    
    return imports;
  }

  private async detectCircularDependencies(imports: string[]): Promise<string[]> {
    // Simplified circular dependency detection
    // Full implementation would require project-wide dependency graph
    return [];
  }

  private calculateLocalComplexity(code: string): number {
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch'];
    let complexity = 1;
    
    complexityKeywords.forEach(keyword => {
      if (code.includes(keyword)) {
        complexity++;
      }
    });
    
    return complexity;
  }

  private determineSymbolType(code: string): SymbolInfo['type'] {
    if (code.includes('class')) return 'class';
    if (code.includes('interface')) return 'interface';
    if (code.includes('type')) return 'type';
    if (code.includes('function') || code.includes('=>')) return 'function';
    return 'variable';
  }

  private determineVisibility(code: string): 'public' | 'private' | 'protected' {
    if (code.includes('private')) return 'private';
    if (code.includes('protected')) return 'protected';
    return 'public';
  }

  private getPositionFromIndex(content: string, index: number): { line: number; character: number } {
    const lines = content.substring(0, index).split('\n');
    return {
      line: lines.length - 1,
      character: lines[lines.length - 1].length
    };
  }

  private isNestingIncrease(line: string): boolean {
    return line.includes('{') || line.includes('(') || line.endsWith(':');
  }

  private isNestingDecrease(line: string): boolean {
    return line.includes('}') || line.includes(')');
  }

  private hasComplexityKeyword(line: string, config: LanguageSemanticConfig): boolean {
    return config.complexityPatterns.some(pattern => pattern.test(line));
  }

  // Pattern detection methods
  private detectSingletonPattern(content: string): boolean {
    return /class\s+\w+.*{[\s\S]*private\s+static\s+instance[\s\S]*getInstance\(\)/m.test(content);
  }

  private detectFactoryPattern(content: string): boolean {
    return /create\w+|make\w+|\w+Factory/i.test(content);
  }

  private detectObserverPattern(content: string): boolean {
    return /subscribe|unsubscribe|notify|observer/i.test(content);
  }

  private detectGodClass(content: string): boolean {
    const lines = content.split('\n').length;
    const methods = (content.match(/function\s+\w+|def\s+\w+|\w+\s*\(/g) || []).length;
    
    return lines > 500 || methods > 20;
  }

  private detectMagicNumbers(content: string): boolean {
    const magicNumberPattern = /\b\d{2,}\b/g;
    const matches = content.match(magicNumberPattern);
    
    if (!matches) return false;
    
    // Filter out common acceptable numbers
    const magicNumbers = matches.filter(num => {
      const value = parseInt(num);
      return value > 1 && value !== 100 && value !== 1000;
    });
    
    return magicNumbers.length > 3;
  }

  private getCacheKey(input: SemanticAnalysisInput): string {
    return `${input.filePath}:${input.language}:${input.includePatterns}`;
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.complexityCache.clear();
    this.analysisCache.clear();
    logger.info('SemanticAnalysisService cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { complexityCache: number; analysisCache: number } {
    return {
      complexityCache: this.complexityCache.size,
      analysisCache: this.analysisCache.size
    };
  }
}