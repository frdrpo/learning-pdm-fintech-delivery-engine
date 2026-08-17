# ADR 0003: Canonical and mirrored workflow copies

- **Status:** Accepted

## Context

GitHub only executes workflows from `.github/workflows/`. Keeping the workflows there directly made them hard to reason about as a single "engine" deliverable and left no drift detection.

## Decision

Canonical workflow definitions live in `.github/pdm/workflows/` (the source of truth). `make sync` copies them byte-identical into `.github/workflows/`. `make lint` runs actionlint on both trees and fails if the two trees differ.

```
make sync   # cp .github/pdm/workflows/*.yml → .github/workflows/
make lint   # actionlint on both trees + diff -r drift check
```

Edit only `.github/pdm/workflows/` and commit both sides after syncing.

## Consequences

- One source of truth; contributors never edit the execution copies directly.
- Drift is caught by `make lint` before it reaches a PR.
- A forgotten `make sync` fails loudly rather than silently executing stale workflows.
