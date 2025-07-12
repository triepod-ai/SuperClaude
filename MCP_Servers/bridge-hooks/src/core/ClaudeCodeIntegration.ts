/**
 * Claude Code Integration Engine
 * Real integration hooks for Claude Code tool execution system
 */

import { EventEmitter } from 'events';
import { logger } from '@superclaude/shared';
import { 
  ClaudeCodeEvent, 
  ClaudeCodeToolContext, 
  BridgeHookContext, 
  BridgeHookResult,
  MCPServerType,
  SessionState
} from '../types.js';

export interface ClaudeCodeHookOptions {
  enablePreToolUse: boolean;
  enablePostToolUse: boolean;
  enableContextTracking: boolean;
  performanceTargetMs: number;
  maxConcurrentHooks: number;
}

/**
 * Core integration engine for Claude Code hooks
 * Provides real-time event handling and MCP server coordination
 */
export class ClaudeCodeIntegration extends EventEmitter {
  private sessionStates: Map<string, SessionState> = new Map();
  private activeExecutions: Map<string, Date> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();
  private readonly options: ClaudeCodeHookOptions;

  constructor(options: Partial<ClaudeCodeHookOptions> = {}) {
    super();
    this.options = {
      enablePreToolUse: true,
      enablePostToolUse: true,
      enableContextTracking: true,
      performanceTargetMs: 100,
      maxConcurrentHooks: 10,
      ...options
    };

    this.setupEventHandlers();
    logger.info('Claude Code Integration initialized', { options: this.options });
  }

  /**
   * Hook into Claude Code tool execution - called before tool execution
   */
  async onPreToolUse(toolContext: ClaudeCodeToolContext): Promise<BridgeHookResult> {
    const startTime = performance.now();
    const executionId = toolContext.executionId || this.generateExecutionId();

    try {
      // Update active executions
      this.activeExecutions.set(executionId, new Date());

      // Create bridge hook context
      const bridgeContext: BridgeHookContext = {
        operation: toolContext.toolName,
        args: toolContext.toolArgs,
        sessionId: toolContext.sessionId,
        executionId,
        timestamp: new Date(),
        claudeCode: toolContext,
        event: 'pre_tool_use',
        performanceBudget: {
          maxExecutionTime: this.options.performanceTargetMs,
          priority: this.determineOperationPriority(toolContext.toolName),
        },
        flags: this.extractFlags(toolContext.toolArgs),
        sessionState: this.getSessionState(toolContext.sessionId)?.context,
      };

      // Emit pre-tool-use event for hook handlers
      this.emit('pre_tool_use', bridgeContext);

      // Determine complexity and persona
      const complexity = this.analyzeComplexity(toolContext);
      const persona = this.suggestPersona(toolContext);

      bridgeContext.complexity = complexity;
      bridgeContext.persona = persona;

      // Route to appropriate MCP servers
      const mcpRouting = this.determineMCPRouting(bridgeContext);

      // Update session state
      if (this.options.enableContextTracking) {
        this.updateSessionState(toolContext.sessionId, {
          lastToolExecution: {
            toolName: toolContext.toolName,
            executionId,
            timestamp: new Date(),
            args: toolContext.toolArgs,
          }
        });
      }

      const duration = performance.now() - startTime;
      this.recordPerformanceMetric('pre_tool_use', duration);

      return {
        success: true,
        data: {
          executionId,
          complexity,
          persona,
          mcpRouting,
        },
        performance: {
          duration,
          cacheHitRate: this.calculateCacheHitRate(toolContext.sessionId),
        },
        nextOperationHints: {
          recommendedServers: mcpRouting.targetServers,
          estimatedComplexity: complexity,
          suggestedPersona: persona,
        },
        sessionStateUpdates: {
          lastPreToolUse: new Date().toISOString(),
          executionId,
        },
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Pre-tool-use hook failed', {
        toolName: toolContext.toolName,
        executionId,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        error: errorMessage,
        performance: { duration },
      };
    }
  }

  /**
   * Hook into Claude Code tool execution - called after tool execution
   */
  async onPostToolUse(
    toolContext: ClaudeCodeToolContext, 
    toolResult: unknown,
    error?: Error
  ): Promise<BridgeHookResult> {
    const startTime = performance.now();
    const executionId = toolContext.executionId || this.generateExecutionId();

    try {
      // Calculate execution time if we have start time
      const startExecution = this.activeExecutions.get(executionId);
      const toolExecutionTime = startExecution 
        ? Date.now() - startExecution.getTime()
        : 0;

      // Clean up active executions
      this.activeExecutions.delete(executionId);

      // Create bridge hook context
      const bridgeContext: BridgeHookContext = {
        operation: toolContext.toolName,
        args: toolContext.toolArgs,
        sessionId: toolContext.sessionId,
        executionId,
        timestamp: new Date(),
        claudeCode: toolContext,
        event: 'post_tool_use',
        flags: this.extractFlags(toolContext.toolArgs),
        sessionState: this.getSessionState(toolContext.sessionId)?.context,
        previousResults: { toolResult, error: error?.message },
      };

      // Emit post-tool-use event for hook handlers
      this.emit('post_tool_use', bridgeContext, toolResult, error);

      // Update session state with execution results
      if (this.options.enableContextTracking) {
        this.updateSessionState(toolContext.sessionId, {
          lastExecution: {
            toolName: toolContext.toolName,
            executionId,
            timestamp: new Date(),
            duration: toolExecutionTime,
            success: !error,
            result: error ? null : toolResult,
          }
        });

        // Update session performance metrics
        this.updateSessionPerformance(toolContext.sessionId, {
          executionTime: toolExecutionTime,
          success: !error,
          tokenUsage: this.estimateTokenUsage(toolContext, toolResult),
        });
      }

      const duration = performance.now() - startTime;
      this.recordPerformanceMetric('post_tool_use', duration);

      return {
        success: true,
        data: {
          executionId,
          toolExecutionTime,
          toolSuccess: !error,
        },
        performance: {
          duration,
          tokenUsage: this.estimateTokenUsage(toolContext, toolResult),
        },
        sessionStateUpdates: {
          lastPostToolUse: new Date().toISOString(),
          lastToolSuccess: !error,
          executionCount: (this.getSessionState(toolContext.sessionId)?.performance.totalExecutions || 0) + 1,
        },
      };

    } catch (hookError) {
      const duration = performance.now() - startTime;
      const errorMessage = hookError instanceof Error ? hookError.message : 'Unknown error';
      
      logger.error('Post-tool-use hook failed', {
        toolName: toolContext.toolName,
        executionId,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        error: errorMessage,
        performance: { duration },
      };
    }
  }

  /**
   * Handle session start events
   */
  async onSessionStart(sessionId: string, context?: Record<string, unknown>): Promise<void> {
    const sessionState: SessionState = {
      sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      context: context || {},
      executionHistory: [],
      performance: {
        totalExecutions: 0,
        averageExecutionTime: 0,
        successRate: 1.0,
        tokenUsage: 0,
      },
    };

    this.sessionStates.set(sessionId, sessionState);
    this.emit('session_start', sessionState);
    
    logger.info('Session started', { sessionId });
  }

  /**
   * Handle session end events
   */
  async onSessionEnd(sessionId: string): Promise<void> {
    const sessionState = this.sessionStates.get(sessionId);
    
    if (sessionState) {
      // Emit session end event with final metrics
      this.emit('session_end', sessionState);
      
      // Clean up session state
      this.sessionStates.delete(sessionId);
      
      logger.info('Session ended', {
        sessionId,
        duration: Date.now() - sessionState.startTime.getTime(),
        totalExecutions: sessionState.performance.totalExecutions,
        successRate: sessionState.performance.successRate,
      });
    }
  }

  /**
   * Get current session state
   */
  getSessionState(sessionId: string): SessionState | undefined {
    return this.sessionStates.get(sessionId);
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [operation, times] of this.performanceMetrics.entries()) {
      if (times.length > 0) {
        metrics[operation] = {
          count: times.length,
          avgMs: times.reduce((sum, time) => sum + time, 0) / times.length,
          maxMs: Math.max(...times),
          minMs: Math.min(...times),
          targetMet: times.slice(-10).every(time => time <= this.options.performanceTargetMs),
        };
      }
    }

    return {
      operations: metrics,
      activeSessions: this.sessionStates.size,
      activeExecutions: this.activeExecutions.size,
      targetPerformanceMs: this.options.performanceTargetMs,
    };
  }

  // ===================== PRIVATE IMPLEMENTATION =====================

  private setupEventHandlers(): void {
    // Set up internal event handlers for monitoring and coordination
    this.on('pre_tool_use', (context: BridgeHookContext) => {
      logger.debug('Pre-tool-use event', {
        operation: context.operation,
        sessionId: context.sessionId,
        executionId: context.executionId,
      });
    });

    this.on('post_tool_use', (context: BridgeHookContext, result: unknown, error?: Error) => {
      logger.debug('Post-tool-use event', {
        operation: context.operation,
        sessionId: context.sessionId,
        executionId: context.executionId,
        success: !error,
      });
    });
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractFlags(toolArgs: Record<string, unknown>): string[] {
    const flags: string[] = [];
    
    // Extract common flags from tool arguments
    if (typeof toolArgs === 'object' && toolArgs !== null) {
      const argsString = JSON.stringify(toolArgs).toLowerCase();
      
      if (argsString.includes('--uc') || argsString.includes('ultracompressed')) {
        flags.push('--uc');
      }
      if (argsString.includes('--think')) {
        flags.push('--think');
      }
      if (argsString.includes('--delegate')) {
        flags.push('--delegate');
      }
      if (argsString.includes('--wave')) {
        flags.push('--wave');
      }
    }

    return flags;
  }

  private determineOperationPriority(toolName: string): 'low' | 'medium' | 'high' | 'critical' {
    // Prioritize operations based on tool type
    const highPriorityTools = ['Write', 'Edit', 'MultiEdit', 'Bash'];
    const criticalTools = ['mcp__playwright', 'mcp__sequential-thinking'];
    
    if (criticalTools.some(tool => toolName.includes(tool))) {
      return 'critical';
    }
    if (highPriorityTools.includes(toolName)) {
      return 'high';
    }
    if (toolName.startsWith('mcp__')) {
      return 'medium';
    }
    
    return 'low';
  }

  private analyzeComplexity(toolContext: ClaudeCodeToolContext): ComplexityLevel {
    let complexityScore = 0;

    // Base complexity by tool type
    const toolComplexityMap: Record<string, number> = {
      'Read': 0.1,
      'Write': 0.3,
      'Edit': 0.4,
      'MultiEdit': 0.6,
      'Bash': 0.5,
      'Grep': 0.2,
      'mcp__sequential-thinking': 0.9,
      'mcp__magic': 0.6,
      'mcp__playwright': 0.8,
    };

    for (const [tool, score] of Object.entries(toolComplexityMap)) {
      if (toolContext.toolName.includes(tool)) {
        complexityScore = Math.max(complexityScore, score);
        break;
      }
    }

    // Adjust for argument complexity
    const argCount = Object.keys(toolContext.toolArgs).length;
    complexityScore += Math.min(0.2, argCount * 0.03);

    // Determine complexity level
    if (complexityScore >= 0.8) return 'critical';
    if (complexityScore >= 0.6) return 'complex';
    if (complexityScore >= 0.3) return 'moderate';
    return 'simple';
  }

  private suggestPersona(toolContext: ClaudeCodeToolContext): PersonaType | undefined {
    const toolName = toolContext.toolName.toLowerCase();
    const argsString = JSON.stringify(toolContext.toolArgs).toLowerCase();

    // Tool-based persona suggestions
    if (toolName.includes('magic') || argsString.includes('component') || argsString.includes('ui')) {
      return 'frontend';
    }
    if (toolName.includes('sequential') || argsString.includes('analyze')) {
      return 'analyzer';
    }
    if (toolName.includes('playwright') || argsString.includes('test')) {
      return 'qa';
    }
    if (argsString.includes('security') || argsString.includes('vulnerability')) {
      return 'security';
    }
    if (argsString.includes('performance') || argsString.includes('optimize')) {
      return 'performance';
    }
    if (argsString.includes('document') || argsString.includes('write')) {
      return 'scribe';
    }

    return undefined;
  }

  private determineMCPRouting(context: BridgeHookContext): any {
    const servers: MCPServerType[] = [];
    const toolName = context.operation.toLowerCase();

    // Tool-specific routing
    if (toolName.includes('sequential')) {
      servers.push('sequential', 'superclaude-intelligence');
    } else if (toolName.includes('magic')) {
      servers.push('magic', 'superclaude-ui');
    } else if (toolName.includes('playwright')) {
      servers.push('playwright', 'superclaude-quality');
    } else if (toolName.includes('context7')) {
      servers.push('context7', 'superclaude-code');
    } else {
      // Default routing based on complexity
      servers.push('superclaude-orchestrator');
      
      if (context.complexity === 'complex' || context.complexity === 'critical') {
        servers.push('superclaude-intelligence', 'superclaude-performance');
      }
    }

    // Always include performance monitoring for high-priority operations
    if (context.performanceBudget?.priority === 'high' || context.performanceBudget?.priority === 'critical') {
      if (!servers.includes('superclaude-performance')) {
        servers.push('superclaude-performance');
      }
    }

    return {
      targetServers: servers,
      strategy: servers.length > 1 ? 'parallel' : 'sequential',
      timeout: context.performanceBudget?.maxExecutionTime || 5000,
      priority: context.performanceBudget?.priority || 'medium',
    };
  }

  private updateSessionState(sessionId: string, updates: Record<string, unknown>): void {
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      Object.assign(sessionState.context, updates);
      sessionState.lastActivity = new Date();
    }
  }

  private updateSessionPerformance(
    sessionId: string, 
    execution: { executionTime: number; success: boolean; tokenUsage: number }
  ): void {
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      const perf = sessionState.performance;
      
      // Update execution history
      sessionState.executionHistory.push({
        toolName: '', // Will be set by caller
        executionId: '',
        timestamp: new Date(),
        duration: execution.executionTime,
        success: execution.success,
      });

      // Update performance metrics
      perf.totalExecutions += 1;
      perf.averageExecutionTime = (
        (perf.averageExecutionTime * (perf.totalExecutions - 1) + execution.executionTime) / 
        perf.totalExecutions
      );
      
      const successfulExecutions = sessionState.executionHistory.filter(e => e.success).length;
      perf.successRate = successfulExecutions / perf.totalExecutions;
      perf.tokenUsage += execution.tokenUsage;

      // Keep execution history manageable
      if (sessionState.executionHistory.length > 100) {
        sessionState.executionHistory = sessionState.executionHistory.slice(-50);
      }
    }
  }

  private calculateCacheHitRate(sessionId: string): number {
    const sessionState = this.sessionStates.get(sessionId);
    if (!sessionState || sessionState.executionHistory.length === 0) {
      return 0;
    }

    // Simple cache hit rate calculation based on recent execution patterns
    const recentExecutions = sessionState.executionHistory.slice(-10);
    const uniqueOperations = new Set(recentExecutions.map(e => e.toolName)).size;
    
    return 1 - (uniqueOperations / recentExecutions.length);
  }

  private estimateTokenUsage(toolContext: ClaudeCodeToolContext, result: unknown): number {
    // Simple token usage estimation
    const inputTokens = JSON.stringify(toolContext.toolArgs).length / 4; // ~4 chars per token
    const outputTokens = result ? JSON.stringify(result).length / 4 : 0;
    
    return Math.round(inputTokens + outputTokens);
  }

  private recordPerformanceMetric(operation: string, duration: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    
    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      this.performanceMetrics.set(operation, metrics.slice(-50));
    }
  }
}