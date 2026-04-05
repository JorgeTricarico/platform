#!/bin/bash
# ================================================================
# Agent Orchestration Kit — Global Installer
#
# Installs the kit to ~/agents/ and configures ALL detected IDEs
# globally. Safe: only symlinks non-conflicting skills.
#
# Usage: bash .agents/install.sh
#   or:  bash install.sh  (if run from inside .agents/)
# ================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; }
header(){ echo -e "${CYAN}${BOLD}$1${NC}"; }

AGENTS_HOME="$HOME/agents"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Agent Orchestration Kit — Global Installer     ║"
echo "║   Installs to ~/agents/ + configures all IDEs    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ================================================================
# STEP 1: Copy to ~/agents/
# ================================================================
header "── Step 1: Installing to ~/agents/ ──"

mkdir -p "$AGENTS_HOME"

# Copy core files
cp "$SCRIPT_DIR/AGENTS.md" "$AGENTS_HOME/"
cp -r "$SCRIPT_DIR/skills" "$AGENTS_HOME/"
cp -r "$SCRIPT_DIR/_shared" "$AGENTS_HOME/"
cp -r "$SCRIPT_DIR/ide-adapters" "$AGENTS_HOME/"
cp -r "$SCRIPT_DIR/workflows" "$AGENTS_HOME/" 2>/dev/null || mkdir -p "$AGENTS_HOME/workflows"
cp -r "$SCRIPT_DIR/templates" "$AGENTS_HOME/" 2>/dev/null || mkdir -p "$AGENTS_HOME/templates"

ok "~/agents/ updated with latest kit"

# ================================================================
# STEP 2: Detect installed IDEs
# ================================================================
echo ""
header "── Step 2: Detecting installed IDEs ──"

DETECTED_IDES=()

# Detect by global config directories
[ -d "$HOME/.claude" ]    && DETECTED_IDES+=("claude-code")
[ -d "$HOME/.cursor" ]    && DETECTED_IDES+=("cursor")
[ -d "$HOME/.windsurf" ]  && DETECTED_IDES+=("windsurf")
[ -d "$HOME/.codex" ]     && DETECTED_IDES+=("codex")

# Detect by CLI binaries
command -v claude &>/dev/null    && [[ ! " ${DETECTED_IDES[*]} " =~ " claude-code " ]] && DETECTED_IDES+=("claude-code")
command -v cursor &>/dev/null    && [[ ! " ${DETECTED_IDES[*]} " =~ " cursor " ]]     && DETECTED_IDES+=("cursor")
command -v codex &>/dev/null     && [[ ! " ${DETECTED_IDES[*]} " =~ " codex " ]]      && DETECTED_IDES+=("codex")
command -v code &>/dev/null      && DETECTED_IDES+=("vscode")
command -v windsurf &>/dev/null  && [[ ! " ${DETECTED_IDES[*]} " =~ " windsurf " ]]   && DETECTED_IDES+=("windsurf")

# GitHub Copilot (check if ~/.github/ exists or gh copilot)
[ -d "$HOME/.github" ] && DETECTED_IDES+=("copilot")
command -v gh &>/dev/null && gh extension list 2>/dev/null | grep -q copilot && [[ ! " ${DETECTED_IDES[*]} " =~ " copilot " ]] && DETECTED_IDES+=("copilot")

# Deduplicate
DETECTED_IDES=($(echo "${DETECTED_IDES[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '))

if [ ${#DETECTED_IDES[@]} -eq 0 ]; then
    warn "No IDE detected — will only install to ~/agents/"
else
    for ide in "${DETECTED_IDES[@]}"; do
        ok "Detected: $ide"
    done
fi

# ================================================================
# STEP 3: Configure each detected IDE globally
# ================================================================
echo ""
header "── Step 3: Configuring IDEs globally ──"

for ide in "${DETECTED_IDES[@]}"; do
    adapter="$AGENTS_HOME/ide-adapters/$ide/adapter.sh"
    if [ -f "$adapter" ]; then
        source "$adapter"
        case "$ide" in
            claude-code)  configure_claude_code_global "$AGENTS_HOME" ;;
            cursor)       configure_cursor_global "$AGENTS_HOME" ;;
            windsurf)     configure_windsurf_global "$AGENTS_HOME" ;;
            codex)        configure_codex_global "$AGENTS_HOME" ;;
            copilot)      configure_copilot_global "$AGENTS_HOME" ;;
            vscode)       configure_vscode_global "$AGENTS_HOME" ;;
        esac
    else
        warn "No adapter for $ide (skipping global config)"
    fi
done

# ================================================================
# STEP 4: Create link-to-project.sh helper
# ================================================================
echo ""
header "── Step 4: Creating project linker helper ──"

cat > "$AGENTS_HOME/link-to-project.sh" << 'HELPER_EOF'
#!/bin/bash
# ================================================================
# Link ~/agents/ into the current project
# Run from any project root: ~/agents/link-to-project.sh
#
# This copies .agents/ into the project and runs setup.sh
# to auto-detect IDEs and create the right symlinks.
# ================================================================
set -e

AGENTS_HOME="$HOME/agents"
PROJECT="$(pwd)"

echo "Linking Agent Orchestration Kit → $PROJECT"
echo ""

# Copy .agents/ into project (if not already there)
if [ -d "$PROJECT/.agents" ]; then
    echo "[WARN] .agents/ already exists in this project"
    echo "       To update: rm -rf .agents/ && ~/agents/link-to-project.sh"
    echo ""
    read -p "Overwrite? (y/N) " -n 1 -r
    echo ""
    [[ ! $REPLY =~ ^[Yy]$ ]] && echo "Aborted." && exit 0
    rm -rf "$PROJECT/.agents"
fi

cp -r "$AGENTS_HOME" "$PROJECT/.agents"
rm -f "$PROJECT/.agents/link-to-project.sh"  # not needed inside project

echo "[OK] Copied .agents/ into project"
echo ""

# Run setup.sh to auto-detect and configure
bash "$PROJECT/.agents/setup.sh"
HELPER_EOF
chmod +x "$AGENTS_HOME/link-to-project.sh"
ok "Helper: ~/agents/link-to-project.sh"

# ================================================================
# STEP 5: Check Engram
# ================================================================
echo ""
header "── Step 5: Optional dependencies ──"

if command -v engram &>/dev/null; then
    ok "Engram detected — persistent memory available"
else
    info "Engram not installed (optional). For persistent memory:"
    info "  https://github.com/Gentleman-Programming/engram"
fi

# ================================================================
# SUMMARY
# ================================================================
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Global installation complete                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  ~/agents/                        Source of truth"
echo ""
echo "  IDEs configured globally:"
for ide in "${DETECTED_IDES[@]}"; do
    echo "    ✓ $ide"
done
echo ""
echo "  Skills (3 safe globals for Claude Code):"
echo "    • orchestrator"
echo "    • engram-memory"
echo "    • code-reviewer"
echo ""
echo "  To add the kit to any project:"
echo "    cd /path/to/project"
echo "    ~/agents/link-to-project.sh"
echo ""
echo "  Edit ONCE in ~/agents/ → reflects everywhere."
echo ""
