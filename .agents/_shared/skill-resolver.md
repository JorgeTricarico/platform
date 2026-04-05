# Skill Resolver — Compact Rules Injection Protocol

> Shared protocol for the orchestrator and all pipeline skills.

## Problem

A sub-agent that needs another skill's rules would have to read the full SKILL.md
(several KB). The skill resolver pre-digests relevant rules and injects them as
`## Project Standards (auto-resolved)` — saving ~80% of tokens.

## `compact_rules` Field in Frontmatter

Each skill defines minimal rules in its YAML frontmatter:

```yaml
---
name: my-skill
compact_rules: |
  - Critical rule 1
  - Critical rule 2
  - Max 10 lines
---
```

### Constraints
- Maximum 10 lines per skill
- Maximum 200 characters per line
- Each line starts with `- ` (markdown list)
- Only rules a sub-agent needs to NOT break conventions

## Resolution Algorithm

When the orchestrator delegates to a skill:

```
1. Read compact_rules of the target skill
2. If skill has requires: [A, B], read compact_rules of A and B
3. Deduplicate identical rules
4. Build section:

   ## Project Standards (auto-resolved)

   ### my-skill
   - Rule 1...

   ### other-skill
   - Rule A...

5. Inject section at the start of the sub-agent's prompt
6. Sub-agent reports in its envelope:
   skill_resolution: injected | fallback-registry | none
```

## Fallback

If a skill has no `compact_rules`:
- `fallback-registry` — orchestrator injects the skill's description
- If no info available: `none`
