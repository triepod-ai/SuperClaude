#!/usr/bin/env python3
"""
SuperClaude Installation Suite Test Battery

Comprehensive testing framework for the modular SuperClaude installation system.
Provides unit, integration, end-to-end, and performance testing capabilities.
"""

__version__ = "1.0.0"
__author__ = "SuperClaude Framework"

# Test configuration constants
TEST_TIMEOUT = 30  # Default test timeout in seconds
MOCK_CLAUDE_DIR = "/tmp/test_claude"  # Mock .claude directory for testing
COVERAGE_TARGET_UTILS = 90  # Coverage target for utility modules
COVERAGE_TARGET_INSTALLERS = 80  # Coverage target for installer modules

# Test categories
UNIT_TESTS = "unit"
INTEGRATION_TESTS = "integration"
E2E_TESTS = "e2e"
PERFORMANCE_TESTS = "performance"

# Test priorities
CRITICAL = "critical"
HIGH = "high"
MEDIUM = "medium"
LOW = "low"