#!/usr/bin/env python3
"""
Synthesis Engine - Compound Intelligence Generation
Handles result synthesis and compound intelligence generation from multiple agents
"""

import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from contextlib import contextmanager
from collections import defaultdict
from dataclasses import dataclass
from enum import Enum
import re
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SynthesisQuality(Enum):
    """Synthesis quality levels"""
    BASIC = "basic"
    ENHANCED = "enhanced"
    COMPREHENSIVE = "comprehensive"
    DEEP = "deep"

@dataclass
class SynthesisMetadata:
    """Synthesis operation metadata"""
    synthesis_id: str
    wave_number: int
    agent_count: int
    synthesis_time: float
    quality_level: SynthesisQuality
    confidence_score: float
    token_efficiency: float
    key_insights: List[str]

class SynthesisEngine:
    """
    Focused synthesis system
    Responsibility: "Synthesize compound intelligence"
    """
    
    def __init__(self, result_collector=None):
        self.result_collector = result_collector
        
        # Synthesis tracking
        self.synthesis_history = {}
        self.compound_intelligence_cache = {}
        
        # Performance targets
        self.max_execution_time = 0.050  # 50ms target
        self.max_synthesis_length = 2000  # Maximum synthesis length in characters
        
        # Performance metrics
        self.performance_metrics = defaultdict(list)
        
        # Synthesis configuration
        self.max_insights_per_agent = 3
        self.min_insight_length = 20
        self.compound_separator = " || "
        
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
                logger.warning(f"Synthesis engine operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def extract_key_insights(self, agent_results: List[Dict[str, Any]]) -> List[str]:
        """
        Extract key insights from agent results
        Performance target: <50ms execution
        """
        with self.performance_timer('insight_extraction'):
            try:
                insights = []
                
                for agent_result in agent_results:
                    agent_type = agent_result.get("agent_type", "unknown")
                    result_data = agent_result.get("result_data", {})
                    
                    # Extract insights from result data
                    result_content = result_data.get("result", "")
                    
                    if isinstance(result_content, dict):
                        # Handle structured results
                        for key, value in result_content.items():
                            if isinstance(value, str) and len(value) >= self.min_insight_length:
                                insight = f"{agent_type}.{key}: {value[:100]}..." if len(value) > 100 else f"{agent_type}.{key}: {value}"
                                insights.append(insight)
                                if len(insights) >= self.max_insights_per_agent:
                                    break
                    
                    elif isinstance(result_content, str):
                        # Handle text results
                        if len(result_content) >= self.min_insight_length:
                            # Try to extract meaningful sentences or key points
                            sentences = re.split(r'[.!?]+', result_content)
                            for sentence in sentences[:self.max_insights_per_agent]:
                                sentence = sentence.strip()
                                if len(sentence) >= self.min_insight_length:
                                    insight = f"{agent_type}: {sentence}"
                                    insights.append(insight)
                    
                    # Extract from findings if available
                    findings = result_data.get("findings")
                    if findings and isinstance(findings, str) and len(findings) >= self.min_insight_length:
                        insight = f"{agent_type}.findings: {findings[:100]}..." if len(findings) > 100 else f"{agent_type}.findings: {findings}"
                        insights.append(insight)
                
                return insights[:20]  # Limit to top 20 insights
                
            except Exception as e:
                logger.error(f"Insight extraction failed: {e}")
                return []
    
    def calculate_synthesis_quality(self, agent_results: List[Dict[str, Any]], synthesis: Dict[str, Any]) -> Tuple[SynthesisQuality, float]:
        """
        Calculate synthesis quality and confidence score
        Performance target: <50ms execution
        """
        with self.performance_timer('quality_calculation'):
            try:
                agent_count = len(agent_results)
                synthesis_content = synthesis.get("summary", "")
                
                # Base quality on agent count and content richness
                if agent_count >= 5 and len(synthesis_content) > 500:
                    quality = SynthesisQuality.COMPREHENSIVE
                    base_confidence = 0.9
                elif agent_count >= 3 and len(synthesis_content) > 200:
                    quality = SynthesisQuality.ENHANCED
                    base_confidence = 0.8
                elif agent_count >= 2 and len(synthesis_content) > 100:
                    quality = SynthesisQuality.BASIC
                    base_confidence = 0.7
                else:
                    quality = SynthesisQuality.BASIC
                    base_confidence = 0.5
                
                # Adjust confidence based on result validation scores
                validation_scores = []
                for result in agent_results:
                    score = result.get("validation_score")
                    if score is not None:
                        validation_scores.append(score)
                
                if validation_scores:
                    avg_validation = sum(validation_scores) / len(validation_scores)
                    confidence_adjustment = (avg_validation - 0.7) * 0.2  # Adjust by up to ±0.2
                    final_confidence = max(0.1, min(1.0, base_confidence + confidence_adjustment))
                else:
                    final_confidence = base_confidence
                
                return quality, final_confidence
                
            except Exception as e:
                logger.error(f"Quality calculation failed: {e}")
                return SynthesisQuality.BASIC, 0.5
    
    def synthesize_wave_results(self, wave_number: int, agent_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Synthesize results from multiple agents in a wave
        Performance target: <50ms execution
        """
        with self.performance_timer('wave_synthesis'):
            try:
                if not agent_results:
                    return {
                        "agent_count": 0,
                        "summary": "",
                        "completion_time": time.time(),
                        "quality": SynthesisQuality.BASIC.value,
                        "confidence": 0.0
                    }
                
                # Extract key insights from all agents
                insights = self.extract_key_insights(agent_results)
                
                # Create synthesis summary
                summary_parts = []
                
                # Group insights by agent type
                agent_insights = defaultdict(list)
                for insight in insights:
                    if ":" in insight:
                        agent_part = insight.split(":", 1)[0]
                        agent_type = agent_part.split(".")[0] if "." in agent_part else agent_part
                        agent_insights[agent_type].append(insight)
                
                # Build summary from agent insights
                for agent_type, type_insights in agent_insights.items():
                    if type_insights:
                        # Take the most relevant insights for each agent type
                        top_insights = type_insights[:2]  # Top 2 insights per agent type
                        agent_summary = " | ".join(top_insights)
                        summary_parts.append(f"Agent {agent_type}: {agent_summary}")
                
                # Combine into final summary
                final_summary = " || ".join(summary_parts)
                
                # Truncate if too long
                if len(final_summary) > self.max_synthesis_length:
                    final_summary = final_summary[:self.max_synthesis_length] + "..."
                
                # Create synthesis result
                synthesis = {
                    "agent_count": len(agent_results),
                    "summary": final_summary,
                    "completion_time": time.time(),
                    "key_insights": insights[:10],  # Top 10 insights
                    "agent_types": list(set(result.get("agent_type", "unknown") for result in agent_results))
                }
                
                # Calculate quality and confidence
                quality, confidence = self.calculate_synthesis_quality(agent_results, synthesis)
                synthesis["quality"] = quality.value
                synthesis["confidence"] = confidence
                
                # Generate synthesis ID and store
                synthesis_id = f"synthesis_{wave_number}_{int(time.time())}"
                metadata = SynthesisMetadata(
                    synthesis_id=synthesis_id,
                    wave_number=wave_number,
                    agent_count=len(agent_results),
                    synthesis_time=time.time(),
                    quality_level=quality,
                    confidence_score=confidence,
                    token_efficiency=len(final_summary) / max(1, sum(len(str(r.get("result_data", ""))) for r in agent_results)),
                    key_insights=insights[:5]
                )
                
                self.synthesis_history[synthesis_id] = {
                    "metadata": metadata,
                    "synthesis": synthesis,
                    "input_results": agent_results
                }
                
                logger.info(f"Synthesized wave {wave_number} results: {len(agent_results)} agents, quality: {quality.value}")
                
                return synthesis
                
            except Exception as e:
                logger.error(f"Wave synthesis failed for wave {wave_number}: {e}")
                return {
                    "agent_count": len(agent_results) if agent_results else 0,
                    "summary": f"Synthesis error: {str(e)}",
                    "completion_time": time.time(),
                    "quality": SynthesisQuality.BASIC.value,
                    "confidence": 0.0,
                    "error": str(e)
                }
    
    def build_compound_intelligence(self, context: Dict[str, Any]) -> str:
        """
        Build compound intelligence from multiple waves
        Performance target: <50ms execution
        """
        with self.performance_timer('compound_intelligence'):
            try:
                # Check cache first
                context_hash = hashlib.md5(json.dumps(context, sort_keys=True).encode()).hexdigest()
                if context_hash in self.compound_intelligence_cache:
                    cached_result, timestamp = self.compound_intelligence_cache[context_hash]
                    if time.time() - timestamp < 300:  # 5 minute cache
                        return cached_result
                
                compound_parts = []
                current_wave = context.get("current_wave", 1)
                
                # Build compound intelligence from completed waves
                for wave_num in range(1, current_wave + 1):
                    wave_key = f"wave_{wave_num}"
                    
                    if wave_key in context and "synthesis" in context[wave_key]:
                        synthesis = context[wave_key]["synthesis"]
                        summary = synthesis.get("summary", "")
                        
                        if summary:
                            # Create concise wave summary
                            wave_summary = f"Wave {wave_num}: {summary}"
                            compound_parts.append(wave_summary)
                
                # Combine all wave summaries
                compound_intelligence = self.compound_separator.join(compound_parts)
                
                # Optimize length if too long
                if len(compound_intelligence) > self.max_synthesis_length * 2:
                    # Keep only the most recent waves and truncate
                    recent_parts = compound_parts[-3:]  # Last 3 waves
                    compound_intelligence = self.compound_separator.join(recent_parts)
                    if len(compound_intelligence) > self.max_synthesis_length * 2:
                        compound_intelligence = compound_intelligence[:self.max_synthesis_length * 2] + "..."
                
                # Cache result
                self.compound_intelligence_cache[context_hash] = (compound_intelligence, time.time())
                
                return compound_intelligence
                
            except Exception as e:
                logger.error(f"Compound intelligence building failed: {e}")
                return ""
    
    def enhance_intelligence_for_injection(self, compound_intelligence: str, target_wave: int, task_context: str = "") -> str:
        """
        Enhance compound intelligence for injection into next wave
        Performance target: <50ms execution
        """
        with self.performance_timer('intelligence_enhancement'):
            try:
                if not compound_intelligence:
                    return ""
                
                # Add contextual framing
                enhanced_intelligence = f"COMPOUND INTELLIGENCE (Waves 1-{target_wave-1}):\n{compound_intelligence}"
                
                # Add guidance for next wave if task context is available
                if task_context:
                    guidance = self._generate_guidance_for_wave(target_wave, compound_intelligence, task_context)
                    if guidance:
                        enhanced_intelligence += f"\n\nGUIDANCE FOR WAVE {target_wave}:\n{guidance}"
                
                return enhanced_intelligence
                
            except Exception as e:
                logger.error(f"Intelligence enhancement failed: {e}")
                return compound_intelligence
    
    def _generate_guidance_for_wave(self, wave_number: int, compound_intelligence: str, task_context: str) -> str:
        """Generate guidance for upcoming wave based on previous intelligence"""
        try:
            # Simple heuristic-based guidance generation
            guidance_templates = {
                2: "Based on Wave 1 analysis, focus on detailed planning and architecture for implementation.",
                3: "Based on previous waves, proceed with implementation while maintaining the identified requirements.",
                4: "Based on implementation in Wave 3, focus on validation, testing, and quality assurance.",
                5: "Based on all previous waves, finalize the solution and prepare comprehensive documentation."
            }
            
            base_guidance = guidance_templates.get(wave_number, f"Build upon insights from previous waves for Wave {wave_number}.")
            
            # Add context-specific guidance if patterns are detected
            if "error" in compound_intelligence.lower() or "failed" in compound_intelligence.lower():
                base_guidance += " Pay special attention to error handling and validation."
            
            if "performance" in compound_intelligence.lower():
                base_guidance += " Consider performance optimization in your approach."
            
            return base_guidance
            
        except Exception as e:
            logger.error(f"Guidance generation failed: {e}")
            return ""
    
    def get_synthesis_metrics(self) -> Dict[str, Any]:
        """Get synthesis engine performance metrics"""
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
        
        # Calculate synthesis quality statistics
        quality_distribution = defaultdict(int)
        confidence_scores = []
        
        for synthesis_data in self.synthesis_history.values():
            metadata = synthesis_data["metadata"]
            quality_distribution[metadata.quality_level.value] += 1
            confidence_scores.append(metadata.confidence_score)
        
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        
        return {
            "performance_metrics": metrics,
            "synthesis_stats": {
                "total_syntheses": len(self.synthesis_history),
                "quality_distribution": dict(quality_distribution),
                "avg_confidence_score": avg_confidence,
                "cache_entries": len(self.compound_intelligence_cache)
            },
            "performance_targets": {
                "max_execution_time": self.max_execution_time,
                "max_synthesis_length": self.max_synthesis_length,
                "max_insights_per_agent": self.max_insights_per_agent
            }
        }

# Global instance
_synthesis_engine = None

def get_synthesis_engine(result_collector=None):
    """Get global synthesis engine instance"""
    global _synthesis_engine
    if _synthesis_engine is None:
        _synthesis_engine = SynthesisEngine(result_collector)
    return _synthesis_engine

def synthesize_intelligence(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main synthesis interface
    
    Args:
        action: Action to perform (synthesize_wave, build_compound, enhance)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (synthesis result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        engine = get_synthesis_engine()
        
        result = {}
        
        if action == "synthesize_wave":
            wave_number = kwargs.get("wave_number", 1)
            agent_results = kwargs.get("agent_results", [])
            synthesis = engine.synthesize_wave_results(wave_number, agent_results)
            result = {"synthesis": synthesis}
            
        elif action == "build_compound":
            context = kwargs.get("context", {})
            compound_intelligence = engine.build_compound_intelligence(context)
            result = {"compound_intelligence": compound_intelligence}
            
        elif action == "enhance":
            compound_intelligence = kwargs.get("compound_intelligence", "")
            target_wave = kwargs.get("target_wave", 2)
            task_context = kwargs.get("task_context", "")
            enhanced = engine.enhance_intelligence_for_injection(compound_intelligence, target_wave, task_context)
            result = {"enhanced_intelligence": enhanced}
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': engine.get_synthesis_metrics(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Synthesis action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }

if __name__ == "__main__":
    # Test the synthesis engine
    engine = SynthesisEngine()
    
    # Test wave synthesis
    test_agent_results = [
        {
            "agent_type": "specialist",
            "result_data": {
                "result": "Detailed analysis of system architecture reveals modular design opportunities.",
                "findings": "System can be optimized for better performance."
            },
            "validation_score": 0.9
        },
        {
            "agent_type": "analyzer", 
            "result_data": {
                "result": "Performance bottlenecks identified in data processing layer.",
                "findings": "Database queries need optimization."
            },
            "validation_score": 0.85
        }
    ]
    
    synthesis = engine.synthesize_wave_results(1, test_agent_results)
    print(f"Wave synthesis: {synthesis}")
    
    # Test compound intelligence building
    test_context = {
        "current_wave": 2,
        "wave_1": {
            "synthesis": synthesis
        }
    }
    
    compound = engine.build_compound_intelligence(test_context)
    print(f"Compound intelligence: {compound}")
    
    # Test intelligence enhancement
    enhanced = engine.enhance_intelligence_for_injection(compound, 2, "Performance optimization task")
    print(f"Enhanced intelligence: {enhanced}")
    
    # Performance metrics
    metrics = engine.get_synthesis_metrics()
    print(f"Performance metrics: {metrics}")