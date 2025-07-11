/**
 * Test Environment Manager
 * Handles setup and teardown of test infrastructure
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { EventEmitter } from 'events';

export interface MCPServerConfig {
  name: string;
  port: number;
  command: string;
  args: string[];
  cwd: string;
  healthCheck: string;
}

export interface TestEnvironmentConfig {
  mcpServers: MCPServerConfig[];
  mockClaudeCodePort: number;
  testDataPath: string;
  tempDir: string;
  timeouts: {
    serverStart: number;
    serverStop: number;
    healthCheck: number;
  };
}

export class TestEnvironment extends EventEmitter {
  private config: TestEnvironmentConfig;
  private runningServers: Map<string, ChildProcess> = new Map();
  private isSetup = false;

  constructor(config?: Partial<TestEnvironmentConfig>) {
    super();
    this.config = {
      mcpServers: [
        {
          name: 'superclaude-tasks',
          port: 3001,
          command: 'npm',
          args: ['start'],
          cwd: '../../../MCP_Servers/superclaude-tasks',
          healthCheck: '/health'
        },
        {
          name: 'superclaude-orchestrator', 
          port: 3002,
          command: 'npm',
          args: ['start'],
          cwd: '../../../MCP_Servers/superclaude-orchestrator',
          healthCheck: '/health'
        },
        {
          name: 'superclaude-code',
          port: 3003,
          command: 'npm',
          args: ['start'],
          cwd: '../../../MCP_Servers/superclaude-code',
          healthCheck: '/health'
        },
        {
          name: 'superclaude-quality',
          port: 3004,
          command: 'npm',
          args: ['start'],
          cwd: '../../../MCP_Servers/superclaude-quality',
          healthCheck: '/health'
        },
        {
          name: 'superclaude-performance',
          port: 3005,
          command: 'npm',
          args: ['start'],
          cwd: '../../../MCP_Servers/superclaude-performance',
          healthCheck: '/health'
        }
      ],
      mockClaudeCodePort: 3000,
      testDataPath: './test-data',
      tempDir: './temp',
      timeouts: {
        serverStart: 30000,
        serverStop: 10000,
        healthCheck: 5000
      },
      ...config
    };
  }

  async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    console.log('🔧 Setting up test environment...');

    try {
      // Create necessary directories
      await this.createDirectories();
      
      // Setup test data
      await this.setupTestData();
      
      // Start MCP servers
      await this.startMCPServers();
      
      // Validate all servers are running
      await this.validateServers();
      
      this.isSetup = true;
      this.emit('ready');
      
      console.log('✅ Test environment setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      await this.cleanup();
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (!this.isSetup) {
      return;
    }

    console.log('🧹 Cleaning up test environment...');

    try {
      // Stop all MCP servers
      await this.stopMCPServers();
      
      // Clean up temporary files
      await this.cleanupTempFiles();
      
      this.isSetup = false;
      this.emit('cleanup');
      
      console.log('✅ Test environment cleanup complete');
    } catch (error) {
      console.error('⚠️ Cleanup encountered errors:', error);
      // Don't throw on cleanup errors
    }
  }

  private async createDirectories(): Promise<void> {
    const dirs = [this.config.testDataPath, this.config.tempDir];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async setupTestData(): Promise<void> {
    const testDataPath = this.config.testDataPath;
    
    // Create sample project structure for testing
    const sampleProject = path.join(testDataPath, 'sample-project');
    await fs.mkdir(sampleProject, { recursive: true });
    
    // Create sample files
    const files = {
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0',
          'typescript': '^5.0.0'
        }
      }, null, 2),
      'src/index.ts': `// Sample TypeScript file
export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

export default hello;`,
      'src/components/Button.tsx': `// Sample React component
import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, disabled }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};`,
      'README.md': `# Test Project

This is a sample project for testing purposes.`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true
        }
      }, null, 2)
    };

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(sampleProject, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  private async startMCPServers(): Promise<void> {
    console.log('🚀 Starting MCP servers...');
    
    const startPromises = this.config.mcpServers.map(async (serverConfig) => {
      return this.startServer(serverConfig);
    });

    await Promise.all(startPromises);
  }

  private async startServer(config: MCPServerConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverPath = path.resolve(config.cwd);
      
      console.log(`  Starting ${config.name} on port ${config.port}...`);
      
      const process = spawn(config.command, config.args, {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: config.port.toString(),
          NODE_ENV: 'test'
        }
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('error', (error) => {
        console.error(`  ❌ Failed to start ${config.name}:`, error.message);
        reject(error);
      });

      // Wait for server to start
      const timeout = setTimeout(() => {
        console.error(`  ❌ ${config.name} failed to start within timeout`);
        console.error(`     Output: ${output}`);
        console.error(`     Error: ${errorOutput}`);
        process.kill();
        reject(new Error(`Server ${config.name} start timeout`));
      }, this.config.timeouts.serverStart);

      // Check if server is ready
      const checkReady = setInterval(async () => {
        try {
          await axios.get(`http://localhost:${config.port}${config.healthCheck}`, {
            timeout: 1000
          });
          
          clearTimeout(timeout);
          clearInterval(checkReady);
          
          this.runningServers.set(config.name, process);
          console.log(`  ✅ ${config.name} started successfully`);
          resolve();
        } catch (error) {
          // Server not ready yet, continue checking
        }
      }, 1000);
    });
  }

  private async stopMCPServers(): Promise<void> {
    console.log('🛑 Stopping MCP servers...');
    
    const stopPromises = Array.from(this.runningServers.entries()).map(
      ([name, process]) => this.stopServer(name, process)
    );

    await Promise.allSettled(stopPromises);
    this.runningServers.clear();
  }

  private async stopServer(name: string, process: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      console.log(`  Stopping ${name}...`);
      
      const timeout = setTimeout(() => {
        console.log(`  ⚠️ Force killing ${name}`);
        process.kill('SIGKILL');
        resolve();
      }, this.config.timeouts.serverStop);

      process.on('exit', () => {
        clearTimeout(timeout);
        console.log(`  ✅ ${name} stopped`);
        resolve();
      });

      process.kill('SIGTERM');
    });
  }

  private async validateServers(): Promise<void> {
    console.log('🔍 Validating server health...');
    
    const validationPromises = this.config.mcpServers.map(async (config) => {
      try {
        const response = await axios.get(
          `http://localhost:${config.port}${config.healthCheck}`,
          { timeout: this.config.timeouts.healthCheck }
        );
        
        if (response.status === 200) {
          console.log(`  ✅ ${config.name} health check passed`);
          return true;
        } else {
          console.error(`  ❌ ${config.name} health check failed: ${response.status}`);
          return false;
        }
      } catch (error) {
        console.error(`  ❌ ${config.name} health check error:`, error);
        return false;
      }
    });

    const results = await Promise.all(validationPromises);
    const allHealthy = results.every(Boolean);
    
    if (!allHealthy) {
      throw new Error('Not all MCP servers passed health checks');
    }
  }

  private async cleanupTempFiles(): Promise<void> {
    try {
      await fs.rm(this.config.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Warning: Could not clean up temp files:', error);
    }
  }

  // Utility methods for tests
  
  async getMCPServerUrl(serverName: string): Promise<string> {
    const config = this.config.mcpServers.find(s => s.name === serverName);
    if (!config) {
      throw new Error(`Unknown MCP server: ${serverName}`);
    }
    return `http://localhost:${config.port}`;
  }

  getTestDataPath(relativePath?: string): string {
    return relativePath 
      ? path.join(this.config.testDataPath, relativePath)
      : this.config.testDataPath;
  }

  getTempPath(relativePath?: string): string {
    return relativePath
      ? path.join(this.config.tempDir, relativePath)
      : this.config.tempDir;
  }

  async createTempFile(fileName: string, content: string): Promise<string> {
    const filePath = path.join(this.config.tempDir, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return filePath;
  }

  async readTestFile(relativePath: string): Promise<string> {
    const filePath = path.join(this.config.testDataPath, relativePath);
    return fs.readFile(filePath, 'utf-8');
  }

  isReady(): boolean {
    return this.isSetup;
  }

  getRunningServers(): string[] {
    return Array.from(this.runningServers.keys());
  }
}