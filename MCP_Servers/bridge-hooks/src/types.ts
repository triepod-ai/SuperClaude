/**
 * Types for SuperClaude bridge hooks
 */

import { Task, PersonaType, ComplexityLevel } from '@superclaude/shared';

export interface BridgeHookContext {
  operation: string;
  args: Record<string, unknown>;
  persona?: PersonaType;
  complexity?: ComplexityLevel;
  flags: string[];
  sessionId: string;
  timestamp: Date;
}

export interface BridgeHookResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  performance?: {
    duration: number;
    tokenUsage?: number;
  };
}

export type BridgeHookHandler = (
  context: BridgeHookContext
) => Promise<BridgeHookResult>;

export interface BridgeHookRegistration {
  name: string;
  handler: BridgeHookHandler;
  priority: number;
  enabled: boolean;
  description?: string;
}

export interface BridgeHookConfig {
  enableMetrics: boolean;
  enableCaching: boolean;
  timeout: number;
  maxRetries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}