import Parser from 'tree-sitter';
import { logger } from '../../shared/src/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import {
  SupportedLanguage,
  SymbolInfo,
  ASTNodeType,
  ParseError
} from '../types/index.js';

// Real language imports
import TypeScript from 'tree-sitter-typescript';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';

interface LanguageModule {
  default: any;
}

/**
 * Tree-sitter based code parser for AST analysis
 * Provides language-agnostic parsing and symbol extraction
 */
export class TreeSitterParser {
  private parser: Parser;
  private languages: Map<SupportedLanguage, any>;

  constructor() {
    this.parser = new Parser();
    this.languages = new Map();
    
    this.initializeLanguages();
    logger.info('TreeSitterParser initialized');
  }

  /**
   * Initialize language parsers
   */
  private async initializeLanguages(): Promise<void> {
    try {
      // Load actual tree-sitter language modules
      
      // TypeScript
      this.languages.set('typescript', TypeScript.typescript);
      
      // JavaScript  
      this.languages.set('javascript', JavaScript);
      
      // Python
      this.languages.set('python', Python);
      
      // TSX support
      this.languages.set('tsx', TypeScript.tsx);
      
      logger.info('Tree-sitter languages initialized', {
        languageCount: this.languages.size,
        languages: Array.from(this.languages.keys())
      });
      
    } catch (error) {
      logger.error('Failed to initialize tree-sitter languages', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Load language module
   */
  private async loadLanguage(language: string): Promise<any> {
    const languageMap = {
      'typescript': TypeScript.typescript,
      'javascript': JavaScript,
      'python': Python,
      'tsx': TypeScript.tsx
    };
    
    const lang = languageMap[language as keyof typeof languageMap];
    if (!lang) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    return lang;
  }

  /**
   * Get mock node types for language
   */
  private getMockNodeTypes(language: string): Record<string, string[]> {
    const commonTypes = {
      typescript: [
        'program', 'function_declaration', 'class_declaration', 'interface_declaration',
        'variable_declaration', 'method_definition', 'property_signature',
        'import_statement', 'export_statement', 'identifier', 'call_expression'
      ],
      javascript: [
        'program', 'function_declaration', 'class_declaration', 'variable_declaration',
        'method_definition', 'property_definition', 'import_statement', 'export_statement',
        'identifier', 'call_expression', 'arrow_function'
      ],
      python: [
        'module', 'function_definition', 'class_definition', 'import_statement',
        'import_from_statement', 'assignment', 'identifier', 'call', 'attribute'
      ]
    };

    return { [language]: commonTypes[language as keyof typeof commonTypes] || [] };
  }

  /**
   * Parse code and extract symbols
   */
  async parseCode(content: string, language: SupportedLanguage): Promise<ParseResult> {
    try {
      logger.debug('Parsing code', { language, contentLength: content.length });

      const languageModule = this.languages.get(language);
      if (!languageModule) {
        throw new ParseError(`Unsupported language: ${language}`, '');
      }

      // Set language and parse with real Tree-sitter
      this.parser.setLanguage(languageModule);
      const tree = this.parser.parse(content);
      
      // Extract symbols from real AST
      const symbols = this.extractSymbolsFromTree(tree, language, content);
      
      // Analyze structure
      const structure = this.analyzeTreeStructure(tree, symbols);

      const result: ParseResult = {
        language,
        tree: {
          rootNode: this.convertNodeToMockNode(tree.rootNode),
          language
        },
        symbols,
        structure,
        parseTime: Date.now()
      };

      logger.debug('Code parsing completed', {
        language,
        symbolCount: symbols.length,
        structureDepth: structure.depth,
        nodeCount: tree.rootNode.descendantCount
      });

      return result;

    } catch (error) {
      logger.error('Code parsing failed', {
        language,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new ParseError(
        `Parsing failed for ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ''
      );
    }
  }

  /**
   * Mock parse implementation
   */
  private mockParse(content: string, language: SupportedLanguage): MockTree {
    // This is a simplified mock implementation
    // In production, this would use actual tree-sitter parsing
    
    const lines = content.split('\\n');
    const nodes: MockNode[] = [];
    
    // Extract functions/methods
    const functionRegex = this.getFunctionRegex(language);
    const classRegex = this.getClassRegex(language);
    const variableRegex = this.getVariableRegex(language);
    
    lines.forEach((line, lineIndex) => {
      // Functions
      const functionMatch = functionRegex.exec(line);
      if (functionMatch) {
        nodes.push({
          type: 'function_declaration',
          name: functionMatch[1] || 'anonymous',
          startPosition: { row: lineIndex, column: functionMatch.index || 0 },
          endPosition: { row: lineIndex, column: line.length },
          text: line.trim(),
          children: []
        });
      }
      
      // Classes
      const classMatch = classRegex.exec(line);
      if (classMatch) {
        nodes.push({
          type: 'class_declaration',
          name: classMatch[1] || 'anonymous',
          startPosition: { row: lineIndex, column: classMatch.index || 0 },
          endPosition: { row: lineIndex, column: line.length },
          text: line.trim(),
          children: []
        });
      }
      
      // Variables
      const variableMatch = variableRegex.exec(line);
      if (variableMatch) {
        nodes.push({
          type: 'variable_declaration',
          name: variableMatch[1] || 'unknown',
          startPosition: { row: lineIndex, column: variableMatch.index || 0 },
          endPosition: { row: lineIndex, column: line.length },
          text: line.trim(),
          children: []
        });
      }
    });

    return {
      rootNode: {
        type: 'program',
        name: 'root',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: lines.length - 1, column: 0 },
        text: content,
        children: nodes
      },
      language
    };
  }

  /**
   * Get function regex for language
   */
  private getFunctionRegex(language: SupportedLanguage): RegExp {
    const patterns: Record<SupportedLanguage, RegExp> = {
      typescript: /(?:function\\s+|const\\s+|let\\s+|var\\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*[=:]?\\s*(?:function|\\(|=>)/,
      javascript: /(?:function\\s+|const\\s+|let\\s+|var\\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*[=:]?\\s*(?:function|\\(|=>)/,
      python: /def\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/,
      rust: /fn\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/,
      go: /func\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/,
      java: /(?:public|private|protected)?\\s*(?:static)?\\s*(?:\\w+\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/,
      cpp: /(?:\\w+\\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/,
      csharp: /(?:public|private|protected)?\\s*(?:static)?\\s*(?:\\w+\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/
    };

    return patterns[language] || /function\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;
  }

  /**
   * Get class regex for language
   */
  private getClassRegex(language: SupportedLanguage): RegExp {
    const patterns: Record<SupportedLanguage, RegExp> = {
      typescript: /class\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      javascript: /class\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      python: /class\\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
      rust: /struct\\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
      go: /type\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s+struct/,
      java: /(?:public|private)?\\s*class\\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
      cpp: /class\\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
      csharp: /(?:public|private|internal)?\\s*class\\s+([a-zA-Z_][a-zA-Z0-9_]*)/
    };

    return patterns[language] || /class\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;
  }

  /**
   * Get variable regex for language
   */
  private getVariableRegex(language: SupportedLanguage): RegExp {
    const patterns: Record<SupportedLanguage, RegExp> = {
      typescript: /(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*[=:]/,
      javascript: /(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=/,
      python: /^\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*=/m,
      rust: /let\\s+(?:mut\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*=/,
      go: /(?:var\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*:?=\\s*/,
      java: /(?:final\\s+)?\\w+\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*=/,
      cpp: /\\w+\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*=/,
      csharp: /(?:var|\\w+)\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*=/
    };

    return patterns[language] || /(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=/;
  }

  /**
   * Extract symbols from AST
   */
  private extractSymbols(tree: MockTree, language: SupportedLanguage, content: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    
    const extractFromNode = (node: MockNode, parentScope?: string): void => {
      const symbolId = uuidv4();
      const nodeType = this.mapNodeTypeToSymbolType(node.type);
      
      if (nodeType) {
        const symbol: SymbolInfo = {
          id: symbolId,
          name: node.name,
          type: nodeType,
          kind: this.getSymbolKind(nodeType),
          range: {
            start: {
              line: node.startPosition.row,
              character: node.startPosition.column
            },
            end: {
              line: node.endPosition.row,
              character: node.endPosition.column
            }
          },
          uri: '', // Will be set by caller
          scope: parentScope,
          references: [],
          metadata: {
            content: node.text,
            nodeType: node.type
          }
        };

        symbols.push(symbol);
        
        // Extract from children
        if (node.children) {
          const childScope = nodeType === 'class' || nodeType === 'function' ? node.name : parentScope;
          for (const child of node.children) {
            extractFromNode(child, childScope);
          }
        }
      }
    };

    extractFromNode(tree.rootNode);
    
    return symbols;
  }

  /**
   * Map tree-sitter node type to symbol type
   */
  private mapNodeTypeToSymbolType(nodeType: string): ASTNodeType | null {
    const mapping: Record<string, ASTNodeType> = {
      'function_declaration': 'function',
      'function_definition': 'function',
      'method_definition': 'method',
      'class_declaration': 'class',
      'class_definition': 'class',
      'interface_declaration': 'interface',
      'variable_declaration': 'variable',
      'assignment': 'variable',
      'import_statement': 'import',
      'import_from_statement': 'import',
      'export_statement': 'export',
      'call_expression': 'call',
      'call': 'call',
      'property_signature': 'property',
      'property_definition': 'property'
    };

    return mapping[nodeType] || null;
  }

  /**
   * Get LSP symbol kind for symbol type
   */
  private getSymbolKind(symbolType: ASTNodeType): number {
    // LSP SymbolKind values
    const kindMapping: Record<ASTNodeType, number> = {
      'function': 12,
      'class': 5,
      'method': 6,
      'variable': 13,
      'interface': 11,
      'type': 5,
      'import': 9,
      'export': 9,
      'call': 12,
      'property': 7,
      'parameter': 17
    };

    return kindMapping[symbolType] || 13; // Default to variable
  }

  /**
   * Analyze code structure
   */
  private analyzeStructure(tree: MockTree, symbols: SymbolInfo[]): CodeStructure {
    const structure: CodeStructure = {
      depth: this.calculateDepth(tree.rootNode),
      complexity: this.estimateComplexity(tree.rootNode),
      patterns: this.detectPatterns(symbols),
      metrics: {
        nodeCount: this.countNodes(tree.rootNode),
        functionCount: symbols.filter(s => s.type === 'function' || s.type === 'method').length,
        classCount: symbols.filter(s => s.type === 'class').length,
        variableCount: symbols.filter(s => s.type === 'variable').length
      }
    };

    return structure;
  }

  /**
   * Calculate AST depth
   */
  private calculateDepth(node: MockNode): number {
    if (!node.children || node.children.length === 0) {
      return 1;
    }

    let maxChildDepth = 0;
    for (const child of node.children) {
      const childDepth = this.calculateDepth(child);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return 1 + maxChildDepth;
  }

  /**
   * Estimate complexity
   */
  private estimateComplexity(node: MockNode): number {
    let complexity = 1;

    if (node.children) {
      for (const child of node.children) {
        complexity += this.estimateComplexity(child);
        
        // Add complexity for control structures
        if (this.isControlStructure(child.type)) {
          complexity += 1;
        }
      }
    }

    return complexity;
  }

  /**
   * Check if node type is a control structure
   */
  private isControlStructure(nodeType: string): boolean {
    const controlTypes = [
      'if_statement', 'while_statement', 'for_statement', 'switch_statement',
      'try_statement', 'catch_clause', 'conditional_expression'
    ];
    
    return controlTypes.includes(nodeType);
  }

  /**
   * Detect code patterns
   */
  private detectPatterns(symbols: SymbolInfo[]): string[] {
    const patterns: string[] = [];

    // Detect common patterns
    const classes = symbols.filter(s => s.type === 'class');
    const functions = symbols.filter(s => s.type === 'function');
    const methods = symbols.filter(s => s.type === 'method');

    if (classes.length > 0 && methods.length > functions.length) {
      patterns.push('object-oriented');
    }

    if (functions.length > classes.length * 2) {
      patterns.push('functional');
    }

    const imports = symbols.filter(s => s.type === 'import');
    if (imports.length > 5) {
      patterns.push('modular');
    }

    return patterns;
  }

  /**
   * Count nodes in tree
   */
  private countNodes(node: MockNode): number {
    let count = 1;

    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }

    return count;
  }

  /**
   * Convert Tree-sitter node to mock node format for compatibility
   */
  private convertNodeToMockNode(node: Parser.SyntaxNode): MockNode {
    const children = node.children.map(child => this.convertNodeToMockNode(child));
    
    return {
      type: node.type,
      name: this.extractNodeName(node),
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      endPosition: {
        row: node.endPosition.row,
        column: node.endPosition.column
      },
      text: node.text,
      children
    };
  }
  
  /**
   * Extract meaningful name from syntax node
   */
  private extractNodeName(node: Parser.SyntaxNode): string {
    // Try to find identifier child for named nodes
    const identifierChild = node.children.find(child => 
      child.type === 'identifier' || 
      child.type === 'property_identifier' ||
      child.type === 'type_identifier'
    );
    
    if (identifierChild) {
      return identifierChild.text;
    }
    
    // For certain node types, look for specific patterns
    if (node.type === 'function_declaration' || node.type === 'method_definition') {
      const nameChild = node.children.find(child => child.type === 'identifier');
      return nameChild?.text || 'anonymous';
    }
    
    if (node.type === 'class_declaration') {
      const nameChild = node.children.find(child => child.type === 'type_identifier' || child.type === 'identifier');
      return nameChild?.text || 'anonymous';
    }
    
    // Default to node type or first few characters
    return node.text.split('\\n')[0].substring(0, 50) || node.type;
  }

  /**
   * Extract symbols from real Tree-sitter tree
   */
  private extractSymbolsFromTree(tree: Parser.Tree, language: SupportedLanguage, content: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    
    const extractFromNode = (node: Parser.SyntaxNode, parentScope?: string): void => {
      const nodeType = this.mapNodeTypeToSymbolType(node.type);
      
      if (nodeType) {
        const symbolId = uuidv4();
        const nodeName = this.extractNodeName(node);
        
        const symbol: SymbolInfo = {
          id: symbolId,
          name: nodeName,
          type: nodeType,
          kind: this.getSymbolKind(nodeType),
          range: {
            start: {
              line: node.startPosition.row,
              character: node.startPosition.column
            },
            end: {
              line: node.endPosition.row,
              character: node.endPosition.column
            }
          },
          uri: '', // Will be set by caller
          scope: parentScope,
          references: [],
          metadata: {
            content: node.text.substring(0, 200), // Limit content size
            nodeType: node.type,
            hasChildren: node.childCount > 0,
            isNamed: node.isNamed
          }
        };

        symbols.push(symbol);
        
        // Extract from children
        const childScope = (nodeType === 'class' || nodeType === 'function') ? nodeName : parentScope;
        for (let i = 0; i < node.childCount; i++) {
          extractFromNode(node.child(i)!, childScope);
        }
      } else {
        // Still traverse children even if current node is not a symbol
        for (let i = 0; i < node.childCount; i++) {
          extractFromNode(node.child(i)!, parentScope);
        }
      }
    };

    extractFromNode(tree.rootNode);
    
    return symbols;
  }

  /**
   * Analyze Tree-sitter tree structure
   */
  private analyzeTreeStructure(tree: Parser.Tree, symbols: SymbolInfo[]): CodeStructure {
    const structure: CodeStructure = {
      depth: this.calculateTreeDepth(tree.rootNode),
      complexity: this.estimateTreeComplexity(tree.rootNode),
      patterns: this.detectPatterns(symbols),
      metrics: {
        nodeCount: tree.rootNode.descendantCount,
        functionCount: symbols.filter(s => s.type === 'function' || s.type === 'method').length,
        classCount: symbols.filter(s => s.type === 'class').length,
        variableCount: symbols.filter(s => s.type === 'variable').length
      }
    };

    return structure;
  }

  /**
   * Calculate Tree-sitter AST depth
   */
  private calculateTreeDepth(node: Parser.SyntaxNode): number {
    if (node.childCount === 0) {
      return 1;
    }

    let maxChildDepth = 0;
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        const childDepth = this.calculateTreeDepth(child);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }

    return 1 + maxChildDepth;
  }

  /**
   * Estimate complexity using Tree-sitter
   */
  private estimateTreeComplexity(node: Parser.SyntaxNode): number {
    let complexity = 1;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        complexity += this.estimateTreeComplexity(child);
        
        // Add complexity for control structures
        if (this.isControlStructure(child.type)) {
          complexity += 1;
        }
      }
    }

    return complexity;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.languages.keys());
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: SupportedLanguage): boolean {
    return this.languages.has(language);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup parser resources
      this.languages.clear();
      
      logger.info('TreeSitterParser cleanup completed');
      
    } catch (error) {
      logger.error('Error during TreeSitterParser cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// ==================== INTERFACES ====================

interface ParseResult {
  language: SupportedLanguage;
  tree: MockTree;
  symbols: SymbolInfo[];
  structure: CodeStructure;
  parseTime: number;
}

interface MockTree {
  rootNode: MockNode;
  language: SupportedLanguage;
}

interface MockNode {
  type: string;
  name: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  text: string;
  children: MockNode[];
}

interface CodeStructure {
  depth: number;
  complexity: number;
  patterns: string[];
  metrics: {
    nodeCount: number;
    functionCount: number;
    classCount: number;
    variableCount: number;
  };
}"