# MCP Server Template - SuperClaude Framework

<!-- 
INSTRUCTIONS FOR CREATING A NEW MCP SERVER INTEGRATION:
1. Replace all placeholders marked with [PLACEHOLDER] with your content
2. Follow the established MCP server documentation patterns
3. Ensure clear workflow processes and error handling
4. Add your server to MCP.md after creation
5. Update command-MCP integration matrix
6. Test integration with relevant commands
-->

## [Server Name] Integration ([Primary Domain])

### Overview

**Purpose**: [One-line description of what this MCP server provides]

**Token Efficiency**: [X-YK tokens per operation], [caching behavior]
*Example: 2-5K tokens per query, cached results for session reuse*

**Primary Capabilities**:
- [Key capability 1]: [Brief description]
- [Key capability 2]: [Brief description]
- [Key capability 3]: [Brief description]

### Activation Patterns

**Automatic Activation**:
- When [specific condition is detected]
- During [particular workflow or command]
- If [code pattern or structure is found]
*Example: External library imports detected, framework-specific questions*

**Manual Activation**:
- Flag: `--[server-flag]` or `--[server-alias]`
- Commands that trigger: `/[command1]`, `/[command2]`

**Smart Activation**:
- Based on [contextual clues]
- When [complex scenario] requires [server capability]
- Persona preference: [Which personas prefer this server]
- Wave integration: [How server participates in wave orchestration]
- Multi-agent coordination: [Role in orchestrated operations]

### Enhanced Workflow Process

1. **Context Analysis**: Analyze request context and requirements
   - Input: User request, file patterns, complexity indicators
   - Process: Pattern matching against server capabilities
   - Output: Server compatibility score and recommendation

2. **Server Selection**: Choose optimal server based on analysis
   - Validation: Check server availability and response time
   - Transformation: Apply server-specific parameter formatting
   - Selection Algorithm: Use weighted scoring matrix

3. **Request Execution**: Execute server request with optimization
   - Integration: Coordinate with other servers if needed
   - Caching: Store results for session reuse with TTL
   - Monitoring: Track performance metrics and success rates

4. **Result Processing**: Process and validate server response
   - Verification: Validate response format and completeness
   - Delivery: Format results according to command requirements
   - Fallback: Handle errors with graceful degradation

### Server Selection Algorithm

```python
def calculate_server_score(server_name: str, context: Dict[str, Any]) -> float:
    """Calculate weighted score for server selection"""
    
    base_scores = {
        "Context7": {
            "documentation": 0.9,
            "frameworks": 0.95,
            "patterns": 0.85,
            "libraries": 0.9
        },
        "Sequential": {
            "analysis": 0.95,
            "reasoning": 0.9,
            "complexity": 0.85,
            "investigation": 0.9
        },
        "Magic": {
            "ui_generation": 0.95,
            "components": 0.9,
            "design_systems": 0.85,
            "frontend": 0.8
        },
        "Playwright": {
            "testing": 0.95,
            "performance": 0.9,
            "automation": 0.85,
            "metrics": 0.8
        }
    }
    
    # Get base score for operation type
    operation_type = context.get('operation_type', 'general')
    server_capabilities = base_scores.get(server_name, {})
    base_score = server_capabilities.get(operation_type, 0.5)
    
    # Apply context modifiers
    modifiers = {
        'complexity_bonus': min(context.get('complexity', 0) * 0.2, 0.3),
        'file_count_penalty': min(context.get('file_count', 0) / 1000, 0.2),
        'framework_bonus': 0.1 if context.get('framework_detected') else 0,
        'cache_availability': 0.05 if context.get('cache_available') else 0
    }
    
    # Calculate final score
    final_score = base_score
    for modifier_name, modifier_value in modifiers.items():
        if 'bonus' in modifier_name:
            final_score += modifier_value
        elif 'penalty' in modifier_name:
            final_score -= modifier_value
    
    return max(0.0, min(1.0, final_score))

def select_optimal_server(context: Dict[str, Any]) -> Dict[str, Any]:
    """Select the best MCP server for the given context"""
    
    available_servers = ["Context7", "Sequential", "Magic", "Playwright"]
    server_scores = {}
    
    for server in available_servers:
        server_scores[server] = calculate_server_score(server, context)
    
    # Sort servers by score
    ranked_servers = sorted(server_scores.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "primary_server": ranked_servers[0][0],
        "primary_score": ranked_servers[0][1],
        "fallback_servers": [server for server, score in ranked_servers[1:3]],
        "server_scores": server_scores,
        "selection_confidence": ranked_servers[0][1]
    }
```

### Orchestration Integration

**Wave System Role**:
- Wave Phase: [Which wave phase this server typically operates in]
- Inter-wave Coordination: [How server coordinates between waves]
- Context Sharing: [What context is shared across waves]

**Multi-Agent Coordination**:
- Agent Specialization: [What this server specializes in for agent delegation]
- Cross-Agent Communication: [How it communicates with other agents]
- Result Aggregation: [How results are combined with other agents]

### Integration Commands

**Primary Integration**:
- `/[command1]` - [How this server enhances the command]
- `/[command2]` - [Specific integration benefits]
- `/[command3]` - [Use cases and scenarios]

**Secondary Integration**:
- `/[command4]` - [Occasional or specific use]
- `/[command5]` - [Conditional integration]

### Capabilities & Use Cases

**[Category 1]: [Category Name]**
- [Specific capability]: [Description and example]
- [Specific capability]: [Description and example]
- [Specific capability]: [Description and example]

**[Category 2]: [Category Name]**
- [Specific capability]: [Description and example]
- [Specific capability]: [Description and example]

**Real-World Scenarios**:
1. **[Scenario Name]**: [Description]
   ```bash
   /[command] --[server-flag] [arguments]
   # Expected outcome
   ```

2. **[Scenario Name]**: [Description]
   ```bash
   /[command] --[server-flag] [arguments]
   # Expected outcome
   ```

### API & Methods

**Available Methods**:
1. **`[method-name]`**: [What it does]
   - Parameters: `[param1]`, `[param2]`
   - Returns: [Return type and description]
   - Example: `[method-call-example]`

2. **`[method-name]`**: [What it does]
   - Parameters: `[param1]`, `[param2]`
   - Returns: [Return type and description]
   - Example: `[method-call-example]`

### Best Practices

**Optimization Strategies**:
1. **Caching**: [How to leverage caching effectively]
2. **Batching**: [When and how to batch operations]
3. **Token Management**: [How to minimize token usage]

**Quality Standards**:
- Always [quality requirement]
- Verify [what to check] before [action]
- Ensure [standard to maintain]

**Performance Tips**:
- Use [technique] for [scenario]
- Avoid [anti-pattern] when [condition]
- Prefer [approach] over [alternative]

### Error Handling & Recovery

**Common Error Scenarios**:
1. **[Error Type]**: [Description]
   - Cause: [Why it happens]
   - Solution: [How to fix]
   - Fallback: [Alternative approach]

2. **[Error Type]**: [Description]
   - Cause: [Why it happens]
   - Solution: [How to fix]
   - Fallback: [Alternative approach]

**Recovery Strategies**:
- Primary: [First recovery attempt]
- Secondary: [If primary fails]
- Fallback: [Last resort option]

**Graceful Degradation**:
```
[Server] unavailable → [Alternative 1] → [Alternative 2] → [Manual approach]
```

### Integration Matrix

| Command | Usage Level | Integration Type | Notes |
|---------|-------------|------------------|-------|
| /[command1] | Primary | [Type] | [Special notes] |
| /[command2] | Secondary | [Type] | [Special notes] |
| /[command3] | Conditional | [Type] | [When used] |

### Configuration & Setup

**Requirements**:
- [Requirement 1]: [Details]
- [Requirement 2]: [Details]

**Environment Variables** (if applicable):
```bash
[ENV_VAR_NAME]=[value]
[ENV_VAR_NAME]=[value]
```

**Initialization**:
```javascript
// Example initialization code
const [serverName] = {
  config: {
    [setting]: [value]
  }
};
```

### Performance Metrics

**Typical Performance**:
- Response time: 2-8 seconds (Context7), 3-12 seconds (Sequential), 1-5 seconds (Magic), 5-15 seconds (Playwright)
- Token usage: 1-3K (Magic), 2-8K (Context7), 5-15K (Sequential), 3-10K (Playwright)
- Success rate: 95%+ (all servers under normal conditions)
- Cache hit rate: 60-80% for documentation queries, 30-50% for dynamic analysis

**Resource Impact**:
- CPU: Low (Context7, Magic), Medium (Sequential), High (Playwright)
- Memory: Low (Context7, Magic), Medium (Sequential, Playwright)
- Network: Medium (Context7, Magic), Low (Sequential), High (Playwright)

### Performance Optimization Strategies

**Caching Implementation**:
```python
def implement_intelligent_caching(server_name: str, request_hash: str, context: Dict[str, Any]):
    """Implement context-aware caching strategy"""
    
    cache_policies = {
        "Context7": {
            "ttl": 3600,  # 1 hour for documentation
            "invalidation_triggers": ["framework_version_change"],
            "cache_key_factors": ["library_name", "version", "query_type"]
        },
        "Sequential": {
            "ttl": 1800,  # 30 minutes for analysis
            "invalidation_triggers": ["file_modification", "scope_change"],
            "cache_key_factors": ["file_hash", "analysis_depth", "context_scope"]
        },
        "Magic": {
            "ttl": 900,   # 15 minutes for UI generation
            "invalidation_triggers": ["design_system_change"],
            "cache_key_factors": ["component_type", "framework", "design_tokens"]
        },
        "Playwright": {
            "ttl": 600,   # 10 minutes for testing
            "invalidation_triggers": ["code_change", "test_modification"],
            "cache_key_factors": ["test_suite", "environment", "target_url"]
        }
    }
    
    policy = cache_policies.get(server_name, {"ttl": 900})
    
    return {
        "cache_enabled": True,
        "cache_ttl": policy["ttl"],
        "cache_key": generate_cache_key(request_hash, policy["cache_key_factors"], context),
        "invalidation_strategy": policy.get("invalidation_triggers", [])
    }

def optimize_request_batching(requests: List[Dict], server_name: str) -> List[List[Dict]]:
    """Optimize request batching for server capabilities"""
    
    batch_configs = {
        "Context7": {"max_batch_size": 5, "parallel_capable": True},
        "Sequential": {"max_batch_size": 1, "parallel_capable": False},  # Sequential processing
        "Magic": {"max_batch_size": 3, "parallel_capable": True},
        "Playwright": {"max_batch_size": 2, "parallel_capable": False}  # Resource intensive
    }
    
    config = batch_configs.get(server_name, {"max_batch_size": 1, "parallel_capable": False})
    batches = []
    
    if config["parallel_capable"]:
        # Create batches up to max size
        for i in range(0, len(requests), config["max_batch_size"]):
            batches.append(requests[i:i + config["max_batch_size"]])
    else:
        # Sequential processing - one request per batch
        batches = [[request] for request in requests]
    
    return batches
```

### Future Enhancements

**Planned Features**:
- [Enhancement 1]: [Description and timeline]
- [Enhancement 2]: [Description and timeline]

**Integration Opportunities**:
- With [feature/tool]: [Potential benefits]
- For [use case]: [How it would help]

---

<!-- 
CHECKLIST BEFORE SUBMITTING:
- [ ] Server name follows naming conventions
- [ ] Clear purpose and capabilities defined
- [ ] Workflow process is detailed and numbered
- [ ] Integration commands are specified
- [ ] Error handling covers common scenarios
- [ ] Best practices provide actionable guidance
- [ ] Performance metrics are realistic
- [ ] Added to MCP.md server list
- [ ] Command integration matrix updated
-->