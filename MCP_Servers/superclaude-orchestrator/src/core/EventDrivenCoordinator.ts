import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@superclaude/shared';
import { AsyncMutex, AtomicCounter, ThreadSafeMap, AtomicBoolean, AtomicStateMachine } from '../utils/concurrency.js';

/**
 * Event-driven coordinator that replaces interval-based processing
 * Provides atomic state management and proper error recovery
 */

// Event types for the system
export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  target?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  priority: number; // 1-10, higher = more important
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, unknown>;
}

export interface EventHandler {
  id: string;
  eventType: string;
  handler: (event: SystemEvent) => Promise<void>;
  isAsync: boolean;
  priority: number;
  maxConcurrency: number;
  retryPolicy: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ErrorRecoveryStrategy {
  id: string;
  errorType: string;
  maxAttempts: number;
  recoveryHandler: (error: Error, context: Record<string, unknown>) => Promise<boolean>;
  rollbackHandler?: (context: Record<string, unknown>) => Promise<void>;
}

type EventProcessingState = 'idle' | 'processing' | 'error' | 'recovery' | 'shutdown';

/**
 * Event-driven coordinator with atomic state management
 */
export class EventDrivenCoordinator extends EventEmitter {
  private eventQueue: ThreadSafeMap<string, SystemEvent>;
  private eventHandlers: ThreadSafeMap<string, EventHandler[]>;
  private activeProcessing: ThreadSafeMap<string, Promise<void>>;
  private errorRecoveryStrategies: ThreadSafeMap<string, ErrorRecoveryStrategy>;
  
  private state: AtomicStateMachine<EventProcessingState>;
  private processingMutex: AsyncMutex;
  private handlerMutex: AsyncMutex;
  private recoveryMutex: AsyncMutex;
  
  private activeEvents: AtomicCounter;
  private processedEvents: AtomicCounter;
  private failedEvents: AtomicCounter;
  private isShuttingDown: AtomicBoolean;
  
  private processingInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    super();
    
    this.eventQueue = new ThreadSafeMap();
    this.eventHandlers = new ThreadSafeMap();
    this.activeProcessing = new ThreadSafeMap();
    this.errorRecoveryStrategies = new ThreadSafeMap();
    
    this.state = new AtomicStateMachine<EventProcessingState>('idle');
    this.processingMutex = new AsyncMutex();
    this.handlerMutex = new AsyncMutex();
    this.recoveryMutex = new AsyncMutex();
    
    this.activeEvents = new AtomicCounter();
    this.processedEvents = new AtomicCounter();
    this.failedEvents = new AtomicCounter();
    this.isShuttingDown = new AtomicBoolean(false);
    
    this.setupStateMachine();
    this.startEventProcessing();
    
    logger.info('EventDrivenCoordinator initialized');
  }

  /**
   * Setup state machine transitions
   */
  private setupStateMachine(): void {
    // Define allowed transitions
    this.state.addTransition('idle', 'processing');
    this.state.addTransition('processing', 'idle');
    this.state.addTransition('processing', 'error');
    this.state.addTransition('error', 'recovery');
    this.state.addTransition('recovery', 'processing');
    this.state.addTransition('recovery', 'error');
    this.state.addTransition('idle', 'shutdown');
    this.state.addTransition('processing', 'shutdown');
    this.state.addTransition('error', 'shutdown');
    this.state.addTransition('recovery', 'shutdown');

    // Listen to state changes
    this.state.on('state-changed', (change) => {
      logger.debug('State changed', {
        from: change.from,
        to: change.to,
        timestamp: change.timestamp
      });
      this.emit('state-changed', change);
    });
  }

  /**
   * Start event-driven processing (replaces intervals)
   */
  private startEventProcessing(): void {
    // Use event-driven approach instead of intervals
    this.on('event-queued', () => {
      setImmediate(() => this.processEvents());
    });
    
    this.on('handler-registered', () => {
      setImmediate(() => this.processEvents());
    });
    
    // Minimal health check interval (much less frequent than before)
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // 30 seconds instead of frequent polling
  }

  /**
   * Queue an event for processing
   */
  async queueEvent(
    type: string,
    source: string,
    payload: Record<string, unknown>,
    options: {
      target?: string;
      priority?: number;
      maxRetries?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    if (this.isShuttingDown.get()) {
      throw new Error('EventDrivenCoordinator is shutting down');
    }

    const event: SystemEvent = {
      id: uuidv4(),
      type,
      source,
      target: options.target,
      payload,
      timestamp: new Date(),
      priority: options.priority || 5,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      metadata: options.metadata || {}
    };

    await this.eventQueue.set(event.id, event);
    await this.activeEvents.increment();
    
    logger.debug('Event queued', {
      eventId: event.id,
      type: event.type,
      source: event.source,
      priority: event.priority
    });

    // Trigger processing immediately (event-driven)
    this.emit('event-queued', event);
    
    return event.id;
  }

  /**
   * Register an event handler
   */
  async registerHandler(
    eventType: string,
    handler: (event: SystemEvent) => Promise<void>,
    options: {
      priority?: number;
      maxConcurrency?: number;
      retryPolicy?: Partial<RetryPolicy>;
      isAsync?: boolean;
    } = {}
  ): Promise<string> {
    const handlerRelease = await this.handlerMutex.acquire();
    
    try {
      const handlerId = uuidv4();
      const eventHandler: EventHandler = {
        id: handlerId,
        eventType,
        handler,
        isAsync: options.isAsync ?? true,
        priority: options.priority || 5,
        maxConcurrency: options.maxConcurrency || 5,
        retryPolicy: {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
          retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
          ...options.retryPolicy
        }
      };

      const existingHandlers = await this.eventHandlers.get(eventType) || [];
      existingHandlers.push(eventHandler);
      await this.eventHandlers.set(eventType, existingHandlers);

      logger.info('Event handler registered', {
        handlerId,
        eventType,
        priority: eventHandler.priority
      });

      // Trigger processing for any queued events of this type
      this.emit('handler-registered', { eventType, handlerId });
      
      return handlerId;
    } finally {
      handlerRelease();
    }
  }

  /**
   * Register error recovery strategy
   */
  async registerErrorRecovery(
    errorType: string,
    recoveryHandler: (error: Error, context: Record<string, unknown>) => Promise<boolean>,
    options: {
      maxAttempts?: number;
      rollbackHandler?: (context: Record<string, unknown>) => Promise<void>;
    } = {}
  ): Promise<string> {
    const strategyId = uuidv4();
    const strategy: ErrorRecoveryStrategy = {
      id: strategyId,
      errorType,
      maxAttempts: options.maxAttempts || 3,
      recoveryHandler,
      rollbackHandler: options.rollbackHandler
    };

    await this.errorRecoveryStrategies.set(errorType, strategy);
    
    logger.info('Error recovery strategy registered', {
      strategyId,
      errorType,
      maxAttempts: strategy.maxAttempts
    });

    return strategyId;
  }

  /**
   * Process events from queue (event-driven, not interval-based)
   */
  private async processEvents(): Promise<void> {
    if (this.isShuttingDown.get() || this.state.getState() === 'shutdown') {
      return;
    }

    // Check if already processing
    if (this.state.getState() === 'processing') {
      return;
    }

    const processingRelease = await this.processingMutex.acquire();
    
    try {
      // Transition to processing state
      const transitioned = await this.state.transition('processing');
      if (!transitioned) {
        return; // State transition failed, another process is handling
      }

      const events = await this.eventQueue.values();
      if (events.length === 0) {
        await this.state.transition('idle');
        return;
      }

      // Sort events by priority (higher priority first)
      const sortedEvents = events.sort((a, b) => b.priority - a.priority);

      // Process events concurrently but with limits
      const processingPromises: Promise<void>[] = [];
      const maxConcurrent = 10;

      for (let i = 0; i < Math.min(sortedEvents.length, maxConcurrent); i++) {
        const event = sortedEvents[i];
        const processingPromise = this.processEvent(event);
        processingPromises.push(processingPromise);
      }

      // Wait for current batch to complete
      await Promise.allSettled(processingPromises);

      // Transition back to idle if no errors
      if (this.state.getState() === 'processing') {
        await this.state.transition('idle');
      }

    } catch (error) {
      logger.error('Error in event processing', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await this.state.transition('error');
      await this.handleProcessingError(error);
      
    } finally {
      processingRelease();
    }
  }

  /**
   * Process a single event with error handling and recovery
   */
  private async processEvent(event: SystemEvent): Promise<void> {
    try {
      const handlers = await this.eventHandlers.get(event.type) || [];
      if (handlers.length === 0) {
        logger.warn('No handlers found for event type', {
          eventId: event.id,
          eventType: event.type
        });
        await this.removeEventFromQueue(event.id);
        return;
      }

      // Sort handlers by priority
      const sortedHandlers = handlers.sort((a, b) => b.priority - a.priority);

      // Execute handlers
      for (const handler of sortedHandlers) {
        await this.executeHandler(event, handler);
      }

      // Remove event from queue after successful processing
      await this.removeEventFromQueue(event.id);
      await this.processedEvents.increment();

      logger.debug('Event processed successfully', {
        eventId: event.id,
        eventType: event.type,
        handlerCount: handlers.length
      });

    } catch (error) {
      await this.handleEventError(event, error);
    }
  }

  /**
   * Execute a single handler with retry logic
   */
  private async executeHandler(event: SystemEvent, handler: EventHandler): Promise<void> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= handler.retryPolicy.maxRetries) {
      try {
        // Check concurrency limits
        const handlerKey = `${handler.eventType}:${handler.id}`;
        const existingProcessing = await this.activeProcessing.get(handlerKey);
        
        if (existingProcessing) {
          // Handler is already processing, skip or wait based on configuration
          if (handler.maxConcurrency <= 1) {
            await existingProcessing;
          }
        }

        // Execute handler
        const executionPromise = handler.handler(event);
        await this.activeProcessing.set(handlerKey, executionPromise);
        
        await executionPromise;
        
        await this.activeProcessing.delete(handlerKey);
        return; // Success

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempt++;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(lastError, handler.retryPolicy);
        
        if (attempt > handler.retryPolicy.maxRetries || !isRetryable) {
          break;
        }

        // Calculate backoff delay
        const delay = Math.min(
          handler.retryPolicy.baseDelayMs * Math.pow(handler.retryPolicy.backoffMultiplier, attempt - 1),
          handler.retryPolicy.maxDelayMs
        );

        logger.warn('Handler execution failed, retrying', {
          handlerId: handler.id,
          eventId: event.id,
          attempt,
          maxRetries: handler.retryPolicy.maxRetries,
          delay,
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Handle event processing errors with recovery
   */
  private async handleEventError(event: SystemEvent, error: unknown): Promise<void> {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    event.retryCount++;
    
    logger.error('Event processing failed', {
      eventId: event.id,
      eventType: event.type,
      retryCount: event.retryCount,
      maxRetries: event.maxRetries,
      error: err.message
    });

    // Try error recovery
    const recovered = await this.attemptErrorRecovery(err, {
      event,
      retryCount: event.retryCount
    });

    if (recovered && event.retryCount < event.maxRetries) {
      // Update event in queue for retry
      await this.eventQueue.set(event.id, event);
      
      // Schedule retry with backoff
      const delay = Math.min(1000 * Math.pow(2, event.retryCount), 30000);
      setTimeout(() => {
        this.emit('event-queued', event);
      }, delay);
      
    } else {
      // Max retries exceeded or recovery failed
      await this.removeEventFromQueue(event.id);
      await this.failedEvents.increment();
      
      this.emit('event-failed', {
        event,
        error: err,
        finalAttempt: true
      });
    }
  }

  /**
   * Attempt error recovery using registered strategies
   */
  private async attemptErrorRecovery(
    error: Error,
    context: Record<string, unknown>
  ): Promise<boolean> {
    const recoveryRelease = await this.recoveryMutex.acquire();
    
    try {
      // Transition to recovery state
      await this.state.transition('recovery');
      
      const strategies = await this.errorRecoveryStrategies.values();
      
      for (const strategy of strategies) {
        if (this.errorMatches(error, strategy.errorType)) {
          try {
            logger.info('Attempting error recovery', {
              strategyId: strategy.id,
              errorType: strategy.errorType,
              error: error.message
            });
            
            const recovered = await strategy.recoveryHandler(error, context);
            
            if (recovered) {
              logger.info('Error recovery successful', {
                strategyId: strategy.id,
                errorType: strategy.errorType
              });
              return true;
            }
            
          } catch (recoveryError) {
            logger.error('Error recovery failed', {
              strategyId: strategy.id,
              error: error.message,
              recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
            });
            
            // Attempt rollback if available
            if (strategy.rollbackHandler) {
              try {
                await strategy.rollbackHandler(context);
                logger.info('Rollback completed', { strategyId: strategy.id });
              } catch (rollbackError) {
                logger.error('Rollback failed', {
                  strategyId: strategy.id,
                  rollbackError: rollbackError instanceof Error ? rollbackError.message : 'Unknown error'
                });
              }
            }
          }
        }
      }
      
      return false;
      
    } finally {
      await this.state.transition('processing');
      recoveryRelease();
    }
  }

  /**
   * Handle general processing errors
   */
  private async handleProcessingError(error: unknown): Promise<void> {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    logger.error('Processing error occurred', {
      error: err.message,
      state: this.state.getState()
    });
    
    // Attempt recovery
    const recovered = await this.attemptErrorRecovery(err, {
      source: 'processing',
      timestamp: new Date()
    });
    
    if (recovered) {
      await this.state.transition('processing');
    } else {
      // If recovery fails, continue with degraded functionality
      logger.warn('Recovery failed, continuing with degraded functionality');
      await this.state.transition('idle');
    }
  }

  /**
   * Remove event from queue atomically
   */
  private async removeEventFromQueue(eventId: string): Promise<void> {
    const removed = await this.eventQueue.delete(eventId);
    if (removed) {
      await this.activeEvents.decrement();
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryPolicy: RetryPolicy): boolean {
    return retryPolicy.retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || error.name === retryableError
    );
  }

  /**
   * Check if error matches strategy pattern
   */
  private errorMatches(error: Error, errorType: string): boolean {
    return error.name === errorType || 
           error.message.includes(errorType) ||
           errorType === 'all';
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const stats = this.getStats();
      
      // Emit health status
      this.emit('health-check', {
        timestamp: new Date(),
        state: this.state.getState(),
        stats,
        healthy: stats.failureRate < 0.1 && stats.queueSize < 1000
      });
      
      // Log warnings if needed
      if (stats.failureRate > 0.1) {
        logger.warn('High failure rate detected', {
          failureRate: stats.failureRate,
          failedEvents: stats.failedEvents
        });
      }
      
      if (stats.queueSize > 1000) {
        logger.warn('Large event queue detected', {
          queueSize: stats.queueSize
        });
      }
      
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get coordinator statistics
   */
  getStats(): {
    state: EventProcessingState;
    queueSize: number;
    activeEvents: number;
    processedEvents: number;
    failedEvents: number;
    failureRate: number;
    handlerCount: number;
    isShuttingDown: boolean;
  } {
    const processed = this.processedEvents.get();
    const failed = this.failedEvents.get();
    const total = processed + failed;
    
    return {
      state: this.state.getState(),
      queueSize: this.eventQueue.size,
      activeEvents: this.activeEvents.get(),
      processedEvents: processed,
      failedEvents: failed,
      failureRate: total > 0 ? failed / total : 0,
      handlerCount: Array.from(this.eventHandlers.values()).flat().length,
      isShuttingDown: this.isShuttingDown.get()
    };
  }

  /**
   * Graceful shutdown with proper resource cleanup
   */
  async shutdown(timeoutMs = 30000): Promise<void> {
    await this.isShuttingDown.set(true);
    await this.state.transition('shutdown');
    
    logger.info('Starting EventDrivenCoordinator shutdown', {
      queueSize: this.eventQueue.size,
      activeEvents: this.activeEvents.get()
    });
    
    // Clear intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Wait for active processing to complete
    const startTime = Date.now();
    while (this.activeEvents.get() > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force cleanup if timeout exceeded
    if (this.activeEvents.get() > 0) {
      logger.warn('Shutdown timeout exceeded, forcing cleanup', {
        remainingEvents: this.activeEvents.get()
      });
    }
    
    // Clear all data structures
    await this.eventQueue.clear();
    await this.eventHandlers.clear();
    await this.activeProcessing.clear();
    await this.errorRecoveryStrategies.clear();
    
    await this.activeEvents.reset();
    await this.processedEvents.reset();
    await this.failedEvents.reset();
    
    logger.info('EventDrivenCoordinator shutdown completed');
  }
}

/**
 * Default error recovery strategies
 */
export const defaultRecoveryStrategies = {
  networkError: async (error: Error, context: Record<string, unknown>): Promise<boolean> => {
    logger.info('Attempting network error recovery', { error: error.message });
    
    // Wait for network recovery
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Simple connectivity check (would be more sophisticated in production)
    try {
      // Mock network check
      return Math.random() > 0.3; // 70% success rate
    } catch {
      return false;
    }
  },
  
  resourceExhaustion: async (error: Error, context: Record<string, unknown>): Promise<boolean> => {
    logger.info('Attempting resource exhaustion recovery', { error: error.message });
    
    // Force garbage collection if possible
    if (global.gc) {
      global.gc();
    }
    
    // Wait for resources to free up
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  },
  
  configurationError: async (error: Error, context: Record<string, unknown>): Promise<boolean> => {
    logger.info('Attempting configuration error recovery', { error: error.message });
    
    // Reload configuration (simplified)
    try {
      // Mock configuration reload
      return true;
    } catch {
      return false;
    }
  }
};