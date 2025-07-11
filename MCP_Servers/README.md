# SuperClaude MCP Server Suite

A comprehensive suite of Model Context Protocol (MCP) servers designed to enhance Claude Code with advanced SuperClaude functionality.

## 🏗️ Architecture

### Core Servers

- **🎯 superclaude-tasks** - Task management and workflow orchestration
- **🧠 superclaude-orchestrator** - Intelligent routing and command coordination  
- **💻 superclaude-code** - Code analysis, generation, and refactoring
- **✅ superclaude-quality** - Quality assessment and validation gates
- **⚡ superclaude-performance** - Performance monitoring and optimization
- **🧠 superclaude-intelligence** - Reasoning, decision-making, and learning systems
- **🎨 superclaude-ui** - UI component generation and design systems

### Supporting Infrastructure

- **📦 shared** - Common utilities, types, and functionality
- **🔗 bridge-hooks** - Lightweight integration hooks for Claude Code

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Install all dependencies
npm run install:all

# Build all packages
npm run build

# Run tests
npm run test
```

### Development

```bash
# Start development mode for all servers
npm run dev

# Start specific server in development
npm run dev --workspace=@superclaude/tasks-server

# Run tests in watch mode
npm run test:watch
```

## 📦 Package Structure

```
MCP_Servers/
├── shared/                 # Common utilities and types
├── bridge-hooks/          # Lightweight Claude Code integration
├── superclaude-tasks/     # Task management server
├── superclaude-orchestrator/  # Intelligent routing server
├── superclaude-code/      # Code analysis server
├── superclaude-quality/   # Quality validation server
├── superclaude-performance/   # Performance monitoring server
├── superclaude-intelligence/  # Reasoning and learning systems
└── superclaude-ui/        # UI component generation server
```

## 🔧 Configuration

Each server can be configured independently:

```typescript
import { ServerConfig } from '@superclaude/shared';

const config: ServerConfig = {
  name: 'superclaude-tasks',
  version: '1.0.0',
  maxConcurrentTasks: 10,
  tokenBudget: 100000,
  enableCaching: true,
  enableMetrics: true,
  logLevel: 'info'
};
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests for specific package
npm run test --workspace=@superclaude/shared

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📊 Monitoring

Each server includes built-in performance monitoring and metrics collection:

```typescript
import { PerformanceMonitor } from '@superclaude/shared';

// Monitor function execution
const result = await PerformanceMonitor.measureAsync(
  'operation-name',
  async () => {
    // Your operation
  }
);

// Get performance statistics
const stats = PerformanceMonitor.getStats('operation-name');
```

## 🔗 Bridge Hooks

Lightweight integration hooks for Claude Code without full MCP setup:

```typescript
import { BridgeHookRegistry } from '@superclaude/bridge-hooks';

const registry = new BridgeHookRegistry();

registry.register({
  name: 'task-handler',
  handler: async (context) => {
    // Handle task operations
    return { success: true, data: result };
  },
  priority: 100,
  enabled: true
});
```

## 🏷️ Available Commands

### Server Management
- `npm run build` - Build all packages
- `npm run start:tasks` - Start tasks server
- `npm run start:orchestrator` - Start orchestrator server
- `npm run start:code` - Start code analysis server
- `npm run start:quality` - Start quality server
- `npm run start:performance` - Start performance server
- `npm run start:intelligence` - Start intelligence server
- `npm run start:ui` - Start UI generation server

### Development
- `npm run dev` - Start all servers in development mode
- `npm run test` - Run test suite
- `npm run lint` - Run linting
- `npm run type-check` - TypeScript type checking

### Deployment
- `npm run build` - Production build
- `npm run publish:all` - Publish all packages

## 📋 Requirements

- Node.js 18+
- TypeScript 5.2+
- MCP SDK 0.5+

## 🤝 Contributing

1. Follow TypeScript best practices
2. Maintain test coverage >80%
3. Use conventional commit messages
4. Update documentation for new features

## 📄 License

MIT License - see LICENSE file for details

## 🔍 Troubleshooting

### Common Issues

**Build failures**: Ensure shared package is built first
```bash
npm run build:shared
npm run build
```

**Test failures**: Check Jest configuration and setup
```bash
npm run test -- --verbose
```

**Type errors**: Run type checking for specific issues
```bash
npm run type-check
```

## 📚 Documentation

- [Tasks Server Documentation](./superclaude-tasks/docs/)
- [Orchestrator Documentation](./superclaude-orchestrator/docs/)
- [Code Server Documentation](./superclaude-code/docs/)
- [Quality Server Documentation](./superclaude-quality/docs/)
- [Performance Server Documentation](./superclaude-performance/docs/)
- [Intelligence Server Documentation](./superclaude-intelligence/docs/)
- [UI Server Documentation](./superclaude-ui/docs/)
- [Shared Utilities Documentation](./shared/docs/)
- [Bridge Hooks Documentation](./bridge-hooks/docs/)