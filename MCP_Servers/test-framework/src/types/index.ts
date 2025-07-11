/**
 * SuperClaude Test Framework Types
 */

// Test Suite Types
export interface TestSuite {
  name: string;
  description: string;
  version: string;
  phase: 'phase1' | 'phase2' | 'phase3' | 'all';
  category: 'unit' | 'integration' | 'e2e' | 'performance' | 'regression' | 'migration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
  retries?: number;
  dependencies?: string[];
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  timeout?: number;
  retries?: number;
  prerequisites?: string[];
  execute: () => Promise<TestResult>;
  validate?: (result: TestResult) => boolean;
  metadata?: Record<string, any>;
}

export interface TestResult {
  testId: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  startTime: Date;
  endTime: Date;
  output?: string;
  error?: string;
  metrics?: PerformanceMetrics;
  coverage?: CoverageMetrics;
  assertions?: AssertionResult[];
  metadata?: Record<string, any>;
}

export interface AssertionResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  message?: string;
}

// Performance Testing Types
export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
  throughput?: number;
  errorRate: number;
  successRate: number;
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  customMetrics?: Record<string, number>;
}

export interface BenchmarkResult {
  name: string;
  operation: string;
  samples: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  opsPerSec: number;
  rme: number; // Relative margin of error
  baseline?: BenchmarkResult;
  regression?: {
    detected: boolean;
    threshold: number;
    actual: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface LoadTestConfig {
  concurrency: number;
  duration: number;
  rampUp: number;
  rampDown: number;
  requests: number;
  interval: number;
  target: string;
  payloads?: any[];
}

// Coverage Types
export interface CoverageMetrics {
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
}

// MCP Server Testing Types
export interface MCPServerTestConfig {
  name: string;
  url: string;
  version: string;
  phase: string;
  capabilities: string[];
  healthCheck: {
    endpoint: string;
    expectedStatus: number;
    timeout: number;
  };
  authentication?: {
    type: 'none' | 'token' | 'oauth';
    credentials?: Record<string, string>;
  };
}

export interface MCPRequest {
  id: string;
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface MCPResponse {
  id: string;
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Integration Testing Types
export interface IntegrationTestScenario {
  name: string;
  description: string;
  servers: string[];
  sequence: IntegrationStep[];
  expectedOutcome: any;
  timeout: number;
}

export interface IntegrationStep {
  server: string;
  action: string;
  payload?: any;
  expectedResponse?: any;
  delay?: number;
  timeout?: number;
}

// Migration Testing Types
export interface MigrationTestConfig {
  hookSystemEndpoint: string;
  mcpSystemEndpoint: string;
  comparisonThreshold: number;
  featureParity: string[];
  performanceBaseline: PerformanceMetrics;
}

export interface MigrationValidationResult {
  functionalParity: {
    score: number;
    passed: boolean;
    failures: string[];
  };
  performanceParity: {
    score: number;
    passed: boolean;
    regressions: Array<{
      metric: string;
      baseline: number;
      current: number;
      degradation: number;
    }>;
  };
  featureParity: {
    score: number;
    passed: boolean;
    missing: string[];
  };
  overallScore: number;
  migrationReady: boolean;
}

// Test Execution Types
export interface TestExecutionConfig {
  parallel: boolean;
  maxConcurrency: number;
  timeout: number;
  retries: number;
  bailOnError: boolean;
  collectCoverage: boolean;
  generateReport: boolean;
  outputFormat: 'json' | 'html' | 'text' | 'xml';
  tags?: string[];
  suites?: string[];
  pattern?: string;
}

export interface TestExecutionResult {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    duration: number;
    successRate: number;
  };
  suites: Array<{
    name: string;
    status: 'passed' | 'failed' | 'error';
    duration: number;
    tests: TestResult[];
  }>;
  coverage?: CoverageMetrics;
  performance?: {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    throughput: number;
  };
  regression?: {
    detected: boolean;
    count: number;
    critical: number;
    details: BenchmarkResult[];
  };
  timestamp: Date;
  environment: string;
  metadata: Record<string, any>;
}

// Validation and Quality Types
export interface QualityGate {
  name: string;
  threshold: number;
  metric: string;
  operator: 'gte' | 'lte' | 'eq' | 'ne';
  critical: boolean;
}

export interface QualityReport {
  gates: Array<{
    gate: QualityGate;
    value: number;
    passed: boolean;
    message: string;
  }>;
  overallPassed: boolean;
  score: number;
  recommendations: string[];
}

// Error Types
export class TestFrameworkError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'TestFrameworkError';
  }
}

export class TestExecutionError extends TestFrameworkError {
  constructor(message: string, context?: any) {
    super(message, 'TEST_EXECUTION_ERROR', context);
  }
}

export class PerformanceRegressionError extends TestFrameworkError {
  constructor(message: string, context?: any) {
    super(message, 'PERFORMANCE_REGRESSION_ERROR', context);
  }
}

export class ValidationError extends TestFrameworkError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

// Constants
export const TEST_CATEGORIES = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  E2E: 'e2e',
  PERFORMANCE: 'performance',
  REGRESSION: 'regression',
  MIGRATION: 'migration'
} as const;

export const TEST_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const TEST_STATUSES = {
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  ERROR: 'error'
} as const;

export const PHASE3_SERVERS = {
  QUALITY: 'superclaude-quality',
  PERFORMANCE: 'superclaude-performance'
} as const;

export const ALL_SERVERS = {
  TASKS: 'superclaude-tasks',
  ORCHESTRATOR: 'superclaude-orchestrator',
  CODE: 'superclaude-code',
  INTELLIGENCE: 'superclaude-intelligence',
  UI: 'superclaude-ui',
  QUALITY: 'superclaude-quality',
  PERFORMANCE: 'superclaude-performance'
} as const;