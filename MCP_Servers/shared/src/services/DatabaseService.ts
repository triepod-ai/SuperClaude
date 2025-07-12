import { Pool, PoolClient, PoolConfig } from 'pg';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

/**
 * Database connection configuration schema
 */
export const DatabaseConfigSchema = z.object({
  type: z.enum(['postgresql', 'sqlite']),
  postgresql: z.object({
    host: z.string(),
    port: z.number().min(1).max(65535),
    database: z.string(),
    username: z.string(),
    password: z.string(),
    ssl: z.boolean().optional(),
    maxConnections: z.number().min(1).max(100).default(20),
    idleTimeoutMs: z.number().default(30000),
    connectionTimeoutMs: z.number().default(2000)
  }).optional(),
  sqlite: z.object({
    path: z.string(),
    enableWAL: z.boolean().default(true),
    enableForeignKeys: z.boolean().default(true),
    busyTimeoutMs: z.number().default(5000)
  }).optional()
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

/**
 * Database query result interface
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command?: string;
}

/**
 * Database transaction interface
 */
export interface DatabaseTransaction {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

/**
 * Unified database service supporting PostgreSQL and SQLite
 * Provides consistent interface for all SuperClaude MCP servers
 */
export class DatabaseService {
  private config: DatabaseConfig;
  private pgPool?: Pool;
  private sqlite?: Database.Database;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = DatabaseConfigSchema.parse(config);
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      if (this.config.type === 'postgresql') {
        await this.connectPostgreSQL();
      } else {
        await this.connectSQLite();
      }
      
      this.isConnected = true;
      logger.info(`Database connected successfully (${this.config.type})`);
    } catch (error) {
      logger.error('Failed to connect to database', { error: error.message });
      throw error;
    }
  }

  /**
   * Connect to PostgreSQL
   */
  private async connectPostgreSQL(): Promise<void> {
    if (!this.config.postgresql) {
      throw new Error('PostgreSQL configuration not provided');
    }

    const poolConfig: PoolConfig = {
      host: this.config.postgresql.host,
      port: this.config.postgresql.port,
      database: this.config.postgresql.database,
      user: this.config.postgresql.username,
      password: this.config.postgresql.password,
      ssl: this.config.postgresql.ssl,
      max: this.config.postgresql.maxConnections,
      idleTimeoutMillis: this.config.postgresql.idleTimeoutMs,
      connectionTimeoutMillis: this.config.postgresql.connectionTimeoutMs
    };

    this.pgPool = new Pool(poolConfig);

    // Test connection
    const client = await this.pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
  }

  /**
   * Connect to SQLite
   */
  private async connectSQLite(): Promise<void> {
    if (!this.config.sqlite) {
      throw new Error('SQLite configuration not provided');
    }

    this.sqlite = new Database(this.config.sqlite.path);

    // Configure SQLite options
    if (this.config.sqlite.enableWAL) {
      this.sqlite.pragma('journal_mode = WAL');
    }

    if (this.config.sqlite.enableForeignKeys) {
      this.sqlite.pragma('foreign_keys = ON');
    }

    this.sqlite.pragma(`busy_timeout = ${this.config.sqlite.busyTimeoutMs}`);

    // Test connection
    this.sqlite.prepare('SELECT 1').get();
  }

  /**
   * Execute a query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      if (this.config.type === 'postgresql') {
        return await this.queryPostgreSQL<T>(sql, params);
      } else {
        return await this.querySQLite<T>(sql, params);
      }
    } catch (error) {
      logger.error('Database query failed', { 
        sql: sql.substring(0, 100), 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Execute PostgreSQL query
   */
  private async queryPostgreSQL<T>(sql: string, params: any[]): Promise<QueryResult<T>> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const client = await this.pgPool.connect();
    try {
      const result = await client.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute SQLite query
   */
  private async querySQLite<T>(sql: string, params: any[]): Promise<QueryResult<T>> {
    if (!this.sqlite) {
      throw new Error('SQLite database not initialized');
    }

    const isSelect = sql.trim().toLowerCase().startsWith('select');
    
    if (isSelect) {
      const stmt = this.sqlite.prepare(sql);
      const rows = stmt.all(...params) as T[];
      return {
        rows,
        rowCount: rows.length
      };
    } else {
      const stmt = this.sqlite.prepare(sql);
      const result = stmt.run(...params);
      return {
        rows: [],
        rowCount: result.changes || 0
      };
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<DatabaseTransaction> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    if (this.config.type === 'postgresql') {
      return await this.beginPostgreSQLTransaction();
    } else {
      return await this.beginSQLiteTransaction();
    }
  }

  /**
   * Begin PostgreSQL transaction
   */
  private async beginPostgreSQLTransaction(): Promise<DatabaseTransaction> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const client = await this.pgPool.connect();
    await client.query('BEGIN');

    return {
      async query<T>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        const result = await client.query(sql, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount || 0,
          command: result.command
        };
      },

      async rollback(): Promise<void> {
        try {
          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      },

      async commit(): Promise<void> {
        try {
          await client.query('COMMIT');
        } finally {
          client.release();
        }
      }
    };
  }

  /**
   * Begin SQLite transaction
   */
  private async beginSQLiteTransaction(): Promise<DatabaseTransaction> {
    if (!this.sqlite) {
      throw new Error('SQLite database not initialized');
    }

    const transaction = this.sqlite.transaction(() => {});
    transaction.immediate();

    return {
      async query<T>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        const isSelect = sql.trim().toLowerCase().startsWith('select');
        
        if (isSelect) {
          const stmt = this.sqlite!.prepare(sql);
          const rows = stmt.all(...params) as T[];
          return {
            rows,
            rowCount: rows.length
          };
        } else {
          const stmt = this.sqlite!.prepare(sql);
          const result = stmt.run(...params);
          return {
            rows: [],
            rowCount: result.changes || 0
          };
        }
      },

      async rollback(): Promise<void> {
        transaction.rollback();
      },

      async commit(): Promise<void> {
        transaction.commit();
      }
    };
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction(
    queries: Array<{ sql: string; params?: any[] }>
  ): Promise<QueryResult[]> {
    const transaction = await this.beginTransaction();
    
    try {
      const results: QueryResult[] = [];
      
      for (const query of queries) {
        const result = await transaction.query(query.sql, query.params || []);
        results.push(result);
      }
      
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check if database is connected and healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.config.type === 'postgresql') {
        await this.query('SELECT 1');
      } else {
        await this.query('SELECT 1');
      }
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    try {
      if (this.config.type === 'postgresql' && this.pgPool) {
        return {
          type: 'postgresql',
          totalCount: this.pgPool.totalCount,
          idleCount: this.pgPool.idleCount,
          waitingCount: this.pgPool.waitingCount
        };
      } else if (this.config.type === 'sqlite' && this.sqlite) {
        return {
          type: 'sqlite',
          open: this.sqlite.open,
          inTransaction: this.sqlite.inTransaction,
          memory: this.sqlite.memory
        };
      }
      
      return { type: this.config.type, connected: this.isConnected };
    } catch (error) {
      logger.error('Failed to get database stats', { error: error.message });
      return { type: this.config.type, connected: false, error: error.message };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      if (this.pgPool) {
        await this.pgPool.end();
        this.pgPool = undefined;
      }
      
      if (this.sqlite) {
        this.sqlite.close();
        this.sqlite = undefined;
      }
      
      this.isConnected = false;
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection', { error: error.message });
      throw error;
    }
  }

  /**
   * Create database tables for SuperClaude MCP servers
   */
  async initializeTables(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const tables = this.getTableDefinitions();
    
    for (const table of tables) {
      try {
        await this.query(table.sql);
        logger.info(`Table created/verified: ${table.name}`);
      } catch (error) {
        logger.error(`Failed to create table ${table.name}`, { error: error.message });
        throw error;
      }
    }
  }

  /**
   * Get table definitions for both PostgreSQL and SQLite
   */
  private getTableDefinitions(): Array<{ name: string; sql: string }> {
    const isPostgreSQL = this.config.type === 'postgresql';
    
    return [
      // Tasks table
      {
        name: 'tasks',
        sql: `
          CREATE TABLE IF NOT EXISTS tasks (
            id ${isPostgreSQL ? 'UUID PRIMARY KEY' : 'TEXT PRIMARY KEY'},
            title TEXT NOT NULL,
            description TEXT,
            state TEXT NOT NULL,
            priority TEXT NOT NULL,
            complexity TEXT,
            assignee TEXT,
            parent_id ${isPostgreSQL ? 'UUID REFERENCES tasks(id)' : 'TEXT REFERENCES tasks(id)'},
            dependencies ${isPostgreSQL ? 'UUID[]' : 'TEXT'}, -- JSON array for SQLite
            tags ${isPostgreSQL ? 'TEXT[]' : 'TEXT'}, -- JSON array for SQLite
            due_date ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'},
            created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
            updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
            completed_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'},
            metadata ${isPostgreSQL ? 'JSONB' : 'TEXT'} -- JSON text for SQLite
          )
        `
      },
      
      // Task queues table
      {
        name: 'task_queues',
        sql: `
          CREATE TABLE IF NOT EXISTS task_queues (
            id ${isPostgreSQL ? 'UUID PRIMARY KEY' : 'TEXT PRIMARY KEY'},
            name TEXT NOT NULL,
            description TEXT,
            max_concurrent_tasks INTEGER NOT NULL DEFAULT 3,
            created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
            updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
          )
        `
      },
      
      // Queue tasks relationship table
      {
        name: 'queue_tasks',
        sql: `
          CREATE TABLE IF NOT EXISTS queue_tasks (
            queue_id ${isPostgreSQL ? 'UUID REFERENCES task_queues(id) ON DELETE CASCADE' : 'TEXT REFERENCES task_queues(id) ON DELETE CASCADE'},
            task_id ${isPostgreSQL ? 'UUID REFERENCES tasks(id) ON DELETE CASCADE' : 'TEXT REFERENCES tasks(id) ON DELETE CASCADE'},
            added_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
            PRIMARY KEY (queue_id, task_id)
          )
        `
      },
      
      // Performance metrics table
      {
        name: 'performance_metrics',
        sql: `
          CREATE TABLE IF NOT EXISTS performance_metrics (
            id ${isPostgreSQL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
            server_name TEXT NOT NULL,
            operation_type TEXT NOT NULL,
            operation_id TEXT,
            start_time ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL,
            end_time ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'},
            duration_ms INTEGER,
            cpu_usage_percent REAL,
            memory_usage_bytes BIGINT,
            success BOOLEAN NOT NULL DEFAULT true,
            error_message TEXT,
            metadata ${isPostgreSQL ? 'JSONB' : 'TEXT'}, -- JSON text for SQLite
            created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
          )
        `
      },
      
      // Configuration table
      {
        name: 'configuration',
        sql: `
          CREATE TABLE IF NOT EXISTS configuration (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            environment TEXT NOT NULL DEFAULT 'development',
            description TEXT,
            created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
            updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
          )
        `
      },
      
      // Session state table
      {
        name: 'session_state',
        sql: `
          CREATE TABLE IF NOT EXISTS session_state (
            session_id TEXT PRIMARY KEY,
            user_id TEXT,
            server_name TEXT NOT NULL,
            state_data ${isPostgreSQL ? 'JSONB' : 'TEXT'} NOT NULL, -- JSON text for SQLite
            last_activity ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
            expires_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'},
            created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
          )
        `
      }
    ];
  }

  /**
   * Create database indexes for optimal performance
   */
  async createIndexes(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
      'CREATE INDEX IF NOT EXISTS idx_performance_metrics_server_name ON performance_metrics(server_name)',
      'CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation_type ON performance_metrics(operation_type)',
      'CREATE INDEX IF NOT EXISTS idx_performance_metrics_start_time ON performance_metrics(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_session_state_server_name ON session_state(server_name)',
      'CREATE INDEX IF NOT EXISTS idx_session_state_last_activity ON session_state(last_activity)',
      'CREATE INDEX IF NOT EXISTS idx_configuration_environment ON configuration(environment)'
    ];

    for (const indexSql of indexes) {
      try {
        await this.query(indexSql);
      } catch (error) {
        logger.warn('Failed to create index', { 
          sql: indexSql.substring(0, 50),
          error: error.message 
        });
      }
    }

    logger.info('Database indexes created/verified');
  }
}

/**
 * Database service singleton for shared access
 */
export class DatabaseServiceManager {
  private static instance: DatabaseService | null = null;
  private static config: DatabaseConfig | null = null;

  /**
   * Initialize database service with configuration
   */
  static async initialize(config: DatabaseConfig): Promise<DatabaseService> {
    if (this.instance) {
      await this.instance.close();
    }

    this.config = config;
    this.instance = new DatabaseService(config);
    await this.instance.connect();
    await this.instance.initializeTables();
    await this.instance.createIndexes();

    return this.instance;
  }

  /**
   * Get current database service instance
   */
  static getInstance(): DatabaseService {
    if (!this.instance) {
      throw new Error('DatabaseService not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  /**
   * Check if database service is initialized
   */
  static isInitialized(): boolean {
    return this.instance !== null;
  }

  /**
   * Close database service
   */
  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
      this.config = null;
    }
  }
}