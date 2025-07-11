import { z } from 'zod';

// ==================== QUALITY VALIDATION TYPES ====================

export enum QualityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum ValidationStep {
  SYNTAX = 'syntax',
  TYPE_CHECK = 'type_check',
  LINT = 'lint',
  SECURITY = 'security',
  TEST = 'test',
  PERFORMANCE = 'performance',
  DOCUMENTATION = 'documentation',
  INTEGRATION = 'integration'
}

export enum SemanticContext {
  FUNCTION = 'function',
  CLASS = 'class',
  MODULE = 'module',
  COMPONENT = 'component',
  API = 'api',
  DATABASE = 'database',
  CONFIGURATION = 'configuration'
}

// ==================== SCHEMAS ====================

export const QualityIssueSchema = z.object({
  id: z.string(),
  level: z.nativeEnum(QualityLevel),
  step: z.nativeEnum(ValidationStep),
  title: z.string(),
  description: z.string(),
  filePath: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  rule: z.string().optional(),
  fixable: z.boolean().default(false),
  suggestedFix: z.string().optional(),
  semanticContext: z.nativeEnum(SemanticContext).optional(),
  metadata: z.record(z.any()).default({})
});

export const ValidationResultSchema = z.object({
  step: z.nativeEnum(ValidationStep),
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(QualityIssueSchema),
  executionTime: z.number(),
  metadata: z.record(z.any()).default({})
});

export const QualityReportSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  overallScore: z.number().min(0).max(100),
  passed: z.boolean(),
  validationResults: z.array(ValidationResultSchema),
  semanticAnalysis: z.object({
    complexity: z.number(),
    maintainability: z.number(),
    readability: z.number(),
    dependencies: z.array(z.string()),
    exports: z.array(z.string()),
    imports: z.array(z.string())
  }),
  recommendations: z.array(z.string()),
  createdAt: z.date(),
  executionTime: z.number()
});

export const SemanticAnalysisSchema = z.object({
  filePath: z.string(),
  language: z.string(),
  complexity: z.object({
    cyclomatic: z.number(),
    cognitive: z.number(),
    nestingDepth: z.number()
  }),
  maintainability: z.object({
    index: z.number(),
    issues: z.array(z.string()),
    suggestions: z.array(z.string())
  }),
  dependencies: z.object({
    internal: z.array(z.string()),
    external: z.array(z.string()),
    circular: z.array(z.string())
  }),
  symbols: z.array(z.object({
    name: z.string(),
    type: z.string(),
    line: z.number(),
    complexity: z.number(),
    visibility: z.string()
  })),
  patterns: z.array(z.object({
    name: z.string(),
    confidence: z.number(),
    description: z.string()
  }))
});

export const CrossServerCacheSchema = z.object({
  key: z.string(),
  data: z.any(),
  server: z.string(),
  expiresAt: z.date(),
  tags: z.array(z.string()).default([])
});

export const QualityMetricsSchema = z.object({
  totalFiles: z.number(),
  averageScore: z.number(),
  issuesByLevel: z.record(z.number()),
  stepSuccessRates: z.record(z.number()),
  trendsOverTime: z.array(z.object({
    date: z.date(),
    score: z.number(),
    issueCount: z.number()
  })),
  benchmarks: z.object({
    industry: z.number(),
    team: z.number(),
    project: z.number()
  })
});

// ==================== TYPESCRIPT TYPES ====================

export type QualityIssue = z.infer<typeof QualityIssueSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;
export type SemanticAnalysis = z.infer<typeof SemanticAnalysisSchema>;
export type CrossServerCache = z.infer<typeof CrossServerCacheSchema>;
export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;

// ==================== INPUT TYPES ====================

export interface ValidateFileInput {
  filePath: string;
  content?: string;
  language?: string;
  enabledSteps?: ValidationStep[];
  semanticAnalysis?: boolean;
  fixableOnly?: boolean;
}

export interface ValidateProjectInput {
  projectPath: string;
  includePaths?: string[];
  excludePaths?: string[];
  enabledSteps?: ValidationStep[];
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface SemanticAnalysisInput {
  filePath: string;
  content?: string;
  language?: string;
  includePatterns?: boolean;
  includeComplexity?: boolean;
  includeDependencies?: boolean;
}

export interface QualityBenchmarkInput {
  type: 'industry' | 'team' | 'project';
  language?: string;
  projectType?: string;
  teamSize?: number;
}

export interface CrossServerOptimizationInput {
  targetServers: string[];
  operationType: string;
  cacheStrategy: 'aggressive' | 'conservative' | 'disabled';
  parallelization?: boolean;
}

// ==================== ERROR TYPES ====================

export class QualityValidationError extends Error {
  constructor(message: string, public step: ValidationStep, public filePath?: string) {
    super(message);
    this.name = 'QualityValidationError';
  }
}

export class SemanticAnalysisError extends Error {
  constructor(message: string, public filePath?: string, public language?: string) {
    super(message);
    this.name = 'SemanticAnalysisError';
  }
}

export class CrossServerIntegrationError extends Error {
  constructor(message: string, public server?: string, public operation?: string) {
    super(message);
    this.name = 'CrossServerIntegrationError';
  }
}

// ==================== MCP RESULT TYPE ====================

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// ==================== VALIDATION CONFIGURATION ====================

export interface ValidationConfig {
  steps: {
    [key in ValidationStep]: {
      enabled: boolean;
      timeout: number;
      retries: number;
      weight: number;
    };
  };
  thresholds: {
    overallScore: number;
    stepMinimums: Record<ValidationStep, number>;
  };
  semantic: {
    enabled: boolean;
    complexityThreshold: number;
    maintainabilityThreshold: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  integration: {
    orchestrator: boolean;
    code: boolean;
    tasks: boolean;
  };
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  steps: {
    [ValidationStep.SYNTAX]: { enabled: true, timeout: 5000, retries: 1, weight: 15 },
    [ValidationStep.TYPE_CHECK]: { enabled: true, timeout: 10000, retries: 2, weight: 20 },
    [ValidationStep.LINT]: { enabled: true, timeout: 8000, retries: 1, weight: 15 },
    [ValidationStep.SECURITY]: { enabled: true, timeout: 15000, retries: 2, weight: 20 },
    [ValidationStep.TEST]: { enabled: true, timeout: 30000, retries: 1, weight: 15 },
    [ValidationStep.PERFORMANCE]: { enabled: true, timeout: 20000, retries: 2, weight: 10 },
    [ValidationStep.DOCUMENTATION]: { enabled: true, timeout: 5000, retries: 1, weight: 5 },
    [ValidationStep.INTEGRATION]: { enabled: true, timeout: 25000, retries: 2, weight: 0 }
  },
  thresholds: {
    overallScore: 80,
    stepMinimums: {
      [ValidationStep.SYNTAX]: 95,
      [ValidationStep.TYPE_CHECK]: 90,
      [ValidationStep.LINT]: 85,
      [ValidationStep.SECURITY]: 95,
      [ValidationStep.TEST]: 80,
      [ValidationStep.PERFORMANCE]: 75,
      [ValidationStep.DOCUMENTATION]: 70,
      [ValidationStep.INTEGRATION]: 80
    }
  },
  semantic: {
    enabled: true,
    complexityThreshold: 10,
    maintainabilityThreshold: 70
  },
  caching: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 1000
  },
  integration: {
    orchestrator: true,
    code: true,
    tasks: true
  }
};