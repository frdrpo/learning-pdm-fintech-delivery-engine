# Learning PDM: Delivery Engine — Roadmap

## 1. Purpose

Turn this reference repo from a **harness + placeholders** into a **real, exercised product-delivery engine** — while staying a teachable artifact. The engine is the GitHub Actions setup under `.github/`; application code exists only to give the gates real work.

## 2. Current State

- **7 canonical workflows** in `.github/pdm/workflows/`, byte-identical copies in `.github/workflows/` (currently in sync). `make lint` enforces no drift.
  - `risk-health-check` — gitleaks + osv-scanner + code-health + AI-assisted diff risk review (`scripts/risk-review.mjs`); posts PR comment or uploads a report artifact on non-PR runs
  - `compliance-guardrail` — trufflehog base→head; posts PR comment
  - `quality-gate` — actionlint + frontend lint/typecheck/test/build; gate job; required status check on `main`; posts comment / uploads report artifact
  - `release-pipeline` — build-info artifact; post-deploy verify; dry-run dev→staging→prod; rollback record; uploads deployment records on dry-run
  - `security-rescan` — scheduled (weekly) + `workflow_dispatch` gitleaks + osv; uploads report artifact; files an issue on blocking findings
  - `release-on-tag` — `v*` tag push; builds, generates release notes, creates a GitHub Release
  - `delivery-telemetry` — weekly + on-demand export of the GitHub-native audit trail and DORA-style telemetry as run artifacts
- **Application stack**: a Next.js 16 frontend (`frontend/`, TypeScript + Tailwind v4 + Vitest, pnpm) that the quality gate, code-health, and release build exercise (Phase 6 replaced the earlier minimal Node service).
- **Frontend tooling**: native `make test-frontend` (install + lint + typecheck + test + build) — no container; CI runs the same suite via `corepack`/`pnpm` in `frontend/`.
- **Testing is GitHub native**: workflows are verified by pushing a branch and opening a PR (`make test-gh`), plus `workflow_dispatch` runs for the release pipeline. No local `act`/Docker harness.
- **GitHub delivery**: environments `development`/`staging`/`production` exist with required-reviewer protection on staging/prod; real `createDeployment` exercised; `quality-gate` is a required status check on `main`.
- **Dependency automation**: Dependabot configured for npm + GitHub Actions (target `develop`); version bumps are mirrored into canonical workflows by hand after merge.
- **Toolchain**: actionlint 1.7.12 (Homebrew), `gh` CLI, Node 22.
- **Branches**: `main`, `develop`, feature branches.
- **Docs**: architecture map, native runbook, agent guide, and ADR log tracked under `docs/`.
- **Known gaps**: none open (Phase 0–7 complete). Phase 7 added delivery telemetry & audit trail atop GitHub's native records.

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
- **T5.4** ADR-style decision log (empty-tree base SHA, dry-run default, `osv-scanner-action` subdir path, GitHub-native testing over `act`, comment-guard patterns). ✅ done — `docs/decisions/` (0001–0007)

**Acceptance:** docs tracked, linked from workflows, up to date with every merged phase. ✅

## 10. Phase 6 — Track D: Application Surface (Next.js frontend)

**Goal:** replace the placeholder Node service with a real, test-first product surface so the gates exercise an actual application.

- **T6.1** Land a Next.js 16 + TypeScript + Tailwind v4 app in `frontend/`, TDD'd with Vitest (components + unit tests). ✅ done — `frontend/` (landed from the earlier `feat/start-frontend` exploration)
- **T6.2** Rewire the gates to the frontend stack: `quality-gate.code-quality` and `risk-health-check.code-health` set up pnpm via `pnpm/action-setup@v4` (pinned to the lockfile) before `actions/setup-node` (pnpm cache), then run install + lint + typecheck + test [+ build] in `frontend/`. ✅ done
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

## 12. Execution Model

Each phase is a **branch off `develop` + PR**, following the existing repo flow. Phases 2–5 run as parallel tracks after Phase 1 merges green. Phase 5 can start immediately and absorb notes from other tracks.

> **Status:** Phases 0–7 complete. Track branches land via PRs to `develop`; workflow verification runs through `make test-gh` PRs to `main` plus `workflow_dispatch` runs (dispatchable from `develop`, the default branch).

## 13. Definition of Done (every phase)

- `make lint` green (no drift) after every change.
- All affected workflows verified green via GitHub-native runs (PR + `workflow_dispatch`).
- New workflows: canonical + synced copy; PR-comment or artifact-upload path guarded for non-PR events.
- No secrets committed; run artifacts stay out of git.
- Docs updated for any workflow change.
