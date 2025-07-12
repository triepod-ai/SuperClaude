import { logger } from './logger.js';

/**
 * Secure condition evaluator to replace eval() usage
 * Provides safe evaluation of conditional expressions without code injection risks
 */

export interface ConditionToken {
  type: 'variable' | 'operator' | 'number' | 'string' | 'identifier';
  value: string | number;
}

export interface ConditionContext {
  complexity?: number;
  tokenUsage?: number;
  operationType?: string;
  fileCount?: number;
  [key: string]: any;
}

export class SecureConditionEvaluator {
  private static readonly ALLOWED_VARIABLES = [
    'complexity',
    'token-usage', 
    'operation-type',
    'file-count'
  ];

  private static readonly ALLOWED_OPERATORS = [
    '>', '>=', '<', '<=', '==', '===', '!=', '!=='
  ];

  private static readonly ALLOWED_IDENTIFIERS = [
    'and', 'or', 'true', 'false'
  ];

  private static readonly DANGEROUS_KEYWORDS = [
    'eval', 'function', 'constructor', 'prototype', '__proto__', 
    'require', 'import', 'process', 'global', 'window', 'document'
  ];

  /**
   * Safely evaluate a condition string
   */
  public static evaluate(condition: string, context: ConditionContext): boolean {
    try {
      // Sanitize condition
      const sanitized = this.sanitizeCondition(condition);
      if (!sanitized) {
        logger.warn('Condition rejected during sanitization', { condition });
        return false;
      }

      // Parse into tokens
      const tokens = this.parseTokens(sanitized);
      if (!tokens) {
        logger.warn('Failed to parse condition tokens', { condition: sanitized });
        return false;
      }

      // Evaluate tokens
      return this.evaluateTokens(tokens, context);

    } catch (error) {
      logger.error('Error in secure condition evaluation', {
        condition,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Sanitize condition string to prevent injection
   */
  private static sanitizeCondition(condition: string): string | null {
    if (!condition || typeof condition !== 'string') {
      return null;
    }

    // Basic character whitelist
    const allowedPattern = /^[\w\s\-\.><=&|\(\)\"\'0-9]+$/;
    if (!allowedPattern.test(condition)) {
      logger.warn('Condition contains disallowed characters', { condition });
      return null;
    }

    // Check for dangerous keywords
    const lowerCondition = condition.toLowerCase();
    for (const keyword of this.DANGEROUS_KEYWORDS) {
      if (lowerCondition.includes(keyword)) {
        logger.warn('Condition contains dangerous keyword', { condition, keyword });
        return null;
      }
    }

    // Length limit
    if (condition.length > 200) {
      logger.warn('Condition exceeds length limit', { condition, length: condition.length });
      return null;
    }

    return condition.trim();
  }

  /**
   * Parse condition into safe tokens
   */
  private static parseTokens(condition: string): ConditionToken[] | null {
    try {
      const tokens: ConditionToken[] = [];
      
      // Tokenization regex - more restrictive
      const tokenRegex = /(complexity|token-usage|operation-type|file-count)|([><]=?|[=!]==?)|(\d+\.?\d*)|("[\w\-\s]+")|(\w+)/g;
      
      let match;
      while ((match = tokenRegex.exec(condition)) !== null) {
        const [, variable, operator, number, string, identifier] = match;
        
        if (variable) {
          if (this.ALLOWED_VARIABLES.includes(variable)) {
            tokens.push({ type: 'variable', value: variable });
          } else {
            logger.warn('Disallowed variable', { variable });
            return null;
          }
        } else if (operator) {
          if (this.ALLOWED_OPERATORS.includes(operator)) {
            tokens.push({ type: 'operator', value: operator });
          } else {
            logger.warn('Disallowed operator', { operator });
            return null;
          }
        } else if (number) {
          const numValue = parseFloat(number);
          if (isNaN(numValue) || !isFinite(numValue)) {
            logger.warn('Invalid number', { number });
            return null;
          }
          tokens.push({ type: 'number', value: numValue });
        } else if (string) {
          // Remove quotes and validate content
          const stringValue = string.slice(1, -1);
          if (stringValue.length > 50) { // Limit string length
            logger.warn('String value too long', { string: stringValue });
            return null;
          }
          tokens.push({ type: 'string', value: stringValue });
        } else if (identifier) {
          const lowerIdentifier = identifier.toLowerCase();
          if (this.ALLOWED_IDENTIFIERS.includes(lowerIdentifier)) {
            tokens.push({ type: 'identifier', value: lowerIdentifier });
          } else {
            logger.warn('Disallowed identifier', { identifier });
            return null;
          }
        }
      }

      return tokens;
    } catch (error) {
      logger.error('Error parsing tokens', { error, condition });
      return null;
    }
  }

  /**
   * Evaluate tokens safely
   */
  private static evaluateTokens(tokens: ConditionToken[], context: ConditionContext): boolean {
    if (tokens.length === 0) {
      return false;
    }

    // Handle simple three-token expressions: variable operator value
    if (tokens.length === 3) {
      const [left, operator, right] = tokens;
      
      if (left.type === 'variable' && operator.type === 'operator' && 
          (right.type === 'number' || right.type === 'string')) {
        
        const leftValue = this.getVariableValue(left.value as string, context);
        if (leftValue === null) {
          return false;
        }
        
        return this.evaluateComparison(leftValue, operator.value as string, right.value);
      }
    }

    // Handle boolean literals
    if (tokens.length === 1 && tokens[0].type === 'identifier') {
      const value = tokens[0].value as string;
      if (value === 'true') return true;
      if (value === 'false') return false;
    }

    // For now, reject complex expressions
    logger.warn('Complex expression evaluation not supported', { 
      tokenCount: tokens.length,
      tokens: tokens.map(t => ({ type: t.type, value: t.value }))
    });
    return false;
  }

  /**
   * Get variable value from context with validation
   */
  private static getVariableValue(variable: string, context: ConditionContext): any {
    switch (variable) {
      case 'complexity':
        const complexity = context.complexity ?? 0.5;
        return typeof complexity === 'number' && complexity >= 0 && complexity <= 1 ? complexity : null;
        
      case 'token-usage':
        const tokenUsage = context.tokenUsage ?? 0;
        return typeof tokenUsage === 'number' && tokenUsage >= 0 ? tokenUsage / 100000 : null;
        
      case 'operation-type':
        const operationType = context.operationType ?? 'unknown';
        return typeof operationType === 'string' ? operationType : null;
        
      case 'file-count':
        const fileCount = context.fileCount ?? 0;
        return typeof fileCount === 'number' && fileCount >= 0 ? fileCount : null;
        
      default:
        logger.warn('Unknown variable requested', { variable });
        return null;
    }
  }

  /**
   * Safely evaluate comparison operations
   */
  private static evaluateComparison(left: any, operator: string, right: any): boolean {
    try {
      switch (operator) {
        case '>':
          return Number(left) > Number(right);
        case '>=':
          return Number(left) >= Number(right);
        case '<':
          return Number(left) < Number(right);
        case '<=':
          return Number(left) <= Number(right);
        case '==':
        case '===':
          return left === right;
        case '!=':
        case '!==':
          return left !== right;
        default:
          logger.warn('Unsupported operator', { operator });
          return false;
      }
    } catch (error) {
      logger.error('Error in comparison evaluation', { 
        error, left, operator, right 
      });
      return false;
    }
  }
}