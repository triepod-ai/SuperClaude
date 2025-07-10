#!/usr/bin/env python3
"""
Agent Manager - Agent Lifecycle Management
Handles agent spawning, monitoring, and resource management
"""

import json
import time
import threading
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentStatus(Enum):
    """Agent status states"""
    INITIALIZING = "initializing"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CLEANUP = "cleanup"

@dataclass
class AgentMetadata:
    """Agent execution metadata"""
    agent_id: str
    agent_type: str
    wave_number: int
    task_name: str
    start_time: float
    status: AgentStatus
    completion_time: Optional[float] = None
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class AgentManager:
    """
    Focused agent management system
    Responsibility: "Manage agent lifecycle"
    """
    
    def __init__(self, context_manager=None, performance_monitor=None):
        self.context_manager = context_manager
        self.performance_monitor = performance_monitor
        
        # Agent tracking
        self.active_agents = {}
        self.agent_history = defaultdict(list)
        self.lock = threading.Lock()
        
        # Resource management
        self.max_concurrent_agents = 10
        self.thread_pool = ThreadPoolExecutor(max_workers=self.max_concurrent_agents)
        
        # Performance targets
        self.max_execution_time = 0.050  # 50ms target
        self.agent_timeout = 300  # 5 minutes per agent
        
        # Performance metrics
        self.performance_metrics = defaultdict(list)
        
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
                logger.warning(f"Agent manager operation '{operation}' took {duration:.3f}s (target: {self.max_execution_time}s)")
    
    def spawn_agent(self, agent_type: str, wave_number: int, task_data: Dict[str, Any]) -> str:
        """
        Spawn a new agent for wave execution with orchestration intelligence
        Performance target: <50ms execution
        """
        with self.performance_timer('agent_spawn'):
            try:
                # Get intelligent delegation recommendations if available
                delegation_strategy = self._get_intelligent_delegation_strategy(task_data)
                
                agent_id = f"wave_{wave_number}_{agent_type}_{int(time.time())}"
                
                # Enhance task data with delegation insights
                enhanced_task_data = task_data.copy()
                enhanced_task_data['delegation_strategy'] = delegation_strategy
                enhanced_task_data['orchestration_context'] = self._get_orchestration_context(task_data)
                
                agent_metadata = AgentMetadata(
                    agent_id=agent_id,
                    agent_type=agent_type,
                    wave_number=wave_number,
                    task_name=task_data.get('task_name', ''),
                    start_time=time.time(),
                    status=AgentStatus.INITIALIZING
                )
                
                with self.lock:
                    self.active_agents[agent_id] = agent_metadata
                
                # Submit agent task to thread pool with enhanced data
                future = self.thread_pool.submit(self._execute_agent, agent_id, enhanced_task_data)
                
                # Update status to running
                agent_metadata.status = AgentStatus.RUNNING
                
                logger.info(f"Spawned agent {agent_id} for wave {wave_number} with strategy: {delegation_strategy}")
                return agent_id
                
            except Exception as e:
                logger.error(f"Agent spawn failed: {e}")
                raise
    
    def _get_intelligent_delegation_strategy(self, task_data: Dict[str, Any]) -> str:
        """Get intelligent delegation strategy from orchestration engine"""
        try:
            try:
                from .orchestration_engine import orchestrate_intelligence
            except ImportError:
                from orchestration_engine import orchestrate_intelligence
            
            # Prepare hook data for orchestration analysis
            hook_data = {
                'tool_call': {
                    'name': 'Task',
                    'parameters': task_data
                },
                'context': {}
            }
            
            orchestration_result = orchestrate_intelligence("full_orchestration", hook_data=hook_data)
            
            if orchestration_result['success']:
                decision = orchestration_result['result']['decision']
                delegation_strategy = decision.get('delegation_strategy', 'single_agent')
                logger.debug(f"Orchestration engine recommended delegation strategy: {delegation_strategy}")
                return delegation_strategy
                
        except Exception as e:
            logger.warning(f"Failed to get intelligent delegation strategy: {e}")
        
        return 'single_agent'  # Fallback
    
    def _get_orchestration_context(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get orchestration context for agent execution"""
        try:
            try:
                from .orchestration_engine import orchestrate_intelligence
            except ImportError:
                from orchestration_engine import orchestrate_intelligence
            
            hook_data = {
                'tool_call': {
                    'name': 'Task',
                    'parameters': task_data
                },
                'context': {}
            }
            
            analysis_result = orchestrate_intelligence("analyze", hook_data=hook_data)
            
            if analysis_result['success']:
                analysis = analysis_result['result']['analysis']
                return {
                    'complexity': analysis.get('complexity', 0.5),
                    'domains': analysis.get('domains', []),
                    'focus_areas': analysis.get('focus_areas', []),
                    'estimated_tokens': analysis.get('estimated_tokens', 1000),
                    'quality_requirements': analysis.get('quality_requirements', 'standard')
                }
                
        except Exception as e:
            logger.warning(f"Failed to get orchestration context: {e}")
        
        return {}  # Fallback
    
    def _execute_agent(self, agent_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute agent task (runs in thread pool)
        """
        try:
            with self.lock:
                agent = self.active_agents.get(agent_id)
                if not agent:
                    raise ValueError(f"Agent {agent_id} not found")
            
            # Simulate agent execution
            # In real implementation, this would interface with actual agent system
            start_time = time.time()
            
            # Agent execution logic would go here
            # For now, simulate with task processing
            agent_result = {
                "agent_id": agent_id,
                "task_result": task_data,
                "execution_time": time.time() - start_time,
                "status": "completed"
            }
            
            # Update agent status
            with self.lock:
                if agent_id in self.active_agents:
                    agent = self.active_agents[agent_id]
                    agent.status = AgentStatus.COMPLETED
                    agent.completion_time = time.time()
                    agent.results = agent_result
            
            return agent_result
            
        except Exception as e:
            logger.error(f"Agent {agent_id} execution failed: {e}")
            
            with self.lock:
                if agent_id in self.active_agents:
                    agent = self.active_agents[agent_id]
                    agent.status = AgentStatus.FAILED
                    agent.completion_time = time.time()
                    agent.error_message = str(e)
            
            return {"agent_id": agent_id, "status": "failed", "error": str(e)}
    
    def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status of specific agent
        Performance target: <50ms execution
        """
        with self.performance_timer('agent_status_check'):
            with self.lock:
                agent = self.active_agents.get(agent_id)
                if not agent:
                    return None
                
                return {
                    "agent_id": agent.agent_id,
                    "agent_type": agent.agent_type,
                    "wave_number": agent.wave_number,
                    "task_name": agent.task_name,
                    "status": agent.status.value,
                    "start_time": agent.start_time,
                    "completion_time": agent.completion_time,
                    "execution_duration": (
                        (agent.completion_time or time.time()) - agent.start_time
                    ),
                    "results": agent.results,
                    "error_message": agent.error_message
                }
    
    def get_wave_agents(self, wave_number: int) -> List[Dict[str, Any]]:
        """
        Get all agents for specific wave
        Performance target: <50ms execution
        """
        with self.performance_timer('wave_agents_lookup'):
            wave_agents = []
            
            with self.lock:
                for agent in self.active_agents.values():
                    if agent.wave_number == wave_number:
                        wave_agents.append({
                            "agent_id": agent.agent_id,
                            "agent_type": agent.agent_type,
                            "status": agent.status.value,
                            "start_time": agent.start_time,
                            "completion_time": agent.completion_time,
                            "results": agent.results
                        })
            
            return wave_agents
    
    def wait_for_wave_completion(self, wave_number: int, timeout: float = 300) -> Dict[str, Any]:
        """
        Wait for all agents in wave to complete
        Performance target: Variable (depends on agent execution)
        """
        with self.performance_timer('wave_completion_wait'):
            start_time = time.time()
            completed_agents = []
            failed_agents = []
            
            while time.time() - start_time < timeout:
                wave_agents = self.get_wave_agents(wave_number)
                
                if not wave_agents:
                    break
                
                all_complete = True
                for agent in wave_agents:
                    if agent["status"] in ["initializing", "running"]:
                        all_complete = False
                    elif agent["status"] == "completed":
                        if agent["agent_id"] not in [a["agent_id"] for a in completed_agents]:
                            completed_agents.append(agent)
                    elif agent["status"] == "failed":
                        if agent["agent_id"] not in [a["agent_id"] for a in failed_agents]:
                            failed_agents.append(agent)
                
                if all_complete:
                    break
                
                time.sleep(0.1)  # 100ms polling interval
            
            return {
                "wave_number": wave_number,
                "completed": len(completed_agents),
                "failed": len(failed_agents),
                "completed_agents": completed_agents,
                "failed_agents": failed_agents,
                "total_time": time.time() - start_time
            }
    
    def cleanup_completed_agents(self, max_age_hours: float = 24) -> int:
        """
        Clean up completed agents older than max_age_hours
        Performance target: <50ms execution
        """
        with self.performance_timer('agent_cleanup'):
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            cleaned_count = 0
            
            with self.lock:
                agents_to_remove = []
                
                for agent_id, agent in self.active_agents.items():
                    if agent.status in [AgentStatus.COMPLETED, AgentStatus.FAILED]:
                        if agent.completion_time and (current_time - agent.completion_time) > max_age_seconds:
                            # Move to history before removing
                            self.agent_history[agent.wave_number].append({
                                "agent_id": agent.agent_id,
                                "agent_type": agent.agent_type,
                                "status": agent.status.value,
                                "start_time": agent.start_time,
                                "completion_time": agent.completion_time,
                                "execution_duration": agent.completion_time - agent.start_time
                            })
                            agents_to_remove.append(agent_id)
                            cleaned_count += 1
                
                for agent_id in agents_to_remove:
                    del self.active_agents[agent_id]
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} completed agents")
            
            return cleaned_count
    
    def shutdown_all_agents(self) -> Dict[str, Any]:
        """
        Gracefully shutdown all agents
        Performance target: <50ms execution (excluding thread pool shutdown)
        """
        with self.performance_timer('agent_shutdown'):
            try:
                # Cancel running agents
                with self.lock:
                    running_agents = [
                        agent for agent in self.active_agents.values()
                        if agent.status == AgentStatus.RUNNING
                    ]
                
                # Update status to cleanup for all running agents
                for agent in running_agents:
                    agent.status = AgentStatus.CLEANUP
                
                # Shutdown thread pool
                self.thread_pool.shutdown(wait=True)
                
                # Move all agents to history
                cleanup_count = self.cleanup_completed_agents(max_age_hours=0)
                
                shutdown_summary = {
                    "running_agents_interrupted": len(running_agents),
                    "agents_cleaned_up": cleanup_count,
                    "thread_pool_shutdown": True
                }
                
                logger.info(f"Agent manager shutdown complete: {shutdown_summary}")
                return shutdown_summary
                
            except Exception as e:
                logger.error(f"Agent shutdown failed: {e}")
                return {"error": str(e)}
    
    def get_resource_usage(self) -> Dict[str, Any]:
        """
        Get current resource usage statistics
        Performance target: <50ms execution
        """
        with self.performance_timer('resource_usage_check'):
            with self.lock:
                active_count = len(self.active_agents)
                status_counts = defaultdict(int)
                
                for agent in self.active_agents.values():
                    status_counts[agent.status.value] += 1
            
            return {
                "active_agents": active_count,
                "max_concurrent_agents": self.max_concurrent_agents,
                "thread_pool_active": len(getattr(self.thread_pool, '_threads', [])),
                "status_distribution": dict(status_counts),
                "agent_history_waves": len(self.agent_history)
            }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get agent manager performance metrics"""
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
            "resource_usage": self.get_resource_usage(),
            "performance_targets": {
                "max_execution_time": self.max_execution_time,
                "agent_timeout": self.agent_timeout,
                "max_concurrent_agents": self.max_concurrent_agents
            }
        }

# Global instance
_agent_manager = None

def get_agent_manager(context_manager=None, performance_monitor=None):
    """Get global agent manager instance"""
    global _agent_manager
    if _agent_manager is None:
        _agent_manager = AgentManager(context_manager, performance_monitor)
    return _agent_manager

def manage_agent_lifecycle(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main agent management interface
    
    Args:
        action: Action to perform (spawn, status, cleanup, shutdown)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        manager = get_agent_manager()
        
        result = {}
        
        if action == "spawn":
            agent_id = manager.spawn_agent(
                kwargs.get("agent_type", ""),
                kwargs.get("wave_number", 1),
                kwargs.get("task_data", {})
            )
            result = {"agent_id": agent_id}
            
        elif action == "status":
            if "agent_id" in kwargs:
                result = manager.get_agent_status(kwargs["agent_id"])
            elif "wave_number" in kwargs:
                result = {"agents": manager.get_wave_agents(kwargs["wave_number"])}
            else:
                result = manager.get_resource_usage()
                
        elif action == "wait_completion":
            result = manager.wait_for_wave_completion(
                kwargs.get("wave_number", 1),
                kwargs.get("timeout", 300)
            )
            
        elif action == "cleanup":
            cleaned = manager.cleanup_completed_agents(
                kwargs.get("max_age_hours", 24)
            )
            result = {"cleaned_count": cleaned}
            
        elif action == "shutdown":
            result = manager.shutdown_all_agents()
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            'success': True,
            'result': result,
            'metrics': manager.get_performance_metrics(),
            'errors': []
        }
        
    except Exception as e:
        logger.error(f"Agent management action '{action}' failed: {e}")
        return {
            'success': False,
            'result': {},
            'metrics': {},
            'errors': [str(e)]
        }

# Hook integration functions
def handle_subagent_stop(agent_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle subagent stop event"""
    try:
        manager = get_agent_manager()
        
        # Extract agent information
        agent_id = agent_data.get("agent_id")
        wave_number = agent_data.get("wave_number")
        agent_type = agent_data.get("agent_type", "unknown")
        results = agent_data.get("results", {})
        
        if agent_id:
            # Update agent status with results
            with manager.lock:
                if agent_id in manager.active_agents:
                    agent = manager.active_agents[agent_id]
                    agent.status = AgentStatus.COMPLETED
                    agent.completion_time = time.time()
                    agent.results = results
                    
                    logger.info(f"Agent {agent_id} completed successfully")
        
        return {
            "success": True,
            "agent_id": agent_id,
            "wave_number": wave_number,
            "agent_type": agent_type
        }
        
    except Exception as e:
        logger.error(f"Subagent stop handling failed: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # Test the agent manager
    manager = AgentManager()
    
    # Test agent spawning
    agent_id = manager.spawn_agent("specialist", 1, {"task_name": "test_task"})
    print(f"Spawned agent: {agent_id}")
    
    # Test agent status
    status = manager.get_agent_status(agent_id)
    print(f"Agent status: {status}")
    
    # Test wave agents
    wave_agents = manager.get_wave_agents(1)
    print(f"Wave 1 agents: {len(wave_agents)}")
    
    # Test resource usage
    resources = manager.get_resource_usage()
    print(f"Resource usage: {resources}")
    
    # Test cleanup
    cleaned = manager.cleanup_completed_agents(0)  # Clean all
    print(f"Cleaned agents: {cleaned}")
    
    # Test shutdown
    shutdown_result = manager.shutdown_all_agents()
    print(f"Shutdown result: {shutdown_result}")
    
    # Performance metrics
    metrics = manager.get_performance_metrics()
    print(f"Performance metrics: {metrics}")