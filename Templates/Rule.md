# Rule Template - SuperClaude Framework

<!--
INSTRUCTIONS FOR CREATING A NEW RULE:
1. Replace all placeholders marked with [PLACEHOLDER] with your content
2. Choose appropriate complexity level (Simple or Complex)
3. Rules should be clear, enforceable, and evidence-based
4. Include rationale and examples where helpful
5. Add your rule to RULES.md after creation
6. Consider impact on existing workflows and commands
-->

## [Rule Name]

**Category**: [Coding Standards|Security|Quality|Performance|Communication|Architecture|Testing|Documentation]

**Complexity**: [Simple|Complex] <!-- Use Simple for straightforward rules, Complex for multi-faceted requirements -->

### Rule Statement

**[Clear Statement]**: [What must/should be done - one clear, unambiguous sentence]

**Applies to**: [Where/when this rule applies - specific contexts, file types, or scenarios]

**Enforcement Level**: [Mandatory|Recommended|Best Practice]

### Examples

✅ **Correct Implementation**:
```[language]
// Example demonstrating proper rule compliance
[Code or example showing correct approach]
```

❌ **Incorrect Implementation**:
```[language]
// Example showing rule violation
[Code or example showing what NOT to do]
// Problem: [What's wrong with this approach]
```

### Rationale

[Clear explanation of why this rule exists - the problem it solves or value it provides]

<!-- FOR COMPLEX RULES ONLY - Remove this section for Simple rules -->
### Detailed Requirements (Complex Rules Only)

**Core Requirements**:
1. **[Requirement 1]**: [Detailed specification]
   - [Sub-requirement or clarification]
   - [Specific implementation detail]

2. **[Requirement 2]**: [Detailed specification]
   - [Sub-requirement or clarification]
   - [Specific implementation detail]

**Implementation Guidelines**:
- [Specific guidance on how to implement]
- [Best practices for this rule]
- [Common pitfalls to avoid]

**Edge Cases**:
- **Scenario**: [Edge case description]
  - **Handling**: [How to apply rule in this case]
- **Scenario**: [Another edge case]
  - **Handling**: [Appropriate response]

### Validation

**Manual Checks**:
- [ ] [Validation step 1]
- [ ] [Validation step 2]
- [ ] [Validation step 3] <!-- Add more as needed -->

**Automated Validation** (if applicable):
- **Tool**: [Specific tool, command, or script]
- **Trigger**: [When validation occurs]
- **Command**: `[specific command to run]`

**Success Criteria**:
- [Measurable outcome that indicates compliance]
- [Another success indicator]

### Integration with SuperClaude

**Affected Commands**:
- `/analyze` - Must validate findings with evidence before reporting conclusions
- `/implement` - Requires framework compatibility check before code generation
- `/optimize` - Must measure baseline performance before applying optimizations

**MCP Server Integration**:
- Context7: Must verify library versions match project dependencies
- Sequential: Analysis results must include confidence scores and evidence sources
- Magic: Generated components must follow existing design system patterns
- Playwright: Test results must include reproducible steps and environment details

**Orchestration Considerations**:
- Multi-agent operations must maintain context consistency across agents
- Delegation triggers must include confidence thresholds and fallback strategies
- Result aggregation must validate compatibility before combining outputs

### Practical Rule Applications

**File Operation Security Rule Example**:
```python
def validate_file_operation_rule(operation: str, file_path: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Validate file operations follow security rules"""
    
    # Rule: Always use Read tool before Write or Edit operations
    if operation in ['Write', 'Edit'] and not context.get('read_performed'):
        return {
            "rule_violated": True,
            "rule_name": "read_before_write",
            "severity": "high",
            "action": "block_operation",
            "message": "Must read file contents before modification"
        }
    
    # Rule: Use absolute paths only
    if not os.path.isabs(file_path):
        return {
            "rule_violated": True,
            "rule_name": "absolute_paths_only",
            "severity": "medium",
            "action": "convert_path",
            "suggested_path": os.path.abspath(file_path)
        }
    
    # Rule: Validate path traversal prevention
    if '..' in file_path or file_path.startswith('/'):
        normalized_path = os.path.normpath(file_path)
        if not normalized_path.startswith(context.get('project_root', '')):
            return {
                "rule_violated": True,
                "rule_name": "prevent_path_traversal",
                "severity": "critical",
                "action": "block_operation",
                "message": "Path traversal detected, operation blocked"
            }
    
    return {"rule_violated": False, "validation_passed": True}

def enforce_framework_compliance_rule(operation: Dict[str, Any]) -> Dict[str, Any]:
    """Enforce framework compliance rules"""
    
    # Rule: Check package.json/requirements.txt before using libraries
    if operation.get('requires_library'):
        library_name = operation.get('library_name')
        project_dependencies = operation.get('project_dependencies', [])
        
        if library_name not in project_dependencies:
            return {
                "rule_violated": True,
                "rule_name": "library_compatibility_check",
                "severity": "high",
                "action": "request_dependency_addition",
                "message": f"Library {library_name} not found in project dependencies",
                "suggested_action": f"Add {library_name} to package.json or requirements.txt"
            }
    
    # Rule: Follow existing project patterns
    existing_patterns = analyze_project_patterns(operation.get('project_files', []))
    proposed_pattern = operation.get('code_pattern')
    
    pattern_compliance = calculate_pattern_compliance(existing_patterns, proposed_pattern)
    
    if pattern_compliance < 0.7:  # 70% compliance threshold
        return {
            "rule_violated": True,
            "rule_name": "pattern_consistency",
            "severity": "medium",
            "action": "suggest_pattern_adjustment",
            "compliance_score": pattern_compliance,
            "recommended_patterns": get_recommended_patterns(existing_patterns)
        }
    
    return {"rule_violated": False, "compliance_score": pattern_compliance}
```

### Error Handling & Recovery

**Common Violations**:
1. **[Violation Type]**: [Description]
   - **Detection**: [How to identify this violation]
   - **Impact**: [Consequences of violation]
   - **Resolution**: [How to fix]

2. **[Violation Type]**: [Description]
   - **Detection**: [How to identify]
   - **Impact**: [What happens if violated]
   - **Resolution**: [Remediation steps]

**Recovery Procedures**:
1. [Step 1 for recovering from rule violation]
2. [Step 2 for remediation]
3. [Step 3 for prevention]

### Exceptions & Flexibility

**Allowed Exceptions**:
- **Context**: [When exception might be appropriate]
- **Approval**: [Who can authorize exception]
- **Documentation**: [How to document the exception]

**Flexibility Guidelines**:
- [Where interpretation is allowed]
- [How to make judgment calls]
- [Escalation path for unclear cases]

### Related Rules & Standards

**Dependencies**:
- **Requires**: [Other rules that must be followed first]
- **Enhances**: [Rules this builds upon]

**Conflicts**:
- **Incompatible with**: [Rules that cannot coexist]
- **Resolution**: [How to handle conflicts]

**See Also**:
- [Related rule or standard]
- [Complementary guideline]
- [Relevant documentation section]

### Metrics & Monitoring

**Compliance Metrics**:
- **Metric**: [What to measure]
  - **Target**: [Desired value or threshold]
  - **Measurement**: [How to calculate]

**Monitoring Approach**:
- **Frequency**: [How often to check]
- **Method**: [Automated/Manual/Both]
- **Reporting**: [Where results are tracked]

### Documentation Requirements

**Required Documentation**:
- [What must be documented when following this rule]
- [Format or template to use]
- [Where documentation should be stored]

**Example Documentation**:
```markdown
Rule Compliance: [Rule Name]
- Implementation: [How rule was applied]
- Validation: [Checks performed]
- Exceptions: [Any exceptions taken]
```

---

<!--
CHECKLIST BEFORE SUBMITTING:
- [ ] Rule statement is clear and unambiguous
- [ ] Appropriate complexity level selected
- [ ] Examples demonstrate both correct and incorrect usage
- [ ] Rationale is compelling and evidence-based
- [ ] Validation criteria are specific and measurable
- [ ] Integration with SuperClaude components documented
- [ ] Error handling covers common scenarios
- [ ] Exceptions are clearly defined
- [ ] Related rules are referenced
- [ ] Added to RULES.md
-->