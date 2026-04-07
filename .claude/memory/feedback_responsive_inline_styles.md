---
name: responsive-inline-styles-problem
description: Inline styles on React components override CSS media queries — need min() treatment for modals
type: feedback
---

Modal components in both clients use hardcoded inline width styles (450px, 480px, 420px) that override CSS media queries on mobile.

**Why:** CSS media queries can't override inline styles. The responsive work in session 9 added media queries but didn't fix the inline modal widths.

**How to apply:** When adding responsive CSS or new modals:
1. Use `width: min(450px, 90vw)` instead of fixed pixel widths on modals
2. Review all inline styles for hardcoded widths before calling responsive "done"
3. Test all new UI components at 768px and 375px widths
