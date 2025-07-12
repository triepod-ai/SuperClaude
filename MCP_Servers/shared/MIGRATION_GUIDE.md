# SuperClaude Shared Services Migration Guide

## Overview

This guide helps migrate existing MCP servers to use the new unified shared services that consolidate duplicated functionality across servers.

## New Shared Services

### 1. ComplexityAnalysisService
**Replaces**: 
- `superclaude-performance/ComplexityEstimator.ts`
- `superclaude-tasks/TaskDecomposer.ts` (complexity parts)
- `superclaude-code/SemanticAnalyzer.ts` (complexity parts)
- `superclaude-quality/SemanticAnalysisEngine.ts` (complexity parts)

**Usage**:
```typescript
import { ComplexityAnalysisService } from '@superclaude/shared';

const complexityService = new ComplexityAnalysisService();

// Analyze complexity for any target
const result = await complexityService.analyzeComplexity(
  content, 
  'snippet', 
  { language: 'typescript' }
);

// Get metrics only
const metrics = await complexityService.calculateMetrics(content, 'typescript');

// Get complexity level
const level = complexityService.getComplexityLevel(0.75); // 'complex'

// Get suggestions
const strategies = complexityService.suggestBreakdownStrategies(metrics, 'typescript');
```

### 2. SemanticAnalysisService
**Replaces**:
- `superclaude-quality/SemanticAnalysisEngine.ts`
- `superclaude-code/SemanticAnalyzer.ts` (semantic parts)

**Usage**:
```typescript
import { SemanticAnalysisService } from '@superclaude/shared';

const semanticService = new SemanticAnalysisService();

// Full semantic analysis
const analysis = await semanticService.analyzeCode({
  filePath: '/path/to/file.ts',
  content: sourceCode,
  language: 'typescript',
  includePatterns: true
});

// Extract symbols only
const symbols = await semanticService.extractSymbols(content, config);

// Analyze dependencies
const deps = await semanticService.analyzeDependencies(content, config);

// Get language-specific recommendations
const recommendations = semanticService.getLanguageRecommendations('typescript', analysis);
```

### 3. UnifiedValidationService
**Replaces**:
- `superclaude-quality/ValidationFramework.ts`
- Scattered validation logic across servers

**Usage**:
```typescript
import { UnifiedValidationService, ValidationStep } from '@superclaude/shared';

const validationService = new UnifiedValidationService();

// Register custom step executors
validationService.registerStepExecutor(ValidationStep.SYNTAX, async (filePath, content, language) => {
  // Custom syntax validation logic
  return {
    step: ValidationStep.SYNTAX,
    passed: true,
    score: 100,
    issues: [],
    executionTime: 50,
    metadata: { language }
  };
});

// Validate single file
const results = await validationService.validateFile({
  filePath: '/path/to/file.ts',
  content: sourceCode,
  enabledSteps: [ValidationStep.SYNTAX, ValidationStep.SECURITY]
});

// Validate entire project
const projectResults = await validationService.validateProject('/project/path');

// Generate quality gates
const gates = validationService.generateQualityGates(results);
```

### 4. TextProcessingService
**Replaces**:
- Keyword extraction in `superclaude-tasks/TaskDecomposer.ts`
- Text parsing utilities across servers

**Usage**:
```typescript
import { TextProcessingService } from '@superclaude/shared';

const textService = new TextProcessingService();

// Comprehensive text analysis
const analysis = await textService.analyzeText(description, {
  includeSentiment: true,
  customTerms: ['docker', 'kubernetes']
});

// Extract keywords
const keywords = textService.extractKeywords(text, {
  maxKeywords: 15,
  includeNgrams: true,
  filterStopWords: true
});

// Find patterns
const patterns = textService.findPatterns(text, [
  /function\s+(\w+)/g,
  'TODO'
], { caseSensitive: false });

// Parse structured text
const parsed = textService.parseStructuredText(markdownContent);

// Generate summary
const summary = textService.generateSummary(longText, 3);
```

### 5. CrossServerCoordinationService
**Replaces**:
- Cross-server coordination patterns
- Server communication logic

**Usage**:
```typescript
import { CrossServerCoordinationService } from '@superclaude/shared';

const coordinator = new CrossServerCoordinationService();

// Register server
coordinator.registerServer({
  id: 'superclaude-quality',
  name: 'Quality Server',
  version: '1.0.0',
  description: 'Quality analysis server',
  capabilities: ['syntax-check', 'security-scan', 'code-quality']
});

// Execute cross-server task
const result = await coordinator.executeTask('analysis', {
  filePath: '/path/to/file.ts',
  analysisTypes: ['syntax', 'security']
}, {
  requiredCapabilities: ['syntax-check', 'security-scan'],
  strategy: 'parallel'
});

// Get available servers
const servers = coordinator.getAvailableServers({
  requiredCapabilities: ['code-quality'],
  maxLoad: 0.8
});
```

## Migration Steps

### Step 1: Update Server Dependencies

Update `package.json` in each server:

```json
{
  "dependencies": {
    "@superclaude/shared": "workspace:*"
  }
}
```

### Step 2: Replace Imports

**Before**:
```typescript
import { ComplexityEstimator } from './core/ComplexityEstimator.js';
import { SemanticAnalysisEngine } from './core/SemanticAnalysisEngine.js';
import { ValidationFramework } from './core/ValidationFramework.js';
```

**After**:
```typescript
import { 
  ComplexityAnalysisService,
  SemanticAnalysisService,
  UnifiedValidationService 
} from '@superclaude/shared';
```

### Step 3: Update Server Implementations

#### SuperClaude-Performance Server

**Before**:
```typescript
class MCPServer {
  private complexityEstimator: ComplexityEstimator;
  
  constructor() {
    this.complexityEstimator = new ComplexityEstimator();
  }
  
  async estimateComplexity(args: any) {
    return this.complexityEstimator.estimateComplexity(args.target, args.type, args.options);
  }
}
```

**After**:
```typescript
import { ComplexityAnalysisService } from '@superclaude/shared';

class MCPServer {
  private complexityService: ComplexityAnalysisService;
  
  constructor() {
    this.complexityService = new ComplexityAnalysisService();
  }
  
  async estimateComplexity(args: any) {
    return this.complexityService.analyzeComplexity(args.target, args.type, args.options);
  }
  
  // Override for file operations specific to this server
  async analyzeFileComplexity(filePath: string, options: any) {
    const content = await this.readFile(filePath);
    return this.complexityService.calculateMetrics(content, options.language || 'javascript');
  }
}
```

#### SuperClaude-Quality Server

**Before**:
```typescript
class MCPServer {
  private semanticEngine: SemanticAnalysisEngine;
  private validationFramework: ValidationFramework;
  
  async analyzeFile(args: any) {
    return this.semanticEngine.analyzeFile(args);
  }
  
  async validateFile(args: any) {
    return this.validationFramework.validateFile(args);
  }
}
```

**After**:
```typescript
import { 
  SemanticAnalysisService, 
  UnifiedValidationService,
  ValidationStep 
} from '@superclaude/shared';

class MCPServer {
  private semanticService: SemanticAnalysisService;
  private validationService: UnifiedValidationService;
  
  constructor() {
    this.semanticService = new SemanticAnalysisService();
    this.validationService = new UnifiedValidationService();
    
    // Register custom validation steps
    this.registerCustomValidators();
  }
  
  async analyzeFile(args: any) {
    return this.semanticService.analyzeCode(args);
  }
  
  async validateFile(args: any) {
    return this.validationService.validateFile(args);
  }
  
  private registerCustomValidators() {
    this.validationService.registerStepExecutor(
      ValidationStep.LINT, 
      this.customLintValidator.bind(this)
    );
  }
  
  private async customLintValidator(filePath: string, content: string, language: string) {
    // Server-specific lint validation
    return {
      step: ValidationStep.LINT,
      passed: true,
      score: 100,
      issues: [],
      executionTime: 0,
      metadata: { language, tool: 'eslint' }
    };
  }
}
```

#### SuperClaude-Tasks Server

**Before**:
```typescript
class TaskDecomposer {
  assessTaskComplexity(task: Task): number {
    // Duplicate complexity logic
  }
  
  analyzeTaskContent(description: string) {
    // Duplicate text processing
  }
}
```

**After**:
```typescript
import { ComplexityAnalysisService, TextProcessingService } from '@superclaude/shared';

class TaskDecomposer {
  private complexityService: ComplexityAnalysisService;
  private textService: TextProcessingService;
  
  constructor() {
    this.complexityService = new ComplexityAnalysisService();
    this.textService = new TextProcessingService();
  }
  
  async assessTaskComplexity(task: Task): Promise<number> {
    const analysis = await this.textService.analyzeText(task.description);
    return analysis.complexity;
  }
  
  async analyzeTaskContent(description: string) {
    return this.textService.analyzeText(description, {
      customTerms: this.TECHNICAL_KEYWORDS,
      includeSentiment: false
    });
  }
}
```

### Step 4: Remove Duplicate Files

After migration, remove these files:

#### superclaude-performance
- `src/core/ComplexityEstimator.ts` ✅ Replace with shared service

#### superclaude-quality  
- `src/core/SemanticAnalysisEngine.ts` ✅ Replace with shared service
- `src/core/ValidationFramework.ts` ✅ Replace with shared service

#### superclaude-tasks
- Complexity analysis methods in `TaskDecomposer.ts` ✅ Use shared service
- Text processing methods ✅ Use shared service

#### superclaude-code
- Complexity analysis methods in `SemanticAnalyzer.ts` ✅ Use shared service

### Step 5: Update Tests

Update test files to use shared services:

**Before**:
```typescript
import { ComplexityEstimator } from '../core/ComplexityEstimator.js';

describe('ComplexityEstimator', () => {
  let estimator: ComplexityEstimator;
  
  beforeEach(() => {
    estimator = new ComplexityEstimator();
  });
});
```

**After**:
```typescript
import { ComplexityAnalysisService } from '@superclaude/shared';

describe('ComplexityAnalysisService', () => {
  let service: ComplexityAnalysisService;
  
  beforeEach(() => {
    service = new ComplexityAnalysisService();
  });
});
```

## Benefits

1. **Eliminated Duplication**: No more duplicate complexity, semantic analysis, or validation logic
2. **Consistent Behavior**: All servers use the same core algorithms
3. **Centralized Improvements**: Enhancements benefit all servers
4. **Reduced Maintenance**: Single place to fix bugs and add features
5. **Better Testing**: Shared services have comprehensive test coverage
6. **Cross-Server Coordination**: Built-in coordination between servers

## Clear Server Responsibilities

After migration, each server has clear, focused responsibilities:

### superclaude-performance
- Performance profiling and monitoring
- Cross-server performance optimization
- Performance metrics collection
- Uses shared ComplexityAnalysisService for complexity assessment

### superclaude-quality  
- Quality gates and validation orchestration
- Custom validation rule engines
- Quality reporting and metrics
- Uses shared UnifiedValidationService and SemanticAnalysisService

### superclaude-tasks
- Task management and decomposition
- Project planning and estimation  
- Workflow orchestration
- Uses shared TextProcessingService and ComplexityAnalysisService

### superclaude-code
- LSP integration and symbol management
- Code editing and manipulation
- Tree-sitter parsing
- Uses shared SemanticAnalysisService for analysis

### superclaude-intelligence
- Decision frameworks and reasoning
- Learning systems and knowledge graphs
- High-level coordination
- Uses shared CrossServerCoordinationService

### superclaude-orchestrator
- Wave management and coordination
- Workflow orchestration
- Circuit breaker patterns
- Uses shared CrossServerCoordinationService

## Next Steps

1. Update each server following the migration steps above
2. Run tests to ensure functionality is preserved
3. Remove duplicate files after confirming migration
4. Update documentation to reflect new architecture
5. Add integration tests for cross-server coordination