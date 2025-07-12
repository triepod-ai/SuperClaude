/**
 * Context Preservation Manager
 * Maintains session state and context across hook executions
 */

import { EventEmitter } from 'events';
import { logger } from '@superclaude/shared';
import { 
  SessionState, 
  BridgeHookContext, 
  BridgeHookResult,
  ClaudeCodeToolContext,
  MCPServerType
} from '../types.js';

export interface ContextSnapshot {
  id: string;
  sessionId: string;
  timestamp: Date;
  context: Record<string, unknown>;
  metadata: {
    toolSequence: string[];
    executionCount: number;
    averageExecutionTime: number;
    successRate: number;
    lastPersona?: string;
    lastComplexity?: string;
    dominantDomain?: string;
  };
}

export interface ContextPrediction {
  nextLikelyTool: string;
  suggestedPersona?: string;
  estimatedComplexity: string;
  recommendedMCPServers: MCPServerType[];
  confidence: number;
}

/**
 * Manages session context and state preservation across executions
 */
export class ContextPreservationManager extends EventEmitter {
  private sessions: Map<string, SessionState> = new Map();
  private contextSnapshots: Map<string, ContextSnapshot[]> = new Map();
  private contextCache: Map<string, { value: unknown; timestamp: Date; ttl: number }> = new Map();
  private readonly maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxSnapshotsPerSession = 100;
  private readonly contextTTL = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.startCleanupTimer();
    logger.info('Context Preservation Manager initialized');
  }

  /**
   * Initialize or retrieve session state
   */
  initializeSession(sessionId: string, initialContext?: Record<string, unknown>): SessionState {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        sessionId,
        startTime: new Date(),
        lastActivity: new Date(),
        context: initialContext || {},
        executionHistory: [],
        performance: {
          totalExecutions: 0,
          averageExecutionTime: 0,
          successRate: 1.0,
          tokenUsage: 0,
        },
      };

      this.sessions.set(sessionId, session);
      this.contextSnapshots.set(sessionId, []);
      
      logger.info('Session initialized', { sessionId });
      this.emit('session_initialized', session);
    } else {
      // Update last activity
      session.lastActivity = new Date();
    }

    return session;
  }

  /**
   * Update session context with hook execution results
   */
  updateSessionContext(
    sessionId: string, 
    context: BridgeHookContext, 
    result: BridgeHookResult
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Attempted to update context for non-existent session', { sessionId });
      return;
    }

    // Update execution history
    session.executionHistory.push({
      toolName: context.operation,
      executionId: context.executionId,
      timestamp: new Date(),
      duration: result.performance?.duration || 0,
      success: result.success,
    });

    // Update session context with results
    if (result.sessionStateUpdates) {
      Object.assign(session.context, result.sessionStateUpdates);
    }

    // Store context-aware information
    session.context.lastOperation = {
      toolName: context.operation,
      args: this.sanitizeArgs(context.args),
      persona: context.persona,
      complexity: context.complexity,
      flags: context.flags,
      timestamp: new Date().toISOString(),
      success: result.success,
    };

    // Update performance metrics
    this.updateSessionPerformance(session, result);

    // Create context snapshot periodically
    if (session.executionHistory.length % 10 === 0) {
      this.createContextSnapshot(sessionId);
    }

    // Update last activity
    session.lastActivity = new Date();

    logger.debug('Session context updated', {
      sessionId,
      executionCount: session.executionHistory.length,
      operation: context.operation,
    });

    this.emit('session_updated', session);
  }

  /**
   * Get enriched context for hook execution
   */
  getEnrichedContext(sessionId: string, baseContext: BridgeHookContext): BridgeHookContext {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return baseContext;
    }

    // Enrich context with session state
    const enrichedContext: BridgeHookContext = {
      ...baseContext,
      sessionState: session.context,
      previousResults: this.getPreviousResults(session),
    };

    // Add performance budget based on session history
    if (!enrichedContext.performanceBudget) {
      enrichedContext.performanceBudget = this.calculatePerformanceBudget(session);
    }

    // Suggest persona based on session patterns
    if (!enrichedContext.persona) {
      enrichedContext.persona = this.suggestPersonaFromHistory(session);
    }

    // Suggest complexity based on session patterns
    if (!enrichedContext.complexity) {
      enrichedContext.complexity = this.suggestComplexityFromHistory(session);
    }

    return enrichedContext;
  }

  /**
   * Predict next operation based on session history
   */
  predictNextOperation(sessionId: string): ContextPrediction | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.executionHistory.length < 3) {
      return null;
    }

    const recentHistory = session.executionHistory.slice(-10);
    const toolSequence = recentHistory.map(h => h.toolName);
    
    // Analyze patterns
    const toolFrequency = this.analyzeToolFrequency(recentHistory);
    const sequencePatterns = this.analyzeSequencePatterns(toolSequence);
    
    // Predict next tool
    const nextLikelyTool = this.predictNextTool(toolSequence, toolFrequency);
    
    // Calculate confidence based on pattern strength
    const confidence = this.calculatePredictionConfidence(sequencePatterns, toolFrequency);

    const prediction: ContextPrediction = {
      nextLikelyTool,
      suggestedPersona: this.suggestPersonaFromHistory(session),
      estimatedComplexity: this.suggestComplexityFromHistory(session),
      recommendedMCPServers: this.recommendMCPServersFromHistory(session),
      confidence,
    };

    logger.debug('Context prediction generated', {
      sessionId,
      prediction,
      historyLength: recentHistory.length,
    });

    return prediction;
  }

  /**
   * Cache context-specific data
   */
  cacheContextData(key: string, value: unknown, ttl?: number): void {
    this.contextCache.set(key, {
      value,
      timestamp: new Date(),
      ttl: ttl || this.contextTTL,
    });

    // Clean up cache if it gets too large
    if (this.contextCache.size > 10000) {
      this.cleanupContextCache();
    }
  }

  /**
   * Retrieve cached context data
   */
  getCachedContextData(key: string): unknown | null {
    const cached = this.contextCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp.getTime();
    if (age > cached.ttl) {
      this.contextCache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Export session state for backup/analysis
   */
  exportSessionState(sessionId: string): any | null {
    const session = this.sessions.get(sessionId);
    const snapshots = this.contextSnapshots.get(sessionId);
    
    if (!session) return null;

    return {
      session,
      snapshots,
      exportedAt: new Date(),
    };
  }

  /**
   * Import session state from backup
   */
  importSessionState(sessionData: any): boolean {
    try {
      if (!sessionData.session?.sessionId) return false;

      const sessionId = sessionData.session.sessionId;
      this.sessions.set(sessionId, sessionData.session);
      
      if (sessionData.snapshots) {
        this.contextSnapshots.set(sessionId, sessionData.snapshots);
      }

      logger.info('Session state imported', { sessionId });
      return true;
    } catch (error) {
      logger.error('Failed to import session state', { error });
      return false;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStatistics(sessionId: string): any | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const recentHistory = session.executionHistory.slice(-50);
    const toolUsage = this.analyzeToolFrequency(recentHistory);
    const successRate = recentHistory.filter(h => h.success).length / recentHistory.length;
    const avgExecutionTime = recentHistory.reduce((sum, h) => sum + h.duration, 0) / recentHistory.length;

    return {
      sessionId,
      duration: Date.now() - session.startTime.getTime(),
      totalExecutions: session.executionHistory.length,
      recentExecutions: recentHistory.length,
      successRate,
      avgExecutionTime,
      toolUsage,
      contextSize: Object.keys(session.context).length,
      lastActivity: session.lastActivity,
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    const activeThreshold = Date.now() - (60 * 60 * 1000); // 1 hour
    return Array.from(this.sessions.entries())
      .filter(([, session]) => session.lastActivity.getTime() > activeThreshold)
      .map(([sessionId]) => sessionId);
  }

  // ===================== PRIVATE IMPLEMENTATION =====================

  private createContextSnapshot(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const snapshots = this.contextSnapshots.get(sessionId) || [];
    const recentHistory = session.executionHistory.slice(-20);
    
    const snapshot: ContextSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      timestamp: new Date(),
      context: { ...session.context },
      metadata: {
        toolSequence: recentHistory.map(h => h.toolName),
        executionCount: session.executionHistory.length,
        averageExecutionTime: session.performance.averageExecutionTime,
        successRate: session.performance.successRate,
        lastPersona: session.context.lastOperation?.persona,
        lastComplexity: session.context.lastOperation?.complexity,
        dominantDomain: this.identifyDominantDomain(recentHistory),
      },
    };

    snapshots.push(snapshot);

    // Keep only recent snapshots
    if (snapshots.length > this.maxSnapshotsPerSession) {
      snapshots.splice(0, snapshots.length - this.maxSnapshotsPerSession);
    }

    this.contextSnapshots.set(sessionId, snapshots);
    this.emit('snapshot_created', snapshot);
  }

  private updateSessionPerformance(session: SessionState, result: BridgeHookResult): void {
    const perf = session.performance;
    const duration = result.performance?.duration || 0;
    const tokenUsage = result.performance?.tokenUsage || 0;

    // Update metrics
    perf.totalExecutions += 1;
    perf.averageExecutionTime = (
      (perf.averageExecutionTime * (perf.totalExecutions - 1) + duration) / 
      perf.totalExecutions
    );
    
    const successfulExecutions = session.executionHistory.filter(h => h.success).length;
    perf.successRate = successfulExecutions / session.executionHistory.length;
    perf.tokenUsage += tokenUsage;
  }

  private getPreviousResults(session: SessionState): Record<string, unknown> {
    const recentHistory = session.executionHistory.slice(-5);
    return {
      recentToolSequence: recentHistory.map(h => h.toolName),
      recentSuccessRate: recentHistory.filter(h => h.success).length / recentHistory.length,
      lastOperationDuration: recentHistory[recentHistory.length - 1]?.duration || 0,
    };
  }

  private calculatePerformanceBudget(session: SessionState): any {
    const avgTime = session.performance.averageExecutionTime;
    const successRate = session.performance.successRate;

    // Adjust budget based on session performance
    let maxExecutionTime = 5000; // Base budget
    
    if (avgTime < 1000 && successRate > 0.9) {
      maxExecutionTime = 3000; // Tight budget for fast sessions
    } else if (avgTime > 3000 || successRate < 0.7) {
      maxExecutionTime = 10000; // Relaxed budget for slower sessions
    }

    return {
      maxExecutionTime,
      priority: successRate > 0.9 ? 'high' : 'medium',
    };
  }

  private suggestPersonaFromHistory(session: SessionState): any {
    const recentHistory = session.executionHistory.slice(-10);
    const toolCounts = this.analyzeToolFrequency(recentHistory);
    
    // Map tools to personas
    const personaScores: Record<string, number> = {};
    
    for (const [tool, count] of Object.entries(toolCounts)) {
      if (tool.includes('magic') || tool.includes('component')) {
        personaScores.frontend = (personaScores.frontend || 0) + count;
      } else if (tool.includes('sequential') || tool.includes('analyze')) {
        personaScores.analyzer = (personaScores.analyzer || 0) + count;
      } else if (tool.includes('playwright') || tool.includes('test')) {
        personaScores.qa = (personaScores.qa || 0) + count;
      } else if (tool.includes('performance') || tool.includes('optimize')) {
        personaScores.performance = (personaScores.performance || 0) + count;
      }
    }

    // Return most likely persona
    const topPersona = Object.entries(personaScores)
      .sort(([, a], [, b]) => b - a)[0];
    
    return topPersona ? topPersona[0] : undefined;
  }

  private suggestComplexityFromHistory(session: SessionState): any {
    const recentHistory = session.executionHistory.slice(-5);
    const avgDuration = recentHistory.reduce((sum, h) => sum + h.duration, 0) / recentHistory.length;

    if (avgDuration > 5000) return 'critical';
    if (avgDuration > 2000) return 'complex';
    if (avgDuration > 1000) return 'moderate';
    return 'simple';
  }

  private recommendMCPServersFromHistory(session: SessionState): MCPServerType[] {
    const recentHistory = session.executionHistory.slice(-10);
    const servers: MCPServerType[] = [];

    // Analyze tool patterns
    const toolCounts = this.analyzeToolFrequency(recentHistory);
    
    for (const tool of Object.keys(toolCounts)) {
      if (tool.includes('sequential')) {
        servers.push('superclaude-intelligence');
      } else if (tool.includes('magic')) {
        servers.push('superclaude-ui');
      } else if (tool.includes('playwright')) {
        servers.push('superclaude-quality');
      }
    }

    // Always include orchestrator for coordination
    if (!servers.includes('superclaude-orchestrator')) {
      servers.push('superclaude-orchestrator');
    }

    return servers;
  }

  private analyzeToolFrequency(history: any[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    
    for (const execution of history) {
      const tool = execution.toolName;
      frequency[tool] = (frequency[tool] || 0) + 1;
    }

    return frequency;
  }

  private analyzeSequencePatterns(toolSequence: string[]): any {
    const patterns: Record<string, number> = {};
    
    // Analyze 2-tool sequences
    for (let i = 0; i < toolSequence.length - 1; i++) {
      const pattern = `${toolSequence[i]} -> ${toolSequence[i + 1]}`;
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }

    return patterns;
  }

  private predictNextTool(toolSequence: string[], toolFrequency: Record<string, number>): string {
    if (toolSequence.length === 0) return 'Read'; // Default starting tool

    const lastTool = toolSequence[toolSequence.length - 1];
    
    // Common tool sequences
    const commonSequences: Record<string, string[]> = {
      'Read': ['Edit', 'MultiEdit', 'Grep', 'mcp__sequential-thinking'],
      'Edit': ['Bash', 'Read', 'Write'],
      'Write': ['Read', 'Bash'],
      'Grep': ['Read', 'Edit'],
      'Bash': ['Read', 'Write'],
      'mcp__sequential-thinking': ['Read', 'Edit', 'Write'],
      'mcp__magic': ['Read', 'Edit'],
      'mcp__playwright': ['Read', 'Bash'],
    };

    const possibleNext = commonSequences[lastTool] || Object.keys(toolFrequency);
    
    // Return most frequent tool from possible next tools
    let maxCount = 0;
    let predictedTool = possibleNext[0];
    
    for (const tool of possibleNext) {
      const count = toolFrequency[tool] || 0;
      if (count > maxCount) {
        maxCount = count;
        predictedTool = tool;
      }
    }

    return predictedTool;
  }

  private calculatePredictionConfidence(patterns: any, toolFrequency: Record<string, number>): number {
    const patternStrength = Object.values(patterns).reduce((sum: number, count: number) => sum + count, 0);
    const toolVariety = Object.keys(toolFrequency).length;
    
    // Higher confidence with stronger patterns and less variety
    const baseConfidence = Math.min(0.9, patternStrength / 10);
    const varietyPenalty = Math.min(0.3, toolVariety / 20);
    
    return Math.max(0.1, baseConfidence - varietyPenalty);
  }

  private identifyDominantDomain(history: any[]): string {
    const domainScores: Record<string, number> = {
      frontend: 0,
      backend: 0,
      analysis: 0,
      testing: 0,
      performance: 0,
    };

    for (const execution of history) {
      const tool = execution.toolName.toLowerCase();
      
      if (tool.includes('magic') || tool.includes('component')) {
        domainScores.frontend += 1;
      } else if (tool.includes('sequential') || tool.includes('analyze')) {
        domainScores.analysis += 1;
      } else if (tool.includes('playwright') || tool.includes('test')) {
        domainScores.testing += 1;
      } else if (tool.includes('performance') || tool.includes('optimize')) {
        domainScores.performance += 1;
      } else {
        domainScores.backend += 1;
      }
    }

    return Object.entries(domainScores)
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive or large data from args for storage
    const sanitized = { ...args };
    
    // Remove common large/sensitive fields
    delete sanitized.content;
    delete sanitized.file_content;
    delete sanitized.data;
    delete sanitized.sessionId;
    delete sanitized.executionId;
    
    // Truncate long strings
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 200) {
        sanitized[key] = value.substring(0, 200) + '...';
      }
    }

    return sanitized;
  }

  private cleanupContextCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, cached] of this.contextCache.entries()) {
      const age = now - cached.timestamp.getTime();
      if (age > cached.ttl) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.contextCache.delete(key);
    }

    logger.debug('Context cache cleaned', { 
      deleted: toDelete.length, 
      remaining: this.contextCache.size 
    });
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupContextCache();
    }, 60000); // Every minute
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity.getTime();
      if (age > this.maxSessionAge) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
      this.contextSnapshots.delete(sessionId);
      logger.info('Expired session cleaned up', { sessionId });
    }

    if (expiredSessions.length > 0) {
      this.emit('sessions_cleaned', expiredSessions);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.sessions.clear();
    this.contextSnapshots.clear();
    this.contextCache.clear();
    
    logger.info('Context Preservation Manager cleanup completed');
  }
}