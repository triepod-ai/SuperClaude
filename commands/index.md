---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead]
description: "Command catalog and discovery system for browsing and learning SuperClaude commands"
---

# /index - Command Catalog & Navigation

**Purpose**: Browse, search, and discover SuperClaude commands with intelligent filtering  
**Category**: Meta & Navigation  
**Syntax**: `/index $ARGUMENTS`

## Examples

```bash
/index                                  # Show all available commands
/index "performance"                    # Search for performance-related commands
/index --category development           # Browse development commands
/index --workflows                      # Show common command sequences
/index /analyze --detailed             # Get detailed info about analyze command
/index --recent --format list          # Show recently used commands as list
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[query]` - Search term or command name to look up
- `[command]` - Specific command to get details about
- `--<flag>` - Display and filtering options

### Display Options

- `--all`: Show all commands with descriptions (default)
- `--summary`: Brief one-line descriptions
- `--detailed`: Full descriptions with examples
- `--syntax`: Command syntax and flags only
- `--examples`: Focus on usage examples

### Filtering Options

- `--category [name]`: Filter by category (development|analysis|quality|docs|deployment)
- `--search [term]`: Search by keyword or functionality
- `--persona [name]`: Show commands for specific persona
- `--mcp [server]`: Commands using specific MCP server

### Organization Views

- `--workflows`: Display command sequences and patterns
- `--alphabetical`: Sort commands A-Z
- `--popularity`: Sort by common usage
- `--recent`: Show recently used commands

### Output Formats

- `--format [type]`: Output format (table|list|tree|markdown)
- `--export [file]`: Export catalog to file
- `--interactive`: Interactive browser mode

### Universal SuperClaude Flags

- `--plan`: Show catalog strategy
- `--think`: Analyze command relationships
- `--introspect`: Show selection reasoning

### Persona Integration

- `--persona-mentor`: Educational guidance mode
- `--persona-analyzer`: Deep search analysis

### MCP Server Control

- `--seq`: Enable Sequential for smart search
- `--no-mcp`: Use only native Claude Code tools

## Command Catalog

### Development Commands

```bash
🛠️ Development & Building
━━━━━━━━━━━━━━━━━━━━━━━━
/build    - Intelligent project builder
/ui       - Modern UI component generation  
/logo     - Company logo search & generation
/git      - Smart git workflow automation
/spawn    - Task orchestration engine
```

### Analysis Commands

```bash
🔍 Analysis & Investigation
━━━━━━━━━━━━━━━━━━━━━━━━━━
/analyze     - Deep code & system analysis
/troubleshoot - Systematic problem solving
/explain     - Technical explanations
/review      - Code review framework
```

### Quality Commands

```bash
✨ Quality & Enhancement
━━━━━━━━━━━━━━━━━━━━━━━
/improve  - Evidence-based improvements
/scan     - Security vulnerability scanning
/cleanup  - Project maintenance & cleanup
/test     - Comprehensive testing workflows
```

### Documentation Commands

```bash
📚 Documentation & Knowledge
━━━━━━━━━━━━━━━━━━━━━━━━━━━
/document - Professional documentation
/explain  - Educational explanations
```

### Planning Commands

```bash
📊 Planning & Management
━━━━━━━━━━━━━━━━━━━━━━━━
/estimate - Time & complexity estimation
/task     - Task management system
```

### Deployment Commands

```bash
🚀 Deployment & Operations
━━━━━━━━━━━━━━━━━━━━━━━━━
/deploy   - Deployment automation
/migrate  - Data migration management
```

### System Commands

```bash
⚙️ System & Setup
━━━━━━━━━━━━━━━━━━━
/dev-setup - Development environment setup
/load      - Context loading system
/design    - Architecture design tools
```

## Common Workflows

### Development Workflow

```bash
📋 Standard Development Flow
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. /estimate "new feature"     # Plan work
2. /design --architecture      # Design system
3. /build @components/         # Build feature
4. /test --comprehensive       # Test thoroughly
5. /document --api            # Document APIs
6. /deploy --staging          # Deploy to staging
```

### Quality Improvement Workflow

```bash
📋 Code Quality Enhancement
━━━━━━━━━━━━━━━━━━━━━━━━━
1. /analyze @src/ --deep      # Analyze codebase
2. /scan --security           # Security check
3. /improve --quality         # Apply improvements
4. /cleanup --deps            # Clean dependencies
5. /test --regression         # Verify changes
```

### Bug Investigation Workflow

```bash
📋 Problem Resolution Flow
━━━━━━━━━━━━━━━━━━━━━━━━
1. /troubleshoot "error message"  # Investigate issue
2. /analyze --focus problem       # Deep dive
3. /improve --fix                 # Apply fixes
4. /test --specific              # Test fix
5. /document --changelog         # Document changes
```

## Interactive Browser

### Interactive Mode

```bash
/index --interactive

🖥️ SuperClaude Command Browser
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Select an option:
1. Browse by Category
2. Search Commands
3. View Workflows
4. Popular Commands
5. Recent History

Choice: 1

📂 Categories:
━━━━━━━━━━━━━
→ Development (5 commands)
  Analysis (4 commands)
  Quality (4 commands)
  Documentation (2 commands)
  Planning (2 commands)
  Deployment (2 commands)

Use arrows to navigate, Enter to select, 'q' to quit
```

### Command Details View

```bash
/index /analyze --detailed

📋 Command: /analyze
━━━━━━━━━━━━━━━━━━━

Purpose: Deep code and system analysis
Category: Analysis
Personas: Analyzer, Architect
MCP: Sequential, Context7

Syntax: /analyze [target] [flags]

Common Flags:
  --scope    Analysis scope level
  --depth    Analysis depth
  --focus    Specific focus area

Examples:
  /analyze @src/ --focus performance
  /analyze --scope architecture
  /analyze @api/ --security

Related Commands:
  → /improve (apply findings)
  → /document (record analysis)
  → /scan (security focus)
```

## Search Functionality

### Smart Search

```bash
/index --search "performance optimization"

🔍 Search Results for "performance optimization"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 4 matching commands:

1. /analyze --focus performance
   Deep performance analysis and bottleneck detection

2. /improve --perf
   Performance optimization with benchmarking

3. /scan --performance
   Performance-focused code scanning

4. /test --benchmark
   Performance testing and benchmarking

💡 Suggested workflow: /analyze → /improve → /test
```

### Category Browsing

```bash
/index --category development

🛠️ Development Commands
━━━━━━━━━━━━━━━━━━━━━━

/build - Intelligent project builder
  Create features, APIs, and components
  Flags: --type, --framework, --template

/ui - Modern UI component generation
  Generate accessible, responsive components
  Flags: --framework, --theme, --responsive

/logo - Company logo search
  Find and generate logo components
  Flags: --format, --theme, --size

/git - Smart git workflows
  Automated commits, PRs, and flows
  Flags: --commit, --pr, --flow

/spawn - Task orchestration
  Complex task decomposition and execution
  Flags: --parallel, --sequential, --validate
```

## Export Formats

### Markdown Export

```bash
/index --export commands.md --format markdown

📄 Exporting to commands.md...

# SuperClaude Command Reference

## Development Commands

### /build
**Purpose**: Intelligent project builder
**Usage**: `/build [target] [flags]`
...

✅ Export complete: commands.md (15.2KB)
```

### Quick Reference Card

```bash
/index --format list --summary

📋 SuperClaude Quick Reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Development:
• /build     - Create features and components
• /ui        - Generate UI components
• /logo      - Search company logos
• /git       - Automate git workflows
• /spawn     - Orchestrate complex tasks

Analysis:
• /analyze   - Deep code analysis
• /troubleshoot - Problem investigation
• /explain   - Technical explanations
• /review    - Code review

Quality:
• /improve   - Code improvements
• /scan      - Security scanning
• /cleanup   - Project maintenance
• /test      - Testing workflows
```

## Command Relationships

### Dependency Graph

```bash
/index --workflows --visual

📊 Command Workflow Map
━━━━━━━━━━━━━━━━━━━━━

        /estimate
           ↓
        /design
           ↓
    ┌─────/build─────┐
    ↓                ↓
  /test          /analyze
    ↓                ↓
    └─→/improve←─────┘
           ↓
      /document
           ↓
       /deploy
```

### Common Sequences

```bash
📋 Most Common Command Sequences:

1. /analyze → /improve (78% of users)
2. /build → /test → /deploy (65%)
3. /scan → /cleanup (52%)
4. /troubleshoot → /improve (48%)
5. /estimate → /build (45%)
```

## Smart Recommendations

### Context-Aware Suggestions

```bash
After running /analyze:
💡 Recommended next commands:
• /improve --quality (apply findings)
• /document (record analysis)
• /scan --security (security check)

After running /build:
💡 Recommended next commands:
• /test (validate implementation)
• /analyze --new (check quality)
• /document --api (document APIs)
```

## Integration with SuperClaude

### Intelligent Discovery
- **Smart Search**: Context-aware command matching
- **Workflow Analysis**: Optimal command sequences
- **Persona Matching**: Role-specific recommendations
- **Usage Learning**: Adapt to user patterns

### Educational Support
- **Progressive Disclosure**: Learn at your pace
- **Interactive Guidance**: Step-by-step help
- **Example Library**: Real-world usage patterns
- **Workflow Templates**: Common sequences

---

*SuperClaude Enhanced | Command Discovery | Intelligent Navigation*