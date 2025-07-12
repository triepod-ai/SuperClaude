/**
 * SuperClaude Bridge Hooks
 * 
 * Complete bridge-hooks integration system for Claude Code
 * with real MCP server routing, performance optimization, and context preservation.
 */

// Core types and interfaces
export * from './types.js';
export * from './registry.js';

// Core integration components
export { ClaudeCodeIntegration } from './core/ClaudeCodeIntegration.js';
export { MCPServerRouter } from './core/MCPServerRouter.js';
export { PerformanceMonitor } from './core/PerformanceMonitor.js';
export { ContextPreservationManager } from './core/ContextPreservationManager.js';
export { BridgeOrchestrator } from './core/BridgeOrchestrator.js';

// Export commonly used shared utilities
export { logger, type Task, type PersonaType } from '@superclaude/shared';

// Main factory function for easy initialization
import { BridgeOrchestrator } from './core/BridgeOrchestrator.js';
import { BridgeHookRegistry } from './registry.js';
import { logger } from '@superclaude/shared';
import type { 
  BridgeHookConfig, 
  ClaudeCodeEvent, 
  ClaudeCodeToolContext,
  BridgeHookResult 
} from './types.js';

/**
 * Factory function to create a complete bridge-hooks integration
 */
export function createSuperClaudeBridge(config?: Partial<BridgeHookConfig>) {
  const registry = new BridgeHookRegistry(config);
  const orchestrator = new BridgeOrchestrator({
    performanceTargetMs: config?.performanceTarget || 100,
    maxConcurrentOperations: config?.maxConcurrentHooks || 10,
    enableClaudeCodeIntegration: config?.claudeCodeIntegration?.enabled !== false,
    enableMCPRouting: config?.mcpRouting?.enabled !== false,
    enablePerformanceMonitoring: config?.enableMetrics !== false,
    enableContextPreservation: config?.claudeCodeIntegration?.sessionTrackingEnabled !== false,
    enableIntelligentCaching: config?.enableCaching !== false,
    enablePredictiveOptimization: true,
  });

  // Register default hooks for common operations
  registry.register({
    name: 'claude-code-integration',
    handler: async (context) => {
      try {
        const claudeContext: ClaudeCodeToolContext = {
          toolName: context.operation,
          toolArgs: context.args,
          sessionId: context.sessionId,
          executionId: context.executionId,
          timestamp: context.timestamp,
          environment: {
            workingDirectory: process.cwd(),
            platform: process.platform,
            nodeVersion: process.version,
            gitRepo: true, // Simplified detection
          },
        };

        const event: ClaudeCodeEvent = context.event || 'pre_tool_use';
        return await orchestrator.handleClaudeCodeEvent(event, claudeContext);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    priority: 100,
    enabled: true,
    description: 'Main Claude Code integration hook',
    claudeCodeEvents: ['pre_tool_use', 'post_tool_use', 'context_update', 'session_start', 'session_end'],
    expectedExecutionTime: config?.performanceTarget || 100,
    maxExecutionTime: (config?.performanceTarget || 100) * 2,
    resourceRequirements: {
      cpu: 'medium',
      memory: 'low',
      network: true,
    },
  });

  // Register performance monitoring hook
  registry.register({
    name: 'performance-monitor',
    handler: async (context) => {
      const startTime = performance.now();
      
      try {
        // This is a passthrough hook that just monitors
        const duration = performance.now() - startTime;
        
        return {
          success: true,
          data: {
            monitored: true,
            performanceTarget: config?.performanceTarget || 100,
          },
          performance: {
            duration,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          },
        };
      } catch (error) {
        const duration = performance.now() - startTime;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          performance: { duration },
        };
      }
    },
    priority: 90,
    enabled: config?.enableMetrics !== false,
    description: 'Performance monitoring and optimization hook',
    expectedExecutionTime: 10,
    maxExecutionTime: 50,
    resourceRequirements: {
      cpu: 'low',
      memory: 'low',
      network: false,
    },
  });

  // Set up event forwarding from orchestrator to registry
  orchestrator.on('performance_alert', (alert) => {
    registry.emit('performance_alert', alert);
  });

  orchestrator.on('operation_completed', (data) => {
    registry.emit('operation_completed', data);
  });

  return {
    registry,
    orchestrator,
    
    /**
     * Main entry point for Claude Code tool events
     */
    async handleToolEvent(
      event: ClaudeCodeEvent,
      toolName: string,
      toolArgs: Record<string, unknown>,
      sessionId: string,
      toolResult?: unknown,
      error?: Error
    ): Promise<BridgeHookResult> {
      const context: ClaudeCodeToolContext = {
        toolName,
        toolArgs,
        sessionId,
        executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        environment: {
          workingDirectory: process.cwd(),
          platform: process.platform,
          nodeVersion: process.version,
          gitRepo: true,
        },
      };

      return orchestrator.handleClaudeCodeEvent(event, context, toolResult, error);
    },

    /**
     * Get comprehensive system status
     */
    getSystemStatus() {
      return {
        registry: registry.getStats(),
        orchestrator: orchestrator.getSystemStatus(),
      };
    },

    /**
     * Get performance recommendations
     */
    getOptimizationRecommendations() {
      return orchestrator.getOptimizationRecommendations();
    },

    /**
     * Cleanup all resources
     */
    cleanup() {
      registry.clear();
      orchestrator.cleanup();
      logger.info('SuperClaude Bridge cleanup completed');
    },
  };
}

/**
 * Quick start function for basic Claude Code integration
 */
export function createBasicClaudeCodeBridge() {
  return createSuperClaudeBridge({
    enableMetrics: true,
    enableCaching: true,
    performanceTarget: 100,
    maxConcurrentHooks: 5,
    logLevel: 'info',
    claudeCodeIntegration: {
      enabled: true,
      toolEventBuffer: 50,
      sessionTrackingEnabled: true,
      contextPreservationTTL: 1800, // 30 minutes
    },
    mcpRouting: {
      enabled: true,
      fallbackTimeout: 5000,
      healthCheckInterval: 30000,
      loadBalancing: 'least-loaded',
    },
    environment: {
      development: process.env.NODE_ENV === 'development',
      maxDebugOutput: 1000,
      enableDetailedMetrics: process.env.NODE_ENV === 'development',
    },
  });
}