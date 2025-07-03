---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Evidence-based time and complexity estimation for development tasks with multiple methodologies"
---

# /estimate - Project Estimation & Planning

**Purpose**: Provide comprehensive time, complexity, and resource estimates for development tasks  
**Category**: Planning & Management  
**Syntax**: `/estimate $ARGUMENTS`

## Examples

```bash
/estimate "user authentication"                  # Quick feature estimation
/estimate @src/ --refactor --method points      # Refactoring estimation with story points
/estimate --project --team 3 --think            # Full project with team size consideration
/estimate @docs/requirements.md --comprehensive  # Detailed estimation from requirements
/estimate !git log --historical                 # Use git history for calibration
/estimate "API redesign" --confidence high      # High-confidence estimate
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[description]` - Task or project description for estimation
- `@<path>` - Analyze specific files/directories for scope
- `!<command>` - Execute command for additional context (git log, code stats)
- `--<flag>` - Estimation methodology and configuration

### Estimation Types

- `--feature`: Single feature or user story (default)
- `--project`: Full project scope with multiple components
- `--refactor`: Code refactoring and technical debt
- `--migration`: Data or system migration effort
- `--performance`: Performance optimization work

### Methodologies

- `--method three-point`: PERT-based estimation (default)
- `--method story-points`: Agile story point estimation
- `--method tshirt`: T-shirt sizing (XS/S/M/L/XL)
- `--method hours`: Direct hour estimation

### Team Context

- `--team [size]`: Team size (1, 2-3, 4-8, 9+)
- `--experience [level]`: Team experience (junior|mixed|senior)
- `--velocity [points/week]`: Historical team velocity

### Output Options

- `--confidence [level]`: Required confidence (low|medium|high)
- `--format [type]`: Output format (summary|detailed|gantt)
- `--historical`: Use git history for calibration
- `--breakdown`: Show task-level breakdown

### Universal SuperClaude Flags

- `--plan`: Show estimation methodology before execution
- `--think`: Analyze complexity factors (~4K tokens)
- `--think-hard`: Deep project analysis (~10K tokens)
- `--introspect`: Show estimation reasoning process

### Persona Integration

- `--persona-analyzer`: Evidence-based complexity analysis
- `--persona-architect`: System-level estimation
- `--persona-mentor`: Educational estimation breakdown

### MCP Server Control

- `--c7`: Enable Context7 for technology research
- `--seq`: Enable Sequential for complex analysis
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Scope Analysis
1. **Input Processing**: Parse task description or analyze @files
2. **Complexity Detection**: Identify technical challenges
3. **Dependency Mapping**: Find external dependencies
4. **Risk Identification**: Spot potential blockers

### Phase 2: Estimation Calculation
1. **Methodology Application**: Apply chosen estimation method
2. **Historical Calibration**: Use past project data if available
3. **Risk Adjustment**: Factor in identified risks
4. **Team Factors**: Apply team size and experience multipliers

### Phase 3: Output Generation
1. **Confidence Intervals**: Calculate estimate ranges
2. **Task Breakdown**: Create work breakdown structure
3. **Timeline Creation**: Generate realistic schedules
4. **Risk Documentation**: List assumptions and risks

## Estimation Methods

### Three-Point Estimation

**PERT Formula**: `(Optimistic + 4×Realistic + Pessimistic) / 6`

```bash
📊 Three-Point Estimate
━━━━━━━━━━━━━━━━━━━━━━
⚡ Optimistic: 3 days (everything goes perfectly)
🎯 Realistic: 5 days (normal development)
⚠️ Pessimistic: 10 days (significant issues)

📈 Expected: 5.5 days
📊 Std Dev: 1.2 days
✅ 68% confidence: 4.3 - 6.7 days
✅ 95% confidence: 3.1 - 7.9 days
```

### Story Points

**Fibonacci Scale**: 1, 2, 3, 5, 8, 13, 21, 34

```bash
🎯 Story Point Estimation
━━━━━━━━━━━━━━━━━━━━━━━━
📊 Complexity Analysis:
├─ Technical: 5 points (new API design)
├─ Effort: 3 points (standard implementation)
├─ Risk: 3 points (external dependencies)
└─ Testing: 2 points (unit + integration)

🎯 Total: 13 story points
⏱️ Velocity: 20 points/sprint
📅 Duration: ~3 days
```

### T-Shirt Sizing

**Quick High-Level Estimates**:
```bash
👕 T-Shirt Size: LARGE
━━━━━━━━━━━━━━━━━━━━━
📏 Typical range: 2-4 weeks
👥 Team needed: 2-3 developers
🎯 Confidence: Medium
📊 Similar projects: Authentication (L), Payment Integration (L)
```

## Risk Factors

### Technical Risks
```bash
⚠️ Risk Assessment
━━━━━━━━━━━━━━━━━━━
🆕 New Technology: +25% time (team learning curve)
🔌 Integrations: +15% time (3rd party APIs)
⚡ Performance: +20% time (optimization needed)
🔒 Security: +10% time (security review required)

📊 Total Risk Factor: 1.7x
🎯 Adjusted Estimate: 8.5 days → 14.5 days
```

### Team Factors
- **Solo**: 1.0x (no coordination overhead)
- **Small (2-3)**: 0.9x (minimal overhead)
- **Medium (4-8)**: 0.7x (coordination required)
- **Large (9+)**: 0.5x (significant overhead)

## Example Workflows

### Quick Feature Estimation
```bash
/estimate "add user notifications"

🔍 Analyzing feature scope...
📊 Complexity: Medium (existing patterns available)
⚡ Dependencies: 2 (user service, email service)

📈 Estimation Results:
├─ Backend API: 2 days
├─ Frontend UI: 1.5 days
├─ Testing: 1 day
└─ Integration: 0.5 days

🎯 Total: 5 days (±1.5 days)
✅ Confidence: 75%
```

### Project Estimation with Breakdown
```bash
/estimate --project --breakdown --team 4

📋 Project Estimation
━━━━━━━━━━━━━━━━━━━━━━
🎯 E-commerce Platform MVP

📊 Component Breakdown:
├─ Authentication System
│  ├─ User management: 8 points
│  ├─ OAuth integration: 13 points
│  └─ Security audit: 5 points
├─ Product Catalog
│  ├─ CRUD operations: 5 points
│  ├─ Search/filter: 8 points
│  └─ Image handling: 5 points
└─ Shopping Cart
   ├─ Cart logic: 8 points
   ├─ Checkout flow: 13 points
   └─ Payment integration: 21 points

📈 Total: 86 story points
👥 Team velocity: 30 points/sprint
📅 Duration: ~3 sprints (6 weeks)

⚠️ Risks:
├─ Payment gateway complexity (high)
├─ Team new to framework (medium)
└─ Changing requirements (medium)

🎯 Final Estimate: 6-9 weeks
✅ Confidence: 70%
```

### Historical Calibration
```bash
/estimate "refactor authentication" --historical

📊 Historical Analysis
━━━━━━━━━━━━━━━━━━━━━
🔍 Similar past tasks found:
├─ "Refactor user service" - Est: 5d, Actual: 7d (+40%)
├─ "Update auth flow" - Est: 3d, Actual: 4d (+33%)
└─ "Security overhaul" - Est: 8d, Actual: 10d (+25%)

📈 Average overrun: +33%

🎯 Base estimate: 4 days
📊 Calibrated estimate: 5.3 days
✅ Confidence: 85% (based on 3 data points)
```

### Migration Estimation
```bash
/estimate --migration @database/schema.sql

🗄️ Database Migration Estimation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Scope Analysis:
├─ Tables: 47
├─ Total records: ~2.3M
├─ Complexity: High (stored procedures, triggers)
└─ Downtime tolerance: None

📋 Phase Breakdown:
├─ Schema analysis: 2 days
├─ Migration scripts: 5 days
├─ Testing environment: 3 days
├─ Data validation: 2 days
├─ Rollback planning: 1 day
├─ Performance testing: 3 days
└─ Production migration: 2 days

🎯 Total: 18 days
⚠️ Risk buffer: +30% (5.4 days)
📅 Final estimate: 23.4 days

✅ Recommended: Phased approach over 4 weekends
```

## Output Formats

### Executive Summary
```bash
📊 EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━
Project: User Dashboard Redesign
Duration: 4-6 weeks
Team: 3 developers
Budget: $45K - $67K

✅ Deliverables:
• Modern responsive UI
• Performance improvements
• Accessibility compliance

⚠️ Key Risks:
• Legacy code integration
• Third-party API changes

🎯 Confidence: 75%
```

### Gantt Chart Format
```bash
/estimate --project --format gantt

📅 Project Timeline
━━━━━━━━━━━━━━━━━━━━━
Week 1-2:  [████████] Planning & Design
Week 3-4:  [████████] Core Development
Week 5-6:  [████████] Feature Implementation
Week 7:    [████] Integration
Week 8:    [████] Testing & Deployment

Critical Path:
Planning → Core Dev → Integration → Launch
```

## Integration with SuperClaude

### Intelligent Estimation
- **Pattern Recognition**: Learn from historical estimates
- **Context-Aware**: Framework and technology factors
- **Risk Calibration**: Evidence-based risk assessment
- **Continuous Learning**: Improve accuracy over time

### Automated Workflows
- **TodoWrite Integration**: Break down into trackable tasks
- **Progress Monitoring**: Compare actual vs estimated
- **Velocity Tracking**: Update team metrics
- **Report Generation**: Stakeholder communications

---

*SuperClaude Enhanced | Evidence-Based Estimation | Data-Driven Planning*