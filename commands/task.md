---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write]
description: "Long-term project and feature management with multi-session persistence and intelligent breakdown"
---

# /task - Project Task Management

**Purpose**: Manage complex features across Claude Code sessions with persistence and intelligent breakdown  
**Category**: Project Management & Planning  
**Syntax**: `/task $ARGUMENTS`

## Examples

```bash
/task create "Build OAuth authentication" --epic    # Create major feature
/task breakdown oauth-epic-2024-01 --auto          # Auto-decompose into subtasks
/task resume oauth-epic-2024-01                    # Continue after interruption
/task status --dashboard                           # Show project dashboard
/task checkpoint --message "Auth flow complete"    # Save progress state
/task complete oauth-task-003 --summary            # Mark task done with report
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[operation]` - Command operation (create|breakdown|update|status|resume|checkpoint|complete)
- `[task-id]` - Task identifier for operations
- `[title]` - Task title for creation
- `--<flag>` - Operation modifiers and options

### Core Operations

**`create`** - Initialize new project/feature:
- `--epic`: Major feature (weeks/months)
- `--story`: User-facing functionality (days)
- `--task`: Implementation unit (hours)
- `--template [name]`: Use predefined template
- `--assign [user]`: Set assignee

**`breakdown`** - Decompose into subtasks:
- `--auto`: AI-powered decomposition (default)
- `--manual`: Interactive breakdown
- `--depth [n]`: Levels of breakdown
- `--estimate`: Add time estimates

**`update`** - Modify task details:
- `--status [state]`: Change task state
- `--progress [percent]`: Update completion
- `--blocker [description]`: Add blocker
- `--discovery [note]`: Log finding
- `--estimate [time]`: Revise estimate

**`status`** - Show project dashboard:
- `--format [type]`: Display format (dashboard|detailed|kanban|gantt|burndown)
- `--scope [level]`: Filter by scope
- `--period [range]`: Time range for metrics

**`resume`** - Continue after interruption:
- Loads task context and history
- Restores working files state
- Shows progress summary
- Activates relevant todos

**`checkpoint`** - Save progress state:
- `--message [description]`: Checkpoint description
- Creates recoverable save point
- Includes file modifications list
- Git commit reference

**`complete`** - Finalize task:
- `--summary`: Generate completion report
- Marks task as done
- Archives task data
- Updates metrics

### Advanced Operations

- `metrics [task-id]`: View analytics and performance
- `dependencies [task-id]`: Manage task relationships
- `estimate [task-id]`: Time/effort estimation
- `risk [task-id]`: Risk assessment
- `export [task-id] --format [type]`: External integration

### Universal SuperClaude Flags

- `--plan`: Show task management strategy
- `--think`: Analyze task complexity
- `--think-hard`: Deep project analysis
- `--introspect`: Show management reasoning

### Persona Integration

- `--persona-architect`: System design focus
- `--persona-qa`: Quality validation focus
- `--persona-performance`: Optimization focus

### MCP Server Control

- `--seq`: Enable Sequential for planning
- `--c7`: Enable Context7 for patterns
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Task Hierarchy
```
Epic (Weeks/Months)
├── Story (Days/Week)
│   ├── Task (Hours/Day)
│   │   ├── Subtask (Minutes/Hours)
│   │   └── Subtask
│   └── Task
└── Story
```

### Persistence Structure
```
.claude-tasks/
├── tasks/
│   ├── {task-id}.yaml       # Task definition
│   └── {task-id}/           # Task workspace
│       ├── checkpoints/     # Saved states
│       ├── context/         # Working context
│       └── metrics/         # Performance data
├── active.yaml              # Currently active tasks
├── completed/               # Archived tasks
└── config.yaml              # Task system config
```

### TodoWrite Integration
- Task creates → Todo items in current session
- Todo completes → Task progress updates
- Todo blocked → Task blocker logged
- Todo time → Task metrics updated

## Example Workflows

### Creating and Breaking Down Epic

```bash
/task create "Build real-time chat system" --epic

🎯 Created epic: chat-epic-2024-02
📊 Generating breakdown...

Suggested breakdown:
├── Story: User can send/receive messages (8 pts)
│   ├── Task: Design message schema
│   ├── Task: Implement WebSocket server
│   └── Task: Create chat UI component
├── Story: Message persistence (5 pts)
└── Story: User presence system (3 pts)

Accept breakdown? (y/n/edit): y
```

### Resuming After Interruption

```bash
/task resume chat-epic-2024-02

📂 Loading task context...
✅ Restored from checkpoint: 2024-02-14 18:30
📊 Progress: 25% complete (4/16 points)

Creating session todos:
📝 Complete WebSocket connection handling
📝 Add message broadcasting logic
📝 Write WebSocket tests
```

### Sprint Planning

```bash
/task status --format burndown

Points Remaining
40 |█
35 |██
30 |███░ ← Ideal
25 |████░░
20 |█████░░░ ← Actual
15 |██████░░░░
10 |███████░░░░░
 5 |████████░░░░░░
 0 |_________________
   |1 2 3 4 5 6 7 8 9 10
   Sprint Days
```

## Quality Standards

### Task Properties
- **Specific**: Clear, actionable descriptions
- **Measurable**: Definable completion state
- **Atomic**: Single responsibility
- **Relevant**: Contributes to user goal
- **Time-Bound**: Reasonable scope

### Checkpoint Requirements
- Manual: `/task checkpoint <id> --message "Completed auth flow"`
- Automatic: On major completions
- Git-integrated: Creates tagged commits

### Recovery Process
1. Detect incomplete session
2. Load last checkpoint
3. Restore file states
4. Resume todo items
5. Show progress summary

## Integration with SuperClaude

### Intelligent Features
- **Automatic Breakdown**: Smart task decomposition
- **Progress Intelligence**: Git commit association, velocity calculation
- **Smart Estimation**: Historical analysis, complexity points
- **Session Continuity**: Seamless multi-session support

### Quality Assurance
- **Validation Points**: Task completion criteria
- **Metric Tracking**: Time, velocity, burndown
- **Risk Detection**: Blocker tracking, estimation drift
- **Recovery System**: Checkpoint and restore

---

*SuperClaude Enhanced | Long-Term Task Management | Session Persistence*