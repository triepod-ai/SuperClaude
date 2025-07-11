import { z } from 'zod';

/**
 * Common types and schemas for SuperClaude MCP servers
 */

// Base persona types
export const PersonaType = z.enum([
  'architect',
  'frontend', 
  'backend',
  'analyzer',
  'security',
  'mentor',
  'refactorer',
  'performance',
  'qa',
  'devops',
  'scribe'
]);

export type PersonaType = z.infer<typeof PersonaType>;

// Complexity levels
export const ComplexityLevel = z.enum([
  'simple',
  'moderate', 
  'complex',
  'critical'
]);

export type ComplexityLevel = z.infer<typeof ComplexityLevel>;

// Task status
export const TaskStatus = z.enum([
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'cancelled'
]);

export type TaskStatus = z.infer<typeof TaskStatus>;

// Quality gate status
export const QualityGateStatus = z.enum([
  'passed',
  'failed',
  'warning',
  'skipped'
]);

export type QualityGateStatus = z.infer<typeof QualityGateStatus>;

// Base task interface
export const Task = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: TaskStatus,
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  complexity: ComplexityLevel,
  estimatedTokens: z.number().optional(),
  actualTokens: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  dependencies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  assignedPersona: PersonaType.optional(),
  metadata: z.record(z.unknown()).default({})
});

export type Task = z.infer<typeof Task>;

// Quality gate result
export const QualityGateResult = z.object({
  gate: z.string(),
  status: QualityGateStatus,
  score: z.number().min(0).max(1),
  message: z.string().optional(),
  details: z.record(z.unknown()).default({}),
  timestamp: z.date()
});

export type QualityGateResult = z.infer<typeof QualityGateResult>;

// Performance metrics
export const PerformanceMetrics = z.object({
  executionTime: z.number(),
  tokenUsage: z.number(),
  memoryUsage: z.number().optional(),
  cacheHitRate: z.number().min(0).max(1).optional(),
  successRate: z.number().min(0).max(1),
  timestamp: z.date()
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetrics>;

// Error types
export const ErrorSeverity = z.enum([
  'info',
  'warning', 
  'error',
  'critical'
]);

export type ErrorSeverity = z.infer<typeof ErrorSeverity>;

export const SuperClaudeError = z.object({
  code: z.string(),
  message: z.string(),
  severity: ErrorSeverity,
  context: z.record(z.unknown()).default({}),
  timestamp: z.date(),
  stack: z.string().optional()
});

export type SuperClaudeError = z.infer<typeof SuperClaudeError>;

// Configuration types
export const ServerConfig = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  maxConcurrentTasks: z.number().default(10),
  tokenBudget: z.number().default(100000),
  enableCaching: z.boolean().default(true),
  enableMetrics: z.boolean().default(true),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export type ServerConfig = z.infer<typeof ServerConfig>;