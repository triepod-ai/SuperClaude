#!/usr/bin/env python3
"""
Context Bridge - Lightweight Context Accumulation Bridge
Bridges Claude Code tool execution with superclaude-context MCP server
Performance target: <10ms execution overhead
"""

import time
import logging
import threading
import hashlib
import json
import zlib
from typing import Dict, Any, Optional, List, Set, Tuple
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ContextType(Enum):
    """Types of context data"""
    TOOL_INPUT = "tool_input"
    TOOL_OUTPUT = "tool_output"
    FILE_CONTENT = "file_content"
    USER_QUERY = "user_query"
    SESSION_STATE = "session_state"
    ERROR_STATE = "error_state"


class CompressionLevel(Enum):
    """Context compression levels"""
    NONE = 0
    FAST = 1
    BALANCED = 6
    MAXIMUM = 9


@dataclass
class ContextEntry:
    """Lightweight context entry"""
    context_id: str
    context_type: ContextType
    timestamp: float
    data: Dict[str, Any]
    tool_name: Optional[str] = None
    file_path: Optional[str] = None
    session_id: Optional[str] = None
    compressed: bool = False
    size_bytes: int = 0


class ContextBridge:
    """
    Lightweight context accumulation bridge
    Responsibility: Capture and manage context for MCP server integration
    """
    
    def __init__(self):
        # Storage configuration
        self.max_entries = 1000  # Maximum context entries to keep
        self.max_memory_mb = 50  # Maximum memory usage in MB
        self.compression_threshold = 1024  # Compress entries larger than 1KB
        
        # Context storage
        self.context_entries = deque(maxlen=self.max_entries)
        self.context_index = {}  # Quick lookup by context_id
        self.file_index = defaultdict(list)  # Index by file path
        self.session_index = defaultdict(list)  # Index by session
        self.lock = threading.RLock()
        
        # Batch processing for MCP
        self.batch_buffer = []
        self.batch_size = 20
        self.last_mcp_sync = 0
        self.mcp_sync_interval = 10.0  # Send to MCP every 10 seconds
        
        # Performance tracking
        self.compression_stats = {
            "total_compressed": 0,
            "bytes_saved": 0,
            "compression_time": 0.0
        }
        
        # Circuit breaker for MCP
        self.mcp_available = True
        self.mcp_failure_count = 0
        self.mcp_failure_threshold = 3
        
        # Smart deduplication
        self.content_hashes = {}  # Map hash -> context_id for deduplication
        self.dedup_enabled = True
    
    def capture_tool_input(self, tool_name: str, tool_args: Dict[str, Any], 
                          session_id: Optional[str] = None) -> str:
        """
        Capture tool input context
        Performance target: <5ms
        """
        context_id = self._generate_context_id("input", tool_name)
        
        entry = ContextEntry(
            context_id=context_id,
            context_type=ContextType.TOOL_INPUT,
            timestamp=time.time(),
            data={
                "tool_name": tool_name,
                "arguments": tool_args,
                "arg_count": len(tool_args),
                "has_file_path": "file_path" in tool_args
            },
            tool_name=tool_name,
            file_path=tool_args.get("file_path"),
            session_id=session_id
        )
        
        self._store_context_entry(entry)
        return context_id
    
    def capture_tool_output(self, tool_name: str, output_data: Any, 
                           duration: Optional[float] = None,
                           session_id: Optional[str] = None) -> str:
        """
        Capture tool output context
        Performance target: <10ms
        """
        context_id = self._generate_context_id("output", tool_name)
        
        # Process output data efficiently
        processed_output = self._process_output_data(output_data)
        
        entry = ContextEntry(
            context_id=context_id,
            context_type=ContextType.TOOL_OUTPUT,
            timestamp=time.time(),
            data={
                "tool_name": tool_name,
                "output": processed_output,
                "duration_ms": duration * 1000 if duration else None,
                "output_size": len(str(output_data)),
                "success": self._determine_success(output_data)
            },
            tool_name=tool_name,
            session_id=session_id
        )
        
        self._store_context_entry(entry)
        return context_id
    
    def capture_file_content(self, file_path: str, content_preview: str, 
                           operation: str, session_id: Optional[str] = None) -> str:
        """
        Capture file content context
        Performance target: <10ms
        """
        context_id = self._generate_context_id("file", file_path)
        
        # Create efficient preview
        preview = self._create_content_preview(content_preview)
        
        entry = ContextEntry(
            context_id=context_id,
            context_type=ContextType.FILE_CONTENT,
            timestamp=time.time(),
            data={
                "file_path": file_path,
                "operation": operation,
                "preview": preview,
                "file_size": len(content_preview),
                "line_count": content_preview.count('\n') if isinstance(content_preview, str) else 0,
                "file_extension": Path(file_path).suffix if file_path else None
            },
            file_path=file_path,
            session_id=session_id
        )
        
        self._store_context_entry(entry)
        return context_id
    
    def capture_user_query(self, query: str, session_id: Optional[str] = None) -> str:
        """
        Capture user query context
        Performance target: <5ms
        """
        context_id = self._generate_context_id("query", "user")
        
        # Extract query features
        query_features = self._extract_query_features(query)
        
        entry = ContextEntry(
            context_id=context_id,
            context_type=ContextType.USER_QUERY,
            timestamp=time.time(),
            data={
                "query": query[:1000],  # Limit query length
                "length": len(query),
                "features": query_features,
                "language": "en"  # Simple default
            },
            session_id=session_id
        )
        
        self._store_context_entry(entry)
        return context_id
    
    def capture_error_state(self, error_info: Dict[str, Any], 
                           tool_name: Optional[str] = None,
                           session_id: Optional[str] = None) -> str:
        """
        Capture error state context
        Performance target: <5ms
        """
        context_id = self._generate_context_id("error", tool_name or "unknown")
        
        entry = ContextEntry(
            context_id=context_id,
            context_type=ContextType.ERROR_STATE,
            timestamp=time.time(),
            data={
                "error_type": error_info.get("type", "unknown"),
                "error_message": str(error_info.get("message", ""))[:500],  # Limit message
                "tool_name": tool_name,
                "traceback_available": bool(error_info.get("traceback")),
                "severity": error_info.get("severity", "medium")
            },
            tool_name=tool_name,
            session_id=session_id
        )
        
        self._store_context_entry(entry)
        return context_id
    
    def _generate_context_id(self, prefix: str, identifier: str) -> str:
        """Generate unique context ID"""
        timestamp_us = int(time.time() * 1000000)
        return f"{prefix}_{identifier}_{timestamp_us}"
    
    def _store_context_entry(self, entry: ContextEntry):
        """Store context entry with compression and indexing"""
        start_time = time.time()
        
        with self.lock:
            # Calculate entry size (convert enum to string for JSON serialization)
            entry_dict = asdict(entry)
            entry_dict['context_type'] = entry.context_type.value  # Convert enum to string
            entry_data = json.dumps(entry_dict)
            entry.size_bytes = len(entry_data.encode('utf-8'))
            
            # Check for deduplication
            if self.dedup_enabled:
                content_hash = self._calculate_content_hash(entry.data)
                if content_hash in self.content_hashes:
                    # Duplicate content, just update timestamp reference
                    existing_id = self.content_hashes[content_hash]
                    logger.debug(f"Deduplicated context: {entry.context_id} -> {existing_id}")
                    return existing_id
                self.content_hashes[content_hash] = entry.context_id
            
            # Apply compression if needed
            if entry.size_bytes > self.compression_threshold:
                entry = self._compress_entry(entry)
            
            # Store entry
            self.context_entries.append(entry)
            self.context_index[entry.context_id] = entry
            
            # Update indexes
            if entry.file_path:
                self.file_index[entry.file_path].append(entry.context_id)
            if entry.session_id:
                self.session_index[entry.session_id].append(entry.context_id)
            
            # Add to batch for MCP
            self.batch_buffer.append(entry)
            
            # Check memory usage and cleanup if needed
            self._check_memory_usage()
            
            # Check if should sync to MCP
            current_time = time.time()
            should_sync = (
                len(self.batch_buffer) >= self.batch_size or
                (current_time - self.last_mcp_sync) >= self.mcp_sync_interval or
                entry.context_type == ContextType.ERROR_STATE
            )
            
            if should_sync and self.mcp_available:
                self._sync_batch_to_mcp()
        
        processing_time = time.time() - start_time
        if processing_time > 0.010:  # 10ms threshold
            logger.warning(f"Context storage took {processing_time:.3f}s")
    
    def _process_output_data(self, output_data: Any) -> Dict[str, Any]:
        """Process tool output data efficiently"""
        if isinstance(output_data, str):
            return {
                "type": "string",
                "length": len(output_data),
                "preview": output_data[:200] + "..." if len(output_data) > 200 else output_data,
                "lines": output_data.count('\n') if '\n' in output_data else 1
            }
        elif isinstance(output_data, dict):
            return {
                "type": "dict",
                "keys": list(output_data.keys())[:10],  # First 10 keys
                "key_count": len(output_data),
                "has_error": "error" in output_data or "errors" in output_data,
                "has_success": "success" in output_data
            }
        elif isinstance(output_data, list):
            return {
                "type": "list",
                "length": len(output_data),
                "preview": output_data[:3] if len(output_data) <= 3 else output_data[:2] + ["..."]
            }
        else:
            return {
                "type": type(output_data).__name__,
                "string_repr": str(output_data)[:100]
            }
    
    def _create_content_preview(self, content: str, max_lines: int = 20) -> Dict[str, Any]:
        """Create efficient content preview"""
        if not isinstance(content, str):
            content = str(content)
        
        lines = content.split('\n')
        
        return {
            "total_lines": len(lines),
            "head_lines": lines[:max_lines//2] if len(lines) > max_lines else lines,
            "tail_lines": lines[-max_lines//2:] if len(lines) > max_lines else [],
            "truncated": len(lines) > max_lines,
            "encoding": "utf-8",
            "estimated_tokens": len(content.split()) * 1.3  # Rough token estimate
        }
    
    def _extract_query_features(self, query: str) -> Dict[str, Any]:
        """Extract features from user query"""
        words = query.lower().split()
        
        # Command detection
        commands = [w for w in words if w.startswith('/')]
        
        # Intent detection
        intent_keywords = {
            "analysis": ["analyze", "review", "explain", "understand", "investigate"],
            "creation": ["create", "build", "implement", "generate", "design"],
            "modification": ["update", "refactor", "improve", "optimize", "fix"],
            "documentation": ["document", "write", "explain", "guide"]
        }
        
        detected_intents = []
        for intent, keywords in intent_keywords.items():
            if any(keyword in words for keyword in keywords):
                detected_intents.append(intent)
        
        return {
            "word_count": len(words),
            "commands": commands,
            "intents": detected_intents,
            "has_file_reference": any("/" in word or "." in word for word in words),
            "complexity_score": min(1.0, len(words) / 50.0)  # Simple complexity
        }
    
    def _determine_success(self, output_data: Any) -> Optional[bool]:
        """Determine if tool output indicates success"""
        if isinstance(output_data, dict):
            if "success" in output_data:
                return bool(output_data["success"])
            elif "error" in output_data or "errors" in output_data:
                return False
        elif isinstance(output_data, str) and "error" in output_data.lower():
            return False
        
        return None  # Unknown
    
    def _calculate_content_hash(self, data: Dict[str, Any]) -> str:
        """Calculate hash for deduplication"""
        # Create a stable hash of the essential content
        content_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(content_str.encode()).hexdigest()[:16]
    
    def _compress_entry(self, entry: ContextEntry) -> ContextEntry:
        """Compress context entry data"""
        try:
            start_time = time.time()
            
            # Serialize data
            data_json = json.dumps(entry.data)
            original_size = len(data_json.encode('utf-8'))
            
            # Compress
            compressed_data = zlib.compress(data_json.encode('utf-8'), CompressionLevel.FAST.value)
            compressed_size = len(compressed_data)
            
            # Update entry
            entry.data = {"__compressed__": compressed_data}
            entry.compressed = True
            entry.size_bytes = compressed_size
            
            # Update stats
            compression_time = time.time() - start_time
            self.compression_stats["total_compressed"] += 1
            self.compression_stats["bytes_saved"] += (original_size - compressed_size)
            self.compression_stats["compression_time"] += compression_time
            
            return entry
            
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            return entry
    
    def _decompress_entry(self, entry: ContextEntry) -> Dict[str, Any]:
        """Decompress context entry data"""
        if not entry.compressed:
            return entry.data
        
        try:
            compressed_data = entry.data["__compressed__"]
            decompressed_json = zlib.decompress(compressed_data).decode('utf-8')
            return json.loads(decompressed_json)
        except Exception as e:
            logger.error(f"Decompression failed: {e}")
            return {"error": "decompression_failed"}
    
    def _check_memory_usage(self):
        """Check and manage memory usage"""
        current_size = sum(entry.size_bytes for entry in self.context_entries)
        max_size = self.max_memory_mb * 1024 * 1024  # Convert to bytes
        
        if current_size > max_size:
            # Remove oldest entries
            while current_size > max_size * 0.8 and len(self.context_entries) > 10:
                removed_entry = self.context_entries.popleft()
                current_size -= removed_entry.size_bytes
                
                # Clean up indexes
                if removed_entry.context_id in self.context_index:
                    del self.context_index[removed_entry.context_id]
                
                logger.debug(f"Removed old context entry: {removed_entry.context_id}")
    
    def _sync_batch_to_mcp(self):
        """Sync batched context entries to superclaude-context MCP server"""
        if not self.batch_buffer:
            return
        
        try:
            # Prepare batch data
            batch_data = {
                "entries": [
                    {
                        "context_id": entry.context_id,
                        "context_type": entry.context_type.value,
                        "timestamp": entry.timestamp,
                        "data": entry.data if not entry.compressed else {"compressed": True},
                        "tool_name": entry.tool_name,
                        "file_path": entry.file_path,
                        "session_id": entry.session_id,
                        "size_bytes": entry.size_bytes,
                        "compressed": entry.compressed
                    }
                    for entry in self.batch_buffer
                ],
                "batch_timestamp": time.time(),
                "batch_size": len(self.batch_buffer)
            }
            
            # Call MCP server
            success = self._call_context_mcp_server(batch_data)
            
            if success:
                self.batch_buffer.clear()
                self.last_mcp_sync = time.time()
                self.mcp_failure_count = 0
            else:
                self._handle_mcp_failure()
                
        except Exception as e:
            logger.error(f"Failed to sync context batch to MCP: {e}")
            self._handle_mcp_failure()
    
    def _call_context_mcp_server(self, batch_data: Dict[str, Any]) -> bool:
        """Call superclaude-context MCP server (placeholder)"""
        # Placeholder for actual MCP server integration
        try:
            start_time = time.time()
            
            # Simulate processing (replace with actual MCP call)
            # time.sleep(0.002)  # 2ms simulated processing
            
            call_duration = time.time() - start_time
            
            if call_duration > 0.050:  # 50ms threshold
                logger.warning(f"Slow MCP context call: {call_duration:.3f}s")
            
            return True
            
        except Exception as e:
            logger.error(f"MCP context server call failed: {e}")
            return False
    
    def _handle_mcp_failure(self):
        """Handle MCP server failure with circuit breaker"""
        self.mcp_failure_count += 1
        
        if self.mcp_failure_count >= self.mcp_failure_threshold:
            self.mcp_available = False
            logger.warning("MCP context server marked as unavailable")
            
            # Clear batch buffer to prevent memory buildup
            self.batch_buffer.clear()
    
    def get_context_summary(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get context summary
        Performance target: <10ms
        """
        with self.lock:
            if session_id:
                relevant_entries = [
                    self.context_index[cid] for cid in self.session_index.get(session_id, [])
                    if cid in self.context_index
                ]
            else:
                relevant_entries = list(self.context_entries)
            
            # Quick summary stats
            type_counts = defaultdict(int)
            tool_counts = defaultdict(int)
            recent_count = 0
            current_time = time.time()
            
            for entry in relevant_entries:
                type_counts[entry.context_type.value] += 1
                if entry.tool_name:
                    tool_counts[entry.tool_name] += 1
                if current_time - entry.timestamp < 300:  # Last 5 minutes
                    recent_count += 1
            
            return {
                "total_entries": len(relevant_entries),
                "recent_entries": recent_count,
                "context_types": dict(type_counts),
                "top_tools": dict(list(tool_counts.items())[:10]),
                "memory_usage_mb": sum(e.size_bytes for e in relevant_entries) / (1024 * 1024),
                "compression_stats": self.compression_stats.copy(),
                "mcp_status": "available" if self.mcp_available else "unavailable",
                "batch_pending": len(self.batch_buffer)
            }
    
    def get_file_context(self, file_path: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get context entries for specific file"""
        with self.lock:
            context_ids = self.file_index.get(file_path, [])[-limit:]
            
            entries = []
            for cid in context_ids:
                if cid in self.context_index:
                    entry = self.context_index[cid]
                    entries.append({
                        "context_id": entry.context_id,
                        "context_type": entry.context_type.value,
                        "timestamp": entry.timestamp,
                        "tool_name": entry.tool_name,
                        "data": self._decompress_entry(entry),
                        "size_bytes": entry.size_bytes
                    })
            
            return entries
    
    def force_sync(self):
        """Force sync pending context to MCP"""
        with self.lock:
            if self.batch_buffer and self.mcp_available:
                self._sync_batch_to_mcp()
    
    def reset_mcp_circuit_breaker(self):
        """Reset MCP circuit breaker"""
        self.mcp_available = True
        self.mcp_failure_count = 0
        logger.info("MCP context server circuit breaker reset")


# Global instance
_context_bridge = None


def get_context_bridge() -> ContextBridge:
    """Get global context bridge instance"""
    global _context_bridge
    if _context_bridge is None:
        _context_bridge = ContextBridge()
    return _context_bridge


# Convenience functions
def capture_tool_context(tool_name: str, tool_args: Dict[str, Any], 
                        output_data: Any = None, duration: Optional[float] = None,
                        session_id: Optional[str] = None) -> Tuple[str, Optional[str]]:
    """Capture both input and output context for a tool"""
    bridge = get_context_bridge()
    
    input_id = bridge.capture_tool_input(tool_name, tool_args, session_id)
    output_id = None
    
    if output_data is not None:
        output_id = bridge.capture_tool_output(tool_name, output_data, duration, session_id)
    
    return input_id, output_id


def bridge_context_accumulation(action: str, **kwargs) -> Dict[str, Any]:
    """
    Main context bridge interface
    
    Args:
        action: Action to perform (capture_input, capture_output, capture_file, 
                capture_query, capture_error, get_summary, get_file_context, sync)
        **kwargs: Action-specific parameters
        
    Returns:
        Dict containing:
        - success: bool
        - result: Dict (action result)
        - metrics: Dict (performance metrics)
        - errors: List[str] (any errors)
    """
    try:
        bridge = get_context_bridge()
        
        result = {}
        
        if action == "capture_input":
            context_id = bridge.capture_tool_input(
                kwargs.get("tool_name", ""),
                kwargs.get("tool_args", {}),
                kwargs.get("session_id")
            )
            result = {"context_id": context_id}
            
        elif action == "capture_output":
            context_id = bridge.capture_tool_output(
                kwargs.get("tool_name", ""),
                kwargs.get("output_data"),
                kwargs.get("duration"),
                kwargs.get("session_id")
            )
            result = {"context_id": context_id}
            
        elif action == "capture_file":
            context_id = bridge.capture_file_content(
                kwargs.get("file_path", ""),
                kwargs.get("content_preview", ""),
                kwargs.get("operation", "unknown"),
                kwargs.get("session_id")
            )
            result = {"context_id": context_id}
            
        elif action == "capture_query":
            context_id = bridge.capture_user_query(
                kwargs.get("query", ""),
                kwargs.get("session_id")
            )
            result = {"context_id": context_id}
            
        elif action == "capture_error":
            context_id = bridge.capture_error_state(
                kwargs.get("error_info", {}),
                kwargs.get("tool_name"),
                kwargs.get("session_id")
            )
            result = {"context_id": context_id}
            
        elif action == "get_summary":
            result = bridge.get_context_summary(kwargs.get("session_id"))
            
        elif action == "get_file_context":
            entries = bridge.get_file_context(
                kwargs.get("file_path", ""),
                kwargs.get("limit", 10)
            )
            result = {"entries": entries}
            
        elif action == "sync":
            bridge.force_sync()
            result = {"synced": True}
            
        elif action == "reset_circuit_breaker":
            bridge.reset_mcp_circuit_breaker()
            result = {"reset": True}
            
        else:
            raise ValueError(f"Unknown action: {action}")
        
        return {
            "success": True,
            "result": result,
            "metrics": {},
            "errors": []
        }
        
    except Exception as e:
        logger.error(f"Context bridge action '{action}' failed: {e}")
        return {
            "success": False,
            "result": {},
            "metrics": {},
            "errors": [str(e)]
        }


if __name__ == "__main__":
    # Test the context bridge
    bridge = ContextBridge()
    
    # Test tool input capture
    input_id = bridge.capture_tool_input(
        "Read",
        {"file_path": "/test/file.py", "limit": 100},
        "test_session"
    )
    print(f"Captured input: {input_id}")
    
    # Test tool output capture
    output_id = bridge.capture_tool_output(
        "Read",
        {"content": "def hello(): pass", "lines": 1},
        0.025,
        "test_session"
    )
    print(f"Captured output: {output_id}")
    
    # Test file content capture
    file_id = bridge.capture_file_content(
        "/test/file.py",
        "def hello():\n    print('Hello, World!')",
        "read",
        "test_session"
    )
    print(f"Captured file context: {file_id}")
    
    # Test summary
    summary = bridge.get_context_summary("test_session")
    print(f"Context summary: {json.dumps(summary, indent=2)}")
    
    # Test interface
    interface_result = bridge_context_accumulation(
        "capture_query",
        query="Analyze this Python file for performance issues",
        session_id="test_session"
    )
    print(f"Interface result: {interface_result['success']}")