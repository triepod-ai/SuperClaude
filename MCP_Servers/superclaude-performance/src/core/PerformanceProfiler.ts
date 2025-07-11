import { EventEmitter } from 'events';
import { logger, PerformanceMonitor } from '@superclaude/shared';
import {
  PerformanceMetrics,
  PerformanceBenchmark,
  BottleneckInfo,
  OptimizationOpportunity,
  Alert,
  PerformanceProfile,
  MonitoringConfig,
  PerformanceTrend,
  PerformanceSummary,
  MonitoringError,
  DEFAULT_MONITORING_CONFIG
} from '../types/index.js';

/**
 * Advanced performance profiler for real-time monitoring and bottleneck detection
 */
export class PerformanceProfiler extends EventEmitter {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private profiles: Map<string, PerformanceProfile> = new Map();
  private alerts: Alert[] = [];
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private bottlenecks: BottleneckInfo[] = [];
  private opportunities: OptimizationOpportunity[] = [];
  private config: MonitoringConfig;
  private monitoringTimers: Map<string, NodeJS.Timeout> = new Map();
  private isMonitoring: boolean = false;
  private startTime: number = Date.now();

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
    this.setupCleanupScheduler();
    logger.info('PerformanceProfiler initialized', { config: this.config });
  }

  /**
   * Start performance monitoring for a target
   */
  async startMonitoring(
    target: string,
    duration: number = 3600,
    options: {
      samplingRate?: number;
      includeBaseline?: boolean;
      alertOnThresholds?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const samplingRate = options.samplingRate || this.config.samplingRate;
      const includeBaseline = options.includeBaseline !== false;

      logger.info('Starting performance monitoring', { 
        target, 
        duration, 
        samplingRate,
        includeBaseline 
      });

      // Create baseline if requested
      if (includeBaseline) {
        await this.createBaseline(target);
      }

      // Start monitoring timer
      const monitoringInterval = setInterval(
        () => this.collectMetrics(target, samplingRate),
        this.config.aggregationInterval * 1000
      );

      this.monitoringTimers.set(target, monitoringInterval);

      // Schedule monitoring end
      setTimeout(() => {
        this.stopMonitoring(target);
      }, duration * 1000);

      this.isMonitoring = true;
      this.emit('monitoring_started', { target, duration, config: options });

    } catch (error) {
      logger.error('Failed to start monitoring', { target, error });
      throw new MonitoringError(
        `Failed to start monitoring for ${target}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stop performance monitoring for a target
   */
  stopMonitoring(target: string): void {
    const timer = this.monitoringTimers.get(target);
    if (timer) {
      clearInterval(timer);
      this.monitoringTimers.delete(target);
      
      logger.info('Stopped performance monitoring', { target });
      this.emit('monitoring_stopped', { target });
      
      if (this.monitoringTimers.size === 0) {
        this.isMonitoring = false;
      }
    }
  }

  /**
   * Record performance metrics for an operation
   */
  recordMetrics(
    operationName: string,
    metrics: Omit<PerformanceMetrics, 'timestamp' | 'operationId'>,
    serverId?: string
  ): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date(),
      operationId: this.generateOperationId(),
      serverName: serverId
    };

    // Store metrics
    const existing = this.metrics.get(operationName) || [];
    existing.push(fullMetrics);
    
    // Maintain retention limit
    const retentionLimit = this.calculateRetentionLimit();
    if (existing.length > retentionLimit) {
      existing.splice(0, existing.length - retentionLimit);
    }
    
    this.metrics.set(operationName, existing);

    // Update profile
    this.updateProfile(operationName, fullMetrics);

    // Check for alerts
    this.checkAlertThresholds(operationName, fullMetrics);

    // Emit metrics event
    this.emit('metrics_recorded', { operationName, metrics: fullMetrics });

    logger.debug('Performance metrics recorded', { 
      operationName, 
      executionTime: fullMetrics.executionTime,
      memoryUsage: fullMetrics.memoryUsage 
    });
  }

  /**
   * Analyze bottlenecks in system performance
   */
  async analyzeBottlenecks(
    target: string,
    options: {
      scope?: 'file' | 'module' | 'service' | 'system';
      includeHistorical?: boolean;
      minimumSeverity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<{
    bottlenecks: BottleneckInfo[];
    opportunities: OptimizationOpportunity[];
    summary: any;
  }> {
    try {
      logger.info('Analyzing bottlenecks', { target, options });

      const scope = options.scope || 'module';
      const includeHistorical = options.includeHistorical !== false;
      const minimumSeverity = options.minimumSeverity || 'medium';

      // Analyze current metrics
      const currentBottlenecks = await this.identifyBottlenecks(target, scope);
      
      // Include historical analysis if requested
      if (includeHistorical) {
        const historicalBottlenecks = await this.analyzeHistoricalBottlenecks(target);
        currentBottlenecks.push(...historicalBottlenecks);
      }

      // Filter by severity
      const filteredBottlenecks = currentBottlenecks.filter(
        bottleneck => this.compareSeverity(bottleneck.severity, minimumSeverity) >= 0
      );

      // Identify optimization opportunities
      const opportunities = await this.identifyOptimizationOpportunities(filteredBottlenecks);

      // Generate summary
      const summary = this.generateBottleneckSummary(filteredBottlenecks, opportunities);

      // Cache results
      this.bottlenecks = filteredBottlenecks;
      this.opportunities = opportunities;

      logger.info('Bottleneck analysis completed', { 
        target, 
        bottlenecksFound: filteredBottlenecks.length,
        opportunitiesFound: opportunities.length 
      });

      return {
        bottlenecks: filteredBottlenecks,
        opportunities,
        summary
      };

    } catch (error) {
      logger.error('Bottleneck analysis failed', { target, error });
      throw new MonitoringError(
        `Failed to analyze bottlenecks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create performance benchmark for an operation
   */
  async createBenchmark(
    operation: string,
    iterations: number = 100,
    options: {
      warmupIterations?: number;
      includeVariance?: boolean;
      compareToBaseline?: boolean;
    } = {}
  ): Promise<PerformanceBenchmark> {
    try {
      logger.info('Creating performance benchmark', { operation, iterations, options });

      const warmupIterations = options.warmupIterations || 10;
      const includeVariance = options.includeVariance !== false;

      const metrics = this.metrics.get(operation) || [];
      if (metrics.length < iterations) {
        throw new MonitoringError(
          `Insufficient metrics for benchmark. Need ${iterations}, have ${metrics.length}`
        );
      }

      // Take the most recent metrics for benchmark
      const recentMetrics = metrics.slice(-iterations);
      const executionTimes = recentMetrics.map(m => m.executionTime);

      // Calculate statistics
      const sorted = [...executionTimes].sort((a, b) => a - b);
      const benchmark: PerformanceBenchmark = {
        operation,
        p50: this.calculatePercentile(sorted, 50),
        p90: this.calculatePercentile(sorted, 90),
        p95: this.calculatePercentile(sorted, 95),
        p99: this.calculatePercentile(sorted, 99),
        avg: sorted.reduce((sum, time) => sum + time, 0) / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        sampleSize: sorted.length,
        timestamp: new Date()
      };

      // Store benchmark
      this.benchmarks.set(operation, benchmark);

      logger.info('Performance benchmark created', { 
        operation, 
        avg: benchmark.avg.toFixed(2),
        p95: benchmark.p95.toFixed(2) 
      });

      return benchmark;

    } catch (error) {
      logger.error('Benchmark creation failed', { operation, error });
      throw new MonitoringError(
        `Failed to create benchmark: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get performance trends for an operation
   */
  getTrends(
    operationName: string,
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): PerformanceTrend[] {
    const metrics = this.metrics.get(operationName) || [];
    if (metrics.length < 10) {
      return [];
    }

    const timeframeMs = this.getTimeframeMs(timeframe);
    const cutoff = new Date(Date.now() - timeframeMs);
    const recentMetrics = metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length < 5) {
      return [];
    }

    // Split metrics into time windows for trend analysis
    const windowSize = Math.max(1, Math.floor(recentMetrics.length / 5));
    const windows = this.createTimeWindows(recentMetrics, windowSize);

    const trends: PerformanceTrend[] = [];

    // Analyze execution time trend
    const executionTimeTrend = this.calculateTrend(
      windows.map(w => w.reduce((sum, m) => sum + m.executionTime, 0) / w.length)
    );
    trends.push({
      metric: 'executionTime',
      direction: executionTimeTrend.direction,
      magnitude: executionTimeTrend.magnitude,
      timeframe,
      significance: executionTimeTrend.significance
    });

    // Analyze memory usage trend
    const memoryTrend = this.calculateTrend(
      windows.map(w => w.reduce((sum, m) => sum + m.memoryUsage, 0) / w.length)
    );
    trends.push({
      metric: 'memoryUsage',
      direction: memoryTrend.direction,
      magnitude: memoryTrend.magnitude,
      timeframe,
      significance: memoryTrend.significance
    });

    // Analyze error rate trend
    const errorRateTrend = this.calculateTrend(
      windows.map(w => w.reduce((sum, m) => sum + m.errorRate, 0) / w.length)
    );
    trends.push({
      metric: 'errorRate',
      direction: errorRateTrend.direction,
      magnitude: errorRateTrend.magnitude,
      timeframe,
      significance: errorRateTrend.significance
    });

    return trends;
  }

  /**
   * Generate performance summary for an operation or system
   */
  generateSummary(target?: string): PerformanceSummary {
    const relevantMetrics = target 
      ? (this.metrics.get(target) || [])
      : Array.from(this.metrics.values()).flat();

    if (relevantMetrics.length === 0) {
      return {
        overallScore: 0,
        categories: { speed: 0, efficiency: 0, reliability: 0, scalability: 0 },
        recommendations: ['No performance data available'],
        criticalIssues: 0
      };
    }

    // Calculate category scores
    const categories = {
      speed: this.calculateSpeedScore(relevantMetrics),
      efficiency: this.calculateEfficiencyScore(relevantMetrics),
      reliability: this.calculateReliabilityScore(relevantMetrics),
      scalability: this.calculateScalabilityScore(relevantMetrics)
    };

    const overallScore = (categories.speed + categories.efficiency + categories.reliability + categories.scalability) / 4;

    // Count critical issues
    const criticalIssues = this.alerts.filter(
      alert => alert.severity === 'critical' && !alert.resolved
    ).length;

    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations(categories, relevantMetrics);

    return {
      overallScore: Math.round(overallScore),
      categories,
      recommendations,
      criticalIssues
    };
  }

  /**
   * Get current alerts
   */
  getAlerts(severity?: 'low' | 'medium' | 'high' | 'critical', resolved?: boolean): Alert[] {
    let alerts = [...this.alerts];

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    if (resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === resolved);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.acknowledgedBy = resolvedBy;
      
      this.emit('alert_resolved', { alert });
      logger.info('Alert resolved', { alertId, resolvedBy });
      return true;
    }
    return false;
  }

  /**
   * Get all performance profiles
   */
  getProfiles(): Map<string, PerformanceProfile> {
    return new Map(this.profiles);
  }

  /**
   * Get specific performance profile
   */
  getProfile(operationName: string): PerformanceProfile | undefined {
    return this.profiles.get(operationName);
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(): void {
    const retentionMs = this.config.retentionPeriod * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - retentionMs);

    // Clean metrics
    for (const [operation, metrics] of this.metrics) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
      this.metrics.set(operation, filteredMetrics);
    }

    // Clean alerts
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoff);

    // Clean profiles
    for (const [operation, profile] of this.profiles) {
      if (profile.lastUpdated < cutoff) {
        this.profiles.delete(operation);
      }
    }

    logger.info('Performance data cleanup completed', { cutoff });
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    isMonitoring: boolean;
    activeTargets: number;
    totalMetrics: number;
    totalAlerts: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const totalMetrics = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.length, 0);

    return {
      isMonitoring: this.isMonitoring,
      activeTargets: this.monitoringTimers.size,
      totalMetrics,
      totalAlerts: this.alerts.length,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage()
    };
  }

  // ======================= PRIVATE METHODS =======================

  private async collectMetrics(target: string, samplingRate: number): Promise<void> {
    if (Math.random() > samplingRate) {
      return; // Skip this collection based on sampling rate
    }

    try {
      // Collect system metrics
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Create synthetic metrics for demonstration
      // In a real implementation, this would collect actual metrics from the target
      const metrics: Omit<PerformanceMetrics, 'timestamp' | 'operationId'> = {
        executionTime: Math.random() * 1000 + 100, // 100-1100ms
        memoryUsage: memoryUsage.heapUsed,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to ms
        tokenUsage: Math.floor(Math.random() * 2000 + 500), // 500-2500 tokens
        successRate: 0.95 + Math.random() * 0.05, // 95-100%
        errorRate: Math.random() * 0.05 // 0-5%
      };

      this.recordMetrics(target, metrics);

    } catch (error) {
      logger.error('Failed to collect metrics', { target, error });
    }
  }

  private async createBaseline(target: string): Promise<void> {
    // Create a baseline profile for comparison
    const profile: PerformanceProfile = {
      name: `${target}_baseline`,
      description: `Baseline performance profile for ${target}`,
      baselineMetrics: {
        executionTime: 500,
        memoryUsage: 50 * 1024 * 1024, // 50MB
        cpuUsage: 10,
        tokenUsage: 1000,
        successRate: 0.99,
        errorRate: 0.01,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      },
      currentMetrics: {
        executionTime: 500,
        memoryUsage: 50 * 1024 * 1024,
        cpuUsage: 10,
        tokenUsage: 1000,
        successRate: 0.99,
        errorRate: 0.01,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      },
      trend: 'stable',
      lastUpdated: new Date(),
      samples: 0
    };

    this.profiles.set(target, profile);
    logger.info('Baseline profile created', { target });
  }

  private updateProfile(operationName: string, metrics: PerformanceMetrics): void {
    let profile = this.profiles.get(operationName);

    if (!profile) {
      profile = {
        name: operationName,
        description: `Performance profile for ${operationName}`,
        baselineMetrics: { ...metrics },
        currentMetrics: { ...metrics },
        trend: 'stable',
        lastUpdated: new Date(),
        samples: 1
      };
    } else {
      profile.currentMetrics = { ...metrics };
      profile.lastUpdated = new Date();
      profile.samples++;

      // Update trend
      const trendDirection = this.compareTrend(profile.currentMetrics, profile.baselineMetrics);
      profile.trend = trendDirection;
    }

    this.profiles.set(operationName, profile);
  }

  private checkAlertThresholds(operationName: string, metrics: PerformanceMetrics): void {
    const thresholds = this.config.alertThresholds;

    // Check execution time threshold
    if (metrics.executionTime > thresholds.executionTime) {
      this.createAlert('performance', 'high', 
        `Execution time exceeded threshold: ${metrics.executionTime.toFixed(2)}ms > ${thresholds.executionTime}ms`,
        'executionTime', metrics.executionTime, thresholds.executionTime
      );
    }

    // Check memory usage threshold
    if (metrics.memoryUsage > thresholds.memoryUsage) {
      this.createAlert('resource', 'medium',
        `Memory usage exceeded threshold: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB > ${(thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        'memoryUsage', metrics.memoryUsage, thresholds.memoryUsage
      );
    }

    // Check CPU usage threshold
    if (metrics.cpuUsage > thresholds.cpuUsage) {
      this.createAlert('resource', 'high',
        `CPU usage exceeded threshold: ${metrics.cpuUsage.toFixed(2)}% > ${thresholds.cpuUsage}%`,
        'cpuUsage', metrics.cpuUsage, thresholds.cpuUsage
      );
    }

    // Check error rate threshold
    if (metrics.errorRate > thresholds.errorRate / 100) {
      this.createAlert('error', 'critical',
        `Error rate exceeded threshold: ${(metrics.errorRate * 100).toFixed(2)}% > ${thresholds.errorRate}%`,
        'errorRate', metrics.errorRate * 100, thresholds.errorRate
      );
    }
  }

  private createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    metric: string,
    currentValue: number,
    threshold: number
  ): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      severity,
      type,
      message,
      metric,
      currentValue,
      threshold,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.emit('alert_created', { alert });
    
    logger.warn('Performance alert created', { 
      type, 
      severity, 
      metric, 
      currentValue, 
      threshold 
    });
  }

  private async identifyBottlenecks(target: string, scope: string): Promise<BottleneckInfo[]> {
    const bottlenecks: BottleneckInfo[] = [];
    const metrics = this.metrics.get(target) || [];

    if (metrics.length === 0) {
      return bottlenecks;
    }

    // Analyze execution time bottlenecks
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    if (avgExecutionTime > 2000) { // > 2 seconds
      bottlenecks.push({
        id: this.generateBottleneckId(),
        type: 'algorithm',
        severity: avgExecutionTime > 5000 ? 'critical' : 'high',
        description: `High average execution time: ${avgExecutionTime.toFixed(2)}ms`,
        impact: {
          performanceDegradation: (avgExecutionTime - 500) / 500 * 100,
          userExperience: avgExecutionTime > 5000 ? 'severe' : 'significant',
          resourceConsumption: 70
        },
        suggestions: [
          'Optimize algorithm complexity',
          'Consider caching frequently computed results',
          'Profile code to identify specific bottlenecks'
        ],
        estimatedFixTime: 8,
        confidence: 0.8
      });
    }

    // Analyze memory bottlenecks
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    const memoryMB = avgMemoryUsage / 1024 / 1024;
    if (memoryMB > 100) { // > 100MB
      bottlenecks.push({
        id: this.generateBottleneckId(),
        type: 'memory',
        severity: memoryMB > 500 ? 'critical' : 'medium',
        description: `High memory usage: ${memoryMB.toFixed(2)}MB`,
        impact: {
          performanceDegradation: (memoryMB - 50) / 50 * 100,
          userExperience: memoryMB > 500 ? 'severe' : 'moderate',
          resourceConsumption: 80
        },
        suggestions: [
          'Implement memory pooling',
          'Review object lifecycle management',
          'Consider streaming for large data sets'
        ],
        estimatedFixTime: 6,
        confidence: 0.7
      });
    }

    return bottlenecks;
  }

  private async analyzeHistoricalBottlenecks(target: string): Promise<BottleneckInfo[]> {
    // In a real implementation, this would analyze historical data
    // For now, return empty array
    return [];
  }

  private async identifyOptimizationOpportunities(bottlenecks: BottleneckInfo[]): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    bottlenecks.forEach(bottleneck => {
      if (bottleneck.type === 'algorithm') {
        opportunities.push({
          id: this.generateOpportunityId(),
          type: 'algorithm',
          title: 'Algorithm Optimization',
          description: 'Optimize algorithm complexity to reduce execution time',
          expectedGain: {
            executionTime: 40, // 40% improvement
            memoryUsage: 10,
            cpuUsage: 30
          },
          implementationComplexity: 'medium',
          estimatedEffort: bottleneck.estimatedFixTime,
          prerequisites: ['Performance profiling', 'Algorithm analysis'],
          riskLevel: 'medium',
          confidence: 0.7
        });
      }

      if (bottleneck.type === 'memory') {
        opportunities.push({
          id: this.generateOpportunityId(),
          type: 'memory',
          title: 'Memory Optimization',
          description: 'Implement memory management optimizations',
          expectedGain: {
            executionTime: 20,
            memoryUsage: 50, // 50% improvement
            cpuUsage: 15
          },
          implementationComplexity: 'low',
          estimatedEffort: bottleneck.estimatedFixTime,
          prerequisites: ['Memory profiling'],
          riskLevel: 'low',
          confidence: 0.8
        });
      }
    });

    return opportunities;
  }

  private generateBottleneckSummary(bottlenecks: BottleneckInfo[], opportunities: OptimizationOpportunity[]): any {
    const severityCounts = bottlenecks.reduce((acc, b) => {
      acc[b.severity] = (acc[b.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEstimatedFixTime = bottlenecks.reduce((sum, b) => sum + b.estimatedFixTime, 0);
    const averageConfidence = bottlenecks.reduce((sum, b) => sum + b.confidence, 0) / bottlenecks.length;

    return {
      totalBottlenecks: bottlenecks.length,
      severityBreakdown: severityCounts,
      totalOptimizationOpportunities: opportunities.length,
      estimatedFixTime: totalEstimatedFixTime,
      averageConfidence: averageConfidence || 0,
      priorityRecommendations: bottlenecks
        .filter(b => b.severity === 'critical' || b.severity === 'high')
        .slice(0, 3)
        .map(b => b.suggestions[0])
    };
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    if (lower === upper) return sortedArray[lower];

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private calculateRetentionLimit(): number {
    // Calculate retention limit based on aggregation interval and retention period
    const samplesPerDay = (24 * 60 * 60) / this.config.aggregationInterval;
    return samplesPerDay * this.config.retentionPeriod;
  }

  private getTimeframeMs(timeframe: string): number {
    const timeframes = {
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000
    };
    return timeframes[timeframe] || timeframes['day'];
  }

  private createTimeWindows(metrics: PerformanceMetrics[], windowSize: number): PerformanceMetrics[][] {
    const windows: PerformanceMetrics[][] = [];
    for (let i = 0; i < metrics.length; i += windowSize) {
      windows.push(metrics.slice(i, i + windowSize));
    }
    return windows;
  }

  private calculateTrend(values: number[]): {
    direction: 'up' | 'down' | 'stable';
    magnitude: number;
    significance: 'low' | 'medium' | 'high';
  } {
    if (values.length < 2) {
      return { direction: 'stable', magnitude: 0, significance: 'low' };
    }

    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const magnitude = Math.abs(slope);

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (slope > 0.1) direction = 'up';
    else if (slope < -0.1) direction = 'down';

    let significance: 'low' | 'medium' | 'high' = 'low';
    if (magnitude > 0.5) significance = 'high';
    else if (magnitude > 0.2) significance = 'medium';

    return { direction, magnitude, significance };
  }

  private calculateSpeedScore(metrics: PerformanceMetrics[]): number {
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    // Score from 0-100, where 100ms = 100 points, 1000ms = 0 points
    return Math.max(0, Math.min(100, 100 - (avgExecutionTime - 100) / 10));
  }

  private calculateEfficiencyScore(metrics: PerformanceMetrics[]): number {
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    const avgCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;
    
    const memoryScore = Math.max(0, Math.min(100, 100 - (avgMemoryUsage / 1024 / 1024) / 2)); // 200MB = 0 points
    const cpuScore = Math.max(0, Math.min(100, 100 - avgCpuUsage));
    
    return (memoryScore + cpuScore) / 2;
  }

  private calculateReliabilityScore(metrics: PerformanceMetrics[]): number {
    const avgSuccessRate = metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    
    return Math.max(0, Math.min(100, avgSuccessRate * 100 - avgErrorRate * 100));
  }

  private calculateScalabilityScore(metrics: PerformanceMetrics[]): number {
    // Simple heuristic based on consistency of performance
    if (metrics.length < 10) return 50; // Not enough data
    
    const executionTimes = metrics.map(m => m.executionTime);
    const variance = this.calculateVariance(executionTimes);
    const coefficient = Math.sqrt(variance) / (executionTimes.reduce((a, b) => a + b) / executionTimes.length);
    
    // Lower coefficient of variation = better scalability
    return Math.max(0, Math.min(100, 100 - coefficient * 100));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b) / values.length;
    return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  }

  private generatePerformanceRecommendations(
    categories: { speed: number; efficiency: number; reliability: number; scalability: number },
    metrics: PerformanceMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    if (categories.speed < 70) {
      recommendations.push('Optimize algorithms and reduce execution time');
    }

    if (categories.efficiency < 70) {
      recommendations.push('Improve resource utilization and reduce memory/CPU usage');
    }

    if (categories.reliability < 90) {
      recommendations.push('Improve error handling and increase success rates');
    }

    if (categories.scalability < 70) {
      recommendations.push('Improve performance consistency for better scalability');
    }

    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    if (avgExecutionTime > 1000) {
      recommendations.push('Consider caching and performance optimization');
    }

    return recommendations.length > 0 ? recommendations : ['Performance is within acceptable ranges'];
  }

  private compareTrend(current: PerformanceMetrics, baseline: PerformanceMetrics): 'improving' | 'stable' | 'degrading' {
    const executionTimeDiff = (current.executionTime - baseline.executionTime) / baseline.executionTime;
    const memoryDiff = (current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage;
    
    const overallChange = (executionTimeDiff + memoryDiff) / 2;
    
    if (overallChange < -0.1) return 'improving';
    if (overallChange > 0.1) return 'degrading';
    return 'stable';
  }

  private compareSeverity(severity1: string, severity2: string): number {
    const severityOrder = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
    return severityOrder[severity1] - severityOrder[severity2];
  }

  private setupCleanupScheduler(): void {
    // Schedule daily cleanup
    setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000);
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBottleneckId(): string {
    return `bottleneck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOpportunityId(): string {
    return `opportunity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}