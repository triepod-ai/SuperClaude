import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@superclaude/shared';
import {
  Task,
  TaskComplexity,
  TaskPriority,
  CreateTaskInput
} from '../types/index.js';

/**
 * Supported AI model providers
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  AZURE_OPENAI = 'azure_openai',
  HUGGING_FACE = 'hugging_face',
  LOCAL = 'local'
}

/**
 * Model capabilities and specifications
 */
export interface ModelCapabilities {
  maxTokens: number;
  supportsVision: boolean;
  supportsCodeGeneration: boolean;
  supportsReasonining: boolean;
  supportsFunctionCalling: boolean;
  supportsBatching: boolean;
  costPerToken: number;
  averageLatency: number;
  reliabilityScore: number;
}

/**
 * AI model configuration
 */
export interface AIModel {
  id: string;
  provider: AIProvider;
  name: string;
  version: string;
  capabilities: ModelCapabilities;
  configuration: {
    apiKey?: string;
    apiUrl?: string;
    organization?: string;
    projectId?: string;
    region?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    concurrentRequests: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  apiUrl?: string;
  organization?: string;
  projectId?: string;
  region?: string;
  defaultModel?: string;
  rateLimits?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
    concurrentRequests?: number;
  };
  timeout?: number;
  retryPolicy?: {
    maxRetries?: number;
    backoffMultiplier?: number;
    maxBackoffTime?: number;
  };
}

/**
 * Task generation request
 */
export interface TaskGenerationRequest {
  prompt: string;
  context?: string;
  parentTaskId?: string;
  targetComplexity?: TaskComplexity;
  maxTasks?: number;
  includeEstimates?: boolean;
  includeDependencies?: boolean;
  model?: string;
  temperature?: number;
  userId?: string;
  sessionId?: string;
}

/**
 * Task generation response
 */
export interface TaskGenerationResponse {
  requestId: string;
  tasks: Task[];
  metadata: {
    model: string;
    provider: AIProvider;
    tokensUsed: number;
    processingTime: number;
    confidence: number;
    generationApproach: string;
  };
  suggestions?: {
    dependencies: Array<{ taskId: string; dependsOn: string; reason: string }>;
    optimizations: Array<{ type: string; description: string; impact: string }>;
    alternatives: Array<{ description: string; tradeoffs: string }>;
  };
}

/**
 * Task analysis request
 */
export interface TaskAnalysisRequest {
  taskId: string;
  task?: Task;
  analysisType: 'complexity' | 'estimation' | 'dependencies' | 'optimization' | 'risk';
  context?: {
    relatedTasks?: Task[];
    projectInfo?: Record<string, any>;
    constraints?: Record<string, any>;
  };
  model?: string;
  userId?: string;
}

/**
 * Task analysis response
 */
export interface TaskAnalysisResponse {
  requestId: string;
  taskId: string;
  analysis: {
    complexity?: {
      level: TaskComplexity;
      factors: string[];
      reasoning: string;
      confidence: number;
    };
    estimation?: {
      estimatedHours: number;
      confidenceRange: { min: number; max: number };
      factors: string[];
      risks: string[];
      assumptions: string[];
    };
    dependencies?: {
      required: Array<{ taskId: string; reason: string; type: 'hard' | 'soft' }>;
      optional: Array<{ taskId: string; reason: string; benefit: string }>;
      blocking: Array<{ taskId: string; reason: string; impact: string }>;
    };
    optimization?: {
      recommendations: Array<{ type: string; description: string; impact: string }>;
      alternatives: Array<{ approach: string; tradeoffs: string; effort: string }>;
      parallelization: Array<{ subtask: string; canRunInParallel: boolean; reason: string }>;
    };
    risk?: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      risks: Array<{ type: string; description: string; probability: number; impact: string; mitigation: string }>;
      blockers: Array<{ description: string; likelihood: number; mitigation: string }>;
    };
  };
  metadata: {
    model: string;
    provider: AIProvider;
    tokensUsed: number;
    processingTime: number;
    confidence: number;
  };
}

/**
 * Request context for tracking and optimization
 */
export interface RequestContext {
  id: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  type: 'generation' | 'analysis' | 'optimization';
  model: string;
  provider: AIProvider;
  inputTokens: number;
  outputTokens: number;
  processingTime: number;
  success: boolean;
  error?: string;
  cost: number;
}

/**
 * Provider performance metrics
 */
export interface ProviderMetrics {
  provider: AIProvider;
  model: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  averageCost: number;
  uptime: number;
  lastError?: {
    timestamp: Date;
    error: string;
    recoveryTime?: number;
  };
  rateLimit: {
    remaining: number;
    resetTime: Date;
    totalLimit: number;
  };
}

/**
 * Abstract base class for AI provider adapters
 */
export abstract class ProviderAdapter extends EventEmitter {
  protected config: ProviderConfig;
  protected requestHistory: RequestContext[] = [];
  protected rateLimitTracker: Map<string, { count: number; resetTime: Date }> = new Map();
  
  constructor(config: ProviderConfig) {
    super();
    this.config = config;
    this.setupRateLimitTracking();
  }
  
  abstract get provider(): AIProvider;
  abstract get availableModels(): AIModel[];
  abstract generateTasks(request: TaskGenerationRequest): Promise<TaskGenerationResponse>;
  abstract analyzeTask(request: TaskAnalysisRequest): Promise<TaskAnalysisResponse>;
  abstract validateConnection(): Promise<boolean>;
  
  /**
   * Setup rate limit tracking
   */
  private setupRateLimitTracking(): void {
    setInterval(() => {
      this.cleanupRateLimitTracker();
    }, 60000); // Cleanup every minute
  }
  
  /**
   * Clean up old rate limit entries
   */
  private cleanupRateLimitTracker(): void {
    const now = new Date();
    for (const [key, data] of this.rateLimitTracker) {
      if (data.resetTime <= now) {
        this.rateLimitTracker.delete(key);
      }
    }
  }
  
  /**
   * Check if request is within rate limits
   */
  protected checkRateLimit(model: string): boolean {
    const key = `${this.provider}:${model}`;
    const now = new Date();
    const data = this.rateLimitTracker.get(key);
    
    if (!data) {
      const resetTime = new Date(now.getTime() + 60000); // Reset in 1 minute
      this.rateLimitTracker.set(key, { count: 1, resetTime });
      return true;
    }
    
    if (data.resetTime <= now) {
      // Reset the counter
      const resetTime = new Date(now.getTime() + 60000);
      this.rateLimitTracker.set(key, { count: 1, resetTime });
      return true;
    }
    
    const limits = this.config.rateLimits;
    if (limits && data.count >= (limits.requestsPerMinute || Infinity)) {
      return false;
    }
    
    data.count++;
    return true;
  }
  
  /**
   * Record request for analytics
   */
  protected recordRequest(context: RequestContext): void {
    this.requestHistory.push(context);
    
    // Limit history size
    if (this.requestHistory.length > 1000) {
      this.requestHistory.splice(0, this.requestHistory.length - 1000);
    }
    
    this.emit('request_completed', context);
  }
  
  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics {
    const requests = this.requestHistory;
    const successfulRequests = requests.filter(r => r.success);
    const failedRequests = requests.filter(r => !r.success);
    
    const averageLatency = requests.length > 0 
      ? requests.reduce((sum, r) => sum + r.processingTime, 0) / requests.length 
      : 0;
      
    const averageCost = requests.length > 0
      ? requests.reduce((sum, r) => sum + r.cost, 0) / requests.length
      : 0;
    
    const lastError = failedRequests.length > 0 
      ? failedRequests[failedRequests.length - 1]
      : undefined;
    
    return {
      provider: this.provider,
      model: this.config.defaultModel || 'unknown',
      totalRequests: requests.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      averageLatency,
      averageCost,
      uptime: requests.length > 0 ? (successfulRequests.length / requests.length) * 100 : 100,
      lastError: lastError ? {
        timestamp: lastError.timestamp,
        error: lastError.error || 'Unknown error',
        recoveryTime: undefined
      } : undefined,
      rateLimit: {
        remaining: 100, // Would need to implement actual tracking
        resetTime: new Date(Date.now() + 60000),
        totalLimit: this.config.rateLimits?.requestsPerMinute || 1000
      }
    };
  }
  
  /**
   * Calculate cost for a request
   */
  protected calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Default cost calculation - should be overridden by specific providers
    const modelConfig = this.availableModels.find(m => m.name === model);
    if (!modelConfig) return 0;
    
    const costPerToken = modelConfig.capabilities.costPerToken;
    return (inputTokens + outputTokens) * costPerToken;
  }
}

/**
 * OpenAI provider adapter
 */
export class OpenAIAdapter extends ProviderAdapter {
  get provider(): AIProvider {
    return AIProvider.OPENAI;
  }
  
  get availableModels(): AIModel[] {
    return [
      {
        id: 'gpt-4o',
        provider: AIProvider.OPENAI,
        name: 'gpt-4o',
        version: '2024-08-06',
        capabilities: {
          maxTokens: 128000,
          supportsVision: true,
          supportsCodeGeneration: true,
          supportsReasonining: true,
          supportsFunctionCalling: true,
          supportsBatching: true,
          costPerToken: 0.00001,
          averageLatency: 2000,
          reliabilityScore: 0.99
        },
        configuration: this.config,
        rateLimit: {
          requestsPerMinute: 500,
          tokensPerMinute: 200000,
          concurrentRequests: 50
        },
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxBackoffTime: 10000
        }
      },
      {
        id: 'gpt-4o-mini',
        provider: AIProvider.OPENAI,
        name: 'gpt-4o-mini',
        version: '2024-07-18',
        capabilities: {
          maxTokens: 128000,
          supportsVision: true,
          supportsCodeGeneration: true,
          supportsReasonining: true,
          supportsFunctionCalling: true,
          supportsBatching: false,
          costPerToken: 0.000001,
          averageLatency: 1000,
          reliabilityScore: 0.98
        },
        configuration: this.config,
        rateLimit: {
          requestsPerMinute: 1000,
          tokensPerMinute: 500000,
          concurrentRequests: 100
        },
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxBackoffTime: 10000
        }
      }
    ];
  }
  
  async generateTasks(request: TaskGenerationRequest): Promise<TaskGenerationResponse> {
    const startTime = Date.now();
    const requestId = uuidv4();
    const model = request.model || this.config.defaultModel || 'gpt-4o-mini';
    
    if (!this.checkRateLimit(model)) {
      throw new Error('Rate limit exceeded');
    }
    
    try {
      // Dynamic import to avoid requiring openai as a dependency
      const { OpenAI } = await import('openai');
      
      const openai = new OpenAI({
        apiKey: this.config.apiKey,
        organization: this.config.organization
      });
      
      const systemPrompt = this.buildTaskGenerationPrompt(request);
      
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || this.config.temperature || 0.7,
        max_tokens: request.maxTasks ? request.maxTasks * 200 : 2000,
        response_format: { type: 'json_object' }
      });
      
      const processingTime = Date.now() - startTime;
      const usage = response.usage!;
      
      // Parse the response
      const generatedData = JSON.parse(response.choices[0].message.content!);
      const tasks = this.parseGeneratedTasks(generatedData, request);
      
      const result: TaskGenerationResponse = {
        requestId,
        tasks,
        metadata: {
          model,
          provider: this.provider,
          tokensUsed: usage.total_tokens,
          processingTime,
          confidence: this.calculateConfidence(generatedData),
          generationApproach: 'structured_prompt'
        },
        suggestions: generatedData.suggestions
      };
      
      // Record request
      this.recordRequest({
        id: requestId,
        userId: request.userId,
        sessionId: request.sessionId,
        timestamp: new Date(),
        type: 'generation',
        model,
        provider: this.provider,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        processingTime,
        success: true,
        cost: this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
      });
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.recordRequest({
        id: requestId,
        userId: request.userId,
        sessionId: request.sessionId,
        timestamp: new Date(),
        type: 'generation',
        model,
        provider: this.provider,
        inputTokens: 0,
        outputTokens: 0,
        processingTime,
        success: false,
        error: error.message,
        cost: 0
      });
      
      throw error;
    }
  }
  
  async analyzeTask(request: TaskAnalysisRequest): Promise<TaskAnalysisResponse> {
    const startTime = Date.now();
    const requestId = uuidv4();
    const model = request.model || this.config.defaultModel || 'gpt-4o-mini';
    
    if (!this.checkRateLimit(model)) {
      throw new Error('Rate limit exceeded');
    }
    
    try {
      const { OpenAI } = await import('openai');
      
      const openai = new OpenAI({
        apiKey: this.config.apiKey,
        organization: this.config.organization
      });
      
      const systemPrompt = this.buildTaskAnalysisPrompt(request);
      const userPrompt = this.buildTaskAnalysisUserPrompt(request);
      
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for analysis
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      
      const processingTime = Date.now() - startTime;
      const usage = response.usage!;
      
      // Parse the response
      const analysisData = JSON.parse(response.choices[0].message.content!);
      
      const result: TaskAnalysisResponse = {
        requestId,
        taskId: request.taskId,
        analysis: analysisData.analysis,
        metadata: {
          model,
          provider: this.provider,
          tokensUsed: usage.total_tokens,
          processingTime,
          confidence: analysisData.confidence || 0.8
        }
      };
      
      // Record request
      this.recordRequest({
        id: requestId,
        userId: request.userId,
        timestamp: new Date(),
        type: 'analysis',
        model,
        provider: this.provider,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        processingTime,
        success: true,
        cost: this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
      });
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.recordRequest({
        id: requestId,
        userId: request.userId,
        timestamp: new Date(),
        type: 'analysis',
        model,
        provider: this.provider,
        inputTokens: 0,
        outputTokens: 0,
        processingTime,
        success: false,
        error: error.message,
        cost: 0
      });
      
      throw error;
    }
  }
  
  async validateConnection(): Promise<boolean> {
    try {
      const { OpenAI } = await import('openai');
      
      const openai = new OpenAI({
        apiKey: this.config.apiKey,
        organization: this.config.organization
      });
      
      // Make a simple request to validate the connection
      await openai.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI connection validation failed', { error: error.message });
      return false;
    }
  }
  
  private buildTaskGenerationPrompt(request: TaskGenerationRequest): string {
    return `You are an expert project manager and task decomposition specialist. Your role is to break down complex requirements into well-structured, actionable tasks.

CONTEXT:
${request.context || 'No additional context provided'}

REQUIREMENTS:
- Generate ${request.maxTasks || 'appropriate number of'} tasks
- Target complexity: ${request.targetComplexity || 'balanced'}
- Include estimates: ${request.includeEstimates ? 'yes' : 'no'}
- Include dependencies: ${request.includeDependencies ? 'yes' : 'no'}
- Parent task: ${request.parentTaskId || 'none'}

OUTPUT FORMAT (JSON):
{
  "tasks": [
    {
      "title": "Clear, actionable task title",
      "description": "Detailed description with acceptance criteria",
      "priority": "low|medium|high|critical",
      "complexity": "simple|moderate|complex|very_complex",
      "estimatedHours": number,
      "dependencies": ["taskId1", "taskId2"],
      "tags": ["tag1", "tag2"],
      "metadata": {
        "category": "development|testing|documentation|etc",
        "skills": ["skill1", "skill2"],
        "tools": ["tool1", "tool2"]
      }
    }
  ],
  "suggestions": {
    "dependencies": [
      {"taskId": "id", "dependsOn": "otherId", "reason": "explanation"}
    ],
    "optimizations": [
      {"type": "parallel", "description": "tasks that can run in parallel", "impact": "time savings"}
    ],
    "alternatives": [
      {"description": "alternative approach", "tradeoffs": "pros and cons"}
    ]
  }
}

Focus on creating practical, implementable tasks with clear outcomes.`;
  }
  
  private buildTaskAnalysisPrompt(request: TaskAnalysisRequest): string {
    const analysisTypes = {
      complexity: 'Analyze the complexity factors and provide a detailed breakdown',
      estimation: 'Provide accurate time estimates with confidence intervals and risk factors',
      dependencies: 'Identify all dependencies, blocking relationships, and critical path items',
      optimization: 'Suggest optimizations, alternatives, and parallelization opportunities',
      risk: 'Assess risks, potential blockers, and mitigation strategies'
    };
    
    return `You are an expert software project analyst. Analyze the given task for ${request.analysisType}.

ANALYSIS FOCUS: ${analysisTypes[request.analysisType]}

CONTEXT:
${JSON.stringify(request.context || {}, null, 2)}

OUTPUT FORMAT (JSON):
{
  "analysis": {
    // Analysis results based on type
  },
  "confidence": 0.85,
  "reasoning": "Explanation of the analysis approach and key factors considered"
}

Provide thorough, actionable analysis with clear reasoning.`;
  }
  
  private buildTaskAnalysisUserPrompt(request: TaskAnalysisRequest): string {
    return `Analyze this task:

TASK ID: ${request.taskId}
TASK DETAILS:
${request.task ? JSON.stringify(request.task, null, 2) : 'Task details will be provided separately'}

ANALYSIS TYPE: ${request.analysisType}

Please provide a comprehensive analysis focusing on the requested aspect.`;
  }
  
  private parseGeneratedTasks(data: any, request: TaskGenerationRequest): Task[] {
    const tasks: Task[] = [];
    
    for (const taskData of data.tasks) {
      const task: Task = {
        id: uuidv4(),
        title: taskData.title,
        description: taskData.description,
        state: 'pending' as any,
        priority: taskData.priority,
        complexity: taskData.complexity,
        parentId: request.parentTaskId,
        dependencies: taskData.dependencies || [],
        tags: taskData.tags || [],
        estimatedHours: taskData.estimatedHours,
        assignee: undefined,
        dueDate: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: undefined,
        metadata: taskData.metadata || {}
      };
      
      tasks.push(task);
    }
    
    return tasks;
  }
  
  private calculateConfidence(data: any): number {
    // Simple confidence calculation based on data completeness
    let score = 0.5;
    
    if (data.tasks && data.tasks.length > 0) score += 0.2;
    if (data.suggestions) score += 0.1;
    if (data.tasks?.every((t: any) => t.title && t.description)) score += 0.2;
    
    return Math.min(score, 1.0);
  }
}

/**
 * Anthropic provider adapter
 */
export class AnthropicAdapter extends ProviderAdapter {
  get provider(): AIProvider {
    return AIProvider.ANTHROPIC;
  }
  
  get availableModels(): AIModel[] {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        provider: AIProvider.ANTHROPIC,
        name: 'claude-3-5-sonnet-20241022',
        version: '20241022',
        capabilities: {
          maxTokens: 200000,
          supportsVision: true,
          supportsCodeGeneration: true,
          supportsReasonining: true,
          supportsFunctionCalling: true,
          supportsBatching: false,
          costPerToken: 0.000015,
          averageLatency: 3000,
          reliabilityScore: 0.99
        },
        configuration: this.config,
        rateLimit: {
          requestsPerMinute: 50,
          tokensPerMinute: 40000,
          concurrentRequests: 5
        },
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxBackoffTime: 10000
        }
      },
      {
        id: 'claude-3-haiku-20240307',
        provider: AIProvider.ANTHROPIC,
        name: 'claude-3-haiku-20240307',
        version: '20240307',
        capabilities: {
          maxTokens: 200000,
          supportsVision: true,
          supportsCodeGeneration: true,
          supportsReasonining: true,
          supportsFunctionCalling: false,
          supportsBatching: false,
          costPerToken: 0.000005,
          averageLatency: 1500,
          reliabilityScore: 0.98
        },
        configuration: this.config,
        rateLimit: {
          requestsPerMinute: 100,
          tokensPerMinute: 100000,
          concurrentRequests: 10
        },
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxBackoffTime: 10000
        }
      }
    ];
  }
  
  async generateTasks(request: TaskGenerationRequest): Promise<TaskGenerationResponse> {
    // Implementation similar to OpenAI but using Anthropic's API
    throw new Error('Anthropic adapter not fully implemented');
  }
  
  async analyzeTask(request: TaskAnalysisRequest): Promise<TaskAnalysisResponse> {
    // Implementation similar to OpenAI but using Anthropic's API
    throw new Error('Anthropic adapter not fully implemented');
  }
  
  async validateConnection(): Promise<boolean> {
    try {
      // Would use Anthropic's SDK for validation
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Provider manager that orchestrates multiple AI providers
 */
export class ProviderManager extends EventEmitter {
  private providers: Map<AIProvider, ProviderAdapter> = new Map();
  private defaultProvider: AIProvider | null = null;
  private loadBalancer: LoadBalancer;
  private fallbackChain: AIProvider[] = [];
  
  constructor() {
    super();
    this.loadBalancer = new LoadBalancer();
    this.setupHealthChecking();
  }
  
  /**
   * Register a provider adapter
   */
  registerProvider(adapter: ProviderAdapter): void {
    this.providers.set(adapter.provider, adapter);
    
    // Set as default if first provider
    if (!this.defaultProvider) {
      this.defaultProvider = adapter.provider;
    }
    
    // Setup event forwarding
    adapter.on('request_completed', (context) => {
      this.emit('request_completed', context);
    });
    
    logger.info('Provider registered', { provider: adapter.provider });
  }
  
  /**
   * Unregister a provider adapter
   */
  unregisterProvider(provider: AIProvider): boolean {
    const adapter = this.providers.get(provider);
    if (adapter) {
      adapter.removeAllListeners();
      this.providers.delete(provider);
      
      if (this.defaultProvider === provider) {
        this.defaultProvider = this.providers.keys().next().value || null;
      }
      
      logger.info('Provider unregistered', { provider });
      return true;
    }
    
    return false;
  }
  
  /**
   * Set default provider
   */
  setDefaultProvider(provider: AIProvider): void {
    if (this.providers.has(provider)) {
      this.defaultProvider = provider;
      logger.info('Default provider set', { provider });
    } else {
      throw new Error(`Provider ${provider} not registered`);
    }
  }
  
  /**
   * Set fallback chain for redundancy
   */
  setFallbackChain(providers: AIProvider[]): void {
    this.fallbackChain = providers.filter(p => this.providers.has(p));
    logger.info('Fallback chain configured', { chain: this.fallbackChain });
  }
  
  /**
   * Generate tasks using optimal provider selection
   */
  async generateTasks(request: TaskGenerationRequest): Promise<TaskGenerationResponse> {
    const provider = this.selectOptimalProvider(request);
    
    try {
      const adapter = this.providers.get(provider);
      if (!adapter) {
        throw new Error(`Provider ${provider} not available`);
      }
      
      return await adapter.generateTasks(request);
      
    } catch (error) {
      logger.warn('Task generation failed with primary provider', { 
        provider, 
        error: error.message 
      });
      
      // Try fallback providers
      for (const fallbackProvider of this.fallbackChain) {
        if (fallbackProvider === provider) continue;
        
        try {
          const fallbackAdapter = this.providers.get(fallbackProvider);
          if (fallbackAdapter) {
            logger.info('Attempting fallback provider', { provider: fallbackProvider });
            return await fallbackAdapter.generateTasks(request);
          }
        } catch (fallbackError) {
          logger.warn('Fallback provider also failed', { 
            provider: fallbackProvider, 
            error: fallbackError.message 
          });
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Analyze task using optimal provider selection
   */
  async analyzeTask(request: TaskAnalysisRequest): Promise<TaskAnalysisResponse> {
    const provider = this.selectOptimalProvider(request);
    
    try {
      const adapter = this.providers.get(provider);
      if (!adapter) {
        throw new Error(`Provider ${provider} not available`);
      }
      
      return await adapter.analyzeTask(request);
      
    } catch (error) {
      logger.warn('Task analysis failed with primary provider', { 
        provider, 
        error: error.message 
      });
      
      // Try fallback providers
      for (const fallbackProvider of this.fallbackChain) {
        if (fallbackProvider === provider) continue;
        
        try {
          const fallbackAdapter = this.providers.get(fallbackProvider);
          if (fallbackAdapter) {
            logger.info('Attempting fallback provider', { provider: fallbackProvider });
            return await fallbackAdapter.analyzeTask(request);
          }
        } catch (fallbackError) {
          logger.warn('Fallback provider also failed', { 
            provider: fallbackProvider, 
            error: fallbackError.message 
          });
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Select optimal provider based on request characteristics
   */
  private selectOptimalProvider(request: any): AIProvider {
    if (request.model) {
      // Find provider that supports the requested model
      for (const [provider, adapter] of this.providers) {
        const models = adapter.availableModels;
        if (models.some(m => m.name === request.model)) {
          return provider;
        }
      }
    }
    
    // Use load balancer for selection
    const availableProviders = Array.from(this.providers.keys());
    const selected = this.loadBalancer.selectProvider(availableProviders, request);
    
    return selected || this.defaultProvider || availableProviders[0];
  }
  
  /**
   * Get all provider metrics
   */
  getAllMetrics(): Map<AIProvider, ProviderMetrics> {
    const metrics = new Map<AIProvider, ProviderMetrics>();
    
    for (const [provider, adapter] of this.providers) {
      metrics.set(provider, adapter.getMetrics());
    }
    
    return metrics;
  }
  
  /**
   * Get available models from all providers
   */
  getAllModels(): AIModel[] {
    const models: AIModel[] = [];
    
    for (const adapter of this.providers.values()) {
      models.push(...adapter.availableModels);
    }
    
    return models;
  }
  
  /**
   * Validate all provider connections
   */
  async validateAllConnections(): Promise<Map<AIProvider, boolean>> {
    const results = new Map<AIProvider, boolean>();
    
    const validationPromises = Array.from(this.providers.entries()).map(
      async ([provider, adapter]) => {
        try {
          const isValid = await adapter.validateConnection();
          results.set(provider, isValid);
        } catch (error) {
          results.set(provider, false);
        }
      }
    );
    
    await Promise.all(validationPromises);
    
    return results;
  }
  
  /**
   * Setup health checking for all providers
   */
  private setupHealthChecking(): void {
    setInterval(async () => {
      const results = await this.validateAllConnections();
      
      for (const [provider, isHealthy] of results) {
        if (!isHealthy) {
          this.emit('provider_unhealthy', { provider });
          logger.warn('Provider health check failed', { provider });
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Cleanup all resources
   */
  cleanup(): void {
    for (const adapter of this.providers.values()) {
      adapter.removeAllListeners();
    }
    
    this.providers.clear();
    this.removeAllListeners();
    
    logger.info('ProviderManager cleanup completed');
  }
}

/**
 * Load balancer for provider selection
 */
class LoadBalancer {
  private providerWeights: Map<AIProvider, number> = new Map();
  private lastUsed: Map<AIProvider, Date> = new Map();
  
  /**
   * Select optimal provider based on weights and usage
   */
  selectProvider(availableProviders: AIProvider[], request: any): AIProvider | null {
    if (availableProviders.length === 0) return null;
    if (availableProviders.length === 1) return availableProviders[0];
    
    // Simple round-robin for now
    // Could be enhanced with weighted selection based on performance metrics
    const sortedByLastUsed = availableProviders.sort((a, b) => {
      const aTime = this.lastUsed.get(a)?.getTime() || 0;
      const bTime = this.lastUsed.get(b)?.getTime() || 0;
      return aTime - bTime;
    });
    
    const selected = sortedByLastUsed[0];
    this.lastUsed.set(selected, new Date());
    
    return selected;
  }
  
  /**
   * Update provider weight based on performance
   */
  updateProviderWeight(provider: AIProvider, weight: number): void {
    this.providerWeights.set(provider, weight);
  }
}