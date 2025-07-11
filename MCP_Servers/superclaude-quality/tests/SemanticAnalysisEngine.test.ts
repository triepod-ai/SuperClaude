import { SemanticAnalysisEngine } from '../src/core/SemanticAnalysisEngine.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SemanticAnalysisEngine', () => {
  let engine: SemanticAnalysisEngine;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    engine = new SemanticAnalysisEngine();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'semantic-test-'));
    testFile = path.join(tempDir, 'test.ts');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('analyzeFile', () => {
    it('should analyze a TypeScript file and return comprehensive results', async () => {
      const testContent = `
        import { Component } from 'react';
        import lodash from 'lodash';
        
        /**
         * User management component
         */
        export class UserManager extends Component {
          private users: User[] = [];
          
          constructor(props: any) {
            super(props);
          }
          
          /**
           * Add a new user
           */
          public addUser(user: User): void {
            if (this.validateUser(user)) {
              this.users.push(user);
              this.notifyChange();
            }
          }
          
          private validateUser(user: User): boolean {
            if (!user.name || !user.email) {
              return false;
            }
            
            for (let i = 0; i < this.users.length; i++) {
              if (this.users[i].email === user.email) {
                return false;
              }
            }
            
            return true;
          }
          
          private notifyChange(): void {
            // Notify subscribers
          }
        }
        
        interface User {
          name: string;
          email: string;
          id?: number;
        }
      `;

      await fs.writeFile(testFile, testContent);

      const analysis = await engine.analyzeFile({
        filePath: testFile,
        includePatterns: true,
        includeComplexity: true,
        includeDependencies: true
      });

      // Basic structure checks
      expect(analysis.filePath).toBe(testFile);
      expect(analysis.language).toBe('typescript');
      
      // Complexity analysis
      expect(analysis.complexity).toBeDefined();
      expect(analysis.complexity.cyclomatic).toBeGreaterThan(1);
      expect(analysis.complexity.cognitive).toBeGreaterThan(0);
      expect(analysis.complexity.nestingDepth).toBeGreaterThan(0);
      
      // Maintainability analysis
      expect(analysis.maintainability).toBeDefined();
      expect(analysis.maintainability.index).toBeGreaterThan(0);
      expect(Array.isArray(analysis.maintainability.issues)).toBe(true);
      expect(Array.isArray(analysis.maintainability.suggestions)).toBe(true);
      
      // Dependencies analysis
      expect(analysis.dependencies).toBeDefined();
      expect(Array.isArray(analysis.dependencies.external)).toBe(true);
      expect(analysis.dependencies.external).toContain('react');
      expect(analysis.dependencies.external).toContain('lodash');
      
      // Symbols extraction
      expect(Array.isArray(analysis.symbols)).toBe(true);
      const classSymbols = analysis.symbols.filter(s => s.type === 'class');
      expect(classSymbols.length).toBeGreaterThan(0);
      
      const functionSymbols = analysis.symbols.filter(s => s.type === 'function');
      expect(functionSymbols.length).toBeGreaterThan(0);
      
      // Pattern detection
      expect(Array.isArray(analysis.patterns)).toBe(true);
    });

    it('should detect high complexity and suggest improvements', async () => {
      const complexContent = `
        function complexFunction(a, b, c, d) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                if (d > 0) {
                  for (let i = 0; i < a; i++) {
                    for (let j = 0; j < b; j++) {
                      if (i === j) {
                        while (c > 0) {
                          switch (d) {
                            case 1:
                              return 'one';
                            case 2:
                              return 'two';
                            case 3:
                              return 'three';
                            default:
                              try {
                                throw new Error('Invalid');
                              } catch (e) {
                                console.log(e);
                              }
                          }
                          c--;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          return 'done';
        }
      `;

      await fs.writeFile(testFile, complexContent);

      const analysis = await engine.analyzeFile({
        filePath: testFile,
        includeComplexity: true
      });

      expect(analysis.complexity.cyclomatic).toBeGreaterThan(10);
      expect(analysis.complexity.cognitive).toBeGreaterThan(15);
      expect(analysis.complexity.nestingDepth).toBeGreaterThan(5);
      
      expect(analysis.maintainability.issues.length).toBeGreaterThan(0);
      expect(analysis.maintainability.suggestions.length).toBeGreaterThan(0);
    });

    it('should analyze Python files correctly', async () => {
      const pythonFile = path.join(tempDir, 'test.py');
      const pythonContent = `
        import requests
        from typing import List, Optional
        
        class DataProcessor:
            def __init__(self, config: dict):
                self.config = config
                self.data = []
            
            def process_data(self, items: List[dict]) -> Optional[List[dict]]:
                """Process a list of data items"""
                if not items:
                    return None
                
                processed = []
                for item in items:
                    if self.validate_item(item):
                        processed.append(self.transform_item(item))
                
                return processed
            
            def validate_item(self, item: dict) -> bool:
                required_fields = ['id', 'name', 'value']
                return all(field in item for field in required_fields)
            
            def transform_item(self, item: dict) -> dict:
                return {
                    'id': item['id'],
                    'name': item['name'].strip().lower(),
                    'value': float(item['value'])
                }
      `;

      await fs.writeFile(pythonFile, pythonContent);

      const analysis = await engine.analyzeFile({
        filePath: pythonFile,
        language: 'python'
      });

      expect(analysis.language).toBe('python');
      expect(analysis.dependencies.external).toContain('requests');
      expect(analysis.symbols.some(s => s.name === 'DataProcessor')).toBe(true);
      expect(analysis.complexity.cyclomatic).toBeGreaterThan(1);
    });

    it('should detect design patterns', async () => {
      const singletonContent = `
        class DatabaseConnection {
          private static instance: DatabaseConnection;
          private connection: any;
          
          private constructor() {
            this.connection = null;
          }
          
          public static getInstance(): DatabaseConnection {
            if (!DatabaseConnection.instance) {
              DatabaseConnection.instance = new DatabaseConnection();
            }
            return DatabaseConnection.instance;
          }
          
          public connect(): void {
            // Connection logic
          }
        }
      `;

      await fs.writeFile(testFile, singletonContent);

      const analysis = await engine.analyzeFile({
        filePath: testFile,
        includePatterns: true
      });

      const singletonPattern = analysis.patterns.find(p => p.name === 'Singleton');
      expect(singletonPattern).toBeDefined();
      expect(singletonPattern?.confidence).toBeGreaterThan(0.5);
    });

    it('should identify maintainability issues', async () => {
      const poorlyWrittenContent = `
        function a(x) {
          const y = x;
          const z = y;
          const w = z;
          const v = w;
          const u = v;
          const t = u;
          const s = t;
          // This function is too long and has unclear variable names
          // It also lacks proper documentation
          if (s > 0) {
            return s * 2;
          } else if (s < 0) {
            return s * -1;
          } else {
            return 0;
          }
        }
        
        function b() {} // Too short name
        function c() {} // Too short name
      `;

      await fs.writeFile(testFile, poorlyWrittenContent);

      const analysis = await engine.analyzeFile({
        filePath: testFile
      });

      expect(analysis.maintainability.issues.length).toBeGreaterThan(0);
      expect(analysis.maintainability.suggestions.length).toBeGreaterThan(0);
      
      // Should detect poor variable naming
      const namingIssues = analysis.maintainability.issues.filter(
        issue => issue.includes('naming')
      );
      expect(namingIssues.length).toBeGreaterThan(0);
    });
  });

  describe('language detection', () => {
    it('should detect language from file extension', async () => {
      const jsFile = path.join(tempDir, 'test.js');
      await fs.writeFile(jsFile, 'function test() {}');

      const analysis = await engine.analyzeFile({
        filePath: jsFile
      });

      expect(analysis.language).toBe('javascript');
    });

    it('should use provided language override', async () => {
      await fs.writeFile(testFile, 'function test() {}');

      const analysis = await engine.analyzeFile({
        filePath: testFile,
        language: 'javascript'
      });

      expect(analysis.language).toBe('javascript');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent files', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.ts');

      await expect(engine.analyzeFile({
        filePath: nonExistentFile
      })).rejects.toThrow();
    });

    it('should handle empty files', async () => {
      await fs.writeFile(testFile, '');

      const analysis = await engine.analyzeFile({
        filePath: testFile
      });

      expect(analysis.complexity.cyclomatic).toBe(1); // Base complexity
      expect(analysis.symbols).toHaveLength(0);
    });

    it('should handle malformed code gracefully', async () => {
      const malformedContent = 'this is not valid code { ] ) ( }';
      await fs.writeFile(testFile, malformedContent);

      // Should not throw, but may have limited analysis
      const analysis = await engine.analyzeFile({
        filePath: testFile
      });

      expect(analysis).toBeDefined();
      expect(analysis.filePath).toBe(testFile);
    });
  });
});