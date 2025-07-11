#!/usr/bin/env python3
"""
Performance tests for SuperClaude installation suite.

Tests installation speed, memory usage, and stress scenarios.
"""

# Performance test configuration
PERFORMANCE_TEST_TIMEOUT = 600  # 10 minutes
PERFORMANCE_MEMORY_LIMIT = 500  # MB
PERFORMANCE_SPEED_TARGET = 60   # seconds

# Performance test categories
SPEED_TESTS = "speed_tests"
MEMORY_TESTS = "memory_tests"
STRESS_TESTS = "stress_tests"
BENCHMARK_TESTS = "benchmark_tests"