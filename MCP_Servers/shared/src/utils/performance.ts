import { PerformanceMetrics } from '../types/common.js';
import { logger } from './logger.js';
import { ResourceMonitor, ManagedMap } from './resource-manager.js';

/**
 * Performance monitoring utilities for SuperClaude MCP servers
 */

export interface TimerResult {
  duration: number;
  result: unknown;
}

export class PerformanceMonitor {
  private static resourceMonitor: ResourceMonitor;
  private static metrics: ManagedMap<string, PerformanceMetrics[]>;
  private static timers: Map<string, number> = new Map();
  private static initialized = false;

  /**
   * Initialize the performance monitor
   */
  private static initialize(): void {
    if (!this.initialized) {
      this.resourceMonitor = new ResourceMonitor({
        maxMapSize: 1000,
        ttlSeconds: 3600, // 1 hour
        cleanupIntervalMs: 300000, // 5 minutes
      });

      this.metrics = new ManagedMap('performance-metrics', this.resourceMonitor, {
        maxSize: 1000,
        ttlMs: 3600000 // 1 hour
      });

      this.initialized = true;
      logger.debug('PerformanceMonitor initialized with resource management');
    }
  }

  /**
   * Start a performance timer
   */
  public static startTimer(name: string): void {
    this.initialize();
    this.timers.set(name, performance.now());
  }

  /**
   * End a performance timer and return duration
   */
  public static endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      logger.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);
    return duration;
  }

  /**
   * Measure the execution time of a function
   */
  public static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<TimerResult & { result: T }> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      logger.debug(`Operation '${name}' completed`, { duration });
      
      return { duration, result };
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(`Operation '${name}' failed`, { duration, error });
      throw error;
    }
  }

  /**
   * Measure the execution time of a synchronous function
   */
  public static measure<T>(
    name: string,
    fn: () => T
  ): TimerResult & { result: T } {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      logger.debug(`Operation '${name}' completed`, { duration });
      
      return { duration, result };
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(`Operation '${name}' failed`, { duration, error });
      throw error;
    }
  }

  /**
   * Record performance metrics for an operation
   */
  public static recordMetrics(
    operationName: string,
    metrics: Omit<PerformanceMetrics, 'timestamp'>
  ): void {
    this.initialize();
    
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    const existing = this.metrics.get(operationName) || [];
    existing.push(fullMetrics);
    
    // Keep only last 100 metrics per operation
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100);
    }
    
    this.metrics.set(operationName, existing);
  }

  /**
   * Get performance statistics for an operation
   */
  public static getStats(operationName: string): {
    count: number;
    avgExecutionTime: number;
    avgTokenUsage: number;
    avgSuccessRate: number;
    lastMetrics?: PerformanceMetrics;
  } | null {
    this.initialize();
    
    const metrics = this.metrics.get(operationName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const count = metrics.length;
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / count;
    const avgTokenUsage = metrics.reduce((sum, m) => sum + m.tokenUsage, 0) / count;
    const avgSuccessRate = metrics.reduce((sum, m) => sum + m.successRate, 0) / count;
    const lastMetrics = metrics[metrics.length - 1];

    return {
      count,
      avgExecutionTime,
      avgTokenUsage,
      avgSuccessRate,
      lastMetrics
    };
  }

  /**
   * Get all performance metrics
   */
  public static getAllMetrics(): Map<string, PerformanceMetrics[]> {
    this.initialize();
    return new Map(this.metrics);
  }

  /**
   * Clear metrics for an operation or all operations
   */
  public static clearMetrics(operationName?: string): void {
    this.initialize();
    
    if (operationName) {
      this.metrics.delete(operationName);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Cleanup all resources
   */
  public static cleanup(): void {
    if (this.initialized) {
      this.metrics.cleanup();
      this.resourceMonitor.cleanup();
      this.timers.clear();
      this.initialized = false;
      logger.debug('PerformanceMonitor cleanup completed');
    }
  }

  /**
   * Get memory usage information
   */
  public static getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Create a performance decorator for methods
   */
  public static createPerformanceDecorator(operationName?: string) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      const name = operationName || `${target.constructor.name}.${propertyKey}`;

      descriptor.value = async function (...args: any[]) {
        const { duration, result } = await PerformanceMonitor.measureAsync(
          name,
          () => originalMethod.apply(this, args)
        );

        PerformanceMonitor.recordMetrics(name, {
          executionTime: duration,
          tokenUsage: 0, // Will be updated by calling code if needed
          successRate: 1, // Assume success if no error thrown
          memoryUsage: PerformanceMonitor.getMemoryUsage().heapUsed
        });

        return result;
      };

      return descriptor;
    };
  }
}