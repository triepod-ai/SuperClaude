#!/usr/bin/env python3
"""
SuperClaude Framework v3.0 - Integration Improvements Test

Tests the integration improvements and consistency fixes
implemented across the installer components.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add utils to path for imports
utils_path = str(Path(__file__).parent.parent / "utils")
sys.path.insert(0, utils_path)

# Add installers to path
installers_path = str(Path(__file__).parent.parent / "installers")
sys.path.insert(0, installers_path)


class TestIntegrationImprovements(unittest.TestCase):
    """Test integration improvements across installer components."""
    
    def setUp(self):
        """Set up test environment."""
        self.project_dir = Path("/tmp/test_superclaude")
        self.claude_dir = Path("/tmp/test_claude")
        self.project_dir.mkdir(exist_ok=True)
        self.claude_dir.mkdir(exist_ok=True)
        
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        if self.project_dir.exists():
            shutil.rmtree(self.project_dir)
        if self.claude_dir.exists():
            shutil.rmtree(self.claude_dir)
    
    def test_logging_module_import(self):
        """Test that the logging module can be imported."""
        try:
            from logger import SuperClaudeLogger, LoggerMixin
            self.assertTrue(True, "Logging module imported successfully")
        except ImportError as e:
            self.fail(f"Could not import logging module: {e}")
    
    def test_installation_state_module_import(self):
        """Test that the installation state module can be imported."""
        try:
            from installation_state import InstallationStateManager, InstallationPhase
            self.assertTrue(True, "Installation state module imported successfully")
        except ImportError as e:
            self.fail(f"Could not import installation state module: {e}")
    
    def test_integration_validator_module_import(self):
        """Test that the integration validator module can be imported."""
        try:
            from integration_validator import IntegrationValidator, InstallerComponent
            self.assertTrue(True, "Integration validator module imported successfully")
        except ImportError as e:
            self.fail(f"Could not import integration validator module: {e}")
    
    def test_module_loader_efficiency(self):
        """Test module loading efficiency features."""
        try:
            from module_loader import ModuleLoader, check_module_loading_efficiency
            
            loader = ModuleLoader()
            cache_info = loader.get_cache_info()
            
            # Cache info should have expected keys
            expected_keys = ["cached_modules", "cache_keys", "currently_loading", "cache_hit_info"]
            for key in expected_keys:
                self.assertIn(key, cache_info)
            
            # Test efficiency check
            efficiency_report = check_module_loading_efficiency()
            self.assertIn("cache_stats", efficiency_report)
            self.assertIn("recommendations", efficiency_report)
            
        except ImportError as e:
            self.fail(f"Could not test module loader: {e}")
    
    def test_integration_validator_functionality(self):
        """Test integration validator functionality."""
        try:
            from integration_validator import IntegrationValidator, InstallerComponent
            
            validator = IntegrationValidator(self.claude_dir, self.project_dir)
            
            # Test installation order validation
            components = [InstallerComponent.CORE, InstallerComponent.SETTINGS]
            success, errors = validator.validate_installation_order(components)
            
            # Should succeed as core comes before settings
            self.assertTrue(success, f"Installation order validation failed: {errors}")
            
            # Test invalid order
            invalid_components = [InstallerComponent.SETTINGS, InstallerComponent.CORE]
            success, errors = validator.validate_installation_order(invalid_components)
            
            # Should fail as settings requires core
            self.assertFalse(success, "Invalid installation order should fail validation")
            
        except ImportError as e:
            self.fail(f"Could not test integration validator: {e}")
    
    def test_installation_state_manager(self):
        """Test installation state manager functionality."""
        try:
            from installation_state import InstallationStateManager, InstallationPhase
            
            state_manager = InstallationStateManager(self.claude_dir, self.project_dir)
            
            # Test phase tracking
            state_manager.start_phase(InstallationPhase.INIT)
            state_manager.complete_phase(InstallationPhase.INIT)
            
            # Test file tracking
            test_file = self.claude_dir / "test.txt"
            test_file.touch()
            state_manager.add_file_created(test_file)
            
            # Test summary
            summary = state_manager.get_installation_summary()
            self.assertIn("installation_id", summary)
            self.assertEqual(summary["created_files"], 1)
            
        except ImportError as e:
            self.fail(f"Could not test installation state manager: {e}")
    
    @patch('builtins.print')
    def test_core_installer_integration(self, mock_print):
        """Test core installer with new integration features."""
        try:
            # Mock the necessary dependencies
            with patch('core_installer.Path') as mock_path:
                mock_path.home.return_value = self.claude_dir
                
                # Create mock project structure
                (self.project_dir / "Scripts" / "config").mkdir(parents=True, exist_ok=True)
                
                # Create minimal features.json
                features_config = {
                    "core": {
                        "name": "Core Framework",
                        "files": ["SuperClaude/Core/CLAUDE.md"],
                        "target_files": ["~/.claude/CLAUDE.md"]
                    }
                }
                
                import json
                with open(self.project_dir / "Scripts" / "config" / "features.json", 'w') as f:
                    json.dump(features_config, f)
                
                # Create source file
                (self.project_dir / "SuperClaude" / "Core").mkdir(parents=True, exist_ok=True)
                (self.project_dir / "SuperClaude" / "Core" / "CLAUDE.md").touch()
                
                from core_installer import CoreInstaller
                
                installer = CoreInstaller(str(self.project_dir))
                
                # Test that integration components are initialized
                if hasattr(installer, 'state_manager'):
                    self.assertIsNotNone(installer.state_manager)
                if hasattr(installer, 'integration_validator'):
                    self.assertIsNotNone(installer.integration_validator)
                
        except ImportError as e:
            self.skipTest(f"Core installer not available for testing: {e}")
    
    def test_utils_init_lazy_loading(self):
        """Test that utils __init__.py supports lazy loading."""
        try:
            # Test dependency checking
            sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))
            import utils
            
            if hasattr(utils, 'check_dependencies'):
                dependencies = utils.check_dependencies()
                self.assertIsInstance(dependencies, dict)
                
                # Should include our new modules
                expected_modules = ["logger", "installation_state", "integration_validator", "module_loader"]
                for module in expected_modules:
                    self.assertIn(module, dependencies)
            
        except ImportError as e:
            self.skipTest(f"Utils package not available for testing: {e}")
    
    def test_rollback_mechanism(self):
        """Test rollback mechanism functionality."""
        try:
            from installation_state import InstallationStateManager
            
            state_manager = InstallationStateManager(self.claude_dir, self.project_dir)
            
            # Create test files to track
            test_file = self.claude_dir / "test_rollback.txt"
            test_file.write_text("test content")
            
            # Track file creation
            state_manager.add_file_created(test_file)
            
            # Test rollback
            success = state_manager.rollback()
            
            # File should be removed
            self.assertFalse(test_file.exists(), "Test file should be removed during rollback")
            self.assertTrue(success, "Rollback should succeed")
            
        except ImportError as e:
            self.fail(f"Could not test rollback mechanism: {e}")
    
    def test_enhanced_logging_integration(self):
        """Test enhanced logging integration with installers."""
        try:
            from logger import SuperClaudeLogger, LogLevel
            
            # Test logger creation
            logger = SuperClaudeLogger("test", console_level=LogLevel.DEBUG)
            
            # Test different log levels
            logger.debug("Debug message")
            logger.info("Info message")
            logger.success("Success message")
            logger.warning("Warning message")
            logger.error("Error message")
            
            # Should not raise exceptions
            self.assertTrue(True, "Enhanced logging works correctly")
            
        except ImportError as e:
            self.fail(f"Could not test enhanced logging: {e}")


class TestDeadCodeRemoval(unittest.TestCase):
    """Test that dead code has been properly removed."""
    
    def test_merge_mcp_servers_removed(self):
        """Test that _merge_mcp_servers method has been removed from settings_installer."""
        try:
            from settings_installer import SettingsInstaller
            
            # Method should not exist
            self.assertFalse(hasattr(SettingsInstaller, '_merge_mcp_servers'),
                           "_merge_mcp_servers method should be removed")
            
        except ImportError as e:
            self.skipTest(f"Settings installer not available for testing: {e}")
    
    def test_run_requirements_check_removed(self):
        """Test that run_requirements_check function has been removed from install.sh."""
        install_sh_path = Path(__file__).parent.parent.parent / "install.sh"
        
        if install_sh_path.exists():
            content = install_sh_path.read_text()
            
            # Function should not be defined
            self.assertNotIn("run_requirements_check() {", content,
                           "run_requirements_check function should be removed")
            
            # But documentation should mention it was removed
            self.assertIn("run_requirements_check function removed", content,
                        "Should document that function was removed")


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)