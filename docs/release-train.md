# Release Train Calendar

The engine runs a fixed-cadence release train (ADR 0009). This page is the operating reference: what boards each train, when the readiness cutoff hits, and how "on time" is measured.

## Cadence

| Parameter | Value | Notes |
|---|---|---|
| Interval | 14 days | `TRAIN_INTERVAL_DAYS` in `scripts/delivery-telemetry.mjs` (per-run override) |
| Anchor | earliest release `published_at` in the measurement window | cadence is measured from the first recorded release |
| Readiness cutoff | departure − 3 days | features must pass `quality-gate` + `compliance-guardrail` by then |
| Slip policy | carry | unready work carries to the next train; no partial boarding after the cutoff |

## Boarding rules

- A feature boards train *n* if its merged PR passes the quality gate and compliance guardrail before the cutoff, and it is ready per the readiness model (`assessTrainReadiness` in `frontend/src/lib/delivery.ts`).
- A train is deemed **delivered** when at least one release publishes inside its `[departure, departure + interval)` window (native `published_at`, ADR 0008 records).
- A planned train with no release is a **missed/train id `missed_train_numbers`** — it lowers the on-time rate without inventing data.

## On-time signal

The telemetry exporter (`delivery-telemetry.mjs`) emits `release_train_on_time`:

- `status`: `computed` when at least one release anchors the calendar; `insufficient-data` (with an explanation) otherwise.
- `on_time_rate`: delivered trains ÷ planned trains in the window.
- `missed_train_numbers`: planned trains that shipped nothing.

Example readout:

```
### Release train on-time delivery
  - **on-time rate**: 100.0% (1 of 1 planned train shipped; 14-day interval anchored 2026-08-17T10:33:21Z)
```

## Example calendar

| Train | Planned departure | Delivered |
|---|---|---|
| 1 | 2026-08-17 | ✅ (v0.1.0, v0.2.0) |
| 2 | 2026-08-31 | pending (cutoff 2026-08-28) |
| 3 | 2026-09-14 | pending (cutoff 2026-09-11) |
| 4 | 2026-09-28 | pending (cutoff 2026-09-25) |

Cutoff for train 2 is **2026-08-28**; train 3 cutoff **2026-09-11**; train 4 cutoff **2026-09-25**.

> **Note on v0.2.0 (2026-08-18):** `v0.2.0` published 2026-08-18T02:39:39Z — inside **train 1's** window `[08-17, 08-31)`. It therefore counts toward train 1 (already delivered), and does **not** prematurely mark train 2 as shipped. Train 2 is delivered only when a release publishes in its own window `[08-31, 09-14)`. The telemetry on-time signal reports this honestly (`insufficient-data`/pending until then) rather than inflating the rate.

> **Note on v0.3.0 (2026-08-18, early slip release):** `v0.3.0` published 2026-08-18T08:11:32Z — **inside train 1's window** `[08-17, 08-31)`, 13 days before train 2's departure, per owner-directed slip decisions (issues #124/#125). It therefore **does not** count as delivering train 2: the on-time signal stays 1/1 with train 2 pending until a release publishes inside `[08-31, 09-14)`. Reported as it actually occurred — never inflated.