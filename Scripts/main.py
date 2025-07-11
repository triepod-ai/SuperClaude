#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Main Installation Orchestrator

This script serves as the main orchestrator for SuperClaude installation,
providing an interactive menu system and coordinating all installation components.

Called by install.sh after system requirements are validated.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add utils to path for imports
sys.path.insert(0, str(Path(__file__).parent / "utils"))

try:
    from menu import InteractiveMenu, MenuOption
    from progress import ProgressTracker
    from colors import Colors
    from validation import InputValidator
    from file_ops import FileOperations
except ImportError:
    # Fallback if utils not available yet
    print("Warning: Utils not available, using basic functionality")


class SuperClaudeOrchestrator:
    """Main installation orchestrator for SuperClaude Framework."""
    
    def __init__(self, project_dir: str):
        self.project_dir = Path(project_dir)
        self.scripts_dir = self.project_dir / "Scripts"
        self.claude_dir = Path.home() / ".claude"
        self.version = "3.0.0"
        
        # Load feature configuration
        self.features = self._load_features()
        self.selected_features = set()
        self.installation_type = "standard"
        
        # Initialize components
        self.colors = Colors() if 'Colors' in globals() else None
        self.progress = ProgressTracker() if 'ProgressTracker' in globals() else None
        self.validator = InputValidator() if 'InputValidator' in globals() else None
        self.file_ops = FileOperations() if 'FileOperations' in globals() else None
        
    def _load_features(self) -> Dict[str, Any]:
        """Load feature configuration from features.json."""
        features_file = self.scripts_dir / "config" / "features.json"
        if not features_file.exists():
            # Return default features if config not available
            return {
                "core": {
                    "name": "Core Framework",
                    "description": "Essential SuperClaude framework files",
                    "required": True,
                    "dependencies": [],
                    "installer": "core_installer.py"
                },
                "hooks": {
                    "name": "Hook System", 
                    "description": "Event-driven enhancement system",
                    "required": False,
                    "recommended": True,
                    "dependencies": ["core"],
                    "installer": "hooks_installer.py"
                },
                "commands": {
                    "name": "Commands Suite",
                    "description": "Enhanced slash commands",
                    "required": False,
                    "recommended": True, 
                    "dependencies": ["core"],
                    "installer": "commands_installer.py"
                },
                "mcp": {
                    "name": "MCP Servers",
                    "description": "Model Context Protocol servers",
                    "required": False,
                    "dependencies": ["core"],
                    "installer": "mcp_installer.py"
                }
            }
        
        try:
            with open(features_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            self.log_error(f"Failed to load features.json: {e}")
            return {}
    
    def log_info(self, message: str):
        """Log info message with color if available."""
        if self.colors:
            print(self.colors.info(f"[INFO] {message}"))
        else:
            print(f"[INFO] {message}")
    
    def log_success(self, message: str):
        """Log success message with color if available."""
        if self.colors:
            print(self.colors.success(f"[✓] {message}"))
        else:
            print(f"[✓] {message}")
    
    def log_warning(self, message: str):
        """Log warning message with color if available."""
        if self.colors:
            print(self.colors.warning(f"[!] {message}"))
        else:
            print(f"[!] {message}")
    
    def log_error(self, message: str):
        """Log error message with color if available."""
        if self.colors:
            print(self.colors.error(f"[✗] {message}"))
        else:
            print(f"[✗] {message}", file=sys.stderr)
    
    def show_welcome(self):
        """Display welcome screen."""
        welcome_text = f"""
╔══════════════════════════════════════════════════════════╗
║      SuperClaude Framework v{self.version} - Installation      ║
╚══════════════════════════════════════════════════════════╝

Welcome to the SuperClaude Framework interactive installer!

This installer will guide you through setting up SuperClaude with
your preferred configuration and features.

System requirements have been validated ✓
"""
        if self.colors:
            print(self.colors.header(welcome_text))
        else:
            print(welcome_text)
    
    def show_installation_type_menu(self) -> str:
        """Show installation type selection menu."""
        print("\n🔧 Installation Type Selection\n")
        
        options = [
            "1) Standard Installation - Copy files to ~/.claude/ (recommended)",
            "2) Development Installation - Create symlinks for live development",
            "3) Custom Installation - Select specific components"
        ]
        
        for option in options:
            print(f"   {option}")
        
        while True:
            choice = input("\nSelect installation type [1-3]: ").strip()
            
            if choice == "1":
                return "standard"
            elif choice == "2":
                return "development"
            elif choice == "3":
                return "custom"
            else:
                self.log_error("Invalid choice. Please select 1, 2, or 3.")
    
    def show_feature_selection_menu(self) -> set:
        """Show feature selection menu for custom installation."""
        print("\n📦 Component Selection\n")
        
        selected = set()
        
        # Always include required features
        for feature_id, feature in self.features.items():
            if feature.get("required", False):
                selected.add(feature_id)
                print(f"   ✓ {feature['name']} - {feature['description']} (required)")
        
        print("\nOptional Components:")
        
        for feature_id, feature in self.features.items():
            if not feature.get("required", False):
                recommended = " (recommended)" if feature.get("recommended", False) else ""
                print(f"   {feature_id}: {feature['name']} - {feature['description']}{recommended}")
        
        print("\nEnter component IDs to install (space-separated, or 'all' for everything):")
        choice = input("Components: ").strip().lower()
        
        if choice == "all":
            selected.update(self.features.keys())
        else:
            for component in choice.split():
                if component in self.features:
                    selected.add(component)
                else:
                    self.log_warning(f"Unknown component: {component}")
        
        return selected
    
    def resolve_dependencies(self, selected_features: set) -> set:
        """Resolve feature dependencies."""
        resolved = set(selected_features)
        
        def add_dependencies(feature_id: str):
            if feature_id in self.features:
                for dep in self.features[feature_id].get("dependencies", []):
                    if dep not in resolved:
                        resolved.add(dep)
                        add_dependencies(dep)
        
        for feature_id in list(resolved):
            add_dependencies(feature_id)
        
        return resolved
    
    def run_installer(self, feature_id: str) -> bool:
        """Run installer for a specific feature."""
        feature = self.features.get(feature_id)
        if not feature:
            self.log_error(f"Unknown feature: {feature_id}")
            return False
        
        installer_script = self.scripts_dir / "installers" / feature["installer"]
        
        if not installer_script.exists():
            self.log_error(f"Installer not found: {installer_script}")
            return False
        
        self.log_info(f"Installing {feature['name']}...")
        
        try:
            import subprocess
            result = subprocess.run([
                sys.executable, str(installer_script),
                "--project-dir", str(self.project_dir),
                "--installation-type", self.installation_type
            ], check=True, capture_output=True, text=True)
            
            self.log_success(f"{feature['name']} installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            self.log_error(f"Failed to install {feature['name']}: {e}")
            if e.stderr:
                print(f"Error details: {e.stderr}")
            return False
        except Exception as e:
            self.log_error(f"Unexpected error installing {feature['name']}: {e}")
            return False
    
    def run_installation(self):
        """Run the complete installation process."""
        self.log_info("Starting SuperClaude installation...")
        
        if self.progress:
            self.progress.start("Installing components", len(self.selected_features))
        
        failed_components = []
        
        # Install components in dependency order
        installed = set()
        while len(installed) < len(self.selected_features):
            progress_made = False
            
            for feature_id in self.selected_features:
                if feature_id in installed:
                    continue
                
                # Check if all dependencies are installed
                deps = self.features.get(feature_id, {}).get("dependencies", [])
                if all(dep in installed for dep in deps):
                    if self.run_installer(feature_id):
                        installed.add(feature_id)
                        if self.progress:
                            self.progress.update(1)
                    else:
                        failed_components.append(feature_id)
                        installed.add(feature_id)  # Don't retry
                    progress_made = True
            
            if not progress_made:
                # Circular dependency or missing dependency
                remaining = self.selected_features - installed
                self.log_error(f"Cannot install remaining components due to dependency issues: {remaining}")
                break
        
        if self.progress:
            self.progress.finish()
        
        return len(failed_components) == 0
    
    def run_post_install_validation(self):
        """Run post-installation validation."""
        validation_script = self.scripts_dir / "validation" / "post_install.py"
        
        if not validation_script.exists():
            self.log_warning("Post-installation validation script not found")
            return True
        
        self.log_info("Running post-installation validation...")
        
        try:
            import subprocess
            result = subprocess.run([
                sys.executable, str(validation_script),
                "--project-dir", str(self.project_dir)
            ], check=True)
            
            self.log_success("Post-installation validation passed")
            return True
            
        except subprocess.CalledProcessError:
            self.log_error("Post-installation validation failed")
            return False
    
    def show_completion_summary(self):
        """Show installation completion summary."""
        print("\n" + "="*60)
        print("🎉 SuperClaude Installation Complete!")
        print("="*60)
        
        print(f"\nInstalled Components:")
        for feature_id in self.selected_features:
            feature = self.features.get(feature_id, {})
            print(f"  ✓ {feature.get('name', feature_id)}")
        
        print(f"\nInstallation Type: {self.installation_type.title()}")
        print(f"Installation Directory: {self.claude_dir}")
        
        print("\n📋 Next Steps:")
        print("  1. Restart your terminal or run: source ~/.bashrc")
        print("  2. Verify installation: claude config list")
        print("  3. Test SuperClaude: /analyze --help")
        print("  4. Read documentation: ~/.claude/CLAUDE.md")
        
        print("\n🚀 You're ready to use SuperClaude Framework v3.0!")
    
    def main(self):
        """Main orchestrator entry point."""
        try:
            # Show welcome screen
            self.show_welcome()
            
            # Get installation type
            self.installation_type = self.show_installation_type_menu()
            
            # Get feature selection
            if self.installation_type == "custom":
                self.selected_features = self.show_feature_selection_menu()
            else:
                # Standard/Development: install core + recommended
                self.selected_features = set()
                for feature_id, feature in self.features.items():
                    if feature.get("required", False) or feature.get("recommended", False):
                        self.selected_features.add(feature_id)
            
            # Resolve dependencies
            self.selected_features = self.resolve_dependencies(self.selected_features)
            
            print(f"\nWill install: {', '.join(self.selected_features)}")
            
            # Confirm installation
            confirm = input("\nProceed with installation? [Y/n]: ").strip().lower()
            if confirm and confirm not in ['y', 'yes']:
                print("Installation cancelled.")
                return 1
            
            # Run installation
            if not self.run_installation():
                self.log_error("Installation completed with errors")
                return 1
            
            # Run validation
            if not self.run_post_install_validation():
                self.log_warning("Installation succeeded but validation failed")
            
            # Show completion summary
            self.show_completion_summary()
            
            return 0
            
        except KeyboardInterrupt:
            print("\n\nInstallation interrupted by user.")
            return 1
        except Exception as e:
            self.log_error(f"Unexpected error during installation: {e}")
            import traceback
            traceback.print_exc()
            return 1


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="SuperClaude Framework Installation Orchestrator")
    parser.add_argument("--project-dir", required=True, help="SuperClaude project directory")
    parser.add_argument("--installation-type", choices=["standard", "development", "custom"], 
                       help="Installation type (can be set interactively)")
    
    args = parser.parse_args()
    
    orchestrator = SuperClaudeOrchestrator(args.project_dir)
    
    if args.installation_type:
        orchestrator.installation_type = args.installation_type
    
    return orchestrator.main()


if __name__ == "__main__":
    sys.exit(main())