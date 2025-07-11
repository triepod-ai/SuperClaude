#!/usr/bin/env python3
"""
Test environment management utilities.

Provides isolated testing environments with controlled system state.
"""

import os
import sys
import tempfile
import shutil
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Union
from contextlib import contextmanager
from unittest.mock import patch, Mock


class TestEnvironment:
    """Base test environment with controlled state management."""
    
    def __init__(self, temp_dir: Optional[Path] = None):
        """Initialize test environment.
        
        Args:
            temp_dir: Optional temporary directory to use
        """
        self.temp_dir = temp_dir or Path(tempfile.mkdtemp())
        self.original_env = dict(os.environ)
        self.patches = []
        self.mock_commands = {}
        
    def setup(self):
        """Set up the test environment."""
        # Create mock home directory
        self.home_dir = self.temp_dir / "home"
        self.home_dir.mkdir(parents=True, exist_ok=True)
        
        # Create mock Claude directory
        self.claude_dir = self.home_dir / ".claude"
        self.claude_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.claude_dir / "hooks").mkdir(exist_ok=True)
        (self.claude_dir / "commands").mkdir(exist_ok=True)
        
        # Set environment variables
        os.environ["HOME"] = str(self.home_dir)
        os.environ["CLAUDE_HOME"] = str(self.claude_dir)
        
    def teardown(self):
        """Clean up the test environment."""
        # Restore original environment
        os.environ.clear()
        os.environ.update(self.original_env)
        
        # Clean up patches
        for p in self.patches:
            p.stop()
        self.patches.clear()
        
        # Clean up temporary directory
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def add_mock_command(self, command: str, returncode: int = 0, 
                        stdout: str = "", stderr: str = ""):
        """Add a mock command response.
        
        Args:
            command: Command to mock
            returncode: Return code for the command
            stdout: Standard output
            stderr: Standard error
        """
        self.mock_commands[command] = {
            'returncode': returncode,
            'stdout': stdout,
            'stderr': stderr
        }
    
    def create_file(self, path: Union[str, Path], content: str = ""):
        """Create a file in the test environment.
        
        Args:
            path: File path relative to temp_dir
            content: File content
        """
        file_path = self.temp_dir / path if isinstance(path, str) else path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)
        return file_path
    
    def create_directory(self, path: Union[str, Path]) -> Path:
        """Create a directory in the test environment.
        
        Args:
            path: Directory path relative to temp_dir
            
        Returns:
            Path to created directory
        """
        dir_path = self.temp_dir / path if isinstance(path, str) else path
        dir_path.mkdir(parents=True, exist_ok=True)
        return dir_path
    
    def __enter__(self):
        """Context manager entry."""
        self.setup()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.teardown()


class IsolatedEnvironment(TestEnvironment):
    """Completely isolated test environment with mocked system calls."""
    
    def __init__(self, temp_dir: Optional[Path] = None):
        """Initialize isolated environment."""
        super().__init__(temp_dir)
        self.mock_subprocess = None
        self.mock_shutil = None
        self.mock_pathlib = None
        
    def setup(self):
        """Set up isolated environment with system mocking."""
        super().setup()
        
        # Mock subprocess.run
        self.mock_subprocess = patch('subprocess.run', side_effect=self._mock_subprocess_run)
        self.patches.append(self.mock_subprocess)
        self.mock_subprocess.start()
        
        # Mock file operations that might affect real system
        self.mock_shutil = patch('shutil.copy2', side_effect=self._mock_copy)
        self.patches.append(self.mock_shutil)
        self.mock_shutil.start()
        
        # Add default mock commands
        self._setup_default_commands()
    
    def _setup_default_commands(self):
        """Set up default mock command responses."""
        self.add_mock_command("python3 --version", 0, "Python 3.12.0", "")
        self.add_mock_command("node --version", 0, "v18.17.0", "")
        self.add_mock_command("npm --version", 0, "9.8.1", "")
        self.add_mock_command("bash --version", 0, "GNU bash, version 5.1.16", "")
        self.add_mock_command("claude --version", 0, "claude 1.0.0", "")
        self.add_mock_command("git --version", 0, "git version 2.34.1", "")
        
    def _mock_subprocess_run(self, cmd, *args, **kwargs):
        """Mock subprocess.run with configured responses."""
        cmd_str = " ".join(cmd) if isinstance(cmd, list) else cmd
        
        # Check for exact matches first
        if cmd_str in self.mock_commands:
            response = self.mock_commands[cmd_str]
        else:
            # Check for partial matches
            response = None
            for mock_cmd, mock_response in self.mock_commands.items():
                if any(part in cmd_str for part in mock_cmd.split()):
                    response = mock_response
                    break
            
            # Default response if no match found
            if response is None:
                response = {'returncode': 0, 'stdout': 'Mock success', 'stderr': ''}
        
        # Create mock result
        mock_result = Mock()
        mock_result.returncode = response['returncode']
        mock_result.stdout = response['stdout']
        mock_result.stderr = response['stderr']
        
        return mock_result
    
    def _mock_copy(self, src, dst):
        """Mock file copy operations to stay within test environment."""
        src_path = Path(src)
        dst_path = Path(dst)
        
        # Only allow copies within test environment
        if not str(dst_path).startswith(str(self.temp_dir)):
            # Redirect to test environment
            dst_path = self.temp_dir / dst_path.name
        
        # Ensure destination directory exists
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Perform the copy if source exists and is within test environment
        if src_path.exists():
            shutil.copy2(src_path, dst_path)
        else:
            # Create mock file
            dst_path.write_text("Mock file content")
        
        return str(dst_path)


@contextmanager
def mock_system_environment(python_version: str = "3.12.0", 
                          node_version: str = "18.17.0",
                          has_claude: bool = True,
                          has_git: bool = True):
    """Context manager for mocking system environment.
    
    Args:
        python_version: Python version to mock
        node_version: Node.js version to mock
        has_claude: Whether Claude CLI is available
        has_git: Whether Git is available
    """
    with IsolatedEnvironment() as env:
        # Configure command responses
        env.add_mock_command("python3 --version", 0, f"Python {python_version}", "")
        env.add_mock_command("node --version", 0, f"v{node_version}", "")
        
        if has_claude:
            env.add_mock_command("claude --version", 0, "claude 1.0.0", "")
            env.add_mock_command("claude mcp list -s user", 0, "sequential\ncontext7\n", "")
        else:
            env.add_mock_command("claude --version", 127, "", "command not found")
        
        if has_git:
            env.add_mock_command("git --version", 0, "git version 2.34.1", "")
        else:
            env.add_mock_command("git --version", 127, "", "command not found")
        
        yield env


@contextmanager
def mock_installation_environment(components: List[str] = None):
    """Context manager for mocking installation environment.
    
    Args:
        components: List of components to pre-install
    """
    components = components or []
    
    with IsolatedEnvironment() as env:
        # Create mock project structure
        project_dir = env.create_directory("project")
        
        # Create SuperClaude source structure
        superclaude_dir = project_dir / "SuperClaude"
        core_dir = superclaude_dir / "Core"
        hooks_dir = superclaude_dir / "Hooks"
        commands_dir = superclaude_dir / "Commands"
        settings_dir = superclaude_dir / "Settings"
        
        for dir_path in [core_dir, hooks_dir, commands_dir, settings_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # Create mock source files
        env.create_file(core_dir / "CLAUDE.md", "# SuperClaude Framework")
        env.create_file(settings_dir / "settings.json", '{"superclaude": {"version": "3.0.0"}}')
        env.create_file(hooks_dir / "hook_registry.py", "# Hook registry")
        env.create_file(commands_dir / "analyze.md", "# /analyze command")
        
        # Pre-install components if requested
        for component in components:
            if component == "core":
                env.create_file(env.claude_dir / "CLAUDE.md", "# SuperClaude Framework")
                env.create_file(env.claude_dir / "settings.json", '{"superclaude": {"version": "3.0.0"}}')
            elif component == "hooks":
                env.create_file(env.claude_dir / "hooks" / "hook_registry.py", "# Hook registry")
            elif component == "commands":
                env.create_file(env.claude_dir / "commands" / "analyze.md", "# /analyze command")
        
        env.project_dir = project_dir
        yield env