#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Common Shell Utilities
#
# Provides logging, color support, and common utility functions
# for the SuperClaude installation system.
#

# Prevent multiple sourcing
if [[ "${SUPERCLAUDE_COMMON_LOADED:-}" == "true" ]]; then
    return 0
fi
readonly SUPERCLAUDE_COMMON_LOADED="true"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Version for reference
readonly SUPERCLAUDE_VERSION="3.0.0"

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
    echo -e "${BLUE}║${NC}      SuperClaude Framework v${SUPERCLAUDE_VERSION} - Installation      ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}\n"
}

# Display help
show_help() {
    cat << EOF
SuperClaude Framework v${SUPERCLAUDE_VERSION} - Modular Installation Script

DESCRIPTION:
    Interactive installer for SuperClaude Framework with modular component
    selection and comprehensive requirements checking.

USAGE:
    ./install.sh [OPTIONS]

OPTIONS:
    --skip-checks      Skip system requirement checks (not recommended)
                       ⚠️  WARNING: May lead to installation failures
                       Only use if you've verified requirements manually
    
    --standard         Standard installation (copy files to ~/.claude/)
                       • Copies files to global Claude Code directory
                       • Safe for production use
                       • No impact on SuperClaude development
    
    --development      Development installation (symlinks for live development)
                       • Creates symlinks to project directory
                       • Changes reflect immediately
                       • Ideal for SuperClaude contributors
    
    --update           Update existing installation
                       • Preserves existing configuration
                       • Updates framework files only
                       • Maintains custom settings
    
    --uninstall        Remove SuperClaude installation
                       • Removes all framework files
                       • Preserves user data and logs
                       • Creates backup before removal
    
    --help             Show this help message

INSTALLATION FLOW:
    1. Requirements Check    - Validates system dependencies (Python 3.12+, Node.js 18+)
    2. Interactive Menu     - Choose installation type and components
    3. Component Selection  - Core, Hooks, Commands, MCP Servers
    4. Installation         - Modular installation with progress tracking and ETA
    5. Validation          - Post-install testing and verification

COMPONENTS:
    Core Framework      - Essential SuperClaude files and configuration
                         Required for all installations
    
    Hook System         - Event-driven enhancement with 15 specialized hooks
                         Integrates with Claude Code's lifecycle events
    
    Commands Suite      - Enhanced slash commands with wave support
                         14 commands with intelligent routing
    
    MCP Servers         - Model Context Protocol server integration
                         • Sequential: Complex analysis and reasoning
                         • Context7: Library documentation lookup
                         • Magic: UI component generation
                         • Playwright: Browser automation and testing
                         • Puppeteer: Additional browser automation

INSTALLATION EXAMPLES:
    # Interactive installation with progress tracking
    ./install.sh
    
    # Quick standard installation (recommended for most users)
    ./install.sh --standard
    
    # Development setup with live updates
    ./install.sh --development
    
    # Update existing installation preserving settings
    ./install.sh --update
    
    # Emergency installation skipping checks (use with caution)
    ./install.sh --skip-checks --standard

TROUBLESHOOTING:
    Common Issues:
    
    1. Permission Denied Errors
       → Ensure you have write access to ~/.claude/
       → DO NOT use sudo unless absolutely necessary
       → Run: chmod -R u+rwX ~/.claude/
    
    2. Python Version Errors
       → SuperClaude requires Python 3.12 or later
       → Check: python --version
       → Install latest Python from python.org
    
    3. Network/Download Failures
       → Check internet connection
       → Verify firewall settings
       → Try again - installer has automatic retry logic
    
    4. MCP Server Installation Issues
       → Ensure Node.js 18+ is installed
       → Check: node --version && npm --version
       → Some servers require API keys (optional)
    
    5. Installation Appears Stuck
       → Installation shows progress with ETA
       → Large downloads may take several minutes
       → Check terminal for status updates

ERROR LOGS:
    Installation logs are saved to:
    ~/.superclaude/logs/install.log
    
    For support, please share relevant log sections along with:
    • Operating system and version
    • Python version
    • Error messages and context

SYSTEM REQUIREMENTS:
    • Python 3.12 or later
    • Node.js 18+ (for MCP servers)
    • 500MB disk space
    • Internet connection (for downloads)
    • Write access to ~/.claude/ directory

For more information: https://github.com/NomenAK/SuperClaude
Report issues: https://github.com/NomenAK/SuperClaude/issues
EOF
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Extract version from command output using shell parsing
extract_version() {
    local version_string="$1"
    local pattern="${2:-}"
    
    if [ -n "$pattern" ]; then
        echo "$version_string" | grep -oE "$pattern" | head -1
    else
        # Default pattern for common version formats
        echo "$version_string" | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1
    fi
}

# Compare version numbers (returns 0 if version1 >= version2)
version_compare() {
    local version1="$1"
    local version2="$2"
    
    # Handle empty version inputs
    if [ -z "$version1" ] || [ -z "$version2" ]; then
        return 1
    fi
    
    # Convert versions to comparable format
    local v1_major v1_minor v1_patch
    local v2_major v2_minor v2_patch
    
    IFS='.' read -r v1_major v1_minor v1_patch <<< "$version1"
    IFS='.' read -r v2_major v2_minor v2_patch <<< "$version2"
    
    # Default empty values to 0
    v1_major=${v1_major:-0}
    v1_minor=${v1_minor:-0}
    v1_patch=${v1_patch:-0}
    v2_major=${v2_major:-0}
    v2_minor=${v2_minor:-0}
    v2_patch=${v2_patch:-0}
    
    # Compare major version
    if [ "$v1_major" -gt "$v2_major" ]; then
        return 0
    elif [ "$v1_major" -lt "$v2_major" ]; then
        return 1
    fi
    
    # Compare minor version
    if [ "$v1_minor" -gt "$v2_minor" ]; then
        return 0
    elif [ "$v1_minor" -lt "$v2_minor" ]; then
        return 1
    fi
    
    # Compare patch version
    if [ "$v1_patch" -ge "$v2_patch" ]; then
        return 0
    else
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

# Check disk space (basic check)
check_disk_space() {
    log_info "Checking available disk space..."
    local available_space
    if command_exists df; then
        available_space=$(df -h "$HOME" 2>/dev/null | awk 'NR==2 {print $4}' || echo "unknown")
        if [ "$available_space" != "unknown" ]; then
            log_success "Available space: $available_space ✓"
        else
            log_warning "Could not determine available disk space"
        fi
    else
        log_warning "df command not available - cannot check disk space"
    fi
}

# Network timeout configuration
readonly NETWORK_TIMEOUT=10  # seconds for all network operations
readonly NETWORK_RETRY_COUNT=3  # number of retries for failed operations

# Download file with consistent timeout settings
download_file() {
    local url="$1"
    local output_file="$2"
    
    if command_exists curl; then
        curl -fsSL --max-time $NETWORK_TIMEOUT --connect-timeout 5 \
             --retry $NETWORK_RETRY_COUNT --retry-delay 2 \
             -o "$output_file" "$url"
    elif command_exists wget; then
        wget -q --timeout=$NETWORK_TIMEOUT --tries=$NETWORK_RETRY_COUNT \
             --wait=2 --retry-connrefused \
             -O "$output_file" "$url"
    else
        log_error "Neither curl nor wget available for download"
        return 1
    fi
}

# Check internet connectivity (basic check)
check_internet() {
    log_info "Checking internet connectivity..."
    if command_exists curl; then
        if curl -s --max-time $NETWORK_TIMEOUT --connect-timeout 5 --head https://www.google.com >/dev/null 2>&1; then
            log_success "Internet connectivity verified ✓"
        else
            log_warning "Internet connectivity check failed (may affect MCP server downloads)"
        fi
    elif command_exists wget; then
        if wget -q --timeout=$NETWORK_TIMEOUT --tries=$NETWORK_RETRY_COUNT --spider https://www.google.com >/dev/null 2>&1; then
            log_success "Internet connectivity verified ✓"
        else
            log_warning "Internet connectivity check failed (may affect MCP server downloads)"
        fi
    else
        log_warning "Cannot test internet connectivity (curl/wget not available)"
    fi
}