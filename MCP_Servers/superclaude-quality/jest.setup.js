// Jest setup file for SuperClaude Quality MCP Server

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to disable console.log in tests
  // log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  createTempFile: async (content, extension = '.ts') => {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-test-'));
    const fileName = `test${extension}`;
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, content);
    
    return {
      filePath,
      tempDir,
      cleanup: async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  },
  
  createMockValidationResult: (step, passed = true, issues = []) => ({
    step,
    passed,
    score: passed ? 100 : 50,
    issues,
    executionTime: 100,
    metadata: {}
  }),
  
  createMockSemanticAnalysis: (filePath, language = 'typescript') => ({
    filePath,
    language,
    complexity: {
      cyclomatic: 5,
      cognitive: 8,
      nestingDepth: 3
    },
    maintainability: {
      index: 75,
      issues: [],
      suggestions: []
    },
    dependencies: {
      internal: [],
      external: [],
      circular: []
    },
    symbols: [],
    patterns: []
  })
};

// Cleanup any global state after each test
afterEach(() => {
  // Reset any global state if needed
  jest.clearAllMocks();
});