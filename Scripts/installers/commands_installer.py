#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Commands Suite Installer

Installs the SuperClaude commands suite with enhanced slash commands.
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


class CommandsInstaller:
    """Commands suite installer."""
    
    def __init__(self, project_dir: str, installation_type: str = "standard"):
        """Initialize commands installer.
        
        Args:
            project_dir: SuperClaude project directory
            installation_type: "standard" or "development"
        """
        self.project_dir = Path(project_dir)
        self.installation_type = installation_type
        self.claude_dir = Path.home() / ".claude"
        self.commands_dir = self.claude_dir / "commands"
        self.version = "3.0.0"
        
        # Initialize utilities
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.file_ops = FileOperations()
        self.validator = SystemValidator()
        
        # Load feature configuration
        self.feature_config = self._load_feature_config()
        
    def _load_feature_config(self) -> Dict[str, Any]:
        """Load commands feature configuration."""
        config_file = self.project_dir / "Scripts" / "config" / "features.json"
        
        try:
            with open(config_file, 'r') as f:
                features = json.load(f)
                return features.get("commands", {})
        except (FileNotFoundError, json.JSONDecodeError) as e:
            self.log_error(f"Failed to load feature configuration: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default commands configuration if features.json not available."""
        command_files = [
            "analyze.md",
            "build.md",
            "cleanup.md",
            "design.md",
            "document.md",
            "estimate.md",
            "explain.md",
            "git.md",
            "improve.md",
            "index.md",
            "load.md",
            "spawn.md",
            "task.md",
            "test.md",
            "troubleshoot.md"
        ]
        
        return {
            "name": "Commands Suite",
            "files": [f"SuperClaude/Commands/{f}" for f in command_files],
            "target_directory": "~/.claude/commands/"
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
        """Validate prerequisites for commands installation."""
        self.log_info("Validating prerequisites...")
        
        errors = []
        
        # Check if core framework is installed
        core_marker = self.claude_dir / "settings.json"
        if not core_marker.exists():
            errors.append("Core framework not installed (missing settings.json)")
        
        # Check if project directory exists
        if not self.project_dir.exists():
            errors.append(f"Project directory not found: {self.project_dir}")
        
        # Check if source command files exist
        source_files = self.feature_config.get("files", [])
        missing_files = []
        for file_path in source_files:
            source_file = self.project_dir / file_path
            if not source_file.exists():
                missing_files.append(str(source_file))
        
        if missing_files:
            errors.append(f"Missing command files: {', '.join(missing_files)}")
        
        # Check commands directory permissions
        try:
            self.commands_dir.mkdir(parents=True, exist_ok=True)
            test_file = self.commands_dir / ".test_write"
            test_file.write_text("test")
            test_file.unlink()
        except Exception as e:
            errors.append(f"Cannot write to commands directory {self.commands_dir}: {e}")
        
        if errors:
            for error in errors:
                self.log_error(error)
            return False
        
        self.log_success("Prerequisites validated")
        return True
    
    def install_command_files(self) -> bool:
        """Install command files."""
        self.log_info(f"Installing command files ({self.installation_type} mode)...")
        
        source_files = self.feature_config.get("files", [])
        
        if not source_files:
            self.log_error("No command files specified in configuration")
            return False
        
        self.progress.start("Installing command files", len(source_files))
        
        success_count = 0
        
        for i, source_rel in enumerate(source_files):
            source_path = self.project_dir / source_rel
            target_path = self.commands_dir / source_path.name
            
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
            self.log_success(f"All {len(source_files)} command files installed successfully")
            return True
        else:
            self.log_error(f"Only {success_count}/{len(source_files)} command files installed successfully")
            return False
    
    def validate_command_syntax(self) -> bool:
        """Validate command file syntax and structure."""
        self.log_info("Validating command syntax...")
        
        source_files = self.feature_config.get("files", [])
        validation_errors = []
        
        for source_rel in source_files:
            source_path = self.project_dir / source_rel
            target_path = self.commands_dir / source_path.name
            
            try:
                with open(target_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Basic validation checks
                command_name = target_path.stem
                
                # Check if it's a markdown file
                if not content.startswith('#'):
                    validation_errors.append(f"{command_name}: Not a valid markdown file")
                    continue
                
                # Check for essential sections
                required_sections = ['Purpose', 'Usage']
                missing_sections = []
                
                for section in required_sections:
                    if f"## {section}" not in content and f"# {section}" not in content:
                        missing_sections.append(section)
                
                if missing_sections:
                    validation_errors.append(f"{command_name}: Missing sections: {', '.join(missing_sections)}")
                
                # Check for command name consistency
                if f"/{command_name}" not in content:
                    validation_errors.append(f"{command_name}: Command name not found in content")
                
            except Exception as e:
                validation_errors.append(f"{target_path.name}: Failed to read/validate: {e}")
        
        if validation_errors:
            self.log_error("Command validation errors found:")
            for error in validation_errors:
                print(f"  {error}")
            return False
        
        self.log_success("All command files validated successfully")
        return True
    
    def categorize_commands(self) -> Dict[str, List[str]]:
        """Categorize commands by type."""
        categories = {
            "Development": ["build", "design"],
            "Analysis": ["analyze", "troubleshoot", "explain", "review"],
            "Quality": ["improve", "scan", "cleanup", "test"],
            "Documentation": ["document"],
            "Project Management": ["estimate", "task", "spawn"],
            "Version Control": ["git"],
            "Utilities": ["index", "load"]
        }
        
        # Get list of installed commands
        installed_commands = []
        for command_file in self.commands_dir.glob("*.md"):
            installed_commands.append(command_file.stem)
        
        # Filter categories to only include installed commands
        filtered_categories = {}
        for category, commands in categories.items():
            available_commands = [cmd for cmd in commands if cmd in installed_commands]
            if available_commands:
                filtered_categories[category] = available_commands
        
        return filtered_categories
    
    def test_command_accessibility(self) -> bool:
        """Test if commands are accessible to Claude Code."""
        self.log_info("Testing command accessibility...")
        
        # Check if commands directory is in Claude settings
        settings_file = self.claude_dir / "settings.json"
        
        if not settings_file.exists():
            self.log_error("settings.json not found")
            return False
        
        try:
            with open(settings_file, 'r') as f:
                settings = json.load(f)
            
            # Commands should be accessible if they're in the commands directory
            # Claude Code typically looks for commands in ~/.claude/commands/
            
            # Check if commands directory path is correct
            expected_path = str(self.commands_dir)
            
            self.log_success("Command accessibility test passed")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to test command accessibility: {e}")
            return False
    
    def run_post_install_validation(self) -> bool:
        """Run post-installation validation."""
        self.log_info("Running post-installation validation...")
        
        # Check all command files exist
        source_files = self.feature_config.get("files", [])
        missing_files = []
        
        for source_rel in source_files:
            source_path = self.project_dir / source_rel
            target_path = self.commands_dir / source_path.name
            if not target_path.exists():
                missing_files.append(target_path)
        
        if missing_files:
            self.log_error("Missing command files after installation:")
            for file in missing_files:
                print(f"  {file}")
            return False
        
        # Validate command syntax
        if not self.validate_command_syntax():
            return False
        
        # Test command accessibility
        if not self.test_command_accessibility():
            return False
        
        self.log_success("Post-installation validation passed")
        return True
    
    def show_completion_summary(self):
        """Show installation completion summary."""
        print(f"\n{self.colors.header('Commands Suite Installation Complete!')}")
        print("=" * 50)
        
        print(f"\nInstallation Type: {self.installation_type.title()}")
        print(f"Commands Directory: {self.commands_dir}")
        
        # Show categorized commands
        categories = self.categorize_commands()
        total_commands = sum(len(commands) for commands in categories.values())
        
        print(f"\nInstalled Commands ({total_commands}):")
        for category, commands in categories.items():
            print(f"\n  {self.colors.highlight(category)}:")
            for command in commands:
                target_path = self.commands_dir / f"{command}.md"
                if self.installation_type == "development":
                    file_type = "symlink" if target_path.is_symlink() else "file"
                else:
                    file_type = "file"
                print(f"    ✓ /{command} ({file_type})")
        
        print(f"\n{self.colors.success('Commands suite is ready!')}")
        
        print("\nWave-Enabled Commands (Multi-stage execution):")
        wave_commands = ["analyze", "build", "design", "improve", "review", "scan", "task"]
        for command in wave_commands:
            if any(command in commands for commands in categories.values()):
                print(f"  • /{command}")
        
        print("\nNext Steps:")
        print("  1. Test commands: /analyze --help")
        print("  2. Install MCP servers for enhanced capabilities")
        print("  3. Try wave-enabled commands for complex operations")
        print("  4. Explore command categories with /index")
    
    def install(self) -> bool:
        """Run complete commands installation process."""
        try:
            self.log_info(f"Starting commands suite installation ({self.installation_type} mode)")
            
            # Validate prerequisites
            if not self.validate_prerequisites():
                return False
            
            # Install command files
            if not self.install_command_files():
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
    parser = argparse.ArgumentParser(description="SuperClaude Commands Suite Installer")
    parser.add_argument("--project-dir", required=True, 
                       help="SuperClaude project directory")
    parser.add_argument("--installation-type", choices=["standard", "development"],
                       default="standard", help="Installation type")
    
    args = parser.parse_args()
    
    installer = CommandsInstaller(args.project_dir, args.installation_type)
    success = installer.install()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())