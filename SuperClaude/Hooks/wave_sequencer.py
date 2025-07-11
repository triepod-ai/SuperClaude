#!/usr/bin/env python3
"""
Wave Sequencer - Wave Progression Logic
Handles wave sequence progression, pattern detection, and completion checking
"""

import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from contextlib import contextmanager
from collections import defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WaveSequencer:
    """
    Focused wave sequencing system
    Responsibility: "Sequence wave progression logic"
    """
    
    def __init__(self, context_manager=None):
        self.context_manager = context_manager
        self.performance_metrics = defaultdict(list)
        
        # Performance targets
        self.max_execution_time = 0.025  # 25ms target (critical path)
        
        # Cache for pattern detection
        self.pattern_cache = {}
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
                logger.warning(f"Wave sequencer operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def detect_wave_pattern(self, tool_name: str, instruction: str) -> Optional[Dict[str, Any]]:
        """
        Optimized wave pattern detection with flag-based wave support
        Performance target: <25ms execution
        """
        with self.performance_timer('wave_detection'):
            # Cache pattern detection
            cache_key = f"wave_pattern_{hash(tool_name + instruction)}"
            current_time = time.time()
            
            if cache_key in self.pattern_cache:
                cached_result, timestamp = self.pattern_cache[cache_key]
                if current_time - timestamp < self.cache_ttl:
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
            if wave_info or any(keyword in instruction_lower for keyword in 
                              ['wave-mode', 'force-waves', 'adaptive-waves', 'progressive-waves', 
                               'systematic-waves', 'enterprise-waves']):
                result = {
                    'detected': True,
                    'wave_info': wave_info,
                    'detection_method': 'flag-based' if wave_info.get('source') == 'flag' else 'pattern-based'
                }
                
                # Cache result
                self.pattern_cache[cache_key] = (result, current_time)
                return result
            
            # No pattern detected
            result = {'detected': False}
            self.pattern_cache[cache_key] = (result, current_time)
            return result
    
    def check_wave_completion(self, context: Dict[str, Any]) -> bool:
        """
        Optimized wave completion check
        Performance target: <25ms execution
        """
        with self.performance_timer('wave_completion_check'):
            try:
                current_wave = context.get("current_wave", 1)
                wave_key = f"wave_{current_wave}"
                
                if wave_key not in context:
                    return False
                
                # Fast agent count check
                agents = context[wave_key].get("agents", {})
                return len(agents) >= 3  # Minimum 3 agents for completion
                
            except Exception as e:
                logger.error(f"Wave completion check failed: {e}")
                return False
    
    def init_wave_context(self) -> Dict[str, Any]:
        """
        Initialize wave context with optimized structure
        Performance target: <25ms execution
        """
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
                "context_version": "3.0_optimized_sequencer"
            }
            
            return context
    
    def build_compound_intelligence(self, context: Dict[str, Any]) -> str:
        """
        Optimized compound intelligence building
        Performance target: <25ms execution
        """
        with self.performance_timer('compound_intelligence'):
            try:
                compound_parts = []
                current_wave = context.get("current_wave", 1)
                
                for wave_num in range(1, current_wave + 1):
                    wave_key = f"wave_{wave_num}"
                    
                    if wave_key in context and "synthesis" in context[wave_key]:
                        synthesis = context[wave_key]["synthesis"]
                        if "summary" in synthesis:
                            compound_parts.append(f"Wave {wave_num}: {synthesis['summary']}")
                
                return " || ".join(compound_parts)
                
            except Exception as e:
                logger.error(f"Compound intelligence building failed: {e}")
                return ""
    
    def trigger_next_wave(self, context: Dict[str, Any]) -> bool:
        """
        Optimized wave transition trigger
        Performance target: <25ms execution
        """
        with self.performance_timer('wave_transition'):
            try:
                current_wave = context.get("current_wave", 1)
                
                if current_wave < 5:
                    next_wave = current_wave + 1
                    context["current_wave"] = next_wave
                    
                    # Initialize next wave structure
                    wave_key = f"wave_{next_wave}"
                    if wave_key not in context:
                        context[wave_key] = {"agents": {}, "synthesis": {}}
                    
                    # Update compound intelligence
                    context["compound_intelligence"] = self.build_compound_intelligence(context)
                    
                    logger.info(f"Wave transition: {current_wave} → {next_wave}")
                    return True
                
                logger.info(f"Wave transition: Maximum waves (5) reached")
                return False
                
            except Exception as e:
                logger.error(f"Wave transition failed: {e}")
                return False
    
    def should_trigger_wave_sequence(self, context: Dict[str, Any], tool_name: str, instruction: str) -> bool:
        """
        Determine if wave sequence should be triggered
        Performance target: <25ms execution
        """
        with self.performance_timer('wave_trigger_check'):
            try:
                # Check if wave pattern is detected
                pattern_info = self.detect_wave_pattern(tool_name, instruction)
                
                if not pattern_info or not pattern_info.get('detected'):
                    return False
                
                # Check if current wave is complete
                if self.check_wave_completion(context):
                    return True
                
                # Check if this is a force wave trigger
                wave_info = pattern_info.get('wave_info', {})
                if wave_info.get('triggered') or wave_info.get('source') == 'flag':
                    return True
                
                return False
                
            except Exception as e:
                logger.error(f"Wave trigger check failed: {e}")
                return False
    
    def get_current_wave_status(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get current wave status information
        Performance target: <25ms execution
        """
        with self.performance_timer('wave_status'):
            try:
                current_wave = context.get("current_wave", 1)
                wave_key = f"wave_{current_wave}"
                
                if wave_key not in context:
                    return {
                        'current_wave': current_wave,
                        'status': 'not_initialized',
                        'agents': 0,
                        'completed': False
                    }
                
                agents = context[wave_key].get("agents", {})
                synthesis = context[wave_key].get("synthesis", {})
                
                return {
                    'current_wave': current_wave,
                    'status': 'completed' if synthesis else 'in_progress',
                    'agents': len(agents),
                    'completed': bool(synthesis),
                    'compound_intelligence': context.get("compound_intelligence", "")
                }
                
            except Exception as e:
                logger.error(f"Wave status check failed: {e}")
                return {'current_wave': 1, 'status': 'error', 'agents': 0, 'completed': False}
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get wave sequencer performance metrics"""
        metrics = {}
        
        for operation, times in self.performance_metrics.items():
            if times:
                metrics[operation] = {
                    'avg_time': sum(times) / len(times),
                    'max_time': max(times),
                    'min_time': min(times),
                    'count': len(times),
                    'target_met': all(t <= self.max_execution_time for t in times[-10:])  # Last 10 operations
                }
        
        return metrics

# Global instance
_wave_sequencer = None

def get_wave_sequencer(context_manager=None):
    """Get global wave sequencer instance"""
    global _wave_sequencer
    if _wave_sequencer is None:
        _wave_sequencer = WaveSequencer(context_manager)
    return _wave_sequencer

def sequence_wave_progression(context: Dict[str, Any], tool_name: str, instruction: str) -> Dict[str, Any]:
    """
    Main wave sequencing interface
    
    Args:
        context: Current wave context
        tool_name: Name of the tool being used
        instruction: User instruction
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (wave sequencing result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        sequencer = get_wave_sequencer()
        
        # Check if wave sequence should be triggered
        should_trigger = sequencer.should_trigger_wave_sequence(context, tool_name, instruction)
        
        result = {
            'wave_detected': sequencer.detect_wave_pattern(tool_name, instruction),
            'should_trigger': should_trigger,
            'current_status': sequencer.get_current_wave_status(context),
            'compound_intelligence': sequencer.build_compound_intelligence(context)
        }
        
        # If wave should be triggered and current wave is complete, trigger next wave
        if should_trigger and sequencer.check_wave_completion(context):
            next_wave_triggered = sequencer.trigger_next_wave(context)
            result['next_wave_triggered'] = next_wave_triggered
        
        return {
            'success': True,
            'result': result,
            'metrics': sequencer.get_performance_metrics(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Wave sequencing failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }

if __name__ == "__main__":
    # Test the wave sequencer
    sequencer = WaveSequencer()
    
    # Test pattern detection
    test_instruction = "Implement new feature with --wave-mode enabled"
    pattern_result = sequencer.detect_wave_pattern("Task", test_instruction)
    print(f"Pattern detection: {pattern_result}")
    
    # Test context initialization
    context = sequencer.init_wave_context()
    print(f"Initialized context: current_wave = {context['current_wave']}")
    
    # Test wave completion check
    context["wave_1"]["agents"] = {"agent1": {}, "agent2": {}, "agent3": {}}
    completion = sequencer.check_wave_completion(context)
    print(f"Wave completion: {completion}")
    
    # Test wave transition
    if completion:
        next_wave = sequencer.trigger_next_wave(context)
        print(f"Next wave triggered: {next_wave}, new current_wave: {context['current_wave']}")
    
    # Performance metrics
    metrics = sequencer.get_performance_metrics()
    print(f"Performance metrics: {metrics}")