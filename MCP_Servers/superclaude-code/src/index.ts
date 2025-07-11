#!/usr/bin/env node

/**
 * SuperClaude Code MCP Server
 * Entry point for LSP integration and semantic code analysis
 */

import { SuperClaudeCodeServer } from './MCPServer.js';

async function main() {
  // Get workspace root from command line args or environment
  const workspaceRoot = process.env.WORKSPACE_ROOT || process.argv[2] || process.cwd();
  
  const server = new SuperClaudeCodeServer(workspaceRoot);
  
  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start SuperClaude Code MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
  });
}