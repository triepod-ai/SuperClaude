import { v4 as uuidv4 } from 'uuid';
import { 
  ResourceMonitor, 
  ManagedMap, 
  ManagedArray,
  CacheManager,
  logger 
} from '@superclaude/shared';
import {
  Task,
  TaskQueue,
  TaskState,
  TaskPriority,
  TaskComplexity,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterOptions,
  TaskSortOptions,
  TaskNotFoundError,
  QueueNotFoundError,
  TaskValidationError,
  TaskDependencyError,
  TaskStateError,
  TaskSchema,
  TaskQueueSchema
} from '../types/index.js';

/**
 * Core task queue implementation with persistent task management
 * Integrates patterns from MCP TaskManager research findings
 */
export class TaskQueueManager {
  private resourceMonitor: ResourceMonitor;
  private cacheManager: CacheManager;
  private tasks: ManagedMap<string, Task>;
  private queues: ManagedMap<string, TaskQueue>;
  private taskExecutionOrder: ManagedArray<string>;

  constructor() {
    // Initialize resource management
    this.resourceMonitor = new ResourceMonitor({
      maxMapSize: 10000,
      maxArrayLength: 5000,
      ttlSeconds: 7 * 24 * 60 * 60, // 7 days
      cleanupIntervalMs: 600000, // 10 minutes
      memoryThresholdBytes: 400 * 1024 * 1024 // 400MB threshold
    });

    this.cacheManager = new CacheManager();

    // Initialize managed collections
    this.tasks = new ManagedMap('task-storage', this.resourceMonitor, {
      maxSize: 10000,
      ttlMs: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    this.queues = new ManagedMap('queue-storage', this.resourceMonitor, {
      maxSize: 1000,
      ttlMs: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    this.taskExecutionOrder = new ManagedArray('execution-order', this.resourceMonitor, {
      maxLength: 5000,
      rotationSize: 2500
    });

    this.setupResourceMonitoring();
    this.initializeDefaultQueue();
    
    logger.info('TaskQueueManager initialized with resource management');
  }

  /**
   * Setup resource monitoring event handlers
   */
  private setupResourceMonitoring(): void {
    this.resourceMonitor.on('memory_threshold_exceeded', (data) => {
      logger.warn('Memory threshold exceeded in TaskQueueManager', data);
      this.performMemoryCleanup();
    });

    this.resourceMonitor.on('size_limit_exceeded', (data) => {
      logger.warn('Task storage size limit exceeded', data);
      if (data.resourceId === 'task-storage') {
        this.cleanupCompletedTasks();
      }
    });

    this.resourceMonitor.on('resource_stale', (data) => {
      logger.debug('Stale resource detected in TaskQueueManager', data);
    });
  }

  /**
   * Perform memory cleanup
   */
  private performMemoryCleanup(): void {
    // Clean up completed tasks older than 1 day
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.state === TaskState.COMPLETED && 
          task.completedAt && 
          task.completedAt < cutoff) {
        this.tasks.delete(taskId);
        removedCount++;
      }
    }

    // Clean up execution order
    const executionOrderSize = Math.floor(this.taskExecutionOrder.length * 0.7);
    this.taskExecutionOrder.splice(0, this.taskExecutionOrder.length - executionOrderSize);

    // Trigger cache cleanup
    this.cacheManager.handleMemoryPressure();

    logger.info('TaskQueueManager memory cleanup completed', { 
      tasksRemoved: removedCount,
      executionOrderSize: this.taskExecutionOrder.length 
    });
  }

  /**
   * Clean up completed tasks
   */
  private cleanupCompletedTasks(): void {
    const completedTasks = Array.from(this.tasks.entries())
      .filter(([_, task]) => task.state === TaskState.COMPLETED || task.state === TaskState.CANCELLED)
      .sort((a, b) => {
        const aTime = a[1].completedAt?.getTime() || a[1].updatedAt.getTime();
        const bTime = b[1].completedAt?.getTime() || b[1].updatedAt.getTime();
        return aTime - bTime; // Oldest first
      });

    // Remove oldest 30% of completed tasks
    const toRemove = Math.floor(completedTasks.length * 0.3);
    for (let i = 0; i < toRemove; i++) {
      const [taskId] = completedTasks[i];
      this.tasks.delete(taskId);
    }

    logger.debug('Completed tasks cleanup performed', { removedCount: toRemove });
  }

  /**
   * Initialize default queue for general tasks
   */
  private initializeDefaultQueue(): void {
    const defaultQueue: TaskQueue = {
      id: 'default',
      name: 'Default Queue',
      description: 'Default task queue for general operations',
      tasks: [],
      maxConcurrentTasks: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.queues.set('default', defaultQueue);
  }

  // ==================== TASK OPERATIONS ====================

  /**
   * Create a new task with validation and dependency checking
   */
  async createTask(input: CreateTaskInput, queueId: string = 'default'): Promise<Task> {
    // Generate ID if not provided
    const taskId = input.id || uuidv4();
    
    // Validate input
    const taskData = {
      ...input,
      id: taskId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate with Zod schema
    const validatedTask = TaskSchema.parse(taskData);

    // Check dependencies exist
    if (validatedTask.dependencies.length > 0) {
      await this.validateDependencies(validatedTask.dependencies);
    }

    // Check for circular dependencies if parent is specified
    if (validatedTask.parentId) {
      await this.validateNoCircularDependency(taskId, validatedTask.parentId);
    }

    // Store task
    this.tasks.set(taskId, validatedTask);

    // Add to queue
    await this.addTaskToQueue(taskId, queueId);

    // Update execution order
    this.updateExecutionOrder(taskId);

    return validatedTask;
  }

  /**
   * Retrieve task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }
    return task;
  }

  /**
   * Update existing task
   */
  async updateTask(update: UpdateTaskInput): Promise<Task> {
    const existingTask = await this.getTask(update.id);
    
    // Validate state transitions
    if (update.state && update.state !== existingTask.state) {
      this.validateStateTransition(existingTask.state, update.state);
    }

    // Validate dependencies if being updated
    if (update.dependencies) {
      await this.validateDependencies(update.dependencies);
    }

    // Create updated task
    const updatedTask: Task = {
      ...existingTask,
      ...update,
      updatedAt: new Date(),
      completedAt: update.state === TaskState.COMPLETED ? new Date() : existingTask.completedAt
    };

    // Validate updated task
    const validatedTask = TaskSchema.parse(updatedTask);
    
    // Store updated task
    this.tasks.set(update.id, validatedTask);

    // Update execution order if state changed
    if (update.state && update.state !== existingTask.state) {
      this.updateExecutionOrder(update.id);
    }

    return validatedTask;
  }

  /**
   * Delete task and handle dependencies
   */
  async deleteTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    
    // Check if task has dependents
    const dependents = await this.getTaskDependents(taskId);
    if (dependents.length > 0) {
      throw new TaskDependencyError(
        `Cannot delete task ${taskId}: it has ${dependents.length} dependent tasks`,
        taskId
      );
    }

    // Remove from all queues
    for (const queue of this.queues.values()) {
      if (queue.tasks.includes(taskId)) {
        queue.tasks = queue.tasks.filter(id => id !== taskId);
        queue.updatedAt = new Date();
      }
    }

    // Remove from execution order
    this.taskExecutionOrder = this.taskExecutionOrder.filter(id => id !== taskId);

    // Delete task
    this.tasks.delete(taskId);
  }

  /**
   * List tasks with filtering and sorting
   */
  async listTasks(
    filter: TaskFilterOptions = {},
    sort: TaskSortOptions = { field: 'createdAt', direction: 'desc' },
    limit?: number,
    offset: number = 0
  ): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());

    // Apply filters
    tasks = this.applyFilters(tasks, filter);

    // Apply sorting
    tasks = this.applySorting(tasks, sort);

    // Apply pagination
    if (limit !== undefined) {
      tasks = tasks.slice(offset, offset + limit);
    }

    return tasks;
  }

  /**
   * Get task subtasks
   */
  async getSubtasks(parentId: string): Promise<Task[]> {
    return this.listTasks({ parentId });
  }

  /**
   * Get task dependencies (tasks this task depends on)
   */
  async getTaskDependencies(taskId: string): Promise<Task[]> {
    const task = await this.getTask(taskId);
    const dependencies: Task[] = [];
    
    for (const depId of task.dependencies) {
      try {
        const depTask = await this.getTask(depId);
        dependencies.push(depTask);
      } catch (error) {
        // Skip missing dependencies
      }
    }
    
    return dependencies;
  }

  /**
   * Get task dependents (tasks that depend on this task)
   */
  async getTaskDependents(taskId: string): Promise<Task[]> {
    const dependents: Task[] = [];
    
    for (const task of this.tasks.values()) {
      if (task.dependencies.includes(taskId)) {
        dependents.push(task);
      }
    }
    
    return dependents;
  }

  // ==================== QUEUE OPERATIONS ====================

  /**
   * Create a new task queue
   */
  async createQueue(
    name: string,
    description?: string,
    maxConcurrentTasks: number = 3
  ): Promise<TaskQueue> {
    const queueId = uuidv4();
    const queue: TaskQueue = {
      id: queueId,
      name,
      description,
      tasks: [],
      maxConcurrentTasks,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const validatedQueue = TaskQueueSchema.parse(queue);
    this.queues.set(queueId, validatedQueue);
    
    return validatedQueue;
  }

  /**
   * Get queue by ID
   */
  async getQueue(queueId: string): Promise<TaskQueue> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new QueueNotFoundError(queueId);
    }
    return queue;
  }

  /**
   * List all queues
   */
  async listQueues(): Promise<TaskQueue[]> {
    return Array.from(this.queues.values());
  }

  /**
   * Add task to queue
   */
  async addTaskToQueue(taskId: string, queueId: string): Promise<void> {
    const task = await this.getTask(taskId);
    const queue = await this.getQueue(queueId);
    
    if (!queue.tasks.includes(taskId)) {
      queue.tasks.push(taskId);
      queue.updatedAt = new Date();
    }
  }

  /**
   * Remove task from queue
   */
  async removeTaskFromQueue(taskId: string, queueId: string): Promise<void> {
    const queue = await this.getQueue(queueId);
    
    queue.tasks = queue.tasks.filter(id => id !== taskId);
    queue.updatedAt = new Date();
  }

  /**
   * Get next executable tasks from queue
   */
  async getNextExecutableTasks(queueId: string): Promise<Task[]> {
    const queue = await this.getQueue(queueId);
    const executableTasks: Task[] = [];
    
    for (const taskId of queue.tasks) {
      try {
        const task = await this.getTask(taskId);
        
        // Check if task is executable
        if (await this.isTaskExecutable(task)) {
          executableTasks.push(task);
          
          // Respect concurrency limit
          if (executableTasks.length >= queue.maxConcurrentTasks) {
            break;
          }
        }
      } catch (error) {
        // Skip missing tasks
      }
    }
    
    return executableTasks;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate task dependencies exist
   */
  private async validateDependencies(dependencies: string[]): Promise<void> {
    for (const depId of dependencies) {
      if (!this.tasks.has(depId)) {
        throw new TaskDependencyError(`Dependency not found: ${depId}`, undefined, depId);
      }
    }
  }

  /**
   * Validate no circular dependency exists
   */
  private async validateNoCircularDependency(taskId: string, parentId: string): Promise<void> {
    let currentId: string | undefined = parentId;
    const visited = new Set<string>();
    
    while (currentId) {
      if (visited.has(currentId)) {
        throw new TaskDependencyError(`Circular dependency detected for task ${taskId}`, taskId);
      }
      
      if (currentId === taskId) {
        throw new TaskDependencyError(`Circular dependency detected for task ${taskId}`, taskId);
      }
      
      visited.add(currentId);
      const task = this.tasks.get(currentId);
      currentId = task?.parentId;
    }
  }

  /**
   * Validate state transition is allowed
   */
  private validateStateTransition(from: TaskState, to: TaskState): void {
    const allowedTransitions: Record<TaskState, TaskState[]> = {
      [TaskState.PENDING]: [TaskState.IN_PROGRESS, TaskState.BLOCKED, TaskState.CANCELLED],
      [TaskState.IN_PROGRESS]: [TaskState.COMPLETED, TaskState.BLOCKED, TaskState.CANCELLED, TaskState.PENDING],
      [TaskState.BLOCKED]: [TaskState.PENDING, TaskState.IN_PROGRESS, TaskState.CANCELLED],
      [TaskState.COMPLETED]: [TaskState.IN_PROGRESS], // Allow reopening
      [TaskState.CANCELLED]: [TaskState.PENDING, TaskState.IN_PROGRESS]
    };

    if (!allowedTransitions[from].includes(to)) {
      throw new TaskStateError(
        `Invalid state transition from ${from} to ${to}`,
        undefined,
        from
      );
    }
  }

  /**
   * Check if task is executable (dependencies met, not blocked)
   */
  private async isTaskExecutable(task: Task): Promise<boolean> {
    // Can't execute if not pending
    if (task.state !== TaskState.PENDING) {
      return false;
    }

    // Check all dependencies are completed
    for (const depId of task.dependencies) {
      try {
        const depTask = await this.getTask(depId);
        if (depTask.state !== TaskState.COMPLETED) {
          return false;
        }
      } catch (error) {
        // Missing dependency blocks execution
        return false;
      }
    }

    return true;
  }

  /**
   * Apply filters to task list
   */
  private applyFilters(tasks: Task[], filter: TaskFilterOptions): Task[] {
    return tasks.filter(task => {
      if (filter.state && !filter.state.includes(task.state)) return false;
      if (filter.priority && !filter.priority.includes(task.priority)) return false;
      if (filter.complexity && task.complexity && !filter.complexity.includes(task.complexity)) return false;
      if (filter.assignee && (!task.assignee || !filter.assignee.includes(task.assignee))) return false;
      if (filter.parentId && task.parentId !== filter.parentId) return false;
      if (filter.hasParent !== undefined && Boolean(task.parentId) !== filter.hasParent) return false;
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => task.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      if (filter.dueBefore && task.dueDate && task.dueDate > filter.dueBefore) return false;
      if (filter.dueAfter && task.dueDate && task.dueDate < filter.dueAfter) return false;
      if (filter.createdBefore && task.createdAt > filter.createdBefore) return false;
      if (filter.createdAfter && task.createdAt < filter.createdAfter) return false;
      
      return true;
    });
  }

  /**
   * Apply sorting to task list
   */
  private applySorting(tasks: Task[], sort: TaskSortOptions): Task[] {
    return tasks.sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sort.direction === 'asc' ? 1 : -1;
      if (bValue === undefined) return sort.direction === 'asc' ? -1 : 1;
      
      let comparison = 0;
      
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;
      
      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Update task execution order based on priority and dependencies
   */
  private updateExecutionOrder(taskId: string): void {
    // Remove from current position
    const currentIndex = this.taskExecutionOrder.indexOf(taskId);
    if (currentIndex !== -1) {
      this.taskExecutionOrder.splice(currentIndex, 1);
    }
    
    const task = this.tasks.get(taskId);
    if (!task || task.state === TaskState.COMPLETED || task.state === TaskState.CANCELLED) {
      return;
    }

    // Find insertion position based on priority and dependencies
    let insertIndex = this.taskExecutionOrder.length;
    
    for (let i = 0; i < this.taskExecutionOrder.length; i++) {
      const otherTask = this.tasks.get(this.taskExecutionOrder[i]);
      if (!otherTask) continue;
      
      // Higher priority tasks go first
      if (this.getPriorityValue(task.priority) > this.getPriorityValue(otherTask.priority)) {
        insertIndex = i;
        break;
      }
    }
    
    this.taskExecutionOrder.splice(insertIndex, 0, taskId);
  }

  /**
   * Get numeric value for priority comparison
   */
  private getPriorityValue(priority: TaskPriority): number {
    const values = {
      [TaskPriority.CRITICAL]: 4,
      [TaskPriority.HIGH]: 3,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.LOW]: 1
    };
    return values[priority];
  }

  // ==================== STATISTICS AND ANALYTICS ====================

  /**
   * Get task statistics
   */
  async getTaskStatistics(): Promise<any> {
    const tasks = Array.from(this.tasks.values());
    
    const stats = {
      total: tasks.length,
      byState: this.groupBy(tasks, 'state'),
      byPriority: this.groupBy(tasks, 'priority'),
      byComplexity: this.groupBy(tasks.filter(t => t.complexity), 'complexity'),
      completedToday: tasks.filter(t => 
        t.state === TaskState.COMPLETED && 
        t.completedAt && 
        this.isToday(t.completedAt)
      ).length,
      overdue: tasks.filter(t => 
        t.dueDate && 
        t.dueDate < new Date() && 
        t.state !== TaskState.COMPLETED
      ).length
    };

    return stats;
  }

  /**
   * Group tasks by a field
   */
  private groupBy<T extends Record<string, any>>(items: T[], field: keyof T): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = String(item[field]);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Check if date is today
   */
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    // Clean up managed resources
    this.tasks.cleanup();
    this.queues.cleanup();
    this.taskExecutionOrder.cleanup();

    // Clean up resource monitor and cache manager
    this.resourceMonitor.cleanup();
    this.cacheManager.cleanup();

    logger.info('TaskQueueManager cleanup completed');
  }

  /**
   * Get resource statistics for monitoring
   */
  getResourceStats(): any {
    return {
      tasks: this.tasks.size,
      queues: this.queues.size,
      executionOrder: this.taskExecutionOrder.length,
      resourceStats: this.resourceMonitor.getResourceStats(),
      cacheStats: this.cacheManager.getCacheStats()
    };
  }
}