import { promises as fs } from 'fs';
import * as path from 'path';
import {
  SemanticAnalysis,
  SemanticAnalysisInput,
  SemanticContext,
  SemanticAnalysisError
} from '../types/index.js';

/**
 * Advanced semantic analysis engine with deep code understanding
 */
export class SemanticAnalysisEngine {
  private languagePatterns: Map<string, RegExp[]> = new Map();
  private complexityCache: Map<string, number> = new Map();

  constructor() {
    this.initializeLanguagePatterns();
  }

  /**
   * Perform comprehensive semantic analysis on a file
   */
  async analyzeFile(input: SemanticAnalysisInput): Promise<SemanticAnalysis> {
    try {
      const startTime = Date.now();
      
      // Get file content
      const content = input.content || await this.readFile(input.filePath);
      const language = input.language || this.detectLanguage(input.filePath);
      
      // Parallel analysis execution
      const [
        complexity,
        maintainability,
        dependencies,
        symbols,
        patterns
      ] = await Promise.all([
        this.analyzeComplexity(content, language),
        this.analyzeMaintainability(content, language),
        this.analyzeDependencies(content, language),
        this.extractSymbols(content, language),
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

      // Cache complexity score for performance
      this.complexityCache.set(input.filePath, complexity.cyclomatic);

      return analysis;
    } catch (error) {
      throw new SemanticAnalysisError(
        `Semantic analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        input.filePath,
        input.language
      );
    }
  }

  /**
   * Analyze code complexity metrics
   */
  private async analyzeComplexity(content: string, language: string): Promise<{
    cyclomatic: number;
    cognitive: number;
    nestingDepth: number;
  }> {
    const cyclomatic = this.calculateCyclomaticComplexity(content, language);
    const cognitive = this.calculateCognitiveComplexity(content, language);
    const nestingDepth = this.calculateNestingDepth(content, language);

    return {
      cyclomatic,
      cognitive,
      nestingDepth
    };
  }

  /**
   * Analyze maintainability metrics
   */
  private async analyzeMaintainability(content: string, language: string): Promise<{
    index: number;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Function length analysis
    const functions = this.extractFunctions(content, language);
    functions.forEach(func => {
      if (func.lineCount > 50) {
        issues.push(`Function '${func.name}' is too long (${func.lineCount} lines)`);
        suggestions.push(`Consider breaking down '${func.name}' into smaller functions`);
      }
    });

    // Variable naming analysis
    const variables = this.extractVariables(content, language);
    variables.forEach(variable => {
      if (variable.name.length < 3 && !['i', 'j', 'k', 'x', 'y', 'z'].includes(variable.name)) {
        issues.push(`Variable '${variable.name}' has unclear naming`);
        suggestions.push(`Use more descriptive names than '${variable.name}'`);
      }
    });

    // Comment density analysis
    const commentDensity = this.calculateCommentDensity(content, language);
    if (commentDensity < 0.1) {
      issues.push('Low comment density (< 10%)');
      suggestions.push('Add more explanatory comments for complex logic');
    }

    // Calculate maintainability index (0-100)
    const complexity = this.calculateCyclomaticComplexity(content, language);
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
   * Analyze dependencies and imports
   */
  private async analyzeDependencies(content: string, language: string): Promise<{
    internal: string[];
    external: string[];
    circular: string[];
  }> {
    const imports = this.extractImports(content, language);
    
    const internal: string[] = [];
    const external: string[] = [];
    
    imports.forEach(imp => {
      if (imp.startsWith('.') || imp.startsWith('/')) {
        internal.push(imp);
      } else {
        external.push(imp);
      }
    });

    // Basic circular dependency detection (simplified)
    const circular = await this.detectCircularDependencies(internal);

    return {
      internal,
      external,
      circular
    };
  }

  /**
   * Extract symbols (functions, classes, variables)
   */
  private async extractSymbols(content: string, language: string): Promise<Array<{
    name: string;
    type: string;
    line: number;
    complexity: number;
    visibility: string;
  }>> {
    const symbols: Array<{
      name: string;
      type: string;
      line: number;
      complexity: number;
      visibility: string;
    }> = [];

    const lines = content.split('\n');

    // Extract functions
    const functionRegex = this.getFunctionRegex(language);
    lines.forEach((line, index) => {
      const match = line.match(functionRegex);
      if (match) {
        symbols.push({
          name: match[1] || 'anonymous',
          type: 'function',
          line: index + 1,
          complexity: this.calculateLocalComplexity(line),
          visibility: this.determineVisibility(line, language)
        });
      }
    });

    // Extract classes
    const classRegex = this.getClassRegex(language);
    lines.forEach((line, index) => {
      const match = line.match(classRegex);
      if (match) {
        symbols.push({
          name: match[1] || 'anonymous',
          type: 'class',
          line: index + 1,
          complexity: 1,
          visibility: this.determineVisibility(line, language)
        });
      }
    });

    return symbols;
  }

  /**
   * Detect code patterns and anti-patterns
   */
  private async detectPatterns(content: string, language: string): Promise<Array<{
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
    if (this.detectSingletonPattern(content, language)) {
      patterns.push({
        name: 'Singleton',
        confidence: 0.8,
        description: 'Singleton pattern detected'
      });
    }

    // Factory pattern detection
    if (this.detectFactoryPattern(content, language)) {
      patterns.push({
        name: 'Factory',
        confidence: 0.7,
        description: 'Factory pattern detected'
      });
    }

    // Observer pattern detection
    if (this.detectObserverPattern(content, language)) {
      patterns.push({
        name: 'Observer',
        confidence: 0.75,
        description: 'Observer pattern detected'
      });
    }

    // Anti-pattern: God class
    if (this.detectGodClass(content, language)) {
      patterns.push({
        name: 'God Class',
        confidence: 0.9,
        description: 'Large class with too many responsibilities'
      });
    }

    return patterns;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new SemanticAnalysisError(`Failed to read file: ${filePath}`);
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby'
    };
    return languageMap[ext] || 'unknown';
  }

  private calculateCyclomaticComplexity(content: string, language: string): number {
    // Simplified cyclomatic complexity calculation
    const patterns = this.getComplexityPatterns(language);
    let complexity = 1; // Base complexity
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }

  private calculateCognitiveComplexity(content: string, language: string): number {
    // Simplified cognitive complexity (considers nesting)
    const lines = content.split('\n');
    let complexity = 0;
    let nestingLevel = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Check for nesting increase
      if (this.isNestingIncrease(trimmed, language)) {
        nestingLevel++;
        complexity += nestingLevel;
      }
      
      // Check for nesting decrease
      if (this.isNestingDecrease(trimmed, language)) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      // Check for complexity keywords
      if (this.hasComplexityKeyword(trimmed, language)) {
        complexity += nestingLevel + 1;
      }
    });
    
    return complexity;
  }

  private calculateNestingDepth(content: string, language: string): number {
    const lines = content.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (this.isNestingIncrease(trimmed, language)) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      
      if (this.isNestingDecrease(trimmed, language)) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    });
    
    return maxDepth;
  }

  private extractFunctions(content: string, language: string): Array<{
    name: string;
    lineCount: number;
  }> {
    const functions: Array<{ name: string; lineCount: number; }> = [];
    const lines = content.split('\n');
    const functionRegex = this.getFunctionRegex(language);
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(functionRegex);
      if (match) {
        const functionName = match[1] || 'anonymous';
        let lineCount = 1;
        let braceCount = 0;
        let started = false;
        
        // Count lines until function ends
        for (let j = i; j < lines.length; j++) {
          const line = lines[j];
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
    }
    
    return functions;
  }

  private extractVariables(content: string, language: string): Array<{
    name: string;
    type: string;
  }> {
    const variables: Array<{ name: string; type: string; }> = [];
    const variableRegex = this.getVariableRegex(language);
    const matches = content.match(variableRegex);
    
    if (matches) {
      matches.forEach(match => {
        const parts = match.split(/\s+/);
        if (parts.length >= 2) {
          variables.push({
            name: parts[1],
            type: parts[0]
          });
        }
      });
    }
    
    return variables;
  }

  private calculateCommentDensity(content: string, language: string): number {
    const totalLines = content.split('\n').length;
    const commentPattern = this.getCommentPattern(language);
    const commentMatches = content.match(commentPattern);
    const commentLines = commentMatches ? commentMatches.length : 0;
    
    return totalLines > 0 ? commentLines / totalLines : 0;
  }

  private extractImports(content: string, language: string): string[] {
    const imports: string[] = [];
    const importPattern = this.getImportPattern(language);
    const matches = content.match(importPattern);
    
    if (matches) {
      matches.forEach(match => {
        const importPath = this.extractImportPath(match, language);
        if (importPath) {
          imports.push(importPath);
        }
      });
    }
    
    return imports;
  }

  private async detectCircularDependencies(imports: string[]): Promise<string[]> {
    // Simplified circular dependency detection
    // In a real implementation, this would traverse the dependency graph
    return [];
  }

  private calculateLocalComplexity(line: string): number {
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch'];
    let complexity = 1;
    
    complexityKeywords.forEach(keyword => {
      if (line.includes(keyword)) {
        complexity++;
      }
    });
    
    return complexity;
  }

  private determineVisibility(line: string, language: string): string {
    if (language === 'typescript' || language === 'javascript') {
      if (line.includes('private')) return 'private';
      if (line.includes('protected')) return 'protected';
      if (line.includes('public')) return 'public';
      if (line.includes('export')) return 'public';
      return 'private';
    }
    
    return 'public';
  }

  // Pattern detection methods
  private detectSingletonPattern(content: string, language: string): boolean {
    return /class\s+\w+.*{[\s\S]*private\s+static\s+instance[\s\S]*getInstance\(\)/m.test(content);
  }

  private detectFactoryPattern(content: string, language: string): boolean {
    return /create\w+|make\w+|\w+Factory/i.test(content);
  }

  private detectObserverPattern(content: string, language: string): boolean {
    return /subscribe|unsubscribe|notify|observer/i.test(content);
  }

  private detectGodClass(content: string, language: string): boolean {
    const lines = content.split('\n').length;
    const methods = (content.match(/function\s+\w+|def\s+\w+|\w+\s*\(/g) || []).length;
    
    return lines > 500 || methods > 20;
  }

  // Language-specific regex patterns
  private initializeLanguagePatterns(): void {
    // Initialize patterns for different languages
    this.languagePatterns.set('typescript', [
      /if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/,
      /catch\s*\(/, /&&/, /\|\|/, /\?:/
    ]);
    
    this.languagePatterns.set('javascript', [
      /if\s*\(/, /else/, /while\s*\(/, /for\s*\(/, /switch\s*\(/,
      /catch\s*\(/, /&&/, /\|\|/, /\?:/
    ]);
    
    this.languagePatterns.set('python', [
      /if\s+/, /elif\s+/, /else:/, /while\s+/, /for\s+/,
      /except\s*:/, /and/, /or/
    ]);
  }

  private getComplexityPatterns(language: string): RegExp[] {
    return this.languagePatterns.get(language) || [];
  }

  private getFunctionRegex(language: string): RegExp {
    const patterns: Record<string, RegExp> = {
      'typescript': /(?:function\s+(\w+)|(\w+)\s*\(.*\)\s*{|(\w+)\s*=\s*\(.*\)\s*=>)/,
      'javascript': /(?:function\s+(\w+)|(\w+)\s*\(.*\)\s*{|(\w+)\s*=\s*\(.*\)\s*=>)/,
      'python': /def\s+(\w+)\s*\(/,
      'java': /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/
    };
    
    return patterns[language] || /function\s+(\w+)/;
  }

  private getClassRegex(language: string): RegExp {
    const patterns: Record<string, RegExp> = {
      'typescript': /class\s+(\w+)/,
      'javascript': /class\s+(\w+)/,
      'python': /class\s+(\w+)/,
      'java': /(?:public|private|protected)?\s*class\s+(\w+)/
    };
    
    return patterns[language] || /class\s+(\w+)/;
  }

  private getVariableRegex(language: string): RegExp {
    const patterns: Record<string, RegExp> = {
      'typescript': /(let|const|var)\s+(\w+)/g,
      'javascript': /(let|const|var)\s+(\w+)/g,
      'python': /(\w+)\s*=/g,
      'java': /(int|String|boolean|double|float)\s+(\w+)/g
    };
    
    return patterns[language] || /(let|const|var)\s+(\w+)/g;
  }

  private getCommentPattern(language: string): RegExp {
    const patterns: Record<string, RegExp> = {
      'typescript': /\/\/.*|\/\*[\s\S]*?\*\//g,
      'javascript': /\/\/.*|\/\*[\s\S]*?\*\//g,
      'python': /#.*|"""[\s\S]*?"""/g,
      'java': /\/\/.*|\/\*[\s\S]*?\*\//g
    };
    
    return patterns[language] || /\/\/.*|\/\*[\s\S]*?\*\//g;
  }

  private getImportPattern(language: string): RegExp {
    const patterns: Record<string, RegExp> = {
      'typescript': /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      'javascript': /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      'python': /from\s+(\S+)\s+import|import\s+(\S+)/g,
      'java': /import\s+([^;]+);/g
    };
    
    return patterns[language] || /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  }

  private extractImportPath(match: string, language: string): string | null {
    if (language === 'typescript' || language === 'javascript') {
      const pathMatch = match.match(/['"]([^'"]+)['"]/);
      return pathMatch ? pathMatch[1] : null;
    }
    
    return null;
  }

  private isNestingIncrease(line: string, language: string): boolean {
    return line.includes('{') || line.includes('(') || 
           (language === 'python' && line.endsWith(':'));
  }

  private isNestingDecrease(line: string, language: string): boolean {
    return line.includes('}') || line.includes(')');
  }

  private hasComplexityKeyword(line: string, language: string): boolean {
    const keywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch'];
    return keywords.some(keyword => line.includes(keyword));
  }
}