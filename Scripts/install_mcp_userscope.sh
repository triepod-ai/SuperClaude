#!/usr/bin/env bash
# install_mcp_userscope.sh
# -----------------------------------------------------------------------------
# SuperClaude Framework v3.0 - MCP Server Installation Script
# 
# Registers the MCP servers for SuperClaude Framework into your *user* (global) 
# scope so they are always available in any Claude Code session.
# -----------------------------------------------------------------------------
# Usage:
#   chmod +x install_mcp_userscope.sh
#   ./install_mcp_userscope.sh [--dry-run]
#
# Requirements:
#   • claude CLI must be installed and authenticated.
#   • npx (Node >= 18) available on PATH.
# -----------------------------------------------------------------------------
set -euo pipefail

# ---------------------------------------------------------
# Configuration & Validation
# ---------------------------------------------------------
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  printf "🔍 Dry run mode - no changes will be made\n"
fi

# Validate prerequisites
if ! command -v claude &> /dev/null; then
  printf "❌ Error: claude CLI not found. Please install and authenticate first.\n" >&2
  exit 1
fi

if ! command -v npx &> /dev/null; then
  printf "❌ Error: npx not found. Please install Node.js >= 18.\n" >&2
  exit 1
fi

# Get Magic API key from user input
get_magic_api_key() {
  # Check if Magic server already exists
  if claude mcp list -s user 2>/dev/null | grep -q "^magic\s"; then
    printf "✅ Magic server already installed, skipping API key prompt\n"
    MAGIC_API_KEY=""
    return 0
  fi
  
  if [[ -n "${MAGIC_API_KEY:-}" ]]; then
    printf "✅ Using MAGIC_API_KEY from environment\n"
    return 0
  fi
  
  printf "\n🔑 21st-dev Magic API key required for Magic MCP server.\n"
  printf "You can get your API key from: https://21st.dev\n"
  printf "Enter your Magic API key (or press Enter to skip Magic server): "
  read -r magic_key
  
  if [[ -z "$magic_key" ]]; then
    printf "⚠️  Skipping Magic server (no API key provided)\n"
    MAGIC_API_KEY=""
  else
    MAGIC_API_KEY="$magic_key"
  fi
}

# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------
add_server () {
  local name="$1"; shift
  
  # Check if server already exists
  if claude mcp list -s user 2>/dev/null | grep -q "^$name\s"; then
    printf "⚠️  Server '$name' already exists in user scope, skipping...\n"
    return 0
  fi
  
  printf "\n🔧 Adding MCP server '$name' (user scope)...\n"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    printf "   [DRY RUN] Would execute: claude mcp add '$name' -s user $*\n"
  else
    claude mcp add "$name" -s user "$@"
  fi
}

# ---------------------------------------------------------
# Main Execution
# ---------------------------------------------------------
printf "🚀 SuperClaude MCP Server Registration\n"
printf "=====================================\n"

# Get Magic API key
get_magic_api_key

# ---------------------------------------------------------
# Servers
# ---------------------------------------------------------
printf "\n📦 Registering MCP servers...\n"

# 1. Context 7 — semantic context storage from Upstash
add_server context7 -- npx -y @upstash/context7-mcp@latest

# 2. Magic — 21st-dev AI-native runtime (requires API key)
if [[ -n "$MAGIC_API_KEY" ]]; then
  add_server magic -e API_KEY="$MAGIC_API_KEY" -- npx -y @21st-dev/magic@latest
else
  printf "\n⏭️  Skipping Magic server (no API key provided)\n"
fi

# 3. Sequential Thinking — chain-of-thought analysis tool
add_server sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# 4. Playwright — Microsoft's browser automation and testing framework
add_server playwright -- npx -y playwright-mcp

# 5. Puppeteer — Google's headless Chrome automation
add_server puppeteer -- npx -y @executeautomation/puppeteer-mcp-server

# ---------------------------------------------------------
# Done
# ---------------------------------------------------------
printf "\n✅ MCP server registration complete!\n"
printf "🔍 Verify with: claude mcp list -s user\n"

if [[ "$DRY_RUN" == "true" ]]; then
  printf "\n💡 This was a dry run. Run without --dry-run to apply changes.\n"
fi