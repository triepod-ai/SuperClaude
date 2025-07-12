import { EventEmitter } from 'events';
import { logger } from './logger.js';

/**
 * Resource limits for different resource types
 */
export interface ResourceLimits {
  maxMapSize: number;
  maxSetSize: number;
  maxArrayLength: number;
  ttlSeconds: number;
  cleanupIntervalMs: number;
  memoryThresholdBytes: number;
  rotationSize: number;
}

/**
 * Default resource limits for MCP servers
 */
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxMapSize: 10000,
  maxSetSize: 5000,
  maxArrayLength: 1000,
  ttlSeconds: 3600, // 1 hour
  cleanupIntervalMs: 300000, // 5 minutes
  memoryThresholdBytes: 500 * 1024 * 1024, // 500MB
  rotationSize: 100 // Keep last 100 items when rotating
};

/**
 * Resource monitor that tracks usage and triggers cleanup
 */
export class ResourceMonitor extends EventEmitter {
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();
  private resourceStats: Map<string, ResourceStats> = new Map();
  private limits: ResourceLimits;

  constructor(limits: Partial<ResourceLimits> = {}) {
    super();
    this.limits = { ...DEFAULT_RESOURCE_LIMITS, ...limits };
    this.startMemoryMonitoring();
  }

  /**
   * Register a resource for monitoring
   */
  registerResource(resourceId: string, type: 'map' | 'set' | 'array', size: number): void {
    this.resourceStats.set(resourceId, {
      type,
      size,
      lastAccessed: new Date(),
      createdAt: new Date(),
      accessCount: 0
    });

    this.emit('resource_registered', { resourceId, type, size });
  }

  /**
   * Update resource size
   */
  updateResourceSize(resourceId: string, newSize: number): void {
    const stats = this.resourceStats.get(resourceId);
    if (stats) {
      stats.size = newSize;
      stats.lastAccessed = new Date();
      stats.accessCount++;

      // Check size limits
      this.checkSizeLimit(resourceId, stats);
    }
  }

  /**
   * Mark resource as accessed
   */
  recordAccess(resourceId: string): void {
    const stats = this.resourceStats.get(resourceId);
    if (stats) {
      stats.lastAccessed = new Date();
      stats.accessCount++;
    }
  }

  /**
   * Check if cleanup is needed for a resource
   */
  private checkSizeLimit(resourceId: string, stats: ResourceStats): void {
    const limit = this.getSizeLimit(stats.type);
    if (stats.size > limit) {
      this.emit('size_limit_exceeded', { 
        resourceId, 
        currentSize: stats.size, 
        limit,
        type: stats.type 
      });
    }
  }

  /**
   * Get size limit for resource type
   */
  private getSizeLimit(type: 'map' | 'set' | 'array'): number {
    switch (type) {
      case 'map': return this.limits.maxMapSize;
      case 'set': return this.limits.maxSetSize;
      case 'array': return this.limits.maxArrayLength;
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    const checkInterval = this.limits.cleanupIntervalMs;
    
    setInterval(() => {
      const memUsage = process.memoryUsage();
      
      if (memUsage.heapUsed > this.limits.memoryThresholdBytes) {
        this.emit('memory_threshold_exceeded', { 
          current: memUsage.heapUsed,
          threshold: this.limits.memoryThresholdBytes 
        });
      }

      // Check for stale resources
      this.checkStaleResources();
    }, checkInterval);
  }

  /**
   * Check for stale resources that need cleanup
   */
  private checkStaleResources(): void {
    const cutoff = new Date(Date.now() - this.limits.ttlSeconds * 1000);
    
    for (const [resourceId, stats] of this.resourceStats) {
      if (stats.lastAccessed < cutoff) {
        this.emit('resource_stale', { resourceId, stats });
      }
    }
  }

  /**
   * Remove resource from monitoring
   */
  unregisterResource(resourceId: string): void {
    this.resourceStats.delete(resourceId);
    const timer = this.cleanupTimers.get(resourceId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(resourceId);
    }
    
    this.emit('resource_unregistered', { resourceId });
  }

  /**
   * Get resource statistics
   */
  getResourceStats(): Map<string, ResourceStats> {
    return new Map(this.resourceStats);
  }

  /**
   * Schedule cleanup for a resource
   */
  scheduleCleanup(resourceId: string, cleanupFn: () => void, delayMs?: number): void {
    const timer = this.cleanupTimers.get(resourceId);
    if (timer) {
      clearTimeout(timer);
    }

    const timeout = setTimeout(() => {
      try {
        cleanupFn();
        this.unregisterResource(resourceId);
        logger.debug('Scheduled cleanup completed', { resourceId });
      } catch (error) {
        logger.error('Cleanup function failed', { resourceId, error });
      }
    }, delayMs || this.limits.cleanupIntervalMs);

    this.cleanupTimers.set(resourceId, timeout);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Clear all timers
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();
    this.resourceStats.clear();
    
    logger.info('ResourceMonitor cleanup completed');
  }
}

/**
 * Resource statistics for a monitored resource
 */
interface ResourceStats {
  type: 'map' | 'set' | 'array';
  size: number;
  lastAccessed: Date;
  createdAt: Date;
  accessCount: number;
}

/**
 * Managed Map with automatic cleanup and size limits
 */
export class ManagedMap<K, V> extends Map<K, V> {
  private monitor: ResourceMonitor;
  private resourceId: string;
  private maxSize: number;
  private ttlMs: number;
  private accessTimes: Map<K, number> = new Map();

  constructor(
    resourceId: string,
    monitor: ResourceMonitor,
    options: {
      maxSize?: number;
      ttlMs?: number;
    } = {}
  ) {
    super();
    this.monitor = monitor;
    this.resourceId = resourceId;
    this.maxSize = options.maxSize || DEFAULT_RESOURCE_LIMITS.maxMapSize;
    this.ttlMs = options.ttlMs || DEFAULT_RESOURCE_LIMITS.ttlSeconds * 1000;

    monitor.registerResource(resourceId, 'map', 0);
    
    // Setup cleanup handlers
    monitor.on('size_limit_exceeded', (data) => {
      if (data.resourceId === resourceId) {
        this.performSizeBasedCleanup();
      }
    });

    monitor.on('resource_stale', (data) => {
      if (data.resourceId === resourceId) {
        this.performTTLBasedCleanup();
      }
    });
  }

  /**
   * Set with automatic monitoring
   */
  set(key: K, value: V): this {
    super.set(key, value);
    this.accessTimes.set(key, Date.now());
    this.monitor.updateResourceSize(this.resourceId, this.size);
    
    // Check size limit
    if (this.size > this.maxSize) {
      this.performSizeBasedCleanup();
    }
    
    return this;
  }

  /**
   * Get with access tracking
   */
  get(key: K): V | undefined {
    const value = super.get(key);
    if (value !== undefined) {
      this.accessTimes.set(key, Date.now());
      this.monitor.recordAccess(this.resourceId);
    }
    return value;
  }

  /**
   * Delete with monitoring update
   */
  delete(key: K): boolean {
    const deleted = super.delete(key);
    if (deleted) {
      this.accessTimes.delete(key);
      this.monitor.updateResourceSize(this.resourceId, this.size);
    }
    return deleted;
  }

  /**
   * Clear with monitoring update
   */
  clear(): void {
    super.clear();
    this.accessTimes.clear();
    this.monitor.updateResourceSize(this.resourceId, 0);
  }

  /**
   * Perform cleanup based on size limit
   */
  private performSizeBasedCleanup(): void {
    const targetSize = Math.floor(this.maxSize * 0.8); // Remove 20% of items
    const itemsToRemove = this.size - targetSize;
    
    if (itemsToRemove <= 0) return;

    // Sort by access time (LRU)
    const sortedEntries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]);

    for (let i = 0; i < itemsToRemove && i < sortedEntries.length; i++) {
      const [key] = sortedEntries[i];
      this.delete(key);
    }

    logger.debug('Size-based cleanup performed', { 
      resourceId: this.resourceId, 
      removedItems: itemsToRemove,
      newSize: this.size 
    });
  }

  /**
   * Perform cleanup based on TTL
   */
  private performTTLBasedCleanup(): void {
    const cutoff = Date.now() - this.ttlMs;
    let removedCount = 0;

    for (const [key, accessTime] of this.accessTimes) {
      if (accessTime < cutoff) {
        this.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug('TTL-based cleanup performed', { 
        resourceId: this.resourceId, 
        removedItems: removedCount,
        newSize: this.size 
      });
    }
  }

  /**
   * Manual cleanup
   */
  cleanup(): void {
    this.clear();
    this.monitor.unregisterResource(this.resourceId);
  }
}

/**
 * Managed Set with automatic cleanup and size limits
 */
export class ManagedSet<T> extends Set<T> {
  private monitor: ResourceMonitor;
  private resourceId: string;
  private maxSize: number;
  private ttlMs: number;
  private accessTimes: Map<T, number> = new Map();

  constructor(
    resourceId: string,
    monitor: ResourceMonitor,
    options: {
      maxSize?: number;
      ttlMs?: number;
    } = {}
  ) {
    super();
    this.monitor = monitor;
    this.resourceId = resourceId;
    this.maxSize = options.maxSize || DEFAULT_RESOURCE_LIMITS.maxSetSize;
    this.ttlMs = options.ttlMs || DEFAULT_RESOURCE_LIMITS.ttlSeconds * 1000;

    monitor.registerResource(resourceId, 'set', 0);
    
    // Setup cleanup handlers
    monitor.on('size_limit_exceeded', (data) => {
      if (data.resourceId === resourceId) {
        this.performSizeBasedCleanup();
      }
    });

    monitor.on('resource_stale', (data) => {
      if (data.resourceId === resourceId) {
        this.performTTLBasedCleanup();
      }
    });
  }

  /**
   * Add with automatic monitoring
   */
  add(value: T): this {
    super.add(value);
    this.accessTimes.set(value, Date.now());
    this.monitor.updateResourceSize(this.resourceId, this.size);
    
    // Check size limit
    if (this.size > this.maxSize) {
      this.performSizeBasedCleanup();
    }
    
    return this;
  }

  /**
   * Has with access tracking
   */
  has(value: T): boolean {
    const exists = super.has(value);
    if (exists) {
      this.accessTimes.set(value, Date.now());
      this.monitor.recordAccess(this.resourceId);
    }
    return exists;
  }

  /**
   * Delete with monitoring update
   */
  delete(value: T): boolean {
    const deleted = super.delete(value);
    if (deleted) {
      this.accessTimes.delete(value);
      this.monitor.updateResourceSize(this.resourceId, this.size);
    }
    return deleted;
  }

  /**
   * Clear with monitoring update
   */
  clear(): void {
    super.clear();
    this.accessTimes.clear();
    this.monitor.updateResourceSize(this.resourceId, 0);
  }

  /**
   * Perform cleanup based on size limit
   */
  private performSizeBasedCleanup(): void {
    const targetSize = Math.floor(this.maxSize * 0.8);
    const itemsToRemove = this.size - targetSize;
    
    if (itemsToRemove <= 0) return;

    // Sort by access time (LRU)
    const sortedEntries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]);

    for (let i = 0; i < itemsToRemove && i < sortedEntries.length; i++) {
      const [value] = sortedEntries[i];
      this.delete(value);
    }

    logger.debug('Size-based cleanup performed', { 
      resourceId: this.resourceId, 
      removedItems: itemsToRemove,
      newSize: this.size 
    });
  }

  /**
   * Perform cleanup based on TTL
   */
  private performTTLBasedCleanup(): void {
    const cutoff = Date.now() - this.ttlMs;
    let removedCount = 0;

    for (const [value, accessTime] of this.accessTimes) {
      if (accessTime < cutoff) {
        this.delete(value);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug('TTL-based cleanup performed', { 
        resourceId: this.resourceId, 
        removedItems: removedCount,
        newSize: this.size 
      });
    }
  }

  /**
   * Manual cleanup
   */
  cleanup(): void {
    this.clear();
    this.monitor.unregisterResource(this.resourceId);
  }
}

/**
 * Managed Array with automatic rotation and size limits
 */
export class ManagedArray<T> extends Array<T> {
  private monitor: ResourceMonitor;
  private resourceId: string;
  private maxLength: number;
  private rotationSize: number;

  constructor(
    resourceId: string,
    monitor: ResourceMonitor,
    options: {
      maxLength?: number;
      rotationSize?: number;
    } = {}
  ) {
    super();
    this.monitor = monitor;
    this.resourceId = resourceId;
    this.maxLength = options.maxLength || DEFAULT_RESOURCE_LIMITS.maxArrayLength;
    this.rotationSize = options.rotationSize || DEFAULT_RESOURCE_LIMITS.rotationSize;

    monitor.registerResource(resourceId, 'array', 0);
    
    // Setup cleanup handlers
    monitor.on('size_limit_exceeded', (data) => {
      if (data.resourceId === resourceId) {
        this.performRotation();
      }
    });
  }

  /**
   * Push with automatic monitoring and rotation
   */
  push(...items: T[]): number {
    const newLength = super.push(...items);
    this.monitor.updateResourceSize(this.resourceId, newLength);
    
    // Check size limit and rotate if necessary
    if (newLength > this.maxLength) {
      this.performRotation();
    }
    
    return this.length;
  }

  /**
   * Unshift with automatic monitoring and rotation
   */
  unshift(...items: T[]): number {
    const newLength = super.unshift(...items);
    this.monitor.updateResourceSize(this.resourceId, newLength);
    
    // Check size limit and rotate if necessary
    if (newLength > this.maxLength) {
      this.performRotation();
    }
    
    return this.length;
  }

  /**
   * Splice with monitoring update
   */
  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    const removed = super.splice(start, deleteCount, ...items);
    this.monitor.updateResourceSize(this.resourceId, this.length);
    return removed;
  }

  /**
   * Access with monitoring
   */
  at(index: number): T | undefined {
    const value = super.at(index);
    if (value !== undefined) {
      this.monitor.recordAccess(this.resourceId);
    }
    return value;
  }

  /**
   * Perform rotation to keep array within limits
   */
  private performRotation(): void {
    if (this.length > this.maxLength) {
      const itemsToRemove = this.length - this.rotationSize;
      this.splice(0, itemsToRemove);
      
      logger.debug('Array rotation performed', { 
        resourceId: this.resourceId, 
        removedItems: itemsToRemove,
        newLength: this.length 
      });
    }
  }

  /**
   * Manual cleanup
   */
  cleanup(): void {
    this.length = 0;
    this.monitor.unregisterResource(this.resourceId);
  }
}

/**
 * Process manager for LSP servers and other child processes
 */
export class ProcessManager extends EventEmitter {
  private processes: Map<string, ProcessInfo> = new Map();
  private cleanupTimeout: number = 30000; // 30 seconds

  /**
   * Register a process for management
   */
  registerProcess(processId: string, process: any, options: ProcessOptions = {}): void {
    const processInfo: ProcessInfo = {
      process,
      startTime: new Date(),
      lastActivity: new Date(),
      restartCount: 0,
      options: {
        autoRestart: options.autoRestart || false,
        maxRestarts: options.maxRestarts || 3,
        timeout: options.timeout || this.cleanupTimeout
      }
    };

    this.processes.set(processId, processInfo);

    // Setup process event handlers
    this.setupProcessHandlers(processId, processInfo);

    logger.info('Process registered', { processId, pid: process.pid });
  }

  /**
   * Setup event handlers for a process
   */
  private setupProcessHandlers(processId: string, processInfo: ProcessInfo): void {
    const { process } = processInfo;

    process.on('exit', (code: number, signal: string) => {
      logger.info('Process exited', { processId, code, signal });
      this.handleProcessExit(processId, code, signal);
    });

    process.on('error', (error: Error) => {
      logger.error('Process error', { processId, error: error.message });
      this.emit('process_error', { processId, error });
    });

    process.on('disconnect', () => {
      logger.info('Process disconnected', { processId });
      this.emit('process_disconnected', { processId });
    });

    // Update activity tracking for stdio streams
    if (process.stdout) {
      process.stdout.on('data', () => {
        processInfo.lastActivity = new Date();
      });
    }

    if (process.stderr) {
      process.stderr.on('data', () => {
        processInfo.lastActivity = new Date();
      });
    }
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(processId: string, code: number, signal: string): void {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    this.emit('process_exit', { processId, code, signal });

    // Auto-restart if enabled and within limits
    if (processInfo.options.autoRestart && 
        processInfo.restartCount < processInfo.options.maxRestarts &&
        code !== 0) {
      
      processInfo.restartCount++;
      logger.info('Auto-restarting process', { 
        processId, 
        restartCount: processInfo.restartCount 
      });
      
      this.emit('process_restart', { processId, restartCount: processInfo.restartCount });
    } else {
      // Remove from tracking
      this.processes.delete(processId);
      this.emit('process_removed', { processId });
    }
  }

  /**
   * Terminate a process gracefully
   */
  async terminateProcess(processId: string, force: boolean = false): Promise<boolean> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return false;

    const { process } = processInfo;

    try {
      if (force) {
        process.kill('SIGKILL');
      } else {
        // Try graceful shutdown first
        process.kill('SIGTERM');
        
        // Wait for graceful shutdown or force kill
        const timeout = setTimeout(() => {
          if (!process.killed) {
            logger.warn('Force killing process after timeout', { processId });
            process.kill('SIGKILL');
          }
        }, processInfo.options.timeout);

        // Clean up timeout if process exits gracefully
        process.once('exit', () => {
          clearTimeout(timeout);
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to terminate process', { processId, error });
      return false;
    }
  }

  /**
   * Get process information
   */
  getProcessInfo(processId: string): ProcessInfo | undefined {
    return this.processes.get(processId);
  }

  /**
   * Get all managed processes
   */
  getAllProcesses(): Map<string, ProcessInfo> {
    return new Map(this.processes);
  }

  /**
   * Check for stale processes
   */
  checkStaleProcesses(maxIdleTimeMs: number = 300000): string[] {
    const cutoff = new Date(Date.now() - maxIdleTimeMs);
    const staleProcesses: string[] = [];

    for (const [processId, processInfo] of this.processes) {
      if (processInfo.lastActivity < cutoff) {
        staleProcesses.push(processId);
      }
    }

    return staleProcesses;
  }

  /**
   * Cleanup all processes
   */
  async cleanup(): Promise<void> {
    const terminationPromises: Promise<boolean>[] = [];

    for (const processId of this.processes.keys()) {
      terminationPromises.push(this.terminateProcess(processId, false));
    }

    // Wait for all processes to terminate
    await Promise.all(terminationPromises);

    // Force kill any remaining processes
    for (const processId of this.processes.keys()) {
      await this.terminateProcess(processId, true);
    }

    this.processes.clear();
    logger.info('ProcessManager cleanup completed');
  }
}

/**
 * Process information tracked by ProcessManager
 */
interface ProcessInfo {
  process: any;
  startTime: Date;
  lastActivity: Date;
  restartCount: number;
  options: ProcessOptions;
}

/**
 * Options for process management
 */
interface ProcessOptions {
  autoRestart?: boolean;
  maxRestarts?: number;
  timeout?: number;
}

/**
 * Cache invalidation manager with intelligent policies
 */
export class CacheManager extends EventEmitter {
  private caches: Map<string, CacheInfo> = new Map();
  private invalidationRules: Map<string, InvalidationRule[]> = new Map();

  /**
   * Register a cache for management
   */
  registerCache(cacheId: string, cache: any, options: CacheOptions = {}): void {
    const cacheInfo: CacheInfo = {
      cache,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      size: 0,
      options: {
        ttlMs: options.ttlMs || 3600000, // 1 hour
        maxSize: options.maxSize || 1000,
        invalidateOnMemoryPressure: options.invalidateOnMemoryPressure || true
      }
    };

    this.caches.set(cacheId, cacheInfo);
    
    // Setup TTL cleanup
    setTimeout(() => {
      this.invalidateCache(cacheId);
    }, cacheInfo.options.ttlMs);

    logger.debug('Cache registered', { cacheId });
  }

  /**
   * Add invalidation rule
   */
  addInvalidationRule(cacheId: string, rule: InvalidationRule): void {
    if (!this.invalidationRules.has(cacheId)) {
      this.invalidationRules.set(cacheId, []);
    }
    
    this.invalidationRules.get(cacheId)!.push(rule);
  }

  /**
   * Invalidate cache by ID
   */
  invalidateCache(cacheId: string): boolean {
    const cacheInfo = this.caches.get(cacheId);
    if (!cacheInfo) return false;

    try {
      // Call cache-specific cleanup method if available
      if (typeof cacheInfo.cache.clear === 'function') {
        cacheInfo.cache.clear();
      } else if (typeof cacheInfo.cache.cleanup === 'function') {
        cacheInfo.cache.cleanup();
      }

      this.caches.delete(cacheId);
      this.invalidationRules.delete(cacheId);
      
      this.emit('cache_invalidated', { cacheId });
      logger.debug('Cache invalidated', { cacheId });
      
      return true;
    } catch (error) {
      logger.error('Cache invalidation failed', { cacheId, error });
      return false;
    }
  }

  /**
   * Invalidate caches by pattern
   */
  invalidateCachesByPattern(pattern: RegExp): number {
    let invalidatedCount = 0;
    
    for (const cacheId of this.caches.keys()) {
      if (pattern.test(cacheId)) {
        if (this.invalidateCache(cacheId)) {
          invalidatedCount++;
        }
      }
    }

    return invalidatedCount;
  }

  /**
   * Invalidate caches by tags
   */
  invalidateCachesByTag(tag: string): number {
    let invalidatedCount = 0;
    
    for (const [cacheId, rules] of this.invalidationRules) {
      const hasTag = rules.some(rule => 
        rule.type === 'tag' && rule.value === tag
      );
      
      if (hasTag && this.invalidateCache(cacheId)) {
        invalidatedCount++;
      }
    }

    return invalidatedCount;
  }

  /**
   * Handle memory pressure by invalidating least recently used caches
   */
  handleMemoryPressure(): number {
    const eligibleCaches = Array.from(this.caches.entries())
      .filter(([, info]) => info.options.invalidateOnMemoryPressure)
      .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());

    const toInvalidate = Math.ceil(eligibleCaches.length * 0.3); // Invalidate 30%
    let invalidatedCount = 0;

    for (let i = 0; i < toInvalidate && i < eligibleCaches.length; i++) {
      const [cacheId] = eligibleCaches[i];
      if (this.invalidateCache(cacheId)) {
        invalidatedCount++;
      }
    }

    this.emit('memory_pressure_cleanup', { invalidatedCount });
    return invalidatedCount;
  }

  /**
   * Update cache access
   */
  recordCacheAccess(cacheId: string, size?: number): void {
    const cacheInfo = this.caches.get(cacheId);
    if (cacheInfo) {
      cacheInfo.lastAccessed = new Date();
      cacheInfo.accessCount++;
      if (size !== undefined) {
        cacheInfo.size = size;
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    const stats = {
      totalCaches: this.caches.size,
      totalSize: 0,
      oldestCache: null as string | null,
      newestCache: null as string | null,
      mostAccessed: null as string | null,
      cacheDetails: {} as any
    };

    let oldestTime = Date.now();
    let newestTime = 0;
    let maxAccess = 0;

    for (const [cacheId, info] of this.caches) {
      stats.totalSize += info.size;
      stats.cacheDetails[cacheId] = {
        size: info.size,
        accessCount: info.accessCount,
        age: Date.now() - info.createdAt.getTime(),
        lastAccessed: info.lastAccessed
      };

      if (info.createdAt.getTime() < oldestTime) {
        oldestTime = info.createdAt.getTime();
        stats.oldestCache = cacheId;
      }

      if (info.createdAt.getTime() > newestTime) {
        newestTime = info.createdAt.getTime();
        stats.newestCache = cacheId;
      }

      if (info.accessCount > maxAccess) {
        maxAccess = info.accessCount;
        stats.mostAccessed = cacheId;
      }
    }

    return stats;
  }

  /**
   * Cleanup all caches
   */
  cleanup(): void {
    for (const cacheId of this.caches.keys()) {
      this.invalidateCache(cacheId);
    }
    
    logger.info('CacheManager cleanup completed');
  }
}

/**
 * Cache information tracked by CacheManager
 */
interface CacheInfo {
  cache: any;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  options: CacheOptions;
}

/**
 * Options for cache management
 */
interface CacheOptions {
  ttlMs?: number;
  maxSize?: number;
  invalidateOnMemoryPressure?: boolean;
}

/**
 * Cache invalidation rule
 */
interface InvalidationRule {
  type: 'tag' | 'pattern' | 'time' | 'dependency';
  value: string | number | RegExp;
}