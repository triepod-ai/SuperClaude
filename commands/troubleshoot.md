---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Systematic problem investigation and resolution with root cause analysis"
---

# /troubleshoot - Systematic Problem Investigation

**Purpose**: Structured debugging and issue resolution with systematic root cause analysis  
**Category**: Analysis  
**Syntax**: `/troubleshoot $ARGUMENTS`

## Examples

```bash
/troubleshoot "slow API responses"          # Investigate performance issue
/troubleshoot @src/auth/ --security         # Security-focused troubleshooting
/troubleshoot !npm test --failed-tests     # Analyze failing tests
/troubleshoot --symptoms "memory leak"      # Symptom-based investigation
/troubleshoot @logs/ --error-analysis      # Log file error analysis
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[description]` - Problem description or symptoms in quotes
- `@<path>` - Target files/directories for investigation
- `!<command>` - Execute command and analyze failures/outputs
- `--<flag>` - Investigation scope and methodology

### Investigation Scope

- `--scope frontend`: Client-side issue investigation
- `--scope backend`: Server-side and API issue analysis
- `--scope database`: Database performance and integrity
- `--scope network`: Network connectivity and latency issues
- `--scope system`: System-level resource and configuration

### Problem Categories

- `--performance`: Speed, latency, and efficiency issues
- `--security`: Vulnerabilities and security breaches
- `--functionality`: Feature failures and incorrect behavior
- `--integration`: Service communication and data flow
- `--deployment`: Build, release, and environment issues

### Investigation Methods

- `--symptoms <description>`: Start with observed symptoms
- `--hypothesis <theory>`: Test specific hypothesis
- `--timeline <period>`: Time-based issue analysis
- `--regression`: Compare with previous working state
- `--reproduce`: Attempt to reproduce the issue

### Analysis Depth

- `--quick`: Fast triage and immediate fixes
- `--standard`: Comprehensive investigation (default)
- `--deep`: Thorough root cause analysis
- `--forensic`: Detailed investigation with evidence collection

### Universal SuperClaude Flags

- `--plan`: Show investigation strategy before execution
- `--think`: Standard problem-solving approach (~4K tokens)
- `--think-hard`: Deep systematic analysis (~10K tokens)
- `--ultrathink`: Critical system failure investigation (~32K tokens)
- `--introspect`: Show reasoning and decision-making process

### Persona Integration

- `--persona-analyzer`: Root cause specialist, methodical investigation
- `--persona-qa`: Testing focus, quality assurance perspective
- `--persona-security`: Security incident response specialist
- `--persona-performance`: Performance optimization expert

### MCP Server Control

- `--c7`: Enable Context7 for framework-specific troubleshooting patterns
- `--seq`: Enable Sequential for complex multi-step analysis
- `--pup`: Enable Puppeteer for browser-based issue reproduction
- `--all-mcp`: Comprehensive investigation with all available tools

## Workflow Process

### Phase 1: Problem Definition
1. **Symptom Collection**: Gather observed symptoms and error messages
2. **Context Analysis**: Understand system state and recent changes
3. **Scope Identification**: Determine affected components and boundaries
4. **Priority Assessment**: Evaluate impact and urgency level

### Phase 2: Data Gathering
1. **Log Analysis**: Examine relevant log files and error outputs
2. **Code Inspection**: Review suspected code areas and recent changes
3. **Configuration Review**: Check settings and environment variables
4. **Metric Collection**: Gather performance and health metrics

### Phase 3: Hypothesis Generation
1. **Pattern Recognition**: Identify common issue patterns
2. **Root Cause Theories**: Develop testable hypotheses
3. **Dependency Analysis**: Map potential failure points
4. **Timeline Correlation**: Connect events to symptoms

### Phase 4: Testing & Validation
1. **Hypothesis Testing**: Systematically test each theory
2. **Reproduction Attempts**: Try to reproduce the issue
3. **Isolation Testing**: Test components in isolation
4. **Solution Validation**: Verify fixes resolve the problem

## Investigation Methodologies

### Symptom-Driven Investigation

**Symptom Analysis Process**:
```bash
🔍 Symptom Analysis: "slow API responses"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Collecting baseline metrics...
🎯 Identified symptoms:
├─ Response time: 2.3s (baseline: 200ms)
├─ Error rate: 12% (baseline: <1%)
├─ Memory usage: 89% (baseline: 60%)
└─ CPU usage: 78% (baseline: 45%)

🧠 Hypothesis generation:
1. Database connection pool exhausted
2. Memory leak in request processing
3. N+1 query pattern in ORM
4. Inadequate caching strategy
```

**Investigation Steps**:
1. **Metric Collection**: Gather current vs. baseline performance data
2. **Pattern Analysis**: Identify when and how symptoms manifest
3. **Component Isolation**: Test individual system components
4. **Correlation Analysis**: Find relationships between symptoms and causes

### Root Cause Analysis

**5 Whys Methodology**:
```bash
🔍 Root Cause Analysis: API timeout
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Why are API calls timing out?
   → Database queries taking >5 seconds

2. Why are database queries slow?
   → Missing index on frequently queried column

3. Why is the index missing?
   → Recent schema change didn't include index update

4. Why wasn't index included in schema change?
   → Database migration process lacks index review

5. Why is there no index review process?
   → Missing database performance validation in CI/CD

🎯 Root Cause: Inadequate database change review process
💡 Solution: Implement automated index analysis in CI/CD
```

### Timeline-Based Investigation

**Event Correlation**:
- Map symptom onset to system changes
- Analyze deployment and configuration changes
- Review user activity patterns
- Correlate with external service events

**Timeline Analysis**:
```bash
📅 Timeline Analysis: Performance Degradation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2024-01-15 14:30 ✅ Deploy v2.1.3 (normal performance)
2024-01-15 16:45 🟡 First slow response reports
2024-01-15 17:15 🟡 Error rate increases to 5%
2024-01-15 18:00 ❌ Performance severely degraded
2024-01-15 18:30 🔍 Investigation started

🎯 Correlation: Performance issues started ~2h after deployment
🔍 Focus: Changes introduced in v2.1.3
```

## Problem Domain Specialists

### Performance Issues

**Common Performance Problems**:
- Database query optimization (N+1 queries, missing indexes)
- Memory leaks and garbage collection issues
- Inefficient algorithms and data structures
- Caching strategy problems
- Resource contention and bottlenecks

**Performance Investigation Tools**:
```bash
⚡ Performance Investigation Toolkit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Profiling tools:
├─ Database query analyzer
├─ Memory usage profiler
├─ CPU utilization monitor
└─ Network latency tracker

📊 Metrics collection:
├─ Response time percentiles
├─ Throughput measurements
├─ Resource utilization
└─ Error rate analysis
```

### Security Incidents

**Security Issue Categories**:
- Authentication and authorization failures
- Data exposure and privacy breaches
- Injection attacks and input validation
- Cross-site scripting and CSRF attacks
- Dependency vulnerabilities

**Security Investigation Framework**:
```bash
🔒 Security Incident Investigation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 Incident scope assessment:
├─ Affected systems and data
├─ Attack vector identification
├─ Timeline of compromise
└─ Potential data exposure

🔍 Evidence collection:
├─ Log file analysis
├─ Network traffic examination
├─ Code vulnerability assessment
└─ Configuration review
```

### Integration Failures

**Integration Problem Areas**:
- API communication failures
- Data synchronization issues
- Service discovery problems
- Message queue and event processing
- Third-party service dependencies

**Integration Debugging**:
```bash
🌐 Integration Failure Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Communication flow:
├─ Request/response patterns
├─ Data format validation
├─ Authentication flow
└─ Error propagation

📊 Health checking:
├─ Service availability
├─ Network connectivity
├─ Configuration alignment
└─ Version compatibility
```

## Diagnostic Tools & Techniques

### Log Analysis

**Log Investigation Process**:
```bash
📋 Log Analysis for: Authentication failures
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Log sources identified:
├─ Application logs: /var/log/app/
├─ Authentication service: /var/log/auth/
├─ Database logs: /var/log/mysql/
└─ Load balancer logs: /var/log/nginx/

📊 Pattern analysis:
├─ Error frequency: 247 failures/hour
├─ Affected users: 23% of attempts
├─ Geographic pattern: US East Coast
└─ Time pattern: Business hours only
```

### Error Pattern Recognition

**Common Error Patterns**:
- Cascading failures and circuit breaker trips
- Resource exhaustion (memory, connections, file handles)
- Race conditions and timing issues
- Configuration drift and environment differences
- Dependency version conflicts

### Reproduction Strategies

**Issue Reproduction Methods**:
```bash
🔄 Issue Reproduction Strategy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Reproduction approach:
├─ Environment replication
├─ Load simulation
├─ Data state recreation
└─ Timing condition simulation

✅ Reproduction success:
├─ Issue reproduced in staging
├─ Error conditions confirmed
├─ Fix validated in test environment
└─ Solution ready for production
```

## Resolution Strategies

### Immediate Fixes

**Quick Resolution Tactics**:
- Service restart and failover
- Cache clearing and refresh
- Resource limit adjustment
- Feature flag toggling
- Traffic rerouting

### Systematic Solutions

**Long-term Resolution Planning**:
```bash
🛠️ Resolution Implementation Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Solution phases:
├─ Immediate: Hotfix deployment (ETA: 2h)
├─ Short-term: Configuration optimization (ETA: 1 day)
├─ Medium-term: Architecture improvement (ETA: 1 week)
└─ Long-term: Monitoring enhancement (ETA: 2 weeks)

🎯 Success criteria:
├─ Response time <200ms
├─ Error rate <0.1%
├─ Zero data loss
└─ No service interruption
```

### Prevention Measures

**Future Prevention Strategy**:
- Monitoring and alerting improvements
- Testing and validation enhancements
- Documentation and runbook updates
- Process and procedure refinements

## Investigation Reports

### Incident Summary
```bash
📋 Incident Investigation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Incident: Database connection timeout
📅 Timeline: 2024-01-15 16:45 - 18:30
⚡ Impact: 23% of users affected, 2h downtime

🔍 Root Cause:
Database connection pool exhausted due to connection leaks
in new ORM query pattern introduced in v2.1.3

💡 Resolution:
├─ Immediate: Increased connection pool size
├─ Fix: Corrected query connection management
├─ Validation: Load testing confirms fix
└─ Prevention: Added connection monitoring

📊 Lessons Learned:
├─ Need connection leak detection in CI/CD
├─ Require load testing for ORM changes
├─ Implement connection pool monitoring
└─ Update deployment checklist
```

### Technical Analysis
```bash
🔬 Technical Analysis Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Investigation methodology:
├─ Symptom analysis: Response time degradation
├─ Log correlation: Database timeout patterns
├─ Code review: ORM query implementation
└─ Testing: Connection leak reproduction

📊 Evidence collected:
├─ Performance metrics before/after
├─ Database connection pool statistics
├─ Error rate and pattern analysis
└─ Code diff analysis of v2.1.3 changes

✅ Solution validation:
├─ Load testing: 10x baseline traffic
├─ Connection monitoring: No leaks detected
├─ Performance: Response time <150ms
└─ Stability: 24h monitoring successful
```

## Example Workflows

### Quick Triage
```bash
/troubleshoot "API returning 500 errors" --quick

🚨 Quick Triage Started...
🔍 Analyzing error patterns...
📊 Found 47 occurrences in last hour

🎯 Immediate findings:
├─ Database connection failures
├─ Error spike at 14:30
├─ Affects user authentication only
└─ Workaround available: restart auth service

⚡ Recommended action: Service restart + full investigation
```

### Deep Investigation
```bash
/troubleshoot @src/payment/ --performance --deep --seq

🔍 Deep Performance Investigation...
🧠 Sequential analysis enabled
📊 Analyzing payment processing pipeline...

⚡ Performance bottlenecks identified:
├─ Payment validation: 1.2s avg (target: <100ms)
├─ External API calls: 0.8s avg (target: <200ms)
├─ Database queries: 0.7s avg (target: <50ms)
└─ Memory allocation: 45MB per request

🎯 Optimization opportunities:
├─ Cache payment validation rules
├─ Implement API call batching
├─ Add database query optimization
└─ Reduce object allocation overhead

💡 Estimated improvement: 75% faster processing
```

### Regression Analysis
```bash
/troubleshoot --regression --timeline "last 24h"

📅 Regression Analysis: Last 24 hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Comparing current state to baseline...

📊 Performance degradation detected:
├─ Response time: +340% slower
├─ Error rate: +1200% increase
├─ Memory usage: +67% higher
└─ CPU utilization: +45% increase

🎯 Change correlation:
├─ Deploy v2.4.1: 18h ago
├─ Database migration: 16h ago
├─ Configuration update: 12h ago
└─ Issue onset: 14h ago

🔍 Focus: Database migration impact analysis
```

## Integration with SuperClaude

### Intelligent Investigation
- **Sequential Thinking**: Complex multi-step problem analysis
- **Context7 Integration**: Framework-specific troubleshooting patterns
- **Persona Activation**: Specialist knowledge for domain-specific issues
- **Evidence-Based Analysis**: All conclusions backed by measurable data

### Automated Recovery
- **Pattern Recognition**: Learn from previous successful resolutions
- **Solution Caching**: Reuse validated fixes for similar problems
- **Escalation Logic**: Automatic escalation for critical issues
- **Progress Tracking**: TodoWrite integration for complex investigations

---

*SuperClaude Enhanced | Systematic Problem Resolution | Evidence-Based Investigation*