#!/bin/bash
# TDD Tracker — Claude Code PostToolUse hook
# Tracks when test files are edited to inform the TDD guard
#
# Receives JSON on stdin with: tool_name, tool_input

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only track Edit and Write tools
if [[ "$TOOL" != "Edit" && "$TOOL" != "Write" ]]; then
  exit 0
fi

# Is this a test file?
if [[ "$FILE" == *test* || "$FILE" == *spec* || "$FILE" == *setup.ts ]]; then
  echo "$FILE" > /tmp/.claude-tdd-session
fi

exit 0
