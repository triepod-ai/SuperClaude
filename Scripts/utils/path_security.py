#!/usr/bin/env python3
"""
Path Security Utilities - SuperClaude Framework v3.0

Secure path validation and sanitization utilities to prevent directory traversal
attacks and ensure safe file operations within allowed directories.

Security Features:
- Directory traversal prevention
- Path bounds checking
- Input sanitization
- Safe path resolution
"""

import os
import sys
from pathlib import Path
from typing import Union, Optional, List, Set, Dict, Any
import re
import unicodedata
import time
import logging
from collections import defaultdict


class PathTraversalError(Exception):
    """Raised when a path traversal attack is detected."""
    pass


class PathSecurityValidator:
    """
    Secure path validator that prevents directory traversal attacks.
    
    Features:
    - Validates paths against allowed root directories
    - Prevents '../' directory traversal sequences
    - Resolves symbolic links safely
    - Ensures paths stay within bounds
    - Unicode normalization for homograph attacks
    - Performance benchmarking for security operations
    """
    
    def __init__(self, allowed_roots: Optional[List[Union[str, Path]]] = None,
                 enable_benchmarking: bool = False, enable_logging: bool = True):
        """
        Initialize path security validator.
        
        Args:
            allowed_roots: List of allowed root directories. If None, uses secure defaults.
            enable_benchmarking: Enable performance benchmarking for security operations
            enable_logging: Enable security event logging
        """
        self.allowed_roots: Set[Path] = set()
        self.enable_benchmarking = enable_benchmarking
        self.benchmarks: Dict[str, List[float]] = defaultdict(list)
        
        # Setup logging
        self.logger = logging.getLogger('superclaude.path_security')
        if enable_logging and not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.WARNING)
        
        if allowed_roots is None:
            # Default secure roots for SuperClaude framework
            self.allowed_roots = {
                Path.home() / ".claude",  # Global Claude directory
                Path.cwd(),  # Current working directory
                Path("/tmp") / "superclaude",  # Temporary directory
                Path("/tmp"),  # Allow /tmp for testing
            }
        else:
            for root in allowed_roots:
                self.allowed_roots.add(Path(root).resolve())
    
    def add_allowed_root(self, root: Union[str, Path]) -> None:
        """Add an allowed root directory."""
        self.allowed_roots.add(Path(root).resolve())
    
    def _benchmark(self, operation: str):
        """Decorator for benchmarking security operations."""
        def decorator(func):
            def wrapper(*args, **kwargs):
                if self.enable_benchmarking:
                    start_time = time.perf_counter()
                
                result = func(*args, **kwargs)
                
                if self.enable_benchmarking:
                    end_time = time.perf_counter()
                    duration = (end_time - start_time) * 1000  # Convert to milliseconds
                    self.benchmarks[operation].append(duration)
                    
                    # Log slow operations
                    if duration > 100:  # Operations taking more than 100ms
                        self.logger.warning(
                            f"Slow security operation: {operation} took {duration:.2f}ms"
                        )
                
                return result
            return wrapper
        return decorator
    
    def get_benchmarks(self) -> Dict[str, Dict[str, float]]:
        """Get performance benchmarks for security operations."""
        results = {}
        for operation, times in self.benchmarks.items():
            if times:
                results[operation] = {
                    'count': len(times),
                    'avg_ms': sum(times) / len(times),
                    'min_ms': min(times),
                    'max_ms': max(times),
                    'total_ms': sum(times)
                }
        return results
    
    def _normalize_unicode(self, path_str: str) -> str:
        """Normalize Unicode to prevent homograph attacks.
        
        Args:
            path_str: Path string to normalize
            
        Returns:
            Normalized path string
        """
        # Normalize to NFC form (canonical composition)
        normalized = unicodedata.normalize('NFC', path_str)
        
        # Remove zero-width characters and other invisible Unicode
        zero_width_chars = [
            '\u200b',  # Zero Width Space
            '\u200c',  # Zero Width Non-Joiner
            '\u200d',  # Zero Width Joiner
            '\u2060',  # Word Joiner
            '\ufeff',  # Zero Width No-Break Space
            '\u180e',  # Mongolian Vowel Separator
        ]
        
        for char in zero_width_chars:
            normalized = normalized.replace(char, '')
        
        # Detect and log potential homograph attacks
        if self._contains_homograph_characters(normalized):
            self.logger.warning(
                f"Potential homograph attack detected in path: {normalized[:50]}"
            )
        
        return normalized
    
    def _contains_homograph_characters(self, text: str) -> bool:
        """Check if text contains potential homograph characters."""
        # Common homograph characters that look like ASCII but aren't
        homographs = {
            'а': 'a',  # Cyrillic 'a'
            'о': 'o',  # Cyrillic 'o'
            'е': 'e',  # Cyrillic 'e'
            'р': 'p',  # Cyrillic 'r'
            'с': 'c',  # Cyrillic 's'
            'х': 'x',  # Cyrillic 'h'
            'у': 'y',  # Cyrillic 'u'
            'к': 'k',  # Cyrillic 'k'
            'ν': 'v',  # Greek nu
            'α': 'a',  # Greek alpha
            'ο': 'o',  # Greek omicron
        }
        
        for char in text:
            if char in homographs:
                return True
        
        # Check for mixed scripts (e.g., Latin + Cyrillic)
        scripts = set()
        for char in text:
            if char.isalpha():
                script = unicodedata.name(char, '').split()[0]
                scripts.add(script)
        
        # If multiple scripts are found, it might be a homograph attack
        return len(scripts) > 1
    
    def validate_path_components(self, path_str: str) -> bool:
        """
        Validate individual path components for security.
        
        Args:
            path_str: Path string to validate
            
        Returns:
            True if path components are safe
            
        Raises:
            PathTraversalError: If dangerous components detected
        """
        # Normalize Unicode first
        path_str = self._normalize_unicode(path_str)
        
        # Normalize path separators
        normalized = path_str.replace('\\', '/')
        
        # Check for directory traversal patterns
        dangerous_patterns = [
            '../',  # Directory traversal
            '..\\',  # Windows directory traversal
            '..',   # Relative parent reference
            '/./',  # Current directory reference
            '\\.\\',  # Windows current directory
            '//',   # Double slashes
            '\\\\', # Double backslashes
        ]
        
        for pattern in dangerous_patterns:
            if pattern in normalized:
                raise PathTraversalError(f"Dangerous path pattern detected: {pattern}")
        
        # Check for null bytes and other dangerous characters
        if '\0' in path_str:
            raise PathTraversalError("Null byte detected in path")
        
        # Check for extremely long paths (potential buffer overflow)
        if len(path_str) > 4096:
            raise PathTraversalError("Path too long (potential security risk)")
        
        # Check for suspicious file extensions in path components
        suspicious_extensions = {'.exe', '.bat', '.cmd', '.scr', '.pif', '.com'}
        path_obj = Path(path_str)
        
        for part in path_obj.parts:
            if any(part.lower().endswith(ext) for ext in suspicious_extensions):
                raise PathTraversalError(f"Suspicious file extension in path: {part}")
        
        return True
    
    def resolve_secure_path(self, path_input: Union[str, Path], 
                           base_dir: Optional[Union[str, Path]] = None) -> Path:
        """
        Safely resolve a path and validate it's within allowed bounds.
        
        Args:
            path_input: Input path to resolve
            base_dir: Base directory for relative paths
            
        Returns:
            Resolved and validated Path object
            
        Raises:
            PathTraversalError: If path is outside allowed bounds
        """
        start_time = time.perf_counter() if self.enable_benchmarking else None
        
        try:
            # Convert to string for validation
            path_str = str(path_input)
            
            # Normalize Unicode
            path_str = self._normalize_unicode(path_str)
            
            # Validate path components first
            self.validate_path_components(path_str)
            
            # Handle tilde expansion safely
            if path_str.startswith('~'):
                if path_str == '~' or path_str.startswith('~/'):
                    path_str = path_str.replace('~', str(Path.home()), 1)
                else:
                    # Don't allow ~user expansion for security
                    raise PathTraversalError("User directory expansion not allowed")
            
            # Create Path object
            if base_dir:
                base_path = Path(base_dir).resolve()
                if Path(path_str).is_absolute():
                    target_path = Path(path_str)
                else:
                    target_path = base_path / path_str
            else:
                target_path = Path(path_str)
            
            # Check for symlink attacks before resolving
            if target_path.exists() and target_path.is_symlink():
                # Log symlink detection
                self.logger.info(f"Symlink detected: {target_path}")
                
                # Check symlink target
                try:
                    link_target = os.readlink(target_path)
                    # Ensure symlink target is also within allowed bounds
                    if Path(link_target).is_absolute():
                        # Absolute symlink - validate directly
                        self._validate_symlink_target(Path(link_target))
                    else:
                        # Relative symlink - resolve from parent directory
                        parent_dir = target_path.parent
                        absolute_target = (parent_dir / link_target).resolve()
                        self._validate_symlink_target(absolute_target)
                except (OSError, ValueError) as e:
                    raise PathTraversalError(f"Invalid symlink: {target_path} - {e}")
            
            # Resolve the path (follows symlinks and resolves .. and .)
            resolved_path = target_path.resolve()
            
            # Check if resolved path is within any allowed root
            is_within_bounds = False
            
            for allowed_root in self.allowed_roots:
                try:
                    # Check if resolved path is under allowed root
                    resolved_path.relative_to(allowed_root)
                    is_within_bounds = True
                    break
                except ValueError:
                    # Path is not under this root, continue checking
                    continue
            
            if not is_within_bounds:
                raise PathTraversalError(
                    f"Path '{resolved_path}' is outside allowed directories: "
                    f"{[str(root) for root in self.allowed_roots]}"
                )
            
            return resolved_path
        
        except (OSError, ValueError) as e:
            raise PathTraversalError(f"Invalid path: {path_str} - {e}")
        
        finally:
            if self.enable_benchmarking and start_time:
                duration = (time.perf_counter() - start_time) * 1000
                self.benchmarks['resolve_secure_path'].append(duration)
    
    def _validate_symlink_target(self, target_path: Path) -> None:
        """Validate symlink target is within allowed bounds."""
        is_valid = False
        for allowed_root in self.allowed_roots:
            try:
                target_path.relative_to(allowed_root)
                is_valid = True
                break
            except ValueError:
                continue
        
        if not is_valid:
            raise PathTraversalError(
                f"Symlink target '{target_path}' is outside allowed directories"
            )
    
    def validate_file_operation(self, source: Union[str, Path], 
                               target: Union[str, Path],
                               operation: str = "copy") -> tuple[Path, Path]:
        """
        Validate both source and target paths for a file operation.
        
        Args:
            source: Source file path
            target: Target file path
            operation: Type of operation (copy, move, symlink)
            
        Returns:
            Tuple of (validated_source, validated_target)
            
        Raises:
            PathTraversalError: If either path is invalid
        """
        # Validate source path
        try:
            validated_source = self.resolve_secure_path(source)
        except PathTraversalError as e:
            raise PathTraversalError(f"Invalid source path for {operation}: {e}")
        
        # Validate target path
        try:
            validated_target = self.resolve_secure_path(target)
        except PathTraversalError as e:
            raise PathTraversalError(f"Invalid target path for {operation}: {e}")
        
        # Additional validation for different operation types
        if operation == "copy" or operation == "move":
            # Ensure source exists and is readable
            if not validated_source.exists():
                raise PathTraversalError(f"Source file does not exist: {validated_source}")
            
            if not os.access(validated_source, os.R_OK):
                raise PathTraversalError(f"Source file not readable: {validated_source}")
        
        elif operation == "symlink":
            # For symlinks, source doesn't need to exist but should be within bounds
            # Target directory should exist and be writable
            target_parent = validated_target.parent
            if not target_parent.exists():
                raise PathTraversalError(f"Target directory does not exist: {target_parent}")
            
            if not os.access(target_parent, os.W_OK):
                raise PathTraversalError(f"Target directory not writable: {target_parent}")
        
        # Check target directory is writable
        target_parent = validated_target.parent
        if target_parent.exists() and not os.access(target_parent, os.W_OK):
            raise PathTraversalError(f"Target directory not writable: {target_parent}")
        
        return validated_source, validated_target
    
    def secure_mkdir(self, dir_path: Union[str, Path], 
                    parents: bool = True, exist_ok: bool = True) -> Path:
        """
        Safely create directories with path validation.
        
        Args:
            dir_path: Directory path to create
            parents: Create parent directories if needed
            exist_ok: Don't raise error if directory exists
            
        Returns:
            Validated directory Path
            
        Raises:
            PathTraversalError: If path is invalid
        """
        validated_path = self.resolve_secure_path(dir_path)
        
        try:
            validated_path.mkdir(parents=parents, exist_ok=exist_ok)
        except (OSError, PermissionError) as e:
            raise PathTraversalError(f"Failed to create directory {validated_path}: {e}")
        
        return validated_path


class SecureInstaller:
    """
    Base class for secure installers with built-in path validation.
    """
    
    def __init__(self, project_dir: Union[str, Path]):
        """
        Initialize secure installer.
        
        Args:
            project_dir: Project directory (will be validated)
        """
        # Create path validator with secure defaults
        self.path_validator = PathSecurityValidator()
        
        # Validate and set project directory
        try:
            self.project_dir = self.path_validator.resolve_secure_path(project_dir)
        except PathTraversalError as e:
            raise ValueError(f"Invalid project directory: {e}")
        
        # Add project directory as allowed root
        self.path_validator.add_allowed_root(self.project_dir)
        
        # Standard secure directories
        self.claude_dir = Path.home() / ".claude"
        self.path_validator.add_allowed_root(self.claude_dir)
    
    def secure_path(self, path_input: Union[str, Path], 
                   base_dir: Optional[Union[str, Path]] = None) -> Path:
        """Wrapper for secure path resolution."""
        return self.path_validator.resolve_secure_path(path_input, base_dir)
    
    def secure_file_operation(self, source: Union[str, Path], 
                             target: Union[str, Path], operation: str = "copy") -> tuple[Path, Path]:
        """Wrapper for secure file operation validation."""
        return self.path_validator.validate_file_operation(source, target, operation)
    
    def secure_mkdir(self, dir_path: Union[str, Path]) -> Path:
        """Wrapper for secure directory creation."""
        return self.path_validator.secure_mkdir(dir_path)


def validate_installer_paths(project_dir: str, target_files: List[str]) -> None:
    """
    Utility function to validate installer paths before operations.
    
    Args:
        project_dir: Project directory
        target_files: List of target file paths
        
    Raises:
        PathTraversalError: If any path is invalid
    """
    validator = PathSecurityValidator([project_dir, Path.home() / ".claude"])
    
    # Validate project directory
    validator.resolve_secure_path(project_dir)
    
    # Validate all target files
    for target_file in target_files:
        validator.resolve_secure_path(target_file)


# Test patterns for security validation
MALICIOUS_PATH_PATTERNS = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32",
    "/etc/passwd",
    "~/../../../etc/passwd",
    "file\0.txt",
    "a" * 5000,  # Very long path
    "./../../sensitive.file",
    "\\..\\..\\..\\windows\\system32\\cmd.exe",
    "legitimate/../../../etc/shadow",
    "normal/path/../../../../../../etc/passwd",
]


def test_security_patterns() -> List[str]:
    """
    Test function to validate security patterns are caught.
    
    Returns:
        List of detected vulnerabilities
    """
    validator = PathSecurityValidator(["/safe/directory"])
    detected_issues = []
    
    for pattern in MALICIOUS_PATH_PATTERNS:
        try:
            validator.resolve_secure_path(pattern)
            detected_issues.append(f"FAILED to detect: {pattern}")
        except PathTraversalError:
            # Good - pattern was detected as malicious
            pass
        except Exception as e:
            detected_issues.append(f"Unexpected error for {pattern}: {e}")
    
    return detected_issues


if __name__ == "__main__":
    # Run security tests
    print("Running path security tests...")
    issues = test_security_patterns()
    
    if issues:
        print("Security issues detected:")
        for issue in issues:
            print(f"  - {issue}")
        sys.exit(1)
    else:
        print("All security tests passed!")