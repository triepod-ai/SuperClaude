# Principle Template - SuperClaude Framework

<!--
INSTRUCTIONS FOR CREATING A NEW PRINCIPLE:
1. Replace all placeholders marked with [PLACEHOLDER] with your content
2. Principles are high-level guiding philosophies, not specific rules
3. Focus on the "why" and "how to think" rather than "what to do"
4. Principles should be timeless and broadly applicable
5. Add your principle to PRINCIPLES.md after creation
6. Consider how it integrates with existing principles
-->

## [Principle Name]

**Domain**: [Architecture|Development|Quality|Communication|Decision-Making|Problem-Solving|Innovation]

**Scope**: [Framework-wide|Command-specific|Workflow-specific|Context-dependent]

### Core Statement

**[Principle Statement]**: [One clear, memorable sentence that captures the essence of this principle]

*"[Optional memorable quote or motto that embodies this principle]"*

### Philosophy

**Fundamental Belief**: [The underlying belief or assumption this principle is based on]

**Core Insight**: [The key insight or realization that led to this principle]

**Value Proposition**: [Why following this principle creates value]

### Guiding Questions

When applying this principle, ask yourself:

1. **[Question 1]**: [Key question to guide decision-making]
2. **[Question 2]**: [Another important consideration]
3. **[Question 3]**: [Additional perspective to consider]

### Application Patterns

**In Decision-Making**:
- When [situation], consider [approach guided by principle]
- If [conflict arises], prioritize [principle-based resolution]
- Choose [option A] over [option B] when [principle-based criteria]

**In Problem-Solving**:
- Start by [principle-guided first step]
- Frame problems as [principle-based perspective]
- Seek solutions that [principle-based characteristics]

**In Design**:
- Design for [principle-based outcome]
- Avoid [anti-pattern that violates principle]
- Optimize for [principle-aligned metric]

### Real-World Manifestations

**Commands & Workflows**:
- `/analyze` embodies evidence-based reasoning by requiring validation before conclusions
- Multi-agent orchestration reflects this principle through intelligent task delegation
- MCP coordination follows this principle via fallback chains and error recovery

**SuperClaude Framework Integration**:
```python
def apply_principle_in_framework(principle_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Apply principle within SuperClaude framework operations"""
    
    principle_applications = {
        "evidence_based_reasoning": {
            "validation_gates": ["syntax", "type", "lint", "security", "test", "performance"],
            "decision_criteria": "measurable_outcomes",
            "fallback_strategy": "graceful_degradation"
        },
        "progressive_enhancement": {
            "orchestration_modes": ["single_agent", "multi_agent", "delegation"],
            "complexity_thresholds": [0.3, 0.7, 0.9],
            "escalation_triggers": ["file_count", "operation_complexity", "domain_count"]
        },
        "intelligent_automation": {
            "auto_activation": ["persona_selection", "mcp_coordination", "flag_optimization"],
            "learning_mechanisms": ["usage_patterns", "success_metrics", "error_recovery"],
            "adaptation_strategies": ["context_aware", "performance_driven", "user_preference"]
        }
    }
    
    application = principle_applications.get(principle_name, {})
    
    return {
        "principle_active": True,
        "implementation_strategy": application,
        "integration_points": get_framework_integration_points(principle_name, context),
        "success_metrics": define_principle_success_metrics(principle_name)
    }

def demonstrate_principle_in_action(principle_name: str, scenario: str) -> str:
    """Provide concrete examples of principle application"""
    
    examples = {
        "evidence_based_reasoning": {
            "command_execution": """
            # Before making changes, validate evidence
            /analyze @codebase/ --think-hard
            # Evidence: Performance bottleneck identified in UserService.js:142
            # Decision: Optimize database query based on profiling data
            /optimize @src/services/UserService.js --focus performance
            """,
            "mcp_selection": """
            # Context7 selected for React documentation query
            # Evidence: React imports detected, component creation requested
            # Result: 95% accuracy in generated component patterns
            """
        },
        "progressive_enhancement": {
            "orchestration_escalation": """
            # Start simple, escalate based on complexity
            Request: "Improve entire codebase quality"
            Step 1: Single agent analysis (complexity: 0.9 detected)
            Step 2: Auto-escalate to multi-agent delegation
            Step 3: Specialized agents for quality, security, performance
            Result: 70% faster execution, comprehensive coverage
            """
        }
    }
    
    return examples.get(principle_name, {}).get(scenario, "No example available")
```

**Code & Architecture**:
- Orchestrator uses weighted scoring matrices for evidence-based MCP server selection
- Persona auto-activation implements multi-factor analysis rather than simple keyword matching
- Error recovery strategies provide graduated fallback chains instead of binary failure

**User Experience**:
- Progressive disclosure: Simple commands auto-escalate to complex orchestration when needed
- Intelligent defaults: Framework learns from usage patterns to improve auto-activation
- Transparent reasoning: `--introspect` flag exposes decision-making process to users

### Balancing & Trade-offs

**Tension Points**:
- This principle vs. [Competing Principle]: [How to balance]
- This principle vs. [Practical Constraint]: [How to handle tension]
- This principle vs. [Performance Need]: [How to optimize]

**When to Bend**:
- [Exceptional circumstance where flexibility is needed]
- [Context where principle may be temporarily set aside]
- [Higher-order principle that may override this one]

**When to Stand Firm**:
- [Non-negotiable scenarios where principle must be upheld]
- [Core value that cannot be compromised]
- [Fundamental belief that requires consistent application]

### Success Indicators

**Qualitative Measures**:
- [Observable behavior that indicates principle is being followed]
- [Cultural or process change that reflects principle adoption]
- [Mindset shift that demonstrates principle internalization]

**Quantitative Metrics**:
- [Measurable outcome that correlates with principle application]
- [Performance indicator that improves when principle is followed]
- [Quality metric that reflects principle adherence]

### Evolution & Adaptation

**Historical Context**:
- [How this principle emerged or was discovered]
- [Previous approaches that led to this insight]
- [Evolution of thinking that produced this principle]

**Future Considerations**:
- [How this principle might evolve with new technologies]
- [Potential challenges to this principle in the future]
- [Areas where principle might need refinement]

### Related Principles

**Reinforcing Principles**:
- [Principle that strengthens this one]
- [Complementary principle that works together]
- [Supporting principle that enables this one]

**Competing Principles**:
- [Principle that sometimes conflicts with this one]
- [How to resolve conflicts between principles]
- [When one principle should take precedence]

### Implementation Guidance

**For Framework Developers**:
- [How to build this principle into framework components]
- [Code patterns that embody this principle]
- [Architecture decisions that reflect this principle]

**For Users**:
- [How to apply this principle in daily usage]
- [Commands that best embody this principle]
- [Workflows that demonstrate this principle]

**For Contributors**:
- [How to ensure new contributions align with this principle]
- [Review criteria based on this principle]
- [Design guidelines that reflect this principle]

### Learning & Internalization

**Key Insights to Remember**:
- [Most important takeaway from this principle]
- [Critical understanding needed to apply principle]
- [Common misconception to avoid]

**Practice Exercises**:
- [Specific exercise to internalize this principle]
- [Decision-making scenario to practice with]
- [Reflection question to deepen understanding]

**Mastery Indicators**:
- [Sign that someone has internalized this principle]
- [Behavior that demonstrates principle mastery]
- [Ability that indicates deep understanding]

---

<!--
CHECKLIST BEFORE SUBMITTING:
- [ ] Principle statement is clear and memorable
- [ ] Philosophy section explains the "why" effectively
- [ ] Guiding questions help with practical application
- [ ] Application patterns provide concrete guidance
- [ ] Real-world manifestations are specific and observable
- [ ] Balancing guidance helps with trade-offs
- [ ] Success indicators are measurable
- [ ] Related principles are properly cross-referenced
- [ ] Implementation guidance is actionable
- [ ] Added to PRINCIPLES.md
-->