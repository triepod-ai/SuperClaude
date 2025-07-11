module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
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
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@superclaude/shared$': '<rootDir>/shared/src/index.ts'
  },
  projects: [
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/shared/**/*.test.ts']
    },
    {
      displayName: 'bridge-hooks',
      testMatch: ['<rootDir>/bridge-hooks/**/*.test.ts']
    },
    {
      displayName: 'tasks-server',
      testMatch: ['<rootDir>/superclaude-tasks/**/*.test.ts']
    },
    {
      displayName: 'orchestrator-server',
      testMatch: ['<rootDir>/superclaude-orchestrator/**/*.test.ts']
    },
    {
      displayName: 'code-server',
      testMatch: ['<rootDir>/superclaude-code/**/*.test.ts']
    },
    {
      displayName: 'quality-server',
      testMatch: ['<rootDir>/superclaude-quality/**/*.test.ts']
    },
    {
      displayName: 'performance-server',
      testMatch: ['<rootDir>/superclaude-performance/**/*.test.ts']
    }
  ]
};