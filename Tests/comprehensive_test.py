#!/usr/bin/env python3
"""
Comprehensive Hook System Test
Tests all hook handlers for performance and functionality
"""

import json
import time
import subprocess
import sys
from pathlib import Path

class HookTester:
    """Comprehensive testing system for hook handlers"""
    
    def __init__(self):
        self.hooks_dir = Path(".claude/hooks")
        self.test_results = {}
        
    def run_hook_test(self, hook_script: str, event_type: str, test_data: dict) -> dict:
        """Run a specific hook test"""
        start_time = time.time()
        
        try:
            # Prepare test data
            data_json = json.dumps(test_data)
            
            # Run hook script
            result = subprocess.run([
                "python3", f"{self.hooks_dir}/{hook_script}",
                "--event", event_type,
                "--data", data_json
            ], capture_output=True, text=True, timeout=5)
            
            execution_time = time.time() - start_time
            
            # Parse result
            if result.returncode == 0:
                try:
                    parsed_result = json.loads(result.stdout)
                    return {
                        "success": True,
                        "execution_time": execution_time,
                        "result": parsed_result,
                        "error": None
                    }
                except json.JSONDecodeError:
                    return {
                        "success": False,
                        "execution_time": execution_time,
                        "result": None,
                        "error": f"Failed to parse JSON output: {result.stdout}"
                    }
            else:
                return {
                    "success": False,
                    "execution_time": execution_time,
                    "result": None,
                    "error": f"Hook failed with exit code {result.returncode}: {result.stderr}"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "execution_time": 5.0,
                "result": None,
                "error": "Hook execution timed out"
            }
        except Exception as e:
            return {
                "success": False,
                "execution_time": time.time() - start_time,
                "result": None,
                "error": f"Unexpected error: {e}"
            }
    
    def test_all_hooks(self):
        """Test all hook handlers with all event types"""
        print("Starting comprehensive hook system test...")
        
        # Test data for different event types
        test_data = {
            "PreToolUse": {
                "tool_call": {
                    "name": "Task",
                    "parameters": {
                        "instruction": "Test wave_1_review operation",
                        "context": "Testing compound intelligence"
                    }
                }
            },
            "PostToolUse": {
                "tool_call": {
                    "name": "Task",
                    "parameters": {
                        "instruction": "Test wave_1_review operation"
                    }
                },
                "result": {
                    "output": "Test task completed successfully",
                    "success": True,
                    "execution_time": 0.05
                }
            },
            "SubagentStop": {
                "agent_info": {
                    "name": "test_agent",
                    "type": "wave_1_review",
                    "execution_time": 0.1
                },
                "result": {
                    "findings": "Test findings",
                    "success": True,
                    "insights": ["Test insight 1", "Test insight 2"]
                }
            },
            "Stop": {
                "reason": "test_shutdown",
                "timestamp": time.time()
            }
        }
        
        # Hook scripts to test
        hook_scripts = [
            "wave_coordinator.py",
            "wave_performance_monitor.py", 
            "context_accumulator.py",
            "error_handler.py"
        ]
        
        # Event types to test
        event_types = ["PreToolUse", "PostToolUse", "SubagentStop", "Stop"]
        
        # Run all tests
        total_tests = 0
        passed_tests = 0
        performance_failures = 0
        
        for hook_script in hook_scripts:
            print(f"\nTesting {hook_script}...")
            self.test_results[hook_script] = {}
            
            for event_type in event_types:
                print(f"  Testing {event_type}...")
                
                result = self.run_hook_test(hook_script, event_type, test_data[event_type])
                self.test_results[hook_script][event_type] = result
                
                total_tests += 1
                
                if result["success"]:
                    passed_tests += 1
                    print(f"    ✓ SUCCESS - {result['execution_time']:.4f}s")
                    
                    # Check performance target
                    if result["execution_time"] > 0.1:  # 100ms target
                        performance_failures += 1
                        print(f"    ⚠ PERFORMANCE WARNING - Exceeded 100ms target")
                else:
                    print(f"    ✗ FAILED - {result['error']}")
        
        # Print summary
        print(f"\n" + "="*50)
        print(f"TEST SUMMARY")
        print(f"="*50)
        print(f"Total tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Performance warnings: {performance_failures}")
        print(f"Success rate: {passed_tests/total_tests*100:.1f}%")
        
        # Performance analysis
        print(f"\nPERFORMANCE ANALYSIS:")
        all_times = []
        for hook_script, events in self.test_results.items():
            for event_type, result in events.items():
                if result["success"]:
                    all_times.append(result["execution_time"])
        
        if all_times:
            avg_time = sum(all_times) / len(all_times)
            max_time = max(all_times)
            min_time = min(all_times)
            
            print(f"Average execution time: {avg_time:.4f}s")
            print(f"Maximum execution time: {max_time:.4f}s")
            print(f"Minimum execution time: {min_time:.4f}s")
            print(f"Sub-100ms target: {'✓ MET' if max_time < 0.1 else '✗ FAILED'}")
        
        # Event coverage analysis
        print(f"\nEVENT COVERAGE ANALYSIS:")
        for event_type in event_types:
            event_success = sum(1 for hook_script in hook_scripts 
                              if self.test_results[hook_script][event_type]["success"])
            print(f"{event_type}: {event_success}/{len(hook_scripts)} hooks ({event_success/len(hook_scripts)*100:.1f}%)")
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "performance_failures": performance_failures,
            "success_rate": passed_tests/total_tests*100,
            "max_execution_time": max(all_times) if all_times else 0
        }
    
    def test_integration(self):
        """Test hook integration with settings file"""
        print(f"\nTesting integration with settings.local.json...")
        
        settings_file = Path(".claude/settings.local.json")
        if not settings_file.exists():
            print("✗ Settings file not found")
            return False
        
        try:
            with open(settings_file, 'r') as f:
                settings = json.load(f)
            
            hooks_config = settings.get("hooks", {})
            
            # Check for all required event types
            required_events = ["PreToolUse", "PostToolUse", "SubagentStop", "Stop", "Notification"]
            missing_events = []
            
            for event in required_events:
                if event not in hooks_config:
                    missing_events.append(event)
            
            if missing_events:
                print(f"✗ Missing event configurations: {missing_events}")
                return False
            
            # Check hook script references
            all_hooks = []
            for event_type, event_config in hooks_config.items():
                for matcher_config in event_config:
                    for hook in matcher_config.get("hooks", []):
                        command = hook.get("command", "")
                        if ".claude/hooks/" in command:
                            script_name = command.split(".claude/hooks/")[1].split()[0]
                            all_hooks.append(script_name)
            
            # Verify all hook scripts exist
            missing_scripts = []
            for script in set(all_hooks):
                if not (Path(".claude/hooks") / script).exists():
                    missing_scripts.append(script)
            
            if missing_scripts:
                print(f"✗ Missing hook scripts: {missing_scripts}")
                return False
            
            print("✓ Integration test passed")
            return True
            
        except Exception as e:
            print(f"✗ Integration test failed: {e}")
            return False

def main():
    """Main test runner"""
    tester = HookTester()
    
    # Run comprehensive tests
    results = tester.test_all_hooks()
    
    # Test integration
    integration_success = tester.test_integration()
    
    # Final assessment
    print(f"\n" + "="*50)
    print(f"FINAL ASSESSMENT")
    print(f"="*50)
    
    if results["passed_tests"] == results["total_tests"] and integration_success:
        print("🎉 ALL TESTS PASSED - Hook system is ready for production!")
        exit_code = 0
    elif results["success_rate"] >= 90:
        print("⚠️  MOSTLY SUCCESSFUL - Minor issues detected")
        exit_code = 1
    else:
        print("❌ SIGNIFICANT ISSUES - Hook system needs attention")
        exit_code = 2
    
    print(f"\nRecommendations:")
    if results["performance_failures"] > 0:
        print("- Review performance optimization for slow hooks")
    if results["success_rate"] < 100:
        print("- Debug and fix failing hook handlers")
    if not integration_success:
        print("- Fix integration issues with settings configuration")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())