#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Installation Operations Module
#
# Handles the main installation logic and coordination with Python orchestrator.
#

# Prevent multiple sourcing
if [[ "${SUPERCLAUDE_INSTALL_OPS_LOADED:-}" == "true" ]]; then
    return 0
fi
readonly SUPERCLAUDE_INSTALL_OPS_LOADED="true"

# Run the main Python installation orchestrator
run_main_installer() {
    local installation_type="$1"
    
    log_info "Starting SuperClaude installation orchestrator..."
    
    local main_script="$PROJECT_DIR/Scripts/main.py"
    
    # Validate Python script exists
    if [ ! -f "$main_script" ]; then
        log_error "Main installer not found: $main_script"
        log_error "Please ensure the SuperClaude Scripts directory is complete."
        return 1
    fi
    
    # Validate Python script is readable
    if [ ! -r "$main_script" ]; then
        log_error "Main installer is not readable: $main_script"
        log_error "Please check file permissions."
        return 1
    fi
    
    # Verify Python 3 is available (redundant check for safety)
    if ! command -v python3 >/dev/null 2>&1; then
        log_error "Python 3 is not available. Please install Python 3.12 or later."
        return 1
    fi
    
    # Prepare arguments for main installer
    local args=("--project-dir" "$PROJECT_DIR")
    
    if [ -n "$installation_type" ]; then
        args+=("--installation-type" "$installation_type")
    fi
    
    # Run main Python installer with proper error handling
    log_info "Executing: python3 \"$main_script\" ${args[*]}"
    if python3 "$main_script" "${args[@]}"; then
        log_success "Installation completed successfully"
        return 0
    else
        local exit_code=$?
        log_error "Installation failed with exit code: $exit_code"
        
        # Provide helpful error messages based on common exit codes
        case $exit_code in
            1)
                log_error "General error occurred during installation"
                ;;
            2)
                log_error "Missing required files or dependencies"
                ;;
            126)
                log_error "Permission denied - check file permissions"
                ;;
            127)
                log_error "Command not found - verify Python installation"
                ;;
            *)
                log_error "Unexpected error code: $exit_code"
                ;;
        esac
        
        return $exit_code
    fi
}

# Show post-installation success message
show_installation_success() {
    echo
    log_success "🎉 SuperClaude Framework v${SUPERCLAUDE_VERSION} installation complete!"
    echo
    echo "Next steps:"
    echo "  1. Restart your terminal or run: source ~/.bashrc"
    echo "  2. Verify installation: claude config list"
    echo "  3. Test SuperClaude: /analyze --help"
    echo "  4. Read documentation: ~/.claude/CLAUDE.md"
    echo
}

# Show installation failure message
show_installation_failure() {
    echo
    log_error "Installation failed. Please check the error messages above."
    echo
    echo "For help:"
    echo "  • Check installation logs"
    echo "  • Ensure all requirements are met"
    echo "  • Try running with --skip-checks if necessary"
    echo "  • Report issues at: https://github.com/NomenAK/SuperClaude/issues"
    echo
}