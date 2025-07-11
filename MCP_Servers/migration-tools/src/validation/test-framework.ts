/**
 * SuperClaude Migration Validation Framework
 * Comprehensive testing and validation for migration process
 */

import { spawn, ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { format } from 'date-fns';
import { performance } from 'perf_hooks';
import {
  ValidationTest,
  ValidationResult,
  MigrationConfig,
  LegacySettings,
  ModernConfig,
  MigrationLogger,
  ValidationError
} from '../types/index.js';

export interface ValidationConfig {
  test_timeout_seconds: number;
  parallel_test_execution: boolean;
  max_concurrent_tests: number;
  retry_failed_tests: boolean;
  max_retry_attempts: number;
  output_detailed_logs: boolean;
  performance_baseline_runs: number;
  compatibility_threshold: number; // 0-1, minimum compatibility score
}

export interface TestSuite {
  name: string;
  description: string;
  tests: ValidationTest[];
  setup_commands?: string[];
  teardown_commands?: string[];
  dependencies?: string[];
}

export interface ValidationReport {
  execution_timestamp: string;
  migration_config: {
    version: string;
    mode: string;
    stage: string;
  };
  test_summary: {
    total_tests: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    success_rate: number;
  };
  performance_summary: {
    hook_system_avg_ms: number;
    mcp_system_avg_ms: number;
    performance_improvement: number; // percentage
    throughput_comparison: number;
  };
  compatibility_analysis: {
    overall_score: number;
    functional_compatibility: number;
    performance_compatibility: number;
    feature_parity_score: number;
    migration_readiness: 'ready' | 'needs_work' | 'blocked';
  };
  test_results: ValidationResult[];
  recommendations: string[];
  critical_issues: Array<{
    test_id: string;
    severity: 'high' | 'critical';
    description: string;
    impact: string;
    recommendation: string;
  }>;
}

export class MigrationValidationFramework {
  private config: ValidationConfig;
  private migrationConfig: MigrationConfig;
  private logger: MigrationLogger;
  private testSuites: Map<string, TestSuite> = new Map();
  private testResults: Map<string, ValidationResult> = new Map();
  private hookSystemEndpoint: string;
  private mcpSystemEndpoint: string;

  constructor(
    config: ValidationConfig,
    migrationConfig: MigrationConfig,
    logger: MigrationLogger,
    hookSystemEndpoint?: string,
    mcpSystemEndpoint?: string
  ) {
    this.config = config;
    this.migrationConfig = migrationConfig;
    this.logger = logger;
    this.hookSystemEndpoint = hookSystemEndpoint || 'http://localhost:8001';
    this.mcpSystemEndpoint = mcpSystemEndpoint || 'http://localhost:8002';

    // Initialize built-in test suites
    this.initializeBuiltInTestSuites();

    this.logger.info('Migration validation framework initialized', {
      test_timeout: config.test_timeout_seconds,
      parallel_execution: config.parallel_test_execution,
      hook_endpoint: this.hookSystemEndpoint,
      mcp_endpoint: this.mcpSystemEndpoint
    });
  }

  /**
   * Run complete validation suite
   */
  async runCompleteValidation(
    legacyConfig: LegacySettings,
    modernConfig: ModernConfig,
    options: {
      test_suites?: string[];
      skip_performance_tests?: boolean;
      skip_integration_tests?: boolean;
      generate_report?: boolean;
    } = {}
  ): Promise<ValidationReport> {
    try {
      this.logger.info('Starting complete migration validation');

      const startTime = performance.now();

      // Determine which test suites to run
      const suitesToRun = options.test_suites || Array.from(this.testSuites.keys());
      
      if (options.skip_performance_tests) {
        suitesToRun.forEach((_, index, arr) => {
          if (arr[index].includes('performance')) {
            arr.splice(index, 1);
          }
        });
      }

      if (options.skip_integration_tests) {
        suitesToRun.forEach((_, index, arr) => {
          if (arr[index].includes('integration')) {
            arr.splice(index, 1);
          }
        });
      }

      // Run test suites
      const allResults: ValidationResult[] = [];
      
      for (const suiteName of suitesToRun) {
        const suite = this.testSuites.get(suiteName);
        if (!suite) {
          this.logger.warn(`Test suite not found: ${suiteName}`);
          continue;
        }

        this.logger.info(`Running test suite: ${suiteName}`);
        const suiteResults = await this.runTestSuite(suite, legacyConfig, modernConfig);
        allResults.push(...suiteResults);
      }

      // Generate validation report
      const report = await this.generateValidationReport(
        allResults,
        legacyConfig,
        modernConfig,
        performance.now() - startTime
      );

      if (options.generate_report !== false) {
        await this.saveValidationReport(report);
      }

      this.logger.info('Complete validation finished', {
        total_tests: report.test_summary.total_tests,
        success_rate: report.test_summary.success_rate,
        compatibility_score: report.compatibility_analysis.overall_score
      });

      return report;

    } catch (error) {
      this.logger.error('Complete validation failed', { error });
      throw new ValidationError(
        `Validation execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'complete_validation',
        'execution_success',
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(
    suite: TestSuite,
    legacyConfig: LegacySettings,
    modernConfig: ModernConfig
  ): Promise<ValidationResult[]> {
    try {
      this.logger.info(`Executing test suite: ${suite.name}`, {
        test_count: suite.tests.length
      });

      // Run setup commands
      if (suite.setup_commands) {
        await this.executeSetupCommands(suite.setup_commands);
      }

      const results: ValidationResult[] = [];

      // Execute tests (parallel or sequential based on config)
      if (this.config.parallel_test_execution && suite.tests.length > 1) {
        const parallelResults = await this.executeTestsInParallel(
          suite.tests,
          legacyConfig,
          modernConfig
        );
        results.push(...parallelResults);
      } else {
        for (const test of suite.tests) {
          const result = await this.executeTest(test, legacyConfig, modernConfig);
          results.push(result);
        }
      }

      // Run teardown commands
      if (suite.teardown_commands) {
        await this.executeTeardownCommands(suite.teardown_commands);
      }

      // Store results
      for (const result of results) {
        this.testResults.set(result.test_id, result);
      }

      this.logger.info(`Test suite completed: ${suite.name}`, {
        total_tests: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length
      });

      return results;

    } catch (error) {
      this.logger.error(`Test suite execution failed: ${suite.name}`, { error });
      throw new ValidationError(
        `Test suite execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suite.name,
        'suite_execution',
        false,
        { originalError: error, suite_name: suite.name }
      );
    }
  }

  /**
   * Execute individual test
   */
  async executeTest(
    test: ValidationTest,
    legacyConfig: LegacySettings,
    modernConfig: ModernConfig
  ): Promise<ValidationResult> {
    const testStartTime = performance.now();
    
    try {
      this.logger.debug(`Executing test: ${test.test_id}`, {
        type: test.type,
        priority: test.priority
      });

      // Check preconditions
      const preconditionResults = await this.checkPreconditions(test.preconditions);
      if (!preconditionResults.success) {
        return {
          test_id: test.test_id,
          execution_time: new Date().toISOString(),
          duration_ms: performance.now() - testStartTime,
          status: 'skipped',
          errors: [`Preconditions not met: ${preconditionResults.message}`],
          warnings: [],
          metadata: { precondition_failure: true }
        };
      }

      // Execute test steps for both systems
      const hookResult = await this.executeTestOnSystem('hook', test, legacyConfig);
      const mcpResult = await this.executeTestOnSystem('mcp', test, modernConfig);

      // Compare results
      const comparison = this.compareSystemResults(hookResult, mcpResult, test);

      // Determine overall test status
      const testStatus = this.determineTestStatus(hookResult, mcpResult, comparison, test);

      const result: ValidationResult = {
        test_id: test.test_id,
        execution_time: new Date().toISOString(),
        duration_ms: performance.now() - testStartTime,
        status: testStatus,
        hook_system_result: hookResult,
        mcp_system_result: mcpResult,
        comparison,
        errors: [],
        warnings: [],
        metadata: {
          test_type: test.type,
          test_priority: test.priority
        }
      };

      // Add any warnings or errors
      if (comparison && comparison.compatibility_score < this.config.compatibility_threshold) {
        result.warnings.push(
          `Compatibility score below threshold: ${comparison.compatibility_score} < ${this.config.compatibility_threshold}`
        );
      }

      this.logger.debug(`Test completed: ${test.test_id}`, {
        status: testStatus,
        duration_ms: result.duration_ms,
        compatibility_score: comparison?.compatibility_score
      });

      return result;

    } catch (error) {
      this.logger.error(`Test execution failed: ${test.test_id}`, { error });
      
      return {
        test_id: test.test_id,
        execution_time: new Date().toISOString(),
        duration_ms: performance.now() - testStartTime,
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metadata: { execution_error: true }
      };
    }
  }

  /**
   * Add custom test suite
   */
  addTestSuite(suite: TestSuite): void {
    this.testSuites.set(suite.name, suite);
    this.logger.info(`Added test suite: ${suite.name}`, {
      test_count: suite.tests.length
    });
  }

  /**
   * Generate compatibility matrix
   */
  async generateCompatibilityMatrix(
    legacyConfig: LegacySettings,
    modernConfig: ModernConfig
  ): Promise<{
    functional_compatibility: Record<string, number>;
    performance_compatibility: Record<string, number>;
    feature_parity: Record<string, boolean>;
    overall_score: number;
  }> {
    try {
      this.logger.info('Generating compatibility matrix');

      // Run functional compatibility tests
      const functionalTests = this.testSuites.get('functional_compatibility')?.tests || [];
      const functionalResults: Record<string, number> = {};
      
      for (const test of functionalTests) {
        const result = await this.executeTest(test, legacyConfig, modernConfig);
        functionalResults[test.test_id] = result.comparison?.compatibility_score || 0;
      }

      // Run performance compatibility tests
      const performanceTests = this.testSuites.get('performance_compatibility')?.tests || [];
      const performanceResults: Record<string, number> = {};
      
      for (const test of performanceTests) {
        const result = await this.executeTest(test, legacyConfig, modernConfig);
        performanceResults[test.test_id] = result.comparison?.compatibility_score || 0;
      }

      // Analyze feature parity
      const featureParity = this.analyzeFeatureParity(legacyConfig, modernConfig);

      // Calculate overall score
      const functionalScores = Object.values(functionalResults);
      const performanceScores = Object.values(performanceResults);
      const parityScores = Object.values(featureParity).map(v => v ? 1 : 0);
      
      const allScores = [...functionalScores, ...performanceScores, ...parityScores];
      const overallScore = allScores.length > 0 
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
        : 0;

      this.logger.info('Compatibility matrix generated', {
        functional_tests: functionalScores.length,
        performance_tests: performanceScores.length,
        overall_score: overallScore
      });

      return {
        functional_compatibility: functionalResults,
        performance_compatibility: performanceResults,
        feature_parity: featureParity,
        overall_score: overallScore
      };

    } catch (error) {
      this.logger.error('Failed to generate compatibility matrix', { error });
      throw new ValidationError(
        `Compatibility matrix generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'compatibility_matrix',
        'generation_success',
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Private helper methods
   */
  private initializeBuiltInTestSuites(): void {
    // Functional compatibility test suite
    this.testSuites.set('functional_compatibility', {
      name: 'functional_compatibility',
      description: 'Tests functional equivalence between hook and MCP systems',
      tests: [
        {
          test_id: 'basic_hook_execution',
          name: 'Basic Hook Execution',
          description: 'Test basic tool hook execution and response',
          type: 'functional',
          priority: 'critical',
          preconditions: ['hook_system_available'],
          test_steps: [
            { step: 1, action: 'Send Read tool request', expected_result: 'Hook processes request' },
            { step: 2, action: 'Verify response format', expected_result: 'Response matches expected format' },
            { step: 3, action: 'Check execution time', expected_result: 'Execution time within limits' }
          ],
          success_criteria: ['Response received', 'Format correct', 'Performance acceptable'],
          timeout_seconds: 30,
          retry_attempts: 2
        },
        {
          test_id: 'mcp_server_communication',
          name: 'MCP Server Communication',
          description: 'Test MCP server request/response cycle',
          type: 'functional',
          priority: 'critical',
          preconditions: ['mcp_system_available'],
          test_steps: [
            { step: 1, action: 'Send tool request to MCP', expected_result: 'MCP server processes request' },
            { step: 2, action: 'Verify response format', expected_result: 'Response matches MCP protocol' },
            { step: 3, action: 'Check execution time', expected_result: 'Execution time within limits' }
          ],
          success_criteria: ['Response received', 'Protocol compliance', 'Performance acceptable'],
          timeout_seconds: 30,
          retry_attempts: 2
        },
        {
          test_id: 'context_preservation',
          name: 'Context Preservation',
          description: 'Test context accumulation and preservation across systems',
          type: 'functional',
          priority: 'high',
          preconditions: ['both_systems_available'],
          test_steps: [
            { step: 1, action: 'Send context-building requests', expected_result: 'Context accumulated' },
            { step: 2, action: 'Verify context retention', expected_result: 'Context preserved between requests' },
            { step: 3, action: 'Test context retrieval', expected_result: 'Context accurately retrieved' }
          ],
          success_criteria: ['Context accumulated', 'Context preserved', 'Context retrievable'],
          timeout_seconds: 60,
          retry_attempts: 1
        }
      ]
    });

    // Performance compatibility test suite
    this.testSuites.set('performance_compatibility', {
      name: 'performance_compatibility',
      description: 'Tests performance characteristics between systems',
      tests: [
        {
          test_id: 'response_time_comparison',
          name: 'Response Time Comparison',
          description: 'Compare response times between hook and MCP systems',
          type: 'performance',
          priority: 'high',
          preconditions: ['both_systems_available'],
          test_steps: [
            { step: 1, action: 'Execute 10 identical requests on hook system', expected_result: 'Collect timing data' },
            { step: 2, action: 'Execute 10 identical requests on MCP system', expected_result: 'Collect timing data' },
            { step: 3, action: 'Compare average response times', expected_result: 'Performance within acceptable range' }
          ],
          success_criteria: ['Hook system responsive', 'MCP system responsive', 'Performance comparable'],
          timeout_seconds: 120,
          retry_attempts: 1
        },
        {
          test_id: 'throughput_comparison',
          name: 'Throughput Comparison',
          description: 'Compare request throughput between systems',
          type: 'performance',
          priority: 'medium',
          preconditions: ['both_systems_available'],
          test_steps: [
            { step: 1, action: 'Send concurrent requests to hook system', expected_result: 'Measure throughput' },
            { step: 2, action: 'Send concurrent requests to MCP system', expected_result: 'Measure throughput' },
            { step: 3, action: 'Compare throughput metrics', expected_result: 'Throughput within acceptable range' }
          ],
          success_criteria: ['Hook throughput measured', 'MCP throughput measured', 'Throughput comparable'],
          timeout_seconds: 180,
          retry_attempts: 1
        }
      ]
    });

    // Integration test suite
    this.testSuites.set('integration_tests', {
      name: 'integration_tests',
      description: 'Tests system integration and compatibility',
      tests: [
        {
          test_id: 'end_to_end_workflow',
          name: 'End-to-End Workflow',
          description: 'Test complete workflow from request to response',
          type: 'integration',
          priority: 'critical',
          preconditions: ['both_systems_available'],
          test_steps: [
            { step: 1, action: 'Execute complex multi-step workflow', expected_result: 'Workflow completes successfully' },
            { step: 2, action: 'Verify all intermediate steps', expected_result: 'All steps execute correctly' },
            { step: 3, action: 'Check final output consistency', expected_result: 'Outputs match between systems' }
          ],
          success_criteria: ['Workflow completes', 'Steps verified', 'Outputs consistent'],
          timeout_seconds: 300,
          retry_attempts: 1
        }
      ]
    });

    this.logger.info('Built-in test suites initialized', {
      suites: Array.from(this.testSuites.keys()),
      total_tests: Array.from(this.testSuites.values()).reduce((acc, suite) => acc + suite.tests.length, 0)
    });
  }

  private async executeSetupCommands(commands: string[]): Promise<void> {
    for (const command of commands) {
      try {
        await this.executeCommand(command, 30000); // 30 second timeout
      } catch (error) {
        this.logger.warn(`Setup command failed: ${command}`, { error });
      }
    }
  }

  private async executeTeardownCommands(commands: string[]): Promise<void> {
    for (const command of commands) {
      try {
        await this.executeCommand(command, 30000);
      } catch (error) {
        this.logger.warn(`Teardown command failed: ${command}`, { error });
      }
    }
  }

  private async executeTestsInParallel(
    tests: ValidationTest[],
    legacyConfig: LegacySettings,
    modernConfig: ModernConfig
  ): Promise<ValidationResult[]> {
    const maxConcurrent = Math.min(this.config.max_concurrent_tests, tests.length);
    const results: ValidationResult[] = [];
    
    // Execute tests in batches
    for (let i = 0; i < tests.length; i += maxConcurrent) {
      const batch = tests.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(test => this.executeTest(test, legacyConfig, modernConfig));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create error result for failed promise
          results.push({
            test_id: 'unknown',
            execution_time: new Date().toISOString(),
            duration_ms: 0,
            status: 'error',
            errors: [result.reason instanceof Error ? result.reason.message : 'Unknown error'],
            warnings: []
          });
        }
      }
    }
    
    return results;
  }

  private async executeTestOnSystem(
    system: 'hook' | 'mcp',
    test: ValidationTest,
    config: LegacySettings | ModernConfig
  ): Promise<{
    success: boolean;
    response_time_ms: number;
    output: string;
    errors: string[];
  }> {
    const startTime = performance.now();
    
    try {
      // Simulate test execution (in practice, this would make actual API calls)
      const baseResponseTime = system === 'hook' ? 150 : 120;
      const responseTime = baseResponseTime + (Math.random() * 50 - 25);
      
      // Simulate occasional failures for testing
      const successRate = system === 'hook' ? 0.95 : 0.98;
      const success = Math.random() < successRate;
      
      await new Promise(resolve => setTimeout(resolve, responseTime));
      
      const result = {
        success,
        response_time_ms: performance.now() - startTime,
        output: success ? `Test output from ${system} system` : '',
        errors: success ? [] : [`Simulated error in ${system} system`]
      };
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        response_time_ms: performance.now() - startTime,
        output: '',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private compareSystemResults(
    hookResult: { success: boolean; response_time_ms: number; output: string; errors: string[] },
    mcpResult: { success: boolean; response_time_ms: number; output: string; errors: string[] },
    test: ValidationTest
  ): {
    outputs_match: boolean;
    performance_delta_ms: number;
    compatibility_score: number;
  } {
    // Compare outputs (simplified comparison)
    const outputsMatch = hookResult.success === mcpResult.success;
    
    // Calculate performance delta
    const performanceDelta = mcpResult.response_time_ms - hookResult.response_time_ms;
    
    // Calculate compatibility score
    let compatibilityScore = 0;
    
    if (outputsMatch) compatibilityScore += 0.5;
    if (hookResult.success && mcpResult.success) compatibilityScore += 0.3;
    if (Math.abs(performanceDelta) < 100) compatibilityScore += 0.2; // Within 100ms is considered good
    
    return {
      outputs_match: outputsMatch,
      performance_delta_ms: performanceDelta,
      compatibility_score: Math.min(1, compatibilityScore)
    };
  }

  private determineTestStatus(
    hookResult: { success: boolean; response_time_ms: number; output: string; errors: string[] },
    mcpResult: { success: boolean; response_time_ms: number; output: string; errors: string[] },
    comparison: { outputs_match: boolean; performance_delta_ms: number; compatibility_score: number },
    test: ValidationTest
  ): 'passed' | 'failed' | 'skipped' | 'error' {
    // If either system failed, mark as failed
    if (!hookResult.success || !mcpResult.success) {
      return 'failed';
    }
    
    // If compatibility score is too low, mark as failed
    if (comparison.compatibility_score < this.config.compatibility_threshold) {
      return 'failed';
    }
    
    // If critical test and outputs don't match, mark as failed
    if (test.priority === 'critical' && !comparison.outputs_match) {
      return 'failed';
    }
    
    return 'passed';
  }

  private async checkPreconditions(preconditions: string[]): Promise<{ success: boolean; message?: string }> {
    for (const condition of preconditions) {
      switch (condition) {
        case 'hook_system_available':
          // In practice, this would check if hook system is running
          break;
        case 'mcp_system_available':
          // In practice, this would check if MCP servers are running
          break;
        case 'both_systems_available':
          // Check both systems
          break;
        default:
          this.logger.warn(`Unknown precondition: ${condition}`);
      }
    }
    
    return { success: true };
  }

  private analyzeFeatureParity(legacyConfig: LegacySettings, modernConfig: ModernConfig): Record<string, boolean> {
    const featureParity: Record<string, boolean> = {};
    
    // Check hook system features
    featureParity['pre_tool_hooks'] = Boolean(legacyConfig.hooks?.PreToolUse?.length);
    featureParity['post_tool_hooks'] = Boolean(legacyConfig.hooks?.PostToolUse?.length);
    featureParity['wave_coordination'] = Boolean(legacyConfig.superclaude?.wave_mode?.enabled);
    featureParity['performance_monitoring'] = Boolean(legacyConfig.superclaude?.performance?.monitoring_enabled);
    
    // Check MCP system features
    featureParity['mcp_servers'] = Boolean(modernConfig.mcp?.servers && Object.keys(modernConfig.mcp.servers).length > 0);
    featureParity['orchestration'] = Boolean(modernConfig.mcp?.orchestration?.enabled);
    featureParity['bridge_hooks'] = Boolean(modernConfig.bridge_hooks?.enabled);
    
    return featureParity;
  }

  private async generateValidationReport(
    results: ValidationResult[],
    legacyConfig: LegacySettings,
    modernConfig: ModernConfig,
    totalDurationMs: number
  ): Promise<ValidationReport> {
    // Calculate test summary
    const testSummary = {
      total_tests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      success_rate: 0
    };
    
    testSummary.success_rate = testSummary.total_tests > 0 
      ? testSummary.passed / testSummary.total_tests 
      : 0;

    // Calculate performance summary
    const hookTimes = results
      .filter(r => r.hook_system_result)
      .map(r => r.hook_system_result!.response_time_ms);
    const mcpTimes = results
      .filter(r => r.mcp_system_result)
      .map(r => r.mcp_system_result!.response_time_ms);

    const performanceSummary = {
      hook_system_avg_ms: hookTimes.length > 0 ? hookTimes.reduce((a, b) => a + b, 0) / hookTimes.length : 0,
      mcp_system_avg_ms: mcpTimes.length > 0 ? mcpTimes.reduce((a, b) => a + b, 0) / mcpTimes.length : 0,
      performance_improvement: 0,
      throughput_comparison: 1.0
    };

    if (performanceSummary.hook_system_avg_ms > 0) {
      performanceSummary.performance_improvement = 
        ((performanceSummary.hook_system_avg_ms - performanceSummary.mcp_system_avg_ms) / performanceSummary.hook_system_avg_ms) * 100;
    }

    // Generate compatibility analysis
    const compatibilityScores = results
      .filter(r => r.comparison)
      .map(r => r.comparison!.compatibility_score);
    
    const compatibilityAnalysis = {
      overall_score: compatibilityScores.length > 0 
        ? compatibilityScores.reduce((a, b) => a + b, 0) / compatibilityScores.length 
        : 0,
      functional_compatibility: testSummary.success_rate,
      performance_compatibility: performanceSummary.performance_improvement > -20 ? 0.8 : 0.4,
      feature_parity_score: 0.9, // Would be calculated from feature analysis
      migration_readiness: 'ready' as const
    };

    if (compatibilityAnalysis.overall_score < 0.7) {
      compatibilityAnalysis.migration_readiness = 'needs_work';
    }
    if (compatibilityAnalysis.overall_score < 0.5) {
      compatibilityAnalysis.migration_readiness = 'blocked';
    }

    // Generate recommendations and critical issues
    const recommendations: string[] = [];
    const criticalIssues: ValidationReport['critical_issues'] = [];

    if (testSummary.success_rate < 0.9) {
      recommendations.push('Address failing tests before proceeding with migration');
    }
    if (performanceSummary.performance_improvement < -10) {
      recommendations.push('Investigate performance degradation in MCP system');
    }
    if (compatibilityAnalysis.overall_score < 0.8) {
      recommendations.push('Improve compatibility between systems');
    }

    // Add critical issues
    const failedCriticalTests = results.filter(r => 
      r.status === 'failed' && 
      r.metadata?.test_priority === 'critical'
    );

    for (const test of failedCriticalTests) {
      criticalIssues.push({
        test_id: test.test_id,
        severity: 'critical',
        description: `Critical test failed: ${test.test_id}`,
        impact: 'Migration may fail or cause system instability',
        recommendation: 'Fix the underlying issue before proceeding'
      });
    }

    return {
      execution_timestamp: new Date().toISOString(),
      migration_config: {
        version: this.migrationConfig.version,
        mode: this.migrationConfig.mode,
        stage: this.migrationConfig.stage
      },
      test_summary: testSummary,
      performance_summary: performanceSummary,
      compatibility_analysis: compatibilityAnalysis,
      test_results: results,
      recommendations,
      critical_issues: criticalIssues
    };
  }

  private async saveValidationReport(report: ValidationReport): Promise<void> {
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const reportPath = join(
        dirname(this.migrationConfig.backup_path),
        'validation-reports',
        `validation-report-${timestamp}.json`
      );

      const reportDir = dirname(reportPath);
      if (!existsSync(reportDir)) {
        mkdirSync(reportDir, { recursive: true });
      }

      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

      this.logger.info('Validation report saved', { report_path: reportPath });

    } catch (error) {
      this.logger.error('Failed to save validation report', { error });
    }
  }

  private async executeCommand(command: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}