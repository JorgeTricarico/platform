#!/bin/bash
# ================================================================
# IDE Adapter: Windsurf (Codeium)
# Configures .windsurf/rules/ with agents.md symlink
# Windsurf reads rules from .windsurf/rules/*.md and .windsurfrules
# ================================================================

configure_windsurf() {
    local project_root="$1"
    local agents_dir="$2"

    info "  Configuring Windsurf (.windsurf/rules/) ..."

    mkdir -p "$project_root/.windsurf/rules"

    # agents.md → .agents/AGENTS.md
    ln -sf "$agents_dir/AGENTS.md" "$project_root/.windsurf/rules/agents.md"
    ok "    .windsurf/rules/agents.md → .agents/AGENTS.md"

    # Windsurf also supports .windsurfrules at root
    if [ ! -f "$project_root/.windsurfrules" ]; then
        ln -sf "$agents_dir/AGENTS.md" "$project_root/.windsurfrules"
        ok "    .windsurfrules → .agents/AGENTS.md"
    else
        warn "    SKIP .windsurfrules (already exists)"
    fi
}

configure_windsurf_global() {
    local agents_home="$1"

    info "  Configuring Windsurf globally (~/.windsurf/rules/) ..."
    mkdir -p "$HOME/.windsurf/rules"
    ln -sf "$agents_home/AGENTS.md" "$HOME/.windsurf/rules/agents.md"
    ok "    ~/.windsurf/rules/agents.md → ~/agents/AGENTS.md"
}
