# ADR 0010: Simulations are labeled artifacts, never native delivery records

- **Status:** Accepted

## Context

The release-train simulator (Phases 11–13) produces what-if outcomes — which features board each train, on-time vs slipped classification, throughput, average delay — both interactively in `frontend/` and headlessly via a `workflow_dispatch` job. `delivery-telemetry` (ADR 0008) computes DORA-style metrics from GitHub-native records only: deployments, releases, merged PRs, and rollback/incident issues. If simulator outputs were recorded through those same surfaces, they would pollute the telemetry with fabricated delivery events — silently turning `insufficient-data` into invented data, which the repo's honesty ethos (ADR 0008) explicitly forbids.

## Decision

Simulation outputs are **labeled artifacts, never GitHub-native delivery records**:

- Every simulation output carries an explicit `kind: "simulation"` marker.
- The headless run writes a clearly-labeled report and uploads it as a run artifact; the job creates no deployments, releases, PRs, or issues.
- Simulated data is never written into the GitHub-native surfaces that `scripts/delivery-telemetry.mjs` reads, so telemetry remains a truthful record of real delivery events.

## Consequences

- `delivery-telemetry` stays honest: `insufficient-data` remains for genuinely unexercised metrics even after simulation runs.
- P13-T3 verifies this by dispatching the simulator and then `delivery-telemetry`, confirming the audit-trail event set is unchanged.
- Simulator reports are reproducible and deterministic (seeded), self-identifying, and downloadable from the run's artifacts for 7 days.
- Any future feature that wants simulated data in a live surface must route it through this labeled-artifact path, never the native delivery APIs.
