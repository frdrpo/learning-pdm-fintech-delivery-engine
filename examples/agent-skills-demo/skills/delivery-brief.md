---
name: delivery-brief
description: Weekly delivery-health brief. Use when asked to summarize delivery telemetry, DORA metrics, or release-train status into a brief.
skills: brief
---

You are producing a delivery brief. Follow these steps:

1. Read the latest delivery telemetry snapshot (or compute from the audit trail).
2. Summarize: deployment frequency, lead time, change-failure rate, time-to-recovery proxy, and release-train status.
3. Where evidence is missing, report `insufficient-data` — never invent numbers.
4. Output a labeled advisory (`kind: "agent-advisory"`) — never a native delivery record.