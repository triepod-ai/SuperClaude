import { DatabaseService, DatabaseServiceManager } from './DatabaseService.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Configuration value types
 */
export type ConfigValue = string | number | boolean | object | null;

/**
 * Configuration entry interface
 */
export interface ConfigurationEntry {
  key: string;
  value: ConfigValue;
  environment: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Environment-specific configuration schema
 */
export const EnvironmentConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production', 'test']),
  database: z.object({
    type: z.enum(['postgresql', 'sqlite']),
    postgresql: z.object({
      host: z.string(),
      port: z.number(),
      database: z.string(),
      username: z.string(),
      password: z.string(),
      ssl: z.boolean().default(false),
      maxConnections: z.number().default(20)
    }).optional(),
    sqlite: z.object({
      path: z.string(),
      enableWAL: z.boolean().default(true)
    }).optional()
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'text']).default('json'),
    destination: z.enum(['console', 'file', 'both']).default('console'),
    fileOptions: z.object({
      path: z.string(),
      maxFiles: z.number().default(5),
      maxSize: z.string().default('10MB')
    }).optional()
  }),
  performance: z.object({
    metricsEnabled: z.boolean().default(true),
    metricsRetentionDays: z.number().default(30),
    enableProfiling: z.boolean().default(false),
    profileSampleRate: z.number().min(0).max(1).default(0.1)
  }),
  security: z.object({
    enableRateLimit: z.boolean().default(true),
    rateLimitRequests: z.number().default(100),
    rateLimitWindow: z.number().default(15), // minutes
    enableCors: z.boolean().default(true),
    corsOrigins: z.array(z.string()).default(['*']),
    enableAuth: z.boolean().default(false),
    authSecret: z.string().optional()
  }),
  features: z.object({
    enableTaskPersistence: z.boolean().default(true),
    enablePerformanceMetrics: z.boolean().default(true),
    enableHealthChecks: z.boolean().default(true),
    enableApiDocs: z.boolean().default(true),
    maxConcurrentOperations: z.number().default(10),
    operationTimeoutMs: z.number().default(30000)
  }),
  mcp: z.object({
    servers: z.record(z.object({
      enabled: z.boolean().default(true),
      host: z.string().default('localhost'),
      port: z.number(),
      timeout: z.number().default(5000),
      retries: z.number().default(3),
      healthCheckInterval: z.number().default(30000)
    }))
  })
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

/**
 * Configuration service with environment-specific support and database persistence
 */
export class ConfigurationService {
  private db: DatabaseService;
  private environment: string;
  private configCache = new Map<string, ConfigValue>();
  private configPath?: string;
  private fileConfig?: EnvironmentConfig;

  constructor(environment: string = 'development', db?: DatabaseService) {
    this.environment = environment;
    this.db = db || DatabaseServiceManager.getInstance();
  }

  /**
   * Initialize configuration service
   */
  async initialize(configPath?: string): Promise<void> {
    this.configPath = configPath;
    
    // Load from file if provided
    if (configPath) {
      await this.loadFromFile(configPath);
    }

    // Load from database
    await this.loadFromDatabase();
    
    // Apply defaults
    await this.applyDefaults();

    logger.info('Configuration service initialized', {
      environment: this.environment,
      configPath: this.configPath,
      cacheSize: this.configCache.size
    });
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(configPath: string): Promise<void> {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const rawConfig = JSON.parse(configContent);
      
      // Validate configuration
      this.fileConfig = EnvironmentConfigSchema.parse(rawConfig);
      
      // Flatten configuration for caching
      this.flattenConfig(this.fileConfig, '', this.configCache);
      
      logger.info('Configuration loaded from file', { configPath });
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn('Configuration file not found, using defaults', { configPath });
      } else {
        logger.error('Failed to load configuration from file', {
          configPath,
          error: error.message
        });
        throw error;
      }
    }
  }

  /**
   * Load configuration from database
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      const sql = 'SELECT key, value FROM configuration WHERE environment = ?';
      const result = await this.db.query<{ key: string; value: string }>(sql, [this.environment]);
      
      for (const row of result.rows) {
        try {
          const value = JSON.parse(row.value);
          this.configCache.set(row.key, value);
        } catch {
          // Store as string if not valid JSON
          this.configCache.set(row.key, row.value);
        }
      }
      
      logger.debug('Configuration loaded from database', {
        environment: this.environment,
        entryCount: result.rows.length
      });
    } catch (error) {
      logger.error('Failed to load configuration from database', {
        environment: this.environment,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Apply default configuration values
   */
  private async applyDefaults(): Promise<void> {
    const defaults: Record<string, ConfigValue> = {
      'logging.level': 'info',
      'logging.format': 'json',
      'logging.destination': 'console',
      'performance.metricsEnabled': true,
      'performance.metricsRetentionDays': 30,
      'performance.enableProfiling': false,
      'performance.profileSampleRate': 0.1,
      'security.enableRateLimit': true,
      'security.rateLimitRequests': 100,
      'security.rateLimitWindow': 15,
      'security.enableCors': true,
      'security.corsOrigins': ['*'],
      'security.enableAuth': false,
      'features.enableTaskPersistence': true,
      'features.enablePerformanceMetrics': true,
      'features.enableHealthChecks': true,
      'features.enableApiDocs': true,
      'features.maxConcurrentOperations': 10,
      'features.operationTimeoutMs': 30000
    };

    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!this.configCache.has(key)) {
        this.configCache.set(key, defaultValue);
      }
    }
  }

  /**
   * Get configuration value
   */
  get<T = ConfigValue>(key: string, defaultValue?: T): T {
    const value = this.configCache.get(key);
    
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration key not found: ${key}`);
    }
    
    return value as T;
  }

  /**
   * Get configuration value with type checking
   */
  getString(key: string, defaultValue?: string): string {
    const value = this.get(key, defaultValue);
    if (typeof value !== 'string') {
      throw new Error(`Configuration key ${key} is not a string`);
    }
    return value;
  }

  getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key, defaultValue);
    if (typeof value !== 'number') {
      throw new Error(`Configuration key ${key} is not a number`);
    }
    return value;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key, defaultValue);
    if (typeof value !== 'boolean') {
      throw new Error(`Configuration key ${key} is not a boolean`);
    }
    return value;
  }

  getObject<T = object>(key: string, defaultValue?: T): T {
    const value = this.get(key, defaultValue);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Configuration key ${key} is not an object`);
    }
    return value as T;
  }

  getArray<T = any>(key: string, defaultValue?: T[]): T[] {
    const value = this.get(key, defaultValue);
    if (!Array.isArray(value)) {
      throw new Error(`Configuration key ${key} is not an array`);
    }
    return value;
  }

  /**
   * Set configuration value (in memory and database)
   */
  async set(key: string, value: ConfigValue, description?: string): Promise<void> {
    try {
      // Update cache
      this.configCache.set(key, value);
      
      // Update database
      const sql = `
        INSERT OR REPLACE INTO configuration (key, value, environment, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const now = new Date().toISOString();
      const params = [
        key,
        JSON.stringify(value),
        this.environment,
        description,
        now,
        now
      ];
      
      await this.db.query(sql, params);
      
      logger.debug('Configuration value updated', { 
        key, 
        environment: this.environment,
        hasDescription: !!description 
      });
    } catch (error) {
      logger.error('Failed to set configuration value', {
        key,
        environment: this.environment,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete configuration value
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from cache
      this.configCache.delete(key);
      
      // Remove from database
      const sql = 'DELETE FROM configuration WHERE key = ? AND environment = ?';
      await this.db.query(sql, [key, this.environment]);
      
      logger.debug('Configuration value deleted', { key, environment: this.environment });
    } catch (error) {
      logger.error('Failed to delete configuration value', {
        key,
        environment: this.environment,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all configuration entries
   */
  async getAllEntries(): Promise<ConfigurationEntry[]> {
    try {
      const sql = 'SELECT * FROM configuration WHERE environment = ? ORDER BY key';
      const result = await this.db.query<any>(sql, [this.environment]);
      
      return result.rows.map(row => ({
        key: row.key,
        value: this.parseValue(row.value),
        environment: row.environment,
        description: row.description,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error('Failed to get all configuration entries', {
        environment: this.environment,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get configuration keys matching pattern
   */
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.configCache.keys());
    
    if (!pattern) {
      return keys;
    }
    
    const regex = new RegExp(pattern);
    return keys.filter(key => regex.test(key));
  }

  /**
   * Check if configuration key exists
   */
  has(key: string): boolean {
    return this.configCache.has(key);
  }

  /**
   * Get environment-specific database configuration
   */
  getDatabaseConfig(): any {
    const dbType = this.getString('database.type', 'sqlite');
    
    if (dbType === 'postgresql') {
      return {
        type: 'postgresql',
        postgresql: {
          host: this.getString('database.postgresql.host'),
          port: this.getNumber('database.postgresql.port'),
          database: this.getString('database.postgresql.database'),
          username: this.getString('database.postgresql.username'),
          password: this.getString('database.postgresql.password'),
          ssl: this.getBoolean('database.postgresql.ssl', false),
          maxConnections: this.getNumber('database.postgresql.maxConnections', 20)
        }
      };
    } else {
      return {
        type: 'sqlite',
        sqlite: {
          path: this.getString('database.sqlite.path', `./data/${this.environment}.db`),
          enableWAL: this.getBoolean('database.sqlite.enableWAL', true)
        }
      };
    }
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig(): any {
    return {
      level: this.getString('logging.level', 'info'),
      format: this.getString('logging.format', 'json'),
      destination: this.getString('logging.destination', 'console'),
      fileOptions: this.has('logging.fileOptions') ? this.getObject('logging.fileOptions') : undefined
    };
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig(): any {
    return {
      metricsEnabled: this.getBoolean('performance.metricsEnabled', true),
      metricsRetentionDays: this.getNumber('performance.metricsRetentionDays', 30),
      enableProfiling: this.getBoolean('performance.enableProfiling', false),
      profileSampleRate: this.getNumber('performance.profileSampleRate', 0.1)
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): any {
    return {
      enableRateLimit: this.getBoolean('security.enableRateLimit', true),
      rateLimitRequests: this.getNumber('security.rateLimitRequests', 100),
      rateLimitWindow: this.getNumber('security.rateLimitWindow', 15),
      enableCors: this.getBoolean('security.enableCors', true),
      corsOrigins: this.getArray('security.corsOrigins', ['*']),
      enableAuth: this.getBoolean('security.enableAuth', false),
      authSecret: this.has('security.authSecret') ? this.getString('security.authSecret') : undefined
    };
  }

  /**
   * Get feature flags configuration
   */
  getFeatureConfig(): any {
    return {
      enableTaskPersistence: this.getBoolean('features.enableTaskPersistence', true),
      enablePerformanceMetrics: this.getBoolean('features.enablePerformanceMetrics', true),
      enableHealthChecks: this.getBoolean('features.enableHealthChecks', true),
      enableApiDocs: this.getBoolean('features.enableApiDocs', true),
      maxConcurrentOperations: this.getNumber('features.maxConcurrentOperations', 10),
      operationTimeoutMs: this.getNumber('features.operationTimeoutMs', 30000)
    };
  }

  /**
   * Get MCP servers configuration
   */
  getMCPConfig(): Record<string, any> {
    return this.getObject('mcp.servers', {});
  }

  /**
   * Reload configuration from file and database
   */
  async reload(): Promise<void> {
    this.configCache.clear();
    await this.initialize(this.configPath);
    
    logger.info('Configuration reloaded', {
      environment: this.environment,
      cacheSize: this.configCache.size
    });
  }

  /**
   * Export configuration to file
   */
  async exportToFile(filePath: string): Promise<void> {
    try {
      const entries = await this.getAllEntries();
      const config = this.unflattenConfig(entries);
      
      await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
      
      logger.info('Configuration exported to file', { filePath });
    } catch (error) {
      logger.error('Failed to export configuration to file', {
        filePath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get configuration statistics
   */
  getStats(): any {
    return {
      environment: this.environment,
      totalEntries: this.configCache.size,
      configPath: this.configPath,
      hasFileConfig: !!this.fileConfig,
      keysByPrefix: this.getKeysByPrefix()
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Flatten nested configuration object
   */
  private flattenConfig(
    obj: any, 
    prefix: string = '', 
    target: Map<string, ConfigValue>
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenConfig(value, fullKey, target);
      } else {
        target.set(fullKey, value);
      }
    }
  }

  /**
   * Unflatten configuration entries back to nested object
   */
  private unflattenConfig(entries: ConfigurationEntry[]): any {
    const result: any = {};
    
    for (const entry of entries) {
      const keys = entry.key.split('.');
      let current = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = entry.value;
    }
    
    return result;
  }

  /**
   * Parse configuration value from string
   */
  private parseValue(value: string): ConfigValue {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Get keys grouped by prefix
   */
  private getKeysByPrefix(): Record<string, number> {
    const prefixes: Record<string, number> = {};
    
    for (const key of this.configCache.keys()) {
      const prefix = key.split('.')[0];
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    }
    
    return prefixes;
  }
}

/**
 * Configuration service singleton for shared access
 */
export class ConfigurationServiceManager {
  private static instance: ConfigurationService | null = null;
  private static environment: string = 'development';

  /**
   * Initialize configuration service
   */
  static async initialize(
    environment: string = 'development',
    configPath?: string,
    db?: DatabaseService
  ): Promise<ConfigurationService> {
    this.environment = environment;
    this.instance = new ConfigurationService(environment, db);
    await this.instance.initialize(configPath);
    return this.instance;
  }

  /**
   * Get current configuration service instance
   */
  static getInstance(): ConfigurationService {
    if (!this.instance) {
      throw new Error('ConfigurationService not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  /**
   * Check if configuration service is initialized
   */
  static isInitialized(): boolean {
    return this.instance !== null;
  }

  /**
   * Get current environment
   */
  static getEnvironment(): string {
    return this.environment;
  }
}