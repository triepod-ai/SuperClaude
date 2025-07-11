#!/usr/bin/env python3
"""
Colors utility for terminal output formatting.
Provides ANSI color codes for consistent terminal output.
"""

import sys
from typing import Optional


class Colors:
    """Terminal color codes and formatting utilities."""
    
    def __init__(self, force_color: Optional[bool] = None):
        """Initialize Colors utility.
        
        Args:
            force_color: Force color output regardless of terminal detection.
                        None = auto-detect, True = force, False = disable
        """
        if force_color is None:
            # Auto-detect terminal color support
            self.enabled = self._supports_color()
        else:
            self.enabled = force_color
        
        # ANSI color codes
        if self.enabled:
            self.RED = '\033[0;31m'
            self.GREEN = '\033[0;32m'
            self.YELLOW = '\033[1;33m'
            self.BLUE = '\033[0;34m'
            self.MAGENTA = '\033[0;35m'
            self.CYAN = '\033[0;36m'
            self.WHITE = '\033[1;37m'
            self.GRAY = '\033[0;37m'
            
            # Background colors
            self.BG_RED = '\033[41m'
            self.BG_GREEN = '\033[42m'
            self.BG_YELLOW = '\033[43m'
            self.BG_BLUE = '\033[44m'
            
            # Text formatting
            self.BOLD = '\033[1m'
            self.DIM = '\033[2m'
            self.UNDERLINE = '\033[4m'
            self.REVERSE = '\033[7m'
            
            # Reset
            self.NC = '\033[0m'  # No Color / Reset
        else:
            # No color mode - all codes are empty strings
            self.RED = self.GREEN = self.YELLOW = self.BLUE = ''
            self.MAGENTA = self.CYAN = self.WHITE = self.GRAY = ''
            self.BG_RED = self.BG_GREEN = self.BG_YELLOW = self.BG_BLUE = ''
            self.BOLD = self.DIM = self.UNDERLINE = self.REVERSE = ''
            self.NC = ''
    
    def _supports_color(self) -> bool:
        """Detect if terminal supports color output."""
        # Check if stdout is a TTY
        if not hasattr(sys.stdout, 'isatty') or not sys.stdout.isatty():
            return False
        
        # Check environment variables
        import os
        term = os.environ.get('TERM', '')
        if term in ('dumb', ''):
            return False
        
        # Check for common color-supporting terminals
        if any(x in term for x in ['color', 'xterm', 'screen', 'tmux']):
            return True
        
        # Check for Windows terminal color support
        if os.name == 'nt':
            try:
                # Try to enable ANSI color support on Windows
                import ctypes
                kernel32 = ctypes.windll.kernel32
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
                return True
            except:
                return False
        
        return True
    
    def colorize(self, text: str, color_code: str) -> str:
        """Apply color code to text."""
        if not self.enabled:
            return text
        return f"{color_code}{text}{self.NC}"
    
    def red(self, text: str) -> str:
        """Red text."""
        return self.colorize(text, self.RED)
    
    def green(self, text: str) -> str:
        """Green text."""
        return self.colorize(text, self.GREEN)
    
    def yellow(self, text: str) -> str:
        """Yellow text."""
        return self.colorize(text, self.YELLOW)
    
    def blue(self, text: str) -> str:
        """Blue text."""
        return self.colorize(text, self.BLUE)
    
    def magenta(self, text: str) -> str:
        """Magenta text."""
        return self.colorize(text, self.MAGENTA)
    
    def cyan(self, text: str) -> str:
        """Cyan text."""
        return self.colorize(text, self.CYAN)
    
    def white(self, text: str) -> str:
        """White text."""
        return self.colorize(text, self.WHITE)
    
    def gray(self, text: str) -> str:
        """Gray text."""
        return self.colorize(text, self.GRAY)
    
    def bold(self, text: str) -> str:
        """Bold text."""
        return self.colorize(text, self.BOLD)
    
    def dim(self, text: str) -> str:
        """Dim text."""
        return self.colorize(text, self.DIM)
    
    def underline(self, text: str) -> str:
        """Underlined text."""
        return self.colorize(text, self.UNDERLINE)
    
    # Semantic color methods for common use cases
    def error(self, text: str) -> str:
        """Error message (red)."""
        return self.red(text)
    
    def success(self, text: str) -> str:
        """Success message (green)."""
        return self.green(text)
    
    def warning(self, text: str) -> str:
        """Warning message (yellow)."""
        return self.yellow(text)
    
    def info(self, text: str) -> str:
        """Info message (blue)."""
        return self.blue(text)
    
    def header(self, text: str) -> str:
        """Header text (bold blue)."""
        return self.colorize(text, self.BOLD + self.BLUE)
    
    def highlight(self, text: str) -> str:
        """Highlighted text (bold white)."""
        return self.colorize(text, self.BOLD + self.WHITE)
    
    def muted(self, text: str) -> str:
        """Muted text (gray)."""
        return self.gray(text)


# Global instance for convenience
colors = Colors()


def test_colors():
    """Test color output."""
    c = Colors()
    
    print("Color Test:")
    print(c.red("Red text"))
    print(c.green("Green text"))
    print(c.yellow("Yellow text"))
    print(c.blue("Blue text"))
    print(c.magenta("Magenta text"))
    print(c.cyan("Cyan text"))
    print(c.white("White text"))
    print(c.gray("Gray text"))
    print()
    
    print("Semantic Colors:")
    print(c.error("Error message"))
    print(c.success("Success message"))
    print(c.warning("Warning message"))
    print(c.info("Info message"))
    print(c.header("Header text"))
    print(c.highlight("Highlighted text"))
    print(c.muted("Muted text"))
    print()
    
    print("Formatting:")
    print(c.bold("Bold text"))
    print(c.dim("Dim text"))
    print(c.underline("Underlined text"))


if __name__ == "__main__":
    test_colors()