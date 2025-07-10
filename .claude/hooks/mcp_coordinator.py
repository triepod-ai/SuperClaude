#!/usr/bin/env python3
"""
MCP Server Coordination Utility
Focused MCP server coordination system for optimal request routing
Responsibility: "Coordinate MCP server requests"
"""

import time
import logging
from typing import Dict, List, Any
from contextlib import contextmanager
from collections import defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MCPCoordinator:
    """
    Focused MCP server coordination system
    Responsibility: "Coordinate MCP server requests"
    """
    
    def __init__(self):
        self.server_pool = {}
        self.request_queue = []
        self.fallback_chains = {}
        
        # Performance targets
        self.max_execution_time = 0.030  # 30ms target
        
        # Performance metrics
        self.performance_metrics = defaultdict(list)
        
        # Request caching
        self.response_cache = {}
        self.cache_ttl = 300  # 5 minutes
    
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
                logger.warning(f"MCP coordinator operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def register_server(self, server_name: str, server_config: Dict[str, Any]) -> None:
        """
        Register MCP server with performance tracking
        Performance target: <30ms execution
        """
        with self.performance_timer('server_registration'):
            try:
                self.server_pool[server_name] = {
                    "config": server_config,
                    "status": "available",
                    "response_time": 0.0,
                    "success_rate": 1.0,
                    "last_used": time.time(),
                    "request_count": 0,
                    "error_count": 0
                }
                logger.info(f"Registered MCP server: {server_name}")
                
            except Exception as e:
                logger.error(f"Server registration failed for {server_name}: {e}")
                raise
    
    def optimize_server_selection(self, operation_type: str, requirements: Dict[str, Any]) -> str:
        """
        Optimized server selection based on operation requirements
        Performance target: <30ms execution
        """
        with self.performance_timer('server_selection'):
            try:
                suitable_servers = self._find_suitable_servers(operation_type, requirements)
                
                if not suitable_servers:
                    fallback = self._get_fallback_server(operation_type)
                    logger.debug(f"Using fallback server {fallback} for {operation_type}")
                    return fallback
                
                # Select best server based on performance metrics
                best_server = min(suitable_servers, key=lambda s: (
                    self.server_pool[s]["response_time"],
                    -self.server_pool[s]["success_rate"],
                    self.server_pool[s]["error_count"]
                ))
                
                logger.debug(f"Selected server {best_server} for {operation_type}")
                return best_server
                
            except Exception as e:
                logger.error(f"Server selection failed for {operation_type}: {e}")
                return self._get_fallback_server(operation_type)
    
    def _find_suitable_servers(self, operation_type: str, requirements: Dict[str, Any]) -> List[str]:
        """Find servers suitable for operation type"""
        suitable = []
        
        for server_name, server_info in self.server_pool.items():
            if server_info["status"] == "available":
                # Check if server supports operation type
                if self._supports_operation(server_name, operation_type):
                    suitable.append(server_name)
        
        return suitable
    
    def _supports_operation(self, server_name: str, operation_type: str) -> bool:
        """Check if server supports specific operation type"""
        # Server capability mapping
        capabilities = {
            "context7": ["documentation", "library_lookup", "framework_patterns"],
            "sequential": ["analysis", "reasoning", "planning"],
            "magic": ["ui_generation", "component_creation", "design"],
            "puppeteer": ["testing", "performance", "automation"]
        }
        
        return operation_type in capabilities.get(server_name, [])
    
    def _get_fallback_server(self, operation_type: str) -> str:
        """Get fallback server for operation type"""
        fallback_mapping = {
            "documentation": "sequential",
            "analysis": "sequential",
            "ui_generation": "sequential",
            "testing": "sequential"
        }
        
        return fallback_mapping.get(operation_type, "sequential")
    
    def batch_requests(self, requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Batch and optimize requests for parallel processing"""
        batched_requests = []
        
        # Group requests by server
        server_groups = {}
        for request in requests:
            server = request.get("server", "sequential")
            if server not in server_groups:
                server_groups[server] = []
            server_groups[server].append(request)
        
        # Create batched requests
        for server, server_requests in server_groups.items():
            if len(server_requests) > 1:
                # Batch multiple requests to same server
                batched_requests.append({
                    "server": server,
                    "type": "batch",
                    "requests": server_requests
                })
            else:
                batched_requests.extend(server_requests)
        
        return batched_requests
    
    def update_server_metrics(self, server_name: str, response_time: float, success: bool):
        """
        Update server performance metrics
        Performance target: <30ms execution
        """
        with self.performance_timer('metrics_update'):
            try:
                if server_name in self.server_pool:
                    server = self.server_pool[server_name]
                    
                    # Update request count
                    server["request_count"] += 1
                    
                    # Update error count
                    if not success:
                        server["error_count"] += 1
                    
                    # Update response time (weighted average)
                    current_time = server["response_time"]
                    server["response_time"] = (current_time * 0.8) + (response_time * 0.2)
                    
                    # Update success rate (weighted average)
                    current_rate = server["success_rate"]
                    success_value = 1.0 if success else 0.0
                    server["success_rate"] = (current_rate * 0.9) + (success_value * 0.1)
                    
                    server["last_used"] = time.time()
                    
                    logger.debug(f"Updated metrics for {server_name}: response_time={response_time:.3f}s, success={success}")
                    
            except Exception as e:
                logger.error(f"Metrics update failed for {server_name}: {e}")
    
    def cache_response(self, cache_key: str, response: Any) -> None:
        """
        Cache server response for reuse
        Performance target: <30ms execution
        """
        with self.performance_timer('response_caching'):
            try:
                self.response_cache[cache_key] = {
                    "response": response,
                    "timestamp": time.time()
                }
                # Clean old cache entries
                self._cleanup_cache()
                
            except Exception as e:
                logger.error(f"Response caching failed for {cache_key}: {e}")
    
    def get_cached_response(self, cache_key: str) -> Any:
        """
        Get cached response if available and valid
        Performance target: <30ms execution
        """
        with self.performance_timer('cache_lookup'):
            try:
                if cache_key in self.response_cache:
                    cached_item = self.response_cache[cache_key]
                    if time.time() - cached_item["timestamp"] < self.cache_ttl:
                        logger.debug(f"Cache hit for {cache_key}")
                        return cached_item["response"]
                    else:
                        # Remove expired entry
                        del self.response_cache[cache_key]
                        logger.debug(f"Cache expired for {cache_key}")
                
                return None
                
            except Exception as e:
                logger.error(f"Cache lookup failed for {cache_key}: {e}")
                return None
    
    def _cleanup_cache(self) -> None:
        """Clean up expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, value in self.response_cache.items()
            if current_time - value["timestamp"] > self.cache_ttl
        ]
        
        for key in expired_keys:
            del self.response_cache[key]
    
    def get_server_status(self) -> Dict[str, Any]:
        """
        Get comprehensive server status
        Performance target: <30ms execution
        """
        with self.performance_timer('status_report'):
            try:
                available_servers = [s for s in self.server_pool.values() if s["status"] == "available"]
                
                return {
                    "total_servers": len(self.server_pool),
                    "available_servers": len(available_servers),
                    "cache_entries": len(self.response_cache),
                    "servers": dict(self.server_pool),
                    "performance_summary": self._get_performance_summary()
                }
                
            except Exception as e:
                logger.error(f"Status report generation failed: {e}")
                return {"error": str(e)}
    
    def _get_performance_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
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


# Global MCP coordinator instance for reuse across hooks
_mcp_coordinator = None


def get_mcp_coordinator() -> MCPCoordinator:
    """Get global MCP coordinator instance"""
    global _mcp_coordinator
    if _mcp_coordinator is None:
        _mcp_coordinator = MCPCoordinator()
        
        # Register default servers
        _mcp_coordinator.register_server("context7", {"type": "documentation", "priority": 1})
        _mcp_coordinator.register_server("sequential", {"type": "analysis", "priority": 2})
        _mcp_coordinator.register_server("magic", {"type": "ui_generation", "priority": 3})
        _mcp_coordinator.register_server("puppeteer", {"type": "testing", "priority": 4})
    
    return _mcp_coordinator


def coordinate_mcp_requests(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main MCP coordination interface
    
    Args:
        action: Action to perform (select_server, update_metrics, get_status, cache_response, get_cache)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        coordinator = get_mcp_coordinator()
        
        result = {}
        
        if action == "select_server":
            server = coordinator.optimize_server_selection(
                kwargs.get("operation_type", ""),
                kwargs.get("requirements", {})
            )
            result = {"selected_server": server}
            
        elif action == "update_metrics":
            coordinator.update_server_metrics(
                kwargs.get("server_name", ""),
                kwargs.get("response_time", 0.0),
                kwargs.get("success", True)
            )
            result = {"metrics_updated": True}
            
        elif action == "batch_requests":
            batched = coordinator.batch_requests(kwargs.get("requests", []))
            result = {"batched_requests": batched}
            
        elif action == "cache_response":
            coordinator.cache_response(
                kwargs.get("cache_key", ""),
                kwargs.get("response", None)
            )
            result = {"response_cached": True}
            
        elif action == "get_cache":
            cached_response = coordinator.get_cached_response(kwargs.get("cache_key", ""))
            result = {"cached_response": cached_response, "cache_hit": cached_response is not None}
            
        elif action == "get_status":
            result = coordinator.get_server_status()
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': coordinator._get_performance_summary(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"MCP coordination action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }


if __name__ == "__main__":
    # Test the MCP coordinator
    coordinator = MCPCoordinator()
    
    # Test server registration
    coordinator.register_server("test_server", {"type": "test", "priority": 1})
    
    # Test server selection
    selected = coordinator.optimize_server_selection("documentation", {})
    print(f"Selected server: {selected}")
    
    # Test metrics update
    coordinator.update_server_metrics("test_server", 0.025, True)
    
    # Test caching
    coordinator.cache_response("test_key", {"result": "test_data"})
    cached = coordinator.get_cached_response("test_key")
    print(f"Cached response: {cached}")
    
    # Test status
    status = coordinator.get_server_status()
    print(f"Server status: {status}")
    
    # Test interface function
    result = coordinate_mcp_requests("get_status")
    print(f"Interface result: {result['success']}")
    print(f"Performance metrics: {result['metrics']}")