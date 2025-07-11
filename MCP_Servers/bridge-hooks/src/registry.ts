/**
 * Bridge hook registry for managing lightweight hooks
 */

import { logger } from '@superclaude/shared';
import { 
  BridgeHookHandler, 
  BridgeHookRegistration, 
  BridgeHookContext, 
  BridgeHookResult,
  BridgeHookConfig 
} from './types.js';

export class BridgeHookRegistry {
  private hooks: Map<string, BridgeHookRegistration> = new Map();
  private config: BridgeHookConfig;

  constructor(config: Partial<BridgeHookConfig> = {}) {
    this.config = {
      enableMetrics: true,
      enableCaching: false,
      timeout: 30000, // 30 seconds
      maxRetries: 3,
      logLevel: 'info',
      ...config
    };
  }

  /**
   * Register a new bridge hook
   */
  public register(registration: BridgeHookRegistration): void {
    if (this.hooks.has(registration.name)) {
      logger.warn(`Hook '${registration.name}' is already registered, overriding`);
    }

    this.hooks.set(registration.name, registration);
    logger.info(`Registered bridge hook: ${registration.name}`);
  }

  /**
   * Unregister a bridge hook
   */
  public unregister(name: string): boolean {
    const result = this.hooks.delete(name);
    if (result) {
      logger.info(`Unregistered bridge hook: ${name}`);
    }
    return result;
  }

  /**
   * Get a hook by name
   */
  public getHook(name: string): BridgeHookRegistration | undefined {
    return this.hooks.get(name);
  }

  /**
   * Get all registered hooks
   */
  public getAllHooks(): BridgeHookRegistration[] {
    return Array.from(this.hooks.values())
      .filter(hook => hook.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute a specific hook
   */
  public async executeHook(
    name: string, 
    context: BridgeHookContext
  ): Promise<BridgeHookResult> {
    const hook = this.hooks.get(name);
    
    if (!hook) {
      return {
        success: false,
        error: `Hook '${name}' not found`
      };
    }

    if (!hook.enabled) {
      return {
        success: false,
        error: `Hook '${name}' is disabled`
      };
    }

    const startTime = performance.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<BridgeHookResult>((_, reject) => {
        setTimeout(() => reject(new Error('Hook execution timeout')), this.config.timeout);
      });

      // Execute hook with timeout
      const result = await Promise.race([
        hook.handler(context),
        timeoutPromise
      ]);

      const duration = performance.now() - startTime;

      // Add performance metadata
      const enrichedResult: BridgeHookResult = {
        ...result,
        performance: {
          duration,
          ...result.performance
        }
      };

      if (this.config.enableMetrics) {
        logger.debug(`Hook '${name}' executed successfully`, { 
          duration,
          tokenUsage: result.performance?.tokenUsage 
        });
      }

      return enrichedResult;

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`Hook '${name}' execution failed`, { 
        error: errorMessage,
        duration 
      });

      return {
        success: false,
        error: errorMessage,
        performance: { duration }
      };
    }
  }

  /**
   * Execute hooks with retry logic
   */
  public async executeHookWithRetry(
    name: string,
    context: BridgeHookContext,
    maxRetries: number = this.config.maxRetries
  ): Promise<BridgeHookResult> {
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.executeHook(name, context);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error || 'Unknown error';
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        logger.warn(`Hook '${name}' failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      error: `Hook failed after ${maxRetries} attempts. Last error: ${lastError}`
    };
  }

  /**
   * Execute multiple hooks in sequence
   */
  public async executeHooks(
    names: string[], 
    context: BridgeHookContext
  ): Promise<BridgeHookResult[]> {
    const results: BridgeHookResult[] = [];
    
    for (const name of names) {
      const result = await this.executeHook(name, context);
      results.push(result);
      
      // Stop on first failure if configured
      if (!result.success) {
        logger.warn(`Hook sequence stopped at '${name}' due to failure`);
        break;
      }
    }
    
    return results;
  }

  /**
   * Enable or disable a hook
   */
  public setHookEnabled(name: string, enabled: boolean): boolean {
    const hook = this.hooks.get(name);
    if (!hook) {
      return false;
    }
    
    hook.enabled = enabled;
    logger.info(`Hook '${name}' ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalHooks: number;
    enabledHooks: number;
    disabledHooks: number;
    hooksByPriority: { name: string; priority: number }[];
  } {
    const hooks = Array.from(this.hooks.values());
    
    return {
      totalHooks: hooks.length,
      enabledHooks: hooks.filter(h => h.enabled).length,
      disabledHooks: hooks.filter(h => !h.enabled).length,
      hooksByPriority: hooks
        .map(h => ({ name: h.name, priority: h.priority }))
        .sort((a, b) => b.priority - a.priority)
    };
  }

  /**
   * Clear all hooks
   */
  public clear(): void {
    this.hooks.clear();
    logger.info('All bridge hooks cleared');
  }
}