# Security Permissions Policy - SuperClaude Framework

## Overview

This document defines the security permissions policy for the SuperClaude Framework, implementing the principle of least privilege to ensure secure file operations.

## Security Principles

### 1. Principle of Least Privilege
- Files receive the minimum permissions necessary for their function
- No unnecessary execute permissions on non-executable files
- Owner-only access for sensitive configuration files
- Explicit justification required for any elevated permissions

### 2. Defense in Depth
- Multiple layers of permission validation
- Audit logging of all permission changes
- Automated security scanning and remediation
- Regular permission audits

### 3. Zero Trust Security Model
- All file permissions are validated before setting
- No implicit trust in existing permissions
- Continuous monitoring and validation

## File Type Classifications

### Regular Files (0o644)
- **Permission**: 644 (rw-r--r--)
- **Usage**: Standard Python files, documentation, data files
- **Justification**: Readable by all users, writable only by owner
- **Examples**: `*.py`, `*.md`, `*.txt`, `*.json` (non-sensitive)

### Executable Files (0o755)
- **Permission**: 755 (rwxr-xr-x)
- **Usage**: Shell scripts, binary executables
- **Justification**: Execute permission required for direct execution
- **Examples**: `*.sh`, `install.sh`, binary files with shebang

### Configuration Files (0o600)
- **Permission**: 600 (rw-------)
- **Usage**: Sensitive configuration files, API keys, secrets
- **Justification**: Owner-only access prevents information disclosure
- **Examples**: `settings.json`, `.env`, `*.key`, `*.pem`

### Log Files (0o640)
- **Permission**: 640 (rw-r-----)
- **Usage**: Application logs, audit logs
- **Justification**: Owner write, group read for monitoring
- **Examples**: `*.log`, audit files

### Directories (0o755)
- **Permission**: 755 (rwxr-xr-x)
- **Usage**: All directories
- **Justification**: Traversal permissions required for access
- **Examples**: All directory paths

### Hook Files (0o644)
- **Permission**: 644 (rw-r--r--)
- **Usage**: Python hook files in SuperClaude framework
- **Justification**: Python interpreter executes, no execute bit needed
- **Examples**: Files in `SuperClaude/Hooks/`

### Temporary Files (0o600)
- **Permission**: 600 (rw-------)
- **Usage**: Temporary files, caches
- **Justification**: Owner-only access for security
- **Examples**: Files in `/tmp/`, `*.tmp`, `*.temp`

## Security Validation Rules

### Prohibited Permissions
- **World-writable (002)**: Never allowed - prevents unauthorized modification
- **Setuid/Setgid**: Not used in this framework - prevents privilege escalation
- **Sticky bit**: Only on appropriate directories

### Permission Escalation Checks
- Requested permissions are validated against recommended permissions
- Warnings generated for permissions exceeding recommendations
- Explicit justification required for elevated permissions
- Audit logging of all permission escalations

### Validation Process
1. **File Type Classification**: Automatic classification based on path and content
2. **Permission Recommendation**: Suggested permissions based on file type
3. **Validation**: Check requested permissions against security policies
4. **Audit Logging**: Record all permission changes with justification
5. **Verification**: Post-change validation to ensure correct permissions

## Implementation

### SecurePermissions Class
Located in `Scripts/utils/secure_permissions.py`, this class provides:

- **File type classification**: Automatic detection of file types
- **Permission profiles**: Predefined secure permission sets
- **Validation functions**: Security policy enforcement
- **Audit logging**: Complete audit trail of permission changes
- **Bulk operations**: Directory-wide permission management

### Integration Points

#### Hooks Installer
- Uses SecurePermissions for all hook file permissions
- Validates permissions after installation
- Provides detailed security audit reports

#### File Operations Utility
- Integrated secure permission methods
- Validation before any permission changes
- Audit logging of all file operations

#### Error Handler
- Secure permission recovery mechanisms
- Proper permission handling during error recovery
- Audit logging of permission-related errors

## Security Audit Process

### Automated Auditing
The security audit script (`Scripts/security_audit.py`) provides:

- **Comprehensive scanning**: All critical directories
- **Issue detection**: Critical issues and warnings
- **Automated fixing**: Corrects permission issues
- **Detailed reporting**: Security status and recommendations

### Audit Schedule
- **Installation**: Complete audit after framework installation
- **Regular checks**: Weekly automated audits recommended
- **Change validation**: Audit after any file system changes
- **Security reviews**: Monthly comprehensive security reviews

### Running Security Audits

```bash
# Audit project permissions
python Scripts/security_audit.py --project-dir /path/to/SuperClaude

# Audit and fix issues (dry run)
python Scripts/security_audit.py --project-dir /path/to/SuperClaude --fix --dry-run

# Audit and fix issues (actual fixes)
python Scripts/security_audit.py --project-dir /path/to/SuperClaude --fix
```

## Audit Logging

### Audit Log Location
- **Path**: `~/.claude/audit/permissions.log`
- **Format**: JSON lines format for easy parsing
- **Permissions**: 600 (owner-only access)

### Audit Log Contents
Each entry includes:
- **Timestamp**: When the action occurred
- **Action**: Type of permission change
- **Path**: File or directory affected
- **Permissions**: Before and after permission values
- **Justification**: Reason for the change
- **User context**: Who made the change

### Audit Log Analysis
```bash
# View recent permission changes
tail -n 50 ~/.claude/audit/permissions.log | jq .

# Find all permission escalations
grep "permission_set" ~/.claude/audit/permissions.log | jq 'select(.forced == true)'

# Audit specific file changes
grep "/path/to/file" ~/.claude/audit/permissions.log
```

## Security Incident Response

### Permission Violation Detection
1. **Immediate audit**: Run security audit on detection
2. **Issue isolation**: Identify affected files and directories
3. **Risk assessment**: Evaluate security impact
4. **Remediation**: Apply secure permissions immediately
5. **Root cause analysis**: Determine how violation occurred

### Recovery Procedures
1. **Backup restoration**: Restore from secure backup if needed
2. **Permission reset**: Apply baseline secure permissions
3. **Validation**: Comprehensive security audit
4. **Monitoring**: Enhanced monitoring for repeat issues

## Compliance and Governance

### Security Standards
- **Baseline**: All files follow least-privilege principle
- **Monitoring**: Continuous permission monitoring
- **Validation**: Regular security audits
- **Documentation**: Complete audit trail maintenance

### Change Management
- **Approval process**: Security review for permission changes
- **Testing**: Permission changes tested in isolation
- **Rollback**: Ability to revert permission changes
- **Documentation**: All changes documented with justification

## Best Practices

### Development Guidelines
1. **Never use chmod 777**: Use specific, justified permissions
2. **Validate before setting**: Always use SecurePermissions class
3. **Document justifications**: Explain why specific permissions are needed
4. **Regular audits**: Include permission checks in testing
5. **Monitor changes**: Review audit logs regularly

### Operational Guidelines
1. **Least privilege**: Grant minimum required permissions
2. **Regular reviews**: Monthly permission audits
3. **Automated monitoring**: Set up alerts for permission violations
4. **Incident response**: Quick response to security issues
5. **Training**: Keep team updated on security practices

## Security Contacts

For security-related issues or questions about permissions:
- Review this documentation first
- Run security audit to identify issues
- Check audit logs for recent changes
- Escalate to security team if needed

## Revision History

- **v1.0**: Initial security permissions policy
- **v1.1**: Added audit logging requirements
- **v1.2**: Enhanced security validation rules
- **v1.3**: Added incident response procedures