#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Settings Validation Script
Validates global and local settings configuration for Claude Code compatibility
"""

import json
import os
import sys
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import re

class SettingsValidator:
    """Comprehensive settings validation for SuperClaude Framework"""
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []
        self.global_settings_path = Path.home() / ".claude" / "settings.json"
        self.project_settings_path = Path.cwd() / ".claude" / "settings.local.json"
        self.hooks_dir = Path.home() / ".claude" / "hooks"
        self.project_hooks_dir = Path.cwd() / ".claude" / "hooks"
        
    def validate_json_structure(self, settings_path: Path, settings_name: str) -> Optional[Dict]:
        """Validate JSON structure and syntax"""
        if not settings_path.exists():
            self.warnings.append(f"❌ {settings_name} not found at: {settings_path}")
            return None
            
        try:
            with open(settings_path, 'r') as f:
                settings = json.load(f)
            self.info.append(f"✅ {settings_name} JSON structure is valid")
            return settings
        except json.JSONDecodeError as e:
            self.errors.append(f"❌ {settings_name} JSON syntax error: {e}")
            return None
        except Exception as e:
            self.errors.append(f"❌ {settings_name} read error: {e}")
            return None
    
    def validate_permissions(self, settings: Dict) -> None:
        """Validate permissions configuration"""
        if "permissions" not in settings:
            self.warnings.append("⚠️  No permissions configuration found")
            return
            
        permissions = settings["permissions"]
        
        # Check permission modes
        if "defaultMode" in permissions:
            valid_modes = ["default", "acceptEdits", "plan", "bypassPermissions"]
            if permissions["defaultMode"] not in valid_modes:
                self.errors.append(f"❌ Invalid defaultMode: {permissions['defaultMode']}")
            else:
                self.info.append(f"✅ Valid defaultMode: {permissions['defaultMode']}")
        
        # Check allow/deny rules
        for rule_type in ["allow", "deny"]:
            if rule_type in permissions:
                rules = permissions[rule_type]
                if not isinstance(rules, list):
                    self.errors.append(f"❌ {rule_type} rules must be a list")
                else:
                    self.info.append(f"✅ {rule_type} rules: {len(rules)} configured")
                    
                    # Validate rule patterns
                    for rule in rules:
                        if not isinstance(rule, str):
                            self.errors.append(f"❌ Invalid rule format: {rule}")
                        elif not re.match(r'^[A-Za-z_][A-Za-z0-9_]*\([^)]*\)$|^\*$', rule):
                            self.warnings.append(f"⚠️  Potentially invalid rule pattern: {rule}")
    
    def validate_hooks(self, settings: Dict) -> None:
        """Validate hooks configuration"""
        if "hooks" not in settings:
            self.warnings.append("⚠️  No hooks configuration found")
            return
            
        hooks = settings["hooks"]
        valid_events = ["PreToolUse", "PostToolUse", "SubagentStop", "Stop", "Notification"]
        
        for event, event_hooks in hooks.items():
            if event not in valid_events:
                self.warnings.append(f"⚠️  Unknown hook event: {event}")
                continue
                
            if not isinstance(event_hooks, list):
                self.errors.append(f"❌ {event} hooks must be a list")
                continue
                
            for hook_config in event_hooks:
                if not isinstance(hook_config, dict):
                    self.errors.append(f"❌ Hook configuration must be a dictionary")
                    continue
                    
                # Validate matcher
                if "matcher" not in hook_config:
                    self.errors.append(f"❌ {event} hook missing 'matcher' field")
                    continue
                    
                # Validate hooks array
                if "hooks" not in hook_config or not isinstance(hook_config["hooks"], list):
                    self.errors.append(f"❌ {event} hook missing 'hooks' array")
                    continue
                    
                for hook in hook_config["hooks"]:
                    if not isinstance(hook, dict):
                        self.errors.append(f"❌ Hook must be a dictionary")
                        continue
                        
                    if "type" not in hook or hook["type"] != "command":
                        self.errors.append(f"❌ Hook must have type 'command'")
                        continue
                        
                    if "command" not in hook:
                        self.errors.append(f"❌ Hook missing 'command' field")
                        continue
                        
                    # Validate timeout
                    if "timeout" in hook and not isinstance(hook["timeout"], (int, float)):
                        self.errors.append(f"❌ Hook timeout must be a number")
        
        self.info.append(f"✅ Hooks configuration validated for {len(hooks)} event types")
    
    def validate_mcp_servers(self, settings: Dict) -> None:
        """Validate MCP server configuration"""
        if "mcp" not in settings:
            self.warnings.append("⚠️  No MCP configuration found")
            return
            
        mcp = settings["mcp"]
        
        if "servers" in mcp:
            servers = mcp["servers"]
            self.info.append(f"✅ MCP servers configured: {len(servers)}")
            
            for server_name, server_config in servers.items():
                if not isinstance(server_config, dict):
                    self.errors.append(f"❌ MCP server '{server_name}' config must be a dictionary")
                    continue
                    
                required_fields = ["command"]
                for field in required_fields:
                    if field not in server_config:
                        self.errors.append(f"❌ MCP server '{server_name}' missing required field: {field}")
                        
                # Validate scope
                if "scope" in server_config:
                    valid_scopes = ["local", "project", "user"]
                    if server_config["scope"] not in valid_scopes:
                        self.warnings.append(f"⚠️  MCP server '{server_name}' has invalid scope: {server_config['scope']}")
        
        # Validate MCP settings
        mcp_settings = ["defaultTimeout", "retryAttempts", "enableFallbacks"]
        for setting in mcp_settings:
            if setting in mcp:
                if setting in ["defaultTimeout", "retryAttempts"] and not isinstance(mcp[setting], (int, float)):
                    self.errors.append(f"❌ MCP {setting} must be a number")
                elif setting == "enableFallbacks" and not isinstance(mcp[setting], bool):
                    self.errors.append(f"❌ MCP {setting} must be a boolean")
    
    def validate_superclaude_config(self, settings: Dict) -> None:
        """Validate SuperClaude-specific configuration"""
        if "superclaude" not in settings:
            self.warnings.append("⚠️  No SuperClaude configuration found")
            return
            
        sc = settings["superclaude"]
        
        # Validate version
        if "version" in sc:
            if not re.match(r'^\d+\.\d+\.\d+$', sc["version"]):
                self.warnings.append(f"⚠️  Invalid version format: {sc['version']}")
            else:
                self.info.append(f"✅ SuperClaude version: {sc['version']}")
        
        # Validate boolean settings
        bool_settings = ["framework_enabled", "wave_mode.enabled", "performance.monitoring_enabled", 
                        "quality_gates.enabled", "intelligence.compound_enabled"]
        
        for setting_path in bool_settings:
            keys = setting_path.split('.')
            current = sc
            for key in keys[:-1]:
                if key in current and isinstance(current[key], dict):
                    current = current[key]
                else:
                    break
            else:
                final_key = keys[-1]
                if final_key in current and not isinstance(current[final_key], bool):
                    self.errors.append(f"❌ SuperClaude {setting_path} must be a boolean")
        
        # Validate numeric settings  
        numeric_settings = ["performance.target_execution_time", "wave_mode.max_waves", 
                           "quality_gates.coverage_threshold"]
        
        for setting_path in numeric_settings:
            keys = setting_path.split('.')
            current = sc
            for key in keys[:-1]:
                if key in current and isinstance(current[key], dict):
                    current = current[key]
                else:
                    break
            else:
                final_key = keys[-1]
                if final_key in current and not isinstance(current[final_key], (int, float)):
                    self.errors.append(f"❌ SuperClaude {setting_path} must be a number")
        
        self.info.append("✅ SuperClaude configuration validated")
    
    def validate_hook_files(self) -> None:
        """Validate existence and executability of hook files"""
        hook_files = [
            "wave_coordinator.py", "task_manager.py", "context_accumulator.py",
            "wave_performance_monitor.py", "performance_monitor.py", "token_optimizer.py",
            "quality_validator.py", "quality_gates_coordinator.py", "error_handler.py",
            "agent_manager.py", "hook_registry.py", "mcp_coordinator.py",
            "synthesis_engine.py", "result_collector.py", "wave_sequencer.py",
            "orchestration_engine.py"
        ]
        
        # Check global hooks
        global_hooks_found = 0
        for hook_file in hook_files:
            hook_path = self.hooks_dir / hook_file
            if hook_path.exists():
                global_hooks_found += 1
                if not os.access(hook_path, os.X_OK):
                    self.warnings.append(f"⚠️  Global hook not executable: {hook_file}")
            else:
                self.warnings.append(f"⚠️  Global hook missing: {hook_file}")
        
        # Check project hooks
        project_hooks_found = 0
        if self.project_hooks_dir.exists():
            for hook_file in hook_files:
                hook_path = self.project_hooks_dir / hook_file
                if hook_path.exists():
                    project_hooks_found += 1
                    if not os.access(hook_path, os.X_OK):
                        self.warnings.append(f"⚠️  Project hook not executable: {hook_file}")
        
        if global_hooks_found >= 15:
            self.info.append(f"✅ Global hooks: {global_hooks_found}/{len(hook_files)} found")
        else:
            self.warnings.append(f"⚠️  Global hooks: {global_hooks_found}/{len(hook_files)} found")
            
        if project_hooks_found > 0:
            self.info.append(f"✅ Project hooks: {project_hooks_found}/{len(hook_files)} found")
    
    def test_hook_execution(self) -> None:
        """Test basic hook execution"""
        test_hooks = ["wave_performance_monitor.py", "context_accumulator.py"]
        
        for hook_name in test_hooks:
            # Try global hook first
            global_hook = self.hooks_dir / hook_name
            project_hook = self.project_hooks_dir / hook_name
            
            hook_path = global_hook if global_hook.exists() else project_hook if project_hook.exists() else None
            
            if hook_path:
                try:
                    # Test with minimal JSON input
                    result = subprocess.run([
                        "python3", str(hook_path)
                    ], input='{"tool": "test", "args": {}}', text=True, 
                    capture_output=True, timeout=5)
                    
                    if result.returncode == 0:
                        self.info.append(f"✅ Hook execution test passed: {hook_name}")
                    else:
                        self.warnings.append(f"⚠️  Hook execution test failed: {hook_name}")
                except subprocess.TimeoutExpired:
                    self.warnings.append(f"⚠️  Hook execution timeout: {hook_name}")
                except Exception as e:
                    self.warnings.append(f"⚠️  Hook execution error: {hook_name} - {e}")
    
    def validate_environment(self) -> None:
        """Validate environment setup"""
        env_vars = ["CLAUDE_CODE_SUPERCLAUDE", "SUPERCLAUDE_VERSION", "SUPERCLAUDE_HOOKS_ENABLED"]
        
        for var in env_vars:
            if var in os.environ:
                self.info.append(f"✅ Environment variable set: {var}={os.environ[var]}")
            else:
                self.warnings.append(f"⚠️  Environment variable not set: {var}")
        
        # Check Python path
        python_path = os.environ.get("PYTHONPATH", "")
        if ".claude/hooks" in python_path:
            self.info.append("✅ Python path includes .claude/hooks")
        else:
            self.warnings.append("⚠️  Python path may not include .claude/hooks")
    
    def run_validation(self) -> bool:
        """Run complete validation suite"""
        print("🔍 SuperClaude Framework v3.0 - Settings Validation")
        print("=" * 60)
        
        # Validate global settings
        global_settings = self.validate_json_structure(
            self.global_settings_path, "Global settings.json"
        )
        
        # Validate project settings  
        project_settings = self.validate_json_structure(
            self.project_settings_path, "Project settings.local.json"
        )
        
        # Use global settings for validation if available
        settings_to_validate = global_settings or project_settings
        
        if settings_to_validate:
            self.validate_permissions(settings_to_validate)
            self.validate_hooks(settings_to_validate)
            self.validate_mcp_servers(settings_to_validate)
            self.validate_superclaude_config(settings_to_validate)
        
        # Validate hook files and execution
        self.validate_hook_files()
        self.test_hook_execution()
        
        # Validate environment
        self.validate_environment()
        
        # Report results
        print("\n📊 Validation Results:")
        print("=" * 30)
        
        if self.info:
            print("✅ Successful validations:")
            for item in self.info:
                print(f"   {item}")
        
        if self.warnings:
            print("\n⚠️  Warnings:")
            for item in self.warnings:
                print(f"   {item}")
        
        if self.errors:
            print("\n❌ Errors:")
            for item in self.errors:
                print(f"   {item}")
        
        # Summary
        print(f"\n📈 Summary: {len(self.info)} passed, {len(self.warnings)} warnings, {len(self.errors)} errors")
        
        return len(self.errors) == 0

if __name__ == "__main__":
    validator = SettingsValidator()
    success = validator.run_validation()
    
    if success:
        print("\n🎉 Validation completed successfully!")
        print("SuperClaude Framework is properly configured.")
    else:
        print("\n❌ Validation failed with errors.")
        print("Please fix the errors above before using SuperClaude Framework.")
        sys.exit(1)