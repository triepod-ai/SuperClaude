import { DatabaseService, DatabaseServiceManager } from './DatabaseService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Performance metric entity interface
 */
export interface PerformanceMetric {
  id?: number;
  server_name: string;
  operation_type: string;
  operation_id?: string;
  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  cpu_usage_percent?: number;
  memory_usage_bytes?: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

/**
 * Performance analytics interface
 */
export interface PerformanceAnalytics {
  serverName: string;
  operationType?: string;
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  p95Duration: number;
  p99Duration: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
  operationsPerHour: number;
  errorRate: number;
  topErrors: Array<{ error: string; count: number }>;
  performanceTrend: Array<{
    timestamp: Date;
    averageDuration: number;
    successRate: number;
    operationCount: number;
  }>;
}

/**
 * Time-series performance data
 */
export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Performance metrics storage service with time-series capabilities
 * Provides comprehensive performance tracking and analytics
 */
export class PerformanceMetricsStorage {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || DatabaseServiceManager.getInstance();
  }

  // ==================== METRIC RECORDING ====================

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetric, 'id' | 'created_at'>): Promise<PerformanceMetric> {
    try {
      const now = new Date();
      const metricEntity: PerformanceMetric = {
        ...metric,
        created_at: now
      };

      const sql = `
        INSERT INTO performance_metrics (
          server_name, operation_type, operation_id, start_time, end_time,
          duration_ms, cpu_usage_percent, memory_usage_bytes, success,
          error_message, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        metricEntity.server_name,
        metricEntity.operation_type,
        metricEntity.operation_id,
        metricEntity.start_time.toISOString(),
        metricEntity.end_time?.toISOString(),
        metricEntity.duration_ms,
        metricEntity.cpu_usage_percent,
        metricEntity.memory_usage_bytes,
        metricEntity.success,
        metricEntity.error_message,
        metricEntity.metadata ? JSON.stringify(metricEntity.metadata) : null,
        metricEntity.created_at.toISOString()
      ];

      const result = await this.db.query(sql, params);
      
      // Get the inserted ID (implementation depends on database type)
      if (result.rowCount && result.rowCount > 0) {
        logger.debug('Performance metric recorded', {
          serverName: metricEntity.server_name,
          operationType: metricEntity.operation_type,
          duration: metricEntity.duration_ms
        });
      }

      return metricEntity;
    } catch (error) {
      logger.error('Failed to record performance metric', {
        serverName: metric.server_name,
        operationType: metric.operation_type,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start recording an operation (returns operation ID for completion)
   */
  async startOperation(
    serverName: string,
    operationType: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const operationId = uuidv4();
    const startTime = new Date();

    try {
      await this.recordMetric({
        server_name: serverName,
        operation_type: operationType,
        operation_id: operationId,
        start_time: startTime,
        success: true, // Will be updated on completion
        metadata
      });

      return operationId;
    } catch (error) {
      logger.error('Failed to start operation recording', {
        serverName,
        operationType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Complete operation recording
   */
  async completeOperation(
    operationId: string,
    success: boolean,
    errorMessage?: string,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    try {
      const endTime = new Date();

      // Get the start metric
      const sql = 'SELECT * FROM performance_metrics WHERE operation_id = ? ORDER BY created_at DESC LIMIT 1';
      const result = await this.db.query<any>(sql, [operationId]);

      if (result.rows.length === 0) {
        logger.warn('Operation not found for completion', { operationId });
        return;
      }

      const startMetric = result.rows[0];
      const startTime = new Date(startMetric.start_time);
      const duration = endTime.getTime() - startTime.getTime();

      // Get current system metrics
      const cpuUsage = this.getCurrentCpuUsage();
      const memoryUsage = this.getCurrentMemoryUsage();

      // Update the metric
      const updateSql = `
        UPDATE performance_metrics SET
          end_time = ?, duration_ms = ?, cpu_usage_percent = ?, memory_usage_bytes = ?,
          success = ?, error_message = ?, metadata = ?
        WHERE operation_id = ?
      `;

      const existingMetadata = startMetric.metadata ? JSON.parse(startMetric.metadata) : {};
      const updatedMetadata = { ...existingMetadata, ...additionalMetadata };

      const params = [
        endTime.toISOString(),
        duration,
        cpuUsage,
        memoryUsage,
        success,
        errorMessage,
        JSON.stringify(updatedMetadata),
        operationId
      ];

      await this.db.query(updateSql, params);

      logger.debug('Operation completed', {
        operationId,
        duration,
        success,
        cpuUsage,
        memoryUsage
      });
    } catch (error) {
      logger.error('Failed to complete operation recording', {
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  // ==================== METRIC RETRIEVAL ====================

  /**
   * Get performance metrics with filtering
   */
  async getMetrics(
    filters: {
      serverName?: string;
      operationType?: string;
      success?: boolean;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ metrics: PerformanceMetric[]; total: number }> {
    try {
      // Build WHERE clause
      const whereClauses: string[] = [];
      const params: any[] = [];

      if (filters.serverName) {
        whereClauses.push('server_name = ?');
        params.push(filters.serverName);
      }

      if (filters.operationType) {
        whereClauses.push('operation_type = ?');
        params.push(filters.operationType);
      }

      if (filters.success !== undefined) {
        whereClauses.push('success = ?');
        params.push(filters.success);
      }

      if (filters.startTime) {
        whereClauses.push('start_time >= ?');
        params.push(filters.startTime.toISOString());
      }

      if (filters.endTime) {
        whereClauses.push('start_time <= ?');
        params.push(filters.endTime.toISOString());
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM performance_metrics ${whereClause}`;
      const countResult = await this.db.query<{ total: number }>(countSql, params);
      const total = countResult.rows[0]?.total || 0;

      // Get metrics with pagination
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;
      const metricsSql = `
        SELECT * FROM performance_metrics ${whereClause}
        ORDER BY start_time DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const metricsResult = await this.db.query<any>(metricsSql, params);
      const metrics = metricsResult.rows.map(row => this.mapRowToMetric(row));

      return { metrics, total };
    } catch (error) {
      logger.error('Failed to get performance metrics', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive performance analytics
   */
  async getAnalytics(
    serverName: string,
    operationType?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<PerformanceAnalytics> {
    try {
      const whereClauses = ['server_name = ?'];
      const params = [serverName];

      if (operationType) {
        whereClauses.push('operation_type = ?');
        params.push(operationType);
      }

      if (timeRange) {
        whereClauses.push('start_time >= ? AND start_time <= ?');
        params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
      }

      const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

      // Run multiple analytics queries
      const [
        totalOpsResult,
        successRateResult,
        durationStatsResult,
        cpuStatsResult,
        memoryStatsResult,
        errorStatsResult,
        trendResult
      ] = await Promise.all([
        // Total operations
        this.db.query<{ count: number }>(`
          SELECT COUNT(*) as count FROM performance_metrics ${whereClause}
        `, params),

        // Success rate
        this.db.query<{ success_rate: number }>(`
          SELECT 
            CAST(SUM(CASE WHEN success = true THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 as success_rate
          FROM performance_metrics ${whereClause}
        `, params),

        // Duration statistics
        this.db.query<{ avg_duration: number; p95_duration: number; p99_duration: number }>(`
          SELECT 
            AVG(duration_ms) as avg_duration,
            (SELECT duration_ms FROM performance_metrics ${whereClause} AND duration_ms IS NOT NULL ORDER BY duration_ms LIMIT 1 OFFSET (SELECT COUNT(*) * 0.95 FROM performance_metrics ${whereClause} AND duration_ms IS NOT NULL)) as p95_duration,
            (SELECT duration_ms FROM performance_metrics ${whereClause} AND duration_ms IS NOT NULL ORDER BY duration_ms LIMIT 1 OFFSET (SELECT COUNT(*) * 0.99 FROM performance_metrics ${whereClause} AND duration_ms IS NOT NULL)) as p99_duration
          FROM performance_metrics ${whereClause} AND duration_ms IS NOT NULL
        `, params),

        // CPU statistics
        this.db.query<{ avg_cpu: number }>(`
          SELECT AVG(cpu_usage_percent) as avg_cpu
          FROM performance_metrics ${whereClause} AND cpu_usage_percent IS NOT NULL
        `, params),

        // Memory statistics
        this.db.query<{ avg_memory: number }>(`
          SELECT AVG(memory_usage_bytes) as avg_memory
          FROM performance_metrics ${whereClause} AND memory_usage_bytes IS NOT NULL
        `, params),

        // Error statistics
        this.db.query<{ error: string; count: number }>(`
          SELECT error_message as error, COUNT(*) as count
          FROM performance_metrics ${whereClause} AND success = false AND error_message IS NOT NULL
          GROUP BY error_message
          ORDER BY count DESC
          LIMIT 10
        `, params),

        // Performance trend (hourly aggregation)
        this.db.query<{
          hour: string;
          avg_duration: number;
          success_rate: number;
          operation_count: number;
        }>(`
          SELECT 
            strftime('%Y-%m-%d %H:00:00', start_time) as hour,
            AVG(duration_ms) as avg_duration,
            CAST(SUM(CASE WHEN success = true THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 as success_rate,
            COUNT(*) as operation_count
          FROM performance_metrics ${whereClause}
          GROUP BY strftime('%Y-%m-%d %H:00:00', start_time)
          ORDER BY hour DESC
          LIMIT 24
        `, params)
      ]);

      const totalOperations = totalOpsResult.rows[0]?.count || 0;
      const successRate = successRateResult.rows[0]?.success_rate || 0;
      const durationStats = durationStatsResult.rows[0] || {};
      const avgCpuUsage = cpuStatsResult.rows[0]?.avg_cpu || 0;
      const avgMemoryUsage = memoryStatsResult.rows[0]?.avg_memory || 0;
      const topErrors = errorStatsResult.rows || [];
      const trendData = trendResult.rows || [];

      // Calculate operations per hour
      const timeRangeHours = timeRange ? 
        (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60) : 
        24; // Default to 24 hours
      const operationsPerHour = totalOperations / Math.max(timeRangeHours, 1);

      // Calculate error rate
      const errorRate = 100 - successRate;

      // Map trend data
      const performanceTrend = trendData.map(row => ({
        timestamp: new Date(row.hour),
        averageDuration: row.avg_duration || 0,
        successRate: row.success_rate || 0,
        operationCount: row.operation_count || 0
      }));

      return {
        serverName,
        operationType,
        totalOperations,
        successRate,
        averageDuration: durationStats.avg_duration || 0,
        p95Duration: durationStats.p95_duration || 0,
        p99Duration: durationStats.p99_duration || 0,
        averageCpuUsage,
        averageMemoryUsage,
        operationsPerHour,
        errorRate,
        topErrors,
        performanceTrend
      };
    } catch (error) {
      logger.error('Failed to get performance analytics', {
        serverName,
        operationType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get time-series data for a specific metric
   */
  async getTimeSeriesData(
    metricName: 'duration' | 'cpu_usage' | 'memory_usage' | 'operation_count',
    serverName: string,
    operationType?: string,
    timeRange?: { start: Date; end: Date },
    aggregationInterval: 'minute' | 'hour' | 'day' = 'hour'
  ): Promise<TimeSeriesData[]> {
    try {
      const whereClauses = ['server_name = ?'];
      const params = [serverName];

      if (operationType) {
        whereClauses.push('operation_type = ?');
        params.push(operationType);
      }

      if (timeRange) {
        whereClauses.push('start_time >= ? AND start_time <= ?');
        params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
      }

      const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

      // Determine aggregation format
      const timeFormat = {
        minute: '%Y-%m-%d %H:%M:00',
        hour: '%Y-%m-%d %H:00:00',
        day: '%Y-%m-%d 00:00:00'
      }[aggregationInterval];

      // Build metric-specific query
      let valueExpression: string;
      let filterClause = '';

      switch (metricName) {
        case 'duration':
          valueExpression = 'AVG(duration_ms)';
          filterClause = 'AND duration_ms IS NOT NULL';
          break;
        case 'cpu_usage':
          valueExpression = 'AVG(cpu_usage_percent)';
          filterClause = 'AND cpu_usage_percent IS NOT NULL';
          break;
        case 'memory_usage':
          valueExpression = 'AVG(memory_usage_bytes)';
          filterClause = 'AND memory_usage_bytes IS NOT NULL';
          break;
        case 'operation_count':
          valueExpression = 'COUNT(*)';
          break;
        default:
          throw new Error(`Unsupported metric name: ${metricName}`);
      }

      const sql = `
        SELECT 
          strftime('${timeFormat}', start_time) as timestamp,
          ${valueExpression} as value
        FROM performance_metrics 
        ${whereClause} ${filterClause}
        GROUP BY strftime('${timeFormat}', start_time)
        ORDER BY timestamp ASC
      `;

      const result = await this.db.query<{ timestamp: string; value: number }>(sql, params);

      return result.rows.map(row => ({
        timestamp: new Date(row.timestamp),
        value: row.value || 0
      }));
    } catch (error) {
      logger.error('Failed to get time-series data', {
        metricName,
        serverName,
        operationType,
        error: error.message
      });
      throw error;
    }
  }

  // ==================== MAINTENANCE ====================

  /**
   * Clean up old performance metrics
   */
  async cleanupOldMetrics(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const sql = 'DELETE FROM performance_metrics WHERE created_at < ?';
      const result = await this.db.query(sql, [cutoffDate.toISOString()]);

      logger.info('Old performance metrics cleaned up', {
        daysOld,
        deletedCount: result.rowCount
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to clean up old performance metrics', {
        daysOld,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Aggregate old metrics for long-term storage
   */
  async aggregateOldMetrics(daysOld: number = 7): Promise<void> {
    try {
      // This would implement data aggregation for long-term storage
      // For now, we'll just log the intention
      logger.info('Metric aggregation would run here', { daysOld });
    } catch (error) {
      logger.error('Failed to aggregate old metrics', {
        daysOld,
        error: error.message
      });
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Map database row to PerformanceMetric
   */
  private mapRowToMetric(row: any): PerformanceMetric {
    return {
      id: row.id,
      server_name: row.server_name,
      operation_type: row.operation_type,
      operation_id: row.operation_id,
      start_time: new Date(row.start_time),
      end_time: row.end_time ? new Date(row.end_time) : undefined,
      duration_ms: row.duration_ms,
      cpu_usage_percent: row.cpu_usage_percent,
      memory_usage_bytes: row.memory_usage_bytes,
      success: row.success,
      error_message: row.error_message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Get current CPU usage (placeholder implementation)
   */
  private getCurrentCpuUsage(): number {
    // In a real implementation, this would get actual CPU usage
    // For now, return a placeholder value
    return Math.random() * 100;
  }

  /**
   * Get current memory usage (placeholder implementation)
   */
  private getCurrentMemoryUsage(): number {
    // In a real implementation, this would get actual memory usage
    // For now, return process memory usage
    return process.memoryUsage().heapUsed;
  }
}