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
utils_path = str(Path(__file__).parent.parent / "utils")
sys.path.insert(0, utils_path)

try:
    from colors import Colors
    from progress import ProgressTracker
    from file_ops import FileOperations
    from validation import SystemValidator
    from path_security import SecureInstaller, PathTraversalError
except ImportError:
    # Fallback imports for when modules can't be loaded
    print("Warning: Some utilities not available, using fallbacks")
    
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


class CommandsInstaller(SecureInstaller):
    """Commands suite installer with security validation."""
    
    def __init__(self, project_dir: str, installation_type: str = "standard"):
        """Initialize commands installer.
        
        Args:
            project_dir: SuperClaude project directory
            installation_type: "standard" or "development"
        """
        try:
            # Initialize secure installer base class
            super().__init__(project_dir)
            self.installation_type = installation_type
            self.commands_dir = self.claude_dir / "commands"
            self.version = "3.0.0"
        except (ValueError, PathTraversalError) as e:
            raise ValueError(f"Security validation failed: {e}")
        
        # Initialize utilities
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.file_ops = FileOperations()
        self.validator = SystemValidator()
        
        # Load feature configuration
        self.feature_config = self._load_feature_config()
        
    def _load_feature_config(self) -> Dict[str, Any]:
        """Load commands feature configuration."""
        try:
            config_file = self.secure_path(self.project_dir / "Scripts" / "config" / "features.json")
            
            with open(config_file, 'r') as f:
                features = json.load(f)
                return features.get("commands", {})
        except (FileNotFoundError, json.JSONDecodeError, PathTraversalError) as e:
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
        try:
            core_marker = self.secure_path(self.claude_dir / "settings.json")
            if not core_marker.exists():
                errors.append("Core framework not installed (missing settings.json)")
        except PathTraversalError as e:
            errors.append(f"Invalid core marker path: {e}")
        
        # Check if project directory exists
        if not self.project_dir.exists():
            errors.append(f"Project directory not found: {self.project_dir}")
        
        # Check if source command files exist
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
            errors.append(f"Missing command files: {', '.join(missing_files)}")
        
        # Check commands directory permissions
        try:
            commands_dir = self.secure_mkdir(self.commands_dir)
            test_file = self.secure_path(commands_dir / ".test_write")
            test_file.write_text("test")
            test_file.unlink()
        except (Exception, PathTraversalError) as e:
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
            try:
                # Validate paths securely
                source_path = self.secure_path(self.project_dir / source_rel)
                target_path = self.secure_path(self.commands_dir / source_path.name)
                
                # Validate file operation
                self.secure_file_operation(
                    source_path, target_path,
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
                        
            except PathTraversalError as e:
                self.log_error(f"Security validation failed for {source_rel}: {e}")
                self.progress.update(1, f"Skipped {source_rel} (security error)")
                continue
            
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
            try:
                source_path = self.secure_path(self.project_dir / source_rel)
                target_path = self.secure_path(self.commands_dir / source_path.name)
                
                with open(target_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Basic validation checks
                command_name = target_path.stem
                
                # Check if it's a markdown file (supports YAML frontmatter or immediate headers)
                content_stripped = content.strip()
                is_markdown = (
                    content_stripped.startswith('#') or 
                    content_stripped.startswith('---') or
                    '# ' in content_stripped or
                    '## ' in content_stripped or
                    target_path.suffix.lower() == '.md'
                )
                
                if not is_markdown:
                    validation_errors.append(f"{command_name}: Not a valid markdown file - no headers or frontmatter found")
                    continue
                
                # Check for essential sections
                required_sections = ['Purpose', 'Usage']
                missing_sections = []
                
                for section in required_sections:
                    if f"## {section}" not in content and f"# {section}" not in content:
                        missing_sections.append(section)
                
                if missing_sections:
                    validation_errors.append(f"{command_name}: Missing sections: {', '.join(missing_sections)}")
                
                # Check for command name consistency (must appear as a command)
                import re
                # More flexible pattern to match commands in various formats:
                # - In markdown headers: # /command or ## /command
                # - In YAML frontmatter: command: "/command"
                # - In tables: | /command |
                # - In code blocks: `/command`
                # - In text: /command with various delimiters
                patterns = [
                    f"/{re.escape(command_name)}(?:\\s|$|\\b)",  # Basic command pattern
                    f"command:\\s*[\"']?/{re.escape(command_name)}[\"']?",  # YAML frontmatter
                    f"\\|\\s*/{re.escape(command_name)}\\s*\\|",  # Table format
                    f"`/{re.escape(command_name)}`",  # Code block format
                    f"^#{1,6}\\s+.*/{re.escape(command_name)}",  # In headers
                ]
                
                command_found = False
                for pattern in patterns:
                    if re.search(pattern, content, re.MULTILINE | re.IGNORECASE):
                        command_found = True
                        break
                
                if not command_found:
                    validation_errors.append(f"{command_name}: Command name '/{command_name}' not found in expected formats (headers, YAML, tables, or text)")
                
            except (Exception, PathTraversalError) as e:
                validation_errors.append(f"{source_rel}: Failed to read/validate: {e}")
        
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
        try:
            commands_dir = self.secure_path(self.commands_dir)
            for command_file in commands_dir.glob("*.md"):
                installed_commands.append(command_file.stem)
        except PathTraversalError as e:
            self.log_error(f"Invalid commands directory: {e}")
            return {}
        
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
        try:
            settings_file = self.secure_path(self.claude_dir / "settings.json")
        except PathTraversalError as e:
            self.log_error(f"Invalid settings file path: {e}")
            return False
        
        if not settings_file.exists():
            self.log_error("settings.json not found")
            return False
        
        try:
            with open(settings_file, 'r') as f:
                settings = json.load(f)
            
            # Commands should be accessible if they're in the commands directory
            # Claude Code typically looks for commands in ~/.claude/commands/
            
            # Check if commands directory exists and is readable
            commands_path = self.secure_path(self.commands_dir)
            
            if not commands_path.exists():
                self.log_error(f"Commands directory does not exist: {commands_path}")
                return False
                
            if not commands_path.is_dir():
                self.log_error(f"Commands path is not a directory: {commands_path}")
                return False
                
            if not os.access(commands_path, os.R_OK | os.X_OK):
                self.log_error(f"Commands directory is not readable/executable: {commands_path}")
                return False
            
            # Check if we can list command files
            try:
                command_files = list(commands_path.glob("*.md"))
                if not command_files:
                    self.log_error("No command files found in commands directory")
                    return False
                    
                # Verify each command file is readable
                unreadable_files = []
                for cmd_file in command_files:
                    if not os.access(cmd_file, os.R_OK):
                        unreadable_files.append(cmd_file.name)
                        
                if unreadable_files:
                    self.log_error(f"Some command files are not readable: {', '.join(unreadable_files)}")
                    return False
                    
                # Check if the commands directory is in the expected location for Claude Code
                expected_location = Path.home() / ".claude" / "commands"
                if commands_path.resolve() != expected_location.resolve():
                    self.log_warning(f"Commands installed to {commands_path}, Claude Code expects {expected_location}")
                    
            except Exception as e:
                self.log_error(f"Failed to verify command files: {e}")
                return False
            
            self.log_success(f"Command accessibility test passed - {len(command_files)} commands accessible")
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
            try:
                source_path = self.secure_path(self.project_dir / source_rel)
                target_path = self.secure_path(self.commands_dir / source_path.name)
                if not target_path.exists():
                    missing_files.append(target_path)
            except PathTraversalError as e:
                self.log_error(f"Invalid file path {source_rel}: {e}")
                missing_files.append(f"INVALID: {source_rel}")
        
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
            print(f"\n  {self.colors.info(category)}:")
            for command in commands:
                try:
                    target_path = self.secure_path(self.commands_dir / f"{command}.md")
                    if self.installation_type == "development":
                        file_type = "symlink" if target_path.is_symlink() else "file"
                    else:
                        file_type = "file"
                    print(f"    ✓ /{command} ({file_type})")
                except PathTraversalError:
                    print(f"    ✗ /{command} (invalid path)")
        
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
    
    try:
        installer = CommandsInstaller(args.project_dir, args.installation_type)
        success = installer.install()
    except ValueError as e:
        print(f"Error: {e}")
        return 1
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())