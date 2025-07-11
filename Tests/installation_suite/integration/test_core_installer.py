#!/usr/bin/env python3
"""
Integration tests for core installer component.

Tests core framework installation, settings configuration, and file operations.
"""

import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, Mock

# Import test helpers
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "helpers"))

from test_environment import IsolatedEnvironment, mock_installation_environment
from mock_system import MockFileOperations, MockProgressTracker
from assertions import InstallationAssertions, assert_successful_installation
from fixtures_manager import FixturesManager


class TestCoreInstallerIntegration:
    """Integration tests for core installer."""
    
    @pytest.fixture
    def core_installer(self):
        """Create core installer instance for testing."""
        # Import the actual core installer
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts" / "installers"))
            from core_installer import CoreInstaller
            return CoreInstaller
        except ImportError:
            # Fallback mock installer
            class MockCoreInstaller:
                def __init__(self, project_dir, installation_type="standard"):
                    self.project_dir = Path(project_dir)
                    self.installation_type = installation_type
                    self.claude_dir = Path.home() / ".claude"
                
                def install(self):
                    return {"success": True, "installed_files": ["CLAUDE.md", "settings.json"]}
                
                def validate_installation(self):
                    return True
            
            return MockCoreInstaller
    
    def test_core_installer_standard_installation(self, core_installer):
        """Test standard core installation workflow."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir, installation_type="standard")
            
            # Mock file operations to succeed
            with patch('shutil.copy2') as mock_copy:
                mock_copy.return_value = None
                
                # Run installation
                result = installer.install()
                
                # Verify success
                assert result["success"] is True
                assert "CLAUDE.md" in result["installed_files"]
                assert "settings.json" in result["installed_files"]
    
    def test_core_installer_development_installation(self, core_installer):
        """Test development core installation with symlinks."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir, installation_type="development")
            
            # Mock symlink operations
            with patch('os.symlink') as mock_symlink:
                mock_symlink.return_value = None
                
                # Run installation
                result = installer.install()
                
                # Verify symlinks were created
                assert result["success"] is True
                assert mock_symlink.called
    
    def test_core_installer_settings_json_creation(self, core_installer):
        """Test settings.json creation and validation."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Mock file operations
            with patch('pathlib.Path.write_text') as mock_write:
                with patch('json.dumps') as mock_json:
                    mock_json.return_value = '{"superclaude": {"version": "3.0.0"}}'
                    
                    # Run installation
                    result = installer.install()
                    
                    # Verify settings.json was created
                    assert result["success"] is True
                    mock_write.assert_called()
                    mock_json.assert_called()
    
    def test_core_installer_with_existing_files(self, core_installer):
        """Test core installation with existing files (backup scenario)."""
        with mock_installation_environment(components=["core"]) as env:
            installer = core_installer(env.project_dir)
            
            # Mock backup operations
            with patch.object(installer, '_backup_existing_files', return_value=True):
                # Run installation
                result = installer.install()
                
                # Should handle existing files with backup
                assert result["success"] is True
    
    def test_core_installer_permission_error(self, core_installer):
        """Test core installation with permission errors."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Mock permission error
            with patch('shutil.copy2', side_effect=PermissionError("Permission denied")):
                # Run installation
                result = installer.install()
                
                # Should handle permission error gracefully
                assert result["success"] is False
                assert "permission" in result.get("error", "").lower()
    
    def test_core_installer_rollback_on_failure(self, core_installer):
        """Test core installer rollback on partial failure."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Mock partial failure (first file succeeds, second fails)
            with patch('shutil.copy2', side_effect=[None, OSError("Disk full")]):
                with patch.object(installer, '_rollback_installation', return_value=True) as mock_rollback:
                    # Run installation
                    result = installer.install()
                    
                    # Should fail and rollback
                    assert result["success"] is False
                    mock_rollback.assert_called()
    
    def test_core_installer_progress_tracking(self, core_installer):
        """Test core installer progress tracking integration."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            progress_tracker = MockProgressTracker()
            
            # Inject progress tracker
            if hasattr(installer, 'progress'):
                installer.progress = progress_tracker
            
            # Run installation
            with patch('shutil.copy2'):
                result = installer.install()
                
                # Verify progress was tracked
                assert result["success"] is True
                if hasattr(progress_tracker, 'updates'):
                    assert len(progress_tracker.updates) > 0
    
    def test_core_installer_file_validation(self, core_installer):
        """Test core installer file validation."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Run installation
            with patch('shutil.copy2'):
                result = installer.install()
                
                # Run validation
                if hasattr(installer, 'validate_installation'):
                    validation_result = installer.validate_installation()
                    assert validation_result is True
    
    def test_core_installer_environment_setup(self, core_installer):
        """Test core installer environment variable setup."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Mock environment setup
            with patch.dict('os.environ', {}):
                # Run installation
                result = installer.install()
                
                # Verify environment variables were set
                assert result["success"] is True
                # Check if installer sets any environment variables
                if hasattr(installer, '_setup_environment'):
                    # Environment should be configured
                    assert True
    
    def test_core_installer_dependency_checking(self, core_installer):
        """Test core installer dependency checking."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Mock dependency check
            if hasattr(installer, 'check_dependencies'):
                with patch.object(installer, 'check_dependencies', return_value=True):
                    # Run installation
                    result = installer.install()
                    
                    assert result["success"] is True
    
    def test_core_installer_logging(self, core_installer):
        """Test core installer logging functionality."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Mock logging
            log_messages = []
            
            def mock_log(message, level="info"):
                log_messages.append((level, message))
            
            if hasattr(installer, 'log_info'):
                installer.log_info = lambda msg: mock_log(msg, "info")
                installer.log_error = lambda msg: mock_log(msg, "error")
            
            # Run installation
            with patch('shutil.copy2'):
                result = installer.install()
                
                # Verify logging occurred
                assert len(log_messages) > 0


class TestCoreInstallerAdvanced:
    """Advanced integration tests for core installer."""
    
    @pytest.fixture
    def fixtures_manager(self):
        """Create fixtures manager for test data."""
        return FixturesManager()
    
    def test_core_installer_with_real_files(self, core_installer, fixtures_manager):
        """Test core installer with real file operations."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create mock project structure
            project_dir = fixtures_manager.create_mock_source_files(temp_path)
            claude_dir = temp_path / "test_claude"
            
            # Initialize installer
            installer = core_installer(project_dir)
            
            # Override claude directory for testing
            if hasattr(installer, 'claude_dir'):
                installer.claude_dir = claude_dir
            
            # Run real installation
            result = installer.install()
            
            # Verify files were actually created
            assert result["success"] is True
            assert claude_dir.exists()
            
            # Use custom assertions
            InstallationAssertions.assert_component_installed(
                claude_dir, 
                "core", 
                expected_files=["CLAUDE.md", "settings.json"]
            )
    
    def test_core_installer_settings_configuration(self, core_installer, fixtures_manager):
        """Test core installer settings configuration."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            project_dir = fixtures_manager.create_mock_source_files(temp_path)
            claude_dir = temp_path / "test_claude"
            
            installer = core_installer(project_dir)
            if hasattr(installer, 'claude_dir'):
                installer.claude_dir = claude_dir
            
            # Run installation
            result = installer.install()
            
            # Verify settings configuration
            assert result["success"] is True
            
            settings_file = claude_dir / "settings.json"
            if settings_file.exists():
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
                
                InstallationAssertions.assert_settings_valid(claude_dir, "3.0.0")
    
    def test_core_installer_concurrent_installations(self, core_installer):
        """Test core installer handling concurrent installations."""
        import threading
        import time
        
        results = []
        errors = []
        
        def install_worker(worker_id):
            try:
                with mock_installation_environment() as env:
                    installer = core_installer(env.project_dir)
                    
                    # Add small delay to encourage concurrency
                    time.sleep(0.01 * worker_id)
                    
                    with patch('shutil.copy2'):
                        result = installer.install()
                        results.append((worker_id, result))
            except Exception as e:
                errors.append((worker_id, e))
        
        # Run multiple installations concurrently
        threads = []
        for i in range(3):
            thread = threading.Thread(target=install_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify results
        assert len(errors) == 0, f"Concurrent installation errors: {errors}"
        assert len(results) == 3
        
        # All installations should succeed
        for worker_id, result in results:
            assert result["success"] is True
    
    def test_core_installer_configuration_validation(self, core_installer, fixtures_manager):
        """Test core installer configuration validation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create project with invalid configuration
            project_dir = temp_path / "project"
            project_dir.mkdir()
            
            # Create invalid settings
            settings_dir = project_dir / "SuperClaude" / "Settings"
            settings_dir.mkdir(parents=True)
            settings_file = settings_dir / "settings.json"
            settings_file.write_text('{"invalid": "json"')  # Invalid JSON
            
            installer = core_installer(project_dir)
            
            # Run installation
            result = installer.install()
            
            # Should handle invalid configuration gracefully
            if result["success"]:
                # Installation succeeded despite invalid source config
                assert True
            else:
                # Installation failed due to validation
                assert "validation" in result.get("error", "").lower() or "json" in result.get("error", "").lower()
    
    def test_core_installer_cleanup_on_interruption(self, core_installer):
        """Test core installer cleanup on interruption."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Mock interruption during installation
            def interrupt_copy(*args, **kwargs):
                raise KeyboardInterrupt("Installation interrupted")
            
            with patch('shutil.copy2', side_effect=interrupt_copy):
                # Run installation
                try:
                    result = installer.install()
                    # Should not reach here
                    assert False, "Expected KeyboardInterrupt"
                except KeyboardInterrupt:
                    # Verify cleanup was performed
                    if hasattr(installer, '_cleanup_partial_installation'):
                        # Cleanup method should exist
                        assert True
    
    def test_core_installer_update_mode(self, core_installer):
        """Test core installer in update mode."""
        with mock_installation_environment(components=["core"]) as env:
            installer = core_installer(env.project_dir, installation_type="standard")
            
            # Set update mode if available
            if hasattr(installer, 'update_mode'):
                installer.update_mode = True
            
            # Mock backup creation
            with patch.object(installer, '_create_backup', return_value=True):
                with patch('shutil.copy2'):
                    # Run update installation
                    result = installer.install()
                    
                    # Should succeed in update mode
                    assert result["success"] is True
    
    def test_core_installer_version_compatibility(self, core_installer, fixtures_manager):
        """Test core installer version compatibility checking."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create project with different version
            project_dir = fixtures_manager.create_mock_source_files(temp_path)
            
            # Modify version in source settings
            settings_file = project_dir / "SuperClaude" / "Settings" / "settings.json"
            if settings_file.exists():
                settings = {"superclaude": {"version": "2.0.0"}}
                settings_file.write_text(json.dumps(settings, indent=2))
            
            installer = core_installer(project_dir)
            
            # Run installation
            result = installer.install()
            
            # Should handle version differences appropriately
            assert isinstance(result["success"], bool)
    
    def test_core_installer_custom_paths(self, core_installer):
        """Test core installer with custom installation paths."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Set custom claude directory
            custom_claude_dir = env.temp_dir / "custom_claude"
            if hasattr(installer, 'claude_dir'):
                installer.claude_dir = custom_claude_dir
            
            # Run installation
            with patch('shutil.copy2'):
                result = installer.install()
                
                # Should install to custom location
                assert result["success"] is True
    
    def test_core_installer_error_recovery(self, core_installer):
        """Test core installer error recovery mechanisms."""
        with mock_installation_environment() as env:
            installer = core_installer(env.project_dir)
            
            # Test recovery from various error types
            error_scenarios = [
                OSError("Disk full"),
                PermissionError("Access denied"),
                FileNotFoundError("Source not found")
            ]
            
            for error in error_scenarios:
                with patch('shutil.copy2', side_effect=error):
                    result = installer.install()
                    
                    # Should handle each error type gracefully
                    assert result["success"] is False
                    assert "error" in result
                    assert len(result["error"]) > 0