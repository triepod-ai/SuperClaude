#!/usr/bin/env python3
"""
Progress tracking utility for installation operations.
Provides progress bars and status tracking for long-running operations.
"""

import sys
import time
import threading
from typing import Optional, Any
from .colors import Colors


class ProgressTracker:
    """Progress tracking and display utility."""
    
    def __init__(self, use_colors: bool = True):
        """Initialize progress tracker.
        
        Args:
            use_colors: Whether to use colored output
        """
        self.colors = Colors() if use_colors else Colors(force_color=False)
        self.current_task = ""
        self.current_step = 0
        self.total_steps = 0
        self.start_time = 0
        self.is_active = False
        self._last_update = 0
        self._spinner_pos = 0
        self._spinner_chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        
    def start(self, task_name: str, total_steps: int = 100):
        """Start progress tracking for a task.
        
        Args:
            task_name: Name of the task being tracked
            total_steps: Total number of steps for completion
        """
        self.current_task = task_name
        self.current_step = 0
        self.total_steps = total_steps
        self.start_time = time.time()
        self.is_active = True
        self._last_update = time.time()
        
        print(f"\n{self.colors.info('Starting:')} {task_name}")
        self._update_display()
    
    def update(self, steps: int = 1, message: Optional[str] = None):
        """Update progress by specified number of steps.
        
        Args:
            steps: Number of steps to advance
            message: Optional status message
        """
        if not self.is_active:
            return
        
        self.current_step = min(self.current_step + steps, self.total_steps)
        
        # Throttle updates to avoid too frequent redraws
        current_time = time.time()
        if current_time - self._last_update >= 0.1:  # Update at most 10 times per second
            self._update_display(message)
            self._last_update = current_time
    
    def set_progress(self, step: int, message: Optional[str] = None):
        """Set progress to specific step.
        
        Args:
            step: Step number to set
            message: Optional status message
        """
        if not self.is_active:
            return
        
        self.current_step = min(max(step, 0), self.total_steps)
        self._update_display(message)
    
    def finish(self, message: Optional[str] = None):
        """Complete the progress tracking.
        
        Args:
            message: Optional completion message
        """
        if not self.is_active:
            return
        
        self.current_step = self.total_steps
        self.is_active = False
        
        elapsed_time = time.time() - self.start_time
        
        if message:
            final_message = message
        else:
            final_message = f"{self.current_task} completed in {elapsed_time:.1f}s"
        
        # Clear the progress line and show completion
        sys.stdout.write('\r' + ' ' * 80 + '\r')
        print(f"{self.colors.success('✓')} {final_message}")
        sys.stdout.flush()
    
    def error(self, message: str):
        """Mark progress as failed with error message.
        
        Args:
            message: Error message
        """
        if not self.is_active:
            return
        
        self.is_active = False
        
        # Clear the progress line and show error
        sys.stdout.write('\r' + ' ' * 80 + '\r')
        print(f"{self.colors.error('✗')} {message}")
        sys.stdout.flush()
    
    def _update_display(self, message: Optional[str] = None):
        """Update the progress display."""
        if not self.is_active:
            return
        
        # Calculate percentage
        if self.total_steps > 0:
            percentage = int((self.current_step / self.total_steps) * 100)
        else:
            percentage = 0
        
        # Create progress bar
        bar_width = 30
        filled_width = int((self.current_step / max(self.total_steps, 1)) * bar_width)
        bar = '█' * filled_width + '░' * (bar_width - filled_width)
        
        # Create spinner for activity indication
        spinner = self._spinner_chars[self._spinner_pos % len(self._spinner_chars)]
        self._spinner_pos += 1
        
        # Format display line
        if message:
            status_text = f" {message}"
        else:
            status_text = ""
        
        progress_line = f"\r{spinner} [{bar}] {percentage:3d}% ({self.current_step}/{self.total_steps}){status_text}"
        
        # Write to stdout (overwrite previous line)
        sys.stdout.write(progress_line)
        sys.stdout.flush()
    
    def substep(self, message: str):
        """Display a substep message without changing progress.
        
        Args:
            message: Substep message to display
        """
        if not self.is_active:
            return
        
        # Clear current line and show substep
        sys.stdout.write('\r' + ' ' * 80 + '\r')
        print(f"  {self.colors.muted('→')} {message}")
        
        # Redraw progress line
        self._update_display()


class SimpleProgress:
    """Simple progress indicator for basic operations."""
    
    def __init__(self):
        self.colors = Colors()
    
    def step(self, message: str):
        """Show a single step message."""
        print(f"{self.colors.info('•')} {message}")
    
    def success(self, message: str):
        """Show success message."""
        print(f"{self.colors.success('✓')} {message}")
    
    def error(self, message: str):
        """Show error message."""
        print(f"{self.colors.error('✗')} {message}")
    
    def warning(self, message: str):
        """Show warning message."""
        print(f"{self.colors.warning('⚠')} {message}")


class SpinnerProgress:
    """Spinner-based progress indicator for indeterminate operations."""
    
    def __init__(self):
        self.colors = Colors()
        self._spinner_chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        self._spinner_pos = 0
        self._active = False
        self._thread = None
        self._message = ""
    
    def start(self, message: str):
        """Start the spinner with a message."""
        self._message = message
        self._active = True
        self._spinner_pos = 0
        
        # Start spinner thread
        self._thread = threading.Thread(target=self._spin, daemon=True)
        self._thread.start()
    
    def stop(self, success_message: Optional[str] = None):
        """Stop the spinner."""
        self._active = False
        
        if self._thread:
            self._thread.join(timeout=0.5)
        
        # Clear spinner line
        sys.stdout.write('\r' + ' ' * 80 + '\r')
        
        if success_message:
            print(f"{self.colors.success('✓')} {success_message}")
        
        sys.stdout.flush()
    
    def _spin(self):
        """Spinner animation loop."""
        while self._active:
            char = self._spinner_chars[self._spinner_pos % len(self._spinner_chars)]
            sys.stdout.write(f'\r{char} {self._message}')
            sys.stdout.flush()
            self._spinner_pos += 1
            time.sleep(0.1)


def test_progress():
    """Test progress tracking utilities."""
    print("Testing ProgressTracker...")
    
    # Test progress tracker
    progress = ProgressTracker()
    progress.start("Testing progress", 10)
    
    for i in range(10):
        time.sleep(0.2)
        progress.update(1, f"Step {i+1}")
    
    progress.finish("All steps completed!")
    
    print("\nTesting SimpleProgress...")
    
    # Test simple progress
    simple = SimpleProgress()
    simple.step("Checking requirements")
    simple.success("Requirements met")
    simple.step("Installing components")
    simple.warning("Optional component skipped")
    simple.success("Installation complete")
    
    print("\nTesting SpinnerProgress...")
    
    # Test spinner progress
    spinner = SpinnerProgress()
    spinner.start("Processing...")
    time.sleep(2)
    spinner.stop("Processing complete")


if __name__ == "__main__":
    test_progress()