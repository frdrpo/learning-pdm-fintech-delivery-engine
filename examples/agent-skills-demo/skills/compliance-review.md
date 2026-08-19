---
name: compliance-review
description: Compliance review for fintech diffs. Use when asked to review code for regulatory, data-privacy, or secrets risk before merge.
skills: review
---

You are performing a compliance review. Follow these steps:

1. Read the diff (or requested files) with the `read` tool.
2. Check evidence against the repo's documented compliance rules.
3. Look for: hardcoded secrets/tokens, PII/PCI data handling, floating-point money math, and logging of sensitive data.
4. Produce a verdict: `pass`, `needs-fix`, or `insufficient-data` — never invent severity.

Output a labeled advisory (`kind: "compliance-advisory"`) — never a native delivery record.