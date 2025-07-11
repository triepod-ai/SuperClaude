#!/usr/bin/env node

import { SuperClaudeQualityServer } from './MCPServer.js';

/**
 * SuperClaude Quality MCP Server Entry Point
 * 
 * This server provides comprehensive quality validation and semantic analysis
 * capabilities with cross-server optimization and caching.
 */

async function main() {
  try {
    const server = new SuperClaudeQualityServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start SuperClaude Quality MCP Server:', error);
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});