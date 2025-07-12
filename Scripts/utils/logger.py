#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Centralized Logging Utilities

Provides consistent logging patterns across all installer components
with proper log levels and standardized formatting.
"""

import sys
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from enum import Enum

try:
    from colors import Colors
except ImportError:
    # Fallback color implementation
    class Colors:
        def info(self, msg): return f"\033[0;34m{msg}\033[0m"
        def success(self, msg): return f"\033[0;32m{msg}\033[0m"
        def warning(self, msg): return f"\033[1;33m{msg}\033[0m"
        def error(self, msg): return f"\033[0;31m{msg}\033[0m"
        def debug(self, msg): return f"\033[0;37m{msg}\033[0m"
        def header(self, msg): return f"\033[1;34m{msg}\033[0m"


class LogLevel(Enum):
    """Log levels for consistent logging."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    SUCCESS = "SUCCESS"


class SuperClaudeLogger:
    """Centralized logger for SuperClaude framework."""
    
    def __init__(self, name: str, log_file: Optional[Path] = None, 
                 console_level: LogLevel = LogLevel.INFO,
                 file_level: LogLevel = LogLevel.DEBUG):
        """Initialize logger with console and optional file output.
        
        Args:
            name: Logger name (usually module name)
            log_file: Optional log file path
            console_level: Minimum level for console output
            file_level: Minimum level for file output
        """
        self.name = name
        self.colors = Colors()
        self.console_level = console_level
        self.file_level = file_level
        
        # Configure Python logging
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # Remove existing handlers to avoid duplicates
        self.logger.handlers.clear()
        
        # Console handler with colored output
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self._get_python_level(console_level))
        console_handler.setFormatter(self._ColoredFormatter(self.colors))
        self.logger.addHandler(console_handler)
        
        # File handler if specified
        if log_file:
            try:
                log_file.parent.mkdir(parents=True, exist_ok=True)
                file_handler = logging.FileHandler(log_file)
                file_handler.setLevel(self._get_python_level(file_level))
                file_handler.setFormatter(logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                ))
                self.logger.addHandler(file_handler)
            except Exception as e:
                self.warning(f"Could not create log file {log_file}: {e}")
    
    def _get_python_level(self, level: LogLevel) -> int:
        """Convert LogLevel to Python logging level."""
        mapping = {
            LogLevel.DEBUG: logging.DEBUG,
            LogLevel.INFO: logging.INFO,
            LogLevel.WARNING: logging.WARNING,
            LogLevel.ERROR: logging.ERROR,
            LogLevel.CRITICAL: logging.CRITICAL,
            LogLevel.SUCCESS: logging.INFO  # Map SUCCESS to INFO
        }
        return mapping.get(level, logging.INFO)
    
    def debug(self, message: str, **kwargs):
        """Log debug message."""
        self._log(LogLevel.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message."""
        self._log(LogLevel.INFO, message, **kwargs)
    
    def success(self, message: str, **kwargs):
        """Log success message."""
        self._log(LogLevel.SUCCESS, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message."""
        self._log(LogLevel.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message."""
        self._log(LogLevel.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical error message."""
        self._log(LogLevel.CRITICAL, message, **kwargs)
    
    def _log(self, level: LogLevel, message: str, **kwargs):
        """Internal log method with consistent formatting."""
        # Add context to message if provided
        if kwargs:
            context = " | ".join(f"{k}={v}" for k, v in kwargs.items())
            message = f"{message} | {context}"
        
        # Route to appropriate Python logging level
        if level == LogLevel.SUCCESS:
            # Special handling for SUCCESS level
            self.logger.info(f"[✓] {message}")
        else:
            py_level = self._get_python_level(level)
            self.logger.log(py_level, message)
    
    class _ColoredFormatter(logging.Formatter):
        """Custom formatter for colored console output."""
        
        def __init__(self, colors: Colors):
            super().__init__()
            self.colors = colors
            
        def format(self, record):
            # Format the base message
            msg = record.getMessage()
            
            # Apply colors based on level
            if record.levelname == "DEBUG":
                prefix = "[DEBUG]"
                formatted = self.colors.debug(f"{prefix} {msg}")
            elif record.levelname == "INFO":
                if msg.startswith("[✓]"):
                    # Success message
                    formatted = self.colors.success(msg)
                else:
                    prefix = "[INFO]"
                    formatted = self.colors.info(f"{prefix} {msg}")
            elif record.levelname == "WARNING":
                prefix = "[!]"
                formatted = self.colors.warning(f"{prefix} {msg}")
            elif record.levelname == "ERROR":
                prefix = "[✗]"
                formatted = self.colors.error(f"{prefix} {msg}")
            elif record.levelname == "CRITICAL":
                prefix = "[!!!]"
                formatted = self.colors.error(f"{prefix} {msg}")
            else:
                formatted = msg
            
            return formatted


class LoggerMixin:
    """Mixin class to add logging capabilities to installer classes."""
    
    def __init__(self, *args, **kwargs):
        """Initialize mixin - must be called after base class init."""
        super().__init__(*args, **kwargs)
        
        # Get logger name from class
        logger_name = f"superclaude.{self.__class__.__name__}"
        
        # Check if log file should be created
        log_dir = getattr(self, 'claude_dir', Path.home() / ".claude") / "logs"
        log_file = log_dir / f"{self.__class__.__name__}.log"
        
        # Initialize logger
        self._logger = SuperClaudeLogger(
            name=logger_name,
            log_file=log_file,
            console_level=LogLevel.INFO,
            file_level=LogLevel.DEBUG
        )
    
    def log_debug(self, message: str, **kwargs):
        """Log debug message."""
        self._logger.debug(message, **kwargs)
    
    def log_info(self, message: str, **kwargs):
        """Log info message."""
        self._logger.info(message, **kwargs)
    
    def log_success(self, message: str, **kwargs):
        """Log success message."""
        self._logger.success(message, **kwargs)
    
    def log_warning(self, message: str, **kwargs):
        """Log warning message."""
        self._logger.warning(message, **kwargs)
    
    def log_error(self, message: str, **kwargs):
        """Log error message."""
        self._logger.error(message, **kwargs)
    
    def log_critical(self, message: str, **kwargs):
        """Log critical error message."""
        self._logger.critical(message, **kwargs)


# Module-level logger instance for standalone usage
module_logger = SuperClaudeLogger("superclaude.utils.logger")


def get_logger(name: str, log_file: Optional[Path] = None) -> SuperClaudeLogger:
    """Get a logger instance with the specified name.
    
    Args:
        name: Logger name
        log_file: Optional log file path
        
    Returns:
        SuperClaudeLogger instance
    """
    return SuperClaudeLogger(name, log_file)


def configure_logging(log_dir: Optional[Path] = None, 
                     console_level: LogLevel = LogLevel.INFO,
                     file_level: LogLevel = LogLevel.DEBUG):
    """Configure global logging settings.
    
    Args:
        log_dir: Directory for log files (default: ~/.claude/logs)
        console_level: Minimum level for console output
        file_level: Minimum level for file output
    """
    if log_dir is None:
        log_dir = Path.home() / ".claude" / "logs"
    
    # Ensure log directory exists
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        module_logger.warning(f"Could not create log directory {log_dir}: {e}")
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(module_logger._get_python_level(console_level))
    console_handler.setFormatter(SuperClaudeLogger._ColoredFormatter(Colors()))
    root_logger.addHandler(console_handler)
    
    # Add file handler for all SuperClaude logs
    try:
        log_file = log_dir / f"superclaude_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(module_logger._get_python_level(file_level))
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        root_logger.addHandler(file_handler)
    except Exception as e:
        module_logger.warning(f"Could not create global log file: {e}")