#!/usr/bin/env node

import { SuperClaudePerformanceServer } from './MCPServer.js';
import { logger } from '@superclaude/shared';

/**
 * Main entry point for SuperClaude Performance MCP Server
 */
async function main() {
  try {
    logger.info('Starting SuperClaude Performance MCP Server...');
    
    const server = new SuperClaudePerformanceServer();
    await server.start();
    
    logger.info('SuperClaude Performance MCP Server started successfully');
  } catch (error) {
    logger.error('Failed to start SuperClaude Performance MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error in main:', error);
  process.exit(1);
});