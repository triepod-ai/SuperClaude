#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - MCP Servers Installer

Interactive installer for Model Context Protocol servers.
Provides server selection, API key management, and connectivity testing.
"""

import os
import sys
import json
import argparse
import subprocess
import getpass
from pathlib import Path
from typing import Dict, List, Any, Optional, Set

# Add utils to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from colors import Colors
from progress import ProgressTracker, SpinnerProgress
from menu import InteractiveMenu, ConfirmationDialog
from validation import InputValidator, SystemValidator


class MCPInstaller:
    """MCP servers installer with interactive selection."""
    
    def __init__(self, project_dir: str):
        """Initialize MCP installer.
        
        Args:
            project_dir: SuperClaude project directory
        """
        self.project_dir = Path(project_dir)
        self.claude_dir = Path.home() / ".claude"
        self.version = "3.0.0"
        
        # Initialize utilities
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.validator = InputValidator()
        self.system_validator = SystemValidator()
        self.confirm = ConfirmationDialog()
        
        # Load feature configuration
        self.feature_config = self._load_feature_config()
        self.selected_servers: Set[str] = set()
        self.api_keys: Dict[str, str] = {}
        
    def _load_feature_config(self) -> Dict[str, Any]:
        """Load MCP feature configuration."""
        config_file = self.project_dir / "Scripts" / "config" / "features.json"
        
        try:
            with open(config_file, 'r') as f:
                features = json.load(f)
                return features.get("mcp", {})
        except (FileNotFoundError, json.JSONDecodeError) as e:
            self.log_error(f"Failed to load feature configuration: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default MCP configuration if features.json not available."""
        return {
            "name": "MCP Servers",
            "components": {
                "sequential": {
                    "name": "Sequential Thinking",
                    "description": "Multi-step reasoning and complex problem-solving",
                    "command": "mcp-server-sequential-thinking",
                    "package": "mcp-server-sequential-thinking",
                    "api_key": False,
                    "recommended": True
                },
                "context7": {
                    "name": "Context7 Documentation",
                    "description": "Documentation and framework pattern analysis",
                    "command": "mcp-server-context7",
                    "package": "mcp-server-context7", 
                    "api_key": False,
                    "recommended": True
                },
                "magic": {
                    "name": "Magic UI Components",
                    "description": "UI component generation and design systems",
                    "command": "mcp-server-magic",
                    "package": "mcp-server-magic",
                    "api_key": True,
                    "key_name": "MAGIC_API_KEY",
                    "recommended": False
                },
                "playwright": {
                    "name": "Playwright Automation",
                    "description": "Browser automation and E2E testing capabilities",
                    "command": "mcp-server-playwright",
                    "package": "mcp-server-playwright",
                    "api_key": False,
                    "recommended": False
                },
                "puppeteer": {
                    "name": "Puppeteer Web Control",
                    "description": "Web interaction and automation capabilities",
                    "command": "mcp-server-puppeteer", 
                    "package": "mcp-server-puppeteer",
                    "api_key": False,
                    "recommended": False
                }
            }
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
        """Validate prerequisites for MCP installation."""
        self.log_info("Validating prerequisites...")
        
        errors = []
        
        # Check if core framework is installed
        core_marker = self.claude_dir / "settings.json"
        if not core_marker.exists():
            errors.append("Core framework not installed (missing settings.json)")
        
        # Check if Claude Code is available
        if not self.system_validator.check_command_exists("claude"):
            errors.append("Claude Code CLI not found in PATH")
        
        # Check if npx is available (needed for MCP servers)
        if not self.system_validator.check_command_exists("npx"):
            errors.append("npx not found - Node.js installation required")
        
        # Check Node.js version
        node_version = self.system_validator.get_command_version("node")
        if not node_version:
            errors.append("Node.js not found")
        else:
            self.log_info(f"Node.js version: {node_version}")
        
        if errors:
            for error in errors:
                self.log_error(error)
            return False
        
        self.log_success("Prerequisites validated")
        return True
    
    def show_server_selection_menu(self) -> Set[str]:
        """Show interactive server selection menu."""
        print(f"\n{self.colors.header('MCP Server Selection')}")
        print("=" * 50)
        
        components = self.feature_config.get("components", {})
        
        # Create menu
        menu = InteractiveMenu("Select MCP Servers to Install")
        
        for server_id, config in components.items():
            description = config["description"]
            if config.get("recommended", False):
                description += " (recommended)"
            if config.get("api_key", False):
                description += " [requires API key]"
            
            menu.add_option(server_id, config["name"], description)
        
        menu.add_separator()
        menu.add_option("all", "Install All Servers", "Install all available MCP servers")
        menu.add_option("recommended", "Install Recommended", "Install only recommended servers")
        menu.add_option("none", "Skip MCP Installation", "Continue without MCP servers")
        
        # Show menu and get selections
        while True:
            choice = menu.show("Select servers (or type multiple separated by spaces)")
            
            if choice == "none":
                return set()
            elif choice == "all":
                return set(components.keys())
            elif choice == "recommended":
                return {sid for sid, config in components.items() if config.get("recommended", False)}
            elif choice in components:
                # Single selection - ask if user wants to add more
                selected = {choice}
                while True:
                    if self.confirm.confirm("Add another server?", default=False):
                        additional = menu.show("Select additional server")
                        if additional and additional in components:
                            selected.add(additional)
                        else:
                            break
                    else:
                        break
                return selected
            elif choice:
                # Try to parse multiple selections
                choices = choice.split()
                valid_choices = set()
                invalid_choices = []
                
                for c in choices:
                    if c in components:
                        valid_choices.add(c)
                    else:
                        invalid_choices.append(c)
                
                if invalid_choices:
                    self.log_error(f"Invalid server IDs: {', '.join(invalid_choices)}")
                    continue
                
                return valid_choices
    
    def collect_api_keys(self) -> bool:
        """Collect API keys for selected servers that require them."""
        components = self.feature_config.get("components", {})
        
        servers_needing_keys = []
        for server_id in self.selected_servers:
            config = components.get(server_id, {})
            if config.get("api_key", False):
                servers_needing_keys.append((server_id, config))
        
        if not servers_needing_keys:
            return True
        
        print(f"\n{self.colors.header('API Key Collection')}")
        print("=" * 50)
        
        for server_id, config in servers_needing_keys:
            server_name = config["name"]
            key_name = config.get("key_name", f"{server_id.upper()}_API_KEY")
            key_description = config.get("key_description", f"API key for {server_name}")
            
            print(f"\n{self.colors.info('Required:')} {key_description}")
            
            # Check if key is already in environment
            existing_key = os.environ.get(key_name)
            if existing_key:
                if self.confirm.confirm(f"Use existing {key_name} from environment?"):
                    self.api_keys[server_id] = existing_key
                    self.log_success(f"Using existing {key_name}")
                    continue
            
            # Get key from user
            while True:
                api_key = getpass.getpass(f"Enter {key_name}: ")
                
                if not api_key.strip():
                    if self.confirm.confirm("Skip this server? (API key required)", default=False):
                        self.selected_servers.discard(server_id)
                        break
                    continue
                
                # Basic validation
                if self.validator.validate_api_key(api_key):
                    self.api_keys[server_id] = api_key.strip()
                    self.log_success(f"API key for {server_name} collected")
                    break
                else:
                    self.log_error("Invalid API key format (too short or invalid characters)")
                    if not self.confirm.confirm("Try again?"):
                        self.selected_servers.discard(server_id)
                        break
        
        return True
    
    def check_existing_servers(self) -> Dict[str, bool]:
        """Check which MCP servers are already installed."""
        self.log_info("Checking existing MCP server installations...")
        
        existing_servers = {}
        
        try:
            # Use claude mcp list to check existing servers
            result = subprocess.run(
                ["claude", "mcp", "list", "-s", "user"],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                output = result.stdout
                for server_id in self.selected_servers:
                    if server_id in output:
                        existing_servers[server_id] = True
                        self.log_info(f"Server '{server_id}' already installed")
                    else:
                        existing_servers[server_id] = False
            else:
                self.log_warning("Could not check existing servers - proceeding with installation")
                for server_id in self.selected_servers:
                    existing_servers[server_id] = False
        
        except subprocess.TimeoutExpired:
            self.log_warning("Timeout checking existing servers - proceeding with installation")
            for server_id in self.selected_servers:
                existing_servers[server_id] = False
        except Exception as e:
            self.log_warning(f"Error checking existing servers: {e}")
            for server_id in self.selected_servers:
                existing_servers[server_id] = False
        
        return existing_servers
    
    def install_server(self, server_id: str, config: Dict[str, Any]) -> bool:
        """Install a single MCP server."""
        server_name = config["name"]
        package_name = config["package"]
        command_name = config["command"]
        
        self.log_info(f"Installing {server_name}...")
        
        try:
            # Prepare environment for installation
            env = os.environ.copy()
            
            # Add API key to environment if required
            if server_id in self.api_keys:
                key_name = config.get("key_name", f"{server_id.upper()}_API_KEY")
                env[key_name] = self.api_keys[server_id]
            
            # Install the MCP server using claude mcp add
            cmd = [
                "claude", "mcp", "add", server_id,
                "--command", command_name,
                "--scope", "user"
            ]
            
            spinner = SpinnerProgress()
            spinner.start(f"Installing {server_name}")
            
            result = subprocess.run(
                cmd, env=env, capture_output=True, text=True, timeout=120
            )
            
            spinner.stop()
            
            if result.returncode == 0:
                self.log_success(f"{server_name} installed successfully")
                return True
            else:
                self.log_error(f"Failed to install {server_name}")
                if result.stderr:
                    print(f"Error: {result.stderr}")
                return False
        
        except subprocess.TimeoutExpired:
            self.log_error(f"Timeout installing {server_name}")
            return False
        except Exception as e:
            self.log_error(f"Error installing {server_name}: {e}")
            return False
    
    def test_server_connectivity(self, server_id: str, config: Dict[str, Any]) -> bool:
        """Test connectivity to an installed MCP server."""
        server_name = config["name"]
        
        try:
            # Test server connectivity using claude mcp list
            result = subprocess.run(
                ["claude", "mcp", "list", "-s", "user", server_id],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0 and server_id in result.stdout:
                self.log_success(f"{server_name} connectivity test passed")
                return True
            else:
                self.log_warning(f"{server_name} connectivity test failed")
                return False
        
        except Exception as e:
            self.log_warning(f"Could not test {server_name} connectivity: {e}")
            return False
    
    def install_selected_servers(self) -> bool:
        """Install all selected MCP servers."""
        if not self.selected_servers:
            self.log_info("No MCP servers selected for installation")
            return True
        
        components = self.feature_config.get("components", {})
        existing_servers = self.check_existing_servers()
        
        servers_to_install = []
        for server_id in self.selected_servers:
            if existing_servers.get(server_id, False):
                if self.confirm.confirm(f"Server '{server_id}' already exists. Reinstall?"):
                    servers_to_install.append(server_id)
            else:
                servers_to_install.append(server_id)
        
        if not servers_to_install:
            self.log_info("All selected servers already installed")
            return True
        
        self.log_info(f"Installing {len(servers_to_install)} MCP servers...")
        
        self.progress.start("Installing MCP servers", len(servers_to_install))
        
        success_count = 0
        failed_servers = []
        
        for i, server_id in enumerate(servers_to_install):
            config = components.get(server_id, {})
            
            if self.install_server(server_id, config):
                success_count += 1
                # Test connectivity
                self.test_server_connectivity(server_id, config)
            else:
                failed_servers.append(server_id)
            
            self.progress.update(1, f"Installed {config.get('name', server_id)}")
        
        self.progress.finish()
        
        if failed_servers:
            self.log_error(f"Failed to install servers: {', '.join(failed_servers)}")
        
        if success_count > 0:
            self.log_success(f"Successfully installed {success_count}/{len(servers_to_install)} MCP servers")
        
        return len(failed_servers) == 0
    
    def show_completion_summary(self):
        """Show installation completion summary."""
        print(f"\n{self.colors.header('MCP Servers Installation Complete!')}")
        print("=" * 50)
        
        if not self.selected_servers:
            print("No MCP servers were installed.")
            return
        
        components = self.feature_config.get("components", {})
        
        print(f"\nInstalled MCP Servers ({len(self.selected_servers)}):")
        for server_id in sorted(self.selected_servers):
            config = components.get(server_id, {})
            server_name = config.get("name", server_id)
            description = config.get("description", "")
            has_key = server_id in self.api_keys
            
            key_indicator = " 🔑" if has_key else ""
            print(f"  ✓ {server_name}{key_indicator}")
            print(f"    {self.colors.muted(description)}")
        
        print(f"\n{self.colors.success('MCP servers are ready!')}")
        
        print("\nServer Capabilities:")
        print("  • Sequential: Complex problem-solving and multi-step analysis")
        print("  • Context7: Documentation lookup and framework patterns")
        if "magic" in self.selected_servers:
            print("  • Magic: UI component generation (API key configured)")
        if "playwright" in self.selected_servers:
            print("  • Playwright: Browser automation and E2E testing")
        if "puppeteer" in self.selected_servers:
            print("  • Puppeteer: Web interaction and automation")
        
        print("\nNext Steps:")
        print("  1. Test MCP integration: claude mcp list")
        print("  2. Try enhanced commands: /analyze --seq")
        print("  3. Use UI generation: /build --magic (if Magic installed)")
        print("  4. Check server logs if any issues occur")
    
    def install(self) -> bool:
        """Run complete MCP installation process."""
        try:
            self.log_info("Starting MCP servers installation")
            
            # Validate prerequisites
            if not self.validate_prerequisites():
                return False
            
            # Show server selection menu
            self.selected_servers = self.show_server_selection_menu()
            
            if not self.selected_servers:
                self.log_info("No MCP servers selected - skipping installation")
                return True
            
            # Collect API keys if needed
            if not self.collect_api_keys():
                return False
            
            # Install selected servers
            if not self.install_selected_servers():
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
    parser = argparse.ArgumentParser(description="SuperClaude MCP Servers Installer")
    parser.add_argument("--project-dir", required=True, 
                       help="SuperClaude project directory")
    parser.add_argument("--servers", nargs="*",
                       help="Pre-select specific servers to install")
    
    args = parser.parse_args()
    
    installer = MCPInstaller(args.project_dir)
    
    if args.servers:
        installer.selected_servers = set(args.servers)
    
    success = installer.install()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())