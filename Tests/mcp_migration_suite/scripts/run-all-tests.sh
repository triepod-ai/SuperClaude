#!/bin/bash

#
# Comprehensive Test Runner for SuperClaude MCP Migration
# Runs all test suites with proper setup and cleanup
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_SERVERS_DIR="$(cd "$PROJECT_DIR/../../MCP_Servers" && pwd)"
HOOKS_DIR="$(cd "$PROJECT_DIR/../../SuperClaude/Hooks" && pwd)"

# Test configuration
DEFAULT_TEST_TYPES="unit integration e2e migration performance"
TEST_TYPES="${TEST_TYPES:-$DEFAULT_TEST_TYPES}"
PARALLEL_TESTS="${PARALLEL_TESTS:-false}"
CLEANUP_ON_EXIT="${CLEANUP_ON_EXIT:-true}"
GENERATE_REPORTS="${GENERATE_REPORTS:-true}"
SEND_NOTIFICATIONS="${SEND_NOTIFICATIONS:-false}"

# Process tracking
declare -a BACKGROUND_PIDS=()
TEST_START_TIME=""
TOTAL_TESTS_RUN=0
TOTAL_TESTS_PASSED=0
TOTAL_TESTS_FAILED=0

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_status $BLUE "═══════════════════════════════════════════════════════════════"
    print_status $BLUE "  $1"
    print_status $BLUE "═══════════════════════════════════════════════════════════════"
    echo ""
}

print_section() {
    echo ""
    print_status $YELLOW ">>> $1"
    echo ""
}

# Cleanup function
cleanup() {
    if [ "$CLEANUP_ON_EXIT" = "true" ]; then
        print_section "Cleaning up test environment..."
        
        # Kill background processes
        for pid in "${BACKGROUND_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                print_status $YELLOW "Stopping process $pid..."
                kill "$pid" || true
            fi
        done
        
        # Stop MCP servers
        cd "$PROJECT_DIR"
        npm run stop:mcp-servers 2>/dev/null || true
        
        # Cleanup test environment
        npm run teardown:test-env 2>/dev/null || true
        
        print_status $GREEN "Cleanup completed"
    fi
}

# Trap for cleanup on exit
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    print_section "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_status $RED "ERROR: Node.js is not installed"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_status $RED "ERROR: Python 3 is not installed"
        exit 1
    fi
    
    # Check required directories
    if [ ! -d "$MCP_SERVERS_DIR" ]; then
        print_status $RED "ERROR: MCP Servers directory not found: $MCP_SERVERS_DIR"
        exit 1
    fi
    
    if [ ! -d "$HOOKS_DIR" ]; then
        print_status $RED "ERROR: Hooks directory not found: $HOOKS_DIR"
        exit 1
    fi
    
    print_status $GREEN "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    print_section "Installing dependencies..."
    
    # Install test suite dependencies
    cd "$PROJECT_DIR"
    npm ci
    
    # Install MCP server dependencies
    cd "$MCP_SERVERS_DIR"
    npm ci
    
    # Install Python dependencies
    cd "$HOOKS_DIR"
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
    fi
    
    print_status $GREEN "Dependencies installed"
}

# Build MCP servers
build_mcp_servers() {
    print_section "Building MCP servers..."
    
    cd "$MCP_SERVERS_DIR"
    npm run build
    
    print_status $GREEN "MCP servers built successfully"
}

# Setup test environment
setup_test_environment() {
    print_section "Setting up test environment..."
    
    cd "$PROJECT_DIR"
    
    # Start MCP servers
    npm run start:mcp-servers &
    BACKGROUND_PIDS+=($!)
    
    # Wait for servers to be ready
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3001/health >/dev/null 2>&1; then
            break
        fi
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_status $RED "ERROR: MCP servers failed to start within timeout"
        exit 1
    fi
    
    # Setup test environment
    npm run setup:test-env
    
    print_status $GREEN "Test environment ready"
}

# Run specific test suite
run_test_suite() {
    local test_type=$1
    local test_start_time=$(date +%s)
    
    print_section "Running $test_type tests..."
    
    cd "$PROJECT_DIR"
    
    local test_result=0
    local test_output=""
    
    case $test_type in
        "unit")
            test_output=$(npm run test:unit 2>&1) || test_result=$?
            ;;
        "integration")
            test_output=$(npm run test:integration 2>&1) || test_result=$?
            ;;
        "e2e")
            test_output=$(npm run test:e2e 2>&1) || test_result=$?
            ;;
        "migration")
            test_output=$(npm run test:migration 2>&1) || test_result=$?
            ;;
        "performance")
            test_output=$(npm run test:performance 2>&1) || test_result=$?
            ;;
        "load")
            test_output=$(npm run test:load 2>&1) || test_result=$?
            ;;
        "stress")
            test_output=$(npm run test:stress 2>&1) || test_result=$?
            ;;
        *)
            print_status $RED "ERROR: Unknown test type: $test_type"
            return 1
            ;;
    esac
    
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    # Parse test results
    local tests_run=$(echo "$test_output" | grep -o '[0-9]\+ passing' | grep -o '[0-9]\+' || echo "0")
    local tests_failed=$(echo "$test_output" | grep -o '[0-9]\+ failing' | grep -o '[0-9]\+' || echo "0")
    
    TOTAL_TESTS_RUN=$((TOTAL_TESTS_RUN + tests_run))
    TOTAL_TESTS_FAILED=$((TOTAL_TESTS_FAILED + tests_failed))
    TOTAL_TESTS_PASSED=$((TOTAL_TESTS_PASSED + tests_run - tests_failed))
    
    if [ $test_result -eq 0 ]; then
        print_status $GREEN "✅ $test_type tests PASSED ($tests_run tests, ${test_duration}s)"
    else
        print_status $RED "❌ $test_type tests FAILED ($tests_run tests, $tests_failed failures, ${test_duration}s)"
        echo "$test_output"
    fi
    
    return $test_result
}

# Run all test suites
run_all_tests() {
    print_section "Running test suites: $TEST_TYPES"
    
    local overall_result=0
    local failed_suites=()
    
    if [ "$PARALLEL_TESTS" = "true" ]; then
        # Run tests in parallel
        declare -a test_pids=()
        
        for test_type in $TEST_TYPES; do
            run_test_suite "$test_type" &
            test_pids+=($!)
        done
        
        # Wait for all tests to complete
        for pid in "${test_pids[@]}"; do
            wait $pid || {
                overall_result=1
                failed_suites+=("unknown")
            }
        done
    else
        # Run tests sequentially
        for test_type in $TEST_TYPES; do
            if ! run_test_suite "$test_type"; then
                overall_result=1
                failed_suites+=("$test_type")
            fi
        done
    fi
    
    return $overall_result
}

# Generate comprehensive report
generate_reports() {
    if [ "$GENERATE_REPORTS" = "true" ]; then
        print_section "Generating test reports..."
        
        cd "$PROJECT_DIR"
        
        # Generate performance report
        npm run generate:performance-report 2>/dev/null || true
        
        # Generate migration report
        npm run generate:migration-report 2>/dev/null || true
        
        # Generate comprehensive HTML report
        cat > "test-summary.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>SuperClaude MCP Migration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #495057; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .details { margin-top: 30px; }
        .test-suite { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SuperClaude MCP Migration Test Report</h1>
            <p>Generated: $(date)</p>
            <p>Duration: ${TEST_DURATION}s</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">$TOTAL_TESTS_RUN</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value success">$TOTAL_TESTS_PASSED</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failure">$TOTAL_TESTS_FAILED</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value $([ $TOTAL_TESTS_FAILED -eq 0 ] && echo "success" || echo "warning")">$(( TOTAL_TESTS_PASSED * 100 / TOTAL_TESTS_RUN ))%</div>
            </div>
        </div>
        
        <div class="details">
            <h2>Test Suite Results</h2>
            <!-- Individual test suite details would be added here -->
        </div>
    </div>
</body>
</html>
EOF
        
        print_status $GREEN "Reports generated in test-results directory"
    fi
}

# Send notifications
send_notifications() {
    if [ "$SEND_NOTIFICATIONS" = "true" ] && [ -n "$TEAMS_WEBHOOK_URL" ]; then
        print_section "Sending notifications..."
        
        local status_emoji="✅"
        local status_text="SUCCESS"
        local color="00FF00"
        
        if [ $TOTAL_TESTS_FAILED -gt 0 ]; then
            status_emoji="❌"
            status_text="FAILURE"
            color="FF0000"
        fi
        
        local payload=$(cat << EOF
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "summary": "SuperClaude MCP Tests $status_text",
    "themeColor": "$color",
    "sections": [{
        "activityTitle": "$status_emoji SuperClaude MCP Migration Tests $status_text",
        "activitySubtitle": "Local test execution completed",
        "facts": [
            {"name": "Total Tests", "value": "$TOTAL_TESTS_RUN"},
            {"name": "Passed", "value": "$TOTAL_TESTS_PASSED"},
            {"name": "Failed", "value": "$TOTAL_TESTS_FAILED"},
            {"name": "Duration", "value": "${TEST_DURATION}s"},
            {"name": "Test Types", "value": "$TEST_TYPES"}
        ]
    }]
}
EOF
        )
        
        curl -H "Content-Type: application/json" -d "$payload" "$TEAMS_WEBHOOK_URL" || true
        print_status $GREEN "Notification sent"
    fi
}

# Main execution
main() {
    TEST_START_TIME=$(date +%s)
    
    print_header "SuperClaude MCP Migration Test Suite"
    
    print_status $BLUE "Configuration:"
    print_status $BLUE "  Test Types: $TEST_TYPES"
    print_status $BLUE "  Parallel Tests: $PARALLEL_TESTS"
    print_status $BLUE "  Generate Reports: $GENERATE_REPORTS"
    print_status $BLUE "  Send Notifications: $SEND_NOTIFICATIONS"
    
    # Run all phases
    check_prerequisites
    install_dependencies
    build_mcp_servers
    setup_test_environment
    
    local test_result=0
    run_all_tests || test_result=$?
    
    # Calculate final statistics
    local test_end_time=$(date +%s)
    TEST_DURATION=$((test_end_time - TEST_START_TIME))
    
    # Generate reports and notifications
    generate_reports
    send_notifications
    
    # Print final summary
    print_header "Test Execution Summary"
    
    print_status $BLUE "Total Duration: ${TEST_DURATION}s"
    print_status $BLUE "Total Tests Run: $TOTAL_TESTS_RUN"
    print_status $GREEN "Tests Passed: $TOTAL_TESTS_PASSED"
    
    if [ $TOTAL_TESTS_FAILED -gt 0 ]; then
        print_status $RED "Tests Failed: $TOTAL_TESTS_FAILED"
        print_status $RED "Success Rate: $(( TOTAL_TESTS_PASSED * 100 / TOTAL_TESTS_RUN ))%"
    else
        print_status $GREEN "Tests Failed: 0"
        print_status $GREEN "Success Rate: 100%"
    fi
    
    if [ $test_result -eq 0 ] && [ $TOTAL_TESTS_FAILED -eq 0 ]; then
        print_status $GREEN "🎉 ALL TESTS PASSED - Migration system is ready!"
    else
        print_status $RED "❌ SOME TESTS FAILED - Review results before migration"
    fi
    
    return $test_result
}

# Help function
show_help() {
    cat << EOF
SuperClaude MCP Migration Test Suite

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -t, --test-types TYPE   Test types to run (default: "unit integration e2e migration performance")
    -p, --parallel          Run tests in parallel
    -r, --reports           Generate reports (default: true)
    -n, --notifications     Send notifications (requires TEAMS_WEBHOOK_URL)
    -c, --cleanup           Cleanup on exit (default: true)

Environment Variables:
    TEST_TYPES              Test types to run
    PARALLEL_TESTS          Run tests in parallel (true/false)
    GENERATE_REPORTS        Generate reports (true/false)
    SEND_NOTIFICATIONS      Send notifications (true/false)
    CLEANUP_ON_EXIT         Cleanup on exit (true/false)
    TEAMS_WEBHOOK_URL       Teams webhook URL for notifications

Examples:
    $0                                  # Run all tests
    $0 -t "unit integration"            # Run only unit and integration tests
    $0 -p -r -n                        # Run in parallel with reports and notifications
    TEST_TYPES="performance" $0         # Run only performance tests

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--test-types)
            TEST_TYPES="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL_TESTS="true"
            shift
            ;;
        -r|--reports)
            GENERATE_REPORTS="true"
            shift
            ;;
        -n|--notifications)
            SEND_NOTIFICATIONS="true"
            shift
            ;;
        -c|--cleanup)
            CLEANUP_ON_EXIT="true"
            shift
            ;;
        *)
            print_status $RED "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"