/**
 * SuperClaude Migration Monitoring and Alerting System
 * Real-time monitoring, alerting, and health checks for migration process
 */

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { format, isAfter, subMinutes } from 'date-fns';
import * as cron from 'node-cron';
import { createLogger, transports, format as winstonFormat } from 'winston';
import {
  MigrationConfig,
  MigrationStatus,
  ParallelOperationState,
  MigrationStage,
  MigrationLogger
} from '../types/index.js';

export interface MonitoringConfig {
  health_check_interval_ms: number;
  metrics_collection_interval_ms: number;
  alert_check_interval_ms: number;
  log_retention_days: number;
  metrics_retention_days: number;
  alert_retention_days: number;
  real_time_dashboard_enabled: boolean;
  webhook_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  slack_notifications_enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
    threshold: number;
    duration_minutes?: number;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  actions: Array<{
    type: 'log' | 'webhook' | 'email' | 'slack' | 'rollback';
    config: Record<string, any>;
  }>;
  enabled: boolean;
  cooldown_minutes: number;
}

export interface SystemMetrics {
  timestamp: string;
  migration_id: string;
  stage: MigrationStage;
  
  // System health metrics
  hook_system: {
    status: 'online' | 'degraded' | 'offline' | 'unknown';
    response_time_ms: number;
    error_rate_percent: number;
    throughput_ops_per_sec: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
  };
  
  mcp_system: {
    status: 'online' | 'degraded' | 'offline' | 'unknown';
    response_time_ms: number;
    error_rate_percent: number;
    throughput_ops_per_sec: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
    servers_online: number;
    servers_total: number;
  };
  
  bridge_system: {
    status: 'online' | 'degraded' | 'offline' | 'unknown';
    response_time_ms: number;
    error_rate_percent: number;
    queue_depth: number;
  };
  
  // Migration-specific metrics
  migration: {
    progress_percentage: number;
    time_remaining_minutes: number;
    traffic_split_hook_percent: number;
    traffic_split_mcp_percent: number;
    rollback_points_available: number;
    last_validation_score: number;
  };
  
  // Infrastructure metrics
  infrastructure: {
    disk_usage_percent: number;
    network_latency_ms: number;
    open_file_descriptors: number;
    load_average: number;
  };
}

export interface Alert {
  id: string;
  rule_id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metrics_context: Partial<SystemMetrics>;
  acknowledged: boolean;
  resolved: boolean;
  resolution_time?: string;
  resolution_notes?: string;
  actions_taken: Array<{
    action_type: string;
    timestamp: string;
    result: 'success' | 'failure';
    details?: string;
  }>;
}

export interface DashboardData {
  current_status: MigrationStatus;
  recent_metrics: SystemMetrics[];
  active_alerts: Alert[];
  system_health_summary: {
    overall_status: 'healthy' | 'degraded' | 'critical';
    hook_system_health: number; // 0-1
    mcp_system_health: number; // 0-1
    migration_health: number; // 0-1
  };
  performance_trends: {
    response_time_trend: Array<{ timestamp: string; hook_ms: number; mcp_ms: number }>;
    error_rate_trend: Array<{ timestamp: string; hook_percent: number; mcp_percent: number }>;
    throughput_trend: Array<{ timestamp: string; hook_ops: number; mcp_ops: number }>;
  };
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'performance' | 'reliability' | 'migration' | 'security';
    title: string;
    description: string;
    action_required: boolean;
  }>;
}

export class MigrationMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private migrationConfig: MigrationConfig;
  private logger: MigrationLogger;
  private metricsLogger: ReturnType<typeof createLogger>;
  private alertsLogger: ReturnType<typeof createLogger>;
  
  // Monitoring state
  private isMonitoring: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCollectionInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;
  private cronJobs: cron.ScheduledTask[] = [];
  
  // Data storage
  private currentMetrics?: SystemMetrics;
  private metricsHistory: SystemMetrics[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  
  // File paths
  private metricsPath: string;
  private alertsPath: string;
  private dashboardPath: string;

  constructor(
    config: MonitoringConfig,
    migrationConfig: MigrationConfig,
    logger: MigrationLogger,
    dataPath?: string
  ) {
    super();
    this.config = config;
    this.migrationConfig = migrationConfig;
    this.logger = logger;
    
    // Setup data paths
    const basePath = dataPath || join(process.cwd(), 'monitoring-data');
    this.metricsPath = join(basePath, 'metrics');
    this.alertsPath = join(basePath, 'alerts');
    this.dashboardPath = join(basePath, 'dashboard');
    
    // Ensure directories exist
    [this.metricsPath, this.alertsPath, this.dashboardPath].forEach(path => {
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    });
    
    // Setup specialized loggers
    this.setupLoggers();
    
    // Initialize default alert rules
    this.initializeDefaultAlertRules();
    
    this.logger.info('Migration monitor initialized', {
      health_check_interval: config.health_check_interval_ms,
      metrics_interval: config.metrics_collection_interval_ms,
      dashboard_enabled: config.real_time_dashboard_enabled
    });
  }

  /**
   * Start monitoring with all configured intervals
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring already started');
      return;
    }

    this.logger.info('Starting migration monitoring');
    this.isMonitoring = true;

    // Start health check monitoring
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Health check failed', { error });
      }
    }, this.config.health_check_interval_ms);

    // Start metrics collection
    this.metricsCollectionInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.logger.error('Metrics collection failed', { error });
      }
    }, this.config.metrics_collection_interval_ms);

    // Start alert checking
    this.alertCheckInterval = setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        this.logger.error('Alert checking failed', { error });
      }
    }, this.config.alert_check_interval_ms);

    // Schedule periodic cleanup
    const cleanupJob = cron.schedule('0 2 * * *', async () => { // Daily at 2 AM
      try {
        await this.performCleanup();
      } catch (error) {
        this.logger.error('Cleanup failed', { error });
      }
    }, { scheduled: false });
    
    cleanupJob.start();
    this.cronJobs.push(cleanupJob);

    // Generate initial dashboard
    if (this.config.real_time_dashboard_enabled) {
      this.generateDashboard();
      
      // Update dashboard every minute
      const dashboardJob = cron.schedule('* * * * *', async () => {
        try {
          await this.generateDashboard();
        } catch (error) {
          this.logger.error('Dashboard generation failed', { error });
        }
      }, { scheduled: false });
      
      dashboardJob.start();
      this.cronJobs.push(dashboardJob);
    }

    this.emit('monitoring_started', {
      migration_id: this.migrationConfig.version,
      timestamp: new Date().toISOString()
    });

    this.logger.info('Migration monitoring started successfully');
  }

  /**
   * Stop monitoring and cleanup
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Monitoring not currently running');
      return;
    }

    this.logger.info('Stopping migration monitoring');
    this.isMonitoring = false;

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = undefined;
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = undefined;
    }

    // Stop cron jobs
    this.cronJobs.forEach(job => job.destroy());
    this.cronJobs = [];

    this.emit('monitoring_stopped', {
      migration_id: this.migrationConfig.version,
      timestamp: new Date().toISOString()
    });

    this.logger.info('Migration monitoring stopped');
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.info(`Added alert rule: ${rule.name}`, {
      rule_id: rule.id,
      severity: rule.severity
    });
  }

  /**
   * Get current system status
   */
  getCurrentStatus(): {
    monitoring_active: boolean;
    current_metrics?: SystemMetrics;
    active_alerts: Alert[];
    system_health: 'healthy' | 'degraded' | 'critical';
  } {
    const activeAlerts = Array.from(this.activeAlerts.values());
    
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      systemHealth = 'critical';
    } else if (activeAlerts.some(alert => alert.severity === 'error' || alert.severity === 'warning')) {
      systemHealth = 'degraded';
    }

    return {
      monitoring_active: this.isMonitoring,
      current_metrics: this.currentMetrics,
      active_alerts: activeAlerts,
      system_health: systemHealth
    };
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, notes?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      this.logger.warn(`Alert not found: ${alertId}`);
      return false;
    }

    alert.acknowledged = true;
    alert.resolution_notes = notes;
    
    this.emit('alert_acknowledged', {
      alert_id: alertId,
      timestamp: new Date().toISOString(),
      notes
    });

    this.logger.info(`Alert acknowledged: ${alertId}`, { notes });
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, notes?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      this.logger.warn(`Alert not found: ${alertId}`);
      return false;
    }

    alert.resolved = true;
    alert.resolution_time = new Date().toISOString();
    alert.resolution_notes = notes;
    
    // Move to history
    this.alertHistory.push(alert);
    this.activeAlerts.delete(alertId);

    this.emit('alert_resolved', {
      alert_id: alertId,
      timestamp: new Date().toISOString(),
      notes
    });

    this.logger.info(`Alert resolved: ${alertId}`, { notes });
    return true;
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const dashboardFile = join(this.dashboardPath, 'current-dashboard.json');
    
    if (existsSync(dashboardFile)) {
      try {
        const data = readFileSync(dashboardFile, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        this.logger.error('Failed to read dashboard data', { error });
      }
    }

    // Return minimal dashboard data if file doesn't exist
    return this.generateMinimalDashboardData();
  }

  /**
   * Private methods
   */
  private setupLoggers(): void {
    // Metrics logger
    this.metricsLogger = createLogger({
      level: 'info',
      format: winstonFormat.combine(
        winstonFormat.timestamp(),
        winstonFormat.json()
      ),
      transports: [
        new transports.File({
          filename: join(this.metricsPath, 'metrics.log'),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10
        })
      ]
    });

    // Alerts logger
    this.alertsLogger = createLogger({
      level: 'info',
      format: winstonFormat.combine(
        winstonFormat.timestamp(),
        winstonFormat.json()
      ),
      transports: [
        new transports.File({
          filename: join(this.alertsPath, 'alerts.log'),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10
        })
      ]
    });
  }

  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds threshold',
        condition: {
          metric: 'error_rate_percent',
          operator: '>',
          threshold: 5,
          duration_minutes: 2
        },
        severity: 'error',
        actions: [
          { type: 'log', config: {} },
          { type: 'webhook', config: { endpoint: '/alerts/high-error-rate' } }
        ],
        enabled: true,
        cooldown_minutes: 10
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        description: 'Alert when response time is consistently high',
        condition: {
          metric: 'response_time_ms',
          operator: '>',
          threshold: 1000,
          duration_minutes: 3
        },
        severity: 'warning',
        actions: [
          { type: 'log', config: {} }
        ],
        enabled: true,
        cooldown_minutes: 15
      },
      {
        id: 'system_offline',
        name: 'System Offline',
        description: 'Alert when a system goes offline',
        condition: {
          metric: 'system_status',
          operator: '==',
          threshold: 0, // 0 = offline
          duration_minutes: 1
        },
        severity: 'critical',
        actions: [
          { type: 'log', config: {} },
          { type: 'webhook', config: { endpoint: '/alerts/system-offline' } },
          { type: 'email', config: { recipients: ['admin@example.com'] } }
        ],
        enabled: true,
        cooldown_minutes: 5
      },
      {
        id: 'migration_progress_stalled',
        name: 'Migration Progress Stalled',
        description: 'Alert when migration progress has not advanced',
        condition: {
          metric: 'migration_progress_percentage',
          operator: '==',
          threshold: -1, // Special value for "no change"
          duration_minutes: 30
        },
        severity: 'warning',
        actions: [
          { type: 'log', config: {} }
        ],
        enabled: true,
        cooldown_minutes: 60
      }
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }

    this.logger.info(`Initialized ${defaultRules.length} default alert rules`);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Simulate health checks for different systems
      const hookSystemHealth = await this.checkHookSystemHealth();
      const mcpSystemHealth = await this.checkMCPSystemHealth();
      const bridgeSystemHealth = await this.checkBridgeSystemHealth();

      // Emit health check results
      this.emit('health_check_completed', {
        timestamp: new Date().toISOString(),
        hook_system: hookSystemHealth,
        mcp_system: mcpSystemHealth,
        bridge_system: bridgeSystemHealth
      });

    } catch (error) {
      this.logger.error('Health check error', { error });
      this.emit('health_check_failed', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        migration_id: this.migrationConfig.version,
        stage: this.migrationConfig.stage,
        
        hook_system: await this.collectHookSystemMetrics(),
        mcp_system: await this.collectMCPSystemMetrics(),
        bridge_system: await this.collectBridgeSystemMetrics(),
        migration: await this.collectMigrationMetrics(),
        infrastructure: await this.collectInfrastructureMetrics()
      };

      this.currentMetrics = metrics;
      this.metricsHistory.push(metrics);

      // Keep only last 1000 metrics (for memory management)
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-500);
      }

      // Log metrics
      this.metricsLogger.info('metrics_collected', metrics);

      this.emit('metrics_collected', metrics);

    } catch (error) {
      this.logger.error('Metrics collection failed', { error });
    }
  }

  private async checkAlerts(): Promise<void> {
    if (!this.currentMetrics) {
      return;
    }

    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) {
        continue;
      }

      try {
        const shouldAlert = await this.evaluateAlertRule(rule, this.currentMetrics);
        
        if (shouldAlert && !this.activeAlerts.has(ruleId)) {
          await this.triggerAlert(rule, this.currentMetrics);
        }
      } catch (error) {
        this.logger.error(`Alert rule evaluation failed: ${ruleId}`, { error });
      }
    }
  }

  private async evaluateAlertRule(rule: AlertRule, metrics: SystemMetrics): Promise<boolean> {
    const { condition } = rule;
    let metricValue: number;

    // Extract metric value based on condition.metric
    switch (condition.metric) {
      case 'error_rate_percent':
        metricValue = Math.max(
          metrics.hook_system.error_rate_percent,
          metrics.mcp_system.error_rate_percent
        );
        break;
      case 'response_time_ms':
        metricValue = Math.max(
          metrics.hook_system.response_time_ms,
          metrics.mcp_system.response_time_ms
        );
        break;
      case 'system_status':
        // Convert status to numeric for comparison
        const hookStatus = metrics.hook_system.status === 'offline' ? 0 : 1;
        const mcpStatus = metrics.mcp_system.status === 'offline' ? 0 : 1;
        metricValue = Math.min(hookStatus, mcpStatus);
        break;
      case 'migration_progress_percentage':
        metricValue = metrics.migration.progress_percentage;
        break;
      default:
        this.logger.warn(`Unknown metric in alert rule: ${condition.metric}`);
        return false;
    }

    // Evaluate condition
    switch (condition.operator) {
      case '>':
        return metricValue > condition.threshold;
      case '<':
        return metricValue < condition.threshold;
      case '>=':
        return metricValue >= condition.threshold;
      case '<=':
        return metricValue <= condition.threshold;
      case '==':
        return metricValue === condition.threshold;
      case '!=':
        return metricValue !== condition.threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, metrics: SystemMetrics): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      rule_id: rule.id,
      timestamp: new Date().toISOString(),
      severity: rule.severity,
      title: rule.name,
      message: `${rule.description} - Current metrics indicate condition: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}`,
      metrics_context: metrics,
      acknowledged: false,
      resolved: false,
      actions_taken: []
    };

    this.activeAlerts.set(alertId, alert);

    // Execute alert actions
    for (const action of rule.actions) {
      try {
        const result = await this.executeAlertAction(action, alert);
        alert.actions_taken.push({
          action_type: action.type,
          timestamp: new Date().toISOString(),
          result: result ? 'success' : 'failure',
          details: result ? 'Action executed successfully' : 'Action execution failed'
        });
      } catch (error) {
        alert.actions_taken.push({
          action_type: action.type,
          timestamp: new Date().toISOString(),
          result: 'failure',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log alert
    this.alertsLogger.info('alert_triggered', alert);

    this.emit('alert_triggered', alert);

    this.logger.warn(`Alert triggered: ${rule.name}`, {
      alert_id: alertId,
      severity: rule.severity
    });
  }

  private async executeAlertAction(
    action: { type: string; config: Record<string, any> },
    alert: Alert
  ): Promise<boolean> {
    switch (action.type) {
      case 'log':
        this.logger.warn(`ALERT: ${alert.title}`, {
          alert_id: alert.id,
          severity: alert.severity,
          message: alert.message
        });
        return true;

      case 'webhook':
        // In practice, this would make an HTTP request to the webhook endpoint
        this.logger.info(`Webhook action executed for alert: ${alert.id}`, {
          endpoint: action.config.endpoint
        });
        return true;

      case 'email':
        // In practice, this would send an email
        this.logger.info(`Email action executed for alert: ${alert.id}`, {
          recipients: action.config.recipients
        });
        return true;

      case 'slack':
        // In practice, this would send a Slack message
        this.logger.info(`Slack action executed for alert: ${alert.id}`, {
          channel: action.config.channel
        });
        return true;

      case 'rollback':
        // This would trigger an automatic rollback
        this.logger.error(`Automatic rollback triggered by alert: ${alert.id}`);
        this.emit('automatic_rollback_triggered', {
          alert_id: alert.id,
          timestamp: new Date().toISOString()
        });
        return true;

      default:
        this.logger.warn(`Unknown alert action type: ${action.type}`);
        return false;
    }
  }

  private async checkHookSystemHealth(): Promise<{ status: string; response_time: number }> {
    // Simulate health check
    const responseTime = 100 + Math.random() * 50;
    const status = Math.random() > 0.1 ? 'online' : 'degraded';
    
    return { status, response_time: responseTime };
  }

  private async checkMCPSystemHealth(): Promise<{ status: string; response_time: number; servers_online: number }> {
    // Simulate health check
    const responseTime = 80 + Math.random() * 40;
    const status = Math.random() > 0.05 ? 'online' : 'degraded';
    const serversOnline = Math.floor(Math.random() * 2) + 4; // 4-5 servers
    
    return { status, response_time: responseTime, servers_online: serversOnline };
  }

  private async checkBridgeSystemHealth(): Promise<{ status: string; response_time: number }> {
    // Simulate health check
    const responseTime = 50 + Math.random() * 30;
    const status = Math.random() > 0.02 ? 'online' : 'degraded';
    
    return { status, response_time: responseTime };
  }

  private async collectHookSystemMetrics(): Promise<SystemMetrics['hook_system']> {
    return {
      status: Math.random() > 0.1 ? 'online' : 'degraded',
      response_time_ms: 120 + Math.random() * 80,
      error_rate_percent: Math.random() * 3,
      throughput_ops_per_sec: 45 + Math.random() * 15,
      memory_usage_mb: 150 + Math.random() * 50,
      cpu_usage_percent: 20 + Math.random() * 30
    };
  }

  private async collectMCPSystemMetrics(): Promise<SystemMetrics['mcp_system']> {
    return {
      status: Math.random() > 0.05 ? 'online' : 'degraded',
      response_time_ms: 100 + Math.random() * 60,
      error_rate_percent: Math.random() * 2,
      throughput_ops_per_sec: 55 + Math.random() * 20,
      memory_usage_mb: 200 + Math.random() * 80,
      cpu_usage_percent: 15 + Math.random() * 25,
      servers_online: Math.floor(Math.random() * 2) + 4,
      servers_total: 5
    };
  }

  private async collectBridgeSystemMetrics(): Promise<SystemMetrics['bridge_system']> {
    return {
      status: Math.random() > 0.02 ? 'online' : 'degraded',
      response_time_ms: 50 + Math.random() * 30,
      error_rate_percent: Math.random() * 1,
      queue_depth: Math.floor(Math.random() * 10)
    };
  }

  private async collectMigrationMetrics(): Promise<SystemMetrics['migration']> {
    return {
      progress_percentage: 45 + Math.random() * 10, // Simulate progress
      time_remaining_minutes: 1200 + Math.random() * 600,
      traffic_split_hook_percent: 60,
      traffic_split_mcp_percent: 40,
      rollback_points_available: 3,
      last_validation_score: 0.85 + Math.random() * 0.1
    };
  }

  private async collectInfrastructureMetrics(): Promise<SystemMetrics['infrastructure']> {
    return {
      disk_usage_percent: 45 + Math.random() * 20,
      network_latency_ms: 10 + Math.random() * 15,
      open_file_descriptors: 1000 + Math.random() * 500,
      load_average: 1.5 + Math.random() * 1.0
    };
  }

  private async generateDashboard(): Promise<void> {
    try {
      const dashboardData = await this.generateDashboardData();
      const dashboardFile = join(this.dashboardPath, 'current-dashboard.json');
      
      writeFileSync(dashboardFile, JSON.stringify(dashboardData, null, 2), 'utf-8');
      
      this.emit('dashboard_updated', {
        timestamp: new Date().toISOString(),
        dashboard_path: dashboardFile
      });

    } catch (error) {
      this.logger.error('Dashboard generation failed', { error });
    }
  }

  private async generateDashboardData(): Promise<DashboardData> {
    const recentMetrics = this.metricsHistory.slice(-10);
    const activeAlerts = Array.from(this.activeAlerts.values());
    
    // Calculate system health
    const hookHealth = this.currentMetrics?.hook_system.status === 'online' ? 1 : 0.5;
    const mcpHealth = this.currentMetrics?.mcp_system.status === 'online' ? 1 : 0.5;
    const migrationHealth = (this.currentMetrics?.migration.last_validation_score || 0.8);
    
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (activeAlerts.some(a => a.severity === 'critical')) {
      overallStatus = 'critical';
    } else if (activeAlerts.some(a => a.severity === 'error' || a.severity === 'warning')) {
      overallStatus = 'degraded';
    }

    // Generate performance trends
    const responseTrend = recentMetrics.map(m => ({
      timestamp: m.timestamp,
      hook_ms: m.hook_system.response_time_ms,
      mcp_ms: m.mcp_system.response_time_ms
    }));

    const errorTrend = recentMetrics.map(m => ({
      timestamp: m.timestamp,
      hook_percent: m.hook_system.error_rate_percent,
      mcp_percent: m.mcp_system.error_rate_percent
    }));

    const throughputTrend = recentMetrics.map(m => ({
      timestamp: m.timestamp,
      hook_ops: m.hook_system.throughput_ops_per_sec,
      mcp_ops: m.mcp_system.throughput_ops_per_sec
    }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(activeAlerts, this.currentMetrics);

    return {
      current_status: {
        migration_id: this.migrationConfig.version,
        current_stage: this.migrationConfig.stage,
        progress_percentage: this.currentMetrics?.migration.progress_percentage || 0,
        started_at: new Date().toISOString(), // Would be actual start time
        estimated_completion: new Date().toISOString(), // Would be calculated
        time_remaining_minutes: this.currentMetrics?.migration.time_remaining_minutes || 0,
        stages_completed: ['assessment', 'planning'],
        current_operation: 'Running parallel systems',
        last_checkpoint: new Date().toISOString(),
        issues_encountered: [],
        performance_impact: {
          response_time_delta_ms: 20,
          throughput_delta_percent: 15,
          error_rate_delta_percent: -1
        },
        system_health: {
          overall_status: overallStatus,
          hook_system_health: this.currentMetrics?.hook_system.status || 'unknown',
          mcp_system_health: this.currentMetrics?.mcp_system.status || 'unknown',
          bridge_system_health: this.currentMetrics?.bridge_system.status || 'unknown'
        }
      },
      recent_metrics: recentMetrics,
      active_alerts: activeAlerts,
      system_health_summary: {
        overall_status: overallStatus,
        hook_system_health: hookHealth,
        mcp_system_health: mcpHealth,
        migration_health: migrationHealth
      },
      performance_trends: {
        response_time_trend: responseTrend,
        error_rate_trend: errorTrend,
        throughput_trend: throughputTrend
      },
      recommendations
    };
  }

  private generateMinimalDashboardData(): DashboardData {
    return {
      current_status: {
        migration_id: this.migrationConfig.version,
        current_stage: this.migrationConfig.stage,
        progress_percentage: 0,
        started_at: new Date().toISOString(),
        estimated_completion: new Date().toISOString(),
        time_remaining_minutes: 0,
        stages_completed: [],
        current_operation: 'Initializing',
        last_checkpoint: new Date().toISOString(),
        issues_encountered: [],
        performance_impact: {
          response_time_delta_ms: 0,
          throughput_delta_percent: 0,
          error_rate_delta_percent: 0
        },
        system_health: {
          overall_status: 'healthy',
          hook_system_health: 'unknown',
          mcp_system_health: 'unknown',
          bridge_system_health: 'unknown'
        }
      },
      recent_metrics: [],
      active_alerts: [],
      system_health_summary: {
        overall_status: 'healthy',
        hook_system_health: 0,
        mcp_system_health: 0,
        migration_health: 0
      },
      performance_trends: {
        response_time_trend: [],
        error_rate_trend: [],
        throughput_trend: []
      },
      recommendations: []
    };
  }

  private generateRecommendations(
    alerts: Alert[],
    metrics?: SystemMetrics
  ): DashboardData['recommendations'] {
    const recommendations: DashboardData['recommendations'] = [];

    // Check for critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'reliability',
        title: 'Critical System Issues Detected',
        description: `${criticalAlerts.length} critical alerts require immediate attention`,
        action_required: true
      });
    }

    // Check response time performance
    if (metrics) {
      const maxResponseTime = Math.max(
        metrics.hook_system.response_time_ms,
        metrics.mcp_system.response_time_ms
      );
      
      if (maxResponseTime > 500) {
        recommendations.push({
          priority: 'medium',
          category: 'performance',
          title: 'High Response Times Detected',
          description: 'Consider optimizing system performance or scaling resources',
          action_required: false
        });
      }

      // Check error rates
      const maxErrorRate = Math.max(
        metrics.hook_system.error_rate_percent,
        metrics.mcp_system.error_rate_percent
      );
      
      if (maxErrorRate > 2) {
        recommendations.push({
          priority: 'high',
          category: 'reliability',
          title: 'Elevated Error Rates',
          description: 'Error rates are higher than expected, investigate root causes',
          action_required: true
        });
      }
    }

    return recommendations;
  }

  private async performCleanup(): Promise<void> {
    this.logger.info('Starting monitoring data cleanup');

    // Clean up old metrics
    const metricsRetentionMs = this.config.metrics_retention_days * 24 * 60 * 60 * 1000;
    const metricscutoff = new Date(Date.now() - metricsRetentionMs);
    
    this.metricsHistory = this.metricsHistory.filter(
      metric => new Date(metric.timestamp) > metricscutoff
    );

    // Clean up old alerts
    const alertsRetentionMs = this.config.alert_retention_days * 24 * 60 * 60 * 1000;
    const alertsCutoff = new Date(Date.now() - alertsRetentionMs);
    
    this.alertHistory = this.alertHistory.filter(
      alert => new Date(alert.timestamp) > alertsCutoff
    );

    this.logger.info('Monitoring data cleanup completed', {
      metrics_retained: this.metricsHistory.length,
      alerts_retained: this.alertHistory.length
    });
  }
}