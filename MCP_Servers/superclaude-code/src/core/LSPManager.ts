import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { 
  createConnection,
  ProposedFeatures,
  InitializeParams,
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DocumentSymbolParams,
  ReferenceParams,
  CompletionParams,
  HoverParams
} from 'vscode-languageserver-protocol/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { logger } from '@superclaude/shared';
import {
  SupportedLanguage,
  LSPServerInfo,
  LSPConnectionStatus,
  SymbolInfo,
  SemanticAnalysisResult,
  LSPError
} from '../types/index.js';

// Import concurrency utilities from orchestrator
import { AsyncMutex, AtomicCounter, ThreadSafeMap, AtomicBoolean } from '../../superclaude-orchestrator/src/utils/concurrency.js';

/**
 * Language Server Protocol integration manager
 * Thread-safe with proper synchronization for document operations
 */
export class LSPManager extends EventEmitter {
  private servers: ThreadSafeMap<SupportedLanguage, LSPServer>;
  private documents: ThreadSafeMap<string, TextDocument>;
  private serverConfigs: ThreadSafeMap<SupportedLanguage, LSPServerConfig>;
  private documentMutex: AsyncMutex;
  private serverMutex: AsyncMutex;
  private analysisMutex: AsyncMutex;
  private cleanupMutex: AsyncMutex;
  private activeOperations: AtomicCounter;
  private isShuttingDown: AtomicBoolean;

  constructor() {
    super();
    this.servers = new ThreadSafeMap();
    this.documents = new ThreadSafeMap();
    this.serverConfigs = new ThreadSafeMap();
    this.documentMutex = new AsyncMutex();
    this.serverMutex = new AsyncMutex();
    this.analysisMutex = new AsyncMutex();
    this.cleanupMutex = new AsyncMutex();
    this.activeOperations = new AtomicCounter();
    this.isShuttingDown = new AtomicBoolean(false);
    
    this.initializeServerConfigs();
    logger.info('LSPManager initialized with thread safety');
  }

  /**
   * Initialize LSP server configurations with thread safety
   */
  private async initializeServerConfigs(): Promise<void> {
    // TypeScript/JavaScript server
    await this.serverConfigs.set('typescript', {
      command: 'typescript-language-server',
      args: ['--stdio'],
      capabilities: [
        'documentSymbolProvider',
        'referencesProvider',
        'completionProvider',
        'hoverProvider',
        'definitionProvider',
        'renameProvider',
        'codeActionProvider'
      ],
      initializationOptions: {
        preferences: {
          includeCompletionsForModuleExports: true,
          includeCompletionsWithInsertText: true
        }
      }
    });

    await this.serverConfigs.set('javascript', {
      command: 'typescript-language-server',
      args: ['--stdio'],
      capabilities: [
        'documentSymbolProvider',
        'referencesProvider',
        'completionProvider',
        'hoverProvider',
        'definitionProvider'
      ],
      initializationOptions: {
        preferences: {
          includeCompletionsForModuleExports: true
        }
      }
    });

    // Python server (Pylsp)
    await this.serverConfigs.set('python', {
      command: 'pylsp',
      args: [],
      capabilities: [
        'documentSymbolProvider',
        'referencesProvider',
        'completionProvider',
        'hoverProvider',
        'definitionProvider',
        'renameProvider'
      ],
      initializationOptions: {
        settings: {
          pylsp: {
            plugins: {
              pycodestyle: { enabled: true },
              pylint: { enabled: true },
              rope_completion: { enabled: true }
            }
          }
        }
      }
    });

    // Rust server (rust-analyzer)
    await this.serverConfigs.set('rust', {
      command: 'rust-analyzer',
      args: [],
      capabilities: [
        'documentSymbolProvider',
        'referencesProvider',
        'completionProvider',
        'hoverProvider',
        'definitionProvider',
        'renameProvider',
        'codeActionProvider'
      ],
      initializationOptions: {
        checkOnSave: {
          command: 'cargo check'
        }
      }
    });

    // Go server (gopls)
    await this.serverConfigs.set('go', {
      command: 'gopls',
      args: [],
      capabilities: [
        'documentSymbolProvider',
        'referencesProvider',
        'completionProvider',
        'hoverProvider',
        'definitionProvider',
        'renameProvider'
      ],
      initializationOptions: {}
    });

    logger.info('LSP server configurations initialized', {
      serverCount: this.serverConfigs.size
    });
  }

  /**
   * Start LSP server for language with thread safety
   */
  async startServer(language: SupportedLanguage, workspaceRoot: string): Promise<void> {
    if (this.isShuttingDown.get()) {
      throw new LSPError('LSPManager is shutting down', language);
    }

    const serverRelease = await this.serverMutex.acquire();
    await this.activeOperations.increment();
    
    try {
      const existingServer = await this.servers.get(language);
      if (existingServer) {
        logger.warn('LSP server already running', { language });
        return;
      }

      const config = await this.serverConfigs.get(language);
      if (!config) {
        throw new LSPError(`No LSP server configuration for language: ${language}`, language);
      }

      logger.info('Starting LSP server', { language, command: config.command });

      const server = new LSPServer(language, config, workspaceRoot);
      await server.start();

      await this.servers.set(language, server);

      // Setup event handlers
      server.on('initialized', () => {
        logger.info('LSP server initialized', { language });
        this.emit('server-initialized', language);
      });

      server.on('error', (error) => {
        logger.error('LSP server error', { language, error: error.message });
        this.emit('server-error', language, error);
      });

      server.on('disconnected', async () => {
        logger.warn('LSP server disconnected', { language });
        await this.servers.delete(language);
        this.emit('server-disconnected', language);
      });

    } catch (error) {
      logger.error('Failed to start LSP server', {
        language,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new LSPError(
        `Failed to start LSP server for ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        language
      );
    } finally {
      await this.activeOperations.decrement();
      serverRelease();
    }
  }

  /**
   * Stop LSP server for language with thread safety
   */
  async stopServer(language: SupportedLanguage): Promise<void> {
    const serverRelease = await this.serverMutex.acquire();
    
    try {
      const server = await this.servers.get(language);
      if (!server) {
        logger.warn('No LSP server running for language', { language });
        return;
      }

      await server.stop();
      await this.servers.delete(language);
      logger.info('LSP server stopped', { language });
    } catch (error) {
      logger.error('Error stopping LSP server', {
        language,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      serverRelease();
    }
  }

  /**
   * Open document in LSP server with thread safety
   */
  async openDocument(uri: string, languageId: string, content: string): Promise<void> {
    if (this.isShuttingDown.get()) {
      throw new LSPError('LSPManager is shutting down', this.mapLanguageId(languageId));
    }

    const documentRelease = await this.documentMutex.acquire();
    await this.activeOperations.increment();
    
    try {
      const language = this.mapLanguageId(languageId);
      const server = await this.servers.get(language);
      
      if (!server) {
        throw new LSPError(`No LSP server running for language: ${language}`, language);
      }

      // Check if document already exists
      const existingDocument = await this.documents.get(uri);
      if (existingDocument) {
        logger.warn('Document already open, updating content', { uri, language });
        await this.updateDocument(uri, content);
        return;
      }

      // Create text document
      const document = TextDocument.create(uri, languageId, 1, content);
      await this.documents.set(uri, document);

      // Send to LSP server
      await server.openDocument(document);
      
      logger.debug('Document opened', { uri, language });
      this.emit('document-opened', { uri, language });
      
    } catch (error) {
      logger.error('Failed to open document', {
        uri,
        languageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      await this.activeOperations.decrement();
      documentRelease();
    }
  }

  /**
   * Update document content with thread safety
   */
  async updateDocument(uri: string, content: string, version?: number): Promise<void> {
    const documentRelease = await this.documentMutex.acquire();
    await this.activeOperations.increment();
    
    try {
      const document = await this.documents.get(uri);
      if (!document) {
        throw new Error(`Document not found: ${uri}`);
      }

      const language = this.mapLanguageId(document.languageId);
      const server = await this.servers.get(language);
      
      if (!server) {
        throw new LSPError(`No LSP server running for language: ${language}`, language);
      }

      // Update document atomically
      const updatedDocument = TextDocument.update(document, [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: document.lineCount, character: 0 }
          },
          text: content
        }
      ], version || document.version + 1);

      await this.documents.set(uri, updatedDocument);

      // Send to LSP server
      await server.updateDocument(updatedDocument, content);
      
      logger.debug('Document updated', { uri, version: updatedDocument.version });
      this.emit('document-updated', { uri, version: updatedDocument.version });
      
    } catch (error) {
      logger.error('Failed to update document', {
        uri,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      await this.activeOperations.decrement();
      documentRelease();
    }
  }

  /**
   * Close document with thread safety
   */
  async closeDocument(uri: string): Promise<void> {
    const documentRelease = await this.documentMutex.acquire();
    
    try {
      const document = await this.documents.get(uri);
      if (!document) {
        logger.warn('Document not found for closing', { uri });
        return;
      }

      const language = this.mapLanguageId(document.languageId);
      const server = await this.servers.get(language);
      
      if (server) {
        await server.closeDocument(document);
      }

      await this.documents.delete(uri);
      logger.debug('Document closed', { uri });
      this.emit('document-closed', { uri });
      
    } catch (error) {
      logger.error('Failed to close document', {
        uri,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      documentRelease();
    }
  }

  /**
   * Get document symbols with thread safety
   */
  async getDocumentSymbols(uri: string): Promise<SymbolInfo[]> {
    const analysisRelease = await this.analysisMutex.acquire();
    await this.activeOperations.increment();
    
    try {
      const document = await this.documents.get(uri);
      if (!document) {
        throw new Error(`Document not found: ${uri}`);
      }

      const language = this.mapLanguageId(document.languageId);
      const server = await this.servers.get(language);
      
      if (!server) {
        throw new LSPError(`No LSP server running for language: ${language}`, language);
      }

      const symbols = await server.getDocumentSymbols(document);
      return this.convertLSPSymbols(symbols, uri);
      
    } catch (error) {
      logger.error('Error getting document symbols', {
        uri,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      await this.activeOperations.decrement();
      analysisRelease();
    }
  }

  /**
   * Find references to symbol with thread safety
   */
  async findReferences(uri: string, line: number, character: number): Promise<SymbolInfo[]> {
    const analysisRelease = await this.analysisMutex.acquire();
    await this.activeOperations.increment();
    
    try {
      const document = await this.documents.get(uri);
      if (!document) {
        throw new Error(`Document not found: ${uri}`);
      }

      const language = this.mapLanguageId(document.languageId);
      const server = await this.servers.get(language);
      
      if (!server) {
        throw new LSPError(`No LSP server running for language: ${language}`, language);
      }

      const references = await server.findReferences(document, line, character);
      return this.convertLSPReferences(references);
      
    } catch (error) {
      logger.error('Error finding references', {
        uri, line, character,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      await this.activeOperations.decrement();
      analysisRelease();
    }
  }

  /**
   * Get semantic analysis with comprehensive thread safety
   */
  async getSemanticAnalysis(uri: string): Promise<SemanticAnalysisResult> {
    const analysisRelease = await this.analysisMutex.acquire();
    await this.activeOperations.increment();
    
    try {
      const document = await this.documents.get(uri);
      if (!document) {
        throw new Error(`Document not found: ${uri}`);
      }

      const language = this.mapLanguageId(document.languageId);
      const server = await this.servers.get(language);
      
      if (!server) {
        throw new LSPError(`No LSP server running for language: ${language}`, language);
      }

      const startTime = Date.now();
      
      // Get symbols and references in parallel for better performance
      const [symbols, semanticTokens] = await Promise.all([
        server.getDocumentSymbols(document),
        server.getSemanticTokens?.(document) || Promise.resolve([])
      ]);

      // Build symbol table atomically
      const symbolTable: Record<string, SymbolInfo> = {};
      const convertedSymbols = this.convertLSPSymbols(symbols, uri);
      
      for (const symbol of convertedSymbols) {
        symbolTable[symbol.id] = symbol;
      }

      // Build cross-references (simplified but thread-safe)
      const crossReferences = await this.buildCrossReferences(convertedSymbols, document, server);

      // Build scopes
      const scopes = this.buildScopes(convertedSymbols);

      const analysisTime = Date.now() - startTime;

      return {
        uri,
        tokens: semanticTokens,
        symbolTable,
        crossReferences,
        scopes,
        analysisTime
      };

    } catch (error) {
      logger.error('Error getting semantic analysis', {
        uri,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      await this.activeOperations.decrement();
      analysisRelease();
    }
  }

  /**
   * Get server status with thread safety
   */
  async getServerStatus(): Promise<LSPServerInfo[]> {
    const status: LSPServerInfo[] = [];
    const configEntries = await this.serverConfigs.entries();

    for (const [language, config] of configEntries) {
      const server = await this.servers.get(language);
      const info: LSPServerInfo = {
        language,
        name: config.command,
        status: server ? 'connected' : 'disconnected',
        capabilities: config.capabilities,
        lastActivity: server?.getLastActivity(),
        errorCount: server?.getErrorCount() || 0
      };
      status.push(info);
    }

    return status;
  }

  /**
   * Get manager statistics
   */
  getManagerStats(): {
    activeServers: number;
    openDocuments: number;
    activeOperations: number;
    isShuttingDown: boolean;
  } {
    return {
      activeServers: this.servers.size,
      openDocuments: this.documents.size,
      activeOperations: this.activeOperations.get(),
      isShuttingDown: this.isShuttingDown.get()
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Map language ID to supported language
   */
  private mapLanguageId(languageId: string): SupportedLanguage {
    const mapping: Record<string, SupportedLanguage> = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'python': 'python',
      'rust': 'rust',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'cpp',
      'csharp': 'csharp'
    };

    const mapped = mapping[languageId];
    if (!mapped) {
      throw new Error(`Unsupported language: ${languageId}`);
    }

    return mapped;
  }

  /**
   * Convert LSP symbols to our format
   */
  private convertLSPSymbols(symbols: any[], uri: string): SymbolInfo[] {
    const converted: SymbolInfo[] = [];

    const processSymbol = (symbol: any, parentName?: string): void => {
      const symbolId = `${uri}:${symbol.name}:${symbol.range.start.line}`;
      
      const symbolInfo: SymbolInfo = {
        id: symbolId,
        name: symbol.name,
        type: this.mapSymbolKindToType(symbol.kind),
        kind: symbol.kind,
        range: symbol.range,
        uri,
        detail: symbol.detail,
        documentation: typeof symbol.documentation === 'string' ? symbol.documentation : undefined,
        scope: parentName,
        references: [],
        metadata: {
          deprecated: symbol.deprecated,
          tags: symbol.tags
        }
      };

      converted.push(symbolInfo);

      // Process nested symbols
      if (symbol.children) {
        for (const child of symbol.children) {
          processSymbol(child, symbol.name);
        }
      }
    };

    for (const symbol of symbols) {
      processSymbol(symbol);
    }

    return converted;
  }

  /**
   * Convert LSP references to our format
   */
  private convertLSPReferences(references: any[]): SymbolInfo[] {
    // Simplified conversion - would be more comprehensive in production
    return references.map((ref, index) => ({
      id: `ref_${index}`,
      name: 'reference',
      type: 'variable' as any,
      kind: 13, // Variable
      range: ref.range,
      uri: ref.uri,
      references: [],
      metadata: {}
    }));
  }

  /**
   * Build cross-references with thread safety
   */
  private async buildCrossReferences(symbols: SymbolInfo[], document: TextDocument, server: LSPServer): Promise<any[]> {
    // Simplified implementation - would be more comprehensive in production
    const crossRefs: any[] = [];
    
    // For each function/method symbol, find calls to it
    for (const symbol of symbols) {
      if (symbol.type === 'function' || symbol.type === 'method') {
        try {
          const references = await server.findReferences(
            document,
            symbol.range.start.line,
            symbol.range.start.character
          );
          
          for (const ref of references) {
            crossRefs.push({
              from: `caller_${ref.range.start.line}`,
              to: symbol.id,
              type: 'calls'
            });
          }
        } catch (error) {
          // Continue on error to prevent blocking analysis
          logger.debug('Failed to find references for symbol', {
            symbolId: symbol.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return crossRefs;
  }

  /**
   * Build scope information
   */
  private buildScopes(symbols: SymbolInfo[]): any[] {
    const scopes: any[] = [];

    // Group symbols by scope
    const scopeMap = new Map<string, SymbolInfo[]>();

    for (const symbol of symbols) {
      const scopeName = symbol.scope || 'global';
      if (!scopeMap.has(scopeName)) {
        scopeMap.set(scopeName, []);
      }
      scopeMap.get(scopeName)!.push(symbol);
    }

    // Convert to scope objects
    for (const [scopeName, scopeSymbols] of scopeMap.entries()) {
      if (scopeSymbols.length > 0) {
        // Calculate scope range
        const ranges = scopeSymbols.map(s => s.range);
        const minLine = Math.min(...ranges.map(r => r.start.line));
        const maxLine = Math.max(...ranges.map(r => r.end.line));

        scopes.push({
          name: scopeName,
          range: {
            start: { line: minLine, character: 0 },
            end: { line: maxLine, character: 0 }
          },
          symbols: scopeSymbols.map(s => s.id)
        });
      }
    }

    return scopes;
  }

  /**
   * Map LSP symbol kind to our type
   */
  private mapSymbolKindToType(kind: number): any {
    // LSP SymbolKind mapping
    const kindMap: Record<number, any> = {
      1: 'file',
      2: 'module',
      3: 'namespace',
      4: 'package',
      5: 'class',
      6: 'method',
      7: 'property',
      8: 'field',
      9: 'constructor',
      10: 'enum',
      11: 'interface',
      12: 'function',
      13: 'variable',
      14: 'constant',
      15: 'string',
      16: 'number',
      17: 'boolean',
      18: 'array',
      19: 'object',
      20: 'key',
      21: 'null',
      22: 'enumMember',
      23: 'struct',
      24: 'event',
      25: 'operator',
      26: 'typeParameter'
    };

    return kindMap[kind] || 'variable';
  }

  /**
   * Cleanup resources with proper synchronization
   */
  async cleanup(): Promise<void> {
    // Mark as shutting down
    await this.isShuttingDown.set(true);
    
    const cleanupRelease = await this.cleanupMutex.acquire();
    try {
      logger.info('Starting LSPManager cleanup', {
        activeServers: this.servers.size,
        openDocuments: this.documents.size,
        activeOperations: this.activeOperations.get()
      });
      
      // Wait for active operations to complete (with timeout)
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      
      while (this.activeOperations.get() > 0 && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (this.activeOperations.get() > 0) {
        logger.warn('Forcing cleanup with active operations', {
          remainingOperations: this.activeOperations.get()
        });
      }
      
      // Stop all servers
      const serverLanguages = await this.servers.keys();
      const stopPromises = serverLanguages.map(language => 
        this.stopServer(language).catch(error => 
          logger.warn('Failed to stop server during cleanup', { language, error })
        )
      );
      await Promise.allSettled(stopPromises);

      // Clear documents
      await this.documents.clear();
      await this.activeOperations.reset();

      logger.info('LSPManager cleanup completed');

    } catch (error) {
      logger.error('Error during LSPManager cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      cleanupRelease();
    }
  }

  /**
   * Graceful shutdown - wait for active operations to complete
   */
  async gracefulShutdown(timeoutMs = 30000): Promise<void> {
    await this.isShuttingDown.set(true);
    
    const startTime = Date.now();
    
    // Wait for active operations to complete
    while (this.activeOperations.get() > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force cleanup if timeout exceeded
    if (this.activeOperations.get() > 0) {
      logger.warn('Graceful shutdown timeout exceeded, forcing cleanup', {
        remainingOperations: this.activeOperations.get()
      });
    }
    
    await this.cleanup();
  }
}

// ==================== LSP SERVER CLASS ====================

class LSPServer extends EventEmitter {
  private process?: ChildProcess;
  private connection: any;
  private isInitialized = new AtomicBoolean(false);
  private lastActivity: Date = new Date();
  private errorCount: AtomicCounter = new AtomicCounter();
  private connectionMutex: AsyncMutex = new AsyncMutex();
  private requestMutex: AsyncMutex = new AsyncMutex();

  constructor(
    private language: SupportedLanguage,
    private config: LSPServerConfig,
    private workspaceRoot: string
  ) {
    super();
  }

  async start(): Promise<void> {
    const connectionRelease = await this.connectionMutex.acquire();
    
    try {
      // Spawn LSP server process
      this.process = spawn(this.config.command, this.config.args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (!this.process.stdin || !this.process.stdout) {
        throw new Error('Failed to create LSP server stdio streams');
      }

      // Create connection
      this.connection = createConnection(
        this.process.stdout,
        this.process.stdin,
        ProposedFeatures.all
      );

      // Setup error handling
      this.process.on('error', (error) => {
        this.errorCount.increment();
        this.emit('error', error);
      });

      this.process.on('exit', (code) => {
        logger.info('LSP server process exited', { language: this.language, code });
        this.emit('disconnected');
      });

      // Initialize server
      await this.initialize();

      this.emit('initialized');

    } catch (error) {
      await this.errorCount.increment();
      throw error;
    } finally {
      connectionRelease();
    }
  }

  private async initialize(): Promise<void> {
    const initParams: InitializeParams = {
      processId: process.pid,
      rootUri: URI.file(this.workspaceRoot).toString(),
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true
            }
          },
          hover: {
            dynamicRegistration: true,
            contentFormat: ['markdown', 'plaintext']
          },
          signatureHelp: {
            dynamicRegistration: true
          },
          references: {
            dynamicRegistration: true
          },
          documentSymbol: {
            dynamicRegistration: true,
            hierarchicalDocumentSymbolSupport: true
          },
          definition: {
            dynamicRegistration: true
          },
          rename: {
            dynamicRegistration: true
          },
          codeAction: {
            dynamicRegistration: true
          }
        },
        workspace: {
          applyEdit: true,
          configuration: true,
          didChangeConfiguration: {
            dynamicRegistration: true
          }
        }
      },
      initializationOptions: this.config.initializationOptions,
      workspaceFolders: [{
        uri: URI.file(this.workspaceRoot).toString(),
        name: 'workspace'
      }]
    };

    await this.connection.sendRequest('initialize', initParams);
    await this.connection.sendNotification('initialized', {});

    await this.isInitialized.set(true);
    this.lastActivity = new Date();
  }

  async openDocument(document: TextDocument): Promise<void> {
    if (!this.isInitialized.get()) {
      throw new Error('LSP server not initialized');
    }

    const requestRelease = await this.requestMutex.acquire();
    
    try {
      await this.connection.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: document.uri,
          languageId: document.languageId,
          version: document.version,
          text: document.getText()
        }
      });

      this.lastActivity = new Date();
    } finally {
      requestRelease();
    }
  }

  async updateDocument(document: TextDocument, content: string): Promise<void> {
    if (!this.isInitialized.get()) {
      throw new Error('LSP server not initialized');
    }

    const requestRelease = await this.requestMutex.acquire();
    
    try {
      await this.connection.sendNotification('textDocument/didChange', {
        textDocument: {
          uri: document.uri,
          version: document.version
        },
        contentChanges: [{
          text: content
        }]
      });

      this.lastActivity = new Date();
    } finally {
      requestRelease();
    }
  }

  async closeDocument(document: TextDocument): Promise<void> {
    if (!this.isInitialized.get()) {
      return;
    }

    const requestRelease = await this.requestMutex.acquire();
    
    try {
      await this.connection.sendNotification('textDocument/didClose', {
        textDocument: {
          uri: document.uri
        }
      });

      this.lastActivity = new Date();
    } finally {
      requestRelease();
    }
  }

  async getDocumentSymbols(document: TextDocument): Promise<any[]> {
    if (!this.isInitialized.get()) {
      throw new Error('LSP server not initialized');
    }

    const requestRelease = await this.requestMutex.acquire();
    
    try {
      const result = await this.connection.sendRequest('textDocument/documentSymbol', {
        textDocument: {
          uri: document.uri
        }
      });

      this.lastActivity = new Date();
      return result || [];
    } finally {
      requestRelease();
    }
  }

  async findReferences(document: TextDocument, line: number, character: number): Promise<any[]> {
    if (!this.isInitialized.get()) {
      throw new Error('LSP server not initialized');
    }

    const requestRelease = await this.requestMutex.acquire();
    
    try {
      const result = await this.connection.sendRequest('textDocument/references', {
        textDocument: {
          uri: document.uri
        },
        position: {
          line,
          character
        },
        context: {
          includeDeclaration: true
        }
      });

      this.lastActivity = new Date();
      return result || [];
    } finally {
      requestRelease();
    }
  }

  async getSemanticTokens?(document: TextDocument): Promise<any[]> {
    // Optional semantic tokens support
    if (!this.isInitialized.get()) {
      return [];
    }

    try {
      const requestRelease = await this.requestMutex.acquire();
      
      try {
        const result = await this.connection.sendRequest('textDocument/semanticTokens/full', {
          textDocument: {
            uri: document.uri
          }
        });

        this.lastActivity = new Date();
        return this.parseSemanticTokens(result);
      } finally {
        requestRelease();
      }
    } catch (error) {
      // Not all servers support semantic tokens
      return [];
    }
  }

  private parseSemanticTokens(result: any): any[] {
    // Parse semantic tokens from LSP format
    if (!result || !result.data) {
      return [];
    }

    const tokens: any[] = [];
    const data = result.data;

    let line = 0;
    let character = 0;

    for (let i = 0; i < data.length; i += 5) {
      const deltaLine = data[i];
      const deltaChar = data[i + 1];
      const length = data[i + 2];
      const tokenType = data[i + 3];
      const tokenModifiers = data[i + 4];

      line += deltaLine;
      if (deltaLine > 0) {
        character = deltaChar;
      } else {
        character += deltaChar;
      }

      tokens.push({
        line,
        character,
        length,
        tokenType: this.mapTokenType(tokenType),
        tokenModifiers: this.mapTokenModifiers(tokenModifiers)
      });
    }

    return tokens;
  }

  private mapTokenType(tokenType: number): string {
    // Map numeric token type to string
    const types = [
      'namespace', 'type', 'class', 'enum', 'interface', 'struct',
      'typeParameter', 'parameter', 'variable', 'property', 'enumMember',
      'event', 'function', 'method', 'macro', 'keyword', 'modifier',
      'comment', 'string', 'number', 'regexp', 'operator'
    ];

    return types[tokenType] || 'unknown';
  }

  private mapTokenModifiers(modifiers: number): string[] {
    // Map token modifiers bitfield to strings
    const modifierNames = [
      'declaration', 'definition', 'readonly', 'static', 'deprecated',
      'abstract', 'async', 'modification', 'documentation', 'defaultLibrary'
    ];

    const result: string[] = [];
    for (let i = 0; i < modifierNames.length; i++) {
      if (modifiers & (1 << i)) {
        result.push(modifierNames[i]);
      }
    }

    return result;
  }

  async stop(): Promise<void> {
    const connectionRelease = await this.connectionMutex.acquire();
    
    try {
      if (this.connection && this.isInitialized.get()) {
        await this.connection.sendRequest('shutdown', null);
        await this.connection.sendNotification('exit', null);
      }

      if (this.process) {
        this.process.kill();
      }

      await this.isInitialized.set(false);

    } catch (error) {
      logger.error('Error stopping LSP server', {
        language: this.language,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      connectionRelease();
    }
  }

  getLastActivity(): Date {
    return this.lastActivity;
  }

  getErrorCount(): number {
    return this.errorCount.get();
  }
}

// ==================== INTERFACES ====================

interface LSPServerConfig {
  command: string;
  args: string[];
  capabilities: string[];
  initializationOptions: any;
}