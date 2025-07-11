/**
 * SuperClaude Test Framework Core Runner
 * Orchestrates execution of comprehensive test suites
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { nanoid } from 'nanoid';
import pLimit from 'p-limit';
import { logger } from '@superclaude/shared';
import {
  TestSuite,
  TestCase,
  TestResult,
  TestExecutionConfig,
  TestExecutionResult,
  PerformanceMetrics,
  CoverageMetrics,
  QualityGate,
  QualityReport,
  TestFrameworkError,
  TestExecutionError
} from '../types/index.js';

export class TestRunner extends EventEmitter {
  private config: TestExecutionConfig;
  private suites: Map<string, TestSuite> = new Map();
  private results: Map<string, TestResult> = new Map();
  private isRunning = false;
  private startTime?: Date;
  private endTime?: Date;

  constructor(config: TestExecutionConfig) {
    super();
    this.config = config;
    this.setupEventHandlers();
  }

  /**
   * Register a test suite
   */
  registerSuite(suite: TestSuite): void {
    this.suites.set(suite.name, suite);
    logger.info(`Registered test suite: ${suite.name}`, {
      testsCount: suite.tests.length,
      category: suite.category,
      phase: suite.phase
    });
  }

  /**
   * Execute all registered test suites
   */
  async executeAll(): Promise<TestExecutionResult> {
    if (this.isRunning) {
      throw new TestExecutionError('Test execution already in progress');
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.results.clear();

    try {
      logger.info('Starting test execution', {
        suitesCount: this.suites.size,
        parallel: this.config.parallel,
        maxConcurrency: this.config.maxConcurrency
      });

      this.emit('execution:start', { suitesCount: this.suites.size });

      // Filter suites based on configuration
      const suitesToRun = this.filterSuites();
      
      if (suitesToRun.length === 0) {
        throw new TestExecutionError('No test suites match the execution criteria');
      }

      // Execute test suites
      const suiteResults = await this.executeSuites(suitesToRun);

      // Generate execution result
      const result = await this.generateExecutionResult(suiteResults);

      this.emit('execution:complete', result);
      logger.info('Test execution completed', {
        total: result.summary.total,
        passed: result.summary.passed,
        failed: result.summary.failed,
        successRate: result.summary.successRate
      });

      return result;

    } catch (error) {
      this.emit('execution:error', error);
      throw error;
    } finally {
      this.isRunning = false;
      this.endTime = new Date();
    }
  }

  /**
   * Execute specific test suite
   */
  async executeSuite(suiteName: string): Promise<TestResult[]> {
    const suite = this.suites.get(suiteName);
    if (!suite) {
      throw new TestExecutionError(`Test suite not found: ${suiteName}`);
    }

    logger.info(`Executing test suite: ${suiteName}`, {
      testsCount: suite.tests.length
    });

    this.emit('suite:start', { suite: suiteName });

    try {
      // Run suite setup
      if (suite.setup) {
        await this.withTimeout(suite.setup(), suite.timeout || this.config.timeout);
      }

      // Execute tests
      const testResults = await this.executeTests(suite.tests);

      // Run suite teardown
      if (suite.teardown) {
        await this.withTimeout(suite.teardown(), suite.timeout || this.config.timeout);
      }

      this.emit('suite:complete', { suite: suiteName, results: testResults });
      return testResults;

    } catch (error) {
      this.emit('suite:error', { suite: suiteName, error });
      throw new TestExecutionError(`Suite execution failed: ${suiteName}`, { originalError: error });
    }
  }

  /**
   * Execute individual test case
   */
  async executeTest(testCase: TestCase): Promise<TestResult> {
    const testId = testCase.id;
    const startTime = new Date();
    const startMark = performance.now();

    logger.debug(`Executing test: ${testId}`, {
      name: testCase.name,
      category: testCase.category,
      priority: testCase.priority
    });

    this.emit('test:start', { testId, name: testCase.name });

    try {
      // Check prerequisites
      if (testCase.prerequisites && testCase.prerequisites.length > 0) {
        const prerequisitesMet = await this.checkPrerequisites(testCase.prerequisites);
        if (!prerequisitesMet) {
          const result: TestResult = {
            testId,
            name: testCase.name,
            status: 'skipped',
            duration: performance.now() - startMark,
            startTime,
            endTime: new Date(),
            output: 'Prerequisites not met',
            metadata: { skipped: true, reason: 'prerequisites' }
          };

          this.emit('test:skipped', { testId, result });
          return result;
        }
      }

      // Execute test with timeout
      const timeout = testCase.timeout || this.config.timeout;
      const testResult = await this.withTimeout(testCase.execute(), timeout);

      // Validate result if validator provided
      if (testCase.validate) {
        const isValid = testCase.validate(testResult);
        if (!isValid) {
          testResult.status = 'failed';
          testResult.error = 'Test validation failed';
        }
      }

      const endTime = new Date();
      const duration = performance.now() - startMark;

      const result: TestResult = {
        ...testResult,
        testId,
        name: testCase.name,
        duration,
        startTime,
        endTime,
        metadata: {
          ...testResult.metadata,
          category: testCase.category,
          priority: testCase.priority,
          tags: testCase.tags
        }
      };

      this.results.set(testId, result);
      this.emit('test:complete', { testId, result });

      return result;

    } catch (error) {
      const endTime = new Date();
      const duration = performance.now() - startMark;

      const result: TestResult = {
        testId,
        name: testCase.name,
        status: 'error',
        duration,
        startTime,
        endTime,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          category: testCase.category,
          priority: testCase.priority,
          tags: testCase.tags,
          executionError: true
        }
      };

      this.results.set(testId, result);
      this.emit('test:error', { testId, result, error });

      return result;
    }
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    isRunning: boolean;
    suitesRegistered: number;
    testsExecuted: number;
    executionTime?: number;
  } {
    return {
      isRunning: this.isRunning,
      suitesRegistered: this.suites.size,
      testsExecuted: this.results.size,
      executionTime: this.startTime && this.endTime 
        ? this.endTime.getTime() - this.startTime.getTime()
        : undefined
    };
  }

  /**
   * Validate quality gates
   */
  validateQualityGates(gates: QualityGate[], metrics: Record<string, number>): QualityReport {
    const gateResults = gates.map(gate => {
      const value = metrics[gate.metric] || 0;
      let passed = false;

      switch (gate.operator) {
        case 'gte':
          passed = value >= gate.threshold;
          break;
        case 'lte':
          passed = value <= gate.threshold;
          break;
        case 'eq':
          passed = value === gate.threshold;
          break;
        case 'ne':
          passed = value !== gate.threshold;
          break;
      }

      return {
        gate,
        value,
        passed,
        message: passed 
          ? `✓ ${gate.name}: ${value} ${gate.operator} ${gate.threshold}`
          : `✗ ${gate.name}: ${value} ${gate.operator} ${gate.threshold}`
      };
    });

    const overallPassed = gateResults.every(result => result.passed || !result.gate.critical);
    const score = (gateResults.filter(r => r.passed).length / gateResults.length) * 100;

    const recommendations: string[] = [];
    gateResults
      .filter(r => !r.passed)
      .forEach(r => {
        recommendations.push(`Improve ${r.gate.metric} to meet threshold ${r.gate.threshold}`);
      });

    return {
      gates: gateResults,
      overallPassed,
      score,
      recommendations
    };
  }

  /**
   * Private helper methods
   */
  private setupEventHandlers(): void {
    this.on('test:error', ({ testId, error }) => {
      logger.error(`Test failed: ${testId}`, { error });
    });

    this.on('suite:error', ({ suite, error }) => {
      logger.error(`Suite failed: ${suite}`, { error });
    });

    this.on('execution:error', (error) => {
      logger.error('Test execution failed', { error });
    });
  }

  private filterSuites(): TestSuite[] {
    let suites = Array.from(this.suites.values());

    // Filter by suite names if specified
    if (this.config.suites && this.config.suites.length > 0) {
      suites = suites.filter(suite => this.config.suites!.includes(suite.name));
    }

    // Filter by tags if specified
    if (this.config.tags && this.config.tags.length > 0) {
      suites = suites.filter(suite => 
        suite.tests.some(test => 
          test.tags.some(tag => this.config.tags!.includes(tag))
        )
      );
    }

    // Filter by pattern if specified
    if (this.config.pattern) {
      const regex = new RegExp(this.config.pattern, 'i');
      suites = suites.filter(suite => 
        regex.test(suite.name) || regex.test(suite.description)
      );
    }

    return suites;
  }

  private async executeSuites(suites: TestSuite[]): Promise<Array<{
    suite: string;
    status: 'passed' | 'failed' | 'error';
    duration: number;
    results: TestResult[];
  }>> {
    const results: Array<{
      suite: string;
      status: 'passed' | 'failed' | 'error';
      duration: number;
      results: TestResult[];
    }> = [];

    if (this.config.parallel) {
      const limit = pLimit(this.config.maxConcurrency);
      const promises = suites.map(suite => 
        limit(async () => {
          const startTime = performance.now();
          try {
            const testResults = await this.executeSuite(suite.name);
            const status = testResults.every(r => r.status === 'passed') ? 'passed' : 'failed';
            return {
              suite: suite.name,
              status,
              duration: performance.now() - startTime,
              results: testResults
            };
          } catch (error) {
            return {
              suite: suite.name,
              status: 'error' as const,
              duration: performance.now() - startTime,
              results: []
            };
          }
        })
      );

      const suiteResults = await Promise.all(promises);
      results.push(...suiteResults);
    } else {
      for (const suite of suites) {
        const startTime = performance.now();
        try {
          const testResults = await this.executeSuite(suite.name);
          const status = testResults.every(r => r.status === 'passed') ? 'passed' : 'failed';
          results.push({
            suite: suite.name,
            status,
            duration: performance.now() - startTime,
            results: testResults
          });

          if (this.config.bailOnError && status === 'failed') {
            break;
          }
        } catch (error) {
          results.push({
            suite: suite.name,
            status: 'error',
            duration: performance.now() - startTime,
            results: []
          });

          if (this.config.bailOnError) {
            break;
          }
        }
      }
    }

    return results;
  }

  private async executeTests(tests: TestCase[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (this.config.parallel) {
      const limit = pLimit(this.config.maxConcurrency);
      const promises = tests.map(test => limit(() => this.executeTest(test)));
      const testResults = await Promise.all(promises);
      results.push(...testResults);
    } else {
      for (const test of tests) {
        const result = await this.executeTest(test);
        results.push(result);

        if (this.config.bailOnError && result.status === 'error') {
          break;
        }
      }
    }

    return results;
  }

  private async generateExecutionResult(suiteResults: Array<{
    suite: string;
    status: 'passed' | 'failed' | 'error';
    duration: number;
    results: TestResult[];
  }>): Promise<TestExecutionResult> {
    const allResults = suiteResults.flatMap(sr => sr.results);
    
    const summary = {
      total: allResults.length,
      passed: allResults.filter(r => r.status === 'passed').length,
      failed: allResults.filter(r => r.status === 'failed').length,
      skipped: allResults.filter(r => r.status === 'skipped').length,
      errors: allResults.filter(r => r.status === 'error').length,
      duration: this.endTime && this.startTime 
        ? this.endTime.getTime() - this.startTime.getTime()
        : 0,
      successRate: 0
    };

    summary.successRate = summary.total > 0 ? summary.passed / summary.total : 0;

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(allResults);

    return {
      summary,
      suites: suiteResults,
      performance: performanceMetrics,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'test',
      metadata: {
        config: this.config,
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  private calculatePerformanceMetrics(results: TestResult[]): {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    throughput: number;
  } {
    const validResults = results.filter(r => r.metrics);
    
    if (validResults.length === 0) {
      return {
        averageResponseTime: 0,
        totalRequests: 0,
        errorRate: 0,
        throughput: 0
      };
    }

    const totalResponseTime = validResults.reduce((sum, r) => sum + (r.metrics?.responseTime || r.duration), 0);
    const errorCount = results.filter(r => r.status === 'error' || r.status === 'failed').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      averageResponseTime: totalResponseTime / validResults.length,
      totalRequests: results.length,
      errorRate: results.length > 0 ? errorCount / results.length : 0,
      throughput: totalDuration > 0 ? (results.length / totalDuration) * 1000 : 0 // requests per second
    };
  }

  private async checkPrerequisites(prerequisites: string[]): Promise<boolean> {
    // Implementation would check various prerequisites
    // For now, return true (all prerequisites met)
    return true;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }
}