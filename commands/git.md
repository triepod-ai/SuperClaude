---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write]
description: "Intelligent git workflow automation with smart commits, branch management, and PR creation"
---

# /git - Intelligent Git Workflow Assistant

**Purpose**: Automate git workflows with intelligent commits, branch management, and PR creation  
**Category**: Development & Version Control  
**Syntax**: `/git $ARGUMENTS`

## Examples

```bash
/git                                    # Auto-detect and perform appropriate git operation
/git commit                             # Create intelligent commit with auto-generated message
/git branch feature/oauth               # Create and switch to new branch
/git pr --reviewers alice,bob           # Create PR with reviewers
/git !git log --oneline -10            # Execute git command directly
/git flow feature payment-integration   # Start git flow feature
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[operation]` - Git operation (commit, branch, pr, flow, maintain)
- `[args]` - Operation-specific arguments (branch names, messages)
- `@<path>` - Specific files to include in operations
- `!<command>` - Execute git command directly
- `--<flag>` - Operation flags and options

### Core Operations

- `commit`: Intelligent commit creation (default if changes detected)
- `branch`: Branch management (create, delete, rename, cleanup)
- `pr` / `merge-request`: Create pull/merge requests
- `flow`: Git flow workflows (feature, hotfix, release)
- `maintain`: Repository maintenance and cleanup

### Commit Options

- `--message` / `-m`: Specify commit message
- `--amend`: Amend previous commit
- `--fixup`: Create fixup commit
- `--stage-all` / `-a`: Stage all changes
- `--interactive` / `-i`: Interactive staging

### Branch Options

- `--create` / `-b`: Create new branch
- `--delete` / `-d`: Delete branch safely
- `--cleanup`: Remove merged branches
- `--track`: Set upstream tracking

### PR Options

- `--title`: PR title (auto-generated if not provided)
- `--reviewers`: Comma-separated reviewers
- `--labels`: Comma-separated labels
- `--draft`: Create as draft PR
- `--base`: Target branch (default: main)

### Universal SuperClaude Flags

- `--plan`: Show git operation plan before execution
- `--think`: Analyze repository state and changes
- `--introspect`: Show decision-making for operations

### Persona Integration

- `--persona-analyzer`: Deep change analysis
- `--persona-qa`: Quality checks before operations

### MCP Server Control

- `--seq`: Enable Sequential for complex git analysis
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Repository Analysis
1. **Status Check**: Current branch, changes, staging area
2. **History Review**: Recent commits and patterns
3. **Remote Sync**: Check upstream status
4. **Context Understanding**: Project conventions and workflow

### Phase 2: Intelligent Processing
1. **Change Categorization**: Group related changes
2. **Message Generation**: Create semantic commit messages
3. **Quality Validation**: Run pre-commit checks
4. **Safety Verification**: Ensure no secrets or issues

### Phase 3: Execution
1. **Operation Execution**: Perform git commands
2. **Result Verification**: Confirm success
3. **Next Steps**: Suggest follow-up actions

## Intelligent Commit Workflow

### Auto-Generated Messages

**Semantic Format**:
```
<type>(<scope>): <subject>

<body>

<footer>

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

### Smart Staging

```bash
📊 Change Analysis
━━━━━━━━━━━━━━━━━━
🆕 New files: 3
📝 Modified: 12
🗑️ Deleted: 2

📂 Suggested grouping:
├─ Feature: auth/*.js (5 files)
├─ Tests: test/auth/*.js (3 files)
├─ Docs: README.md, API.md
└─ Config: .env.example

🎯 Creating 3 logical commits...
```

### Quality Checks

```bash
🔍 Pre-Commit Validation
━━━━━━━━━━━━━━━━━━━━━━━
✅ No secrets detected
✅ Lint checks passed
✅ Tests passing
✅ No large files
✅ Valid file types

✅ Ready to commit!
```

## Branch Management

### Smart Branch Creation

```bash
/git branch feature/oauth-integration

🌿 Creating feature branch
━━━━━━━━━━━━━━━━━━━━━━━━
📍 Base: main (up to date)
🆕 Branch: feature/oauth-integration
🔗 Upstream: origin/feature/oauth-integration
✅ Switched to new branch

💡 Next steps:
• Make changes for OAuth integration
• Run: /git commit when ready
• Create PR: /git pr
```

### Branch Cleanup

```bash
/git maintain --cleanup

🧹 Branch Cleanup
━━━━━━━━━━━━━━━━━
🔍 Analyzing branches...
📊 Found 7 merged branches:
├─ feature/old-ui ✓
├─ bugfix/login-issue ✓
├─ feature/deprecated-api ✓
└─ ...4 more

🗑️ Deleting merged branches...
✅ Cleaned up 7 branches

📍 Active branches:
├─ main
├─ develop
└─ feature/current-work
```

## Pull Request Creation

### Intelligent PR Generation

```bash
/git pr

📝 Creating Pull Request
━━━━━━━━━━━━━━━━━━━━━━━
🔍 Analyzing changes...
📊 Commits: 5
📝 Files changed: 23
➕ Additions: 456
➖ Deletions: 123

📋 Generated PR:
Title: feat: Add OAuth2 authentication support

## Summary
Implements OAuth2 authentication with Google provider support.

## Changes
- ✅ OAuth2 flow implementation
- ✅ Token refresh mechanism
- ✅ Error handling
- ✅ Comprehensive tests

## Testing
- Unit tests: 24 added (100% coverage)
- Integration tests: Passing
- Manual testing: Completed

Closes #123

🚀 Creating PR...
✅ PR created: #456
🔗 https://github.com/user/repo/pull/456
```

### PR with Options

```bash
/git pr --reviewers alice,bob --labels feature,security --draft

📝 Creating Draft PR
━━━━━━━━━━━━━━━━━━━
👥 Reviewers: alice, bob
🏷️ Labels: feature, security
📄 Status: Draft
🎯 Base: main

✅ Draft PR created: #457
```

## Git Flow Integration

### Feature Workflow

```bash
/git flow feature payment-integration

🌊 Git Flow: Feature Start
━━━━━━━━━━━━━━━━━━━━━━━━━
🌿 Creating: feature/payment-integration
📍 From: develop
✅ Branch created and switched

📋 Feature workflow:
1. Implement payment integration
2. Run: /git commit for changes
3. Run: /git flow finish when complete
```

### Hotfix Workflow

```bash
/git flow hotfix security-patch

🚨 Git Flow: Hotfix Start
━━━━━━━━━━━━━━━━━━━━━━━━
🌿 Creating: hotfix/security-patch
📍 From: main
✅ Branch created and switched

⚠️ Hotfix workflow:
1. Apply security fixes
2. Test thoroughly
3. Run: /git flow finish
4. Will merge to main AND develop
```

## Example Workflows

### Basic Commit

```bash
/git commit

🔍 Analyzing changes...
📝 Generating commit message...

feat(auth): implement JWT authentication

- Add JWT token generation and validation
- Implement refresh token mechanism
- Add middleware for protected routes
- Include comprehensive test coverage

Closes #234

✅ Commit created: 7fa8b3c
```

### Interactive Commit

```bash
/git commit --interactive

📝 Interactive Commit Mode
━━━━━━━━━━━━━━━━━━━━━━━━
Changes detected in 8 files:

1. src/auth/jwt.js (modified)
2. src/auth/middleware.js (new)
3. test/auth.test.js (modified)
...

Select files to stage: 1,2,3
✅ Staged 3 files

Enter commit type (feat/fix/docs/...): feat
Enter scope: auth
Enter description: add JWT authentication

✅ Commit created!
```

### Complex PR Workflow

```bash
/git pr --base develop --think

🧠 Analyzing PR requirements...
🔍 Checking CI status...
📊 Generating comprehensive PR...

✅ PR created with:
- Detailed description
- Test results
- Performance impact
- Migration guide
- Related issues linked
```

### Repository Maintenance

```bash
/git maintain

🔧 Repository Maintenance
━━━━━━━━━━━━━━━━━━━━━━━━
📊 Repository stats:
├─ Size: 125 MB
├─ Commits: 3,456
├─ Branches: 23
└─ Stashes: 4

🧹 Cleanup tasks:
✅ Pruned remote branches
✅ Garbage collection complete
✅ Repacked objects
✅ Cleaned reflog
✅ Removed old stashes

💾 Space saved: 18 MB
✅ Repository optimized!
```

## Safety Features

### Pre-Commit Validation

```bash
🛡️ Safety Checks
━━━━━━━━━━━━━━━━━━
✅ No secrets found
✅ No large files (>100MB)
✅ Valid branch name
✅ No merge conflicts
✅ Tests passing
```

### Protected Branch Detection

```bash
⚠️ Protected Branch Warning
━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 Branch 'main' is protected
🚫 Direct push not allowed

Suggested action:
1. Create feature branch: /git branch feature/name
2. Make changes
3. Create PR: /git pr
```

## Integration with SuperClaude

### Intelligent Analysis
- **Change Understanding**: Semantic analysis of code changes
- **Message Generation**: Context-aware commit messages
- **Pattern Recognition**: Follow project conventions
- **Quality Assurance**: Automated pre-commit checks

### Workflow Automation
- **Smart Operations**: Choose appropriate git commands
- **Error Prevention**: Catch common git mistakes
- **Team Collaboration**: Facilitate PR workflows
- **Maintenance**: Keep repository healthy

---

*SuperClaude Enhanced | Smart Git Workflows | Safe Version Control*