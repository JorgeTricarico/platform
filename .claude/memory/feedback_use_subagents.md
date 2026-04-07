---
name: use-subagents-aggressively
description: Always delegate file reading and code exploration to sub-agents to preserve context window
type: feedback
---

NEVER read files directly in the main agent. Always delegate to sub-agents for file reading, exploration, and searches.

**Why:** The context window fills up extremely fast when the main agent reads file contents directly. Session 9 ran out of context because of this. The user explicitly asked for more sub-agent usage.

**How to apply:** For every task:
1. Use haiku sub-agents for file reads and searches
2. Use sonnet sub-agents for implementation (edits in worktrees)
3. Main agent only synthesizes reports and makes decisions
4. Parallelize independent sub-agents always
5. Never read more than a few lines directly — delegate full file reads
