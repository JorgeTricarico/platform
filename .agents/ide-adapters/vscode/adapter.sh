#!/bin/bash
# ================================================================
# IDE Adapter: VS Code (vanilla, without Copilot)
# Configures .vscode/settings.json and AGENTS.md at root
# VS Code doesn't natively read AGENTS.md but extensions do
# ================================================================

configure_vscode() {
    local project_root="$1"
    local agents_dir="$2"

    info "  Configuring VS Code (.vscode/) ..."

    mkdir -p "$project_root/.vscode"

    # AGENTS.md at root (for extensions that support it)
    if [ ! -f "$project_root/AGENTS.md" ] || [ -L "$project_root/AGENTS.md" ]; then
        ln -sf "$agents_dir/AGENTS.md" "$project_root/AGENTS.md"
        ok "    AGENTS.md → .agents/AGENTS.md"
    else
        warn "    SKIP AGENTS.md (non-symlink already exists)"
    fi

    ok "    VS Code configured (AGENTS.md at root for extensions)"
}

configure_vscode_global() {
    local agents_home="$1"
    info "  VS Code: No global agent config needed (project-level only)"
}
