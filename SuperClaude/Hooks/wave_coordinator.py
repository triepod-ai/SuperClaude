#!/usr/bin/env python3
"""
Wave Coordinator - Optimized Hook Execution Infrastructure
Optimized for sub-100ms execution with advanced context compression
"""

import json
import os
import sys
import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import fcntl
import mmap
import pickle
import zlib
from collections import defaultdict
from contextlib import contextmanager
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
import uuid
import re

# Configure logging for performance monitoring
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Advanced performance monitoring with real-time metrics"""
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.lock = threading.Lock()
        
    def record_timing(self, operation: str, duration: float):
        """Record timing metrics for operations"""
        with self.lock:
            self.metrics[operation].append(duration)
            
    def get_metrics(self) -> Dict[str, Dict[str, float]]:
        """Get performance metrics summary"""
        with self.lock:
            summary = {}
            for operation, times in self.metrics.items():
                if times:
                    summary[operation] = {
                        'avg': sum(times) / len(times),
                        'min': min(times),
                        'max': max(times),
                        'count': len(times),
                        'total': sum(times)
                    }
            return summary
    
    def alert_on_threshold(self, operation: str, threshold: float) -> bool:
        """Alert if operation exceeds threshold"""
        with self.lock:
            if operation in self.metrics and self.metrics[operation]:
                recent = self.metrics[operation][-5:]  # Last 5 operations
                avg = sum(recent) / len(recent)
                return avg > threshold
        return False

class ContextCompressor:
    """Advanced context compression for compound intelligence"""
    
    def __init__(self):
        self.compression_level = 6  # Balance between speed and compression
        self.min_compression_size = 1024  # Only compress if > 1KB
        
    def compress_context(self, context: Dict[str, Any]) -> bytes:
        """Compress context data with efficient serialization"""
        try:
            # Serialize to JSON first for compatibility
            json_data = json.dumps(context, separators=(',', ':'))
            
            # Only compress if worth it
            if len(json_data) < self.min_compression_size:
                return json_data.encode('utf-8')
            
            # Compress with zlib
            compressed = zlib.compress(json_data.encode('utf-8'), self.compression_level)
            
            # Add compression header
            return b'COMPRESSED:' + compressed
            
        except Exception as e:
            logger.error(f"Context compression failed: {e}")
            return json.dumps(context).encode('utf-8')
    
    def decompress_context(self, data: bytes) -> Dict[str, Any]:
        """Decompress context data"""
        try:
            if data.startswith(b'COMPRESSED:'):
                # Extract and decompress
                compressed_data = data[11:]  # Remove 'COMPRESSED:' prefix
                json_data = zlib.decompress(compressed_data).decode('utf-8')
            else:
                json_data = data.decode('utf-8')
            
            return json.loads(json_data)
            
        except Exception as e:
            logger.error(f"Context decompression failed: {e}")
            return {}

class WaveCoordinator:
    """Optimized Wave Coordination System with sub-100ms execution"""
    
    def __init__(self, base_path: Optional[Path] = None):
        self.base_path = base_path or Path.cwd()
        self.context_file = self.base_path / "wave_context.json"
        self.lock_file = self.base_path / "wave_context.lock"
        self.performance_monitor = PerformanceMonitor()
        self.compressor = ContextCompressor()
        
        # Performance optimization settings
        self.max_execution_time = 0.1  # 100ms target
        self.cache_enabled = True
        self.cache = {}
        self.cache_lock = threading.Lock()
        self.cache_ttl = 300  # 5 minutes
        
        # Resource management
        self.max_concurrent_operations = 10
        self.thread_pool = ThreadPoolExecutor(max_workers=self.max_concurrent_operations)
        
        # Ensure directory exists
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize performance baseline
        self._initialize_performance_baseline()
    
    def _initialize_performance_baseline(self):
        """Initialize performance baseline metrics"""
        self.performance_targets = {
            'hook_execution': 0.05,  # 50ms target
            'context_read': 0.01,    # 10ms target
            'context_write': 0.02,   # 20ms target
            'wave_detection': 0.005, # 5ms target
            'context_compression': 0.01  # 10ms target
        }
    
    @contextmanager
    def performance_timer(self, operation: str):
        """Context manager for performance timing"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.performance_monitor.record_timing(operation, duration)
            
            # Alert on threshold breach
            if self.performance_monitor.alert_on_threshold(operation, self.performance_targets.get(operation, 0.1)):
                logger.warning(f"Performance threshold breached for {operation}: {duration:.4f}s")
    
    def get_cache_key(self, operation: str, params: Dict[str, Any]) -> str:
        """Generate cache key for operations"""
        return f"{operation}:{hash(json.dumps(params, sort_keys=True))}"
    
    def cache_get(self, key: str) -> Optional[Any]:
        """Get from cache with TTL check"""
        with self.cache_lock:
            if key in self.cache:
                value, timestamp = self.cache[key]
                if time.time() - timestamp < self.cache_ttl:
                    return value
                else:
                    del self.cache[key]
        return None
    
    def cache_set(self, key: str, value: Any):
        """Set cache value with timestamp"""
        with self.cache_lock:
            self.cache[key] = (value, time.time())
    
    def atomic_read(self) -> Dict[str, Any]:
        """Optimized atomic context reading with caching"""
        with self.performance_timer('context_read'):
            # Check cache first
            if self.cache_enabled:
                cache_key = f"context:{self.context_file.stat().st_mtime if self.context_file.exists() else 0}"
                cached_result = self.cache_get(cache_key)
                if cached_result is not None:
                    return cached_result
            
            if not self.context_file.exists():
                return {}
            
            try:
                with open(self.context_file, 'rb') as f:
                    # Use file locking for consistency
                    fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                    data = f.read()
                    
                    # Decompress if needed
                    context = self.compressor.decompress_context(data)
                    
                    # Cache result
                    if self.cache_enabled:
                        self.cache_set(cache_key, context)
                    
                    return context
                    
            except (json.JSONDecodeError, IOError, OSError) as e:
                logger.error(f"Context read failed: {e}")
                return {}
    
    def atomic_write(self, context: Dict[str, Any]) -> bool:
        """Optimized atomic context writing with compression"""
        with self.performance_timer('context_write'):
            try:
                # Compress context data
                with self.performance_timer('context_compression'):
                    compressed_data = self.compressor.compress_context(context)
                
                # Atomic write using temporary file
                temp_file = self.context_file.with_suffix('.tmp')
                
                with open(temp_file, 'wb') as f:
                    fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                    f.write(compressed_data)
                    f.flush()
                    os.fsync(f.fileno())
                
                # Atomic rename
                temp_file.replace(self.context_file)
                
                # Invalidate cache
                with self.cache_lock:
                    self.cache.clear()
                
                return True
                
            except (IOError, OSError) as e:
                logger.error(f"Context write failed: {e}")
                return False
    
    def init_context(self) -> Dict[str, Any]:
        """Initialize wave context with optimized structure"""
        with self.performance_timer('init_context'):
            context = {
                "current_wave": 1,
                "wave_1": {"agents": {}, "synthesis": {}},
                "wave_2": {"agents": {}, "synthesis": {}},
                "wave_3": {"agents": {}, "synthesis": {}},
                "wave_4": {"agents": {}, "synthesis": {}},
                "wave_5": {"agents": {}, "synthesis": {}},
                "compound_intelligence": "",
                "operation_start_time": time.time(),
                "performance_metrics": {},
                "context_version": "3.0_optimized"
            }
            
            self.atomic_write(context)
            return context
    
    def check_wave_completion(self, context: Dict[str, Any]) -> bool:
        """Optimized wave completion check"""
        with self.performance_timer('wave_completion_check'):
            current_wave = context["current_wave"]
            wave_key = f"wave_{current_wave}"
            
            if wave_key not in context:
                return False
            
            # Fast agent count check
            agents = context[wave_key]["agents"]
            return len(agents) >= 3  # Minimum 3 agents for completion
    
    def synthesize_wave_results(self, context: Dict[str, Any], wave_number: int) -> Dict[str, Any]:
        """Optimized wave result synthesis"""
        with self.performance_timer('wave_synthesis'):
            wave_key = f"wave_{wave_number}"
            
            if wave_key not in context:
                return {}
            
            agents = context[wave_key]["agents"]
            
            # Extract key insights efficiently
            insights = []
            for agent_data in agents.values():
                if "results" in agent_data:
                    results = agent_data["results"]
                    if isinstance(results, dict):
                        for key, value in results.items():
                            if isinstance(value, str) and len(value) > 20:
                                insights.append(f"{key}: {value[:100]}...")
                            else:
                                insights.append(f"{key}: {value}")
            
            synthesis = {
                "agent_count": len(agents),
                "summary": " | ".join(insights[:5]),  # Top 5 insights
                "completion_time": time.time()
            }
            
            return synthesis
    
    def build_compound_intelligence(self, context: Dict[str, Any]) -> str:
        """Optimized compound intelligence building"""
        with self.performance_timer('compound_intelligence'):
            compound_parts = []
            
            for wave_num in range(1, context["current_wave"] + 1):
                wave_key = f"wave_{wave_num}"
                
                if wave_key in context and "synthesis" in context[wave_key]:
                    synthesis = context[wave_key]["synthesis"]
                    if "summary" in synthesis:
                        compound_parts.append(f"Wave {wave_num}: {synthesis['summary']}")
            
            return " || ".join(compound_parts)
    
    def accumulate_intelligence(self, context: Dict[str, Any], agent_data: Dict[str, Any]) -> bool:
        """Optimized intelligence accumulation"""
        with self.performance_timer('accumulate_intelligence'):
            try:
                wave_number = agent_data["wave_number"]
                wave_key = f"wave_{wave_number}"
                agent_type = agent_data["agent_type"]
                
                # Update agent data
                if wave_key not in context:
                    context[wave_key] = {"agents": {}, "synthesis": {}}
                
                context[wave_key]["agents"][agent_type] = agent_data
                
                # Check if wave is complete
                if self.check_wave_completion(context):
                    # Synthesize results
                    synthesis = self.synthesize_wave_results(context, wave_number)
                    context[wave_key]["synthesis"] = synthesis
                    
                    # Update compound intelligence
                    context["compound_intelligence"] = self.build_compound_intelligence(context)
                
                return True
                
            except Exception as e:
                logger.error(f"Intelligence accumulation failed: {e}")
                return False
    
    def trigger_next_wave(self, context: Dict[str, Any]) -> bool:
        """Optimized wave transition trigger"""
        with self.performance_timer('wave_transition'):
            try:
                current_wave = context["current_wave"]
                
                if current_wave < 5:
                    next_wave = current_wave + 1
                    context["current_wave"] = next_wave
                    
                    # Initialize next wave structure
                    wave_key = f"wave_{next_wave}"
                    if wave_key not in context:
                        context[wave_key] = {"agents": {}, "synthesis": {}}
                    
                    # Update compound intelligence
                    context["compound_intelligence"] = self.build_compound_intelligence(context)
                    
                    return True
                
                return False
                
            except Exception as e:
                logger.error(f"Wave transition failed: {e}")
                return False
    
    def detect_wave_pattern(self, tool_name: str, instruction: str) -> Optional[Dict[str, Any]]:
        """Enhanced wave pattern detection using orchestration engine intelligence"""
        with self.performance_timer('wave_detection'):
            try:
                # Import orchestration engine (lazy import to avoid circular dependencies)
                try:
                    from .orchestration_engine import orchestrate_intelligence
                except ImportError:
                    from orchestration_engine import orchestrate_intelligence
                
                # Prepare hook data for orchestration engine
                hook_data = {
                    'tool_call': {
                        'name': tool_name,
                        'parameters': {
                            'instruction': instruction,
                            'content': instruction
                        }
                    },
                    'context': {}
                }
                
                # Get intelligent analysis from orchestration engine
                orchestration_result = orchestrate_intelligence("full_orchestration", hook_data=hook_data)
                
                if orchestration_result['success']:
                    decision = orchestration_result['result']['decision']
                    wave_eligible = decision['wave_eligible']
                    wave_indicators = decision['wave_indicators']
                    wave_strategy = decision.get('wave_strategy')
                    
                    if wave_eligible:
                        wave_info = {
                            'detected': True,
                            'wave_eligible': True,
                            'wave_strategy': wave_strategy,
                            'wave_indicators': wave_indicators,
                            'confidence': decision['confidence_score'],
                            'reasoning': decision['reasoning'],
                            'source': 'orchestration_engine'
                        }
                        
                        logger.info(f"Orchestration engine detected wave eligibility: {wave_strategy} (confidence: {decision['confidence_score']:.2f})")
                        return wave_info
                
                # Fallback to traditional pattern detection if orchestration fails
                return self._fallback_wave_detection(tool_name, instruction)
                
            except Exception as e:
                logger.warning(f"Orchestration engine wave detection failed: {e}, falling back to traditional detection")
                return self._fallback_wave_detection(tool_name, instruction)
    
    def _fallback_wave_detection(self, tool_name: str, instruction: str) -> Optional[Dict[str, Any]]:
        """Fallback wave pattern detection (original implementation)"""
        # Cache pattern detection
        cache_key = self.get_cache_key('wave_pattern', {'tool': tool_name, 'instruction': instruction})
        cached_result = self.cache_get(cache_key)
        if cached_result is not None:
            return cached_result
        
        instruction_lower = instruction.lower()
        
        # Flag-based wave pattern detection
        wave_flags = {
            '--wave-mode': {'triggered': True, 'source': 'flag'},
            '--force-waves': {'triggered': True, 'source': 'flag'},
            '--adaptive-waves': {'strategy': 'adaptive', 'source': 'flag'},
            '--progressive-waves': {'strategy': 'progressive', 'source': 'flag'},
            '--systematic-waves': {'strategy': 'systematic', 'source': 'flag'},
            '--enterprise-waves': {'strategy': 'enterprise', 'source': 'flag'},
            '--wave-validation': {'validation': True, 'source': 'flag'},
            '--wave-parallel': {'parallel': True, 'source': 'flag'},
            '--wave-checkpoint': {'checkpoint': True, 'source': 'flag'},
            '--wave-agents': {'custom_agents': True, 'source': 'flag'},
            '--wave-threshold': {'threshold_override': True, 'source': 'flag'},
            '--wave-strategy': {'strategy_override': True, 'source': 'flag'},
            '--wave-intelligence': {'intelligence_override': True, 'source': 'flag'},
            '--wave-dry-run': {'dry_run': True, 'source': 'flag'}
        }
        
        # Check for flag-based wave activation
        wave_info = {}
        for flag, info in wave_flags.items():
            if flag in instruction_lower:
                wave_info.update(info)
        
        # Traditional pattern matching (for backward compatibility)
        wave_patterns = {
            'wave_1_': {'wave': 1, 'type': 'review'},
            'wave_2_': {'wave': 2, 'type': 'plan'},
            'wave_3_': {'wave': 3, 'type': 'implement'},
            'wave_4_': {'wave': 4, 'type': 'validate'},
            'wave_5_': {'wave': 5, 'type': 'finalize'}
        }
        
        for pattern, info in wave_patterns.items():
            if pattern in instruction_lower:
                wave_info.update({
                    'wave_number': info['wave'],
                    'wave_type': info['type'],
                    'pattern': pattern,
                    'source': 'pattern'
                })
                break
        
        # Check if waves are detected (either by flag or pattern)
        if wave_info or any(keyword in instruction_lower for keyword in ['wave-mode', 'force-waves', 'adaptive-waves', 'progressive-waves', 'systematic-waves', 'enterprise-waves']):
            result = {
                'detected': True,
                'wave_info': wave_info,
                'detection_method': 'flag-based' if wave_info.get('source') == 'flag' else 'pattern-based'
            }
            
            # Cache result
            self.cache_set(cache_key, result)
            return result
        
        # No pattern detected
        result = {'detected': False}
        self.cache_set(cache_key, result)
        return result
    
    def process_pre_tool_use(self, tool_data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimized pre-tool-use hook processing"""
        with self.performance_timer('hook_execution'):
            try:
                tool_name = tool_data.get("tool", {}).get("name", "")
                instruction = tool_data.get("tool", {}).get("input", {}).get("instruction", "")
                
                # Detect wave pattern
                pattern_info = self.detect_wave_pattern(tool_name, instruction)
                
                if pattern_info and pattern_info['detected']:
                    # Load context
                    context = self.atomic_read()
                    
                    if context:
                        # Inject compound intelligence
                        compound_intelligence = context.get("compound_intelligence", "")
                        
                        if compound_intelligence:
                            enhanced_instruction = f"{instruction}\n\nCOMPOUND INTELLIGENCE CONTEXT:\n{compound_intelligence}"
                            tool_data["tool"]["input"]["instruction"] = enhanced_instruction
                
                return tool_data
                
            except Exception as e:
                logger.error(f"Pre-tool-use processing failed: {e}")
                return tool_data
    
    def process_post_tool_use(self, tool_data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimized post-tool-use hook processing"""
        with self.performance_timer('hook_execution'):
            try:
                tool_name = tool_data.get("tool", {}).get("name", "")
                tool_result = tool_data.get("result", {})
                
                # Check if this was a wave operation
                if self._is_wave_tool_operation(tool_name, tool_result):
                    # Load context
                    context = self.atomic_read()
                    
                    if context:
                        # Extract wave information from result
                        wave_info = self._extract_wave_info_from_result(tool_result)
                        
                        if wave_info:
                            # Update context with post-execution information
                            self._update_context_post_execution(context, wave_info)
                            
                            # Save updated context
                            self.atomic_write(context)
                            
                            logger.info(f"Post-tool-use context updated for wave {wave_info.get('wave_number', 'unknown')}")
                
                return tool_data
                
            except Exception as e:
                logger.error(f"Post-tool-use processing failed: {e}")
                return tool_data

    def process_stop(self, stop_data: Dict[str, Any]) -> bool:
        """Optimized stop hook processing for graceful shutdown"""
        with self.performance_timer('hook_execution'):
            try:
                logger.info("Processing stop event - initiating graceful shutdown")
                
                # Load context for final processing
                context = self.atomic_read()
                
                if context:
                    # Finalize any incomplete wave operations
                    self._finalize_incomplete_waves(context)
                    
                    # Add shutdown metadata
                    context['meta'] = context.get('meta', {})
                    context['meta']['shutdown_time'] = time.time()
                    context['meta']['shutdown_reason'] = stop_data.get('reason', 'normal_shutdown')
                    
                    # Save final context
                    self.atomic_write(context)
                    
                    # Generate final performance report
                    performance_report = self.get_performance_metrics()
                    logger.info(f"Final performance metrics: {performance_report}")
                
                # Cleanup resources
                self.cleanup_resources()
                
                logger.info("Stop event processing completed successfully")
                return True
                
            except Exception as e:
                logger.error(f"Stop processing failed: {e}")
                return False

    def process_subagent_stop(self, agent_data: Dict[str, Any]) -> bool:
        """Optimized subagent stop hook processing"""
        with self.performance_timer('hook_execution'):
            try:
                # Load context
                context = self.atomic_read()
                
                if not context:
                    context = self.init_context()
                
                # Accumulate intelligence
                success = self.accumulate_intelligence(context, agent_data)
                
                if success:
                    # Check for wave completion and transition
                    if self.check_wave_completion(context):
                        self.trigger_next_wave(context)
                    
                    # Save context
                    self.atomic_write(context)
                    
                    return True
                
                return False
                
            except Exception as e:
                logger.error(f"Subagent stop processing failed: {e}")
                return False
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        metrics = self.performance_monitor.get_metrics()
        
        return {
            "performance_metrics": metrics,
            "cache_stats": {
                "enabled": self.cache_enabled,
                "size": len(self.cache),
                "ttl": self.cache_ttl
            },
            "resource_usage": {
                "max_concurrent_operations": self.max_concurrent_operations,
                "thread_pool_active": len(self.thread_pool._threads)
            },
            "performance_targets": self.performance_targets
        }
    
    def optimize_performance(self) -> Dict[str, Any]:
        """Automatic performance optimization"""
        metrics = self.performance_monitor.get_metrics()
        recommendations = []
        
        # Analyze performance and provide recommendations
        for operation, stats in metrics.items():
            if operation in self.performance_targets:
                target = self.performance_targets[operation]
                if stats['avg'] > target:
                    recommendations.append(f"Optimize {operation}: avg {stats['avg']:.4f}s > target {target:.4f}s")
        
        # Auto-optimize cache settings
        if 'context_read' in metrics:
            read_stats = metrics['context_read']
            if read_stats['avg'] > 0.02:  # 20ms threshold
                self.cache_ttl = min(self.cache_ttl * 1.5, 900)  # Increase TTL up to 15 minutes
                recommendations.append(f"Increased cache TTL to {self.cache_ttl}s")
        
        return {
            "recommendations": recommendations,
            "current_performance": metrics,
            "optimization_applied": True
        }
    
    def _is_wave_tool_operation(self, tool_name: str, tool_result: Dict[str, Any]) -> bool:
        """Check if tool operation was wave-related"""
        wave_indicators = [
            'wave_', 'Task', 'Agent', 'compound', 'intelligence'
        ]
        
        # Check tool name and result for wave indicators
        tool_content = f"{tool_name} {str(tool_result)}"
        return any(indicator in tool_content for indicator in wave_indicators)
    
    def _extract_wave_info_from_result(self, tool_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract wave information from tool execution result"""
        wave_info = {}
        
        # Try to extract wave number from result
        result_str = str(tool_result).lower()
        wave_match = re.search(r'wave[_\s](\d+)', result_str)
        if wave_match:
            wave_info['wave_number'] = int(wave_match.group(1))
        
        # Extract completion status
        if 'success' in tool_result:
            wave_info['success'] = tool_result['success']
        elif 'error' in tool_result:
            wave_info['success'] = False
        else:
            wave_info['success'] = True
        
        # Extract execution time if available
        if 'execution_time' in tool_result:
            wave_info['execution_time'] = tool_result['execution_time']
        
        return wave_info if wave_info else None
    
    def _update_context_post_execution(self, context: Dict[str, Any], wave_info: Dict[str, Any]):
        """Update context with post-execution information"""
        wave_number = wave_info.get('wave_number')
        if wave_number:
            wave_key = f"wave_{wave_number}"
            
            # Update wave metadata
            if wave_key not in context:
                context[wave_key] = {"agents": {}, "synthesis": {}}
            
            context[wave_key]['meta'] = context[wave_key].get('meta', {})
            context[wave_key]['meta']['last_execution'] = time.time()
            context[wave_key]['meta']['execution_success'] = wave_info.get('success', True)
            
            if 'execution_time' in wave_info:
                context[wave_key]['meta']['execution_time'] = wave_info['execution_time']
    
    def _finalize_incomplete_waves(self, context: Dict[str, Any]):
        """Finalize any incomplete wave operations during shutdown"""
        current_wave = context.get('current_wave', 1)
        
        # Mark current wave as interrupted if incomplete
        wave_key = f"wave_{current_wave}"
        if wave_key in context:
            context[wave_key]['meta'] = context[wave_key].get('meta', {})
            context[wave_key]['meta']['interrupted_shutdown'] = True
            context[wave_key]['meta']['finalization_time'] = time.time()
        
        # Update compound intelligence with shutdown info
        if context.get('compound_intelligence'):
            context['compound_intelligence'] += f" [SHUTDOWN: Wave {current_wave} interrupted]"

    def cleanup_resources(self):
        """Cleanup resources and shutdown gracefully"""
        try:
            self.thread_pool.shutdown(wait=True)
            
            # Clear cache
            with self.cache_lock:
                self.cache.clear()
            
            logger.info("Wave coordinator resources cleaned up successfully")
            
        except Exception as e:
            logger.error(f"Resource cleanup failed: {e}")


# Global instance for hook usage
_coordinator = None

def get_coordinator() -> WaveCoordinator:
    """Get global coordinator instance"""
    global _coordinator
    if _coordinator is None:
        _coordinator = WaveCoordinator()
    return _coordinator

# Hook functions for Claude Code integration
def pre_tool_use_hook(tool_data: Dict[str, Any]) -> Dict[str, Any]:
    """Pre-tool-use hook for Claude Code"""
    return get_coordinator().process_pre_tool_use(tool_data)

def subagent_stop_hook(agent_data: Dict[str, Any]) -> bool:
    """Subagent stop hook for Claude Code"""
    return get_coordinator().process_subagent_stop(agent_data)

# Performance monitoring functions
def get_performance_metrics() -> Dict[str, Any]:
    """Get current performance metrics"""
    return get_coordinator().get_performance_metrics()

def optimize_performance() -> Dict[str, Any]:
    """Trigger performance optimization"""
    return get_coordinator().optimize_performance()

class WaveHookHandler:
    """Claude Code hook event handler for wave coordination"""
    
    def __init__(self):
        self.coordinator = WaveCoordinator()
        
    def handle_pretool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PreToolUse hook event for wave pattern detection"""
        try:
            # Extract tool call information
            tool_call = hook_data.get('tool_call', {})
            tool_name = tool_call.get('name', '')
            tool_params = tool_call.get('parameters', {})
            
            # Detect wave patterns
            wave_pattern = self.detect_wave_pattern(tool_call)
            
            if wave_pattern:
                # Get accumulated context for injection
                context = self.coordinator.atomic_read()
                
                # Prepare context injection
                context_injection = self.prepare_context_injection(context, wave_pattern)
                
                logger.info(f"Wave pattern detected: {wave_pattern['pattern']}")
                
                return {
                    "continue": True,
                    "wave_detected": True,
                    "pattern": wave_pattern['pattern'],
                    "wave_number": wave_pattern['wave_number'],
                    "context_injection": context_injection,
                    "performance_metrics": self.coordinator.get_performance_metrics()
                }
            else:
                return {
                    "continue": True,
                    "wave_detected": False
                }
                
        except Exception as e:
            logger.error(f"PreToolUse hook error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "wave_detected": False
            }
    
    def handle_subagent_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle SubagentStop hook event for context accumulation"""
        try:
            # Extract agent results
            agent_result = hook_data.get('result', {})
            agent_info = hook_data.get('agent_info', {})
            
            # Detect if this is a wave agent
            wave_info = self.extract_wave_info(agent_info, agent_result)
            
            if wave_info:
                # Accumulate intelligence from completed wave
                context = self.coordinator.atomic_read()
                
                agent_data = {
                    "wave_number": wave_info['wave_number'],
                    "agent_type": wave_info['agent_type'],
                    "task_name": wave_info.get('task_name', ''),
                    "results": agent_result,
                    "completion_time": time.time()
                }
                
                # Accumulate intelligence
                self.coordinator.accumulate_intelligence(context, agent_data)
                
                # Write updated context
                self.coordinator.atomic_write(context)
                
                logger.info(f"Accumulated intelligence from {wave_info['agent_type']} wave {wave_info['wave_number']}")
                
                return {
                    "continue": True,
                    "wave_accumulation": True,
                    "wave_number": wave_info['wave_number'],
                    "agent_type": wave_info['agent_type'],
                    "context_size": len(json.dumps(context)),
                    "performance_metrics": self.coordinator.get_performance_metrics()
                }
            else:
                return {
                    "continue": True,
                    "wave_accumulation": False
                }
                
        except Exception as e:
            logger.error(f"SubagentStop hook error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "wave_accumulation": False
            }
    
    def handle_post_tool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PostToolUse hook event for post-execution analysis"""
        try:
            # Extract tool execution information
            tool_call = hook_data.get('tool_call', {})
            tool_result = hook_data.get('result', {})
            
            # Process post-execution
            post_result = self.coordinator.process_post_tool_use({
                'tool': tool_call,
                'result': tool_result
            })
            
            # Get updated performance metrics
            performance_metrics = self.coordinator.get_performance_metrics()
            
            return {
                "continue": True,
                "post_execution_analysis": True,
                "tool_name": tool_call.get('name', ''),
                "execution_success": 'error' not in tool_result,
                "performance_metrics": performance_metrics,
                "context_updated": True
            }
            
        except Exception as e:
            logger.error(f"PostToolUse hook error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "post_execution_analysis": False
            }
    
    def handle_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Stop hook event for graceful shutdown"""
        try:
            # Extract stop information
            stop_reason = hook_data.get('reason', 'normal_shutdown')
            
            # Process stop event
            success = self.coordinator.process_stop({
                'reason': stop_reason,
                'timestamp': time.time()
            })
            
            # Get final performance metrics
            final_metrics = self.coordinator.get_performance_metrics()
            
            return {
                "continue": True,
                "graceful_shutdown": True,
                "stop_reason": stop_reason,
                "shutdown_success": success,
                "final_metrics": final_metrics,
                "cleanup_completed": True
            }
            
        except Exception as e:
            logger.error(f"Stop hook error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "graceful_shutdown": False
            }
    
    def detect_wave_pattern(self, tool_call: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Detect wave patterns in Task tool calls with flag-based support"""
        tool_name = tool_call.get('name', '')
        tool_params = tool_call.get('parameters', {})
        
        if tool_name == 'Task':
            # Check for wave patterns in Task parameters
            pattern = tool_params.get('pattern', '')
            context = tool_params.get('context', '')
            wave_config = tool_params.get('wave_config', {})
            
            # Traditional wave pattern recognition
            wave_patterns = {
                'wave_1_review': {'wave_number': 1, 'type': 'review'},
                'wave_2_plan': {'wave_number': 2, 'type': 'planning'},
                'wave_3_implement': {'wave_number': 3, 'type': 'implementation'},
                'wave_4_validate': {'wave_number': 4, 'type': 'validation'},
                'wave_5_finalize': {'wave_number': 5, 'type': 'finalization'}
            }
            
            wave_info = {}
            
            # Check traditional patterns
            for wave_pattern, pattern_info in wave_patterns.items():
                if wave_pattern in pattern or wave_pattern in context:
                    wave_info.update({
                        'pattern': wave_pattern,
                        'wave_number': pattern_info['wave_number'],
                        'type': pattern_info['type'],
                        'detection_method': 'pattern'
                    })
                    break
            
            # Check for flag-based wave configuration in parameters
            if wave_config:
                wave_info.update({
                    'wave_config': wave_config,
                    'strategy': wave_config.get('strategy', 'systematic'),
                    'validation': wave_config.get('validation', False),
                    'parallel': wave_config.get('parallel', False),
                    'checkpoint': wave_config.get('checkpoint', False),
                    'dry_run': wave_config.get('dry_run', False),
                    'detection_method': 'flag-based'
                })
            
            # Check for wave agents and intelligence level
            if 'wave_agents' in tool_params:
                wave_info['wave_agents'] = tool_params['wave_agents']
            
            if 'intelligence_level' in tool_params:
                wave_info['intelligence_level'] = tool_params['intelligence_level']
            
            # Check for other wave-related flags in context
            context_lower = context.lower()
            flag_indicators = {
                'adaptive': 'adaptive',
                'progressive': 'progressive',
                'systematic': 'systematic',
                'enterprise': 'enterprise',
                'validation': 'validation'
            }
            
            for indicator, strategy in flag_indicators.items():
                if f"{indicator} strategy" in context_lower:
                    wave_info['strategy'] = strategy
                    wave_info['detection_method'] = 'flag-based'
            
            if wave_info:
                wave_info['tool_params'] = tool_params
                return wave_info
        
        return None
    
    def extract_wave_info(self, agent_info: Dict[str, Any], agent_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract wave information from agent info and results"""
        # Check for wave indicators in agent info
        agent_name = agent_info.get('name', '')
        agent_task = agent_info.get('task', '')
        
        # Wave pattern indicators
        wave_indicators = [
            'wave_1_review', 'wave_2_plan', 'wave_3_implement',
            'wave_4_validate', 'wave_5_finalize'
        ]
        
        for indicator in wave_indicators:
            if indicator in agent_name or indicator in agent_task:
                wave_number = int(indicator.split('_')[1])
                wave_type = indicator.split('_')[2]
                
                return {
                    'wave_number': wave_number,
                    'agent_type': wave_type,
                    'task_name': agent_task
                }
        
        return None
    
    def prepare_context_injection(self, context: Dict[str, Any], wave_pattern: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare context for injection into wave operations"""
        wave_number = wave_pattern['wave_number']
        
        # Filter context relevant to current wave
        relevant_context = {
            "accumulated_insights": context.get("accumulated_insights", {}),
            "performance_metrics": context.get("performance_metrics", {}),
            "previous_waves": {}
        }
        
        # Include results from previous waves
        for i in range(1, wave_number):
            wave_key = f"wave_{i}_results"
            if wave_key in context:
                relevant_context["previous_waves"][f"wave_{i}"] = context[wave_key]
        
        return relevant_context

def run_performance_test():
    """Run performance testing (original functionality)"""
    coordinator = WaveCoordinator()
    
    # Test initialization
    start_time = time.time()
    context = coordinator.init_context()
    init_time = time.time() - start_time
    
    # Test agent processing
    start_time = time.time()
    agent_data = {
        "wave_number": 1,
        "agent_type": "specialist",
        "task_name": "wave_1_specialist",
        "results": {"findings": "Test findings"},
        "completion_time": time.time()
    }
    coordinator.accumulate_intelligence(context, agent_data)
    process_time = time.time() - start_time
    
    # Test context operations
    start_time = time.time()
    coordinator.atomic_write(context)
    write_time = time.time() - start_time
    
    start_time = time.time()
    read_context = coordinator.atomic_read()
    read_time = time.time() - start_time
    
    # Print performance results
    print(f"Wave Coordinator Performance Test:")
    print(f"- Initialization: {init_time:.4f}s")
    print(f"- Agent Processing: {process_time:.4f}s")
    print(f"- Context Write: {write_time:.4f}s")
    print(f"- Context Read: {read_time:.4f}s")
    print(f"- Total Hook Execution: {process_time:.4f}s")
    
    # Performance metrics
    metrics = coordinator.get_performance_metrics()
    print(f"\nPerformance Metrics:")
    for operation, stats in metrics["performance_metrics"].items():
        print(f"- {operation}: {stats['avg']:.4f}s avg ({stats['count']} ops)")
    
    # Cleanup
    coordinator.cleanup_resources()

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
            print(f"• Wave Coordinator JSON Error: {str(e)}", file=sys.stderr)
            sys.exit(0)  # Non-blocking error
        
        # Extract event type from hook data
        event_type = hook_data.get('event_type', '')
        
        # Create hook handler
        handler = WaveHookHandler()
        
        # Handle event based on type
        if event_type == 'PreToolUse':
            result = handler.handle_pretool_use(hook_data)
        elif event_type == 'PostToolUse':
            result = handler.handle_post_tool_use(hook_data)
        elif event_type == 'SubagentStop':
            result = handler.handle_subagent_stop(hook_data)
        elif event_type == 'Stop':
            result = handler.handle_stop(hook_data)
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
                else:
                    result = {"error": f"Unknown event type: {event_type}"}
                    sys.exit(1)
            else:
                result = {"error": f"Unknown event type: {event_type}"}
                sys.exit(1)
        
        # Output result to stderr for logging (optional)
        if result.get('error'):
            print(f"• Wave Coordinator Error: {result['error']}", file=sys.stderr)
        elif result.get('wave_detected'):
            print(f"• Wave pattern detected: {result.get('pattern', 'unknown')}", file=sys.stderr)
        
        # Exit with appropriate code for Claude Code
        if result.get('error'):
            sys.exit(2)  # Block execution on error
        else:
            sys.exit(0)  # Continue execution
        
    except Exception as e:
        logger.error(f"Hook handler error: {e}")
        print(f"• Wave Coordinator Error: {str(e)}", file=sys.stderr)
        sys.exit(0)  # Non-blocking error - allow execution to continue