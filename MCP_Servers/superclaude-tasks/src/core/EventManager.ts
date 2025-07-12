import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@superclaude/shared';
import {
  Task,
  TaskQueue,
  TaskState,
  TaskPriority,
  TaskComplexity
} from '../types/index.js';

/**
 * Event types for task lifecycle management
 */
export enum TaskEvent {
  // Task lifecycle events
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_DELETED = 'task.deleted',
  TASK_STATE_CHANGED = 'task.state_changed',
  TASK_ASSIGNED = 'task.assigned',
  TASK_UNASSIGNED = 'task.unassigned',
  TASK_DUE_SOON = 'task.due_soon',
  TASK_OVERDUE = 'task.overdue',
  TASK_COMPLETED = 'task.completed',
  TASK_BLOCKED = 'task.blocked',
  TASK_UNBLOCKED = 'task.unblocked',
  
  // Dependency events
  DEPENDENCY_ADDED = 'dependency.added',
  DEPENDENCY_REMOVED = 'dependency.removed',
  DEPENDENCY_RESOLVED = 'dependency.resolved',
  DEPENDENCY_CYCLE_DETECTED = 'dependency.cycle_detected',
  
  // Queue events
  QUEUE_CREATED = 'queue.created',
  QUEUE_UPDATED = 'queue.updated',
  QUEUE_DELETED = 'queue.deleted',
  TASK_ADDED_TO_QUEUE = 'queue.task_added',
  TASK_REMOVED_FROM_QUEUE = 'queue.task_removed',
  QUEUE_FULL = 'queue.full',
  QUEUE_EMPTY = 'queue.empty',
  
  // Execution events
  EXECUTION_STARTED = 'execution.started',
  EXECUTION_COMPLETED = 'execution.completed',
  EXECUTION_FAILED = 'execution.failed',
  EXECUTION_TIMEOUT = 'execution.timeout',
  EXECUTION_PROGRESS = 'execution.progress',
  
  // Analytics events
  PERFORMANCE_METRIC = 'analytics.performance_metric',
  BOTTLENECK_DETECTED = 'analytics.bottleneck_detected',
  TREND_DETECTED = 'analytics.trend_detected',
  THRESHOLD_EXCEEDED = 'analytics.threshold_exceeded',
  
  // System events
  SYSTEM_HEALTH_CHECK = 'system.health_check',
  SYSTEM_OVERLOAD = 'system.overload',
  RESOURCE_EXHAUSTED = 'system.resource_exhausted',
  BACKUP_COMPLETED = 'system.backup_completed',
  MIGRATION_COMPLETED = 'system.migration_completed'
}

/**
 * Base event data structure
 */
export interface BaseEventData {
  eventId: string;
  timestamp: Date;
  source: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Task-related event data
 */
export interface TaskEventData extends BaseEventData {
  taskId: string;
  task?: Task;
  previousState?: TaskState;
  newState?: TaskState;
  changes?: Partial<Task>;
  assignee?: string;
  previousAssignee?: string;
}

/**
 * Queue-related event data
 */
export interface QueueEventData extends BaseEventData {
  queueId: string;
  queue?: TaskQueue;
  taskId?: string;
  task?: Task;
  changes?: Partial<TaskQueue>;
}

/**
 * Dependency-related event data
 */
export interface DependencyEventData extends BaseEventData {
  taskId: string;
  dependencyId: string;
  dependencyChain?: string[];
  cycleDetected?: boolean;
}

/**
 * Execution-related event data
 */
export interface ExecutionEventData extends BaseEventData {
  executionId: string;
  taskId: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  progress?: number;
  error?: Error;
  result?: any;
}

/**
 * Analytics-related event data
 */
export interface AnalyticsEventData extends BaseEventData {
  metricName: string;
  metricValue: number;
  threshold?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
}

/**
 * System-related event data
 */
export interface SystemEventData extends BaseEventData {
  component: string;
  status: 'healthy' | 'warning' | 'error' | 'critical';
  details?: Record<string, any>;
  resourceUsage?: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
  once?: boolean;
  priority?: number;
  filter?: (data: any) => boolean;
  timeout?: number;
  retries?: number;
}

/**
 * Event subscription
 */
export interface EventSubscription {
  id: string;
  event: TaskEvent;
  listener: Function;
  config: EventListenerConfig;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

/**
 * Event middleware function
 */
export type EventMiddleware = (event: TaskEvent, data: any, next: () => void) => void;

/**
 * Event persistence configuration
 */
export interface EventPersistenceConfig {
  enabled: boolean;
  storageType: 'memory' | 'file' | 'database';
  maxEvents?: number;
  ttlDays?: number;
  compressOldEvents?: boolean;
}

/**
 * Comprehensive event manager for task lifecycle management
 */
export class EventManager extends EventEmitter {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: Map<string, any[]> = new Map();
  private middleware: EventMiddleware[] = [];
  private persistenceConfig: EventPersistenceConfig;
  private maxListeners: number = 100;
  private eventQueue: Array<{ event: TaskEvent; data: any }> = [];
  private processing: boolean = false;
  
  constructor(persistenceConfig: EventPersistenceConfig = { enabled: false, storageType: 'memory' }) {
    super();
    this.persistenceConfig = persistenceConfig;
    this.setMaxListeners(this.maxListeners);
    this.setupEventPersistence();
    this.setupSystemEvents();
    
    logger.info('EventManager initialized', { persistenceConfig });
  }
  
  /**
   * Setup event persistence based on configuration
   */
  private setupEventPersistence(): void {
    if (!this.persistenceConfig.enabled) return;
    
    // Setup periodic cleanup
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000); // Every hour
    
    logger.info('Event persistence enabled', { config: this.persistenceConfig });
  }
  
  /**
   * Setup system-level event monitoring
   */
  private setupSystemEvents(): void {
    // Monitor system health
    setInterval(() => {
      this.emitSystemHealthCheck();
    }, 30 * 1000); // Every 30 seconds
    
    // Monitor resource usage
    setInterval(() => {
      this.checkResourceUsage();
    }, 10 * 1000); // Every 10 seconds
  }
  
  /**
   * Add middleware to event processing pipeline
   */
  addMiddleware(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
    logger.debug('Event middleware added', { middlewareCount: this.middleware.length });
  }
  
  /**
   * Remove middleware from event processing pipeline
   */
  removeMiddleware(middleware: EventMiddleware): boolean {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      logger.debug('Event middleware removed', { middlewareCount: this.middleware.length });
      return true;
    }
    return false;
  }
  
  /**
   * Subscribe to events with advanced configuration
   */
  subscribe(
    event: TaskEvent,
    listener: Function,
    config: EventListenerConfig = {}
  ): string {
    const subscriptionId = uuidv4();
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      event,
      listener,
      config: {
        once: config.once || false,
        priority: config.priority || 0,
        filter: config.filter,
        timeout: config.timeout,
        retries: config.retries || 0
      },
      createdAt: new Date(),
      triggerCount: 0
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Add listener to EventEmitter
    const wrappedListener = this.wrapListener(subscription);
    if (config.once) {
      this.once(event, wrappedListener);
    } else {
      this.on(event, wrappedListener);
    }
    
    logger.debug('Event subscription added', { 
      subscriptionId, 
      event, 
      config 
    });
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }
    
    this.removeListener(subscription.event, subscription.listener);
    this.subscriptions.delete(subscriptionId);
    
    logger.debug('Event subscription removed', { subscriptionId, event: subscription.event });
    
    return true;
  }
  
  /**
   * Wrap listener with additional functionality
   */
  private wrapListener(subscription: EventSubscription): Function {
    return async (data: any) => {
      try {
        // Apply filter if specified
        if (subscription.config.filter && !subscription.config.filter(data)) {
          return;
        }
        
        // Update subscription statistics
        subscription.lastTriggered = new Date();
        subscription.triggerCount++;
        
        // Apply timeout if specified
        if (subscription.config.timeout) {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Event listener timeout')), subscription.config.timeout);
          });
          
          await Promise.race([
            subscription.listener(data),
            timeoutPromise
          ]);
        } else {
          await subscription.listener(data);
        }
        
        // Remove if once-only
        if (subscription.config.once) {
          this.unsubscribe(subscription.id);
        }
        
      } catch (error) {
        logger.error('Event listener error', {
          subscriptionId: subscription.id,
          event: subscription.event,
          error: error.message
        });
        
        // Handle retries
        if (subscription.config.retries && subscription.config.retries > 0) {
          subscription.config.retries--;
          // Retry after a short delay
          setTimeout(() => {
            subscription.listener(data).catch((retryError: Error) => {
              logger.error('Event listener retry failed', {
                subscriptionId: subscription.id,
                error: retryError.message
              });
            });
          }, 1000);
        }
      }
    };
  }
  
  /**
   * Emit event with middleware processing
   */
  async emitEvent(event: TaskEvent, data: any): Promise<void> {
    // Add to queue for processing
    this.eventQueue.push({ event, data });
    
    if (!this.processing) {
      await this.processEventQueue();
    }
  }
  
  /**
   * Process event queue with middleware
   */
  private async processEventQueue(): Promise<void> {
    this.processing = true;
    
    while (this.eventQueue.length > 0) {
      const { event, data } = this.eventQueue.shift()!;
      await this.processEvent(event, data);
    }
    
    this.processing = false;
  }
  
  /**
   * Process single event through middleware pipeline
   */
  private async processEvent(event: TaskEvent, data: any): Promise<void> {
    let middlewareIndex = 0;
    
    const next = () => {
      if (middlewareIndex < this.middleware.length) {
        const middleware = this.middleware[middlewareIndex++];
        middleware(event, data, next);
      } else {
        // Emit the event after middleware processing
        this.emit(event, data);
        
        // Persist event if enabled
        this.persistEvent(event, data);
      }
    };
    
    next();
  }
  
  /**
   * Persist event to storage
   */
  private persistEvent(event: TaskEvent, data: any): void {
    if (!this.persistenceConfig.enabled) return;
    
    try {
      // Add to event history
      if (!this.eventHistory.has(event)) {
        this.eventHistory.set(event, []);
      }
      
      const eventData = {
        ...data,
        persistedAt: new Date()
      };
      
      const history = this.eventHistory.get(event)!;
      history.push(eventData);
      
      // Limit history size
      const maxEvents = this.persistenceConfig.maxEvents || 1000;
      if (history.length > maxEvents) {
        history.splice(0, history.length - maxEvents);
      }
      
      logger.debug('Event persisted', { event, eventCount: history.length });
      
    } catch (error) {
      logger.error('Failed to persist event', { event, error: error.message });
    }
  }
  
  /**
   * Get event history for a specific event type
   */
  getEventHistory(event: TaskEvent, limit?: number): any[] {
    const history = this.eventHistory.get(event) || [];
    
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    
    return [...history];
  }
  
  /**
   * Get all event subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }
  
  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): any {
    const stats = {
      totalSubscriptions: this.subscriptions.size,
      byEvent: new Map<TaskEvent, number>(),
      byPriority: new Map<number, number>(),
      triggerCounts: new Map<string, number>()
    };
    
    for (const subscription of this.subscriptions.values()) {
      // Count by event
      const eventCount = stats.byEvent.get(subscription.event) || 0;
      stats.byEvent.set(subscription.event, eventCount + 1);
      
      // Count by priority
      const priority = subscription.config.priority || 0;
      const priorityCount = stats.byPriority.get(priority) || 0;
      stats.byPriority.set(priority, priorityCount + 1);
      
      // Track trigger counts
      stats.triggerCounts.set(subscription.id, subscription.triggerCount);
    }
    
    return stats;
  }
  
  /**
   * Cleanup old events based on TTL
   */
  private cleanupOldEvents(): void {
    if (!this.persistenceConfig.ttlDays) return;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.persistenceConfig.ttlDays);
    
    let removedCount = 0;
    
    for (const [event, history] of this.eventHistory) {
      const originalLength = history.length;
      
      // Filter out old events
      const filteredHistory = history.filter((eventData: any) => {
        return !eventData.persistedAt || eventData.persistedAt > cutoffDate;
      });
      
      this.eventHistory.set(event, filteredHistory);
      removedCount += originalLength - filteredHistory.length;
    }
    
    if (removedCount > 0) {
      logger.info('Old events cleaned up', { removedCount, cutoffDate });
    }
  }
  
  /**
   * Emit system health check event
   */
  private emitSystemHealthCheck(): void {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const healthData: SystemEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'EventManager',
      component: 'system',
      status: 'healthy',
      details: {
        uptime,
        subscriptions: this.subscriptions.size,
        eventHistory: this.eventHistory.size,
        queueLength: this.eventQueue.length
      },
      resourceUsage: {
        memory: memUsage.heapUsed,
        cpu: 0, // Would need external library for CPU usage
        disk: 0  // Would need external library for disk usage
      }
    };
    
    this.emit(TaskEvent.SYSTEM_HEALTH_CHECK, healthData);
  }
  
  /**
   * Check resource usage and emit warnings
   */
  private checkResourceUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    // Check memory usage threshold (e.g., 500MB)
    if (heapUsedMB > 500) {
      const warningData: SystemEventData = {
        eventId: uuidv4(),
        timestamp: new Date(),
        source: 'EventManager',
        component: 'memory',
        status: 'warning',
        details: {
          heapUsedMB,
          threshold: 500,
          subscriptions: this.subscriptions.size,
          eventHistory: this.eventHistory.size
        },
        resourceUsage: {
          memory: memUsage.heapUsed,
          cpu: 0,
          disk: 0
        }
      };
      
      this.emit(TaskEvent.SYSTEM_OVERLOAD, warningData);
    }
    
    // Check queue length
    if (this.eventQueue.length > 100) {
      const overloadData: SystemEventData = {
        eventId: uuidv4(),
        timestamp: new Date(),
        source: 'EventManager',
        component: 'event_queue',
        status: 'warning',
        details: {
          queueLength: this.eventQueue.length,
          threshold: 100
        }
      };
      
      this.emit(TaskEvent.SYSTEM_OVERLOAD, overloadData);
    }
  }
  
  // ==================== CONVENIENCE METHODS ====================
  
  /**
   * Emit task created event
   */
  async emitTaskCreated(task: Task, userId?: string): Promise<void> {
    const eventData: TaskEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'TaskManager',
      userId,
      taskId: task.id,
      task
    };
    
    await this.emitEvent(TaskEvent.TASK_CREATED, eventData);
  }
  
  /**
   * Emit task updated event
   */
  async emitTaskUpdated(taskId: string, changes: Partial<Task>, userId?: string): Promise<void> {
    const eventData: TaskEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'TaskManager',
      userId,
      taskId,
      changes
    };
    
    await this.emitEvent(TaskEvent.TASK_UPDATED, eventData);
  }
  
  /**
   * Emit task state changed event
   */
  async emitTaskStateChanged(
    taskId: string, 
    previousState: TaskState, 
    newState: TaskState, 
    userId?: string
  ): Promise<void> {
    const eventData: TaskEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'TaskManager',
      userId,
      taskId,
      previousState,
      newState
    };
    
    await this.emitEvent(TaskEvent.TASK_STATE_CHANGED, eventData);
  }
  
  /**
   * Emit task assigned event
   */
  async emitTaskAssigned(
    taskId: string, 
    assignee: string, 
    previousAssignee?: string, 
    userId?: string
  ): Promise<void> {
    const eventData: TaskEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'TaskManager',
      userId,
      taskId,
      assignee,
      previousAssignee
    };
    
    await this.emitEvent(TaskEvent.TASK_ASSIGNED, eventData);
  }
  
  /**
   * Emit dependency added event
   */
  async emitDependencyAdded(taskId: string, dependencyId: string, userId?: string): Promise<void> {
    const eventData: DependencyEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'TaskManager',
      userId,
      taskId,
      dependencyId
    };
    
    await this.emitEvent(TaskEvent.DEPENDENCY_ADDED, eventData);
  }
  
  /**
   * Emit queue created event
   */
  async emitQueueCreated(queue: TaskQueue, userId?: string): Promise<void> {
    const eventData: QueueEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'QueueManager',
      userId,
      queueId: queue.id,
      queue
    };
    
    await this.emitEvent(TaskEvent.QUEUE_CREATED, eventData);
  }
  
  /**
   * Emit execution started event
   */
  async emitExecutionStarted(executionId: string, taskId: string, userId?: string): Promise<void> {
    const eventData: ExecutionEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'ExecutionEngine',
      userId,
      executionId,
      taskId,
      startTime: new Date()
    };
    
    await this.emitEvent(TaskEvent.EXECUTION_STARTED, eventData);
  }
  
  /**
   * Emit performance metric event
   */
  async emitPerformanceMetric(
    metricName: string, 
    metricValue: number, 
    threshold?: number
  ): Promise<void> {
    const eventData: AnalyticsEventData = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'AnalyticsEngine',
      metricName,
      metricValue,
      threshold,
      severity: threshold && metricValue > threshold ? 'high' : 'low'
    };
    
    await this.emitEvent(TaskEvent.PERFORMANCE_METRIC, eventData);
  }
  
  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Clear all subscriptions
    for (const subscriptionId of this.subscriptions.keys()) {
      this.unsubscribe(subscriptionId);
    }
    
    // Clear event history
    this.eventHistory.clear();
    
    // Clear event queue
    this.eventQueue.length = 0;
    
    // Remove all listeners
    this.removeAllListeners();
    
    logger.info('EventManager cleanup completed');
  }
}