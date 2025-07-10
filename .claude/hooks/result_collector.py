#!/usr/bin/env python3
"""
Result Collector - Agent Result Collection and Processing
Handles result gathering, validation, and storage from completed agents
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
import hashlib
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResultStatus(Enum):
    """Result processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    VALIDATED = "validated"
    STORED = "stored"
    FAILED = "failed"

@dataclass
class ResultMetadata:
    """Result metadata structure"""
    result_id: str
    agent_id: str
    agent_type: str
    wave_number: int
    collection_time: float
    status: ResultStatus
    validation_score: Optional[float] = None
    storage_location: Optional[str] = None
    error_message: Optional[str] = None

class ResultCollector:
    """
    Focused result collection system
    Responsibility: "Collect agent results"
    """
    
    def __init__(self, context_manager=None):
        self.context_manager = context_manager
        
        # Result tracking
        self.collected_results = {}
        self.result_metadata = {}
        self.wave_results = defaultdict(list)
        
        # Performance targets
        self.max_execution_time = 0.025  # 25ms target (critical path)
        
        # Performance metrics
        self.performance_metrics = defaultdict(list)
        
        # Validation settings
        self.min_result_size = 10  # Minimum result size in characters
        self.max_result_size = 100000  # Maximum result size in characters
        
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
                logger.warning(f"Result collector operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def extract_wave_info_from_result(self, result_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract wave information from result data
        Performance target: <25ms execution
        """
        with self.performance_timer('wave_info_extraction'):
            try:
                wave_info = {}
                
                # Direct wave information
                if "wave_number" in result_data:
                    wave_info["wave_number"] = result_data["wave_number"]
                if "agent_type" in result_data:
                    wave_info["agent_type"] = result_data["agent_type"]
                if "agent_id" in result_data:
                    wave_info["agent_id"] = result_data["agent_id"]
                
                # Extract from task data
                task_data = result_data.get("task", {})
                if isinstance(task_data, dict):
                    if "wave_number" in task_data:
                        wave_info["wave_number"] = task_data["wave_number"]
                    if "agent_type" in task_data:
                        wave_info["agent_type"] = task_data["agent_type"]
                
                # Extract from result content using pattern matching
                result_content = str(result_data.get("result", ""))
                
                # Pattern matching for wave information
                wave_patterns = {
                    r'wave[_\s]*(\d+)': 'wave_number',
                    r'agent[_\s]*type[_\s]*[:=]\s*(\w+)': 'agent_type',
                    r'specialist|analyzer|investigator|reviewer|planner': 'agent_type'
                }
                
                for pattern, info_type in wave_patterns.items():
                    matches = re.findall(pattern, result_content, re.IGNORECASE)
                    if matches:
                        if info_type == 'wave_number':
                            try:
                                wave_info[info_type] = int(matches[0])
                            except (ValueError, IndexError):
                                pass
                        elif info_type == 'agent_type':
                            if isinstance(matches[0], str):
                                wave_info[info_type] = matches[0].lower()
                
                # Validate extracted information
                if "wave_number" in wave_info and "agent_type" in wave_info:
                    return wave_info
                
                # Return partial info if available
                if wave_info:
                    return wave_info
                
                return None
                
            except Exception as e:
                logger.error(f"Wave info extraction failed: {e}")
                return None
    
    def validate_result_data(self, result_data: Dict[str, Any]) -> Tuple[bool, float, List[str]]:
        """
        Validate result data quality and completeness
        Performance target: <25ms execution
        
        Returns:
            (is_valid, validation_score, error_messages)
        """
        with self.performance_timer('result_validation'):
            try:
                errors = []
                validation_score = 1.0
                
                # Check basic structure
                if not isinstance(result_data, dict):
                    errors.append("Result data is not a dictionary")
                    return False, 0.0, errors
                
                # Check for required fields
                required_fields = ["result", "agent_id"]
                for field in required_fields:
                    if field not in result_data:
                        errors.append(f"Missing required field: {field}")
                        validation_score -= 0.3
                
                # Validate result content
                result_content = result_data.get("result")
                if result_content is not None:
                    content_str = str(result_content)
                    content_size = len(content_str)
                    
                    if content_size < self.min_result_size:
                        errors.append(f"Result content too small: {content_size} chars (min: {self.min_result_size})")
                        validation_score -= 0.2
                    elif content_size > self.max_result_size:
                        errors.append(f"Result content too large: {content_size} chars (max: {self.max_result_size})")
                        validation_score -= 0.1
                    
                    # Check for meaningful content
                    if content_str.strip() == "":
                        errors.append("Result content is empty")
                        validation_score -= 0.5
                
                # Validate agent information
                agent_id = result_data.get("agent_id")
                if agent_id and not isinstance(agent_id, str):
                    errors.append("Invalid agent_id format")
                    validation_score -= 0.2
                
                # Validate wave information if present
                wave_info = self.extract_wave_info_from_result(result_data)
                if wave_info:
                    wave_number = wave_info.get("wave_number")
                    if wave_number is not None:
                        if not isinstance(wave_number, int) or wave_number < 1 or wave_number > 5:
                            errors.append(f"Invalid wave_number: {wave_number}")
                            validation_score -= 0.2
                
                # Ensure validation score is not negative
                validation_score = max(0.0, validation_score)
                
                # Consider result valid if score >= 0.7 and no critical errors
                is_valid = validation_score >= 0.7 and not any("Missing required field" in error for error in errors)
                
                return is_valid, validation_score, errors
                
            except Exception as e:
                logger.error(f"Result validation failed: {e}")
                return False, 0.0, [f"Validation error: {str(e)}"]
    
    def collect_agent_result(self, agent_id: str, result_data: Dict[str, Any]) -> str:
        """
        Collect result from completed agent
        Performance target: <25ms execution
        
        Returns:
            result_id: Unique identifier for the collected result
        """
        with self.performance_timer('result_collection'):
            try:
                # Generate unique result ID
                result_id = f"result_{agent_id}_{int(time.time() * 1000)}"
                
                # Extract wave information
                wave_info = self.extract_wave_info_from_result(result_data)
                
                # Validate result data
                is_valid, validation_score, errors = self.validate_result_data(result_data)
                
                # Create result metadata
                metadata = ResultMetadata(
                    result_id=result_id,
                    agent_id=agent_id,
                    agent_type=wave_info.get("agent_type", "unknown") if wave_info else "unknown",
                    wave_number=wave_info.get("wave_number", 1) if wave_info else 1,
                    collection_time=time.time(),
                    status=ResultStatus.VALIDATED if is_valid else ResultStatus.FAILED,
                    validation_score=validation_score,
                    error_message="; ".join(errors) if errors else None
                )
                
                # Store result and metadata
                self.collected_results[result_id] = result_data
                self.result_metadata[result_id] = metadata
                
                # Add to wave results
                wave_number = metadata.wave_number
                self.wave_results[wave_number].append(result_id)
                
                if is_valid:
                    logger.info(f"Collected valid result {result_id} from agent {agent_id} for wave {wave_number}")
                else:
                    logger.warning(f"Collected invalid result {result_id} from agent {agent_id}: {errors}")
                
                return result_id
                
            except Exception as e:
                logger.error(f"Result collection failed for agent {agent_id}: {e}")
                raise
    
    def get_wave_results(self, wave_number: int, include_invalid: bool = False) -> List[Dict[str, Any]]:
        """
        Get all results for specific wave
        Performance target: <25ms execution
        """
        with self.performance_timer('wave_results_retrieval'):
            try:
                wave_results = []
                result_ids = self.wave_results.get(wave_number, [])
                
                for result_id in result_ids:
                    metadata = self.result_metadata.get(result_id)
                    result_data = self.collected_results.get(result_id)
                    
                    if metadata and result_data:
                        # Skip invalid results unless explicitly requested
                        if not include_invalid and metadata.status == ResultStatus.FAILED:
                            continue
                        
                        wave_results.append({
                            "result_id": result_id,
                            "agent_id": metadata.agent_id,
                            "agent_type": metadata.agent_type,
                            "collection_time": metadata.collection_time,
                            "validation_score": metadata.validation_score,
                            "status": metadata.status.value,
                            "result_data": result_data,
                            "errors": metadata.error_message
                        })
                
                return wave_results
                
            except Exception as e:
                logger.error(f"Wave results retrieval failed for wave {wave_number}: {e}")
                return []
    
    def get_result_summary(self, wave_number: int) -> Dict[str, Any]:
        """
        Get summary statistics for wave results
        Performance target: <25ms execution
        """
        with self.performance_timer('result_summary'):
            try:
                results = self.get_wave_results(wave_number, include_invalid=True)
                
                total_results = len(results)
                valid_results = len([r for r in results if r["status"] == "validated"])
                failed_results = len([r for r in results if r["status"] == "failed"])
                
                avg_validation_score = 0.0
                if results:
                    scores = [r["validation_score"] for r in results if r["validation_score"] is not None]
                    if scores:
                        avg_validation_score = sum(scores) / len(scores)
                
                agent_types = set(r["agent_type"] for r in results)
                
                return {
                    "wave_number": wave_number,
                    "total_results": total_results,
                    "valid_results": valid_results,
                    "failed_results": failed_results,
                    "success_rate": valid_results / total_results if total_results > 0 else 0.0,
                    "avg_validation_score": avg_validation_score,
                    "agent_types": list(agent_types),
                    "collection_time_range": {
                        "earliest": min(r["collection_time"] for r in results) if results else None,
                        "latest": max(r["collection_time"] for r in results) if results else None
                    }
                }
                
            except Exception as e:
                logger.error(f"Result summary generation failed for wave {wave_number}: {e}")
                return {"wave_number": wave_number, "error": str(e)}
    
    def cleanup_old_results(self, max_age_hours: float = 24) -> int:
        """
        Clean up old results to manage memory usage
        Performance target: <25ms execution
        """
        with self.performance_timer('result_cleanup'):
            try:
                current_time = time.time()
                max_age_seconds = max_age_hours * 3600
                cleaned_count = 0
                
                results_to_remove = []
                
                for result_id, metadata in self.result_metadata.items():
                    if (current_time - metadata.collection_time) > max_age_seconds:
                        results_to_remove.append(result_id)
                
                for result_id in results_to_remove:
                    # Remove from collected results
                    if result_id in self.collected_results:
                        del self.collected_results[result_id]
                    
                    # Remove metadata
                    metadata = self.result_metadata.get(result_id)
                    if metadata:
                        # Remove from wave results
                        wave_number = metadata.wave_number
                        if result_id in self.wave_results[wave_number]:
                            self.wave_results[wave_number].remove(result_id)
                        
                        del self.result_metadata[result_id]
                        cleaned_count += 1
                
                if cleaned_count > 0:
                    logger.info(f"Cleaned up {cleaned_count} old results")
                
                return cleaned_count
                
            except Exception as e:
                logger.error(f"Result cleanup failed: {e}")
                return 0
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get result collector performance metrics"""
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
        
        return {
            "performance_metrics": metrics,
            "collection_stats": {
                "total_results": len(self.collected_results),
                "total_waves": len(self.wave_results),
                "metadata_entries": len(self.result_metadata)
            },
            "performance_targets": {
                "max_execution_time": self.max_execution_time,
                "min_result_size": self.min_result_size,
                "max_result_size": self.max_result_size
            }
        }

# Global instance
_result_collector = None

def get_result_collector(context_manager=None):
    """Get global result collector instance"""
    global _result_collector
    if _result_collector is None:
        _result_collector = ResultCollector(context_manager)
    return _result_collector

def collect_agent_results(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main result collection interface
    
    Args:
        action: Action to perform (collect, get_results, get_summary, cleanup)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        collector = get_result_collector()
        
        result = {}
        
        if action == "collect":
            result_id = collector.collect_agent_result(
                kwargs.get("agent_id", ""),
                kwargs.get("result_data", {})
            )
            result = {"result_id": result_id}
            
        elif action == "get_results":
            wave_number = kwargs.get("wave_number", 1)
            include_invalid = kwargs.get("include_invalid", False)
            results = collector.get_wave_results(wave_number, include_invalid)
            result = {"results": results}
            
        elif action == "get_summary":
            wave_number = kwargs.get("wave_number", 1)
            summary = collector.get_result_summary(wave_number)
            result = summary
            
        elif action == "cleanup":
            cleaned = collector.cleanup_old_results(
                kwargs.get("max_age_hours", 24)
            )
            result = {"cleaned_count": cleaned}
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': collector.get_performance_metrics(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Result collection action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }

# Hook integration functions
def handle_post_tool_use(tool_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle post-tool-use result collection"""
    try:
        collector = get_result_collector()
        
        # Extract tool information
        tool_result = tool_data.get("result", {})
        tool_name = tool_data.get("tool", {}).get("name", "")
        
        # Check if this is a wave operation result
        wave_info = collector.extract_wave_info_from_result(tool_result)
        
        if wave_info and "agent_id" in tool_result:
            # Collect the result
            result_id = collector.collect_agent_result(
                tool_result["agent_id"],
                tool_result
            )
            
            return {
                "success": True,
                "result_collected": True,
                "result_id": result_id,
                "wave_number": wave_info.get("wave_number"),
                "agent_type": wave_info.get("agent_type")
            }
        
        return {"success": True, "result_collected": False}
        
    except Exception as e:
        logger.error(f"Post-tool-use result collection failed: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # Test the result collector
    collector = ResultCollector()
    
    # Test result collection
    test_result_data = {
        "agent_id": "test_agent_1",
        "wave_number": 1,
        "agent_type": "specialist",
        "result": "This is a test result with meaningful content for wave 1 specialist analysis.",
        "completion_time": time.time()
    }
    
    result_id = collector.collect_agent_result("test_agent_1", test_result_data)
    print(f"Collected result: {result_id}")
    
    # Test result validation
    is_valid, score, errors = collector.validate_result_data(test_result_data)
    print(f"Validation: valid={is_valid}, score={score:.2f}, errors={errors}")
    
    # Test wave results retrieval
    wave_results = collector.get_wave_results(1)
    print(f"Wave 1 results: {len(wave_results)}")
    
    # Test result summary
    summary = collector.get_result_summary(1)
    print(f"Wave 1 summary: {summary}")
    
    # Test cleanup
    cleaned = collector.cleanup_old_results(0)  # Clean all
    print(f"Cleaned results: {cleaned}")
    
    # Performance metrics
    metrics = collector.get_performance_metrics()
    print(f"Performance metrics: {metrics}")