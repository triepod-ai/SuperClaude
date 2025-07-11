#!/usr/bin/env python3
"""
Performance Bridge - Lightweight Performance Monitoring Bridge
Bridges Claude Code tool execution with superclaude-performance MCP server
Performance target: <10ms execution overhead
"""

import time
import logging
import threading
from typing import Dict, Any, Optional, List, Callable
from collections import defaultdict, deque
from dataclasses import dataclass
from enum import Enum
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PerformanceLevel(Enum):
    """Performance alert levels"""
    NORMAL = "normal"
    WARNING = "warning" 
    CRITICAL = "critical"


@dataclass
class PerformanceEvent:
    """Lightweight performance event"""
    operation: str
    duration_ms: float
    timestamp: float
    level: PerformanceLevel
    tool_name: Optional[str] = None
    session_id: Optional[str] = None


class PerformanceBridge:
    """
    Lightweight performance monitoring bridge
    Responsibility: Monitor tool execution and bridge to MCP server
    """
    
    def __init__(self):
        # Performance targets (in seconds)
        self.thresholds = {
            "Read": {"warning": 0.100, "critical": 0.500},
            "Write": {"warning": 0.200, "critical": 1.000},
            "Edit": {"warning": 0.150, "critical": 0.750},
            "MultiEdit": {"warning": 0.300, "critical": 1.500},
            "Bash": {"warning": 2.000, "critical": 10.000},
            "Grep": {"warning": 0.500, "critical": 2.000},
            "Glob": {"warning": 0.200, "critical": 1.000},
            "mcp__sequential": {"warning": 5.000, "critical": 30.000},
            "mcp__magic": {"warning": 3.000, "critical": 15.000},
            "mcp__context7": {"warning": 2.000, "critical": 10.000},
            "mcp__playwright": {"warning": 10.000, "critical": 60.000},
            "default": {"warning": 1.000, "critical": 5.000}
        }
        
        # Lightweight metrics storage
        self.metrics = defaultdict(lambda: deque(maxlen=50))  # Last 50 measurements per tool
        self.alerts = deque(maxlen=100)  # Last 100 alerts
        self.lock = threading.Lock()
        
        # Quick counters
        self.tool_counts = defaultdict(int)
        self.alert_counts = defaultdict(int)
        
        # Performance optimization
        self.batch_size = 10  # Batch operations for MCP calls
        self.batch_buffer = []
        self.last_mcp_call = 0
        self.mcp_call_interval = 5.0  # Send to MCP every 5 seconds
        
        # Circuit breaker for MCP calls
        self.mcp_available = True
        self.mcp_failure_count = 0
        self.mcp_failure_threshold = 3
    
    def start_timer(self, operation: str) -> str:
        """
        Start performance timer for operation
        Returns timer_id for stopping
        Performance target: <1ms
        """
        timer_id = f"{operation}_{int(time.time() * 1000000)}"  # microsecond precision
        start_time = time.time()
        
        # Store start time (thread-safe)
        with self.lock:
            if not hasattr(self, '_active_timers'):
                self._active_timers = {}
            self._active_timers[timer_id] = {
                'operation': operation,
                'start_time': start_time
            }
        
        return timer_id
    
    def stop_timer(self, timer_id: str, tool_name: Optional[str] = None, 
                   session_id: Optional[str] = None) -> float:
        """
        Stop timer and record performance
        Returns duration in seconds
        Performance target: <10ms
        """
        end_time = time.time()
        
        with self.lock:
            if not hasattr(self, '_active_timers') or timer_id not in self._active_timers:
                logger.warning(f"Timer {timer_id} not found")
                return 0.0
            
            timer_info = self._active_timers.pop(timer_id)
            operation = timer_info['operation']
            start_time = timer_info['start_time']
        
        # Calculate duration
        duration = end_time - start_time
        duration_ms = duration * 1000
        
        # Record metrics
        self._record_performance(operation, duration, tool_name, session_id)
        
        return duration
    
    def record_direct(self, operation: str, duration: float, 
                     tool_name: Optional[str] = None, session_id: Optional[str] = None):
        """
        Directly record performance metric
        Performance target: <5ms
        """
        self._record_performance(operation, duration, tool_name, session_id)
    
    def _record_performance(self, operation: str, duration: float, 
                          tool_name: Optional[str] = None, session_id: Optional[str] = None):
        """Internal performance recording with alerting"""
        timestamp = time.time()
        duration_ms = duration * 1000
        
        # Determine performance level
        level = self._assess_performance_level(operation, duration)
        
        # Create performance event
        event = PerformanceEvent(
            operation=operation,
            duration_ms=duration_ms,
            timestamp=timestamp,
            level=level,
            tool_name=tool_name,
            session_id=session_id
        )
        
        # Store metrics (thread-safe)
        with self.lock:
            self.metrics[operation].append({
                'duration': duration,
                'timestamp': timestamp,
                'level': level.value
            })
            
            self.tool_counts[operation] += 1
            
            # Store alerts for non-normal performance
            if level != PerformanceLevel.NORMAL:
                self.alerts.append(event)
                self.alert_counts[level.value] += 1
        
        # Add to batch for MCP server
        self._add_to_batch(event)
        
        # Log critical performance issues immediately
        if level == PerformanceLevel.CRITICAL:
            logger.warning(f"CRITICAL: {operation} took {duration_ms:.1f}ms")
    
    def _assess_performance_level(self, operation: str, duration: float) -> PerformanceLevel:
        """Assess performance level against thresholds"""
        # Find matching threshold
        thresholds = None
        for pattern, thresh in self.thresholds.items():
            if pattern in operation or operation.startswith(pattern):
                thresholds = thresh
                break
        
        if not thresholds:
            thresholds = self.thresholds["default"]
        
        if duration > thresholds["critical"]:
            return PerformanceLevel.CRITICAL
        elif duration > thresholds["warning"]:
            return PerformanceLevel.WARNING
        else:
            return PerformanceLevel.NORMAL
    
    def _add_to_batch(self, event: PerformanceEvent):
        """Add event to batch for MCP transmission"""
        with self.lock:
            self.batch_buffer.append(event)
            
            # Check if we should send batch
            current_time = time.time()
            should_send = (
                len(self.batch_buffer) >= self.batch_size or
                (current_time - self.last_mcp_call) >= self.mcp_call_interval or
                event.level == PerformanceLevel.CRITICAL
            )
            
            if should_send and self.mcp_available:
                self._send_batch_to_mcp()
    
    def _send_batch_to_mcp(self):
        """Send batched events to superclaude-performance MCP server"""
        if not self.batch_buffer:
            return
        
        try:
            # Prepare batch data
            batch_data = {
                "events": [
                    {
                        "operation": event.operation,
                        "duration_ms": event.duration_ms,
                        "timestamp": event.timestamp,
                        "level": event.level.value,
                        "tool_name": event.tool_name,
                        "session_id": event.session_id
                    }
                    for event in self.batch_buffer
                ],
                "batch_timestamp": time.time(),
                "batch_size": len(self.batch_buffer)
            }
            
            # Simulate MCP call (replace with actual MCP integration)
            success = self._call_performance_mcp_server(batch_data)
            
            if success:
                self.batch_buffer.clear()
                self.last_mcp_call = time.time()
                self.mcp_failure_count = 0
            else:
                self._handle_mcp_failure()
                
        except Exception as e:
            logger.error(f"Failed to send performance batch to MCP: {e}")
            self._handle_mcp_failure()
    
    def _call_performance_mcp_server(self, batch_data: Dict[str, Any]) -> bool:
        """Call superclaude-performance MCP server (placeholder)"""
        # This is a placeholder for actual MCP server integration
        # In practice, this would use the MCP protocol
        
        try:
            # Simulate network call with timeout
            start_time = time.time()
            
            # Simulate processing time (replace with actual MCP call)
            # time.sleep(0.001)  # 1ms simulated processing
            
            call_duration = time.time() - start_time
            
            # Log if MCP call itself is slow
            if call_duration > 0.050:  # 50ms threshold for MCP calls
                logger.warning(f"Slow MCP performance call: {call_duration:.3f}s")
            
            return True  # Simulate success
            
        except Exception as e:
            logger.error(f"MCP server call failed: {e}")
            return False
    
    def _handle_mcp_failure(self):
        """Handle MCP server failure with circuit breaker pattern"""
        self.mcp_failure_count += 1
        
        if self.mcp_failure_count >= self.mcp_failure_threshold:
            self.mcp_available = False
            logger.warning("MCP performance server marked as unavailable (circuit breaker)")
            
            # Clear batch buffer to prevent memory buildup
            self.batch_buffer.clear()
    
    def force_flush(self):
        """Force send any pending batched events"""
        with self.lock:
            if self.batch_buffer and self.mcp_available:
                self._send_batch_to_mcp()
    
    def get_quick_metrics(self) -> Dict[str, Any]:
        """
        Get quick performance metrics
        Performance target: <5ms
        """
        with self.lock:
            # Calculate quick stats
            total_operations = sum(self.tool_counts.values())
            recent_alerts = len([a for a in self.alerts if time.time() - a.timestamp < 300])  # Last 5 minutes
            
            # Get average performance for top tools
            top_tools = {}
            for tool, measurements in list(self.metrics.items())[:10]:  # Top 10 tools
                if measurements:
                    durations = [m['duration'] for m in measurements]
                    top_tools[tool] = {
                        "count": len(durations),
                        "avg_ms": round(sum(durations) * 1000 / len(durations), 1),
                        "max_ms": round(max(durations) * 1000, 1)
                    }
            
            return {
                "total_operations": total_operations,
                "recent_alerts": recent_alerts,
                "alert_breakdown": dict(self.alert_counts),
                "top_tools": top_tools,
                "mcp_status": "available" if self.mcp_available else "unavailable",
                "batch_pending": len(self.batch_buffer)
            }
    
    def get_tool_performance(self, tool_name: str, limit: int = 20) -> Dict[str, Any]:
        """Get detailed performance data for specific tool"""
        with self.lock:
            measurements = list(self.metrics.get(tool_name, []))[-limit:]
            
            if not measurements:
                return {"tool": tool_name, "no_data": True}
            
            durations = [m['duration'] for m in measurements]
            
            return {
                "tool": tool_name,
                "count": len(durations),
                "avg_ms": round(sum(durations) * 1000 / len(durations), 2),
                "min_ms": round(min(durations) * 1000, 2),
                "max_ms": round(max(durations) * 1000, 2),
                "recent_measurements": [
                    {
                        "duration_ms": round(m['duration'] * 1000, 2),
                        "timestamp": m['timestamp'],
                        "level": m['level']
                    }
                    for m in measurements[-10:]  # Last 10
                ],
                "thresholds": self.thresholds.get(tool_name, self.thresholds["default"])
            }
    
    def reset_mcp_circuit_breaker(self):
        """Reset MCP circuit breaker (for recovery)"""
        self.mcp_available = True
        self.mcp_failure_count = 0
        logger.info("MCP performance server circuit breaker reset")
    
    def update_thresholds(self, tool_pattern: str, warning: float, critical: float):
        """Update performance thresholds for tool pattern"""
        self.thresholds[tool_pattern] = {
            "warning": warning,
            "critical": critical
        }
        logger.info(f"Updated thresholds for {tool_pattern}: warn={warning}s, crit={critical}s")


# Global instance
_performance_bridge = None


def get_performance_bridge() -> PerformanceBridge:
    """Get global performance bridge instance"""
    global _performance_bridge
    if _performance_bridge is None:
        _performance_bridge = PerformanceBridge()
    return _performance_bridge


# Convenience functions for easy integration
def start_performance_timer(operation: str) -> str:
    """Start performance timer"""
    return get_performance_bridge().start_timer(operation)


def stop_performance_timer(timer_id: str, tool_name: Optional[str] = None) -> float:
    """Stop performance timer"""
    return get_performance_bridge().stop_timer(timer_id, tool_name)


def record_performance(operation: str, duration: float, tool_name: Optional[str] = None):
    """Record performance metric directly"""
    get_performance_bridge().record_direct(operation, duration, tool_name)


def bridge_performance_monitoring(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main performance bridge interface
    
    Args:
        action: Action to perform (start_timer, stop_timer, record, get_metrics, flush)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics) 
        - errors: List[str] (any errors)
    """
    try:
        bridge = get_performance_bridge()
        
        result = {}
        
        if action == "start_timer":
            timer_id = bridge.start_timer(kwargs.get("operation", "unknown"))
            result = {"timer_id": timer_id}
            
        elif action == "stop_timer":
            duration = bridge.stop_timer(
                kwargs.get("timer_id", ""),
                kwargs.get("tool_name"),
                kwargs.get("session_id")
            )
            result = {"duration_seconds": duration}
            
        elif action == "record":
            bridge.record_direct(
                kwargs.get("operation", "unknown"),
                kwargs.get("duration", 0.0),
                kwargs.get("tool_name"),
                kwargs.get("session_id")
            )
            result = {"recorded": True}
            
        elif action == "get_metrics":
            result = bridge.get_quick_metrics()
            
        elif action == "get_tool_performance":
            tool_name = kwargs.get("tool_name", "")
            limit = kwargs.get("limit", 20)
            result = bridge.get_tool_performance(tool_name, limit)
            
        elif action == "flush":
            bridge.force_flush()
            result = {"flushed": True}
            
        elif action == "reset_circuit_breaker":
            bridge.reset_mcp_circuit_breaker()
            result = {"reset": True}
            
        elif action == "update_thresholds":
            bridge.update_thresholds(
                kwargs.get("tool_pattern", ""),
                kwargs.get("warning", 1.0),
                kwargs.get("critical", 5.0)
            )
            result = {"updated": True}
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            "success": True,
            "result": result,
            "metrics": {},  # Avoid recursive metrics calls
            "errors": []
        }
        
    except Exception as e:
        logger.error(f"Performance bridge action '{action}' failed: {e}")
        return {
            "success": False,
            "result": {},
            "metrics": {},
            "errors": [str(e)]
        }


if __name__ == "__main__":
    # Test the performance bridge
    bridge = PerformanceBridge()
    
    # Test timer functionality
    timer_id = bridge.start_timer("test_operation")
    time.sleep(0.01)  # Simulate work
    duration = bridge.stop_timer(timer_id, "TestTool")
    
    print(f"Recorded duration: {duration:.4f}s")
    
    # Test direct recording
    bridge.record_direct("direct_test", 0.025, "DirectTool")
    
    # Test metrics
    metrics = bridge.get_quick_metrics()
    print(f"Quick metrics: {json.dumps(metrics, indent=2)}")
    
    # Test tool-specific performance
    tool_perf = bridge.get_tool_performance("test_operation")
    print(f"Tool performance: {json.dumps(tool_perf, indent=2)}")
    
    # Test interface
    interface_result = bridge_performance_monitoring("get_metrics")
    print(f"Interface result: {interface_result['success']}")