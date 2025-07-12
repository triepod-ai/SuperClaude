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
 * Scheduling algorithm types
 */
export enum SchedulingAlgorithm {
  PRIORITY_FIRST = 'priority_first',
  DEADLINE_FIRST = 'deadline_first',
  CRITICAL_PATH = 'critical_path',
  RESOURCE_AWARE = 'resource_aware',
  MACHINE_LEARNING = 'machine_learning',
  HYBRID = 'hybrid'
}

/**
 * Resource types for scheduling
 */
export enum ResourceType {
  HUMAN = 'human',
  COMPUTATIONAL = 'computational',
  MEMORY = 'memory',
  NETWORK = 'network',
  STORAGE = 'storage',
  LICENSE = 'license',
  BUDGET = 'budget'
}

/**
 * Resource definition
 */
export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  capacity: number;
  available: number;
  unit: string;
  cost?: number;
  constraints?: {
    maxConcurrent?: number;
    requiredSkills?: string[];
    availability?: {
      start: Date;
      end: Date;
      timezone: string;
    };
  };
}

/**
 * Resource requirement for a task
 */
export interface ResourceRequirement {
  resourceId: string;
  amount: number;
  duration: number;
  priority: 'required' | 'preferred' | 'optional';
  alternatives?: string[];
}

/**
 * Scheduling constraint
 */
export interface SchedulingConstraint {
  id: string;
  type: 'deadline' | 'resource' | 'dependency' | 'availability' | 'budget';
  taskId?: string;
  description: string;
  weight: number;
  parameters: Record<string, any>;
}

/**
 * Schedule entry
 */
export interface ScheduleEntry {
  id: string;
  taskId: string;
  assignedResources: Array<{
    resourceId: string;
    amount: number;
    startTime: Date;
    endTime: Date;
  }>;
  startTime: Date;
  endTime: Date;
  estimatedDuration: number;
  priority: number;
  dependencies: string[];
  constraints: SchedulingConstraint[];
  confidence: number;
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  algorithm: SchedulingAlgorithm;
  horizon: number; // Days to schedule ahead
  timeSlotDuration: number; // Minutes per time slot
  maxIterations?: number;
  optimizationWeight: {
    deadline: number;
    priority: number;
    resource: number;
    dependency: number;
    cost: number;
  };
  constraints: SchedulingConstraint[];
  considerWeekends: boolean;
  workingHours: {
    start: string; // HH:MM
    end: string;   // HH:MM
    timezone: string;
  };
}

/**
 * Schedule optimization result
 */
export interface ScheduleOptimization {
  scheduleId: string;
  algorithm: SchedulingAlgorithm;
  totalScore: number;
  metrics: {
    totalTasks: number;
    scheduledTasks: number;
    unscheduledTasks: number;
    resourceUtilization: number;
    deadlineViolations: number;
    averageWaitTime: number;
    criticalPathLength: number;
    totalCost: number;
  };
  recommendations: Array<{
    type: 'resource' | 'deadline' | 'priority' | 'dependency';
    description: string;
    impact: string;
    confidence: number;
  }>;
  alternatives: Array<{
    description: string;
    tradeoffs: string;
    scoreImprovement: number;
  }>;
}

/**
 * Critical path analysis result
 */
export interface CriticalPathAnalysis {
  paths: Array<{
    taskIds: string[];
    totalDuration: number;
    bottlenecks: Array<{
      taskId: string;
      reason: string;
      impact: number;
    }>;
  }>;
  longestPath: {
    taskIds: string[];
    totalDuration: number;
    startDate: Date;
    endDate: Date;
  };
  recommendations: Array<{
    type: 'parallel' | 'resource' | 'scope';
    description: string;
    timeSavings: number;
  }>;
}

/**
 * Advanced scheduling engine with multiple algorithms
 */
export class SchedulingEngine extends EventEmitter {
  private resources: Map<string, Resource> = new Map();
  private schedules: Map<string, ScheduleEntry[]> = new Map();
  private constraints: Map<string, SchedulingConstraint> = new Map();
  private currentScheduleId: string | null = null;
  private optimizationHistory: Array<{
    timestamp: Date;
    algorithm: SchedulingAlgorithm;
    score: number;
    metrics: any;
  }> = [];
  
  constructor() {
    super();
    this.setupPeriodicOptimization();
    logger.info('SchedulingEngine initialized');
  }
  
  /**
   * Register a resource for scheduling
   */
  registerResource(resource: Resource): void {
    this.resources.set(resource.id, resource);
    this.emit('resource_registered', { resourceId: resource.id, resource });
    logger.info('Resource registered', { resourceId: resource.id, type: resource.type });
  }
  
  /**
   * Update resource availability
   */
  updateResourceAvailability(resourceId: string, available: number): void {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.available = available;
      this.emit('resource_updated', { resourceId, available });
      
      // Trigger rescheduling if significant change
      if (available === 0 || resource.available / resource.capacity < 0.2) {
        this.emit('reschedule_needed', { reason: 'resource_shortage', resourceId });
      }
    }
  }
  
  /**
   * Add scheduling constraint
   */
  addConstraint(constraint: SchedulingConstraint): void {
    this.constraints.set(constraint.id, constraint);
    this.emit('constraint_added', { constraintId: constraint.id, constraint });
    logger.debug('Scheduling constraint added', { constraintId: constraint.id, type: constraint.type });
  }
  
  /**
   * Remove scheduling constraint
   */
  removeConstraint(constraintId: string): boolean {
    const removed = this.constraints.delete(constraintId);
    if (removed) {
      this.emit('constraint_removed', { constraintId });
      logger.debug('Scheduling constraint removed', { constraintId });
    }
    return removed;
  }
  
  /**
   * Generate optimal schedule for tasks
   */
  async generateSchedule(
    tasks: Task[],
    config: ScheduleConfig
  ): Promise<{ scheduleId: string; entries: ScheduleEntry[]; optimization: ScheduleOptimization }> {
    const scheduleId = uuidv4();
    
    logger.info('Generating schedule', { 
      scheduleId, 
      algorithm: config.algorithm, 
      taskCount: tasks.length 
    });
    
    try {
      let entries: ScheduleEntry[];
      
      switch (config.algorithm) {
        case SchedulingAlgorithm.PRIORITY_FIRST:
          entries = await this.priorityFirstScheduling(tasks, config);
          break;
        case SchedulingAlgorithm.DEADLINE_FIRST:
          entries = await this.deadlineFirstScheduling(tasks, config);
          break;
        case SchedulingAlgorithm.CRITICAL_PATH:
          entries = await this.criticalPathScheduling(tasks, config);
          break;
        case SchedulingAlgorithm.RESOURCE_AWARE:
          entries = await this.resourceAwareScheduling(tasks, config);
          break;
        case SchedulingAlgorithm.MACHINE_LEARNING:
          entries = await this.machineLearningScheduling(tasks, config);
          break;
        case SchedulingAlgorithm.HYBRID:
          entries = await this.hybridScheduling(tasks, config);
          break;
        default:
          throw new Error(`Unsupported scheduling algorithm: ${config.algorithm}`);
      }
      
      // Store the schedule
      this.schedules.set(scheduleId, entries);
      this.currentScheduleId = scheduleId;
      
      // Calculate optimization metrics
      const optimization = this.calculateOptimizationMetrics(entries, config);
      optimization.scheduleId = scheduleId;
      
      // Store optimization history
      this.optimizationHistory.push({
        timestamp: new Date(),
        algorithm: config.algorithm,
        score: optimization.totalScore,
        metrics: optimization.metrics
      });
      
      this.emit('schedule_generated', { scheduleId, algorithm: config.algorithm, optimization });
      
      logger.info('Schedule generated successfully', { 
        scheduleId, 
        scheduledTasks: optimization.metrics.scheduledTasks,
        score: optimization.totalScore 
      });
      
      return { scheduleId, entries, optimization };
      
    } catch (error) {
      logger.error('Schedule generation failed', { scheduleId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Priority-first scheduling algorithm
   */
  private async priorityFirstScheduling(tasks: Task[], config: ScheduleConfig): Promise<ScheduleEntry[]> {
    const entries: ScheduleEntry[] = [];
    const availableResources = new Map(this.resources);
    
    // Sort tasks by priority, then by creation date
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    
    let currentTime = new Date();
    
    for (const task of sortedTasks) {
      const entry = await this.createScheduleEntry(
        task,
        currentTime,
        availableResources,
        config
      );
      
      if (entry) {
        entries.push(entry);
        this.updateResourceAvailabilityForEntry(availableResources, entry);
        currentTime = entry.endTime;
      }
    }
    
    return entries;
  }
  
  /**
   * Deadline-first scheduling algorithm (Earliest Deadline First)
   */
  private async deadlineFirstScheduling(tasks: Task[], config: ScheduleConfig): Promise<ScheduleEntry[]> {
    const entries: ScheduleEntry[] = [];
    const availableResources = new Map(this.resources);
    
    // Sort tasks by deadline, then by priority
    const sortedTasks = [...tasks].sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        const deadlineDiff = a.dueDate.getTime() - b.dueDate.getTime();
        if (deadlineDiff !== 0) return deadlineDiff;
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }
      
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
    
    let currentTime = new Date();
    
    for (const task of sortedTasks) {
      const entry = await this.createScheduleEntry(
        task,
        currentTime,
        availableResources,
        config
      );
      
      if (entry) {
        // Check if we can meet the deadline
        if (task.dueDate && entry.endTime > task.dueDate) {
          entry.constraints.push({
            id: uuidv4(),
            type: 'deadline',
            taskId: task.id,
            description: `Task will miss deadline by ${Math.round((entry.endTime.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60))} hours`,
            weight: 1.0,
            parameters: { 
              deadline: task.dueDate,
              scheduledEnd: entry.endTime,
              violation: true
            }
          });
        }
        
        entries.push(entry);
        this.updateResourceAvailabilityForEntry(availableResources, entry);
        currentTime = entry.endTime;
      }
    }
    
    return entries;
  }
  
  /**
   * Critical path scheduling algorithm
   */
  private async criticalPathScheduling(tasks: Task[], config: ScheduleConfig): Promise<ScheduleEntry[]> {
    // First, analyze critical paths
    const criticalPathAnalysis = this.analyzeCriticalPaths(tasks);
    
    const entries: ScheduleEntry[] = [];
    const availableResources = new Map(this.resources);
    const scheduled = new Set<string>();
    
    // Schedule critical path tasks first
    for (const pathTaskId of criticalPathAnalysis.longestPath.taskIds) {
      const task = tasks.find(t => t.id === pathTaskId);
      if (task && !scheduled.has(task.id)) {
        const entry = await this.createScheduleEntry(
          task,
          this.findEarliestStartTime(task, entries, availableResources),
          availableResources,
          config
        );
        
        if (entry) {
          entry.priority += 1.0; // Boost priority for critical path tasks
          entries.push(entry);
          scheduled.add(task.id);
          this.updateResourceAvailabilityForEntry(availableResources, entry);
        }
      }
    }
    
    // Schedule remaining tasks by priority
    const remainingTasks = tasks.filter(t => !scheduled.has(t.id));
    const priorityEntries = await this.priorityFirstScheduling(remainingTasks, config);
    entries.push(...priorityEntries);
    
    return entries;
  }
  
  /**
   * Resource-aware scheduling algorithm
   */
  private async resourceAwareScheduling(tasks: Task[], config: ScheduleConfig): Promise<ScheduleEntry[]> {
    const entries: ScheduleEntry[] = [];
    const resourceUtilization = new Map<string, number>();
    
    // Initialize resource utilization tracking
    for (const [resourceId, resource] of this.resources) {
      resourceUtilization.set(resourceId, 0);
    }
    
    // Sort tasks by resource requirements and priority
    const sortedTasks = [...tasks].sort((a, b) => {
      const aResourceComplexity = this.calculateResourceComplexity(a);
      const bResourceComplexity = this.calculateResourceComplexity(b);
      
      if (aResourceComplexity !== bResourceComplexity) {
        return aResourceComplexity - bResourceComplexity; // Simpler tasks first
      }
      
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
    
    for (const task of sortedTasks) {
      const bestSlot = this.findOptimalResourceSlot(task, entries, config);
      
      if (bestSlot) {
        const entry = await this.createScheduleEntry(
          task,
          bestSlot.startTime,
          new Map(this.resources), // Use fresh resource state
          config
        );
        
        if (entry) {
          entries.push(entry);
          
          // Update resource utilization
          for (const assignedResource of entry.assignedResources) {
            const currentUtil = resourceUtilization.get(assignedResource.resourceId) || 0;
            resourceUtilization.set(assignedResource.resourceId, currentUtil + assignedResource.amount);
          }
        }
      }
    }
    
    return entries;
  }
  
  /**
   * Machine learning-based scheduling (simplified implementation)
   */
  private async machineLearningScheduling(tasks: Task[], config: ScheduleConfig): Promise<ScheduleEntry[]> {
    // This would integrate with a trained ML model
    // For now, use a hybrid approach with learned weights
    
    const learnedWeights = this.getLearnedOptimizationWeights();
    const mlConfig = {
      ...config,
      optimizationWeight: learnedWeights
    };
    
    return await this.hybridScheduling(tasks, mlConfig);
  }
  
  /**
   * Hybrid scheduling combining multiple algorithms
   */
  private async hybridScheduling(tasks: Task[], config: ScheduleConfig): Promise<ScheduleEntry[]> {
    // Generate schedules with different algorithms
    const algorithms = [
      SchedulingAlgorithm.PRIORITY_FIRST,
      SchedulingAlgorithm.DEADLINE_FIRST,
      SchedulingAlgorithm.CRITICAL_PATH,
      SchedulingAlgorithm.RESOURCE_AWARE
    ];
    
    const candidateSchedules: Array<{ algorithm: SchedulingAlgorithm; entries: ScheduleEntry[]; score: number }> = [];
    
    for (const algorithm of algorithms) {
      try {
        const algorithmConfig = { ...config, algorithm };
        let entries: ScheduleEntry[];
        
        switch (algorithm) {
          case SchedulingAlgorithm.PRIORITY_FIRST:
            entries = await this.priorityFirstScheduling(tasks, algorithmConfig);
            break;
          case SchedulingAlgorithm.DEADLINE_FIRST:
            entries = await this.deadlineFirstScheduling(tasks, algorithmConfig);
            break;
          case SchedulingAlgorithm.CRITICAL_PATH:
            entries = await this.criticalPathScheduling(tasks, algorithmConfig);
            break;
          case SchedulingAlgorithm.RESOURCE_AWARE:
            entries = await this.resourceAwareScheduling(tasks, algorithmConfig);
            break;
          default:
            continue;
        }
        
        const optimization = this.calculateOptimizationMetrics(entries, algorithmConfig);
        candidateSchedules.push({
          algorithm,
          entries,
          score: optimization.totalScore
        });
        
      } catch (error) {
        logger.warn('Hybrid scheduling algorithm failed', { algorithm, error: error.message });
      }
    }
    
    // Select the best schedule
    const bestSchedule = candidateSchedules.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    logger.info('Hybrid scheduling selected best algorithm', { 
      algorithm: bestSchedule.algorithm, 
      score: bestSchedule.score 
    });
    
    return bestSchedule.entries;
  }
  
  /**
   * Analyze critical paths in task dependencies
   */
  analyzeCriticalPaths(tasks: Task[]): CriticalPathAnalysis {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const paths: Array<{ taskIds: string[]; totalDuration: number; bottlenecks: any[] }> = [];
    
    // Find all paths through the dependency graph
    for (const task of tasks) {
      if (!visited.has(task.id) && task.dependencies.length === 0) {
        const path = this.findPathFromTask(task.id, taskMap, visited);
        if (path.taskIds.length > 0) {
          paths.push(path);
        }
      }
    }
    
    // Find the longest path (critical path)
    const longestPath = paths.reduce((longest, current) => 
      current.totalDuration > longest.totalDuration ? current : longest,
      { taskIds: [], totalDuration: 0, startDate: new Date(), endDate: new Date() }
    );
    
    // Calculate actual dates for the longest path
    let currentDate = new Date();
    for (const taskId of longestPath.taskIds) {
      const task = taskMap.get(taskId);
      if (task && task.estimatedHours) {
        currentDate = new Date(currentDate.getTime() + task.estimatedHours * 60 * 60 * 1000);
      }
    }
    
    longestPath.startDate = new Date();
    longestPath.endDate = currentDate;
    
    // Generate recommendations
    const recommendations = this.generateCriticalPathRecommendations(longestPath, taskMap);
    
    return {
      paths,
      longestPath,
      recommendations
    };
  }
  
  /**
   * Find path from a starting task through dependencies
   */
  private findPathFromTask(
    taskId: string, 
    taskMap: Map<string, Task>, 
    visited: Set<string>
  ): { taskIds: string[]; totalDuration: number; bottlenecks: any[] } {
    if (visited.has(taskId)) {
      return { taskIds: [], totalDuration: 0, bottlenecks: [] };
    }
    
    visited.add(taskId);
    const task = taskMap.get(taskId);
    if (!task) {
      return { taskIds: [], totalDuration: 0, bottlenecks: [] };
    }
    
    const taskDuration = task.estimatedHours || 1;
    let longestSubpath = { taskIds: [], totalDuration: 0, bottlenecks: [] };
    
    // Find dependents (tasks that depend on this task)
    for (const [otherId, otherTask] of taskMap) {
      if (otherTask.dependencies.includes(taskId)) {
        const subpath = this.findPathFromTask(otherId, taskMap, new Set(visited));
        if (subpath.totalDuration > longestSubpath.totalDuration) {
          longestSubpath = subpath;
        }
      }
    }
    
    return {
      taskIds: [taskId, ...longestSubpath.taskIds],
      totalDuration: taskDuration + longestSubpath.totalDuration,
      bottlenecks: longestSubpath.bottlenecks
    };
  }
  
  /**
   * Generate recommendations for critical path optimization
   */
  private generateCriticalPathRecommendations(
    longestPath: any, 
    taskMap: Map<string, Task>
  ): Array<{ type: string; description: string; timeSavings: number }> {
    const recommendations = [];
    
    // Look for parallelization opportunities
    for (let i = 0; i < longestPath.taskIds.length - 1; i++) {
      const currentTaskId = longestPath.taskIds[i];
      const nextTaskId = longestPath.taskIds[i + 1];
      const currentTask = taskMap.get(currentTaskId);
      const nextTask = taskMap.get(nextTaskId);
      
      if (currentTask && nextTask) {
        // Check if tasks can be parallelized
        if (!nextTask.dependencies.includes(currentTaskId)) {
          recommendations.push({
            type: 'parallel',
            description: `Tasks "${currentTask.title}" and "${nextTask.title}" can be run in parallel`,
            timeSavings: Math.min(currentTask.estimatedHours || 1, nextTask.estimatedHours || 1)
          });
        }
      }
    }
    
    // Look for resource optimization opportunities
    const resourceBottlenecks = this.findResourceBottlenecks(longestPath.taskIds, taskMap);
    for (const bottleneck of resourceBottlenecks) {
      recommendations.push({
        type: 'resource',
        description: `Adding resources to "${bottleneck.taskTitle}" could reduce critical path`,
        timeSavings: bottleneck.potentialSavings
      });
    }
    
    return recommendations;
  }
  
  /**
   * Find resource bottlenecks in critical path
   */
  private findResourceBottlenecks(taskIds: string[], taskMap: Map<string, Task>): any[] {
    const bottlenecks = [];
    
    for (const taskId of taskIds) {
      const task = taskMap.get(taskId);
      if (task && task.estimatedHours && task.estimatedHours > 8) { // Tasks longer than 8 hours
        bottlenecks.push({
          taskId,
          taskTitle: task.title,
          potentialSavings: (task.estimatedHours - 4), // Assume we can halve the time with more resources
        });
      }
    }
    
    return bottlenecks;
  }
  
  /**
   * Create a schedule entry for a task
   */
  private async createScheduleEntry(
    task: Task,
    startTime: Date,
    availableResources: Map<string, Resource>,
    config: ScheduleConfig
  ): Promise<ScheduleEntry | null> {
    const estimatedDuration = task.estimatedHours || this.estimateTaskDuration(task);
    const endTime = new Date(startTime.getTime() + estimatedDuration * 60 * 60 * 1000);
    
    // Find required resources
    const requiredResources = this.findRequiredResources(task);
    const assignedResources = [];
    
    for (const requirement of requiredResources) {
      const resource = availableResources.get(requirement.resourceId);
      if (resource && resource.available >= requirement.amount) {
        assignedResources.push({
          resourceId: requirement.resourceId,
          amount: requirement.amount,
          startTime,
          endTime
        });
      } else if (requirement.priority === 'required') {
        // Cannot schedule without required resources
        return null;
      }
    }
    
    const entry: ScheduleEntry = {
      id: uuidv4(),
      taskId: task.id,
      assignedResources,
      startTime,
      endTime,
      estimatedDuration,
      priority: this.calculateSchedulingPriority(task, config),
      dependencies: task.dependencies,
      constraints: this.getApplicableConstraints(task),
      confidence: this.calculateSchedulingConfidence(task, assignedResources)
    };
    
    return entry;
  }
  
  /**
   * Calculate optimization metrics for a schedule
   */
  private calculateOptimizationMetrics(entries: ScheduleEntry[], config: ScheduleConfig): ScheduleOptimization {
    const totalTasks = entries.length;
    const scheduledTasks = entries.length;
    const unscheduledTasks = 0; // Would be calculated from failed scheduling attempts
    
    // Calculate resource utilization
    const resourceUtilization = this.calculateResourceUtilization(entries);
    
    // Count deadline violations
    const deadlineViolations = entries.filter(entry => 
      entry.constraints.some(c => c.type === 'deadline' && c.parameters.violation)
    ).length;
    
    // Calculate average wait time
    const averageWaitTime = this.calculateAverageWaitTime(entries);
    
    // Calculate critical path length
    const criticalPathLength = this.calculateCriticalPathLength(entries);
    
    // Calculate total cost
    const totalCost = this.calculateTotalCost(entries);
    
    // Calculate total score
    const totalScore = this.calculateTotalScore(entries, config);
    
    return {
      scheduleId: '',
      algorithm: config.algorithm,
      totalScore,
      metrics: {
        totalTasks,
        scheduledTasks,
        unscheduledTasks,
        resourceUtilization,
        deadlineViolations,
        averageWaitTime,
        criticalPathLength,
        totalCost
      },
      recommendations: this.generateScheduleRecommendations(entries, config),
      alternatives: this.generateScheduleAlternatives(entries, config)
    };
  }
  
  /**
   * Helper methods for calculations
   */
  private estimateTaskDuration(task: Task): number {
    const complexityHours = {
      simple: 2,
      moderate: 8,
      complex: 24,
      very_complex: 72
    };
    return complexityHours[task.complexity || 'moderate'];
  }
  
  private findRequiredResources(task: Task): ResourceRequirement[] {
    // This would be enhanced to analyze task metadata and determine resource needs
    return [
      {
        resourceId: 'human-developer',
        amount: 1,
        duration: task.estimatedHours || 8,
        priority: 'required',
        alternatives: ['human-senior-developer']
      }
    ];
  }
  
  private calculateSchedulingPriority(task: Task, config: ScheduleConfig): number {
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    let priority = priorityWeight[task.priority];
    
    // Adjust for deadline urgency
    if (task.dueDate) {
      const daysUntilDue = (task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilDue < 1) priority += 2;
      else if (daysUntilDue < 3) priority += 1;
    }
    
    return priority;
  }
  
  private getApplicableConstraints(task: Task): SchedulingConstraint[] {
    const constraints = [];
    
    for (const constraint of this.constraints.values()) {
      if (!constraint.taskId || constraint.taskId === task.id) {
        constraints.push(constraint);
      }
    }
    
    return constraints;
  }
  
  private calculateSchedulingConfidence(task: Task, assignedResources: any[]): number {
    let confidence = 0.7; // Base confidence
    
    if (task.estimatedHours) confidence += 0.1;
    if (assignedResources.length > 0) confidence += 0.1;
    if (task.dependencies.length === 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
  
  private updateResourceAvailabilityForEntry(
    availableResources: Map<string, Resource>, 
    entry: ScheduleEntry
  ): void {
    for (const assignedResource of entry.assignedResources) {
      const resource = availableResources.get(assignedResource.resourceId);
      if (resource) {
        resource.available -= assignedResource.amount;
      }
    }
  }
  
  private findEarliestStartTime(
    task: Task, 
    existingEntries: ScheduleEntry[], 
    availableResources: Map<string, Resource>
  ): Date {
    let earliestTime = new Date();
    
    // Check dependency completion times
    for (const depId of task.dependencies) {
      const depEntry = existingEntries.find(e => e.taskId === depId);
      if (depEntry && depEntry.endTime > earliestTime) {
        earliestTime = depEntry.endTime;
      }
    }
    
    return earliestTime;
  }
  
  private calculateResourceComplexity(task: Task): number {
    // Simple heuristic for resource complexity
    const complexityWeight = { simple: 1, moderate: 2, complex: 3, very_complex: 4 };
    return complexityWeight[task.complexity || 'moderate'];
  }
  
  private findOptimalResourceSlot(
    task: Task, 
    existingEntries: ScheduleEntry[], 
    config: ScheduleConfig
  ): { startTime: Date; score: number } | null {
    // This would implement a more sophisticated slot-finding algorithm
    return {
      startTime: new Date(),
      score: 1.0
    };
  }
  
  private getLearnedOptimizationWeights(): any {
    // This would return weights learned from historical scheduling performance
    return {
      deadline: 0.3,
      priority: 0.25,
      resource: 0.25,
      dependency: 0.15,
      cost: 0.05
    };
  }
  
  private calculateResourceUtilization(entries: ScheduleEntry[]): number {
    if (this.resources.size === 0) return 0;
    
    let totalUtilization = 0;
    for (const [resourceId, resource] of this.resources) {
      const usedCapacity = entries.reduce((sum, entry) => {
        const assignment = entry.assignedResources.find(ar => ar.resourceId === resourceId);
        return sum + (assignment ? assignment.amount : 0);
      }, 0);
      
      totalUtilization += usedCapacity / resource.capacity;
    }
    
    return totalUtilization / this.resources.size;
  }
  
  private calculateAverageWaitTime(entries: ScheduleEntry[]): number {
    if (entries.length === 0) return 0;
    
    const totalWaitTime = entries.reduce((sum, entry) => {
      const taskCreationTime = new Date(); // Would get from task
      const waitTime = entry.startTime.getTime() - taskCreationTime.getTime();
      return sum + Math.max(0, waitTime);
    }, 0);
    
    return totalWaitTime / entries.length / (1000 * 60 * 60); // Convert to hours
  }
  
  private calculateCriticalPathLength(entries: ScheduleEntry[]): number {
    if (entries.length === 0) return 0;
    
    const earliestStart = Math.min(...entries.map(e => e.startTime.getTime()));
    const latestEnd = Math.max(...entries.map(e => e.endTime.getTime()));
    
    return (latestEnd - earliestStart) / (1000 * 60 * 60); // Convert to hours
  }
  
  private calculateTotalCost(entries: ScheduleEntry[]): number {
    return entries.reduce((sum, entry) => {
      const entryCost = entry.assignedResources.reduce((entrySum, assignment) => {
        const resource = this.resources.get(assignment.resourceId);
        const duration = (assignment.endTime.getTime() - assignment.startTime.getTime()) / (1000 * 60 * 60);
        return entrySum + (resource?.cost || 0) * assignment.amount * duration;
      }, 0);
      return sum + entryCost;
    }, 0);
  }
  
  private calculateTotalScore(entries: ScheduleEntry[], config: ScheduleConfig): number {
    // Weighted scoring based on multiple factors
    const metrics = this.calculateOptimizationMetrics(entries, config).metrics;
    
    const weights = config.optimizationWeight;
    let score = 0;
    
    // Higher resource utilization is better (up to a point)
    score += weights.resource * Math.min(metrics.resourceUtilization, 0.9) * 100;
    
    // Fewer deadline violations is better
    score += weights.deadline * Math.max(0, 100 - metrics.deadlineViolations * 10);
    
    // Lower average wait time is better
    score += weights.dependency * Math.max(0, 100 - metrics.averageWaitTime);
    
    return score;
  }
  
  private generateScheduleRecommendations(entries: ScheduleEntry[], config: ScheduleConfig): any[] {
    const recommendations = [];
    
    // Check for resource bottlenecks
    const resourceUtil = this.calculateResourceUtilization(entries);
    if (resourceUtil > 0.9) {
      recommendations.push({
        type: 'resource',
        description: 'Consider adding more resources to prevent bottlenecks',
        impact: 'Could improve schedule efficiency by 10-20%',
        confidence: 0.8
      });
    }
    
    return recommendations;
  }
  
  private generateScheduleAlternatives(entries: ScheduleEntry[], config: ScheduleConfig): any[] {
    return [
      {
        description: 'Parallel execution of independent tasks',
        tradeoffs: 'Requires more resources but reduces total time',
        scoreImprovement: 15
      }
    ];
  }
  
  /**
   * Setup periodic optimization
   */
  private setupPeriodicOptimization(): void {
    setInterval(() => {
      if (this.currentScheduleId) {
        this.emit('optimization_cycle', { scheduleId: this.currentScheduleId });
      }
    }, 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Get current schedule
   */
  getCurrentSchedule(): ScheduleEntry[] | null {
    if (this.currentScheduleId) {
      return this.schedules.get(this.currentScheduleId) || null;
    }
    return null;
  }
  
  /**
   * Get optimization history
   */
  getOptimizationHistory(): any[] {
    return [...this.optimizationHistory];
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.resources.clear();
    this.schedules.clear();
    this.constraints.clear();
    this.optimizationHistory.length = 0;
    this.removeAllListeners();
    
    logger.info('SchedulingEngine cleanup completed');
  }
}