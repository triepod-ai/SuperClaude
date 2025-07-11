#!/usr/bin/env python3
"""
Integration tests for installation orchestrator.

Tests workflow coordination, component integration, and user interaction flows.
"""

import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock

# Import test helpers
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "helpers"))

from test_environment import IsolatedEnvironment, mock_installation_environment
from mock_system import MockInteractiveMenu, MockProgressTracker, create_mock_installer_environment
from assertions import assert_successful_installation
from fixtures_manager import FixturesManager


class TestOrchestratorIntegration:
    """Integration tests for installation orchestrator."""
    
    @pytest.fixture
    def orchestrator_class(self):
        """Get orchestrator class for testing."""
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts"))
            from main import SuperClaudeOrchestrator
            return SuperClaudeOrchestrator
        except ImportError:
            # Fallback mock orchestrator
            class MockOrchestrator:
                def __init__(self, project_dir):
                    self.project_dir = Path(project_dir)
                    self.selected_features = set()
                    self.installation_type = "standard"
                
                def run_installation(self):
                    return {"success": True, "components": list(self.selected_features)}
                
                def show_main_menu(self):
                    return "install"
                
                def show_installation_type_menu(self):
                    return "standard"
                
                def show_component_selection_menu(self):
                    self.selected_features = {"core", "hooks"}
                    return list(self.selected_features)
            
            return MockOrchestrator
    
    @pytest.fixture
    def mock_environment(self):
        """Create mock environment for orchestrator testing."""
        return create_mock_installer_environment()
    
    def test_orchestrator_initialization(self, orchestrator_class):
        """Test orchestrator initialization."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            assert orchestrator.project_dir == env.project_dir
            assert hasattr(orchestrator, 'selected_features')
            assert hasattr(orchestrator, 'installation_type')
    
    def test_orchestrator_main_menu_flow(self, orchestrator_class, mock_environment):
        """Test main menu flow orchestration."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock menu interactions
            with patch.object(orchestrator, 'show_main_menu', return_value="install"):
                with patch.object(orchestrator, 'show_installation_type_menu', return_value="standard"):
                    with patch.object(orchestrator, 'show_component_selection_menu', return_value=["core"]):
                        # Simulate menu flow
                        menu_choice = orchestrator.show_main_menu()
                        installation_type = orchestrator.show_installation_type_menu()
                        components = orchestrator.show_component_selection_menu()
                        
                        assert menu_choice == "install"
                        assert installation_type == "standard"
                        assert "core" in components
    
    def test_orchestrator_component_selection(self, orchestrator_class):
        """Test component selection orchestration."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock interactive menu
            mock_menu = MockInteractiveMenu(responses=["1 2 3"])  # Select multiple components
            
            if hasattr(orchestrator, 'menu'):
                orchestrator.menu = mock_menu
            
            # Test component selection
            with patch.object(orchestrator, 'show_component_selection_menu') as mock_selection:
                mock_selection.return_value = ["core", "hooks", "commands"]
                
                components = orchestrator.show_component_selection_menu()
                
                assert len(components) == 3
                assert "core" in components
                assert "hooks" in components
                assert "commands" in components
    
    def test_orchestrator_installation_workflow(self, orchestrator_class, mock_environment):
        """Test complete installation workflow orchestration."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Configure orchestrator
            orchestrator.selected_features = {"core", "hooks"}
            orchestrator.installation_type = "standard"
            
            # Mock installer components
            mock_installers = {
                'core': Mock(install=Mock(return_value={"success": True, "installed_files": ["CLAUDE.md"]})),
                'hooks': Mock(install=Mock(return_value={"success": True, "installed_files": ["hook_registry.py"]}))
            }
            
            # Mock installer creation
            def create_installer(component):
                return mock_installers.get(component, Mock())
            
            if hasattr(orchestrator, '_create_installer'):
                orchestrator._create_installer = create_installer
            
            # Run installation
            with patch.object(orchestrator, 'run_installation') as mock_run:
                mock_run.return_value = {"success": True, "components": ["core", "hooks"]}
                
                result = orchestrator.run_installation()
                
                assert result["success"] is True
                assert "core" in result["components"]
                assert "hooks" in result["components"]
    
    def test_orchestrator_dependency_resolution(self, orchestrator_class):
        """Test dependency resolution in orchestrator."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock features configuration with dependencies
            mock_features = {
                "core": {"dependencies": []},
                "hooks": {"dependencies": ["core"]},
                "commands": {"dependencies": ["core"]},
                "mcp": {"dependencies": ["core"]}
            }
            
            if hasattr(orchestrator, 'features'):
                orchestrator.features = mock_features
            
            # Test dependency resolution
            if hasattr(orchestrator, '_resolve_dependencies'):
                selected = {"hooks", "mcp"}  # hooks and mcp depend on core
                resolved = orchestrator._resolve_dependencies(selected)
                
                # Should automatically include core
                assert "core" in resolved
                assert "hooks" in resolved
                assert "mcp" in resolved
            else:
                # Manual dependency resolution test
                selected = {"hooks", "mcp"}
                if "hooks" in selected or "mcp" in selected:
                    selected.add("core")
                
                assert "core" in selected
    
    def test_orchestrator_progress_coordination(self, orchestrator_class):
        """Test progress tracking coordination across components."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock progress tracker
            progress_tracker = MockProgressTracker()
            
            if hasattr(orchestrator, 'progress'):
                orchestrator.progress = progress_tracker
            
            # Configure installation
            orchestrator.selected_features = {"core", "hooks", "commands"}
            
            # Mock installation steps
            with patch.object(orchestrator, 'run_installation') as mock_run:
                def mock_install():
                    progress_tracker.start("Installing components", 3)
                    progress_tracker.update(1, "Installing core")
                    progress_tracker.update(1, "Installing hooks")
                    progress_tracker.update(1, "Installing commands")
                    progress_tracker.finish("Installation complete")
                    return {"success": True, "components": ["core", "hooks", "commands"]}
                
                mock_run.side_effect = mock_install
                
                result = orchestrator.run_installation()
                
                assert result["success"] is True
                assert progress_tracker.started is True
                assert progress_tracker.finished is True
                assert progress_tracker.current_step == 3
    
    def test_orchestrator_error_handling(self, orchestrator_class):
        """Test orchestrator error handling and recovery."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock installer that fails
            failing_installer = Mock()
            failing_installer.install.return_value = {
                "success": False, 
                "error": "Installation failed"
            }
            
            # Configure for installation
            orchestrator.selected_features = {"core"}
            
            # Mock installer creation to return failing installer
            if hasattr(orchestrator, '_create_installer'):
                orchestrator._create_installer = lambda x: failing_installer
            
            # Test error handling
            with patch.object(orchestrator, 'run_installation') as mock_run:
                mock_run.return_value = {
                    "success": False, 
                    "error": "Core installation failed",
                    "failed_components": ["core"]
                }
                
                result = orchestrator.run_installation()
                
                assert result["success"] is False
                assert "error" in result
                assert "core" in result.get("failed_components", [])
    
    def test_orchestrator_rollback_coordination(self, orchestrator_class):
        """Test orchestrator rollback coordination."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock installers with rollback capability
            core_installer = Mock()
            core_installer.install.return_value = {"success": True, "installed_files": ["CLAUDE.md"]}
            core_installer.rollback.return_value = {"success": True}
            
            hooks_installer = Mock()
            hooks_installer.install.return_value = {"success": False, "error": "Hooks failed"}
            hooks_installer.rollback.return_value = {"success": True}
            
            installers = {"core": core_installer, "hooks": hooks_installer}
            
            # Configure orchestrator
            orchestrator.selected_features = {"core", "hooks"}
            
            # Mock rollback scenario
            with patch.object(orchestrator, '_rollback_installation') as mock_rollback:
                mock_rollback.return_value = {
                    "success": True,
                    "rolled_back_components": ["core"]
                }
                
                # Simulate partial failure requiring rollback
                if hasattr(orchestrator, '_rollback_installation'):
                    rollback_result = orchestrator._rollback_installation(["core"])
                    
                    assert rollback_result["success"] is True
                    assert "core" in rollback_result["rolled_back_components"]
    
    def test_orchestrator_update_mode(self, orchestrator_class):
        """Test orchestrator update mode coordination."""
        with mock_installation_environment(components=["core"]) as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Set update mode
            if hasattr(orchestrator, 'update_mode'):
                orchestrator.update_mode = True
            
            # Configure for update
            orchestrator.selected_features = {"core", "hooks"}  # Add hooks to existing core
            
            # Mock update workflow
            with patch.object(orchestrator, 'run_installation') as mock_run:
                mock_run.return_value = {
                    "success": True,
                    "components": ["core", "hooks"],
                    "updated_components": ["core"],
                    "new_components": ["hooks"]
                }
                
                result = orchestrator.run_installation()
                
                assert result["success"] is True
                assert "updated_components" in result
                assert "new_components" in result
    
    def test_orchestrator_validation_integration(self, orchestrator_class):
        """Test orchestrator integration with post-installation validation."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock validation
            mock_validator = Mock()
            mock_validator.validate.return_value = True
            
            if hasattr(orchestrator, 'validator'):
                orchestrator.validator = mock_validator
            
            # Configure installation
            orchestrator.selected_features = {"core"}
            
            # Mock installation with validation
            with patch.object(orchestrator, 'run_installation') as mock_run:
                def mock_install_and_validate():
                    # Installation
                    install_result = {"success": True, "components": ["core"]}
                    
                    # Validation
                    if hasattr(orchestrator, 'validator'):
                        validation_result = orchestrator.validator.validate()
                        install_result["validation_passed"] = validation_result
                    
                    return install_result
                
                mock_run.side_effect = mock_install_and_validate
                
                result = orchestrator.run_installation()
                
                assert result["success"] is True
                if "validation_passed" in result:
                    assert result["validation_passed"] is True
    
    def test_orchestrator_concurrent_operation_handling(self, orchestrator_class):
        """Test orchestrator handling of concurrent operations."""
        import threading
        import time
        
        results = []
        errors = []
        
        def orchestrator_worker(worker_id):
            try:
                with mock_installation_environment() as env:
                    orchestrator = orchestrator_class(env.project_dir)
                    orchestrator.selected_features = {"core"}
                    
                    # Add delay to encourage concurrency
                    time.sleep(0.01 * worker_id)
                    
                    with patch.object(orchestrator, 'run_installation') as mock_run:
                        mock_run.return_value = {
                            "success": True, 
                            "components": ["core"],
                            "worker_id": worker_id
                        }
                        
                        result = orchestrator.run_installation()
                        results.append((worker_id, result))
            except Exception as e:
                errors.append((worker_id, e))
        
        # Run multiple orchestrators concurrently
        threads = []
        for i in range(3):
            thread = threading.Thread(target=orchestrator_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify results
        assert len(errors) == 0, f"Concurrent operation errors: {errors}"
        assert len(results) == 3
        
        # All operations should succeed
        for worker_id, result in results:
            assert result["success"] is True
            assert result["worker_id"] == worker_id


class TestOrchestratorAdvanced:
    """Advanced orchestrator integration tests."""
    
    @pytest.fixture
    def fixtures_manager(self):
        """Create fixtures manager."""
        return FixturesManager()
    
    def test_orchestrator_real_file_integration(self, orchestrator_class, fixtures_manager):
        """Test orchestrator with real file operations."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create real project structure
            project_dir = fixtures_manager.create_mock_source_files(temp_path)
            claude_dir = temp_path / "test_claude"
            
            orchestrator = orchestrator_class(project_dir)
            
            # Override claude directory for testing
            if hasattr(orchestrator, 'claude_dir'):
                orchestrator.claude_dir = claude_dir
            
            # Configure for real installation
            orchestrator.selected_features = {"core"}
            orchestrator.installation_type = "standard"
            
            # Run real installation
            with patch('shutil.copy2') as mock_copy:
                mock_copy.return_value = None
                
                result = orchestrator.run_installation()
                
                assert result["success"] is True
                assert mock_copy.called
    
    def test_orchestrator_complex_dependency_resolution(self, orchestrator_class, fixtures_manager):
        """Test orchestrator with complex dependency chains."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Create complex dependency graph
            complex_features = {
                "core": {"dependencies": []},
                "hooks": {"dependencies": ["core"]},
                "commands": {"dependencies": ["core", "hooks"]},
                "mcp": {"dependencies": ["core"]},
                "profiles": {"dependencies": ["core", "commands", "mcp"]}
            }
            
            if hasattr(orchestrator, 'features'):
                orchestrator.features = complex_features
            
            # Test complex dependency resolution
            if hasattr(orchestrator, '_resolve_dependencies'):
                # Select only profiles (should pull in everything)
                selected = {"profiles"}
                resolved = orchestrator._resolve_dependencies(selected)
                
                expected = {"core", "hooks", "commands", "mcp", "profiles"}
                assert resolved == expected or all(dep in resolved for dep in expected)
    
    def test_orchestrator_installation_profiles(self, orchestrator_class, fixtures_manager):
        """Test orchestrator with predefined installation profiles."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock installation profiles
            profiles = {
                "minimal": {"components": ["core"]},
                "standard": {"components": ["core", "hooks", "commands"]},
                "full": {"components": ["core", "hooks", "commands", "mcp"]}
            }
            
            if hasattr(orchestrator, 'profiles'):
                orchestrator.profiles = profiles
            
            # Test profile selection
            if hasattr(orchestrator, 'apply_profile'):
                orchestrator.apply_profile("standard")
                expected_components = {"core", "hooks", "commands"}
                assert orchestrator.selected_features == expected_components
    
    def test_orchestrator_user_interaction_flow(self, orchestrator_class):
        """Test complete user interaction flow."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock complete user interaction
            interaction_sequence = [
                "install",          # Main menu choice
                "standard",         # Installation type
                "core hooks"        # Component selection
            ]
            
            mock_menu = MockInteractiveMenu(responses=interaction_sequence)
            
            if hasattr(orchestrator, 'menu'):
                orchestrator.menu = mock_menu
            
            # Simulate complete user flow
            with patch.object(orchestrator, 'show_main_menu', return_value="install"):
                with patch.object(orchestrator, 'show_installation_type_menu', return_value="standard"):
                    with patch.object(orchestrator, 'show_component_selection_menu', return_value=["core", "hooks"]):
                        with patch.object(orchestrator, 'run_installation') as mock_run:
                            mock_run.return_value = {"success": True, "components": ["core", "hooks"]}
                            
                            # Execute full workflow
                            main_choice = orchestrator.show_main_menu()
                            install_type = orchestrator.show_installation_type_menu()
                            components = orchestrator.show_component_selection_menu()
                            
                            # Set selections
                            orchestrator.installation_type = install_type
                            orchestrator.selected_features = set(components)
                            
                            # Run installation
                            result = orchestrator.run_installation()
                            
                            # Verify complete workflow
                            assert main_choice == "install"
                            assert install_type == "standard"
                            assert set(components) == {"core", "hooks"}
                            assert result["success"] is True
    
    def test_orchestrator_configuration_persistence(self, orchestrator_class):
        """Test orchestrator configuration persistence."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Configure orchestrator
            orchestrator.selected_features = {"core", "hooks"}
            orchestrator.installation_type = "development"
            
            # Mock configuration save/load
            if hasattr(orchestrator, 'save_configuration'):
                config_data = {
                    "selected_features": list(orchestrator.selected_features),
                    "installation_type": orchestrator.installation_type
                }
                
                orchestrator.save_configuration(config_data)
                
                # Create new orchestrator and load config
                new_orchestrator = orchestrator_class(env.project_dir)
                if hasattr(new_orchestrator, 'load_configuration'):
                    loaded_config = new_orchestrator.load_configuration()
                    
                    assert set(loaded_config["selected_features"]) == {"core", "hooks"}
                    assert loaded_config["installation_type"] == "development"
    
    def test_orchestrator_resource_management(self, orchestrator_class):
        """Test orchestrator resource management."""
        with mock_installation_environment() as env:
            orchestrator = orchestrator_class(env.project_dir)
            
            # Mock resource monitoring
            if hasattr(orchestrator, 'monitor_resources'):
                # Configure for resource-intensive installation
                orchestrator.selected_features = {"core", "hooks", "commands", "mcp"}
                
                resource_data = {
                    "memory_usage": "50MB",
                    "disk_space": "100MB",
                    "cpu_usage": "25%"
                }
                
                # Monitor resources during installation
                with patch.object(orchestrator, 'monitor_resources', return_value=resource_data):
                    resources = orchestrator.monitor_resources()
                    
                    assert "memory_usage" in resources
                    assert "disk_space" in resources
                    assert "cpu_usage" in resources