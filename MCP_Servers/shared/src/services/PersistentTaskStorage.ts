import { DatabaseService, DatabaseServiceManager } from './DatabaseService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Task entity interface for database storage
 */
export interface TaskEntity {
  id: string;
  title: string;
  description?: string;
  state: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  complexity?: 'simple' | 'moderate' | 'complex';
  assignee?: string;
  parent_id?: string;
  dependencies: string[];
  tags: string[];
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  metadata?: Record<string, any>;
}

/**
 * Task queue entity interface for database storage
 */
export interface TaskQueueEntity {
  id: string;
  name: string;
  description?: string;
  max_concurrent_tasks: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Task analytics interface
 */
export interface TaskAnalytics {
  totalTasks: number;
  tasksByState: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByComplexity: Record<string, number>;
  completedToday: number;
  overdueTasks: number;
  averageCompletionTime: number;
  productivityTrend: Array<{ date: string; completed: number }>;
}

/**
 * Persistent task storage service with database backend
 * Provides comprehensive task management with analytics and history
 */
export class PersistentTaskStorage {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || DatabaseServiceManager.getInstance();
  }

  // ==================== TASK OPERATIONS ====================

  /**
   * Create a new task in persistent storage
   */
  async createTask(task: Omit<TaskEntity, 'id' | 'created_at' | 'updated_at'>): Promise<TaskEntity> {
    const taskId = uuidv4();
    const now = new Date();
    
    const taskEntity: TaskEntity = {
      ...task,
      id: taskId,
      created_at: now,
      updated_at: now
    };

    try {
      const sql = `
        INSERT INTO tasks (
          id, title, description, state, priority, complexity, assignee,
          parent_id, dependencies, tags, due_date, created_at, updated_at,
          completed_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        taskEntity.id,
        taskEntity.title,
        taskEntity.description,
        taskEntity.state,
        taskEntity.priority,
        taskEntity.complexity,
        taskEntity.assignee,
        taskEntity.parent_id,
        JSON.stringify(taskEntity.dependencies),
        JSON.stringify(taskEntity.tags),
        taskEntity.due_date?.toISOString(),
        taskEntity.created_at.toISOString(),
        taskEntity.updated_at.toISOString(),
        taskEntity.completed_at?.toISOString(),
        taskEntity.metadata ? JSON.stringify(taskEntity.metadata) : null
      ];

      await this.db.query(sql, params);
      
      logger.info('Task created in persistent storage', { taskId: taskEntity.id });
      return taskEntity;
    } catch (error) {
      logger.error('Failed to create task in persistent storage', { 
        taskId: taskEntity.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Retrieve task by ID from persistent storage
   */
  async getTask(taskId: string): Promise<TaskEntity | null> {
    try {
      const sql = 'SELECT * FROM tasks WHERE id = ?';
      const result = await this.db.query<any>(sql, [taskId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTaskEntity(result.rows[0]);
    } catch (error) {
      logger.error('Failed to retrieve task from persistent storage', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update task in persistent storage
   */
  async updateTask(taskId: string, updates: Partial<TaskEntity>): Promise<TaskEntity | null> {
    try {
      const existingTask = await this.getTask(taskId);
      if (!existingTask) {
        return null;
      }

      const updatedTask: TaskEntity = {
        ...existingTask,
        ...updates,
        id: taskId, // Preserve ID
        updated_at: new Date(),
        completed_at: updates.state === 'completed' ? new Date() : existingTask.completed_at
      };

      const sql = `
        UPDATE tasks SET
          title = ?, description = ?, state = ?, priority = ?, complexity = ?,
          assignee = ?, parent_id = ?, dependencies = ?, tags = ?, due_date = ?,
          updated_at = ?, completed_at = ?, metadata = ?
        WHERE id = ?
      `;

      const params = [
        updatedTask.title,
        updatedTask.description,
        updatedTask.state,
        updatedTask.priority,
        updatedTask.complexity,
        updatedTask.assignee,
        updatedTask.parent_id,
        JSON.stringify(updatedTask.dependencies),
        JSON.stringify(updatedTask.tags),
        updatedTask.due_date?.toISOString(),
        updatedTask.updated_at.toISOString(),
        updatedTask.completed_at?.toISOString(),
        updatedTask.metadata ? JSON.stringify(updatedTask.metadata) : null,
        taskId
      ];

      await this.db.query(sql, params);
      
      logger.info('Task updated in persistent storage', { taskId });
      return updatedTask;
    } catch (error) {
      logger.error('Failed to update task in persistent storage', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete task from persistent storage
   */
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const transaction = await this.db.beginTransaction();
      
      try {
        // Remove from queue_tasks first (foreign key constraint)
        await transaction.query('DELETE FROM queue_tasks WHERE task_id = ?', [taskId]);
        
        // Delete the task
        const result = await transaction.query('DELETE FROM tasks WHERE id = ?', [taskId]);
        
        await transaction.commit();
        
        const deleted = result.rowCount > 0;
        if (deleted) {
          logger.info('Task deleted from persistent storage', { taskId });
        }
        
        return deleted;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('Failed to delete task from persistent storage', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List tasks with filtering and pagination
   */
  async listTasks(
    filters: {
      state?: string[];
      priority?: string[];
      complexity?: string[];
      assignee?: string;
      parentId?: string;
      tags?: string[];
      dueBefore?: Date;
      dueAfter?: Date;
      createdBefore?: Date;
      createdAfter?: Date;
    } = {},
    sort: { field: string; direction: 'asc' | 'desc' } = { field: 'created_at', direction: 'desc' },
    limit?: number,
    offset: number = 0
  ): Promise<{ tasks: TaskEntity[]; total: number }> {
    try {
      // Build WHERE clause
      const whereClauses: string[] = [];
      const params: any[] = [];

      if (filters.state && filters.state.length > 0) {
        whereClauses.push(`state IN (${filters.state.map(() => '?').join(', ')})`);
        params.push(...filters.state);
      }

      if (filters.priority && filters.priority.length > 0) {
        whereClauses.push(`priority IN (${filters.priority.map(() => '?').join(', ')})`);
        params.push(...filters.priority);
      }

      if (filters.complexity && filters.complexity.length > 0) {
        whereClauses.push(`complexity IN (${filters.complexity.map(() => '?').join(', ')})`);
        params.push(...filters.complexity);
      }

      if (filters.assignee) {
        whereClauses.push('assignee = ?');
        params.push(filters.assignee);
      }

      if (filters.parentId) {
        whereClauses.push('parent_id = ?');
        params.push(filters.parentId);
      }

      if (filters.dueBefore) {
        whereClauses.push('due_date < ?');
        params.push(filters.dueBefore.toISOString());
      }

      if (filters.dueAfter) {
        whereClauses.push('due_date > ?');
        params.push(filters.dueAfter.toISOString());
      }

      if (filters.createdBefore) {
        whereClauses.push('created_at < ?');
        params.push(filters.createdBefore.toISOString());
      }

      if (filters.createdAfter) {
        whereClauses.push('created_at > ?');
        params.push(filters.createdAfter.toISOString());
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM tasks ${whereClause}`;
      const countResult = await this.db.query<{ total: number }>(countSql, params);
      const total = countResult.rows[0]?.total || 0;

      // Get tasks with pagination
      const orderClause = `ORDER BY ${sort.field} ${sort.direction.toUpperCase()}`;
      const limitClause = limit ? `LIMIT ${limit} OFFSET ${offset}` : '';
      
      const tasksSql = `SELECT * FROM tasks ${whereClause} ${orderClause} ${limitClause}`;
      const tasksResult = await this.db.query<any>(tasksSql, params);

      const tasks = tasksResult.rows.map(row => this.mapRowToTaskEntity(row));

      return { tasks, total };
    } catch (error) {
      logger.error('Failed to list tasks from persistent storage', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get task subtasks
   */
  async getSubtasks(parentId: string): Promise<TaskEntity[]> {
    const result = await this.listTasks({ parentId });
    return result.tasks;
  }

  /**
   * Get task dependencies
   */
  async getTaskDependencies(taskId: string): Promise<TaskEntity[]> {
    try {
      const task = await this.getTask(taskId);
      if (!task || task.dependencies.length === 0) {
        return [];
      }

      const placeholders = task.dependencies.map(() => '?').join(', ');
      const sql = `SELECT * FROM tasks WHERE id IN (${placeholders})`;
      const result = await this.db.query<any>(sql, task.dependencies);

      return result.rows.map(row => this.mapRowToTaskEntity(row));
    } catch (error) {
      logger.error('Failed to get task dependencies from persistent storage', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get task dependents (tasks that depend on this task)
   */
  async getTaskDependents(taskId: string): Promise<TaskEntity[]> {
    try {
      // Note: This requires a more complex query for SQLite vs PostgreSQL
      // For simplicity, we'll scan all tasks and filter by dependencies
      const sql = 'SELECT * FROM tasks';
      const result = await this.db.query<any>(sql);

      const dependents = result.rows
        .map(row => this.mapRowToTaskEntity(row))
        .filter(task => task.dependencies.includes(taskId));

      return dependents;
    } catch (error) {
      logger.error('Failed to get task dependents from persistent storage', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  // ==================== QUEUE OPERATIONS ====================

  /**
   * Create a new task queue
   */
  async createQueue(queue: Omit<TaskQueueEntity, 'id' | 'created_at' | 'updated_at'>): Promise<TaskQueueEntity> {
    const queueId = uuidv4();
    const now = new Date();
    
    const queueEntity: TaskQueueEntity = {
      ...queue,
      id: queueId,
      created_at: now,
      updated_at: now
    };

    try {
      const sql = `
        INSERT INTO task_queues (id, name, description, max_concurrent_tasks, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        queueEntity.id,
        queueEntity.name,
        queueEntity.description,
        queueEntity.max_concurrent_tasks,
        queueEntity.created_at.toISOString(),
        queueEntity.updated_at.toISOString()
      ];

      await this.db.query(sql, params);
      
      logger.info('Task queue created in persistent storage', { queueId: queueEntity.id });
      return queueEntity;
    } catch (error) {
      logger.error('Failed to create task queue in persistent storage', {
        queueId: queueEntity.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get task queue by ID
   */
  async getQueue(queueId: string): Promise<TaskQueueEntity | null> {
    try {
      const sql = 'SELECT * FROM task_queues WHERE id = ?';
      const result = await this.db.query<any>(sql, [queueId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToQueueEntity(result.rows[0]);
    } catch (error) {
      logger.error('Failed to retrieve task queue from persistent storage', {
        queueId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List all task queues
   */
  async listQueues(): Promise<TaskQueueEntity[]> {
    try {
      const sql = 'SELECT * FROM task_queues ORDER BY created_at DESC';
      const result = await this.db.query<any>(sql);

      return result.rows.map(row => this.mapRowToQueueEntity(row));
    } catch (error) {
      logger.error('Failed to list task queues from persistent storage', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add task to queue
   */
  async addTaskToQueue(taskId: string, queueId: string): Promise<void> {
    try {
      const sql = `
        INSERT OR IGNORE INTO queue_tasks (queue_id, task_id, added_at)
        VALUES (?, ?, ?)
      `;
      
      await this.db.query(sql, [queueId, taskId, new Date().toISOString()]);
      
      logger.debug('Task added to queue in persistent storage', { taskId, queueId });
    } catch (error) {
      logger.error('Failed to add task to queue in persistent storage', {
        taskId,
        queueId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove task from queue
   */
  async removeTaskFromQueue(taskId: string, queueId: string): Promise<void> {
    try {
      const sql = 'DELETE FROM queue_tasks WHERE queue_id = ? AND task_id = ?';
      await this.db.query(sql, [queueId, taskId]);
      
      logger.debug('Task removed from queue in persistent storage', { taskId, queueId });
    } catch (error) {
      logger.error('Failed to remove task from queue in persistent storage', {
        taskId,
        queueId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get tasks in queue
   */
  async getQueueTasks(queueId: string): Promise<TaskEntity[]> {
    try {
      const sql = `
        SELECT t.* FROM tasks t
        INNER JOIN queue_tasks qt ON t.id = qt.task_id
        WHERE qt.queue_id = ?
        ORDER BY qt.added_at ASC
      `;
      
      const result = await this.db.query<any>(sql, [queueId]);
      return result.rows.map(row => this.mapRowToTaskEntity(row));
    } catch (error) {
      logger.error('Failed to get queue tasks from persistent storage', {
        queueId,
        error: error.message
      });
      throw error;
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Get comprehensive task analytics
   */
  async getTaskAnalytics(
    dateRange?: { start: Date; end: Date }
  ): Promise<TaskAnalytics> {
    try {
      const dateFilter = dateRange ? 
        `WHERE created_at >= '${dateRange.start.toISOString()}' AND created_at <= '${dateRange.end.toISOString()}'` : 
        '';

      // Get basic statistics
      const statsQueries = await Promise.all([
        this.db.query<{ total: number }>(`SELECT COUNT(*) as total FROM tasks ${dateFilter}`),
        this.db.query<{ state: string; count: number }>(`SELECT state, COUNT(*) as count FROM tasks ${dateFilter} GROUP BY state`),
        this.db.query<{ priority: string; count: number }>(`SELECT priority, COUNT(*) as count FROM tasks ${dateFilter} GROUP BY priority`),
        this.db.query<{ complexity: string; count: number }>(`SELECT complexity, COUNT(*) as count FROM tasks WHERE complexity IS NOT NULL ${dateFilter.replace('WHERE', 'AND')} GROUP BY complexity`),
        this.db.query<{ count: number }>(`
          SELECT COUNT(*) as count FROM tasks 
          WHERE state = 'completed' AND DATE(completed_at) = DATE('now') ${dateFilter.replace('WHERE', 'AND')}
        `),
        this.db.query<{ count: number }>(`
          SELECT COUNT(*) as count FROM tasks 
          WHERE due_date < datetime('now') AND state != 'completed' ${dateFilter.replace('WHERE', 'AND')}
        `)
      ]);

      const totalTasks = statsQueries[0].rows[0]?.total || 0;
      
      const tasksByState = statsQueries[1].rows.reduce((acc, row) => {
        acc[row.state] = row.count;
        return acc;
      }, {} as Record<string, number>);

      const tasksByPriority = statsQueries[2].rows.reduce((acc, row) => {
        acc[row.priority] = row.count;
        return acc;
      }, {} as Record<string, number>);

      const tasksByComplexity = statsQueries[3].rows.reduce((acc, row) => {
        acc[row.complexity] = row.count;
        return acc;
      }, {} as Record<string, number>);

      const completedToday = statsQueries[4].rows[0]?.count || 0;
      const overdueTasks = statsQueries[5].rows[0]?.count || 0;

      // Calculate average completion time
      const completionTimeQuery = await this.db.query<{ avg_time: number }>(`
        SELECT AVG(
          CASE 
            WHEN completed_at IS NOT NULL THEN 
              (julianday(completed_at) - julianday(created_at)) * 24 * 60 * 60 * 1000
            ELSE NULL
          END
        ) as avg_time
        FROM tasks 
        WHERE state = 'completed' ${dateFilter.replace('WHERE', 'AND')}
      `);

      const averageCompletionTime = completionTimeQuery.rows[0]?.avg_time || 0;

      // Get productivity trend (last 7 days)
      const trendQuery = await this.db.query<{ date: string; completed: number }>(`
        SELECT 
          DATE(completed_at) as date,
          COUNT(*) as completed
        FROM tasks 
        WHERE state = 'completed' 
          AND completed_at >= datetime('now', '-7 days')
        GROUP BY DATE(completed_at)
        ORDER BY date ASC
      `);

      const productivityTrend = trendQuery.rows;

      return {
        totalTasks,
        tasksByState,
        tasksByPriority,
        tasksByComplexity,
        completedToday,
        overdueTasks,
        averageCompletionTime,
        productivityTrend
      };
    } catch (error) {
      logger.error('Failed to get task analytics from persistent storage', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get task completion history
   */
  async getTaskCompletionHistory(
    taskId: string
  ): Promise<Array<{ timestamp: Date; state: string; metadata?: any }>> {
    try {
      // This would require a task_history table for full audit trail
      // For now, return basic completion info
      const task = await this.getTask(taskId);
      if (!task) {
        return [];
      }

      const history = [
        { timestamp: task.created_at, state: 'created' },
        { timestamp: task.updated_at, state: task.state }
      ];

      if (task.completed_at) {
        history.push({ timestamp: task.completed_at, state: 'completed' });
      }

      return history;
    } catch (error) {
      logger.error('Failed to get task completion history', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Map database row to TaskEntity
   */
  private mapRowToTaskEntity(row: any): TaskEntity {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      state: row.state,
      priority: row.priority,
      complexity: row.complexity,
      assignee: row.assignee,
      parent_id: row.parent_id,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      due_date: row.due_date ? new Date(row.due_date) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  /**
   * Map database row to TaskQueueEntity
   */
  private mapRowToQueueEntity(row: any): TaskQueueEntity {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      max_concurrent_tasks: row.max_concurrent_tasks,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Clean up old completed tasks
   */
  async cleanupOldTasks(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const sql = `
        DELETE FROM tasks 
        WHERE state IN ('completed', 'cancelled') 
        AND updated_at < ?
      `;

      const result = await this.db.query(sql, [cutoffDate.toISOString()]);
      
      logger.info('Old tasks cleaned up from persistent storage', {
        daysOld,
        deletedCount: result.rowCount
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to clean up old tasks from persistent storage', {
        daysOld,
        error: error.message
      });
      throw error;
    }
  }
}