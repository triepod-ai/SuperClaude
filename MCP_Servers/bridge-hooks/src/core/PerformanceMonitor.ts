/**
 * Performance Monitor
 * Sub-100ms performance monitoring and optimization engine
 */

import { EventEmitter } from 'events';
import { logger } from '@superclaude/shared';
import { 
  BridgeHookContext, 
  BridgeHookResult,
  PerformanceThresholds,
  PerformanceAlert,
  MCPServerType
} from '../types.js';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  memoryUsage?: number;
  tokenUsage?: number;
  cacheHit: boolean;
  serverId?: MCPServerType;
  success: boolean;
}

export interface PerformanceOptimization {
  type: 'caching' | 'parallelization' | 'load_balancing' | 'circuit_breaker';
  description: string;
  expectedImprovement: number; // percentage
  implementationCost: 'low' | 'medium' | 'high';
  priority: number; // 1-10
}

export interface PerformanceBudget {
  totalExecutionTime: number;
  perOperationTime: number;
  tokenBudget: number;
  memoryBudget: number;
  concurrentOperations: number;
}

/**
 * Real-time performance monitoring with sub-100ms optimization
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private activeOperations: Map<string, Date> = new Map();
  private thresholds: PerformanceThresholds;
  private budget: PerformanceBudget;
  private optimizationRecommendations: PerformanceOptimization[] = [];
  private circuitBreakers: Map<string, { failures: number; lastFailure: Date; isOpen: boolean }> = new Map();

  // Performance tracking
  private operationStats: Map<string, {
    count: number;
    totalTime: number;
    successCount: number;
    avgTime: number;
    p95Time: number;
    recentTimes: number[];
  }> = new Map();

  // Caching for performance
  private performanceCache: Map<string, { result: any; timestamp: Date; hits: number }> = new Map();
  private readonly cacheSize = 1000;
  private readonly cacheTTL = 300000; // 5 minutes

  constructor(
    thresholds?: Partial<PerformanceThresholds>,
    budget?: Partial<PerformanceBudget>
  ) {
    super();

    this.thresholds = {
      executionTime: { target: 50, warning: 80, critical: 100 },
      tokenUsage: { target: 1000, warning: 5000, critical: 10000 },
      memoryUsage: { target: 100, warning: 500, critical: 1000 },
      ...thresholds
    };

    this.budget = {
      totalExecutionTime: 5000,
      perOperationTime: 100,
      tokenBudget: 50000,
      memoryBudget: 2048,
      concurrentOperations: 10,
      ...budget
    };

    this.startPerformanceOptimization();
    logger.info('Performance Monitor initialized', { 
      thresholds: this.thresholds, 
      budget: this.budget 
    });
  }

  /**
   * Start tracking operation performance
   */
  startOperation(operationId: string, context: BridgeHookContext): void {
    this.activeOperations.set(operationId, new Date());
    
    // Check if we're exceeding concurrent operation limits
    if (this.activeOperations.size > this.budget.concurrentOperations) {
      this.emitAlert({
        alertId: `concurrent_${Date.now()}`,
        timestamp: new Date(),
        severity: 'warning',
        metric: 'executionTime',
        value: this.activeOperations.size,
        threshold: this.budget.concurrentOperations,
        context,
        recommendation: 'Consider implementing operation queuing or throttling',
      });
    }

    logger.debug('Operation started', { 
      operationId, 
      operation: context.operation,
      activeCount: this.activeOperations.size 
    });
  }

  /**
   * Complete operation tracking and record metrics
   */
  completeOperation(
    operationId: string, 
    context: BridgeHookContext, 
    result: BridgeHookResult
  ): PerformanceMetric {
    const startTime = this.activeOperations.get(operationId);
    const endTime = new Date();
    
    if (!startTime) {
      logger.warn('Operation not found in active tracking', { operationId });
      return this.createDefaultMetric(context, result);
    }

    this.activeOperations.delete(operationId);
    
    const duration = endTime.getTime() - startTime.getTime();
    const metric: PerformanceMetric = {
      operation: context.operation,
      duration,
      timestamp: endTime,
      memoryUsage: result.performance?.memoryUsage,
      tokenUsage: result.performance?.tokenUsage,
      cacheHit: result.performance?.cacheHitRate ? result.performance.cacheHitRate > 0 : false,
      success: result.success,
    };

    // Record metric
    this.recordMetric(metric);
    
    // Check thresholds and emit alerts if needed
    this.checkThresholds(metric, context);
    
    // Update operation statistics
    this.updateOperationStats(metric);
    
    // Check circuit breaker status
    this.updateCircuitBreaker(context.operation, result.success);

    logger.debug('Operation completed', {
      operationId,
      operation: context.operation,
      duration,
      success: result.success,
    });

    return metric;
  }

  /**
   * Get performance recommendations based on metrics
   */
  getOptimizationRecommendations(): PerformanceOptimization[] {
    this.analyzePerformancePatterns();
    return [...this.optimizationRecommendations].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats(): {
    summary: any;
    operations: any;
    alerts: number;
    cacheStats: any;
    budget: PerformanceBudget;
    circuitBreakers: any;
  } {
    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes
    
    const summary = {
      totalOperations: recentMetrics.length,
      averageExecutionTime: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length 
        : 0,
      successRate: recentMetrics.length > 0
        ? recentMetrics.filter(m => m.success).length / recentMetrics.length
        : 1,
      targetMetRate: recentMetrics.filter(m => m.duration <= this.thresholds.executionTime.target).length / Math.max(1, recentMetrics.length),
      activeOperations: this.activeOperations.size,
    };

    const operations = Object.fromEntries(
      Array.from(this.operationStats.entries()).map(([op, stats]) => [
        op,
        {
          count: stats.count,
          avgTime: stats.avgTime,
          p95Time: stats.p95Time,
          successRate: stats.successCount / stats.count,
        }
      ])
    );

    const cacheStats = {
      size: this.performanceCache.size,
      hitRate: this.calculateCacheHitRate(),
      oldestEntry: this.getOldestCacheEntry(),
    };

    const circuitBreakers = Object.fromEntries(
      Array.from(this.circuitBreakers.entries()).map(([op, cb]) => [
        op,
        {
          isOpen: cb.isOpen,
          failures: cb.failures,
          lastFailure: cb.lastFailure,
        }
      ])
    );

    return {
      summary,
      operations,
      alerts: recentMetrics.filter(m => m.duration > this.thresholds.executionTime.warning).length,
      cacheStats,
      budget: this.budget,
      circuitBreakers,
    };
  }

  /**
   * Check if operation should be cached
   */
  shouldCache(context: BridgeHookContext): boolean {
    const cacheableOperations = ['Read', 'Grep', 'mcp__context7'];
    return cacheableOperations.some(op => context.operation.includes(op));
  }

  /**
   * Get cached result if available
   */
  getCachedResult(cacheKey: string): any | null {
    const cached = this.performanceCache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < this.cacheTTL) {
        cached.hits += 1;
        this.emit('cache_hit', { key: cacheKey, age, hits: cached.hits });
        return cached.result;
      } else {
        this.performanceCache.delete(cacheKey);
      }
    }
    
    return null;
  }

  /**
   * Cache operation result
   */
  cacheResult(cacheKey: string, result: any): void {
    // Evict old entries if cache is full
    if (this.performanceCache.size >= this.cacheSize) {
      this.evictOldestCacheEntries(Math.floor(this.cacheSize * 0.1)); // Evict 10%
    }

    this.performanceCache.set(cacheKey, {
      result,
      timestamp: new Date(),
      hits: 0,
    });

    this.emit('cache_store', { key: cacheKey, size: this.performanceCache.size });
  }

  /**
   * Generate cache key for operation
   */
  generateCacheKey(context: BridgeHookContext): string {
    // Create deterministic cache key
    const keyData = {
      operation: context.operation,
      args: this.sanitizeArgsForCaching(context.args),
      persona: context.persona,
      complexity: context.complexity,
    };

    return `cache_${JSON.stringify(keyData).hashCode()}`;
  }

  /**
   * Check if circuit breaker allows operation
   */
  isCircuitBreakerOpen(operation: string): boolean {
    const cb = this.circuitBreakers.get(operation);
    
    if (!cb || !cb.isOpen) {
      return false;
    }

    // Auto-reset circuit breaker after 30 seconds
    const timeSinceLastFailure = Date.now() - cb.lastFailure.getTime();
    if (timeSinceLastFailure > 30000) {
      cb.isOpen = false;
      cb.failures = 0;
      logger.info('Circuit breaker auto-reset', { operation });
      return false;
    }

    return true;
  }

  /**
   * Get performance recommendations for specific operation
   */
  getOperationRecommendations(operation: string): PerformanceOptimization[] {
    const stats = this.operationStats.get(operation);
    if (!stats) return [];

    const recommendations: PerformanceOptimization[] = [];

    // Slow operation recommendation
    if (stats.avgTime > this.thresholds.executionTime.warning) {
      recommendations.push({
        type: 'parallelization',
        description: `Operation ${operation} is slow (${stats.avgTime}ms avg). Consider parallel execution.`,
        expectedImprovement: 40,
        implementationCost: 'medium',
        priority: 8,
      });
    }

    // High failure rate recommendation
    const failureRate = 1 - (stats.successCount / stats.count);
    if (failureRate > 0.1) {
      recommendations.push({
        type: 'circuit_breaker',
        description: `Operation ${operation} has high failure rate (${(failureRate * 100).toFixed(1)}%). Consider circuit breaker.`,
        expectedImprovement: 30,
        implementationCost: 'low',
        priority: 9,
      });
    }

    // Caching recommendation
    if (this.shouldCache({ operation } as BridgeHookContext) && !this.hasCaching(operation)) {
      recommendations.push({
        type: 'caching',
        description: `Operation ${operation} could benefit from caching.`,
        expectedImprovement: 60,
        implementationCost: 'low',
        priority: 7,
      });
    }

    return recommendations;
  }

  // ===================== PRIVATE IMPLEMENTATION =====================

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics in memory
    const maxMetrics = 10000;
    if (this.metrics.length > maxMetrics) {
      this.metrics = this.metrics.slice(-maxMetrics / 2);
    }

    this.emit('metric_recorded', metric);
  }

  private checkThresholds(metric: PerformanceMetric, context: BridgeHookContext): void {
    // Check execution time thresholds
    if (metric.duration > this.thresholds.executionTime.critical) {
      this.emitAlert({
        alertId: `exec_critical_${Date.now()}`,
        timestamp: new Date(),
        severity: 'critical',
        metric: 'executionTime',
        value: metric.duration,
        threshold: this.thresholds.executionTime.critical,
        context,
        recommendation: 'Immediate optimization required - consider caching or parallelization',
      });
    } else if (metric.duration > this.thresholds.executionTime.warning) {
      this.emitAlert({
        alertId: `exec_warning_${Date.now()}`,
        timestamp: new Date(),
        severity: 'warning',
        metric: 'executionTime',
        value: metric.duration,
        threshold: this.thresholds.executionTime.warning,
        context,
        recommendation: 'Monitor performance and consider optimization',
      });
    }

    // Check token usage thresholds
    if (metric.tokenUsage && metric.tokenUsage > this.thresholds.tokenUsage.critical) {
      this.emitAlert({
        alertId: `token_critical_${Date.now()}`,
        timestamp: new Date(),
        severity: 'critical',
        metric: 'tokenUsage',
        value: metric.tokenUsage,
        threshold: this.thresholds.tokenUsage.critical,
        context,
        recommendation: 'High token usage detected - consider compression or optimization',
      });
    }
  }

  private updateOperationStats(metric: PerformanceMetric): void {
    let stats = this.operationStats.get(metric.operation);
    
    if (!stats) {
      stats = {
        count: 0,
        totalTime: 0,
        successCount: 0,
        avgTime: 0,
        p95Time: 0,
        recentTimes: [],
      };
      this.operationStats.set(metric.operation, stats);
    }

    stats.count += 1;
    stats.totalTime += metric.duration;
    if (metric.success) stats.successCount += 1;
    stats.avgTime = stats.totalTime / stats.count;

    // Track recent times for P95 calculation
    stats.recentTimes.push(metric.duration);
    if (stats.recentTimes.length > 100) {
      stats.recentTimes = stats.recentTimes.slice(-50);
    }

    // Calculate P95
    const sortedTimes = [...stats.recentTimes].sort((a, b) => a - b);
    const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
    stats.p95Time = sortedTimes[p95Index] || 0;
  }

  private updateCircuitBreaker(operation: string, success: boolean): void {
    let cb = this.circuitBreakers.get(operation);
    
    if (!cb) {
      cb = { failures: 0, lastFailure: new Date(), isOpen: false };
      this.circuitBreakers.set(operation, cb);
    }

    if (success) {
      // Reset on success
      cb.failures = 0;
      cb.isOpen = false;
    } else {
      // Increment failures
      cb.failures += 1;
      cb.lastFailure = new Date();
      
      // Open circuit breaker after 5 consecutive failures
      if (cb.failures >= 5) {
        cb.isOpen = true;
        logger.warn('Circuit breaker opened', { operation, failures: cb.failures });
        
        this.emitAlert({
          alertId: `circuit_breaker_${Date.now()}`,
          timestamp: new Date(),
          severity: 'critical',
          metric: 'errorRate',
          value: cb.failures,
          threshold: 5,
          context: { operation } as any,
          recommendation: `Circuit breaker opened for ${operation}. Check system health.`,
        });
      }
    }
  }

  private analyzePerformancePatterns(): void {
    this.optimizationRecommendations = [];
    
    // Analyze overall patterns
    const recentMetrics = this.getRecentMetrics(600000); // Last 10 minutes
    
    if (recentMetrics.length === 0) return;

    // Check average performance
    const avgTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
    if (avgTime > this.thresholds.executionTime.target) {
      this.optimizationRecommendations.push({
        type: 'caching',
        description: `Overall performance is slow (${avgTime.toFixed(1)}ms avg). Enable aggressive caching.`,
        expectedImprovement: 50,
        implementationCost: 'low',
        priority: 8,
      });
    }

    // Check cache hit rate
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < 0.3) {
      this.optimizationRecommendations.push({
        type: 'caching',
        description: `Low cache hit rate (${(cacheHitRate * 100).toFixed(1)}%). Improve caching strategy.`,
        expectedImprovement: 40,
        implementationCost: 'medium',
        priority: 6,
      });
    }

    // Check for operations that could benefit from parallelization
    const slowOperations = recentMetrics.filter(m => m.duration > this.thresholds.executionTime.warning);
    if (slowOperations.length > recentMetrics.length * 0.2) {
      this.optimizationRecommendations.push({
        type: 'parallelization',
        description: `Many operations are slow (${slowOperations.length}/${recentMetrics.length}). Consider parallel execution.`,
        expectedImprovement: 35,
        implementationCost: 'high',
        priority: 7,
      });
    }

    // Add operation-specific recommendations
    for (const [operation] of this.operationStats.entries()) {
      const opRecommendations = this.getOperationRecommendations(operation);
      this.optimizationRecommendations.push(...opRecommendations);
    }
  }

  private getRecentMetrics(timeWindowMs: number): PerformanceMetric[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  private calculateCacheHitRate(): number {
    const cacheEntries = Array.from(this.performanceCache.values());
    if (cacheEntries.length === 0) return 0;
    
    const totalRequests = cacheEntries.reduce((sum, entry) => sum + entry.hits + 1, 0);
    const hits = cacheEntries.reduce((sum, entry) => sum + entry.hits, 0);
    
    return totalRequests > 0 ? hits / totalRequests : 0;
  }

  private getOldestCacheEntry(): Date | null {
    const timestamps = Array.from(this.performanceCache.values()).map(entry => entry.timestamp);
    return timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null;
  }

  private evictOldestCacheEntries(count: number): void {
    const entries = Array.from(this.performanceCache.entries())
      .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(0, count);
    
    for (const [key] of entries) {
      this.performanceCache.delete(key);
    }
    
    this.emit('cache_eviction', { evicted: count, remaining: this.performanceCache.size });
  }

  private sanitizeArgsForCaching(args: Record<string, unknown>): Record<string, unknown> {
    // Remove non-deterministic values for consistent caching
    const sanitized = { ...args };
    delete sanitized.timestamp;
    delete sanitized.sessionId;
    delete sanitized.executionId;
    return sanitized;
  }

  private hasCaching(operation: string): boolean {
    // Check if operation already uses caching
    const stats = this.operationStats.get(operation);
    if (!stats) return false;
    
    const recentMetrics = this.getRecentMetrics(300000).filter(m => m.operation === operation);
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    
    return cacheHits > 0;
  }

  private createDefaultMetric(context: BridgeHookContext, result: BridgeHookResult): PerformanceMetric {
    return {
      operation: context.operation,
      duration: result.performance?.duration || 0,
      timestamp: new Date(),
      memoryUsage: result.performance?.memoryUsage,
      tokenUsage: result.performance?.tokenUsage,
      cacheHit: false,
      success: result.success,
    };
  }

  private emitAlert(alert: PerformanceAlert): void {
    this.emit('performance_alert', alert);
    logger.warn('Performance alert', alert);
  }

  private startPerformanceOptimization(): void {
    // Periodic optimization analysis
    setInterval(() => {
      this.analyzePerformancePatterns();
      this.cleanupOldMetrics();
      this.cleanupExpiredCache();
    }, 60000); // Every minute
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - 3600000); // Keep 1 hour of metrics
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.performanceCache.entries()) {
      if (now - entry.timestamp.getTime() > this.cacheTTL) {
        this.performanceCache.delete(key);
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.metrics = [];
    this.activeOperations.clear();
    this.operationStats.clear();
    this.performanceCache.clear();
    this.circuitBreakers.clear();
    this.optimizationRecommendations = [];
    logger.info('Performance Monitor cleanup completed');
  }
}

// Extension for String to add hashCode method
declare global {
  interface String {
    hashCode(): number;
  }
}

String.prototype.hashCode = function(): number {
  let hash = 0;
  if (this.length === 0) return hash;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
};