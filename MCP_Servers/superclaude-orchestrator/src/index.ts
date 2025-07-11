#!/usr/bin/env node

/**
 * SuperClaude Orchestrator MCP Server
 * Entry point for multi-model coordination and workflow orchestration
 */

import { SuperClaudeOrchestratorServer } from './MCPServer.js';

async function main() {
  const server = new SuperClaudeOrchestratorServer();
  
  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start SuperClaude Orchestrator MCP server:', error);
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