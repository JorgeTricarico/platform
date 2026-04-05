---
name: engram-memory
description: "Persistent memory across sessions using Engram MCP. ALWAYS ACTIVE — automatically search memory at session start, save after decisions, bugs, patterns and learnings. DO NOT TRIGGER manually — this runs as a background protocol."
recommended_model: haiku
compact_rules: |
  - Session start: mem_search for relevant context
  - After every decision/bug/pattern: mem_save with topic_key
  - topic_key convention: decision/{topic}, bug/{id}, pattern/{name}, learning/{area}
  - Progressive disclosure: search first, expand only what's needed
  - Never bulk-fetch all observations — read previews first
  - scope: project (default) for technical, personal for user preferences
---

# Engram Memory — Persistent Cross-Session Memory

Engram gives AI agents a brain. Memories persist across sessions in a local
SQLite database (~/.engram/engram.db). No cloud, no external APIs.

## Setup

Install Engram: https://github.com/Gentleman-Programming/engram

```bash
# Install the binary (Go, single file)
go install github.com/Gentleman-Programming/engram@latest

# Or download pre-built binary from releases
# Configure as MCP server in your IDE
```

## Core Protocol

### Session Start
```
1. mem_search("project context") — get overview of what happened before
2. mem_search("{current task topic}") — find relevant memories
3. Only expand (mem_get_observation) if preview isn't enough
```

### During Work
Save immediately after:
- Architectural decisions → `topic_key: "decision/{topic}"`
- Bugs resolved with root cause → `topic_key: "bug/{identifier}"`
- Patterns discovered → `topic_key: "pattern/{name}"`
- Configuration changes → `topic_key: "config/{component}"`
- Non-obvious discoveries → `topic_key: "discovery/{topic}"`
- Lessons learned → `topic_key: "learning/{area}"`
- User preferences → `topic_key: "preference/{topic}"`, `scope: "personal"`

### Session End
```
mem_save(
  topic_key: "session/{date}",
  title: "Session summary {date}",
  content: "What was accomplished, key decisions, next steps"
)
```

## Progressive Disclosure (3 levels)

Don't load everything into context. Use the minimum level needed:

| Level | Tool | Returns | When to use |
|-------|------|---------|-------------|
| 1 — Search | `mem_search` | Title + 300 char preview | **Always start here** |
| 2 — Timeline | `mem_timeline` | Chronological neighbors | If you need temporal context |
| 3 — Full | `mem_get_observation` | Complete content | Only if preview isn't enough |

**NEVER** call `mem_get_observation` on all search results. Read previews first.

## Scopes

| Scope | What to save | Example |
|-------|-------------|---------|
| `project` (default) | Technical decisions, bugs, patterns | "Auth module uses JWT with refresh tokens" |
| `personal` | User preferences, style, feedback | "User prefers short executive summaries" |

## Topic Key Convention

```
decision/{topic}     — architectural decisions
bug/{identifier}     — bugs and their root cause + fix
pattern/{name}       — discovered patterns
learning/{area}      — lessons learned
config/{component}   — configuration changes and why
discovery/{topic}    — non-obvious technical discoveries
session/{date}       — session summaries
preference/{topic}   — user preferences (scope: personal)
pipeline/{target}/{phase} — pipeline artifacts (if using orchestrator)
```

## What NOT to Save

- Things derivable from current code (git log, file structure)
- Ephemeral session state (use task lists instead)
- Information already documented in AGENTS.md or SKILL.md files
- Secrets, tokens, passwords, or sensitive data

## Backup

```bash
engram sync    # exports compressed chunks to .engram/chunks/
```

- `.engram/*.db` — NEVER commit (sensitive + binary)
- `.engram/chunks/` — CAN commit as portable backup
- Verify no tokens/passwords in observations before committing chunks
