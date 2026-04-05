#!/bin/bash
# ================================================================
# IDE Adapter: OpenAI Codex CLI
# Configures AGENTS.md at project root (Codex reads root AGENTS.md)
# Also supports ~/.codex/instructions.md for global config
# ================================================================

configure_codex() {
    local project_root="$1"
    local agents_dir="$2"

    info "  Configuring Codex CLI (AGENTS.md at root) ..."

    # Codex reads AGENTS.md at the root of the project
    if [ ! -f "$project_root/AGENTS.md" ] || [ -L "$project_root/AGENTS.md" ]; then
        ln -sf "$agents_dir/AGENTS.md" "$project_root/AGENTS.md"
        ok "    AGENTS.md → .agents/AGENTS.md"
    else
        warn "    SKIP AGENTS.md (non-symlink already exists)"
    fi
}

configure_codex_global() {
    local agents_home="$1"

    info "  Configuring Codex CLI globally (~/.codex/) ..."
    mkdir -p "$HOME/.codex"
    ln -sf "$agents_home/AGENTS.md" "$HOME/.codex/instructions.md"
    ok "    ~/.codex/instructions.md → ~/agents/AGENTS.md"
}
