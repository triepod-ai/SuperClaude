/**
 * Bridge-Hooks Integration Example
 * Demonstrates complete Claude Code integration with MCP server routing
 */

import { 
  createSuperClaudeBridge, 
  createBasicClaudeCodeBridge,
  getConfigurationManager,
  ConfigurationPresets
} from '../index.js';
import { logger } from '@superclaude/shared';

/**
 * Example 1: Basic Claude Code Integration
 */
export async function basicClaudeCodeExample() {
  console.log('\n=== Basic Claude Code Integration Example ===\n');
  
  const bridge = createBasicClaudeCodeBridge();
  
  try {
    // Simulate Claude Code tool execution events
    console.log('1. Starting session...');
    const sessionId = `session_${Date.now()}`;
    
    const sessionStart = await bridge.handleToolEvent(
      'session_start',
      'session_init',
      { userId: 'test-user' },
      sessionId
    );
    console.log('Session started:', sessionStart.success);

    console.log('\n2. Executing Read tool...');
    const readResult = await bridge.handleToolEvent(
      'pre_tool_use',
      'Read',
      { file_path: '/test/example.py' },
      sessionId
    );
    console.log('Read tool pre-execution:', {
      success: readResult.success,
      duration: readResult.performance?.duration,
      mcpServers: readResult.data?.mcpRouting?.targetServers,
    });

    // Simulate post-tool execution
    const readPostResult = await bridge.handleToolEvent(
      'post_tool_use',
      'Read',
      { file_path: '/test/example.py' },
      sessionId,
      'file_content_here'
    );
    console.log('Read tool post-execution:', {
      success: readPostResult.success,
      cached: readPostResult.data?.cached,
      prediction: readPostResult.data?.prediction?.nextLikelyTool,
    });

    console.log('\n3. Executing complex analysis tool...');
    const analysisResult = await bridge.handleToolEvent(
      'pre_tool_use',
      'mcp__sequential-thinking__sequentialthinking',
      { 
        thought: 'Analyzing complex architecture patterns',
        thoughtNumber: 1,
        complexity: 'high'
      },
      sessionId
    );
    console.log('Analysis tool execution:', {
      success: analysisResult.success,
      mcpServers: analysisResult.data?.mcpRouting?.targetServers,
      strategy: analysisResult.data?.mcpRouting?.strategy,
    });

    console.log('\n4. System status...');
    const status = bridge.getSystemStatus();
    console.log('System Status:', {
      activeOperations: status.orchestrator.orchestrator.activeOperations,
      registeredHooks: status.registry.totalHooks,
      performance: status.orchestrator.performance?.summary,
    });

    console.log('\n5. Performance recommendations...');
    const recommendations = bridge.getOptimizationRecommendations();
    recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`Recommendation ${i + 1}:`, {
        type: rec.type,
        description: rec.description,
        expectedImprovement: `${rec.expectedImprovement}%`,
        priority: rec.priority,
      });
    });

    console.log('\n6. Ending session...');
    await bridge.handleToolEvent(
      'session_end',
      'session_cleanup',
      {},
      sessionId
    );

    bridge.cleanup();
    console.log('\nBasic example completed successfully!');

  } catch (error) {
    console.error('Basic example failed:', error);
    bridge.cleanup();
  }
}

/**
 * Example 2: Advanced Configuration and Performance Testing
 */
export async function advancedConfigurationExample() {
  console.log('\n=== Advanced Configuration Example ===\n');

  // Use high-performance configuration
  const configManager = getConfigurationManager('production');
  configManager.updateConfig(ConfigurationPresets.highPerformance());

  const bridge = createSuperClaudeBridge(configManager.getConfig());

  try {
    const sessionId = `perf_session_${Date.now()}`;
    
    console.log('1. Performance testing with concurrent operations...');
    
    // Execute multiple operations concurrently
    const operations = [
      { tool: 'Read', args: { file_path: '/src/component1.tsx' }},
      { tool: 'mcp__magic__21st_magic_component_builder', args: { searchQuery: 'button component' }},
      { tool: 'Grep', args: { pattern: 'useState', glob: '*.tsx' }},
      { tool: 'mcp__context7__resolve-library-id', args: { libraryName: 'react' }},
      { tool: 'Edit', args: { file_path: '/src/component1.tsx', old_string: 'old', new_string: 'new' }},
    ];

    const startTime = performance.now();
    const results = await Promise.all(
      operations.map(op => 
        bridge.handleToolEvent(
          'pre_tool_use',
          op.tool,
          op.args,
          sessionId
        )
      )
    );
    const totalTime = performance.now() - startTime;

    console.log('Concurrent execution results:', {
      totalOperations: operations.length,
      totalTime: `${totalTime.toFixed(2)}ms`,
      averageTime: `${(totalTime / operations.length).toFixed(2)}ms`,
      allSuccessful: results.every(r => r.success),
      mcpRoutingUsed: results.filter(r => r.data?.mcpRouting).length,
    });

    console.log('\n2. MCP server health and routing...');
    const systemStatus = bridge.getSystemStatus();
    const mcpStatus = systemStatus.orchestrator.mcpRouter;
    console.log('MCP Router Status:', {
      totalServers: mcpStatus?.totalServers,
      onlineServers: mcpStatus?.onlineServers,
      averageResponseTime: `${mcpStatus?.averageResponseTime?.toFixed(2)}ms`,
      cacheSize: mcpStatus?.cacheSize,
    });

    console.log('\n3. Performance analysis...');
    const perfStatus = systemStatus.orchestrator.performance;
    console.log('Performance Metrics:', {
      totalOperations: perfStatus?.summary?.totalOperations,
      averageExecutionTime: `${perfStatus?.summary?.averageExecutionTime?.toFixed(2)}ms`,
      successRate: `${(perfStatus?.summary?.successRate * 100)?.toFixed(1)}%`,
      targetMetRate: `${(perfStatus?.summary?.targetMetRate * 100)?.toFixed(1)}%`,
    });

    console.log('\n4. Context preservation...');
    // Execute a sequence of related operations to test context
    const sequence = [
      { tool: 'Read', args: { file_path: '/src/api.ts' }},
      { tool: 'mcp__sequential-thinking__sequentialthinking', args: { thought: 'Analyzing API structure' }},
      { tool: 'Edit', args: { file_path: '/src/api.ts', old_string: 'function', new_string: 'async function' }},
    ];

    for (const [index, op] of sequence.entries()) {
      const result = await bridge.handleToolEvent(
        'pre_tool_use',
        op.tool,
        op.args,
        sessionId
      );
      
      console.log(`Step ${index + 1} (${op.tool}):`, {
        success: result.success,
        contextEnriched: !!result.data?.enrichedContext,
        suggestedPersona: result.data?.persona,
        estimatedComplexity: result.data?.complexity,
      });

      // Simulate post-execution
      await bridge.handleToolEvent(
        'post_tool_use',
        op.tool,
        op.args,
        sessionId,
        `result_${index}`
      );
    }

    console.log('\n5. Configuration validation...');
    const configValidation = configManager.validateConfig();
    console.log('Configuration Validation:', {
      isValid: configValidation.isValid,
      errors: configValidation.errors,
    });

    bridge.cleanup();
    console.log('\nAdvanced example completed successfully!');

  } catch (error) {
    console.error('Advanced example failed:', error);
    bridge.cleanup();
  }
}

/**
 * Example 3: Error Handling and Resilience Testing
 */
export async function errorHandlingExample() {
  console.log('\n=== Error Handling and Resilience Example ===\n');

  const bridge = createBasicClaudeCodeBridge();

  try {
    const sessionId = `error_session_${Date.now()}`;

    console.log('1. Testing invalid tool execution...');
    const invalidResult = await bridge.handleToolEvent(
      'pre_tool_use',
      'NonExistentTool',
      { invalid: 'args' },
      sessionId
    );
    console.log('Invalid tool result:', {
      success: invalidResult.success,
      error: invalidResult.error,
      fallbackApplied: !!invalidResult.data?.mcpRouting,
    });

    console.log('\n2. Testing timeout scenarios...');
    // Simulate a slow operation
    const slowOperation = bridge.handleToolEvent(
      'pre_tool_use',
      'SlowOperation',
      { simulateDelay: 5000 },
      sessionId
    );
    
    const timeoutResult = await Promise.race([
      slowOperation,
      new Promise<any>(resolve => 
        setTimeout(() => resolve({ 
          success: false, 
          error: 'Operation timeout',
          performance: { duration: 5000 }
        }), 1000)
      )
    ]);
    
    console.log('Timeout handling:', {
      success: timeoutResult.success,
      error: timeoutResult.error,
      duration: timeoutResult.performance?.duration,
    });

    console.log('\n3. Testing circuit breaker...');
    // Simulate multiple failures to trigger circuit breaker
    const failureResults = [];
    for (let i = 0; i < 6; i++) {
      const result = await bridge.handleToolEvent(
        'post_tool_use',
        'FailingTool',
        {},
        sessionId,
        null,
        new Error('Simulated failure')
      );
      failureResults.push(result);
    }
    
    console.log('Circuit breaker test:', {
      failures: failureResults.filter(r => !r.success).length,
      lastResult: failureResults[failureResults.length - 1],
    });

    console.log('\n4. Testing recovery...');
    // Test normal operation after failures
    const recoveryResult = await bridge.handleToolEvent(
      'pre_tool_use',
      'Read',
      { file_path: '/recovery/test.txt' },
      sessionId
    );
    console.log('Recovery test:', {
      success: recoveryResult.success,
      mcpRouting: !!recoveryResult.data?.mcpRouting,
    });

    bridge.cleanup();
    console.log('\nError handling example completed successfully!');

  } catch (error) {
    console.error('Error handling example failed:', error);
    bridge.cleanup();
  }
}

/**
 * Example 4: Performance Benchmarking
 */
export async function performanceBenchmarkExample() {
  console.log('\n=== Performance Benchmark Example ===\n');

  const bridge = createSuperClaudeBridge(ConfigurationPresets.highPerformance());

  try {
    const sessionId = `benchmark_session_${Date.now()}`;
    const operations = 100;
    const concurrency = 10;

    console.log(`Running ${operations} operations with concurrency ${concurrency}...`);

    const benchmarkStart = performance.now();
    const batches = [];
    
    for (let i = 0; i < operations; i += concurrency) {
      const batchPromises = [];
      
      for (let j = 0; j < concurrency && (i + j) < operations; j++) {
        const opIndex = i + j;
        batchPromises.push(
          bridge.handleToolEvent(
            'pre_tool_use',
            `Read`,
            { file_path: `/benchmark/file_${opIndex}.txt` },
            sessionId
          )
        );
      }
      
      const batchResults = await Promise.all(batchPromises);
      batches.push(batchResults);
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const benchmarkTime = performance.now() - benchmarkStart;
    const allResults = batches.flat();

    console.log('Benchmark Results:', {
      totalOperations: operations,
      totalTime: `${benchmarkTime.toFixed(2)}ms`,
      averageTime: `${(benchmarkTime / operations).toFixed(2)}ms`,
      operationsPerSecond: Math.round(operations / (benchmarkTime / 1000)),
      successRate: `${(allResults.filter(r => r.success).length / allResults.length * 100).toFixed(1)}%`,
      sub100msOperations: allResults.filter(r => (r.performance?.duration || 0) < 100).length,
    });

    const systemStatus = bridge.getSystemStatus();
    console.log('\nFinal System Status:', {
      cacheHitRate: systemStatus.orchestrator.performance?.cacheStats?.hitRate,
      averageExecutionTime: systemStatus.orchestrator.performance?.summary?.averageExecutionTime,
      recommendationsCount: bridge.getOptimizationRecommendations().length,
    });

    bridge.cleanup();
    console.log('\nPerformance benchmark completed successfully!');

  } catch (error) {
    console.error('Performance benchmark failed:', error);
    bridge.cleanup();
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Starting SuperClaude Bridge-Hooks Examples\n');

  try {
    await basicClaudeCodeExample();
    await advancedConfigurationExample();
    await errorHandlingExample();
    await performanceBenchmarkExample();
    
    console.log('\n✅ All examples completed successfully!');
    console.log('\nBridge-hooks features demonstrated:');
    console.log('• Real Claude Code tool execution integration');
    console.log('• Intelligent MCP server routing with sub-100ms performance');
    console.log('• Context preservation across hook executions');
    console.log('• Performance monitoring and optimization');
    console.log('• Error handling and circuit breaker patterns');
    console.log('• Environment-specific configuration management');
    console.log('• Concurrent operation support with load balancing');
    console.log('• Predictive optimization and caching');
    
  } catch (error) {
    console.error('❌ Examples failed:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}