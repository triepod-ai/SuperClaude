#!/usr/bin/env node

import { SuperClaudeUIServer } from './MCPServer.js';

async function main() {
  const server = new SuperClaudeUIServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  try {
    await server.run();
  } catch (error) {
    console.error('Failed to start SuperClaude UI Server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { SuperClaudeUIServer };