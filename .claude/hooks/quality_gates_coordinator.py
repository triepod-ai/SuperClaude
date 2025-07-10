#!/usr/bin/env python3
"""
Quality Gates Coordinator - 10-Step Validation Cycle Integration
Integrates quality validation into steps 2.5 & 7.5 of the validation cycle
Responsibility: "Coordinate quality gates in validation cycle"
"""

import time
import logging
import json
from typing import Dict, Any, Optional, List, Tuple
from contextlib import contextmanager
from collections import defaultdict
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

# Import our quality validator and hook registry
try:
    from quality_validator import get_quality_validator, ValidationStep, validate_quality_gates
    from hook_registry import get_hook_registry, manage_hook_registry
    from performance_monitor import get_performance_monitor, monitor_performance
except ImportError:
    # Fallback for testing
    pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ValidationCycleStep(Enum):
    """10-step validation cycle steps"""
    STEP_1 = "step_1"    # Initial validation
    STEP_2 = "step_2"    # Requirements validation
    STEP_2_5 = "step_2_5"  # Mid-cycle quality gate
    STEP_3 = "step_3"    # Design validation
    STEP_4 = "step_4"    # Implementation validation
    STEP_5 = "step_5"    # Integration validation
    STEP_6 = "step_6"    # Testing validation
    STEP_7 = "step_7"    # Pre-deployment validation
    STEP_7_5 = "step_7_5"  # Pre-completion quality gate
    STEP_8 = "step_8"    # Deployment validation
    STEP_9 = "step_9"    # Post-deployment validation
    STEP_10 = "step_10"  # Final validation


class QualityGateResult(Enum):
    """Quality gate results"""
    PASS = "pass"
    PASS_WITH_WARNINGS = "pass_with_warnings"
    FAIL = "fail"
    SKIP = "skip"


@dataclass
class ValidationContext:
    """Validation cycle context"""
    current_step: ValidationCycleStep
    content: str
    metadata: Dict[str, Any]
    previous_results: List[Dict[str, Any]]
    quality_requirements: Dict[str, float]


class QualityGatesCoordinator:
    """
    Quality gates coordination system
    Responsibility: "Coordinate quality gates in validation cycle"
    """
    
    def __init__(self):
        # Performance targets
        self.max_execution_time = 0.100  # 100ms target for full cycle
        
        # Quality gate configuration
        self.quality_gates_config = {
            ValidationCycleStep.STEP_2_5: {
                "enabled": True,
                "minimum_score": 0.7,
                "critical_checks": ["security", "code_quality"],
                "timeout": 10.0
            },
            ValidationCycleStep.STEP_7_5: {
                "enabled": True,
                "minimum_score": 0.8,
                "critical_checks": ["security", "performance", "maintainability"],
                "timeout": 15.0
            }
        }
        
        # Performance metrics
        self.performance_metrics = defaultdict(list)
        
        # Validation history
        self.validation_history = defaultdict(list)
        
        # Quality trends
        self.quality_trends = defaultdict(list)
    
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
                logger.warning(f"Quality gates coordinator operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def execute_validation_step(self, context: ValidationContext) -> Dict[str, Any]:
        """
        Execute validation step with quality gates
        Performance target: <100ms execution
        """
        with self.performance_timer('validation_step_execution'):
            try:
                step_start = time.time()
                
                # Standard validation logic
                standard_result = self._execute_standard_validation(context)
                
                # Check if this is a quality gate step
                if context.current_step in [ValidationCycleStep.STEP_2_5, ValidationCycleStep.STEP_7_5]:
                    quality_result = self._execute_quality_gate(context)
                    
                    # Combine results
                    combined_result = self._combine_validation_results(
                        standard_result, 
                        quality_result,
                        context
                    )
                else:
                    combined_result = standard_result
                
                # Update trends and history
                self._update_validation_history(context, combined_result)
                
                # Performance monitoring
                execution_time = time.time() - step_start
                self._record_performance_metrics(context.current_step, execution_time)
                
                combined_result["execution_time"] = execution_time
                combined_result["timestamp"] = time.time()
                
                return combined_result
                
            except Exception as e:
                logger.error(f"Validation step execution failed: {e}")
                return {
                    "success": False,
                    "step": context.current_step.value,
                    "error": str(e),
                    "quality_gate_result": QualityGateResult.FAIL.value
                }
    
    def _execute_standard_validation(self, context: ValidationContext) -> Dict[str, Any]:
        """Execute standard validation logic for the step"""
        try:
            # Step-specific validation logic
            validation_checks = []
            
            if context.current_step == ValidationCycleStep.STEP_1:
                validation_checks = ["input_validation", "context_validation"]
            elif context.current_step == ValidationCycleStep.STEP_2:
                validation_checks = ["requirements_completeness", "feasibility_check"]
            elif context.current_step == ValidationCycleStep.STEP_3:
                validation_checks = ["design_consistency", "architecture_validation"]
            elif context.current_step == ValidationCycleStep.STEP_4:
                validation_checks = ["implementation_correctness", "coding_standards"]
            elif context.current_step == ValidationCycleStep.STEP_5:
                validation_checks = ["integration_compatibility", "interface_validation"]
            elif context.current_step == ValidationCycleStep.STEP_6:
                validation_checks = ["test_coverage", "test_effectiveness"]
            elif context.current_step == ValidationCycleStep.STEP_7:
                validation_checks = ["deployment_readiness", "configuration_validation"]
            elif context.current_step == ValidationCycleStep.STEP_8:
                validation_checks = ["deployment_success", "environment_validation"]
            elif context.current_step == ValidationCycleStep.STEP_9:
                validation_checks = ["operational_validation", "monitoring_setup"]
            elif context.current_step == ValidationCycleStep.STEP_10:
                validation_checks = ["final_verification", "documentation_completeness"]
            
            # Execute validation checks
            check_results = []
            overall_success = True
            
            for check in validation_checks:
                check_result = self._execute_validation_check(check, context)
                check_results.append(check_result)
                if not check_result.get("passed", False):
                    overall_success = False
            
            return {
                "success": overall_success,
                "step": context.current_step.value,
                "validation_checks": check_results,
                "standard_validation": True
            }
            
        except Exception as e:
            logger.error(f"Standard validation failed for {context.current_step}: {e}")
            return {
                "success": False,
                "step": context.current_step.value,
                "error": str(e)
            }
    
    def _execute_quality_gate(self, context: ValidationContext) -> Dict[str, Any]:
        """Execute quality gate validation"""
        try:
            step_config = self.quality_gates_config.get(context.current_step)
            if not step_config or not step_config["enabled"]:
                return {
                    "quality_gate_result": QualityGateResult.SKIP.value,
                    "reason": "Quality gate disabled"
                }
            
            # Map to quality validator step
            if context.current_step == ValidationCycleStep.STEP_2_5:
                validator_step = "step_2_5"
            elif context.current_step == ValidationCycleStep.STEP_7_5:
                validator_step = "step_7_5"
            else:
                validator_step = "adhoc"
            
            # Execute quality validation
            quality_result = validate_quality_gates(
                "validate_gate",
                step=validator_step,
                content=context.content,
                context=context.metadata
            )
            
            if not quality_result["success"]:
                return {
                    "quality_gate_result": QualityGateResult.FAIL.value,
                    "error": quality_result.get("errors", ["Unknown error"])
                }
            
            # Analyze quality results
            validation_data = quality_result["result"]
            overall_score = validation_data.get("overall_score", 0.0)
            quality_level = validation_data.get("quality_level", "poor")
            issues = validation_data.get("issues", [])
            
            # Determine gate result
            minimum_score = step_config["minimum_score"]
            critical_checks = step_config["critical_checks"]
            
            # Check critical requirements
            critical_failures = []
            metrics = validation_data.get("metrics", {})
            
            for check in critical_checks:
                if check in metrics:
                    score = metrics[check]
                    if score < minimum_score:
                        critical_failures.append(f"{check}: {score:.2f} < {minimum_score}")
            
            # Determine final result
            if critical_failures:
                gate_result = QualityGateResult.FAIL
            elif overall_score >= minimum_score:
                if len(issues) > 3:
                    gate_result = QualityGateResult.PASS_WITH_WARNINGS
                else:
                    gate_result = QualityGateResult.PASS
            else:
                gate_result = QualityGateResult.FAIL
            
            # Record quality trend
            self.quality_trends[context.current_step].append({
                "timestamp": time.time(),
                "overall_score": overall_score,
                "quality_level": quality_level
            })
            
            return {
                "quality_gate_result": gate_result.value,
                "overall_score": overall_score,
                "quality_level": quality_level,
                "metrics": metrics,
                "issues": issues[:5],  # Top 5 issues
                "critical_failures": critical_failures,
                "recommendations": validation_data.get("recommendations", [])
            }
            
        except Exception as e:
            logger.error(f"Quality gate execution failed: {e}")
            return {
                "quality_gate_result": QualityGateResult.FAIL.value,
                "error": str(e)
            }
    
    def _execute_validation_check(self, check_name: str, context: ValidationContext) -> Dict[str, Any]:
        """Execute individual validation check"""
        try:
            # Simulate validation check logic
            # In real implementation, this would call appropriate validators
            
            check_mapping = {
                "input_validation": self._validate_input,
                "context_validation": self._validate_context,
                "requirements_completeness": self._validate_requirements,
                "feasibility_check": self._validate_feasibility,
                "design_consistency": self._validate_design,
                "architecture_validation": self._validate_architecture,
                "implementation_correctness": self._validate_implementation,
                "coding_standards": self._validate_coding_standards,
                "integration_compatibility": self._validate_integration,
                "interface_validation": self._validate_interfaces,
                "test_coverage": self._validate_test_coverage,
                "test_effectiveness": self._validate_test_effectiveness,
                "deployment_readiness": self._validate_deployment_readiness,
                "configuration_validation": self._validate_configuration,
                "deployment_success": self._validate_deployment_success,
                "environment_validation": self._validate_environment,
                "operational_validation": self._validate_operations,
                "monitoring_setup": self._validate_monitoring,
                "final_verification": self._validate_final,
                "documentation_completeness": self._validate_documentation
            }
            
            validator_func = check_mapping.get(check_name, self._default_validator)
            return validator_func(context)
            
        except Exception as e:
            return {
                "check": check_name,
                "passed": False,
                "error": str(e)
            }
    
    def _validate_input(self, context: ValidationContext) -> Dict[str, Any]:
        """Validate input requirements"""
        return {
            "check": "input_validation",
            "passed": bool(context.content.strip()),
            "details": "Content validation"
        }
    
    def _validate_context(self, context: ValidationContext) -> Dict[str, Any]:
        """Validate context requirements"""
        return {
            "check": "context_validation", 
            "passed": bool(context.metadata),
            "details": "Context metadata validation"
        }
    
    def _default_validator(self, context: ValidationContext) -> Dict[str, Any]:
        """Default validation check"""
        return {
            "check": "default",
            "passed": True,
            "details": "Default validation passed"
        }
    
    # Placeholder validators for other checks
    def _validate_requirements(self, context): return {"check": "requirements", "passed": True}
    def _validate_feasibility(self, context): return {"check": "feasibility", "passed": True}
    def _validate_design(self, context): return {"check": "design", "passed": True}
    def _validate_architecture(self, context): return {"check": "architecture", "passed": True}
    def _validate_implementation(self, context): return {"check": "implementation", "passed": True}
    def _validate_coding_standards(self, context): return {"check": "coding_standards", "passed": True}
    def _validate_integration(self, context): return {"check": "integration", "passed": True}
    def _validate_interfaces(self, context): return {"check": "interfaces", "passed": True}
    def _validate_test_coverage(self, context): return {"check": "test_coverage", "passed": True}
    def _validate_test_effectiveness(self, context): return {"check": "test_effectiveness", "passed": True}
    def _validate_deployment_readiness(self, context): return {"check": "deployment_readiness", "passed": True}
    def _validate_configuration(self, context): return {"check": "configuration", "passed": True}
    def _validate_deployment_success(self, context): return {"check": "deployment_success", "passed": True}
    def _validate_environment(self, context): return {"check": "environment", "passed": True}
    def _validate_operations(self, context): return {"check": "operations", "passed": True}
    def _validate_monitoring(self, context): return {"check": "monitoring", "passed": True}
    def _validate_final(self, context): return {"check": "final", "passed": True}
    def _validate_documentation(self, context): return {"check": "documentation", "passed": True}
    
    def _combine_validation_results(self, standard_result: Dict[str, Any], 
                                   quality_result: Dict[str, Any], 
                                   context: ValidationContext) -> Dict[str, Any]:
        """Combine standard and quality validation results"""
        try:
            # Determine overall success
            standard_success = standard_result.get("success", False)
            quality_gate_result = quality_result.get("quality_gate_result", QualityGateResult.FAIL.value)
            
            # Quality gate must pass for overall success
            quality_passed = quality_gate_result in [
                QualityGateResult.PASS.value, 
                QualityGateResult.PASS_WITH_WARNINGS.value,
                QualityGateResult.SKIP.value
            ]
            
            overall_success = standard_success and quality_passed
            
            # Create combined result
            combined = {
                "success": overall_success,
                "step": context.current_step.value,
                "standard_validation": standard_result,
                "quality_gate": quality_result,
                "overall_quality_score": quality_result.get("overall_score", 0.0),
                "quality_gate_passed": quality_passed,
                "recommendations": quality_result.get("recommendations", [])
            }
            
            # Add warnings if quality gate passed with issues
            if quality_gate_result == QualityGateResult.PASS_WITH_WARNINGS.value:
                combined["warnings"] = quality_result.get("issues", [])
            
            return combined
            
        except Exception as e:
            logger.error(f"Failed to combine validation results: {e}")
            return {
                "success": False,
                "error": str(e),
                "step": context.current_step.value
            }
    
    def _update_validation_history(self, context: ValidationContext, result: Dict[str, Any]):
        """Update validation history and trends"""
        try:
            history_entry = {
                "timestamp": time.time(),
                "step": context.current_step.value,
                "success": result.get("success", False),
                "quality_score": result.get("overall_quality_score", 0.0),
                "execution_time": result.get("execution_time", 0.0)
            }
            
            self.validation_history[context.current_step].append(history_entry)
            
            # Maintain history size
            if len(self.validation_history[context.current_step]) > 100:
                self.validation_history[context.current_step] = \
                    self.validation_history[context.current_step][-50:]
            
        except Exception as e:
            logger.error(f"Failed to update validation history: {e}")
    
    def _record_performance_metrics(self, step: ValidationCycleStep, execution_time: float):
        """Record performance metrics for monitoring"""
        try:
            # Record via performance monitor if available
            monitor_performance(
                "record_timing",
                operation=f"validation_{step.value}",
                duration=execution_time
            )
            
        except Exception as e:
            logger.debug(f"Performance monitoring not available: {e}")
    
    def get_quality_trends(self, step: Optional[ValidationCycleStep] = None) -> Dict[str, Any]:
        """
        Get quality trends analysis
        Performance target: <100ms execution
        """
        with self.performance_timer('quality_trends_analysis'):
            try:
                if step:
                    trends = {step.value: self.quality_trends.get(step, [])}
                else:
                    trends = dict(self.quality_trends)
                
                # Calculate trend statistics
                trend_stats = {}
                for step_name, trend_data in trends.items():
                    if trend_data:
                        scores = [entry["overall_score"] for entry in trend_data]
                        trend_stats[step_name] = {
                            "latest_score": scores[-1] if scores else 0.0,
                            "average_score": sum(scores) / len(scores),
                            "trend_direction": self._calculate_trend_direction(scores),
                            "data_points": len(scores)
                        }
                
                return {
                    "trend_statistics": trend_stats,
                    "raw_trends": trends
                }
                
            except Exception as e:
                logger.error(f"Quality trends analysis failed: {e}")
                return {"error": str(e)}
    
    def _calculate_trend_direction(self, scores: List[float]) -> str:
        """Calculate trend direction from score history"""
        if len(scores) < 2:
            return "insufficient_data"
        
        recent_scores = scores[-5:] if len(scores) >= 5 else scores
        if len(recent_scores) < 2:
            return "stable"
        
        # Simple linear trend
        trend = (recent_scores[-1] - recent_scores[0]) / len(recent_scores)
        
        if trend > 0.02:
            return "improving"
        elif trend < -0.02:
            return "declining"
        else:
            return "stable"
    
    def get_comprehensive_status(self) -> Dict[str, Any]:
        """
        Get comprehensive coordinator status
        Performance target: <100ms execution
        """
        with self.performance_timer('comprehensive_status'):
            try:
                # Performance summary
                performance_summary = {}
                for operation, times in self.performance_metrics.items():
                    if times:
                        performance_summary[operation] = {
                            'avg_time': sum(times) / len(times),
                            'max_time': max(times),
                            'count': len(times),
                            'target_met': all(t <= self.max_execution_time for t in times[-5:])
                        }
                
                # Validation statistics
                validation_stats = {}
                for step, history in self.validation_history.items():
                    if history:
                        successes = sum(1 for entry in history if entry.get("success", False))
                        validation_stats[step.value] = {
                            "total_validations": len(history),
                            "success_rate": successes / len(history),
                            "average_execution_time": sum(entry.get("execution_time", 0) for entry in history) / len(history)
                        }
                
                return {
                    "quality_gates_enabled": sum(1 for config in self.quality_gates_config.values() if config["enabled"]),
                    "total_validations": sum(len(history) for history in self.validation_history.values()),
                    "performance_summary": performance_summary,
                    "validation_statistics": validation_stats,
                    "quality_trends_available": len(self.quality_trends) > 0
                }
                
            except Exception as e:
                logger.error(f"Comprehensive status generation failed: {e}")
                return {"error": str(e)}


# Global instance
_quality_gates_coordinator = None


def get_quality_gates_coordinator() -> QualityGatesCoordinator:
    """Get global quality gates coordinator instance"""
    global _quality_gates_coordinator
    if _quality_gates_coordinator is None:
        _quality_gates_coordinator = QualityGatesCoordinator()
    return _quality_gates_coordinator


def coordinate_quality_gates(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main quality gates coordination interface
    
    Args:
        action: Action to perform (execute_step, get_trends, get_status)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        coordinator = get_quality_gates_coordinator()
        
        result = {}
        
        if action == "execute_step":
            # Create validation context
            context = ValidationContext(
                current_step=ValidationCycleStep(kwargs.get("step", "step_1")),
                content=kwargs.get("content", ""),
                metadata=kwargs.get("metadata", {}),
                previous_results=kwargs.get("previous_results", []),
                quality_requirements=kwargs.get("quality_requirements", {})
            )
            
            result = coordinator.execute_validation_step(context)
            
        elif action == "get_trends":
            step = kwargs.get("step")
            if step:
                step = ValidationCycleStep(step)
            result = coordinator.get_quality_trends(step)
            
        elif action == "get_status":
            result = coordinator.get_comprehensive_status()
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': coordinator.performance_metrics,
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Quality gates coordination action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }


if __name__ == "__main__":
    # Test the quality gates coordinator
    coordinator = QualityGatesCoordinator()
    
    # Test validation step execution
    test_context = ValidationContext(
        current_step=ValidationCycleStep.STEP_2_5,
        content='''
def test_function(param: str) -> str:
    """Test function with proper documentation."""
    try:
        result = param.upper()
        return result
    except Exception as e:
        logger.error(f"Error: {e}")
        return ""
        ''',
        metadata={"tool": {"name": "Edit"}},
        previous_results=[],
        quality_requirements={"minimum_score": 0.7}
    )
    
    result = coordinator.execute_validation_step(test_context)
    print(f"Validation step result: {json.dumps(result, indent=2)}")
    
    # Test interface function
    interface_result = coordinate_quality_gates(
        "execute_step",
        step="step_7_5",
        content="def simple_function(): pass",
        metadata={}
    )
    
    print(f"Interface result success: {interface_result['success']}")
    
    # Test status
    status_result = coordinate_quality_gates("get_status")
    print(f"Status: {status_result['result']}")