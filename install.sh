#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Installation Entry Point
# 
# This script checks system requirements and guides users through
# the SuperClaude installation process.
#
# Usage: ./install.sh [options]
# Options:
#   --skip-checks    Skip requirement checks (not recommended)
#   --dev            Install in development mode
#   --update         Update existing installation
#   --uninstall      Remove SuperClaude installation
#   --help           Show this help message

set -euo pipefail

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="$SCRIPT_DIR"
readonly CLAUDE_GLOBAL_DIR="$HOME/.claude"
readonly MIN_PYTHON_VERSION="3.12"
readonly MIN_NODE_VERSION="18"
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
SuperClaude Framework v${VERSION} - Installation Script

USAGE:
    ./install.sh [OPTIONS]

OPTIONS:
    --skip-checks    Skip system requirement checks (not recommended)
    --dev            Install in development mode (symlinks instead of copies)
    --update         Update existing SuperClaude installation
    --uninstall      Remove SuperClaude installation
    --help           Show this help message

EXAMPLES:
    ./install.sh                 # Standard installation
    ./install.sh --update        # Update existing installation
    ./install.sh --dev           # Development installation with symlinks

For more information, visit: https://github.com/yourusername/SuperClaude
EOF
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Compare version numbers
version_ge() {
    # Returns 0 if version $1 >= version $2
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

# Check Python version
check_python() {
    log_info "Checking Python installation..."
    
    if ! command_exists python3; then
        log_error "Python 3 is not installed"
        log_info "Please install Python ${MIN_PYTHON_VERSION} or higher"
        log_info "Visit: https://www.python.org/downloads/"
        return 1
    fi
    
    local python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    
    if ! version_ge "$python_version" "$MIN_PYTHON_VERSION"; then
        log_error "Python ${python_version} found, but ${MIN_PYTHON_VERSION}+ is required"
        log_info "Please upgrade Python to ${MIN_PYTHON_VERSION} or higher"
        return 1
    fi
    
    log_success "Python ${python_version} found"
    
    # Check Python standard library modules
    local modules=("json" "sys" "time" "threading" "pathlib" "logging" "asyncio" "os" "subprocess" "re" "typing")
    local missing_modules=()
    
    for module in "${modules[@]}"; do
        if ! python3 -c "import $module" 2>/dev/null; then
            missing_modules+=("$module")
        fi
    done
    
    if [ ${#missing_modules[@]} -ne 0 ]; then
        log_error "Missing Python standard library modules: ${missing_modules[*]}"
        log_info "Your Python installation may be incomplete"
        return 1
    fi
    
    log_success "All required Python modules available"
    return 0
}

# Check Node.js version
check_nodejs() {
    log_info "Checking Node.js installation..."
    
    if ! command_exists node; then
        log_error "Node.js is not installed"
        log_info "Please install Node.js ${MIN_NODE_VERSION} or higher"
        log_info "Visit: https://nodejs.org/"
        return 1
    fi
    
    local node_version=$(node -v | sed 's/v//')
    local major_version=$(echo "$node_version" | cut -d. -f1)
    
    if [ "$major_version" -lt "$MIN_NODE_VERSION" ]; then
        log_error "Node.js ${node_version} found, but ${MIN_NODE_VERSION}+ is required"
        log_info "Please upgrade Node.js to ${MIN_NODE_VERSION} or higher"
        return 1
    fi
    
    log_success "Node.js ${node_version} found"
    
    # Check npx
    if ! command_exists npx; then
        log_error "npx is not available"
        log_info "npx should come with Node.js ${MIN_NODE_VERSION}+"
        return 1
    fi
    
    log_success "npx is available"
    return 0
}

# Check Claude Code installation
check_claude_code() {
    log_info "Checking Claude Code installation..."
    
    if ! command_exists claude; then
        log_error "Claude Code is not installed or not in PATH"
        log_info "Please install Claude Code first"
        log_info "Visit: https://docs.anthropic.com/claude-code/installation"
        return 1
    fi
    
    log_success "Claude Code is installed"
    
    # Check if Claude Code is authenticated
    if ! claude --version >/dev/null 2>&1; then
        log_warning "Claude Code may not be properly authenticated"
        log_info "Run 'claude login' to authenticate"
    fi
    
    return 0
}

# Check file system permissions
check_permissions() {
    log_info "Checking file system permissions..."
    
    # Check if we can create directories in home
    if ! mkdir -p "$CLAUDE_GLOBAL_DIR/test_permissions" 2>/dev/null; then
        log_error "Cannot create directories in $CLAUDE_GLOBAL_DIR"
        log_info "Please check your home directory permissions"
        return 1
    fi
    
    # Clean up test directory
    rmdir "$CLAUDE_GLOBAL_DIR/test_permissions" 2>/dev/null || true
    
    log_success "File system permissions OK"
    return 0
}

# Check all requirements
check_requirements() {
    local errors=0
    
    echo -e "\n${BLUE}=== System Requirements Check ===${NC}\n"
    
    check_python || ((errors++))
    check_nodejs || ((errors++))
    check_claude_code || ((errors++))
    check_permissions || ((errors++))
    
    echo ""
    
    if [ $errors -eq 0 ]; then
        log_success "All system requirements met!"
        return 0
    else
        log_error "System requirements not met. Please fix the issues above."
        return 1
    fi
}

# Check for existing installation
check_existing_installation() {
    if [ -f "$CLAUDE_GLOBAL_DIR/settings.json" ] || [ -d "$CLAUDE_GLOBAL_DIR/hooks" ]; then
        log_warning "Existing SuperClaude installation detected"
        echo -e "\nOptions:"
        echo "  1) Update existing installation"
        echo "  2) Clean install (backup existing)"
        echo "  3) Cancel"
        echo -n "Choose an option [1-3]: "
        read -r choice
        
        case $choice in
            1) return 1 ;;  # Update
            2) backup_existing_installation ;;
            3) log_info "Installation cancelled"; exit 0 ;;
            *) log_error "Invalid choice"; exit 1 ;;
        esac
    fi
    return 0
}

# Backup existing installation
backup_existing_installation() {
    local backup_dir="$CLAUDE_GLOBAL_DIR/backup_$(date +%Y%m%d_%H%M%S)"
    log_info "Backing up existing installation to $backup_dir"
    
    mkdir -p "$backup_dir"
    
    [ -f "$CLAUDE_GLOBAL_DIR/settings.json" ] && cp "$CLAUDE_GLOBAL_DIR/settings.json" "$backup_dir/"
    [ -d "$CLAUDE_GLOBAL_DIR/hooks" ] && cp -r "$CLAUDE_GLOBAL_DIR/hooks" "$backup_dir/"
    
    log_success "Backup completed"
}

# Main installation function
run_installation() {
    log_info "Starting SuperClaude installation..."
    
    # Run Python installation script
    if [ -f "$PROJECT_DIR/Scripts/install_core.py" ]; then
        python3 "$PROJECT_DIR/Scripts/install_core.py" "$@"
    else
        # Fallback to bash script if Python script doesn't exist yet
        bash "$PROJECT_DIR/Scripts/install_global_settings.sh"
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-checks)
                SKIP_CHECKS=true
                shift
                ;;
            --dev)
                DEV_MODE=true
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
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Main execution
main() {
    # Initialize variables
    SKIP_CHECKS=false
    DEV_MODE=false
    UPDATE_MODE=false
    UNINSTALL_MODE=false
    
    # Parse arguments
    parse_args "$@"
    
    # Show header
    show_header
    
    # Handle uninstall
    if [ "$UNINSTALL_MODE" = true ]; then
        log_info "Uninstalling SuperClaude..."
        # TODO: Implement uninstall logic
        log_error "Uninstall not yet implemented"
        exit 1
    fi
    
    # Check requirements unless skipped
    if [ "$SKIP_CHECKS" = false ]; then
        if ! check_requirements; then
            echo -e "\nInstallation cannot continue without meeting system requirements."
            echo "You can skip checks with --skip-checks, but this is not recommended."
            exit 1
        fi
    else
        log_warning "Skipping system requirement checks (not recommended)"
    fi
    
    # Check for existing installation
    if [ "$UPDATE_MODE" = false ]; then
        check_existing_installation
    fi
    
    # Run installation
    run_installation
    
    # Post-installation steps
    echo -e "\n${BLUE}=== Post-Installation Steps ===${NC}\n"
    log_info "1. Restart your terminal or run: source ~/.bashrc"
    log_info "2. Verify installation: claude config list"
    log_info "3. Test a SuperClaude command: /analyze --help"
    
    log_success "Installation completed successfully!"
}

# Run main function
main "$@"