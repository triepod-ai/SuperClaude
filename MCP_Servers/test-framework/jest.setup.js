// Global test setup for SuperClaude Test Framework

// Increase timeout for complex tests
jest.setTimeout(30000);

// Mock shared logger to prevent actual logging during tests
jest.mock('@superclaude/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  performance: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [])
  },
  validation: {
    validateInput: jest.fn(() => ({ valid: true })),
    sanitizeOutput: jest.fn(data => data)
  }
}));

// Global test utilities
global.testUtils = {
  // Create mock MCP server response
  createMockMCPResponse: (data = {}, error = null) => ({
    id: 'test-id',
    jsonrpc: '2.0',
    result: error ? undefined : data,
    error: error ? { code: -1, message: error } : undefined
  }),

  // Create mock performance metrics
  createMockPerformanceMetrics: (overrides = {}) => ({
    executionTime: 100,
    memoryUsage: 1024 * 1024,
    cpuUsage: 25,
    tokenUsage: 1000,
    successRate: 0.95,
    errorRate: 0.05,
    timestamp: new Date(),
    operationId: 'test-op-' + Math.random().toString(36).substr(2, 9),
    ...overrides
  }),

  // Create mock validation result
  createMockValidationResult: (overrides = {}) => ({
    step: 'syntax',
    passed: true,
    score: 100,
    issues: [],
    executionTime: 50,
    metadata: {},
    ...overrides
  }),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test data
  generateTestData: (count, generator) => {
    return Array.from({ length: count }, (_, i) => generator(i));
  }
};

// Global test constants
global.testConstants = {
  PERFORMANCE_THRESHOLDS: {
    FAST: 100,      // ms
    MEDIUM: 500,    // ms
    SLOW: 2000      // ms
  },
  QUALITY_THRESHOLDS: {
    EXCELLENT: 95,  // %
    GOOD: 80,       // %
    ACCEPTABLE: 70  // %
  },
  TEST_TIMEOUT: {
    UNIT: 5000,        // ms
    INTEGRATION: 30000, // ms
    E2E: 60000,        // ms
    PERFORMANCE: 120000 // ms
  }
};

// Setup test database/state cleanup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup any global state
  if (global.testCleanup) {
    global.testCleanup.forEach(cleanup => cleanup());
    global.testCleanup = [];
  }
});

// Add cleanup function utility
global.addTestCleanup = (cleanup) => {
  if (!global.testCleanup) {
    global.testCleanup = [];
  }
  global.testCleanup.push(cleanup);
};

// Console override for test environment
const originalConsole = console;
global.console = {
  ...originalConsole,
  // Suppress logs in tests unless debugging
  log: process.env.DEBUG_TESTS ? originalConsole.log : jest.fn(),
  info: process.env.DEBUG_TESTS ? originalConsole.info : jest.fn(),
  warn: originalConsole.warn, // Keep warnings
  error: originalConsole.error, // Keep errors
  debug: process.env.DEBUG_TESTS ? originalConsole.debug : jest.fn()
};