import { SuperClaudePerformanceServer } from '../src/MCPServer.js';
import { ComplexityEstimator } from '../src/core/ComplexityEstimator.js';
import { PerformanceProfiler } from '../src/core/PerformanceProfiler.js';
import { CrossServerPerformanceOptimizer } from '../src/core/CrossServerPerformanceOptimizer.js';

jest.mock('@superclaude/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    setServerName: jest.fn()
  }
}));

describe('SuperClaudePerformanceServer', () => {
  let server: SuperClaudePerformanceServer;

  beforeEach(() => {
    server = new SuperClaudePerformanceServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with all core components', () => {
      expect(server).toBeDefined();
      expect(server['complexityEstimator']).toBeInstanceOf(ComplexityEstimator);
      expect(server['performanceProfiler']).toBeInstanceOf(PerformanceProfiler);
      expect(server['crossServerOptimizer']).toBeInstanceOf(CrossServerPerformanceOptimizer);
    });

    test('should set up server with correct configuration', () => {
      const serverConfig = server['server'];
      expect(serverConfig).toBeDefined();
    });
  });

  describe('Tool Handlers', () => {
    test('should handle estimate_complexity tool call', async () => {
      const mockArgs = {
        target: './test-file.ts',
        type: 'file',
        includeTests: true,
        includeDependencies: true
      };

      const result = await server['handleToolCall']('estimate_complexity', mockArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.operation).toBe('estimate_complexity');
    });

    test('should handle monitor_performance tool call', async () => {
      const mockArgs = {
        target: 'test-operation',
        duration: 60,
        samplingRate: 0.1
      };

      const result = await server['handleToolCall']('monitor_performance', mockArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.operation).toBe('monitor_performance');
    });

    test('should handle record_metrics tool call', async () => {
      const mockArgs = {
        operationName: 'test-operation',
        executionTime: 500,
        memoryUsage: 1024 * 1024,
        cpuUsage: 25,
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      const result = await server['handleToolCall']('record_metrics', mockArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.metadata.operation).toBe('record_metrics');
    });

    test('should handle health_check tool call', async () => {
      const mockArgs = {
        includeMetrics: true,
        includeCache: true
      };

      const result = await server['handleToolCall']('health_check', mockArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe('healthy');
    });

    test('should handle unknown tool with error', async () => {
      const result = await server['handleToolCall']('unknown_tool', {});
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });
  });

  describe('Error Handling', () => {
    test('should convert ComplexityEstimationError to McpError', () => {
      const error = new Error('Complexity estimation failed');
      const mcpError = server['convertToMcpError'](error);
      
      expect(mcpError).toBeDefined();
      expect(mcpError.message).toBe('Complexity estimation failed');
    });

    test('should handle generic errors', () => {
      const error = new Error('Generic error');
      const mcpError = server['convertToMcpError'](error);
      
      expect(mcpError).toBeDefined();
      expect(mcpError.message).toBe('Generic error');
    });
  });

  describe('Helper Methods', () => {
    test('should generate metrics recommendations', () => {
      const mockMetrics = {
        cyclomatic: 20,
        cognitive: 25,
        nesting: 5,
        maintainability: 50,
        testability: 60
      };

      const recommendations = server['generateMetricsRecommendations'](mockMetrics);
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('should calculate bottleneck impact', () => {
      const mockBottlenecks = [
        {
          impact: {
            performanceDegradation: 50,
            userExperience: 'moderate',
            resourceConsumption: 70
          }
        }
      ];

      const impact = server['calculateBottleneckImpact'](mockBottlenecks);
      
      expect(impact).toBeDefined();
      expect(impact.userExperience).toBeDefined();
      expect(impact.resourceCost).toBeDefined();
      expect(impact.scalabilityLimitation).toBeDefined();
      expect(impact.maintainabilityImpact).toBeDefined();
    });

    test('should prioritize actions correctly', () => {
      const mockBottlenecks = [
        {
          type: 'algorithm',
          description: 'Slow algorithm',
          estimatedFixTime: 4,
          impact: { performanceDegradation: 60 },
          severity: 'high',
          confidence: 0.8
        }
      ];

      const mockOpportunities = [
        {
          title: 'Cache optimization',
          estimatedEffort: 2,
          expectedGain: { executionTime: 30, cpuUsage: 20 },
          implementationComplexity: 'low',
          riskLevel: 'low',
          confidence: 0.9
        }
      ];

      const actions = server['prioritizeActions'](mockBottlenecks, mockOpportunities);
      
      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0]).toHaveProperty('roi');
    });
  });

  describe('Operation History', () => {
    test('should record operations correctly', () => {
      const operationId = 'test-operation-id';
      server['recordOperation']('test_tool', 'start', { test: 'data' }, operationId);
      
      const history = server['operationHistory'].get('test_tool');
      expect(history).toBeDefined();
      expect(history!.length).toBe(1);
      expect(history![0].operationId).toBe(operationId);
      expect(history![0].phase).toBe('start');
    });

    test('should maintain operation history limit', () => {
      const operationId = 'test-operation-id';
      
      // Add more than 100 operations
      for (let i = 0; i < 105; i++) {
        server['recordOperation']('test_tool', 'start', { iteration: i }, `${operationId}-${i}`);
      }
      
      const history = server['operationHistory'].get('test_tool');
      expect(history).toBeDefined();
      expect(history!.length).toBe(100);
    });

    test('should generate operation history stats', () => {
      // Add some completed operations
      server['recordOperation']('test_tool', 'complete', { success: true, executionTime: 100 }, 'op1');
      server['recordOperation']('test_tool', 'complete', { success: true, executionTime: 200 }, 'op2');
      server['recordOperation']('test_tool', 'complete', { success: false, executionTime: 150 }, 'op3');
      
      const stats = server['getOperationHistoryStats']();
      
      expect(stats).toBeDefined();
      expect(stats.test_tool).toBeDefined();
      expect(stats.test_tool.totalCalls).toBe(3);
      expect(stats.test_tool.avgExecutionTime).toBe(150);
      expect(stats.test_tool.successRate).toBeCloseTo(0.67, 2);
    });
  });
});