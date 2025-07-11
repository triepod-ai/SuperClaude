/**
 * Type definitions for SuperClaude Performance MCP Server
 */

import { z } from 'zod';

// ======================= CORE PERFORMANCE TYPES =======================

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  tokenUsage: number;
  successRate: number;
  errorRate: number;
  timestamp: Date;
  operationId: string;
  serverName?: string;
}

export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  nesting: number;
  maintainability: number;
  testability: number;
  lines: number;
  functions: number;
  classes: number;
  dependencies: number;
  coupling: number;
  cohesion: number;
}

export interface PerformanceBenchmark {
  operation: string;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  sampleSize: number;
  timestamp: Date;
}

export interface BottleneckInfo {
  id: string;
  type: 'cpu' | 'memory' | 'io' | 'network' | 'algorithm' | 'lock';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: {
    file: string;
    line: number;
    function?: string;
  };
  impact: {
    performanceDegradation: number;
    userExperience: 'minimal' | 'moderate' | 'significant' | 'severe';
    resourceConsumption: number;
  };
  suggestions: string[];
  estimatedFixTime: number; // in hours
  confidence: number; // 0-1
}

export interface OptimizationOpportunity {
  id: string;
  type: 'algorithm' | 'caching' | 'parallelization' | 'memory' | 'io' | 'database';
  title: string;
  description: string;
  expectedGain: {
    executionTime: number; // percentage improvement
    memoryUsage: number;
    cpuUsage: number;
  };
  implementationComplexity: 'low' | 'medium' | 'high';
  estimatedEffort: number; // in hours
  prerequisites: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
}

// ======================= MONITORING TYPES =======================

export interface MonitoringConfig {
  enableRealTimeTracking: boolean;
  samplingRate: number; // 0-1, percentage of operations to sample
  alertThresholds: {
    executionTime: number; // ms
    memoryUsage: number; // bytes
    cpuUsage: number; // percentage
    errorRate: number; // percentage
  };
  retentionPeriod: number; // days
  aggregationInterval: number; // seconds
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'error' | 'resource' | 'threshold';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}

export interface PerformanceProfile {
  name: string;
  description: string;
  baselineMetrics: PerformanceMetrics;
  currentMetrics: PerformanceMetrics;
  trend: 'improving' | 'stable' | 'degrading';
  lastUpdated: Date;
  samples: number;
}

// ======================= COMPLEXITY ESTIMATION =======================

export interface ComplexityEstimation {
  overall: number; // 0-1 scale
  categories: {
    algorithmic: number;
    structural: number;
    cognitive: number;
    maintenance: number;
  };
  factors: ComplexityFactor[];
  recommendations: string[];
  estimatedDevelopmentTime: number; // hours
  estimatedTestingTime: number; // hours
  riskAssessment: RiskAssessment;
}

export interface ComplexityFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

export interface RiskAssessment {
  overall: number; // 0-1 scale
  categories: {
    technical: number;
    timeline: number;
    resource: number;
    integration: number;
  };
  mitigationStrategies: string[];
}

// ======================= CROSS-SERVER OPTIMIZATION =======================

export interface CrossServerMetrics {
  serverId: string;
  serverName: string;
  metrics: PerformanceMetrics[];
  bottlenecks: BottleneckInfo[];
  lastUpdated: Date;
}

export interface OptimizationPlan {
  id: string;
  title: string;
  description: string;
  targetServers: string[];
  phases: OptimizationPhase[];
  expectedOutcome: {
    performanceGain: number;
    resourceSavings: number;
    timelineReduction: number;
  };
  estimatedImplementationTime: number; // hours
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

export interface OptimizationPhase {
  name: string;
  description: string;
  dependencies: string[];
  estimatedDuration: number; // hours
  tasks: OptimizationTask[];
}

export interface OptimizationTask {
  id: string;
  name: string;
  description: string;
  type: 'code' | 'configuration' | 'infrastructure' | 'monitoring';
  effort: number; // hours
  impact: number; // 1-10 scale
}

// ======================= INPUT/OUTPUT SCHEMAS =======================

export const EstimateComplexityInputSchema = z.object({
  target: z.string().describe('File path, directory, or code snippet to analyze'),
  type: z.enum(['file', 'directory', 'project', 'snippet']).default('file'),
  includeTests: z.boolean().default(true),
  includeDependencies: z.boolean().default(true),
  language: z.string().optional()
});

export const MonitorPerformanceInputSchema = z.object({
  target: z.string().describe('Operation or server to monitor'),
  duration: z.number().default(3600), // seconds
  samplingRate: z.number().min(0).max(1).default(0.1),
  includeBaseline: z.boolean().default(true),
  alertOnThresholds: z.boolean().default(true)
});

export const AnalyzeBottlenecksInputSchema = z.object({
  target: z.string().describe('System or component to analyze'),
  scope: z.enum(['file', 'module', 'service', 'system']).default('module'),
  includeHistorical: z.boolean().default(true),
  minimumSeverity: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

export const OptimizePerformanceInputSchema = z.object({
  target: z.string().describe('Target for optimization'),
  type: z.enum(['algorithm', 'memory', 'io', 'network', 'database']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  constraints: z.object({
    maxImplementationTime: z.number().optional(), // hours
    riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
    availableResources: z.array(z.string()).default([])
  }).default({})
});

export const BenchmarkPerformanceInputSchema = z.object({
  operation: z.string().describe('Operation to benchmark'),
  iterations: z.number().default(100),
  warmupIterations: z.number().default(10),
  includeVariance: z.boolean().default(true),
  compareToBaseline: z.boolean().default(true)
});

// ======================= RESULT TYPES =======================

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ComplexityEstimationResult extends MCPToolResult {
  data?: {
    estimation: ComplexityEstimation;
    metrics: ComplexityMetrics;
    breakdown: ComplexityFactor[];
    recommendations: string[];
  };
}

export interface PerformanceMonitoringResult extends MCPToolResult {
  data?: {
    profile: PerformanceProfile;
    alerts: Alert[];
    trends: PerformanceTrend[];
    summary: PerformanceSummary;
  };
}

export interface BottleneckAnalysisResult extends MCPToolResult {
  data?: {
    bottlenecks: BottleneckInfo[];
    opportunities: OptimizationOpportunity[];
    impact: PerformanceImpact;
    prioritizedActions: PrioritizedAction[];
  };
}

export interface OptimizationResult extends MCPToolResult {
  data?: {
    plan: OptimizationPlan;
    estimatedGains: PerformanceGains;
    timeline: OptimizationTimeline;
    riskAssessment: RiskAssessment;
  };
}

export interface BenchmarkResult extends MCPToolResult {
  data?: {
    benchmark: PerformanceBenchmark;
    comparison?: BenchmarkComparison;
    trends: PerformanceTrend[];
    insights: BenchmarkInsight[];
  };
}

// ======================= SUPPORTING TYPES =======================

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  timeframe: string;
  significance: 'low' | 'medium' | 'high';
}

export interface PerformanceSummary {
  overallScore: number; // 0-100
  categories: {
    speed: number;
    efficiency: number;
    reliability: number;
    scalability: number;
  };
  recommendations: string[];
  criticalIssues: number;
}

export interface PerformanceImpact {
  userExperience: number; // 0-100 score
  resourceCost: number; // percentage increase
  scalabilityLimitation: number; // 0-100 score
  maintainabilityImpact: number; // 0-100 score
}

export interface PrioritizedAction {
  action: string;
  priority: number; // 1-10
  effort: number; // hours
  impact: number; // 1-10
  roi: number; // return on investment
}

export interface PerformanceGains {
  executionTime: number; // percentage improvement
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  latency: number;
}

export interface OptimizationTimeline {
  phases: OptimizationPhase[];
  milestones: Milestone[];
  totalDuration: number; // hours
  criticalPath: string[];
}

export interface Milestone {
  name: string;
  date: Date;
  deliverables: string[];
  success_criteria: string[];
}

export interface BenchmarkComparison {
  baseline: PerformanceBenchmark;
  current: PerformanceBenchmark;
  improvement: number; // percentage
  regression: boolean;
  significance: 'low' | 'medium' | 'high';
}

export interface BenchmarkInsight {
  type: 'pattern' | 'anomaly' | 'opportunity' | 'warning';
  message: string;
  confidence: number; // 0-1
  actionable: boolean;
  recommendation?: string;
}

// ======================= ERROR TYPES =======================

export class PerformanceServerError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PerformanceServerError';
  }
}

export class ComplexityEstimationError extends PerformanceServerError {
  constructor(message: string) {
    super(message, 'COMPLEXITY_ESTIMATION_ERROR');
    this.name = 'ComplexityEstimationError';
  }
}

export class MonitoringError extends PerformanceServerError {
  constructor(message: string) {
    super(message, 'MONITORING_ERROR');
    this.name = 'MonitoringError';
  }
}

export class OptimizationError extends PerformanceServerError {
  constructor(message: string) {
    super(message, 'OPTIMIZATION_ERROR');
    this.name = 'OptimizationError';
  }
}

export class BenchmarkingError extends PerformanceServerError {
  constructor(message: string) {
    super(message, 'BENCHMARKING_ERROR');
    this.name = 'BenchmarkingError';
  }
}

// ======================= TYPE EXPORTS =======================

export type {
  EstimateComplexityInputSchema as EstimateComplexityInput,
  MonitorPerformanceInputSchema as MonitorPerformanceInput,
  AnalyzeBottlenecksInputSchema as AnalyzeBottlenecksInput,
  OptimizePerformanceInputSchema as OptimizePerformanceInput,
  BenchmarkPerformanceInputSchema as BenchmarkPerformanceInput
};

// Default configuration
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableRealTimeTracking: true,
  samplingRate: 0.1,
  alertThresholds: {
    executionTime: 5000, // 5 seconds
    memoryUsage: 1024 * 1024 * 100, // 100MB
    cpuUsage: 80, // 80%
    errorRate: 5 // 5%
  },
  retentionPeriod: 30, // 30 days
  aggregationInterval: 60 // 1 minute
};