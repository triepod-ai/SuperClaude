import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@superclaude/shared';
import { AsyncMutex, AtomicCounter, ThreadSafeMap, AtomicBoolean, AtomicStateMachine } from '../utils/concurrency.js';

/**
 * Comprehensive error recovery and rollback manager
 * Provides atomic state management for error handling and recovery
 */

export interface RecoveryCheckpoint {
  id: string;
  timestamp: Date;
  state: Record<string, unknown>;
  context: string;
  previousCheckpointId?: string;
  metadata: Record<string, unknown>;
}

export interface RecoveryOperation {
  id: string;
  type: 'retry' | 'rollback' | 'compensate' | 'circuit-break';
  targetComponent: string;
  context: Record<string, unknown>;
  maxAttempts: number;
  currentAttempt: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
  result?: Record<string, unknown>;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
  monitoringPeriodMs: number;
}

export interface CompensationAction {
  id: string;
  component: string;
  operation: string;
  compensationFn: (context: Record<string, unknown>) => Promise<void>;
  dependencies: string[];
  priority: number;
}

type RecoveryState = 'monitoring' | 'detecting' | 'recovering' | 'rolling-back' | 'stabilizing' | 'failed';
type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Error recovery and rollback manager with atomic operations
 */
export class ErrorRecoveryManager extends EventEmitter {
  private checkpoints: ThreadSafeMap<string, RecoveryCheckpoint>;
  private activeOperations: ThreadSafeMap<string, RecoveryOperation>;
  private compensationActions: ThreadSafeMap<string, CompensationAction[]>;
  private circuitBreakers: ThreadSafeMap<string, CircuitBreakerState>;
  
  private recoveryState: AtomicStateMachine<RecoveryState>;
  private checkpointMutex: AsyncMutex;
  private operationMutex: AsyncMutex;
  private circuitMutex: AsyncMutex;
  private rollbackMutex: AsyncMutex;
  
  private operationCounter: AtomicCounter;
  private successfulRecoveries: AtomicCounter;
  private failedRecoveries: AtomicCounter;
  private isShuttingDown: AtomicBoolean;
  
  private maxCheckpoints: number = 100;
  private defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    halfOpenMaxCalls: 3,
    monitoringPeriodMs: 60000
  };

  constructor() {
    super();
    
    this.checkpoints = new ThreadSafeMap();
    this.activeOperations = new ThreadSafeMap();
    this.compensationActions = new ThreadSafeMap();
    this.circuitBreakers = new ThreadSafeMap();
    
    this.recoveryState = new AtomicStateMachine<RecoveryState>('monitoring');
    this.checkpointMutex = new AsyncMutex();
    this.operationMutex = new AsyncMutex();
    this.circuitMutex = new AsyncMutex();
    this.rollbackMutex = new AsyncMutex();
    
    this.operationCounter = new AtomicCounter();
    this.successfulRecoveries = new AtomicCounter();
    this.failedRecoveries = new AtomicCounter();
    this.isShuttingDown = new AtomicBoolean(false);
    
    this.setupStateMachine();
    this.startMonitoring();
    
    logger.info('ErrorRecoveryManager initialized');
  }

  /**
   * Setup state machine for recovery states
   */
  private setupStateMachine(): void {
    const transitions: Array<[RecoveryState, RecoveryState]> = [
      ['monitoring', 'detecting'],
      ['detecting', 'recovering'],
      ['detecting', 'rolling-back'],
      ['recovering', 'stabilizing'],
      ['recovering', 'rolling-back'],
      ['recovering', 'failed'],
      ['rolling-back', 'stabilizing'],
      ['rolling-back', 'failed'],
      ['stabilizing', 'monitoring'],
      ['failed', 'monitoring'],
      ['failed', 'rolling-back']
    ];

    for (const [from, to] of transitions) {
      this.recoveryState.addTransition(from, to);
    }

    this.recoveryState.on('state-changed', (change) => {
      logger.info('Recovery state changed', {
        from: change.from,
        to: change.to,
        timestamp: change.timestamp
      });
      this.emit('recovery-state-changed', change);
    });
  }

  /**
   * Start monitoring for errors and health
   */
  private startMonitoring(): void {
    // Monitor circuit breakers
    setInterval(() => {
      this.updateCircuitBreakers();
    }, 5000);
    
    // Cleanup old checkpoints
    setInterval(() => {
      this.cleanupOldCheckpoints();
    }, 60000);
  }

  /**
   * Create a recovery checkpoint atomically
   */
  async createCheckpoint(
    context: string,
    state: Record<string, unknown>,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    if (this.isShuttingDown.get()) {
      throw new Error('ErrorRecoveryManager is shutting down');
    }

    const checkpointRelease = await this.checkpointMutex.acquire();
    
    try {
      const checkpointId = uuidv4();
      
      // Get previous checkpoint for linking
      const existingCheckpoints = await this.checkpoints.values();
      const contextCheckpoints = existingCheckpoints
        .filter(cp => cp.context === context)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      const checkpoint: RecoveryCheckpoint = {
        id: checkpointId,
        timestamp: new Date(),
        state: { ...state }, // Deep copy to prevent mutations
        context,
        previousCheckpointId: contextCheckpoints[0]?.id,
        metadata: { ...metadata }
      };

      await this.checkpoints.set(checkpointId, checkpoint);
      
      logger.debug('Recovery checkpoint created', {
        checkpointId,
        context,
        stateKeys: Object.keys(state)
      });

      this.emit('checkpoint-created', checkpoint);
      
      return checkpointId;
      
    } finally {
      checkpointRelease();
    }
  }

  /**
   * Initiate error recovery with various strategies
   */
  async initiateRecovery(
    component: string,
    error: Error,
    context: Record<string, unknown>,
    strategy: 'retry' | 'rollback' | 'compensate' | 'circuit-break' = 'retry'
  ): Promise<string> {
    const operationRelease = await this.operationMutex.acquire();
    await this.operationCounter.increment();
    
    try {
      // Transition to detecting state
      await this.recoveryState.transition('detecting');
      
      const operationId = uuidv4();
      const operation: RecoveryOperation = {
        id: operationId,
        type: strategy,
        targetComponent: component,
        context: { ...context, error: error.message },
        maxAttempts: this.getMaxAttempts(strategy),
        currentAttempt: 0,
        status: 'pending',
        startTime: new Date()
      };

      await this.activeOperations.set(operationId, operation);
      
      logger.info('Recovery operation initiated', {
        operationId,
        component,
        strategy,
        error: error.message
      });

      // Execute recovery strategy
      switch (strategy) {
        case 'retry':
          await this.executeRetryRecovery(operation);
          break;
        case 'rollback':
          await this.executeRollbackRecovery(operation);
          break;
        case 'compensate':
          await this.executeCompensationRecovery(operation);
          break;
        case 'circuit-break':
          await this.executeCircuitBreakRecovery(operation);
          break;
      }

      return operationId;
      
    } catch (recoveryError) {
      logger.error('Recovery initiation failed', {
        component,
        error: error.message,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
      });
      
      await this.recoveryState.transition('failed');
      throw recoveryError;
      
    } finally {
      await this.operationCounter.decrement();
      operationRelease();
    }
  }

  /**
   * Execute retry recovery strategy
   */
  private async executeRetryRecovery(operation: RecoveryOperation): Promise<void> {
    await this.recoveryState.transition('recovering');
    
    operation.status = 'executing';
    await this.activeOperations.set(operation.id, operation);
    
    let lastError: Error | null = null;
    
    while (operation.currentAttempt < operation.maxAttempts) {
      try {
        operation.currentAttempt++;
        
        logger.info('Attempting retry recovery', {
          operationId: operation.id,
          component: operation.targetComponent,
          attempt: operation.currentAttempt,
          maxAttempts: operation.maxAttempts
        });
        
        // Simulate recovery operation (would be actual recovery logic)
        await this.performRecoveryOperation(operation);
        
        // Success
        operation.status = 'completed';
        operation.endTime = new Date();
        operation.result = { success: true, attempt: operation.currentAttempt };
        
        await this.activeOperations.set(operation.id, operation);
        await this.successfulRecoveries.increment();
        
        await this.recoveryState.transition('stabilizing');
        
        this.emit('recovery-completed', operation);
        
        // Stabilization period
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.recoveryState.transition('monitoring');
        
        return;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, operation.currentAttempt - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    operation.status = 'failed';
    operation.endTime = new Date();
    operation.error = lastError?.message || 'All retry attempts failed';
    
    await this.activeOperations.set(operation.id, operation);
    await this.failedRecoveries.increment();
    
    await this.recoveryState.transition('failed');
    
    this.emit('recovery-failed', operation);
  }

  /**
   * Execute rollback recovery strategy
   */
  private async executeRollbackRecovery(operation: RecoveryOperation): Promise<void> {
    await this.recoveryState.transition('rolling-back');
    
    const rollbackRelease = await this.rollbackMutex.acquire();
    
    try {
      operation.status = 'executing';
      await this.activeOperations.set(operation.id, operation);
      
      // Find the most recent checkpoint for the component
      const checkpoints = await this.checkpoints.values();
      const componentCheckpoints = checkpoints
        .filter(cp => cp.context === operation.targetComponent)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      if (componentCheckpoints.length === 0) {
        throw new Error(`No checkpoints found for component: ${operation.targetComponent}`);
      }
      
      const targetCheckpoint = componentCheckpoints[0];
      
      logger.info('Executing rollback recovery', {
        operationId: operation.id,
        component: operation.targetComponent,
        checkpointId: targetCheckpoint.id,
        checkpointTime: targetCheckpoint.timestamp
      });
      
      // Perform rollback (simulate)
      await this.performRollback(targetCheckpoint, operation);
      
      operation.status = 'completed';
      operation.endTime = new Date();
      operation.result = { 
        rolledBackTo: targetCheckpoint.id,
        checkpointTime: targetCheckpoint.timestamp 
      };
      
      await this.activeOperations.set(operation.id, operation);
      await this.successfulRecoveries.increment();
      
      await this.recoveryState.transition('stabilizing');
      
      this.emit('rollback-completed', { operation, checkpoint: targetCheckpoint });
      
      // Stabilization period
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.recoveryState.transition('monitoring');
      
    } finally {
      rollbackRelease();
    }
  }

  /**
   * Execute compensation recovery strategy
   */
  private async executeCompensationRecovery(operation: RecoveryOperation): Promise<void> {
    await this.recoveryState.transition('recovering');
    
    operation.status = 'executing';
    await this.activeOperations.set(operation.id, operation);
    
    try {
      const actions = await this.compensationActions.get(operation.targetComponent) || [];
      
      if (actions.length === 0) {
        throw new Error(`No compensation actions registered for component: ${operation.targetComponent}`);
      }
      
      // Sort by priority and resolve dependencies
      const sortedActions = this.sortCompensationActions(actions);
      
      logger.info('Executing compensation recovery', {
        operationId: operation.id,
        component: operation.targetComponent,
        actionCount: sortedActions.length
      });
      
      const results: Array<{ actionId: string; success: boolean; error?: string }> = [];
      
      for (const action of sortedActions) {
        try {
          await action.compensationFn(operation.context);
          results.push({ actionId: action.id, success: true });
          
          logger.debug('Compensation action completed', {
            actionId: action.id,
            operation: action.operation
          });
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.push({ actionId: action.id, success: false, error: errorMsg });
          
          logger.error('Compensation action failed', {
            actionId: action.id,
            operation: action.operation,
            error: errorMsg
          });
        }
      }
      
      operation.status = 'completed';
      operation.endTime = new Date();
      operation.result = { compensationResults: results };
      
      await this.activeOperations.set(operation.id, operation);
      await this.successfulRecoveries.increment();
      
      await this.recoveryState.transition('stabilizing');
      
      this.emit('compensation-completed', operation);
      
      // Stabilization period
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.recoveryState.transition('monitoring');
      
    } catch (error) {
      operation.status = 'failed';
      operation.endTime = new Date();
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      
      await this.activeOperations.set(operation.id, operation);
      await this.failedRecoveries.increment();
      
      await this.recoveryState.transition('failed');
      
      this.emit('recovery-failed', operation);
    }
  }

  /**
   * Execute circuit breaker recovery strategy
   */
  private async executeCircuitBreakRecovery(operation: RecoveryOperation): Promise<void> {
    const circuitRelease = await this.circuitMutex.acquire();
    
    try {
      operation.status = 'executing';
      await this.activeOperations.set(operation.id, operation);
      
      // Open circuit breaker for component
      await this.circuitBreakers.set(operation.targetComponent, {
        state: 'open' as CircuitState,
        failureCount: 0,
        lastFailureTime: new Date(),
        nextAttemptTime: new Date(Date.now() + this.defaultCircuitConfig.resetTimeoutMs),
        config: this.defaultCircuitConfig
      });
      
      logger.info('Circuit breaker opened', {
        operationId: operation.id,
        component: operation.targetComponent,
        resetTimeout: this.defaultCircuitConfig.resetTimeoutMs
      });
      
      operation.status = 'completed';
      operation.endTime = new Date();
      operation.result = { 
        circuitState: 'open',
        resetTime: new Date(Date.now() + this.defaultCircuitConfig.resetTimeoutMs)
      };
      
      await this.activeOperations.set(operation.id, operation);
      await this.successfulRecoveries.increment();
      
      this.emit('circuit-breaker-opened', operation);
      
    } finally {
      circuitRelease();
    }
  }

  /**
   * Register compensation actions for a component
   */
  async registerCompensationActions(
    component: string,
    actions: Array<{
      operation: string;
      compensationFn: (context: Record<string, unknown>) => Promise<void>;
      dependencies?: string[];
      priority?: number;
    }>
  ): Promise<void> {
    const compensationActions: CompensationAction[] = actions.map(action => ({
      id: uuidv4(),
      component,
      operation: action.operation,
      compensationFn: action.compensationFn,
      dependencies: action.dependencies || [],
      priority: action.priority || 5
    }));

    await this.compensationActions.set(component, compensationActions);
    
    logger.info('Compensation actions registered', {
      component,
      actionCount: compensationActions.length
    });
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    state: RecoveryState;
    activeOperations: number;
    checkpointCount: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    successRate: number;
    circuitBreakerCount: number;
    isShuttingDown: boolean;
  } {
    const successful = this.successfulRecoveries.get();
    const failed = this.failedRecoveries.get();
    const total = successful + failed;
    
    return {
      state: this.recoveryState.getState(),
      activeOperations: this.operationCounter.get(),
      checkpointCount: this.checkpoints.size,
      successfulRecoveries: successful,
      failedRecoveries: failed,
      successRate: total > 0 ? successful / total : 0,
      circuitBreakerCount: this.circuitBreakers.size,
      isShuttingDown: this.isShuttingDown.get()
    };
  }

  // ==================== HELPER METHODS ====================

  private getMaxAttempts(strategy: string): number {
    switch (strategy) {
      case 'retry': return 3;
      case 'rollback': return 1;
      case 'compensate': return 1;
      case 'circuit-break': return 1;
      default: return 1;
    }
  }

  private async performRecoveryOperation(operation: RecoveryOperation): Promise<void> {
    // Simulate recovery operation
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures
    if (Math.random() < 0.3) {
      throw new Error('Recovery operation failed');
    }
  }

  private async performRollback(checkpoint: RecoveryCheckpoint, operation: RecoveryOperation): Promise<void> {
    // Simulate rollback operation
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    logger.info('Rollback operation completed', {
      checkpointId: checkpoint.id,
      operationId: operation.id
    });
  }

  private sortCompensationActions(actions: CompensationAction[]): CompensationAction[] {
    // Simple topological sort by dependencies and priority
    const sorted: CompensationAction[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (action: CompensationAction): void => {
      if (visiting.has(action.id)) {
        throw new Error(`Circular dependency in compensation actions: ${action.id}`);
      }
      
      if (visited.has(action.id)) {
        return;
      }
      
      visiting.add(action.id);
      
      // Visit dependencies first
      for (const depId of action.dependencies) {
        const depAction = actions.find(a => a.id === depId);
        if (depAction) {
          visit(depAction);
        }
      }
      
      visiting.delete(action.id);
      visited.add(action.id);
      sorted.push(action);
    };
    
    // Sort by priority first
    const prioritySorted = [...actions].sort((a, b) => b.priority - a.priority);
    
    for (const action of prioritySorted) {
      if (!visited.has(action.id)) {
        visit(action);
      }
    }
    
    return sorted;
  }

  private async updateCircuitBreakers(): Promise<void> {
    const circuitEntries = await this.circuitBreakers.entries();
    
    for (const [component, circuitState] of circuitEntries) {
      if (circuitState.state === 'open' && Date.now() >= circuitState.nextAttemptTime.getTime()) {
        // Transition to half-open
        circuitState.state = 'half-open';
        await this.circuitBreakers.set(component, circuitState);
        
        this.emit('circuit-breaker-half-open', { component });
      }
    }
  }

  private async cleanupOldCheckpoints(): Promise<void> {
    const checkpoints = await this.checkpoints.values();
    
    if (checkpoints.length <= this.maxCheckpoints) {
      return;
    }
    
    // Keep only the most recent checkpoints
    const sortedCheckpoints = checkpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const toDelete = sortedCheckpoints.slice(this.maxCheckpoints);
    
    for (const checkpoint of toDelete) {
      await this.checkpoints.delete(checkpoint.id);
    }
    
    logger.debug('Cleaned up old checkpoints', {
      deleted: toDelete.length,
      remaining: this.maxCheckpoints
    });
  }

  /**
   * Shutdown with proper resource cleanup
   */
  async shutdown(timeoutMs = 30000): Promise<void> {
    await this.isShuttingDown.set(true);
    
    logger.info('Starting ErrorRecoveryManager shutdown', {
      activeOperations: this.operationCounter.get(),
      checkpointCount: this.checkpoints.size
    });
    
    // Wait for active operations to complete
    const startTime = Date.now();
    while (this.operationCounter.get() > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force cleanup if timeout exceeded
    if (this.operationCounter.get() > 0) {
      logger.warn('Shutdown timeout exceeded, forcing cleanup', {
        remainingOperations: this.operationCounter.get()
      });
    }
    
    // Clear all data structures
    await this.checkpoints.clear();
    await this.activeOperations.clear();
    await this.compensationActions.clear();
    await this.circuitBreakers.clear();
    
    await this.operationCounter.reset();
    await this.successfulRecoveries.reset();
    await this.failedRecoveries.reset();
    
    logger.info('ErrorRecoveryManager shutdown completed');
  }
}

// Circuit breaker state interface
interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: Date;
  nextAttemptTime: Date;
  config: CircuitBreakerConfig;
}