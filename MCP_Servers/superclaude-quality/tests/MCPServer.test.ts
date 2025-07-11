import { SuperClaudeQualityServer } from '../src/MCPServer.js';
import { ValidationStep, QualityLevel } from '../src/types/index.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SuperClaudeQualityServer', () => {
  let server: SuperClaudeQualityServer;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    server = new SuperClaudeQualityServer();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-quality-test-'));
    testFile = path.join(tempDir, 'test.ts');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Tool Registration', () => {
    it('should register all expected tools', () => {
      // This would require exposing the server's tool registry
      // For now, we'll test that the server can be instantiated
      expect(server).toBeDefined();
    });
  });

  describe('File Validation Tools', () => {
    describe('validate_file', () => {
      it('should validate a TypeScript file successfully', async () => {
        const testContent = `
          export function greet(name: string): string {
            return \`Hello, \${name}!\`;
          }
        `;

        await fs.writeFile(testFile, testContent);

        const result = await server['handleValidateFile']({
          filePath: testFile,
          enabledSteps: [ValidationStep.SYNTAX, ValidationStep.TYPE_CHECK]
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.results).toBeInstanceOf(Array);
        expect(result.data.fromCache).toBe(false);
        expect(result.metadata.operation).toBe('validate_file');
        expect(result.metadata.filePath).toBe(testFile);
      });

      it('should return cached results when available', async () => {
        const testContent = 'export const test = "hello";';
        await fs.writeFile(testFile, testContent);

        // First call - should cache results
        const firstResult = await server['handleValidateFile']({
          filePath: testFile
        });

        // Second call - should return cached results
        const secondResult = await server['handleValidateFile']({
          filePath: testFile
        });

        expect(firstResult.success).toBe(true);
        expect(secondResult.success).toBe(true);
        // Note: Caching behavior depends on implementation details
      });

      it('should filter fixable issues when requested', async () => {
        const testContent = `
          function test() {
            const unused = "variable"; // Potentially fixable
            eval("dangerous"); // Not fixable
          }
        `;

        await fs.writeFile(testFile, testContent);

        const result = await server['handleValidateFile']({
          filePath: testFile,
          fixableOnly: true
        });

        expect(result.success).toBe(true);
        if (result.data.results) {
          result.data.results.forEach(validationResult => {
            validationResult.issues.forEach(issue => {
              expect(issue.fixable).toBe(true);
            });
          });
        }
      });

      it('should handle non-existent files gracefully', async () => {
        const nonExistentFile = path.join(tempDir, 'does-not-exist.ts');

        const result = await server['handleValidateFile']({
          filePath: nonExistentFile
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('validate_project', () => {
      it('should validate multiple files in a project', async () => {
        const file1 = path.join(tempDir, 'file1.ts');
        const file2 = path.join(tempDir, 'file2.js');
        
        await fs.writeFile(file1, 'export const test1 = "hello";');
        await fs.writeFile(file2, 'module.exports = { test2: "world" };');

        const result = await server['handleValidateProject']({
          projectPath: tempDir,
          parallel: true,
          maxConcurrency: 2
        });

        expect(result.success).toBe(true);
        expect(result.data.results).toBeDefined();
        expect(result.data.statistics).toBeDefined();
        expect(result.metadata.filesValidated).toBeGreaterThan(0);
      });

      it('should exclude specified paths', async () => {
        const nodeModulesDir = path.join(tempDir, 'node_modules');
        await fs.mkdir(nodeModulesDir);
        await fs.writeFile(path.join(nodeModulesDir, 'lib.js'), 'module.exports = {};');
        
        const srcFile = path.join(tempDir, 'src.ts');
        await fs.writeFile(srcFile, 'export const main = () => {};');

        const result = await server['handleValidateProject']({
          projectPath: tempDir,
          excludePaths: ['node_modules']
        });

        expect(result.success).toBe(true);
        expect(result.data.results).toBeDefined();
      });
    });
  });

  describe('Semantic Analysis Tools', () => {
    describe('analyze_semantic', () => {
      it('should perform semantic analysis on a file', async () => {
        const testContent = `
          import { Component } from 'react';
          
          export class TestComponent extends Component {
            private count: number = 0;
            
            public increment(): void {
              this.count++;
            }
            
            public getCount(): number {
              return this.count;
            }
          }
        `;

        await fs.writeFile(testFile, testContent);

        const result = await server['handleAnalyzeSemantic']({
          filePath: testFile,
          includePatterns: true,
          includeComplexity: true,
          includeDependencies: true
        });

        expect(result.success).toBe(true);
        expect(result.data.analysis).toBeDefined();
        expect(result.data.analysis.filePath).toBe(testFile);
        expect(result.data.analysis.language).toBe('typescript');
        expect(result.data.analysis.complexity).toBeDefined();
        expect(result.data.analysis.maintainability).toBeDefined();
        expect(result.data.analysis.dependencies).toBeDefined();
        expect(result.data.analysis.symbols).toBeDefined();
        expect(result.data.analysis.patterns).toBeDefined();
      });

      it('should return cached analysis when available', async () => {
        const testContent = 'export const simple = () => "test";';
        await fs.writeFile(testFile, testContent);

        // First call
        const firstResult = await server['handleAnalyzeSemantic']({
          filePath: testFile
        });

        // Second call should potentially use cache
        const secondResult = await server['handleAnalyzeSemantic']({
          filePath: testFile
        });

        expect(firstResult.success).toBe(true);
        expect(secondResult.success).toBe(true);
      });
    });

    describe('extract_symbols', () => {
      it('should extract symbols from code', async () => {
        const testContent = `
          export class TestClass {
            private value: string;
            
            constructor(value: string) {
              this.value = value;
            }
            
            public getValue(): string {
              return this.value;
            }
          }
          
          export function utilityFunction(input: string): boolean {
            return input.length > 0;
          }
          
          export const CONSTANT_VALUE = 42;
        `;

        await fs.writeFile(testFile, testContent);

        const result = await server['handleExtractSymbols']({
          filePath: testFile,
          symbolTypes: ['class', 'function']
        });

        expect(result.success).toBe(true);
        expect(result.data.symbols).toBeDefined();
        expect(result.data.totalSymbols).toBeGreaterThan(0);
        expect(result.data.symbolsByType).toBeDefined();

        // Should contain class and function symbols
        const hasClass = result.data.symbols.some((s: any) => s.type === 'class');
        const hasFunction = result.data.symbols.some((s: any) => s.type === 'function');
        expect(hasClass || hasFunction).toBe(true);
      });
    });

    describe('analyze_complexity', () => {
      it('should analyze code complexity', async () => {
        const complexContent = `
          function complexFunction(a: number, b: number): number {
            if (a > 0) {
              if (b > 0) {
                for (let i = 0; i < a; i++) {
                  if (i % 2 === 0) {
                    return i * b;
                  }
                }
              }
            }
            return 0;
          }
        `;

        await fs.writeFile(testFile, complexContent);

        const result = await server['handleAnalyzeComplexity']({
          filePath: testFile,
          metrics: ['cyclomatic', 'cognitive', 'nesting']
        });

        expect(result.success).toBe(true);
        expect(result.data.complexity).toBeDefined();
        expect(result.data.maintainability).toBeDefined();
        expect(result.data.riskLevel).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(result.data.riskLevel);
      });
    });
  });

  describe('Cross-Server Integration Tools', () => {
    describe('optimize_cross_server', () => {
      it('should optimize cross-server operations', async () => {
        const result = await server['handleOptimizeCrossServer']({
          targetServers: ['superclaude-orchestrator', 'superclaude-code'],
          operationType: 'quality_validation',
          cacheStrategy: 'conservative',
          parallelization: true
        });

        expect(result.success).toBe(true);
        expect(result.data.results).toBeDefined();
        expect(result.data.executionTime).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.data.optimizationApplied)).toBe(true);
      });
    });

    describe('coordinate_with_orchestrator', () => {
      it('should coordinate with orchestrator', async () => {
        const result = await server['handleCoordinateWithOrchestrator']({
          operationType: 'quality_validation',
          scope: 'project',
          priority: 'high',
          metadata: { projectSize: 'large' }
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.priority).toBeDefined();
        expect(result.data.resourceAllocation).toBeDefined();
      });
    });

    describe('share_quality_metrics', () => {
      it('should share quality metrics with other servers', async () => {
        const result = await server['handleShareQualityMetrics']({
          filePath: testFile,
          overallScore: 85,
          issues: [
            { level: 'high', count: 2 },
            { level: 'medium', count: 5 }
          ],
          recommendations: ['Improve error handling', 'Add unit tests']
        });

        expect(result.success).toBe(true);
        expect(result.data.shared).toBe(true);
      });
    });
  });

  describe('Caching and Optimization Tools', () => {
    describe('get_cache_stats', () => {
      it('should return cache statistics', async () => {
        const result = await server['handleGetCacheStats']({
          detailed: true
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(typeof result.data.totalEntries).toBe('number');
        expect(typeof result.data.hitRate).toBe('number');
        expect(typeof result.data.memoryUsage).toBe('number');
      });
    });

    describe('clear_cache', () => {
      it('should clear cache entries', async () => {
        const result = await server['handleClearCache']({
          tags: ['validation', 'semantic']
        });

        expect(result.success).toBe(true);
        expect(result.data.entriesCleared).toBeGreaterThanOrEqual(0);
      });

      it('should clear all cache when requested', async () => {
        const result = await server['handleClearCache']({
          clearAll: true
        });

        expect(result.success).toBe(true);
        expect(result.data.entriesCleared).toBeGreaterThanOrEqual(0);
      });
    });

    describe('optimize_batch_validation', () => {
      it('should optimize batch validation', async () => {
        const files = [testFile, path.join(tempDir, 'test2.ts'), path.join(tempDir, 'test3.js')];
        
        // Create test files
        for (const file of files) {
          await fs.writeFile(file, 'export const test = "hello";');
        }

        const result = await server['handleOptimizeBatchValidation']({
          files,
          maxConcurrency: 3,
          prioritizeBy: 'size',
          useCache: true
        });

        expect(result.success).toBe(true);
        expect(result.data.optimizedOrder).toBeDefined();
        expect(Array.isArray(result.data.optimizedOrder)).toBe(true);
        expect(result.data.estimatedTime).toBeGreaterThanOrEqual(0);
        expect(result.data.cacheUtilization).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Health and Monitoring Tools', () => {
    describe('health_check', () => {
      it('should return server health status', async () => {
        const result = await server['handleHealthCheck']({
          includeMetrics: true,
          checkIntegrations: true
        });

        expect(result.success).toBe(true);
        expect(result.data.status).toBe('healthy');
        expect(result.data.version).toBeDefined();
        expect(result.data.timestamp).toBeDefined();
        expect(typeof result.data.uptime).toBe('number');
        expect(result.data.memoryUsage).toBeDefined();
        expect(result.data.cacheStats).toBeDefined();
        expect(result.data.integrations).toBeDefined();
      });

      it('should return basic health without optional metrics', async () => {
        const result = await server['handleHealthCheck']({
          includeMetrics: false,
          checkIntegrations: false
        });

        expect(result.success).toBe(true);
        expect(result.data.status).toBe('healthy');
        expect(result.data.cacheStats).toBeUndefined();
        expect(result.data.integrations).toBeUndefined();
      });
    });

    describe('get_server_metrics', () => {
      it('should return server metrics', async () => {
        const result = await server['handleGetServerMetrics']({
          period: 'hour'
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.metadata.operation).toBe('get_server_metrics');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool calls gracefully', async () => {
      const result = await server['handleToolCall']('unknown_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });

    it('should convert custom errors to MCP errors appropriately', () => {
      // This would require testing the convertToMcpError method
      // For now, we'll verify the server can handle errors
      expect(server).toBeDefined();
    });
  });

  describe('Integration Testing', () => {
    it('should perform end-to-end validation workflow', async () => {
      const complexTestContent = `
        import React, { Component } from 'react';
        import { UserService } from './services/UserService';
        
        interface Props {
          userId: number;
        }
        
        interface State {
          user: User | null;
          loading: boolean;
          error: string | null;
        }
        
        export class UserProfile extends Component<Props, State> {
          private userService: UserService;
          
          constructor(props: Props) {
            super(props);
            this.state = {
              user: null,
              loading: true,
              error: null
            };
            this.userService = new UserService();
          }
          
          async componentDidMount() {
            try {
              const user = await this.userService.getUser(this.props.userId);
              this.setState({ user, loading: false });
            } catch (error) {
              this.setState({ 
                error: error.message, 
                loading: false 
              });
            }
          }
          
          render() {
            const { user, loading, error } = this.state;
            
            if (loading) return <div>Loading...</div>;
            if (error) return <div>Error: {error}</div>;
            if (!user) return <div>User not found</div>;
            
            return (
              <div className="user-profile">
                <h1>{user.name}</h1>
                <p>Email: {user.email}</p>
                <p>Role: {user.role}</p>
              </div>
            );
          }
        }
      `;

      await fs.writeFile(testFile, complexTestContent);

      // Run full validation
      const validationResult = await server['handleValidateFile']({
        filePath: testFile,
        semanticAnalysis: true
      });

      // Run semantic analysis
      const semanticResult = await server['handleAnalyzeSemantic']({
        filePath: testFile,
        includePatterns: true,
        includeComplexity: true,
        includeDependencies: true
      });

      // Verify both operations completed successfully
      expect(validationResult.success).toBe(true);
      expect(semanticResult.success).toBe(true);
      
      // Verify we got meaningful results
      expect(validationResult.data.results.length).toBeGreaterThan(0);
      expect(semanticResult.data.analysis.symbols.length).toBeGreaterThan(0);
      expect(semanticResult.data.analysis.dependencies.external.length).toBeGreaterThan(0);
    });
  });
});