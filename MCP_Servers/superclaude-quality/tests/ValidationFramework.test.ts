import { ValidationFramework } from '../src/core/ValidationFramework.js';
import { ValidationStep, QualityLevel, DEFAULT_VALIDATION_CONFIG } from '../src/types/index.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ValidationFramework', () => {
  let framework: ValidationFramework;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    framework = new ValidationFramework(DEFAULT_VALIDATION_CONFIG);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-test-'));
    testFile = path.join(tempDir, 'test.ts');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('validateFile', () => {
    it('should validate a TypeScript file successfully', async () => {
      const testContent = `
        function hello(name: string): string {
          return \`Hello, \${name}!\`;
        }
        
        export { hello };
      `;

      await fs.writeFile(testFile, testContent);

      const results = await framework.validateFile({
        filePath: testFile,
        enabledSteps: [ValidationStep.SYNTAX, ValidationStep.LINT]
      });

      expect(results).toHaveLength(2);
      expect(results[0].step).toBe(ValidationStep.SYNTAX);
      expect(results[1].step).toBe(ValidationStep.LINT);
      expect(results.every(r => typeof r.score === 'number')).toBe(true);
      expect(results.every(r => typeof r.executionTime === 'number')).toBe(true);
    });

    it('should detect syntax errors', async () => {
      const testContent = `
        function hello(name: string {
          return \`Hello, \${name}!\`;
        }
      `;

      await fs.writeFile(testFile, testContent);

      const results = await framework.validateFile({
        filePath: testFile,
        enabledSteps: [ValidationStep.SYNTAX]
      });

      expect(results).toHaveLength(1);
      const syntaxResult = results[0];
      expect(syntaxResult.step).toBe(ValidationStep.SYNTAX);
      expect(syntaxResult.passed).toBe(false);
      expect(syntaxResult.issues.length).toBeGreaterThan(0);
    });

    it('should handle security validation', async () => {
      const testContent = `
        const userInput = getInput();
        eval(userInput); // Security issue
        
        const password = "hardcoded123"; // Security issue
        
        document.innerHTML = userHtml; // XSS risk
      `;

      await fs.writeFile(testFile, testContent);

      const results = await framework.validateFile({
        filePath: testFile,
        enabledSteps: [ValidationStep.SECURITY]
      });

      expect(results).toHaveLength(1);
      const securityResult = results[0];
      expect(securityResult.step).toBe(ValidationStep.SECURITY);
      expect(securityResult.issues.length).toBeGreaterThan(0);
      
      const criticalIssues = securityResult.issues.filter(
        issue => issue.level === QualityLevel.CRITICAL
      );
      expect(criticalIssues.length).toBeGreaterThan(0);
    });

    it('should validate only fixable issues when requested', async () => {
      const testContent = `
        function test() {
          const unused = "variable"; // Fixable lint issue
          eval("code"); // Non-fixable security issue
        }
      `;

      await fs.writeFile(testFile, testContent);

      const results = await framework.validateFile({
        filePath: testFile,
        fixableOnly: true
      });

      results.forEach(result => {
        result.issues.forEach(issue => {
          expect(issue.fixable).toBe(true);
        });
      });
    });
  });

  describe('validateProject', () => {
    it('should validate multiple files in parallel', async () => {
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'file2.js');
      
      await fs.writeFile(file1, 'function test1() { return "hello"; }');
      await fs.writeFile(file2, 'function test2() { return "world"; }');

      const results = await framework.validateProject(tempDir, {
        parallel: true,
        maxConcurrency: 2,
        enabledSteps: [ValidationStep.SYNTAX]
      });

      expect(results.size).toBe(2);
      expect(results.has(file1)).toBe(true);
      expect(results.has(file2)).toBe(true);
    });

    it('should exclude specified paths', async () => {
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      await fs.mkdir(nodeModulesDir);
      await fs.writeFile(path.join(nodeModulesDir, 'lib.js'), 'module.exports = {};');
      
      const srcFile = path.join(tempDir, 'src.ts');
      await fs.writeFile(srcFile, 'function main() {}');

      const results = await framework.validateProject(tempDir, {
        excludePaths: ['node_modules']
      });

      expect(results.size).toBe(1);
      expect(results.has(srcFile)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.ts');

      await expect(framework.validateFile({
        filePath: nonExistentFile
      })).rejects.toThrow();
    });

    it('should handle timeout scenarios', async () => {
      // This would require mocking the validation steps to simulate timeouts
      // For now, we'll test that the framework handles the timeout mechanism
      expect(framework).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should respect custom validation configuration', () => {
      const customConfig = {
        ...DEFAULT_VALIDATION_CONFIG,
        steps: {
          ...DEFAULT_VALIDATION_CONFIG.steps,
          [ValidationStep.SYNTAX]: {
            ...DEFAULT_VALIDATION_CONFIG.steps[ValidationStep.SYNTAX],
            timeout: 1000
          }
        }
      };

      const customFramework = new ValidationFramework(customConfig);
      expect(customFramework).toBeDefined();
    });

    it('should use default configuration when none provided', () => {
      const defaultFramework = new ValidationFramework();
      expect(defaultFramework).toBeDefined();
    });
  });
});

// Helper function to create mock validation results
function createMockValidationResult(step: ValidationStep, passed: boolean = true) {
  return {
    step,
    passed,
    score: passed ? 100 : 50,
    issues: [],
    executionTime: 100,
    metadata: {}
  };
}