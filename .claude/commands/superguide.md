# SuperClaude Navigation Assistant

**Purpose**: Intelligent discovery and guidance system for SuperClaude's 19 commands and 9 personas

**Action**: Guide[SuperClaude Navigation] in $ARGUMENTS

---

## Command Execution

Execute immediately with optional `--plan` to preview guidance first.

**Legend**:
- `[mode]` - Navigation mode: discover, persona, workflow, examples, quick, interactive
- `[context]` - Your goal or current task (e.g., "add authentication", "fix bugs")
- `[flags]` - Optional persona or thinking flags

---

## Primary Modes

### Discovery Mode: `--discover`
Find the right SuperClaude commands for your specific goal.

**Syntax**: `/superguide --discover "[your goal]"`

**Goal Detection**:
- **Authentication/Security** → `/build --security --persona-security`
- **Testing/QA** → `/test --coverage --persona-qa`
- **Frontend/UI** → `/build --react --magic --persona-frontend`
- **Backend/API** → `/build --api --persona-backend`
- **Performance** → `/analyze --perf --persona-performance`
- **Architecture** → `/design --api --ddd --persona-architect`

### Persona Mode: `--persona`
Interactive persona selection and matching guide.

**Syntax**: `/superguide --persona`

**Persona Matching**:
1. **System Design** → `--persona-architect` (Systems thinking, scalability)
2. **User Experience** → `--persona-frontend` (UI/UX obsessed, accessibility)
3. **Server Logic** → `--persona-backend` (APIs, databases, reliability)
4. **Investigation** → `--persona-analyzer` (Root cause analysis, evidence-based)
5. **Security** → `--persona-security` (Threat modeling, zero-trust, OWASP)
6. **Learning** → `--persona-mentor` (Teaching, guided learning, clarity)
7. **Code Quality** → `--persona-refactorer` (Code quality, maintainability)
8. **Performance** → `--persona-performance` (Optimization, profiling, efficiency)
9. **Testing** → `--persona-qa` (Testing, edge cases, validation)

### Workflow Mode: `--workflow`
Complete multi-phase development workflows.

**Syntax**: `/superguide --workflow "[scenario]"`

**New Feature Workflow**:
1. `/design --feature --persona-architect` - Architecture planning
2. `/build --feature --tdd --persona-frontend` - Implementation with TDD
3. `/test --coverage --persona-qa` - Comprehensive testing
4. `/review --comprehensive --persona-refactorer` - Quality review
5. `/deploy --staging --persona-backend` - Staging deployment

**Bug Fix Workflow**:
1. `/analyze --bug --persona-analyzer` - Root cause analysis
2. `/troubleshoot --systematic --persona-analyzer` - Systematic debugging
3. `/build --fix --persona-refactorer` - Implement fix
4. `/test --regression --persona-qa` - Regression testing

### Examples Mode: `--examples`
Real usage examples for specific commands.

**Syntax**: `/superguide --examples [command]`

**Popular Combinations**:
- `/build --react --magic --persona-frontend`
- `/analyze --security --vulnerability --persona-security`
- `/test --e2e --coverage --persona-qa`
- `/review --comprehensive --persona-refactorer`

### Quick Mode: `--quick`
Fast reference for all commands and personas.

**Syntax**: `/superguide --quick`

**Command Categories**:
- **Development (3)**: build, dev-setup, test
- **Analysis (5)**: review, analyze, troubleshoot, improve, explain
- **Operations (6)**: deploy, migrate, scan, estimate, cleanup, git
- **Design (1)**: design
- **Workflow (4)**: spawn, document, load, task

---

## Advanced Flags

### Thinking Flags
- `--think` - Standard analysis depth
- `--think-hard` - Deep analysis with multiple perspectives
- `--ultrathink` - Maximum analysis with comprehensive coverage

### Context Flags
- `--project-type` - Auto-detect project framework (React, API, CLI, etc.)
- `--goal-based` - Match commands to your specific objective
- `--persona-match` - Recommend optimal persona for task

### Interactive Flags
- `--guided` - Step-by-step guided discovery
- `--wizard` - Interactive command builder
- `--learn` - Educational mode with explanations

---

## Methodology

### Evidence-Based Discovery
1. **Context Analysis**: Detect project type, current files, and development stage
2. **Goal Mapping**: Match user objectives to SuperClaude command capabilities
3. **Persona Recommendation**: Suggest optimal cognitive approach for task
4. **Workflow Assembly**: Combine commands into logical development sequences

### Adaptive Guidance
- **Beginner Mode**: Start with basic command introductions
- **Intermediate Mode**: Show command combinations and workflows
- **Expert Mode**: Advanced flag combinations and optimization patterns

### Learning Integration
- **Pattern Recognition**: Learn from successful command combinations
- **Context Awareness**: Remember project-specific preferences
- **Progressive Disclosure**: Gradually introduce advanced features

---

## Integration Points

### Persona Integration
Works seamlessly with all 9 SuperClaude personas:
- Automatically suggests best persona for detected goals
- Explains persona strengths and focus areas
- Shows persona-specific flag combinations

### Command Synergy
- **Sequential Workflows**: Chain commands for complete development cycles
- **Parallel Operations**: Multiple analysis modes simultaneously
- **Conditional Logic**: Dynamic command selection based on results

### Framework Awareness
- **Technology Detection**: React, Vue, Python, Rust, Java auto-detection
- **Stack Recommendations**: Framework-specific command suggestions
- **Best Practices**: Technology-appropriate workflow patterns

---

## Usage Examples

**Goal-Based Discovery**:
```
/superguide --discover "add user authentication"
→ Recommends: /build --security --persona-security
→ Follow-up: /scan --security --persona-security
```

**Interactive Persona Selection**:
```
/superguide --persona --guided
→ Asks: "What's your primary focus?"
→ Provides: Persona quiz with explanations
```

**Complete Workflow Planning**:
```
/superguide --workflow "new API feature" --think
→ Returns: 6-step development workflow
→ Each step: Command + persona + rationale
```

**Quick Command Reference**:
```
/superguide --quick --persona-qa
→ Shows: All commands filtered for QA workflows
→ Focus: Testing, validation, quality assurance
```

---

## Advanced Use Cases

### Multi-Project Guidance
- **Project Templates**: Common patterns for different project types
- **Technology Stacks**: Framework-specific command recommendations
- **Team Workflows**: Role-based command filtering

### Learning Progression
- **Onboarding Path**: New user → intermediate → expert progression
- **Skill Building**: Persona-specific learning tracks
- **Best Practices**: Evidence-based methodology integration

### Optimization Patterns
- **Command Efficiency**: Most effective flag combinations
- **Workflow Optimization**: Streamlined development processes
- **Context Switching**: Smooth transitions between different development phases

---

**Next Steps**: Use `/superguide --discover "[your current goal]"` to get started with contextual command recommendations.