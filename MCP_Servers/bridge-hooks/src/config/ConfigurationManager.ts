/**
 * Configuration Manager
 * Environment-specific configuration for bridge-hooks deployment
 */

import { logger } from '@superclaude/shared';
import { BridgeHookConfig } from '../types.js';

export type DeploymentEnvironment = 'development' | 'staging' | 'production' | 'testing';

export interface EnvironmentConfig extends BridgeHookConfig {
  deployment: {
    environment: DeploymentEnvironment;
    region?: string;
    version: string;
    features: string[];
  };
  security: {
    enableEncryption: boolean;
    enableAuditLogging: boolean;
    sensitiveDataHandling: 'strict' | 'moderate' | 'permissive';
  };
  monitoring: {
    enableTracing: boolean;
    enableMetrics: boolean;
    alertingThresholds: {
      errorRate: number;
      responseTime: number;
      memoryUsage: number;
    };
  };
  resources: {
    maxMemoryMB: number;
    maxCpuPercent: number;
    maxDiskMB: number;
    connectionPoolSize: number;
  };
}

/**
 * Manages environment-specific configuration for bridge-hooks
 */
export class ConfigurationManager {
  private currentConfig: EnvironmentConfig;
  private configOverrides: Partial<EnvironmentConfig> = {};
  private readonly environment: DeploymentEnvironment;

  constructor(environment?: DeploymentEnvironment) {
    this.environment = environment || this.detectEnvironment();
    this.currentConfig = this.loadEnvironmentConfig(this.environment);
    
    logger.info('Configuration Manager initialized', { 
      environment: this.environment,
      version: this.currentConfig.deployment.version 
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): EnvironmentConfig {
    return { ...this.currentConfig, ...this.configOverrides };
  }

  /**
   * Update configuration with runtime overrides
   */
  updateConfig(overrides: Partial<EnvironmentConfig>): void {
    this.configOverrides = { ...this.configOverrides, ...overrides };
    logger.info('Configuration updated with runtime overrides', { overrides });
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(): {
    environment: DeploymentEnvironment;
    isProduction: boolean;
    isDevelopment: boolean;
    enableDebug: boolean;
    enableProfiling: boolean;
  } {
    return {
      environment: this.environment,
      isProduction: this.environment === 'production',
      isDevelopment: this.environment === 'development',
      enableDebug: this.environment === 'development' || this.environment === 'testing',
      enableProfiling: this.environment !== 'production',
    };
  }

  /**
   * Get configuration for specific component
   */
  getComponentConfig(component: 'claudeCode' | 'mcpRouter' | 'performance' | 'context'): any {
    const config = this.getConfig();
    
    switch (component) {
      case 'claudeCode':
        return {
          enabled: config.claudeCodeIntegration.enabled,
          sessionTracking: config.claudeCodeIntegration.sessionTrackingEnabled,
          toolEventBuffer: config.claudeCodeIntegration.toolEventBuffer,
          contextTTL: config.claudeCodeIntegration.contextPreservationTTL,
        };
      
      case 'mcpRouter':
        return {
          enabled: config.mcpRouting.enabled,
          fallbackTimeout: config.mcpRouting.fallbackTimeout,
          healthCheckInterval: config.mcpRouting.healthCheckInterval,
          loadBalancing: config.mcpRouting.loadBalancing,
        };
      
      case 'performance':
        return {
          target: config.performanceTarget,
          enableMetrics: config.enableMetrics,
          enableCaching: config.enableCaching,
          alertingThresholds: config.monitoring.alertingThresholds,
        };
      
      case 'context':
        return {
          sessionTracking: config.claudeCodeIntegration.sessionTrackingEnabled,
          contextTTL: config.claudeCodeIntegration.contextPreservationTTL,
          cacheSize: config.cacheSize,
        };
      
      default:
        return {};
    }
  }

  /**
   * Validate current configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    // Validate performance targets
    if (config.performanceTarget <= 0 || config.performanceTarget > 10000) {
      errors.push('Performance target must be between 1ms and 10000ms');
    }

    // Validate concurrent operations
    if (config.maxConcurrentHooks <= 0 || config.maxConcurrentHooks > 100) {
      errors.push('Max concurrent hooks must be between 1 and 100');
    }

    // Validate cache size
    if (config.cacheSize <= 0 || config.cacheSize > 100000) {
      errors.push('Cache size must be between 1 and 100000');
    }

    // Validate resource limits
    if (config.resources.maxMemoryMB <= 0 || config.resources.maxMemoryMB > 16384) {
      errors.push('Max memory must be between 1MB and 16GB');
    }

    // Environment-specific validations
    if (this.environment === 'production') {
      if (config.logLevel === 'debug') {
        errors.push('Debug logging should not be enabled in production');
      }
      
      if (!config.security.enableEncryption) {
        errors.push('Encryption should be enabled in production');
      }
      
      if (!config.monitoring.enableMetrics) {
        errors.push('Metrics should be enabled in production');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export configuration for backup/sharing
   */
  exportConfig(): string {
    const config = this.getConfig();
    return JSON.stringify({
      ...config,
      exportedAt: new Date().toISOString(),
      exportedBy: 'ConfigurationManager',
    }, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfig(configData: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(configData);
      
      // Validate imported config structure
      if (!parsed.deployment || !parsed.security || !parsed.monitoring) {
        return { success: false, error: 'Invalid configuration structure' };
      }

      // Apply imported config as overrides
      this.updateConfig(parsed);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ===================== PRIVATE IMPLEMENTATION =====================

  private detectEnvironment(): DeploymentEnvironment {
    // Check environment variables
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const deployEnv = process.env.DEPLOY_ENV?.toLowerCase();
    
    if (deployEnv) {
      switch (deployEnv) {
        case 'prod':
        case 'production':
          return 'production';
        case 'stage':
        case 'staging':
          return 'staging';
        case 'test':
        case 'testing':
          return 'testing';
        case 'dev':
        case 'development':
          return 'development';
      }
    }

    if (nodeEnv) {
      switch (nodeEnv) {
        case 'production':
          return 'production';
        case 'staging':
          return 'staging';
        case 'test':
          return 'testing';
        case 'development':
        default:
          return 'development';
      }
    }

    // Default to development
    return 'development';
  }

  private loadEnvironmentConfig(environment: DeploymentEnvironment): EnvironmentConfig {
    const baseConfig: EnvironmentConfig = {
      // Basic settings
      enableMetrics: true,
      enableCaching: true,
      timeout: 30000,
      maxRetries: 3,
      logLevel: 'info',
      
      // Performance settings
      performanceTarget: 100,
      maxConcurrentHooks: 10,
      cacheSize: 1000,
      
      // Claude Code integration
      claudeCodeIntegration: {
        enabled: true,
        toolEventBuffer: 50,
        sessionTrackingEnabled: true,
        contextPreservationTTL: 1800,
      },
      
      // MCP server routing
      mcpRouting: {
        enabled: true,
        fallbackTimeout: 5000,
        healthCheckInterval: 30000,
        loadBalancing: 'least-loaded',
      },
      
      // Environment settings
      environment: {
        development: environment === 'development',
        maxDebugOutput: 1000,
        enableDetailedMetrics: environment !== 'production',
      },

      // Deployment info
      deployment: {
        environment,
        version: '1.0.0',
        features: ['claude-code-integration', 'mcp-routing', 'performance-monitoring'],
      },

      // Security settings
      security: {
        enableEncryption: environment === 'production',
        enableAuditLogging: environment === 'production' || environment === 'staging',
        sensitiveDataHandling: environment === 'production' ? 'strict' : 'moderate',
      },

      // Monitoring settings
      monitoring: {
        enableTracing: environment !== 'production',
        enableMetrics: true,
        alertingThresholds: {
          errorRate: environment === 'production' ? 0.01 : 0.05, // 1% or 5%
          responseTime: environment === 'production' ? 100 : 200, // ms
          memoryUsage: environment === 'production' ? 512 : 1024, // MB
        },
      },

      // Resource limits
      resources: {
        maxMemoryMB: environment === 'production' ? 512 : 1024,
        maxCpuPercent: environment === 'production' ? 50 : 80,
        maxDiskMB: 100,
        connectionPoolSize: environment === 'production' ? 20 : 10,
      },
    };

    // Environment-specific overrides
    switch (environment) {
      case 'development':
        return {
          ...baseConfig,
          logLevel: 'debug',
          performanceTarget: 200, // More relaxed
          enableCaching: false, // Disable for fresh results
          maxConcurrentHooks: 5,
          deployment: {
            ...baseConfig.deployment,
            features: [...baseConfig.deployment.features, 'debug-mode', 'hot-reload'],
          },
        };

      case 'testing':
        return {
          ...baseConfig,
          logLevel: 'warn',
          performanceTarget: 50, // Strict for testing
          timeout: 10000, // Shorter timeouts
          maxRetries: 1,
          claudeCodeIntegration: {
            ...baseConfig.claudeCodeIntegration,
            contextPreservationTTL: 300, // 5 minutes
          },
          deployment: {
            ...baseConfig.deployment,
            features: [...baseConfig.deployment.features, 'test-mode'],
          },
        };

      case 'staging':
        return {
          ...baseConfig,
          performanceTarget: 75, // Production-like but slightly relaxed
          security: {
            ...baseConfig.security,
            enableEncryption: true,
            sensitiveDataHandling: 'strict',
          },
          deployment: {
            ...baseConfig.deployment,
            features: [...baseConfig.deployment.features, 'staging-mode'],
          },
        };

      case 'production':
        return {
          ...baseConfig,
          logLevel: 'warn',
          performanceTarget: 50, // Strict performance requirements
          maxRetries: 5, // More retries for resilience
          security: {
            enableEncryption: true,
            enableAuditLogging: true,
            sensitiveDataHandling: 'strict',
          },
          monitoring: {
            enableTracing: false, // Disable tracing for performance
            enableMetrics: true,
            alertingThresholds: {
              errorRate: 0.005, // 0.5%
              responseTime: 50, // 50ms
              memoryUsage: 256, // 256MB
            },
          },
          resources: {
            maxMemoryMB: 256,
            maxCpuPercent: 30,
            maxDiskMB: 50,
            connectionPoolSize: 50,
          },
          deployment: {
            ...baseConfig.deployment,
            features: [...baseConfig.deployment.features, 'production-mode', 'high-availability'],
          },
        };

      default:
        return baseConfig;
    }
  }
}

/**
 * Global configuration instance
 */
let globalConfigManager: ConfigurationManager | null = null;

/**
 * Get global configuration manager instance
 */
export function getConfigurationManager(environment?: DeploymentEnvironment): ConfigurationManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigurationManager(environment);
  }
  return globalConfigManager;
}

/**
 * Reset global configuration manager (useful for testing)
 */
export function resetConfigurationManager(): void {
  globalConfigManager = null;
}

/**
 * Quick configuration presets for common scenarios
 */
export const ConfigurationPresets = {
  /**
   * High-performance configuration for production workloads
   */
  highPerformance: (): Partial<EnvironmentConfig> => ({
    performanceTarget: 25,
    maxConcurrentHooks: 20,
    enableCaching: true,
    cacheSize: 5000,
    mcpRouting: {
      enabled: true,
      fallbackTimeout: 2000,
      healthCheckInterval: 15000,
      loadBalancing: 'least-loaded',
    },
    resources: {
      maxMemoryMB: 1024,
      maxCpuPercent: 80,
      maxDiskMB: 200,
      connectionPoolSize: 100,
    },
  }),

  /**
   * Development-friendly configuration with debugging
   */
  development: (): Partial<EnvironmentConfig> => ({
    logLevel: 'debug',
    performanceTarget: 500,
    enableCaching: false,
    maxConcurrentHooks: 3,
    environment: {
      development: true,
      maxDebugOutput: 5000,
      enableDetailedMetrics: true,
    },
    monitoring: {
      enableTracing: true,
      enableMetrics: true,
      alertingThresholds: {
        errorRate: 0.1, // 10%
        responseTime: 1000, // 1s
        memoryUsage: 2048, // 2GB
      },
    },
  }),

  /**
   * Minimal configuration for resource-constrained environments
   */
  minimal: (): Partial<EnvironmentConfig> => ({
    performanceTarget: 200,
    maxConcurrentHooks: 2,
    enableCaching: true,
    cacheSize: 100,
    timeout: 15000,
    maxRetries: 1,
    resources: {
      maxMemoryMB: 128,
      maxCpuPercent: 50,
      maxDiskMB: 25,
      connectionPoolSize: 5,
    },
  }),

  /**
   * Testing configuration with strict performance requirements
   */
  testing: (): Partial<EnvironmentConfig> => ({
    performanceTarget: 50,
    timeout: 5000,
    maxRetries: 0, // No retries in testing
    logLevel: 'warn',
    claudeCodeIntegration: {
      enabled: true,
      toolEventBuffer: 10,
      sessionTrackingEnabled: false, // Disable for isolated tests
      contextPreservationTTL: 60, // 1 minute
    },
  }),
};