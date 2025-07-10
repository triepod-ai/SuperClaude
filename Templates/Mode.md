# Mode Template - SuperClaude Framework

<!--
INSTRUCTIONS FOR CREATING A NEW MODE:
1. Replace all placeholders marked with [PLACEHOLDER] with your content
2. Modes are operational patterns that affect how Claude processes requests
3. Modes can be activated manually via flags or automatically via context
4. Ensure clear activation/deactivation patterns and integration with existing modes
5. Add your mode to MODES.md after creation
6. Test mode integration with various commands and personas
-->

## [Mode Name] Mode

### Overview

**Purpose**: [One-line description of what this mode does and why it exists]

**Category**: [Choose one: Execution | Analysis | Communication | Resource Management | Quality | Collaboration | Other]

**Activation Type**: [Manual | Automatic | Smart | Hybrid]

**Impact Level**: [Low | Medium | High] - [How significantly this mode changes behavior]

### Core Principles

**Primary Directive**: "[Core philosophy or guiding principle for this mode]"

**Key Principles**:
1. **[Principle 1]**: [Detailed explanation of this principle]
2. **[Principle 2]**: [Detailed explanation of this principle]
3. **[Principle 3]**: [Detailed explanation of this principle]

### Activation Patterns

**Manual Activation**:
- Flag: `--[mode-flag]` or `--[mode-alias]`
- Command: `/[specific-command] --[mode-flag]`
- Context: [When user explicitly requests this mode]

**Automatic Activation**:
- **Triggers**: [List specific conditions that auto-activate this mode]
  - [Condition 1]: [Description and threshold]
  - [Condition 2]: [Description and threshold]
  - [Condition 3]: [Description and threshold]
- **Confidence Threshold**: [X%] for automatic activation
- **Override**: [How users can disable auto-activation]

**Smart Activation**:
- **Context Detection**: [How mode detects when it should be active]
- **Pattern Recognition**: [What patterns trigger smart activation]
- **Learning Adaptation**: [How mode learns from usage patterns]

**Activation Examples**:
```python
def detect_mode_activation(context: Dict[str, Any]) -> Dict[str, Any]:
    """Detect when mode should be activated"""
    
    activation_score = 0.0
    
    # Context-based detection
    if context.get('complexity', 0) > 0.8:
        activation_score += 0.3
    
    if context.get('token_usage_percent', 0) > 75:
        activation_score += 0.4  # Resource constraint mode
    
    if context.get('error_count', 0) > 3:
        activation_score += 0.5  # Error recovery mode
    
    # Pattern recognition
    operation_patterns = context.get('operation_patterns', [])
    if 'iterative_improvement' in operation_patterns:
        activation_score += 0.3
    
    if 'multi_domain_analysis' in operation_patterns:
        activation_score += 0.2
    
    return {
        "should_activate": activation_score >= 0.7,
        "activation_score": activation_score,
        "confidence": min(activation_score * 1.2, 1.0),
        "trigger_reasons": get_trigger_reasons(context, activation_score)
    }
```

### Mode Behavior

**Core Behavior Changes**:
- [Behavior 1]: [How this mode changes standard operation]
- [Behavior 2]: [Another significant behavioral change]
- [Behavior 3]: [Third important behavioral modification]

**Decision Framework**:
- **Priority Matrix**: [How decisions are prioritized in this mode]
- **Trade-off Philosophy**: [How this mode handles conflicting requirements]
- **Quality Standards**: [What constitutes success in this mode]

**Communication Style**:
- **Output Format**: [How results are presented]
- **Verbosity Level**: [Amount of detail provided]
- **Tone**: [Communication style and approach]

### Integration Patterns

**Command Integration**:
- **Primary Commands**: [Commands that work best with this mode]
  - `/[command1]` - [How mode enhances this command]
  - `/[command2]` - [Specific benefits with this command]
  - `/[command3]` - [Integration advantages]

- **Secondary Commands**: [Commands that benefit from this mode]
  - `/[command4]` - [Conditional benefits]
  - `/[command5]` - [Specific use cases]

**Persona Compatibility**:
- **Synergistic Personas**: [Personas that work well with this mode]
  - `--persona-[name]` - [How they complement each other]
  - `--persona-[name]` - [Specific synergies]

- **Conflicting Personas**: [Personas that may conflict with this mode]
  - `--persona-[name]` - [Why conflict occurs and resolution]

**MCP Server Integration**:
- **Preferred Servers**: [MCP servers that align with this mode]
  - [Server Name] - [Why this server is preferred]
  - [Server Name] - [Specific advantages]

- **Avoided Servers**: [MCP servers that don't align with this mode]
  - [Server Name] - [Why this server is avoided]

### Flag Interactions

**Compatible Flags**:
- `--[flag1]` - [How this flag enhances the mode]
- `--[flag2]` - [Synergistic effect]
- `--[flag3]` - [Complementary functionality]

**Conflicting Flags**:
- `--[flag1]` - [Why conflict occurs]
- `--[flag2]` - [Resolution strategy]

**Precedence Rules**:
1. [Highest priority interaction]
2. [Second priority interaction]
3. [Third priority interaction]

### Performance Characteristics

**Resource Usage**:
- **Token Impact**: [How mode affects token consumption]
- **Memory Usage**: [Memory implications]
- **Processing Time**: [Time impact]
- **Caching Behavior**: [How mode affects caching]

**Efficiency Metrics**:
- **Baseline Performance**: [Standard performance without mode]
- **Mode Performance**: [Performance with mode active]
- **Optimization Opportunities**: [How mode can be optimized]

**Scale Considerations**:
- **Small Scale**: [How mode performs on small operations]
- **Medium Scale**: [Performance on medium operations]
- **Large Scale**: [Behavior on large operations]

### Quality Standards

**Success Criteria**:
- [Criterion 1]: [How to measure success]
- [Criterion 2]: [Another success metric]
- [Criterion 3]: [Third success indicator]

**Validation Requirements**:
- [Requirement 1]: [What must be validated]
- [Requirement 2]: [Another validation need]
- [Requirement 3]: [Third validation requirement]

**Error Handling**:
- [Error Type 1]: [How mode handles this error]
- [Error Type 2]: [Error handling strategy]
- [Error Type 3]: [Recovery approach]

### Use Cases & Examples

**Ideal Scenarios**:
1. **[Scenario Name]**: [Detailed description]
   ```bash
   # Example usage
   /[command] --[mode-flag] [arguments]
   # Expected behavior and outcome
   ```

2. **[Scenario Name]**: [Another ideal use case]
   ```bash
   # Example usage
   /[command] --[mode-flag] --[additional-flags]
   # Expected behavior and outcome
   ```

**Anti-Patterns**:
- **Don't use for**: [Inappropriate scenarios]
- **Avoid when**: [Conditions where mode shouldn't be used]
- **Alternative**: [Better approaches for these cases]

### Implementation Notes

**Technical Requirements**:
- [Requirement 1]: [Technical necessity]
- [Requirement 2]: [Implementation detail]
- [Requirement 3]: [System requirement]

**Configuration Options**:
```yaml
mode_config:
  [setting_1]: [default_value]  # [Description]
  [setting_2]: [default_value]  # [Description]
  [setting_3]: [default_value]  # [Description]
```

**Monitoring & Metrics**:
- [Metric 1]: [What to measure and why]
- [Metric 2]: [Another important metric]
- [Metric 3]: [Third metric to track]

### Troubleshooting

**Common Issues**:
1. **[Issue Name]**: [Problem description]
   - **Cause**: [Why this happens]
   - **Solution**: [How to fix]
   - **Prevention**: [How to avoid]

2. **[Issue Name]**: [Another common problem]
   - **Cause**: [Root cause]
   - **Solution**: [Resolution steps]
   - **Prevention**: [Preventive measures]

**Debugging Tips**:
- [Tip 1]: [Debugging strategy]
- [Tip 2]: [Another debugging approach]
- [Tip 3]: [Third debugging technique]

### Mode Transitions

**State Management**:
```python
class ModeManager:
    def __init__(self):
        self.active_modes = []
        self.mode_history = []
        self.transition_rules = self._load_transition_rules()
    
    def transition_to_mode(self, new_mode: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle mode transitions with validation"""
        
        # Check if transition is allowed
        if not self._can_transition(new_mode, context):
            return {"success": False, "reason": "transition_not_allowed"}
        
        # Handle mode conflicts
        conflicting_modes = self._get_conflicting_modes(new_mode)
        if conflicting_modes:
            self._resolve_conflicts(conflicting_modes, new_mode, context)
        
        # Perform transition
        self._deactivate_incompatible_modes(new_mode)
        self._activate_mode(new_mode, context)
        
        return {
            "success": True,
            "active_modes": self.active_modes,
            "transition_reason": context.get('trigger_reason'),
            "performance_impact": self._calculate_performance_impact()
        }
    
    def _resolve_conflicts(self, conflicting_modes: List[str], new_mode: str, context: Dict[str, Any]):
        """Resolve conflicts between modes based on priority"""
        
        mode_priorities = {
            "efficiency_mode": 10,  # Highest priority for resource constraints
            "quality_mode": 8,
            "analysis_mode": 6,
            "generation_mode": 4,
            "default_mode": 1
        }
        
        new_mode_priority = mode_priorities.get(new_mode, 5)
        
        for conflicting_mode in conflicting_modes:
            existing_priority = mode_priorities.get(conflicting_mode, 5)
            
            if new_mode_priority > existing_priority:
                self._deactivate_mode(conflicting_mode)
            elif new_mode_priority == existing_priority:
                # Same priority - check context for decision
                if self._should_override_based_on_context(context):
                    self._deactivate_mode(conflicting_mode)
```

### Related Modes

**Complementary Modes**:
- **[Mode Name]**: [How modes work together]
- **[Mode Name]**: [Synergistic effects]

**Competing Modes**:
- **[Mode Name]**: [How conflict is resolved]
- **[Mode Name]**: [Priority rules]

**Mode Stacking**:
- **Compatible Combinations**: [Modes that can be active together]
- **Precedence Rules**: [How multiple modes interact]
- **Performance Impact**: [Effect of running multiple modes]

### Evolution & Adaptation

**Learning Mechanisms**:
- [Learning Type 1]: [How mode learns and adapts]
- [Learning Type 2]: [Another learning approach]

**Improvement Opportunities**:
- [Improvement 1]: [Potential enhancement]
- [Improvement 2]: [Another improvement area]

**Future Enhancements**:
- [Enhancement 1]: [Planned feature]
- [Enhancement 2]: [Future capability]

---

<!--
CHECKLIST BEFORE SUBMITTING:
- [ ] Mode name follows naming conventions
- [ ] Purpose is clear and distinct from existing modes
- [ ] Activation patterns are well-defined and testable
- [ ] Integration with commands, personas, and MCP servers documented
- [ ] Performance characteristics are realistic
- [ ] Use cases demonstrate clear value
- [ ] Troubleshooting covers common scenarios
- [ ] Related modes are properly cross-referenced
- [ ] Added to MODES.md
- [ ] Tested with various command and persona combinations
-->