module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/types/**/*',
    '!src/fixtures/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/phase3/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@superclaude/shared$': '<rootDir>/../shared/src/index.ts',
    '^@superclaude/quality-server$': '<rootDir>/../superclaude-quality/src/index.ts',
    '^@superclaude/performance-server$': '<rootDir>/../superclaude-performance/src/index.ts',
    '^@superclaude/tasks-server$': '<rootDir>/../superclaude-tasks/src/index.ts',
    '^@superclaude/orchestrator-server$': '<rootDir>/../superclaude-orchestrator/src/index.ts',
    '^@superclaude/code-server$': '<rootDir>/../superclaude-code/src/index.ts',
    '^@superclaude/intelligence-server$': '<rootDir>/../superclaude-intelligence/src/index.ts',
    '^@superclaude/ui-server$': '<rootDir>/../superclaude-ui/src/index.ts',
    '^@superclaude/bridge-hooks$': '<rootDir>/../bridge-hooks/src/index.ts'
  },
  projects: [
    {
      displayName: 'unit-tests',
      testMatch: ['<rootDir>/src/**/*.unit.test.ts'],
      coverageDirectory: 'coverage/unit'
    },
    {
      displayName: 'integration-tests',
      testMatch: ['<rootDir>/src/**/*.integration.test.ts'],
      coverageDirectory: 'coverage/integration'
    },
    {
      displayName: 'e2e-tests',
      testMatch: ['<rootDir>/src/**/*.e2e.test.ts'],
      coverageDirectory: 'coverage/e2e',
      testTimeout: 60000
    },
    {
      displayName: 'performance-tests',
      testMatch: ['<rootDir>/src/**/*.performance.test.ts'],
      coverageDirectory: 'coverage/performance',
      testTimeout: 120000
    },
    {
      displayName: 'regression-tests',
      testMatch: ['<rootDir>/src/**/*.regression.test.ts'],
      coverageDirectory: 'coverage/regression',
      testTimeout: 180000
    },
    {
      displayName: 'migration-tests',
      testMatch: ['<rootDir>/src/**/*.migration.test.ts'],
      coverageDirectory: 'coverage/migration',
      testTimeout: 300000
    },
    {
      displayName: 'phase3-tests',
      testMatch: ['<rootDir>/src/phase3/**/*.test.ts'],
      coverageDirectory: 'coverage/phase3'
    }
  ],
  testTimeout: 30000,
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  verbose: true,
  silent: false,
  bail: false,
  forceExit: true,
  detectOpenHandles: true,
  watchman: true
};