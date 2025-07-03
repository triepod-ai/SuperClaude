# COMMANDS.md - SuperClaude Slash Commands Reference

This document contains the complete slash command documentation for the SuperClaude framework. Claude Code should reference this file for information about slash command usage, syntax, and capabilities.

## Complete Slash Command System (v3.0 - Claude Code Compliant)

### Command System Architecture

All SuperClaude commands have been redesigned for full Claude Code compatibility with:
- **YAML Frontmatter**: Required `allowed-tools` and `description` fields
- **$ARGUMENTS Processing**: Dynamic argument handling with @ and ! prefix support
- **File Size Optimization**: 50-70% reduction from original sizes
- **Native Integration**: Seamless integration with Claude Code's slash command system

**Command Structure**:
```yaml
---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write]
description: "Concise description of command purpose"
---
```

**Transformation Results**:
- **Total Commands**: 20 commands fully transformed
- **Average Size Reduction**: 65% (from ~1000 lines to ~350 lines)
- **Largest Reduction**: spawn.md (30K+ tokens → 414 lines)
- **Consistency**: All commands follow identical YAML frontmatter structure
- **Integration**: Full Claude Code slash command compatibility achieved

### Development Commands

**`/build $ARGUMENTS`**
- **Purpose**: Intelligent project builder with framework detection and optimization
- **Category**: Development & Deployment  
- **Auto-Persona**: Frontend (UI focus), Backend (API focus), Architect (complex builds)
- **MCP Integration**: Magic (UI builds), Context7 (framework patterns)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Detect framework → Configure build → Optimize → Validate → Package
- **Arguments**: `[target]`, `@<path>`, `!<command>`, `--<flags>`
- **Examples**:
  - `/build --prod --optimize` - Production build with performance optimization
  - `/build @api/ --security --deploy-ready` - Secure API build ready for deployment
  - `/build !npm run build --analyze` - Build and analyze bundle

**`/dev-setup $ARGUMENTS`**
- **Purpose**: Automate complete development environment configuration
- **Category**: Development & Infrastructure
- **Auto-Persona**: DevOps (primary), Backend (tooling focus)
- **MCP Integration**: Context7 (framework patterns), Sequential (complex setup)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Detect requirements → Configure environment → Setup tooling → Validate setup
- **Examples**:
  - `/dev-setup --stack node --ci github` - Node.js project with GitHub Actions
  - `/dev-setup --fullstack --enterprise` - Enterprise full-stack environment

### Analysis Commands

**`/analyze $ARGUMENTS`**
- **Purpose**: Multi-dimensional code and system analysis with deep inspection
- **Category**: Analysis & Investigation
- **Auto-Persona**: Analyzer (primary), Architect (system-wide)
- **MCP Integration**: Sequential (primary), Context7 (patterns)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Scope detection → Multi-tool analysis → Pattern recognition → Recommendations
- **Arguments**: `[target]`, `@<path>`, `!<command>`, `--<flags>`
- **Examples**:
  - `/analyze @src/ --focus performance --think` - Performance analysis with deep thinking
  - `/analyze --scope architecture --ultrathink` - Comprehensive architectural analysis
  - `/analyze !git status --focus changes` - Analyze only changed files

**`/troubleshoot [symptoms] [flags]`**
- **Purpose**: Systematic problem investigation and resolution
- **Category**: Analysis & Debugging
- **Auto-Persona**: Analyzer (primary), QA (testing focus)
- **MCP Integration**: Sequential (primary), Puppeteer (reproduction)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Symptom analysis → Hypothesis generation → Testing → Root cause → Solution
- **Examples**:
  - `/troubleshoot "slow API responses" --scope backend --think` - Backend performance investigation
  - `/troubleshoot --symptoms "memory leak" --priority high --ultrathink` - Critical memory issue analysis

**`/explain [topic] [flags]`**
- **Purpose**: Educational explanations of code, patterns, and technical concepts
- **Category**: Analysis & Education  
- **Auto-Persona**: Mentor (primary)
- **MCP Integration**: Context7 (documentation), Sequential (complex topics)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Topic analysis → Audience assessment → Structure explanation → Provide examples
- **Examples**:
  - `/explain "React hooks" --depth beginner --examples` - Beginner-friendly React hooks explanation
  - `/explain src/auth.js --detailed --format tutorial` - Detailed tutorial on authentication code

**`/review [target] [flags]`**
- **Purpose**: AI-powered comprehensive code review and quality analysis
- **Category**: Analysis & Quality Assurance
- **Auto-Persona**: QA (primary), Analyzer (deep inspection)
- **MCP Integration**: Context7 (best practices), Sequential (systematic review)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Code analysis → Pattern detection → Issue identification → Recommendations
- **Examples**:
  - `/review --files src/components/auth.tsx` - File-specific review
  - `/review --pr --security --performance` - Pull request review with security and performance focus

### Quality Commands

**`/improve [target] [flags]`**
- **Purpose**: Evidence-based code enhancement with metrics-driven optimization
- **Category**: Quality & Enhancement
- **Auto-Persona**: Refactorer (quality), Performance (speed), Architect (structure)
- **MCP Integration**: Sequential (analysis), Context7 (patterns)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Baseline metrics → Improvement analysis → Implementation → Validation → Measurement
- **Examples**:
  - `/improve src/ --quality --metrics --iterate` - Iterative quality improvement with metrics
  - `/improve api/ --perf --security --think-hard` - Performance and security optimization

**`/scan [target] [flags]`**
- **Purpose**: Comprehensive security and code quality scanning
- **Category**: Quality & Security
- **Auto-Persona**: Security (vulnerabilities), QA (quality gates)
- **MCP Integration**: Sequential (analysis), Context7 (security patterns)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Multi-scanner execution → Vulnerability assessment → Priority ranking → Fix recommendations
- **Examples**:
  - `/scan --security --compliance --report` - Security and compliance scan with report
  - `/scan src/ --quality --fix-auto --think` - Quality scan with automatic fixes

**`/cleanup [target] [flags]`**
- **Purpose**: Systematic project cleanup and technical debt reduction
- **Category**: Quality & Maintenance
- **Auto-Persona**: Refactorer (primary)
- **MCP Integration**: Sequential (analysis)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Cleanup analysis → Safety assessment → Execution plan → Cleanup → Validation
- **Examples**:
  - `/cleanup --code --dry-run --think` - Safe code cleanup with preview
  - `/cleanup --deps --security --aggressive` - Aggressive dependency cleanup

### Documentation Commands

**`/document [target] [flags]`**
- **Purpose**: Professional documentation generation for code, APIs, and systems
- **Category**: Documentation & Knowledge
- **Auto-Persona**: Mentor (primary)
- **MCP Integration**: Context7 (patterns), Sequential (analysis)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Code analysis → Documentation structure → Content generation → Format output
- **Examples**:
  - `/document src/ --type api --format openapi` - OpenAPI documentation generation
  - `/document --type readme --style detailed --examples` - Comprehensive README with examples

### Planning & Project Management Commands

**`/estimate [target] [flags]`**
- **Purpose**: Evidence-based estimation for development tasks and projects
- **Category**: Planning & Management
- **Auto-Persona**: Analyzer (complexity), Architect (structure)
- **MCP Integration**: Sequential (analysis), Context7 (benchmarks)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Task decomposition → Complexity analysis → Historical data → Confidence intervals
- **Examples**:
  - `/estimate "user authentication" --method story-points --confidence high` - User auth estimation
  - `/estimate --project --detail comprehensive --think-hard` - Full project estimation

**`/task [operation] [flags]`**
- **Purpose**: Long-term project and feature management with multi-session persistence
- **Category**: Project Management & Planning
- **Auto-Persona**: Architect (structure), Analyzer (breakdown)
- **MCP Integration**: Sequential (complex planning)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Project decomposition → Task hierarchy → Progress tracking → Session recovery
- **Examples**:
  - `/task --create "authentication system" --breakdown --estimate` - Create new project task
  - `/task --status --dependencies` - Check task status and dependencies

### Testing Commands

**`/test [type] [flags]`**
- **Purpose**: Comprehensive testing workflows including generation and execution
- **Category**: Testing & Quality Assurance
- **Auto-Persona**: QA (primary)
- **MCP Integration**: Puppeteer (e2e), Sequential (strategy)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Test strategy → Test generation → Execution → Coverage analysis → Report
- **Examples**:
  - `/test --type unit --coverage 90% --generate` - Unit test generation with 90% coverage target
  - `/test e2e --strategy comprehensive --pup` - Comprehensive E2E testing with Puppeteer

### Deployment Commands

**`/deploy [environment] [flags]`**
- **Purpose**: Deployment preparation, validation, and execution
- **Category**: Deployment & Operations
- **Auto-Persona**: DevOps (primary), Backend (reliability)
- **MCP Integration**: Puppeteer (validation), Sequential (planning)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Pre-deployment checks → Environment preparation → Deployment → Validation → Monitoring
- **Examples**:
  - `/deploy --environment staging --validate --think` - Staging deployment with validation
  - `/deploy production --strategy blue-green --rollback-ready` - Production blue-green deployment

### Version Control Commands

**`/git [operation] [flags]`**
- **Purpose**: Intelligent Git workflow assistant with automated best practices
- **Category**: Version Control & Collaboration
- **Auto-Persona**: DevOps (workflow), QA (review)
- **MCP Integration**: Sequential (complex workflows)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Repository analysis → Operation planning → Execution → Validation
- **Examples**:
  - `/git --commit --message "feat: add authentication"` - Intelligent commit creation
  - `/git --pr --title "Authentication system" --review` - Pull request creation with review

### Data Operations Commands

**`/migrate [type] [flags]`**
- **Purpose**: Database, code, API, and data migration management
- **Category**: Database & System Operations
- **Auto-Persona**: Backend (primary), DevOps (infrastructure)
- **MCP Integration**: Sequential (complex migrations), Context7 (migration patterns)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Migration planning → Safety checks → Execution → Validation → Cleanup
- **Examples**:
  - `/migrate --type database --version 2.1 --validate` - Database schema migration
  - `/migrate --type api --rollback --version 1.5` - API version rollback

### Design Commands

**`/design [domain] [flags]`**
- **Purpose**: Comprehensive design orchestration across multiple domains
- **Category**: Design & Architecture
- **Auto-Persona**: Architect (primary), Frontend (UI focus)
- **MCP Integration**: Magic (UI design), Sequential (complex design), Context7 (patterns)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Requirements analysis → Design creation → Validation → Iteration → Documentation
- **Examples**:
  - `/design --domain architecture --validate --think-hard` - System architecture design
  - `/design --domain ui --iterate --accessible` - UI design with accessibility focus

### Meta & Orchestration Commands

**`/index [query] [flags]`**
- **Purpose**: Command catalog browsing, search, and discovery system
- **Category**: Meta & Navigation
- **Auto-Persona**: Mentor (guidance)
- **MCP Integration**: Sequential (search intelligence)
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Query parsing → Smart filtering → Ranked results → Progressive disclosure
- **Examples**:
  - `/index --category development --detailed` - Detailed development commands
  - `/index --search "performance" --workflows` - Performance-related commands and workflows

**`/load [path] [flags]`**
- **Purpose**: Project context loading and comprehensive analysis
- **Category**: Meta & Context Management
- **Auto-Persona**: Analyzer (primary), Architect (structure)
- **MCP Integration**: All servers for comprehensive analysis
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Discovery → Analysis → Context building → Knowledge integration
- **Examples**:
  - `/load --scope comprehensive --focus architecture` - Full architectural analysis
  - `/load ./src --focus security --persona-security` - Security-focused analysis

**`/spawn [mode] [flags]`**
- **Purpose**: Intelligent task orchestration and execution management
- **Category**: Orchestration & Workflow Management
- **Auto-Persona**: Analyzer (decomposition), Architect (coordination)
- **MCP Integration**: All servers for comprehensive orchestration
- **Key Flags**: See FLAGS.md for detailed flag documentation
- **Workflow**: Task decomposition → Resource allocation → Coordinated execution → Result integration
- **Examples**:
  - `/spawn --parallel "analyze codebase and generate tests"` - Parallel task execution
  - `/spawn --optimize "refactor authentication system"` - Optimized orchestration

## Command System Improvements Summary

### Key Enhancements in v3.0

**1. Claude Code Native Integration**:
- All 21 commands now use YAML frontmatter with `allowed-tools` and `description`
- Dynamic `$ARGUMENTS` processing replaces rigid parameter structure
- Full support for @ (file references) and ! (bash command) prefixes
- Seamless integration with Claude Code's slash command system

**2. Dramatic Size Reduction**:
- **Average Reduction**: 65% fewer lines while maintaining functionality
- **Token Efficiency**: Commands use 50-70% fewer tokens
- **Clarity**: Focused on practical examples over verbose documentation
- **Performance**: Faster loading and processing of commands

**3. Consistent Structure**:
- Every command follows identical YAML frontmatter format
- Standardized argument processing with $ARGUMENTS
- Unified flag system across all commands
- Consistent workflow patterns and outputs

**4. Enhanced Functionality**:
- Better integration with MCP servers (Context7, Sequential, Magic, Puppeteer)
- Improved persona activation and auto-detection
- Smart flag inference and context awareness
- Enhanced error handling and recovery

**5. Command Categories Transformed**:
- **Development**: build, dev-setup, design (3 commands)
- **Analysis**: analyze, troubleshoot, explain, review (4 commands)
- **Quality**: improve, scan, cleanup (3 commands)
- **Testing**: test (1 command)
- **Documentation**: document (1 command)
- **Planning**: estimate, task (2 commands)
- **Deployment**: deploy (1 command)
- **Version Control**: git (1 command)
- **Data Operations**: migrate, load (2 commands)
- **Meta**: index, spawn (2 commands)

---

*SuperClaude Slash Commands Reference | Claude Code Native Integration | Evidence-Based Development*