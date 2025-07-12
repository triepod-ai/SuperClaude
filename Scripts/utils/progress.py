#!/usr/bin/env python3
"""
Progress tracking utility for installation operations.
Provides progress bars and status tracking for long-running operations.
"""

import sys
import time
import threading
from typing import Optional, Any, Dict, List
from .colors import Colors


class ProgressTracker:
    """Progress tracking and display utility with time estimation."""
    
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
        self.started = False
        self.finished = False
        self._last_update = 0
        self._spinner_pos = 0
        self._spinner_chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        
        # Time estimation tracking
        self._step_times: List[float] = []
        self._last_step_time = 0
        self._eta_smooth_factor = 0.3  # Smoothing factor for ETA calculation
        self._estimated_remaining = 0
        
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
        self.started = True
        self.finished = False
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
        
        # Track time for ETA calculation
        current_time = time.time()
        if self._last_step_time > 0:
            step_duration = current_time - self._last_step_time
            self._step_times.append(step_duration / steps)
            # Keep only recent measurements for better accuracy
            if len(self._step_times) > 20:
                self._step_times.pop(0)
        self._last_step_time = current_time
        
        # Throttle updates to avoid too frequent redraws
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
        self.finished = True
        
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
    
    def _calculate_eta(self) -> Optional[float]:
        """Calculate estimated time remaining."""
        if not self._step_times or self.current_step >= self.total_steps:
            return None
        
        avg_step_time = sum(self._step_times) / len(self._step_times)
        remaining_steps = self.total_steps - self.current_step
        estimated = avg_step_time * remaining_steps
        
        # Apply smoothing to reduce jitter
        if self._estimated_remaining > 0:
            self._estimated_remaining = (self._eta_smooth_factor * estimated + 
                                       (1 - self._eta_smooth_factor) * self._estimated_remaining)
        else:
            self._estimated_remaining = estimated
        
        return self._estimated_remaining
    
    def _format_time(self, seconds: float) -> str:
        """Format time in human-readable format."""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            secs = int(seconds % 60)
            return f"{minutes}m {secs}s"
        else:
            hours = int(seconds / 3600)
            minutes = int((seconds % 3600) / 60)
            return f"{hours}h {minutes}m"
    
    def _update_display(self, message: Optional[str] = None):
        """Update the progress display with ETA."""
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
        
        # Calculate ETA
        eta = self._calculate_eta()
        eta_text = f" ETA: {self._format_time(eta)}" if eta else ""
        
        # Format display line
        if message:
            status_text = f" | {message}"
        else:
            status_text = ""
        
        progress_line = f"\r{spinner} [{bar}] {percentage:3d}% ({self.current_step}/{self.total_steps}){eta_text}{status_text}"
        
        # Write to stdout (overwrite previous line)
        sys.stdout.write(progress_line[:120])  # Limit line length
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


class DownloadProgress(ProgressTracker):
    """Progress tracker specifically for download operations."""
    
    def __init__(self, use_colors: bool = True):
        """Initialize download progress tracker."""
        super().__init__(use_colors)
        self.total_size = 0
        self.downloaded_size = 0
        self._last_downloaded = 0
        self._last_speed_update = 0
        self._download_speeds: List[float] = []
        self._current_speed = 0
    
    def start_download(self, task_name: str, total_size: int):
        """Start tracking a download.
        
        Args:
            task_name: Name of the download
            total_size: Total size in bytes
        """
        self.total_size = total_size
        self.downloaded_size = 0
        self._last_downloaded = 0
        self._last_speed_update = time.time()
        # Convert bytes to steps (1 step = 1KB)
        total_steps = max(1, total_size // 1024)
        self.start(task_name, total_steps)
    
    def update_download(self, bytes_downloaded: int, message: Optional[str] = None):
        """Update download progress.
        
        Args:
            bytes_downloaded: Total bytes downloaded so far
            message: Optional status message
        """
        self.downloaded_size = bytes_downloaded
        
        # Calculate download speed
        current_time = time.time()
        time_diff = current_time - self._last_speed_update
        if time_diff >= 0.5:  # Update speed every 0.5 seconds
            bytes_diff = bytes_downloaded - self._last_downloaded
            if time_diff > 0:
                speed = bytes_diff / time_diff
                self._download_speeds.append(speed)
                if len(self._download_speeds) > 5:
                    self._download_speeds.pop(0)
                self._current_speed = sum(self._download_speeds) / len(self._download_speeds)
            self._last_downloaded = bytes_downloaded
            self._last_speed_update = current_time
        
        # Update progress (convert to KB)
        kb_downloaded = bytes_downloaded // 1024
        self.set_progress(kb_downloaded, message)
    
    def _format_size(self, size_bytes: int) -> str:
        """Format bytes to human-readable size."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f}{unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f}TB"
    
    def _format_speed(self, speed_bps: float) -> str:
        """Format download speed."""
        return self._format_size(int(speed_bps)) + "/s"
    
    def _update_display(self, message: Optional[str] = None):
        """Update download progress display."""
        if not self.is_active:
            return
        
        # Calculate percentage
        percentage = int((self.downloaded_size / max(self.total_size, 1)) * 100)
        
        # Create progress bar
        bar_width = 30
        filled_width = int((self.downloaded_size / max(self.total_size, 1)) * bar_width)
        bar = '█' * filled_width + '░' * (bar_width - filled_width)
        
        # Create spinner
        spinner = self._spinner_chars[self._spinner_pos % len(self._spinner_chars)]
        self._spinner_pos += 1
        
        # Format sizes
        downloaded_str = self._format_size(self.downloaded_size)
        total_str = self._format_size(self.total_size)
        
        # Speed and ETA
        speed_text = ""
        eta_text = ""
        if self._current_speed > 0:
            speed_text = f" @ {self._format_speed(self._current_speed)}"
            remaining_bytes = self.total_size - self.downloaded_size
            eta_seconds = remaining_bytes / self._current_speed
            eta_text = f" ETA: {self._format_time(eta_seconds)}"
        
        # Status message
        status_text = f" | {message}" if message else ""
        
        progress_line = f"\r{spinner} [{bar}] {percentage:3d}% ({downloaded_str}/{total_str}){speed_text}{eta_text}{status_text}"
        
        sys.stdout.write(progress_line[:120])
        sys.stdout.flush()


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


class MultiStageProgress:
    """Progress tracker for multi-stage operations."""
    
    def __init__(self, use_colors: bool = True):
        """Initialize multi-stage progress tracker."""
        self.colors = Colors() if use_colors else Colors(force_color=False)
        self.stages: List[Dict[str, Any]] = []
        self.current_stage_index = -1
        self.current_tracker: Optional[ProgressTracker] = None
        self.overall_start_time = 0
        self.stage_weights: Dict[str, float] = {}
    
    def add_stage(self, name: str, steps: int, weight: float = 1.0):
        """Add a stage to the multi-stage operation.
        
        Args:
            name: Stage name
            steps: Number of steps in this stage
            weight: Relative weight of this stage (for overall progress)
        """
        self.stages.append({
            'name': name,
            'steps': steps,
            'weight': weight,
            'completed': False,
            'start_time': 0,
            'end_time': 0
        })
        self.stage_weights[name] = weight
    
    def start(self):
        """Start the multi-stage operation."""
        if not self.stages:
            return
        
        self.overall_start_time = time.time()
        total_weight = sum(stage['weight'] for stage in self.stages)
        
        print(f"\n{self.colors.header('Starting multi-stage operation with {len(self.stages)} stages:')}")
        for i, stage in enumerate(self.stages):
            weight_pct = int((stage['weight'] / total_weight) * 100)
            print(f"  {i+1}. {stage['name']} ({weight_pct}% of total)")
        print()
    
    def start_stage(self, stage_name: Optional[str] = None):
        """Start a specific stage or the next stage."""
        if stage_name:
            # Find stage by name
            for i, stage in enumerate(self.stages):
                if stage['name'] == stage_name:
                    self.current_stage_index = i
                    break
        else:
            # Move to next stage
            self.current_stage_index += 1
        
        if self.current_stage_index >= len(self.stages):
            return False
        
        stage = self.stages[self.current_stage_index]
        stage['start_time'] = time.time()
        
        # Show stage header
        stage_num = self.current_stage_index + 1
        total_stages = len(self.stages)
        print(f"\n{self.colors.info(f'[Stage {stage_num}/{total_stages}]')} {stage['name']}")
        
        # Create tracker for this stage
        self.current_tracker = ProgressTracker()
        self.current_tracker.start(stage['name'], stage['steps'])
        
        return True
    
    def update_stage(self, steps: int = 1, message: Optional[str] = None):
        """Update current stage progress."""
        if self.current_tracker:
            self.current_tracker.update(steps, message)
    
    def complete_stage(self, message: Optional[str] = None):
        """Complete the current stage."""
        if self.current_stage_index < 0 or self.current_stage_index >= len(self.stages):
            return
        
        stage = self.stages[self.current_stage_index]
        stage['completed'] = True
        stage['end_time'] = time.time()
        
        if self.current_tracker:
            self.current_tracker.finish(message)
        
        # Calculate and show overall progress
        self._show_overall_progress()
    
    def _show_overall_progress(self):
        """Show overall progress across all stages."""
        total_weight = sum(stage['weight'] for stage in self.stages)
        completed_weight = sum(stage['weight'] for stage in self.stages if stage['completed'])
        
        overall_percentage = int((completed_weight / total_weight) * 100)
        completed_stages = sum(1 for stage in self.stages if stage['completed'])
        
        elapsed_time = time.time() - self.overall_start_time
        
        print(f"\n{self.colors.muted(f'Overall Progress: {overall_percentage}% ({completed_stages}/{len(self.stages)} stages) - Elapsed: {elapsed_time:.1f}s')}")
    
    def finish(self):
        """Finish the multi-stage operation."""
        total_time = time.time() - self.overall_start_time
        completed_stages = sum(1 for stage in self.stages if stage['completed'])
        
        print(f"\n{self.colors.success('✓')} Completed {completed_stages}/{len(self.stages)} stages in {total_time:.1f}s")
        
        # Show stage summary
        print(f"\n{self.colors.header('Stage Summary:')}")
        for i, stage in enumerate(self.stages):
            if stage['completed']:
                duration = stage['end_time'] - stage['start_time']
                print(f"  ✓ {stage['name']}: {duration:.1f}s")
            else:
                print(f"  ✗ {stage['name']}: Not completed")


def test_progress():
    """Test progress tracking utilities."""
    print("Testing ProgressTracker with ETA...")
    
    # Test progress tracker with time estimation
    progress = ProgressTracker()
    progress.start("Testing progress with ETA", 20)
    
    for i in range(20):
        time.sleep(0.1)  # Simulate work
        progress.update(1, f"Processing item {i+1}")
    
    progress.finish("All steps completed!")
    
    print("\nTesting DownloadProgress...")
    
    # Test download progress
    download = DownloadProgress()
    total_size = 1024 * 1024 * 10  # 10MB
    download.start_download("Sample download", total_size)
    
    downloaded = 0
    chunk_size = total_size // 50
    
    for i in range(50):
        time.sleep(0.05)  # Simulate download
        downloaded += chunk_size
        download.update_download(downloaded, f"Downloading chunk {i+1}/50")
    
    download.finish("Download completed!")
    
    print("\nTesting MultiStageProgress...")
    
    # Test multi-stage progress
    multi = MultiStageProgress()
    multi.add_stage("Initialization", 5, weight=1.0)
    multi.add_stage("Download", 20, weight=3.0)
    multi.add_stage("Installation", 15, weight=2.0)
    multi.add_stage("Configuration", 5, weight=1.0)
    
    multi.start()
    
    # Stage 1: Initialization
    multi.start_stage()
    for i in range(5):
        time.sleep(0.1)
        multi.update_stage(1, f"Initializing component {i+1}")
    multi.complete_stage("Initialization completed")
    
    # Stage 2: Download
    multi.start_stage()
    for i in range(20):
        time.sleep(0.05)
        multi.update_stage(1, f"Downloading file {i+1}")
    multi.complete_stage("Download completed")
    
    # Stage 3: Installation
    multi.start_stage()
    for i in range(15):
        time.sleep(0.08)
        multi.update_stage(1, f"Installing module {i+1}")
    multi.complete_stage("Installation completed")
    
    # Stage 4: Configuration
    multi.start_stage()
    for i in range(5):
        time.sleep(0.1)
        multi.update_stage(1, f"Configuring setting {i+1}")
    multi.complete_stage("Configuration completed")
    
    multi.finish()
    
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