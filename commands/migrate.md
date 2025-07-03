---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write]
description: "Comprehensive database, code, API, and data migration management with framework awareness"
---

# /migrate - Migration Management System

**Purpose**: Execute database schemas, code refactoring, API versions, and data migrations with safety and rollback  
**Category**: Deployment & Operations  
**Syntax**: `/migrate $ARGUMENTS`

## Examples

```bash
/migrate                                    # Auto-detect and run pending migrations
/migrate database --plan                    # Show migration plan for database
/migrate --type schema --backup             # Schema migration with backup
/migrate --type code react-16-to-18         # Code migration for React upgrade
/migrate --down --steps 2                   # Rollback last 2 migrations
/migrate --resume                           # Resume from checkpoint after failure
/migrate !rails db:migrate:status           # Check Rails migration status
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[type]` - Migration type (database|schema|code|api|data)
- `[target]` - Specific migration target or version
- `@<path>` - Custom migration directory
- `!<command>` - Execute migration command directly
- `--<flag>` - Migration options and safety controls

### Migration Types

- `database` / `--type schema`: Database structure changes
- `--type code`: Code refactoring and updates
- `--type api`: API version migrations
- `--type data`: Data transformation and ETL

### Direction Control

- `--up`: Apply migrations forward (default)
- `--down`: Rollback migrations
- `--to [version]`: Migrate to specific version
- `--steps [n]`: Apply/rollback n migrations
- `--redo`: Rollback and reapply last

### Safety Options

- `--backup`: Create backup before migration
- `--dry-run`: Test without applying changes
- `--force`: Override safety checks
- `--checkpoint`: Enable resume capability
- `--validate`: Post-migration validation

### Performance Options

- `--batch-size [n]`: Records per batch (default: 1000)
- `--parallel [n]`: Parallel execution threads
- `--timeout [seconds]`: Operation timeout
- `--optimize-indexes`: Smart index management

### Universal SuperClaude Flags

- `--plan`: Show detailed execution plan
- `--think`: Analyze migration complexity
- `--think-hard`: Deep migration analysis
- `--ultrathink`: Maximum analysis depth
- `--introspect`: Show decision reasoning

### Persona Integration

- `--persona-architect`: System design focus
- `--persona-security`: Security validation
- `--persona-performance`: Performance analysis

### MCP Server Control

- `--seq`: Sequential for planning
- `--c7`: Context7 for documentation
- `--no-mcp`: Native tools only

## Framework Auto-Detection

### Python
- **Django**: `manage.py migrate`
- **Alembic**: `alembic upgrade`
- **Flask-Migrate**: `flask db migrate`

### JavaScript/TypeScript
- **Prisma**: `prisma migrate`
- **Knex.js**: `knex migrate`
- **TypeORM**: `typeorm migration:run`
- **Sequelize**: `sequelize db:migrate`

### Ruby
- **Rails**: `rails db:migrate`

### PHP
- **Laravel**: `php artisan migrate`
- **Doctrine**: `doctrine:migrations:migrate`

### Java
- **Flyway**: `flyway migrate`
- **Liquibase**: `liquibase update`

## Workflow Process

### Phase 1: Analysis
1. **Framework Detection**: Identify migration system
2. **Migration Discovery**: Find pending changes
3. **Impact Assessment**: Analyze affected systems
4. **Risk Evaluation**: Safety and rollback analysis

### Phase 2: Preparation
1. **Create Backup**: Safety checkpoint
2. **Lock Acquisition**: Prevent conflicts
3. **Validation Checks**: Pre-flight verification
4. **Rollback Plan**: Recovery strategy

### Phase 3: Execution
1. **Apply Migrations**: Run changes
2. **Progress Monitoring**: Real-time tracking
3. **Error Handling**: Automatic recovery
4. **Checkpoint Creation**: Save progress

### Phase 4: Validation
1. **Schema Verification**: Structure checks
2. **Data Integrity**: Consistency validation
3. **Performance Testing**: Impact analysis
4. **Application Testing**: Functionality verification

## Migration Examples

### Database Schema Migration

```bash
# Plan schema changes
/migrate database --plan

🔍 Detected: Django 4.2.7
📋 Pending migrations: 5
├─ 0023_add_user_preferences
├─ 0024_create_audit_table
├─ 0025_add_indexes
├─ 0026_update_constraints
└─ 0027_optimize_queries

📊 Impact Analysis:
├─ Tables affected: 8
├─ Indexes: +3 new, 2 modified
├─ Estimated time: 12 minutes
└─ Downtime: None (online DDL)

# Execute with backup
/migrate database --backup --verbose

💾 Creating backup... Done (2.3GB)
🔒 Acquiring lock... Success
🚀 Applying migrations:
[1/5] 0023_add_user_preferences ✓ (0.8s)
[2/5] 0024_create_audit_table ✓ (1.2s)
[3/5] 0025_add_indexes ✓ (45s)
[4/5] 0026_update_constraints ✓ (2.1s)
[5/5] 0027_optimize_queries ✓ (0.5s)

✅ All migrations completed successfully
```

### Code Migration

```bash
# React version upgrade
/migrate --type code react-16-to-18 --dry-run

📦 Code Migration Analysis
━━━━━━━━━━━━━━━━━━━━━━━━
Files to modify: 127
Patterns to update:
├─ ReactDOM.render → createRoot
├─ useEffect cleanup
├─ Automatic batching
└─ Suspense boundaries

# Apply migration
/migrate --type code react-16-to-18 --validate-tests

🔄 Applying code transformations...
[████████████████████] 127/127 files

✅ Transformations complete
🧪 Running test suite... All tests passed
```

### Data Migration

```bash
# Large dataset migration with checkpoints
/migrate --type data user_archive --checkpoint --batch-size 5000

📊 Data Migration: user_archive
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total records: 2,450,000
Batch size: 5,000
Checkpoints: Enabled

Progress: [██████████░░░░░░] 1,225,000/2,450,000 (50%)
Speed: 2,100 records/sec
ETA: 9m 45s
Checkpoint saved: checkpoint_245.dat
```

### API Version Migration

```bash
# Canary deployment for API v2
/migrate --type api v2 --canary 10%

🚀 API Version Migration
━━━━━━━━━━━━━━━━━━━━━━━
Current: v1 (100% traffic)
Target: v2 (0% → 10%)

Deploying canary...
✅ v2 endpoints active
🔄 Routing 10% traffic to v2
📊 Monitoring metrics...

Health Check: ✅ Passing
Error Rate: 0.02% (normal)
Latency: p95 = 145ms
```

## Safety & Recovery

### Checkpoint System

```bash
# Enable checkpoints
/migrate --checkpoint large-migration

# Resume after failure
/migrate --resume

📊 Resuming from checkpoint:
├─ Completed: 45/100 migrations
├─ Data processed: 2.5M/10M
└─ Resuming from migration_046...
```

### Rollback Procedures

```bash
# Automatic rollback on error
❌ Migration failed at step 3/5
🔄 Initiating rollback...
← Rolling back migration_003 ✓
← Rolling back migration_002 ✓
💾 State restored successfully

# Manual rollback
/migrate --down --steps 2 --force
```

### Error Recovery

```bash
⚠️ Foreign key constraint violation
💡 Suggested fixes:
1. Add missing parent records
2. Remove orphaned records
3. Disable constraint temporarily

Select action (1-3) or 'r' to rollback: _
```

## Performance Optimization

### Parallel Execution
```bash
/migrate --parallel 4 --type schema

Executing in parallel:
Worker 1: migrations 1,5,9
Worker 2: migrations 2,6,10
Worker 3: migrations 3,7,11
Worker 4: migrations 4,8,12
```

### Adaptive Batching
```bash
/migrate --type data --adaptive-batch

Starting batch: 1,000
Performance: 850/sec → Increasing to 2,500
Performance: 2,100/sec → Optimal size found
```

## Best Practices

### Planning
1. Always run `--plan` first
2. Test in staging environment
3. Schedule maintenance windows
4. Prepare rollback procedures
5. Document migration decisions

### Safety
1. Enable backups for data changes
2. Use transactions when possible
3. Implement health checks
4. Monitor during execution
5. Validate after completion

### Performance
1. Optimize batch sizes
2. Manage indexes intelligently
3. Use parallel execution
4. Schedule off-peak hours
5. Monitor resource usage

## Integration with SuperClaude

### Intelligent Features
- **Auto-Detection**: Framework and migration discovery
- **Impact Analysis**: Comprehensive change assessment
- **Safety Checks**: Automatic validation and backups
- **Progress Tracking**: Real-time monitoring with checkpoints

### Quality Assurance
- **Pre-Flight Checks**: Validation before execution
- **Error Recovery**: Automatic rollback and fixes
- **Post-Validation**: Integrity and performance verification
- **Audit Trail**: Complete migration history

---

*SuperClaude Enhanced | Intelligent Migration Management | Safe Database Operations*