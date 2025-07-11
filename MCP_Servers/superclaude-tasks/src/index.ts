#!/usr/bin/env node

/**
 * SuperClaude Tasks MCP Server
 * Entry point for the MCP server providing task management, decomposition, and PRD parsing
 */

import { SuperClaudeTasksServer } from './core/MCPServer.js';

async function main() {
  const server = new SuperClaudeTasksServer();
  
  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start SuperClaude Tasks MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
  });
}