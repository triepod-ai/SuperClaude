import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';

import { TaskQueueManager } from './TaskQueue.js';
import { TaskDecomposer } from './TaskDecomposer.js';
import { PRDParser } from './PRDParser.js';
import { DatabaseManager, DatabaseConfig } from './DatabaseManager.js';
import { EventManager, TaskEvent } from './EventManager.js';
import { ProviderManager, AIProvider, TaskGenerationRequest, TaskAnalysisRequest } from './ProviderManager.js';
import { SchedulingEngine, SchedulingAlgorithm, ScheduleConfig } from './SchedulingEngine.js';
import { LearningEngine, LearningConfig, PredictionRequest, DEFAULT_FEATURES } from './LearningEngine.js';
import { AnalyticsEngine, MetricType, TimeWindow } from './AnalyticsEngine.js';
import { LSPIntegration, SupportedLanguage, LSPServerConfig } from './LSPIntegration.js';
import {
  Task,
  TaskState,
  TaskPriority,
  TaskComplexity,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterOptions,
  TaskSortOptions,
  DecompositionOptions,
  MCPToolResult,
  TaskNotFoundError,
  QueueNotFoundError,
  TaskValidationError,
  TaskDependencyError,
  TaskStateError
} from '../types/index.js';

/**
 * SuperClaude Tasks MCP Server - Production Grade
 * Provides comprehensive task management with AI, analytics, scheduling, and code awareness
 */
export class SuperClaudeTasksServer {
  private server: Server;
  private taskQueue: TaskQueueManager;
  private decomposer: TaskDecomposer;
  private prdParser: PRDParser;
  
  // Production-grade components
  private databaseManager?: DatabaseManager;
  private eventManager: EventManager;
  private providerManager: ProviderManager;
  private schedulingEngine: SchedulingEngine;
  private learningEngine: LearningEngine;
  private analyticsEngine: AnalyticsEngine;
  private lspIntegration: LSPIntegration;
  
  // Configuration
  private config: {
    database?: DatabaseConfig;
    enablePersistence: boolean;
    enableAnalytics: boolean;
    enableScheduling: boolean;
    enableLearning: boolean;
    enableLSP: boolean;
    enableAI: boolean;
  };

  constructor(config: any = {}) {
    this.server = new Server(
      {
        name: 'superclaude-tasks',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize configuration
    this.config = {
      enablePersistence: config.enablePersistence ?? false,
      enableAnalytics: config.enableAnalytics ?? true,
      enableScheduling: config.enableScheduling ?? true,
      enableLearning: config.enableLearning ?? true,
      enableLSP: config.enableLSP ?? false,
      enableAI: config.enableAI ?? false,
      database: config.database
    };

    // Initialize database manager if persistence is enabled
    if (this.config.enablePersistence && this.config.database) {
      this.databaseManager = new DatabaseManager(this.config.database);
    }

    // Initialize core components
    this.taskQueue = new TaskQueueManager();
    this.decomposer = new TaskDecomposer();
    this.prdParser = new PRDParser();
    
    // Initialize production components
    this.eventManager = new EventManager({
      enabled: true,
      storageType: 'memory',
      maxEvents: 10000,
      ttlDays: 30
    });
    
    this.providerManager = new ProviderManager();
    this.schedulingEngine = new SchedulingEngine();
    
    const learningConfig: LearningConfig = {
      algorithm: 'ensemble',
      features: DEFAULT_FEATURES,
      targetVariable: 'duration',
      hyperparameters: {},
      validationSplit: 0.2,
      minTrainingSize: 50,
      retrainFrequency: 24,
      enableOnlineUpdates: true,
      featureSelection: {
        enabled: true,
        method: 'correlation',
        topK: 10
      }
    };
    this.learningEngine = new LearningEngine(learningConfig);
    
    this.analyticsEngine = new AnalyticsEngine();
    this.lspIntegration = new LSPIntegration();

    this.setupIntegrations();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  /**
   * Setup integrations between components
   */
  private setupIntegrations(): void {
    // Connect event handlers for database operations when persistence is enabled
    if (this.config.enablePersistence && this.databaseManager) {
      this.taskQueue.on('taskCreated', async (task: Task) => {
        await this.eventManager.emitEvent('task.created', { task });
      });
      
      this.taskQueue.on('taskUpdated', async (task: Task) => {
        await this.eventManager.emitEvent('task.updated', { task });
      });
      
      this.taskQueue.on('taskDeleted', async (taskId: string) => {
        await this.eventManager.emitEvent('task.deleted', { taskId });
      });
    }

    // Connect analytics events
    if (this.config.enableAnalytics) {
      this.eventManager.on('task.completed', async (data: any) => {
        // Learning engine training data collection
        if (this.config.enableLearning) {
          const task = data.task;
          const features = {
            complexity: task.complexity,
            priority: task.priority,
            descriptionLength: task.description?.length || 0,
            dependencyCount: task.dependencies?.length || 0,
            tagCount: task.tags?.length || 0
          };
          
          // Note: recordCompletion method would need to be implemented in LearningEngine
          // This is a placeholder for the learning system integration
        }
      });
    }

    // Connect scheduling engine events
    if (this.config.enableScheduling) {
      this.eventManager.on('task.created', async (data: any) => {
        // Trigger schedule recalculation when new tasks are added
        // Note: invalidateSchedule method would need to be implemented in SchedulingEngine
        // This is a placeholder for the scheduling system integration
      });
    }
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Task Management Tools
        {
          name: 'create_task',
          description: 'Create a new task with validation and dependency checking',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Task title' },
              description: { type: 'string', description: 'Task description' },
              priority: { 
                type: 'string', 
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Task priority'
              },
              complexity: {
                type: 'string',
                enum: ['simple', 'moderate', 'complex', 'very_complex'],
                description: 'Task complexity'
              },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of task IDs this task depends on'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of tags for categorization'
              },
              assignee: { type: 'string', description: 'Task assignee' },
              estimatedHours: { type: 'number', description: 'Estimated hours to complete' },
              dueDate: { type: 'string', format: 'date-time', description: 'Due date' },
              queueId: { type: 'string', description: 'Queue ID (defaults to "default")' }
            },
            required: ['title'],
          },
        },
        {
          name: 'get_task',
          description: 'Retrieve a task by ID',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID' },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'update_task',
          description: 'Update an existing task',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Task ID' },
              title: { type: 'string', description: 'Updated title' },
              description: { type: 'string', description: 'Updated description' },
              state: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
                description: 'Updated state'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Updated priority'
              },
              assignee: { type: 'string', description: 'Updated assignee' },
              actualHours: { type: 'number', description: 'Actual hours spent' },
            },
            required: ['id'],
          },
        },
        {
          name: 'delete_task',
          description: 'Delete a task',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID to delete' },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'list_tasks',
          description: 'List tasks with filtering and sorting options',
          inputSchema: {
            type: 'object',
            properties: {
              filter: {
                type: 'object',
                properties: {
                  state: {
                    type: 'array',
                    items: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'] }
                  },
                  priority: {
                    type: 'array',
                    items: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
                  },
                  assignee: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  parentId: { type: 'string' },
                  hasParent: { type: 'boolean' },
                },
              },
              sort: {
                type: 'object',
                properties: {
                  field: { type: 'string', description: 'Field to sort by' },
                  direction: { type: 'string', enum: ['asc', 'desc'] },
                },
              },
              limit: { type: 'number', description: 'Maximum number of tasks to return' },
              offset: { type: 'number', description: 'Number of tasks to skip' },
            },
          },
        },

        // Task Decomposition Tools
        {
          name: 'decompose_task',
          description: 'Break down a complex task into smaller subtasks',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID to decompose' },
              maxDepth: { type: 'number', description: 'Maximum decomposition depth', default: 3 },
              targetComplexity: {
                type: 'string',
                enum: ['simple', 'moderate', 'complex', 'very_complex'],
                description: 'Target complexity for subtasks',
                default: 'simple'
              },
              estimateHours: { type: 'boolean', description: 'Whether to estimate hours for subtasks', default: true },
              generateDependencies: { type: 'boolean', description: 'Whether to generate dependencies between subtasks', default: true },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'assess_task_complexity',
          description: 'Assess the complexity of a task',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID to assess' },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'suggest_breakdown_strategies',
          description: 'Suggest strategies for breaking down a complex task',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID to analyze' },
            },
            required: ['taskId'],
          },
        },

        // PRD Parsing Tools
        {
          name: 'parse_prd',
          description: 'Parse a Product Requirements Document and extract tasks',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'PRD content to parse' },
              title: { type: 'string', description: 'Document title (optional)' },
            },
            required: ['content'],
          },
        },
        {
          name: 'parse_section_for_tasks',
          description: 'Parse a specific section for actionable tasks',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Section content to parse' },
              sectionTitle: { type: 'string', description: 'Section title (optional)' },
            },
            required: ['content'],
          },
        },
        {
          name: 'parse_list_for_tasks',
          description: 'Parse a bullet point or numbered list for tasks',
          inputSchema: {
            type: 'object',
            properties: {
              listContent: { type: 'string', description: 'List content to parse' },
            },
            required: ['listContent'],
          },
        },
        {
          name: 'parse_requirements_with_acceptance',
          description: 'Parse requirements document and extract acceptance criteria',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Requirements content to parse' },
            },
            required: ['content'],
          },
        },

        // Queue Management Tools
        {
          name: 'create_queue',
          description: 'Create a new task queue',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Queue name' },
              description: { type: 'string', description: 'Queue description' },
              maxConcurrentTasks: { type: 'number', description: 'Maximum concurrent tasks', default: 3 },
            },
            required: ['name'],
          },
        },
        {
          name: 'list_queues',
          description: 'List all task queues',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_next_executable_tasks',
          description: 'Get next executable tasks from a queue',
          inputSchema: {
            type: 'object',
            properties: {
              queueId: { type: 'string', description: 'Queue ID (defaults to "default")' },
            },
          },
        },

        // Advanced Feature Tools
        {
          name: 'generate_ai_tasks',
          description: 'Generate tasks using AI providers based on requirements',
          inputSchema: {
            type: 'object',
            properties: {
              requirements: { type: 'string', description: 'Task requirements or description' },
              context: { type: 'string', description: 'Additional context information' },
              provider: { 
                type: 'string', 
                enum: ['openai', 'anthropic', 'google'],
                description: 'AI provider to use (optional, will auto-select if not specified)'
              },
              maxTasks: { type: 'number', description: 'Maximum number of tasks to generate', default: 5 },
              targetComplexity: {
                type: 'string',
                enum: ['simple', 'moderate', 'complex', 'very_complex'],
                description: 'Target complexity for generated tasks'
              }
            },
            required: ['requirements']
          }
        },
        {
          name: 'analyze_task_with_ai',
          description: 'Analyze task using AI for insights and recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID to analyze' },
              analysisType: {
                type: 'string',
                enum: ['complexity', 'dependencies', 'risks', 'estimation', 'breakdown'],
                description: 'Type of analysis to perform'
              },
              provider: {
                type: 'string',
                enum: ['openai', 'anthropic', 'google'],
                description: 'AI provider to use (optional)'
              }
            },
            required: ['taskId', 'analysisType']
          }
        },
        {
          name: 'generate_schedule',
          description: 'Generate optimized schedule for tasks using advanced algorithms',
          inputSchema: {
            type: 'object',
            properties: {
              queueId: { type: 'string', description: 'Queue ID to schedule (optional, defaults to all queues)' },
              algorithm: {
                type: 'string',
                enum: ['priority', 'deadline', 'critical_path', 'resource_aware', 'hybrid'],
                description: 'Scheduling algorithm to use'
              },
              resourceConstraints: {
                type: 'object',
                properties: {
                  maxConcurrentTasks: { type: 'number' },
                  availableHours: { type: 'number' },
                  skillRequirements: { type: 'array', items: { type: 'string' } }
                }
              },
              timeframe: {
                type: 'object',
                properties: {
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        {
          name: 'predict_task_duration',
          description: 'Predict task duration using machine learning',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID to predict duration for' },
              features: {
                type: 'object',
                description: 'Additional features for prediction (optional)'
              }
            },
            required: ['taskId']
          }
        },
        {
          name: 'get_analytics_metrics',
          description: 'Get comprehensive analytics metrics for tasks and performance',
          inputSchema: {
            type: 'object',
            properties: {
              timeWindow: {
                type: 'string',
                enum: ['hour', 'day', 'week', 'month', 'quarter', 'year'],
                description: 'Time window for metrics calculation'
              },
              metricTypes: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['performance', 'productivity', 'quality', 'resource_utilization', 'bottleneck', 'trend']
                },
                description: 'Types of metrics to calculate'
              },
              queueId: { type: 'string', description: 'Queue ID to analyze (optional)' }
            }
          }
        },
        {
          name: 'detect_bottlenecks',
          description: 'Detect bottlenecks in task workflow and processes',
          inputSchema: {
            type: 'object',
            properties: {
              scope: {
                type: 'string',
                enum: ['queue', 'project', 'team', 'system'],
                description: 'Scope of bottleneck detection'
              },
              queueId: { type: 'string', description: 'Queue ID to analyze (optional)' }
            }
          }
        },
        {
          name: 'analyze_code_for_tasks',
          description: 'Analyze code files to generate relevant tasks using LSP integration',
          inputSchema: {
            type: 'object',
            properties: {
              filePaths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of file paths to analyze'
              },
              language: {
                type: 'string',
                enum: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'cpp', 'csharp', 'php', 'ruby'],
                description: 'Programming language (optional, will auto-detect)'
              },
              analysisDepth: {
                type: 'string',
                enum: ['surface', 'moderate', 'deep'],
                description: 'Depth of code analysis',
                default: 'moderate'
              }
            },
            required: ['filePaths']
          }
        },
        {
          name: 'get_code_impact_analysis',
          description: 'Analyze impact of code changes on existing tasks',
          inputSchema: {
            type: 'object',
            properties: {
              filePaths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of changed file paths'
              },
              changeType: {
                type: 'string',
                enum: ['added', 'modified', 'deleted', 'renamed'],
                description: 'Type of change'
              }
            },
            required: ['filePaths', 'changeType']
          }
        },

        // Analytics Tools
        {
          name: 'get_task_statistics',
          description: 'Get task statistics and analytics',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_task_dependencies',
          description: 'Get tasks that a task depends on',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID' },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'get_task_dependents',
          description: 'Get tasks that depend on a task',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID' },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'get_subtasks',
          description: 'Get subtasks of a parent task',
          inputSchema: {
            type: 'object',
            properties: {
              parentId: { type: 'string', description: 'Parent task ID' },
            },
            required: ['parentId'],
          },
        },
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
      switch (name) {
        // Task Management
        case 'create_task':
          return await this.handleCreateTask(args);
        case 'get_task':
          return await this.handleGetTask(args);
        case 'update_task':
          return await this.handleUpdateTask(args);
        case 'delete_task':
          return await this.handleDeleteTask(args);
        case 'list_tasks':
          return await this.handleListTasks(args);

        // Task Decomposition
        case 'decompose_task':
          return await this.handleDecomposeTask(args);
        case 'assess_task_complexity':
          return await this.handleAssessTaskComplexity(args);
        case 'suggest_breakdown_strategies':
          return await this.handleSuggestBreakdownStrategies(args);

        // PRD Parsing
        case 'parse_prd':
          return await this.handleParsePRD(args);
        case 'parse_section_for_tasks':
          return await this.handleParseSectionForTasks(args);
        case 'parse_list_for_tasks':
          return await this.handleParseListForTasks(args);
        case 'parse_requirements_with_acceptance':
          return await this.handleParseRequirementsWithAcceptance(args);

        // Queue Management
        case 'create_queue':
          return await this.handleCreateQueue(args);
        case 'list_queues':
          return await this.handleListQueues(args);
        case 'get_next_executable_tasks':
          return await this.handleGetNextExecutableTasks(args);

        // Advanced Features
        case 'generate_ai_tasks':
          return await this.handleGenerateAITasks(args);
        case 'analyze_task_with_ai':
          return await this.handleAnalyzeTaskWithAI(args);
        case 'generate_schedule':
          return await this.handleGenerateSchedule(args);
        case 'predict_task_duration':
          return await this.handlePredictTaskDuration(args);
        case 'get_analytics_metrics':
          return await this.handleGetAnalyticsMetrics(args);
        case 'detect_bottlenecks':
          return await this.handleDetectBottlenecks(args);
        case 'analyze_code_for_tasks':
          return await this.handleAnalyzeCodeForTasks(args);
        case 'get_code_impact_analysis':
          return await this.handleGetCodeImpactAnalysis(args);

        // Analytics
        case 'get_task_statistics':
          return await this.handleGetTaskStatistics(args);
        case 'get_task_dependencies':
          return await this.handleGetTaskDependencies(args);
        case 'get_task_dependents':
          return await this.handleGetTaskDependents(args);
        case 'get_subtasks':
          return await this.handleGetSubtasks(args);

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

  // ==================== TASK MANAGEMENT HANDLERS ====================

  private async handleCreateTask(args: any): Promise<MCPToolResult> {
    const input: CreateTaskInput = {
      title: args.title,
      description: args.description,
      state: TaskState.PENDING,
      priority: args.priority || TaskPriority.MEDIUM,
      complexity: args.complexity,
      dependencies: args.dependencies || [],
      tags: args.tags || [],
      assignee: args.assignee,
      estimatedHours: args.estimatedHours,
      dueDate: args.dueDate ? new Date(args.dueDate) : undefined
    };

    const task = await this.taskQueue.createTask(input, args.queueId);
    
    // Emit event for integrations
    await this.eventManager.emitEvent('task.created', { task });
    
    return {
      success: true,
      data: task,
      metadata: { operation: 'create_task', taskId: task.id }
    };
  }

  private async handleGetTask(args: any): Promise<MCPToolResult> {
    const task = await this.taskQueue.getTask(args.taskId);
    
    return {
      success: true,
      data: task,
      metadata: { operation: 'get_task', taskId: args.taskId }
    };
  }

  private async handleUpdateTask(args: any): Promise<MCPToolResult> {
    const update: UpdateTaskInput = {
      id: args.id,
      ...args
    };

    const task = await this.taskQueue.updateTask(update);
    
    // Emit event for integrations
    await this.eventManager.emitEvent('task.updated', { task });
    
    // Check if task was completed for learning engine
    if (task.state === TaskState.COMPLETED) {
      await this.eventManager.emitEvent('task.completed', { task });
    }
    
    return {
      success: true,
      data: task,
      metadata: { operation: 'update_task', taskId: args.id }
    };
  }

  private async handleDeleteTask(args: any): Promise<MCPToolResult> {
    await this.taskQueue.deleteTask(args.taskId);
    
    // Emit event for integrations
    await this.eventManager.emitEvent('task.deleted', { taskId: args.taskId });
    
    return {
      success: true,
      data: { deleted: true },
      metadata: { operation: 'delete_task', taskId: args.taskId }
    };
  }

  private async handleListTasks(args: any): Promise<MCPToolResult> {
    const filter: TaskFilterOptions = args.filter || {};
    const sort: TaskSortOptions = args.sort || { field: 'createdAt', direction: 'desc' };
    
    const tasks = await this.taskQueue.listTasks(filter, sort, args.limit, args.offset);
    
    return {
      success: true,
      data: tasks,
      metadata: { 
        operation: 'list_tasks', 
        count: tasks.length,
        filter: args.filter,
        sort: args.sort
      }
    };
  }

  // ==================== TASK DECOMPOSITION HANDLERS ====================

  private async handleDecomposeTask(args: any): Promise<MCPToolResult> {
    const task = await this.taskQueue.getTask(args.taskId);
    
    const options: DecompositionOptions = {
      maxDepth: args.maxDepth || 3,
      targetComplexity: args.targetComplexity || TaskComplexity.SIMPLE,
      estimateHours: args.estimateHours !== false,
      generateDependencies: args.generateDependencies !== false
    };

    const subtasks = await this.decomposer.decomposeTask(task, options);
    
    // Create subtasks in queue
    const createdSubtasks: Task[] = [];
    for (const subtask of subtasks) {
      if (subtask.id !== task.id) { // Don't recreate original task
        const created = await this.taskQueue.createTask(subtask);
        createdSubtasks.push(created);
      }
    }
    
    return {
      success: true,
      data: {
        originalTask: task,
        subtasks: createdSubtasks,
        decompositionOptions: options
      },
      metadata: { 
        operation: 'decompose_task',
        originalTaskId: args.taskId,
        subtaskCount: createdSubtasks.length
      }
    };
  }

  private async handleAssessTaskComplexity(args: any): Promise<MCPToolResult> {
    const task = await this.taskQueue.getTask(args.taskId);
    
    const complexityScore = this.decomposer.assessTaskComplexity(task);
    const complexityCategory = this.decomposer.estimateComplexity(task);
    
    return {
      success: true,
      data: {
        taskId: args.taskId,
        complexityScore,
        complexityCategory,
        currentComplexity: task.complexity
      },
      metadata: { operation: 'assess_task_complexity', taskId: args.taskId }
    };
  }

  private async handleSuggestBreakdownStrategies(args: any): Promise<MCPToolResult> {
    const task = await this.taskQueue.getTask(args.taskId);
    
    const strategies = this.decomposer.suggestBreakdownStrategies(task);
    
    return {
      success: true,
      data: {
        taskId: args.taskId,
        strategies,
        taskComplexity: this.decomposer.estimateComplexity(task)
      },
      metadata: { operation: 'suggest_breakdown_strategies', taskId: args.taskId }
    };
  }

  // ==================== PRD PARSING HANDLERS ====================

  private async handleParsePRD(args: any): Promise<MCPToolResult> {
    const parseResult = await this.prdParser.parsePRD(args.content, args.title);
    
    // Create tasks in queue
    const createdTasks: Task[] = [];
    for (const task of parseResult.extractedTasks) {
      const created = await this.taskQueue.createTask(task);
      createdTasks.push(created);
    }
    
    return {
      success: true,
      data: {
        parseResult: {
          ...parseResult,
          extractedTasks: createdTasks // Return created tasks with IDs
        }
      },
      metadata: { 
        operation: 'parse_prd',
        taskCount: createdTasks.length,
        documentComplexity: parseResult.metadata.complexity
      }
    };
  }

  private async handleParseSectionForTasks(args: any): Promise<MCPToolResult> {
    const tasks = await this.prdParser.parseSectionForTasks(args.content, args.sectionTitle);
    
    // Create tasks in queue
    const createdTasks: Task[] = [];
    for (const task of tasks) {
      const created = await this.taskQueue.createTask(task);
      createdTasks.push(created);
    }
    
    return {
      success: true,
      data: createdTasks,
      metadata: { 
        operation: 'parse_section_for_tasks',
        taskCount: createdTasks.length,
        sectionTitle: args.sectionTitle
      }
    };
  }

  private async handleParseListForTasks(args: any): Promise<MCPToolResult> {
    const tasks = await this.prdParser.parseListForTasks(args.listContent);
    
    // Create tasks in queue
    const createdTasks: Task[] = [];
    for (const task of tasks) {
      const created = await this.taskQueue.createTask(task);
      createdTasks.push(created);
    }
    
    return {
      success: true,
      data: createdTasks,
      metadata: { 
        operation: 'parse_list_for_tasks',
        taskCount: createdTasks.length
      }
    };
  }

  private async handleParseRequirementsWithAcceptance(args: any): Promise<MCPToolResult> {
    const result = await this.prdParser.parseRequirementsWithAcceptance(args.content);
    
    // Create requirements in queue
    const createdRequirements: Task[] = [];
    for (const requirement of result.requirements) {
      const created = await this.taskQueue.createTask(requirement);
      createdRequirements.push(created);
    }
    
    return {
      success: true,
      data: {
        requirements: createdRequirements,
        acceptanceCriteria: result.acceptanceCriteria
      },
      metadata: { 
        operation: 'parse_requirements_with_acceptance',
        requirementCount: createdRequirements.length,
        criteriaCount: Object.keys(result.acceptanceCriteria).length
      }
    };
  }

  // ==================== QUEUE MANAGEMENT HANDLERS ====================

  private async handleCreateQueue(args: any): Promise<MCPToolResult> {
    const queue = await this.taskQueue.createQueue(
      args.name,
      args.description,
      args.maxConcurrentTasks
    );
    
    return {
      success: true,
      data: queue,
      metadata: { operation: 'create_queue', queueId: queue.id }
    };
  }

  private async handleListQueues(args: any): Promise<MCPToolResult> {
    const queues = await this.taskQueue.listQueues();
    
    return {
      success: true,
      data: queues,
      metadata: { operation: 'list_queues', count: queues.length }
    };
  }

  private async handleGetNextExecutableTasks(args: any): Promise<MCPToolResult> {
    const tasks = await this.taskQueue.getNextExecutableTasks(args.queueId || 'default');
    
    return {
      success: true,
      data: tasks,
      metadata: { 
        operation: 'get_next_executable_tasks',
        queueId: args.queueId || 'default',
        count: tasks.length
      }
    };
  }

  // ==================== ANALYTICS HANDLERS ====================

  private async handleGetTaskStatistics(args: any): Promise<MCPToolResult> {
    const stats = await this.taskQueue.getTaskStatistics();
    
    return {
      success: true,
      data: stats,
      metadata: { operation: 'get_task_statistics' }
    };
  }

  private async handleGetTaskDependencies(args: any): Promise<MCPToolResult> {
    const dependencies = await this.taskQueue.getTaskDependencies(args.taskId);
    
    return {
      success: true,
      data: dependencies,
      metadata: { 
        operation: 'get_task_dependencies',
        taskId: args.taskId,
        count: dependencies.length
      }
    };
  }

  private async handleGetTaskDependents(args: any): Promise<MCPToolResult> {
    const dependents = await this.taskQueue.getTaskDependents(args.taskId);
    
    return {
      success: true,
      data: dependents,
      metadata: { 
        operation: 'get_task_dependents',
        taskId: args.taskId,
        count: dependents.length
      }
    };
  }

  private async handleGetSubtasks(args: any): Promise<MCPToolResult> {
    const subtasks = await this.taskQueue.getSubtasks(args.parentId);
    
    return {
      success: true,
      data: subtasks,
      metadata: { 
        operation: 'get_subtasks',
        parentId: args.parentId,
        count: subtasks.length
      }
    };
  }

  // ==================== ADVANCED FEATURE HANDLERS ====================

  private async handleGenerateAITasks(args: any): Promise<MCPToolResult> {
    if (!this.config.enableAI) {
      return {
        success: false,
        error: 'AI features are disabled',
        metadata: { operation: 'generate_ai_tasks' }
      };
    }

    const request: TaskGenerationRequest = {
      requirements: args.requirements,
      context: args.context,
      maxTasks: args.maxTasks || 5,
      targetComplexity: args.targetComplexity,
      provider: args.provider
    };

    const response = await this.providerManager.generateTasks(request);
    
    // Create tasks in queue
    const createdTasks: Task[] = [];
    for (const taskData of response.tasks) {
      const created = await this.taskQueue.createTask(taskData);
      createdTasks.push(created);
    }

    return {
      success: true,
      data: {
        tasks: createdTasks,
        provider: response.provider,
        confidence: response.confidence,
        processingTime: response.processingTime
      },
      metadata: { 
        operation: 'generate_ai_tasks',
        taskCount: createdTasks.length,
        provider: response.provider
      }
    };
  }

  private async handleAnalyzeTaskWithAI(args: any): Promise<MCPToolResult> {
    if (!this.config.enableAI) {
      return {
        success: false,
        error: 'AI features are disabled',
        metadata: { operation: 'analyze_task_with_ai' }
      };
    }

    const task = await this.taskQueue.getTask(args.taskId);
    
    const request: TaskAnalysisRequest = {
      task,
      analysisType: args.analysisType,
      provider: args.provider
    };

    const response = await this.providerManager.analyzeTask(request);

    return {
      success: true,
      data: response,
      metadata: { 
        operation: 'analyze_task_with_ai',
        taskId: args.taskId,
        analysisType: args.analysisType,
        provider: response.provider
      }
    };
  }

  private async handleGenerateSchedule(args: any): Promise<MCPToolResult> {
    if (!this.config.enableScheduling) {
      return {
        success: false,
        error: 'Scheduling features are disabled',
        metadata: { operation: 'generate_schedule' }
      };
    }

    // Get tasks to schedule
    let tasks: Task[];
    if (args.queueId) {
      tasks = await this.taskQueue.listTasks({ queueId: args.queueId });
    } else {
      tasks = await this.taskQueue.listTasks({});
    }

    const config: ScheduleConfig = {
      algorithm: args.algorithm || SchedulingAlgorithm.HYBRID,
      resourceConstraints: args.resourceConstraints,
      timeframe: args.timeframe ? {
        startDate: new Date(args.timeframe.startDate),
        endDate: new Date(args.timeframe.endDate)
      } : undefined
    };

    const scheduleResult = await this.schedulingEngine.generateSchedule(tasks, config);

    return {
      success: true,
      data: scheduleResult,
      metadata: { 
        operation: 'generate_schedule',
        algorithm: config.algorithm,
        taskCount: tasks.length,
        scheduleId: scheduleResult.scheduleId
      }
    };
  }

  private async handlePredictTaskDuration(args: any): Promise<MCPToolResult> {
    if (!this.config.enableLearning) {
      return {
        success: false,
        error: 'Learning features are disabled',
        metadata: { operation: 'predict_task_duration' }
      };
    }

    const task = await this.taskQueue.getTask(args.taskId);
    
    const features = args.features || {
      complexity: task.complexity,
      priority: task.priority,
      descriptionLength: task.description?.length || 0,
      dependencyCount: task.dependencies?.length || 0,
      tagCount: task.tags?.length || 0
    };

    const request: PredictionRequest = {
      features,
      targetVariable: 'duration'
    };

    const prediction = await this.learningEngine.predict(request);

    return {
      success: true,
      data: {
        taskId: args.taskId,
        prediction: prediction.value,
        confidence: prediction.confidence,
        algorithm: prediction.algorithm,
        features: prediction.features
      },
      metadata: { 
        operation: 'predict_task_duration',
        taskId: args.taskId,
        algorithm: prediction.algorithm
      }
    };
  }

  private async handleGetAnalyticsMetrics(args: any): Promise<MCPToolResult> {
    if (!this.config.enableAnalytics) {
      return {
        success: false,
        error: 'Analytics features are disabled',
        metadata: { operation: 'get_analytics_metrics' }
      };
    }

    const timeWindow = args.timeWindow || TimeWindow.DAY;
    const metricTypes = args.metricTypes || [MetricType.PERFORMANCE, MetricType.PRODUCTIVITY];

    const metrics = await this.analyticsEngine.calculateMetrics(timeWindow);
    const filteredMetrics = metrics.filter(metric => metricTypes.includes(metric.type));

    return {
      success: true,
      data: {
        metrics: filteredMetrics,
        timeWindow,
        metricTypes
      },
      metadata: { 
        operation: 'get_analytics_metrics',
        timeWindow,
        metricCount: filteredMetrics.length
      }
    };
  }

  private async handleDetectBottlenecks(args: any): Promise<MCPToolResult> {
    if (!this.config.enableAnalytics) {
      return {
        success: false,
        error: 'Analytics features are disabled',
        metadata: { operation: 'detect_bottlenecks' }
      };
    }

    const bottlenecks = await this.analyticsEngine.detectBottlenecks();
    
    // Filter by scope if specified
    let filteredBottlenecks = bottlenecks;
    if (args.scope) {
      filteredBottlenecks = bottlenecks.filter(b => 
        b.metadata?.scope === args.scope
      );
    }

    return {
      success: true,
      data: {
        bottlenecks: filteredBottlenecks,
        scope: args.scope,
        totalCount: bottlenecks.length,
        filteredCount: filteredBottlenecks.length
      },
      metadata: { 
        operation: 'detect_bottlenecks',
        scope: args.scope,
        bottleneckCount: filteredBottlenecks.length
      }
    };
  }

  private async handleAnalyzeCodeForTasks(args: any): Promise<MCPToolResult> {
    if (!this.config.enableLSP) {
      return {
        success: false,
        error: 'LSP features are disabled',
        metadata: { operation: 'analyze_code_for_tasks' }
      };
    }

    const recommendations = await this.lspIntegration.generateCodeTasks(
      args.filePaths,
      { 
        projectType: args.language,
        constraints: args.analysisDepth ? [args.analysisDepth] : undefined
      }
    );

    // Create tasks in queue based on recommendations
    const createdTasks: Task[] = [];
    for (const recommendation of recommendations) {
      const taskInput: CreateTaskInput = {
        title: recommendation.title,
        description: recommendation.description,
        state: TaskState.PENDING,
        priority: recommendation.priority,
        complexity: recommendation.complexity,
        estimatedHours: recommendation.estimatedHours,
        tags: ['code-analysis', 'auto-generated'],
        dependencies: []
      };
      
      const created = await this.taskQueue.createTask(taskInput);
      createdTasks.push(created);
    }

    return {
      success: true,
      data: {
        recommendations,
        createdTasks,
        analyzedFiles: args.filePaths
      },
      metadata: { 
        operation: 'analyze_code_for_tasks',
        fileCount: args.filePaths.length,
        taskCount: createdTasks.length,
        language: args.language
      }
    };
  }

  private async handleGetCodeImpactAnalysis(args: any): Promise<MCPToolResult> {
    if (!this.config.enableLSP) {
      return {
        success: false,
        error: 'LSP features are disabled',
        metadata: { operation: 'get_code_impact_analysis' }
      };
    }

    // Analyze each file to get its current state
    const analyses = [];
    for (const filePath of args.filePaths) {
      try {
        const analysis = await this.lspIntegration.analyzeCodeFile(filePath);
        analyses.push(analysis);
      } catch (error) {
        // Continue with other files if one fails
        console.warn(`Failed to analyze ${filePath}:`, error.message);
      }
    }

    // Create a basic impact analysis based on the code analyses
    const impactAnalysis = {
      id: uuidv4(),
      changedFiles: args.filePaths,
      changeType: args.changeType,
      analyses,
      potentialImpacts: analyses.map(analysis => ({
        file: analysis.file,
        complexity: analysis.complexity.cyclomaticComplexity,
        dependencies: analysis.dependencies.length,
        issues: analysis.issues.length
      })),
      analyzedAt: new Date()
    };

    return {
      success: true,
      data: impactAnalysis,
      metadata: { 
        operation: 'get_code_impact_analysis',
        fileCount: args.filePaths.length,
        changeType: args.changeType,
        analyzedFileCount: analyses.length
      }
    };
  }

  // ==================== ERROR HANDLING ====================

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  private convertToMcpError(error: unknown): McpError {
    if (error instanceof TaskNotFoundError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof QueueNotFoundError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof TaskValidationError) {
      return new McpError(ErrorCode.InvalidParams, error.message);
    }
    
    if (error instanceof TaskDependencyError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof TaskStateError) {
      return new McpError(ErrorCode.InvalidRequest, error.message);
    }
    
    if (error instanceof Error) {
      return new McpError(ErrorCode.InternalError, error.message);
    }
    
    return new McpError(ErrorCode.InternalError, 'Unknown error occurred');
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    // Initialize database connection if persistence is enabled
    if (this.databaseManager) {
      await this.databaseManager.initialize();
    }

    // Initialize other components as needed
    await this.eventManager.initialize?.();
    await this.providerManager.initialize?.();
    await this.schedulingEngine.initialize?.();
    await this.learningEngine.initialize?.();
    await this.analyticsEngine.initialize?.();
    await this.lspIntegration.initialize?.();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cleanup database connection
    if (this.databaseManager) {
      await this.databaseManager.cleanup?.();
    }

    // Cleanup other components
    await this.eventManager.cleanup?.();
    await this.providerManager.cleanup?.();
    await this.schedulingEngine.cleanup?.();
    await this.learningEngine.cleanup?.();
    await this.analyticsEngine.cleanup?.();
    await this.lspIntegration.cleanup?.();

    // Cleanup core components
    await this.taskQueue.cleanup();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Initialize all components first
    await this.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SuperClaude Tasks MCP server v2.0.0 running on stdio');
    console.error('Features enabled:', {
      persistence: this.config.enablePersistence,
      analytics: this.config.enableAnalytics,
      scheduling: this.config.enableScheduling,
      learning: this.config.enableLearning,
      lsp: this.config.enableLSP,
      ai: this.config.enableAI
    });

    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.error('Received SIGINT, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });
  }
}