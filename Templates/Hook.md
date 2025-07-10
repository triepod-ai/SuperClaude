# Hook Template - SuperClaude Framework

<!--
INSTRUCTIONS FOR CREATING A NEW CLAUDE CODE HOOK:
1. Replace all placeholders marked with [PLACEHOLDER] with your content
2. Follow the event-driven architecture pattern for consistency
3. Implement proper JSON parsing and error handling
4. Use appropriate exit codes for hook behavior control
5. Test with various event types and edge cases
6. Add configuration to settings.local.json after creation
7. Document the hook's purpose and integration points
-->

## Hook: [Hook Name]

### Basic Information

**Purpose**: [One-line clear description of what this hook does]

**File**: `.claude/hooks/[hook_name].py`

**Events**: [List supported events: PreToolUse | PostToolUse | SubagentStop | Stop | Notification]

**Target Tools**: [Specify: * (all) | specific tools like Task, Bash, Read, Edit, etc.]

**Execution Time**: [Target: <100ms for optimal performance]

### Hook Configuration

Add to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "[EventType]": [
      {
        "matcher": "[ToolPattern]",
        "hooks": [
          {
            "type": "command",
            "command": "echo '$DATA' | python3 .claude/hooks/[hook_name].py",
            "timeout": [5000]
          }
        ]
      }
    ]
  }
}
```

### Hook Implementation

```python
#!/usr/bin/env python3
"""
[Hook Name] - [Brief Description]
[Detailed description of hook functionality and purpose]
"""

import json
import sys
import time
import logging
from typing import Dict, Any, Optional
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class [HookName]Handler:
    """[Hook purpose] handler for Claude Code events"""
    
    def __init__(self):
        self.base_path = Path.cwd()
        # Initialize hook-specific resources
        
    def handle_pretool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PreToolUse hook event"""
        try:
            # Extract tool information
            tool_call = hook_data.get('tool_call', {})
            tool_name = tool_call.get('name', '')
            tool_input = tool_call.get('parameters', {})
            
            # Implement pre-tool logic here
            # [PLACEHOLDER: Add your pre-tool processing]
            
            return {
                "continue": True,  # or False to block execution
                "[custom_field]": "[custom_value]",
                "processed": True
            }
            
        except Exception as e:
            logger.error(f"PreToolUse error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "processed": False
            }
    
    def handle_post_tool_use(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PostToolUse hook event"""
        try:
            # Extract tool execution information
            tool_call = hook_data.get('tool_call', {})
            tool_result = hook_data.get('result', {})
            tool_name = tool_call.get('name', '')
            
            # Implement post-tool logic here
            # [PLACEHOLDER: Add your post-tool processing]
            
            return {
                "continue": True,
                "analysis_completed": True,
                "processed": True
            }
            
        except Exception as e:
            logger.error(f"PostToolUse error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "processed": False
            }
    
    def handle_subagent_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle SubagentStop hook event"""
        try:
            # Extract agent information
            agent_info = hook_data.get('agent_info', {})
            agent_result = hook_data.get('result', {})
            
            # Implement subagent completion logic here
            # [PLACEHOLDER: Add your subagent processing]
            
            return {
                "continue": True,
                "agent_processed": True,
                "processed": True
            }
            
        except Exception as e:
            logger.error(f"SubagentStop error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "processed": False
            }
    
    def handle_stop(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Stop hook event for cleanup and final processing"""
        try:
            # Extract stop information
            stop_reason = hook_data.get('reason', 'normal_shutdown')
            
            # Implement cleanup logic here
            # [PLACEHOLDER: Add your cleanup processing]
            
            return {
                "continue": True,
                "graceful_shutdown": True,
                "cleanup_completed": True
            }
            
        except Exception as e:
            logger.error(f"Stop error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "graceful_shutdown": False
            }
    
    def handle_notification(self, hook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Notification hook event"""
        try:
            # Extract notification information
            notification = hook_data.get('notification', {})
            notification_type = notification.get('type', '')
            
            # Implement notification logic here
            # [PLACEHOLDER: Add your notification processing]
            
            return {
                "continue": True,
                "notification_processed": True,
                "processed": True
            }
            
        except Exception as e:
            logger.error(f"Notification error: {e}")
            return {
                "continue": True,
                "error": str(e),
                "processed": False
            }

def run_test():
    """Test function for development and debugging"""
    # [PLACEHOLDER: Add test functionality]
    handler = [HookName]Handler()
    
    # Test with sample data
    test_data = {
        "tool_call": {
            "name": "Test",
            "parameters": {"test": True}
        }
    }
    
    result = handler.handle_pretool_use(test_data)
    print(f"Test result: {json.dumps(result, indent=2)}")

if __name__ == "__main__":
    # Check for test mode
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        run_test()
        sys.exit(0)
    
    try:
        # Read JSON data from stdin (Claude Code hook interface)
        stdin_content = sys.stdin.read().strip()
        if not stdin_content:
            # Handle empty input gracefully - exit cleanly
            sys.exit(0)
        
        try:
            hook_data = json.loads(stdin_content)
        except json.JSONDecodeError as e:
            print(f"• [Hook Name] JSON Error: {str(e)}", file=sys.stderr)
            sys.exit(0)  # Non-blocking error
        
        # Extract event type from hook data
        event_type = hook_data.get('event_type', '')
        
        # Create hook handler
        handler = [HookName]Handler()
        
        # Handle event based on type
        if event_type == 'PreToolUse':
            result = handler.handle_pretool_use(hook_data)
        elif event_type == 'PostToolUse':
            result = handler.handle_post_tool_use(hook_data)
        elif event_type == 'SubagentStop':
            result = handler.handle_subagent_stop(hook_data)
        elif event_type == 'Stop':
            result = handler.handle_stop(hook_data)
        elif event_type == 'Notification':
            result = handler.handle_notification(hook_data)
        else:
            # Handle unknown event type
            result = {
                "continue": True,
                "error": f"Unknown event type: {event_type}",
                "processed": False
            }
        
        # Output result to stderr for logging (optional)
        if result.get('error'):
            print(f"• [Hook Name] Error: {result['error']}", file=sys.stderr)
        elif result.get('processed'):
            print(f"• [Hook Name] processed {event_type} event", file=sys.stderr)
        
        # Exit with appropriate code for Claude Code
        if result.get('error') and not result.get('continue', True):
            sys.exit(2)  # Block execution on critical error
        else:
            sys.exit(0)  # Continue execution
        
    except Exception as e:
        logger.error(f"Hook execution failed: {e}")
        print(f"• [Hook Name] Critical Error: {str(e)}", file=sys.stderr)
        sys.exit(0)  # Non-blocking error - allow execution to continue
```

### Event Types and Data Structures

#### PreToolUse Event
```json
{
  "event_type": "PreToolUse",
  "tool_call": {
    "name": "ToolName",
    "parameters": { ... }
  },
  "context": { ... }
}
```

#### PostToolUse Event
```json
{
  "event_type": "PostToolUse",
  "tool_call": {
    "name": "ToolName",
    "parameters": { ... }
  },
  "result": { ... },
  "execution_time": 0.123
}
```

#### SubagentStop Event
```json
{
  "event_type": "SubagentStop",
  "agent_info": {
    "name": "agent_name",
    "type": "agent_type"
  },
  "result": { ... }
}
```

#### Stop Event
```json
{
  "event_type": "Stop",
  "reason": "normal_shutdown",
  "timestamp": 1234567890
}
```

#### Notification Event
```json
{
  "event_type": "Notification",
  "notification": {
    "type": "notification_type",
    "message": "notification_message"
  }
}
```

### Exit Codes

- **0**: Continue execution (normal)
- **1**: Show error but don't block (warning)
- **2**: Block execution (critical error)

### Best Practices

#### Performance Optimization
- **Target <100ms execution time** for optimal user experience
- Use caching for repeated operations
- Implement async operations where appropriate
- Monitor memory usage for long-running hooks

#### Error Handling
- Always handle JSON parsing errors gracefully
- Use try-catch blocks for all external operations
- Log errors for debugging but don't crash Claude Code
- Return meaningful error messages in hook responses

#### Security Considerations
- Validate and sanitize all input data
- Use absolute paths for file operations
- Avoid executing arbitrary user input
- Implement proper file locking for concurrent access

#### Integration Guidelines
- Follow the established event-driven architecture
- Use consistent naming conventions
- Document all custom fields in hook responses
- Test with various tool combinations and edge cases

### Testing

```bash
# Test the hook in isolation
python3 .claude/hooks/[hook_name].py --test

# Test with sample JSON input
echo '{"event_type":"PreToolUse","tool_call":{"name":"Test"}}' | python3 .claude/hooks/[hook_name].py

# Test timeout behavior
timeout 5s python3 .claude/hooks/[hook_name].py < /dev/null
```

### Integration with SuperClaude

#### Wave System Integration
If your hook participates in the wave system:

```python
def integrate_with_waves(self, wave_number: int, operation_data: Dict[str, Any]):
    """Integrate hook with SuperClaude wave system"""
    # [PLACEHOLDER: Add wave integration logic]
    # Example: Track wave progress, coordinate between waves
    pass
```

#### Multi-Agent Orchestration
If your hook needs orchestration coordination:

```python
def coordinate_with_orchestrator(self, operation_type: str, context: Dict[str, Any]):
    """Coordinate with SuperClaude orchestrator"""
    # Agent selection based on complexity
    if context.get('complexity', 0) > 0.7:
        return {
            "delegate": True,
            "suggested_agents": ["quality", "security", "performance"],
            "parallel_processing": context.get('file_count', 0) > 20
        }
    
    # Task delegation for specific patterns
    if operation_type in ["analyze", "review", "improve"]:
        focus_areas = self._detect_focus_areas(context)
        return {
            "multi_focus": len(focus_areas) > 2,
            "focus_agents": focus_areas,
            "coordination_mode": "parallel" if len(focus_areas) > 3 else "sequential"
        }
    
    return {"single_agent": True}

def _detect_focus_areas(self, context: Dict[str, Any]) -> List[str]:
    """Detect focus areas for multi-agent coordination"""
    focus_areas = []
    
    # File pattern analysis
    file_patterns = context.get('file_patterns', [])
    if any(p.endswith(('.test.js', '.spec.ts')) for p in file_patterns):
        focus_areas.append("testing")
    if any(p.endswith(('.css', '.scss', '.tsx', '.jsx')) for p in file_patterns):
        focus_areas.append("frontend")
    if any(p.endswith(('.py', '.js', '.ts')) for p in file_patterns):
        focus_areas.append("backend")
    
    # Keyword analysis
    keywords = context.get('keywords', [])
    if any(k in keywords for k in ["security", "vulnerability", "auth"]):
        focus_areas.append("security")
    if any(k in keywords for k in ["performance", "optimization", "speed"]):
        focus_areas.append("performance")
    
    return focus_areas
```

#### MCP Server Coordination
If your hook needs MCP server coordination:

```python
def select_optimal_server(self, operation_type: str, context: Dict[str, Any] = None):
    """Select optimal MCP server for operation"""
    context = context or {}
    
    # Server selection matrix
    server_preferences = {
        "documentation": ["Context7", "Sequential"],
        "analysis": ["Sequential", "Context7"],
        "ui_generation": ["Magic", "Context7"],
        "testing": ["Playwright", "Sequential"],
        "performance": ["Playwright", "Sequential"]
    }
    
    # Context-based server selection
    if operation_type in server_preferences:
        preferred_servers = server_preferences[operation_type]
    else:
        # Default fallback
        preferred_servers = ["Sequential"]
    
    # Complexity-based adjustments
    complexity = context.get('complexity', 0.5)
    if complexity > 0.8:
        # High complexity prefers Sequential for deep analysis
        if "Sequential" in preferred_servers:
            preferred_servers = ["Sequential"] + [s for s in preferred_servers if s != "Sequential"]
    
    # Framework detection
    framework_indicators = context.get('framework_indicators', [])
    if any(indicator in framework_indicators for indicator in ['react', 'vue', 'angular']):
        if operation_type in ['documentation', 'analysis']:
            preferred_servers.insert(0, "Context7")
    
    return {
        "primary_server": preferred_servers[0],
        "fallback_servers": preferred_servers[1:],
        "server_config": {
            "timeout": 30000 if complexity > 0.7 else 15000,
            "cache_results": True,
            "parallel_capable": operation_type in ["analysis", "testing"]
        }
    }

def coordinate_mcp_fallback(self, failed_server: str, operation_type: str):
    """Handle MCP server failures with intelligent fallback"""
    fallback_map = {
        "Context7": "Sequential",  # Deep analysis as fallback
        "Sequential": "Context7",  # Documentation lookup as fallback
        "Magic": "Context7",      # Pattern lookup for UI generation
        "Playwright": "Sequential" # Analysis instead of testing
    }
    
    fallback_server = fallback_map.get(failed_server)
    logger.warning(f"MCP server {failed_server} failed, falling back to {fallback_server}")
    
    return {
        "fallback_server": fallback_server,
        "adjust_expectations": True,
        "retry_original": True,
        "retry_delay": 5000
    }
```

### Common Patterns

#### Context Management
```python
def manage_context(self, context_data: Dict[str, Any]):
    """Manage context across hook executions"""
    # Implement context persistence and retrieval
    pass
```

#### Performance Monitoring
```python
def track_performance(self, operation: str, duration: float):
    """Track hook performance metrics"""
    # Implement performance tracking
    pass
```

#### Resource Cleanup
```python
def cleanup_resources(self):
    """Clean up hook resources on shutdown"""
    # Implement proper resource cleanup
    pass
```

### Troubleshooting

#### Common Issues
1. **JSON parsing errors**: Ensure proper error handling for empty input
2. **Timeout issues**: Optimize for sub-100ms execution
3. **File locking conflicts**: Use proper atomic operations
4. **Memory leaks**: Implement proper resource cleanup

#### Debugging Tips
- Use logging for debugging hook execution
- Test hooks in isolation before integration
- Monitor execution time and memory usage
- Validate hook responses match expected format

### Related Documentation

- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [SuperClaude Wave System](../MODES.md)
- [MCP Server Integration](../MCP.md)
- [Performance Guidelines](../PRINCIPLES.md)