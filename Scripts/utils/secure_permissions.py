#!/usr/bin/env python3
"""
Secure file permissions module for SuperClaude Framework.

Implements least-privilege permission principles with proper validation,
audit logging, and security controls for file operations.
"""

import os
import stat
import logging
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, List, Union
from enum import Enum
from dataclasses import dataclass


class FileType(Enum):
    """File type classifications for permission assignment."""
    REGULAR_FILE = "regular_file"          # 0o644 - read/write owner, read group/others
    EXECUTABLE = "executable"              # 0o755 - execute permission for scripts/binaries
    DIRECTORY = "directory"                # 0o755 - traversal permissions
    CONFIG_FILE = "config_file"            # 0o600 - owner-only for sensitive configs
    LOG_FILE = "log_file"                  # 0o640 - owner write, group read
    TEMP_FILE = "temp_file"                # 0o600 - owner-only for temporary files
    HOOK_FILE = "hook_file"                # 0o644 - Python hooks don't need execute


@dataclass
class PermissionProfile:
    """Permission profile with validation and justification."""
    file_type: FileType
    permission: int
    justification: str
    security_level: str  # "low", "medium", "high", "critical"
    

class SecurePermissions:
    """
    Secure file permissions manager implementing least-privilege principles.
    
    Features:
    - Least-privilege permission assignment
    - Permission validation and justification
    - Audit logging of all permission changes
    - Security level classification
    - Permission profile management
    """
    
    # Permission profiles following least-privilege principle
    PERMISSION_PROFILES = {
        FileType.REGULAR_FILE: PermissionProfile(
            file_type=FileType.REGULAR_FILE,
            permission=0o644,
            justification="Standard files: readable by all, writable by owner only",
            security_level="medium"
        ),
        FileType.EXECUTABLE: PermissionProfile(
            file_type=FileType.EXECUTABLE,
            permission=0o755,
            justification="Executable files: execute permission required for functionality",
            security_level="high"
        ),
        FileType.DIRECTORY: PermissionProfile(
            file_type=FileType.DIRECTORY,
            permission=0o755,
            justification="Directories: traversal permissions required for access",
            security_level="medium"
        ),
        FileType.CONFIG_FILE: PermissionProfile(
            file_type=FileType.CONFIG_FILE,
            permission=0o600,
            justification="Configuration files: owner-only access for sensitive data",
            security_level="critical"
        ),
        FileType.LOG_FILE: PermissionProfile(
            file_type=FileType.LOG_FILE,
            permission=0o640,
            justification="Log files: owner write, group read for monitoring",
            security_level="medium"
        ),
        FileType.TEMP_FILE: PermissionProfile(
            file_type=FileType.TEMP_FILE,
            permission=0o600,
            justification="Temporary files: owner-only access for security",
            security_level="high"
        ),
        FileType.HOOK_FILE: PermissionProfile(
            file_type=FileType.HOOK_FILE,
            permission=0o644,
            justification="Python hooks: executed by interpreter, no execute bit needed",
            security_level="high"
        )
    }
    
    def __init__(self, audit_log_path: Optional[Path] = None):
        """
        Initialize secure permissions manager.
        
        Args:
            audit_log_path: Path for permission audit log
        """
        self.logger = logging.getLogger(__name__)
        self.audit_log_path = audit_log_path or Path.home() / ".claude" / "audit" / "permissions.log"
        self.audit_log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize audit log
        self._init_audit_log()
        
    def _init_audit_log(self):
        """Initialize permission audit log."""
        try:
            if not self.audit_log_path.exists():
                self.audit_log_path.touch()
                self.audit_log_path.chmod(0o600)  # Audit log is sensitive
                
                # Log initialization
                self._write_audit_entry({
                    "action": "audit_log_initialized",
                    "timestamp": time.time(),
                    "path": str(self.audit_log_path),
                    "permission": "0o600",
                    "justification": "Audit log requires owner-only access for security"
                })
        except Exception as e:
            self.logger.error(f"Failed to initialize audit log: {e}")
    
    def _write_audit_entry(self, entry: Dict[str, Any]):
        """Write entry to permission audit log."""
        try:
            with open(self.audit_log_path, 'a') as f:
                f.write(json.dumps(entry) + '\n')
        except Exception as e:
            self.logger.error(f"Failed to write audit entry: {e}")
    
    def classify_file_type(self, file_path: Path) -> FileType:
        """
        Classify file type for appropriate permission assignment.
        
        Args:
            file_path: Path to classify
            
        Returns:
            FileType enum value
        """
        if file_path.is_dir():
            return FileType.DIRECTORY
        
        # Check file extension and name patterns
        suffix = file_path.suffix.lower()
        name = file_path.name.lower()
        
        # Configuration files
        if (suffix in ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'] or
            name in ['settings.json', 'config.json', '.env', '.secrets'] or
            'config' in name or 'settings' in name):
            return FileType.CONFIG_FILE
        
        # Log files
        if suffix in ['.log'] or 'log' in name:
            return FileType.LOG_FILE
        
        # Temporary files
        if '/tmp/' in str(file_path) or name.startswith('.tmp') or suffix in ['.tmp', '.temp']:
            return FileType.TEMP_FILE
        
        # Hook files (Python files in hooks directory)
        if suffix == '.py' and 'hooks' in str(file_path).lower():
            return FileType.HOOK_FILE
        
        # Executable files
        if (suffix in ['.sh', '.bash', '.zsh', '.py', '.pl', '.rb'] or
            self._is_executable_file(file_path)):
            return FileType.EXECUTABLE
        
        # Default to regular file
        return FileType.REGULAR_FILE
    
    def _is_executable_file(self, file_path: Path) -> bool:
        """
        Check if file is intended to be executable.
        
        Args:
            file_path: Path to check
            
        Returns:
            True if file should be executable
        """
        try:
            if not file_path.exists():
                return False
                
            # Check shebang
            with open(file_path, 'rb') as f:
                first_line = f.readline(50)
                if first_line.startswith(b'#!'):
                    return True
                    
            # Check if currently executable
            current_perms = file_path.stat().st_mode
            return bool(current_perms & stat.S_IXUSR)
            
        except Exception:
            return False
    
    def get_recommended_permission(self, file_path: Path) -> PermissionProfile:
        """
        Get recommended permission for a file path.
        
        Args:
            file_path: Path to get permission for
            
        Returns:
            PermissionProfile with recommended settings
        """
        file_type = self.classify_file_type(file_path)
        return self.PERMISSION_PROFILES[file_type]
    
    def validate_permission(self, file_path: Path, requested_permission: int) -> Dict[str, Any]:
        """
        Validate requested permission against security policies.
        
        Args:
            file_path: Path to validate
            requested_permission: Requested permission octal value
            
        Returns:
            Validation result with recommendations
        """
        recommended = self.get_recommended_permission(file_path)
        
        result = {
            "valid": True,
            "recommended_permission": recommended.permission,
            "requested_permission": requested_permission,
            "file_type": recommended.file_type.value,
            "security_level": recommended.security_level,
            "justification": recommended.justification,
            "warnings": [],
            "errors": []
        }
        
        # Check for overly permissive permissions
        if requested_permission & 0o002:  # World writable
            result["errors"].append("World-writable permissions are not allowed")
            result["valid"] = False
        
        if requested_permission & 0o020 and recommended.file_type != FileType.LOG_FILE:  # Group writable
            result["warnings"].append("Group-writable permissions should be justified")
        
        # Check for unnecessarily restrictive permissions
        if (recommended.file_type == FileType.EXECUTABLE and 
            not (requested_permission & stat.S_IXUSR)):
            result["warnings"].append("Executable file missing execute permission")
        
        # Check for permission escalation
        if requested_permission > recommended.permission:
            excess_perms = requested_permission & ~recommended.permission
            result["warnings"].append(
                f"Requested permissions ({oct(requested_permission)}) exceed "
                f"recommended ({oct(recommended.permission)}). "
                f"Excess: {oct(excess_perms)}"
            )
        
        return result
    
    def set_secure_permission(self, file_path: Path, 
                            requested_permission: Optional[int] = None,
                            force: bool = False) -> bool:
        """
        Set secure permissions on a file with validation and audit logging.
        
        Args:
            file_path: Path to set permissions on
            requested_permission: Specific permission to set (optional)
            force: Override validation warnings
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get recommended permission if not specified
            if requested_permission is None:
                profile = self.get_recommended_permission(file_path)
                permission = profile.permission
                justification = profile.justification
            else:
                # Validate requested permission
                validation = self.validate_permission(file_path, requested_permission)
                
                if not validation["valid"] and not force:
                    self.logger.error(f"Invalid permission request for {file_path}: {validation['errors']}")
                    return False
                
                if validation["warnings"] and not force:
                    self.logger.warning(f"Permission warnings for {file_path}: {validation['warnings']}")
                
                permission = requested_permission
                justification = f"User-requested permission: {oct(permission)}"
            
            # Get current permissions for audit
            current_permission = None
            if file_path.exists():
                current_permission = oct(file_path.stat().st_mode & 0o777)
            
            # Set permissions
            file_path.chmod(permission)
            
            # Audit log entry
            audit_entry = {
                "action": "permission_set",
                "timestamp": time.time(),
                "path": str(file_path),
                "previous_permission": current_permission,
                "new_permission": oct(permission),
                "justification": justification,
                "file_type": self.classify_file_type(file_path).value,
                "forced": force
            }
            self._write_audit_entry(audit_entry)
            
            self.logger.info(f"Set permissions {oct(permission)} on {file_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to set permissions on {file_path}: {e}")
            
            # Audit failed attempt
            self._write_audit_entry({
                "action": "permission_set_failed",
                "timestamp": time.time(),
                "path": str(file_path),
                "error": str(e),
                "requested_permission": oct(requested_permission) if requested_permission else None
            })
            return False
    
    def audit_permissions(self, directory: Path, recursive: bool = True) -> Dict[str, Any]:
        """
        Audit permissions in a directory and identify issues.
        
        Args:
            directory: Directory to audit
            recursive: Whether to audit recursively
            
        Returns:
            Audit report with findings and recommendations
        """
        report = {
            "timestamp": time.time(),
            "directory": str(directory),
            "total_files": 0,
            "issues_found": 0,
            "recommendations": [],
            "critical_issues": [],
            "warnings": [],
            "files_audited": []
        }
        
        try:
            # Get file list
            if recursive:
                files = list(directory.rglob('*'))
            else:
                files = list(directory.iterdir())
            
            report["total_files"] = len(files)
            
            for file_path in files:
                if not file_path.exists():
                    continue
                
                current_perms = file_path.stat().st_mode & 0o777
                validation = self.validate_permission(file_path, current_perms)
                
                file_audit = {
                    "path": str(file_path),
                    "current_permission": oct(current_perms),
                    "recommended_permission": oct(validation["recommended_permission"]),
                    "file_type": validation["file_type"],
                    "security_level": validation["security_level"],
                    "issues": validation["errors"] + validation["warnings"]
                }
                
                if validation["errors"]:
                    report["critical_issues"].append(file_audit)
                    report["issues_found"] += 1
                
                if validation["warnings"]:
                    report["warnings"].append(file_audit)
                
                # Add to recommendations if permissions need adjustment
                if current_perms != validation["recommended_permission"]:
                    report["recommendations"].append({
                        "path": str(file_path),
                        "action": "chmod",
                        "current": oct(current_perms),
                        "recommended": oct(validation["recommended_permission"]),
                        "justification": validation["justification"]
                    })
                
                report["files_audited"].append(file_audit)
            
            # Write audit report
            self._write_audit_entry({
                "action": "directory_audit",
                "report": report
            })
            
        except Exception as e:
            self.logger.error(f"Failed to audit directory {directory}: {e}")
            report["error"] = str(e)
        
        return report
    
    def fix_permissions(self, directory: Path, recursive: bool = True, 
                       dry_run: bool = False) -> Dict[str, Any]:
        """
        Fix permissions in a directory according to security policies.
        
        Args:
            directory: Directory to fix
            recursive: Whether to fix recursively
            dry_run: Only simulate changes
            
        Returns:
            Fix report with actions taken
        """
        report = {
            "timestamp": time.time(),
            "directory": str(directory),
            "dry_run": dry_run,
            "files_processed": 0,
            "files_fixed": 0,
            "files_failed": 0,
            "actions": []
        }
        
        try:
            # Get file list
            if recursive:
                files = list(directory.rglob('*'))
            else:
                files = list(directory.iterdir())
            
            for file_path in files:
                if not file_path.exists():
                    continue
                
                report["files_processed"] += 1
                
                current_perms = file_path.stat().st_mode & 0o777
                recommended = self.get_recommended_permission(file_path)
                
                if current_perms != recommended.permission:
                    action = {
                        "path": str(file_path),
                        "current_permission": oct(current_perms),
                        "new_permission": oct(recommended.permission),
                        "justification": recommended.justification,
                        "success": False
                    }
                    
                    if not dry_run:
                        if self.set_secure_permission(file_path):
                            action["success"] = True
                            report["files_fixed"] += 1
                        else:
                            report["files_failed"] += 1
                    else:
                        action["success"] = True  # Would succeed in dry run
                    
                    report["actions"].append(action)
            
            # Write fix report
            self._write_audit_entry({
                "action": "permission_fix",
                "report": report
            })
            
        except Exception as e:
            self.logger.error(f"Failed to fix permissions in {directory}: {e}")
            report["error"] = str(e)
        
        return report
    
    def get_audit_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent permission audit history.
        
        Args:
            limit: Maximum number of entries to return
            
        Returns:
            List of audit log entries
        """
        history = []
        
        try:
            with open(self.audit_log_path, 'r') as f:
                lines = f.readlines()
                
            # Get the last 'limit' lines
            for line in lines[-limit:]:
                try:
                    entry = json.loads(line.strip())
                    history.append(entry)
                except json.JSONDecodeError:
                    continue
                    
        except Exception as e:
            self.logger.error(f"Failed to read audit history: {e}")
        
        return history


def test_secure_permissions():
    """Test secure permissions functionality."""
    import tempfile
    
    print("Testing SecurePermissions...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Initialize secure permissions
        sec_perms = SecurePermissions()
        
        # Test file type classification
        test_files = [
            temp_path / "regular.txt",
            temp_path / "script.sh",
            temp_path / "config.json",
            temp_path / "test.log",
            temp_path / "hooks" / "test_hook.py"
        ]
        
        for file_path in test_files:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text("test content")
            
            file_type = sec_perms.classify_file_type(file_path)
            profile = sec_perms.get_recommended_permission(file_path)
            
            print(f"{file_path.name}: {file_type.value} -> {oct(profile.permission)}")
            
            # Test permission setting
            success = sec_perms.set_secure_permission(file_path)
            print(f"  Permission set: {success}")
        
        # Test directory audit
        audit_report = sec_perms.audit_permissions(temp_path)
        print(f"\nAudit report: {audit_report['total_files']} files, "
              f"{audit_report['issues_found']} issues")
        
        # Test permission fixing
        fix_report = sec_perms.fix_permissions(temp_path, dry_run=True)
        print(f"Fix report: {fix_report['files_processed']} processed, "
              f"{len(fix_report['actions'])} actions needed")
    
    print("Secure permissions test completed!")


if __name__ == "__main__":
    test_secure_permissions()