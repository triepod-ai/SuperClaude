import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { logger, ProcessManager } from '@superclaude/shared';
import {
  Task,
  TaskComplexity,
  TaskPriority,
  CreateTaskInput
} from '../types/index.js';

/**
 * Language Server Protocol integration for semantic code awareness
 */

/**
 * Supported programming languages
 */
export enum SupportedLanguage {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  JAVA = 'java',
  GO = 'go',
  RUST = 'rust',
  CPP = 'cpp',
  CSHARP = 'csharp',
  PHP = 'php',
  RUBY = 'ruby'
}

/**
 * Code element types
 */
export enum CodeElementType {
  FILE = 'file',
  CLASS = 'class',
  INTERFACE = 'interface',
  METHOD = 'method',
  FUNCTION = 'function',
  VARIABLE = 'variable',
  CONSTANT = 'constant',
  ENUM = 'enum',
  MODULE = 'module',
  NAMESPACE = 'namespace',
  PROPERTY = 'property',
  CONSTRUCTOR = 'constructor'
}

/**
 * LSP server configuration
 */
export interface LSPServerConfig {
  language: SupportedLanguage;
  serverCommand: string;
  serverArgs: string[];
  rootPath: string;
  capabilities: {
    textDocument?: {
      completion?: boolean;
      hover?: boolean;
      signatureHelp?: boolean;
      definition?: boolean;
      references?: boolean;
      documentHighlight?: boolean;
      documentSymbol?: boolean;
      codeAction?: boolean;
      codeLens?: boolean;
      formatting?: boolean;
      rangeFormatting?: boolean;
      rename?: boolean;
    };
    workspace?: {
      symbol?: boolean;
      executeCommand?: boolean;
    };
  };
  initializationOptions?: Record<string, any>;
  settings?: Record<string, any>;
}

/**
 * Code symbol information
 */
export interface CodeSymbol {
  name: string;
  kind: CodeElementType;
  location: {
    uri: string;
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  };
  containerName?: string;
  detail?: string;
  documentation?: string;
  deprecated?: boolean;
  tags?: string[];
}

/**
 * Code analysis result
 */
export interface CodeAnalysis {
  file: string;
  language: SupportedLanguage;
  symbols: CodeSymbol[];
  dependencies: Array<{
    type: 'import' | 'reference' | 'inheritance' | 'composition';
    target: string;
    location: CodeSymbol['location'];
  }>;
  complexity: {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
  };
  issues: Array<{
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    location: CodeSymbol['location'];
    code?: string;
    source?: string;
  }>;
  metrics: {
    functions: number;
    classes: number;
    interfaces: number;
    testCoverage?: number;
    documentation?: number;
  };
}

/**
 * Code-aware task recommendation
 */
export interface CodeTaskRecommendation {
  id: string;
  type: 'refactoring' | 'testing' | 'documentation' | 'optimization' | 'bug_fix' | 'feature';
  title: string;
  description: string;
  priority: TaskPriority;
  complexity: TaskComplexity;
  estimatedHours: number;
  affectedFiles: string[];
  codeContext: {
    symbols: CodeSymbol[];
    dependencies: string[];
    relatedFiles: string[];
  };
  rationale: string;
  benefits: string[];
  risks: string[];
  prerequisites: string[];
  acceptanceCriteria: string[];
  generatedAt: Date;
}

/**
 * Impact analysis result
 */
export interface ImpactAnalysis {
  id: string;
  targetFile: string;
  proposedChanges: Array<{
    type: 'add' | 'modify' | 'delete' | 'move';
    element: CodeSymbol;
    description: string;
  }>;
  affectedFiles: Array<{
    file: string;
    reason: string;
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
    requiredChanges: string[];
  }>;
  breakingChanges: Array<{
    symbol: CodeSymbol;
    reason: string;
    mitigationStrategy: string;
  }>;
  testingRequirements: Array<{
    type: 'unit' | 'integration' | 'e2e';
    scope: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  estimatedEffort: {
    development: number;
    testing: number;
    documentation: number;
    total: number;
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigation: string[];
  };
  analyzedAt: Date;
}

/**
 * Code search result
 */
export interface CodeSearchResult {
  symbol: CodeSymbol;
  file: string;
  relevanceScore: number;
  context: {
    before: string[];
    after: string[];
  };
  usages: Array<{
    file: string;
    location: CodeSymbol['location'];
    context: string;
  }>;
}

/**
 * LSP client for managing language server connections
 */
class LSPClient extends EventEmitter {
  private serverProcess: any = null;
  private messageQueue: any[] = [];
  private pendingRequests: Map<string, any> = new Map();
  private isInitialized: boolean = false;
  private requestId: number = 1;
  
  constructor(private config: LSPServerConfig, private processManager: ProcessManager) {
    super();
  }
  
  async start(): Promise<void> {
    try {
      // Start LSP server process
      const { spawn } = await import('child_process');
      this.serverProcess = spawn(this.config.serverCommand, this.config.serverArgs, {
        cwd: this.config.rootPath,
        stdio: 'pipe'
      });
      
      // Register with process manager
      this.processManager.registerProcess(
        `lsp_${this.config.language}`,
        this.serverProcess,
        {
          autoRestart: true,
          maxRestarts: 3,
          timeout: 30000
        }
      );
      
      // Setup message handling
      this.setupMessageHandling();
      
      // Initialize the language server
      await this.initialize();
      
      this.emit('started', { language: this.config.language });
      
      logger.info('LSP client started', { language: this.config.language });
      
    } catch (error) {
      logger.error('Failed to start LSP client', { 
        language: this.config.language, 
        error: error.message 
      });
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (this.serverProcess) {
      // Send shutdown request
      await this.sendRequest('shutdown', {});
      
      // Send exit notification
      this.sendNotification('exit', {});
      
      // Terminate process
      this.serverProcess.kill();
      this.serverProcess = null;
      this.isInitialized = false;
      
      this.emit('stopped', { language: this.config.language });
      
      logger.info('LSP client stopped', { language: this.config.language });
    }
  }
  
  private setupMessageHandling(): void {
    if (!this.serverProcess) return;
    
    let buffer = '';
    
    this.serverProcess.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();
      
      while (true) {
        const contentLengthMatch = buffer.match(/Content-Length: (\d+)\r?\n/);
        if (!contentLengthMatch) break;
        
        const contentLength = parseInt(contentLengthMatch[1]);
        const headerEnd = buffer.indexOf('\r\n\r\n');
        
        if (headerEnd === -1) break;
        
        const messageStart = headerEnd + 4;
        if (buffer.length < messageStart + contentLength) break;
        
        const messageContent = buffer.slice(messageStart, messageStart + contentLength);
        buffer = buffer.slice(messageStart + contentLength);
        
        try {
          const message = JSON.parse(messageContent);
          this.handleMessage(message);
        } catch (error) {
          logger.error('Failed to parse LSP message', { error: error.message });
        }
      }
    });
    
    this.serverProcess.stderr.on('data', (data: Buffer) => {
      logger.warn('LSP server stderr', { 
        language: this.config.language, 
        data: data.toString() 
      });
    });
    
    this.serverProcess.on('error', (error: Error) => {
      logger.error('LSP server process error', { 
        language: this.config.language, 
        error: error.message 
      });
      this.emit('error', error);
    });
    
    this.serverProcess.on('exit', (code: number) => {
      logger.info('LSP server process exited', { 
        language: this.config.language, 
        code 
      });
      this.emit('exit', { code });
    });
  }
  
  private handleMessage(message: any): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      // Response to a request
      const request = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        request.reject(new Error(message.error.message));
      } else {
        request.resolve(message.result);
      }
    } else if (message.method) {
      // Notification or request from server
      this.emit('message', message);
    }
  }
  
  private async initialize(): Promise<void> {
    const initializeParams = {
      processId: process.pid,
      rootPath: this.config.rootPath,
      rootUri: `file://${this.config.rootPath}`,
      capabilities: this.config.capabilities,
      initializationOptions: this.config.initializationOptions
    };
    
    const result = await this.sendRequest('initialize', initializeParams);
    
    // Send initialized notification
    this.sendNotification('initialized', {});
    
    this.isInitialized = true;
    
    logger.debug('LSP client initialized', { 
      language: this.config.language,
      capabilities: result.capabilities 
    });
  }
  
  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };
      
      this.pendingRequests.set(id.toString(), { resolve, reject });
      this.sendMessage(request);
    });
  }
  
  private sendNotification(method: string, params: any): void {
    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };
    
    this.sendMessage(notification);
  }
  
  private sendMessage(message: any): void {
    if (!this.serverProcess) return;
    
    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    
    this.serverProcess.stdin.write(header + content);
  }
  
  // LSP methods
  async getDocumentSymbols(uri: string): Promise<CodeSymbol[]> {
    if (!this.isInitialized) return [];
    
    try {
      const symbols = await this.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri }
      });
      
      return this.convertToCodeSymbols(symbols || []);
    } catch (error) {
      logger.error('Failed to get document symbols', { uri, error: error.message });
      return [];
    }
  }
  
  async getWorkspaceSymbols(query: string): Promise<CodeSymbol[]> {
    if (!this.isInitialized) return [];
    
    try {
      const symbols = await this.sendRequest('workspace/symbol', { query });
      
      return this.convertToCodeSymbols(symbols || []);
    } catch (error) {
      logger.error('Failed to get workspace symbols', { query, error: error.message });
      return [];
    }
  }
  
  async getReferences(uri: string, line: number, character: number): Promise<CodeSymbol[]> {
    if (!this.isInitialized) return [];
    
    try {
      const references = await this.sendRequest('textDocument/references', {
        textDocument: { uri },
        position: { line, character },
        context: { includeDeclaration: true }
      });
      
      return this.convertToCodeSymbols(references || []);
    } catch (error) {
      logger.error('Failed to get references', { uri, error: error.message });
      return [];
    }
  }
  
  async getDefinition(uri: string, line: number, character: number): Promise<CodeSymbol[]> {
    if (!this.isInitialized) return [];
    
    try {
      const definition = await this.sendRequest('textDocument/definition', {
        textDocument: { uri },
        position: { line, character }
      });
      
      return this.convertToCodeSymbols(Array.isArray(definition) ? definition : [definition]);
    } catch (error) {
      logger.error('Failed to get definition', { uri, error: error.message });
      return [];
    }
  }
  
  private convertToCodeSymbols(lspSymbols: any[]): CodeSymbol[] {
    return lspSymbols.map(symbol => ({
      name: symbol.name,
      kind: this.convertSymbolKind(symbol.kind),
      location: {
        uri: symbol.location?.uri || symbol.uri,
        range: symbol.location?.range || symbol.range
      },
      containerName: symbol.containerName,
      detail: symbol.detail,
      documentation: typeof symbol.documentation === 'string' 
        ? symbol.documentation 
        : symbol.documentation?.value,
      deprecated: symbol.deprecated || symbol.tags?.includes(1), // LSP SymbolTag.Deprecated = 1
      tags: symbol.tags || []
    }));
  }
  
  private convertSymbolKind(lspKind: number): CodeElementType {
    const kindMap: Record<number, CodeElementType> = {
      1: CodeElementType.FILE,
      2: CodeElementType.MODULE,
      3: CodeElementType.NAMESPACE,
      4: CodeElementType.CLASS,
      5: CodeElementType.CLASS, // Package mapped to class
      6: CodeElementType.METHOD,
      7: CodeElementType.PROPERTY,
      8: CodeElementType.VARIABLE,
      9: CodeElementType.CONSTRUCTOR,
      10: CodeElementType.ENUM,
      11: CodeElementType.INTERFACE,
      12: CodeElementType.FUNCTION,
      13: CodeElementType.VARIABLE,
      14: CodeElementType.CONSTANT,
      15: CodeElementType.CONSTANT, // String mapped to constant
      16: CodeElementType.CONSTANT, // Number mapped to constant
      17: CodeElementType.CONSTANT, // Boolean mapped to constant
      18: CodeElementType.CONSTANT, // Array mapped to constant
    };
    
    return kindMap[lspKind] || CodeElementType.VARIABLE;
  }
}

/**
 * Main LSP integration manager
 */
export class LSPIntegration extends EventEmitter {
  private clients: Map<SupportedLanguage, LSPClient> = new Map();
  private processManager: ProcessManager;
  private codeAnalysisCache: Map<string, CodeAnalysis> = new Map();
  private symbolCache: Map<string, CodeSymbol[]> = new Map();
  private fileWatcher: any = null;
  
  constructor() {
    super();
    this.processManager = new ProcessManager();
    this.setupFileWatching();
    
    logger.info('LSPIntegration initialized');
  }
  
  /**
   * Register and start LSP server for a language
   */
  async registerLanguageServer(config: LSPServerConfig): Promise<void> {
    try {
      const client = new LSPClient(config, this.processManager);
      
      // Setup event forwarding
      client.on('started', (data) => {
        this.emit('language_server_started', { language: config.language, ...data });
      });
      
      client.on('error', (error) => {
        this.emit('language_server_error', { language: config.language, error });
      });
      
      client.on('exit', (data) => {
        this.emit('language_server_exit', { language: config.language, ...data });
        // Remove from clients map
        this.clients.delete(config.language);
      });
      
      await client.start();
      this.clients.set(config.language, client);
      
      logger.info('Language server registered', { language: config.language });
      
    } catch (error) {
      logger.error('Failed to register language server', { 
        language: config.language, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Analyze code file and extract semantic information
   */
  async analyzeCodeFile(filePath: string, language?: SupportedLanguage): Promise<CodeAnalysis> {
    try {
      // Check cache first
      const cacheKey = `${filePath}_${Date.now()}`;
      if (this.codeAnalysisCache.has(cacheKey)) {
        return this.codeAnalysisCache.get(cacheKey)!;
      }
      
      // Detect language if not provided
      if (!language) {
        language = this.detectLanguage(filePath);
      }
      
      const client = this.clients.get(language);
      if (!client) {
        throw new Error(`No LSP client available for ${language}`);
      }
      
      const uri = `file://${path.resolve(filePath)}`;
      
      // Get document symbols
      const symbols = await client.getDocumentSymbols(uri);
      
      // Analyze file content
      const fileContent = await this.readFile(filePath);
      const complexity = this.analyzeComplexity(fileContent, language);
      const dependencies = await this.extractDependencies(filePath, symbols, client);
      const issues = await this.validateCode(filePath, client);
      const metrics = this.calculateMetrics(symbols, fileContent);
      
      const analysis: CodeAnalysis = {
        file: filePath,
        language,
        symbols,
        dependencies,
        complexity,
        issues,
        metrics
      };
      
      // Cache the result
      this.codeAnalysisCache.set(cacheKey, analysis);
      
      this.emit('code_analyzed', { file: filePath, language, symbolCount: symbols.length });
      
      logger.debug('Code file analyzed', { 
        file: filePath, 
        language, 
        symbols: symbols.length,
        complexity: complexity.cyclomaticComplexity
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('Code analysis failed', { file: filePath, error: error.message });
      throw error;
    }
  }
  
  /**
   * Generate code-aware task recommendations
   */
  async generateCodeTasks(
    filePaths: string[], 
    context: { projectType?: string; constraints?: string[] } = {}
  ): Promise<CodeTaskRecommendation[]> {
    const recommendations: CodeTaskRecommendation[] = [];
    
    try {
      for (const filePath of filePaths) {
        const analysis = await this.analyzeCodeFile(filePath);
        
        // Generate refactoring tasks
        recommendations.push(...await this.generateRefactoringTasks(analysis, context));
        
        // Generate testing tasks
        recommendations.push(...await this.generateTestingTasks(analysis, context));
        
        // Generate documentation tasks
        recommendations.push(...await this.generateDocumentationTasks(analysis, context));
        
        // Generate optimization tasks
        recommendations.push(...await this.generateOptimizationTasks(analysis, context));
        
        // Generate bug fix tasks (based on static analysis)
        recommendations.push(...await this.generateBugFixTasks(analysis, context));
      }
      
      // Sort by priority and complexity
      recommendations.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      this.emit('code_tasks_generated', { 
        fileCount: filePaths.length, 
        taskCount: recommendations.length 
      });
      
      logger.info('Code-aware tasks generated', { 
        files: filePaths.length, 
        tasks: recommendations.length 
      });
      
      return recommendations;
      
    } catch (error) {
      logger.error('Code task generation failed', { error: error.message });
      return [];
    }
  }
  
  /**
   * Perform impact analysis for proposed changes
   */
  async analyzeImpact(
    targetFile: string, 
    proposedChanges: Array<{ type: string; element: string; description: string }>
  ): Promise<ImpactAnalysis> {
    try {
      const analysis = await this.analyzeCodeFile(targetFile);
      const language = analysis.language;
      const client = this.clients.get(language);
      
      if (!client) {
        throw new Error(`No LSP client available for ${language}`);
      }
      
      const affectedFiles: ImpactAnalysis['affectedFiles'] = [];
      const breakingChanges: ImpactAnalysis['breakingChanges'] = [];
      const testingRequirements: ImpactAnalysis['testingRequirements'] = [];
      
      // Analyze each proposed change
      for (const change of proposedChanges) {
        const symbol = analysis.symbols.find(s => s.name === change.element);
        if (!symbol) continue;
        
        // Find references to this symbol
        const references = await client.getReferences(
          symbol.location.uri,
          symbol.location.range.start.line,
          symbol.location.range.start.character
        );
        
        // Analyze impact on each referencing file
        for (const ref of references) {
          const refFile = this.uriToPath(ref.location.uri);
          if (refFile === targetFile) continue; // Skip self-references
          
          const existing = affectedFiles.find(af => af.file === refFile);
          if (!existing) {
            const impactLevel = this.assessImpactLevel(change, symbol, ref);
            const requiredChanges = this.determineRequiredChanges(change, symbol, ref);
            
            affectedFiles.push({
              file: refFile,
              reason: `References ${symbol.name} which will be ${change.type}d`,
              impactLevel,
              requiredChanges
            });
          }
        }
        
        // Check for breaking changes
        if (this.isBreakingChange(change, symbol)) {
          breakingChanges.push({
            symbol,
            reason: `${change.type} of ${symbol.name} may break existing API`,
            mitigationStrategy: this.suggestMitigation(change, symbol)
          });
        }
        
        // Determine testing requirements
        testingRequirements.push(...this.determineTestingRequirements(change, symbol, analysis));
      }
      
      // Calculate effort estimates
      const estimatedEffort = this.calculateEffortEstimate(
        proposedChanges,
        affectedFiles,
        testingRequirements
      );
      
      // Assess risk
      const riskAssessment = this.assessRisk(proposedChanges, breakingChanges, affectedFiles);
      
      const impactAnalysis: ImpactAnalysis = {
        id: uuidv4(),
        targetFile,
        proposedChanges: proposedChanges.map(change => ({
          type: change.type as any,
          element: analysis.symbols.find(s => s.name === change.element)!,
          description: change.description
        })),
        affectedFiles,
        breakingChanges,
        testingRequirements,
        estimatedEffort,
        riskAssessment,
        analyzedAt: new Date()
      };
      
      this.emit('impact_analyzed', { 
        targetFile, 
        affectedFiles: affectedFiles.length,
        breakingChanges: breakingChanges.length
      });
      
      logger.info('Impact analysis completed', { 
        targetFile, 
        affectedFiles: affectedFiles.length,
        riskLevel: riskAssessment.level
      });
      
      return impactAnalysis;
      
    } catch (error) {
      logger.error('Impact analysis failed', { targetFile, error: error.message });
      throw error;
    }
  }
  
  /**
   * Search for code symbols across the workspace
   */
  async searchCodeSymbols(
    query: string, 
    language?: SupportedLanguage,
    filters: { 
      kind?: CodeElementType[]; 
      files?: string[]; 
      includeReferences?: boolean 
    } = {}
  ): Promise<CodeSearchResult[]> {
    const results: CodeSearchResult[] = [];
    
    try {
      const clients = language ? [this.clients.get(language)] : Array.from(this.clients.values());
      
      for (const client of clients) {
        if (!client) continue;
        
        const symbols = await client.getWorkspaceSymbols(query);
        
        for (const symbol of symbols) {
          // Apply filters
          if (filters.kind && !filters.kind.includes(symbol.kind)) continue;
          if (filters.files && !filters.files.some(f => symbol.location.uri.includes(f))) continue;
          
          const file = this.uriToPath(symbol.location.uri);
          const context = await this.getSymbolContext(symbol);
          
          let usages: CodeSearchResult['usages'] = [];
          if (filters.includeReferences) {
            const references = await client.getReferences(
              symbol.location.uri,
              symbol.location.range.start.line,
              symbol.location.range.start.character
            );
            
            usages = references.map(ref => ({
              file: this.uriToPath(ref.location.uri),
              location: ref.location,
              context: '' // Would need to read file content for context
            }));
          }
          
          const relevanceScore = this.calculateRelevanceScore(query, symbol);
          
          results.push({
            symbol,
            file,
            relevanceScore,
            context,
            usages
          });
        }
      }
      
      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      this.emit('symbols_searched', { query, resultCount: results.length });
      
      logger.debug('Code symbols searched', { query, results: results.length });
      
      return results;
      
    } catch (error) {
      logger.error('Code symbol search failed', { query, error: error.message });
      return [];
    }
  }
  
  /**
   * Convert code analysis to task
   */
  convertAnalysisToTask(recommendation: CodeTaskRecommendation): CreateTaskInput {
    return {
      title: recommendation.title,
      description: recommendation.description,
      priority: recommendation.priority,
      complexity: recommendation.complexity,
      estimatedHours: recommendation.estimatedHours,
      tags: [
        recommendation.type,
        `language:${recommendation.codeContext.symbols[0]?.location.uri.split('.').pop()}`,
        'code-generated'
      ],
      metadata: {
        type: 'code_task',
        generatedFrom: 'lsp_analysis',
        affectedFiles: recommendation.affectedFiles,
        codeContext: recommendation.codeContext,
        rationale: recommendation.rationale,
        benefits: recommendation.benefits,
        risks: recommendation.risks,
        prerequisites: recommendation.prerequisites,
        acceptanceCriteria: recommendation.acceptanceCriteria
      }
    };
  }
  
  /**
   * Helper methods
   */
  private detectLanguage(filePath: string): SupportedLanguage {
    const ext = path.extname(filePath).toLowerCase();
    
    const extensionMap: Record<string, SupportedLanguage> = {
      '.ts': SupportedLanguage.TYPESCRIPT,
      '.tsx': SupportedLanguage.TYPESCRIPT,
      '.js': SupportedLanguage.JAVASCRIPT,
      '.jsx': SupportedLanguage.JAVASCRIPT,
      '.py': SupportedLanguage.PYTHON,
      '.java': SupportedLanguage.JAVA,
      '.go': SupportedLanguage.GO,
      '.rs': SupportedLanguage.RUST,
      '.cpp': SupportedLanguage.CPP,
      '.cc': SupportedLanguage.CPP,
      '.cxx': SupportedLanguage.CPP,
      '.cs': SupportedLanguage.CSHARP,
      '.php': SupportedLanguage.PHP,
      '.rb': SupportedLanguage.RUBY
    };
    
    return extensionMap[ext] || SupportedLanguage.JAVASCRIPT;
  }
  
  private async readFile(filePath: string): Promise<string> {
    try {
      const fs = await import('fs/promises');
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      logger.error('Failed to read file', { filePath, error: error.message });
      return '';
    }
  }
  
  private analyzeComplexity(content: string, language: SupportedLanguage): CodeAnalysis['complexity'] {
    // Simplified complexity analysis
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(content);
    const cognitiveComplexity = this.calculateCognitiveComplexity(content);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(lines.length, cyclomaticComplexity);
    
    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode: lines.length,
      maintainabilityIndex
    };
  }
  
  private calculateCyclomaticComplexity(content: string): number {
    // Count decision points (if, for, while, case, etc.)
    const decisionPoints = (content.match(/\b(if|for|while|case|catch|&&|\|\|)\b/g) || []).length;
    return decisionPoints + 1; // Base complexity of 1
  }
  
  private calculateCognitiveComplexity(content: string): number {
    // Simplified cognitive complexity calculation
    // This would be more sophisticated in a real implementation
    const nestingKeywords = (content.match(/\b(if|for|while|try|switch)\b/g) || []).length;
    const logicalOperators = (content.match(/(&&|\|\|)/g) || []).length;
    
    return nestingKeywords + logicalOperators * 0.5;
  }
  
  private calculateMaintainabilityIndex(loc: number, complexity: number): number {
    // Simplified maintainability index calculation
    // Real calculation would include Halstead metrics
    const volume = Math.log2(loc) * 10;
    const effort = complexity * volume;
    
    return Math.max(0, 171 - 5.2 * Math.log(volume) - 0.23 * complexity - 16.2 * Math.log(loc));
  }
  
  private async extractDependencies(
    filePath: string, 
    symbols: CodeSymbol[], 
    client: LSPClient
  ): Promise<CodeAnalysis['dependencies']> {
    const dependencies: CodeAnalysis['dependencies'] = [];
    
    // This would analyze import statements and symbol references
    // For now, return empty array as it requires more complex analysis
    
    return dependencies;
  }
  
  private async validateCode(filePath: string, client: LSPClient): Promise<CodeAnalysis['issues']> {
    // This would integrate with language-specific linters and validators
    // For now, return empty array
    return [];
  }
  
  private calculateMetrics(symbols: CodeSymbol[], content: string): CodeAnalysis['metrics'] {
    const functions = symbols.filter(s => s.kind === CodeElementType.FUNCTION || s.kind === CodeElementType.METHOD).length;
    const classes = symbols.filter(s => s.kind === CodeElementType.CLASS).length;
    const interfaces = symbols.filter(s => s.kind === CodeElementType.INTERFACE).length;
    
    return {
      functions,
      classes,
      interfaces,
      testCoverage: undefined, // Would need test coverage data
      documentation: undefined // Would need documentation analysis
    };
  }
  
  private async generateRefactoringTasks(
    analysis: CodeAnalysis, 
    context: any
  ): Promise<CodeTaskRecommendation[]> {
    const tasks: CodeTaskRecommendation[] = [];
    
    // Check for high complexity functions
    if (analysis.complexity.cyclomaticComplexity > 10) {
      tasks.push({
        id: uuidv4(),
        type: 'refactoring',
        title: `Refactor high complexity code in ${path.basename(analysis.file)}`,
        description: `The file has a cyclomatic complexity of ${analysis.complexity.cyclomaticComplexity}, which exceeds the recommended threshold of 10. Consider breaking down complex functions into smaller, more manageable pieces.`,
        priority: TaskPriority.MEDIUM,
        complexity: TaskComplexity.MODERATE,
        estimatedHours: Math.ceil(analysis.complexity.cyclomaticComplexity / 5),
        affectedFiles: [analysis.file],
        codeContext: {
          symbols: analysis.symbols.filter(s => s.kind === CodeElementType.FUNCTION || s.kind === CodeElementType.METHOD),
          dependencies: [],
          relatedFiles: []
        },
        rationale: 'High complexity code is harder to understand, test, and maintain',
        benefits: ['Improved readability', 'Easier testing', 'Reduced bug risk'],
        risks: ['Potential for introducing bugs during refactoring'],
        prerequisites: ['Code review', 'Comprehensive test coverage'],
        acceptanceCriteria: [
          'Cyclomatic complexity below 10',
          'All existing tests pass',
          'No loss of functionality'
        ],
        generatedAt: new Date()
      });
    }
    
    return tasks;
  }
  
  private async generateTestingTasks(
    analysis: CodeAnalysis, 
    context: any
  ): Promise<CodeTaskRecommendation[]> {
    const tasks: CodeTaskRecommendation[] = [];
    
    // Generate test tasks for functions without tests
    const publicFunctions = analysis.symbols.filter(s => 
      (s.kind === CodeElementType.FUNCTION || s.kind === CodeElementType.METHOD) &&
      !s.name.startsWith('_') // Assuming private functions start with underscore
    );
    
    if (publicFunctions.length > 0) {
      tasks.push({
        id: uuidv4(),
        type: 'testing',
        title: `Add unit tests for ${path.basename(analysis.file)}`,
        description: `The file contains ${publicFunctions.length} public functions that may need test coverage. Ensure all public APIs are properly tested.`,
        priority: TaskPriority.HIGH,
        complexity: TaskComplexity.MODERATE,
        estimatedHours: publicFunctions.length * 0.5,
        affectedFiles: [analysis.file],
        codeContext: {
          symbols: publicFunctions,
          dependencies: [],
          relatedFiles: []
        },
        rationale: 'Comprehensive test coverage ensures code reliability and prevents regressions',
        benefits: ['Improved code quality', 'Easier refactoring', 'Bug prevention'],
        risks: ['Time investment', 'Test maintenance overhead'],
        prerequisites: ['Understanding of existing functionality'],
        acceptanceCriteria: [
          'Unit tests for all public functions',
          'Test coverage above 80%',
          'All tests pass in CI/CD pipeline'
        ],
        generatedAt: new Date()
      });
    }
    
    return tasks;
  }
  
  private async generateDocumentationTasks(
    analysis: CodeAnalysis, 
    context: any
  ): Promise<CodeTaskRecommendation[]> {
    const tasks: CodeTaskRecommendation[] = [];
    
    // Find functions/classes without documentation
    const undocumentedSymbols = analysis.symbols.filter(s => 
      (s.kind === CodeElementType.FUNCTION || 
       s.kind === CodeElementType.METHOD || 
       s.kind === CodeElementType.CLASS) &&
      !s.documentation
    );
    
    if (undocumentedSymbols.length > 0) {
      tasks.push({
        id: uuidv4(),
        type: 'documentation',
        title: `Add documentation to ${path.basename(analysis.file)}`,
        description: `The file contains ${undocumentedSymbols.length} symbols without documentation. Add JSDoc/docstring comments to improve code maintainability.`,
        priority: TaskPriority.LOW,
        complexity: TaskComplexity.SIMPLE,
        estimatedHours: undocumentedSymbols.length * 0.25,
        affectedFiles: [analysis.file],
        codeContext: {
          symbols: undocumentedSymbols,
          dependencies: [],
          relatedFiles: []
        },
        rationale: 'Well-documented code improves team productivity and knowledge transfer',
        benefits: ['Better code understanding', 'Easier onboarding', 'API clarity'],
        risks: ['Documentation maintenance overhead'],
        prerequisites: ['Understanding of code functionality'],
        acceptanceCriteria: [
          'All public APIs documented',
          'Documentation follows team standards',
          'Examples provided for complex functions'
        ],
        generatedAt: new Date()
      });
    }
    
    return tasks;
  }
  
  private async generateOptimizationTasks(
    analysis: CodeAnalysis, 
    context: any
  ): Promise<CodeTaskRecommendation[]> {
    const tasks: CodeTaskRecommendation[] = [];
    
    // Check for potential optimization opportunities
    if (analysis.complexity.linesOfCode > 500) {
      tasks.push({
        id: uuidv4(),
        type: 'optimization',
        title: `Optimize large file ${path.basename(analysis.file)}`,
        description: `The file has ${analysis.complexity.linesOfCode} lines of code, which may indicate opportunities for optimization or splitting into smaller modules.`,
        priority: TaskPriority.LOW,
        complexity: TaskComplexity.COMPLEX,
        estimatedHours: 8,
        affectedFiles: [analysis.file],
        codeContext: {
          symbols: analysis.symbols,
          dependencies: [],
          relatedFiles: []
        },
        rationale: 'Large files are harder to navigate and maintain',
        benefits: ['Improved code organization', 'Better module separation', 'Easier maintenance'],
        risks: ['Breaking changes', 'Import/export complexity'],
        prerequisites: ['Thorough understanding of file structure'],
        acceptanceCriteria: [
          'File split into logical modules',
          'Maintained functionality',
          'Clear module boundaries'
        ],
        generatedAt: new Date()
      });
    }
    
    return tasks;
  }
  
  private async generateBugFixTasks(
    analysis: CodeAnalysis, 
    context: any
  ): Promise<CodeTaskRecommendation[]> {
    const tasks: CodeTaskRecommendation[] = [];
    
    // Generate tasks based on static analysis issues
    for (const issue of analysis.issues) {
      if (issue.severity === 'error') {
        tasks.push({
          id: uuidv4(),
          type: 'bug_fix',
          title: `Fix ${issue.severity}: ${issue.message}`,
          description: `Static analysis detected a ${issue.severity} in ${path.basename(analysis.file)}: ${issue.message}`,
          priority: issue.severity === 'error' ? TaskPriority.HIGH : TaskPriority.MEDIUM,
          complexity: TaskComplexity.SIMPLE,
          estimatedHours: 1,
          affectedFiles: [analysis.file],
          codeContext: {
            symbols: [],
            dependencies: [],
            relatedFiles: []
          },
          rationale: 'Static analysis issues can lead to runtime errors and unexpected behavior',
          benefits: ['Improved code reliability', 'Reduced bug risk'],
          risks: ['Minimal - fixing detected issues'],
          prerequisites: ['Understanding of the specific issue'],
          acceptanceCriteria: [
            'Static analysis issue resolved',
            'No new issues introduced',
            'Existing functionality preserved'
          ],
          generatedAt: new Date()
        });
      }
    }
    
    return tasks;
  }
  
  private uriToPath(uri: string): string {
    return uri.replace('file://', '');
  }
  
  private assessImpactLevel(change: any, symbol: CodeSymbol, reference: CodeSymbol): 'low' | 'medium' | 'high' | 'critical' {
    // Simple heuristic - would be more sophisticated in practice
    if (change.type === 'delete') return 'high';
    if (symbol.kind === CodeElementType.INTERFACE) return 'medium';
    return 'low';
  }
  
  private determineRequiredChanges(change: any, symbol: CodeSymbol, reference: CodeSymbol): string[] {
    // Determine what changes are needed in the referencing code
    return [`Update references to ${symbol.name}`];
  }
  
  private isBreakingChange(change: any, symbol: CodeSymbol): boolean {
    // Determine if the change would break the API
    return change.type === 'delete' || 
           (change.type === 'modify' && symbol.kind === CodeElementType.INTERFACE);
  }
  
  private suggestMitigation(change: any, symbol: CodeSymbol): string {
    if (change.type === 'delete') {
      return `Provide a migration path or deprecation notice for ${symbol.name}`;
    }
    return 'Ensure backward compatibility or provide clear migration instructions';
  }
  
  private determineTestingRequirements(
    change: any, 
    symbol: CodeSymbol, 
    analysis: CodeAnalysis
  ): ImpactAnalysis['testingRequirements'] {
    const requirements: ImpactAnalysis['testingRequirements'] = [];
    
    requirements.push({
      type: 'unit',
      scope: `${symbol.name} function/method`,
      priority: 'high'
    });
    
    if (symbol.kind === CodeElementType.CLASS || symbol.kind === CodeElementType.INTERFACE) {
      requirements.push({
        type: 'integration',
        scope: `Components using ${symbol.name}`,
        priority: 'medium'
      });
    }
    
    return requirements;
  }
  
  private calculateEffortEstimate(
    proposedChanges: any[],
    affectedFiles: ImpactAnalysis['affectedFiles'],
    testingRequirements: ImpactAnalysis['testingRequirements']
  ): ImpactAnalysis['estimatedEffort'] {
    const development = proposedChanges.length * 2 + affectedFiles.length * 1;
    const testing = testingRequirements.length * 1.5;
    const documentation = proposedChanges.length * 0.5;
    
    return {
      development,
      testing,
      documentation,
      total: development + testing + documentation
    };
  }
  
  private assessRisk(
    proposedChanges: any[],
    breakingChanges: ImpactAnalysis['breakingChanges'],
    affectedFiles: ImpactAnalysis['affectedFiles']
  ): ImpactAnalysis['riskAssessment'] {
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const factors: string[] = [];
    
    if (breakingChanges.length > 0) {
      level = 'high';
      factors.push('Breaking API changes detected');
    }
    
    if (affectedFiles.length > 10) {
      level = level === 'low' ? 'medium' : 'high';
      factors.push('Large number of affected files');
    }
    
    if (affectedFiles.some(f => f.impactLevel === 'critical')) {
      level = 'critical';
      factors.push('Critical components affected');
    }
    
    return {
      level,
      factors,
      mitigation: [
        'Comprehensive testing strategy',
        'Gradual rollout plan',
        'Rollback procedures'
      ]
    };
  }
  
  private async getSymbolContext(symbol: CodeSymbol): Promise<{ before: string[]; after: string[] }> {
    // Get context lines around the symbol
    // This would read the file and extract lines around the symbol location
    return { before: [], after: [] };
  }
  
  private calculateRelevanceScore(query: string, symbol: CodeSymbol): number {
    let score = 0;
    
    // Exact name match
    if (symbol.name.toLowerCase() === query.toLowerCase()) {
      score += 100;
    }
    // Name contains query
    else if (symbol.name.toLowerCase().includes(query.toLowerCase())) {
      score += 50;
    }
    
    // Documentation contains query
    if (symbol.documentation?.toLowerCase().includes(query.toLowerCase())) {
      score += 20;
    }
    
    return score;
  }
  
  private setupFileWatching(): void {
    // This would setup file system watching to invalidate caches
    // when source files change
  }
  
  /**
   * Get available language servers
   */
  getAvailableLanguages(): SupportedLanguage[] {
    return Array.from(this.clients.keys());
  }
  
  /**
   * Check if language server is available for a language
   */
  isLanguageSupported(language: SupportedLanguage): boolean {
    return this.clients.has(language);
  }
  
  /**
   * Get cached analysis for a file
   */
  getCachedAnalysis(filePath: string): CodeAnalysis | null {
    for (const [key, analysis] of this.codeAnalysisCache) {
      if (key.startsWith(filePath)) {
        return analysis;
      }
    }
    return null;
  }
  
  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.codeAnalysisCache.clear();
    this.symbolCache.clear();
    
    logger.debug('LSP integration cache cleared');
  }
  
  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    // Stop all language servers
    for (const client of this.clients.values()) {
      await client.stop();
    }
    
    this.clients.clear();
    this.clearCache();
    
    // Cleanup process manager
    await this.processManager.cleanup();
    
    // Stop file watching
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    
    this.removeAllListeners();
    
    logger.info('LSPIntegration cleanup completed');
  }
}