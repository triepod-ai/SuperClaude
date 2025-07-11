import { z } from 'zod';
import { Task, PersonaType, ComplexityLevel, TaskStatus } from '@superclaude/shared';

/**
 * Orchestrator-specific types for multi-model coordination
 */

// AI Provider types
export const AIProvider = z.enum([
  'claude',
  'openai-gpt4',
  'openai-gpt3.5',
  'google-gemini',
  'anthropic-claude',
  'local-model'
]);

export type AIProvider = z.infer<typeof AIProvider>;

// Model capabilities
export const ModelCapability = z.enum([
  'text-generation',
  'code-analysis',
  'reasoning',
  'creative-writing',
  'translation',
  'summarization',
  'qa-answering'
]);

export type ModelCapability = z.infer<typeof ModelCapability>;

// Wave execution status
export const WaveStatus = z.enum([
  'pending',
  'planning',
  'executing',
  'validating',
  'completed',
  'failed',
  'cancelled'
]);

export type WaveStatus = z.infer<typeof WaveStatus>;

// Wave strategy
export const WaveStrategy = z.enum([
  'progressive',
  'systematic',
  'adaptive',
  'enterprise'
]);

export type WaveStrategy = z.infer<typeof WaveStrategy>;

// Multi-model coordination request
export const MultiModelRequest = z.object({
  id: z.string(),
  task: Task,
  preferredProviders: z.array(AIProvider).optional(),
  requiredCapabilities: z.array(ModelCapability),
  maxProviders: z.number().default(3),
  fallbackStrategy: z.enum(['sequential', 'parallel', 'consensus']).default('sequential'),
  timeout: z.number().default(30000), // ms
  retryAttempts: z.number().default(2),
  metadata: z.record(z.unknown()).default({})
});

export type MultiModelRequest = z.infer<typeof MultiModelRequest>;

// Model response
export const ModelResponse = z.object({
  provider: AIProvider,
  requestId: z.string(),
  taskId: z.string(),
  response: z.string(),
  confidence: z.number().min(0).max(1),
  tokenUsage: z.number(),
  executionTime: z.number(),
  metadata: z.record(z.unknown()).default({}),
  timestamp: z.date()
});

export type ModelResponse = z.infer<typeof ModelResponse>;

// Wave execution plan
export const WaveExecutionPlan = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  strategy: WaveStrategy,
  phases: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    dependencies: z.array(z.string()).default([]),
    tasks: z.array(z.string()),
    estimatedTokens: z.number(),
    priority: z.number().min(1).max(10)
  })),
  totalEstimatedTokens: z.number(),
  maxConcurrentPhases: z.number().default(3),
  validationRequired: z.boolean().default(true),
  rollbackStrategy: z.enum(['immediate', 'phase-complete', 'manual']).default('phase-complete'),
  metadata: z.record(z.unknown()).default({})
});

export type WaveExecutionPlan = z.infer<typeof WaveExecutionPlan>;

// Wave execution state
export const WaveExecution = z.object({
  id: z.string(),
  planId: z.string(),
  status: WaveStatus,
  currentPhase: z.string().optional(),
  completedPhases: z.array(z.string()).default([]),
  failedPhases: z.array(z.string()).default([]),
  startTime: z.date(),
  endTime: z.date().optional(),
  totalTokensUsed: z.number().default(0),
  results: z.array(z.record(z.unknown())).default([]),
  errors: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({})
});

export type WaveExecution = z.infer<typeof WaveExecution>;

// Workflow coordination
export const WorkflowEvent = z.object({
  id: z.string(),
  type: z.enum(['task-created', 'task-updated', 'task-completed', 'wave-started', 'wave-completed', 'model-response']),
  source: z.string(),
  target: z.string().optional(),
  payload: z.record(z.unknown()),
  timestamp: z.date(),
  priority: z.number().min(1).max(10).default(5)
});

export type WorkflowEvent = z.infer<typeof WorkflowEvent>;

// Coordination strategy
export const CoordinationStrategy = z.object({
  name: z.string(),
  description: z.string(),
  rules: z.array(z.object({
    condition: z.string(),
    action: z.string(),
    priority: z.number(),
    enabled: z.boolean().default(true)
  })),
  triggers: z.array(z.object({
    event: z.string(),
    handler: z.string(),
    async: z.boolean().default(false)
  })),
  metadata: z.record(z.unknown()).default({})
});

export type CoordinationStrategy = z.infer<typeof CoordinationStrategy>;

// Circuit breaker state
export const CircuitBreakerState = z.enum(['closed', 'open', 'half-open']);
export type CircuitBreakerState = z.infer<typeof CircuitBreakerState>;

// Error types specific to orchestrator
export class OrchestratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

export class ModelProviderError extends OrchestratorError {
  constructor(message: string, public provider: AIProvider, context?: Record<string, unknown>) {
    super(message, 'MODEL_PROVIDER_ERROR', context);
    this.name = 'ModelProviderError';
  }
}

export class WaveExecutionError extends OrchestratorError {
  constructor(message: string, public waveId: string, context?: Record<string, unknown>) {
    super(message, 'WAVE_EXECUTION_ERROR', context);
    this.name = 'WaveExecutionError';
  }
}

export class CoordinationError extends OrchestratorError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'COORDINATION_ERROR', context);
    this.name = 'CoordinationError';
  }
}

// Tool result type
export interface OrchestratorToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}