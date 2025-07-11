import { z } from 'zod';
import { SuperClaudeError, ErrorSeverity } from '../types/common.js';

/**
 * Validation utilities for SuperClaude MCP servers
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Validator {
  /**
   * Validate data against a Zod schema
   */
  public static validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: Record<string, unknown>
  ): T {
    const result = schema.safeParse(data);
    
    if (!result.success) {
      throw new ValidationError(
        `Validation failed: ${result.error.message}`,
        result.error,
        context
      );
    }
    
    return result.data;
  }

  /**
   * Validate data and return result with success flag
   */
  public static safeValidate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  }

  /**
   * Create a SuperClaude error from validation failure
   */
  public static createValidationError(
    zodError: z.ZodError,
    context?: Record<string, unknown>
  ): SuperClaudeError {
    return {
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${zodError.message}`,
      severity: 'error' as ErrorSeverity,
      context: {
        validationErrors: zodError.errors,
        ...context
      },
      timestamp: new Date()
    };
  }

  /**
   * Validate file path format
   */
  public static validateFilePath(path: string): boolean {
    // Basic path validation - can be enhanced based on requirements
    const pathRegex = /^[a-zA-Z0-9._/-]+$/;
    return pathRegex.test(path) && !path.includes('..');
  }

  /**
   * Validate task ID format
   */
  public static validateTaskId(taskId: string): boolean {
    const taskIdRegex = /^[a-zA-Z0-9-_]+$/;
    return taskIdRegex.test(taskId) && taskId.length >= 3 && taskId.length <= 50;
  }

  /**
   * Validate token count is within reasonable bounds
   */
  public static validateTokenCount(tokens: number): boolean {
    return tokens >= 0 && tokens <= 1000000; // Max 1M tokens
  }

  /**
   * Validate complexity score
   */
  public static validateComplexityScore(score: number): boolean {
    return score >= 0 && score <= 1;
  }
}