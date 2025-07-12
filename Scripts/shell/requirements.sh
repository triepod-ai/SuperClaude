#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Requirements Checking Module
#
# Provides comprehensive system requirements checking and validation
# using configuration-driven approach.
#

# Prevent multiple sourcing
if [[ "${SUPERCLAUDE_REQUIREMENTS_LOADED:-}" == "true" ]]; then
    return 0
fi
readonly SUPERCLAUDE_REQUIREMENTS_LOADED="true"

# Source dependencies
REQ_SHELL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$REQ_SHELL_DIR/common.sh"
source "$REQ_SHELL_DIR/os-detection.sh"

# Configuration file path
readonly REQUIREMENTS_CONFIG="$REQ_SHELL_DIR/config/requirements.yml"

# Parse YAML configuration (simple bash implementation)
parse_yaml_config() {
    local config_file="$1"
    
    # If YAML file exists, try to parse it
    if [ -f "$config_file" ]; then
        # Simple YAML parser for specific keys
        # Extract min_version values from the YAML file
        PYTHON_MIN_VERSION=$(grep -A2 "^  python:" "$config_file" | grep "min_version:" | awk '{print $2}' | tr -d '"')
        NODE_MIN_VERSION=$(grep -A2 "^  node:" "$config_file" | grep "min_version:" | awk '{print $2}' | tr -d '"')
        NPM_MIN_VERSION=$(grep -A2 "^  npm:" "$config_file" | grep "min_version:" | awk '{print $2}' | tr -d '"')
        GIT_MIN_VERSION=$(grep -A2 "^  git:" "$config_file" | grep "min_version:" | awk '{print $2}' | tr -d '"')
    fi
    
    # Use hardcoded defaults if parsing fails or file is missing
    # These are the minimum versions required by SuperClaude v3.0
    export PYTHON_MIN_VERSION="${PYTHON_MIN_VERSION:-3.12}"
    export NODE_MIN_VERSION="${NODE_MIN_VERSION:-18.0}"
    export NPM_MIN_VERSION="${NPM_MIN_VERSION:-6.0}"
    export GIT_MIN_VERSION="${GIT_MIN_VERSION:-2.0}"
    
    # Log whether we're using YAML or defaults
    if [ -f "$config_file" ] && [ -n "$PYTHON_MIN_VERSION" ]; then
        log_info "Loaded requirements from YAML configuration"
    else
        log_info "Using default requirement versions (YAML not found or parsing failed)"
    fi
    
    return 0
}

# Check individual requirement
check_requirement() {
    local req_name="$1"
    local command_name="$2"
    local min_version="$3"
    local version_pattern="$4"
    local required="$5"
    
    log_info "Checking $req_name availability..."
    
    if ! command_exists "$command_name"; then
        if [ "$required" = "true" ]; then
            log_error "$req_name not found"
            return 1
        else
            log_warning "$req_name not found (optional)"
            return 0
        fi
    fi
    
    # Get version
    local version_output
    case "$command_name" in
        "python3")
            version_output=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))' 2>/dev/null || python3 --version 2>&1)
            ;;
        *)
            version_output=$($command_name --version 2>&1 || echo "unknown")
            ;;
    esac
    
    if [ "$version_output" = "unknown" ]; then
        if [ "$required" = "true" ]; then
            log_warning "$req_name found but version could not be determined"
            return 1
        else
            log_warning "$req_name found but version could not be determined (optional)"
            return 0
        fi
    fi
    
    # Extract version using pattern or default
    local actual_version
    if [ -n "$version_pattern" ]; then
        actual_version=$(echo "$version_output" | grep -oE "$version_pattern" | head -1)
    else
        actual_version=$(extract_version "$version_output")
    fi
    
    if [ -z "$actual_version" ]; then
        if [ "$required" = "true" ]; then
            log_warning "$req_name found but version could not be parsed"
            return 1
        else
            log_success "$req_name found ✓"
            return 0
        fi
    fi
    
    # Compare versions
    if version_compare "$actual_version" "$min_version"; then
        log_success "$req_name $actual_version found ✓"
        return 0
    else
        if [ "$required" = "true" ]; then
            log_warning "$req_name $actual_version found, but $min_version+ required"
            return 1
        else
            log_warning "$req_name $actual_version found, but $min_version+ recommended (optional)"
            return 0
        fi
    fi
}

# Show installation instructions for missing requirements
show_installation_instructions() {
    local missing_req="$1"
    local os_type="$2"
    
    echo
    log_error "$missing_req is not installed or version requirement not met"
    echo
    echo "Installation instructions for $missing_req:"
    echo
    
    case "$missing_req" in
        "Python 3.12+")
            show_python_instructions "$os_type"
            ;;
        "Node.js 18+")
            show_node_instructions "$os_type"
            ;;
        "npm")
            show_npm_instructions "$os_type"
            ;;
        "Git")
            show_git_instructions "$os_type"
            ;;
    esac
    echo
}

# Python installation instructions
show_python_instructions() {
    local os_type="$1"
    
    case "$os_type" in
        "debian"|"wsl")
            echo "  Ubuntu/Debian/WSL:"
            echo "    sudo apt update"
            echo "    sudo apt install python3.12 python3.12-venv python3.12-pip"
            echo "    # Or install from deadsnakes PPA for older Ubuntu:"
            echo "    sudo add-apt-repository ppa:deadsnakes/ppa"
            echo "    sudo apt update && sudo apt install python3.12"
            ;;
        "redhat")
            echo "  RHEL/CentOS/Fedora:"
            echo "    # Fedora:"
            echo "    sudo dnf install python3.12"
            echo "    # RHEL/CentOS (enable EPEL):"
            echo "    sudo yum install epel-release"
            echo "    sudo yum install python312"
            ;;
        "arch")
            echo "  Arch Linux:"
            echo "    sudo pacman -S python"
            ;;
        "macos")
            echo "  macOS:"
            echo "    # Using Homebrew (recommended):"
            echo "    brew install python@3.12"
            echo "    # Or download from python.org"
            ;;
        "windows")
            echo "  Windows:"
            echo "    # Download from https://www.python.org/downloads/"
            echo "    # Or use winget:"
            echo "    winget install Python.Python.3.12"
            ;;
        *)
            echo "  General:"
            echo "    Download from: https://www.python.org/downloads/"
            ;;
    esac
}

# Node.js installation instructions
show_node_instructions() {
    local os_type="$1"
    
    case "$os_type" in
        "debian"|"wsl")
            echo "  Ubuntu/Debian/WSL:"
            echo "    # Using NodeSource repository:"
            echo "    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
            echo "    sudo apt-get install -y nodejs"
            echo "    # Or using snap:"
            echo "    sudo snap install node --classic"
            ;;
        "redhat")
            echo "  RHEL/CentOS/Fedora:"
            echo "    # Using NodeSource repository:"
            echo "    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -"
            echo "    sudo yum install -y nodejs npm"
            ;;
        "arch")
            echo "  Arch Linux:"
            echo "    sudo pacman -S nodejs npm"
            ;;
        "macos")
            echo "  macOS:"
            echo "    # Using Homebrew:"
            echo "    brew install node@18"
            echo "    # Or download from nodejs.org"
            ;;
        "windows")
            echo "  Windows:"
            echo "    # Download from https://nodejs.org/"
            echo "    # Or use winget:"
            echo "    winget install OpenJS.NodeJS"
            ;;
        *)
            echo "  General:"
            echo "    Download from: https://nodejs.org/"
            ;;
    esac
}

# npm installation instructions
show_npm_instructions() {
    local os_type="$1"
    
    echo "  npm is typically installed with Node.js"
    echo "  If Node.js is installed but npm is missing:"
    case "$os_type" in
        "debian"|"wsl")
            echo "    sudo apt install npm"
            ;;
        "redhat")
            echo "    sudo yum install npm"
            ;;
        "arch")
            echo "    sudo pacman -S npm"
            ;;
        "macos")
            echo "    # Reinstall Node.js which includes npm"
            echo "    brew reinstall node"
            ;;
        *)
            echo "    # Reinstall Node.js from nodejs.org"
            ;;
    esac
}

# Git installation instructions
show_git_instructions() {
    local os_type="$1"
    
    case "$os_type" in
        "debian"|"wsl")
            echo "  Ubuntu/Debian/WSL:"
            echo "    sudo apt update && sudo apt install git"
            ;;
        "redhat")
            echo "  RHEL/CentOS/Fedora:"
            echo "    sudo yum install git"
            ;;
        "arch")
            echo "  Arch Linux:"
            echo "    sudo pacman -S git"
            ;;
        "macos")
            echo "  macOS:"
            echo "    # Usually pre-installed with Xcode Command Line Tools"
            echo "    xcode-select --install"
            echo "    # Or using Homebrew:"
            echo "    brew install git"
            ;;
        "windows")
            echo "  Windows:"
            echo "    # Download from https://git-scm.com/download/win"
            echo "    # Or use winget:"
            echo "    winget install Git.Git"
            ;;
        *)
            echo "  General:"
            echo "    Download from: https://git-scm.com/"
            ;;
    esac
}

# Main requirements checking function
check_system_requirements() {
    log_info "Performing comprehensive system requirements check..."
    
    # Parse configuration
    if ! parse_yaml_config "$REQUIREMENTS_CONFIG"; then
        log_error "Failed to load requirements configuration"
        return 1
    fi
    
    local os_type
    os_type=$(detect_os)
    log_info "Detected OS: $(get_os_display_name "$os_type")"
    
    local requirements_met=true
    local missing_requirements=()
    
    # Check Python 3.12+
    if ! check_requirement "Python 3.12+" "python3" "$PYTHON_MIN_VERSION" '[0-9]+\.[0-9]+' "true"; then
        requirements_met=false
        missing_requirements+=("Python 3.12+")
    fi
    
    # Check Node.js 18+
    if ! check_requirement "Node.js 18+" "node" "$NODE_MIN_VERSION" '[0-9]+\.[0-9]+' "true"; then
        requirements_met=false
        missing_requirements+=("Node.js 18+")
    fi
    
    # Check npm
    if ! check_requirement "npm" "npm" "$NPM_MIN_VERSION" '[0-9]+\.[0-9]+' "true"; then
        requirements_met=false
        missing_requirements+=("npm")
    fi
    
    # Check Git
    if ! check_requirement "Git" "git" "$GIT_MIN_VERSION" '[0-9]+\.[0-9]+' "true"; then
        requirements_met=false
        missing_requirements+=("Git")
    fi
    
    # Check Claude CLI (optional)
    check_requirement "Claude CLI" "claude" "0.1" '[0-9]+\.[0-9]+' "false"
    
    # Check environment
    check_disk_space
    check_internet
    
    # Summary
    echo
    if [ "$requirements_met" = true ]; then
        log_success "All system requirements verified ✓"
        return 0
    else
        log_error "Missing requirements detected:"
        for req in "${missing_requirements[@]}"; do
            show_installation_instructions "$req" "$os_type"
        done
        
        echo "Please install the missing requirements and run this script again."
        echo "You can skip this check with --skip-checks, but installation may fail."
        return 1
    fi
}