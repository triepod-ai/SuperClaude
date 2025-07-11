#!/usr/bin/env python3
"""
Integration tests for SuperClaude installation components.

Tests component interactions, workflows, and cross-module functionality.
"""

# Integration test configuration
INTEGRATION_TEST_TIMEOUT = 30  # seconds
INTEGRATION_COVERAGE_TARGET = 80  # percent

# Test categories for integration tests
INSTALLER_INTEGRATION = "installer_integration"
WORKFLOW_INTEGRATION = "workflow_integration"
SYSTEM_INTEGRATION = "system_integration"