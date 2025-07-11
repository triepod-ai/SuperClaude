#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Interactive Installation Entry Point
# 
# This script provides a unified entry point for SuperClaude installation,
# using a modular system with Python-based orchestration and interactive menus.
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
readonly VERSION="3.0.0"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" >&2
}

# Display header
show_header() {
    echo -e "\n${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}      SuperClaude Framework v${VERSION} - Installation      ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}\n"
}

# Display help
show_help() {
    cat << EOF
SuperClaude Framework v${VERSION} - Modular Installation Script

DESCRIPTION:
    Interactive installer for SuperClaude Framework with modular component
    selection and comprehensive requirements checking.

USAGE:
    ./install.sh [OPTIONS]

OPTIONS:
    --skip-checks      Skip system requirement checks (not recommended)
    --standard         Standard installation (copy files to ~/.claude/)
    --development      Development installation (symlinks for live development)
    --update           Update existing installation
    --uninstall        Remove SuperClaude installation
    --help             Show this help message

INSTALLATION FLOW:
    1. Requirements Check    - Validates system dependencies
    2. Interactive Menu     - Choose installation type and components
    3. Component Selection  - Core, Hooks, Commands, MCP Servers
    4. Installation         - Modular installation with progress tracking
    5. Validation          - Post-install testing and verification

COMPONENTS:
    Core Framework      - Essential SuperClaude files and configuration
    Hook System         - Event-driven enhancement with 15 specialized hooks
    Commands Suite      - Enhanced slash commands with wave support
    MCP Servers         - Sequential, Context7, Magic, Playwright, Puppeteer

EXAMPLES:
    ./install.sh                    # Interactive installation
    ./install.sh --standard         # Standard installation (non-interactive)
    ./install.sh --development      # Development installation with symlinks
    ./install.sh --update           # Update existing installation

For more information: https://github.com/NomenAK/SuperClaude
EOF
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Basic Python availability check (minimal requirement for running the installers)
check_basic_python() {
    log_info "Checking basic Python availability..."
    
    if ! command_exists python3; then
        log_error "Python 3 is not installed"
        echo
        echo "SuperClaude requires Python 3.12+ to run the installation system."
        echo
        echo "Please install Python first:"
        echo "  • Ubuntu/Debian: sudo apt update && sudo apt install python3"
        echo "  • macOS: brew install python"
        echo "  • Windows: Download from https://python.org"
        echo "  • Official: https://www.python.org/downloads/"
        echo
        return 1
    fi
    
    # Try to get Python version
    local python_version
    python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))' 2>/dev/null || echo "unknown")
    
    if [ "$python_version" != "unknown" ]; then
        log_success "Python $python_version found"
    else
        log_warning "Python 3 found but version could not be determined"
    fi
    
    return 0
}

# Run requirements check using Python script
run_requirements_check() {
    log_info "Running comprehensive requirements check..."
    
    local requirements_script="$PROJECT_DIR/Scripts/requirements/check_requirements.py"
    
    if [ ! -f "$requirements_script" ]; then
        log_error "Requirements checker not found: $requirements_script"
        return 1
    fi
    
    # Run Python requirements checker
    if python3 "$requirements_script" --project-dir "$PROJECT_DIR"; then
        log_success "Requirements check passed"
        return 0
    else
        log_error "Requirements check failed"
        return 1
    fi
}

# Run the main Python installation orchestrator
run_main_installer() {
    local installation_type="$1"
    
    log_info "Starting SuperClaude installation orchestrator..."
    
    local main_script="$PROJECT_DIR/Scripts/main.py"
    
    if [ ! -f "$main_script" ]; then
        log_error "Main installer not found: $main_script"
        return 1
    fi
    
    # Prepare arguments for main installer
    local args=("--project-dir" "$PROJECT_DIR")
    
    if [ -n "$installation_type" ]; then
        args+=("--installation-type" "$installation_type")
    fi
    
    # Run main Python installer
    if python3 "$main_script" "${args[@]}"; then
        log_success "Installation completed successfully"
        return 0
    else
        log_error "Installation failed"
        return 1
    fi
}

# Uninstall SuperClaude
run_uninstaller() {
    log_info "Starting SuperClaude uninstallation..."
    
    echo "This will remove SuperClaude Framework from your system."
    echo
    echo "The following will be removed:"
    echo "  • $CLAUDE_GLOBAL_DIR (all framework files)"
    echo "  • MCP server registrations"
    echo "  • Environment configurations"
    echo
    
    read -p "Are you sure you want to continue? [y/N]: " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Uninstallation cancelled"
        return 0
    fi
    
    # Remove Claude directory
    if [ -d "$CLAUDE_GLOBAL_DIR" ]; then
        log_info "Removing $CLAUDE_GLOBAL_DIR..."
        rm -rf "$CLAUDE_GLOBAL_DIR"
        log_success "SuperClaude files removed"
    else
        log_warning "SuperClaude directory not found: $CLAUDE_GLOBAL_DIR"
    fi
    
    # Try to remove MCP servers
    if command_exists claude; then
        log_info "Removing MCP server registrations..."
        
        # List of MCP servers to remove
        local servers=("sequential" "context7" "magic" "playwright" "puppeteer")
        
        for server in "${servers[@]}"; do
            if claude mcp list -s user 2>/dev/null | grep -q "^$server\\s"; then
                log_info "Removing MCP server: $server"
                claude mcp remove "$server" -s user 2>/dev/null || true
            fi
        done
        
        log_success "MCP server cleanup completed"
    else
        log_warning "Claude CLI not available - MCP servers not removed"
    fi
    
    log_success "SuperClaude Framework uninstalled successfully"
    
    echo
    echo "Manual cleanup (if needed):"
    echo "  • Check shell profile for SuperClaude environment variables"
    echo "  • Remove any custom aliases or functions"
    echo
    
    return 0
}

# Update existing installation
run_updater() {
    log_info "Starting SuperClaude update..."
    
    # Check if SuperClaude is currently installed
    if [ ! -f "$CLAUDE_GLOBAL_DIR/settings.json" ]; then
        log_error "SuperClaude not found - cannot update"
        log_info "Run './install.sh' for fresh installation"
        return 1
    fi
    
    # Backup current installation
    local backup_dir="$CLAUDE_GLOBAL_DIR/backup_$(date +%Y%m%d_%H%M%S)"
    log_info "Creating backup: $backup_dir"
    
    mkdir -p "$backup_dir"
    cp -r "$CLAUDE_GLOBAL_DIR"/* "$backup_dir/" 2>/dev/null || true
    
    log_success "Backup created: $backup_dir"
    
    # Run installer in update mode
    # For updates, we preserve the existing installation type
    local existing_type="standard"
    
    # Try to detect existing installation type
    if [ -L "$CLAUDE_GLOBAL_DIR/CLAUDE.md" ]; then
        existing_type="development"
        log_info "Detected development installation (symlinks)"
    else
        log_info "Detected standard installation (copied files)"
    fi
    
    # Run the main installer
    if run_main_installer "$existing_type"; then
        log_success "Update completed successfully"
        log_info "Backup preserved at: $backup_dir"
        return 0
    else
        log_error "Update failed"
        log_info "Your original installation is backed up at: $backup_dir"
        return 1
    fi
}

# Parse command line arguments
parse_args() {
    SKIP_CHECKS=false
    INSTALLATION_TYPE=""
    UPDATE_MODE=false
    UNINSTALL_MODE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-checks)
                SKIP_CHECKS=true
                shift
                ;;
            --standard)
                INSTALLATION_TYPE="standard"
                shift
                ;;
            --development|--dev)
                INSTALLATION_TYPE="development"
                shift
                ;;
            --update)
                UPDATE_MODE=true
                shift
                ;;
            --uninstall)
                UNINSTALL_MODE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo
                show_help
                exit 1
                ;;
        esac
    done
}

# Main execution
main() {
    # Parse arguments
    parse_args "$@"
    
    # Show header
    show_header
    
    # Handle uninstall
    if [ "$UNINSTALL_MODE" = true ]; then
        run_uninstaller
        return $?
    fi
    
    # Handle update
    if [ "$UPDATE_MODE" = true ]; then
        run_updater
        return $?
    fi
    
    # Check basic Python availability first
    if ! check_basic_python; then
        echo "Installation cannot continue without Python."
        echo "Please install Python 3.12+ and run this script again."
        return 1
    fi
    
    # Run requirements check (unless skipped)
    if [ "$SKIP_CHECKS" = false ]; then
        if ! run_requirements_check; then
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
        echo
        log_success "🎉 SuperClaude Framework v${VERSION} installation complete!"
        echo
        echo "Next steps:"
        echo "  1. Restart your terminal or run: source ~/.bashrc"
        echo "  2. Verify installation: claude config list"
        echo "  3. Test SuperClaude: /analyze --help"
        echo "  4. Read documentation: ~/.claude/CLAUDE.md"
        echo
        return 0
    else
        echo
        log_error "Installation failed. Please check the error messages above."
        echo
        echo "For help:"
        echo "  • Check installation logs"
        echo "  • Ensure all requirements are met"
        echo "  • Try running with --skip-checks if necessary"
        echo "  • Report issues at: https://github.com/NomenAK/SuperClaude/issues"
        echo
        return 1
    fi
}

# Run main function with all arguments
main "$@"