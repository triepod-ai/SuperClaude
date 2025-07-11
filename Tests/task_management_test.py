#!/usr/bin/env python3
"""
Comprehensive Task Management System Test Suite
Tests enhanced task management functionality, performance, and integration
"""

import json
import time
import subprocess
import sys
import unittest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta
import uuid

class TaskManagementTester(unittest.TestCase):
    """Comprehensive testing system for task management enhancements"""
    
    def setUp(self):
        """Set up test environment"""
        self.base_dir = Path("/home/anton/SuperClaude")
        self.claude_dir = self.base_dir / ".claude"
        self.hooks_dir = self.claude_dir / "hooks"
        self.task_manager_script = self.hooks_dir / "task_manager.py"
        
        # Create test directory
        self.test_dir = Path(tempfile.mkdtemp())
        
        # Test data
        self.test_event_data = {
            "eventType": "PreToolUse",
            "context": {
                "tool": {
                    "name": "TodoWrite",
                    "parameters": {
                        "todos": [
                            {
                                "content": "Test task for enhanced management",
                                "status": "pending",
                                "priority": "high",
                                "id": "test-task-1"
                            }
                        ]
                    }
                }
            }
        }
        
        self.performance_thresholds = {
            "hook_execution": 0.1,  # 100ms
            "task_creation": 0.05,  # 50ms
            "analytics_generation": 0.2,  # 200ms
            "delegation_analysis": 0.15  # 150ms
        }
    
    def tearDown(self):
        """Clean up test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
    
    def test_hook_execution_performance(self):
        """Test task manager hook execution performance"""
        start_time = time.time()
        
        try:
            # Prepare test data
            data_json = json.dumps(self.test_event_data)
            
            # Run task manager hook
            result = subprocess.run([
                "python3", str(self.task_manager_script)
            ], input=data_json, capture_output=True, text=True, timeout=5)
            
            execution_time = time.time() - start_time
            
            # Verify performance
            self.assertLess(execution_time, self.performance_thresholds["hook_execution"], 
                           f"Hook execution took {execution_time:.3f}s, exceeds {self.performance_thresholds['hook_execution']}s threshold")
            
            # Verify successful execution
            self.assertEqual(result.returncode, 0, f"Hook execution failed: {result.stderr}")
            
            # Verify output format
            if result.stdout.strip():
                parsed_result = json.loads(result.stdout)
                self.assertIn("taskManager", parsed_result)
                self.assertIn("status", parsed_result["taskManager"])
                
        except subprocess.TimeoutExpired:
            self.fail("Hook execution timed out")
        except json.JSONDecodeError as e:
            self.fail(f"Hook output is not valid JSON: {e}")
    
    def test_enhanced_task_states(self):
        """Test enhanced task state machine functionality"""
        # Import the task manager module for testing
        sys.path.append(str(self.hooks_dir))
        from task_manager import TaskManager, TaskState, TaskPriority
        
        task_manager = TaskManager(str(self.test_dir))
        
        # Test all enhanced states
        enhanced_states = [
            TaskState.PENDING,
            TaskState.IN_PROGRESS,
            TaskState.COMPLETED,
            TaskState.BLOCKED,
            TaskState.SUSPENDED,
            TaskState.DELEGATED,
            TaskState.VALIDATING,
            TaskState.FAILED,
            TaskState.ARCHIVED
        ]
        
        for state in enhanced_states:
            task = task_manager.create_task(
                content=f"Test task for state {state.value}",
                priority=TaskPriority.MEDIUM
            )
            
            # Test state transition
            success = task_manager.update_task_status(task.id, state, f"Testing {state.value} state")
            self.assertTrue(success, f"Failed to update task to {state.value} state")
            
            # Verify state was updated
            updated_task = None
            for t in task_manager.session_tasks["tasks"]:
                if t["id"] == task.id:
                    updated_task = t
                    break
            
            self.assertIsNotNone(updated_task, f"Task {task.id} not found after state update")
            self.assertEqual(updated_task["status"], state.value, f"Task state not updated to {state.value}")
    
    def test_task_relationship_modeling(self):
        """Test task relationship and dependency modeling"""
        sys.path.append(str(self.hooks_dir))
        from task_manager import TaskManager, TaskPriority
        
        task_manager = TaskManager(str(self.test_dir))
        
        # Create parent task
        parent_task = task_manager.create_task(
            content="Parent task for relationship testing",
            priority=TaskPriority.HIGH
        )
        
        # Create child tasks
        child_task_1 = task_manager.create_task(
            content="Child task 1",
            priority=TaskPriority.MEDIUM,
            parent_id=parent_task.id
        )
        
        child_task_2 = task_manager.create_task(
            content="Child task 2", 
            priority=TaskPriority.MEDIUM,
            parent_id=parent_task.id
        )
        
        # Verify relationships
        self.assertEqual(child_task_1.relationships.parent_id, parent_task.id)
        self.assertEqual(child_task_2.relationships.parent_id, parent_task.id)
        
        # Test dependency handling
        child_task_1.relationships.depends_on.append(child_task_2.id)
        child_task_2.relationships.blocks.append(child_task_1.id)
        
        self.assertIn(child_task_2.id, child_task_1.relationships.depends_on)
        self.assertIn(child_task_1.id, child_task_2.relationships.blocks)
    
    def test_cross_session_persistence(self):
        """Test cross-session task persistence functionality"""
        sys.path.append(str(self.hooks_dir))
        from task_manager import TaskManager, TaskPriority
        
        # First session
        task_manager_1 = TaskManager(str(self.test_dir))
        
        task = task_manager_1.create_task(
            content="Persistent task across sessions",
            priority=TaskPriority.HIGH,
            tags=["persistence_test"]
        )
        
        # Save state
        task_manager_1._save_task_context()
        task_manager_1._save_session_tasks()
        
        # Second session (new instance)
        task_manager_2 = TaskManager(str(self.test_dir))
        
        # Verify task context was loaded
        self.assertIsNotNone(task_manager_2.task_context)
        self.assertIn("project_tasks", task_manager_2.task_context)
        
        # Verify session tasks were loaded
        self.assertIsNotNone(task_manager_2.session_tasks)
        self.assertIn("tasks", task_manager_2.session_tasks)
        
        # Find the persistent task
        found_task = None
        for t in task_manager_2.session_tasks["tasks"]:
            if t["id"] == task.id:
                found_task = t
                break
        
        self.assertIsNotNone(found_task, "Task not found in new session")
        self.assertEqual(found_task["content"], task.content)
        self.assertIn("persistence_test", found_task["tags"])
    
    def test_mcp_server_routing(self):
        """Test intelligent MCP server routing functionality"""
        sys.path.append(str(self.hooks_dir))
        from task_manager import TaskManager, TaskPriority
        
        task_manager = TaskManager(str(self.test_dir))
        
        # Test different task types and their MCP server routing
        test_cases = [
            {
                "content": "Create React component with modern UI design",
                "expected_servers": ["magic", "context7"]
            },
            {
                "content": "Analyze complex algorithm performance and optimize",
                "expected_servers": ["sequential"]
            },
            {
                "content": "Implement automated testing for the application",
                "expected_servers": ["playwright"]
            },
            {
                "content": "Research best practices for API documentation",
                "expected_servers": ["context7"]
            }
        ]
        
        for test_case in test_cases:
            task = task_manager.create_task(
                content=test_case["content"],
                priority=TaskPriority.MEDIUM
            )
            
            # Test MCP server routing
            recommended_servers = task_manager.route_task_to_mcp_servers(task)
            
            # Verify at least one expected server was recommended
            self.assertTrue(
                any(server in recommended_servers for server in test_case["expected_servers"]),
                f"None of expected servers {test_case['expected_servers']} found in recommendations {recommended_servers}"
            )
    
    def test_predictive_task_creation(self):
        """Test predictive task creation based on project analysis"""
        sys.path.append(str(self.hooks_dir))
        from task_manager import TaskManager
        
        # Create a mock project structure
        test_project_dir = self.test_dir / "test_project"
        test_project_dir.mkdir()
        
        # Create mock files to simulate project detection
        (test_project_dir / "package.json").write_text('{"name": "test-project", "dependencies": {"react": "^18.0.0"}}')
        (test_project_dir / "src").mkdir()
        (test_project_dir / "src" / "components").mkdir()
        (test_project_dir / "tests").mkdir()
        
        task_manager = TaskManager(str(test_project_dir))
        
        # Test project analysis
        project_analysis = task_manager.analyze_project_context()
        
        # Verify project analysis results
        self.assertIn("structure", project_analysis)
        self.assertIn("technologies", project_analysis)
        self.assertIn("patterns", project_analysis)
        self.assertIn("potential_tasks", project_analysis)
        
        # Verify technology detection
        self.assertIn("nodejs", project_analysis["technologies"])
        self.assertIn("react", project_analysis["technologies"])
        
        # Verify pattern detection
        self.assertIn("component_architecture", project_analysis["patterns"])
        self.assertIn("test_driven", project_analysis["patterns"])
        
        # Test predictive task creation
        predictive_tasks = task_manager.create_predictive_tasks(project_analysis)
        
        # Verify predictive tasks were created
        self.assertGreater(len(predictive_tasks), 0, "No predictive tasks were created")
        
        # Verify task characteristics
        for task in predictive_tasks:
            self.assertIsNotNone(task.content)
            self.assertIn("predictive", task.tags)
            self.assertGreater(len(task.evidence), 0, "Predictive task should have reasoning evidence")
    
    def test_multi_agent_delegation(self):
        """Test multi-agent task delegation functionality"""
        sys.path.append(str(self.hooks_dir))
        from task_manager import TaskManager, TaskPriority
        
        task_manager = TaskManager(str(self.test_dir))
        
        # Create complex task suitable for delegation
        complex_task = task_manager.create_task(
            content="Implement user authentication system with frontend UI, backend API, security measures, and comprehensive testing",
            priority=TaskPriority.HIGH,
            tags=["complex", "multi_domain"]
        )
        
        # Test delegation analysis
        start_time = time.time()
        delegation_result = task_manager.delegate_task(complex_task, "expertise")
        delegation_time = time.time() - start_time
        
        # Verify delegation performance
        self.assertLess(delegation_time, self.performance_thresholds["delegation_analysis"],
                       f"Delegation analysis took {delegation_time:.3f}s, exceeds threshold")
        
        # Verify delegation results
        self.assertEqual(delegation_result["status"], "delegated")
        self.assertGreater(len(delegation_result["agents"]), 1, "Multiple agents should be assigned for complex task")
        self.assertIn("coordination_plan", delegation_result)
        self.assertIn("synchronization_points", delegation_result)
        
        # Verify agent specialization
        agent_types = [agent["type"] for agent in delegation_result["agents"]]
        self.assertIn("frontend_specialist", agent_types)
        self.assertIn("backend_specialist", agent_types)
        self.assertIn("security_specialist", agent_types)
        
        # Test coordination
        coordination_status = task_manager.coordinate_multi_agent_execution(complex_task, delegation_result)
        self.assertEqual(coordination_status["status"], "coordinating")
        self.assertGreater(len(coordination_status["active_agents"]), 0)
    
    def test_performance_analytics(self):
        """Test performance analytics generation"""
        sys.path.append(str(self.hooks_dir))
        from task_manager import TaskManager, TaskPriority, TaskState
        
        task_manager = TaskManager(str(self.test_dir))
        
        # Create sample tasks with varied completion states
        for i in range(10):
            task = task_manager.create_task(
                content=f"Sample task {i} for analytics testing",
                priority=TaskPriority.MEDIUM,
                tags=["analytics_test"]
            )
            
            # Simulate task completion for some tasks
            if i % 2 == 0:
                task_manager.update_task_status(task.id, TaskState.COMPLETED, f"Completed task {i}")
            elif i % 3 == 0:
                task_manager.update_task_status(task.id, TaskState.IN_PROGRESS, f"Working on task {i}")
        
        # Test analytics generation
        start_time = time.time()
        analytics = task_manager.generate_performance_analytics()
        analytics_time = time.time() - start_time
        
        # Verify analytics performance
        self.assertLess(analytics_time, self.performance_thresholds["analytics_generation"],
                       f"Analytics generation took {analytics_time:.3f}s, exceeds threshold")
        
        # Verify analytics structure
        expected_sections = [
            "overview", "efficiency_metrics", "bottleneck_analysis",
            "optimization_recommendations", "trend_analysis", "comparative_analysis"
        ]
        
        for section in expected_sections:
            self.assertIn(section, analytics, f"Analytics missing {section} section")
        
        # Verify overview metrics
        overview = analytics["overview"]
        self.assertIn("total_tasks", overview)
        self.assertIn("completed_tasks", overview)
        self.assertIn("completion_rate", overview)
        self.assertEqual(overview["total_tasks"], 10)
        self.assertGreaterEqual(overview["completion_rate"], 0.0)
        self.assertLessEqual(overview["completion_rate"], 1.0)
        
        # Verify optimization recommendations
        recommendations = analytics["optimization_recommendations"]
        self.assertIsInstance(recommendations, list)
        
        if recommendations:
            for rec in recommendations:
                self.assertIn("category", rec)
                self.assertIn("priority", rec)
                self.assertIn("recommendation", rec)
                self.assertIn("expected_impact", rec)
    
    def test_task_complexity_analysis(self):
        """Test task complexity analysis and scoring"""
        sys.path.append(str(self.hooks_dir))
        from task_manager import TaskManager
        
        task_manager = TaskManager(str(self.test_dir))
        
        # Test complexity scoring for different task types
        test_cases = [
            {
                "content": "Fix typo in documentation",
                "expected_complexity": "low"  # < 0.3
            },
            {
                "content": "Implement user authentication and authorization system with JWT tokens",
                "expected_complexity": "medium"  # 0.3 - 0.7
            },
            {
                "content": "Design and implement a scalable microservices architecture with service discovery, load balancing, monitoring, logging, and deployment automation using Kubernetes",
                "expected_complexity": "high"  # > 0.7
            }
        ]
        
        for test_case in test_cases:
            complexity_score = task_manager.analyze_task_complexity(
                test_case["content"], 
                {"tool": {"name": "Task", "parameters": {}}}
            )
            
            self.assertGreaterEqual(complexity_score, 0.0, "Complexity score should be >= 0.0")
            self.assertLessEqual(complexity_score, 1.0, "Complexity score should be <= 1.0")
            
            # Verify expected complexity ranges
            if test_case["expected_complexity"] == "low":
                self.assertLess(complexity_score, 0.3, f"Expected low complexity for: {test_case['content']}")
            elif test_case["expected_complexity"] == "medium":
                self.assertGreaterEqual(complexity_score, 0.3, f"Expected medium complexity for: {test_case['content']}")
                self.assertLess(complexity_score, 0.7, f"Expected medium complexity for: {test_case['content']}")
            elif test_case["expected_complexity"] == "high":
                self.assertGreaterEqual(complexity_score, 0.7, f"Expected high complexity for: {test_case['content']}")
    
    def test_integration_with_existing_hooks(self):
        """Test integration with existing hook system"""
        # Test that task manager hook doesn't interfere with existing hooks
        test_data = {
            "eventType": "PostToolUse",
            "context": {
                "tool": {
                    "name": "TodoWrite",
                    "parameters": {
                        "todos": [
                            {
                                "content": "Integration test task",
                                "status": "completed",
                                "priority": "medium",
                                "id": "integration-test-1"
                            }
                        ]
                    }
                }
            }
        }
        
        try:
            # Run task manager hook
            data_json = json.dumps(test_data)
            result = subprocess.run([
                "python3", str(self.task_manager_script)
            ], input=data_json, capture_output=True, text=True, timeout=5)
            
            # Verify successful execution
            self.assertEqual(result.returncode, 0, "Task manager hook should execute successfully")
            
            # Verify output format doesn't break other hooks
            if result.stdout.strip():
                parsed_result = json.loads(result.stdout)
                self.assertIsInstance(parsed_result, dict, "Hook output should be valid JSON object")
                
        except subprocess.TimeoutExpired:
            self.fail("Hook integration test timed out")
        except json.JSONDecodeError:
            self.fail("Hook integration produced invalid JSON output")


def run_performance_benchmarks():
    """Run performance benchmarks for task management system"""
    print("Running Task Management Performance Benchmarks...")
    
    # Load the task manager for benchmarking
    sys.path.append("/home/anton/SuperClaude/.claude/hooks")
    from task_manager import TaskManager, TaskPriority
    
    test_dir = Path(tempfile.mkdtemp())
    task_manager = TaskManager(str(test_dir))
    
    benchmarks = {}
    
    # Benchmark task creation
    start_time = time.time()
    for i in range(100):
        task_manager.create_task(f"Benchmark task {i}", TaskPriority.MEDIUM)
    benchmarks["task_creation_100"] = time.time() - start_time
    
    # Benchmark analytics generation
    start_time = time.time()
    analytics = task_manager.generate_performance_analytics()
    benchmarks["analytics_generation"] = time.time() - start_time
    
    # Benchmark project analysis
    start_time = time.time()
    project_analysis = task_manager.analyze_project_context()
    benchmarks["project_analysis"] = time.time() - start_time
    
    # Clean up
    shutil.rmtree(test_dir)
    
    # Print results
    print("\nPerformance Benchmark Results:")
    print(f"Task Creation (100 tasks): {benchmarks['task_creation_100']:.3f}s ({benchmarks['task_creation_100']*10:.1f}ms per task)")
    print(f"Analytics Generation: {benchmarks['analytics_generation']:.3f}s")
    print(f"Project Analysis: {benchmarks['project_analysis']:.3f}s")
    
    # Check performance targets
    targets = {
        "task_creation_100": 1.0,  # 1 second for 100 tasks
        "analytics_generation": 0.5,  # 500ms
        "project_analysis": 2.0  # 2 seconds
    }
    
    print("\nPerformance Target Analysis:")
    for metric, target in targets.items():
        actual = benchmarks[metric]
        status = "✅ PASS" if actual <= target else "❌ FAIL"
        print(f"{metric}: {actual:.3f}s (target: {target}s) {status}")
    
    return benchmarks


if __name__ == "__main__":
    # Run unit tests
    print("Running Task Management Unit Tests...")
    unittest.main(argv=[''], exit=False, verbosity=2)
    
    # Run performance benchmarks
    print("\n" + "="*60)
    run_performance_benchmarks()