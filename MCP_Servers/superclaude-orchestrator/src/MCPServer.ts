import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { OrchestratorEngine } from './core/OrchestratorEngine.js';
import { logger } from '@superclaude/shared';
import {
  MultiModelRequest,
  WaveExecutionPlan,
  WaveStrategy,
  WorkflowEvent,
  CoordinationStrategy,
  AIProvider,
  ModelCapability,
  OrchestratorToolResult,
  OrchestratorError,
  ModelProviderError,
  WaveExecutionError,
  CoordinationError
} from './types/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * SuperClaude Orchestrator MCP Server
 * Provides multi-model coordination, wave execution, and workflow management
 */
export class SuperClaudeOrchestratorServer {
  private server: Server;
  private orchestrator: OrchestratorEngine;

  constructor() {
    this.server = new Server(
      {
        name: 'superclaude-orchestrator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.orchestrator = new OrchestratorEngine();
    
    this.setupToolHandlers();
    this.setupErrorHandling();
    this.setupEventHandlers();
    
    logger.setServerName('superclaude-orchestrator');
    logger.info('SuperClaudeOrchestratorServer initialized');
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Multi-Model Coordination Tools
        {
          name: 'execute_multi_model_request',
          description: 'Execute request across multiple AI model providers',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  complexity: { type: 'string', enum: ['simple', 'moderate', 'complex', 'critical'] },
                  tags: { type: 'array', items: { type: 'string' } }
                },
                required: ['id', 'title']
              },
              preferredProviders: {
                type: 'array',
                items: { 
                  type: 'string', 
                  enum: ['claude', 'openai-gpt4', 'openai-gpt3.5', 'google-gemini', 'anthropic-claude', 'local-model'] 
                }
              },
              requiredCapabilities: {
                type: 'array',
                items: { 
                  type: 'string',
                  enum: ['text-generation', 'code-analysis', 'reasoning', 'creative-writing', 'translation', 'summarization', 'qa-answering']
                }
              },
              maxProviders: { type: 'number', default: 3 },
              fallbackStrategy: { 
                type: 'string', 
                enum: ['sequential', 'parallel', 'consensus'], 
                default: 'sequential' 
              },
              timeout: { type: 'number', default: 30000 }
            },
            required: ['task', 'requiredCapabilities']
          }
        },

        // Wave Execution Tools
        {
          name: 'create_wave_plan',
          description: 'Create a wave execution plan for complex operations',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              strategy: { 
                type: 'string', 
                enum: ['progressive', 'systematic', 'adaptive', 'enterprise'] 
              },
              phases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    dependencies: { type: 'array', items: { type: 'string' } },
                    tasks: { type: 'array', items: { type: 'string' } },
                    estimatedTokens: { type: 'number' },
                    priority: { type: 'number', minimum: 1, maximum: 10 }
                  },
                  required: ['id', 'name', 'estimatedTokens', 'priority']
                }
              },
              maxConcurrentPhases: { type: 'number', default: 3 },
              validationRequired: { type: 'boolean', default: true }
            },
            required: ['title', 'strategy', 'phases']
          }
        },
        {
          name: 'execute_wave',
          description: 'Execute a wave plan',
          inputSchema: {
            type: 'object',
            properties: {
              planId: { type: 'string' },
              plan: {
                type: 'object',
                description: 'Wave execution plan object'
              }
            },
            required: ['plan']
          }
        },
        {
          name: 'get_wave_status',
          description: 'Get status of wave execution',
          inputSchema: {
            type: 'object',
            properties: {
              executionId: { type: 'string' }
            },
            required: ['executionId']
          }
        },
        {
          name: 'cancel_wave',
          description: 'Cancel a running wave execution',
          inputSchema: {
            type: 'object',
            properties: {
              executionId: { type: 'string' }
            },
            required: ['executionId']
          }
        },
        {
          name: 'list_active_waves',
          description: 'List all active wave executions',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // Workflow Coordination Tools
        {
          name: 'emit_workflow_event',
          description: 'Emit a workflow event for system coordination',
          inputSchema: {
            type: 'object',
            properties: {
              type: { 
                type: 'string',
                enum: ['task-created', 'task-updated', 'task-completed', 'wave-started', 'wave-completed', 'model-response']
              },
              source: { type: 'string' },
              target: { type: 'string' },
              payload: { type: 'object' },
              priority: { type: 'number', minimum: 1, maximum: 10, default: 5 }
            },
            required: ['type', 'source', 'payload']
          }
        },
        {
          name: 'register_coordination_strategy',
          description: 'Register a new coordination strategy',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              rules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    condition: { type: 'string' },
                    action: { type: 'string' },
                    priority: { type: 'number' },
                    enabled: { type: 'boolean', default: true }
                  },
                  required: ['condition', 'action', 'priority']
                }
              },
              triggers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    event: { type: 'string' },
                    handler: { type: 'string' },
                    async: { type: 'boolean', default: false }
                  },
                  required: ['event', 'handler']
                }
              }
            },
            required: ['name', 'description', 'rules', 'triggers']
          }
        },

        // Analytics and Monitoring Tools
        {
          name: 'get_orchestrator_metrics',
          description: 'Get orchestrator performance metrics',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_provider_health',
          description: 'Get health status of AI providers',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_coordination_strategies',
          description: 'List registered coordination strategies',
          inputSchema: {
            type: 'object',
            properties: {}
          }
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
   * Setup event handlers from orchestrator
   */
  private setupEventHandlers(): void {
    this.orchestrator.on('wave-started', (execution) => {
      logger.info('Wave execution started', { executionId: execution.id });
    });

    this.orchestrator.on('wave-completed', (execution) => {
      logger.info('Wave execution completed', { 
        executionId: execution.id,
        status: execution.status
      });
    });

    this.orchestrator.on('wave-failed', (execution, error) => {
      logger.error('Wave execution failed', { 
        executionId: execution.id,
        error: error.message
      });
    });

    this.orchestrator.on('workflow-event', (event) => {
      logger.debug('Workflow event processed', { 
        eventId: event.id,
        type: event.type
      });
    });
  }

  /**
   * Handle tool calls
   */
  private async handleToolCall(name: string, args: any): Promise<OrchestratorToolResult> {
    try {
      switch (name) {
        // Multi-Model Coordination
        case 'execute_multi_model_request':
          return await this.handleExecuteMultiModelRequest(args);

        // Wave Execution
        case 'create_wave_plan':
          return await this.handleCreateWavePlan(args);
        case 'execute_wave':
          return await this.handleExecuteWave(args);
        case 'get_wave_status':
          return await this.handleGetWaveStatus(args);
        case 'cancel_wave':
          return await this.handleCancelWave(args);
        case 'list_active_waves':
          return await this.handleListActiveWaves(args);

        // Workflow Coordination
        case 'emit_workflow_event':
          return await this.handleEmitWorkflowEvent(args);
        case 'register_coordination_strategy':
          return await this.handleRegisterCoordinationStrategy(args);

        // Analytics and Monitoring
        case 'get_orchestrator_metrics':
          return await this.handleGetOrchestratorMetrics(args);
        case 'get_provider_health':
          return await this.handleGetProviderHealth(args);
        case 'get_coordination_strategies':
          return await this.handleGetCoordinationStrategies(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { tool: name, args }
      };
    }
  }

  // ==================== TOOL HANDLERS ====================

  private async handleExecuteMultiModelRequest(args: any): Promise<OrchestratorToolResult> {
    const request: MultiModelRequest = {
      id: uuidv4(),
      task: args.task,
      preferredProviders: args.preferredProviders || [],
      requiredCapabilities: args.requiredCapabilities,
      maxProviders: args.maxProviders || 3,
      fallbackStrategy: args.fallbackStrategy || 'sequential',
      timeout: args.timeout || 30000,
      retryAttempts: args.retryAttempts || 2,
      metadata: {}
    };

    const responses = await this.orchestrator.executeMultiModelRequest(request);

    return {
      success: true,
      data: {
        requestId: request.id,
        responses,
        responseCount: responses.length,
        avgConfidence: responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length,
        totalTokens: responses.reduce((sum, r) => sum + r.tokenUsage, 0)
      },
      metadata: { operation: 'execute_multi_model_request' }
    };
  }

  private async handleCreateWavePlan(args: any): Promise<OrchestratorToolResult> {
    const plan: WaveExecutionPlan = {
      id: uuidv4(),
      title: args.title,
      description: args.description,
      strategy: args.strategy as WaveStrategy,
      phases: args.phases,
      totalEstimatedTokens: args.phases.reduce((sum: number, phase: any) => sum + phase.estimatedTokens, 0),
      maxConcurrentPhases: args.maxConcurrentPhases || 3,
      validationRequired: args.validationRequired !== false,
      rollbackStrategy: args.rollbackStrategy || 'phase-complete',
      metadata: {}
    };

    return {
      success: true,
      data: plan,
      metadata: { operation: 'create_wave_plan', planId: plan.id }
    };
  }

  private async handleExecuteWave(args: any): Promise<OrchestratorToolResult> {
    const execution = await this.orchestrator.executeWave(args.plan);

    return {
      success: true,
      data: execution,
      metadata: { operation: 'execute_wave', executionId: execution.id }
    };
  }

  private async handleGetWaveStatus(args: any): Promise<OrchestratorToolResult> {
    const execution = this.orchestrator.getExecutionStatus(args.executionId);

    if (!execution) {
      return {
        success: false,
        error: `Wave execution not found: ${args.executionId}`,
        metadata: { operation: 'get_wave_status' }
      };
    }

    return {
      success: true,
      data: execution,
      metadata: { operation: 'get_wave_status', executionId: args.executionId }
    };
  }

  private async handleCancelWave(args: any): Promise<OrchestratorToolResult> {
    const cancelled = await this.orchestrator.cancelExecution(args.executionId);

    return {
      success: cancelled,
      data: { cancelled },
      metadata: { operation: 'cancel_wave', executionId: args.executionId }
    };
  }

  private async handleListActiveWaves(args: any): Promise<OrchestratorToolResult> {
    const executions = this.orchestrator.getActiveExecutions();

    return {
      success: true,
      data: executions,
      metadata: { operation: 'list_active_waves', count: executions.length }
    };
  }

  private async handleEmitWorkflowEvent(args: any): Promise<OrchestratorToolResult> {
    const event: WorkflowEvent = {
      id: uuidv4(),
      type: args.type,
      source: args.source,
      target: args.target,
      payload: args.payload,
      timestamp: new Date(),
      priority: args.priority || 5
    };

    await this.orchestrator.emitWorkflowEvent(event);

    return {
      success: true,
      data: { eventId: event.id },
      metadata: { operation: 'emit_workflow_event' }
    };
  }

  private async handleRegisterCoordinationStrategy(args: any): Promise<OrchestratorToolResult> {
    const strategy: CoordinationStrategy = {
      name: args.name,
      description: args.description,
      rules: args.rules,
      triggers: args.triggers,
      metadata: { registered: new Date() }
    };

    this.orchestrator.registerCoordinationStrategy(strategy);

    return {
      success: true,
      data: { strategyName: strategy.name },
      metadata: { operation: 'register_coordination_strategy' }
    };
  }

  private async handleGetOrchestratorMetrics(args: any): Promise<OrchestratorToolResult> {
    const activeExecutions = this.orchestrator.getActiveExecutions();
    
    const metrics = {
      activeExecutions: activeExecutions.length,
      totalExecutions: activeExecutions.length, // Would be more comprehensive in production
      averageExecutionTime: this.calculateAverageExecutionTime(activeExecutions),
      successRate: this.calculateSuccessRate(activeExecutions),
      resourceUtilization: this.calculateResourceUtilization(activeExecutions)
    };

    return {
      success: true,
      data: metrics,
      metadata: { operation: 'get_orchestrator_metrics' }
    };
  }

  private async handleGetProviderHealth(args: any): Promise<OrchestratorToolResult> {
    // This would get health from ModelCoordinator in production
    const mockHealth = new Map([
      ['claude', { isHealthy: true, lastCheck: new Date(), responseTime: 150, errorRate: 0.01 }],
      ['openai-gpt4', { isHealthy: true, lastCheck: new Date(), responseTime: 200, errorRate: 0.02 }],
      ['google-gemini', { isHealthy: false, lastCheck: new Date(), responseTime: 500, errorRate: 0.15 }]
    ]);

    return {
      success: true,
      data: Object.fromEntries(mockHealth),
      metadata: { operation: 'get_provider_health' }
    };
  }

  private async handleGetCoordinationStrategies(args: any): Promise<OrchestratorToolResult> {
    // This would get strategies from WorkflowCoordinator in production
    const strategies = ['progressive', 'systematic', 'adaptive', 'enterprise'];

    return {
      success: true,
      data: strategies,
      metadata: { operation: 'get_coordination_strategies', count: strategies.length }
    };
  }

  // ==================== HELPER METHODS ====================

  private calculateAverageExecutionTime(executions: any[]): number {
    if (executions.length === 0) return 0;
    
    const totalTime = executions.reduce((sum, exec) => {
      if (exec.endTime && exec.startTime) {
        return sum + (exec.endTime.getTime() - exec.startTime.getTime());
      }
      return sum;
    }, 0);
    
    return totalTime / executions.length;
  }

  private calculateSuccessRate(executions: any[]): number {
    if (executions.length === 0) return 1;
    
    const successCount = executions.filter(exec => exec.status === 'completed').length;
    return successCount / executions.length;
  }

  private calculateResourceUtilization(executions: any[]): number {
    // Mock calculation
    return Math.min(executions.length / 10, 1); // Assume max 10 concurrent executions
  }

  // ==================== ERROR HANDLING ====================

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason, promise });
      process.exit(1);
    });
  }

  private convertToMcpError(error: unknown): McpError {
    if (error instanceof ModelProviderError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof WaveExecutionError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof CoordinationError) {
      return new McpError(ErrorCode.InternalError, error.message);
    }
    
    if (error instanceof OrchestratorError) {
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
    logger.info('SuperClaude Orchestrator MCP server running on stdio');
  }

  /**
   * Shutdown the server
   */
  async shutdown(): Promise<void> {
    try {
      await this.orchestrator.cleanup();
      logger.info('SuperClaude Orchestrator MCP server shutdown completed');
    } catch (error) {
      logger.error('Error during server shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}"