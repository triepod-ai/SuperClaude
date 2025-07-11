#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Core Installation Script

This script handles the installation of SuperClaude framework components
to the global Claude Code directory.
"""

import os
import sys
import json
import shutil
import argparse
from pathlib import Path
from typing import List, Dict, Any


class SuperClaudeInstaller:
    def __init__(self, project_dir: str, dev_mode: bool = False):
        self.project_dir = Path(project_dir)
        self.dev_mode = dev_mode
        self.claude_dir = Path.home() / ".claude"
        self.version = "3.0.0"
        
    def log_info(self, message: str):
        print(f"[INFO] {message}")
        
    def log_success(self, message: str):
        print(f"[✓] {message}")
        
    def log_warning(self, message: str):
        print(f"[!] {message}")
        
    def log_error(self, message: str):
        print(f"[✗] {message}", file=sys.stderr)

    def create_directory_structure(self):
        """Create the global Claude Code directory structure."""
        self.log_info("Creating global Claude Code directory structure...")
        
        directories = [
            self.claude_dir,
            self.claude_dir / "hooks",
            self.claude_dir / "commands",
            self.claude_dir / "core"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            self.log_success(f"Created directory: {directory}")

    def install_hooks(self):
        """Install SuperClaude hooks to global directory."""
        self.log_info("Installing SuperClaude hooks...")
        
        source_hooks = self.project_dir / "SuperClaude" / "Hooks"
        target_hooks = self.claude_dir / "hooks"
        
        if not source_hooks.exists():
            self.log_error(f"Source hooks directory not found: {source_hooks}")
            return False
            
        hook_files = list(source_hooks.glob("*.py"))
        if not hook_files:
            self.log_error("No hook files found in source directory")
            return False
            
        for hook_file in hook_files:
            target_file = target_hooks / hook_file.name
            
            if self.dev_mode:
                # Create symlink for development
                if target_file.exists() or target_file.is_symlink():
                    target_file.unlink()
                target_file.symlink_to(hook_file.resolve())
                self.log_success(f"Symlinked hook: {hook_file.name}")
            else:
                # Copy file for production
                shutil.copy2(hook_file, target_file)
                # Make executable
                target_file.chmod(0o755)
                self.log_success(f"Installed hook: {hook_file.name}")
                
        self.log_success(f"Installed {len(hook_files)} hooks")
        return True

    def install_commands(self):
        """Install SuperClaude commands to global directory."""
        self.log_info("Installing SuperClaude commands...")
        
        source_commands = self.project_dir / "SuperClaude" / "Commands"
        target_commands = self.claude_dir / "commands"
        
        if not source_commands.exists():
            self.log_error(f"Source commands directory not found: {source_commands}")
            return False
            
        command_files = list(source_commands.glob("*.md"))
        if not command_files:
            self.log_error("No command files found in source directory")
            return False
            
        for command_file in command_files:
            target_file = target_commands / command_file.name
            
            if self.dev_mode:
                # Create symlink for development
                if target_file.exists() or target_file.is_symlink():
                    target_file.unlink()
                target_file.symlink_to(command_file.resolve())
                self.log_success(f"Symlinked command: {command_file.name}")
            else:
                # Copy file for production
                shutil.copy2(command_file, target_file)
                self.log_success(f"Installed command: {command_file.name}")
                
        self.log_success(f"Installed {len(command_files)} commands")
        return True

    def install_core_files(self):
        """Install SuperClaude core files to global directory."""
        self.log_info("Installing SuperClaude core files...")
        
        source_core = self.project_dir / "SuperClaude" / "Core"
        target_core = self.claude_dir / "core"
        
        if not source_core.exists():
            self.log_error(f"Source core directory not found: {source_core}")
            return False
            
        core_files = list(source_core.glob("*.md"))
        if not core_files:
            self.log_error("No core files found in source directory")
            return False
            
        for core_file in core_files:
            target_file = target_core / core_file.name
            
            if self.dev_mode:
                # Create symlink for development
                if target_file.exists() or target_file.is_symlink():
                    target_file.unlink()
                target_file.symlink_to(core_file.resolve())
                self.log_success(f"Symlinked core file: {core_file.name}")
            else:
                # Copy file for production
                shutil.copy2(core_file, target_file)
                self.log_success(f"Installed core file: {core_file.name}")
                
        self.log_success(f"Installed {len(core_files)} core files")
        return True

    def install_settings(self):
        """Install or update global settings."""
        self.log_info("Installing global settings...")
        
        source_settings = self.project_dir / "SuperClaude" / "Settings" / "settings.json"
        target_settings = self.claude_dir / "settings.json"
        
        if not source_settings.exists():
            self.log_error(f"Source settings file not found: {source_settings}")
            return False
            
        # Backup existing settings if they exist
        if target_settings.exists():
            backup_file = target_settings.with_suffix('.json.backup')
            shutil.copy2(target_settings, backup_file)
            self.log_info(f"Backed up existing settings to: {backup_file}")
            
        # Copy settings file
        shutil.copy2(source_settings, target_settings)
        self.log_success("Global settings installed")
        
        # Validate JSON
        try:
            with open(target_settings) as f:
                json.load(f)
            self.log_success("Settings file validation passed")
        except json.JSONDecodeError as e:
            self.log_error(f"Settings file validation failed: {e}")
            return False
            
        return True

    def setup_environment(self):
        """Set up environment variables in shell profile."""
        self.log_info("Setting up environment variables...")
        
        bashrc_path = Path.home() / ".bashrc"
        env_marker = "# SuperClaude Framework v3.0"
        
        # Check if already configured
        if bashrc_path.exists():
            with open(bashrc_path) as f:
                if env_marker in f.read():
                    self.log_success("Environment variables already configured")
                    return True
                    
        # Add environment variables
        env_vars = [
            "",
            env_marker,
            "export CLAUDE_CODE_SUPERCLAUDE=enabled",
            f"export SUPERCLAUDE_VERSION={self.version}",
            "export SUPERCLAUDE_HOOKS_ENABLED=true",
            'export PYTHON_PATH="$HOME/.claude/hooks:$PYTHON_PATH"'
        ]
        
        with open(bashrc_path, "a") as f:
            f.write("\n".join(env_vars) + "\n")
            
        self.log_success("Environment variables added to ~/.bashrc")
        return True

    def validate_installation(self) -> bool:
        """Validate the installation."""
        self.log_info("Validating installation...")
        
        validation_passed = True
        
        # Check settings file
        settings_file = self.claude_dir / "settings.json"
        if settings_file.exists():
            self.log_success("Global settings.json exists")
            try:
                with open(settings_file) as f:
                    json.load(f)
                self.log_success("Global settings.json is valid JSON")
            except json.JSONDecodeError:
                self.log_error("Global settings.json is invalid JSON")
                validation_passed = False
        else:
            self.log_error("Global settings.json missing")
            validation_passed = False
            
        # Check hooks
        hooks_dir = self.claude_dir / "hooks"
        hook_files = list(hooks_dir.glob("*.py"))
        expected_hooks = 17  # Update this number as needed
        
        if len(hook_files) >= 15:  # Minimum expected
            self.log_success(f"SuperClaude hooks installed ({len(hook_files)} hooks)")
        else:
            self.log_error(f"Missing hooks - expected at least 15, found {len(hook_files)}")
            validation_passed = False
            
        # Check commands
        commands_dir = self.claude_dir / "commands"
        command_files = list(commands_dir.glob("*.md"))
        
        if len(command_files) >= 10:  # Minimum expected
            self.log_success(f"SuperClaude commands installed ({len(command_files)} commands)")
        else:
            self.log_error(f"Missing commands - expected at least 10, found {len(command_files)}")
            validation_passed = False
            
        # Check core files
        core_dir = self.claude_dir / "core"
        core_files = list(core_dir.glob("*.md"))
        
        if len(core_files) >= 5:  # Minimum expected
            self.log_success(f"SuperClaude core files installed ({len(core_files)} files)")
        else:
            self.log_error(f"Missing core files - expected at least 5, found {len(core_files)}")
            validation_passed = False
            
        return validation_passed

    def install(self) -> bool:
        """Run the complete installation process."""
        print(f"\n🚀 SuperClaude Framework v{self.version} Installation")
        print("=" * 60)
        
        if self.dev_mode:
            self.log_info("Running in development mode (using symlinks)")
        
        try:
            # Create directory structure
            self.create_directory_structure()
            
            # Install components
            if not self.install_hooks():
                return False
                
            if not self.install_commands():
                return False
                
            if not self.install_core_files():
                return False
                
            if not self.install_settings():
                return False
                
            # Setup environment
            self.setup_environment()
            
            # Validate installation
            if not self.validate_installation():
                self.log_error("Installation validation failed")
                return False
                
            # Success message
            print("\n" + "=" * 60)
            self.log_success("SuperClaude Framework installation completed successfully!")
            print("\n🔧 Next steps:")
            print("   1. Restart your terminal or run: source ~/.bashrc")
            print("   2. Verify Claude Code can access the settings: claude config list")
            print("   3. Test SuperClaude functionality in any project directory")
            print("\n📖 Documentation:")
            print(f"   - Global settings: {self.claude_dir}/settings.json")
            print(f"   - Global hooks: {self.claude_dir}/hooks/")
            print(f"   - Global commands: {self.claude_dir}/commands/")
            print(f"   - Global core: {self.claude_dir}/core/")
            print("   - Project-specific overrides: .claude/settings.local.json")
            print("\n🚀 SuperClaude Framework is now available globally across all projects!")
            
            return True
            
        except Exception as e:
            self.log_error(f"Installation failed: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(description="SuperClaude Framework Core Installer")
    parser.add_argument("--dev", action="store_true", help="Install in development mode (symlinks)")
    parser.add_argument("--update", action="store_true", help="Update existing installation")
    
    args = parser.parse_args()
    
    # Get project directory (parent of Scripts directory)
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    
    # Create installer and run
    installer = SuperClaudeInstaller(str(project_dir), dev_mode=args.dev)
    
    if installer.install():
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()