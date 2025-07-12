#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Update Operations Module
#
# Handles update operations for existing SuperClaude installations.
#

# Prevent multiple sourcing
if [[ "${SUPERCLAUDE_UPDATE_OPS_LOADED:-}" == "true" ]]; then
    return 0
fi
readonly SUPERCLAUDE_UPDATE_OPS_LOADED="true"

# Source security utilities
if [ -f "$PROJECT_DIR/Scripts/shell/utils/security.sh" ]; then
    source "$PROJECT_DIR/Scripts/shell/utils/security.sh"
else
    log_error "Security utilities not found - cannot proceed safely"
    return 1
fi


# Update existing installation
run_updater() {
    log_info "Starting SuperClaude update..."
    
    # Validate current installation
    if ! validate_superclaude_directory "$CLAUDE_GLOBAL_DIR"; then
        log_error "SuperClaude not found or invalid installation"
        log_info "Run './install.sh' for fresh installation"
        return 1
    fi
    
    # Create secure backup using security utilities
    local backup_dir
    backup_dir=$(create_secure_backup "$CLAUDE_GLOBAL_DIR") || {
        log_error "Failed to create secure backup"
        return 1
    }
    
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

# Check for available updates
check_for_updates() {
    log_info "Checking for available updates..."
    
    # This could be enhanced to check remote repositories for newer versions
    # For now, we assume the local version is the target version
    
    if [ -f "$CLAUDE_GLOBAL_DIR/settings.json" ]; then
        # Extract current version from settings if available
        local current_version
        if command_exists jq; then
            current_version=$(jq -r '.version // "unknown"' "$CLAUDE_GLOBAL_DIR/settings.json" 2>/dev/null)
        else
            current_version="unknown"
        fi
        
        log_info "Current version: $current_version"
        log_info "Target version: $SUPERCLAUDE_VERSION"
        
        if [ "$current_version" != "$SUPERCLAUDE_VERSION" ]; then
            log_info "Update available"
            return 0
        else
            log_info "Already up to date"
            return 1
        fi
    else
        log_warning "Cannot determine current version"
        return 0
    fi
}

# Validate update requirements
validate_update_requirements() {
    log_info "Validating update requirements..."
    
    # Check if all required files exist
    local required_files=(
        "$PROJECT_DIR/Scripts/main.py"
        "$PROJECT_DIR/Scripts/utils"
        "$PROJECT_DIR/Scripts/installers"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -e "$file" ]; then
            log_error "Required file/directory not found: $file"
            return 1
        fi
    done
    
    # Check write permissions to target directory
    if [ ! -w "$CLAUDE_GLOBAL_DIR" ]; then
        log_error "No write permission to $CLAUDE_GLOBAL_DIR"
        return 1
    fi
    
    log_success "Update requirements validated"
    return 0
}

# Rollback to previous version
rollback_installation() {
    local backup_dir="$1"
    
    if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
        log_error "Invalid backup directory: $backup_dir"
        return 1
    fi
    
    # Validate backup before rollback
    if ! validate_backup "$backup_dir"; then
        log_error "Cannot rollback - backup validation failed"
        return 1
    fi
    
    log_info "Rolling back to previous installation..."
    
    # Safely remove current installation using security utilities
    if ! safe_cleanup_directory "$CLAUDE_GLOBAL_DIR"; then
        log_error "Failed to safely remove current installation"
        return 1
    fi
    
    # Restore from backup
    if ! cp -r "$backup_dir"/* "$CLAUDE_GLOBAL_DIR/"; then
        log_error "Failed to restore from backup"
        return 1
    fi
    
    # Validate restored installation
    if ! validate_superclaude_directory "$CLAUDE_GLOBAL_DIR"; then
        log_error "Rollback validation failed"
        return 1
    fi
    
    log_success "Rollback completed and validated"
    return 0
}