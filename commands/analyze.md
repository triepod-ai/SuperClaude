---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Comprehensive multi-dimensional code and system analysis with deep inspection capabilities"
---

# /analyze - Deep Code & System Analysis

**Purpose**: Multi-dimensional analysis of code quality, architecture, security, and performance  
**Category**: Analysis  
**Syntax**: `/analyze $ARGUMENTS`

## Examples

```bash
/analyze                              # Auto-detect and analyze current project
/analyze @src/ --focus performance    # Performance-focused analysis of src directory
/analyze @components/ --security      # Security analysis of components
/analyze --scope architecture         # System-wide architectural analysis
/analyze @api/ !npm test --quality    # Quality analysis with integrated testing
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Files/directories to analyze (default: auto-detect project)
- `@<path>` - Explicit file or directory targeting
- `!<command>` - Execute command and analyze results
- `--<flag>` - Analysis configuration and focus areas

### Analysis Scope

- `--scope file`: Single file deep analysis
- `--scope module`: Module-level analysis with dependencies
- `--scope project`: Full project analysis (default)
- `--scope architecture`: System-wide architectural analysis

### Analysis Focus

- `--focus quality`: Code quality, maintainability, complexity
- `--focus performance`: Performance bottlenecks and optimizations
- `--focus security`: Security vulnerabilities and best practices
- `--focus architecture`: Design patterns and system structure
- `--focus dependencies`: Dependency analysis and management

### Analysis Depth

- `--quick`: Fast analysis with essential insights
- `--standard`: Comprehensive analysis (default)
- `--deep`: Thorough analysis with detailed recommendations
- `--comprehensive`: Maximum depth analysis with all domains

### Filtering Options

- `--include <pattern>`: Include specific file patterns
- `--exclude <pattern>`: Exclude file patterns (node_modules, build, etc.)
- `--language <lang>`: Focus on specific programming language
- `--framework <name>`: Framework-specific analysis patterns

### Universal SuperClaude Flags

- `--plan`: Show analysis execution plan
- `--think`: Standard analysis with context (~4K tokens)
- `--think-hard`: Deep architectural analysis (~10K tokens)
- `--ultrathink`: Critical system analysis (~32K tokens)
- `--introspect`: Show analysis decision-making process

### Persona Integration

- `--persona-analyzer`: Root cause specialist, systematic investigation
- `--persona-architect`: System design and scalability focus
- `--persona-security`: Security and compliance specialist
- `--persona-performance`: Optimization and efficiency expert

### MCP Server Control

- `--c7`: Enable Context7 for framework documentation and patterns
- `--seq`: Enable Sequential for complex multi-step analysis
- `--all-mcp`: Enable comprehensive analysis with all MCP servers
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Discovery & Scoping
1. **Target Resolution**: Process @path references and validate access
2. **Project Detection**: Identify framework, language, build tools
3. **Scope Definition**: Determine analysis boundaries and depth
4. **Tool Selection**: Choose optimal analysis tools and strategies

### Phase 2: Data Collection
1. **File Enumeration**: Use Glob to discover all relevant files
2. **Content Analysis**: Use Read for detailed file inspection
3. **Pattern Matching**: Use Grep for cross-file pattern analysis
4. **Metric Collection**: Gather quantitative measures and statistics

### Phase 3: Analysis & Processing
1. **Quality Assessment**: Code complexity, maintainability metrics
2. **Security Evaluation**: Vulnerability scanning and pattern analysis
3. **Performance Review**: Bottleneck identification and optimization opportunities
4. **Architecture Analysis**: Design pattern evaluation and structure assessment

### Phase 4: Synthesis & Reporting
1. **Finding Aggregation**: Combine insights across all domains
2. **Priority Assessment**: Rank issues by impact and urgency
3. **Recommendation Generation**: Provide actionable improvement steps
4. **Report Generation**: Create comprehensive analysis documentation

## Analysis Domains

### Code Quality Analysis

**Complexity Metrics**:
- Cyclomatic complexity (target <10, warning >15)
- Cognitive complexity (target <15, warning >25)
- Nesting depth analysis
- Function/method length assessment

**Maintainability Factors**:
- Code duplication detection (target <5%)
- Naming convention consistency
- Documentation coverage analysis
- Code structure and organization

**Quality Gates**:
```bash
📊 Code Quality Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Overall Score: 87/100 (Good)

📈 Metrics Summary:
├─ Complexity: 12.3 avg (target: <15) ✅
├─ Duplication: 3.7% (target: <5%) ✅
├─ Coverage: 89% (target: >80%) ✅
└─ Maintainability: 8.2/10 ✅

⚠️ Issues Found:
├─ High complexity: src/utils/parser.js:145 (CC: 23)
├─ Code duplication: auth module (15 instances)
└─ Missing tests: src/services/ (67% coverage)
```

### Security Analysis

**Vulnerability Detection**:
- Input validation gaps
- Authentication/authorization flaws
- Data exposure risks
- Injection vulnerability patterns

**Security Best Practices**:
- OWASP Top 10 compliance checking
- Secure coding pattern validation
- Dependency vulnerability scanning
- Configuration security review

**Security Report**:
```bash
🔒 Security Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ Security Score: 92/100 (Excellent)

🚨 Critical Issues: 0
⚠️ High Priority: 2
🟡 Medium Priority: 5
ℹ️ Low Priority: 8

🔍 Key Findings:
├─ Input validation: Missing in API endpoints (2)
├─ Dependencies: 1 moderate vulnerability
├─ Auth implementation: Secure patterns used ✅
└─ Data handling: Proper sanitization ✅
```

### Performance Analysis

**Performance Bottlenecks**:
- Algorithm complexity analysis (O(n²) → O(n log n))
- Database query optimization opportunities
- Memory usage patterns and leaks
- Network request optimization

**Optimization Opportunities**:
- Caching strategy improvements
- Bundle size optimization
- Lazy loading implementations
- Critical path optimization

**Performance Metrics**:
```bash
⚡ Performance Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Performance Score: 78/100 (Good)

🔍 Bottleneck Analysis:
├─ Database queries: N+1 pattern detected (3 locations)
├─ Bundle size: 247KB (target: <200KB)
├─ Memory usage: Potential leak in UserService
└─ API response time: 340ms avg (target: <200ms)

⚡ Optimization Opportunities:
├─ Implement query batching: ~60% faster
├─ Enable code splitting: -47KB bundle size
├─ Add caching layer: ~40% response improvement
└─ Optimize image loading: -23% initial load
```

### Architecture Analysis

**Design Pattern Assessment**:
- SOLID principles compliance
- Design pattern usage and appropriateness
- Component coupling and cohesion analysis
- Dependency injection and inversion patterns

**System Structure**:
- Module organization and boundaries
- API design and consistency
- Data flow and state management
- Error handling patterns

**Architecture Review**:
```bash
🏗️ Architecture Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Architecture Score: 85/100 (Good)

📐 Design Principles:
├─ Single Responsibility: 89% compliance ✅
├─ Open/Closed: 78% compliance 🟡
├─ Dependency Inversion: 92% compliance ✅
└─ Interface Segregation: 84% compliance ✅

🔍 Structure Analysis:
├─ Coupling: Low (good separation of concerns)
├─ Cohesion: High (well-organized modules)
├─ Complexity: Manageable (clear boundaries)
└─ Scalability: Good (horizontal scaling ready)
```

### Dependency Analysis

**Dependency Health**:
- Outdated package detection
- Security vulnerability scanning
- License compatibility checking
- Bundle impact analysis

**Dependency Optimization**:
- Unused dependency identification
- Alternative package recommendations
- Version conflict resolution
- Tree shaking opportunities

## Analysis Reports

### Executive Summary
```bash
📋 Analysis Executive Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Project Health Score: 84/100 (Good)

📊 Domain Breakdown:
├─ Code Quality: 87/100 (Good) ✅
├─ Security: 92/100 (Excellent) ✅
├─ Performance: 78/100 (Good) 🟡
├─ Architecture: 85/100 (Good) ✅
└─ Dependencies: 81/100 (Good) ✅

🚨 Priority Actions:
1. Fix N+1 query pattern (performance impact: high)
2. Update 3 vulnerable dependencies
3. Reduce bundle size by 47KB
4. Add input validation to API endpoints

📈 Improvement Potential: 16 points possible
⏱️ Estimated effort: 2-3 developer days
```

### Detailed Findings Report

**Code Quality Issues**:
- Detailed complexity analysis with specific line numbers
- Duplication instances with refactoring suggestions
- Naming convention violations with recommendations
- Documentation gaps with priority levels

**Security Vulnerabilities**:
- CVE references with severity ratings
- Exploit scenario descriptions
- Mitigation strategies with implementation guides
- Compliance gap analysis

**Performance Bottlenecks**:
- Profiling data with hot path identification
- Memory usage patterns with optimization opportunities
- Database query analysis with improvement suggestions
- Frontend performance metrics with optimization strategies

## Integration Patterns

### Framework-Specific Analysis

**React Projects**:
- Component lifecycle optimization
- Hook usage pattern analysis
- State management evaluation
- Bundle size and performance analysis

**Vue Projects**:
- Component composition analysis
- Reactivity system optimization
- Build configuration review
- Performance directive usage

**Angular Projects**:
- Component architecture assessment
- Service injection pattern review
- Change detection optimization
- Bundle analyzer integration

**Node.js Projects**:
- Event loop optimization
- Memory leak detection
- API design pattern analysis
- Security middleware review

### Language-Specific Insights

**TypeScript**:
- Type safety analysis
- Generic usage patterns
- Interface design review
- Compiler optimization suggestions

**JavaScript**:
- ES6+ feature usage analysis
- Async/await pattern review
- Error handling assessment
- Performance anti-pattern detection

**Python**:
- PEP compliance checking
- Performance bottleneck identification
- Security pattern analysis
- Dependency management review

## Error Handling

### Analysis Failures

**File Access Issues**:
- Permission denied graceful handling
- Missing file alternative strategies
- Large file processing optimization
- Binary file exclusion logic

**Resource Constraints**:
- Memory limit management for large codebases
- Token usage optimization strategies
- Progressive analysis for complex projects
- Incremental analysis checkpoint saving

### Recovery Strategies
```bash
⚠️ Analysis limitation detected
📊 Large codebase (>10K files) → enabling incremental mode
🔄 Processing in batches of 500 files
💾 Creating checkpoints for progress recovery
✅ Analysis adapted successfully
```

## Example Workflows

### Quick Health Check
```bash
/analyze --quick --focus quality

🔍 Quick Analysis Starting...
📊 Analyzing 247 files
✅ Analysis complete (12.3s)

🎯 Health Score: 84/100
⚠️ 3 high-priority issues found
📋 Detailed report available with --deep
```

### Comprehensive Security Audit
```bash
/analyze --focus security --deep --seq

🔒 Security Analysis Starting...
🧠 Sequential thinking enabled
🔍 Deep vulnerability scanning...
📊 OWASP compliance checking...
✅ Security audit complete

🛡️ Security Score: 92/100
🚨 2 vulnerabilities require attention
📋 Full security report generated
```

### Performance Optimization Review
```bash
/analyze @src/api/ --focus performance --persona-performance

⚡ Performance Analysis Starting...
🎯 Persona: Performance Specialist
🔍 Analyzing API performance patterns...
📊 Database query optimization review...
🚀 Bundle analysis complete

📈 Performance Score: 78/100
⚡ 4 optimization opportunities identified
💡 Estimated 60% performance improvement possible
```

## Integration with SuperClaude

### Automatic Optimization
- **Token Usage**: Smart analysis depth based on project size
- **MCP Activation**: Context7 for patterns, Sequential for complex analysis
- **Persona Selection**: Automatic based on analysis focus
- **Progress Tracking**: TodoWrite integration for multi-phase analysis

### Evidence-Based Reporting
- All metrics backed by measurable data
- Recommendations include effort estimates
- Improvement suggestions with expected impact
- Comparison baselines for progress tracking

---

*SuperClaude Enhanced | Evidence-Based Analysis | Claude Code Native Integration*