#!/usr/bin/env python3
"""
Orchestration Engine - Centralized Intelligence Service Hook
Provides intelligent routing, validation, and decision-making services to other hooks
Responsibility: "Provide orchestration intelligence services"
"""

import time
import logging
import json
import hashlib
import threading
from typing import Dict, Any, Optional, List, Tuple
from contextlib import contextmanager
from collections import defaultdict
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OperationType(Enum):
    """Operation type classification"""
    ANALYSIS = "analysis"
    CREATION = "creation"
    MODIFICATION = "modification"
    DEBUGGING = "debugging"
    ITERATIVE = "iterative"
    WAVE_OPERATIONS = "wave_operations"


class DelegationStrategy(Enum):
    """Delegation strategies"""
    SINGLE_AGENT = "single_agent"
    PARALLEL_DIRS = "parallel_dirs"
    PARALLEL_FOCUS = "parallel_focus"
    ADAPTIVE_DELEGATION = "adaptive_delegation"


class WaveStrategy(Enum):
    """Wave orchestration strategies"""
    SYSTEMATIC_WAVES = "systematic_waves"
    PROGRESSIVE_WAVES = "progressive_waves"
    ADAPTIVE_WAVES = "adaptive_waves"
    ENTERPRISE_WAVES = "enterprise_waves"
    WAVE_VALIDATION = "wave_validation"


@dataclass
class RequestAnalysis:
    """Request analysis data structure"""
    complexity: float
    file_count: int
    directories: int
    domains: List[str]
    operation_types: int
    parallel_opportunities: int
    estimated_tokens: int
    focus_areas: List[str]
    quality_requirements: str
    iterative_indicators: int
    enterprise_scale: bool
    requires_search: bool
    requires_understanding: bool
    requires_documentation: bool
    requires_ui: bool
    requires_testing: bool
    specific_pattern: bool
    auto_flags: List[str]


@dataclass
class ValidationResult:
    """Operation validation result"""
    resource_check: Dict[str, Any]
    compatibility_check: Dict[str, Any]
    risk_score: float
    predictions: Dict[str, Any]
    warnings: List[str]
    recommendations: List[str]
    safe_mode_required: bool


@dataclass
class OrchestrationDecision:
    """Orchestration decision result"""
    selected_tools: List[str]
    auto_flags: List[str]
    delegation_strategy: DelegationStrategy
    wave_strategy: Optional[WaveStrategy]
    wave_eligible: bool
    wave_indicators: Dict[str, Any]
    confidence_score: float
    reasoning: str


class OrchestrationEngine:
    """
    Centralized intelligence service for SuperClaude hooks
    Responsibility: "Provide orchestration intelligence services"
    """
    
    def __init__(self):
        # Performance targets
        self.max_execution_time = 0.030  # 30ms target for intelligence operations
        
        # Performance metrics
        self.performance_metrics = defaultdict(list)
        self.lock = threading.Lock()
        
        # Intelligent caching
        self.decision_cache = {}
        self.analysis_cache = {}
        self.cache_ttl = 300  # 5 minutes
        
        # Decision history for learning
        self.decision_history = defaultdict(list)
        
        # Configuration thresholds
        self.thresholds = {
            'wave_threshold': 0.7,
            'delegation_threshold': 0.6,
            'complexity_high': 0.8,
            'complexity_medium': 0.6,
            'enterprise_file_threshold': 50,
            'enterprise_dir_threshold': 7
        }
        
        # Initialize patterns and mappings
        self._init_intelligence_patterns()
    
    def _init_intelligence_patterns(self):
        """Initialize intelligence patterns and mappings"""
        # Domain keywords mapping
        self.domain_keywords = {
            'frontend': ['ui', 'component', 'react', 'vue', 'css', 'responsive', 'accessibility'],
            'backend': ['api', 'database', 'server', 'endpoint', 'authentication', 'performance'],
            'infrastructure': ['deploy', 'docker', 'ci/cd', 'monitoring', 'scaling', 'configuration'],
            'security': ['vulnerability', 'authentication', 'encryption', 'audit', 'compliance'],
            'documentation': ['document', 'readme', 'wiki', 'guide', 'manual', 'instructions'],
            'iterative': ['improve', 'refine', 'enhance', 'correct', 'polish', 'fix', 'iterate'],
            'testing': ['test', 'e2e', 'unit', 'integration', 'qa', 'validation']
        }
        
        # Operation type patterns
        self.operation_patterns = {
            OperationType.ANALYSIS: ['analyze', 'review', 'explain', 'understand', 'investigate'],
            OperationType.CREATION: ['create', 'build', 'implement', 'generate', 'design'],
            OperationType.MODIFICATION: ['update', 'refactor', 'improve', 'optimize', 'fix'],
            OperationType.DEBUGGING: ['debug', 'fix', 'troubleshoot', 'resolve', 'investigate'],
            OperationType.ITERATIVE: ['improve', 'refine', 'enhance', 'correct', 'polish', 'iterate'],
            OperationType.WAVE_OPERATIONS: ['comprehensively', 'systematically', 'thoroughly']
        }
        
        # Tool capability mapping
        self.tool_capabilities = {
            'Grep': ['search', 'pattern_matching', 'file_analysis'],
            'Agent': ['open_ended_search', 'complex_queries', 'multi_step_analysis'],
            'Read': ['file_reading', 'content_analysis', 'simple_understanding'],
            'Sequential': ['complex_reasoning', 'multi_step_analysis', 'wave_coordination'],
            'Context7': ['documentation', 'library_patterns', 'framework_guidance'],
            'Magic': ['ui_generation', 'component_creation', 'design_systems'],
            'Playwright': ['testing', 'automation', 'performance_metrics'],
            'Task': ['delegation', 'coordination', 'complex_workflows']
        }
    
    @contextmanager
    def performance_timer(self, operation: str):
        """Performance timing context manager"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            with self.lock:
                self.performance_metrics[operation].append(duration)
            
            if duration > self.max_execution_time:
                logger.warning(f"Orchestration engine operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def analyze_request(self, hook_data: Dict[str, Any]) -> RequestAnalysis:
        """
        Analyze request to extract intelligence features
        Performance target: <30ms execution
        """
        with self.performance_timer('request_analysis'):
            try:
                # Check cache first
                request_hash = self._hash_request(hook_data)
                if request_hash in self.analysis_cache:
                    cached_item = self.analysis_cache[request_hash]
                    if time.time() - cached_item['timestamp'] < self.cache_ttl:
                        return cached_item['analysis']
                
                # Extract basic request information
                tool_call = hook_data.get('tool_call', {})
                tool_name = tool_call.get('name', '')
                tool_params = tool_call.get('parameters', {})
                context = hook_data.get('context', {})
                
                # Analyze complexity
                complexity = self._analyze_complexity(tool_name, tool_params, context)
                
                # Count files and directories
                file_count, directories = self._estimate_scope(tool_params, context)
                
                # Identify domains
                domains = self._identify_domains(tool_params, context)
                
                # Count operation types
                operation_types = len(self._identify_operation_types(tool_params, context))
                
                # Assess parallelization opportunities
                parallel_opportunities = self._assess_parallelization(tool_name, tool_params, domains)
                
                # Estimate token requirements
                estimated_tokens = self._estimate_token_requirements(tool_params, complexity, file_count)
                
                # Identify focus areas
                focus_areas = self._identify_focus_areas(tool_params, domains)
                
                # Determine quality requirements
                quality_requirements = self._determine_quality_requirements(tool_params, context)
                
                # Count iterative indicators
                iterative_indicators = self._count_iterative_indicators(tool_params)
                
                # Check enterprise scale
                enterprise_scale = self._check_enterprise_scale(file_count, directories, domains)
                
                # Determine tool requirements
                requires_search = self._requires_search(tool_name, tool_params)
                requires_understanding = self._requires_understanding(tool_name, complexity)
                requires_documentation = self._requires_documentation(tool_params)
                requires_ui = self._requires_ui(tool_params)
                requires_testing = self._requires_testing(tool_params)
                specific_pattern = self._has_specific_pattern(tool_params)
                
                analysis = RequestAnalysis(
                    complexity=complexity,
                    file_count=file_count,
                    directories=directories,
                    domains=domains,
                    operation_types=operation_types,
                    parallel_opportunities=parallel_opportunities,
                    estimated_tokens=estimated_tokens,
                    focus_areas=focus_areas,
                    quality_requirements=quality_requirements,
                    iterative_indicators=iterative_indicators,
                    enterprise_scale=enterprise_scale,
                    requires_search=requires_search,
                    requires_understanding=requires_understanding,
                    requires_documentation=requires_documentation,
                    requires_ui=requires_ui,
                    requires_testing=requires_testing,
                    specific_pattern=specific_pattern,
                    auto_flags=[]
                )
                
                # Cache analysis
                with self.lock:
                    self.analysis_cache[request_hash] = {
                        'analysis': analysis,
                        'timestamp': time.time()
                    }
                
                return analysis
                
            except Exception as e:
                logger.error(f"Request analysis failed: {e}")
                # Return minimal analysis
                return RequestAnalysis(
                    complexity=0.5, file_count=1, directories=1, domains=['unknown'],
                    operation_types=1, parallel_opportunities=0, estimated_tokens=1000,
                    focus_areas=['general'], quality_requirements='standard',
                    iterative_indicators=0, enterprise_scale=False,
                    requires_search=False, requires_understanding=True,
                    requires_documentation=False, requires_ui=False,
                    requires_testing=False, specific_pattern=False, auto_flags=[]
                )
    
    def validate_operation(self, hook_data: Dict[str, Any], analysis: RequestAnalysis) -> ValidationResult:
        """
        Validate operation before execution with resource and compatibility checks
        Performance target: <30ms execution
        """
        with self.performance_timer('operation_validation'):
            try:
                # Resource validation
                resource_check = self._check_resources(analysis)
                
                # Compatibility validation
                compatibility_check = self._check_compatibility(hook_data, analysis)
                
                # Risk assessment
                risk_score = self._assess_risk(analysis, hook_data)
                
                # Generate predictions
                predictions = self._predict_outcomes(analysis)
                
                # Generate warnings
                warnings = self._generate_warnings(analysis, risk_score)
                
                # Generate recommendations
                recommendations = self._suggest_alternatives(analysis, risk_score)
                
                # Determine if safe mode is required
                safe_mode_required = risk_score > 0.8
                
                return ValidationResult(
                    resource_check=resource_check,
                    compatibility_check=compatibility_check,
                    risk_score=risk_score,
                    predictions=predictions,
                    warnings=warnings,
                    recommendations=recommendations,
                    safe_mode_required=safe_mode_required
                )
                
            except Exception as e:
                logger.error(f"Operation validation failed: {e}")
                return ValidationResult(
                    resource_check={'status': 'error', 'message': str(e)},
                    compatibility_check={'status': 'error', 'message': str(e)},
                    risk_score=0.5,
                    predictions={'status': 'error'},
                    warnings=[f"Validation error: {str(e)}"],
                    recommendations=['Review request and retry'],
                    safe_mode_required=False
                )
    
    def make_orchestration_decision(self, hook_data: Dict[str, Any], analysis: RequestAnalysis, validation: ValidationResult) -> OrchestrationDecision:
        """
        Make comprehensive orchestration decision
        Performance target: <30ms execution
        """
        with self.performance_timer('orchestration_decision'):
            try:
                # Check decision cache
                decision_key = self._get_decision_cache_key(hook_data, analysis)
                if decision_key in self.decision_cache:
                    cached_item = self.decision_cache[decision_key]
                    if time.time() - cached_item['timestamp'] < self.cache_ttl:
                        return cached_item['decision']
                
                # Select optimal tools
                selected_tools = self._select_tools(analysis)
                
                # Determine auto-flags
                auto_flags = self._determine_auto_flags(analysis)
                
                # Evaluate delegation strategy
                delegation_strategy = self._recommend_delegation_strategy(analysis)
                
                # Evaluate wave eligibility and strategy
                wave_eligible, wave_indicators = self._detect_wave_eligibility(analysis, hook_data)
                wave_strategy = self._recommend_wave_strategy(analysis, hook_data) if wave_eligible else None
                
                # Calculate confidence score
                confidence_score = self._calculate_confidence_score(analysis, validation)
                
                # Generate reasoning
                reasoning = self._generate_reasoning(analysis, validation, selected_tools, delegation_strategy, wave_eligible)
                
                decision = OrchestrationDecision(
                    selected_tools=selected_tools,
                    auto_flags=auto_flags,
                    delegation_strategy=delegation_strategy,
                    wave_strategy=wave_strategy,
                    wave_eligible=wave_eligible,
                    wave_indicators=wave_indicators,
                    confidence_score=confidence_score,
                    reasoning=reasoning
                )
                
                # Cache decision
                with self.lock:
                    self.decision_cache[decision_key] = {
                        'decision': decision,
                        'timestamp': time.time()
                    }
                    
                    # Store in decision history for learning
                    self.decision_history[decision_key].append({
                        'decision': decision,
                        'timestamp': time.time(),
                        'analysis': analysis
                    })
                
                return decision
                
            except Exception as e:
                logger.error(f"Orchestration decision failed: {e}")
                return OrchestrationDecision(
                    selected_tools=['Sequential'],
                    auto_flags=[],
                    delegation_strategy=DelegationStrategy.SINGLE_AGENT,
                    wave_strategy=None,
                    wave_eligible=False,
                    wave_indicators={},
                    confidence_score=0.5,
                    reasoning=f"Error in decision making: {str(e)}"
                )
    
    # Helper methods for analysis
    def _analyze_complexity(self, tool_name: str, tool_params: Dict[str, Any], context: Dict[str, Any]) -> float:
        """Analyze operation complexity"""
        complexity = 0.0
        
        # Tool-based complexity
        tool_complexity = {
            'Task': 0.4, 'MultiEdit': 0.3, 'Sequential': 0.3,
            'Write': 0.2, 'Edit': 0.1, 'Read': 0.05
        }
        complexity += tool_complexity.get(tool_name, 0.1)
        
        # Parameter-based complexity
        param_text = str(tool_params).lower()
        complex_keywords = ['implement', 'refactor', 'optimize', 'migrate', 'design', 'architecture', 'comprehensive']
        for keyword in complex_keywords:
            if keyword in param_text:
                complexity += 0.1
        
        return min(complexity, 1.0)
    
    def _estimate_scope(self, tool_params: Dict[str, Any], context: Dict[str, Any]) -> Tuple[int, int]:
        """Estimate file and directory scope"""
        file_count = 1  # Default
        directories = 1  # Default
        
        # Extract from parameters
        param_text = str(tool_params).lower()
        
        # Look for scope indicators
        if 'project' in param_text or 'entire' in param_text:
            file_count = 50
            directories = 10
        elif 'directory' in param_text or 'folder' in param_text:
            file_count = 20
            directories = 5
        elif 'multiple' in param_text:
            file_count = 10
            directories = 3
        
        return file_count, directories
    
    def _identify_domains(self, tool_params: Dict[str, Any], context: Dict[str, Any]) -> List[str]:
        """Identify relevant domains"""
        param_text = str(tool_params).lower()
        identified_domains = []
        
        for domain, keywords in self.domain_keywords.items():
            if any(keyword in param_text for keyword in keywords):
                identified_domains.append(domain)
        
        return identified_domains if identified_domains else ['general']
    
    def _identify_operation_types(self, tool_params: Dict[str, Any], context: Dict[str, Any]) -> List[OperationType]:
        """Identify operation types"""
        param_text = str(tool_params).lower()
        identified_types = []
        
        for op_type, keywords in self.operation_patterns.items():
            if any(keyword in param_text for keyword in keywords):
                identified_types.append(op_type)
        
        return identified_types if identified_types else [OperationType.ANALYSIS]
    
    def _assess_parallelization(self, tool_name: str, tool_params: Dict[str, Any], domains: List[str]) -> int:
        """Assess parallelization opportunities"""
        opportunities = 0
        
        if tool_name == 'Task':
            opportunities += 2
        
        if len(domains) > 2:
            opportunities += len(domains) - 2
        
        param_text = str(tool_params).lower()
        parallel_indicators = ['multiple', 'batch', 'parallel', 'concurrent']
        for indicator in parallel_indicators:
            if indicator in param_text:
                opportunities += 1
        
        return opportunities
    
    def _estimate_token_requirements(self, tool_params: Dict[str, Any], complexity: float, file_count: int) -> int:
        """Estimate token requirements"""
        base_tokens = 1000
        
        # Complexity factor
        base_tokens += int(complexity * 5000)
        
        # File count factor
        base_tokens += file_count * 200
        
        # Parameter length factor
        param_length = len(str(tool_params))
        base_tokens += param_length
        
        return base_tokens
    
    def _identify_focus_areas(self, tool_params: Dict[str, Any], domains: List[str]) -> List[str]:
        """Identify focus areas for delegation"""
        focus_areas = []
        
        # Use domains as focus areas
        focus_areas.extend(domains)
        
        # Add specific focus indicators
        param_text = str(tool_params).lower()
        focus_keywords = {
            'performance': ['performance', 'speed', 'optimization'],
            'security': ['security', 'vulnerability', 'audit'],
            'quality': ['quality', 'validation', 'testing'],
            'architecture': ['architecture', 'design', 'structure']
        }
        
        for focus, keywords in focus_keywords.items():
            if any(keyword in param_text for keyword in keywords):
                focus_areas.append(focus)
        
        return list(set(focus_areas))
    
    def _determine_quality_requirements(self, tool_params: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Determine quality requirements level"""
        param_text = str(tool_params).lower()
        
        if any(keyword in param_text for keyword in ['critical', 'production', 'enterprise']):
            return 'critical'
        elif any(keyword in param_text for keyword in ['important', 'significant']):
            return 'high'
        else:
            return 'standard'
    
    def _count_iterative_indicators(self, tool_params: Dict[str, Any]) -> int:
        """Count iterative operation indicators"""
        param_text = str(tool_params).lower()
        iterative_keywords = ['improve', 'refine', 'enhance', 'correct', 'polish', 'iterate', 'repeatedly']
        
        count = 0
        for keyword in iterative_keywords:
            if keyword in param_text:
                count += 1
        
        return count
    
    def _check_enterprise_scale(self, file_count: int, directories: int, domains: List[str]) -> bool:
        """Check if operation is enterprise scale"""
        return (
            file_count > self.thresholds['enterprise_file_threshold'] or
            directories > self.thresholds['enterprise_dir_threshold'] or
            len(domains) > 3
        )
    
    def _requires_search(self, tool_name: str, tool_params: Dict[str, Any]) -> bool:
        """Check if operation requires search capabilities"""
        if tool_name in ['Grep', 'Agent']:
            return True
        
        param_text = str(tool_params).lower()
        search_keywords = ['find', 'search', 'locate', 'grep', 'pattern']
        return any(keyword in param_text for keyword in search_keywords)
    
    def _requires_understanding(self, tool_name: str, complexity: float) -> bool:
        """Check if operation requires understanding capabilities"""
        return complexity > 0.3 or tool_name in ['Sequential', 'Read']
    
    def _requires_documentation(self, tool_params: Dict[str, Any]) -> bool:
        """Check if operation requires documentation"""
        param_text = str(tool_params).lower()
        doc_keywords = ['library', 'framework', 'documentation', 'docs', 'guide']
        return any(keyword in param_text for keyword in doc_keywords)
    
    def _requires_ui(self, tool_params: Dict[str, Any]) -> bool:
        """Check if operation requires UI capabilities"""
        param_text = str(tool_params).lower()
        ui_keywords = ['ui', 'component', 'design', 'frontend', 'react', 'vue']
        return any(keyword in param_text for keyword in ui_keywords)
    
    def _requires_testing(self, tool_params: Dict[str, Any]) -> bool:
        """Check if operation requires testing capabilities"""
        param_text = str(tool_params).lower()
        test_keywords = ['test', 'e2e', 'testing', 'validation', 'qa']
        return any(keyword in param_text for keyword in test_keywords)
    
    def _has_specific_pattern(self, tool_params: Dict[str, Any]) -> bool:
        """Check if operation has specific search patterns"""
        param_text = str(tool_params).lower()
        return any(indicator in param_text for indicator in ['pattern', 'regex', 'match', 'specific'])
    
    # Helper methods for validation
    def _check_resources(self, analysis: RequestAnalysis) -> Dict[str, Any]:
        """Check resource availability"""
        # Simplified resource check
        resource_usage = min(0.8, analysis.estimated_tokens / 20000)  # Estimate based on tokens
        
        return {
            'status': 'ok' if resource_usage < 0.8 else 'warning',
            'estimated_usage': resource_usage,
            'available': True,
            'recommendations': ['Consider --uc mode'] if resource_usage > 0.6 else []
        }
    
    def _check_compatibility(self, hook_data: Dict[str, Any], analysis: RequestAnalysis) -> Dict[str, Any]:
        """Check flag and operation compatibility"""
        # Simplified compatibility check
        return {
            'status': 'ok',
            'conflicts': [],
            'recommendations': []
        }
    
    def _assess_risk(self, analysis: RequestAnalysis, hook_data: Dict[str, Any]) -> float:
        """Assess operation risk score"""
        risk = 0.0
        
        # Complexity risk
        if analysis.complexity > 0.8:
            risk += 0.3
        
        # Scale risk
        if analysis.enterprise_scale:
            risk += 0.2
        
        # Resource risk
        if analysis.estimated_tokens > 25000:
            risk += 0.2
        
        # Multi-domain risk
        if len(analysis.domains) > 3:
            risk += 0.1
        
        return min(risk, 1.0)
    
    def _predict_outcomes(self, analysis: RequestAnalysis) -> Dict[str, Any]:
        """Predict operation outcomes"""
        return {
            'estimated_duration': f"{analysis.complexity * 300:.0f} seconds",
            'success_probability': max(0.7, 1.0 - analysis.complexity * 0.3),
            'resource_usage': 'high' if analysis.estimated_tokens > 15000 else 'moderate'
        }
    
    def _generate_warnings(self, analysis: RequestAnalysis, risk_score: float) -> List[str]:
        """Generate operation warnings"""
        warnings = []
        
        if risk_score > 0.7:
            warnings.append("High risk operation detected")
        
        if analysis.estimated_tokens > 20000:
            warnings.append("High token usage expected")
        
        if analysis.complexity > 0.8:
            warnings.append("Complex operation - consider breaking into smaller tasks")
        
        return warnings
    
    def _suggest_alternatives(self, analysis: RequestAnalysis, risk_score: float) -> List[str]:
        """Suggest alternative approaches"""
        recommendations = []
        
        if risk_score > 0.8:
            recommendations.append("Consider using --safe-mode flag")
        
        if analysis.estimated_tokens > 15000:
            recommendations.append("Consider using --uc flag for token optimization")
        
        if analysis.enterprise_scale:
            recommendations.append("Consider delegation with --delegate flag")
        
        return recommendations
    
    # Helper methods for decision making
    def _select_tools(self, analysis: RequestAnalysis) -> List[str]:
        """Select optimal tool combination"""
        tools = []
        
        # Base tool selection logic from orchestrator_implementation.py
        if analysis.requires_search:
            tools.append("Grep" if analysis.specific_pattern else "Agent")
        
        if analysis.requires_understanding:
            tools.append("Sequential" if analysis.complexity > 0.7 else "Read")
        
        if analysis.requires_documentation:
            tools.append("Context7")
        
        if analysis.requires_ui:
            tools.append("Magic")
        
        if analysis.requires_testing:
            tools.append("Playwright")
        
        # Add Task tool for delegation scenarios
        delegation_score = self._evaluate_delegation_opportunity(analysis)
        if delegation_score > self.thresholds['delegation_threshold']:
            tools.append("Task")
        
        # Add Sequential for wave coordination if needed
        wave_score = self._evaluate_wave_opportunity(analysis)
        if wave_score > self.thresholds['wave_threshold'] and "Sequential" not in tools:
            tools.append("Sequential")
        
        return tools if tools else ["Sequential"]  # Default fallback
    
    def _determine_auto_flags(self, analysis: RequestAnalysis) -> List[str]:
        """Determine auto-flags based on analysis"""
        auto_flags = []
        
        # Delegation flags
        if analysis.directories > self.thresholds['enterprise_dir_threshold']:
            auto_flags.append("--delegate --parallel-dirs")
        elif len(analysis.focus_areas) > 2:
            auto_flags.append("--multi-agent --parallel-focus")
        elif analysis.complexity > self.thresholds['complexity_high']:
            auto_flags.append("--delegate --focus-agents")
        
        # Wave flags
        wave_score = self._evaluate_wave_opportunity(analysis)
        if wave_score > self.thresholds['wave_threshold']:
            if analysis.quality_requirements == "critical":
                auto_flags.append("--wave-mode --wave-validation")
            elif analysis.operation_types > 2:
                auto_flags.append("--wave-mode --adaptive-waves")
            elif analysis.complexity > self.thresholds['complexity_high']:
                auto_flags.append("--wave-mode --progressive-waves")
            else:
                auto_flags.append("--wave-mode --systematic-waves")
        
        # Performance flags
        if analysis.estimated_tokens > 15000:
            auto_flags.append("--uc")
        
        return auto_flags
    
    def _evaluate_delegation_opportunity(self, analysis: RequestAnalysis) -> float:
        """Evaluate delegation opportunity score"""
        score = 0.0
        
        # Complexity factor
        if analysis.complexity > self.thresholds['complexity_medium']:
            score += 0.3
        
        # Parallelization factor
        if analysis.parallel_opportunities > 0:
            score += 0.4 * min(analysis.parallel_opportunities / 5, 1.0)
        
        # Resource factor
        if analysis.estimated_tokens > 15000:
            score += 0.2
        
        # Multi-domain factor
        if len(analysis.domains) > 2:
            score += 0.1 * len(analysis.domains)
        
        return min(score, 1.0)
    
    def _evaluate_wave_opportunity(self, analysis: RequestAnalysis) -> float:
        """Evaluate wave opportunity score"""
        score = 0.0
        
        # High complexity factor
        if analysis.complexity > self.thresholds['complexity_high']:
            score += 0.4
        
        # Multiple operation types
        if analysis.operation_types > 2:
            score += 0.3
        
        # Critical quality requirements
        if analysis.quality_requirements == "critical":
            score += 0.2
        
        # Large file count
        if analysis.file_count > 50:
            score += 0.1
        
        # Iterative indicators
        if analysis.iterative_indicators > 0:
            score += 0.2 * min(analysis.iterative_indicators / 3, 1.0)
        
        # Enterprise scale
        if analysis.enterprise_scale:
            score += 0.15
        
        return min(score, 1.0)
    
    def _detect_wave_eligibility(self, analysis: RequestAnalysis, hook_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Detect wave eligibility with indicators"""
        wave_score = self._evaluate_wave_opportunity(analysis)
        
        wave_indicators = {
            'complexity_score': 0.4 if analysis.complexity > 0.8 else 0.2 if analysis.complexity > 0.6 else 0.0,
            'scale_score': 0.3 if analysis.file_count > 100 else 0.2 if analysis.file_count > 50 else 0.0,
            'operation_score': 0.2 if analysis.operation_types > 2 else 0.0,
            'domain_score': 0.1 if len(analysis.domains) > 3 else 0.0,
            'wave_score': wave_score
        }
        
        total_score = sum(wave_indicators.values())
        is_eligible = total_score >= self.thresholds['wave_threshold']
        
        return is_eligible, wave_indicators
    
    def _recommend_delegation_strategy(self, analysis: RequestAnalysis) -> DelegationStrategy:
        """Recommend delegation strategy"""
        wave_score = self._evaluate_wave_opportunity(analysis)
        
        if wave_score > self.thresholds['wave_threshold']:
            return DelegationStrategy.ADAPTIVE_DELEGATION  # Let wave strategy handle it
        
        if analysis.directories > self.thresholds['enterprise_dir_threshold']:
            return DelegationStrategy.PARALLEL_DIRS
        elif len(analysis.focus_areas) > 2:
            return DelegationStrategy.PARALLEL_FOCUS
        elif analysis.complexity > self.thresholds['complexity_high']:
            return DelegationStrategy.ADAPTIVE_DELEGATION
        else:
            return DelegationStrategy.SINGLE_AGENT
    
    def _recommend_wave_strategy(self, analysis: RequestAnalysis, hook_data: Dict[str, Any]) -> WaveStrategy:
        """Recommend wave strategy"""
        if analysis.quality_requirements == "critical":
            return WaveStrategy.WAVE_VALIDATION
        elif analysis.operation_types > 2:
            return WaveStrategy.ADAPTIVE_WAVES
        elif analysis.complexity > self.thresholds['complexity_high'] and analysis.file_count > 50:
            return WaveStrategy.PROGRESSIVE_WAVES
        elif analysis.enterprise_scale:
            return WaveStrategy.ENTERPRISE_WAVES
        else:
            return WaveStrategy.SYSTEMATIC_WAVES
    
    def _calculate_confidence_score(self, analysis: RequestAnalysis, validation: ValidationResult) -> float:
        """Calculate confidence score for the decision"""
        base_confidence = 0.8
        
        # Adjust based on complexity
        if analysis.complexity > 0.8:
            base_confidence -= 0.1
        
        # Adjust based on risk
        base_confidence -= validation.risk_score * 0.2
        
        # Adjust based on domain coverage
        if len(analysis.domains) > 1:
            base_confidence += 0.1
        
        return max(0.1, min(1.0, base_confidence))
    
    def _generate_reasoning(self, analysis: RequestAnalysis, validation: ValidationResult, 
                          tools: List[str], delegation_strategy: DelegationStrategy, 
                          wave_eligible: bool) -> str:
        """Generate reasoning for the orchestration decision"""
        reasoning_parts = []
        
        # Complexity reasoning
        if analysis.complexity > 0.7:
            reasoning_parts.append(f"High complexity ({analysis.complexity:.2f}) detected")
        
        # Tool selection reasoning
        reasoning_parts.append(f"Selected tools: {', '.join(tools)}")
        
        # Delegation reasoning
        if delegation_strategy != DelegationStrategy.SINGLE_AGENT:
            reasoning_parts.append(f"Delegation strategy: {delegation_strategy.value}")
        
        # Wave reasoning
        if wave_eligible:
            reasoning_parts.append("Wave mode eligible for systematic execution")
        
        # Risk reasoning
        if validation.risk_score > 0.5:
            reasoning_parts.append(f"Risk level: {validation.risk_score:.2f}")
        
        return " | ".join(reasoning_parts)
    
    # Utility methods
    def _hash_request(self, hook_data: Dict[str, Any]) -> str:
        """Generate hash for request caching"""
        request_str = json.dumps(hook_data, sort_keys=True)
        return hashlib.md5(request_str.encode()).hexdigest()
    
    def _get_decision_cache_key(self, hook_data: Dict[str, Any], analysis: RequestAnalysis) -> str:
        """Generate cache key for decisions"""
        key_data = {
            'complexity': round(analysis.complexity, 2),
            'file_count': analysis.file_count,
            'domains': sorted(analysis.domains),
            'operation_types': analysis.operation_types,
            'quality': analysis.quality_requirements
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get orchestration engine performance metrics"""
        metrics = {}
        
        with self.lock:
            for operation, times in self.performance_metrics.items():
                if times:
                    metrics[operation] = {
                        'avg_time': sum(times) / len(times),
                        'max_time': max(times),
                        'min_time': min(times),
                        'count': len(times),
                        'target_met': all(t <= self.max_execution_time for t in times[-10:])
                    }
        
        return {
            "performance_metrics": metrics,
            "cache_stats": {
                "decision_cache_size": len(self.decision_cache),
                "analysis_cache_size": len(self.analysis_cache),
                "cache_ttl": self.cache_ttl
            },
            "decision_stats": {
                "total_decisions": sum(len(decisions) for decisions in self.decision_history.values()),
                "unique_patterns": len(self.decision_history)
            },
            "performance_targets": {
                "max_execution_time": self.max_execution_time,
                "cache_ttl": self.cache_ttl
            },
            "thresholds": self.thresholds
        }


# Global instance
_orchestration_engine = None


def get_orchestration_engine() -> OrchestrationEngine:
    """Get global orchestration engine instance"""
    global _orchestration_engine
    if _orchestration_engine is None:
        _orchestration_engine = OrchestrationEngine()
    return _orchestration_engine


def orchestrate_intelligence(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main orchestration intelligence interface
    
    Args:
        action: Action to perform (analyze, validate, decide, get_metrics)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        engine = get_orchestration_engine()
        
        result = {}
        
        if action == "analyze":
            hook_data = kwargs.get("hook_data", {})
            analysis = engine.analyze_request(hook_data)
            result = {"analysis": asdict(analysis)}
            
        elif action == "validate":
            hook_data = kwargs.get("hook_data", {})
            analysis = kwargs.get("analysis")
            if isinstance(analysis, dict):
                analysis = RequestAnalysis(**analysis)
            validation = engine.validate_operation(hook_data, analysis)
            result = {"validation": asdict(validation)}
            
        elif action == "decide":
            hook_data = kwargs.get("hook_data", {})
            analysis = kwargs.get("analysis")
            validation = kwargs.get("validation")
            
            if isinstance(analysis, dict):
                analysis = RequestAnalysis(**analysis)
            if isinstance(validation, dict):
                validation = ValidationResult(**validation)
                
            decision = engine.make_orchestration_decision(hook_data, analysis, validation)
            result = {"decision": asdict(decision)}
            
        elif action == "full_orchestration":
            # Complete orchestration pipeline
            hook_data = kwargs.get("hook_data", {})
            
            analysis = engine.analyze_request(hook_data)
            validation = engine.validate_operation(hook_data, analysis)
            decision = engine.make_orchestration_decision(hook_data, analysis, validation)
            
            result = {
                "analysis": asdict(analysis),
                "validation": asdict(validation),
                "decision": asdict(decision)
            }
            
        elif action == "get_metrics":
            result = engine.get_performance_metrics()
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': engine.get_performance_metrics(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Orchestration intelligence action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }


if __name__ == "__main__":
    # Test the orchestration engine
    engine = OrchestrationEngine()
    
    # Test request analysis
    test_hook_data = {
        'tool_call': {
            'name': 'Task',
            'parameters': {
                'description': 'Implement comprehensive user authentication system with React UI and testing',
                'context': 'Large enterprise application with multiple domains'
            }
        },
        'context': {}
    }
    
    analysis = engine.analyze_request(test_hook_data)
    print(f"Analysis: {asdict(analysis)}")
    
    # Test validation
    validation = engine.validate_operation(test_hook_data, analysis)
    print(f"Validation: {asdict(validation)}")
    
    # Test decision making
    decision = engine.make_orchestration_decision(test_hook_data, analysis, validation)
    print(f"Decision: {asdict(decision)}")
    
    # Test interface function
    result = orchestrate_intelligence("full_orchestration", hook_data=test_hook_data)
    print(f"Interface result: {result['success']}")
    print(f"Decision confidence: {result['result']['decision']['confidence_score']:.2f}")
    
    # Performance metrics
    metrics = engine.get_performance_metrics()
    print(f"Performance metrics: {metrics}")