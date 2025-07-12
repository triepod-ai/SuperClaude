#!/usr/bin/env python3
"""
Comprehensive Test Suite for SuperClaude Schema Validation

Tests JSON schema validation, security threat detection, and configuration integrity.

Author: SuperClaude Security Team
Version: 1.0.0
"""

import json
import tempfile
import unittest
from pathlib import Path
import sys
import os

# Add utils to path for imports
utils_path = str(Path(__file__).parent.parent / "utils")
sys.path.insert(0, utils_path)

try:
    from schema_validator import ConfigurationValidator, SuperClaudeSchemas
    VALIDATOR_AVAILABLE = True
except ImportError:
    VALIDATOR_AVAILABLE = False

class TestSchemaValidation(unittest.TestCase):
    """Test suite for SuperClaude schema validation"""
    
    def setUp(self):
        """Set up test environment"""
        if not VALIDATOR_AVAILABLE:
            self.skipTest("Schema validator not available")
        
        self.validator = ConfigurationValidator()
        self.schemas = SuperClaudeSchemas()
        self.temp_dir = Path(tempfile.mkdtemp())
    
    def tearDown(self):
        """Clean up test environment"""
        import shutil
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    def create_temp_json_file(self, data: dict) -> Path:
        """Create a temporary JSON file for testing"""
        temp_file = self.temp_dir / "test_config.json"
        with open(temp_file, 'w') as f:
            json.dump(data, f, indent=2)
        return temp_file
    
    def test_valid_features_config(self):
        """Test validation of valid features.json"""
        valid_config = {
            "core": {
                "name": "Core Framework",
                "description": "Essential SuperClaude framework files",
                "required": True,
                "recommended": True,
                "dependencies": [],
                "installer": "core_installer.py",
                "files": [
                    "SuperClaude/Core/CLAUDE.md",
                    "SuperClaude/Settings/settings.json"
                ],
                "target_files": [
                    "~/.claude/CLAUDE.md",
                    "~/.claude/settings.json"
                ],
                "post_install": [
                    "Validate settings.json configuration"
                ]
            }
        }
        
        config_file = self.create_temp_json_file(valid_config)
        success, errors, data = self.validator.validate_features_config(config_file)
        
        self.assertTrue(success, f"Validation failed: {errors}")
        self.assertEqual(len(errors), 0)
        self.assertEqual(data, valid_config)
    
    def test_invalid_features_config_missing_required(self):
        """Test validation fails for missing required fields"""
        invalid_config = {
            "core": {
                "name": "Core Framework",
                # Missing required fields: description, required, installer, files, target_files
            }
        }
        
        config_file = self.create_temp_json_file(invalid_config)
        success, errors, data = self.validator.validate_features_config(config_file)
        
        self.assertFalse(success)
        self.assertGreater(len(errors), 0)
        self.assertIn("required", str(errors).lower())
    
    def test_invalid_features_config_wrong_types(self):
        """Test validation fails for wrong data types"""
        invalid_config = {
            "core": {
                "name": 123,  # Should be string
                "description": "Test",
                "required": "yes",  # Should be boolean
                "installer": "core_installer.py",
                "files": "not_an_array",  # Should be array
                "target_files": ["~/.claude/test"]
            }
        }
        
        config_file = self.create_temp_json_file(invalid_config)
        success, errors, data = self.validator.validate_features_config(config_file)
        
        self.assertFalse(success)
        self.assertGreater(len(errors), 0)
    
    def test_valid_settings_config(self):
        """Test validation of valid settings.json"""
        valid_config = {
            "description": "SuperClaude Framework v3.0 - Global Claude Code Settings",
            "version": "3.0.0",
            "framework": "superclaude",
            "permissions": {
                "defaultMode": "acceptEdits",
                "allow": [
                    "Bash(find:*)",
                    "Read(*)"
                ],
                "deny": [
                    "Bash(sudo:*)"
                ]
            },
            "env": {
                "CLAUDE_CODE_SUPERCLAUDE": "enabled",
                "SUPERCLAUDE_VERSION": "3.0.0"
            },
            "includeCoAuthoredBy": True,
            "cleanupPeriodDays": 30,
            "hooks": {
                "PreToolUse": [
                    {
                        "matcher": "*",
                        "hooks": [
                            {
                                "type": "command",
                                "command": "echo 'test'",
                                "timeout": 5000,
                                "description": "Test hook"
                            }
                        ]
                    }
                ]
            }
        }
        
        config_file = self.create_temp_json_file(valid_config)
        success, errors, data = self.validator.validate_settings_config(config_file)
        
        self.assertTrue(success, f"Validation failed: {errors}")
        self.assertEqual(len(errors), 0)
    
    def test_invalid_settings_config_version_format(self):
        """Test validation fails for invalid version format"""
        invalid_config = {
            "description": "Test",
            "version": "not.a.version",  # Invalid version format
            "permissions": {
                "defaultMode": "acceptEdits",
                "allow": []
            },
            "env": {},
            "hooks": {}
        }
        
        config_file = self.create_temp_json_file(invalid_config)
        success, errors, data = self.validator.validate_settings_config(config_file)
        
        self.assertFalse(success)
        self.assertGreater(len(errors), 0)
        self.assertIn("version", str(errors).lower())
    
    def test_security_threat_detection_command_injection(self):
        """Test detection of command injection patterns"""
        malicious_config = {
            "core": {
                "name": "Core Framework",
                "description": "Test; rm -rf /",  # Command injection
                "required": True,
                "installer": "core_installer.py",
                "files": [],
                "target_files": []
            }
        }
        
        config_file = self.create_temp_json_file(malicious_config)
        success, errors, data = self.validator.validate_features_config(config_file)
        
        self.assertFalse(success)
        self.assertIn("security threats", str(errors).lower())
    
    def test_security_threat_detection_path_traversal(self):
        """Test detection of path traversal patterns"""
        malicious_config = {
            "core": {
                "name": "Core Framework",
                "description": "Test",
                "required": True,
                "installer": "core_installer.py",
                "files": ["../../../etc/passwd"],  # Path traversal
                "target_files": []
            }
        }
        
        config_file = self.create_temp_json_file(malicious_config)
        success, errors, data = self.validator.validate_features_config(config_file)
        
        self.assertFalse(success)
        self.assertIn("security threats", str(errors).lower())
    
    def test_security_threat_detection_script_tags(self):
        """Test detection of script tag patterns"""
        malicious_config = {
            "description": "<script>alert('xss')</script>Test",  # XSS attempt
            "version": "3.0.0",
            "permissions": {
                "defaultMode": "acceptEdits",
                "allow": []
            },
            "env": {},
            "hooks": {}
        }
        
        config_file = self.create_temp_json_file(malicious_config)
        success, errors, data = self.validator.validate_settings_config(config_file)
        
        self.assertFalse(success)
        self.assertIn("security threats", str(errors).lower())
    
    def test_dangerous_permissions_detection(self):
        """Test detection of dangerous permission patterns"""
        dangerous_config = {
            "description": "Test",
            "version": "3.0.0",
            "permissions": {
                "defaultMode": "acceptEdits",
                "allow": [
                    "Bash(sudo:*)",  # Dangerous permission
                    "WebFetch(domain:*)"  # Overly broad permission
                ]
            },
            "env": {},
            "hooks": {}
        }
        
        config_file = self.create_temp_json_file(dangerous_config)
        success, errors, data = self.validator.validate_settings_config(config_file)
        
        # Should detect dangerous patterns in additional validation
        self.assertFalse(success)
        self.assertIn("dangerous", str(errors).lower())
    
    def test_mcp_config_validation(self):
        """Test MCP server configuration validation"""
        valid_mcp_config = {
            "command": "mcp-server-sequential",
            "args": [],
            "description": "Sequential thinking server",
            "scope": "user"
        }
        
        success, errors = self.validator.validate_mcp_config(valid_mcp_config, "sequential")
        self.assertTrue(success)
        self.assertEqual(len(errors), 0)
    
    def test_mcp_config_validation_invalid_command(self):
        """Test MCP config validation with invalid command"""
        invalid_mcp_config = {
            "command": "invalid-command;rm -rf /",  # Invalid characters
            "args": [],
            "description": "Test",
            "scope": "user"
        }
        
        success, errors = self.validator.validate_mcp_config(invalid_mcp_config, "test")
        self.assertFalse(success)
        self.assertGreater(len(errors), 0)
    
    def test_integrity_manifest_creation(self):
        """Test integrity manifest creation"""
        config_file = self.create_temp_json_file({"test": "data"})
        manifest = self.validator.create_integrity_manifest([config_file])
        
        self.assertIn(str(config_file), manifest)
        self.assertIsNotNone(manifest[str(config_file)])
        self.assertEqual(len(manifest[str(config_file)]), 64)  # SHA-256 hex length
    
    def test_integrity_manifest_verification(self):
        """Test integrity manifest verification"""
        config_file = self.create_temp_json_file({"test": "data"})
        manifest = self.validator.create_integrity_manifest([config_file])
        
        # Verify original manifest
        success, errors = self.validator.verify_integrity_manifest(manifest)
        self.assertTrue(success)
        self.assertEqual(len(errors), 0)
        
        # Modify file and verify again
        with open(config_file, 'w') as f:
            json.dump({"test": "modified"}, f)
        
        success, errors = self.validator.verify_integrity_manifest(manifest)
        self.assertFalse(success)
        self.assertGreater(len(errors), 0)
        self.assertIn("modified", str(errors).lower())
    
    def test_malformed_json_handling(self):
        """Test handling of malformed JSON"""
        malformed_file = self.temp_dir / "malformed.json"
        with open(malformed_file, 'w') as f:
            f.write('{"invalid": json syntax')
        
        success, errors, data = self.validator.validate_features_config(malformed_file)
        
        self.assertFalse(success)
        self.assertGreater(len(errors), 0)
        self.assertIn("json", str(errors).lower())
    
    def test_nonexistent_file_handling(self):
        """Test handling of nonexistent files"""
        nonexistent_file = self.temp_dir / "nonexistent.json"
        
        success, errors, data = self.validator.validate_features_config(nonexistent_file)
        
        self.assertFalse(success)
        self.assertGreater(len(errors), 0)

class TestSchemaDefinitions(unittest.TestCase):
    """Test schema definitions themselves"""
    
    def setUp(self):
        """Set up test environment"""
        if not VALIDATOR_AVAILABLE:
            self.skipTest("Schema validator not available")
        
        self.schemas = SuperClaudeSchemas()
    
    def test_features_schema_structure(self):
        """Test features schema has required structure"""
        schema = self.schemas.get_features_schema()
        
        self.assertIn("type", schema)
        self.assertEqual(schema["type"], "object")
        self.assertIn("properties", schema)
        self.assertIn("core", schema["properties"])
        self.assertIn("required", schema)
        self.assertIn("core", schema["required"])
    
    def test_settings_schema_structure(self):
        """Test settings schema has required structure"""
        schema = self.schemas.get_settings_schema()
        
        self.assertIn("type", schema)
        self.assertEqual(schema["type"], "object")
        self.assertIn("properties", schema)
        self.assertIn("permissions", schema["properties"])
        self.assertIn("hooks", schema["properties"])
        self.assertIn("required", schema)

def run_schema_validation_tests():
    """Run all schema validation tests"""
    if not VALIDATOR_AVAILABLE:
        print("❌ Schema validator not available - tests skipped")
        return False
    
    print("🔍 Running SuperClaude Schema Validation Tests...")
    
    # Create test suite
    suite = unittest.TestSuite()
    
    # Add test cases
    suite.addTest(unittest.makeSuite(TestSchemaValidation))
    suite.addTest(unittest.makeSuite(TestSchemaDefinitions))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print results
    tests_run = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    success_rate = ((tests_run - failures - errors) / tests_run * 100) if tests_run > 0 else 0
    
    print(f"\n📊 Schema Validation Test Results:")
    print(f"   Tests Run: {tests_run}")
    print(f"   Successes: {tests_run - failures - errors}")
    print(f"   Failures: {failures}")
    print(f"   Errors: {errors}")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    if failures == 0 and errors == 0:
        print("✅ All schema validation tests passed!")
        return True
    else:
        print("❌ Some schema validation tests failed")
        return False

if __name__ == "__main__":
    run_schema_validation_tests()