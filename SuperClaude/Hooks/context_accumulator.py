#!/usr/bin/env python3
"""
Context Accumulator - Advanced Context Compression and Intelligence Management
Optimized for efficient context storage and retrieval with compound intelligence
"""

import json
import os
import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple, Set
import zlib
import pickle
from collections import defaultdict, deque
import logging
from datetime import datetime, timedelta
import hashlib
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re
from dataclasses import dataclass, asdict
from enum import Enum
import weakref

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CompressionLevel(Enum):
    """Compression levels for different use cases"""
    FAST = 1        # Fastest compression, lower ratio
    BALANCED = 6    # Balanced speed/ratio
    MAXIMUM = 9     # Maximum compression, slower

@dataclass
class ContextMetrics:
    """Context compression and performance metrics"""
    original_size: int
    compressed_size: int
    compression_ratio: float
    compression_time: float
    decompression_time: float
    operations_count: int
    cache_hits: int
    cache_misses: int

class IntelligentCache:
    """Advanced caching system with intelligent eviction"""
    
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        self.max_size = max_size
        self.ttl = ttl
        self.cache = {}
        self.access_times = {}
        self.access_count = defaultdict(int)
        self.lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache with LRU tracking"""
        with self.lock:
            if key in self.cache:
                value, timestamp = self.cache[key]
                
                # Check TTL
                if time.time() - timestamp > self.ttl:
                    del self.cache[key]
                    if key in self.access_times:
                        del self.access_times[key]
                    return None
                
                # Update access tracking
                self.access_times[key] = time.time()
                self.access_count[key] += 1
                return value
            
            return None
    
    def set(self, key: str, value: Any):
        """Set item in cache with intelligent eviction"""
        with self.lock:
            current_time = time.time()
            
            # Add to cache
            self.cache[key] = (value, current_time)
            self.access_times[key] = current_time
            self.access_count[key] += 1
            
            # Evict if necessary
            if len(self.cache) > self.max_size:
                self._evict_lru()
    
    def _evict_lru(self):
        """Evict least recently used items"""
        # Sort by access time and frequency
        items = [(k, self.access_times.get(k, 0), self.access_count[k]) 
                for k in self.cache.keys()]
        
        # Sort by access time (oldest first), then by frequency (least used first)
        items.sort(key=lambda x: (x[1], x[2]))
        
        # Evict bottom 25%
        evict_count = max(1, len(items) // 4)
        for i in range(evict_count):
            key = items[i][0]
            if key in self.cache:
                del self.cache[key]
            if key in self.access_times:
                del self.access_times[key]
            if key in self.access_count:
                del self.access_count[key]
    
    def clear(self):
        """Clear all cache entries"""
        with self.lock:
            self.cache.clear()
            self.access_times.clear()
            self.access_count.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self.lock:
            return {
                'size': len(self.cache),
                'max_size': self.max_size,
                'hit_rate': sum(self.access_count.values()) / max(1, len(self.cache)),
                'avg_access_count': sum(self.access_count.values()) / max(1, len(self.access_count))
            }

class ContextCompressor:
    """Advanced context compression with multiple strategies"""
    
    def __init__(self, compression_level: CompressionLevel = CompressionLevel.BALANCED):
        self.compression_level = compression_level.value
        self.min_compression_size = 512  # Only compress if > 512 bytes
        self.semantic_patterns = self._initialize_semantic_patterns()
        
    def _initialize_semantic_patterns(self) -> Dict[str, str]:
        """Initialize semantic compression patterns"""
        return {
            # Common phrases
            'comprehensive analysis': 'comp_analysis',
            'performance optimization': 'perf_opt',
            'security audit': 'sec_audit',
            'implementation strategy': 'impl_strat',
            'quality assurance': 'qa',
            'code review': 'code_rev',
            'system architecture': 'sys_arch',
            'error handling': 'err_hand',
            'user interface': 'ui',
            'database optimization': 'db_opt',
            
            # Technical terms
            'authentication': 'auth',
            'authorization': 'authz',
            'configuration': 'config',
            'development': 'dev',
            'production': 'prod',
            'environment': 'env',
            'application': 'app',
            'component': 'comp',
            'function': 'func',
            'variable': 'var',
            'parameter': 'param',
            'response': 'resp',
            'request': 'req',
            'service': 'svc',
            'interface': 'iface',
            'implementation': 'impl',
            'specification': 'spec',
            'documentation': 'doc',
            'testing': 'test',
            'validation': 'valid',
            'optimization': 'opt',
            'performance': 'perf',
            'security': 'sec',
            'vulnerability': 'vuln',
            'compliance': 'comp',
            'monitoring': 'mon',
            'logging': 'log',
            'debugging': 'debug',
            'troubleshooting': 'troubl',
            'maintenance': 'maint',
            'deployment': 'deploy',
            'integration': 'integ',
            'synchronization': 'sync',
            'asynchronous': 'async',
            'scalability': 'scale',
            'reliability': 'rel',
            'availability': 'avail',
            'consistency': 'consist',
            'transaction': 'txn',
            'algorithm': 'algo',
            'data structure': 'ds',
            'artificial intelligence': 'ai',
            'machine learning': 'ml',
            'deep learning': 'dl',
            'natural language processing': 'nlp'
        }
    
    def _apply_semantic_compression(self, text: str) -> str:
        """Apply semantic compression to reduce text size"""
        compressed = text
        
        # Apply pattern replacements
        for pattern, replacement in self.semantic_patterns.items():
            compressed = re.sub(r'\b' + re.escape(pattern) + r'\b', replacement, compressed, flags=re.IGNORECASE)
        
        # Remove excessive whitespace
        compressed = re.sub(r'\s+', ' ', compressed)
        compressed = re.sub(r'\n\s*\n', '\n', compressed)
        
        return compressed.strip()
    
    def _reverse_semantic_compression(self, text: str) -> str:
        """Reverse semantic compression to restore original text"""
        restored = text
        
        # Reverse pattern replacements
        for pattern, replacement in self.semantic_patterns.items():
            restored = re.sub(r'\b' + re.escape(replacement) + r'\b', pattern, restored, flags=re.IGNORECASE)
        
        return restored
    
    def compress_context(self, context: Dict[str, Any]) -> bytes:
        """Compress context with multiple strategies"""
        start_time = time.time()
        
        try:
            # Convert to JSON
            json_str = json.dumps(context, separators=(',', ':'))
            original_size = len(json_str)
            
            # Apply semantic compression
            compressed_json = self._apply_semantic_compression(json_str)
            
            # Apply zlib compression if beneficial
            if len(compressed_json) >= self.min_compression_size:
                compressed_data = zlib.compress(compressed_json.encode('utf-8'), self.compression_level)
                
                # Use compression only if it's beneficial
                if len(compressed_data) < len(compressed_json):
                    result = b'SEMANTIC_ZLIB:' + compressed_data
                else:
                    result = b'SEMANTIC:' + compressed_json.encode('utf-8')
            else:
                result = b'RAW:' + compressed_json.encode('utf-8')
            
            compression_time = time.time() - start_time
            
            # Log compression metrics
            compression_ratio = original_size / len(result) if len(result) > 0 else 1.0
            if compression_ratio > 1.1:  # Only log if significant compression
                logger.info(f"Context compressed: {original_size} -> {len(result)} bytes "
                           f"({compression_ratio:.2f}x) in {compression_time:.4f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Context compression failed: {e}")
            return b'RAW:' + json.dumps(context).encode('utf-8')
    
    def decompress_context(self, data: bytes) -> Dict[str, Any]:
        """Decompress context data"""
        start_time = time.time()
        
        try:
            if data.startswith(b'SEMANTIC_ZLIB:'):
                # Decompress zlib then reverse semantic compression
                compressed_data = data[15:]  # Remove prefix
                decompressed = zlib.decompress(compressed_data).decode('utf-8')
                json_str = self._reverse_semantic_compression(decompressed)
                
            elif data.startswith(b'SEMANTIC:'):
                # Reverse semantic compression only
                compressed_data = data[9:]  # Remove prefix
                decompressed = compressed_data.decode('utf-8')
                json_str = self._reverse_semantic_compression(decompressed)
                
            elif data.startswith(b'RAW:'):
                # No compression
                json_str = data[4:].decode('utf-8')
                
            else:
                # Legacy format
                json_str = data.decode('utf-8')
            
            context = json.loads(json_str)
            
            decompression_time = time.time() - start_time
            if decompression_time > 0.01:  # Log if > 10ms
                logger.info(f"Context decompressed in {decompression_time:.4f}s")
            
            return context
            
        except Exception as e:
            logger.error(f"Context decompression failed: {e}")
            return {}

class ContextAccumulator:
    """Advanced Context Accumulation with Intelligent Compression"""
    
    def __init__(self, base_path: Optional[Path] = None):
        self.base_path = base_path or Path.cwd()
        self.context_file = self.base_path / "wave_context.json"
        
        # Initialize components
        self.compressor = ContextCompressor()
        self.cache = IntelligentCache(max_size=500, ttl=1800)  # 30-minute TTL
        self.metrics = ContextMetrics(0, 0, 0.0, 0.0, 0.0, 0, 0, 0)
        
        # Performance settings
        self.max_context_size = 1024 * 1024  # 1MB limit
        self.pruning_threshold = 0.8  # Prune when 80% full
        self.context_retention_days = 7
        
        # Thread safety
        self.lock = threading.RLock()
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Context intelligence
        self.intelligence_weights = {
            'recent': 1.0,      # Recent context is most important
            'frequent': 0.8,    # Frequently accessed content
            'complex': 0.6,     # Complex analysis results
            'successful': 0.9   # Successful operation results
        }
        
        # Ensure directory exists
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def _calculate_context_hash(self, context: Dict[str, Any]) -> str:
        """Calculate hash for context deduplication"""
        context_str = json.dumps(context, sort_keys=True)
        return hashlib.md5(context_str.encode()).hexdigest()
    
    def _prune_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Intelligent context pruning based on importance"""
        if not self._should_prune(context):
            return context
        
        logger.info("Starting intelligent context pruning")
        
        # Calculate importance scores for each wave
        wave_scores = {}
        current_time = time.time()
        
        for wave_key in context:
            if wave_key.startswith('wave_'):
                wave_data = context[wave_key]
                score = self._calculate_wave_importance(wave_data, current_time)
                wave_scores[wave_key] = score
        
        # Sort by importance (descending)
        sorted_waves = sorted(wave_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Keep top 80% of waves
        keep_count = max(1, int(len(sorted_waves) * 0.8))
        waves_to_keep = [wave for wave, _ in sorted_waves[:keep_count]]
        
        # Create pruned context
        pruned_context = {
            k: v for k, v in context.items() 
            if not k.startswith('wave_') or k in waves_to_keep
        }
        
        # Summarize pruned waves
        pruned_summary = []
        for wave, score in sorted_waves[keep_count:]:
            if wave in context:
                summary = self._summarize_wave(context[wave])
                pruned_summary.append(f"{wave}: {summary}")
        
        if pruned_summary:
            pruned_context['pruned_waves_summary'] = " | ".join(pruned_summary)
        
        logger.info(f"Context pruned: {len(context)} -> {len(pruned_context)} elements")
        return pruned_context
    
    def _should_prune(self, context: Dict[str, Any]) -> bool:
        """Check if context should be pruned"""
        context_size = len(json.dumps(context))
        return context_size > (self.max_context_size * self.pruning_threshold)
    
    def _calculate_wave_importance(self, wave_data: Dict[str, Any], current_time: float) -> float:
        """Calculate importance score for a wave"""
        score = 0.0
        
        # Recency score
        if 'synthesis' in wave_data and 'completion_time' in wave_data['synthesis']:
            completion_time = wave_data['synthesis']['completion_time']
            age_hours = (current_time - completion_time) / 3600
            recency_score = max(0, 1 - (age_hours / 24))  # Decrease over 24 hours
            score += recency_score * self.intelligence_weights['recent']
        
        # Complexity score
        if 'agents' in wave_data:
            agent_count = len(wave_data['agents'])
            complexity_score = min(1.0, agent_count / 10)  # Normalize to 0-1
            score += complexity_score * self.intelligence_weights['complex']
        
        # Success score
        if 'synthesis' in wave_data:
            synthesis = wave_data['synthesis']
            if 'summary' in synthesis and len(synthesis['summary']) > 50:
                score += self.intelligence_weights['successful']
        
        return score
    
    def _summarize_wave(self, wave_data: Dict[str, Any]) -> str:
        """Create a summary of a wave for pruning"""
        if 'synthesis' in wave_data and 'summary' in wave_data['synthesis']:
            summary = wave_data['synthesis']['summary']
            return summary[:100] + "..." if len(summary) > 100 else summary
        return "No summary available"
    
    def build_compound_context(self, context: Dict[str, Any], operation_info: Dict[str, Any]) -> str:
        """Build compound context with intelligent prioritization"""
        with self.lock:
            # Check cache first
            cache_key = f"compound_{self._calculate_context_hash(context)}_{operation_info.get('wave_number', 'unknown')}"
            cached_result = self.cache.get(cache_key)
            if cached_result:
                self.metrics.cache_hits += 1
                return cached_result
            
            self.metrics.cache_misses += 1
            
            # Build compound intelligence
            compound_parts = []
            current_wave = operation_info.get('wave_number', 'unknown')
            
            # Add context header
            compound_parts.append(f"=== COMPOUND INTELLIGENCE CONTEXT (Wave {current_wave}) ===")
            
            # Add relevant compound intelligence
            if 'compound_intelligence' in context and context['compound_intelligence']:
                compound_parts.append(f"Previous Insights: {context['compound_intelligence']}")
            
            # Add wave-specific intelligence
            wave_intelligence = []
            for wave_num in range(1, 6):
                wave_key = f"wave_{wave_num}"
                if wave_key in context and 'synthesis' in context[wave_key]:
                    synthesis = context[wave_key]['synthesis']
                    if 'summary' in synthesis and synthesis['summary']:
                        wave_intelligence.append(f"Wave {wave_num}: {synthesis['summary']}")
            
            if wave_intelligence:
                compound_parts.append("Wave Intelligence:")
                compound_parts.extend(wave_intelligence)
            
            # Add operation-specific context
            if 'instruction' in operation_info:
                compound_parts.append(f"Current Operation: {operation_info['instruction']}")
            
            # Add strategic context
            if 'strategic_context' in context:
                compound_parts.append(f"Strategic Context: {context['strategic_context']}")
            
            # Combine and optimize
            compound_context = "\n".join(compound_parts)
            
            # Apply intelligent truncation if too long
            if len(compound_context) > 8000:  # 8KB limit
                compound_context = self._truncate_intelligently(compound_context)
            
            # Cache result
            self.cache.set(cache_key, compound_context)
            
            return compound_context
    
    def _truncate_intelligently(self, text: str) -> str:
        """Intelligently truncate text while preserving important information"""
        lines = text.split('\n')
        
        # Priority order: headers, recent waves, strategic context
        priority_patterns = [
            r'=== COMPOUND INTELLIGENCE',
            r'Wave [45]:',  # Recent waves
            r'Strategic Context:',
            r'Current Operation:',
            r'Wave [123]:',  # Earlier waves
            r'Previous Insights:'
        ]
        
        prioritized_lines = []
        remaining_lines = []
        
        for line in lines:
            is_priority = any(re.search(pattern, line) for pattern in priority_patterns)
            if is_priority:
                prioritized_lines.append(line)
            else:
                remaining_lines.append(line)
        
        # Start with high-priority content
        result = prioritized_lines[:]
        current_length = sum(len(line) for line in result)
        
        # Add remaining lines until we hit the limit
        for line in remaining_lines:
            if current_length + len(line) + 1 <= 7500:  # Leave room for truncation notice
                result.append(line)
                current_length += len(line) + 1
            else:
                break
        
        if len(result) < len(lines):
            result.append("[Context truncated for performance]")
        
        return '\n'.join(result)
    
    def process_pre_tool_use(self, tool_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process pre-tool-use with optimized context injection"""
        start_time = time.time()
        
        try:
            tool_name = tool_data.get("tool", {}).get("name", "")
            instruction = tool_data.get("tool", {}).get("input", {}).get("instruction", "")
            
            # Detect if this is a wave operation
            if self._is_wave_operation(tool_name, instruction):
                # Load context
                context = self._load_context()
                
                if context:
                    # Extract operation info
                    operation_info = self._extract_operation_info(tool_name, instruction)
                    
                    # Build compound context
                    compound_context = self.build_compound_context(context, operation_info)
                    
                    # Inject into instruction
                    if compound_context:
                        enhanced_instruction = f"{instruction}\n\n{compound_context}"
                        tool_data["tool"]["input"]["instruction"] = enhanced_instruction
                        
                        logger.info(f"Context injected: {len(compound_context)} chars in {time.time() - start_time:.4f}s")
            
            return tool_data
            
        except Exception as e:
            logger.error(f"Pre-tool-use processing failed: {e}")
            return tool_data
    
    def _is_wave_operation(self, tool_name: str, instruction: str) -> bool:
        """Check if operation is wave-related"""
        wave_indicators = [
            'wave_1_', 'wave_2_', 'wave_3_', 'wave_4_', 'wave_5_',
            'compound intelligence', 'wave coordination', 'successive wave'
        ]
        
        instruction_lower = instruction.lower()
        return any(indicator in instruction_lower for indicator in wave_indicators)
    
    def _extract_operation_info(self, tool_name: str, instruction: str) -> Dict[str, Any]:
        """Extract operation information for context building"""
        info = {
            'tool_name': tool_name,
            'instruction': instruction,
            'wave_number': 'unknown',
            'operation_type': 'unknown'
        }
        
        # Extract wave number
        wave_match = re.search(r'wave_(\d+)', instruction.lower())
        if wave_match:
            info['wave_number'] = wave_match.group(1)
        
        # Extract operation type
        operation_patterns = {
            'review': r'review|analyze|assess|investigate',
            'plan': r'plan|strategy|design|architecture',
            'implement': r'implement|execute|build|create',
            'validate': r'validate|test|verify|check',
            'finalize': r'finalize|deploy|complete|finish'
        }
        
        for op_type, pattern in operation_patterns.items():
            if re.search(pattern, instruction.lower()):
                info['operation_type'] = op_type
                break
        
        return info
    
    def _load_context(self) -> Optional[Dict[str, Any]]:
        """Load context with caching and error handling"""
        if not self.context_file.exists():
            return None
        
        try:
            with open(self.context_file, 'rb') as f:
                data = f.read()
                context = self.compressor.decompress_context(data)
                
                # Apply pruning if needed
                if self._should_prune(context):
                    context = self._prune_context(context)
                
                return context
                
        except Exception as e:
            logger.error(f"Context loading failed: {e}")
            return None
    
    def get_compression_metrics(self) -> Dict[str, Any]:
        """Get comprehensive compression metrics"""
        return {
            'compression_metrics': asdict(self.metrics),
            'cache_stats': self.cache.get_stats(),
            'context_size_limit': self.max_context_size,
            'pruning_threshold': self.pruning_threshold,
            'semantic_patterns': len(self.compressor.semantic_patterns)
        }
    
    def optimize_compression(self) -> Dict[str, Any]:
        """Optimize compression settings based on usage patterns"""
        cache_stats = self.cache.get_stats()
        
        recommendations = []
        
        # Adjust cache size based on hit rate
        if cache_stats['hit_rate'] < 0.5:
            self.cache.max_size = min(self.cache.max_size * 2, 2000)
            recommendations.append(f"Increased cache size to {self.cache.max_size}")
        
        # Adjust compression level based on performance
        if self.metrics.compression_time > 0.05:  # 50ms threshold
            self.compressor.compression_level = CompressionLevel.FAST.value
            recommendations.append("Switched to fast compression mode")
        
        # Adjust pruning threshold based on context size
        if self.metrics.original_size > self.max_context_size * 0.9:
            self.pruning_threshold = max(0.6, self.pruning_threshold - 0.1)
            recommendations.append(f"Reduced pruning threshold to {self.pruning_threshold}")
        
        return {
            'recommendations': recommendations,
            'current_metrics': asdict(self.metrics),
            'cache_stats': cache_stats
        }
    
    def atomic_write(self, context: Dict[str, Any]) -> bool:
        """Write context atomically with compression"""
        try:
            compressed_data = self.compressor.compress_context(context)
            temp_file = self.context_file.with_suffix('.tmp')
            
            with open(temp_file, 'wb') as f:
                f.write(compressed_data)
                f.flush()
                os.fsync(f.fileno())
            
            # Atomic rename
            temp_file.replace(self.context_file)
            return True
            
        except Exception as e:
            logger.error(f"Atomic write failed: {e}")
            return False

    def cleanup_resources(self):
        """Cleanup resources and shutdown gracefully"""
        try:
            self.executor.shutdown(wait=True)
            self.cache.clear()
            logger.info("Context accumulator resources cleaned up")
        except Exception as e:
            logger.error(f"Resource cleanup failed: {e}")

# Global instance
_accumulator = None

def get_accumulator() -> ContextAccumulator:
    """Get global accumulator instance"""
    global _accumulator
    if _accumulator is None:
        _accumulator = ContextAccumulator()
    return _accumulator

# Hook functions
def process_pre_tool_use(tool_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process pre-tool-use hook"""
    return get_accumulator().process_pre_tool_use(tool_data)

def get_compression_metrics() -> Dict[str, Any]:
    """Get compression metrics"""
    return get_accumulator().get_compression_metrics()

def optimize_compression() -> Dict[str, Any]:
    """Optimize compression settings"""
    return get_accumulator().optimize_compression()

class ContextHookHandler:
    """Claude Code hook event handler for context operations"""
    
    def __init__(self):
        self.accumulator = ContextAccumulator()
        
    def handle_pretool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PreToolUse hook event for context injection"""
        try:
            # Extract tool call information
            tool_call = hook_data.get('tool_call', {})
            tool_name = tool_call.get('name', '')
            tool_params = tool_call.get('parameters', {})
            
            # Build operation info
            operation_info = {
                "tool_name": tool_name,
                "tool_params": tool_params,
                "timestamp": time.time()
            }
            
            # Get current context
            current_context = self.accumulator.get_current_context()
            
            # Build compound context for injection
            compound_context = self.accumulator.build_compound_context(current_context, operation_info)
            
            # Compress for efficiency
            compressed_context = self.accumulator.compressor.compress_context(compound_context)
            
            return {
                "continue": True,
                "context_injection": True,
                "context_size": len(compound_context),
                "compressed_size": len(compressed_context),
                "compression_ratio": len(json.dumps(compound_context)) / len(compressed_context) if compressed_context else 1.0,
                "context_metrics": self.accumulator.get_compression_metrics()
            }
                
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "context_injection": False
            }
    
    def handle_subagent_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle SubagentStop hook event for context accumulation"""
        try:
            # Extract agent results
            agent_result = hook_data.get('result', {})
            agent_info = hook_data.get('agent_info', {})
            
            # Extract context from agent results
            context_update = self.extract_context_from_agent(agent_info, agent_result)
            
            # Update current context
            current_context = self.accumulator.get_current_context()
            updated_context = self.accumulator.update_context(current_context, context_update)
            
            # Save updated context
            self.accumulator.save_context(updated_context)
            
            # Generate compression metrics
            metrics = self.accumulator.get_compression_metrics()
            
            return {
                "continue": True,
                "context_accumulation": True,
                "context_size": len(json.dumps(updated_context)),
                "context_entries": len(updated_context),
                "compression_metrics": metrics,
                "intelligence_score": self.calculate_intelligence_score(updated_context)
            }
                
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "context_accumulation": False
            }
    
    def handle_post_tool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PostToolUse hook event for post-execution context analysis"""
        try:
            # Extract tool execution information
            tool_call = hook_data.get('tool_call', {})
            tool_result = hook_data.get('result', {})
            tool_name = tool_call.get('name', '')
            
            # Analyze tool execution result for context extraction
            context_data = self.extract_context_from_tool_result(tool_call, tool_result)
            
            # Update context with post-execution insights
            if context_data:
                current_context = self.accumulator._load_context()
                if current_context:
                    # Add post-execution metadata
                    current_context['post_execution_insights'] = current_context.get('post_execution_insights', [])
                    current_context['post_execution_insights'].append(context_data)
                    
                    # Limit insights to prevent bloat
                    if len(current_context['post_execution_insights']) > 50:
                        current_context['post_execution_insights'] = current_context['post_execution_insights'][-30:]
                    
                    # Save updated context
                    self.accumulator.compressor.compress_context(current_context)
            
            # Get compression metrics
            metrics = self.accumulator.get_compression_metrics()
            
            return {
                "continue": True,
                "post_execution_context": True,
                "tool_name": tool_name,
                "context_extracted": bool(context_data),
                "context_size": len(json.dumps(context_data)) if context_data else 0,
                "compression_metrics": metrics
            }
            
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "post_execution_context": False
            }
    
    def handle_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Stop hook event for final context preservation"""
        try:
            # Extract stop information
            stop_reason = hook_data.get('reason', 'normal_shutdown')
            
            # Get final context state
            final_context = self.accumulator._load_context()
            
            if final_context:
                # Add shutdown metadata
                final_context['shutdown_info'] = {
                    'timestamp': time.time(),
                    'reason': stop_reason,
                    'context_size': len(json.dumps(final_context)),
                    'intelligence_score': self.calculate_intelligence_score(final_context)
                }
                
                # Create final backup
                backup_context = final_context.copy()
                compressed_backup = self.accumulator.compressor.compress_context(backup_context)
                
                # Save final state
                self.accumulator.atomic_write(final_context)
            
            # Get final compression metrics
            final_metrics = self.accumulator.get_compression_metrics()
            
            # Cleanup resources
            self.accumulator.cleanup_resources()
            
            return {
                "continue": True,
                "graceful_shutdown": True,
                "stop_reason": stop_reason,
                "final_context_size": len(json.dumps(final_context)) if final_context else 0,
                "final_compression_metrics": final_metrics,
                "cleanup_completed": True
            }
            
        except Exception as e:
            return {
                "continue": True,
                "error": str(e),
                "graceful_shutdown": False
            }
    
    def extract_context_from_tool_result(self, tool_call: Dict[str, Any], tool_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract relevant context from tool execution result"""
        try:
            tool_name = tool_call.get('name', '')
            
            context_data = {
                'tool_name': tool_name,
                'timestamp': time.time(),
                'execution_success': 'error' not in tool_result,
                'result_size': len(json.dumps(tool_result)),
                'key_insights': []
            }
            
            # Extract key insights from different tool types
            if tool_name == 'Task':
                if 'output' in tool_result:
                    context_data['key_insights'].append(f"Task output: {str(tool_result['output'])[:200]}...")
                if 'status' in tool_result:
                    context_data['key_insights'].append(f"Task status: {tool_result['status']}")
            
            elif tool_name == 'Read':
                if 'content' in tool_result:
                    content_size = len(str(tool_result['content']))
                    context_data['key_insights'].append(f"Read {content_size} characters")
            
            elif tool_name == 'Write':
                if 'file_path' in tool_result:
                    context_data['key_insights'].append(f"Wrote to: {tool_result['file_path']}")
            
            elif tool_name == 'Edit':
                if 'changes' in tool_result:
                    context_data['key_insights'].append(f"Edit applied: {tool_result['changes']}")
            
            # Only return if we have meaningful insights
            return context_data if context_data['key_insights'] else None
            
        except Exception as e:
            logger.error(f"Context extraction failed: {e}")
            return None
    
    def handle_context_query(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle context query operations"""
        try:
            query_type = hook_data.get('query_type', 'current')
            
            if query_type == 'current':
                context = self.accumulator.get_current_context()
            elif query_type == 'compressed':
                context = self.accumulator.get_current_context()
                context = self.accumulator.compressor.compress_context(context)
            elif query_type == 'metrics':
                context = self.accumulator.get_compression_metrics()
            else:
                return {"error": f"Unknown query type: {query_type}"}
            
            return {
                "success": True,
                "query_type": query_type,
                "context": context if query_type == 'metrics' else json.dumps(context)[:1000],  # Limit output
                "full_size": len(json.dumps(context)) if query_type != 'compressed' else len(context)
            }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def extract_context_from_agent(self, agent_info: Dict[str, Any], agent_result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract relevant context from agent execution"""
        return {
            "agent_name": agent_info.get('name', 'unknown'),
            "agent_type": agent_info.get('type', 'unknown'),
            "execution_time": agent_info.get('execution_time', 0),
            "results": agent_result,
            "timestamp": time.time(),
            "success": agent_result.get('success', True),
            "insights": agent_result.get('insights', []),
            "recommendations": agent_result.get('recommendations', [])
        }
    
    def calculate_intelligence_score(self, context: Dict[str, Any]) -> float:
        """Calculate intelligence score based on context richness"""
        base_score = 0.0
        
        # Score based on context depth
        context_depth = len(str(context))
        depth_score = min(context_depth / 10000, 1.0)  # Normalize to 0-1
        
        # Score based on number of insights
        insights_count = len(context.get('insights', []))
        insights_score = min(insights_count / 10, 1.0)  # Normalize to 0-1
        
        # Score based on wave completions
        wave_completions = sum(1 for key in context.keys() if key.startswith('wave_'))
        wave_score = min(wave_completions / 5, 1.0)  # Normalize to 0-1 (5 waves max)
        
        # Weighted combination
        intelligence_score = (depth_score * 0.3) + (insights_score * 0.4) + (wave_score * 0.3)
        
        return round(intelligence_score, 3)

def run_performance_test():
    """Run performance testing (original functionality)"""
    accumulator = ContextAccumulator()
    
    # Test context building
    test_context = {
        "current_wave": 2,
        "wave_1": {
            "agents": {"specialist": {"results": {"findings": "Critical performance issues identified"}}},
            "synthesis": {"summary": "System requires optimization", "completion_time": time.time()}
        },
        "compound_intelligence": "Wave 1: Critical performance issues identified"
    }
    
    operation_info = {
        "wave_number": "2",
        "instruction": "Execute wave_2_planner with optimization focus",
        "operation_type": "plan"
    }
    
    # Test compression
    start_time = time.time()
    compressed = accumulator.compressor.compress_context(test_context)
    compression_time = time.time() - start_time
    
    start_time = time.time()
    decompressed = accumulator.compressor.decompress_context(compressed)
    decompression_time = time.time() - start_time
    
    # Test context building
    start_time = time.time()
    compound_context = accumulator.build_compound_context(test_context, operation_info)
    build_time = time.time() - start_time
    
    # Print results
    print(f"Context Accumulator Performance Test:")
    print(f"- Compression: {compression_time:.4f}s")
    print(f"- Decompression: {decompression_time:.4f}s")
    print(f"- Context Building: {build_time:.4f}s")
    print(f"- Compression Ratio: {len(json.dumps(test_context)) / len(compressed):.2f}x")
    print(f"- Compound Context Size: {len(compound_context)} chars")
    
    # Test metrics
    metrics = accumulator.get_compression_metrics()
    print(f"\nCompression Metrics:")
    print(f"- Cache Hit Rate: {metrics['cache_stats']['hit_rate']:.2f}")
    print(f"- Semantic Patterns: {metrics['semantic_patterns']}")
    
    # Cleanup
    accumulator.cleanup_resources()

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
            print(f"• Context Accumulator JSON Error: {str(e)}", file=sys.stderr)
            sys.exit(0)  # Non-blocking error
        
        # Extract event type from hook data
        event_type = hook_data.get('event_type', '')
        
        # Create hook handler
        handler = ContextHookHandler()
        
        # Handle event based on type
        if event_type == 'PreToolUse':
            result = handler.handle_pretool_use(hook_data)
        elif event_type == 'PostToolUse':
            result = handler.handle_post_tool_use(hook_data)
        elif event_type == 'SubagentStop':
            result = handler.handle_subagent_stop(hook_data)
        elif event_type == 'Stop':
            result = handler.handle_stop(hook_data)
        elif event_type == 'query':
            result = handler.handle_context_query(hook_data)
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
                elif event_type == 'query':
                    result = handler.handle_context_query(hook_data)
                else:
                    result = {"error": f"Unknown event type: {event_type}"}
                    sys.exit(1)
            else:
                result = {"error": f"Unknown event type: {event_type}"}
                sys.exit(1)
        
        # Output result to stderr for logging (optional)
        if result.get('error'):
            print(f"• Context Accumulator Error: {result['error']}", file=sys.stderr)
        elif result.get('context_injection'):
            print(f"• Context injected for {result.get('tool_name', 'unknown')}", file=sys.stderr)
        elif result.get('context_accumulated'):
            print(f"• Context accumulated from agent", file=sys.stderr)
        
        # Exit with appropriate code for Claude Code
        if result.get('error'):
            sys.exit(2)  # Block execution on error
        else:
            sys.exit(0)  # Continue execution
        
    except Exception as e:
        logger.error(f"Context accumulator failed: {e}")
        print(f"• Context Accumulator Error: {str(e)}", file=sys.stderr)
        sys.exit(0)  # Non-blocking error - allow execution to continue