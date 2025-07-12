#!/usr/bin/env bash
#
# SuperClaude Framework v3.0 - Security Utilities Module
#
# Provides security functions for safe file operations and validation.
#

# Prevent multiple sourcing
if [[ "${SUPERCLAUDE_SECURITY_UTILS_LOADED:-}" == "true" ]]; then
    return 0
fi
readonly SUPERCLAUDE_SECURITY_UTILS_LOADED="true"

# Validate directory contains SuperClaude installation
validate_superclaude_directory() {
    local target_dir="$1"
    
    # Basic safety checks - prevent operations on system directories
    if [ -z "$target_dir" ] || [ "$target_dir" = "/" ] || [ "$target_dir" = "$HOME" ]; then
        log_error "Refusing to operate on system directory: $target_dir"
        return 1
    fi
    
    # Additional system directory protection
    case "$target_dir" in
        /bin|/sbin|/usr|/etc|/var|/opt|/tmp|/boot|/dev|/proc|/sys)
            log_error "Refusing to operate on system directory: $target_dir"
            return 1
            ;;
    esac
    
    # Check for SuperClaude signature files
    local signature_files=(
        "$target_dir/settings.json"
        "$target_dir/CLAUDE.md"
    )
    
    local found_signatures=0
    for file in "${signature_files[@]}"; do
        if [ -f "$file" ]; then
            # Validate that signature files contain expected SuperClaude content
            if [ "$(basename "$file")" = "settings.json" ] && grep -q "SuperClaude" "$file" 2>/dev/null; then
                found_signatures=$((found_signatures + 1))
            elif [ "$(basename "$file")" = "CLAUDE.md" ] && grep -q "SuperClaude Framework" "$file" 2>/dev/null; then
                found_signatures=$((found_signatures + 1))
            fi
        fi
    done
    
    if [ $found_signatures -eq 0 ]; then
        log_error "Directory does not appear to contain valid SuperClaude installation: $target_dir"
        return 1
    fi
    
    log_info "SuperClaude directory validation passed: $target_dir"
    return 0
}

# Safe directory cleanup - removes only SuperClaude files
safe_cleanup_directory() {
    local target_dir="$1"
    
    if ! validate_superclaude_directory "$target_dir"; then
        return 1
    fi
    
    log_info "Safely removing SuperClaude files from: $target_dir"
    
    # Define known SuperClaude files and directories
    local superclaude_items=(
        "$target_dir/settings.json"
        "$target_dir/CLAUDE.md"
        "$target_dir/COMMANDS.md"
        "$target_dir/FLAGS.md"
        "$target_dir/PRINCIPLES.md"
        "$target_dir/RULES.md"
        "$target_dir/MCP.md"
        "$target_dir/PERSONAS.md"
        "$target_dir/ORCHESTRATOR.md"
        "$target_dir/MODES.md"
        "$target_dir/SuperClaude"
    )
    
    local failed_removals=0
    for item in "${superclaude_items[@]}"; do
        if [ -e "$item" ]; then
            log_info "Removing: $item"
            if ! rm -rf "$item"; then
                log_error "Failed to remove: $item"
                failed_removals=$((failed_removals + 1))
            fi
        fi
    done
    
    if [ $failed_removals -gt 0 ]; then
        log_error "Failed to remove $failed_removals items"
        return 1
    fi
    
    return 0
}

# Safe directory removal - removes only SuperClaude files and empty parent directory
safe_remove_superclaude() {
    local target_dir="$1"
    
    if ! safe_cleanup_directory "$target_dir"; then
        return 1
    fi
    
    # Remove the entire directory only if it's empty or contains only backup dirs
    if [ -d "$target_dir" ]; then
        local remaining_files
        remaining_files=$(find "$target_dir" -mindepth 1 -not -path "*/backup_*" 2>/dev/null | wc -l)
        if [ "$remaining_files" -eq 0 ]; then
            log_info "Removing empty SuperClaude directory: $target_dir"
            rmdir "$target_dir" 2>/dev/null || {
                log_warning "Could not remove directory (may contain hidden files): $target_dir"
            }
        else
            log_info "Preserving directory with remaining files: $target_dir"
        fi
    fi
    
    return 0
}

# Validate backup integrity
validate_backup() {
    local backup_dir="$1"
    
    if [ ! -d "$backup_dir" ]; then
        log_error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    # Check backup contains critical SuperClaude files
    local critical_files=(
        "$backup_dir/settings.json"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Backup appears incomplete - missing: $(basename "$file")"
            return 1
        fi
        
        # Validate file is not empty and contains expected content
        if [ ! -s "$file" ]; then
            log_error "Backup file is empty: $(basename "$file")"
            return 1
        fi
        
        if [ "$(basename "$file")" = "settings.json" ] && ! grep -q "SuperClaude" "$file" 2>/dev/null; then
            log_error "Backup file does not contain expected content: $(basename "$file")"
            return 1
        fi
    done
    
    log_info "Backup validation passed: $backup_dir"
    return 0
}

# Create secure backup of SuperClaude installation
create_secure_backup() {
    local source_dir="$1"
    local backup_dir="$2"
    
    if ! validate_superclaude_directory "$source_dir" 2>/dev/null; then
        if command -v log_error >/dev/null 2>&1; then
            log_error "Cannot backup invalid SuperClaude directory: $source_dir"
        fi
        return 1
    fi
    
    if [ -z "$backup_dir" ]; then
        backup_dir="$source_dir/backup_$(date +%Y%m%d_%H%M%S)"
    fi
    
    if command -v log_info >/dev/null 2>&1; then
        log_info "Creating secure backup: $backup_dir"
    fi
    
    if ! mkdir -p "$backup_dir"; then
        if command -v log_error >/dev/null 2>&1; then
            log_error "Failed to create backup directory: $backup_dir"
        fi
        return 1
    fi
    
    # Backup only SuperClaude files
    local items_to_backup=(
        "settings.json"
        "CLAUDE.md"
        "COMMANDS.md"
        "FLAGS.md"
        "PRINCIPLES.md"
        "RULES.md"
        "MCP.md"
        "PERSONAS.md"
        "ORCHESTRATOR.md"
        "MODES.md"
        "SuperClaude"
    )
    
    local backup_errors=0
    for item in "${items_to_backup[@]}"; do
        if [ -e "$source_dir/$item" ]; then
            if ! cp -r "$source_dir/$item" "$backup_dir/"; then
                if command -v log_error >/dev/null 2>&1; then
                    log_error "Failed to backup: $item"
                fi
                backup_errors=$((backup_errors + 1))
            fi
        fi
    done
    
    if [ $backup_errors -gt 0 ]; then
        if command -v log_error >/dev/null 2>&1; then
            log_error "Backup completed with $backup_errors errors"
        fi
        return 1
    fi
    
    # Validate backup integrity
    if ! validate_backup "$backup_dir" 2>/dev/null; then
        if command -v log_error >/dev/null 2>&1; then
            log_error "Backup validation failed"
        fi
        return 1
    fi
    
    if command -v log_success >/dev/null 2>&1; then
        log_success "Secure backup created and validated: $backup_dir"
    fi
    echo "$backup_dir"
    return 0
}

# Sanitize path to prevent path traversal attacks
sanitize_path() {
    local input_path="$1"
    
    # Remove any path traversal attempts
    local sanitized_path
    sanitized_path=$(echo "$input_path" | sed 's/\.\.//g' | sed 's|//|/|g')
    
    # Ensure path doesn't start with / unless it's meant to be absolute
    case "$sanitized_path" in
        /*)
            # Absolute path - validate it's not a system directory
            case "$sanitized_path" in
                /bin*|/sbin*|/usr*|/etc*|/var*|/opt*|/tmp*|/boot*|/dev*|/proc*|/sys*)
                    log_error "Path appears to target system directory: $sanitized_path"
                    return 1
                    ;;
            esac
            ;;
    esac
    
    echo "$sanitized_path"
    return 0
}

# Verify file permissions are safe
verify_safe_permissions() {
    local file_path="$1"
    
    if [ ! -e "$file_path" ]; then
        log_error "File does not exist: $file_path"
        return 1
    fi
    
    # Check if file is writable by others (potential security risk)
    if [ -w "$file_path" ] && [ "$(stat -c %a "$file_path" 2>/dev/null | cut -c3)" != "0" ]; then
        log_warning "File is writable by others: $file_path"
    fi
    
    # Check if file is owned by current user
    local file_owner
    file_owner=$(stat -c %U "$file_path" 2>/dev/null)
    if [ "$file_owner" != "$(whoami)" ] && [ "$file_owner" != "root" ]; then
        log_warning "File owned by different user: $file_path (owner: $file_owner)"
    fi
    
    return 0
}

# Emergency cleanup function - removes SuperClaude files with extensive validation
emergency_cleanup() {
    local target_dir="$1"
    local force="${2:-false}"
    
    log_warning "Emergency cleanup requested for: $target_dir"
    
    if [ "$force" != "true" ]; then
        echo "This will attempt to remove SuperClaude files from: $target_dir"
        echo "This operation cannot be undone."
        read -p "Are you absolutely sure? Type 'yes' to confirm: " -r
        if [ "$REPLY" != "yes" ]; then
            log_info "Emergency cleanup cancelled"
            return 0
        fi
    fi
    
    # Create backup before emergency cleanup
    local emergency_backup
    emergency_backup=$(create_secure_backup "$target_dir" "$target_dir/emergency_backup_$(date +%Y%m%d_%H%M%S)") || {
        log_error "Cannot create emergency backup - aborting cleanup"
        return 1
    }
    
    log_info "Emergency backup created: $emergency_backup"
    
    # Perform safe removal
    if safe_remove_superclaude "$target_dir"; then
        log_success "Emergency cleanup completed successfully"
        log_info "Emergency backup preserved at: $emergency_backup"
        return 0
    else
        log_error "Emergency cleanup failed"
        log_info "Installation can be restored from: $emergency_backup"
        return 1
    fi
}