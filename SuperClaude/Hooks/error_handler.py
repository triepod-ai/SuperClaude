#!/usr/bin/env python3
"""
Error Handler for Wave System
Comprehensive error handling and recovery mechanisms
"""

import json
import os
import sys
import time
import traceback
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
import fcntl
import tempfile
import shutil
import signal
from contextlib import contextmanager
from functools import wraps

class WaveSystemError(Exception):
    """Base exception for wave system errors"""
    pass

class WaveContextError(WaveSystemError):
    """Error in wave context operations"""
    pass

class WaveCoordinationError(WaveSystemError):
    """Error in wave coordination"""
    pass

class WaveTimeoutError(WaveSystemError):
    """Error due to timeout"""
    pass

class WaveFileError(WaveSystemError):
    """Error in file operations"""
    pass

class ErrorRecoverySystem:
    """Comprehensive error recovery system for wave operations"""
    
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.context_file = base_path / "wave_context.json"
        self.backup_dir = base_path / "backups"
        self.error_log = base_path / "error.log"
        self.timeout = 60  # seconds
        
        # Ensure backup directory exists
        self.backup_dir.mkdir(exist_ok=True)
        
        # Setup logging
        self.setup_logging()
        
        # Recovery strategies
        self.recovery_strategies = {
            'corrupted_context': self._recover_corrupted_context,
            'file_lock_timeout': self._recover_file_lock_timeout,
            'json_parse_error': self._recover_json_parse_error,
            'missing_file': self._recover_missing_file,
            'permission_error': self._recover_permission_error,
            'timeout_error': self._recover_timeout_error,
            'memory_error': self._recover_memory_error,
            'concurrent_access': self._recover_concurrent_access
        }
    
    def setup_logging(self):
        """Setup error logging"""
        logging.basicConfig(
            filename=self.error_log,
            level=logging.ERROR,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger('WaveErrorRecovery')
    
    def log_error(self, error_type: str, message: str, context: Dict[str, Any] = None):
        """Log error with context"""
        error_entry = {
            'timestamp': time.time(),
            'error_type': error_type,
            'message': message,
            'context': context or {},
            'traceback': traceback.format_exc()
        }
        
        self.logger.error(json.dumps(error_entry))
        
        # Also log to stderr for immediate visibility
        print(f"[ERROR] {error_type}: {message}", file=sys.stderr)
    
    def create_backup(self, suffix: str = "") -> Optional[Path]:
        """Create backup of current context"""
        try:
            if not self.context_file.exists():
                return None
            
            timestamp = int(time.time())
            backup_name = f"wave_context_{timestamp}{suffix}.json"
            backup_path = self.backup_dir / backup_name
            
            shutil.copy2(self.context_file, backup_path)
            return backup_path
        except Exception as e:
            self.log_error("backup_creation", f"Failed to create backup: {e}")
            return None
    
    def restore_from_backup(self, backup_path: Path = None) -> bool:
        """Restore context from backup"""
        try:
            if backup_path is None:
                # Find latest backup
                backup_files = list(self.backup_dir.glob("wave_context_*.json"))
                if not backup_files:
                    return False
                backup_path = max(backup_files, key=lambda p: p.stat().st_mtime)
            
            if backup_path.exists():
                shutil.copy2(backup_path, self.context_file)
                return True
            return False
        except Exception as e:
            self.log_error("backup_restoration", f"Failed to restore from backup: {e}")
            return False
    
    def _recover_corrupted_context(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from corrupted context file"""
        self.log_error("corrupted_context", "Attempting to recover from corrupted context")
        
        # Try to restore from backup
        if self.restore_from_backup():
            try:
                with open(self.context_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        
        # If backup restoration fails, create new context
        return self._create_emergency_context()
    
    def _recover_file_lock_timeout(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from file lock timeout"""
        self.log_error("file_lock_timeout", "File lock timeout detected")
        
        # Wait a bit and try again
        time.sleep(0.1)
        
        try:
            with open(self.context_file, 'r') as f:
                return json.load(f)
        except Exception:
            return self._create_emergency_context()
    
    def _recover_json_parse_error(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from JSON parse error"""
        self.log_error("json_parse_error", "JSON parse error detected")
        
        # Create backup of corrupted file
        self.create_backup("_corrupted")
        
        # Try to restore from backup
        if self.restore_from_backup():
            try:
                with open(self.context_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        
        # Create new context
        return self._create_emergency_context()
    
    def _recover_missing_file(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from missing file"""
        self.log_error("missing_file", "Context file missing")
        
        # Try to restore from backup
        if self.restore_from_backup():
            try:
                with open(self.context_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        
        # Create new context
        return self._create_emergency_context()
    
    def _recover_permission_error(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from permission error"""
        self.log_error("permission_error", "Permission error detected")
        
        # Try to fix permissions
        try:
            os.chmod(self.context_file, 0o644)
            with open(self.context_file, 'r') as f:
                return json.load(f)
        except Exception:
            pass
        
        # Create new context in temp location
        return self._create_emergency_context()
    
    def _recover_timeout_error(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from timeout error"""
        self.log_error("timeout_error", "Timeout error detected")
        
        # Return last known good state or create emergency context
        return self._create_emergency_context()
    
    def _recover_memory_error(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from memory error"""
        self.log_error("memory_error", "Memory error detected")
        
        # Create minimal context to reduce memory usage
        return self._create_minimal_context()
    
    def _recover_concurrent_access(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from concurrent access issues"""
        self.log_error("concurrent_access", "Concurrent access issue detected")
        
        # Wait and retry
        time.sleep(0.05)
        
        try:
            with open(self.context_file, 'r') as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                return json.load(f)
        except Exception:
            return self._create_emergency_context()
    
    def _create_emergency_context(self) -> Dict[str, Any]:
        """Create emergency context when recovery fails"""
        emergency_context = {
            "current_wave": 1,
            "wave_1": {"agents": {}, "synthesis": {}},
            "wave_2": {"agents": {}, "synthesis": {}},
            "wave_3": {"agents": {}, "synthesis": {}},
            "compound_intelligence": "",
            "meta": {
                "start_time": time.time(),
                "operation": "emergency_recovery",
                "last_update": time.time(),
                "recovery_mode": True
            }
        }
        
        # Try to save emergency context
        try:
            with tempfile.NamedTemporaryFile(mode='w', dir=self.base_path, delete=False) as temp:
                json.dump(emergency_context, temp, indent=2)
                temp_path = temp.name
            
            shutil.move(temp_path, self.context_file)
        except Exception as e:
            self.log_error("emergency_context_save", f"Failed to save emergency context: {e}")
        
        return emergency_context
    
    def _create_minimal_context(self) -> Dict[str, Any]:
        """Create minimal context for memory-constrained situations"""
        minimal_context = {
            "current_wave": 1,
            "wave_1": {"agents": {}, "synthesis": {}},
            "compound_intelligence": "",
            "meta": {
                "start_time": time.time(),
                "operation": "minimal_recovery",
                "last_update": time.time(),
                "minimal_mode": True
            }
        }
        
        return minimal_context
    
    def handle_error(self, error_type: str, error: Exception, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Main error handling entry point"""
        error_context = {
            'error_type': error_type,
            'error_message': str(error),
            'context': context or {}
        }
        
        # Log the error
        self.log_error(error_type, str(error), error_context)
        
        # Create backup before attempting recovery
        self.create_backup(f"_before_{error_type}")
        
        # Apply recovery strategy
        if error_type in self.recovery_strategies:
            try:
                return self.recovery_strategies[error_type](error_context)
            except Exception as recovery_error:
                self.log_error("recovery_failure", f"Recovery failed for {error_type}: {recovery_error}")
                return self._create_emergency_context()
        else:
            self.log_error("unknown_error", f"Unknown error type: {error_type}")
            return self._create_emergency_context()
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on wave system"""
        health_status = {
            "timestamp": time.time(),
            "context_file_exists": self.context_file.exists(),
            "context_file_readable": False,
            "context_file_writable": False,
            "backup_count": 0,
            "errors": [],
            "warnings": []
        }
        
        # Check context file
        if health_status["context_file_exists"]:
            try:
                with open(self.context_file, 'r') as f:
                    json.load(f)
                health_status["context_file_readable"] = True
            except Exception as e:
                health_status["errors"].append(f"Context file not readable: {e}")
            
            try:
                # Test write access
                test_data = {"test": True}
                with tempfile.NamedTemporaryFile(mode='w', dir=self.base_path, delete=True) as temp:
                    json.dump(test_data, temp)
                health_status["context_file_writable"] = True
            except Exception as e:
                health_status["errors"].append(f"Context file not writable: {e}")
        
        # Check backups
        if self.backup_dir.exists():
            backup_files = list(self.backup_dir.glob("wave_context_*.json"))
            health_status["backup_count"] = len(backup_files)
            
            if health_status["backup_count"] == 0:
                health_status["warnings"].append("No backups available")
        
        # Check permissions
        try:
            os.access(self.base_path, os.R_OK | os.W_OK)
        except Exception as e:
            health_status["errors"].append(f"Permission issues: {e}")
        
        return health_status
    
    def cleanup_old_backups(self, max_backups: int = 10):
        """Clean up old backup files"""
        try:
            backup_files = list(self.backup_dir.glob("wave_context_*.json"))
            if len(backup_files) > max_backups:
                # Sort by modification time, oldest first
                backup_files.sort(key=lambda p: p.stat().st_mtime)
                
                # Remove oldest backups
                for backup_file in backup_files[:-max_backups]:
                    backup_file.unlink()
                    
        except Exception as e:
            self.log_error("backup_cleanup", f"Failed to cleanup backups: {e}")


def with_error_recovery(error_handler: ErrorRecoverySystem):
    """Decorator for adding error recovery to functions"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except json.JSONDecodeError as e:
                return error_handler.handle_error("json_parse_error", e)
            except FileNotFoundError as e:
                return error_handler.handle_error("missing_file", e)
            except PermissionError as e:
                return error_handler.handle_error("permission_error", e)
            except TimeoutError as e:
                return error_handler.handle_error("timeout_error", e)
            except MemoryError as e:
                return error_handler.handle_error("memory_error", e)
            except Exception as e:
                return error_handler.handle_error("general_error", e)
        return wrapper
    return decorator


@contextmanager
def timeout_context(seconds: int):
    """Context manager for timeout handling"""
    def timeout_handler(signum, frame):
        raise WaveTimeoutError(f"Operation timed out after {seconds} seconds")
    
    # Set up signal handler
    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    
    try:
        yield
    finally:
        # Reset signal handler
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


class GracefulDegradation:
    """Graceful degradation system for wave operations"""
    
    def __init__(self):
        self.degradation_levels = {
            'level_1': {
                'name': 'Minor Constraints',
                'actions': [
                    'reduce_output_verbosity',
                    'skip_optional_enhancements',
                    'use_cached_results'
                ]
            },
            'level_2': {
                'name': 'Moderate Constraints',
                'actions': [
                    'disable_advanced_features',
                    'simplify_operations',
                    'batch_more_aggressively'
                ]
            },
            'level_3': {
                'name': 'Severe Constraints',
                'actions': [
                    'essential_operations_only',
                    'maximum_compression',
                    'queue_non_critical'
                ]
            }
        }
    
    def assess_degradation_level(self, error_context: Dict[str, Any]) -> str:
        """Assess required degradation level"""
        error_type = error_context.get('error_type', '')
        
        if error_type in ['memory_error', 'timeout_error']:
            return 'level_3'
        elif error_type in ['file_lock_timeout', 'concurrent_access']:
            return 'level_2'
        else:
            return 'level_1'
    
    def apply_degradation(self, level: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply degradation measures"""
        if level in self.degradation_levels:
            degradation_info = self.degradation_levels[level]
            
            # Add degradation metadata
            context['meta'] = context.get('meta', {})
            context['meta']['degradation_level'] = level
            context['meta']['degradation_actions'] = degradation_info['actions']
            context['meta']['degradation_applied'] = time.time()
            
            # Apply specific degradation measures
            if 'maximum_compression' in degradation_info['actions']:
                context = self._apply_compression(context)
            
            if 'essential_operations_only' in degradation_info['actions']:
                context = self._limit_to_essentials(context)
        
        return context
    
    def _apply_compression(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply compression to reduce memory usage"""
        # Compress compound intelligence
        if 'compound_intelligence' in context:
            intelligence = context['compound_intelligence']
            if len(intelligence) > 1000:
                context['compound_intelligence'] = intelligence[:500] + "...[COMPRESSED]..." + intelligence[-500:]
        
        # Compress agent results
        for wave_key in ['wave_1', 'wave_2', 'wave_3']:
            if wave_key in context and 'agents' in context[wave_key]:
                for agent_type, agent_data in context[wave_key]['agents'].items():
                    if 'results' in agent_data:
                        results = agent_data['results']
                        if isinstance(results, dict):
                            for key, value in results.items():
                                if isinstance(value, str) and len(value) > 200:
                                    results[key] = value[:100] + "...[COMPRESSED]..." + value[-100:]
        
        return context
    
    def _limit_to_essentials(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Limit context to essential information only"""
        essential_context = {
            'current_wave': context.get('current_wave', 1),
            'compound_intelligence': context.get('compound_intelligence', ''),
            'meta': context.get('meta', {})
        }
        
        # Keep only current wave data
        current_wave = context.get('current_wave', 1)
        wave_key = f'wave_{current_wave}'
        if wave_key in context:
            essential_context[wave_key] = context[wave_key]
        
        return essential_context


class ErrorHookHandler:
    """Claude Code hook event handler for error management"""
    
    def __init__(self):
        self.error_recovery = ErrorRecoverySystem(Path.cwd())
        self.degradation = GracefulDegradation()
        
    def handle_pretool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PreToolUse hook event for error prevention"""
        try:
            # Check system health before tool execution
            health_status = self.error_recovery.health_check()
            
            # Apply degradation if needed
            if health_status['errors']:
                degradation_level = self.degradation.assess_degradation_level({
                    'error_type': 'pre_execution_health_check',
                    'errors': health_status['errors']
                })
                
                return {
                    "continue": True,
                    "error_prevention": True,
                    "health_status": health_status,
                    "degradation_level": degradation_level,
                    "warnings": health_status.get('warnings', [])
                }
            
            return {
                "continue": True,
                "error_prevention": True,
                "health_status": "healthy",
                "degradation_level": None
            }
            
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "error_prevention": False
            }
    
    def handle_post_tool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PostToolUse hook event for error analysis"""
        try:
            # Extract tool execution information
            tool_call = hook_data.get('tool_call', {})
            tool_result = hook_data.get('result', {})
            
            # Check if tool execution had errors
            execution_errors = []
            if 'error' in tool_result:
                execution_errors.append(tool_result['error'])
            
            # Analyze errors and apply recovery if needed
            if execution_errors:
                recovery_applied = False
                for error in execution_errors:
                    # Apply error recovery
                    recovery_result = self.error_recovery.handle_error(
                        'tool_execution_error',
                        Exception(error),
                        {'tool_name': tool_call.get('name', '')}
                    )
                    recovery_applied = True
                
                return {
                    "continue": True,
                    "error_analysis": True,
                    "errors_detected": len(execution_errors),
                    "recovery_applied": recovery_applied,
                    "health_check": self.error_recovery.health_check()
                }
            
            return {
                "continue": True,
                "error_analysis": True,
                "errors_detected": 0,
                "recovery_applied": False
            }
            
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "error_analysis": False
            }
    
    def handle_subagent_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle SubagentStop hook event for error tracking"""
        try:
            # Extract agent information
            agent_info = hook_data.get('agent_info', {})
            agent_result = hook_data.get('result', {})
            
            # Check agent execution for errors
            agent_errors = []
            if 'error' in agent_result:
                agent_errors.append(agent_result['error'])
            
            # Update error tracking
            if agent_errors:
                for error in agent_errors:
                    self.error_recovery.log_error(
                        'agent_execution_error',
                        error,
                        {'agent_name': agent_info.get('name', '')}
                    )
            
            # Perform health check
            health_status = self.error_recovery.health_check()
            
            return {
                "continue": True,
                "error_tracking": True,
                "agent_errors": len(agent_errors),
                "health_status": health_status,
                "backup_count": health_status.get('backup_count', 0)
            }
            
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "error_tracking": False
            }
    
    def handle_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Stop hook event for final error reporting"""
        try:
            # Extract stop information
            stop_reason = hook_data.get('reason', 'normal_shutdown')
            
            # Create final backup
            final_backup = self.error_recovery.create_backup('_final_shutdown')
            
            # Generate final health report
            final_health = self.error_recovery.health_check()
            
            # Cleanup old backups
            self.error_recovery.cleanup_old_backups()
            
            return {
                "continue": True,
                "graceful_shutdown": True,
                "stop_reason": stop_reason,
                "final_backup": str(final_backup) if final_backup else None,
                "final_health": final_health,
                "cleanup_completed": True
            }
            
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "graceful_shutdown": False
            }


if __name__ == "__main__":
    import sys
    
    # Check for test mode via command line argument
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        # Test error recovery system
        test_dir = Path("test_recovery")
        test_dir.mkdir(exist_ok=True)
        
        error_handler = ErrorRecoverySystem(test_dir)
        
        # Test health check
        health = error_handler.health_check()
        print(f"Health check: {json.dumps(health, indent=2)}")
        
        # Test error handling
        try:
            raise json.JSONDecodeError("Test error", "test", 0)
        except json.JSONDecodeError as e:
            recovered_context = error_handler.handle_error("json_parse_error", e)
            print(f"Recovered context: {json.dumps(recovered_context, indent=2)}")
        
        # Cleanup
        shutil.rmtree(test_dir, ignore_errors=True)
        print("Error recovery system test completed")
        sys.exit(0)
    
    try:
        # Read JSON data from stdin (Claude Code hook interface)
        stdin_content = sys.stdin.read().strip()
        if not stdin_content:
            # Handle empty input gracefully - exit cleanly
            sys.exit(0)
        
        try:
            hook_data = json.loads(stdin_content)
        except json.JSONDecodeError as e:
            print(f"• Error Handler JSON Error: {str(e)}", file=sys.stderr)
            sys.exit(0)  # Non-blocking error
        
        # Extract event type from hook data
        event_type = hook_data.get('event_type', '')
        
        # Create hook handler
        handler = ErrorHookHandler()
        
        # Handle event based on type
        if event_type == 'PreToolUse':
            result = handler.handle_pretool_use(hook_data)
        elif event_type == 'PostToolUse':
            result = handler.handle_post_tool_use(hook_data)
        elif event_type == 'SubagentStop':
            result = handler.handle_subagent_stop(hook_data)
        elif event_type == 'Stop':
            result = handler.handle_stop(hook_data)
        else:
            # Handle legacy command-line interface for backward compatibility
            if len(sys.argv) > 2 and sys.argv[1] == '--event':
                event_type = sys.argv[2]
                if event_type == 'PreToolUse':
                    result = handler.handle_pretool_use(hook_data)
                elif event_type == 'PostToolUse':
                    result = handler.handle_post_tool_use(hook_data)
                elif event_type == 'SubagentStop':
                    result = handler.handle_subagent_stop(hook_data)
                elif event_type == 'Stop':
                    result = handler.handle_stop(hook_data)
                else:
                    result = {"error": f"Unknown event type: {event_type}"}
                    sys.exit(1)
            else:
                result = {"error": f"Unknown event type: {event_type}"}
                sys.exit(1)
        
        # Output result to stderr for logging (optional)
        if result.get('error'):
            print(f"• Error Handler Error: {result['error']}", file=sys.stderr)
        elif result.get('error_prevention'):
            print(f"• Error prevention checks completed", file=sys.stderr)
        elif result.get('error_analysis'):
            errors_detected = result.get('errors_detected', 0)
            if errors_detected > 0:
                print(f"• {errors_detected} errors detected and analyzed", file=sys.stderr)
        
        # Exit with appropriate code for Claude Code
        if result.get('error'):
            sys.exit(2)  # Block execution on error
        else:
            sys.exit(0)  # Continue execution
        
    except Exception as e:
        print(f"• Error Handler Critical Error: {str(e)}", file=sys.stderr)
        sys.exit(0)  # Non-blocking error - allow execution to continue