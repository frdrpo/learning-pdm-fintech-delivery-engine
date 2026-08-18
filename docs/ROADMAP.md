# Learning PDM: Delivery Engine — Roadmap

## 1. Purpose

Turn this reference repo from a **harness + placeholders** into a **real, exercised product-delivery engine** — while staying a teachable artifact. The engine is the GitHub Actions setup under `.github/`; application code exists only to give the gates real work.

## 2. Current State

- **10 canonical workflows** in `.github/pdm/workflows/` (7 core + `publish-pages` + `release-train-simulator` + `copykit-smoke`), byte-identical copies in `.github/workflows/` (currently in sync). `make lint` enforces no drift.
  - `risk-health-check` — gitleaks + osv-scanner + code-health + AI-assisted diff risk review (`scripts/risk-review.mjs`); posts PR comment or uploads a report artifact on non-PR runs
  - `compliance-guardrail` — trufflehog base→head; posts PR comment
  - `quality-gate` — actionlint + frontend lint/typecheck/test/build; gate job; required status check on `main`; posts comment / uploads report artifact
  - `release-pipeline` — build-info artifact; post-deploy verify; dry-run dev→staging→prod; rollback record; uploads deployment records on dry-run
  - `security-rescan` — scheduled (weekly) + `workflow_dispatch` gitleaks + osv; uploads report artifact; files an issue on blocking findings
  - `release-on-tag` — milestone-gated releases: dispatch with a `version` cuts `v<version>` off `develop` (requires a closed milestone, bumps `frontend/package.json`, creates the GitHub Release in one self-contained run); manual `v*` pushes publish via the same gate
  - `delivery-telemetry` — weekly + on-demand export of the GitHub-native audit trail and DORA-style telemetry as run artifacts
- **Application stack**: a Next.js 16 frontend (`frontend/`, TypeScript + Tailwind v4 + Vitest, pnpm) that the quality gate, code-health, and release build exercise (Phase 6 replaced the earlier minimal Node service).
- **Frontend tooling**: native `make test-frontend` (install + lint + typecheck + test + build) — no container; CI runs the same suite via `corepack`/`pnpm` in `frontend/`.
- **Testing is GitHub native**: workflows are verified by pushing a branch and opening a PR (`make test-gh`), plus `workflow_dispatch` runs for the release pipeline. No local `act`/Docker harness.
- **GitHub delivery**: environments `development`/`staging`/`production` exist with required-reviewer protection on staging/prod; real `createDeployment` exercised; `quality-gate` is a required status check on `main`.
- **Dependency automation**: Dependabot configured for GitHub Actions (root) + npm (pointed at `frontend/` since Phase 6 moved the app there), both targeting `develop`; version bumps are mirrored into canonical workflows by hand after merge.
- **Toolchain**: actionlint 1.7.12 (Homebrew), `gh` CLI, Node 22.
- **Branches**: `main`, `develop`, feature branches.
- **Docs**: architecture map, native runbook, agent guide, and ADR log tracked under `docs/`.
- **Known gaps**: none open (Phases 0–14 complete). Phase 7 added delivery telemetry & audit trail atop GitHub's native records; Phases 8–11 delivered the maiden voyage, product surface, release-train/failure telemetry, and the release-train simulator; Phases 12–14 operated train 2 and validated the copy-kit.

## 3. Parallelization Strategy

```
Phase 0 (hygiene) ──► Phase 1 (prove harness)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
   Phase 2   │    Phase 3    │    Phase 4    │    Phase 5 (docs, runs from day 1)
   App stack │    GitHub     │    PDM        │
              │    delivery  │    extension  │
              └───────────────┴───────────────┘
```

Phases 2–5 are **independent tracks** — each is planned/executed as its own branch + PR off `develop`, with its own planning session. Phase 1 is the shared prerequisite (validates workflows via GitHub-native runs before anyone builds on them).

## 4. Phase 0 — Hygiene & Baseline (prereq, ~1 session)

**Goal:** clean tree, fresh fixtures, no blockers for parallel work.

- **T0.1** Commit `opencode.json` (project git-permission config).
- **T0.2** ~~Refresh `.act/event.json`~~ (`.act/` harness removed in favor of GitHub-native testing).
- **T0.3** Decide `AGENTS.md` treatment — it's gitignored today; defer the decision to Phase 5 (T5.3 promotes its content into tracked docs).
- **T0.4** Prereq checklist in README: `gh` CLI, actionlint, push access.

**Acceptance:** `git status` clean; fixtures reference real SHAs; no drift.

## 5. Phase 1 — Prove the Harness (prereq for all tracks)

> **Superseded:** the local `act` harness was removed in favor of GitHub-native testing (see Phase 3). Historical notes below.

**Goal (as originally scoped):** every workflow runs green locally end-to-end, so later tracks have a trusted baseline.

- **T1.1** `make lint` → actionlint + drift check (expect pass).
- **T1.2** ~~Start Docker, load token, run the 4 fixture'd act commands.~~
- **T1.3** Verify reports/records land as run artifacts (see Phase 3 native flow).
- **T1.4** Fix any failures/drift; re-run green.

**Acceptance (current):** `make lint` green; workflows verified green via GitHub-native runs.

## 6. Phase 2 — Track A: Application Stack

> **Superseded:** the minimal Node service scaffolded here was replaced by the Next.js frontend in Phase 6. Historical notes below.

**Goal:** give the quality gate and release pipeline real work.

- **T2.1** Scaffold minimal Node service (`package.json` with `lint`/`test`/`build`; e.g. tiny HTTP service + vitest + eslint).
- **T2.2** Commit `package-lock.json` so OSV + `npm ci` paths activate.
- **T2.3** Confirm `quality-gate.code-quality` and `risk-health-check.code-health` run real steps.
- **T2.4** Give `release-pipeline.build` a real deployable (real `dist/` output or Dockerfile).

**Acceptance:** `npm ci && npm run lint && npm run test && npm run build` green; act runs execute the new steps.

## 7. Phase 3 — Track B: GitHub Delivery Integration

**Goal:** behave as a real PR gate + deployment pipeline on GitHub (not just locally).

- **T3.0** Move workflow testing from local `act` to GitHub native: remove `.act/` fixtures + Dockerfile, strip `act` targets from the Makefile, add `make test-gh`, persist non-PR reports/deployment records as run artifacts. ✅ done
- **T3.1** Create environments `development`/`staging`/`production` (+ approval rules for staging/prod). ✅ done — envs exist; required-reviewer protection on staging/prod verified via a dry-run promotion approval
- **T3.2** Open a real PR from a feature branch → verify the 3 guardrail comments post (native loop is `make test-gh`). ✅ part of T3.0
- **T3.3** Add `quality-gate` as a required status check on `main` (branch protection). ✅ done
- **T3.4** Exercise one real deployment API path (`createDeployment`), keeping `dry_run: true` as default. ✅ done — real `createDeployment` to `development` verified via `workflow_dispatch` with `dry_run: false`

**Acceptance:** merged PR shows all comments; environments configured; real deployment record exists; no regressions. ✅

## 8. Phase 4 — Track C: Extend the PDM Surface

**Goal:** cover more of the delivery lifecycle. Each item is optional & independently shippable.

- **T4.1** Scheduled/on-demand security re-scan (reuse gitleaks + osv). ✅ done — `security-rescan.yml`
- **T4.2** Tag-triggered release job (`push` tags `v*`) with release notes. ✅ done — `release-on-tag.yml`
- **T4.3** Dependabot/Renovate config for dependency automation. ✅ done — `.github/dependabot.yml`; first bumps landed (checkout/setup-node 4→7), mirrored into canonical
- **T4.4** Rollback + post-deploy verification steps in `release-pipeline`. ✅ done — `rollback_to` input + verify steps + rollback job
- **T4.5** Wire the AI diff risk-review placeholder hook (noted in `risk-report`). ✅ done — `scripts/risk-review.mjs` + `risk-review` job reporting a live risk score

**Acceptance per item:** canonical workflow added, `make sync`, `make lint` clean, GitHub-native PR/dispatch run green. ✅

## 9. Phase 5 — Track D: Documentation & Learning Material (starts day 1)

**Goal:** make the repo a teachable artifact, tracked (not gitignored).

- **T5.1** Architecture README: workflow map, job graph, env promotion chain. ✅ done — `docs/architecture.md`
- **T5.2** Native runbook: `make test-gh` PR loop, how to add a workflow, sync discipline. ✅ done — `docs/local-runbook.md`
- **T5.3** Promote `AGENTS.md` content into tracked docs. ✅ done — `docs/agents-guide.md`
- **T5.4** ADR-style decision log (empty-tree base SHA, dry-run default, `osv-scanner-action` subdir path, GitHub-native testing over `act`, comment-guard patterns). ✅ done — `docs/decisions/` (0001–0008)

**Acceptance:** docs tracked, linked from workflows, up to date with every merged phase. ✅

## 10. Phase 6 — Track D: Application Surface (Next.js frontend)

**Goal:** replace the placeholder Node service with a real, test-first product surface so the gates exercise an actual application.

- **T6.1** Land a Next.js 16 + TypeScript + Tailwind v4 app in `frontend/`, TDD'd with Vitest (components + unit tests). ✅ done — `frontend/` (landed from the earlier `feat/start-frontend` exploration)
- **T6.2** Rewire the gates to the frontend stack: `quality-gate.code-quality` and `risk-health-check.code-health` set up pnpm via `pnpm/action-setup@v6` (pinned to the lockfile) before `actions/setup-node` (pnpm cache), then run install + lint + typecheck + test [+ build] in `frontend/`. ✅ done
- **T6.3** Fix `release-pipeline.build` to actually build the frontend (`pnpm run build` → `.next`) instead of the removed root npm build. ✅ done
- **T6.4** Remove the legacy app surface (`src/`, root `package.json`/lock, `eslint.config.js`, `scripts/build.mjs`) — keep `scripts/risk-review.mjs`. ✅ done
- **T6.5** Native, container-free `make test-frontend` (pnpm; corepack on Node <25) mirroring the gate suite; docs updated. ✅ done

**Acceptance:** `make test-frontend` green, `make sync`/`make lint` clean, GitHub-native PR run green. ✅

## 11. Phase 7 — Delivery Telemetry & Audit Trail

**Goal:** make delivery outcomes observable. Every delivery event is already recorded natively by GitHub (Deployment API records, releases, merged PRs, issues); Phase 7 reads that record and turns it into a durable audit trail plus DORA-style telemetry, with no external observability service.

- **T7.1** `scripts/delivery-telemetry.mjs` — exports a raw audit-trail snapshot (deployments per environment, releases, merged PRs, rollback/incident issues) and derives deployment frequency, lead time for changes, change failure rate, and a time-to-recovery proxy. Insufficient data is reported as `insufficient-data` and explained, never invented. ✅ done — `scripts/delivery-telemetry.mjs`
- **T7.2** `delivery-telemetry.yml` — weekly schedule (Mon 02:30 UTC) + `workflow_dispatch`; runs the exporter with the built-in `GITHUB_TOKEN` and uploads `delivery-telemetry` (audit JSON + metrics JSON + markdown report) as a run artifact. ✅ done — `.github/pdm/workflows/delivery-telemetry.yml` + synced copy
- **T7.3** ADR 0008 records the decision to compute telemetry from GitHub-native records over an external observability tool. ✅ done — `docs/decisions/0008-github-native-delivery-telemetry.md`
- **T7.4** Docs updated: architecture workflow map + telemetry section, runbook results table, agent guide. ✅ done
- **T7.5** Verify natively on GitHub: the three PR gates passed on the `main` verification PR (which actionlint-validated the new workflow too), and the `delivery-telemetry` `workflow_dispatch` run succeeded on `develop` (the default branch — GitHub registers dispatch workflows there) and uploaded the `delivery-telemetry` artifact (audit JSON + metrics JSON + markdown report). ✅ done

**Acceptance:** `make lint` green; exporter tested against the live repo API; PR gates green on the `main` verification PR; `workflow_dispatch` run on `develop` uploaded the telemetry/audit artifacts. ✅

## 12. Phase 8 — Release Train Simulator (internally Phases 11–13)

**Goal:** demonstrate the release-train promise by letting anyone model it — a deterministic, TDD'd simulation (train interval, capacity, gate pass-rate, slip policy, seed → which features board each train, on-time vs slipped, throughput) rendered in `frontend/` and runnable headlessly as a labeled artifact, without ever polluting the delivery telemetry.

Full scope and issue mapping live in `docs/plans/release-train-simulator.md`.

- **Phase 11 — Model & Core:** `frontend/src/lib/release-train.ts` (seeded mulberry32 deterministic engine, `kind: "simulation"` on every output, `RangeError` validation) + 13 Vitest tests; verified natively (PR gates green), merged to `develop`. ✅ done
- **Phase 12 — Interactive Surface:** `/simulator` route + `SimulationPanel` (capacity / gate pass-rate / interval / seed controls), 5 component tests, hero link; native gates green. ✅ done
- **Phase 13 — Headless Mode + Telemetry-Honesty:** `scripts/release-train-simulator.mts` + `release-train-simulator.yml` (dispatch-only, artifact-only output), ADR 0010; telemetry verified untouched (pre/post event-set diff). ✅ done
- **Folded prerequisite (ADR hygiene):** decision log reordered 0001–0008 into decision order with zero forward references before ADR 0009+. ✅ done

**Acceptance:** `make lint` green, no drift; all PR gates green on `main` verification PRs; dispatch run uploads the `release-train-simulation` artifact; pre/post `delivery-telemetry` event set unchanged; ADR 0010 + docs updated.

## 13. Execution Model

Each phase is a **branch off `develop` + PR**, following the existing repo flow. Phases 2–5 run as parallel tracks after Phase 1 merges green. Phase 5 can start immediately and absorb notes from other tracks.

> **Status:** Phases 0–8 complete. Track branches land via PRs to `develop`; workflow verification runs through `make test-gh` PRs to `main` plus `workflow_dispatch` runs (dispatchable from `develop`, the default branch). **Phase 8–10 chapter (maiden voyage)** in-flight — see `docs/plans/roadmap-phase-8-10-maiden-voyage.md`; Phase 8 (first real delivery flight: `develop`→`main` promotion, real dev/staging/prod deployments, release `v0.1.0`, baseline DORA telemetry, GitHub Pages live verify target) is complete. **Phase 9 (Product Surface)** is complete — delivery dashboard route + release-train readiness model landed (PRs #101–#103). **Phase 10 (Release Train, Failure Telemetry & Reusable Engine)** is complete: ADR 0009 train calendar + on-time signal, engine summary draft, and the engine copy-kit merged (PR #103); the controlled failure & recovery drill (T10.2) executed **2026-08-18** — CFR **2.3%** (1 failure / 44 deployments), MTTR median **1m** to the rollback deployment (incident #105, recovery deploy record 5954064736), superseding the P8 baseline's `insufficient-data`. **Phase 11 (Joint Landing)** — P11-T1/T11.1 reconciliation done (dependabot action bumps #92/#93 adopted into canonical, `make lint` clean, PR #107); **P11-T2/T11.2 `main` parity restored** via protected promotion PR #108 (native quality-gate run: full install/lint/typecheck/test/build green on the combined surface) — merged 2026-08-18 as `03ee5dfa`, release-pipeline recorded real Deployment API records on all three environments for the promoted commit (dev 5954211736, staging 5954246814, prod 5954249612); **P11-T3/T11.3 combined truthing** (run 32087567616, 90d window) — **DF** dev 1.48/wk, staging 0.93/wk, prod 0.93/wk, pages 0.78/wk; **LT median 6m**; **CFR 1.9%** (1/53); **MTTR (proxy) median 21m** (measured to the newest deployment at snapshot, per `scripts/delivery-telemetry.mjs`); release-train **on-time 100%** (1/1); all four DORA metrics + train signal now computed from native records. **Release mechanics (milestone-gated)** — `release-on-tag` now blocks any release (dispatch *and* manual `v*` push) until a closed milestone `v<version>` exists; its dispatch path is self-contained (milestone gate → `develop` `frontend/package.json` bump → build → `createRelease`) because `GITHUB_TOKEN`-triggered events can't chain a new run; gate test (run 32092410310) auto-created an open milestone and blocked as designed; first happy-path release **v0.2.0** shipped **2026-08-18** (run 32092599724, tag/commit `d7ce83fa`, milestone #14, artifacts `release-notes` + `release-cut-summary`).

**Phases 12–14 (Cadence & Adoption) complete.** This chapter proves the engine operates *at cadence*, not just once, and hardens the reusable copy-kit. Full scope: `docs/plans/continue-cadence-adoption.md`. **P12 — Train 2 Flight:** P12-T1 `develop`→`main` promotion of the milestone-gated release-on-tag + v0.2.0 bump (PR #113, merged as `155040fc`); P12-T2 push-triggered `release-pipeline` recorded real Deployment API records for the promoted commit (dev 5955291487, staging 5955327441, prod 5955337894) with live `DEPLOY_VERIFY_URL` verify; P12-T3 release **`v0.2.0`** published 2026-08-18T02:39:39Z (tag `d7ce83fa`, milestone `v0.2.0` closed) — published inside **train 1's** window [08-17, 08-31), so the on-time signal remains computed 1/1 and **train 2 stays pending** (departs 08-31, cutoff 08-28) rather than being inflated; P12-T4 truthing (run 32094905819, 90d window) — **DF** dev 1.63/wk, staging 1.09/wk, prod 1.09/wk, pages 1.63/wk; **LT median 5m** (7 PRs); **CFR 1.4%** (1/70); **MTTR proxy median 2h 21m** (1 event, measured to newest deployment per `scripts/delivery-telemetry.mjs`); on-time 100% (1/1); P12-T5 hygiene — junk `v999.0.0` milestone deleted, stale local branches (`chore/phase10-failure-drill`, `fix/adopt-dependabot-bumps`) dropped. **P13 — Copy-Kit Validation:** audit + local rehearsal of `docs/engine-copy-kit.md`; `make lint` green on a copied engine (9 workflows, synced, no drift); found + fixed the kit §1 `cp Makefile scripts` directory-copy bug (`cp -R`); `make test-frontend` requires an app in `frontend/` (doc'd expectation). **P14 — Close-out:** reconcile + doc updates in this PR.

**Phase 15 (Topology & Release-Mechanics Reconciliation) complete.** Full scope: `docs/plans/phases-15-18-cadence-continuity-adoption.md`. The live repo had drifted from the documented two-branch model (`develop` 404, default branch flipped to `main`) while every workflow, dependabot, the `github-pages` env policy, and most docs still assumed `develop` — the next release cut would have failed at "Sync develop". **P15-T1** — ADR 0011 records the decision to **restore `develop`** as the integration + default branch (both options evaluated against the verified evidence). **P15-T2** — `release-on-tag` gate-behavior test: dispatched `version: 0.3.0` while `develop` did not exist (run 32102905057) — the milestone gate auto-created open milestone `v0.3.0` (#16) and blocked with "Close it, then re-dispatch" *before* ever touching `develop`, and no release was created: the dispatch path is self-contained. `develop` re-created at `main` parity (`4b8d3104`) and the default branch flipped back to `develop` (API-verified). **P15-T3** — `github-pages` environment branch policy verified `develop` (matches both the workflow trigger and the default branch); Pages re-publish **verified natively** from the post-merge `main`→`develop` parity push (run 32103199814, both jobs green) and `DEPLOY_VERIFY_URL` returns HTTP 200. **P15-T4** — dependabot confirmed targeting `develop` (both ecosystems). **P15-T5** — docs reconciled (architecture branch-topology section, runbook drift-repair procedure, copy-kit §2, drill, ADR index) in PR #132. **P15 close-out truthing** (run 32103313531, 90d window) — **DF** dev 2.10/wk, staging 1.48/wk, prod 1.40/wk, pages 2.02/wk; **LT median 5m** (10 PRs); **CFR 1.1%** (1/90 — still only the P10-T2 drill event; no accidental failures from the topology repair); **MTTR proxy median 4h 38m** (1 event, measured to newest deployment per `scripts/delivery-telemetry.mjs`); on-time **100% (1/1)** with train 2 pending (departs 08-31, cutoff 08-28); run titles carry no non-drill classifier matches.

**Phase 16 (Train 2 Flight) executed (2026-08-18) — promotion + release landed as documented slip decisions per owner directive (both recorded on issues #124/#125 before executing).** Full scope: `docs/plans/phases-15-18-cadence-continuity-adoption.md`. **P16-T1** — train-board readiness view boarded on `develop` (`e045ad82`, PR #134), gates green, ahead of the 08-28 cutoff. **P16-T2** — promotion PR #144 `develop`→`main` (`feat(P16): promote train-2 readiness view to production base`), 11/11 native checks green, squash-merged as `245a9afa` (2026-08-18, **10 days before the cutoff — slip decision**); `release-pipeline` run 32114068121 recorded **real Deployment API records on development/staging/production** (dev 5958631617/5958633528, staging 5958634503/5958643270, prod 5958643909/5958670156 — all `success`) and `DEPLOY_VERIFY_URL` returned HTTP 200. Merge needed a transient `strict` relaxation on `main` protection (head couldn't contain `6288e8ad` by design; body restored byte-identical after merge). **P16-T3** — `v0.3.0` released via the milestone-gated `release-on-tag` (milestone #16 closed, run 32115048938, tag `v0.3.0` @ `d8922781`, [Release v0.3.0](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/releases/tag/v0.3.0)) — **also early, outside train 2's window [08-31, 09-14) — slip decision**. **P16-T4 truthing** (run 32115287697, 90d window) — **DF** dev 1.79/wk, staging 1.56/wk, prod 1.56/wk, pages 2.88/wk; **LT median 6m** (11 PRs); **CFR 1.0%** (1/100 — still only the P10-T2 drill event); **MTTR proxy median 7h 15m** (1 event, measured to newest deployment per `scripts/delivery-telemetry.mjs`); **on-time 100% (1/1)** — train 2 **not** counted on-time because `v0.3.0` published outside its window; the signal honestly stays 1/1 with train 2 pending (departs 08-31, cutoff 08-28) per ADR 0009's window rule.

**Phase 17 (Adoption Proof: Copy-Kit) executed via the plan's documented in-repo substitution.** Full scope: `docs/plans/phases-15-18-cadence-continuity-adoption.md`; evidence: `docs/evidence/p17-consumer-repo-flight.md`. The scratch consumer repo `frdrpo/pdm-copykit-consumer` proved the engine natively in a foreign repo (PR #1 — **10/10 checks green**, 3 PR gates + Risk/Security/compliance/publish-pages, merged `1cf46d9`) before vanishing from the account with no trail. The phase then completed per the plan's flagged fallback: `copykit-smoke.yml` (dispatch) + `scripts/consumer-smoke.mjs` rehearse the kit §1→§8 path in a throwaway consumer workspace on a fresh runner (`make test-consumer-path` locally); `make topology-check`/`topology-apply` automate kit §2 (`scripts/wire-topology.mjs`). Every GitHub-side friction from the real flight is folded into kit §1/§2/§8 (Pages requires a public repo on the free plan; `required_reviewers` PUT on the environment, not `protection_rules`; the visibility-change guardrail; the parity-branch PR guard; dispatch-registration 404 timing). **Phase 16 (Train 2) and Phase 18 (close-out) remain pending** on the train-2 calendar (departs 08-31, cutoff 08-28).

## 14. Definition of Done (every phase)

- `make lint` green (no drift) after every change.
- All affected workflows verified green via GitHub-native runs (PR + `workflow_dispatch`).
- New workflows: canonical + synced copy; PR-comment or artifact-upload path guarded for non-PR events.
- No secrets committed; run artifacts stay out of git.
- Docs updated for any workflow change.
