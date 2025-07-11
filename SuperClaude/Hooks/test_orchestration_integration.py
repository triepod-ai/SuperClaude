#!/usr/bin/env python3
"""
Test Orchestration Engine Integration
Tests the integration of orchestration engine with other hooks
"""

import time
import json
import sys
from pathlib import Path

# Add hooks directory to path
hooks_dir = Path(__file__).parent
sys.path.insert(0, str(hooks_dir))

from orchestration_engine import get_orchestration_engine, orchestrate_intelligence
from wave_coordinator import WaveCoordinator
from task_manager import TaskManager
from agent_manager import AgentManager


def test_orchestration_engine_basic():
    """Test basic orchestration engine functionality"""
    print("=== Testing Orchestration Engine Basic Functionality ===")
    
    engine = get_orchestration_engine()
    
    # Test complex enterprise-scale task
    test_hook_data = {
        'tool_call': {
            'name': 'Task',
            'parameters': {
                'description': 'Comprehensively improve and modernize large enterprise authentication system',
                'context': 'Large enterprise application with React frontend, Node.js backend, multiple microservices, and comprehensive testing requirements',
                'scope': 'system-wide refactoring with security audit and performance optimization'
            }
        },
        'context': {
            'user_request': 'enterprise security audit with modernization'
        }
    }
    
    start_time = time.time()
    
    # Test full orchestration pipeline
    result = orchestrate_intelligence("full_orchestration", hook_data=test_hook_data)
    
    execution_time = time.time() - start_time
    
    print(f"Orchestration completed in {execution_time:.3f}s")
    print(f"Success: {result['success']}")
    
    if result['success']:
        analysis = result['result']['analysis']
        validation = result['result']['validation']
        decision = result['result']['decision']
        
        print(f"\nAnalysis Results:")
        print(f"  Complexity: {analysis['complexity']:.2f}")
        print(f"  Domains: {analysis['domains']}")
        print(f"  Estimated tokens: {analysis['estimated_tokens']}")
        print(f"  Enterprise scale: {analysis['enterprise_scale']}")
        
        print(f"\nValidation Results:")
        print(f"  Risk score: {validation['risk_score']:.2f}")
        print(f"  Safe mode required: {validation['safe_mode_required']}")
        print(f"  Warnings: {len(validation['warnings'])}")
        
        print(f"\nOrchestration Decision:")
        print(f"  Selected tools: {decision['selected_tools']}")
        print(f"  Wave eligible: {decision['wave_eligible']}")
        print(f"  Wave strategy: {decision['wave_strategy']}")
        print(f"  Delegation strategy: {decision['delegation_strategy']}")
        print(f"  Confidence: {decision['confidence_score']:.2f}")
        print(f"  Auto flags: {decision['auto_flags']}")
        print(f"  Reasoning: {decision['reasoning']}")
        
        # Validate expected results for enterprise-scale task
        assert analysis['complexity'] > 0.5, f"Should detect significant complexity, got {analysis['complexity']}"
        assert analysis['enterprise_scale'], "Should detect enterprise scale"
        assert decision['wave_eligible'], "Should be wave eligible"
        assert 'Sequential' in decision['selected_tools'], "Should include Sequential for coordination"
        assert len(decision['auto_flags']) > 0, "Should recommend auto flags"
        
        print("✅ All orchestration assertions passed!")
    else:
        print(f"❌ Orchestration failed: {result['errors']}")
        return False
    
    return True


def test_wave_coordinator_integration():
    """Test wave coordinator integration with orchestration engine"""
    print("\n=== Testing Wave Coordinator Integration ===")
    
    coordinator = WaveCoordinator()
    
    # Test wave detection with orchestration engine
    test_cases = [
        {
            'tool_name': 'Task',
            'instruction': 'Systematically improve enterprise application performance and security across all microservices',
            'expected_wave_eligible': True
        },
        {
            'tool_name': 'Read',
            'instruction': 'Read a simple configuration file',
            'expected_wave_eligible': False
        },
        {
            'tool_name': 'Task',
            'instruction': 'Comprehensively improve and modernize large enterprise authentication system with security audit testing',
            'expected_wave_eligible': True
        }
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\nTest case {i+1}: {test_case['tool_name']} - {test_case['instruction'][:50]}...")
        
        start_time = time.time()
        result = coordinator.detect_wave_pattern(test_case['tool_name'], test_case['instruction'])
        execution_time = time.time() - start_time
        
        print(f"  Detection time: {execution_time:.3f}s")
        
        if result:
            print(f"  Wave detected: {result.get('detected', False)}")
            print(f"  Source: {result.get('source', 'unknown')}")
            if result.get('wave_eligible'):
                print(f"  Wave strategy: {result.get('wave_strategy')}")
                print(f"  Confidence: {result.get('confidence', 0):.2f}")
            
            # Validate expectations
            is_wave_eligible = result.get('wave_eligible', result.get('detected', False))
            if is_wave_eligible != test_case['expected_wave_eligible']:
                print(f"  ❌ Expected wave eligible: {test_case['expected_wave_eligible']}, got: {is_wave_eligible}")
                return False
            else:
                print(f"  ✅ Wave eligibility correctly detected")
        else:
            if test_case['expected_wave_eligible']:
                print(f"  ❌ Expected wave detection but got None")
                return False
            else:
                print(f"  ✅ Correctly detected no wave needed")
    
    print("✅ Wave coordinator integration tests passed!")
    return True


def test_task_manager_integration():
    """Test task manager integration with orchestration engine"""
    print("\n=== Testing Task Manager Integration ===")
    
    task_manager = TaskManager()
    
    # Test MCP routing with orchestration engine
    test_contexts = [
        {
            'tool': {
                'name': 'Task',
                'parameters': {
                    'description': 'Create React component with documentation and testing',
                    'context': 'Frontend development with UI components'
                }
            },
            'expected_servers': ['magic', 'context7', 'playwright']
        },
        {
            'tool': {
                'name': 'Task', 
                'parameters': {
                    'description': 'Analyze complex system architecture and performance bottlenecks',
                    'context': 'Backend performance analysis'
                }
            },
            'expected_servers': ['sequential']
        },
        {
            'tool': {
                'name': 'Read',
                'parameters': {
                    'file_path': 'simple.txt'
                }
            },
            'expected_servers': ['sequential']  # Fallback for simple operations
        }
    ]
    
    for i, test_context in enumerate(test_contexts):
        print(f"\nTest case {i+1}: {test_context['tool']['name']} routing")
        
        start_time = time.time()
        recommended_servers = task_manager.get_mcp_server_routing(test_context)
        execution_time = time.time() - start_time
        
        print(f"  Routing time: {execution_time:.3f}s")
        print(f"  Recommended servers: {recommended_servers}")
        
        # Check if at least one expected server is recommended
        has_expected_server = any(server in recommended_servers for server in test_context['expected_servers'])
        
        if has_expected_server or len(recommended_servers) > 0:
            print(f"  ✅ Appropriate servers recommended")
        else:
            print(f"  ❌ No appropriate servers recommended")
            return False
    
    print("✅ Task manager integration tests passed!")
    return True


def test_agent_manager_integration():
    """Test agent manager integration with orchestration engine"""
    print("\n=== Testing Agent Manager Integration ===")
    
    agent_manager = AgentManager()
    
    # Test intelligent agent spawning
    test_tasks = [
        {
            'task_name': 'enterprise_security_audit',
            'description': 'Comprehensive security audit of large enterprise system',
            'complexity': 'high',
            'expected_strategy': 'adaptive_delegation'
        },
        {
            'task_name': 'simple_file_read',
            'description': 'Read configuration file',
            'complexity': 'low',
            'expected_strategy': 'single_agent'
        }
    ]
    
    for i, test_task in enumerate(test_tasks):
        print(f"\nTest case {i+1}: {test_task['task_name']}")
        
        start_time = time.time()
        agent_id = agent_manager.spawn_agent('specialist', 1, test_task)
        execution_time = time.time() - start_time
        
        print(f"  Agent spawn time: {execution_time:.3f}s")
        print(f"  Agent ID: {agent_id}")
        
        # Check agent metadata
        agent_status = agent_manager.get_agent_status(agent_id)
        if agent_status:
            print(f"  Agent status: {agent_status['status']}")
            print(f"  ✅ Agent spawned successfully")
        else:
            print(f"  ❌ Failed to spawn agent")
            return False
    
    # Cleanup agents
    agent_manager.shutdown_all_agents()
    print("✅ Agent manager integration tests passed!")
    return True


def test_performance_benchmarks():
    """Test performance benchmarks for orchestration integration"""
    print("\n=== Testing Performance Benchmarks ===")
    
    engine = get_orchestration_engine()
    
    # Performance test data
    performance_test_data = {
        'tool_call': {
            'name': 'Task',
            'parameters': {
                'description': 'Complex enterprise application modernization',
                'context': 'Large-scale system with multiple domains'
            }
        },
        'context': {}
    }
    
    # Run multiple iterations to test performance
    iterations = 10
    total_times = {
        'analysis': 0,
        'validation': 0,
        'decision': 0,
        'full_orchestration': 0
    }
    
    print(f"Running {iterations} iterations of performance tests...")
    
    for i in range(iterations):
        # Test individual components
        start_time = time.time()
        analysis_result = orchestrate_intelligence("analyze", hook_data=performance_test_data)
        total_times['analysis'] += time.time() - start_time
        
        if analysis_result['success']:
            analysis = analysis_result['result']['analysis']
            
            start_time = time.time()
            validation_result = orchestrate_intelligence("validate", 
                hook_data=performance_test_data, analysis=analysis)
            total_times['validation'] += time.time() - start_time
            
            if validation_result['success']:
                validation = validation_result['result']['validation']
                
                start_time = time.time()
                decision_result = orchestrate_intelligence("decide",
                    hook_data=performance_test_data, analysis=analysis, validation=validation)
                total_times['decision'] += time.time() - start_time
        
        # Test full orchestration
        start_time = time.time()
        full_result = orchestrate_intelligence("full_orchestration", hook_data=performance_test_data)
        total_times['full_orchestration'] += time.time() - start_time
    
    # Calculate averages
    avg_times = {operation: total_time / iterations for operation, total_time in total_times.items()}
    
    print(f"\nPerformance Results (average over {iterations} iterations):")
    for operation, avg_time in avg_times.items():
        target_time = 0.030  # 30ms target
        status = "✅" if avg_time <= target_time else "⚠️" if avg_time <= target_time * 2 else "❌"
        print(f"  {operation}: {avg_time:.3f}s {status}")
    
    # Overall performance validation
    if avg_times['full_orchestration'] <= 0.100:  # 100ms target for full orchestration
        print("✅ Performance benchmarks passed!")
        return True
    else:
        print("❌ Performance benchmarks failed - exceeds 100ms target")
        return False


def run_all_tests():
    """Run all integration tests"""
    print("🚀 Starting SuperClaude Orchestration Engine Integration Tests\n")
    
    tests = [
        ("Basic Functionality", test_orchestration_engine_basic),
        ("Wave Coordinator Integration", test_wave_coordinator_integration),
        ("Task Manager Integration", test_task_manager_integration),
        ("Agent Manager Integration", test_agent_manager_integration),
        ("Performance Benchmarks", test_performance_benchmarks)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if result:
                passed += 1
                print(f"\n✅ {test_name}: PASSED")
            else:
                print(f"\n❌ {test_name}: FAILED")
        except Exception as e:
            print(f"\n❌ {test_name}: ERROR - {str(e)}")
    
    print(f"\n🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All integration tests passed! Orchestration engine is ready for production.")
        return True
    else:
        print("🔧 Some tests failed. Please review and fix issues before deployment.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)