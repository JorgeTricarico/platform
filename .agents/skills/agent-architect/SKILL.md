---
name: agent-architect
description: "Agent system architect. TRIGGER when: 'improve the skill', 'create a new skill', 'update AGENTS.md', 'change workflows', 'check triggers', modify the agent architecture. DO NOT TRIGGER when: user works on project code, tasks not related to modifying the agent itself."
recommended_model: opus
compact_rules: |
  - AGENTS.md is routing and guardrails — detail goes in skills
  - Every skill description has TRIGGER and DO NOT TRIGGER
  - Disk is the source of truth, not compressed context
  - Skills in _legacy/ don't auto-load
  - compact_rules: max 10 lines, 200 chars/line, starts with "- "
  - IDE adapters live in .agents/ide-adapters/{ide}/adapter.sh
  - setup.sh auto-detects IDEs + stack, creates symlinks per IDE
  - install.sh copies to ~/agents/ for global use across all repos
---

# Agent Architect — Agent System Architecture

Expert in the agent system architecture.

## Directory Structure

```
.agents/                               ← DROP-IN (per project)
├── AGENTS.md                          ← Base instructions (routing + guardrails)
├── setup.sh                           ← Auto-detect stack + IDEs, configure
├── install.sh                         ← Copy to ~/agents/ for global use
├── skills/                            ← Active skills
│   ├── orchestrator/
│   ├── agent-architect/               ← this skill
│   ├── judgment-day/
│   ├── cloud-awareness/
│   ├── engram-memory/
│   ├── code-reviewer/
│   ├── create-skill/
│   └── brainstorming/
├── _shared/                           ← Shared protocols
│   ├── return-envelope.md
│   └── skill-resolver.md
├── ide-adapters/                      ← Per-IDE configuration
│   ├── claude-code/adapter.sh
│   ├── cursor/adapter.sh
│   ├── windsurf/adapter.sh
│   ├── codex/adapter.sh
│   ├── copilot/adapter.sh
│   └── vscode/adapter.sh
├── workflows/
├── templates/
└── project-context.md                 ← Auto-generated (gitignored)

AFTER setup.sh RUNS (symlinks created per detected IDE):
.claude/CLAUDE.md                      → .agents/AGENTS.md
.claude/skills/{each}                  → .agents/skills/{each}
.cursor/rules/agents.md                → .agents/AGENTS.md
.windsurf/rules/agents.md              → .agents/AGENTS.md
.github/copilot-instructions.md        → .agents/AGENTS.md
AGENTS.md (root)                       → .agents/AGENTS.md

GLOBAL INSTALL (~/agents/ via install.sh):
~/agents/                              ← Source of truth
~/agents/link-to-project.sh            ← Quick-add to any repo
~/.claude/CLAUDE.md                    → ~/agents/AGENTS.md
~/.claude/skills/{safe-only}           → ~/agents/skills/{safe-only}
~/.cursor/rules/agents.md              → ~/agents/AGENTS.md
~/.windsurf/rules/agents.md            → ~/agents/AGENTS.md
~/.codex/instructions.md               → ~/agents/AGENTS.md
```

## IDE Adapter System

Each IDE has a dedicated adapter in `.agents/ide-adapters/{ide}/adapter.sh`.
Adapters export two functions:

- `configure_{ide}(project_root, agents_dir)` — project-level config
- `configure_{ide}_global(agents_home)` — global config (~/ level)

### Adding a New IDE Adapter

1. Create `.agents/ide-adapters/{new-ide}/adapter.sh`
2. Implement `configure_{new_ide}()` and `configure_{new_ide}_global()`
3. Add detection logic to `setup.sh` (PHASE 2)
4. Add to the IDE Adapters table in AGENTS.md

## Rules for Editing the Agent

### Edit an existing skill
1. Read from disk first (never trust compressed context)
2. The `description` frontmatter field is the auto-injection contract
3. Every skill must have `TRIGGER when:` and `DO NOT TRIGGER when:`

### Create a new skill
- Use the `create-skill` skill to scaffold
- Naming: kebab-case
- Include frontmatter: `name`, `description` with triggers
- Add to the skills table in AGENTS.md
- Generic skill → `.agents/skills/`
- Project-specific skill → separate, don't mix with kit skills

### Edit AGENTS.md
- Only routing and guardrails — detail goes in skills
- Keep it concise (high token cost)
- Never duplicate content between AGENTS.md and skills

## Frontmatter Spec

```yaml
---
name: kebab-case-name              # Required, matches directory
description: "..."                  # Required, max 1024 chars, TRIGGER/DO NOT TRIGGER
recommended_model: opus|sonnet|haiku # Optional
requires: [other-skill]            # Optional, dependencies
compact_rules: |                   # Optional, for pipeline injection
  - Max 10 lines, 200 chars/line
max_output_words: 300              # Optional, pipeline output limit
---
```

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Edit without reading from disk | Overwrite newer version | Read before Edit |
| Skill without DO NOT TRIGGER | Incorrect auto-injection | Add clause |
| Detail in AGENTS.md | Wasted tokens | Move to skills |
| Skill > 500 lines | Context saturation | Move refs to references/ |
| Symlink whole skills/ dir | Conflicts with project skills | Individual symlinks |
| Global skills with common names | Override project versions | Only safe skills global |
