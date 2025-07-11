/**
 * SuperClaude Bridge Hooks
 * 
 * Lightweight bridge hooks for integrating SuperClaude functionality
 * with Claude Code without requiring full MCP server setup.
 */

export * from './types.js';
export * from './registry.js';

// Export commonly used shared utilities
export { logger, type Task, type PersonaType } from '@superclaude/shared';