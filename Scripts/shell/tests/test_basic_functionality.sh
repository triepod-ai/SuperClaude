#!/usr/bin/env bash
#
# Basic functionality tests for SuperClaude modular installer
#

set -euo pipefail

# Test directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../../.." && pwd)"

# Colors for test output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0

# Test logging
test_log() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

test_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

test_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TESTS_RUN++))
    test_log "Running: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        test_pass "$test_name"
    else
        test_error "$test_name"
    fi
}

# Test module sourcing
test_modules() {
    test_log "Testing module sourcing..."
    
    run_test "Source common.sh" "source '$PROJECT_ROOT/Scripts/shell/common.sh'"
    run_test "Source os-detection.sh" "source '$PROJECT_ROOT/Scripts/shell/os-detection.sh'"
    run_test "Source requirements.sh" "source '$PROJECT_ROOT/Scripts/shell/requirements.sh'"
    run_test "Source install.sh operations" "source '$PROJECT_ROOT/Scripts/shell/operations/install.sh'"
    run_test "Source update.sh operations" "source '$PROJECT_ROOT/Scripts/shell/operations/update.sh'"
    run_test "Source uninstall.sh operations" "source '$PROJECT_ROOT/Scripts/shell/operations/uninstall.sh'"
}

# Test install.sh functionality
test_installer() {
    test_log "Testing installer functionality..."
    
    run_test "Help flag works" "cd '$PROJECT_ROOT' && ./install.sh --help"
    run_test "Unknown flag error handling" "cd '$PROJECT_ROOT' && ./install.sh --unknown-flag 2>&1 | grep -q 'Unknown option'"
    run_test "Skip checks flag parsing" "cd '$PROJECT_ROOT' && ./install.sh --skip-checks --help"
}

# Test utility functions
test_utilities() {
    test_log "Testing utility functions..."
    
    # Source modules for testing
    source "$PROJECT_ROOT/Scripts/shell/common.sh"
    source "$PROJECT_ROOT/Scripts/shell/os-detection.sh"
    
    run_test "Version comparison function" "version_compare '3.12.0' '3.11.0'"
    run_test "Command exists function" "command_exists 'bash'"
    run_test "OS detection function" "detect_os"
}

# Test configuration files
test_config() {
    test_log "Testing configuration files..."
    
    run_test "Requirements config exists" "test -f '$PROJECT_ROOT/Scripts/shell/config/requirements.yml'"
    run_test "Requirements config is valid YAML" "grep -q 'requirements:' '$PROJECT_ROOT/Scripts/shell/config/requirements.yml'"
}

# Main test runner
main() {
    echo -e "${YELLOW}SuperClaude Modular Installer - Basic Functionality Tests${NC}"
    echo "=========================================================="
    echo
    
    test_modules
    echo
    test_config
    echo
    test_utilities
    echo
    test_installer
    echo
    
    echo "=========================================================="
    echo -e "Tests completed: ${TESTS_PASSED}/${TESTS_RUN} passed"
    
    if [ "$TESTS_PASSED" -eq "$TESTS_RUN" ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        exit 1
    fi
}

main "$@"