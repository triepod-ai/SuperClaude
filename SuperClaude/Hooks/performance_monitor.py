#!/usr/bin/env python3
"""
Performance Monitor - System Performance Monitoring
Handles real-time performance tracking, alerts, and metrics collection
"""

import time
import threading
import logging
from typing import Dict, Any, Optional, List, Callable
from contextlib import contextmanager
from collections import defaultdict, deque
from dataclasses import dataclass
from enum import Enum
import statistics
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    """Performance alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class MetricType(Enum):
    """Types of performance metrics"""
    TIMING = "timing"
    COUNTER = "counter"
    GAUGE = "gauge"

@dataclass
class PerformanceAlert:
    """Performance alert data structure"""
    operation: str
    level: AlertLevel
    message: str
    timestamp: float
    actual_value: float
    threshold: float
    consecutive_violations: int

@dataclass
class PerformanceThresholds:
    """Performance thresholds configuration"""
    operation: str
    warning_threshold: float
    critical_threshold: float
    consecutive_limit: int = 3
    
class PerformanceMonitor:
    """
    Focused performance monitoring system
    Responsibility: "Monitor system performance metrics"
    """
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.counters = defaultdict(int)
        self.gauges = defaultdict(float)
        self.lock = threading.Lock()
        
        # Performance targets
        self.max_execution_time = 0.050  # 50ms target
        
        # Alert system
        self.alerts = deque(maxlen=1000)
        self.alert_callbacks = []
        self.violation_counts = defaultdict(int)
        
        # Default thresholds
        self.thresholds = {
            'hook_execution': PerformanceThresholds('hook_execution', 0.050, 0.100),
            'context_read': PerformanceThresholds('context_read', 0.010, 0.025),
            'context_write': PerformanceThresholds('context_write', 0.020, 0.050),
            'wave_detection': PerformanceThresholds('wave_detection', 0.005, 0.015),
            'wave_synthesis': PerformanceThresholds('wave_synthesis', 0.030, 0.070),
            'agent_spawn': PerformanceThresholds('agent_spawn', 0.050, 0.100),
            'result_collection': PerformanceThresholds('result_collection', 0.025, 0.050)
        }
        
        # Metrics history
        self.metrics_history = deque(maxlen=10000)  # Keep last 10k measurements
        
    @contextmanager
    def performance_timer(self, operation: str):
        """Context manager for performance timing with automatic alerting"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.record_timing(operation, duration)
    
    def record_timing(self, operation: str, duration: float):
        """
        Record timing metrics for operations with alerting
        Performance target: <50ms execution
        """
        current_time = time.time()
        
        with self.lock:
            # Record timing
            self.metrics[operation].append(duration)
            self.metrics_history.append({
                'operation': operation,
                'type': MetricType.TIMING.value,
                'value': duration,
                'timestamp': current_time
            })
            
            # Maintain reasonable history size per operation
            if len(self.metrics[operation]) > 1000:
                self.metrics[operation] = self.metrics[operation][-500:]  # Keep last 500
        
        # Check thresholds and generate alerts
        self._check_timing_thresholds(operation, duration, current_time)
    
    def record_counter(self, name: str, increment: int = 1):
        """
        Record counter metrics
        Performance target: <50ms execution
        """
        current_time = time.time()
        
        with self.lock:
            self.counters[name] += increment
            self.metrics_history.append({
                'operation': name,
                'type': MetricType.COUNTER.value,
                'value': increment,
                'timestamp': current_time
            })
    
    def record_gauge(self, name: str, value: float):
        """
        Record gauge metrics (point-in-time values)
        Performance target: <50ms execution
        """
        current_time = time.time()
        
        with self.lock:
            self.gauges[name] = value
            self.metrics_history.append({
                'operation': name,
                'type': MetricType.GAUGE.value,
                'value': value,
                'timestamp': current_time
            })
    
    def _check_timing_thresholds(self, operation: str, duration: float, timestamp: float):
        """Check timing against thresholds and generate alerts"""
        threshold_config = self.thresholds.get(operation)
        if not threshold_config:
            return
        
        alert_level = None
        threshold_value = None
        
        if duration > threshold_config.critical_threshold:
            alert_level = AlertLevel.CRITICAL
            threshold_value = threshold_config.critical_threshold
        elif duration > threshold_config.warning_threshold:
            alert_level = AlertLevel.WARNING
            threshold_value = threshold_config.warning_threshold
        
        if alert_level:
            self.violation_counts[operation] += 1
            consecutive_violations = self.violation_counts[operation]
            
            # Generate alert if consecutive violations exceed limit
            if consecutive_violations >= threshold_config.consecutive_limit:
                alert = PerformanceAlert(
                    operation=operation,
                    level=alert_level,
                    message=f"Operation '{operation}' exceeded {alert_level.value} threshold: {duration:.4f}s > {threshold_value:.4f}s",
                    timestamp=timestamp,
                    actual_value=duration,
                    threshold=threshold_value,
                    consecutive_violations=consecutive_violations
                )
                
                self._trigger_alert(alert)
                
                # Reset violation count after alerting
                self.violation_counts[operation] = 0
        else:
            # Reset violation count on successful execution
            self.violation_counts[operation] = 0
    
    def _trigger_alert(self, alert: PerformanceAlert):
        """Trigger performance alert"""
        with self.lock:
            self.alerts.append(alert)
        
        # Log alert
        log_level = logging.WARNING if alert.level == AlertLevel.WARNING else logging.CRITICAL
        logger.log(log_level, alert.message)
        
        # Call registered alert callbacks
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Alert callback failed: {e}")
    
    def register_alert_callback(self, callback: Callable[[PerformanceAlert], None]):
        """Register callback function for performance alerts"""
        self.alert_callbacks.append(callback)
    
    def set_threshold(self, operation: str, warning_threshold: float, critical_threshold: float, consecutive_limit: int = 3):
        """Set performance thresholds for specific operation"""
        self.thresholds[operation] = PerformanceThresholds(
            operation=operation,
            warning_threshold=warning_threshold,
            critical_threshold=critical_threshold,
            consecutive_limit=consecutive_limit
        )
    
    def get_metrics(self) -> Dict[str, Dict[str, float]]:
        """Get performance metrics summary"""
        with self.lock:
            summary = {}
            
            # Timing metrics
            for operation, times in self.metrics.items():
                if times:
                    summary[operation] = {
                        'avg': sum(times) / len(times),
                        'min': min(times),
                        'max': max(times),
                        'count': len(times),
                        'total': sum(times),
                        'p95': self._calculate_percentile(times, 95),
                        'p99': self._calculate_percentile(times, 99)
                    }
            
            return summary
    
    def get_counters(self) -> Dict[str, int]:
        """Get counter metrics"""
        with self.lock:
            return dict(self.counters)
    
    def get_gauges(self) -> Dict[str, float]:
        """Get gauge metrics"""
        with self.lock:
            return dict(self.gauges)
    
    def get_recent_alerts(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get recent performance alerts"""
        with self.lock:
            recent_alerts = list(self.alerts)[-count:]
            return [
                {
                    'operation': alert.operation,
                    'level': alert.level.value,
                    'message': alert.message,
                    'timestamp': alert.timestamp,
                    'actual_value': alert.actual_value,
                    'threshold': alert.threshold,
                    'consecutive_violations': alert.consecutive_violations
                }
                for alert in recent_alerts
            ]
    
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile for a list of values"""
        if not values:
            return 0.0
        
        try:
            return statistics.quantiles(sorted(values), n=100)[percentile - 1]
        except (IndexError, statistics.StatisticsError):
            # Fallback for edge cases
            sorted_values = sorted(values)
            index = int((percentile / 100.0) * len(sorted_values))
            return sorted_values[min(index, len(sorted_values) - 1)]
    
    def alert_on_threshold(self, operation: str, threshold: float) -> bool:
        """
        Check if operation exceeds threshold (legacy interface)
        Performance target: <50ms execution
        """
        with self.lock:
            if operation in self.metrics and self.metrics[operation]:
                recent = self.metrics[operation][-5:]  # Last 5 operations
                avg = sum(recent) / len(recent)
                return avg > threshold
        return False
    
    def get_operation_statistics(self, operation: str, window_minutes: int = 60) -> Dict[str, Any]:
        """Get detailed statistics for specific operation"""
        current_time = time.time()
        window_start = current_time - (window_minutes * 60)
        
        with self.lock:
            # Filter metrics within time window
            recent_metrics = [
                m for m in self.metrics_history
                if m['operation'] == operation and m['timestamp'] >= window_start
            ]
            
            if not recent_metrics:
                return {"operation": operation, "no_data": True}
            
            timing_values = [m['value'] for m in recent_metrics if m['type'] == MetricType.TIMING.value]
            
            if timing_values:
                return {
                    "operation": operation,
                    "window_minutes": window_minutes,
                    "count": len(timing_values),
                    "avg": sum(timing_values) / len(timing_values),
                    "min": min(timing_values),
                    "max": max(timing_values),
                    "median": statistics.median(timing_values),
                    "p95": self._calculate_percentile(timing_values, 95),
                    "p99": self._calculate_percentile(timing_values, 99),
                    "std_dev": statistics.stdev(timing_values) if len(timing_values) > 1 else 0.0,
                    "threshold_violations": len([v for v in timing_values if v > self.thresholds.get(operation, PerformanceThresholds(operation, 0.1, 0.2)).warning_threshold])
                }
            else:
                return {"operation": operation, "no_timing_data": True}
    
    def get_comprehensive_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        timing_metrics = self.get_metrics()
        counters = self.get_counters()
        gauges = self.get_gauges()
        recent_alerts = self.get_recent_alerts(20)
        
        # Calculate overall system health score
        health_score = self._calculate_health_score(timing_metrics, recent_alerts)
        
        return {
            "timestamp": time.time(),
            "timing_metrics": timing_metrics,
            "counters": counters,
            "gauges": gauges,
            "recent_alerts": recent_alerts,
            "health_score": health_score,
            "thresholds": {op: {
                "warning": thresh.warning_threshold,
                "critical": thresh.critical_threshold,
                "consecutive_limit": thresh.consecutive_limit
            } for op, thresh in self.thresholds.items()},
            "system_info": {
                "total_metrics_recorded": len(self.metrics_history),
                "active_operations": len(self.metrics),
                "alert_callbacks_registered": len(self.alert_callbacks)
            }
        }
    
    def _calculate_health_score(self, timing_metrics: Dict[str, Any], recent_alerts: List[Dict[str, Any]]) -> float:
        """Calculate overall system health score (0.0 - 1.0)"""
        if not timing_metrics:
            return 1.0
        
        health_factors = []
        
        # Factor 1: Average performance vs thresholds
        for operation, metrics in timing_metrics.items():
            threshold_config = self.thresholds.get(operation)
            if threshold_config:
                avg_time = metrics['avg']
                if avg_time <= threshold_config.warning_threshold:
                    health_factors.append(1.0)
                elif avg_time <= threshold_config.critical_threshold:
                    health_factors.append(0.7)
                else:
                    health_factors.append(0.3)
        
        # Factor 2: Recent alerts impact
        alert_penalty = 0.0
        critical_alerts = len([a for a in recent_alerts if a['level'] == 'critical'])
        warning_alerts = len([a for a in recent_alerts if a['level'] == 'warning'])
        
        alert_penalty = (critical_alerts * 0.1) + (warning_alerts * 0.05)
        
        # Calculate final health score
        base_health = sum(health_factors) / len(health_factors) if health_factors else 1.0
        final_health = max(0.0, base_health - alert_penalty)
        
        return round(final_health, 2)
    
    def reset_metrics(self, operation: Optional[str] = None):
        """Reset metrics for specific operation or all operations"""
        with self.lock:
            if operation:
                if operation in self.metrics:
                    self.metrics[operation].clear()
                if operation in self.counters:
                    self.counters[operation] = 0
                if operation in self.gauges:
                    del self.gauges[operation]
            else:
                self.metrics.clear()
                self.counters.clear()
                self.gauges.clear()
                self.metrics_history.clear()
                self.alerts.clear()

# Global instance
_performance_monitor = None

def get_performance_monitor():
    """Get global performance monitor instance"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor

def monitor_performance(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main performance monitoring interface
    
    Args:
        action: Action to perform (record_timing, get_metrics, get_report, set_threshold)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        monitor = get_performance_monitor()
        
        result = {}
        
        if action == "record_timing":
            monitor.record_timing(
                kwargs.get("operation", ""),
                kwargs.get("duration", 0.0)
            )
            result = {"recorded": True}
            
        elif action == "record_counter":
            monitor.record_counter(
                kwargs.get("name", ""),
                kwargs.get("increment", 1)
            )
            result = {"recorded": True}
            
        elif action == "record_gauge":
            monitor.record_gauge(
                kwargs.get("name", ""),
                kwargs.get("value", 0.0)
            )
            result = {"recorded": True}
            
        elif action == "get_metrics":
            result = {
                "timing_metrics": monitor.get_metrics(),
                "counters": monitor.get_counters(),
                "gauges": monitor.get_gauges()
            }
            
        elif action == "get_report":
            result = monitor.get_comprehensive_report()
            
        elif action == "get_alerts":
            count = kwargs.get("count", 10)
            result = {"alerts": monitor.get_recent_alerts(count)}
            
        elif action == "set_threshold":
            monitor.set_threshold(
                kwargs.get("operation", ""),
                kwargs.get("warning_threshold", 0.1),
                kwargs.get("critical_threshold", 0.2),
                kwargs.get("consecutive_limit", 3)
            )
            result = {"threshold_set": True}
            
        elif action == "get_operation_stats":
            operation = kwargs.get("operation", "")
            window_minutes = kwargs.get("window_minutes", 60)
            result = monitor.get_operation_statistics(operation, window_minutes)
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': {},  # Avoid recursive metrics
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Performance monitoring action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }

# Convenience functions for easy integration
def record_timing(operation: str, duration: float):
    """Record timing metric"""
    get_performance_monitor().record_timing(operation, duration)

def performance_timer(operation: str):
    """Get performance timer context manager"""
    return get_performance_monitor().performance_timer(operation)

def get_metrics_summary():
    """Get quick metrics summary"""
    monitor = get_performance_monitor()
    return {
        'timing_metrics': monitor.get_metrics(),
        'counters': monitor.get_counters(),
        'recent_alerts': monitor.get_recent_alerts(5),
        'health_score': monitor._calculate_health_score(monitor.get_metrics(), monitor.get_recent_alerts(10))
    }

if __name__ == "__main__":
    # Test the performance monitor
    monitor = PerformanceMonitor()
    
    # Test timing recording
    with monitor.performance_timer("test_operation"):
        time.sleep(0.01)  # Simulate work
    
    # Test counter and gauge
    monitor.record_counter("test_counter", 5)
    monitor.record_gauge("test_gauge", 42.5)
    
    # Test threshold setting
    monitor.set_threshold("test_operation", 0.005, 0.015)
    
    # Trigger threshold violation
    monitor.record_timing("test_operation", 0.020)  # Should trigger alert
    
    # Get comprehensive report
    report = monitor.get_comprehensive_report()
    print(f"Performance report: {json.dumps(report, indent=2)}")
    
    # Get operation statistics
    stats = monitor.get_operation_statistics("test_operation")
    print(f"Operation stats: {stats}")
    
    # Get recent alerts
    alerts = monitor.get_recent_alerts()
    print(f"Recent alerts: {alerts}")