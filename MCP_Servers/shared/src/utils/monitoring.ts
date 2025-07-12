import { PerformanceMetricsStorage } from '../services/PerformanceMetricsStorage.js';
import { logger } from './logger.js';

/**
 * Monitoring metrics interface
 */
export interface MonitoringMetrics {
  // System metrics
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  
  // Application metrics
  activeConnections: number;
  requestsPerSecond: number;
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  
  // Business metrics
  tasksCreated: number;
  tasksCompleted: number;
  operationsExecuted: number;
  
  timestamp: Date;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number; // in milliseconds
  retentionDays: number;
  enableSystemMetrics: boolean;
  enableApplicationMetrics: boolean;
  enableBusinessMetrics: boolean;
  alerting: {
    enabled: boolean;
    memoryThresholdMB: number;
    cpuThresholdPercent: number;
    errorRateThreshold: number;
    responseTimeThresholdMs: number;
  };
}

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
}

/**
 * Alert handler interface
 */
export interface AlertHandler {
  handle(alert: Alert): Promise<void>;
}

/**
 * Console alert handler
 */
export class ConsoleAlertHandler implements AlertHandler {
  async handle(alert: Alert): Promise<void> {
    logger.warn('ALERT', {
      id: alert.id,
      severity: alert.severity,
      metric: alert.metric,
      threshold: alert.threshold,
      currentValue: alert.currentValue,
      message: alert.message,
      timestamp: alert.timestamp
    });
  }
}

/**
 * Webhook alert handler
 */
export class WebhookAlertHandler implements AlertHandler {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async handle(alert: Alert): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alert)
      });

      if (!response.ok) {
        logger.error('Failed to send webhook alert', {
          status: response.status,
          statusText: response.statusText,
          alertId: alert.id
        });
      }
    } catch (error) {
      logger.error('Webhook alert handler error', {
        error: error.message,
        alertId: alert.id
      });
    }
  }
}

/**
 * Monitoring service for SuperClaude MCP servers
 */
export class MonitoringService {
  private config: MonitoringConfig;
  private metricsStorage?: PerformanceMetricsStorage;
  private alertHandlers: AlertHandler[] = [];
  private metricsInterval?: NodeJS.Timeout;
  private serverName: string;
  
  // Metrics collection
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private lastMetricsReset = Date.now();
  
  // Business metrics
  private businessMetrics = {
    tasksCreated: 0,
    tasksCompleted: 0,
    operationsExecuted: 0
  };

  constructor(
    serverName: string, 
    config: MonitoringConfig, 
    metricsStorage?: PerformanceMetricsStorage
  ) {
    this.serverName = serverName;
    this.config = config;
    this.metricsStorage = metricsStorage;
    
    // Add default console alert handler
    this.alertHandlers.push(new ConsoleAlertHandler());
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('Monitoring disabled');
      return;
    }

    logger.info('Starting monitoring service', {
      serverName: this.serverName,
      interval: this.config.metricsInterval
    });

    // Start metrics collection
    this.metricsInterval = setInterval(
      () => this.collectAndProcessMetrics(),
      this.config.metricsInterval
    );

    // Setup graceful shutdown
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    
    logger.info('Monitoring service stopped', { serverName: this.serverName });
  }

  /**
   * Add alert handler
   */
  addAlertHandler(handler: AlertHandler): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Record HTTP request
   */
  recordRequest(responseTime: number, success: boolean = true): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (!success) {
      this.errorCount++;
    }

    // Keep only recent response times for performance
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
  }

  /**
   * Record business metric
   */
  recordBusinessMetric(metric: 'tasksCreated' | 'tasksCompleted' | 'operationsExecuted'): void {
    this.businessMetrics[metric]++;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MonitoringMetrics {
    const now = Date.now();
    const timeWindowMs = now - this.lastMetricsReset;
    const timeWindowSeconds = timeWindowMs / 1000;

    // System metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Application metrics
    const requestsPerSecond = timeWindowSeconds > 0 ? this.requestCount / timeWindowSeconds : 0;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    const sortedResponseTimes = [...this.responseTimes].sort((a, b) => a - b);
    const avgResponseTime = sortedResponseTimes.length > 0 ? 
      sortedResponseTimes.reduce((sum, time) => sum + time, 0) / sortedResponseTimes.length : 0;
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);

    return {
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024) // MB
      },
      cpuUsage: {
        user: cpuUsage.user / 1000, // Convert to milliseconds
        system: cpuUsage.system / 1000
      },
      activeConnections: 0, // Would need to be tracked separately
      requestsPerSecond,
      responseTime: {
        avg: avgResponseTime,
        p95: sortedResponseTimes[p95Index] || 0,
        p99: sortedResponseTimes[p99Index] || 0
      },
      errorRate,
      tasksCreated: this.businessMetrics.tasksCreated,
      tasksCompleted: this.businessMetrics.tasksCompleted,
      operationsExecuted: this.businessMetrics.operationsExecuted,
      timestamp: new Date()
    };
  }

  /**
   * Collect and process metrics
   */
  private async collectAndProcessMetrics(): Promise<void> {
    try {
      const metrics = this.getCurrentMetrics();
      
      // Store metrics if storage is available
      if (this.metricsStorage) {
        await this.metricsStorage.recordMetric({
          server_name: this.serverName,
          operation_type: 'system_metrics',
          start_time: new Date(),
          success: true,
          metadata: metrics
        });
      }

      // Check for alerts
      if (this.config.alerting.enabled) {
        await this.checkAlerts(metrics);
      }

      // Reset counters for next interval
      this.resetCounters();

      logger.debug('Metrics collected', {
        serverName: this.serverName,
        timestamp: metrics.timestamp,
        memoryUsage: metrics.memoryUsage.heapUsed,
        requestsPerSecond: metrics.requestsPerSecond,
        errorRate: metrics.errorRate
      });
    } catch (error) {
      logger.error('Failed to collect metrics', {
        serverName: this.serverName,
        error: error.message
      });
    }
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(metrics: MonitoringMetrics): Promise<void> {
    const alerts: Alert[] = [];

    // Memory usage alert
    if (metrics.memoryUsage.heapUsed > this.config.alerting.memoryThresholdMB) {
      alerts.push({
        id: `memory-${Date.now()}`,
        severity: 'high',
        metric: 'memory_usage',
        threshold: this.config.alerting.memoryThresholdMB,
        currentValue: metrics.memoryUsage.heapUsed,
        message: `Memory usage exceeded threshold: ${metrics.memoryUsage.heapUsed}MB > ${this.config.alerting.memoryThresholdMB}MB`,
        timestamp: new Date()
      });
    }

    // Error rate alert
    if (metrics.errorRate > this.config.alerting.errorRateThreshold) {
      alerts.push({
        id: `error-rate-${Date.now()}`,
        severity: 'medium',
        metric: 'error_rate',
        threshold: this.config.alerting.errorRateThreshold,
        currentValue: metrics.errorRate,
        message: `Error rate exceeded threshold: ${metrics.errorRate.toFixed(2)}% > ${this.config.alerting.errorRateThreshold}%`,
        timestamp: new Date()
      });
    }

    // Response time alert
    if (metrics.responseTime.avg > this.config.alerting.responseTimeThresholdMs) {
      alerts.push({
        id: `response-time-${Date.now()}`,
        severity: 'medium',
        metric: 'response_time',
        threshold: this.config.alerting.responseTimeThresholdMs,
        currentValue: metrics.responseTime.avg,
        message: `Average response time exceeded threshold: ${metrics.responseTime.avg.toFixed(2)}ms > ${this.config.alerting.responseTimeThresholdMs}ms`,
        timestamp: new Date()
      });
    }

    // Send alerts
    for (const alert of alerts) {
      for (const handler of this.alertHandlers) {
        try {
          await handler.handle(alert);
        } catch (error) {
          logger.error('Alert handler failed', {
            alertId: alert.id,
            handler: handler.constructor.name,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Reset counters for next interval
   */
  private resetCounters(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.lastMetricsReset = Date.now();
    
    // Reset business metrics (optional - depends on requirements)
    this.businessMetrics = {
      tasksCreated: 0,
      tasksCompleted: 0,
      operationsExecuted: 0
    };
  }

  /**
   * Create Express middleware for request monitoring
   */
  static createMiddleware(monitoringService: MonitoringService) {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        monitoringService.recordRequest(responseTime, success);
        
        originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Get metrics summary for dashboard
   */
  async getMetricsSummary(timeRangeHours: number = 24): Promise<any> {
    if (!this.metricsStorage) {
      return this.getCurrentMetrics();
    }

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (timeRangeHours * 60 * 60 * 1000));

      const analytics = await this.metricsStorage.getAnalytics(
        this.serverName,
        'system_metrics',
        { start: startTime, end: endTime }
      );

      return {
        current: this.getCurrentMetrics(),
        analytics,
        timeRange: {
          start: startTime,
          end: endTime,
          hours: timeRangeHours
        }
      };
    } catch (error) {
      logger.error('Failed to get metrics summary', {
        serverName: this.serverName,
        error: error.message
      });
      
      return this.getCurrentMetrics();
    }
  }
}

/**
 * Default monitoring configuration factory
 */
export function createDefaultMonitoringConfig(): MonitoringConfig {
  return {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    retentionDays: 30,
    enableSystemMetrics: true,
    enableApplicationMetrics: true,
    enableBusinessMetrics: true,
    alerting: {
      enabled: true,
      memoryThresholdMB: 512,
      cpuThresholdPercent: 80,
      errorRateThreshold: 5, // 5%
      responseTimeThresholdMs: 1000 // 1 second
    }
  };
}

/**
 * Monitoring service singleton
 */
export class MonitoringServiceManager {
  private static instances = new Map<string, MonitoringService>();

  static initialize(
    serverName: string,
    config: MonitoringConfig,
    metricsStorage?: PerformanceMetricsStorage
  ): MonitoringService {
    const service = new MonitoringService(serverName, config, metricsStorage);
    this.instances.set(serverName, service);
    return service;
  }

  static getInstance(serverName: string): MonitoringService {
    const instance = this.instances.get(serverName);
    if (!instance) {
      throw new Error(`MonitoringService not initialized for server: ${serverName}`);
    }
    return instance;
  }

  static getAllInstances(): MonitoringService[] {
    return Array.from(this.instances.values());
  }

  static stopAll(): void {
    for (const service of this.instances.values()) {
      service.stop();
    }
    this.instances.clear();
  }
}