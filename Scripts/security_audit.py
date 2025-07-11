#!/usr/bin/env python3
"""
Security audit script for SuperClaude Framework.

Performs comprehensive security audit of file permissions and provides
automated fixes for security issues.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List

# Add utils to path for imports
utils_path = str(Path(__file__).parent / "utils")
sys.path.insert(0, utils_path)

try:
    from secure_permissions import SecurePermissions
    from colors import Colors
except ImportError:
    print("Error: Required modules not found. Please ensure utils are available.")
    sys.exit(1)


class SecurityAuditor:
    """Security auditor for SuperClaude Framework."""
    
    def __init__(self, project_dir: str):
        """Initialize security auditor.
        
        Args:
            project_dir: SuperClaude project directory
        """
        self.project_dir = Path(project_dir)
        self.secure_perms = SecurePermissions()
        self.colors = Colors()
        
        # Define critical directories to audit
        self.critical_directories = [
            self.project_dir / "SuperClaude" / "Hooks",
            self.project_dir / "SuperClaude" / "Settings",
            self.project_dir / "Scripts",
            Path.home() / ".claude"
        ]
        
        # Define sensitive file patterns
        self.sensitive_patterns = [
            "*.json",     # Configuration files
            "settings.*", # Settings files
            "*.key",      # Key files
            "*.pem",      # Certificate files
            ".env*",      # Environment files
            "*.log"       # Log files
        ]
    
    def log_info(self, message: str):
        """Log info message."""
        print(self.colors.info(f"[INFO] {message}"))
    
    def log_success(self, message: str):
        """Log success message."""
        print(self.colors.success(f"[✓] {message}"))
    
    def log_warning(self, message: str):
        """Log warning message."""
        print(self.colors.warning(f"[!] {message}"))
    
    def log_error(self, message: str):
        """Log error message."""
        print(self.colors.error(f"[✗] {message}"))
    
    def audit_project_permissions(self) -> Dict[str, Any]:
        """Audit permissions across the entire project.
        
        Returns:
            Comprehensive audit report
        """
        self.log_info("Starting comprehensive security audit...")
        
        overall_report = {
            "timestamp": self.secure_perms._write_audit_entry.__self__.audit_log_path,
            "project_directory": str(self.project_dir),
            "critical_issues": 0,
            "warnings": 0,
            "directories_audited": 0,
            "files_audited": 0,
            "recommendations": [],
            "directory_reports": {}
        }
        
        # Audit each critical directory
        for directory in self.critical_directories:
            if not directory.exists():
                self.log_warning(f"Directory not found: {directory}")
                continue
            
            self.log_info(f"Auditing directory: {directory}")
            
            directory_report = self.secure_perms.audit_permissions(directory, recursive=True)
            
            # Update overall statistics
            overall_report["directories_audited"] += 1
            overall_report["files_audited"] += directory_report.get("total_files", 0)
            overall_report["critical_issues"] += len(directory_report.get("critical_issues", []))
            overall_report["warnings"] += len(directory_report.get("warnings", []))
            overall_report["recommendations"].extend(directory_report.get("recommendations", []))
            
            # Store directory-specific report
            overall_report["directory_reports"][str(directory)] = directory_report
            
            # Report issues for this directory
            critical_count = len(directory_report.get("critical_issues", []))
            warning_count = len(directory_report.get("warnings", []))
            
            if critical_count > 0:
                self.log_error(f"  Critical issues: {critical_count}")
                for issue in directory_report["critical_issues"]:
                    self.log_error(f"    {issue['path']}: {', '.join(issue['issues'])}")
            
            if warning_count > 0:
                self.log_warning(f"  Warnings: {warning_count}")
                for warning in directory_report["warnings"][:3]:  # Show first 3
                    self.log_warning(f"    {warning['path']}: {', '.join(warning['issues'])}")
                if warning_count > 3:
                    self.log_warning(f"    ... and {warning_count - 3} more warnings")
            
            if critical_count == 0 and warning_count == 0:
                self.log_success(f"  No issues found ({directory_report.get('total_files', 0)} files)")
        
        return overall_report
    
    def fix_project_permissions(self, dry_run: bool = False) -> Dict[str, Any]:
        """Fix permissions across the entire project.
        
        Args:
            dry_run: Only simulate fixes without making changes
            
        Returns:
            Fix report with actions taken
        """
        action_type = "Simulating" if dry_run else "Executing"
        self.log_info(f"{action_type} permission fixes...")
        
        overall_report = {
            "timestamp": "now",
            "project_directory": str(self.project_dir),
            "dry_run": dry_run,
            "directories_processed": 0,
            "files_fixed": 0,
            "files_failed": 0,
            "directory_reports": {}
        }
        
        # Fix permissions in each critical directory
        for directory in self.critical_directories:
            if not directory.exists():
                continue
            
            self.log_info(f"Fixing permissions in: {directory}")
            
            fix_report = self.secure_perms.fix_permissions(directory, recursive=True, dry_run=dry_run)
            
            # Update overall statistics
            overall_report["directories_processed"] += 1
            overall_report["files_fixed"] += fix_report.get("files_fixed", 0)
            overall_report["files_failed"] += fix_report.get("files_failed", 0)
            
            # Store directory-specific report
            overall_report["directory_reports"][str(directory)] = fix_report
            
            # Report results for this directory
            files_processed = fix_report.get("files_processed", 0)
            actions_taken = len(fix_report.get("actions", []))
            
            if actions_taken > 0:
                if dry_run:
                    self.log_info(f"  Would fix {actions_taken} files out of {files_processed}")
                else:
                    fixed = fix_report.get("files_fixed", 0)
                    failed = fix_report.get("files_failed", 0)
                    self.log_success(f"  Fixed {fixed} files, {failed} failed out of {files_processed}")
            else:
                self.log_success(f"  No fixes needed ({files_processed} files)")
        
        return overall_report
    
    def generate_security_report(self, audit_report: Dict[str, Any]) -> str:
        """Generate a detailed security report.
        
        Args:
            audit_report: Audit report data
            
        Returns:
            Formatted security report
        """
        report_lines = [
            "SuperClaude Framework Security Audit Report",
            "=" * 50,
            "",
            f"Project Directory: {audit_report['project_directory']}",
            f"Directories Audited: {audit_report['directories_audited']}",
            f"Files Audited: {audit_report['files_audited']}",
            f"Critical Issues: {audit_report['critical_issues']}",
            f"Warnings: {audit_report['warnings']}",
            "",
            "Security Assessment:",
        ]
        
        # Overall security status
        if audit_report['critical_issues'] == 0:
            if audit_report['warnings'] == 0:
                report_lines.append("✅ SECURE - No security issues found")
            else:
                report_lines.append("⚠️  MOSTLY SECURE - Minor warnings present")
        else:
            report_lines.append("❌ INSECURE - Critical security issues found")
        
        report_lines.append("")
        
        # Critical issues summary
        if audit_report['critical_issues'] > 0:
            report_lines.append("CRITICAL ISSUES:")
            report_lines.append("-" * 20)
            
            for dir_path, dir_report in audit_report['directory_reports'].items():
                critical_issues = dir_report.get('critical_issues', [])
                if critical_issues:
                    report_lines.append(f"{dir_path}:")
                    for issue in critical_issues:
                        report_lines.append(f"  - {issue['path']}: {', '.join(issue['issues'])}")
            
            report_lines.append("")
        
        # Recommendations
        if audit_report['recommendations']:
            report_lines.append("RECOMMENDATIONS:")
            report_lines.append("-" * 20)
            
            for rec in audit_report['recommendations'][:10]:  # Show first 10
                report_lines.append(f"- {rec['action']} {rec['path']}: {rec['current']} → {rec['recommended']}")
            
            if len(audit_report['recommendations']) > 10:
                report_lines.append(f"... and {len(audit_report['recommendations']) - 10} more recommendations")
        
        return "\n".join(report_lines)
    
    def run_audit(self, fix: bool = False, dry_run: bool = False) -> bool:
        """Run complete security audit.
        
        Args:
            fix: Whether to fix issues found
            dry_run: Only simulate fixes
            
        Returns:
            True if audit passed (no critical issues), False otherwise
        """
        try:
            # Perform audit
            audit_report = self.audit_project_permissions()
            
            # Generate and display report
            security_report = self.generate_security_report(audit_report)
            print("\n" + security_report)
            
            # Fix issues if requested
            if fix:
                print("\n" + "=" * 50)
                fix_report = self.fix_project_permissions(dry_run=dry_run)
                
                if not dry_run:
                    # Re-audit to verify fixes
                    print("\n" + "=" * 50)
                    self.log_info("Re-auditing after fixes...")
                    post_fix_audit = self.audit_project_permissions()
                    
                    if post_fix_audit['critical_issues'] == 0:
                        self.log_success("All critical issues resolved!")
                    else:
                        self.log_error(f"Still have {post_fix_audit['critical_issues']} critical issues")
            
            # Return whether audit passed
            return audit_report['critical_issues'] == 0
            
        except Exception as e:
            self.log_error(f"Security audit failed: {e}")
            return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="SuperClaude Security Audit Tool")
    parser.add_argument("--project-dir", required=True,
                       help="SuperClaude project directory")
    parser.add_argument("--fix", action="store_true",
                       help="Fix security issues found")
    parser.add_argument("--dry-run", action="store_true",
                       help="Simulate fixes without making changes")
    
    args = parser.parse_args()
    
    auditor = SecurityAuditor(args.project_dir)
    
    # Run audit
    success = auditor.run_audit(fix=args.fix, dry_run=args.dry_run)
    
    if success:
        print(f"\n{auditor.colors.success('Security audit PASSED - No critical issues found')}")
        return 0
    else:
        print(f"\n{auditor.colors.error('Security audit FAILED - Critical issues found')}")
        print("Run with --fix to automatically resolve issues")
        return 1


if __name__ == "__main__":
    sys.exit(main())