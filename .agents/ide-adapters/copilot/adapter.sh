#!/bin/bash
# ================================================================
# IDE Adapter: GitHub Copilot (VS Code / JetBrains)
# Configures .github/copilot-instructions.md
# Copilot reads instructions from .github/copilot-instructions.md
# Also supports AGENTS.md at root (Copilot Workspace)
# ================================================================

configure_copilot() {
    local project_root="$1"
    local agents_dir="$2"

    info "  Configuring GitHub Copilot (.github/) ..."

    mkdir -p "$project_root/.github"

    # copilot-instructions.md → .agents/AGENTS.md
    if [ ! -f "$project_root/.github/copilot-instructions.md" ] || [ -L "$project_root/.github/copilot-instructions.md" ]; then
        ln -sf "$agents_dir/AGENTS.md" "$project_root/.github/copilot-instructions.md"
        ok "    .github/copilot-instructions.md → .agents/AGENTS.md"
    else
        warn "    SKIP copilot-instructions.md (non-symlink already exists)"
    fi

    # AGENTS.md at root (for Copilot Workspace)
    if [ ! -f "$project_root/AGENTS.md" ] || [ -L "$project_root/AGENTS.md" ]; then
        ln -sf "$agents_dir/AGENTS.md" "$project_root/AGENTS.md"
        ok "    AGENTS.md → .agents/AGENTS.md"
    else
        warn "    SKIP AGENTS.md (non-symlink already exists)"
    fi
}

configure_copilot_global() {
    local agents_home="$1"

    info "  Configuring Copilot globally (~/.github/) ..."
    mkdir -p "$HOME/.github"
    if [ ! -f "$HOME/.github/copilot-instructions.md" ] || [ -L "$HOME/.github/copilot-instructions.md" ]; then
        ln -sf "$agents_home/AGENTS.md" "$HOME/.github/copilot-instructions.md"
        ok "    ~/.github/copilot-instructions.md → ~/agents/AGENTS.md"
    fi
}
