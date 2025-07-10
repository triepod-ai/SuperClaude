#!/usr/bin/env python3
"""
Quality Validator - Quality Gates Validation System
Handles quality gate validation for steps 2.5 & 7.5 in 10-step validation cycle
Responsibility: "Validate quality gates and standards"
"""

import time
import logging
import json
import re
from typing import Dict, Any, Optional, List, Tuple
from contextlib import contextmanager
from collections import defaultdict
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QualityLevel(Enum):
    """Quality assessment levels"""
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    NEEDS_IMPROVEMENT = "needs_improvement"
    POOR = "poor"


class ValidationStep(Enum):
    """Validation step types"""
    STEP_2_5 = "step_2_5"  # Mid-cycle validation
    STEP_7_5 = "step_7_5"  # Pre-completion validation
    ADHOC = "adhoc"        # Ad-hoc validation


@dataclass
class QualityMetrics:
    """Quality validation metrics"""
    code_quality_score: float
    performance_score: float
    security_score: float
    maintainability_score: float
    documentation_score: float
    test_coverage_score: float
    overall_score: float
    validation_time: float


class QualityValidator:
    """
    Focused quality validation system
    Responsibility: "Validate quality gates and standards"
    """
    
    def __init__(self):
        # Performance targets
        self.max_execution_time = 0.050  # 50ms target
        
        # Quality thresholds
        self.quality_thresholds = {
            "excellent": 0.9,
            "good": 0.8,
            "acceptable": 0.7,
            "needs_improvement": 0.6,
            "poor": 0.0
        }
        
        # Performance metrics
        self.performance_metrics = defaultdict(list)
        
        # Validation cache
        self.validation_cache = {}
        self.cache_ttl = 300  # 5 minutes
        
        # Quality patterns
        self._init_quality_patterns()
    
    def _init_quality_patterns(self):
        """Initialize quality validation patterns"""
        self.code_patterns = {
            "excellent": [
                r"class\s+\w+:",  # Class definitions
                r"def\s+\w+\(.*\)\s*->",  # Type hints
                r'""".*"""',  # Docstrings
                r"@\w+",  # Decorators
                r"try:",  # Error handling
            ],
            "poor": [
                r"print\(",  # Debug prints
                r"TODO:",  # TODO comments
                r"FIXME:",  # FIXME comments
                r"hack|kludge",  # Poor code indicators
            ]
        }
        
        self.security_patterns = {
            "excellent": [
                r"logging\.",  # Proper logging
                r"validate_",  # Input validation
                r"sanitize_",  # Data sanitization
            ],
            "poor": [
                r"eval\(",  # Dangerous eval
                r"exec\(",  # Dangerous exec
                r"shell=True",  # Shell injection risk
                r"password.*=",  # Hardcoded passwords
            ]
        }
    
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
                logger.warning(f"Quality validator operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def validate_code_quality(self, code_content: str) -> Tuple[float, List[str]]:
        """
        Validate code quality
        Performance target: <50ms execution
        """
        with self.performance_timer('code_quality_validation'):
            try:
                issues = []
                score = 0.8  # Base score
                
                if not code_content.strip():
                    return 0.0, ["Empty code content"]
                
                # Check for excellent patterns
                excellent_matches = 0
                for pattern in self.code_patterns["excellent"]:
                    matches = len(re.findall(pattern, code_content, re.MULTILINE))
                    excellent_matches += matches
                
                # Check for poor patterns
                poor_matches = 0
                for pattern in self.code_patterns["poor"]:
                    matches = re.findall(pattern, code_content, re.MULTILINE | re.IGNORECASE)
                    poor_matches += len(matches)
                    if matches:
                        issues.extend([f"Found poor pattern: {match}" for match in matches[:3]])
                
                # Calculate score adjustments
                excellent_bonus = min(0.2, excellent_matches * 0.02)
                poor_penalty = min(0.4, poor_matches * 0.05)
                
                final_score = max(0.0, min(1.0, score + excellent_bonus - poor_penalty))
                
                # Line-based quality checks
                lines = code_content.split('\n')
                if len(lines) > 500:
                    final_score -= 0.1
                    issues.append("File is very long (>500 lines)")
                
                # Check for proper function length
                function_lines = self._analyze_function_lengths(code_content)
                if any(length > 50 for length in function_lines):
                    final_score -= 0.1
                    issues.append("Some functions are very long (>50 lines)")
                
                return final_score, issues
                
            except Exception as e:
                logger.error(f"Code quality validation failed: {e}")
                return 0.5, [f"Validation error: {str(e)}"]
    
    def validate_security(self, content: str) -> Tuple[float, List[str]]:
        """
        Validate security aspects
        Performance target: <50ms execution
        """
        with self.performance_timer('security_validation'):
            try:
                issues = []
                score = 0.9  # Base score (assume secure)
                
                # Check for security anti-patterns
                poor_matches = 0
                for pattern in self.security_patterns["poor"]:
                    matches = re.findall(pattern, content, re.MULTILINE | re.IGNORECASE)
                    poor_matches += len(matches)
                    if matches:
                        issues.extend([f"Security risk: {match}" for match in matches[:3]])
                
                # Check for good security patterns
                excellent_matches = 0
                for pattern in self.security_patterns["excellent"]:
                    matches = len(re.findall(pattern, content, re.MULTILINE))
                    excellent_matches += matches
                
                # Calculate score
                security_penalty = min(0.8, poor_matches * 0.2)
                security_bonus = min(0.1, excellent_matches * 0.01)
                
                final_score = max(0.0, min(1.0, score - security_penalty + security_bonus))
                
                # Additional security checks
                if "password" in content.lower() and "=" in content:
                    if not any(word in content.lower() for word in ["input", "prompt", "config", "env"]):
                        final_score -= 0.3
                        issues.append("Potential hardcoded credential")
                
                return final_score, issues
                
            except Exception as e:
                logger.error(f"Security validation failed: {e}")
                return 0.5, [f"Security validation error: {str(e)}"]
    
    def validate_performance(self, content: str, context: Dict[str, Any]) -> Tuple[float, List[str]]:
        """
        Validate performance aspects
        Performance target: <50ms execution
        """
        with self.performance_timer('performance_validation'):
            try:
                issues = []
                score = 0.8  # Base score
                
                # Check for performance anti-patterns
                performance_issues = [
                    (r"for.*in.*for.*in", "Nested loops detected"),
                    (r"\.sleep\(\d+\)", "Long sleep operations"),
                    (r"while\s+True:", "Infinite loops without break conditions"),
                ]
                
                for pattern, issue_desc in performance_issues:
                    if re.search(pattern, content, re.MULTILINE):
                        score -= 0.1
                        issues.append(issue_desc)
                
                # Check for performance optimizations
                good_patterns = [
                    (r"@lru_cache", "LRU caching used"),
                    (r"with.*timer", "Performance timing"),
                    (r"concurrent\.futures", "Concurrent execution"),
                ]
                
                for pattern, optimization in good_patterns:
                    if re.search(pattern, content, re.MULTILINE):
                        score += 0.05
                
                # Context-based performance checks
                if "performance_metrics" in context:
                    metrics = context["performance_metrics"]
                    if isinstance(metrics, dict):
                        avg_times = [m.get("avg_time", 0) for m in metrics.values() if isinstance(m, dict)]
                        if avg_times and max(avg_times) > 0.1:
                            score -= 0.2
                            issues.append("High average execution times detected")
                
                return max(0.0, min(1.0, score)), issues
                
            except Exception as e:
                logger.error(f"Performance validation failed: {e}")
                return 0.5, [f"Performance validation error: {str(e)}"]
    
    def validate_maintainability(self, content: str) -> Tuple[float, List[str]]:
        """
        Validate maintainability aspects
        Performance target: <50ms execution
        """
        with self.performance_timer('maintainability_validation'):
            try:
                issues = []
                score = 0.8  # Base score
                
                # Check for maintainability indicators
                good_patterns = [
                    (r'""".*"""', "Docstrings present"),
                    (r"def\s+\w+\(.*\)\s*->", "Type hints used"),
                    (r"class\s+\w+:", "Object-oriented structure"),
                    (r"import\s+\w+", "Proper imports"),
                ]
                
                good_count = 0
                for pattern, desc in good_patterns:
                    if re.search(pattern, content, re.MULTILINE | re.DOTALL):
                        good_count += 1
                
                score += good_count * 0.05
                
                # Check for maintainability issues
                lines = content.split('\n')
                
                # Long line check
                long_lines = [i for i, line in enumerate(lines) if len(line) > 120]
                if long_lines:
                    score -= min(0.2, len(long_lines) * 0.01)
                    issues.append(f"{len(long_lines)} lines exceed 120 characters")
                
                # Complexity indicators
                if content.count('if') > 20:
                    score -= 0.1
                    issues.append("High cyclomatic complexity")
                
                # Comment ratio
                comment_lines = [line for line in lines if line.strip().startswith('#')]
                if lines and len(comment_lines) / len(lines) < 0.1:
                    score -= 0.1
                    issues.append("Low comment ratio")
                
                return max(0.0, min(1.0, score)), issues
                
            except Exception as e:
                logger.error(f"Maintainability validation failed: {e}")
                return 0.5, [f"Maintainability validation error: {str(e)}"]
    
    def _analyze_function_lengths(self, content: str) -> List[int]:
        """Analyze function lengths in code"""
        try:
            function_lengths = []
            lines = content.split('\n')
            
            in_function = False
            current_function_length = 0
            indent_level = 0
            
            for line in lines:
                stripped = line.strip()
                
                if re.match(r'def\s+\w+', stripped):
                    if in_function:
                        function_lengths.append(current_function_length)
                    in_function = True
                    current_function_length = 1
                    indent_level = len(line) - len(line.lstrip())
                elif in_function:
                    if stripped and not stripped.startswith('#'):
                        current_line_indent = len(line) - len(line.lstrip())
                        if current_line_indent <= indent_level and stripped:
                            function_lengths.append(current_function_length)
                            in_function = False
                            current_function_length = 0
                        else:
                            current_function_length += 1
            
            if in_function:
                function_lengths.append(current_function_length)
            
            return function_lengths
            
        except Exception as e:
            logger.error(f"Function length analysis failed: {e}")
            return []
    
    def validate_quality_gate(self, step: ValidationStep, content: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate quality gate for specific step
        Performance target: <50ms execution
        """
        with self.performance_timer('quality_gate_validation'):
            try:
                # Check cache first
                cache_key = f"{step.value}_{hash(content)}_{hash(str(context))}"
                if cache_key in self.validation_cache:
                    cached_item = self.validation_cache[cache_key]
                    if time.time() - cached_item["timestamp"] < self.cache_ttl:
                        return cached_item["result"]
                
                start_time = time.time()
                
                # Run all validations
                code_score, code_issues = self.validate_code_quality(content)
                security_score, security_issues = self.validate_security(content)
                performance_score, perf_issues = self.validate_performance(content, context)
                maintainability_score, maint_issues = self.validate_maintainability(content)
                
                # Documentation and test coverage (simplified for now)
                documentation_score = 0.8 if '"""' in content else 0.3
                test_coverage_score = 0.7 if 'test' in content.lower() else 0.2
                
                # Calculate overall score
                weights = {
                    "code_quality": 0.25,
                    "security": 0.20,
                    "performance": 0.20,
                    "maintainability": 0.20,
                    "documentation": 0.10,
                    "test_coverage": 0.05
                }
                
                overall_score = (
                    code_score * weights["code_quality"] +
                    security_score * weights["security"] +
                    performance_score * weights["performance"] +
                    maintainability_score * weights["maintainability"] +
                    documentation_score * weights["documentation"] +
                    test_coverage_score * weights["test_coverage"]
                )
                
                # Determine quality level
                quality_level = QualityLevel.POOR
                for level, threshold in sorted(self.quality_thresholds.items(), key=lambda x: x[1], reverse=True):
                    if overall_score >= threshold:
                        quality_level = QualityLevel(level)
                        break
                
                # Collect all issues
                all_issues = code_issues + security_issues + perf_issues + maint_issues
                
                # Create metrics
                validation_time = time.time() - start_time
                metrics = QualityMetrics(
                    code_quality_score=code_score,
                    performance_score=performance_score,
                    security_score=security_score,
                    maintainability_score=maintainability_score,
                    documentation_score=documentation_score,
                    test_coverage_score=test_coverage_score,
                    overall_score=overall_score,
                    validation_time=validation_time
                )
                
                result = {
                    "step": step.value,
                    "quality_level": quality_level.value,
                    "overall_score": overall_score,
                    "metrics": {
                        "code_quality": code_score,
                        "security": security_score,
                        "performance": performance_score,
                        "maintainability": maintainability_score,
                        "documentation": documentation_score,
                        "test_coverage": test_coverage_score
                    },
                    "issues": all_issues[:10],  # Top 10 issues
                    "validation_time": validation_time,
                    "passed": overall_score >= self.quality_thresholds["acceptable"],
                    "recommendations": self._generate_recommendations(quality_level, all_issues)
                }
                
                # Cache result
                self.validation_cache[cache_key] = {
                    "result": result,
                    "timestamp": time.time()
                }
                
                return result
                
            except Exception as e:
                logger.error(f"Quality gate validation failed: {e}")
                return {
                    "step": step.value,
                    "quality_level": QualityLevel.POOR.value,
                    "overall_score": 0.0,
                    "error": str(e),
                    "passed": False
                }
    
    def _generate_recommendations(self, quality_level: QualityLevel, issues: List[str]) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        if quality_level in [QualityLevel.POOR, QualityLevel.NEEDS_IMPROVEMENT]:
            recommendations.append("Consider refactoring to improve code quality")
            recommendations.append("Add comprehensive error handling")
            recommendations.append("Improve documentation with docstrings")
        
        if any("security" in issue.lower() for issue in issues):
            recommendations.append("Review and fix security vulnerabilities")
            recommendations.append("Implement input validation and sanitization")
        
        if any("performance" in issue.lower() for issue in issues):
            recommendations.append("Optimize performance-critical sections")
            recommendations.append("Consider caching and async operations")
        
        if len(issues) > 5:
            recommendations.append("Address critical issues before proceeding")
        
        return recommendations[:5]  # Top 5 recommendations
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get quality validator performance metrics"""
        summary = {}
        
        for operation, times in self.performance_metrics.items():
            if times:
                summary[operation] = {
                    'avg_time': sum(times) / len(times),
                    'max_time': max(times),
                    'min_time': min(times),
                    'count': len(times),
                    'target_met': all(t <= self.max_execution_time for t in times[-10:])
                }
        
        return {
            "performance_metrics": summary,
            "cache_entries": len(self.validation_cache),
            "performance_targets": {
                "max_execution_time": self.max_execution_time,
                "cache_ttl": self.cache_ttl
            }
        }


# Global instance
_quality_validator = None


def get_quality_validator() -> QualityValidator:
    """Get global quality validator instance"""
    global _quality_validator
    if _quality_validator is None:
        _quality_validator = QualityValidator()
    return _quality_validator


def validate_quality_gates(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main quality validation interface
    
    Args:
        action: Action to perform (validate_gate, validate_code, validate_security, get_metrics)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (validation result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        validator = get_quality_validator()
        
        result = {}
        
        if action == "validate_gate":
            step = ValidationStep(kwargs.get("step", "adhoc"))
            content = kwargs.get("content", "")
            context = kwargs.get("context", {})
            
            result = validator.validate_quality_gate(step, content, context)
            
        elif action == "validate_code":
            score, issues = validator.validate_code_quality(kwargs.get("content", ""))
            result = {"code_quality_score": score, "issues": issues}
            
        elif action == "validate_security":
            score, issues = validator.validate_security(kwargs.get("content", ""))
            result = {"security_score": score, "issues": issues}
            
        elif action == "validate_performance":
            score, issues = validator.validate_performance(
                kwargs.get("content", ""),
                kwargs.get("context", {})
            )
            result = {"performance_score": score, "issues": issues}
            
        elif action == "get_metrics":
            result = validator.get_performance_metrics()
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': validator.get_performance_metrics(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Quality validation action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }


if __name__ == "__main__":
    # Test the quality validator
    validator = QualityValidator()
    
    # Test code quality validation
    test_code = '''
def test_function(param: str) -> str:
    """Test function with proper documentation."""
    try:
        result = param.upper()
        return result
    except Exception as e:
        logger.error(f"Error: {e}")
        return ""
    '''
    
    # Test quality gate validation
    result = validator.validate_quality_gate(
        ValidationStep.STEP_2_5,
        test_code,
        {"performance_metrics": {}}
    )
    
    print(f"Quality gate validation: {json.dumps(result, indent=2)}")
    
    # Test interface function
    interface_result = validate_quality_gates(
        "validate_gate",
        step="step_2_5",
        content=test_code,
        context={}
    )
    
    print(f"Interface result: {interface_result['success']}")
    print(f"Quality level: {interface_result['result'].get('quality_level')}")
    print(f"Overall score: {interface_result['result'].get('overall_score', 0):.2f}")