# Learning PDM: Delivery Engine — Roadmap (Phases 11–13: Release Train Simulator)

Status: **complete (2026-08-18)**. All three phases merged (PRs #69–#75 + close-out); tracked as GitHub issues `[P11] T11.*`–`[P13] T13.*`. See `docs/ROADMAP.md` §12 for the delivery readout.

## 1. Purpose

Turn this reference repo into a place that **demonstrates the release-train promise it advertises** — not just by documenting cadence (P10-T1) but by letting anyone *model* it: the repo's application surface grows a deterministic, TDD'd release-train simulation that produces what-if outcomes (which features make each train, on-time vs slipped, throughput), rendered interactively in `frontend/` and runnable headlessly as a clearly-labeled report artifact. This keeps the repo a teachable PDM artifact, gives the quality gate / risk review / release build real work on a growing application, and does it without ever polluting the delivery telemetry that Phase 7 made honest.

The **hard constraint** throughout: simulated outputs are self-identifying (`kind: "simulation"`) and **never** merged into GitHub-native delivery records. `scripts/delivery-telemetry.mjs` reads native records only (ADR 0008), so a simulator must not create deployments/releases/issues/PRs. A simulator that fabricated native-looking delivery events to populate DORA metrics would violate ADR 0008 and the repo's honesty ethos — explicitly out of scope.

**Folded prerequisite (ADR hygiene):** this chapter also renumbers the ADR decision log into decision order (Option B, full reorder) so ADR 0009+ land on a coherent index. That is a docs-only change, done first, and is the subject of the `[P11] ADR-*` issues.

## 2. Current State

Verified 2026-08-17 via working tree, git history, and live GitHub API:

- **7 canonical workflows** in `.github/pdm/workflows/`, byte-identical synced copies in `.github/workflows/`: `risk-health-check`, `compliance-guardrail`, `quality-gate`, `release-pipeline`, `security-rescan`, `release-on-tag`, `delivery-telemetry`. `make lint` (actionlint + drift check) and `make sync` are the enforcement targets.
- **Branch topology:** `develop` is the default branch and carries all Phase 0–7 work; `main` is a stub at the initial commit (`851e708`). Branch protection on `main` requires `PDM Quality Gate (Status Check)`; `develop` is unprotected.
- **Telemetry state:** `scripts/delivery-telemetry.mjs` (ADR 0008) reads GitHub-native records only; because delivery so far has been dry-run/artifacts, DORA metrics legitimately report `insufficient-data`. This is by design and the honesty bar this chapter must not break.
- **Application stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + Vitest in `frontend/` (pnpm). Surface today: landing page (`hero`, `feature-card`) plus a small domain lib (`src/lib/delivery.ts` — 4-gate readiness model, with tests). No routes beyond the landing page yet.
- **Scripts:** `scripts/risk-review.mjs` (AI diff risk review) and `scripts/delivery-telemetry.mjs` (audit + DORA exporter) — the established pattern for workflow-hosted Node helpers.
- **Docs:** architecture map, native runbook, agent guide, ADR log (0001–0008, **renumbered into decision order by this chapter's prerequisite**), ROADMAP marking Phases 0–7 complete.
- **In-flight planning:** `docs/plans/roadmap-phase-8-10-maiden-voyage.md` scopes P8–P10 including release-train cadence documentation (P10-T1, ADR 0009) and a delivery-dashboard route (P9-T1). This simulator chapter is **independent** of those tracks; it reserves **ADR 0010** for the simulator-boundary decision (0009 belongs to P10-T1).

## 3. Goals / Non-Goals + Success Metrics

**Goals:**

1. A deterministic, TDD'd release-train simulation model as the shared core — inputs (interval, capacity, backlog readiness, gate pass-rate, slip policy, seed) → outcomes (per-train boarding, on-time/slipped classification, throughput, on-time rate, average delay).
2. An interactive simulator surface in `frontend/` (new route) rendering the model's outputs, self-labeled as simulation.
3. A headless run mode (script + `workflow_dispatch`) producing a clearly-labeled simulation report artifact — with **zero** GitHub-native delivery records created, so `delivery-telemetry` stays truthful.
4. Docs + ADR 0010 recording the decision: simulations are labeled artifacts, never native records.
5. Repo discipline honored throughout: canonical-tree-only workflow edits + `make sync`/`make lint`; `insufficient-data` never invented; no run artifacts committed; no new secrets.
6. ADR log hygiene: the decision log renumbered into decision order with zero forward references before any ADR 0009+ land.

**Non-goals:** no fabrication of native delivery events (no simulated deployments/releases/issues/PRs); no external observability service (ADR 0008); no `act`/Docker harness (ADR 0005); no re-platforming of the frontend stack; no change to the P8–P10 plans (independent tracks); no new scheduled workflows (dispatch-only to keep noise down).

**Success metrics (honest for a reference repo):**

| Metric | Baseline (now) | Target after this chapter |
|---|---|---|
| Delivery telemetry truthfulness | DORA metrics `insufficient-data` (no real events) | **Unchanged** — simulator runs must not add any native records; verified by diffing the telemetry audit-trail event set before/after a simulator run |
| Simulator determinism | n/a (does not exist) | Same seed + config → identical outcome set across runs (TDD-verified) |
| Model test coverage | n/a | Unit tests cover every documented model behavior: determinism, capacity limits, slip handling, on-time/slipped classification, simulated self-labeling |
| Gate health | PR gates green on existing surface | All three PR gates green on the expanded surface (interactive route + model); risk-review reports a live score on the larger diff |
| Workflow hygiene | `make lint` green, no drift | `make lint` green, no drift after the new canonical workflow + synced copy |
| ADR log integrity | 8 records, write-ordered, 1 forward reference | 8 records, **decision-ordered, gap-free 0001–0008**, zero forward references |
| Surface | 1 landing route | Landing + `/simulator` route reachable from navigation |

## 4. Parallelization Strategy

```
ADR hygiene (folded prerequisite, docs-only, SINGLE PR)
   renumber log into decision order before any ADR 0009+
                       │
Phase 11 — Simulation model (SHARED PREREQ, off develop)
   deterministic engine + tests + self-labeling contract
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
Phase 12                       Phase 13
Interactive surface            Headless run mode + telemetry-honesty
(frontend/ route)              (script + workflow_dispatch job + ADR 0010)
```

- **ADR hygiene is the folded prerequisite** — done first, docs-only, single PR; the simulator issues build on a clean index.
- **Phase 11 is the shared prerequisite.** Both later tracks consume the model; nothing ships before the deterministic core is TDD-verified.
- **Phases 12 and 13 are independent tracks**, each its own branch off `develop` + PR to `main` via the `make test-gh` loop. Phase 13's telemetry-honesty verification (P13-T3) needs Phase 12's `main` merge only loosely (both must be on `main` for the pre/post telemetry diff to be meaningful).
- The existing P8–P10 plans run in parallel with this chapter (no shared files beyond `docs/`; merge conflicts there are trivial).

## 5. Phases

### ADR Hygiene (folded prerequisite, docs-only)

**Goal:** make the ADR decision log a trustworthy, correctly-sequenced record before further decisions land. The log (0001–0008) has a forward-reference defect: the old 0004 (run-artifact persistence) referenced the old 0007 (GitHub-native over act), even though GitHub-native is what *caused* artifact persistence. Full reorder into decision order, fixing every cross-reference to point backward. No workflow, frontend, or script files change.

- **ADR-1** — Full reorder mapping (Option B): canonical-and-mirror copies → dry-run default → empty-tree base SHA → osv-scanner subdir path → GitHub-native over act → run-artifact persistence → comment-guard → delivery telemetry. `git mv` via temp names to avoid prefix collisions; update each `# ADR NNNN:` title line. *Gates:* `quality-gate`, `risk-health-check`, `compliance-guardrail`. *Touchpoints:* `docs/decisions/`.
- **ADR-2** — Reword the two cyclic numeric cites so every cross-reference points backward (github-native's cites of the artifact/comment-guard ADRs, and run-artifact's cite of comment-guard, become textual references); rewrite the `docs/decisions/README.md` index. *Gates:* as above. *Touchpoints:* `docs/decisions/`.
- **ADR-3** — Fix dependent references repo-wide: `docs/ROADMAP.md` T5.4 range → `0001–0008`; `docs/plans/roadmap-phase-8-10-maiden-voyage.md` ADR 0007 → 0005; full-repo grep confirms zero stale numbers and zero forward references. *Gates:* as above. *Touchpoints:* `docs/ROADMAP.md`, `docs/plans/`.
- **ADR-4** — Native verification: `make test-gh` (branch off `develop` → PR to `main`), all three PR gates green; docs-only diff confirmed. *Gates:* `quality-gate`, `risk-health-check`, `compliance-guardrail`.

**Acceptance:** 8 records numbered `0001`–`0008` in decision order, slugs intact, zero forward references; README index matches disk; repo-wide grep clean; `ROADMAP.md` range `0001–0008`; no workflow/frontend/script files changed; `make test-gh` PR gates green.

### Phase 11 — Release Train Simulator: Model & Core (shared prerequisite)

**Goal:** a deterministic, test-first release-train simulation model that is the single source of truth for everything in this chapter, with outputs that can never be mistaken for real delivery records.

- **P11-T1** — Define the simulation contract at product level: train configuration inputs (interval, capacity, feature backlog with readiness profile, gate pass-rate, slip policy, seed) and outcome set (per-train boarding, on-time/slipped classification, throughput, on-time rate, average delay); document the behavior spec alongside the model. *Gates:* `quality-gate`, `risk-health-check`. *Touchpoints:* `frontend/`.
- **P11-T2** — Land the deterministic engine in the frontend domain layer (`frontend/src/lib/`) with unit tests covering every documented behavior (determinism from a seed, capacity limits, slip handling, on-time/slipped classification). Every output carries an explicit `kind: "simulation"` marker and the model never writes to GitHub-native surfaces. *Gates:* `quality-gate`, `risk-health-check`. *Touchpoints:* `frontend/`.
- **P11-T3** — Verify natively: `make test-frontend` green locally, then `make test-gh` (PR to `main`) — all three PR gates pass, risk-review reports a live score on the model diff. *Gates:* `quality-gate`, `risk-health-check`, `compliance-guardrail`. *Touchpoints:* PR flow.

**Acceptance:** simulation contract documented; deterministic engine in `frontend/src/lib/` with unit tests covering all documented behaviors; all outputs self-identify as simulated (`kind: "simulation"`); `make test-frontend` green; PR to `main` passes `quality-gate`, `risk-health-check`, `compliance-guardrail`.

### Phase 12 — Release Train Simulator: Interactive Surface (independent track)

**Goal:** make the simulation explorable — a new route in `frontend/` where a user configures a train and sees the simulated schedule, with "simulated" labeling always visible.

- **P12-T1** — New simulator route (e.g. `/simulator`): configuration controls (interval, capacity, backlog, gate pass-rate, seed) wired to the Phase 11 model, rendering the per-train schedule and outcome summary. *Gates:* `quality-gate`, `risk-health-check`. *Touchpoints:* `frontend/`.
- **P12-T2** — Component tests for the route (config → schedule rendering, invalid/empty configuration handled gracefully, simulated labeling present on all output). *Gates:* `quality-gate`, `risk-health-check`. *Touchpoints:* `frontend/`.
- **P12-T3** — Surface integration: link the route from the landing page navigation; README/frontend docs note it. Native verification via `make test-gh`. *Gates:* `quality-gate`, `risk-health-check`, `compliance-guardrail`. *Touchpoints:* `frontend/`, docs.

**Acceptance:** `/simulator` route reachable from the landing page; renders a valid train schedule for any valid configuration; invalid/empty configuration handled without errors; simulated labeling visible on all output; component tests green; native PR gates green; no workflow drift.

### Phase 13 — Release Train Simulator: Headless Run Mode + Telemetry-Honesty (independent track, after Phase 11)

**Goal:** run the same model off-GitHub-UI — a script + `workflow_dispatch` job producing a simulation report artifact, and proof that the simulator leaves `delivery-telemetry` untouched.

- **P13-T1** — Headless run path: a Node script (following the `scripts/` pattern) that takes a seed + config and writes a clearly-labeled simulation report, reusing the Phase 11 model semantics. *Gates:* `quality-gate` (workflow-lint on the PR), `risk-health-check` (AI risk review on the script diff). *Touchpoints:* `scripts/`.
- **P13-T2** — New canonical workflow `release-train-simulator.yml` (`workflow_dispatch` only — no schedule, no native delivery events): runs the headless model and uploads a `release-train-simulation` report artifact. Constraint: the job creates no deployments, releases, PRs, or issues — the artifact is its only output. *Gates:* `quality-gate`, `release-pipeline` (dispatch-hosted run), `delivery-telemetry` (verification gate). *Touchpoints:* `.github/pdm/workflows/` (+ `make sync`), `scripts/`.
- **P13-T3** — Telemetry-honesty verification + decision record: dispatch `release-train-simulator`, then `delivery-telemetry`; confirm the audit-trail event set and metrics are unchanged (no contamination — metrics remain `insufficient-data` for unexercised metrics). Record **ADR 0010** (simulations are labeled artifacts, never native delivery records) and update the runbook, architecture workflow map, and ROADMAP. *Gates:* `delivery-telemetry`. *Touchpoints:* `docs/decisions/`, `docs/local-runbook.md`, `docs/architecture.md`, `docs/ROADMAP.md`.

**Acceptance:** `workflow_dispatch` run uploads a `release-train-simulation` artifact; the run creates zero native delivery records (deployments/releases/PRs/issues); pre/post `delivery-telemetry` comparison shows the audit-trail event set and metrics unchanged; ADR 0010 + runbook/architecture/ROADMAP updated; `make lint` green, no drift.

## 6. Execution Model

- Every work item is a **branch off `develop` + PR to `main`** (the existing flow; `make test-gh` automates push + PR + `gh pr checks --watch`).
- Workflow edits happen **only** in `.github/pdm/workflows/`, then `make sync` and `make lint` before committing both trees together.
- Frontend work uses **pnpm in `frontend/`** and is validated with `make test-frontend` (and `pnpm test:watch` for the local TDD loop).
- Headless runs and telemetry verification use **`workflow_dispatch`** (`release-train-simulator.yml`; `delivery-telemetry.yml`); `release-pipeline` is untouched by this chapter.
- Docs and ADR 0010 land in the same PR as the behavior they describe (repo Definition of Done).

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Simulator outputs get mistaken for real delivery records | Every output carries `kind: "simulation"`; the workflow creates no native events; P13-T3 proves telemetry unchanged and documents it |
| Simulator run pollutes `delivery-telemetry` metrics (ADR 0008 violation) | Dispatch-only workflow with artifact-only output; P13-T3's pre/post comparison is a required acceptance check; the new workflow explicitly performs no Deployment/Release/Issue API calls |
| Scope creep toward "simulator as telemetry feeder" | Non-goal is explicit; ADR 0010 records the boundary; review gates (`risk-health-check`) see the diff |
| Model tests flake (randomness) | Deterministic seeded engine — outcomes are a pure function of (config, seed); determinism itself is a tested behavior |
| ADR renumbering breaks a reference elsewhere in the repo | Repo-wide grep for ADR numbers + stale ranges; the required `quality-gate` and PR review re-check; index links verified to resolve |
| Branch-protection/approval friction on the PR loops | `make test-gh` loop is the established verification path; Phase 11–13 PRs are frontend/script/docs only, no staging/production approvals involved |
| Docs drift as workflows change | Same-PR doc updates (architecture map, runbook, ADR log, ROADMAP) per repo DoD |
| Conflict with P8–P10 tracks on `docs/` | Both chapters edit `docs/`; conflicts are trivial markdown merges; simulator chapter is independent of P8/P9/P10 sequencing |

## 8. Definition of Done (per phase, repo canon)

- `make lint` green (no drift) after every workflow change; `make sync` run and both trees committed together.
- All affected workflows verified natively on GitHub (PR gates via `make test-gh`; the simulator + telemetry jobs via `workflow_dispatch`).
- New workflow follows the canonical patterns: synced copy, comment-guard on PRs where applicable, artifact-upload path for non-PR runs, run artifacts never committed.
- Telemetry honors the ethos: `insufficient-data` reported and explained, never invented; simulator evidence shows no contamination.
- No secrets committed; no run artifacts (reports, deployment records, releases, simulations) in git.
- Docs updated for everything merged (architecture map, native runbook, agent guide, ADR log 0010, ROADMAP).
- Phases marked complete only after native runs actually executed; anything not re-verified carries `needs-verification`.
