#!/usr/bin/env python3
"""
Mock system utilities for testing SuperClaude installation components.

Provides mock implementations of system validators, file operations, and process runners.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from unittest.mock import Mock, MagicMock, patch


class MockSystemValidator:
    """Mock system validator with configurable responses."""
    
    def __init__(self, 
                 commands_available: Dict[str, bool] = None,
                 command_versions: Dict[str, str] = None,
                 python_modules: Dict[str, bool] = None):
        """Initialize mock system validator.
        
        Args:
            commands_available: Commands that should be available
            command_versions: Version strings for commands
            python_modules: Python modules availability
        """
        self.commands_available = commands_available or {
            'python3': True,
            'node': True,
            'npm': True,
            'claude': True,
            'git': True,
            'bash': True
        }
        
        self.command_versions = command_versions or {
            'python3': 'Python 3.12.0',
            'node': 'v18.17.0',
            'npm': '9.8.1',
            'claude': 'claude 1.0.0',
            'git': 'git version 2.34.1',
            'bash': 'GNU bash, version 5.1.16'
        }
        
        self.python_modules = python_modules or {
            'json': True, 'sys': True, 'os': True, 'pathlib': True,
            'subprocess': True, 'time': True, 'threading': True,
            'logging': True, 'asyncio': True, 'typing': True
        }
    
    def check_command_exists(self, command: str) -> bool:
        """Check if a command exists."""
        return self.commands_available.get(command, False)
    
    def get_command_version(self, command: str, version_flag: str = "--version") -> Optional[str]:
        """Get version of a command."""
        if self.check_command_exists(command):
            return self.command_versions.get(command)
        return None
    
    def check_python_modules(self, modules: List[str]) -> Dict[str, bool]:
        """Check if Python modules are available."""
        return {module: self.python_modules.get(module, False) for module in modules}
    
    def validate_version(self, current: str, minimum: str) -> bool:
        """Validate version against minimum requirement."""
        try:
            def parse_version(v: str) -> List[int]:
                # Extract numeric version parts
                import re
                v = re.sub(r'^[^\d]*', '', v)
                parts = v.split('.')
                return [int(part) for part in parts if part.isdigit()]
            
            current_parts = parse_version(current)
            min_parts = parse_version(minimum)
            
            # Pad shorter version with zeros
            max_len = max(len(current_parts), len(min_parts))
            current_parts.extend([0] * (max_len - len(current_parts)))
            min_parts.extend([0] * (max_len - len(min_parts)))
            
            return current_parts >= min_parts
        except:
            return False
    
    def check_disk_space(self, path: str, required_mb: int) -> bool:
        """Check if sufficient disk space is available."""
        return True  # Always return True in tests
    
    def check_permissions(self, path: str, mode: str = "rw") -> bool:
        """Check file/directory permissions."""
        return True  # Always return True in tests


class MockFileOperations:
    """Mock file operations with operation logging."""
    
    def __init__(self, should_fail: List[str] = None, dry_run: bool = False):
        """Initialize mock file operations.
        
        Args:
            should_fail: List of operations that should fail
            dry_run: Whether to run in dry-run mode
        """
        self.should_fail = should_fail or []
        self.dry_run = dry_run
        self.operations_log = []
        self.backup_dir = None
        
    def set_backup_dir(self, backup_dir: Union[str, Path]):
        """Set backup directory."""
        self.backup_dir = Path(backup_dir)
    
    def copy_file(self, source: Union[str, Path], target: Union[str, Path], 
                  backup: bool = True) -> bool:
        """Mock file copy operation."""
        operation = f"copy_{Path(source).name}"
        success = operation not in self.should_fail
        
        self.operations_log.append({
            'operation': 'copy',
            'source': str(source),
            'target': str(target),
            'success': success,
            'backup': backup
        })
        
        return success
    
    def create_symlink(self, source: Union[str, Path], target: Union[str, Path]) -> bool:
        """Mock symlink creation."""
        operation = f"symlink_{Path(source).name}"
        success = operation not in self.should_fail
        
        self.operations_log.append({
            'operation': 'symlink',
            'source': str(source),
            'target': str(target),
            'success': success
        })
        
        return success
    
    def create_directory(self, path: Union[str, Path]) -> bool:
        """Mock directory creation."""
        operation = f"mkdir_{Path(path).name}"
        success = operation not in self.should_fail
        
        self.operations_log.append({
            'operation': 'mkdir',
            'path': str(path),
            'success': success
        })
        
        return success
    
    def backup_file(self, file_path: Union[str, Path]) -> bool:
        """Mock file backup."""
        operation = f"backup_{Path(file_path).name}"
        success = operation not in self.should_fail
        
        self.operations_log.append({
            'operation': 'backup',
            'file': str(file_path),
            'success': success
        })
        
        return success
    
    def rollback_operations(self) -> bool:
        """Mock rollback of operations."""
        success = "rollback" not in self.should_fail
        
        if success:
            # Reverse the operations log
            self.operations_log.reverse()
            for op in self.operations_log:
                op['operation'] = f"rollback_{op['operation']}"
        
        return success
    
    def get_operations_count(self, operation_type: str) -> int:
        """Get count of specific operation type."""
        return len([op for op in self.operations_log if op['operation'] == operation_type])
    
    def get_failed_operations(self) -> List[Dict[str, Any]]:
        """Get list of failed operations."""
        return [op for op in self.operations_log if not op['success']]


class MockProcessRunner:
    """Mock process runner for external commands."""
    
    def __init__(self, command_responses: Dict[str, Dict[str, Any]] = None):
        """Initialize mock process runner.
        
        Args:
            command_responses: Command responses mapping
        """
        self.command_responses = command_responses or {}
        self.executed_commands = []
        
    def run(self, cmd: Union[str, List[str]], *args, **kwargs) -> Mock:
        """Mock subprocess.run."""
        cmd_str = " ".join(cmd) if isinstance(cmd, list) else cmd
        self.executed_commands.append(cmd_str)
        
        # Find matching response
        response = None
        for pattern, resp in self.command_responses.items():
            if pattern in cmd_str or any(part in cmd_str for part in pattern.split()):
                response = resp
                break
        
        # Default response
        if response is None:
            response = {'returncode': 0, 'stdout': 'Success', 'stderr': ''}
        
        # Create mock result
        result = Mock()
        result.returncode = response['returncode']
        result.stdout = response['stdout']
        result.stderr = response['stderr']
        
        return result
    
    def add_command_response(self, command: str, returncode: int = 0, 
                           stdout: str = "", stderr: str = ""):
        """Add a command response."""
        self.command_responses[command] = {
            'returncode': returncode,
            'stdout': stdout,
            'stderr': stderr
        }
    
    def get_executed_commands(self) -> List[str]:
        """Get list of executed commands."""
        return self.executed_commands.copy()
    
    def command_was_executed(self, command: str) -> bool:
        """Check if a command was executed."""
        return any(command in cmd for cmd in self.executed_commands)


class MockProgressTracker:
    """Mock progress tracker for testing."""
    
    def __init__(self):
        """Initialize mock progress tracker."""
        self.current_step = 0
        self.total_steps = 0
        self.started = False
        self.finished = False
        self.updates = []
    
    def start(self, description: str, total_steps: int):
        """Start progress tracking."""
        self.started = True
        self.total_steps = total_steps
        self.current_step = 0
        self.updates.append(f"START: {description} ({total_steps} steps)")
    
    def update(self, steps: int = 1, message: str = ""):
        """Update progress."""
        self.current_step += steps
        self.updates.append(f"UPDATE: +{steps} steps - {message}")
    
    def finish(self, message: str = ""):
        """Finish progress tracking."""
        self.finished = True
        self.updates.append(f"FINISH: {message}")
    
    def get_progress_percentage(self) -> float:
        """Get current progress percentage."""
        if self.total_steps == 0:
            return 0.0
        return (self.current_step / self.total_steps) * 100
    
    def get_updates(self) -> List[str]:
        """Get all progress updates."""
        return self.updates.copy()


class MockInteractiveMenu:
    """Mock interactive menu for testing user interactions."""
    
    def __init__(self, responses: List[str] = None):
        """Initialize mock menu.
        
        Args:
            responses: Pre-configured responses for menu interactions
        """
        self.responses = responses or ["1"]
        self.response_index = 0
        self.options = []
        self.interactions = []
    
    def add_option(self, key: str, title: str, description: str = "", 
                   action=None, enabled: bool = True, recommended: bool = False):
        """Add menu option."""
        self.options.append({
            'key': key,
            'title': title,
            'description': description,
            'enabled': enabled,
            'recommended': recommended
        })
        return self  # For method chaining
    
    def show(self, prompt: str = "Select an option") -> Optional[str]:
        """Show menu and return response."""
        self.interactions.append(f"MENU: {prompt}")
        
        if self.response_index < len(self.responses):
            response = self.responses[self.response_index]
            self.response_index += 1
            self.interactions.append(f"RESPONSE: {response}")
            return response
        
        return "1"  # Default response
    
    def show_multi_select(self, prompt: str = "Select options") -> List[str]:
        """Show multi-select menu."""
        self.interactions.append(f"MULTI_SELECT: {prompt}")
        
        if self.response_index < len(self.responses):
            response = self.responses[self.response_index]
            self.response_index += 1
            self.interactions.append(f"MULTI_RESPONSE: {response}")
            return response.split() if isinstance(response, str) else response
        
        return ["core"]  # Default response
    
    def get_interactions(self) -> List[str]:
        """Get all menu interactions."""
        return self.interactions.copy()


def create_mock_installer_environment(installer_type: str = "core",
                                    should_fail: List[str] = None) -> Dict[str, Any]:
    """Create a complete mock environment for installer testing.
    
    Args:
        installer_type: Type of installer to configure for
        should_fail: List of operations that should fail
        
    Returns:
        Dictionary of mock objects
    """
    return {
        'system_validator': MockSystemValidator(),
        'file_operations': MockFileOperations(should_fail=should_fail),
        'process_runner': MockProcessRunner(),
        'progress_tracker': MockProgressTracker(),
        'interactive_menu': MockInteractiveMenu()
    }