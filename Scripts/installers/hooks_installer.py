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
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from colors import Colors
from progress import ProgressTracker
from file_ops import FileOperations
from validation import SystemValidator


class HooksInstaller:
    """Hook system installer."""
    
    def __init__(self, project_dir: str, installation_type: str = "standard"):
        """Initialize hooks installer.
        
        Args:
            project_dir: SuperClaude project directory
            installation_type: "standard" or "development"
        """
        self.project_dir = Path(project_dir)
        self.installation_type = installation_type
        self.claude_dir = Path.home() / ".claude"
        self.hooks_dir = self.claude_dir / "hooks"
        self.version = "3.0.0"
        
        # Initialize utilities
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.file_ops = FileOperations()
        self.validator = SystemValidator()
        
        # Load feature configuration
        self.feature_config = self._load_feature_config()
        
    def _load_feature_config(self) -> Dict[str, Any]:
        """Load hooks feature configuration."""
        config_file = self.project_dir / "Scripts" / "config" / "features.json"
        
        try:
            with open(config_file, 'r') as f:
                features = json.load(f)
                return features.get("hooks", {})
        except (FileNotFoundError, json.JSONDecodeError) as e:
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
        core_marker = self.claude_dir / "settings.json"
        if not core_marker.exists():
            errors.append("Core framework not installed (missing settings.json)")
        
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
            source_file = self.project_dir / file_path
            if not source_file.exists():
                missing_files.append(str(source_file))
        
        if missing_files:
            errors.append(f"Missing hook files: {', '.join(missing_files)}")
        
        # Check hooks directory permissions
        try:
            self.hooks_dir.mkdir(parents=True, exist_ok=True)
            test_file = self.hooks_dir / ".test_write"
            test_file.write_text("test")
            test_file.unlink()
        except Exception as e:
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
            source_path = self.project_dir / source_rel
            target_path = self.hooks_dir / source_path.name
            
            # Install file based on installation type
            if self.installation_type == "development":
                # Create symlink for development mode
                if self.file_ops.create_symlink(source_path, target_path):
                    success_count += 1
            else:
                # Copy file for standard mode
                if self.file_ops.copy_file(source_path, target_path):
                    success_count += 1
            
            self.progress.update(1, f"Installing {source_path.name}")
        
        self.progress.finish()
        
        if success_count == len(source_files):
            self.log_success(f"All {len(source_files)} hook files installed successfully")
            return True
        else:
            self.log_error(f"Only {success_count}/{len(source_files)} hook files installed successfully")
            return False
    
    def set_permissions(self) -> bool:
        """Set appropriate permissions for hook files."""
        self.log_info("Setting hook file permissions...")
        
        try:
            # Make Python files executable
            for hook_file in self.hooks_dir.glob("*.py"):
                hook_file.chmod(0o755)
            
            self.log_success("Hook file permissions set")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to set permissions: {e}")
            return False
    
    def test_hook_imports(self) -> bool:
        """Test that hooks can be imported successfully."""
        self.log_info("Testing hook imports...")
        
        # Add hooks directory to Python path for testing
        hooks_dir_str = str(self.hooks_dir)
        if hooks_dir_str not in sys.path:
            sys.path.insert(0, hooks_dir_str)
        
        # List of essential hooks to test
        essential_hooks = [
            "hook_registry",
            "wave_coordinator", 
            "task_manager",
            "mcp_coordinator",
            "performance_monitor",
            "context_accumulator",
            "error_handler"
        ]
        
        failed_imports = []
        
        for hook_name in essential_hooks:
            try:
                # Test import
                module = __import__(hook_name)
                self.log_success(f"Successfully imported {hook_name}")
            except ImportError as e:
                failed_imports.append(f"{hook_name}: {e}")
                self.log_error(f"Failed to import {hook_name}: {e}")
            except Exception as e:
                failed_imports.append(f"{hook_name}: {e}")
                self.log_error(f"Error importing {hook_name}: {e}")
        
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
            hook_registry = __import__("hook_registry")
            
            # Check if HookRegistry class exists
            if not hasattr(hook_registry, 'HookRegistry'):
                self.log_error("HookRegistry class not found in hook_registry module")
                return False
            
            # Try to instantiate hook registry
            registry = hook_registry.HookRegistry()
            
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
    
    installer = HooksInstaller(args.project_dir, args.installation_type)
    success = installer.install()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())