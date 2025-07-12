#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Module Loading Efficiency

Prevents multiple loading of same modules and implements module caching
for improved performance across installer components.
"""

import sys
import importlib
import importlib.util
from pathlib import Path
from typing import Dict, Any, Optional, Set
from functools import lru_cache

# Global module cache to prevent multiple loading
_module_cache: Dict[str, Any] = {}
_loading_modules: Set[str] = set()  # Track currently loading modules to prevent circular imports


class ModuleLoader:
    """Efficient module loader with caching and circular import detection."""
    
    def __init__(self, base_path: Optional[Path] = None):
        """Initialize module loader.
        
        Args:
            base_path: Base path for relative module imports
        """
        self.base_path = base_path or Path(__file__).parent
        
    @lru_cache(maxsize=128)
    def get_module_path(self, module_name: str) -> Optional[Path]:
        """Get the full path to a module file.
        
        Args:
            module_name: Name of the module to find
            
        Returns:
            Path to module file or None if not found
        """
        # Try different variations
        possible_paths = [
            self.base_path / f"{module_name}.py",
            self.base_path / module_name / "__init__.py",
            Path(__file__).parent / f"{module_name}.py",
            Path(__file__).parent / module_name / "__init__.py"
        ]
        
        for path in possible_paths:
            if path.exists():
                return path
        
        return None
    
    def load_module(self, module_name: str, force_reload: bool = False) -> Optional[Any]:
        """Load a module with caching and circular import detection.
        
        Args:
            module_name: Name of the module to load
            force_reload: Whether to force reload even if cached
            
        Returns:
            Loaded module or None if failed
        """
        cache_key = f"{self.base_path}:{module_name}"
        
        # Check cache first
        if not force_reload and cache_key in _module_cache:
            return _module_cache[cache_key]
        
        # Check for circular import
        if cache_key in _loading_modules:
            print(f"Warning: Circular import detected for {module_name}")
            return None
        
        # Mark as loading
        _loading_modules.add(cache_key)
        
        try:
            # Find module path
            module_path = self.get_module_path(module_name)
            if not module_path:
                return None
            
            # Load module
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            if spec is None or spec.loader is None:
                return None
            
            module = importlib.util.module_from_spec(spec)
            
            # Add to sys.modules before execution to handle circular imports
            sys.modules[module_name] = module
            
            # Execute module
            spec.loader.exec_module(module)
            
            # Cache the module
            _module_cache[cache_key] = module
            
            return module
            
        except Exception as e:
            print(f"Warning: Could not load module {module_name}: {e}")
            return None
        finally:
            # Remove from loading set
            _loading_modules.discard(cache_key)
    
    def load_multiple(self, module_names: list, required: Optional[list] = None) -> Dict[str, Any]:
        """Load multiple modules efficiently.
        
        Args:
            module_names: List of module names to load
            required: List of modules that must load (raises exception if failed)
            
        Returns:
            Dictionary of {module_name: module} for successfully loaded modules
        """
        required = required or []
        modules = {}
        
        for module_name in module_names:
            module = self.load_module(module_name)
            if module:
                modules[module_name] = module
            elif module_name in required:
                raise ImportError(f"Required module {module_name} could not be loaded")
        
        return modules
    
    def clear_cache(self):
        """Clear the module cache."""
        global _module_cache
        _module_cache.clear()
    
    def get_cache_info(self) -> Dict[str, Any]:
        """Get information about the module cache.
        
        Returns:
            Dictionary with cache statistics
        """
        return {
            "cached_modules": len(_module_cache),
            "cache_keys": list(_module_cache.keys()),
            "currently_loading": list(_loading_modules),
            "cache_hit_info": self.get_module_path.cache_info()._asdict()
        }


# Global module loader instance
_global_loader = ModuleLoader()


def load_superclaude_module(module_name: str, force_reload: bool = False) -> Optional[Any]:
    """Load a SuperClaude utility module with caching.
    
    Args:
        module_name: Name of the module (e.g., 'colors', 'validation')
        force_reload: Whether to force reload even if cached
        
    Returns:
        Loaded module or None if failed
    """
    return _global_loader.load_module(module_name, force_reload)


def load_installer_dependencies(required: Optional[list] = None) -> Dict[str, Any]:
    """Load common installer dependencies.
    
    Args:
        required: List of modules that must load successfully
        
    Returns:
        Dictionary of loaded modules
    """
    common_modules = [
        'colors',
        'progress',
        'file_ops',
        'validation',
        'path_security',
        'logger',
        'installation_state',
        'integration_validator'
    ]
    
    return _global_loader.load_multiple(common_modules, required)


class FallbackImporter:
    """Provides fallback implementations for failed imports."""
    
    @staticmethod
    def get_fallback_colors():
        """Get fallback Colors class."""
        class Colors:
            def info(self, msg): return f"\033[0;34m{msg}\033[0m"
            def success(self, msg): return f"\033[0;32m{msg}\033[0m"
            def warning(self, msg): return f"\033[1;33m{msg}\033[0m"
            def error(self, msg): return f"\033[0;31m{msg}\033[0m"
            def debug(self, msg): return f"\033[0;37m{msg}\033[0m"
            def header(self, msg): return f"\033[1;34m{msg}\033[0m"
        return Colors
    
    @staticmethod
    def get_fallback_logger():
        """Get fallback logger class."""
        class FallbackLogger:
            def info(self, msg, **kwargs): print(f"[INFO] {msg}")
            def success(self, msg, **kwargs): print(f"[SUCCESS] {msg}")
            def warning(self, msg, **kwargs): print(f"[WARNING] {msg}")
            def error(self, msg, **kwargs): print(f"[ERROR] {msg}")
            def debug(self, msg, **kwargs): pass
            def critical(self, msg, **kwargs): print(f"[CRITICAL] {msg}")
        return FallbackLogger
    
    @staticmethod
    def get_fallback_progress():
        """Get fallback progress tracker."""
        class ProgressTracker:
            def start(self, desc, total): pass
            def update(self, n, desc=""): pass
            def finish(self): pass
        return ProgressTracker
    
    @staticmethod
    def get_fallback_file_ops():
        """Get fallback file operations."""
        class FileOperations:
            def copy_file(self, src, dst):
                try:
                    import shutil
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)
                    return True
                except Exception as e:
                    print(f"Error copying {src} to {dst}: {e}")
                    return False
                    
            def create_symlink(self, src, dst):
                try:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    if dst.exists() or dst.is_symlink():
                        dst.unlink()
                    dst.symlink_to(src)
                    return True
                except Exception as e:
                    print(f"Error creating symlink {src} to {dst}: {e}")
                    return False
        return FileOperations


def safe_import_with_fallback(module_name: str, fallback_name: Optional[str] = None):
    """Safely import a module with fallback implementation.
    
    Args:
        module_name: Name of module to import
        fallback_name: Name of fallback method in FallbackImporter
        
    Returns:
        Imported module or fallback implementation
    """
    try:
        # Try to load from cache first
        module = load_superclaude_module(module_name)
        if module:
            return module
        
        # Try direct import
        return importlib.import_module(module_name)
        
    except ImportError:
        if fallback_name:
            fallback_method = getattr(FallbackImporter, f"get_fallback_{fallback_name}", None)
            if fallback_method:
                return fallback_method()
        
        print(f"Warning: Could not import {module_name} and no fallback available")
        return None


def check_module_loading_efficiency() -> Dict[str, Any]:
    """Check module loading efficiency and identify potential improvements.
    
    Returns:
        Dictionary with efficiency metrics and recommendations
    """
    cache_info = _global_loader.get_cache_info()
    
    # Check for duplicate imports
    import sys
    superclaude_modules = [name for name in sys.modules.keys() 
                          if 'superclaude' in name.lower() or name in [
                              'colors', 'validation', 'file_ops', 'progress'
                          ]]
    
    # Check memory usage (basic)
    total_modules = len(sys.modules)
    
    efficiency_report = {
        "cache_stats": cache_info,
        "superclaude_modules_loaded": len(superclaude_modules),
        "total_modules_loaded": total_modules,
        "cache_hit_ratio": (
            cache_info["cache_hit_info"]["hits"] / 
            max(cache_info["cache_hit_info"]["hits"] + cache_info["cache_hit_info"]["misses"], 1)
        ),
        "recommendations": []
    }
    
    # Generate recommendations
    if cache_info["cached_modules"] < 3:
        efficiency_report["recommendations"].append(
            "Consider pre-loading common modules to improve cache efficiency"
        )
    
    if efficiency_report["cache_hit_ratio"] < 0.5:
        efficiency_report["recommendations"].append(
            "Low cache hit ratio - modules may be loaded multiple times"
        )
    
    if len(superclaude_modules) > 15:
        efficiency_report["recommendations"].append(
            "High number of SuperClaude modules loaded - consider lazy loading"
        )
    
    return efficiency_report


# Convenience function for installer imports
def get_installer_modules():
    """Get all common installer modules with fallbacks."""
    modules = {}
    
    # Essential modules with fallbacks
    modules['Colors'] = safe_import_with_fallback('colors', 'colors')
    modules['ProgressTracker'] = safe_import_with_fallback('progress', 'progress')
    modules['FileOperations'] = safe_import_with_fallback('file_ops', 'file_ops')
    
    # Enhanced modules (optional)
    modules['LoggerMixin'] = safe_import_with_fallback('logger')
    modules['InstallationStateManager'] = safe_import_with_fallback('installation_state')
    modules['IntegrationValidator'] = safe_import_with_fallback('integration_validator')
    
    return modules