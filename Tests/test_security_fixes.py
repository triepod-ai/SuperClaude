#!/usr/bin/env python3
"""
Test script to verify security fixes in SuperClaude installation suite.
"""

import sys
import os
import json
from pathlib import Path

# Add paths for imports
scripts_path = Path(__file__).parent.parent / "Scripts"
sys.path.insert(0, str(scripts_path))
sys.path.insert(0, str(scripts_path / "utils"))
sys.path.insert(0, str(scripts_path / "installers"))

def test_mcp_server_validation():
    """Test that MCP server validation uses centralized list."""
    print("Testing MCP server validation...")
    
    try:
        from utils.validation import SecurityPatterns
        from installers.mcp_installer import MCPInstaller
        
        # Check that ALLOWED_MCP_SERVERS exists
        assert hasattr(SecurityPatterns, 'ALLOWED_MCP_SERVERS'), "ALLOWED_MCP_SERVERS not found in SecurityPatterns"
        
        allowed_servers = SecurityPatterns.ALLOWED_MCP_SERVERS
        print(f"✓ Found ALLOWED_MCP_SERVERS: {allowed_servers}")
        
        # Test MCP installer validation
        installer = MCPInstaller(str(Path(__file__).parent.parent))
        
        # Test valid servers
        for server in allowed_servers:
            assert installer._validate_server_id(server), f"Failed to validate valid server: {server}"
        
        # Test invalid server
        assert not installer._validate_server_id("malicious-server"), "Invalid server was accepted"
        
        print("✓ MCP server validation working correctly")
        
    except Exception as e:
        print(f"✗ MCP server validation test failed: {e}")
        return False
    
    return True


def test_exception_handling():
    """Test that hooks installer has specific exception handling."""
    print("\nTesting exception handling in hooks installer...")
    
    try:
        # Read the hooks installer file to check exception handling
        hooks_file = scripts_path / "installers" / "hooks_installer.py"
        with open(hooks_file, 'r') as f:
            content = f.read()
        
        # Check for specific exception types
        assert "except ImportError" in content, "ImportError handling not found"
        assert "except (SyntaxError, AttributeError, TypeError)" in content, "Specific exception handling not found"
        assert "except ModuleNotFoundError" in content, "ModuleNotFoundError handling not found"
        
        print("✓ Specific exception handling implemented correctly")
        
    except Exception as e:
        print(f"✗ Exception handling test failed: {e}")
        return False
    
    return True


def test_module_validation_order():
    """Test that install.sh validates modules before sourcing."""
    print("\nTesting module validation order...")
    
    try:
        install_file = Path(__file__).parent.parent / "install.sh"
        with open(install_file, 'r') as f:
            content = f.read()
        
        # Check that validate_modules is called before sourcing
        validate_pos = content.find("validate_modules")
        source_pos = content.find("source \"$SHELL_DIR/common.sh\"")
        
        assert validate_pos > 0, "validate_modules function not found"
        assert source_pos > 0, "source command not found"
        assert validate_pos < source_pos, "validate_modules should be called before sourcing"
        
        print("✓ Module validation order is correct")
        
    except Exception as e:
        print(f"✗ Module validation order test failed: {e}")
        return False
    
    return True


def test_network_timeouts():
    """Test that network operations have consistent timeouts."""
    print("\nTesting network timeout consistency...")
    
    try:
        common_file = scripts_path / "shell" / "common.sh"
        with open(common_file, 'r') as f:
            content = f.read()
        
        # Check for timeout configuration
        assert "NETWORK_TIMEOUT=" in content, "NETWORK_TIMEOUT not defined"
        assert "NETWORK_RETRY_COUNT=" in content, "NETWORK_RETRY_COUNT not defined"
        
        # Check that download_file function exists
        assert "download_file()" in content, "download_file function not found"
        
        # Check timeout usage in curl and wget
        assert "--max-time $NETWORK_TIMEOUT" in content, "curl not using NETWORK_TIMEOUT"
        assert "--timeout=$NETWORK_TIMEOUT" in content, "wget not using NETWORK_TIMEOUT"
        
        print("✓ Network timeout configuration is consistent")
        
    except Exception as e:
        print(f"✗ Network timeout test failed: {e}")
        return False
    
    return True


def test_settings_validation():
    """Test that settings installer has proper validation."""
    print("\nTesting settings installer validation...")
    
    try:
        # Check settings installer has validation methods
        settings_file = scripts_path / "installers" / "settings_installer.py"
        with open(settings_file, 'r') as f:
            content = f.read()
        
        # Check for validation imports
        assert "from validation import" in content or "InputValidator" in content, "Validation imports not found"
        
        # Check for validation methods
        assert "_validate_env_var" in content, "_validate_env_var method not found"
        assert "validate_merged_settings" in content, "validate_merged_settings method not found"
        
        # Check for security patterns usage
        assert "SecurityPatterns" in content or "ALLOWED_MCP_SERVERS" in content, "Security patterns not used"
        
        print("✓ Settings installer has proper validation")
        
    except Exception as e:
        print(f"✗ Settings validation test failed: {e}")
        return False
    
    return True


def main():
    """Run all security tests."""
    print("=== SuperClaude Security Fix Verification ===\n")
    
    tests = [
        test_mcp_server_validation,
        test_exception_handling,
        test_module_validation_order,
        test_network_timeouts,
        test_settings_validation
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
    
    print(f"\n=== Test Summary ===")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total: {len(tests)}")
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())