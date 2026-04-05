#!/bin/bash
# ================================================================
# IDE Adapter: Cursor
# Configures .cursor/rules/ with agents.md symlink
# Cursor reads markdown rules from .cursor/rules/*.md
# ================================================================

configure_cursor() {
    local project_root="$1"
    local agents_dir="$2"

    info "  Configuring Cursor (.cursor/rules/) ..."

    mkdir -p "$project_root/.cursor/rules"

    # agents.md → .agents/AGENTS.md
    ln -sf "$agents_dir/AGENTS.md" "$project_root/.cursor/rules/agents.md"
    ok "    .cursor/rules/agents.md → .agents/AGENTS.md"

    # Cursor also supports .cursorrules at root (legacy)
    if [ ! -f "$project_root/.cursorrules" ]; then
        ln -sf "$agents_dir/AGENTS.md" "$project_root/.cursorrules"
        ok "    .cursorrules → .agents/AGENTS.md"
    else
        warn "    SKIP .cursorrules (already exists)"
    fi
}

configure_cursor_global() {
    local agents_home="$1"

    info "  Configuring Cursor globally (~/.cursor/rules/) ..."
    mkdir -p "$HOME/.cursor/rules"
    ln -sf "$agents_home/AGENTS.md" "$HOME/.cursor/rules/agents.md"
    ok "    ~/.cursor/rules/agents.md → ~/agents/AGENTS.md"
}
