---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Safe and intelligent deployment automation with rollback capabilities, monitoring, and multi-environment support"
---

# /deploy - Intelligent Deployment Automation

**Purpose**: Safe application deployment with automated validation, rollback, and monitoring  
**Category**: Deployment & Operations  
**Syntax**: `/deploy $ARGUMENTS`

## Examples

```bash
/deploy                               # Deploy to default environment
/deploy --env staging                 # Deploy to staging environment
/deploy --env prod --plan            # Show production deployment plan
/deploy --rollback --env prod        # Rollback production deployment
/deploy !kubectl apply --k8s         # Deploy using Kubernetes
/deploy --strategy canary --percent 20  # Canary deployment with 20% traffic
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[environment]` - Target deployment environment (default: staging)
- `@<path>` - Explicit deployment configuration path
- `!<command>` - Execute deployment command directly
- `--<flag>` - Deployment options and strategies

### Environment Options

- `--env dev`: Development environment (minimal checks)
- `--env staging`: Staging environment (production-like)
- `--env prod`: Production environment (maximum safety)
- `--env [custom]`: Custom environment configuration

### Deployment Strategies

- `--strategy blue-green`: Zero-downtime blue-green deployment
- `--strategy canary`: Gradual rollout with monitoring
- `--strategy rolling`: Sequential update with health checks
- `--strategy recreate`: Stop all, then start (downtime)

### Control Options

- `--plan`: Show deployment plan without executing
- `--dry-run`: Simulate deployment process
- `--force`: Skip non-critical safety checks
- `--rollback`: Revert to previous version
- `--backup`: Create backup before deployment

### Monitoring Options

- `--health-timeout [seconds]`: Health check timeout (default: 300)
- `--canary-percent [number]`: Canary traffic percentage
- `--batch-size [number]`: Rolling deployment batch size
- `--monitor-duration [seconds]`: Post-deployment monitoring

### Universal SuperClaude Flags

- `--plan`: Show detailed deployment strategy
- `--think`: Analyze deployment risks (~4K tokens)
- `--think-hard`: Deep deployment analysis (~10K tokens)
- `--introspect`: Show deployment decision process

### Persona Integration

- `--persona-backend`: Server deployment optimization
- `--persona-qa`: Deployment validation focus
- `--persona-architect`: Infrastructure deployment planning

### MCP Server Control

- `--c7`: Enable Context7 for deployment patterns
- `--seq`: Enable Sequential for complex deployments
- `--pup`: Enable Puppeteer for UI validation
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Pre-Deployment Validation
1. **Environment Check**: Validate target environment config
2. **Safety Validation**: Run tests and security scans
3. **Backup Creation**: Create rollback point
4. **Dependency Check**: Verify all requirements met

### Phase 2: Build & Preparation
1. **Artifact Creation**: Build deployment artifacts
2. **Configuration**: Prepare environment configs
3. **Migration Planning**: Database and data migrations
4. **Resource Allocation**: Ensure infrastructure ready

### Phase 3: Deployment Execution
1. **Strategy Implementation**: Execute chosen strategy
2. **Health Monitoring**: Continuous health checks
3. **Progress Tracking**: TodoWrite task management
4. **Rollback Readiness**: Maintain instant rollback

### Phase 4: Post-Deployment
1. **Validation Testing**: Smoke tests and checks
2. **Performance Monitoring**: Track key metrics
3. **Alert Configuration**: Set up monitoring
4. **Documentation**: Update deployment records

## Deployment Strategies

### Blue-Green Deployment

**Zero-downtime deployment with instant rollback**:
```bash
🔵🟢 Blue-Green Deployment Process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ✅ Green environment ready
2. 🚀 Deploying to green environment
3. 🔍 Running health checks...
4. ✅ All checks passed
5. 🔄 Switching traffic to green
6. ✅ Deployment successful

🔵 Blue environment kept for rollback
⏱️ Total time: 4m 23s
```

### Canary Deployment

**Gradual rollout with automatic rollback**:
```bash
🐤 Canary Deployment Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 1: 10% traffic → ✅ Healthy
Stage 2: 25% traffic → ✅ Healthy
Stage 3: 50% traffic → ✅ Healthy
Stage 4: 100% traffic → ✅ Complete

📊 Metrics Summary:
├─ Error rate: 0.01% (baseline: 0.02%)
├─ Response time: 145ms (baseline: 150ms)
└─ Success rate: 99.99%
```

### Rolling Deployment

**Sequential updates with health validation**:
```bash
🔄 Rolling Deployment Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Batch 1/4: [████████] 100% ✅
Batch 2/4: [████████] 100% ✅
Batch 3/4: [████░░░░] 50% 🔄
Batch 4/4: [░░░░░░░░] 0% ⏳

🎯 Current Status: 62.5% complete
⚡ ETA: 3 minutes remaining
```

## Safety Mechanisms

### Pre-Deployment Checks
```bash
🛡️ Safety Validation Results
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All tests passing (247/247)
✅ Security scan clean
✅ Database migrations ready
✅ Backup created successfully
✅ Rollback plan validated

🎯 Safety Score: 100%
✅ Ready for deployment
```

### Automatic Rollback Triggers
- Error rate increase >5%
- Response time degradation >50%
- Health check failures (3+ consecutive)
- Critical alerts triggered
- Memory/CPU threshold exceeded

### Manual Controls
- Emergency stop during deployment
- Instant rollback capability
- Deployment pause/resume
- Traffic percentage adjustment

## Monitoring & Validation

### Health Checks
```bash
🏥 Health Check Status
━━━━━━━━━━━━━━━━━━━━
✅ /health - 200 OK (45ms)
✅ /ready - 200 OK (12ms)
✅ Database - Connected
✅ Cache - Connected
✅ Queue - Processing

🎯 Overall Health: HEALTHY
```

### Performance Metrics
```bash
📊 Deployment Metrics
━━━━━━━━━━━━━━━━━━━━━
Response Time: 145ms (↓ 5ms)
Error Rate: 0.01% (↓ 0.01%)
Throughput: 1,247 req/s (↑ 12%)
CPU Usage: 45% (→ stable)
Memory: 2.1GB (→ stable)

📈 Performance: IMPROVED
```

### Post-Deployment Validation
1. Smoke test execution
2. Critical path validation
3. Integration testing
4. Performance benchmarking
5. Security verification

## Rollback Procedures

### Instant Rollback
```bash
/deploy --rollback --env prod

🔄 Initiating rollback...
🎯 Target version: v2.3.4 (previous stable)
✅ Traffic switched to previous version
✅ Health checks passing
✅ Rollback completed in 45s
```

### Rollback Strategies
- **Blue-Green**: Instant traffic switch
- **Canary**: Gradual traffic reduction
- **Rolling**: Sequential reversion
- **Database**: Migration rollback support

## Environment Configuration

### Development
```yaml
# Minimal checks, fast iteration
safety_checks: minimal
auto_rollback: false
health_timeout: 60
monitoring: basic
```

### Staging
```yaml
# Production-like validation
safety_checks: comprehensive
auto_rollback: true
health_timeout: 180
monitoring: detailed
```

### Production
```yaml
# Maximum safety and monitoring
safety_checks: maximum
auto_rollback: true
health_timeout: 300
monitoring: comprehensive
approval_required: true
```

## Example Workflows

### Basic Deployment
```bash
/deploy --env staging

🚀 Deploying to staging...
📦 Building application...
🔍 Running safety checks...
✅ Deploying version 2.4.0
🏥 Health checks passed
✅ Deployment successful!
```

### Production with Approval
```bash
/deploy --env prod --plan

📋 Production Deployment Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Version: 2.4.0 → 2.4.1
Strategy: Blue-Green
Duration: ~5 minutes
Rollback: Instant available

Changes:
├─ API: 3 new endpoints
├─ Database: 2 migrations
└─ Config: Updated Redis settings

⚠️ Requires approval to proceed
Approve? [y/N]
```

### Canary Deployment
```bash
/deploy --env prod --strategy canary --percent 10

🐤 Starting canary deployment...
📊 Stage 1: 10% traffic
⏱️ Monitoring for 5 minutes...
✅ Metrics healthy, proceeding
📊 Stage 2: 25% traffic...
```

### Emergency Rollback
```bash
/deploy --rollback --env prod --force

🚨 Emergency rollback initiated
🔄 Reverting to v2.3.9...
✅ Traffic switched
✅ Services stable
✅ Rollback complete (32s)

📋 Incident report generated
```

## Container Deployments

### Docker Support
```bash
/deploy --container docker --env prod

🐳 Docker Deployment
━━━━━━━━━━━━━━━━━━━━
🏗️ Building image...
🔍 Security scanning...
📤 Pushing to registry...
🚀 Deploying containers...
✅ Deployment complete
```

### Kubernetes Integration
```bash
/deploy !kubectl apply -f k8s/ --k8s

☸️ Kubernetes Deployment
━━━━━━━━━━━━━━━━━━━━━━━
📋 Applying manifests...
🔄 Rolling update started
🏥 Pod health checks...
✅ All pods healthy
🎯 Service updated
```

## CI/CD Integration

### Pipeline Integration
```yaml
# GitHub Actions example
deploy:
  runs-on: ubuntu-latest
  steps:
    - name: Deploy with Claude
      run: |
        /deploy --env ${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }} \
                --strategy blue-green \
                --plan
```

### Automation Features
- Git tag-based deployments
- Automatic rollback on failure
- Slack/email notifications
- Deployment metrics tracking

## Integration with SuperClaude

### Intelligent Deployment
- **Risk Assessment**: AI-powered deployment risk analysis
- **Pattern Learning**: Learn from deployment history
- **Optimization**: Suggest deployment improvements
- **Monitoring**: Intelligent anomaly detection

### Safety Enhancements
- **Predictive Rollback**: Anticipate failures
- **Smart Validation**: Context-aware testing
- **Resource Optimization**: Efficient deployments
- **Security First**: Automated security checks

---

*SuperClaude Enhanced | Safe Deployments | Intelligent Automation*