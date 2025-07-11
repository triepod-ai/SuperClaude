import { z } from 'zod';
import {
  Position,
  Range,
  Location,
  DocumentSymbol,
  SymbolKind,
  CompletionItem,
  DiagnosticSeverity,
  Diagnostic
} from 'vscode-languageserver-protocol';

/**
 * Code server types for LSP integration and semantic analysis
 */

// Language types
export const SupportedLanguage = z.enum([
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'java',
  'cpp',
  'csharp'
]);

export type SupportedLanguage = z.infer<typeof SupportedLanguage>;

// AST node types
export const ASTNodeType = z.enum([
  'function',
  'class',
  'method',
  'variable',
  'interface',
  'type',
  'import',
  'export',
  'call',
  'property',
  'parameter'
]);

export type ASTNodeType = z.infer<typeof ASTNodeType>;

// Symbol information
export const SymbolInfo = z.object({
  id: z.string(),
  name: z.string(),
  type: ASTNodeType,
  kind: z.number(), // SymbolKind from LSP
  range: z.object({
    start: z.object({
      line: z.number(),
      character: z.number()
    }),
    end: z.object({
      line: z.number(),
      character: z.number()
    })
  }),
  uri: z.string(),
  detail: z.string().optional(),
  documentation: z.string().optional(),
  scope: z.string().optional(),
  visibility: z.enum(['public', 'private', 'protected', 'internal']).optional(),
  modifiers: z.array(z.string()).default([]),
  references: z.array(z.object({
    uri: z.string(),
    range: z.object({
      start: z.object({
        line: z.number(),
        character: z.number()
      }),
      end: z.object({
        line: z.number(),
        character: z.number()
      })
    })
  })).default([]),
  metadata: z.record(z.unknown()).default({})
});

export type SymbolInfo = z.infer<typeof SymbolInfo>;

// Code analysis result
export const CodeAnalysisResult = z.object({
  uri: z.string(),
  language: SupportedLanguage,
  symbols: z.array(SymbolInfo),
  dependencies: z.array(z.object({
    name: z.string(),
    type: z.enum(['internal', 'external', 'standard']),
    path: z.string().optional(),
    version: z.string().optional()
  })),
  complexity: z.object({
    cyclomatic: z.number(),
    cognitive: z.number(),
    maintainability: z.number().min(0).max(100)
  }),
  issues: z.array(z.object({
    severity: z.enum(['error', 'warning', 'info', 'hint']),
    message: z.string(),
    range: z.object({
      start: z.object({
        line: z.number(),
        character: z.number()
      }),
      end: z.object({
        line: z.number(),
        character: z.number()
      })
    }),
    code: z.string().optional(),
    source: z.string().optional()
  })),
  metrics: z.object({
    linesOfCode: z.number(),
    linesOfComments: z.number(),
    blankLines: z.number(),
    functionCount: z.number(),
    classCount: z.number()
  }),
  timestamp: z.date()
});

export type CodeAnalysisResult = z.infer<typeof CodeAnalysisResult>;

// Refactoring operation
export const RefactoringOperation = z.enum([
  'extract-function',
  'extract-variable',
  'extract-interface',
  'rename-symbol',
  'move-symbol',
  'inline-function',
  'inline-variable',
  'change-signature',
  'convert-to-arrow-function',
  'convert-to-async'
]);

export type RefactoringOperation = z.infer<typeof RefactoringOperation>;

// Code edit
export const CodeEdit = z.object({
  id: z.string(),
  uri: z.string(),
  operation: RefactoringOperation,
  range: z.object({
    start: z.object({
      line: z.number(),
      character: z.number()
    }),
    end: z.object({
      line: z.number(),
      character: z.number()
    })
  }),
  newText: z.string(),
  description: z.string(),
  metadata: z.record(z.unknown()).default({})
});

export type CodeEdit = z.infer<typeof CodeEdit>;

// Symbol editing request
export const SymbolEditRequest = z.object({
  symbolId: z.string(),
  operation: RefactoringOperation,
  parameters: z.record(z.unknown()).default({}),
  applyToReferences: z.boolean().default(false),
  preview: z.boolean().default(true)
});

export type SymbolEditRequest = z.infer<typeof SymbolEditRequest>;

// Code generation request
export const CodeGenerationRequest = z.object({
  language: SupportedLanguage,
  template: z.string(),
  context: z.object({
    className: z.string().optional(),
    functionName: z.string().optional(),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string(),
      optional: z.boolean().default(false)
    })).default([]),
    returnType: z.string().optional(),
    visibility: z.enum(['public', 'private', 'protected']).optional()
  }),
  insertionPoint: z.object({
    uri: z.string(),
    line: z.number(),
    character: z.number()
  }),
  metadata: z.record(z.unknown()).default({})
});

export type CodeGenerationRequest = z.infer<typeof CodeGenerationRequest>;

// Project structure
export const ProjectStructure = z.object({
  rootPath: z.string(),
  language: SupportedLanguage,
  framework: z.string().optional(),
  packageManager: z.string().optional(),
  configFiles: z.array(z.string()).default([]),
  sourceFiles: z.array(z.object({
    uri: z.string(),
    relativePath: z.string(),
    language: SupportedLanguage,
    size: z.number(),
    lastModified: z.date()
  })),
  dependencies: z.object({
    production: z.record(z.string()),
    development: z.record(z.string())
  }),
  scripts: z.record(z.string()).default({}),
  metrics: z.object({
    totalFiles: z.number(),
    totalLines: z.number(),
    complexity: z.number()
  }),
  analysisDate: z.date()
});

export type ProjectStructure = z.infer<typeof ProjectStructure>;

// LSP connection status
export const LSPConnectionStatus = z.enum(['disconnected', 'connecting', 'connected', 'error']);
export type LSPConnectionStatus = z.infer<typeof LSPConnectionStatus>;

// LSP server info
export const LSPServerInfo = z.object({
  language: SupportedLanguage,
  name: z.string(),
  version: z.string().optional(),
  status: LSPConnectionStatus,
  capabilities: z.array(z.string()),
  lastActivity: z.date().optional(),
  errorCount: z.number().default(0)
});

export type LSPServerInfo = z.infer<typeof LSPServerInfo>;

// Semantic token types
export const SemanticTokenType = z.enum([
  'namespace',
  'type',
  'class',
  'enum',
  'interface',
  'struct',
  'typeParameter',
  'parameter',
  'variable',
  'property',
  'enumMember',
  'event',
  'function',
  'method',
  'macro',
  'keyword',
  'modifier',
  'comment',
  'string',
  'number',
  'regexp',
  'operator'
]);

export type SemanticTokenType = z.infer<typeof SemanticTokenType>;

// Semantic analysis result
export const SemanticAnalysisResult = z.object({
  uri: z.string(),
  tokens: z.array(z.object({
    line: z.number(),
    character: z.number(),
    length: z.number(),
    tokenType: SemanticTokenType,
    tokenModifiers: z.array(z.string()).default([])
  })),
  symbolTable: z.record(SymbolInfo),
  crossReferences: z.array(z.object({
    from: z.string(), // symbol ID
    to: z.string(),   // symbol ID
    type: z.enum(['calls', 'extends', 'implements', 'imports', 'references'])
  })),
  scopes: z.array(z.object({
    name: z.string(),
    range: z.object({
      start: z.object({
        line: z.number(),
        character: z.number()
      }),
      end: z.object({
        line: z.number(),
        character: z.number()
      })
    }),
    symbols: z.array(z.string()) // symbol IDs
  })),
  analysisTime: z.number()
});

export type SemanticAnalysisResult = z.infer<typeof SemanticAnalysisResult>;

// Error types
export class CodeServerError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CodeServerError';
  }
}

export class LSPError extends CodeServerError {
  constructor(message: string, public language: SupportedLanguage, context?: Record<string, unknown>) {
    super(message, 'LSP_ERROR', context);
    this.name = 'LSPError';
  }
}

export class ParseError extends CodeServerError {
  constructor(message: string, public uri: string, context?: Record<string, unknown>) {
    super(message, 'PARSE_ERROR', context);
    this.name = 'ParseError';
  }
}

export class SymbolNotFoundError extends CodeServerError {
  constructor(message: string, public symbolId: string, context?: Record<string, unknown>) {
    super(message, 'SYMBOL_NOT_FOUND', context);
    this.name = 'SymbolNotFoundError';
  }
}

export class RefactoringError extends CodeServerError {
  constructor(message: string, public operation: RefactoringOperation, context?: Record<string, unknown>) {
    super(message, 'REFACTORING_ERROR', context);
    this.name = 'RefactoringError';
  }
}

// Tool result type
export interface CodeToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}