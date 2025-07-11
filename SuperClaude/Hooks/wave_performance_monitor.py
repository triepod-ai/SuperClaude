#!/usr/bin/env python3
"""
Wave Performance Monitor - Advanced Performance Analytics and Optimization
Real-time monitoring with automated optimization recommendations
"""

import json
import os
import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple, Callable
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import statistics
import asyncio
import weakref
import logging
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from enum import Enum
import pickle
import uuid

# Optional imports with fallbacks
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    import numpy as np  # type: ignore
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MetricType(Enum):
    """Types of performance metrics"""
    TIMING = "timing"
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"

class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    name: str
    value: float
    timestamp: float
    metric_type: MetricType
    tags: Dict[str, str]
    context: Dict[str, Any]

@dataclass
class PerformanceAlert:
    """Performance alert data structure"""
    metric_name: str
    level: AlertLevel
    message: str
    timestamp: float
    threshold: float
    actual_value: float
    context: Dict[str, Any]

@dataclass
class OptimizationRecommendation:
    """Optimization recommendation data structure"""
    category: str
    priority: str
    description: str
    impact: str
    implementation: str
    estimated_improvement: float
    resources_required: str

class PerformanceProfiler:
    """Advanced performance profiling with statistical analysis"""
    
    def __init__(self, window_size: int = 1000):
        self.window_size = window_size
        self.metrics = defaultdict(lambda: deque(maxlen=window_size))
        self.lock = threading.RLock()
        
    def record_metric(self, metric: PerformanceMetric):
        """Record a performance metric"""
        with self.lock:
            self.metrics[metric.name].append(metric)
    
    def get_statistics(self, metric_name: str) -> Dict[str, float]:
        """Get statistical analysis of a metric"""
        with self.lock:
            if metric_name not in self.metrics:
                return {}
            
            values = [m.value for m in self.metrics[metric_name]]
            if not values:
                return {}
            
            return {
                'count': len(values),
                'mean': statistics.mean(values),
                'median': statistics.median(values),
                'std_dev': statistics.stdev(values) if len(values) > 1 else 0,
                'min': min(values),
                'max': max(values),
                'p95': self._calculate_percentile(values, 95) if len(values) > 1 else values[0],
                'p99': self._calculate_percentile(values, 99) if len(values) > 1 else values[0],
                'recent_trend': self._calculate_trend(values[-20:]) if len(values) >= 20 else 0
            }
    
    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile with fallback for when numpy is not available"""
        if HAS_NUMPY:
            return np.percentile(values, percentile)
        else:
            # Fallback implementation using sorted values
            sorted_values = sorted(values)
            n = len(sorted_values)
            k = (percentile / 100.0) * (n - 1)
            f = int(k)
            c = k - f
            if f + 1 < n:
                return sorted_values[f] * (1 - c) + sorted_values[f + 1] * c
            else:
                return sorted_values[f]
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate trend using simple linear regression"""
        if len(values) < 2:
            return 0.0
        
        n = len(values)
        x = list(range(n))
        
        # Calculate linear regression slope
        x_mean = statistics.mean(x)
        y_mean = statistics.mean(values)
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        return numerator / denominator if denominator != 0 else 0.0
    
    def detect_anomalies(self, metric_name: str, threshold_factor: float = 3.0) -> List[PerformanceMetric]:
        """Detect anomalies using statistical analysis"""
        with self.lock:
            if metric_name not in self.metrics:
                return []
            
            recent_metrics = list(self.metrics[metric_name])[-100:]  # Last 100 samples
            if len(recent_metrics) < 10:
                return []
            
            values = [m.value for m in recent_metrics]
            mean = statistics.mean(values)
            std_dev = statistics.stdev(values) if len(values) > 1 else 0
            
            if std_dev == 0:
                return []
            
            # Detect outliers beyond threshold_factor standard deviations
            anomalies = []
            for metric in recent_metrics[-10:]:  # Check last 10 samples
                if abs(metric.value - mean) > threshold_factor * std_dev:
                    anomalies.append(metric)
            
            return anomalies

class ResourceMonitor:
    """System resource monitoring for performance optimization"""
    
    def __init__(self, sampling_interval: float = 1.0):
        self.sampling_interval = sampling_interval
        self.monitoring = False
        self.metrics_history = defaultdict(lambda: deque(maxlen=300))  # 5 minutes at 1s interval
        self.lock = threading.Lock()
        
    def start_monitoring(self):
        """Start resource monitoring"""
        self.monitoring = True
        threading.Thread(target=self._monitoring_loop, daemon=True).start()
    
    def stop_monitoring(self):
        """Stop resource monitoring"""
        self.monitoring = False
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring:
            try:
                # System metrics with fallback for when psutil is not available
                if HAS_PSUTIL:
                    # CPU usage
                    cpu_percent = psutil.cpu_percent(interval=None)
                    
                    # Memory usage
                    memory = psutil.virtual_memory()
                    memory_percent = memory.percent
                    memory_available = memory.available / (1024 * 1024)  # MB
                    
                    # Disk I/O
                    disk_io = psutil.disk_io_counters()
                    disk_read_mb = disk_io.read_bytes / (1024 * 1024) if disk_io else 0
                    disk_write_mb = disk_io.write_bytes / (1024 * 1024) if disk_io else 0
                    
                    # Network I/O
                    network_io = psutil.net_io_counters()
                    network_sent_mb = network_io.bytes_sent / (1024 * 1024) if network_io else 0
                    network_recv_mb = network_io.bytes_recv / (1024 * 1024) if network_io else 0
                else:
                    # Fallback values when psutil is not available
                    cpu_percent = 0.0
                    memory_percent = 0.0
                    memory_available = 0.0
                    disk_read_mb = 0.0
                    disk_write_mb = 0.0
                    network_sent_mb = 0.0
                    network_recv_mb = 0.0
                
                timestamp = time.time()
                
                with self.lock:
                    self.metrics_history['cpu_percent'].append((timestamp, cpu_percent))
                    self.metrics_history['memory_percent'].append((timestamp, memory_percent))
                    self.metrics_history['memory_available_mb'].append((timestamp, memory_available))
                    self.metrics_history['disk_read_mb'].append((timestamp, disk_read_mb))
                    self.metrics_history['disk_write_mb'].append((timestamp, disk_write_mb))
                    self.metrics_history['network_sent_mb'].append((timestamp, network_sent_mb))
                    self.metrics_history['network_recv_mb'].append((timestamp, network_recv_mb))
                
                time.sleep(self.sampling_interval)
                
            except Exception as e:
                logger.error(f"Resource monitoring error: {e}")
                time.sleep(self.sampling_interval)
    
    def get_current_stats(self) -> Dict[str, Any]:
        """Get current resource statistics"""
        with self.lock:
            stats = {}
            
            for metric_name, history in self.metrics_history.items():
                if history:
                    recent_values = [value for timestamp, value in list(history)[-10:]]
                    stats[metric_name] = {
                        'current': recent_values[-1] if recent_values else 0,
                        'avg_10s': statistics.mean(recent_values) if recent_values else 0,
                        'max_10s': max(recent_values) if recent_values else 0,
                        'trend': self._calculate_trend([v for _, v in list(history)[-30:]])
                    }
            
            return stats
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate trend for resource metrics"""
        if len(values) < 2:
            return 0.0
        
        # Simple moving average trend
        if len(values) >= 10:
            first_half = statistics.mean(values[:len(values)//2])
            second_half = statistics.mean(values[len(values)//2:])
            return (second_half - first_half) / first_half if first_half != 0 else 0.0
        
        return 0.0

class WavePerformanceMonitor:
    """Advanced Wave Performance Monitoring System"""
    
    def __init__(self, base_path: Optional[Path] = None):
        self.base_path = base_path or Path.cwd()
        self.metrics_file = self.base_path / "wave_performance_metrics.json"
        
        # Core components
        self.profiler = PerformanceProfiler()
        self.resource_monitor = ResourceMonitor()
        self.alerts = deque(maxlen=1000)
        self.recommendations = []
        
        # Performance thresholds
        self.thresholds = {
            'hook_execution': 0.1,      # 100ms
            'context_read': 0.02,       # 20ms
            'context_write': 0.05,      # 50ms
            'wave_detection': 0.01,     # 10ms
            'context_compression': 0.02, # 20ms
            'wave_transition': 0.1,     # 100ms
            'intelligence_accumulation': 0.05,  # 50ms
            'compound_intelligence_build': 0.03 # 30ms
        }
        
        # System resource thresholds
        self.resource_thresholds = {
            'cpu_percent': 80.0,
            'memory_percent': 85.0,
            'memory_available_mb': 500.0,  # Minimum 500MB
            'disk_io_rate': 100.0  # MB/s
        }
        
        # Thread safety
        self.lock = threading.RLock()
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Start monitoring
        self.resource_monitor.start_monitoring()
        
        # Performance tracking
        self.operation_counts = defaultdict(int)
        self.error_counts = defaultdict(int)
        self.session_start_time = time.time()
        
        # Optimization state
        self.optimization_history = []
        self.auto_optimization_enabled = True
        
        # Ensure directory exists
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Load existing metrics
        self._load_metrics()
    
    def _load_metrics(self):
        """Load existing metrics from file"""
        if self.metrics_file.exists():
            try:
                with open(self.metrics_file, 'r') as f:
                    data = json.load(f)
                    
                    # Restore thresholds
                    if 'thresholds' in data:
                        self.thresholds.update(data['thresholds'])
                    
                    # Restore optimization history
                    if 'optimization_history' in data:
                        self.optimization_history = data['optimization_history']
                        
            except Exception as e:
                logger.error(f"Failed to load metrics: {e}")
    
    def _save_metrics(self):
        """Save metrics to file"""
        try:
            data = {
                'thresholds': self.thresholds,
                'optimization_history': self.optimization_history,
                'session_stats': self.get_session_stats(),
                'timestamp': time.time()
            }
            
            with open(self.metrics_file, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")
    
    @contextmanager
    def measure_performance(self, operation_name: str, **context):
        """Context manager for performance measurement"""
        start_time = time.time()
        
        try:
            yield
            
        except Exception as e:
            # Record error
            self.error_counts[operation_name] += 1
            logger.error(f"Operation {operation_name} failed: {e}")
            raise
            
        finally:
            # Record timing
            duration = time.time() - start_time
            self.record_timing(operation_name, duration, context)
    
    def record_timing(self, operation_name: str, duration: float, context: Dict[str, Any] = None):
        """Record timing metric"""
        with self.lock:
            metric = PerformanceMetric(
                name=operation_name,
                value=duration,
                timestamp=time.time(),
                metric_type=MetricType.TIMING,
                tags={'operation': operation_name},
                context=context or {}
            )
            
            self.profiler.record_metric(metric)
            self.operation_counts[operation_name] += 1
            
            # Check for threshold violations
            if operation_name in self.thresholds:
                threshold = self.thresholds[operation_name]
                if duration > threshold:
                    self._create_alert(
                        metric_name=operation_name,
                        level=AlertLevel.WARNING,
                        message=f"Operation {operation_name} exceeded threshold: {duration:.4f}s > {threshold:.4f}s",
                        threshold=threshold,
                        actual_value=duration,
                        context=context or {}
                    )
    
    def record_counter(self, counter_name: str, value: float = 1.0, context: Dict[str, Any] = None):
        """Record counter metric"""
        with self.lock:
            metric = PerformanceMetric(
                name=counter_name,
                value=value,
                timestamp=time.time(),
                metric_type=MetricType.COUNTER,
                tags={'counter': counter_name},
                context=context or {}
            )
            
            self.profiler.record_metric(metric)
    
    def record_gauge(self, gauge_name: str, value: float, context: Dict[str, Any] = None):
        """Record gauge metric"""
        with self.lock:
            metric = PerformanceMetric(
                name=gauge_name,
                value=value,
                timestamp=time.time(),
                metric_type=MetricType.GAUGE,
                tags={'gauge': gauge_name},
                context=context or {}
            )
            
            self.profiler.record_metric(metric)
    
    def _create_alert(self, metric_name: str, level: AlertLevel, message: str, 
                     threshold: float, actual_value: float, context: Dict[str, Any]):
        """Create performance alert"""
        alert = PerformanceAlert(
            metric_name=metric_name,
            level=level,
            message=message,
            timestamp=time.time(),
            threshold=threshold,
            actual_value=actual_value,
            context=context
        )
        
        self.alerts.append(alert)
        
        # Log alert
        if level == AlertLevel.CRITICAL:
            logger.critical(message)
        elif level == AlertLevel.ERROR:
            logger.error(message)
        elif level == AlertLevel.WARNING:
            logger.warning(message)
        else:
            logger.info(message)
        
        # Trigger auto-optimization if enabled
        if self.auto_optimization_enabled and level in [AlertLevel.WARNING, AlertLevel.ERROR]:
            self._trigger_auto_optimization(metric_name, alert)
    
    def _trigger_auto_optimization(self, metric_name: str, alert: PerformanceAlert):
        """Trigger automatic optimization based on alert"""
        try:
            # Generate optimization recommendations
            recommendations = self.generate_optimization_recommendations(metric_name)
            
            # Apply automatic optimizations
            for recommendation in recommendations:
                if recommendation.priority == 'high' and 'auto_apply' in recommendation.implementation:
                    self._apply_optimization(recommendation)
                    
        except Exception as e:
            logger.error(f"Auto-optimization failed: {e}")
    
    def _apply_optimization(self, recommendation: OptimizationRecommendation):
        """Apply optimization recommendation"""
        try:
            # Record optimization attempt
            self.optimization_history.append({
                'timestamp': time.time(),
                'recommendation': asdict(recommendation),
                'applied': True
            })
            
            # Apply specific optimizations
            if 'increase_cache_size' in recommendation.implementation:
                # This would be implemented by the specific components
                logger.info(f"Applied optimization: {recommendation.description}")
            
        except Exception as e:
            logger.error(f"Failed to apply optimization: {e}")
    
    def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard"""
        dashboard = {
            'system_health': self._get_system_health(),
            'performance_metrics': self._get_performance_metrics(),
            'resource_usage': self.resource_monitor.get_current_stats(),
            'alerts': [asdict(alert) for alert in list(self.alerts)[-10:]],
            'recommendations': [asdict(rec) for rec in self.recommendations],
            'session_stats': self.get_session_stats(),
            'optimization_history': self.optimization_history[-10:]
        }
        
        return dashboard
    
    def _get_system_health(self) -> Dict[str, Any]:
        """Get overall system health assessment"""
        # Count recent alerts by level
        recent_alerts = [alert for alert in self.alerts if time.time() - alert.timestamp < 300]  # Last 5 minutes
        
        alert_counts = defaultdict(int)
        for alert in recent_alerts:
            alert_counts[alert.level.value] += 1
        
        # Calculate health score
        health_score = 100.0
        health_score -= alert_counts['critical'] * 20
        health_score -= alert_counts['error'] * 10
        health_score -= alert_counts['warning'] * 5
        health_score = max(0, health_score)
        
        # Determine health status
        if health_score >= 90:
            status = 'excellent'
        elif health_score >= 75:
            status = 'good'
        elif health_score >= 50:
            status = 'degraded'
        else:
            status = 'poor'
        
        return {
            'health_score': health_score,
            'status': status,
            'recent_alerts': alert_counts,
            'uptime': time.time() - self.session_start_time
        }
    
    def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        metrics = {}
        
        for operation_name in self.thresholds.keys():
            stats = self.profiler.get_statistics(operation_name)
            if stats:
                metrics[operation_name] = {
                    'statistics': stats,
                    'threshold': self.thresholds[operation_name],
                    'threshold_violations': len([
                        alert for alert in self.alerts 
                        if alert.metric_name == operation_name and time.time() - alert.timestamp < 3600
                    ]),
                    'operation_count': self.operation_counts[operation_name],
                    'error_count': self.error_counts[operation_name]
                }
        
        return metrics
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get current session statistics"""
        return {
            'session_duration': time.time() - self.session_start_time,
            'total_operations': sum(self.operation_counts.values()),
            'total_errors': sum(self.error_counts.values()),
            'operations_per_second': sum(self.operation_counts.values()) / (time.time() - self.session_start_time),
            'error_rate': sum(self.error_counts.values()) / max(1, sum(self.operation_counts.values())),
            'most_frequent_operations': sorted(self.operation_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    
    def generate_optimization_recommendations(self, focus_metric: str = None) -> List[OptimizationRecommendation]:
        """Generate optimization recommendations"""
        recommendations = []
        
        # Performance-based recommendations
        if focus_metric:
            stats = self.profiler.get_statistics(focus_metric)
            if stats and stats['mean'] > self.thresholds.get(focus_metric, 0.1):
                recommendations.append(OptimizationRecommendation(
                    category='performance',
                    priority='high',
                    description=f"Optimize {focus_metric} operation",
                    impact=f"Could improve {focus_metric} by {stats['mean'] / self.thresholds.get(focus_metric, 0.1):.1f}x",
                    implementation=f"auto_apply: optimize_{focus_metric}_operation",
                    estimated_improvement=0.5,
                    resources_required='low'
                ))
        
        # Resource-based recommendations
        resource_stats = self.resource_monitor.get_current_stats()
        
        if resource_stats.get('memory_percent', {}).get('current', 0) > 80:
            recommendations.append(OptimizationRecommendation(
                category='memory',
                priority='high',
                description='Reduce memory usage',
                impact='Prevent memory-related performance degradation',
                implementation='increase_cache_ttl, reduce_context_retention',
                estimated_improvement=0.3,
                resources_required='medium'
            ))
        
        if resource_stats.get('cpu_percent', {}).get('current', 0) > 70:
            recommendations.append(OptimizationRecommendation(
                category='cpu',
                priority='medium',
                description='Optimize CPU usage',
                impact='Reduce CPU load and improve responsiveness',
                implementation='reduce_compression_level, increase_cache_size',
                estimated_improvement=0.2,
                resources_required='low'
            ))
        
        # Historical recommendations
        if len(self.optimization_history) < 3:  # Not enough optimization history
            recommendations.append(OptimizationRecommendation(
                category='monitoring',
                priority='low',
                description='Enable more aggressive monitoring',
                impact='Better performance insights',
                implementation='increase_monitoring_frequency',
                estimated_improvement=0.1,
                resources_required='low'
            ))
        
        self.recommendations = recommendations
        return recommendations
    
    def detect_performance_anomalies(self) -> List[Dict[str, Any]]:
        """Detect performance anomalies across all metrics"""
        anomalies = []
        
        for operation_name in self.thresholds.keys():
            detected_anomalies = self.profiler.detect_anomalies(operation_name)
            
            for anomaly in detected_anomalies:
                anomalies.append({
                    'metric': operation_name,
                    'value': anomaly.value,
                    'timestamp': anomaly.timestamp,
                    'severity': 'high' if anomaly.value > self.thresholds[operation_name] * 2 else 'medium',
                    'context': anomaly.context
                })
        
        return anomalies
    
    def optimize_thresholds(self):
        """Automatically optimize performance thresholds based on historical data"""
        for operation_name in self.thresholds.keys():
            stats = self.profiler.get_statistics(operation_name)
            
            if stats and stats['count'] > 50:  # Enough data points
                # Set threshold to 95th percentile + 20% buffer
                new_threshold = stats['p95'] * 1.2
                
                # Don't make thresholds too aggressive
                min_threshold = self.thresholds[operation_name] * 0.5
                max_threshold = self.thresholds[operation_name] * 2.0
                
                new_threshold = max(min_threshold, min(new_threshold, max_threshold))
                
                if abs(new_threshold - self.thresholds[operation_name]) > 0.01:
                    logger.info(f"Optimized threshold for {operation_name}: "
                               f"{self.thresholds[operation_name]:.4f} -> {new_threshold:.4f}")
                    self.thresholds[operation_name] = new_threshold
    
    def export_performance_report(self) -> str:
        """Export comprehensive performance report"""
        report = {
            'report_timestamp': datetime.now().isoformat(),
            'session_stats': self.get_session_stats(),
            'performance_metrics': self._get_performance_metrics(),
            'system_health': self._get_system_health(),
            'resource_usage': self.resource_monitor.get_current_stats(),
            'anomalies': self.detect_performance_anomalies(),
            'recommendations': [asdict(rec) for rec in self.recommendations],
            'optimization_history': self.optimization_history,
            'alerts_summary': {
                'total_alerts': len(self.alerts),
                'critical_alerts': len([a for a in self.alerts if a.level == AlertLevel.CRITICAL]),
                'error_alerts': len([a for a in self.alerts if a.level == AlertLevel.ERROR]),
                'warning_alerts': len([a for a in self.alerts if a.level == AlertLevel.WARNING])
            }
        }
        
        return json.dumps(report, indent=2)
    
    def cleanup_resources(self):
        """Cleanup resources and save metrics"""
        try:
            self.resource_monitor.stop_monitoring()
            self.executor.shutdown(wait=True)
            self._save_metrics()
            logger.info("Performance monitor cleaned up successfully")
        except Exception as e:
            logger.error(f"Performance monitor cleanup failed: {e}")

# Global instance
_monitor = None

def get_monitor() -> WavePerformanceMonitor:
    """Get global monitor instance"""
    global _monitor
    if _monitor is None:
        _monitor = WavePerformanceMonitor()
    return _monitor

# Convenience functions
def measure_performance(operation_name: str, **context):
    """Measure performance context manager"""
    return get_monitor().measure_performance(operation_name, **context)

def record_timing(operation_name: str, duration: float, context: Dict[str, Any] = None):
    """Record timing metric"""
    get_monitor().record_timing(operation_name, duration, context)

def get_performance_dashboard() -> Dict[str, Any]:
    """Get performance dashboard"""
    return get_monitor().get_performance_dashboard()

def generate_optimization_recommendations(focus_metric: str = None) -> List[OptimizationRecommendation]:
    """Generate optimization recommendations"""
    return get_monitor().generate_optimization_recommendations(focus_metric)

class PerformanceHookHandler:
    """Claude Code hook event handler for performance monitoring"""
    
    def __init__(self):
        self.monitor = WavePerformanceMonitor()
        
    def handle_pretool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PreToolUse hook event for performance monitoring"""
        try:
            # Extract tool call information
            tool_call = hook_data.get('tool_call', {})
            tool_name = tool_call.get('name', '')
            
            # Start performance monitoring for this operation
            operation_id = f"{tool_name}_{int(time.time() * 1000)}"
            
            # Get current performance metrics
            dashboard = self.monitor.get_performance_dashboard()
            
            # Check for performance warnings
            warnings = self.check_performance_warnings(dashboard)
            
            return {
                "continue": True,
                "performance_monitoring": True,
                "operation_id": operation_id,
                "current_metrics": dashboard.get("summary", {}),
                "warnings": warnings,
                "recommendations": [rec.to_dict() if hasattr(rec, 'to_dict') else str(rec) for rec in self.monitor.generate_optimization_recommendations()]
            }
                
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "performance_monitoring": False
            }
    
    def handle_subagent_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle SubagentStop hook event for performance analysis"""
        try:
            # Extract agent performance data
            agent_info = hook_data.get('agent_info', {})
            agent_result = hook_data.get('result', {})
            
            # Record performance metrics for completed agent
            agent_name = agent_info.get('name', 'unknown_agent')
            completion_time = time.time()
            
            # Analyze agent performance
            performance_analysis = self.analyze_agent_performance(agent_info, agent_result)
            
            # Update performance metrics (if method exists)
            if hasattr(self.monitor, 'record_agent_performance'):
                self.monitor.record_agent_performance(agent_name, performance_analysis)
            
            # Get updated dashboard
            dashboard = self.monitor.get_performance_dashboard()
            
            # Generate recommendations based on latest performance
            recommendations = self.monitor.generate_optimization_recommendations()
            
            return {
                "continue": True,
                "performance_analysis": True,
                "agent_name": agent_name,
                "performance_metrics": performance_analysis,
                "dashboard": dashboard.get("summary", {}),
                "recommendations": [rec.to_dict() if hasattr(rec, 'to_dict') else str(rec) for rec in recommendations[:3]]  # Top 3 recommendations
            }
                
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "performance_analysis": False
            }
    
    def handle_notification(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Notification hook event for performance alerts"""
        try:
            notification = hook_data.get('notification', {})
            notification_type = notification.get('type', '')
            
            # Generate performance dashboard for notifications
            dashboard = self.monitor.get_performance_dashboard()
            
            # Check if this is a performance-related notification
            performance_relevant = self.is_performance_notification(notification)
            
            if performance_relevant:
                # Generate performance insights
                insights = self.generate_performance_insights(dashboard)
                
                return {
                    "continue": True,
                    "performance_insights": True,
                    "dashboard": dashboard.get("summary", {}),
                    "insights": insights,
                    "recommendations": [rec.to_dict() if hasattr(rec, 'to_dict') else str(rec) for rec in self.monitor.generate_optimization_recommendations()[:2]]
                }
            else:
                return {
                    "continue": True,
                    "performance_insights": False
                }
                
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "performance_insights": False
            }
    
    def handle_post_tool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PostToolUse hook event for post-execution performance analysis"""
        try:
            # Extract tool execution information
            tool_call = hook_data.get('tool_call', {})
            tool_result = hook_data.get('result', {})
            tool_name = tool_call.get('name', '')
            
            # Record post-execution metrics
            execution_time = hook_data.get('execution_time', 0)
            if execution_time > 0:
                self.monitor.record_timing(f"{tool_name}_execution", execution_time)
            
            # Analyze execution success/failure
            execution_success = 'error' not in tool_result
            if not execution_success:
                self.monitor.record_counter(f"{tool_name}_errors", 1.0)
            
            # Record resource usage if available
            if 'resource_usage' in tool_result:
                resource_usage = tool_result['resource_usage']
                if 'memory_mb' in resource_usage:
                    self.monitor.record_gauge(f"{tool_name}_memory_usage", resource_usage['memory_mb'])
                if 'cpu_percent' in resource_usage:
                    self.monitor.record_gauge(f"{tool_name}_cpu_usage", resource_usage['cpu_percent'])
            
            # Get updated performance dashboard
            dashboard = self.monitor.get_performance_dashboard()
            
            # Generate optimization recommendations
            recommendations = self.monitor.generate_optimization_recommendations()
            
            return {
                "continue": True,
                "post_execution_analysis": True,
                "tool_name": tool_name,
                "execution_success": execution_success,
                "execution_time": execution_time,
                "performance_dashboard": dashboard.get("system_health", {}),
                "recommendations": [rec.to_dict() if hasattr(rec, 'to_dict') else str(rec) for rec in recommendations[:2]]
            }
            
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "post_execution_analysis": False
            }
    
    def handle_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Stop hook event for final performance reporting"""
        try:
            # Extract stop information
            stop_reason = hook_data.get('reason', 'normal_shutdown')
            
            # Generate final performance report
            final_report = self.monitor.export_performance_report()
            
            # Get comprehensive metrics
            final_metrics = self.monitor.get_performance_dashboard()
            
            # Cleanup resources
            self.monitor.cleanup_resources()
            
            return {
                "continue": True,
                "graceful_shutdown": True,
                "stop_reason": stop_reason,
                "final_performance_report": final_report[:1000],  # Truncate for output
                "final_metrics": final_metrics.get("system_health", {}),
                "cleanup_completed": True
            }
            
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "graceful_shutdown": False
            }
    
    def check_performance_warnings(self, dashboard: Dict[str, Any]) -> List[str]:
        """Check for performance warnings"""
        warnings = []
        summary = dashboard.get("summary", {})
        
        # Check resource usage
        if summary.get("memory_usage_mb", 0) > 1000:  # > 1GB
            warnings.append("High memory usage detected")
        
        # Check operation times
        avg_operation_time = summary.get("avg_operation_time", 0)
        if avg_operation_time > 5.0:  # > 5 seconds
            warnings.append("Slow operation times detected")
        
        # Check error rate
        error_rate = summary.get("error_rate", 0)
        if error_rate > 0.1:  # > 10%
            warnings.append("High error rate detected")
        
        return warnings
    
    def analyze_agent_performance(self, agent_info: Dict[str, Any], agent_result: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze individual agent performance"""
        return {
            "agent_type": agent_info.get('type', 'unknown'),
            "execution_time": agent_info.get('execution_time', 0),
            "memory_usage": agent_info.get('memory_usage', 0),
            "token_usage": agent_result.get('token_count', 0),
            "success": agent_result.get('success', True),
            "complexity_score": len(str(agent_result)) / 1000,  # Simple complexity metric
            "timestamp": time.time()
        }
    
    def is_performance_notification(self, notification: Dict[str, Any]) -> bool:
        """Check if notification is performance-related"""
        performance_keywords = ['slow', 'timeout', 'memory', 'performance', 'optimization', 'resource']
        notification_text = str(notification).lower()
        
        return any(keyword in notification_text for keyword in performance_keywords)
    
    def generate_performance_insights(self, dashboard: Dict[str, Any]) -> List[str]:
        """Generate performance insights from dashboard data"""
        insights = []
        summary = dashboard.get("summary", {})
        
        # Memory insights
        memory_usage = summary.get("memory_usage_mb", 0)
        if memory_usage > 500:
            insights.append(f"Memory usage is {memory_usage:.1f}MB - consider optimization")
        
        # Operation time insights
        avg_time = summary.get("avg_operation_time", 0)
        if avg_time > 2.0:
            insights.append(f"Average operation time is {avg_time:.2f}s - consider parallelization")
        
        # Resource efficiency insights
        efficiency = summary.get("efficiency_score", 0)
        if efficiency < 0.7:
            insights.append(f"Efficiency score is {efficiency:.2f} - room for improvement")
        
        return insights

def run_performance_test():
    """Run performance testing (original functionality)"""
    monitor = WavePerformanceMonitor()
    
    # Simulate some operations
    for i in range(100):
        with monitor.measure_performance('test_operation', iteration=i):
            time.sleep(0.01)  # Simulate work
    
    # Get dashboard
    dashboard = monitor.get_performance_dashboard()
    print("Performance Dashboard:")
    print(json.dumps(dashboard, indent=2))
    
    # Generate recommendations
    recommendations = monitor.generate_optimization_recommendations()
    print(f"\nOptimization Recommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"- {rec.description} (Priority: {rec.priority})")
    
    # Cleanup
    monitor.cleanup_resources()

if __name__ == "__main__":
    import sys
    
    # Check for test mode via command line argument
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        run_performance_test()
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
            print(f"• Performance Monitor JSON Error: {str(e)}", file=sys.stderr)
            sys.exit(0)  # Non-blocking error
        
        # Extract event type from hook data
        event_type = hook_data.get('event_type', '')
        
        # Create hook handler
        handler = PerformanceHookHandler()
        
        # Handle event based on type
        if event_type == 'PreToolUse':
            result = handler.handle_pretool_use(hook_data)
        elif event_type == 'PostToolUse':
            result = handler.handle_post_tool_use(hook_data)
        elif event_type == 'SubagentStop':
            result = handler.handle_subagent_stop(hook_data)
        elif event_type == 'Stop':
            result = handler.handle_stop(hook_data)
        elif event_type == 'Notification':
            result = handler.handle_notification(hook_data)
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
                elif event_type == 'Notification':
                    result = handler.handle_notification(hook_data)
                else:
                    result = {"error": f"Unknown event type: {event_type}"}
                    sys.exit(1)
            else:
                result = {"error": f"Unknown event type: {event_type}"}
                sys.exit(1)
        
        # Output result to stderr for logging (optional)
        if result.get('error'):
            print(f"• Performance Monitor Error: {result['error']}", file=sys.stderr)
        elif result.get('performance_analysis'):
            print(f"• Performance analysis completed for {result.get('tool_name', 'unknown')}", file=sys.stderr)
        elif result.get('performance_insights'):
            print(f"• Performance insights generated", file=sys.stderr)
        
        # Exit with appropriate code for Claude Code
        if result.get('error'):
            sys.exit(2)  # Block execution on error
        else:
            sys.exit(0)  # Continue execution
        
    except Exception as e:
        logger.error(f"Performance monitoring failed: {e}")
        print(f"• Performance Monitor Error: {str(e)}", file=sys.stderr)
        sys.exit(0)  # Non-blocking error - allow execution to continue