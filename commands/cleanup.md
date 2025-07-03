---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write]
description: "Systematic project cleanup and maintenance to improve performance, reduce technical debt, and optimize resources"
---

# /cleanup - Project Cleanup & Maintenance

**Purpose**: Systematically clean and maintain project files, dependencies, and artifacts  
**Category**: Quality & Maintenance  
**Syntax**: `/cleanup $ARGUMENTS`

## Examples

```bash
/cleanup                           # Auto-detect and clean current project
/cleanup @src/ --code --dry-run    # Preview code cleanup for src directory
/cleanup --files --interactive     # Clean files with confirmation prompts
/cleanup --deps --fix-auto         # Automatic dependency cleanup
/cleanup !git gc --git --safe      # Git cleanup with custom command
/cleanup --all --metrics           # Full cleanup with detailed metrics
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Files/directories to clean (default: auto-detect project)
- `@<path>` - Explicit file or directory targeting
- `!<command>` - Execute cleanup command and verify results
- `--<flag>` - Cleanup type and configuration options

### Cleanup Types

- `--code`: Remove unused imports, dead code, debug statements
- `--files`: Clean build artifacts, temporary files, logs, caches
- `--deps`: Remove unused dependencies, optimize package tree
- `--git`: Clean branches, optimize repository, remove untracked
- `--config`: Clean deprecated settings, unused variables
- `--all`: Comprehensive cleanup across all areas

### Control Options

- `--dry-run`: Preview changes without executing
- `--interactive`: Confirm each cleanup operation
- `--safe`: Conservative mode - only guaranteed safe cleanups
- `--aggressive`: Maximum cleanup (use with caution)
- `--force`: Skip all confirmations

### Monitoring Options

- `--watch`: Continuous cleanup monitoring
- `--schedule [interval]`: Set up periodic maintenance
- `--analyze-only`: Generate cleanup report only
- `--estimate`: Estimate space savings and impact
- `--metrics`: Detailed before/after metrics

### Universal SuperClaude Flags

- `--plan`: Show cleanup strategy before execution
- `--think`: Analyze cleanup opportunities (~4K tokens)
- `--think-hard`: Deep cleanup analysis (~10K tokens)
- `--introspect`: Show cleanup decision process

### Persona Integration

- `--persona-refactorer`: Code quality and cleanup specialist
- `--persona-analyzer`: Dependency and impact analysis
- `--persona-architect`: System-wide cleanup planning

### MCP Server Control

- `--c7`: Enable Context7 for cleanup best practices
- `--seq`: Enable Sequential for impact analysis
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Analysis & Discovery
1. **Scope Detection**: Identify project boundaries and structure
2. **Cleanup Opportunities**: Find removable artifacts and code
3. **Impact Assessment**: Analyze potential breaking changes
4. **Safety Planning**: Create backup and rollback strategies

### Phase 2: Preparation
1. **Backup Creation**: Git checkpoint or full backup
2. **Test Coverage**: Verify tests for affected code
3. **Dependency Mapping**: Understand usage patterns
4. **Risk Evaluation**: Categorize by safety level

### Phase 3: Execution
1. **Progressive Cleanup**: Process in safe, atomic batches
2. **Continuous Validation**: Test after each operation
3. **Rollback Readiness**: Maintain restoration capability
4. **Progress Tracking**: Monitor cleanup effectiveness

### Phase 4: Verification
1. **Functionality Testing**: Ensure nothing broken
2. **Performance Check**: Verify improvements
3. **Space Verification**: Confirm space reclaimed
4. **Documentation**: Update cleanup records

## Cleanup Domains

### Code Cleanup

**Target Areas**:
- Unused imports and variables
- Dead/unreachable code blocks
- Console.log and debug statements
- Outdated TODO/FIXME comments
- Style inconsistencies

**Safety Measures**:
```bash
🔍 Code Cleanup Analysis
━━━━━━━━━━━━━━━━━━━━━━━
📊 Found 156 cleanup opportunities:
├─ Unused imports: 89
├─ Dead code: 23 blocks
├─ Debug statements: 34
└─ Style issues: 10

✅ All changes reversible
💾 Checkpoint created: cleanup-2024-01-15
```

### File System Cleanup

**Cleanup Targets**:
- Build artifacts (dist/, build/, .next/)
- Temporary files and directories
- Large log files and rotations
- Cache directories
- OS-specific files (.DS_Store)

**Space Analysis**:
```bash
💾 Space Recovery Potential
━━━━━━━━━━━━━━━━━━━━━━━━
📁 Build artifacts: 1.8GB
📁 Cache files: 890MB
📁 Log files: 456MB
📁 Temp files: 234MB
━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total reclaimable: 3.4GB
```

### Dependency Cleanup

**Optimization Areas**:
- Unused dependencies removal
- Duplicate package consolidation
- Vulnerable package updates
- Lock file optimization
- License compliance

**Dependency Report**:
```bash
📦 Dependency Analysis
━━━━━━━━━━━━━━━━━━━━━━━
🗑️ Unused packages: 12
🔄 Duplicates: 8 (45MB savings)
⚠️ Vulnerabilities: 3 to fix
📋 License issues: 2 GPL conflicts
✅ Safe to remove: 20 packages
```

### Git Repository Cleanup

**Git Optimization**:
- Remove merged branches
- Clean stale remote references
- Optimize .git directory (gc)
- Remove large files from history
- Clean untracked files

**Repository Health**:
```bash
🗂️ Git Repository Status
━━━━━━━━━━━━━━━━━━━━━━━
🌿 Merged branches: 14 to remove
📍 Stale remotes: 6 references
💾 .git size: 125MB → 89MB possible
🗑️ Untracked files: 47 (23MB)
✅ Safe cleanup available
```

## Safety Mechanisms

### Pre-Cleanup Safety
1. **Checkpoint Creation**: Automatic git commit/tag
2. **Backup Verification**: Ensure restoration possible
3. **Test Coverage**: Check affected code coverage
4. **Dependency Analysis**: Map usage patterns

### During Cleanup
1. **Atomic Operations**: Small, reversible changes
2. **Continuous Testing**: Validate after each step
3. **Progress Monitoring**: Track success/failure
4. **Rollback Ready**: Instant restoration available

### Post-Cleanup
1. **Comprehensive Testing**: Full test suite run
2. **Performance Validation**: Benchmark comparisons
3. **Space Verification**: Confirm improvements
4. **Documentation**: Record all changes

## Cleanup Reports

### Summary Report
```bash
📊 Cleanup Summary Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Cleanup completed successfully

Space Savings:
├─ Files removed: 1,247 (2.3GB)
├─ Dependencies: 156MB saved
├─ Git optimization: 36MB
└─ Total reclaimed: 2.5GB

Performance Impact:
├─ Build time: -23% faster
├─ Install time: -31% faster
├─ Startup time: -12% faster
└─ Memory usage: -18% lower

Quality Improvements:
├─ Code quality: +15 points
├─ Security: 8 vulnerabilities fixed
├─ Maintainability: +22% improvement
└─ Technical debt: -$4,500 value
```

### Detailed Metrics
```bash
🔬 Detailed Cleanup Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Code Cleanup:
├─ Files modified: 89
├─ Lines removed: 1,456
├─ Imports cleaned: 234
└─ Functions removed: 23

File Cleanup:
├─ Artifacts: 456 files (1.8GB)
├─ Caches: 2,345 files (890MB)
├─ Logs: 12 files (456MB)
└─ Temp: 789 files (234MB)

Dependencies:
├─ Removed: 12 packages
├─ Updated: 8 packages
├─ Consolidated: 5 duplicates
└─ Tree optimized: -23% size
```

## Continuous Monitoring

### Watch Mode
```bash
/cleanup --watch

👁️ Cleanup Watch Mode Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monitoring:
├─ Temp files > 1 hour old
├─ Cache directories > 100MB
├─ New unused imports
└─ Build artifacts > 500MB

⚡ Auto-cleanup enabled
🔄 Interval: 5 minutes
```

### Scheduled Maintenance
```yaml
# Cleanup schedule configuration
cleanup_schedule:
  daily:
    - code: unused_imports
    - files: temp_cleanup
  weekly:
    - deps: security_updates
    - git: branch_cleanup
  monthly:
    - all: comprehensive_cleanup
```

## Example Workflows

### Safe Code Cleanup
```bash
/cleanup @src/ --code --safe --dry-run

🔍 Code Cleanup Preview
━━━━━━━━━━━━━━━━━━━━━━━
Would remove:
├─ 45 unused imports
├─ 12 unreachable blocks
├─ 23 debug statements
└─ 8 old TODO comments

💾 No changes made (dry-run)
✅ Run without --dry-run to apply
```

### Dependency Optimization
```bash
/cleanup --deps --fix-auto

📦 Dependency Cleanup
🔍 Analyzing package tree...
🗑️ Removing 12 unused packages...
🔄 Updating 3 vulnerable packages...
✅ Optimizing lock file...

📊 Results:
├─ Space saved: 156MB
├─ Install time: -31% faster
└─ Vulnerabilities: 0 remaining
```

### Full Project Cleanup
```bash
/cleanup --all --metrics --plan

🧹 Comprehensive Cleanup Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Create backup checkpoint
2. Clean code (45 min)
3. Remove artifacts (10 min)
4. Optimize dependencies (20 min)
5. Clean git repository (15 min)
6. Verify and test (30 min)

⏱️ Estimated time: 2 hours
💾 Space to reclaim: 3.4GB
⚡ Performance gain: ~25%

Proceed? [y/N]
```

### Git Repository Maintenance
```bash
/cleanup --git --safe

🗂️ Git Repository Cleanup
🌿 Removing 14 merged branches...
📍 Cleaning stale remotes...
🗑️ Running git gc...
✅ Repository optimized

📊 Results:
├─ Branches removed: 14
├─ Size reduced: 125MB → 89MB
└─ Performance: improved
```

## Integration with SuperClaude

### Intelligent Cleanup
- **Pattern Recognition**: Learn project-specific patterns
- **Impact Prediction**: AI-powered risk assessment
- **Smart Scheduling**: Optimal cleanup timing
- **Progress Learning**: Improve cleanup strategies

### Automated Workflows
- **Batch Processing**: Efficient parallel operations
- **Safety First**: Automatic backup and validation
- **Metrics Tracking**: Continuous improvement monitoring
- **Context Aware**: Framework-specific cleanup rules

---

*SuperClaude Enhanced | Smart Project Maintenance | Safe & Efficient Cleanup*