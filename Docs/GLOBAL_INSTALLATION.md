# SuperClaude Framework v3.0 - Global Installation Guide

## 🎯 Overview

This guide walks you through installing SuperClaude Framework as a global Claude Code configuration, making all hooks and intelligent routing available across all your projects.

## 📋 Prerequisites

- **Claude Code**: Latest version installed and configured
- **Python 3.12+**: For hook execution
- **Bash Shell**: For installation scripts
- **Git**: For project management (optional)

## 🚀 Quick Installation

### Option 1: Automated Installation (Recommended)

```bash
# Clone or navigate to SuperClaude project
cd /path/to/SuperClaude

# Make installation script executable
chmod +x Scripts/install_global_settings.sh

# Run installation
./Scripts/install_global_settings.sh

# Restart terminal or reload environment
source ~/.bashrc

# Validate installation
python3 Scripts/validate_settings.py
```

### Option 2: Manual Installation

1. **Create Global Directory Structure**
   ```bash
   mkdir -p ~/.claude
   mkdir -p ~/.claude/hooks
   ```

2. **Install Global Settings**
   ```bash
   cp settings.json ~/.claude/settings.json
   ```

3. **Install Hooks**
   ```bash
   cp .claude/hooks/*.py ~/.claude/hooks/
   chmod +x ~/.claude/hooks/*.py
   ```

4. **Set Environment Variables**
   ```bash
   echo 'export CLAUDE_CODE_SUPERCLAUDE=enabled' >> ~/.bashrc
   echo 'export SUPERCLAUDE_VERSION=3.0.0' >> ~/.bashrc
   echo 'export SUPERCLAUDE_HOOKS_ENABLED=true' >> ~/.bashrc
   echo 'export PYTHON_PATH="$HOME/.claude/hooks:$PYTHON_PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

## 📁 Installation Structure

After installation, your global Claude Code configuration will include:

```
~/.claude/
├── settings.json                    # Global SuperClaude settings
└── hooks/                          # SuperClaude hook collection
    ├── wave_coordinator.py          # Wave orchestration and coordination
    ├── task_manager.py              # Task lifecycle management
    ├── context_accumulator.py       # Context compression and intelligence
    ├── wave_performance_monitor.py  # Real-time performance monitoring
    ├── performance_monitor.py       # General performance tracking
    ├── token_optimizer.py           # Token usage optimization
    ├── quality_validator.py         # Pre-execution quality validation
    ├── quality_gates_coordinator.py # Quality gates and compliance
    ├── error_handler.py             # Error recovery and learning
    ├── agent_manager.py             # Sub-agent lifecycle management
    ├── hook_registry.py             # Hook registration and management
    ├── mcp_coordinator.py           # MCP server coordination
    ├── synthesis_engine.py          # Compound intelligence synthesis
    ├── result_collector.py          # Result aggregation and validation
    ├── wave_sequencer.py            # Wave progression and patterns
    └── orchestration_engine.py      # System orchestration
```

## ⚙️ Configuration Details

### Global Settings Features

The `~/.claude/settings.json` includes:

- **🪝 Hook System**: 17 Python hooks with intelligent routing
- **🔐 Permissions**: Comprehensive allow/deny rules for security
- **🌐 MCP Integration**: Context7, Sequential, Magic, Playwright servers
- **⚡ Performance**: Sub-100ms execution targets
- **🔄 Wave Mode**: Multi-stage command execution with compound intelligence
- **🛡️ Quality Gates**: 8-step validation cycle with AI integration
- **🧠 Intelligence**: Context accumulation and synthesis engine

### Hook Event Types

| Event Type | Purpose | Hooks Triggered |
|------------|---------|-----------------|
| **PreToolUse** | Before tool execution | Wave coordination, task management, performance monitoring |
| **PostToolUse** | After tool completion | Quality gates, result collection, synthesis |
| **SubagentStop** | Sub-agent completion | Agent management, result integration |
| **Stop** | Session completion | Final synthesis, performance analysis |
| **Notification** | System notifications | Real-time monitoring, orchestration |

### Permission Model

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Bash(*)", "Read(*)", "Write(*)", "Edit(*)",
      "mcp__*", "Task(*)", "TodoWrite(*)"
    ],
    "deny": [
      "Bash(rm:-rf /*)", "Bash(sudo:*)",
      "WebFetch(domain:localhost)"
    ]
  }
}
```

## 🔧 Project-Specific Overrides

While global settings provide framework-wide capabilities, you can override settings per project:

1. **Create Project Settings**
   ```bash
   mkdir -p .claude
   cp ~/.claude/settings.json .claude/settings.local.json
   ```

2. **Customize for Project**
   ```json
   {
     "superclaude": {
       "wave_mode": {
         "enabled": false
       },
       "performance": {
         "target_execution_time": 50
       }
     }
   }
   ```

3. **Settings Precedence** (highest to lowest):
   - Enterprise policies
   - Command line arguments  
   - `.claude/settings.local.json` (project-specific)
   - `.claude/settings.json` (project-shared)
   - `~/.claude/settings.json` (global)

## 🧪 Validation & Testing

### Automated Validation

```bash
# Run comprehensive validation
python3 Scripts/validate_settings.py

# Expected output:
# 🎉 Validation completed successfully!
# SuperClaude Framework is properly configured.
```

### Manual Testing

```bash
# Test Claude Code recognition
claude config list

# Test hook execution
echo '{"tool": "test", "args": {}}' | python3 ~/.claude/hooks/wave_performance_monitor.py

# Test MCP servers (if configured)
claude mcp list
```

### Validation Checklist

- ✅ Global settings.json exists and is valid JSON
- ✅ All 17 hooks installed and executable
- ✅ Environment variables configured
- ✅ Hook execution tests pass
- ✅ MCP servers configured
- ✅ Permissions properly set

## 🚀 Usage Examples

### Basic Usage

```bash
# All SuperClaude features now available globally
claude /analyze --comprehensive
claude /improve --wave-mode
claude /load --delegate
```

### Wave Mode

```bash
# Automatic wave detection
claude /improve "Comprehensively enhance this enterprise application"

# Force wave mode
claude /analyze --wave-mode --progressive-waves

# Wave validation for critical operations
claude /scan --wave-validation --security-focus
```

### Advanced Features

```bash
# Intelligent routing with personas
claude /design --persona-architect --c7 --seq

# Performance optimization
claude /troubleshoot --persona-performance --uc --think

# Quality gates
claude /build --wave-validation --quality-gates
```

## 🔍 Troubleshooting

### Common Issues

1. **Hooks Not Executing**
   ```bash
   # Check Python path
   echo $PYTHONPATH
   
   # Verify hook permissions
   ls -la ~/.claude/hooks/*.py
   
   # Test individual hook
   python3 ~/.claude/hooks/wave_performance_monitor.py
   ```

2. **Settings Not Recognized**
   ```bash
   # Verify settings location
   ls -la ~/.claude/settings.json
   
   # Validate JSON syntax
   python3 -m json.tool ~/.claude/settings.json
   
   # Check Claude Code configuration
   claude config list
   ```

3. **MCP Servers Unavailable**
   ```bash
   # List configured servers
   claude mcp list
   
   # Add missing servers
   claude mcp add sequential-thinking mcp-server-sequential-thinking
   claude mcp add context7 mcp-server-context7
   ```

### Hook Debugging

```bash
# Enable hook debugging
export SUPERCLAUDE_DEBUG=true

# Check hook logs
tail -f ~/.claude/logs/hook-debug.log

# Test specific hook with verbose output
echo '{"tool": "test", "args": {}}' | python3 ~/.claude/hooks/wave_coordinator.py --verbose
```

## 📊 Performance Monitoring

SuperClaude includes built-in performance monitoring:

- **Real-time Metrics**: Sub-100ms execution targets
- **Wave Analytics**: Multi-stage operation performance
- **Resource Optimization**: Token usage and efficiency
- **Quality Metrics**: Validation success rates

View performance data:
```bash
# Check performance metrics
cat ~/.claude/wave_performance_metrics.json

# Monitor real-time performance
tail -f ~/.claude/logs/performance.log
```

## 🔒 Security Considerations

### Permission Security

- Global settings use `acceptEdits` mode for convenience
- Deny rules prevent dangerous operations
- Enterprise managed policies override user settings
- MCP servers sandboxed by default

### Hook Security

- All hooks execute with user permissions
- Hooks validate input before processing
- Error handling prevents information leakage
- Timeout limits prevent hanging processes

### Best Practices

1. **Review Settings**: Audit permissions before deployment
2. **Test Hooks**: Validate hook behavior in development
3. **Monitor Usage**: Track hook execution and performance
4. **Update Regularly**: Keep framework updated for security patches

## 🆕 Updates & Maintenance

### Updating SuperClaude

```bash
# Backup current settings
cp ~/.claude/settings.json ~/.claude/settings.json.backup

# Update from project
cd /path/to/SuperClaude
git pull origin main
./Scripts/install_global_settings.sh

# Validate update
python3 Scripts/validate_settings.py
```

### Maintenance Tasks

```bash
# Clean old performance logs
find ~/.claude/logs -name "*.log" -mtime +30 -delete

# Update hook registry
python3 ~/.claude/hooks/hook_registry.py --update

# Optimize context cache
python3 ~/.claude/hooks/context_accumulator.py --optimize
```

## 🆘 Support & Resources

### Documentation

- **Framework Overview**: `README.md`
- **Command Reference**: `COMMANDS.md` 
- **Hook Architecture**: `Docs/HOOK_ARCHITECTURE.md`
- **Performance Guide**: `wave_performance_metrics.json`

### Community

- **Issues**: Report at project repository
- **Discussions**: Framework development discussions
- **Updates**: Follow project releases

### Enterprise Support

For enterprise deployments:
- Managed policy configuration
- Custom hook development
- Performance optimization consulting
- Security audit and compliance

---

## 🎉 Congratulations!

SuperClaude Framework v3.0 is now installed globally and ready to enhance your Claude Code experience across all projects. The intelligent routing, wave orchestration, and compound intelligence features are now available wherever you use Claude Code.

**Next Steps:**
1. Try the `/analyze --comprehensive` command in any project
2. Experiment with wave mode using `--wave-mode` flag
3. Explore advanced features like `--delegate` and `--seq`
4. Monitor performance using built-in analytics

Welcome to the future of AI-assisted development with SuperClaude Framework! 🚀