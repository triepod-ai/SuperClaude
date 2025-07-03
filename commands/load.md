---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Comprehensive project analysis and context loading for intelligent code understanding"
---

# /load - Project Context Loading

**Purpose**: Intelligently scan and analyze codebases to build deep understanding for all subsequent operations  
**Category**: System & Setup  
**Syntax**: `/load $ARGUMENTS`

## Examples

```bash
/load                                    # Analyze current directory
/load @src/                             # Analyze specific directory
/load --scope minimal                   # Quick project overview
/load --focus api --detailed            # API-focused deep analysis
/load --persona-security --security     # Security audit
/load !git status --incremental         # Load only changed files
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[path]` - Target directory to analyze (defaults to current)
- `@<path>` - Explicit directory to load
- `!<command>` - Execute command and analyze output
- `--<flag>` - Analysis options and modifiers

### Scope Control

- `--scope minimal`: Core files only (package.json, main entries)
- `--scope standard`: Main source and config (default)
- `--scope comprehensive`: All code, tests, and docs
- `--scope full`: Complete project analysis

### Focus Areas

- `--focus architecture`: System design and patterns
- `--focus api`: Endpoints, contracts, interfaces
- `--focus database`: Schemas, models, queries
- `--focus frontend`: UI components and client logic
- `--focus backend`: Server logic and infrastructure
- `--focus testing`: Test coverage and patterns
- `--focus security`: Security patterns and vulnerabilities
- `--focus performance`: Performance patterns and bottlenecks

### Output Formats

- `--format summary`: High-level overview (default)
- `--format detailed`: Comprehensive findings
- `--format visual`: Include ASCII diagrams
- `--format structured`: YAML/JSON output
- `--format markdown`: Documentation format

### Performance Options

- `--incremental`: Only analyze changes since last load
- `--chunk-size [n]`: Process in batches
- `--low-memory`: Memory-constrained mode
- `--parallel`: Enable parallel processing

### Universal SuperClaude Flags

- `--plan`: Show execution plan first
- `--think`: Standard analysis depth
- `--think-hard`: Deep architectural analysis
- `--ultrathink`: Maximum analysis depth
- `--uc` / `--ultracompressed`: Token-efficient mode
- `--introspect`: Show analysis reasoning

### Persona Integration

- `--persona-architect`: Architecture focus
- `--persona-security`: Security analysis
- `--persona-performance`: Performance perspective
- `--persona-qa`: Quality focus

### MCP Server Control

- `--c7`: Enable Context7 for library docs
- `--seq`: Enable Sequential for analysis
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Discovery
1. **Directory Scan**: Find project root and structure
2. **Type Detection**: Framework, language, stack
3. **Config Analysis**: package.json, settings
4. **Ignore Patterns**: .gitignore compliance

### Phase 2: Smart Loading
1. **Priority Files**:
   - Entry points (main, index, app)
   - Core modules and components
   - Configuration files
   - Database schemas
   - Test files

2. **Smart Filtering**:
   - Skip generated files (node_modules, build)
   - Ignore binaries and media
   - Respect size limits

### Phase 3: Analysis
1. **Structure**: Directory organization, dependencies
2. **Patterns**: Design patterns, conventions
3. **Quality**: Complexity, coverage, tech debt
4. **Security**: Vulnerability patterns

### Phase 4: Context Building
1. **Knowledge Graph**: Component relationships
2. **Pattern Library**: Reusable patterns
3. **Dependency Map**: Full dependency tree
4. **API Surface**: Public interfaces

## Output Examples

### Summary Format
```
📦 Project: awesome-app
📱 Type: Web Application
🔧 Stack: React + Express + PostgreSQL

📊 Metrics:
├─ Files: 342 (215 source, 87 test)
├─ Lines: 28,450
├─ Coverage: 82%
└─ Complexity: 7.2/10

🏗️ Architecture:
├─ Pattern: Microservices
├─ Structure: Domain-Driven
└─ API: RESTful + GraphQL

🔑 Key Components:
├─ AuthService: JWT authentication
├─ UserAPI: User management endpoints
└─ PaymentGateway: Stripe integration

💡 Recommendations:
├─ Add integration tests for payment flow
├─ Consider caching for user queries
└─ Update deprecated dependencies
```

### Visual Architecture
```
┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   API GW    │
│   (React)   │     │  (Express)  │
└─────────────┘     └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ AuthService │    │  UserAPI    │    │PaymentSvc   │
└─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                    ┌─────────────┐
                    │  PostgreSQL │
                    └─────────────┘
```

## Example Workflows

### Initial Project Understanding

```bash
# Quick overview
/load --scope minimal

# Architecture deep dive
/load --focus architecture --think-hard --visual

# API analysis
/load @src/api/ --focus api --detailed
```

### Security Audit

```bash
# Full security scan
/load --scope full --persona-security --focus security

# Check authentication
/load @src/auth/ --security --ultrathink

# Generate security report
/load --security --format markdown > security-audit.md
```

### Performance Analysis

```bash
# Performance patterns
/load --focus performance --persona-performance

# Database optimization
/load @src/models/ --focus database --performance

# Frontend performance
/load @src/components/ --focus frontend --performance
```

### Pre-Refactoring

```bash
# Quality baseline
/load --scope comprehensive --persona-qa --detailed

# Architecture assessment
/load --persona-architect --focus architecture --plan

# Identify improvements
/load --think-hard --format structured
```

## Loading Strategies

### Progressive Loading
1. **Core First**: Essential files for context
2. **Expand on Demand**: Additional context as needed
3. **Smart Caching**: Reuse previous analysis
4. **Lazy Loading**: Defer peripheral modules

### Token Management
- Minimal: ~2-5K tokens
- Standard: ~5-15K tokens  
- Comprehensive: ~15-30K tokens
- Full: ~30-60K tokens

### Performance Metrics
- File reading: ~1000 files/second
- Pattern matching: ~10MB/second
- Full analysis: 30-60 seconds typical

## Integration Patterns

### Command Chaining

```bash
# Load → Analyze → Improve
/load --comprehensive
/analyze @src/services/ --deep
/improve --performance

# Load → Document
/load --focus api
/document --openapi

# Load → Test
/load --focus frontend
/test --coverage gaps
```

### Context Persistence
- Component registry available to all commands
- Pattern library for consistency
- Dependency map for impact analysis
- Convention knowledge for improvements

## Best Practices

### Large Projects
1. Start with `--scope minimal` overview
2. Use `--incremental` for updates
3. Enable `--uc` for token efficiency
4. Focus on specific subsystems

### New Projects
1. `--scope comprehensive` for full picture
2. `--persona-architect` for design insights
3. Generate docs with `--format markdown`
4. Quality check with `--persona-qa`

### Maintenance
1. Regular `--incremental` updates
2. Periodic `--security` audits
3. Track metrics with `--structured`
4. Monitor with `--profile`

## Integration with SuperClaude

### Intelligent Features
- **Smart Detection**: Auto-identify frameworks and patterns
- **Priority Loading**: Most important files first
- **Pattern Recognition**: Learn project conventions
- **Context Building**: Create knowledge graph

### Quality Assurance
- **Validation**: Verify analysis accuracy
- **Metrics**: Track quality indicators
- **Recommendations**: Actionable improvements
- **Progress Tracking**: Monitor analysis status

---

*SuperClaude Enhanced | Intelligent Project Loading | Context-Aware Analysis*