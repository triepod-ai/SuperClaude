#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Requirements Checker

Parses REQUIREMENTS.txt and validates system requirements.
Provides interactive requirement installation assistance.
"""

import os
import sys
import platform
import subprocess
import configparser
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Add utils to path for imports
utils_path = str(Path(__file__).parent.parent / "utils")
sys.path.insert(0, utils_path)

try:
    from colors import Colors
    from validation import SystemValidator
    from menu import ConfirmationDialog
except ImportError:
    # Fallback if utils not available
    print("Warning: Utils not available, using basic functionality")
    class Colors:
        def __init__(self): pass
        def info(self, text): return f"[INFO] {text}"
        def success(self, text): return f"[✓] {text}"
        def warning(self, text): return f"[!] {text}"
        def error(self, text): return f"[✗] {text}"
        def muted(self, text): return text
        def header(self, text): return text
    
    class SystemValidator:
        def __init__(self): pass
        def check_command_exists(self, cmd): 
            import shutil
            return shutil.which(cmd) is not None
        def get_command_version(self, cmd, flag="--version"):
            try:
                import subprocess
                result = subprocess.run([cmd, flag], capture_output=True, text=True, timeout=10)
                return result.stdout.strip() if result.returncode == 0 else None
            except: return None
        def check_python_modules(self, modules):
            results = {}
            for module in modules:
                try:
                    __import__(module)
                    results[module] = True
                except ImportError:
                    results[module] = False
            return results
        def validate_version(self, current, minimum):
            try:
                import re
                def parse_version(v):
                    v = re.sub(r'^[^\d]*', '', v)
                    parts = v.split('.')
                    return [int(part) for part in parts if part.isdigit()]
                
                current_parts = parse_version(current)
                min_parts = parse_version(minimum)
                
                max_len = max(len(current_parts), len(min_parts))
                current_parts.extend([0] * (max_len - len(current_parts)))
                min_parts.extend([0] * (max_len - len(min_parts)))
                
                return current_parts >= min_parts
            except: return False
    
    class ConfirmationDialog:
        def __init__(self): pass
        def confirm(self, message, default=True):
            prompt = f"{message} [Y/n]: " if default else f"{message} [y/N]: "
            try:
                choice = input(prompt).strip().lower()
                if not choice: return default
                return choice in ['y', 'yes']
            except: return False


class RequirementsChecker:
    """Requirements checker and installer assistant."""
    
    def __init__(self, project_dir: str):
        """Initialize requirements checker.
        
        Args:
            project_dir: SuperClaude project directory
        """
        self.project_dir = Path(project_dir)
        self.requirements_file = self.project_dir / "REQUIREMENTS.txt"
        
        # Initialize utilities
        self.colors = Colors()
        self.validator = SystemValidator()
        self.confirm = ConfirmationDialog()
        
        # Load requirements
        self.requirements = self._load_requirements()
        self.check_results: Dict[str, Dict[str, Any]] = {}
        
    def _load_requirements(self) -> Dict[str, Any]:
        """Load requirements from REQUIREMENTS.txt."""
        if not self.requirements_file.exists():
            self.log_error(f"REQUIREMENTS.txt not found: {self.requirements_file}")
            return {}
        
        try:
            # Parse the requirements file as INI format
            config = configparser.ConfigParser()
            config.read(self.requirements_file)
            
            requirements = {}
            
            # Load sections
            for section_name in config.sections():
                requirements[section_name] = dict(config.items(section_name))
            
            # Load default section (no section header)
            if config.defaults():
                requirements['general'] = dict(config.defaults())
            
            # Parse general requirements that are not in sections
            with open(self.requirements_file, 'r') as f:
                lines = f.readlines()
            
            general_reqs = {}
            current_section = None
            
            for line in lines:
                line = line.strip()
                if line.startswith('#') or not line:
                    continue
                
                if line.startswith('[') and line.endswith(']'):
                    current_section = line[1:-1]
                    continue
                
                if current_section is None and '=' in line:
                    key, value = line.split('=', 1)
                    general_reqs[key.strip()] = value.strip()
            
            if general_reqs:
                requirements['general'] = general_reqs
            
            return requirements
            
        except Exception as e:
            self.log_error(f"Failed to load requirements: {e}")
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
    
    def check_system_requirements(self) -> bool:
        """Check core system requirements."""
        self.log_info("Checking system requirements...")
        
        general_reqs = self.requirements.get('general', {})
        
        # Check Python version
        python_min = general_reqs.get('python_version', '3.12')
        python_result = self._check_python_version(python_min)
        self.check_results['python'] = python_result
        
        # Check Node.js version
        node_min = general_reqs.get('node_version', '18')
        node_result = self._check_node_version(node_min)
        self.check_results['node'] = node_result
        
        # Check Bash version
        bash_min = general_reqs.get('bash_version', '4.0')
        bash_result = self._check_bash_version(bash_min)
        self.check_results['bash'] = bash_result
        
        # Check required applications
        claude_result = self._check_claude_code()
        self.check_results['claude_code'] = claude_result
        
        git_result = self._check_git()
        self.check_results['git'] = git_result
        
        npm_result = self._check_npm()
        self.check_results['npm'] = npm_result
        
        # Check Python modules
        modules_result = self._check_python_modules()
        self.check_results['python_modules'] = modules_result
        
        # Check permissions
        permissions_result = self._check_permissions()
        self.check_results['permissions'] = permissions_result
        
        # Determine overall status
        failed_checks = [name for name, result in self.check_results.items() 
                        if not result['status'] and result.get('required', True)]
        
        return len(failed_checks) == 0
    
    def _check_python_version(self, min_version: str) -> Dict[str, Any]:
        """Check Python version."""
        if not self.validator.check_command_exists('python3'):
            return {
                'status': False,
                'required': True,
                'message': 'Python 3 not found',
                'install_hint': 'Install Python 3.12+ from https://python.org'
            }
        
        version_output = self.validator.get_command_version('python3')
        if not version_output:
            return {
                'status': False,
                'required': True,
                'message': 'Could not determine Python version',
                'install_hint': 'Ensure Python 3.12+ is properly installed'
            }
        
        # Extract version number
        import re
        version_match = re.search(r'(\d+\.\d+\.\d+)', version_output)
        if not version_match:
            return {
                'status': False,
                'required': True,
                'message': f'Could not parse Python version: {version_output}',
                'install_hint': 'Ensure Python 3.12+ is properly installed'
            }
        
        current_version = version_match.group(1)
        
        if self.validator.validate_version(current_version, min_version):
            return {
                'status': True,
                'required': True,
                'message': f'Python {current_version} (>= {min_version})',
                'version': current_version
            }
        else:
            return {
                'status': False,
                'required': True,
                'message': f'Python {current_version} found, but {min_version}+ required',
                'install_hint': f'Upgrade Python to {min_version}+',
                'version': current_version
            }
    
    def _check_node_version(self, min_version: str) -> Dict[str, Any]:
        """Check Node.js version."""
        if not self.validator.check_command_exists('node'):
            return {
                'status': False,
                'required': True,
                'message': 'Node.js not found',
                'install_hint': 'Install Node.js 18+ from https://nodejs.org'
            }
        
        version_output = self.validator.get_command_version('node', '-v')
        if not version_output:
            return {
                'status': False,
                'required': True,
                'message': 'Could not determine Node.js version',
                'install_hint': 'Ensure Node.js 18+ is properly installed'
            }
        
        # Remove 'v' prefix and extract version
        current_version = version_output.lstrip('v').split()[0]
        
        if self.validator.validate_version(current_version, min_version):
            return {
                'status': True,
                'required': True,
                'message': f'Node.js {current_version} (>= {min_version})',
                'version': current_version
            }
        else:
            return {
                'status': False,
                'required': True,
                'message': f'Node.js {current_version} found, but {min_version}+ required',
                'install_hint': f'Upgrade Node.js to {min_version}+',
                'version': current_version
            }
    
    def _check_bash_version(self, min_version: str) -> Dict[str, Any]:
        """Check Bash version."""
        version_output = self.validator.get_command_version('bash', '--version')
        if not version_output:
            return {
                'status': False,
                'required': True,
                'message': 'Bash not found or version unavailable',
                'install_hint': 'Ensure Bash 4.0+ is available'
            }
        
        # Extract version from first line
        import re
        version_match = re.search(r'version (\d+\.\d+)', version_output.split('\n')[0])
        if not version_match:
            return {
                'status': True,  # Assume OK if we can't parse but bash exists
                'required': True,
                'message': f'Bash available (version parsing failed)',
                'version': 'unknown'
            }
        
        current_version = version_match.group(1)
        
        if self.validator.validate_version(current_version, min_version):
            return {
                'status': True,
                'required': True,
                'message': f'Bash {current_version} (>= {min_version})',
                'version': current_version
            }
        else:
            return {
                'status': False,
                'required': True,
                'message': f'Bash {current_version} found, but {min_version}+ required',
                'install_hint': f'Update Bash to {min_version}+',
                'version': current_version
            }
    
    def _check_claude_code(self) -> Dict[str, Any]:
        """Check Claude Code CLI."""
        if not self.validator.check_command_exists('claude'):
            return {
                'status': False,
                'required': True,
                'message': 'Claude Code CLI not found',
                'install_hint': 'Install Claude Code from https://docs.anthropic.com/claude-code'
            }
        
        version_output = self.validator.get_command_version('claude')
        if version_output:
            return {
                'status': True,
                'required': True,
                'message': f'Claude Code available: {version_output.split()[0] if version_output else "version unknown"}',
                'version': version_output
            }
        else:
            return {
                'status': True,
                'required': True,
                'message': 'Claude Code available (version check failed)',
                'version': 'unknown'
            }
    
    def _check_git(self) -> Dict[str, Any]:
        """Check Git."""
        if not self.validator.check_command_exists('git'):
            return {
                'status': False,
                'required': False,
                'message': 'Git not found (recommended)',
                'install_hint': 'Install Git for version control'
            }
        
        version_output = self.validator.get_command_version('git')
        return {
            'status': True,
            'required': False,
            'message': f'Git available: {version_output.split()[2] if version_output else "version unknown"}',
            'version': version_output
        }
    
    def _check_npm(self) -> Dict[str, Any]:
        """Check npm."""
        if not self.validator.check_command_exists('npm'):
            return {
                'status': False,
                'required': True,
                'message': 'npm not found (required for MCP servers)',
                'install_hint': 'npm should come with Node.js installation'
            }
        
        version_output = self.validator.get_command_version('npm')
        return {
            'status': True,
            'required': True,
            'message': f'npm available: {version_output.split()[0] if version_output else "version unknown"}',
            'version': version_output
        }
    
    def _check_python_modules(self) -> Dict[str, Any]:
        """Check Python standard library modules."""
        general_reqs = self.requirements.get('general', {})
        modules_str = general_reqs.get('python_modules', '')
        
        if not modules_str:
            return {
                'status': True,
                'required': True,
                'message': 'No specific modules to check',
                'modules': {}
            }
        
        modules = [m.strip() for m in modules_str.split(',')]
        module_results = self.validator.check_python_modules(modules)
        
        missing_modules = [m for m, available in module_results.items() if not available]
        
        if missing_modules:
            return {
                'status': False,
                'required': True,
                'message': f'Missing Python modules: {", ".join(missing_modules)}',
                'install_hint': 'These should be included with Python standard library',
                'modules': module_results
            }
        else:
            return {
                'status': True,
                'required': True,
                'message': f'All {len(modules)} Python modules available',
                'modules': module_results
            }
    
    def _check_permissions(self) -> Dict[str, Any]:
        """Check file system permissions."""
        claude_dir = Path.home() / ".claude"
        
        # Test creating directory and file
        try:
            claude_dir.mkdir(parents=True, exist_ok=True)
            test_file = claude_dir / ".test_permissions"
            test_file.write_text("test")
            test_file.unlink()
            
            return {
                'status': True,
                'required': True,
                'message': 'File system permissions OK',
                'path': str(claude_dir)
            }
        
        except Exception as e:
            return {
                'status': False,
                'required': True,
                'message': f'Permission error: {e}',
                'install_hint': f'Ensure write access to {claude_dir}',
                'path': str(claude_dir)
            }
    
    def show_requirements_summary(self):
        """Show requirements check summary."""
        print(f"\n{self.colors.header('System Requirements Check')}")
        print("=" * 50)
        
        # Group by status
        passed = []
        failed_required = []
        failed_optional = []
        
        for name, result in self.check_results.items():
            if result['status']:
                passed.append((name, result))
            elif result.get('required', True):
                failed_required.append((name, result))
            else:
                failed_optional.append((name, result))
        
        # Show passed requirements
        if passed:
            print(f"\n{self.colors.success('✓ Requirements Met:')}")
            for name, result in passed:
                print(f"  {self.colors.success('✓')} {result['message']}")
        
        # Show failed required requirements
        if failed_required:
            print(f"\n{self.colors.error('✗ Missing Required:')}")
            for name, result in failed_required:
                print(f"  {self.colors.error('✗')} {result['message']}")
                if 'install_hint' in result:
                    print(f"    {self.colors.muted('Hint:')} {result['install_hint']}")
        
        # Show failed optional requirements
        if failed_optional:
            print(f"\n{self.colors.warning('! Optional Missing:')}")
            for name, result in failed_optional:
                print(f"  {self.colors.warning('!')} {result['message']}")
                if 'install_hint' in result:
                    print(f"    {self.colors.muted('Hint:')} {result['install_hint']}")
        
        print()
        
        if failed_required:
            print(f"{self.colors.error('Installation cannot continue without required components.')}")
            return False
        elif failed_optional:
            print(f"{self.colors.warning('Some optional components are missing.')}")
            return self.confirm.confirm("Continue with installation anyway?")
        else:
            print(f"{self.colors.success('All requirements met! Ready to proceed.')}")
            return True
    
    def offer_installation_assistance(self) -> bool:
        """Offer to help install missing requirements."""
        failed_required = [
            (name, result) for name, result in self.check_results.items()
            if not result['status'] and result.get('required', True)
        ]
        
        if not failed_required:
            return True
        
        print(f"\n{self.colors.header('Installation Assistance')}")
        print("=" * 50)
        
        # Detect OS for specific instructions
        os_name = platform.system().lower()
        
        print(f"Detected OS: {platform.system()} {platform.release()}")
        
        for name, result in failed_required:
            print(f"\n{self.colors.error('Missing:')} {result['message']}")
            
            if name == 'python':
                self._show_python_install_instructions(os_name)
            elif name == 'node':
                self._show_node_install_instructions(os_name)
            elif name == 'claude_code':
                self._show_claude_install_instructions()
            elif name == 'npm':
                print("  npm should be included with Node.js installation")
            
            print()
        
        return self.confirm.confirm("After installing missing requirements, continue?")
    
    def _show_python_install_instructions(self, os_name: str):
        """Show Python installation instructions."""
        print(f"  {self.colors.info('Python 3.12+ Installation:')}")
        
        if os_name == 'linux':
            print("    Ubuntu/Debian: sudo apt update && sudo apt install python3.12")
            print("    CentOS/RHEL: sudo yum install python3.12")
            print("    Arch: sudo pacman -S python")
        elif os_name == 'darwin':
            print("    Homebrew: brew install python@3.12")
            print("    MacPorts: sudo port install python312")
        elif os_name == 'windows':
            print("    Download from: https://www.python.org/downloads/")
            print("    Or use Windows Store: Microsoft Store → Python 3.12")
        
        print("    Official: https://www.python.org/downloads/")
    
    def _show_node_install_instructions(self, os_name: str):
        """Show Node.js installation instructions."""
        print(f"  {self.colors.info('Node.js 18+ Installation:')}")
        
        if os_name == 'linux':
            print("    Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -")
            print("                    sudo apt-get install -y nodejs")
            print("    Using snap: sudo snap install node --classic")
        elif os_name == 'darwin':
            print("    Homebrew: brew install node")
            print("    MacPorts: sudo port install nodejs18")
        elif os_name == 'windows':
            print("    Download from: https://nodejs.org/")
            print("    Or use Chocolatey: choco install nodejs")
        
        print("    Official: https://nodejs.org/")
        print("    Node Version Manager (nvm): https://github.com/nvm-sh/nvm")
    
    def _show_claude_install_instructions(self):
        """Show Claude Code installation instructions."""
        print(f"  {self.colors.info('Claude Code Installation:')}")
        print("    Official docs: https://docs.anthropic.com/claude-code")
        print("    npm: npm install -g @anthropic/claude-code")
        print("    After install: claude login")
    
    def check(self) -> bool:
        """Run complete requirements check."""
        try:
            self.log_info("Starting system requirements check...")
            
            # Check system requirements
            requirements_met = self.check_system_requirements()
            
            # Show summary
            proceed = self.show_requirements_summary()
            
            if not requirements_met and not proceed:
                # Offer installation assistance
                proceed = self.offer_installation_assistance()
            
            return proceed
            
        except KeyboardInterrupt:
            print("\n\nRequirements check interrupted by user.")
            return False
        except Exception as e:
            self.log_error(f"Unexpected error during requirements check: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="SuperClaude Requirements Checker")
    parser.add_argument("--project-dir", required=True, 
                       help="SuperClaude project directory")
    parser.add_argument("--no-interaction", action="store_true",
                       help="Run without user interaction")
    
    args = parser.parse_args()
    
    checker = RequirementsChecker(args.project_dir)
    success = checker.check()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())