#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Settings Installer

Smart settings.json editor that adds SuperClaude configuration snippets
to existing Claude Code settings without replacing the entire file.
Preserves user customizations while adding framework configuration.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from copy import deepcopy

# Add utils to path for imports
utils_path = str(Path(__file__).parent.parent / "utils")
sys.path.insert(0, utils_path)

try:
    from colors import Colors
    from validation import SystemValidator, InputValidator
    from path_security import SecureInstaller, PathTraversalError
    from logger import LoggerMixin, get_logger
    from installation_state import InstallationStateManager, InstallationPhase
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
        def muted(self, msg): return f"\033[0;37m{msg}\033[0m"
    
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


class SettingsInstaller(SecureInstaller, LoggerMixin if 'LoggerMixin' in globals() else object):
    """Smart settings.json editor for SuperClaude configuration with security validation."""
    
    def __init__(self, project_dir: str):
        """Initialize settings installer.
        
        Args:
            project_dir: SuperClaude project directory
        """
        try:
            # Initialize secure installer base class
            super().__init__(project_dir)
            self.settings_file = self.claude_dir / "settings.json"
            self.version = "3.0.0"
        except (ValueError, PathTraversalError) as e:
            raise ValueError(f"Security validation failed: {e}")
        
        # Initialize utilities
        self.colors = Colors()
        self.validator = SystemValidator()
        self.input_validator = InputValidator() if 'InputValidator' in globals() else None
        
        # Load SuperClaude configuration template
        self.superclaude_config = self._load_superclaude_config()
        
    def _load_superclaude_config(self) -> Dict[str, Any]:
        """Load SuperClaude configuration template."""
        try:
            config_file = self.secure_path(self.project_dir / "SuperClaude" / "Settings" / "settings.json")
            
            with open(config_file, 'r') as f:
                template = json.load(f)
                
            # Extract only Claude Code-compatible configuration
            superclaude_config = {}
            
            # Valid Claude Code fields that SuperClaude uses
            valid_fields = ["permissions", "hooks", "env", "enabledMcpjsonServers", 
                          "includeCoAuthoredBy", "cleanupPeriodDays"]
            
            for field in valid_fields:
                if field in template:
                    superclaude_config[field] = template[field]
            
            # Convert old mcp field to enabledMcpjsonServers if present
            if "mcp" in template and "servers" in template["mcp"]:
                superclaude_servers = ["sequential-thinking", "context7", "magic", 
                                     "playwright", "puppeteer"]
                enabled_servers = []
                for server_id in template["mcp"]["servers"]:
                    if server_id in superclaude_servers:
                        enabled_servers.append(server_id)
                
                if enabled_servers:
                    superclaude_config["enabledMcpjsonServers"] = enabled_servers
            
            return superclaude_config
            
        except (FileNotFoundError, json.JSONDecodeError, PathTraversalError) as e:
            self.log_error(f"Failed to load SuperClaude configuration template: {e}")
            return self._get_default_superclaude_config()
    
    def _get_default_superclaude_config(self) -> Dict[str, Any]:
        """Get default SuperClaude configuration if template not available."""
        return {
            "env": {
                "CLAUDE_CODE_SUPERCLAUDE": "enabled",
                "SUPERCLAUDE_VERSION": self.version,
                "SUPERCLAUDE_HOOKS_ENABLED": "true",
                "SUPERCLAUDE_GLOBAL_DIR": str(self.claude_dir),
                "SUPERCLAUDE_HOOKS_DIR": str(self.claude_dir / "hooks")
            },
            "enabledMcpjsonServers": [
                "sequential-thinking",
                "context7", 
                "magic",
                "playwright",
                "puppeteer"
            ]
        }
    
    def log_info(self, message: str, **kwargs):
        """Log info message."""
        if hasattr(self, '_logger'):
            super().log_info(message, **kwargs)
        else:
            print(self.colors.info(f"[INFO] {message}"))
    
    def log_success(self, message: str, **kwargs):
        """Log success message."""
        if hasattr(self, '_logger'):
            super().log_success(message, **kwargs)
        else:
            print(self.colors.success(f"[✓] {message}"))
    
    def log_warning(self, message: str, **kwargs):
        """Log warning message."""
        if hasattr(self, '_logger'):
            super().log_warning(message, **kwargs)
        else:
            print(self.colors.warning(f"[!] {message}"))
    
    def log_error(self, message: str, **kwargs):
        """Log error message."""
        if hasattr(self, '_logger'):
            super().log_error(message, **kwargs)
        else:
            print(self.colors.error(f"[✗] {message}"))
    
    def load_existing_settings(self) -> Dict[str, Any]:
        """Load existing Claude Code settings.json."""
        try:
            settings_file = self.secure_path(self.settings_file)
        except PathTraversalError as e:
            self.log_error(f"Invalid settings file path: {e}")
            return {}
        
        if not settings_file.exists():
            self.log_info("No existing settings.json found - will create new file")
            return {}
        
        try:
            with open(settings_file, 'r') as f:
                existing_settings = json.load(f)
            
            self.log_success(f"Loaded existing settings with {len(existing_settings)} top-level keys")
            return existing_settings
            
        except json.JSONDecodeError as e:
            self.log_error(f"Invalid JSON in existing settings.json: {e}")
            # Create backup of corrupted file
            try:
                backup_file = self.secure_path(str(self.settings_file) + '.backup')
                settings_file.rename(backup_file)
                self.log_warning(f"Backed up corrupted settings to {backup_file}")
            except PathTraversalError:
                self.log_error("Could not create backup - path validation failed")
            return {}
        except Exception as e:
            self.log_error(f"Failed to read existing settings: {e}")
            return {}
    
    def merge_configurations(self, existing: Dict[str, Any], superclaude: Dict[str, Any]) -> Dict[str, Any]:
        """Intelligently merge SuperClaude config with existing settings."""
        merged = deepcopy(existing)
        
        # Valid Claude Code top-level fields (including superclaude metadata)
        valid_fields = ["apiKeyHelper", "cleanupPeriodDays", "env", "includeCoAuthoredBy",
                       "permissions", "hooks", "model", "forceLoginMethod", 
                       "enableAllProjectMcpServers", "enabledMcpjsonServers", 
                       "disabledMcpjsonServers", "superclaude"]
        
        for key, value in superclaude.items():
            # Skip invalid fields
            if key not in valid_fields:
                self.log_warning(f"Skipping invalid field for Claude Code: {key}")
                continue
                
            if key not in merged:
                # New section - add entirely
                merged[key] = deepcopy(value)
                self.log_success(f"Added new section: {key}")
            
            elif isinstance(value, dict) and isinstance(merged[key], dict):
                # Merge dictionaries recursively
                merged[key] = self._merge_dicts(merged[key], value, key)
            
            elif key == "env":
                # Special handling for environment variables - merge carefully
                merged[key] = self._merge_env_vars(merged.get(key, {}), value)
            
            elif key == "enabledMcpjsonServers":
                # Merge MCP server lists
                existing_servers = set(merged.get(key, []))
                new_servers = set(value)
                merged[key] = list(existing_servers | new_servers)
                self.log_success(f"Updated MCP servers: {merged[key]}")
            
            else:
                # For other types, update the value
                merged[key] = deepcopy(value)
                self.log_success(f"Updated section: {key}")
        
        return merged
    
    def _merge_dicts(self, existing: Dict[str, Any], new: Dict[str, Any], section_name: str) -> Dict[str, Any]:
        """Recursively merge dictionary configurations."""
        merged = deepcopy(existing)
        updates = []
        
        for key, value in new.items():
            if key not in merged:
                merged[key] = deepcopy(value)
                updates.append(f"added {key}")
            elif isinstance(value, dict) and isinstance(merged[key], dict):
                merged[key] = self._merge_dicts(merged[key], value, f"{section_name}.{key}")
            else:
                # Update existing value
                old_value = merged[key]
                merged[key] = deepcopy(value)
                if old_value != value:
                    updates.append(f"updated {key}")
        
        if updates:
            self.log_success(f"Merged {section_name}: {', '.join(updates)}")
        
        return merged
    
    def _merge_env_vars(self, existing: Dict[str, str], new: Dict[str, str]) -> Dict[str, str]:
        """Merge environment variables, preserving existing non-SuperClaude vars."""
        merged = deepcopy(existing)
        superclaude_vars = []
        
        for key, value in new.items():
            # Validate environment variable name and value
            if not self._validate_env_var(key, value):
                self.log_warning(f"Skipping invalid environment variable: {key}")
                continue
                
            if key.startswith("SUPERCLAUDE_") or key in ["CLAUDE_HOOKS_ENABLED"]:
                merged[key] = value
                superclaude_vars.append(key)
            elif key not in merged:
                # Add new non-conflicting env vars
                merged[key] = value
                superclaude_vars.append(key)
        
        if superclaude_vars:
            self.log_success(f"Added/updated environment variables: {', '.join(superclaude_vars)}")
        
        return merged
    
    def _validate_env_var(self, key: str, value: str) -> bool:
        """Validate environment variable name and value."""
        # Validate key format
        if not key or not isinstance(key, str):
            return False
        
        # Environment variable names should be alphanumeric with underscores
        import re
        if not re.match(r'^[A-Z][A-Z0-9_]*$', key):
            return False
        
        # Validate value
        if not isinstance(value, str):
            return False
        
        # Use input validator if available for more thorough checking
        if self.input_validator:
            # Check for injection patterns
            if hasattr(self.input_validator, '_contains_injection_patterns'):
                if self.input_validator._contains_injection_patterns(value):
                    return False
        
        # Basic length check
        if len(value) > 1000:
            return False
        
        return True
    
# Note: _merge_mcp_servers method removed as it's no longer used
    # MCP server configuration is now handled through enabledMcpjsonServers list
    
    def validate_merged_settings(self, settings: Dict[str, Any]) -> bool:
        """Validate the merged settings configuration."""
        errors = []
        
        # Validate only Claude Code-compatible fields (including superclaude metadata)
        valid_top_level = ["apiKeyHelper", "cleanupPeriodDays", "env", 
                          "includeCoAuthoredBy", "permissions", "hooks", "model",
                          "forceLoginMethod", "enableAllProjectMcpServers",
                          "enabledMcpjsonServers", "disabledMcpjsonServers", "superclaude"]
        
        # Check for invalid top-level fields
        for key in settings.keys():
            if key not in valid_top_level:
                errors.append(f"Invalid top-level field: {key}")
        
        # Validate hooks section if present
        if "hooks" in settings:
            hooks = settings["hooks"]
            # hooks can have various event types, no specific validation needed
        
        # Validate MCP servers if present
        if "enabledMcpjsonServers" in settings:
            if not isinstance(settings["enabledMcpjsonServers"], list):
                errors.append("enabledMcpjsonServers must be a list")
        
        # Validate JSON serializability
        try:
            json.dumps(settings, indent=2)
        except (TypeError, ValueError) as e:
            errors.append(f"Settings not JSON serializable: {e}")
        
        if errors:
            for error in errors:
                self.log_error(f"Validation error: {error}")
            return False
        
        self.log_success("Settings validation passed")
        return True
    
    def backup_existing_settings(self, state_manager: Optional['InstallationStateManager'] = None) -> Optional[Path]:
        """Create backup of existing settings.json.
        
        Args:
            state_manager: Optional state manager for tracking backup
            
        Returns:
            Path to backup file or None if failed
        """
        try:
            settings_file = self.secure_path(self.settings_file)
        except PathTraversalError as e:
            self.log_error(f"Invalid settings file path: {e}")
            return None
        
        if not settings_file.exists():
            return None
        
        try:
            # Use state manager backup if available
            if state_manager:
                backup_file = state_manager.create_backup(settings_file)
                if backup_file:
                    self.log_success(f"Created settings backup: {backup_file}")
                    state_manager.add_file_modified(settings_file, backup_file)
                    return backup_file
            
            # Fallback to manual backup
            timestamp = __import__('datetime').datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir = self.secure_mkdir(self.claude_dir / "backup")
            
            backup_file = self.secure_path(backup_dir / f"settings_{timestamp}.json.backup")
            
            import shutil
            shutil.copy2(settings_file, backup_file)
            
            self.log_success(f"Created settings backup: {backup_file}")
            return backup_file
            
        except Exception as e:
            self.log_error(f"Failed to create backup: {e}")
            return None
    
    def write_settings(self, settings: Dict[str, Any]) -> bool:
        """Write merged settings to settings.json."""
        try:
            # Ensure directory exists
            claude_dir = self.secure_mkdir(self.claude_dir)
            
            # Write with proper formatting
            settings_file = self.secure_path(self.settings_file)
            with open(settings_file, 'w') as f:
                json.dump(settings, f, indent=2, sort_keys=True)
            
            self.log_success(f"Updated settings.json: {settings_file}")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to write settings: {e}")
            return False
    
    def show_settings_summary(self, settings: Dict[str, Any]):
        """Show summary of settings configuration."""
        print(f"\n{self.colors.header('Settings Configuration Summary')}")
        print("=" * 50)
        
        # Hooks configuration
        if "hooks" in settings:
            hooks_config = settings["hooks"]
            hook_count = sum(len(hooks.get("hooks", [])) for hooks in hooks_config.values() if isinstance(hooks, dict))
            print(f"\n{self.colors.success('Hooks System:')} Configured")
            print(f"  Total hooks: {hook_count}")
            print(f"  Event types: {', '.join(hooks_config.keys())}")
        
        # Environment variables
        if "env" in settings:
            env_vars = settings["env"]
            superclaude_vars = [k for k in env_vars.keys() if k.startswith("SUPERCLAUDE_")]
            if superclaude_vars:
                print(f"\n{self.colors.success('Environment Variables:')} {len(superclaude_vars)} SuperClaude vars")
                for var in superclaude_vars[:5]:  # Show first 5
                    print(f"  {var}: {env_vars[var]}")
                if len(superclaude_vars) > 5:
                    print(f"  ... and {len(superclaude_vars) - 5} more")
        
        # MCP servers
        if "enabledMcpjsonServers" in settings:
            mcp_servers = settings["enabledMcpjsonServers"]
            superclaude_servers = [s for s in mcp_servers if s in ["sequential-thinking", "context7", "magic", "playwright", "puppeteer"]]
            if superclaude_servers:
                print(f"\n{self.colors.success('MCP Servers:')} {len(superclaude_servers)} SuperClaude servers")
                for server in superclaude_servers:
                    print(f"  ✓ {server}")
        
        # Permissions
        if "permissions" in settings:
            perms = settings["permissions"]
            print(f"\n{self.colors.success('Permissions:')} {perms.get('defaultMode', 'not set')}")
            if "allow" in perms:
                print(f"  Allow rules: {len(perms['allow'])}")
            if "deny" in perms:
                print(f"  Deny rules: {len(perms['deny'])}")
        
        # Other settings
        other_settings = []
        if "includeCoAuthoredBy" in settings:
            other_settings.append(f"Co-authored-by: {settings['includeCoAuthoredBy']}")
        if "cleanupPeriodDays" in settings:
            other_settings.append(f"Cleanup: {settings['cleanupPeriodDays']} days")
        
        if other_settings:
            print(f"\n{self.colors.muted('Other Settings:')} {', '.join(other_settings)}")
        
        print(f"\n{self.colors.success('Settings file ready!')}")
        print("\nNext Steps:")
        print("  1. Restart Claude Code to load new settings")
        print("  2. Test configuration: claude doctor")
        print("  3. Verify MCP servers are working")
    
    def install(self, installation_type: str = "standard", state_manager: Optional['InstallationStateManager'] = None) -> bool:
        """Install SuperClaude configuration into settings.json.
        
        Args:
            installation_type: Installation type (standard/development)
            state_manager: Optional state manager for tracking installation
        """
        try:
            self.log_info("Starting settings configuration...")
            
            # Safely initialize config structure if needed
            if not isinstance(self.superclaude_config, dict):
                self.superclaude_config = {}
            
            # Use setdefault to ensure superclaude section exists with all required fields
            superclaude_meta = self.superclaude_config.setdefault("superclaude", {})
            
            # Ensure superclaude_meta is a dictionary before accessing it
            if not isinstance(superclaude_meta, dict):
                self.log_warning("Invalid superclaude configuration found, resetting to defaults")
                superclaude_meta = {}
                self.superclaude_config["superclaude"] = superclaude_meta
            
            # Set default values using setdefault for safe access
            superclaude_meta.setdefault("version", self.version)
            superclaude_meta.setdefault("framework", "SuperClaude")
            superclaude_meta.setdefault("components", ["core", "hooks", "commands", "mcp"])
            superclaude_meta.setdefault("performance_target", "100ms")
            
            # Now safely update with installation-specific data
            superclaude_meta["installation_type"] = installation_type
            superclaude_meta["installation_date"] = __import__('datetime').datetime.now().isoformat()
            
            # Load existing settings
            existing_settings = self.load_existing_settings()
            
            # Create backup if settings exist
            backup_file = self.backup_existing_settings(state_manager)
            
            # Merge configurations
            merged_settings = self.merge_configurations(existing_settings, self.superclaude_config)
            
            # Validate merged settings
            if not self.validate_merged_settings(merged_settings):
                self.log_error("Settings validation failed")
                return False
            
            # Write updated settings
            if not self.write_settings(merged_settings):
                return False
            
            # Track file creation/modification
            if state_manager:
                if backup_file:
                    # File was modified
                    state_manager.add_file_modified(self.settings_file, backup_file)
                else:
                    # File was created
                    state_manager.add_file_created(self.settings_file)
            
            # Show summary
            self.show_settings_summary(merged_settings)
            
            return True
            
        except KeyboardInterrupt:
            print("\n\nSettings installation interrupted by user.")
            return False
        except Exception as e:
            self.log_error(f"Unexpected error during settings installation: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="SuperClaude Settings Installer")
    parser.add_argument("--project-dir", required=True, 
                       help="SuperClaude project directory")
    parser.add_argument("--installation-type", choices=["standard", "development"],
                       default="standard", help="Installation type")
    
    args = parser.parse_args()
    
    try:
        installer = SettingsInstaller(args.project_dir)
        success = installer.install(args.installation_type)
    except ValueError as e:
        print(f"Error: {e}")
        return 1
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())