import { logger } from '@superclaude/shared';
import {
  SupportedLanguage,
  CodeAnalysisResult,
  SymbolInfo,
  SemanticAnalysisResult,
  ParseError
} from '../types/index.js';
import { TreeSitterParser } from './TreeSitterParser.js';
import { LSPManager } from './LSPManager.js';

/**
 * Semantic code analyzer combining Tree-sitter and LSP
 * Provides comprehensive code understanding and analysis
 */
export class SemanticAnalyzer {
  private parser: TreeSitterParser;
  private lspManager: LSPManager;

  constructor(lspManager: LSPManager) {
    this.parser = new TreeSitterParser();
    this.lspManager = lspManager;
    
    logger.info('SemanticAnalyzer initialized');
  }

  /**
   * Analyze code file comprehensively
   */
  async analyzeCode(uri: string, content: string, language: SupportedLanguage): Promise<CodeAnalysisResult> {
    try {
      logger.info('Starting code analysis', { uri, language });

      // Parse with Tree-sitter for AST analysis
      const astAnalysis = await this.parser.parseCode(content, language);

      // Get LSP analysis if available
      let lspSymbols: SymbolInfo[] = [];
      try {
        // Ensure document is open in LSP
        await this.lspManager.openDocument(uri, language, content);
        lspSymbols = await this.lspManager.getDocumentSymbols(uri);
      } catch (error) {
        logger.warn('LSP analysis failed, using Tree-sitter only', {
          uri,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Combine and enhance symbols
      const enhancedSymbols = this.combineSymbolSources(astAnalysis.symbols, lspSymbols);

      // Analyze dependencies
      const dependencies = this.analyzeDependencies(content, language);

      // Calculate complexity metrics
      const complexity = this.calculateComplexity(astAnalysis, enhancedSymbols);

      // Detect issues
      const issues = await this.detectIssues(content, language, enhancedSymbols);

      // Calculate code metrics
      const metrics = this.calculateCodeMetrics(content, enhancedSymbols);

      const result: CodeAnalysisResult = {
        uri,
        language,
        symbols: enhancedSymbols,
        dependencies,
        complexity,
        issues,
        metrics,
        timestamp: new Date()
      };

      logger.info('Code analysis completed', {
        uri,
        symbolCount: enhancedSymbols.length,
        issueCount: issues.length,
        complexity: complexity.cyclomatic
      });

      return result;

    } catch (error) {
      logger.error('Code analysis failed', {
        uri,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new ParseError(
        `Code analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        uri
      );
    }
  }

  /**
   * Get semantic analysis using LSP
   */
  async getSemanticAnalysis(uri: string): Promise<SemanticAnalysisResult> {
    try {
      return await this.lspManager.getSemanticAnalysis(uri);
    } catch (error) {
      logger.error('Semantic analysis failed', {
        uri,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find symbol at position
   */
  async findSymbolAtPosition(uri: string, line: number, character: number): Promise<SymbolInfo | null> {
    try {
      // First try LSP
      const references = await this.lspManager.findReferences(uri, line, character);
      if (references.length > 0) {
        return references[0]; // Return the symbol at the position
      }

      // Fallback to Tree-sitter analysis
      const document = await this.getDocumentContent(uri);
      if (!document) {
        return null;
      }

      const astAnalysis = await this.parser.parseCode(document.content, document.language);
      
      // Find symbol at position in AST
      return this.findSymbolInAST(astAnalysis.symbols, line, character);

    } catch (error) {
      logger.error('Error finding symbol at position', {
        uri, line, character,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get symbol usage statistics
   */
  async getSymbolUsage(uri: string, symbolId: string): Promise<SymbolUsageInfo> {
    try {
      const analysis = await this.getSemanticAnalysis(uri);
      const symbol = analysis.symbolTable[symbolId];
      
      if (!symbol) {
        throw new Error(`Symbol not found: ${symbolId}`);
      }

      // Count references
      const referenceCount = symbol.references.length;
      
      // Analyze usage patterns
      const usagePatterns = this.analyzeUsagePatterns(symbol, analysis);

      return {
        symbolId,
        symbol,
        referenceCount,
        usagePatterns,
        scope: symbol.scope || 'global',
        complexity: this.calculateSymbolComplexity(symbol),
        recommendations: this.generateSymbolRecommendations(symbol, usagePatterns)
      };

    } catch (error) {
      logger.error('Error getting symbol usage', {
        uri, symbolId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Combine symbols from different sources
   */
  private combineSymbolSources(astSymbols: SymbolInfo[], lspSymbols: SymbolInfo[]): SymbolInfo[] {
    const combined = new Map<string, SymbolInfo>();

    // Add AST symbols
    for (const symbol of astSymbols) {
      combined.set(symbol.id, symbol);
    }

    // Enhance with LSP symbols
    for (const lspSymbol of lspSymbols) {
      const existing = combined.get(lspSymbol.id);
      if (existing) {
        // Merge information
        combined.set(lspSymbol.id, {
          ...existing,
          ...lspSymbol,
          detail: lspSymbol.detail || existing.detail,
          documentation: lspSymbol.documentation || existing.documentation,
          references: [...existing.references, ...lspSymbol.references],
          metadata: { ...existing.metadata, ...lspSymbol.metadata }
        });
      } else {
        combined.set(lspSymbol.id, lspSymbol);
      }
    }

    return Array.from(combined.values());
  }

  /**
   * Analyze code dependencies
   */
  private analyzeDependencies(content: string, language: SupportedLanguage): any[] {
    const dependencies: any[] = [];

    // Language-specific import patterns
    const importPatterns: Record<SupportedLanguage, RegExp[]> = {
      typescript: [
        /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      ],
      javascript: [
        /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      ],
      python: [
        /^import\s+(\S+)/gm,
        /^from\s+(\S+)\s+import/gm
      ],
      rust: [
        /use\s+([^;]+);/g,
        /extern\s+crate\s+(\w+)/g
      ],
      go: [
        /import\s+['"]([^'"]+)['"]/g,
        /import\s+\(\s*\n([\s\S]*?)\n\s*\)/g
      ],
      java: [
        /import\s+([^;]+);/g
      ],
      cpp: [
        /#include\s*<([^>]+)>/g,
        /#include\s*"([^"]+)"/g
      ],
      csharp: [
        /using\s+([^;]+);/g
      ]
    };

    const patterns = importPatterns[language] || [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1].trim();
        
        dependencies.push({
          name: importPath,
          type: this.classifyDependency(importPath),
          path: importPath
        });
      }
    }

    return dependencies;
  }

  /**
   * Classify dependency type
   */
  private classifyDependency(importPath: string): 'internal' | 'external' | 'standard' {
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      return 'internal';
    }
    
    // Common standard library patterns
    const standardLibraries = ['fs', 'path', 'http', 'https', 'os', 'crypto', 'util'];
    if (standardLibraries.includes(importPath)) {
      return 'standard';
    }
    
    return 'external';
  }

  /**
   * Calculate complexity metrics
   */
  private calculateComplexity(astAnalysis: any, symbols: SymbolInfo[]): any {
    // Cyclomatic complexity (simplified)
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(symbols);
    
    // Cognitive complexity (simplified)
    const cognitiveComplexity = this.calculateCognitiveComplexity(symbols);
    
    // Maintainability index (simplified)
    const maintainability = Math.max(0, Math.min(100, 100 - cyclomaticComplexity * 2 - cognitiveComplexity));

    return {
      cyclomatic: cyclomaticComplexity,
      cognitive: cognitiveComplexity,
      maintainability
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(symbols: SymbolInfo[]): number {
    let complexity = 1; // Base complexity

    for (const symbol of symbols) {
      if (symbol.type === 'function' || symbol.type === 'method') {
        // Each function adds base complexity
        complexity += 1;
        
        // Add complexity for control structures (simplified)
        const controlKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch'];
        for (const keyword of controlKeywords) {
          if (symbol.metadata.content && typeof symbol.metadata.content === 'string') {
            const matches = (symbol.metadata.content.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
            complexity += matches;
          }
        }
      }
    }

    return complexity;
  }

  /**
   * Calculate cognitive complexity
   */
  private calculateCognitiveComplexity(symbols: SymbolInfo[]): number {
    // Simplified cognitive complexity calculation
    let complexity = 0;

    for (const symbol of symbols) {
      if (symbol.type === 'function' || symbol.type === 'method') {
        // Nesting level increases cognitive load
        const nestingLevel = this.estimateNestingLevel(symbol);
        complexity += nestingLevel * 2;
        
        // Logical operators increase cognitive load
        if (symbol.metadata.content && typeof symbol.metadata.content === 'string') {
          const logicalOps = (symbol.metadata.content.match(/&&|\|\||and|or/g) || []).length;
          complexity += logicalOps;
        }
      }
    }

    return complexity;
  }

  /**
   * Estimate nesting level (simplified)
   */
  private estimateNestingLevel(symbol: SymbolInfo): number {
    // This is a simplified estimation
    const scope = symbol.scope || '';
    return (scope.match(/\./g) || []).length + 1;
  }

  /**
   * Detect code issues
   */
  private async detectIssues(content: string, language: SupportedLanguage, symbols: SymbolInfo[]): Promise<any[]> {
    const issues: any[] = [];

    // Large function detection
    for (const symbol of symbols) {
      if (symbol.type === 'function' || symbol.type === 'method') {
        const lineCount = symbol.range.end.line - symbol.range.start.line;
        if (lineCount > 50) {
          issues.push({
            severity: 'warning',
            message: `Function '${symbol.name}' is very long (${lineCount} lines). Consider breaking it down.`,
            range: symbol.range,
            code: 'large-function',
            source: 'semantic-analyzer'
          });
        }
      }
    }

    // Unused variables (simplified detection)
    for (const symbol of symbols) {
      if (symbol.type === 'variable' && symbol.references.length === 0) {
        issues.push({
          severity: 'hint',
          message: `Variable '${symbol.name}' appears to be unused.`,
          range: symbol.range,
          code: 'unused-variable',
          source: 'semantic-analyzer'
        });
      }
    }

    // Magic numbers detection (simplified)
    const magicNumberPattern = /\\b\\d{2,}\\b/g;
    let match;
    let lineNumber = 0;
    const lines = content.split('\\n');
    
    for (const line of lines) {
      while ((match = magicNumberPattern.exec(line)) !== null) {
        const number = parseInt(match[0]);
        if (number > 1 && number !== 100 && number !== 1000) { // Exclude common values
          issues.push({
            severity: 'info',
            message: `Consider extracting magic number ${number} to a named constant.`,
            range: {
              start: { line: lineNumber, character: match.index },
              end: { line: lineNumber, character: match.index + match[0].length }
            },
            code: 'magic-number',
            source: 'semantic-analyzer'
          });
        }
      }
      lineNumber++;
    }

    return issues;
  }

  /**
   * Calculate code metrics
   */
  private calculateCodeMetrics(content: string, symbols: SymbolInfo[]): any {
    const lines = content.split('\\n');
    
    let linesOfCode = 0;
    let linesOfComments = 0;
    let blankLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        blankLines++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
        linesOfComments++;
      } else {
        linesOfCode++;
      }
    }

    const functionCount = symbols.filter(s => s.type === 'function' || s.type === 'method').length;
    const classCount = symbols.filter(s => s.type === 'class').length;

    return {
      linesOfCode,
      linesOfComments,
      blankLines,
      functionCount,
      classCount
    };
  }

  /**
   * Find symbol in AST at position
   */
  private findSymbolInAST(symbols: SymbolInfo[], line: number, character: number): SymbolInfo | null {
    for (const symbol of symbols) {
      const range = symbol.range;
      if (line >= range.start.line && line <= range.end.line) {
        if (line === range.start.line && character < range.start.character) {
          continue;
        }
        if (line === range.end.line && character > range.end.character) {
          continue;
        }
        return symbol;
      }
    }
    return null;
  }

  /**
   * Get document content (mock implementation)
   */
  private async getDocumentContent(uri: string): Promise<{ content: string; language: SupportedLanguage } | null> {
    // In production, this would read from file system or document cache
    // For now, return null to indicate document not found
    return null;
  }

  /**
   * Analyze usage patterns
   */
  private analyzeUsagePatterns(symbol: SymbolInfo, analysis: SemanticAnalysisResult): string[] {
    const patterns: string[] = [];

    // Check if symbol is heavily used
    if (symbol.references.length > 10) {
      patterns.push('heavily-used');
    }

    // Check if symbol is in global scope
    if (!symbol.scope || symbol.scope === 'global') {
      patterns.push('global-scope');
    }

    // Check if symbol is public
    if (symbol.visibility === 'public') {
      patterns.push('public-api');
    }

    return patterns;
  }

  /**
   * Calculate symbol complexity
   */
  private calculateSymbolComplexity(symbol: SymbolInfo): number {
    let complexity = 1;

    // Add complexity based on type
    if (symbol.type === 'function' || symbol.type === 'method') {
      complexity += 2;
    }

    // Add complexity for references
    complexity += Math.min(symbol.references.length * 0.1, 5);

    return complexity;
  }

  /**
   * Generate symbol recommendations
   */
  private generateSymbolRecommendations(symbol: SymbolInfo, patterns: string[]): string[] {
    const recommendations: string[] = [];

    if (patterns.includes('heavily-used') && patterns.includes('global-scope')) {
      recommendations.push('Consider refactoring this heavily-used global symbol into a module or class');
    }

    if (symbol.type === 'function' && symbol.references.length === 0) {
      recommendations.push('This function appears to be unused - consider removing it');
    }

    if (symbol.visibility === 'public' && symbol.references.length < 2) {
      recommendations.push('Consider making this symbol private if it\\'s not part of the public API');
    }

    return recommendations;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.parser.cleanup();
      logger.info('SemanticAnalyzer cleanup completed');
    } catch (error) {
      logger.error('Error during SemanticAnalyzer cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// ==================== INTERFACES ====================

interface SymbolUsageInfo {
  symbolId: string;
  symbol: SymbolInfo;
  referenceCount: number;
  usagePatterns: string[];
  scope: string;
  complexity: number;
  recommendations: string[];
}"