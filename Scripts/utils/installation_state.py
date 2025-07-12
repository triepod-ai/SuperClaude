#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Installation State Management

Tracks installation progress and provides rollback capabilities
for failed installations.
"""

import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from copy import deepcopy

try:
    from .logger import SuperClaudeLogger, LogLevel
    logger = SuperClaudeLogger("superclaude.installation_state")
except ImportError:
    # Fallback logger
    class FallbackLogger:
        def info(self, msg): print(f"[INFO] {msg}")
        def error(self, msg): print(f"[ERROR] {msg}")
        def warning(self, msg): print(f"[WARNING] {msg}")
        def success(self, msg): print(f"[SUCCESS] {msg}")
        def debug(self, msg): pass
    logger = FallbackLogger()


class InstallationPhase(Enum):
    """Installation phases for tracking progress."""
    INIT = "initialization"
    PREREQUISITES = "prerequisites_check"
    BACKUP = "backup_creation"
    DIRECTORIES = "directory_creation"
    CORE_FILES = "core_files_installation"
    SETTINGS = "settings_configuration"
    HOOKS = "hooks_installation"
    COMMANDS = "commands_installation"
    MCP = "mcp_configuration"
    PERMISSIONS = "permissions_setup"
    VALIDATION = "post_install_validation"
    COMPLETE = "installation_complete"


class ComponentState(Enum):
    """State of individual installation components."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class InstallationStateManager:
    """Manages installation state and rollback operations."""
    
    def __init__(self, claude_dir: Path, project_dir: Path):
        """Initialize state manager.
        
        Args:
            claude_dir: Claude global directory (~/.claude)
            project_dir: SuperClaude project directory
        """
        self.claude_dir = claude_dir
        self.project_dir = project_dir
        self.state_file = claude_dir / ".installation_state.json"
        self.backup_dir = claude_dir / "backup" / f"install_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Load or initialize state
        self.state = self._load_state()
        
    def _load_state(self) -> Dict[str, Any]:
        """Load existing installation state or create new."""
        if self.state_file.exists():
            try:
                with open(self.state_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not load state file: {e}")
        
        # Create new state
        return {
            "installation_id": datetime.now().isoformat(),
            "start_time": datetime.now().isoformat(),
            "components": {},
            "phases": {},
            "rollback_actions": [],
            "created_files": [],
            "created_directories": [],
            "modified_files": [],
            "backup_location": str(self.backup_dir)
        }
    
    def save_state(self):
        """Save current state to file."""
        try:
            self.state_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
            logger.debug(f"State saved to {self.state_file}")
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
    
    def start_phase(self, phase: InstallationPhase):
        """Mark a phase as started."""
        self.state["phases"][phase.value] = {
            "status": ComponentState.IN_PROGRESS.value,
            "start_time": datetime.now().isoformat()
        }
        self.save_state()
        logger.info(f"Started phase: {phase.value}")
    
    def complete_phase(self, phase: InstallationPhase):
        """Mark a phase as completed."""
        if phase.value in self.state["phases"]:
            self.state["phases"][phase.value].update({
                "status": ComponentState.COMPLETED.value,
                "end_time": datetime.now().isoformat()
            })
            self.save_state()
            logger.success(f"Completed phase: {phase.value}")
    
    def fail_phase(self, phase: InstallationPhase, error: str):
        """Mark a phase as failed."""
        if phase.value in self.state["phases"]:
            self.state["phases"][phase.value].update({
                "status": ComponentState.FAILED.value,
                "end_time": datetime.now().isoformat(),
                "error": error
            })
            self.save_state()
            logger.error(f"Failed phase: {phase.value} - {error}")
    
    def track_component(self, component: str, status: ComponentState, details: Optional[Dict] = None):
        """Track individual component installation status."""
        self.state["components"][component] = {
            "status": status.value,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.save_state()
    
    def add_file_created(self, file_path: Path):
        """Track a file that was created during installation."""
        if str(file_path) not in self.state["created_files"]:
            self.state["created_files"].append(str(file_path))
            self.save_state()
            logger.debug(f"Tracked created file: {file_path}")
    
    def add_directory_created(self, dir_path: Path):
        """Track a directory that was created during installation."""
        if str(dir_path) not in self.state["created_directories"]:
            self.state["created_directories"].append(str(dir_path))
            self.save_state()
            logger.debug(f"Tracked created directory: {dir_path}")
    
    def add_file_modified(self, file_path: Path, backup_path: Optional[Path] = None):
        """Track a file that was modified during installation."""
        mod_info = {
            "path": str(file_path),
            "backup": str(backup_path) if backup_path else None,
            "timestamp": datetime.now().isoformat()
        }
        self.state["modified_files"].append(mod_info)
        self.save_state()
        logger.debug(f"Tracked modified file: {file_path}")
    
    def add_rollback_action(self, action: str, details: Dict[str, Any]):
        """Add a rollback action to the queue."""
        self.state["rollback_actions"].append({
            "action": action,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        self.save_state()
    
    def create_backup(self, file_path: Path) -> Optional[Path]:
        """Create a backup of a file before modification.
        
        Args:
            file_path: File to backup
            
        Returns:
            Path to backup file or None if failed
        """
        try:
            if not file_path.exists():
                return None
            
            # Create backup directory
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Create backup with preserved structure
            relative_path = file_path.relative_to(Path.home()) if file_path.is_relative_to(Path.home()) else file_path.name
            backup_path = self.backup_dir / relative_path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file
            shutil.copy2(file_path, backup_path)
            logger.debug(f"Created backup: {file_path} -> {backup_path}")
            
            return backup_path
            
        except Exception as e:
            logger.error(f"Failed to create backup for {file_path}: {e}")
            return None
    
    def rollback(self) -> bool:
        """Perform rollback of the installation.
        
        Returns:
            True if rollback succeeded, False otherwise
        """
        logger.warning("Starting installation rollback...")
        success = True
        
        try:
            # Process rollback actions in reverse order
            for action_info in reversed(self.state["rollback_actions"]):
                action = action_info["action"]
                details = action_info["details"]
                
                try:
                    if action == "delete_file":
                        self._rollback_delete_file(Path(details["path"]))
                    elif action == "delete_directory":
                        self._rollback_delete_directory(Path(details["path"]))
                    elif action == "restore_file":
                        self._rollback_restore_file(
                            Path(details["original"]),
                            Path(details["backup"])
                        )
                    else:
                        logger.warning(f"Unknown rollback action: {action}")
                except Exception as e:
                    logger.error(f"Rollback action failed: {action} - {e}")
                    success = False
            
            # Remove created files
            for file_path in reversed(self.state["created_files"]):
                try:
                    path = Path(file_path)
                    if path.exists():
                        path.unlink()
                        logger.info(f"Removed created file: {path}")
                except Exception as e:
                    logger.error(f"Failed to remove file {file_path}: {e}")
                    success = False
            
            # Remove created directories (in reverse order to handle nested dirs)
            for dir_path in reversed(self.state["created_directories"]):
                try:
                    path = Path(dir_path)
                    if path.exists() and not any(path.iterdir()):
                        path.rmdir()
                        logger.info(f"Removed created directory: {path}")
                except Exception as e:
                    logger.error(f"Failed to remove directory {dir_path}: {e}")
                    success = False
            
            # Restore modified files
            for mod_info in self.state["modified_files"]:
                if mod_info["backup"]:
                    try:
                        backup_path = Path(mod_info["backup"])
                        original_path = Path(mod_info["path"])
                        if backup_path.exists():
                            shutil.copy2(backup_path, original_path)
                            logger.info(f"Restored file: {original_path}")
                    except Exception as e:
                        logger.error(f"Failed to restore {mod_info['path']}: {e}")
                        success = False
            
            # Update state
            self.state["rollback_completed"] = datetime.now().isoformat()
            self.save_state()
            
            if success:
                logger.success("Rollback completed successfully")
            else:
                logger.warning("Rollback completed with errors")
            
            return success
            
        except Exception as e:
            logger.error(f"Critical error during rollback: {e}")
            return False
    
    def _rollback_delete_file(self, file_path: Path):
        """Rollback action: delete a file."""
        if file_path.exists():
            file_path.unlink()
            logger.debug(f"Deleted file: {file_path}")
    
    def _rollback_delete_directory(self, dir_path: Path):
        """Rollback action: delete a directory."""
        if dir_path.exists() and not any(dir_path.iterdir()):
            dir_path.rmdir()
            logger.debug(f"Deleted directory: {dir_path}")
    
    def _rollback_restore_file(self, original_path: Path, backup_path: Path):
        """Rollback action: restore a file from backup."""
        if backup_path.exists():
            shutil.copy2(backup_path, original_path)
            logger.debug(f"Restored file: {original_path}")
    
    def cleanup(self):
        """Clean up installation state after successful completion."""
        try:
            # Remove state file
            if self.state_file.exists():
                self.state_file.unlink()
            
            # Optionally remove backup directory if installation succeeded
            # (keeping backups might be useful for recovery)
            logger.info("Installation state cleaned up")
            
        except Exception as e:
            logger.warning(f"Failed to cleanup state: {e}")
    
    def get_installation_summary(self) -> Dict[str, Any]:
        """Get a summary of the installation progress."""
        completed_phases = [p for p, info in self.state["phases"].items() 
                          if info["status"] == ComponentState.COMPLETED.value]
        failed_phases = [p for p, info in self.state["phases"].items() 
                        if info["status"] == ComponentState.FAILED.value]
        
        return {
            "installation_id": self.state["installation_id"],
            "start_time": self.state["start_time"],
            "completed_phases": completed_phases,
            "failed_phases": failed_phases,
            "created_files": len(self.state["created_files"]),
            "created_directories": len(self.state["created_directories"]),
            "modified_files": len(self.state["modified_files"]),
            "backup_location": self.state["backup_location"]
        }