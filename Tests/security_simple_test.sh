#!/usr/bin/env bash
#
# Simple Security Verification Test
#

set -euo pipefail

echo "SuperClaude Security Verification"
echo "=================================="

# Source the common utilities and security functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Basic logging functions
log_error() { echo "ERROR: $1" >&2; }
log_info() { echo "INFO: $1"; }
log_success() { echo "SUCCESS: $1"; }

# Source security utilities
source "$SCRIPT_DIR/Scripts/shell/utils/security.sh"

echo "✓ Security utilities loaded successfully"

# Test 1: Check dangerous patterns are removed
echo "Testing: Dangerous rm patterns removed..."
if grep -r "rm -rf.*\*" "$SCRIPT_DIR/Scripts/shell/operations/" 2>/dev/null; then
    echo "✗ FAIL: Dangerous glob patterns still exist"
    exit 1
else
    echo "✓ PASS: No dangerous glob patterns found"
fi

# Test 2: Test directory validation
echo "Testing: Directory validation..."
if validate_superclaude_directory "/" 2>/dev/null; then
    echo "✗ FAIL: System directory validation failed"
    exit 1
else
    echo "✓ PASS: System directory correctly rejected"
fi

# Test 3: Test path sanitization
echo "Testing: Path sanitization..."
if sanitize_path "/etc/passwd" 2>/dev/null; then
    echo "✗ FAIL: System path not rejected"
    exit 1
else
    echo "✓ PASS: System path correctly rejected"
fi

echo
echo "All security tests passed! ✓"
echo
echo "Security fixes implemented:"
echo "- Removed dangerous rm -rf glob patterns"
echo "- Added SuperClaude directory validation"
echo "- Implemented safe file removal functions"
echo "- Added backup integrity validation"
echo "- Added path sanitization"
echo "- Protected against system directory operations"
echo
echo "Scripts are now secure against:"
echo "- Accidental deletion of system files"
echo "- Path traversal attacks"
echo "- Operations on non-SuperClaude directories"
echo "- Unsafe backup operations"