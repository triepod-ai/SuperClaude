/**
 * SuperClaude Migration Tools - Type Definitions
 * Comprehensive types for hook-to-MCP migration process
 */

import { z } from 'zod';

// ===== Migration Configuration =====

export const MigrationModeSchema = z.enum(['analyze', 'parallel', 'migrate', 'rollback']);
export type MigrationMode = z.infer<typeof MigrationModeSchema>;

export const MigrationStageSchema = z.enum([
  'assessment',
  'planning', 
  'preparation',
  'parallel_setup',
  'validation',
  'switchover',
  'cleanup',
  'rollback'
]);
export type MigrationStage = z.infer<typeof MigrationStageSchema>;

export const MigrationConfigSchema = z.object({
  version: z.string(),
  mode: MigrationModeSchema,
  stage: MigrationStageSchema,
  timestamp: z.string(),
  source_config_path: z.string(),
  target_config_path: z.string(),
  backup_path: z.string(),
  parallel_duration_days: z.number().default(28), // 4 weeks
  rollback_enabled: z.boolean().default(true),
  monitoring_enabled: z.boolean().default(true),
  safety_checks_enabled: z.boolean().default(true),
  dry_run: z.boolean().default(false),
  advanced_options: z.object({
    preserve_performance_metrics: z.boolean().default(true),
    enable_gradual_migration: z.boolean().default(true),
    auto_fallback: z.boolean().default(true),
    compatibility_mode: z.boolean().default(true),
    validation_strictness: z.enum(['strict', 'moderate', 'relaxed']).default('moderate')
  }).optional()
});

export type MigrationConfig = z.infer<typeof MigrationConfigSchema>;

// ===== Hook System Analysis =====

export const HookConfigSchema = z.object({
  matcher: z.string(),
  hooks: z.array(z.object({
    type: z.string(),
    command: z.string(),
    timeout: z.number(),
    description: z.string()
  }))
});

export const LegacySettingsSchema = z.object({
  description: z.string(),
  version: z.string(),
  framework: z.string(),
  permissions: z.object({
    defaultMode: z.string(),
    allow: z.array(z.string()),
    deny: z.array(z.string())
  }),
  env: z.record(z.string()),
  hooks: z.object({
    PreToolUse: z.array(HookConfigSchema),
    PostToolUse: z.array(HookConfigSchema),
    SubagentStop: z.array(HookConfigSchema),
    Stop: z.array(HookConfigSchema),
    Notification: z.array(HookConfigSchema)
  }),
  mcp: z.object({
    servers: z.record(z.object({
      command: z.string(),
      args: z.array(z.string()),
      description: z.string(),
      scope: z.string()
    })),
    defaultTimeout: z.number(),
    retryAttempts: z.number(),
    enableFallbacks: z.boolean()
  }),
  superclaude: z.object({
    version: z.string(),
    framework_enabled: z.boolean(),
    hooks_directory: z.string(),
    fallback_directory: z.string(),
    wave_mode: z.object({
      enabled: z.boolean(),
      auto_detection: z.boolean(),
      max_waves: z.number(),
      performance_threshold: z.number(),
      validation_enabled: z.boolean()
    }),
    performance: z.object({
      target_execution_time: z.number(),
      monitoring_enabled: z.boolean(),
      optimization_enabled: z.boolean(),
      compression_enabled: z.boolean()
    }),
    quality_gates: z.object({
      enabled: z.boolean(),
      validation_steps: z.number(),
      coverage_threshold: z.number(),
      compliance_required: z.boolean()
    }),
    intelligence: z.object({
      compound_enabled: z.boolean(),
      context_accumulation: z.boolean(),
      synthesis_engine: z.boolean(),
      learning_enabled: z.boolean()
    })
  })
});

export type LegacySettings = z.infer<typeof LegacySettingsSchema>;

// ===== MCP Server Configuration =====

export const MCPServerConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  description: z.string(),
  scope: z.string(),
  enabled: z.boolean().default(true),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  fallback_enabled: z.boolean().default(true),
  health_check: z.object({
    enabled: z.boolean().default(true),
    interval_ms: z.number().default(60000),
    timeout_ms: z.number().default(5000)
  }).optional()
});

export const ModernConfigSchema = z.object({
  description: z.string(),
  version: z.string(),
  framework: z.string(),
  permissions: z.object({
    defaultMode: z.string(),
    allow: z.array(z.string()),
    deny: z.array(z.string())
  }),
  env: z.record(z.string()),
  mcp: z.object({
    servers: z.record(MCPServerConfigSchema),
    defaultTimeout: z.number(),
    retryAttempts: z.number(),
    enableFallbacks: z.boolean(),
    orchestration: z.object({
      enabled: z.boolean().default(true),
      coordinator_server: z.string().default('superclaude-orchestrator'),
      parallel_execution: z.boolean().default(true),
      circuit_breaker: z.object({
        enabled: z.boolean().default(true),
        failure_threshold: z.number().default(5),
        recovery_timeout: z.number().default(60000)
      })
    }).optional()
  }),
  bridge_hooks: z.object({
    enabled: z.boolean().default(true),
    dispatcher: z.string().default('superclaude_dispatcher'),
    performance_monitor: z.string().default('performance_bridge'),
    context_manager: z.string().default('context_bridge')
  }).optional(),
  superclaude: z.object({
    version: z.string(),
    mode: z.enum(['mcp', 'hybrid', 'legacy']).default('mcp'),
    migration: z.object({
      enabled: z.boolean().default(false),
      stage: MigrationStageSchema.default('assessment'),
      parallel_operation: z.boolean().default(false),
      fallback_to_hooks: z.boolean().default(true)
    }).optional()
  })
});

export type ModernConfig = z.infer<typeof ModernConfigSchema>;

// ===== Migration Analysis =====

export const HookAnalysisSchema = z.object({
  total_hooks: z.number(),
  hook_types: z.record(z.number()),
  complex_hooks: z.array(z.string()),
  performance_critical_hooks: z.array(z.string()),
  dependencies: z.array(z.object({
    hook: z.string(),
    depends_on: z.array(z.string()),
    dependency_type: z.enum(['file', 'service', 'network', 'state'])
  })),
  estimated_complexity: z.enum(['low', 'medium', 'high', 'critical']),
  migration_risks: z.array(z.object({
    type: z.enum(['performance', 'compatibility', 'data_loss', 'service_disruption']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    mitigation: z.string()
  })),
  recommended_mcp_servers: z.array(z.string())
});

export type HookAnalysis = z.infer<typeof HookAnalysisSchema>;

export const MigrationPlanSchema = z.object({
  analysis: HookAnalysisSchema,
  timeline: z.object({
    total_duration_days: z.number(),
    phases: z.array(z.object({
      name: z.string(),
      duration_days: z.number(),
      description: z.string(),
      deliverables: z.array(z.string()),
      risks: z.array(z.string())
    }))
  }),
  resource_requirements: z.object({
    disk_space_mb: z.number(),
    memory_mb: z.number(),
    cpu_usage_percent: z.number(),
    network_bandwidth_kbps: z.number()
  }),
  compatibility_matrix: z.record(z.object({
    hook_equivalent: z.string().optional(),
    mcp_server: z.string(),
    compatibility_score: z.number().min(0).max(1),
    migration_effort: z.enum(['trivial', 'easy', 'moderate', 'complex', 'manual'])
  })),
  rollback_plan: z.object({
    strategy: z.enum(['immediate', 'graceful', 'phased']),
    duration_minutes: z.number(),
    data_backup_required: z.boolean(),
    service_interruption_expected: z.boolean()
  })
});

export type MigrationPlan = z.infer<typeof MigrationPlanSchema>;

// ===== Parallel Operation Management =====

export const ServiceStateSchema = z.enum(['unknown', 'starting', 'running', 'stopping', 'stopped', 'error']);
export type ServiceState = z.infer<typeof ServiceStateSchema>;

export const ParallelOperationStateSchema = z.object({
  migration_id: z.string(),
  start_time: z.string(),
  target_end_time: z.string(),
  current_stage: MigrationStageSchema,
  hook_system: z.object({
    state: ServiceStateSchema,
    health_status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
    performance_metrics: z.object({
      avg_response_time_ms: z.number(),
      error_rate_percent: z.number(),
      throughput_ops_per_sec: z.number()
    })
  }),
  mcp_system: z.object({
    state: ServiceStateSchema,
    health_status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
    servers_online: z.array(z.string()),
    servers_offline: z.array(z.string()),
    performance_metrics: z.object({
      avg_response_time_ms: z.number(),
      error_rate_percent: z.number(),
      throughput_ops_per_sec: z.number()
    })
  }),
  traffic_split: z.object({
    hook_percentage: z.number().min(0).max(100),
    mcp_percentage: z.number().min(0).max(100),
    fallback_active: z.boolean()
  }),
  alerts: z.array(z.object({
    timestamp: z.string(),
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    component: z.enum(['hooks', 'mcp', 'bridge', 'monitoring']),
    message: z.string(),
    auto_resolved: z.boolean()
  }))
});

export type ParallelOperationState = z.infer<typeof ParallelOperationStateSchema>;

// ===== Validation and Testing =====

export const ValidationTestSchema = z.object({
  test_id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['functional', 'performance', 'integration', 'regression', 'security']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  preconditions: z.array(z.string()),
  test_steps: z.array(z.object({
    step: z.number(),
    action: z.string(),
    expected_result: z.string()
  })),
  success_criteria: z.array(z.string()),
  timeout_seconds: z.number(),
  retry_attempts: z.number()
});

export const ValidationResultSchema = z.object({
  test_id: z.string(),
  execution_time: z.string(),
  duration_ms: z.number(),
  status: z.enum(['passed', 'failed', 'skipped', 'error']),
  hook_system_result: z.object({
    success: z.boolean(),
    response_time_ms: z.number(),
    output: z.string(),
    errors: z.array(z.string())
  }).optional(),
  mcp_system_result: z.object({
    success: z.boolean(),
    response_time_ms: z.number(),
    output: z.string(),
    errors: z.array(z.string())
  }).optional(),
  comparison: z.object({
    outputs_match: z.boolean(),
    performance_delta_ms: z.number(),
    compatibility_score: z.number().min(0).max(1)
  }).optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  metadata: z.record(z.unknown()).optional()
});

export type ValidationTest = z.infer<typeof ValidationTestSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ===== Rollback Management =====

export const RollbackPointSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  stage: MigrationStageSchema,
  description: z.string(),
  config_backup_path: z.string(),
  data_backup_paths: z.array(z.string()),
  system_state: z.object({
    hook_files: z.array(z.string()),
    mcp_servers: z.array(z.string()),
    settings_checksum: z.string()
  }),
  rollback_strategy: z.enum(['config_only', 'full_system', 'selective']),
  estimated_rollback_time_minutes: z.number(),
  validation_required: z.boolean()
});

export type RollbackPoint = z.infer<typeof RollbackPointSchema>;

// ===== CLI and User Interface =====

export const CLIOptionsSchema = z.object({
  command: z.enum(['analyze', 'plan', 'migrate', 'status', 'rollback', 'validate', 'monitor']),
  config_path: z.string().optional(),
  output_path: z.string().optional(),
  dry_run: z.boolean().default(false),
  verbose: z.boolean().default(false),
  interactive: z.boolean().default(false),
  force: z.boolean().default(false),
  parallel_duration: z.number().optional(),
  rollback_point: z.string().optional(),
  monitoring_interval: z.number().optional()
});

export type CLIOptions = z.infer<typeof CLIOptionsSchema>;

// ===== Migration Status and Reporting =====

export const MigrationStatusSchema = z.object({
  migration_id: z.string(),
  current_stage: MigrationStageSchema,
  progress_percentage: z.number().min(0).max(100),
  started_at: z.string(),
  estimated_completion: z.string(),
  time_remaining_minutes: z.number(),
  stages_completed: z.array(MigrationStageSchema),
  current_operation: z.string(),
  last_checkpoint: z.string(),
  issues_encountered: z.array(z.object({
    timestamp: z.string(),
    severity: z.enum(['warning', 'error', 'critical']),
    description: z.string(),
    resolution_status: z.enum(['pending', 'resolved', 'ignored'])
  })),
  performance_impact: z.object({
    response_time_delta_ms: z.number(),
    throughput_delta_percent: z.number(),
    error_rate_delta_percent: z.number()
  }),
  system_health: z.object({
    overall_status: z.enum(['healthy', 'degraded', 'unhealthy']),
    hook_system_health: z.enum(['healthy', 'degraded', 'unhealthy', 'offline']),
    mcp_system_health: z.enum(['healthy', 'degraded', 'unhealthy', 'offline']),
    bridge_system_health: z.enum(['healthy', 'degraded', 'unhealthy', 'offline'])
  })
});

export type MigrationStatus = z.infer<typeof MigrationStatusSchema>;

// ===== Error Handling =====

export class MigrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public stage: MigrationStage,
    public recoverable: boolean = true,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public test_id: string,
    public expected: unknown,
    public actual: unknown,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RollbackError extends Error {
  constructor(
    message: string,
    public rollback_point_id: string,
    public partial_rollback: boolean = false,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RollbackError';
  }
}

// ===== Utility Types =====

export interface MigrationLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export interface ProgressReporter {
  start(total: number, message?: string): void;
  update(current: number, message?: string): void;
  complete(message?: string): void;
  fail(message?: string): void;
}

export interface MigrationHooks {
  beforeStage?(stage: MigrationStage, context: Record<string, unknown>): Promise<void>;
  afterStage?(stage: MigrationStage, context: Record<string, unknown>): Promise<void>;
  onError?(error: Error, stage: MigrationStage, context: Record<string, unknown>): Promise<void>;
  onProgress?(progress: number, stage: MigrationStage, context: Record<string, unknown>): Promise<void>;
}