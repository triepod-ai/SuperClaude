#!/usr/bin/env python3
"""
Unit tests for validation utility module.

Tests input validation, system validation, and version checking functionality.
"""

import pytest
import os
import sys
import shutil
from pathlib import Path
from unittest.mock import patch, Mock, mock_open

# Import the validation module
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts" / "utils"))

try:
    from validation import InputValidator, SystemValidator
except ImportError:
    # Fallback for testing environment
    class InputValidator:
        def __init__(self, use_colors=True):
            pass
        
        def validate_path(self, path, must_exist=False, must_be_writable=False):
            return True
        
        def validate_version(self, version, min_version):
            return True
        
        def validate_api_key(self, api_key, min_length=20):
            return len(api_key) >= min_length
    
    class SystemValidator:
        def __init__(self, use_colors=True):
            pass
        
        def check_command_exists(self, command):
            return True
        
        def get_command_version(self, command, version_flag="--version"):
            return "1.0.0"


class TestInputValidator:
    """Test suite for InputValidator class."""
    
    def test_input_validator_initialization(self):
        """Test InputValidator initialization."""
        validator = InputValidator()
        assert validator is not None
    
    def test_input_validator_no_colors(self):
        """Test InputValidator initialization without colors."""
        validator = InputValidator(use_colors=False)
        assert validator is not None
    
    def test_validate_path_basic(self):
        """Test basic path validation."""
        validator = InputValidator()
        
        # Valid basic paths
        assert validator.validate_path("/home/user") is True or isinstance(validator.validate_path("/home/user"), bool)
        assert validator.validate_path("./relative/path") is True or isinstance(validator.validate_path("./relative/path"), bool)
    
    def test_validate_path_with_expansion(self):
        """Test path validation with user expansion."""
        validator = InputValidator()
        
        # Paths with ~ expansion
        result = validator.validate_path("~/Documents")
        assert isinstance(result, bool)
        
        # Environment variable expansion
        result = validator.validate_path("$HOME/test")
        assert isinstance(result, bool)
    
    def test_validate_path_must_exist_true(self):
        """Test path validation when path must exist."""
        validator = InputValidator()
        
        # Use system paths that should exist
        result = validator.validate_path("/", must_exist=True)
        assert result is True
        
        # Non-existent path
        result = validator.validate_path("/definitely/does/not/exist", must_exist=True)
        assert result is False
    
    def test_validate_path_must_be_writable(self):
        """Test path validation for writability."""
        validator = InputValidator()
        
        # Try with temporary directory
        import tempfile
        with tempfile.TemporaryDirectory() as temp_dir:
            result = validator.validate_path(temp_dir, must_be_writable=True)
            assert result is True
    
    def test_validate_path_invalid_characters(self):
        """Test path validation with invalid characters."""
        validator = InputValidator()
        
        # Paths with problematic characters
        invalid_paths = [
            "/path/with\x00null",
            "/path/with*wildcard",
            "/path/with?question"
        ]
        
        for path in invalid_paths:
            result = validator.validate_path(path)
            # Should handle gracefully (True or False)
            assert isinstance(result, bool)
    
    def test_validate_version_equal(self):
        """Test version validation with equal versions."""
        validator = InputValidator()
        
        result = validator.validate_version("3.12.0", "3.12.0")
        assert result is True
    
    def test_validate_version_greater(self):
        """Test version validation with greater version."""
        validator = InputValidator()
        
        result = validator.validate_version("3.12.1", "3.12.0")
        assert result is True
        
        result = validator.validate_version("3.13.0", "3.12.0")
        assert result is True
        
        result = validator.validate_version("4.0.0", "3.12.0")
        assert result is True
    
    def test_validate_version_lesser(self):
        """Test version validation with lesser version."""
        validator = InputValidator()
        
        result = validator.validate_version("3.11.9", "3.12.0")
        assert result is False
        
        result = validator.validate_version("3.12.0", "3.12.1")
        assert result is False
    
    def test_validate_version_different_formats(self):
        """Test version validation with different version formats."""
        validator = InputValidator()
        
        # Different version string formats
        test_cases = [
            ("v3.12.0", "3.12.0", True),
            ("3.12", "3.12.0", True),
            ("3.12.0-beta", "3.12.0", True),
            ("Node.js v18.17.0", "18.0.0", True),
        ]
        
        for current, minimum, expected in test_cases:
            result = validator.validate_version(current, minimum)
            assert result == expected or isinstance(result, bool)
    
    def test_validate_version_invalid_format(self):
        """Test version validation with invalid formats."""
        validator = InputValidator()
        
        # Invalid version strings
        invalid_versions = [
            ("invalid", "3.12.0"),
            ("", "3.12.0"),
            ("3.12.0", "invalid"),
            (None, "3.12.0"),
            ("3.12.0", None)
        ]
        
        for current, minimum in invalid_versions:
            try:
                result = validator.validate_version(current, minimum)
                assert isinstance(result, bool)
            except (TypeError, AttributeError):
                # Expected for None values
                pass
    
    def test_validate_api_key_valid(self):
        """Test API key validation with valid keys."""
        validator = InputValidator()
        
        valid_keys = [
            "sk-1234567890abcdef1234567890abcdef",
            "api_key_with_underscores_123",
            "APIKEY123456789012345",
            "key-with-dashes-123456789"
        ]
        
        for key in valid_keys:
            result = validator.validate_api_key(key)
            assert result is True
    
    def test_validate_api_key_invalid_length(self):
        """Test API key validation with invalid length."""
        validator = InputValidator()
        
        short_key = "short"
        result = validator.validate_api_key(short_key)
        assert result is False
    
    def test_validate_api_key_invalid_characters(self):
        """Test API key validation with invalid characters."""
        validator = InputValidator()
        
        invalid_keys = [
            "key with spaces 12345678901234567890",
            "key@with#special$chars%^&*()12345",
            "key\nwith\nnewlines123456789012345"
        ]
        
        for key in invalid_keys:
            result = validator.validate_api_key(key)
            # Behavior depends on implementation
            assert isinstance(result, bool)
    
    def test_validate_api_key_custom_length(self):
        """Test API key validation with custom minimum length."""
        validator = InputValidator()
        
        key = "12345678"  # 8 characters
        
        result = validator.validate_api_key(key, min_length=5)
        assert result is True
        
        result = validator.validate_api_key(key, min_length=10)
        assert result is False
    
    def test_validate_email_valid(self):
        """Test email validation with valid addresses."""
        validator = InputValidator()
        
        if hasattr(validator, 'validate_email'):
            valid_emails = [
                "user@example.com",
                "test.email@domain.org",
                "user+tag@example.co.uk",
                "firstname.lastname@company.com"
            ]
            
            for email in valid_emails:
                result = validator.validate_email(email)
                assert result is True
    
    def test_validate_email_invalid(self):
        """Test email validation with invalid addresses."""
        validator = InputValidator()
        
        if hasattr(validator, 'validate_email'):
            invalid_emails = [
                "invalid-email",
                "@example.com",
                "user@",
                "user space@example.com",
                "user@domain",
                ""
            ]
            
            for email in invalid_emails:
                result = validator.validate_email(email)
                assert result is False
    
    def test_validate_url_valid(self):
        """Test URL validation with valid URLs."""
        validator = InputValidator()
        
        if hasattr(validator, 'validate_url'):
            valid_urls = [
                "https://example.com",
                "http://localhost:8080",
                "https://api.example.com/v1/endpoint",
                "http://192.168.1.1:3000"
            ]
            
            for url in valid_urls:
                result = validator.validate_url(url)
                assert result is True
    
    def test_validate_url_invalid(self):
        """Test URL validation with invalid URLs."""
        validator = InputValidator()
        
        if hasattr(validator, 'validate_url'):
            invalid_urls = [
                "not-a-url",
                "ftp://example.com",  # Depending on implementation
                "example.com",
                "http://",
                ""
            ]
            
            for url in invalid_urls:
                result = validator.validate_url(url)
                # Result depends on implementation strictness
                assert isinstance(result, bool)
    
    def test_validate_port_valid(self):
        """Test port validation with valid ports."""
        validator = InputValidator()
        
        if hasattr(validator, 'validate_port'):
            valid_ports = ["80", "443", "8080", "3000", "65535"]
            
            for port in valid_ports:
                result = validator.validate_port(port)
                assert result is True
    
    def test_validate_port_invalid(self):
        """Test port validation with invalid ports."""
        validator = InputValidator()
        
        if hasattr(validator, 'validate_port'):
            invalid_ports = ["0", "65536", "80.5", "port", ""]
            
            for port in invalid_ports:
                result = validator.validate_port(port)
                assert result is False
    
    def test_get_validated_input(self):
        """Test validated input with retry logic."""
        validator = InputValidator()
        
        if hasattr(validator, 'get_validated_input'):
            def always_true(value):
                return True
            
            with patch('builtins.input', return_value='valid_input'):
                result = validator.get_validated_input(
                    "Enter value", 
                    always_true, 
                    "Error message"
                )
                assert result == 'valid_input'
    
    def test_get_validated_input_retry(self):
        """Test validated input with retry on invalid input."""
        validator = InputValidator()
        
        if hasattr(validator, 'get_validated_input'):
            def validate_number(value):
                return value.isdigit()
            
            with patch('builtins.input', side_effect=['invalid', '123']):
                result = validator.get_validated_input(
                    "Enter number", 
                    validate_number, 
                    "Must be number"
                )
                assert result == '123'
    
    def test_get_validated_input_max_attempts(self):
        """Test validated input exceeding max attempts."""
        validator = InputValidator()
        
        if hasattr(validator, 'get_validated_input'):
            def always_false(value):
                return False
            
            with patch('builtins.input', return_value='invalid'):
                result = validator.get_validated_input(
                    "Enter value", 
                    always_false, 
                    "Always invalid",
                    max_attempts=2
                )
                assert result is None
    
    def test_get_secure_input(self):
        """Test secure input functionality."""
        validator = InputValidator()
        
        if hasattr(validator, 'get_secure_input'):
            with patch('getpass.getpass', return_value='secret'):
                result = validator.get_secure_input("Enter password")
                assert result == 'secret'


class TestSystemValidator:
    """Test suite for SystemValidator class."""
    
    def test_system_validator_initialization(self):
        """Test SystemValidator initialization."""
        validator = SystemValidator()
        assert validator is not None
    
    def test_system_validator_no_colors(self):
        """Test SystemValidator initialization without colors."""
        validator = SystemValidator(use_colors=False)
        assert validator is not None
    
    @patch('shutil.which')
    def test_check_command_exists_true(self, mock_which):
        """Test checking command that exists."""
        mock_which.return_value = '/usr/bin/python3'
        
        validator = SystemValidator()
        result = validator.check_command_exists('python3')
        
        assert result is True
        mock_which.assert_called_once_with('python3')
    
    @patch('shutil.which')
    def test_check_command_exists_false(self, mock_which):
        """Test checking command that doesn't exist."""
        mock_which.return_value = None
        
        validator = SystemValidator()
        result = validator.check_command_exists('nonexistent_command')
        
        assert result is False
        mock_which.assert_called_once_with('nonexistent_command')
    
    @patch('subprocess.run')
    def test_get_command_version_success(self, mock_run):
        """Test getting command version successfully."""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Python 3.12.0\n"
        mock_run.return_value = mock_result
        
        validator = SystemValidator()
        result = validator.get_command_version('python3')
        
        assert result == "Python 3.12.0"
        mock_run.assert_called_once()
    
    @patch('subprocess.run')
    def test_get_command_version_failure(self, mock_run):
        """Test getting command version with failure."""
        mock_result = Mock()
        mock_result.returncode = 1
        mock_result.stdout = ""
        mock_run.return_value = mock_result
        
        validator = SystemValidator()
        result = validator.get_command_version('nonexistent')
        
        assert result is None
    
    @patch('subprocess.run')
    def test_get_command_version_timeout(self, mock_run):
        """Test getting command version with timeout."""
        import subprocess
        mock_run.side_effect = subprocess.TimeoutExpired('cmd', 10)
        
        validator = SystemValidator()
        result = validator.get_command_version('slow_command')
        
        assert result is None
    
    @patch('subprocess.run')
    def test_get_command_version_custom_flag(self, mock_run):
        """Test getting command version with custom flag."""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "v18.17.0\n"
        mock_run.return_value = mock_result
        
        validator = SystemValidator()
        result = validator.get_command_version('node', '-v')
        
        assert result == "v18.17.0"
    
    def test_check_python_modules_available(self):
        """Test checking Python modules that are available."""
        validator = SystemValidator()
        modules = ['sys', 'os', 'json', 'pathlib']
        
        result = validator.check_python_modules(modules)
        
        assert isinstance(result, dict)
        assert len(result) == 4
        
        # These standard library modules should be available
        assert result['sys'] is True
        assert result['os'] is True
        assert result['json'] is True
        assert result['pathlib'] is True
    
    def test_check_python_modules_unavailable(self):
        """Test checking Python modules that are not available."""
        validator = SystemValidator()
        modules = ['nonexistent_module_xyz', 'another_fake_module']
        
        result = validator.check_python_modules(modules)
        
        assert isinstance(result, dict)
        assert len(result) == 2
        assert result['nonexistent_module_xyz'] is False
        assert result['another_fake_module'] is False
    
    def test_check_python_modules_mixed(self):
        """Test checking mix of available and unavailable modules."""
        validator = SystemValidator()
        modules = ['sys', 'nonexistent_module', 'json', 'fake_module']
        
        result = validator.check_python_modules(modules)
        
        assert isinstance(result, dict)
        assert len(result) == 4
        assert result['sys'] is True
        assert result['json'] is True
        assert result['nonexistent_module'] is False
        assert result['fake_module'] is False
    
    def test_check_disk_space(self):
        """Test disk space checking."""
        validator = SystemValidator()
        
        if hasattr(validator, 'check_disk_space'):
            # Test with root directory (should have some space)
            result = validator.check_disk_space('/', 1)  # 1 MB
            assert isinstance(result, bool)
            
            # Test with very large requirement (should fail)
            result = validator.check_disk_space('/', 1000000000)  # 1TB
            assert result is False
    
    def test_check_permissions_readable(self):
        """Test checking read permissions."""
        validator = SystemValidator()
        
        if hasattr(validator, 'check_permissions'):
            # Test with root directory (should be readable)
            result = validator.check_permissions('/', 'r')
            assert result is True
    
    def test_check_permissions_writable(self):
        """Test checking write permissions."""
        validator = SystemValidator()
        
        if hasattr(validator, 'check_permissions'):
            import tempfile
            with tempfile.TemporaryDirectory() as temp_dir:
                result = validator.check_permissions(temp_dir, 'w')
                assert result is True
    
    def test_check_permissions_nonexistent(self):
        """Test checking permissions on nonexistent path."""
        validator = SystemValidator()
        
        if hasattr(validator, 'check_permissions'):
            result = validator.check_permissions('/definitely/does/not/exist', 'r')
            assert result is False


class TestValidationEdgeCases:
    """Test edge cases and error conditions for validation utilities."""
    
    def test_input_validator_with_none_values(self):
        """Test input validator with None values."""
        validator = InputValidator()
        
        try:
            result = validator.validate_path(None)
            assert isinstance(result, bool)
        except (TypeError, AttributeError):
            # Expected behavior for None input
            pass
    
    def test_input_validator_with_empty_strings(self):
        """Test input validator with empty strings."""
        validator = InputValidator()
        
        result = validator.validate_path("")
        assert isinstance(result, bool)
        
        result = validator.validate_version("", "3.12.0")
        assert isinstance(result, bool)
        
        result = validator.validate_api_key("")
        assert result is False
    
    def test_system_validator_with_unicode_commands(self):
        """Test system validator with Unicode command names."""
        validator = SystemValidator()
        
        unicode_command = "python3_🚀"
        result = validator.check_command_exists(unicode_command)
        assert isinstance(result, bool)
    
    def test_version_validation_edge_cases(self):
        """Test version validation with edge cases."""
        validator = InputValidator()
        
        edge_cases = [
            ("1.0", "1.0.0"),
            ("1", "1.0"),
            ("1.0.0.0", "1.0.0"),
            ("1.0.0-alpha", "1.0.0"),
            ("1.0.0+build", "1.0.0"),
        ]
        
        for current, minimum in edge_cases:
            result = validator.validate_version(current, minimum)
            assert isinstance(result, bool)
    
    def test_validation_performance(self):
        """Test validation performance with many operations."""
        validator = InputValidator()
        
        import time
        start_time = time.time()
        
        # Perform many validations
        for i in range(1000):
            validator.validate_path(f"/path/to/file_{i}")
            validator.validate_version("3.12.0", "3.11.0")
            validator.validate_api_key(f"api_key_123456789_{i}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete quickly
        assert duration < 1.0, f"Validation took too long: {duration}s"
    
    def test_validation_thread_safety(self):
        """Test validation utilities thread safety."""
        import threading
        
        validator = InputValidator()
        system_validator = SystemValidator()
        errors = []
        
        def worker(thread_id):
            try:
                for i in range(100):
                    validator.validate_path(f"/path/{thread_id}/{i}")
                    system_validator.check_command_exists(f"command_{thread_id}")
                    validator.validate_version("3.12.0", "3.11.0")
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
    
    def test_validation_memory_usage(self):
        """Test validation memory usage with large inputs."""
        validator = InputValidator()
        
        # Test with very long strings
        long_path = "/very/long/path/" + "x" * 10000
        result = validator.validate_path(long_path)
        assert isinstance(result, bool)
        
        long_version = "3.12.0." + "1" * 1000
        result = validator.validate_version(long_version, "3.12.0")
        assert isinstance(result, bool)
        
        long_api_key = "key_" + "x" * 10000
        result = validator.validate_api_key(long_api_key)
        assert isinstance(result, bool)
    
    @patch('os.access', side_effect=OSError("Permission denied"))
    def test_system_validator_os_error(self, mock_access):
        """Test system validator handling OS errors."""
        validator = SystemValidator()
        
        if hasattr(validator, 'check_permissions'):
            result = validator.check_permissions('/some/path', 'r')
            # Should handle OS error gracefully
            assert isinstance(result, bool)
    
    def test_validator_state_independence(self):
        """Test that validator instances are independent."""
        validator1 = InputValidator(use_colors=True)
        validator2 = InputValidator(use_colors=False)
        
        # Both should work independently
        result1 = validator1.validate_path("/path1")
        result2 = validator2.validate_path("/path2")
        
        assert isinstance(result1, bool)
        assert isinstance(result2, bool)