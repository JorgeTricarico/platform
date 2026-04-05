#!/bin/bash
# ================================================================
# Agent Orchestration Kit — Project Setup
#
# Drop this .agents/ folder into ANY repo and run:
#   bash .agents/setup.sh
#
# What it does:
#   1. Auto-detects your project stack (language, framework, tests)
#   2. Auto-detects which IDEs are installed / configured
#   3. Creates IDE-specific symlinks ONLY for detected IDEs
#   4. Generates .agents/project-context.md with stack info
#   5. Updates .gitignore
#
# Safe: skips existing project-specific skills, backs up files.
# Universal: works with any language, any IDE, any repo.
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

# ---- Resolve paths ----
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$SCRIPT_DIR"  # .agents/ inside the project

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Agent Orchestration Kit — Project Setup        ║"
echo "║   Universal multi-IDE agent orchestration        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
info "Project root: $PROJECT_ROOT"
info "Agents dir:   $AGENTS_DIR"
echo ""

# ================================================================
# PHASE 1: AUTO-DETECT PROJECT STACK
# ================================================================
header "── Phase 1: Detecting project stack ──"

LANG="unknown"
FRAMEWORK="unknown"
PKG_MANAGER="unknown"
TEST_FRAMEWORK="unknown"
MONOREPO="false"

# Language detection
if [ -f "$PROJECT_ROOT/tsconfig.json" ] || [ -f "$PROJECT_ROOT/tsconfig.base.json" ]; then
    LANG="typescript"
elif [ -f "$PROJECT_ROOT/package.json" ]; then
    LANG="javascript"
elif [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/setup.py" ] || [ -f "$PROJECT_ROOT/requirements.txt" ]; then
    LANG="python"
elif [ -f "$PROJECT_ROOT/go.mod" ]; then
    LANG="go"
elif [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
    LANG="rust"
elif [ -f "$PROJECT_ROOT/Gemfile" ]; then
    LANG="ruby"
elif [ -f "$PROJECT_ROOT/build.gradle" ] || [ -f "$PROJECT_ROOT/pom.xml" ]; then
    LANG="java"
elif [ -f "$PROJECT_ROOT/pubspec.yaml" ]; then
    LANG="dart"
elif [ -f "$PROJECT_ROOT/Package.swift" ]; then
    LANG="swift"
elif [ -f "$PROJECT_ROOT/composer.json" ]; then
    LANG="php"
fi
ok "Language: $LANG"

# Package manager detection
if [ -f "$PROJECT_ROOT/bun.lock" ] || [ -f "$PROJECT_ROOT/bun.lockb" ]; then
    PKG_MANAGER="bun"
elif [ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then
    PKG_MANAGER="pnpm"
elif [ -f "$PROJECT_ROOT/yarn.lock" ]; then
    PKG_MANAGER="yarn"
elif [ -f "$PROJECT_ROOT/package-lock.json" ]; then
    PKG_MANAGER="npm"
elif [ -f "$PROJECT_ROOT/Pipfile.lock" ]; then
    PKG_MANAGER="pipenv"
elif [ -f "$PROJECT_ROOT/poetry.lock" ]; then
    PKG_MANAGER="poetry"
elif [ -f "$PROJECT_ROOT/uv.lock" ]; then
    PKG_MANAGER="uv"
elif [ -f "$PROJECT_ROOT/go.sum" ]; then
    PKG_MANAGER="go-modules"
elif [ -f "$PROJECT_ROOT/Cargo.lock" ]; then
    PKG_MANAGER="cargo"
elif [ -f "$PROJECT_ROOT/Gemfile.lock" ]; then
    PKG_MANAGER="bundler"
fi
ok "Package manager: $PKG_MANAGER"

# Framework detection (JS/TS ecosystem)
if [ -f "$PROJECT_ROOT/package.json" ]; then
    PKG_CONTENT=$(cat "$PROJECT_ROOT/package.json" 2>/dev/null || echo "{}")

    if echo "$PKG_CONTENT" | grep -q '"next"'; then
        FRAMEWORK="nextjs"
    elif echo "$PKG_CONTENT" | grep -q '"nuxt"'; then
        FRAMEWORK="nuxt"
    elif echo "$PKG_CONTENT" | grep -q '"@angular/core"'; then
        FRAMEWORK="angular"
    elif echo "$PKG_CONTENT" | grep -q '"svelte"'; then
        FRAMEWORK="svelte"
    elif echo "$PKG_CONTENT" | grep -q '"vue"'; then
        FRAMEWORK="vue"
    elif echo "$PKG_CONTENT" | grep -q '"react"'; then
        FRAMEWORK="react"
    elif echo "$PKG_CONTENT" | grep -q '"express"'; then
        FRAMEWORK="express"
    elif echo "$PKG_CONTENT" | grep -q '"fastify"'; then
        FRAMEWORK="fastify"
    elif echo "$PKG_CONTENT" | grep -q '"hono"'; then
        FRAMEWORK="hono"
    elif echo "$PKG_CONTENT" | grep -q '"@playwright/test"'; then
        FRAMEWORK="playwright"
    elif echo "$PKG_CONTENT" | grep -q '"electron"'; then
        FRAMEWORK="electron"
    fi

    # Test framework detection (JS/TS)
    if echo "$PKG_CONTENT" | grep -q '"@playwright/test"'; then
        TEST_FRAMEWORK="playwright"
    elif echo "$PKG_CONTENT" | grep -q '"vitest"'; then
        TEST_FRAMEWORK="vitest"
    elif echo "$PKG_CONTENT" | grep -q '"jest"'; then
        TEST_FRAMEWORK="jest"
    elif echo "$PKG_CONTENT" | grep -q '"mocha"'; then
        TEST_FRAMEWORK="mocha"
    elif echo "$PKG_CONTENT" | grep -q '"cypress"'; then
        TEST_FRAMEWORK="cypress"
    fi
fi

# Framework detection (Python)
if [ "$LANG" = "python" ]; then
    if [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
        PY_CONTENT=$(cat "$PROJECT_ROOT/pyproject.toml" 2>/dev/null || echo "")
        if echo "$PY_CONTENT" | grep -q 'django'; then
            FRAMEWORK="django"
        elif echo "$PY_CONTENT" | grep -q 'fastapi'; then
            FRAMEWORK="fastapi"
        elif echo "$PY_CONTENT" | grep -q 'flask'; then
            FRAMEWORK="flask"
        fi
        if echo "$PY_CONTENT" | grep -q 'pytest'; then
            TEST_FRAMEWORK="pytest"
        fi
    fi
    [ -d "$PROJECT_ROOT/manage.py" ] || [ -f "$PROJECT_ROOT/manage.py" ] && FRAMEWORK="django"
fi

# Framework detection (Go)
[ "$LANG" = "go" ] && TEST_FRAMEWORK="go-test"

# Framework detection (Rust)
[ "$LANG" = "rust" ] && TEST_FRAMEWORK="cargo-test"

# Framework detection (Ruby)
if [ "$LANG" = "ruby" ]; then
    [ -f "$PROJECT_ROOT/config/routes.rb" ] && FRAMEWORK="rails"
    TEST_FRAMEWORK="rspec"
fi

# Monorepo detection
if [ -f "$PROJECT_ROOT/lerna.json" ] || [ -f "$PROJECT_ROOT/nx.json" ] || [ -f "$PROJECT_ROOT/turbo.json" ] || [ -d "$PROJECT_ROOT/packages" ]; then
    MONOREPO="true"
fi

ok "Framework: $FRAMEWORK"
ok "Test framework: $TEST_FRAMEWORK"
ok "Monorepo: $MONOREPO"

# ================================================================
# PHASE 2: AUTO-DETECT IDEs
# ================================================================
echo ""
header "── Phase 2: Detecting IDEs ──"

DETECTED_IDES=()

# Detect by existing config folders in the project
[ -d "$PROJECT_ROOT/.claude" ] || [ -d "$HOME/.claude" ] && DETECTED_IDES+=("claude-code")
[ -d "$PROJECT_ROOT/.cursor" ] || [ -d "$HOME/.cursor" ] && DETECTED_IDES+=("cursor")
[ -d "$PROJECT_ROOT/.windsurf" ] || [ -d "$HOME/.windsurf" ] && DETECTED_IDES+=("windsurf")
[ -d "$PROJECT_ROOT/.vscode" ] && DETECTED_IDES+=("vscode")
[ -d "$PROJECT_ROOT/.github" ] && DETECTED_IDES+=("copilot")

# Detect by CLI binaries
command -v claude &>/dev/null && [[ ! " ${DETECTED_IDES[*]} " =~ " claude-code " ]] && DETECTED_IDES+=("claude-code")
command -v cursor &>/dev/null && [[ ! " ${DETECTED_IDES[*]} " =~ " cursor " ]] && DETECTED_IDES+=("cursor")
command -v codex &>/dev/null && DETECTED_IDES+=("codex")
command -v code &>/dev/null && [[ ! " ${DETECTED_IDES[*]} " =~ " vscode " ]] && DETECTED_IDES+=("vscode")
command -v windsurf &>/dev/null && [[ ! " ${DETECTED_IDES[*]} " =~ " windsurf " ]] && DETECTED_IDES+=("windsurf")

# Detect by global config directories
[ -d "$HOME/.codex" ] && [[ ! " ${DETECTED_IDES[*]} " =~ " codex " ]] && DETECTED_IDES+=("codex")

# If NO IDE detected, configure ALL (safe default)
if [ ${#DETECTED_IDES[@]} -eq 0 ]; then
    warn "No IDE detected — configuring ALL IDEs (safe default)"
    DETECTED_IDES=("claude-code" "cursor" "windsurf" "codex" "copilot" "vscode")
fi

# Deduplicate
DETECTED_IDES=($(echo "${DETECTED_IDES[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '))

echo ""
for ide in "${DETECTED_IDES[@]}"; do
    ok "Detected: $ide"
done

# ================================================================
# PHASE 3: CONFIGURE DETECTED IDEs
# ================================================================
echo ""
header "── Phase 3: Configuring IDEs ──"

# Source adapter scripts
for ide in "${DETECTED_IDES[@]}"; do
    adapter="$AGENTS_DIR/ide-adapters/$ide/adapter.sh"
    if [ -f "$adapter" ]; then
        source "$adapter"
        case "$ide" in
            claude-code)  configure_claude_code "$PROJECT_ROOT" "$AGENTS_DIR" ;;
            cursor)       configure_cursor "$PROJECT_ROOT" "$AGENTS_DIR" ;;
            windsurf)     configure_windsurf "$PROJECT_ROOT" "$AGENTS_DIR" ;;
            codex)        configure_codex "$PROJECT_ROOT" "$AGENTS_DIR" ;;
            copilot)      configure_copilot "$PROJECT_ROOT" "$AGENTS_DIR" ;;
            vscode)       configure_vscode "$PROJECT_ROOT" "$AGENTS_DIR" ;;
        esac
    else
        warn "No adapter found for $ide — creating AGENTS.md symlink at root"
        if [ ! -f "$PROJECT_ROOT/AGENTS.md" ] || [ -L "$PROJECT_ROOT/AGENTS.md" ]; then
            ln -sf "$AGENTS_DIR/AGENTS.md" "$PROJECT_ROOT/AGENTS.md"
            ok "    AGENTS.md → .agents/AGENTS.md (generic fallback)"
        fi
    fi
done

# ================================================================
# PHASE 4: GENERATE project-context.md
# ================================================================
echo ""
header "── Phase 4: Generating project context ──"

cat > "$AGENTS_DIR/project-context.md" << CTX_EOF
# Project Context (auto-generated by setup.sh)

> Auto-detected on $(date '+%Y-%m-%d %H:%M'). Re-run \`bash .agents/setup.sh\` to update.

## Stack

| Property | Value |
|----------|-------|
| Language | $LANG |
| Framework | $FRAMEWORK |
| Package Manager | $PKG_MANAGER |
| Test Framework | $TEST_FRAMEWORK |
| Monorepo | $MONOREPO |

## Configured IDEs

$(for ide in "${DETECTED_IDES[@]}"; do echo "- $ide"; done)

## Key Paths

| Path | Purpose |
|------|---------|
| \`.agents/AGENTS.md\` | Source of truth for agent instructions |
| \`.agents/skills/\` | Available skills |
| \`.agents/_shared/\` | Shared protocols (return envelope, skill resolver) |
| \`.agents/project-context.md\` | This file (auto-detected stack info) |
CTX_EOF

ok "Generated .agents/project-context.md"

# ================================================================
# PHASE 5: UPDATE .gitignore
# ================================================================
echo ""
header "── Phase 5: Updating .gitignore ──"

GITIGNORE="$PROJECT_ROOT/.gitignore"

add_to_gitignore() {
    local pattern="$1"
    if [ -f "$GITIGNORE" ]; then
        if ! grep -qxF "$pattern" "$GITIGNORE" 2>/dev/null; then
            echo "$pattern" >> "$GITIGNORE"
            ok "Added to .gitignore: $pattern"
        fi
    else
        echo "$pattern" > "$GITIGNORE"
        ok "Created .gitignore with: $pattern"
    fi
}

# Symlinks and generated files should be gitignored
# The .agents/ folder itself CAN be committed (it's the kit)
add_to_gitignore "# Agent Orchestration Kit (symlinks)"
add_to_gitignore ".agents/project-context.md"

# IDE-specific symlinks
for ide in "${DETECTED_IDES[@]}"; do
    case "$ide" in
        cursor)
            add_to_gitignore ".cursorrules"
            ;;
        windsurf)
            add_to_gitignore ".windsurfrules"
            ;;
    esac
done

# ================================================================
# SUMMARY
# ================================================================
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Setup complete                                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Stack:  $LANG / $FRAMEWORK / $PKG_MANAGER / $TEST_FRAMEWORK"
echo ""
echo "  IDEs configured:"
for ide in "${DETECTED_IDES[@]}"; do
    echo "    ✓ $ide"
done
echo ""
echo "  Skills available:"
for skill_dir in "$AGENTS_DIR/skills"/*/; do
    [ -d "$skill_dir" ] || continue
    skill=$(basename "$skill_dir")
    echo "    • $skill"
done
echo ""
echo "  Edit ONCE in .agents/ → reflects in all IDEs."
echo ""
echo "  For global install (all repos): bash .agents/install.sh"
echo ""
