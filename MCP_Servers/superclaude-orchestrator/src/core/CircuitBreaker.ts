import { logger } from '@superclaude/shared';
import { CircuitBreakerState } from '../types/index.js';

/**
 * Circuit breaker pattern implementation for provider reliability
 * Prevents cascading failures and provides automatic recovery
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  
  constructor(private options: CircuitBreakerOptions) {}

  /**
   * Record successful operation
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.successCount += 1;
    
    // If we're in half-open state and have enough successes, close the circuit
    if (this.state === 'half-open' && this.successCount >= this.options.successThreshold) {
      this.state = 'closed';
      this.successCount = 0;
      
      logger.info('Circuit breaker closed after successful recovery', {
        successCount: this.successCount\n      });\n    }\n  }\n\n  /**\n   * Record failed operation\n   */\n  recordFailure(): void {\n    this.failureCount += 1;\n    this.lastFailureTime = Date.now();\n    this.successCount = 0;\n    \n    // If we've exceeded the failure threshold, open the circuit\n    if (this.state === 'closed' && this.failureCount >= this.options.failureThreshold) {\n      this.state = 'open';\n      \n      logger.warn('Circuit breaker opened due to failure threshold', {\n        failureCount: this.failureCount,\n        threshold: this.options.failureThreshold\n      });\n    }\n    \n    // If we're in half-open state and still failing, go back to open\n    if (this.state === 'half-open') {\n      this.state = 'open';\n      \n      logger.warn('Circuit breaker returned to open state after failed recovery attempt');\n    }\n  }\n\n  /**\n   * Check if operation is allowed\n   */\n  canExecute(): boolean {\n    switch (this.state) {\n      case 'closed':\n        return true;\n        \n      case 'open':\n        // Check if enough time has passed to attempt recovery\n        if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {\n          this.state = 'half-open';\n          this.successCount = 0;\n          \n          logger.info('Circuit breaker transitioning to half-open for recovery attempt');\n          return true;\n        }\n        return false;\n        \n      case 'half-open':\n        return true;\n        \n      default:\n        return false;\n    }\n  }\n\n  /**\n   * Execute operation with circuit breaker protection\n   */\n  async execute<T>(operation: () => Promise<T>): Promise<T> {\n    if (!this.canExecute()) {\n      throw new Error('Circuit breaker is open - operation not allowed');\n    }\n    \n    try {\n      // Set timeout if configured\n      const result = this.options.timeoutMs \n        ? await this.executeWithTimeout(operation, this.options.timeoutMs)\n        : await operation();\n      \n      this.recordSuccess();\n      return result;\n      \n    } catch (error) {\n      this.recordFailure();\n      throw error;\n    }\n  }\n\n  /**\n   * Execute operation with timeout\n   */\n  private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {\n    return new Promise((resolve, reject) => {\n      const timer = setTimeout(() => {\n        reject(new Error(`Operation timed out after ${timeoutMs}ms`));\n      }, timeoutMs);\n      \n      operation()\n        .then(result => {\n          clearTimeout(timer);\n          resolve(result);\n        })\n        .catch(error => {\n          clearTimeout(timer);\n          reject(error);\n        });\n    });\n  }\n\n  /**\n   * Get current state\n   */\n  getState(): CircuitBreakerState {\n    return this.state;\n  }\n\n  /**\n   * Get failure count\n   */\n  getFailureCount(): number {\n    return this.failureCount;\n  }\n\n  /**\n   * Get success count (for half-open state)\n   */\n  getSuccessCount(): number {\n    return this.successCount;\n  }\n\n  /**\n   * Get time since last failure\n   */\n  getTimeSinceLastFailure(): number {\n    return this.lastFailureTime ? Date.now() - this.lastFailureTime : 0;\n  }\n\n  /**\n   * Reset circuit breaker to closed state\n   */\n  reset(): void {\n    this.state = 'closed';\n    this.failureCount = 0;\n    this.successCount = 0;\n    this.lastFailureTime = 0;\n    \n    logger.info('Circuit breaker manually reset to closed state');\n  }\n\n  /**\n   * Get circuit breaker metrics\n   */\n  getMetrics(): CircuitBreakerMetrics {\n    return {\n      state: this.state,\n      failureCount: this.failureCount,\n      successCount: this.successCount,\n      timeSinceLastFailure: this.getTimeSinceLastFailure(),\n      isOpen: this.state === 'open',\n      canExecute: this.canExecute()\n    };\n  }\n}\n\n// ==================== INTERFACES ====================\n\nexport interface CircuitBreakerOptions {\n  /** Number of failures required to open the circuit */\n  failureThreshold: number;\n  \n  /** Timeout for individual operations (ms) */\n  timeoutMs?: number;\n  \n  /** Time to wait before attempting recovery (ms) */\n  resetTimeoutMs: number;\n  \n  /** Number of successes required to close circuit from half-open state */\n  successThreshold?: number;\n}\n\nexport interface CircuitBreakerMetrics {\n  state: CircuitBreakerState;\n  failureCount: number;\n  successCount: number;\n  timeSinceLastFailure: number;\n  isOpen: boolean;\n  canExecute: boolean;\n}"