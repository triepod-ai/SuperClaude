#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Post-Installation Validation

Comprehensive validation suite that runs after installation to ensure
all components are properly installed and functional.
"""

import os
import sys
import json
import argparse
import subprocess
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Add utils to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from colors import Colors
from progress import ProgressTracker
from validation import SystemValidator


class PostInstallValidator:
    """Post-installation validation suite."""
    
    def __init__(self, project_dir: str):
        """Initialize post-install validator.
        
        Args:
            project_dir: SuperClaude project directory
        """
        self.project_dir = Path(project_dir)
        self.claude_dir = Path.home() / ".claude"
        self.version = "3.0.0"
        
        # Initialize utilities
        self.colors = Colors()
        self.progress = ProgressTracker()
        self.system_validator = SystemValidator()
        
        # Load feature configuration
        self.feature_config = self._load_feature_config()
        
        # Validation results
        self.validation_results: Dict[str, Dict[str, Any]] = {}
        
    def _load_feature_config(self) -> Dict[str, Any]:
        """Load feature configuration."""
        config_file = self.project_dir / "Scripts" / "config" / "features.json"
        
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            self.log_error(f"Failed to load feature configuration: {e}")
            return {}
    
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
    
    def _calculate_file_hash(self, file_path: Path) -> Optional[str]:
        """Calculate SHA256 hash of a file.
        
        Args:
            file_path: Path to file
            
        Returns:
            SHA256 hash or None if error
        """
        try:
            hash_obj = hashlib.sha256()
            with open(file_path, 'rb') as f:
                # Read in chunks to handle large files
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_obj.update(chunk)
            return hash_obj.hexdigest()
        except Exception as e:
            self.log_error(f"Failed to calculate hash for {file_path}: {e}")
            return None
    
    def _verify_file_integrity(self, file_path: Path, expected_hash: Optional[str] = None) -> bool:
        """Verify file integrity.
        
        Args:
            file_path: Path to file
            expected_hash: Expected SHA256 hash (if known)
            
        Returns:
            True if file integrity verified, False otherwise
        """
        if not file_path.exists():
            return False
        
        # Check file permissions
        try:
            stat_info = file_path.stat()
            
            # Check if file is writable by others (potential security risk)
            if stat_info.st_mode & 0o002:
                self.log_warning(f"File {file_path} is world-writable")
            
            # For executable files, check execute permissions
            if file_path.suffix == '.py' and not (stat_info.st_mode & 0o100):
                self.log_warning(f"Python file {file_path} is not executable")
        
        except Exception as e:
            self.log_error(f"Failed to check permissions for {file_path}: {e}")
            return False
        
        # Calculate and optionally verify hash
        actual_hash = self._calculate_file_hash(file_path)
        if actual_hash is None:
            return False
        
        if expected_hash and actual_hash != expected_hash:
            self.log_error(f"Hash mismatch for {file_path}")
            return False
        
        return True
    
    def _generate_integrity_manifest(self, directory: Path) -> Dict[str, str]:
        """Generate integrity manifest for all files in directory.
        
        Args:
            directory: Directory to scan
            
        Returns:
            Dict mapping relative file paths to SHA256 hashes
        """
        manifest = {}
        
        for file_path in directory.rglob('*'):
            if file_path.is_file() and not file_path.name.startswith('.'):
                relative_path = file_path.relative_to(directory)
                file_hash = self._calculate_file_hash(file_path)
                if file_hash:
                    manifest[str(relative_path)] = file_hash
        
        return manifest
    
    def validate_core_framework(self) -> Tuple[bool, Dict[str, Any]]:
        """Validate core framework installation."""
        self.log_info("Validating core framework...")
        
        results = {
            "component": "core",
            "tests": {},
            "overall_status": True
        }
        
        core_config = self.feature_config.get("core", {})
        
        # Test 1: Check settings.json exists and is valid
        settings_file = self.claude_dir / "settings.json"
        try:
            if settings_file.exists():
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
                
                # Check essential settings
                if "superclaude" in settings and settings["superclaude"].get("version") == self.version:
                    results["tests"]["settings_file"] = {"status": True, "message": "Valid settings.json"}
                else:
                    results["tests"]["settings_file"] = {"status": False, "message": "Invalid settings.json structure"}
                    results["overall_status"] = False
            else:
                results["tests"]["settings_file"] = {"status": False, "message": "settings.json not found"}
                results["overall_status"] = False
        except Exception as e:
            results["tests"]["settings_file"] = {"status": False, "message": f"Settings validation error: {e}"}
            results["overall_status"] = False
        
        # Test 2: Check core files exist
        target_files = core_config.get("target_files", [])
        missing_files = []
        
        for target_rel in target_files:
            target_path = Path(target_rel.replace("~", str(Path.home())))
            if not target_path.exists():
                missing_files.append(target_path.name)
        
        if missing_files:
            results["tests"]["core_files"] = {"status": False, "message": f"Missing files: {', '.join(missing_files)}"}
            results["overall_status"] = False
        else:
            results["tests"]["core_files"] = {"status": True, "message": f"All {len(target_files)} core files present"}
        
        # Test 3: Check directory structure
        required_dirs = [self.claude_dir, self.claude_dir / "hooks", self.claude_dir / "commands"]
        missing_dirs = [str(d) for d in required_dirs if not d.exists()]
        
        if missing_dirs:
            results["tests"]["directory_structure"] = {"status": False, "message": f"Missing directories: {', '.join(missing_dirs)}"}
            results["overall_status"] = False
        else:
            results["tests"]["directory_structure"] = {"status": True, "message": "Directory structure valid"}
        
        if results["overall_status"]:
            self.log_success("Core framework validation passed")
        else:
            self.log_error("Core framework validation failed")
        
        return results["overall_status"], results
    
    def validate_hook_system(self) -> Tuple[bool, Dict[str, Any]]:
        """Validate hook system installation."""
        self.log_info("Validating hook system...")
        
        results = {
            "component": "hooks",
            "tests": {},
            "overall_status": True
        }
        
        hooks_config = self.feature_config.get("hooks", {})
        hooks_dir = self.claude_dir / "hooks"
        
        # Test 1: Check hooks directory exists
        if not hooks_dir.exists():
            results["tests"]["hooks_directory"] = {"status": False, "message": "Hooks directory not found"}
            results["overall_status"] = False
            return results["overall_status"], results
        else:
            results["tests"]["hooks_directory"] = {"status": True, "message": "Hooks directory exists"}
        
        # Test 2: Check hook files exist
        hook_files = hooks_config.get("files", [])
        missing_hooks = []
        
        for hook_rel in hook_files:
            hook_path = self.project_dir / hook_rel
            hook_name = hook_path.name
            target_hook = hooks_dir / hook_name
            
            if not target_hook.exists():
                missing_hooks.append(hook_name)
        
        if missing_hooks:
            results["tests"]["hook_files"] = {"status": False, "message": f"Missing hooks: {', '.join(missing_hooks)}"}
            results["overall_status"] = False
        else:
            results["tests"]["hook_files"] = {"status": True, "message": f"All {len(hook_files)} hook files present"}
        
        # Test 3: Test hook imports
        try:
            # Add hooks directory to Python path
            hooks_dir_str = str(hooks_dir)
            if hooks_dir_str not in sys.path:
                sys.path.insert(0, hooks_dir_str)
            
            # Test essential hook imports
            essential_hooks = ["hook_registry", "wave_coordinator", "task_manager"]
            failed_imports = []
            
            for hook_name in essential_hooks:
                try:
                    __import__(hook_name)
                except ImportError as e:
                    failed_imports.append(f"{hook_name}: {e}")
            
            if failed_imports:
                results["tests"]["hook_imports"] = {"status": False, "message": f"Import failures: {', '.join(failed_imports)}"}
                results["overall_status"] = False
            else:
                results["tests"]["hook_imports"] = {"status": True, "message": "Essential hook imports successful"}
        
        except Exception as e:
            results["tests"]["hook_imports"] = {"status": False, "message": f"Hook import test error: {e}"}
            results["overall_status"] = False
        
        # Test 4: Verify hook file integrity
        integrity_issues = []
        for hook_file in hooks_dir.glob("*.py"):
            if not self._verify_file_integrity(hook_file):
                integrity_issues.append(hook_file.name)
        
        if integrity_issues:
            results["tests"]["hook_integrity"] = {"status": False, "message": f"Integrity issues: {', '.join(integrity_issues)}"}
            results["overall_status"] = False
        else:
            results["tests"]["hook_integrity"] = {"status": True, "message": "Hook file integrity verified"}
        
        if results["overall_status"]:
            self.log_success("Hook system validation passed")
        else:
            self.log_error("Hook system validation failed")
        
        return results["overall_status"], results
    
    def validate_commands_suite(self) -> Tuple[bool, Dict[str, Any]]:
        """Validate commands suite installation."""
        self.log_info("Validating commands suite...")
        
        results = {
            "component": "commands",
            "tests": {},
            "overall_status": True
        }
        
        commands_config = self.feature_config.get("commands", {})
        commands_dir = self.claude_dir / "commands"
        
        # Test 1: Check commands directory exists
        if not commands_dir.exists():
            results["tests"]["commands_directory"] = {"status": False, "message": "Commands directory not found"}
            results["overall_status"] = False
            return results["overall_status"], results
        else:
            results["tests"]["commands_directory"] = {"status": True, "message": "Commands directory exists"}
        
        # Test 2: Check command files exist
        command_files = commands_config.get("files", [])
        missing_commands = []
        
        for command_rel in command_files:
            command_path = self.project_dir / command_rel
            command_name = command_path.name
            target_command = commands_dir / command_name
            
            if not target_command.exists():
                missing_commands.append(command_name)
        
        if missing_commands:
            results["tests"]["command_files"] = {"status": False, "message": f"Missing commands: {', '.join(missing_commands)}"}
            results["overall_status"] = False
        else:
            results["tests"]["command_files"] = {"status": True, "message": f"All {len(command_files)} command files present"}
        
        # Test 3: Validate command syntax
        syntax_errors = []
        
        for command_file in commands_dir.glob("*.md"):
            try:
                with open(command_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Basic validation
                if not content.startswith('#'):
                    syntax_errors.append(f"{command_file.name}: Not a valid markdown file")
                elif f"/{command_file.stem}" not in content:
                    syntax_errors.append(f"{command_file.name}: Command name not found in content")
            
            except Exception as e:
                syntax_errors.append(f"{command_file.name}: Read error: {e}")
        
        if syntax_errors:
            results["tests"]["command_syntax"] = {"status": False, "message": f"Syntax errors: {'; '.join(syntax_errors[:3])}"}
            results["overall_status"] = False
        else:
            results["tests"]["command_syntax"] = {"status": True, "message": "Command syntax validation passed"}
        
        if results["overall_status"]:
            self.log_success("Commands suite validation passed")
        else:
            self.log_error("Commands suite validation failed")
        
        return results["overall_status"], results
    
    def validate_mcp_servers(self) -> Tuple[bool, Dict[str, Any]]:
        """Validate MCP servers installation."""
        self.log_info("Validating MCP servers...")
        
        results = {
            "component": "mcp",
            "tests": {},
            "overall_status": True
        }
        
        # Test 1: Check if Claude Code is available
        if not self.system_validator.check_command_exists("claude"):
            results["tests"]["claude_availability"] = {"status": False, "message": "Claude Code CLI not found"}
            results["overall_status"] = False
            return results["overall_status"], results
        else:
            results["tests"]["claude_availability"] = {"status": True, "message": "Claude Code CLI available"}
        
        # Test 2: Check MCP server list
        try:
            result = subprocess.run(
                ["claude", "mcp", "list", "-s", "user"],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                servers_output = result.stdout
                mcp_config = self.feature_config.get("mcp", {})
                components = mcp_config.get("components", {})
                
                installed_servers = []
                missing_servers = []
                
                for server_id in components.keys():
                    if server_id in servers_output:
                        installed_servers.append(server_id)
                    else:
                        missing_servers.append(server_id)
                
                if installed_servers:
                    results["tests"]["server_installation"] = {"status": True, "message": f"Installed servers: {', '.join(installed_servers)}"}
                
                if missing_servers:
                    results["tests"]["missing_servers"] = {"status": False, "message": f"Missing servers: {', '.join(missing_servers)}"}
                    # Don't fail overall validation for missing MCP servers as they're optional
                
            else:
                results["tests"]["server_list"] = {"status": False, "message": "Could not list MCP servers"}
                results["overall_status"] = False
        
        except subprocess.TimeoutExpired:
            results["tests"]["server_list"] = {"status": False, "message": "Timeout listing MCP servers"}
            results["overall_status"] = False
        except Exception as e:
            results["tests"]["server_list"] = {"status": False, "message": f"Error listing MCP servers: {e}"}
            results["overall_status"] = False
        
        if results["overall_status"]:
            self.log_success("MCP servers validation passed")
        else:
            self.log_warning("MCP servers validation completed with warnings")
        
        return results["overall_status"], results
    
    def validate_system_integration(self) -> Tuple[bool, Dict[str, Any]]:
        """Validate system integration and environment."""
        self.log_info("Validating system integration...")
        
        results = {
            "component": "system",
            "tests": {},
            "overall_status": True
        }
        
        # Test 1: Check environment variables
        settings_file = self.claude_dir / "settings.json"
        if settings_file.exists():
            try:
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
                
                env_vars = settings.get("env", {})
                missing_vars = []
                
                for var_name, var_value in env_vars.items():
                    if var_name not in os.environ:
                        missing_vars.append(var_name)
                
                if missing_vars:
                    results["tests"]["environment_vars"] = {"status": False, "message": f"Missing env vars: {', '.join(missing_vars)}"}
                else:
                    results["tests"]["environment_vars"] = {"status": True, "message": "Environment variables configured"}
            
            except Exception as e:
                results["tests"]["environment_vars"] = {"status": False, "message": f"Env var check error: {e}"}
        
        # Test 2: Check file permissions
        permission_errors = []
        
        for path in [self.claude_dir, self.claude_dir / "hooks", self.claude_dir / "commands"]:
            if path.exists():
                if not os.access(path, os.R_OK | os.W_OK):
                    permission_errors.append(str(path))
        
        if permission_errors:
            results["tests"]["file_permissions"] = {"status": False, "message": f"Permission issues: {', '.join(permission_errors)}"}
            results["overall_status"] = False
        else:
            results["tests"]["file_permissions"] = {"status": True, "message": "File permissions OK"}
        
        # Test 3: Check Python path for hooks
        hooks_dir = self.claude_dir / "hooks"
        if hooks_dir.exists():
            hooks_dir_str = str(hooks_dir)
            if hooks_dir_str not in sys.path:
                python_path = os.environ.get("PYTHONPATH", "")
                if hooks_dir_str not in python_path:
                    results["tests"]["python_path"] = {"status": False, "message": "Hooks directory not in Python path"}
                else:
                    results["tests"]["python_path"] = {"status": True, "message": "Python path configured"}
            else:
                results["tests"]["python_path"] = {"status": True, "message": "Hooks in current Python path"}
        
        if results["overall_status"]:
            self.log_success("System integration validation passed")
        else:
            self.log_error("System integration validation failed")
        
        return results["overall_status"], results
    
    def run_comprehensive_validation(self) -> bool:
        """Run comprehensive validation of all components."""
        self.log_info("Starting comprehensive post-installation validation...")
        
        # Define validation functions
        validation_functions = [
            ("Core Framework", self.validate_core_framework),
            ("Hook System", self.validate_hook_system),
            ("Commands Suite", self.validate_commands_suite),
            ("MCP Servers", self.validate_mcp_servers),
            ("System Integration", self.validate_system_integration)
        ]
        
        self.progress.start("Running validation tests", len(validation_functions))
        
        overall_success = True
        
        for i, (component_name, validation_func) in enumerate(validation_functions):
            try:
                success, results = validation_func()
                self.validation_results[component_name.lower().replace(" ", "_")] = results
                
                if not success:
                    overall_success = False
                
                self.progress.update(1, f"Validated {component_name}")
            
            except Exception as e:
                self.log_error(f"Validation error for {component_name}: {e}")
                overall_success = False
                self.progress.update(1, f"Failed {component_name}")
        
        self.progress.finish()
        
        return overall_success
    
    def generate_validation_report(self) -> str:
        """Generate detailed validation report."""
        report_lines = []
        report_lines.append("SuperClaude Framework v3.0 - Post-Installation Validation Report")
        report_lines.append("=" * 70)
        report_lines.append("")
        
        overall_status = "PASSED"
        total_tests = 0
        passed_tests = 0
        
        for component_key, results in self.validation_results.items():
            component_name = results["component"].title()
            component_status = "PASSED" if results["overall_status"] else "FAILED"
            
            if not results["overall_status"]:
                overall_status = "FAILED"
            
            report_lines.append(f"{component_name}: {component_status}")
            
            for test_name, test_result in results["tests"].items():
                total_tests += 1
                status_symbol = "✓" if test_result["status"] else "✗"
                
                if test_result["status"]:
                    passed_tests += 1
                
                report_lines.append(f"  {status_symbol} {test_name}: {test_result['message']}")
            
            report_lines.append("")
        
        report_lines.append(f"Overall Status: {overall_status}")
        report_lines.append(f"Tests Passed: {passed_tests}/{total_tests}")
        
        return "\n".join(report_lines)
    
    def save_validation_report(self, report_file: Optional[Path] = None):
        """Save validation report to file."""
        if report_file is None:
            report_file = self.claude_dir / "validation_report.txt"
        
        try:
            report_content = self.generate_validation_report()
            with open(report_file, 'w') as f:
                f.write(report_content)
            
            self.log_success(f"Validation report saved to {report_file}")
        except Exception as e:
            self.log_error(f"Failed to save validation report: {e}")
    
    def save_integrity_manifest(self):
        """Save integrity manifest for installed files."""
        manifest_file = self.claude_dir / "integrity_manifest.json"
        
        try:
            # Generate manifests for key directories
            manifests = {
                "hooks": self._generate_integrity_manifest(self.claude_dir / "hooks"),
                "commands": self._generate_integrity_manifest(self.claude_dir / "commands"),
                "timestamp": str(Path().stat().st_mtime)
            }
            
            with open(manifest_file, 'w') as f:
                json.dump(manifests, f, indent=2)
            
            self.log_success(f"Integrity manifest saved to {manifest_file}")
        
        except Exception as e:
            self.log_error(f"Failed to save integrity manifest: {e}")
    
    def verify_integrity_manifest(self) -> bool:
        """Verify files against saved integrity manifest.
        
        Returns:
            True if all files match manifest, False otherwise
        """
        manifest_file = self.claude_dir / "integrity_manifest.json"
        
        if not manifest_file.exists():
            self.log_warning("No integrity manifest found")
            return True  # Don't fail if no manifest exists
        
        try:
            with open(manifest_file, 'r') as f:
                manifests = json.load(f)
            
            all_valid = True
            
            # Verify hooks
            if "hooks" in manifests:
                hooks_dir = self.claude_dir / "hooks"
                for rel_path, expected_hash in manifests["hooks"].items():
                    file_path = hooks_dir / rel_path
                    if not self._verify_file_integrity(file_path, expected_hash):
                        self.log_error(f"Integrity check failed for hook: {rel_path}")
                        all_valid = False
            
            # Verify commands
            if "commands" in manifests:
                commands_dir = self.claude_dir / "commands"
                for rel_path, expected_hash in manifests["commands"].items():
                    file_path = commands_dir / rel_path
                    if not self._verify_file_integrity(file_path, expected_hash):
                        self.log_error(f"Integrity check failed for command: {rel_path}")
                        all_valid = False
            
            return all_valid
        
        except Exception as e:
            self.log_error(f"Failed to verify integrity manifest: {e}")
            return False
    
    def show_validation_summary(self):
        """Show validation summary."""
        print(f"\n{self.colors.header('Post-Installation Validation Summary')}")
        print("=" * 50)
        
        overall_success = all(results["overall_status"] for results in self.validation_results.values())
        
        for component_key, results in self.validation_results.items():
            component_name = results["component"].title()
            
            if results["overall_status"]:
                print(f"  {self.colors.success('✓')} {component_name}")
            else:
                print(f"  {self.colors.error('✗')} {component_name}")
                
                # Show failed tests
                for test_name, test_result in results["tests"].items():
                    if not test_result["status"]:
                        print(f"    - {test_result['message']}")
        
        print()
        
        if overall_success:
            print(f"{self.colors.success('🎉 All validation tests passed!')}")
            print("SuperClaude Framework is ready for use.")
        else:
            print(f"{self.colors.error('⚠️  Some validation tests failed.')}")
            print("Please review the issues above and re-run validation.")
        
        print(f"\nDetailed report: {self.claude_dir / 'validation_report.txt'}")
    
    def validate(self) -> bool:
        """Run complete validation process."""
        try:
            # Run comprehensive validation
            success = self.run_comprehensive_validation()
            
            # Verify integrity if manifest exists
            if not self.verify_integrity_manifest():
                self.log_warning("File integrity verification failed")
                success = False
            
            # Generate and save report
            self.save_validation_report()
            
            # Save integrity manifest for future checks
            if success:
                self.save_integrity_manifest()
            
            # Show summary
            self.show_validation_summary()
            
            return success
            
        except KeyboardInterrupt:
            print("\n\nValidation interrupted by user.")
            return False
        except Exception as e:
            self.log_error(f"Unexpected error during validation: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="SuperClaude Post-Installation Validator")
    parser.add_argument("--project-dir", required=True, 
                       help="SuperClaude project directory")
    parser.add_argument("--report-file", type=Path,
                       help="Custom path for validation report")
    
    args = parser.parse_args()
    
    validator = PostInstallValidator(args.project_dir)
    success = validator.validate()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())