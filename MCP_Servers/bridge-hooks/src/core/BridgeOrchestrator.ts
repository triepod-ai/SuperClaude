/**
 * Bridge Orchestrator
 * Main orchestration engine that coordinates all bridge-hooks components
 */

import { EventEmitter } from 'events';
import { logger } from '@superclaude/shared';
import { ClaudeCodeIntegration } from './ClaudeCodeIntegration.js';
import { MCPServerRouter } from './MCPServerRouter.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { ContextPreservationManager } from './ContextPreservationManager.js';
import { 
  BridgeHookContext, 
  BridgeHookResult,
  BridgeHookConfig,
  ClaudeCodeToolContext,
  ClaudeCodeEvent,
  MCPRoutingDecision,
  PerformanceAlert
} from '../types.js';

export interface BridgeOrchestratorOptions {
  enableClaudeCodeIntegration: boolean;
  enableMCPRouting: boolean;
  enablePerformanceMonitoring: boolean;
  enableContextPreservation: boolean;
  performanceTargetMs: number;
  maxConcurrentOperations: number;
  enableIntelligentCaching: boolean;
  enablePredictiveOptimization: boolean;
}

/**
 * Main orchestrator for all bridge-hooks functionality
 * Provides seamless integration between Claude Code and MCP servers
 */
export class BridgeOrchestrator extends EventEmitter {
  private claudeCodeIntegration: ClaudeCodeIntegration;
  private mcpRouter: MCPServerRouter;
  private performanceMonitor: PerformanceMonitor;
  private contextManager: ContextPreservationManager;
  private readonly options: BridgeOrchestratorOptions;
  private readonly activeOperations: Set<string> = new Set();

  constructor(options: Partial<BridgeOrchestratorOptions> = {}) {
    super();

    this.options = {
      enableClaudeCodeIntegration: true,
      enableMCPRouting: true,
      enablePerformanceMonitoring: true,
      enableContextPreservation: true,
      performanceTargetMs: 100,
      maxConcurrentOperations: 10,
      enableIntelligentCaching: true,
      enablePredictiveOptimization: true,
      ...options
    };

    this.initializeComponents();
    this.setupEventHandlers();

    logger.info('Bridge Orchestrator initialized', { options: this.options });
  }

  /**
   * Main entry point for Claude Code tool execution hooks
   */
  async handleClaudeCodeEvent(
    event: ClaudeCodeEvent,
    toolContext: ClaudeCodeToolContext,
    toolResult?: unknown,
    error?: Error
  ): Promise<BridgeHookResult> {
    const operationId = toolContext.executionId || this.generateOperationId();
    const startTime = performance.now();

    try {
      // Check concurrency limits
      if (this.activeOperations.size >= this.options.maxConcurrentOperations) {
        return {
          success: false,
          error: 'Maximum concurrent operations exceeded',
          performance: { duration: performance.now() - startTime },
        };
      }

      this.activeOperations.add(operationId);

      // Initialize/update session
      if (this.options.enableContextPreservation) {
        this.contextManager.initializeSession(toolContext.sessionId);
      }

      // Route based on event type
      let result: BridgeHookResult;

      switch (event) {
        case 'pre_tool_use':
          result = await this.handlePreToolUse(operationId, toolContext);
          break;
        case 'post_tool_use':
          result = await this.handlePostToolUse(operationId, toolContext, toolResult, error);
          break;
        case 'context_update':
          result = await this.handleContextUpdate(operationId, toolContext);
          break;
        case 'session_start':
          result = await this.handleSessionStart(toolContext.sessionId);
          break;
        case 'session_end':
          result = await this.handleSessionEnd(toolContext.sessionId);
          break;
        default:
          throw new Error(`Unknown Claude Code event: ${event}`);
      }

      // Add orchestrator metadata
      result.metadata = {
        ...result.metadata,
        orchestrator: {
          operationId,
          event,
          componentsEnabled: {
            claudeCode: this.options.enableClaudeCodeIntegration,
            mcpRouting: this.options.enableMCPRouting,
            performance: this.options.enablePerformanceMonitoring,
            context: this.options.enableContextPreservation,
          },
        },
      };

      const totalDuration = performance.now() - startTime;
      
      // Update result with total orchestration time
      if (result.performance) {
        result.performance.duration = totalDuration;
      }

      // Emit orchestration event
      this.emit('operation_completed', {
        operationId,
        event,
        toolName: toolContext.toolName,
        duration: totalDuration,
        success: result.success,
      });

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Bridge orchestration failed', {
        operationId,
        event,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        error: errorMessage,
        performance: { duration },
      };
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): {
    orchestrator: any;
    claudeCode: any;
    mcpRouter: any;
    performance: any;
    context: any;
  } {
    return {
      orchestrator: {
        activeOperations: this.activeOperations.size,
        maxConcurrentOperations: this.options.maxConcurrentOperations,
        performanceTarget: this.options.performanceTargetMs,
        componentsEnabled: {
          claudeCode: this.options.enableClaudeCodeIntegration,
          mcpRouting: this.options.enableMCPRouting,
          performance: this.options.enablePerformanceMonitoring,
          context: this.options.enableContextPreservation,
        },
      },
      claudeCode: this.options.enableClaudeCodeIntegration 
        ? this.claudeCodeIntegration.getPerformanceMetrics() 
        : null,
      mcpRouter: this.options.enableMCPRouting 
        ? this.mcpRouter.getPerformanceMetrics() 
        : null,
      performance: this.options.enablePerformanceMonitoring 
        ? this.performanceMonitor.getPerformanceStats() 
        : null,
      context: this.options.enableContextPreservation 
        ? { activeSessions: this.contextManager.getActiveSessions() }
        : null,
    };
  }

  /**
   * Get performance recommendations across all components
   */
  getOptimizationRecommendations(): any[] {
    const recommendations: any[] = [];

    if (this.options.enablePerformanceMonitoring) {
      recommendations.push(...this.performanceMonitor.getOptimizationRecommendations());
    }

    // Add orchestrator-level recommendations
    const systemStatus = this.getSystemStatus();
    
    if (systemStatus.orchestrator.activeOperations > this.options.maxConcurrentOperations * 0.8) {
      recommendations.push({
        type: 'load_balancing',
        description: 'High concurrent operation load detected. Consider increasing limits or adding throttling.',
        expectedImprovement: 25,
        implementationCost: 'medium',
        priority: 7,
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update configuration at runtime
   */
  updateConfiguration(updates: Partial<BridgeOrchestratorOptions>): void {
    Object.assign(this.options, updates);
    
    logger.info('Bridge orchestrator configuration updated', { updates });
    this.emit('configuration_updated', this.options);
  }

  // ===================== PRIVATE IMPLEMENTATION =====================

  private initializeComponents(): void {
    // Initialize Claude Code integration
    if (this.options.enableClaudeCodeIntegration) {
      this.claudeCodeIntegration = new ClaudeCodeIntegration({
        performanceTargetMs: this.options.performanceTargetMs,
        maxConcurrentHooks: this.options.maxConcurrentOperations,
        enableContextTracking: this.options.enableContextPreservation,
      });
    }

    // Initialize MCP router
    if (this.options.enableMCPRouting) {
      this.mcpRouter = new MCPServerRouter({
        executionTime: { 
          target: this.options.performanceTargetMs, 
          warning: this.options.performanceTargetMs * 1.5,
          critical: this.options.performanceTargetMs * 2
        },
      });
    }

    // Initialize performance monitor
    if (this.options.enablePerformanceMonitoring) {
      this.performanceMonitor = new PerformanceMonitor({
        executionTime: { 
          target: this.options.performanceTargetMs, 
          warning: this.options.performanceTargetMs * 1.5,
          critical: this.options.performanceTargetMs * 2
        },
      });
    }

    // Initialize context manager
    if (this.options.enableContextPreservation) {
      this.contextManager = new ContextPreservationManager();
    }
  }

  private setupEventHandlers(): void {
    // Performance monitoring events
    if (this.performanceMonitor) {
      this.performanceMonitor.on('performance_alert', (alert: PerformanceAlert) => {
        this.emit('performance_alert', alert);
        logger.warn('Performance alert from monitor', alert);
      });

      this.performanceMonitor.on('cache_hit', (data: any) => {
        this.emit('cache_hit', data);
      });
    }

    // MCP router events
    if (this.mcpRouter) {
      this.mcpRouter.on('server_availability_changed', (serverId: string, available: boolean) => {
        this.emit('mcp_server_availability', { serverId, available });
      });

      this.mcpRouter.on('performance_alert', (alert: PerformanceAlert) => {
        this.emit('performance_alert', alert);
      });
    }

    // Context manager events
    if (this.contextManager) {
      this.contextManager.on('session_initialized', (session: any) => {
        this.emit('session_initialized', session);
      });

      this.contextManager.on('sessions_cleaned', (sessionIds: string[]) => {
        this.emit('sessions_cleaned', sessionIds);
      });
    }

    // Claude Code integration events
    if (this.claudeCodeIntegration) {
      this.claudeCodeIntegration.on('session_start', (session: any) => {
        this.emit('claude_session_start', session);
      });

      this.claudeCodeIntegration.on('session_end', (session: any) => {
        this.emit('claude_session_end', session);
      });
    }
  }

  private async handlePreToolUse(
    operationId: string, 
    toolContext: ClaudeCodeToolContext
  ): Promise<BridgeHookResult> {
    const results: Record<string, any> = {};

    // Start performance monitoring
    if (this.performanceMonitor) {
      const bridgeContext = this.createBridgeContext(toolContext, operationId);
      this.performanceMonitor.startOperation(operationId, bridgeContext);
    }

    // Handle Claude Code integration
    if (this.claudeCodeIntegration) {
      const claudeResult = await this.claudeCodeIntegration.onPreToolUse(toolContext);
      results.claudeCode = claudeResult;
      
      if (!claudeResult.success) {
        return claudeResult; // Early return on Claude Code failure
      }
    }

    // Create enriched bridge context
    const bridgeContext = this.createBridgeContext(toolContext, operationId);
    
    // Enrich with context preservation
    const enrichedContext = this.contextManager 
      ? this.contextManager.getEnrichedContext(toolContext.sessionId, bridgeContext)
      : bridgeContext;

    // Route to MCP servers
    if (this.mcpRouter) {
      const routingDecision = await this.mcpRouter.routeRequest(enrichedContext);
      results.mcpRouting = routingDecision;

      // Execute MCP routing if configured
      if (routingDecision.targetServers.length > 0) {
        const mcpResult = await this.mcpRouter.executeRequest(routingDecision, enrichedContext);
        results.mcpExecution = mcpResult;
      }
    }

    // Apply caching if enabled
    if (this.options.enableIntelligentCaching && this.performanceMonitor) {
      const cacheKey = this.performanceMonitor.generateCacheKey(enrichedContext);
      const cachedResult = this.performanceMonitor.getCachedResult(cacheKey);
      
      if (cachedResult) {
        results.cached = true;
        results.cachedResult = cachedResult;
      }
    }

    return {
      success: true,
      data: results,
      metadata: {
        operationId,
        enrichedContext: !!this.contextManager,
        mcpRouted: !!this.mcpRouter,
        cached: !!results.cached,
      },
    };
  }

  private async handlePostToolUse(
    operationId: string,
    toolContext: ClaudeCodeToolContext,
    toolResult?: unknown,
    error?: Error
  ): Promise<BridgeHookResult> {
    const results: Record<string, any> = {};

    // Handle Claude Code integration
    if (this.claudeCodeIntegration) {
      const claudeResult = await this.claudeCodeIntegration.onPostToolUse(
        toolContext, 
        toolResult, 
        error
      );
      results.claudeCode = claudeResult;
    }

    // Create bridge context for post-processing
    const bridgeContext = this.createBridgeContext(toolContext, operationId);
    const result: BridgeHookResult = {
      success: !error,
      data: toolResult,
      error: error?.message,
    };

    // Complete performance monitoring
    if (this.performanceMonitor) {
      const metric = this.performanceMonitor.completeOperation(operationId, bridgeContext, result);
      results.performanceMetric = metric;

      // Cache result if appropriate
      if (this.options.enableIntelligentCaching && 
          this.performanceMonitor.shouldCache(bridgeContext) && 
          !error) {
        const cacheKey = this.performanceMonitor.generateCacheKey(bridgeContext);
        this.performanceMonitor.cacheResult(cacheKey, toolResult);
        results.cached = true;
      }
    }

    // Update context preservation
    if (this.contextManager) {
      this.contextManager.updateSessionContext(toolContext.sessionId, bridgeContext, result);
      
      // Generate predictions if enabled
      if (this.options.enablePredictiveOptimization) {
        const prediction = this.contextManager.predictNextOperation(toolContext.sessionId);
        results.prediction = prediction;
      }
    }

    return {
      success: true,
      data: results,
      metadata: {
        operationId,
        toolExecutionSuccess: !error,
        performanceTracked: !!this.performanceMonitor,
        contextUpdated: !!this.contextManager,
        predictionGenerated: !!results.prediction,
      },
    };
  }

  private async handleContextUpdate(
    operationId: string,
    toolContext: ClaudeCodeToolContext
  ): Promise<BridgeHookResult> {
    const results: Record<string, any> = {};

    if (this.contextManager) {
      // Force context snapshot creation
      const sessionStats = this.contextManager.getSessionStatistics(toolContext.sessionId);
      results.sessionStats = sessionStats;

      // Generate fresh predictions
      const prediction = this.contextManager.predictNextOperation(toolContext.sessionId);
      results.prediction = prediction;
    }

    return {
      success: true,
      data: results,
      metadata: { operationId, event: 'context_update' },
    };
  }

  private async handleSessionStart(sessionId: string): Promise<BridgeHookResult> {
    const results: Record<string, any> = {};

    if (this.claudeCodeIntegration) {
      await this.claudeCodeIntegration.onSessionStart(sessionId);
      results.claudeCodeSessionInitialized = true;
    }

    if (this.contextManager) {
      const session = this.contextManager.initializeSession(sessionId);
      results.sessionInitialized = session;
    }

    return {
      success: true,
      data: results,
      metadata: { event: 'session_start', sessionId },
    };
  }

  private async handleSessionEnd(sessionId: string): Promise<BridgeHookResult> {
    const results: Record<string, any> = {};

    // Get final session statistics
    if (this.contextManager) {
      const sessionStats = this.contextManager.getSessionStatistics(sessionId);
      results.finalSessionStats = sessionStats;
    }

    if (this.claudeCodeIntegration) {
      await this.claudeCodeIntegration.onSessionEnd(sessionId);
      results.claudeCodeSessionEnded = true;
    }

    return {
      success: true,
      data: results,
      metadata: { event: 'session_end', sessionId },
    };
  }

  private createBridgeContext(
    toolContext: ClaudeCodeToolContext, 
    operationId: string
  ): BridgeHookContext {
    return {
      operation: toolContext.toolName,
      args: toolContext.toolArgs,
      sessionId: toolContext.sessionId,
      executionId: operationId,
      timestamp: new Date(),
      claudeCode: toolContext,
      flags: this.extractFlags(toolContext.toolArgs),
      performanceBudget: {
        maxExecutionTime: this.options.performanceTargetMs,
        priority: 'medium',
      },
    };
  }

  private extractFlags(toolArgs: Record<string, unknown>): string[] {
    const flags: string[] = [];
    const argsString = JSON.stringify(toolArgs).toLowerCase();
    
    const flagPatterns = ['--uc', '--think', '--delegate', '--wave', '--seq', '--magic', '--play'];
    
    for (const flag of flagPatterns) {
      if (argsString.includes(flag)) {
        flags.push(flag);
      }
    }

    return flags;
  }

  private generateOperationId(): string {
    return `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup all components
   */
  cleanup(): void {
    this.activeOperations.clear();
    
    if (this.claudeCodeIntegration) {
      // ClaudeCodeIntegration cleanup if it has one
    }
    
    if (this.mcpRouter) {
      this.mcpRouter.cleanup();
    }
    
    if (this.performanceMonitor) {
      this.performanceMonitor.cleanup();
    }
    
    if (this.contextManager) {
      this.contextManager.cleanup();
    }

    logger.info('Bridge Orchestrator cleanup completed');
  }
}