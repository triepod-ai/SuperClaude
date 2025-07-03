---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write]
description: "Template for Claude Code slash commands with SuperClaude framework integration"
---

# /<command-name> - <Command Title>

**Purpose**: <Brief description of command functionality>  
**Category**: <Development|Analysis|Quality|Documentation|Planning|Testing|Deployment|Meta>  
**Syntax**: `/<command-name> $ARGUMENTS`

## Examples

```bash
/<command-name> basic-usage
/<command-name> @src/components/ --detailed
/<command-name> --analysis-type performance !npm test
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Target files/directories for command operation
- `@<path>` - File reference integration with Claude Code
- `!<command>` - Bash command execution integration
- `--<flag>` - Command-specific behavior modification

### Primary Flags

- `--<primary-flag>`: <Description of main functionality>
- `--<secondary-flag>`: <Description of secondary feature>
- `--scope [level]`: Analysis scope (file|module|project|system)

### Universal SuperClaude Flags

- `--plan`: Display execution plan before operations
- `--think`: Enable Sequential thinking for complex analysis (~4K tokens)
- `--think-hard`: Deep architectural analysis (~10K tokens)  
- `--ultrathink`: Critical system analysis (~32K tokens)
- `--uc`: Activate UltraCompressed mode for token efficiency
- `--introspect`: Transparency mode with decision-making exposure

### Persona Integration

- `--persona-<type>`: Activate specific SuperClaude persona
  - `architect`: Systems architecture specialist
  - `frontend`: UX specialist, accessibility advocate
  - `backend`: Reliability engineer, API specialist
  - `analyzer`: Root cause specialist, investigator
  - `security`: Threat modeler, compliance expert
  - `mentor`: Knowledge transfer, educator
  - `refactorer`: Code quality specialist
  - `performance`: Optimization specialist
  - `qa`: Quality advocate, testing specialist

### MCP Server Control

- `--c7|--context7`: Enable Context7 for official documentation
- `--seq|--sequential`: Enable Sequential for complex thinking
- `--magic`: Enable Magic for UI components (when applicable)
- `--pup|--puppeteer`: Enable Puppeteer for browser automation
- `--all-mcp`: Enable all MCP servers
- `--no-mcp`: Disable all MCP servers

## Workflow Process

### Phase 1: Initialization
1. **Context Reading**: Use TodoRead() to understand current task state
2. **Argument Processing**: Parse $ARGUMENTS and validate inputs
3. **File Resolution**: Process @ file references using Read/Glob tools
4. **Persona Activation**: Auto-select or apply specified persona

### Phase 2: Analysis/Execution
1. **Tool Orchestration**: Coordinate Claude Code native tools
2. **MCP Integration**: Activate appropriate MCP servers based on flags
3. **Task Creation**: Use TodoWrite() for complex multi-step operations
4. **Progress Tracking**: Real-time task status updates

### Phase 3: Output/Completion
1. **Results Compilation**: Synthesize findings with SuperClaude symbols
2. **Quality Validation**: Verify output completeness and accuracy
3. **Task Completion**: Mark TodoWrite tasks as completed
4. **Next Steps**: Provide actionable recommendations

## Claude Code Integration

### Native Tool Usage

**Read Tool**:
- Process @ file references directly
- Analyze configuration files and source code
- Extract patterns and architectural insights

**Grep Tool**:
- Search for patterns across codebase
- Identify usage patterns and dependencies
- Locate security vulnerabilities and code smells

**Glob Tool**:
- Discover files matching patterns
- Build comprehensive file inventories
- Support wildcard-based target selection

**Bash Tool**:
- Execute ! command integrations
- Run project-specific tools and scripts
- Perform system-level operations safely

**TodoWrite/TodoRead**:
- Track complex multi-step operations
- Provide user visibility into progress
- Coordinate between workflow phases

### File Reference Patterns

```bash
# Direct file analysis
/<command-name> @src/components/Button.tsx

# Directory analysis
/<command-name> @src/ --recursive

# Multiple targets
/<command-name> @src/components/ @tests/ @docs/

# Pattern-based selection
/<command-name> @**/*.ts --exclude @node_modules/
```

### Bash Integration Patterns

```bash
# Pre-command validation
/<command-name> !npm test && @src/

# Command chaining
/<command-name> @src/ !eslint --fix

# Environment setup
/<command-name> !export NODE_ENV=test && @tests/
```

## SuperClaude Framework Integration

### Symbol System Usage

Use SuperClaude unified symbols for consistent communication:
- `→` leads to, implies, results in
- `✅` completed, successful, passed  
- `❌` failed, error, blocked
- `🔄` in progress, working, active
- `📊` metrics, data, statistics
- `🎯` target, goal, objective

### Token Efficiency

**Standard Mode**: 
- Balanced detail with clear explanations
- Use abbreviations: `cfg`, `impl`, `perf`, `sec`, `arch`
- Structured output with headers and bullets

**UltraCompressed Mode** (`--uc`):
- 60-80% token reduction
- Aggressive symbol substitution
- Essential information preservation
- Auto-generated symbol legend

### Evidence-Based Language

**Required Qualifiers**:
- "Testing indicates..." instead of "This is the best..."
- "Metrics show..." instead of "Obviously..."
- "Documentation suggests..." instead of "Always..."

**Prohibited Speculation**:
- Avoid "best", "optimal", "perfect" without evidence
- No unsupported performance claims
- No absolute statements without measurement

## Error Handling

### Input Validation
1. Validate @ file references exist and are accessible
2. Check ! bash commands are safe and permitted
3. Verify flag combinations are compatible
4. Ensure required dependencies are available

### Graceful Degradation
1. **MCP Server Unavailable**: Fall back to native tools + WebSearch
2. **File Access Issues**: Provide clear error messages with alternatives
3. **Command Failures**: Attempt recovery with alternative approaches
4. **Token Limits**: Automatically activate compression mode

### Recovery Strategies
1. **Partial Results**: Deliver what's possible with clear limitations noted
2. **Alternative Approaches**: Suggest manual steps when automation fails
3. **Retry Logic**: Intelligent retry for transient failures
4. **User Guidance**: Clear next steps when manual intervention needed

## Quality Standards

### Validation Requirements
- All code examples must be syntactically correct
- File paths must use absolute paths for tools
- Bash commands must be properly quoted and safe
- Output must be actionable and specific

### Performance Requirements
- Batch tool calls when possible for parallel execution
- Use appropriate thinking depth flags for complexity
- Optimize token usage through compression when needed
- Cache results for repeated operations within session

### Security Requirements
- Never expose sensitive information in logs or output
- Validate all user inputs for path traversal attacks
- Use safe bash commands with proper parameter validation
- Respect file permissions and access controls

## Example Implementation

```bash
# Comprehensive analysis with full SuperClaude integration
/<command-name> @src/ --think-hard --seq --persona-analyzer --introspect

🧠 **Sequential Analysis Activated**
🔍 **Analyzing**: 156 files across 12 modules
🎯 **Focus**: Comprehensive code quality & architecture review

📊 **Phase 1**: File discovery & categorization
├─ TypeScript files: 89 (57%)
├─ React components: 34 (22%)  
├─ Test files: 23 (15%)
└─ Configuration: 10 (6%)

🔄 **Phase 2**: Pattern analysis with Context7 integration
📚 Fetching React best practices...
🔍 Analyzing component patterns...
⚡ Performance hotspots identified: 3

📋 **Phase 3**: Results synthesis
✅ **Quality Score**: 87/100 (Good)
⚠️ **Issues Found**: 12 medium, 3 high priority
🎯 **Recommendations**: 8 actionable improvements

💡 **Key Insights**:
├─ Architecture: Solid modular design
├─ Performance: Bundle size optimization needed  
├─ Security: Input validation gaps found
└─ Testing: Coverage adequate (89%)
```

## Integration Checklist

- [ ] YAML frontmatter with required fields
- [ ] $ARGUMENTS placeholder usage
- [ ] @ file reference support
- [ ] ! bash command integration
- [ ] SuperClaude symbol system
- [ ] Persona integration points
- [ ] MCP server activation logic
- [ ] TodoWrite/TodoRead workflow
- [ ] Error handling & recovery
- [ ] Evidence-based language
- [ ] Token efficiency optimization
- [ ] Quality validation steps

---

*Template Version: 1.0 | SuperClaude Framework Integration | Claude Code Compatible*