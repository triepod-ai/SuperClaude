---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "AI-powered comprehensive code review with quality, security, performance, and architectural analysis"
---

# /review - Intelligent Code Review Framework

**Purpose**: Comprehensive code review and quality analysis with evidence-based recommendations  
**Category**: Quality & Analysis  
**Syntax**: `/review $ARGUMENTS`

## Examples

```bash
/review                                    # Auto-detect changes and review
/review @src/auth/login.ts                 # Review specific file
/review --commit HEAD~1                    # Review last commit
/review --pr main..feature                 # Review pull request changes
/review @src/ --security --fix             # Security-focused with fixes
/review !git diff --performance            # Review git diff for performance
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Files, directories, commits, or PRs to review
- `@<path>` - Explicit file or directory to review
- `!<command>` - Execute command and review output (git diff, etc.)
- `--<flag>` - Review focus and configuration options

### Review Targets

- `--files`: Review specific files/directories (default if @ used)
- `--commit`: Review Git commit changes
- `--pr`: Review pull request changes
- `--diff`: Review provided diff output

### Review Focus Areas

- `--quality`: Code quality and maintainability (default)
- `--security`: Security vulnerability analysis
- `--performance`: Performance bottleneck detection
- `--architecture`: Design pattern and structure review

### Enhancement Options

- `--fix`: Provide specific fix suggestions
- `--evidence`: Include research and citations
- `--metrics`: Generate quality metrics report
- `--summary`: Create executive summary

### Universal SuperClaude Flags

- `--plan`: Show review strategy before execution
- `--think`: Analyze code complexity
- `--think-hard`: Deep architectural analysis
- `--introspect`: Show review reasoning

### Persona Integration

- `--persona-security`: Security specialist review
- `--persona-performance`: Performance expert analysis
- `--persona-architect`: Architectural assessment
- `--persona-qa`: Quality assurance perspective

### MCP Server Control

- `--c7`: Enable Context7 for best practices
- `--seq`: Enable Sequential for complex analysis
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Target Analysis
1. **Scope Detection**: Identify what to review
2. **Technology Discovery**: Detect languages and frameworks
3. **Context Gathering**: Understand surrounding code
4. **Priority Assessment**: Focus on critical areas

### Phase 2: Multi-Dimensional Review
1. **Quality Analysis**: Complexity, maintainability, SOLID
2. **Security Scanning**: OWASP vulnerabilities, patterns
3. **Performance Review**: Bottlenecks, optimization
4. **Architecture Assessment**: Patterns, coupling

### Phase 3: Recommendation Generation
1. **Issue Prioritization**: Critical/High/Medium/Low
2. **Fix Generation**: Specific code improvements
3. **Evidence Collection**: Best practices, docs
4. **Report Creation**: Structured findings

## Review Dimensions

### Code Quality Analysis

**Complexity Metrics**:
```bash
📊 Code Complexity Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Function: authenticateUser
├─ Cyclomatic: 12 (⚠️ high)
├─ Cognitive: 18 (❌ very high)
├─ Nesting: 4 levels
└─ Lines: 87 (⚠️ long)

💡 Recommendation:
- Extract validation logic (lines 23-45)
- Simplify nested conditions
- Consider strategy pattern
```

**SOLID Principles**:
```bash
🏗️ SOLID Principles Check
━━━━━━━━━━━━━━━━━━━━━━━━
✅ Single Responsibility: Pass
❌ Open/Closed: Violation detected
✅ Liskov Substitution: Pass
⚠️ Interface Segregation: Warning
✅ Dependency Inversion: Pass

📋 Details:
- UserService handles both auth & logging
- Hardcoded strategies in PaymentProcessor
```

### Security Analysis

**OWASP Top 10 Scanning**:
```bash
🔒 Security Vulnerability Scan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 Critical: SQL Injection
├─ Location: api/search.js:42
├─ Pattern: String concatenation in query
├─ Impact: Database compromise
└─ Fix: Use parameterized queries

⚠️ High: Weak Encryption
├─ Location: auth/crypto.js:15
├─ Pattern: MD5 hash usage
├─ Impact: Password vulnerability
└─ Fix: Use bcrypt or argon2

✅ XSS Protection: Implemented
✅ CSRF Protection: Token found
```

### Performance Analysis

**Bottleneck Detection**:
```bash
⚡ Performance Analysis
━━━━━━━━━━━━━━━━━━━━━
🐌 N+1 Query Pattern
├─ Location: UserService.getTeams()
├─ Impact: 50+ queries per request
├─ Fix: Add eager loading
└─ Expected: 80% reduction

⏱️ Synchronous Operations
├─ Location: FileProcessor.parse()
├─ Blocking: 200ms average
├─ Fix: Use async/streaming
└─ Expected: Non-blocking

💾 Memory Leak Risk
├─ Location: EventManager
├─ Issue: Listeners not removed
└─ Fix: Implement cleanup
```

### Architecture Review

**Design Pattern Analysis**:
```bash
🏗️ Architecture Assessment
━━━━━━━━━━━━━━━━━━━━━━━━
📐 Design Patterns:
├─ ✅ Factory: Well implemented
├─ ⚠️ Singleton: Thread safety issue
└─ ❌ God Object: UserController

🔗 Coupling Analysis:
├─ High coupling: Auth ↔ User
├─ Circular dep: A → B → C → A
└─ Feature envy: OrderService

💡 Recommendations:
1. Extract UserController logic
2. Introduce interfaces for decoupling
3. Apply dependency injection
```

## Example Workflows

### File Review

```bash
/review @src/services/payment.js --security --fix

🔍 Reviewing: payment.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔒 Security Issues Found (2):

1. 🚨 CRITICAL: Hardcoded API Key
   Line 15: const API_KEY = "sk_live_abc123"
   
   Fix:
   ```javascript
   // Use environment variable
   const API_KEY = process.env.PAYMENT_API_KEY;
   
   // Add validation
   if (!API_KEY) {
     throw new Error('Payment API key not configured');
   }
   ```

2. ⚠️ HIGH: Insufficient Input Validation
   Line 42: amount = req.body.amount
   
   Fix:
   ```javascript
   // Validate and sanitize input
   const amount = parseFloat(req.body.amount);
   if (isNaN(amount) || amount <= 0 || amount > 999999) {
     throw new ValidationError('Invalid amount');
   }
   ```

✅ Summary: 2 security issues (1 critical, 1 high)
📋 Estimated fix time: 15 minutes
```

### Commit Review

```bash
/review --commit HEAD~1 --quality --metrics

📊 Commit Review: feat: add user authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Quality Metrics:
├─ Files changed: 8
├─ Lines added: 342
├─ Complexity increase: +15
└─ Test coverage: 78% (+5%)

✅ Positive Changes:
- Good error handling added
- Comprehensive test suite
- Clear documentation

⚠️ Issues Found:
1. High complexity in AuthService.login() (CC: 15)
2. Missing input validation in 2 endpoints
3. Potential race condition in token refresh

🎯 Overall Score: 7.5/10 (Good)
```

### PR Review

```bash
/review --pr main..feature/oauth --architecture --summary

📋 Pull Request Review Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overview
- PR: Add OAuth2 Integration
- Changes: 23 files, +1,842 -234 lines
- Risk Level: Medium
- Quality Score: 8.2/10

## Architectural Impact
✅ Follows existing auth patterns
✅ Proper separation of concerns
⚠️ Increases coupling with external services
❌ Missing abstraction layer for providers

## Key Recommendations
1. Add provider abstraction interface
2. Implement circuit breaker for OAuth calls
3. Add comprehensive error handling
4. Increase test coverage (currently 72%)

## Approval Status
✅ Ready to merge with minor changes
```

### Security-Focused Review

```bash
/review @src/api/ --persona-security --evidence

🔒 Security Review by Security Specialist
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Threat Model Analysis
Reviewing API endpoints for OWASP Top 10...

🚨 A01-Injection Vulnerabilities (2 found):
1. SQL Injection in SearchController
   - Evidence: OWASP SQL Injection Guide
   - CWE-89: Improper Input Neutralization
   
2. NoSQL Injection in UserPreferences
   - Evidence: MongoDB Security Checklist
   - Fix: Use sanitization library

⚠️ A02-Broken Authentication (1 found):
1. Weak session timeout (30 days)
   - Evidence: NIST SP 800-63B
   - Recommendation: 12 hours maximum

✅ A03-Sensitive Data: Properly encrypted
✅ A04-XXE: Not applicable (no XML)

📊 Security Score: 6/10 (Needs Improvement)
🔗 Full OWASP compliance report attached
```

## Review Reports

### Executive Summary Format

```markdown
# Code Review Executive Summary

**Date**: [timestamp]  
**Scope**: [files/commits reviewed]  
**Overall Health**: [score]/10

## Key Findings
- **Critical Issues**: [count] requiring immediate attention
- **Security Risks**: [count] vulnerabilities found
- **Performance**: [count] optimization opportunities
- **Technical Debt**: [estimate] hours to resolve

## Top Recommendations
1. [Most critical fix with business impact]
2. [High-value improvement opportunity]
3. [Strategic architectural enhancement]

## Metrics Summary
- Code Coverage: [value]% ([trend])
- Complexity: [value] ([trend])
- Security Score: [value]/10
```

### Detailed Technical Report

```markdown
# Technical Review Report

## File Analysis
[Detailed findings per file with line numbers]

## Security Findings
[OWASP categorized vulnerabilities with fixes]

## Performance Analysis
[Bottlenecks with benchmarks and solutions]

## Architecture Assessment
[Pattern analysis and refactoring suggestions]

## Test Coverage Gaps
[Missing tests with examples]

## Action Items
[Prioritized list with effort estimates]
```

## Quality Gates

### Automated Checks
- **Complexity**: Cyclomatic < 10, Cognitive < 15
- **Coverage**: Minimum 80% for new code
- **Security**: No critical vulnerabilities
- **Performance**: No N+1 queries, <100ms response
- **Duplication**: <5% duplicate code

### Review Standards
- All findings include evidence/citations
- Fix suggestions are tested and complete
- Recommendations prioritized by impact
- Reports tailored to audience

## Integration with SuperClaude

### Intelligent Analysis
- **Multi-Persona**: Combine specialist perspectives
- **Evidence-Based**: Research best practices via MCP
- **Context-Aware**: Understand project patterns
- **Progressive**: Learn from review feedback

### Automated Workflows
- **TodoWrite Integration**: Track review progress
- **Batch Analysis**: Review multiple files efficiently
- **Fix Validation**: Test suggested improvements
- **Trend Analysis**: Track quality over time

---

*SuperClaude Enhanced | Intelligent Code Review | Evidence-Based Quality*