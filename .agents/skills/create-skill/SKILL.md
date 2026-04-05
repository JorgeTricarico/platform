---
name: create-skill
description: "Scaffolds a new skill with standard structure. TRIGGER when: create a new skill. DO NOT TRIGGER when: editing existing skills."
---

# Create Skill

Generates the canonical structure of a new skill.

## Structure

```
skills/<skill-name>/
├── SKILL.md          ← Instructions with frontmatter
├── references/       ← Extended docs (if SKILL.md > 500 lines)
└── scripts/          ← Executable scripts (optional)
```

## Required Frontmatter

```yaml
---
name: kebab-case-name
description: "Description. TRIGGER when: X. DO NOT TRIGGER when: Y."
recommended_model: opus|sonnet|haiku  # optional
compact_rules: |                       # optional
  - Max 10 lines, 200 chars/line
---
```

## Rules

- `name` must match the directory name
- `description` ALWAYS includes TRIGGER and DO NOT TRIGGER
- If > 500 lines → move extensive content to `references/`
- After creating, add to the skills table in AGENTS.md
- Generic skill → `~/agents/skills/`
- Project-specific skill → `.agents/skills/` in the project
