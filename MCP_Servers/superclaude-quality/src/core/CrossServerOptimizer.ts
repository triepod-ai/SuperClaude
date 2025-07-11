import {
  CrossServerCache,
  CrossServerOptimizationInput,
  CrossServerIntegrationError,
  ValidationResult,
  SemanticAnalysis
} from '../types/index.js';

/**
 * Cross-server optimization and caching system
 */
export class CrossServerOptimizer {
  private cache: Map<string, CrossServerCache> = new Map();
  private serverEndpoints: Map<string, string> = new Map();
  private optimizationStrategies: Map<string, Function> = new Map();

  constructor() {
    this.initializeServerEndpoints();
    this.initializeOptimizationStrategies();
    this.startCacheCleanup();
  }

  /**
   * Optimize operation across multiple MCP servers
   */
  async optimizeOperation(input: CrossServerOptimizationInput): Promise<{
    results: Map<string, any>;
    cacheHits: number;
    executionTime: number;
    optimizationApplied: string[];
  }> {
    const startTime = Date.now();
    const results = new Map<string, any>();
    let cacheHits = 0;
    const optimizationApplied: string[] = [];

    try {
      // Check cache first
      const cacheResults = await this.checkCacheForOperation(input);
      cacheHits = cacheResults.size;
      results.set('cached', cacheResults);

      if (cacheHits > 0) {
        optimizationApplied.push('cache_utilization');
      }

      // Determine which servers need to be called
      const serversToCall = input.targetServers.filter(server => 
        !cacheResults.has(server)
      );

      if (serversToCall.length > 0) {
        // Apply optimization strategy
        const strategy = this.optimizationStrategies.get(input.operationType);
        if (strategy && input.parallelization !== false) {
          const optimizedResults = await strategy(serversToCall, input);
          for (const [key, value] of optimizedResults) {
            results.set(key, value);
          }
          optimizationApplied.push('parallel_execution');
        } else {
          // Sequential execution
          for (const server of serversToCall) {
            const result = await this.callServer(server, input);
            results.set(server, result);
          }
          optimizationApplied.push('sequential_execution');
        }

        // Cache results based on strategy
        if (input.cacheStrategy !== 'disabled') {
          await this.cacheResults(results, input);
          optimizationApplied.push('result_caching');
        }
      }

      return {
        results,
        cacheHits,
        executionTime: Date.now() - startTime,
        optimizationApplied
      };
    } catch (error) {
      throw new CrossServerIntegrationError(
        `Cross-server optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        input.targetServers.join(','),
        input.operationType
      );
    }
  }

  /**
   * Cache validation results for future use
   */
  async cacheValidationResults(
    filePath: string,
    results: ValidationResult[],
    ttl: number = 3600000
  ): Promise<void> {
    const cacheKey = this.generateCacheKey('validation', filePath);
    
    const cacheEntry: CrossServerCache = {
      key: cacheKey,
      data: {
        results,
        fileHash: await this.calculateFileHash(filePath),
        timestamp: Date.now()
      },
      server: 'superclaude-quality',
      expiresAt: new Date(Date.now() + ttl),
      tags: ['validation', 'quality']
    };

    this.cache.set(cacheKey, cacheEntry);
  }

  /**
   * Cache semantic analysis results
   */
  async cacheSemanticAnalysis(
    filePath: string,
    analysis: SemanticAnalysis,
    ttl: number = 3600000
  ): Promise<void> {
    const cacheKey = this.generateCacheKey('semantic', filePath);
    
    const cacheEntry: CrossServerCache = {
      key: cacheKey,
      data: {
        analysis,
        fileHash: await this.calculateFileHash(filePath),
        timestamp: Date.now()
      },
      server: 'superclaude-quality',
      expiresAt: new Date(Date.now() + ttl),
      tags: ['semantic', 'analysis']
    };

    this.cache.set(cacheKey, cacheEntry);
  }

  /**
   * Get cached validation results
   */
  async getCachedValidationResults(filePath: string): Promise<ValidationResult[] | null> {
    const cacheKey = this.generateCacheKey('validation', filePath);
    const cached = this.cache.get(cacheKey);
    
    if (!cached || this.isCacheExpired(cached)) {
      return null;
    }

    // Verify file hasn't changed
    const currentHash = await this.calculateFileHash(filePath);
    if (currentHash !== cached.data.fileHash) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data.results;
  }

  /**
   * Get cached semantic analysis
   */
  async getCachedSemanticAnalysis(filePath: string): Promise<SemanticAnalysis | null> {
    const cacheKey = this.generateCacheKey('semantic', filePath);
    const cached = this.cache.get(cacheKey);
    
    if (!cached || this.isCacheExpired(cached)) {
      return null;
    }

    // Verify file hasn't changed
    const currentHash = await this.calculateFileHash(filePath);
    if (currentHash !== cached.data.fileHash) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data.analysis;
  }

  /**
   * Coordinate with superclaude-orchestrator for wave management
   */
  async coordinateWithOrchestrator(operation: {
    type: 'quality_validation' | 'semantic_analysis';
    scope: 'file' | 'project';
    priority: 'low' | 'medium' | 'high' | 'critical';
    metadata: any;
  }): Promise<{
    waveId?: string;
    priority: number;
    resourceAllocation: {
      cpu: number;
      memory: number;
      concurrent: number;
    };
  }> {
    try {
      const orchestratorResult = await this.callServer('superclaude-orchestrator', {
        operation: 'coordinate_quality_validation',
        data: operation
      });

      return orchestratorResult || {
        priority: 50,
        resourceAllocation: {
          cpu: 1,
          memory: 512,
          concurrent: 3
        }
      };
    } catch (error) {
      // Fallback to default allocation
      return {
        priority: 50,
        resourceAllocation: {
          cpu: 1,
          memory: 512,
          concurrent: 3
        }
      };
    }
  }

  /**
   * Integrate with superclaude-code for semantic analysis
   */
  async integrateWithCodeServer(operation: {
    filePath: string;
    operation: 'parse' | 'analyze' | 'extract_symbols';
    language?: string;
  }): Promise<any> {
    try {
      return await this.callServer('superclaude-code', {
        operation: operation.operation,
        filePath: operation.filePath,
        language: operation.language
      });
    } catch (error) {
      throw new CrossServerIntegrationError(
        `Failed to integrate with code server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'superclaude-code',
        operation.operation
      );
    }
  }

  /**
   * Share quality metrics with superclaude-tasks
   */
  async shareQualityMetrics(metrics: {
    filePath: string;
    overallScore: number;
    issues: Array<{ level: string; count: number }>;
    recommendations: string[];
  }): Promise<void> {
    try {
      await this.callServer('superclaude-tasks', {
        operation: 'update_quality_metrics',
        data: metrics
      });
    } catch (error) {
      // Non-critical failure, log and continue
      console.warn('Failed to share quality metrics with tasks server:', error);
    }
  }

  /**
   * Optimize batch validation operations
   */
  async optimizeBatchValidation(
    files: string[],
    options: {
      maxConcurrency?: number;
      prioritizeBy?: 'size' | 'complexity' | 'modification_time';
      useCache?: boolean;
    } = {}
  ): Promise<{
    optimizedOrder: string[];
    estimatedTime: number;
    cacheUtilization: number;
  }> {
    const maxConcurrency = options.maxConcurrency || 5;
    let cacheUtilization = 0;

    // Check cache for existing results
    if (options.useCache !== false) {
      for (const file of files) {
        const cached = await this.getCachedValidationResults(file);
        if (cached) {
          cacheUtilization++;
        }
      }
    }

    // Optimize file order based on priority
    let optimizedOrder = [...files];
    
    if (options.prioritizeBy) {
      optimizedOrder = await this.prioritizeFiles(files, options.prioritizeBy);
    }

    // Estimate execution time
    const estimatedTime = this.estimateExecutionTime(optimizedOrder, maxConcurrency, cacheUtilization);

    return {
      optimizedOrder,
      estimatedTime,
      cacheUtilization: cacheUtilization / files.length
    };
  }

  // ==================== PRIVATE METHODS ====================

  private initializeServerEndpoints(): void {
    this.serverEndpoints.set('superclaude-orchestrator', 'http://localhost:3001');
    this.serverEndpoints.set('superclaude-code', 'http://localhost:3002');
    this.serverEndpoints.set('superclaude-tasks', 'http://localhost:3003');
    this.serverEndpoints.set('superclaude-performance', 'http://localhost:3004');
  }

  private initializeOptimizationStrategies(): void {
    // Parallel validation strategy
    this.optimizationStrategies.set('validation', async (servers: string[], input: any) => {
      const promises = servers.map(server => this.callServer(server, input));
      const results = await Promise.allSettled(promises);
      
      const successfulResults = new Map();
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.set(servers[index], result.value);
        }
      });
      
      return successfulResults;
    });

    // Semantic analysis strategy
    this.optimizationStrategies.set('semantic_analysis', async (servers: string[], input: any) => {
      // Sequential for semantic analysis to maintain consistency
      const results = new Map();
      for (const server of servers) {
        try {
          const result = await this.callServer(server, input);
          results.set(server, result);
        } catch (error) {
          console.warn(`Failed to call ${server}:`, error);
        }
      }
      return results;
    });
  }

  private async checkCacheForOperation(input: CrossServerOptimizationInput): Promise<Map<string, any>> {
    const cacheResults = new Map<string, any>();
    
    if (input.cacheStrategy === 'disabled') {
      return cacheResults;
    }

    for (const server of input.targetServers) {
      const cacheKey = this.generateCacheKey(input.operationType, server);
      const cached = this.cache.get(cacheKey);
      
      if (cached && !this.isCacheExpired(cached)) {
        cacheResults.set(server, cached.data);
      }
    }

    return cacheResults;
  }

  private async callServer(server: string, data: any): Promise<any> {
    const endpoint = this.serverEndpoints.get(server);
    
    if (!endpoint) {
      throw new CrossServerIntegrationError(`Unknown server: ${server}`, server);
    }

    // Simulate server call (in real implementation, this would be HTTP request)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.95) { // 5% failure rate for simulation
          reject(new Error(`Server ${server} temporarily unavailable`));
        } else {
          resolve({ server, data, timestamp: Date.now() });
        }
      }, Math.random() * 100 + 50); // 50-150ms simulated latency
    });
  }

  private async cacheResults(results: Map<string, any>, input: CrossServerOptimizationInput): Promise<void> {
    const ttl = input.cacheStrategy === 'aggressive' ? 7200000 : 3600000; // 2h vs 1h
    
    for (const [server, result] of results) {
      if (server === 'cached') continue; // Skip already cached results
      
      const cacheKey = this.generateCacheKey(input.operationType, server);
      const cacheEntry: CrossServerCache = {
        key: cacheKey,
        data: result,
        server: 'superclaude-quality',
        expiresAt: new Date(Date.now() + ttl),
        tags: [input.operationType, server]
      };
      
      this.cache.set(cacheKey, cacheEntry);
    }
  }

  private generateCacheKey(operation: string, identifier: string): string {
    return `${operation}:${identifier}:${Date.now().toString(36)}`;
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const crypto = await import('crypto');
      const fs = await import('fs');
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return `error-${Date.now()}`;
    }
  }

  private isCacheExpired(cache: CrossServerCache): boolean {
    return cache.expiresAt.getTime() < Date.now();
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, cache] of this.cache) {
        if (cache.expiresAt.getTime() < now) {
          this.cache.delete(key);
        }
      }
    }, 600000); // 10 minutes
  }

  private async prioritizeFiles(files: string[], prioritizeBy: string): Promise<string[]> {
    const fs = await import('fs');
    const fileStats = await Promise.all(
      files.map(async file => {
        try {
          const stat = await fs.promises.stat(file);
          return {
            file,
            size: stat.size,
            mtime: stat.mtime.getTime(),
            complexity: this.estimateFileComplexity(file)
          };
        } catch (error) {
          return {
            file,
            size: 0,
            mtime: 0,
            complexity: 0
          };
        }
      })
    );

    return fileStats
      .sort((a, b) => {
        switch (prioritizeBy) {
          case 'size':
            return b.size - a.size; // Larger files first
          case 'complexity':
            return b.complexity - a.complexity; // More complex files first
          case 'modification_time':
            return b.mtime - a.mtime; // Recently modified files first
          default:
            return 0;
        }
      })
      .map(stat => stat.file);
  }

  private estimateFileComplexity(filePath: string): number {
    // Simple complexity estimation based on file extension and size
    const path = require('path');
    const ext = path.extname(filePath);
    
    const complexityMap: Record<string, number> = {
      '.ts': 3,
      '.tsx': 4,
      '.js': 2,
      '.jsx': 3,
      '.py': 2,
      '.java': 3,
      '.cpp': 4,
      '.c': 3
    };

    return complexityMap[ext] || 1;
  }

  private estimateExecutionTime(
    files: string[],
    maxConcurrency: number,
    cacheUtilization: number
  ): number {
    const avgFileValidationTime = 2000; // 2 seconds per file
    const uncachedFiles = Math.ceil(files.length * (1 - cacheUtilization));
    const batches = Math.ceil(uncachedFiles / maxConcurrency);
    
    return batches * avgFileValidationTime;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    hitRate: number;
    memoryUsage: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const entries = Array.from(this.cache.values());
    
    return {
      totalEntries: entries.length,
      hitRate: 0, // Would need to track hits vs misses
      memoryUsage: JSON.stringify(entries).length, // Rough estimation
      oldestEntry: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.expiresAt.getTime()))) : null,
      newestEntry: entries.length > 0 ? 
        new Date(Math.max(...entries.map(e => e.expiresAt.getTime()))) : null
    };
  }

  /**
   * Clear cache by tags
   */
  clearCacheByTags(tags: string[]): number {
    let cleared = 0;
    
    for (const [key, cache] of this.cache) {
      if (tags.some(tag => cache.tags.includes(tag))) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  /**
   * Invalidate cache for specific file
   */
  invalidateFileCache(filePath: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, cache] of this.cache) {
      if (cache.key.includes(filePath) || 
          (cache.data.filePath && cache.data.filePath === filePath)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}