/**
 * SuperClaude Migration Tools - Main Entry Point
 * Orchestrates the complete migration from hooks to MCP architecture
 */

export { MigrationConfigManager } from './config/migration-manager.js';
export { ParallelOperationManager } from './parallel/operation-manager.js';
export { RollbackManager } from './rollback/rollback-manager.js';
export { MigrationValidationFramework } from './validation/test-framework.js';
export { MigrationMonitor } from './monitoring/migration-monitor.js';

export * from './types/index.js';

import { EventEmitter } from 'events';
import { join } from 'path';
import { MigrationConfigManager } from './config/migration-manager.js';
import { ParallelOperationManager } from './parallel/operation-manager.js';
import { RollbackManager } from './rollback/rollback-manager.js';
import { MigrationValidationFramework } from './validation/test-framework.js';
import { MigrationMonitor } from './monitoring/migration-monitor.js';
import {
  MigrationConfig,
  MigrationStage,
  MigrationStatus,
  MigrationLogger,
  MigrationHooks,
  MigrationError,
  LegacySettings,
  ModernConfig
} from './types/index.js';

export interface MigrationOrchestratorConfig {
  migration: MigrationConfig;
  parallel_operation: {
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
  };
  rollback: {
    auto_rollback_enabled: boolean;
    rollback_triggers: {
      error_rate_threshold: number;
      downtime_threshold_minutes: number;
      performance_degradation_threshold: number;
      manual_trigger_timeout_minutes: number;
    };
    backup_retention_days: number;
    validation_required_before_rollback: boolean;
    rollback_confirmation_required: boolean;
  };
  validation: {
    test_timeout_seconds: number;
    parallel_test_execution: boolean;
    max_concurrent_tests: number;
    retry_failed_tests: boolean;
    max_retry_attempts: number;
    output_detailed_logs: boolean;
    performance_baseline_runs: number;
    compatibility_threshold: number;
  };
  monitoring: {
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
  };
}

export interface MigrationProgress {
  stage: MigrationStage;
  progress_percentage: number;
  estimated_completion: string;
  current_operation: string;
  systems_status: {
    hook_system: 'online' | 'offline' | 'degraded';
    mcp_system: 'online' | 'offline' | 'degraded';
    bridge_system: 'online' | 'offline' | 'degraded';
  };
  performance_metrics: {
    hook_avg_response_ms: number;
    mcp_avg_response_ms: number;
    error_rate_hook_percent: number;
    error_rate_mcp_percent: number;
  };
  alerts_summary: {
    active_alerts: number;
    critical_alerts: number;
    warnings: number;
  };
}

/**
 * Main Migration Orchestrator
 * Coordinates all migration components and provides a unified interface
 */
export class MigrationOrchestrator extends EventEmitter {
  private config: MigrationOrchestratorConfig;
  private logger: MigrationLogger;
  private hooks?: MigrationHooks;

  // Component managers
  private configManager: MigrationConfigManager;
  private parallelManager?: ParallelOperationManager;
  private rollbackManager: RollbackManager;
  private validationFramework: MigrationValidationFramework;
  private monitor: MigrationMonitor;

  // State
  private currentStage: MigrationStage = 'assessment';
  private isRunning: boolean = false;
  private migrationId: string;

  constructor(
    config: MigrationOrchestratorConfig,
    logger?: MigrationLogger,
    hooks?: MigrationHooks
  ) {
    super();
    this.config = config;
    this.logger = logger || this.createDefaultLogger();
    this.hooks = hooks;
    this.migrationId = `migration_${Date.now()}`;

    // Initialize component managers
    this.configManager = new MigrationConfigManager(config.migration, this.logger);
    this.rollbackManager = new RollbackManager(
      config.rollback,
      config.migration,
      this.logger
    );
    this.validationFramework = new MigrationValidationFramework(
      config.validation,
      config.migration,
      this.logger
    );
    this.monitor = new MigrationMonitor(
      config.monitoring,
      config.migration,
      this.logger
    );

    this.logger.info('Migration orchestrator initialized', {
      migration_id: this.migrationId,
      stage: this.currentStage
    });
  }

  /**
   * Execute complete migration process
   */
  async executeMigration(): Promise<MigrationStatus> {
    try {
      this.logger.info('Starting migration execution', {
        migration_id: this.migrationId
      });

      this.isRunning = true;
      this.emit('migration_started', { migration_id: this.migrationId });

      // Phase 1: Assessment and Planning
      await this.executeStage('assessment', async () => {
        await this.performAssessment();
      });

      // Phase 2: Preparation
      await this.executeStage('preparation', async () => {
        await this.performPreparation();
      });

      // Phase 3: Parallel Setup
      await this.executeStage('parallel_setup', async () => {
        await this.setupParallelOperation();
      });

      // Phase 4: Validation
      await this.executeStage('validation', async () => {
        await this.performValidation();
      });

      // Phase 5: Switchover (handled by parallel manager based on schedule)
      // Phase 6: Cleanup (handled automatically after switchover)

      const finalStatus = await this.getMigrationStatus();

      this.logger.info('Migration execution completed', {
        migration_id: this.migrationId,
        final_stage: this.currentStage
      });

      this.emit('migration_completed', {
        migration_id: this.migrationId,
        status: finalStatus
      });

      return finalStatus;

    } catch (error) {
      this.logger.error('Migration execution failed', {
        migration_id: this.migrationId,
        stage: this.currentStage,
        error
      });

      this.emit('migration_failed', {
        migration_id: this.migrationId,
        stage: this.currentStage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get current migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    const monitorStatus = this.monitor.getCurrentStatus();
    const parallelStatus = this.parallelManager?.getOperationStatus();

    return {
      migration_id: this.migrationId,
      current_stage: this.currentStage,
      progress_percentage: this.calculateProgressPercentage(),
      started_at: new Date().toISOString(),
      estimated_completion: this.calculateEstimatedCompletion(),
      time_remaining_minutes: this.calculateTimeRemaining(),
      stages_completed: this.getCompletedStages(),
      current_operation: this.getCurrentOperation(),
      last_checkpoint: new Date().toISOString(),
      issues_encountered: this.getIssuesEncountered(),
      performance_impact: {
        response_time_delta_ms: monitorStatus.current_metrics?.mcp_system.response_time_ms || 0 - 
                               (monitorStatus.current_metrics?.hook_system.response_time_ms || 0),
        throughput_delta_percent: 0, // Calculate from metrics
        error_rate_delta_percent: 0  // Calculate from metrics
      },
      system_health: {
        overall_status: monitorStatus.system_health === 'healthy' ? 'healthy' : 
                       monitorStatus.system_health === 'critical' ? 'unhealthy' : 'degraded',
        hook_system_health: parallelStatus?.hook_system.health_status || 'unknown',
        mcp_system_health: parallelStatus?.mcp_system.health_status || 'unknown',
        bridge_system_health: 'unknown' // Would get from actual bridge system
      }
    };
  }

  /**
   * Stop migration and cleanup
   */
  async stopMigration(): Promise<void> {
    try {
      this.logger.info('Stopping migration', { migration_id: this.migrationId });

      this.isRunning = false;

      // Stop parallel operation if running
      if (this.parallelManager) {
        await this.parallelManager.stopParallelOperation('hooks'); // Default to hooks
      }

      // Stop monitoring
      this.monitor.stopMonitoring();

      this.emit('migration_stopped', { migration_id: this.migrationId });

      this.logger.info('Migration stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop migration', { error });
      throw error;
    }
  }

  /**
   * Emergency rollback
   */
  async emergencyRollback(reason: string): Promise<void> {
    try {
      this.logger.warn('Emergency rollback initiated', {
        migration_id: this.migrationId,
        reason
      });

      // Stop current operations
      if (this.parallelManager) {
        await this.parallelManager.emergencySwitchover('hooks', reason);
      }

      // Get latest rollback point
      const rollbackPoints = this.rollbackManager.listRollbackPoints();
      if (rollbackPoints.length === 0) {
        throw new MigrationError(
          'No rollback points available for emergency rollback',
          'NO_ROLLBACK_POINTS',
          this.currentStage,
          false
        );
      }

      const latestPoint = rollbackPoints[0];
      await this.rollbackManager.executeRollback(latestPoint.id, { force: true });

      this.currentStage = 'rollback';

      this.emit('emergency_rollback_completed', {
        migration_id: this.migrationId,
        rollback_point: latestPoint.id,
        reason
      });

      this.logger.info('Emergency rollback completed', {
        rollback_point: latestPoint.id
      });

    } catch (error) {
      this.logger.error('Emergency rollback failed', { error });
      throw error;
    }
  }

  /**
   * Get migration progress summary
   */
  getMigrationProgress(): MigrationProgress {
    const monitorStatus = this.monitor.getCurrentStatus();
    const parallelStatus = this.parallelManager?.getOperationStatus();

    return {
      stage: this.currentStage,
      progress_percentage: this.calculateProgressPercentage(),
      estimated_completion: this.calculateEstimatedCompletion(),
      current_operation: this.getCurrentOperation(),
      systems_status: {
        hook_system: parallelStatus?.hook_system.health_status === 'healthy' ? 'online' : 
                    parallelStatus?.hook_system.health_status === 'unhealthy' ? 'offline' : 'degraded',
        mcp_system: parallelStatus?.mcp_system.health_status === 'healthy' ? 'online' :
                   parallelStatus?.mcp_system.health_status === 'unhealthy' ? 'offline' : 'degraded',
        bridge_system: 'online' // Would get from actual status
      },
      performance_metrics: {
        hook_avg_response_ms: monitorStatus.current_metrics?.hook_system.response_time_ms || 0,
        mcp_avg_response_ms: monitorStatus.current_metrics?.mcp_system.response_time_ms || 0,
        error_rate_hook_percent: monitorStatus.current_metrics?.hook_system.error_rate_percent || 0,
        error_rate_mcp_percent: monitorStatus.current_metrics?.mcp_system.error_rate_percent || 0
      },
      alerts_summary: {
        active_alerts: monitorStatus.active_alerts.length,
        critical_alerts: monitorStatus.active_alerts.filter(a => a.severity === 'critical').length,
        warnings: monitorStatus.active_alerts.filter(a => a.severity === 'warning').length
      }
    };
  }

  /**
   * Private methods
   */
  private async executeStage(stage: MigrationStage, operation: () => Promise<void>): Promise<void> {
    try {
      this.logger.info(`Starting migration stage: ${stage}`);
      
      this.currentStage = stage;
      
      // Call hooks before stage
      if (this.hooks?.beforeStage) {
        await this.hooks.beforeStage(stage, { migration_id: this.migrationId });
      }

      // Create rollback point before each stage
      await this.rollbackManager.createRollbackPoint(
        stage,
        `Before ${stage} stage execution`,
        'full_system'
      );

      // Execute stage operation
      await operation();

      // Call hooks after stage
      if (this.hooks?.afterStage) {
        await this.hooks.afterStage(stage, { migration_id: this.migrationId });
      }

      this.emit('stage_completed', { migration_id: this.migrationId, stage });

      this.logger.info(`Migration stage completed: ${stage}`);

    } catch (error) {
      this.logger.error(`Migration stage failed: ${stage}`, { error });

      // Call error hook
      if (this.hooks?.onError) {
        await this.hooks.onError(error instanceof Error ? error : new Error('Unknown error'), stage, {
          migration_id: this.migrationId
        });
      }

      throw new MigrationError(
        `Stage ${stage} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STAGE_EXECUTION_FAILED',
        stage,
        true,
        { originalError: error }
      );
    }
  }

  private async performAssessment(): Promise<void> {
    this.logger.info('Performing migration assessment');

    // Analyze legacy configuration
    const analysis = await this.configManager.analyzeLegacyConfig(
      this.config.migration.source_config_path
    );

    // Check if migration is viable
    if (analysis.analysis.estimated_effort === 'critical') {
      throw new MigrationError(
        'Migration complexity too high - manual intervention required',
        'COMPLEXITY_TOO_HIGH',
        'assessment',
        false,
        { analysis }
      );
    }

    this.logger.info('Assessment completed', {
      total_hooks: analysis.analysis.total_hooks,
      estimated_effort: analysis.analysis.estimated_effort,
      risk_factors: analysis.analysis.risk_factors.length
    });
  }

  private async performPreparation(): Promise<void> {
    this.logger.info('Performing migration preparation');

    // Create configuration backup
    await this.configManager.createConfigBackup(this.config.migration.source_config_path);

    // Analyze legacy settings
    const analysis = await this.configManager.analyzeLegacyConfig(
      this.config.migration.source_config_path
    );

    // Generate modern configuration
    const modernConfig = await this.configManager.generateModernConfig(
      analysis.settings,
      this.config.migration.target_config_path,
      {
        preserveHooks: true,
        enableParallelOperation: true
      }
    );

    // Validate compatibility
    const validation = await this.configManager.validateConfigCompatibility(
      analysis.settings,
      modernConfig
    );

    if (!validation.compatible) {
      throw new MigrationError(
        'Configuration compatibility validation failed',
        'COMPATIBILITY_FAILED',
        'preparation',
        true,
        { validation }
      );
    }

    this.logger.info('Preparation completed', {
      compatibility_score: validation.migration_readiness,
      backup_created: true
    });
  }

  private async setupParallelOperation(): Promise<void> {
    this.logger.info('Setting up parallel operation');

    // Initialize parallel operation manager
    this.parallelManager = new ParallelOperationManager(
      {
        migration_id: this.migrationId,
        ...this.config.parallel_operation
      },
      this.config.migration,
      this.logger
    );

    // Start monitoring
    this.monitor.startMonitoring();

    // Start parallel operation
    await this.parallelManager.startParallelOperation();

    // Set up event listeners
    this.parallelManager.on('emergency_switchover', (data) => {
      this.emit('emergency_switchover', data);
    });

    this.parallelManager.on('parallel_operation_stopped', (data) => {
      this.emit('parallel_operation_completed', data);
    });

    this.logger.info('Parallel operation setup completed');
  }

  private async performValidation(): Promise<void> {
    this.logger.info('Performing migration validation');

    // Load configurations for validation
    const legacySettings = JSON.parse(
      require('fs').readFileSync(this.config.migration.source_config_path, 'utf-8')
    ) as LegacySettings;

    const modernConfig = JSON.parse(
      require('fs').readFileSync(this.config.migration.target_config_path, 'utf-8')
    ) as ModernConfig;

    // Run validation tests
    const validationReport = await this.validationFramework.runCompleteValidation(
      legacySettings,
      modernConfig,
      {
        generate_report: true
      }
    );

    // Check if validation passes minimum thresholds
    if (validationReport.compatibility_analysis.overall_score < this.config.validation.compatibility_threshold) {
      throw new MigrationError(
        `Validation failed - compatibility score ${validationReport.compatibility_analysis.overall_score} below threshold ${this.config.validation.compatibility_threshold}`,
        'VALIDATION_FAILED',
        'validation',
        true,
        { validation_report: validationReport }
      );
    }

    this.logger.info('Validation completed', {
      success_rate: validationReport.test_summary.success_rate,
      compatibility_score: validationReport.compatibility_analysis.overall_score
    });
  }

  private calculateProgressPercentage(): number {
    const stageProgress = {
      'assessment': 10,
      'planning': 20,
      'preparation': 30,
      'parallel_setup': 50,
      'validation': 70,
      'switchover': 90,
      'cleanup': 100,
      'rollback': 0
    };

    return stageProgress[this.currentStage] || 0;
  }

  private calculateEstimatedCompletion(): string {
    // Simple estimation based on stage progress
    const remainingDays = this.config.parallel_operation.duration_days * 
                         (1 - this.calculateProgressPercentage() / 100);
    
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + remainingDays);
    
    return completionDate.toISOString();
  }

  private calculateTimeRemaining(): number {
    const progressPercent = this.calculateProgressPercentage();
    const totalDays = this.config.parallel_operation.duration_days;
    
    return Math.ceil((totalDays * (100 - progressPercent)) / 100 * 24 * 60); // Convert to minutes
  }

  private getCompletedStages(): MigrationStage[] {
    const allStages: MigrationStage[] = [
      'assessment', 'planning', 'preparation', 'parallel_setup', 
      'validation', 'switchover', 'cleanup'
    ];
    
    const currentIndex = allStages.indexOf(this.currentStage);
    return allStages.slice(0, currentIndex);
  }

  private getCurrentOperation(): string {
    const operations = {
      'assessment': 'Analyzing legacy configuration',
      'planning': 'Generating migration plan',
      'preparation': 'Preparing system for migration',
      'parallel_setup': 'Running parallel systems',
      'validation': 'Validating system compatibility',
      'switchover': 'Switching to MCP system',
      'cleanup': 'Cleaning up legacy components',
      'rollback': 'Rolling back to previous state'
    };

    return operations[this.currentStage] || 'Unknown operation';
  }

  private getIssuesEncountered(): Array<{
    timestamp: string;
    severity: 'warning' | 'error' | 'critical';
    description: string;
    resolution_status: 'pending' | 'resolved' | 'ignored';
  }> {
    // This would aggregate issues from all components
    return [];
  }

  private createDefaultLogger(): MigrationLogger {
    return {
      info: (message, context) => console.log(`[INFO] ${message}`, context || ''),
      warn: (message, context) => console.warn(`[WARN] ${message}`, context || ''),
      error: (message, context) => console.error(`[ERROR] ${message}`, context || ''),
      debug: (message, context) => console.debug(`[DEBUG] ${message}`, context || '')
    };
  }
}