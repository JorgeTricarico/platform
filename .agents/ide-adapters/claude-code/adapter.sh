#!/bin/bash
# ================================================================
# IDE Adapter: Claude Code
# Configures .claude/ folder with CLAUDE.md + individual skill symlinks
# ================================================================

configure_claude_code() {
    local project_root="$1"
    local agents_dir="$2"

    info "  Configuring Claude Code (.claude/) ..."

    mkdir -p "$project_root/.claude/skills"

    # CLAUDE.md → .agents/AGENTS.md
    ln -sf "$agents_dir/AGENTS.md" "$project_root/.claude/CLAUDE.md"
    ok "    .claude/CLAUDE.md → .agents/AGENTS.md"

    # Individual skill symlinks (skip existing)
    for skill_dir in "$agents_dir/skills"/*/; do
        [ -d "$skill_dir" ] || continue
        local skill=$(basename "$skill_dir")
        if [ -d "$project_root/.claude/skills/$skill" ] && [ ! -L "$project_root/.claude/skills/$skill" ]; then
            warn "    SKIP $skill (project-specific version exists)"
        else
            ln -sf "$agents_dir/skills/$skill" "$project_root/.claude/skills/$skill"
            ok "    .claude/skills/$skill → .agents/skills/$skill"
        fi
    done

    # settings.json with safe permissions
    if [ ! -f "$project_root/.claude/settings.json" ]; then
        cat > "$project_root/.claude/settings.json" << 'SETTINGS_EOF'
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(git *)",
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(pnpm *)",
      "Bash(bun *)",
      "Bash(yarn *)",
      "Bash(pip *)",
      "Bash(python *)",
      "Bash(go *)",
      "Bash(cargo *)",
      "Bash(make *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(find *)",
      "Bash(which *)",
      "Bash(echo *)",
      "Bash(mkdir *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(sudo *)",
      "Bash(curl * | sh)",
      "Bash(wget * | sh)"
    ]
  }
}
SETTINGS_EOF
        ok "    .claude/settings.json (safe defaults)"
    else
        warn "    SKIP settings.json (already exists)"
    fi
}

# Global installation (symlinks to ~/.claude/)
configure_claude_code_global() {
    local agents_home="$1"
    local claude_dir="$HOME/.claude"

    info "  Configuring Claude Code globally (~/.claude/) ..."
    mkdir -p "$claude_dir/skills"

    # CLAUDE.md
    if [ -f "$claude_dir/CLAUDE.md" ] && [ ! -L "$claude_dir/CLAUDE.md" ]; then
        warn "    Backup: CLAUDE.md → CLAUDE.md.backup"
        cp "$claude_dir/CLAUDE.md" "$claude_dir/CLAUDE.md.backup"
    fi
    ln -sf "$agents_home/AGENTS.md" "$claude_dir/CLAUDE.md"
    ok "    ~/.claude/CLAUDE.md → ~/agents/AGENTS.md"

    # Only safe global skills (won't conflict with projects)
    local safe_skills=("orchestrator" "engram-memory" "code-reviewer")
    for skill in "${safe_skills[@]}"; do
        if [ -d "$agents_home/skills/$skill" ]; then
            [ -L "$claude_dir/skills/$skill" ] && rm "$claude_dir/skills/$skill"
            ln -sf "$agents_home/skills/$skill" "$claude_dir/skills/$skill"
            ok "    ~/.claude/skills/$skill (global)"
        fi
    done
}
