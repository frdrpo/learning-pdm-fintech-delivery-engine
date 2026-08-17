# ADR 0001: Empty-tree base SHA for trufflehog

- **Status:** Accepted

## Context

`compliance-guardrail` runs trufflehog against a diff of the PR (`base` to `head`) so only changed code is scanned for secrets and compliance violations. On PR runs the base is `github.event.pull_request.base.sha`. On non-PR runs (`workflow_dispatch`) there is no PR payload, so `base.sha` is empty and the scan would have no well-defined range.

## Decision

Default the base to the Git empty-tree object SHA:

```yaml
base: ${{ github.event.pull_request.base.sha || '4b825dc642cb6eb9a060e54bf8d69288fbee4904' }}
```

On non-PR runs the scan covers everything since the empty tree — effectively the whole repository.

## Consequences

- Non-PR runs get a deterministic, whole-tree scan instead of a broken or empty diff.
- The magic SHA must stay in sync wherever it is referenced (the workflow and this ADR).
- PR runs are unaffected: the base SHA is always present.
