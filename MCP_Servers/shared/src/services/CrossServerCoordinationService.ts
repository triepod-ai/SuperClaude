import { logger } from '../utils/logger.js';
import { Task, PerformanceMetrics, ServerConfig } from '../types/common.js';

/**
 * Server status information
 */
export interface ServerStatus {
  id: string;
  name: string;
  version: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  load: number; // 0-1 scale
  capabilities: string[];
  lastHeartbeat: Date;
  metrics: PerformanceMetrics;
}

/**
 * Cross-server task
 */
export interface CrossServerTask {
  id: string;
  type: 'analysis' | 'validation' | 'processing' | 'coordination';
  payload: any;
  targetServers: string[];
  requiredCapabilities: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeout: number;
  createdAt: Date;
  completedAt?: Date;
  results: Map<string, any>;
  errors: Map<string, Error>;
}

/**
 * Coordination strategy
 */
export interface CoordinationStrategy {
  name: string;
  description: string;
  execute: (task: CrossServerTask, servers: ServerStatus[]) => Promise<any>;
  rollback?: (task: CrossServerTask, partialResults: Map<string, any>) => Promise<void>;
}

/**
 * Server selection criteria
 */
export interface ServerSelectionCriteria {
  requiredCapabilities: string[];
  maxLoad?: number;
  preferredServers?: string[];
  excludeServers?: string[];
  loadBalancing?: 'round-robin' | 'least-loaded' | 'random' | 'capability-based';
}

/**
 * Cross-server coordination result
 */
export interface CoordinationResult {
  taskId: string;
  success: boolean;
  results: Map<string, any>;
  errors: Map<string, Error>;
  executionTime: number;
  serversUsed: string[];
  failedServers: string[];
}

/**
 * Cross-server coordination service
 * Manages communication and task distribution between MCP servers
 */
export class CrossServerCoordinationService {
  private servers: Map<string, ServerStatus> = new Map();
  private tasks: Map<string, CrossServerTask> = new Map();
  private strategies: Map<string, CoordinationStrategy> = new Map();
  private readonly heartbeatInterval = 30000; // 30 seconds
  private readonly taskTimeout = 300000; // 5 minutes

  constructor() {
    this.initializeDefaultStrategies();
    this.startHeartbeatMonitoring();
  }

  /**
   * Register a server with the coordination service
   */
  registerServer(config: ServerConfig & { id: string }): void {
    const status: ServerStatus = {
      id: config.id,
      name: config.name,
      version: config.version,
      status: 'online',
      load: 0,
      capabilities: config.capabilities,
      lastHeartbeat: new Date(),
      metrics: {
        executionTime: 0,
        tokenUsage: 0,
        successRate: 1,
        timestamp: new Date()
      }
    };

    this.servers.set(config.id, status);
    
    logger.info('Server registered for coordination', {
      serverId: config.id,
      name: config.name,
      capabilities: config.capabilities
    });
  }

  /**
   * Unregister a server
   */
  unregisterServer(serverId: string): void {
    this.servers.delete(serverId);
    logger.info('Server unregistered from coordination', { serverId });
  }

  /**
   * Update server status
   */
  updateServerStatus(serverId: string, update: Partial<ServerStatus>): void {
    const server = this.servers.get(serverId);
    if (server) {
      Object.assign(server, update, { lastHeartbeat: new Date() });
      logger.debug('Server status updated', { serverId, status: server.status, load: server.load });
    }
  }

  /**
   * Execute a cross-server task
   */
  async executeTask(
    type: CrossServerTask['type'],
    payload: any,
    options: {
      targetServers?: string[];
      requiredCapabilities?: string[];
      strategy?: string;
      timeout?: number;
      priority?: CrossServerTask['priority'];
    } = {}
  ): Promise<CoordinationResult> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();

    const task: CrossServerTask = {
      id: taskId,
      type,
      payload,
      targetServers: options.targetServers || [],
      requiredCapabilities: options.requiredCapabilities || [],
      priority: options.priority || 'medium',
      timeout: options.timeout || this.taskTimeout,
      createdAt: new Date(),
      results: new Map(),
      errors: new Map()
    };

    this.tasks.set(taskId, task);

    try {
      logger.info('Starting cross-server task', {
        taskId,
        type,
        targetServers: task.targetServers,
        capabilities: task.requiredCapabilities
      });

      // Select appropriate servers
      const selectedServers = this.selectServers({
        requiredCapabilities: task.requiredCapabilities,
        preferredServers: task.targetServers
      });

      if (selectedServers.length === 0) {
        throw new Error('No suitable servers available for task execution');
      }

      // Execute using strategy
      const strategyName = options.strategy || this.getDefaultStrategy(type);
      const strategy = this.strategies.get(strategyName);
      
      if (!strategy) {
        throw new Error(`Unknown coordination strategy: ${strategyName}`);
      }

      await strategy.execute(task, selectedServers);

      const result: CoordinationResult = {
        taskId,
        success: task.errors.size === 0,
        results: task.results,
        errors: task.errors,
        executionTime: Date.now() - startTime,
        serversUsed: selectedServers.map(s => s.id),
        failedServers: Array.from(task.errors.keys())
      };

      logger.info('Cross-server task completed', {
        taskId,
        success: result.success,
        executionTime: result.executionTime,
        serversUsed: result.serversUsed.length
      });

      return result;

    } catch (error) {
      logger.error('Cross-server task failed', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        taskId,
        success: false,
        results: new Map(),
        errors: new Map([['coordination', error as Error]]),
        executionTime: Date.now() - startTime,
        serversUsed: [],
        failedServers: []
      };
    } finally {
      this.tasks.delete(taskId);
    }
  }

  /**
   * Get available servers with capabilities
   */
  getAvailableServers(criteria?: ServerSelectionCriteria): ServerStatus[] {
    const servers = Array.from(this.servers.values());
    
    return servers.filter(server => {
      // Check status
      if (server.status !== 'online') return false;
      
      // Check load
      if (criteria?.maxLoad && server.load > criteria.maxLoad) return false;
      
      // Check capabilities
      if (criteria?.requiredCapabilities?.length) {
        const hasCapabilities = criteria.requiredCapabilities.every(cap => 
          server.capabilities.includes(cap)
        );
        if (!hasCapabilities) return false;
      }
      
      // Check exclusions
      if (criteria?.excludeServers?.includes(server.id)) return false;
      
      return true;
    });
  }

  /**
   * Get server statistics
   */
  getServerStatistics(): {
    totalServers: number;
    onlineServers: number;
    avgLoad: number;
    capabilities: string[];
    activeTasks: number;
  } {
    const servers = Array.from(this.servers.values());
    const onlineServers = servers.filter(s => s.status === 'online');
    const avgLoad = onlineServers.length > 0 
      ? onlineServers.reduce((sum, s) => sum + s.load, 0) / onlineServers.length 
      : 0;
    
    const allCapabilities = new Set<string>();
    servers.forEach(server => {
      server.capabilities.forEach(cap => allCapabilities.add(cap));
    });

    return {
      totalServers: servers.length,
      onlineServers: onlineServers.length,
      avgLoad,
      capabilities: Array.from(allCapabilities),
      activeTasks: this.tasks.size
    };
  }

  /**
   * Register a custom coordination strategy
   */
  registerStrategy(strategy: CoordinationStrategy): void {
    this.strategies.set(strategy.name, strategy);
    logger.info('Coordination strategy registered', { name: strategy.name });
  }

  /**
   * Health check for all servers
   */
  async performHealthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const healthCheckPromises = Array.from(this.servers.keys()).map(async serverId => {
      try {
        // In a real implementation, this would ping the server
        const server = this.servers.get(serverId)!;
        const isHealthy = (Date.now() - server.lastHeartbeat.getTime()) < this.heartbeatInterval * 2;
        results.set(serverId, isHealthy);
        
        if (!isHealthy) {
          this.updateServerStatus(serverId, { status: 'offline' });
        }
      } catch (error) {
        results.set(serverId, false);
        this.updateServerStatus(serverId, { status: 'error' });
      }
    });

    await Promise.all(healthCheckPromises);
    return results;
  }

  // ==================== PRIVATE IMPLEMENTATION ====================

  private initializeDefaultStrategies(): void {
    // Parallel execution strategy
    this.strategies.set('parallel', {
      name: 'parallel',
      description: 'Execute task on all selected servers in parallel',
      execute: async (task: CrossServerTask, servers: ServerStatus[]) => {
        const promises = servers.map(async server => {
          try {
            // In a real implementation, this would make an actual server call
            const result = await this.executeOnServer(server.id, task);
            task.results.set(server.id, result);
          } catch (error) {
            task.errors.set(server.id, error as Error);
          }
        });

        await Promise.all(promises);
      }
    });

    // Sequential execution strategy
    this.strategies.set('sequential', {
      name: 'sequential',
      description: 'Execute task on servers one by one',
      execute: async (task: CrossServerTask, servers: ServerStatus[]) => {
        for (const server of servers) {
          try {
            const result = await this.executeOnServer(server.id, task);
            task.results.set(server.id, result);
          } catch (error) {
            task.errors.set(server.id, error as Error);
            // Continue with next server
          }
        }
      }
    });

    // Primary-backup strategy
    this.strategies.set('primary-backup', {
      name: 'primary-backup',
      description: 'Try primary server, fallback to backup if fails',
      execute: async (task: CrossServerTask, servers: ServerStatus[]) => {
        for (const server of servers) {
          try {
            const result = await this.executeOnServer(server.id, task);
            task.results.set(server.id, result);
            return; // Success, no need to try other servers
          } catch (error) {
            task.errors.set(server.id, error as Error);
            // Try next server
          }
        }
      }
    });

    // Consensus strategy
    this.strategies.set('consensus', {
      name: 'consensus',
      description: 'Execute on multiple servers and use consensus result',
      execute: async (task: CrossServerTask, servers: ServerStatus[]) => {
        const promises = servers.map(async server => {
          try {
            const result = await this.executeOnServer(server.id, task);
            return { serverId: server.id, result, error: null };
          } catch (error) {
            return { serverId: server.id, result: null, error: error as Error };
          }
        });

        const results = await Promise.all(promises);
        
        // Store individual results
        results.forEach(({ serverId, result, error }) => {
          if (error) {
            task.errors.set(serverId, error);
          } else {
            task.results.set(serverId, result);
          }
        });

        // Calculate consensus (simplified - just take majority)
        const successfulResults = results.filter(r => r.result !== null);
        if (successfulResults.length > servers.length / 2) {
          // Store consensus result
          task.results.set('consensus', successfulResults[0].result);
        }
      }
    });
  }

  private selectServers(criteria: ServerSelectionCriteria): ServerStatus[] {
    let candidates = this.getAvailableServers(criteria);

    // Apply preferred servers filter
    if (criteria.preferredServers?.length) {
      const preferred = candidates.filter(s => criteria.preferredServers!.includes(s.id));
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    // Apply load balancing
    switch (criteria.loadBalancing) {
      case 'least-loaded':
        candidates.sort((a, b) => a.load - b.load);
        break;
      case 'random':
        candidates = this.shuffleArray(candidates);
        break;
      case 'capability-based':
        // Prefer servers with more matching capabilities
        candidates.sort((a, b) => {
          const aMatches = a.capabilities.filter(cap => 
            criteria.requiredCapabilities.includes(cap)
          ).length;
          const bMatches = b.capabilities.filter(cap => 
            criteria.requiredCapabilities.includes(cap)
          ).length;
          return bMatches - aMatches;
        });
        break;
      case 'round-robin':
      default:
        // Use current order
        break;
    }

    return candidates;
  }

  private getDefaultStrategy(taskType: CrossServerTask['type']): string {
    switch (taskType) {
      case 'analysis':
        return 'parallel';
      case 'validation':
        return 'consensus';
      case 'processing':
        return 'primary-backup';
      case 'coordination':
        return 'sequential';
      default:
        return 'parallel';
    }
  }

  private async executeOnServer(serverId: string, task: CrossServerTask): Promise<any> {
    // In a real implementation, this would make an actual network call to the server
    // For now, we'll simulate execution
    
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    if (server.status !== 'online') {
      throw new Error(`Server ${serverId} is not online`);
    }

    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Update server load
    this.updateServerStatus(serverId, { load: Math.min(1, server.load + 0.1) });
    
    // Simulate success/failure
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`Simulated failure on server ${serverId}`);
    }

    return {
      serverId,
      taskId: task.id,
      executedAt: new Date(),
      result: `Task ${task.type} executed successfully`
    };
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private startHeartbeatMonitoring(): void {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Heartbeat monitoring failed', { error });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.servers.clear();
    this.tasks.clear();
    logger.info('CrossServerCoordinationService cleanup completed');
  }
}