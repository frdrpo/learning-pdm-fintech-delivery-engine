# ADR 0008: GitHub-native delivery telemetry over an external observability tool

- **Status:** Accepted

## Context

Phase 7 gives the delivery engine an observability layer: an audit trail of delivery events and DORA-style telemetry (deployment frequency, lead time for changes, change failure rate, time to recovery). Every delivery event is already natively recorded where it happens — GitHub Deployment API records, releases, merged PRs, and issues. Shipping that data to an external observability/analytics service would add a SaaS dependency, credentials, and drift for a learning reference repo.

## Decision

Compute delivery telemetry from GitHub's own API records and export it as run artifacts:

- `scripts/delivery-telemetry.mjs` reads the Deployments, Releases, Pulls, and Issues REST APIs (no external service, no new secrets).
- It writes a durable audit-trail snapshot (`delivery-audit-<ts>.json`), a machine-readable metrics file (`delivery-telemetry-<ts>.json`), and a human-readable report (`delivery-telemetry-<ts>.md`).
- A new `delivery-telemetry.yml` workflow runs weekly (plus on demand via `workflow_dispatch`) and uploads them as a run artifact, consistent with ADR 0006.
- Metrics that have no matching GitHub-native events yet are marked `insufficient-data` and explained rather than invented — a fresh repo or pure dry-run activity legitimately has none.

## Consequences

- Zero external moving parts: the audit trail is GitHub's own record, queried read-only with the built-in `GITHUB_TOKEN`.
- Telemetry is only as good as the native data: real (`dry_run: false`) deployments and rollback/incident issues populate the metrics; dry-run records are artifacts, not API events, so they do not count.
- The report is a snapshot per run (retention 7 days); long-term trends would need a downstream store, which is deliberately out of scope here.