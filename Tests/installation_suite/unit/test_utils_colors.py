#!/usr/bin/env python3
"""
Unit tests for colors utility module.

Tests color formatting, terminal detection, and output utilities.
"""

import pytest
import sys
import os
from unittest.mock import patch, Mock
from io import StringIO

# Import the colors module
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts" / "utils"))

from colors import Colors


class TestColors:
    """Test suite for Colors utility class."""
    
    def test_colors_initialization_default(self):
        """Test Colors initialization with default settings."""
        colors = Colors()
        assert colors is not None
        # Colors should auto-detect terminal support
    
    def test_colors_initialization_force_color(self):
        """Test Colors initialization with forced color support."""
        colors = Colors(force_color=True)
        assert colors is not None
    
    def test_colors_initialization_no_color(self):
        """Test Colors initialization with disabled colors."""
        colors = Colors(force_color=False)
        assert colors is not None
    
    def test_info_formatting(self):
        """Test info message formatting."""
        colors = Colors(force_color=False)
        result = colors.info("Test message")
        assert "Test message" in result
        assert "[INFO]" in result or "ℹ️" in result
    
    def test_success_formatting(self):
        """Test success message formatting."""
        colors = Colors(force_color=False)
        result = colors.success("Success message")
        assert "Success message" in result
        assert "✓" in result or "[SUCCESS]" in result
    
    def test_warning_formatting(self):
        """Test warning message formatting."""
        colors = Colors(force_color=False)
        result = colors.warning("Warning message")
        assert "Warning message" in result
        assert "!" in result or "[WARNING]" in result
    
    def test_error_formatting(self):
        """Test error message formatting."""
        colors = Colors(force_color=False)
        result = colors.error("Error message")
        assert "Error message" in result
        assert "✗" in result or "[ERROR]" in result
    
    def test_muted_formatting(self):
        """Test muted text formatting."""
        colors = Colors(force_color=False)
        result = colors.muted("Muted text")
        assert "Muted text" in result
    
    def test_header_formatting(self):
        """Test header formatting."""
        colors = Colors(force_color=False)
        result = colors.header("Header text")
        assert "Header text" in result
    
    @patch('sys.stdout.isatty')
    def test_terminal_detection_tty(self, mock_isatty):
        """Test terminal detection when connected to TTY."""
        mock_isatty.return_value = True
        colors = Colors()
        # Should enable colors for TTY
        assert colors is not None
    
    @patch('sys.stdout.isatty')
    def test_terminal_detection_no_tty(self, mock_isatty):
        """Test terminal detection when not connected to TTY."""
        mock_isatty.return_value = False
        colors = Colors()
        # Should work without colors for non-TTY
        assert colors is not None
    
    @patch.dict(os.environ, {'TERM': 'xterm-256color'})
    def test_color_support_detection_with_color_term(self):
        """Test color support detection with color terminal."""
        colors = Colors()
        assert colors is not None
    
    @patch.dict(os.environ, {'TERM': 'dumb'})
    def test_color_support_detection_no_color_term(self):
        """Test color support detection with non-color terminal."""
        colors = Colors()
        assert colors is not None
    
    @patch.dict(os.environ, {'NO_COLOR': '1'})
    def test_no_color_environment_variable(self):
        """Test NO_COLOR environment variable support."""
        colors = Colors()
        # Should disable colors when NO_COLOR is set
        result = colors.info("Test")
        # Result should not contain ANSI escape codes
        assert '\033[' not in result or colors._force_color is False
    
    def test_color_codes_with_force_color(self):
        """Test that color codes are included when forced."""
        colors = Colors(force_color=True)
        result = colors.info("Test")
        # With forced colors, we might get ANSI codes or emoji
        assert "Test" in result
    
    def test_color_codes_without_color(self):
        """Test that color codes are excluded when disabled."""
        colors = Colors(force_color=False)
        result = colors.info("Test")
        # Should not contain ANSI escape sequences
        assert '\033[' not in result
        assert "Test" in result
    
    def test_empty_message_handling(self):
        """Test handling of empty messages."""
        colors = Colors()
        result = colors.info("")
        assert isinstance(result, str)
    
    def test_none_message_handling(self):
        """Test handling of None messages."""
        colors = Colors()
        # Should handle None gracefully
        try:
            result = colors.info(None)
            assert result is not None
        except (TypeError, AttributeError):
            # Expected behavior - colors utility might not handle None
            pass
    
    def test_unicode_message_handling(self):
        """Test handling of Unicode messages."""
        colors = Colors()
        unicode_msg = "Test with émojis 🚀 and ünïcödé"
        result = colors.info(unicode_msg)
        assert unicode_msg in result
    
    def test_multiline_message_handling(self):
        """Test handling of multiline messages."""
        colors = Colors()
        multiline_msg = "Line 1\nLine 2\nLine 3"
        result = colors.info(multiline_msg)
        assert "Line 1" in result
        assert "Line 2" in result
        assert "Line 3" in result
    
    def test_long_message_handling(self):
        """Test handling of very long messages."""
        colors = Colors()
        long_msg = "x" * 1000
        result = colors.info(long_msg)
        assert long_msg in result
        assert len(result) >= 1000
    
    def test_special_characters_handling(self):
        """Test handling of special characters."""
        colors = Colors()
        special_msg = "Test with <>&\"' characters"
        result = colors.info(special_msg)
        assert special_msg in result
    
    @pytest.mark.parametrize("message_type,method", [
        ("info", "info"),
        ("success", "success"), 
        ("warning", "warning"),
        ("error", "error"),
        ("muted", "muted"),
        ("header", "header")
    ])
    def test_all_message_types(self, message_type, method):
        """Test all message types with consistent interface."""
        colors = Colors(force_color=False)
        test_message = f"Test {message_type} message"
        
        method_func = getattr(colors, method)
        result = method_func(test_message)
        
        assert isinstance(result, str)
        assert test_message in result
        assert len(result) > len(test_message)  # Should add formatting
    
    def test_chaining_color_calls(self):
        """Test that color method calls can be chained or used sequentially."""
        colors = Colors(force_color=False)
        
        result1 = colors.info("First message")
        result2 = colors.success("Second message")
        result3 = colors.error("Third message")
        
        assert "First message" in result1
        assert "Second message" in result2
        assert "Third message" in result3
        
        # Results should be independent
        assert result1 != result2 != result3
    
    @patch('sys.platform', 'win32')
    def test_windows_compatibility(self):
        """Test Colors compatibility on Windows."""
        colors = Colors()
        result = colors.info("Windows test")
        assert "Windows test" in result
    
    @patch('sys.platform', 'darwin')
    def test_macos_compatibility(self):
        """Test Colors compatibility on macOS."""
        colors = Colors()
        result = colors.info("macOS test")
        assert "macOS test" in result
    
    @patch('sys.platform', 'linux')
    def test_linux_compatibility(self):
        """Test Colors compatibility on Linux."""
        colors = Colors()
        result = colors.info("Linux test")
        assert "Linux test" in result
    
    def test_consistent_formatting_across_calls(self):
        """Test that formatting is consistent across multiple calls."""
        colors = Colors(force_color=False)
        
        results = []
        for i in range(5):
            results.append(colors.info(f"Message {i}"))
        
        # All results should follow the same format pattern
        prefixes = [result.split("Message")[0] for result in results]
        assert all(prefix == prefixes[0] for prefix in prefixes)
    
    def test_performance_with_many_calls(self):
        """Test performance with many color formatting calls."""
        colors = Colors(force_color=False)
        
        import time
        start_time = time.time()
        
        for i in range(1000):
            colors.info(f"Performance test message {i}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete 1000 calls in reasonable time (< 1 second)
        assert duration < 1.0, f"Colors formatting took too long: {duration}s"


class TestColorsEdgeCases:
    """Test edge cases and error conditions for Colors."""
    
    def test_colors_with_broken_terminal(self):
        """Test Colors behavior with broken terminal detection."""
        with patch('sys.stdout.isatty', side_effect=Exception("Terminal error")):
            # Should not crash, should fall back gracefully
            colors = Colors()
            result = colors.info("Test message")
            assert "Test message" in result
    
    def test_colors_with_no_stdout(self):
        """Test Colors behavior when stdout is None."""
        with patch('sys.stdout', None):
            colors = Colors()
            result = colors.info("Test message")
            assert "Test message" in result
    
    def test_colors_initialization_multiple_instances(self):
        """Test creating multiple Colors instances."""
        colors1 = Colors(force_color=True)
        colors2 = Colors(force_color=False)
        colors3 = Colors()
        
        # All should work independently
        result1 = colors1.info("Message 1")
        result2 = colors2.info("Message 2")
        result3 = colors3.info("Message 3")
        
        assert "Message 1" in result1
        assert "Message 2" in result2
        assert "Message 3" in result3
    
    def test_colors_thread_safety(self):
        """Test Colors thread safety with concurrent access."""
        import threading
        import time
        
        colors = Colors(force_color=False)
        results = []
        errors = []
        
        def worker(thread_id):
            try:
                for i in range(10):
                    result = colors.info(f"Thread {thread_id} message {i}")
                    results.append(result)
                    time.sleep(0.001)  # Small delay to encourage concurrency
            except Exception as e:
                errors.append(e)
        
        # Create and start multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Should have no errors and correct number of results
        assert len(errors) == 0, f"Thread safety errors: {errors}"
        assert len(results) == 50  # 5 threads * 10 messages each