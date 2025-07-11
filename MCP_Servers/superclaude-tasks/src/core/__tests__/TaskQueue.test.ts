import { TaskQueueManager } from '../TaskQueue.js';
import {
  TaskState,
  TaskPriority,
  TaskComplexity,
  CreateTaskInput,
  TaskNotFoundError,
  TaskDependencyError,
  TaskStateError
} from '../../types/index.js';

describe('TaskQueueManager', () => {
  let taskQueue: TaskQueueManager;

  beforeEach(() => {
    taskQueue = new TaskQueueManager();
  });

  describe('Task Creation', () => {
    it('should create a task with required fields', async () => {
      const input: CreateTaskInput = {
        title: 'Test Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      };

      const task = await taskQueue.createTask(input);

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.state).toBe(TaskState.PENDING);
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a task with all optional fields', async () => {
      const dueDate = new Date('2024-12-31');
      const input: CreateTaskInput = {
        title: 'Complex Task',
        description: 'A complex task with all fields',
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        complexity: TaskComplexity.COMPLEX,
        dependencies: [],
        tags: ['frontend', 'urgent'],
        assignee: 'developer@example.com',
        estimatedHours: 16,
        dueDate
      };

      const task = await taskQueue.createTask(input);

      expect(task.description).toBe('A complex task with all fields');
      expect(task.complexity).toBe(TaskComplexity.COMPLEX);
      expect(task.tags).toEqual(['frontend', 'urgent']);
      expect(task.assignee).toBe('developer@example.com');
      expect(task.estimatedHours).toBe(16);
      expect(task.dueDate).toEqual(dueDate);
    });

    it('should validate dependencies exist', async () => {
      const input: CreateTaskInput = {
        title: 'Dependent Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: ['non-existent-task']
      };

      await expect(taskQueue.createTask(input)).rejects.toThrow(TaskDependencyError);
    });

    it('should add task to default queue', async () => {
      const input: CreateTaskInput = {
        title: 'Queue Test Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      };

      const task = await taskQueue.createTask(input);
      const defaultQueue = await taskQueue.getQueue('default');

      expect(defaultQueue.tasks).toContain(task.id);
    });
  });

  describe('Task Retrieval', () => {
    it('should retrieve an existing task', async () => {
      const input: CreateTaskInput = {
        title: 'Retrievable Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      };

      const createdTask = await taskQueue.createTask(input);
      const retrievedTask = await taskQueue.getTask(createdTask.id);

      expect(retrievedTask).toEqual(createdTask);
    });

    it('should throw error for non-existent task', async () => {
      await expect(taskQueue.getTask('non-existent')).rejects.toThrow(TaskNotFoundError);
    });
  });

  describe('Task Updates', () => {
    it('should update task fields', async () => {
      const input: CreateTaskInput = {
        title: 'Original Title',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      };

      const task = await taskQueue.createTask(input);
      const updatedTask = await taskQueue.updateTask({
        id: task.id,
        title: 'Updated Title',
        state: TaskState.IN_PROGRESS,
        assignee: 'new-assignee@example.com'
      });

      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.state).toBe(TaskState.IN_PROGRESS);
      expect(updatedTask.assignee).toBe('new-assignee@example.com');
      expect(updatedTask.updatedAt.getTime()).toBeGreaterThan(task.updatedAt.getTime());
    });

    it('should set completedAt when state changes to completed', async () => {
      const input: CreateTaskInput = {
        title: 'Task to Complete',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      };

      const task = await taskQueue.createTask(input);
      const completedTask = await taskQueue.updateTask({
        id: task.id,
        state: TaskState.COMPLETED
      });

      expect(completedTask.completedAt).toBeInstanceOf(Date);
    });

    it('should validate state transitions', async () => {
      const input: CreateTaskInput = {
        title: 'State Transition Test',
        state: TaskState.COMPLETED,
        priority: TaskPriority.MEDIUM
      };

      const task = await taskQueue.createTask(input);
      
      // Valid transition: completed -> in_progress (reopening)
      await expect(taskQueue.updateTask({
        id: task.id,
        state: TaskState.IN_PROGRESS
      })).resolves.toBeDefined();
    });
  });

  describe('Task Deletion', () => {
    it('should delete a task without dependents', async () => {
      const input: CreateTaskInput = {
        title: 'Task to Delete',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      };

      const task = await taskQueue.createTask(input);
      await taskQueue.deleteTask(task.id);

      await expect(taskQueue.getTask(task.id)).rejects.toThrow(TaskNotFoundError);
    });

    it('should not delete task with dependents', async () => {
      // Create parent task
      const parentTask = await taskQueue.createTask({
        title: 'Parent Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      });

      // Create dependent task
      await taskQueue.createTask({
        title: 'Dependent Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [parentTask.id]
      });

      await expect(taskQueue.deleteTask(parentTask.id)).rejects.toThrow(TaskDependencyError);
    });
  });

  describe('Task Listing and Filtering', () => {
    beforeEach(async () => {
      // Create test tasks
      await taskQueue.createTask({
        title: 'High Priority Task',
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        tags: ['urgent']
      });

      await taskQueue.createTask({
        title: 'Low Priority Task',
        state: TaskState.COMPLETED,
        priority: TaskPriority.LOW,
        tags: ['optional']
      });

      await taskQueue.createTask({
        title: 'Medium Priority Task',
        state: TaskState.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        assignee: 'dev@example.com'
      });
    });

    it('should list all tasks without filters', async () => {
      const tasks = await taskQueue.listTasks();
      expect(tasks).toHaveLength(3);
    });

    it('should filter tasks by state', async () => {
      const pendingTasks = await taskQueue.listTasks({
        state: [TaskState.PENDING]
      });

      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].state).toBe(TaskState.PENDING);
    });

    it('should filter tasks by priority', async () => {
      const highPriorityTasks = await taskQueue.listTasks({
        priority: [TaskPriority.HIGH]
      });

      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].priority).toBe(TaskPriority.HIGH);
    });

    it('should filter tasks by tags', async () => {
      const urgentTasks = await taskQueue.listTasks({
        tags: ['urgent']
      });

      expect(urgentTasks).toHaveLength(1);
      expect(urgentTasks[0].tags).toContain('urgent');
    });

    it('should filter tasks by assignee', async () => {
      const assignedTasks = await taskQueue.listTasks({
        assignee: ['dev@example.com']
      });

      expect(assignedTasks).toHaveLength(1);
      expect(assignedTasks[0].assignee).toBe('dev@example.com');
    });

    it('should sort tasks by priority', async () => {
      const sortedTasks = await taskQueue.listTasks(
        {},
        { field: 'priority', direction: 'desc' }
      );

      // Note: Priority sorting by enum value (high=3, medium=2, low=1)
      expect(sortedTasks[0].priority).toBe(TaskPriority.HIGH);
      expect(sortedTasks[2].priority).toBe(TaskPriority.LOW);
    });

    it('should apply pagination', async () => {
      const firstPage = await taskQueue.listTasks({}, undefined, 2, 0);
      const secondPage = await taskQueue.listTasks({}, undefined, 2, 2);

      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(1);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });
  });

  describe('Dependencies and Relationships', () => {
    it('should get task dependencies', async () => {
      const dep1 = await taskQueue.createTask({
        title: 'Dependency 1',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      });

      const dep2 = await taskQueue.createTask({
        title: 'Dependency 2',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      });

      const mainTask = await taskQueue.createTask({
        title: 'Main Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [dep1.id, dep2.id]
      });

      const dependencies = await taskQueue.getTaskDependencies(mainTask.id);
      
      expect(dependencies).toHaveLength(2);
      expect(dependencies.map(d => d.id)).toContain(dep1.id);
      expect(dependencies.map(d => d.id)).toContain(dep2.id);
    });

    it('should get task dependents', async () => {
      const parentTask = await taskQueue.createTask({
        title: 'Parent Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      });

      const dependent1 = await taskQueue.createTask({
        title: 'Dependent 1',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [parentTask.id]
      });

      const dependent2 = await taskQueue.createTask({
        title: 'Dependent 2',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [parentTask.id]
      });

      const dependents = await taskQueue.getTaskDependents(parentTask.id);
      
      expect(dependents).toHaveLength(2);
      expect(dependents.map(d => d.id)).toContain(dependent1.id);
      expect(dependents.map(d => d.id)).toContain(dependent2.id);
    });

    it('should get subtasks', async () => {
      const parentTask = await taskQueue.createTask({
        title: 'Parent Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      });

      await taskQueue.createTask({
        title: 'Subtask 1',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        parentId: parentTask.id
      });

      await taskQueue.createTask({
        title: 'Subtask 2',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        parentId: parentTask.id
      });

      const subtasks = await taskQueue.getSubtasks(parentTask.id);
      
      expect(subtasks).toHaveLength(2);
      expect(subtasks.every(t => t.parentId === parentTask.id)).toBe(true);
    });
  });

  describe('Queue Management', () => {
    it('should create a custom queue', async () => {
      const queue = await taskQueue.createQueue(
        'Custom Queue',
        'A custom task queue',
        5
      );

      expect(queue.name).toBe('Custom Queue');
      expect(queue.description).toBe('A custom task queue');
      expect(queue.maxConcurrentTasks).toBe(5);
      expect(queue.tasks).toEqual([]);
    });

    it('should list all queues', async () => {
      await taskQueue.createQueue('Queue 1');
      await taskQueue.createQueue('Queue 2');

      const queues = await taskQueue.listQueues();
      
      expect(queues).toHaveLength(3); // Including default queue
      expect(queues.map(q => q.name)).toContain('Queue 1');
      expect(queues.map(q => q.name)).toContain('Queue 2');
      expect(queues.map(q => q.name)).toContain('Default Queue');
    });

    it('should get next executable tasks', async () => {
      // Create completed dependency
      const dependency = await taskQueue.createTask({
        title: 'Completed Dependency',
        state: TaskState.COMPLETED,
        priority: TaskPriority.MEDIUM
      });

      // Create executable task
      const executableTask = await taskQueue.createTask({
        title: 'Executable Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [dependency.id]
      });

      // Create blocked task
      const blockingDep = await taskQueue.createTask({
        title: 'Blocking Dependency',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM
      });

      await taskQueue.createTask({
        title: 'Blocked Task',
        state: TaskState.PENDING,
        priority: TaskPriority.MEDIUM,
        dependencies: [blockingDep.id]
      });

      const executableTasks = await taskQueue.getNextExecutableTasks('default');
      
      expect(executableTasks).toHaveLength(2); // executableTask and blockingDep
      expect(executableTasks.map(t => t.id)).toContain(executableTask.id);
      expect(executableTasks.map(t => t.id)).toContain(blockingDep.id);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await taskQueue.createTask({
        title: 'Pending Task',
        state: TaskState.PENDING,
        priority: TaskPriority.HIGH,
        complexity: TaskComplexity.SIMPLE
      });

      await taskQueue.createTask({
        title: 'Completed Task',
        state: TaskState.COMPLETED,
        priority: TaskPriority.MEDIUM,
        complexity: TaskComplexity.COMPLEX
      });

      await taskQueue.createTask({
        title: 'In Progress Task',
        state: TaskState.IN_PROGRESS,
        priority: TaskPriority.LOW,
        complexity: TaskComplexity.MODERATE
      });
    });

    it('should provide task statistics', async () => {
      const stats = await taskQueue.getTaskStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byState[TaskState.PENDING]).toBe(1);
      expect(stats.byState[TaskState.COMPLETED]).toBe(1);
      expect(stats.byState[TaskState.IN_PROGRESS]).toBe(1);
      expect(stats.byPriority[TaskPriority.HIGH]).toBe(1);
      expect(stats.byPriority[TaskPriority.MEDIUM]).toBe(1);
      expect(stats.byPriority[TaskPriority.LOW]).toBe(1);
    });
  });
});