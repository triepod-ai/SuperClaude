import { z } from 'zod';

// Task states enum
export enum TaskState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

// Task priority enum
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Task complexity levels
export enum TaskComplexity {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex'
}

// Zod schemas for validation
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  state: z.nativeEnum(TaskState),
  priority: z.nativeEnum(TaskPriority),
  complexity: z.nativeEnum(TaskComplexity).optional(),
  parentId: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  estimatedHours: z.number().positive().optional(),
  actualHours: z.number().positive().optional(),
  assignee: z.string().optional(),
  dueDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  metadata: z.record(z.any()).default({})
});

export const SubtaskSchema = TaskSchema.extend({
  parentId: z.string() // Required for subtasks
});

export const TaskQueueSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tasks: z.array(z.string()), // Task IDs
  maxConcurrentTasks: z.number().positive().default(3),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const PRDSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  level: z.number().min(1).max(6), // Header level
  actionItems: z.array(z.string()).default([])
});

export const PRDParseResultSchema = z.object({
  title: z.string(),
  sections: z.array(PRDSectionSchema),
  extractedTasks: z.array(TaskSchema),
  metadata: z.object({
    wordCount: z.number(),
    complexity: z.nativeEnum(TaskComplexity),
    estimatedTasks: z.number(),
    parsedAt: z.date()
  })
});

// TypeScript types derived from Zod schemas
export type Task = z.infer<typeof TaskSchema>;
export type Subtask = z.infer<typeof SubtaskSchema>;
export type TaskQueue = z.infer<typeof TaskQueueSchema>;
export type PRDSection = z.infer<typeof PRDSectionSchema>;
export type PRDParseResult = z.infer<typeof PRDParseResultSchema>;

// Task creation input type
export type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// Task update input type
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt'>> & {
  id: string;
};

// Task filter options
export interface TaskFilterOptions {
  state?: TaskState[];
  priority?: TaskPriority[];
  complexity?: TaskComplexity[];
  assignee?: string[];
  tags?: string[];
  parentId?: string;
  hasParent?: boolean;
  dueBefore?: Date;
  dueAfter?: Date;
  createdBefore?: Date;
  createdAfter?: Date;
}

// Task sort options
export interface TaskSortOptions {
  field: keyof Task;
  direction: 'asc' | 'desc';
}

// Task decomposition options
export interface DecompositionOptions {
  maxDepth?: number;
  targetComplexity?: TaskComplexity;
  estimateHours?: boolean;
  generateDependencies?: boolean;
  preserveMetadata?: boolean;
}

// Task execution context
export interface TaskExecutionContext {
  taskId: string;
  startTime: Date;
  currentStep?: string;
  progress?: number;
  logs: TaskLog[];
  errors: TaskError[];
}

// Task log entry
export interface TaskLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}

// Task error
export interface TaskError {
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

// Task analytics
export interface TaskAnalytics {
  totalTasks: number;
  tasksByState: Record<TaskState, number>;
  tasksByPriority: Record<TaskPriority, number>;
  tasksByComplexity: Record<TaskComplexity, number>;
  averageCompletionTime: number;
  completionRate: number;
  overdueCount: number;
  blockedCount: number;
}

// Queue statistics
export interface QueueStatistics {
  totalQueues: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  averageTasksPerQueue: number;
  averageCompletionTime: number;
  utilizationRate: number;
}

// MCP Tool definitions
export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// Error types
export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class QueueNotFoundError extends Error {
  constructor(queueId: string) {
    super(`Queue not found: ${queueId}`);
    this.name = 'QueueNotFoundError';
  }
}

export class TaskValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

export class TaskDependencyError extends Error {
  constructor(message: string, public taskId?: string, public dependencyId?: string) {
    super(message);
    this.name = 'TaskDependencyError';
  }
}

export class TaskStateError extends Error {
  constructor(message: string, public taskId?: string, public currentState?: TaskState) {
    super(message);
    this.name = 'TaskStateError';
  }
}