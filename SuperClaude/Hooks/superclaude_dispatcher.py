#!/usr/bin/env python3
"""
SuperClaude Dispatcher - Lightweight Event Router
Main event router for PreToolUse/PostToolUse events with smart MCP routing
Performance target: <100ms execution
"""

import time
import logging
import json
import asyncio
from typing import Dict, Any, Optional, List, Callable, Set, Tuple
from dataclasses import dataclass
from enum import Enum
from collections import defaultdict
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EventType(Enum):
    """Event types for hook processing"""
    PRE_TOOL_USE = "pre_tool_use"
    POST_TOOL_USE = "post_tool_use"
    CONTEXT_UPDATE = "context_update"
    PERFORMANCE_ALERT = "performance_alert"


class MCPServerType(Enum):
    """MCP server types for routing decisions"""
    CONTEXT7 = "context7"
    SEQUENTIAL = "sequential"
    MAGIC = "magic"
    PLAYWRIGHT = "playwright"
    PERFORMANCE = "superclaude-performance"
    CONTEXT = "superclaude-context"


@dataclass
class EventContext:
    """Event context data structure"""
    event_id: str
    event_type: EventType
    tool_name: str
    tool_args: Dict[str, Any]
    timestamp: float
    session_id: Optional[str] = None
    user_query: Optional[str] = None
    complexity_score: float = 0.0
    domain_hints: Optional[Set[str]] = None


class SuperClaudeDispatcher:
    """
    Lightweight event router for SuperClaude framework
    Responsibility: Route events to appropriate MCP servers
    """
    
    def __init__(self):
        # Performance targets
        self.max_execution_time = 0.100  # 100ms target
        
        # MCP server routing rules
        self.mcp_routing_rules = self._init_routing_rules()
        
        # Event handlers
        self.event_handlers: Dict[EventType, List[Callable]] = defaultdict(list)
        
        # Performance tracking
        self.execution_metrics = defaultdict(list)
        self.lock = threading.Lock()
        
        # Fallback configurations
        self.fallback_enabled = True
        self.mcp_servers_available = set()
        
        # Initialize with assumed available servers
        self.mcp_servers_available.update([
            MCPServerType.PERFORMANCE.value,
            MCPServerType.CONTEXT.value,
            MCPServerType.CONTEXT7.value,
            MCPServerType.SEQUENTIAL.value,
            MCPServerType.MAGIC.value,
            MCPServerType.PLAYWRIGHT.value
        ])
    
    def _init_routing_rules(self) -> Dict[str, Dict[str, Any]]:
        """Initialize smart routing rules for MCP servers"""
        return {
            # Tool-based routing
            "Read": {
                "mcp_servers": [MCPServerType.CONTEXT.value],
                "async_preferred": False,
                "priority": "high"
            },
            "Write": {
                "mcp_servers": [MCPServerType.CONTEXT.value, MCPServerType.PERFORMANCE.value],
                "async_preferred": False,
                "priority": "high"
            },
            "Edit": {
                "mcp_servers": [MCPServerType.CONTEXT.value],
                "async_preferred": True,
                "priority": "medium"
            },
            "Grep": {
                "mcp_servers": [MCPServerType.CONTEXT.value],
                "async_preferred": True,
                "priority": "low"
            },
            "Bash": {
                "mcp_servers": [MCPServerType.PERFORMANCE.value],
                "async_preferred": False,
                "priority": "high"
            },
            "mcp__sequential-thinking__sequentialthinking": {
                "mcp_servers": [MCPServerType.SEQUENTIAL.value, MCPServerType.CONTEXT.value],
                "async_preferred": True,
                "priority": "medium"
            },
            "mcp__context7__resolve-library-id": {
                "mcp_servers": [MCPServerType.CONTEXT7.value, MCPServerType.CONTEXT.value],
                "async_preferred": True,
                "priority": "low"
            },
            "mcp__magic__21st_magic_component_builder": {
                "mcp_servers": [MCPServerType.MAGIC.value, MCPServerType.CONTEXT.value],
                "async_preferred": True,
                "priority": "medium"
            },
            "mcp__playwright__init-browser": {
                "mcp_servers": [MCPServerType.PLAYWRIGHT.value, MCPServerType.PERFORMANCE.value],
                "async_preferred": False,
                "priority": "high"
            }
        }
    
    def classify_event(self, tool_name: str, tool_args: Dict[str, Any], 
                      user_query: Optional[str] = None) -> EventContext:
        """
        Classify incoming event and create context
        Performance target: <10ms
        """
        start_time = time.time()
        
        try:
            # Generate event ID
            event_id = f"{tool_name}_{int(time.time() * 1000)}"
            
            # Extract domain hints from tool usage
            domain_hints = self._extract_domain_hints(tool_name, tool_args, user_query)
            
            # Calculate complexity score
            complexity_score = self._calculate_complexity(tool_name, tool_args, domain_hints)
            
            context = EventContext(
                event_id=event_id,
                event_type=EventType.PRE_TOOL_USE,  # Default, will be updated
                tool_name=tool_name,
                tool_args=tool_args,
                timestamp=time.time(),
                user_query=user_query,
                complexity_score=complexity_score,
                domain_hints=domain_hints or set()
            )
            
            # Record performance
            execution_time = time.time() - start_time
            self._record_metric("event_classification", execution_time)
            
            return context
            
        except Exception as e:
            logger.error(f"Event classification failed: {e}")
            return EventContext(
                event_id=f"error_{int(time.time() * 1000)}",
                event_type=EventType.PRE_TOOL_USE,
                tool_name=tool_name,
                tool_args=tool_args,
                timestamp=time.time()
            )
    
    def _extract_domain_hints(self, tool_name: str, tool_args: Dict[str, Any], 
                             user_query: Optional[str] = None) -> Set[str]:
        """Extract domain hints for smart routing"""
        hints = set()
        
        # Tool-based hints
        if "magic" in tool_name.lower():
            hints.add("frontend")
        elif "playwright" in tool_name.lower():
            hints.add("testing")
        elif "sequential" in tool_name.lower():
            hints.add("analysis")
        elif "context7" in tool_name.lower():
            hints.add("documentation")
        
        # Argument-based hints
        if tool_args:
            args_str = json.dumps(tool_args).lower()
            if any(keyword in args_str for keyword in ["component", "react", "ui"]):
                hints.add("frontend")
            elif any(keyword in args_str for keyword in ["security", "vulnerability"]):
                hints.add("security")
            elif any(keyword in args_str for keyword in ["performance", "optimize"]):
                hints.add("performance")
            elif any(keyword in args_str for keyword in ["test", "e2e"]):
                hints.add("testing")
        
        # Query-based hints
        if user_query:
            query_lower = user_query.lower()
            if any(keyword in query_lower for keyword in ["analyze", "review", "explain"]):
                hints.add("analysis")
            elif any(keyword in query_lower for keyword in ["build", "create", "implement"]):
                hints.add("development")
            elif any(keyword in query_lower for keyword in ["document", "write"]):
                hints.add("documentation")
        
        return hints
    
    def _calculate_complexity(self, tool_name: str, tool_args: Dict[str, Any], 
                            domain_hints: Set[str]) -> float:
        """Calculate event complexity score (0.0-1.0)"""
        complexity = 0.0
        
        # Base complexity by tool type
        tool_complexity = {
            "Read": 0.1,
            "Write": 0.3,
            "Edit": 0.4,
            "MultiEdit": 0.6,
            "Bash": 0.5,
            "Grep": 0.2,
            "mcp__sequential-thinking": 0.8,
            "mcp__magic": 0.6,
            "mcp__playwright": 0.7
        }
        
        # Get base complexity
        for tool_pattern, score in tool_complexity.items():
            if tool_pattern in tool_name:
                complexity = max(complexity, score)
                break
        else:
            complexity = 0.3  # Default
        
        # Adjust for argument complexity
        if tool_args:
            arg_count = len(tool_args)
            complexity += min(0.2, arg_count * 0.05)
        
        # Adjust for domain complexity
        complexity_domains = {"analysis", "security", "performance"}
        domain_boost = len(domain_hints & complexity_domains) * 0.1
        complexity = min(1.0, complexity + domain_boost)
        
        return round(complexity, 2)
    
    def route_to_mcp_servers(self, context: EventContext) -> List[Tuple[str, bool]]:
        """
        Determine which MCP servers to call and execution strategy
        Returns: List of (server_name, is_async) tuples
        Performance target: <20ms
        """
        start_time = time.time()
        
        try:
            routing_decisions = []
            
            # Get routing rules for this tool
            tool_rules = self.mcp_routing_rules.get(context.tool_name, {})
            
            if tool_rules:
                # Use tool-specific routing
                servers = tool_rules.get("mcp_servers", [])
                async_preferred = tool_rules.get("async_preferred", True)
                
                for server in servers:
                    if server in self.mcp_servers_available:
                        routing_decisions.append((server, async_preferred))
            else:
                # Fallback: domain-based routing
                routing_decisions = self._domain_based_routing(context)
            
            # Always include context and performance monitoring for high-priority events
            if context.complexity_score > 0.5 or any("high" in str(rule) for rule in tool_rules.values()):
                if MCPServerType.CONTEXT.value not in [d[0] for d in routing_decisions]:
                    routing_decisions.append((MCPServerType.CONTEXT.value, True))
                if MCPServerType.PERFORMANCE.value not in [d[0] for d in routing_decisions]:
                    routing_decisions.append((MCPServerType.PERFORMANCE.value, True))
            
            # Record performance
            execution_time = time.time() - start_time
            self._record_metric("mcp_routing", execution_time)
            
            return routing_decisions
            
        except Exception as e:
            logger.error(f"MCP routing failed: {e}")
            # Fallback to basic context/performance monitoring
            return [
                (MCPServerType.CONTEXT.value, True),
                (MCPServerType.PERFORMANCE.value, True)
            ]
    
    def _domain_based_routing(self, context: EventContext) -> List[Tuple[str, bool]]:
        """Fallback domain-based routing when no tool rules exist"""
        routing = []
        
        for hint in context.domain_hints:
            if hint == "frontend":
                routing.append((MCPServerType.MAGIC.value, True))
            elif hint == "testing":
                routing.append((MCPServerType.PLAYWRIGHT.value, False))
            elif hint == "analysis":
                routing.append((MCPServerType.SEQUENTIAL.value, True))
            elif hint == "documentation":
                routing.append((MCPServerType.CONTEXT7.value, True))
            elif hint == "performance":
                routing.append((MCPServerType.PERFORMANCE.value, True))
        
        # Always include context for fallback scenarios
        if not routing:
            routing.append((MCPServerType.CONTEXT.value, True))
        
        return routing
    
    def dispatch_event(self, event_type: EventType, tool_name: str, 
                      tool_args: Dict[str, Any], user_query: Optional[str] = None) -> Dict[str, Any]:
        """
        Main dispatch method for events
        Performance target: <100ms total
        """
        start_time = time.time()
        
        try:
            # Classify event
            context = self.classify_event(tool_name, tool_args, user_query)
            context.event_type = event_type
            
            # Determine MCP routing
            mcp_routing = self.route_to_mcp_servers(context)
            
            # Execute routing decisions
            results = self._execute_mcp_calls(context, mcp_routing)
            
            # Record total execution time
            total_time = time.time() - start_time
            self._record_metric("total_dispatch", total_time)
            
            # Alert if exceeding target
            if total_time > self.max_execution_time:
                logger.warning(f"Dispatch exceeded target: {total_time:.3f}s > {self.max_execution_time}s")
            
            return {
                "success": True,
                "event_id": context.event_id,
                "complexity_score": context.complexity_score,
                "mcp_servers_called": [r[0] for r in mcp_routing],
                "execution_time": total_time,
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Event dispatch failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "execution_time": time.time() - start_time,
                "fallback_applied": self.fallback_enabled
            }
    
    def _execute_mcp_calls(self, context: EventContext, 
                          routing: List[Tuple[str, bool]]) -> Dict[str, Any]:
        """Execute MCP server calls based on routing decisions"""
        results = {}
        
        # Separate sync and async calls
        sync_calls = [(server, async_flag) for server, async_flag in routing if not async_flag]
        async_calls = [(server, async_flag) for server, async_flag in routing if async_flag]
        
        # Execute sync calls first (blocking operations)
        for server, _ in sync_calls:
            try:
                result = self._call_mcp_server(server, context)
                results[server] = result
            except Exception as e:
                logger.error(f"Sync MCP call to {server} failed: {e}")
                results[server] = {"error": str(e)}
        
        # Execute async calls (non-blocking operations)
        if async_calls:
            try:
                # Use asyncio for truly async calls, or simulate with threading
                async_results = self._execute_async_calls(async_calls, context)
                results.update(async_results)
            except Exception as e:
                logger.error(f"Async MCP calls failed: {e}")
                for server, _ in async_calls:
                    results[server] = {"error": str(e)}
        
        return results
    
    def _call_mcp_server(self, server: str, context: EventContext) -> Dict[str, Any]:
        """Simulate MCP server call - replace with actual MCP integration"""
        # This is a placeholder for actual MCP server integration
        # In practice, this would use the MCP protocol to call servers
        
        call_start = time.time()
        
        # Simulate server-specific logic
        if server == MCPServerType.PERFORMANCE.value:
            result = {
                "metrics_recorded": True,
                "operation": context.tool_name,
                "timestamp": context.timestamp
            }
        elif server == MCPServerType.CONTEXT.value:
            result = {
                "context_stored": True,
                "event_id": context.event_id,
                "complexity": context.complexity_score
            }
        else:
            result = {
                "server_called": server,
                "event_processed": True
            }
        
        call_time = time.time() - call_start
        result["call_duration"] = call_time
        
        return result
    
    def _execute_async_calls(self, async_calls: List[Tuple[str, bool]], 
                           context: EventContext) -> Dict[str, Any]:
        """Execute async MCP calls with threading fallback"""
        results = {}
        
        # Simple threading-based async execution
        # In production, this could use actual asyncio with MCP async clients
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        with ThreadPoolExecutor(max_workers=min(4, len(async_calls))) as executor:
            # Submit all async calls
            future_to_server = {
                executor.submit(self._call_mcp_server, server, context): server
                for server, _ in async_calls
            }
            
            # Collect results with timeout
            for future in as_completed(future_to_server, timeout=5.0):
                server = future_to_server[future]
                try:
                    result = future.result()
                    results[server] = result
                except Exception as e:
                    logger.error(f"Async call to {server} failed: {e}")
                    results[server] = {"error": str(e)}
        
        return results
    
    def _record_metric(self, operation: str, duration: float):
        """Record performance metrics"""
        with self.lock:
            self.execution_metrics[operation].append(duration)
            # Keep only last 100 measurements per operation
            if len(self.execution_metrics[operation]) > 100:
                self.execution_metrics[operation] = self.execution_metrics[operation][-50:]
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get dispatcher performance metrics"""
        with self.lock:
            metrics = {}
            for operation, times in self.execution_metrics.items():
                if times:
                    metrics[operation] = {
                        "count": len(times),
                        "avg_ms": round(sum(times) * 1000 / len(times), 2),
                        "max_ms": round(max(times) * 1000, 2),
                        "min_ms": round(min(times) * 1000, 2),
                        "target_met": all(t <= self.max_execution_time for t in times[-10:])
                    }
            
            return {
                "operations": metrics,
                "total_events": sum(len(times) for times in self.execution_metrics.values()),
                "mcp_servers_available": list(self.mcp_servers_available),
                "max_execution_time_ms": self.max_execution_time * 1000
            }
    
    def update_server_availability(self, server: str, available: bool):
        """Update MCP server availability status"""
        if available:
            self.mcp_servers_available.add(server)
        else:
            self.mcp_servers_available.discard(server)
        
        logger.info(f"MCP server {server} availability: {available}")


# Global instance
_dispatcher = None


def get_dispatcher() -> SuperClaudeDispatcher:
    """Get global dispatcher instance"""
    global _dispatcher
    if _dispatcher is None:
        _dispatcher = SuperClaudeDispatcher()
    return _dispatcher


def dispatch_superclaude_event(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main dispatcher interface for SuperClaude events
    
    Args:
        action: Action to perform (pre_tool_use, post_tool_use, get_metrics, update_availability)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        dispatcher = get_dispatcher()
        
        if action == "pre_tool_use":
            result = dispatcher.dispatch_event(
                EventType.PRE_TOOL_USE,
                kwargs.get("tool_name", ""),
                kwargs.get("tool_args", {}),
                kwargs.get("user_query")
            )
        elif action == "post_tool_use":
            result = dispatcher.dispatch_event(
                EventType.POST_TOOL_USE,
                kwargs.get("tool_name", ""),
                kwargs.get("tool_args", {}),
                kwargs.get("user_query")
            )
        elif action == "get_metrics":
            result = dispatcher.get_performance_metrics()
        elif action == "update_availability":
            dispatcher.update_server_availability(
                kwargs.get("server", ""),
                kwargs.get("available", True)
            )
            result = {"updated": True}
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            "success": True,
            "result": result,
            "metrics": dispatcher.get_performance_metrics() if action != "get_metrics" else {},
            "errors": []
        }
        
    except Exception as e:
        logger.error(f"Dispatcher action '{action}' failed: {e}")
        return {
            "success": False,
            "result": {},
            "metrics": {},
            "errors": [str(e)]
        }


if __name__ == "__main__":
    # Test the dispatcher
    dispatcher = SuperClaudeDispatcher()
    
    # Test event classification
    context = dispatcher.classify_event(
        "Read",
        {"file_path": "/test/file.py"},
        "Analyze this Python file"
    )
    print(f"Event context: {context}")
    
    # Test MCP routing
    routing = dispatcher.route_to_mcp_servers(context)
    print(f"MCP routing: {routing}")
    
    # Test full dispatch
    result = dispatcher.dispatch_event(
        EventType.PRE_TOOL_USE,
        "mcp__sequential-thinking__sequentialthinking",
        {"thought": "Analyzing complex problem", "thought_number": 1},
        "Help me understand this architecture"
    )
    print(f"Dispatch result: {result}")
    
    # Test metrics
    metrics = dispatcher.get_performance_metrics()
    print(f"Performance metrics: {json.dumps(metrics, indent=2)}")