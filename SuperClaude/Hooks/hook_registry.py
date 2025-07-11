#!/usr/bin/env python3
"""
Hook Registry - Centralized Hook Management System
Manages hook registration, discovery, and execution coordination
Responsibility: "Manage hook lifecycle and registry"
"""

import time
import logging
import json
import importlib
import inspect
from typing import Dict, Any, Optional, List, Callable, Union
from contextlib import contextmanager
from collections import defaultdict
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import threading
import weakref

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HookType(Enum):
    """Hook execution types"""
    INFRASTRUCTURE = "infrastructure"
    FEATURE = "feature"
    VALIDATION = "validation"
    MONITORING = "monitoring"


class HookStatus(Enum):
    """Hook registration status"""
    REGISTERED = "registered"
    ACTIVE = "active"
    DISABLED = "disabled"
    ERROR = "error"


@dataclass
class HookMetadata:
    """Hook metadata structure"""
    name: str
    hook_type: HookType
    module_path: str
    interface_function: str
    description: str
    performance_target: float
    dependencies: List[str]
    quality_score: Optional[float] = None
    last_execution: Optional[float] = None
    execution_count: int = 0
    error_count: int = 0
    avg_execution_time: float = 0.0


class HookRegistry:
    """
    Centralized hook management system
    Responsibility: "Manage hook lifecycle and registry"
    """
    
    def __init__(self, base_path: str = None):
        if base_path is None:
            # Auto-detect hooks directory relative to current file
            self.base_path = Path(__file__).parent
        else:
            self.base_path = Path(base_path)
        
        # Performance targets
        self.max_execution_time = 0.030  # 30ms target
        
        # Hook storage
        self.registered_hooks: Dict[str, HookMetadata] = {}
        self.hook_instances: Dict[str, Any] = {}
        self.hook_interfaces: Dict[str, Callable] = {}
        
        # Execution tracking
        self.execution_history = defaultdict(list)
        self.performance_metrics = defaultdict(list)
        
        # Registry lock for thread safety
        self.registry_lock = threading.Lock()
        
        # Auto-discovery settings
        self.auto_discovery_enabled = True
        
        # Initialize with known hooks
        self._auto_discover_hooks()
    
    @contextmanager
    def performance_timer(self, operation: str):
        """Performance timing context manager"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.performance_metrics[operation].append(duration)
            
            if duration > self.max_execution_time:
                logger.warning(f"Hook registry operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def _auto_discover_hooks(self):
        """Auto-discover hooks in the hooks directory"""
        with self.performance_timer('hook_discovery'):
            try:
                if not self.base_path.exists():
                    logger.warning(f"Hooks directory not found: {self.base_path}")
                    return
                
                # Discover Python files in hooks directory
                hook_files = list(self.base_path.glob("*.py"))
                
                for hook_file in hook_files:
                    if hook_file.name.startswith("__"):
                        continue
                    
                    hook_name = hook_file.stem
                    try:
                        self._register_hook_from_file(hook_file, hook_name)
                    except Exception as e:
                        logger.error(f"Failed to discover hook {hook_name}: {e}")
                
                logger.info(f"Auto-discovered {len(self.registered_hooks)} hooks")
                
            except Exception as e:
                logger.error(f"Hook auto-discovery failed: {e}")
    
    def _register_hook_from_file(self, hook_file: Path, hook_name: str):
        """Register hook from file analysis"""
        try:
            # Read file content for analysis
            content = hook_file.read_text()
            
            # Determine hook type based on content and name
            hook_type = self._determine_hook_type(hook_name, content)
            
            # Find interface function
            interface_function = self._find_interface_function(content)
            
            # Extract description
            description = self._extract_description(content)
            
            # Determine performance target
            performance_target = self._extract_performance_target(content)
            
            # Find dependencies
            dependencies = self._extract_dependencies(content)
            
            # Create metadata
            metadata = HookMetadata(
                name=hook_name,
                hook_type=hook_type,
                module_path=str(hook_file),
                interface_function=interface_function,
                description=description,
                performance_target=performance_target,
                dependencies=dependencies
            )
            
            with self.registry_lock:
                self.registered_hooks[hook_name] = metadata
            
            logger.debug(f"Registered hook: {hook_name} ({hook_type.value})")
            
        except Exception as e:
            logger.error(f"Failed to register hook from {hook_file}: {e}")
            raise
    
    def _determine_hook_type(self, hook_name: str, content: str) -> HookType:
        """Determine hook type from name and content"""
        name_lower = hook_name.lower()
        content_lower = content.lower()
        
        # Infrastructure hooks
        if any(keyword in name_lower for keyword in [
            "wave_sequencer", "agent_manager", "result_collector", 
            "synthesis_engine", "performance_monitor"
        ]):
            return HookType.INFRASTRUCTURE
        
        # Validation hooks
        if any(keyword in name_lower for keyword in [
            "quality_validator", "validator", "quality"
        ]) or "validate" in content_lower:
            return HookType.VALIDATION
        
        # Monitoring hooks
        if any(keyword in name_lower for keyword in [
            "monitor", "performance", "metrics"
        ]):
            return HookType.MONITORING
        
        # Default to feature
        return HookType.FEATURE
    
    def _find_interface_function(self, content: str) -> str:
        """Find main interface function in hook content"""
        # Look for common interface function patterns
        interface_patterns = [
            r"def\s+(manage_\w+)\(",
            r"def\s+(coordinate_\w+)\(",
            r"def\s+(collect_\w+)\(",
            r"def\s+(synthesize_\w+)\(",
            r"def\s+(monitor_\w+)\(",
            r"def\s+(validate_\w+)\(",
            r"def\s+(sequence_\w+)\(",
        ]
        
        import re
        for pattern in interface_patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(1)
        
        # Fallback: look for any function that returns a dict with success/result pattern
        if "return {" in content and "'success':" in content:
            lines = content.split('\n')
            for line in lines:
                if line.strip().startswith('def ') and '(' in line and 'action:' in line:
                    func_name = line.split('def ')[1].split('(')[0].strip()
                    return func_name
        
        return "main_interface"
    
    def _extract_description(self, content: str) -> str:
        """Extract hook description from content"""
        lines = content.split('\n')
        
        # Look for module docstring
        in_docstring = False
        description_lines = []
        
        for line in lines:
            stripped = line.strip()
            if '"""' in stripped and not in_docstring:
                in_docstring = True
                # Get text after the opening quotes
                after_quotes = stripped.split('"""', 1)[1]
                if after_quotes and not after_quotes.startswith('"""'):
                    description_lines.append(after_quotes)
                if stripped.endswith('"""') and len(stripped.split('"""')) == 3:
                    break
            elif in_docstring:
                if '"""' in stripped:
                    # End of docstring
                    before_quotes = stripped.split('"""')[0]
                    if before_quotes:
                        description_lines.append(before_quotes)
                    break
                else:
                    description_lines.append(stripped)
        
        if description_lines:
            return ' '.join(description_lines).strip()
        
        # Fallback: look for responsibility comment
        for line in lines:
            if 'Responsibility:' in line:
                return line.split('Responsibility:')[1].strip().strip('"')
        
        return f"Hook: {content.split('/')[-1] if '/' in content else 'Unknown'}"
    
    def _extract_performance_target(self, content: str) -> float:
        """Extract performance target from content"""
        import re
        
        # Look for performance target patterns
        patterns = [
            r"max_execution_time\s*=\s*([\d.]+)",
            r"performance target.*?(\d+)ms",
            r"target.*?<\s*(\d+)ms",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content.lower())
            if match:
                value = float(match.group(1))
                # Convert ms to seconds if needed
                if value > 10:  # Assume it's in milliseconds
                    value = value / 1000
                return value
        
        # Default based on hook type
        if "infrastructure" in content.lower():
            return 0.025  # 25ms for infrastructure
        elif "validation" in content.lower():
            return 0.050  # 50ms for validation
        else:
            return 0.030  # 30ms default
    
    def _extract_dependencies(self, content: str) -> List[str]:
        """Extract hook dependencies from content"""
        dependencies = []
        
        # Look for imports that might be other hooks
        import re
        import_matches = re.findall(r"from\s+(\w+)\s+import", content)
        
        hook_names = [
            "wave_sequencer", "agent_manager", "result_collector",
            "synthesis_engine", "performance_monitor", "quality_validator",
            "mcp_coordinator", "task_manager"
        ]
        
        for imp in import_matches:
            if imp in hook_names:
                dependencies.append(imp)
        
        # Look for direct function calls to other hooks
        for hook_name in hook_names:
            if f"get_{hook_name}" in content or f"{hook_name}." in content:
                if hook_name not in dependencies:
                    dependencies.append(hook_name)
        
        return dependencies
    
    def register_hook(self, metadata: HookMetadata) -> bool:
        """
        Manually register a hook
        Performance target: <30ms execution
        """
        with self.performance_timer('hook_registration'):
            try:
                with self.registry_lock:
                    self.registered_hooks[metadata.name] = metadata
                
                logger.info(f"Manually registered hook: {metadata.name}")
                return True
                
            except Exception as e:
                logger.error(f"Failed to register hook {metadata.name}: {e}")
                return False
    
    def get_hook_interface(self, hook_name: str) -> Optional[Callable]:
        """
        Get hook interface function
        Performance target: <30ms execution
        """
        with self.performance_timer('interface_retrieval'):
            try:
                if hook_name in self.hook_interfaces:
                    return self.hook_interfaces[hook_name]
                
                if hook_name not in self.registered_hooks:
                    logger.warning(f"Hook not registered: {hook_name}")
                    return None
                
                metadata = self.registered_hooks[hook_name]
                
                # Import the module
                module_path = Path(metadata.module_path)
                module_name = module_path.stem
                
                # Add hooks directory to path if needed
                import sys
                hooks_dir = str(self.base_path)
                if hooks_dir not in sys.path:
                    sys.path.insert(0, hooks_dir)
                
                # Import the module
                module = importlib.import_module(module_name)
                
                # Get the interface function
                if hasattr(module, metadata.interface_function):
                    interface_func = getattr(module, metadata.interface_function)
                    self.hook_interfaces[hook_name] = interface_func
                    return interface_func
                else:
                    logger.warning(f"Interface function {metadata.interface_function} not found in {hook_name}")
                    return None
                
            except Exception as e:
                logger.error(f"Failed to get interface for hook {hook_name}: {e}")
                return None
    
    def execute_hook(self, hook_name: str, action: str, **kwargs) -> Dict[str, Any]:
        """
        Execute hook with action and parameters
        Performance target: Variable (depends on hook)
        """
        start_time = time.time()
        
        try:
            if hook_name not in self.registered_hooks:
                return {
                    'success': False,
                    'result': {},
                    'metrics': {},
                    'errors': [f"Hook {hook_name} not registered"]
                }
            
            interface_func = self.get_hook_interface(hook_name)
            if not interface_func:
                return {
                    'success': False,
                    'result': {},
                    'metrics': {},
                    'errors': [f"Interface function not available for {hook_name}"]
                }
            
            # Execute the hook
            result = interface_func(action, **kwargs)
            
            # Update execution metrics
            execution_time = time.time() - start_time
            self._update_hook_metrics(hook_name, execution_time, result.get('success', False))
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            self._update_hook_metrics(hook_name, execution_time, False)
            
            logger.error(f"Hook execution failed for {hook_name}: {e}")
            return {
                'success': False,
                'result': {},
                'metrics': {},
                'errors': [str(e)]
            }
    
    def _update_hook_metrics(self, hook_name: str, execution_time: float, success: bool):
        """Update hook execution metrics"""
        with self.registry_lock:
            if hook_name in self.registered_hooks:
                metadata = self.registered_hooks[hook_name]
                metadata.last_execution = time.time()
                metadata.execution_count += 1
                
                if not success:
                    metadata.error_count += 1
                
                # Update average execution time
                if metadata.avg_execution_time == 0:
                    metadata.avg_execution_time = execution_time
                else:
                    # Weighted average
                    metadata.avg_execution_time = (
                        metadata.avg_execution_time * 0.8 + execution_time * 0.2
                    )
    
    def get_hooks_by_type(self, hook_type: HookType) -> List[HookMetadata]:
        """
        Get all hooks of specific type
        Performance target: <30ms execution
        """
        with self.performance_timer('hooks_by_type'):
            with self.registry_lock:
                return [
                    metadata for metadata in self.registered_hooks.values()
                    if metadata.hook_type == hook_type
                ]
    
    def get_hook_dependencies(self, hook_name: str) -> List[str]:
        """
        Get hook dependencies
        Performance target: <30ms execution
        """
        with self.performance_timer('dependency_lookup'):
            if hook_name not in self.registered_hooks:
                return []
            
            return self.registered_hooks[hook_name].dependencies.copy()
    
    def validate_hook_health(self, hook_name: str) -> Dict[str, Any]:
        """
        Validate hook health and performance
        Performance target: <30ms execution
        """
        with self.performance_timer('hook_health_check'):
            try:
                if hook_name not in self.registered_hooks:
                    return {"healthy": False, "error": "Hook not registered"}
                
                metadata = self.registered_hooks[hook_name]
                
                # Health checks
                health_score = 1.0
                issues = []
                
                # Performance check
                if metadata.avg_execution_time > metadata.performance_target * 2:
                    health_score -= 0.3
                    issues.append("Performance degradation detected")
                
                # Error rate check
                if metadata.execution_count > 10:
                    error_rate = metadata.error_count / metadata.execution_count
                    if error_rate > 0.1:  # 10% error rate threshold
                        health_score -= 0.4
                        issues.append(f"High error rate: {error_rate:.1%}")
                
                # Availability check
                try:
                    interface_func = self.get_hook_interface(hook_name)
                    if not interface_func:
                        health_score -= 0.5
                        issues.append("Interface function not available")
                except Exception as e:
                    health_score -= 0.5
                    issues.append(f"Interface error: {str(e)}")
                
                return {
                    "healthy": health_score >= 0.7,
                    "health_score": health_score,
                    "issues": issues,
                    "metadata": asdict(metadata)
                }
                
            except Exception as e:
                logger.error(f"Hook health validation failed for {hook_name}: {e}")
                return {"healthy": False, "error": str(e)}
    
    def get_registry_status(self) -> Dict[str, Any]:
        """
        Get comprehensive registry status
        Performance target: <30ms execution
        """
        with self.performance_timer('registry_status'):
            try:
                with self.registry_lock:
                    total_hooks = len(self.registered_hooks)
                    hooks_by_type = defaultdict(int)
                    total_executions = 0
                    total_errors = 0
                    
                    for metadata in self.registered_hooks.values():
                        hooks_by_type[metadata.hook_type.value] += 1
                        total_executions += metadata.execution_count
                        total_errors += metadata.error_count
                
                return {
                    "total_hooks": total_hooks,
                    "hooks_by_type": dict(hooks_by_type),
                    "total_executions": total_executions,
                    "total_errors": total_errors,
                    "error_rate": total_errors / max(1, total_executions),
                    "registry_performance": self._get_performance_summary(),
                    "auto_discovery_enabled": self.auto_discovery_enabled
                }
                
            except Exception as e:
                logger.error(f"Registry status generation failed: {e}")
                return {"error": str(e)}
    
    def _get_performance_summary(self) -> Dict[str, Any]:
        """Get registry performance metrics summary"""
        summary = {}
        
        for operation, times in self.performance_metrics.items():
            if times:
                summary[operation] = {
                    'avg_time': sum(times) / len(times),
                    'max_time': max(times),
                    'min_time': min(times),
                    'count': len(times),
                    'target_met': all(t <= self.max_execution_time for t in times[-10:])
                }
        
        return summary


# Global instance
_hook_registry = None


def get_hook_registry() -> HookRegistry:
    """Get global hook registry instance"""
    global _hook_registry
    if _hook_registry is None:
        _hook_registry = HookRegistry()
    return _hook_registry


def manage_hook_registry(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main hook registry interface
    
    Args:
        action: Action to perform (register, execute, get_status, get_health, get_by_type)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        registry = get_hook_registry()
        
        result = {}
        
        if action == "register":
            metadata = kwargs.get("metadata")
            if metadata:
                success = registry.register_hook(metadata)
                result = {"registered": success}
            else:
                raise ValueError("Metadata required for registration")
        
        elif action == "execute":
            hook_name = kwargs.get("hook_name", "")
            hook_action = kwargs.get("hook_action", "")
            hook_params = kwargs.get("hook_params", {})
            
            result = registry.execute_hook(hook_name, hook_action, **hook_params)
        
        elif action == "get_status":
            result = registry.get_registry_status()
        
        elif action == "get_health":
            hook_name = kwargs.get("hook_name", "")
            result = registry.validate_hook_health(hook_name)
        
        elif action == "get_by_type":
            hook_type = HookType(kwargs.get("hook_type", "feature"))
            hooks = registry.get_hooks_by_type(hook_type)
            result = {"hooks": [asdict(hook) for hook in hooks]}
        
        elif action == "get_dependencies":
            hook_name = kwargs.get("hook_name", "")
            dependencies = registry.get_hook_dependencies(hook_name)
            result = {"dependencies": dependencies}
        
        elif action == "get_interface":
            hook_name = kwargs.get("hook_name", "")
            interface = registry.get_hook_interface(hook_name)
            result = {"interface_available": interface is not None}
        
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': registry._get_performance_summary(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Hook registry action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }


if __name__ == "__main__":
    # Test the hook registry
    registry = HookRegistry()
    
    # Test registry status
    status = registry.get_registry_status()
    print(f"Registry status: {json.dumps(status, indent=2)}")
    
    # Test hook health validation
    if "performance_monitor" in registry.registered_hooks:
        health = registry.validate_hook_health("performance_monitor")
        print(f"Performance monitor health: {health}")
    
    # Test interface function
    interface_result = manage_hook_registry("get_status")
    print(f"Interface result: {interface_result['success']}")
    print(f"Total hooks: {interface_result['result'].get('total_hooks', 0)}")
    
    # Test hook execution
    if "performance_monitor" in registry.registered_hooks:
        exec_result = manage_hook_registry(
            "execute",
            hook_name="performance_monitor",
            hook_action="get_metrics"
        )
        print(f"Hook execution success: {exec_result.get('success', False)}")