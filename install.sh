#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Interactive Installation Entry Point
# 
# This script provides a unified entry point for SuperClaude installation,
# using a modular system with shell-based orchestration and interactive menus.
#
# Usage: ./install.sh [options]
# Options:
#   --skip-checks    Skip requirement checks (not recommended)
#   --standard       Standard installation (copy files)
#   --development    Development installation (symlinks)
#   --update         Update existing installation
#   --uninstall      Remove SuperClaude installation
#   --help           Show this help message

set -euo pipefail

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="$SCRIPT_DIR"
readonly CLAUDE_GLOBAL_DIR="$HOME/.claude"
readonly SHELL_DIR="$SCRIPT_DIR/Scripts/shell"

# Validate module availability before sourcing
validate_modules() {
    local required_modules=(
        "$SHELL_DIR/common.sh"
        "$SHELL_DIR/os-detection.sh"
        "$SHELL_DIR/requirements.sh"
        "$SHELL_DIR/utils/security.sh"
        "$SHELL_DIR/operations/install.sh"
        "$SHELL_DIR/operations/update.sh"
        "$SHELL_DIR/operations/uninstall.sh"
    )
    
    for module in "${required_modules[@]}"; do
        if [ ! -f "$module" ]; then
            echo "Missing module: $module"
            handle_module_error
        fi
    done
}

# Error handling for missing modules
handle_module_error() {
    echo "Error: Required SuperClaude modules not found."
    echo "Please ensure you have the complete SuperClaude framework:"
    echo "  • Scripts/shell/common.sh"
    echo "  • Scripts/shell/os-detection.sh"
    echo "  • Scripts/shell/requirements.sh"
    echo "  • Scripts/shell/operations/"
    echo
    echo "If this is a fresh installation, please download the complete framework."
    exit 1
}

# Ensure modules are available before proceeding
if [ ! -d "$SHELL_DIR" ]; then
    handle_module_error
fi

validate_modules

# Source core modules
if [ -f "$SHELL_DIR/common.sh" ]; then
    source "$SHELL_DIR/common.sh"
else
    echo "Error: Core module 'common.sh' not found. Please ensure Scripts/shell/ directory exists."
    exit 1
fi

# Source OS detection module
if [ -f "$SHELL_DIR/os-detection.sh" ]; then
    source "$SHELL_DIR/os-detection.sh"
else
    echo "Error: OS detection module 'os-detection.sh' not found in Scripts/shell/"
    exit 1
fi

# Source requirements checking module
if [ -f "$SHELL_DIR/requirements.sh" ]; then
    source "$SHELL_DIR/requirements.sh"
else
    echo "Error: Requirements module 'requirements.sh' not found in Scripts/shell/"
    exit 1
fi

# Source security utilities first
if [ -f "$SHELL_DIR/utils/security.sh" ]; then
    source "$SHELL_DIR/utils/security.sh"
else
    echo "Error: Security module 'utils/security.sh' not found in Scripts/shell/"
    exit 1
fi

# Source operation modules
if [ -f "$SHELL_DIR/operations/install.sh" ]; then
    source "$SHELL_DIR/operations/install.sh"
else
    echo "Error: Install operations module 'operations/install.sh' not found in Scripts/shell/"
    exit 1
fi

if [ -f "$SHELL_DIR/operations/update.sh" ]; then
    source "$SHELL_DIR/operations/update.sh"
else
    echo "Error: Update operations module 'operations/update.sh' not found in Scripts/shell/"
    exit 1
fi

if [ -f "$SHELL_DIR/operations/uninstall.sh" ]; then
    source "$SHELL_DIR/operations/uninstall.sh"
else
    echo "Error: Uninstall operations module 'operations/uninstall.sh' not found in Scripts/shell/"
    exit 1
fi

# Legacy run_requirements_check function removed - it created circular dependencies
# Use check_system_requirements directly from requirements.sh instead

# Main execution logic
main() {
    # Parse arguments
    parse_args "$@"
    
    # Show header
    show_header
    
    # Handle uninstall mode
    if [ "$UNINSTALL_MODE" = true ]; then
        run_uninstaller
        return $?
    fi
    
    # Handle update mode
    if [ "$UPDATE_MODE" = true ]; then
        run_updater
        return $?
    fi
    
    # Run comprehensive shell-based requirements check (unless skipped)
    if [ "$SKIP_CHECKS" = false ]; then
        if ! check_system_requirements; then
            echo
            log_error "System requirements not met."
            echo "You can skip checks with --skip-checks, but this is not recommended."
            echo "Please install missing requirements and run this script again."
            return 1
        fi
    else
        log_warning "Skipping system requirement checks (not recommended)"
    fi
    
    # Run main installation
    if run_main_installer "$INSTALLATION_TYPE"; then
        show_installation_success
        return 0
    else
        show_installation_failure
        return 1
    fi
}


# Run main function with all arguments
main "$@"