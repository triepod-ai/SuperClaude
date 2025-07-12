/**
 * Types for SuperClaude bridge hooks with Claude Code integration
 */

import { Task, PersonaType, ComplexityLevel, PerformanceMetrics } from '@superclaude/shared';

// Claude Code Tool execution event types
export type ClaudeCodeEvent = 'pre_tool_use' | 'post_tool_use' | 'context_update' | 'session_start' | 'session_end';

// MCP Server types for intelligent routing
export type MCPServerType = 
  | 'superclaude-code'
  | 'superclaude-intelligence' 
  | 'superclaude-orchestrator'
  | 'superclaude-performance'
  | 'superclaude-quality'
  | 'superclaude-tasks'
  | 'superclaude-ui'
  | 'context7'
  | 'sequential'
  | 'magic'
  | 'playwright';

// Claude Code tool execution context
export interface ClaudeCodeToolContext {
  toolName: string;
  toolArgs: Record<string, unknown>;
  userQuery?: string;
  sessionId: string;
  executionId: string;
  timestamp: Date;
  environment: {
    workingDirectory: string;
    platform: string;
    nodeVersion?: string;
    gitRepo: boolean;
  };
}

// Enhanced bridge hook context with Claude Code integration
export interface BridgeHookContext {
  // Core operation context
  operation: string;
  args: Record<string, unknown>;
  
  // SuperClaude framework context
  persona?: PersonaType;
  complexity?: ComplexityLevel;
  flags: string[];
  
  // Session and execution context
  sessionId: string;
  executionId: string;
  timestamp: Date;
  
  // Claude Code specific context
  claudeCode?: ClaudeCodeToolContext;
  event?: ClaudeCodeEvent;
  
  // Performance and routing context
  performanceBudget?: {
    maxExecutionTime: number;
    maxTokenUsage?: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // Context preservation
  sessionState?: Record<string, unknown>;
  previousResults?: Record<string, unknown>;
}

// Enhanced result interface
export interface BridgeHookResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  
  // Performance metrics
  performance?: {
    duration: number;
    tokenUsage?: number;
    memoryUsage?: number;
    cacheHitRate?: number;
  };
  
  // MCP server coordination results
  mcpResults?: Record<MCPServerType, unknown>;
  
  // Context updates for preservation
  sessionStateUpdates?: Record<string, unknown>;
  
  // Routing recommendations for next operations
  nextOperationHints?: {
    recommendedServers: MCPServerType[];
    estimatedComplexity: ComplexityLevel;
    suggestedPersona?: PersonaType;
  };
}

// Hook handler with enhanced capabilities
export type BridgeHookHandler = (
  context: BridgeHookContext
) => Promise<BridgeHookResult>;

// Enhanced hook registration
export interface BridgeHookRegistration {
  name: string;
  handler: BridgeHookHandler;
  priority: number;
  enabled: boolean;
  description?: string;
  
  // Claude Code integration settings
  claudeCodeEvents?: ClaudeCodeEvent[];
  supportedTools?: string[];
  
  // Performance characteristics
  expectedExecutionTime?: number;
  maxExecutionTime?: number;
  resourceRequirements?: {
    cpu: 'low' | 'medium' | 'high';
    memory: 'low' | 'medium' | 'high';
    network: boolean;
  };
}

// Enhanced configuration
export interface BridgeHookConfig {
  // Basic settings
  enableMetrics: boolean;
  enableCaching: boolean;
  timeout: number;
  maxRetries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Performance settings
  performanceTarget: number; // Target execution time in ms
  maxConcurrentHooks: number;
  cacheSize: number;
  
  // Claude Code integration
  claudeCodeIntegration: {
    enabled: boolean;
    toolEventBuffer: number;
    sessionTrackingEnabled: boolean;
    contextPreservationTTL: number; // in seconds
  };
  
  // MCP server routing
  mcpRouting: {
    enabled: boolean;
    fallbackTimeout: number;
    healthCheckInterval: number;
    loadBalancing: 'round-robin' | 'least-loaded' | 'capability-based';
  };
  
  // Environment specific settings
  environment: {
    development: boolean;
    maxDebugOutput: number;
    enableDetailedMetrics: boolean;
  };
}

// MCP server routing decision
export interface MCPRoutingDecision {
  targetServers: MCPServerType[];
  strategy: 'parallel' | 'sequential' | 'primary-fallback' | 'consensus';
  timeout: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  fallbackServers?: MCPServerType[];
}

// Session state management
export interface SessionState {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  context: Record<string, unknown>;
  executionHistory: {
    toolName: string;
    executionId: string;
    timestamp: Date;
    duration: number;
    success: boolean;
  }[];
  performance: {
    totalExecutions: number;
    averageExecutionTime: number;
    successRate: number;
    tokenUsage: number;
  };
}

// Performance monitoring interfaces
export interface PerformanceThresholds {
  executionTime: {
    target: number;
    warning: number;
    critical: number;
  };
  tokenUsage: {
    target: number;
    warning: number;
    critical: number;
  };
  memoryUsage: {
    target: number;
    warning: number;
    critical: number;
  };
}

export interface PerformanceAlert {
  alertId: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  metric: 'executionTime' | 'tokenUsage' | 'memoryUsage' | 'errorRate';
  value: number;
  threshold: number;
  context: BridgeHookContext;
  recommendation?: string;
}