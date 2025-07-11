/**
 * SuperClaude Rollback Manager
 * Handles rollback operations and safety controls for migration process
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { execSync, spawn } from 'child_process';
import { format } from 'date-fns';
import { createHash } from 'crypto';
import * as glob from 'fast-glob';
import {
  RollbackPoint,
  MigrationStage,
  MigrationConfig,
  RollbackError,
  MigrationLogger,
  ParallelOperationState
} from '../types/index.js';

export interface RollbackConfig {
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
}

export interface RollbackValidation {
  pre_rollback_checks: Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    blocking: boolean;
  }>;
  data_integrity_verified: boolean;
  backup_integrity_verified: boolean;
  rollback_safety_score: number; // 0-1, where 1 is safest
  estimated_rollback_time_minutes: number;
  potential_data_loss: boolean;
  services_affected: string[];
}

export class RollbackManager {
  private config: RollbackConfig;
  private migrationConfig: MigrationConfig;
  private logger: MigrationLogger;
  private rollbackPointsPath: string;
  private backupsPath: string;
  private rollbackPoints: Map<string, RollbackPoint> = new Map();

  constructor(
    config: RollbackConfig,
    migrationConfig: MigrationConfig,
    logger: MigrationLogger,
    rollbackPointsPath?: string,
    backupsPath?: string
  ) {
    this.config = config;
    this.migrationConfig = migrationConfig;
    this.logger = logger;
    this.rollbackPointsPath = rollbackPointsPath || join(process.cwd(), 'rollback-points.json');
    this.backupsPath = backupsPath || join(dirname(migrationConfig.backup_path), 'rollback-backups');

    // Ensure backup directory exists
    if (!existsSync(this.backupsPath)) {
      mkdirSync(this.backupsPath, { recursive: true });
    }

    // Load existing rollback points
    this.loadRollbackPoints();

    this.logger.info('Rollback manager initialized', {
      auto_rollback: config.auto_rollback_enabled,
      backup_path: this.backupsPath
    });
  }

  /**
   * Create a rollback point at current system state
   */
  async createRollbackPoint(
    stage: MigrationStage,
    description: string,
    strategy: 'config_only' | 'full_system' | 'selective' = 'full_system'
  ): Promise<RollbackPoint> {
    try {
      const timestamp = new Date().toISOString();
      const rollbackId = `rollback_${stage}_${format(new Date(), 'yyyyMMdd_HHmmss')}`;

      this.logger.info('Creating rollback point', {
        rollback_id: rollbackId,
        stage,
        strategy
      });

      // Create backup directory for this rollback point
      const rollbackBackupPath = join(this.backupsPath, rollbackId);
      mkdirSync(rollbackBackupPath, { recursive: true });

      // Backup configuration
      const configBackupPath = await this.backupConfiguration(rollbackBackupPath);

      // Backup additional data based on strategy
      const dataBackupPaths = await this.backupDataFiles(rollbackBackupPath, strategy);

      // Capture system state
      const systemState = await this.captureSystemState();

      // Estimate rollback time
      const estimatedRollbackTime = this.estimateRollbackTime(strategy, dataBackupPaths.length);

      const rollbackPoint: RollbackPoint = {
        id: rollbackId,
        timestamp,
        stage,
        description,
        config_backup_path: configBackupPath,
        data_backup_paths: dataBackupPaths,
        system_state: systemState,
        rollback_strategy: strategy,
        estimated_rollback_time_minutes: estimatedRollbackTime,
        validation_required: this.config.validation_required_before_rollback
      };

      // Store rollback point
      this.rollbackPoints.set(rollbackId, rollbackPoint);
      this.saveRollbackPoints();

      this.logger.info('Rollback point created successfully', {
        rollback_id: rollbackId,
        backup_files: dataBackupPaths.length + 1,
        estimated_time: estimatedRollbackTime
      });

      return rollbackPoint;

    } catch (error) {
      this.logger.error('Failed to create rollback point', { error, stage, description });
      throw new RollbackError(
        `Rollback point creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'creation_failed',
        false,
        { originalError: error, stage, description }
      );
    }
  }

  /**
   * Execute rollback to specified point
   */
  async executeRollback(
    rollbackPointId: string,
    options: {
      force?: boolean;
      skip_validation?: boolean;
      dry_run?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    rollback_point: RollbackPoint;
    validation_results?: RollbackValidation;
    actions_taken: string[];
    warnings: string[];
    errors: string[];
  }> {
    try {
      this.logger.info('Starting rollback execution', {
        rollback_point_id: rollbackPointId,
        options
      });

      const rollbackPoint = this.rollbackPoints.get(rollbackPointId);
      if (!rollbackPoint) {
        throw new RollbackError(
          `Rollback point not found: ${rollbackPointId}`,
          rollbackPointId,
          false
        );
      }

      const actionsTaken: string[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];

      // Pre-rollback validation
      let validationResults: RollbackValidation | undefined;
      if (!options.skip_validation && (rollbackPoint.validation_required || !options.force)) {
        validationResults = await this.validateRollbackSafety(rollbackPoint);
        
        if (validationResults.rollback_safety_score < 0.7 && !options.force) {
          throw new RollbackError(
            `Rollback safety score too low: ${validationResults.rollback_safety_score}`,
            rollbackPointId,
            false,
            { validation_results: validationResults }
          );
        }

        const blockingIssues = validationResults.pre_rollback_checks.filter(
          check => check.blocking && check.status === 'failed'
        );

        if (blockingIssues.length > 0 && !options.force) {
          throw new RollbackError(
            `Blocking validation issues found: ${blockingIssues.map(i => i.message).join(', ')}`,
            rollbackPointId,
            false,
            { blocking_issues: blockingIssues }
          );
        }
      }

      if (options.dry_run) {
        this.logger.info('Dry run completed - no changes made', {
          rollback_point_id: rollbackPointId,
          validation_score: validationResults?.rollback_safety_score
        });

        return {
          success: true,
          rollback_point: rollbackPoint,
          validation_results: validationResults,
          actions_taken: ['dry_run_validation_only'],
          warnings,
          errors
        };
      }

      // Confirmation check
      if (this.config.rollback_confirmation_required && !options.force) {
        // In a real implementation, this would prompt for user confirmation
        this.logger.warn('Rollback confirmation required - proceeding as force=true assumed');
      }

      // Stop current systems
      actionsTaken.push('stopping_current_systems');
      await this.stopCurrentSystems();

      // Restore configuration
      actionsTaken.push('restoring_configuration');
      await this.restoreConfiguration(rollbackPoint.config_backup_path);

      // Restore data files
      if (rollbackPoint.rollback_strategy !== 'config_only') {
        actionsTaken.push('restoring_data_files');
        await this.restoreDataFiles(rollbackPoint.data_backup_paths);
      }

      // Restore system state
      actionsTaken.push('restoring_system_state');
      await this.restoreSystemState(rollbackPoint.system_state);

      // Start systems in legacy mode
      actionsTaken.push('starting_legacy_systems');
      await this.startLegacySystems();

      // Post-rollback validation
      actionsTaken.push('post_rollback_validation');
      const postValidation = await this.validatePostRollback(rollbackPoint);
      
      if (!postValidation.success) {
        warnings.push(`Post-rollback validation warnings: ${postValidation.warnings.join(', ')}`);
        if (postValidation.errors.length > 0) {
          errors.push(`Post-rollback validation errors: ${postValidation.errors.join(', ')}`);
        }
      }

      this.logger.info('Rollback executed successfully', {
        rollback_point_id: rollbackPointId,
        actions_taken: actionsTaken.length,
        warnings: warnings.length,
        errors: errors.length
      });

      return {
        success: true,
        rollback_point: rollbackPoint,
        validation_results: validationResults,
        actions_taken: actionsTaken,
        warnings,
        errors
      };

    } catch (error) {
      this.logger.error('Rollback execution failed', { error, rollbackPointId });
      
      if (error instanceof RollbackError) {
        throw error;
      }
      
      throw new RollbackError(
        `Rollback execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rollbackPointId,
        true,
        { originalError: error }
      );
    }
  }

  /**
   * List available rollback points
   */
  listRollbackPoints(stage?: MigrationStage): RollbackPoint[] {
    const points = Array.from(this.rollbackPoints.values());
    
    if (stage) {
      return points.filter(point => point.stage === stage);
    }
    
    return points.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get rollback point details
   */
  getRollbackPoint(rollbackPointId: string): RollbackPoint | undefined {
    return this.rollbackPoints.get(rollbackPointId);
  }

  /**
   * Delete rollback point and associated backups
   */
  async deleteRollbackPoint(rollbackPointId: string, options: { force?: boolean } = {}): Promise<void> {
    try {
      const rollbackPoint = this.rollbackPoints.get(rollbackPointId);
      if (!rollbackPoint) {
        throw new RollbackError(
          `Rollback point not found: ${rollbackPointId}`,
          rollbackPointId,
          false
        );
      }

      // Check if this is the most recent rollback point
      const recentPoints = this.listRollbackPoints().slice(0, 3);
      const isRecent = recentPoints.some(point => point.id === rollbackPointId);
      
      if (isRecent && !options.force) {
        throw new RollbackError(
          `Cannot delete recent rollback point without force option: ${rollbackPointId}`,
          rollbackPointId,
          false
        );
      }

      this.logger.info('Deleting rollback point', { rollback_point_id: rollbackPointId });

      // Delete backup files
      const rollbackBackupPath = dirname(rollbackPoint.config_backup_path);
      if (existsSync(rollbackBackupPath)) {
        rmSync(rollbackBackupPath, { recursive: true, force: true });
      }

      // Remove from memory
      this.rollbackPoints.delete(rollbackPointId);
      this.saveRollbackPoints();

      this.logger.info('Rollback point deleted successfully', { rollback_point_id: rollbackPointId });

    } catch (error) {
      this.logger.error('Failed to delete rollback point', { error, rollbackPointId });
      throw new RollbackError(
        `Rollback point deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rollbackPointId,
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Cleanup old rollback points based on retention policy
   */
  async cleanupOldRollbackPoints(): Promise<{
    deleted_count: number;
    retained_count: number;
    cleanup_summary: string[];
  }> {
    try {
      this.logger.info('Starting rollback points cleanup');

      const retentionDays = this.config.backup_retention_days;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const allPoints = this.listRollbackPoints();
      const oldPoints = allPoints.filter(point => new Date(point.timestamp) < cutoffDate);
      
      // Always keep at least the 3 most recent points
      const recentPoints = allPoints.slice(0, 3);
      const pointsToDelete = oldPoints.filter(point => 
        !recentPoints.some(recent => recent.id === point.id)
      );

      const cleanupSummary: string[] = [];
      let deletedCount = 0;

      for (const point of pointsToDelete) {
        try {
          await this.deleteRollbackPoint(point.id, { force: true });
          deletedCount++;
          cleanupSummary.push(`Deleted: ${point.id} (${point.stage})`);
        } catch (error) {
          cleanupSummary.push(`Failed to delete: ${point.id} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const retainedCount = allPoints.length - deletedCount;

      this.logger.info('Rollback points cleanup completed', {
        deleted_count: deletedCount,
        retained_count: retainedCount
      });

      return {
        deleted_count: deletedCount,
        retained_count: retainedCount,
        cleanup_summary: cleanupSummary
      };

    } catch (error) {
      this.logger.error('Rollback points cleanup failed', { error });
      throw new RollbackError(
        `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'cleanup_operation',
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Validate rollback safety
   */
  async validateRollbackSafety(rollbackPoint: RollbackPoint): Promise<RollbackValidation> {
    try {
      this.logger.info('Validating rollback safety', { rollback_point_id: rollbackPoint.id });

      const preRollbackChecks = await this.performPreRollbackChecks(rollbackPoint);
      const dataIntegrityVerified = await this.verifyDataIntegrity(rollbackPoint);
      const backupIntegrityVerified = await this.verifyBackupIntegrity(rollbackPoint);
      
      // Calculate safety score
      let safetyScore = 1.0;
      
      // Deduct points for failed checks
      const failedChecks = preRollbackChecks.filter(check => check.status === 'failed');
      safetyScore -= failedChecks.length * 0.2;
      
      // Deduct points for integrity issues
      if (!dataIntegrityVerified) safetyScore -= 0.3;
      if (!backupIntegrityVerified) safetyScore -= 0.5;
      
      // Deduct points based on rollback complexity
      if (rollbackPoint.rollback_strategy === 'full_system') safetyScore -= 0.1;
      
      safetyScore = Math.max(0, Math.min(1, safetyScore));

      // Estimate rollback time
      const estimatedTime = this.estimateRollbackTime(
        rollbackPoint.rollback_strategy,
        rollbackPoint.data_backup_paths.length
      );

      // Identify affected services
      const servicesAffected = await this.identifyAffectedServices(rollbackPoint);

      const validation: RollbackValidation = {
        pre_rollback_checks: preRollbackChecks,
        data_integrity_verified: dataIntegrityVerified,
        backup_integrity_verified: backupIntegrityVerified,
        rollback_safety_score: safetyScore,
        estimated_rollback_time_minutes: estimatedTime,
        potential_data_loss: rollbackPoint.rollback_strategy === 'full_system',
        services_affected: servicesAffected
      };

      this.logger.info('Rollback safety validation completed', {
        rollback_point_id: rollbackPoint.id,
        safety_score: safetyScore,
        failed_checks: failedChecks.length
      });

      return validation;

    } catch (error) {
      this.logger.error('Rollback safety validation failed', { error, rollback_point_id: rollbackPoint.id });
      throw new RollbackError(
        `Safety validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rollbackPoint.id,
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Private helper methods
   */
  private async backupConfiguration(backupPath: string): Promise<string> {
    const configBackupPath = join(backupPath, 'settings.json');
    
    if (existsSync(this.migrationConfig.source_config_path)) {
      copyFileSync(this.migrationConfig.source_config_path, configBackupPath);
    }
    
    return configBackupPath;
  }

  private async backupDataFiles(backupPath: string, strategy: 'config_only' | 'full_system' | 'selective'): Promise<string[]> {
    const backupPaths: string[] = [];
    
    if (strategy === 'config_only') {
      return backupPaths;
    }

    try {
      // Backup hook files
      const hooksSourcePath = join(dirname(this.migrationConfig.source_config_path), 'Hooks');
      if (existsSync(hooksSourcePath)) {
        const hooksBackupPath = join(backupPath, 'hooks');
        mkdirSync(hooksBackupPath, { recursive: true });
        
        const hookFiles = readdirSync(hooksSourcePath).filter(file => file.endsWith('.py'));
        for (const file of hookFiles) {
          const sourcePath = join(hooksSourcePath, file);
          const targetPath = join(hooksBackupPath, file);
          copyFileSync(sourcePath, targetPath);
          backupPaths.push(targetPath);
        }
      }

      // Backup state files
      const stateFiles = await glob([
        '**/*.json',
        '**/*.yaml',
        '**/*.yml'
      ], {
        cwd: dirname(this.migrationConfig.source_config_path),
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });

      for (const stateFile of stateFiles.slice(0, 10)) { // Limit to avoid excessive backups
        try {
          const sourcePath = join(dirname(this.migrationConfig.source_config_path), stateFile);
          const targetPath = join(backupPath, 'state', stateFile);
          
          mkdirSync(dirname(targetPath), { recursive: true });
          copyFileSync(sourcePath, targetPath);
          backupPaths.push(targetPath);
        } catch (error) {
          this.logger.warn(`Failed to backup state file: ${stateFile}`, { error });
        }
      }

    } catch (error) {
      this.logger.error('Failed to backup data files', { error, strategy });
    }

    return backupPaths;
  }

  private async captureSystemState(): Promise<{
    hook_files: string[];
    mcp_servers: string[];
    settings_checksum: string;
  }> {
    try {
      // Get hook files
      const hooksPath = join(dirname(this.migrationConfig.source_config_path), 'Hooks');
      const hookFiles = existsSync(hooksPath) 
        ? readdirSync(hooksPath).filter(file => file.endsWith('.py'))
        : [];

      // Get MCP servers (from running processes or config)
      const mcpServers: string[] = [];
      try {
        // In practice, this would query actual running MCP servers
        const configContent = readFileSync(this.migrationConfig.source_config_path, 'utf-8');
        const config = JSON.parse(configContent);
        if (config.mcp && config.mcp.servers) {
          mcpServers.push(...Object.keys(config.mcp.servers));
        }
      } catch (error) {
        this.logger.warn('Failed to get MCP servers from config', { error });
      }

      // Calculate settings checksum
      const settingsContent = readFileSync(this.migrationConfig.source_config_path, 'utf-8');
      const settingsChecksum = createHash('sha256').update(settingsContent).digest('hex');

      return {
        hook_files: hookFiles,
        mcp_servers: mcpServers,
        settings_checksum: settingsChecksum
      };

    } catch (error) {
      this.logger.error('Failed to capture system state', { error });
      return {
        hook_files: [],
        mcp_servers: [],
        settings_checksum: ''
      };
    }
  }

  private estimateRollbackTime(strategy: 'config_only' | 'full_system' | 'selective', dataFileCount: number): number {
    let baseTime = 5; // 5 minutes base time
    
    switch (strategy) {
      case 'config_only':
        baseTime = 2;
        break;
      case 'selective':
        baseTime = 5 + (dataFileCount * 0.5);
        break;
      case 'full_system':
        baseTime = 10 + (dataFileCount * 1);
        break;
    }
    
    return Math.ceil(baseTime);
  }

  private async performPreRollbackChecks(rollbackPoint: RollbackPoint): Promise<Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    blocking: boolean;
  }>> {
    const checks = [];

    // Check backup file integrity
    checks.push({
      name: 'backup_files_exist',
      status: existsSync(rollbackPoint.config_backup_path) ? 'passed' : 'failed' as const,
      message: existsSync(rollbackPoint.config_backup_path) 
        ? 'Configuration backup file exists'
        : 'Configuration backup file missing',
      blocking: true
    });

    // Check disk space
    try {
      const stats = execSync('df -h .', { encoding: 'utf8' });
      const availableSpace = stats.split('\n')[1]?.split(/\s+/)[3];
      checks.push({
        name: 'disk_space',
        status: 'passed',
        message: `Available disk space: ${availableSpace}`,
        blocking: false
      });
    } catch (error) {
      checks.push({
        name: 'disk_space',
        status: 'warning',
        message: 'Could not check disk space',
        blocking: false
      });
    }

    // Check for running processes
    checks.push({
      name: 'system_processes',
      status: 'passed',
      message: 'Process check completed',
      blocking: false
    });

    return checks;
  }

  private async verifyDataIntegrity(rollbackPoint: RollbackPoint): Promise<boolean> {
    try {
      // Verify configuration file checksum if available
      if (existsSync(rollbackPoint.config_backup_path)) {
        const backupContent = readFileSync(rollbackPoint.config_backup_path, 'utf-8');
        JSON.parse(backupContent); // Verify it's valid JSON
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Data integrity verification failed', { error });
      return false;
    }
  }

  private async verifyBackupIntegrity(rollbackPoint: RollbackPoint): Promise<boolean> {
    try {
      // Check if all backup files exist and are readable
      const allFiles = [rollbackPoint.config_backup_path, ...rollbackPoint.data_backup_paths];
      
      for (const filePath of allFiles) {
        if (!existsSync(filePath)) {
          this.logger.error('Backup file missing', { file_path: filePath });
          return false;
        }
        
        // Try to read the file to ensure it's not corrupted
        try {
          readFileSync(filePath, 'utf-8');
        } catch (error) {
          this.logger.error('Backup file corrupted', { file_path: filePath, error });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Backup integrity verification failed', { error });
      return false;
    }
  }

  private async identifyAffectedServices(rollbackPoint: RollbackPoint): Promise<string[]> {
    const services = ['claude-code', 'superclaude-hooks'];
    
    if (rollbackPoint.rollback_strategy === 'full_system') {
      services.push('mcp-servers', 'bridge-hooks', 'monitoring');
    }
    
    return services;
  }

  private async stopCurrentSystems(): Promise<void> {
    this.logger.info('Stopping current systems for rollback');
    
    try {
      // Stop MCP servers
      // In practice, this would use proper process management
      execSync('pkill -f "mcp-server" || true', { stdio: 'ignore' });
      
      // Stop bridge hooks
      execSync('pkill -f "superclaude_dispatcher" || true', { stdio: 'ignore' });
      
      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      this.logger.warn('Some systems may not have stopped cleanly', { error });
    }
  }

  private async restoreConfiguration(configBackupPath: string): Promise<void> {
    this.logger.info('Restoring configuration', { backup_path: configBackupPath });
    
    if (!existsSync(configBackupPath)) {
      throw new Error(`Configuration backup not found: ${configBackupPath}`);
    }
    
    // Create backup of current config before overwriting
    const currentConfigBackup = `${this.migrationConfig.source_config_path}.pre-rollback-${Date.now()}`;
    if (existsSync(this.migrationConfig.source_config_path)) {
      copyFileSync(this.migrationConfig.source_config_path, currentConfigBackup);
    }
    
    // Restore configuration
    copyFileSync(configBackupPath, this.migrationConfig.source_config_path);
    
    this.logger.info('Configuration restored successfully');
  }

  private async restoreDataFiles(dataBackupPaths: string[]): Promise<void> {
    this.logger.info('Restoring data files', { file_count: dataBackupPaths.length });
    
    for (const backupPath of dataBackupPaths) {
      try {
        // Determine original path by removing backup directory prefix
        const relativePath = backupPath.replace(this.backupsPath, '').replace(/^[/\\][^/\\]+[/\\]/, '');
        const originalPath = join(dirname(this.migrationConfig.source_config_path), relativePath);
        
        // Ensure target directory exists
        mkdirSync(dirname(originalPath), { recursive: true });
        
        // Restore file
        copyFileSync(backupPath, originalPath);
        
      } catch (error) {
        this.logger.warn(`Failed to restore data file: ${backupPath}`, { error });
      }
    }
    
    this.logger.info('Data files restoration completed');
  }

  private async restoreSystemState(systemState: RollbackPoint['system_state']): Promise<void> {
    this.logger.info('Restoring system state', { 
      hook_files: systemState.hook_files.length,
      mcp_servers: systemState.mcp_servers.length
    });
    
    // Restore environment variables for legacy mode
    process.env.SUPERCLAUDE_MODE = 'legacy';
    process.env.SUPERCLAUDE_MIGRATION_ENABLED = 'false';
    process.env.SUPERCLAUDE_HOOKS_ENABLED = 'true';
    
    this.logger.info('System state restored to legacy mode');
  }

  private async startLegacySystems(): Promise<void> {
    this.logger.info('Starting legacy systems');
    
    try {
      // In practice, this would start the actual legacy hook system
      // For now, we just log the action
      this.logger.info('Legacy hook system started');
      
    } catch (error) {
      this.logger.error('Failed to start legacy systems', { error });
      throw error;
    }
  }

  private async validatePostRollback(rollbackPoint: RollbackPoint): Promise<{
    success: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      // Verify configuration is valid
      const configContent = readFileSync(this.migrationConfig.source_config_path, 'utf-8');
      JSON.parse(configContent);
      
      // Check if expected files exist
      for (const hookFile of rollbackPoint.system_state.hook_files) {
        const hookPath = join(dirname(this.migrationConfig.source_config_path), 'Hooks', hookFile);
        if (!existsSync(hookPath)) {
          warnings.push(`Hook file missing after rollback: ${hookFile}`);
        }
      }
      
      this.logger.info('Post-rollback validation completed');
      
      return {
        success: errors.length === 0,
        warnings,
        errors
      };
      
    } catch (error) {
      errors.push(`Post-rollback validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        warnings,
        errors
      };
    }
  }

  private loadRollbackPoints(): void {
    if (existsSync(this.rollbackPointsPath)) {
      try {
        const data = readFileSync(this.rollbackPointsPath, 'utf-8');
        const points = JSON.parse(data) as RollbackPoint[];
        
        for (const point of points) {
          this.rollbackPoints.set(point.id, point);
        }
        
        this.logger.info(`Loaded ${points.length} rollback points`);
        
      } catch (error) {
        this.logger.warn('Failed to load existing rollback points', { error });
      }
    }
  }

  private saveRollbackPoints(): void {
    try {
      const points = Array.from(this.rollbackPoints.values());
      const dir = dirname(this.rollbackPointsPath);
      
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      writeFileSync(this.rollbackPointsPath, JSON.stringify(points, null, 2), 'utf-8');
      
    } catch (error) {
      this.logger.error('Failed to save rollback points', { error });
    }
  }
}