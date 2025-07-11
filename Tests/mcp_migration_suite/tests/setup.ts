/**
 * Global test setup for MCP Migration Test Suite
 */

import { TestEnvironment } from './utils/test-environment';
import { MockClaudeCode } from './mocks/claude-code-mock';
import { PerformanceMonitor } from './utils/performance-monitor';

// Global test environment
let testEnv: TestEnvironment;
let mockClaudeCode: MockClaudeCode;
let perfMonitor: PerformanceMonitor;

beforeAll(async () => {
  console.log('🚀 Setting up MCP Migration Test Suite...');
  
  // Initialize test environment
  testEnv = new TestEnvironment();
  await testEnv.setup();
  
  // Initialize mock Claude Code
  mockClaudeCode = new MockClaudeCode();
  await mockClaudeCode.initialize();
  
  // Initialize performance monitoring
  perfMonitor = new PerformanceMonitor();
  perfMonitor.start();
  
  // Set global timeout for async operations
  jest.setTimeout(30000);
  
  console.log('✅ Test environment ready');
}, 60000);

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Stop performance monitoring
  if (perfMonitor) {
    perfMonitor.stop();
    await perfMonitor.generateReport();
  }
  
  // Cleanup mock Claude Code
  if (mockClaudeCode) {
    await mockClaudeCode.cleanup();
  }
  
  // Cleanup test environment
  if (testEnv) {
    await testEnv.cleanup();
  }
  
  console.log('✅ Cleanup complete');
}, 30000);

// Make utilities globally available
declare global {
  var testEnvironment: TestEnvironment;
  var mockClaudeCode: MockClaudeCode;
  var performanceMonitor: PerformanceMonitor;
}

global.testEnvironment = testEnv;
global.mockClaudeCode = mockClaudeCode;
global.performanceMonitor = perfMonitor;

// Handle unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in tests, just log
});

// Custom matchers for better assertions
expect.extend({
  toBeWithinPerformanceThreshold(received: number, threshold: number) {
    const pass = received <= threshold;
    return {
      message: () =>
        pass
          ? `Expected ${received}ms to exceed ${threshold}ms threshold`
          : `Expected ${received}ms to be within ${threshold}ms threshold`,
      pass,
    };
  },
  
  toHaveValidMCPResponse(received: any) {
    const hasId = typeof received.id === 'string' || typeof received.id === 'number';
    const hasMethod = typeof received.method === 'string';
    const hasParams = received.params !== undefined;
    
    const pass = hasId && hasMethod && hasParams;
    return {
      message: () =>
        pass
          ? `Expected invalid MCP response format`
          : `Expected valid MCP response with id, method, and params`,
      pass,
    };
  },
  
  toMeetQualityGates(received: any) {
    const hasAllGates = [
      'syntax', 'type', 'lint', 'security', 
      'test', 'performance', 'documentation', 'integration'
    ].every(gate => received[gate] !== undefined);
    
    const allPassed = Object.values(received).every(result => 
      typeof result === 'object' && result !== null && 
      (result as any).passed === true
    );
    
    const pass = hasAllGates && allPassed;
    return {
      message: () =>
        pass
          ? `Expected quality gates to fail`
          : `Expected all quality gates to pass: ${JSON.stringify(received, null, 2)}`,
      pass,
    };
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinPerformanceThreshold(threshold: number): R;
      toHaveValidMCPResponse(): R;
      toMeetQualityGates(): R;
    }
  }
}