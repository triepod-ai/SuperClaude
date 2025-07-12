# SuperClaude Bridge-Hooks

Complete bridge-hooks integration system for Claude Code with real MCP server routing, performance optimization, and context preservation.

## 🎯 Overview

Bridge-hooks serves as the intelligent middleware that preserves SuperClaude's seamless user experience while leveraging the MCP server architecture for scalability and modularity. It provides real-time integration between Claude Code tool execution and the SuperClaude MCP ecosystem.

## ✨ Key Features

### 🔗 Claude Code Integration
- **Real-time tool execution hooks** - Pre/post tool execution event handling
- **Session management** - Persistent session state across tool executions
- **Environment detection** - Automatic detection of Claude Code environment

### 🎯 Intelligent MCP Routing
- **Sub-100ms performance** - Intelligent routing with <100ms target execution time
- **Load balancing** - Automatic load balancing across MCP servers
- **Health monitoring** - Real-time server health checks and failover
- **Circuit breaker** - Automatic circuit breaker for failing servers

### ⚡ Performance Optimization
- **Performance monitoring** - Real-time performance tracking and alerting
- **Intelligent caching** - Context-aware caching with TTL management
- **Predictive optimization** - ML-based performance predictions
- **Resource management** - Memory, CPU, and connection pool management

### 🧠 Context Preservation
- **Session state** - Persistent context across tool executions
- **Execution history** - Tool execution patterns and learning
- **Predictive modeling** - Next operation prediction based on patterns
- **Context snapshots** - Periodic context snapshots for recovery

### 🔧 Configuration Management
- **Environment-specific** - Development, staging, production configurations
- **Runtime updates** - Dynamic configuration updates without restart
- **Validation** - Configuration validation and error reporting
- **Presets** - Pre-configured setups for common scenarios

## 🚀 Quick Start

### Basic Integration

```typescript
import { createBasicClaudeCodeBridge } from '@superclaude/bridge-hooks';

// Create basic bridge with default settings
const bridge = createBasicClaudeCodeBridge();

// Handle Claude Code tool execution
const result = await bridge.handleToolEvent(
  'pre_tool_use',
  'Read',
  { file_path: '/src/example.ts' },
  'session_123'
);

console.log('Execution result:', result);
```

### Advanced Configuration

```typescript
import { 
  createSuperClaudeBridge, 
  ConfigurationPresets,
  getConfigurationManager 
} from '@superclaude/bridge-hooks';

// Use high-performance configuration
const configManager = getConfigurationManager('production');
configManager.updateConfig(ConfigurationPresets.highPerformance());

const bridge = createSuperClaudeBridge(configManager.getConfig());

// Handle complex tool execution with MCP routing
const result = await bridge.handleToolEvent(
  'pre_tool_use',
  'mcp__sequential-thinking__sequentialthinking',
  { 
    thought: 'Analyzing system architecture',
    complexity: 'high'
  },
  'session_123'
);
```

## 📊 Performance Metrics

### Target Performance
- **Execution Time**: <100ms for 95% of operations
- **Throughput**: >1000 operations/second
- **Memory Usage**: <256MB in production
- **Cache Hit Rate**: >80% for repeated operations

### Monitoring

```typescript
// Get system status
const status = bridge.getSystemStatus();
console.log('Active operations:', status.orchestrator.activeOperations);
console.log('Performance:', status.orchestrator.performance.summary);

// Get optimization recommendations
const recommendations = bridge.getOptimizationRecommendations();
recommendations.forEach(rec => {
  console.log(`${rec.type}: ${rec.description} (${rec.expectedImprovement}% improvement)`);
});
```

## 🔄 Event Flow

### Tool Execution Lifecycle

```
1. Claude Code Tool Execution
   ↓
2. Pre-Tool-Use Hook
   ├── Context Enrichment
   ├── MCP Server Routing
   ├── Performance Monitoring
   └── Caching Check
   ↓
3. Tool Execution
   ↓
4. Post-Tool-Use Hook
   ├── Result Processing
   ├── Context Updates
   ├── Performance Recording
   ├── Cache Updates
   └── Predictive Analysis
```

### MCP Server Routing Decision Tree

```
Request Analysis
├── Tool Pattern Matching
├── Domain Hint Extraction
├── Complexity Assessment
└── Performance Requirements
   ↓
Server Selection
├── Capability Matching
├── Health Status Check
├── Load Balancing
└── Fallback Planning
   ↓
Execution Strategy
├── Parallel (multiple servers)
├── Sequential (single server)
├── Primary-Fallback (failover)
└── Consensus (validation)
```

## 🏗️ Architecture

### Core Components

```
BridgeOrchestrator
├── ClaudeCodeIntegration (tool hooks)
├── MCPServerRouter (intelligent routing)
├── PerformanceMonitor (optimization)
├── ContextPreservationManager (state)
└── ConfigurationManager (settings)
```

### Component Responsibilities

| Component | Responsibility | Performance Target |
|-----------|---------------|-------------------|
| **ClaudeCodeIntegration** | Tool execution hooks | <20ms |
| **MCPServerRouter** | Server routing decisions | <50ms |
| **PerformanceMonitor** | Metrics and optimization | <10ms |
| **ContextPreservationManager** | State management | <30ms |
| **ConfigurationManager** | Config validation | <5ms |

## 🔧 Configuration

### Environment Configurations

```typescript
// Development
const devConfig = {
  logLevel: 'debug',
  performanceTarget: 200,
  enableCaching: false,
  maxConcurrentHooks: 5,
};

// Production
const prodConfig = {
  logLevel: 'warn',
  performanceTarget: 50,
  enableCaching: true,
  maxConcurrentHooks: 20,
  security: {
    enableEncryption: true,
    enableAuditLogging: true,
  },
};
```

### Custom Configuration

```typescript
const customBridge = createSuperClaudeBridge({
  performanceTarget: 75,
  maxConcurrentHooks: 15,
  claudeCodeIntegration: {
    enabled: true,
    sessionTrackingEnabled: true,
    contextPreservationTTL: 3600, // 1 hour
  },
  mcpRouting: {
    enabled: true,
    loadBalancing: 'capability-based',
    healthCheckInterval: 15000,
  },
});
```

## 📈 Performance Optimization

### Caching Strategy

```typescript
// Automatic caching for read operations
const cacheableOperations = ['Read', 'Grep', 'mcp__context7'];

// Cache key generation
const cacheKey = generateCacheKey({
  operation: 'Read',
  args: { file_path: '/src/component.tsx' },
  persona: 'frontend',
  complexity: 'simple',
});

// Cache with TTL
cacheResult(cacheKey, result, 300000); // 5 minutes
```

### Circuit Breaker Pattern

```typescript
// Automatic circuit breaker for failing operations
const circuitBreaker = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenRetries: 3,
};

// Circuit breaker status
if (isCircuitBreakerOpen('FailingOperation')) {
  return fallbackResult;
}
```

### Predictive Optimization

```typescript
// Predict next operation based on session history
const prediction = contextManager.predictNextOperation(sessionId);
console.log('Next likely tool:', prediction.nextLikelyTool);
console.log('Confidence:', prediction.confidence);

// Pre-warm MCP servers
if (prediction.confidence > 0.8) {
  preWarmMCPServers(prediction.recommendedMCPServers);
}
```

## 🔒 Security & Compliance

### Security Features
- **Data encryption** in production environments
- **Audit logging** for all operations
- **Sensitive data handling** with configurable strictness
- **Input sanitization** for all tool arguments

### Compliance
- **GDPR compliance** with data retention policies
- **SOC 2** compatible audit trails
- **PCI DSS** compatible sensitive data handling

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run performance benchmarks
npm run benchmark
```

### Example Tests

```typescript
// Basic integration test
describe('Claude Code Integration', () => {
  it('should handle tool execution', async () => {
    const bridge = createBasicClaudeCodeBridge();
    
    const result = await bridge.handleToolEvent(
      'pre_tool_use',
      'Read',
      { file_path: '/test.ts' },
      'test_session'
    );
    
    expect(result.success).toBe(true);
    expect(result.performance.duration).toBeLessThan(100);
  });
});

// Performance test
describe('Performance', () => {
  it('should meet sub-100ms target', async () => {
    const bridge = createSuperClaudeBridge(ConfigurationPresets.highPerformance());
    
    const start = performance.now();
    await bridge.handleToolEvent('pre_tool_use', 'Read', {}, 'session');
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});
```

## 📚 Examples

See the [examples directory](./src/examples/) for comprehensive examples:

- **Basic Integration** - Simple Claude Code tool execution
- **Advanced Configuration** - Production-ready setup with monitoring
- **Error Handling** - Resilience and recovery patterns
- **Performance Benchmarking** - Load testing and optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Submit a pull request

### Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run examples
npm run examples
```

## 📄 API Reference

### Main Functions

#### `createSuperClaudeBridge(config?)`
Creates a complete bridge-hooks integration with all features enabled.

#### `createBasicClaudeCodeBridge()`
Creates a basic bridge with default settings for quick start.

#### `getConfigurationManager(environment?)`
Gets the global configuration manager instance.

### Core Classes

#### `BridgeOrchestrator`
Main orchestration engine that coordinates all components.

#### `ClaudeCodeIntegration`
Handles Claude Code tool execution hooks and events.

#### `MCPServerRouter`
Intelligent routing engine for MCP server selection.

#### `PerformanceMonitor`
Real-time performance monitoring and optimization.

#### `ContextPreservationManager`
Session state and context management across executions.

## 🔗 Related Projects

- **SuperClaude MCP Servers** - Core MCP server implementations
- **Claude Code** - Official Claude CLI for developers
- **MCP Protocol** - Model Context Protocol specification

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 Support

- **Issues** - Report bugs and request features on GitHub
- **Documentation** - Comprehensive docs in the `/docs` folder
- **Examples** - Working examples in the `/src/examples` folder
- **Community** - Join discussions in GitHub Discussions

---

**Built with ❤️ for the SuperClaude ecosystem**