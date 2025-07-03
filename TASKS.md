# TASKS.md - Task Management & Orchestration Reference

## Overview

The SuperClaude Task Management System provides a comprehensive, multi-layered approach to organizing and tracking work across different scopes and timeframes. From immediate session tasks to complex multi-domain orchestrations, this system ensures efficient workflow management, transparent progress tracking, and intelligent task coordination.

## Core Philosophy

**Task Management Principles**:
- **Evidence-Based Progress**: Track completion with measurable outcomes
- **Single Focus Protocol**: One active task at a time for maximum efficiency
- **Real-Time Updates**: Immediate status changes and user communication
- **Quality Gates**: Validation before marking tasks complete
- **Hierarchical Organization**: From epics to subtasks for clarity

## Three-Layer Architecture

### Layer 1: TodoRead/TodoWrite (Session Tasks)

**Scope**: Immediate tasks within current Claude Code session

**Characteristics**:
- **Persistence**: Session-only (ephemeral)
- **Structure**: Flat list with status tracking
- **States**: pending, in_progress, completed, blocked
- **Capacity**: Typically 3-20 tasks per session
- **Update Frequency**: Real-time, immediate changes

**Use Cases**:
- "Fix bug in login.js"
- "Update README with new API endpoints"
- "Run tests and fix failures"
- "Refactor authentication module"
- "Add error handling to API calls"

**Integration with Claude Code**:
```
TodoRead() → Understand current state
TodoWrite() → Create/update tasks
Mark in_progress → Work on single task
Mark completed → Move to next task
```

**Example Workflow**:
```
User: "Help me fix the login bug and update tests"
Claude: 
1. TodoRead() - Check existing tasks
2. TodoWrite([
   {id: "1", content: "Analyze login bug", status: "pending"},
   {id: "2", content: "Fix authentication logic", status: "pending"},
   {id: "3", content: "Update unit tests", status: "pending"},
   {id: "4", content: "Run test suite", status: "pending"}
])
3. Mark task 1 as in_progress
4. Perform analysis...
```

### Layer 2: /task Command (Project Management)

**Scope**: Features and projects spanning multiple sessions (days to weeks)

**Characteristics**:
- **Persistence**: Cross-session state management
- **Structure**: Hierarchical (Epic → Story → Task → Subtask)
- **Recovery**: State preservation across sessions
- **Planning**: Long-term project organization
- **Integration**: Breaks down into TodoWrite items

**Use Cases**:
- "Build complete authentication system"
- "Refactor database layer to microservices"
- "Implement comprehensive test coverage"
- "Migrate frontend to TypeScript"
- "Create API documentation system"

**Hierarchy Example**:
```
Epic: "E-Commerce Platform MVP" (3 weeks)
├── Story: "User Authentication" (1 week)
│   ├── Task: "Design auth schema" (4 hours)
│   ├── Task: "Implement JWT tokens" (6 hours)
│   ├── Task: "Create login/signup UI" (8 hours)
│   └── Task: "Add OAuth providers" (6 hours)
├── Story: "Product Catalog" (1 week)
│   ├── Task: "Design product model" (3 hours)
│   ├── Task: "Create CRUD APIs" (8 hours)
│   └── Task: "Build catalog UI" (10 hours)
└── Story: "Shopping Cart" (1 week)
    └── ...
```

**Command Usage**:
```
/task create "Build authentication system" --type epic
/task breakdown "Build authentication system"
/task status --scope current
/task complete "Design auth schema"
```

### Layer 3: /spawn Command (Meta-Orchestration)

**Scope**: Complex multi-domain operations requiring tool coordination

**Characteristics**:
- **Persistence**: Execution context with state preservation
- **Structure**: Parallel and sequential task coordination
- **Resource Management**: Optimal tool and MCP server usage
- **Intelligence**: Automatic strategy selection
- **Scale**: Handles massive operations efficiently

**Use Cases**:
- "Analyze entire codebase and generate comprehensive test suite"
- "Perform security audit across all services with fixes"
- "Refactor monolith to microservices with documentation"
- "Optimize performance across full stack"
- "Generate complete API documentation with examples"

**Orchestration Patterns**:
```
/spawn "Comprehensive security audit" --parallel --think-hard
├── Parallel Branch 1: Code Analysis
│   ├── Sequential: Vulnerability scanning
│   ├── Sequential: Dependency audit
│   └── Sequential: Secret detection
├── Parallel Branch 2: Configuration Review
│   ├── Sequential: Server configs
│   └── Sequential: Database security
└── Convergence: Generate report and fixes
```

## Task Detection and Creation

### Automatic Detection Triggers

**Multi-Step Operations** (3+ steps):
- Complex feature implementations
- System-wide refactoring
- Comprehensive debugging sessions
- Performance optimization workflows

**Keyword Triggers**:
- Action verbs: "build", "implement", "create", "fix", "optimize", "refactor"
- Scope indicators: "system", "feature", "comprehensive", "complete", "entire"
- List markers: Numbered lists, bullet points, "and then", "followed by"

**Pattern Recognition**:
```
User: "I need to:
1. Fix the memory leak in the worker
2. Add monitoring for memory usage
3. Create alerts for high memory
4. Document the monitoring setup"

Claude: [Automatically creates 4 tasks with dependencies]
```

### Intelligent Task Creation

**Task Quality Criteria**:
- **Specific**: Clear, actionable description with success criteria
- **Measurable**: Definable completion state
- **Achievable**: Reasonable scope for focused execution
- **Relevant**: Directly contributes to user goal
- **Time-Bound**: Appropriate effort estimation

**Smart Decomposition**:
```
User Request: "Build a user authentication system"
↓
Epic: User Authentication System
├── Story: Backend Authentication
│   ├── Task: Design database schema
│   ├── Task: Implement JWT service
│   ├── Task: Create auth endpoints
│   └── Task: Add rate limiting
├── Story: Frontend Integration
│   ├── Task: Create login form
│   ├── Task: Implement auth context
│   └── Task: Add route guards
└── Story: Testing & Documentation
    ├── Task: Write unit tests
    ├── Task: Create E2E tests
    └── Task: Document API
```

## Task State Management

### State Definitions

**`pending`** 📋
- Not yet started
- All prerequisites available
- Ready for execution
- Clear success criteria defined

**`in_progress`** 🔄
- Currently active (ONE per session)
- Resources allocated
- Work actively proceeding
- Progress being tracked

**`blocked`** 🚧
- Waiting on external dependency
- Requires user input
- Technical blocker encountered
- Clear unblock criteria defined

**`completed`** ✅
- Successfully finished
- Quality gates passed
- Validation complete
- Results verified

**`cancelled`** ❌
- No longer needed
- Scope changed
- Alternative solution found
- Explicitly abandoned

**`deferred`** ⏸️
- Temporarily postponed
- Re-evaluation criteria set
- Priority changed
- Resources unavailable

### State Transition Rules

```
pending → in_progress: When starting work
pending → cancelled: When no longer needed
pending → deferred: When deprioritized

in_progress → completed: When finished successfully
in_progress → blocked: When encountering blocker
in_progress → cancelled: When abandoning work

blocked → in_progress: When unblocked
blocked → cancelled: When permanently blocked

completed → [terminal state]
cancelled → [terminal state]

deferred → pending: When reactivated
deferred → cancelled: When abandoned
```

## Task Workflow Process

### Standard Workflow

1. **Context Assessment**
   ```
   TodoRead() → Understand current state
   Analyze dependencies and prerequisites
   Check available resources
   ```

2. **Task Creation**
   ```
   TodoWrite() with specific, measurable tasks
   Set appropriate priorities
   Define success criteria
   ```

3. **Execution Protocol**
   ```
   Mark single task as in_progress
   Execute with full focus
   Track progress markers
   ```

4. **Progress Updates**
   ```
   Update status immediately
   Communicate blockers clearly
   Report partial progress
   ```

5. **Quality Validation**
   ```
   Run quality gates (lint, test, etc.)
   Verify success criteria
   Check for side effects
   ```

6. **Task Completion**
   ```
   Mark as completed only after validation
   Update user on outcomes
   Identify follow-up tasks
   ```

### Advanced Patterns

#### Dependency Management

**Sequential Dependencies**:
```
Task A: Create database schema
    ↓ (must complete before)
Task B: Generate models from schema
    ↓ (must complete before)
Task C: Create API endpoints
```

**Parallel Opportunities**:
```
Task Group 1: Frontend components
Task Group 2: Backend services
Task Group 3: Documentation
(All can proceed simultaneously)
```

**Conditional Dependencies**:
```
Task A: Run performance test
    ├── If pass → Task B: Deploy to staging
    └── If fail → Task C: Optimize code
```

#### Resource Optimization

**Tool Coordination**:
- Batch file operations for efficiency
- Parallel tool calls when possible
- Smart caching of results
- Reuse analysis outputs

**MCP Server Management**:
- Activate servers based on task needs
- Coordinate multiple servers
- Manage token budgets
- Optimize response times

#### Recovery Strategies

**State Persistence**:
- Save progress at checkpoints
- Document completion markers
- Maintain context across sessions
- Enable work resumption

**Error Recovery**:
- Automatic retry with backoff
- Fallback strategies
- Rollback capabilities
- Clear error reporting

## Integration Examples

### With Native Tools

```python
# Task-driven file operations
TodoWrite([{"content": "Refactor auth module", "status": "in_progress"}])
files = Glob("src/auth/**/*.js")
for file in files:
    content = Read(file)
    # Refactoring logic
    Edit(file, old_string, new_string)
TodoWrite([{"content": "Refactor auth module", "status": "completed"}])
```

### With Slash Commands

```bash
# Breaking down large task
/task create "Implement payment system" --type epic
/analyze payment-providers --think
TodoWrite([
    {"content": "Research payment providers"},
    {"content": "Design payment flow"},
    {"content": "Implement Stripe integration"}
])
```

### With MCP Servers

```python
# Orchestrated UI development
/spawn "Create admin dashboard" --magic --seq
├── Sequential: Analyze requirements
├── Magic: Generate UI components
├── Sequential: Integrate with backend
└── Puppeteer: E2E testing
```

## Best Practices

### Task Creation

1. **Right-Size Tasks**:
   - Session tasks: 5-60 minutes
   - Project tasks: 1-8 hours
   - Stories: 1-5 days
   - Epics: 1-4 weeks

2. **Clear Success Criteria**:
   - "Fix login bug" ❌
   - "Fix login timeout bug: users can log in within 2 seconds" ✅

3. **Dependency Awareness**:
   - Identify blockers upfront
   - Plan parallel work
   - Document prerequisites

### Progress Tracking

1. **Immediate Updates**:
   - Change status as soon as state changes
   - Don't batch status updates
   - Communicate blockers immediately

2. **Evidence-Based Completion**:
   - Run tests before marking complete
   - Verify quality gates pass
   - Document what was done

3. **User Communication**:
   - Regular progress updates
   - Clear blocker explanations
   - Next step visibility

### Common Patterns

#### Pattern: Feature Development
```
1. TodoRead() - Check current state
2. Create feature epic with /task
3. Break down into stories
4. For each story:
   a. Create TodoWrite tasks
   b. Execute systematically
   c. Validate and test
   d. Update project status
```

#### Pattern: Bug Investigation
```
1. Create investigation task
2. Gather symptoms
3. Form hypotheses
4. Test each hypothesis
5. Implement fix
6. Verify resolution
```

#### Pattern: Refactoring
```
1. Analyze current structure
2. Design target architecture
3. Create incremental tasks
4. Refactor in small steps
5. Maintain test coverage
6. Validate improvements
```

## Troubleshooting

### Common Issues

**Too Many Tasks**:
- Problem: Cognitive overload
- Solution: Group into stories, defer non-critical

**Stuck in Blocked**:
- Problem: Unclear unblock criteria
- Solution: Define specific unblock actions

**Tasks Too Large**:
- Problem: Never complete
- Solution: Break into subtasks

**Lost Context**:
- Problem: Session ends, work lost
- Solution: Use /task for persistence

### Recovery Procedures

**Session Crash**:
```
1. /task status --recent
2. TodoRead() new session
3. Resume from last checkpoint
4. Update task states
```

**Scope Change**:
```
1. Cancel obsolete tasks
2. Create new tasks for new scope
3. Update project structure
4. Communicate changes
```

## Advanced Topics

### Task Metrics

**Tracking Efficiency**:
- Time per task completion
- Blocked time analysis
- Rework frequency
- Success rate

**Quality Indicators**:
- Tasks requiring rework
- Validation failures
- User satisfaction
- Code quality metrics

### Automation Opportunities

**Smart Task Creation**:
- Learn from patterns
- Suggest task breakdowns
- Estimate durations
- Identify dependencies

**Predictive Management**:
- Forecast blockers
- Suggest optimizations
- Resource allocation
- Risk assessment

---

*TASKS.md - SuperClaude Framework v3.0 | Comprehensive Task Management for Maximum Productivity*

**Purpose**: Enable Claude Code to efficiently manage work across all scopes, from immediate actions to complex orchestrations, ensuring transparent progress tracking and successful delivery of user objectives.