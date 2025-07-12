#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Security Test Suite
#
# Tests the security hardening implemented in shell operations.
#

set -euo pipefail

# Test configuration
readonly TEST_DIR="/tmp/superclaude_security_test_$$"
readonly FAKE_SUPERCLAUDE_DIR="$TEST_DIR/fake_superclaude"
readonly INVALID_DIR="$TEST_DIR/invalid"
readonly SYSTEM_DIR_TEST="/"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Logging functions
log_test() {
    echo -e "${NC}[TEST] $1${NC}"
}

log_pass() {
    echo -e "${GREEN}[PASS] $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL] $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_info() {
    echo -e "${YELLOW}[INFO] $1${NC}"
}

# Setup test environment
setup_test_env() {
    log_info "Setting up test environment..."
    
    # Clean up any existing test directory
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
    
    mkdir -p "$TEST_DIR"
    mkdir -p "$FAKE_SUPERCLAUDE_DIR"
    mkdir -p "$INVALID_DIR"
    
    # Create fake SuperClaude installation
    cat > "$FAKE_SUPERCLAUDE_DIR/settings.json" << 'EOF'
{
    "version": "3.0.0",
    "framework": "SuperClaude",
    "installation_type": "test"
}
EOF
    
    cat > "$FAKE_SUPERCLAUDE_DIR/CLAUDE.md" << 'EOF'
# SuperClaude Framework v3.0 - Test Installation
Test installation for security validation.
EOF
    
    mkdir -p "$FAKE_SUPERCLAUDE_DIR/SuperClaude"
    echo "test file" > "$FAKE_SUPERCLAUDE_DIR/SuperClaude/test.txt"
    
    # Create invalid directory with no SuperClaude files
    echo "not superclaude" > "$INVALID_DIR/random.txt"
    
    log_info "Test environment ready at: $TEST_DIR"
}

# Source security utilities
source_security_utils() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    local utils_file="$script_dir/Scripts/shell/utils/security.sh"
    
    if [ ! -f "$utils_file" ]; then
        log_fail "Security utilities not found: $utils_file"
        exit 1
    fi
    
    # Define minimal logging functions for security utils
    log_error() { echo "ERROR: $1" >&2; }
    log_warning() { echo "WARNING: $1" >&2; }
    log_info() { echo "INFO: $1" >&2; }
    log_success() { echo "SUCCESS: $1" >&2; }
    
    source "$utils_file"
    log_info "Security utilities loaded"
}

# Test 1: validate_superclaude_directory with valid directory
test_validate_valid_directory() {
    log_test "Testing validate_superclaude_directory with valid directory"
    
    if validate_superclaude_directory "$FAKE_SUPERCLAUDE_DIR" 2>/dev/null; then
        log_pass "Valid SuperClaude directory accepted"
    else
        log_fail "Valid SuperClaude directory rejected"
    fi
}

# Test 2: validate_superclaude_directory with invalid directory
test_validate_invalid_directory() {
    log_test "Testing validate_superclaude_directory with invalid directory"
    
    if validate_superclaude_directory "$INVALID_DIR" 2>/dev/null; then
        log_fail "Invalid directory accepted (security vulnerability)"
    else
        log_pass "Invalid directory correctly rejected"
    fi
}

# Test 3: validate_superclaude_directory with system directory
test_validate_system_directory() {
    log_test "Testing validate_superclaude_directory with system directory"
    
    if validate_superclaude_directory "$SYSTEM_DIR_TEST" 2>/dev/null; then
        log_fail "System directory accepted (CRITICAL security vulnerability)"
    else
        log_pass "System directory correctly rejected"
    fi
}

# Test 4: safe_cleanup_directory function
test_safe_cleanup() {
    log_test "Testing safe_cleanup_directory function"
    
    # Create a copy for testing
    local test_cleanup_dir="$TEST_DIR/cleanup_test"
    cp -r "$FAKE_SUPERCLAUDE_DIR" "$test_cleanup_dir"
    
    if safe_cleanup_directory "$test_cleanup_dir" 2>/dev/null; then
        # Check that SuperClaude files were removed
        if [ ! -f "$test_cleanup_dir/settings.json" ] && [ ! -f "$test_cleanup_dir/CLAUDE.md" ]; then
            log_pass "SuperClaude files safely removed"
        else
            log_fail "SuperClaude files not properly removed"
        fi
    else
        log_fail "safe_cleanup_directory failed on valid directory"
    fi
}

# Test 5: safe_cleanup_directory with invalid directory
test_safe_cleanup_invalid() {
    log_test "Testing safe_cleanup_directory with invalid directory"
    
    if safe_cleanup_directory "$INVALID_DIR" 2>/dev/null; then
        log_fail "safe_cleanup_directory accepted invalid directory (security vulnerability)"
    else
        log_pass "safe_cleanup_directory correctly rejected invalid directory"
    fi
}

# Test 6: create_secure_backup function
test_create_secure_backup() {
    log_test "Testing create_secure_backup function"
    
    local backup_result
    backup_result=$(create_secure_backup "$FAKE_SUPERCLAUDE_DIR" 2>/dev/null)
    
    if [ -n "$backup_result" ] && [ -d "$backup_result" ]; then
        # Check backup contains expected files
        if [ -f "$backup_result/settings.json" ] && [ -f "$backup_result/CLAUDE.md" ]; then
            log_pass "Secure backup created successfully"
        else
            log_fail "Backup missing expected files"
        fi
    else
        log_fail "create_secure_backup failed"
    fi
}

# Test 7: validate_backup function
test_validate_backup() {
    log_test "Testing validate_backup function"
    
    # Create a valid backup first
    local backup_result
    backup_result=$(create_secure_backup "$FAKE_SUPERCLAUDE_DIR" 2>/dev/null)
    
    if validate_backup "$backup_result" 2>/dev/null; then
        log_pass "Valid backup correctly validated"
    else
        log_fail "Valid backup validation failed"
    fi
    
    # Test with invalid backup
    if validate_backup "$INVALID_DIR" 2>/dev/null; then
        log_fail "Invalid backup accepted (security vulnerability)"
    else
        log_pass "Invalid backup correctly rejected"
    fi
}

# Test 8: sanitize_path function
test_sanitize_path() {
    log_test "Testing sanitize_path function"
    
    # Test path traversal prevention
    local dangerous_path="../../../etc/passwd"
    local sanitized
    sanitized=$(sanitize_path "$dangerous_path" 2>/dev/null)
    
    if [[ "$sanitized" == *".."* ]]; then
        log_fail "Path traversal not properly sanitized: $sanitized"
    else
        log_pass "Path traversal properly sanitized"
    fi
    
    # Test system directory rejection
    if sanitize_path "/etc/dangerous" 2>/dev/null; then
        log_fail "System directory path accepted (security vulnerability)"
    else
        log_pass "System directory path correctly rejected"
    fi
}

# Test 9: Test that original dangerous patterns are gone
test_dangerous_patterns_removed() {
    log_test "Testing that dangerous rm patterns have been removed"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    local operations_dir="$script_dir/Scripts/shell/operations"
    
    # Check for dangerous glob expansion patterns
    local dangerous_patterns=(
        'rm -rf.*\*'
        'rm -rf .*\$.*\*'
        'rm -rf "\$.*"/\*'
    )
    
    local found_dangerous=0
    for pattern in "${dangerous_patterns[@]}"; do
        if grep -r -E "$pattern" "$operations_dir" 2>/dev/null; then
            log_fail "Dangerous pattern found: $pattern"
            found_dangerous=1
        fi
    done
    
    if [ $found_dangerous -eq 0 ]; then
        log_pass "No dangerous rm patterns found"
    fi
}

# Cleanup test environment
cleanup_test_env() {
    log_info "Cleaning up test environment..."
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
    log_info "Test environment cleaned up"
}

# Main test execution
main() {
    echo "SuperClaude Security Test Suite"
    echo "==============================="
    echo
    
    setup_test_env
    source_security_utils
    
    # Run all tests
    test_validate_valid_directory
    test_validate_invalid_directory
    test_validate_system_directory
    test_safe_cleanup
    test_safe_cleanup_invalid
    test_create_secure_backup
    test_validate_backup
    test_sanitize_path
    test_dangerous_patterns_removed
    
    cleanup_test_env
    
    echo
    echo "Test Results:"
    echo "============="
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed! Security fixes are working correctly.${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed. Security vulnerabilities may still exist.${NC}"
        return 1
    fi
}

# Run tests
main "$@"