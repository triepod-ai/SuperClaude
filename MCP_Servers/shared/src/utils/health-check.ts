import { DatabaseServiceManager, ConfigurationServiceManager } from '../services/index.js';
import { logger } from './logger.js';

/**
 * Health status enumeration
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

/**
 * Individual component health check result
 */
export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

/**
 * Overall system health check result
 */
export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  version: string;
  uptime: number;
  environment: string;
  components: ComponentHealth[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  version: string;
  environment: string;
  enableDatabaseCheck: boolean;
  enableConfigurationCheck: boolean;
  enableMemoryCheck: boolean;
  enableDiskCheck: boolean;
  memoryThresholdMB: number;
  diskThresholdPercent: number;
  customChecks?: Array<{
    name: string;
    check: () => Promise<ComponentHealth>;
  }>;
}

/**
 * Comprehensive health check service for SuperClaude MCP servers
 */
export class HealthCheckService {
  private config: HealthCheckConfig;
  private startTime: Date;

  constructor(config: HealthCheckConfig) {
    this.config = config;
    this.startTime = new Date();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const components: ComponentHealth[] = [];

    // Basic system checks
    components.push(await this.checkUptime());
    components.push(await this.checkMemory());
    components.push(await this.checkDisk());

    // Database health check
    if (this.config.enableDatabaseCheck) {
      components.push(await this.checkDatabase());
    }

    // Configuration health check
    if (this.config.enableConfigurationCheck) {
      components.push(await this.checkConfiguration());
    }

    // Custom health checks
    if (this.config.customChecks) {
      for (const customCheck of this.config.customChecks) {
        try {
          components.push(await customCheck.check());
        } catch (error) {
          components.push({
            name: customCheck.name,
            status: HealthStatus.UNHEALTHY,
            message: `Custom check failed: ${error.message}`
          });
        }
      }
    }

    // Calculate overall status
    const summary = this.calculateSummary(components);
    const overallStatus = this.determineOverallStatus(summary);

    const endTime = Date.now();
    logger.debug('Health check completed', {
      duration: endTime - startTime,
      status: overallStatus,
      components: components.length
    });

    return {
      status: overallStatus,
      timestamp: new Date(),
      version: this.config.version,
      uptime: Date.now() - this.startTime.getTime(),
      environment: this.config.environment,
      components,
      summary
    };
  }

  /**
   * Perform quick health check (minimal checks)
   */
  async performQuickHealthCheck(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [
      await this.checkUptime(),
      await this.checkMemory()
    ];

    const summary = this.calculateSummary(components);
    const overallStatus = this.determineOverallStatus(summary);

    return {
      status: overallStatus,
      timestamp: new Date(),
      version: this.config.version,
      uptime: Date.now() - this.startTime.getTime(),
      environment: this.config.environment,
      components,
      summary
    };
  }

  /**
   * Check system uptime
   */
  private async checkUptime(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const uptime = Date.now() - this.startTime.getTime();
      const uptimeSeconds = Math.floor(uptime / 1000);
      
      return {
        name: 'uptime',
        status: HealthStatus.HEALTHY,
        message: `System running for ${uptimeSeconds} seconds`,
        responseTime: Date.now() - startTime,
        metadata: {
          uptimeMs: uptime,
          uptimeSeconds,
          startTime: this.startTime.toISOString()
        }
      };
    } catch (error) {
      return {
        name: 'uptime',
        status: HealthStatus.UNHEALTHY,
        message: `Uptime check failed: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
      
      const status = heapUsedMB > this.config.memoryThresholdMB ? 
        HealthStatus.DEGRADED : HealthStatus.HEALTHY;
      
      return {
        name: 'memory',
        status,
        message: `Heap: ${heapUsedMB}MB/${heapTotalMB}MB, RSS: ${rssMB}MB`,
        responseTime: Date.now() - startTime,
        metadata: {
          heapUsedMB,
          heapTotalMB,
          rssMB,
          externalMB: Math.round(memoryUsage.external / 1024 / 1024),
          thresholdMB: this.config.memoryThresholdMB
        }
      };
    } catch (error) {
      return {
        name: 'memory',
        status: HealthStatus.UNHEALTHY,
        message: `Memory check failed: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check disk usage
   */
  private async checkDisk(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // For Node.js, we'll check available disk space using fs.statSync
      const fs = await import('fs');
      const path = await import('path');
      
      const stats = fs.statSync(process.cwd());
      
      // This is a simplified check - in production, you'd want more detailed disk monitoring
      return {
        name: 'disk',
        status: HealthStatus.HEALTHY,
        message: 'Disk accessible',
        responseTime: Date.now() - startTime,
        metadata: {
          workingDirectory: process.cwd(),
          accessible: true
        }
      };
    } catch (error) {
      return {
        name: 'disk',
        status: HealthStatus.UNHEALTHY,
        message: `Disk check failed: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check database connectivity and health
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      if (!DatabaseServiceManager.isInitialized()) {
        return {
          name: 'database',
          status: HealthStatus.DEGRADED,
          message: 'Database service not initialized',
          responseTime: Date.now() - startTime
        };
      }

      const dbService = DatabaseServiceManager.getInstance();
      const isHealthy = await dbService.healthCheck();
      
      if (!isHealthy) {
        return {
          name: 'database',
          status: HealthStatus.UNHEALTHY,
          message: 'Database health check failed',
          responseTime: Date.now() - startTime
        };
      }

      const stats = await dbService.getStats();
      
      return {
        name: 'database',
        status: HealthStatus.HEALTHY,
        message: 'Database connection healthy',
        responseTime: Date.now() - startTime,
        metadata: stats
      };
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        message: `Database check failed: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check configuration service health
   */
  private async checkConfiguration(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      if (!ConfigurationServiceManager.isInitialized()) {
        return {
          name: 'configuration',
          status: HealthStatus.DEGRADED,
          message: 'Configuration service not initialized',
          responseTime: Date.now() - startTime
        };
      }

      const configService = ConfigurationServiceManager.getInstance();
      const stats = configService.getStats();
      
      return {
        name: 'configuration',
        status: HealthStatus.HEALTHY,
        message: 'Configuration service healthy',
        responseTime: Date.now() - startTime,
        metadata: stats
      };
    } catch (error) {
      return {
        name: 'configuration',
        status: HealthStatus.UNHEALTHY,
        message: `Configuration check failed: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate health summary
   */
  private calculateSummary(components: ComponentHealth[]): SystemHealth['summary'] {
    const summary = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      total: components.length
    };

    for (const component of components) {
      switch (component.status) {
        case HealthStatus.HEALTHY:
          summary.healthy++;
          break;
        case HealthStatus.DEGRADED:
          summary.degraded++;
          break;
        case HealthStatus.UNHEALTHY:
          summary.unhealthy++;
          break;
      }
    }

    return summary;
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(summary: SystemHealth['summary']): HealthStatus {
    if (summary.unhealthy > 0) {
      return HealthStatus.UNHEALTHY;
    }
    
    if (summary.degraded > 0) {
      return HealthStatus.DEGRADED;
    }
    
    return HealthStatus.HEALTHY;
  }

  /**
   * Get health status as HTTP status code
   */
  static getHttpStatusCode(status: HealthStatus): number {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 200;
      case HealthStatus.DEGRADED:
        return 200; // Still operational
      case HealthStatus.UNHEALTHY:
        return 503; // Service unavailable
      default:
        return 500;
    }
  }

  /**
   * Create health check middleware for Express-like frameworks
   */
  static createMiddleware(healthCheckService: HealthCheckService) {
    return async (req: any, res: any, next: any) => {
      try {
        const isQuickCheck = req.query.quick === 'true';
        const health = isQuickCheck ? 
          await healthCheckService.performQuickHealthCheck() :
          await healthCheckService.performHealthCheck();

        const statusCode = HealthCheckService.getHttpStatusCode(health.status);
        
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check middleware error', { error: error.message });
        res.status(500).json({
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          message: 'Health check failed',
          error: error.message
        });
      }
    };
  }

  /**
   * Create readiness probe (for Kubernetes)
   */
  static createReadinessProbe(healthCheckService: HealthCheckService) {
    return async (req: any, res: any) => {
      try {
        const health = await healthCheckService.performQuickHealthCheck();
        
        // Readiness probe should fail if system is unhealthy
        if (health.status === HealthStatus.UNHEALTHY) {
          res.status(503).json({ ready: false, status: health.status });
        } else {
          res.status(200).json({ ready: true, status: health.status });
        }
      } catch (error) {
        res.status(503).json({ ready: false, error: error.message });
      }
    };
  }

  /**
   * Create liveness probe (for Kubernetes)
   */
  static createLivenessProbe() {
    return (req: any, res: any) => {
      // Liveness probe just checks if the process is running
      res.status(200).json({ alive: true, timestamp: new Date() });
    };
  }
}

/**
 * Default health check configuration factory
 */
export function createDefaultHealthCheckConfig(
  version: string = '1.0.0',
  environment: string = 'development'
): HealthCheckConfig {
  return {
    version,
    environment,
    enableDatabaseCheck: true,
    enableConfigurationCheck: true,
    enableMemoryCheck: true,
    enableDiskCheck: true,
    memoryThresholdMB: 512,
    diskThresholdPercent: 90
  };
}

/**
 * Health check service singleton
 */
export class HealthCheckServiceManager {
  private static instance: HealthCheckService | null = null;

  static initialize(config: HealthCheckConfig): HealthCheckService {
    this.instance = new HealthCheckService(config);
    return this.instance;
  }

  static getInstance(): HealthCheckService {
    if (!this.instance) {
      throw new Error('HealthCheckService not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }
}