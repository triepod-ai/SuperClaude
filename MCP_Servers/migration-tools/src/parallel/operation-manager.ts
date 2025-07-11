/**
 * SuperClaude Parallel Operation Manager
 * Manages concurrent operation of hook and MCP systems during migration
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { format, addDays, isAfter } from 'date-fns';
import * as cron from 'node-cron';
import {
  ParallelOperationState,
  ServiceState,
  MigrationStage,
  MigrationError,
  MigrationLogger,
  MigrationConfig
} from '../types/index.js';

export interface ParallelOperationConfig {
  migration_id: string;
  duration_days: number;
  traffic_split_schedule: Array<{
    day: number;
    hook_percentage: number;
    mcp_percentage: number;
  }>;
  health_check_interval_ms: number;
  performance_monitoring_interval_ms: number;
  auto_fallback_enabled: boolean;
  rollback_triggers: {
    error_rate_threshold: number;
    response_time_threshold_ms: number;
    downtime_threshold_minutes: number;
  };
}

export interface ServiceMetrics {
  avg_response_time_ms: number;
  error_rate_percent: number;
  throughput_ops_per_sec: number;
  uptime_percent: number;
  last_error?: string;
  last_error_time?: string;
}

export interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  hook_system_health: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  mcp_system_health: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  bridge_system_health: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
}

export class ParallelOperationManager extends EventEmitter {
  private config: ParallelOperationConfig;
  private migrationConfig: MigrationConfig;
  private logger: MigrationLogger;
  private state: ParallelOperationState;
  private statePath: string;
  
  // Service monitoring
  private healthCheckInterval?: NodeJS.Timeout;
  private performanceMonitorInterval?: NodeJS.Timeout;
  private cronJobs: cron.ScheduledTask[] = [];
  
  // Process management
  private hookProcesses: Map<string, ChildProcess> = new Map();
  private mcpProcesses: Map<string, ChildProcess> = new Map();
  private bridgeProcesses: Map<string, ChildProcess> = new Map();
  
  // Metrics tracking
  private hookMetrics: ServiceMetrics = this.createEmptyMetrics();
  private mcpMetrics: ServiceMetrics = this.createEmptyMetrics();
  private metricsHistory: Array<{
    timestamp: string;
    hook_metrics: ServiceMetrics;
    mcp_metrics: ServiceMetrics;
  }> = [];

  constructor(
    config: ParallelOperationConfig,
    migrationConfig: MigrationConfig,
    logger: MigrationLogger,
    statePath?: string
  ) {
    super();
    this.config = config;
    this.migrationConfig = migrationConfig;
    this.logger = logger;
    this.statePath = statePath || join(process.cwd(), 'migration-state.json');
    
    // Initialize or load state
    this.state = this.loadOrCreateState();
    
    this.logger.info('Parallel operation manager initialized', {
      migration_id: config.migration_id,
      duration_days: config.duration_days
    });
  }

  /**
   * Start parallel operation with both systems running
   */
  async startParallelOperation(): Promise<void> {
    try {
      this.logger.info('Starting parallel operation', {
        migration_id: this.config.migration_id
      });

      // Update state
      this.state.current_stage = 'parallel_setup';
      this.state.hook_system.state = 'starting';
      this.state.mcp_system.state = 'starting';
      this.saveState();

      // Start hook system
      await this.startHookSystem();
      
      // Start MCP system
      await this.startMCPSystem();
      
      // Start bridge system
      await this.startBridgeSystem();
      
      // Initialize traffic split
      this.updateTrafficSplit(
        this.config.traffic_split_schedule[0]?.hook_percentage || 100,
        this.config.traffic_split_schedule[0]?.mcp_percentage || 0
      );
      
      // Start monitoring
      this.startHealthMonitoring();
      this.startPerformanceMonitoring();
      this.scheduleTrafficSplitUpdates();
      
      // Update state to running
      this.state.current_stage = 'validation';
      this.state.hook_system.state = 'running';
      this.state.mcp_system.state = 'running';
      this.saveState();
      
      this.emit('parallel_operation_started', {
        migration_id: this.config.migration_id,
        systems_online: ['hooks', 'mcp', 'bridge']
      });
      
      this.logger.info('Parallel operation started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start parallel operation', { error });
      await this.emergencyShutdown();
      throw new MigrationError(
        `Parallel operation startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PARALLEL_STARTUP_FAILED',
        'parallel_setup',
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Stop parallel operation and transition to single system
   */
  async stopParallelOperation(targetSystem: 'hooks' | 'mcp'): Promise<void> {
    try {
      this.logger.info('Stopping parallel operation', {
        migration_id: this.config.migration_id,
        target_system: targetSystem
      });

      this.state.current_stage = 'switchover';
      this.saveState();

      // Gradually shift traffic to target system
      if (targetSystem === 'mcp') {
        await this.gradualTrafficShift(0, 100, 5); // 5-minute transition
      } else {
        await this.gradualTrafficShift(100, 0, 5);
      }

      // Stop non-target system
      if (targetSystem === 'mcp') {
        await this.stopHookSystem();
        this.state.hook_system.state = 'stopped';
      } else {
        await this.stopMCPSystem();
        this.state.mcp_system.state = 'stopped';
      }

      // Stop monitoring
      this.stopMonitoring();

      this.state.current_stage = 'cleanup';
      this.saveState();

      this.emit('parallel_operation_stopped', {
        migration_id: this.config.migration_id,
        active_system: targetSystem
      });

      this.logger.info('Parallel operation stopped successfully', {
        active_system: targetSystem
      });

    } catch (error) {
      this.logger.error('Failed to stop parallel operation', { error });
      throw new MigrationError(
        `Parallel operation shutdown failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PARALLEL_SHUTDOWN_FAILED',
        'switchover',
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Get current operation status
   */
  getOperationStatus(): ParallelOperationState & {
    time_remaining_days: number;
    next_traffic_split_change?: string;
    system_recommendations: string[];
  } {
    const endTime = new Date(this.state.target_end_time);
    const now = new Date();
    const timeRemainingMs = Math.max(0, endTime.getTime() - now.getTime());
    const timeRemainingDays = Math.ceil(timeRemainingMs / (1000 * 60 * 60 * 24));

    // Find next traffic split change
    const currentDay = Math.floor((now.getTime() - new Date(this.state.start_time).getTime()) / (1000 * 60 * 60 * 24));
    const nextSplitChange = this.config.traffic_split_schedule.find(
      schedule => schedule.day > currentDay
    );

    // Generate recommendations
    const recommendations = this.generateSystemRecommendations();

    return {
      ...this.state,
      time_remaining_days: timeRemainingDays,
      next_traffic_split_change: nextSplitChange 
        ? format(addDays(new Date(this.state.start_time), nextSplitChange.day), 'yyyy-MM-dd HH:mm:ss')
        : undefined,
      system_recommendations: recommendations
    };
  }

  /**
   * Force immediate switchover to target system
   */
  async emergencySwitchover(targetSystem: 'hooks' | 'mcp', reason: string): Promise<void> {
    try {
      this.logger.warn('Emergency switchover initiated', {
        target_system: targetSystem,
        reason
      });

      // Add critical alert
      this.addAlert('critical', 'bridge', `Emergency switchover: ${reason}`, false);

      // Immediate traffic switch
      if (targetSystem === 'mcp') {
        this.updateTrafficSplit(0, 100);
      } else {
        this.updateTrafficSplit(100, 0);
      }

      // Stop non-target system
      if (targetSystem === 'mcp') {
        await this.stopHookSystem();
      } else {
        await this.stopMCPSystem();
      }

      this.state.current_stage = 'switchover';
      this.saveState();

      this.emit('emergency_switchover', {
        migration_id: this.config.migration_id,
        target_system: targetSystem,
        reason
      });

    } catch (error) {
      this.logger.error('Emergency switchover failed', { error, targetSystem, reason });
      await this.emergencyShutdown();
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async startHookSystem(): Promise<void> {
    this.logger.info('Starting hook system');
    
    // Start hook processes (simulated - in real implementation, this would start actual hook services)
    const hookServices = ['context_accumulator', 'performance_monitor', 'wave_coordinator'];
    
    for (const service of hookServices) {
      try {
        // In practice, this would spawn actual Python processes
        const process = spawn('python3', [
          join(this.migrationConfig.source_config_path, '..', 'Hooks', `${service}.py`)
        ], {
          stdio: 'pipe',
          env: {
            ...process.env,
            SUPERCLAUDE_MIGRATION_MODE: 'parallel',
            SUPERCLAUDE_HOOK_SERVICE: service
          }
        });
        
        process.on('error', (error) => {
          this.logger.error(`Hook service ${service} error`, { error });
          this.addAlert('error', 'hooks', `Service ${service} error: ${error.message}`, false);
        });
        
        this.hookProcesses.set(service, process);
        
      } catch (error) {
        this.logger.error(`Failed to start hook service: ${service}`, { error });
        throw error;
      }
    }
    
    // Wait for services to be ready
    await this.waitForServiceHealth('hooks', 30000);
    this.logger.info('Hook system started successfully');
  }

  private async startMCPSystem(): Promise<void> {
    this.logger.info('Starting MCP system');
    
    const mcpServers = [
      'superclaude-tasks',
      'superclaude-orchestrator', 
      'superclaude-performance'
    ];
    
    for (const server of mcpServers) {
      try {
        // Start MCP server
        const process = spawn('npx', [`@superclaude/${server.replace('superclaude-', '')}-server`], {
          stdio: 'pipe',
          env: {
            ...process.env,
            SUPERCLAUDE_MIGRATION_MODE: 'parallel'
          }
        });
        
        process.on('error', (error) => {
          this.logger.error(`MCP server ${server} error`, { error });
          this.addAlert('error', 'mcp', `Server ${server} error: ${error.message}`, false);
        });
        
        this.mcpProcesses.set(server, process);
        
      } catch (error) {
        this.logger.error(`Failed to start MCP server: ${server}`, { error });
        throw error;
      }
    }
    
    await this.waitForServiceHealth('mcp', 45000);
    this.logger.info('MCP system started successfully');
  }

  private async startBridgeSystem(): Promise<void> {
    this.logger.info('Starting bridge system');
    
    const bridgeServices = ['superclaude_dispatcher', 'performance_bridge', 'context_bridge'];
    
    for (const service of bridgeServices) {
      try {
        const process = spawn('python3', [
          join(this.migrationConfig.source_config_path, '..', 'Hooks', `${service}.py`)
        ], {
          stdio: 'pipe',
          env: {
            ...process.env,
            SUPERCLAUDE_MIGRATION_MODE: 'parallel',
            SUPERCLAUDE_BRIDGE_SERVICE: service
          }
        });
        
        process.on('error', (error) => {
          this.logger.error(`Bridge service ${service} error`, { error });
          this.addAlert('error', 'bridge', `Service ${service} error: ${error.message}`, false);
        });
        
        this.bridgeProcesses.set(service, process);
        
      } catch (error) {
        this.logger.error(`Failed to start bridge service: ${service}`, { error });
        throw error;
      }
    }
    
    this.logger.info('Bridge system started successfully');
  }

  private async stopHookSystem(): Promise<void> {
    this.logger.info('Stopping hook system');
    
    for (const [service, process] of this.hookProcesses) {
      try {
        process.kill('SIGTERM');
        
        // Wait for graceful shutdown
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 10000);
        
      } catch (error) {
        this.logger.error(`Failed to stop hook service: ${service}`, { error });
      }
    }
    
    this.hookProcesses.clear();
    this.state.hook_system.state = 'stopped';
    this.logger.info('Hook system stopped');
  }

  private async stopMCPSystem(): Promise<void> {
    this.logger.info('Stopping MCP system');
    
    for (const [server, process] of this.mcpProcesses) {
      try {
        process.kill('SIGTERM');
        
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 15000);
        
      } catch (error) {
        this.logger.error(`Failed to stop MCP server: ${server}`, { error });
      }
    }
    
    this.mcpProcesses.clear();
    this.state.mcp_system.state = 'stopped';
    this.logger.info('MCP system stopped');
  }

  private updateTrafficSplit(hookPercentage: number, mcpPercentage: number): void {
    this.state.traffic_split = {
      hook_percentage: hookPercentage,
      mcp_percentage: mcpPercentage,
      fallback_active: this.config.auto_fallback_enabled
    };
    
    this.saveState();
    
    this.emit('traffic_split_updated', {
      hook_percentage: hookPercentage,
      mcp_percentage: mcpPercentage
    });
    
    this.logger.info('Traffic split updated', {
      hook_percentage: hookPercentage,
      mcp_percentage: mcpPercentage
    });
  }

  private async gradualTrafficShift(
    targetHookPercent: number,
    targetMcpPercent: number,
    durationMinutes: number
  ): Promise<void> {
    const steps = 10;
    const stepDuration = (durationMinutes * 60 * 1000) / steps;
    
    const currentHook = this.state.traffic_split.hook_percentage;
    const currentMcp = this.state.traffic_split.mcp_percentage;
    
    const hookStep = (targetHookPercent - currentHook) / steps;
    const mcpStep = (targetMcpPercent - currentMcp) / steps;
    
    for (let i = 1; i <= steps; i++) {
      const newHookPercent = Math.round(currentHook + (hookStep * i));
      const newMcpPercent = Math.round(currentMcp + (mcpStep * i));
      
      this.updateTrafficSplit(newHookPercent, newMcpPercent);
      
      if (i < steps) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Health check failed', { error });
      }
    }, this.config.health_check_interval_ms);
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitorInterval = setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
      } catch (error) {
        this.logger.error('Performance monitoring failed', { error });
      }
    }, this.config.performance_monitoring_interval_ms);
  }

  private stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
      this.performanceMonitorInterval = undefined;
    }
    
    this.cronJobs.forEach(job => job.destroy());
    this.cronJobs = [];
  }

  private scheduleTrafficSplitUpdates(): void {
    // Schedule traffic split changes based on configuration
    this.config.traffic_split_schedule.forEach((schedule, index) => {
      if (index === 0) return; // Skip first entry (already applied)
      
      const scheduleDate = addDays(new Date(this.state.start_time), schedule.day);
      const cronExpression = `0 0 ${scheduleDate.getDate()} ${scheduleDate.getMonth() + 1} *`;
      
      const job = cron.schedule(cronExpression, () => {
        this.updateTrafficSplit(schedule.hook_percentage, schedule.mcp_percentage);
        this.logger.info('Scheduled traffic split update executed', schedule);
      }, { scheduled: false });
      
      job.start();
      this.cronJobs.push(job);
    });
  }

  private async performHealthCheck(): Promise<void> {
    // Check hook system health
    const hookHealth = await this.checkSystemHealth('hooks');
    this.state.hook_system.health_status = hookHealth;
    
    // Check MCP system health
    const mcpHealth = await this.checkSystemHealth('mcp');
    this.state.mcp_system.health_status = mcpHealth;
    
    // Update overall system health
    this.updateOverallSystemHealth();
    
    // Check for rollback triggers
    await this.checkRollbackTriggers();
    
    this.saveState();
  }

  private async collectPerformanceMetrics(): Promise<void> {
    // Collect hook system metrics
    this.hookMetrics = await this.getSystemMetrics('hooks');
    this.state.hook_system.performance_metrics = {
      avg_response_time_ms: this.hookMetrics.avg_response_time_ms,
      error_rate_percent: this.hookMetrics.error_rate_percent,
      throughput_ops_per_sec: this.hookMetrics.throughput_ops_per_sec
    };
    
    // Collect MCP system metrics
    this.mcpMetrics = await this.getSystemMetrics('mcp');
    this.state.mcp_system.performance_metrics = {
      avg_response_time_ms: this.mcpMetrics.avg_response_time_ms,
      error_rate_percent: this.mcpMetrics.error_rate_percent,
      throughput_ops_per_sec: this.mcpMetrics.throughput_ops_per_sec
    };
    
    // Store metrics history
    this.metricsHistory.push({
      timestamp: new Date().toISOString(),
      hook_metrics: { ...this.hookMetrics },
      mcp_metrics: { ...this.mcpMetrics }
    });
    
    // Keep only last 100 entries
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-50);
    }
    
    this.saveState();
  }

  private async checkSystemHealth(system: 'hooks' | 'mcp'): Promise<'healthy' | 'degraded' | 'unhealthy' | 'unknown'> {
    try {
      const processes = system === 'hooks' ? this.hookProcesses : this.mcpProcesses;
      const aliveProcesses = Array.from(processes.values()).filter(p => !p.killed);
      
      const healthPercentage = aliveProcesses.length / processes.size;
      
      if (healthPercentage >= 0.9) return 'healthy';
      if (healthPercentage >= 0.7) return 'degraded';
      if (healthPercentage > 0) return 'unhealthy';
      return 'unknown';
      
    } catch (error) {
      this.logger.error(`Health check failed for ${system}`, { error });
      return 'unknown';
    }
  }

  private async getSystemMetrics(system: 'hooks' | 'mcp'): Promise<ServiceMetrics> {
    try {
      // In practice, this would collect real metrics from monitoring endpoints
      // For now, return simulated metrics
      const baseResponseTime = system === 'hooks' ? 150 : 120;
      const randomVariation = Math.random() * 50 - 25;
      
      return {
        avg_response_time_ms: Math.max(10, baseResponseTime + randomVariation),
        error_rate_percent: Math.random() * 2, // 0-2% error rate
        throughput_ops_per_sec: 50 + Math.random() * 20,
        uptime_percent: 99 + Math.random()
      };
      
    } catch (error) {
      this.logger.error(`Failed to collect metrics for ${system}`, { error });
      return this.createEmptyMetrics();
    }
  }

  private async checkRollbackTriggers(): Promise<void> {
    const { rollback_triggers } = this.config;
    
    // Check error rate threshold
    if (this.hookMetrics.error_rate_percent > rollback_triggers.error_rate_threshold ||
        this.mcpMetrics.error_rate_percent > rollback_triggers.error_rate_threshold) {
      
      this.addAlert('critical', 'monitoring', 
        `Error rate threshold exceeded: ${Math.max(this.hookMetrics.error_rate_percent, this.mcpMetrics.error_rate_percent)}%`, 
        false);
    }
    
    // Check response time threshold
    if (this.hookMetrics.avg_response_time_ms > rollback_triggers.response_time_threshold_ms ||
        this.mcpMetrics.avg_response_time_ms > rollback_triggers.response_time_threshold_ms) {
      
      this.addAlert('warning', 'monitoring',
        `Response time threshold exceeded: ${Math.max(this.hookMetrics.avg_response_time_ms, this.mcpMetrics.avg_response_time_ms)}ms`,
        false);
    }
  }

  private updateOverallSystemHealth(): void {
    const hookHealth = this.state.hook_system.health_status;
    const mcpHealth = this.state.mcp_system.health_status;
    
    if (hookHealth === 'healthy' && mcpHealth === 'healthy') {
      // Overall health is determined by the system handling more traffic
      const primarySystem = this.state.traffic_split.hook_percentage > this.state.traffic_split.mcp_percentage ? 'hooks' : 'mcp';
      // For now, just use a simple average
      if (hookHealth === 'healthy' && mcpHealth === 'healthy') {
        // Set overall health to healthy when both systems are healthy
      }
    }
    
    // Simple health aggregation logic
    const healthScores = {
      'healthy': 4,
      'degraded': 2,
      'unhealthy': 1,
      'unknown': 0,
      'offline': 0
    };
    
    const hookScore = healthScores[hookHealth];
    const mcpScore = healthScores[mcpHealth];
    const avgScore = (hookScore + mcpScore) / 2;
    
    if (avgScore >= 3.5) this.state.system_health = { overall_status: 'healthy', hook_system_health: hookHealth, mcp_system_health: mcpHealth, bridge_system_health: 'healthy' };
    else if (avgScore >= 2) this.state.system_health = { overall_status: 'degraded', hook_system_health: hookHealth, mcp_system_health: mcpHealth, bridge_system_health: 'degraded' };
    else this.state.system_health = { overall_status: 'unhealthy', hook_system_health: hookHealth, mcp_system_health: mcpHealth, bridge_system_health: 'unhealthy' };
  }

  private generateSystemRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Performance-based recommendations
    if (this.mcpMetrics.avg_response_time_ms < this.hookMetrics.avg_response_time_ms * 0.8) {
      recommendations.push('MCP system showing better performance - consider accelerating migration');
    }
    
    if (this.hookMetrics.error_rate_percent > this.mcpMetrics.error_rate_percent * 2) {
      recommendations.push('Hook system showing higher error rates - monitor closely');
    }
    
    // Health-based recommendations
    if (this.state.hook_system.health_status === 'unhealthy') {
      recommendations.push('Hook system unhealthy - consider emergency switchover to MCP');
    }
    
    if (this.state.mcp_system.health_status === 'unhealthy') {
      recommendations.push('MCP system unhealthy - ensure all servers are properly configured');
    }
    
    // Time-based recommendations
    const daysRemaining = Math.ceil((new Date(this.state.target_end_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 7) {
      recommendations.push('Migration deadline approaching - prepare for final switchover');
    }
    
    return recommendations;
  }

  private addAlert(
    severity: 'info' | 'warning' | 'error' | 'critical',
    component: 'hooks' | 'mcp' | 'bridge' | 'monitoring',
    message: string,
    autoResolved: boolean
  ): void {
    this.state.alerts.push({
      timestamp: new Date().toISOString(),
      severity,
      component,
      message,
      auto_resolved: autoResolved
    });
    
    // Keep only last 50 alerts
    if (this.state.alerts.length > 50) {
      this.state.alerts = this.state.alerts.slice(-25);
    }
    
    this.emit('alert', { severity, component, message, auto_resolved: autoResolved });
  }

  private async waitForServiceHealth(system: 'hooks' | 'mcp', timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const health = await this.checkSystemHealth(system);
      if (health === 'healthy' || health === 'degraded') {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`${system} system failed to become healthy within ${timeoutMs}ms`);
  }

  private async emergencyShutdown(): Promise<void> {
    this.logger.error('Initiating emergency shutdown');
    
    try {
      this.stopMonitoring();
      await this.stopHookSystem();
      await this.stopMCPSystem();
      
      this.state.current_stage = 'rollback';
      this.state.hook_system.state = 'stopped';
      this.state.mcp_system.state = 'stopped';
      this.saveState();
      
      this.emit('emergency_shutdown', {
        migration_id: this.config.migration_id,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('Emergency shutdown failed', { error });
    }
  }

  private createEmptyMetrics(): ServiceMetrics {
    return {
      avg_response_time_ms: 0,
      error_rate_percent: 0,
      throughput_ops_per_sec: 0,
      uptime_percent: 0
    };
  }

  private loadOrCreateState(): ParallelOperationState {
    if (existsSync(this.statePath)) {
      try {
        const stateData = readFileSync(this.statePath, 'utf-8');
        return JSON.parse(stateData);
      } catch (error) {
        this.logger.warn('Failed to load existing state, creating new state', { error });
      }
    }
    
    const now = new Date();
    const targetEnd = addDays(now, this.config.duration_days);
    
    return {
      migration_id: this.config.migration_id,
      start_time: now.toISOString(),
      target_end_time: targetEnd.toISOString(),
      current_stage: 'assessment',
      hook_system: {
        state: 'unknown',
        health_status: 'unknown',
        performance_metrics: {
          avg_response_time_ms: 0,
          error_rate_percent: 0,
          throughput_ops_per_sec: 0
        }
      },
      mcp_system: {
        state: 'unknown',
        health_status: 'unknown',
        servers_online: [],
        servers_offline: [],
        performance_metrics: {
          avg_response_time_ms: 0,
          error_rate_percent: 0,
          throughput_ops_per_sec: 0
        }
      },
      traffic_split: {
        hook_percentage: 100,
        mcp_percentage: 0,
        fallback_active: this.config.auto_fallback_enabled
      },
      alerts: [],
      system_health: {
        overall_status: 'unknown',
        hook_system_health: 'unknown',
        mcp_system_health: 'unknown',
        bridge_system_health: 'unknown'
      }
    };
  }

  private saveState(): void {
    try {
      const stateDir = dirname(this.statePath);
      if (!existsSync(stateDir)) {
        mkdirSync(stateDir, { recursive: true });
      }
      
      writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to save migration state', { error });
    }
  }
}