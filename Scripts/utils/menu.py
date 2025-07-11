#!/usr/bin/env python3
"""
Interactive menu utility for installation operations.
Provides reusable menu components and user interaction utilities.
"""

import sys
from typing import List, Dict, Any, Optional, Callable, Union
from dataclasses import dataclass
from .colors import Colors


@dataclass
class MenuOption:
    """Represents a menu option."""
    key: str
    title: str
    description: str = ""
    action: Optional[Callable] = None
    enabled: bool = True
    recommended: bool = False


class InteractiveMenu:
    """Interactive menu system for user choices."""
    
    def __init__(self, title: str = "", use_colors: bool = True):
        """Initialize interactive menu.
        
        Args:
            title: Menu title
            use_colors: Whether to use colored output
        """
        self.title = title
        self.colors = Colors() if use_colors else Colors(force_color=False)
        self.options: List[MenuOption] = []
        
    def add_option(self, key: str, title: str, description: str = "", 
                   action: Optional[Callable] = None, enabled: bool = True,
                   recommended: bool = False) -> 'InteractiveMenu':
        """Add a menu option.
        
        Args:
            key: Option key for selection
            title: Option title
            description: Optional description
            action: Optional action function
            enabled: Whether option is enabled
            recommended: Whether option is recommended
            
        Returns:
            Self for method chaining
        """
        option = MenuOption(key, title, description, action, enabled, recommended)
        self.options.append(option)
        return self
    
    def add_separator(self) -> 'InteractiveMenu':
        """Add a visual separator.
        
        Returns:
            Self for method chaining
        """
        option = MenuOption("", "---separator---", "", enabled=False)
        self.options.append(option)
        return self
    
    def show(self, prompt: str = "Select an option") -> Optional[str]:
        """Display menu and get user selection.
        
        Args:
            prompt: Input prompt text
            
        Returns:
            Selected option key or None if cancelled
        """
        while True:
            self._display_menu()
            
            try:
                choice = input(f"\n{prompt}: ").strip().lower()
                
                if not choice:
                    continue
                
                # Check for quit/exit/cancel
                if choice in ['q', 'quit', 'exit', 'cancel']:
                    return None
                
                # Find matching option
                for option in self.options:
                    if option.key.lower() == choice and option.enabled:
                        if option.action:
                            try:
                                result = option.action()
                                if result is not None:
                                    return result
                            except Exception as e:
                                print(f"{self.colors.error('Error:')} {e}")
                                continue
                        return option.key
                
                print(f"{self.colors.error('Invalid choice:')} {choice}")
                
            except KeyboardInterrupt:
                print("\n")
                return None
            except EOFError:
                print("\n")
                return None
    
    def show_multi_select(self, prompt: str = "Select options (space-separated)") -> List[str]:
        """Display menu and get multiple selections.
        
        Args:
            prompt: Input prompt text
            
        Returns:
            List of selected option keys
        """
        while True:
            self._display_menu()
            print(f"\n{self.colors.muted('Enter multiple options separated by spaces')}")
            print(f"{self.colors.muted('Use \"all\" to select all enabled options')}")
            
            try:
                choices = input(f"\n{prompt}: ").strip().lower().split()
                
                if not choices:
                    continue
                
                # Check for quit/exit/cancel
                if any(choice in ['q', 'quit', 'exit', 'cancel'] for choice in choices):
                    return []
                
                # Handle "all" selection
                if "all" in choices:
                    return [opt.key for opt in self.options if opt.enabled and opt.key]
                
                # Validate all choices
                selected = []
                invalid = []
                
                for choice in choices:
                    found = False
                    for option in self.options:
                        if option.key.lower() == choice and option.enabled:
                            if option.key not in selected:  # Avoid duplicates
                                selected.append(option.key)
                            found = True
                            break
                    
                    if not found:
                        invalid.append(choice)
                
                if invalid:
                    print(f"{self.colors.error('Invalid choices:')} {', '.join(invalid)}")
                    continue
                
                return selected
                
            except KeyboardInterrupt:
                print("\n")
                return []
            except EOFError:
                print("\n")
                return []
    
    def _display_menu(self):
        """Display the menu options."""
        # Clear screen (optional)
        # print("\033[2J\033[H")
        
        if self.title:
            print(f"\n{self.colors.header(self.title)}")
            print("=" * len(self.title))
        
        print()
        
        for option in self.options:
            if option.title == "---separator---":
                print(self.colors.muted("  " + "-" * 50))
                continue
            
            if not option.enabled:
                # Disabled option
                print(f"  {self.colors.muted(option.key)}) {self.colors.muted(option.title)}")
                if option.description:
                    print(f"     {self.colors.muted(option.description)}")
            else:
                # Enabled option
                key_text = self.colors.highlight(option.key)
                title_text = option.title
                
                if option.recommended:
                    title_text += f" {self.colors.success('(recommended)')}"
                
                print(f"  {key_text}) {title_text}")
                
                if option.description:
                    print(f"     {self.colors.muted(option.description)}")
        
        print(f"\n  {self.colors.muted('q)')} {self.colors.muted('Quit/Cancel')}")


class ConfirmationDialog:
    """Simple confirmation dialog utility."""
    
    def __init__(self, use_colors: bool = True):
        """Initialize confirmation dialog.
        
        Args:
            use_colors: Whether to use colored output
        """
        self.colors = Colors() if use_colors else Colors(force_color=False)
    
    def confirm(self, message: str, default: bool = True) -> bool:
        """Show confirmation dialog.
        
        Args:
            message: Confirmation message
            default: Default value if user just presses Enter
            
        Returns:
            True if confirmed, False otherwise
        """
        if default:
            prompt = f"{message} [Y/n]: "
        else:
            prompt = f"{message} [y/N]: "
        
        while True:
            try:
                choice = input(prompt).strip().lower()
                
                if not choice:
                    return default
                
                if choice in ['y', 'yes']:
                    return True
                elif choice in ['n', 'no']:
                    return False
                else:
                    print(f"{self.colors.error('Please answer yes or no.')}")
                    
            except KeyboardInterrupt:
                print("\n")
                return False
            except EOFError:
                print("\n")
                return False


class InputValidator:
    """Input validation utilities."""
    
    def __init__(self, use_colors: bool = True):
        """Initialize input validator.
        
        Args:
            use_colors: Whether to use colored output
        """
        self.colors = Colors() if use_colors else Colors(force_color=False)
    
    def get_input(self, prompt: str, validator: Optional[Callable[[str], bool]] = None,
                  error_message: str = "Invalid input", 
                  allow_empty: bool = False) -> Optional[str]:
        """Get validated input from user.
        
        Args:
            prompt: Input prompt
            validator: Validation function
            error_message: Error message for invalid input
            allow_empty: Whether to allow empty input
            
        Returns:
            User input or None if cancelled
        """
        while True:
            try:
                value = input(f"{prompt}: ").strip()
                
                if not value and not allow_empty:
                    print(f"{self.colors.error('Input cannot be empty.')}")
                    continue
                
                if not value and allow_empty:
                    return value
                
                if validator and not validator(value):
                    print(f"{self.colors.error(error_message)}")
                    continue
                
                return value
                
            except KeyboardInterrupt:
                print("\n")
                return None
            except EOFError:
                print("\n")
                return None
    
    def get_choice(self, prompt: str, choices: List[str], 
                   case_sensitive: bool = False) -> Optional[str]:
        """Get a choice from a list of valid options.
        
        Args:
            prompt: Input prompt
            choices: List of valid choices
            case_sensitive: Whether matching is case sensitive
            
        Returns:
            Selected choice or None if cancelled
        """
        choices_display = "/".join(choices)
        full_prompt = f"{prompt} [{choices_display}]"
        
        def validator(value: str) -> bool:
            if case_sensitive:
                return value in choices
            else:
                return value.lower() in [c.lower() for c in choices]
        
        result = self.get_input(full_prompt, validator, 
                              f"Please choose from: {choices_display}")
        
        if result and not case_sensitive:
            # Return the original case choice
            for choice in choices:
                if choice.lower() == result.lower():
                    return choice
        
        return result


def test_menu():
    """Test menu utilities."""
    print("Testing InteractiveMenu...")
    
    # Test basic menu
    menu = InteractiveMenu("Test Menu")
    menu.add_option("1", "Option 1", "First option")
    menu.add_option("2", "Option 2", "Second option", recommended=True)
    menu.add_separator()
    menu.add_option("3", "Option 3", "Third option")
    menu.add_option("4", "Disabled Option", "This is disabled", enabled=False)
    
    choice = menu.show("Choose an option")
    print(f"Selected: {choice}")
    
    # Test multi-select
    multi_choice = menu.show_multi_select("Choose multiple options")
    print(f"Multi-selected: {multi_choice}")
    
    # Test confirmation
    confirm = ConfirmationDialog()
    result = confirm.confirm("Do you want to continue?")
    print(f"Confirmed: {result}")
    
    # Test input validation
    validator = InputValidator()
    name = validator.get_input("Enter your name")
    print(f"Name: {name}")
    
    choice = validator.get_choice("Choose a color", ["red", "green", "blue"])
    print(f"Color: {choice}")


if __name__ == "__main__":
    test_menu()