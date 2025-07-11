/**
 * Performance Monitor for Test Suite
 * Tracks performance metrics during testing
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  category: 'mcp' | 'bridge' | 'e2e' | 'load' | 'stress';
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  bridgeResponse: number; // 100ms
  mcpServerResponse: number; // 500ms
  e2eWorkflow: number; // 5000ms
  memoryUsage: number; // 512MB
  cpuUsage: number; // 80%
}

export interface PerformanceReport {
  summary: {
    totalTests: number;
    totalDuration: number;
    averageTestDuration: number;
    thresholdViolations: number;
  };
  categories: Record<string, {
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    thresholdViolations: number;
  }>;
  violations: Array<{
    metric: PerformanceMetric;
    threshold: number;
    violation: number;
  }>;
  systemMetrics: {
    peakMemoryUsage: number;
    averageMemoryUsage: number;
    peakCpuUsage: number;
    averageCpuUsage: number;
  };
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private activeMetrics: Map<string, PerformanceMetric> = new Map();
  private systemMetrics: Array<{ timestamp: number; memory: number; cpu: number }> = [];
  private monitoringInterval?: NodeJS.Timeout;
  private startTime: number;
  
  private readonly thresholds: PerformanceThresholds = {
    bridgeResponse: 100,      // 100ms for bridge operations
    mcpServerResponse: 500,   // 500ms for MCP server responses  
    e2eWorkflow: 5000,        // 5s for end-to-end workflows
    memoryUsage: 512 * 1024 * 1024, // 512MB
    cpuUsage: 80              // 80% CPU usage
  };

  constructor() {
    super();
    this.startTime = Date.now();
  }

  start(): void {
    console.log('📊 Starting performance monitoring...');
    
    // Start system metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 1000);
    
    this.emit('started');
  }

  stop(): void {
    console.log('📊 Stopping performance monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.emit('stopped');
  }

  startMetric(name: string, category: PerformanceMetric['category'], metadata?: Record<string, any>): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      category,
      metadata
    };
    
    this.activeMetrics.set(id, metric);
    return id;
  }

  endMetric(id: string): PerformanceMetric | null {
    const metric = this.activeMetrics.get(id);
    if (!metric) {
      console.warn(`Performance metric not found: ${id}`);
      return null;
    }
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    this.activeMetrics.delete(id);
    this.metrics.push(metric);
    
    // Check for threshold violations
    this.checkThresholds(metric);
    
    this.emit('metric', metric);
    return metric;
  }

  recordMetric(name: string, duration: number, category: PerformanceMetric['category'], metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      duration,
      category,
      metadata
    };
    
    this.metrics.push(metric);
    this.checkThresholds(metric);
    this.emit('metric', metric);
  }

  private collectSystemMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Calculate CPU percentage (simplified)
      const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) / 1 * 100;
      
      this.systemMetrics.push({
        timestamp: Date.now(),
        memory: memoryUsage.heapUsed,
        cpu: cpuPercent
      });
      
      // Keep only last 1000 samples (about 16 minutes at 1s intervals)
      if (this.systemMetrics.length > 1000) {
        this.systemMetrics = this.systemMetrics.slice(-1000);
      }
      
    } catch (error) {
      console.warn('Failed to collect system metrics:', error);
    }
  }

  private checkThresholds(metric: PerformanceMetric): void {
    if (!metric.duration) return;
    
    let threshold: number | undefined;
    
    switch (metric.category) {
      case 'bridge':
        threshold = this.thresholds.bridgeResponse;
        break;
      case 'mcp':
        threshold = this.thresholds.mcpServerResponse;
        break;
      case 'e2e':
        threshold = this.thresholds.e2eWorkflow;
        break;
    }
    
    if (threshold && metric.duration > threshold) {
      const violation = {
        metric,
        threshold,
        violation: metric.duration - threshold
      };
      
      console.warn(`⚠️ Performance threshold violation: ${metric.name} took ${metric.duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      this.emit('violation', violation);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  getActiveMetrics(): PerformanceMetric[] {
    return Array.from(this.activeMetrics.values());
  }

  async generateReport(): Promise<PerformanceReport> {
    const totalDuration = Date.now() - this.startTime;
    const violations: PerformanceReport['violations'] = [];
    
    // Calculate summary
    const summary = {
      totalTests: this.metrics.length,
      totalDuration: totalDuration,
      averageTestDuration: this.metrics.length > 0 
        ? this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / this.metrics.length 
        : 0,
      thresholdViolations: 0
    };
    
    // Calculate category statistics
    const categories: PerformanceReport['categories'] = {};
    const categoryGroups = this.groupBy(this.metrics, m => m.category);
    
    for (const [category, metrics] of Object.entries(categoryGroups)) {
      const durations = metrics.map(m => m.duration || 0);
      const categoryViolations = metrics.filter(m => {
        const threshold = this.getCategoryThreshold(m.category);
        return threshold && (m.duration || 0) > threshold;
      });
      
      categories[category] = {
        count: metrics.length,
        totalDuration: durations.reduce((sum, d) => sum + d, 0),
        averageDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        thresholdViolations: categoryViolations.length
      };
      
      summary.thresholdViolations += categoryViolations.length;
      
      // Add to violations array
      categoryViolations.forEach(metric => {
        const threshold = this.getCategoryThreshold(metric.category);
        if (threshold) {
          violations.push({
            metric,
            threshold,
            violation: (metric.duration || 0) - threshold
          });
        }
      });
    }
    
    // Calculate system metrics
    const systemMetrics = {
      peakMemoryUsage: this.systemMetrics.length > 0 
        ? Math.max(...this.systemMetrics.map(m => m.memory)) 
        : 0,
      averageMemoryUsage: this.systemMetrics.length > 0
        ? this.systemMetrics.reduce((sum, m) => sum + m.memory, 0) / this.systemMetrics.length
        : 0,
      peakCpuUsage: this.systemMetrics.length > 0
        ? Math.max(...this.systemMetrics.map(m => m.cpu))
        : 0,
      averageCpuUsage: this.systemMetrics.length > 0
        ? this.systemMetrics.reduce((sum, m) => sum + m.cpu, 0) / this.systemMetrics.length
        : 0
    };
    
    const report: PerformanceReport = {
      summary,
      categories,
      violations: violations.sort((a, b) => b.violation - a.violation),
      systemMetrics
    };
    
    // Save report to file
    await this.saveReport(report);
    
    return report;
  }

  private getCategoryThreshold(category: PerformanceMetric['category']): number | undefined {
    switch (category) {
      case 'bridge': return this.thresholds.bridgeResponse;
      case 'mcp': return this.thresholds.mcpServerResponse;
      case 'e2e': return this.thresholds.e2eWorkflow;
      default: return undefined;
    }
  }

  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private async saveReport(report: PerformanceReport): Promise<void> {
    try {
      const reportPath = path.join(process.cwd(), 'test-results', 'performance-report.json');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      // Also create a human-readable summary
      const summaryPath = path.join(process.cwd(), 'test-results', 'performance-summary.txt');
      await fs.writeFile(summaryPath, this.formatReportSummary(report));
      
      console.log(`📊 Performance report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save performance report:', error);
    }
  }

  private formatReportSummary(report: PerformanceReport): string {
    const lines = [
      '🏃 Performance Test Summary',
      '========================\n',
      `Total Tests: ${report.summary.totalTests}`,
      `Total Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`,
      `Average Test Duration: ${report.summary.averageTestDuration.toFixed(2)}ms`,
      `Threshold Violations: ${report.summary.thresholdViolations}\n`,
      '📊 Category Performance:',
      '----------------------'
    ];
    
    for (const [category, stats] of Object.entries(report.categories)) {
      lines.push(
        `${category.toUpperCase()}:`,
        `  Count: ${stats.count}`,
        `  Average: ${stats.averageDuration.toFixed(2)}ms`,
        `  Min: ${stats.minDuration.toFixed(2)}ms`,
        `  Max: ${stats.maxDuration.toFixed(2)}ms`,
        `  Violations: ${stats.thresholdViolations}`,
        ''
      );
    }
    
    if (report.violations.length > 0) {
      lines.push(
        '⚠️ Top Performance Violations:',
        '-----------------------------'
      );
      
      report.violations.slice(0, 10).forEach((violation, index) => {
        lines.push(
          `${index + 1}. ${violation.metric.name}`,
          `   Duration: ${violation.metric.duration?.toFixed(2)}ms`,
          `   Threshold: ${violation.threshold}ms`,
          `   Violation: +${violation.violation.toFixed(2)}ms`,
          ''
        );
      });
    }
    
    lines.push(
      '💾 System Resources:',
      '------------------',
      `Peak Memory: ${(report.systemMetrics.peakMemoryUsage / 1024 / 1024).toFixed(2)} MB`,
      `Average Memory: ${(report.systemMetrics.averageMemoryUsage / 1024 / 1024).toFixed(2)} MB`,
      `Peak CPU: ${report.systemMetrics.peakCpuUsage.toFixed(2)}%`,
      `Average CPU: ${report.systemMetrics.averageCpuUsage.toFixed(2)}%`
    );
    
    return lines.join('\n');
  }

  // Utility methods for tests
  
  measureAsync<T>(name: string, category: PerformanceMetric['category'], fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const id = this.startMetric(name, category, metadata);
      
      try {
        const result = await fn();
        this.endMetric(id);
        resolve(result);
      } catch (error) {
        this.endMetric(id);
        reject(error);
      }
    });
  }

  measureSync<T>(name: string, category: PerformanceMetric['category'], fn: () => T, metadata?: Record<string, any>): T {
    const id = this.startMetric(name, category, metadata);
    
    try {
      const result = fn();
      this.endMetric(id);
      return result;
    } catch (error) {
      this.endMetric(id);
      throw error;
    }
  }
}