# Learning PDM: Delivery Engine — Parallelization Plan for Phases 9–10

Status: **executed and closed (2026-08-18)** — Phase 8 (shared prereq) complete; Phases 9 & 10 ran concurrently as **Track A (P9) ∥ Track B (P10)**, then **Phase 11 joint landing** delivered: both tracks merged to `develop` (PRs #101–#104), dependencies synced (#107), `main` parity restored via protected promotion (PR #108 → `03ee5dfa`, real deployments on dev/staging/prod), combined truthing readout (run 32087567616) recorded in ROADMAP (PR #109), and the 8 planning issues closed. Tracked as GitHub issues `[P9] T9.*`–`[P10] T10.*` (#55–#62) plus `[P11] T11.*`.

## 1. Purpose

**Decision to make + execute:** Now that the maiden-voyage shared prerequisite (Phase 8 — first real delivery flight) is complete, can the two remaining pending phases — **Phase 9 (Product Surface)** and **Phase 10 (Release Train, Failure Telemetry & Reusable Engine)** — be executed **in parallel** rather than one after the other?

**Verdict this plan encodes: Yes.** The two phases are file-disjoint (P9 touches only `frontend/`; P10 touches only `scripts/`, `.github/pdm/workflows/`, `docs/decisions/`, `docs/`), and P10's only hard prerequisite — "real baseline deployments exist" (was gated on P8-T2/T3/T4) — is satisfied by completed Phase 8. The remaining coupling is soft and resolvable.

The deliverable is a delivery roadmap, not a feature plan: task scope for P9/P10 passes through unchanged; what changes is sequencing, coordination, and an added Phase 11 integration step.

## 2. Current State

Verified 2026-08-18 against the working tree, git history, and the GitHub API:

- **Working tree:** clean, on `develop` at `71adff75` (merge #91, docs/frontend README alignment).
- **Phase 8 (shared prereq) is complete** — per `docs/ROADMAP.md` §13 and `docs/plans/roadmap-phase-8-10-maiden-voyage.md`:
  - P8-T1 `develop`→`main` promotion landed (PR #84, merge commit `e94d9ef`) — `main` reached parity at P8 close; subsequent docs-only merges (#90, #91) sit on `develop`, so `main` re-promotion is part of Phase 11.
  - P8-T2 real non-dry-run promotion ran (`development`→`staging`→`production`, `createDeployment` on `30f6193`, run 32019424411).
  - P8-T3 release `v0.1.0` shipped from `e94d9ef`.
  - P8-T4 baseline DORA readout recorded (90d: DF dev 0.62/wk, staging 0.47/wk, prod 0.47/wk; LT median 32m; CFR/MTTR `insufficient-data` by design).
  - P8-T5 GitHub Pages live verify target live (200 on `/` and `/simulator/`), `DEPLOY_VERIFY_URL` wired into `release-pipeline` verify steps.
- **Open planning issues (8):** `[P9] T9.1–T9.4` (label `phase-9`) and `[P10] T10.1–T10.4` (label `phase-10`), all opened 2026-08-17. No open `[P8]` issues.
- **Open dependabot PRs (5, all to `develop`):** `actions/configure-pages 5→6`, `pnpm/action-setup 4→6`, `actions/deploy-pages 4→5`, `actions/upload-pages-artifact 3→5`, `actions/upload-artifact 4→7`. These update `.github/workflows/` execution copies, so `make sync-deps` + `make sync` discipline applies after any merge.
- **Engine state (from ROADMAP, architecture, agent guide):** 7 canonical workflows + byte-identical synced copies; three PR gates (`quality-gate` required on `main`, `risk-health-check`, `compliance-guardrail`); `release-pipeline` with dry-run default (ADR 0002); `delivery-telemetry` GitHub-native only (ADR 0008); environments `development`/`staging`/`production`/`github-pages`; ADR log 0001–0008 + 0010.
- **Known gaps (owned by P9/P10):** CFR/MTTR `insufficient-data` (P10-T2); no release-train cadence doc or ADR 0009 (P10-T1); no AI-drafted release notes / risk summaries (P10-T3); no reusable engine template path (P10-T4); no delivery-dashboard route, release-train domain model, or surface depth in `frontend/` (P9-T1–T3).

Nothing above marked `needs-verification` because the verification evidence (runs, merge commits, issue states) is recorded in the tracked docs and currently on `develop`.

## 3. Goals / Non-Goals + Success Metrics

**Goals:**

1. Answer the parallelization question with evidence (touchpoint disjointness + dependency closure) and lock the answer into an executable execution model.
2. Run Phase 9 and Phase 10 concurrently as independent tracks off `develop`, each with its own branches/PRs, with zero wait-state between them.
3. Preserve the chapter's intended outcomes unchanged: P9 grows the product surface; P10 delivers release-train cadence + ADR 0009, real CFR/MTTR, AI-drafted summaries, and a bootstrap template.
4. Land Phase 11: a joint, coherent end-state — both tracks merged, `main` restored to parity, a combined telemetry readout, docs reconciled.

**Non-goals:**

- No re-scoping of P9/P10 work items (unchanged from `roadmap-phase-8-10-maiden-voyage.md`).
- No merging the two tracks into one branch or one PR (that would destroy the parallelism being decided).
- No new workflows, environments, or cross-track file overlap; no external observability (ADR 0008); no `act`/Docker harness (ADR 0005); no invented metrics (the ethos: `insufficient-data`, never fabricated).

**Success metrics (DORA-style where relevant):**

| Metric | Current | Target after this plan |
|---|---|---|
| Chapter wall-clock | serial estimate = T(P9) + T(P10) + T(P11) | parallel: max(T(P9), T(P10)) + T(P11); target ≤ ~60% of the serial effort |
| Deployment frequency | real baseline (dev 0.62/wk, staging 0.47/wk, prod 0.47/wk — 90d) | continues reading real values from native records; P9/P10 merged content ships on the next promoted release |
| Lead time for changes | real median 32m (P8 baseline) | real, stable after the joint (v0.2.0-class) release |
| Change failure rate | `insufficient-data` | real small value from the one controlled, labeled drill (P10-T2), explained not padded |
| Time to recovery (proxy) | `insufficient-data` | real value from the drill window (failure event → next deploy) in a `delivery-telemetry` dispatch |
| Parallel integrity | n/a | shared-file count between tracks = 0; `make lint` green after every track merge; every PR passed the three gates |
| Drive-by title hygiene | n/a | zero non-drill issues/PRs whose titles match the failure-event classifier (`rollback`/`incident`/`outage`/`hotfix`/`regression`) |

## 4. Parallelization Strategy

```
Phase 8 — Maiden Voyage (SHARED PREREQ) — COMPLETE
   real deploys (dev/staging/prod) · v0.1.0 · Pages verify · baseline telemetry
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        Phase 9 — Track A                Phase 10 — Track B
        Product Surface                  Release train +
        (frontend/ only)                 failure telemetry +
                                         reusable template
        (scripts/, workflows/,
         docs/decisions/, docs/)
              └───────────────┬───────────────┘
                              ▼
               Phase 11 — Joint Landing & Telemetry Truthing
```

**Why they can run in parallel (dependency analysis, from the evidence):**

1. **File-disjoint touchpoints.** P9's tasks touch only `frontend/`. P10's tasks touch only `scripts/`, `.github/pdm/workflows/` (+ `make sync`), `docs/decisions/`, and `docs/`. P9 ∩ P10 = ∅. Track A edits none of Track B's zones and vice versa.
2. **No remaining cross-phase task dependency.** The one hard edge in the original plan — *"P10-T2 must land after Phase 8's baseline deployments exist"* — is now satisfied: the baseline deployments (P8-T2 real flight, P8-T3 `v0.1.0`) are in the API records `delivery-telemetry` reads. Every other P10 task (cadence/ADR, AI summaries, template) never depended on P9.
3. **Shared resources are quality floors, not dependencies.** Both tracks pass through the same three PR gates; both use the same `make test-gh` loop and `workflow_dispatch`. Those are toll gates, not sequencing constraints — each track's PR runs independently.
4. **The one soft coupling is cosmetic and honest-able.** P9-T1's dashboard shows a "release-train summary"; P10-T1 produces the on-time signal. Until the signal exists, the dashboard renders `insufficient-data` (the repo's ethos ADR 0008), so a data dependency never becomes a schedule dependency.

**Guardrails to preserve parallel-ability (hard rules for the tracks):**

- P10-T2's deliberate regression vehicle must live **inside Track B's zone** (e.g., a `scripts/` helper), *never* `frontend/` — otherwise the drill collides with P9's surface and reintroduces cross-track conflict.
- Track A never edits workflows/docs; Track B never edits `frontend/`. Single writers per zone.

## 5. Phases

### Phase 9 — Track A: Product Surface (independent, runs concurrently with Phase 10)

**Goal:** grow `frontend/` from a landing page into a small fintech product so the gates, OSV scan, AI risk review, and the release build exercise a real, growing application. **Track discipline:** `frontend/`-only changes.

- **P9-T1** — New route: a delivery-dashboard page (gates status, release-train summary) built TDD-first with Vitest. *Gates:* `quality-gate`, `risk-health-check`. *Touchpoints:* `frontend/`.
- **P9-T2** — Domain model expansion: extend `src/lib/delivery.ts` (and tests) with a release-train/readiness model the dashboard consumes. *Gates:* `quality-gate`, `risk-health-check`. *Touchpoints:* `frontend/`.
- **P9-T3** — Surface depth: fintech-relevant components/content (compliance posture, feature status cards) to enlarge the diff the AI risk review scores. *Gate:* `risk-health-check`. *Touchpoints:* `frontend/`.
- **P9-T4** — Native verification: `make test-frontend` green; `make test-gh` (PR to `main`) — all three PR gates pass on the expanded surface; risk-review reports a live score on the larger diff. *Gates:* `quality-gate`, `risk-health-check`, `compliance-guardrail`. *Touchpoints:* verification only.

### Phase 10 — Track B: Release Train, Failure Telemetry & Reusable Engine (independent, runs concurrently with Phase 9)

**Goal:** cover the remaining README promises ("agile release trains") and give CFR/MTTR real data, then leave a path for adopting this engine in a fresh product. **Track discipline:** `scripts/` + `.github/pdm/workflows/` + `docs/decisions/` + `docs/` only; P10-T2's regression vehicle stays in `scripts/`.

- **P10-T1** — Release train cadence: document a train calendar (interval, content, readiness cutoffs) and extend `delivery-telemetry.mjs` with an on-time delivery signal; record the decision as ADR 0009. *Gate:* `delivery-telemetry`. *Touchpoints:* `docs/decisions/`, `scripts/`, `.github/pdm/workflows/` (+ `make sync`).
- **P10-T2** — Controlled failure & recovery drill: deploy a deliberate regression (in `scripts/`, per the guardrail) to a lower environment, exercise `rollback_to`, and file **one** carefully-*labeled* issue (the sole `rollback`/`incident`-labeled issue of the chapter) so CFR and the MTTR proxy compute real values. **Unblocked now that P8's real deployments exist.** *Gates:* `release-pipeline`, `delivery-telemetry`. *Touchpoints:* `scripts/`, labeled issue (failure events counted by label, never by title; title-discipline applies to every other P9/P10 issue/PR).
- **P10-T3** — AI-assisted release notes / PR summaries: extend release-note generation and the risk-report with engine-drafted summaries, keeping "never invent telemetry" intact (draft ≠ metric). *Gates:* `risk-health-check`, `release-pipeline`. *Touchpoints:* `scripts/`, `.github/pdm/workflows/` (+ `make sync`).
- **P10-T4** — Reusable engine template: document a copy-kit/bootstrapping path (checklist + scripts usage) so a new product team can adopt the engine without reading every ADR; README/runbook updates. *Touchpoints:* `docs/`, `README.md`.

### Phase 11 — Joint Landing & Telemetry Truthing (integration, both tracks merged first)

**Goal:** turn two parallel merges into one coherent delivered chapter.

- **P11-T1** *(done)* — Cross-track reconcile: both tracks merged to `develop`; `make sync`/`make lint` clean; dependabot bumps #92/#93 adopted via `make sync-deps` + `make sync` (PR #107); doc set reconciled (ROADMAP §13 status, ADR 0009 indexed).
- **P11-T2** *(done)* — Restore `main` parity: protected `develop`→`main` promotion PR #108 — native quality-gate ran the full combined surface (install/lint/typecheck/test/build all green), merged as `03ee5dfa`; `release-pipeline` on the push recorded real Deployment API records for the promoted commit (dev 5954211736, staging 5954246814, prod 5954249612).
- **P11-T3** *(done)* — Combined telemetry truthing: `workflow_dispatch` run 32087567616 (90d) — DF dev 1.48/wk, staging 0.93/wk, prod 0.93/wk, pages 0.78/wk; LT median 6m; CFR 1.9% (1/53); MTTR proxy median 21m; train on-time 100% (1/1); readout documented in ROADMAP (§13, PR #109).
- **P11-T4** *(done)* — Chapter close-out: `docs/plans/phases-9-10-parallelization.md` + `roadmap-phase-8-10-maiden-voyage.md` marked complete, planning issues closed, ROADMAP updated.

## 6. Acceptance Criteria (per phase)

- **Phase 9:** ≥1 new route (delivery dashboard) + expanded `src/lib/delivery.ts` domain model, both TDD'd; `make test-frontend` green; `make test-gh` PR to `main` shows all three gates green on the expanded surface; risk-review produces a non-trivial live score; **zero** files touched outside `frontend/`.
- **Phase 10:** ADR 0009 + train calendar + on-time signal in the telemetry export; CFR and MTTR compute real values from the one labeled drill + recovery deploy; AI-drafted note/summary path works on a tag/dispatch; template doc exists; `make lint` green; **zero** files touched in `frontend/`; **zero** non-drill titles matching the failure classifier.
- **Phase 11:** both tracks merged to `develop` with no drift; `main` at parity after promotion; combined `delivery-telemetry` artifact shows all four DORA metrics as real (or explicitly *why* `insufficient-data` remains); docs/plans + ROADMAP updated; 8 planning issues closed.

## 7. Execution Model

- Each track: **branch off `develop` + PR to `develop`** for the work item; **`make test-gh`** (PR to `main`) runs the three gates natively per branch — two tracks can verify concurrently; GitHub runs are independent per branch.
- Workflow edits: **Track B only**, only `.github/pdm/workflows/`, then `make sync` and `make lint` before committing both trees. Any dependabot merge during the window → `make sync-deps` and re-`make sync`.
- Frontend work: **Track A only**, pnpm in `frontend/`, validated with `make test-frontend`.
- Non-PR runs: `workflow_dispatch` on `release-pipeline` (dry-run default preserved; only the deliberate P10-T2 drill sets `dry_run: false` on a **lower environment**) and on `delivery-telemetry` (P10-T1 verification, P11-T3 truthing). Note: dispatch workflows register on `develop` (the default branch).
- Docs and ADRs update in the same PR as the behavior they describe (single-writer per zone).
- **Only deliberate merge sequencing:** Phase 11's promotion to `main`. Nothing else forces P9 to wait on P10 or vice versa.

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Concurrent `make test-gh` PRs to `main` → a comment per push per PR (noise) | Documented, expected behavior (AGENTS.md); per-branch verification PRs are independent, no gate interference |
| Dependabot (5 open PRs on Actions) merges mid-window and collides with Track B's workflow edits | Only versions change in execution copies; `make sync-deps` adopts and re-syncs; Track B coordinates workflow-touching merges with dependabot merges |
| Tracks' PRs race to `develop` and one must re-merge | File-disjointness makes conflicts essentially impossible; later merge does a trivial `develop` re-merge before its PR |
| P10-T2's failure drill pollutes CFR/MTTR or reads as a P9 regression | Drill regression vehicle confined to `scripts/` (guardrail); one labeled issue only; failure events counted by label, never title; P9 issues/PRs keep clean titles |
| P9 dashboard shows release-train summary before P10-T1's signal exists | Render `insufficient-data` honestly (ADR 0008 ethos); visual placeholder until the audit contains the signal |
| Staging/production approvals stall the drill (P10-T2) | Drill runs on `environment: development` (or staging) only; P8-T2 already proved the approval path when a run needs it |
| Telemetry truthing (P11-T3) races P10-T2 | Snapshots are read at dispatch time; sequence P11-T3 after P10-T2 merges so the drill event is captured |
| Parallelism produces doc drift (two writers) | Single-writer zones enforced: Track A never writes docs; Track B owns all doc/ADR/workflow writes; Phase 11 reconciles |
| Chapter duration grows because of coordination overhead | The only coordination points are the two guardrails and Phase 11; all else is independent branch+PR flow already in the repo |

## 9. Definition of Done (per phase; repo canon)

- `make lint` green (actionlint + no drift) after every change; `make sync` run and both workflow trees committed together.
- All affected workflows verified natively on GitHub: PR gates via `make test-gh`; `release-pipeline` and `delivery-telemetry` via `workflow_dispatch`.
- New/changed workflows: canonical + synced copies; PR-comment path guarded and artifact-upload path in place for non-PR events; run artifacts never committed; no secrets.
- Telemetry honors the ethos: `insufficient-data` reported **and explained**, never invented; metrics real or absent.
- Phases marked complete **only after** the native runs actually executed; anything not re-verified in the latest state carries `needs-verification`.
- Docs (architecture map, runbook, agent guide, ADR log, ROADMAP, chapter plan) updated in the same PR as the behavior they describe.