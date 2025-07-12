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
   * Validate file path format with enhanced security
   */
  public static validateFilePath(path: string): boolean {
    if (!path || typeof path !== 'string') {
      return false;
    }

    // Length check
    if (path.length > 500) {
      return false;
    }

    // Path traversal protection
    if (path.includes('..') || path.includes('~')) {
      return false;
    }

    // Null byte protection
    if (path.includes('\0')) {
      return false;
    }

    // Enhanced pattern for secure paths
    const pathRegex = /^[a-zA-Z0-9._/-]+$/;
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      /\/\.\./,      // Path traversal
      /\.\.\//,      // Path traversal
      /\/etc\//,     // System directories
      /\/proc\//,    // System directories
      /\/sys\//,     // System directories
      /\/dev\//,     // Device files
      /\/tmp\//,     // Temp directory access
      /\/root\//,    // Root directory
      /\/home\/[^/]*\/\.[^/]/, // Hidden files in home dirs
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(path)) {
        return false;
      }
    }

    return pathRegex.test(path);
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

  /**
   * Validate URL format with security restrictions
   */
  public static validateUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Length check
    if (url.length > 2048) {
      return false;
    }

    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }

      // Prevent localhost/private network access in production
      const hostname = parsedUrl.hostname.toLowerCase();
      const privatePatterns = [
        /^localhost$/,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^::1$/,
        /^fc00:/,
        /^fe80:/
      ];

      for (const pattern of privatePatterns) {
        if (pattern.test(hostname)) {
          // Allow in development but log warning
          logger.warn('Private network access attempted', { hostname });
          return process.env.NODE_ENV === 'development';
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate command strings for shell execution
   */
  public static validateCommand(command: string): boolean {
    if (!command || typeof command !== 'string') {
      return false;
    }

    // Length check
    if (command.length > 1000) {
      return false;
    }

    // Check for dangerous command patterns
    const dangerousPatterns = [
      /rm\s+-rf/,     // Dangerous file deletion
      /sudo/,         // Privilege escalation
      /chmod\s+777/,  // Dangerous permissions
      />\s*\/dev/,    // Device access
      /\|.*curl/,     // Command chaining with network
      /\|.*wget/,     // Command chaining with network
      /\$\(/,         // Command substitution
      /`[^`]*`/,      // Command substitution
      /&&.*rm/,       // Command chaining with deletion
      /;.*rm/,        // Command chaining with deletion
      /eval/,         // Code evaluation
      /exec/,         // Process execution
      /\/bin\/sh/,    // Shell access
      /\/bin\/bash/,  // Shell access
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate JSON string safely
   */
  public static validateJsonString(jsonStr: string): boolean {
    if (!jsonStr || typeof jsonStr !== 'string') {
      return false;
    }

    // Length check
    if (jsonStr.length > 100000) {
      return false;
    }

    try {
      const parsed = JSON.parse(jsonStr);
      
      // Check for prototype pollution attempts
      if (typeof parsed === 'object' && parsed !== null) {
        return !this.containsPrototypePollution(parsed);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check for prototype pollution in objects
   */
  private static containsPrototypePollution(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        return true;
      }
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (this.containsPrototypePollution(obj[key])) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate email format
   */
  public static validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate language identifier
   */
  public static validateLanguageId(langId: string): boolean {
    if (!langId || typeof langId !== 'string') {
      return false;
    }

    const validLanguages = [
      'typescript', 'javascript', 'python', 'java', 'cpp', 'c',
      'rust', 'go', 'csharp', 'php', 'ruby', 'swift', 'kotlin'
    ];

    return validLanguages.includes(langId.toLowerCase());
  }

  /**
   * Validate base64 encoded content
   */
  public static validateBase64(base64Str: string): boolean {
    if (!base64Str || typeof base64Str !== 'string') {
      return false;
    }

    // Length check (10MB max)
    if (base64Str.length > 14000000) {
      return false;
    }

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(base64Str);
  }
}

/**
 * Comprehensive validation schemas for MCP tool parameters
 */
export const MCPValidationSchemas = {
  // File operations
  filePath: z.string()
    .min(1)
    .max(500)
    .refine(Validator.validateFilePath, 'Invalid or unsafe file path'),

  // Network operations  
  url: z.string()
    .min(1)
    .max(2048)
    .refine(Validator.validateUrl, 'Invalid or unsafe URL'),

  // Command execution
  command: z.string()
    .min(1)
    .max(1000)
    .refine(Validator.validateCommand, 'Invalid or unsafe command'),

  // Identifiers
  taskId: z.string()
    .min(3)
    .max(50)
    .refine(Validator.validateTaskId, 'Invalid task ID format'),

  languageId: z.string()
    .min(1)
    .max(20)
    .refine(Validator.validateLanguageId, 'Unsupported language'),

  // Content validation
  jsonString: z.string()
    .max(100000)
    .refine(Validator.validateJsonString, 'Invalid or unsafe JSON'),

  base64Content: z.string()
    .max(14000000)
    .refine(Validator.validateBase64, 'Invalid base64 content'),

  // Numeric constraints
  tokenCount: z.number()
    .int()
    .min(0)
    .max(1000000),

  complexityScore: z.number()
    .min(0)
    .max(1),

  // Common text fields
  shortText: z.string()
    .min(1)
    .max(100),

  mediumText: z.string()
    .min(1)
    .max(1000),

  longText: z.string()
    .min(1)
    .max(10000),

  // Email validation
  email: z.string()
    .email()
    .max(254)
    .refine(Validator.validateEmail, 'Invalid email format')
};