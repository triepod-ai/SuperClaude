#!/usr/bin/env python3
"""
End-to-end tests for SuperClaude installation flows.

Tests complete installation workflows from start to finish with real system integration.
"""

# E2E test configuration
E2E_TEST_TIMEOUT = 300  # 5 minutes
E2E_COVERAGE_TARGET = 70  # percent

# Test categories for E2E tests
FULL_INSTALLATION = "full_installation"
UPDATE_FLOW = "update_flow"
UNINSTALL_FLOW = "uninstall_flow"
ERROR_RECOVERY = "error_recovery"