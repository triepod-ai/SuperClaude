#!/usr/bin/env python3
"""
Custom assertions for SuperClaude installation testing.

Provides specialized assertion functions for installation validation.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Union


class InstallationAssertions:
    """Custom assertions for installation validation."""
    
    @staticmethod
    def assert_component_installed(claude_dir: Path, component: str, 
                                 expected_files: List[str] = None):
        """Assert that a component is properly installed.
        
        Args:
            claude_dir: Claude directory path
            component: Component name
            expected_files: List of expected files for the component
        """
        if component == "core":
            # Core component assertions
            assert (claude_dir / "CLAUDE.md").exists(), "CLAUDE.md not found"
            assert (claude_dir / "settings.json").exists(), "settings.json not found"
            
            # Validate settings.json content
            settings_file = claude_dir / "settings.json"
            with open(settings_file, 'r') as f:
                settings = json.load(f)
            assert "superclaude" in settings, "superclaude key not found in settings"
            assert settings["superclaude"].get("version"), "version not found in settings"
            
        elif component == "hooks":
            # Hook system assertions
            hooks_dir = claude_dir / "hooks"
            assert hooks_dir.exists(), "hooks directory not found"
            assert hooks_dir.is_dir(), "hooks is not a directory"
            
            # Check for essential hook files
            essential_hooks = ["hook_registry.py", "task_manager.py", "wave_coordinator.py"]
            for hook_file in essential_hooks:
                hook_path = hooks_dir / hook_file
                assert hook_path.exists(), f"Essential hook {hook_file} not found"
            
        elif component == "commands":
            # Commands suite assertions
            commands_dir = claude_dir / "commands"
            assert commands_dir.exists(), "commands directory not found"
            assert commands_dir.is_dir(), "commands is not a directory"
            
            # Check for essential command files
            essential_commands = ["analyze.md", "build.md", "improve.md"]
            for cmd_file in essential_commands:
                cmd_path = commands_dir / cmd_file
                assert cmd_path.exists(), f"Essential command {cmd_file} not found"
            
        elif component == "mcp":
            # MCP servers assertions - check settings for MCP configuration
            settings_file = claude_dir / "settings.json"
            if settings_file.exists():
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
                mcp_config = settings.get("mcpServers", {})
                assert len(mcp_config) > 0, "No MCP servers configured"
        
        # Check expected files if provided
        if expected_files:
            for file_path in expected_files:
                full_path = claude_dir / file_path if not Path(file_path).is_absolute() else Path(file_path)
                assert full_path.exists(), f"Expected file not found: {file_path}"
    
    @staticmethod
    def assert_installation_type(claude_dir: Path, installation_type: str):
        """Assert the installation type (standard vs development).
        
        Args:
            claude_dir: Claude directory path
            installation_type: Expected installation type ('standard' or 'development')
        """
        claude_md = claude_dir / "CLAUDE.md"
        
        if installation_type == "development":
            assert claude_md.is_symlink(), "Expected symlink for development installation"
        elif installation_type == "standard":
            assert not claude_md.is_symlink(), "Expected regular file for standard installation"
        else:
            raise ValueError(f"Unknown installation type: {installation_type}")
    
    @staticmethod
    def assert_settings_valid(claude_dir: Path, expected_version: str = "3.0.0"):
        """Assert that settings.json is valid and contains expected configuration.
        
        Args:
            claude_dir: Claude directory path
            expected_version: Expected SuperClaude version
        """
        settings_file = claude_dir / "settings.json"
        assert settings_file.exists(), "settings.json not found"
        
        try:
            with open(settings_file, 'r') as f:
                settings = json.load(f)
        except json.JSONDecodeError as e:
            raise AssertionError(f"Invalid JSON in settings.json: {e}")
        
        # Check SuperClaude configuration
        assert "superclaude" in settings, "superclaude configuration not found"
        sc_config = settings["superclaude"]
        
        assert sc_config.get("version") == expected_version, \
            f"Expected version {expected_version}, got {sc_config.get('version')}"
        
        # Check for required configuration sections
        required_sections = ["framework", "hooks", "commands"]
        for section in required_sections:
            if section in sc_config:
                assert isinstance(sc_config[section], dict), \
                    f"Section {section} should be a dictionary"
    
    @staticmethod
    def assert_mcp_servers_configured(claude_dir: Path, expected_servers: List[str]):
        """Assert that MCP servers are properly configured.
        
        Args:
            claude_dir: Claude directory path
            expected_servers: List of expected server names
        """
        settings_file = claude_dir / "settings.json"
        assert settings_file.exists(), "settings.json required for MCP configuration"
        
        with open(settings_file, 'r') as f:
            settings = json.load(f)
        
        mcp_config = settings.get("mcpServers", {})
        
        for server in expected_servers:
            assert server in mcp_config, f"MCP server {server} not configured"
            server_config = mcp_config[server]
            assert "command" in server_config, f"Command not specified for {server}"
    
    @staticmethod
    def assert_hooks_importable(claude_dir: Path):
        """Assert that hook modules can be imported.
        
        Args:
            claude_dir: Claude directory path
        """
        import sys
        hooks_dir = claude_dir / "hooks"
        assert hooks_dir.exists(), "hooks directory not found"
        
        # Add hooks directory to Python path
        hooks_str = str(hooks_dir)
        if hooks_str not in sys.path:
            sys.path.insert(0, hooks_str)
        
        # Try importing essential hooks
        essential_hooks = ["hook_registry", "task_manager", "wave_coordinator"]
        
        for hook_name in essential_hooks:
            hook_file = hooks_dir / f"{hook_name}.py"
            if hook_file.exists():
                try:
                    __import__(hook_name)
                except ImportError as e:
                    raise AssertionError(f"Failed to import {hook_name}: {e}")
    
    @staticmethod
    def assert_commands_valid(claude_dir: Path):
        """Assert that command files are valid markdown with proper structure.
        
        Args:
            claude_dir: Claude directory path
        """
        commands_dir = claude_dir / "commands"
        assert commands_dir.exists(), "commands directory not found"
        
        for cmd_file in commands_dir.glob("*.md"):
            try:
                content = cmd_file.read_text()
                
                # Basic markdown validation
                assert content.startswith('#'), f"{cmd_file.name} should start with markdown header"
                
                # Check for command name in content
                command_name = cmd_file.stem
                assert f"/{command_name}" in content, \
                    f"Command name /{command_name} not found in {cmd_file.name}"
                
            except Exception as e:
                raise AssertionError(f"Command file validation failed for {cmd_file.name}: {e}")


class FileSystemAssertions:
    """Assertions for file system operations during installation."""
    
    @staticmethod
    def assert_directory_structure(base_dir: Path, expected_structure: Dict[str, Any]):
        """Assert that directory structure matches expectations.
        
        Args:
            base_dir: Base directory to check
            expected_structure: Expected directory structure as nested dict
        """
        def check_structure(current_dir: Path, structure: Dict[str, Any]):
            for name, content in structure.items():
                path = current_dir / name
                
                if isinstance(content, dict):
                    # It's a directory
                    assert path.exists(), f"Directory not found: {path}"
                    assert path.is_dir(), f"Expected directory, found file: {path}"
                    check_structure(path, content)
                elif isinstance(content, str):
                    # It's a file with expected content
                    assert path.exists(), f"File not found: {path}"
                    assert path.is_file(), f"Expected file, found directory: {path}"
                    if content:  # If content is specified, check it
                        actual_content = path.read_text()
                        assert content in actual_content, \
                            f"Expected content not found in {path}"
                else:
                    # It's just a file (content is None/True)
                    assert path.exists(), f"File not found: {path}"
                    assert path.is_file(), f"Expected file, found directory: {path}"
        
        check_structure(base_dir, expected_structure)
    
    @staticmethod
    def assert_file_permissions(file_path: Path, expected_mode: Optional[int] = None):
        """Assert that file has correct permissions.
        
        Args:
            file_path: Path to file
            expected_mode: Expected permission mode (octal)
        """
        assert file_path.exists(), f"File not found: {file_path}"
        
        if expected_mode is not None:
            import stat
            actual_mode = stat.S_IMODE(file_path.stat().st_mode)
            assert actual_mode == expected_mode, \
                f"Expected permissions {oct(expected_mode)}, got {oct(actual_mode)}"
    
    @staticmethod
    def assert_symlink_target(symlink_path: Path, expected_target: Path):
        """Assert that symlink points to expected target.
        
        Args:
            symlink_path: Path to symlink
            expected_target: Expected target path
        """
        assert symlink_path.exists(), f"Symlink not found: {symlink_path}"
        assert symlink_path.is_symlink(), f"Expected symlink: {symlink_path}"
        
        actual_target = symlink_path.resolve()
        expected_target = expected_target.resolve()
        
        assert actual_target == expected_target, \
            f"Symlink target mismatch. Expected: {expected_target}, Got: {actual_target}"
    
    @staticmethod
    def assert_backup_created(backup_dir: Path, original_file: str):
        """Assert that backup was created for original file.
        
        Args:
            backup_dir: Backup directory
            original_file: Original file name
        """
        assert backup_dir.exists(), f"Backup directory not found: {backup_dir}"
        
        # Look for backup file (may have timestamp suffix)
        backup_files = list(backup_dir.glob(f"{original_file}*"))
        assert len(backup_files) > 0, f"No backup found for {original_file}"
    
    @staticmethod
    def assert_cleanup_complete(temp_dirs: List[Path]):
        """Assert that temporary directories have been cleaned up.
        
        Args:
            temp_dirs: List of temporary directories that should be cleaned up
        """
        for temp_dir in temp_dirs:
            assert not temp_dir.exists(), f"Temporary directory not cleaned up: {temp_dir}"


# Convenience function for common installation assertions
def assert_successful_installation(claude_dir: Path, 
                                 components: List[str],
                                 installation_type: str = "standard"):
    """Assert that installation completed successfully.
    
    Args:
        claude_dir: Claude directory path
        components: List of installed components
        installation_type: Installation type (standard or development)
    """
    # Basic directory structure
    assert claude_dir.exists(), "Claude directory not found"
    assert claude_dir.is_dir(), "Claude directory is not a directory"
    
    # Component-specific assertions
    for component in components:
        InstallationAssertions.assert_component_installed(claude_dir, component)
    
    # Installation type
    if "core" in components:
        InstallationAssertions.assert_installation_type(claude_dir, installation_type)
        InstallationAssertions.assert_settings_valid(claude_dir)
    
    # Hooks importability
    if "hooks" in components:
        InstallationAssertions.assert_hooks_importable(claude_dir)
    
    # Commands validation
    if "commands" in components:
        InstallationAssertions.assert_commands_valid(claude_dir)