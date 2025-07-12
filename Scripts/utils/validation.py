#!/usr/bin/env python3
"""
Secure Input Validation Framework for SuperClaude

Provides comprehensive security validation functions for user input,
file operations, command execution, and configuration processing.
Includes protection against injection attacks, path traversal, and data corruption.
"""

import re
import os
import sys
import stat
import logging
import hashlib
import secrets
import json
import subprocess
import time
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable, Union, Pattern, Tuple
from collections import defaultdict
from datetime import datetime, timedelta
try:
    from .colors import Colors
except ImportError:
    from colors import Colors


# Security logging configuration
class SecurityLogger:
    """Security event logging for validation failures and security events."""
    
    def __init__(self):
        """Initialize security logger."""
        self.logger = logging.getLogger('superclaude.security')
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.WARNING)
    
    def log_validation_failure(self, input_type: str, value: str, reason: str):
        """Log validation failure as security event."""
        # Sanitize value for logging (truncate and hash sensitive parts)
        safe_value = self._sanitize_for_log(value)
        self.logger.warning(
            f"Validation failure - Type: {input_type}, Value: {safe_value}, Reason: {reason}"
        )
    
    def log_security_event(self, event_type: str, details: str):
        """Log general security event."""
        self.logger.warning(f"Security event - {event_type}: {details}")
    
    def _sanitize_for_log(self, value: str, max_length: int = 50) -> str:
        """Sanitize sensitive values for logging."""
        if len(value) > max_length:
            # Hash long values to preserve uniqueness without exposing content
            hash_obj = hashlib.sha256(value.encode())
            return f"{value[:10]}...{hash_obj.hexdigest()[:8]}"
        return value


class RateLimiter:
    """Rate limiter to prevent brute force attacks on validation functions."""
    
    def __init__(self, max_attempts: int = 10, time_window: int = 60, 
                 lockout_duration: int = 300):
        """Initialize rate limiter.
        
        Args:
            max_attempts: Maximum attempts allowed within time window
            time_window: Time window in seconds
            lockout_duration: Lockout duration in seconds after exceeding limit
        """
        self.max_attempts = max_attempts
        self.time_window = time_window
        self.lockout_duration = lockout_duration
        self.attempts: Dict[str, List[datetime]] = defaultdict(list)
        self.lockouts: Dict[str, datetime] = {}
        self.logger = logging.getLogger('superclaude.ratelimit')
    
    def is_rate_limited(self, identifier: str) -> Tuple[bool, Optional[int]]:
        """Check if identifier is rate limited.
        
        Args:
            identifier: Unique identifier (IP, session, etc.)
            
        Returns:
            Tuple of (is_limited, seconds_until_reset)
        """
        now = datetime.now()
        
        # Check if currently locked out
        if identifier in self.lockouts:
            lockout_end = self.lockouts[identifier]
            if now < lockout_end:
                remaining = int((lockout_end - now).total_seconds())
                return True, remaining
            else:
                # Lockout expired, remove it
                del self.lockouts[identifier]
        
        # Clean old attempts
        cutoff = now - timedelta(seconds=self.time_window)
        self.attempts[identifier] = [
            attempt for attempt in self.attempts[identifier]
            if attempt > cutoff
        ]
        
        # Check current attempts
        if len(self.attempts[identifier]) >= self.max_attempts:
            # Apply lockout
            self.lockouts[identifier] = now + timedelta(seconds=self.lockout_duration)
            self.logger.warning(
                f"Rate limit exceeded for {identifier}. "
                f"Locked out for {self.lockout_duration} seconds."
            )
            return True, self.lockout_duration
        
        return False, None
    
    def record_attempt(self, identifier: str) -> None:
        """Record an attempt for the identifier."""
        self.attempts[identifier].append(datetime.now())
    
    def reset(self, identifier: str) -> None:
        """Reset rate limit for identifier."""
        if identifier in self.attempts:
            del self.attempts[identifier]
        if identifier in self.lockouts:
            del self.lockouts[identifier]


class SecurityPatterns:
    """Security validation patterns and rules."""
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        re.compile(r'\.\./'),  # Directory traversal
        re.compile(r'\.\.\\'),  # Windows directory traversal
        re.compile(r'/\.\./'),  # Absolute path traversal
        re.compile(r'\\\.\.\\'),  # Windows absolute path traversal
        re.compile(r'\0'),  # Null byte injection
        re.compile(r'[<>:"|?*]'),  # Invalid filename characters
    ]
    
    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        re.compile(r'[;&|`$()]'),  # Shell metacharacters
        re.compile(r'\$\{.*\}'),  # Variable substitution
        re.compile(r'\$\(.*\)'),  # Command substitution
        re.compile(r'`.*`'),  # Backtick command substitution
        re.compile(r'\\[nrtbfav]'),  # Escape sequences
    ]
    
    # SQL injection patterns (for config validation)
    SQL_INJECTION_PATTERNS = [
        re.compile(r"[';-]{2,}"),  # SQL comment and string terminators
        re.compile(r'\b(union|select|insert|update|delete|drop|create|alter)\b', re.IGNORECASE),
        re.compile(r'\b(or|and)\s+\d+\s*=\s*\d+', re.IGNORECASE),
    ]
    
    # Valid patterns
    SAFE_FILENAME_PATTERN = re.compile(r'^[a-zA-Z0-9._-]+$')
    SAFE_DIRNAME_PATTERN = re.compile(r'^[a-zA-Z0-9._/-]+$')
    SAFE_COMMAND_PATTERN = re.compile(r'^[a-zA-Z0-9._-]+$')
    API_KEY_PATTERN = re.compile(r'^[a-zA-Z0-9._-]+$')
    
    # Configuration value patterns
    SAFE_CONFIG_VALUE_PATTERN = re.compile(r'^[a-zA-Z0-9._:/\s-]+$')
    
    # Whitelisted commands (only these commands can be executed)
    ALLOWED_COMMANDS = {
        'python3', 'python', 'node', 'npm', 'npx', 'pip', 'pip3',
        'git', 'which', 'where', 'ls', 'dir', 'pwd', 'cd',
        'cat', 'type', 'echo', 'chmod', 'mkdir', 'cp', 'copy',
        'mv', 'move', 'rm', 'del', 'rmdir'
    }
    
    # Allowed MCP servers for SuperClaude
    ALLOWED_MCP_SERVERS = {
        'sequential', 'sequential-thinking', 'context7', 
        'magic', 'playwright', 'puppeteer'
    }


class InputValidator:
    """Secure input validation utilities with comprehensive security checks."""
    
    def __init__(self, use_colors: bool = True, enable_logging: bool = True,
                 enable_rate_limiting: bool = True):
        """Initialize secure input validator.
        
        Args:
            use_colors: Whether to use colored output
            enable_logging: Whether to enable security logging
            enable_rate_limiting: Whether to enable rate limiting
        """
        self.colors = Colors() if use_colors else Colors(force_color=False)
        self.security_logger = SecurityLogger() if enable_logging else None
        self.patterns = SecurityPatterns()
        self.rate_limiter = RateLimiter() if enable_rate_limiting else None
        self.validation_attempts: Dict[str, int] = defaultdict(int)
    
    def validate_path(self, path: str, must_exist: bool = False, 
                     must_be_writable: bool = False, allow_absolute_only: bool = False,
                     base_path: Optional[str] = None, identifier: Optional[str] = None) -> bool:
        """Securely validate file/directory path with anti-traversal protection.
        
        Args:
            path: Path to validate
            must_exist: Whether path must exist
            must_be_writable: Whether path must be writable
            allow_absolute_only: Only allow absolute paths
            base_path: Base path for relative path validation
            identifier: Unique identifier for rate limiting
            
        Returns:
            True if valid and secure, False otherwise
        """
        # Check rate limiting
        if self.rate_limiter and identifier:
            is_limited, wait_time = self.rate_limiter.is_rate_limited(identifier)
            if is_limited:
                self._log_validation_failure("path", path, f"Rate limited for {wait_time}s")
                return False
            self.rate_limiter.record_attempt(identifier)
        
        try:
            # Basic input sanitization
            if not path or not isinstance(path, str):
                self._log_validation_failure("path", str(path), "Empty or invalid path")
                return False
            
            # Check for path traversal attacks
            for pattern in self.patterns.PATH_TRAVERSAL_PATTERNS:
                if pattern.search(path):
                    self._log_validation_failure("path", path, "Path traversal attempt detected")
                    return False
            
            # Normalize and resolve path safely
            try:
                path_obj = Path(path).expanduser()
                
                # Check if absolute path is required
                if allow_absolute_only and not path_obj.is_absolute():
                    self._log_validation_failure("path", path, "Absolute path required")
                    return False
                
                # Resolve path within base directory if specified
                if base_path:
                    base_obj = Path(base_path).expanduser().resolve()
                    resolved_path = (base_obj / path_obj).resolve()
                    
                    # Ensure resolved path is within base directory
                    try:
                        resolved_path.relative_to(base_obj)
                    except ValueError:
                        self._log_validation_failure("path", path, "Path outside base directory")
                        return False
                    
                    path_obj = resolved_path
                else:
                    path_obj = path_obj.resolve()
                
            except (OSError, ValueError) as e:
                self._log_validation_failure("path", path, f"Path resolution error: {e}")
                return False
            
            # Validate path components for safe characters
            for part in path_obj.parts:
                if not self.patterns.SAFE_DIRNAME_PATTERN.match(part) and part not in ['/', '\\']:
                    self._log_validation_failure("path", path, f"Unsafe path component: {part}")
                    return False
            
            # Existence check
            if must_exist and not path_obj.exists():
                return False
            
            # Writability check
            if must_be_writable:
                if path_obj.exists():
                    return os.access(path_obj, os.W_OK)
                else:
                    # Check if parent directory is writable
                    parent = path_obj.parent
                    return parent.exists() and os.access(parent, os.W_OK)
            
            return True
            
        except Exception as e:
            self._log_validation_failure("path", path, f"Unexpected error: {e}")
            return False
    
    def validate_path_secure(self, path: str, must_exist: bool = False,
                           must_be_writable: bool = False, allow_absolute_only: bool = False,
                           base_path: Optional[str] = None) -> Dict[str, Any]:
        """Securely validate path using file descriptors to prevent TOCTOU vulnerabilities.
        
        This method uses file descriptors and atomic operations to prevent race conditions
        between validation checks and actual file operations.
        
        Args:
            path: Path to validate
            must_exist: Whether path must exist
            must_be_writable: Whether path must be writable
            allow_absolute_only: Only allow absolute paths
            base_path: Base path for relative path validation
            
        Returns:
            Dict with 'valid' bool, 'fd' file descriptor (if opened), and 'error' message
        """
        result = {"valid": False, "fd": None, "error": None, "path": None}
        
        try:
            # First do basic validation without file operations
            if not path or not isinstance(path, str):
                result["error"] = "Empty or invalid path"
                self._log_validation_failure("path", str(path), result["error"])
                return result
            
            # Check for path traversal attacks
            for pattern in self.patterns.PATH_TRAVERSAL_PATTERNS:
                if pattern.search(path):
                    result["error"] = "Path traversal attempt detected"
                    self._log_validation_failure("path", path, result["error"])
                    return result
            
            # Normalize and resolve path safely
            try:
                path_obj = Path(path).expanduser()
                
                # Check if absolute path is required
                if allow_absolute_only and not path_obj.is_absolute():
                    result["error"] = "Absolute path required"
                    self._log_validation_failure("path", path, result["error"])
                    return result
                
                # Resolve path within base directory if specified
                if base_path:
                    base_obj = Path(base_path).expanduser().resolve()
                    resolved_path = (base_obj / path_obj).resolve()
                    
                    # Ensure resolved path is within base directory
                    try:
                        resolved_path.relative_to(base_obj)
                    except ValueError:
                        result["error"] = "Path outside base directory"
                        self._log_validation_failure("path", path, result["error"])
                        return result
                    
                    path_obj = resolved_path
                else:
                    path_obj = path_obj.resolve()
                
            except (OSError, ValueError) as e:
                result["error"] = f"Path resolution error: {e}"
                self._log_validation_failure("path", path, result["error"])
                return result
            
            # Store resolved path
            result["path"] = path_obj
            
            # Validate path components for safe characters
            for part in path_obj.parts:
                if not self.patterns.SAFE_DIRNAME_PATTERN.match(part) and part not in ['/', '\\']:
                    result["error"] = f"Unsafe path component: {part}"
                    self._log_validation_failure("path", path, result["error"])
                    return result
            
            # Now perform file descriptor-based validation for existing files
            if path_obj.exists():
                try:
                    # Open file/directory with appropriate flags to prevent TOCTOU
                    if path_obj.is_dir():
                        # For directories, we can't hold a file descriptor, but we can verify atomically
                        import fcntl
                        fd = os.open(str(path_obj), os.O_RDONLY | os.O_DIRECTORY)
                        
                        # Verify the opened descriptor matches our expectations
                        stat_info = os.fstat(fd)
                        if not stat.S_ISDIR(stat_info.st_mode):
                            os.close(fd)
                            result["error"] = "Path changed from directory during validation"
                            return result
                            
                        # Check writability atomically
                        if must_be_writable:
                            # Try to create a temporary file in the directory
                            import tempfile
                            try:
                                with tempfile.TemporaryFile(dir=str(path_obj)):
                                    pass
                            except (OSError, IOError):
                                os.close(fd)
                                result["error"] = "Directory not writable"
                                return result
                        
                        result["fd"] = fd
                        result["valid"] = True
                        
                    else:
                        # For files, open with appropriate mode
                        flags = os.O_RDONLY
                        if must_be_writable:
                            flags = os.O_RDWR
                        
                        fd = os.open(str(path_obj), flags)
                        
                        # Verify the opened descriptor is a regular file
                        stat_info = os.fstat(fd)
                        if not stat.S_ISREG(stat_info.st_mode):
                            os.close(fd)
                            result["error"] = "Path is not a regular file"
                            return result
                        
                        result["fd"] = fd
                        result["valid"] = True
                        
                except (OSError, IOError) as e:
                    result["error"] = f"Cannot open path: {e}"
                    return result
                    
            elif must_exist:
                result["error"] = "Path does not exist"
                return result
            else:
                # Path doesn't exist - check parent directory
                parent = path_obj.parent
                if must_be_writable:
                    if not parent.exists():
                        result["error"] = "Parent directory does not exist"
                        return result
                    
                    # Check parent directory writability atomically
                    try:
                        import tempfile
                        with tempfile.TemporaryFile(dir=str(parent)):
                            pass
                        result["valid"] = True
                    except (OSError, IOError):
                        result["error"] = "Parent directory not writable"
                        return result
                else:
                    result["valid"] = True
            
            return result
            
        except Exception as e:
            result["error"] = f"Unexpected error: {e}"
            self._log_validation_failure("path", path, result["error"])
            if result.get("fd") is not None:
                try:
                    os.close(result["fd"])
                except:
                    pass
            return result
    
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
    
    def validate_api_key(self, api_key: str, min_length: int = 20, max_length: int = 200) -> bool:
        """Securely validate API key format with enhanced security checks.
        
        Args:
            api_key: API key to validate
            min_length: Minimum required length
            max_length: Maximum allowed length
            
        Returns:
            True if valid and secure format, False otherwise
        """
        if not api_key or not isinstance(api_key, str):
            self._log_validation_failure("api_key", "[REDACTED]", "Empty or invalid API key")
            return False
        
        key = api_key.strip()
        
        # Length validation
        if len(key) < min_length or len(key) > max_length:
            self._log_validation_failure("api_key", "[REDACTED]", f"Invalid length: {len(key)}")
            return False
        
        # Pattern validation - only safe characters
        if not self.patterns.API_KEY_PATTERN.match(key):
            self._log_validation_failure("api_key", "[REDACTED]", "Invalid characters detected")
            return False
        
        # Additional security checks
        if self._contains_suspicious_patterns(key):
            self._log_validation_failure("api_key", "[REDACTED]", "Suspicious patterns detected")
            return False
        
        return True
    
    def validate_email(self, email: str, max_length: int = 254) -> bool:
        """Securely validate email address format.
        
        Args:
            email: Email to validate
            max_length: Maximum allowed email length
            
        Returns:
            True if valid format, False otherwise
        """
        if not email or not isinstance(email, str):
            self._log_validation_failure("email", str(email), "Empty or invalid email")
            return False
        
        email = email.strip().lower()
        
        # Length validation
        if len(email) > max_length:
            self._log_validation_failure("email", email, f"Email too long: {len(email)}")
            return False
        
        # Enhanced email pattern
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            self._log_validation_failure("email", email, "Invalid email format")
            return False
        
        # Check for suspicious patterns
        if self._contains_suspicious_patterns(email):
            self._log_validation_failure("email", email, "Suspicious patterns detected")
            return False
        
        return True
    
    def validate_url(self, url: str, allowed_schemes: Optional[List[str]] = None,
                    allow_localhost: bool = True) -> bool:
        """Securely validate URL format with enhanced security checks.
        
        Args:
            url: URL to validate
            allowed_schemes: List of allowed URL schemes (default: ['http', 'https'])
            allow_localhost: Whether to allow localhost URLs
            
        Returns:
            True if valid and secure format, False otherwise
        """
        if not url or not isinstance(url, str):
            self._log_validation_failure("url", str(url), "Empty or invalid URL")
            return False
        
        url = url.strip()
        
        # Default allowed schemes
        if allowed_schemes is None:
            allowed_schemes = ['http', 'https']
        
        # Basic format validation
        url_pattern = r'^(https?)://([^\s/$.?#]+)\.?([^\s]*?)/?$'
        match = re.match(url_pattern, url)
        
        if not match:
            self._log_validation_failure("url", url, "Invalid URL format")
            return False
        
        scheme, domain, path = match.groups()
        
        # Validate scheme
        if scheme not in allowed_schemes:
            self._log_validation_failure("url", url, f"Disallowed scheme: {scheme}")
            return False
        
        # Validate domain
        if not allow_localhost and domain.lower() in ['localhost', '127.0.0.1', '::1']:
            self._log_validation_failure("url", url, "Localhost URLs not allowed")
            return False
        
        # Check for suspicious patterns
        if self._contains_suspicious_patterns(url):
            self._log_validation_failure("url", url, "Suspicious patterns detected")
            return False
        
        return True
    
    def validate_port(self, port: Union[str, int], allow_privileged: bool = False) -> bool:
        """Securely validate port number.
        
        Args:
            port: Port number to validate
            allow_privileged: Whether to allow privileged ports (1-1023)
            
        Returns:
            True if valid port, False otherwise
        """
        try:
            if isinstance(port, str):
                # Check for injection attempts
                if not port.isdigit():
                    self._log_validation_failure("port", port, "Non-numeric port")
                    return False
                port_num = int(port)
            else:
                port_num = int(port)
            
            # Validate port range
            if not (1 <= port_num <= 65535):
                self._log_validation_failure("port", str(port), f"Port out of range: {port_num}")
                return False
            
            # Check privileged ports
            if not allow_privileged and port_num < 1024:
                self._log_validation_failure("port", str(port), f"Privileged port not allowed: {port_num}")
                return False
            
            return True
            
        except (ValueError, TypeError) as e:
            self._log_validation_failure("port", str(port), f"Invalid port format: {e}")
            return False
    
    def validate_command(self, command: str, allow_args: bool = False) -> bool:
        """Securely validate command for execution.
        
        Args:
            command: Command to validate
            allow_args: Whether to allow command arguments
            
        Returns:
            True if command is safe for execution, False otherwise
        """
        if not command or not isinstance(command, str):
            self._log_validation_failure("command", str(command), "Empty or invalid command")
            return False
        
        command = command.strip()
        
        # Check for injection patterns
        for pattern in self.patterns.COMMAND_INJECTION_PATTERNS:
            if pattern.search(command):
                self._log_validation_failure("command", command, "Command injection attempt detected")
                return False
        
        # Parse command and arguments
        parts = command.split()
        if not parts:
            self._log_validation_failure("command", command, "Empty command")
            return False
        
        cmd_name = parts[0]
        
        # SECURITY FIX: Validate full path to prevent path-based command injection
        # Check if command contains path separators
        if '/' in cmd_name or '\\' in cmd_name:
            # Extract the base command name from full path
            import os
            base_cmd = os.path.basename(cmd_name)
            
            # Validate the base command against whitelist
            if base_cmd not in self.patterns.ALLOWED_COMMANDS:
                self._log_validation_failure("command", command, f"Command not in whitelist: {base_cmd} (from path: {cmd_name})")
                return False
            
            # Validate the full path for safety
            if not self.validate_path(cmd_name, must_exist=True, allow_absolute_only=True):
                self._log_validation_failure("command", command, f"Invalid command path: {cmd_name}")
                return False
        else:
            # No path separators - validate as simple command
            # Check against whitelist
            if cmd_name not in self.patterns.ALLOWED_COMMANDS:
                self._log_validation_failure("command", command, f"Command not in whitelist: {cmd_name}")
                return False
            
            # Validate command name pattern
            if not self.patterns.SAFE_COMMAND_PATTERN.match(cmd_name):
                self._log_validation_failure("command", command, f"Unsafe command pattern: {cmd_name}")
                return False
        
        # Validate arguments if present
        if len(parts) > 1:
            if not allow_args:
                self._log_validation_failure("command", command, "Arguments not allowed")
                return False
            
            # Validate each argument for safety
            for arg in parts[1:]:
                if self._contains_injection_patterns(arg):
                    self._log_validation_failure("command", command, f"Unsafe argument: {arg}")
                    return False
        
        return True
    
    def validate_filename(self, filename: str, max_length: int = 255) -> bool:
        """Securely validate filename.
        
        Args:
            filename: Filename to validate
            max_length: Maximum allowed filename length
            
        Returns:
            True if filename is safe, False otherwise
        """
        if not filename or not isinstance(filename, str):
            self._log_validation_failure("filename", str(filename), "Empty or invalid filename")
            return False
        
        filename = filename.strip()
        
        # Length validation
        if len(filename) > max_length:
            self._log_validation_failure("filename", filename, f"Filename too long: {len(filename)}")
            return False
        
        # Pattern validation
        if not self.patterns.SAFE_FILENAME_PATTERN.match(filename):
            self._log_validation_failure("filename", filename, "Invalid filename characters")
            return False
        
        # Check for reserved names (Windows)
        reserved_names = {
            'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
            'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3',
            'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        }
        
        if filename.upper() in reserved_names:
            self._log_validation_failure("filename", filename, "Reserved filename")
            return False
        
        return True
    
    def validate_config_value(self, value: Any, value_type: str = "string",
                             max_length: int = 1000) -> bool:
        """Securely validate configuration values.
        
        Args:
            value: Configuration value to validate
            value_type: Expected value type
            max_length: Maximum length for string values
            
        Returns:
            True if value is safe, False otherwise
        """
        if value is None:
            return True  # Allow None values
        
        # Type validation
        if value_type == "string":
            if not isinstance(value, str):
                self._log_validation_failure("config", str(value), f"Expected string, got {type(value)}")
                return False
            
            # Length validation
            if len(value) > max_length:
                self._log_validation_failure("config", value, f"Value too long: {len(value)}")
                return False
            
            # Check for injection patterns
            for pattern in self.patterns.SQL_INJECTION_PATTERNS:
                if pattern.search(value):
                    self._log_validation_failure("config", value, "SQL injection pattern detected")
                    return False
            
            # Basic safe pattern check
            if not self.patterns.SAFE_CONFIG_VALUE_PATTERN.match(value):
                self._log_validation_failure("config", value, "Unsafe characters in config value")
                return False
        
        elif value_type == "integer":
            if not isinstance(value, int):
                self._log_validation_failure("config", str(value), f"Expected integer, got {type(value)}")
                return False
        
        elif value_type == "boolean":
            if not isinstance(value, bool):
                self._log_validation_failure("config", str(value), f"Expected boolean, got {type(value)}")
                return False
        
        elif value_type == "list":
            if not isinstance(value, list):
                self._log_validation_failure("config", str(value), f"Expected list, got {type(value)}")
                return False
            
            # Validate each list item
            for item in value:
                if not self.validate_config_value(item, "string", max_length):
                    return False
        
        return True
    
    def sanitize_input(self, input_str: str, max_length: int = 1000) -> Optional[str]:
        """Sanitize user input by removing dangerous characters.
        
        Args:
            input_str: Input string to sanitize
            max_length: Maximum allowed length
            
        Returns:
            Sanitized string or None if input is too dangerous
        """
        if not input_str or not isinstance(input_str, str):
            return None
        
        # Remove control characters, preserving normal spaces
        sanitized = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', input_str)
        
        # Normalize whitespace but preserve word boundaries
        sanitized = re.sub(r'[\t\r\n]+', ' ', sanitized)  # Convert tabs/newlines to spaces
        sanitized = re.sub(r' +', ' ', sanitized).strip()  # Collapse multiple spaces
        
        # Length validation
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        # Remove potentially dangerous patterns
        dangerous_patterns = [
            (r'<script[^>]*>.*?</script>', ''),  # Script tags
            (r'javascript:', ''),  # JavaScript URLs
            (r'data:', ''),  # Data URLs
            (r'vbscript:', ''),  # VBScript URLs
        ]
        
        for pattern, replacement in dangerous_patterns:
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE | re.DOTALL)
        
        return sanitized if sanitized else ""
    
    def _contains_suspicious_patterns(self, value: str) -> bool:
        """Check if value contains suspicious patterns."""
        suspicious_patterns = [
            r'\b(script|eval|exec|system|shell)\b',  # Execution functions
            r'\b(select|union|insert|delete|drop|create|alter)\b',  # SQL keywords
            r'[<>"\']',  # HTML/XML/quote characters
            r'\\[nrtbfav]',  # Escape sequences
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                return True
        
        return False
    
    def _contains_injection_patterns(self, value: str) -> bool:
        """Check if value contains command injection patterns."""
        for pattern in self.patterns.COMMAND_INJECTION_PATTERNS:
            if pattern.search(value):
                return True
        return False
    
    def _log_validation_failure(self, input_type: str, value: str, reason: str):
        """Log validation failure if logging is enabled."""
        if self.security_logger:
            self.security_logger.log_validation_failure(input_type, value, reason)
            
            # Track repeated validation failures
            failure_key = f"{input_type}:{reason}"
            self.validation_attempts[failure_key] += 1
            
            # Log suspicious patterns
            if self.validation_attempts[failure_key] > 5:
                self.security_logger.log_security_event(
                    "SUSPICIOUS_VALIDATION_PATTERN",
                    f"Repeated {input_type} validation failures: {reason} "
                    f"({self.validation_attempts[failure_key]} attempts)"
                )
        
        # Also log to security audit system
        try:
            from .security_audit import SecurityEventType, SecurityLevel, get_audit_logger
            audit_logger = get_audit_logger()
            audit_logger.log_validation_failure(input_type, value, reason, "input_validator")
        except ImportError:
            pass  # Security audit system not available
    
    def get_validated_input(self, prompt: str, validator: Callable[[str], bool],
                           error_message: str = "Invalid input",
                           allow_empty: bool = False,
                           max_attempts: int = 3,
                           sanitize: bool = True) -> Optional[str]:
        """Get validated input with retry logic and optional sanitization.
        
        Args:
            prompt: Input prompt
            validator: Validation function
            error_message: Error message for invalid input
            allow_empty: Whether to allow empty input
            max_attempts: Maximum validation attempts
            sanitize: Whether to sanitize input before validation
            
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
                
                # Sanitize input if requested
                if sanitize:
                    original_value = value
                    value = self.sanitize_input(value)
                    if value is None:
                        print(f"{self.colors.error('Input contains dangerous characters and cannot be processed.')}")
                        attempts += 1
                        continue
                    elif value != original_value:
                        print(f"{self.colors.warning('Input was sanitized for security.')}")
                
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
    """Secure system requirement validation utilities."""
    
    def __init__(self, use_colors: bool = True, enable_logging: bool = True):
        """Initialize system validator.
        
        Args:
            use_colors: Whether to use colored output
            enable_logging: Whether to enable security logging
        """
        self.colors = Colors() if use_colors else Colors(force_color=False)
        self.security_logger = SecurityLogger() if enable_logging else None
        self.input_validator = InputValidator(use_colors, enable_logging)
    
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
    
    def execute_command_safely(self, command: str, args: Optional[List[str]] = None,
                              timeout: int = 30, cwd: Optional[str] = None) -> Dict[str, Any]:
        """Execute command safely with validation and logging.
        
        Args:
            command: Command to execute
            args: Command arguments
            timeout: Execution timeout in seconds
            cwd: Working directory for command execution
            
        Returns:
            Dict with execution results or error information
        """
        # Validate command
        if not self.input_validator.validate_command(command, allow_args=False):
            error = f"Command validation failed: {command}"
            if self.security_logger:
                self.security_logger.log_security_event("UNSAFE_COMMAND", error)
            return {"success": False, "error": error, "stdout": "", "stderr": ""}
        
        # Validate arguments if provided
        if args:
            for arg in args:
                if not isinstance(arg, str) or self.input_validator._contains_injection_patterns(arg):
                    error = f"Unsafe argument detected: {arg}"
                    if self.security_logger:
                        self.security_logger.log_security_event("UNSAFE_ARGUMENT", error)
                    return {"success": False, "error": error, "stdout": "", "stderr": ""}
        
        # Validate working directory
        if cwd and not self.input_validator.validate_path(cwd, must_exist=True):
            error = f"Invalid working directory: {cwd}"
            return {"success": False, "error": error, "stdout": "", "stderr": ""}
        
        try:
            # Prepare command list
            cmd_list = [command]
            if args:
                cmd_list.extend(args)
            
            # Execute command safely
            result = subprocess.run(
                cmd_list,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=cwd,
                shell=False  # Never use shell=True for security
            )
            
            return {
                "success": result.returncode == 0,
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "error": None if result.returncode == 0 else f"Command failed with exit code {result.returncode}"
            }
            
        except subprocess.TimeoutExpired:
            error = f"Command timed out after {timeout} seconds"
            if self.security_logger:
                self.security_logger.log_security_event("COMMAND_TIMEOUT", error)
            return {"success": False, "error": error, "stdout": "", "stderr": ""}
        
        except (subprocess.SubprocessError, FileNotFoundError, OSError) as e:
            error = f"Command execution failed: {e}"
            if self.security_logger:
                self.security_logger.log_security_event("COMMAND_ERROR", error)
            return {"success": False, "error": error, "stdout": "", "stderr": ""}
    
    def validate_json_config(self, config_data: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Validate JSON configuration data safely.
        
        Args:
            config_data: JSON string or dictionary to validate
            
        Returns:
            Dict with validation results and sanitized data
        """
        try:
            # Parse JSON if string
            if isinstance(config_data, str):
                try:
                    data = json.loads(config_data)
                except json.JSONDecodeError as e:
                    return {"valid": False, "error": f"Invalid JSON: {e}", "data": None}
            else:
                data = config_data
            
            # Validate configuration structure
            if not isinstance(data, dict):
                return {"valid": False, "error": "Config must be a dictionary", "data": None}
            
            # Validate each configuration value
            sanitized_data = {}
            for key, value in data.items():
                # Validate key
                if not self.input_validator.validate_filename(key):
                    return {"valid": False, "error": f"Invalid config key: {key}", "data": None}
                
                # Validate and sanitize value
                if isinstance(value, str):
                    if not self.input_validator.validate_config_value(value, "string"):
                        return {"valid": False, "error": f"Invalid config value for {key}", "data": None}
                    sanitized_data[key] = value
                elif isinstance(value, (int, bool)):
                    sanitized_data[key] = value
                elif isinstance(value, list):
                    if not self.input_validator.validate_config_value(value, "list"):
                        return {"valid": False, "error": f"Invalid list value for {key}", "data": None}
                    sanitized_data[key] = value
                elif isinstance(value, dict):
                    # Recursively validate nested dictionaries
                    nested_result = self.validate_json_config(value)
                    if not nested_result["valid"]:
                        return nested_result
                    sanitized_data[key] = nested_result["data"]
                else:
                    return {"valid": False, "error": f"Unsupported value type for {key}: {type(value)}", "data": None}
            
            return {"valid": True, "error": None, "data": sanitized_data}
            
        except Exception as e:
            error = f"Unexpected error during config validation: {e}"
            if self.security_logger:
                self.security_logger.log_security_event("CONFIG_VALIDATION_ERROR", error)
            return {"valid": False, "error": error, "data": None}


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


class PathValidator:
    """Dedicated path validation with enhanced security and TOCTOU prevention."""
    
    def __init__(self, use_colors: bool = True, enable_logging: bool = True):
        """Initialize path validator."""
        self.input_validator = InputValidator(use_colors, enable_logging)
        self.colors = Colors() if use_colors else Colors(force_color=False)
        self.security_logger = SecurityLogger() if enable_logging else None
    
    def validate(self, path: str, **kwargs) -> bool:
        """Validate path using standard validation."""
        return self.input_validator.validate_path(path, **kwargs)
    
    def validate_secure(self, path: str, **kwargs) -> Dict[str, Any]:
        """Validate path using secure file descriptor-based validation."""
        return self.input_validator.validate_path_secure(path, **kwargs)
    
    def validate_with_fd(self, path: str, operation: Callable, **kwargs) -> Dict[str, Any]:
        """Validate path and execute operation with file descriptor to prevent TOCTOU.
        
        Args:
            path: Path to validate
            operation: Function that takes (fd, path) and performs the operation
            **kwargs: Additional arguments for validation
            
        Returns:
            Dict with 'success' bool, 'result' from operation, and 'error' if any
        """
        result = {"success": False, "result": None, "error": None}
        
        # Perform secure validation
        validation = self.validate_secure(path, **kwargs)
        
        if not validation["valid"]:
            result["error"] = validation["error"]
            return result
        
        fd = validation.get("fd")
        resolved_path = validation.get("path")
        
        try:
            # Execute operation with file descriptor
            if fd is not None:
                result["result"] = operation(fd, resolved_path)
                result["success"] = True
            else:
                # No fd (new file) - execute with path
                result["result"] = operation(None, resolved_path)
                result["success"] = True
                
        except Exception as e:
            result["error"] = f"Operation failed: {e}"
            if self.security_logger:
                self.security_logger.log_security_event("PATH_OPERATION_FAILED", f"{path}: {e}")
        finally:
            # Always close file descriptor
            if fd is not None:
                try:
                    os.close(fd)
                except:
                    pass
        
        return result


class CommandValidator:
    """Dedicated command validation with full path support and enhanced security."""
    
    def __init__(self, use_colors: bool = True, enable_logging: bool = True):
        """Initialize command validator."""
        self.input_validator = InputValidator(use_colors, enable_logging)
        self.colors = Colors() if use_colors else Colors(force_color=False)
        self.security_logger = SecurityLogger() if enable_logging else None
        self.patterns = SecurityPatterns()
    
    def validate(self, command: str, allow_args: bool = False) -> bool:
        """Validate command with full path support."""
        return self.input_validator.validate_command(command, allow_args)
    
    def parse_command(self, command: str) -> Dict[str, Any]:
        """Parse command into components with security validation.
        
        Returns:
            Dict with 'valid' bool, 'executable' path, 'args' list, and 'error' if any
        """
        result = {"valid": False, "executable": None, "args": [], "error": None}
        
        if not command or not isinstance(command, str):
            result["error"] = "Empty or invalid command"
            return result
        
        command = command.strip()
        parts = command.split()
        
        if not parts:
            result["error"] = "Empty command"
            return result
        
        cmd_name = parts[0]
        result["args"] = parts[1:] if len(parts) > 1 else []
        
        # Check for path-based command
        if '/' in cmd_name or '\\' in cmd_name:
            # Full path provided - validate it
            path_result = self.input_validator.validate_path_secure(
                cmd_name, must_exist=True, allow_absolute_only=True
            )
            
            if not path_result["valid"]:
                result["error"] = f"Invalid command path: {path_result['error']}"
                return result
            
            # Verify it's executable
            if path_result.get("fd"):
                stat_info = os.fstat(path_result["fd"])
                os.close(path_result["fd"])
                
                if not (stat_info.st_mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)):
                    result["error"] = "File is not executable"
                    return result
            
            result["executable"] = str(path_result["path"])
            
            # Check base command against whitelist
            base_cmd = os.path.basename(cmd_name)
            if base_cmd not in self.patterns.ALLOWED_COMMANDS:
                result["error"] = f"Command not in whitelist: {base_cmd}"
                return result
                
        else:
            # Simple command - must be in whitelist
            if cmd_name not in self.patterns.ALLOWED_COMMANDS:
                result["error"] = f"Command not in whitelist: {cmd_name}"
                return result
            
            # Find full path using which
            import shutil
            full_path = shutil.which(cmd_name)
            if not full_path:
                result["error"] = f"Command not found in PATH: {cmd_name}"
                return result
                
            result["executable"] = full_path
        
        # Validate arguments
        for arg in result["args"]:
            if self.input_validator._contains_injection_patterns(arg):
                result["error"] = f"Unsafe argument detected: {arg}"
                return result
        
        result["valid"] = True
        return result
    
    def build_safe_command(self, executable: str, args: List[str]) -> List[str]:
        """Build safe command list for subprocess execution.
        
        Args:
            executable: Validated executable path
            args: Validated arguments
            
        Returns:
            Safe command list for subprocess.run()
        """
        cmd_list = [executable]
        
        # Additional argument sanitization
        for arg in args:
            # Remove any shell metacharacters that might have slipped through
            sanitized = re.sub(r'[;&|`$(){}\\n\\r]', '', arg)
            if sanitized != arg and self.security_logger:
                self.security_logger.log_security_event(
                    "ARGUMENT_SANITIZED", 
                    f"Removed dangerous characters from argument"
                )
            cmd_list.append(sanitized)
        
        return cmd_list


if __name__ == "__main__":
    test_validators()