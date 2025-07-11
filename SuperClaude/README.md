# SuperClaude Framework

Professional AI-driven development framework for Claude Code with intelligent orchestration, persona system, and MCP integration.

## Directory Structure

```
SuperClaude/
├── Hooks/          # Python hooks for framework integration
├── Commands/       # Slash command definitions and documentation
├── Core/           # Core framework files (COMMANDS.md, FLAGS.md, etc.)
├── Settings/       # Configuration files and user profiles
```

## Core Components

### Hooks/ - Framework Integration
- **orchestration_engine.py**: Main orchestration logic
- **wave_coordinator.py**: Multi-stage execution management
- **mcp_coordinator.py**: MCP server integration
- **task_manager.py**: Task lifecycle management
- **quality_gates_coordinator.py**: Quality validation
- **performance_monitor.py**: Performance tracking
- **agent_manager.py**: Sub-agent delegation
- **synthesis_engine.py**: Result aggregation

### Commands/ - Slash Commands
- **analyze.md**: Multi-dimensional analysis commands
- **build.md**: Project building and deployment
- **improve.md**: Code quality enhancement
- **design.md**: System design and architecture
- **test.md**: Testing workflows and validation
- **troubleshoot.md**: Problem investigation

### Core/ - Framework Configuration
- **COMMANDS.md**: Command execution framework
- **FLAGS.md**: Flag system reference
- **MCP.md**: MCP server integration
- **MODES.md**: Operational modes (Task, Introspection, Token Efficiency)
- **PERSONAS.md**: Specialized AI personalities
- **ORCHESTRATOR.md**: Intelligent routing system
- **PRINCIPLES.md**: Development principles and philosophy
- **RULES.md**: Actionable operational rules

### Settings/ - Configuration Management
- **settings.json**: Global framework settings
- **project_settings.json**: Project-specific configuration

## Quick Start

1. Install dependencies: `./Scripts/check_requirements.sh`
2. Configure settings: `./Scripts/generate_config.py`
3. Test installation: `python Tests/comprehensive_test.py`

## Integration

The SuperClaude framework integrates with Claude Code through the global configuration system. Core files are referenced from the user's Claude configuration directory.

## Documentation

See the `Docs/` directory for detailed documentation:
- **GLOBAL_INSTALLATION.md**: Installation guide
- **HOOK_ARCHITECTURE.md**: Technical architecture
- **MIGRATION_STRATEGY.md**: Migration procedures
- **Plans/**: Development and enhancement plans