---
name: orchestrator
description: "Multi-phase pipeline orchestrator with sub-agents. TRIGGER when: complex multi-step task, 'pipeline', 'orchestrate this', any task requiring investigate + plan + execute + validate. DO NOT TRIGGER when: simple single-step task, user wants a single skill, direct question with no code work."
recommended_model: opus
compact_rules: |
  - The orchestrator COORDINATES, never executes — delegates to sub-agents
  - Sub-agents receive fresh context via injected compact_rules
  - Return Envelope required: status, summary, artifacts, next_recommended, risks
  - Model routing: search=haiku, execution=sonnet, judgment=opus
  - Parallelize independent phases, serialize only with dependencies
  - Human gates between critical phases (plan→execute)
  - Maximum 2 self-repair iterations before escalating
---

# Orchestrator — Multi-Phase Pipeline with Sub-Agents

The orchestrator coordinates complex end-to-end tasks by delegating each phase
to a specialized sub-agent. It never executes work directly — it controls
transitions, gates and state.

## Principles

1. **The orchestrator COORDINATES, never executes.** Delegates via sub-agents.
2. **Sub-agents receive fresh context.** The orchestrator controls what they see.
3. **Human gates are mandatory.** User approves before critical execution.
4. **Compact rules are injected.** The skill resolver pre-digests relevant rules.

## Architecture

```
                    ┌─────────────────┐
                    │   ORCHESTRATOR  │
                    │     (Opus)      │
                    │                 │
                    │  • Plans        │
                    │  • Delegates    │
                    │  • Synthesizes  │
                    │  • Decides      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼───────┐ ┌───▼────────────┐
     │  INVESTIGATOR  │ │  EXECUTOR  │ │   VALIDATOR    │
     │ (Haiku/Sonnet) │ │  (Sonnet)  │ │ (Sonnet/Opus)  │
     │               │ │            │ │                │
     │ • Reads code  │ │ • Writes   │ │ • Runs tests   │
     │ • Searches    │ │ • Edits    │ │ • Reviews diffs│
     │ • Analyzes    │ │ • Refactors│ │ • Verifies     │
     └───────────────┘ └────────────┘ └────────────────┘
```

## Generic 4-Phase Pipeline

```
PHASE 1: INVESTIGATE (parallel)
  Fast sub-agents map the codebase, search docs, analyze context
  Model: haiku (Explore) for search, sonnet for analysis

PHASE 2: PLAN (serial, orchestrator)
  Synthesize reports → create action plan → present to user
  Model: opus (the orchestrator itself)
  ⛔ GATE: wait for approval before continuing

PHASE 3: EXECUTE (parallel where possible)
  Sub-agents implement independent changes
  Model: sonnet for implementation, opus for architectural changes

PHASE 4: VALIDATE (serial)
  Sub-agent runs tests, lint, build
  Model: sonnet
  If fails → auto-repair (max 2 iterations)
  If passes → completed
```

## Model Routing

| Task | Model | Agent type | Reason |
|------|-------|------------|--------|
| Quick codebase search | haiku | Explore | Fast, cheap |
| Read and summarize code | sonnet | general-purpose | Good balance |
| Architectural analysis | opus | general-purpose | Deep reasoning |
| Write new code | sonnet | general-purpose | Quality/speed |
| Complex refactoring | opus | general-purpose | Architectural judgment |
| Run tests and report | sonnet | general-purpose | Execute and summarize |
| Final review / QA | opus | general-purpose | Critical judgment |

## Delegation Format

```
TASK: [concise description in 1 line]
CONTEXT: [what the agent needs to know]
SCOPE: [clear boundaries — what TO do and NOT to do]
RESPONSE FORMAT:
  - Executive summary (2-3 lines)
  - Detailed findings (with full paths)
  - Problems encountered
  - Recommended next step
CONSTRAINTS:
  - [Research only, do NOT make changes] (for investigators)
  - [Implement the described changes] (for executors)
```

## Orchestration Patterns

### Fan-out / Fan-in
Launch N agents in parallel → receive N reports → synthesize → decide.

### Pipeline with Gates
Phase A → GATE → Phase B → GATE → Phase C.

### Cross-Review
Agent A implements → Agent B reviews (isolated) → Orchestrator decides.
See skill `judgment-day`.

### Isolated Worktree
Use `isolation: "worktree"` for experimental changes or when multiple agents
write to the same files.

## Anti-patterns

- **Mega-agent**: Don't create one agent that does everything
- **Direct reading**: The orchestrator NEVER reads code
- **Unnecessary serialization**: Parallelize independent tasks
- **Vague instructions**: Each sub-agent needs clear context
- **Opus for everything**: Use Haiku/Sonnet for simple tasks
