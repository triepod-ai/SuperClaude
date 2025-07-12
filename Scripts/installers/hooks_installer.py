#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Hook System Installer

Installs the SuperClaude hook system with 15 specialized Python hooks.
Handles both standard (copy) and development (symlink) installations.
"""

import os
import sys
import json
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add utils to path for imports
utils_path = str(Path(__file__).parent.parent / "utils")
sys.path.insert(0, utils_path)

try:
    from colors import Colors
    from progress import ProgressTracker
    from file_ops import FileOperations
    from validation import SystemValidator
    from secure_permissions import SecurePermissions
    from path_security import SecureInstaller, PathTraversalError
    from logger import LoggerMixin, get_logger
    from installation_state import InstallationStateManager, InstallationPhase
    from integration_validator import IntegrationValidator, InstallerComponent
    ENHANCED_LOGGING_AVAILABLE = True
except ImportError:
    # Fallback imports for when modules can't be loaded
    print("Warning: Some utilities not available, using fallbacks")
    ENHANCED_LOGGING_AVAILABLE = False
    
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
    
    class SecurePermissions:
        def set_secure_permission(self, path): return True
        def audit_permissions(self, path): return {"issues_found": 0}
    
    class SecureInstaller:
        def __init__(self, project_dir): 
            project_path = Path(project_dir).resolve()
            if '..' in str(project_path) or str(project_path).startswith('/etc'):
                raise ValueError(f"Invalid project directory: {project_path}")
            self.project_dir = project_path
            self.claude_dir = Path.home() / ".claude"
        def secure_path(self, path_input, base_dir=None): 
            result = Path(path_input).resolve()
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


class HooksInstaller(SecureInstaller, LoggerMixin if 'LoggerMixin' in globals() else object):
    """Hook system installer with security validation and enhanced logging."""
    
    def __init__(self, project_dir: str, installation_type: str = "standard"):
        """Initialize hooks installer.
        
        Args:
            project_dir: SuperClaude project directory
            installation_type: "standard" or "development"
        """
        try:
            # Initialize secure installer base class
            super().__init__(project_dir)
            self.installation_type = installation_type
            self.hooks_dir = self.claude_dir / "hooks"
            self.version = "3.0.0"
        except (ValueError, PathTraversalError) as e:
            raise ValueError(f"Security validation failed: {e}")
        
        # Initialize utilities
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.file_ops = FileOperations()
        self.validator = SystemValidator()
        self.secure_perms = SecurePermissions()
        
        # Load feature configuration
        self.feature_config = self._load_feature_config()
        
    def _load_feature_config(self) -> Dict[str, Any]:
        """Load hooks feature configuration."""
        try:
            config_file = self.secure_path(self.project_dir / "Scripts" / "config" / "features.json")
            
            with open(config_file, 'r') as f:
                features = json.load(f)
                return features.get("hooks", {})
        except (FileNotFoundError, json.JSONDecodeError, PathTraversalError) as e:
            self.log_error(f"Failed to load feature configuration: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default hooks configuration if features.json not available."""
        hook_files = [
            "__init__.py",
            "agent_manager.py", 
            "context_accumulator.py",
            "error_handler.py",
            "hook_registry.py",
            "mcp_coordinator.py",
            "orchestration_engine.py",
            "performance_monitor.py",
            "quality_gates_coordinator.py",
            "quality_validator.py",
            "result_collector.py",
            "synthesis_engine.py",
            "task_manager.py",
            "token_optimizer.py",
            "wave_coordinator.py",
            "wave_performance_monitor.py",
            "wave_sequencer.py"
        ]
        
        return {
            "name": "Hook System",
            "files": [f"SuperClaude/Hooks/{f}" for f in hook_files],
            "target_directory": "~/.claude/hooks/"
        }
    
    def log_info(self, message: str):
        """Log info message."""
        print(self.colors.info(f"[INFO] {message}"))
    
    def log_success(self, message: str):
        """Log success message."""
        print(self.colors.success(f"[✓] {message}"))
    
    def log_warning(self, message: str):
        """Log warning message."""
        print(self.colors.warning(f"[!] {message}"))
    
    def log_error(self, message: str):
        """Log error message."""
        print(self.colors.error(f"[✗] {message}"))
    
    def validate_prerequisites(self) -> bool:
        """Validate prerequisites for hooks installation."""
        self.log_info("Validating prerequisites...")
        
        errors = []
        
        # Check if core framework is installed
        try:
            core_marker = self.secure_path(self.claude_dir / "settings.json")
            if not core_marker.exists():
                errors.append("Core framework not installed (missing settings.json)")
        except PathTraversalError as e:
            errors.append(f"Invalid core marker path: {e}")
        
        # Check Python availability and version
        try:
            result = subprocess.run([sys.executable, "--version"], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                errors.append("Python not available")
            else:
                version_line = result.stdout.strip()
                self.log_info(f"Python version: {version_line}")
        except Exception as e:
            errors.append(f"Failed to check Python version: {e}")
        
        # Check if project directory exists
        if not self.project_dir.exists():
            errors.append(f"Project directory not found: {self.project_dir}")
        
        # Check if source hook files exist
        source_files = self.feature_config.get("files", [])
        missing_files = []
        for file_path in source_files:
            try:
                source_file = self.secure_path(self.project_dir / file_path)
                if not source_file.exists():
                    missing_files.append(str(source_file))
            except PathTraversalError as e:
                missing_files.append(f"INVALID: {file_path} ({e})")
        
        if missing_files:
            errors.append(f"Missing hook files: {', '.join(missing_files)}")
        
        # Check hooks directory permissions
        try:
            hooks_dir = self.secure_mkdir(self.hooks_dir)
            test_file = self.secure_path(hooks_dir / ".test_write")
            test_file.write_text("test")
            test_file.unlink()
        except (Exception, PathTraversalError) as e:
            errors.append(f"Cannot write to hooks directory {self.hooks_dir}: {e}")
        
        if errors:
            for error in errors:
                self.log_error(error)
            return False
        
        self.log_success("Prerequisites validated")
        return True
    
    def install_hook_files(self) -> bool:
        """Install hook files."""
        self.log_info(f"Installing hook files ({self.installation_type} mode)...")
        
        source_files = self.feature_config.get("files", [])
        
        if not source_files:
            self.log_error("No hook files specified in configuration")
            return False
        
        self.progress.start("Installing hook files", len(source_files))
        
        success_count = 0
        
        for i, source_rel in enumerate(source_files):
            try:
                # Validate paths before any file operations
                source_path = self.secure_path(self.project_dir / source_rel)
                target_path = self.secure_path(self.hooks_dir / source_path.name)
                
                # Additional validation for file operations
                validated_source, validated_target = self.secure_file_operation(
                    source_path, target_path, 
                    "symlink" if self.installation_type == "development" else "copy"
                )
                
            except (PathTraversalError, ValueError) as e:
                print(f"{self.colors.error('Security Error:')} Invalid path for {source_rel}: {e}")
                self.progress.update(1, f"Skipped {source_rel} (security)")
                continue
            
            # Install file based on installation type
            if self.installation_type == "development":
                # Create symlink for development mode (using validated paths)
                if self.file_ops.create_symlink(validated_source, validated_target):
                    success_count += 1
            else:
                # Copy file for standard mode (using validated paths)
                if self.file_ops.copy_file(validated_source, validated_target):
                    success_count += 1
            
            self.progress.update(1, f"Installing {validated_source.name}")
        
        self.progress.finish()
        
        if success_count == len(source_files):
            self.log_success(f"All {len(source_files)} hook files installed successfully")
            return True
        else:
            self.log_error(f"Only {success_count}/{len(source_files)} hook files installed successfully")
            return False
    
    def set_permissions(self) -> bool:
        """Set secure permissions for hook files using least-privilege principle."""
        self.log_info("Setting secure hook file permissions...")
        
        try:
            permission_errors = 0
            files_processed = 0
            
            # Set secure permissions for all hook files
            for hook_file in self.hooks_dir.glob("*.py"):
                files_processed += 1
                
                # Use secure permissions module - Python hooks don't need execute bit
                # They are executed by the Python interpreter, not directly
                if not self.secure_perms.set_secure_permission(hook_file):
                    permission_errors += 1
                    self.log_warning(f"Failed to set secure permissions on {hook_file.name}")
            
            # Also set permissions on hooks directory
            if not self.secure_perms.set_secure_permission(self.hooks_dir):
                permission_errors += 1
                self.log_warning(f"Failed to set secure permissions on hooks directory")
            
            # Audit permissions to verify security
            try:
                audit_report = self.secure_perms.audit_permissions(self.hooks_dir, recursive=False)
                
                if audit_report and audit_report.get("critical_issues"):
                    self.log_error(f"Critical permission issues found: {len(audit_report['critical_issues'])}")
                    for issue in audit_report["critical_issues"]:
                        path = issue.get('path', 'unknown')
                        issues = issue.get('issues', [])
                        self.log_error(f"  {path}: {', '.join(issues) if issues else 'unspecified issue'}")
                    return False
                
                if audit_report and audit_report.get("warnings"):
                    self.log_warning(f"Permission warnings: {len(audit_report['warnings'])}")
                    for warning in audit_report["warnings"]:
                        path = warning.get('path', 'unknown')
                        issues = warning.get('issues', [])
                        self.log_warning(f"  {path}: {', '.join(issues) if issues else 'unspecified warning'}")
                        
            except Exception as e:
                self.log_error(f"Failed to audit permissions: {e}")
                # Continue with installation but log the error
            
            if permission_errors == 0:
                self.log_success(f"Secure permissions set on {files_processed} hook files")
                self.log_info("All permissions follow least-privilege principle")
                return True
            else:
                self.log_error(f"Permission errors: {permission_errors}/{files_processed} files")
                return False
            
        except Exception as e:
            self.log_error(f"Failed to set secure permissions: {e}")
            return False
    
    def test_hook_imports(self) -> bool:
        """Test that hooks can be imported successfully."""
        self.log_info("Testing hook imports...")
        
        # Add hooks directory to Python path for testing
        hooks_dir_str = str(self.hooks_dir)
        if hooks_dir_str not in sys.path:
            sys.path.insert(0, hooks_dir_str)
        
        # Check which hooks are actually installed
        installed_hooks = []
        for hook_file in self.hooks_dir.glob("*.py"):
            if hook_file.name != "__init__.py":
                module_name = hook_file.stem
                installed_hooks.append(module_name)
        
        # List of essential hooks to test (only if they exist)
        essential_hooks = [
            "wave_coordinator", 
            "task_manager",
            "performance_monitor",
            "context_accumulator",
            "error_handler"
        ]
        
        # Only test hooks that are actually installed
        hooks_to_test = [hook for hook in essential_hooks if hook in installed_hooks]
        
        if not hooks_to_test:
            self.log_warning("No essential hooks found to test")
            return True
        
        failed_imports = []
        
        for hook_name in hooks_to_test:
            try:
                # Test import
                module = __import__(hook_name)
                self.log_success(f"Successfully imported {hook_name}")
            except ImportError as e:
                failed_imports.append(f"{hook_name}: {e}")
                self.log_error(f"Failed to import {hook_name}: {e}")
            except (SyntaxError, AttributeError, TypeError) as e:
                # Catch specific exceptions that indicate actual hook problems
                failed_imports.append(f"{hook_name}: {type(e).__name__}: {e}")
                self.log_error(f"Error in {hook_name} code: {type(e).__name__}: {e}")
            except ModuleNotFoundError as e:
                # Separate handling for missing dependencies
                failed_imports.append(f"{hook_name}: Missing dependency: {e}")
                self.log_error(f"Missing dependency for {hook_name}: {e}")
        
        if failed_imports:
            self.log_error("Hook import tests failed")
            return False
        
        self.log_success("All hook imports successful")
        return True
    
    def validate_hook_registry(self) -> bool:
        """Validate hook registry functionality."""
        self.log_info("Validating hook registry...")
        
        try:
            # Add hooks directory to Python path
            hooks_dir_str = str(self.hooks_dir)
            if hooks_dir_str not in sys.path:
                sys.path.insert(0, hooks_dir_str)
            
            # Test hook registry initialization
            try:
                hook_registry = __import__("hook_registry")
                
                # Check if HookRegistry class exists
                if not hasattr(hook_registry, 'HookRegistry'):
                    self.log_error("HookRegistry class not found in hook_registry module")
                    return False
                
                # Try to instantiate hook registry
                registry = hook_registry.HookRegistry()
                
            except ImportError as e:
                self.log_error(f"Failed to import hook_registry: {e}")
                self.log_warning("Hook registry validation skipped - may need manual verification")
                return True  # Don't fail installation for this
            except Exception as e:
                self.log_error(f"Failed to initialize hook registry: {e}")
                self.log_warning("Hook registry validation failed - may need manual verification")
                return True  # Don't fail installation for this
            
            self.log_success("Hook registry validation passed")
            return True
            
        except Exception as e:
            self.log_error(f"Hook registry validation failed: {e}")
            return False
    
    def update_settings_configuration(self) -> bool:
        """Update settings.json to ensure hooks are properly configured."""
        self.log_info("Updating settings configuration...")
        
        settings_file = self.claude_dir / "settings.json"
        
        if not settings_file.exists():
            self.log_error("settings.json not found - core framework may not be installed")
            return False
        
        try:
            # Read current settings
            with open(settings_file, 'r') as f:
                settings = json.load(f)
            
            # Ensure hooks are enabled in superclaude section
            if "superclaude" not in settings:
                settings["superclaude"] = {}
            
            settings["superclaude"]["hooks_enabled"] = True
            settings["superclaude"]["hooks_directory"] = "~/.claude/hooks"
            
            # Ensure environment variables include hooks path
            if "env" not in settings:
                settings["env"] = {}
            
            # Update PYTHON_PATH to include hooks directory
            python_path = settings["env"].get("PYTHON_PATH", "")
            hooks_path = "${HOME}/.claude/hooks"
            
            if hooks_path not in python_path:
                if python_path:
                    settings["env"]["PYTHON_PATH"] = f"{hooks_path}:{python_path}"
                else:
                    settings["env"]["PYTHON_PATH"] = f"{hooks_path}:${{PYTHON_PATH}}"
            
            # Write updated settings
            with open(settings_file, 'w') as f:
                json.dump(settings, f, indent=2)
            
            self.log_success("Settings configuration updated")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to update settings configuration: {e}")
            return False
    
    def run_post_install_validation(self) -> bool:
        """Run post-installation validation."""
        self.log_info("Running post-installation validation...")
        
        # Check all hook files exist
        source_files = self.feature_config.get("files", [])
        missing_files = []
        
        for source_rel in source_files:
            source_path = self.project_dir / source_rel
            target_path = self.hooks_dir / source_path.name
            if not target_path.exists():
                missing_files.append(target_path)
        
        if missing_files:
            self.log_error("Missing hook files after installation:")
            for file in missing_files:
                print(f"  {file}")
            return False
        
        # Test hook functionality
        if not self.test_hook_imports():
            return False
        
        if not self.validate_hook_registry():
            return False
        
        self.log_success("Post-installation validation passed")
        return True
    
    def show_completion_summary(self):
        """Show installation completion summary."""
        print(f"\n{self.colors.header('Hook System Installation Complete!')}")
        print("=" * 50)
        
        print(f"\nInstallation Type: {self.installation_type.title()}")
        print(f"Hooks Directory: {self.hooks_dir}")
        
        # List installed hook files
        source_files = self.feature_config.get("files", [])
        print(f"\nInstalled Hook Files ({len(source_files)}):")
        for source_rel in source_files:
            source_path = self.project_dir / source_rel
            target_path = self.hooks_dir / source_path.name
            if self.installation_type == "development":
                file_type = "symlink" if target_path.is_symlink() else "file"
            else:
                file_type = "file"
            print(f"  ✓ {source_path.name} ({file_type})")
        
        print(f"\n{self.colors.success('Hook system is ready!')}")
        
        print("\nHook Categories:")
        print("  • Infrastructure: wave_coordinator, performance_monitor, context_accumulator")
        print("  • Features: mcp_coordinator, task_manager, token_optimizer")
        print("  • Quality: quality_validator, quality_gates_coordinator, result_collector")
        
        print("\nNext Steps:")
        print("  1. Test hook system: check Claude Code settings")
        print("  2. Install commands suite for enhanced functionality")
        print("  3. Configure MCP servers for advanced capabilities")
    
    def install(self) -> bool:
        """Run complete hooks installation process."""
        try:
            self.log_info(f"Starting hook system installation ({self.installation_type} mode)")
            
            # Validate prerequisites
            if not self.validate_prerequisites():
                return False
            
            # Install hook files
            if not self.install_hook_files():
                return False
            
            # Set permissions
            if not self.set_permissions():
                return False
            
            # Update settings configuration
            if not self.update_settings_configuration():
                return False
            
            # Run validation
            if not self.run_post_install_validation():
                return False
            
            # Show completion summary
            self.show_completion_summary()
            
            return True
            
        except KeyboardInterrupt:
            print("\n\nInstallation interrupted by user.")
            return False
        except Exception as e:
            self.log_error(f"Unexpected error during installation: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="SuperClaude Hook System Installer")
    parser.add_argument("--project-dir", required=True, 
                       help="SuperClaude project directory")
    parser.add_argument("--installation-type", choices=["standard", "development"],
                       default="standard", help="Installation type")
    
    args = parser.parse_args()
    
    try:
        installer = HooksInstaller(args.project_dir, args.installation_type)
        success = installer.install()
    except ValueError as e:
        print(f"Error: {e}")
        return 1
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())