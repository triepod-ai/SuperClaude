import { TaskDecomposer } from '../TaskDecomposer.js';
import {
  Task,
  TaskState,
  TaskPriority,
  TaskComplexity,
  DecompositionOptions
} from '../../types/index.js';

describe('TaskDecomposer', () => {
  let decomposer: TaskDecomposer;

  beforeEach(() => {
    decomposer = new TaskDecomposer();
  });

  describe('Complexity Assessment', () => {
    it('should assess simple task as low complexity', () => {
      const simpleTask: Task = {
        id: 'test-1',
        title: 'Simple Task',
        description: 'Do something basic',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const complexity = decomposer.assessTaskComplexity(simpleTask);
      expect(complexity).toBeLessThan(0.3);
    });

    it('should assess complex task as high complexity', () => {
      const complexTask: Task = {
        id: 'test-2',
        title: 'Complex Implementation Task',
        description: `Implement a comprehensive user authentication system with JWT tokens, 
                     OAuth integration, rate limiting, security monitoring, database encryption,
                     multi-factor authentication, session management, password reset functionality,
                     user role management, audit logging, and API security measures. The system
                     must integrate with existing infrastructure, support scalability requirements,
                     implement proper error handling, and ensure compliance with security standards.`,
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        dependencies: ['dep1', 'dep2', 'dep3'],
        tags: ['security', 'backend', 'authentication'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const complexity = decomposer.assessTaskComplexity(complexTask);
      expect(complexity).toBeGreaterThan(0.7);
    });

    it('should estimate complexity category correctly', () => {
      const simpleTask: Task = {
        id: 'simple',
        title: 'Simple Task',
        description: 'Basic task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const complexTask: Task = {
        id: 'complex',
        title: 'Complex System Implementation',
        description: 'Implement complex distributed authentication system with microservices architecture',
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        dependencies: ['dep1', 'dep2'],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(decomposer.estimateComplexity(simpleTask)).toBe(TaskComplexity.SIMPLE);
      expect(decomposer.estimateComplexity(complexTask)).toBe(TaskComplexity.COMPLEX);
    });
  });

  describe('Task Decomposition', () => {
    it('should not decompose already simple tasks', async () => {
      const simpleTask: Task = {
        id: 'simple-task',
        title: 'Simple Task',
        description: 'A basic task that is already simple',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await decomposer.decomposeTask(simpleTask);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(simpleTask);
    });

    it('should decompose complex task into subtasks', async () => {
      const complexTask: Task = {
        id: 'complex-task',
        title: 'Build E-commerce Platform',
        description: `Create a comprehensive e-commerce platform that includes user registration,
                     product catalog management, shopping cart functionality, payment processing,
                     order management, inventory tracking, customer support system, and admin dashboard.
                     The system should implement security measures, performance optimization, and
                     mobile responsiveness.`,
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        dependencies: [],
        tags: ['ecommerce', 'fullstack'],
        estimatedHours: 200,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await decomposer.decomposeTask(complexTask, {
        estimateHours: true,
        generateDependencies: true
      });

      expect(result.length).toBeGreaterThan(1);
      
      // Check that subtasks are created correctly
      const subtasks = result.filter(task => task.id !== complexTask.id);
      expect(subtasks.length).toBeGreaterThan(0);
      
      // All subtasks should have the original task as parent
      subtasks.forEach(subtask => {
        expect(subtask.parentId).toBe(complexTask.id);
        expect(subtask.tags).toContain('subtask');
        expect(subtask.priority).toBe(complexTask.priority);
      });
    });

    it('should generate dependencies between subtasks when requested', async () => {
      const complexTask: Task = {
        id: 'task-with-deps',
        title: 'Sequential Development Task',
        description: 'Develop a system that requires planning, implementation, testing, and deployment phases',
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await decomposer.decomposeTask(complexTask, {
        generateDependencies: true
      });

      if (result.length > 2) {
        // Check that later subtasks depend on earlier ones
        const subtasks = result.filter(task => task.id !== complexTask.id);
        if (subtasks.length > 1) {
          expect(subtasks[1].dependencies).toContain(subtasks[0].id);
        }
      }
    });

    it('should distribute estimated hours among subtasks', async () => {
      const taskWithHours: Task = {
        id: 'task-with-hours',
        title: 'Task with Time Estimate',
        description: 'A complex task that should be broken down with hour estimates',
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        dependencies: [],
        tags: [],
        estimatedHours: 40,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await decomposer.decomposeTask(taskWithHours, {
        estimateHours: true
      });

      const subtasks = result.filter(task => task.id !== taskWithHours.id);
      if (subtasks.length > 0) {
        // Check that subtasks have hour estimates
        const totalEstimatedHours = subtasks.reduce(
          (sum, task) => sum + (task.estimatedHours || 0), 
          0
        );
        
        expect(totalEstimatedHours).toBeCloseTo(40, 1);
        
        // Each subtask should have some estimated hours
        subtasks.forEach(subtask => {
          expect(subtask.estimatedHours).toBeGreaterThan(0);
        });
      }
    });

    it('should respect maximum depth limit', async () => {
      const veryComplexTask: Task = {
        id: 'very-complex',
        title: 'Extremely Complex System',
        description: `Build an enterprise-grade distributed system with microservices architecture,
                     container orchestration, service mesh, observability stack, security framework,
                     data pipeline, machine learning integration, real-time analytics, event sourcing,
                     CQRS implementation, and comprehensive monitoring and alerting systems.`,
        state: TaskState.PENDING,
        priority: TaskPriority.CRITICAL,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await decomposer.decomposeTask(veryComplexTask, {
        maxDepth: 1,
        targetComplexity: TaskComplexity.SIMPLE
      });

      // With maxDepth: 1, should only do one level of decomposition
      const subtasks = result.filter(task => task.id !== veryComplexTask.id);
      
      // Check that no subtask has its own subtasks
      subtasks.forEach(subtask => {
        expect(subtask.parentId).toBe(veryComplexTask.id);
      });
    });
  });

  describe('Breakdown Strategies', () => {
    it('should suggest breakdown strategies for complex task', () => {
      const complexTask: Task = {
        id: 'strategy-test',
        title: 'Multi-Domain Development Task',
        description: 'Create, implement, test, and deploy a frontend interface with backend API integration',
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        dependencies: ['existing-dep1', 'existing-dep2', 'existing-dep3'],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const strategies = decomposer.suggestBreakdownStrategies(complexTask);
      
      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
      
      // Should suggest action-based breakdown for multiple action verbs
      expect(strategies.some(s => s.includes('action phases'))).toBe(true);
      
      // Should suggest dependency-based breakdown for multiple dependencies
      expect(strategies.some(s => s.includes('dependency chains'))).toBe(true);
    });

    it('should provide default strategies for simple tasks', () => {
      const simpleTask: Task = {
        id: 'simple-strategy-test',
        title: 'Basic Task',
        description: 'Simple task description',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const strategies = decomposer.suggestBreakdownStrategies(simpleTask);
      
      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
      
      // Should provide default strategies
      expect(strategies.some(s => 
        s.includes('planning') || 
        s.includes('implementation') || 
        s.includes('validation')
      )).toBe(true);
    });
  });

  describe('Decomposition Options', () => {
    let testTask: Task;

    beforeEach(() => {
      testTask = {
        id: 'options-test',
        title: 'Options Test Task',
        description: 'Test task for decomposition options',
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        dependencies: [],
        tags: ['test'],
        estimatedHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { customField: 'value' }
      };
    });

    it('should preserve metadata when requested', async () => {
      const result = await decomposer.decomposeTask(testTask, {
        preserveMetadata: true
      });

      const subtasks = result.filter(task => task.id !== testTask.id);
      if (subtasks.length > 0) {
        subtasks.forEach(subtask => {
          expect(subtask.metadata).toMatchObject(testTask.metadata);
          expect(subtask.metadata.generatedBy).toBe('TaskDecomposer');
        });
      }
    });

    it('should respect target complexity', async () => {
      const result = await decomposer.decomposeTask(testTask, {
        targetComplexity: TaskComplexity.MODERATE
      });

      const subtasks = result.filter(task => task.id !== testTask.id);
      if (subtasks.length > 0) {
        subtasks.forEach(subtask => {
          const complexity = decomposer.assessTaskComplexity(subtask);
          expect(complexity).toBeLessThanOrEqual(0.6); // Moderate complexity threshold
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without description', async () => {
      const taskWithoutDescription: Task = {
        id: 'no-desc',
        title: 'Task Without Description',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(decomposer.decomposeTask(taskWithoutDescription))
        .rejects.toThrow('Task description too short for decomposition');
    });

    it('should handle task with very short description', async () => {
      const taskWithShortDescription: Task = {
        id: 'short-desc',
        title: 'Short',
        description: 'Short',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(decomposer.decomposeTask(taskWithShortDescription))
        .rejects.toThrow('Task description too short for decomposition');
    });

    it('should handle empty decomposition options', async () => {
      const task: Task = {
        id: 'empty-options',
        title: 'Task with Empty Options',
        description: 'This is a moderately complex task that should be decomposed into smaller parts',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await decomposer.decomposeTask(task, {});
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});