import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { LSPManager } from './core/LSPManager.js';
import { SemanticAnalyzer } from './core/SemanticAnalyzer.js';
import { SymbolEditor } from './core/SymbolEditor.js';
import { logger } from '@superclaude/shared';
import {
  SupportedLanguage,
  CodeAnalysisResult,
  SymbolInfo,
  SemanticAnalysisResult,
  CodeEdit,
  SymbolEditRequest,
  CodeGenerationRequest,
  ProjectStructure,
  LSPServerInfo,
  CodeToolResult,
  CodeServerError,
  LSPError,
  ParseError,
  SymbolNotFoundError,
  RefactoringError
} from './types/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * SuperClaude Code MCP Server
 * Provides LSP integration and semantic code analysis capabilities
 */
export class SuperClaudeCodeServer {
  private server: Server;
  private lspManager: LSPManager;
  private semanticAnalyzer: SemanticAnalyzer;
  private symbolEditor: SymbolEditor;
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    
    this.server = new Server(
      {
        name: 'superclaude-code',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.lspManager = new LSPManager();
    this.semanticAnalyzer = new SemanticAnalyzer(this.lspManager);
    this.symbolEditor = new SymbolEditor(this.lspManager);
    
    this.setupToolHandlers();
    this.setupErrorHandling();
    this.setupEventHandlers();
    
    logger.setServerName('superclaude-code');
    logger.info('SuperClaudeCodeServer initialized', { workspaceRoot: this.workspaceRoot });
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // LSP Management Tools
        {
          name: 'start_lsp_server',
          description: 'Start LSP server for a specific language',
          inputSchema: {
            type: 'object',
            properties: {
              language: { 
                type: 'string',
                enum: ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'cpp', 'csharp']
              },
              workspaceRoot: { type: 'string', description: 'Workspace root path (optional)' }
            },
            required: ['language']
          }
        },
        {
          name: 'stop_lsp_server',
          description: 'Stop LSP server for a specific language',
          inputSchema: {
            type: 'object',
            properties: {
              language: { 
                type: 'string',
                enum: ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'cpp', 'csharp']
              }
            },
            required: ['language']
          }
        },
        {
          name: 'get_lsp_status',
          description: 'Get status of all LSP servers',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // Document Management Tools
        {
          name: 'open_document',
          description: 'Open a document in the LSP server',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' },
              languageId: { type: 'string', description: 'Language identifier' },
              content: { type: 'string', description: 'Document content' }
            },
            required: ['uri', 'languageId', 'content']
          }
        },
        {
          name: 'update_document',
          description: 'Update document content',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' },
              content: { type: 'string', description: 'New content' },
              version: { type: 'number', description: 'Document version (optional)' }
            },
            required: ['uri', 'content']
          }
        },
        {
          name: 'close_document',
          description: 'Close a document in the LSP server',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' }
            },
            required: ['uri']
          }
        },

        // Code Analysis Tools
        {
          name: 'analyze_code',
          description: 'Perform comprehensive code analysis',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' },
              content: { type: 'string', description: 'Code content' },
              language: { 
                type: 'string',
                enum: ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'cpp', 'csharp']
              }
            },
            required: ['uri', 'content', 'language']
          }
        },
        {
          name: 'get_semantic_analysis',
          description: 'Get semantic analysis using LSP',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' }
            },
            required: ['uri']
          }
        },
        {
          name: 'get_document_symbols',
          description: 'Get symbols from a document',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' }
            },
            required: ['uri']
          }
        },
        {
          name: 'find_references',
          description: 'Find references to a symbol at position',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' },
              line: { type: 'number', description: 'Line number (0-based)' },
              character: { type: 'number', description: 'Character position (0-based)' }
            },
            required: ['uri', 'line', 'character']
          }
        },
        {
          name: 'find_symbol_at_position',
          description: 'Find symbol at specific position',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' },
              line: { type: 'number', description: 'Line number (0-based)' },
              character: { type: 'number', description: 'Character position (0-based)' }
            },
            required: ['uri', 'line', 'character']
          }
        },

        // Symbol Editing Tools
        {
          name: 'edit_symbol',
          description: 'Perform symbol-level editing operation',
          inputSchema: {
            type: 'object',
            properties: {
              symbolId: { type: 'string', description: 'Symbol identifier' },
              operation: {
                type: 'string',
                enum: [
                  'extract-function', 'extract-variable', 'extract-interface',
                  'rename-symbol', 'move-symbol', 'inline-function', 'inline-variable',
                  'change-signature', 'convert-to-arrow-function', 'convert-to-async'
                ]
              },
              parameters: { type: 'object', description: 'Operation parameters' },
              applyToReferences: { type: 'boolean', default: false },
              preview: { type: 'boolean', default: true }
            },
            required: ['symbolId', 'operation']
          }
        },
        {
          name: 'rename_symbol',
          description: 'Rename a symbol across all references',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' },
              line: { type: 'number', description: 'Line number (0-based)' },
              character: { type: 'number', description: 'Character position (0-based)' },
              newName: { type: 'string', description: 'New symbol name' },
              preview: { type: 'boolean', default: true }
            },
            required: ['uri', 'line', 'character', 'newName']
          }
        },

        // Code Generation Tools
        {
          name: 'generate_code',
          description: 'Generate code using templates',
          inputSchema: {
            type: 'object',
            properties: {
              language: { 
                type: 'string',
                enum: ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'cpp', 'csharp']
              },
              template: { type: 'string', description: 'Code template' },
              context: {
                type: 'object',
                properties: {
                  className: { type: 'string' },
                  functionName: { type: 'string' },
                  parameters: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        type: { type: 'string' },
                        optional: { type: 'boolean', default: false }
                      },
                      required: ['name', 'type']
                    }
                  },
                  returnType: { type: 'string' },
                  visibility: { type: 'string', enum: ['public', 'private', 'protected'] }
                }
              },
              insertionPoint: {
                type: 'object',
                properties: {
                  uri: { type: 'string' },
                  line: { type: 'number' },
                  character: { type: 'number' }
                },
                required: ['uri', 'line', 'character']
              }
            },
            required: ['language', 'template', 'insertionPoint']
          }
        },

        // Project Analysis Tools
        {
          name: 'analyze_project_structure',
          description: 'Analyze entire project structure',
          inputSchema: {
            type: 'object',
            properties: {
              rootPath: { type: 'string', description: 'Project root path' },
              includeTests: { type: 'boolean', default: true },
              maxDepth: { type: 'number', default: 10 }
            },
            required: ['rootPath']
          }
        },

        // Utility Tools
        {
          name: 'get_symbol_usage',
          description: 'Get detailed symbol usage information',
          inputSchema: {
            type: 'object',
            properties: {
              uri: { type: 'string', description: 'Document URI' },
              symbolId: { type: 'string', description: 'Symbol identifier' }
            },
            required: ['uri', 'symbolId']
          }
        }
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const result = await this.handleToolCall(request.params.name, request.params.arguments);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const mcpError = this.convertToMcpError(error);
        throw mcpError;
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.lspManager.on('server-initialized', (language) => {
      logger.info('LSP server initialized', { language });
    });

    this.lspManager.on('server-error', (language, error) => {
      logger.error('LSP server error', { language, error: error.message });
    });

    this.lspManager.on('server-disconnected', (language) => {
      logger.warn('LSP server disconnected', { language });
    });
  }

  /**
   * Handle tool calls
   */
  private async handleToolCall(name: string, args: any): Promise<CodeToolResult> {
    try {
      switch (name) {
        // LSP Management
        case 'start_lsp_server':
          return await this.handleStartLSPServer(args);
        case 'stop_lsp_server':
          return await this.handleStopLSPServer(args);
        case 'get_lsp_status':
          return await this.handleGetLSPStatus(args);

        // Document Management
        case 'open_document':
          return await this.handleOpenDocument(args);
        case 'update_document':
          return await this.handleUpdateDocument(args);
        case 'close_document':
          return await this.handleCloseDocument(args);

        // Code Analysis
        case 'analyze_code':
          return await this.handleAnalyzeCode(args);
        case 'get_semantic_analysis':
          return await this.handleGetSemanticAnalysis(args);
        case 'get_document_symbols':
          return await this.handleGetDocumentSymbols(args);
        case 'find_references':
          return await this.handleFindReferences(args);
        case 'find_symbol_at_position':
          return await this.handleFindSymbolAtPosition(args);

        // Symbol Editing
        case 'edit_symbol':
          return await this.handleEditSymbol(args);
        case 'rename_symbol':
          return await this.handleRenameSymbol(args);

        // Code Generation
        case 'generate_code':
          return await this.handleGenerateCode(args);

        // Project Analysis
        case 'analyze_project_structure':
          return await this.handleAnalyzeProjectStructure(args);

        // Utilities
        case 'get_symbol_usage':
          return await this.handleGetSymbolUsage(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { tool: name, args }
      };
    }
  }

  // ==================== TOOL HANDLERS ====================

  private async handleStartLSPServer(args: any): Promise<CodeToolResult> {
    const language = args.language as SupportedLanguage;
    const workspaceRoot = args.workspaceRoot || this.workspaceRoot;

    await this.lspManager.startServer(language, workspaceRoot);

    return {
      success: true,
      data: { language, workspaceRoot, status: 'started' },
      metadata: { operation: 'start_lsp_server' }
    };
  }

  private async handleStopLSPServer(args: any): Promise<CodeToolResult> {
    const language = args.language as SupportedLanguage;

    await this.lspManager.stopServer(language);

    return {
      success: true,
      data: { language, status: 'stopped' },
      metadata: { operation: 'stop_lsp_server' }
    };
  }

  private async handleGetLSPStatus(args: any): Promise<CodeToolResult> {
    const status = this.lspManager.getServerStatus();

    return {
      success: true,
      data: status,
      metadata: { operation: 'get_lsp_status', serverCount: status.length }
    };
  }

  private async handleOpenDocument(args: any): Promise<CodeToolResult> {
    await this.lspManager.openDocument(args.uri, args.languageId, args.content);

    return {
      success: true,
      data: { uri: args.uri, status: 'opened' },
      metadata: { operation: 'open_document' }
    };
  }

  private async handleUpdateDocument(args: any): Promise<CodeToolResult> {
    await this.lspManager.updateDocument(args.uri, args.content, args.version);

    return {
      success: true,
      data: { uri: args.uri, status: 'updated' },
      metadata: { operation: 'update_document' }
    };
  }

  private async handleCloseDocument(args: any): Promise<CodeToolResult> {
    await this.lspManager.closeDocument(args.uri);

    return {
      success: true,
      data: { uri: args.uri, status: 'closed' },
      metadata: { operation: 'close_document' }
    };
  }

  private async handleAnalyzeCode(args: any): Promise<CodeToolResult> {
    const analysis = await this.semanticAnalyzer.analyzeCode(
      args.uri,
      args.content,
      args.language
    );

    return {
      success: true,
      data: analysis,
      metadata: { 
        operation: 'analyze_code',
        symbolCount: analysis.symbols.length,
        issueCount: analysis.issues.length
      }
    };
  }

  private async handleGetSemanticAnalysis(args: any): Promise<CodeToolResult> {
    const analysis = await this.semanticAnalyzer.getSemanticAnalysis(args.uri);

    return {
      success: true,
      data: analysis,
      metadata: { 
        operation: 'get_semantic_analysis',
        tokenCount: analysis.tokens.length,
        symbolCount: Object.keys(analysis.symbolTable).length
      }
    };
  }

  private async handleGetDocumentSymbols(args: any): Promise<CodeToolResult> {
    const symbols = await this.lspManager.getDocumentSymbols(args.uri);

    return {
      success: true,
      data: symbols,
      metadata: { 
        operation: 'get_document_symbols',
        symbolCount: symbols.length
      }
    };
  }

  private async handleFindReferences(args: any): Promise<CodeToolResult> {
    const references = await this.lspManager.findReferences(
      args.uri,
      args.line,
      args.character
    );

    return {
      success: true,
      data: references,
      metadata: { 
        operation: 'find_references',
        referenceCount: references.length
      }
    };
  }

  private async handleFindSymbolAtPosition(args: any): Promise<CodeToolResult> {
    const symbol = await this.semanticAnalyzer.findSymbolAtPosition(
      args.uri,
      args.line,
      args.character
    );

    return {
      success: true,
      data: symbol,
      metadata: { 
        operation: 'find_symbol_at_position',
        found: !!symbol
      }
    };
  }

  private async handleEditSymbol(args: any): Promise<CodeToolResult> {
    const request: SymbolEditRequest = {
      symbolId: args.symbolId,
      operation: args.operation,
      parameters: args.parameters || {},
      applyToReferences: args.applyToReferences || false,
      preview: args.preview !== false
    };

    const edits = await this.symbolEditor.editSymbol(request);

    return {
      success: true,
      data: edits,
      metadata: { 
        operation: 'edit_symbol',
        editCount: edits.length
      }
    };
  }

  private async handleRenameSymbol(args: any): Promise<CodeToolResult> {
    const edits = await this.symbolEditor.renameSymbol(
      args.uri,
      args.line,
      args.character,
      args.newName,
      args.preview !== false
    );

    return {
      success: true,
      data: edits,
      metadata: { 
        operation: 'rename_symbol',
        editCount: edits.length
      }
    };
  }

  private async handleGenerateCode(args: any): Promise<CodeToolResult> {
    const request: CodeGenerationRequest = {
      language: args.language,
      template: args.template,
      context: args.context || {},
      insertionPoint: args.insertionPoint,
      metadata: {}
    };

    const code = await this.symbolEditor.generateCode(request);

    return {
      success: true,
      data: { generatedCode: code },
      metadata: { 
        operation: 'generate_code',
        language: args.language
      }
    };
  }

  private async handleAnalyzeProjectStructure(args: any): Promise<CodeToolResult> {
    // Mock implementation - would scan file system in production
    const structure: ProjectStructure = {
      rootPath: args.rootPath,
      language: 'typescript', // Would be detected
      framework: 'Node.js',
      packageManager: 'npm',
      configFiles: ['package.json', 'tsconfig.json'],
      sourceFiles: [
        {
          uri: 'file:///src/index.ts',
          relativePath: 'src/index.ts',
          language: 'typescript',
          size: 1024,
          lastModified: new Date()
        }
      ],
      dependencies: {
        production: { 'lodash': '^4.17.21' },
        development: { '@types/node': '^20.8.10' }
      },
      scripts: {
        'build': 'tsc',
        'test': 'jest'
      },
      metrics: {
        totalFiles: 10,
        totalLines: 500,
        complexity: 2.5
      },
      analysisDate: new Date()
    };

    return {
      success: true,
      data: structure,
      metadata: { 
        operation: 'analyze_project_structure',
        fileCount: structure.sourceFiles.length
      }
    };
  }

  private async handleGetSymbolUsage(args: any): Promise<CodeToolResult> {
    const usage = await this.semanticAnalyzer.getSymbolUsage(args.uri, args.symbolId);

    return {
      success: true,
      data: usage,
      metadata: { 
        operation: 'get_symbol_usage',
        referenceCount: usage.referenceCount
      }
    };
  }

  // ==================== ERROR HANDLING ====================

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason, promise });
      process.exit(1);
    });
  }

  private convertToMcpError(error: unknown): McpError {
    if (error instanceof LSPError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof ParseError) {
      return new McpError(ErrorCode.InvalidParams, error.message);
    }
    
    if (error instanceof SymbolNotFoundError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof RefactoringError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof CodeServerError) {
      return new McpError(ErrorCode.InternalError, error.message);
    }
    
    if (error instanceof Error) {
      return new McpError(ErrorCode.InternalError, error.message);
    }
    
    return new McpError(ErrorCode.InternalError, 'Unknown error occurred');
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('SuperClaude Code MCP server running on stdio');
  }

  /**
   * Shutdown the server
   */
  async shutdown(): Promise<void> {
    try {
      await this.lspManager.cleanup();
      await this.semanticAnalyzer.cleanup();
      await this.symbolEditor.cleanup();
      
      logger.info('SuperClaude Code MCP server shutdown completed');
    } catch (error) {
      logger.error('Error during server shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}