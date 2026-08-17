# ADR 0006: osv-scanner-action resolves under a subdirectory path

- **Status:** Accepted

## Context

The vulnerability scan in `risk-health-check` and `security-rescan` targets `osv-scanner-action`. Referencing it as `osv-scanner-action@v1` fails — no such action short name exists at the top level of the Google OSV repository; the real action lives in the `osv-scanner-action/` subdirectory.

## Decision

Use the full subdirectory path with an explicit pinned version:

```yaml
uses: google/osv-scanner-action/osv-scanner-action@v1.8.5
```

The OSV step is additionally gated by `hashFiles(...)` over common lockfiles and manifests; when none exist the step is skipped (a separate step prints a "skipped" notice). That is expected behavior, not a failure.

## Consequences

- The action resolves and versions correctly across GitHub-native runs.
- Repos without dependency manifests skip the scan by design.
- The pinned version keeps the supply-chain surface explicit; bump deliberately.