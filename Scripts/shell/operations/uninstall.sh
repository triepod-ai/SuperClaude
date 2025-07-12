#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Uninstall Operations Module
#
# Handles complete removal of SuperClaude installations.
#

# Prevent multiple sourcing
if [[ "${SUPERCLAUDE_UNINSTALL_OPS_LOADED:-}" == "true" ]]; then
    return 0
fi
readonly SUPERCLAUDE_UNINSTALL_OPS_LOADED="true"

# Source security utilities
if [ -f "$PROJECT_DIR/Scripts/shell/utils/security.sh" ]; then
    source "$PROJECT_DIR/Scripts/shell/utils/security.sh"
else
    log_error "Security utilities not found - cannot proceed safely"
    return 1
fi

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
    
    # Safely remove SuperClaude installation
    if [ -d "$CLAUDE_GLOBAL_DIR" ]; then
        if safe_remove_superclaude "$CLAUDE_GLOBAL_DIR"; then
            log_success "SuperClaude files removed safely"
        else
            log_error "Failed to safely remove SuperClaude files"
            return 1
        fi
    else
        log_warning "SuperClaude directory not found: $CLAUDE_GLOBAL_DIR"
    fi
    
    # Try to remove MCP servers
    if command_exists claude; then
        remove_mcp_servers
    else
        log_warning "Claude CLI not available - MCP servers not removed"
    fi
    
    log_success "SuperClaude Framework uninstalled successfully"
    
    show_manual_cleanup_instructions
    
    return 0
}

# Remove MCP server registrations
remove_mcp_servers() {
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
}

# Show manual cleanup instructions
show_manual_cleanup_instructions() {
    echo
    echo "Manual cleanup (if needed):"
    echo "  • Check shell profile for SuperClaude environment variables"
    echo "  • Remove any custom aliases or functions"
    echo
}

# Create uninstallation backup
create_uninstall_backup() {
    if ! validate_superclaude_directory "$CLAUDE_GLOBAL_DIR"; then
        log_warning "No valid SuperClaude installation found to backup"
        return 0
    fi
    
    local backup_dir="$CLAUDE_GLOBAL_DIR/uninstall_backup_$(date +%Y%m%d_%H%M%S)"
    create_secure_backup "$CLAUDE_GLOBAL_DIR" "$backup_dir"
}

# Selective uninstall (remove specific components)
selective_uninstall() {
    local component="$1"
    
    # Validate directory before any removal
    if ! validate_superclaude_directory "$CLAUDE_GLOBAL_DIR"; then
        log_error "Cannot perform selective uninstall - invalid SuperClaude directory"
        return 1
    fi
    
    case "$component" in
        "hooks")
            log_info "Removing hooks system..."
            if [ -d "$CLAUDE_GLOBAL_DIR/SuperClaude/Hooks" ]; then
                rm -rf "$CLAUDE_GLOBAL_DIR/SuperClaude/Hooks" || {
                    log_error "Failed to remove hooks system"
                    return 1
                }
            fi
            ;;
        "mcp")
            log_info "Removing MCP servers..."
            remove_mcp_servers
            if [ -d "$CLAUDE_GLOBAL_DIR/SuperClaude/MCP" ]; then
                rm -rf "$CLAUDE_GLOBAL_DIR/SuperClaude/MCP" || {
                    log_error "Failed to remove MCP directory"
                    return 1
                }
            fi
            ;;
        "commands")
            log_info "Removing commands system..."
            for file in "COMMANDS.md" "FLAGS.md"; do
                if [ -f "$CLAUDE_GLOBAL_DIR/$file" ]; then
                    rm -f "$CLAUDE_GLOBAL_DIR/$file" || {
                        log_error "Failed to remove: $file"
                        return 1
                    }
                fi
            done
            ;;
        "config")
            log_info "Removing configuration files..."
            local config_files=(
                "CLAUDE.md"
                "COMMANDS.md"
                "FLAGS.md"
                "PRINCIPLES.md"
                "RULES.md"
                "MCP.md"
                "PERSONAS.md"
                "ORCHESTRATOR.md"
                "MODES.md"
                "settings.json"
            )
            for file in "${config_files[@]}"; do
                if [ -f "$CLAUDE_GLOBAL_DIR/$file" ]; then
                    rm -f "$CLAUDE_GLOBAL_DIR/$file" || {
                        log_error "Failed to remove: $file"
                        return 1
                    }
                fi
            done
            ;;
        *)
            log_error "Unknown component: $component"
            return 1
            ;;
    esac
    
    log_success "Component '$component' removed safely"
    return 0
}

# Check what will be removed
preview_uninstall() {
    echo "Preview of items to be removed:"
    echo
    
    if [ -d "$CLAUDE_GLOBAL_DIR" ]; then
        echo "Files and directories in $CLAUDE_GLOBAL_DIR:"
        find "$CLAUDE_GLOBAL_DIR" -maxdepth 2 -type f -o -type d | head -20
        local total_items
        total_items=$(find "$CLAUDE_GLOBAL_DIR" -type f | wc -l)
        echo "  ... and $total_items total files"
    else
        echo "  No SuperClaude installation found"
    fi
    
    echo
    if command_exists claude; then
        echo "MCP servers registered:"
        local servers=("sequential" "context7" "magic" "playwright" "puppeteer")
        for server in "${servers[@]}"; do
            if claude mcp list -s user 2>/dev/null | grep -q "^$server\\s"; then
                echo "  • $server"
            fi
        done
    fi
    echo
}