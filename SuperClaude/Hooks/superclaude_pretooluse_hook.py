#!/usr/bin/env python3
"""
SuperClaude PreToolUse Hook - Claude Code Integration
Integrates SuperClaude framework with Claude Code tool execution
Provides intelligent routing, persona activation, and execution planning
"""

import json
import time
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
import sys

# Add SuperClaude framework to path
sys.path.insert(0, str(Path(__file__).parent))

from superclaude_framework import (
    process_superclaude_command,
    get_superclaude_framework,
    CommandType,
    PersonaType,
    WaveStrategy
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SuperClaudePreToolUseHook:
    """
    PreToolUse hook that integrates SuperClaude framework with Claude Code
    Provides intelligent preprocessing and enhancement of user requests
    """
    
    def __init__(self):
        self.framework = get_superclaude_framework()
        self.session_context = {}
        self.last_processing_time = 0.0
        
        # Performance targets
        self.max_processing_time = 0.100  # 100ms target
        self.cache_enabled = True
        self.enhancement_cache = {}
        
        logger.info("SuperClaude PreToolUse Hook initialized")
    
    def process_pretooluse(self, user_input: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main PreToolUse processing
        Enhances user input with SuperClaude intelligence
        """
        start_time = time.time()
        
        try:
            # Extract session information
            session_id = context.get("session_id", "default")
            
            # Process through SuperClaude framework
            framework_result = process_superclaude_command(user_input, session_id)
            
            # Generate enhanced instructions
            enhanced_instructions = self._generate_enhanced_instructions(
                user_input, framework_result, context
            )
            
            # Create tool recommendations
            tool_recommendations = self._create_tool_recommendations(framework_result)
            
            # Generate MCP server routing
            mcp_routing = self._create_mcp_routing(framework_result)
            
            # Record performance
            processing_time = time.time() - start_time
            self.last_processing_time = processing_time
            
            if processing_time > self.max_processing_time:
                logger.warning(f"PreToolUse processing exceeded target: {processing_time:.3f}s")
            
            return {
                "success": True,
                "processing_time": processing_time,
                "enhanced_instructions": enhanced_instructions,
                "tool_recommendations": tool_recommendations,
                "mcp_routing": mcp_routing,
                "framework_analysis": {
                    "command_detected": framework_result.get("parsed_command", {}).get("command"),
                    "personas_activated": [pa["persona"] for pa in framework_result.get("persona_activations", [])],
                    "complexity_score": framework_result.get("parsed_command", {}).get("complexity_score", 0.0),
                    "wave_mode": framework_result.get("wave_plan") is not None,
                    "delegation_strategy": framework_result.get("execution_plan", {}).get("strategy"),
                    "confidence": framework_result.get("execution_plan", {}).get("confidence", 0.0)
                },
                "original_input": user_input,
                "session_id": session_id
            }
            
        except Exception as e:
            logger.error(f"PreToolUse processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "processing_time": time.time() - start_time,
                "fallback_mode": True,
                "original_input": user_input
            }
    
    def _generate_enhanced_instructions(self, user_input: str, 
                                      framework_result: Dict[str, Any],
                                      context: Dict[str, Any]) -> str:
        """Generate enhanced instructions for Claude Code"""
        
        if not framework_result.get("success"):
            return user_input  # Fallback to original
        
        enhanced_parts = []
        
        # Add command context
        parsed_command = framework_result.get("parsed_command", {})
        if parsed_command.get("command"):
            command_name = parsed_command["command"]
            enhanced_parts.append(f"SUPERCLAUDE COMMAND: {command_name}")
        
        # Add persona context
        personas = framework_result.get("persona_activations", [])
        if personas:
            active_personas = [pa["persona"] for pa in personas if pa["confidence"] > 0.7]
            if active_personas:
                enhanced_parts.append(f"ACTIVE PERSONAS: {', '.join(active_personas)}")
        
        # Add complexity and strategy context
        execution_plan = framework_result.get("execution_plan", {})
        complexity = parsed_command.get("complexity_score", 0.0)
        strategy = execution_plan.get("strategy", "standard")
        
        enhanced_parts.append(f"COMPLEXITY: {complexity:.1f} | STRATEGY: {strategy}")
        
        # Add wave mode context
        wave_plan = framework_result.get("wave_plan")
        if wave_plan:
            wave_strategy = wave_plan.get("strategy", "adaptive")
            phase_count = len(wave_plan.get("phases", []))
            enhanced_parts.append(f"WAVE MODE: {wave_strategy} ({phase_count} phases)")
        
        # Add domain context
        domains = parsed_command.get("domains", [])
        if domains:
            enhanced_parts.append(f"DOMAINS: {', '.join(domains)}")
        
        # Add flag context
        flags = parsed_command.get("flags", {})
        active_flags = [flag for flag, value in flags.items() if value is True]
        if active_flags:
            enhanced_parts.append(f"FLAGS: {', '.join(active_flags)}")
        
        # Add recommendations
        recommendations = execution_plan.get("recommendations", [])
        if recommendations:
            enhanced_parts.append("RECOMMENDATIONS:")
            for rec in recommendations[:3]:  # Limit to top 3
                enhanced_parts.append(f"  • {rec}")
        
        # Combine with original input
        if enhanced_parts:
            enhancement_header = "\n".join(enhanced_parts)
            return f"{enhancement_header}\n\nORIGINAL REQUEST:\n{user_input}"
        else:
            return user_input
    
    def _create_tool_recommendations(self, framework_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create tool usage recommendations"""
        if not framework_result.get("success"):
            return []
        
        execution_plan = framework_result.get("execution_plan", {})
        tools = execution_plan.get("tools", [])
        
        recommendations = []
        
        for tool in tools:
            # Map SuperClaude tools to Claude Code tools
            tool_mapping = {
                "Read": {
                    "tool": "Read",
                    "priority": "high",
                    "reason": "File content analysis required"
                },
                "Write": {
                    "tool": "Write", 
                    "priority": "high",
                    "reason": "Content creation needed"
                },
                "Edit": {
                    "tool": "Edit",
                    "priority": "medium",
                    "reason": "File modification required"
                },
                "MultiEdit": {
                    "tool": "MultiEdit",
                    "priority": "high",
                    "reason": "Multiple file operations needed"
                },
                "Grep": {
                    "tool": "Grep",
                    "priority": "medium",
                    "reason": "Pattern search required"
                },
                "Glob": {
                    "tool": "Glob",
                    "priority": "low",
                    "reason": "File discovery needed"
                },
                "Bash": {
                    "tool": "Bash",
                    "priority": "high",
                    "reason": "System operations required"
                },
                "TodoWrite": {
                    "tool": "TodoWrite",
                    "priority": "medium",
                    "reason": "Task management needed"
                },
                "Task": {
                    "tool": "Task",
                    "priority": "high",
                    "reason": "Sub-agent delegation required"
                },
                "Sequential": {
                    "tool": "mcp__sequential-thinking__sequentialthinking",
                    "priority": "high",
                    "reason": "Complex analysis required"
                }
            }
            
            if tool in tool_mapping:
                recommendations.append(tool_mapping[tool])
        
        # Sort by priority
        priority_order = {"high": 3, "medium": 2, "low": 1}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 0), reverse=True)
        
        return recommendations
    
    def _create_mcp_routing(self, framework_result: Dict[str, Any]) -> Dict[str, Any]:
        """Create MCP server routing recommendations"""
        if not framework_result.get("success"):
            return {}
        
        execution_plan = framework_result.get("execution_plan", {})
        mcp_servers = execution_plan.get("mcp_servers", [])
        personas = framework_result.get("persona_activations", [])
        
        routing = {
            "recommended_servers": [],
            "execution_order": "parallel",
            "fallback_strategy": "graceful_degradation"
        }
        
        # Map to actual MCP server names
        server_mapping = {
            "context7": "mcp__context7__get-library-docs",
            "sequential": "mcp__sequential-thinking__sequentialthinking", 
            "magic": "mcp__magic__21st_magic_component_builder",
            "playwright": "mcp__playwright__init-browser"
        }
        
        for server in mcp_servers:
            if server in server_mapping:
                routing["recommended_servers"].append({
                    "server": server_mapping[server],
                    "priority": "high" if server in ["sequential", "context7"] else "medium",
                    "async": True,
                    "reason": f"Required for {server} operations"
                })
        
        # Add persona-specific routing
        for persona_activation in personas:
            if persona_activation["confidence"] > 0.8:
                persona = persona_activation["persona"]
                
                if persona == "frontend" and "magic" not in mcp_servers:
                    routing["recommended_servers"].append({
                        "server": server_mapping["magic"],
                        "priority": "high",
                        "async": True,
                        "reason": "Frontend persona requires UI component generation"
                    })
                elif persona == "analyzer" and "sequential" not in mcp_servers:
                    routing["recommended_servers"].append({
                        "server": server_mapping["sequential"],
                        "priority": "high", 
                        "async": True,
                        "reason": "Analyzer persona requires structured thinking"
                    })
        
        return routing
    
    def get_hook_status(self) -> Dict[str, Any]:
        """Get hook status and metrics"""
        return {
            "hook_active": True,
            "framework_loaded": self.framework is not None,
            "last_processing_time": self.last_processing_time,
            "performance_target_met": self.last_processing_time <= self.max_processing_time,
            "cache_enabled": self.cache_enabled,
            "session_count": len(self.session_context)
        }


# Global hook instance
_hook = None


def get_pretooluse_hook() -> SuperClaudePreToolUseHook:
    """Get global PreToolUse hook instance"""
    global _hook
    if _hook is None:
        _hook = SuperClaudePreToolUseHook()
    return _hook


def superclaude_pretooluse(user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Main PreToolUse hook function for Claude Code integration
    
    Args:
        user_input: The user's input string
        **context: Additional context from Claude Code
        
    Returns:
        Dict containing:
        - success: bool
        - enhanced_instructions: str (enhanced version of user input)
        - tool_recommendations: List[Dict] (recommended tools)
        - mcp_routing: Dict (MCP server routing info)
        - framework_analysis: Dict (SuperClaude analysis results)
        - processing_time: float
    """
    try:
        hook = get_pretooluse_hook()
        return hook.process_pretooluse(user_input, context or {})
        
    except Exception as e:
        logger.error(f"SuperClaude PreToolUse hook failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "enhanced_instructions": user_input,  # Fallback to original
            "tool_recommendations": [],
            "mcp_routing": {},
            "framework_analysis": {},
            "processing_time": 0.0,
            "fallback_mode": True
        }


# Example Claude Code hook registration (if needed)
def register_superclaude_hook():
    """Register SuperClaude hook with Claude Code (if hook system exists)"""
    try:
        # This would register with Claude Code's hook system
        # Implementation depends on Claude Code's hook architecture
        logger.info("SuperClaude PreToolUse hook registered successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to register SuperClaude hook: {e}")
        return False


if __name__ == "__main__":
    # Test the hook
    hook = SuperClaudePreToolUseHook()
    
    test_cases = [
        "/analyze @src/ --focus security --think",
        "/improve performance --wave-mode progressive",
        "/build component Button --magic --persona-frontend",
        "create a comprehensive security audit for the entire project",
        "optimize the database queries in the user service"
    ]
    
    for test_input in test_cases:
        print(f"\n=== Testing: {test_input} ===")
        result = hook.process_pretooluse(test_input, {"session_id": "test"})
        
        print(f"Success: {result['success']}")
        print(f"Processing Time: {result.get('processing_time', 0):.3f}s")
        
        if result['success']:
            analysis = result['framework_analysis']
            print(f"Command: {analysis.get('command_detected', 'none')}")
            print(f"Personas: {analysis.get('personas_activated', [])}")
            print(f"Complexity: {analysis.get('complexity_score', 0):.2f}")
            print(f"Strategy: {analysis.get('delegation_strategy', 'standard')}")
            print(f"Wave Mode: {analysis.get('wave_mode', False)}")
            
            tools = result.get('tool_recommendations', [])[:3]
            print(f"Top Tools: {[t['tool'] for t in tools]}")
            
            servers = result.get('mcp_routing', {}).get('recommended_servers', [])
            print(f"MCP Servers: {[s['server'].split('__')[-1] for s in servers]}")
            
            # Show enhanced instructions (first 200 chars)
            enhanced = result.get('enhanced_instructions', '')
            if len(enhanced) > 200:
                enhanced = enhanced[:200] + "..."
            print(f"Enhanced Instructions: {enhanced}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")