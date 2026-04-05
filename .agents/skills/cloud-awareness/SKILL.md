---
name: cloud-awareness
description: "Detects if the agent runs locally or in cloud and adjusts behavior. TRIGGER automatically at session start. DO NOT TRIGGER manually."
recommended_model: haiku
compact_rules: |
  - Detect environment: $CI, $CLAUDE_REMOTE, $GITHUB_ACTIONS, TTY, HOME path
  - Cloud: no human gates, push only to feature branches, create issues
  - Local: normal behavior with interactive input
  - Output: ENVIRONMENT + CAPABILITIES + LIMITATIONS
max_output_words: 100
---

# Cloud Awareness — Environment Detection

Automatically detects if the agent runs locally or in the cloud.

## Signals

| Signal | Local | Cloud |
|--------|-------|-------|
| `$CI` or `$GITHUB_ACTIONS` | Undefined | Defined |
| `$CLAUDE_REMOTE` | Undefined | Defined |
| TTY (`test -t 0`) | Yes | No |

## Behavior by Environment

| Capability | Local | Cloud |
|-----------|-------|-------|
| Human gates | Yes | No — decide or create issue |
| Push branches | Any | Feature branches only |
| Max time | No limit | 30 min |
| Communication | Direct chat | PR comment / issue |

## Cloud Rules

1. No gates: make conservative decisions
2. Push only to feature branches, never to main
3. Max 30 min, if unfinished → save progress + create issue
4. Confidence < 80% → issue with diagnosis, do NOT apply fix
