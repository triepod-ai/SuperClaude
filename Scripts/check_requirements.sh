#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Requirements Checker
# 
# Modular script to check all system requirements
# Can be sourced by other scripts or run standalone

set -euo pipefail

# Version requirements
readonly MIN_PYTHON_VERSION="3.12"
readonly MIN_NODE_VERSION="18"
readonly MIN_BASH_VERSION="4.0"

# Color codes (only if running in terminal)
if [ -t 1 ]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly BLUE='\033[0;34m'
    readonly NC='\033[0m'
else
    readonly RED=''
    readonly GREEN=''
    readonly YELLOW=''
    readonly BLUE=''
    readonly NC=''
fi

# Result tracking
declare -A REQUIREMENT_STATUS
declare -A REQUIREMENT_MESSAGES

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Compare version numbers
version_ge() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

# Extract major version
get_major_version() {
    echo "$1" | cut -d. -f1
}

# Check operating system
check_os() {
    local os_name=$(uname -s)
    local result=true
    local message=""
    
    case "$os_name" in
        Linux*)
            message="Linux detected"
            ;;
        Darwin*)
            message="macOS detected"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            message="Windows detected (bash environment)"
            ;;
        *)
            message="Unknown OS: $os_name"
            result=false
            ;;
    esac
    
    REQUIREMENT_STATUS["os"]=$result
    REQUIREMENT_MESSAGES["os"]=$message
    return $([ "$result" = true ] && echo 0 || echo 1)
}

# Check bash version
check_bash() {
    local bash_version="${BASH_VERSION%%.*}"
    local result=true
    local message=""
    
    if [ -z "$bash_version" ]; then
        result=false
        message="Cannot determine bash version"
    elif [ "$bash_version" -lt 4 ]; then
        result=false
        message="Bash $bash_version found, but 4.0+ required"
    else
        message="Bash ${BASH_VERSION} found"
    fi
    
    REQUIREMENT_STATUS["bash"]=$result
    REQUIREMENT_MESSAGES["bash"]=$message
    return $([ "$result" = true ] && echo 0 || echo 1)
}

# Check Python
check_python() {
    local result=true
    local message=""
    
    if ! command_exists python3; then
        result=false
        message="Python 3 not found"
    else
        local python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))' 2>/dev/null || echo "0.0")
        
        if ! version_ge "$python_version" "$MIN_PYTHON_VERSION"; then
            result=false
            message="Python $python_version found, but ${MIN_PYTHON_VERSION}+ required"
        else
            message="Python $python_version found"
            
            # Check standard library modules
            local modules=("json" "sys" "time" "threading" "pathlib" "logging" "asyncio" "os" "subprocess" "re" "typing")
            local missing=()
            
            for module in "${modules[@]}"; do
                if ! python3 -c "import $module" 2>/dev/null; then
                    missing+=("$module")
                fi
            done
            
            if [ ${#missing[@]} -ne 0 ]; then
                result=false
                message="Python $python_version found, but missing modules: ${missing[*]}"
            fi
        fi
    fi
    
    REQUIREMENT_STATUS["python"]=$result
    REQUIREMENT_MESSAGES["python"]=$message
    return $([ "$result" = true ] && echo 0 || echo 1)
}

# Check Node.js
check_nodejs() {
    local result=true
    local message=""
    
    if ! command_exists node; then
        result=false
        message="Node.js not found"
    else
        local node_version=$(node -v 2>/dev/null | sed 's/v//' || echo "0.0.0")
        local major_version=$(get_major_version "$node_version")
        
        if [ "$major_version" -lt "$MIN_NODE_VERSION" ]; then
            result=false
            message="Node.js $node_version found, but ${MIN_NODE_VERSION}+ required"
        else
            message="Node.js $node_version found"
            
            # Check npx
            if ! command_exists npx; then
                result=false
                message="Node.js $node_version found, but npx is missing"
            fi
        fi
    fi
    
    REQUIREMENT_STATUS["nodejs"]=$result
    REQUIREMENT_MESSAGES["nodejs"]=$message
    return $([ "$result" = true ] && echo 0 || echo 1)
}

# Check Claude Code
check_claude_code() {
    local result=true
    local message=""
    
    if ! command_exists claude; then
        result=false
        message="Claude Code not found in PATH"
    else
        # Try to get version (may require auth)
        if claude --version >/dev/null 2>&1; then
            local version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
            message="Claude Code $version found and authenticated"
        else
            # Claude exists but might not be authenticated
            message="Claude Code found (authentication may be required)"
        fi
    fi
    
    REQUIREMENT_STATUS["claude_code"]=$result
    REQUIREMENT_MESSAGES["claude_code"]=$message
    return $([ "$result" = true ] && echo 0 || echo 1)
}

# Check file permissions
check_permissions() {
    local result=true
    local message=""
    local test_dir="$HOME/.claude/test_permissions_$$"
    
    if mkdir -p "$test_dir" 2>/dev/null; then
        if touch "$test_dir/test_file" 2>/dev/null; then
            rm -rf "$test_dir"
            message="Home directory permissions OK"
        else
            rmdir "$test_dir" 2>/dev/null || true
            result=false
            message="Cannot create files in ~/.claude"
        fi
    else
        result=false
        message="Cannot create ~/.claude directory"
    fi
    
    REQUIREMENT_STATUS["permissions"]=$result
    REQUIREMENT_MESSAGES["permissions"]=$message
    return $([ "$result" = true ] && echo 0 || echo 1)
}

# Check git (optional)
check_git() {
    local result=true
    local message=""
    
    if command_exists git; then
        local git_version=$(git --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
        message="Git $git_version found (optional)"
    else
        message="Git not found (optional)"
        # Git is optional, so we don't set result to false
    fi
    
    REQUIREMENT_STATUS["git"]=$result
    REQUIREMENT_MESSAGES["git"]=$message
    return 0  # Always return success since git is optional
}

# Run all checks
run_all_checks() {
    local checks=(
        "os:Operating System"
        "bash:Bash Shell"
        "python:Python ${MIN_PYTHON_VERSION}+"
        "nodejs:Node.js ${MIN_NODE_VERSION}+"
        "claude_code:Claude Code"
        "permissions:File Permissions"
        "git:Git (Optional)"
    )
    
    local failed=0
    
    echo -e "${BLUE}Checking system requirements...${NC}\n"
    
    for check in "${checks[@]}"; do
        local key="${check%%:*}"
        local name="${check#*:}"
        
        printf "%-25s" "Checking $name..."
        
        if check_$key; then
            echo -e " ${GREEN}[✓]${NC} ${REQUIREMENT_MESSAGES[$key]}"
        else
            echo -e " ${RED}[✗]${NC} ${REQUIREMENT_MESSAGES[$key]}"
            [ "$key" != "git" ] && ((failed++))  # Don't count git as failure
        fi
    done
    
    echo ""
    return $failed
}

# Generate installation commands for missing requirements
generate_install_commands() {
    echo -e "${BLUE}Installation commands for missing requirements:${NC}\n"
    
    if [ "${REQUIREMENT_STATUS[python]}" = false ]; then
        echo "# Install Python ${MIN_PYTHON_VERSION}+"
        echo "# Ubuntu/Debian: sudo apt update && sudo apt install python3.12"
        echo "# macOS: brew install python@3.12"
        echo "# Windows: Download from https://www.python.org/downloads/"
        echo ""
    fi
    
    if [ "${REQUIREMENT_STATUS[nodejs]}" = false ]; then
        echo "# Install Node.js ${MIN_NODE_VERSION}+"
        echo "# Using Node Version Manager (recommended):"
        echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo "nvm install ${MIN_NODE_VERSION}"
        echo "# Or visit: https://nodejs.org/"
        echo ""
    fi
    
    if [ "${REQUIREMENT_STATUS[claude_code]}" = false ]; then
        echo "# Install Claude Code"
        echo "# Visit: https://docs.anthropic.com/claude-code/installation"
        echo "# After installation, run: claude login"
        echo ""
    fi
}

# Export results as JSON (for Python scripts)
export_json_results() {
    local json="{"
    local first=true
    
    for key in "${!REQUIREMENT_STATUS[@]}"; do
        [ "$first" = true ] && first=false || json+=","
        json+="\"$key\":{\"status\":${REQUIREMENT_STATUS[$key]},\"message\":\"${REQUIREMENT_MESSAGES[$key]}\"}"
    done
    
    json+="}"
    echo "$json"
}

# Main function when run standalone
main() {
    local failed=0
    
    if ! run_all_checks; then
        failed=$?
    fi
    
    if [ $failed -gt 0 ]; then
        echo -e "${RED}✗ $failed requirement(s) not met${NC}\n"
        generate_install_commands
        exit 1
    else
        echo -e "${GREEN}✓ All requirements met!${NC}"
        exit 0
    fi
}

# Run main only if executed directly (not sourced)
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Parse arguments
    case "${1:-}" in
        --json)
            run_all_checks >/dev/null 2>&1
            export_json_results
            ;;
        --help)
            echo "Usage: $0 [--json|--help]"
            echo "  --json    Output results as JSON"
            echo "  --help    Show this help message"
            ;;
        *)
            main
            ;;
    esac
fi