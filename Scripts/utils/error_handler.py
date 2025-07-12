#!/usr/bin/env python3
"""
Enhanced error handling with actionable suggestions and recovery options.
Provides context-aware error messages and troubleshooting guidance.
"""

import os
import sys
import traceback
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from enum import Enum

try:
    from .colors import Colors
except ImportError:
    # Fallback
    class Colors:
        def error(self, msg): return f"\033[0;31m{msg}\033[0m"
        def warning(self, msg): return f"\033[1;33m{msg}\033[0m"
        def info(self, msg): return f"\033[0;34m{msg}\033[0m"
        def success(self, msg): return f"\033[0;32m{msg}\033[0m"
        def muted(self, msg): return f"\033[0;37m{msg}\033[0m"


class ErrorType(Enum):
    """Common error types in the installation process."""
    NETWORK = "network"
    PERMISSION = "permission"
    DEPENDENCY = "dependency"
    CONFIGURATION = "configuration"
    FILE_SYSTEM = "filesystem"
    VALIDATION = "validation"
    RUNTIME = "runtime"
    USER_ABORT = "user_abort"


class ErrorContext:
    """Context information for error handling."""
    
    def __init__(self, operation: str, component: str, details: Dict[str, Any] = None):
        self.operation = operation
        self.component = component
        self.details = details or {}
        self.log_file = None
        
        # Try to determine log file location
        log_dir = Path.home() / ".superclaude" / "logs"
        if log_dir.exists():
            self.log_file = log_dir / "install.log"


class ErrorSuggestion:
    """Actionable suggestion for error recovery."""
    
    def __init__(self, title: str, steps: List[str], command: Optional[str] = None):
        self.title = title
        self.steps = steps
        self.command = command


class EnhancedError(Exception):
    """Enhanced error with context and suggestions."""
    
    def __init__(self, 
                 message: str,
                 error_type: ErrorType,
                 context: ErrorContext,
                 suggestions: List[ErrorSuggestion] = None,
                 can_retry: bool = False,
                 can_continue: bool = False):
        super().__init__(message)
        self.error_type = error_type
        self.context = context
        self.suggestions = suggestions or []
        self.can_retry = can_retry
        self.can_continue = can_continue


class ErrorHandler:
    """Enhanced error handler with recovery options."""
    
    def __init__(self):
        self.colors = Colors()
        self.error_history: List[EnhancedError] = []
        self.retry_counts: Dict[str, int] = {}
        
        # Error-specific suggestion mappings
        self.error_suggestions = {
            ErrorType.NETWORK: self._get_network_suggestions,
            ErrorType.PERMISSION: self._get_permission_suggestions,
            ErrorType.DEPENDENCY: self._get_dependency_suggestions,
            ErrorType.CONFIGURATION: self._get_configuration_suggestions,
            ErrorType.FILE_SYSTEM: self._get_filesystem_suggestions,
            ErrorType.VALIDATION: self._get_validation_suggestions,
            ErrorType.RUNTIME: self._get_runtime_suggestions,
        }
    
    def handle_error(self, error: Exception, context: ErrorContext) -> EnhancedError:
        """Convert a regular exception to an enhanced error with suggestions."""
        error_type = self._determine_error_type(error)
        
        # Create enhanced error
        enhanced = EnhancedError(
            message=str(error),
            error_type=error_type,
            context=context,
            can_retry=self._can_retry(error_type, context),
            can_continue=self._can_continue(error_type)
        )
        
        # Add suggestions
        if error_type in self.error_suggestions:
            enhanced.suggestions = self.error_suggestions[error_type](error, context)
        
        # Track error
        self.error_history.append(enhanced)
        
        return enhanced
    
    def display_error(self, error: EnhancedError, verbose: bool = False):
        """Display enhanced error with formatting and suggestions."""
        print(f"\n{self.colors.error('━' * 60)}")
        print(f"{self.colors.error('✗ ERROR:')} {error.message}")
        print(f"{self.colors.error('━' * 60)}")
        
        # Context information
        print(f"\n{self.colors.info('Context:')}")
        print(f"  • Operation: {error.context.operation}")
        print(f"  • Component: {error.context.component}")
        
        if error.context.details:
            for key, value in error.context.details.items():
                print(f"  • {key.title()}: {value}")
        
        # Log file location
        if error.context.log_file and error.context.log_file.exists():
            print(f"  • Log file: {error.context.log_file}")
        
        # Suggestions
        if error.suggestions:
            print(f"\n{self.colors.info('Suggested Solutions:')}")
            for i, suggestion in enumerate(error.suggestions, 1):
                print(f"\n  {i}. {self.colors.warning(suggestion.title)}")
                for step in suggestion.steps:
                    print(f"     → {step}")
                if suggestion.command:
                    print(f"     {self.colors.muted('Command:')} {suggestion.command}")
        
        # Recovery options
        recovery_options = []
        if error.can_retry:
            recovery_options.append("Retry the operation")
        if error.can_continue:
            recovery_options.append("Continue with next component")
        recovery_options.append("Abort installation")
        
        if recovery_options:
            print(f"\n{self.colors.info('Recovery Options:')}")
            for option in recovery_options:
                print(f"  • {option}")
        
        # Verbose mode shows traceback
        if verbose:
            print(f"\n{self.colors.muted('Technical Details:')}")
            traceback.print_exc()
    
    def _determine_error_type(self, error: Exception) -> ErrorType:
        """Determine error type from exception."""
        error_str = str(error).lower()
        
        # Network errors
        if any(keyword in error_str for keyword in ['connection', 'timeout', 'network', 'download', 'url']):
            return ErrorType.NETWORK
        
        # Permission errors
        if any(keyword in error_str for keyword in ['permission', 'access denied', 'privilege']):
            return ErrorType.PERMISSION
        
        # Dependency errors
        if any(keyword in error_str for keyword in ['module', 'import', 'dependency', 'package not found']):
            return ErrorType.DEPENDENCY
        
        # Configuration errors
        if any(keyword in error_str for keyword in ['config', 'setting', 'invalid value']):
            return ErrorType.CONFIGURATION
        
        # File system errors
        if any(keyword in error_str for keyword in ['file not found', 'directory', 'path', 'disk']):
            return ErrorType.FILE_SYSTEM
        
        # Validation errors
        if any(keyword in error_str for keyword in ['validation', 'invalid', 'format']):
            return ErrorType.VALIDATION
        
        return ErrorType.RUNTIME
    
    def _can_retry(self, error_type: ErrorType, context: ErrorContext) -> bool:
        """Determine if an error can be retried."""
        # Check retry count
        retry_key = f"{context.operation}_{context.component}"
        retry_count = self.retry_counts.get(retry_key, 0)
        
        if retry_count >= 3:
            return False
        
        # Error types that can be retried
        retriable_types = {ErrorType.NETWORK, ErrorType.FILE_SYSTEM, ErrorType.RUNTIME}
        return error_type in retriable_types
    
    def _can_continue(self, error_type: ErrorType) -> bool:
        """Determine if installation can continue after error."""
        # Critical errors that prevent continuation
        critical_types = {ErrorType.PERMISSION, ErrorType.DEPENDENCY}
        return error_type not in critical_types
    
    def _get_network_suggestions(self, error: Exception, context: ErrorContext) -> List[ErrorSuggestion]:
        """Get suggestions for network errors."""
        suggestions = []
        
        suggestions.append(ErrorSuggestion(
            "Check Internet Connection",
            [
                "Verify you have an active internet connection",
                "Try accessing https://pypi.org in your browser",
                "Check if you're behind a firewall or proxy"
            ]
        ))
        
        suggestions.append(ErrorSuggestion(
            "Use Alternative Package Source",
            [
                "Configure pip to use a mirror",
                "Set PIP_INDEX_URL environment variable",
                "Use --index-url with pip install"
            ],
            command="export PIP_INDEX_URL=https://pypi.org/simple/"
        ))
        
        suggestions.append(ErrorSuggestion(
            "Retry with Increased Timeout",
            [
                "Network operations may timeout on slow connections",
                "Increase timeout values",
                "Use --timeout option"
            ],
            command="pip install --timeout 120 <package>"
        ))
        
        return suggestions
    
    def _get_permission_suggestions(self, error: Exception, context: ErrorContext) -> List[ErrorSuggestion]:
        """Get suggestions for permission errors."""
        suggestions = []
        
        suggestions.append(ErrorSuggestion(
            "Run with Appropriate Permissions",
            [
                "Ensure you have write access to the installation directory",
                "Check file ownership with 'ls -la'",
                "DO NOT use sudo unless absolutely necessary"
            ],
            command="ls -la ~/.claude/"
        ))
        
        suggestions.append(ErrorSuggestion(
            "Fix Directory Permissions",
            [
                "Change ownership of the directory",
                "Ensure your user owns the files",
                "Set appropriate permissions"
            ],
            command="chmod -R u+rwX ~/.claude/"
        ))
        
        return suggestions
    
    def _get_dependency_suggestions(self, error: Exception, context: ErrorContext) -> List[ErrorSuggestion]:
        """Get suggestions for dependency errors."""
        suggestions = []
        
        # Extract package name if possible
        package_name = context.details.get('package', 'unknown')
        
        suggestions.append(ErrorSuggestion(
            "Install Missing Dependencies",
            [
                f"The required package '{package_name}' is not installed",
                "Install it using your package manager",
                "Ensure you're using the correct Python version"
            ],
            command=f"pip install {package_name}"
        ))
        
        suggestions.append(ErrorSuggestion(
            "Check Python Environment",
            [
                "Verify Python version meets requirements (3.12+)",
                "Check if you're in a virtual environment",
                "Ensure pip is up to date"
            ],
            command="python --version && pip --version"
        ))
        
        return suggestions
    
    def _get_configuration_suggestions(self, error: Exception, context: ErrorContext) -> List[ErrorSuggestion]:
        """Get suggestions for configuration errors."""
        suggestions = []
        
        suggestions.append(ErrorSuggestion(
            "Validate Configuration File",
            [
                "Check for syntax errors in configuration files",
                "Ensure all required fields are present",
                "Verify JSON/YAML formatting"
            ]
        ))
        
        suggestions.append(ErrorSuggestion(
            "Reset to Default Configuration",
            [
                "Backup current configuration",
                "Delete corrupted config files",
                "Let installer create fresh configuration"
            ],
            command="mv ~/.claude/config.json ~/.claude/config.json.backup"
        ))
        
        return suggestions
    
    def _get_filesystem_suggestions(self, error: Exception, context: ErrorContext) -> List[ErrorSuggestion]:
        """Get suggestions for file system errors."""
        suggestions = []
        
        suggestions.append(ErrorSuggestion(
            "Check Disk Space",
            [
                "Ensure sufficient disk space is available",
                "SuperClaude requires at least 500MB free space",
                "Clean up temporary files if needed"
            ],
            command="df -h ~"
        ))
        
        suggestions.append(ErrorSuggestion(
            "Verify File Paths",
            [
                "Check if the required files exist",
                "Ensure paths are correct and accessible",
                "Look for typos in file names"
            ]
        ))
        
        return suggestions
    
    def _get_validation_suggestions(self, error: Exception, context: ErrorContext) -> List[ErrorSuggestion]:
        """Get suggestions for validation errors."""
        suggestions = []
        
        suggestions.append(ErrorSuggestion(
            "Review Input Format",
            [
                "Check that inputs match expected format",
                "Verify API keys are correctly formatted",
                "Ensure URLs include protocol (https://)"
            ]
        ))
        
        return suggestions
    
    def _get_runtime_suggestions(self, error: Exception, context: ErrorContext) -> List[ErrorSuggestion]:
        """Get suggestions for runtime errors."""
        suggestions = []
        
        suggestions.append(ErrorSuggestion(
            "Check System Requirements",
            [
                "Verify all system requirements are met",
                "Check Python version compatibility",
                "Review installation prerequisites"
            ],
            command="python -m Scripts.shell.requirements"
        ))
        
        suggestions.append(ErrorSuggestion(
            "Review Installation Logs",
            [
                "Check the installation log for details",
                "Look for earlier warnings or errors",
                "Share logs when seeking help"
            ],
            command=f"tail -50 {context.log_file}" if context.log_file else None
        ))
        
        return suggestions
    
    def track_retry(self, context: ErrorContext):
        """Track retry attempt for rate limiting."""
        retry_key = f"{context.operation}_{context.component}"
        self.retry_counts[retry_key] = self.retry_counts.get(retry_key, 0) + 1
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get summary of all errors encountered."""
        summary = {
            'total_errors': len(self.error_history),
            'by_type': {},
            'by_component': {},
            'retry_counts': self.retry_counts
        }
        
        for error in self.error_history:
            # Count by type
            error_type = error.error_type.value
            summary['by_type'][error_type] = summary['by_type'].get(error_type, 0) + 1
            
            # Count by component
            component = error.context.component
            summary['by_component'][component] = summary['by_component'].get(component, 0) + 1
        
        return summary


# Global error handler instance
error_handler = ErrorHandler()