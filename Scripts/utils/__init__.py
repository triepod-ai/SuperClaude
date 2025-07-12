"""
SuperClaude Framework v3.0 - Utilities Package

Shared utilities for the SuperClaude installation system.
Provides efficient module loading and consistent interfaces.
"""

__version__ = "3.0.0"

# Lazy loading of common utilities to improve performance
def __getattr__(name):
    """Lazy loading of utility modules."""
    if name == "logger":
        from .logger import SuperClaudeLogger, LoggerMixin, get_logger
        return locals()
    elif name == "module_loader":
        from .module_loader import ModuleLoader, load_superclaude_module, get_installer_modules
        return locals()
    elif name == "installation_state":
        from .installation_state import InstallationStateManager, InstallationPhase, ComponentState
        return locals()
    elif name == "integration_validator":
        from .integration_validator import IntegrationValidator, InstallerComponent
        return locals()
    elif name == "colors":
        from .colors import Colors
        return Colors
    elif name == "validation":
        from .validation import SystemValidator
        return locals()
    elif name == "file_ops":
        from .file_ops import FileOperations
        return FileOperations
    elif name == "progress":
        from .progress import ProgressTracker
        return ProgressTracker
    elif name == "path_security":
        from .path_security import SecureInstaller, PathTraversalError
        return locals()
    else:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

# Pre-load critical modules for installer efficiency
try:
    from .module_loader import get_installer_modules
    _cached_modules = get_installer_modules()
except ImportError:
    _cached_modules = {}

# Export commonly used classes for easy importing
__all__ = [
    "logger", "module_loader", "installation_state", "integration_validator",
    "colors", "validation", "file_ops", "progress", "path_security",
    "get_installer_modules", "check_dependencies"
]

def check_dependencies():
    """Check if all required dependencies are available.
    
    Returns:
        Dictionary with availability status of each module
    """
    dependencies = {
        "colors": "colors.py",
        "progress": "progress.py", 
        "file_ops": "file_ops.py",
        "validation": "validation.py",
        "path_security": "path_security.py",
        "logger": "logger.py",
        "installation_state": "installation_state.py",
        "integration_validator": "integration_validator.py",
        "module_loader": "module_loader.py"
    }
    
    status = {}
    base_path = __file__.replace("__init__.py", "")
    
    for name, filename in dependencies.items():
        file_path = base_path + filename
        try:
            from pathlib import Path
            status[name] = Path(file_path).exists()
        except Exception:
            status[name] = False
    
    return status