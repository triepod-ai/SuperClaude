---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Evidence-based code enhancement with metrics-driven optimization and iterative improvement"
---

# /improve - Evidence-Based Code Enhancement

**Purpose**: Systematic code quality, performance, and architecture improvements with measurable results  
**Category**: Quality  
**Syntax**: `/improve $ARGUMENTS`

## Examples

```bash
/improve                           # Auto-detect and improve current project
/improve @src/ --quality           # Code quality improvements for src directory
/improve --performance --iterate   # Iterative performance optimization
/improve @api/ !npm test --safe    # Safe improvements with test validation
/improve --architecture --metrics  # Architecture improvements with measurements
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Files/directories to improve (default: auto-detect project)
- `@<path>` - Explicit file or directory targeting
- `!<command>` - Execute command for validation during improvement
- `--<flag>` - Improvement type and safety configuration

### Improvement Types

- `--quality`: Code quality, maintainability, complexity reduction
- `--performance`: Speed optimization, bottleneck elimination
- `--architecture`: Design pattern improvements, structure optimization
- `--security`: Security enhancements, vulnerability fixes
- `--accessibility`: A11y compliance and usability improvements

### Improvement Modes

- `--safe`: Conservative mode, only guaranteed safe changes
- `--aggressive`: More comprehensive improvements with higher risk
- `--iterate`: Continue improving until threshold met or no more gains
- `--dry-run`: Show improvements without making changes
- `--incremental`: Apply improvements step-by-step with validation

### Measurement & Validation

- `--metrics`: Generate detailed before/after metrics reports
- `--baseline`: Establish current performance baseline
- `--threshold <level>`: Target quality level (low|medium|high|perfect)
- `--budget <value>`: Performance/size budget constraints
- `--validate`: Run comprehensive validation after changes

### Scope Control

- `--scope file`: Single file optimization
- `--scope module`: Module-level improvements
- `--scope project`: Full project enhancement
- `--focus <area>`: Specific improvement focus area

### Universal SuperClaude Flags

- `--plan`: Show improvement strategy before execution
- `--think`: Standard analysis for improvement opportunities (~4K tokens)
- `--think-hard`: Deep optimization analysis (~10K tokens)
- `--ultrathink`: Comprehensive system redesign analysis (~32K tokens)
- `--introspect`: Show decision-making process for improvements

### Persona Integration

- `--persona-refactorer`: Code quality specialist, clean code focus
- `--persona-performance`: Optimization expert, speed and efficiency
- `--persona-architect`: System design improvements, scalability
- `--persona-security`: Security enhancements and compliance

### MCP Server Control

- `--c7`: Enable Context7 for framework best practices and patterns
- `--seq`: Enable Sequential for complex multi-step improvement planning
- `--all-mcp`: Comprehensive improvement with all available tools
- `--no-mcp`: Use only native Claude Code tools for improvements

## Workflow Process

### Phase 1: Analysis & Baseline
1. **Current State Assessment**: Analyze existing code quality and performance
2. **Metric Collection**: Establish baseline measurements and benchmarks
3. **Opportunity Identification**: Find improvement areas with highest impact
4. **Goal Setting**: Define specific, measurable improvement targets

### Phase 2: Planning & Strategy
1. **Improvement Prioritization**: Rank improvements by impact vs. effort
2. **Risk Assessment**: Evaluate safety and potential side effects
3. **Validation Strategy**: Plan testing and verification approaches
4. **Implementation Plan**: Create step-by-step improvement sequence

### Phase 3: Implementation
1. **Incremental Changes**: Apply improvements in small, testable chunks
2. **Continuous Validation**: Test after each change to ensure safety
3. **Progress Monitoring**: Track metrics and validate improvement goals
4. **Rollback Preparation**: Maintain ability to revert problematic changes

### Phase 4: Verification & Measurement
1. **Results Validation**: Confirm improvements meet defined goals
2. **Performance Testing**: Validate no regressions introduced
3. **Quality Assessment**: Measure improvement in target areas
4. **Documentation**: Record changes and lessons learned

## Improvement Domains

### Code Quality Enhancement

**Quality Metrics**:
- Cyclomatic complexity reduction (target: <10)
- Code duplication elimination (target: <5%)
- Method/function length optimization (target: <50 lines)
- Naming convention consistency improvements

**Quality Improvements**:
```bash
📊 Code Quality Enhancement Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Quality Score: 72/100 → 89/100 (+17 points)

📈 Improvements Applied:
├─ Complexity reduction: 23.4 → 12.1 avg (-48%)
├─ Code duplication: 8.7% → 3.2% (-63%)
├─ Function length: 78 → 42 lines avg (-46%)
└─ Naming consistency: 67% → 94% (+40%)

🔧 Refactoring Actions:
├─ Extracted 23 methods for complexity reduction
├─ Consolidated 15 duplicate code blocks
├─ Improved 89 variable/function names
└─ Added 34 missing documentation blocks
```

**Quality Enhancement Techniques**:
- Extract method refactoring for complex functions
- Consolidate duplicate code patterns
- Improve variable and function naming
- Add missing documentation and comments
- Simplify conditional logic and nested structures

### Performance Optimization

**Performance Areas**:
- Algorithm optimization (O(n²) → O(n log n))
- Database query optimization
- Memory usage reduction
- Caching strategy implementation
- Bundle size optimization

**Performance Results**:
```bash
⚡ Performance Optimization Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Performance Score: 68/100 → 91/100 (+23 points)

📊 Performance Gains:
├─ Response time: 1.8s → 0.3s (-83%)
├─ Memory usage: 45MB → 28MB (-38%)
├─ Bundle size: 247KB → 156KB (-37%)
└─ Database queries: 12 → 3 per request (-75%)

⚡ Optimizations Applied:
├─ Algorithm improvements: 8 O(n²) → O(n log n)
├─ Query optimization: Eliminated N+1 patterns
├─ Caching layer: Added Redis for 80% hit rate
└─ Bundle optimization: Tree shaking + code splitting
```

### Architecture Improvement

**Architecture Focus Areas**:
- SOLID principles compliance
- Design pattern implementation
- Dependency management optimization
- Module boundary clarification
- API design consistency

**Architecture Enhancement**:
```bash
🏗️ Architecture Improvement Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Architecture Score: 74/100 → 88/100 (+14 points)

📐 SOLID Principles Compliance:
├─ Single Responsibility: 76% → 92% (+21%)
├─ Open/Closed: 68% → 84% (+24%)
├─ Liskov Substitution: 89% → 94% (+6%)
├─ Interface Segregation: 71% → 87% (+23%)
└─ Dependency Inversion: 82% → 91% (+11%)

🔧 Architectural Changes:
├─ Extracted 12 interfaces for better abstraction
├─ Implemented dependency injection in 8 modules
├─ Created 5 new service layers for separation
└─ Refactored 15 classes for single responsibility
```

### Security Enhancement

**Security Improvement Areas**:
- Input validation strengthening
- Authentication/authorization hardening
- Data sanitization improvements
- Dependency vulnerability fixes
- Security header implementation

**Security Results**:
```bash
🔒 Security Enhancement Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ Security Score: 79/100 → 96/100 (+17 points)

🚨 Vulnerabilities Fixed:
├─ Critical: 2 → 0 (-100%)
├─ High: 5 → 1 (-80%)
├─ Medium: 12 → 3 (-75%)
└─ Low: 23 → 8 (-65%)

🔐 Security Improvements:
├─ Added input validation to 34 endpoints
├─ Implemented CSRF protection
├─ Updated 12 vulnerable dependencies
└─ Added security headers and CSP policies
```

## Iterative Improvement Process

### Iteration Strategy

**Continuous Improvement Loop**:
```bash
🔄 Iterative Improvement Process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Iteration 1: Quality Focus
├─ Baseline: 72/100 quality score
├─ Target: 85/100 quality score
├─ Actions: 15 refactoring operations
└─ Result: 84/100 (+12 points)

📊 Iteration 2: Performance Focus
├─ Baseline: 68/100 performance score
├─ Target: 85/100 performance score
├─ Actions: Algorithm + caching optimizations
└─ Result: 89/100 (+21 points)

📊 Iteration 3: Architecture Focus
├─ Baseline: 74/100 architecture score
├─ Target: 85/100 architecture score
├─ Actions: SOLID principles implementation
└─ Result: 88/100 (+14 points)

🎯 Overall Improvement: 71/100 → 87/100 (+16 points)
```

### Improvement Metrics Tracking

**Measurement Framework**:
- Before/after metric comparison
- Regression testing validation
- Performance benchmark tracking
- Quality gate compliance checking
- User experience impact assessment

## Safety Mechanisms

### Risk Mitigation

**Safety Protocols**:
1. **Version Control Checkpoints**: Create git branches before major changes
2. **Incremental Application**: Apply changes in small, testable increments
3. **Automated Testing**: Run comprehensive test suites after each change
4. **Rollback Planning**: Maintain clear rollback procedures for all changes
5. **Validation Gates**: Require validation before proceeding to next improvement

### Change Validation

**Validation Process**:
```bash
🔍 Change Validation Protocol
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Pre-Change Validation:
├─ Baseline metrics captured
├─ Test suite execution: PASSED
├─ Git checkpoint created
└─ Rollback plan documented

🔧 Change Implementation:
├─ Incremental changes applied
├─ Continuous testing enabled
├─ Progress monitoring active
└─ Validation at each step

✅ Post-Change Validation:
├─ All tests passing: ✅
├─ Performance maintained: ✅
├─ No regressions detected: ✅
└─ Improvement goals met: ✅
```

### Error Recovery

**Rollback Strategies**:
- Git reset to previous working state
- Selective file rollback for isolated issues
- Configuration restoration for setting changes
- Database rollback for schema modifications

## Advanced Improvement Techniques

### Machine Learning-Assisted Optimization

**Pattern Recognition**:
- Identify code smell patterns across codebase
- Learn from successful improvement patterns
- Predict optimal refactoring strategies
- Automate repetitive improvement tasks

### Automated Code Analysis

**Static Analysis Integration**:
- ESLint/TSLint for JavaScript/TypeScript
- SonarQube for comprehensive code analysis
- CodeClimate for maintainability scoring
- Security scanners for vulnerability detection

### Performance Profiling Integration

**Profiling Tools**:
- Application performance monitoring
- Memory usage profiling
- Database query analysis
- Bundle size analysis
- Network performance monitoring

## Improvement Reports

### Executive Summary
```bash
📋 Improvement Executive Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Overall Score: 71/100 → 87/100 (+16 points)
⏱️ Improvement Time: 4.2 hours
💰 Estimated Value: $12,400 in technical debt reduction

📊 Domain Improvements:
├─ Code Quality: +17 points (72 → 89)
├─ Performance: +23 points (68 → 91)
├─ Architecture: +14 points (74 → 88)
├─ Security: +17 points (79 → 96)
└─ Maintainability: +19 points (73 → 92)

🚀 Key Achievements:
├─ 83% faster response times
├─ 37% smaller bundle size
├─ 48% complexity reduction
└─ 75% fewer security vulnerabilities

📈 Business Impact:
├─ Improved user experience
├─ Reduced maintenance costs
├─ Enhanced security posture
└─ Better developer productivity
```

### Technical Details Report
```bash
🔬 Technical Improvement Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Metrics Comparison:

Quality Metrics:
├─ Cyclomatic Complexity: 23.4 → 12.1 (-48%)
├─ Code Duplication: 8.7% → 3.2% (-63%)
├─ Technical Debt: 45d → 18d (-60%)
└─ Test Coverage: 76% → 89% (+17%)

Performance Metrics:
├─ Response Time: 1.8s → 0.3s (-83%)
├─ Memory Usage: 45MB → 28MB (-38%)
├─ CPU Usage: 67% → 42% (-37%)
└─ Database Queries: 12 → 3 (-75%)

Architecture Metrics:
├─ Coupling: 47 → 23 (-51%)
├─ Cohesion: 68% → 84% (+24%)
├─ Abstractness: 34% → 52% (+53%)
└─ Instability: 0.67 → 0.34 (-49%)
```

## Example Workflows

### Basic Quality Improvement
```bash
/improve @src/ --quality --safe

🔧 Code Quality Improvement Starting...
📊 Analyzing 247 files for quality issues...
🎯 Found 23 improvement opportunities

✅ Applied safe improvements:
├─ Extracted 8 complex methods
├─ Improved 15 variable names
├─ Consolidated 5 duplicate blocks
└─ Added 12 missing docstrings

📈 Quality Score: 72/100 → 84/100 (+12 points)
```

### Performance Optimization with Metrics
```bash
/improve --performance --metrics --iterate

⚡ Performance Optimization Starting...
📊 Establishing baseline metrics...
🎯 Target: 50% response time improvement

🔄 Iteration 1: Algorithm Optimization
├─ Optimized sorting algorithms: O(n²) → O(n log n)
├─ Response time: 1.8s → 1.1s (-39%)
└─ Memory usage: 45MB → 38MB (-16%)

🔄 Iteration 2: Caching Implementation
├─ Added Redis caching layer
├─ Response time: 1.1s → 0.4s (-64%)
└─ Database load: -67%

🔄 Iteration 3: Query Optimization
├─ Eliminated N+1 query patterns
├─ Response time: 0.4s → 0.3s (-25%)
└─ Database queries: 12 → 3 per request

🎯 Final Result: 83% improvement (1.8s → 0.3s)
✅ Target exceeded: 50% → 83% improvement
```

### Architecture Refactoring
```bash
/improve --architecture --seq --persona-architect

🏗️ Architecture Improvement Starting...
🧠 Sequential analysis enabled
👨‍💼 Architect persona activated

📐 SOLID Principles Analysis:
├─ Single Responsibility: 76% compliance
├─ Open/Closed: 68% compliance
├─ Dependency Inversion: 82% compliance
└─ Interface Segregation: 71% compliance

🔧 Architectural Improvements:
├─ Extracted 12 service interfaces
├─ Implemented dependency injection
├─ Created separate data access layer
└─ Applied facade pattern for APIs

📊 Architecture Score: 74/100 → 88/100 (+14 points)
🎯 SOLID Compliance: 74% → 89% average
```

### Security Enhancement
```bash
/improve @api/ --security --validate

🔒 Security Enhancement Starting...
🛡️ Scanning for security vulnerabilities...
🚨 Found 23 security issues requiring attention

🔐 Security Improvements Applied:
├─ Added input validation to 15 endpoints
├─ Implemented rate limiting
├─ Updated 8 vulnerable dependencies
├─ Added CSRF protection
└─ Implemented security headers

🧪 Security Validation:
├─ OWASP compliance check: ✅ PASSED
├─ Penetration testing: ✅ PASSED
├─ Dependency audit: ✅ CLEAN
└─ Security headers: ✅ CONFIGURED

🛡️ Security Score: 79/100 → 96/100 (+17 points)
```

## Integration with SuperClaude

### Intelligent Optimization
- **Evidence-Based Decisions**: All improvements backed by measurable data
- **Risk-Aware Changes**: Safety assessment before applying modifications
- **Pattern Learning**: Learn from successful improvement strategies
- **Context-Aware**: Framework and language-specific optimizations

### Automation Features
- **Progress Tracking**: TodoWrite integration for complex improvement projects
- **Metric Collection**: Automated before/after measurement
- **Validation Loops**: Continuous testing and validation
- **Rollback Capability**: Automatic rollback on validation failures

---

*SuperClaude Enhanced | Evidence-Based Improvement | Measurable Results*