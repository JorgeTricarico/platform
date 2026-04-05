# Return Envelope — Sub-Agent Communication Contract

> Shared protocol for all skills in orchestrated pipelines.

## Schema

Every sub-agent in a pipeline MUST return a Return Envelope when done.
The orchestrator parses this envelope to decide the next phase.

```yaml
# ═══ RETURN ENVELOPE ═══
status: completed | blocked | needs-approval | failed
summary: "1-2 sentences describing what was done"
artifacts:
  - type: code | docs | report | config | plan
    location: "file path or description"
next_recommended: "skill_name" | "human-gate" | null
risks:
  - "Description of detected risk"
blockers: []  # only if status=blocked
skill_resolution: injected | fallback-registry | none
```

## Fields

| Field | Required | Description |
|-------|:--------:|-------------|
| `status` | Yes | Final execution state |
| `summary` | Yes | Executive summary (1-2 sentences) |
| `artifacts` | Yes | List of produced artifacts (can be empty) |
| `next_recommended` | Yes | Next suggested skill or `human-gate` |
| `risks` | No | Risks the orchestrator should consider |
| `blockers` | No | Only when status=blocked |
| `skill_resolution` | No | How compact_rules were resolved |

## Status Values

| Status | Meaning | Orchestrator action |
|--------|---------|---------------------|
| `completed` | Phase finished successfully | Advance to `next_recommended` |
| `needs-approval` | Requires human input | Activate gate, wait for user |
| `blocked` | Cannot continue | Show `blockers`, wait for intervention |
| `failed` | Unrecoverable error | Log, notify, stop pipeline |

## Backwards Compatibility

Skills outside pipelines can ignore the envelope. It's mandatory only when
invoked by the orchestrator. Standalone mode works as normal.
