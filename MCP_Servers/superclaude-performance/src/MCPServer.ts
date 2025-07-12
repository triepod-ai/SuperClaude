import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { ComplexityEstimator } from './core/ComplexityEstimator.js';
import { PerformanceProfiler } from './core/PerformanceProfiler.js';
import { CrossServerPerformanceOptimizer } from './core/CrossServerPerformanceOptimizer.js';
import { logger } from '@superclaude/shared';
import {
  EstimateComplexityInputSchema,
  MonitorPerformanceInputSchema,
  AnalyzeBottlenecksInputSchema,
  OptimizePerformanceInputSchema,
  BenchmarkPerformanceInputSchema,
  MCPToolResult,
  ComplexityEstimationResult,
  PerformanceMonitoringResult,
  BottleneckAnalysisResult,
  OptimizationResult,
  BenchmarkResult,
  PerformanceServerError,
  ComplexityEstimationError,
  MonitoringError,
  OptimizationError,
  BenchmarkingError,
  DEFAULT_MONITORING_CONFIG
} from './types/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * SuperClaude Performance MCP Server
 * Provides advanced performance monitoring, complexity estimation, and optimization capabilities
 */
export class SuperClaudePerformanceServer {
  private server: Server;
  private complexityEstimator: ComplexityEstimator;
  private performanceProfiler: PerformanceProfiler;
  private crossServerOptimizer: CrossServerPerformanceOptimizer;
  private operationHistory: Map<string, any[]> = new Map();
  private startTime: number = Date.now();

  constructor() {
    this.server = new Server(
      {
        name: 'superclaude-performance',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.complexityEstimator = new ComplexityEstimator();
    this.performanceProfiler = new PerformanceProfiler();
    this.crossServerOptimizer = new CrossServerPerformanceOptimizer();

    this.setupToolHandlers();
    this.setupErrorHandling();
    this.setupEventHandlers();
    
    logger.setServerName('superclaude-performance');
    logger.info('SuperClaudePerformanceServer initialized');
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ==================== COMPLEXITY ESTIMATION TOOLS ====================
        {
          name: 'estimate_complexity',
          description: 'Estimate implementation complexity for code, files, or projects',
          inputSchema: {
            type: 'object',
            properties: {
              target: { 
                type: 'string', 
                description: 'File path, directory, or code snippet to analyze' 
              },
              type: { 
                type: 'string', 
                enum: ['file', 'directory', 'project', 'snippet'],
                description: 'Type of target to analyze',
                default: 'file'
              },
              includeTests: { 
                type: 'boolean', 
                description: 'Include test files in analysis',
                default: true 
              },
              includeDependencies: { 
                type: 'boolean', 
                description: 'Include dependency analysis',
                default: true 
              },
              language: { 
                type: 'string', 
                description: 'Programming language (auto-detected if not provided)' 
              }
            },
            required: ['target'],
          },
        },
        {
          name: 'analyze_file_complexity',
          description: 'Analyze complexity metrics for a specific file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file to analyze' },
              content: { type: 'string', description: 'File content (optional, will read from file if not provided)' },
              metrics: {
                type: 'array',
                items: { 
                  type: 'string', 
                  enum: ['cyclomatic', 'cognitive', 'nesting', 'maintainability', 'testability']
                },
                description: 'Specific metrics to calculate'
              }
            },
            required: ['filePath'],
          },
        },
        {
          name: 'compare_complexity',
          description: 'Compare complexity between multiple files or implementations',
          inputSchema: {
            type: 'object',
            properties: {
              targets: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of files or code snippets to compare'
              },
              type: { 
                type: 'string', 
                enum: ['file', 'snippet'],
                description: 'Type of targets',
                default: 'file'
              },
              baseline: { type: 'string', description: 'Baseline target for comparison (optional)' }
            },
            required: ['targets'],
          },
        },

        // ==================== PERFORMANCE MONITORING TOOLS ====================
        {
          name: 'monitor_performance',
          description: 'Start real-time performance monitoring for a target',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Operation or server to monitor' },
              duration: { 
                type: 'number', 
                description: 'Monitoring duration in seconds',
                default: 3600 
              },
              samplingRate: { 
                type: 'number', 
                minimum: 0.001,
                maximum: 1.0,
                description: 'Sampling rate (0.001-1.0)',
                default: 0.1 
              },
              includeBaseline: { 
                type: 'boolean', 
                description: 'Create baseline for comparison',
                default: true 
              },
              alertOnThresholds: { 
                type: 'boolean', 
                description: 'Enable threshold-based alerting',
                default: true 
              }
            },
            required: ['target'],
          },
        },
        {
          name: 'stop_monitoring',
          description: 'Stop performance monitoring for a target',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target to stop monitoring' }
            },
            required: ['target'],
          },
        },
        {
          name: 'record_metrics',
          description: 'Record performance metrics for an operation',
          inputSchema: {
            type: 'object',
            properties: {
              operationName: { type: 'string', description: 'Name of the operation' },
              executionTime: { type: 'number', description: 'Execution time in milliseconds' },
              memoryUsage: { type: 'number', description: 'Memory usage in bytes' },
              cpuUsage: { type: 'number', description: 'CPU usage percentage' },
              tokenUsage: { type: 'number', description: 'Token usage count' },
              successRate: { type: 'number', minimum: 0, maximum: 1, description: 'Success rate (0-1)' },
              errorRate: { type: 'number', minimum: 0, maximum: 1, description: 'Error rate (0-1)' },
              serverId: { type: 'string', description: 'Server ID (optional)' }
            },
            required: ['operationName', 'executionTime', 'memoryUsage', 'cpuUsage', 'tokenUsage', 'successRate', 'errorRate'],
          },
        },
        {
          name: 'get_performance_summary',
          description: 'Get performance summary for operations or systems',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Specific target (optional, all if not provided)' },
              timeframe: {
                type: 'string',
                enum: ['hour', 'day', 'week', 'month'],
                description: 'Time range for summary',
                default: 'day'
              }
            },
          },
        },
        {
          name: 'get_performance_trends',
          description: 'Analyze performance trends over time',
          inputSchema: {
            type: 'object',
            properties: {
              operationName: { type: 'string', description: 'Operation to analyze' },
              timeframe: {
                type: 'string',
                enum: ['hour', 'day', 'week', 'month'],
                description: 'Analysis timeframe',
                default: 'day'
              }
            },
            required: ['operationName'],
          },
        },

        // ==================== BOTTLENECK ANALYSIS TOOLS ====================
        {
          name: 'analyze_bottlenecks',
          description: 'Identify and analyze performance bottlenecks',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'System or component to analyze' },
              scope: {
                type: 'string',
                enum: ['file', 'module', 'service', 'system'],
                description: 'Analysis scope',
                default: 'module'
              },
              includeHistorical: { 
                type: 'boolean', 
                description: 'Include historical analysis',
                default: true 
              },
              minimumSeverity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Minimum severity level to report',
                default: 'medium'
              }
            },
            required: ['target'],
          },
        },
        {
          name: 'get_optimization_opportunities',
          description: 'Identify optimization opportunities from bottleneck analysis',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target for optimization analysis' },
              focusAreas: {
                type: 'array',
                items: { 
                  type: 'string',
                  enum: ['algorithm', 'memory', 'io', 'network', 'database', 'caching']
                },
                description: 'Specific areas to focus on'
              },
              priorityThreshold: {
                type: 'number',
                minimum: 1,
                maximum: 10,
                description: 'Minimum priority score (1-10)',
                default: 5
              }
            },
            required: ['target'],
          },
        },

        // ==================== OPTIMIZATION TOOLS ====================
        {
          name: 'optimize_performance',
          description: 'Create and execute performance optimization plan',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target for optimization' },
              type: {
                type: 'string',
                enum: ['algorithm', 'memory', 'io', 'network', 'database'],
                description: 'Type of optimization'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Optimization priority',
                default: 'medium'
              },
              constraints: {
                type: 'object',
                properties: {
                  maxImplementationTime: { type: 'number', description: 'Maximum implementation time in hours' },
                  riskTolerance: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Risk tolerance level',
                    default: 'medium'
                  },
                  availableResources: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Available resources for optimization'
                  }
                },
                default: {}
              }
            },
            required: ['target'],
          },
        },
        {
          name: 'execute_optimization_plan',
          description: 'Execute a specific optimization plan',
          inputSchema: {
            type: 'object',
            properties: {
              planId: { type: 'string', description: 'Optimization plan ID to execute' }
            },
            required: ['planId'],
          },
        },

        // ==================== BENCHMARKING TOOLS ====================
        {
          name: 'benchmark_performance',
          description: 'Create performance benchmarks for operations',
          inputSchema: {
            type: 'object',
            properties: {
              operation: { type: 'string', description: 'Operation to benchmark' },
              iterations: { 
                type: 'number', 
                minimum: 10,
                maximum: 10000,
                description: 'Number of iterations',
                default: 100 
              },
              warmupIterations: { 
                type: 'number', 
                minimum: 0,
                maximum: 100,
                description: 'Number of warmup iterations',
                default: 10 
              },
              includeVariance: { 
                type: 'boolean', 
                description: 'Include variance analysis',
                default: true 
              },
              compareToBaseline: { 
                type: 'boolean', 
                description: 'Compare to existing baseline',
                default: true 
              }
            },
            required: ['operation'],
          },
        },
        {
          name: 'compare_benchmarks',
          description: 'Compare performance benchmarks between different operations or time periods',
          inputSchema: {
            type: 'object',
            properties: {
              baseline: { type: 'string', description: 'Baseline operation or benchmark ID' },
              comparison: { type: 'string', description: 'Comparison operation or benchmark ID' },
              metrics: {
                type: 'array',
                items: { 
                  type: 'string',
                  enum: ['avg', 'p50', 'p90', 'p95', 'p99', 'min', 'max']
                },
                description: 'Metrics to compare',
                default: ['avg', 'p95']
              }
            },
            required: ['baseline', 'comparison'],
          },
        },

        // ==================== CROSS-SERVER OPTIMIZATION TOOLS ====================
        {
          name: 'register_server_metrics',
          description: 'Register performance metrics from another MCP server',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: { type: 'string', description: 'Server identifier' },
              serverName: { type: 'string', description: 'Server name' },
              metrics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    executionTime: { type: 'number' },
                    memoryUsage: { type: 'number' },
                    cpuUsage: { type: 'number' },
                    tokenUsage: { type: 'number' },
                    successRate: { type: 'number' },
                    errorRate: { type: 'number' },
                    timestamp: { type: 'string' },
                    operationId: { type: 'string' }
                  },
                  required: ['executionTime', 'memoryUsage', 'cpuUsage', 'tokenUsage', 'successRate', 'errorRate']
                },
                description: 'Performance metrics array'
              },
              bottlenecks: {
                type: 'array',
                items: { type: 'object' },
                description: 'Known bottlenecks (optional)',
                default: []
              }
            },
            required: ['serverId', 'serverName', 'metrics'],
          },
        },
        {
          name: 'create_cross_server_optimization',
          description: 'Create optimization plan across multiple MCP servers',
          inputSchema: {
            type: 'object',
            properties: {
              targetServers: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of server IDs to optimize'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Optimization priority',
                default: 'medium'
              },
              maxImplementationTime: { 
                type: 'number', 
                description: 'Maximum implementation time in hours' 
              },
              riskTolerance: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Risk tolerance level',
                default: 'medium'
              },
              focusAreas: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific optimization focus areas'
              }
            },
            required: ['targetServers'],
          },
        },
        {
          name: 'coordinate_cache',
          description: 'Coordinate caching strategies across servers',
          inputSchema: {
            type: 'object',
            properties: {
              operation: { type: 'string', description: 'Operation to cache' },
              data: { type: 'object', description: 'Data to cache' },
              ttl: { type: 'number', description: 'Time to live in milliseconds' },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Cache tags'
              },
              serverAffinity: {
                type: 'array',
                items: { type: 'string' },
                description: 'Preferred servers for cache'
              },
              replicationStrategy: {
                type: 'string',
                enum: ['none', 'all', 'selective'],
                description: 'Cache replication strategy',
                default: 'selective'
              }
            },
            required: ['operation', 'data'],
          },
        },
        {
          name: 'optimize_load_balancing',
          description: 'Optimize load balancing across servers',
          inputSchema: {
            type: 'object',
            properties: {
              requests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    complexity: { type: 'number' },
                    priority: { type: 'number' }
                  },
                  required: ['id', 'complexity', 'priority']
                },
                description: 'Requests to balance'
              },
              availableServers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    serverId: { type: 'string' },
                    capacity: { type: 'number' },
                    currentLoad: { type: 'number' }
                  },
                  required: ['serverId', 'capacity', 'currentLoad']
                },
                description: 'Available servers'
              }
            },
            required: ['requests', 'availableServers'],
          },
        },
        {
          name: 'get_optimization_recommendations',
          description: 'Get optimization recommendations across all servers',
          inputSchema: {
            type: 'object',
            properties: {
              scope: {
                type: 'string',
                enum: ['immediate', 'short_term', 'long_term', 'critical', 'all'],
                description: 'Recommendation scope',
                default: 'all'
              }
            },
          },
        },

        // ==================== ALERTING & MONITORING TOOLS ====================
        {
          name: 'get_alerts',
          description: 'Get current performance alerts',
          inputSchema: {
            type: 'object',
            properties: {
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Filter by severity level'
              },
              resolved: { type: 'boolean', description: 'Filter by resolution status' },
              limit: { type: 'number', minimum: 1, maximum: 1000, description: 'Maximum number of alerts to return' }
            },
          },
        },
        {
          name: 'resolve_alert',
          description: 'Resolve a performance alert',
          inputSchema: {
            type: 'object',
            properties: {
              alertId: { type: 'string', description: 'Alert ID to resolve' },
              resolvedBy: { type: 'string', description: 'Who resolved the alert' },
              notes: { type: 'string', description: 'Resolution notes' }
            },
            required: ['alertId'],
          },
        },
        {
          name: 'configure_monitoring',
          description: 'Configure monitoring settings',
          inputSchema: {
            type: 'object',
            properties: {
              enableRealTimeTracking: { type: 'boolean' },
              samplingRate: { type: 'number', minimum: 0.001, maximum: 1.0 },
              alertThresholds: {
                type: 'object',
                properties: {
                  executionTime: { type: 'number', description: 'Execution time threshold in ms' },
                  memoryUsage: { type: 'number', description: 'Memory usage threshold in bytes' },
                  cpuUsage: { type: 'number', description: 'CPU usage threshold in percentage' },
                  errorRate: { type: 'number', description: 'Error rate threshold in percentage' }
                }
              },
              retentionPeriod: { type: 'number', description: 'Data retention period in days' },
              aggregationInterval: { type: 'number', description: 'Aggregation interval in seconds' }
            },
          },
        },

        // ==================== HEALTH & DIAGNOSTICS TOOLS ====================
        {
          name: 'health_check',
          description: 'Check server health and performance status',
          inputSchema: {
            type: 'object',
            properties: {
              includeMetrics: { 
                type: 'boolean', 
                description: 'Include performance metrics in health check',
                default: true 
              },
              includeCache: { 
                type: 'boolean', 
                description: 'Include cache statistics',
                default: true 
              },
              includeCrossServer: { 
                type: 'boolean', 
                description: 'Include cross-server statistics',
                default: true 
              }
            },
          },
        },
        {
          name: 'get_server_stats',
          description: 'Get comprehensive server performance statistics',
          inputSchema: {
            type: 'object',
            properties: {
              detailed: { 
                type: 'boolean', 
                description: 'Include detailed statistics',
                default: false 
              }
            },
          },
        },
        {
          name: 'clear_cache',
          description: 'Clear performance data cache',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['complexity', 'performance', 'cross_server', 'all'],
                description: 'Type of cache to clear',
                default: 'all'
              }
            },
          },
        }
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const result = await this.handleToolCall(request.params.name, request.params.arguments);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const mcpError = this.convertToMcpError(error);
        throw mcpError;
      }
    });
  }

  /**
   * Handle tool calls
   */
  private async handleToolCall(name: string, args: any): Promise<MCPToolResult> {
    try {
      const operationId = uuidv4();
      const startTime = Date.now();

      // Record operation start
      this.recordOperation(name, 'start', args, operationId);

      let result: MCPToolResult;

      switch (name) {
        // Complexity Estimation Tools
        case 'estimate_complexity':
          result = await this.handleEstimateComplexity(args);
          break;
        case 'analyze_file_complexity':
          result = await this.handleAnalyzeFileComplexity(args);
          break;
        case 'compare_complexity':
          result = await this.handleCompareComplexity(args);
          break;

        // Performance Monitoring Tools
        case 'monitor_performance':
          result = await this.handleMonitorPerformance(args);
          break;
        case 'stop_monitoring':
          result = await this.handleStopMonitoring(args);
          break;
        case 'record_metrics':
          result = await this.handleRecordMetrics(args);
          break;
        case 'get_performance_summary':
          result = await this.handleGetPerformanceSummary(args);
          break;
        case 'get_performance_trends':
          result = await this.handleGetPerformanceTrends(args);
          break;

        // Bottleneck Analysis Tools
        case 'analyze_bottlenecks':
          result = await this.handleAnalyzeBottlenecks(args);
          break;
        case 'get_optimization_opportunities':
          result = await this.handleGetOptimizationOpportunities(args);
          break;

        // Optimization Tools
        case 'optimize_performance':
          result = await this.handleOptimizePerformance(args);
          break;
        case 'execute_optimization_plan':
          result = await this.handleExecuteOptimizationPlan(args);
          break;

        // Benchmarking Tools
        case 'benchmark_performance':
          result = await this.handleBenchmarkPerformance(args);
          break;
        case 'compare_benchmarks':
          result = await this.handleCompareBenchmarks(args);
          break;

        // Cross-Server Optimization Tools
        case 'register_server_metrics':
          result = await this.handleRegisterServerMetrics(args);
          break;
        case 'create_cross_server_optimization':
          result = await this.handleCreateCrossServerOptimization(args);
          break;
        case 'coordinate_cache':
          result = await this.handleCoordinateCache(args);
          break;
        case 'optimize_load_balancing':
          result = await this.handleOptimizeLoadBalancing(args);
          break;
        case 'get_optimization_recommendations':
          result = await this.handleGetOptimizationRecommendations(args);
          break;

        // Alerting & Monitoring Tools
        case 'get_alerts':
          result = await this.handleGetAlerts(args);
          break;
        case 'resolve_alert':
          result = await this.handleResolveAlert(args);
          break;
        case 'configure_monitoring':
          result = await this.handleConfigureMonitoring(args);
          break;

        // Health & Diagnostics Tools
        case 'health_check':
          result = await this.handleHealthCheck(args);
          break;
        case 'get_server_stats':
          result = await this.handleGetServerStats(args);
          break;
        case 'clear_cache':
          result = await this.handleClearCache(args);
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      // Record operation completion
      const executionTime = Date.now() - startTime;
      this.recordOperation(name, 'complete', { executionTime, success: result.success }, operationId);

      return result;

    } catch (error) {
      logger.error('Tool call failed', { name, args, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { tool: name, args }
      };
    }
  }

  // ==================== COMPLEXITY ESTIMATION HANDLERS ====================

  private async handleEstimateComplexity(args: any): Promise<ComplexityEstimationResult> {
    const estimation = await this.complexityEstimator.estimateComplexity(
      args.target,
      args.type || 'file',
      {
        includeTests: args.includeTests,
        includeDependencies: args.includeDependencies,
        language: args.language
      }
    );

    return {
      success: true,
      data: {
        estimation,
        metrics: {} as any, // Would be populated from the estimation
        breakdown: estimation.factors,
        recommendations: estimation.recommendations
      },
      metadata: {
        operation: 'estimate_complexity',
        target: args.target,
        type: args.type,
        complexity: estimation.overall
      }
    };
  }

  private async handleAnalyzeFileComplexity(args: any): Promise<ComplexityEstimationResult> {
    const metrics = await this.complexityEstimator.analyzeFileComplexity(args.filePath, args.content);

    // Filter metrics if specific ones were requested
    const requestedMetrics = args.metrics || ['cyclomatic', 'cognitive', 'nesting', 'maintainability', 'testability'];
    const filteredMetrics = Object.fromEntries(
      Object.entries(metrics).filter(([key]) => requestedMetrics.includes(key))
    );

    return {
      success: true,
      data: {
        estimation: {} as any, // Not applicable for pure metrics analysis
        metrics: filteredMetrics,
        breakdown: [],
        recommendations: this.generateMetricsRecommendations(metrics)
      },
      metadata: {
        operation: 'analyze_file_complexity',
        filePath: args.filePath,
        metricsCalculated: Object.keys(filteredMetrics).length
      }
    };
  }

  private async handleCompareComplexity(args: any): Promise<ComplexityEstimationResult> {
    const comparisons = [];
    let baseline = null;

    for (const target of args.targets) {
      const estimation = await this.complexityEstimator.estimateComplexity(
        target,
        args.type || 'file'
      );
      
      comparisons.push({
        target,
        estimation,
        isBaseline: target === args.baseline
      });

      if (target === args.baseline) {
        baseline = estimation;
      }
    }

    // Use first target as baseline if none specified
    if (!baseline) {
      baseline = comparisons[0].estimation;
      comparisons[0].isBaseline = true;
    }

    return {
      success: true,
      data: {
        estimation: baseline,
        metrics: {},
        breakdown: [],
        recommendations: this.generateComparisonRecommendations(comparisons, baseline)
      },
      metadata: {
        operation: 'compare_complexity',
        targetsCompared: args.targets.length,
        baseline: args.baseline || args.targets[0]
      }
    };
  }

  // ==================== PERFORMANCE MONITORING HANDLERS ====================

  private async handleMonitorPerformance(args: any): Promise<PerformanceMonitoringResult> {
    await this.performanceProfiler.startMonitoring(
      args.target,
      args.duration || 3600,
      {
        samplingRate: args.samplingRate,
        includeBaseline: args.includeBaseline,
        alertOnThresholds: args.alertOnThresholds
      }
    );

    const profile = this.performanceProfiler.getProfile(args.target);
    const alerts = this.performanceProfiler.getAlerts();
    const trends = this.performanceProfiler.getTrends(args.target);
    const summary = this.performanceProfiler.generateSummary(args.target);

    return {
      success: true,
      data: {
        profile: profile!,
        alerts,
        trends,
        summary
      },
      metadata: {
        operation: 'monitor_performance',
        target: args.target,
        duration: args.duration,
        monitoringStarted: true
      }
    };
  }

  private async handleStopMonitoring(args: any): Promise<MCPToolResult> {
    this.performanceProfiler.stopMonitoring(args.target);

    return {
      success: true,
      data: { stopped: true },
      metadata: {
        operation: 'stop_monitoring',
        target: args.target
      }
    };
  }

  private async handleRecordMetrics(args: any): Promise<MCPToolResult> {
    this.performanceProfiler.recordMetrics(
      args.operationName,
      {
        executionTime: args.executionTime,
        memoryUsage: args.memoryUsage,
        cpuUsage: args.cpuUsage,
        tokenUsage: args.tokenUsage,
        successRate: args.successRate,
        errorRate: args.errorRate
      },
      args.serverId
    );

    return {
      success: true,
      data: { recorded: true },
      metadata: {
        operation: 'record_metrics',
        operationName: args.operationName,
        executionTime: args.executionTime
      }
    };
  }

  private async handleGetPerformanceSummary(args: any): Promise<PerformanceMonitoringResult> {
    const summary = this.performanceProfiler.generateSummary(args.target);
    const profile = args.target ? this.performanceProfiler.getProfile(args.target) : undefined;
    const alerts = this.performanceProfiler.getAlerts();
    const trends = args.target ? this.performanceProfiler.getTrends(args.target, args.timeframe) : [];

    return {
      success: true,
      data: {
        profile,
        alerts,
        trends,
        summary
      },
      metadata: {
        operation: 'get_performance_summary',
        target: args.target,
        timeframe: args.timeframe
      }
    };
  }

  private async handleGetPerformanceTrends(args: any): Promise<MCPToolResult> {
    const trends = this.performanceProfiler.getTrends(args.operationName, args.timeframe);

    return {
      success: true,
      data: { trends },
      metadata: {
        operation: 'get_performance_trends',
        operationName: args.operationName,
        timeframe: args.timeframe,
        trendsFound: trends.length
      }
    };
  }

  // ==================== BOTTLENECK ANALYSIS HANDLERS ====================

  private async handleAnalyzeBottlenecks(args: any): Promise<BottleneckAnalysisResult> {
    const analysis = await this.performanceProfiler.analyzeBottlenecks(
      args.target,
      {
        scope: args.scope,
        includeHistorical: args.includeHistorical,
        minimumSeverity: args.minimumSeverity
      }
    );

    return {
      success: true,
      data: {
        bottlenecks: analysis.bottlenecks,
        opportunities: analysis.opportunities,
        impact: this.calculateBottleneckImpact(analysis.bottlenecks),
        prioritizedActions: this.prioritizeActions(analysis.bottlenecks, analysis.opportunities)
      },
      metadata: {
        operation: 'analyze_bottlenecks',
        target: args.target,
        bottlenecksFound: analysis.bottlenecks.length,
        opportunitiesFound: analysis.opportunities.length
      }
    };
  }

  private async handleGetOptimizationOpportunities(args: any): Promise<MCPToolResult> {
    // First analyze bottlenecks to get opportunities
    const analysis = await this.performanceProfiler.analyzeBottlenecks(args.target);
    
    // Filter opportunities based on focus areas and priority
    let opportunities = analysis.opportunities;
    
    if (args.focusAreas && args.focusAreas.length > 0) {
      opportunities = opportunities.filter(opp => 
        args.focusAreas.includes(opp.type)
      );
    }

    if (args.priorityThreshold) {
      opportunities = opportunities.filter(opp => {
        const priority = this.calculateOpportunityPriority(opp);
        return priority >= args.priorityThreshold;
      });
    }

    return {
      success: true,
      data: {
        opportunities,
        summary: {
          total: opportunities.length,
          highImpact: opportunities.filter(o => o.expectedGain.executionTime > 30).length,
          lowRisk: opportunities.filter(o => o.riskLevel === 'low').length,
          quickWins: opportunities.filter(o => o.estimatedEffort <= 4 && o.expectedGain.executionTime > 20).length
        }
      },
      metadata: {
        operation: 'get_optimization_opportunities',
        target: args.target,
        opportunitiesFound: opportunities.length
      }
    };
  }

  // ==================== OPTIMIZATION HANDLERS ====================

  private async handleOptimizePerformance(args: any): Promise<OptimizationResult> {
    // Create optimization plan using cross-server optimizer
    const plan = await this.crossServerOptimizer.createOptimizationPlan(
      [args.target], // Single target for individual optimization
      {
        priority: args.priority,
        maxImplementationTime: args.constraints?.maxImplementationTime,
        riskTolerance: args.constraints?.riskTolerance,
        focusAreas: args.type ? [args.type] : undefined
      }
    );

    return {
      success: true,
      data: {
        plan,
        estimatedGains: this.calculateEstimatedGains(plan),
        timeline: this.createOptimizationTimeline(plan),
        riskAssessment: this.assessOptimizationRisk(plan)
      },
      metadata: {
        operation: 'optimize_performance',
        target: args.target,
        planId: plan.id,
        phases: plan.phases.length
      }
    };
  }

  private async handleExecuteOptimizationPlan(args: any): Promise<OptimizationResult> {
    const execution = await this.crossServerOptimizer.executeOptimizationPlan(args.planId);

    return {
      success: execution.success,
      data: {
        plan: undefined, // Plan details not included in execution result
        estimatedGains: undefined,
        timeline: undefined,
        riskAssessment: undefined,
        executionResults: {
          success: execution.success,
          completedPhases: execution.completedPhases,
          results: execution.results,
          errors: execution.errors
        }
      },
      metadata: {
        operation: 'execute_optimization_plan',
        planId: args.planId,
        success: execution.success,
        completedPhases: execution.completedPhases
      }
    };
  }

  // ==================== BENCHMARKING HANDLERS ====================

  private async handleBenchmarkPerformance(args: any): Promise<BenchmarkResult> {
    const benchmark = await this.performanceProfiler.createBenchmark(
      args.operation,
      args.iterations,
      {
        warmupIterations: args.warmupIterations,
        includeVariance: args.includeVariance,
        compareToBaseline: args.compareToBaseline
      }
    );

    return {
      success: true,
      data: {
        benchmark,
        comparison: undefined, // Would be populated if baseline comparison was performed
        trends: this.performanceProfiler.getTrends(args.operation),
        insights: this.generateBenchmarkInsights(benchmark)
      },
      metadata: {
        operation: 'benchmark_performance',
        operationName: args.operation,
        iterations: args.iterations,
        avg: benchmark.avg,
        p95: benchmark.p95
      }
    };
  }

  private async handleCompareBenchmarks(args: any): Promise<BenchmarkResult> {
    // This would involve comparing two benchmark results
    // For now, return a placeholder implementation
    return {
      success: true,
      data: {
        benchmark: {} as any,
        comparison: {
          baseline: {} as any,
          current: {} as any,
          improvement: 0,
          regression: false,
          significance: 'low'
        },
        trends: [],
        insights: []
      },
      metadata: {
        operation: 'compare_benchmarks',
        baseline: args.baseline,
        comparison: args.comparison
      }
    };
  }

  // ==================== CROSS-SERVER OPTIMIZATION HANDLERS ====================

  private async handleRegisterServerMetrics(args: any): Promise<MCPToolResult> {
    // Convert raw metrics to PerformanceMetrics format
    const metrics = args.metrics.map((m: any) => ({
      ...m,
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      operationId: m.operationId || uuidv4()
    }));

    this.crossServerOptimizer.registerServerMetrics(
      args.serverId,
      args.serverName,
      metrics,
      args.bottlenecks || []
    );

    return {
      success: true,
      data: { registered: true },
      metadata: {
        operation: 'register_server_metrics',
        serverId: args.serverId,
        serverName: args.serverName,
        metricsCount: metrics.length
      }
    };
  }

  private async handleCreateCrossServerOptimization(args: any): Promise<OptimizationResult> {
    const plan = await this.crossServerOptimizer.createOptimizationPlan(
      args.targetServers,
      {
        priority: args.priority,
        maxImplementationTime: args.maxImplementationTime,
        riskTolerance: args.riskTolerance,
        focusAreas: args.focusAreas
      }
    );

    return {
      success: true,
      data: {
        plan,
        estimatedGains: this.calculateEstimatedGains(plan),
        timeline: this.createOptimizationTimeline(plan),
        riskAssessment: this.assessOptimizationRisk(plan)
      },
      metadata: {
        operation: 'create_cross_server_optimization',
        targetServers: args.targetServers.length,
        planId: plan.id
      }
    };
  }

  private async handleCoordinateCache(args: any): Promise<MCPToolResult> {
    this.crossServerOptimizer.coordinateCache(
      args.operation,
      args.data,
      {
        ttl: args.ttl,
        tags: args.tags,
        serverAffinity: args.serverAffinity,
        replicationStrategy: args.replicationStrategy
      }
    );

    return {
      success: true,
      data: { cached: true },
      metadata: {
        operation: 'coordinate_cache',
        cacheOperation: args.operation,
        replicationStrategy: args.replicationStrategy
      }
    };
  }

  private async handleOptimizeLoadBalancing(args: any): Promise<MCPToolResult> {
    const assignment = this.crossServerOptimizer.coordinateLoadBalancing(
      args.requests,
      args.availableServers
    );

    const assignmentSummary = Array.from(assignment.entries()).map(([serverId, requestIds]) => ({
      serverId,
      assignedRequests: requestIds.length,
      requestIds
    }));

    return {
      success: true,
      data: {
        assignment: assignmentSummary,
        totalRequests: args.requests.length,
        serversUsed: assignment.size
      },
      metadata: {
        operation: 'optimize_load_balancing',
        requestsBalanced: args.requests.length,
        serversUsed: assignment.size
      }
    };
  }

  private async handleGetOptimizationRecommendations(args: any): Promise<MCPToolResult> {
    const recommendations = this.crossServerOptimizer.getOptimizationRecommendations();

    // Filter by scope if specified
    if (args.scope && args.scope !== 'all') {
      const filtered = { [args.scope]: recommendations[args.scope] };
      return {
        success: true,
        data: { recommendations: filtered },
        metadata: {
          operation: 'get_optimization_recommendations',
          scope: args.scope,
          recommendationsCount: filtered[args.scope].length
        }
      };
    }

    return {
      success: true,
      data: { recommendations },
      metadata: {
        operation: 'get_optimization_recommendations',
        scope: 'all',
        totalRecommendations: Object.values(recommendations).flat().length
      }
    };
  }

  // ==================== ALERTING & MONITORING HANDLERS ====================

  private async handleGetAlerts(args: any): Promise<MCPToolResult> {
    const alerts = this.performanceProfiler.getAlerts(args.severity, args.resolved);
    const limitedAlerts = args.limit ? alerts.slice(0, args.limit) : alerts;

    return {
      success: true,
      data: {
        alerts: limitedAlerts,
        totalCount: alerts.length,
        filtered: !!args.limit && alerts.length > args.limit
      },
      metadata: {
        operation: 'get_alerts',
        alertsReturned: limitedAlerts.length,
        totalAlerts: alerts.length
      }
    };
  }

  private async handleResolveAlert(args: any): Promise<MCPToolResult> {
    const resolved = this.performanceProfiler.resolveAlert(args.alertId, args.resolvedBy);

    return {
      success: resolved,
      data: { resolved },
      metadata: {
        operation: 'resolve_alert',
        alertId: args.alertId,
        resolvedBy: args.resolvedBy
      }
    };
  }

  private async handleConfigureMonitoring(args: any): Promise<MCPToolResult> {
    // Update monitoring configuration
    // This would typically update the PerformanceProfiler configuration
    const updatedConfig = { ...DEFAULT_MONITORING_CONFIG, ...args };

    return {
      success: true,
      data: { configuration: updatedConfig },
      metadata: {
        operation: 'configure_monitoring',
        configurationUpdated: true
      }
    };
  }

  // ==================== HEALTH & DIAGNOSTICS HANDLERS ====================

  private async handleHealthCheck(args: any): Promise<MCPToolResult> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      components: {
        complexityEstimator: {
          status: 'healthy',
          cacheStats: args.includeCache ? this.complexityEstimator.getCacheStats() : undefined
        },
        performanceProfiler: {
          status: 'healthy',
          stats: args.includeMetrics ? this.performanceProfiler.getStats() : undefined
        },
        crossServerOptimizer: {
          status: 'healthy',
          stats: args.includeCrossServer ? this.crossServerOptimizer.getPerformanceStats() : undefined
        }
      }
    };

    return {
      success: true,
      data: health,
      metadata: { operation: 'health_check' }
    };
  }

  private async handleGetServerStats(args: any): Promise<MCPToolResult> {
    const stats = {
      complexityEstimator: this.complexityEstimator.getCacheStats(),
      performanceProfiler: this.performanceProfiler.getStats(),
      crossServerOptimizer: this.crossServerOptimizer.getPerformanceStats(),
      operationHistory: this.getOperationHistoryStats(),
      systemMetrics: {
        uptime: Date.now() - this.startTime,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    return {
      success: true,
      data: args.detailed ? stats : this.summarizeStats(stats),
      metadata: { operation: 'get_server_stats', detailed: args.detailed }
    };
  }

  private async handleClearCache(args: any): Promise<MCPToolResult> {
    let cleared = 0;

    switch (args.type || 'all') {
      case 'complexity':
        this.complexityEstimator.clearCache();
        cleared++;
        break;
      case 'performance':
        this.performanceProfiler.cleanup();
        cleared++;
        break;
      case 'cross_server':
        this.crossServerOptimizer.clearCache();
        cleared++;
        break;
      case 'all':
        this.complexityEstimator.clearCache();
        this.performanceProfiler.cleanup();
        this.crossServerOptimizer.clearCache();
        cleared = 3;
        break;
    }

    return {
      success: true,
      data: { cachesCleared: cleared, type: args.type || 'all' },
      metadata: { operation: 'clear_cache', type: args.type }
    };
  }

  // ==================== HELPER METHODS ====================

  private generateMetricsRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.cyclomatic > 15) {
      recommendations.push('Consider breaking down complex functions to reduce cyclomatic complexity');
    }

    if (metrics.cognitive > 20) {
      recommendations.push('Simplify code logic to improve cognitive complexity');
    }

    if (metrics.nesting > 4) {
      recommendations.push('Reduce nesting depth by extracting methods or using early returns');
    }

    if (metrics.maintainability < 60) {
      recommendations.push('Improve code maintainability through refactoring and documentation');
    }

    if (metrics.testability < 70) {
      recommendations.push('Improve testability by reducing coupling and dependencies');
    }

    return recommendations.length > 0 ? recommendations : ['Code complexity metrics are within acceptable ranges'];
  }

  private generateComparisonRecommendations(comparisons: any[], baseline: any): string[] {
    const recommendations: string[] = [];

    const highComplexityTargets = comparisons.filter(c => 
      c.estimation.overall > baseline.overall * 1.5
    );

    if (highComplexityTargets.length > 0) {
      recommendations.push(`${highComplexityTargets.length} target(s) have significantly higher complexity than baseline`);
    }

    const lowComplexityTargets = comparisons.filter(c => 
      c.estimation.overall < baseline.overall * 0.7
    );

    if (lowComplexityTargets.length > 0) {
      recommendations.push(`Consider using patterns from ${lowComplexityTargets.length} simpler target(s) to reduce overall complexity`);
    }

    return recommendations.length > 0 ? recommendations : ['Complexity levels are relatively consistent across targets'];
  }

  private calculateBottleneckImpact(bottlenecks: any[]): any {
    if (bottlenecks.length === 0) {
      return {
        userExperience: 100,
        resourceCost: 0,
        scalabilityLimitation: 0,
        maintainabilityImpact: 0
      };
    }

    const avgPerformanceDegradation = bottlenecks.reduce((sum, b) => 
      sum + b.impact.performanceDegradation, 0) / bottlenecks.length;

    return {
      userExperience: Math.max(0, 100 - avgPerformanceDegradation),
      resourceCost: Math.min(100, avgPerformanceDegradation * 0.8),
      scalabilityLimitation: Math.min(100, avgPerformanceDegradation * 0.6),
      maintainabilityImpact: Math.min(100, avgPerformanceDegradation * 0.4)
    };
  }

  private prioritizeActions(bottlenecks: any[], opportunities: any[]): any[] {
    const actions: any[] = [];

    // Add bottleneck fixes as actions
    bottlenecks.forEach(bottleneck => {
      const priority = this.calculateBottleneckPriority(bottleneck);
      actions.push({
        action: `Fix ${bottleneck.type} bottleneck: ${bottleneck.description}`,
        priority,
        effort: bottleneck.estimatedFixTime,
        impact: bottleneck.impact.performanceDegradation / 10,
        roi: (bottleneck.impact.performanceDegradation / 10) / bottleneck.estimatedFixTime
      });
    });

    // Add optimization opportunities as actions
    opportunities.forEach(opportunity => {
      const priority = this.calculateOpportunityPriority(opportunity);
      const impact = (opportunity.expectedGain.executionTime + opportunity.expectedGain.cpuUsage) / 20;
      actions.push({
        action: `Implement ${opportunity.title}`,
        priority,
        effort: opportunity.estimatedEffort,
        impact,
        roi: impact / opportunity.estimatedEffort
      });
    });

    // Sort by ROI (descending)
    return actions.sort((a, b) => b.roi - a.roi).slice(0, 10); // Top 10 actions
  }

  private calculateBottleneckPriority(bottleneck: any): number {
    const severityScore = { 'low': 2, 'medium': 5, 'high': 8, 'critical': 10 }[bottleneck.severity] || 5;
    const impactScore = bottleneck.impact.performanceDegradation / 10;
    const confidenceScore = bottleneck.confidence * 10;

    return Math.min(10, (severityScore + impactScore + confidenceScore) / 3);
  }

  private calculateOpportunityPriority(opportunity: any): number {
    const impactScore = (opportunity.expectedGain.executionTime + opportunity.expectedGain.cpuUsage) / 20;
    const complexityPenalty = { 'low': 0, 'medium': -1, 'high': -3 }[opportunity.implementationComplexity] || 0;
    const riskPenalty = { 'low': 0, 'medium': -1, 'high': -2 }[opportunity.riskLevel] || 0;
    const confidenceScore = opportunity.confidence * 10;

    return Math.max(1, Math.min(10, impactScore + complexityPenalty + riskPenalty + (confidenceScore / 10)));
  }

  private calculateEstimatedGains(plan: any): any {
    return plan.expectedOutcome || {
      executionTime: 25,
      memoryUsage: 15,
      cpuUsage: 20,
      throughput: 30,
      latency: 25
    };
  }

  private createOptimizationTimeline(plan: any): any {
    const milestones = plan.phases.map((phase: any, index: number) => ({
      name: `${phase.name} Complete`,
      date: new Date(Date.now() + (index + 1) * phase.estimatedDuration * 60 * 60 * 1000),
      deliverables: [`${phase.name} implementation`],
      success_criteria: [`${phase.name} performance targets met`]
    }));

    return {
      phases: plan.phases,
      milestones,
      totalDuration: plan.estimatedImplementationTime,
      criticalPath: plan.phases.map((p: any) => p.name)
    };
  }

  private assessOptimizationRisk(plan: any): any {
    const phaseCount = plan.phases.length;
    const totalTime = plan.estimatedImplementationTime;

    return {
      overall: Math.min(1, (phaseCount * 0.1 + totalTime * 0.01) / 2),
      categories: {
        technical: Math.min(1, phaseCount * 0.15),
        timeline: Math.min(1, totalTime * 0.02),
        resource: 0.3, // Moderate resource risk
        integration: Math.min(1, plan.targetServers.length * 0.1)
      },
      mitigationStrategies: [
        'Implement comprehensive testing at each phase',
        'Maintain rollback capabilities',
        'Monitor performance metrics continuously',
        'Conduct regular progress reviews'
      ]
    };
  }

  private generateBenchmarkInsights(benchmark: any): any[] {
    const insights = [];

    if (benchmark.p99 > benchmark.avg * 3) {
      insights.push({
        type: 'anomaly',
        message: 'High variance detected in performance measurements',
        confidence: 0.8,
        actionable: true,
        recommendation: 'Investigate outliers in the 99th percentile'
      });
    }

    if (benchmark.p95 < 1000) {
      insights.push({
        type: 'pattern',
        message: 'Consistent sub-second performance',
        confidence: 0.9,
        actionable: false
      });
    }

    return insights;
  }

  private recordOperation(name: string, phase: 'start' | 'complete', data: any, operationId: string): void {
    if (!this.operationHistory.has(name)) {
      this.operationHistory.set(name, []);
    }

    const history = this.operationHistory.get(name)!;
    history.push({
      operationId,
      phase,
      timestamp: new Date(),
      data
    });

    // Keep only last 100 operations per tool
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private getOperationHistoryStats(): any {
    const stats: any = {};
    
    for (const [operation, history] of this.operationHistory) {
      const completedOperations = history.filter(h => h.phase === 'complete');
      if (completedOperations.length > 0) {
        const avgExecutionTime = completedOperations
          .filter(h => h.data.executionTime)
          .reduce((sum, h) => sum + h.data.executionTime, 0) / completedOperations.length;

        const successRate = completedOperations
          .filter(h => h.data.success !== undefined)
          .reduce((sum, h) => sum + (h.data.success ? 1 : 0), 0) / completedOperations.length;

        stats[operation] = {
          totalCalls: completedOperations.length,
          avgExecutionTime: avgExecutionTime || 0,
          successRate: successRate || 0
        };
      }
    }

    return stats;
  }

  private summarizeStats(detailedStats: any): any {
    return {
      overview: {
        complexityEstimatorCaches: detailedStats.complexityEstimator.metricsCache,
        performanceProfilerTargets: detailedStats.performanceProfiler.activeTargets,
        crossServerConnections: detailedStats.crossServerOptimizer.totalServers,
        totalOperations: Object.keys(detailedStats.operationHistory).length
      },
      health: {
        status: 'healthy',
        uptime: detailedStats.systemMetrics.uptime,
        memoryUsage: Math.round(detailedStats.systemMetrics.memoryUsage.heapUsed / 1024 / 1024)
      }
    };
  }

  // ==================== ERROR HANDLING ====================

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  private setupEventHandlers(): void {
    // Performance Profiler events
    this.performanceProfiler.on('alert_created', (data) => {
      logger.warn('Performance alert created', data.alert);
    });

    this.performanceProfiler.on('monitoring_started', (data) => {
      logger.info('Performance monitoring started', data);
    });

    // Cross-Server Optimizer events
    this.crossServerOptimizer.on('optimization_plan_created', (data) => {
      logger.info('Optimization plan created', { planId: data.plan.id });
    });

    this.crossServerOptimizer.on('server_metrics_updated', (data) => {
      logger.debug('Server metrics updated', data);
    });
  }

  private convertToMcpError(error: unknown): McpError {
    if (error instanceof ComplexityEstimationError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof MonitoringError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof OptimizationError) {
      return new McpError(ErrorCode.InternalError, error.message);
    }
    
    if (error instanceof BenchmarkingError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof PerformanceServerError) {
      return new McpError(ErrorCode.InternalError, error.message);
    }
    
    if (error instanceof Error) {
      return new McpError(ErrorCode.InternalError, error.message);
    }
    
    return new McpError(ErrorCode.InternalError, 'Unknown error occurred');
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
    
    console.error('SuperClaude Performance MCP server running on stdio');
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        // Cleanup all components
        this.performanceProfiler.cleanup();
        this.complexityEstimator.clearCache();
        this.crossServerOptimizer.clearCache();
        
        logger.info('SuperClaude Performance server shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
  }
}