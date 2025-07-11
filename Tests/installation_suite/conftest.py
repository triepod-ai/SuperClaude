#!/usr/bin/env python3
"""
Pytest configuration and shared fixtures for SuperClaude installation testing.

Provides common fixtures, mock utilities, and test environment setup.
"""

import os
import sys
import tempfile
import shutil
import json
from pathlib import Path
from typing import Dict, Any, Generator
from unittest.mock import Mock, patch, MagicMock

import pytest

# Add project paths for imports
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "Scripts" / "utils"))
sys.path.insert(0, str(PROJECT_ROOT / "Scripts"))


@pytest.fixture
def temp_directory() -> Generator[Path, None, None]:
    """Create a temporary directory for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)


@pytest.fixture
def mock_claude_dir(temp_directory: Path) -> Path:
    """Create a mock .claude directory structure."""
    claude_dir = temp_directory / ".claude"
    claude_dir.mkdir(parents=True)
    
    # Create subdirectories
    (claude_dir / "hooks").mkdir()
    (claude_dir / "commands").mkdir()
    
    return claude_dir


@pytest.fixture
def mock_project_dir() -> Path:
    """Get the actual project directory for testing."""
    return PROJECT_ROOT


@pytest.fixture
def mock_features_config() -> Dict[str, Any]:
    """Provide mock features configuration."""
    return {
        "core": {
            "name": "Core Framework",
            "description": "Essential SuperClaude framework files",
            "required": True,
            "recommended": True,
            "dependencies": [],
            "installer": "core_installer.py",
            "files": [
                "SuperClaude/Core/CLAUDE.md",
                "SuperClaude/Settings/settings.json"
            ],
            "target_files": [
                "~/.claude/CLAUDE.md",
                "~/.claude/settings.json"
            ]
        },
        "hooks": {
            "name": "Hook System",
            "description": "Event-driven enhancement system",
            "required": False,
            "recommended": True,
            "dependencies": ["core"],
            "installer": "hooks_installer.py",
            "files": [
                "SuperClaude/Hooks/hook_registry.py",
                "SuperClaude/Hooks/task_manager.py"
            ],
            "target_directory": "~/.claude/hooks/"
        }
    }


@pytest.fixture
def mock_requirements_config() -> str:
    """Provide mock REQUIREMENTS.txt content."""
    return """[general]
python_version=3.12
node_version=18
bash_version=4.0
claude_code=required
git=recommended
npm=required_for_mcp
python_modules=json,sys,time,pathlib,os,subprocess

[mcp_servers]
sequential_thinking=mcp-server-sequential-thinking
context7=mcp-server-context7
magic=mcp-server-magic

[validation]
python_check=python3 --version
node_check=node --version
claude_check=claude --version
"""


@pytest.fixture
def mock_system_validator():
    """Mock system validator with configurable responses."""
    mock = Mock()
    mock.check_command_exists.return_value = True
    mock.get_command_version.return_value = "3.12.0"
    mock.validate_version.return_value = True
    mock.check_python_modules.return_value = {"json": True, "sys": True, "pathlib": True}
    return mock


@pytest.fixture
def mock_file_operations(mock_claude_dir: Path):
    """Mock file operations with safe testing environment."""
    from unittest.mock import Mock
    
    mock = Mock()
    mock.copy_file.return_value = True
    mock.create_symlink.return_value = True
    mock.create_directory.return_value = True
    mock.backup_file.return_value = True
    mock.rollback_operations.return_value = True
    mock.operations_log = []
    
    return mock


@pytest.fixture
def mock_progress_tracker():
    """Mock progress tracker for testing."""
    mock = Mock()
    mock.start.return_value = None
    mock.update.return_value = None
    mock.finish.return_value = None
    mock.current_step = 0
    mock.total_steps = 10
    return mock


@pytest.fixture
def mock_interactive_menu():
    """Mock interactive menu for testing user interactions."""
    mock = Mock()
    mock.add_option.return_value = mock  # For method chaining
    mock.show.return_value = "1"  # Default selection
    mock.show_multi_select.return_value = ["core", "hooks"]
    return mock


@pytest.fixture
def mock_colors():
    """Mock colors utility for testing output formatting."""
    mock = Mock()
    mock.info.side_effect = lambda x: f"[INFO] {x}"
    mock.success.side_effect = lambda x: f"[✓] {x}"
    mock.warning.side_effect = lambda x: f"[!] {x}"
    mock.error.side_effect = lambda x: f"[✗] {x}"
    mock.muted.side_effect = lambda x: x
    mock.header.side_effect = lambda x: x
    return mock


@pytest.fixture
def mock_subprocess_run():
    """Mock subprocess.run for testing external commands."""
    with patch('subprocess.run') as mock_run:
        # Default successful response
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Mock output"
        mock_result.stderr = ""
        mock_run.return_value = mock_result
        yield mock_run


@pytest.fixture
def mock_claude_cli():
    """Mock Claude Code CLI commands."""
    with patch('subprocess.run') as mock_run:
        def side_effect(cmd, *args, **kwargs):
            mock_result = Mock()
            
            if 'claude' in cmd and 'mcp' in cmd and 'list' in cmd:
                mock_result.returncode = 0
                mock_result.stdout = "sequential\ncontext7\nmagic\n"
                mock_result.stderr = ""
            elif 'claude' in cmd and '--version' in cmd:
                mock_result.returncode = 0
                mock_result.stdout = "claude 1.0.0"
                mock_result.stderr = ""
            else:
                mock_result.returncode = 0
                mock_result.stdout = "Success"
                mock_result.stderr = ""
            
            return mock_result
        
        mock_run.side_effect = side_effect
        yield mock_run


@pytest.fixture
def mock_npm_commands():
    """Mock npm package installation commands."""
    with patch('subprocess.run') as mock_run:
        def side_effect(cmd, *args, **kwargs):
            mock_result = Mock()
            
            if 'npm' in cmd and 'install' in cmd:
                mock_result.returncode = 0
                mock_result.stdout = "Package installed successfully"
                mock_result.stderr = ""
            elif 'npx' in cmd:
                mock_result.returncode = 0
                mock_result.stdout = "Server started"
                mock_result.stderr = ""
            else:
                mock_result.returncode = 0
                mock_result.stdout = "Success"
                mock_result.stderr = ""
            
            return mock_result
        
        mock_run.side_effect = side_effect
        yield mock_run


@pytest.fixture
def isolated_environment(temp_directory: Path, monkeypatch):
    """Create completely isolated test environment."""
    # Mock home directory
    mock_home = temp_directory / "home"
    mock_home.mkdir()
    monkeypatch.setenv("HOME", str(mock_home))
    
    # Mock Claude directory
    claude_dir = mock_home / ".claude"
    claude_dir.mkdir()
    
    # Mock system paths
    monkeypatch.setenv("PATH", "/usr/bin:/bin")
    
    return {
        "home": mock_home,
        "claude_dir": claude_dir,
        "temp_dir": temp_directory
    }


@pytest.fixture
def performance_monitor():
    """Monitor test performance and resource usage."""
    import time
    import psutil
    
    start_time = time.time()
    process = psutil.Process()
    start_memory = process.memory_info().rss
    
    yield
    
    end_time = time.time()
    end_memory = process.memory_info().rss
    
    duration = end_time - start_time
    memory_delta = end_memory - start_memory
    
    # Store metrics for reporting
    if hasattr(pytest, 'performance_metrics'):
        pytest.performance_metrics.append({
            'duration': duration,
            'memory_delta': memory_delta,
            'peak_memory': end_memory
        })


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers and settings."""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "performance: Performance tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "requires_network: Tests requiring network access")
    config.addinivalue_line("markers", "requires_claude: Tests requiring Claude CLI")
    
    # Initialize performance metrics collection
    pytest.performance_metrics = []


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add automatic markers."""
    for item in items:
        # Add markers based on test file location
        if "unit/" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration/" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "e2e/" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
        elif "performance/" in str(item.fspath):
            item.add_marker(pytest.mark.performance)
            item.add_marker(pytest.mark.slow)


def pytest_sessionfinish(session, exitstatus):
    """Generate performance report after test session."""
    if hasattr(pytest, 'performance_metrics') and pytest.performance_metrics:
        total_duration = sum(m['duration'] for m in pytest.performance_metrics)
        max_memory = max(m['peak_memory'] for m in pytest.performance_metrics)
        
        print(f"\n=== Performance Summary ===")
        print(f"Total test duration: {total_duration:.2f}s")
        print(f"Peak memory usage: {max_memory / 1024 / 1024:.2f}MB")
        print(f"Tests monitored: {len(pytest.performance_metrics)}")