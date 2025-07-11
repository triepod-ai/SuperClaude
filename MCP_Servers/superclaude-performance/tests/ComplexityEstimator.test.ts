import { ComplexityEstimator } from '../src/core/ComplexityEstimator.js';
import { ComplexityEstimationError } from '../src/types/index.js';
import { promises as fs } from 'fs';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn()
  }
}));

jest.mock('@superclaude/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ComplexityEstimator', () => {
  let estimator: ComplexityEstimator;

  beforeEach(() => {
    estimator = new ComplexityEstimator();
    jest.clearAllMocks();
  });

  describe('File Complexity Analysis', () => {
    test('should analyze TypeScript file complexity', async () => {
      const sampleCode = `
        function complexFunction(param: string): number {
          if (param.length > 10) {
            for (let i = 0; i < param.length; i++) {
              if (param[i] === 'a') {
                return i;
              }
            }
          }
          return -1;
        }
        
        class TestClass {
          private value: number;
          
          constructor(value: number) {
            this.value = value;
          }
          
          public process(): void {
            while (this.value > 0) {
              this.value--;
            }
          }
        }
      `;

      mockFs.readFile.mockResolvedValue(sampleCode);

      const metrics = await estimator.analyzeFileComplexity('./test.ts');

      expect(metrics).toBeDefined();
      expect(metrics.cyclomatic).toBeGreaterThan(0);
      expect(metrics.cognitive).toBeGreaterThan(0);
      expect(metrics.functions).toBeGreaterThan(0);
      expect(metrics.classes).toBeGreaterThan(0);
      expect(metrics.lines).toBeGreaterThan(0);
    });

    test('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(estimator.analyzeFileComplexity('./nonexistent.ts'))
        .rejects.toThrow(ComplexityEstimationError);
    });

    test('should cache complexity analysis results', async () => {
      const sampleCode = 'function simple() { return 1; }';
      mockFs.readFile.mockResolvedValue(sampleCode);

      // First call
      await estimator.analyzeFileComplexity('./test.ts');
      
      // Second call should use cache
      const result = await estimator.analyzeFileComplexity('./test.ts');

      expect(result).toBeDefined();
      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Should only read once
    });
  });

  describe('Complexity Estimation', () => {
    test('should estimate file complexity', async () => {
      const sampleCode = `
        function fibonacci(n: number): number {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
      `;

      mockFs.readFile.mockResolvedValue(sampleCode);

      const estimation = await estimator.estimateComplexity('./test.ts', 'file');

      expect(estimation).toBeDefined();
      expect(estimation.overall).toBeGreaterThanOrEqual(0);
      expect(estimation.overall).toBeLessThanOrEqual(1);
      expect(estimation.categories).toBeDefined();
      expect(estimation.factors).toBeDefined();
      expect(estimation.recommendations).toBeDefined();
      expect(estimation.estimatedDevelopmentTime).toBeGreaterThan(0);
      expect(estimation.estimatedTestingTime).toBeGreaterThan(0);
    });

    test('should estimate snippet complexity', async () => {
      const snippet = `
        for (let i = 0; i < 10; i++) {
          if (i % 2 === 0) {
            console.log(i);
          }
        }
      `;

      const estimation = await estimator.estimateComplexity(snippet, 'snippet', {
        language: 'javascript'
      });

      expect(estimation).toBeDefined();
      expect(estimation.overall).toBeGreaterThanOrEqual(0);
      expect(estimation.categories.algorithmic).toBeGreaterThanOrEqual(0);
    });

    test('should handle unsupported estimation type', async () => {
      await expect(estimator.estimateComplexity('./test.ts', 'unsupported' as any))
        .rejects.toThrow(ComplexityEstimationError);
    });
  });

  describe('Language Detection', () => {
    test('should detect TypeScript files', () => {
      const language = estimator['detectLanguage']('./test.ts');
      expect(language).toBe('typescript');
    });

    test('should detect JavaScript files', () => {
      const language = estimator['detectLanguage']('./test.js');
      expect(language).toBe('javascript');
    });

    test('should detect Python files', () => {
      const language = estimator['detectLanguage']('./test.py');
      expect(language).toBe('python');
    });

    test('should default to JavaScript for unknown extensions', () => {
      const language = estimator['detectLanguage']('./test.xyz');
      expect(language).toBe('javascript');
    });
  });

  describe('Complexity Calculations', () => {
    test('should calculate cyclomatic complexity', () => {
      const code = `
        function test(x) {
          if (x > 0) {
            for (let i = 0; i < x; i++) {
              if (i % 2 === 0) {
                return i;
              }
            }
          }
          return -1;
        }
      `;

      const complexity = estimator['calculateCyclomaticComplexity'](code, 'javascript');
      expect(complexity).toBeGreaterThan(1); // Should be > 1 due to decisions
    });

    test('should calculate cognitive complexity', () => {
      const code = `
        function nested(x) {
          if (x > 0) {
            for (let i = 0; i < x; i++) {
              if (i % 2 === 0) {
                console.log(i);
              }
            }
          }
        }
      `;

      const complexity = estimator['calculateCognitiveComplexity'](code, 'javascript');
      expect(complexity).toBeGreaterThan(0);
    });

    test('should calculate nesting depth', () => {
      const code = `
        function deep() {
          if (true) {
            for (let i = 0; i < 10; i++) {
              if (i % 2 === 0) {
                while (i > 0) {
                  console.log(i);
                }
              }
            }
          }
        }
      `;

      const depth = estimator['calculateMaxNestingDepth'](code, 'javascript');
      expect(depth).toBeGreaterThan(1);
    });

    test('should count functions', () => {
      const code = `
        function first() {}
        const second = function() {};
        const third = () => {};
      `;

      const count = estimator['countFunctions'](code, 'javascript');
      expect(count).toBeGreaterThanOrEqual(2); // Should detect at least 2
    });

    test('should count classes', () => {
      const code = `
        class FirstClass {}
        class SecondClass extends FirstClass {}
      `;

      const count = estimator['countClasses'](code, 'javascript');
      expect(count).toBe(2);
    });

    test('should count dependencies', () => {
      const code = `
        import { something } from 'library1';
        import * as lib2 from 'library2';
        const lib3 = require('library3');
      `;

      const count = estimator['countDependencies'](code, 'javascript');
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('File Filtering', () => {
    test('should identify code files correctly', () => {
      expect(estimator['isCodeFile']('test.ts')).toBe(true);
      expect(estimator['isCodeFile']('test.js')).toBe(true);
      expect(estimator['isCodeFile']('test.py')).toBe(true);
      expect(estimator['isCodeFile']('test.txt')).toBe(false);
      expect(estimator['isCodeFile']('README.md')).toBe(false);
    });

    test('should identify test files correctly', () => {
      expect(estimator['isTestFile']('test.test.ts')).toBe(true);
      expect(estimator['isTestFile']('test.spec.js')).toBe(true);
      expect(estimator['isTestFile']('component.ts')).toBe(false);
    });

    test('should identify directories to skip', () => {
      expect(estimator['shouldSkipDirectory']('node_modules')).toBe(true);
      expect(estimator['shouldSkipDirectory']('.git')).toBe(true);
      expect(estimator['shouldSkipDirectory']('dist')).toBe(true);
      expect(estimator['shouldSkipDirectory']('src')).toBe(false);
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', async () => {
      const sampleCode = 'function test() {}';
      mockFs.readFile.mockResolvedValue(sampleCode);

      // Populate cache
      await estimator.analyzeFileComplexity('./test.ts');
      
      const statsBefore = estimator.getCacheStats();
      expect(statsBefore.metricsCache).toBeGreaterThan(0);

      // Clear cache
      estimator.clearCache();
      
      const statsAfter = estimator.getCacheStats();
      expect(statsAfter.metricsCache).toBe(0);
      expect(statsAfter.estimationCache).toBe(0);
    });

    test('should return cache statistics', async () => {
      const sampleCode = 'function test() {}';
      mockFs.readFile.mockResolvedValue(sampleCode);

      await estimator.analyzeFileComplexity('./test1.ts');
      await estimator.estimateComplexity('./test2.ts', 'file');

      const stats = estimator.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats.metricsCache).toBeGreaterThanOrEqual(0);
      expect(stats.estimationCache).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recommendations', () => {
    test('should generate appropriate recommendations for high complexity', () => {
      const metrics = {
        cyclomatic: 20,
        cognitive: 30,
        nesting: 6,
        maintainability: 40,
        testability: 30,
        lines: 500,
        functions: 10,
        classes: 3,
        dependencies: 25,
        coupling: 8,
        cohesion: 3
      };

      const factors = [
        {
          name: 'Cyclomatic Complexity',
          value: 0.8,
          weight: 0.25,
          impact: 'high' as const,
          description: 'High cyclomatic complexity'
        }
      ];

      const riskAssessment = {
        overall: 0.8,
        categories: { technical: 0.8, timeline: 0.7, resource: 0.6, integration: 0.5 },
        mitigationStrategies: []
      };

      const recommendations = estimator['generateRecommendations'](metrics, factors, riskAssessment);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('should generate positive recommendations for good quality code', () => {
      const metrics = {
        cyclomatic: 5,
        cognitive: 8,
        nesting: 2,
        maintainability: 85,
        testability: 90,
        lines: 100,
        functions: 5,
        classes: 1,
        dependencies: 3,
        coupling: 2,
        cohesion: 8
      };

      const factors = [
        {
          name: 'Cyclomatic Complexity',
          value: 0.2,
          weight: 0.25,
          impact: 'low' as const,
          description: 'Low cyclomatic complexity'
        }
      ];

      const riskAssessment = {
        overall: 0.2,
        categories: { technical: 0.2, timeline: 0.1, resource: 0.1, integration: 0.1 },
        mitigationStrategies: []
      };

      const recommendations = estimator['generateRecommendations'](metrics, factors, riskAssessment);

      expect(recommendations).toBeDefined();
      expect(recommendations).toContain('Code complexity is within acceptable ranges');
    });
  });
});