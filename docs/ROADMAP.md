# Learning PDM: Delivery Engine — Roadmap

## 1. Purpose

Turn this reference repo from a **harness + placeholders** into a **real, exercised product-delivery engine** — while staying a teachable artifact. The engine is the GitHub Actions setup under `.github/`; application code exists only to give the gates real work.

## 2. Current State

- **4 canonical workflows** in `.github/pdm/workflows/`, byte-identical copies in `.github/workflows/` (currently in sync). `make lint` enforces no drift.
  - `risk-health-check` — gitleaks + osv-scanner + code-health; posts PR comment or writes `.github/pdm/reports/`
  - `compliance-guardrail` — trufflehog base→head; posts PR comment
  - `quality-gate` — actionlint + lint/test/build (no-op without a stack); gate job
  - `release-pipeline` — build-info artifact; dry-run dev→staging→prod; writes `.github/pdm/deployments/`
- **Local harness**: `Makefile` (`sync/lint/test/test-gate/test-deploy/test-all/dry-run`), `.act/` fixtures (`event.json`, `event.workflow_dispatch.json`) and `pdm-ci` Dockerfile.
- **Toolchain**: act 0.2.89, actionlint 1.7.12, Docker Desktop, `GITHUB_TOKEN` PAT.
- **Branches**: `main`, `develop`, feature branches.
- **Known gaps**: no app stack; `.act/event.json` head.sha is stale; `opencode.json` untracked; `AGENTS.md` is gitignored.

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

Phases 2–5 are **independent tracks** — each is planned/executed as its own branch + PR off `develop`, with its own planning session. Phase 1 is the shared prerequisite (validates the harness and refreshes fixtures before anyone builds on it).

## 4. Phase 0 — Hygiene & Baseline (prereq, ~1 session)

**Goal:** clean tree, fresh fixtures, no blockers for parallel work.

- **T0.1** Commit `opencode.json` (project git-permission config).
- **T0.2** Refresh `.act/event.json` `pull_request.head.sha` to current HEAD (AGENTS.md gotcha: trufflehog hard-fails if `base.sha == head.sha`).
- **T0.3** Decide `AGENTS.md` treatment — it's gitignored today; defer the decision to Phase 5 (T5.3 promotes its content into tracked docs).
- **T0.4** Prereq checklist in README: Docker running, `export GITHUB_TOKEN`, act/actionlint installed.

**Acceptance:** `git status` clean; fixtures reference real SHAs; no drift.

## 5. Phase 1 — Prove the Harness (prereq for all tracks)

**Goal:** every workflow runs green locally end-to-end, so later tracks have a trusted baseline.

- **T1.1** `make lint` → actionlint + drift check (expect pass).
- **T1.2** Start Docker, load token, run the 4 fixture'd act commands (AGENTS.md):
  - risk-health-check (`workflow_dispatch` fixture; `--env GITLEAKS_ENABLE_UPLOAD_ARTIFACT=false`)
  - compliance-guardrail (`pull_request` fixture)
  - quality-gate (`pull_request --bind`)
  - release-pipeline (`workflow_dispatch --bind --artifact-server-path .act/artifacts`)
- **T1.3** Verify artifacts land: `results.sarif`, `.github/pdm/reports/*.md`, `.github/pdm/deployments/*.md`.
- **T1.4** Fix any failures/drift; re-run green. Optionally validate via the `pdm-ci` container path.

**Acceptance:** all 4 workflows green locally; artifacts written; `make lint` still green.

## 6. Phase 2 — Track A: Application Stack

**Goal:** give the quality gate and release pipeline real work.

- **T2.1** Scaffold minimal Node service (`package.json` with `lint`/`test`/`build`; e.g. tiny HTTP service + vitest + eslint).
- **T2.2** Commit `package-lock.json` so OSV + `npm ci` paths activate.
- **T2.3** Confirm `quality-gate.code-quality` and `risk-health-check.code-health` run real steps.
- **T2.4** Give `release-pipeline.build` a real deployable (real `dist/` output or Dockerfile).

**Acceptance:** `npm ci && npm run lint && npm run test && npm run build` green; act runs execute the new steps.

## 7. Phase 3 — Track B: GitHub Delivery Integration

**Goal:** behave as a real PR gate + deployment pipeline on GitHub (not just locally).

- **T3.1** Create environments `development`/`staging`/`production` (+ approval rules for staging/prod).
- **T3.2** Open a real PR from a feature branch → verify the 3 guardrail comments post.
- **T3.3** Add `quality-gate` as a required status check on `main` (branch protection).
- **T3.4** Exercise one real deployment API path (`createDeployment`), keeping `dry_run: true` as default.

**Acceptance:** merged PR shows all comments; environments configured; real deployment record exists; no regressions.

## 8. Phase 4 — Track C: Extend the PDM Surface

**Goal:** cover more of the delivery lifecycle. Each item is optional & independently shippable.

- **T4.1** Scheduled/on-demand security re-scan (reuse gitleaks + osv).
- **T4.2** Tag-triggered release job (`push` tags `v*`) with release notes.
- **T4.3** Dependabot/Renovate config for dependency automation.
- **T4.4** Rollback + post-deploy verification steps in `release-pipeline`.
- **T4.5** Wire the AI diff risk-review placeholder hook (noted in `risk-report`).

**Acceptance per item:** canonical workflow added, `make sync`, `make lint` clean, local act run green.

## 9. Phase 5 — Track D: Documentation & Learning Material (starts day 1)

**Goal:** make the repo a teachable artifact, tracked (not gitignored).

- **T5.1** Architecture README: workflow map, job graph, env promotion chain.
- **T5.2** Local runbook: act commands, how to add a workflow, sync discipline.
- **T5.3** Promote `AGENTS.md` content into tracked docs.
- **T5.4** ADR-style decision log (empty-tree base SHA, dry-run default, `osv-scanner-action` subdir path, `--bind` necessity, comment-guard patterns).

**Acceptance:** docs tracked, linked from workflows, up to date with every merged phase.

## 10. Execution Model

Each phase is a **branch off `develop` + PR**, following the existing repo flow. Phases 2–5 run as parallel tracks after Phase 1 merges green. Phase 5 can start immediately and absorb notes from other tracks.

## 11. Definition of Done (every phase)

- `make lint` green (no drift) after every change.
- All affected `act` fixture runs green locally.
- New workflows: canonical + synced copy; PR-comment or artifact path guarded for synthetic events.
- No secrets committed; `.secret`, `dist/`, reports/deployments stay gitignored.
- Docs updated for any workflow change.
