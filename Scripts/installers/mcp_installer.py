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
import shlex
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Set

# Add utils to path for imports
utils_path = str(Path(__file__).parent.parent / "utils")
sys.path.insert(0, utils_path)

try:
    from colors import Colors
    from progress import ProgressTracker, SpinnerProgress
    from menu import InteractiveMenu, ConfirmationDialog
    from validation import InputValidator, SystemValidator
except ImportError:
    # Fallback imports for when modules can't be loaded
    print("Warning: Some utilities not available, using fallbacks")
    
    class Colors:
        def info(self, msg): return f"\033[0;34m{msg}\033[0m"
        def success(self, msg): return f"\033[0;32m{msg}\033[0m"
        def warning(self, msg): return f"\033[1;33m{msg}\033[0m"
        def error(self, msg): return f"\033[0;31m{msg}\033[0m"
        def header(self, msg): return f"\033[1;34m{msg}\033[0m"
        def muted(self, msg): return f"\033[0;37m{msg}\033[0m"
    
    class ProgressTracker:
        def start(self, desc, total): pass
        def update(self, n, desc=""): pass
        def finish(self): pass
    
    class SpinnerProgress:
        def start(self, desc): pass
        def stop(self): pass
    
    class InteractiveMenu:
        def __init__(self, title, options): pass
        def show(self): return []
    
    class ConfirmationDialog:
        def __init__(self, message): pass
        def confirm(self): return True
    
    class InputValidator:
        def validate_url(self, url): return True
        def validate_api_key(self, key): return True
    
    class SystemValidator:
        def validate_permissions(self, path): return True


class SecurityValidator:
    """Security validation for MCP installer operations."""
    
    # Whitelist of allowed MCP servers
    ALLOWED_MCP_SERVERS = {
        "sequential", "context7", "magic", "playwright", "puppeteer"
    }
    
    # Allowed patterns for server commands  
    COMMAND_PATTERN = re.compile(r'^[a-zA-Z0-9_\-]+$')
    
    # Allowed patterns for server IDs
    SERVER_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_\-]+$')
    
    # Allowed patterns for API key names
    API_KEY_NAME_PATTERN = re.compile(r'^[A-Z0-9_]+$')
    
    @classmethod
    def validate_server_id(cls, server_id: str) -> bool:
        """Validate MCP server ID against whitelist and pattern."""
        if not server_id or not isinstance(server_id, str):
            return False
        
        # Check against whitelist
        if server_id not in cls.ALLOWED_MCP_SERVERS:
            return False
        
        # Check pattern
        return bool(cls.SERVER_ID_PATTERN.match(server_id))
    
    @classmethod
    def validate_command_name(cls, command_name: str) -> bool:
        """Validate command name pattern."""
        if not command_name or not isinstance(command_name, str):
            return False
        return bool(cls.COMMAND_PATTERN.match(command_name))
    
    @classmethod
    def validate_api_key_name(cls, key_name: str) -> bool:
        """Validate API key name pattern."""
        if not key_name or not isinstance(key_name, str):
            return False
        return bool(cls.API_KEY_NAME_PATTERN.match(key_name))
    
    @classmethod
    def sanitize_for_subprocess(cls, value: str) -> str:
        """Sanitize a string for safe subprocess usage."""
        if not isinstance(value, str):
            raise ValueError("Value must be a string")
        return shlex.quote(value)
    
    @classmethod
    def validate_and_sanitize_env_value(cls, value: str) -> str:
        """Validate and sanitize environment variable value."""
        if not isinstance(value, str):
            raise ValueError("Environment variable value must be a string")
        
        # Remove any potentially dangerous characters
        sanitized = re.sub(r'[^\w\-\.\+=/@]', '', value)
        
        if len(sanitized) != len(value):
            raise ValueError("Environment variable contains invalid characters")
        
        return sanitized
    
    @classmethod
    def log_subprocess_call(cls, cmd: List[str], env_keys: Optional[List[str]] = None):
        """Log subprocess call for security audit."""
        print(f"[SECURITY] Executing command: {' '.join(shlex.quote(arg) for arg in cmd)}")
        if env_keys:
            print(f"[SECURITY] Environment variables set: {', '.join(env_keys)}")


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
        self.security_validator = SecurityValidator()
        # Initialize confirmation dialog when needed
        self.confirm = None
        
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
        # Only include validated server configurations
        config = {
            "name": "MCP Servers",
            "components": {}
        }
        
        # Define valid server configurations - only include whitelisted servers
        valid_servers = {
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
        
        # Validate each server configuration before adding
        for server_id, server_config in valid_servers.items():
            if (SecurityValidator.validate_server_id(server_id) and 
                SecurityValidator.validate_command_name(server_config["command"])):
                config["components"][server_id] = server_config
            else:
                print(f"[SECURITY] Invalid server configuration for '{server_id}' - excluding from default config")
        
        return config
    
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
                # Validate server ID before selection
                if not self.security_validator.validate_server_id(choice):
                    self.log_error(f"Invalid server ID '{choice}' - not in whitelist")
                    continue
                
                # Single selection - ask if user wants to add more
                selected = {choice}
                while True:
                    if ConfirmationDialog("Add another server?").confirm(default=False):
                        additional = menu.show("Select additional server")
                        if additional and additional in components:
                            if self.security_validator.validate_server_id(additional):
                                selected.add(additional)
                            else:
                                self.log_error(f"Invalid server ID '{additional}' - not in whitelist")
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
                    if c in components and self.security_validator.validate_server_id(c):
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
            # Validate server ID
            if not self.security_validator.validate_server_id(server_id):
                self.log_error(f"Invalid server ID '{server_id}' - skipping API key collection")
                continue
            
            server_name = config["name"]
            key_name = config.get("key_name", f"{server_id.upper()}_API_KEY")
            
            # Validate API key name
            if not self.security_validator.validate_api_key_name(key_name):
                self.log_error(f"Invalid API key name '{key_name}' - skipping")
                continue
            
            key_description = config.get("key_description", f"API key for {server_name}")
            
            print(f"\n{self.colors.info('Required:')} {key_description}")
            
            # Check if key is already in environment
            existing_key = os.environ.get(key_name)
            if existing_key:
                if ConfirmationDialog(f"Use existing {key_name} from environment?").confirm():
                    try:
                        validated_key = self.security_validator.validate_and_sanitize_env_value(existing_key)
                        self.api_keys[server_id] = validated_key
                        self.log_success(f"Using existing {key_name}")
                        continue
                    except ValueError as e:
                        self.log_error(f"Invalid existing API key: {e}")
                        # Continue to prompt for new key
            
            # Get key from user
            while True:
                api_key = getpass.getpass(f"Enter {key_name}: ")
                
                if not api_key.strip():
                    if ConfirmationDialog("Skip this server? (API key required)").confirm(default=False):
                        self.selected_servers.discard(server_id)
                        break
                    continue
                
                # Basic validation and sanitization
                if self.validator.validate_api_key(api_key):
                    try:
                        validated_key = self.security_validator.validate_and_sanitize_env_value(api_key.strip())
                        self.api_keys[server_id] = validated_key
                        self.log_success(f"API key for {server_name} collected")
                        break
                    except ValueError as e:
                        self.log_error(f"Invalid API key: {e}")
                        if not ConfirmationDialog("Try again?").confirm():
                            self.selected_servers.discard(server_id)
                            break
                else:
                    self.log_error("Invalid API key format (too short or invalid characters)")
                    if not ConfirmationDialog("Try again?").confirm():
                        self.selected_servers.discard(server_id)
                        break
        
        return True
    
    def check_existing_servers(self) -> Dict[str, bool]:
        """Check which MCP servers are already installed."""
        self.log_info("Checking existing MCP server installations...")
        
        existing_servers = {}
        
        try:
            # Use claude mcp list to check existing servers - using hardcoded safe command
            cmd = ["claude", "mcp", "list", "-s", "user"]
            
            # Log the subprocess call for security audit
            self.security_validator.log_subprocess_call(cmd)
            
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                output = result.stdout
                for server_id in self.selected_servers:
                    # Validate server_id before using
                    if not self.security_validator.validate_server_id(server_id):
                        self.log_error(f"Invalid server ID '{server_id}' - skipping check")
                        existing_servers[server_id] = False
                        continue
                        
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
        """Install a single MCP server with security validation."""
        # Security validation first
        if not self.security_validator.validate_server_id(server_id):
            self.log_error(f"Security validation failed: Invalid server ID '{server_id}'")
            return False
        
        server_name = config["name"]
        package_name = config["package"]
        command_name = config["command"]
        
        # Validate command name
        if not self.security_validator.validate_command_name(command_name):
            self.log_error(f"Security validation failed: Invalid command name '{command_name}'")
            return False
        
        self.log_info(f"Installing {server_name}...")
        
        try:
            # Prepare environment for installation - copy only safe variables
            env = {}
            # Copy only essential environment variables
            safe_env_vars = ['PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL', 'NODE_PATH']
            for var in safe_env_vars:
                if var in os.environ:
                    env[var] = os.environ[var]
            
            env_keys_added = []
            
            # Add API key to environment if required - with validation
            if server_id in self.api_keys:
                key_name = config.get("key_name", f"{server_id.upper()}_API_KEY")
                
                # Validate API key name
                if not self.security_validator.validate_api_key_name(key_name):
                    self.log_error(f"Security validation failed: Invalid API key name '{key_name}'")
                    return False
                
                # The API key was already validated during collection
                env[key_name] = self.api_keys[server_id]
                env_keys_added.append(key_name)
            
            # Build command with validated inputs - using explicit list construction
            cmd = [
                "claude", "mcp", "add",
                server_id,  # Already validated above
                "--command", command_name,  # Already validated above
                "--scope", "user"
            ]
            
            # Log the subprocess call for security audit
            self.security_validator.log_subprocess_call(cmd, env_keys_added)
            
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
                    # Sanitize error output before printing
                    sanitized_error = re.sub(r'[^\w\s\-\.\=\:\(\)\[\]]', '', result.stderr)
                    print(f"Error: {sanitized_error}")
                return False
        
        except subprocess.TimeoutExpired:
            self.log_error(f"Timeout installing {server_name}")
            return False
        except Exception as e:
            self.log_error(f"Error installing {server_name}: {e}")
            return False
    
    def test_server_connectivity(self, server_id: str, config: Dict[str, Any]) -> bool:
        """Test connectivity to an installed MCP server with security validation."""
        # Validate server ID
        if not self.security_validator.validate_server_id(server_id):
            self.log_error(f"Security validation failed: Invalid server ID '{server_id}'")
            return False
        
        server_name = config["name"]
        
        try:
            # Test server connectivity using claude mcp list with validated server_id
            cmd = ["claude", "mcp", "list", "-s", "user", server_id]
            
            # Log the subprocess call for security audit
            self.security_validator.log_subprocess_call(cmd)
            
            result = subprocess.run(
                cmd,
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
                if ConfirmationDialog(f"Server '{server_id}' already exists. Reinstall?").confirm():
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
        # Validate pre-selected servers against whitelist
        validated_servers = set()
        for server in args.servers:
            if SecurityValidator.validate_server_id(server):
                validated_servers.add(server)
            else:
                print(f"[SECURITY] Invalid server ID '{server}' provided via command line - ignoring")
        installer.selected_servers = validated_servers
    
    success = installer.install()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())