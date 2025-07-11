#!/usr/bin/env python3
"""
Input validation utilities for installation operations.
Provides validation functions for user input and system requirements.
"""

import re
import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable
try:
    from .colors import Colors
except ImportError:
    from colors import Colors


class InputValidator:
    """Input validation utilities."""
    
    def __init__(self, use_colors: bool = True):
        """Initialize input validator.
        
        Args:
            use_colors: Whether to use colored output
        """
        self.colors = Colors() if use_colors else Colors(force_color=False)
    
    def validate_path(self, path: str, must_exist: bool = False, 
                     must_be_writable: bool = False) -> bool:
        """Validate file/directory path.
        
        Args:
            path: Path to validate
            must_exist: Whether path must exist
            must_be_writable: Whether path must be writable
            
        Returns:
            True if valid, False otherwise
        """
        try:
            path_obj = Path(path).expanduser().resolve()
            
            if must_exist and not path_obj.exists():
                return False
            
            if must_be_writable:
                if path_obj.exists():
                    return os.access(path_obj, os.W_OK)
                else:
                    # Check if parent directory is writable
                    parent = path_obj.parent
                    return parent.exists() and os.access(parent, os.W_OK)
            
            return True
            
        except (OSError, ValueError):
            return False
    
    def validate_version(self, version: str, min_version: str) -> bool:
        """Validate version string against minimum requirement.
        
        Args:
            version: Version to check
            min_version: Minimum required version
            
        Returns:
            True if version meets requirement, False otherwise
        """
        try:
            # Simple version comparison (major.minor.patch)
            def parse_version(v: str) -> List[int]:
                # Remove any non-numeric prefix (like 'v')
                v = re.sub(r'^[^\d]*', '', v)
                # Split and convert to integers
                parts = v.split('.')
                return [int(part) for part in parts if part.isdigit()]
            
            current_parts = parse_version(version)
            min_parts = parse_version(min_version)
            
            # Pad shorter version with zeros
            max_len = max(len(current_parts), len(min_parts))
            current_parts.extend([0] * (max_len - len(current_parts)))
            min_parts.extend([0] * (max_len - len(min_parts)))
            
            return current_parts >= min_parts
            
        except (ValueError, AttributeError):
            return False
    
    def validate_api_key(self, api_key: str, min_length: int = 20) -> bool:
        """Validate API key format.
        
        Args:
            api_key: API key to validate
            min_length: Minimum required length
            
        Returns:
            True if valid format, False otherwise
        """
        if not api_key or len(api_key.strip()) < min_length:
            return False
        
        # Basic format check - should be alphanumeric with possible special chars
        pattern = r'^[a-zA-Z0-9_\-\.]+$'
        return bool(re.match(pattern, api_key.strip()))
    
    def validate_email(self, email: str) -> bool:
        """Validate email address format.
        
        Args:
            email: Email to validate
            
        Returns:
            True if valid format, False otherwise
        """
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email.strip()))
    
    def validate_url(self, url: str) -> bool:
        """Validate URL format.
        
        Args:
            url: URL to validate
            
        Returns:
            True if valid format, False otherwise
        """
        pattern = r'^https?://[^\s/$.?#].[^\s]*$'
        return bool(re.match(pattern, url.strip()))
    
    def validate_port(self, port: str) -> bool:
        """Validate port number.
        
        Args:
            port: Port number to validate
            
        Returns:
            True if valid port, False otherwise
        """
        try:
            port_num = int(port)
            return 1 <= port_num <= 65535
        except ValueError:
            return False
    
    def get_validated_input(self, prompt: str, validator: Callable[[str], bool],
                           error_message: str = "Invalid input",
                           allow_empty: bool = False,
                           max_attempts: int = 3) -> Optional[str]:
        """Get validated input with retry logic.
        
        Args:
            prompt: Input prompt
            validator: Validation function
            error_message: Error message for invalid input
            allow_empty: Whether to allow empty input
            max_attempts: Maximum validation attempts
            
        Returns:
            Validated input or None if cancelled/failed
        """
        attempts = 0
        
        while attempts < max_attempts:
            try:
                value = input(f"{prompt}: ").strip()
                
                # Handle empty input
                if not value:
                    if allow_empty:
                        return ""
                    else:
                        print(f"{self.colors.error('Input cannot be empty.')}")
                        attempts += 1
                        continue
                
                # Validate input
                if validator(value):
                    return value
                else:
                    print(f"{self.colors.error(error_message)}")
                    attempts += 1
                    
            except KeyboardInterrupt:
                print("\n")
                return None
            except EOFError:
                print("\n")
                return None
        
        print(f"{self.colors.error('Maximum attempts exceeded.')}")
        return None
    
    def get_secure_input(self, prompt: str, validator: Optional[Callable[[str], bool]] = None,
                        error_message: str = "Invalid input") -> Optional[str]:
        """Get secure input (hidden, like passwords).
        
        Args:
            prompt: Input prompt
            validator: Optional validation function
            error_message: Error message for invalid input
            
        Returns:
            Secure input or None if cancelled
        """
        import getpass
        
        try:
            value = getpass.getpass(f"{prompt}: ")
            
            if validator and not validator(value):
                print(f"{self.colors.error(error_message)}")
                return None
            
            return value
            
        except KeyboardInterrupt:
            print("\n")
            return None
        except EOFError:
            print("\n")
            return None


class SystemValidator:
    """System requirement validation utilities."""
    
    def __init__(self, use_colors: bool = True):
        """Initialize system validator.
        
        Args:
            use_colors: Whether to use colored output
        """
        self.colors = Colors() if use_colors else Colors(force_color=False)
    
    def check_command_exists(self, command: str) -> bool:
        """Check if a command exists in PATH.
        
        Args:
            command: Command to check
            
        Returns:
            True if command exists, False otherwise
        """
        import shutil
        return shutil.which(command) is not None
    
    def get_command_version(self, command: str, version_flag: str = "--version") -> Optional[str]:
        """Get version of a command.
        
        Args:
            command: Command to check
            version_flag: Flag to get version (default: --version)
            
        Returns:
            Version string or None if not available
        """
        try:
            import subprocess
            result = subprocess.run([command, version_flag], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                # Extract version from output (first line usually)
                output = result.stdout.strip().split('\n')[0]
                return output
            return None
        except (subprocess.SubprocessError, FileNotFoundError, subprocess.TimeoutExpired):
            return None
    
    def check_python_modules(self, modules: List[str]) -> Dict[str, bool]:
        """Check if Python modules are available.
        
        Args:
            modules: List of module names to check
            
        Returns:
            Dictionary mapping module names to availability status
        """
        results = {}
        
        for module in modules:
            try:
                __import__(module)
                results[module] = True
            except ImportError:
                results[module] = False
        
        return results
    
    def check_disk_space(self, path: str, required_mb: int) -> bool:
        """Check if sufficient disk space is available.
        
        Args:
            path: Path to check
            required_mb: Required space in megabytes
            
        Returns:
            True if sufficient space available, False otherwise
        """
        try:
            import shutil
            free_bytes = shutil.disk_usage(path).free
            free_mb = free_bytes / (1024 * 1024)
            return free_mb >= required_mb
        except OSError:
            return False
    
    def check_permissions(self, path: str, mode: str = "rw") -> bool:
        """Check file/directory permissions.
        
        Args:
            path: Path to check
            mode: Required permissions ("r", "w", "rw", "rwx")
            
        Returns:
            True if permissions are sufficient, False otherwise
        """
        try:
            path_obj = Path(path)
            
            if not path_obj.exists():
                # Check parent directory permissions for creation
                path_obj = path_obj.parent
                if not path_obj.exists():
                    return False
            
            if "r" in mode and not os.access(path_obj, os.R_OK):
                return False
            
            if "w" in mode and not os.access(path_obj, os.W_OK):
                return False
            
            if "x" in mode and not os.access(path_obj, os.X_OK):
                return False
            
            return True
            
        except OSError:
            return False


def test_validators():
    """Test validation utilities."""
    print("Testing InputValidator...")
    
    validator = InputValidator()
    
    # Test version validation
    print(f"Python 3.12.0 >= 3.12: {validator.validate_version('3.12.0', '3.12')}")
    print(f"Python 3.11.5 >= 3.12: {validator.validate_version('3.11.5', '3.12')}")
    
    # Test API key validation
    print(f"Valid API key: {validator.validate_api_key('sk-1234567890abcdef1234567890abcdef')}")
    print(f"Invalid API key: {validator.validate_api_key('short')}")
    
    # Test path validation
    print(f"Valid path (/tmp): {validator.validate_path('/tmp', must_exist=True)}")
    print(f"Invalid path: {validator.validate_path('/nonexistent/path', must_exist=True)}")
    
    print("\nTesting SystemValidator...")
    
    system_validator = SystemValidator()
    
    # Test command existence
    print(f"Python exists: {system_validator.check_command_exists('python3')}")
    print(f"Nonexistent command: {system_validator.check_command_exists('nonexistent-command')}")
    
    # Test version retrieval
    python_version = system_validator.get_command_version('python3')
    print(f"Python version: {python_version}")
    
    # Test module availability
    modules = system_validator.check_python_modules(['sys', 'os', 'nonexistent_module'])
    print(f"Module availability: {modules}")


if __name__ == "__main__":
    test_validators()