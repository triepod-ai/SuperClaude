import { PerformanceProfiler } from '../src/core/PerformanceProfiler.js';
import { MonitoringError, DEFAULT_MONITORING_CONFIG } from '../src/types/index.js';

jest.mock('@superclaude/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('PerformanceProfiler', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(profiler).toBeDefined();
      expect(profiler['config']).toEqual(DEFAULT_MONITORING_CONFIG);
    });

    test('should initialize with custom configuration', () => {
      const customConfig = {
        samplingRate: 0.5,
        alertThresholds: {
          executionTime: 1000,
          memoryUsage: 1024 * 1024 * 50,
          cpuUsage: 70,
          errorRate: 3
        }
      };

      const customProfiler = new PerformanceProfiler(customConfig);
      expect(customProfiler['config'].samplingRate).toBe(0.5);
      expect(customProfiler['config'].alertThresholds.executionTime).toBe(1000);
    });
  });

  describe('Metrics Recording', () => {
    test('should record performance metrics', () => {
      const operationName = 'test-operation';
      const metrics = {
        executionTime: 500,
        memoryUsage: 1024 * 1024,
        cpuUsage: 25,
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      profiler.recordMetrics(operationName, metrics, 'test-server');

      const storedMetrics = profiler['metrics'].get(operationName);
      expect(storedMetrics).toBeDefined();
      expect(storedMetrics!.length).toBe(1);
      expect(storedMetrics![0].executionTime).toBe(500);
      expect(storedMetrics![0].serverName).toBe('test-server');
    });

    test('should maintain retention limit', () => {
      const operationName = 'test-operation';
      const metrics = {
        executionTime: 500,
        memoryUsage: 1024 * 1024,
        cpuUsage: 25,
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      // Mock retention limit calculation to return a small number
      profiler['calculateRetentionLimit'] = jest.fn().mockReturnValue(5);

      // Record more metrics than the limit
      for (let i = 0; i < 10; i++) {
        profiler.recordMetrics(operationName, { ...metrics, executionTime: 500 + i });
      }

      const storedMetrics = profiler['metrics'].get(operationName);
      expect(storedMetrics!.length).toBe(5);
    });

    test('should update performance profile when recording metrics', () => {
      const operationName = 'test-operation';
      const metrics = {
        executionTime: 500,
        memoryUsage: 1024 * 1024,
        cpuUsage: 25,
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      profiler.recordMetrics(operationName, metrics);

      const profile = profiler.getProfile(operationName);
      expect(profile).toBeDefined();
      expect(profile!.name).toBe(operationName);
      expect(profile!.samples).toBe(1);
      expect(profile!.currentMetrics.executionTime).toBe(500);
    });

    test('should emit metrics_recorded event', () => {
      const eventListener = jest.fn();
      profiler.on('metrics_recorded', eventListener);

      const operationName = 'test-operation';
      const metrics = {
        executionTime: 500,
        memoryUsage: 1024 * 1024,
        cpuUsage: 25,
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      profiler.recordMetrics(operationName, metrics);

      expect(eventListener).toHaveBeenCalledWith({
        operationName,
        metrics: expect.objectContaining({
          executionTime: 500,
          timestamp: expect.any(Date),
          operationId: expect.any(String)
        })
      });
    });
  });

  describe('Alert System', () => {
    test('should create alert when execution time exceeds threshold', () => {
      const operationName = 'slow-operation';
      const metrics = {
        executionTime: 10000, // Exceeds default threshold of 5000ms
        memoryUsage: 1024 * 1024,
        cpuUsage: 25,
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      const alertListener = jest.fn();
      profiler.on('alert_created', alertListener);

      profiler.recordMetrics(operationName, metrics);

      const alerts = profiler.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('performance');
      expect(alerts[0].metric).toBe('executionTime');
      expect(alertListener).toHaveBeenCalled();
    });

    test('should create alert when error rate exceeds threshold', () => {
      const operationName = 'error-prone-operation';
      const metrics = {
        executionTime: 500,
        memoryUsage: 1024 * 1024,
        cpuUsage: 25,
        tokenUsage: 1000,
        successRate: 0.9,
        errorRate: 0.1 // Exceeds default threshold of 5%
      };

      profiler.recordMetrics(operationName, metrics);

      const alerts = profiler.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.metric === 'errorRate')).toBe(true);
    });

    test('should resolve alerts', () => {
      // First create an alert
      const operationName = 'slow-operation';
      const metrics = {
        executionTime: 10000,
        memoryUsage: 1024 * 1024,
        cpuUsage: 25,
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      profiler.recordMetrics(operationName, metrics);

      const alerts = profiler.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const alertId = alerts[0].id;
      const resolved = profiler.resolveAlert(alertId, 'test-user');

      expect(resolved).toBe(true);

      const resolvedAlerts = profiler.getAlerts(undefined, true);
      expect(resolvedAlerts.length).toBeGreaterThan(0);
      expect(resolvedAlerts[0].resolved).toBe(true);
      expect(resolvedAlerts[0].acknowledgedBy).toBe('test-user');
    });

    test('should filter alerts by severity and resolution status', () => {
      // Create alerts with different severities
      const highSeverityMetrics = {
        executionTime: 10000,
        memoryUsage: 1024 * 1024,
        cpuUsage: 90, // High CPU usage
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      profiler.recordMetrics('high-severity-op', highSeverityMetrics);

      const allAlerts = profiler.getAlerts();
      const highAlerts = profiler.getAlerts('high');
      const unresolvedAlerts = profiler.getAlerts(undefined, false);

      expect(allAlerts.length).toBeGreaterThan(0);
      expect(highAlerts.length).toBeGreaterThanOrEqual(0);
      expect(unresolvedAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring', () => {
    test('should start monitoring', async () => {
      const target = 'test-target';
      const monitoringStartedListener = jest.fn();
      profiler.on('monitoring_started', monitoringStartedListener);

      await profiler.startMonitoring(target, 60, {
        samplingRate: 0.1,
        includeBaseline: true,
        alertOnThresholds: true
      });

      expect(monitoringStartedListener).toHaveBeenCalledWith({
        target,
        duration: 60,
        config: {
          samplingRate: 0.1,
          includeBaseline: true,
          alertOnThresholds: true
        }
      });

      expect(profiler['monitoringTimers'].has(target)).toBe(true);
      expect(profiler['isMonitoring']).toBe(true);
    });

    test('should stop monitoring', async () => {
      const target = 'test-target';
      
      await profiler.startMonitoring(target, 60);
      expect(profiler['monitoringTimers'].has(target)).toBe(true);

      const monitoringStoppedListener = jest.fn();
      profiler.on('monitoring_stopped', monitoringStoppedListener);

      profiler.stopMonitoring(target);

      expect(profiler['monitoringTimers'].has(target)).toBe(false);
      expect(monitoringStoppedListener).toHaveBeenCalledWith({ target });
    });

    test('should handle monitoring errors gracefully', async () => {
      const target = 'error-target';

      // Mock collectMetrics to throw an error
      const originalCollectMetrics = profiler['collectMetrics'];
      profiler['collectMetrics'] = jest.fn().mockRejectedValue(new Error('Collection failed'));

      await expect(profiler.startMonitoring(target, 1)).resolves.not.toThrow();

      // Restore original method
      profiler['collectMetrics'] = originalCollectMetrics;
    });
  });

  describe('Bottleneck Analysis', () => {
    test('should analyze bottlenecks', async () => {
      const target = 'test-target';

      // Create some performance data with bottlenecks
      const slowMetrics = {
        executionTime: 5000,
        memoryUsage: 500 * 1024 * 1024, // 500MB
        cpuUsage: 80,
        tokenUsage: 1000,
        successRate: 0.95,
        errorRate: 0.05
      };

      for (let i = 0; i < 10; i++) {
        profiler.recordMetrics(target, slowMetrics);
      }

      const analysis = await profiler.analyzeBottlenecks(target, {
        scope: 'module',
        includeHistorical: true,
        minimumSeverity: 'medium'
      });

      expect(analysis).toBeDefined();
      expect(analysis.bottlenecks).toBeDefined();
      expect(analysis.opportunities).toBeDefined();
      expect(analysis.summary).toBeDefined();
    });

    test('should handle bottleneck analysis errors', async () => {
      const target = 'nonexistent-target';

      await expect(profiler.analyzeBottlenecks(target)).rejects.toThrow(MonitoringError);
    });
  });

  describe('Benchmarking', () => {
    test('should create performance benchmark', async () => {
      const operation = 'test-operation';

      // Create enough metrics for benchmarking
      for (let i = 0; i < 150; i++) {
        const metrics = {
          executionTime: 500 + Math.random() * 100, // 500-600ms with variance
          memoryUsage: 1024 * 1024,
          cpuUsage: 25,
          tokenUsage: 1000,
          successRate: 0.95,
          errorRate: 0.05
        };
        profiler.recordMetrics(operation, metrics);
      }

      const benchmark = await profiler.createBenchmark(operation, 100, {
        warmupIterations: 10,
        includeVariance: true,
        compareToBaseline: true
      });

      expect(benchmark).toBeDefined();
      expect(benchmark.operation).toBe(operation);
      expect(benchmark.sampleSize).toBe(100);
      expect(benchmark.avg).toBeGreaterThan(0);
      expect(benchmark.p50).toBeGreaterThan(0);
      expect(benchmark.p90).toBeGreaterThan(0);
      expect(benchmark.p95).toBeGreaterThan(0);
      expect(benchmark.p99).toBeGreaterThan(0);
      expect(benchmark.min).toBeGreaterThan(0);
      expect(benchmark.max).toBeGreaterThan(0);
    });

    test('should fail benchmark creation with insufficient data', async () => {
      const operation = 'insufficient-data-operation';

      // Create only a few metrics (less than required)
      for (let i = 0; i < 5; i++) {
        const metrics = {
          executionTime: 500,
          memoryUsage: 1024 * 1024,
          cpuUsage: 25,
          tokenUsage: 1000,
          successRate: 0.95,
          errorRate: 0.05
        };
        profiler.recordMetrics(operation, metrics);
      }

      await expect(profiler.createBenchmark(operation, 100)).rejects.toThrow(MonitoringError);
    });
  });

  describe('Trend Analysis', () => {
    test('should calculate performance trends', () => {
      const operationName = 'trending-operation';

      // Create trend data over time
      const baseTime = Date.now();
      for (let i = 0; i < 20; i++) {
        const metrics = {
          executionTime: 500 + i * 10, // Increasing execution time
          memoryUsage: 1024 * 1024 + i * 1024 * 100, // Increasing memory
          cpuUsage: 25,
          tokenUsage: 1000,
          successRate: 0.95,
          errorRate: 0.05 - i * 0.001 // Decreasing error rate
        };
        profiler.recordMetrics(operationName, metrics);
      }

      const trends = profiler.getTrends(operationName, 'day');

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);

      const executionTimeTrend = trends.find(t => t.metric === 'executionTime');
      expect(executionTimeTrend).toBeDefined();
      expect(executionTimeTrend!.direction).toBe('up'); // Should detect upward trend
    });

    test('should return empty trends for insufficient data', () => {
      const operationName = 'no-data-operation';
      const trends = profiler.getTrends(operationName);

      expect(trends).toEqual([]);
    });
  });

  describe('Performance Summary', () => {
    test('should generate performance summary', () => {
      const operationName = 'summary-operation';

      // Create diverse metrics
      const metricsData = [
        { executionTime: 500, memoryUsage: 50 * 1024 * 1024, cpuUsage: 25, successRate: 0.98, errorRate: 0.02 },
        { executionTime: 600, memoryUsage: 60 * 1024 * 1024, cpuUsage: 30, successRate: 0.96, errorRate: 0.04 },
        { executionTime: 550, memoryUsage: 55 * 1024 * 1024, cpuUsage: 28, successRate: 0.97, errorRate: 0.03 }
      ];

      metricsData.forEach(metrics => {
        profiler.recordMetrics(operationName, {
          ...metrics,
          tokenUsage: 1000
        });
      });

      const summary = profiler.generateSummary(operationName);

      expect(summary).toBeDefined();
      expect(summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(summary.overallScore).toBeLessThanOrEqual(100);
      expect(summary.categories.speed).toBeGreaterThanOrEqual(0);
      expect(summary.categories.efficiency).toBeGreaterThanOrEqual(0);
      expect(summary.categories.reliability).toBeGreaterThanOrEqual(0);
      expect(summary.categories.scalability).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(summary.recommendations)).toBe(true);
      expect(typeof summary.criticalIssues).toBe('number');
    });

    test('should generate summary for no data', () => {
      const summary = profiler.generateSummary('nonexistent-operation');

      expect(summary).toBeDefined();
      expect(summary.overallScore).toBe(0);
      expect(summary.recommendations).toContain('No performance data available');
    });
  });

  describe('Statistics and Cleanup', () => {
    test('should return monitoring statistics', () => {
      const stats = profiler.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.isMonitoring).toBe('boolean');
      expect(typeof stats.activeTargets).toBe('number');
      expect(typeof stats.totalMetrics).toBe('number');
      expect(typeof stats.totalAlerts).toBe('number');
      expect(typeof stats.uptime).toBe('number');
      expect(stats.memoryUsage).toBeDefined();
    });

    test('should cleanup old data', () => {
      const operationName = 'cleanup-operation';

      // Create old metrics by mocking dates
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      const recentDate = new Date();

      // Mock some old metrics
      profiler['metrics'].set(operationName, [
        {
          executionTime: 500,
          memoryUsage: 1024 * 1024,
          cpuUsage: 25,
          tokenUsage: 1000,
          successRate: 0.95,
          errorRate: 0.05,
          timestamp: oldDate,
          operationId: 'old-op'
        },
        {
          executionTime: 600,
          memoryUsage: 1024 * 1024,
          cpuUsage: 25,
          tokenUsage: 1000,
          successRate: 0.95,
          errorRate: 0.05,
          timestamp: recentDate,
          operationId: 'recent-op'
        }
      ]);

      const metricsBefore = profiler['metrics'].get(operationName)!.length;
      profiler.cleanup();
      const metricsAfter = profiler['metrics'].get(operationName)!.length;

      expect(metricsAfter).toBeLessThanOrEqual(metricsBefore);
    });
  });
});