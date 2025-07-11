// Global test setup for all SuperClaude MCP servers

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Keep console.error and console.warn for debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test timeout
jest.setTimeout(30000);

// Mock performance if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
  };
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.createMockContext = () => ({
  operation: 'test-operation',
  args: {},
  flags: [],
  sessionId: 'test-session',
  timestamp: new Date(),
});

global.createMockTask = (overrides = {}) => ({
  id: 'test-task-id',
  title: 'Test Task',
  description: 'Test task description',
  status: 'pending',
  priority: 'medium',
  complexity: 'simple',
  createdAt: new Date(),
  updatedAt: new Date(),
  dependencies: [],
  tags: [],
  metadata: {},
  ...overrides,
});