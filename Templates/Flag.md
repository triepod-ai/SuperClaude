# Flag Template - SuperClaude Framework

<!-- 
INSTRUCTIONS FOR CREATING A NEW FLAG:
1. Replace all placeholders marked with [PLACEHOLDER] with your content
2. Follow the established SuperClaude patterns for consistency
3. Ensure integration with existing flags and features
4. Add your flag to FLAGS.md after creation
5. Update command compatibility matrices as needed
-->

## `--[flag-name]` / `--[optional-alias]`

### Basic Information

**Purpose**: [One-line clear description of what this flag does]

**Category**: [Choose one: Planning & Analysis | Compression & Efficiency | MCP Server Control | Scope & Focus | Persona Activation | Introspection & Transparency | Wave System | Orchestration | Other]

**Token Impact**: [Specify: Low (0-1K) | Medium (1-5K) | High (5-15K) | Very High (15K+)]

### Behavior & Functionality

**Core Behavior**: 
[Detailed explanation of how the flag works, what it modifies, and its effects on command execution]

**Use Cases**:
- [Specific scenario where this flag is valuable]
- [Another use case with clear context]
- [Third use case demonstrating different application]

**Example Usage**:
```bash
# Basic usage
/[command] --[flag-name]

# With other flags
/[command] --[flag-name] --[other-flag] [arguments]

# Real-world example
/analyze @src/ --[flag-name] --think
```

### Activation Patterns

**Manual Activation**:
- Explicitly specified by user: `--[flag-name]`
- [Any special activation syntax or patterns]

**Auto-Activation** (if applicable):
- **Complexity Threshold**: Automatically activates when operation complexity >0.7
- **Resource Constraint**: Activates when token usage approaches 75% capacity
- **Context Pattern**: Triggers based on specific file patterns or project structure
- **Performance Issues**: Activates when response times exceed thresholds

**Smart Inference** (if applicable):
- **Keyword Detection**: Activates when specific terms detected in user request
- **Project Context**: Based on framework, language, or architecture patterns
- **Historical Usage**: Learns from successful past activations
- **Error Recovery**: Activates during specific error conditions

**Auto-Activation Examples**:
```yaml
# Performance optimization flag
performance_threshold:
  condition: "response_time > 500ms OR error_rate > 1%"
  activation: "--persona-performance --focus performance"
  confidence: 85%

# Compression flag
compression_activation:
  condition: "token_usage > 75% OR --uc requested"
  activation: "ultra_compressed_mode"
  confidence: 95%

# Multi-agent delegation
delegation_trigger:
  condition: "file_count > 50 AND complexity > 0.6"
  activation: "--delegate --parallel-processing"
  confidence: 80%
```

### Integration & Compatibility

**Works With**:
- Commands: `/[command1]`, `/[command2]`, `/[command3]`
- Other Flags: `--[compatible-flag1]`, `--[compatible-flag2]`
- MCP Servers: [List compatible servers if any]
- Personas: [List compatible personas if any]
- Wave System: [How flag works in wave mode]
- Orchestration: [How flag affects multi-agent coordination]

**Conflicts With**:
- `--[conflicting-flag]` - [Reason for conflict]
- [Any other incompatibilities]

**Priority/Precedence**:
- [How this flag behaves when combined with others]
- [Override rules if applicable]
- [Wave/orchestration precedence rules]

### Performance & Resource Usage

**Token Usage**:
- Baseline: [X tokens]
- With typical workflow: [Y tokens]
- Maximum expected: [Z tokens]

**Performance Considerations**:
- [Impact on execution time]
- [Memory or resource requirements]
- [Caching opportunities]

### Quality Standards

**Validation Requirements**:
- [What checks are performed when flag is active]
- [Quality gates that apply]
- [Success criteria]

**Error Handling**:
- [How errors are handled with this flag]
- [Fallback behavior]
- [Recovery strategies]

### Best Practices

1. **When to Use**:
   - [Ideal scenario for this flag]
   - [Another good use case]

2. **When to Avoid**:
   - [Scenario where flag is not appropriate]
   - [Performance or compatibility concerns]

3. **Optimization Tips**:
   - [How to use efficiently]
   - [Combination strategies]

### Implementation Notes

<!-- Internal notes for maintainers -->
**Technical Requirements**:
- [Any special implementation needs]
- [Dependencies or prerequisites]
- [Integration points]

**Future Enhancements**:
- [Planned improvements]
- [Potential expansions]

---

<!-- 
CHECKLIST BEFORE SUBMITTING:
- [ ] Flag name follows naming conventions (lowercase, hyphenated)
- [ ] Purpose is clear and concise
- [ ] All sections are complete with real examples
- [ ] Integration matrix updated in FLAGS.md
- [ ] Command compatibility verified
- [ ] Token impact accurately assessed
- [ ] Auto-activation rules are clear and testable
- [ ] Best practices provide actionable guidance
-->