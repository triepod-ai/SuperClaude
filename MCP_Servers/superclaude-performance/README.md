# SuperClaude Performance MCP Server

The SuperClaude Performance MCP Server provides advanced performance monitoring, complexity estimation, and optimization capabilities for the SuperClaude ecosystem. This server enables real-time performance tracking, intelligent bottleneck detection, cross-server optimization, and comprehensive complexity analysis.

## Features

### 🔍 Complexity Estimation
- **Advanced Code Analysis**: Cyclomatic complexity, cognitive complexity, maintainability metrics
- **Multi-Language Support**: TypeScript, JavaScript, Python, Java, C++, C#, Rust, Go, PHP, Ruby
- **Project-Scale Analysis**: File, directory, and entire project complexity estimation
- **Risk Assessment**: Technical, timeline, resource, and integration risk evaluation
- **Development Time Estimation**: Evidence-based time and effort predictions

### 📊 Performance Monitoring
- **Real-Time Tracking**: Continuous performance metric collection with configurable sampling
- **Multi-Metric Analysis**: Execution time, memory usage, CPU utilization, token consumption
- **Baseline Comparison**: Automated baseline creation and performance drift detection
- **Intelligent Alerting**: Threshold-based alerts with severity classification
- **Trend Analysis**: Performance trend identification and prediction

### 🎯 Bottleneck Detection
- **Automated Discovery**: AI-powered bottleneck identification across multiple domains
- **Impact Assessment**: Performance degradation, user experience, and resource impact analysis
- **Optimization Opportunities**: Actionable recommendations with effort and ROI estimation
- **Priority Ranking**: Intelligent prioritization based on impact and implementation complexity

### ⚡ Cross-Server Optimization
- **Ecosystem-Wide Coordination**: Performance optimization across multiple MCP servers
- **Intelligent Caching**: Cross-server cache coordination with replication strategies
- **Load Balancing**: Dynamic request distribution based on server capacity and performance
- **Resource Allocation**: Optimal resource distribution with priority-based allocation

### 📈 Benchmarking & Analytics
- **Performance Benchmarks**: Statistical analysis with percentile distributions
- **Comparative Analysis**: Benchmark comparison with regression detection
- **Historical Tracking**: Long-term performance trend monitoring
- **Insight Generation**: Automated pattern recognition and anomaly detection

## Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Run tests
npm test

# Start the server
npm start
```

## Configuration

The server can be configured through environment variables or initialization parameters:

```typescript
import { SuperClaudePerformanceServer } from '@superclaude/performance-server';

const server = new SuperClaudePerformanceServer();
await server.start();
```

### Monitoring Configuration

```typescript
const config = {
  enableRealTimeTracking: true,
  samplingRate: 0.1, // 10% sampling
  alertThresholds: {
    executionTime: 5000, // 5 seconds
    memoryUsage: 100 * 1024 * 1024, // 100MB
    cpuUsage: 80, // 80%
    errorRate: 5 // 5%
  },
  retentionPeriod: 30, // 30 days
  aggregationInterval: 60 // 1 minute
};
```

## API Reference

### Complexity Estimation Tools

#### `estimate_complexity`
Estimate implementation complexity for code, files, or projects.

**Parameters:**
- `target` (string): File path, directory, or code snippet
- `type` (enum): 'file' | 'directory' | 'project' | 'snippet'
- `includeTests` (boolean): Include test files in analysis
- `includeDependencies` (boolean): Include dependency analysis
- `language` (string): Programming language (auto-detected if not provided)

**Example:**
```json
{
  "target": "./src/complex-module.ts",
  "type": "file",
  "includeTests": true,
  "includeDependencies": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "estimation": {
      "overall": 0.7,
      "categories": {
        "algorithmic": 0.8,
        "structural": 0.6,
        "cognitive": 0.7,
        "maintenance": 0.5
      },
      "estimatedDevelopmentTime": 24.5,
      "estimatedTestingTime": 12.3,
      "riskAssessment": {
        "overall": 0.6,
        "categories": {
          "technical": 0.7,
          "timeline": 0.5,
          "resource": 0.6,
          "integration": 0.4
        }
      }
    },
    "recommendations": [
      "Consider breaking down complex functions to reduce cyclomatic complexity",
      "Implement comprehensive unit testing for complex logic"
    ]
  }
}
```

#### `analyze_file_complexity`
Analyze complexity metrics for a specific file.

**Parameters:**
- `filePath` (string): Path to the file to analyze
- `content` (string, optional): File content
- `metrics` (array, optional): Specific metrics to calculate

#### `compare_complexity`
Compare complexity between multiple files or implementations.

**Parameters:**
- `targets` (array): List of files or code snippets to compare
- `type` (enum): 'file' | 'snippet'
- `baseline` (string, optional): Baseline target for comparison

### Performance Monitoring Tools

#### `monitor_performance`
Start real-time performance monitoring for a target.

**Parameters:**
- `target` (string): Operation or server to monitor
- `duration` (number): Monitoring duration in seconds (default: 3600)
- `samplingRate` (number): Sampling rate 0.001-1.0 (default: 0.1)
- `includeBaseline` (boolean): Create baseline for comparison (default: true)
- `alertOnThresholds` (boolean): Enable threshold-based alerting (default: true)

**Example:**
```json
{
  "target": "user-authentication",
  "duration": 1800,
  "samplingRate": 0.2,
  "includeBaseline": true,
  "alertOnThresholds": true
}
```

#### `record_metrics`
Record performance metrics for an operation.

**Parameters:**
- `operationName` (string): Name of the operation
- `executionTime` (number): Execution time in milliseconds
- `memoryUsage` (number): Memory usage in bytes
- `cpuUsage` (number): CPU usage percentage
- `tokenUsage` (number): Token usage count
- `successRate` (number): Success rate 0-1
- `errorRate` (number): Error rate 0-1
- `serverId` (string, optional): Server ID

#### `get_performance_summary`
Get performance summary for operations or systems.

**Parameters:**
- `target` (string, optional): Specific target
- `timeframe` (enum): 'hour' | 'day' | 'week' | 'month'

### Bottleneck Analysis Tools

#### `analyze_bottlenecks`
Identify and analyze performance bottlenecks.

**Parameters:**
- `target` (string): System or component to analyze
- `scope` (enum): 'file' | 'module' | 'service' | 'system'
- `includeHistorical` (boolean): Include historical analysis
- `minimumSeverity` (enum): 'low' | 'medium' | 'high' | 'critical'

**Response:**
```json
{
  "success": true,
  "data": {
    "bottlenecks": [
      {
        "id": "bottleneck_123",
        "type": "algorithm",
        "severity": "high",
        "description": "High average execution time: 2500.00ms",
        "impact": {
          "performanceDegradation": 75,
          "userExperience": "significant",
          "resourceConsumption": 70
        },
        "suggestions": [
          "Optimize algorithm complexity",
          "Consider caching frequently computed results"
        ],
        "estimatedFixTime": 8,
        "confidence": 0.8
      }
    ],
    "opportunities": [
      {
        "id": "opportunity_456",
        "type": "caching",
        "title": "Implement Result Caching",
        "expectedGain": {
          "executionTime": 40,
          "memoryUsage": -10,
          "cpuUsage": 30
        },
        "estimatedEffort": 6,
        "confidence": 0.9
      }
    ]
  }
}
```

### Optimization Tools

#### `optimize_performance`
Create and execute performance optimization plan.

**Parameters:**
- `target` (string): Target for optimization
- `type` (enum, optional): 'algorithm' | 'memory' | 'io' | 'network' | 'database'
- `priority` (enum): 'low' | 'medium' | 'high' | 'critical'
- `constraints` (object): Implementation constraints

#### `execute_optimization_plan`
Execute a specific optimization plan.

**Parameters:**
- `planId` (string): Optimization plan ID to execute

### Cross-Server Tools

#### `register_server_metrics`
Register performance metrics from another MCP server.

**Parameters:**
- `serverId` (string): Server identifier
- `serverName` (string): Server name
- `metrics` (array): Performance metrics array
- `bottlenecks` (array, optional): Known bottlenecks

#### `create_cross_server_optimization`
Create optimization plan across multiple MCP servers.

**Parameters:**
- `targetServers` (array): List of server IDs to optimize
- `priority` (enum): Optimization priority
- `maxImplementationTime` (number, optional): Maximum implementation time in hours
- `riskTolerance` (enum): 'low' | 'medium' | 'high'

#### `coordinate_cache`
Coordinate caching strategies across servers.

**Parameters:**
- `operation` (string): Operation to cache
- `data` (object): Data to cache
- `ttl` (number, optional): Time to live in milliseconds
- `replicationStrategy` (enum): 'none' | 'all' | 'selective'

### Benchmarking Tools

#### `benchmark_performance`
Create performance benchmarks for operations.

**Parameters:**
- `operation` (string): Operation to benchmark
- `iterations` (number): Number of iterations (default: 100)
- `warmupIterations` (number): Number of warmup iterations (default: 10)
- `includeVariance` (boolean): Include variance analysis
- `compareToBaseline` (boolean): Compare to existing baseline

**Response:**
```json
{
  "success": true,
  "data": {
    "benchmark": {
      "operation": "user-authentication",
      "p50": 450.2,
      "p90": 650.8,
      "p95": 720.5,
      "p99": 890.1,
      "avg": 485.7,
      "min": 320.1,
      "max": 1250.3,
      "sampleSize": 100
    },
    "insights": [
      {
        "type": "pattern",
        "message": "Consistent sub-second performance",
        "confidence": 0.9,
        "actionable": false
      }
    ]
  }
}
```

### Health & Diagnostics

#### `health_check`
Check server health and performance status.

**Parameters:**
- `includeMetrics` (boolean): Include performance metrics
- `includeCache` (boolean): Include cache statistics
- `includeCrossServer` (boolean): Include cross-server statistics

#### `get_server_stats`
Get comprehensive server performance statistics.

**Parameters:**
- `detailed` (boolean): Include detailed statistics

## Integration Examples

### Basic Performance Monitoring

```typescript
// Start monitoring a critical operation
await callTool('monitor_performance', {
  target: 'user-authentication',
  duration: 3600, // 1 hour
  samplingRate: 0.1,
  alertOnThresholds: true
});

// Record metrics for the operation
await callTool('record_metrics', {
  operationName: 'user-authentication',
  executionTime: 250,
  memoryUsage: 15 * 1024 * 1024,
  cpuUsage: 12,
  tokenUsage: 150,
  successRate: 0.98,
  errorRate: 0.02
});

// Get performance summary
const summary = await callTool('get_performance_summary', {
  target: 'user-authentication',
  timeframe: 'hour'
});
```

### Complexity Analysis Workflow

```typescript
// Estimate complexity for a new feature
const estimation = await callTool('estimate_complexity', {
  target: './src/new-feature',
  type: 'directory',
  includeTests: true,
  includeDependencies: true
});

// Analyze specific file complexity
const fileAnalysis = await callTool('analyze_file_complexity', {
  filePath: './src/complex-algorithm.ts',
  metrics: ['cyclomatic', 'cognitive', 'maintainability']
});

// Compare implementations
const comparison = await callTool('compare_complexity', {
  targets: ['./src/algorithm-v1.ts', './src/algorithm-v2.ts'],
  type: 'file',
  baseline: './src/algorithm-v1.ts'
});
```

### Cross-Server Optimization

```typescript
// Register metrics from other servers
await callTool('register_server_metrics', {
  serverId: 'superclaude-quality',
  serverName: 'Quality Server',
  metrics: [
    {
      executionTime: 1500,
      memoryUsage: 80 * 1024 * 1024,
      cpuUsage: 35,
      tokenUsage: 2000,
      successRate: 0.95,
      errorRate: 0.05
    }
  ]
});

// Create cross-server optimization plan
const plan = await callTool('create_cross_server_optimization', {
  targetServers: ['superclaude-quality', 'superclaude-code'],
  priority: 'high',
  maxImplementationTime: 40,
  riskTolerance: 'medium'
});

// Execute the optimization plan
const result = await callTool('execute_optimization_plan', {
  planId: plan.data.plan.id
});
```

## Error Handling

The server provides comprehensive error handling with specific error types:

- `ComplexityEstimationError`: Issues with complexity analysis
- `MonitoringError`: Performance monitoring failures
- `OptimizationError`: Optimization plan or execution errors
- `BenchmarkingError`: Benchmarking operation failures
- `PerformanceServerError`: General server errors

All errors include detailed error messages and context for debugging.

## Performance Considerations

### Sampling and Resource Usage

- Use appropriate sampling rates (0.1-0.2 for production)
- Monitor memory usage during long-term data retention
- Configure retention periods based on storage capacity
- Use caching strategies to reduce redundant analysis

### Optimization Best Practices

- Start with bottleneck analysis before optimization
- Implement monitoring before and after optimizations
- Use benchmark comparisons to validate improvements
- Consider cross-server impacts when optimizing individual components

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests for new functionality
4. Ensure all tests pass and coverage thresholds are met
5. Submit a pull request with detailed description

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions, please refer to the main SuperClaude repository documentation and issue tracker.