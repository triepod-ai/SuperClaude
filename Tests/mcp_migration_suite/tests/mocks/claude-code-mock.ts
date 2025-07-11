/**
 * Mock Claude Code System
 * Simulates Claude Code behavior for testing MCP integration
 */

import { EventEmitter } from 'events';
import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import WebSocket from 'ws';

export interface ClaudeCodeToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  user_message?: string;
}

export interface ClaudeCodeResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  duration_ms: number;
  metadata?: Record<string, any>;
}

export interface MockClaudeCodeConfig {
  port: number;
  enableWebSocket: boolean;
  simulateLatency: boolean;
  defaultLatency: number;
}

export class MockClaudeCode extends EventEmitter {
  private app: Express;
  private server?: Server;
  private wsServer?: WebSocket.Server;
  private config: MockClaudeCodeConfig;
  private toolCalls: ClaudeCodeToolCall[] = [];
  private responses: ClaudeCodeResponse[] = [];
  private isRunning = false;

  constructor(config?: Partial<MockClaudeCodeConfig>) {
    super();
    
    this.config = {
      port: 3000,
      enableWebSocket: true,
      simulateLatency: true,
      defaultLatency: 50,
      ...config
    };

    this.app = express();
    this.setupRoutes();
  }

  async initialize(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`🤖 Mock Claude Code started on port ${this.config.port}`);
        
        if (this.config.enableWebSocket) {
          this.setupWebSocket();
        }
        
        this.isRunning = true;
        this.emit('ready');
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('Failed to start Mock Claude Code:', error);
        reject(error);
      });
    });
  }

  async cleanup(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    return new Promise((resolve) => {
      if (this.wsServer) {
        this.wsServer.close();
      }

      if (this.server) {
        this.server.close(() => {
          console.log('🤖 Mock Claude Code stopped');
          this.isRunning = false;
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Tool execution endpoint
    this.app.post('/tools/execute', async (req: Request, res: Response) => {
      const toolCall: ClaudeCodeToolCall = {
        id: req.body.id || `tool-${Date.now()}`,
        name: req.body.name,
        parameters: req.body.parameters || {},
        user_message: req.body.user_message
      };

      const startTime = Date.now();
      
      try {
        // Simulate latency
        if (this.config.simulateLatency) {
          await this.sleep(this.config.defaultLatency);
        }

        // Process the tool call
        const result = await this.processToolCall(toolCall);
        
        const response: ClaudeCodeResponse = {
          id: toolCall.id,
          success: true,
          result,
          duration_ms: Date.now() - startTime
        };

        this.toolCalls.push(toolCall);
        this.responses.push(response);
        
        this.emit('tool-call', toolCall);
        this.emit('tool-response', response);

        res.json(response);
      } catch (error) {
        const response: ClaudeCodeResponse = {
          id: toolCall.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: Date.now() - startTime
        };

        this.responses.push(response);
        this.emit('tool-error', error);

        res.status(500).json(response);
      }
    });

    // MCP bridge endpoint
    this.app.post('/mcp/bridge', async (req: Request, res: Response) => {
      const { event_type, tool_name, parameters, user_message } = req.body;
      
      try {
        // Simulate bridge processing
        await this.sleep(10); // 10ms bridge latency
        
        const bridgeResult = {
          event_type,
          tool_name,
          routed_servers: this.getMCPRouting(tool_name, parameters),
          complexity_score: this.calculateComplexity(tool_name, parameters),
          processing_time_ms: 10
        };

        this.emit('bridge-event', bridgeResult);
        res.json(bridgeResult);
      } catch (error) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Bridge error' 
        });
      }
    });

    // Test data endpoints
    this.app.get('/test/tool-calls', (req: Request, res: Response) => {
      res.json(this.toolCalls);
    });

    this.app.get('/test/responses', (req: Request, res: Response) => {
      res.json(this.responses);
    });

    this.app.delete('/test/reset', (req: Request, res: Response) => {
      this.toolCalls = [];
      this.responses = [];
      res.json({ message: 'Test data reset' });
    });
  }

  private setupWebSocket(): void {
    this.wsServer = new WebSocket.Server({ server: this.server });

    this.wsServer.on('connection', (ws: WebSocket) => {
      console.log('🔌 WebSocket client connected');

      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'tool-call') {
            const result = await this.processToolCall(message.payload);
            ws.send(JSON.stringify({
              type: 'tool-response',
              id: message.id,
              payload: result
            }));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { error: error instanceof Error ? error.message : 'Unknown error' }
          }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
      });
    });
  }

  private async processToolCall(toolCall: ClaudeCodeToolCall): Promise<any> {
    // Simulate different tool behaviors
    switch (toolCall.name) {
      case 'Read':
        return this.simulateReadTool(toolCall.parameters);
      
      case 'Write':
        return this.simulateWriteTool(toolCall.parameters);
      
      case 'Edit':
        return this.simulateEditTool(toolCall.parameters);
      
      case 'Grep':
        return this.simulateGrepTool(toolCall.parameters);
      
      case 'Bash':
        return this.simulateBashTool(toolCall.parameters);
      
      case 'TodoWrite':
        return this.simulateTodoWriteTool(toolCall.parameters);
      
      // MCP tool calls
      case 'mcp__sequential-thinking__sequentialthinking':
        return this.simulateSequentialThinking(toolCall.parameters);
      
      case 'mcp__context7__resolve-library-id':
        return this.simulateContext7ResolveLibrary(toolCall.parameters);
      
      case 'mcp__context7__get-library-docs':
        return this.simulateContext7GetDocs(toolCall.parameters);
      
      default:
        throw new Error(`Unknown tool: ${toolCall.name}`);
    }
  }

  private simulateReadTool(params: any): any {
    return {
      content: `// Sample file content from ${params.file_path}
export function example() {
  console.log('This is example code');
}`,
      lines: 4,
      size: 120
    };
  }

  private simulateWriteTool(params: any): any {
    return {
      file_path: params.file_path,
      bytes_written: params.content ? params.content.length : 0,
      success: true
    };
  }

  private simulateEditTool(params: any): any {
    return {
      file_path: params.file_path,
      changes_made: 1,
      lines_affected: 2,
      success: true
    };
  }

  private simulateGrepTool(params: any): any {
    return {
      matches: [
        'src/example.ts:15: export function example() {',
        'src/utils.ts:23: function exampleUtil() {'
      ],
      total_matches: 2,
      files_searched: 5
    };
  }

  private simulateBashTool(params: any): any {
    return {
      stdout: 'Command executed successfully',
      stderr: '',
      exit_code: 0,
      duration_ms: 150
    };
  }

  private simulateTodoWriteTool(params: any): any {
    return {
      todos_updated: params.todos ? params.todos.length : 0,
      success: true
    };
  }

  private simulateSequentialThinking(params: any): any {
    return {
      thought: params.thought,
      thought_number: params.thoughtNumber || 1,
      total_thoughts: params.totalThoughts || 5,
      next_thought_needed: params.nextThoughtNeeded || false,
      analysis: 'This is a simulated sequential thinking response'
    };
  }

  private simulateContext7ResolveLibrary(params: any): any {
    const mockLibraries = {
      'react': { id: '/facebook/react', name: 'React', trust_score: 10 },
      'typescript': { id: '/microsoft/typescript', name: 'TypeScript', trust_score: 9 },
      'express': { id: '/expressjs/express', name: 'Express.js', trust_score: 9 }
    };

    const library = mockLibraries[params.libraryName as keyof typeof mockLibraries];
    return library ? [library] : [];
  }

  private simulateContext7GetDocs(params: any): any {
    return {
      library_id: params.context7CompatibleLibraryID,
      documentation: 'This is simulated library documentation...',
      code_examples: ['example1.ts', 'example2.ts'],
      topics: ['hooks', 'components', 'api']
    };
  }

  private getMCPRouting(toolName: string, parameters: any): string[] {
    const routing: string[] = [];
    
    // Simulate routing logic
    if (toolName.startsWith('mcp__sequential')) {
      routing.push('superclaude-orchestrator');
    }
    
    if (toolName.startsWith('mcp__context7')) {
      routing.push('superclaude-code');
    }
    
    if (toolName === 'TodoWrite' || toolName === 'Task') {
      routing.push('superclaude-tasks');
    }
    
    // Quality-related tools
    if (['Grep', 'Read', 'Edit'].includes(toolName)) {
      routing.push('superclaude-quality');
    }
    
    // Performance monitoring
    routing.push('superclaude-performance');
    
    return routing;
  }

  private calculateComplexity(toolName: string, parameters: any): number {
    // Simulate complexity scoring
    let complexity = 0.1;
    
    if (toolName.includes('sequential')) complexity += 0.4;
    if (toolName === 'Bash') complexity += 0.3;
    if (parameters?.pattern && parameters.pattern.includes('*')) complexity += 0.2;
    if (parameters?.file_path && parameters.file_path.includes('**')) complexity += 0.2;
    
    return Math.min(complexity, 1.0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test utilities

  getToolCalls(): ClaudeCodeToolCall[] {
    return [...this.toolCalls];
  }

  getResponses(): ClaudeCodeResponse[] {
    return [...this.responses];
  }

  getLastToolCall(): ClaudeCodeToolCall | undefined {
    return this.toolCalls[this.toolCalls.length - 1];
  }

  getLastResponse(): ClaudeCodeResponse | undefined {
    return this.responses[this.responses.length - 1];
  }

  clearHistory(): void {
    this.toolCalls = [];
    this.responses = [];
  }

  async simulateToolCall(name: string, parameters: any, userMessage?: string): Promise<ClaudeCodeResponse> {
    const toolCall: ClaudeCodeToolCall = {
      id: `sim-${Date.now()}`,
      name,
      parameters,
      user_message: userMessage
    };

    const startTime = Date.now();
    
    try {
      const result = await this.processToolCall(toolCall);
      
      const response: ClaudeCodeResponse = {
        id: toolCall.id,
        success: true,
        result,
        duration_ms: Date.now() - startTime
      };

      this.toolCalls.push(toolCall);
      this.responses.push(response);
      
      return response;
    } catch (error) {
      const response: ClaudeCodeResponse = {
        id: toolCall.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime
      };

      this.responses.push(response);
      throw error;
    }
  }

  isReady(): boolean {
    return this.isRunning;
  }

  getUrl(): string {
    return `http://localhost:${this.config.port}`;
  }
}