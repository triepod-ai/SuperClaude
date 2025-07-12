#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Integration Validator

Validates dependencies and integration between installer components
to ensure proper installation order and consistency.
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any
from enum import Enum

try:
    from .logger import SuperClaudeLogger, LogLevel
    logger = SuperClaudeLogger("superclaude.integration_validator")
except ImportError:
    # Fallback logger
    class FallbackLogger:
        def info(self, msg): print(f"[INFO] {msg}")
        def error(self, msg): print(f"[ERROR] {msg}")
        def warning(self, msg): print(f"[WARNING] {msg}")
        def success(self, msg): print(f"[SUCCESS] {msg}")
        def debug(self, msg): pass
    logger = FallbackLogger()


class InstallerComponent(Enum):
    """Installer components with dependencies."""
    CORE = "core"  # Core framework files
    SETTINGS = "settings"  # Settings.json configuration
    HOOKS = "hooks"  # Hook system
    COMMANDS = "commands"  # Command suite
    MCP = "mcp"  # MCP servers


class IntegrationValidator:
    """Validates integration between installer components."""
    
    # Component dependencies - what each component requires
    DEPENDENCIES = {
        InstallerComponent.CORE: set(),  # No dependencies
        InstallerComponent.SETTINGS: {InstallerComponent.CORE},  # Requires core
        InstallerComponent.HOOKS: {InstallerComponent.CORE, InstallerComponent.SETTINGS},
        InstallerComponent.COMMANDS: {InstallerComponent.CORE, InstallerComponent.SETTINGS},
        InstallerComponent.MCP: {InstallerComponent.CORE, InstallerComponent.SETTINGS}
    }
    
    # Required directory structure for each component
    REQUIRED_DIRECTORIES = {
        InstallerComponent.CORE: [
            "~/.claude",
            "~/.claude/backup"
        ],
        InstallerComponent.HOOKS: [
            "~/.claude/hooks"
        ],
        InstallerComponent.COMMANDS: [
            "~/.claude/commands"
        ],
        InstallerComponent.MCP: []  # No specific directories
    }
    
    # Required files for each component to function
    REQUIRED_FILES = {
        InstallerComponent.CORE: [
            "~/.claude/CLAUDE.md"
        ],
        InstallerComponent.SETTINGS: [
            "~/.claude/settings.json"
        ],
        InstallerComponent.HOOKS: [
            "~/.claude/hooks/__init__.py",
            "~/.claude/hooks/hook_registry.py"
        ],
        InstallerComponent.COMMANDS: [],  # Commands are optional
        InstallerComponent.MCP: []  # MCP config is in settings.json
    }
    
    def __init__(self, claude_dir: Path, project_dir: Path):
        """Initialize integration validator.
        
        Args:
            claude_dir: Claude global directory (~/.claude)
            project_dir: SuperClaude project directory
        """
        self.claude_dir = claude_dir
        self.project_dir = project_dir
        self.validation_results: Dict[str, List[str]] = {}
    
    def validate_installation_order(self, planned_components: List[InstallerComponent]) -> Tuple[bool, List[str]]:
        """Validate that components will be installed in correct order.
        
        Args:
            planned_components: List of components to install in order
            
        Returns:
            Tuple of (success, list of errors)
        """
        errors = []
        installed = set()
        
        for component in planned_components:
            # Check if all dependencies are met
            missing_deps = self.DEPENDENCIES[component] - installed
            if missing_deps:
                dep_names = [dep.value for dep in missing_deps]
                errors.append(
                    f"{component.value} requires {', '.join(dep_names)} to be installed first"
                )
            
            installed.add(component)
        
        if errors:
            logger.error("Installation order validation failed")
            for error in errors:
                logger.error(f"  - {error}")
        else:
            logger.success("Installation order validation passed")
        
        return len(errors) == 0, errors
    
    def validate_component_prerequisites(self, component: InstallerComponent) -> Tuple[bool, List[str]]:
        """Validate that prerequisites for a component are met.
        
        Args:
            component: Component to validate
            
        Returns:
            Tuple of (success, list of errors)
        """
        errors = []
        
        # Check dependencies are installed
        for dep in self.DEPENDENCIES[component]:
            if not self._is_component_installed(dep):
                errors.append(f"Dependency {dep.value} is not installed")
        
        # Check required directories exist
        for dir_path in self.REQUIRED_DIRECTORIES.get(component, []):
            expanded_path = Path(dir_path).expanduser()
            if not expanded_path.exists():
                errors.append(f"Required directory does not exist: {dir_path}")
        
        # For components that depend on others, check their files
        if component in [InstallerComponent.HOOKS, InstallerComponent.COMMANDS, InstallerComponent.MCP]:
            # Check core files exist
            for file_path in self.REQUIRED_FILES[InstallerComponent.CORE]:
                expanded_path = Path(file_path).expanduser()
                if not expanded_path.exists():
                    errors.append(f"Core file missing: {file_path}")
            
            # Check settings.json exists
            settings_path = self.claude_dir / "settings.json"
            if not settings_path.exists():
                errors.append("settings.json not found")
        
        if errors:
            logger.warning(f"Prerequisites for {component.value} not met:")
            for error in errors:
                logger.warning(f"  - {error}")
        else:
            logger.success(f"Prerequisites for {component.value} validated")
        
        return len(errors) == 0, errors
    
    def validate_hooks_directory_structure(self) -> Tuple[bool, List[str]]:
        """Validate that hooks directory has proper structure.
        
        Returns:
            Tuple of (success, list of errors)
        """
        errors = []
        hooks_dir = self.claude_dir / "hooks"
        
        if not hooks_dir.exists():
            errors.append("Hooks directory does not exist")
            return False, errors
        
        # Check for __init__.py
        init_file = hooks_dir / "__init__.py"
        if not init_file.exists():
            errors.append("Missing __init__.py in hooks directory")
        
        # Check permissions
        if not hooks_dir.is_dir():
            errors.append("Hooks path exists but is not a directory")
        
        # Check write permissions
        try:
            test_file = hooks_dir / ".test_write"
            test_file.touch()
            test_file.unlink()
        except Exception as e:
            errors.append(f"No write permission in hooks directory: {e}")
        
        if errors:
            logger.error("Hooks directory validation failed")
            for error in errors:
                logger.error(f"  - {error}")
        else:
            logger.success("Hooks directory structure validated")
        
        return len(errors) == 0, errors
    
    def validate_settings_integration(self) -> Tuple[bool, List[str]]:
        """Validate settings.json integration with other components.
        
        Returns:
            Tuple of (success, list of errors)
        """
        errors = []
        settings_file = self.claude_dir / "settings.json"
        
        if not settings_file.exists():
            errors.append("settings.json does not exist")
            return False, errors
        
        try:
            with open(settings_file, 'r') as f:
                settings = json.load(f)
            
            # Validate SuperClaude section
            if "superclaude" not in settings:
                errors.append("Missing 'superclaude' section in settings.json")
            else:
                sc_config = settings["superclaude"]
                required_fields = ["version", "framework", "components"]
                for field in required_fields:
                    if field not in sc_config:
                        errors.append(f"Missing required field 'superclaude.{field}'")
            
            # Validate hooks configuration if hooks are installed
            if (self.claude_dir / "hooks").exists():
                if "hooks" not in settings:
                    errors.append("Hooks installed but no 'hooks' configuration in settings.json")
            
            # Validate environment variables
            if "env" in settings:
                env_vars = settings["env"]
                required_vars = ["SUPERCLAUDE_VERSION", "SUPERCLAUDE_HOOKS_ENABLED"]
                for var in required_vars:
                    if var not in env_vars:
                        errors.append(f"Missing required environment variable: {var}")
            else:
                errors.append("No environment variables configured")
            
            # Validate MCP servers if configured
            if "enabledMcpjsonServers" in settings:
                mcp_servers = settings["enabledMcpjsonServers"]
                if not isinstance(mcp_servers, list):
                    errors.append("enabledMcpjsonServers must be a list")
                else:
                    # Check for SuperClaude MCP servers
                    superclaude_servers = ["sequential-thinking", "context7", "magic", 
                                         "playwright", "puppeteer"]
                    installed_sc_servers = [s for s in mcp_servers if s in superclaude_servers]
                    logger.info(f"Found {len(installed_sc_servers)} SuperClaude MCP servers")
            
        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON in settings.json: {e}")
        except Exception as e:
            errors.append(f"Error reading settings.json: {e}")
        
        if errors:
            logger.error("Settings integration validation failed")
            for error in errors:
                logger.error(f"  - {error}")
        else:
            logger.success("Settings integration validated")
        
        return len(errors) == 0, errors
    
    def validate_cross_component_consistency(self) -> Tuple[bool, List[str]]:
        """Validate consistency across all installed components.
        
        Returns:
            Tuple of (success, list of errors)
        """
        errors = []
        
        # Check version consistency
        versions = self._collect_versions()
        if len(set(versions.values())) > 1:
            errors.append(f"Version mismatch detected: {versions}")
        
        # Check file permissions consistency
        permission_issues = self._check_permissions_consistency()
        errors.extend(permission_issues)
        
        # Check symlink consistency for development mode
        if self._is_development_mode():
            symlink_issues = self._check_symlink_consistency()
            errors.extend(symlink_issues)
        
        if errors:
            logger.error("Cross-component consistency validation failed")
            for error in errors:
                logger.error(f"  - {error}")
        else:
            logger.success("Cross-component consistency validated")
        
        return len(errors) == 0, errors
    
    def _is_component_installed(self, component: InstallerComponent) -> bool:
        """Check if a component is installed."""
        # Check for required files
        for file_path in self.REQUIRED_FILES.get(component, []):
            expanded_path = Path(file_path).expanduser()
            if not expanded_path.exists():
                return False
        
        # Additional checks for specific components
        if component == InstallerComponent.SETTINGS:
            # Check if settings.json has SuperClaude config
            settings_file = self.claude_dir / "settings.json"
            if settings_file.exists():
                try:
                    with open(settings_file, 'r') as f:
                        settings = json.load(f)
                    return "superclaude" in settings
                except Exception:
                    return False
        
        return True
    
    def _collect_versions(self) -> Dict[str, str]:
        """Collect version information from various components."""
        versions = {}
        
        # Check settings.json
        settings_file = self.claude_dir / "settings.json"
        if settings_file.exists():
            try:
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
                if "superclaude" in settings and "version" in settings["superclaude"]:
                    versions["settings"] = settings["superclaude"]["version"]
            except Exception:
                pass
        
        # Check environment variables
        if "env" in locals():
            import os
            if "SUPERCLAUDE_VERSION" in os.environ:
                versions["env"] = os.environ["SUPERCLAUDE_VERSION"]
        
        return versions
    
    def _check_permissions_consistency(self) -> List[str]:
        """Check for permission consistency issues."""
        issues = []
        
        # Check all SuperClaude files have consistent permissions
        for file_path in self.claude_dir.rglob("*"):
            if file_path.is_file():
                # Check if file is readable
                if not file_path.stat().st_mode & 0o400:
                    issues.append(f"File not readable: {file_path}")
                
                # Python files should be executable
                if file_path.suffix == ".py" and file_path.parent.name == "hooks":
                    if not file_path.stat().st_mode & 0o100:
                        issues.append(f"Hook file not executable: {file_path}")
        
        return issues
    
    def _is_development_mode(self) -> bool:
        """Check if installation is in development mode."""
        # Check if any core files are symlinks
        core_files = ["CLAUDE.md", "COMMANDS.md", "FLAGS.md"]
        for filename in core_files:
            file_path = self.claude_dir / filename
            if file_path.exists() and file_path.is_symlink():
                return True
        return False
    
    def _check_symlink_consistency(self) -> List[str]:
        """Check symlink consistency in development mode."""
        issues = []
        
        # All core files should be symlinks or all should be regular files
        core_files = ["CLAUDE.md", "COMMANDS.md", "FLAGS.md", "MCP.md", 
                     "MODES.md", "ORCHESTRATOR.md", "PERSONAS.md", 
                     "PRINCIPLES.md", "RULES.md"]
        
        symlink_count = 0
        regular_count = 0
        
        for filename in core_files:
            file_path = self.claude_dir / filename
            if file_path.exists():
                if file_path.is_symlink():
                    symlink_count += 1
                else:
                    regular_count += 1
        
        if symlink_count > 0 and regular_count > 0:
            issues.append(
                f"Mixed installation detected: {symlink_count} symlinks and "
                f"{regular_count} regular files. All should be consistent."
            )
        
        return issues
    
    def generate_validation_report(self) -> Dict[str, Any]:
        """Generate comprehensive validation report.
        
        Returns:
            Dictionary with validation results
        """
        report = {
            "timestamp": Path.ctime(Path.cwd()),
            "claude_dir": str(self.claude_dir),
            "project_dir": str(self.project_dir),
            "components": {},
            "cross_component_validation": {},
            "recommendations": []
        }
        
        # Validate each component
        for component in InstallerComponent:
            success, errors = self.validate_component_prerequisites(component)
            report["components"][component.value] = {
                "installed": self._is_component_installed(component),
                "prerequisites_met": success,
                "errors": errors
            }
        
        # Cross-component validation
        hooks_valid, hooks_errors = self.validate_hooks_directory_structure()
        settings_valid, settings_errors = self.validate_settings_integration()
        consistency_valid, consistency_errors = self.validate_cross_component_consistency()
        
        report["cross_component_validation"] = {
            "hooks_directory": {"valid": hooks_valid, "errors": hooks_errors},
            "settings_integration": {"valid": settings_valid, "errors": settings_errors},
            "consistency": {"valid": consistency_valid, "errors": consistency_errors}
        }
        
        # Generate recommendations
        if not self._is_component_installed(InstallerComponent.CORE):
            report["recommendations"].append("Install core framework first")
        
        if not settings_valid:
            report["recommendations"].append("Fix settings.json integration issues")
        
        if not consistency_valid:
            report["recommendations"].append("Resolve cross-component consistency issues")
        
        return report