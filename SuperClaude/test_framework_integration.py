#!/usr/bin/env python3
"""
SuperClaude Framework Integration Test Suite
Validates complete feature parity and functionality
"""

import sys
import time
import json
from pathlib import Path

# Add framework path
sys.path.insert(0, str(Path(__file__).parent / "Hooks"))

from superclaude_framework import (
    process_superclaude_command,
    get_superclaude_framework,
    CommandType,
    PersonaType
)
from superclaude_pretooluse_hook import superclaude_pretooluse


def test_command_system():
    """Test command parsing and routing"""
    print("🧪 Testing Command System...")
    
    test_cases = [
        ("/analyze @src/ --focus security", CommandType.ANALYZE),
        ("/improve performance --wave-mode", CommandType.IMPROVE),
        ("/build component Button", CommandType.BUILD),
        ("/scan --security", CommandType.SCAN),
        ("/review code quality", CommandType.REVIEW),
        ("create a new feature", CommandType.BUILD),  # Implicit command
        ("analyze the architecture", CommandType.ANALYZE)  # Implicit command
    ]
    
    framework = get_superclaude_framework()
    passed = 0
    
    for input_text, expected_command in test_cases:
        result = framework.process_input(input_text)
        detected_command = result.get("parsed_command", {}).get("command")
        
        # Handle both enum and string values
        if hasattr(detected_command, 'value'):
            detected_command = detected_command.value
        
        if detected_command == expected_command.value:
            print(f"  ✅ '{input_text}' → {detected_command}")
            passed += 1
        else:
            print(f"  ❌ '{input_text}' → {detected_command} (expected {expected_command.value})")
    
    print(f"Command System: {passed}/{len(test_cases)} tests passed\n")
    return passed == len(test_cases)


def test_persona_auto_activation():
    """Test persona auto-activation system"""
    print("🎭 Testing Persona Auto-Activation...")
    
    test_cases = [
        ("analyze the system architecture", [PersonaType.ARCHITECT, PersonaType.ANALYZER]),
        ("create a React component with accessibility", [PersonaType.FRONTEND]),
        ("security audit of the API", [PersonaType.SECURITY, PersonaType.ANALYZER]),
        ("optimize database performance", [PersonaType.PERFORMANCE, PersonaType.BACKEND]),
        ("write documentation for the API", [PersonaType.SCRIBE]),
        ("test the user interface", [PersonaType.QA, PersonaType.FRONTEND]),
        ("refactor the legacy code", [PersonaType.REFACTORER]),
        ("deploy to production", [PersonaType.DEVOPS])
    ]
    
    framework = get_superclaude_framework()
    passed = 0
    
    for input_text, expected_personas in test_cases:
        result = framework.process_input(input_text)
        activated_personas = [pa["persona"] for pa in result.get("persona_activations", [])]
        
        # Check if at least one expected persona is activated
        persona_match = any(persona.value in activated_personas for persona in expected_personas)
        
        if persona_match:
            print(f"  ✅ '{input_text}' → {activated_personas}")
            passed += 1
        else:
            print(f"  ❌ '{input_text}' → {activated_personas} (expected one of {[p.value for p in expected_personas]})")
    
    print(f"Persona Auto-Activation: {passed}/{len(test_cases)} tests passed\n")
    return passed == len(test_cases)


def test_wave_orchestration():
    """Test wave orchestration triggers"""
    print("🌊 Testing Wave Orchestration...")
    
    test_cases = [
        ("comprehensive security audit of the entire enterprise system", True),
        ("/improve --wave-mode progressive", True),
        ("analyze @large_project/ --comprehensive --systematic", True),
        ("simple file read operation", False),
        ("create a single component", False)
    ]
    
    framework = get_superclaude_framework()
    passed = 0
    
    for input_text, expect_wave in test_cases:
        result = framework.process_input(input_text)
        has_wave = result.get("wave_plan") is not None
        
        if has_wave == expect_wave:
            wave_info = f" (Wave: {result['wave_plan']['strategy']})" if has_wave else " (No Wave)"
            print(f"  ✅ '{input_text}'{wave_info}")
            passed += 1
        else:
            print(f"  ❌ '{input_text}' → Wave: {has_wave} (expected {expect_wave})")
    
    print(f"Wave Orchestration: {passed}/{len(test_cases)} tests passed\n")
    return passed == len(test_cases)


def test_flag_system():
    """Test flag parsing and auto-detection"""
    print("🏳️ Testing Flag System...")
    
    test_cases = [
        ("analyze --think --focus security", ["think", "focus"]),
        ("improve performance --wave-mode progressive", ["wave_mode"]),
        ("create React component", ["magic"]),  # Auto-detected
        ("complex comprehensive analysis", ["think"]),  # Auto-detected
        ("test the application end-to-end", ["playwright"]),  # Auto-detected
        ("/build --persona-frontend --uc", ["persona_frontend", "uc"])
    ]
    
    framework = get_superclaude_framework()
    passed = 0
    
    for input_text, expected_flags in test_cases:
        result = framework.process_input(input_text)
        detected_flags = list(result.get("parsed_command", {}).get("flags", {}).keys())
        
        # Check if expected flags are present
        flags_match = all(flag in detected_flags for flag in expected_flags)
        
        if flags_match:
            print(f"  ✅ '{input_text}' → {detected_flags}")
            passed += 1
        else:
            print(f"  ❌ '{input_text}' → {detected_flags} (expected {expected_flags})")
    
    print(f"Flag System: {passed}/{len(test_cases)} tests passed\n")
    return passed == len(test_cases)


def test_intelligent_routing():
    """Test intelligent routing and tool selection"""
    print("🧭 Testing Intelligent Routing...")
    
    test_cases = [
        ("analyze code", ["Read", "Grep", "Sequential"]),
        ("create component", ["Write", "Magic"]),
        ("scan security", ["Grep", "Sequential"]),
        ("test application", ["Playwright"]),
        ("improve performance", ["Read", "Edit", "Sequential"])
    ]
    
    framework = get_superclaude_framework()
    passed = 0
    
    for input_text, expected_tools in test_cases:
        result = framework.process_input(input_text)
        recommended_tools = result.get("execution_plan", {}).get("tools", [])
        
        # Check if at least one expected tool is recommended
        tools_match = any(tool in recommended_tools for tool in expected_tools)
        
        if tools_match:
            print(f"  ✅ '{input_text}' → {recommended_tools}")
            passed += 1
        else:
            print(f"  ❌ '{input_text}' → {recommended_tools} (expected one of {expected_tools})")
    
    print(f"Intelligent Routing: {passed}/{len(test_cases)} tests passed\n")
    return passed == len(test_cases)


def test_pretooluse_hook():
    """Test PreToolUse hook integration"""
    print("🪝 Testing PreToolUse Hook...")
    
    test_cases = [
        "/analyze @src/ --security",
        "/build component --magic",
        "comprehensive security audit",
        "optimize database performance",
        "create documentation"
    ]
    
    passed = 0
    
    for input_text in test_cases:
        result = superclaude_pretooluse(input_text, {"session_id": "test"})
        
        success = result.get("success", False)
        has_enhancement = len(result.get("enhanced_instructions", "")) > len(input_text)
        has_recommendations = len(result.get("tool_recommendations", [])) > 0
        
        if success and has_enhancement:
            print(f"  ✅ '{input_text}' → Enhanced successfully")
            passed += 1
        else:
            print(f"  ❌ '{input_text}' → Enhancement failed")
    
    print(f"PreToolUse Hook: {passed}/{len(test_cases)} tests passed\n")
    return passed == len(test_cases)


def test_performance():
    """Test performance targets"""
    print("⚡ Testing Performance...")
    
    framework = get_superclaude_framework()
    
    # Test processing speed
    test_input = "/analyze @src/ --focus security --think --comprehensive"
    start_time = time.time()
    result = framework.process_input(test_input)
    processing_time = time.time() - start_time
    
    # Test hook speed
    start_time = time.time()
    hook_result = superclaude_pretooluse(test_input, {"session_id": "test"})
    hook_time = time.time() - start_time
    
    framework_target = 0.100  # 100ms
    hook_target = 0.010       # 10ms
    
    framework_pass = processing_time <= framework_target
    hook_pass = hook_time <= hook_target
    
    print(f"  Framework Processing: {processing_time:.3f}s ({'✅' if framework_pass else '❌'} target: {framework_target}s)")
    print(f"  Hook Processing: {hook_time:.3f}s ({'✅' if hook_pass else '❌'} target: {hook_target}s)")
    
    print(f"Performance: {'✅' if framework_pass and hook_pass else '❌'} targets met\n")
    return framework_pass and hook_pass


def test_integration_example():
    """Test complete integration example"""
    print("🔗 Testing Complete Integration...")
    
    test_input = "/analyze @src/ --focus security --think --comprehensive"
    
    # Process through framework
    framework_result = process_superclaude_command(test_input, "integration_test")
    
    # Process through hook
    hook_result = superclaude_pretooluse(test_input, {"session_id": "integration_test"})
    
    # Validate results
    framework_success = framework_result.get("success", False)
    hook_success = hook_result.get("success", False)
    
    if framework_success and hook_success:
        print("  ✅ Framework processing successful")
        print("  ✅ Hook processing successful")
        
        # Show analysis
        analysis = hook_result.get("framework_analysis", {})
        print(f"  📊 Command: {analysis.get('command_detected', 'none')}")
        print(f"  🎭 Personas: {analysis.get('personas_activated', [])}")
        print(f"  📈 Complexity: {analysis.get('complexity_score', 0):.2f}")
        print(f"  🌊 Wave Mode: {analysis.get('wave_mode', False)}")
        print(f"  🎯 Strategy: {analysis.get('delegation_strategy', 'standard')}")
        
        print("Complete Integration: ✅ PASSED\n")
        return True
    else:
        print("  ❌ Integration test failed")
        print(f"  Framework: {framework_success}, Hook: {hook_success}")
        print("Complete Integration: ❌ FAILED\n")
        return False


def run_all_tests():
    """Run all test suites"""
    print("🚀 SuperClaude Framework Integration Test Suite\n")
    
    tests = [
        ("Command System", test_command_system),
        ("Persona Auto-Activation", test_persona_auto_activation),
        ("Wave Orchestration", test_wave_orchestration),
        ("Flag System", test_flag_system),
        ("Intelligent Routing", test_intelligent_routing),
        ("PreToolUse Hook", test_pretooluse_hook),
        ("Performance", test_performance),
        ("Complete Integration", test_integration_example)
    ]
    
    results = []
    start_time = time.time()
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with error: {e}")
            results.append((test_name, False))
    
    total_time = time.time() - start_time
    
    # Summary
    print("=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:25} {status}")
        if result:
            passed += 1
    
    print("=" * 60)
    print(f"Overall: {passed}/{len(results)} tests passed ({passed/len(results)*100:.1f}%)")
    print(f"Total time: {total_time:.2f}s")
    
    if passed == len(results):
        print("\n🎉 ALL TESTS PASSED - SuperClaude Framework Integration is working correctly!")
        print("✅ Complete feature parity achieved")
        print("✅ All auto-activation systems functional")
        print("✅ Performance targets met")
        print("✅ Claude Code integration successful")
    else:
        print(f"\n⚠️  {len(results) - passed} tests failed - See details above")
    
    return passed == len(results)


if __name__ == "__main__":
    run_all_tests()