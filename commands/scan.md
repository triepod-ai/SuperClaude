---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Comprehensive security vulnerability scanning and automated remediation with evidence-based recommendations"
---

# /scan - Security Vulnerability Scanner

**Purpose**: Comprehensive security scanning for vulnerabilities, threats, and compliance with automated remediation  
**Category**: Quality & Security  
**Syntax**: `/scan $ARGUMENTS`

## Examples

```bash
/scan                               # Auto-detect and scan current project
/scan @src/ --security              # Deep security vulnerability scan
/scan --deps --quick                # Fast dependency vulnerability check
/scan @api/ --config --compliance   # Configuration security with compliance
/scan !npm audit --fix              # Run audit command and apply fixes
/scan --security --report --ci      # CI-friendly security scan with reporting
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Files/directories to scan (default: auto-detect project)
- `@<path>` - Explicit file or directory targeting
- `!<command>` - Execute security command and analyze results
- `--<flag>` - Scan type and configuration options

### Scan Types

- `--security`: Deep vulnerability scanning (OWASP Top 10, CVEs)
- `--deps`: Dependency vulnerability audit and analysis
- `--config`: Configuration and infrastructure security
- `--compliance`: Regulatory compliance checking (GDPR, HIPAA, SOX)
- `--quality`: Security-focused code quality analysis

### Scan Modes

- `--quick`: Fast critical vulnerability scan only
- `--standard`: Comprehensive security assessment (default)
- `--strict`: Maximum depth with compliance validation
- `--continuous`: Real-time security monitoring mode

### Remediation Options

- `--fix`: Generate automated fixes for vulnerabilities
- `--fix-auto`: Apply safe fixes automatically
- `--report`: Generate detailed security report
- `--validate`: Validate previous security fixes
- `--rollback`: Rollback security changes if needed

### Output Formats

- `--format json`: Machine-readable JSON output
- `--format sarif`: SARIF format for CI/CD integration
- `--format html`: Interactive HTML security report
- `--ci`: CI/CD optimized output with exit codes

### Universal SuperClaude Flags

- `--plan`: Show security scan strategy before execution
- `--think`: Standard vulnerability analysis (~4K tokens)
- `--think-hard`: Deep security analysis (~10K tokens)
- `--ultrathink`: Critical security investigation (~32K tokens)
- `--introspect`: Show security decision-making process

### Persona Integration

- `--persona-security`: Security specialist, threat modeling focus
- `--persona-analyzer`: Root cause analysis, evidence-based investigation
- `--persona-qa`: Security testing and validation perspective

### MCP Server Control

- `--c7`: Enable Context7 for CVE database and security patterns
- `--seq`: Enable Sequential for complex vulnerability analysis
- `--all-mcp`: Comprehensive security analysis with all tools
- `--no-mcp`: Use only native Claude Code security tools

## Workflow Process

### Phase 1: Discovery & Assessment
1. **Technology Detection**: Identify languages, frameworks, dependencies
2. **Attack Surface**: Map entry points, data flows, trust boundaries
3. **Threat Modeling**: Generate STRIDE analysis and attack vectors
4. **Scope Definition**: Determine scan boundaries and priorities

### Phase 2: Vulnerability Detection
1. **Pattern Scanning**: Use Grep for vulnerability patterns
2. **OWASP Analysis**: Systematic OWASP Top 10 detection
3. **CVE Research**: Context7 lookup for known vulnerabilities
4. **Custom Patterns**: Framework-specific security checks

### Phase 3: Risk Assessment
1. **Impact Analysis**: Evaluate CIA triad impacts
2. **Exploitability**: Assess attack complexity and requirements
3. **Business Context**: Map technical risk to business impact
4. **Prioritization**: Risk-based vulnerability ranking

### Phase 4: Remediation
1. **Fix Generation**: Create specific code fixes
2. **Validation Planning**: Design test procedures
3. **Implementation**: Apply fixes with safety checks
4. **Verification**: Confirm vulnerability resolution

## Security Domains

### OWASP Top 10 Detection

**Injection Vulnerabilities**:
- SQL injection patterns in database queries
- Command injection in system calls
- LDAP/XPath injection detection
- Template injection vulnerabilities

**Authentication & Session**:
- Weak password storage detection
- Session management flaws
- JWT implementation issues
- MFA bypass vulnerabilities

**Sensitive Data Exposure**:
- Hardcoded secrets and API keys
- Unencrypted sensitive data
- Information disclosure in logs
- Weak cryptographic implementations

### Dependency Security

**Vulnerability Analysis**:
```bash
📊 Dependency Security Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 Critical: 2 packages (immediate action required)
⚠️ High: 5 packages (update within 7 days)
🟡 Medium: 12 packages (plan updates)
ℹ️ Low: 23 packages (monitor)

🔍 Supply Chain Risk: MODERATE
📋 License Issues: 3 GPL conflicts detected
🔄 Update Impact: 15% require major version changes
```

### Configuration Security

**Infrastructure Scanning**:
- Cloud security misconfigurations (AWS, Azure, GCP)
- Container security (Docker, Kubernetes)
- Web server hardening (nginx, Apache)
- Database security settings
- Network exposure analysis

## Remediation Framework

### Automated Fix Generation

**Fix Categories**:
1. **Code Fixes**: Direct vulnerability patches
2. **Configuration**: Security setting adjustments
3. **Dependencies**: Package updates and replacements
4. **Architecture**: Design pattern improvements

**Fix Validation**:
```bash
🔧 Fix Validation Process
━━━━━━━━━━━━━━━━━━━━━━━
1. ✅ Syntax validation passed
2. ✅ Security re-scan clean
3. ✅ Functionality tests passed
4. ✅ No new vulnerabilities introduced
5. ✅ Performance impact: minimal

💡 Fix ready for deployment
```

### Safe Deployment

**Progressive Rollout**:
1. Development environment testing
2. Security-focused test suite execution
3. Staging environment validation
4. Canary deployment monitoring
5. Full production rollout

## Security Reports

### Executive Summary
```bash
🛡️ Security Assessment Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Security Score: 87/100 (Good)
🎯 Critical Issues: 0 (resolved)
⚠️ High Priority: 2 (patches available)
📈 Trend: +15% improvement this month

💰 Risk Exposure: $45K (reduced from $180K)
✅ Compliance: 94% (GDPR, SOX compliant)
⏱️ Remediation Time: 2.5 developer days
```

### Technical Report
```bash
🔬 Technical Vulnerability Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 HIGH-001: Authentication Bypass
├─ Location: src/auth/jwt.py:42
├─ CVSS: 8.1 (High)
├─ Impact: Admin access compromise
├─ Fix: JWT signature validation
└─ Status: Patch ready

🔍 HIGH-002: SQL Injection
├─ Location: api/search.py:89
├─ CVSS: 7.5 (High)
├─ Impact: Data breach risk
├─ Fix: Parameterized queries
└─ Status: Testing required
```

## CI/CD Integration

### Pipeline Security Gates
```yaml
security-scan:
  script: |
    /scan --security --deps --ci
  artifacts:
    reports:
      - security-report.sarif
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: always
```

### Quality Gates
- No critical vulnerabilities allowed
- High vulnerabilities block deployment
- Security score must be >80/100
- All fixes must be validated

## Example Workflows

### Quick Security Check
```bash
/scan --quick

🔍 Quick Security Scan
⚡ Scanning for critical issues...
✅ No critical vulnerabilities found
⚠️ 2 high-priority issues detected
📋 Run full scan for complete analysis
```

### Comprehensive Security Audit
```bash
/scan --security --strict --report

🛡️ Comprehensive Security Audit
🔍 Analyzing 523 files...
📊 Running OWASP Top 10 checks...
🔬 Checking 127 dependencies...
✅ Generating detailed report...

📋 Report: security-audit-2024-01-15.html
```

### Dependency Security Fix
```bash
/scan --deps --fix-auto

📦 Dependency Security Scan
🔍 Found 8 vulnerable packages
🔧 Applying automated fixes...
✅ Updated 6 packages safely
⚠️ 2 require manual review
📋 See: dependency-updates.md
```

### Compliance Validation
```bash
/scan --compliance GDPR,HIPAA --report

📋 Compliance Validation
🔍 Checking GDPR requirements...
🔍 Validating HIPAA controls...
✅ GDPR: 96% compliant
⚠️ HIPAA: 88% compliant (2 gaps)
📊 Full report: compliance-report.pdf
```

## Integration with SuperClaude

### Intelligent Security Analysis
- **Pattern Learning**: Learn from previous vulnerabilities
- **Context-Aware**: Framework-specific security knowledge
- **Evidence-Based**: All findings backed by CVE/CWE references
- **Risk Calibration**: Business-context risk assessment

### Automated Workflows
- **Progress Tracking**: TodoWrite for complex security projects
- **Batch Operations**: Parallel scanning for efficiency
- **Smart Remediation**: AI-powered fix generation
- **Continuous Monitoring**: Real-time security posture tracking

---

*SuperClaude Enhanced | Enterprise Security Scanning | Evidence-Based Remediation*