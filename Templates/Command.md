# Command Template - SuperClaude Framework

<!--
INSTRUCTIONS FOR CREATING A NEW COMMAND:
1. Replace all placeholders marked with [PLACEHOLDER] with your content
2. Ensure YAML frontmatter includes required fields (allowed-tools, description)
3. Follow the $ARGUMENTS pattern for dynamic input handling
4. Add your command to /commands/ directory
5. Update COMMANDS.md with your new command
6. Test with various flag combinations
-->

---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, Edit, MultiEdit, Write, Task, WebFetch, WebSearch, NotebookRead, NotebookEdit]
description: "[Brief one-line description of what this command does]"
framework-version: "3.0"
---

# /[command-name] - [Command Title]

**Purpose**: [Clear description of command functionality and value]  
**Category**: [Development|Analysis|Quality|Documentation|Planning|Testing|Deployment|Meta]  
**Syntax**: `/[command-name] $ARGUMENTS`

## Examples

```bash
# Basic usage
/[command-name] [basic-argument]

# With file references
/[command-name] @src/components/ --[flag]

# With bash integration
/[command-name] !npm test --[flag]

# Complex example
/[command-name] @src/ --think-hard --persona-[type] --scope project
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - [Description of primary target/argument]
- `@<path>` - File/directory references for analysis
- `!<command>` - Bash commands to execute
- `--<flag>` - Modify command behavior

### Command-Specific Flags

- `--[primary-flag]`: [Main functionality modifier]
- `--[secondary-flag]`: [Secondary feature]
- `--[option] [value]`: [Parameterized option]

### Universal SuperClaude Flags

- `--plan`: Show execution plan before starting
- `--think`: Standard analysis (~4K tokens)
- `--think-hard`: Deep analysis (~10K tokens)  
- `--ultrathink`: Maximum depth (~32K tokens)
- `--uc`: UltraCompressed mode
- `--answer-only`: Direct response mode without proactive behavior
- `--introspect`: Show decision-making process

### Wave System Flags (For Complex Operations)

- `--wave-mode`: Enable successive wave orchestration
- `--force-waves`: Override auto-detection and force wave mode
- `--single-wave`: Disable wave mode, use traditional execution
- `--adaptive-waves`: Dynamic wave configuration based on complexity
- `--progressive-waves`: Progressive enhancement strategy
- `--systematic-waves`: Systematic analysis strategy
- `--enterprise-waves`: Enterprise-scale orchestration
- `--wave-validation`: Enable quality gates between waves
- `--wave-count [n]`: Override automatic wave count (default: 5)
- `--wave-agents [types]`: Custom wave agent specializations
- `--wave-threshold [level]`: Custom complexity threshold (0.0-1.0)
- `--wave-strategy [name]`: Force specific wave strategy
- `--wave-intelligence [level]`: Control compound intelligence level
- `--wave-parallel`: Enable parallel execution within waves
- `--wave-checkpoint`: Enable automatic checkpointing
- `--wave-dry-run`: Simulate wave execution without changes

### Orchestrator Flags (For Multi-Agent Operations)

- `--orchestrate`: Enable multi-agent orchestration
- `--delegate`: Enable task delegation to specialized agents
- `--introspect`: Show internal decision-making process
- `--compound-intelligence`: Enable cross-agent knowledge sharing

### Scope & Focus

- `--scope [file|module|project|system]`: Analysis boundary
- `--focus [area]`: Specific aspect to emphasize

## Workflow Process

1. **Parse Arguments**: Process $ARGUMENTS, validate inputs
2. **Context Assessment**: Analyze complexity, scope, and requirements
3. **Orchestration Decision**: Choose single-agent, wave, or multi-agent approach
4. **[Step 4 Name]**: [What happens in this step]
5. **[Step 5 Name]**: [What happens in this step]
6. **Quality Validation**: Ensure output meets standards
7. **Generate Output**: Format results with SuperClaude symbols

### Orchestration Patterns

**Single-Agent Mode**: Traditional single-agent execution
- Standard command processing
- Direct tool usage
- Linear workflow

**Wave Mode**: Successive wave orchestration (see FLAGS.md for complete documentation)
- `--wave-mode`: Enable automatic wave orchestration
- `--wave-strategy [type]`: Choose wave strategy (progressive, systematic, adaptive, enterprise, validation)
- `--wave-validation`: Enable quality gates between waves
- `--wave-agents [types]`: Specify custom wave agent specializations
- `--wave-checkpoint`: Enable automatic checkpointing for safety
- `--compound-intelligence`: Enable context accumulation between waves

**Multi-Agent Mode**: Parallel agent delegation
- `--orchestrate`: Enable multi-agent coordination
- `--delegate`: Enable specialized task delegation
- `--introspect`: Show coordination decisions
- `--compound-intelligence`: Enable cross-agent knowledge sharing

## Output Format

### Standard Output
```
📊 [Section Header]
├─ [Key metric]: [Value]
├─ [Another metric]: [Value]
└─ [Summary]: [Description]

✅ [Success indicator]
⚠️ [Warning if applicable]
🎯 [Recommendations]
```

### UltraCompressed Output (`--uc`)
```
[Concise symbol-heavy output example]
[Show 60-80% reduction]
```

## Integration Patterns

### Auto-Activation

**Personas**:
- `[persona-name]`: When [condition is met]
- `[persona-name]`: For [specific task type]

**MCP Servers**:
- `Context7`: When library documentation or framework patterns needed
- `Sequential`: For complex analysis requiring multi-step reasoning
- `Magic`: If UI components or design system creation involved
- `Playwright`: When browser automation, testing, or performance measurement needed

**Server Selection Examples**:
```bash
# Context7 for framework documentation
/implement @components/ --framework react
# Auto-activates Context7 for React patterns

# Sequential for complex analysis
/analyze @codebase/ --think-hard
# Auto-activates Sequential for deep reasoning

# Magic for UI component creation
/create-component LoginForm --responsive
# Auto-activates Magic for component generation

# Playwright for performance testing
/test --performance @app/
# Auto-activates Playwright for metrics collection
```

### Command Interactions

**Works Well With**:
- `/[command]` → `/[this-command]`: [Workflow description]
- Parallel with: `/[command]`, `/[command]`

**Prerequisites**:
- [Any required setup or context]
- [Dependencies that must exist]

## Error Handling

### Common Errors

1. **[Error Type]**: [Description]
   - **Cause**: [Why it happens]
   - **Fix**: [How to resolve]
   - **Prevention**: [How to avoid]

2. **[Error Type]**: [Description]
   - **Cause**: [Why it happens]  
   - **Fix**: [How to resolve]

### Recovery Strategies

- **Fallback**: [Alternative approach when primary fails]
- **Partial Results**: [What can be delivered despite errors]
- **Manual Steps**: [User actions to complete task]

## Performance Profile

**Token Usage**:
- Basic: ~2-5K tokens (simple operations)
- With `--think`: ~5-12K tokens (standard analysis)
- With `--think-hard`: ~12-20K tokens (deep analysis)
- With `--ultrathink`: ~20-35K tokens (comprehensive analysis)
- Multi-agent mode: ~10-30K tokens (distributed across agents)

**Execution Time**:
- Small scope (1-5 files): 30-90 seconds
- Module scope (5-20 files): 2-8 minutes
- Project scope (20-100 files): 8-25 minutes
- System scope (100+ files): 25-60 minutes
- Multi-agent operations: 5-20 minutes (parallel processing)

**Resource Requirements**:
- File operations: [Light|Moderate|Heavy]
- CPU usage: [Low|Medium|High]
- Memory: [Low|Medium|High]

## Implementation Notes

<!-- Internal notes for maintainers -->
**Key Considerations**:
- [Important implementation detail]
- [Performance optimization note]
- [Integration consideration]

**Future Enhancements**:
- [Planned improvement]
- [Potential feature]

---

<!-- 
CHECKLIST BEFORE SUBMITTING:
- [ ] YAML frontmatter is complete and valid
- [ ] $ARGUMENTS placeholder used correctly
- [ ] Examples cover common use cases
- [ ] Universal flags are documented
- [ ] Error handling is comprehensive
- [ ] Performance metrics are realistic
- [ ] Integration patterns are clear
- [ ] Output format examples provided
- [ ] Added to /commands/ directory
- [ ] COMMANDS.md updated
-->