import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@superclaude/shared';
import {
  Task,
  TaskQueue,
  TaskState,
  TaskPriority,
  TaskComplexity
} from '../types/index.js';

/**
 * Analytics metric types
 */
export enum MetricType {
  PERFORMANCE = 'performance',
  PRODUCTIVITY = 'productivity',
  QUALITY = 'quality',
  RESOURCE_UTILIZATION = 'resource_utilization',
  BOTTLENECK = 'bottleneck',
  TREND = 'trend',
  PREDICTION = 'prediction',
  ANOMALY = 'anomaly'
}

/**
 * Time window for analytics
 */
export enum TimeWindow {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * Aggregation type
 */
export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  PERCENTILE = 'percentile',
  DISTRIBUTION = 'distribution'
}

/**
 * Analytics metric definition
 */
export interface AnalyticsMetric {
  id: string;
  name: string;
  type: MetricType;
  description: string;
  unit: string;
  value: number;
  timestamp: Date;
  timeWindow: TimeWindow;
  aggregationType: AggregationType;
  tags: string[];
  metadata: Record<string, any>;
  threshold?: {
    min?: number;
    max?: number;
    target?: number;
    critical?: number;
  };
}

/**
 * Bottleneck detection result
 */
export interface Bottleneck {
  id: string;
  type: 'resource' | 'process' | 'dependency' | 'skill' | 'external';
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: {
    delayDays: number;
    affectedTasks: string[];
    resourceWaste: number;
    costImpact: number;
  };
  rootCause: {
    primary: string;
    contributing: string[];
    evidence: any[];
  };
  recommendations: Array<{
    action: string;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    timeline: string;
    cost: number;
  }>;
  discoveredAt: Date;
  resolvedAt?: Date;
}

/**
 * Performance insights
 */
export interface PerformanceInsight {
  id: string;
  category: 'velocity' | 'quality' | 'efficiency' | 'predictability' | 'satisfaction';
  title: string;
  description: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  dataPoints: Array<{
    metric: string;
    value: number;
    benchmark: number;
    variance: number;
  }>;
  trends: Array<{
    metric: string;
    direction: 'improving' | 'stable' | 'declining';
    rate: number;
    confidence: number;
  }>;
  recommendations: Array<{
    priority: number;
    action: string;
    expectedImprovement: string;
    effort: string;
  }>;
  generatedAt: Date;
}

/**
 * Analytics dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  timeWindow: TimeWindow;
  refreshInterval: number;
  filters: Record<string, any>;
  visualizations: Array<{
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'gauge';
    metric: string;
    config: Record<string, any>;
  }>;
}

/**
 * Anomaly detection result
 */
export interface Anomaly {
  id: string;
  metric: string;
  type: 'spike' | 'drop' | 'trend_break' | 'outlier' | 'pattern_deviation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedValue: number;
  expectedValue: number;
  deviation: number;
  confidence: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  affectedEntities: string[];
  possibleCauses: Array<{
    cause: string;
    probability: number;
    evidence: any[];
  }>;
  detectedAt: Date;
  acknowledged?: Date;
  resolvedAt?: Date;
}

/**
 * Predictive model result
 */
export interface PredictiveModel {
  id: string;
  name: string;
  type: 'forecasting' | 'classification' | 'regression' | 'clustering';
  targetMetric: string;
  accuracy: number;
  predictions: Array<{
    timestamp: Date;
    value: number;
    confidence: number;
    factors: Record<string, number>;
  }>;
  model: {
    algorithm: string;
    features: string[];
    parameters: Record<string, any>;
    lastTrained: Date;
    trainingSize: number;
  };
  validation: {
    method: 'holdout' | 'cross_validation' | 'time_series';
    score: number;
    metrics: Record<string, number>;
  };
}

/**
 * Resource optimization suggestion
 */
export interface ResourceOptimization {
  id: string;
  type: 'reallocation' | 'scaling' | 'scheduling' | 'capacity_planning';
  description: string;
  currentState: {
    utilization: Record<string, number>;
    efficiency: number;
    bottlenecks: string[];
  };
  proposedState: {
    changes: Array<{
      resource: string;
      action: 'increase' | 'decrease' | 'reallocate' | 'reschedule';
      amount: number;
    }>;
    expectedUtilization: Record<string, number>;
    expectedEfficiency: number;
  };
  impact: {
    timeImprovement: number;
    costImprovement: number;
    qualityImprovement: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    prerequisites: string[];
    risks: string[];
  };
  generatedAt: Date;
}

/**
 * Advanced analytics engine for task management insights
 */
export class AnalyticsEngine extends EventEmitter {
  private metrics: Map<string, AnalyticsMetric[]> = new Map();
  private bottlenecks: Map<string, Bottleneck> = new Map();
  private insights: Map<string, PerformanceInsight> = new Map();
  private anomalies: Map<string, Anomaly> = new Map();
  private predictiveModels: Map<string, PredictiveModel> = new Map();
  private optimizations: Map<string, ResourceOptimization> = new Map();
  private dashboards: Map<string, DashboardConfig> = new Map();
  
  // Data caches for performance
  private taskCache: Task[] = [];
  private queueCache: TaskQueue[] = [];
  private metricsCache: Map<string, AnalyticsMetric> = new Map();
  
  constructor() {
    super();
    this.setupPeriodicAnalysis();
    this.setupAnomalyDetection();
    this.setupPredictiveModeling();
    
    logger.info('AnalyticsEngine initialized');
  }
  
  /**
   * Update data sources for analytics
   */
  updateData(tasks: Task[], queues: TaskQueue[]): void {
    this.taskCache = [...tasks];
    this.queueCache = [...queues];
    
    // Trigger immediate analysis for significant changes
    if (this.hasSignificantChanges(tasks, queues)) {
      this.performRealTimeAnalysis();
    }
    
    this.emit('data_updated', { taskCount: tasks.length, queueCount: queues.length });
  }
  
  /**
   * Calculate comprehensive performance metrics
   */
  async calculateMetrics(timeWindow: TimeWindow = TimeWindow.DAY): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];
    const now = new Date();
    
    try {
      // Velocity metrics
      metrics.push(...await this.calculateVelocityMetrics(timeWindow, now));
      
      // Quality metrics
      metrics.push(...await this.calculateQualityMetrics(timeWindow, now));
      
      // Resource utilization metrics
      metrics.push(...await this.calculateResourceMetrics(timeWindow, now));
      
      // Productivity metrics
      metrics.push(...await this.calculateProductivityMetrics(timeWindow, now));
      
      // Predictability metrics
      metrics.push(...await this.calculatePredictabilityMetrics(timeWindow, now));
      
      // Store metrics
      const metricKey = `${timeWindow}_${now.toISOString().split('T')[0]}`;
      this.metrics.set(metricKey, metrics);
      
      // Update cache for quick access
      for (const metric of metrics) {
        this.metricsCache.set(metric.id, metric);
      }
      
      this.emit('metrics_calculated', { 
        count: metrics.length, 
        timeWindow, 
        timestamp: now 
      });
      
      logger.info('Metrics calculated', { 
        count: metrics.length, 
        timeWindow 
      });
      
      return metrics;
      
    } catch (error) {
      logger.error('Metrics calculation failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Detect system bottlenecks
   */
  async detectBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];
    
    try {
      // Resource bottlenecks
      bottlenecks.push(...await this.detectResourceBottlenecks());
      
      // Process bottlenecks
      bottlenecks.push(...await this.detectProcessBottlenecks());
      
      // Dependency bottlenecks
      bottlenecks.push(...await this.detectDependencyBottlenecks());
      
      // Skill bottlenecks
      bottlenecks.push(...await this.detectSkillBottlenecks());
      
      // External bottlenecks
      bottlenecks.push(...await this.detectExternalBottlenecks());
      
      // Store bottlenecks
      for (const bottleneck of bottlenecks) {
        this.bottlenecks.set(bottleneck.id, bottleneck);
      }
      
      this.emit('bottlenecks_detected', { 
        count: bottlenecks.length,
        severities: this.groupBy(bottlenecks, 'severity')
      });
      
      logger.info('Bottlenecks detected', { 
        count: bottlenecks.length,
        critical: bottlenecks.filter(b => b.severity === 'critical').length
      });
      
      return bottlenecks;
      
    } catch (error) {
      logger.error('Bottleneck detection failed', { error: error.message });
      return [];
    }
  }
  
  /**
   * Generate performance insights
   */
  async generateInsights(): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    try {
      // Velocity insights
      insights.push(...await this.generateVelocityInsights());
      
      // Quality insights
      insights.push(...await this.generateQualityInsights());
      
      // Efficiency insights
      insights.push(...await this.generateEfficiencyInsights());
      
      // Predictability insights
      insights.push(...await this.generatePredictabilityInsights());
      
      // Cross-cutting insights
      insights.push(...await this.generateCrossCuttingInsights());
      
      // Store insights
      for (const insight of insights) {
        this.insights.set(insight.id, insight);
      }
      
      this.emit('insights_generated', { 
        count: insights.length,
        categories: this.groupBy(insights, 'category')
      });
      
      logger.info('Performance insights generated', { count: insights.length });
      
      return insights;
      
    } catch (error) {
      logger.error('Insight generation failed', { error: error.message });
      return [];
    }
  }
  
  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    try {
      const recentMetrics = this.getRecentMetrics(TimeWindow.WEEK);
      
      for (const [metricName, metricHistory] of recentMetrics) {
        // Statistical anomaly detection
        const statisticalAnomalies = this.detectStatisticalAnomalies(metricName, metricHistory);
        anomalies.push(...statisticalAnomalies);
        
        // Trend anomalies
        const trendAnomalies = this.detectTrendAnomalies(metricName, metricHistory);
        anomalies.push(...trendAnomalies);
        
        // Pattern anomalies
        const patternAnomalies = this.detectPatternAnomalies(metricName, metricHistory);
        anomalies.push(...patternAnomalies);
      }
      
      // Store anomalies
      for (const anomaly of anomalies) {
        this.anomalies.set(anomaly.id, anomaly);
      }
      
      this.emit('anomalies_detected', { 
        count: anomalies.length,
        critical: anomalies.filter(a => a.severity === 'critical').length
      });
      
      logger.info('Anomalies detected', { count: anomalies.length });
      
      return anomalies;
      
    } catch (error) {
      logger.error('Anomaly detection failed', { error: error.message });
      return [];
    }
  }
  
  /**
   * Generate resource optimization recommendations
   */
  async optimizeResources(): Promise<ResourceOptimization[]> {
    const optimizations: ResourceOptimization[] = [];
    
    try {
      // Analyze current resource state
      const resourceState = await this.analyzeResourceState();
      
      // Generate optimization strategies
      if (resourceState.bottlenecks.length > 0) {
        optimizations.push(...await this.generateBottleneckOptimizations(resourceState));
      }
      
      if (resourceState.underutilization.length > 0) {
        optimizations.push(...await this.generateUtilizationOptimizations(resourceState));
      }
      
      if (resourceState.imbalances.length > 0) {
        optimizations.push(...await this.generateBalancingOptimizations(resourceState));
      }
      
      // Capacity planning optimizations
      optimizations.push(...await this.generateCapacityOptimizations(resourceState));
      
      // Store optimizations
      for (const optimization of optimizations) {
        this.optimizations.set(optimization.id, optimization);
      }
      
      this.emit('optimizations_generated', { 
        count: optimizations.length,
        types: this.groupBy(optimizations, 'type')
      });
      
      logger.info('Resource optimizations generated', { count: optimizations.length });
      
      return optimizations;
      
    } catch (error) {
      logger.error('Resource optimization failed', { error: error.message });
      return [];
    }
  }
  
  /**
   * Calculate velocity metrics
   */
  private async calculateVelocityMetrics(timeWindow: TimeWindow, timestamp: Date): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];
    const windowMs = this.getTimeWindowMs(timeWindow);
    const startTime = new Date(timestamp.getTime() - windowMs);
    
    const tasksInWindow = this.taskCache.filter(t => 
      t.createdAt >= startTime && t.createdAt <= timestamp
    );
    
    const completedTasks = tasksInWindow.filter(t => t.state === TaskState.COMPLETED);
    
    // Tasks completed per time window
    metrics.push({
      id: uuidv4(),
      name: 'tasks_completed',
      type: MetricType.PRODUCTIVITY,
      description: `Tasks completed in the last ${timeWindow}`,
      unit: 'tasks',
      value: completedTasks.length,
      timestamp,
      timeWindow,
      aggregationType: AggregationType.COUNT,
      tags: ['velocity', 'completion'],
      metadata: { totalTasks: tasksInWindow.length },
      threshold: { target: this.calculateTargetCompletion(timeWindow) }
    });
    
    // Average completion time
    const completionTimes = completedTasks
      .filter(t => t.completedAt && t.createdAt)
      .map(t => (t.completedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60));
    
    const avgCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
      : 0;
    
    metrics.push({
      id: uuidv4(),
      name: 'average_completion_time',
      type: MetricType.PERFORMANCE,
      description: 'Average time to complete tasks',
      unit: 'hours',
      value: avgCompletionTime,
      timestamp,
      timeWindow,
      aggregationType: AggregationType.AVERAGE,
      tags: ['velocity', 'time'],
      metadata: { sampleSize: completionTimes.length },
      threshold: { max: 48, target: 24 }
    });
    
    // Velocity trend
    const previousPeriodTasks = this.getTasksInPreviousPeriod(timeWindow, timestamp);
    const velocityTrend = completedTasks.length - previousPeriodTasks.length;
    
    metrics.push({
      id: uuidv4(),
      name: 'velocity_trend',
      type: MetricType.TREND,
      description: 'Change in task completion velocity',
      unit: 'tasks',
      value: velocityTrend,
      timestamp,
      timeWindow,
      aggregationType: AggregationType.COUNT,
      tags: ['velocity', 'trend'],
      metadata: { 
        current: completedTasks.length,
        previous: previousPeriodTasks.length
      }
    });
    
    return metrics;
  }
  
  /**
   * Calculate quality metrics
   */
  private async calculateQualityMetrics(timeWindow: TimeWindow, timestamp: Date): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];
    const windowMs = this.getTimeWindowMs(timeWindow);
    const startTime = new Date(timestamp.getTime() - windowMs);
    
    const tasksInWindow = this.taskCache.filter(t => 
      t.createdAt >= startTime && t.createdAt <= timestamp
    );
    
    // Task success rate
    const completedTasks = tasksInWindow.filter(t => t.state === TaskState.COMPLETED);
    const failedTasks = tasksInWindow.filter(t => t.state === TaskState.CANCELLED);
    const successRate = tasksInWindow.length > 0 
      ? (completedTasks.length / (completedTasks.length + failedTasks.length)) * 100
      : 0;
    
    metrics.push({
      id: uuidv4(),
      name: 'task_success_rate',
      type: MetricType.QUALITY,
      description: 'Percentage of tasks completed successfully',
      unit: 'percentage',
      value: successRate,
      timestamp,
      timeWindow,
      aggregationType: AggregationType.AVERAGE,
      tags: ['quality', 'success'],
      metadata: { 
        completed: completedTasks.length,
        failed: failedTasks.length,
        total: tasksInWindow.length
      },
      threshold: { min: 80, target: 95 }
    });
    
    // Rework rate (tasks that were reopened)
    const reworkedTasks = completedTasks.filter(t => 
      this.taskCache.some(other => 
        other.parentId === t.id && 
        other.title.toLowerCase().includes('fix') ||
        other.title.toLowerCase().includes('rework')
      )
    );
    
    const reworkRate = completedTasks.length > 0 
      ? (reworkedTasks.length / completedTasks.length) * 100
      : 0;
    
    metrics.push({
      id: uuidv4(),
      name: 'rework_rate',
      type: MetricType.QUALITY,
      description: 'Percentage of tasks requiring rework',
      unit: 'percentage',
      value: reworkRate,
      timestamp,
      timeWindow,
      aggregationType: AggregationType.AVERAGE,
      tags: ['quality', 'rework'],
      metadata: { 
        reworked: reworkedTasks.length,
        completed: completedTasks.length
      },
      threshold: { max: 10, target: 5 }
    });
    
    return metrics;
  }
  
  /**
   * Calculate resource utilization metrics
   */
  private async calculateResourceMetrics(timeWindow: TimeWindow, timestamp: Date): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];
    
    // Queue utilization
    const averageQueueSize = this.queueCache.length > 0
      ? this.queueCache.reduce((sum, q) => sum + q.tasks.length, 0) / this.queueCache.length
      : 0;
    
    metrics.push({
      id: uuidv4(),
      name: 'average_queue_size',
      type: MetricType.RESOURCE_UTILIZATION,
      description: 'Average number of tasks in queues',
      unit: 'tasks',
      value: averageQueueSize,
      timestamp,
      timeWindow,
      aggregationType: AggregationType.AVERAGE,
      tags: ['resource', 'queue'],
      metadata: { queueCount: this.queueCache.length },
      threshold: { max: 50, target: 20 }
    });
    
    // Task distribution by priority
    const priorityDistribution = this.groupBy(this.taskCache, 'priority');
    for (const [priority, count] of Object.entries(priorityDistribution)) {
      metrics.push({
        id: uuidv4(),
        name: `tasks_by_priority_${priority}`,
        type: MetricType.RESOURCE_UTILIZATION,
        description: `Number of ${priority} priority tasks`,
        unit: 'tasks',
        value: count,
        timestamp,
        timeWindow,
        aggregationType: AggregationType.COUNT,
        tags: ['resource', 'priority', priority],
        metadata: { priority }
      });
    }
    
    return metrics;
  }
  
  /**
   * Calculate productivity metrics
   */
  private async calculateProductivityMetrics(timeWindow: TimeWindow, timestamp: Date): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];
    const windowMs = this.getTimeWindowMs(timeWindow);
    const startTime = new Date(timestamp.getTime() - windowMs);
    
    const tasksInWindow = this.taskCache.filter(t => 
      t.createdAt >= startTime && t.createdAt <= timestamp
    );
    
    // Tasks per day
    const daysInWindow = windowMs / (1000 * 60 * 60 * 24);
    const tasksPerDay = tasksInWindow.length / daysInWindow;
    
    metrics.push({
      id: uuidv4(),
      name: 'tasks_per_day',
      type: MetricType.PRODUCTIVITY,
      description: 'Average tasks created per day',
      unit: 'tasks/day',
      value: tasksPerDay,
      timestamp,
      timeWindow,
      aggregationType: AggregationType.AVERAGE,
      tags: ['productivity', 'creation'],
      metadata: { totalTasks: tasksInWindow.length, days: daysInWindow }
    });
    
    // Complexity distribution
    const complexityDistribution = this.groupBy(tasksInWindow, 'complexity');
    const avgComplexity = this.calculateAverageComplexity(tasksInWindow);
    
    metrics.push({
      id: uuidv4(),
      name: 'average_task_complexity',
      type: MetricType.PRODUCTIVITY,
      description: 'Average task complexity',
      unit: 'complexity_score',
      value: avgComplexity,
      timestamp,
      timeWindow,
      aggregationType: AggregationType.AVERAGE,
      tags: ['productivity', 'complexity'],
      metadata: { distribution: complexityDistribution }
    });
    
    return metrics;
  }
  
  /**
   * Calculate predictability metrics
   */
  private async calculatePredictabilityMetrics(timeWindow: TimeWindow, timestamp: Date): Promise<AnalyticsMetric[]> {
    const metrics: AnalyticsMetric[] = [];
    
    // Estimation accuracy
    const tasksWithEstimates = this.taskCache.filter(t => 
      t.estimatedHours && t.actualHours && t.state === TaskState.COMPLETED
    );
    
    if (tasksWithEstimates.length > 0) {
      const accuracyScores = tasksWithEstimates.map(t => {
        const error = Math.abs(t.actualHours! - t.estimatedHours!) / t.estimatedHours!;
        return Math.max(0, 1 - error); // Accuracy score between 0 and 1
      });
      
      const avgAccuracy = accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length;
      
      metrics.push({
        id: uuidv4(),
        name: 'estimation_accuracy',
        type: MetricType.PREDICTION,
        description: 'Average accuracy of time estimates',
        unit: 'percentage',
        value: avgAccuracy * 100,
        timestamp,
        timeWindow,
        aggregationType: AggregationType.AVERAGE,
        tags: ['predictability', 'estimation'],
        metadata: { sampleSize: tasksWithEstimates.length },
        threshold: { min: 70, target: 85 }
      });
    }
    
    return metrics;
  }
  
  /**
   * Detect resource bottlenecks
   */
  private async detectResourceBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];
    
    // Queue capacity bottlenecks
    for (const queue of this.queueCache) {
      if (queue.tasks.length >= queue.maxConcurrentTasks * 0.9) {
        bottlenecks.push({
          id: uuidv4(),
          type: 'resource',
          location: `Queue: ${queue.name}`,
          description: `Queue ${queue.name} is at ${Math.round((queue.tasks.length / queue.maxConcurrentTasks) * 100)}% capacity`,
          severity: queue.tasks.length >= queue.maxConcurrentTasks ? 'critical' : 'high',
          impact: {
            delayDays: this.estimateQueueDelay(queue),
            affectedTasks: queue.tasks,
            resourceWaste: 0,
            costImpact: this.estimateCostImpact(queue.tasks.length)
          },
          rootCause: {
            primary: 'Queue capacity limit reached',
            contributing: ['High task volume', 'Limited concurrent processing'],
            evidence: [{ queueSize: queue.tasks.length, capacity: queue.maxConcurrentTasks }]
          },
          recommendations: [
            {
              action: 'Increase queue capacity',
              effort: 'low',
              impact: 'high',
              timeline: '1-2 days',
              cost: 1000
            },
            {
              action: 'Optimize task processing',
              effort: 'medium',
              impact: 'medium',
              timeline: '1 week',
              cost: 5000
            }
          ],
          discoveredAt: new Date()
        });
      }
    }
    
    return bottlenecks;
  }
  
  /**
   * Detect process bottlenecks
   */
  private async detectProcessBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];
    
    // Long-running tasks
    const longRunningTasks = this.taskCache.filter(t => 
      t.state === TaskState.IN_PROGRESS &&
      t.updatedAt &&
      (Date.now() - t.updatedAt.getTime()) > (7 * 24 * 60 * 60 * 1000) // 7 days
    );
    
    if (longRunningTasks.length > 0) {
      bottlenecks.push({
        id: uuidv4(),
        type: 'process',
        location: 'Task execution',
        description: `${longRunningTasks.length} tasks have been in progress for more than 7 days`,
        severity: longRunningTasks.length > 5 ? 'high' : 'medium',
        impact: {
          delayDays: 7,
          affectedTasks: longRunningTasks.map(t => t.id),
          resourceWaste: longRunningTasks.length * 0.5,
          costImpact: longRunningTasks.length * 2000
        },
        rootCause: {
          primary: 'Tasks stuck in execution',
          contributing: ['Unclear requirements', 'Blocked dependencies', 'Resource constraints'],
          evidence: longRunningTasks.map(t => ({ taskId: t.id, duration: Date.now() - t.updatedAt!.getTime() }))
        },
        recommendations: [
          {
            action: 'Review and unblock stuck tasks',
            effort: 'medium',
            impact: 'high',
            timeline: '3-5 days',
            cost: 3000
          },
          {
            action: 'Implement task timeout policies',
            effort: 'low',
            impact: 'medium',
            timeline: '1 day',
            cost: 500
          }
        ],
        discoveredAt: new Date()
      });
    }
    
    return bottlenecks;
  }
  
  /**
   * Detect dependency bottlenecks
   */
  private async detectDependencyBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];
    
    // Tasks with many dependents
    const dependencyMap = new Map<string, string[]>();
    
    for (const task of this.taskCache) {
      for (const depId of task.dependencies) {
        if (!dependencyMap.has(depId)) {
          dependencyMap.set(depId, []);
        }
        dependencyMap.get(depId)!.push(task.id);
      }
    }
    
    // Find tasks that are blocking many others
    for (const [taskId, dependents] of dependencyMap) {
      if (dependents.length >= 5) {
        const blockingTask = this.taskCache.find(t => t.id === taskId);
        if (blockingTask && blockingTask.state !== TaskState.COMPLETED) {
          bottlenecks.push({
            id: uuidv4(),
            type: 'dependency',
            location: `Task: ${blockingTask.title}`,
            description: `Task "${blockingTask.title}" is blocking ${dependents.length} other tasks`,
            severity: dependents.length > 10 ? 'critical' : 'high',
            impact: {
              delayDays: this.estimateBlockingDelay(blockingTask),
              affectedTasks: dependents,
              resourceWaste: dependents.length * 0.3,
              costImpact: dependents.length * 1500
            },
            rootCause: {
              primary: 'Critical path dependency not completed',
              contributing: ['Task complexity', 'Resource constraints', 'Unclear requirements'],
              evidence: [{ blockingTaskId: taskId, dependentCount: dependents.length }]
            },
            recommendations: [
              {
                action: 'Prioritize completion of blocking task',
                effort: 'medium',
                impact: 'high',
                timeline: '2-3 days',
                cost: 2000
              },
              {
                action: 'Break down blocking task into smaller pieces',
                effort: 'high',
                impact: 'high',
                timeline: '1 week',
                cost: 5000
              }
            ],
            discoveredAt: new Date()
          });
        }
      }
    }
    
    return bottlenecks;
  }
  
  /**
   * Detect skill bottlenecks
   */
  private async detectSkillBottlenecks(): Promise<Bottleneck[]> {
    // This would analyze task assignments and skill requirements
    // For now, return empty array as it requires more complex skill tracking
    return [];
  }
  
  /**
   * Detect external bottlenecks
   */
  private async detectExternalBottlenecks(): Promise<Bottleneck[]> {
    // This would analyze external dependencies and integrations
    // For now, return empty array as it requires external system monitoring
    return [];
  }
  
  /**
   * Generate velocity insights
   */
  private async generateVelocityInsights(): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    // Velocity trend analysis
    const weeklyVelocity = await this.getVelocityTrend(TimeWindow.WEEK, 4);
    const velocityTrend = this.analyzeTrend(weeklyVelocity);
    
    if (velocityTrend.direction !== 'stable') {
      insights.push({
        id: uuidv4(),
        category: 'velocity',
        title: `Team velocity is ${velocityTrend.direction}`,
        description: `Task completion rate has ${velocityTrend.direction} by ${Math.abs(velocityTrend.rate)}% over the last 4 weeks`,
        significance: Math.abs(velocityTrend.rate) > 20 ? 'high' : 'medium',
        dataPoints: weeklyVelocity.map((velocity, index) => ({
          metric: `Week ${index + 1}`,
          value: velocity,
          benchmark: weeklyVelocity[0],
          variance: ((velocity - weeklyVelocity[0]) / weeklyVelocity[0]) * 100
        })),
        trends: [{
          metric: 'weekly_velocity',
          direction: velocityTrend.direction,
          rate: velocityTrend.rate,
          confidence: velocityTrend.confidence
        }],
        recommendations: this.getVelocityRecommendations(velocityTrend),
        generatedAt: new Date()
      });
    }
    
    return insights;
  }
  
  /**
   * Generate quality insights
   */
  private async generateQualityInsights(): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    // Success rate analysis
    const currentSuccessRate = this.calculateCurrentSuccessRate();
    const benchmarkSuccessRate = 95; // Target benchmark
    
    if (currentSuccessRate < benchmarkSuccessRate) {
      insights.push({
        id: uuidv4(),
        category: 'quality',
        title: 'Task success rate below target',
        description: `Current success rate is ${currentSuccessRate.toFixed(1)}%, below the target of ${benchmarkSuccessRate}%`,
        significance: currentSuccessRate < 80 ? 'critical' : 'high',
        dataPoints: [{
          metric: 'success_rate',
          value: currentSuccessRate,
          benchmark: benchmarkSuccessRate,
          variance: currentSuccessRate - benchmarkSuccessRate
        }],
        trends: [{
          metric: 'success_rate',
          direction: currentSuccessRate < benchmarkSuccessRate ? 'declining' : 'stable',
          rate: benchmarkSuccessRate - currentSuccessRate,
          confidence: 0.8
        }],
        recommendations: [
          {
            priority: 1,
            action: 'Improve task definition and acceptance criteria',
            expectedImprovement: 'Increase success rate by 10-15%',
            effort: 'Medium'
          },
          {
            priority: 2,
            action: 'Implement better quality gates',
            expectedImprovement: 'Reduce failed tasks by 50%',
            effort: 'High'
          }
        ],
        generatedAt: new Date()
      });
    }
    
    return insights;
  }
  
  /**
   * Generate efficiency insights
   */
  private async generateEfficiencyInsights(): Promise<PerformanceInsight[]> {
    // Analyze resource utilization, idle time, and process efficiency
    return [];
  }
  
  /**
   * Generate predictability insights
   */
  private async generatePredictabilityInsights(): Promise<PerformanceInsight[]> {
    // Analyze estimation accuracy and delivery predictability
    return [];
  }
  
  /**
   * Generate cross-cutting insights
   */
  private async generateCrossCuttingInsights(): Promise<PerformanceInsight[]> {
    // Analyze insights that span multiple categories
    return [];
  }
  
  /**
   * Statistical anomaly detection
   */
  private detectStatisticalAnomalies(metricName: string, history: AnalyticsMetric[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    if (history.length < 10) return anomalies; // Need sufficient history
    
    const values = history.map(m => m.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    // Detect outliers (values beyond 3 standard deviations)
    const latest = history[history.length - 1];
    const zScore = Math.abs((latest.value - mean) / stdDev);
    
    if (zScore > 3) {
      anomalies.push({
        id: uuidv4(),
        metric: metricName,
        type: latest.value > mean + 3 * stdDev ? 'spike' : 'drop',
        severity: zScore > 4 ? 'critical' : 'high',
        description: `${metricName} value ${latest.value} is ${zScore.toFixed(1)} standard deviations from the mean`,
        detectedValue: latest.value,
        expectedValue: mean,
        deviation: zScore,
        confidence: Math.min(0.95, zScore / 5),
        timeRange: {
          start: latest.timestamp,
          end: latest.timestamp
        },
        affectedEntities: [],
        possibleCauses: [
          {
            cause: 'System overload',
            probability: 0.4,
            evidence: [`Z-score: ${zScore.toFixed(1)}`]
          },
          {
            cause: 'Data quality issue',
            probability: 0.3,
            evidence: [`Outlier value: ${latest.value}`]
          },
          {
            cause: 'Process change',
            probability: 0.3,
            evidence: [`Sudden change detected`]
          }
        ],
        detectedAt: new Date()
      });
    }
    
    return anomalies;
  }
  
  /**
   * Trend anomaly detection
   */
  private detectTrendAnomalies(metricName: string, history: AnalyticsMetric[]): Anomaly[] {
    // Detect sudden trend changes
    return [];
  }
  
  /**
   * Pattern anomaly detection
   */
  private detectPatternAnomalies(metricName: string, history: AnalyticsMetric[]): Anomaly[] {
    // Detect deviations from expected patterns
    return [];
  }
  
  /**
   * Helper methods
   */
  private getTimeWindowMs(window: TimeWindow): number {
    const multipliers = {
      [TimeWindow.HOUR]: 60 * 60 * 1000,
      [TimeWindow.DAY]: 24 * 60 * 60 * 1000,
      [TimeWindow.WEEK]: 7 * 24 * 60 * 60 * 1000,
      [TimeWindow.MONTH]: 30 * 24 * 60 * 60 * 1000,
      [TimeWindow.QUARTER]: 90 * 24 * 60 * 60 * 1000,
      [TimeWindow.YEAR]: 365 * 24 * 60 * 60 * 1000
    };
    return multipliers[window];
  }
  
  private hasSignificantChanges(tasks: Task[], queues: TaskQueue[]): boolean {
    // Simple heuristic for detecting significant changes
    const prevTaskCount = this.taskCache.length;
    const prevQueueCount = this.queueCache.length;
    
    const taskChangePercent = Math.abs(tasks.length - prevTaskCount) / Math.max(prevTaskCount, 1);
    const queueChangePercent = Math.abs(queues.length - prevQueueCount) / Math.max(prevQueueCount, 1);
    
    return taskChangePercent > 0.1 || queueChangePercent > 0.2;
  }
  
  private groupBy<T>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
  
  private calculateTargetCompletion(timeWindow: TimeWindow): number {
    const targets = {
      [TimeWindow.HOUR]: 2,
      [TimeWindow.DAY]: 10,
      [TimeWindow.WEEK]: 50,
      [TimeWindow.MONTH]: 200
    };
    return targets[timeWindow] || 10;
  }
  
  private getTasksInPreviousPeriod(timeWindow: TimeWindow, timestamp: Date): Task[] {
    const windowMs = this.getTimeWindowMs(timeWindow);
    const previousStart = new Date(timestamp.getTime() - 2 * windowMs);
    const previousEnd = new Date(timestamp.getTime() - windowMs);
    
    return this.taskCache.filter(t => 
      t.createdAt >= previousStart && t.createdAt <= previousEnd
    );
  }
  
  private calculateAverageComplexity(tasks: Task[]): number {
    const complexityValues = { simple: 1, moderate: 2, complex: 3, very_complex: 4 };
    const total = tasks.reduce((sum, task) => 
      sum + complexityValues[task.complexity || 'moderate'], 0
    );
    return tasks.length > 0 ? total / tasks.length : 0;
  }
  
  private getRecentMetrics(timeWindow: TimeWindow): Map<string, AnalyticsMetric[]> {
    const recentMetrics = new Map<string, AnalyticsMetric[]>();
    
    for (const [key, metrics] of this.metrics) {
      for (const metric of metrics) {
        if (!recentMetrics.has(metric.name)) {
          recentMetrics.set(metric.name, []);
        }
        recentMetrics.get(metric.name)!.push(metric);
      }
    }
    
    return recentMetrics;
  }
  
  private estimateQueueDelay(queue: TaskQueue): number {
    // Simple estimation based on queue size
    return Math.max(0, queue.tasks.length - queue.maxConcurrentTasks) * 0.5;
  }
  
  private estimateCostImpact(taskCount: number): number {
    // Simple cost estimation
    return taskCount * 100; // $100 per delayed task
  }
  
  private estimateBlockingDelay(task: Task): number {
    const complexityDays = { simple: 1, moderate: 2, complex: 5, very_complex: 10 };
    return complexityDays[task.complexity || 'moderate'];
  }
  
  private async getVelocityTrend(window: TimeWindow, periods: number): Promise<number[]> {
    const velocity = [];
    const windowMs = this.getTimeWindowMs(window);
    
    for (let i = 0; i < periods; i++) {
      const endTime = new Date(Date.now() - i * windowMs);
      const startTime = new Date(endTime.getTime() - windowMs);
      
      const completedInPeriod = this.taskCache.filter(t => 
        t.state === TaskState.COMPLETED &&
        t.completedAt &&
        t.completedAt >= startTime &&
        t.completedAt <= endTime
      ).length;
      
      velocity.unshift(completedInPeriod);
    }
    
    return velocity;
  }
  
  private analyzeTrend(values: number[]): { direction: 'improving' | 'stable' | 'declining'; rate: number; confidence: number } {
    if (values.length < 2) return { direction: 'stable', rate: 0, confidence: 0 };
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (Math.abs(change) < 5) {
      return { direction: 'stable', rate: change, confidence: 0.8 };
    } else if (change > 0) {
      return { direction: 'improving', rate: change, confidence: 0.8 };
    } else {
      return { direction: 'declining', rate: Math.abs(change), confidence: 0.8 };
    }
  }
  
  private getVelocityRecommendations(trend: any): any[] {
    if (trend.direction === 'declining') {
      return [
        {
          priority: 1,
          action: 'Identify and remove blockers',
          expectedImprovement: 'Restore velocity to previous levels',
          effort: 'Medium'
        },
        {
          priority: 2,
          action: 'Review team capacity and workload',
          expectedImprovement: 'Prevent future velocity drops',
          effort: 'Low'
        }
      ];
    } else if (trend.direction === 'improving') {
      return [
        {
          priority: 1,
          action: 'Document and replicate successful practices',
          expectedImprovement: 'Sustain velocity improvements',
          effort: 'Low'
        }
      ];
    }
    return [];
  }
  
  private calculateCurrentSuccessRate(): number {
    const recentTasks = this.taskCache.filter(t => 
      t.updatedAt && 
      (Date.now() - t.updatedAt.getTime()) < (30 * 24 * 60 * 60 * 1000) // Last 30 days
    );
    
    const completedTasks = recentTasks.filter(t => t.state === TaskState.COMPLETED);
    const failedTasks = recentTasks.filter(t => t.state === TaskState.CANCELLED);
    const totalFinishedTasks = completedTasks.length + failedTasks.length;
    
    return totalFinishedTasks > 0 ? (completedTasks.length / totalFinishedTasks) * 100 : 100;
  }
  
  private async analyzeResourceState(): Promise<any> {
    // Mock implementation
    return {
      bottlenecks: [],
      underutilization: [],
      imbalances: []
    };
  }
  
  private async generateBottleneckOptimizations(resourceState: any): Promise<ResourceOptimization[]> {
    return [];
  }
  
  private async generateUtilizationOptimizations(resourceState: any): Promise<ResourceOptimization[]> {
    return [];
  }
  
  private async generateBalancingOptimizations(resourceState: any): Promise<ResourceOptimization[]> {
    return [];
  }
  
  private async generateCapacityOptimizations(resourceState: any): Promise<ResourceOptimization[]> {
    return [];
  }
  
  /**
   * Perform real-time analysis for immediate insights
   */
  private async performRealTimeAnalysis(): Promise<void> {
    try {
      // Quick metrics calculation
      await this.calculateMetrics(TimeWindow.HOUR);
      
      // Critical bottleneck detection
      const criticalBottlenecks = (await this.detectBottlenecks())
        .filter(b => b.severity === 'critical');
      
      if (criticalBottlenecks.length > 0) {
        this.emit('critical_bottlenecks', { bottlenecks: criticalBottlenecks });
      }
      
      // Immediate anomaly detection
      const anomalies = await this.detectAnomalies();
      const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
      
      if (criticalAnomalies.length > 0) {
        this.emit('critical_anomalies', { anomalies: criticalAnomalies });
      }
      
    } catch (error) {
      logger.error('Real-time analysis failed', { error: error.message });
    }
  }
  
  /**
   * Setup periodic analysis
   */
  private setupPeriodicAnalysis(): void {
    // Hourly metrics
    setInterval(async () => {
      await this.calculateMetrics(TimeWindow.HOUR);
    }, 60 * 60 * 1000);
    
    // Daily insights
    setInterval(async () => {
      await this.generateInsights();
    }, 24 * 60 * 60 * 1000);
    
    // Weekly optimizations
    setInterval(async () => {
      await this.optimizeResources();
    }, 7 * 24 * 60 * 60 * 1000);
  }
  
  /**
   * Setup anomaly detection
   */
  private setupAnomalyDetection(): void {
    setInterval(async () => {
      await this.detectAnomalies();
    }, 15 * 60 * 1000); // Every 15 minutes
  }
  
  /**
   * Setup predictive modeling
   */
  private setupPredictiveModeling(): void {
    setInterval(async () => {
      // Update predictive models
      logger.debug('Updating predictive models');
    }, 4 * 60 * 60 * 1000); // Every 4 hours
  }
  
  /**
   * Get current metrics
   */
  getMetrics(timeWindow?: TimeWindow): AnalyticsMetric[] {
    if (timeWindow) {
      return Array.from(this.metricsCache.values())
        .filter(m => m.timeWindow === timeWindow);
    }
    return Array.from(this.metricsCache.values());
  }
  
  /**
   * Get current bottlenecks
   */
  getBottlenecks(): Bottleneck[] {
    return Array.from(this.bottlenecks.values());
  }
  
  /**
   * Get current insights
   */
  getInsights(): PerformanceInsight[] {
    return Array.from(this.insights.values());
  }
  
  /**
   * Get current anomalies
   */
  getAnomalies(): Anomaly[] {
    return Array.from(this.anomalies.values());
  }
  
  /**
   * Get optimization recommendations
   */
  getOptimizations(): ResourceOptimization[] {
    return Array.from(this.optimizations.values());
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.metrics.clear();
    this.bottlenecks.clear();
    this.insights.clear();
    this.anomalies.clear();
    this.predictiveModels.clear();
    this.optimizations.clear();
    this.dashboards.clear();
    this.metricsCache.clear();
    this.taskCache.length = 0;
    this.queueCache.length = 0;
    this.removeAllListeners();
    
    logger.info('AnalyticsEngine cleanup completed');
  }
}