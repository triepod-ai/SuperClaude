#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Core Framework Installer

Installs the essential SuperClaude framework files and configurations.
Handles both standard (copy) and development (symlink) installations.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add utils to path for imports
utils_path = str(Path(__file__).parent.parent / "utils")
sys.path.insert(0, utils_path)

try:
    from colors import Colors
    from progress import ProgressTracker, MultiStageProgress
    from file_ops import FileOperations
    from validation import SystemValidator
    from path_security import SecureInstaller, PathTraversalError
    from schema_validator import ConfigurationValidator
    from logger import LoggerMixin, get_logger
    from installation_state import InstallationStateManager, InstallationPhase
    from integration_validator import IntegrationValidator, InstallerComponent
    from error_handler import ErrorHandler, ErrorContext, ErrorType
    from retry_handler import file_retry
    SCHEMA_VALIDATION_AVAILABLE = True
    ENHANCED_LOGGING_AVAILABLE = True
    ERROR_HANDLING_AVAILABLE = True
except ImportError:
    # Fallback imports for when modules can't be loaded
    print("Warning: Some utilities not available, using fallbacks")
    SCHEMA_VALIDATION_AVAILABLE = False
    ENHANCED_LOGGING_AVAILABLE = False
    ERROR_HANDLING_AVAILABLE = False
    
    class Colors:
        def info(self, msg): return f"\033[0;34m{msg}\033[0m"
        def success(self, msg): return f"\033[0;32m{msg}\033[0m"
        def warning(self, msg): return f"\033[1;33m{msg}\033[0m"
        def error(self, msg): return f"\033[0;31m{msg}\033[0m"
        def header(self, msg): return f"\033[1;34m{msg}\033[0m"
    
    class ProgressTracker:
        def start(self, desc, total): pass
        def update(self, n, desc=""): pass
        def finish(self): pass
    
    class FileOperations:
        def copy_file(self, src, dst):
            try:
                import shutil
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                return True
            except Exception as e:
                print(f"Error copying {src} to {dst}: {e}")
                return False
                
        def create_symlink(self, src, dst):
            try:
                dst.parent.mkdir(parents=True, exist_ok=True)
                if dst.exists() or dst.is_symlink():
                    dst.unlink()
                dst.symlink_to(src)
                return True
            except Exception as e:
                print(f"Error creating symlink {src} to {dst}: {e}")
                return False
    
    class SystemValidator:
        def validate_permissions(self, path): return True
    
    class ConfigurationValidator:
        def validate_settings_config(self, file_path):
            return True, [], {}
        def log_validation_event(self, event, path, success, details=""):
            print(f"Schema validation: {event} - {path} - {'Success' if success else 'Failed'}")
    
    class SecureInstaller:
        def __init__(self, project_dir): 
            # In fallback mode, still do basic validation
            project_path = Path(project_dir).resolve()
            # Basic security check - reject obvious traversal attempts
            if '..' in str(project_path) or str(project_path).startswith('/etc'):
                raise ValueError(f"Invalid project directory: {project_path}")
            self.project_dir = project_path
            self.claude_dir = Path.home() / ".claude"
        def secure_path(self, path_input, base_dir=None): 
            result = Path(path_input).resolve()
            # Basic security check in fallback mode
            if '..' in str(result) or '/etc' in str(result):
                raise PathTraversalError(f"Invalid path: {result}")
            return result
        def secure_file_operation(self, source, target, operation="copy"): 
            return self.secure_path(source), self.secure_path(target)
        def secure_mkdir(self, dir_path): 
            path = self.secure_path(dir_path)
            path.mkdir(parents=True, exist_ok=True)
            return path
    
    class PathTraversalError(Exception):
        pass
    
    class ErrorHandler:
        def handle_error(self, error, context): return error
        def display_error(self, error, verbose=False): print(f"Error: {error}")
    
    class ErrorContext:
        def __init__(self, operation, component, details=None):
            self.operation = operation
            self.component = component
            self.details = details or {}
    
    class ErrorType:
        FILE_SYSTEM = "filesystem"
        CONFIGURATION = "configuration"
        NETWORK = "network"
    
    class MultiStageProgress:
        def __init__(self): pass
        def add_stage(self, name, steps, weight=1.0): pass
        def start(self): pass
        def start_stage(self): return True
        def update_stage(self, steps=1, message=None): pass
        def complete_stage(self, message=None): pass
        def finish(self): pass
    
    def file_retry(func): return func


class CoreInstaller(SecureInstaller, LoggerMixin if 'LoggerMixin' in globals() else object):
    """Core framework installer with security validation and enhanced logging."""
    
    def __init__(self, project_dir: str, installation_type: str = "standard"):
        """Initialize core installer.
        
        Args:
            project_dir: SuperClaude project directory
            installation_type: "standard" or "development"
        """
        try:
            # Initialize secure installer base class
            super().__init__(project_dir)
            self.installation_type = installation_type
            self.version = "3.0.0"
            
            # Initialize state manager and integration validator if available
            if 'InstallationStateManager' in globals():
                self.state_manager = InstallationStateManager(self.claude_dir, self.project_dir)
            else:
                self.state_manager = None
                
            if 'IntegrationValidator' in globals():
                self.integration_validator = IntegrationValidator(self.claude_dir, self.project_dir)
            else:
                self.integration_validator = None
                
        except (ValueError, PathTraversalError) as e:
            raise ValueError(f"Security validation failed: {e}")
        
        # Initialize utilities
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.file_ops = FileOperations()
        self.validator = SystemValidator()
        
        # Initialize schema validator
        if SCHEMA_VALIDATION_AVAILABLE:
            self.schema_validator = ConfigurationValidator()
        else:
            self.schema_validator = ConfigurationValidator()
        
        # Load feature configuration
        self.feature_config = self._load_feature_config()
        
    def _load_feature_config(self) -> Dict[str, Any]:
        """Load core feature configuration with schema validation."""
        try:
            config_file = self.secure_path(self.project_dir / "Scripts" / "config" / "features.json")
            
            # Validate configuration with schema
            if SCHEMA_VALIDATION_AVAILABLE:
                success, errors, config_data = self.schema_validator.validate_features_config(config_file)
                if not success:
                    error_msg = f"Features configuration validation failed: {'; '.join(errors)}"
                    self.log_error(error_msg)
                    return self._get_default_config()
                
                self.log_info("Features configuration schema validation passed")
                return config_data.get("core", {})
            else:
                # Fallback to basic JSON loading
                with open(config_file, 'r') as f:
                    features = json.load(f)
                    return features.get("core", {})
                    
        except (FileNotFoundError, json.JSONDecodeError, PathTraversalError) as e:
            self.log_error(f"Failed to load feature configuration: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default core configuration if features.json not available."""
        return {
            "name": "Core Framework",
            "files": [
                "SuperClaude/Core/CLAUDE.md",
                "SuperClaude/Core/COMMANDS.md", 
                "SuperClaude/Core/FLAGS.md",
                "SuperClaude/Core/MCP.md",
                "SuperClaude/Core/MODES.md",
                "SuperClaude/Core/ORCHESTRATOR.md",
                "SuperClaude/Core/PERSONAS.md",
                "SuperClaude/Core/PRINCIPLES.md",
                "SuperClaude/Core/RULES.md",
                "SuperClaude/Settings/settings.json"
            ],
            "target_files": [
                "~/.claude/CLAUDE.md",
                "~/.claude/COMMANDS.md",
                "~/.claude/FLAGS.md", 
                "~/.claude/MCP.md",
                "~/.claude/MODES.md",
                "~/.claude/ORCHESTRATOR.md",
                "~/.claude/PERSONAS.md",
                "~/.claude/PRINCIPLES.md",
                "~/.claude/RULES.md",
                "~/.claude/settings.json"
            ]
        }
    
    def log_info(self, message: str, **kwargs):
        """Log info message."""
        if hasattr(self, '_logger'):
            super().log_info(message, **kwargs)
        else:
            print(self.colors.info(f"[INFO] {message}"))
    
    def log_success(self, message: str, **kwargs):
        """Log success message."""
        if hasattr(self, '_logger'):
            super().log_success(message, **kwargs)
        else:
            print(self.colors.success(f"[✓] {message}"))
    
    def log_warning(self, message: str, **kwargs):
        """Log warning message."""
        if hasattr(self, '_logger'):
            super().log_warning(message, **kwargs)
        else:
            print(self.colors.warning(f"[!] {message}"))
    
    def log_error(self, message: str, **kwargs):
        """Log error message."""
        if hasattr(self, '_logger'):
            super().log_error(message, **kwargs)
        else:
            print(self.colors.error(f"[✗] {message}"))
    
    def validate_prerequisites(self) -> bool:
        """Validate prerequisites for core installation."""
        self.log_info("Validating prerequisites...")
        
        # Track phase if state manager is available
        if self.state_manager:
            self.state_manager.start_phase(InstallationPhase.PREREQUISITES)
        
        errors = []
        
        # Check if project directory exists
        if not self.project_dir.exists():
            errors.append(f"Project directory not found: {self.project_dir}")
        
        # Check if source files exist
        source_files = self.feature_config.get("files", [])
        for file_path in source_files:
            try:
                source_file = self.secure_path(self.project_dir / file_path)
                if not source_file.exists():
                    errors.append(f"Source file not found: {source_file}")
            except PathTraversalError as e:
                errors.append(f"Invalid source file path {file_path}: {e}")
        
        # Check Claude directory permissions
        try:
            claude_dir = self.secure_mkdir(self.claude_dir)
            test_file = self.secure_path(claude_dir / ".test_write")
            test_file.write_text("test")
            test_file.unlink()
        except (Exception, PathTraversalError) as e:
            errors.append(f"Cannot write to Claude directory {self.claude_dir}: {e}")
        
        if errors:
            for error in errors:
                self.log_error(error)
            return False
        
        self.log_success("Prerequisites validated")
        
        # Complete phase tracking
        if self.state_manager:
            self.state_manager.complete_phase(InstallationPhase.PREREQUISITES)
            
        return True
    
    def create_directory_structure(self) -> bool:
        """Create necessary directory structure for global Claude Code installation.
        
        Directory Structure:
        ~/.claude/           - Core framework files (CLAUDE.md, settings.json, etc.)
        ~/.claude/hooks/     - Hook system Python files 
        ~/.claude/commands/  - Enhanced slash command definitions
        ~/.claude/backup/    - Backup storage for installations
        """
        self.log_info("Creating global directory structure...")
        
        # Track phase if state manager is available
        if self.state_manager:
            self.state_manager.start_phase(InstallationPhase.DIRECTORIES)
        
        # Define directories with clear purpose
        directories = [
            (self.claude_dir, "Core framework directory"),
            (self.claude_dir / "hooks", "Hook system directory"),
            (self.claude_dir / "commands", "Commands suite directory"), 
            (self.claude_dir / "backup", "Backup storage directory")
        ]
        
        try:
            for directory, description in directories:
                secure_dir = self.secure_mkdir(directory)
                self.log_success(f"Created {description}: {secure_dir}")
                
                # Track created directory
                if self.state_manager:
                    self.state_manager.add_directory_created(secure_dir)
            
            # Validate directory permissions
            for directory, _ in directories:
                secure_dir = self.secure_path(directory)
                if not os.access(secure_dir, os.W_OK):
                    self.log_error(f"No write permission for: {secure_dir}")
                    return False
            
            # Complete phase tracking
            if self.state_manager:
                self.state_manager.complete_phase(InstallationPhase.DIRECTORIES)
                
            return True
            
        except Exception as e:
            self.log_error(f"Failed to create directories: {e}")
            
            # Track failure
            if self.state_manager:
                self.state_manager.fail_phase(InstallationPhase.DIRECTORIES, str(e))
                
            return False
    
    def install_core_files(self) -> bool:
        """Install core framework files to global ~/.claude/ directory.
        
        Files installed to ~/.claude/ root:
        - CLAUDE.md, COMMANDS.md, FLAGS.md, MCP.md, MODES.md
        - ORCHESTRATOR.md, PERSONAS.md, PRINCIPLES.md, RULES.md  
        
        Note: settings.json is handled separately by settings_installer.py
        """
        self.log_info(f"Installing core files to global directory ({self.installation_type} mode)...")
        
        # Track phase if state manager is available
        if self.state_manager:
            self.state_manager.start_phase(InstallationPhase.CORE_FILES)
        
        source_files = self.feature_config.get("files", [])
        target_files = self.feature_config.get("target_files", [])
        
        if len(source_files) != len(target_files):
            self.log_error("Mismatch between source and target file lists")
            return False
        
        # Filter out settings.json - it's handled by settings_installer
        filtered_files = []
        for source_rel, target_rel in zip(source_files, target_files):
            if not source_rel.endswith("settings.json"):
                filtered_files.append((source_rel, target_rel))
        
        # Validate all target files point to ~/.claude/ root for core files
        for _, target_file in filtered_files:
            try:
                # Expand ~ to home directory and create proper Path object
                if target_file.startswith("~"):
                    expanded_path = Path(target_file).expanduser()
                else:
                    expanded_path = Path(target_file)
                
                # Resolve to absolute path to handle any relative components
                absolute_path = expanded_path.resolve()
                
                # Ensure target is within ~/.claude/ directory
                claude_dir = Path.home() / ".claude"
                
                # Check if the absolute path is within the claude directory
                try:
                    # This will raise ValueError if absolute_path is not under claude_dir
                    relative_path = absolute_path.relative_to(claude_dir)
                    
                    # Check for any parent directory references in the relative path
                    # Using parts is more reliable than string operations
                    if any(part == ".." for part in relative_path.parts):
                        self.log_error(f"Invalid path traversal attempt in target: {target_file}")
                        return False
                        
                except ValueError:
                    # Path is not within claude_dir
                    self.log_error(f"Target path not within ~/.claude/ directory: {target_file}")
                    return False
                
                # Additional security validation using the secure_path method
                self.secure_path(str(absolute_path))
                
            except (PathTraversalError, OSError) as e:
                self.log_error(f"Invalid target file path {target_file}: {e}")
                return False
        
        if not filtered_files:
            self.log_info("No core files to install (settings.json handled separately)")
            return True
        
        self.progress.start("Installing core files", len(filtered_files))
        
        success_count = 0
        
        for i, (source_rel, target_rel) in enumerate(filtered_files):
            try:
                # Validate paths securely
                source_path, target_path = self.secure_file_operation(
                    self.project_dir / source_rel,
                    target_rel.replace("~", str(Path.home())),
                    "symlink" if self.installation_type == "development" else "copy"
                )
                
                # Install file based on installation type
                if self.installation_type == "development":
                    # Create symlink for development mode
                    if self.file_ops.create_symlink(source_path, target_path):
                        success_count += 1
                else:
                    # Copy file for standard mode
                    if self.file_ops.copy_file(source_path, target_path):
                        success_count += 1
                
                # Track file creation
                if self.state_manager and target_path.exists():
                    self.state_manager.add_file_created(target_path)
                        
            except PathTraversalError as e:
                self.log_error(f"Security validation failed for {source_rel} -> {target_rel}: {e}")
                continue
            
            self.progress.update(1, f"Installing {source_path.name}")
        
        self.progress.finish()
        
        if success_count == len(filtered_files):
            self.log_success(f"All {len(filtered_files)} core files installed successfully")
            
            # Complete phase tracking
            if self.state_manager:
                self.state_manager.complete_phase(InstallationPhase.CORE_FILES)
                
            return True
        else:
            self.log_error(f"Only {success_count}/{len(filtered_files)} files installed successfully")
            
            # Track failure
            if self.state_manager:
                self.state_manager.fail_phase(InstallationPhase.CORE_FILES, 
                                            f"Only {success_count}/{len(filtered_files)} files installed")
                
            return False
    
    def install_settings(self) -> bool:
        """Install SuperClaude configuration into settings.json using smart merging."""
        self.log_info("Installing SuperClaude settings configuration...")
        
        # Validate core is installed first
        if self.integration_validator:
            success, errors = self.integration_validator.validate_component_prerequisites(
                InstallerComponent.SETTINGS
            )
            if not success:
                self.log_error("Settings prerequisites not met:")
                for error in errors:
                    self.log_error(f"  - {error}")
                return False
        
        # Track phase if state manager is available
        if self.state_manager:
            self.state_manager.start_phase(InstallationPhase.SETTINGS)
        
        try:
            # Import and use settings installer
            settings_installer_path = str(self.secure_path(self.project_dir / "Scripts" / "installers"))
            sys.path.insert(0, settings_installer_path)
            
            from settings_installer import SettingsInstaller
            
            # Validate that the SettingsInstaller class is properly imported
            if not hasattr(SettingsInstaller, 'install'):
                self.log_error("SettingsInstaller missing required 'install' method")
                return False
            
            settings_installer = SettingsInstaller(str(self.project_dir))
            success = settings_installer.install(self.installation_type, self.state_manager)
            
            if success:
                self.log_success("Settings configuration installed successfully")
                
                # Complete phase tracking
                if self.state_manager:
                    self.state_manager.complete_phase(InstallationPhase.SETTINGS)
                    
                return True
            else:
                self.log_error("Failed to install settings configuration")
                
                # Track failure
                if self.state_manager:
                    self.state_manager.fail_phase(InstallationPhase.SETTINGS, "Settings installation failed")
                    
                return False
                
        except ImportError as e:
            self.log_error(f"Could not import settings installer: {e}")
            self.log_warning("Settings installation skipped - will need manual configuration")
            return False
        except Exception as e:
            self.log_error(f"Error during settings installation: {e}")
            return False
    
    def configure_environment(self) -> bool:
        """Configure environment variables."""
        self.log_info("Validating environment configuration...")
        
        # Check if settings.json exists and is valid
        try:
            settings_file = self.secure_path(self.claude_dir / "settings.json")
        except PathTraversalError as e:
            self.log_error(f"Invalid settings file path: {e}")
            return False
        
        if not settings_file.exists():
            self.log_error("settings.json not found after installation")
            return False
        
        # Validate settings.json with schema
        if SCHEMA_VALIDATION_AVAILABLE:
            success, errors, settings_data = self.schema_validator.validate_settings_config(settings_file)
            if not success:
                error_msg = f"Settings.json validation failed: {'; '.join(errors)}"
                self.log_error(error_msg)
                return False
            
            self.log_success("Settings.json schema validation passed")
        else:
            self.log_info("Schema validation not available, performing basic checks")
        
        try:
            with open(settings_file, 'r') as f:
                settings = json.load(f)
            
            # Validate essential settings
            if "superclaude" not in settings:
                self.log_error("Invalid settings.json: missing superclaude section")
                return False
            
            if settings.get("superclaude", {}).get("version") != self.version:
                self.log_warning(f"Version mismatch in settings.json")
            
            # Check environment variables
            env_vars = settings.get("env", {})
            missing_vars = []
            
            for var_name, var_value in env_vars.items():
                if var_name not in os.environ:
                    missing_vars.append(f"{var_name}={var_value}")
            
            if missing_vars:
                self.log_warning("Missing environment variables:")
                for var in missing_vars:
                    print(f"  {var}")
                print("\nTo set these variables permanently, add to your shell profile:")
                print("For bash users (~/.bashrc or ~/.bash_profile):")
                for var in missing_vars:
                    print(f"  export {var}")
                print("For zsh users (~/.zshrc):")
                for var in missing_vars:
                    print(f"  export {var}")
                print("Then restart your terminal or run 'source ~/.bashrc' (or ~/.zshrc)")
            
            self.log_success("Environment configuration validated")
            return True
            
        except json.JSONDecodeError as e:
            self.log_error(f"Invalid settings.json format: {e}")
            return False
        except Exception as e:
            self.log_error(f"Failed to configure environment: {e}")
            return False
    
    def run_post_install_validation(self) -> bool:
        """Run post-installation validation."""
        self.log_info("Running post-installation validation...")
        
        # Check all target files exist
        target_files = self.feature_config.get("target_files", [])
        missing_files = []
        
        for target_rel in target_files:
            try:
                target_path = self.secure_path(target_rel.replace("~", str(Path.home())))
                if not target_path.exists():
                    missing_files.append(target_path)
            except PathTraversalError as e:
                self.log_error(f"Invalid target file path {target_rel}: {e}")
                missing_files.append(f"INVALID: {target_rel}")
        
        if missing_files:
            self.log_error("Missing files after installation:")
            for file in missing_files:
                print(f"  {file}")
            return False
        
        # Test settings.json loading
        try:
            settings_file = self.secure_path(self.claude_dir / "settings.json")
            with open(settings_file, 'r') as f:
                json.load(f)
            self.log_success("settings.json validation passed")
        except Exception as e:
            self.log_error(f"settings.json validation failed: {e}")
            return False
        
        # Check permissions
        for target_rel in target_files:
            try:
                target_path = self.secure_path(target_rel.replace("~", str(Path.home())))
                if not os.access(target_path, os.R_OK):
                    self.log_error(f"Cannot read installed file: {target_path}")
                    return False
            except PathTraversalError as e:
                self.log_error(f"Invalid target file path {target_rel}: {e}")
                return False
        
        self.log_success("Post-installation validation passed")
        return True
    
    def show_completion_summary(self):
        """Show installation completion summary."""
        print(f"\n{self.colors.header('Global Core Framework Installation Complete!')}")
        print("=" * 60)
        
        print(f"\nInstallation Strategy: Global-First")
        print(f"Installation Type: {self.installation_type.title()}")
        print(f"Primary Directory: {self.claude_dir}")
        print(f"Framework Version: v{self.version}")
        
        # Show directory structure
        print(f"\nGlobal Directory Structure:")
        print(f"  {self.claude_dir}/           (core framework files)")
        print(f"  {self.claude_dir}/hooks/     (hook system)")
        print(f"  {self.claude_dir}/commands/  (command definitions)")
        print(f"  {self.claude_dir}/backup/    (backup storage)")
        
        # List installed files
        target_files = self.feature_config.get("target_files", [])
        print(f"\nInstalled Files ({len(target_files)}):")
        for target_rel in target_files:
            try:
                target_path = self.secure_path(target_rel.replace("~", str(Path.home())))
                if self.installation_type == "development":
                    file_type = "symlink" if target_path.is_symlink() else "file"
                else:
                    file_type = "file"
                print(f"  ✓ {target_path.name} ({file_type})")
            except PathTraversalError:
                print(f"  ✗ {target_rel} (invalid path)")
        
        print(f"\n{self.colors.success('Core framework is ready!')}")
        
        print("\nNext Steps:")
        print("  1. Install additional components (hooks, commands)")
        print("  2. Configure MCP servers (optional)")
        print("  3. Test framework: claude config list")
    
    def install(self) -> bool:
        """Run complete core installation process."""
        try:
            self.log_info(f"Starting core framework installation ({self.installation_type} mode)")
            
            # Initialize installation tracking
            if self.state_manager:
                self.state_manager.start_phase(InstallationPhase.INIT)
            
            # Validate prerequisites
            if not self.validate_prerequisites():
                return False
            
            # Create directory structure
            if not self.create_directory_structure():
                return False
            
            # Install core files
            if not self.install_core_files():
                return False
            
            # Install settings configuration
            if not self.install_settings():
                return False
            
            # Configure environment
            if not self.configure_environment():
                return False
            
            # Run validation
            if not self.run_post_install_validation():
                return False
            
            # Show completion summary
            self.show_completion_summary()
            
            # Mark installation as complete
            if self.state_manager:
                self.state_manager.complete_phase(InstallationPhase.COMPLETE)
                self.log_info("Installation state saved for potential rollback")
            
            return True
            
        except KeyboardInterrupt:
            print("\n\nInstallation interrupted by user.")
            
            # Attempt rollback
            if self.state_manager:
                self.log_warning("Attempting to rollback partial installation...")
                if self.state_manager.rollback():
                    self.log_success("Rollback completed")
                else:
                    self.log_error("Rollback failed - manual cleanup may be required")
                    
            return False
        except Exception as e:
            self.log_error(f"Unexpected error during installation: {e}")
            import traceback
            traceback.print_exc()
            
            # Attempt rollback
            if self.state_manager:
                self.log_warning("Attempting to rollback partial installation...")
                if self.state_manager.rollback():
                    self.log_success("Rollback completed")
                else:
                    self.log_error("Rollback failed - manual cleanup may be required")
                    
            return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="SuperClaude Core Framework Installer")
    parser.add_argument("--project-dir", required=True, 
                       help="SuperClaude project directory")
    parser.add_argument("--installation-type", choices=["standard", "development"],
                       default="standard", help="Installation type")
    
    args = parser.parse_args()
    
    try:
        installer = CoreInstaller(args.project_dir, args.installation_type)
        success = installer.install()
    except ValueError as e:
        print(f"Error: {e}")
        return 1
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())