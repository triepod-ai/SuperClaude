import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { TaskQueueManager } from './TaskQueue.js';
import { TaskDecomposer } from './TaskDecomposer.js';
import { PRDParser } from './PRDParser.js';
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
 * SuperClaude Tasks MCP Server
 * Provides task management, decomposition, and PRD parsing capabilities
 */
export class SuperClaudeTasksServer {
  private server: Server;
  private taskQueue: TaskQueueManager;
  private decomposer: TaskDecomposer;
  private prdParser: PRDParser;

  constructor() {
    this.server = new Server(
      {
        name: 'superclaude-tasks',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.taskQueue = new TaskQueueManager();
    this.decomposer = new TaskDecomposer();
    this.prdParser = new PRDParser();

    this.setupToolHandlers();
    this.setupErrorHandling();
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
    
    return {
      success: true,
      data: task,
      metadata: { operation: 'update_task', taskId: args.id }
    };
  }

  private async handleDeleteTask(args: any): Promise<MCPToolResult> {
    await this.taskQueue.deleteTask(args.taskId);
    
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
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SuperClaude Tasks MCP server running on stdio');
  }
}