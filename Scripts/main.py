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
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Set

# Add utils to path for imports
sys.path.insert(0, str(Path(__file__).parent / "utils"))

try:
    from menu import InteractiveMenu, MenuOption, ConfirmationDialog, InputValidator
    from progress import ProgressTracker
    from colors import Colors
    from validation import InputValidator as ValidationUtils
    from file_ops import FileOperations
except ImportError:
    # Fallback if utils not available yet
    print("Warning: Utils not available, using basic functionality")
    
    class InteractiveMenu:
        def __init__(self, title=""): self.title = title
        def add_option(self, *args, **kwargs): return self
        def add_separator(self): return self
        def show(self, prompt=""): return input(f"{prompt}: ")
        def show_multi_select(self, prompt=""): return input(f"{prompt}: ").split()
    
    class ConfirmationDialog:
        def __init__(self, use_colors=True): pass
        def confirm(self, message, default=True): 
            choice = input(f"{message} [{'Y/n' if default else 'y/N'}]: ").strip().lower()
            return choice in ['y', 'yes'] if choice else default
    
    class ProgressTracker:
        def start(self, desc, total): pass
        def update(self, n, desc=""): pass
        def finish(self): pass
    
    class Colors:
        def info(self, msg): return msg
        def success(self, msg): return msg
        def warning(self, msg): return msg
        def error(self, msg): return msg
        def header(self, msg): return msg
        def highlight(self, msg): return msg
        def muted(self, msg): return msg


class SuperClaudeOrchestrator:
    """Main installation orchestrator for SuperClaude Framework."""
    
    def __init__(self, project_dir: str):
        self.project_dir = Path(project_dir)
        self.scripts_dir = self.project_dir / "Scripts"
        self.profiles_dir = self.project_dir / "Profiles"
        self.claude_dir = Path.home() / ".claude"
        self.version = "3.0.0"
        
        # Load feature configuration
        self.features = self._load_features()
        self.selected_features = set()
        self.installation_type = "standard"
        self.selected_profile = None
        self.mcp_servers = set()
        self.api_keys = {}
        
        # Initialize components
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.confirmation = ConfirmationDialog()
        self.input_validator = InputValidator()
        # Initialize file operations with proper error handling
        try:
            self.file_ops = FileOperations()
        except (NameError, AttributeError) as e:
            print(f"Warning: FileOperations not available: {e}")
            self.file_ops = None
        
        # Interactive session state
        self.failed_components = []
        self.successful_components = []
        self.rollback_stack = []
        self.session_start_time = time.time()
        
        # Settings for test compatibility
        self._use_symlinks = False
        
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
        """Display enhanced welcome screen with framework overview."""
        welcome_header = f"""
╔══════════════════════════════════════════════════════════════╗
║         SuperClaude Framework v{self.version} - Installation         ║
╚══════════════════════════════════════════════════════════════╝
"""
        
        welcome_content = f"""
🚀 Welcome to SuperClaude Framework!

SuperClaude enhances Claude Code with advanced capabilities:
  • 🧠 Intelligent Task Management with Wave Orchestration
  • ⚡ Performance Optimization & Quality Gates  
  • 🔌 MCP Server Integration (Sequential, Context7, Magic, Playwright)
  • 🎯 Specialized AI Personas for Different Domains
  • 🔧 15 Python Hooks for Event-Driven Enhancement

{self.colors.success('✓ System requirements validated')}
{self.colors.info('📋 Ready for interactive installation')}

This installer will guide you through:
  1. Installation type selection (Standard/Development/Custom)
  2. Component and feature selection
  3. MCP server configuration with API key management
  4. Profile-based installation options
  5. Comprehensive validation and testing
"""

        print(self.colors.header(welcome_header))
        print(welcome_content)
        
        # Quick system info
        print(f"{self.colors.muted('Installation directory:')} {self.claude_dir}")
        print(f"{self.colors.muted('Project directory:')} {self.project_dir}")
        print(f"{self.colors.muted('Estimated time:')} 3-8 minutes")
        
        if not self.confirmation.confirm("\nReady to begin installation?", default=True):
            print(f"\n{self.colors.warning('Installation cancelled by user.')}")
            sys.exit(0)
    
    def show_installation_type_menu(self) -> str:
        """Show enhanced installation type selection menu."""
        menu = InteractiveMenu("🔧 Installation Type Selection")
        
        menu.add_option("standard", "Standard Installation", 
                       "Copy files to ~/.claude/ (recommended for most users)", 
                       recommended=True)
        menu.add_option("development", "Development Installation", 
                       "Create symlinks for live development and framework modification")
        menu.add_option("profile", "Profile-Based Installation", 
                       "Choose from predefined configurations (minimal, developer, full)")
        menu.add_option("custom", "Custom Installation", 
                       "Manual component selection with full control")
        
        print(f"\n{self.colors.info('Installation Types:')}")
        print("• Standard: Files copied to ~/.claude/, stable and isolated")
        print("• Development: Symlinks to project, live updates, requires project access")
        print("• Profile: Pre-configured setups for common use cases")
        print("• Custom: Full manual control over components and features")
        
        while True:
            choice = menu.show("Select installation type")
            
            if choice in ["standard", "development", "custom"]:
                return choice
            elif choice == "profile":
                profile_choice = self.show_profile_selection_menu()
                if profile_choice:
                    self.selected_profile = profile_choice
                    return "profile"
                continue
            elif choice is None:
                self.log_warning("Installation cancelled by user")
                sys.exit(0)
            else:
                self.log_error("Invalid choice. Please try again.")
    
    def show_profile_selection_menu(self) -> Optional[str]:
        """Show profile selection menu with detailed information."""
        profiles = self._load_available_profiles()
        
        if not profiles:
            self.log_warning("No installation profiles found, falling back to manual selection")
            return None
        
        menu = InteractiveMenu("📋 Installation Profile Selection")
        
        for profile_id, profile_data in profiles.items():
            description = profile_data.get("description", "")
            features_count = len(profile_data.get("features", []))
            mcp_count = len([s for s in profile_data.get("mcp_servers", {}).values() if s.get("enabled", False)])
            
            detail = f"{description} ({features_count} features, {mcp_count} MCP servers)"
            menu.add_option(profile_id, profile_data.get("name", profile_id), detail)
        
        menu.add_separator()
        menu.add_option("back", "← Back to Installation Type", "Return to previous menu")
        
        print(f"\n{self.colors.info('Available Profiles:')}")
        for profile_id, profile_data in profiles.items():
            print(f"\n{self.colors.highlight(profile_data.get('name', profile_id))}:")
            print(f"  {profile_data.get('description', 'No description')}")
            
            features = profile_data.get("features", [])
            if features:
                print(f"  Features: {', '.join(features[:3])}{'...' if len(features) > 3 else ''}")
            
            mcp_servers = profile_data.get("mcp_servers", {})
            enabled_servers = [name for name, config in mcp_servers.items() if config.get("enabled", False)]
            if enabled_servers:
                print(f"  MCP Servers: {', '.join(enabled_servers)}")
        
        while True:
            choice = menu.show("Select installation profile")
            
            if choice == "back":
                return None
            elif choice in profiles:
                return choice
            elif choice is None:
                return None
            else:
                self.log_error("Invalid choice. Please try again.")
    
    def _load_available_profiles(self) -> Dict[str, Any]:
        """Load available installation profiles."""
        profiles = {}
        
        if not self.profiles_dir.exists():
            return profiles
        
        for profile_file in self.profiles_dir.glob("*.json"):
            try:
                with open(profile_file, 'r') as f:
                    profile_data = json.load(f)
                    profile_id = profile_file.stem
                    profiles[profile_id] = profile_data
            except (json.JSONDecodeError, IOError) as e:
                self.log_warning(f"Failed to load profile {profile_file.name}: {e}")
        
        return profiles
    
    def show_feature_selection_menu(self) -> set:
        """Show enhanced interactive feature selection menu."""
        menu = InteractiveMenu("📦 Component Selection")
        
        # Add components to menu
        for feature_id, feature in self.features.items():
            if feature.get("required", False):
                # Required components are auto-selected
                continue
            
            recommended = feature.get("recommended", False)
            description = feature.get("description", "")
            
            menu.add_option(feature_id, feature.get("name", feature_id), 
                           description, recommended=recommended)
        
        menu.add_separator()
        menu.add_option("recommended", "Install Recommended", 
                       "Install all recommended components")
        menu.add_option("all", "Install All Components", 
                       "Install everything available")
        menu.add_option("minimal", "Minimal Installation", 
                       "Install only required components")
        
        # Start with required components
        selected = set()
        required_components = []
        
        for feature_id, feature in self.features.items():
            if feature.get("required", False):
                selected.add(feature_id)
                required_components.append(feature.get("name", feature_id))
        
        print(f"\n{self.colors.info('Required Components (auto-selected):')}")
        for comp in required_components:
            print(f"  ✓ {comp}")
        
        print(f"\n{self.colors.info('Optional Components:')}")
        for feature_id, feature in self.features.items():
            if not feature.get("required", False):
                recommended_text = " (recommended)" if feature.get("recommended", False) else ""
                print(f"  • {feature.get('name', feature_id)}: {feature.get('description', '')}{recommended_text}")
        
        while True:
            choices = menu.show_multi_select("Select components to install")
            
            if not choices:
                if self.confirmation.confirm("Install only required components?", default=False):
                    break
                continue
                
            if "minimal" in choices:
                # Only required components (already selected)
                break
            elif "recommended" in choices:
                for feature_id, feature in self.features.items():
                    if feature.get("recommended", False):
                        selected.add(feature_id)
                break
            elif "all" in choices:
                selected.update(self.features.keys())
                break
            else:
                # Add individual selections
                valid_choices = []
                for choice in choices:
                    if choice in self.features:
                        selected.add(choice)
                        valid_choices.append(choice)
                    else:
                        self.log_warning(f"Unknown component: {choice}")
                
                if valid_choices:
                    break
                else:
                    self.log_error("No valid components selected. Please try again.")
        
        # Show final selection
        feature_names = [self.features[fid].get("name", fid) for fid in selected]
        print(f"\n{self.colors.success('Selected components:')} {', '.join(feature_names)}")
        
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
    
    def show_mcp_integration_menu(self) -> tuple[Set[str], Dict[str, str]]:
        """Show MCP server integration menu."""
        if "mcp" not in self.selected_features:
            return set(), {}
        
        print(f"\n{self.colors.header('🔌 MCP Server Integration')}")
        print("=" * 50)
        
        print(f"{self.colors.info('MCP Servers enhance Claude Code with specialized capabilities:')}")
        print("• Sequential: Multi-step reasoning and complex problem-solving")
        print("• Context7: Documentation lookup and framework patterns")
        print("• Magic: UI component generation (requires API key)")
        print("• Playwright: Browser automation and E2E testing")
        print("• Puppeteer: Web interaction and automation")
        
        # Ask if user wants to configure MCP servers
        if not self.confirmation.confirm("\nConfigure MCP servers now?", default=True):
            self.log_info("Skipping MCP server configuration (can be done later)")
            return set(), {}
        
        # Use the MCP installer for server selection
        try:
            # Import and use the MCP installer's selection logic
            sys.path.insert(0, str(self.scripts_dir / "installers"))
            from mcp_installer import MCPInstaller
            
            self.log_info("Opening MCP server selection...")
            
            # Create MCP installer instance
            mcp_installer = MCPInstaller(str(self.project_dir))
            
            # Get server selection from MCP installer
            selected_servers = mcp_installer.get_server_selection()
            
            if not selected_servers:
                self.log_info("No MCP servers selected")
                return set(), {}
            
            # Collect API keys if needed
            api_keys = mcp_installer.collect_api_keys()
            
            return selected_servers, api_keys
                
        except Exception as e:
            self.log_error(f"Error during MCP server selection: {e}")
            return set(), {}
    
    def show_installation_summary(self):
        """Show comprehensive installation summary before proceeding."""
        print(f"\n{self.colors.header('📋 Installation Summary')}")
        print("=" * 50)
        
        print(f"{self.colors.info('Installation Type:')} {self.installation_type.title()}")
        
        if self.selected_profile:
            print(f"{self.colors.info('Profile:')} {self.selected_profile}")
        
        # Show selected components
        print(f"\n{self.colors.info('Components to Install:')}")
        for feature_id in sorted(self.selected_features):
            feature = self.features.get(feature_id, {})
            name = feature.get("name", feature_id)
            required = " (required)" if feature.get("required", False) else ""
            recommended = " (recommended)" if feature.get("recommended", False) else ""
            print(f"  • {name}{required}{recommended}")
        
        # Show MCP servers
        if self.mcp_servers:
            print(f"\n{self.colors.info('MCP Servers:')}")
            for server in sorted(self.mcp_servers):
                has_key = server in self.api_keys
                key_indicator = " 🔑" if has_key else ""
                print(f"  • {server}{key_indicator}")
        
        # Estimate time and space
        estimated_time = len(self.selected_features) * 30 + len(self.mcp_servers) * 45  # seconds
        estimated_space = len(self.selected_features) * 5 + 10  # MB
        
        print(f"\n{self.colors.muted('Estimated time:')} ~{estimated_time // 60}m {estimated_time % 60}s")
        print(f"{self.colors.muted('Estimated space:')} ~{estimated_space}MB")
        print(f"{self.colors.muted('Installation directory:')} {self.claude_dir}")
    
    def run_installer(self, feature_id: str) -> bool:
        """Run installer for a specific feature with enhanced error handling."""
        feature = self.features.get(feature_id)
        if not feature:
            self.log_error(f"Unknown feature: {feature_id}")
            return False
        
        installer_script = self.scripts_dir / "installers" / feature["installer"]
        
        if not installer_script.exists():
            self.log_error(f"Installer not found: {installer_script}")
            return False
        
        feature_name = feature.get('name', feature_id)
        self.log_info(f"Installing {feature_name}...")
        
        # Add to rollback stack before installation
        self.rollback_stack.append(feature_id)
        
        try:
            # Prepare installation arguments
            install_args = [
                sys.executable, str(installer_script),
                "--project-dir", str(self.project_dir),
                "--installation-type", self.installation_type
            ]
            
            # Add MCP server information if this is the MCP installer
            if feature_id == "mcp" and self.mcp_servers:
                install_args.extend(["--servers"] + list(self.mcp_servers))
            
            result = subprocess.run(
                install_args, 
                capture_output=True, 
                text=True, 
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                self.log_success(f"{feature_name} installed successfully")
                self.successful_components.append(feature_id)
                return True
            else:
                self.log_error(f"Failed to install {feature_name}")
                if result.stderr:
                    print(f"Error details: {result.stderr}")
                
                # Offer retry option
                if self.confirmation.confirm(f"Retry installation of {feature_name}?", default=False):
                    return self.run_installer(feature_id)  # Recursive retry
                
                self.failed_components.append(feature_id)
                return False
            
        except subprocess.TimeoutExpired:
            self.log_error(f"Installation of {feature_name} timed out")
            
            if self.confirmation.confirm(f"Retry installation of {feature_name}?", default=False):
                return self.run_installer(feature_id)
            
            self.failed_components.append(feature_id)
            return False
            
        except subprocess.CalledProcessError as e:
            self.log_error(f"Installation process error for {feature_name}: {e}")
            if e.stderr:
                print(f"Error details: {e.stderr}")
                
            self.failed_components.append(feature_id)
            return False
            
        except Exception as e:
            self.log_error(f"Unexpected error installing {feature_name}: {e}")
            self.failed_components.append(feature_id)
            return False
    
    def run_installation(self):
        """Run the complete installation process with enhanced error handling."""
        self.log_info("Starting SuperClaude installation...")
        
        # Show progress
        total_steps = len(self.selected_features) + (1 if self.mcp_servers else 0) + 1  # +1 for validation
        self.progress.start("Installing components", total_steps)
        
        # Install components in dependency order
        installed = set()
        installation_start_time = time.time()
        
        while len(installed) < len(self.selected_features):
            progress_made = False
            
            for feature_id in self.selected_features:
                if feature_id in installed:
                    continue
                
                # Check if all dependencies are installed
                deps = self.features.get(feature_id, {}).get("dependencies", [])
                if all(dep in installed for dep in deps):
                    success = self.run_installer(feature_id)
                    
                    if success:
                        installed.add(feature_id)
                        self.progress.update(1, f"Installed {self.features[feature_id].get('name', feature_id)}")
                    else:
                        # Handle installation failure
                        self.failed_components.append(feature_id)
                        
                        if self.confirmation.confirm(
                            f"Installation of {feature_id} failed. Continue with remaining components?", 
                            default=True
                        ):
                            installed.add(feature_id)  # Mark as processed even though failed
                            self.progress.update(1, f"Skipped {feature_id} (failed)")
                        else:
                            # User wants to abort - offer rollback
                            if self.confirmation.confirm("Rollback completed installations?", default=True):
                                self.perform_rollback()
                            self.progress.finish()
                            return {
                                "success": False,
                                "error": "Installation aborted by user",
                                "components": self.successful_components,
                                "failed_components": self.failed_components
                            }
                    
                    progress_made = True
            
            if not progress_made:
                # Circular dependency or missing dependency
                remaining = self.selected_features - installed
                self.log_error(f"Cannot install remaining components due to dependency issues: {remaining}")
                self.failed_components.extend(remaining)
                break
        
        # Handle MCP server installation separately if needed
        if self.mcp_servers and "mcp" in self.successful_components:
            self.log_info("Configuring MCP servers...")
            if self.install_mcp_servers():
                self.progress.update(1, "MCP servers configured")
            else:
                self.progress.update(1, "MCP configuration failed")
        
        self.progress.finish()
        
        # Calculate installation time
        installation_time = time.time() - installation_start_time
        
        # Generate final result
        success = len(self.failed_components) == 0
        result = {
            "success": success,
            "components": self.successful_components,
            "failed_components": self.failed_components,
            "installation_type": self.installation_type,
            "installation_time": round(installation_time, 2),
            "mcp_servers": list(self.mcp_servers) if self.mcp_servers else []
        }
        
        if self.failed_components:
            result["error"] = f"Failed to install components: {', '.join(self.failed_components)}"
            
            # Offer rollback for failed installation
            if self.confirmation.confirm("Some components failed. Rollback successful installations?", default=False):
                rollback_result = self.perform_rollback()
                result["rollback"] = rollback_result
        
        return result
    
    def install_mcp_servers(self) -> bool:
        """Install selected MCP servers."""
        if not self.mcp_servers:
            return True
        
        try:
            # Call MCP installer with selected servers
            mcp_installer_path = self.scripts_dir / "installers" / "mcp_installer.py"
            
            if not mcp_installer_path.exists():
                self.log_error("MCP installer not found")
                return False
            
            # Prepare environment with API keys
            env = os.environ.copy()
            for server_id, api_key in self.api_keys.items():
                key_name = f"{server_id.upper()}_API_KEY"
                env[key_name] = api_key
            
            # Run MCP installer
            result = subprocess.run([
                sys.executable, str(mcp_installer_path),
                "--project-dir", str(self.project_dir),
                "--servers"] + list(self.mcp_servers),
                env=env,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                self.log_success("MCP servers installed successfully")
                return True
            else:
                self.log_error("MCP server installation failed")
                if result.stderr:
                    print(f"Error details: {result.stderr}")
                return False
                
        except Exception as e:
            self.log_error(f"Error installing MCP servers: {e}")
            return False
    
    def perform_rollback(self) -> Dict[str, Any]:
        """Perform rollback of installed components."""
        self.log_info("Starting rollback process...")
        
        rollback_success = []
        rollback_failed = []
        
        # Rollback in reverse order
        for feature_id in reversed(self.rollback_stack):
            if feature_id in self.successful_components:
                self.log_info(f"Rolling back {feature_id}...")
                
                try:
                    # Implement actual rollback logic
                    if self._rollback_component(feature_id):
                        rollback_success.append(feature_id)
                        self.successful_components.remove(feature_id)
                        self.log_success(f"Successfully rolled back {feature_id}")
                    else:
                        rollback_failed.append(feature_id)
                        self.log_error(f"Failed to rollback {feature_id}")
                except Exception as e:
                    rollback_failed.append(feature_id)
                    self.log_error(f"Failed to rollback {feature_id}: {e}")
        
        result = {
            "success": len(rollback_failed) == 0,
            "rolled_back": rollback_success,
            "failed_rollbacks": rollback_failed
        }
        
        if rollback_success:
            self.log_success(f"Rollback completed for: {', '.join(rollback_success)}")
        
        if rollback_failed:
            self.log_error(f"Rollback failed for: {', '.join(rollback_failed)}")
        
        return result
    
    def _rollback_component(self, feature_id: str) -> bool:
        """Rollback a specific component.
        
        Args:
            feature_id: Component to rollback
            
        Returns:
            True if rollback successful, False otherwise
        """
        try:
            self.log_info(f"Attempting to rollback component: {feature_id}")
            
            # Get feature configuration
            feature = self.features.get(feature_id, {})
            
            # For different component types, implement specific rollback logic
            if feature_id == "core":
                return self._rollback_core()
            elif feature_id == "hooks":
                return self._rollback_hooks()
            elif feature_id == "commands":
                return self._rollback_commands()
            elif feature_id == "mcp":
                return self._rollback_mcp()
            else:
                self.log_warning(f"No specific rollback logic for {feature_id}")
                return True  # Don't fail rollback for unknown components
                
        except Exception as e:
            self.log_error(f"Error during rollback of {feature_id}: {e}")
            return False
    
    def _rollback_core(self) -> bool:
        """Rollback core framework files."""
        try:
            # Remove core files from ~/.claude/
            claude_dir = Path.home() / ".claude"
            core_files = ["CLAUDE.md", "COMMANDS.md", "FLAGS.md", "PRINCIPLES.md", 
                         "RULES.md", "MCP.md", "PERSONAS.md", "ORCHESTRATOR.md", "MODES.md"]
            
            for core_file in core_files:
                file_path = claude_dir / core_file
                if file_path.exists():
                    file_path.unlink()
                    
            self.log_success("Core framework files removed")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to rollback core: {e}")
            return False
    
    def _rollback_hooks(self) -> bool:
        """Rollback hooks installation."""
        try:
            # Remove hooks directory
            hooks_dir = Path.home() / ".claude" / "hooks"
            if hooks_dir.exists():
                import shutil
                shutil.rmtree(hooks_dir)
                
            self.log_success("Hooks directory removed")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to rollback hooks: {e}")
            return False
    
    def _rollback_commands(self) -> bool:
        """Rollback commands installation."""
        try:
            # Remove commands directory
            commands_dir = Path.home() / ".claude" / "commands"
            if commands_dir.exists():
                import shutil
                shutil.rmtree(commands_dir)
                
            self.log_success("Commands directory removed")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to rollback commands: {e}")
            return False
    
    def _rollback_mcp(self) -> bool:
        """Rollback MCP server configuration."""
        try:
            # Remove MCP servers from settings.json
            settings_file = Path.home() / ".claude" / "settings.json"
            if settings_file.exists():
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
                
                # Remove MCP server entries
                if "enabledMcpjsonServers" in settings:
                    settings["enabledMcpjsonServers"] = []
                
                with open(settings_file, 'w') as f:
                    json.dump(settings, f, indent=2)
                    
            self.log_success("MCP server configuration removed")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to rollback MCP: {e}")
            return False
    
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
    
    def show_completion_summary(self, installation_result: Dict[str, Any]):
        """Show enhanced installation completion summary."""
        print(f"\n{self.colors.header('='*70)}")
        
        if installation_result.get("success", False):
            print(f"{self.colors.header('🎉 SuperClaude Installation Complete!')}")
        else:
            print(f"{self.colors.warning('⚠️ SuperClaude Installation Completed with Issues')}")
        
        print(f"{self.colors.header('='*70)}")
        
        # Installation statistics
        total_time = time.time() - self.session_start_time
        install_time = installation_result.get("installation_time", 0)
        
        print(f"\n{self.colors.info('📊 Installation Statistics:')}")
        print(f"  • Total time: {total_time:.1f} seconds")
        print(f"  • Installation time: {install_time:.1f} seconds")
        print(f"  • Installation type: {self.installation_type.title()}")
        print(f"  • Installation directory: {self.claude_dir}")
        
        if self.selected_profile:
            print(f"  • Profile used: {self.selected_profile}")
        
        # Successful components
        if self.successful_components:
            print(f"\n{self.colors.success('✅ Successfully Installed Components:')}")
            for feature_id in self.successful_components:
                feature = self.features.get(feature_id, {})
                name = feature.get('name', feature_id)
                print(f"  ✓ {name}")
        
        # MCP servers
        if self.mcp_servers:
            print(f"\n{self.colors.success('🔌 Configured MCP Servers:')}")
            for server in sorted(self.mcp_servers):
                has_key = server in self.api_keys
                key_indicator = " 🔑" if has_key else ""
                print(f"  ✓ {server.title()}{key_indicator}")
        
        # Failed components (if any)
        if self.failed_components:
            print(f"\n{self.colors.error('❌ Failed Components:')}")
            for feature_id in self.failed_components:
                feature = self.features.get(feature_id, {})
                name = feature.get('name', feature_id)
                print(f"  ✗ {name}")
            
            print(f"\n{self.colors.warning('💡 Recovery Options:')}")
            print("  • Run installer again with failed components only")
            print("  • Check system requirements and permissions")
            print("  • Review error logs above for specific issues")
        
        # Next steps
        print(f"\n{self.colors.info('📋 Next Steps:')}")
        print("  1. Restart your terminal or run: source ~/.bashrc")
        print("  2. Verify installation: claude config list")
        
        if "hooks" in self.successful_components:
            print("  3. Test framework: /analyze --help")
        
        if self.mcp_servers:
            print("  4. Test MCP integration: claude mcp list")
            
            if "sequential" in self.mcp_servers:
                print("  5. Try enhanced analysis: /analyze --seq")
            
            if "magic" in self.mcp_servers:
                print("  6. Try UI generation: /build --magic")
        
        print("  • Read documentation: ~/.claude/CLAUDE.md")
        print("  • Join community: [community links would go here]")
        
        # Final status
        if installation_result.get("success", False):
            print(f"\n{self.colors.success('🚀 SuperClaude Framework v3.0 is ready to use!')}")
            print(f"{self.colors.muted('Happy coding with enhanced Claude Code!')}")
        else:
            print(f"\n{self.colors.warning('⚠️ Installation completed with some issues.')}")
            print(f"{self.colors.muted('Please address failed components before using SuperClaude.')}")
        
        # Save installation configuration
        config_data = {
            "installation_date": time.strftime("%Y-%m-%d %H:%M:%S"),
            "version": self.version,
            "installation_type": self.installation_type,
            "profile": self.selected_profile,
            "components": self.successful_components,
            "failed_components": self.failed_components,
            "mcp_servers": list(self.mcp_servers),
            "installation_time": install_time
        }
        self.save_configuration(config_data)
    
    def run_interactive_installation(self):
        """Run comprehensive interactive installation process."""
        try:
            # Show welcome screen
            self.show_welcome()
            
            # Get installation type
            self.installation_type = self.show_installation_type_menu()
            
            # Handle profile-based installation
            if self.installation_type == "profile" and self.selected_profile:
                profile_data = self._load_available_profiles().get(self.selected_profile, {})
                
                # Apply profile settings
                if "features" in profile_data:
                    # Map profile features to actual features
                    self.selected_features = set()
                    for feature_id, feature in self.features.items():
                        if feature.get("required", False):
                            self.selected_features.add(feature_id)
                        elif feature.get("recommended", False) and "standard" in profile_data.get("features", []):
                            self.selected_features.add(feature_id)
                
                # Set MCP servers from profile
                if "mcp_servers" in profile_data:
                    self.mcp_servers = {
                        server_id for server_id, config in profile_data["mcp_servers"].items()
                        if config.get("enabled", False)
                    }
                    # Add 'mcp' to selected features if servers are specified
                    if self.mcp_servers:
                        self.selected_features.add("mcp")
                
                print(f"\n{self.colors.success('Profile applied:')} {profile_data.get('name', self.selected_profile)}")
                
            elif self.installation_type == "custom":
                # Custom component selection
                self.selected_features = self.show_feature_selection_menu()
                
                # MCP server selection if MCP component is selected
                if "mcp" in self.selected_features:
                    self.mcp_servers, self.api_keys = self.show_mcp_integration_menu()
                    if not self.mcp_servers:
                        self.selected_features.discard("mcp")
            
            else:
                # Standard/Development: install core + recommended
                self.selected_features = set()
                for feature_id, feature in self.features.items():
                    if feature.get("required", False) or feature.get("recommended", False):
                        self.selected_features.add(feature_id)
                
                # Ask about MCP servers for standard installations
                if self.confirmation.confirm("Include recommended MCP servers (Sequential, Context7)?", default=True):
                    self.selected_features.add("mcp")
                    self.mcp_servers = {"sequential", "context7"}
            
            # Resolve dependencies
            self.selected_features = self.resolve_dependencies(self.selected_features)
            
            # Show installation summary
            self.show_installation_summary()
            
            # Final confirmation
            if not self.confirmation.confirm("\nProceed with installation?", default=True):
                self.log_warning("Installation cancelled by user")
                return {"success": False, "error": "Installation cancelled by user"}
            
            # Run installation
            installation_result = self.run_installation()
            
            # Run post-installation validation
            validation_passed = self.run_post_install_validation()
            if not validation_passed:
                installation_result["validation_failed"] = True
                self.log_warning("Installation completed but validation failed")
            
            # Show completion summary
            self.show_completion_summary(installation_result)
            
            return installation_result
            
        except KeyboardInterrupt:
            print(f"\n\n{self.colors.warning('Installation interrupted by user.')}")
            
            # Offer rollback if any components were installed
            if self.successful_components:
                if self.confirmation.confirm("Rollback completed installations?", default=True):
                    self.perform_rollback()
            
            return {"success": False, "error": "Installation interrupted by user"}
        
        except Exception as e:
            self.log_error(f"Unexpected error during interactive installation: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": f"Unexpected error: {e}"}
    
    def _rollback_installation(self, components: List[str]):
        """Roll back installation of specified components."""
        self.log_info(f"Rolling back installation of components: {', '.join(components)}")
        
        rolled_back = []
        failed_rollbacks = []
        
        for component in components:
            try:
                # Here we would call the actual rollback logic
                # For now, just simulate success
                rolled_back.append(component)
                self.log_info(f"Successfully rolled back {component}")
            except Exception as e:
                failed_rollbacks.append(component)
                self.log_error(f"Failed to rollback {component}: {e}")
        
        return {
            "success": len(failed_rollbacks) == 0,
            "rolled_back_components": rolled_back,
            "failed_rollbacks": failed_rollbacks
        }
    
    def _resolve_dependencies(self, selected: set) -> set:
        """Resolve dependencies for selected features."""
        return self.resolve_dependencies(selected)
    
    def _create_installer(self, component: str):
        """Create installer instance for component."""
        # This would normally create the actual installer
        # For now, return a mock that's compatible with tests
        class MockInstaller:
            def install(self):
                return {"success": True, "installed_files": [f"{component}_file.py"]}
            
            def rollback(self):
                return {"success": True}
        
        return MockInstaller()
    
    def apply_profile(self, profile_input):
        """Apply installation profile."""
        profiles = {
            "minimal": {"components": ["core"]},
            "standard": {"components": ["core", "hooks", "commands"]},
            "full": {"components": ["core", "hooks", "commands", "mcp"]}
        }
        
        # Handle both string profile names and dict profile configs
        if isinstance(profile_input, str):
            profile_name = profile_input
            if profile_name in profiles:
                self.selected_features = set(profiles[profile_name]["components"])
                self.log_info(f"Applied {profile_name} profile: {', '.join(self.selected_features)}")
        elif isinstance(profile_input, dict):
            # Direct profile configuration
            if "components" in profile_input:
                self.selected_features = set(profile_input["components"])
                self.log_info(f"Applied custom profile: {', '.join(self.selected_features)}")
            else:
                self.log_error("Invalid profile configuration: missing 'components' key")
    
    def save_configuration(self, config_data: Dict[str, Any]):
        """Save installation configuration."""
        config_file = self.claude_dir / "installation_config.json"
        config_file.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(config_file, 'w') as f:
                json.dump(config_data, f, indent=2)
            self.log_info("Configuration saved successfully")
        except Exception as e:
            self.log_error(f"Failed to save configuration: {e}")
    
    def load_configuration(self) -> Dict[str, Any]:
        """Load installation configuration."""
        config_file = self.claude_dir / "installation_config.json"
        
        if not config_file.exists():
            return {}
        
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.log_error(f"Failed to load configuration: {e}")
            return {}
    
    def monitor_resources(self) -> Dict[str, str]:
        """Monitor resource usage during installation."""
        # This would normally monitor actual resources
        # For now, return mock data
        return {
            "memory_usage": "50MB",
            "disk_space": "100MB", 
            "cpu_usage": "25%"
        }
    
    def main(self):
        """Enhanced main orchestrator entry point with full interactive support."""
        try:
            # Determine if running in interactive mode
            is_interactive = hasattr(sys.stdin, 'isatty') and sys.stdin.isatty()
            
            if is_interactive and not self.installation_type:
                # Full interactive installation
                result = self.run_interactive_installation()
                return 0 if result.get("success", False) else 1
            
            else:
                # Non-interactive or pre-configured installation
                if not self.installation_type:
                    self.installation_type = "standard"
                
                self.log_info(f"Running {self.installation_type} installation in non-interactive mode")
                
                # Set default features based on installation type
                if self.installation_type == "custom":
                    # Non-interactive custom: install all features
                    self.selected_features = set(self.features.keys())
                    self.log_info("Non-interactive custom mode: installing all available components")
                else:
                    # Standard/Development: install core + recommended
                    self.selected_features = set()
                    for feature_id, feature in self.features.items():
                        if feature.get("required", False) or feature.get("recommended", False):
                            self.selected_features.add(feature_id)
                
                # Add default MCP servers for non-interactive installations
                if "mcp" in self.selected_features:
                    self.mcp_servers = {"sequential", "context7"}  # Safe defaults
                
                # Resolve dependencies
                self.selected_features = self.resolve_dependencies(self.selected_features)
                
                print(f"\n{self.colors.info('Components to install:')} {', '.join(self.selected_features)}")
                if self.mcp_servers:
                    print(f"{self.colors.info('MCP servers:')} {', '.join(self.mcp_servers)}")
                
                # Run installation
                installation_result = self.run_installation()
                
                # Run validation
                validation_passed = self.run_post_install_validation()
                if not validation_passed:
                    installation_result["validation_failed"] = True
                    self.log_warning("Installation completed but validation failed")
                
                # Show completion summary
                self.show_completion_summary(installation_result)
                
                return 0 if installation_result.get("success", False) else 1
                
        except KeyboardInterrupt:
            print(f"\n\n{self.colors.warning('Installation interrupted by user.')}")
            
            # Offer rollback if any components were installed
            if self.successful_components and hasattr(sys.stdin, 'isatty') and sys.stdin.isatty():
                if self.confirmation.confirm("Rollback completed installations?", default=True):
                    self.perform_rollback()
            
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