#!/usr/bin/env python3
"""
Retry mechanism for network operations and other recoverable failures.
Implements exponential backoff and jitter for robust retry logic.
"""

import time
import random
import functools
from typing import Callable, Any, Optional, Tuple, Type, Union, List
from enum import Enum

try:
    from .colors import Colors
    from .progress import SpinnerProgress
except ImportError:
    # Fallback
    class Colors:
        def warning(self, msg): return f"\033[1;33m{msg}\033[0m"
        def info(self, msg): return f"\033[0;34m{msg}\033[0m"
        def error(self, msg): return f"\033[0;31m{msg}\033[0m"
    
    class SpinnerProgress:
        def start(self, msg): print(msg)
        def stop(self, msg=None): 
            if msg: print(msg)


class RetryStrategy(Enum):
    """Retry strategies for different scenarios."""
    EXPONENTIAL = "exponential"  # Exponential backoff
    LINEAR = "linear"            # Linear backoff
    CONSTANT = "constant"        # Constant delay


class RetryConfig:
    """Configuration for retry behavior."""
    
    def __init__(self,
                 max_attempts: int = 3,
                 initial_delay: float = 1.0,
                 max_delay: float = 60.0,
                 exponential_base: float = 2.0,
                 jitter: bool = True,
                 strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
                 exceptions: Tuple[Type[Exception], ...] = (Exception,)):
        """Initialize retry configuration.
        
        Args:
            max_attempts: Maximum number of retry attempts
            initial_delay: Initial delay between retries in seconds
            max_delay: Maximum delay between retries
            exponential_base: Base for exponential backoff
            jitter: Whether to add random jitter to delays
            strategy: Retry strategy to use
            exceptions: Tuple of exceptions to retry on
        """
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.strategy = strategy
        self.exceptions = exceptions


class RetryHandler:
    """Handler for retry operations with various strategies."""
    
    def __init__(self):
        self.colors = Colors()
        self.default_config = RetryConfig()
        
        # Predefined configurations for common scenarios
        self.configs = {
            'network': RetryConfig(
                max_attempts=5,
                initial_delay=2.0,
                max_delay=30.0,
                exponential_base=2.0,
                jitter=True,
                exceptions=(ConnectionError, TimeoutError, OSError)
            ),
            'file_operation': RetryConfig(
                max_attempts=3,
                initial_delay=0.5,
                max_delay=5.0,
                strategy=RetryStrategy.LINEAR,
                exceptions=(IOError, OSError)
            ),
            'validation': RetryConfig(
                max_attempts=2,
                initial_delay=1.0,
                strategy=RetryStrategy.CONSTANT,
                exceptions=(ValueError, AssertionError)
            )
        }
    
    def retry(self,
              func: Callable,
              config: Optional[Union[RetryConfig, str]] = None,
              on_retry: Optional[Callable[[int, Exception], None]] = None,
              show_progress: bool = True) -> Any:
        """Execute a function with retry logic.
        
        Args:
            func: Function to execute
            config: RetryConfig instance or config name
            on_retry: Callback function called on each retry
            show_progress: Whether to show progress spinner
            
        Returns:
            Result of the function
            
        Raises:
            Last exception if all retries fail
        """
        # Get configuration
        if isinstance(config, str):
            config = self.configs.get(config, self.default_config)
        elif config is None:
            config = self.default_config
        
        last_exception = None
        
        for attempt in range(1, config.max_attempts + 1):
            try:
                # Show attempt info
                if attempt > 1:
                    print(f"\n{self.colors.info(f'Retry attempt {attempt}/{config.max_attempts}...')}")
                
                # Execute function
                if show_progress and attempt > 1:
                    spinner = SpinnerProgress()
                    spinner.start("Retrying operation...")
                    try:
                        result = func()
                        spinner.stop()
                        return result
                    finally:
                        spinner.stop()
                else:
                    return func()
                    
            except config.exceptions as e:
                last_exception = e
                
                # Don't retry on last attempt
                if attempt >= config.max_attempts:
                    break
                
                # Calculate delay
                delay = self._calculate_delay(attempt - 1, config)
                
                # Call retry callback if provided
                if on_retry:
                    on_retry(attempt, e)
                
                # Show retry message
                print(f"{self.colors.warning(f'Operation failed: {str(e)}')}")
                print(f"{self.colors.info(f'Waiting {delay:.1f}s before retry...')}")
                
                # Wait before retry
                time.sleep(delay)
        
        # All retries failed
        raise last_exception
    
    def _calculate_delay(self, attempt: int, config: RetryConfig) -> float:
        """Calculate delay for next retry based on strategy."""
        if config.strategy == RetryStrategy.EXPONENTIAL:
            delay = min(config.initial_delay * (config.exponential_base ** attempt), config.max_delay)
        elif config.strategy == RetryStrategy.LINEAR:
            delay = min(config.initial_delay * (attempt + 1), config.max_delay)
        else:  # CONSTANT
            delay = config.initial_delay
        
        # Add jitter if enabled
        if config.jitter:
            jitter_range = delay * 0.3  # 30% jitter
            delay += random.uniform(-jitter_range, jitter_range)
        
        return max(0.1, delay)  # Minimum 0.1s delay
    
    def with_retry(self,
                   config: Optional[Union[RetryConfig, str]] = None,
                   on_retry: Optional[Callable[[int, Exception], None]] = None):
        """Decorator for adding retry logic to functions.
        
        Args:
            config: RetryConfig instance or config name
            on_retry: Callback function called on each retry
            
        Returns:
            Decorated function
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                return self.retry(
                    lambda: func(*args, **kwargs),
                    config=config,
                    on_retry=on_retry
                )
            return wrapper
        return decorator


class NetworkRetry:
    """Specialized retry handler for network operations."""
    
    def __init__(self):
        self.retry_handler = RetryHandler()
        self.colors = Colors()
        
    def download_with_retry(self,
                          download_func: Callable,
                          url: str,
                          max_attempts: int = 5) -> Any:
        """Download with automatic retry and progress.
        
        Args:
            download_func: Function that performs the download
            url: URL being downloaded
            max_attempts: Maximum retry attempts
            
        Returns:
            Download result
        """
        def on_retry(attempt: int, error: Exception):
            print(f"\n{self.colors.warning(f'Download failed (attempt {attempt}): {error}')}")
            print(f"{self.colors.info('Suggestions:')}")
            print("  • Check your internet connection")
            print("  • Verify the URL is accessible")
            print("  • Try using a different network")
        
        config = RetryConfig(
            max_attempts=max_attempts,
            initial_delay=3.0,
            max_delay=30.0,
            jitter=True,
            exceptions=(ConnectionError, TimeoutError, OSError, Exception)
        )
        
        return self.retry_handler.retry(
            download_func,
            config=config,
            on_retry=on_retry
        )
    
    def api_call_with_retry(self,
                          api_func: Callable,
                          endpoint: str,
                          max_attempts: int = 3) -> Any:
        """Make API call with automatic retry.
        
        Args:
            api_func: Function that makes the API call
            endpoint: API endpoint being called
            max_attempts: Maximum retry attempts
            
        Returns:
            API response
        """
        def on_retry(attempt: int, error: Exception):
            if "rate limit" in str(error).lower():
                print(f"\n{self.colors.warning('Rate limit hit, waiting longer...')}")
            else:
                print(f"\n{self.colors.warning(f'API call failed: {error}')}")
        
        # Use longer delays for API calls to respect rate limits
        config = RetryConfig(
            max_attempts=max_attempts,
            initial_delay=5.0,
            max_delay=60.0,
            exponential_base=2.5,
            jitter=True
        )
        
        return self.retry_handler.retry(
            api_func,
            config=config,
            on_retry=on_retry
        )


class FileOperationRetry:
    """Specialized retry handler for file operations."""
    
    def __init__(self):
        self.retry_handler = RetryHandler()
        self.colors = Colors()
    
    def write_with_retry(self,
                        write_func: Callable,
                        file_path: str,
                        max_attempts: int = 3) -> Any:
        """Write file with automatic retry.
        
        Args:
            write_func: Function that performs the write
            file_path: Path to file being written
            max_attempts: Maximum retry attempts
            
        Returns:
            Write result
        """
        def on_retry(attempt: int, error: Exception):
            print(f"\n{self.colors.warning(f'File write failed: {error}')}")
            print(f"{self.colors.info('Attempting to resolve...')}")
            
            # Try to create parent directory
            from pathlib import Path
            try:
                Path(file_path).parent.mkdir(parents=True, exist_ok=True)
                print("  ✓ Created parent directory")
            except:
                pass
        
        config = RetryConfig(
            max_attempts=max_attempts,
            initial_delay=0.5,
            max_delay=2.0,
            strategy=RetryStrategy.LINEAR,
            exceptions=(IOError, OSError, PermissionError)
        )
        
        return self.retry_handler.retry(
            write_func,
            config=config,
            on_retry=on_retry
        )


# Global instances
retry_handler = RetryHandler()
network_retry = NetworkRetry()
file_retry = FileOperationRetry()


# Decorator shortcuts
def with_network_retry(max_attempts: int = 5):
    """Decorator for network operations with retry."""
    return retry_handler.with_retry(config='network')


def with_file_retry(max_attempts: int = 3):
    """Decorator for file operations with retry."""
    return retry_handler.with_retry(config='file_operation')


def with_validation_retry(max_attempts: int = 2):
    """Decorator for validation operations with retry."""
    return retry_handler.with_retry(config='validation')