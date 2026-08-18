# Learning PDM: Delivery Engine — Roadmap (Phases 12–14: Cadence & Adoption)

Status: **complete (2026-08-18)**. Executed on the train-2 calendar. No new mechanisms — this chapter proves the engine operates **at cadence, not just once**, and hardens the reusable copy-kit.

## 1. Purpose

Everything the README promises had been proven *once* (Phases 0–11): mechanisms, a maiden flight, real DORA telemetry, a simulator. What was unproven: **repeat delivery** and **adoption by a different product**. This chapter runs the engine a second time on its own train calendar (train 2), ships a second release, keeps telemetry honest (real-and-explained, never padded), and validates the `docs/engine-copy-kit.md` promise against the actual repo and a fresh-repo rehearsal — feeding any friction back into the kit.

## 2. Current State (as opened, 2026-08-18)

- Phases 0–11 complete; all prior planning issues closed; ROADMAP §13 updated through Phase 11.
- `develop` had accumulated a backlog beyond `main` (last promotion `03ee5dfa` = PR #108): the `feat(ci): milestone-gated, self-contained release-on-tag` work, a `frontend/package.json` version bump, and docs.
- One release existed (`v0.1.0`, 2026-08-17); train calendar (ADR 0009) anchored 2026-08-17: train 2 departs 2026-08-31, cutoff 2026-08-28.
- Copy-kit (`docs/engine-copy-kit.md`) written in P10-T4 but never executed against a consumer.
- Hygiene debt: a junk `v999.0.0` milestone (failed release attempt), two stale local branches, an uncommitted `opencode.json` tweak.

## 3. Goals / Success Metrics

- `main` promoted a second time and a second real release ships (train 2).
- Telemetry reads the new events truthfully; on-time signal **not** inflated — train 2 counts only when a release publishes in its own window.
- Copy-kit survives contact with a fresh consumer; gaps folded back in.
- Hygiene debt cleared; `make lint` green, no drift; no invented metrics (ADR 0008 ethos).

| Metric | At open | After (run 32094905819, 90d) |
|---|---|---|
| Deployment frequency | dev 1.48/wk · staging/prod 0.93/wk · pages 0.78/wk | dev 1.63/wk · staging/prod 1.09/wk · pages 1.63/wk |
| Lead time for changes | median 6m | median 5m (7 PRs) |
| Change failure rate | 1.9% (1/53) | 1.4% (1/70) — real, not padded |
| Time to recovery (proxy) | median 21m | median 2h 21m (1 event) — method explained |
| Train on-time | 100% (1/1) | 100% (1/1); train 2 **pending** — released early in train 1's window, reported honestly |
| `main` parity | behind `develop` | `main` == promoted `develop` content (`155040fc`) |

## 4. Execution Model & Phases

- **P12 — Train 2 Flight (prereq):**
  - T1 Promote `develop`→`main`; T2 verify real `createDeployment` on dev/staging/prod + live `DEPLOY_VERIFY_URL` verify; T3 release `v0.2.0`; T4 `delivery-telemetry` truthing; T5 hygiene (junk milestone, stale branches).
  - *Executed:* T1 = PR #113 (merged `155040fc`); T2 = push run 32094038453 → deployment records dev 5955291487 / staging 5955327441 / prod 5955337894; T3 = `v0.2.0` published 2026-08-18T02:39:39Z (tag `d7ce83fa`, milestone `v0.2.0` closed); T4 = dispatch run 32094905819 (readout above); T5 = `v999.0.0` milestone deleted, `chore/phase10-failure-drill` + `fix/adopt-dependabot-bumps` branches dropped.
  - `opencode.json`: the `default_agent` tweak was not present at close-out time; left as committed upstream.
- **P13 — Copy-Kit Validation (parallel, docs + scratch only):**
  - T1 audit kit steps 0–8 against live config; T2 local rehearsal in a fresh consumer dir; T3 fold findings into the kit.
  - *Executed:* rehearsal copied `.github` + `Makefile` + `scripts` into a scratch consumer; `make lint` green (9 workflows, synced, no drift); `make test-frontend` fails until an app lands in `frontend/` (expected, documented in kit §8); **kit bug found + fixed** — bare `cp Makefile scripts …` errors ("is a directory"), now `cp -R`.
- **P14 — Joint Close-out:**
  - Reconcile (`make sync`/`make lint` clean), restore `main` parity with the close-out docs, update ROADMAP + this plan, close the chapter.
  - *Executed:* this PR carries the doc close-out; a follow-up `develop`→`main` promotion lands it (or `main` was already promoted via #113 and the doc diff rides the next train).

## 5. Guardrails

- Canonical-tree-only workflow edits + `make sync`/`make lint` (no workflow edits were needed this chapter).
- Docs-only changes go through normal PR gates; telemetry honors `insufficient-data` (never invented).
- No new controlled failure drill; CFR/MTTR continue reading native records (real small values, explained).

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Refactor value of "2/2 on-time" evaporates if release lands early | The signal is window-based (`docs/release-train.md`); released early ⇒ counted in train 1, train 2 stays pending and telemetry explains it — no padding |
| Copy-kit is written to *this* repo's specifics | Local rehearsal against a copied engine; findings (cp bug, test-frontend expectation) folded into the kit's known-limits |
| GitHub-side steps can't be rehearsed offline | `make test-gh` etc. documented as GitHub-side; offline checks are `make lint` + `make test-frontend`; remote behavior verified on live PRs instead |

## 7. Definition of Done

- `make lint` green, no drift after every change.
- All affected workflows verified natively (PR gates; `release-pipeline`/`release-on-tag`/`delivery-telemetry` via real triggers).
- Telemetry real-and-explained; no invented values.
- Copy-kit reflects reality; ADR log, ROADMAP, and this plan updated in the same PR as the behavior they describe.