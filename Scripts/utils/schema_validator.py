#!/usr/bin/env python3
"""
SuperClaude JSON Schema Validation Framework

Provides comprehensive schema validation for all SuperClaude configuration files
with security-focused validation, integrity checking, and detailed error reporting.

Security Features:
- JSON schema validation with informative error messages
- Configuration file integrity checking (checksums/hashes)
- Malformed JSON attack prevention
- Configuration tampering detection
- Secure configuration defaults

Author: SuperClaude Security Team
Version: 1.0.0
"""

import json
import hashlib
import os
import re
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional, Union, Tuple
from datetime import datetime
import logging

try:
    import jsonschema
    from jsonschema import validate, ValidationError, Draft7Validator
    JSONSCHEMA_AVAILABLE = True
except ImportError:
    JSONSCHEMA_AVAILABLE = False

# Fallback validation classes for environments without jsonschema
class FallbackValidationError(Exception):
    """Fallback validation error when jsonschema is not available"""
    pass

class SecurityLogger:
    """Security-focused logging for schema validation events"""
    
    def __init__(self, log_file: Optional[str] = None):
        self.log_file = log_file or str(Path.home() / ".claude" / "logs" / "schema_validation.log")
        self._ensure_log_directory()
        self._setup_logging()
    
    def _ensure_log_directory(self):
        """Ensure log directory exists with proper permissions"""
        log_dir = Path(self.log_file).parent
        log_dir.mkdir(parents=True, exist_ok=True, mode=0o755)
    
    def _setup_logging(self):
        """Setup secure logging configuration"""
        logging.basicConfig(
            filename=self.log_file,
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)
    
    def log_validation_event(self, event_type: str, file_path: str, success: bool, details: str = ""):
        """Log schema validation events with security context"""
        timestamp = datetime.now().isoformat()
        status = "SUCCESS" if success else "FAILURE"
        message = f"SCHEMA_VALIDATION {status}: {event_type} for {file_path}"
        if details:
            message += f" - {details}"
        
        if success:
            self.logger.info(message)
        else:
            self.logger.warning(message)
    
    def log_security_event(self, event_type: str, file_path: str, threat_level: str, details: str):
        """Log security-relevant events"""
        message = f"SECURITY_{threat_level}: {event_type} for {file_path} - {details}"
        self.logger.error(message)

class SuperClaudeSchemas:
    """Comprehensive schema definitions for SuperClaude configuration files"""
    
    @staticmethod
    def get_features_schema() -> Dict[str, Any]:
        """Schema for Scripts/config/features.json"""
        return {
            "type": "object",
            "properties": {
                "core": {
                    "type": "object",
                    "required": ["name", "description", "installer"],
                    "properties": {
                        "name": {"type": "string", "minLength": 1},
                        "description": {"type": "string", "minLength": 1},
                        "required": {"type": "boolean"},
                        "recommended": {"type": "boolean"},
                        "dependencies": {"type": "array", "items": {"type": "string"}},
                        "installer": {"type": "string", "pattern": r"^[a-zA-Z0-9_]+\.py$"},
                        "files": {
                            "type": "array",
                            "items": {"type": "string", "pattern": r"^[^<>:\"|?*]+$"}
                        },
                        "target_files": {
                            "type": "array", 
                            "items": {"type": "string"}
                        },
                        "target_directory": {"type": "string"},
                        "post_install": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    }
                },
                "hooks": {
                    "type": "object",
                    "required": ["name", "description", "installer"],
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "required": {"type": "boolean"},
                        "recommended": {"type": "boolean"},
                        "dependencies": {"type": "array", "items": {"type": "string"}},
                        "installer": {"type": "string", "pattern": r"^[a-zA-Z0-9_]+\.py$"},
                        "files": {"type": "array", "items": {"type": "string"}},
                        "target_directory": {"type": "string"},
                        "post_install": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "commands": {
                    "type": "object",
                    "required": ["name", "description", "installer"],
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "required": {"type": "boolean"},
                        "recommended": {"type": "boolean"},
                        "dependencies": {"type": "array", "items": {"type": "string"}},
                        "installer": {"type": "string", "pattern": r"^[a-zA-Z0-9_]+\.py$"},
                        "files": {"type": "array", "items": {"type": "string"}},
                        "target_directory": {"type": "string"},
                        "post_install": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "mcp": {
                    "type": "object",
                    "required": ["name", "description", "installer", "components"],
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "required": {"type": "boolean"},
                        "recommended": {"type": "boolean"},
                        "dependencies": {"type": "array", "items": {"type": "string"}},
                        "installer": {"type": "string", "pattern": r"^[a-zA-Z0-9_]+\.py$"},
                        "components": {
                            "type": "object",
                            "patternProperties": {
                                "^[a-z0-9-]+$": {
                                    "type": "object",
                                    "required": ["name", "description", "command", "package"],
                                    "properties": {
                                        "name": {"type": "string"},
                                        "description": {"type": "string"},
                                        "command": {"type": "string", "pattern": r"^[a-zA-Z0-9_-]+$"},
                                        "package": {"type": "string", "pattern": r"^[a-zA-Z0-9_-]+$"},
                                        "api_key": {"type": "boolean"},
                                        "key_name": {"type": "string", "pattern": r"^[A-Z0-9_]+$"},
                                        "key_description": {"type": "string"},
                                        "recommended": {"type": "boolean"}
                                    }
                                }
                            }
                        },
                        "post_install": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "profiles": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "required": {"type": "boolean"},
                        "recommended": {"type": "boolean"},
                        "dependencies": {"type": "array", "items": {"type": "string"}},
                        "installer": {"type": "string", "pattern": r"^[a-zA-Z0-9_]+\.py$"},
                        "profiles": {
                            "type": "object",
                            "patternProperties": {
                                "^[a-z]+$": {
                                    "type": "object",
                                    "required": ["name", "description", "features"],
                                    "properties": {
                                        "name": {"type": "string"},
                                        "description": {"type": "string"},
                                        "features": {
                                            "type": "array",
                                            "items": {"type": "string", "enum": ["core", "hooks", "commands", "mcp"]}
                                        },
                                        "mcp_servers": {
                                            "type": "array",
                                            "items": {"type": "string", "enum": ["sequential", "context7", "magic", "playwright", "puppeteer"]}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "required": ["core"],
            "additionalProperties": False
        }
    
    @staticmethod
    def get_settings_schema() -> Dict[str, Any]:
        """Schema for SuperClaude/Settings/settings.json"""
        return {
            "type": "object",
            "required": ["permissions", "env", "hooks"],
            "properties": {
                "superclaude": {
                    "type": "object",
                    "required": ["version", "framework"],
                    "properties": {
                        "version": {"type": "string", "pattern": r"^\d+\.\d+\.\d+$"},
                        "framework": {"type": "string"},
                        "installation_type": {"type": "string", "enum": ["standard", "development"]},
                        "installation_date": {"type": "string"},
                        "components": {"type": "array", "items": {"type": "string"}},
                        "performance_target": {"type": "string"}
                    }
                },
                "permissions": {
                    "type": "object",
                    "required": ["defaultMode", "allow"],
                    "properties": {
                        "defaultMode": {"type": "string", "enum": ["acceptEdits", "rejectEdits", "prompt"]},
                        "allow": {
                            "type": "array",
                            "items": {"type": "string", "pattern": r"^[a-zA-Z0-9_\-\(\)\*\:\.\|]+$"}
                        },
                        "deny": {
                            "type": "array",
                            "items": {"type": "string", "pattern": r"^[a-zA-Z0-9_\-\(\)\*\:\.\|\/\s~]+$"}
                        }
                    }
                },
                "env": {
                    "type": "object",
                    "patternProperties": {
                        "^[A-Z_][A-Z0-9_]*$": {"type": "string"}
                    }
                },
                "includeCoAuthoredBy": {"type": "boolean"},
                "cleanupPeriodDays": {"type": "integer", "minimum": 1, "maximum": 365},
                "hooks": {
                    "type": "object",
                    "properties": {
                        "PreToolUse": {"type": "array", "items": {"$ref": "#/definitions/hookDefinition"}},
                        "PostToolUse": {"type": "array", "items": {"$ref": "#/definitions/hookDefinition"}},
                        "SubagentStop": {"type": "array", "items": {"$ref": "#/definitions/hookDefinition"}},
                        "Stop": {"type": "array", "items": {"$ref": "#/definitions/hookDefinition"}},
                        "Notification": {"type": "array", "items": {"$ref": "#/definitions/hookDefinition"}}
                    }
                },
                "mcp": {
                    "type": "object",
                    "properties": {
                        "servers": {
                            "type": "object",
                            "patternProperties": {
                                "^[a-z0-9-]+$": {
                                    "type": "object",
                                    "required": ["command"],
                                    "properties": {
                                        "command": {"type": "string", "pattern": r"^[a-zA-Z0-9_-]+$"},
                                        "args": {"type": "array", "items": {"type": "string"}},
                                        "description": {"type": "string"},
                                        "scope": {"type": "string", "enum": ["user", "global"]}
                                    }
                                }
                            }
                        },
                        "defaultTimeout": {"type": "integer", "minimum": 1000, "maximum": 300000},
                        "retryAttempts": {"type": "integer", "minimum": 0, "maximum": 10},
                        "enableFallbacks": {"type": "boolean"}
                    }
                },
                "enabledMcpjsonServers": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "definitions": {
                "hookDefinition": {
                    "type": "object",
                    "required": ["matcher", "hooks"],
                    "properties": {
                        "matcher": {"type": "string"},
                        "hooks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["type", "command"],
                                "properties": {
                                    "type": {"type": "string", "enum": ["command"]},
                                    "command": {"type": "string"},
                                    "timeout": {"type": "integer", "minimum": 1000, "maximum": 60000},
                                    "description": {"type": "string"}
                                }
                            }
                        }
                    }
                }
            }
        }

class ConfigurationValidator:
    """Comprehensive configuration file validator with security features"""
    
    def __init__(self, log_file: Optional[str] = None):
        self.logger = SecurityLogger(log_file)
        self.schemas = SuperClaudeSchemas()
        self._security_patterns = self._compile_security_patterns()
    
    def _compile_security_patterns(self) -> Dict[str, re.Pattern]:
        """Compile security patterns for threat detection"""
        return {
            'command_injection': re.compile(r'[;&|`]\s*(?:rm|del|format|sudo|su|eval|exec|system|shell)', re.IGNORECASE),
            'path_traversal': re.compile(r'\.\.[\\/]|\.\.[\\/]\.\.[\\/]'),
            'script_tags': re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
            'sql_injection': re.compile(r"['\"];?\s*(?:union|select|insert|update|delete|drop|exec)\s", re.IGNORECASE),
            'suspicious_urls': re.compile(r'https?://(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(?!443|80)', re.IGNORECASE)
        }
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of configuration file for integrity checking"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except Exception as e:
            self.logger.log_security_event(
                "INTEGRITY_CHECK_FAILED", str(file_path), "HIGH",
                f"Failed to calculate file hash: {e}"
            )
            return ""
    
    def _detect_security_threats(self, config_data: Dict[str, Any], file_path: str) -> List[str]:
        """Detect potential security threats in configuration data"""
        threats = []
        config_str = json.dumps(config_data, indent=2)
        
        for threat_type, pattern in self._security_patterns.items():
            if pattern.search(config_str):
                threats.append(threat_type)
                self.logger.log_security_event(
                    "THREAT_DETECTED", file_path, "HIGH",
                    f"Detected {threat_type} pattern in configuration"
                )
        
        return threats
    
    def _validate_with_jsonschema(self, config_data: Dict[str, Any], schema: Dict[str, Any], file_path: str) -> Tuple[bool, List[str]]:
        """Validate configuration using jsonschema library"""
        if not JSONSCHEMA_AVAILABLE:
            return self._fallback_validation(config_data, schema, file_path)
        
        errors = []
        try:
            validator = Draft7Validator(schema)
            validation_errors = sorted(validator.iter_errors(config_data), key=lambda e: e.path)
            
            for error in validation_errors:
                path = " -> ".join(str(p) for p in error.path) if error.path else "root"
                errors.append(f"Path '{path}': {error.message}")
            
            success = len(errors) == 0
            self.logger.log_validation_event(
                "JSONSCHEMA_VALIDATION", file_path, success,
                f"Found {len(errors)} validation errors" if not success else "Schema validation passed"
            )
            
            return success, errors
            
        except Exception as e:
            errors.append(f"Schema validation failed: {e}")
            self.logger.log_validation_event(
                "JSONSCHEMA_VALIDATION", file_path, False, f"Validation exception: {e}"
            )
            return False, errors
    
    def _fallback_validation(self, config_data: Dict[str, Any], schema: Dict[str, Any], file_path: str) -> Tuple[bool, List[str]]:
        """Fallback validation when jsonschema is not available"""
        errors = []
        
        # Basic type and required field checking
        if schema.get("type") == "object":
            if not isinstance(config_data, dict):
                errors.append("Root element must be an object")
                return False, errors
            
            # Check required fields
            required_fields = schema.get("required", [])
            for field in required_fields:
                if field not in config_data:
                    errors.append(f"Required field '{field}' is missing")
            
            # Basic property validation
            properties = schema.get("properties", {})
            for key, value in config_data.items():
                if key in properties:
                    prop_schema = properties[key]
                    if "type" in prop_schema:
                        expected_type = prop_schema["type"]
                        if expected_type == "string" and not isinstance(value, str):
                            errors.append(f"Field '{key}' must be a string")
                        elif expected_type == "boolean" and not isinstance(value, bool):
                            errors.append(f"Field '{key}' must be a boolean")
                        elif expected_type == "array" and not isinstance(value, list):
                            errors.append(f"Field '{key}' must be an array")
                        elif expected_type == "object" and not isinstance(value, dict):
                            errors.append(f"Field '{key}' must be an object")
        
        success = len(errors) == 0
        self.logger.log_validation_event(
            "FALLBACK_VALIDATION", file_path, success,
            f"Found {len(errors)} basic validation errors" if not success else "Basic validation passed"
        )
        
        return success, errors
    
    def validate_features_config(self, file_path: Union[str, Path]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """Validate Scripts/config/features.json"""
        file_path = Path(file_path)
        
        try:
            # Load and parse JSON
            with open(file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Security threat detection
            threats = self._detect_security_threats(config_data, str(file_path))
            if threats:
                return False, [f"Security threats detected: {', '.join(threats)}"], {}
            
            # Schema validation
            schema = self.schemas.get_features_schema()
            success, errors = self._validate_with_jsonschema(config_data, schema, str(file_path))
            
            if success:
                # Calculate integrity hash
                file_hash = self._calculate_file_hash(file_path)
                self.logger.log_validation_event(
                    "FEATURES_VALIDATION", str(file_path), True,
                    f"Configuration valid, hash: {file_hash[:16]}..."
                )
            
            return success, errors, config_data
            
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON format: {e}"
            self.logger.log_validation_event("FEATURES_VALIDATION", str(file_path), False, error_msg)
            return False, [error_msg], {}
        except Exception as e:
            error_msg = f"Validation failed: {e}"
            self.logger.log_validation_event("FEATURES_VALIDATION", str(file_path), False, error_msg)
            return False, [error_msg], {}
    
    def validate_settings_config(self, file_path: Union[str, Path]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """Validate SuperClaude/Settings/settings.json"""
        file_path = Path(file_path)
        
        try:
            # Load and parse JSON
            with open(file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Security threat detection
            threats = self._detect_security_threats(config_data, str(file_path))
            if threats:
                return False, [f"Security threats detected: {', '.join(threats)}"], {}
            
            # Schema validation
            schema = self.schemas.get_settings_schema()
            success, errors = self._validate_with_jsonschema(config_data, schema, str(file_path))
            
            # Additional security validations
            if success:
                # Validate permissions are not overly permissive
                permissions = config_data.get("permissions", {})
                allow_rules = permissions.get("allow", [])
                
                dangerous_patterns = [
                    r"Bash\(sudo:\*\)",
                    r"Bash\(rm:-rf\s*/\*\)",
                    r"WebFetch\(domain:\*\)"
                ]
                
                for rule in allow_rules:
                    for pattern in dangerous_patterns:
                        if re.match(pattern, rule):
                            errors.append(f"Dangerous permission rule detected: {rule}")
                            success = False
                
                # Calculate integrity hash
                file_hash = self._calculate_file_hash(file_path)
                self.logger.log_validation_event(
                    "SETTINGS_VALIDATION", str(file_path), success,
                    f"Configuration {'valid' if success else 'invalid'}, hash: {file_hash[:16]}..."
                )
            
            return success, errors, config_data
            
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON format: {e}"
            self.logger.log_validation_event("SETTINGS_VALIDATION", str(file_path), False, error_msg)
            return False, [error_msg], {}
        except Exception as e:
            error_msg = f"Validation failed: {e}"
            self.logger.log_validation_event("SETTINGS_VALIDATION", str(file_path), False, error_msg)
            return False, [error_msg], {}
    
    def validate_mcp_config(self, config_data: Dict[str, Any], server_name: str = "unknown") -> Tuple[bool, List[str]]:
        """Validate MCP server configuration data"""
        errors = []
        
        # Basic MCP server validation
        required_fields = ["command"]
        for field in required_fields:
            if field not in config_data:
                errors.append(f"MCP server '{server_name}' missing required field: {field}")
        
        # Validate command is safe
        if "command" in config_data:
            command = config_data["command"]
            if not re.match(r"^[a-zA-Z0-9_-]+$", command):
                errors.append(f"MCP server '{server_name}' has invalid command format: {command}")
        
        # Validate args if present
        if "args" in config_data and not isinstance(config_data["args"], list):
            errors.append(f"MCP server '{server_name}' args must be a list")
        
        success = len(errors) == 0
        self.logger.log_validation_event(
            "MCP_CONFIG_VALIDATION", server_name, success,
            f"Found {len(errors)} validation errors" if not success else "MCP config valid"
        )
        
        return success, errors
    
    def create_integrity_manifest(self, config_files: List[Path]) -> Dict[str, str]:
        """Create integrity manifest with file hashes"""
        manifest = {}
        
        for file_path in config_files:
            if file_path.exists():
                file_hash = self._calculate_file_hash(file_path)
                manifest[str(file_path)] = file_hash
                self.logger.log_validation_event(
                    "INTEGRITY_MANIFEST", str(file_path), True,
                    f"Added to integrity manifest: {file_hash[:16]}..."
                )
        
        return manifest
    
    def verify_integrity_manifest(self, manifest: Dict[str, str]) -> Tuple[bool, List[str]]:
        """Verify configuration files against integrity manifest"""
        errors = []
        
        for file_path, expected_hash in manifest.items():
            path_obj = Path(file_path)
            if not path_obj.exists():
                errors.append(f"Configuration file missing: {file_path}")
                continue
            
            current_hash = self._calculate_file_hash(path_obj)
            if current_hash != expected_hash:
                errors.append(f"Configuration file modified: {file_path}")
                self.logger.log_security_event(
                    "INTEGRITY_VIOLATION", file_path, "HIGH",
                    f"File hash mismatch - expected: {expected_hash[:16]}..., actual: {current_hash[:16]}..."
                )
        
        success = len(errors) == 0
        return success, errors

def main():
    """CLI tool for configuration validation"""
    if len(sys.argv) < 2:
        print("Usage: python schema_validator.py <config_file_path> [config_type]")
        print("Config types: features, settings, mcp")
        sys.exit(1)
    
    config_file = Path(sys.argv[1])
    config_type = sys.argv[2] if len(sys.argv) > 2 else None
    
    validator = ConfigurationValidator()
    
    # Auto-detect config type if not specified
    if not config_type:
        if config_file.name == "features.json":
            config_type = "features"
        elif config_file.name == "settings.json":
            config_type = "settings"
        else:
            config_type = "features"  # default
    
    # Validate configuration
    if config_type == "features":
        success, errors, data = validator.validate_features_config(config_file)
    elif config_type == "settings":
        success, errors, data = validator.validate_settings_config(config_file)
    else:
        print(f"Unknown config type: {config_type}")
        sys.exit(1)
    
    # Print results
    if success:
        print(f"✅ Configuration file '{config_file}' is valid")
        print(f"📊 Configuration contains {len(data)} top-level sections")
    else:
        print(f"❌ Configuration file '{config_file}' has validation errors:")
        for error in errors:
            print(f"   • {error}")
        sys.exit(1)

if __name__ == "__main__":
    main()