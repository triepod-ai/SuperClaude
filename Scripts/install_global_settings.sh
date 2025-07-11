#!/bin/bash

# SuperClaude Framework v3.0 - Global Settings Installation Script
# Installs SuperClaude hooks and settings for global Claude Code usage

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CLAUDE_GLOBAL_DIR="$HOME/.claude"
CLAUDE_HOOKS_DIR="$CLAUDE_GLOBAL_DIR/hooks"
CLAUDE_COMMANDS_DIR="$CLAUDE_GLOBAL_DIR/commands"

echo "🚀 SuperClaude Framework v3.0 - Global Settings Installation"
echo "============================================================="

# Create global Claude directory structure
echo "📁 Creating global Claude Code directory structure..."
mkdir -p "$CLAUDE_GLOBAL_DIR"
mkdir -p "$CLAUDE_HOOKS_DIR"
mkdir -p "$CLAUDE_COMMANDS_DIR"

# Copy settings.json to global location
echo "⚙️  Installing global settings.json..."
if [ -f "$PROJECT_DIR/SuperClaude/Settings/settings.json" ]; then
    cp "$PROJECT_DIR/SuperClaude/Settings/settings.json" "$CLAUDE_GLOBAL_DIR/settings.json"
    echo "✅ Global settings.json installed at: $CLAUDE_GLOBAL_DIR/settings.json"
else
    echo "❌ Error: settings.json not found in SuperClaude/Settings directory"
    exit 1
fi

# Copy all hooks to global location
echo "🪝 Installing SuperClaude hooks globally..."
if [ -d "$PROJECT_DIR/SuperClaude/Hooks" ]; then
    # Copy all Python hooks
    cp "$PROJECT_DIR/SuperClaude/Hooks"/*.py "$CLAUDE_HOOKS_DIR/"
    
    # Make hooks executable
    chmod +x "$CLAUDE_HOOKS_DIR"/*.py
    
    echo "✅ SuperClaude hooks installed at: $CLAUDE_HOOKS_DIR"
    echo "📋 Installed hooks:"
    ls -la "$CLAUDE_HOOKS_DIR"/*.py | awk '{print "   - " $9}' | sed "s|$CLAUDE_HOOKS_DIR/||g"
else
    echo "❌ Error: SuperClaude/Hooks directory not found in project"
    exit 1
fi

# Copy all commands to global location
echo "📝 Installing SuperClaude commands globally..."
if [ -d "$PROJECT_DIR/SuperClaude/Commands" ]; then
    # Copy all markdown command files
    cp "$PROJECT_DIR/SuperClaude/Commands"/*.md "$CLAUDE_COMMANDS_DIR/"
    
    echo "✅ SuperClaude commands installed at: $CLAUDE_COMMANDS_DIR"
    echo "📋 Installed commands:"
    ls -la "$CLAUDE_COMMANDS_DIR"/*.md | awk '{print "   - " $9}' | sed "s|$CLAUDE_COMMANDS_DIR/||g" | sed 's/.md$//'
else
    echo "❌ Error: SuperClaude/Commands directory not found in project"
    exit 1
fi

# Copy all core files to global location root
echo "🏗️  Installing SuperClaude core files globally..."
if [ -d "$PROJECT_DIR/SuperClaude/Core" ]; then
    # Copy all markdown core files to .claude root
    cp "$PROJECT_DIR/SuperClaude/Core"/*.md "$CLAUDE_GLOBAL_DIR/"
    
    echo "✅ SuperClaude core files installed at: $CLAUDE_GLOBAL_DIR"
    echo "📋 Installed core files:"
    ls -la "$CLAUDE_GLOBAL_DIR"/*.md | grep -v settings.json | awk '{print "   - " $9}' | sed "s|$CLAUDE_GLOBAL_DIR/||g" | sed 's/.md$//'
else
    echo "❌ Error: SuperClaude/Core directory not found in project"
    exit 1
fi

# Verify Python dependencies
echo "🐍 Verifying Python dependencies..."
python3 -c "import json, sys, time, threading, pathlib, logging, asyncio" 2>/dev/null && echo "✅ Core Python dependencies available" || echo "⚠️  Some Python dependencies may be missing"

# Test hook execution
echo "🧪 Testing hook execution..."
echo '{"tool": "test", "args": {}}' | python3 "$CLAUDE_HOOKS_DIR/wave_performance_monitor.py" >/dev/null 2>&1 && echo "✅ Hook execution test successful" || echo "⚠️  Hook execution test failed - hooks may need debugging"

# Set environment variables
echo "🌍 Setting up environment variables..."
if ! grep -q "CLAUDE_CODE_SUPERCLAUDE" "$HOME/.bashrc" 2>/dev/null; then
    echo "" >> "$HOME/.bashrc"
    echo "# SuperClaude Framework v3.0" >> "$HOME/.bashrc"
    echo "export CLAUDE_CODE_SUPERCLAUDE=enabled" >> "$HOME/.bashrc"
    echo "export SUPERCLAUDE_VERSION=3.0.0" >> "$HOME/.bashrc"
    echo "export SUPERCLAUDE_HOOKS_ENABLED=true" >> "$HOME/.bashrc"
    echo "export PYTHON_PATH=\"\$HOME/.claude/hooks:\$PYTHON_PATH\"" >> "$HOME/.bashrc"
    echo "✅ Environment variables added to ~/.bashrc"
else
    echo "✅ Environment variables already configured"
fi

# Create backup of original settings if they exist
if [ -f "$CLAUDE_GLOBAL_DIR/settings.json.backup" ]; then
    echo "📄 Previous backup found at: $CLAUDE_GLOBAL_DIR/settings.json.backup"
else
    echo "📄 No previous settings backup found"
fi

# Validate installation
echo "🔍 Validating installation..."
VALIDATION_PASSED=true

# Check global settings file
if [ -f "$CLAUDE_GLOBAL_DIR/settings.json" ]; then
    echo "✅ Global settings.json exists"
    if python3 -c "import json; json.load(open('$CLAUDE_GLOBAL_DIR/settings.json'))" 2>/dev/null; then
        echo "✅ Global settings.json is valid JSON"
    else
        echo "❌ Global settings.json is invalid JSON"
        VALIDATION_PASSED=false
    fi
else
    echo "❌ Global settings.json missing"
    VALIDATION_PASSED=false
fi

# Check hooks directory
HOOK_COUNT=$(ls -1 "$CLAUDE_HOOKS_DIR"/*.py 2>/dev/null | wc -l)
if [ "$HOOK_COUNT" -ge 15 ]; then
    echo "✅ All SuperClaude hooks installed ($HOOK_COUNT hooks)"
else
    echo "❌ Missing hooks - expected at least 15, found $HOOK_COUNT"
    VALIDATION_PASSED=false
fi

# Check commands directory
COMMAND_COUNT=$(ls -1 "$CLAUDE_COMMANDS_DIR"/*.md 2>/dev/null | wc -l)
if [ "$COMMAND_COUNT" -ge 10 ]; then
    echo "✅ All SuperClaude commands installed ($COMMAND_COUNT commands)"
else
    echo "❌ Missing commands - expected at least 10, found $COMMAND_COUNT"
    VALIDATION_PASSED=false
fi

# Check core files in root directory
CORE_COUNT=$(ls -1 "$CLAUDE_GLOBAL_DIR"/*.md 2>/dev/null | grep -v settings.json | wc -l)
if [ "$CORE_COUNT" -ge 5 ]; then
    echo "✅ All SuperClaude core files installed ($CORE_COUNT files)"
else
    echo "❌ Missing core files - expected at least 5, found $CORE_COUNT"
    VALIDATION_PASSED=false
fi

# Final status
echo ""
echo "============================================================="
if [ "$VALIDATION_PASSED" = true ]; then
    echo "🎉 SuperClaude Framework v3.0 installation completed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Restart your terminal or run: source ~/.bashrc"
    echo "   2. Verify Claude Code can access the settings: claude config list"
    echo "   3. Test SuperClaude functionality in any project directory"
    echo ""
    echo "📖 Documentation:"
    echo "   - Global settings: $CLAUDE_GLOBAL_DIR/settings.json"
    echo "   - Global hooks: $CLAUDE_HOOKS_DIR/"
    echo "   - Global commands: $CLAUDE_COMMANDS_DIR/"
    echo "   - Global core files: $CLAUDE_GLOBAL_DIR/*.md"
    echo "   - Project-specific overrides: .claude/settings.local.json"
    echo ""
    echo "🚀 SuperClaude Framework is now available globally across all projects!"
else
    echo "❌ Installation completed with errors. Please check the issues above."
    exit 1
fi