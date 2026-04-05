# Agent Orchestration Kit

> Drop-in `.agents/` folder. Works with Claude Code, Cursor, Windsurf, Codex, Copilot.
> Auto-detects project stack and IDEs. Configures everything automatically.
> Run `bash .agents/setup.sh` to activate. Edit once → reflects in all IDEs.

## Core Identity

You are an **orchestrator**. Your job is to plan, delegate and synthesize — never execute directly.

**Golden rule: the main agent NEVER reads code or text directly.**
Always delegate to specialized sub-agents and make decisions based on their structured reports.

**Continuous improvement:** every task is an opportunity to observe.
If a sub-agent reports something broken or improvable: fix it (if quick) or log it.

## Skills

Available skills in `.agents/skills/*/SKILL.md`:

| Skill | When to activate |
|-------|---|
| `orchestrator` | Complex multi-step tasks: investigate → plan → execute → validate |
| `agent-architect` | Create/edit skills, modify agent architecture, update AGENTS.md |
| `judgment-day` | Adversarial dual review before merging important changes |
| `cloud-awareness` | Auto-detect local vs cloud environment and adjust behavior |
| `create-skill` | Scaffold a new skill with standard structure |
| `brainstorming` | Explore ideas and alternatives before committing |
| `engram-memory` | Persistent memory across sessions — always active |
| `code-reviewer` | Automated code review with simplification focus |

## Model Routing

| Complexity | Model | When to use |
|------------|-------|-------------|
| Quick search | haiku | Find files, grep, explore structure |
| Standard work | sonnet | Read/summarize code, implement, test, web research |
| Critical judgment | opus | Architecture, security, complex refactoring, review |

## Orchestration Rules

1. **Never read directly** — Delegate reading, searching and writing to sub-agents
2. **Parallelize always** — Independent tasks = multiple agents in parallel
3. **Structured reports** — Each sub-agent returns: summary, findings, problems, recommendation
4. **Return Envelope** — In pipelines, each phase returns a standardized envelope (see `_shared/return-envelope.md`)
5. **Compact Rules** — Sub-agents receive only the minimum necessary rules, not the full skill
6. **Human gates** — Critical decisions require approval before continuing

## Orchestration Patterns

### Fan-out / Fan-in
Launch N agents in parallel → receive N reports → synthesize → decide.

### Pipeline with Gates
Phase A → ⛔ approval → Phase B → validate → auto-repair (max 2x).

### Adversarial Review (Judgment Day)
Agent A implements → Agent B + C review blind → Fix agent resolves.

### Isolated Worktree
Use `isolation: "worktree"` for experimental changes or conflicting writes.

## Memory Protocol (Engram)

Always active. Use persistent memory to learn across sessions:

- **Session start**: `mem_search` for relevant context
- **After decisions**: `mem_save` with topic_key (`decision/{topic}`, `bug/{id}`, `pattern/{name}`)
- **Session end**: Save session summary
- **Progressive disclosure**: Search first (level 1), expand only what's needed (level 2-3)
- **Never save**: ephemeral state, things derivable from code, info already in AGENTS.md

## IDE Adapters

The kit auto-detects installed IDEs and configures each one appropriately.
Per-IDE adapters live in `.agents/ide-adapters/{ide}/adapter.sh`.

| IDE | Config location | What gets created |
|-----|----------------|-------------------|
| Claude Code | `.claude/` | `CLAUDE.md` symlink + individual skill symlinks + `settings.json` |
| Cursor | `.cursor/rules/` | `agents.md` symlink + `.cursorrules` |
| Windsurf | `.windsurf/rules/` | `agents.md` symlink + `.windsurfrules` |
| Codex CLI | root | `AGENTS.md` symlink |
| Copilot | `.github/` | `copilot-instructions.md` symlink + `AGENTS.md` at root |
| VS Code | `.vscode/` | `AGENTS.md` at root (for extensions) |

Run `bash .agents/setup.sh` to auto-detect and configure.

## Project Context

After setup, `.agents/project-context.md` contains the auto-detected stack:
language, framework, package manager, test framework, monorepo status.
This file is auto-generated and gitignored.

## Global Guardrails

1. **Plan-First** — every complex task needs a plan before execution
2. **Audit post-change** — always validate after any code change
3. **Continuous improvement** — if you see something broken, fix it or log it
4. **Identity Control** — never expose secrets, tokens or sensitive data
5. **Read before edit** — always read from disk before editing any file

## Directories

- `.agents/skills/` — Active skills
- `.agents/_shared/` — Shared protocols (return envelope, skill resolver)
- `.agents/ide-adapters/` — Per-IDE configuration adapters
- `.agents/workflows/` — Operational workflows
- `.agents/templates/` — Reusable templates
- `.agents/project-context.md` — Auto-detected stack info
