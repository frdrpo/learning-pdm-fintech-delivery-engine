# Learning PDM: Delivery Engine — Roadmap (Phases 8–10: "What's Next")

Status: **complete (2026-08-18)**. Tracked as GitHub issues `[P8] T8.*`–`[P10] T10.*` with Phase 11 joint landing under `[P11] T11.*`. **Phase 8 complete** — P8-T1 (first real gated promotion `develop` → `main`) merged as PR #84 (merge commit `e94d9ef`); P8-T2 real promotion flight (run 32019424411: dev/staging/prod `createDeployment` on `30f6193`); P8-T3 release `v0.1.0` on `e94d9ef`; P8-T4 baseline DORA readout (run 32022529571, 90d: DF dev 0.62/wk, staging 0.47/wk, prod 0.47/wk; LT median 32m; CFR/MTTR `insufficient-data` until P10-T2); P8-T5 GitHub Pages live verify target live (200 on `/` and `/simulator/`) with `release-pipeline` verify against `DEPLOY_VERIFY_URL` (run 32023618678). **Phase 9 complete** — delivery dashboard route + readiness model + compliance/feature surface (PRs #101/#102), `make test-frontend` green. **Phase 10 complete** — release-train cadence (ADR 0009) + on-time signal, engine summary draft, copy-kit; T10.2 controlled drill executed (CFR 2.3% 1/44, MTTR 1m to rollback, incident #105), PR #103 + drill kit #104. **Phase 11 complete** — reconcile (#107), `main` parity promotion (PR #108 → `03ee5dfa`; native full-suite gate; real deployments dev/staging/prod), combined truthing (run 32087567616: CFR 1.9% 1/53, MTTR proxy 21m, LT 6m, DF dev 1.48/wk/staging+prod 0.93/wk/pages 0.78/wk, on-time 100%), close-out docs (PR #109 + this). See `docs/phases-9-10-parallelization.md` and ROADMAP §13 for the full readout.

## 1. Purpose

**Scope:** What the reference PDM delivery engine must do next to keep being a credible, teachable PDM artifact — not a rebuild or repurpose of the repo. Phases 0–7 built and verified the engine's **mechanisms** (gates, pipeline, telemetry exporter) but almost entirely in **dry-run / synthetic mode**. This chapter proves the engine on **real delivery events**: promote `develop` → `main` for the first time, run the real (non-dry-run) promotion chain with approvals, ship a first release, populate the DORA-style telemetry with real numbers instead of `insufficient-data`, then grow the product surface and the remaining PDM capabilities (release-train cadence, failure/recovery telemetry, reusable template).

This turns the repo from *a harness that demonstrated it could work* into *a delivery engine that demonstrably delivered* — which is what the README's "rescue complex product launches, predictable on-time delivery" promise actually requires, and what keeps `delivery-telemetry` (ADR 0008) honest.

If a different horizon was intended (e.g., pure learning-material expansion, or a fully rebuilt product demo app), the phase set can be re-scoped.

## 2. Current State

Verified 2026-08-17 via working tree, git history, and live GitHub API:

- **7 canonical workflows** in `.github/pdm/workflows/`, byte-identical synced copies in `.github/workflows/`: `risk-health-check`, `compliance-guardrail`, `quality-gate`, `release-pipeline`, `security-rescan`, `release-on-tag`, `delivery-telemetry`. `make lint` (actionlint + drift check) and `make sync` are the enforcement targets.
- **Branch topology:** `develop` is the default branch. `main` contains only the initial commit (`851e708`) — a stub/verification target. Branch protection on `main` requires `PDM Quality Gate (Status Check)`; `develop` is unprotected. All merged work (Phase 0–7, PRs #44–#49) landed on `develop`.
- **GitHub environments:** `development`, `staging`, `production` exist; **`github-pages` also exists** (not documented in the repo — a candidate real deploy target, P8-T5). staging/production carry `required_reviewers` protection (documented; `needs-verification`).
- **Delivery events as of today:** **zero open PRs, zero open issues, zero releases.** Only three PR-side workflows have ever run natively against `main`. The Deployment API has been exercised via `workflow_dispatch` (dry-run-false) per ROADMAP Phase 3 evidence, but no product code sits on `main`. Consequently **every `delivery-telemetry` metric reports `insufficient-data`** by design (ADR 0008).
- **Application stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + Vitest in `frontend/` (pnpm). Surface: landing page (`hero`, `feature-card`) plus a small domain lib (`src/lib/delivery.ts` — gate-readiness model, with tests). `make test-frontend` mirrors the gate suite.
- **Scripts:** `scripts/risk-review.mjs` (AI-assisted diff risk review) and `scripts/delivery-telemetry.mjs` (audit + DORA metrics exporter).
- **Docs:** architecture map, native runbook, agent guide, ADR log (0001–0008), ROADMAP marking Phases 0–7 complete.
- **Known gaps (not currently listed in ROADMAP):** `main` is a stub far behind `develop`; `DEPLOY_VERIFY_URL` is documented but likely never set, so the post-deploy verify step has been skipped in practice (`needs-verification`); no real release exists; CFR/MTTR have never had data; the `github-pages` environment is unclaimed.

## 3. Goals / Non-Goals + Success Metrics

**Goals:**

1. First real delivery flight end-to-end: `main` at parity with `develop`, real promotion through all three environments (staging/production approvals + a real verify step), first tagged release.
2. Truthful delivery telemetry: real deployment frequency and lead time from native records; `insufficient-data` confined to genuinely unexercised metrics (CFR/MTTR until Phase 10).
3. Grow the product surface (`frontend/`) so the gates, OSV path, and AI risk review work on a real, growing application.
4. Extend the PDM surface to release trains and failure/recovery, and leave a reusable template path.
5. Honor repo discipline: canonical-tree-only edits + `make sync`, `insufficient-data` never invented, run artifacts never committed, no secrets.

**Non-goals:** no external observability service (ADR 0008); no `act`/Docker harness (ADR 0005); no new secrets or third-party SaaS; no re-platforming of the frontend stack; no open-ended metric inflation (a learning repo has small event counts — metrics are *real and explained*, not *large*).

**Success metrics (DORA-style, honest for a reference repo):**

| Metric | Current | Target after this chapter |
|---|---|---|
| Deployment frequency | `insufficient-data` (0 real deploys) | Real value per environment, ≥1 real deploy/env in the flight window; telemetry reads them (recorded and explained, not fabricated) |
| Lead time for changes | `insufficient-data` | Real median from the first promotion flights (per `delivery-telemetry.mjs` definition) |
| Change failure rate | `insufficient-data` | Real value after the controlled failure drill (P10-T2), exercised via `rollback_to` + labeled issue |
| Time to recovery (proxy) | `insufficient-data` | Real value from the failure→next-deploy window in P10-T2 |
| Post-deploy verification | skipped (`needs-verification`) | Verify step executes against a live URL on promotion (P8-T5) |
| `main` integration | stub at initial commit | `main` == `develop` content via protected-PR promotion |

## 4. Parallelization Strategy

```
Phase 8 — Maiden Voyage: first real delivery flight (SHARED PREREQ)
   promote main → real promotion → first release → telemetry truthing → live verify target
                 │
     ┌───────────┴────────────┐
     ▼                        ▼
Phase 9                 Phase 10
Product surface         Release train + failure telemetry
(off develop,           + reusable engine template
independent)            (needs P8 baseline: real deploys/release)
```

- **Phase 8 is the shared prerequisite.** All other tracks need a real deployment baseline (`main` with product code, real Deployment API records, one release).
- **Phases 9 and 10 are independent tracks**, each its own branch off `develop` + PR to `main` (via `make test-gh` loop). Phase 10's P10-T2 must land after Phase 8's baseline deployments exist.

## 5. Phases

### Phase 8 — Maiden Voyage: First Real Delivery Flight (shared prereq)

**Goal:** close the loop the engine exists for — real delivery events on GitHub, real telemetry, real verify. Nothing changes the product; it changes what the engine has *actually done*.

- **P8-T1** — Make `main` real: merge `develop` → `main` via PR (branch protection requires the quality gate; the three PR workflows run natively). Confirms a real, gated promotion of the whole product line for the first time. *Gates:* `quality-gate`, `risk-health-check`, `compliance-guardrail`. *Touchpoints:* PR flow (no file edits expected unless gates surface a maintainer's action; docs/ROADMAP.md updated after merge).
- **P8-T2** — Real promotion run: `workflow_dispatch` on `release-pipeline` with `dry_run: false`, full chain `development → staging → production`, approving staging/production reviewers in the run UI. Verify real `createDeployment` records land for all three environments. *Gate:* `release-pipeline`.
- **P8-T3** — First release: push tag `v0.1.0` on `main` → `release-on-tag` builds, generates release notes, creates the GitHub Release. *Gates:* `release-pipeline`, `delivery-telemetry` (release becomes a native record).
- **P8-T4** — Telemetry truthing: `workflow_dispatch` on `delivery-telemetry`; confirm the audit trail now contains the three deployments + the release, and deployment frequency and lead time compute real numbers. Document the baseline DORA readout in the ROADMAP/report. *Gate:* `delivery-telemetry`. *Touchpoints:* docs/ROADMAP.md, docs/local-runbook.md.
- **P8-T5** — Live verify target: publish the frontend build to **GitHub Pages** (the `github-pages` environment already exists) and set `DEPLOY_VERIFY_URL` so `release-pipeline`'s post-deploy verify step curls a live URL instead of skipping. May require a frontend static-export config change. *Gates:* `release-pipeline`, `quality-gate`. *Touchpoints:* `.github/pdm/workflows/` (+ `make sync`), `frontend/`, docs/architecture.md.

**Acceptance:** `main` contains the product line (parity with `develop`); three real Deployment API records exist (`development`/`staging`/`production`); one GitHub Release (`v0.1.0`); `delivery-telemetry` artifact shows real deployment frequency + lead time with `insufficient-data` limited to genuinely absent CFR/MTTR; verify step executed against a live URL on at least one environment; docs updated.

### Phase 9 — Product Surface: Give the Gates a Real Product (independent track)

**Goal:** grow `frontend/` from a landing page into a small fintech product so the gates, OSV scan, AI risk review, and the release build exercise a real, growing application.

- **P9-T1** — New route: a delivery-dashboard page (gates status, release-train summary) built TDD-first with Vitest. *Gates:* `quality-gate`, `risk-health-check`. *Touchpoints:* `frontend/`.
- **P9-T2** — Domain model expansion: extend `src/lib/delivery.ts` (and tests) with a release-train/readiness model that the dashboard consumes. *Gates:* `quality-gate`, `risk-health-check`. *Touchpoints:* `frontend/`.
- **P9-T3** — Surface depth: additional fintech-relevant components/content (e.g., compliance posture, feature status cards) to enlarge the diff the AI risk review scores. *Gate:* `risk-health-check`. *Touchpoints:* `frontend/`.
- **P9-T4** — Native verification: `make test-frontend` green locally, then `make test-gh` (PR to `main`) — confirm all three PR gates pass on the expanded surface and the risk-review reports a live score on the larger diff. *Gates:* `quality-gate`, `risk-health-check`, `compliance-guardrail`.

**Acceptance:** ≥1 new route + domain model with tests; local and native suites green; risk-review produces a non-trivial live score; no workflow drift.

### Phase 10 — Release Train, Failure Telemetry & Reusable Engine (independent track, after P8 baseline)

**Goal:** cover the remaining README promises — "agile release trains" — and give CFR/MTTR real data, then leave a path for adopting this engine in a fresh product.

- **P10-T1** — Release train cadence: document a train calendar (train interval, content, readiness cutoffs) and extend `delivery-telemetry.mjs` with an on-time delivery signal; record the decision as an ADR. *Gate:* `delivery-telemetry`. *Touchpoints:* `docs/decisions/0009-*.md`, `scripts/`, `.github/pdm/workflows/` (+ `make sync`).
- **P10-T2** — Controlled failure & recovery drill: deploy a deliberately introduced regression to a lower environment, exercise `rollback_to`, and file one carefully-*labeled* issue (an explicit `rollback`/`incident` label — `delivery-telemetry.mjs` counts failure events by label, never by title, since feature tasks mention rollback too) so **CFR and the MTTR proxy compute real values** from native records. *Gates:* `release-pipeline`, `delivery-telemetry`.
- **P10-T3** — AI-assisted release notes / PR summaries: extend the release-note generation and risk-report with engine-drafted summaries, keeping the "never invent telemetry" ethos intact (draft ≠ metric). *Gates:* `risk-health-check`, `release-pipeline`.
- **P10-T4** — Reusable engine template: document a copy-kit/bootstrapping path (checklist + scripts usage) so a new product team can adopt this engine without reading every ADR; README/runbook updates. *Touchpoints:* docs/, README.md.

**Acceptance:** release-train concept in docs + ADR and an on-time signal in telemetry; CFR and MTTR computed values in the telemetry report (explained, from a real recorded failure + rollback event); release notes drafted by the engine on the next tag; a documented bootstrap path exists; `make lint` green, no drift, no invented metrics.

## 6. Execution Model

- Every work item is a **branch off `develop` + PR to `main`** (the existing flow; `main` is protected and requires the quality gate — the promotion itself is part of P8-T1).
- Any workflow edit happens **only** in `.github/pdm/workflows/`, followed by `make sync` and `make lint` before committing both trees.
- Frontend changes use **pnpm in `frontend/`** and are validated with `make test-frontend`.
- Native verification: **`make test-gh`** for PR-triggered gates; **`workflow_dispatch`** for `release-pipeline` (dry-run default preserved except the deliberate real flights in P8-T2) and `delivery-telemetry` runs.
- Docs and ADRs updated in the same PR as the behavior they describe.

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `main` protection + approvals stall the first flight | Approve staging/production reviewers during the P8-T2 dispatch; schedule the flight with approvers available; per-environment `environment` input lets us fly one env at a time |
| The first real promotion surprises us (real `createDeployment` vs dry-run habits) | Keep `dry_run: true` as the dispatch default (ADR 0002); only P8-T2 explicitly sets `dry_run: false`; docs label that dispatch as the controlled flight |
| Pages publish needs static export (`next build` emits `.next`, not a static site) | P8-T5 may require `output: 'export'` or equivalent in `frontend/`; verify the `github-pages` environment actually has a Pages site enabled before wiring `DEPLOY_VERIFY_URL` |
| CFR/MTTR walk back to `insufficient-data` (no recorded failure) | P10-T2 deliberately creates one controlled failure on a lower env with a taxonomy-correct issue title, then a recovery deploy |
| Failure-drill issue title pollutes change-failure metrics | Failure events are counted by a dedicated `rollback`/`incident` label, not title text — feature tasks mentioning rollback can't count; the drill's labeled issue (P10-T2) intentionally does |
| Telemetry stays `insufficient-data` because events are sparse in a learning repo | Metrics are *real and explained*, never padded; ROADMAP documents why `insufficient-data` remains for any unexercised metric |
| Docs drift as workflows change | Same-PR doc updates (architecture map, runbook, ADR log) per the repo's Definition of Done |

## 8. Definition of Done (per phase, repo canon)

- `make lint` green (no drift) after every workflow change; `make sync` run and both trees committed together.
- All affected workflows verified natively on GitHub (PR gates via `make test-gh`; `release-pipeline` and `delivery-telemetry` via `workflow_dispatch`).
- New/changed workflows: canonical + synced copies; comment-guard on PRs and artifact-upload path for non-PR events; run artifacts never committed.
- Telemetry honors the ethos: `insufficient-data` reported and explained, never invented.
- No secrets committed; no run artifacts (reports, deployment records, releases) in git.
- Docs (`docs/architecture.md`, `docs/local-runbook.md`, `docs/agents-guide.md`, ADR log, ROADMAP) updated to match everything merged.
- Phases are marked complete only after their native runs were actually executed — anything not yet re-verified in the latest state carries `needs-verification`.