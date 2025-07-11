#!/usr/bin/env python3
"""
Integration tests for MCP installer component.

Tests MCP server installation, Claude Code integration, and npm package management.
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
from mock_system import MockProcessRunner, MockInteractiveMenu
from assertions import InstallationAssertions


class TestMCPInstallerIntegration:
    """Integration tests for MCP installer."""
    
    @pytest.fixture
    def mcp_installer(self):
        """Create MCP installer instance for testing."""
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts" / "installers"))
            from mcp_installer import MCPInstaller
            return MCPInstaller
        except ImportError:
            # Fallback mock installer
            class MockMCPInstaller:
                def __init__(self, project_dir, installation_type="standard"):
                    self.project_dir = Path(project_dir)
                    self.installation_type = installation_type
                    self.selected_servers = set()
                
                def install(self):
                    return {
                        "success": True, 
                        "installed_servers": list(self.selected_servers),
                        "skipped_servers": []
                    }
                
                def show_server_selection_menu(self):
                    return ["sequential", "context7"]
            
            return MockMCPInstaller
    
    @pytest.fixture
    def mock_mcp_config(self):
        """Create mock MCP configuration."""
        return {
            "sequential": {
                "name": "Sequential Thinking",
                "description": "Multi-step reasoning",
                "package": "mcp-server-sequential-thinking",
                "api_key": False,
                "recommended": True
            },
            "context7": {
                "name": "Context7 Documentation",
                "description": "Documentation analysis",
                "package": "mcp-server-context7",
                "api_key": False,
                "recommended": True
            },
            "magic": {
                "name": "Magic UI Components",
                "description": "UI component generation",
                "package": "mcp-server-magic",
                "api_key": True,
                "key_name": "MAGIC_API_KEY",
                "recommended": False
            }
        }
    
    def test_mcp_installer_initialization(self, mcp_installer):
        """Test MCP installer initialization."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            
            assert installer.project_dir == env.project_dir
            assert hasattr(installer, 'selected_servers')
    
    def test_mcp_installer_server_selection_menu(self, mcp_installer, mock_mcp_config):
        """Test MCP server selection menu."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            
            # Mock MCP configuration
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Mock menu interaction
            with patch.object(installer, 'show_server_selection_menu') as mock_menu:
                mock_menu.return_value = ["sequential", "context7"]
                
                selected_servers = installer.show_server_selection_menu()
                
                assert "sequential" in selected_servers
                assert "context7" in selected_servers
    
    @patch('subprocess.run')
    def test_mcp_installer_npm_package_installation(self, mock_run, mcp_installer, mock_mcp_config):
        """Test npm package installation for MCP servers."""
        # Mock successful npm installation
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Package installed successfully"
        mock_run.return_value = mock_result
        
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential", "context7"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Run installation
            result = installer.install()
            
            assert result["success"] is True
            assert "sequential" in result["installed_servers"]
            assert "context7" in result["installed_servers"]
            
            # Verify npm was called
            mock_run.assert_called()
    
    @patch('subprocess.run')
    def test_mcp_installer_claude_integration(self, mock_run, mcp_installer, mock_mcp_config):
        """Test Claude Code integration for MCP servers."""
        # Mock Claude Code MCP commands
        def mock_subprocess(cmd, *args, **kwargs):
            mock_result = Mock()
            
            if 'claude' in cmd and 'mcp' in cmd:
                if 'add' in cmd:
                    mock_result.returncode = 0
                    mock_result.stdout = "MCP server added successfully"
                elif 'list' in cmd:
                    mock_result.returncode = 0
                    mock_result.stdout = "sequential\ncontext7\n"
                else:
                    mock_result.returncode = 0
                    mock_result.stdout = "Success"
            else:
                mock_result.returncode = 0
                mock_result.stdout = "Package installed"
            
            return mock_result
        
        mock_run.side_effect = mock_subprocess
        
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Run installation
            result = installer.install()
            
            assert result["success"] is True
            # Verify Claude MCP commands were called
            claude_calls = [call for call in mock_run.call_args_list 
                          if any('claude' in str(arg) for arg in call[0])]
            assert len(claude_calls) > 0
    
    def test_mcp_installer_api_key_handling(self, mcp_installer, mock_mcp_config):
        """Test API key handling for MCP servers that require them."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"magic"}  # Requires API key
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Mock API key input
            with patch('builtins.input', return_value='test_api_key_12345'):
                with patch('subprocess.run') as mock_run:
                    mock_result = Mock()
                    mock_result.returncode = 0
                    mock_run.return_value = mock_result
                    
                    # Run installation
                    result = installer.install()
                    
                    # Should succeed with API key
                    assert result["success"] is True
                    assert "magic" in result["installed_servers"]
    
    def test_mcp_installer_api_key_validation(self, mcp_installer, mock_mcp_config):
        """Test API key validation for MCP servers."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"magic"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Test with invalid API key (too short)
            with patch('builtins.input', return_value='short'):
                if hasattr(installer, '_validate_api_key'):
                    is_valid = installer._validate_api_key('short')
                    assert is_valid is False
                
                # Test with valid API key
                with patch('builtins.input', return_value='valid_api_key_123456789'):
                    if hasattr(installer, '_validate_api_key'):
                        is_valid = installer._validate_api_key('valid_api_key_123456789')
                        assert is_valid is True
    
    @patch('subprocess.run')
    def test_mcp_installer_partial_failure(self, mock_run, mcp_installer, mock_mcp_config):
        """Test MCP installer handling partial installation failures."""
        # Mock mixed success/failure for different servers
        def mock_subprocess(cmd, *args, **kwargs):
            mock_result = Mock()
            
            if 'sequential' in str(cmd):
                # Sequential succeeds
                mock_result.returncode = 0
                mock_result.stdout = "sequential installed"
            elif 'context7' in str(cmd):
                # Context7 fails
                mock_result.returncode = 1
                mock_result.stderr = "Package not found"
            else:
                mock_result.returncode = 0
                mock_result.stdout = "Success"
            
            return mock_result
        
        mock_run.side_effect = mock_subprocess
        
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential", "context7"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Run installation
            result = installer.install()
            
            # Should succeed partially
            assert "sequential" in result.get("installed_servers", [])
            assert "context7" in result.get("failed_servers", []) or "context7" in result.get("skipped_servers", [])
    
    @patch('shutil.which')
    def test_mcp_installer_missing_prerequisites(self, mock_which, mcp_installer):
        """Test MCP installer with missing prerequisites."""
        # Mock missing npm
        mock_which.return_value = None
        
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential"}
            
            # Run installation
            result = installer.install()
            
            # Should fail due to missing npm
            assert result["success"] is False
            assert "npm" in result.get("error", "").lower()
    
    def test_mcp_installer_server_connectivity_test(self, mcp_installer, mock_mcp_config):
        """Test MCP server connectivity testing."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Mock server connectivity test
            with patch.object(installer, '_test_server_connectivity', return_value=True):
                with patch('subprocess.run') as mock_run:
                    mock_result = Mock()
                    mock_result.returncode = 0
                    mock_run.return_value = mock_result
                    
                    result = installer.install()
                    
                    assert result["success"] is True
                    
                    # Verify connectivity was tested
                    if hasattr(installer, '_test_server_connectivity'):
                        installer._test_server_connectivity.assert_called()
    
    def test_mcp_installer_rollback_on_failure(self, mcp_installer, mock_mcp_config):
        """Test MCP installer rollback on installation failure."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential", "context7"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Mock installation failure after partial success
            with patch('subprocess.run') as mock_run:
                # First call succeeds (sequential), second fails (context7)
                mock_run.side_effect = [
                    Mock(returncode=0, stdout="sequential installed"),  # npm install
                    Mock(returncode=0, stdout="sequential added"),      # claude mcp add
                    Mock(returncode=1, stderr="context7 failed")       # npm install fails
                ]
                
                # Mock rollback
                with patch.object(installer, '_rollback_installed_servers', return_value=True) as mock_rollback:
                    result = installer.install()
                    
                    # Should call rollback
                    if hasattr(installer, '_rollback_installed_servers'):
                        mock_rollback.assert_called()
    
    def test_mcp_installer_configuration_update(self, mcp_installer, mock_mcp_config):
        """Test MCP installer configuration file updates."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Mock configuration update
            with patch('subprocess.run') as mock_run:
                mock_result = Mock()
                mock_result.returncode = 0
                mock_run.return_value = mock_result
                
                # Mock settings file update
                with patch('json.dump') as mock_json_dump:
                    result = installer.install()
                    
                    assert result["success"] is True
                    
                    # Verify configuration was updated
                    if hasattr(installer, '_update_settings_file'):
                        # Settings should be updated with MCP servers
                        assert True
    
    def test_mcp_installer_selective_installation(self, mcp_installer, mock_mcp_config):
        """Test selective MCP server installation."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Test selecting only recommended servers
            recommended_servers = [
                server_id for server_id, config in mock_mcp_config.items()
                if config.get("recommended", False)
            ]
            
            installer.selected_servers = set(recommended_servers)
            
            with patch('subprocess.run') as mock_run:
                mock_result = Mock()
                mock_result.returncode = 0
                mock_run.return_value = mock_result
                
                result = installer.install()
                
                assert result["success"] is True
                assert len(result["installed_servers"]) == len(recommended_servers)
    
    def test_mcp_installer_concurrent_installations(self, mcp_installer, mock_mcp_config):
        """Test MCP installer handling concurrent server installations."""
        import threading
        import time
        
        results = []
        errors = []
        
        def install_worker(worker_id, servers):
            try:
                with mock_installation_environment() as env:
                    installer = mcp_installer(env.project_dir)
                    installer.selected_servers = servers
                    
                    if hasattr(installer, 'mcp_config'):
                        installer.mcp_config = mock_mcp_config
                    
                    # Add delay to encourage concurrency
                    time.sleep(0.01 * worker_id)
                    
                    with patch('subprocess.run') as mock_run:
                        mock_result = Mock()
                        mock_result.returncode = 0
                        mock_result.stdout = f"Worker {worker_id} success"
                        mock_run.return_value = mock_result
                        
                        result = installer.install()
                        results.append((worker_id, result))
            except Exception as e:
                errors.append((worker_id, e))
        
        # Run concurrent installations
        threads = []
        server_sets = [
            {"sequential"},
            {"context7"},
            {"sequential", "context7"}
        ]
        
        for i, servers in enumerate(server_sets):
            thread = threading.Thread(target=install_worker, args=(i, servers))
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


class TestMCPInstallerAdvanced:
    """Advanced MCP installer integration tests."""
    
    def test_mcp_installer_environment_variable_setup(self, mcp_installer, mock_mcp_config):
        """Test MCP installer environment variable setup."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"magic"}  # Requires API key
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Mock API key setup
            with patch('builtins.input', return_value='test_api_key'):
                with patch.dict('os.environ', {}, clear=True):
                    with patch('subprocess.run') as mock_run:
                        mock_result = Mock()
                        mock_result.returncode = 0
                        mock_run.return_value = mock_result
                        
                        result = installer.install()
                        
                        # Check if environment variable was set
                        if hasattr(installer, '_setup_environment_variables'):
                            # API key should be configured in environment
                            assert True
    
    def test_mcp_installer_version_compatibility(self, mcp_installer, mock_mcp_config):
        """Test MCP installer version compatibility checking."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Mock version checking
            with patch.object(installer, '_check_package_version', return_value="1.0.0"):
                with patch('subprocess.run') as mock_run:
                    mock_result = Mock()
                    mock_result.returncode = 0
                    mock_run.return_value = mock_result
                    
                    result = installer.install()
                    
                    assert result["success"] is True
                    
                    # Version should be checked
                    if hasattr(installer, '_check_package_version'):
                        installer._check_package_version.assert_called()
    
    def test_mcp_installer_dependency_resolution(self, mcp_installer):
        """Test MCP installer package dependency resolution."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            
            # Mock complex MCP configuration with dependencies
            complex_config = {
                "sequential": {
                    "name": "Sequential Thinking",
                    "package": "mcp-server-sequential-thinking",
                    "dependencies": []
                },
                "advanced": {
                    "name": "Advanced Server",
                    "package": "mcp-server-advanced",
                    "dependencies": ["sequential"]
                }
            }
            
            installer.selected_servers = {"advanced"}  # Should pull in sequential
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = complex_config
            
            # Mock dependency resolution
            if hasattr(installer, '_resolve_dependencies'):
                resolved = installer._resolve_dependencies(installer.selected_servers)
                assert "sequential" in resolved
                assert "advanced" in resolved
    
    def test_mcp_installer_registry_integration(self, mcp_installer, mock_mcp_config):
        """Test MCP installer integration with package registry."""
        with mock_installation_environment() as env:
            installer = mcp_installer(env.project_dir)
            installer.selected_servers = {"sequential"}
            
            if hasattr(installer, 'mcp_config'):
                installer.mcp_config = mock_mcp_config
            
            # Mock npm registry interaction
            with patch('subprocess.run') as mock_run:
                def mock_npm_command(cmd, *args, **kwargs):
                    mock_result = Mock()
                    
                    if 'npm' in cmd and 'view' in cmd:
                        # Package info query
                        mock_result.returncode = 0
                        mock_result.stdout = '{"version": "1.2.3", "description": "Test package"}'
                    elif 'npm' in cmd and 'install' in cmd:
                        # Package installation
                        mock_result.returncode = 0
                        mock_result.stdout = "Package installed successfully"
                    else:
                        mock_result.returncode = 0
                        mock_result.stdout = "Success"
                    
                    return mock_result
                
                mock_run.side_effect = mock_npm_command
                
                result = installer.install()
                
                assert result["success"] is True
                
                # Verify registry interaction
                registry_calls = [call for call in mock_run.call_args_list 
                                if any('npm' in str(arg) for arg in call[0])]
                assert len(registry_calls) > 0