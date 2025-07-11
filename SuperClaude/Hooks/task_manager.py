#!/usr/bin/env python3
"""
Task Manager Hook - Focused Task Management System
Focused task orchestration and intelligent routing
Responsibility: "Manage task lifecycle and routing"
"""

import json
import sys
import time
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
from enum import Enum
from dataclasses import dataclass, asdict
from datetime import datetime
from contextlib import contextmanager
from collections import defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskState(Enum):
    """Enhanced task states for comprehensive task management"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    SUSPENDED = "suspended"
    DELEGATED = "delegated"
    VALIDATING = "validating"
    FAILED = "failed"
    ARCHIVED = "archived"

@dataclass
class TaskMetadata:
    """Task execution metadata"""
    created_at: str
    updated_at: str
    complexity_score: Optional[float] = None
    mcp_servers: List[str] = None
    
    def __post_init__(self):
        if self.mcp_servers is None:
            self.mcp_servers = []

class TaskManager:
    """
    Focused task management system
    Responsibility: "Manage task lifecycle and routing"
    """
    
    def __init__(self, base_path: str = "/home/anton/SuperClaude"):
        self.base_path = Path(base_path)
        self.claude_dir = self.base_path / ".claude"
        
        # Ensure directory exists
        self.claude_dir.mkdir(exist_ok=True)
        
        # Performance targets
        self.max_execution_time = 0.030  # 30ms target
        
        # Performance tracking
        self.start_time = time.time()
        self.performance_metrics = defaultdict(list)
        
        # Task routing cache
        self.routing_cache = {}
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
                logger.warning(f"Task manager operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def analyze_task_complexity(self, content: str, context: Dict[str, Any]) -> float:
        """
        Analyze task complexity score (0.0-1.0)
        Performance target: <30ms execution
        """
        with self.performance_timer('complexity_analysis'):
            try:
                complexity_score = 0.0
                
                # Keyword-based complexity analysis
                complex_keywords = ["implement", "refactor", "optimize", "migrate", "design", "architecture"]
                simple_keywords = ["fix", "update", "add", "remove", "change", "read"]
                
                content_lower = content.lower()
                
                for keyword in complex_keywords:
                    if keyword in content_lower:
                        complexity_score += 0.2
                
                for keyword in simple_keywords:
                    if keyword in content_lower:
                        complexity_score += 0.1
                
                # Context-based complexity
                tool_name = context.get("tool", {}).get("name", "")
                if tool_name == "Task":
                    complexity_score += 0.3
                elif tool_name in ["MultiEdit", "Write"]:
                    complexity_score += 0.2
                elif tool_name in ["Edit", "Read"]:
                    complexity_score += 0.1
                
                return min(complexity_score, 1.0)
                
            except Exception as e:
                logger.error(f"Complexity analysis failed: {e}")
                return 0.5
    
    def get_mcp_server_routing(self, context: Dict[str, Any]) -> List[str]:
        """
        Enhanced MCP server routing using orchestration engine intelligence
        Performance target: <30ms execution
        """
        with self.performance_timer('mcp_routing'):
            try:
                # Try orchestration engine first for intelligent tool selection
                try:
                    from .orchestration_engine import orchestrate_intelligence
                except ImportError:
                    from orchestration_engine import orchestrate_intelligence
                
                # Prepare hook data for orchestration engine
                hook_data = {
                    'tool_call': context.get('tool', {}),
                    'context': context
                }
                
                orchestration_result = orchestrate_intelligence("analyze", hook_data=hook_data)
                
                if orchestration_result['success']:
                    analysis = orchestration_result['result']['analysis']
                    
                    # Convert orchestration engine tool recommendations to MCP servers
                    tool_to_mcp_mapping = {
                        'Context7': 'context7',
                        'Sequential': 'sequential', 
                        'Magic': 'magic',
                        'Playwright': 'playwright'
                    }
                    
                    # Get full orchestration decision for tool selection
                    decision_result = orchestrate_intelligence("decide", 
                        hook_data=hook_data, 
                        analysis=analysis,
                        validation={'risk_score': 0.0, 'safe_mode_required': False}  # Minimal validation for routing
                    )
                    
                    if decision_result['success']:
                        selected_tools = decision_result['result']['decision']['selected_tools']
                        recommended_servers = []
                        
                        for tool in selected_tools:
                            if tool in tool_to_mcp_mapping:
                                mcp_server = tool_to_mcp_mapping[tool]
                                if mcp_server not in recommended_servers:
                                    recommended_servers.append(mcp_server)
                        
                        logger.info(f"Orchestration engine recommended MCP servers: {recommended_servers}")
                        return recommended_servers if recommended_servers else ["sequential"]
                
                # Fallback to traditional routing
                return self._fallback_mcp_routing(context)
                
            except Exception as e:
                logger.warning(f"Orchestration engine MCP routing failed: {e}, using fallback")
                return self._fallback_mcp_routing(context)
    
    def _fallback_mcp_routing(self, context: Dict[str, Any]) -> List[str]:
        """Fallback MCP routing (original implementation)"""
        # Check cache first
        context_key = str(hash(str(context)))
        if context_key in self.routing_cache:
            cached_item = self.routing_cache[context_key]
            if time.time() - cached_item["timestamp"] < self.cache_ttl:
                return cached_item["servers"]
        
        tool_name = context.get("tool", {}).get("name", "")
        tool_params = context.get("tool", {}).get("parameters", {})
        params_str = str(tool_params).lower()
        
        recommended_servers = []
        
        # Context7 routing - Documentation and framework patterns
        if any(keyword in params_str for keyword in [
            "library", "framework", "documentation", "pattern", "best practice", "docs"
        ]):
            recommended_servers.append("context7")
        
        # Sequential thinking routing - Complex analysis
        if tool_name == "Task" or any(keyword in params_str for keyword in [
            "analyze", "complex", "multi-step", "reasoning", "logic", "think"
        ]):
            recommended_servers.append("sequential")
        
        # Magic routing - UI components
        if any(keyword in params_str for keyword in [
            "ui", "component", "design", "frontend", "react", "vue", "button", "form"
        ]):
            recommended_servers.append("magic")
        
        # Playwright routing - Testing
        if any(keyword in params_str for keyword in [
            "test", "e2e", "browser", "automation", "playwright", "puppeteer"
        ]):
            recommended_servers.append("playwright")
        
        # Cache result
        self.routing_cache[context_key] = {
            "servers": recommended_servers,
            "timestamp": time.time()
        }
        
        return recommended_servers if recommended_servers else ["sequential"]
    
    def get_task_recommendations(self, context: Dict[str, Any]) -> List[str]:
        """
        Generate task recommendations based on context
        Performance target: <30ms execution
        """
        with self.performance_timer('task_recommendations'):
            try:
                recommendations = []
                
                tool_name = context.get("tool", {}).get("name", "")
                tool_params = context.get("tool", {}).get("parameters", {})
                params_str = str(tool_params).lower()
                
                # Multi-step operation detection
                if tool_name == "Task":
                    recommendations.append("Complex task detected - consider wave mode for systematic execution")
                
                # Code analysis patterns
                if tool_name in ["Read", "Grep", "Glob"]:
                    recommendations.append("Code analysis in progress - create validation task for findings")
                
                # Build/deployment patterns
                if tool_name == "Bash" and any(cmd in params_str for cmd in ["npm", "build", "deploy", "test"]):
                    recommendations.append("Build operation detected - create testing and validation tasks")
                
                # File modification patterns
                if tool_name in ["Edit", "MultiEdit", "Write"]:
                    recommendations.append("File modification detected - consider validation and testing")
                
                # MCP server routing recommendations
                mcp_routing = self.get_mcp_server_routing(context)
                if mcp_routing:
                    recommendations.append(f"Recommended MCP servers: {', '.join(mcp_routing)}")
                
                # Complexity-based recommendations
                if "content" in tool_params:
                    complexity = self.analyze_task_complexity(str(tool_params["content"]), context)
                    if complexity > 0.7:
                        recommendations.append("High complexity task - consider breaking into smaller tasks")
                
                return recommendations
                
            except Exception as e:
                logger.error(f"Task recommendations failed: {e}")
                return []
    
    def process_hook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process hook event and provide task management insights
        Performance target: <30ms execution
        """
        with self.performance_timer('hook_event_processing'):
            try:
                context = event_data.get("context", {})
                
                recommendations = self.get_task_recommendations(context)
                mcp_routing = self.get_mcp_server_routing(context)
                
                # Calculate complexity if content available
                complexity = None
                tool_params = context.get("tool", {}).get("parameters", {})
                if "content" in tool_params:
                    complexity = self.analyze_task_complexity(str(tool_params["content"]), context)
                
                response = {
                    "taskManager": {
                        "status": "active",
                        "recommendations": recommendations,
                        "mcp_routing": mcp_routing,
                        "complexity_score": complexity,
                        "processing_time": time.time() - self.start_time,
                        "version": "3.0",
                        "performance_metrics": self._get_performance_summary()
                    }
                }
                
                return response
                
            except Exception as e:
                logger.error(f"Error processing hook event: {e}")
                return {
                    "taskManager": {
                        "status": "error",
                        "error": str(e),
                        "recommendations": []
                    }
                }
    
    def _get_performance_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        summary = {}
        
        for operation, times in self.performance_metrics.items():
            if times:
                summary[operation] = {
                    'avg_time': sum(times) / len(times),
                    'max_time': max(times),
                    'min_time': min(times),
                    'count': len(times),
                    'target_met': all(t <= self.max_execution_time for t in times[-5:])
                }
        
        return summary
    
    def get_comprehensive_status(self) -> Dict[str, Any]:
        """
        Get comprehensive task manager status
        Performance target: <30ms execution
        """
        with self.performance_timer('status_report'):
            try:
                return {
                    "cache_entries": len(self.routing_cache),
                    "performance_summary": self._get_performance_summary(),
                    "uptime": time.time() - self.start_time,
                    "performance_targets": {
                        "max_execution_time": self.max_execution_time,
                        "cache_ttl": self.cache_ttl
                    }
                }
            except Exception as e:
                logger.error(f"Status report generation failed: {e}")
                return {"error": str(e)}


# Global instance
_task_manager = None


def get_task_manager() -> TaskManager:
    """Get global task manager instance"""
    global _task_manager
    if _task_manager is None:
        _task_manager = TaskManager()
    return _task_manager


def manage_task_lifecycle(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main task management interface
    
    Args:
        action: Action to perform (analyze_complexity, get_routing, get_recommendations, get_status)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        manager = get_task_manager()
        
        result = {}
        
        if action == "analyze_complexity":
            complexity = manager.analyze_task_complexity(
                kwargs.get("content", ""),
                kwargs.get("context", {})
            )
            result = {"complexity_score": complexity}
            
        elif action == "get_routing":
            routing = manager.get_mcp_server_routing(kwargs.get("context", {}))
            result = {"mcp_servers": routing}
            
        elif action == "get_recommendations":
            recommendations = manager.get_task_recommendations(kwargs.get("context", {}))
            result = {"recommendations": recommendations}
            
        elif action == "process_event":
            result = manager.process_hook_event(kwargs.get("event_data", {}))
            
        elif action == "get_status":
            result = manager.get_comprehensive_status()
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': manager._get_performance_summary(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Task management action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }


def run_test():
    """Test function for development and debugging"""
    print("Testing Task Manager Hook...")
    
    task_manager = TaskManager()
    
    # Test with sample data
    test_data = {
        "context": {
            "tool": {
                "name": "Task",
                "parameters": {
                    "content": "Implement complex user authentication system with React UI and testing"
                }
            }
        }
    }
    
    result = task_manager.process_hook_event(test_data)
    print(f"Hook event result: {json.dumps(result, indent=2)}")
    
    # Test interface functions
    complexity_result = manage_task_lifecycle("analyze_complexity", 
        content="Implement complex authentication system", 
        context={"tool": {"name": "Task"}}
    )
    print(f"Complexity analysis: {complexity_result}")
    
    routing_result = manage_task_lifecycle("get_routing", 
        context={
            "tool": {
                "name": "Task",
                "parameters": {"content": "Create React component with documentation"}
            }
        }
    )
    print(f"MCP routing: {routing_result}")
    
    # Test performance metrics
    status_result = manage_task_lifecycle("get_status")
    print(f"Status result: {status_result['success']}")
    print(f"Performance metrics: {status_result.get('metrics', {})}")


if __name__ == "__main__":
    # Check for test mode
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        run_test()
        sys.exit(0)
    
    try:
        # Read JSON data from stdin
        stdin_content = sys.stdin.read().strip()
        if not stdin_content:
            sys.exit(0)
        
        try:
            hook_data = json.loads(stdin_content)
        except json.JSONDecodeError as e:
            print(f"• Task Manager JSON Error: {str(e)}", file=sys.stderr)
            sys.exit(0)
        
        # Process the event using interface
        result = manage_task_lifecycle("process_event", event_data=hook_data)
        
        # Output response for hook system
        if result['success']:
            print(json.dumps(result['result']), file=sys.stderr)
        else:
            print(f"• Task Manager Error: {result['errors']}", file=sys.stderr)
        
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Task manager hook error: {e}")
        print(f"• Task Manager Critical Error: {str(e)}", file=sys.stderr)
        sys.exit(0)