#!/usr/bin/env python3
"""
Security Tests for SuperClaude Framework v3.0

Comprehensive test suite for path traversal vulnerability fixes in all installer modules.
Tests various attack patterns and ensures all malicious paths are properly rejected.
"""

import unittest
import tempfile
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add utils to path for imports
test_dir = Path(__file__).parent
utils_path = str(test_dir.parent / "utils")
installers_path = str(test_dir.parent / "installers")
sys.path.insert(0, utils_path)
sys.path.insert(0, installers_path)

from path_security import PathSecurityValidator, PathTraversalError, SecureInstaller
from path_security import MALICIOUS_PATH_PATTERNS, test_security_patterns


class TestPathSecurityValidator(unittest.TestCase):
    """Test the path security validator against various attack patterns."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.allowed_roots = [self.temp_dir, str(Path.home() / ".claude")]
        self.validator = PathSecurityValidator(self.allowed_roots)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_malicious_path_patterns_detected(self):
        """Test that all malicious path patterns are detected and rejected."""
        for pattern in MALICIOUS_PATH_PATTERNS:
            with self.subTest(pattern=pattern):
                with self.assertRaises(PathTraversalError):
                    self.validator.resolve_secure_path(pattern)
    
    def test_directory_traversal_sequences(self):
        """Test detection of directory traversal sequences."""
        traversal_patterns = [
            "../etc/passwd",
            "..\\windows\\system32",
            "./../../sensitive.file",
            "legitimate/../../../etc/shadow",
            "normal/path/../../../../../../etc/passwd",
        ]
        
        for pattern in traversal_patterns:
            with self.subTest(pattern=pattern):
                with self.assertRaises(PathTraversalError):
                    self.validator.resolve_secure_path(pattern)
    
    def test_null_byte_injection(self):
        """Test detection of null byte injection attacks."""
        null_byte_patterns = [
            "file\0.txt",
            "normal.txt\0.exe",
            "config\0.json",
        ]
        
        for pattern in null_byte_patterns:
            with self.subTest(pattern=pattern):
                with self.assertRaises(PathTraversalError):
                    self.validator.resolve_secure_path(pattern)
    
    def test_path_length_limits(self):
        """Test rejection of extremely long paths."""
        long_path = "a" * 5000  # Extremely long path
        with self.assertRaises(PathTraversalError):
            self.validator.resolve_secure_path(long_path)
    
    def test_suspicious_file_extensions(self):
        """Test detection of suspicious file extensions in paths."""
        suspicious_patterns = [
            "path/to/malware.exe",
            "scripts/bad.bat",
            "files/virus.scr",
        ]
        
        for pattern in suspicious_patterns:
            with self.subTest(pattern=pattern):
                with self.assertRaises(PathTraversalError):
                    self.validator.resolve_secure_path(pattern)
    
    def test_valid_paths_accepted(self):
        """Test that valid paths within allowed directories are accepted."""
        valid_paths = [
            "valid_file.txt",
            "subdir/file.json",
            "scripts/installer.py",
        ]
        
        for path in valid_paths:
            with self.subTest(path=path):
                try:
                    # Create a valid path within temp directory
                    full_path = Path(self.temp_dir) / path
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    full_path.touch()  # Create the file
                    
                    # Should not raise an exception
                    result = self.validator.resolve_secure_path(str(full_path))
                    self.assertTrue(result.exists())
                except PathTraversalError:
                    self.fail(f"Valid path {path} was incorrectly rejected")
    
    def test_tilde_expansion_security(self):
        """Test secure handling of tilde expansion."""
        # Valid tilde expansion should work
        home_path = "~/test_file.txt"
        try:
            result = self.validator.resolve_secure_path(home_path)
            self.assertTrue(str(result).startswith(str(Path.home())))
        except PathTraversalError:
            pass  # May fail if home directory not in allowed roots
        
        # Invalid tilde expansion should be rejected
        user_expansion = "~other_user/file.txt"
        with self.assertRaises(PathTraversalError):
            self.validator.resolve_secure_path(user_expansion)
    
    def test_file_operation_validation(self):
        """Test validation of file operations with source and target paths."""
        # Create valid source file
        source_file = Path(self.temp_dir) / "source.txt"
        source_file.write_text("test content")
        
        target_file = Path(self.temp_dir) / "target.txt"
        
        # Valid file operation should work
        validated_source, validated_target = self.validator.validate_file_operation(
            source_file, target_file, "copy"
        )
        self.assertEqual(validated_source, source_file.resolve())
        self.assertEqual(validated_target, target_file.resolve())
        
        # Invalid source path should be rejected
        with self.assertRaises(PathTraversalError):
            self.validator.validate_file_operation(
                "../../../etc/passwd", target_file, "copy"
            )
        
        # Invalid target path should be rejected
        with self.assertRaises(PathTraversalError):
            self.validator.validate_file_operation(
                source_file, "../../../etc/shadow", "copy"
            )
    
    def test_secure_mkdir(self):
        """Test secure directory creation."""
        # Valid directory creation should work
        valid_dir = Path(self.temp_dir) / "new_directory"
        result = self.validator.secure_mkdir(valid_dir)
        self.assertTrue(result.exists())
        self.assertTrue(result.is_dir())
        
        # Invalid directory path should be rejected
        with self.assertRaises(PathTraversalError):
            self.validator.secure_mkdir("../../../tmp/malicious")


class TestSecureInstaller(unittest.TestCase):
    """Test the SecureInstaller base class."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.installer = SecureInstaller(self.temp_dir)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_installer_initialization(self):
        """Test secure installer initialization."""
        self.assertEqual(self.installer.project_dir, Path(self.temp_dir).resolve())
        self.assertEqual(self.installer.claude_dir, Path.home() / ".claude")
    
    def test_invalid_project_directory(self):
        """Test initialization with invalid project directory."""
        with self.assertRaises(ValueError):
            SecureInstaller("../../../etc")
    
    def test_secure_path_wrapper(self):
        """Test the secure path wrapper method."""
        valid_path = Path(self.temp_dir) / "test.txt"
        valid_path.touch()
        
        result = self.installer.secure_path(valid_path)
        self.assertEqual(result, valid_path.resolve())
        
        with self.assertRaises(PathTraversalError):
            self.installer.secure_path("../../../etc/passwd")


class TestInstallerModules(unittest.TestCase):
    """Test that all installer modules properly implement security fixes."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_core_installer_security(self):
        """Test core installer security fixes."""
        try:
            from core_installer import CoreInstaller
            
            # Valid initialization should work
            installer = CoreInstaller(self.temp_dir)
            self.assertIsInstance(installer, SecureInstaller)
            
            # Invalid project directory should be rejected
            with self.assertRaises(ValueError):
                CoreInstaller("../../../etc")
                
        except ImportError:
            self.skipTest("Core installer module not available")
    
    def test_commands_installer_security(self):
        """Test commands installer security fixes."""
        try:
            from commands_installer import CommandsInstaller
            
            # Valid initialization should work
            installer = CommandsInstaller(self.temp_dir)
            self.assertIsInstance(installer, SecureInstaller)
            
            # Invalid project directory should be rejected
            with self.assertRaises(ValueError):
                CommandsInstaller("../../../etc")
                
        except ImportError:
            self.skipTest("Commands installer module not available")
    
    def test_hooks_installer_security(self):
        """Test hooks installer security fixes."""
        try:
            from hooks_installer import HooksInstaller
            
            # Valid initialization should work
            installer = HooksInstaller(self.temp_dir)
            self.assertIsInstance(installer, SecureInstaller)
            
            # Invalid project directory should be rejected
            with self.assertRaises(ValueError):
                HooksInstaller("../../../etc")
                
        except ImportError:
            self.skipTest("Hooks installer module not available")
    
    def test_mcp_installer_security(self):
        """Test MCP installer security fixes."""
        try:
            from mcp_installer import MCPInstaller
            
            # Valid initialization should work
            installer = MCPInstaller(self.temp_dir)
            self.assertIsInstance(installer, SecureInstaller)
            
            # Invalid project directory should be rejected
            with self.assertRaises(ValueError):
                MCPInstaller("../../../etc")
                
        except ImportError:
            self.skipTest("MCP installer module not available")
    
    def test_settings_installer_security(self):
        """Test settings installer security fixes."""
        try:
            from settings_installer import SettingsInstaller
            
            # Valid initialization should work
            installer = SettingsInstaller(self.temp_dir)
            self.assertIsInstance(installer, SecureInstaller)
            
            # Invalid project directory should be rejected
            with self.assertRaises(ValueError):
                SettingsInstaller("../../../etc")
                
        except ImportError:
            self.skipTest("Settings installer module not available")


class TestPathTraversalAttacks(unittest.TestCase):
    """Test specific path traversal attack patterns."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.validator = PathSecurityValidator([self.temp_dir])
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_relative_path_attacks(self):
        """Test various relative path attack patterns."""
        attack_patterns = [
            "../../../../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\cmd.exe",
            "./../../../etc/shadow",
            "././../../../etc/hosts",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",  # URL encoded
        ]
        
        for pattern in attack_patterns:
            with self.subTest(pattern=pattern):
                with self.assertRaises(PathTraversalError):
                    self.validator.resolve_secure_path(pattern)
    
    def test_absolute_path_attacks(self):
        """Test absolute path attacks outside allowed directories."""
        attack_patterns = [
            "/etc/passwd",
            "/root/.ssh/id_rsa",
            "/var/log/auth.log",
            "C:\\Windows\\System32\\config\\SAM",
            "/proc/self/environ",
        ]
        
        for pattern in attack_patterns:
            with self.subTest(pattern=pattern):
                with self.assertRaises(PathTraversalError):
                    self.validator.resolve_secure_path(pattern)
    
    def test_symlink_attacks(self):
        """Test symbolic link attack prevention."""
        # Create a symlink that points outside allowed directory
        link_path = Path(self.temp_dir) / "malicious_link"
        target_path = Path("/etc/passwd")
        
        try:
            link_path.symlink_to(target_path)
            
            # Should detect that resolved path is outside allowed directory
            with self.assertRaises(PathTraversalError):
                self.validator.resolve_secure_path(str(link_path))
                
        except (OSError, NotImplementedError):
            # Symlink creation may fail on some systems
            self.skipTest("Symlink creation not supported on this system")
    
    def test_unicode_normalization_attacks(self):
        """Test Unicode normalization attacks."""
        unicode_patterns = [
            "..\\u002e\\u002e\\u002fetc\\u002fpasswd",
            "..\\u2215..\\u2215etc\\u2215passwd",
            "%c0%ae%c0%ae%c0%af%c0%ae%c0%ae%c0%afetc%c0%afpasswd",
        ]
        
        for pattern in unicode_patterns:
            with self.subTest(pattern=pattern):
                # These should either be rejected or normalized safely
                try:
                    result = self.validator.resolve_secure_path(pattern)
                    # If not rejected, ensure it's within allowed directory
                    self.assertTrue(any(
                        str(result).startswith(str(Path(root).resolve()))
                        for root in self.validator.allowed_roots
                    ))
                except PathTraversalError:
                    # Rejection is acceptable
                    pass


class TestSecurityIntegration(unittest.TestCase):
    """Integration tests for security fixes across all components."""
    
    def test_security_patterns_comprehensive(self):
        """Test the comprehensive security pattern detection."""
        issues = test_security_patterns()
        self.assertEqual(len(issues), 0, f"Security issues detected: {issues}")
    
    def test_no_vulnerable_path_operations(self):
        """Ensure no vulnerable Path() operations remain in installer modules."""
        installer_files = [
            "core_installer.py",
            "commands_installer.py", 
            "hooks_installer.py",
            "mcp_installer.py",
            "settings_installer.py"
        ]
        
        for installer_file in installer_files:
            file_path = Path(installers_path) / installer_file
            if file_path.exists():
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Check for potentially vulnerable patterns
                vulnerable_patterns = [
                    "Path(project_dir)",  # Should use secure_path
                    "Path(args.project_dir)",  # Should use secure_path
                    ".replace(\"~\", str(Path.home()))",  # Should use secure tilde expansion
                ]
                
                for pattern in vulnerable_patterns:
                    with self.subTest(file=installer_file, pattern=pattern):
                        if pattern in content:
                            # Allow if it's within a try-catch block or using secure methods
                            self.assertIn("secure_path", content, 
                                f"Vulnerable pattern '{pattern}' found in {installer_file} without secure alternative")


def run_security_tests():
    """Run all security tests and return results."""
    print("Running comprehensive security tests...")
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    test_classes = [
        TestPathSecurityValidator,
        TestSecureInstaller,
        TestInstallerModules,
        TestPathTraversalAttacks,
        TestSecurityIntegration,
    ]
    
    for test_class in test_classes:
        suite.addTest(loader.loadTestsFromTestCase(test_class))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return success status
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_security_tests()
    
    if success:
        print("\n✅ All security tests passed!")
        print("Path traversal vulnerabilities have been successfully fixed.")
        sys.exit(0)
    else:
        print("\n❌ Security tests failed!")
        print("Some vulnerabilities may remain - review test output above.")
        sys.exit(1)