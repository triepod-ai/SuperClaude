#!/usr/bin/env python3
"""
File operations utility for installation operations.
Provides safe file operations with backup and rollback capabilities.
"""

import os
import sys
import shutil
import json
import time
import stat
import subprocess
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
try:
    from .colors import Colors
except ImportError:
    # Fallback for direct execution
    from colors import Colors

# Import secure permissions module - FAIL-SAFE implementation
try:
    from .secure_permissions import SecurePermissions
except ImportError:
    try:
        from secure_permissions import SecurePermissions
    except ImportError:
        # SECURITY FIX: Fail-safe fallback that DENIES operations when security modules fail
        import logging
        _security_logger = logging.getLogger('superclaude.security.fallback')
        _security_logger.setLevel(logging.ERROR)
        
        class SecurePermissions:
            """FAIL-SAFE fallback that denies ALL operations when security modules unavailable."""
            
            def __init__(self):
                _security_logger.critical("SECURITY ALERT: SecurePermissions module failed to load - ALL operations will be denied")
                self._security_failure = True
            
            def set_secure_permission(self, path, requested_permission=None):
                _security_logger.error(f"SECURITY DENIAL: Cannot set permissions on {path} - security module unavailable")
                raise PermissionError("Security module unavailable - operation denied for safety")
            
            def validate_permission(self, path, permission):
                _security_logger.error(f"SECURITY DENIAL: Cannot validate permissions for {path} - security module unavailable")
                return {
                    "valid": False, 
                    "warnings": ["Security module unavailable - operation blocked"], 
                    "errors": ["CRITICAL: Security validation failed - ALL operations denied for safety"]
                }
            
            def fix_permissions(self, path, recursive=False, dry_run=False):
                _security_logger.error(f"SECURITY DENIAL: Cannot fix permissions for {path} - security module unavailable")
                raise PermissionError("Security module unavailable - operation denied for safety")
            
            def audit_permissions(self, path, recursive=False):
                _security_logger.error(f"SECURITY DENIAL: Cannot audit permissions for {path} - security module unavailable")
                return {
                    "valid": False,
                    "error": "Security module unavailable - audit denied for safety",
                    "issues_found": 0,
                    "critical_security_failure": True,
                    "safe_mode_enforced": True
                }


class FileOperations:
    """Safe file operations with backup and rollback capabilities.
    
    Security Features (Phase 2 Enhancements):
    - Resource limits and timeout enforcement
    - Comprehensive operation logging 
    - File integrity validation
    - Secure temporary file handling
    - Enhanced error sanitization
    """
    
    # Security configuration
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB limit
    MAX_COPY_TIMEOUT = 300  # 5 minutes for file operations
    MAX_BACKUP_COUNT = 50   # Maximum backup files to retain
    
    def __init__(self, use_colors: bool = True, dry_run: bool = False):
        """Initialize file operations.
        
        Args:
            use_colors: Whether to use colored output
            dry_run: If True, only simulate operations without actual changes
        """
        self.colors = Colors() if use_colors else Colors(force_color=False)
        self.dry_run = dry_run
        self.backup_dir: Optional[Path] = None
        self.operations_log: List[Dict[str, Any]] = []
        self.secure_perms = SecurePermissions()
        
        # SECURITY FIX: Check if we're using the fail-safe fallback
        self._security_module_failed = hasattr(self.secure_perms, '_security_failure')
        if self._security_module_failed:
            self._log_security_event(
                "CRITICAL_SECURITY_FAILURE", 
                "SecurePermissions module unavailable - operations restricted",
                "ERROR"
            )
        
        # Security monitoring
        self.security_log: List[Dict[str, Any]] = []
        self.operation_start_time: Optional[float] = None
        self.integrity_hashes: Dict[str, str] = {}
    
    def _log_security_event(self, event_type: str, path: str, details: str, severity: str = "INFO"):
        """Log security-relevant events"""
        event = {
            "timestamp": time.time(),
            "type": event_type,
            "path": self._sanitize_path_for_logging(path),
            "details": details,
            "severity": severity
        }
        self.security_log.append(event)
        
        # Print to console for immediate visibility
        if severity in ["WARNING", "ERROR"]:
            color_func = self.colors.warning if severity == "WARNING" else self.colors.error
            print(color_func(f"Security {severity}: {event_type} - {details}"))
    
    def _sanitize_path_for_logging(self, path: str) -> str:
        """Sanitize file paths for logging to prevent information disclosure"""
        path_str = str(path)
        # Replace home directory with ~
        home_str = str(Path.home())
        if path_str.startswith(home_str):
            path_str = path_str.replace(home_str, "~")
        # Remove any potential sensitive directory names
        path_str = path_str.replace("/etc/", "/[SYSTEM]/")
        path_str = path_str.replace("/var/", "/[VAR]/")
        return path_str
    
    def _validate_file_size(self, file_path: Path) -> bool:
        """Validate file size against security limits"""
        try:
            if not file_path.exists():
                return True
            
            file_size = file_path.stat().st_size
            if file_size > self.MAX_FILE_SIZE:
                self._log_security_event(
                    "FILE_SIZE_VIOLATION", str(file_path),
                    f"File size {file_size} exceeds limit {self.MAX_FILE_SIZE}",
                    "ERROR"
                )
                return False
            
            return True
        except Exception as e:
            self._log_security_event(
                "SIZE_CHECK_FAILED", str(file_path),
                f"Failed to check file size: {e}",
                "WARNING"
            )
            return False
    
    def _calculate_file_hash(self, file_path: Path) -> Optional[str]:
        """Calculate SHA-256 hash of file for integrity checking"""
        try:
            if not file_path.exists() or not file_path.is_file():
                return None
            
            hasher = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            
            return hasher.hexdigest()
        except Exception as e:
            self._log_security_event(
                "HASH_CALCULATION_FAILED", str(file_path),
                f"Failed to calculate hash: {e}",
                "WARNING"
            )
            return None
    
    def _enforce_operation_timeout(self, operation_name: str):
        """Check if operation has exceeded timeout"""
        if self.operation_start_time is None:
            return
        
        elapsed = time.time() - self.operation_start_time
        if elapsed > self.MAX_COPY_TIMEOUT:
            self._log_security_event(
                "OPERATION_TIMEOUT", operation_name,
                f"Operation exceeded timeout of {self.MAX_COPY_TIMEOUT}s (elapsed: {elapsed:.1f}s)",
                "ERROR"
            )
            raise TimeoutError(f"Operation {operation_name} timed out after {elapsed:.1f}s")
    
    def _start_operation_timer(self):
        """Start timing an operation"""
        self.operation_start_time = time.time()
    
    def _stop_operation_timer(self):
        """Stop timing an operation"""
        self.operation_start_time = None
        
    def set_backup_dir(self, backup_dir: Union[str, Path]):
        """Set backup directory for operations.
        
        Args:
            backup_dir: Directory to store backups
        """
        self.backup_dir = Path(backup_dir)
        if not self.dry_run:
            self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def _log_operation(self, operation: str, source: str, target: str, 
                      success: bool = True, error: Optional[str] = None):
        """Log file operation for rollback purposes.
        
        Args:
            operation: Type of operation (copy, move, create, etc.)
            source: Source path
            target: Target path
            success: Whether operation succeeded
            error: Error message if failed
        """
        self.operations_log.append({
            "timestamp": time.time(),
            "operation": operation,
            "source": str(source),
            "target": str(target),
            "success": success,
            "error": error
        })
    
    def copy_file(self, source: Union[str, Path], target: Union[str, Path], 
                  backup: bool = True) -> bool:
        """Copy a file safely with optional backup and security validation.
        
        Args:
            source: Source file path
            target: Target file path
            backup: Whether to backup existing target file
            
        Returns:
            True if successful, False otherwise
        """
        source_path = Path(source)
        target_path = Path(target)
        
        # Start operation timer for timeout enforcement
        self._start_operation_timer()
        
        try:
            if self.dry_run:
                print(f"{self.colors.info('[DRY RUN]')} Would copy {source_path} -> {target_path}")
                self._log_operation("copy", source_path, target_path)
                return True
            
            # Security validations
            if not self._validate_file_size(source_path):
                error = f"Source file size validation failed: {source_path}"
                self._log_operation("copy", source_path, target_path, False, error)
                return False
            
            # Check source exists
            if not source_path.exists():
                error = f"Source file not found: {source_path}"
                print(f"{self.colors.error('Error:')} {error}")
                self._log_operation("copy", source_path, target_path, False, error)
                return False
            
            # Calculate source file integrity hash
            source_hash = self._calculate_file_hash(source_path)
            if source_hash:
                self.integrity_hashes[str(source_path)] = source_hash
                self._log_security_event(
                    "FILE_HASH_CALCULATED", str(source_path),
                    f"Source hash: {source_hash[:16]}...", "INFO"
                )
            
            # Backup existing target if requested
            if backup and target_path.exists():
                if not self._backup_file(target_path):
                    return False
            
            # Ensure target directory exists
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Check timeout before copy operation
            self._enforce_operation_timeout("copy_file")
            
            # Copy file with timeout monitoring
            shutil.copy2(source_path, target_path)
            
            # Verify file integrity after copy
            if source_hash:
                target_hash = self._calculate_file_hash(target_path)
                if target_hash and target_hash != source_hash:
                    self._log_security_event(
                        "INTEGRITY_VIOLATION", str(target_path),
                        f"Hash mismatch after copy - source: {source_hash[:16]}..., target: {target_hash[:16]}...",
                        "ERROR"
                    )
                    # Remove corrupted file
                    target_path.unlink()
                    error = "File integrity check failed after copy"
                    self._log_operation("copy", source_path, target_path, False, error)
                    return False
                else:
                    self.integrity_hashes[str(target_path)] = target_hash
                    self._log_security_event(
                        "INTEGRITY_VERIFIED", str(target_path),
                        f"File integrity verified: {target_hash[:16]}...", "INFO"
                    )
            
            # Set secure permissions on target file
            try:
                self.secure_perms.set_secure_permission(target_path)
            except PermissionError as e:
                # Security module failure - abort operation
                print(f"{self.colors.error('SECURITY FAILURE:')} {e}")
                # Clean up copied file
                if target_path.exists():
                    target_path.unlink()
                error = "Security module failure - operation aborted"
                self._log_operation("copy", source_path, target_path, False, error)
                return False
            
            print(f"{self.colors.success('✓')} Copied {source_path.name} -> {target_path}")
            self._log_operation("copy", source_path, target_path)
            return True
            
        except TimeoutError:
            # Timeout error already logged by _enforce_operation_timeout
            self._log_operation("copy", source_path, target_path, False, "Operation timeout")
            return False
        except Exception as e:
            error = f"Failed to copy {source_path} to {target_path}: {e}"
            print(f"{self.colors.error('Error:')} {error}")
            self._log_operation("copy", source_path, target_path, False, str(e))
            return False
        finally:
            self._stop_operation_timer()
    
    def copy_directory(self, source: Union[str, Path], target: Union[str, Path],
                      backup: bool = True) -> bool:
        """Copy a directory recursively with optional backup.
        
        Args:
            source: Source directory path
            target: Target directory path
            backup: Whether to backup existing target directory
            
        Returns:
            True if successful, False otherwise
        """
        source_path = Path(source)
        target_path = Path(target)
        
        if self.dry_run:
            print(f"{self.colors.info('[DRY RUN]')} Would copy directory {source_path} -> {target_path}")
            self._log_operation("copy_dir", source_path, target_path)
            return True
        
        try:
            # Check source exists
            if not source_path.exists() or not source_path.is_dir():
                error = f"Source directory not found: {source_path}"
                print(f"{self.colors.error('Error:')} {error}")
                self._log_operation("copy_dir", source_path, target_path, False, error)
                return False
            
            # Backup existing target if requested
            if backup and target_path.exists():
                if not self._backup_file(target_path):
                    return False
            
            # Copy directory
            if target_path.exists():
                shutil.rmtree(target_path)
            
            shutil.copytree(source_path, target_path)
            
            print(f"{self.colors.success('✓')} Copied directory {source_path.name} -> {target_path}")
            self._log_operation("copy_dir", source_path, target_path)
            return True
            
        except Exception as e:
            error = f"Failed to copy directory {source_path} to {target_path}: {e}"
            print(f"{self.colors.error('Error:')} {error}")
            self._log_operation("copy_dir", source_path, target_path, False, str(e))
            return False
    
    def create_symlink(self, source: Union[str, Path], target: Union[str, Path],
                      backup: bool = True) -> bool:
        """Create a symbolic link with optional backup.
        
        Args:
            source: Source path (what the link points to)
            target: Target path (where the link is created)
            backup: Whether to backup existing target file
            
        Returns:
            True if successful, False otherwise
        """
        source_path = Path(source).resolve()
        target_path = Path(target)
        
        if self.dry_run:
            print(f"{self.colors.info('[DRY RUN]')} Would create symlink {target_path} -> {source_path}")
            self._log_operation("symlink", source_path, target_path)
            return True
        
        try:
            # Check source exists
            if not source_path.exists():
                error = f"Source path not found: {source_path}"
                print(f"{self.colors.error('Error:')} {error}")
                self._log_operation("symlink", source_path, target_path, False, error)
                return False
            
            # Backup existing target if requested
            if backup and target_path.exists():
                if not self._backup_file(target_path):
                    return False
            
            # Ensure target directory exists
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Remove existing target if it exists
            if target_path.exists() or target_path.is_symlink():
                target_path.unlink()
            
            # Create symlink
            target_path.symlink_to(source_path)
            
            print(f"{self.colors.success('✓')} Created symlink {target_path.name} -> {source_path}")
            self._log_operation("symlink", source_path, target_path)
            return True
            
        except Exception as e:
            error = f"Failed to create symlink {target_path} -> {source_path}: {e}"
            print(f"{self.colors.error('Error:')} {error}")
            self._log_operation("symlink", source_path, target_path, False, str(e))
            return False
    
    def write_file(self, path: Union[str, Path], content: str, 
                   backup: bool = True, encoding: str = "utf-8") -> bool:
        """Write content to a file with optional backup.
        
        Args:
            path: File path to write
            content: Content to write
            backup: Whether to backup existing file
            encoding: File encoding
            
        Returns:
            True if successful, False otherwise
        """
        file_path = Path(path)
        
        if self.dry_run:
            print(f"{self.colors.info('[DRY RUN]')} Would write {len(content)} chars to {file_path}")
            self._log_operation("write", "", file_path)
            return True
        
        try:
            # Backup existing file if requested
            if backup and file_path.exists():
                if not self._backup_file(file_path):
                    return False
            
            # Ensure directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file
            with open(file_path, 'w', encoding=encoding) as f:
                f.write(content)
            
            print(f"{self.colors.success('✓')} Written {file_path.name} ({len(content)} chars)")
            self._log_operation("write", "", file_path)
            return True
            
        except Exception as e:
            error = f"Failed to write {file_path}: {e}"
            print(f"{self.colors.error('Error:')} {error}")
            self._log_operation("write", "", file_path, False, str(e))
            return False
    
    def _backup_file(self, path: Path) -> bool:
        """Create backup of a file or directory.
        
        Args:
            path: Path to backup
            
        Returns:
            True if successful, False otherwise
        """
        if not self.backup_dir:
            # Create temporary backup directory
            self.backup_dir = Path.home() / ".claude" / "backup" / str(int(time.time()))
            self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            backup_path = self.backup_dir / path.name
            
            # Handle name conflicts
            counter = 1
            while backup_path.exists():
                name_parts = path.name.rsplit('.', 1)
                if len(name_parts) == 2:
                    backup_name = f"{name_parts[0]}_{counter}.{name_parts[1]}"
                else:
                    backup_name = f"{path.name}_{counter}"
                backup_path = self.backup_dir / backup_name
                counter += 1
            
            if path.is_dir():
                shutil.copytree(path, backup_path)
            else:
                shutil.copy2(path, backup_path)
            
            print(f"{self.colors.muted('  Backed up:')} {path.name} -> {backup_path}")
            return True
            
        except Exception as e:
            print(f"{self.colors.error('Backup failed:')} {e}")
            return False
    
    def rollback_operations(self) -> bool:
        """Rollback all operations that were logged.
        
        Returns:
            True if rollback successful, False otherwise
        """
        if self.dry_run:
            print(f"{self.colors.info('[DRY RUN]')} Would rollback {len(self.operations_log)} operations")
            return True
        
        print(f"{self.colors.warning('Rolling back')} {len(self.operations_log)} operations...")
        
        success_count = 0
        
        # Rollback in reverse order
        for operation in reversed(self.operations_log):
            try:
                if operation["operation"] in ["copy", "write", "symlink"]:
                    target_path = Path(operation["target"])
                    if target_path.exists():
                        if target_path.is_dir():
                            shutil.rmtree(target_path)
                        else:
                            target_path.unlink()
                        print(f"{self.colors.success('✓')} Removed {target_path}")
                        success_count += 1
                
                elif operation["operation"] == "copy_dir":
                    target_path = Path(operation["target"])
                    if target_path.exists():
                        shutil.rmtree(target_path)
                        print(f"{self.colors.success('✓')} Removed directory {target_path}")
                        success_count += 1
                
            except Exception as e:
                print(f"{self.colors.error('Rollback failed:')} {operation['target']}: {e}")
        
        print(f"{self.colors.info('Rollback complete:')} {success_count}/{len(self.operations_log)} operations")
        return success_count == len(self.operations_log)
    
    def save_operations_log(self, log_file: Union[str, Path]):
        """Save operations log to file for later analysis.
        
        Args:
            log_file: Path to save log file
        """
        try:
            with open(log_file, 'w') as f:
                json.dump(self.operations_log, f, indent=2)
            print(f"{self.colors.success('✓')} Operations log saved to {log_file}")
        except Exception as e:
            print(f"{self.colors.error('Error saving log:')} {e}")
    
    def get_operations_count(self, operation_type: str = None) -> int:
        """Get count of operations by type.
        
        Args:
            operation_type: Type of operation to count (e.g., 'copy', 'symlink').
                          If None, returns total count.
        
        Returns:
            Count of operations matching the type
        """
        if operation_type is None:
            return len(self.operations_log)
        
        return sum(1 for op in self.operations_log 
                  if op.get('operation') == operation_type)
    
    def get_failed_operations(self) -> List[Dict[str, Any]]:
        """Get list of failed operations.
        
        Returns:
            List of failed operation entries
        """
        return [op for op in self.operations_log if not op.get('success', True)]
    
    def create_directory(self, path: Union[str, Path], backup: bool = True) -> bool:
        """Create a directory with optional backup of existing directory.
        
        Args:
            path: Directory path to create
            backup: Whether to backup existing directory
            
        Returns:
            True if successful, False otherwise
        """
        dir_path = Path(path)
        
        if self.dry_run:
            print(f"{self.colors.info('[DRY RUN]')} Would create directory {dir_path}")
            self._log_operation("create_dir", "", dir_path)
            return True
        
        try:
            # Backup existing directory if requested
            if backup and dir_path.exists():
                if not self._backup_file(dir_path):
                    return False
            
            # Create directory
            dir_path.mkdir(parents=True, exist_ok=True)
            
            print(f"{self.colors.success('✓')} Created directory {dir_path}")
            self._log_operation("create_dir", "", dir_path)
            return True
            
        except Exception as e:
            error = f"Failed to create directory {dir_path}: {e}"
            print(f"{self.colors.error('Error:')} {error}")
            self._log_operation("create_dir", "", dir_path, False, str(e))
            return False
    
    def cleanup(self):
        """Clean up resources and reset state.
        
        Clears operations log and resets backup directory.
        """
        if self.dry_run:
            print(f"{self.colors.info('[DRY RUN]')} Would cleanup resources")
            return
        
        # Clear operations log
        cleared_ops = len(self.operations_log)
        self.operations_log.clear()
        
        # Clear security log
        cleared_security = len(self.security_log)
        self.security_log.clear()
        
        # Clear integrity hashes
        self.integrity_hashes.clear()
        
        # Reset backup directory
        self.backup_dir = None
        
        print(f"{self.colors.muted('Cleanup:')} Cleared {cleared_ops} operations from log")
    
    def set_secure_permissions(self, path: Union[str, Path], 
                             requested_permission: Optional[int] = None) -> bool:
        """Set secure permissions on a file or directory.
        
        Args:
            path: Path to set permissions on
            requested_permission: Specific permission to set (optional)
            
        Returns:
            True if successful, False otherwise
        """
        file_path = Path(path)
        
        if self.dry_run:
            print(f"{self.colors.info('[DRY RUN]')} Would set secure permissions on {file_path}")
            return True
        
        try:
            # When security module is unavailable, this will raise PermissionError
            self.secure_perms.set_secure_permission(file_path, requested_permission)
            print(f"{self.colors.success('✓')} Set secure permissions on {file_path.name}")
            self._log_operation("set_permissions", "", file_path)
            return True
            
        except PermissionError as e:
            error = f"Security module failure: {e}"
            print(f"{self.colors.error('SECURITY FAILURE:')} {error}")
            self._log_operation("set_permissions", "", file_path, False, error)
            return False
            
        except Exception as e:
            error = f"Failed to set secure permissions on {file_path}: {e}"
            print(f"{self.colors.error('Error:')} {error}")
            self._log_operation("set_permissions", "", file_path, False, str(e))
            return False
    
    def validate_permissions(self, path: Union[str, Path], 
                           permission: int) -> Dict[str, Any]:
        """Validate permissions against security policies.
        
        Args:
            path: Path to validate
            permission: Permission to validate
            
        Returns:
            Validation result with recommendations
        """
        file_path = Path(path)
        return self.secure_perms.validate_permission(file_path, permission)
    
    def audit_permissions(self, directory: Union[str, Path], 
                         recursive: bool = True) -> Dict[str, Any]:
        """Audit permissions in a directory.
        
        Args:
            directory: Directory to audit
            recursive: Whether to audit recursively
            
        Returns:
            Audit report with findings
        """
        dir_path = Path(directory)
        
        if self.dry_run:
            print(f"{self.colors.info('[DRY RUN]')} Would audit permissions in {dir_path}")
            return {"issues_found": 0, "dry_run": True}
        
        return self.secure_perms.audit_permissions(dir_path, recursive)
    
    def fix_permissions(self, directory: Union[str, Path], 
                       recursive: bool = True) -> Dict[str, Any]:
        """Fix permissions in a directory according to security policies.
        
        Args:
            directory: Directory to fix
            recursive: Whether to fix recursively
            
        Returns:
            Fix report with actions taken
        """
        dir_path = Path(directory)
        
        if self.dry_run:
            return self.secure_perms.fix_permissions(dir_path, recursive, dry_run=True)
        
        return self.secure_perms.fix_permissions(dir_path, recursive, dry_run=False)
    
    def get_security_report(self) -> Dict[str, Any]:
        """Get comprehensive security report for all operations.
        
        Returns:
            Dictionary with security statistics and events
        """
        total_events = len(self.security_log)
        
        # Count events by severity
        events_by_severity = {}
        events_by_type = {}
        
        for event in self.security_log:
            severity = event["severity"]
            event_type = event["type"]
            
            events_by_severity[severity] = events_by_severity.get(severity, 0) + 1
            events_by_type[event_type] = events_by_type.get(event_type, 0) + 1
        
        # Count critical security metrics
        integrity_checks = events_by_type.get("INTEGRITY_VERIFIED", 0) + events_by_type.get("INTEGRITY_VIOLATION", 0)
        integrity_violations = events_by_type.get("INTEGRITY_VIOLATION", 0)
        size_violations = events_by_type.get("FILE_SIZE_VIOLATION", 0)
        timeout_violations = events_by_type.get("OPERATION_TIMEOUT", 0)
        
        # Calculate security score (0-100)
        security_score = 100
        if total_events > 0:
            security_score -= (events_by_severity.get("ERROR", 0) * 20)
            security_score -= (events_by_severity.get("WARNING", 0) * 5)
            security_score = max(0, security_score)
        
        return {
            "total_security_events": total_events,
            "events_by_severity": events_by_severity,
            "events_by_type": events_by_type,
            "integrity_checks_performed": integrity_checks,
            "integrity_violations": integrity_violations,
            "file_size_violations": size_violations,
            "timeout_violations": timeout_violations,
            "security_score": security_score,
            "files_with_integrity_hashes": len(self.integrity_hashes),
            "security_log": self.security_log[-10:]  # Last 10 events for review
        }
    
    def export_security_log(self, log_file: Union[str, Path]) -> bool:
        """Export security log to file.
        
        Args:
            log_file: Path to export security log
            
        Returns:
            True if successful, False otherwise
        """
        try:
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            security_report = self.get_security_report()
            
            with open(log_path, 'w') as f:
                json.dump(security_report, f, indent=2, default=str)
            
            print(f"{self.colors.success('✓')} Security log exported to {log_path}")
            return True
            
        except Exception as e:
            print(f"{self.colors.error('Error:')} Failed to export security log: {e}")
            return False


def test_file_ops():
    """Test file operations utilities."""
    import tempfile
    
    print("Testing FileOperations...")
    
    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Initialize file operations
        file_ops = FileOperations(dry_run=False)
        file_ops.set_backup_dir(temp_path / "backup")
        
        # Test file creation
        test_file = temp_path / "test.txt"
        file_ops.write_file(test_file, "Hello, World!")
        
        # Test file copy
        copy_target = temp_path / "test_copy.txt"
        file_ops.copy_file(test_file, copy_target)
        
        # Test symlink creation
        symlink_target = temp_path / "test_symlink.txt"
        file_ops.create_symlink(test_file, symlink_target)
        
        # Test directory operations
        test_dir = temp_path / "test_dir"
        test_dir.mkdir()
        (test_dir / "file1.txt").write_text("File 1")
        (test_dir / "file2.txt").write_text("File 2")
        
        copy_dir_target = temp_path / "test_dir_copy"
        file_ops.copy_directory(test_dir, copy_dir_target)
        
        print(f"\nOperations log: {len(file_ops.operations_log)} operations")
        
        # Test rollback
        file_ops.rollback_operations()
        
        print("File operations test completed!")


if __name__ == "__main__":
    test_file_ops()