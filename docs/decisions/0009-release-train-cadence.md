# ADR 0009: Fixed-cadence release-train calendar with a native-record on-time signal

- **Status:** Accepted

## Context

The README promises "agile release trains" and the delivery engine now ships real releases (P8: `v0.1.0`). Without an explicit cadence there is no definition of "on time", so "predictable delivery" is unmeasurable. An on-time signal must come from the same GitHub-native records as the other DORA metrics (ADR 0008) and must stay honest: a metric that reports readiness for a train that does not exist yet would be invented data.

## Decision

Define one fixed-cadence release-train calendar and derive an on-time delivery signal purely from native release timestamps:

- **Interval:** one train every `TRAIN_INTERVAL_DAYS` (default 14). Override per run via the telemetry exporter's environment.
- **Anchor:** the earliest release `published_at` inside the measurement window. The calendar cannot meaningfully extend before the first recorded release, so cadence is only measured from that point on.
- **Readiness cutoff:** features must pass the PDM quality gate (`quality-gate`) and compliance guardrail by `departure - 3 days`; no content boards after the cutoff except by a documented slip decision.
- **On-time signal (`release_train_on_time`):** a planned train is "delivered" when at least one release published in its `[departure, departure + interval)` window; the rate is delivered trains over planned trains inside the window. `insufficient-data` is reported (never a fabricated number) when no release exists to anchor against.
- Implemented in `scripts/delivery-telemetry.mjs`, exported in the audit (`release_trains`), the metrics JSON, and the markdown report. Run artifacts only, per ADR 0006.

## Consequences

- "On time" is a cadence-adherence measurement: an interval with no release is a missed train, visible in `missed_train_numbers`.
- The signal is real and explainable from native data; a learning repo with sparse releases reports a small-but-real rate, exactly like the other DORA metrics.
- The calendar is tunable per run (`TRAIN_INTERVAL_DAYS`) without workflow changes — no new secrets, no external service (ADR 0008).
- Train id `1` starts at the first release in the window; ids are not global sequence numbers.