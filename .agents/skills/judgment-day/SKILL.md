---
name: judgment-day
description: "Adversarial dual review: 2 blind judges in parallel + fix agent. TRIGGER when: 'review this code', 'judgment day', 'adversarial review', 'double review before merge', large or critical changes. DO NOT TRIGGER when: trivial change (typo, config), user already approved, simple single-reviewer review."
recommended_model: opus
compact_rules: |
  - 2 Sonnet judges in parallel, blind to each other
  - Fix agent (Opus) receives both reviews and applies corrections
  - Maximum 2 re-judgment iterations
  - If both approve → ready for merge
  - Only for large changes — not for hotfixes
max_output_words: 400
---

# Judgment Day — Adversarial Dual Review

Quality gate that eliminates confirmation bias: the agent that writes
the code CANNOT be the one reviewing it. Two fresh judges review in
parallel without seeing each other's review.

## Protocol

```
GENERATED CODE
     │
     ├─→ JUDGE 1 (Sonnet): Compliance review
     │     → Architecture rules, conventions, best practices
     │     → Output: issue list (blocker/warning/info)
     │
     ├─→ JUDGE 2 (Sonnet): Mechanical review
     │     → Linter, type check, tests, anti-patterns
     │     → Output: pass/fail per check + detail
     │
     └─→ MERGE reviews (judges blind to each other)
           │
           ▼
     FIX AGENT (Opus): Receives both, applies corrections
           │
           ▼
     RE-JUDGMENT (max 2 iterations)
           │
           ▼
     Both approve? → Ready for merge
     Max iterations? → BLOCKED → manual intervention
```

## When to Activate

| Situation | Use |
|-----------|:---:|
| New feature | Yes |
| Large refactor | Yes |
| Simple hotfix | No |
| Doc typo | No |
| Already reviewed manually | No |

## Return Envelope

```yaml
# ═══ RETURN ENVELOPE ═══
status: completed | blocked
summary: "..."
artifacts:
  - type: audit-report
    location: "path or description"
next_recommended: "merge" | "human-gate" | null
risks: []
```
