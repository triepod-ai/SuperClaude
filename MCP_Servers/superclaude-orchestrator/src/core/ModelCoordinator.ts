import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@superclaude/shared';
import {
  MultiModelRequest,
  ModelResponse,
  AIProvider,
  ModelCapability,
  ModelProviderError
} from '../types/index.js';
import { AsyncMutex, AtomicCounter, ThreadSafeMap, AtomicBoolean } from '../utils/concurrency.js';

/**
 * Coordinates multiple AI model providers for enhanced responses
 * Thread-safe with atomic operations for provider health management
 */
export class ModelCoordinator extends EventEmitter {
  private providers: ThreadSafeMap<AIProvider, ProviderClient>;
  private capabilityMatrix: ThreadSafeMap<AIProvider, ModelCapability[]>;
  private providerHealth: ThreadSafeMap<AIProvider, ProviderHealthStatus>;
  private healthMutex: AsyncMutex;
  private requestMutex: AsyncMutex;
  private cleanupMutex: AsyncMutex;
  private activeRequests: AtomicCounter;
  private isShuttingDown: AtomicBoolean;

  constructor() {
    super();
    this.providers = new ThreadSafeMap();
    this.capabilityMatrix = new ThreadSafeMap();
    this.providerHealth = new ThreadSafeMap();
    this.healthMutex = new AsyncMutex();
    this.requestMutex = new AsyncMutex();
    this.cleanupMutex = new AsyncMutex();
    this.activeRequests = new AtomicCounter();
    this.isShuttingDown = new AtomicBoolean(false);
    
    this.initializeProviders();
    this.initializeCapabilityMatrix();
  }

  /**
   * Initialize available AI providers with thread safety
   */
  private async initializeProviders(): Promise<void> {
    // Initialize providers with environment-based API keys
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;
    
    // OpenAI providers
    if (openaiApiKey) {
      await this.providers.set('openai-gpt4', new OpenAIProvider('gpt-4', openaiApiKey));
      await this.providers.set('openai-gpt3.5', new OpenAIProvider('gpt-3.5-turbo', openaiApiKey));
      await this.providers.set('openai-gpt4-turbo', new OpenAIProvider('gpt-4-turbo-preview', openaiApiKey));
    }
    
    // Anthropic Claude provider
    if (anthropicApiKey) {
      await this.providers.set('claude', new ClaudeProvider(anthropicApiKey));
      await this.providers.set('claude-opus', new ClaudeProvider(anthropicApiKey, 'claude-3-opus-20240229'));
      await this.providers.set('claude-sonnet', new ClaudeProvider(anthropicApiKey, 'claude-3-sonnet-20240229'));
    }
    
    // Google Gemini provider
    if (googleApiKey) {
      await this.providers.set('google-gemini', new GeminiProvider(googleApiKey));
      await this.providers.set('google-gemini-pro', new GeminiProvider(googleApiKey, 'gemini-pro'));
    }
    
    // Initialize health status atomically
    const providers = await this.providers.keys();
    for (const provider of providers) {
      await this.providerHealth.set(provider, {
        isHealthy: true,
        lastCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        requestCount: 0,
        lastError: undefined
      });
    }
    
    logger.info('Model providers initialized', {
      providerCount: await this.providers.size(),
      enabledProviders: providers,
      apiKeysPresent: {
        openai: !!openaiApiKey,
        anthropic: !!anthropicApiKey,
        google: !!googleApiKey
      }
    });
  }

  /**
   * Initialize capability matrix for providers with thread safety
   */
  private async initializeCapabilityMatrix(): Promise<void> {
    await this.capabilityMatrix.set('claude', [
      'text-generation',
      'code-analysis', 
      'reasoning',
      'creative-writing',
      'summarization',
      'qa-answering'
    ]);
    
    await this.capabilityMatrix.set('openai-gpt4', [
      'text-generation',
      'code-analysis',
      'reasoning', 
      'creative-writing',
      'summarization'
    ]);
    
    await this.capabilityMatrix.set('openai-gpt3.5', [
      'text-generation',
      'summarization',
      'qa-answering'
    ]);
    
    await this.capabilityMatrix.set('google-gemini', [
      'text-generation',
      'reasoning',
      'translation',
      'summarization'
    ]);
  }

  /**
   * Execute multi-model request with proper synchronization
   */
  async executeRequest(request: MultiModelRequest): Promise<ModelResponse[]> {
    // Check if shutting down
    if (this.isShuttingDown.get()) {
      throw new ModelProviderError('ModelCoordinator is shutting down', 'claude');
    }

    const requestRelease = await this.requestMutex.acquire();
    await this.activeRequests.increment();
    
    try {
      // Select optimal providers
      const selectedProviders = await this.selectProviders(request);
      
      logger.info('Executing request with providers', {
        requestId: request.id,
        providers: selectedProviders,
        strategy: request.fallbackStrategy,
        activeRequests: this.activeRequests.get()
      });
      
      // Execute based on fallback strategy
      let responses: ModelResponse[];
      switch (request.fallbackStrategy) {
        case 'parallel':
          responses = await this.executeParallel(request, selectedProviders);
          break;
        case 'sequential':
          responses = await this.executeSequential(request, selectedProviders);
          break;
        case 'consensus':
          responses = await this.executeConsensus(request, selectedProviders);
          break;
        default:
          throw new Error(`Unknown fallback strategy: ${request.fallbackStrategy}`);
      }

      logger.info('Multi-model request completed', {
        requestId: request.id,
        responseCount: responses.length,
        providers: responses.map(r => r.provider)
      });

      return responses;
      
    } catch (error) {
      logger.error('Multi-model request execution failed', {
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      await this.activeRequests.decrement();
      requestRelease();
    }
  }

  /**
   * Select optimal providers for request with thread-safe health checks
   */
  private async selectProviders(request: MultiModelRequest): Promise<AIProvider[]> {
    let candidates: AIProvider[] = [];
    
    // Start with preferred providers if specified
    if (request.preferredProviders && request.preferredProviders.length > 0) {
      for (const provider of request.preferredProviders) {
        const hasProvider = await this.providers.has(provider);
        const isHealthy = await this.isProviderHealthy(provider);
        if (hasProvider && isHealthy) {
          candidates.push(provider);
        }
      }
    }
    
    // If no valid preferred providers, find by capabilities
    if (candidates.length === 0) {
      candidates = await this.findProvidersByCapabilities(request.requiredCapabilities);
    }
    
    // Filter by health and limit count
    const healthyCandidates: AIProvider[] = [];
    for (const provider of candidates) {
      const isHealthy = await this.isProviderHealthy(provider);
      if (isHealthy) {
        healthyCandidates.push(provider);
        if (healthyCandidates.length >= request.maxProviders) {
          break;
        }
      }
    }
    
    if (healthyCandidates.length === 0) {
      throw new ModelProviderError(
        'No healthy providers available for request',
        'claude', // fallback to claude
        { requiredCapabilities: request.requiredCapabilities }
      );
    }
    
    return healthyCandidates;
  }

  /**
   * Find providers by required capabilities with thread safety
   */
  private async findProvidersByCapabilities(capabilities: ModelCapability[]): Promise<AIProvider[]> {
    const candidates: { provider: AIProvider; capabilityCount: number }[] = [];
    
    const capabilities_entries = await this.capabilityMatrix.entries();
    for (const [provider, providerCapabilities] of capabilities_entries) {
      const hasAllCapabilities = capabilities.every(cap => 
        providerCapabilities.includes(cap)
      );
      
      if (hasAllCapabilities) {
        candidates.push({
          provider,
          capabilityCount: providerCapabilities.length
        });
      }
    }
    
    // Sort by capability count (more capable providers first)
    return candidates
      .sort((a, b) => b.capabilityCount - a.capabilityCount)
      .map(c => c.provider);
  }

  /**
   * Execute requests in parallel with atomic result handling
   */
  private async executeParallel(request: MultiModelRequest, providers: AIProvider[]): Promise<ModelResponse[]> {
    const promises = providers.map(provider => 
      this.executeWithProvider(request, provider)
    );
    
    try {
      const results = await Promise.allSettled(promises);
      
      const responses: ModelResponse[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          responses.push(result.value);
        } else {
          logger.warn('Provider failed in parallel execution', {
            requestId: request.id,
            error: result.reason
          });
        }
      }

      return responses;
        
    } catch (error) {
      logger.error('Parallel execution failed', {
        requestId: request.id,
        providers,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Execute requests sequentially with fallback and atomic health updates
   */
  private async executeSequential(request: MultiModelRequest, providers: AIProvider[]): Promise<ModelResponse[]> {
    const responses: ModelResponse[] = [];
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        const response = await this.executeWithProvider(request, provider);
        responses.push(response);
        
        // If we get a high-confidence response, we can stop
        if (response.confidence > 0.8) {
          break;
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn('Provider failed, trying next', {
          provider,
          error: lastError.message
        });
        
        // Mark provider as unhealthy temporarily
        await this.updateProviderHealth(provider, false, 0, lastError.message);
        continue;
      }
    }
    
    if (responses.length === 0 && lastError) {
      throw lastError;
    }
    
    return responses;
  }

  /**
   * Execute with consensus approach
   */
  private async executeConsensus(request: MultiModelRequest, providers: AIProvider[]): Promise<ModelResponse[]> {
    // Execute in parallel
    const responses = await this.executeParallel(request, providers);
    
    if (responses.length < 2) {
      return responses;
    }
    
    // Simple consensus: return responses with above-average confidence
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    
    return responses.filter(response => response.confidence >= avgConfidence);
  }

  /**
   * Execute request with specific provider and atomic health tracking
   */
  private async executeWithProvider(request: MultiModelRequest, provider: AIProvider): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      const providerClient = await this.providers.get(provider);
      if (!providerClient) {
        throw new ModelProviderError(`Provider not found: ${provider}`, provider);
      }
      
      // Create prompt for the task
      const prompt = this.createPromptForTask(request);
      
      // Execute with provider
      const response = await providerClient.generateResponse(prompt, {
        timeout: request.timeout,
        maxTokens: 4000
      });
      
      const executionTime = Date.now() - startTime;
      
      // Atomically update provider health
      await this.updateProviderHealth(provider, true, executionTime);
      
      const modelResponse: ModelResponse = {
        provider,
        requestId: request.id,
        taskId: request.task.id,
        response: response.text,
        confidence: response.confidence || 0.7,
        tokenUsage: response.tokenUsage || 0,
        executionTime,
        metadata: response.metadata || {},
        timestamp: new Date()
      };
      
      // Emit success event
      this.emit('response-received', modelResponse);
      
      return modelResponse;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Atomically update provider health
      await this.updateProviderHealth(provider, false, executionTime, error instanceof Error ? error.message : 'Unknown error');
      
      const providerError = new ModelProviderError(
        `Provider execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider,
        { requestId: request.id, executionTime }
      );
      
      // Emit error event
      this.emit('provider-error', providerError);
      
      throw providerError;
    }
  }

  /**
   * Create prompt for task
   */
  private createPromptForTask(request: MultiModelRequest): string {
    const task = request.task;
    
    let prompt = `Task: ${task.title}\n`;
    
    if (task.description) {
      prompt += `Description: ${task.description}\n`;
    }
    
    if (task.tags && task.tags.length > 0) {
      prompt += `Tags: ${task.tags.join(', ')}\n`;
    }
    
    prompt += `Priority: ${task.priority}\n`;
    prompt += `Complexity: ${task.complexity}\n`;
    
    if (request.requiredCapabilities.length > 0) {
      prompt += `Required capabilities: ${request.requiredCapabilities.join(', ')}\n`;
    }
    
    prompt += `\nPlease provide a comprehensive response for this task.`;
    
    return prompt;
  }

  /**
   * Check if provider is healthy (thread-safe)
   */
  private async isProviderHealthy(provider: AIProvider): Promise<boolean> {
    const health = await this.providerHealth.get(provider);
    if (!health) return false;
    
    // Consider provider unhealthy if error rate is too high or if it's been offline too long
    const timeSinceLastCheck = Date.now() - health.lastCheck.getTime();
    const isStale = timeSinceLastCheck > 300000; // 5 minutes
    
    return health.isHealthy && !isStale && health.errorRate < 0.5;
  }

  /**
   * Atomically update provider health status
   */
  private async updateProviderHealth(
    provider: AIProvider, 
    success: boolean, 
    responseTime?: number, 
    errorMessage?: string
  ): Promise<void> {
    const healthRelease = await this.healthMutex.acquire();
    
    try {
      const currentHealth = await this.providerHealth.get(provider);
      if (!currentHealth) return;
      
      const updatedHealth: ProviderHealthStatus = {
        ...currentHealth,
        lastCheck: new Date(),
        requestCount: currentHealth.requestCount + 1
      };
      
      if (responseTime !== undefined) {
        // Moving average of response time
        const alpha = 0.3; // weight for new value
        updatedHealth.responseTime = currentHealth.responseTime === 0 
          ? responseTime 
          : (alpha * responseTime) + ((1 - alpha) * currentHealth.responseTime);
      }
      
      if (success) {
        updatedHealth.isHealthy = true;
        updatedHealth.errorRate = Math.max(0, currentHealth.errorRate - 0.1);
        updatedHealth.lastError = undefined;
      } else {
        updatedHealth.errorRate = Math.min(1, currentHealth.errorRate + 0.2);
        updatedHealth.isHealthy = updatedHealth.errorRate < 0.5;
        updatedHealth.lastError = errorMessage;
      }
      
      await this.providerHealth.set(provider, updatedHealth);
      
      // Emit health change event if status changed
      if (currentHealth.isHealthy !== updatedHealth.isHealthy) {
        this.emit('provider-health-changed', {
          provider,
          isHealthy: updatedHealth.isHealthy,
          errorRate: updatedHealth.errorRate,
          timestamp: new Date()
        });
      }
      
    } finally {
      healthRelease();
    }
  }

  /**
   * Get provider health status (thread-safe)
   */
  async getProviderHealth(): Promise<Map<AIProvider, ProviderHealthStatus>> {
    const healthEntries = await this.providerHealth.entries();
    return new Map(healthEntries);
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<{
    totalProviders: number;
    healthyProviders: number;
    activeRequests: number;
    isShuttingDown: boolean;
  }> {
    const healthEntries = await this.providerHealth.entries();
    const healthyCount = healthEntries.filter(([, health]) => health.isHealthy).length;
    
    return {
      totalProviders: this.providers.size,
      healthyProviders: healthyCount,
      activeRequests: this.activeRequests.get(),
      isShuttingDown: this.isShuttingDown.get()
    };
  }

  /**
   * Reset provider health (useful for recovery)
   */
  async resetProviderHealth(provider: AIProvider): Promise<void> {
    const healthRelease = await this.healthMutex.acquire();
    try {
      await this.providerHealth.updateIfExists(provider, (health) => ({
        ...health,
        isHealthy: true,
        errorRate: 0,
        lastError: undefined,
        lastCheck: new Date()
      }));
      
      logger.info('Provider health reset', { provider });
    } finally {
      healthRelease();
    }
  }

  /**
   * Cleanup resources with proper synchronization
   */
  async cleanup(): Promise<void> {
    // Mark as shutting down
    await this.isShuttingDown.set(true);
    
    const cleanupRelease = await this.cleanupMutex.acquire();
    try {
      logger.info('Starting ModelCoordinator cleanup', {
        activeRequests: this.activeRequests.get(),
        totalProviders: this.providers.size
      });
      
      // Wait for active requests to complete (with timeout)
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      
      while (this.activeRequests.get() > 0 && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (this.activeRequests.get() > 0) {
        logger.warn('Forcing cleanup with active requests', {
          remainingRequests: this.activeRequests.get()
        });
      }
      
      // Cleanup provider clients
      const providerEntries = await this.providers.entries();
      const cleanupPromises = providerEntries.map(async ([provider, client]) => {
        try {
          await client.cleanup?.();
        } catch (error) {
          logger.warn('Failed to cleanup provider client', {
            provider,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
      
      await Promise.allSettled(cleanupPromises);
      
      // Clear all collections
      await this.providers.clear();
      await this.capabilityMatrix.clear();
      await this.providerHealth.clear();
      await this.activeRequests.reset();
      
      logger.info('ModelCoordinator cleanup completed');
      
    } catch (error) {
      logger.error('Error during ModelCoordinator cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      cleanupRelease();
    }
  }

  /**
   * Graceful shutdown - wait for active requests to complete
   */
  async gracefulShutdown(timeoutMs = 30000): Promise<void> {
    await this.isShuttingDown.set(true);
    
    const startTime = Date.now();
    
    // Wait for active requests to complete
    while (this.activeRequests.get() > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force cleanup if timeout exceeded
    if (this.activeRequests.get() > 0) {
      logger.warn('Graceful shutdown timeout exceeded, forcing cleanup', {
        remainingRequests: this.activeRequests.get()
      });
    }
    
    await this.cleanup();
  }
}

// ==================== PROVIDER INTERFACES ====================

interface ProviderHealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  requestCount: number;
  lastError?: string;
}

interface ProviderResponse {
  text: string;
  confidence?: number;
  tokenUsage?: number;
  metadata?: Record<string, unknown>;
}

interface ProviderOptions {
  timeout?: number;
  maxTokens?: number;
}

abstract class ProviderClient {
  abstract generateResponse(prompt: string, options?: ProviderOptions): Promise<ProviderResponse>;
  async cleanup?(): Promise<void> {}
}

// ==================== PROVIDER IMPLEMENTATIONS ====================

/**
 * Claude provider implementation
 */
class ClaudeProvider extends ProviderClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-sonnet-20240229') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateResponse(prompt: string, options?: ProviderOptions): Promise<ProviderResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      return {
        text: textContent,
        confidence: 0.9, // Claude typically high confidence
        tokenUsage: response.usage.input_tokens + response.usage.output_tokens,
        metadata: { 
          provider: 'claude', 
          model: this.model,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      logger.error('Claude API error', { error: error.message, model: this.model });
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup Claude connection
    logger.debug('Claude provider cleanup completed');
  }
}

/**
 * OpenAI provider implementation
 */
class OpenAIProvider extends ProviderClient {
  private client: OpenAI;
  private model: string;

  constructor(model: string, apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }
  
  async generateResponse(prompt: string, options?: ProviderOptions): Promise<ProviderResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 4000
      });

      const message = response.choices[0]?.message;
      if (!message?.content) {
        throw new Error('No response content from OpenAI');
      }

      return {
        text: message.content,
        confidence: 0.85, // OpenAI typically high confidence
        tokenUsage: response.usage?.total_tokens || 0,
        metadata: { 
          provider: 'openai', 
          model: this.model,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          finishReason: response.choices[0]?.finish_reason
        }
      };
    } catch (error) {
      logger.error('OpenAI API error', { error: error.message, model: this.model });
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup OpenAI connection
    logger.debug(`OpenAI ${this.model} provider cleanup completed`);
  }
}

/**
 * Google Gemini provider implementation
 */
class GeminiProvider extends ProviderClient {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-pro') {
    super();
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async generateResponse(prompt: string, options?: ProviderOptions): Promise<ProviderResponse> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No response content from Gemini');
      }

      return {
        text,
        confidence: 0.8, // Gemini confidence varies
        tokenUsage: await this.estimateTokens(prompt, text),
        metadata: { 
          provider: 'google', 
          model: this.model,
          candidates: response.candidates?.length || 1,
          finishReason: response.candidates?.[0]?.finishReason
        }
      };
    } catch (error) {
      logger.error('Gemini API error', { error: error.message, model: this.model });
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  private async estimateTokens(prompt: string, response: string): Promise<number> {
    // Rough estimation: ~4 characters per token
    return Math.ceil((prompt.length + response.length) / 4);
  }

  async cleanup(): Promise<void> {
    // Cleanup Gemini connection
    logger.debug('Gemini provider cleanup completed');
  }
}