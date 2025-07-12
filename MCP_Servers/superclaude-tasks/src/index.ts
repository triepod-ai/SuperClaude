#!/usr/bin/env node

/**
 * SuperClaude Tasks MCP Server
 * Entry point for the MCP server providing task management, decomposition, and PRD parsing
 */

import { SuperClaudeTasksServer } from './core/MCPServer.js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  // Load configuration if available
  let config = {};
  const configPath = process.env.SUPERCLAUDE_TASKS_CONFIG || join(process.cwd(), 'config.json');
  
  try {
    const configFile = readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
    console.error('Loaded configuration from:', configPath);
  } catch (error) {
    console.error('No configuration file found or invalid JSON, using defaults');
    // Use environment variables for basic configuration
    config = {
      enablePersistence: process.env.ENABLE_PERSISTENCE === 'true',
      enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
      enableScheduling: process.env.ENABLE_SCHEDULING !== 'false',
      enableLearning: process.env.ENABLE_LEARNING !== 'false',
      enableLSP: process.env.ENABLE_LSP === 'true',
      enableAI: process.env.ENABLE_AI === 'true',
      database: process.env.DATABASE_URL ? {
        type: 'postgresql',
        connection: {
          connectionString: process.env.DATABASE_URL
        }
      } : undefined
    };
  }

  const server = new SuperClaudeTasksServer(config);
  
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