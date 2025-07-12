#!/usr/bin/env python3
"""
Security Audit Trail System for SuperClaude Framework

Provides comprehensive security event logging, audit trail management,
and security analysis capabilities for the installation suite.
"""

import os
import json
import logging
import logging.handlers
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum


class SecurityEventType(Enum):
    """Security event types for categorization."""
    VALIDATION_FAILURE = "validation_failure"
    AUTHENTICATION_ATTEMPT = "authentication_attempt"
    FILE_ACCESS = "file_access"
    COMMAND_EXECUTION = "command_execution"
    NETWORK_ACCESS = "network_access"
    PERMISSION_CHANGE = "permission_change"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    INTEGRITY_CHECK = "integrity_check"
    CONFIGURATION_CHANGE = "configuration_change"


class SecurityLevel(Enum):
    """Security event severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class SecurityEvent:
    """Security event data structure."""
    timestamp: str
    event_type: SecurityEventType
    level: SecurityLevel
    source: str
    message: str
    details: Dict[str, Any]
    user: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    process_id: Optional[int] = None


class SecurityAuditLogger:
    """Comprehensive security audit logging system."""
    
    def __init__(self, audit_dir: Optional[Union[str, Path]] = None,
                 max_log_size: int = 10 * 1024 * 1024,  # 10MB
                 max_log_files: int = 10):
        """Initialize security audit logger.
        
        Args:
            audit_dir: Directory for audit logs (default: ~/.claude/security)
            max_log_size: Maximum size of each log file in bytes
            max_log_files: Maximum number of log files to keep
        """
        if audit_dir is None:
            self.audit_dir = Path.home() / ".claude" / "security"
        else:
            self.audit_dir = Path(audit_dir)
        
        self.audit_dir.mkdir(parents=True, exist_ok=True)
        self.max_log_size = max_log_size
        self.max_log_files = max_log_files
        
        # Setup structured logging
        self.logger = self._setup_logger()
        
        # Event counters for analysis
        self.event_counters: Dict[str, int] = {}
        
        # Session tracking
        self.session_id = self._generate_session_id()
    
    def _setup_logger(self) -> logging.Logger:
        """Setup structured security logger."""
        logger = logging.getLogger('superclaude.security_audit')
        logger.setLevel(logging.INFO)
        
        # Remove existing handlers
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Create rotating file handler
        log_file = self.audit_dir / "security_audit.log"
        handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=self.max_log_size,
            backupCount=self.max_log_files
        )
        
        # JSON formatter for structured logging
        formatter = logging.Formatter(
            '%(message)s'  # We'll format as JSON in the log_event method
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    def _generate_session_id(self) -> str:
        """Generate unique session identifier."""
        timestamp = datetime.now(timezone.utc).isoformat()
        pid = os.getpid()
        hash_obj = hashlib.sha256(f"{timestamp}-{pid}".encode())
        return hash_obj.hexdigest()[:16]
    
    def _sanitize_for_audit(self, data: Any) -> Any:
        """Sanitize sensitive data for audit logging."""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if key.lower() in ['password', 'token', 'key', 'secret', 'auth']:
                    sanitized[key] = "[REDACTED]"
                elif isinstance(value, str) and len(value) > 200:
                    # Truncate very long strings
                    hash_obj = hashlib.sha256(value.encode())
                    sanitized[key] = f"{value[:50]}...[HASH:{hash_obj.hexdigest()[:8]}]"
                else:
                    sanitized[key] = self._sanitize_for_audit(value)
            return sanitized
        elif isinstance(data, list):
            return [self._sanitize_for_audit(item) for item in data]
        elif isinstance(data, str) and len(data) > 500:
            # Hash very long strings
            hash_obj = hashlib.sha256(data.encode())
            return f"{data[:100]}...[HASH:{hash_obj.hexdigest()[:8]}]"
        else:
            return data
    
    def log_event(self, event_type: SecurityEventType, level: SecurityLevel,
                  source: str, message: str, details: Optional[Dict[str, Any]] = None,
                  user: Optional[str] = None, ip_address: Optional[str] = None):
        """Log a security event.
        
        Args:
            event_type: Type of security event
            level: Severity level
            source: Source component/module
            message: Human-readable message
            details: Additional event details
            user: User identifier (if applicable)
            ip_address: IP address (if applicable)
        """
        # Create security event
        event = SecurityEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_type=event_type,
            level=level,
            source=source,
            message=message,
            details=self._sanitize_for_audit(details or {}),
            user=user,
            session_id=self.session_id,
            ip_address=ip_address,
            process_id=os.getpid()
        )
        
        # Convert to JSON for structured logging
        event_json = json.dumps(asdict(event), default=str)
        
        # Log to file
        if level == SecurityLevel.CRITICAL:
            self.logger.critical(event_json)
        elif level == SecurityLevel.ERROR:
            self.logger.error(event_json)
        elif level == SecurityLevel.WARNING:
            self.logger.warning(event_json)
        else:
            self.logger.info(event_json)
        
        # Update counters
        counter_key = f"{event_type.value}:{level.value}"
        self.event_counters[counter_key] = self.event_counters.get(counter_key, 0) + 1
        
        # Alert on critical events
        if level == SecurityLevel.CRITICAL:
            self._handle_critical_event(event)
    
    def _handle_critical_event(self, event: SecurityEvent):
        """Handle critical security events."""
        # Write immediate alert file
        alert_file = self.audit_dir / "critical_alerts.log"
        with open(alert_file, 'a') as f:
            f.write(f"{event.timestamp}: {event.message}\n")
        
        # Could add additional alerting mechanisms here
        # (email, webhook, etc.)
    
    def log_validation_failure(self, input_type: str, value: str, reason: str,
                              source: str = "validation"):
        """Log validation failure event."""
        self.log_event(
            SecurityEventType.VALIDATION_FAILURE,
            SecurityLevel.WARNING,
            source,
            f"Validation failed for {input_type}: {reason}",
            {
                "input_type": input_type,
                "value_preview": value[:50] if len(value) > 50 else value,
                "reason": reason
            }
        )
    
    def log_suspicious_activity(self, activity: str, details: Dict[str, Any],
                               level: SecurityLevel = SecurityLevel.WARNING):
        """Log suspicious activity."""
        self.log_event(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            level,
            "security_monitor",
            f"Suspicious activity detected: {activity}",
            details
        )
    
    def log_file_access(self, file_path: str, operation: str, success: bool,
                       user: Optional[str] = None):
        """Log file access event."""
        level = SecurityLevel.INFO if success else SecurityLevel.WARNING
        self.log_event(
            SecurityEventType.FILE_ACCESS,
            level,
            "file_system",
            f"File {operation}: {file_path} ({'success' if success else 'failed'})",
            {
                "file_path": file_path,
                "operation": operation,
                "success": success
            },
            user=user
        )
    
    def log_command_execution(self, command: str, success: bool, output: str = "",
                             user: Optional[str] = None):
        """Log command execution event."""
        level = SecurityLevel.INFO if success else SecurityLevel.ERROR
        self.log_event(
            SecurityEventType.COMMAND_EXECUTION,
            level,
            "command_executor",
            f"Command executed: {command} ({'success' if success else 'failed'})",
            {
                "command": command,
                "success": success,
                "output_preview": output[:200] if output else ""
            },
            user=user
        )
    
    def log_rate_limit_exceeded(self, identifier: str, attempts: int,
                               lockout_duration: int):
        """Log rate limit exceeded event."""
        self.log_event(
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            SecurityLevel.WARNING,
            "rate_limiter",
            f"Rate limit exceeded for {identifier}",
            {
                "identifier": identifier,
                "attempts": attempts,
                "lockout_duration": lockout_duration
            }
        )
    
    def log_integrity_check(self, file_path: str, expected_hash: str,
                           actual_hash: str, success: bool):
        """Log file integrity check event."""
        level = SecurityLevel.INFO if success else SecurityLevel.ERROR
        self.log_event(
            SecurityEventType.INTEGRITY_CHECK,
            level,
            "integrity_checker",
            f"Integrity check for {file_path} ({'passed' if success else 'failed'})",
            {
                "file_path": file_path,
                "expected_hash": expected_hash[:16] + "...",  # Truncate for logging
                "actual_hash": actual_hash[:16] + "..." if actual_hash else None,
                "match": success
            }
        )
    
    def generate_security_report(self, hours: int = 24) -> Dict[str, Any]:
        """Generate security report for the last N hours.
        
        Args:
            hours: Number of hours to include in report
            
        Returns:
            Security report data
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        cutoff_iso = cutoff_time.isoformat()
        
        # Read and parse log entries
        events = []
        log_file = self.audit_dir / "security_audit.log"
        
        if log_file.exists():
            try:
                with open(log_file, 'r') as f:
                    for line in f:
                        try:
                            event_data = json.loads(line.strip())
                            if event_data.get('timestamp', '') >= cutoff_iso:
                                events.append(event_data)
                        except json.JSONDecodeError:
                            continue
            except Exception:
                pass
        
        # Analyze events
        analysis = {
            "report_period_hours": hours,
            "total_events": len(events),
            "events_by_type": {},
            "events_by_level": {},
            "top_sources": {},
            "suspicious_patterns": [],
            "critical_events": [],
            "recommendations": []
        }
        
        for event in events:
            # Count by type
            event_type = event.get('event_type', 'unknown')
            analysis["events_by_type"][event_type] = analysis["events_by_type"].get(event_type, 0) + 1
            
            # Count by level
            level = event.get('level', 'unknown')
            analysis["events_by_level"][level] = analysis["events_by_level"].get(level, 0) + 1
            
            # Count by source
            source = event.get('source', 'unknown')
            analysis["top_sources"][source] = analysis["top_sources"].get(source, 0) + 1
            
            # Collect critical events
            if level == 'critical':
                analysis["critical_events"].append({
                    "timestamp": event.get('timestamp'),
                    "message": event.get('message'),
                    "source": source
                })
        
        # Detect suspicious patterns
        if analysis["events_by_level"].get("warning", 0) > 10:
            analysis["suspicious_patterns"].append("High number of warning events")
        
        if analysis["events_by_type"].get("validation_failure", 0) > 20:
            analysis["suspicious_patterns"].append("Excessive validation failures - possible attack")
        
        if analysis["events_by_type"].get("rate_limit_exceeded", 0) > 5:
            analysis["suspicious_patterns"].append("Multiple rate limit violations")
        
        # Generate recommendations
        if len(analysis["critical_events"]) > 0:
            analysis["recommendations"].append("Review critical events immediately")
        
        if len(analysis["suspicious_patterns"]) > 0:
            analysis["recommendations"].append("Investigate suspicious activity patterns")
        
        return analysis
    
    def get_audit_statistics(self) -> Dict[str, Any]:
        """Get audit system statistics."""
        log_file = self.audit_dir / "security_audit.log"
        
        stats = {
            "audit_dir": str(self.audit_dir),
            "log_file_exists": log_file.exists(),
            "log_file_size": log_file.stat().st_size if log_file.exists() else 0,
            "session_id": self.session_id,
            "event_counters": dict(self.event_counters)
        }
        
        return stats


# Global audit logger instance
_audit_logger: Optional[SecurityAuditLogger] = None


def get_audit_logger() -> SecurityAuditLogger:
    """Get global audit logger instance."""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = SecurityAuditLogger()
    return _audit_logger


def log_security_event(event_type: SecurityEventType, level: SecurityLevel,
                      source: str, message: str, details: Optional[Dict[str, Any]] = None):
    """Convenience function to log security events."""
    logger = get_audit_logger()
    logger.log_event(event_type, level, source, message, details)


if __name__ == "__main__":
    # Test security audit system
    print("Testing Security Audit System...")
    
    logger = SecurityAuditLogger()
    
    # Test various event types
    logger.log_validation_failure("path", "/etc/passwd", "Path traversal attempt")
    logger.log_suspicious_activity("Multiple failed attempts", {"attempts": 10})
    logger.log_file_access("/tmp/test.txt", "read", True)
    logger.log_command_execution("ls -la", True, "total 8\n-rw-r--r-- 1 user user 0 ...")
    
    # Generate report
    report = logger.generate_security_report(24)
    print(f"Security report: {json.dumps(report, indent=2)}")
    
    # Show statistics
    stats = logger.get_audit_statistics()
    print(f"Audit statistics: {json.dumps(stats, indent=2)}")
    
    print("Security audit system test complete!")