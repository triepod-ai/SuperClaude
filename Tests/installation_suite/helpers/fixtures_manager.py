#!/usr/bin/env python3
"""
Test fixtures manager for SuperClaude installation testing.

Manages test data, mock configurations, and fixture generation.
"""

import json
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Union


class FixturesManager:
    """Manages test fixtures and mock data."""
    
    def __init__(self, fixtures_dir: Optional[Path] = None):
        """Initialize fixtures manager.
        
        Args:
            fixtures_dir: Directory containing test fixtures
        """
        self.fixtures_dir = fixtures_dir or Path(__file__).parent.parent / "fixtures"
        self.fixtures_dir.mkdir(exist_ok=True)
        
    def create_mock_features_config(self, components: List[str] = None) -> Dict[str, Any]:
        """Create mock features configuration.
        
        Args:
            components: List of components to include
            
        Returns:
            Mock features configuration
        """
        components = components or ["core", "hooks", "commands", "mcp"]
        
        config = {}
        
        if "core" in components:
            config["core"] = {
                "name": "Core Framework",
                "description": "Essential SuperClaude framework files",
                "required": True,
                "recommended": True,
                "dependencies": [],
                "installer": "core_installer.py",
                "files": [
                    "SuperClaude/Core/CLAUDE.md",
                    "SuperClaude/Core/COMMANDS.md",
                    "SuperClaude/Core/FLAGS.md",
                    "SuperClaude/Settings/settings.json"
                ],
                "target_files": [
                    "~/.claude/CLAUDE.md",
                    "~/.claude/COMMANDS.md", 
                    "~/.claude/FLAGS.md",
                    "~/.claude/settings.json"
                ]
            }
        
        if "hooks" in components:
            config["hooks"] = {
                "name": "Hook System",
                "description": "Event-driven enhancement system",
                "required": False,
                "recommended": True,
                "dependencies": ["core"],
                "installer": "hooks_installer.py",
                "files": [
                    "SuperClaude/Hooks/hook_registry.py",
                    "SuperClaude/Hooks/task_manager.py",
                    "SuperClaude/Hooks/wave_coordinator.py"
                ],
                "target_directory": "~/.claude/hooks/"
            }
        
        if "commands" in components:
            config["commands"] = {
                "name": "Commands Suite", 
                "description": "Enhanced slash commands",
                "required": False,
                "recommended": True,
                "dependencies": ["core"],
                "installer": "commands_installer.py",
                "files": [
                    "SuperClaude/Commands/analyze.md",
                    "SuperClaude/Commands/build.md",
                    "SuperClaude/Commands/improve.md"
                ],
                "target_directory": "~/.claude/commands/"
            }
        
        if "mcp" in components:
            config["mcp"] = {
                "name": "MCP Servers",
                "description": "Model Context Protocol servers",
                "required": False,
                "recommended": False,
                "dependencies": ["core"],
                "installer": "mcp_installer.py",
                "components": {
                    "sequential": {
                        "name": "Sequential Thinking",
                        "description": "Multi-step reasoning",
                        "package": "mcp-server-sequential-thinking",
                        "recommended": True
                    },
                    "context7": {
                        "name": "Context7 Documentation",
                        "description": "Documentation analysis",
                        "package": "mcp-server-context7",
                        "recommended": True
                    }
                }
            }
        
        return config
    
    def create_mock_requirements_config(self, 
                                      python_version: str = "3.12",
                                      node_version: str = "18") -> str:
        """Create mock REQUIREMENTS.txt content.
        
        Args:
            python_version: Python version requirement
            node_version: Node.js version requirement
            
        Returns:
            REQUIREMENTS.txt content as string
        """
        return f"""[general]
python_version={python_version}
node_version={node_version}
bash_version=4.0
claude_code=required
git=recommended
npm=required_for_mcp
python_modules=json,sys,time,pathlib,os,subprocess

[mcp_servers]
sequential_thinking=mcp-server-sequential-thinking
context7=mcp-server-context7

[validation]
python_check=python3 --version
node_check=node --version
claude_check=claude --version
"""
    
    def create_mock_settings_json(self, version: str = "3.0.0",
                                 mcp_servers: List[str] = None) -> Dict[str, Any]:
        """Create mock settings.json content.
        
        Args:
            version: SuperClaude version
            mcp_servers: List of MCP servers to configure
            
        Returns:
            Settings configuration dictionary
        """
        mcp_servers = mcp_servers or ["sequential", "context7"]
        
        settings = {
            "superclaude": {
                "version": version,
                "framework": {
                    "core_loaded": True,
                    "hooks_enabled": True,
                    "commands_available": True
                },
                "installation": {
                    "type": "standard",
                    "components": ["core", "hooks", "commands"]
                }
            }
        }
        
        if mcp_servers:
            settings["mcpServers"] = {}
            for server in mcp_servers:
                settings["mcpServers"][server] = {
                    "command": f"mcp-server-{server}",
                    "args": []
                }
        
        return settings
    
    def create_mock_source_files(self, temp_dir: Path) -> Path:
        """Create mock SuperClaude source file structure.
        
        Args:
            temp_dir: Temporary directory for mock files
            
        Returns:
            Path to created project directory
        """
        project_dir = temp_dir / "SuperClaude"
        
        # Create directory structure
        core_dir = project_dir / "Core"
        hooks_dir = project_dir / "Hooks"  
        commands_dir = project_dir / "Commands"
        settings_dir = project_dir / "Settings"
        
        for dir_path in [core_dir, hooks_dir, commands_dir, settings_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # Create core files
        (core_dir / "CLAUDE.md").write_text("# SuperClaude Framework\n\nCore documentation.")
        (core_dir / "COMMANDS.md").write_text("# Commands Reference\n\nCommand documentation.")
        (core_dir / "FLAGS.md").write_text("# Flags Reference\n\nFlag documentation.")
        
        # Create settings
        settings = self.create_mock_settings_json()
        (settings_dir / "settings.json").write_text(json.dumps(settings, indent=2))
        
        # Create hook files
        (hooks_dir / "hook_registry.py").write_text('''#!/usr/bin/env python3
"""Hook registry for SuperClaude framework."""

class HookRegistry:
    def __init__(self):
        self.hooks = {}
    
    def register(self, name, hook):
        self.hooks[name] = hook
''')
        
        (hooks_dir / "task_manager.py").write_text('''#!/usr/bin/env python3
"""Task management for SuperClaude."""

class TaskManager:
    def __init__(self):
        self.tasks = []
    
    def add_task(self, task):
        self.tasks.append(task)
''')
        
        (hooks_dir / "wave_coordinator.py").write_text('''#!/usr/bin/env python3
"""Wave coordination for SuperClaude."""

class WaveCoordinator:
    def __init__(self):
        self.waves = []
    
    def add_wave(self, wave):
        self.waves.append(wave)
''')
        
        # Create command files
        (commands_dir / "analyze.md").write_text('''# /analyze Command

## Purpose
Analyze code and systems for insights and improvements.

## Usage
```
/analyze [target] [flags]
```
''')
        
        (commands_dir / "build.md").write_text('''# /build Command

## Purpose  
Build and deploy applications with framework detection.

## Usage
```
/build [target] [flags]
```
''')
        
        (commands_dir / "improve.md").write_text('''# /improve Command

## Purpose
Improve code quality and performance systematically.

## Usage
```
/improve [target] [flags]
```
''')
        
        return project_dir
    
    def create_test_data_files(self) -> Dict[str, Path]:
        """Create test data files for fixtures.
        
        Returns:
            Dictionary mapping fixture names to file paths
        """
        fixtures = {}
        
        # Mock features.json
        features_config = self.create_mock_features_config()
        features_file = self.fixtures_dir / "mock_features.json"
        features_file.write_text(json.dumps(features_config, indent=2))
        fixtures["features"] = features_file
        
        # Mock REQUIREMENTS.txt
        requirements_content = self.create_mock_requirements_config()
        requirements_file = self.fixtures_dir / "mock_requirements.txt"
        requirements_file.write_text(requirements_content)
        fixtures["requirements"] = requirements_file
        
        # Mock settings.json
        settings_config = self.create_mock_settings_json()
        settings_file = self.fixtures_dir / "mock_settings.json"
        settings_file.write_text(json.dumps(settings_config, indent=2))
        fixtures["settings"] = settings_file
        
        return fixtures
    
    def get_test_scenarios(self) -> Dict[str, Dict[str, Any]]:
        """Get predefined test scenarios.
        
        Returns:
            Dictionary of test scenarios
        """
        return {
            "minimal_installation": {
                "components": ["core"],
                "installation_type": "standard",
                "expected_files": ["CLAUDE.md", "settings.json"]
            },
            "standard_installation": {
                "components": ["core", "hooks", "commands"],
                "installation_type": "standard",
                "expected_files": ["CLAUDE.md", "settings.json"],
                "expected_dirs": ["hooks", "commands"]
            },
            "development_installation": {
                "components": ["core", "hooks", "commands"],
                "installation_type": "development",
                "expected_files": ["CLAUDE.md", "settings.json"],
                "expected_dirs": ["hooks", "commands"],
                "expect_symlinks": True
            },
            "full_installation": {
                "components": ["core", "hooks", "commands", "mcp"],
                "installation_type": "standard",
                "mcp_servers": ["sequential", "context7"],
                "expected_files": ["CLAUDE.md", "settings.json"],
                "expected_dirs": ["hooks", "commands"]
            },
            "failed_installation": {
                "components": ["core"],
                "installation_type": "standard",
                "should_fail": ["copy_CLAUDE.md"],
                "expect_rollback": True
            },
            "permission_error": {
                "components": ["core"],
                "installation_type": "standard", 
                "should_fail": ["mkdir_.claude"],
                "expect_error": "Permission denied"
            },
            "missing_requirements": {
                "components": ["core"],
                "installation_type": "standard",
                "missing_commands": ["python3", "node"],
                "expect_error": "Requirements not met"
            }
        }
    
    def cleanup_fixtures(self):
        """Clean up generated fixture files."""
        if self.fixtures_dir.exists():
            for file_path in self.fixtures_dir.glob("mock_*"):
                if file_path.is_file():
                    file_path.unlink()


# Convenience functions for common fixture operations
def create_temp_project(components: List[str] = None) -> Path:
    """Create temporary SuperClaude project structure.
    
    Args:
        components: Components to include
        
    Returns:
        Path to temporary project directory
    """
    temp_dir = Path(tempfile.mkdtemp())
    manager = FixturesManager()
    project_dir = manager.create_mock_source_files(temp_dir)
    return project_dir


def create_mock_config_files(temp_dir: Path) -> Dict[str, Path]:
    """Create mock configuration files.
    
    Args:
        temp_dir: Directory for configuration files
        
    Returns:
        Dictionary mapping config names to file paths
    """
    manager = FixturesManager(temp_dir)
    return manager.create_test_data_files()