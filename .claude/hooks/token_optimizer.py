#!/usr/bin/env python3
"""
Token Optimizer - Streamlined Token Reduction and Compression Engine
Intelligent, persona-aware compression with evidence-based optimization
"""

import json
import os
import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import logging
import re
from dataclasses import dataclass
from enum import Enum
from collections import defaultdict, deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CompressionStrategy(Enum):
    """Compression strategies for different contexts"""
    MINIMAL = "minimal"        # 0-40% token usage
    EFFICIENT = "efficient"    # 40-70% token usage  
    COMPRESSED = "compressed"  # 70-85% token usage
    CRITICAL = "critical"      # 85-95% token usage
    EMERGENCY = "emergency"    # 95%+ token usage

class ContentType(Enum):
    """Content types for context-aware compression"""
    CODE = "code"
    DOCUMENTATION = "documentation"
    ANALYSIS = "analysis"
    CONVERSATION = "conversation"
    TECHNICAL = "technical"
    STRUCTURED = "structured"

@dataclass
class TokenMetrics:
    """Token usage and compression metrics"""
    original_tokens: int
    compressed_tokens: int
    compression_ratio: float
    compression_time: float
    strategy_used: str
    content_type: str
    persona_domain: Optional[str]
    information_preserved: float

@dataclass
class CompressionContext:
    """Context for intelligent compression decisions"""
    token_usage_percent: float
    task_complexity: float
    persona_active: Optional[str]
    content_type: ContentType
    user_familiarity: float
    mcp_servers_active: List[str]
    wave_stage: Optional[str]

class StreamlinedTokenOptimizer:
    """Streamlined token optimization with persona awareness"""
    
    def __init__(self, config_path: str = ".claude/wave_context.json"):
        self.config_path = Path(config_path)
        self.metrics_history = deque(maxlen=1000)
        self.lock = threading.Lock()
        
        # Performance targets
        self.max_processing_time = 0.1  # 100ms target
        self.min_compression_ratio = 0.3  # 30% minimum savings
        self.min_information_preservation = 0.95  # 95% information retention
        
        # Load configuration
        self._load_config()
        
        # Initialize streamlined symbol and persona systems
        self._initialize_compression_systems()
        
    def _load_config(self):
        """Load configuration from wave context"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    self.compression_config = config.get('compression', {})
            else:
                self.compression_config = {}
        except Exception as e:
            logger.warning(f"Failed to load config: {e}")
            self.compression_config = {}
    
    def _initialize_compression_systems(self):
        """Initialize streamlined compression systems"""
        
        # Core symbol system - simplified and focused
        self.symbols = {
            # Logic flow (most useful)
            'leads_to': '→',
            'transforms': '⇒',
            'bidirectional': '⇄',
            'therefore': '∴',
            'because': '∵',
            
            # Status (essential)
            'completed': '✅',
            'failed': '❌',
            'warning': '⚠️',
            'in_progress': '🔄',
            'critical': '🚨',
            'target': '🎯',
            
            # Technical domains (selective)
            'performance': '⚡',
            'analysis': '🔍',
            'config': '🔧',
            'security': '🛡️',
            'architecture': '🏗️'
        }
        
        # Domain abbreviations - commonly accepted
        self.abbreviations = {
            'configuration': 'cfg',
            'implementation': 'impl',
            'architecture': 'arch',
            'performance': 'perf',
            'operations': 'ops',
            'environment': 'env',
            'requirements': 'req',
            'dependencies': 'deps',
            'validation': 'val',
            'documentation': 'docs',
            'quality': 'qual',
            'security': 'sec',
            'optimization': 'opt'
        }
        
        # Streamlined persona preferences - simple configuration
        self.persona_preferences = {
            'architect': {
                'compression_tolerance': 0.4,  # Conservative
                'clarity_priority': 0.9,       # High clarity
                'preferred_symbols': ['→', '⇄', '🏗️', '🧩'],
                'technical_terms': ['architecture', 'design', 'scalability', 'maintainability']
            },
            'frontend': {
                'compression_tolerance': 0.6,  # Moderate
                'clarity_priority': 0.7,       # Balanced
                'preferred_symbols': ['🎨', '📱', '⚡', '♿'],
                'technical_terms': ['component', 'responsive', 'accessibility', 'performance']
            },
            'backend': {
                'compression_tolerance': 0.7,  # Higher tolerance
                'clarity_priority': 0.6,       # Efficiency focused
                'preferred_symbols': ['🗄️', '🌐', '⚙️', '🛡️'],
                'technical_terms': ['API', 'database', 'server', 'authentication']
            },
            'security': {
                'compression_tolerance': 0.3,  # Very conservative
                'clarity_priority': 0.95,      # Maximum clarity
                'preferred_symbols': ['🛡️', '🔐', '⚠️', '🚨'],
                'technical_terms': ['vulnerability', 'encryption', 'authentication', 'threat']
            },
            'performance': {
                'compression_tolerance': 0.8,  # Aggressive
                'clarity_priority': 0.5,       # Efficiency over verbosity
                'preferred_symbols': ['⚡', '📊', '📈', '🔄'],
                'technical_terms': ['optimization', 'latency', 'throughput', 'bottleneck']
            },
            'analyzer': {
                'compression_tolerance': 0.4,  # Conservative
                'clarity_priority': 0.8,       # High clarity for analysis
                'preferred_symbols': ['🔍', '📊', '💡', '🎯'],
                'technical_terms': ['analysis', 'investigation', 'correlation', 'evidence']
            },
            'qa': {
                'compression_tolerance': 0.5,  # Moderate
                'clarity_priority': 0.8,       # High clarity for procedures
                'preferred_symbols': ['✅', '❌', '🔍', '📋'],
                'technical_terms': ['testing', 'validation', 'coverage', 'quality']
            }
        }
    
    def determine_compression_strategy(self, context: CompressionContext) -> CompressionStrategy:
        """Determine optimal compression strategy based on context"""
        start_time = time.time()
        
        try:
            # Base strategy on token usage
            if context.token_usage_percent <= 40:
                base_strategy = CompressionStrategy.MINIMAL
            elif context.token_usage_percent <= 70:
                base_strategy = CompressionStrategy.EFFICIENT
            elif context.token_usage_percent <= 85:
                base_strategy = CompressionStrategy.COMPRESSED
            elif context.token_usage_percent <= 95:
                base_strategy = CompressionStrategy.CRITICAL
            else:
                base_strategy = CompressionStrategy.EMERGENCY
            
            # Adjust based on persona preferences
            if context.persona_active and context.persona_active in self.persona_preferences:
                persona_prefs = self.persona_preferences[context.persona_active]
                
                # Adjust based on compression tolerance
                if persona_prefs['compression_tolerance'] < 0.5:
                    # Conservative personas - reduce compression
                    strategy_levels = list(CompressionStrategy)
                    current_index = strategy_levels.index(base_strategy)
                    adjusted_index = max(0, current_index - 1)
                    base_strategy = strategy_levels[adjusted_index]
                elif persona_prefs['compression_tolerance'] > 0.7:
                    # Aggressive personas - can handle more compression
                    strategy_levels = list(CompressionStrategy)
                    current_index = strategy_levels.index(base_strategy)
                    adjusted_index = min(len(strategy_levels) - 1, current_index + 1)
                    base_strategy = strategy_levels[adjusted_index]
            
            # Adjust for task complexity and user familiarity
            if context.task_complexity > 0.8 or context.user_familiarity < 0.5:
                # Reduce compression for complex tasks or unfamiliar users
                strategy_levels = list(CompressionStrategy)
                current_index = strategy_levels.index(base_strategy)
                adjusted_index = max(0, current_index - 1)
                base_strategy = strategy_levels[adjusted_index]
            
            # Check decision time
            decision_time = time.time() - start_time
            if decision_time > self.max_processing_time:
                logger.warning(f"Strategy decision took {decision_time:.3f}s (target: {self.max_processing_time}s)")
            
            return base_strategy
            
        except Exception as e:
            logger.error(f"Error determining compression strategy: {e}")
            return CompressionStrategy.MINIMAL
    
    def apply_compression(self, content: str, strategy: CompressionStrategy, context: CompressionContext) -> Tuple[str, TokenMetrics]:
        """Apply streamlined compression based on strategy and context"""
        start_time = time.time()
        original_tokens = self._estimate_tokens(content)
        
        try:
            compressed_content = content
            
            if strategy != CompressionStrategy.MINIMAL:
                # Apply symbol substitution
                compressed_content = self._apply_symbols(compressed_content, strategy, context)
                
                # Apply abbreviations
                compressed_content = self._apply_abbreviations(compressed_content, strategy, context)
                
                # Apply structural optimization
                compressed_content = self._optimize_structure(compressed_content, strategy)
                
                # Apply content filtering for aggressive strategies
                if strategy in [CompressionStrategy.CRITICAL, CompressionStrategy.EMERGENCY]:
                    compressed_content = self._filter_content(compressed_content, strategy)
            
            # Calculate metrics
            compressed_tokens = self._estimate_tokens(compressed_content)
            compression_ratio = (original_tokens - compressed_tokens) / original_tokens if original_tokens > 0 else 0
            compression_time = time.time() - start_time
            
            # Estimate information preservation
            information_preserved = self._estimate_information_preservation(content, compressed_content, context)
            
            # Create metrics
            metrics = TokenMetrics(
                original_tokens=original_tokens,
                compressed_tokens=compressed_tokens,
                compression_ratio=compression_ratio,
                compression_time=compression_time,
                strategy_used=strategy.value,
                content_type=context.content_type.value,
                persona_domain=context.persona_active,
                information_preserved=information_preserved
            )
            
            # Record metrics
            self._record_metrics(metrics)
            
            # Validate quality
            if compression_ratio < self.min_compression_ratio and strategy != CompressionStrategy.MINIMAL:
                logger.warning(f"Low compression ratio: {compression_ratio:.2f}")
            
            if information_preserved < self.min_information_preservation:
                logger.warning(f"Information preservation below target: {information_preserved:.2f}")
            
            return compressed_content, metrics
            
        except Exception as e:
            logger.error(f"Error applying compression: {e}")
            return content, TokenMetrics(
                original_tokens=original_tokens,
                compressed_tokens=original_tokens,
                compression_ratio=0.0,
                compression_time=time.time() - start_time,
                strategy_used=strategy.value,
                content_type=context.content_type.value,
                persona_domain=context.persona_active,
                information_preserved=1.0
            )
    
    def _apply_symbols(self, content: str, strategy: CompressionStrategy, context: CompressionContext) -> str:
        """Apply intelligent symbol substitution"""
        if strategy == CompressionStrategy.MINIMAL:
            return content
        
        # Get persona-preferred symbols if available
        preferred_symbols = []
        if context.persona_active and context.persona_active in self.persona_preferences:
            preferred_symbols = self.persona_preferences[context.persona_active]['preferred_symbols']
        
        # Apply symbol substitutions
        replacements = {
            'leads to': '→',
            'results in': '→',
            'therefore': '∴',
            'because': '∵',
            'transforms to': '⇒',
            'completed': '✅',
            'failed': '❌',
            'warning': '⚠️',
            'in progress': '🔄',
            'critical': '🚨'
        }
        
        for phrase, symbol in replacements.items():
            if not preferred_symbols or symbol in preferred_symbols:
                content = content.replace(phrase, symbol)
        
        return content
    
    def _apply_abbreviations(self, content: str, strategy: CompressionStrategy, context: CompressionContext) -> str:
        """Apply domain-appropriate abbreviations"""
        if strategy == CompressionStrategy.MINIMAL:
            return content
        
        # Get persona-specific technical terms
        preserve_terms = []
        if context.persona_active and context.persona_active in self.persona_preferences:
            preserve_terms = self.persona_preferences[context.persona_active]['technical_terms']
        
        # Apply abbreviations, but preserve important technical terms
        for full_term, abbrev in self.abbreviations.items():
            if full_term not in preserve_terms and full_term in content:
                # Only abbreviate if appears multiple times or in aggressive strategies
                occurrences = content.count(full_term)
                if occurrences > 1 or strategy in [CompressionStrategy.CRITICAL, CompressionStrategy.EMERGENCY]:
                    content = content.replace(full_term, abbrev)
        
        return content
    
    def _optimize_structure(self, content: str, strategy: CompressionStrategy) -> str:
        """Apply structural optimization"""
        if strategy == CompressionStrategy.MINIMAL:
            return content
        
        # Convert verbose lists to compact format
        content = re.sub(r'^- (.+)$', r'• \1', content, flags=re.MULTILINE)
        content = re.sub(r'^(\d+)\. (.+)$', r'\1) \2', content, flags=re.MULTILINE)
        
        # Remove excessive whitespace
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        content = re.sub(r' +', ' ', content)
        
        return content
    
    def _filter_content(self, content: str, strategy: CompressionStrategy) -> str:
        """Apply content filtering for aggressive compression"""
        if strategy not in [CompressionStrategy.CRITICAL, CompressionStrategy.EMERGENCY]:
            return content
        
        # Remove common filler words
        filler_patterns = [
            r'\b(actually|basically|essentially|obviously|clearly)\b',
            r'\b(I think|I believe|it seems|it appears)\b'
        ]
        
        for pattern in filler_patterns:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE)
        
        # Emergency mode - more aggressive filtering
        if strategy == CompressionStrategy.EMERGENCY:
            content = re.sub(r'\b(furthermore|moreover|additionally|also)\b', '', content, flags=re.IGNORECASE)
        
        return content
    
    def _estimate_tokens(self, content: str) -> int:
        """Estimate token count - simplified approach"""
        return len(content) // 4  # Rough estimation: 1 token ≈ 4 characters
    
    def _estimate_information_preservation(self, original: str, compressed: str, context: CompressionContext) -> float:
        """Estimate information preservation"""
        # Basic similarity measure
        char_ratio = len(compressed) / len(original) if len(original) > 0 else 1.0
        
        # Check for preservation of key terms
        if context.persona_active and context.persona_active in self.persona_preferences:
            key_terms = self.persona_preferences[context.persona_active]['technical_terms']
            preserved_terms = sum(1 for term in key_terms if term in compressed and term in original)
            term_count = sum(1 for term in key_terms if term in original)
            term_preservation = preserved_terms / term_count if term_count > 0 else 1.0
        else:
            term_preservation = 1.0
        
        # Weighted combination
        return min(1.0, (char_ratio * 0.4) + (term_preservation * 0.6))
    
    def _record_metrics(self, metrics: TokenMetrics):
        """Record metrics for analysis"""
        with self.lock:
            self.metrics_history.append(metrics)
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        with self.lock:
            if not self.metrics_history:
                return {}
            
            metrics = list(self.metrics_history)
            
            return {
                'total_compressions': len(metrics),
                'avg_compression_ratio': sum(m.compression_ratio for m in metrics) / len(metrics),
                'avg_compression_time': sum(m.compression_time for m in metrics) / len(metrics),
                'avg_information_preserved': sum(m.information_preserved for m in metrics) / len(metrics),
                'strategy_distribution': {
                    strategy: len([m for m in metrics if m.strategy_used == strategy])
                    for strategy in set(m.strategy_used for m in metrics)
                }
            }
    
    def optimize_content(self, content: str, token_usage_percent: float, 
                        task_complexity: float = 0.5, persona_active: str = None,
                        content_type: ContentType = ContentType.TECHNICAL,
                        user_familiarity: float = 0.7, mcp_servers_active: List[str] = None,
                        wave_stage: str = None) -> Tuple[str, TokenMetrics]:
        """Main optimization interface"""
        
        # Create compression context
        context = CompressionContext(
            token_usage_percent=token_usage_percent,
            task_complexity=task_complexity,
            persona_active=persona_active,
            content_type=content_type,
            user_familiarity=user_familiarity,
            mcp_servers_active=mcp_servers_active or [],
            wave_stage=wave_stage
        )
        
        # Determine strategy
        strategy = self.determine_compression_strategy(context)
        
        # Apply compression
        compressed_content, metrics = self.apply_compression(content, strategy, context)
        
        logger.info(f"Compression: {metrics.compression_ratio:.2f} ratio, "
                   f"{metrics.compression_time:.3f}s, strategy: {strategy.value}")
        
        return compressed_content, metrics

# Global instance
_token_optimizer = None

def get_token_optimizer() -> StreamlinedTokenOptimizer:
    """Get global token optimizer instance"""
    global _token_optimizer
    if _token_optimizer is None:
        _token_optimizer = StreamlinedTokenOptimizer()
    return _token_optimizer

def optimize_hook_output(content: str, context: Dict[str, Any]) -> str:
    """Hook function for optimizing output content"""
    try:
        optimizer = get_token_optimizer()
        
        # Extract context
        token_usage = context.get('token_usage_percent', 50.0)
        task_complexity = context.get('task_complexity', 0.5)
        persona_active = context.get('persona_active')
        content_type_str = context.get('content_type', 'technical')
        user_familiarity = context.get('user_familiarity', 0.7)
        mcp_servers = context.get('mcp_servers_active', [])
        wave_stage = context.get('wave_stage')
        
        # Convert content type
        try:
            content_type = ContentType(content_type_str)
        except ValueError:
            content_type = ContentType.TECHNICAL
        
        # Apply optimization
        optimized_content, metrics = optimizer.optimize_content(
            content=content,
            token_usage_percent=token_usage,
            task_complexity=task_complexity,
            persona_active=persona_active,
            content_type=content_type,
            user_familiarity=user_familiarity,
            mcp_servers_active=mcp_servers,
            wave_stage=wave_stage
        )
        
        return optimized_content
        
    except Exception as e:
        logger.error(f"Error in token optimization hook: {e}")
        return content

if __name__ == "__main__":
    # Test the streamlined optimizer
    optimizer = StreamlinedTokenOptimizer()
    
    test_content = """
    The implementation requires careful consideration of the architecture and performance implications.
    We need to configure the system properly and ensure that all requirements are met.
    The validation process should be comprehensive and the testing should cover all edge cases.
    """
    
    # Test different personas and compression levels
    for persona in ['architect', 'performance', 'security']:
        for usage in [30, 80, 95]:
            print(f"\n=== {persona.upper()} @ {usage}% ===")
            compressed, metrics = optimizer.optimize_content(
                content=test_content,
                token_usage_percent=usage,
                persona_active=persona
            )
            
            print(f"Ratio: {metrics.compression_ratio:.2f} | "
                  f"Strategy: {metrics.strategy_used} | "
                  f"Info preserved: {metrics.information_preserved:.2f}")