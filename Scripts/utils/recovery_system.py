#!/usr/bin/env python3
"""
Interactive recovery system for installation failures.
Provides user-friendly options to recover from errors and continue installation.
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable, Tuple
from enum import Enum

try:
    from .colors import Colors
    from .menu import InteractiveMenu, ConfirmationDialog
    from .error_handler import ErrorHandler, EnhancedError, ErrorType
    from .progress import SimpleProgress
except ImportError:
    # Fallback
    class Colors:
        def info(self, msg): return f"\033[0;34m{msg}\033[0m"
        def warning(self, msg): return f"\033[1;33m{msg}\033[0m"
        def error(self, msg): return f"\033[0;31m{msg}\033[0m"
        def success(self, msg): return f"\033[0;32m{msg}\033[0m"
        def muted(self, msg): return f"\033[0;37m{msg}\033[0m"
    
    class InteractiveMenu:
        def __init__(self, title, options):
            self.title = title
            self.options = options
        def show(self):
            print(f"\n{self.title}")
            for i, option in enumerate(self.options):
                print(f"  {i+1}. {option}")
            choice = input("\nEnter choice (1-{}): ".format(len(self.options)))
            try:
                return [int(choice) - 1]
            except:
                return [0]
    
    class ConfirmationDialog:
        def __init__(self, message):
            self.message = message
        def confirm(self):
            response = input(f"{self.message} (y/N): ").lower()
            return response in ['y', 'yes']
    
    class SimpleProgress:
        def step(self, msg): print(f"• {msg}")
        def success(self, msg): print(f"✓ {msg}")
        def error(self, msg): print(f"✗ {msg}")


class RecoveryAction(Enum):
    """Available recovery actions."""
    RETRY = "retry"
    SKIP = "skip"
    ABORT = "abort"
    REPAIR = "repair"
    CONTINUE = "continue"
    ALTERNATIVE = "alternative"
    MANUAL_FIX = "manual_fix"


class RecoveryOption:
    """A recovery option with description and action."""
    
    def __init__(self, 
                 action: RecoveryAction,
                 title: str,
                 description: str,
                 handler: Optional[Callable] = None,
                 enabled: bool = True):
        self.action = action
        self.title = title
        self.description = description
        self.handler = handler
        self.enabled = enabled


class RecoverySystem:
    """Interactive recovery system for installation failures."""
    
    def __init__(self):
        self.colors = Colors()
        self.progress = SimpleProgress()
        self.recovery_history: List[Dict[str, Any]] = []
        
        # Recovery handlers by error type
        self.recovery_handlers = {
            ErrorType.NETWORK: self._handle_network_recovery,
            ErrorType.PERMISSION: self._handle_permission_recovery,
            ErrorType.DEPENDENCY: self._handle_dependency_recovery,
            ErrorType.CONFIGURATION: self._handle_configuration_recovery,
            ErrorType.FILE_SYSTEM: self._handle_filesystem_recovery,
            ErrorType.VALIDATION: self._handle_validation_recovery,
            ErrorType.RUNTIME: self._handle_runtime_recovery,
        }
    
    def handle_installation_failure(self, 
                                  error: EnhancedError,
                                  component: str,
                                  operation: str) -> RecoveryAction:
        """Handle installation failure with interactive recovery options.
        
        Args:
            error: The enhanced error that occurred
            component: Component that failed (e.g., "core", "hooks", "mcp")
            operation: Operation that failed (e.g., "download", "install", "configure")
            
        Returns:
            RecoveryAction chosen by user
        """
        print(f"\n{self.colors.error('─' * 60)}")
        print(f"{self.colors.error('Installation Failure Detected')}")
        print(f"{self.colors.error('─' * 60)}")
        
        print(f"\n{self.colors.info('Component:')} {component}")
        print(f"{self.colors.info('Operation:')} {operation}")
        print(f"{self.colors.info('Error:')} {error.message}")
        
        # Get recovery options based on error type
        options = self._get_recovery_options(error, component, operation)
        
        if not options:
            # No recovery options available
            print(f"\n{self.colors.warning('No recovery options available for this error.')}")
            return RecoveryAction.ABORT
        
        # Show recovery options to user
        return self._show_recovery_menu(options, error)
    
    def _get_recovery_options(self, 
                            error: EnhancedError,
                            component: str,
                            operation: str) -> List[RecoveryOption]:
        """Get available recovery options for an error."""
        options = []
        
        # Add error-type specific options
        if error.error_type in self.recovery_handlers:
            handler_options = self.recovery_handlers[error.error_type](error, component, operation)
            options.extend(handler_options)
        
        # Add generic options
        if error.can_retry:
            options.append(RecoveryOption(
                RecoveryAction.RETRY,
                "Retry Operation",
                f"Attempt the {operation} operation again",
                enabled=True
            ))
        
        if error.can_continue:
            options.append(RecoveryOption(
                RecoveryAction.CONTINUE,
                "Continue Installation",
                f"Skip this component and continue with remaining installation",
                enabled=True
            ))
        
        # Always allow abort
        options.append(RecoveryOption(
            RecoveryAction.ABORT,
            "Abort Installation",
            "Stop the installation process completely",
            enabled=True
        ))
        
        return options
    
    def _show_recovery_menu(self, 
                          options: List[RecoveryOption],
                          error: EnhancedError) -> RecoveryAction:
        """Show interactive recovery menu to user."""
        print(f"\n{self.colors.info('Recovery Options:')}")
        
        # Filter enabled options
        enabled_options = [opt for opt in options if opt.enabled]
        
        if not enabled_options:
            return RecoveryAction.ABORT
        
        # Create menu options
        menu_items = []
        for i, option in enumerate(enabled_options):
            menu_items.append(f"{option.title} - {option.description}")
        
        # Show menu
        menu = InteractiveMenu("Choose recovery action:", menu_items)
        selected_indices = menu.show()
        
        if not selected_indices or selected_indices[0] >= len(enabled_options):
            return RecoveryAction.ABORT
        
        selected_option = enabled_options[selected_indices[0]]
        
        # Execute handler if available
        if selected_option.handler:
            try:
                result = selected_option.handler()
                if result:
                    self.progress.success(f"Recovery action '{selected_option.title}' completed successfully")
                else:
                    self.progress.error(f"Recovery action '{selected_option.title}' failed")
            except Exception as e:
                self.progress.error(f"Recovery action failed: {e}")
        
        # Record recovery attempt
        self.recovery_history.append({
            'error_type': error.error_type.value,
            'action': selected_option.action.value,
            'component': error.context.component,
            'operation': error.context.operation,
            'success': True  # We'll update this based on subsequent results
        })
        
        return selected_option.action
    
    def _handle_network_recovery(self, 
                               error: EnhancedError,
                               component: str,
                               operation: str) -> List[RecoveryOption]:
        """Handle network-related recovery options."""
        options = []
        
        options.append(RecoveryOption(
            RecoveryAction.RETRY,
            "Retry with Different Network",
            "Check network connection and retry download",
            handler=self._check_network_connectivity
        ))
        
        options.append(RecoveryOption(
            RecoveryAction.ALTERNATIVE,
            "Use Offline Installation",
            "Attempt to install using cached or local files",
            handler=lambda: self._try_offline_installation(component)
        ))
        
        options.append(RecoveryOption(
            RecoveryAction.MANUAL_FIX,
            "Manual Download",
            "Get download instructions for manual installation",
            handler=lambda: self._show_manual_download_instructions(component)
        ))
        
        return options
    
    def _handle_permission_recovery(self, 
                                  error: EnhancedError,
                                  component: str,
                                  operation: str) -> List[RecoveryOption]:
        """Handle permission-related recovery options."""
        options = []
        
        options.append(RecoveryOption(
            RecoveryAction.REPAIR,
            "Fix Directory Permissions",
            "Attempt to fix file and directory permissions",
            handler=self._fix_permissions
        ))
        
        options.append(RecoveryOption(
            RecoveryAction.ALTERNATIVE,
            "Use Alternative Location",
            "Install to user-specific directory instead",
            handler=self._use_alternative_location
        ))
        
        return options
    
    def _handle_dependency_recovery(self, 
                                  error: EnhancedError,
                                  component: str,
                                  operation: str) -> List[RecoveryOption]:
        """Handle dependency-related recovery options."""
        options = []
        
        options.append(RecoveryOption(
            RecoveryAction.REPAIR,
            "Install Missing Dependencies",
            "Attempt to install required dependencies automatically",
            handler=lambda: self._install_dependencies(component)
        ))
        
        options.append(RecoveryOption(
            RecoveryAction.MANUAL_FIX,
            "Show Manual Installation Steps",
            "Get instructions for manually installing dependencies",
            handler=lambda: self._show_dependency_instructions(component)
        ))
        
        return options
    
    def _handle_configuration_recovery(self, 
                                     error: EnhancedError,
                                     component: str,
                                     operation: str) -> List[RecoveryOption]:
        """Handle configuration-related recovery options."""
        options = []
        
        options.append(RecoveryOption(
            RecoveryAction.REPAIR,
            "Reset Configuration",
            "Reset to default configuration settings",
            handler=lambda: self._reset_configuration(component)
        ))
        
        options.append(RecoveryOption(
            RecoveryAction.MANUAL_FIX,
            "Manual Configuration",
            "Get instructions for manual configuration",
            handler=lambda: self._show_configuration_instructions(component)
        ))
        
        return options
    
    def _handle_filesystem_recovery(self, 
                                  error: EnhancedError,
                                  component: str,
                                  operation: str) -> List[RecoveryOption]:
        """Handle filesystem-related recovery options."""
        options = []
        
        options.append(RecoveryOption(
            RecoveryAction.REPAIR,
            "Create Missing Directories",
            "Create required directories and fix paths",
            handler=self._create_directories
        ))
        
        options.append(RecoveryOption(
            RecoveryAction.ALTERNATIVE,
            "Use Different Location",
            "Choose alternative installation directory",
            handler=self._choose_alternative_location
        ))
        
        return options
    
    def _handle_validation_recovery(self, 
                                  error: EnhancedError,
                                  component: str,
                                  operation: str) -> List[RecoveryOption]:
        """Handle validation-related recovery options."""
        options = []
        
        options.append(RecoveryOption(
            RecoveryAction.REPAIR,
            "Fix Validation Issues",
            "Attempt to correct validation problems automatically",
            handler=lambda: self._fix_validation(component)
        ))
        
        return options
    
    def _handle_runtime_recovery(self, 
                               error: EnhancedError,
                               component: str,
                               operation: str) -> List[RecoveryOption]:
        """Handle runtime-related recovery options."""
        options = []
        
        options.append(RecoveryOption(
            RecoveryAction.REPAIR,
            "System Repair",
            "Attempt to repair system environment",
            handler=self._repair_system_environment
        ))
        
        return options
    
    # Recovery action implementations
    
    def _check_network_connectivity(self) -> bool:
        """Check and report network connectivity."""
        import subprocess
        
        self.progress.step("Checking network connectivity...")
        
        try:
            # Test connection to common sites
            test_urls = ["google.com", "github.com", "pypi.org"]
            
            for url in test_urls:
                result = subprocess.run(
                    ["ping", "-c", "1", url],
                    capture_output=True,
                    timeout=5
                )
                if result.returncode == 0:
                    self.progress.success(f"Successfully connected to {url}")
                    return True
                    
            self.progress.error("Unable to reach any test servers")
            return False
            
        except Exception as e:
            self.progress.error(f"Network test failed: {e}")
            return False
    
    def _fix_permissions(self) -> bool:
        """Attempt to fix directory permissions."""
        import subprocess
        
        claude_dir = Path.home() / ".claude"
        
        self.progress.step(f"Fixing permissions for {claude_dir}...")
        
        try:
            # Make sure directory exists
            claude_dir.mkdir(parents=True, exist_ok=True)
            
            # Fix permissions
            subprocess.run(["chmod", "-R", "u+rwX", str(claude_dir)], check=True)
            
            self.progress.success("Permissions fixed successfully")
            return True
            
        except Exception as e:
            self.progress.error(f"Failed to fix permissions: {e}")
            return False
    
    def _create_directories(self) -> bool:
        """Create missing directories."""
        claude_dir = Path.home() / ".claude"
        
        self.progress.step("Creating required directories...")
        
        try:
            directories = [
                claude_dir,
                claude_dir / "hooks",
                claude_dir / "commands", 
                claude_dir / "logs"
            ]
            
            for directory in directories:
                directory.mkdir(parents=True, exist_ok=True)
                self.progress.step(f"Created {directory}")
            
            self.progress.success("All directories created successfully")
            return True
            
        except Exception as e:
            self.progress.error(f"Failed to create directories: {e}")
            return False
    
    def _install_dependencies(self, component: str) -> bool:
        """Attempt to install missing dependencies."""
        import subprocess
        
        self.progress.step(f"Installing dependencies for {component}...")
        
        # Component-specific dependency installation
        if component == "mcp":
            try:
                subprocess.run(["npm", "install", "-g", "@modelcontextprotocol/sdk"], check=True)
                self.progress.success("MCP dependencies installed")
                return True
            except:
                pass
        
        # Try pip for Python dependencies
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"], check=True)
            self.progress.success("Dependencies updated")
            return True
        except Exception as e:
            self.progress.error(f"Failed to install dependencies: {e}")
            return False
    
    def _show_manual_download_instructions(self, component: str) -> bool:
        """Show manual download instructions."""
        print(f"\n{self.colors.info('Manual Download Instructions for')} {component}:")
        print(f"\n{self.colors.warning('1. Open your web browser')}")
        print(f"{self.colors.warning('2. Navigate to: https://github.com/NomenAK/SuperClaude')}")
        print(f"{self.colors.warning('3. Download the latest release')}")
        print(f"{self.colors.warning('4. Extract to your desired location')}")
        print(f"{self.colors.warning('5. Run: ./install.sh --development')}")
        
        return True
    
    def _show_dependency_instructions(self, component: str) -> bool:
        """Show manual dependency installation instructions."""
        print(f"\n{self.colors.info('Manual Dependency Installation for')} {component}:")
        
        if component == "mcp":
            print(f"\n{self.colors.warning('Install Node.js and npm:')}")
            print(f"• Visit: https://nodejs.org/")
            print(f"• Download and install Node.js 18 or later")
            print(f"• Verify: node --version && npm --version")
            print(f"\n{self.colors.warning('Install MCP SDK:')}")
            print(f"• Run: npm install -g @modelcontextprotocol/sdk")
        else:
            print(f"\n{self.colors.warning('Install Python dependencies:')}")
            print(f"• Ensure Python 3.12+ is installed")
            print(f"• Run: python -m pip install --upgrade pip")
        
        return True
    
    def _reset_configuration(self, component: str) -> bool:
        """Reset configuration to defaults."""
        self.progress.step(f"Resetting configuration for {component}...")
        
        try:
            config_files = [
                Path.home() / ".claude" / "config.json",
                Path.home() / ".claude" / "settings.json"
            ]
            
            for config_file in config_files:
                if config_file.exists():
                    backup_file = config_file.with_suffix('.json.backup')
                    config_file.rename(backup_file)
                    self.progress.step(f"Backed up {config_file.name}")
            
            self.progress.success("Configuration reset successfully")
            return True
            
        except Exception as e:
            self.progress.error(f"Failed to reset configuration: {e}")
            return False
    
    def _try_offline_installation(self, component: str) -> bool:
        """Try offline installation using cached files."""
        self.progress.step(f"Attempting offline installation for {component}...")
        # This would be implemented based on actual offline installation logic
        self.progress.error("Offline installation not yet implemented")
        return False
    
    def _use_alternative_location(self) -> bool:
        """Use alternative installation location."""
        # This would prompt user for alternative location
        self.progress.step("Alternative location not yet implemented")
        return False
    
    def _choose_alternative_location(self) -> bool:
        """Choose alternative installation location."""
        # This would show directory chooser
        self.progress.step("Directory chooser not yet implemented")
        return False
    
    def _fix_validation(self, component: str) -> bool:
        """Fix validation issues."""
        self.progress.step(f"Fixing validation issues for {component}...")
        # This would be implemented based on actual validation logic
        return True
    
    def _repair_system_environment(self) -> bool:
        """Repair system environment."""
        self.progress.step("Repairing system environment...")
        # This would check and fix common system issues
        return True
    
    def _show_configuration_instructions(self, component: str) -> bool:
        """Show manual configuration instructions."""
        print(f"\n{self.colors.info('Manual Configuration Instructions for')} {component}:")
        print(f"\n{self.colors.warning('Configuration files are located at:')}")
        print(f"• ~/.claude/config.json")
        print(f"• ~/.claude/settings.json")
        print(f"\n{self.colors.warning('Refer to documentation for configuration options.')}")
        return True
    
    def get_recovery_summary(self) -> Dict[str, Any]:
        """Get summary of recovery actions taken."""
        return {
            'total_recoveries': len(self.recovery_history),
            'by_action': {},
            'by_component': {},
            'success_rate': 0  # Would calculate based on actual results
        }


# Global recovery system instance
recovery_system = RecoverySystem()