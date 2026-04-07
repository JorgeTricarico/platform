#!/bin/bash
# TDD Guard — Claude Code PreToolUse hook
# Intercepts Edit/Write on production files and reminds about test-first
#
# Receives JSON on stdin with: tool_name, tool_input (file_path, etc.)
# Exit 0 = allow, Exit 2 = block with message on stdout

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check Edit and Write tools
if [[ "$TOOL" != "Edit" && "$TOOL" != "Write" ]]; then
  exit 0
fi

# Only check production source files (not tests, not configs)
if [[ -z "$FILE" ]]; then
  exit 0
fi

# Is this a production file? (routes, pages, components, services)
IS_PROD=false
if [[ "$FILE" == */routes/*.ts && "$FILE" != *test* && "$FILE" != *setup* ]]; then
  IS_PROD=true
fi
if [[ "$FILE" == */pages/*.tsx && "$FILE" != *test* ]]; then
  IS_PROD=true
fi
if [[ "$FILE" == */components/*.tsx && "$FILE" != *test* ]]; then
  IS_PROD=true
fi
if [[ "$FILE" == */services/*.ts && "$FILE" != *test* ]]; then
  IS_PROD=true
fi

if [[ "$IS_PROD" != "true" ]]; then
  exit 0
fi

# Check if any test file was edited in recent tool calls (tracked via temp file)
TDD_TRACKER="/tmp/.claude-tdd-tracker-$$"

# If a test file was recently edited, we're in GREEN phase — allow
if [[ -f "/tmp/.claude-tdd-session" ]]; then
  LAST_TEST=$(cat /tmp/.claude-tdd-session)
  AGE=$(( $(date +%s) - $(stat -c %Y /tmp/.claude-tdd-session 2>/dev/null || echo 0) ))
  # If a test was edited in the last 10 minutes, allow production edit
  if [[ $AGE -lt 600 ]]; then
    exit 0
  fi
fi

# No recent test edit — warn about TDD
echo "TDD REMINDER: Estas editando un archivo de produccion ($FILE) sin haber editado un test primero en esta sesion. Secuencia correcta: 1) Escribir/actualizar test (RED) 2) Implementar codigo (GREEN) 3) Correr vitest run (VERIFY)"
exit 0  # Advisory, not blocking (exit 0 allows, just prints warning)
