import { logger } from './logger.js';

/**
 * Secure template engine to replace unsafe string replacement operations
 * Prevents template injection attacks while providing safe variable substitution
 */

export interface TemplateContext {
  [key: string]: string | number | boolean | undefined;
}

export interface TemplateValidationOptions {
  maxLength?: number;
  allowedVariables?: string[];
  allowedPatterns?: RegExp[];
  requireWhitelist?: boolean;
}

export class SecureTemplateEngine {
  private static readonly DEFAULT_MAX_LENGTH = 10000;
  private static readonly VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;
  
  private static readonly DANGEROUS_PATTERNS = [
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /eval\s*\(/i,
    /function\s*\(/i,
    /constructor/i,
    /__proto__/i,
    /prototype/i,
    /script>/i,
    /<script/i,
    /onclick/i,
    /onload/i,
    /onerror/i
  ];

  private static readonly CODE_TEMPLATE_DEFAULTS = {
    maxLength: 50000, // Larger for code templates
    allowedVariables: [
      'functionName', 'className', 'interfaceName', 'returnType', 
      'visibility', 'parameters', 'body', 'methods', 'properties', 'comma'
    ],
    requireWhitelist: true
  };

  /**
   * Safely process a template with context variables
   */
  public static processTemplate(
    template: string, 
    context: TemplateContext,
    options: TemplateValidationOptions = {}
  ): string {
    try {
      // Validate template safety
      const validatedTemplate = this.validateTemplate(template, options);
      if (!validatedTemplate) {
        throw new Error('Template validation failed');
      }

      // Validate context
      const sanitizedContext = this.sanitizeContext(context, options);

      // Perform safe substitution
      return this.safeSubstitution(validatedTemplate, sanitizedContext, options);

    } catch (error) {
      logger.error('Template processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        templateLength: template.length
      });
      throw new Error(`Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process code generation template with enhanced validation
   */
  public static processCodeTemplate(
    template: string,
    context: TemplateContext
  ): string {
    return this.processTemplate(template, context, this.CODE_TEMPLATE_DEFAULTS);
  }

  /**
   * Validate template for security issues
   */
  private static validateTemplate(
    template: string, 
    options: TemplateValidationOptions
  ): string | null {
    if (!template || typeof template !== 'string') {
      logger.warn('Invalid template input', { template: typeof template });
      return null;
    }

    // Length check
    const maxLength = options.maxLength || this.DEFAULT_MAX_LENGTH;
    if (template.length > maxLength) {
      logger.warn('Template exceeds maximum length', { 
        length: template.length, 
        maxLength 
      });
      return null;
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(template)) {
        logger.warn('Template contains dangerous pattern', { 
          pattern: pattern.source,
          template: template.substring(0, 100) + (template.length > 100 ? '...' : '')
        });
        return null;
      }
    }

    // Validate variable references
    const variables = this.extractVariables(template);
    if (options.requireWhitelist && options.allowedVariables) {
      for (const variable of variables) {
        if (!options.allowedVariables.includes(variable)) {
          logger.warn('Template contains non-whitelisted variable', { 
            variable,
            allowed: options.allowedVariables
          });
          return null;
        }
      }
    }

    return template;
  }

  /**
   * Extract variable names from template
   */
  private static extractVariables(template: string): string[] {
    const variables: string[] = [];
    let match;
    
    const regex = new RegExp(this.VARIABLE_PATTERN);
    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Sanitize context values
   */
  private static sanitizeContext(
    context: TemplateContext,
    options: TemplateValidationOptions
  ): TemplateContext {
    const sanitized: TemplateContext = {};

    for (const [key, value] of Object.entries(context)) {
      // Validate key
      if (!this.isValidVariableName(key)) {
        logger.warn('Invalid variable name in context', { key });
        continue;
      }

      // Check whitelist
      if (options.requireWhitelist && options.allowedVariables) {
        if (!options.allowedVariables.includes(key)) {
          logger.warn('Variable not in whitelist', { key });
          continue;
        }
      }

      // Sanitize value
      const sanitizedValue = this.sanitizeValue(value);
      if (sanitizedValue !== null) {
        sanitized[key] = sanitizedValue;
      }
    }

    return sanitized;
  }

  /**
   * Validate variable name
   */
  private static isValidVariableName(name: string): boolean {
    const validPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    return validPattern.test(name) && name.length <= 50;
  }

  /**
   * Sanitize individual values
   */
  private static sanitizeValue(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      // Length check
      if (value.length > 1000) {
        logger.warn('Value exceeds maximum length', { length: value.length });
        return value.substring(0, 1000);
      }

      // Check for dangerous patterns in values
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(value)) {
          logger.warn('Value contains dangerous pattern', { 
            pattern: pattern.source,
            value: value.substring(0, 50) + (value.length > 50 ? '...' : '')
          });
          return this.escapeString(value);
        }
      }

      return value;
    }

    if (Array.isArray(value)) {
      // Handle array values (e.g., parameters list)
      return value
        .filter(item => typeof item === 'string' || typeof item === 'number')
        .map(item => this.sanitizeValue(item))
        .filter(item => item !== null)
        .join(', ');
    }

    logger.warn('Unsupported value type', { type: typeof value });
    return null;
  }

  /**
   * Escape dangerous characters in strings
   */
  private static escapeString(str: string): string {
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&/g, '&amp;')
      .replace(/\$/g, '&#x24;');
  }

  /**
   * Perform safe template substitution
   */
  private static safeSubstitution(
    template: string,
    context: TemplateContext,
    options: TemplateValidationOptions
  ): string {
    try {
      let result = template;
      const processedVariables = new Set<string>();

      // Replace variables one by one with validation
      result = result.replace(this.VARIABLE_PATTERN, (match, variableName) => {
        // Prevent infinite recursion
        if (processedVariables.has(variableName)) {
          logger.warn('Circular reference detected in template', { variableName });
          return match;
        }

        processedVariables.add(variableName);

        const value = context[variableName];
        if (value === undefined) {
          // Handle missing variables based on policy
          logger.debug('Variable not found in context', { variableName });
          return ''; // Default to empty string
        }

        return String(value);
      });

      // Final validation of result
      if (result.length > (options.maxLength || this.DEFAULT_MAX_LENGTH) * 2) {
        logger.warn('Template result exceeds safe length', { 
          resultLength: result.length 
        });
        return result.substring(0, (options.maxLength || this.DEFAULT_MAX_LENGTH) * 2);
      }

      return result;

    } catch (error) {
      logger.error('Template substitution failed', { error });
      throw new Error('Template substitution failed');
    }
  }

  /**
   * Validate final template output
   */
  public static validateOutput(output: string): boolean {
    try {
      // Check for dangerous patterns in final output
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(output)) {
          logger.warn('Template output contains dangerous pattern', { 
            pattern: pattern.source 
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Output validation failed', { error });
      return false;
    }
  }
}