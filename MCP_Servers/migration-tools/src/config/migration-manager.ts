/**
 * SuperClaude Migration Configuration Manager
 * Handles configuration migration from hooks to MCP servers
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { format } from 'date-fns';
import * as semver from 'semver';
import { z } from 'zod';
import {
  MigrationConfig,
  LegacySettings,
  ModernConfig,
  MigrationConfigSchema,
  LegacySettingsSchema,
  ModernConfigSchema,
  MigrationError,
  MigrationStage,
  MCPServerConfigSchema
} from '../types/index.js';

export class MigrationConfigManager {
  private config: MigrationConfig;
  private logger: (level: string, message: string, context?: Record<string, unknown>) => void;

  constructor(
    config: MigrationConfig,
    logger?: (level: string, message: string, context?: Record<string, unknown>) => void
  ) {
    this.config = MigrationConfigSchema.parse(config);
    this.logger = logger || ((level, message) => console.log(`[${level}] ${message}`));
  }

  /**
   * Analyze legacy hook configuration
   */
  async analyzeLegacyConfig(configPath: string): Promise<{
    settings: LegacySettings;
    analysis: {
      total_hooks: number;
      hook_complexity: Record<string, number>;
      mcp_servers_present: string[];
      migration_recommendations: string[];
      estimated_effort: 'low' | 'medium' | 'high' | 'critical';
      risk_factors: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
      }>;
    };
  }> {
    try {
      this.logger('info', 'Analyzing legacy configuration', { configPath });

      if (!existsSync(configPath)) {
        throw new MigrationError(
          `Configuration file not found: ${configPath}`,
          'CONFIG_NOT_FOUND',
          'assessment'
        );
      }

      const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      const settings = LegacySettingsSchema.parse(rawConfig);

      // Analyze hook complexity
      const hookAnalysis = this.analyzeHookComplexity(settings);
      
      // Check for existing MCP servers
      const mcpServers = Object.keys(settings.mcp?.servers || {});
      
      // Generate migration recommendations
      const recommendations = this.generateMigrationRecommendations(settings, hookAnalysis);
      
      // Assess risk factors
      const riskFactors = this.assessRiskFactors(settings, hookAnalysis);
      
      // Estimate migration effort
      const estimatedEffort = this.estimateMigrationEffort(hookAnalysis, riskFactors);

      return {
        settings,
        analysis: {
          total_hooks: hookAnalysis.totalHooks,
          hook_complexity: hookAnalysis.complexityByType,
          mcp_servers_present: mcpServers,
          migration_recommendations: recommendations,
          estimated_effort: estimatedEffort,
          risk_factors: riskFactors
        }
      };

    } catch (error) {
      this.logger('error', 'Failed to analyze legacy configuration', { error, configPath });
      throw new MigrationError(
        `Configuration analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_FAILED',
        'assessment',
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Generate modern MCP configuration from legacy settings
   */
  async generateModernConfig(
    legacySettings: LegacySettings,
    targetPath: string,
    options: {
      preserveHooks?: boolean;
      enableParallelOperation?: boolean;
      customMCPServers?: Record<string, any>;
    } = {}
  ): Promise<ModernConfig> {
    try {
      this.logger('info', 'Generating modern MCP configuration', { 
        targetPath, 
        options 
      });

      // Base configuration structure
      const modernConfig: ModernConfig = {
        description: `${legacySettings.description} - Migrated to MCP Architecture`,
        version: this.bumpVersion(legacySettings.version),
        framework: 'superclaude-mcp',
        
        // Preserve permissions with MCP-specific additions
        permissions: {
          ...legacySettings.permissions,
          allow: [
            ...legacySettings.permissions.allow,
            'mcp__superclaude-tasks__*',
            'mcp__superclaude-orchestrator__*',
            'mcp__superclaude-code__*',
            'mcp__superclaude-quality__*',
            'mcp__superclaude-performance__*'
          ]
        },

        // Update environment variables
        env: {
          ...legacySettings.env,
          SUPERCLAUDE_MODE: 'mcp',
          SUPERCLAUDE_MIGRATION_ENABLED: 'true',
          SUPERCLAUDE_BRIDGE_HOOKS_ENABLED: options.preserveHooks ? 'true' : 'false',
          SUPERCLAUDE_PARALLEL_OPERATION: options.enableParallelOperation ? 'true' : 'false'
        },

        // Enhanced MCP configuration
        mcp: {
          servers: {
            // Core SuperClaude MCP servers
            'superclaude-tasks': {
              name: 'superclaude-tasks',
              command: 'npx',
              args: ['@superclaude/tasks-server'],
              description: 'Task management and workflow orchestration',
              scope: 'user',
              enabled: true,
              priority: 'high',
              timeout: 30000,
              retries: 3,
              fallback_enabled: true,
              health_check: {
                enabled: true,
                interval_ms: 60000,
                timeout_ms: 5000
              }
            },
            'superclaude-orchestrator': {
              name: 'superclaude-orchestrator',
              command: 'npx',
              args: ['@superclaude/orchestrator-server'],
              description: 'Multi-model coordination and wave management',
              scope: 'user',
              enabled: true,
              priority: 'critical',
              timeout: 45000,
              retries: 2,
              fallback_enabled: true,
              health_check: {
                enabled: true,
                interval_ms: 30000,
                timeout_ms: 10000
              }
            },
            'superclaude-code': {
              name: 'superclaude-code',
              command: 'npx',
              args: ['@superclaude/code-server'],
              description: 'LSP semantic analysis and symbol-level editing',
              scope: 'user',
              enabled: true,
              priority: 'medium',
              timeout: 60000,
              retries: 3,
              fallback_enabled: true
            },
            'superclaude-quality': {
              name: 'superclaude-quality',
              command: 'npx',
              args: ['@superclaude/quality-server'],
              description: 'Enhanced validation and semantic integration',
              scope: 'user',
              enabled: true,
              priority: 'medium',
              timeout: 30000,
              retries: 3,
              fallback_enabled: true
            },
            'superclaude-performance': {
              name: 'superclaude-performance',
              command: 'npx',
              args: ['@superclaude/performance-server'],
              description: 'Complexity estimation and advanced monitoring',
              scope: 'user',
              enabled: true,
              priority: 'medium',
              timeout: 15000,
              retries: 5,
              fallback_enabled: true
            },

            // Preserve existing MCP servers
            ...this.preserveExistingMCPServers(legacySettings),
            
            // Add custom servers if provided
            ...options.customMCPServers
          },
          
          defaultTimeout: legacySettings.mcp?.defaultTimeout || 30000,
          retryAttempts: legacySettings.mcp?.retryAttempts || 3,
          enableFallbacks: legacySettings.mcp?.enableFallbacks !== false,
          
          orchestration: {
            enabled: true,
            coordinator_server: 'superclaude-orchestrator',
            parallel_execution: true,
            circuit_breaker: {
              enabled: true,
              failure_threshold: 5,
              recovery_timeout: 60000
            }
          }
        },

        // Bridge hooks configuration (if preserving hooks)
        bridge_hooks: options.preserveHooks ? {
          enabled: true,
          dispatcher: 'superclaude_dispatcher',
          performance_monitor: 'performance_bridge',
          context_manager: 'context_bridge'
        } : undefined,

        // Modern SuperClaude configuration
        superclaude: {
          version: this.bumpVersion(legacySettings.superclaude.version),
          mode: options.enableParallelOperation ? 'hybrid' : 'mcp',
          migration: {
            enabled: true,
            stage: 'preparation',
            parallel_operation: options.enableParallelOperation || false,
            fallback_to_hooks: options.preserveHooks || false
          }
        }
      };

      // Validate the generated configuration
      const validatedConfig = ModernConfigSchema.parse(modernConfig);

      // Write to target path
      if (targetPath) {
        this.writeConfigFile(targetPath, validatedConfig);
      }

      this.logger('info', 'Modern configuration generated successfully', {
        targetPath,
        serversConfigured: Object.keys(validatedConfig.mcp.servers).length
      });

      return validatedConfig;

    } catch (error) {
      this.logger('error', 'Failed to generate modern configuration', { error, targetPath });
      throw new MigrationError(
        `Configuration generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        'preparation',
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Create backup of existing configuration
   */
  async createConfigBackup(sourcePath: string, backupDir?: string): Promise<string> {
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const backupPath = backupDir || join(dirname(sourcePath), 'backups');
      
      if (!existsSync(backupPath)) {
        mkdirSync(backupPath, { recursive: true });
      }
      
      const backupFileName = `${basename(sourcePath, '.json')}_backup_${timestamp}.json`;
      const backupFilePath = join(backupPath, backupFileName);
      
      copyFileSync(sourcePath, backupFilePath);
      
      this.logger('info', 'Configuration backup created', { 
        source: sourcePath,
        backup: backupFilePath 
      });
      
      return backupFilePath;
      
    } catch (error) {
      this.logger('error', 'Failed to create configuration backup', { error, sourcePath });
      throw new MigrationError(
        `Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BACKUP_FAILED',
        'preparation',
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Validate configuration compatibility
   */
  async validateConfigCompatibility(
    legacyConfig: LegacySettings,
    modernConfig: ModernConfig
  ): Promise<{
    compatible: boolean;
    issues: Array<{
      type: 'warning' | 'error' | 'critical';
      component: string;
      description: string;
      recommendation: string;
    }>;
    migration_readiness: 'ready' | 'needs_preparation' | 'blocked';
  }> {
    const issues: Array<{
      type: 'warning' | 'error' | 'critical';
      component: string;
      description: string;
      recommendation: string;
    }> = [];

    // Check version compatibility
    if (!semver.gte(modernConfig.version, legacyConfig.version)) {
      issues.push({
        type: 'warning',
        component: 'version',
        description: 'Modern config version is lower than legacy version',
        recommendation: 'Verify version numbering strategy'
      });
    }

    // Check permission compatibility
    const missingPermissions = legacyConfig.permissions.allow.filter(
      perm => !modernConfig.permissions.allow.includes(perm)
    );
    
    if (missingPermissions.length > 0) {
      issues.push({
        type: 'error',
        component: 'permissions',
        description: `Missing permissions in modern config: ${missingPermissions.join(', ')}`,
        recommendation: 'Add missing permissions to modern configuration'
      });
    }

    // Check MCP server availability
    const requiredServers = ['superclaude-tasks', 'superclaude-orchestrator'];
    const missingServers = requiredServers.filter(
      server => !modernConfig.mcp.servers[server]
    );

    if (missingServers.length > 0) {
      issues.push({
        type: 'critical',
        component: 'mcp_servers',
        description: `Critical MCP servers missing: ${missingServers.join(', ')}`,
        recommendation: 'Install and configure missing MCP servers'
      });
    }

    // Check environment variable compatibility
    const criticalEnvVars = ['CLAUDE_CODE_SUPERCLAUDE', 'SUPERCLAUDE_VERSION'];
    const missingEnvVars = criticalEnvVars.filter(
      envVar => !modernConfig.env[envVar] && legacyConfig.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      issues.push({
        type: 'warning',
        component: 'environment',
        description: `Environment variables not preserved: ${missingEnvVars.join(', ')}`,
        recommendation: 'Review and preserve critical environment variables'
      });
    }

    // Determine migration readiness
    const criticalIssues = issues.filter(issue => issue.type === 'critical');
    const errorIssues = issues.filter(issue => issue.type === 'error');
    
    let migrationReadiness: 'ready' | 'needs_preparation' | 'blocked' = 'ready';
    
    if (criticalIssues.length > 0) {
      migrationReadiness = 'blocked';
    } else if (errorIssues.length > 0) {
      migrationReadiness = 'needs_preparation';
    }

    return {
      compatible: criticalIssues.length === 0,
      issues,
      migration_readiness: migrationReadiness
    };
  }

  /**
   * Private helper methods
   */
  private analyzeHookComplexity(settings: LegacySettings) {
    const hookTypes = ['PreToolUse', 'PostToolUse', 'SubagentStop', 'Stop', 'Notification'];
    let totalHooks = 0;
    const complexityByType: Record<string, number> = {};

    for (const hookType of hookTypes) {
      const hooks = settings.hooks?.[hookType as keyof typeof settings.hooks] || [];
      const typeComplexity = hooks.reduce((acc, hook) => {
        // Calculate complexity based on timeout, command complexity, and matcher specificity
        let complexity = 1;
        if (hook.timeout > 10000) complexity += 2;
        if (hook.command.includes('||')) complexity += 1;
        if (hook.matcher === '*') complexity += 1;
        return acc + complexity;
      }, 0);
      
      complexityByType[hookType] = typeComplexity;
      totalHooks += hooks.length;
    }

    return {
      totalHooks,
      complexityByType
    };
  }

  private generateMigrationRecommendations(
    settings: LegacySettings,
    hookAnalysis: ReturnType<typeof this.analyzeHookComplexity>
  ): string[] {
    const recommendations: string[] = [];

    if (hookAnalysis.totalHooks > 20) {
      recommendations.push('Consider phased migration due to high hook complexity');
    }

    if (hookAnalysis.complexityByType.PreToolUse > 10) {
      recommendations.push('Pre-tool hooks are complex - implement comprehensive testing');
    }

    if (Object.keys(settings.mcp?.servers || {}).length === 0) {
      recommendations.push('No existing MCP servers - fresh MCP installation required');
    }

    if (settings.superclaude?.performance?.target_execution_time < 100) {
      recommendations.push('Aggressive performance targets - monitor latency during migration');
    }

    return recommendations;
  }

  private assessRiskFactors(
    settings: LegacySettings,
    hookAnalysis: ReturnType<typeof this.analyzeHookComplexity>
  ) {
    const riskFactors: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }> = [];

    // High hook complexity risk
    if (hookAnalysis.totalHooks > 30) {
      riskFactors.push({
        type: 'complexity',
        severity: 'high',
        description: 'Very high number of hooks increases migration complexity'
      });
    }

    // Performance risk
    if (settings.superclaude?.performance?.target_execution_time < 50) {
      riskFactors.push({
        type: 'performance',
        severity: 'medium',
        description: 'Aggressive performance targets may be difficult to maintain'
      });
    }

    // Dependency risk
    const hasCustomHooks = Object.values(hookAnalysis.complexityByType).some(c => c > 5);
    if (hasCustomHooks) {
      riskFactors.push({
        type: 'dependencies',
        severity: 'medium',
        description: 'Complex custom hooks may have hidden dependencies'
      });
    }

    return riskFactors;
  }

  private estimateMigrationEffort(
    hookAnalysis: ReturnType<typeof this.analyzeHookComplexity>,
    riskFactors: ReturnType<typeof this.assessRiskFactors>
  ): 'low' | 'medium' | 'high' | 'critical' {
    let effortScore = 0;

    // Base effort from hook count
    if (hookAnalysis.totalHooks > 30) effortScore += 3;
    else if (hookAnalysis.totalHooks > 15) effortScore += 2;
    else if (hookAnalysis.totalHooks > 5) effortScore += 1;

    // Additional effort from complexity
    const totalComplexity = Object.values(hookAnalysis.complexityByType).reduce((a, b) => a + b, 0);
    if (totalComplexity > 50) effortScore += 3;
    else if (totalComplexity > 25) effortScore += 2;
    else if (totalComplexity > 10) effortScore += 1;

    // Risk factor impact
    const criticalRisks = riskFactors.filter(r => r.severity === 'critical').length;
    const highRisks = riskFactors.filter(r => r.severity === 'high').length;
    
    effortScore += criticalRisks * 4 + highRisks * 2;

    // Map score to effort level
    if (effortScore >= 10) return 'critical';
    if (effortScore >= 6) return 'high';
    if (effortScore >= 3) return 'medium';
    return 'low';
  }

  private preserveExistingMCPServers(settings: LegacySettings): Record<string, any> {
    const existingServers: Record<string, any> = {};
    
    if (settings.mcp?.servers) {
      for (const [name, config] of Object.entries(settings.mcp.servers)) {
        try {
          existingServers[name] = MCPServerConfigSchema.parse({
            name,
            ...config,
            enabled: true,
            priority: 'medium',
            timeout: 30000,
            retries: 3,
            fallback_enabled: true
          });
        } catch (error) {
          this.logger('warn', `Failed to preserve MCP server config: ${name}`, { error });
        }
      }
    }
    
    return existingServers;
  }

  private bumpVersion(version: string): string {
    try {
      return semver.inc(version, 'minor') || version;
    } catch {
      return version;
    }
  }

  private writeConfigFile(path: string, config: ModernConfig): void {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
  }
}