# TOKENS.md - SuperClaude Token Reduction & Efficiency Reference

This is the comprehensive token reduction and efficiency reference for Claude Code's SuperClaude framework. Claude Code will check this file for all information, strategies, and patterns related to token efficiency, symbol usage, abbreviations, and UltraCompressed mode.

## Core Philosophy: Maximum Efficiency, Minimal Tokens

**Primary Directive**: "Clarity through brevity | Symbols > words | Structure > verbosity"

**Token Efficiency Principles**:
- Use unified symbol system for consistent communication
- Leverage abbreviations for common technical terms
- Apply structured output formats over prose
- Activate UltraCompressed mode when context demands
- Maintain technical accuracy despite compression

## Universal Symbol System

The SuperClaude framework uses a comprehensive symbol system to maximize token efficiency while maintaining clarity. These symbols are consistently applied across all communications, commands, and documentation.

### Core Logic & Flow Symbols
| Symbol | Meaning | Usage Context | Example |
|--------|---------|---------------|---------|
| → | leads to, implies, results in | Causation and flow | `auth.js:45 → security risk` |
| ⇒ | transforms to | Process transformation | `input ⇒ validated_output` |
| ← | rollback, reverse | Backward operation | `migration ← rollback` |
| ⇄ | bidirectional | Two-way operation | `sync ⇄ remote` |
| & | and, combine, together with | Logical combination | `security & performance` |
| \| | separator, alternative, or | Options and conditions | `react\|vue\|angular` |
| : | define, specify, means | Definition and clarification | `scope: file\|module\|project` |
| » | sequence, then, followed by | Ordered progression | `build » test » deploy` |
| ∴ | therefore, conclusion | Logical conclusion | `tests fail ∴ code broken` |
| ∵ | because, due to, reason | Reasoning explanation | `slow ∵ O(n²) algorithm` |
| ≡ | equivalent to, same as | Equivalence | `method1 ≡ method2` |
| ≈ | approximately, roughly | Estimation | `≈2.5K tokens` |
| ≠ | not equal to | Inequality | `actual ≠ expected` |

### Status & Progress Indicators
| Symbol | Meaning | Severity | Action Required |
|--------|---------|----------|-----------------|
| ✅ | completed, successful, passed | Success | None |
| ❌ | failed, critical error, blocked | Critical | Immediate |
| ⚠️ | warning, caution, attention needed | Medium | Review |
| ℹ️ | information, note, reference | Low | Awareness |
| 🔄 | in progress, working, active | Active | Monitor |
| ⏳ | waiting, pending, queued | Pending | Schedule |
| 🚨 | critical, urgent, emergency | Critical | Immediate |
| 🎯 | target, goal, objective | Focus | Execute |
| 📊 | metrics, data, statistics | Data | Analyze |
| 💡 | insight, learning, discovery | Knowledge | Apply |

### Technical Domain Symbols
| Symbol | Domain | Usage | Example |
|--------|---------|-------|---------|
| ⚡ | Performance | Speed, optimization | `⚡ Query optimization` |
| 🔍 | Analysis | Search, investigation | `🔍 Code analysis` |
| 🔧 | Configuration | Setup, tools | `🔧 Environment setup` |
| 🛡️ | Security | Protection, safety | `🛡️ Auth validation` |
| 📦 | Deployment | Package, bundle | `📦 Production build` |
| 🎨 | Design | UI, frontend, aesthetics | `🎨 Component design` |
| 🌐 | Network | Web, connectivity | `🌐 API integration` |
| 📱 | Mobile | Responsive, device | `📱 Mobile optimization` |
| 🏗️ | Architecture | System structure | `🏗️ Service architecture` |
| 🧩 | Components | Modular design | `🧩 Component library` |
| 📐 | Specifications | Requirements | `📐 API specification` |
| 🔗 | Integration | Connections | `🔗 Service integration` |
| 📊 | Data | Database, analytics | `📊 Data architecture` |
| 🔒 | Security | Access control | `🔒 Permission system` |
| 🚀 | Deployment | Operations | `🚀 Release deployment` |

### Quality & Status Indicators
| Symbol | Quality Level | Usage Context |
|--------|---------------|---------------|
| 🌟 | Excellent | High quality, best practice |
| 👍 | Good | Acceptable quality |
| 👎 | Poor | Needs improvement |
| 🔥 | Critical Issue | Immediate attention required |
| 💎 | Optimized | Performance enhanced |
| 🧪 | Experimental | Testing/validation needed |
| 📈 | Improved | Enhancement applied |
| 📉 | Degraded | Performance reduced |

## Comprehensive Abbreviation Standards

Abbreviations are used consistently throughout the framework to reduce token usage while maintaining clarity. These abbreviations are domain-specific and context-aware.

### System and Architecture
- `cfg` configuration, settings, environment variables
- `impl` implementation, code structure, algorithms
- `arch` architecture, system design, patterns
- `perf` performance, optimization, benchmarks
- `ops` operations, deployment, infrastructure
- `env` environment, runtime context, variables

### Development Process
- `req` requirements, dependencies, specifications
- `deps` dependencies, packages, libraries
- `val` validation, verification, testing
- `test` testing, quality assurance, coverage
- `docs` documentation, guides, references
- `std` standards, conventions, guidelines

### Quality and Analysis
- `qual` quality, code quality, maintainability
- `sec` security, safety measures, compliance
- `err` error, exception handling, recovery
- `rec` recovery, error recovery, resilience
- `sev` severity, priority level, criticality
- `opt` optimization, improvement, enhancement

### Technical Domains
- `db` database, data storage, persistence
- `api` application programming interface, endpoints
- `ui` user interface, frontend, components
- `ux` user experience, usability, accessibility
- `auth` authentication, authorization, security
- `net` network, connectivity, protocols

## Notification and Progress Standards

Structured notifications provide clear, concise status updates with minimal token usage while maintaining comprehensive information delivery.

### Structured Progress Notifications
- `▶ Starting [operation] on [target] with [scope]`
- `🔄 Processing [item] ([current] of [total]) - [percentage]% complete`
- `📊 Analysis complete: [summary] - [metrics] gathered`
- `✅ [Operation] completed successfully - [duration] elapsed`
- `🎯 Found [count] [items] matching [criteria] with [confidence]% confidence`

### Enhanced Status Updates
- `📂 Working in directory: [path] with [permissions] access`
- `🔧 Using configuration: [details] from [source]`
- `⚡ Optimization applied: [improvement] yielding [benefit]`
- `🛠️ Tool activated: [tool] for [purpose] with [parameters]`

### Comprehensive Error and Warning Messages
- `🚨 Critical: [error] requires immediate attention - [impact] expected`
- `⚠️ Warning: [issue] may affect [functionality] - [mitigation] suggested`
- `ℹ️ Note: [information] for reference - [context] provided`
- `🛠️ Fix: [solution] resolves [problem] - [verification] required`

## UltraCompressed Mode

UltraCompressed mode represents the pinnacle of token efficiency in the SuperClaude framework. When activated, it achieves 60-80% token reduction while maintaining technical accuracy and actionable information.

### Activation Triggers

**Manual Activation**:
- `--uc` or `--ultracompressed` flag explicitly used
- User requests "compress", "concise", "brief" output
- User mentions token limits or efficiency concerns

**Automatic Activation**:
- Context usage exceeds 75% of available tokens
- Large-scale operations with high token consumption predicted
- Multiple complex analysis operations requested simultaneously
- User's conversation history shows preference for concise output

### Advanced Compression Techniques

**Intelligent Symbol Substitution**:
- Context-aware symbol usage based on domain and audience
- Mathematical notation for precise relationships: `≈`, `∴`, `→`, `⇒`
- Status indicators for progress tracking: `✅`, `❌`, `🔄`, `⏳`
- Domain-specific symbols for technical precision: `⚡`, `🛡️`, `📊`

**Advanced Abbreviation Strategy**:
- Domain-specific abbreviations with legend generation
- Context-preserving compression that maintains technical accuracy
- Hierarchical information organization for scannable content
- Essential information preservation with non-critical detail removal

**Structured Output Optimization**:
- Tables for comparative and structured information
- Hierarchical lists with clear information architecture
- Bullet points for discrete information items
- Code blocks for technical specifications and examples

### Quality Preservation Standards

Despite aggressive compression, UltraCompressed mode maintains:
- **Technical Accuracy**: All technical information remains precise and correct
- **Essential Information**: Critical details preserved, only filler removed
- **Actionable Steps**: Implementation steps remain clear and executable
- **Context Preservation**: Enough context to understand and act upon information

### Token Efficiency Targets

**Compression Goals**:
- **60-80% reduction** in total token count compared to standard output
- **Legend provided** for all symbols and abbreviations used
- **Semantic completeness** maintained despite compression
- **User comprehension** prioritized over maximum compression

### Example UltraCompressed Output

```
## Analysis Results
📊 **Metrics**: 15 files, 2.3K LOC, 4 issues found, ≈89% quality score
🎯 **Focus**: perf opt → API response time 200ms → target 50ms (75% improvement)

### Issues Found
❌ **Critical** (1): DB query N+1 pattern @ user.service.js:42 → O(n²) complexity
⚠️ **Warning** (2): Missing error handling → auth middleware, payment service
ℹ️ **Info** (1): Unused deps → package.json cleanup opportunity (−12% bundle size)

### Recommendations (Priority Order)
1. **DB Opt**: Impl eager loading → reduces queries by 85%, improves response time by ≈150ms
2. **Error Handling**: Add try/catch blocks → 3 locations, prevents cascade failures
3. **Cleanup**: Remove 4 unused deps → bundle size ↓ 12%, load time ↓ 8%

**Implementation Path**: /improve --perf --db --iterate --metrics
**Estimated Impact**: ⚡ 75% performance gain, 🛡️ improved reliability, 📦 smaller bundle
**Timeline**: 2-4 hours for full implementation with testing
```

### Compression Strategies by Content Type

**Code Analysis Output**:
- Use file:line format: `auth.js:45`
- Compress descriptions: "authentication validation error" → "auth val err"
- Group similar issues: "3 similar in controllers/"

**Command Responses**:
- Skip command echoing unless critical
- Use success/failure symbols: ✅/❌
- Provide only essential output

**Error Messages**:
- Compress stack traces to relevant lines
- Use error codes when available
- Focus on actionable fixes

**Documentation Generation**:
- Use bullet points over paragraphs
- Employ tables for API endpoints
- Link to detailed docs vs inline explanation

## Token Management Strategies

Effective token management ensures optimal performance while maintaining comprehensive functionality. The framework employs multiple strategies to balance token usage with output quality.

### Automatic Token Budget Management

**Context Monitoring**:
- Track token usage in real-time during operations
- Activate compression when approaching limits (>75% usage)
- Prioritize essential information when nearing maximum
- Gracefully degrade functionality rather than fail

**Progressive Compression Levels**:
1. **Normal Mode** (0-50% tokens): Full detail, educational explanations
2. **Efficient Mode** (50-75% tokens): Reduced verbosity, focus on essentials
3. **Compressed Mode** (75-90% tokens): Activate --uc automatically
4. **Critical Mode** (90%+ tokens): Maximum compression, emergency measures

### Smart Token Allocation

**Operation-Based Allocation**:
- **Analysis Tasks**: Higher allocation for comprehensive insights
- **Simple Commands**: Minimal allocation, direct responses
- **Complex Workflows**: Balanced allocation across steps
- **Error Handling**: Reserved tokens for critical error messages

**MCP Server Token Optimization**:
- Cache Context7 documentation lookups (saves 2-5K per query)
- Reuse Sequential analysis results across related operations
- Store Magic component patterns for repeated use
- Batch Puppeteer operations to reduce overhead

### Token-Efficient Communication Patterns

**Input Processing**:
- Parse user intent early to avoid unnecessary processing
- Use pattern matching for common requests
- Batch related operations in single tool calls
- Leverage cached results when available

**Output Optimization**:
- Start with most important information
- Use progressive disclosure for details
- Apply symbols and abbreviations consistently
- Structure output for maximum scannability

### Flag-Based Token Control

**Compression Flags** (from FLAGS.md):
- `--uc` / `--ultracompressed`: Force maximum compression
- `--verbose`: Disable compression for detailed output
- `--no-mcp`: Reduce token usage by disabling MCP servers
- `--scope file`: Limit analysis scope to reduce tokens

**Thinking Depth Management**:
- `--think` (~4K tokens): Module-level analysis
- `--think-hard` (~10K tokens): System-wide analysis
- `--ultrathink` (~32K tokens): Critical system analysis
- Balance depth with available token budget

### Performance Optimization Rules

**Caching Strategies**:
- Cache expensive analysis results for session reuse
- Store successful command patterns
- Remember project-specific conventions
- Maintain symbol legend for quick reference

**Batch Processing**:
- Group related file operations
- Combine analysis tasks when possible
- Execute parallel operations simultaneously
- Minimize round-trip communications

**Early Termination**:
- Stop processing when answer found
- Avoid unnecessary deep analysis
- Return partial results when beneficial
- Fail fast with clear error messages

### Token Usage Best Practices

1. **Start Simple**: Begin with minimal token usage, expand as needed
2. **Monitor Continuously**: Track token consumption throughout operations
3. **Compress Proactively**: Apply compression before hitting limits
4. **Cache Aggressively**: Reuse expensive computations when possible
5. **Communicate Efficiently**: Use symbols, abbreviations, and structure
6. **Prioritize Value**: Focus tokens on highest-value information
7. **Degrade Gracefully**: Maintain functionality even at token limits

### Emergency Token Conservation

When approaching token limits:
1. Immediately activate UltraCompressed mode
2. Disable non-essential MCP servers
3. Focus on critical path only
4. Use symbol-only responses when possible
5. Provide links instead of inline content
6. Summarize instead of detailed analysis
7. Queue non-critical operations for later

---

*TOKENS.md - SuperClaude Token Reduction & Efficiency Reference v1.0*

**Purpose**: Comprehensive guide for token optimization, symbol usage, abbreviations, and UltraCompressed mode. This reference enables Claude Code to maximize efficiency while maintaining technical accuracy and user value.
