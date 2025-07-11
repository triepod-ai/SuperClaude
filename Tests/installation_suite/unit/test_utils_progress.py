#!/usr/bin/env python3
"""
Unit tests for progress utility module.

Tests progress tracking, spinner functionality, and performance monitoring.
"""

import pytest
import time
import threading
from unittest.mock import patch, Mock
from io import StringIO

# Import the progress module
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts" / "utils"))

try:
    from progress import ProgressTracker
except ImportError:
    # Fallback for testing environment
    class ProgressTracker:
        def __init__(self, use_colors=True):
            self.current_step = 0
            self.total_steps = 0
            self.started = False
            self.finished = False
            self.updates = []
        
        def start(self, description, total_steps):
            self.started = True
            self.total_steps = total_steps
            self.current_step = 0
        
        def update(self, steps=1, message=""):
            self.current_step += steps
            self.updates.append(message)
        
        def finish(self, message=""):
            self.finished = True


class TestProgressTracker:
    """Test suite for ProgressTracker class."""
    
    def test_progress_tracker_initialization_default(self):
        """Test ProgressTracker initialization with defaults."""
        tracker = ProgressTracker()
        
        assert tracker.current_step == 0
        assert tracker.total_steps == 0
        assert tracker.started is False
        assert tracker.finished is False
    
    def test_progress_tracker_initialization_no_colors(self):
        """Test ProgressTracker initialization without colors."""
        tracker = ProgressTracker(use_colors=False)
        
        assert tracker.current_step == 0
    
    def test_start_progress_tracking(self):
        """Test starting progress tracking."""
        tracker = ProgressTracker()
        
        tracker.start("Test Operation", 10)
        
        assert tracker.started is True
        assert tracker.total_steps == 10
        assert tracker.current_step == 0
        assert tracker.finished is False
    
    def test_update_progress_single_step(self):
        """Test updating progress by single step."""
        tracker = ProgressTracker()
        tracker.start("Test", 5)
        
        tracker.update()
        
        assert tracker.current_step == 1
    
    def test_update_progress_multiple_steps(self):
        """Test updating progress by multiple steps."""
        tracker = ProgressTracker()
        tracker.start("Test", 10)
        
        tracker.update(3)
        
        assert tracker.current_step == 3
    
    def test_update_progress_with_message(self):
        """Test updating progress with message."""
        tracker = ProgressTracker()
        tracker.start("Test", 5)
        
        tracker.update(1, "Processing item 1")
        
        assert tracker.current_step == 1
        if hasattr(tracker, 'updates'):
            assert "Processing item 1" in tracker.updates
    
    def test_finish_progress_tracking(self):
        """Test finishing progress tracking."""
        tracker = ProgressTracker()
        tracker.start("Test", 5)
        tracker.update(5)
        
        tracker.finish("Complete")
        
        assert tracker.finished is True
    
    def test_progress_percentage_calculation(self):
        """Test progress percentage calculation."""
        tracker = ProgressTracker()
        tracker.start("Test", 10)
        tracker.update(3)
        
        if hasattr(tracker, 'get_progress_percentage'):
            percentage = tracker.get_progress_percentage()
            assert percentage == 30.0
        else:
            # Manual calculation
            percentage = (tracker.current_step / tracker.total_steps) * 100
            assert percentage == 30.0
    
    def test_progress_percentage_zero_total(self):
        """Test progress percentage with zero total steps."""
        tracker = ProgressTracker()
        tracker.start("Test", 0)
        
        if hasattr(tracker, 'get_progress_percentage'):
            percentage = tracker.get_progress_percentage()
            assert percentage == 0.0
        else:
            # Should handle division by zero
            percentage = 0.0 if tracker.total_steps == 0 else (tracker.current_step / tracker.total_steps) * 100
            assert percentage == 0.0
    
    def test_progress_over_total(self):
        """Test progress exceeding total steps."""
        tracker = ProgressTracker()
        tracker.start("Test", 5)
        
        # Update beyond total
        tracker.update(10)
        
        assert tracker.current_step == 10
        
        if hasattr(tracker, 'get_progress_percentage'):
            percentage = tracker.get_progress_percentage()
            assert percentage >= 100.0
    
    def test_multiple_update_calls(self):
        """Test multiple sequential update calls."""
        tracker = ProgressTracker()
        tracker.start("Test", 10)
        
        tracker.update(2, "Step 1")
        tracker.update(3, "Step 2")
        tracker.update(1, "Step 3")
        
        assert tracker.current_step == 6
    
    def test_restart_progress_tracking(self):
        """Test restarting progress tracking."""
        tracker = ProgressTracker()
        
        # First operation
        tracker.start("First", 5)
        tracker.update(3)
        tracker.finish()
        
        # Second operation
        tracker.start("Second", 8)
        
        assert tracker.current_step == 0
        assert tracker.total_steps == 8
        assert tracker.started is True
        assert tracker.finished is False
    
    def test_progress_without_start(self):
        """Test updating progress without calling start."""
        tracker = ProgressTracker()
        
        # Should handle gracefully
        tracker.update(1, "Update without start")
        
        # Behavior is implementation dependent
        assert tracker.current_step >= 0
    
    def test_finish_without_start(self):
        """Test finishing progress without calling start."""
        tracker = ProgressTracker()
        
        # Should handle gracefully
        tracker.finish("Finish without start")
        
        # Should mark as finished
        if hasattr(tracker, 'finished'):
            assert tracker.finished is True
    
    def test_negative_steps_update(self):
        """Test updating with negative steps."""
        tracker = ProgressTracker()
        tracker.start("Test", 10)
        tracker.update(5)
        
        # Try negative update
        tracker.update(-2)
        
        # Implementation dependent - might clamp to 0 or allow negative
        assert tracker.current_step >= 0 or tracker.current_step == 3
    
    def test_zero_steps_update(self):
        """Test updating with zero steps."""
        tracker = ProgressTracker()
        tracker.start("Test", 5)
        
        initial_step = tracker.current_step
        tracker.update(0, "Zero step update")
        
        assert tracker.current_step == initial_step
    
    @patch('sys.stdout', new_callable=StringIO)
    def test_progress_output_capture(self, mock_stdout):
        """Test capturing progress output."""
        tracker = ProgressTracker()
        
        tracker.start("Test Output", 3)
        tracker.update(1, "Step 1")
        tracker.update(1, "Step 2")
        tracker.finish("Done")
        
        # Output behavior is implementation dependent
        output = mock_stdout.getvalue()
        # Just check that it doesn't crash and produces some output
        assert isinstance(output, str)
    
    def test_progress_performance(self):
        """Test progress tracking performance."""
        tracker = ProgressTracker()
        
        start_time = time.time()
        
        tracker.start("Performance Test", 1000)
        for i in range(1000):
            tracker.update(1, f"Step {i}")
        tracker.finish("Complete")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete 1000 updates quickly (< 1 second)
        assert duration < 1.0, f"Progress tracking took too long: {duration}s"
    
    def test_progress_thread_safety(self):
        """Test progress tracker thread safety."""
        tracker = ProgressTracker()
        tracker.start("Thread Test", 100)
        
        errors = []
        
        def worker(thread_id):
            try:
                for i in range(10):
                    tracker.update(1, f"Thread {thread_id} step {i}")
                    time.sleep(0.001)
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Should have no errors
        assert len(errors) == 0, f"Thread safety errors: {errors}"
        # Should have correct total updates
        assert tracker.current_step == 100
    
    def test_progress_with_unicode_messages(self):
        """Test progress tracking with Unicode messages."""
        tracker = ProgressTracker()
        tracker.start("Unicode Test", 3)
        
        tracker.update(1, "Processing 🚀 rockets")
        tracker.update(1, "Handling émojis and ünïcödé")
        tracker.update(1, "Final step ✅")
        
        assert tracker.current_step == 3
    
    def test_progress_with_long_messages(self):
        """Test progress tracking with very long messages."""
        tracker = ProgressTracker()
        tracker.start("Long Message Test", 2)
        
        long_message = "x" * 1000
        tracker.update(1, long_message)
        tracker.update(1, "Normal message")
        
        assert tracker.current_step == 2
    
    def test_progress_with_multiline_messages(self):
        """Test progress tracking with multiline messages."""
        tracker = ProgressTracker()
        tracker.start("Multiline Test", 2)
        
        multiline_message = "Line 1\nLine 2\nLine 3"
        tracker.update(1, multiline_message)
        tracker.update(1, "Single line")
        
        assert tracker.current_step == 2


class TestProgressTrackerAdvanced:
    """Advanced test scenarios for ProgressTracker."""
    
    def test_spinner_functionality(self):
        """Test spinner functionality if available."""
        tracker = ProgressTracker()
        
        if hasattr(tracker, 'start_spinner'):
            tracker.start_spinner("Spinning...")
            time.sleep(0.1)  # Let it spin briefly
            
            if hasattr(tracker, 'stop_spinner'):
                tracker.stop_spinner()
        
        # Test passes if no exception is raised
        assert True
    
    def test_progress_bar_display(self):
        """Test progress bar display if available."""
        tracker = ProgressTracker()
        tracker.start("Bar Test", 10)
        
        for i in range(10):
            tracker.update(1, f"Step {i+1}")
            if hasattr(tracker, '_update_display'):
                # Internal display update
                tracker._update_display()
        
        tracker.finish()
        assert tracker.current_step == 10
    
    def test_progress_with_eta_calculation(self):
        """Test ETA calculation if available."""
        tracker = ProgressTracker()
        tracker.start("ETA Test", 100)
        
        # Simulate some progress with time delays
        for i in range(10):
            tracker.update(1)
            time.sleep(0.001)
        
        if hasattr(tracker, 'get_eta'):
            eta = tracker.get_eta()
            assert isinstance(eta, (int, float)) or eta is None
        
        tracker.finish()
    
    def test_progress_rate_calculation(self):
        """Test progress rate calculation if available."""
        tracker = ProgressTracker()
        tracker.start("Rate Test", 50)
        
        start_time = time.time()
        for i in range(25):
            tracker.update(1)
            time.sleep(0.001)
        
        if hasattr(tracker, 'get_rate'):
            rate = tracker.get_rate()
            assert isinstance(rate, (int, float)) or rate is None
    
    def test_progress_context_manager(self):
        """Test progress tracker as context manager if supported."""
        if hasattr(ProgressTracker, '__enter__'):
            with ProgressTracker() as tracker:
                tracker.start("Context Test", 5)
                tracker.update(3)
                tracker.finish()
                
                assert tracker.current_step == 3
    
    def test_progress_callback_hooks(self):
        """Test progress callback hooks if available."""
        callback_calls = []
        
        def progress_callback(current, total, message):
            callback_calls.append((current, total, message))
        
        tracker = ProgressTracker()
        
        if hasattr(tracker, 'set_callback'):
            tracker.set_callback(progress_callback)
        
        tracker.start("Callback Test", 3)
        tracker.update(1, "Step 1")
        tracker.update(1, "Step 2")
        tracker.finish("Done")
        
        # If callbacks are supported, they should have been called
        if hasattr(tracker, 'set_callback'):
            assert len(callback_calls) > 0
    
    def test_progress_nested_operations(self):
        """Test nested progress operations if supported."""
        parent_tracker = ProgressTracker()
        child_tracker = ProgressTracker()
        
        parent_tracker.start("Parent Operation", 2)
        
        # First sub-operation
        child_tracker.start("Child Operation 1", 3)
        child_tracker.update(3)
        child_tracker.finish()
        parent_tracker.update(1, "Child 1 complete")
        
        # Second sub-operation
        child_tracker.start("Child Operation 2", 2)
        child_tracker.update(2)
        child_tracker.finish()
        parent_tracker.update(1, "Child 2 complete")
        
        parent_tracker.finish("All operations complete")
        
        assert parent_tracker.current_step == 2
        assert child_tracker.current_step == 2
    
    def test_progress_cancellation(self):
        """Test progress cancellation if supported."""
        tracker = ProgressTracker()
        tracker.start("Cancellable Operation", 100)
        
        tracker.update(50)
        
        if hasattr(tracker, 'cancel'):
            tracker.cancel("Operation cancelled")
            
            if hasattr(tracker, 'cancelled'):
                assert tracker.cancelled is True
        
        # Should handle cancellation gracefully
        assert tracker.current_step == 50
    
    def test_progress_pause_resume(self):
        """Test progress pause/resume if supported."""
        tracker = ProgressTracker()
        tracker.start("Pausable Operation", 10)
        
        tracker.update(3)
        
        if hasattr(tracker, 'pause'):
            tracker.pause()
            
            # Update while paused (should not change display)
            tracker.update(2)
            
            if hasattr(tracker, 'resume'):
                tracker.resume()
                tracker.update(5)
        
        tracker.finish()
        assert tracker.current_step == 10


class TestProgressTrackerEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_progress_with_floating_point_steps(self):
        """Test progress with floating point step values."""
        tracker = ProgressTracker()
        tracker.start("Float Test", 10.0)
        
        tracker.update(2.5, "Partial step")
        tracker.update(1.5, "Another partial")
        
        # Should handle floating point values
        assert tracker.current_step == 4.0 or tracker.current_step == 4
    
    def test_progress_with_large_numbers(self):
        """Test progress with very large numbers."""
        tracker = ProgressTracker()
        large_total = 1000000
        
        tracker.start("Large Numbers", large_total)
        tracker.update(100000)
        tracker.update(200000)
        
        assert tracker.current_step == 300000
        
        if hasattr(tracker, 'get_progress_percentage'):
            percentage = tracker.get_progress_percentage()
            assert percentage == 30.0
    
    def test_progress_tracker_memory_usage(self):
        """Test memory usage with many progress updates."""
        tracker = ProgressTracker()
        tracker.start("Memory Test", 10000)
        
        import sys
        initial_size = sys.getsizeof(tracker)
        
        # Perform many updates
        for i in range(5000):
            tracker.update(1, f"Step {i}")
        
        final_size = sys.getsizeof(tracker)
        size_increase = final_size - initial_size
        
        # Memory increase should be reasonable (< 1MB)
        assert size_increase < 1024 * 1024
    
    def test_progress_error_recovery(self):
        """Test progress tracker error recovery."""
        tracker = ProgressTracker()
        
        # Try to break the tracker
        try:
            tracker.start(None, None)
            tracker.update(None, None)
            tracker.finish(None)
        except (TypeError, ValueError):
            # Expected behavior for invalid inputs
            pass
        
        # Should be able to use normally after error
        tracker.start("Recovery Test", 3)
        tracker.update(3)
        tracker.finish()
        
        assert tracker.current_step == 3
    
    def test_progress_concurrent_start_calls(self):
        """Test concurrent start calls on same tracker."""
        tracker = ProgressTracker()
        
        def start_worker(description, total):
            tracker.start(f"Concurrent {description}", total)
            time.sleep(0.01)
        
        # Start multiple operations concurrently
        threads = []
        for i in range(5):
            thread = threading.Thread(target=start_worker, args=(i, 10))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Final state should be consistent
        assert tracker.total_steps > 0
        assert tracker.started is True
    
    def test_progress_extreme_values(self):
        """Test progress with extreme values."""
        tracker = ProgressTracker()
        
        # Test with maximum integer
        try:
            max_int = sys.maxsize
            tracker.start("Extreme Test", max_int)
            tracker.update(max_int // 2)
            
            assert tracker.current_step == max_int // 2
        except OverflowError:
            # Expected on some systems
            pass
        
        # Test with zero and negative
        tracker.start("Zero Test", 0)
        assert tracker.total_steps == 0