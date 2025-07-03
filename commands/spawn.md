---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, Task]
description: "Intelligent task orchestration for complex multi-step requests with automatic decomposition"
---

# /spawn - Task Orchestration Engine

**Purpose**: Decompose complex requests into coordinated subtasks with intelligent execution  
**Category**: Orchestration & Workflow  
**Syntax**: `/spawn $ARGUMENTS`

## Examples

```bash
/spawn "Build complete authentication system"     # Auto-decompose and execute
/spawn --parallel "Implement CRUD operations"     # Parallel execution
/spawn --sequential "Migrate database schema"     # Sequential with dependencies
/spawn @requirements.md --plan                    # Plan from requirements doc
/spawn !npm test --fix-failures                   # Run tests and fix issues
/spawn "Refactor codebase" --validate            # With quality checkpoints
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[request]` - Complex task or project to orchestrate
- `@<path>` - Read requirements/specs from file
- `!<command>` - Execute command and orchestrate based on output
- `--<flag>` - Orchestration mode and options

### Orchestration Modes

- `--sequential`: Execute tasks in dependency order (default)
- `--parallel`: Execute independent tasks concurrently
- `--collaborative`: Share context between tasks
- `--adaptive`: Dynamic mode optimization

### Decomposition Control

- `--auto-decompose`: Automatic task breakdown (default)
- `--manual-decompose`: Interactive breakdown approval
- `--depth [n]`: Decomposition levels (1-5, default: 3)
- `--max-tasks [n]`: Maximum subtasks to create

### Quality & Validation

- `--validate`: Enable quality checkpoints
- `--checkpoint [interval]`: Create state snapshots
- `--rollback`: Enable rollback on failures
- `--dry-run`: Show plan without execution

### Resource Optimization

- `--optimize-tools`: Smart tool selection
- `--token-budget [n]`: Set token limit
- `--resource-pool`: Share resources between tasks
- `--preserve-context`: Full context handoff

### Universal SuperClaude Flags

- `--plan`: Show orchestration plan first
- `--think`: Standard analysis (4K tokens)
- `--think-hard`: Deep analysis (10K tokens)
- `--ultrathink`: Maximum depth (32K tokens)
- `--introspect`: Show orchestration reasoning

### Persona Integration

- `--persona-architect`: System design focus
- `--persona-qa`: Quality validation focus
- `--persona-performance`: Optimization focus

### MCP Server Control

- `--seq`: Enable Sequential for complex planning
- `--c7`: Enable Context7 for best practices
- `--magic`: Enable Magic for UI tasks
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Task Analysis
1. **Request Parsing**: Extract objectives and requirements
2. **Complexity Assessment**: Evaluate scope and dependencies
3. **Domain Recognition**: Identify expertise areas needed
4. **Resource Planning**: Estimate tools and tokens needed

### Phase 2: Decomposition
1. **Hierarchical Breakdown**: Create subtask tree
2. **Dependency Analysis**: Map task relationships
3. **Priority Assignment**: Order by importance/dependencies
4. **Resource Allocation**: Assign tools to subtasks

### Phase 3: Orchestration
1. **Execution Strategy**: Choose optimal mode
2. **Context Management**: Handle information flow
3. **Progress Tracking**: Monitor completion
4. **Result Integration**: Combine outputs

## Task Decomposition

### Automatic Analysis

```bash
🎯 Primary Task: "Build user authentication"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Decomposition Analysis:
├─ Complexity: High (4 major components)
├─ Dependencies: Sequential required
├─ Expertise: Backend, Frontend, Security
└─ Estimated subtasks: 12-15

📋 Proposed Structure:
├─ Phase 1: Research & Design (3 tasks)
│  ├─ Security requirements analysis
│  ├─ Framework selection research
│  └─ API design documentation
├─ Phase 2: Backend Implementation (4 tasks)
│  ├─ Database schema creation
│  ├─ Authentication logic
│  ├─ API endpoints
│  └─ Token management
├─ Phase 3: Frontend Integration (3 tasks)
│  ├─ Login UI components
│  ├─ Authentication flow
│  └─ Error handling
└─ Phase 4: Testing & Documentation (3 tasks)
   ├─ Unit tests
   ├─ Integration tests
   └─ API documentation

🎯 Ready to execute? (y/n)
```

### Dependency Management

```bash
📊 Task Dependencies
━━━━━━━━━━━━━━━━━━━
┌─[Research]
│  └─>[Design]
│     ├─>[Backend]
│     │  └─>[API Tests]
│     └─>[Frontend]
│        └─>[E2E Tests]
└─────────>[Documentation]

⚡ Parallel Opportunities:
- Backend & Frontend (after Design)
- Unit & Integration tests
- Docs can start early
```

## Execution Modes

### Sequential Execution

```bash
/spawn --sequential "Implement payment system"

🎯 Sequential Orchestration Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Task 1/4: Payment Provider Research
⏱️ Starting...
✅ Completed: Stripe selected, docs analyzed

📋 Task 2/4: Backend Implementation
📝 Context from Task 1: Stripe API patterns
⏱️ Starting...
- Database models created
- Payment service implemented
- Webhook handlers added
✅ Completed: Backend ready

📋 Task 3/4: Frontend Integration
📝 Context from Task 2: API endpoints, data models
⏱️ Starting...
- Payment form components
- Checkout flow implemented
✅ Completed: UI integrated

📋 Task 4/4: Testing & Security
📝 Full implementation context available
⏱️ Starting...
- Payment flow tests
- Security audit passed
✅ Completed: Ready for production

📦 Integration Summary:
- All tasks completed successfully
- 15 files created/modified
- Test coverage: 89%
- Security scan: Passed
```

### Parallel Execution

```bash
/spawn --parallel "Build admin dashboard"

⚡ Parallel Orchestration Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Executing 4 parallel streams:

Stream A: User Management UI     [████████░░] 80%
Stream B: Analytics Dashboard    [██████████] 100% ✅
Stream C: Settings Interface     [███████░░░] 70%
Stream D: API Integration       [██████████] 100% ✅

📊 Resource Usage:
- Active workers: 4/4
- Token usage: 45%
- Tool conflicts: 0

🔄 Synchronization point reached...
📦 Integrating results...

✅ Parallel execution complete:
- Time saved: 65% vs sequential
- No conflicts detected
- All tests passing
```

### Collaborative Execution

```bash
/spawn --collaborative "Design microservices architecture"

🤝 Collaborative Orchestration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Shared Context Pool:
- Requirements document
- Technology constraints
- Team decisions log

👥 Active Collaborators:
- Architect: System design
- Backend: Service boundaries
- DevOps: Deployment strategy
- Security: Auth approach

🔄 Round 1: Service Identification
├─ Architect: Proposed 5 services
├─ Backend: Suggested modifications
├─ DevOps: Deployment concerns
└─ Consensus: 6 services defined

🔄 Round 2: API Design
├─ Collaborative API schema design
├─ Cross-service communication
└─ Consensus: REST + events

📦 Collaborative Results:
- Architecture document
- Service specifications
- API contracts
- Deployment manifests
```

## Advanced Features

### Adaptive Optimization

```bash
/spawn --adaptive "Complete project sprint tasks"

🎨 Adaptive Orchestration Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Initial Analysis:
- 8 tasks identified
- Mixed dependencies detected
- Optimization potential: High

🔄 Execution Strategy:
Phase 1: Parallel (3 independent tasks)
Phase 2: Sequential (2 dependent tasks)
Phase 3: Parallel (3 final tasks)

⚡ Real-time Optimization:
- Task 3 completed early → reallocating resources
- Dependency resolved → converting to parallel
- Performance gain: +40% throughput

✅ Adaptive execution complete:
- Original estimate: 4 hours
- Actual time: 2.4 hours
- Optimization success: 40%
```

### Quality Checkpoints

```bash
/spawn --validate --checkpoint 3 "Refactor authentication module"

🛡️ Quality-Assured Orchestration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Checkpoint 1: After analysis
  - Requirements validated
  - Design approved
  - Resources allocated

✓ Checkpoint 2: After implementation
  - Code quality: Pass
  - Tests written: Yes
  - Coverage: 92%

✓ Checkpoint 3: After integration
  - Integration tests: Pass
  - Performance: Improved
  - Security scan: Clean

📊 Quality Metrics:
- All checkpoints passed
- Zero rollbacks needed
- Quality score: 9.2/10
```

### Resource Optimization

```bash
/spawn --optimize-tools --token-budget 5000 "Analyze and fix bugs"

📊 Resource-Optimized Orchestration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 Tool Allocation:
- Read/Grep: Shared pool (3 instances)
- Bash: Dedicated for testing
- Edit: Queued access
- TodoWrite: Centralized tracking

💰 Token Budget Management:
- Allocated: 5000 tokens
- Phase 1: 1200 tokens (analysis)
- Phase 2: 2500 tokens (fixes)
- Phase 3: 800 tokens (validation)
- Reserve: 500 tokens

✅ Optimization Results:
- Token usage: 4,650/5,000 (93%)
- Tool conflicts: 0
- Execution time: -35% vs standard
```

## Integration Patterns

### Task Tool Integration

```bash
/spawn "Build complete feature" --plan

📋 Orchestration Plan:
1. /analyze @src/ --architecture
2. /build @components/ --parallel
3. /test --comprehensive
4. /document --api --automatic

🔄 Integrated Execution:
- Each task maintains context
- Results flow between tasks
- Unified progress tracking
- Single status report
```

### Complex Project Example

```bash
/spawn "Migrate monolith to microservices" --ultrathink --validate

🧠 Ultra-Deep Orchestration Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Project Scope:
- 50,000 lines of code
- 6 proposed services
- 3-month timeline
- Zero-downtime requirement

📋 Master Orchestration Plan:
Phase 1: Analysis & Planning (15 subtasks)
Phase 2: Service Extraction (30 subtasks)
Phase 3: Integration Layer (20 subtasks)
Phase 4: Data Migration (25 subtasks)
Phase 5: Cutover & Validation (10 subtasks)

Total: 100 coordinated subtasks
Estimated: 2,500 development hours

🎯 Proceed with execution? (y/n)
```

## Integration with SuperClaude

### Intelligent Orchestration
- **Automatic Decomposition**: Smart task breakdown
- **Dependency Resolution**: Optimal execution order
- **Resource Optimization**: Efficient tool usage
- **Context Preservation**: Seamless information flow

### Quality Assurance
- **Validation Checkpoints**: Built-in quality gates
- **Progress Tracking**: Real-time monitoring
- **Error Recovery**: Automatic rollback
- **Result Verification**: Output validation

---

*SuperClaude Enhanced | Intelligent Task Orchestration | Complex Workflow Automation*