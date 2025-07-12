import { EventEmitter } from 'events';
import { z } from 'zod';
import { logger } from '@superclaude/shared';
import {
  Task,
  TaskQueue,
  TaskSchema,
  TaskQueueSchema,
  TaskFilterOptions,
  TaskSortOptions,
  TaskState,
  TaskPriority,
  TaskComplexity
} from '../types/index.js';

/**
 * Database configuration for different providers
 */
export interface DatabaseConfig {
  provider: 'postgresql' | 'sqlite' | 'mongodb';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  options?: Record<string, any>;
}

/**
 * Query options for database operations
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: TaskSortOptions;
  filter?: TaskFilterOptions;
  includeSoftDeleted?: boolean;
}

/**
 * Database transaction context
 */
export interface DatabaseTransaction {
  id: string;
  startedAt: Date;
  operations: string[];
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

/**
 * Database adapter interface for different providers
 */
export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;
  
  // Task operations
  createTask(task: Task, transaction?: DatabaseTransaction): Promise<Task>;
  getTask(id: string, transaction?: DatabaseTransaction): Promise<Task | null>;
  updateTask(id: string, updates: Partial<Task>, transaction?: DatabaseTransaction): Promise<Task>;
  deleteTask(id: string, soft?: boolean, transaction?: DatabaseTransaction): Promise<boolean>;
  listTasks(options?: QueryOptions, transaction?: DatabaseTransaction): Promise<Task[]>;
  
  // Queue operations
  createQueue(queue: TaskQueue, transaction?: DatabaseTransaction): Promise<TaskQueue>;
  getQueue(id: string, transaction?: DatabaseTransaction): Promise<TaskQueue | null>;
  updateQueue(id: string, updates: Partial<TaskQueue>, transaction?: DatabaseTransaction): Promise<TaskQueue>;
  deleteQueue(id: string, transaction?: DatabaseTransaction): Promise<boolean>;
  listQueues(options?: QueryOptions, transaction?: DatabaseTransaction): Promise<TaskQueue[]>;
  
  // Advanced queries
  getTaskDependencies(taskId: string, transaction?: DatabaseTransaction): Promise<Task[]>;
  getTaskDependents(taskId: string, transaction?: DatabaseTransaction): Promise<Task[]>;
  getTasksByState(state: TaskState, options?: QueryOptions): Promise<Task[]>;
  getOverdueTasks(options?: QueryOptions): Promise<Task[]>;
  getTaskStatistics(): Promise<any>;
  
  // Transaction management
  beginTransaction(): Promise<DatabaseTransaction>;
  
  // Migration and maintenance
  migrate(): Promise<void>;
  backup(): Promise<string>;
  restore(backupPath: string): Promise<void>;
  vacuum(): Promise<void>;
}

/**
 * PostgreSQL adapter implementation
 */
export class PostgreSQLAdapter implements DatabaseAdapter {
  private config: DatabaseConfig;
  private client: any = null;
  private pool: any = null;
  
  constructor(config: DatabaseConfig) {
    this.config = config;
  }
  
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid requiring pg as a dependency
      const { Pool } = await import('pg');
      
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ...this.config.options
      });
      
      // Test connection
      this.client = await this.pool.connect();
      logger.info('PostgreSQL connection established');
      
      // Initialize schema
      await this.initializeSchema();
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL', { error });
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    logger.info('PostgreSQL connection closed');
  }
  
  async ping(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length === 1;
    } catch (error) {
      return false;
    }
  }
  
  private async initializeSchema(): Promise<void> {
    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        state VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        complexity VARCHAR(50),
        parent_id VARCHAR(255),
        dependencies JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        estimated_hours DECIMAL(10,2),
        actual_hours DECIMAL(10,2),
        assignee VARCHAR(255),
        due_date TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        deleted_at TIMESTAMP,
        
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
      )
    `;
    
    const createQueuesTable = `
      CREATE TABLE IF NOT EXISTS task_queues (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tasks JSONB DEFAULT '[]',
        max_concurrent_tasks INTEGER DEFAULT 3,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_dependencies ON tasks USING GIN(dependencies);
      CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_tasks_metadata ON tasks USING GIN(metadata);
      CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
    `;
    
    await this.pool.query(createTasksTable);
    await this.pool.query(createQueuesTable);
    await this.pool.query(createIndexes);
    
    logger.info('PostgreSQL schema initialized');
  }
  
  async createTask(task: Task, transaction?: DatabaseTransaction): Promise<Task> {
    const client = transaction ? transaction : this.pool;
    
    const query = `
      INSERT INTO tasks (
        id, title, description, state, priority, complexity, parent_id,
        dependencies, tags, estimated_hours, actual_hours, assignee,
        due_date, created_at, updated_at, completed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const values = [
      task.id, task.title, task.description, task.state, task.priority,
      task.complexity, task.parentId, JSON.stringify(task.dependencies),
      JSON.stringify(task.tags), task.estimatedHours, task.actualHours,
      task.assignee, task.dueDate, task.createdAt, task.updatedAt,
      task.completedAt, JSON.stringify(task.metadata)
    ];
    
    const result = await client.query(query, values);
    return this.mapRowToTask(result.rows[0]);
  }
  
  async getTask(id: string, transaction?: DatabaseTransaction): Promise<Task | null> {
    const client = transaction ? transaction : this.pool;
    
    const query = 'SELECT * FROM tasks WHERE id = $1 AND deleted_at IS NULL';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTask(result.rows[0]);
  }
  
  async updateTask(id: string, updates: Partial<Task>, transaction?: DatabaseTransaction): Promise<Task> {
    const client = transaction ? transaction : this.pool;
    
    // Build dynamic update query
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      
      const dbColumn = this.camelToSnakeCase(key);
      if (['dependencies', 'tags', 'metadata'].includes(key)) {
        setClause.push(`${dbColumn} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE tasks 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Task ${id} not found`);
    }
    
    return this.mapRowToTask(result.rows[0]);
  }
  
  async deleteTask(id: string, soft: boolean = true, transaction?: DatabaseTransaction): Promise<boolean> {
    const client = transaction ? transaction : this.pool;
    
    let query: string;
    if (soft) {
      query = 'UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL';
    } else {
      query = 'DELETE FROM tasks WHERE id = $1';
    }
    
    const result = await client.query(query, [id]);
    return result.rowCount > 0;
  }
  
  async listTasks(options: QueryOptions = {}, transaction?: DatabaseTransaction): Promise<Task[]> {
    const client = transaction ? transaction : this.pool;
    
    let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL';
    const values: any[] = [];
    let paramIndex = 1;
    
    // Apply filters
    if (options.filter) {
      const filterConditions = this.buildFilterConditions(options.filter, values, paramIndex);
      if (filterConditions.conditions.length > 0) {
        query += ' AND ' + filterConditions.conditions.join(' AND ');
        paramIndex = filterConditions.paramIndex;
      }
    }
    
    // Apply sorting
    if (options.sort) {
      const sortColumn = this.camelToSnakeCase(options.sort.field);
      query += ` ORDER BY ${sortColumn} ${options.sort.direction.toUpperCase()}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    // Apply pagination
    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
      paramIndex++;
    }
    
    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(options.offset);
    }
    
    const result = await client.query(query, values);
    return result.rows.map(row => this.mapRowToTask(row));
  }
  
  async createQueue(queue: TaskQueue, transaction?: DatabaseTransaction): Promise<TaskQueue> {
    const client = transaction ? transaction : this.pool;
    
    const query = `
      INSERT INTO task_queues (id, name, description, tasks, max_concurrent_tasks, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      queue.id, queue.name, queue.description, JSON.stringify(queue.tasks),
      queue.maxConcurrentTasks, queue.createdAt, queue.updatedAt
    ];
    
    const result = await client.query(query, values);
    return this.mapRowToQueue(result.rows[0]);
  }
  
  async getQueue(id: string, transaction?: DatabaseTransaction): Promise<TaskQueue | null> {
    const client = transaction ? transaction : this.pool;
    
    const query = 'SELECT * FROM task_queues WHERE id = $1';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToQueue(result.rows[0]);
  }
  
  async updateQueue(id: string, updates: Partial<TaskQueue>, transaction?: DatabaseTransaction): Promise<TaskQueue> {
    const client = transaction ? transaction : this.pool;
    
    // Build dynamic update query
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      
      const dbColumn = this.camelToSnakeCase(key);
      if (key === 'tasks') {
        setClause.push(`${dbColumn} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE task_queues 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Queue ${id} not found`);
    }
    
    return this.mapRowToQueue(result.rows[0]);
  }
  
  async deleteQueue(id: string, transaction?: DatabaseTransaction): Promise<boolean> {
    const client = transaction ? transaction : this.pool;
    
    const query = 'DELETE FROM task_queues WHERE id = $1';
    const result = await client.query(query, [id]);
    return result.rowCount > 0;
  }
  
  async listQueues(options: QueryOptions = {}, transaction?: DatabaseTransaction): Promise<TaskQueue[]> {
    const client = transaction ? transaction : this.pool;
    
    let query = 'SELECT * FROM task_queues ORDER BY created_at DESC';
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    const result = await client.query(query);
    return result.rows.map(row => this.mapRowToQueue(row));
  }
  
  async getTaskDependencies(taskId: string, transaction?: DatabaseTransaction): Promise<Task[]> {
    const client = transaction ? transaction : this.pool;
    
    const query = `
      SELECT DISTINCT t.* FROM tasks t
      JOIN tasks source ON source.id = $1
      WHERE t.id = ANY(SELECT jsonb_array_elements_text(source.dependencies))
      AND t.deleted_at IS NULL
    `;
    
    const result = await client.query(query, [taskId]);
    return result.rows.map(row => this.mapRowToTask(row));
  }
  
  async getTaskDependents(taskId: string, transaction?: DatabaseTransaction): Promise<Task[]> {
    const client = transaction ? transaction : this.pool;
    
    const query = `
      SELECT * FROM tasks 
      WHERE dependencies @> $1 AND deleted_at IS NULL
    `;
    
    const result = await client.query(query, [JSON.stringify([taskId])]);
    return result.rows.map(row => this.mapRowToTask(row));
  }
  
  async getTasksByState(state: TaskState, options: QueryOptions = {}): Promise<Task[]> {
    return this.listTasks({
      ...options,
      filter: { ...options.filter, state: [state] }
    });
  }
  
  async getOverdueTasks(options: QueryOptions = {}): Promise<Task[]> {
    return this.listTasks({
      ...options,
      filter: { 
        ...options.filter, 
        dueBefore: new Date(),
        state: [TaskState.PENDING, TaskState.IN_PROGRESS]
      }
    });
  }
  
  async getTaskStatistics(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN state = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN state = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN state = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN state = 'blocked' THEN 1 END) as blocked,
        COUNT(CASE WHEN state = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_priority,
        COUNT(CASE WHEN due_date < NOW() AND state NOT IN ('completed', 'cancelled') THEN 1 END) as overdue,
        AVG(CASE WHEN completed_at IS NOT NULL AND created_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - created_at))/3600 END) as avg_completion_hours
      FROM tasks 
      WHERE deleted_at IS NULL
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }
  
  async beginTransaction(): Promise<DatabaseTransaction> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    
    const transaction: DatabaseTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: new Date(),
      operations: [],
      
      async rollback(): Promise<void> {
        await client.query('ROLLBACK');
        client.release();
      },
      
      async commit(): Promise<void> {
        await client.query('COMMIT');
        client.release();
      }
    };
    
    // Add query method to transaction
    (transaction as any).query = client.query.bind(client);
    
    return transaction;
  }
  
  async migrate(): Promise<void> {
    // Run any pending migrations
    await this.initializeSchema();
    logger.info('PostgreSQL migrations completed');
  }
  
  async backup(): Promise<string> {
    // Implementation would use pg_dump
    throw new Error('Backup not implemented for PostgreSQL adapter');
  }
  
  async restore(backupPath: string): Promise<void> {
    // Implementation would use pg_restore
    throw new Error('Restore not implemented for PostgreSQL adapter');
  }
  
  async vacuum(): Promise<void> {
    await this.pool.query('VACUUM ANALYZE tasks, task_queues');
    logger.info('PostgreSQL vacuum completed');
  }
  
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      state: row.state,
      priority: row.priority,
      complexity: row.complexity,
      parentId: row.parent_id,
      dependencies: row.dependencies || [],
      tags: row.tags || [],
      estimatedHours: row.estimated_hours,
      actualHours: row.actual_hours,
      assignee: row.assignee,
      dueDate: row.due_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      metadata: row.metadata || {}
    };
  }
  
  private mapRowToQueue(row: any): TaskQueue {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      tasks: row.tasks || [],
      maxConcurrentTasks: row.max_concurrent_tasks,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  private buildFilterConditions(filter: TaskFilterOptions, values: any[], startIndex: number) {
    const conditions: string[] = [];
    let paramIndex = startIndex;
    
    if (filter.state) {
      conditions.push(`state = ANY($${paramIndex})`);
      values.push(filter.state);
      paramIndex++;
    }
    
    if (filter.priority) {
      conditions.push(`priority = ANY($${paramIndex})`);
      values.push(filter.priority);
      paramIndex++;
    }
    
    if (filter.complexity) {
      conditions.push(`complexity = ANY($${paramIndex})`);
      values.push(filter.complexity);
      paramIndex++;
    }
    
    if (filter.assignee) {
      conditions.push(`assignee = ANY($${paramIndex})`);
      values.push(filter.assignee);
      paramIndex++;
    }
    
    if (filter.parentId) {
      conditions.push(`parent_id = $${paramIndex}`);
      values.push(filter.parentId);
      paramIndex++;
    }
    
    if (filter.hasParent !== undefined) {
      if (filter.hasParent) {
        conditions.push('parent_id IS NOT NULL');
      } else {
        conditions.push('parent_id IS NULL');
      }
    }
    
    if (filter.dueBefore) {
      conditions.push(`due_date < $${paramIndex}`);
      values.push(filter.dueBefore);
      paramIndex++;
    }
    
    if (filter.dueAfter) {
      conditions.push(`due_date > $${paramIndex}`);
      values.push(filter.dueAfter);
      paramIndex++;
    }
    
    if (filter.createdBefore) {
      conditions.push(`created_at < $${paramIndex}`);
      values.push(filter.createdBefore);
      paramIndex++;
    }
    
    if (filter.createdAfter) {
      conditions.push(`created_at > $${paramIndex}`);
      values.push(filter.createdAfter);
      paramIndex++;
    }
    
    if (filter.tags && filter.tags.length > 0) {
      conditions.push(`tags ?| $${paramIndex}`);
      values.push(filter.tags);
      paramIndex++;
    }
    
    return { conditions, paramIndex };
  }
}

/**
 * SQLite adapter implementation
 */
export class SQLiteAdapter implements DatabaseAdapter {
  private config: DatabaseConfig;
  private db: any = null;
  
  constructor(config: DatabaseConfig) {
    this.config = config;
  }
  
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid requiring sqlite3 as a dependency
      const Database = await import('better-sqlite3').then(m => m.default);
      
      const dbPath = this.config.connectionString || this.config.database || ':memory:';
      this.db = new Database(dbPath, this.config.options);
      
      logger.info('SQLite connection established', { database: dbPath });
      
      // Initialize schema
      await this.initializeSchema();
    } catch (error) {
      logger.error('Failed to connect to SQLite', { error });
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    logger.info('SQLite connection closed');
  }
  
  async ping(): Promise<boolean> {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  private async initializeSchema(): Promise<void> {
    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        state TEXT NOT NULL,
        priority TEXT NOT NULL,
        complexity TEXT,
        parent_id TEXT,
        dependencies TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        estimated_hours REAL,
        actual_hours REAL,
        assignee TEXT,
        due_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        metadata TEXT DEFAULT '{}',
        deleted_at TEXT,
        
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
      )
    `;
    
    const createQueuesTable = `
      CREATE TABLE IF NOT EXISTS task_queues (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        tasks TEXT DEFAULT '[]',
        max_concurrent_tasks INTEGER DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;
    
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at)'
    ];
    
    this.db.exec(createTasksTable);
    this.db.exec(createQueuesTable);
    
    for (const index of createIndexes) {
      this.db.exec(index);
    }
    
    logger.info('SQLite schema initialized');
  }
  
  // Task operations implementation similar to PostgreSQL but adapted for SQLite
  async createTask(task: Task, transaction?: DatabaseTransaction): Promise<Task> {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, title, description, state, priority, complexity, parent_id,
        dependencies, tags, estimated_hours, actual_hours, assignee,
        due_date, created_at, updated_at, completed_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const values = [
      task.id, task.title, task.description, task.state, task.priority,
      task.complexity, task.parentId, JSON.stringify(task.dependencies),
      JSON.stringify(task.tags), task.estimatedHours, task.actualHours,
      task.assignee, task.dueDate?.toISOString(), task.createdAt.toISOString(), 
      task.updatedAt.toISOString(), task.completedAt?.toISOString(), 
      JSON.stringify(task.metadata)
    ];
    
    if (transaction) {
      // Execute within transaction context
      (transaction as any).run(stmt, values);
    } else {
      stmt.run(values);
    }
    
    return task;
  }
  
  async getTask(id: string): Promise<Task | null> {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL');
    const row = stmt.get(id);
    
    if (!row) {
      return null;
    }
    
    return this.mapRowToTask(row);
  }
  
  // Additional SQLite-specific implementations would follow the same pattern...
  // For brevity, implementing key methods that differ from PostgreSQL
  
  async listTasks(options: QueryOptions = {}): Promise<Task[]> {
    let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL';
    const params: any[] = [];
    
    // Apply basic filtering (SQLite doesn't have array operators like PostgreSQL)
    if (options.filter?.state && options.filter.state.length > 0) {
      const placeholders = options.filter.state.map(() => '?').join(',');
      query += ` AND state IN (${placeholders})`;
      params.push(...options.filter.state);
    }
    
    if (options.filter?.priority && options.filter.priority.length > 0) {
      const placeholders = options.filter.priority.map(() => '?').join(',');
      query += ` AND priority IN (${placeholders})`;
      params.push(...options.filter.priority);
    }
    
    // Apply sorting
    if (options.sort) {
      const sortColumn = this.camelToSnakeCase(options.sort.field);
      query += ` ORDER BY ${sortColumn} ${options.sort.direction.toUpperCase()}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    // Apply pagination
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(params);
    
    return rows.map(row => this.mapRowToTask(row));
  }
  
  async getTaskStatistics(): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN state = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN state = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN state = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN state = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority,
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical_priority,
        SUM(CASE WHEN due_date < datetime('now') AND state NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue
      FROM tasks 
      WHERE deleted_at IS NULL
    `);
    
    return stmt.get();
  }
  
  async beginTransaction(): Promise<DatabaseTransaction> {
    this.db.exec('BEGIN');
    
    const transaction: DatabaseTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: new Date(),
      operations: [],
      
      async rollback(): Promise<void> {
        this.db.exec('ROLLBACK');
      },
      
      async commit(): Promise<void> {
        this.db.exec('COMMIT');
      }
    };
    
    // Add exec and prepare methods to transaction
    (transaction as any).exec = this.db.exec.bind(this.db);
    (transaction as any).prepare = this.db.prepare.bind(this.db);
    (transaction as any).run = (stmt: any, params: any[]) => stmt.run(params);
    
    return transaction;
  }
  
  // Stub implementations for interface compliance
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> { throw new Error('Not implemented'); }
  async deleteTask(id: string, soft?: boolean): Promise<boolean> { throw new Error('Not implemented'); }
  async createQueue(queue: TaskQueue): Promise<TaskQueue> { throw new Error('Not implemented'); }
  async getQueue(id: string): Promise<TaskQueue | null> { throw new Error('Not implemented'); }
  async updateQueue(id: string, updates: Partial<TaskQueue>): Promise<TaskQueue> { throw new Error('Not implemented'); }
  async deleteQueue(id: string): Promise<boolean> { throw new Error('Not implemented'); }
  async listQueues(options?: QueryOptions): Promise<TaskQueue[]> { throw new Error('Not implemented'); }
  async getTaskDependencies(taskId: string): Promise<Task[]> { throw new Error('Not implemented'); }
  async getTaskDependents(taskId: string): Promise<Task[]> { throw new Error('Not implemented'); }
  async getTasksByState(state: TaskState, options?: QueryOptions): Promise<Task[]> { throw new Error('Not implemented'); }
  async getOverdueTasks(options?: QueryOptions): Promise<Task[]> { throw new Error('Not implemented'); }
  async migrate(): Promise<void> { throw new Error('Not implemented'); }
  async backup(): Promise<string> { throw new Error('Not implemented'); }
  async restore(backupPath: string): Promise<void> { throw new Error('Not implemented'); }
  async vacuum(): Promise<void> { throw new Error('Not implemented'); }
  
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      state: row.state,
      priority: row.priority,
      complexity: row.complexity,
      parentId: row.parent_id,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      estimatedHours: row.estimated_hours,
      actualHours: row.actual_hours,
      assignee: row.assignee,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
  
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

/**
 * MongoDB adapter implementation (basic structure)
 */
export class MongoDBAdapter implements DatabaseAdapter {
  private config: DatabaseConfig;
  private client: any = null;
  private db: any = null;
  
  constructor(config: DatabaseConfig) {
    this.config = config;
  }
  
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid requiring mongodb as a dependency
      const { MongoClient } = await import('mongodb');
      
      this.client = new MongoClient(this.config.connectionString || '', this.config.options);
      await this.client.connect();
      this.db = this.client.db(this.config.database);
      
      logger.info('MongoDB connection established');
      
      // Create indexes
      await this.createIndexes();
    } catch (error) {
      logger.error('Failed to connect to MongoDB', { error });
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
    logger.info('MongoDB connection closed');
  }
  
  async ping(): Promise<boolean> {
    try {
      await this.db.admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  private async createIndexes(): Promise<void> {
    const tasksCollection = this.db.collection('tasks');
    const queuesCollection = this.db.collection('task_queues');
    
    // Create indexes for tasks
    await tasksCollection.createIndex({ state: 1 });
    await tasksCollection.createIndex({ priority: 1 });
    await tasksCollection.createIndex({ parentId: 1 });
    await tasksCollection.createIndex({ assignee: 1 });
    await tasksCollection.createIndex({ dueDate: 1 });
    await tasksCollection.createIndex({ createdAt: 1 });
    await tasksCollection.createIndex({ dependencies: 1 });
    await tasksCollection.createIndex({ tags: 1 });
    await tasksCollection.createIndex({ deletedAt: 1 });
    
    logger.info('MongoDB indexes created');
  }
  
  async createTask(task: Task): Promise<Task> {
    const collection = this.db.collection('tasks');
    await collection.insertOne(task);
    return task;
  }
  
  async getTask(id: string): Promise<Task | null> {
    const collection = this.db.collection('tasks');
    const task = await collection.findOne({ id, deletedAt: { $exists: false } });
    return task ? TaskSchema.parse(task) : null;
  }
  
  // Stub implementations for interface compliance
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> { throw new Error('Not implemented'); }
  async deleteTask(id: string, soft?: boolean): Promise<boolean> { throw new Error('Not implemented'); }
  async listTasks(options?: QueryOptions): Promise<Task[]> { throw new Error('Not implemented'); }
  async createQueue(queue: TaskQueue): Promise<TaskQueue> { throw new Error('Not implemented'); }
  async getQueue(id: string): Promise<TaskQueue | null> { throw new Error('Not implemented'); }
  async updateQueue(id: string, updates: Partial<TaskQueue>): Promise<TaskQueue> { throw new Error('Not implemented'); }
  async deleteQueue(id: string): Promise<boolean> { throw new Error('Not implemented'); }
  async listQueues(options?: QueryOptions): Promise<TaskQueue[]> { throw new Error('Not implemented'); }
  async getTaskDependencies(taskId: string): Promise<Task[]> { throw new Error('Not implemented'); }
  async getTaskDependents(taskId: string): Promise<Task[]> { throw new Error('Not implemented'); }
  async getTasksByState(state: TaskState, options?: QueryOptions): Promise<Task[]> { throw new Error('Not implemented'); }
  async getOverdueTasks(options?: QueryOptions): Promise<Task[]> { throw new Error('Not implemented'); }
  async getTaskStatistics(): Promise<any> { throw new Error('Not implemented'); }
  async beginTransaction(): Promise<DatabaseTransaction> { throw new Error('Not implemented'); }
  async migrate(): Promise<void> { throw new Error('Not implemented'); }
  async backup(): Promise<string> { throw new Error('Not implemented'); }
  async restore(backupPath: string): Promise<void> { throw new Error('Not implemented'); }
  async vacuum(): Promise<void> { throw new Error('Not implemented'); }
}

/**
 * Database manager that provides a unified interface across different providers
 */
export class DatabaseManager extends EventEmitter {
  private adapter: DatabaseAdapter;
  private config: DatabaseConfig;
  private connectionRetries: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  
  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
    this.adapter = this.createAdapter(config);
    this.setupErrorHandling();
  }
  
  private createAdapter(config: DatabaseConfig): DatabaseAdapter {
    switch (config.provider) {
      case 'postgresql':
        return new PostgreSQLAdapter(config);
      case 'sqlite':
        return new SQLiteAdapter(config);
      case 'mongodb':
        return new MongoDBAdapter(config);
      default:
        throw new Error(`Unsupported database provider: ${config.provider}`);
    }
  }
  
  private setupErrorHandling(): void {
    this.adapter.on?.('error', (error: Error) => {
      logger.error('Database adapter error', { error });
      this.emit('error', error);
    });
  }
  
  async connect(): Promise<void> {
    try {
      await this.adapter.connect();
      this.connectionRetries = 0;
      this.emit('connected');
      logger.info('Database connection established');
    } catch (error) {
      this.connectionRetries++;
      
      if (this.connectionRetries < this.maxRetries) {
        logger.warn(`Database connection failed, retrying in ${this.retryDelay}ms`, {
          attempt: this.connectionRetries,
          maxRetries: this.maxRetries
        });
        
        setTimeout(() => this.connect(), this.retryDelay);
        this.retryDelay *= 2; // Exponential backoff
      } else {
        this.emit('connection_failed', error);
        throw error;
      }
    }
  }
  
  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
    this.emit('disconnected');
    logger.info('Database disconnected');
  }
  
  async healthCheck(): Promise<boolean> {
    return await this.adapter.ping();
  }
  
  // Proxy all adapter methods
  async createTask(task: Task, transaction?: DatabaseTransaction): Promise<Task> {
    return await this.adapter.createTask(task, transaction);
  }
  
  async getTask(id: string, transaction?: DatabaseTransaction): Promise<Task | null> {
    return await this.adapter.getTask(id, transaction);
  }
  
  async updateTask(id: string, updates: Partial<Task>, transaction?: DatabaseTransaction): Promise<Task> {
    return await this.adapter.updateTask(id, updates, transaction);
  }
  
  async deleteTask(id: string, soft: boolean = true, transaction?: DatabaseTransaction): Promise<boolean> {
    return await this.adapter.deleteTask(id, soft, transaction);
  }
  
  async listTasks(options?: QueryOptions, transaction?: DatabaseTransaction): Promise<Task[]> {
    return await this.adapter.listTasks(options, transaction);
  }
  
  async createQueue(queue: TaskQueue, transaction?: DatabaseTransaction): Promise<TaskQueue> {
    return await this.adapter.createQueue(queue, transaction);
  }
  
  async getQueue(id: string, transaction?: DatabaseTransaction): Promise<TaskQueue | null> {
    return await this.adapter.getQueue(id, transaction);
  }
  
  async updateQueue(id: string, updates: Partial<TaskQueue>, transaction?: DatabaseTransaction): Promise<TaskQueue> {
    return await this.adapter.updateQueue(id, updates, transaction);
  }
  
  async deleteQueue(id: string, transaction?: DatabaseTransaction): Promise<boolean> {
    return await this.adapter.deleteQueue(id, transaction);
  }
  
  async listQueues(options?: QueryOptions, transaction?: DatabaseTransaction): Promise<TaskQueue[]> {
    return await this.adapter.listQueues(options, transaction);
  }
  
  async getTaskDependencies(taskId: string, transaction?: DatabaseTransaction): Promise<Task[]> {
    return await this.adapter.getTaskDependencies(taskId, transaction);
  }
  
  async getTaskDependents(taskId: string, transaction?: DatabaseTransaction): Promise<Task[]> {
    return await this.adapter.getTaskDependents(taskId, transaction);
  }
  
  async getTasksByState(state: TaskState, options?: QueryOptions): Promise<Task[]> {
    return await this.adapter.getTasksByState(state, options);
  }
  
  async getOverdueTasks(options?: QueryOptions): Promise<Task[]> {
    return await this.adapter.getOverdueTasks(options);
  }
  
  async getTaskStatistics(): Promise<any> {
    return await this.adapter.getTaskStatistics();
  }
  
  async beginTransaction(): Promise<DatabaseTransaction> {
    return await this.adapter.beginTransaction();
  }
  
  async migrate(): Promise<void> {
    await this.adapter.migrate();
  }
  
  async backup(): Promise<string> {
    return await this.adapter.backup();
  }
  
  async restore(backupPath: string): Promise<void> {
    await this.adapter.restore(backupPath);
  }
  
  async vacuum(): Promise<void> {
    await this.adapter.vacuum();
  }
  
  /**
   * Get database provider type
   */
  getProvider(): string {
    return this.config.provider;
  }
  
  /**
   * Get database configuration (without sensitive data)
   */
  getConfig(): Partial<DatabaseConfig> {
    const { password, ...safeConfig } = this.config;
    return safeConfig;
  }
}