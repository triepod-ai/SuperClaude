import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@superclaude/shared';
import {
  WaveExecutionPlan,
  WaveExecution,
  WaveStatus,
  WaveStrategy,
  WaveExecutionError
} from '../types/index.js';
import { AsyncMutex, AtomicCounter, ThreadSafeMap, AtomicBoolean } from '../utils/concurrency.js';

/**
 * Manages wave-based execution for complex multi-phase operations
 * Implements compound intelligence through progressive enhancement
 * Thread-safe with proper synchronization for concurrent operations
 */
export class WaveManager extends EventEmitter {
  private activeExecutions: ThreadSafeMap<string, WaveExecution>;
  private executionHistory: ThreadSafeMap<string, WaveExecution>;
  private phaseTimeout: number = 600000; // 10 minutes per phase
  private executionMutex: AsyncMutex;
  private phaseMutex: AsyncMutex;
  private cleanupMutex: AsyncMutex;
  private executionCounter: AtomicCounter;
  private isShuttingDown: AtomicBoolean;
  
  constructor() {
    super();
    this.activeExecutions = new ThreadSafeMap();
    this.executionHistory = new ThreadSafeMap();
    this.executionMutex = new AsyncMutex();
    this.phaseMutex = new AsyncMutex();
    this.cleanupMutex = new AsyncMutex();
    this.executionCounter = new AtomicCounter();
    this.isShuttingDown = new AtomicBoolean(false);
  }

  /**
   * Execute wave plan with proper synchronization
   */
  async executePlan(plan: WaveExecutionPlan): Promise<WaveExecution> {
    // Check if shutting down
    if (this.isShuttingDown.get()) {
      throw new WaveExecutionError('WaveManager is shutting down', 'shutdown');
    }

    // Acquire execution lock to prevent race conditions
    const release = await this.executionMutex.acquire();
    
    try {
      const executionId = uuidv4();
      const execution: WaveExecution = {
        id: executionId,
        planId: plan.id,
        status: 'planning',
        startTime: new Date(),
        totalTokensUsed: 0,
        completedPhases: [],
        failedPhases: [],
        results: [],
        errors: [],
        metadata: { strategy: plan.strategy }
      };
      
      logger.info('Starting wave execution', {
        executionId: execution.id,
        planId: plan.id,
        strategy: plan.strategy,
        phaseCount: plan.phases.length,
        activeExecutions: this.activeExecutions.size
      });
      
      // Atomically add to active executions
      await this.activeExecutions.set(execution.id, execution);
      await this.executionCounter.increment();
      
      // Emit start event after safely storing
      this.emit('wave-started', execution);
      
      // Update status to executing
      execution.status = 'executing';
      
      // Execute based on strategy
      switch (plan.strategy) {
        case 'progressive':
          await this.executeProgressive(plan, execution);
          break;
        case 'systematic':
          await this.executeSystematic(plan, execution);
          break;
        case 'adaptive':
          await this.executeAdaptive(plan, execution);
          break;
        case 'enterprise':
          await this.executeEnterprise(plan, execution);
          break;
        default:
          throw new WaveExecutionError(
            `Unknown wave strategy: ${plan.strategy}`,
            execution.id
          );
      }
      
      // Atomically complete execution
      await this.completeExecution(execution, 'completed');
      
      logger.info('Wave execution completed', {
        executionId: execution.id,
        completedPhases: execution.completedPhases.length,
        totalTokens: execution.totalTokensUsed
      });
      
      // Emit completion event
      this.emit('wave-completed', execution);
      
      return execution;
      
    } catch (error) {
      // Ensure execution is properly marked as failed
      if (execution.status !== 'failed') {
        execution.status = 'failed';
        execution.endTime = new Date();
        execution.errors.push(error instanceof Error ? error.message : 'Unknown error');
        
        await this.completeExecution(execution, 'failed');
      }
      
      logger.error('Wave execution failed', {
        executionId: execution.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Emit failure event
      this.emit('wave-failed', execution, error);
      
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Atomically complete execution and move to history
   */
  private async completeExecution(execution: WaveExecution, status: WaveStatus): Promise<void> {
    const completionRelease = await this.cleanupMutex.acquire();
    try {
      execution.status = status;
      execution.endTime = new Date();
      
      // Atomic move from active to history
      await this.executionHistory.set(execution.id, execution);
      await this.activeExecutions.delete(execution.id);
      await this.executionCounter.decrement();
    } finally {
      completionRelease();
    }
  }

  /**
   * Execute progressive wave strategy
   * Incremental enhancement with iterative improvement
   */
  private async executeProgressive(plan: WaveExecutionPlan, execution: WaveExecution): Promise<void> {
    logger.info('Executing progressive wave strategy', {
      executionId: execution.id,
      phaseCount: plan.phases.length
    });
    
    // Sort phases by priority (highest first)
    const sortedPhases = [...plan.phases].sort((a, b) => b.priority - a.priority);
    
    for (const phase of sortedPhases) {
      try {
        // Check dependencies
        if (!this.areDependenciesMet(phase.dependencies, execution.completedPhases)) {
          logger.warn('Phase dependencies not met, skipping', {
            phaseId: phase.id,
            dependencies: phase.dependencies,
            completed: execution.completedPhases
          });
          continue;
        }
        
        execution.currentPhase = phase.id;
        
        logger.info('Executing phase', {
          executionId: execution.id,
          phaseId: phase.id,
          phaseName: phase.name
        });
        
        // Execute phase with timeout and thread safety
        const phaseResult = await this.executePhaseWithTimeout(phase, execution);
        
        // Atomically update execution state
        await this.updateExecutionState(execution, phase.id, phaseResult, phase.estimatedTokens);
        
        // Progressive enhancement: adapt based on results
        await this.adaptBasedOnResults(execution, phaseResult);
        
      } catch (error) {
        logger.error('Phase execution failed', {
          phaseId: phase.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        await this.markPhaseAsFailed(execution, phase.id, error instanceof Error ? error.message : 'Unknown error');
        
        // Progressive strategy: continue with other phases unless critical
        if (phase.priority >= 9) {
          throw new WaveExecutionError(
            `Critical phase failed: ${phase.id}`,
            execution.id
          );
        }
      }
    }
  }

  /**
   * Execute systematic wave strategy
   * Methodical analysis with strict ordering
   */
  private async executeSystematic(plan: WaveExecutionPlan, execution: WaveExecution): Promise<void> {
    logger.info('Executing systematic wave strategy', {
      executionId: execution.id,
      phaseCount: plan.phases.length
    });
    
    // Systematic strategy requires dependency-ordered execution
    const orderedPhases = this.orderPhasesByDependencies(plan.phases);
    
    for (const phase of orderedPhases) {
      try {
        execution.currentPhase = phase.id;
        
        logger.info('Executing phase systematically', {
          executionId: execution.id,
          phaseId: phase.id,
          phaseName: phase.name
        });
        
        // Execute phase
        const phaseResult = await this.executePhaseWithTimeout(phase, execution);
        
        // Atomically update execution state
        await this.updateExecutionState(execution, phase.id, phaseResult, phase.estimatedTokens);
        
        // Validation if required
        if (plan.validationRequired) {
          await this.validatePhaseResult(phase, phaseResult, execution);
        }
        
      } catch (error) {
        // Systematic strategy: fail fast on any error
        throw new WaveExecutionError(
          `Systematic execution failed at phase ${phase.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          execution.id
        );
      }
    }
  }

  /**
   * Execute adaptive wave strategy
   * Dynamic configuration based on execution context
   */
  private async executeAdaptive(plan: WaveExecutionPlan, execution: WaveExecution): Promise<void> {
    logger.info('Executing adaptive wave strategy', {
      executionId: execution.id,
      phaseCount: plan.phases.length
    });
    
    let remainingPhases = [...plan.phases];
    let concurrentPhases = Math.min(plan.maxConcurrentPhases, 2); // Start conservative
    
    while (remainingPhases.length > 0) {
      // Select phases to execute concurrently
      const executablePhases = this.selectExecutablePhases(
        remainingPhases,
        execution.completedPhases,
        concurrentPhases
      );
      
      if (executablePhases.length === 0) {
        throw new WaveExecutionError(
          'No executable phases found - possible circular dependency',
          execution.id
        );
      }
      
      try {
        // Execute phases concurrently
        const phasePromises = executablePhases.map(phase => 
          this.executePhaseWithTimeout(phase, execution)
        );
        
        const results = await Promise.allSettled(phasePromises);
        
        // Process results atomically
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const phase = executablePhases[i];
          
          if (result.status === 'fulfilled') {
            await this.updateExecutionState(execution, phase.id, result.value, phase.estimatedTokens);
          } else {
            await this.markPhaseAsFailed(execution, phase.id, result.reason);
          }
        }
        
        // Remove completed/failed phases
        remainingPhases = remainingPhases.filter(phase => 
          !execution.completedPhases.includes(phase.id) &&
          !execution.failedPhases.includes(phase.id)
        );
        
        // Adapt concurrency based on success rate
        const successRate = executablePhases.length > 0 ? 
          execution.completedPhases.length / (execution.completedPhases.length + execution.failedPhases.length) : 1;
        
        if (successRate > 0.8 && concurrentPhases < plan.maxConcurrentPhases) {
          concurrentPhases += 1;
        } else if (successRate < 0.5 && concurrentPhases > 1) {
          concurrentPhases -= 1;
        }
        
      } catch (error) {
        throw new WaveExecutionError(
          `Adaptive execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          execution.id
        );
      }
    }
  }

  /**
   * Execute enterprise wave strategy
   * Large-scale orchestration with full validation
   */
  private async executeEnterprise(plan: WaveExecutionPlan, execution: WaveExecution): Promise<void> {
    logger.info('Executing enterprise wave strategy', {
      executionId: execution.id,
      phaseCount: plan.phases.length
    });
    
    // Enterprise strategy: full validation and checkpoint system
    const checkpoints: string[] = [];
    const orderedPhases = this.orderPhasesByDependencies(plan.phases);
    
    for (const phase of orderedPhases) {
      try {
        execution.currentPhase = phase.id;
        
        // Pre-execution validation
        await this.validatePreExecution(phase, execution);
        
        logger.info('Executing enterprise phase', {
          executionId: execution.id,
          phaseId: phase.id,
          phaseName: phase.name,
          checkpoint: checkpoints.length
        });
        
        // Execute with full monitoring
        const phaseResult = await this.executePhaseWithTimeout(phase, execution);
        
        // Post-execution validation
        await this.validatePhaseResult(phase, phaseResult, execution);
        
        // Atomically update state
        await this.updateExecutionState(execution, phase.id, phaseResult, phase.estimatedTokens);
        
        // Create checkpoint
        checkpoints.push(phase.id);
        await this.createCheckpoint(execution, phase.id);
        
        logger.info('Enterprise phase completed with checkpoint', {
          phaseId: phase.id,
          checkpointCount: checkpoints.length
        });
        
      } catch (error) {
        logger.error('Enterprise phase failed', {
          phaseId: phase.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Enterprise strategy: implement rollback if configured
        if (plan.rollbackStrategy === 'immediate') {
          await this.rollbackToLastCheckpoint(execution, checkpoints);
        }
        
        throw new WaveExecutionError(
          `Enterprise execution failed at phase ${phase.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          execution.id
        );
      }
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Thread-safe helper to update execution state
   */
  private async updateExecutionState(
    execution: WaveExecution, 
    phaseId: string, 
    result: Record<string, unknown>, 
    tokenUsage: number
  ): Promise<void> {
    const phaseRelease = await this.phaseMutex.acquire();
    try {
      execution.completedPhases.push(phaseId);
      execution.results.push(result);
      execution.totalTokensUsed += tokenUsage;
      
      // Update in storage
      await this.activeExecutions.set(execution.id, execution);
    } finally {
      phaseRelease();
    }
  }

  /**
   * Thread-safe helper to mark phase as failed
   */
  private async markPhaseAsFailed(execution: WaveExecution, phaseId: string, error: string): Promise<void> {
    const phaseRelease = await this.phaseMutex.acquire();
    try {
      execution.failedPhases.push(phaseId);
      execution.errors.push(`Phase ${phaseId}: ${error}`);
      
      // Update in storage
      await this.activeExecutions.set(execution.id, execution);
    } finally {
      phaseRelease();
    }
  }

  /**
   * Execute phase with timeout
   */
  private async executePhaseWithTimeout(phase: any, execution: WaveExecution): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      // Check if shutting down before starting phase
      if (this.isShuttingDown.get()) {
        reject(new Error('WaveManager is shutting down'));
        return;
      }
      
      const timer = setTimeout(() => {
        reject(new Error(`Phase ${phase.id} timed out after ${this.phaseTimeout}ms`));
      }, this.phaseTimeout);
      
      // Mock phase execution with shutdown check
      this.executePhase(phase, execution)
        .then(result => {
          clearTimeout(timer);
          // Final check before resolving
          if (this.isShuttingDown.get()) {
            reject(new Error('WaveManager shutdown during phase execution'));
          } else {
            resolve(result);
          }
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Execute individual phase with concurrency checks (mock implementation)
   */
  private async executePhase(phase: any, execution: WaveExecution): Promise<Record<string, unknown>> {
    // Periodic shutdown checks during execution
    const executionTime = 100 + Math.random() * 200;
    const checkInterval = Math.min(50, executionTime / 4);
    
    for (let elapsed = 0; elapsed < executionTime; elapsed += checkInterval) {
      if (this.isShuttingDown.get()) {
        throw new Error(`Phase ${phase.id} interrupted by shutdown`);
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    return {
      phaseId: phase.id,
      phaseName: phase.name,
      result: `Completed phase: ${phase.name}`,
      tokensUsed: phase.estimatedTokens,
      executionTime,
      timestamp: new Date(),
      executionId: execution.id
    };
  }

  /**
   * Check if dependencies are met
   */
  private areDependenciesMet(dependencies: string[], completedPhases: string[]): boolean {
    return dependencies.every(dep => completedPhases.includes(dep));
  }

  /**
   * Order phases by dependencies (topological sort)
   */
  private orderPhasesByDependencies(phases: any[]): any[] {
    const ordered: any[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (phase: any): void => {
      if (visiting.has(phase.id)) {
        throw new Error(`Circular dependency detected involving phase: ${phase.id}`);
      }
      
      if (visited.has(phase.id)) {
        return;
      }
      
      visiting.add(phase.id);
      
      // Visit dependencies first
      for (const depId of phase.dependencies) {
        const depPhase = phases.find(p => p.id === depId);
        if (depPhase) {
          visit(depPhase);
        }
      }
      
      visiting.delete(phase.id);
      visited.add(phase.id);
      ordered.push(phase);
    };
    
    for (const phase of phases) {
      if (!visited.has(phase.id)) {
        visit(phase);
      }
    }
    
    return ordered;
  }

  /**
   * Select executable phases for concurrent execution
   */
  private selectExecutablePhases(
    remainingPhases: any[],
    completedPhases: string[],
    maxCount: number
  ): any[] {
    return remainingPhases
      .filter(phase => this.areDependenciesMet(phase.dependencies, completedPhases))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxCount);
  }

  /**
   * Adapt based on phase results
   */
  private async adaptBasedOnResults(execution: WaveExecution, result: Record<string, unknown>): Promise<void> {
    // Mock adaptation logic
    logger.debug('Adapting based on phase results', {
      executionId: execution.id,
      resultKeys: Object.keys(result)
    });
  }

  /**
   * Validate phase result
   */
  private async validatePhaseResult(
    phase: any,
    result: Record<string, unknown>,
    execution: WaveExecution
  ): Promise<void> {
    // Mock validation logic
    if (!result || Object.keys(result).length === 0) {
      throw new Error(`Phase ${phase.id} produced empty result`);
    }
  }

  /**
   * Validate pre-execution conditions
   */
  private async validatePreExecution(phase: any, execution: WaveExecution): Promise<void> {
    // Mock pre-execution validation
    if (!this.areDependenciesMet(phase.dependencies, execution.completedPhases)) {
      throw new Error(`Phase ${phase.id} dependencies not met`);
    }
  }

  /**
   * Create checkpoint
   */
  private async createCheckpoint(execution: WaveExecution, phaseId: string): Promise<void> {
    // Mock checkpoint creation
    logger.debug('Creating checkpoint', {
      executionId: execution.id,
      phaseId
    });
  }

  /**
   * Rollback to last checkpoint
   */
  private async rollbackToLastCheckpoint(execution: WaveExecution, checkpoints: string[]): Promise<void> {
    // Mock rollback logic
    logger.warn('Rolling back to last checkpoint', {
      executionId: execution.id,
      lastCheckpoint: checkpoints[checkpoints.length - 1]
    });
  }

  /**
   * Cancel execution with proper synchronization
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    await this.completeExecution(execution, 'cancelled');
    
    logger.info('Wave execution cancelled', { executionId });
  }

  /**
   * Get execution history (thread-safe)
   */
  async getExecutionHistory(): Promise<WaveExecution[]> {
    return await this.executionHistory.values();
  }

  /**
   * Get active executions (thread-safe)
   */
  async getActiveExecutions(): Promise<WaveExecution[]> {
    return await this.activeExecutions.values();
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    active: number;
    total: number;
    isShuttingDown: boolean;
  } {
    return {
      active: this.executionCounter.get(),
      total: this.activeExecutions.size + this.executionHistory.size,
      isShuttingDown: this.isShuttingDown.get()
    };
  }

  /**
   * Cleanup resources with proper synchronization
   */
  async cleanup(): Promise<void> {
    // Mark as shutting down to prevent new executions
    await this.isShuttingDown.set(true);
    
    const cleanupRelease = await this.cleanupMutex.acquire();
    try {
      logger.info('Starting WaveManager cleanup', {
        activeExecutions: this.activeExecutions.size,
        totalExecutions: this.executionCounter.get()
      });
      
      // Cancel all active executions
      const activeIds = await this.activeExecutions.keys();
      const cancelPromises = activeIds.map(id => 
        this.cancelExecution(id).catch(error => 
          logger.warn('Failed to cancel execution during cleanup', { id, error })
        )
      );
      
      await Promise.allSettled(cancelPromises);
      
      // Clear all collections
      await this.activeExecutions.clear();
      await this.executionCounter.reset();
      
      logger.info('WaveManager cleanup completed');
      
    } catch (error) {
      logger.error('Error during WaveManager cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      cleanupRelease();
    }
  }

  /**
   * Graceful shutdown - wait for active executions to complete
   */
  async gracefulShutdown(timeoutMs = 30000): Promise<void> {
    await this.isShuttingDown.set(true);
    
    const startTime = Date.now();
    
    // Wait for active executions to complete
    while (this.executionCounter.get() > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force cleanup if timeout exceeded
    if (this.executionCounter.get() > 0) {
      logger.warn('Graceful shutdown timeout exceeded, forcing cleanup', {
        remainingExecutions: this.executionCounter.get()
      });
    }
    
    await this.cleanup();
  }
}