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
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from colors import Colors
from progress import ProgressTracker
from file_ops import FileOperations
from validation import SystemValidator


class CoreInstaller:
    """Core framework installer."""
    
    def __init__(self, project_dir: str, installation_type: str = "standard"):
        """Initialize core installer.
        
        Args:
            project_dir: SuperClaude project directory
            installation_type: "standard" or "development"
        """
        self.project_dir = Path(project_dir)
        self.installation_type = installation_type
        self.claude_dir = Path.home() / ".claude"
        self.version = "3.0.0"
        
        # Initialize utilities
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.file_ops = FileOperations()
        self.validator = SystemValidator()
        
        # Load feature configuration
        self.feature_config = self._load_feature_config()
        
    def _load_feature_config(self) -> Dict[str, Any]:
        """Load core feature configuration."""
        config_file = self.project_dir / "Scripts" / "config" / "features.json"
        
        try:
            with open(config_file, 'r') as f:
                features = json.load(f)
                return features.get("core", {})
        except (FileNotFoundError, json.JSONDecodeError) as e:
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
        """Validate prerequisites for core installation."""
        self.log_info("Validating prerequisites...")
        
        errors = []
        
        # Check if project directory exists
        if not self.project_dir.exists():
            errors.append(f"Project directory not found: {self.project_dir}")
        
        # Check if source files exist
        source_files = self.feature_config.get("files", [])
        for file_path in source_files:
            source_file = self.project_dir / file_path
            if not source_file.exists():
                errors.append(f"Source file not found: {source_file}")
        
        # Check Claude directory permissions
        try:
            self.claude_dir.mkdir(parents=True, exist_ok=True)
            test_file = self.claude_dir / ".test_write"
            test_file.write_text("test")
            test_file.unlink()
        except Exception as e:
            errors.append(f"Cannot write to Claude directory {self.claude_dir}: {e}")
        
        if errors:
            for error in errors:
                self.log_error(error)
            return False
        
        self.log_success("Prerequisites validated")
        return True
    
    def create_directory_structure(self) -> bool:
        """Create necessary directory structure."""
        self.log_info("Creating directory structure...")
        
        directories = [
            self.claude_dir,
            self.claude_dir / "hooks",
            self.claude_dir / "commands",
            self.claude_dir / "backup"
        ]
        
        try:
            for directory in directories:
                directory.mkdir(parents=True, exist_ok=True)
                self.log_success(f"Created directory: {directory}")
            
            return True
            
        except Exception as e:
            self.log_error(f"Failed to create directories: {e}")
            return False
    
    def install_core_files(self) -> bool:
        """Install core framework files."""
        self.log_info(f"Installing core files ({self.installation_type} mode)...")
        
        source_files = self.feature_config.get("files", [])
        target_files = self.feature_config.get("target_files", [])
        
        if len(source_files) != len(target_files):
            self.log_error("Mismatch between source and target file lists")
            return False
        
        self.progress.start("Installing core files", len(source_files))
        
        success_count = 0
        
        for i, (source_rel, target_rel) in enumerate(zip(source_files, target_files)):
            source_path = self.project_dir / source_rel
            target_path = Path(target_rel.replace("~", str(Path.home())))
            
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
            self.log_success(f"All {len(source_files)} core files installed successfully")
            return True
        else:
            self.log_error(f"Only {success_count}/{len(source_files)} files installed successfully")
            return False
    
    def configure_environment(self) -> bool:
        """Configure environment variables."""
        self.log_info("Configuring environment...")
        
        # Check if settings.json was installed and is valid
        settings_file = self.claude_dir / "settings.json"
        
        if not settings_file.exists():
            self.log_error("settings.json not found after installation")
            return False
        
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
                print("\nTo set these variables, add to your shell profile:")
                for var in missing_vars:
                    print(f"  export {var}")
            
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
            target_path = Path(target_rel.replace("~", str(Path.home())))
            if not target_path.exists():
                missing_files.append(target_path)
        
        if missing_files:
            self.log_error("Missing files after installation:")
            for file in missing_files:
                print(f"  {file}")
            return False
        
        # Test settings.json loading
        try:
            settings_file = self.claude_dir / "settings.json"
            with open(settings_file, 'r') as f:
                json.load(f)
            self.log_success("settings.json validation passed")
        except Exception as e:
            self.log_error(f"settings.json validation failed: {e}")
            return False
        
        # Check permissions
        for target_rel in target_files:
            target_path = Path(target_rel.replace("~", str(Path.home())))
            if not os.access(target_path, os.R_OK):
                self.log_error(f"Cannot read installed file: {target_path}")
                return False
        
        self.log_success("Post-installation validation passed")
        return True
    
    def show_completion_summary(self):
        """Show installation completion summary."""
        print(f"\n{self.colors.header('Core Framework Installation Complete!')}")
        print("=" * 50)
        
        print(f"\nInstallation Type: {self.installation_type.title()}")
        print(f"Target Directory: {self.claude_dir}")
        print(f"Framework Version: v{self.version}")
        
        # List installed files
        target_files = self.feature_config.get("target_files", [])
        print(f"\nInstalled Files ({len(target_files)}):")
        for target_rel in target_files:
            target_path = Path(target_rel.replace("~", str(Path.home())))
            if self.installation_type == "development":
                file_type = "symlink" if target_path.is_symlink() else "file"
            else:
                file_type = "file"
            print(f"  ✓ {target_path.name} ({file_type})")
        
        print(f"\n{self.colors.success('Core framework is ready!')}")
        
        print("\nNext Steps:")
        print("  1. Install additional components (hooks, commands)")
        print("  2. Configure MCP servers (optional)")
        print("  3. Test framework: claude config list")
    
    def install(self) -> bool:
        """Run complete core installation process."""
        try:
            self.log_info(f"Starting core framework installation ({self.installation_type} mode)")
            
            # Validate prerequisites
            if not self.validate_prerequisites():
                return False
            
            # Create directory structure
            if not self.create_directory_structure():
                return False
            
            # Install core files
            if not self.install_core_files():
                return False
            
            # Configure environment
            if not self.configure_environment():
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
    parser = argparse.ArgumentParser(description="SuperClaude Core Framework Installer")
    parser.add_argument("--project-dir", required=True, 
                       help="SuperClaude project directory")
    parser.add_argument("--installation-type", choices=["standard", "development"],
                       default="standard", help="Installation type")
    
    args = parser.parse_args()
    
    installer = CoreInstaller(args.project_dir, args.installation_type)
    success = installer.install()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())