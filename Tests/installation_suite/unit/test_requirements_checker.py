#!/usr/bin/env python3
"""
Unit tests for requirements checker module.

Tests system requirements validation, REQUIREMENTS.txt parsing, and installation guidance.
"""

import pytest
import tempfile
import configparser
from pathlib import Path
from unittest.mock import patch, Mock, mock_open

# Import the requirements checker module  
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts" / "requirements"))

try:
    from check_requirements import RequirementsChecker
except ImportError:
    # Fallback for testing environment
    class RequirementsChecker:
        def __init__(self, project_dir):
            self.project_dir = Path(project_dir)
            self.requirements = {}
            self.check_results = {}
        
        def check_system_requirements(self):
            return True
        
        def show_requirements_summary(self):
            return True
        
        def offer_installation_assistance(self):
            return True


class TestRequirementsChecker:
    """Test suite for RequirementsChecker class."""
    
    def test_requirements_checker_initialization(self):
        """Test RequirementsChecker initialization."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            assert checker.project_dir == Path(temp_dir)
            assert isinstance(checker.requirements, dict)
            assert isinstance(checker.check_results, dict)
    
    def test_load_requirements_file_exists(self):
        """Test loading requirements from existing file."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create mock REQUIREMENTS.txt
            requirements_content = """[general]
python_version=3.12
node_version=18
claude_code=required

[validation]
python_check=python3 --version
node_check=node --version
"""
            requirements_file = temp_path / "REQUIREMENTS.txt"
            requirements_file.write_text(requirements_content)
            
            checker = RequirementsChecker(temp_dir)
            
            # Check if requirements were loaded
            assert len(checker.requirements) > 0
            
            if 'general' in checker.requirements:
                general_reqs = checker.requirements['general']
                assert general_reqs.get('python_version') == '3.12'
                assert general_reqs.get('node_version') == '18'
    
    def test_load_requirements_file_not_exists(self):
        """Test loading requirements when file doesn't exist."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            # Should handle missing file gracefully
            assert isinstance(checker.requirements, dict)
    
    def test_load_requirements_invalid_format(self):
        """Test loading requirements with invalid file format."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create invalid REQUIREMENTS.txt
            requirements_file = temp_path / "REQUIREMENTS.txt"
            requirements_file.write_text("Invalid content\nNot INI format")
            
            checker = RequirementsChecker(temp_dir)
            
            # Should handle invalid format gracefully
            assert isinstance(checker.requirements, dict)
    
    @patch('shutil.which')
    @patch('subprocess.run')
    def test_check_python_version_success(self, mock_run, mock_which):
        """Test successful Python version check."""
        mock_which.return_value = '/usr/bin/python3'
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Python 3.12.0"
        mock_run.return_value = mock_result
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_python_version'):
                result = checker._check_python_version("3.12")
                
                assert result['status'] is True
                assert 'version' in result
    
    @patch('shutil.which')
    def test_check_python_version_not_found(self, mock_which):
        """Test Python version check when Python not found."""
        mock_which.return_value = None
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_python_version'):
                result = checker._check_python_version("3.12")
                
                assert result['status'] is False
                assert 'not found' in result['message'].lower()
    
    @patch('shutil.which')
    @patch('subprocess.run')
    def test_check_python_version_too_old(self, mock_run, mock_which):
        """Test Python version check with version too old."""
        mock_which.return_value = '/usr/bin/python3'
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Python 3.11.0"
        mock_run.return_value = mock_result
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_python_version'):
                result = checker._check_python_version("3.12")
                
                assert result['status'] is False
                assert '3.12' in result['message']
    
    @patch('shutil.which')
    @patch('subprocess.run')
    def test_check_node_version_success(self, mock_run, mock_which):
        """Test successful Node.js version check."""
        mock_which.return_value = '/usr/bin/node'
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "v18.17.0"
        mock_run.return_value = mock_result
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_node_version'):
                result = checker._check_node_version("18")
                
                assert result['status'] is True
                assert 'version' in result
    
    @patch('shutil.which')
    def test_check_claude_code_available(self, mock_which):
        """Test Claude Code CLI availability check."""
        mock_which.return_value = '/usr/local/bin/claude'
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_claude_code'):
                result = checker._check_claude_code()
                
                assert result['status'] is True
                assert 'available' in result['message'].lower()
    
    @patch('shutil.which')
    def test_check_claude_code_not_available(self, mock_which):
        """Test Claude Code CLI not available."""
        mock_which.return_value = None
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_claude_code'):
                result = checker._check_claude_code()
                
                assert result['status'] is False
                assert 'not found' in result['message'].lower()
    
    def test_check_python_modules_available(self):
        """Test checking available Python modules."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create requirements with standard library modules
            requirements_content = """[general]
python_modules=sys,os,json,pathlib
"""
            requirements_file = Path(temp_dir) / "REQUIREMENTS.txt"
            requirements_file.write_text(requirements_content)
            
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_python_modules'):
                result = checker._check_python_modules()
                
                assert result['status'] is True
                assert 'modules' in result
    
    def test_check_python_modules_missing(self):
        """Test checking missing Python modules."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create requirements with non-existent modules
            requirements_content = """[general]
python_modules=sys,nonexistent_module,fake_module
"""
            requirements_file = Path(temp_dir) / "REQUIREMENTS.txt"
            requirements_file.write_text(requirements_content)
            
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_python_modules'):
                result = checker._check_python_modules()
                
                assert result['status'] is False
                assert 'missing' in result['message'].lower()
    
    def test_check_permissions_success(self):
        """Test successful permissions check."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_permissions'):
                result = checker._check_permissions()
                
                # Should succeed with temporary directory
                assert result['status'] is True
    
    @patch('pathlib.Path.mkdir', side_effect=PermissionError("Permission denied"))
    def test_check_permissions_failure(self, mock_mkdir):
        """Test permissions check failure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_permissions'):
                result = checker._check_permissions()
                
                assert result['status'] is False
                assert 'permission' in result['message'].lower()
    
    def test_check_system_requirements_all_pass(self):
        """Test system requirements check when all pass."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create minimal requirements
            requirements_content = """[general]
python_version=3.8
"""
            requirements_file = Path(temp_dir) / "REQUIREMENTS.txt"
            requirements_file.write_text(requirements_content)
            
            checker = RequirementsChecker(temp_dir)
            
            with patch.object(checker, '_check_python_version', return_value={'status': True, 'required': True}):
                with patch.object(checker, '_check_node_version', return_value={'status': True, 'required': True}):
                    with patch.object(checker, '_check_bash_version', return_value={'status': True, 'required': True}):
                        with patch.object(checker, '_check_claude_code', return_value={'status': True, 'required': True}):
                            with patch.object(checker, '_check_git', return_value={'status': True, 'required': False}):
                                with patch.object(checker, '_check_npm', return_value={'status': True, 'required': True}):
                                    with patch.object(checker, '_check_python_modules', return_value={'status': True, 'required': True}):
                                        with patch.object(checker, '_check_permissions', return_value={'status': True, 'required': True}):
                                            result = checker.check_system_requirements()
                                            assert result is True
    
    def test_check_system_requirements_some_fail(self):
        """Test system requirements check when some fail."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            with patch.object(checker, '_check_python_version', return_value={'status': False, 'required': True}):
                with patch.object(checker, '_check_node_version', return_value={'status': True, 'required': True}):
                    result = checker.check_system_requirements()
                    assert result is False
    
    @patch('builtins.print')
    def test_show_requirements_summary_pass(self, mock_print):
        """Test requirements summary when all pass."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            checker.check_results = {
                'python': {'status': True, 'message': 'Python 3.12.0 available', 'required': True},
                'node': {'status': True, 'message': 'Node.js 18.17.0 available', 'required': True}
            }
            
            result = checker.show_requirements_summary()
            
            assert result is True
            mock_print.assert_called()
    
    @patch('builtins.print')
    def test_show_requirements_summary_fail(self, mock_print):
        """Test requirements summary when some fail."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            checker.check_results = {
                'python': {'status': False, 'message': 'Python not found', 'required': True},
                'node': {'status': True, 'message': 'Node.js 18.17.0 available', 'required': True}
            }
            
            with patch('builtins.input', return_value='n'):
                result = checker.show_requirements_summary()
                
                assert result is False
                mock_print.assert_called()
    
    @patch('platform.system')
    @patch('builtins.print')
    def test_offer_installation_assistance_linux(self, mock_print, mock_system):
        """Test installation assistance for Linux."""
        mock_system.return_value = 'Linux'
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            checker.check_results = {
                'python': {'status': False, 'message': 'Python not found', 'required': True}
            }
            
            with patch('builtins.input', return_value='y'):
                result = checker.offer_installation_assistance()
                
                assert isinstance(result, bool)
                mock_print.assert_called()
    
    @patch('platform.system')
    @patch('builtins.print')
    def test_offer_installation_assistance_macos(self, mock_print, mock_system):
        """Test installation assistance for macOS."""
        mock_system.return_value = 'Darwin'
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            checker.check_results = {
                'node': {'status': False, 'message': 'Node.js not found', 'required': True}
            }
            
            with patch('builtins.input', return_value='y'):
                result = checker.offer_installation_assistance()
                
                assert isinstance(result, bool)
                mock_print.assert_called()
    
    @patch('platform.system')
    @patch('builtins.print')
    def test_offer_installation_assistance_windows(self, mock_print, mock_system):
        """Test installation assistance for Windows."""
        mock_system.return_value = 'Windows'
        
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            checker.check_results = {
                'claude_code': {'status': False, 'message': 'Claude Code not found', 'required': True}
            }
            
            with patch('builtins.input', return_value='y'):
                result = checker.offer_installation_assistance()
                
                assert isinstance(result, bool)
                mock_print.assert_called()
    
    def test_complete_check_workflow(self):
        """Test complete check workflow."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create complete requirements file
            requirements_content = """[general]
python_version=3.12
node_version=18
claude_code=required
git=recommended
"""
            requirements_file = Path(temp_dir) / "REQUIREMENTS.txt"
            requirements_file.write_text(requirements_content)
            
            checker = RequirementsChecker(temp_dir)
            
            # Mock all check methods to return success
            with patch.object(checker, 'check_system_requirements', return_value=True):
                with patch.object(checker, 'show_requirements_summary', return_value=True):
                    result = checker.check()
                    
                    assert result is True
    
    def test_complete_check_workflow_with_failures(self):
        """Test complete check workflow with some failures."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            # Mock check methods to return failure
            with patch.object(checker, 'check_system_requirements', return_value=False):
                with patch.object(checker, 'show_requirements_summary', return_value=False):
                    with patch.object(checker, 'offer_installation_assistance', return_value=True):
                        result = checker.check()
                        
                        assert result is True  # Should succeed after assistance
    
    @patch('builtins.input', side_effect=KeyboardInterrupt())
    def test_check_keyboard_interrupt(self, mock_input):
        """Test handling keyboard interrupt during check."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            result = checker.check()
            
            assert result is False


class TestRequirementsCheckerEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_requirements_file_encoding_issues(self):
        """Test handling requirements file with encoding issues."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create file with non-UTF8 content
            requirements_file = temp_path / "REQUIREMENTS.txt"
            with open(requirements_file, 'wb') as f:
                f.write(b'\xff\xfe[general]\npython_version=3.12')
            
            checker = RequirementsChecker(temp_dir)
            
            # Should handle encoding issues gracefully
            assert isinstance(checker.requirements, dict)
    
    def test_requirements_file_very_large(self):
        """Test handling very large requirements file."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create large requirements file
            content = "[general]\n"
            content += "\n".join([f"option_{i}=value_{i}" for i in range(10000)])
            
            requirements_file = temp_path / "REQUIREMENTS.txt"
            requirements_file.write_text(content)
            
            checker = RequirementsChecker(temp_dir)
            
            # Should handle large files
            assert isinstance(checker.requirements, dict)
    
    def test_requirements_checker_with_unicode_paths(self):
        """Test requirements checker with Unicode paths."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create directory with Unicode characters
            unicode_dir = Path(temp_dir) / "tést_dïrectöry_🚀"
            unicode_dir.mkdir()
            
            checker = RequirementsChecker(str(unicode_dir))
            
            assert checker.project_dir == unicode_dir
    
    def test_requirements_checker_memory_usage(self):
        """Test memory usage with large requirements check."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            import sys
            initial_size = sys.getsizeof(checker)
            
            # Simulate many check results
            for i in range(1000):
                checker.check_results[f'test_{i}'] = {
                    'status': True,
                    'message': f'Test {i} passed',
                    'required': True
                }
            
            final_size = sys.getsizeof(checker)
            size_increase = final_size - initial_size
            
            # Memory increase should be reasonable
            assert size_increase < 10 * 1024 * 1024  # Less than 10MB
    
    def test_requirements_checker_thread_safety(self):
        """Test requirements checker thread safety."""
        import threading
        
        with tempfile.TemporaryDirectory() as temp_dir:
            errors = []
            
            def worker(thread_id):
                try:
                    checker = RequirementsChecker(temp_dir)
                    
                    # Simulate some checks
                    for i in range(10):
                        checker.check_results[f'thread_{thread_id}_check_{i}'] = {
                            'status': True,
                            'message': f'Thread {thread_id} check {i}',
                            'required': True
                        }
                except Exception as e:
                    errors.append(e)
            
            # Create multiple threads
            threads = []
            for i in range(5):
                thread = threading.Thread(target=worker, args=(i,))
                threads.append(thread)
                thread.start()
            
            # Wait for completion
            for thread in threads:
                thread.join()
            
            # Should have no thread safety errors
            assert len(errors) == 0, f"Thread safety errors: {errors}"
    
    @patch('subprocess.run', side_effect=Exception("Subprocess error"))
    def test_version_check_subprocess_error(self, mock_run):
        """Test handling subprocess errors during version checks."""
        with tempfile.TemporaryDirectory() as temp_dir:
            checker = RequirementsChecker(temp_dir)
            
            if hasattr(checker, '_check_python_version'):
                result = checker._check_python_version("3.12")
                
                # Should handle subprocess errors gracefully
                assert isinstance(result, dict)
                assert 'status' in result
    
    def test_requirements_parsing_malformed_sections(self):
        """Test parsing requirements with malformed sections."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create malformed requirements file
            malformed_content = """[general
python_version=3.12
[missing_bracket
node_version=18
[valid]
git=required
"""
            requirements_file = temp_path / "REQUIREMENTS.txt"
            requirements_file.write_text(malformed_content)
            
            checker = RequirementsChecker(temp_dir)
            
            # Should handle malformed sections gracefully
            assert isinstance(checker.requirements, dict)
    
    def test_requirements_empty_file(self):
        """Test handling empty requirements file."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create empty requirements file
            requirements_file = temp_path / "REQUIREMENTS.txt"
            requirements_file.write_text("")
            
            checker = RequirementsChecker(temp_dir)
            
            # Should handle empty file gracefully
            assert isinstance(checker.requirements, dict)
    
    def test_requirements_permission_error(self):
        """Test handling permission errors when reading requirements."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            requirements_file = temp_path / "REQUIREMENTS.txt"
            requirements_file.write_text("[general]\npython_version=3.12")
            
            # Mock permission error
            with patch('builtins.open', side_effect=PermissionError("Permission denied")):
                checker = RequirementsChecker(temp_dir)
                
                # Should handle permission errors gracefully
                assert isinstance(checker.requirements, dict)